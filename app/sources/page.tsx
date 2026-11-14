import { Card, SourceBadge } from "@/components/ui";
import { data, indicators, nationalValue, latestYear, fmt } from "@/lib/analysis";
import { DOC_FACTS } from "@/lib/context";
import { FACTS } from "@/lib/facts";

export const metadata = { title: "Sources & method · CancerPath AI" };

export default function SourcesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sources, method and limitations</h1>
        <p className="mt-1 max-w-3xl text-slate-600">Every number in CancerPath AI comes from the sources below. The dataset is rebuilt with one command (<code className="rounded bg-slate-100 px-1">npm run data</code>) from the THL Sotkanet REST API. Last build: {new Date(data.generatedAt).toLocaleString("en-GB")}.</p>
      </div>

      <Card>
        <h2 className="text-lg font-bold">Indicators (THL Sotkanet open data, CC BY 4.0)</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="py-2">ID</th><th>Indicator (official Finnish title)</th><th>Pathway stage</th><th>Producer</th><th>Latest · Finland</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {indicators.map((i) => (
                <tr key={i.key} className="border-b border-slate-100">
                  <td className="py-2 font-mono text-xs">{i.id}{i.gender !== "total" ? ` (${i.gender})` : ""}</td>
                  <td className="max-w-md"><div className="font-medium">{i.label}</div><div className="text-xs text-slate-500">{i.titleFi}</div></td>
                  <td className="capitalize">{i.stage}</td>
                  <td className="text-xs">{i.organization}</td>
                  <td className="text-xs">{latestYear(i.key)} · {fmt(nationalValue(i.key))}</td>
                  <td className="text-xs">{i.dataUpdated}</td>
                  <td><SourceBadge href={i.url} label="metadata" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold">Strategy documents used by the AI analyst</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {DOC_FACTS.map((d) => (
            <li key={d.id}><span className="mr-2 rounded bg-sky-100 px-1 font-semibold text-sky-800">{d.id}</span>{d.text} <SourceBadge href={d.source.url} label={d.source.label} /></li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold">Method</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Each indicator is mapped to one pathway stage: <b>detection</b> (screening participation, GP access), <b>referral</b> (specialist-care waiting), <b>diagnosis → treatment</b> (no public data), <b>outcome</b> (5-year relative survival).</li>
            <li>For every county we compute a direction-adjusted z-score against the other counties (negative = behind). A stage score is the mean z of its indicators. The <b>weakest stage</b> is where the county falls furthest behind.</li>
            <li><b>Robust gap</b>: z ≤ −1 and in the worst quartile in ≥ 3 of the last 5 years. This avoids over-reading one noisy year.</li>
            <li><b>Early warning</b>: the indicator worsened by ≥ 5 percentage points (or ≥ 15 per 10,000 for waiting) over the last 3 years.</li>
            <li>Actions are triggered by gaps in their linked indicators and ranked by gap size, target shortfall and trend.</li>
            <li>The AI analyst (Google Gemini) gets only the cited facts. A post-check flags any number that does not appear in the source data. If the AI is unavailable, a rule-based brief is shown.</li>
          </ul>
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Limitations (read before acting)</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li><b>No time-to-treatment data in national open data</b> by county (some areas may track it internally). The Goal 3 indicator &quot;treatment within target times&quot; cannot be monitored from open data; action A7 addresses this.</li>
            <li>Stage at diagnosis is recorded for only about 40% of cases (strategy p.30), so we cannot test the &quot;70% at stage I–II&quot; target by county.</li>
            <li>Specialist-care waiting (Sotkanet 3336) covers <b>all</b> specialties, not only cancer, and is missing for the four HUS-area Uusimaa counties.</li>
            <li>GP waiting (6411) measures non-urgent visits. Urgent cancer suspicions should bypass this queue, so it is a proxy for access, not cancer-specific delay. <b>Its trend is also affected by legal changes</b>: the care-guarantee limit was 14 days from Sept 2023, the planned 7-day limit was cancelled, and a relaxation to three months was proposed from 2025 (HE 134/2024).</li>
            <li>Survival figures are age-standardised period estimates over several years. Differences within ±2 percentage points of Finland are labelled as small and never scored as a robust gap. Small counties (e.g. Kainuu) have wider uncertainty; cervical cancer survival is flagged as noisy and excluded from scoring.</li>
            <li>Associations between indicators are not causal. Our gap findings are hypotheses for the county to verify with its own data.</li>
            <li>County-level cancer mortality is not available in the open indicator API, so the &quot;mortality −10%&quot; target is tracked nationally only.</li>
          </ul>
        </Card>
      </div>
      <Card>
        <h2 className="text-lg font-bold">Other sources</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {Object.values(data.sources).map((s) => <li key={s.name}><a className="underline" href={s.url}>{s.name}</a> · {s.license}</li>)}
          <li>Kansallinen syöpästrategia 2026–2035 and Toimeenpanon tiekartta 2026–2031 (challenge resources from AstraZeneca / Junction)</li>
          <li>THL Ohjaus 21/2016: Hoitoonpääsyn seuranta syövän hoidossa</li>
          <li><a className="underline" href={data.eligibleMeta.url}>{data.eligibleMeta.source}</a> ({data.eligibleMeta.year}). Used for impact estimates: {Object.values(data.eligibleMeta.bands).map((b) => `${b.label}, every ${b.intervalYears} years`).join("; ")}. Eligible population is used as an approximation of invitees per round.</li>
          <li>Resource lines on actions are team estimates, not costed budgets.</li>
          {Object.values(FACTS).map((x) => <li key={x.url + x.source}>{x.text}. <a className="underline" href={x.url} target="_blank" rel="noreferrer">{x.source}</a></li>)}
        </ul>
      </Card>
    </div>
  );
}
