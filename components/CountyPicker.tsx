"use client";
import { useRouter } from "next/navigation";

export default function CountyPicker({ counties }: { counties: { code: string; name: string }[] }) {
  const router = useRouter();
  return (
    <label className="block">
      <span className="sr-only">Choose a wellbeing services county</span>
      <select
        defaultValue=""
        onChange={(e) => e.target.value && router.push(`/county/${e.target.value}`)}
        className="w-full rounded-[6px] border border-[var(--line)] bg-white px-3 py-2.5 text-base shadow-none focus:border-[var(--accent)] focus:outline-none sm:w-80"
      >
        <option value="" disabled>Choose your county…</option>
        {counties.map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>
    </label>
  );
}
