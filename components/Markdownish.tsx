import { Fragment } from "react";

/** Tiny renderer for **bold**, bullet lists and citation tags — avoids pulling in a markdown dependency. */
export default function Markdownish({ text }: { text: string }) {
  const lines = text.split("\n");
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*|\[[A-Z]\d+[a-z]?(?:[,;\s]+[A-Z]\d+[a-z]?)*\])/g).map((part, i) => {
      if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (/^\[[A-Z]\d/.test(part)) return <sup key={i} className="ml-0.5 rounded bg-sky-100 px-1 text-[10px] font-semibold text-sky-800">{part.slice(1, -1)}</sup>;
      return <Fragment key={i}>{part}</Fragment>;
    });
  return (
    <div className="space-y-1.5 text-[15px] leading-relaxed">
      {lines.map((l, i) => {
        const t = l.trim();
        if (!t) return <div key={i} className="h-1" />;
        if (/^[-*•]\s+/.test(t)) return <div key={i} className="flex gap-2"><span className="text-slate-400">•</span><span>{inline(t.replace(/^[-*•]\s+/, ""))}</span></div>;
        if (/^#+\s/.test(t)) return <div key={i} className="font-semibold">{inline(t.replace(/^#+\s/, ""))}</div>;
        return <p key={i}>{inline(t)}</p>;
      })}
    </div>
  );
}
