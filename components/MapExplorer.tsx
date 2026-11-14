"use client";
import { useState } from "react";
import FinlandMap, { MapDatum } from "./FinlandMap";

export type MapMode = { key: string; label: string; legend: { color: string; label: string }[]; datum: Record<string, MapDatum>; note?: string };

/** Map with a short list of main views and the remaining indicators under "More indicators". */
export default function MapExplorer({ geo, modes, primary = 4 }: { geo: GeoJSON.FeatureCollection; modes: MapMode[]; primary?: number }) {
  const [k, setK] = useState(modes[0].key);
  const m = modes.find((x) => x.key === k)!;
  const main = modes.slice(0, primary), more = modes.slice(primary);
  return (
    <div>
      <select value={k} onChange={(e) => setK(e.target.value)} aria-label="Map view" className="mb-2 w-full rounded-[6px] border border-[var(--line)] bg-white px-3 py-2 text-sm">
        {main.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
        {more.length > 0 && (
          <optgroup label="More indicators">
            {more.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </optgroup>
        )}
      </select>
      <FinlandMap geo={geo} datum={m.datum} />
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
        {m.legend.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1">
            {l.color.startsWith("url(") ? (
              <svg width="12" height="12" aria-hidden><defs><pattern id="hatch-legend" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="#475569" strokeWidth="1.4" /></pattern></defs><rect width="12" height="12" rx="2" fill="#e5e7eb" /><rect width="12" height="12" rx="2" fill="url(#hatch-legend)" /></svg>
            ) : (
              <span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: l.color }} />
            )}
            {l.label}
          </span>
        ))}
      </div>
      {m.note && <p className="mt-1 text-xs text-[var(--muted)]">{m.note}</p>}
    </div>
  );
}
