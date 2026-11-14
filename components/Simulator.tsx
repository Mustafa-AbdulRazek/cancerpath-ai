"use client";
import { useState } from "react";

type Prog = { key: string; label: string; current: number; best: number; target: number; source: string; eligible?: number; bandLabel?: string; intervalYears?: number };

/** Transparent what-if: arithmetic on the county's own numbers, no hidden effect sizes. */
export default function Simulator({ programmes, countyName }: { programmes: Prog[]; countyName: string }) {
  const [k, setK] = useState(programmes[0]?.key);
  const p = programmes.find((x) => x.key === k) || programmes[0];
  const [goal, setGoal] = useState(Math.max(p?.target ?? 80, Math.ceil(p?.current ?? 0)));
  if (!p) return null;
  const extra = p.eligible ? Math.max(0, Math.round((p.eligible * (goal - p.current)) / 100)) : undefined;
  const per1000 = Math.max(0, Math.round(((goal - p.current) / 100) * 1000));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="tablist">
        {programmes.map((x) => (
          <button key={x.key} role="tab" aria-selected={x.key === k} onClick={() => { setK(x.key); setGoal(Math.max(x.target, Math.ceil(x.current))); }} className={`rounded-[6px] border px-3 py-1 text-sm ${x.key === k ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white"}`}>
            {x.label}
          </button>
        ))}
      </div>
      <div className="text-sm text-[var(--muted)]">
        Today {p.current}% · best county {p.best}% · goal <span className="font-medium text-[var(--ink)]">{goal}%</span>
      </div>
      <input type="range" min={Math.floor(p.current)} max={95} step={0.5} value={goal} onChange={(e) => setGoal(+e.target.value)} className="w-full accent-[var(--accent)]" aria-label="Participation goal" />
      <div className="rounded-[6px] border border-[var(--line)] bg-white p-4">
        <div className="text-3xl font-semibold">{extra != null ? `+${extra.toLocaleString("en-GB")}` : `+${per1000}`}</div>
        <div className="text-sm text-[var(--muted)]">
          {extra != null
            ? <>more people screened per round in {countyName}{p.intervalYears ? ` (≈ ${Math.round(extra / p.intervalYears).toLocaleString("en-GB")} a year)` : ""}. That is +{per1000} per 1,000 invited.</>
            : <>more people screened per 1,000 invited.</>}
        </div>
      </div>
      <p className="text-xs text-[var(--muted)]">
        Eligible group: {p.bandLabel ?? "programme age band"}{p.eligible ? `, ${p.eligible.toLocaleString("en-GB")} people (Statistics Finland 2025)` : ""}. Participation from {p.source}. We do not turn this into &quot;lives saved&quot;: that needs local stage data, which is not public.
      </p>
    </div>
  );
}
