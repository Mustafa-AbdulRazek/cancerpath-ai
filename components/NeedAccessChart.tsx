"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = { code: string; name: string; need: number; access: number; quadrant: string; color: string; label: string };

/** Need (x) vs access (y): the bottom-right quadrant is where the inverse care law shows up. */
export default function NeedAccessChart({ rows, highlight }: { rows: Row[]; highlight?: string }) {
  const router = useRouter();
  const [hover, setHover] = useState<Row | null>(null);
  const W = 420, H = 300, pad = { l: 36, r: 12, t: 14, b: 34 };
  const ext = Math.max(2, ...rows.flatMap((r) => [Math.abs(r.need), Math.abs(r.access)])) * 1.05;
  const sx = (v: number) => pad.l + ((v + ext) / (2 * ext)) * (W - pad.l - pad.r);
  const sy = (v: number) => H - pad.b - ((v + ext) / (2 * ext)) * (H - pad.t - pad.b);
  const labelled = new Set(rows.filter((r) => r.quadrant === "inverse" || r.code === highlight || Math.abs(r.need) > 0.9 || Math.abs(r.access) > 1).map((r) => r.code));
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Need versus access by county">
        <rect x={sx(0.25)} y={sy(-0.3)} width={sx(ext) - sx(0.25)} height={sy(-ext) - sy(-0.3)} fill="#b42318" fillOpacity={0.07} />
        <text x={sx(ext) - 4} y={sy(-0.3) + 12} textAnchor="end" fontSize="10" fontWeight="600" fill="#b42318">High need, low access</text>
        <text x={sx(ext) - 4} y={sy(ext) + 12} textAnchor="end" fontSize="10" fill="#6b7280">High need, good access</text>
        <text x={sx(-ext) + 4} y={sy(ext) + 12} fontSize="10" fill="#6b7280">Low need, good access</text>
        <line x1={sx(0)} x2={sx(0)} y1={pad.t} y2={H - pad.b} stroke="#c7cdd4" />
        <line x1={pad.l} x2={W - pad.r} y1={sy(0)} y2={sy(0)} stroke="#c7cdd4" />
        <text x={(W + pad.l) / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#6b7280">Need → (low income, cancer burden, mortality)</text>
        <text x={12} y={(H - pad.b) / 2} textAnchor="middle" fontSize="11" fill="#6b7280" transform={`rotate(-90 12 ${(H - pad.b) / 2})`}>Access → (GP, specialist, screening)</text>
        {rows.map((r) => (
          <g key={r.code} className="cursor-pointer" onMouseEnter={() => setHover(r)} onMouseLeave={() => setHover(null)} onClick={() => router.push(`/county/${r.code}`)}>
            <circle cx={sx(r.need)} cy={sy(r.access)} r={r.code === highlight ? 7 : 5} fill={r.color} stroke={r.code === highlight ? "#111827" : "#ffffff"} strokeWidth={r.code === highlight ? 2 : 1} />
            {labelled.has(r.code) && <text x={sx(r.need) + 7} y={sy(r.access) + 3} fontSize="10" fill="#374151">{r.name}</text>}
          </g>
        ))}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-[6px] border border-[var(--line)] bg-white px-3 py-2 text-xs shadow-sm">
          <div className="font-medium">{hover.name}</div>
          <div className="text-[var(--muted)]">{hover.label}</div>
          <div className="text-[var(--muted)]">need {hover.need.toFixed(2)} · access {hover.access.toFixed(2)} (SD)</div>
        </div>
      )}
    </div>
  );
}
