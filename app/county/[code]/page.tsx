import Link from "next/link";
import { notFound } from "next/navigation";
import AnalystPanel from "@/components/AnalystPanel";
import ActionCard from "@/components/ActionCard";
import FinlandMap from "@/components/FinlandMap";
import Simulator from "@/components/Simulator";
import { Card, Chip, SourceBadge, Sparkline } from "@/components/ui";
import { actionsFor, THL_2016_URL } from "@/lib/actions";
import {
  EXCLUDED, SCREEN_BAND, SERIES_NOTES, countyByCode, counties, data, findingsFor, fmt, fmtU, nationalSeries, nationalValue, rank, series, stageMeta, stageScores, STAGES, value, weakestStage, latestYear,
} from "@/lib/analysis";

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
  const stages = stageScores(code);
  const weak = weakestStage(code);
  const findings = findingsFor(code);
  const actions = actionsFor(code, 5);
  const weakClear = weak && weak.score < -0.35;

  const programmes = ["screen_cervical", "screen_colorectal", "screen_breast"]
    .map((k) => {
      const f = findings.find((x) => x.key === k)!;
      const band = SCREEN_BAND[k];
      return { key: k, label: f.ind.short, current: f.value ?? 0, best: f.best?.[1] ?? 0, target: 80, source: `THL Sotkanet ${f.ind.id}, ${f.year}`, eligible: data.eligible?.[code]?.[band], bandLabel: data.eligibleMeta?.bands[band].label, intervalYears: data.eligibleMeta?.bands[band].intervalYears };
    })
    .sort((a, b) => a.current - b.current);

  const strongest = findings.filter((f) => f.z != null && f.z <= -0.5 && !f.ind.noisy).sort((a, b) => a.z! - b.z!);
  const msg = weakClear
    ? `${c.name}'s pathway falls furthest behind at the ${stageMeta(weak!.stage).label.toLowerCase()} stage${strongest[0] ? `, led by ${strongest[0].ind.short.toLowerCase()} (${fmtU(strongest[0].value, strongest[0].ind.unit)} vs Finland ${fmt(strongest[0].national)})` : ""}.`
    : `${c.name} has no pathway stage clearly behind other counties on the public indicators. The priority is to start measuring time to treatment.`;
  const det = stages.find((s) => s.stage === "detection")?.score;
  const downstream = weakClear && weak!.stage === "outcome" && det != null && det >= -0.2
    ? " Detection measures are on par or better, so the gap is likely created downstream, in diagnosis and treatment: the stage that is not publicly measured. Start with action A7."
    : "";
  const mapDatum = Object.fromEntries(counties.map((x) => [x.code, { code: x.code, name: x.name, fill: x.code === code ? "#0369a1" : "#e2e8f0", label: x.code === code ? "Selected" : "Open county" }]));

  return (
    <div className="space-y-6">
      <div className="text-sm text-slate-500 print:hidden"><Link href="/" className="hover:underline">Finland</Link> / {c.name}</div>
      <section className="grid gap-6 lg:grid-cols-[1fr_200px]">
        <div>
          <h1 className="text-3xl font-bold">{c.name}</h1>
          <div className="text-sm text-slate-500">{c.nameFi} · wellbeing services area {c.code} · population {fmt(value("population", code))} ({latestYear("population")}) · foreign citizens {fmt(value("foreign_pct", code))}% (FI {fmt(nationalValue("foreign_pct"))}%) · low-income rate {fmt(value("low_income", code))}% (FI {fmt(nationalValue("low_income"))}%)</div>
          <div className="mt-3 rounded-xl border-l-4 border-sky-700 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">Key message</div>
            <p className="mt-1 text-lg font-medium leading-snug">{msg}{downstream}</p>
          </div>
        </div>
        <div className="hidden lg:block print:hidden"><FinlandMap geo={data.geo} datum={mapDatum} selected={code} height={300} /></div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Cancer care pathway: where the gap emerges</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {STAGES.map((s, i) => {
            const sc = stages.find((x) => x.stage === s.key)!;
            const isWeak = weakClear && weak!.stage === s.key;
            const status = sc.score == null ? "No public data" : sc.score <= -0.75 ? "Clearly behind" : sc.score <= -0.35 ? "Behind" : sc.score < 0.35 ? "On par" : "Ahead";
            const col = sc.score == null ? "#7c3aed" : sc.score <= -0.35 ? "#dc2626" : sc.score < 0.35 ? "#64748b" : "#0f766e";
            return (
              <div key={s.key} className={`relative rounded-xl border bg-white p-4 shadow-sm ${isWeak ? "border-red-400 ring-2 ring-red-200" : "border-slate-200"} ${sc.score == null ? "border-dashed border-violet-300 bg-violet-50" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: s.color }}>{i + 1}</span>
                  <span className="font-semibold">{s.label}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{s.question}</div>
                <div className="mt-3 text-xl font-bold" style={{ color: col }}>{status}</div>
                <div className="text-xs text-slate-500">
                  {sc.score == null ? (s.key === "treatment" ? "Referral → treatment times are not in national open data." : "No county data for this stage.") : `Stage score ${sc.score.toFixed(2)} SD vs county average`}
                </div>
                {s.key === "treatment" && <div className="mt-2"><SourceBadge href={THL_2016_URL} label="Measure with THL 21/2016 → A7" /></div>}
                {s.key === "referral" && sc.score != null && <div className="mt-1 text-[11px] text-slate-400">Proxy: all-specialty queue, not cancer-specific</div>}
                {isWeak && <div className="absolute -top-2 right-3 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Gap emerges here</div>}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <Card>
          <h2 className="text-lg font-bold">Evidence: every indicator, every source</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2">Stage</th><th>Indicator</th><th className="text-right">{c.short}</th><th className="text-right">Finland</th><th className="text-right">Best county</th><th className="text-center">Rank</th><th>Trend (— Finland)</th><th>Signal</th><th>Source</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => {
                  const st = stageMeta(f.ind.stage as never);
                  return (
                    <tr key={f.key} className="border-b border-slate-100 align-middle">
                      <td className="py-2"><Chip color={st.color}>{st.label}</Chip></td>
                      <td className="max-w-[230px]">
                        <div className="font-medium">{f.ind.short}</div>
                        <div className="text-xs text-slate-500">{f.ind.unit} · {f.year}{f.ind.better === "lower" ? " · lower is better" : ""}</div>
                      </td>
                      <td className="text-right font-semibold">{fmt(f.value)}{f.belowTarget && <div className="text-[10px] font-semibold text-red-600">below 80% target</div>}</td>
                      <td className="text-right">{fmt(f.national)}</td>
                      <td className="text-right text-slate-600">{fmt(f.best?.[1])}<div className="text-[10px] text-slate-400">{f.best ? countyByCode[f.best[0]]?.short : ""}</div></td>
                      <td className="text-center">{f.rank ? `${f.rank}/${f.of}` : "—"}</td>
                      <td><Sparkline a={series(f.key, code)} b={nationalSeries(f.key)} better={f.ind.better} /></td>
                      <td className="text-xs">
                        {f.value == null ? <span className="text-slate-400">{EXCLUDED[f.key]?.[code] ? <span className="text-amber-700">excluded: incomplete HUS reporting</span> : "no data"}</span> :
                          f.signal === "strong" ? <span className="font-semibold text-red-700">Robust gap<br /><span className="font-normal text-slate-500">worst quartile {f.persistence.worstQ}/{f.persistence.years} yrs</span></span> :
                          f.signal === "moderate" ? <span className="font-semibold text-amber-700">Possible gap<br /><span className="font-normal text-slate-500">worst quartile {f.persistence.worstQ}/{f.persistence.years} yrs</span></span> :
                          <span className="text-slate-500">—</span>}
                        {f.earlyWarning && <div className="font-semibold text-red-700">⚠ worsening fast</div>}
                        {f.ind.noisy && <div className="text-slate-400">small numbers</div>}
                        {f.smallDiff && <div className="text-slate-400">within ±2 pp of Finland</div>}
                      </td>
                      <td><SourceBadge href={f.ind.url} label={`Sotkanet ${f.ind.id}`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            &quot;Robust gap&quot; = at least 1 SD below the county average and in the worst quartile in ≥ 3 of the last 5 years. Survival = age-standardised 5-year relative survival (Finnish Cancer Registry, period method). Specialist waiting data is missing or incomplete for the HUS area (Helsinki excluded: it reports ~0 every year with gaps). {SERIES_NOTES.spec_wait6m}
          </p>
        </Card>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">90-day action plan for {c.name} (ranked by gap size and people reached)</h2>
          <Link href="/actions" className="text-sm text-sky-700 hover:underline print:hidden">Full action library →</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {actions.map((a, i) => <ActionCard key={a.id} a={a} rankNo={i + 1} />)}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold">AI analyst · 2-minute brief</h2>
          <p className="mb-3 text-sm text-slate-500">Gemini writes from this page&apos;s data only. Every claim is cited, and every number is checked against the source data automatically.</p>
          <AnalystPanel county={code} countyName={c.name} />
        </Card>
        <Card className="print:hidden">
          <h2 className="text-lg font-bold">What-if: screening participation</h2>
          <p className="mb-3 text-sm text-slate-500">Strategy Goal 2 target: 80% participation in every county.</p>
          <Simulator programmes={programmes} countyName={c.short} />
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
            <div className="font-semibold">Compared with the best county</div>
            <ul className="mt-1 space-y-0.5 text-slate-700">
              {["surv_colon", "surv_breast"].map((k) => {
                const v = value(k, code), r = rank(k, code);
                return <li key={k}>{findings.find((f) => f.key === k)!.ind.short}: {fmt(v)}% here vs {fmt(r.best?.[1])}% in {r.best ? countyByCode[r.best[0]].short : ""} · Finland {fmt(nationalValue(k))}%</li>;
              })}
            </ul>
          </div>
        </Card>
      </section>
    </div>
  );
}
