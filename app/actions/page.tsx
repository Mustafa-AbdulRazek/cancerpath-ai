import ActionCard from "@/components/ActionCard";
import { ACTIONS } from "@/lib/actions";
import { STAGES } from "@/lib/analysis";

export const metadata = { title: "Action library · CancerPath AI" };

export default function ActionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Evidence-based action library</h1>
        <p className="mt-1 max-w-3xl text-slate-600">
          Each action is triggered by a measured gap. It names an owner in the county or health center, a 90-day start plan, a KPI, the national roadmap action it implements, and peer-reviewed or official evidence. The county pages rank these actions automatically for each county.
        </p>
      </div>
      {STAGES.map((s) => {
        const list = ACTIONS.filter((a) => a.stage === s.key);
        if (!list.length) return null;
        return (
          <section key={s.key}>
            <h2 className="mb-2 text-lg font-bold" style={{ color: s.color }}>{s.label}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((a) => <ActionCard key={a.id} a={{ ...a, score: 0, matchedOn: [] }} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
