import type { ReactNode } from "react";

export function Sparkline({ a, b, better, width = 120, height = 32 }: { a: { year: number; value: number }[]; b?: { year: number; value: number }[]; better: string; width?: number; height?: number }) {
  const all = [...a, ...(b || [])];
  if (a.length < 2) return <span className="text-xs text-slate-400">too few years</span>;
  const xs = all.map((p) => p.year);
  const ys = all.map((p) => p.value);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const sx = (x: number) => 3 + ((x - x0) / Math.max(1, x1 - x0)) * (width - 6);
  const sy = (y: number) => height - 3 - ((y - y0) / Math.max(1e-9, y1 - y0)) * (height - 6);
  const line = (s: { year: number; value: number }[]) => s.map((p, i) => `${i ? "L" : "M"}${sx(p.year).toFixed(1)},${sy(p.value).toFixed(1)}`).join("");
  const last = a[a.length - 1];
  const first = a[0];
  const improving = better === "lower" ? last.value < first.value : last.value > first.value;
  return (
    <svg width={width} height={height} aria-label={`trend ${first.year}–${last.year}`}>
      {b && b.length > 1 && <path d={line(b)} fill="none" stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="3 2" />}
      <path d={line(a)} fill="none" stroke={improving ? "#0f766e" : "#dc2626"} strokeWidth={2} />
      <circle cx={sx(last.year)} cy={sy(last.value)} r={2.5} fill={improving ? "#0f766e" : "#dc2626"} />
    </svg>
  );
}

export function SourceBadge({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" title={label} className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-800 hover:bg-sky-100">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 3h7v7M10 14 21 3M21 14v7H3V3h7" /></svg>
      {label}
    </a>
  );
}

export function Chip({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: color }}>
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}
