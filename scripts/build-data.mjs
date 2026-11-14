// Builds lib/data/dataset.json from public sources (THL Sotkanet REST API + Statistics Finland boundaries).
// Run: npm run data   (requires internet). The generated JSON is committed so the app works offline.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { geoArea } from "d3-geo";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "lib", "data", "dataset.json");
// Years are computed from today, so the pipeline keeps working as new data is published.
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 2015 + 1 }, (_, i) => 2015 + i);

/** Latest years available in a Statistics Finland PxWeb table (read from its metadata). */
async function pxYears(path, n = 1) {
  const r = await fetch(`https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/${path}`);
  if (!r.ok) throw new Error("metadata " + path + " " + r.status);
  const meta = await r.json();
  const v = meta.variables.find((x) => x.code === "timeperiod_y");
  return v.values.slice(-n);
}
const NATIONAL = 658;

// Indicator registry: every number in the app traces back to one of these entries.
export const INDICATORS = [
  { id: 3621, key: "screen_breast", stage: "detection", label: "Breast cancer screening participation", short: "Breast screening", unit: "%", better: "higher", target: 80, targetSource: "strategy", gender: "total" },
  { id: 3620, key: "screen_cervical", stage: "detection", label: "Cervical cancer screening participation", short: "Cervical screening", unit: "%", better: "higher", target: 80, targetSource: "strategy", gender: "total" },
  { id: 6103, key: "screen_colorectal", stage: "detection", label: "Colorectal cancer screening participation", short: "Colorectal screening", unit: "%", better: "higher", target: 80, targetSource: "strategy", gender: "total" },
  { id: 6411, key: "phc_wait7", stage: "detection", label: "Non-urgent GP visits in primary care waiting > 7 days after needs assessment", short: "GP wait > 7 days", unit: "% of visits", better: "lower", gender: "total" },
  { id: 3336, key: "spec_wait6m", stage: "referral", label: "People who waited > 6 months for specialist care during the year", short: "Specialist wait > 6 mo", unit: "per 10,000", better: "lower", gender: "total" },
  { id: 3627, key: "surv_colon", stage: "outcome", label: "Colon cancer 5-year relative survival (age-standardised)", short: "Colon cancer survival", unit: "%", better: "higher", gender: "total" },
  { id: 3625, key: "surv_breast", stage: "outcome", label: "Breast cancer 5-year relative survival (age-standardised)", short: "Breast cancer survival", unit: "%", better: "higher", gender: "total" },
  { id: 3626, key: "surv_cervical", stage: "outcome", label: "Cervical cancer 5-year relative survival (age-standardised)", short: "Cervical cancer survival", unit: "%", better: "higher", gender: "total", noisy: true },
  // Context (not scored)
  { id: 5643, key: "cancer_index", stage: "context", label: "Cancer morbidity index, age-standardised (Finland = 100)", short: "Cancer index", unit: "index", better: "lower", gender: "total" },
  { id: 2616, key: "population", stage: "context", label: "Population (mean)", short: "Population", unit: "people", better: "none", gender: "total" },
  { id: 3074, key: "foreign_pct", stage: "context", label: "Foreign citizens, % of population", short: "Foreign citizens", unit: "%", better: "none", gender: "total" },
  { id: 3099, key: "low_income", stage: "context", label: "Low-income rate (municipal general), % of population", short: "Low-income rate", unit: "%", better: "lower", gender: "total" },
  { id: 180, key: "education", stage: "context", label: "Education level measure (higher = more educated)", short: "Education level", unit: "index", better: "higher", gender: "total" },
  { id: 6103, key: "screen_colorectal_male", stage: "context", label: "Colorectal cancer screening participation, men", short: "Colorectal screening (men)", unit: "%", better: "higher", gender: "male" },
  { id: 6103, key: "screen_colorectal_female", stage: "context", label: "Colorectal cancer screening participation, women", short: "Colorectal screening (women)", unit: "%", better: "higher", gender: "female" },
];

async function getJson(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status + " " + url);
      return await r.json();
    } catch (e) {
      if (i === 2) throw e;
      await new Promise((res) => setTimeout(res, 1500));
    }
  }
}

const regionsRaw = await getJson("https://sotkanet.fi/rest/1.1/regions");
const counties = regionsRaw
  .filter((r) => r.category === "HYVINVOINTIALUE" && r.code !== "91") // exclude Åland (separate health system)
  .map((r) => ({ sotkanetId: r.id, code: r.code, nameFi: r.title.fi, name: (r.title.en || r.title.fi) }));
const countyIds = new Set(counties.map((c) => c.sotkanetId));

const indicatorsOut = [];
const values = {}; // values[key][code][year] = number
const national = {}; // national[key][year]
for (const ind of INDICATORS) {
  const meta = await getJson(`https://sotkanet.fi/rest/1.1/indicators/${ind.id}`);
  const q = YEARS.map((y) => `years=${y}`).join("&");
  const rows = await getJson(`https://sotkanet.fi/rest/1.1/json?indicator=${ind.id}&${q}&genders=${ind.gender}`);
  values[ind.key] = {};
  national[ind.key] = {};
  for (const row of rows) {
    if (row.value == null) continue;
    if (row.region === NATIONAL) national[ind.key][row.year] = row.value;
    if (countyIds.has(row.region)) {
      const code = counties.find((c) => c.sotkanetId === row.region).code;
      (values[ind.key][code] ??= {})[row.year] = row.value;
    }
  }
  const strip = (s) => (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  indicatorsOut.push({
    ...ind,
    titleFi: meta.title?.fi,
    titleEn: meta.title?.en || null,
    descriptionFi: strip(meta.description?.fi).slice(0, 1200),
    organization: meta.organization?.title?.fi || meta.organization?.title?.en || "THL",
    dataUpdated: meta["data-updated"] || null,
    url: `https://sotkanet.fi/sotkanet/fi/metadata/indicators/${ind.id}`,
    api: `https://sotkanet.fi/rest/1.1/json?indicator=${ind.id}`,
  });
  console.log(`indicator ${ind.id} ${ind.key}: ${Object.keys(values[ind.key]).length} counties`);
}

// Eligible screening populations per county (Statistics Finland 11re, municipalities aggregated via Sotkanet memberOf).
// Programme age bands (conservative core bands): breast women 50–69 every 2 years; cervical women 30–65 every 5 years;
// colorectal men+women 60–68 every 2 years (programme expanding to 56–74 by 2031).
const [POP_YEAR] = await pxYears("vaerak/11re.px", 1);
const kuntaToCounty = {};
const byIdR = Object.fromEntries(regionsRaw.map((r) => [r.id, r]));
for (const r of regionsRaw.filter((x) => x.category === "KUNTA")) {
  const hv = (r.memberOf || []).map((id) => byIdR[id]).find((x) => x && x.category === "HYVINVOINTIALUE");
  if (hv) kuntaToCounty["KU" + r.code] = hv.code;
}
const ages = Array.from({ length: 45 }, (_, i) => String(30 + i).padStart(3, "0")); // 030–074
const pxRes = await fetch("https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/vaerak/11re.px", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: [
      { code: "alue_23_20260101", selection: { filter: "item", values: Object.keys(kuntaToCounty) } },
      { code: "ikaryhma_10_20180101", selection: { filter: "item", values: ages } },
      { code: "sukupuoli_9_20180101", selection: { filter: "item", values: ["1", "2"] } },
      { code: "timeperiod_y", selection: { filter: "item", values: [POP_YEAR] } },
    ],
    response: { format: "json-stat2" },
  }),
});
if (!pxRes.ok) throw new Error("StatFin 11re " + pxRes.status + " " + (await pxRes.text()).slice(0, 200));
const px = await pxRes.json();
const [dA, dAge, dSex] = px.id.slice(0, 3).map((k) => px.dimension[k].category.index);
const sizes = px.size;
const eligible = {};
for (const [kunta, ia] of Object.entries(dA)) {
  const county = kuntaToCounty[kunta];
  if (!county) continue;
  const e = (eligible[county] ??= { breast: 0, cervical: 0, colorectal: 0 });
  for (const [age, ig] of Object.entries(dAge)) {
    for (const [sex, is] of Object.entries(dSex)) {
      const idx = ((ia * sizes[1] + ig) * sizes[2] + is) * sizes[3];
      const v = px.value[idx] || 0;
      const a = +age;
      if (sex === "2" && a >= 50 && a <= 69) e.breast += v;
      if (sex === "2" && a >= 30 && a <= 65) e.cervical += v;
      if (a >= 60 && a <= 68) e.colorectal += v;
    }
  }
}
console.log("eligible populations:", Object.keys(eligible).length, "counties; e.g. 14 =", JSON.stringify(eligible["14"]));
const eligibleMeta = {
  year: POP_YEAR,
  source: "Statistics Finland, StatFin table 11re (population by age and sex), municipalities aggregated to wellbeing services counties",
  url: "https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__vaerak/statfin_vaerak_pxt_11re.px/",
  bands: {
    breast: { label: "women aged 50–69", intervalYears: 2 },
    cervical: { label: "women aged 30–65", intervalYears: 5 },
    colorectal: { label: "men and women aged 60–68 (core group; expanding to 56–74 by 2031)", intervalYears: 2 },
  },
};

// Cancer mortality by county, indirectly age-standardised (SMR), 2021–2025 pooled.
// Observed: StatFin 13u5 (deaths by wellbeing services county, cause 04-21 malignant neoplasms C00–C97).
// Expected: national age-specific deaths (StatFin 11az, same cause and years) × county population share in each age band
// (StatFin 11re, population 31.12.2023, the midpoint year). SMR = observed / expected, 95% CI = SMR × exp(±1.96/√observed).
const SMR_YEARS = await pxYears("ksyyt/13u5.px", 5); // latest 5 years with cause-of-death data
const AGE_BANDS = ["000", "1-4", "5-9", "10-14", "15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70-74", "75-79", "80-84", "85-89", "90-94", "95-"];
const bandOf = (age) => {
  if (age === 0) return "000";
  if (age < 5) return "1-4";
  if (age >= 95) return "95-";
  const lo = Math.floor(age / 5) * 5;
  return `${lo}-${lo + 4}`;
};
const pxPost = async (path, query) => {
  const r = await fetch(`https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, response: { format: "json-stat2" } }),
  });
  if (!r.ok) throw new Error(path + " " + r.status + " " + (await r.text()).slice(0, 200));
  return r.json();
};
// json-stat2 helper: iterate all cells with their category codes
const cells = (js) => {
  const dims = js.id.map((k) => Object.entries(js.dimension[k].category.index).sort((a, b) => a[1] - b[1]).map((e) => e[0]));
  const out = [];
  js.value.forEach((v, flat) => {
    let rem = flat;
    const codes = {};
    for (let d = js.id.length - 1; d >= 0; d--) {
      const size = js.size[d];
      codes[js.id[d]] = dims[d][rem % size];
      rem = Math.floor(rem / size);
    }
    out.push({ codes, v: v ?? 0 });
  });
  return out;
};
const hvaCodes = counties.map((c) => "HVA" + c.code);
const obsJs = await pxPost("ksyyt/13u5.px", [
  { code: "alue_23_20260101", selection: { filter: "item", values: hvaCodes } },
  { code: "kuolinsyyt_1_20210101", selection: { filter: "item", values: ["04-21"] } },
  { code: "timeperiod_y", selection: { filter: "item", values: SMR_YEARS } },
  { code: "contentscode", selection: { filter: "item", values: ["ksyylkm"] } },
]);
const observed = {};
for (const { codes, v } of cells(obsJs)) {
  const code = codes.alue_23_20260101.replace("HVA", "");
  observed[code] = (observed[code] || 0) + v;
}
const natJs = await pxPost("ksyyt/11az.px", [
  { code: "kuolinsyyt_1_20210101", selection: { filter: "item", values: ["04-21"] } },
  { code: "ikaryhma_10_20180101", selection: { filter: "item", values: AGE_BANDS } },
  { code: "sukupuoli_9_20180101", selection: { filter: "item", values: ["SSS"] } },
  { code: "timeperiod_y", selection: { filter: "item", values: SMR_YEARS } },
]);
const natDeaths = {};
for (const { codes, v } of cells(natJs)) natDeaths[codes.ikaryhma_10_20180101] = (natDeaths[codes.ikaryhma_10_20180101] || 0) + v;
const allAges = Array.from({ length: 100 }, (_, i) => String(i).padStart(3, "0")).concat(["100-"]);
const popJs = await pxPost("vaerak/11re.px", [
  { code: "alue_23_20260101", selection: { filter: "item", values: Object.keys(kuntaToCounty) } },
  { code: "ikaryhma_10_20180101", selection: { filter: "item", values: allAges } },
  { code: "sukupuoli_9_20180101", selection: { filter: "item", values: ["SSS"] } },
  { code: "timeperiod_y", selection: { filter: "item", values: [SMR_YEARS[2] <= POP_YEAR ? SMR_YEARS[2] : POP_YEAR] } }, // midpoint year of the SMR window
]);
const popBand = {}; // popBand[county][band]
const natPopBand = {};
for (const { codes, v } of cells(popJs)) {
  const county = kuntaToCounty[codes.alue_23_20260101];
  const a = codes.ikaryhma_10_20180101 === "100-" ? 100 : +codes.ikaryhma_10_20180101;
  const b = bandOf(a);
  natPopBand[b] = (natPopBand[b] || 0) + v;
  if (!county) continue;
  (popBand[county] ??= {})[b] = (popBand[county][b] || 0) + v;
}
const mortality = { years: `${SMR_YEARS[0]}–${SMR_YEARS[SMR_YEARS.length - 1]}`, cause: "Malignant neoplasms (C00–C97)", byCounty: {} };
for (const c of counties) {
  const O = observed[c.code];
  const E = AGE_BANDS.reduce((s, b) => s + ((natDeaths[b] || 0) * (popBand[c.code]?.[b] || 0)) / (natPopBand[b] || 1), 0);
  if (!O || !E) continue;
  const smr = O / E;
  const k = 1.96 / Math.sqrt(O);
  mortality.byCounty[c.code] = { observed: O, expected: Math.round(E), smr: Math.round(smr * 1000) / 1000, lo: Math.round(smr * Math.exp(-k) * 1000) / 1000, hi: Math.round(smr * Math.exp(k) * 1000) / 1000 };
}
const sumO = Object.values(mortality.byCounty).reduce((s, x) => s + x.observed, 0), sumE = Object.values(mortality.byCounty).reduce((s, x) => s + x.expected, 0);
console.log("SMR: counties", Object.keys(mortality.byCounty).length, "sum O/E", (sumO / sumE).toFixed(3), "national deaths", Object.values(natDeaths).reduce((a, b) => a + b, 0));

// Future demand from ageing (Statistics Finland population projection 2024, table 14wx, municipalities → counties).
// Expected cancer deaths = national age-specific cancer death rates (latest 5 years, from the SMR step) × projected population.
// This isolates the effect of ageing; it assumes today's age-specific rates stay constant.
const projMeta = await (await fetch("https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/vaenn/14wx.px")).json();
const projYears = projMeta.variables.find((v) => v.code === "timeperiod_y").values;
const projAreaCode = projMeta.variables.find((v) => v.code.startsWith("alue_")).code;
const projAreas = new Set(projMeta.variables.find((v) => v.code === projAreaCode).values);
const DEMAND_FROM = String(Math.max(+projYears[0], THIS_YEAR - 1));
const DEMAND_TO = projYears.includes("2035") ? "2035" : projYears[projYears.length - 1];
const projJs = await pxPost("vaenn/14wx.px", [
  { code: projAreaCode, selection: { filter: "item", values: Object.keys(kuntaToCounty).filter((k) => projAreas.has(k)) } },
  { code: "timeperiod_y", selection: { filter: "item", values: [DEMAND_FROM, DEMAND_TO] } },
  { code: "sukupuoli_9_20180101", selection: { filter: "item", values: ["SSS"] } },
  { code: "ikaryhma_10_20180101", selection: { filter: "item", values: allAges } },
]);
const rateBand = Object.fromEntries(AGE_BANDS.map((b) => [b, (natDeaths[b] || 0) / SMR_YEARS.length / (natPopBand[b] || 1)])); // deaths per person-year
const acc = {}; // acc[county][year] = { expDeaths, pop70 }
const accNat = {};
for (const { codes, v } of cells(projJs)) {
  const county = kuntaToCounty[codes[projAreaCode]];
  const year = codes.timeperiod_y;
  const a = codes.ikaryhma_10_20180101 === "100-" ? 100 : +codes.ikaryhma_10_20180101;
  const e = v * rateBand[bandOf(a)];
  const p70 = a >= 70 ? v : 0;
  const n = ((accNat[year] ??= { expDeaths: 0, pop70: 0 }));
  n.expDeaths += e; n.pop70 += p70;
  if (!county) continue;
  const c = ((acc[county] ??= {})[year] ??= { expDeaths: 0, pop70: 0 });
  c.expDeaths += e; c.pop70 += p70;
}
const pct = (a, b) => Math.round(((b - a) / a) * 1000) / 10;
const demand = { from: DEMAND_FROM, to: DEMAND_TO, source: "Statistics Finland population projection 2024 (14wx) × national age-specific cancer death rates " + SMR_YEARS[0] + "–" + SMR_YEARS[SMR_YEARS.length - 1], byCounty: {}, national: {} };
for (const c of counties) {
  const f = acc[c.code]?.[DEMAND_FROM], t = acc[c.code]?.[DEMAND_TO];
  if (!f || !t) continue;
  demand.byCounty[c.code] = { deathsGrowth: pct(f.expDeaths, t.expDeaths), pop70Growth: pct(f.pop70, t.pop70), expFrom: Math.round(f.expDeaths), expTo: Math.round(t.expDeaths) };
}
demand.national = { deathsGrowth: pct(accNat[DEMAND_FROM].expDeaths, accNat[DEMAND_TO].expDeaths), pop70Growth: pct(accNat[DEMAND_FROM].pop70, accNat[DEMAND_TO].pop70), expFrom: Math.round(accNat[DEMAND_FROM].expDeaths), expTo: Math.round(accNat[DEMAND_TO].expDeaths) };
console.log("demand", DEMAND_FROM, "→", DEMAND_TO, "national", JSON.stringify(demand.national), "counties", Object.keys(demand.byCounty).length);

// Boundaries (Statistics Finland, CC BY 4.0)
const geo = await getJson(
  "https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:hyvinvointialue4500k_2025&outputFormat=json&srsName=EPSG:4326"
);
const round = (c) => (typeof c[0] === "number" ? [Math.round(c[0] * 1000) / 1000, Math.round(c[1] * 1000) / 1000] : c.map(round));
const features = geo.features
  .filter((f) => counties.some((c) => c.code === f.properties.hyvinvointialue))
  .map((f) => {
    const c = counties.find((c) => c.code === f.properties.hyvinvointialue);
    c.name = f.properties.name.replace(" wellbeing services county", "");
    c.nameSv = f.properties.namn;
    let g = { type: f.geometry.type, coordinates: round(f.geometry.coordinates) };
    // WFS rings are wound opposite to d3 spherical convention; reverse when the shape would cover the globe
    if (geoArea({ type: "Feature", geometry: g }) > 2 * Math.PI) g = { ...g, coordinates: g.type === "Polygon" ? g.coordinates.map((r) => [...r].reverse()) : g.coordinates.map((p) => p.map((r) => [...r].reverse())) };
    return { type: "Feature", properties: { code: c.code }, geometry: g };
  });
for (const c of counties) if (c.code === "90") c.name = "City of Helsinki";
for (const c of counties) c.short = c.name.replace("City of ", "");

const dataset = {
  generatedAt: new Date().toISOString(),
  sources: {
    sotkanet: { name: "THL Sotkanet indicator bank (REST API 1.1)", url: "https://sotkanet.fi", license: "CC BY 4.0, THL" },
    boundaries: { name: "Statistics Finland: wellbeing services counties 2025 (1:4.5M)", url: "https://geo.stat.fi", license: "CC BY 4.0, Statistics Finland" },
  },
  counties,
  indicators: indicatorsOut,
  values,
  national,
  eligible,
  eligibleMeta,
  mortality,
  demand,
  geo: { type: "FeatureCollection", features },
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(dataset));
console.log(`wrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB), ${counties.length} counties, ${features.length} shapes`);
