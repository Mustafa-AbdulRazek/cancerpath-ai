# Junction platform submission: copy/paste

**Project name (≤30):** CancerPath AI

**Punchline (≤200):**
Shows every Finnish wellbeing services county where its cancer pathway falls behind (detection, referral, treatment or outcome) and turns it into a sourced, Goal 3-aligned 90-day action plan.

**Challenge:** AstraZeneca – Equal Care Across Finland
**Tech challenge:** Google DeepMind – Best Use of Gemini API

**Description (≤5000, markdown):**

## The problem
Finland's National Cancer Strategy 2026–2035 sets Goal 3: *equal and effective cancer care*, with patients treated within target times wherever they live. But a county decision-maker cannot see **where** in the pathway their patients lose time. Time from referral to treatment is not in national open data for any county, stage at diagnosis is recorded for only ~40% of cancers (strategy p.30), and regional comparisons are "occasional and based on coarse measures" (p.35).

## What we built
**CancerPath AI** combines open THL Sotkanet and Finnish Cancer Registry indicators for all 21 wellbeing services counties plus Helsinki, and maps them onto the cancer pathway:

1. **Detection:** breast, cervical and colorectal screening participation vs the strategy's 80% target; GP access (non-urgent visits waiting > 7 days)
2. **Referral:** people waiting > 6 months for specialist care
3. **Diagnosis → Treatment:** no public data. We show this blind spot and how to close it.
4. **Outcome:** 5-year relative survival (colon, breast, cervical)

Goal 3 means equal outcomes, so we start from unequal **survival** and trace it back to the pathway stage where the gap is likely created. It separates **robust gaps** (persistently in the worst quartile) from noise, and flags **early warnings** (fast deterioration).

## Insights it reveals (all sourced)
- **Survival first:** Päijät-Häme has Finland's **fastest GP access** yet the **lowest colon cancer survival (70% → 63%, 2019→2024)**, while Vantaa–Kerava has the slowest GP access but top-3 survival. GP access alone does not explain survival: the gap is likely created downstream, in diagnosis and treatment, the stage nobody measures. (Survival is a period estimate; we present it as a sustained decline to explain.)
- More than half of non-urgent GP visits now wait > 7 days (**38.3% → 54.7%**, 2021→2025). Part of this reflects the relaxed legal care guarantee, which we flag transparently.
- People waiting > 6 months for specialist care (all specialties, a congestion proxy): **99 per 10,000 in North Karelia vs 36 for Finland** (2025). HUS-area data is incomplete, so Helsinki is excluded and those areas are hatched on the map.
- **Equity:** breast screening participation is strongly lower where the share of foreign citizens is higher (**r = −0.81**, 22 areas), so the screening gap sits in diverse urban areas.
- Colorectal screening is below 80% in **all 22 areas**, and cervical screening in 20 of 22. Men participate in colorectal screening far less than women (**69.2% vs 77.7%**).
- Colon cancer 5-year survival ranges from **63% to 74%** between counties.

## Actionability
Every county gets a ranked **90-day action plan**, ranked by gap size and **people reached** (e.g. North Karelia: ≈ 4,000 more women screened per round with HPV self-sampling; Helsinki: ≈ 6,700 more people in colorectal screening per round, using Statistics Finland age-group populations). Each action also has a resource line (team estimate). Each action names the **owner** (e.g. county screening coordinator, primary care chief physician, YTA university hospital), **first three steps**, a **KPI**, the **National Cancer Strategy roadmap action** it implements (2.5.1, 2.5.2, 3.1.2, 3.1.4, 3.2…), and **evidence**. Examples:
- HPV self-sampling kits for screening non-attenders (Finnish RCT, BMJ meta-analysis)
- Standardised "suspected cancer" referral with direct access to diagnostics, on the Danish/Swedish/Norwegian pathway model the roadmap itself recommends
- Primary-care red-flag fast lane, nurse navigators, FIT triage, regional MDT audits
- **Start measuring time-to-treatment in 90 days** with the county's own data and THL 21/2016 definitions, which unlocks the Goal 3 "within target times" indicator

## AI that a decision-maker can trust
A **Google Gemini** analyst writes a **2-minute decision brief** (English or Finnish) and answers questions. It receives only cited facts (indicator data plus the strategy and roadmap pages), must cite a source for every sentence, and is **post-checked automatically**: any number not found in the source data is flagged. If the AI is unavailable, a rule-based brief keeps the demo working.

## Data quality & transparency
Source badge on every number · indicator metadata links · reproducible ETL (`npm run data`) · dedicated limitations page (e.g. waiting data covers all specialties, small-county survival uncertainty, no causal claims) · public aggregate data only, no patient data.

## Tech
Next.js 15, TypeScript, Tailwind, d3-geo SVG map, Google Gemini API (gemini-3.5-flash with lite fallbacks), THL Sotkanet REST API, Statistics Finland boundaries. MIT licensed.

## How we used Gemini (tech challenge)
Gemini generates grounded county decision briefs and Q&A in English and Finnish from a structured, cited context. We add citation enforcement, a numeric hallucination check and a deterministic fallback.

**Source code:** https://github.com/Mustafa-AbdulRazek/cancerpath-ai
**Demo:** https://cancerpath-ai.vercel.app
**Video:** (YouTube/Vimeo, ≤ 2:00, public/unlisted)
