import { countyByCode, findingsFor, ordinal, phrase, stageMeta, stageScores, weakestStage } from "./analysis";
import { actionsFor, doFirst } from "./actions";

/** Deterministic county summary used on the county page, the printable brief and as the AI fallback. */
export function countySummary(code: string) {
  const c = countyByCode[code];
  const weak = weakestStage(code);
  const clear = !!weak && weak.score < -0.35;
  const findings = findingsFor(code);
  const usable = findings.filter((f) => f.z != null && !f.ind.noisy && !f.smallDiff);
  const inStage = clear ? usable.filter((f) => f.ind.stage === weak!.stage).sort((a, b) => a.z! - b.z!)[0] : undefined;
  const det = stageScores(code).find((s) => s.stage === "detection")?.score;
  const downstream = clear && weak!.stage === "outcome" && det != null && det >= -0.2;
  const fact = (f?: (typeof findings)[number]) => (f ? `${phrase(f)}${f.key === "smr" ? "" : " in Finland"}, ${ordinal(f.rank!)} of ${f.of}` : "");

  let message: string;
  if (downstream) {
    message = `${c.name}'s cancer outcomes lag (${fact(inStage)}) while its detection measures are on par. The gap is likely created after the first GP contact (recognising symptoms, referral and diagnostics), which is not publicly measured.`;
  } else if (clear) {
    message = `${c.name} falls furthest behind at the ${stageMeta(weak!.stage).label.toLowerCase()} step${inStage ? `: ${fact(inStage)}` : ""}.`;
  } else {
    message = `${c.name} has no pathway step clearly behind other counties on the public indicators. The next step is to measure what is not public yet: time from referral to treatment.`;
  }
  const gaps = usable.filter((f) => f.z! <= -0.5 || f.belowTarget).sort((a, b) => a.z! - b.z!).slice(0, 4);
  const plan = actionsFor(code, 5);
  return { county: c, weak: clear ? weak : undefined, downstream, message, gaps, plan, first: doFirst(plan) };
}
