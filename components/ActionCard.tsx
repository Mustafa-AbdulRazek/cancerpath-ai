import type { Action, MatchedAction } from "@/lib/actions";
import { countyByCode, fmt, fmtU, stageMeta } from "@/lib/analysis";

type Props = { a: Action & Partial<Pick<MatchedAction, "matchedOn" | "impact" | "score">>; rankNo?: number; open?: boolean };

/** Peer benchmark: the best-performing county on the indicator that triggered the action. */
export function learnFrom(a: Props["a"]): { text: string; url?: string; label?: string } | undefined {
  if (a.learnFrom) return { ...a.learnFrom, label: "Learn from" };
  // Prefer process indicators (screening, waits): a county that does better there is a real peer to learn from.
  const m = a.matchedOn?.find((x) => x.best && x.best[0] && x.ind.stage !== "outcome") ?? a.matchedOn?.find((x) => x.best && x.best[0]);
  if (!m || !m.best) return undefined;
  // For outcomes we only know who has the best result, not which practice caused it.
  const label = m.ind.stage === "outcome" ? "Best outcome" : "Learn from";
  const val = m.key === "smr" ? `cancer mortality ${Math.abs(Math.round(m.best[1] - 100))}% below expected` : `${m.ind.short.toLowerCase()} ${fmtU(m.best[1], m.ind.unit)}`;
  return { text: `${countyByCode[m.best[0]]?.name}: ${val}`, url: m.ind.url, label };
}

export default function ActionCard({ a, rankNo, open }: Props) {
  const st = stageMeta(a.stage);
  const peer = learnFrom(a);
  return (
    <details open={open} className="group border-b border-[var(--line)] py-3 break-inside-avoid">
      <summary className="flex cursor-pointer list-none gap-3">
        {rankNo != null && <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-[var(--ink)] text-xs font-semibold text-white">{rankNo}</span>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="font-semibold leading-snug">{a.title}</h3>
          </div>
          <div className="mt-1 grid gap-0.5 text-sm text-[var(--muted)] sm:grid-cols-2">
            <div><span className="text-[var(--ink)]">Owner:</span> {a.owner}</div>
            <div><span className="text-[var(--ink)]">KPI:</span> {a.kpi}</div>
            {a.impact && (
              <div className="sm:col-span-2">
                <span className="text-[var(--ink)]">Reach:</span> ≈ {a.impact.perRound.toLocaleString("en-GB")} more people screened per round (≈ {a.impact.perYear.toLocaleString("en-GB")} a year)
              </div>
            )}
            {peer && (
              <div className="sm:col-span-2">
                <span className="text-[var(--ink)]">{peer.label ?? "Learn from"}:</span> {peer.text}
              </div>
            )}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            <span style={{ color: st.color }} className="font-medium">{st.label}</span> · {a.level} · effort {a.effort.toLowerCase()} · roadmap {a.roadmap.join(", ")} · <span className="text-[var(--accent)] group-open:hidden">Show plan</span><span className="hidden text-[var(--accent)] group-open:inline">Hide plan</span>
          </div>
        </div>
      </summary>
      <div className="ml-9 mt-3 space-y-2 text-sm">
        {a.matchedOn && a.matchedOn.length > 0 && (
          <p className="text-[var(--muted)]">
            <span className="text-[var(--ink)]">Why here:</span>{" "}
            {a.matchedOn.map((m) => `${m.ind.short} ${fmtU(m.value, m.ind.unit)} (Finland ${fmt(m.national)}; ${m.rank} of ${m.of})`).join("; ")}
          </p>
        )}
        <p>{a.what}</p>
        <div>
          <div className="font-medium">First 90 days</div>
          <ol className="ml-5 list-decimal text-[var(--muted)]">
            {a.first90.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </div>
        {a.impact && (
          <p className="text-xs text-[var(--muted)]">
            Reach = ({a.impact.target}% − {a.impact.current}%) × {a.impact.pop.toLocaleString("en-GB")} {a.impact.bandLabel} (Statistics Finland {a.impact.popYear}); screened every {a.impact.intervalYears} years. Approximation: eligible population ≈ people invited.
          </p>
        )}
        {a.resources && <p><span className="font-medium">Resources:</span> {a.resources} <span className="text-xs text-[var(--muted)]">(team estimate)</span></p>}
        <ul className="space-y-0.5 text-xs">
          {a.evidence.map((e) => (
            <li key={e.label}><a href={e.url} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">{e.label}</a></li>
          ))}
          {peer?.url && !a.evidence.some((e) => e.url === peer.url) && (
            <li><a href={peer.url} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">Benchmark source</a></li>
          )}
        </ul>
      </div>
    </details>
  );
}
