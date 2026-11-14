import AnalystChat from "@/components/AnalystChat";
import { counties } from "@/lib/analysis";

export const metadata = { title: "AI analyst · CancerPath AI" };

export default function AnalystPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">AI analyst</h1>
      <p className="text-slate-600">
        Ask about indicator trends, county gaps and what to do. The analyst (Google Gemini) only sees the cited facts: THL Sotkanet indicators, the National Cancer Strategy and the implementation roadmap. Every number in its answer is checked automatically against that data.
      </p>
      <AnalystChat counties={counties.map((c) => ({ code: c.code, name: c.name }))} />
    </div>
  );
}
