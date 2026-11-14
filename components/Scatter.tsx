"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type P = { code: string; name: string; x: number; y: number };

function pearson(pts: P[]) {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
  let a = 0, b = 0, c = 0;
  for (const p of pts) { a += (p.x - mx) * (p.y - my); b += (p.x - mx) ** 2; c += (p.y - my) ** 2; }
  return a / Math.sqrt(b * c);
}

/** Interactive county scatter: hover for values, click to open a county, toggle to exclude a group and see r change. */
export default function Scatter({ pts, xLabel, yLabel, excludable, excludeLabel = "Exclude capital region" }: { pts: P[]; xLabel: string; yLabel: string; excludable?: string[]; excludeLabel?: string }) {
  const router = useRouter();
  const [exclude, setExclude] = useState(false);
  const [hover, setHover] = useState<P | null>(null);
  const width = 380, height = 240;
  const pad = { l: 40, r: 12, t: 12, b: 36 };
  const active = useMemo(() => (exclude && excludable ? pts.filter((p) => !excludable.includes(p.code)) : pts), [pts, exclude, excludable]);
  const r = pearson(active);
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const sx = (v: number) => pad.l + ((v - x0) / (x1 - x0 || 1)) * (width - pad.l - pad.r);
  const sy = (v: number) => height - pad.b - ((v - y0) / (y1 - y0 || 1)) * (height - pad.t - pad.b);
  // least-squares line for the active points
  const n = active.length, mx = active.reduce((s, p) => s + p.x, 0) / n, my = active.reduce((s, p) => s + p.y, 0) / n;
  const slope = active.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / active.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  const lx0 = Math.min(...active.map((p) => p.x)), lx1 = Math.max(...active.map((p) => p.x));
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>Correlation <b className="tabular-nums">r = {r.toFixed(2)}</b> <span className="text-[var(--muted)]">({n} areas)</span></span>
        {excludable && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={exclude} onChange={(e) => setExclude(e.target.checked)} className="accent-[var(--accent)]" />
            {excludeLabel}
          </label>
        )}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`${yLabel} vs ${xLabel}`}>
          <line x1={pad.l} y1={height - pad.b} x2={width - pad.r} y2={height - pad.b} stroke="#c7cdd4" />
          <line x1={pad.l} y1={pad.t} x2={pad.l} y2={height - pad.b} stroke="#c7cdd4" />
          <text x={(width + pad.l) / 2} y={height - 6} textAnchor="middle" fontSize="11" fill="#6b7280">{xLabel}</text>
          <text x={12} y={(height - pad.b) / 2} textAnchor="middle" fontSize="11" fill="#6b7280" transform={`rotate(-90 12 ${(height - pad.b) / 2})`}>{yLabel}</text>
          <text x={pad.l - 4} y={sy(y1) + 4} textAnchor="end" fontSize="10" fill="#9aa3ad">{y1}</text>
          <text x={pad.l - 4} y={sy(y0)} textAnchor="end" fontSize="10" fill="#9aa3ad">{y0}</text>
          <text x={sx(x0)} y={height - pad.b + 13} fontSize="10" fill="#9aa3ad">{x0}</text>
          <text x={sx(x1)} y={height - pad.b + 13} textAnchor="end" fontSize="10" fill="#9aa3ad">{x1}</text>
          <line x1={sx(lx0)} y1={sy(my + slope * (lx0 - mx))} x2={sx(lx1)} y2={sy(my + slope * (lx1 - mx))} stroke="#0b4f9c" strokeOpacity={0.35} strokeWidth={1.5} />
          {pts.map((p) => {
            const out = exclude && excludable?.includes(p.code);
            return (
              <circle
                key={p.code}
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={hover?.code === p.code ? 7 : 5}
                fill={out ? "#ffffff" : "#0b4f9c"}
                stroke="#0b4f9c"
                fillOpacity={out ? 1 : 0.75}
                strokeOpacity={out ? 0.4 : 1}
                className="cursor-pointer"
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
                onClick={() => router.push(`/county/${p.code}`)}
              />
            );
          })}
        </svg>
        {hover && (
          <div className="pointer-events-none absolute right-2 top-2 rounded-[6px] border border-[var(--line)] bg-white px-3 py-2 text-xs shadow-sm">
            <div className="font-medium">{hover.name}</div>
            <div className="text-[var(--muted)]">{yLabel.split(",")[0]}: {hover.y}%</div>
            <div className="text-[var(--muted)]">{xLabel.split(",")[0]}: {hover.x}%</div>
            <div className="text-[var(--accent)]">Click to open</div>
          </div>
        )}
      </div>
    </div>
  );
}
