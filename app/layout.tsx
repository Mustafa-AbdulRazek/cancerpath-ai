import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "CancerPath AI: equal cancer care across Finland",
  description: "Shows where each Finnish wellbeing services county's cancer pathway falls behind, and what to do about it. Built at Junction 2026 for the AstraZeneca challenge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white print:hidden">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
                <path d="M3 16h26" stroke="#c7cdd4" strokeWidth="2" />
                <circle cx="5" cy="16" r="4" fill="#475569" />
                <circle cx="12.5" cy="16" r="4" fill="#4338ca" />
                <circle cx="20" cy="16" r="4" fill="#7e22ce" />
                <circle cx="27" cy="16" r="4" fill="#92400e" />
              </svg>
              CancerPath AI
            </Link>
            <nav className="flex gap-5 text-sm text-[var(--muted)]">
              <Link href="/" className="hover:text-[var(--ink)]">Counties</Link>
              <Link href="/actions" className="hover:text-[var(--ink)]">Action library</Link>
              <Link href="/sources" className="hover:text-[var(--ink)]">Data &amp; method</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl border-t border-[var(--line)] px-4 py-5 text-xs text-[var(--muted)] print:hidden">
          Public aggregate data only (THL, Finnish Cancer Registry, Statistics Finland). MIT licence. Built at Junction 2026 for the AstraZeneca challenge. <Link href="/sources" className="underline">Sources and limitations</Link>
        </footer>
      </body>
    </html>
  );
}
