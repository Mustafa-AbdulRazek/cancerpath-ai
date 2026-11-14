import Link from "next/link";
import { notFound } from "next/navigation";
import AnalystPanel from "@/components/AnalystPanel";
import ActionCard, { learnFrom } from "@/components/ActionCard";
import Simulator from "@/components/Simulator";
import { Section, SourceBadge, Sparkline } from "@/components/ui";
import { DO_FIRST_RULE, THL_2016_URL } from "@/lib/actions";
import {
  cancersPerYear, countyByCode, counties, data, EXCLUDED, findingsFor, fmt, fmtU, latestYear, nationalSeries, nationalValue, ordinal,
  SCREEN_BAND, series, SERIES_NOTES, SMR_CAVEAT, stageMeta, stageRank, stageScores, STAGES, value,
} from "@/lib/analysis";
import { countySummary } from "@/lib/brief";
import TrajectoryChart from "@/components/TrajectoryChart";
import { HORIZON, MIN_YEARS, reachLabel, screeningTrajectory, STATUS_COLOR, STATUS_LABEL, survivalGapTrend, TARGET, TARGET_KEYS } from "@/lib/projection";

export function generateStaticParams() {
  return counties.map((c) => ({ code: c.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return { title: `${countyByCode[code]?.name ?? "County"} · CancerPath AI` };
}

export default async function CountyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const c = countyByCode[code];
  if (!c) notFound();
  const s = countySummary(code);
  const stages = stageScores(code);
  const findings = findingsFor(code);
  const first = s.first;
  const firstPeer = learnFrom(first);
  const perYear = cancersPerYear(code);

  const programmes = ["screen_cervical", "screen_colorectal", "screen_breast"]
    .map((k) => {
      const f = findings.find((x) => x.key === k)!;
      const band = SCREEN_BAND[k];
      return { key: k, label: f.ind.short, current: f.value ?? 0, best: f.best?.[1] ?? 0, target: 80, source: `THL Sotkanet ${f.ind.id}, ${f.year}`, eligible: data.eligible?.[code]?.[band], bandLabel: data.eligibleMeta?.bands[band].label, intervalYears: data.eligibleMeta?.bands[band].intervalYears, popYear: data.eligibleMeta?.year };
    })
    .sort((a, b) => a.current - b.current);

  const stats = [
    { label: "Population", value: fmt(value("population", code)), sub: String(latestYear("population")) },
    { label: "Foreign citizens", value: `${fmt(value("foreign_pct", code))}%`, sub: `Finland ${fmt(nationalValue("foreign_pct"))}%` },
    { label: "Low-income rate", value: `${fmt(value("low_income", code))}%`, sub: `Finland ${fmt(nationalValue("low_income"))}%` },
    { label: "New cancers a year", value: perYear ? `≈ ${fmt(perYear)}` : "n/a", sub: "estimate from population share" },
  ];

  return (
    <div className="space-y-8">
      <div className="text-sm text-[var(--muted)] print:hidden"><Link href="/" className="hover:underline">Counties</Link> / {c.name}</div>

      <section>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{c.name}</h1>
            <div className="text-sm text-[var(--muted)]">{c.nameFi}</div>
          </div>
          <Link href={`/county/${code}/brief`} className="rounded-[6px] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 print:hidden">Download 1-page brief</Link>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {stats.map((x) => (
            <div key={x.label}>
              <dt className="text-xs text-[var(--muted)]">{x.label}</dt>
              <dd className="text-lg font-semibold">{x.value}</dd>
              <dd className="text-xs text-[var(--muted)]">{x.sub}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 max-w-3xl text-lg leading-snug">{s.message}</p>
      </section>

      <section aria-label="Cancer care pathway">
        <ol className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-stretch">
          {STAGES.map((st, i) => {
            const sc = stages.find((x) => x.stage === st.key)!;
            const isWeak = s.weak?.stage === st.key;
            const r = sc.score != null ? stageRank(code, st.key) : undefined;
            const status = sc.score == null ? "Not measured" : sc.score <= -0.35 ? "Behind" : sc.score < 0.35 ? "On par" : "Ahead";
            return [
              <li key={st.key} className={`rounded-[6px] border bg-white p-3 ${isWeak ? "border-[var(--worse)] ring-1 ring-[var(--worse)]" : "border-[var(--line)]"} ${sc.score == null ? "border-dashed" : ""}`}>
                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: st.color }}>
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: st.color }} />
                  {st.label}
                </div>
                <div className={`mt-1 text-lg font-semibold ${isWeak ? "text-[var(--worse)]" : ""}`}>{status}</div>
                <div className="text-xs text-[var(--muted)]">
                  {sc.score == null
                    ? st.key === "treatment" ? "No public data by county" : "Data missing or incomplete"
                    : r?.rank ? `Step overall: ${ordinal(r.rank)} of ${r.of}` : ""}
                </div>
                {isWeak && <div className="mt-1 text-xs font-medium text-[var(--worse)]">The gap emerges here</div>}
                {st.key === "referral" && sc.score != null && <div className="mt-1 text-[11px] text-[var(--muted)]">All-specialty queue, used as a proxy</div>}
              </li>,
              i < STAGES.length - 1 ? <li key={st.key + "-arrow"} aria-hidden className="hidden self-center text-[var(--muted)] md:block">→</li> : null,
            ];
          })}
        </ol>
      </section>

      <section className="rounded-[6px] border border-[var(--accent)] bg-[var(--accent-soft)] p-5">
        <div className="text-sm font-medium text-[var(--accent)]">Do this first</div>
        <h2 className="mt-1 text-xl font-semibold">{first.title}</h2>
        <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          <div><span className="font-medium">Owner:</span> {first.owner}</div>
          <div><span className="font-medium">KPI:</span> {first.kpi}</div>
          {first.impact && <div className="sm:col-span-2"><span className="font-medium">Reach:</span> ≈ {first.impact.perRound.toLocaleString("en-GB")} more people screened per round</div>}
          {firstPeer && <div className="sm:col-span-2"><span className="font-medium">{firstPeer.label ?? "Learn from"}:</span> {firstPeer.text}</div>}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">{DO_FIRST_RULE}</p>
      </section>

      <Section title={`90-day plan for ${c.name}`} aside={<Link href="/actions" className="text-sm text-[var(--accent)] hover:underline print:hidden">All actions</Link>}>
        <div className="rounded-[6px] border border-[var(--line)] bg-white px-4">
          {s.plan.map((a, i) => <ActionCard key={a.id} a={a} rankNo={i + 1} />)}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">Ranked by gap size, distance to target and people reached. Open an action to see the 90-day steps, resources and evidence.</p>
      </Section>

      <Section title={`Looking ahead to ${HORIZON}`} aside={<span className="text-xs text-[var(--muted)]">Projection = recent linear trend with a 95% band, not a forecast</span>}>
        <div className="grid gap-6 md:grid-cols-3">
          {TARGET_KEYS.map((k) => {
            const tr = screeningTrajectory(k, code);
            const f = findings.find((x) => x.key === k)!;
            if (!tr) return null;
            const col = STATUS_COLOR[tr.status];
            return (
              <div key={k}>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-medium">{f.ind.short}</h3>
                  <span className="text-xs font-medium" style={{ color: tr.status === "insufficient" ? "var(--muted)" : col }}>{STATUS_LABEL[tr.status]}</span>
                </div>
                <TrajectoryChart history={series(k, code)} projection={tr.status === "insufficient" ? undefined : tr.projection} national={nationalSeries(k)} color={tr.status === "insufficient" ? "#6b7280" : col} />
                <p className="text-xs text-[var(--muted)]">
                  {tr.status === "insufficient" && `Only ${tr.trend.n} years of data (fewer than ${MIN_YEARS}); the programme is still being rolled out, so we do not project it.`}
                  {tr.status === "meets" && `${tr.last.value}% in ${tr.last.year}; at the current trend it stays above ${TARGET}% to ${HORIZON}.`}
                  {tr.status === "at-risk" && `${tr.last.value}% in ${tr.last.year}, but falling: at the current trend ≈ ${fmt(tr.at2035)}% by ${HORIZON}.`}
                  {tr.status === "on-track" && `${tr.last.value}% in ${tr.last.year}; at the current trend it reaches ${TARGET}% ${reachLabel(tr.reachYear)}.`}
                  {tr.status === "too-slow" && `${tr.last.value}% in ${tr.last.year}; at the current trend it reaches ${TARGET}% ${reachLabel(tr.reachYear)}, after the ${HORIZON} target.`}
                  {tr.status === "moving-away" && `${tr.last.value}% in ${tr.last.year} and not rising: at the current trend ≈ ${fmt(tr.at2035)}% by ${HORIZON}.`}
                  {" "}Dashed grey: Finland.
                </p>
              </div>
            );
          })}
        </div>
        {data.demand?.byCounty[code] && (
          <p className="mt-4 text-sm">
            <span className="font-medium">Demand from ageing:</span> by {data.demand.to}, the population aged 70+ grows by {fmt(data.demand.byCounty[code].pop70Growth)}% and expected cancer deaths by about {fmt(data.demand.byCounty[code].deathsGrowth)}% from ageing alone (Finland {fmt(data.demand.national.deathsGrowth)}%). Plan diagnostic, treatment and navigator capacity for this. <span className="text-xs text-[var(--muted)]">Statistics Finland population projection 2024 × today&apos;s age-specific cancer death rates; assumes those rates stay constant.</span>
          </p>
        )}
        {(() => {
          const g = survivalGapTrend("surv_colon", code);
          if (!g || Math.abs(g.slope) < 0.3) return null;
          return (
            <p className="mt-4 text-sm">
              <span className="font-medium">Colon cancer survival gap to Finland:</span> {g.last.value > 0 ? "+" : ""}{fmt(g.last.value)} points in {g.last.year}, {g.slope < 0 ? "widening" : "narrowing"} by about {fmt(Math.abs(g.slope))} points a year since {g.from}. {g.slope < 0 && g.last.value < 0 ? "If nothing changes, the gap keeps growing towards 2035." : ""}
            </p>
          );
        })()}
      </Section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Brief for the county board</h2>
          <p className="mb-3 text-sm text-[var(--muted)]">Gemini writes it from this page&apos;s data only, in English or Finnish, citing a source for every claim. Each number is checked against the source it cites.</p>
          <AnalystPanel county={code} countyName={c.name} />
        </div>
        <div className="print:hidden">
          <h2 className="text-lg font-semibold">What if screening reached 80%?</h2>
          <p className="mb-3 text-sm text-[var(--muted)]">The strategy target is 80% participation in every county.</p>
          <Simulator programmes={programmes} countyName={c.short} />
        </div>
      </section>

      <details className="border-t border-[var(--line)] pt-5">
        <summary className="cursor-pointer text-lg font-semibold">Show all indicators and sources</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs text-[var(--muted)]">
                <th className="py-2">Step</th><th>Indicator</th><th className="text-right">{c.short}</th><th className="text-right">Finland</th><th className="text-right">Best</th><th className="text-center">Position</th><th>Trend (dashed: Finland)</th><th>Signal</th><th>Source</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f) => {
                const st = stageMeta(f.ind.stage as never);
                return (
                  <tr key={f.key} className="border-b border-[var(--line)] align-middle">
                    <td className="py-2 text-xs" style={{ color: st.color }}>{st.label}</td>
                    <td className="max-w-[220px]"><div>{f.ind.short}</div><div className="text-xs text-[var(--muted)]">{f.ind.unit}, {f.year}{f.ind.better === "lower" ? ", lower is better" : ""}</div></td>
                    <td className="text-right font-medium">{fmt(f.value)}{f.belowTarget && <div className="text-[10px] text-[var(--worse)]">below 80% target</div>}</td>
                    <td className="text-right">{fmt(f.national)}</td>
                    <td className="text-right text-[var(--muted)]">{fmt(f.best?.[1])}<div className="text-[10px]">{f.best ? countyByCode[f.best[0]]?.short : ""}</div></td>
                    <td className="text-center">{f.rank ? `${ordinal(f.rank)} of ${f.of}` : "—"}</td>
                    <td><Sparkline a={series(f.key, code)} b={nationalSeries(f.key)} better={f.ind.better} /></td>
                    <td className="text-xs text-[var(--muted)]">
                      {f.value == null ? (EXCLUDED[f.key]?.[code] ? "Excluded: incomplete HUS reporting" : "No data") :
                        f.ind.noisy ? "Small numbers" :
                        f.smallDiff ? "Within normal variation" :
                        f.burdenOnly ? <span title={SMR_CAVEAT}>Higher burden; survival on par, so not counted as a care gap</span> :
                        f.signal === "strong" ? <span className="text-[var(--worse)]">Lasting gap ({f.persistence.worstQ} of {f.persistence.years} years in bottom quarter)</span> :
                        f.signal === "moderate" ? "Possible gap" : "—"}
                      {f.earlyWarning && <div className="text-[var(--worse)]">Worsening</div>}
                      {f.key === "smr" && data.mortality?.byCounty[code] && <div>95% CI {fmt(data.mortality.byCounty[code].lo * 100)}–{fmt(data.mortality.byCounty[code].hi * 100)} · mixes incidence and care</div>}
                    </td>
                    <td><SourceBadge href={f.ind.url} label={`Sotkanet ${f.ind.id}`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          GP waiting: {SERIES_NOTES.phc_wait7} Specialist waiting: {SERIES_NOTES.spec_wait6m} Survival is age-standardised 5-year relative survival (period method); confidence intervals are not published, so small differences are not scored. <SourceBadge href={THL_2016_URL} label="THL 21/2016" />
        </p>
      </details>
    </div>
  );
}
