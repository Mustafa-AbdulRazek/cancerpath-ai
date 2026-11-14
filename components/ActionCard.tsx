import type { MatchedAction } from "@/lib/actions";
import { fmt, stageMeta } from "@/lib/analysis";
import { Chip } from "./ui";

export default function ActionCard({ a, rankNo }: { a: MatchedAction | (MatchedAction & { matchedOn: [] }); rankNo?: number }) {
  const st = stageMeta(a.stage);
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm break-inside-avoid">
      <div className="flex items-start gap-2">
        {rankNo != null && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{rankNo}</span>}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip color={st.color}>{st.label}</Chip>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{a.level}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">Effort: {a.effort}</span>
            <span className="text-[11px] text-slate-400">{a.id}</span>
          </div>
          <h3 className="mt-1 font-semibold leading-snug">{a.title}</h3>
        </div>
      </div>
      {a.matchedOn.length > 0 && (
        <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-900">
          <b>Triggered by:</b>{" "}
          {a.matchedOn.map((m) => `${m.ind.short} ${fmt(m.value)}${m.ind.unit === "%" || m.ind.unit.startsWith("%") ? "%" : ""} (FI ${fmt(m.national)}, rank ${m.rank}/${m.of})`).join(" · ")}
        </div>
      )}
      <p className="mt-2 text-sm text-slate-700">{a.what}</p>
      <div className="mt-2 text-sm">
        <div className="font-semibold">First 90 days</div>
        <ol className="ml-4 list-decimal text-slate-700">
          {a.first90.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </div>
      {"impact" in a && a.impact && (
        <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <b>Impact estimate:</b> ≈ {a.impact.perRound.toLocaleString("en-GB")} more people screened per round (≈ {a.impact.perYear.toLocaleString("en-GB")} per year) if participation rises from {a.impact.current}% to {a.impact.target}%.
          <div className="text-[11px] text-emerald-800">Eligible group: {a.impact.bandLabel}, {a.impact.pop.toLocaleString("en-GB")} people ({a.impact.popYear}, Statistics Finland), screened every {a.impact.intervalYears} years. Approximation: eligible population ≈ invitees.</div>
        </div>
      )}
      <div className="mt-2 grid gap-1 text-sm">
        <div><span className="font-semibold">Owner:</span> {a.owner}</div>
        <div><span className="font-semibold">KPI:</span> {a.kpi}</div>
        <div><span className="font-semibold">Roadmap actions:</span> {a.roadmap.join(", ")}</div>
        {a.resources && <div><span className="font-semibold">Resources:</span> {a.resources} <span className="text-xs text-slate-400">(team estimate)</span></div>}
      </div>
      <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-xs">
        {a.evidence.map((e) => (
          <a key={e.label} href={e.url} target="_blank" rel="noreferrer" className="block text-sky-800 underline-offset-2 hover:underline">↗ {e.label}</a>
        ))}
      </div>
    </div>
  );
}
