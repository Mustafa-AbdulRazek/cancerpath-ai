import { Fragment } from "react";

const CITE = String.raw`\[[A-Z]\d+[a-z]?(?:[,;\s]+[A-Z]\d+[a-z]?)*\](?:,?\s*\[[A-Z]\d+[a-z]?(?:[,;\s]+[A-Z]\d+[a-z]?)*\])*`;
const SPLIT = new RegExp(String.raw`(\*\*[^*]+\*\*|` + CITE + ")", "g");

/** Tiny renderer for **bold**, bullet/numbered lists and citation tags. Avoids pulling in a markdown dependency. */
export default function Markdownish({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const inline = (s: string) =>
    s.split(SPLIT).map((part, i) => {
      if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (/^\[[A-Z]\d/.test(part))
        return (
          <sup key={i} className="ml-0.5 rounded bg-sky-100 px-1 text-[10px] font-semibold text-sky-800">
            {part.replace(/[[\]]/g, "").replace(/[,;\s]+/g, ", ")}
          </sup>
        );
      return <Fragment key={i}>{part}</Fragment>;
    });
  return (
    <div className="space-y-1.5 text-[15px] leading-relaxed">
      {lines.map((l, i) => {
        const t = l.trim();
        if (!t) return <div key={i} className="h-1" />;
        const num = t.match(/^(\d+)\.\s+/);
        if (num)
          return (
            <div key={i} className="flex gap-2">
              <span className="font-semibold text-slate-500">{num[1]}.</span>
              <span>{inline(t.slice(num[0].length))}</span>
            </div>
          );
        if (/^[-*•]\s+/.test(t)) return <div key={i} className="flex gap-2"><span className="text-slate-400">•</span><span>{inline(t.replace(/^[-*•]\s+/, ""))}</span></div>;
        if (/^#+\s/.test(t)) return <div key={i} className="font-semibold">{inline(t.replace(/^#+\s/, ""))}</div>;
        return <p key={i}>{inline(t)}</p>;
      })}
    </div>
  );
}
