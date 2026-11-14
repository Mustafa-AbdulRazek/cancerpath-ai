"use client";
import { useState } from "react";
import FinlandMap, { MapDatum } from "./FinlandMap";

export type MapMode = { key: string; label: string; legend: { color: string; label: string }[]; datum: Record<string, MapDatum>; note?: string };

export default function MapExplorer({ geo, modes }: { geo: GeoJSON.FeatureCollection; modes: MapMode[] }) {
  const [k, setK] = useState(modes[0].key);
  const m = modes.find((x) => x.key === k)!;
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Map shows</label>
      <select value={k} onChange={(e) => setK(e.target.value)} className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
        {modes.map((x) => (
          <option key={x.key} value={x.key}>{x.label}</option>
        ))}
      </select>
      <FinlandMap geo={geo} datum={m.datum} />
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {m.legend.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1">
            {l.color.startsWith("url(") ? (
              <svg width="12" height="12" aria-hidden><defs><pattern id="hatch-legend" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="#475569" strokeWidth="1.4" /></pattern></defs><rect width="12" height="12" rx="2" fill="#e2e8f0" /><rect width="12" height="12" rx="2" fill="url(#hatch-legend)" /></svg>
            ) : (
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: l.color }} />
            )}
            {l.label}
          </span>
        ))}
      </div>
      {m.note && <p className="mt-1 text-xs text-slate-500">{m.note}</p>}
      <p className="mt-1 text-xs text-slate-400">Click a county to open its pathway and action plan.</p>
    </div>
  );
}
