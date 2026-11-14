# Pitch pack: three versions + hard questions

**Before any pitch:** open https://cancerpath-ai.vercel.app on the laptop. At 13:50, generate the English and Finnish briefs for Päijät-Häme (/county/09) and North Karelia (/county/14) so they load from the cache. Keep a screen recording of the full demo on the laptop as an offline backup, plus a phone hotspot.

## A. 90-second table pitch (peer review, non-experts)
1. (15 s) "A third of Finnish cancer patients needed three or more visits before diagnosis, and no county can see where the time goes."
2. (45 s) Pick a county → pathway strip → "the gap emerges here" → "Do this first" → open one action (owner, KPI, people reached, who to learn from).
3. (20 s) "Gemini writes the board brief in Finnish, and every number is checked against its cited source." Click "Download 1-page brief".
4. (10 s) "It works for all 22 counties today, on public data. Next: a 90-day pilot with one county."

## B. 2:45 stage pitch (top 5; the mic is cut at 3:00)
- 0:00 Hook: survey (a third needed 3+ visits) + Päijät-Häme colon survival 70→63% while Finland rose.
- 0:25 Problem: Goal 3 promises treatment within target times, but nobody publishes those times by county and cancer type; stage is recorded for only 42% of cancers (72% in Pirkanmaa).
- 0:50 Demo: map → Päijät-Häme → pathway → do-first → plan.
- 1:50 Trust: source on every number, tied-number check, limitations page.
- 2:15 Impact: e.g. ≈ 5,000 more women screened per round in Päijät-Häme if cervical screening reached 80%. National recommendations.
- 2:35 Ask: 90-day pilot (Pirkanmaa → Päijät-Häme).

## C. 5-minute AstraZeneca demo
1. (30 s) Hook as above.
2. (45 s) Goal 3 framing: equal outcomes. Colon survival differs by 11 points between counties, breast by 5. Show finding 2 (no county-level treatment times) and finding 3 (screening misses women born abroad).
3. (60 s) Päijät-Häme page: on-par detection, behind outcome → gap after the first GP contact. Contrast with North Karelia (referral step).
4. (60 s) Actionability: "Do this first", open A7 (validate dates first, Hilmo), A6, and a screening action with reach and "learn from".
4b. (20 s) Future: scroll to "Looking ahead to 2035" (North Karelia cervical: moving away, ≈ 64% by 2035) and the map view "on track for 80% by 2035?".
5. (40 s) Trust: open "Show all indicators", the hatched HUS area on the map, and /sources.
6. (40 s) AI: Finnish brief from the cache, "16/16 numbers tied to their cited source", then the printable brief.
7. (25 s) Close: national recommendations + pilot modelled on AstraZeneca's own 2025 kidney-disease pilot with Pirkanmaa.

## Hard questions
- **"Doesn't THL already publish cancer waits?"** Nationally it reports how many patients exceed the 180-day legal limit (about 600–700, under 2%, in 2024; IHE 2026), and some counties publish statistics for all cancers together. What is missing is referral-to-treatment time by county and cancer type against the THL 21/2016 targets.
- **"Isn't r = −0.81 just Uusimaa?"** Yes, without Uusimaa and Helsinki it drops to about −0.3. That's why we lead with individual-level data: breast screening 82% vs 63% by mother tongue; cervical 73% vs 46% for women born in Africa.
- **"Is the GP-waiting trend a reporting artefact?"** Partly. Monitoring coverage grew from 15 to 21 counties in 2021–23, the care guarantee was relaxed, and THL linked the 2023 slowdown to IT changes. So we use a 3-year average and don't headline it.
- **"Is Helsinki's near-zero specialist wait real?"** No. It reports about 0 every year with gaps, so we exclude it and hatch the HUS area on the map.
- **"Is 63% vs 66% survival real?"** Differences within ±2 points (±3 for counties under 100,000 people) are treated as normal variation and never scored.
- **"Why should Päijät-Häme believe the plan?"** It starts by measuring, with the county's own data, the step we can't see. The other actions have Nordic or Finnish evidence and a county to learn from.
- **"What does a pilot cost, and who evaluates it?"** About 0.5 FTE analyst for 3 months using existing records, with no new IT system. Evaluation by a university partner, like AstraZeneca's 2025 kidney-disease pilot (8,248 invited, 4,018 took part).
- **"What about mortality?"** We built an age-standardised mortality ratio by county (SMR, 2021–25) with confidence intervals from Statistics Finland data. Four counties are significantly higher: Kymenlaakso +11%, Satakunta +10%, Lapland +6%, South Ostrobothnia +5%. Päijät-Häme is average, so its problem is colon cancer specifically.
- **"Isn't this only about the past?"** No. Each county gets a projection to 2035 against the 80% screening target ("on track", "too slow" or "moving away", with a band), and the data refreshes itself every week, so in 2028 it shows 2028 data. It also projects demand from ageing: expected cancer deaths +17% nationally by 2035, up to +31% in Uusimaa. It runs as a loop: diagnose, prescribe, project, then monitor with each refresh.
- **"Is this AI or a dashboard?"** The analytics engine finds and ranks gaps and actions; Gemini turns them into a cited board brief, with a check that ties each number to its source.
