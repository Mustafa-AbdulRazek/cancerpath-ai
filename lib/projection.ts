import { counties, indicatorByKey, nationalSeries, series } from "./analysis";

/** Horizon of the National Cancer Strategy (targets to be reached by 2035). */
export const HORIZON = 2035;
export const TARGET_KEYS = ["screen_breast", "screen_cervical", "screen_colorectal"] as const;
export const TARGET = 80;
/** Fewer years than this (e.g. colorectal screening, which started in 2022 and is still being rolled out) are not projected. */
export const MIN_YEARS = 5;

export function reachLabel(y?: number) {
  return y == null ? "" : y > 2050 ? "after 2050" : `around ${y}`;
}

export type Status = "meets" | "at-risk" | "on-track" | "too-slow" | "moving-away" | "insufficient";
export const STATUS_LABEL: Record<Status, string> = {
  meets: "Meets target",
  "at-risk": "Above target, but falling",
  insufficient: "Too few years to project",
  "on-track": "On track for 2035",
  "too-slow": "Too slow for 2035",
  "moving-away": "Moving away",
};
export const STATUS_COLOR: Record<Status, string> = { insufficient: "#d9dde2", "at-risk": "#e9c46a", meets: "#0f766e", "on-track": "#5aa89f", "too-slow": "#d08a2c", "moving-away": "#b42318" };

type Pt = { year: number; value: number };

/** Ordinary least squares on the last `n` points, with a 95% prediction interval for future years. */
export function linearTrend(points: Pt[], n = 8) {
  const p = points.slice(-n);
  if (p.length < 3) return undefined;
  const xs = p.map((d) => d.year), ys = p.map((d) => d.value);
  const xb = xs.reduce((a, b) => a + b, 0) / p.length, yb = ys.reduce((a, b) => a + b, 0) / p.length;
  const sxx = xs.reduce((s, x) => s + (x - xb) ** 2, 0);
  const slope = xs.reduce((s, x, i) => s + (x - xb) * (ys[i] - yb), 0) / sxx;
  const intercept = yb - slope * xb;
  const resid = ys.map((y, i) => y - (intercept + slope * xs[i]));
  const s2 = resid.reduce((s, r) => s + r * r, 0) / Math.max(1, p.length - 2);
  const at = (year: number) => intercept + slope * year;
  const band = (year: number) => 1.96 * Math.sqrt(s2 * (1 + 1 / p.length + (year - xb) ** 2 / sxx));
  return { slope, at, band, from: xs[0], to: xs[xs.length - 1], n: p.length };
}

/** Where a county's screening participation is heading relative to the 80% target by 2035. */
export function screeningTrajectory(key: string, code: string) {
  const s = series(key, code);
  const t = linearTrend(s);
  if (!t || !s.length) return undefined;
  const last = s[s.length - 1];
  const at2035 = Math.max(0, Math.min(100, t.at(HORIZON)));
  let status: Status;
  let reachYear: number | undefined;
  if (t.n < MIN_YEARS) status = "insufficient";
  else if (last.value >= TARGET) status = at2035 >= TARGET ? "meets" : "at-risk";
  else if (t.slope <= 0.05) status = "moving-away";
  else {
    reachYear = Math.ceil(t.to + (TARGET - t.at(t.to)) / t.slope);
    status = reachYear <= HORIZON ? "on-track" : "too-slow";
  }
  return {
    key, code, status, reachYear, at2035, slope: t.slope, last, trend: t,
    lowConfidence: t.n < MIN_YEARS,
    projection: Array.from({ length: HORIZON - last.year }, (_, i) => {
      const year = last.year + 1 + i;
      return { year, value: t.at(year), lo: t.at(year) - t.band(year), hi: t.at(year) + t.band(year) };
    }),
  };
}

/** County-minus-Finland survival gap trend: is the gap closing or widening? */
export function survivalGapTrend(key: string, code: string) {
  const c = series(key, code), n = nationalSeries(key);
  const gap = c.map((p) => ({ year: p.year, value: p.value - (n.find((q) => q.year === p.year)?.value ?? NaN) })).filter((p) => !Number.isNaN(p.value));
  const t = linearTrend(gap, 6);
  if (!t) return undefined;
  return { slope: t.slope, from: t.from, to: t.to, first: gap[Math.max(0, gap.length - 6)], last: gap[gap.length - 1] };
}

export function nationalSummary() {
  return TARGET_KEYS.map((key) => {
    const st = counties.map((c) => screeningTrajectory(key, c.code)?.status).filter(Boolean) as Status[];
    const count = (s: Status) => st.filter((x) => x === s).length;
    return { key, label: indicatorByKey[key].short, meets: count("meets"), atRisk: count("at-risk"), onTrack: count("on-track"), tooSlow: count("too-slow"), away: count("moving-away"), insufficient: count("insufficient"), n: st.length };
  });
}
