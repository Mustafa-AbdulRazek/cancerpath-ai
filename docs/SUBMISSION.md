# Junction platform submission: copy/paste

**Project name (≤30):** CancerPath AI

**Punchline (≤200):**
Shows every Finnish wellbeing services county where its cancer pathway falls behind, and what to do about it: a sourced, Goal 3-aligned 90-day plan with owners, KPIs and people reached.

**Challenge:** AstraZeneca – Equal Care Across Finland
**Tech challenge:** Google DeepMind – Best Use of Gemini API

**Description (≤5000, markdown):**

## The problem
Goal 3 of Finland's National Cancer Strategy 2026–2035 promises equal outcomes and treatment within target times, wherever you live. But no county can see where in the pathway its patients lose time. Referral-to-treatment times are not published by county and cancer type; nationally only the number of patients over the 180-day legal limit is reported (about 600–700, under 2%, in 2024). Stage at diagnosis is recorded for only 42% of new cancers (72% in Pirkanmaa).

## What we built
**CancerPath AI** covers all 21 wellbeing services counties and Helsinki, using public THL Sotkanet, Finnish Cancer Registry and Statistics Finland data. It follows one path: **pick a county → see where its pathway falls behind → see what to do → take the brief away.**

- **Pathway view:** detection (screening, GP access), referral (specialist queue, a proxy), diagnosis → treatment (not publicly measured, shown as a gap), outcome (5-year survival). It shows where the county falls behind, as a plain rank ("21st of 22").
- **90-day plan:** 5 ranked actions per county, plus a "Do this first" pick with its rule shown. Each action has an owner, first 90 days, KPI, people reached, resources, a county to **learn from**, the **national roadmap action** it delivers (2.5.2, 3.1.2, 3.1.4, 3.2…) and peer-reviewed or official evidence.
- **National recommendations:** a suspected-cancer flag in the national eReferral; publishing referral-to-treatment times by county and cancer type (THL 21/2016 definitions); stage recording as a quality indicator (target 70%).
- **Pilot proposal:** 90 days in one county (Pirkanmaa first, then Päijät-Häme), modelled on AstraZeneca Finland's 2025 kidney-disease screening pilot.

## What it reveals (all sourced)
- **Outcomes first:** colon cancer 5-year survival differs by 11 points between counties (63–74%), breast cancer by only 5. In Päijät-Häme it fell from 70% to 63% (2019→2024) while Finland rose to 68%. A third of patients needed 3+ contacts before diagnosis (2025 survey), so the gap may be created after the first GP contact: symptom recognition, referral, diagnostics.
- **Cancer mortality by county (new):** age-standardised mortality ratio (SMR, 2021–25, 95% CI) built from Statistics Finland data. Kymenlaakso (+11%), Satakunta (+10%), Lapland (+6%) and South Ostrobothnia (+5%) have significantly more cancer deaths than their age structure predicts. Lung cancer is where Finland is furthest from the Nordic level (5-year survival, men 17% vs Norway 30%), so these counties get a lung fast-track action.
- **Referral congestion:** 99 per 10,000 waited over 6 months for specialist care in North Karelia vs 36 for Finland (all specialties, used as a proxy).
- **Who screening misses:** breast screening 82% among native speakers vs 63% for other mother tongues; cervical screening 73% for women born in Finland vs 46% for women born in Africa. These figures confirm the county-level pattern in the capital region.
- **Reach:** e.g. ≈ 5,000 more women screened per round in Päijät-Häme if cervical screening reached 80% (Statistics Finland age-group populations).

## Built to be trusted
- A source link on every number, a reproducible data pipeline (`npm run data`) and a limitations page.
- Honest data handling. Helsinki's incomplete specialist-waiting data is excluded, and missing data is hatched on the map. GP waiting uses a 3-year average because recording changed. Small survival differences (within ±2 points, ±3 for small counties) are never scored. County-level correlations carry a robustness check.
- Public aggregate data only, no patient data.

## AI (Gemini)
Gemini writes a 2-minute board brief, in Finnish or English, and answers questions. It sees only cited facts: the county data, the strategy and roadmap pages, and verified reports. Every sentence must cite a source. A **citation-tied number check** confirms that each number appears in the source it cites (e.g. "16/16 numbers tied"). Briefs are cached for a fast demo. A rule-based one-page brief works without AI.

## Tech
Next.js 15, TypeScript, Tailwind, d3-geo SVG map, Google Gemini API (gemini-3.1-flash-lite with fallbacks), THL Sotkanet REST API, Statistics Finland PxWeb API. MIT licensed.

**Source code:** https://github.com/Mustafa-AbdulRazek/cancerpath-ai
**Demo:** https://cancerpath-ai.vercel.app
**Video:** (YouTube/Vimeo, ≤ 2:00, public/unlisted)
