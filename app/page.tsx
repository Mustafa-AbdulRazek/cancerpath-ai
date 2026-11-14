import Link from "next/link";
import CountyPicker from "@/components/CountyPicker";
import MapExplorer, { MapMode } from "@/components/MapExplorer";
import Scatter from "@/components/Scatter";
import { Section, SourceBadge, Sparkline } from "@/components/ui";
import {
  counties, countyCorrelation, countyCorrelationExcluding, data, findingsFor, fmt, fmtU, indicatorByKey, latestYear,
  nationalSeries, nationalValue, ordinal, overallScore, rank, scoredIndicators, series, stageMeta, stageRank, STAGES, UUSIMAA_HUS, value,
  weakestStage, zScore,
} from "@/lib/analysis";
import { STRATEGY_URL, THL_2016_URL } from "@/lib/actions";
import { FACTS } from "@/lib/facts";

const zColor = (z?: number) => (z == null ? "#eef0f3" : z <= -1 ? "#b42318" : z <= -0.5 ? "#f2b8b5" : z < 0.5 ? "#e5e7eb" : z < 1 ? "#99d5cf" : "#0f766e");
const DIVERGING = [
  { color: "#b42318", label: "Much worse" }, { color: "#f2b8b5", label: "Worse" }, { color: "#e5e7eb", label: "Average" },
  { color: "#99d5cf", label: "Better" }, { color: "#0f766e", label: "Much better" }, { color: "url(#hatch)", label: "No or incomplete data" },
];

export default function Home() {
  const yS = latestYear("surv_colon");
  const colon = rank("surv_colon", "09", yS);
  const breast = rank("surv_breast", "09", yS);
  const ph = series("surv_colon", "09");
  const fiColon = nationalSeries("surv_colon").filter((p) => p.year >= ph[0].year);
  const eq = countyCorrelation("screen_breast", "foreign_pct");
  const eqEx = countyCorrelationExcluding("screen_breast", "foreign_pct", UUSIMAA_HUS);
  const noReferral = new Set(counties.filter((c) => value("spec_wait6m", c.code) == null).map((c) => c.code));

  const ranked = counties
    .map((c) => ({ c, score: overallScore(c.code), weak: weakestStage(c.code) }))
    .sort((a, b) => a.score - b.score);

  const indicatorMode = (key: string): MapMode => {
    const ind = indicatorByKey[key];
    const y = latestYear(key);
    return {
      key,
      label: `${ind.short} (${y})`,
      legend: DIVERGING,
      note: `Finland ${fmtU(nationalValue(key, y), ind.unit)}. Source: THL Sotkanet ${ind.id}.`,
      datum: Object.fromEntries(
        counties.map((c) => {
          const v = value(key, c.code, y);
          return [c.code, { code: c.code, name: c.name, hatch: v == null, fill: zColor(zScore(key, c.code, y)), label: `${ind.short}: ${v == null ? "no or incomplete data" : fmtU(v, ind.unit)}`, sub: `Finland ${fmtU(nationalValue(key, y), ind.unit)}` }];
        })
      ),
    };
  };
  const modes: MapMode[] = [
    {
      key: "weakest",
      label: "Where each county falls behind most",
      legend: [...STAGES.filter((s) => s.key !== "treatment").map((s) => ({ color: s.color, label: s.label })), { color: "#d9dde2", label: "No clear gap" }, { color: "url(#hatch)", label: "Referral not measurable" }],
      note: "Colour = the pathway step where the county is furthest behind other counties. Hatched: specialist-waiting data missing or incomplete (HUS area).",
      datum: Object.fromEntries(
        counties.map((c) => {
          const w = weakestStage(c.code);
          const clear = w && w.score < -0.35;
          return [c.code, { code: c.code, name: c.name, hatch: noReferral.has(c.code), fill: clear ? stageMeta(w!.stage).color : "#d9dde2", label: clear ? `Furthest behind: ${stageMeta(w!.stage).label}` : "No clear gap", sub: noReferral.has(c.code) ? "Referral step not measurable" : undefined }];
        })
      ),
    },
    indicatorMode("surv_colon"),
    indicatorMode("screen_cervical"),
    indicatorMode("spec_wait6m"),
    ...scoredIndicators.filter((i) => !["surv_colon", "screen_cervical", "spec_wait6m"].includes(i.key)).map((i) => indicatorMode(i.key)),
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold leading-tight md:text-[2.4rem]">See where your county&apos;s cancer pathway falls behind, and what to do about it.</h1>
          <p className="mt-3 max-w-xl text-[var(--muted)]">
            For all 21 wellbeing services counties and Helsinki. Built on public THL, Cancer Registry and Statistics Finland data, and on Goal 3 of the National Cancer Strategy 2026–2035: equal outcomes wherever you live.
          </p>
        </div>
        <div className="lg:justify-self-end">
          <CountyPicker counties={counties.map((c) => ({ code: c.code, name: c.name }))} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,400px)_1fr]">
        <div className="rounded-[6px] border border-[var(--line)] bg-white p-4">
          <MapExplorer geo={data.geo} modes={modes} />
          <p className="mt-2 text-xs text-[var(--muted)]">Click a county to open its plan.</p>
        </div>
        <div className="rounded-[6px] border border-[var(--line)] bg-white p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">Where to look first</h2>
            <span className="text-xs text-[var(--muted)]">largest overall gap first</span>
          </div>
          <ol className="divide-y divide-[var(--line)]">
            {ranked.map(({ c, weak }, i) => {
              const clear = weak && weak.score < -0.35;
              const top = findingsFor(c.code)
                .filter((f) => f.z != null && !f.ind.noisy && !f.smallDiff && (!clear || f.ind.stage === weak!.stage))
                .sort((a, b) => a.z! - b.z!)[0];
              const sr = clear ? stageRank(c.code, weak!.stage) : undefined;
              return (
                <li key={c.code}>
                  <Link href={`/county/${c.code}`} className="grid grid-cols-[1.5rem_1fr] gap-x-2 py-2 hover:bg-[var(--bg)] sm:grid-cols-[1.5rem_11rem_1fr]">
                    <span className="text-sm text-[var(--muted)]">{i + 1}</span>
                    <span className="font-medium">{c.name}</span>
                    <span className="col-start-2 text-sm text-[var(--muted)] sm:col-start-3">
                      {clear ? (
                        <>
                          <span style={{ color: stageMeta(weak!.stage).color }} className="font-medium">{stageMeta(weak!.stage).label}</span>
                          {sr?.rank ? ` (${ordinal(sr.rank)} of ${sr.of})` : ""}
                          {top && top.z! < -0.5 ? ` · ${top.ind.short} ${fmtU(top.value, top.ind.unit)} vs ${fmtU(top.national, top.ind.unit)}` : ""}
                        </>
                      ) : (
                        "No clear gap"
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <Section title="Three things the data shows">
        <ol className="space-y-5">
          <li className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div>
              <p className="font-medium">1. Colon cancer survival differs by {fmt((colon.best?.[1] ?? 0) - (colon.worst?.[1] ?? 0))} percentage points between counties ({fmt(colon.worst?.[1])}–{fmt(colon.best?.[1])}%); breast cancer by only {fmt((breast.best?.[1] ?? 0) - (breast.worst?.[1] ?? 0))} ({fmt(breast.worst?.[1])}–{fmt(breast.best?.[1])}%).</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                In Päijät-Häme, colon cancer survival fell from {fmt(ph[0].value)}% to {fmt(ph[ph.length - 1].value)}% ({ph[0].year}–{ph[ph.length - 1].year}) while Finland rose to {fmt(fiColon[fiColon.length - 1]?.value)}%. Nationally, {FACTS.survey.text.charAt(0).toLowerCase() + FACTS.survey.text.slice(1)}. So the gap is likely created after the first GP contact: recognising symptoms, referral and diagnostics. <Link href="/county/09" className="text-[var(--accent)] hover:underline">Open Päijät-Häme</Link>
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                <SourceBadge href={indicatorByKey.surv_colon.url} label="Sotkanet 3627" />, <SourceBadge href={indicatorByKey.surv_breast.url} label="3625" />, <SourceBadge href={FACTS.survey.url} label="patient survey 2025" />. Survival is a period estimate over overlapping years: read it as a sustained decline, not proof of cause.
              </p>
            </div>
            <div className="text-xs text-[var(--muted)]">
              <Sparkline a={ph} b={fiColon} better="higher" width={150} height={44} />
              <div>Päijät-Häme vs Finland (dashed)</div>
            </div>
          </li>
          <li>
            <p className="font-medium">2. Nobody can see how long each county takes from referral to cancer treatment.</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              These times are not published by county and cancer type against the THL targets. {FACTS.waits180.text}. {FACTS.stage.text}.
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              <SourceBadge href={FACTS.waits180.url} label="IHE 2026" />, <SourceBadge href={FACTS.stage.url} label="Syöpä 2024" />, <SourceBadge href={THL_2016_URL} label="THL 21/2016" />, <SourceBadge href={STRATEGY_URL} label="Strategy p. 5" />
            </p>
          </li>
          <li>
            <p className="font-medium">3. Screening misses women born abroad, and the gap shows up in the capital region.</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{FACTS.breastLang.text}. {FACTS.cervicalBirth.text}.</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              <SourceBadge href={FACTS.breastLang.url} label="IHE 2026" />, <SourceBadge href={FACTS.cervicalBirth.url} label="Cancer Registry, Nov 2026" />
            </p>
          </li>
        </ol>
      </Section>

      <Section title="Finland overview">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="font-medium">Goal 3 indicators: what can be measured today</h3>
            <table className="mt-2 w-full text-sm">
              <tbody className="divide-y divide-[var(--line)]">
                <tr><td className="py-2 pr-3">Survival at the Nordic level</td><td className="py-2 pr-3 text-[var(--muted)]">Colon 5-year survival: Finland {fmt(nationalValue("surv_colon"))}%, counties {fmt(colon.worst?.[1])}–{fmt(colon.best?.[1])}%</td><td className="py-2 font-medium text-[var(--better)]">Measured</td></tr>
                <tr><td className="py-2 pr-3">Cancer mortality −10%</td><td className="py-2 pr-3 text-[var(--muted)]">About 13,300 deaths a year (strategy p. 5); not in the open indicator API by county</td><td className="py-2 font-medium text-[var(--muted)]">National only</td></tr>
                <tr><td className="py-2 pr-3">Treatment within target times</td><td className="py-2 pr-3 text-[var(--muted)]">Only a national count over the 180-day limit; no county or cancer-type data (action A7)</td><td className="py-2 font-medium text-[var(--worse)]">Not measured</td></tr>
                <tr><td className="py-2 pr-3">Stage recorded at diagnosis</td><td className="py-2 pr-3 text-[var(--muted)]">42% nationally, Pirkanmaa 72%, target 70% (action A12)</td><td className="py-2 font-medium text-[var(--worse)]">Uneven</td></tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-[var(--muted)]"><SourceBadge href={STRATEGY_URL} label="National Cancer Strategy p. 5" />, <SourceBadge href={FACTS.stage.url} label="Syöpä 2024" /></p>
          </div>
          <div>
            <h3 className="font-medium">Breast screening and share of foreign citizens, by county</h3>
            <Scatter pts={eq.pts} xLabel={`Foreign citizens, % (${eq.yearB})`} yLabel={`Breast screening, % (${eq.yearA})`} />
            <p className="text-xs text-[var(--muted)]">
              Across all 22 areas the link is strong (r = {eq.r.toFixed(2)}), but it is mostly a capital-region pattern: without Uusimaa and Helsinki it is r = {eqEx.r.toFixed(2)}. The individual-level figures above confirm the gap. {FACTS.screenRegions.text}, which matches this data. <SourceBadge href={FACTS.screenRegions.url} label="Syöpäjärjestöt 2026" />
            </p>
          </div>
        </div>
      </Section>

      <Section title="Recommendations at national level" aside={<span className="text-xs text-[var(--muted)]">for STM, THL and FICAN</span>}>
        <ol className="grid gap-4 md:grid-cols-3">
          <li><p className="font-medium">1. A mandatory &quot;suspected cancer&quot; flag in the national eReferral</p><p className="text-sm text-[var(--muted)]">So suspected cancer never joins the general specialist queue. Roadmap 2.5.2.</p></li>
          <li><p className="font-medium">2. Publish referral-to-treatment times by county and cancer type in Sotkanet</p><p className="text-sm text-[var(--muted)]">Using the THL 21/2016 definitions, after validating the dates in Hilmo. Roadmap 3.1.2 and 3.1.4.</p></li>
          <li><p className="font-medium">3. Make stage recording a national quality indicator, target 70%</p><p className="text-sm text-[var(--muted)]">It is 42% today and 72% in Pirkanmaa. Roadmap 3.1.4 and 3.2.</p></li>
        </ol>
      </Section>

      <Section title="Proposed next step: a 90-day pilot with one county">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">What:</span> measure time from referral to treatment with the county&apos;s own data (A7), and add a suspected-cancer referral flag with a 48-hour triage (A5).</p>
            <p><span className="font-medium">Where:</span> start in <Link href="/county/08" className="text-[var(--accent)] hover:underline">Pirkanmaa</Link>, which has Finland&apos;s most complete stage data (72%), then <Link href="/county/09" className="text-[var(--accent)] hover:underline">Päijät-Häme</Link>, where colon cancer survival fell most.</p>
            <p><span className="font-medium">Data needed:</span> referral dates, cancer diagnosis codes (ICD-10 C00–C97) and first-treatment procedure codes; validate the dates first.</p>
            <p><span className="font-medium">Success at day 90:</span> the first monthly time-to-treatment report per cancer type, compared with the THL targets.</p>
          </div>
          <div className="rounded-[6px] bg-[var(--accent-soft)] p-4 text-sm">
            <p className="font-medium">A model that already works</p>
            <p className="mt-1 text-[var(--muted)]">{FACTS.azPilot.text}. A pilot here would follow the same shape: one county, a lab or data partner, a university evaluation and a reusable tool for all 22 counties.</p>
            <p className="mt-1 text-xs"><SourceBadge href={FACTS.azPilot.url} label="AstraZeneca, 8 Oct 2025" /></p>
          </div>
        </div>
      </Section>
    </div>
  );
}
