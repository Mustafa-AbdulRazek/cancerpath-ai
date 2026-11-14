import { countyByCode, findingsFor, ordinal, phrase, stageMeta, stageScores, weakestStage } from "./analysis";
import { actionsFor, doFirst } from "./actions";

type F = ReturnType<typeof findingsFor>[number];
/** Order findings by gap size, but always put cancer mortality (SMR) after cancer-specific indicators. */
export const survivalFirst = (a: F, b: F) => Number(a.key === "smr") - Number(b.key === "smr") || a.z! - b.z!;

/** Deterministic county summary used on the county page, the printable brief and as the AI fallback. */
export function countySummary(code: string) {
  const c = countyByCode[code];
  const weak = weakestStage(code);
  const clear = !!weak && weak.score < -0.35;
  const findings = findingsFor(code);
  const usable = findings.filter((f) => f.z != null && !f.ind.noisy && !f.smallDiff && !f.burdenOnly);
  // Lead with cancer-specific survival; mortality mixes incidence and care, so it is only a supporting fact.
  const inStage = clear ? usable.filter((f) => f.ind.stage === weak!.stage).sort(survivalFirst)[0] : undefined;
  const smrToo = clear && weak!.stage === "outcome" && inStage?.key !== "smr" ? usable.find((f) => f.key === "smr") : undefined;
  const det = stageScores(code).find((s) => s.stage === "detection")?.score;
  const downstream = clear && weak!.stage === "outcome" && det != null && det >= -0.2;
  const fact = (f?: (typeof findings)[number]) => (f ? `${phrase(f)}${f.key === "smr" ? "" : " in Finland"}, ${ordinal(f.rank!)} of ${f.of}` : "");

  let message: string;
  if (downstream) {
    message = `${c.name}'s cancer outcomes lag (${fact(inStage)}${smrToo ? `; ${phrase(smrToo)}` : ""}) while its detection measures are on par. The gap may be created after the first GP contact (recognising symptoms, referral and diagnostics), a step that is not publicly measured; measuring time to treatment (A7) would show it.`;
  } else if (clear) {
    message = `${c.name} falls furthest behind at the ${stageMeta(weak!.stage).label.toLowerCase()} step${inStage ? `: ${fact(inStage)}` : ""}.`;
  } else {
    message = `${c.name} has no pathway step clearly behind other counties on the public indicators. The next step is to measure what is not public yet: time from referral to treatment.`;
  }
  const gaps = usable.filter((f) => f.z! <= -0.5 || f.belowTarget).sort((a, b) => a.z! - b.z!).slice(0, 4);
  const plan = actionsFor(code, 5);
  return { county: c, weak: clear ? weak : undefined, downstream, message, gaps, plan, first: doFirst(plan) };
}

const FI_NAMES: Record<string, string> = {
  surv_colon: "paksusuolisyövän 5 vuoden elossaololuku",
  surv_breast: "rintasyövän 5 vuoden elossaololuku",
  screen_breast: "rintasyöpäseulontaan osallistuminen",
  screen_cervical: "kohdunkaulasyöpäseulontaan osallistuminen",
  screen_colorectal: "suolistosyöpäseulontaan osallistuminen",
  phc_wait7: "yli 7 päivää odottaneet kiireettömät lääkärikäynnit (3 v keskiarvo)",
  spec_wait6m: "yli 6 kk erikoissairaanhoitoa odottaneet / 10 000 asukasta",
};
const FI_STAGES: Record<string, string> = { detection: "varhainen toteaminen", referral: "lähete", treatment: "diagnoosi → hoito", outcome: "hoitotulokset" };

/** Finnish version of the verified key message (same logic and numbers as countySummary). */
export function keyMessageFi(code: string) {
  const s = countySummary(code);
  const c = s.county;
  const name = c.nameFi; // e.g. "Päijät-Hämeen hyvinvointialue", used as a label
  const f = s.weak ? findingsFor(code).filter((x) => x.z != null && !x.ind.noisy && !x.smallDiff && !x.burdenOnly && x.ind.stage === s.weak!.stage).sort(survivalFirst)[0] : undefined;
  const pct = f && f.ind.unit.startsWith("%") ? " %" : "";
  const num = (v?: number) => (v == null ? "–" : String(Math.round(v * 10) / 10).replace(".", ",") + pct);
  const fact = f
    ? f.key === "smr"
      ? `syöpäkuolleisuus ${Math.abs(Math.round(f.value! - 100))} % ${f.value! >= 100 ? "yli" : "alle"} ikärakenteen perusteella odotetun, sija ${f.rank}/${f.of}`
      : `${FI_NAMES[f.key] ?? f.ind.short} ${num(f.value)} vs. ${num(f.national)} koko maassa, sija ${f.rank}/${f.of}`
    : "";
  const smr = s.downstream ? findingsFor(code).find((x) => x.key === "smr" && x.z != null && !x.smallDiff && !x.burdenOnly && x.z < 0) : undefined;
  const smrFi = smr && smr.value != null ? `; syöpäkuolleisuus ${Math.abs(Math.round(smr.value - 100))} % yli ikärakenteen perusteella odotetun` : "";
  if (s.downstream) return `${name}: syövänhoidon tulokset jäävät jälkeen (${fact}${smrFi}), vaikka varhaisen toteamisen mittarit ovat maan tasolla. Ero voi syntyä ensimmäisen lääkärikäynnin jälkeen (oireiden tunnistaminen, lähete ja diagnostiikka), jota ei mitata julkisesti; hoitoonpääsyn ajan mittaaminen (A7) toisi sen näkyviin.`;
  if (s.weak) return `${name}: hoitopolku jää eniten jälkeen vaiheessa "${FI_STAGES[s.weak.stage]}"${fact ? `: ${fact}` : ""}.`;
  return `${name}: mikään hoitopolun vaihe ei jää selvästi jälkeen julkisissa mittareissa. Seuraava askel on mitata hoitoonpääsyn aika lähetteestä hoitoon.`;
}
