import type { ReactNode } from "react";

export function Sparkline({ a, b, better, width = 120, height = 32 }: { a: { year: number; value: number }[]; b?: { year: number; value: number }[]; better: string; width?: number; height?: number }) {
  const all = [...a, ...(b || [])];
  if (a.length < 2) return <span className="text-xs text-[var(--muted)]">too few years</span>;
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
  const col = improving ? "var(--better)" : "var(--worse)";
  return (
    <svg width={width} height={height} aria-label={`trend ${first.year}–${last.year}`}>
      {b && b.length > 1 && <path d={line(b)} fill="none" stroke="#9aa3ad" strokeWidth={1.2} strokeDasharray="3 2" />}
      <path d={line(a)} fill="none" stroke={col} strokeWidth={2} />
      <circle cx={sx(last.year)} cy={sy(last.value)} r={2.5} fill={col} />
    </svg>
  );
}

/** Quiet source link: "Source: Sotkanet 3621" */
export function SourceBadge({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" title={label} className="text-xs text-[var(--accent)] underline decoration-[var(--line)] underline-offset-2 hover:decoration-[var(--accent)]">
      {label}
    </a>
  );
}

export function Chip({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[6px] border border-[var(--line)] bg-white p-5 ${className}`}>{children}</div>;
}

export function Section({ title, children, aside, className = "" }: { title: string; children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <section className={`border-t border-[var(--line)] pt-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
