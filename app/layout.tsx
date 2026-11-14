import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CancerPath AI — Equal cancer care across Finland",
  description: "Locates where each Finnish wellbeing services county's cancer pathway falls behind, and recommends evidence-based actions. Built at Junction 2026 for the AstraZeneca challenge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
                <circle cx="6" cy="16" r="4" fill="#d97706" />
                <circle cx="14" cy="16" r="4" fill="#dc2626" />
                <circle cx="22" cy="16" r="4" fill="#7c3aed" />
                <circle cx="29" cy="16" r="3" fill="#0f766e" />
              </svg>
              CancerPath <span className="text-sky-700">AI</span>
            </Link>
            <nav className="flex gap-4 text-sm text-slate-600">
              <Link href="/" className="hover:text-slate-900">Finland</Link>
              <Link href="/actions" className="hover:text-slate-900">Action library</Link>
              <Link href="/analyst" className="hover:text-slate-900">AI analyst</Link>
              <Link href="/sources" className="hover:text-slate-900">Sources &amp; method</Link>
            </nav>
            <span className="ml-auto hidden text-xs text-slate-500 md:block">Public aggregate data only · No patient data</span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-xs text-slate-500 print:hidden">
          CancerPath AI · Junction 2026 · AstraZeneca &quot;Equal Care Across Finland&quot; challenge · Data: THL Sotkanet (CC BY 4.0), Finnish Cancer Registry via Sotkanet, Statistics Finland boundaries (CC BY 4.0) · MIT License
        </footer>
      </body>
    </html>
  );
}
