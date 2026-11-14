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

/** Known breaks in series that limit trend interpretation. */
export const SERIES_NOTES: Record<string, string> = {
  spec_wait6m: "Large jumps around 2022 (e.g. North Karelia 8.1 → 43.2), when wellbeing services counties took over, may partly reflect changes in recording. Compare levels across counties; read trends with care.",
};
export const counties = [...data.counties].sort((a, b) => a.short.localeCompare(b.short, "fi"));
export const indicators = data.indicators;
export const scoredIndicators = indicators.filter((i) => i.stage !== "context");
export const indicatorByKey = Object.fromEntries(indicators.map((i) => [i.key, i])) as Record<string, IndicatorMeta>;
export const countyByCode = Object.fromEntries(data.counties.map((c) => [c.code, c])) as Record<string, County>;

export const STAGES: { key: Stage; label: string; question: string; color: string }[] = [
  { key: "detection", label: "Detection", question: "Are cancers found early? (screening + access to a GP)", color: "#d97706" },
  { key: "referral", label: "Referral", question: "Is specialist care congested? (all-specialty capacity proxy)", color: "#dc2626" },
  { key: "treatment", label: "Diagnosis → Treatment", question: "Does treatment start within target times?", color: "#7c3aed" },
  { key: "outcome", label: "Outcome", question: "Do patients survive as well as elsewhere in Finland?", color: "#0f766e" },
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
};

export function findingsFor(code: string): IndicatorFinding[] {
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
    const smallDiff = ind.stage === "outcome" && v != null && nat != null && Math.abs(v - nat) <= 2;
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
    const zs = fs.filter((x) => x.z != null && !x.ind.noisy).map((x) => x.z!) as number[];
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
  const perRound = Math.round((pop * (target - v)) / 100);
  return { perRound, perYear: Math.round(perRound / meta.intervalYears), pop, band, bandLabel: meta.label, intervalYears: meta.intervalYears, current: v, target, popYear: data.eligibleMeta.year };
}
