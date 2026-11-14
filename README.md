# CancerPath AI

**Where does each Finnish county lose ground on the cancer pathway, and what should it do on Monday?**

Built at **Junction 2026** for the **AstraZeneca "Equal Care Across Finland"** challenge (team TachyKnights).

CancerPath AI combines public indicators for all 21 wellbeing services counties plus the City of Helsinki. For each county it finds the stage where the cancer pathway falls behind: **detection → referral → diagnosis/treatment → outcome**. It then turns that gap into a ranked **90-day action plan**: owner, KPI, evidence, and the National Cancer Strategy roadmap action it implements. A **Gemini-powered analyst** writes a 2-minute decision brief, in English or Finnish, that cites a source for every claim. An automatic **number check** flags any figure that does not appear in the source data.

**Live demo:** https://cancerpath-ai.vercel.app

## What it shows (Goal 3 of the National Cancer Strategy 2026–2035)

| Pathway stage | Indicators (THL Sotkanet) |
|---|---|
| Detection | Breast (3621), cervical (3620) and colorectal (6103) screening participation vs the 80% target; non-urgent GP visits waiting > 7 days (6411) |
| Referral | People waiting > 6 months for specialist care per 10,000 (3336) |
| Diagnosis → Treatment | **No public county data.** Action A7 shows how to start measuring it with THL 21/2016 definitions |
| Outcome | 5-year relative survival for colon (3627), breast (3625) and cervical (3626) cancer (Finnish Cancer Registry) |

## Run it (one command)

```bash
npm install && npm run dev        # http://localhost:3000
```

Optional AI analyst: copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`. Without a key, the app falls back to a deterministic rule-based brief, so the demo never breaks.

Rebuild the dataset from the live THL API:

```bash
npm run data    # writes lib/data/dataset.json (committed, so the app also works offline)
```

## Method (short)

- Each indicator gets a direction-adjusted z-score against the other counties. A **stage score** is the mean z-score of that stage's indicators, and the **weakest stage** is where the gap emerges.
- **Robust gap** = z ≤ −1 *and* in the worst quartile in ≥ 3 of the last 5 years. This avoids over-reading one noisy year.
- **Early warning** = the indicator worsened by ≥ 5 pp (or ≥ 15/10,000 for waiting) over 3 years.
- Actions (`lib/actions.ts`) are triggered by gaps in their linked indicators. Every action names an owner, a KPI, roadmap action IDs and evidence (PubMed/DOI/official links, checked to resolve).
- The AI analyst (`app/api/analyst/route.ts`) receives only cited facts (data plus strategy pages). Its answer is post-checked: numbers not present in the context are flagged.

Full sources and limitations: `/sources` page in the app.

## Data & licences

- THL Sotkanet indicator bank, CC BY 4.0 (incl. Finnish Cancer Registry survival indicators)
- Statistics Finland wellbeing services county boundaries 2025, CC BY 4.0
- Kansallinen syöpästrategia 2026–2035 and Toimeenpanon tiekartta 2026–2031 (challenge resources)
- THL Ohjaus 21/2016: Hoitoonpääsyn seuranta syövän hoidossa

Public aggregate data only. No patient-level data is used.

## Tech

Next.js 15 · TypeScript · Tailwind CSS · d3-geo (SVG map, no tiles) · Google Gemini API (Best Use of Gemini API tech challenge).

## License

MIT, see [LICENSE](LICENSE).
