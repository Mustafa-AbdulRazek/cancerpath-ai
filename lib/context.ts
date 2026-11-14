import { EXCLUDED, SERIES_NOTES, countyCorrelation, EQUITY_PAIRS, countyByCode, findingsFor, fmt, nationalSeries, stageMeta, stageScores, weakestStage, indicators, latestYear, nationalValue } from "./analysis";
import { actionsFor, STRATEGY_URL, ROADMAP_URL, THL_2016_URL } from "./actions";

export type Source = { id: string; label: string; url: string };

/** Fixed document facts from the official strategy documents (page numbers refer to the printed PDF pages). */
export const DOC_FACTS: { id: string; text: string; source: Source }[] = [
  { id: "D1", text: "Goal 3 of the National Cancer Strategy 2026–2035 is 'Ensure equal and effective cancer care'. Its indicators: 5-year survival of poor-prognosis cancers reaches the Nordic level; cancer mortality falls 10% (currently 13,300 deaths/year); patients get treatment within target times (THL guidance 21/2016).", source: { id: "D1", label: "National Cancer Strategy 2026–2035, p. 5", url: STRATEGY_URL } },
  { id: "D2", text: "Goal 2 indicators: 80% participation in all cancer screening programmes in every wellbeing services county; at least 70% of cancers diagnosed at stage I–II.", source: { id: "D2", label: "National Cancer Strategy 2026–2035, p. 5", url: STRATEGY_URL } },
  { id: "D3", text: "Clinical cancer registry notifications with stage information cover only about 40% of cancer cases, and data on the time from first symptoms to diagnosis is not collected systematically.", source: { id: "D3", label: "National Cancer Strategy 2026–2035, p. 30", url: STRATEGY_URL } },
  { id: "D4", text: "Finland has no unified national system that steers cancer-specific guidelines, care pathways and their monitoring (including access-to-care targets); this maintains regional inequality.", source: { id: "D4", label: "National Cancer Strategy 2026–2035, p. 33", url: STRATEGY_URL } },
  { id: "D5", text: "A national cancer quality registry does not yet exist; regional comparisons are occasional and based on coarse, fragmented measures.", source: { id: "D5", label: "National Cancer Strategy 2026–2035, p. 35", url: STRATEGY_URL } },
  { id: "D6", text: "Roadmap action 2.5.2: standardised referral criteria modelled on Denmark's Kræftpakkeforløb, Sweden's SVF and Norway's Pakkeforløp; criteria for the 5 most common cancers by 2026–2028. Action 3.1.2: national care-pathway descriptions and cancer-specific access-time targets for five cancers by 2028. Action 3.1.4: national quality indicators.", source: { id: "D6", label: "Implementation roadmap 2026–2031, p. 52–58", url: ROADMAP_URL } },
  { id: "D7", text: "Time from first symptom to diagnosis and treatment varies greatly between regions; if the service chain is poorly coordinated, the total time to treatment can become very long. Some residents live over 400 km from the nearest central hospital and over 700 km from a university hospital.", source: { id: "D7", label: "Implementation roadmap 2026–2031, p. 12–13", url: ROADMAP_URL } },
  { id: "D9", text: "The legal primary-care care guarantee changed: a 14-day limit applied from September 2023, the planned 7-day limit was cancelled, and the government proposed relaxing the limit to three months from 2025 (HE 134/2024). Trends in GP waiting > 7 days therefore partly reflect legal changes, not only access.", source: { id: "D9", label: "Government proposal HE 134/2024 (care guarantee)", url: "https://www.edilex.fi/he/20240134" } },
  { id: "D8", text: "THL guidance 21/2016 defines how to monitor access to cancer care (from referral arrival to first treatment) per cancer type, with recommended maximum waiting times.", source: { id: "D8", label: "THL Ohjaus 21/2016", url: THL_2016_URL } },
];

export function sourceForIndicator(key: string): Source {
  const ind = indicators.find((i) => i.key === key)!;
  return { id: `S${ind.id}${ind.gender === "total" ? "" : ind.gender[0]}`, label: `THL Sotkanet ${ind.id}: ${ind.titleFi}`, url: ind.url };
}

export function countyContext(code: string) {
  const c = countyByCode[code];
  const f = findingsFor(code);
  const stages = stageScores(code);
  const weak = weakestStage(code);
  const acts = actionsFor(code, 5);
  const lines: string[] = [];
  const sources: Source[] = [];
  lines.push(`COUNTY: ${c.name} (${c.nameFi}), wellbeing services county code ${c.code}.`);
  for (const x of f) {
    const s = sourceForIndicator(x.key);
    sources.push(s);
    if (x.value == null) {
      lines.push(`[${s.id}] ${x.ind.label}: NO DATA for this county in ${x.year}${EXCLUDED[x.key]?.[code] ? ` (excluded as unreliable: ${EXCLUDED[x.key][code]})` : ""}.`);
      continue;
    }
    const t = x.trend ? ` Change ${x.trend.from}→${x.trend.to}: ${x.trend.delta > 0 ? "+" : ""}${fmt(x.trend.delta)} (${x.trend.improving ? "improving" : "worsening"}).` : "";
    lines.push(
      `[${s.id}] ${x.ind.label} (${x.year}): ${fmt(x.value)} ${x.ind.unit}; Finland ${fmt(x.national)}; rank ${x.rank}/${x.of} (1 = best); best county ${x.best ? fmt(x.best[1]) : "n/a"}.` +
        (x.ind.target ? ` Strategy target ${x.ind.target}% → ${x.belowTarget ? "BELOW target" : "meets target"}.` : "") +
        ` In worst quartile ${x.persistence.worstQ} of last ${x.persistence.years} years.${t}` +
        (x.ind.noisy ? " (UNRELIABLE: small numbers, do not use as evidence of a gap.)" : "") +
        (x.smallDiff ? " (Within ±2 percentage points of Finland: treat as no meaningful difference.)" : "")
    );
  }
  const male = sourceForIndicator("screen_colorectal_male");
  const female = sourceForIndicator("screen_colorectal_female");
  const ym = latestYear("screen_colorectal_male");
  lines.push(`[${male.id}] Colorectal screening participation, men (${ym}): Finland ${fmt(nationalValue("screen_colorectal_male", ym))}%. [${female.id}] women: Finland ${fmt(nationalValue("screen_colorectal_female", ym))}%.`);
  sources.push(male, female);
  lines.push(
    `[P1] PATHWAY STAGE SCORES (CancerPath AI calculation from the S-indicators above; mean direction-adjusted z-score vs other counties; negative = behind): ` +
      stages.map((s) => `${stageMeta(s.stage).label}: ${s.score == null ? "no public data" : s.score.toFixed(2)}`).join("; ") +
      (weak ? `. Weakest measured stage: ${stageMeta(weak.stage).label}.` : "")
  );
  sources.push({ id: "P1", label: "CancerPath AI pathway stage scores (method: /sources)", url: "https://cancerpath-ai.vercel.app/sources" });
  lines.push(`RECOMMENDED ACTIONS (from the CancerPath AI evidence library):`);
  for (const a of acts) {
    lines.push(`[${a.id}] ${a.title}. Owner: ${a.owner}. KPI: ${a.kpi}.${a.impact ? ` Impact estimate: about ${a.impact.perRound} more people screened per round (about ${a.impact.perYear} per year) if participation rises from ${a.impact.current}% to 80% (eligible: ${a.impact.bandLabel}).` : ""}${a.resources ? ` Resources (team estimate): ${a.resources}.` : ""} Roadmap actions: ${a.roadmap.join(", ")}. Evidence: ${a.evidence.map((e) => e.label).join("; ")}.`);
    sources.push({ id: a.id, label: `CancerPath action ${a.id}: ${a.title}`, url: a.evidence[0]?.url || ROADMAP_URL });
  }
  return { county: c, text: lines.join("\n"), sources, weak, actions: acts };
}

export function nationalContext() {
  const lines: string[] = [];
  const sources: Source[] = [];
  EQUITY_PAIRS.forEach((e, i) => {
    const r = countyCorrelation(e.a, e.b);
    lines.push(`[E${i + 1}] Equity (ecological, county-level, not causal): ${e.text}: correlation r = ${r.r.toFixed(2)} across ${r.n} areas.`);
    sources.push({ id: `E${i + 1}`, label: `CancerPath AI county-level correlation: ${e.text}`, url: "https://cancerpath-ai.vercel.app/" });
  });
  lines.push(`[S3336] Note on specialist waiting: ${SERIES_NOTES.spec_wait6m} HUS-area data is missing or incomplete; Helsinki is excluded.`);
  for (const ind of indicators.filter((i) => i.stage !== "context" || i.key.startsWith("screen_colorectal_"))) {
    const s = nationalSeries(ind.key);
    if (!s.length) continue;
    const src = sourceForIndicator(ind.key);
    sources.push(src);
    lines.push(`[${src.id}] Finland, ${ind.label}: ${s.map((p) => `${p.year}: ${fmt(p.value)}`).join(", ")} (${ind.unit}).`);
  }
  return { text: lines.join("\n"), sources };
}

export function docContext() {
  return { text: DOC_FACTS.map((d) => `[${d.id}] ${d.text}`).join("\n"), sources: DOC_FACTS.map((d) => d.source) };
}
