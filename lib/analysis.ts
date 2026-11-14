import raw from "./data/dataset.json";

export type Stage = "detection" | "referral" | "treatment" | "outcome";
export type IndicatorMeta = {
  id: number;
  key: string;
  stage: Stage | "context";
  label: string;
  short: string;
  unit: string;
  better: "higher" | "lower" | "none";
  target?: number;
  targetSource?: string;
  gender: string;
  noisy?: boolean;
  titleFi: string;
  titleEn: string | null;
  descriptionFi: string;
  organization: string;
  dataUpdated: string | null;
  url: string;
  api: string;
};
export type County = { sotkanetId: number; code: string; nameFi: string; name: string; short: string; nameSv?: string };

type Dataset = {
  generatedAt: string;
  sources: Record<string, { name: string; url: string; license: string }>;
  counties: County[];
  indicators: IndicatorMeta[];
  values: Record<string, Record<string, Record<string, number>>>;
  national: Record<string, Record<string, number>>;
  geo: GeoJSON.FeatureCollection;
  eligible: Record<string, { breast: number; cervical: number; colorectal: number }>;
  demand?: { from: string; to: string; source: string; national: { deathsGrowth: number; pop70Growth: number; expFrom: number; expTo: number }; byCounty: Record<string, { deathsGrowth: number; pop70Growth: number; expFrom: number; expTo: number }> };
  mortality?: { years: string; cause: string; byCounty: Record<string, { observed: number; expected: number; smr: number; lo: number; hi: number }> };
  eligibleMeta: { year: string; source: string; url: string; bands: Record<"breast" | "cervical" | "colorectal", { label: string; intervalYears: number }> };
};

export const data = raw as unknown as Dataset;

/**
 * Data-quality exclusions. Helsinki reports ~0 people waiting > 6 months every year (0.1, 0, 0.1 …) with gaps,
 * and the other HUS-area counties report nothing. That pattern points to incomplete HUS reporting, not near-zero waits,
 * so the series is excluded from scoring and ranking and shown as "incomplete reporting".
 */
export const EXCLUDED: Record<string, Record<string, string>> = {
  spec_wait6m: { "90": "Helsinki reports ~0 every year with gaps (2022–2024 missing), and other HUS-area counties report nothing: likely incomplete HUS reporting, so excluded." },
};
for (const [key, codes] of Object.entries(EXCLUDED)) for (const code of Object.keys(codes)) delete data.values[key]?.[code];

/**
 * GP waiting (6411) swings strongly year to year (e.g. North Karelia 21% → 59%, 2024→2025) because of IT/recording changes
 * after the 2023 county reform and the relaxed care guarantee. Score it on a rolling 3-year mean instead of one year.
 */
function rolling3(s: Record<string, number> | undefined) {
  if (!s) return s;
  const out: Record<string, number> = {};
  for (const y of Object.keys(s).map(Number)) {
    const w = [y - 2, y - 1, y].map((k) => s[k]).filter((v): v is number => v != null);
    if (w.length >= 2) out[y] = Math.round((w.reduce((a, b) => a + b, 0) / w.length) * 10) / 10;
  }
  return out;
}
if (data.values.phc_wait7) {
  for (const code of Object.keys(data.values.phc_wait7)) data.values.phc_wait7[code] = rolling3(data.values.phc_wait7[code])!;
  data.national.phc_wait7 = rolling3(data.national.phc_wait7)!;
  const ind = data.indicators.find((i) => i.key === "phc_wait7");
  if (ind) { ind.short = "GP wait > 7 days (3-yr avg)"; ind.label = "Non-urgent GP visits waiting > 7 days, rolling 3-year average"; }
}

/** Known breaks in series that limit trend interpretation. */
export const SERIES_NOTES: Record<string, string> = {
  phc_wait7: "County values swing strongly year to year (e.g. North Karelia 21% → 59%, 2024→2025). THL linked the 2023 slowdown to IT and administrative changes after the county reform, monitoring coverage grew from 15 to 21 of 22 counties in 2021–2023, and the legal care guarantee was relaxed. We therefore use a rolling 3-year average.",
  spec_wait6m: "Large jumps around 2022 (e.g. North Karelia 8.1 → 43.2), when wellbeing services counties took over, may partly reflect changes in recording. Compare levels across counties; read trends with care.",
};
/**
 * Cancer mortality as a scored outcome indicator: indirectly age-standardised mortality ratio (SMR) × 100, Finland = 100,
 * latest 5 years pooled (Statistics Finland 13u5 + 11az + 11re). Stored under the last year of the window so it ranks like the other indicators.
 */
export const SMR_URL = "https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__ksyyt/statfin_ksyyt_pxt_13u5.px/";
if (data.mortality && !data.values.smr) {
  data.values.smr = {};
  const smrYear = Number(data.mortality.years.slice(-4));
  for (const [code, m] of Object.entries(data.mortality.byCounty)) data.values.smr[code] = { [smrYear]: Math.round(m.smr * 1000) / 10 };
  data.national.smr = { [smrYear]: 100 };
  data.indicators.push({
    id: 13, key: "smr", stage: "outcome", label: "Cancer mortality, age-standardised ratio (SMR × 100, Finland = 100), " + data.mortality.years, short: "Cancer mortality (SMR)",
    unit: "index", better: "lower", gender: "total",
    titleFi: "Kuolleet syöpään (C00–C97), epäsuorasti ikävakioitu kuolleisuussuhde " + data.mortality.years, titleEn: null,
    descriptionFi: "Observed cancer deaths divided by the deaths expected with Finland's age-specific death rates. 95% CI = SMR × exp(±1.96/√observed). Mortality mixes incidence and care: it counts as an outcome gap only where survival is also behind.",
    organization: "Statistics Finland (CancerPath AI calculation)", dataUpdated: null, url: SMR_URL, api: SMR_URL,
  } as never);
}

export const counties = [...data.counties].sort((a, b) => a.short.localeCompare(b.short, "fi"));
export const indicators = data.indicators;
export const scoredIndicators = indicators.filter((i) => i.stage !== "context");
export const indicatorByKey = Object.fromEntries(indicators.map((i) => [i.key, i])) as Record<string, IndicatorMeta>;
export const countyByCode = Object.fromEntries(data.counties.map((c) => [c.code, c])) as Record<string, County>;

export const STAGES: { key: Stage; label: string; question: string; color: string }[] = [
  { key: "detection", label: "Detection", question: "Are cancers found early? (screening + access to a GP)", color: "#475569" },
  { key: "referral", label: "Referral", question: "Is specialist care congested? (all-specialty capacity proxy)", color: "#4338ca" },
  { key: "treatment", label: "Diagnosis → Treatment", question: "Does treatment start within target times?", color: "#7e22ce" },
  { key: "outcome", label: "Outcome", question: "Do patients survive as well as elsewhere in Finland?", color: "#92400e" },
];

export function latestYear(key: string): number {
  const years = new Set<number>();
  for (const series of Object.values(data.values[key] || {})) for (const y of Object.keys(series)) years.add(+y);
  return Math.max(...years);
}

export function series(key: string, code: string): { year: number; value: number }[] {
  const s = data.values[key]?.[code] || {};
  return Object.entries(s)
    .map(([y, v]) => ({ year: +y, value: v }))
    .sort((a, b) => a.year - b.year);
}
export function nationalSeries(key: string) {
  return Object.entries(data.national[key] || {})
    .map(([y, v]) => ({ year: +y, value: v }))
    .sort((a, b) => a.year - b.year);
}
export function value(key: string, code: string, year?: number): number | undefined {
  const y = year ?? latestYear(key);
  return data.values[key]?.[code]?.[y];
}
export function nationalValue(key: string, year?: number) {
  const y = year ?? latestYear(key);
  return data.national[key]?.[y];
}

function mean(a: number[]) {
  return a.reduce((s, x) => s + x, 0) / a.length;
}
function sd(a: number[]) {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1));
}

/** Direction-adjusted z-score: negative = worse than the county average. */
export function zScore(key: string, code: string, year?: number): number | undefined {
  const ind = indicatorByKey[key];
  const y = year ?? latestYear(key);
  const vals = Object.values(data.values[key] || {})
    .map((s) => s[y])
    .filter((v): v is number => v != null);
  const v = data.values[key]?.[code]?.[y];
  if (v == null || vals.length < 5) return undefined;
  const s = sd(vals) || 1;
  const z = (v - mean(vals)) / s;
  return ind.better === "lower" ? -z : z;
}

/** Rank 1 = best among counties with data. */
export function rank(key: string, code: string, year?: number) {
  const ind = indicatorByKey[key];
  const y = year ?? latestYear(key);
  const entries = Object.entries(data.values[key] || {})
    .map(([c, s]) => [c, s[y]] as const)
    .filter(([, v]) => v != null) as [string, number][];
  entries.sort((a, b) => (ind.better === "lower" ? a[1] - b[1] : b[1] - a[1]));
  const idx = entries.findIndex(([c]) => c === code);
  return { rank: idx >= 0 ? idx + 1 : undefined, of: entries.length, best: entries[0], worst: entries[entries.length - 1] };
}

/** How many of the last N years the county was in the worst quartile → robustness of the signal. */
export function persistence(key: string, code: string, n = 5) {
  const ly = latestYear(key);
  let worstQ = 0;
  let years = 0;
  for (let y = ly - n + 1; y <= ly; y++) {
    const r = rank(key, code, y);
    if (!r.rank) continue;
    years++;
    if (r.rank > r.of * 0.75) worstQ++;
  }
  return { worstQ, years };
}

/** Change over the last 3 available years, in the indicator's units (positive = improving). */
export function trend(key: string, code: string) {
  const s = series(key, code);
  if (s.length < 3) return undefined;
  const last = s[s.length - 1];
  const prev = s[Math.max(0, s.length - 4)];
  const delta = last.value - prev.value;
  const ind = indicatorByKey[key];
  return { from: prev.year, to: last.year, delta, improving: ind.better === "lower" ? delta < 0 : delta > 0 };
}

export type IndicatorFinding = {
  key: string;
  ind: IndicatorMeta;
  year: number;
  value?: number;
  national?: number;
  z?: number;
  rank?: number;
  of: number;
  best?: [string, number];
  persistence: { worstQ: number; years: number };
  trend?: ReturnType<typeof trend>;
  belowTarget: boolean;
  smallDiff: boolean;
  signal: "strong" | "moderate" | "none";
  earlyWarning: boolean;
  /** Cancer mortality above expected while survival is on par: likely more cancer, not worse care (see SMR_CAVEAT). */
  burdenOnly?: boolean;
};

/**
 * Mortality = incidence × case fatality, so a high SMR can mean "more people get cancer" (smoking, occupational history),
 * not worse care. We only let it count as an outcome gap when cancer-specific survival in the same county is also behind.
 * Otherwise it is shown as a burden signal and scored as on par.
 */
export const SMR_CAVEAT = "Mortality reflects both how many people get cancer and how well they are treated, so on its own it is not a care-quality measure. We count it as an outcome gap only where cancer survival in the same county is also behind.";

export function findingsFor(code: string): IndicatorFinding[] {
  const out = findingsRaw(code);
  const smr = out.find((f) => f.key === "smr");
  const survivalBehind = out.some((f) => f.ind.stage === "outcome" && f.key !== "smr" && f.z != null && f.z <= -0.5 && !f.smallDiff && !f.ind.noisy);
  if (smr && smr.z != null && smr.z < 0 && !smr.smallDiff && !survivalBehind) {
    smr.burdenOnly = true;
    smr.signal = "none";
  }
  return out;
}

function findingsRaw(code: string): IndicatorFinding[] {
  return scoredIndicators.map((ind) => {
    const year = latestYear(ind.key);
    const v = value(ind.key, code, year);
    const z = zScore(ind.key, code, year);
    const r = rank(ind.key, code, year);
    const p = persistence(ind.key, code);
    const t = trend(ind.key, code);
    const belowTarget = ind.target != null && v != null && v < ind.target;
    // A "strong" signal must be both clearly below the county average and persistent over time.
    let signal: IndicatorFinding["signal"] = "none";
    const nat = nationalValue(ind.key, year);
    // Survival: differences within ±2 pp of Finland are likely within statistical noise for most counties.
    // ±2 pp band; ±3 pp for counties under 100,000 people (few cases per year → wider uncertainty, no CIs published).
    const pop = data.values.population?.[code]?.[latestYear("population")] ?? 1e9;
    const m = ind.key === "smr" ? data.mortality?.byCounty[code] : undefined;
    const smallDiff = ind.key === "smr" ? !!m && m.lo <= 1 && m.hi >= 1 : ind.stage === "outcome" && v != null && nat != null && Math.abs(v - nat) <= (pop < 100000 ? 3 : 2);
    if (z != null && z <= -1 && (p.worstQ >= 3 || p.years < 3) && !ind.noisy && !smallDiff) signal = "strong";
    else if (z != null && z <= -0.5) signal = "moderate";
    const earlyWarning = !!t && !t.improving && Math.abs(t.delta) >= (ind.unit.startsWith("%") ? 5 : ind.key === "spec_wait6m" ? 15 : 9999);
    return { key: ind.key, ind, year, value: v, national: nat, smallDiff, z, rank: r.rank, of: r.of, best: r.best, persistence: p, trend: t, belowTarget, signal, earlyWarning };
  });
}

export type StageScore = { stage: Stage; score?: number; findings: IndicatorFinding[]; hasData: boolean };

export function stageScores(code: string): StageScore[] {
  const f = findingsFor(code);
  return STAGES.map(({ key }) => {
    const fs = f.filter((x) => x.ind.stage === key);
    // Differences inside the survival noise band count as "on par" (z = 0), so they cannot make a stage look behind.
    // Mortality without a survival gap is a burden signal, not a care gap: also scored as on par.
    const zs = fs.filter((x) => x.z != null && !x.ind.noisy).map((x) => (x.smallDiff || x.burdenOnly ? 0 : x.z!));
    return { stage: key, findings: fs, hasData: zs.length > 0, score: zs.length ? mean(zs) : undefined };
  });
}

/** The pathway stage where the county falls furthest behind (lowest mean z). */
export function weakestStage(code: string): { stage: Stage; score: number } | undefined {
  const s = stageScores(code).filter((x) => x.score != null) as Required<StageScore>[];
  if (!s.length) return undefined;
  s.sort((a, b) => a.score - b.score);
  return { stage: s[0].stage, score: s[0].score };
}

export function overallScore(code: string) {
  const s = stageScores(code).filter((x) => x.score != null).map((x) => x.score!);
  return s.length ? mean(s) : 0;
}

/** Value + unit, with "%" attached directly ("64%") and other units spaced ("99 per 10,000"). */
export function fmtU(v: number | undefined, unit: string) {
  if (v == null) return "n/a";
  return unit === "%" ? fmt(v) + "%" : unit.startsWith("%") ? fmt(v) + unit : fmt(v) + " " + unit;
}

export function fmt(v: number | undefined, unit?: string, digits?: number) {
  if (v == null || Number.isNaN(v)) return "n/a";
  const d = digits ?? (Math.abs(v) >= 1000 ? 0 : Number.isInteger(v) ? 0 : 1);
  const s = v.toLocaleString("en-GB", { maximumFractionDigits: d, minimumFractionDigits: 0 });
  if (!unit) return s;
  if (unit === "%") return s + "%";
  return s;
}

export function stageMeta(stage: Stage) {
  return STAGES.find((s) => s.key === stage)!;
}

/** Pearson correlation across counties (latest year of each indicator). Ecological: county-level, not individual-level. */
export function countyCorrelation(a: string, b: string) {
  const ya = latestYear(a), yb = latestYear(b);
  const pts = data.counties
    .map((c) => ({ code: c.code, name: c.short, x: data.values[b]?.[c.code]?.[yb], y: data.values[a]?.[c.code]?.[ya] }))
    .filter((p): p is { code: string; name: string; x: number; y: number } => p.x != null && p.y != null);
  const mx = mean(pts.map((p) => p.x)), my = mean(pts.map((p) => p.y));
  let n = 0, dx = 0, dy = 0;
  for (const p of pts) { n += (p.x - mx) * (p.y - my); dx += (p.x - mx) ** 2; dy += (p.y - my) ** 2; }
  return { r: n / Math.sqrt(dx * dy), n: pts.length, pts, yearA: ya, yearB: yb };
}

export const EQUITY_PAIRS: { a: string; b: string; text: string }[] = [
  { a: "screen_breast", b: "foreign_pct", text: "Breast screening participation is lower where the share of foreign citizens is higher" },
  { a: "screen_colorectal", b: "foreign_pct", text: "Colorectal screening participation is lower where the share of foreign citizens is higher" },
  { a: "surv_colon", b: "low_income", text: "Colon cancer survival is lower where the low-income rate is higher" },
];

export const SCREEN_BAND: Record<string, "breast" | "cervical" | "colorectal"> = { screen_breast: "breast", screen_cervical: "cervical", screen_colorectal: "colorectal" };

/** People not screened today who would be screened if participation reached the target (approximation: eligible-age population ≈ invitees per round). */
export function screeningImpact(key: string, code: string, target = 80) {
  const band = SCREEN_BAND[key];
  const v = value(key, code);
  const pop = data.eligible?.[code]?.[band];
  if (!band || v == null || !pop || v >= target) return undefined;
  const meta = data.eligibleMeta.bands[band];
  const raw = (pop * (target - v)) / 100;
  const perRound = approx(raw);
  return { perRound, perYear: approx(raw / meta.intervalYears), pop, band, bandLabel: meta.label, intervalYears: meta.intervalYears, current: v, target, popYear: data.eligibleMeta.year };
}

/** Rank of the county's stage score among counties with data (1 = best). */
export function stageRank(code: string, stage: Stage) {
  const all = data.counties
    .map((c) => ({ code: c.code, s: stageScores(c.code).find((x) => x.stage === stage)?.score }))
    .filter((x): x is { code: string; s: number } => x.s != null)
    .sort((a, b) => b.s - a.s);
  const i = all.findIndex((x) => x.code === code);
  return { rank: i >= 0 ? i + 1 : undefined, of: all.length };
}

export const UUSIMAA_HUS = ["01", "02", "03", "04", "90"];

/** Correlation excluding a set of counties (robustness check). */
export function countyCorrelationExcluding(a: string, b: string, exclude: string[]) {
  const c = countyCorrelation(a, b);
  const pts = c.pts.filter((p) => !exclude.includes(p.code));
  const mx = mean(pts.map((p) => p.x)), my = mean(pts.map((p) => p.y));
  let n = 0, dx = 0, dy = 0;
  for (const p of pts) { n += (p.x - mx) * (p.y - my); dx += (p.x - mx) ** 2; dy += (p.y - my) ** 2; }
  return { r: n / Math.sqrt(dx * dy), n: pts.length };
}

/** Ordinal helper: 1st, 2nd, 3rd, 4th … */
export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Crude estimate of new cancer cases per year: national incidence (strategy p. 6: just under 38,000) × population share. */
export function cancersPerYear(code: string) {
  const y = latestYear("population");
  const pop = value("population", code, y);
  const nat = nationalValue("population", y);
  if (!pop || !nat) return undefined;
  return Math.round((38000 * pop) / nat / 10) * 10;
}

/** Plain-language comparison of a finding with Finland, e.g. "cancer mortality 11% above what its age structure predicts". */
export function phrase(f: { key: string; value?: number; national?: number; ind: IndicatorMeta }) {
  if (f.key === "smr" && f.value != null) {
    const d = Math.round(f.value - 100);
    return `cancer mortality ${Math.abs(d)}% ${d >= 0 ? "above" : "below"} what its age structure predicts`;
  }
  const s = f.ind.short;
  // keep acronyms like "GP" upper-case; lower-case only an ordinary first word
  const label = /^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
  return `${label} ${fmtU(f.value, f.ind.unit)} vs ${fmtU(f.national, f.ind.unit)}`;
}

/** Round an approximate count for display: ≥ 1,000 to the nearest 100, otherwise to the nearest 10. */
export function approx(n: number) {
  return n >= 1000 ? Math.round(n / 100) * 100 : Math.round(n / 10) * 10;
}

/** Short source label for an indicator: Sotkanet ID, or our own Statistics Finland calculation for mortality. */
export function sourceLabel(ind: IndicatorMeta) {
  return ind.key === "smr" ? "Statistics Finland (SMR calc.)" : `Sotkanet ${ind.id}`;
}
