import Link from "next/link";
import CountyPicker from "@/components/CountyPicker";
import MapExplorer, { MapMode } from "@/components/MapExplorer";
import Scatter from "@/components/Scatter";
import { Section, SourceBadge, Sparkline } from "@/components/ui";
import {
  counties, countyByCode, countyCorrelation, phrase, countyCorrelationExcluding, data, findingsFor, fmt, fmtU, indicatorByKey, latestYear,
  nationalSeries, nationalValue, ordinal, overallScore, rank, series, stageMeta, stageRank, STAGES, UUSIMAA_HUS, value,
  weakestStage, zScore,
} from "@/lib/analysis";
import { STRATEGY_URL, THL_2016_URL } from "@/lib/actions";
import { survivalFirst } from "@/lib/brief";
import { FACTS } from "@/lib/facts";
import { HORIZON, nationalSummary, screeningTrajectory, STATUS_COLOR, STATUS_LABEL, TARGET } from "@/lib/projection";

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
  const smrHigh = Object.entries(data.mortality?.byCounty ?? {}).filter(([, m]) => m.lo > 1).sort((a, b) => b[1].smr - a[1].smr).map(([c, m]) => `${countyByCode[c].short} +${Math.round((m.smr - 1) * 100)}%`);
  const noReferral = new Set(counties.filter((c) => value("spec_wait6m", c.code) == null).map((c) => c.code));

  const ranked = counties
    .map((c) => ({ c, score: overallScore(c.code), weak: weakestStage(c.code) }))
    .map((x) => ({ ...x, clear: !!x.weak && x.weak.score < -0.35 }))
    // Counties with a clear gap first, ordered by how far behind their weakest step is; then the rest by overall score.
    .sort((a, b) => (a.clear !== b.clear ? (a.clear ? -1 : 1) : a.clear ? a.weak!.score - b.weak!.score : a.score - b.score));

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
    ...(["screen_cervical"] as const).map((key): MapMode => ({
      key: "traj-" + key,
      label: `${indicatorByKey[key].short}: on track for ${TARGET}% by ${HORIZON}?`,
      legend: (["meets", "at-risk", "on-track", "too-slow", "moving-away"] as const).map((s) => ({ color: STATUS_COLOR[s], label: STATUS_LABEL[s] })),
      note: `Linear trend of the last 8 years, projected to ${HORIZON} (strategy target: ${TARGET}% in every county). A projection, not a forecast.`,
      datum: Object.fromEntries(
        counties.map((c) => {
          const t = screeningTrajectory(key, c.code);
          return [c.code, { code: c.code, name: c.name, fill: t ? STATUS_COLOR[t.status] : "#eef0f3", label: t ? STATUS_LABEL[t.status] : "No data", sub: t ? `${t.last.value}% in ${t.last.year}${t.reachYear ? `; reaches ${TARGET}% ${t.reachYear > 2050 ? "after 2050" : "around " + t.reachYear}` : ""}` : undefined }];
        })
      ),
    })),
    ...(data.demand ? [{
      key: "demand",
      label: `Cancer care demand from ageing, ${data.demand.from}→${data.demand.to}`,
      legend: [{ color: "#f3d9a4", label: "under +10%" }, { color: "#e3a857", label: "+10–20%" }, { color: "#b9651b", label: "+20–25%" }, { color: "#7a3410", label: "over +25%" }],
      note: `Growth in expected cancer deaths from ageing alone (Finland +${fmt(data.demand.national.deathsGrowth)}%). Statistics Finland population projection 2024 × today's age-specific rates.`,
      datum: Object.fromEntries(counties.map((c) => {
        const g = data.demand!.byCounty[c.code]?.deathsGrowth;
        const fill = g == null ? "#eef0f3" : g < 10 ? "#f3d9a4" : g < 20 ? "#e3a857" : g < 25 ? "#b9651b" : "#7a3410";
        return [c.code, { code: c.code, name: c.name, fill, label: g == null ? "No data" : `+${fmt(g)}% expected cancer deaths by ${data.demand!.to}`, sub: g == null ? undefined : `70+ population +${fmt(data.demand!.byCounty[c.code].pop70Growth)}%` }];
      })),
    } as MapMode] : []),
    // Kept to the views the story needs (clarity); every indicator is still on each county page.
    ...["surv_colon", "smr", "screen_cervical", "screen_breast", "spec_wait6m", "phc_wait7"].filter((k) => indicatorByKey[k]).map((k) => indicatorMode(k)),
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
            <span className="text-xs text-[var(--muted)]">largest gap in any step first</span>
          </div>
          <ol className="divide-y divide-[var(--line)]">
            {ranked.map(({ c, weak }, i) => {
              const clear = weak && weak.score < -0.35;
              const top = findingsFor(c.code)
                .filter((f) => f.z != null && !f.ind.noisy && !f.smallDiff && !f.burdenOnly && (!clear || f.ind.stage === weak!.stage))
                .sort(survivalFirst)[0];
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
                          {top && top.z! < -0.5 ? ` · ${phrase(top)}` : ""}
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
                In Päijät-Häme, colon cancer survival fell from {fmt(ph[0].value)}% to {fmt(ph[ph.length - 1].value)}% ({ph[0].year}–{ph[ph.length - 1].year}) while Finland rose to {fmt(fiColon[fiColon.length - 1]?.value)}%. Nationally, {FACTS.survey.text.charAt(0).toLowerCase() + FACTS.survey.text.slice(1)}. So the gap may be created after the first GP contact (recognising symptoms, referral and diagnostics); measuring time to treatment would show it. <Link href="/county/09" className="text-[var(--accent)] hover:underline">Open Päijät-Häme</Link>
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
      <Section title="Finland overview">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="font-medium">Goal 3 indicators: what can be measured today</h3>
            <table className="mt-2 w-full text-sm">
              <tbody className="divide-y divide-[var(--line)]">
                <tr><td className="py-2 pr-3">Survival at the Nordic level</td><td className="py-2 pr-3 text-[var(--muted)]">Colon 5-year survival: Finland {fmt(nationalValue("surv_colon"))}%, counties {fmt(colon.worst?.[1])}–{fmt(colon.best?.[1])}%</td><td className="py-2 font-medium text-[var(--better)]">Measured</td></tr>
                <tr><td className="py-2 pr-3">Cancer mortality −10%</td><td className="py-2 pr-3 text-[var(--muted)]">About 13,300 deaths a year. Age-standardised by county (SMR, {data.mortality?.years}): {smrHigh.length} counties significantly higher than their age structure predicts ({smrHigh.join(", ")}). Mortality mixes how many people get cancer with how well they are treated, so we count it as a care gap only where survival is also behind</td><td className="py-2 font-medium text-[var(--better)]">Measured</td></tr>
                <tr><td className="py-2 pr-3">Treatment within target times</td><td className="py-2 pr-3 text-[var(--muted)]">Only a national count over the 180-day limit; no county or cancer-type data (action A7)</td><td className="py-2 font-medium text-[var(--worse)]">Not measured</td></tr>
                {nationalSummary().filter((s) => s.insufficient < s.n).map((s) => (
                  <tr key={s.key}><td className="py-2 pr-3">{s.label} {TARGET}% by {HORIZON} (Goal 2)</td><td className="py-2 pr-3 text-[var(--muted)]">At current trends: {s.meets + s.onTrack} of {s.n} counties meet or reach it in time; {s.tooSlow} too slow; {s.away + s.atRisk} falling or moving away</td><td className="py-2 font-medium" style={{ color: s.meets + s.onTrack >= s.n / 2 ? "var(--better)" : "var(--worse)" }}>Projected</td></tr>
                ))}
                {data.demand && (
                  <tr><td className="py-2 pr-3">Demand to {data.demand.to} (planning)</td><td className="py-2 pr-3 text-[var(--muted)]">Ageing alone raises expected cancer deaths by {fmt(data.demand.national.deathsGrowth)}% nationally; fastest in Uusimaa (up to +{fmt(Math.max(...Object.values(data.demand.byCounty).map((x) => x.deathsGrowth)))}%), slowest in the east (from +{fmt(Math.min(...Object.values(data.demand.byCounty).map((x) => x.deathsGrowth)))}%)</td><td className="py-2 font-medium text-[var(--muted)]">Projected</td></tr>
                )}
                <tr><td className="py-2 pr-3">Stage recorded at diagnosis</td><td className="py-2 pr-3 text-[var(--muted)]">42% nationally, Pirkanmaa 72%, target 70% (action A12)</td><td className="py-2 font-medium text-[var(--worse)]">Uneven</td></tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-[var(--muted)]"><SourceBadge href={STRATEGY_URL} label="National Cancer Strategy p. 5" />, <SourceBadge href={FACTS.stage.url} label="Syöpä 2024" /></p>
          </div>
          <div>
            <h3 className="font-medium">Breast screening and share of foreign citizens, by county</h3>
            <Scatter pts={eq.pts} xLabel={`Foreign citizens, % (${eq.yearB})`} yLabel={`Breast screening, % (${eq.yearA})`} excludable={UUSIMAA_HUS} excludeLabel="Exclude Uusimaa and Helsinki" />
            <p className="text-xs text-[var(--muted)]">
              Across all 22 areas the link is strong (r = {eq.r.toFixed(2)}), but it is mostly a capital-region pattern: tick the box to exclude Uusimaa and Helsinki (r = {eqEx.r.toFixed(2)}). Hover a dot for values, click to open the county. The individual-level figures above confirm the gap. {FACTS.screenRegions.text}, which matches this data. <SourceBadge href={FACTS.screenRegions.url} label="Syöpäjärjestöt 2026" />
            </p>
          </div>
        </div>
      </Section>

      <Section title="Where Finland is furthest from the Nordic level: lung cancer">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <div className="space-y-2 text-sm">
            <p>{FACTS.nordic.text}.</p>
            <p>{FACTS.lungWait.text}.</p>
            <p className="text-[var(--muted)]">The strategy's Goal 3 targets Nordic-level survival for poor-prognosis cancers, including +14 points for lung cancer. There is no county-level lung data, so counties with both higher cancer mortality and lower survival get action A13 as the first pathway to check: direct GP access to chest CT for red-flag symptoms, with target times.</p>
            <p className="text-xs text-[var(--muted)]"><SourceBadge href={FACTS.nordic.url} label="IHE 2026 (NORDCAN, Khalife 2025)" />, <SourceBadge href={STRATEGY_URL} label="Strategy p. 5" /></p>
          </div>
          <table className="w-full self-start text-sm">
            <thead><tr className="border-b border-[var(--line)] text-left text-xs text-[var(--muted)]"><th className="py-1">Lung cancer 5-year survival</th><th className="text-right">Finland</th><th className="text-right">Norway</th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">
              <tr><td className="py-2">Men</td><td className="text-right font-medium text-[var(--worse)]">17%</td><td className="text-right">30%</td></tr>
              <tr><td className="py-2">Women</td><td className="text-right font-medium text-[var(--worse)]">29%</td><td className="text-right">37%</td></tr>
              <tr><td className="py-2">Days to primary-care appointment (lung pathway)</td><td className="text-right font-medium text-[var(--worse)]">14</td><td className="text-right">2–7</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

    </div>
  );
}
