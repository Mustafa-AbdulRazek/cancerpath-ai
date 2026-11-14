// Builds lib/data/dataset.json from public sources (THL Sotkanet REST API + Statistics Finland boundaries).
// Run: npm run data   (requires internet). The generated JSON is committed so the app works offline.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { geoArea } from "d3-geo";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "lib", "data", "dataset.json");
const YEARS = Array.from({ length: 11 }, (_, i) => 2015 + i);
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
  geo: { type: "FeatureCollection", features },
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(dataset));
console.log(`wrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB), ${counties.length} counties, ${features.length} shapes`);
