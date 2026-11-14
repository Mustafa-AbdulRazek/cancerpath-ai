import { NextResponse } from "next/server";
import { countyContext, docContext, nationalContext, Source } from "@/lib/context";
import { countySummary, keyMessageFi } from "@/lib/brief";
import { countyByCode, fmt, fmtU, stageMeta } from "@/lib/analysis";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { mode?: "brief" | "qa"; county?: string; question?: string; lang?: "en" | "fi"; history?: { role: "user" | "model"; text: string }[] };

const SYSTEM = `You are CancerPath AI, an analyst helping Finnish wellbeing services counties (hyvinvointialueet) close gaps in the cancer care pathway (detection → referral → diagnosis/treatment → outcome), in line with Goal 3 of Finland's National Cancer Strategy 2026–2035.

STRICT RULES:
1. Use ONLY the facts in the CONTEXT. Never invent numbers, studies, targets or causes.
2. After every factual sentence, cite its source ID(s) in square brackets, e.g. [S3620] or [D3] or [A5].
3. Copy numbers exactly as they appear in the CONTEXT. Do not compute new percentages or ratios.
4. If the CONTEXT has no data for something, say so plainly and name it as a data gap (e.g. time from referral to treatment is not available in national open data by county).
5. Indicator S3336 (specialist waits > 6 months) covers ALL specialties: describe it as a capacity/congestion proxy, never as a cancer-specific delay. Indicator S6411 (GP waits > 7 days) is affected by changes to the legal care guarantee [D9]: mention this when discussing its trend.
6. Never present an indicator marked UNRELIABLE or "no meaningful difference" as a gap; you may mention it only as being on par or uncertain.
7. Correlation is not causation. Phrase possible causes as hypotheses to verify ("may indicate", "should be checked").
8. Write for a non-technical health decision-maker: short sentences, no jargon, no markdown tables.`;

const BRIEF_TASK = (lang: string, keyMessage?: string) => lang === "fi" ? `Kirjoita tälle hyvinvointialueelle 2 minuutin päätöksentekotiivistelmä suomeksi. Käytä täsmälleen näitä otsikoita:
**Keskeinen viesti** (1–2 virkettä: missä hoitopolun vaiheessa ero syntyy)
**Mitä data näyttää** (3–4 luettelokohtaa, tärkeimmät erot koko maahan numeroin ja lähdeviittein)
**Toimet seuraavan 90 päivän aikana** (3 tärkeintä toimenpidettä RECOMMENDED ACTIONS -listasta, vastuutaho ja mittari, viite [A#])
**Mitä emme vielä näe** (1–2 kohtaa tietopuutteista, viite [D#])
Enintään 230 sanaa.${keyMessage ? `\n\nKeskeisen viestin TÄYTYY sanoa sama kuin tämä tarkistettu yhteenveto (käännä suomeksi, säilytä luvut, älä lisää mitään): "${keyMessage}"` : ""}` : `Write a 2-minute decision brief for this county. Use exactly these headings:
**Key message** (1–2 sentences: where in the pathway the gap emerges)
**What the data shows** (3–4 bullet points, the most important gaps vs Finland with numbers and citations)
**What to do in the next 90 days** (the top 3 actions from the RECOMMENDED ACTIONS, each with its owner and KPI, cite [A#])
**What we cannot see yet** (1–2 bullets on data gaps, cite [D#])
Max 230 words.${keyMessage ? `\n\nThe Key message MUST say the same as this verified summary (translate if writing in Finnish, keep its numbers, add nothing): "${keyMessage}". Never call a step or indicator good if any indicator in it is below target or ranked in the bottom quarter.` : ""}`;

function numbersIn(s: string): string[] {
  // numbers like 54.7, 1,000, 13 300, 80 — ignore citation IDs, years in ranges are still checked
  const cleaned = s.replace(/\[[^\]]*\]/g, " ").replace(/\b(19|20)\d{2}\b/g, " ");
  const m = cleaned.match(/\d+(?:[.,]\d+)?/g) || [];
  return m;
}
function norm(n: string) {
  return parseFloat(n.replace(",", "."));
}

async function callGemini(system: string, contents: { role: string; parts: { text: string }[] }[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { text: null as string | null, model: null as string | null, error: "GEMINI_API_KEY not set" };
  // Fallback chain: if a model is overloaded (503/429) or slow, try the next one so the live demo never stalls.
  const models = [process.env.GEMINI_MODEL, "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-lite-latest"].filter(Boolean) as string[];
  let lastErr = "";
  for (const model of models) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }, // thinking models spend part of this budget on reasoning
        }),
        signal: AbortSignal.timeout(model === models[models.length - 1] ? 20000 : 18000),
      });
      if (!r.ok) {
        lastErr = `${model}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`;
        continue;
      }
      const j = await r.json();
      const cand = j.candidates?.[0];
      const text = (cand?.content?.parts || []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || "").join("").trim();
      if (cand?.finishReason === "MAX_TOKENS") {
        lastErr = `${model}: truncated (MAX_TOKENS)`;
        continue;
      }
      if (text) return { text, model, error: null };
      lastErr = `${model}: empty response`;
    } catch (e) {
      lastErr = `${model}: ${(e as Error).message}`;
    }
  }
  return { text: null, model: null, error: lastErr };
}

/** Deterministic brief used when no API key is configured or the model fails — the demo never breaks. */
function fallbackBrief(code: string) {
  const ctx = countyContext(code);
  const c = ctx.county;
  const gaps = ctx.actions.flatMap((a) => a.matchedOn);
  const seen = new Set<string>();
  const bullets = gaps
    .filter((g) => (seen.has(g.key) ? false : (seen.add(g.key), true)))
    .slice(0, 4)
    .map((g) => `- ${g.ind.short}: ${fmtU(g.value, g.ind.unit)} vs Finland ${fmt(g.national)} (rank ${g.rank}/${g.of}, ${g.year}) [S${g.ind.id}]`);
  return [
    `**Key message**`,
    ctx.weak ? `In ${c.name}, the measured pathway falls furthest behind at the **${stageMeta(ctx.weak.stage).label}** stage compared with other counties.` : `${c.name} has no stage clearly behind other counties on the available indicators.`,
    ``,
    `**What the data shows**`,
    ...(bullets.length ? bullets : ["- No indicator is clearly below other counties."]),
    ``,
    `**What to do in the next 90 days**`,
    ...ctx.actions.slice(0, 3).map((a) => `- ${a.title}. Owner: ${a.owner}. KPI: ${a.kpi} [${a.id}]`),
    ``,
    `**What we cannot see yet**`,
    `- Referral-to-treatment times are not published by county and cancer type; nationally only the count over the 180-day limit is reported [D10].`,
    `- Stage at diagnosis is recorded for 42% of new cancers nationally (Pirkanmaa 72%) [D3].`,
  ].join("\n");
}

// Brief cache (per warm serverless instance): same county + language within 6 h returns instantly.
const briefCache = new Map<string, { at: number; payload: unknown }>();
const CACHE_MS = 6 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const mode = body.mode || "qa";
  const lang = body.lang || "en";
  const code = body.county && countyByCode[body.county] ? body.county : undefined;

  const parts: string[] = [];
  const sources: Source[] = [];
  const doc = docContext();
  parts.push("STRATEGY DOCUMENT FACTS:\n" + doc.text);
  sources.push(...doc.sources);
  if (code) {
    const cc = countyContext(code);
    parts.push("COUNTY DATA:\n" + cc.text);
    sources.push(...cc.sources);
  }
  const nat = nationalContext();
  parts.push("NATIONAL TRENDS:\n" + nat.text);
  sources.push(...nat.sources);
  const context = parts.join("\n\n");

  const cacheKey = mode === "brief" && code ? `${code}:${lang}` : "";
  const hit = cacheKey ? briefCache.get(cacheKey) : undefined;
  if (hit && Date.now() - hit.at < CACHE_MS) return NextResponse.json({ ...(hit.payload as object), cached: true });

  const task = mode === "brief" ? BRIEF_TASK(lang, code ? countySummary(code).message : undefined) : `Question: ${body.question || ""}\nAnswer in ${lang === "fi" ? "Finnish" : "English"} in at most 180 words, with citations.`;
  const contents = [
    ...(body.history || []).slice(-6).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: `CONTEXT:\n${context}\n\nTASK:\n${task}` }] },
  ];

  const ai = await callGemini(SYSTEM, contents);
  let text: string = ai.text ?? "";
  let engine = ai.model ? `Gemini (${ai.model})` : "rule-based fallback";
  if (!text) {
    if (mode === "brief" && code) text = fallbackBrief(code);
    else text = "The AI analyst is offline (no Gemini API key configured). Open a county page to see the rule-based brief and action plan.";
    engine = "rule-based fallback";
  }
  // The key message is always the verified deterministic summary, so the AI cannot contradict the page.
  if (mode === "brief" && code && engine !== "rule-based fallback") {
    const msg = lang === "fi" ? keyMessageFi(code) : countySummary(code).message;
    const re = /(\*\*(?:Key message|Keskeinen viesti)\*\*[^\S\n]*\n)([\s\S]*?)(\n\s*\*\*)/;
    const heading = lang === "fi" ? "Keskeinen viesti" : "Key message";
    text = re.test(text) ? text.replace(re, (_m, h: string, _b: string, n: string) => h + msg + "\n" + n) : `**${heading}**\n${msg}\n\n` + text;
  }
  const cited = [...new Set((text.match(/\[([A-Z]\d+[a-z]?)\]/g) || []).map((s) => s.slice(1, -1)))];
  // support multi-citations like [S3620, D3]
  for (const m of text.match(/\[([^\]]+)\]/g) || []) for (const id of m.slice(1, -1).split(/[,;\s]+/)) if (/^[SDAPET]\d+[mf]?$/.test(id)) cited.push(id);
  const uniq = [...new Set(cited)];
  const byId = new Map(sources.map((s) => [s.id, s]));
  const check = tiedNumberCheck(text, context);
  const payload = {
    text,
    engine,
    error: ai.error,
    citations: uniq.map((id) => byId.get(id) || { id, label: "Unknown source ID (flagged)", url: "" }),
    numberCheck: check,
    unverifiedNumbers: check.untied,
  };
  if (cacheKey && engine !== "rule-based fallback") briefCache.set(cacheKey, { at: Date.now(), payload });
  return NextResponse.json(payload);
}

/**
 * Citation-tied number check: every number in a cited sentence must appear in the context lines of the source IDs that
 * sentence cites. Numbers in sentences without a citation are checked against the whole context and reported as "uncited".
 */
function tiedNumberCheck(answer: string, context: string) {
  const ID = /\[([A-Z]\d+[a-z]?(?:[,;\s]+[A-Z]\d+[a-z]?)*)\]/g;
  const NUM = /\d+(?:[.,]\d+)?/g;
  const numsOf = (text: string) => (text.replace(ID, " ").match(NUM) || []).map(norm);
  const idNums = new Map<string, number[]>();
  for (const line of context.split("\n")) {
    const ids = [...line.matchAll(ID)].flatMap((m) => m[1].split(/[,;\s]+/));
    const nums = numsOf(line);
    for (const id of ids) idNums.set(id, [...(idNums.get(id) || []), ...nums]);
  }
  const all = numsOf(context);
  const near = (v: number, set: number[]) => set.some((c) => Math.abs(c - v) < 0.051);
  let tied = 0;
  let total = 0;
  const untied: string[] = [];
  // split the answer into segments that end with a citation group (or a line break)
  const segments = answer.replace(/\r/g, "").split(/(?<=\])\s*(?=[^\[\s,.;])|\n/);
  for (const seg of segments) {
    const ids = [...seg.matchAll(ID)].flatMap((m) => m[1].split(/[,;\s]+/));
    const nums = (seg.replace(ID, " ").match(NUM) || []).filter((n) => !(Number.isInteger(norm(n)) && norm(n) <= 3));
    if (!nums.length) continue;
    const pool = ids.length ? ids.flatMap((id) => idNums.get(id) || []) : all;
    for (const n of nums) {
      total++;
      if (near(norm(n), pool)) tied++;
      else untied.push(n + (ids.length ? "" : " (uncited)"));
    }
  }
  return { tied, total, untied: [...new Set(untied)] };
}
