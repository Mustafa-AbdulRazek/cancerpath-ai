import Link from "next/link";
import MapExplorer, { MapMode } from "@/components/MapExplorer";
import { Card, Chip, SourceBadge, Sparkline } from "@/components/ui";
import {
  counties, countyByCode, data, findingsFor, fmt, fmtU, indicatorByKey, latestYear, nationalValue, overallScore, rank, series,
  scoredIndicators, stageMeta, STAGES, value, weakestStage, zScore,
} from "@/lib/analysis";
import { STRATEGY_URL, THL_2016_URL } from "@/lib/actions";
import Scatter from "@/components/Scatter";
import { countyCorrelation, EQUITY_PAIRS } from "@/lib/analysis";

const zColor = (z?: number) => (z == null ? "#f1f5f9" : z <= -1 ? "#dc2626" : z <= -0.5 ? "#fca5a5" : z < 0.5 ? "#e2e8f0" : z < 1 ? "#5eead4" : "#0f766e");

function headline() {
  // The paradox: county with the best GP access vs its colon cancer survival
  const yG = latestYear("phc_wait7"), yS = latestYear("surv_colon");
  const gpRank = Object.entries(data.values.phc_wait7).map(([c, s]) => [c, s[yG]] as const).filter(([, v]) => v != null).sort((a, b) => a[1] - b[1]);
  const bestGp = gpRank[0], worstGp = gpRank[gpRank.length - 1];
  const pCode = bestGp[0];
  const pSurv = series("surv_colon", pCode);
  const pRank = rank("surv_colon", pCode, yS);
  const wSurv = value("surv_colon", worstGp[0], yS);
  const wRank = rank("surv_colon", worstGp[0], yS);
  // Referral congestion
  const yW = latestYear("spec_wait6m");
  const w = rank("spec_wait6m", "14", yW);
  const scr = ["screen_cervical", "screen_colorectal", "screen_breast"].map((k) => {
    const y = latestYear(k);
    const below = counties.filter((c) => (value(k, c.code, y) ?? 100) < 80).length;
    return { k, y, below, n: counties.length, nat: nationalValue(k, y) };
  });
  const eq = countyCorrelation("screen_breast", "foreign_pct");
  return { yG, yS, bestGp, worstGp, pCode, pSurv, pRank, wSurv, wRank, yW, worstW: w.worst, natW: nationalValue("spec_wait6m", yW), scr, eq };
}

export default function Home() {
  const h = headline();
  const ranked = counties.map((c) => ({ c, score: overallScore(c.code), weak: weakestStage(c.code) })).sort((a, b) => a.score - b.score);
  const noReferral = new Set(counties.filter((c) => value("spec_wait6m", c.code) == null).map((c) => c.code));

  const modes: MapMode[] = [
    {
      key: "weakest",
      label: "Where the pathway falls furthest behind (weakest stage)",
      legend: [...STAGES.filter((s) => s.key !== "treatment").map((s) => ({ color: s.color, label: s.label })), { color: "#cbd5e1", label: "No clear gap" }, { color: "url(#hatch)", label: "Referral stage not measurable" }],
      note: "Stage score = mean direction-adjusted z-score of the stage's indicators vs other counties. Hatched = specialist-waiting data missing or incomplete (HUS area), so the weakest stage is chosen from fewer stages.",
      datum: Object.fromEntries(
        counties.map((c) => {
          const w = weakestStage(c.code);
          const clear = w && w.score < -0.35;
          return [c.code, { code: c.code, name: c.name, hatch: noReferral.has(c.code), fill: clear ? stageMeta(w!.stage).color : "#cbd5e1", label: clear ? `Weakest measured stage: ${stageMeta(w!.stage).label}` : "No clear gap vs other counties", sub: noReferral.has(c.code) ? "Referral stage not measurable (incomplete data)" : w ? `stage score ${w.score.toFixed(2)}` : undefined }];
        })
      ),
    },
    ...scoredIndicators.map((ind) => {
      const y = latestYear(ind.key);
      return {
        key: ind.key,
        label: `${ind.short} (${y})`,
        legend: [
          { color: "#dc2626", label: "Much worse" }, { color: "#fca5a5", label: "Worse" }, { color: "#e2e8f0", label: "Average" },
          { color: "#5eead4", label: "Better" }, { color: "#0f766e", label: "Much better" }, { color: "url(#hatch)", label: "No / incomplete data" },
        ],
        note: `${ind.label}. Finland ${fmt(nationalValue(ind.key, y))} ${ind.unit}. Source: THL Sotkanet ${ind.id}.`,
        datum: Object.fromEntries(
          counties.map((c) => {
            const v = value(ind.key, c.code, y);
            return [c.code, { code: c.code, name: c.name, hatch: v == null, fill: zColor(zScore(ind.key, c.code, y)), label: `${ind.short}: ${v == null ? "no / incomplete data" : fmtU(v, ind.unit)}`, sub: `Finland ${fmt(nationalValue(ind.key, y))}` }];
          })
        ),
      } as MapMode;
    }),
  ];

  const wInd = indicatorByKey["spec_wait6m"], sInd = indicatorByKey["surv_colon"], gInd = indicatorByKey["phc_wait7"];
  const pName = countyByCode[h.pCode].name;
  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">National Cancer Strategy 2026–2035 · Goal 3: equal and effective cancer care</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight md:text-4xl">Where does each Finnish county lose ground on the cancer pathway, and what should it do on Monday?</h1>
          <p className="mt-3 text-slate-600">
            Goal 3 means <b>equal outcomes</b>. CancerPath AI starts from unequal cancer survival and traces it back to the pathway step where the gap is likely created (detection, referral, diagnosis → treatment). It then turns that gap into a 90-day action plan linked to the national implementation roadmap, for all 22 wellbeing services areas.
          </p>
        </div>
        <Card className="border-violet-200 bg-violet-50">
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">The blind spot</div>
          <div className="mt-1 text-lg font-bold">Time from referral to treatment is not in national open data for any county</div>
          <p className="mt-1 text-sm text-slate-700">
            Goal 3 requires that &quot;patients get treatment within target times&quot;. THL defined how to measure this in 2016, yet the strategy notes monitoring is still not systematic or national, and stage at diagnosis is recorded for only ~40% of cancers.
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <SourceBadge href={STRATEGY_URL} label="Strategy p.5, p.30" />
            <SourceBadge href={THL_2016_URL} label="THL 21/2016" />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-teal-200 md:col-span-1">
          <Chip color={stageMeta("outcome").color}>Outcome → look downstream</Chip>
          <div className="mt-2 text-lg font-bold leading-snug">
            {pName} has Finland&apos;s fastest GP access, and its lowest colon cancer survival
          </div>
          <div className="mt-2 flex items-center gap-3">
            <Sparkline a={h.pSurv} better="higher" width={140} height={40} />
            <div className="text-sm">
              <div><b>{fmt(h.pSurv[0]?.value)}% → {fmt(h.pSurv[h.pSurv.length - 1]?.value)}%</b> colon 5-yr survival</div>
              <div className="text-slate-500">{h.pSurv[0]?.year}–{h.pSurv[h.pSurv.length - 1]?.year} · rank {h.pRank.rank}/{h.pRank.of} · GP waits &gt; 7 d: {fmt(h.bestGp[1])}% (rank 1)</div>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Meanwhile {countyByCode[h.worstGp[0]].name} has the slowest GP access ({fmt(h.worstGp[1])}%) but colon survival of {fmt(h.wSurv)}% (rank {h.wRank.rank}). GP access alone does not explain survival, so the question moves <b>downstream</b>: diagnostics and treatment, the stage nobody measures.
          </p>
          <p className="mt-1 text-xs text-amber-700">Caveat: survival is a period estimate over overlapping windows (patients diagnosed up to 10 years earlier). Read it as a sustained decline to explain, not as proof of cause.</p>
          <div className="mt-2 flex gap-1"><SourceBadge href={sInd.url} label={`Sotkanet ${sInd.id}`} /><SourceBadge href={gInd.url} label={`Sotkanet ${gInd.id}`} /><Link href={`/county/${h.pCode}`} className="text-xs font-semibold text-sky-700 hover:underline">Open {countyByCode[h.pCode].short} →</Link></div>
        </Card>
        <Card>
          <Chip color={stageMeta("detection").color}>Equity: who is missed</Chip>
          <div className="mt-2 text-3xl font-bold">r = {h.eq.r.toFixed(2)}</div>
          <div className="text-sm text-slate-600">
            Breast screening participation vs share of foreign citizens across {h.eq.n} areas. The screening gap sits in diverse urban areas. Colorectal screening is below the 80% target in {h.scr[1].below}/{h.scr[1].n} areas and cervical in {h.scr[0].below}/{h.scr[0].n}.
          </div>
          <p className="mt-1 text-xs text-slate-500">Ecological (county-level) correlation: a signal to investigate, not an individual-level cause.</p>
          <div className="mt-2 flex gap-1"><SourceBadge href={indicatorByKey.screen_breast.url} label="Sotkanet 3621" /><SourceBadge href={indicatorByKey.foreign_pct.url} label="Sotkanet 3074" /></div>
        </Card>
        <Card>
          <Chip color={stageMeta("referral").color}>Referral congestion</Chip>
          <div className="mt-2 text-3xl font-bold">{fmt(h.worstW?.[1])} vs {fmt(h.natW)}</div>
          <div className="text-sm text-slate-600">
            people per 10,000 waited over 6 months for specialist care ({h.yW}): {h.worstW ? countyByCode[h.worstW[0]]?.name : ""} vs Finland. An all-specialty proxy for congestion: a cancer suspicion must not join this queue.
          </div>
          <p className="mt-1 text-xs text-amber-700">HUS-area data is missing or incomplete (Helsinki excluded). Jumps around 2022 may partly reflect recording changes.</p>
          <div className="mt-2"><SourceBadge href={wInd.url} label={`Sotkanet ${wInd.id}`} /></div>
        </Card>
      </section>

      <section>
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">Equity lens: who is being missed?</h2>
            <span className="text-xs text-slate-500">Ecological county-level correlations (n = 22): signals to investigate, not individual-level causes</span>
          </div>
          <div className="mt-3 grid gap-6 md:grid-cols-[1fr_380px]">
            <div className="space-y-3">
              {EQUITY_PAIRS.map((e) => {
                const c = countyCorrelation(e.a, e.b);
                return (
                  <div key={e.a + e.b} className="rounded-lg bg-slate-50 p-3">
                    <div className="text-sm font-semibold">{e.text}</div>
                    <div className="text-sm text-slate-600">Correlation r = <b>{c.r.toFixed(2)}</b> across {c.n} areas ({indicatorByKey[e.a].short} {c.yearA} vs {indicatorByKey[e.b].short} {c.yearB}).</div>
                    <div className="mt-1 flex gap-1"><SourceBadge href={indicatorByKey[e.a].url} label={`Sotkanet ${indicatorByKey[e.a].id}`} /><SourceBadge href={indicatorByKey[e.b].url} label={`Sotkanet ${indicatorByKey[e.b].id}`} /></div>
                  </div>
                );
              })}
              <p className="text-sm text-slate-700"><b>So what:</b> the screening gap is concentrated in diverse urban areas (Helsinki, Vantaa–Kerava, West Uusimaa). Multilingual invitations, community outreach and easy rebooking (actions A2, A3) target exactly this group. The strategy's equality goal asks for regional <i>and</i> socioeconomic differences to steer services.</p>
            </div>
            <div>
              {(() => { const c = countyCorrelation("screen_breast", "foreign_pct"); return <Scatter pts={c.pts} xLabel={`Foreign citizens, % (${c.yearB})`} yLabel={`Breast screening, % (${c.yearA})`} />; })()}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card>
          <MapExplorer geo={data.geo} modes={modes} />
        </Card>
        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-bold">Counties ranked by overall pathway gap</h2>
            <span className="text-xs text-slate-500">most behind first</span>
          </div>
          <div className="divide-y divide-slate-100">
            {ranked.map(({ c, score, weak }, i) => {
              const top = findingsFor(c.code).filter((f) => f.z != null && !f.ind.noisy).sort((a, b) => a.z! - b.z!)[0];
              return (
                <Link key={c.code} href={`/county/${c.code}`} className="flex items-center gap-3 py-2 hover:bg-slate-50">
                  <span className="w-6 text-right text-sm text-slate-400">{i + 1}</span>
                  <span className="w-44 font-medium">{c.name}</span>
                  <span className="w-40">{weak && weak.score < -0.35 ? <Chip color={stageMeta(weak.stage).color}>{stageMeta(weak.stage).label}</Chip> : <span className="text-xs text-slate-400">no clear gap</span>}</span>
                  <span className="hidden flex-1 text-sm text-slate-600 md:block">
                    {top && top.z! < -0.5 ? `${top.ind.short}: ${fmtU(top.value, top.ind.unit)} (FI ${fmt(top.national)})` : "—"}
                  </span>
                  <span className="w-20 text-right">
                    <span className="inline-block h-2 rounded-full" style={{ width: `${Math.min(64, Math.max(4, -score * 40 + 20))}px`, background: score < -0.3 ? "#dc2626" : score < 0.2 ? "#94a3b8" : "#0f766e" }} />
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>
      </section>


      <section>
        <Card>
          <h2 className="text-lg font-bold">Goal 3 tracker: what Finland can and cannot monitor today</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-sm font-semibold">Survival at the Nordic level</div>
              <div className="text-sm text-slate-600">Colon cancer 5-year survival: Finland {fmt(nationalValue("surv_colon"))}%, counties range {fmt(rank("surv_colon", "90").worst?.[1])}–{fmt(rank("surv_colon", "90").best?.[1])}% ({latestYear("surv_colon")}).</div>
              <div className="mt-1 text-xs font-semibold text-emerald-700">✓ Measurable by county (Cancer Registry via Sotkanet)</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-sm font-semibold">Cancer mortality −10%</div>
              <div className="text-sm text-slate-600">Currently about 13,300 cancer deaths per year (strategy p.5). County-level mortality is not in the open indicator API.</div>
              <div className="mt-1 text-xs font-semibold text-amber-700">◐ National only in our sources</div>
            </div>
            <div className="rounded-lg bg-violet-50 p-3">
              <div className="text-sm font-semibold">Treatment within target times</div>
              <div className="text-sm text-slate-600">Defined by THL 21/2016, but not in national open data by county. CancerPath action A7 shows how a county can start measuring it in 90 days with its own data.</div>
              <div className="mt-1 text-xs font-semibold text-violet-700">✗ Not measurable from open data: the biggest data gap</div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
