"use client";
import { geoPath, geoTransverseMercator } from "d3-geo";
import Link from "next/link";
import { useMemo, useState } from "react";

export type MapDatum = { code: string; name: string; fill: string; label: string; sub?: string };

export default function FinlandMap({ geo: geoIn, datum, selected, height = 560 }: { geo: GeoJSON.FeatureCollection; datum: Record<string, MapDatum>; selected?: string; height?: number }) {
  const width = Math.round(height * 0.62);
  const [hover, setHover] = useState<string | null>(null);
  const paths = useMemo(() => {
    const geo = geoIn;
    const proj = geoTransverseMercator().rotate([-27, 0]).fitSize([width, height], geo as never);
    const p = geoPath(proj);
    return geo.features.map((f) => ({ code: (f.properties as { code: string }).code, d: p(f as never) || "", c: p.centroid(f as never) }));
  }, [geoIn, width, height]);
  const h = hover ? datum[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[70vh]" role="img" aria-label="Map of Finland's wellbeing services counties">
        {paths.map(({ code, d }) => (
          <Link key={code} href={`/county/${code}`}>
            <path
              d={d}
              fill={datum[code]?.fill || "#e5e7eb"}
              stroke={selected === code ? "#111827" : "#ffffff"}
              strokeWidth={selected === code ? 2.5 : 0.8}
              onMouseEnter={() => setHover(code)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer transition-opacity hover:opacity-80"
            >
              <title>{datum[code] ? `${datum[code].name}: ${datum[code].label}` : code}</title>
            </path>
          </Link>
        ))}
      </svg>
      {h && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow">
          <div className="font-semibold">{h.name}</div>
          <div>{h.label}</div>
          {h.sub && <div className="text-slate-500 text-xs">{h.sub}</div>}
        </div>
      )}
    </div>
  );
}
