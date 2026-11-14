"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-[6px] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
      Print or save as PDF
    </button>
  );
}
