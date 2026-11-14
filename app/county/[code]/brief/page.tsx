import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import { learnFrom } from "@/components/ActionCard";
import { counties, countyByCode, ordinal, phrase } from "@/lib/analysis";
import { countySummary } from "@/lib/brief";

export function generateStaticParams() {
  return counties.map((c) => ({ code: c.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return { title: `Brief: ${countyByCode[code]?.name ?? "County"} · CancerPath AI` };
}

/** One-page printable brief for a county board. Rule-based, so it works instantly and without AI. */
export default async function BriefPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!countyByCode[code]) notFound();
  const s = countySummary(code);
  const top = s.plan.slice(0, 3);
  return (
    <article className="mx-auto max-w-3xl bg-white p-8 text-[15px] leading-relaxed print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/county/${code}`} className="text-sm text-[var(--accent)] hover:underline">Back to {s.county.name}</Link>
        <PrintButton />
      </div>
      <header className="border-b border-[var(--line)] pb-3">
        <div className="text-sm text-[var(--muted)]">CancerPath AI · decision brief · {new Date().toLocaleDateString("en-GB")}</div>
        <h1 className="text-2xl font-semibold">{s.county.name}</h1>
        <div className="text-sm text-[var(--muted)]">National Cancer Strategy 2026–2035, Goal 3: equal and effective cancer care</div>
      </header>

      <h2 className="mt-4 font-semibold">Key message</h2>
      <p>{s.message}</p>

      <h2 className="mt-4 font-semibold">What the data shows</h2>
      <ul className="ml-5 list-disc">
        {s.gaps.length ? s.gaps.map((g) => (
          <li key={g.key}>{phrase(g).charAt(0).toUpperCase() + phrase(g).slice(1)} ({ordinal(g.rank!)} of {g.of}, {g.year}){g.belowTarget ? ", below the 80% target" : ""}. Source: {g.key === "smr" ? "Statistics Finland (SMR, CancerPath calculation)" : `THL Sotkanet ${g.ind.id}`}.</li>
        )) : <li>No indicator is clearly below other counties.</li>}
      </ul>

      <h2 className="mt-4 font-semibold">What to do in the next 90 days</h2>
      <ol className="ml-5 list-decimal space-y-1">
        {top.map((a) => {
          const peer = learnFrom(a);
          return (
            <li key={a.id}>
              <span className="font-medium">{a.title}.</span> Owner: {a.owner}. KPI: {a.kpi}.
              {a.impact ? ` Reach: about ${a.impact.perRound.toLocaleString("en-GB")} more people screened per round.` : ""}
              {peer ? ` ${peer.label ?? "Learn from"}: ${peer.text}.` : ""} Roadmap {a.roadmap.join(", ")}.
            </li>
          );
        })}
      </ol>

      <h2 className="mt-4 font-semibold">What we cannot see yet</h2>
      <ul className="ml-5 list-disc">
        <li>Referral-to-treatment times are not published by county and cancer type; nationally only the count over the 180-day limit is reported (IHE 2026).</li>
        <li>Stage at diagnosis is recorded for 42% of new cancers nationally, 72% in Pirkanmaa (Syöpä 2024).</li>
      </ul>

      <footer className="mt-6 border-t border-[var(--line)] pt-2 text-xs text-[var(--muted)]">
        Sources: THL Sotkanet open data, Finnish Cancer Registry, Statistics Finland; full list and limitations at cancerpath-ai.vercel.app/sources. Rankings compare the 22 wellbeing services areas; small differences in survival are not scored.
      </footer>
    </article>
  );
}
