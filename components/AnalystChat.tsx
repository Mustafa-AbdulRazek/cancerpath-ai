"use client";
import { useState } from "react";
import { Answer } from "./AnalystPanel";

type Resp = Parameters<typeof Answer>[0]["r"];

export default function AnalystChat({ counties }: { counties: { code: string; name: string }[] }) {
  const [county, setCounty] = useState("");
  const [lang, setLang] = useState<"en" | "fi">("en");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<{ q: string; r: Resp }[]>([]);
  async function ask(question: string) {
    if (!question.trim()) return;
    setLoading(true);
    setQ("");
    try {
      const history = log.flatMap((x) => [{ role: "user", text: x.q }, { role: "model", text: x.r.text }]);
      const r = await fetch("/api/analyst", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "qa", county: county || undefined, question, lang, history }) });
      const data = (await r.json()) as Resp;
      setLog((p) => [...p, { q: question, r: data }]);
    } finally {
      setLoading(false);
    }
  }
  const sug = [
    "How has access to primary care changed since 2021, and why does it matter for cancer detection?",
    "Which screening programme is furthest from the 80% target?",
    "What does Goal 3 of the national cancer strategy require, and what can we measure today?",
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select value={county} onChange={(e) => setCounty(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">Whole of Finland</option>
          {counties.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
        <div className="flex overflow-hidden rounded-lg border border-slate-300 text-sm">
          {(["en", "fi"] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)} className={`px-3 py-2 ${lang === l ? "bg-slate-900 text-white" : "bg-white"}`}>{l === "en" ? "English" : "Suomi"}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {sug.map((s) => <button key={s} onClick={() => ask(s)} disabled={loading} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-slate-50">{s}</button>)}
      </div>
      <div className="space-y-4">
        {log.map((x, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm font-semibold text-slate-700">Q: {x.q}</div>
            <Answer r={x.r} />
          </div>
        ))}
        {loading && <div className="text-sm text-slate-500">Analyst is thinking…</div>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a question…" className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        <button disabled={loading} className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Ask</button>
      </form>
    </div>
  );
}
