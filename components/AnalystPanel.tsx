"use client";
import { useState } from "react";
import Markdownish from "./Markdownish";

type Resp = { text: string; engine: string; error?: string | null; citations: { id: string; label: string; url: string }[]; unverifiedNumbers: string[] };

export function Answer({ r }: { r: Resp }) {
  return (
    <div className="space-y-3">
      <Markdownish text={r.text} />
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">Engine: {r.engine}</span>
        {r.unverifiedNumbers.length === 0 ? (
          <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">✓ Every number matches the source data</span>
        ) : (
          <span className="rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-800">⚠ Numbers not found in source data: {r.unverifiedNumbers.join(", ")}. Treat these as unverified.</span>
        )}
      </div>
      {r.citations.length > 0 && (
        <details className="text-xs text-slate-600" open>
          <summary className="cursor-pointer font-medium">Sources cited ({r.citations.length})</summary>
          <ul className="mt-1 space-y-0.5">
            {r.citations.map((c) => (
              <li key={c.id}>
                <span className="mr-1 rounded bg-sky-100 px-1 font-semibold text-sky-800">{c.id}</span>
                {c.url ? <a className="underline hover:text-sky-700" href={c.url} target="_blank" rel="noreferrer">{c.label}</a> : <span className="text-red-600">{c.label}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function AnalystPanel({ county, countyName }: { county: string; countyName: string }) {
  const [lang, setLang] = useState<"en" | "fi">("en");
  const [brief, setBrief] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [qa, setQa] = useState<{ q: string; r: Resp }[]>([]);

  async function call(body: object): Promise<Resp> {
    const r = await fetch("/api/analyst", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return r.json();
  }
  async function genBrief() {
    setLoading(true);
    try {
      setBrief(await call({ mode: "brief", county, lang }));
    } finally {
      setLoading(false);
    }
  }
  async function ask(question: string) {
    if (!question.trim()) return;
    setLoading(true);
    setQ("");
    try {
      const history = qa.flatMap((x) => [{ role: "user", text: x.q }, { role: "model", text: x.r.text }]);
      const r = await call({ mode: "qa", county, question, lang, history });
      setQa((p) => [...p, { q: question, r }]);
    } finally {
      setLoading(false);
    }
  }
  function printBrief() {
    document.body.classList.add("print-brief");
    const done = () => {
      document.body.classList.remove("print-brief");
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.print();
  }
  const suggestions = [
    `Where in the cancer pathway does ${countyName} fall behind?`,
    `What should ${countyName} do first, and who owns it?`,
    "What data is missing to monitor Goal 3?",
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={genBrief} disabled={loading} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
          {loading && !brief ? "Generating…" : "Generate 2-minute decision brief"}
        </button>
        <div className="flex overflow-hidden rounded-lg border border-slate-300 text-sm">
          {(["en", "fi"] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)} className={`px-3 py-2 ${lang === l ? "bg-slate-900 text-white" : "bg-white"}`}>
              {l === "en" ? "English" : "Suomi"}
            </button>
          ))}
        </div>
        {brief && (
          <button onClick={printBrief} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Print one-page brief (PDF)</button>
        )}
      </div>
      {brief && (
        <div id="brief-print" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="print-only mb-3 border-b border-slate-300 pb-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">CancerPath AI · decision brief · {new Date().toLocaleDateString("en-GB")}</div>
            <div className="text-2xl font-bold">{countyName}</div>
            <div className="text-xs text-slate-500">National Cancer Strategy 2026–2035 · Goal 3 · cancerpath-ai.vercel.app/county/{county}</div>
          </div>
          <Answer r={brief} />
        </div>
      )}
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="mb-2 text-sm font-semibold">Ask the analyst (answers use only the cited data)</div>
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => ask(s)} disabled={loading} className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50">
              {s}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {qa.map((x, i) => (
            <div key={i} className="space-y-2">
              <div className="text-sm font-semibold text-slate-700">Q: {x.q}</div>
              <Answer r={x.r} />
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
          className="mt-3 flex gap-2"
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about this county's cancer pathway…" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button disabled={loading} className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? "…" : "Ask"}</button>
        </form>
      </div>
    </div>
  );
}
