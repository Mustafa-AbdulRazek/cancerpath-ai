import { NextResponse } from "next/server";
import { countyContext, docContext, nationalContext, Source } from "@/lib/context";
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

const BRIEF_TASK = (lang: string) => lang === "fi" ? `Kirjoita tälle hyvinvointialueelle 2 minuutin päätöksentekotiivistelmä suomeksi. Käytä täsmälleen näitä otsikoita:
**Keskeinen viesti** (1–2 virkettä: missä hoitopolun vaiheessa ero syntyy)
**Mitä data näyttää** (3–4 luettelokohtaa, tärkeimmät erot koko maahan numeroin ja lähdeviittein)
**Toimet seuraavan 90 päivän aikana** (3 tärkeintä toimenpidettä RECOMMENDED ACTIONS -listasta, vastuutaho ja mittari, viite [A#])
**Mitä emme vielä näe** (1–2 kohtaa tietopuutteista, viite [D#])
Enintään 230 sanaa.` : `Write a 2-minute decision brief for this county. Use exactly these headings:
**Key message** (1–2 sentences: where in the pathway the gap emerges)
**What the data shows** (3–4 bullet points, the most important gaps vs Finland with numbers and citations)
**What to do in the next 90 days** (the top 3 actions from the RECOMMENDED ACTIONS, each with its owner and KPI, cite [A#])
**What we cannot see yet** (1–2 bullets on data gaps, cite [D#])
Max 230 words.`;

function numbersIn(s: string): string[] {
  // numbers like 54.7, 1,000, 13 300, 80 — ignore citation IDs, years in ranges are still checked
  const cleaned = s.replace(/\[[^\]]*\]/g, " ").replace(/\b(19|20)\d{2}\b/g, " ");
  const m = cleaned.match(/\d+(?:[.,]\d+)?/g) || [];
  return m;
}
function norm(n: string) {
  return parseFloat(n.replace(",", "."));
}

/** Hallucination guard: every number in the answer must appear in the grounded context. */
function verifyNumbers(answer: string, context: string) {
  const ctx = new Set(numbersIn(context).map(norm));
  const ctxVals = [...ctx];
  const unverified: string[] = [];
  for (const n of numbersIn(answer)) {
    const v = norm(n);
    if (Number.isNaN(v) || v <= 10) continue; // small counts ("3 actions", "90 days" checked below)
    if (ctx.has(v)) continue;
    if (ctxVals.some((c) => Math.abs(c - v) < 0.051)) continue;
    if ([14, 30, 48, 80, 90].includes(v)) continue; // fixed KPI targets in the action library
    unverified.push(n);
  }
  return [...new Set(unverified)];
}

async function callGemini(system: string, contents: { role: string; parts: { text: string }[] }[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { text: null as string | null, model: null as string | null, error: "GEMINI_API_KEY not set" };
  // Fallback chain: if a model is overloaded (503/429) or slow, try the next one so the live demo never stalls.
  const models = [process.env.GEMINI_MODEL, "gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-lite-latest"].filter(Boolean) as string[];
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
    `- Time from referral to treatment is not available in national open data by county, so the strategy's "treatment within target times" indicator cannot be monitored yet [D1][D8].`,
    `- Stage at diagnosis is recorded for only about 40% of cases [D3].`,
  ].join("\n");
}

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

  const task = mode === "brief" ? BRIEF_TASK(lang) : `Question: ${body.question || ""}\nAnswer in ${lang === "fi" ? "Finnish" : "English"} in at most 180 words, with citations.`;
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
  const cited = [...new Set((text.match(/\[([A-Z]\d+[a-z]?)\]/g) || []).map((s) => s.slice(1, -1)))];
  // support multi-citations like [S3620, D3]
  for (const m of text.match(/\[([^\]]+)\]/g) || []) for (const id of m.slice(1, -1).split(/[,;\s]+/)) if (/^[SDAPE]\d+[mf]?$/.test(id)) cited.push(id);
  const uniq = [...new Set(cited)];
  const byId = new Map(sources.map((s) => [s.id, s]));
  return NextResponse.json({
    text,
    engine,
    error: ai.error,
    citations: uniq.map((id) => byId.get(id) || { id, label: "Unknown source ID (flagged)", url: "" }),
    unverifiedNumbers: verifyNumbers(text, context),
  });
}
