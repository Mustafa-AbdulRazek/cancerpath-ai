export default function Scatter({ pts, xLabel, yLabel, width = 360, height = 220 }: { pts: { code: string; name: string; x: number; y: number }[]; xLabel: string; yLabel: string; width?: number; height?: number }) {
  const pad = { l: 40, r: 10, t: 10, b: 34 };
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const sx = (v: number) => pad.l + ((v - x0) / (x1 - x0 || 1)) * (width - pad.l - pad.r);
  const sy = (v: number) => height - pad.b - ((v - y0) / (y1 - y0 || 1)) * (height - pad.t - pad.b);
  const label = new Set([...pts].sort((a, b) => a.y - b.y).slice(0, 3).map((p) => p.code));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`${yLabel} vs ${xLabel}`}>
      <line x1={pad.l} y1={height - pad.b} x2={width - pad.r} y2={height - pad.b} stroke="#cbd5e1" />
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={height - pad.b} stroke="#cbd5e1" />
      <text x={(width + pad.l) / 2} y={height - 6} textAnchor="middle" fontSize="11" fill="#64748b">{xLabel}</text>
      <text x={12} y={(height - pad.b) / 2} textAnchor="middle" fontSize="11" fill="#64748b" transform={`rotate(-90 12 ${(height - pad.b) / 2})`}>{yLabel}</text>
      <text x={pad.l - 4} y={sy(y1) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{y1}</text>
      <text x={pad.l - 4} y={sy(y0)} textAnchor="end" fontSize="10" fill="#94a3b8">{y0}</text>
      <text x={sx(x0)} y={height - pad.b + 12} fontSize="10" fill="#94a3b8">{x0}</text>
      <text x={sx(x1)} y={height - pad.b + 12} textAnchor="end" fontSize="10" fill="#94a3b8">{x1}</text>
      {pts.map((p) => (
        <g key={p.code}>
          <circle cx={sx(p.x)} cy={sy(p.y)} r={4.5} fill="#0369a1" fillOpacity={0.75}><title>{`${p.name}: ${p.y} / ${p.x}`}</title></circle>
          {label.has(p.code) && <text x={sx(p.x) - 6} y={sy(p.y) + 3} textAnchor="end" fontSize="10" fill="#334155">{p.name}</text>}
        </g>
      ))}
    </svg>
  );
}
