import { HORIZON, TARGET } from "@/lib/projection";

type Pt = { year: number; value: number };

/** History (solid), linear projection with 95% band (dashed, shaded), the 80% target and the 2035 horizon. */
export default function TrajectoryChart({ history, projection, national, color, width = 300, height = 150 }: {
  history: Pt[]; projection?: { year: number; value: number; lo: number; hi: number }[]; national?: Pt[]; color: string; width?: number; height?: number;
}) {
  const pad = { l: 30, r: 8, t: 8, b: 20 };
  const x0 = Math.min(...history.map((p) => p.year)), x1 = HORIZON;
  const vals = [...history.map((p) => p.value), ...(projection ?? []).flatMap((p) => [p.lo, p.hi]), ...(national ?? []).map((p) => p.value), TARGET];
  const y0 = Math.max(0, Math.floor(Math.min(...vals) / 5) * 5), y1 = Math.min(100, Math.ceil(Math.max(...vals) / 5) * 5);
  const sx = (x: number) => pad.l + ((x - x0) / (x1 - x0)) * (width - pad.l - pad.r);
  const sy = (y: number) => height - pad.b - ((y - y0) / Math.max(1, y1 - y0)) * (height - pad.t - pad.b);
  const path = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${sx(p.year).toFixed(1)},${sy(p.value).toFixed(1)}`).join("");
  const last = history[history.length - 1];
  const proj = projection && projection.length ? [{ year: last.year, value: last.value, lo: last.value, hi: last.value }, ...projection] : [];
  const band = proj.length ? `M${proj.map((p) => `${sx(p.year).toFixed(1)},${sy(Math.min(y1, p.hi)).toFixed(1)}`).join("L")}L${[...proj].reverse().map((p) => `${sx(p.year).toFixed(1)},${sy(Math.max(y0, p.lo)).toFixed(1)}`).join("L")}Z` : "";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Trend and projection to 2035">
      {[y0, TARGET, y1].filter((v, i, a) => a.indexOf(v) === i).map((v) => (
        <text key={v} x={pad.l - 4} y={sy(v) + 3} textAnchor="end" fontSize="9" fill="#6b7280">{v}</text>
      ))}
      <line x1={pad.l} x2={width - pad.r} y1={sy(TARGET)} y2={sy(TARGET)} stroke="#0f766e" strokeDasharray="2 3" />
      <text x={width - pad.r} y={sy(TARGET) - 3} textAnchor="end" fontSize="9" fill="#0f766e">target {TARGET}%</text>
      <line x1={sx(HORIZON)} x2={sx(HORIZON)} y1={pad.t} y2={height - pad.b} stroke="#c7cdd4" />
      <text x={sx(x0)} y={height - 6} fontSize="9" fill="#6b7280">{x0}</text>
      <text x={sx(last.year)} y={height - 6} fontSize="9" fill="#6b7280" textAnchor="middle">{last.year}</text>
      <text x={sx(HORIZON)} y={height - 6} fontSize="9" fill="#6b7280" textAnchor="end">{HORIZON}</text>
      {band && <path d={band} fill={color} fillOpacity={0.12} />}
      {national && national.length > 1 && <path d={path(national)} fill="none" stroke="#9aa3ad" strokeWidth={1.2} strokeDasharray="3 2" />}
      <path d={path(history)} fill="none" stroke={color} strokeWidth={2} />
      {proj.length > 0 && <path d={path(proj)} fill="none" stroke={color} strokeWidth={1.6} strokeDasharray="5 4" />}
      <circle cx={sx(last.year)} cy={sy(last.value)} r={2.8} fill={color} />
    </svg>
  );
}
