import { DELAY_STEPS, KUITUNEN_SOURCE } from "@/lib/equity";

const MEASURE = {
  proxy: { label: "Proxy only", color: "#4338ca", bg: "#eef0fb" },
  partial: { label: "Partly measured", color: "#92400e", bg: "#fbf3e8" },
  none: { label: "Not measured", color: "#b42318", bg: "#fdecea" },
};

/** The 8-step cancer delay chain (patient delay → system delay), showing what public data can and cannot see. */
export default function DelayChain({ values }: { values?: Record<string, string> }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-8">
        {DELAY_STEPS.map((s) => {
          const m = MEASURE[s.measure];
          return (
            <div key={s.n} className="rounded-[6px] border p-2" style={{ borderColor: m.color + "55", background: m.bg }}>
              <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide" style={{ color: s.kind === "patient" ? "#7e22ce" : "#475569" }}>
                <span>{s.kind === "patient" ? "Patient" : "System"}</span>
                <span className="text-[var(--muted)]">{s.n}</span>
              </div>
              <div className="mt-0.5 text-sm font-medium leading-tight">{s.label}</div>
              <div className="mt-1 text-[11px] font-medium" style={{ color: m.color }}>{m.label}</div>
              <div className="text-[11px] leading-snug text-[var(--muted)]">{s.note}</div>
              {s.key && values?.[s.key] && <div className="mt-1 text-[11px] font-medium text-[var(--ink)]">{values[s.key]}</div>}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Steps 1–2: patient-related delay. Steps 3–8: healthcare-system delay. Delays accumulate, and a longer symptom-to-diagnosis interval is linked to worse outcomes. Steps 6–8 are the blind spot that the 90-day pilot (A7) measures with the county&apos;s own data. {KUITUNEN_SOURCE}.
      </p>
    </div>
  );
}
