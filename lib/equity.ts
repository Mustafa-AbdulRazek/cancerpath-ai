import { counties, data, latestYear, value } from "./analysis";

/**
 * Inverse care law check (Tudor Hart; raised for Finland in the AstraZeneca briefing by H. Kuitunen, 13 Nov 2026):
 * is access to care highest where need is highest? County-level, ecological.
 *  - Need   = mean z of: low-income rate, cancer morbidity index, cancer mortality (SMR)          (higher = more need)
 *  - Access = mean z of: GP wait > 7 d (inverted), specialist wait > 6 mo (inverted), mean screening participation
 */
type Z = Record<string, number>;
function zOf(raw: Record<string, number | undefined>, dir = 1): Z {
  const entries = Object.entries(raw).filter((e): e is [string, number] => e[1] != null);
  const vals = entries.map((e) => e[1]);
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, vals.length - 1)) || 1;
  return Object.fromEntries(entries.map(([c, v]) => [c, (dir * (v - m)) / sd]));
}
const byCounty = (key: string) => Object.fromEntries(counties.map((c) => [c.code, value(key, c.code, latestYear(key))]));
const avg = (xs: (number | undefined)[]) => { const a = xs.filter((x): x is number => x != null); return a.length ? a.reduce((p, q) => p + q, 0) / a.length : undefined; };

const needParts = {
  lowIncome: zOf(byCounty("low_income")),
  cancerIndex: zOf(byCounty("cancer_index")),
  mortality: zOf(Object.fromEntries(Object.entries(data.mortality?.byCounty ?? {}).map(([c, m]) => [c, m.smr]))),
};
const screenMean = Object.fromEntries(counties.map((c) => [c.code, avg(["screen_breast", "screen_cervical", "screen_colorectal"].map((k) => value(k, c.code, latestYear(k))))]));
const accessParts = {
  gpAccess: zOf(byCounty("phc_wait7"), -1),
  specialistAccess: zOf(byCounty("spec_wait6m"), -1),
  screening: zOf(screenMean),
};

export type EquityQuadrant = "inverse" | "high-need" | "low-access" | "fair";
export const QUADRANT_LABEL: Record<EquityQuadrant, string> = {
  inverse: "High need, low access",
  "high-need": "High need, access on par",
  "low-access": "Low access, need on par",
  fair: "No mismatch",
};
export const QUADRANT_COLOR: Record<EquityQuadrant, string> = { inverse: "#b42318", "high-need": "#e3a857", "low-access": "#f2b8b5", fair: "#d9dde2" };

export function equityFor(code: string) {
  const need = avg([needParts.lowIncome[code], needParts.cancerIndex[code], needParts.mortality[code]]);
  const access = avg([accessParts.gpAccess[code], accessParts.specialistAccess[code], accessParts.screening[code]]);
  if (need == null || access == null) return undefined;
  const q: EquityQuadrant = need > 0.25 && access < -0.3 ? "inverse" : need > 0.25 ? "high-need" : access < -0.3 ? "low-access" : "fair";
  return { code, need, access, quadrant: q, accessParts: { gp: accessParts.gpAccess[code], specialist: accessParts.specialistAccess[code], screening: accessParts.screening[code] } };
}

export function equityAll() {
  return counties.map((c) => ({ ...equityFor(c.code)!, name: c.short })).filter((x) => x.need != null);
}

/** Correlation between need and access across counties: positive = care follows need; ≤ 0 = it does not. */
export function needAccessCorrelation() {
  const rows = equityAll();
  const n = rows.length, mx = rows.reduce((s, r) => s + r.need, 0) / n, my = rows.reduce((s, r) => s + r.access, 0) / n;
  let a = 0, b = 0, c = 0;
  for (const r of rows) { a += (r.need - mx) * (r.access - my); b += (r.need - mx) ** 2; c += (r.access - my) ** 2; }
  return a / Math.sqrt(b * c);
}

/**
 * The 8-step delay chain from the AstraZeneca challenge briefing (H. Kuitunen, Espoo 13 Nov 2026).
 * Steps 1–2 are patient-related delay; steps 3–8 are healthcare-system delay.
 */
export const DELAY_STEPS: { n: number; label: string; kind: "patient" | "system"; measure: "proxy" | "partial" | "none"; note: string; key?: string }[] = [
  { n: 1, label: "Symptoms begin", kind: "patient", measure: "none", note: "Not recorded anywhere" },
  { n: 2, label: "Considering seeking care", kind: "patient", measure: "proxy", note: "Proxy: screening participation (health literacy, outreach)", key: "screen_cervical" },
  { n: 3, label: "First healthcare contact", kind: "system", measure: "proxy", note: "Proxy: GP visits waiting > 7 days", key: "phc_wait7" },
  { n: 4, label: "Physician assessment", kind: "system", measure: "proxy", note: "Proxy: GP visits waiting > 7 days", key: "phc_wait7" },
  { n: 5, label: "Tests and referrals", kind: "system", measure: "proxy", note: "Proxy: specialist queue > 6 months (all specialties)", key: "spec_wait6m" },
  { n: 6, label: "Diagnosis", kind: "system", measure: "partial", note: "Stage recorded for only 42% of new cancers" },
  { n: 7, label: "MDT treatment plan", kind: "system", measure: "none", note: "Not published by county" },
  { n: 8, label: "Treatment starts", kind: "system", measure: "none", note: "Only a national count over the 180-day limit" },
];
export const KUITUNEN_SOURCE = "Delay chain from the AstraZeneca challenge briefing by H. Kuitunen (Oulu University Hospital), Espoo 13 Nov 2026; Kuitunen et al., Cancer Medicine 2026;15:e71920";
