"use client";
import { useState } from "react";

type Prog = { key: string; label: string; current: number; best: number; target: number; source: string; eligible?: number; bandLabel?: string; intervalYears?: number };

/** Transparent what-if: only arithmetic on the county's own numbers, no hidden effect sizes. */
export default function Simulator({ programmes, countyName }: { programmes: Prog[]; countyName: string }) {
  const [k, setK] = useState(programmes[0]?.key);
  const p = programmes.find((x) => x.key === k) || programmes[0];
  const [goal, setGoal] = useState(Math.max(p?.target ?? 80, Math.ceil(p?.current ?? 0)));
  if (!p) return null;
  const extraPer1000 = Math.round(((goal - p.current) / 100) * 1000);
  const missedNow = Math.round(((100 - p.current) / 100) * 1000);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {programmes.map((x) => (
          <button key={x.key} onClick={() => { setK(x.key); setGoal(Math.max(x.target, Math.ceil(x.current))); }} className={`rounded-full border px-3 py-1 text-xs ${x.key === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300"}`}>
            {x.label}
          </button>
        ))}
      </div>
      <div className="text-sm text-slate-600">
        {countyName} today: <b>{p.current}%</b> participation · best county {p.best}% · strategy target {p.target}% in every county
      </div>
      <input type="range" min={Math.floor(p.current)} max={95} step={0.5} value={goal} onChange={(e) => setGoal(+e.target.value)} className="w-full accent-sky-700" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-sky-50 p-3"><div className="text-xs text-slate-500">Goal</div><div className="text-2xl font-bold">{goal}%</div></div>
        <div className="rounded-lg bg-emerald-50 p-3"><div className="text-xs text-slate-500">More people screened per 1,000 invited</div><div className="text-2xl font-bold">+{Math.max(0, extraPer1000)}</div></div>
        <div className="rounded-lg bg-amber-50 p-3"><div className="text-xs text-slate-500">Invitees not screened today, per 1,000</div><div className="text-2xl font-bold">{missedNow}</div></div>
      </div>
      {p.eligible ? (
        <div className="rounded-lg border border-emerald-200 bg-white p-3 text-sm">
          In {countyName}: <b>≈ {Math.max(0, Math.round((p.eligible * (goal - p.current)) / 100)).toLocaleString("en-GB")} more people screened per round</b>
          {p.intervalYears ? <> (≈ {Math.max(0, Math.round((p.eligible * (goal - p.current)) / 100 / p.intervalYears)).toLocaleString("en-GB")} per year)</> : null}.
          <div className="text-xs text-slate-500">Eligible group: {p.bandLabel}, {p.eligible.toLocaleString("en-GB")} people (Statistics Finland 2025). Approximation: eligible population ≈ invitees.</div>
        </div>
      ) : null}
      <p className="text-xs text-slate-500">Arithmetic on the published participation rate ({p.source}). We deliberately do not convert this into &quot;lives saved&quot;: that needs local stage and interval-cancer data, which is not public.</p>
    </div>
  );
}
