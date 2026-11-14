import { findingsFor, IndicatorFinding, Stage, stageScores, weakestStage, screeningImpact } from "./analysis";

export type Evidence = { label: string; url: string; note?: string };
export type Action = {
  id: string;
  title: string;
  stage: Stage;
  level: "Health center" | "Wellbeing services county" | "County + university hospital (YTA)";
  triggers: string[]; // indicator keys that activate this action
  why: string; // the gap it closes
  what: string;
  first90: string[];
  owner: string;
  kpi: string;
  effort: "Low" | "Medium" | "High";
  roadmap: string[]; // National cancer strategy roadmap 2026–2031 action IDs
  resources?: string; // team estimate, not a costed budget
  learnFrom?: { text: string; url?: string }; // fixed peer benchmark when it cannot be computed from the data
  evidence: Evidence[];
};

export const STRATEGY_URL = "https://files.hackjunction.app/resources/Kansallinen_syopastrategia_2026_2035_FINAL.pdf";
export const ROADMAP_URL = "https://files.hackjunction.app/resources/Kansallinen_syopastrategia_toimeenpanon_tiekartta_2026_2031.pdf";
export const STRATEGY_EN_URL = "https://www.iccp-portal.org/sites/default/files/2026-02/National_Cancer_Strategy_2026-2035_Finland.pdf";
export const THL_2016_URL = "https://core.ac.uk/download/78470017.pdf";

export const SYOPA2024_URL = "https://www.verkkouutiset.fi/a/syopatiedoissa-isot-alueelliset-erot-yksi-seutu-erottuu/";

export const ACTIONS: Action[] = [
  {
    id: "A1",
    resources: "Kits and analysis through the existing screening laboratory; ~0.2 FTE coordinator for 3 months",
    title: "Mail HPV self-sampling kits to women who still have not attended after the reminder letter",
    stage: "detection",
    level: "Wellbeing services county",
    triggers: ["screen_cervical"],
    why: "Cervical screening participation is below the strategy's 80% target in this county.",
    what: "Keep the reminder letter as the first reminder. Women who still have not attended then receive an HPV self-sampling kit by post as a second reminder, so they can test at home. A Finnish cost analysis found this order the most cost-effective.",
    first90: [
      "Pull the list of last-round non-attenders from the screening register",
      "Procure validated self-sampling kits through the existing screening laboratory contract",
      "Send kits to one age cohort as a pilot and track the return rate weekly",
    ],
    owner: "County screening programme coordinator",
    kpi: "Cervical screening participation ≥ 80% (strategy Goal 2 target, every county)",
    effort: "Low",
    roadmap: ["2.3", "2.4"],
    evidence: [
      { label: "Arbyn et al. BMJ 2018: self-sampling increases participation among under-screened women (meta-analysis)", url: "https://doi.org/10.1136/bmj.k4823" },
      { label: "Virtanen et al. Int J Cancer 2011: Finnish trial of self-sampling vs reminder letter for non-attenders", url: "https://pubmed.ncbi.nlm.nih.gov/20669228/" },
      { label: "Virtanen, Anttila, Nieminen. BMC Women's Health 2015: a letter works best as the first reminder, self-sampling as the second", url: "https://pubmed.ncbi.nlm.nih.gov/26542953/" },
    ],
  },
  {
    id: "A2",
    resources: "Reminder step in the existing invitation system; translated invitation texts; ~0.2 FTE",
    title: "Targeted reminders and multilingual invitations for colorectal screening, with a focus on men",
    stage: "detection",
    level: "Wellbeing services county",
    triggers: ["screen_colorectal"],
    why: "Colorectal screening participation is below 80%; nationally men participate far less than women.",
    what: "Add an SMS/letter reminder at 4 weeks, send invitations in the resident's registered language, and attach a short GP-endorsed message aimed at men.",
    first90: [
      "Split the latest participation by sex, language and postcode area",
      "Add an automated reminder step to the invitation workflow",
      "A/B test a men-focused invitation text in one screening cohort",
    ],
    owner: "County screening programme coordinator + communications",
    kpi: "Colorectal screening participation ≥ 80%; halve the men–women participation gap",
    effort: "Low",
    roadmap: ["2.3", "1.3"],
    evidence: [
      { label: "Sabatino et al. Am J Prev Med 2012: Community Guide systematic reviews – client reminders increase breast, cervical and colorectal screening", url: "https://pubmed.ncbi.nlm.nih.gov/22704754/" },
      { label: "THL / Cancer Society of Finland colorectal screening programme", url: "https://syoparekisteri.fi/" },
    ],
  },
  {
    id: "A3",
    resources: "Extra evening/weekend shifts at one mammography unit; online rebooking in the existing system",
    title: "Reduce barriers to breast screening in urban areas: rebooking, evening slots and outreach",
    stage: "detection",
    level: "Wellbeing services county",
    triggers: ["screen_breast"],
    why: "Breast screening participation is low compared with other counties (mostly urban Uusimaa).",
    what: "Offer one-click online rebooking, evening and weekend mammography slots, reminders, and community outreach to foreign-language speakers.",
    first90: [
      "Map non-participation by postcode area and language",
      "Open online rebooking and add evening slots at one screening unit",
      "Partner with 2–3 community organisations for outreach",
    ],
    owner: "County screening programme coordinator",
    kpi: "Breast screening participation ≥ 80% (strategy Goal 2 target)",
    effort: "Medium",
    roadmap: ["2.3", "1.3"],
    evidence: [
      { label: "Sabatino et al. Am J Prev Med 2012: reducing structural barriers and client reminders increase breast cancer screening (Community Guide reviews)", url: "https://pubmed.ncbi.nlm.nih.gov/22704754/" },
    ],
  },
  {
    id: "A4",
    resources: "≈ 2 protected GP slots per day per health center from existing capacity; updated nurse triage script; no new hires",
    title: "Suspected-cancer fast lane in primary care: red-flag triage plus a protected next-day GP slot",
    stage: "detection",
    level: "Health center",
    triggers: ["phc_wait7"],
    why: "A large share of non-urgent GP visits wait more than 7 days, so patients with possible cancer symptoms can get stuck in the general queue.",
    what: "Nurses triage contacts against a short national red-flag symptom list. A positive match gets a protected GP slot within 1–2 working days instead of entering the non-urgent queue.",
    first90: [
      "Adopt a symptom-based red-flag checklist (e.g. modelled on NICE NG12) in the triage script",
      "Reserve 2 protected 'suspected cancer' GP slots per day per health center",
      "Log the triage-to-GP time for flagged patients and review it monthly",
    ],
    owner: "Chief physician, primary care (health center)",
    kpi: "≥ 90% of red-flag contacts seen by a GP within 2 working days",
    effort: "Low",
    roadmap: ["2.5.1", "2.5.2"],
    evidence: [
      { label: "NICE NG12: Suspected cancer – recognition and referral (symptom-based criteria)", url: "https://www.nice.org.uk/guidance/ng12" },
      { label: "National Cancer Strategy 2026–2035, sub-goal 2.5 (p. 30–31): primary care access delays early diagnosis", url: STRATEGY_URL },
    ],
  },
  {
    id: "A5",
    resources: "Referral-system change, a 48-hour triage rota in the specialist unit, reserved imaging slots",
    title: "Standardised 'suspicion of cancer' referral with direct access to diagnostics",
    stage: "referral",
    level: "County + university hospital (YTA)",
    triggers: ["spec_wait6m", "phc_wait7"],
    why: "Long specialist-care queues mean a referral can wait months unless it is clearly flagged as suspected cancer.",
    what: "Add a mandatory 'suspected cancer' flag and criteria to the eReferral, with a 48-hour triage promise. Give GPs direct booking of key tests (CT, colonoscopy, ultrasound) for patients who meet the criteria, as in the Nordic cancer patient pathways.",
    first90: [
      "Agree on referral criteria for the 5 most common cancers with the university hospital (YTA agreement)",
      "Add the flag and a 48-hour triage service level to the referral system",
      "Open direct-access imaging slots and measure referral-to-test days",
    ],
    owner: "Medical director of the county + head of the specialist referral unit",
    kpi: "≥ 90% of suspected-cancer referrals triaged within 2 working days; median referral → diagnostic test ≤ 14 days",
    effort: "Medium",
    roadmap: ["2.5.2", "3.1.2"],
    evidence: [
      { label: "Danish cancer patient pathways (Kræftpakkeforløb), Sundhedsstyrelsen", url: "https://www.sst.dk/da/Viden/Kraeft/Kraeftpakkeforloeb" },
      { label: "Jensen et al. BMC Cancer 2015: diagnostic intervals shortened after Denmark introduced cancer pathways", url: "https://pubmed.ncbi.nlm.nih.gov/25900050/" },
      { label: "Implementation roadmap action 2.5.2 (p. 52–53): standardised referral criteria on the Nordic model", url: ROADMAP_URL },
    ],
  },
  {
    id: "A6",
    resources: "One weekly diagnostic-centre clinic (internist + nurse) with reserved imaging and lab slots",
    title: "Diagnostic centre pathway for serious but non-specific symptoms",
    stage: "referral",
    level: "County + university hospital (YTA)",
    triggers: ["spec_wait6m", "surv_colon"],
    why: "Patients with vague symptoms (weight loss, fatigue, anaemia) bounce between visits and fall outside organ-specific pathways.",
    what: "Create one diagnostic-centre route where a GP can refer a patient with serious non-specific symptoms for a coordinated work-up within 1–2 weeks.",
    first90: [
      "Define entry criteria (e.g. unexplained weight loss, anaemia, raised inflammatory markers)",
      "Set up a weekly diagnostic-centre clinic slot at the central hospital",
      "Track time to diagnosis and the cancer detection rate",
    ],
    owner: "Central hospital internal medicine + primary care",
    kpi: "Median referral → diagnosis ≤ 14 days for diagnostic-centre referrals",
    effort: "Medium",
    roadmap: ["2.5.2", "3.1.2"],
    evidence: [
      { label: "Danish pathway for non-specific symptoms of serious illness (diagnostic centres), Sundhedsstyrelsen", url: "https://www.sst.dk/da/Viden/Kraeft/Kraeftpakkeforloeb" },
      { label: "Swedish standardised cancer care pathways (SVF) incl. 'serious non-specific symptoms'", url: "https://cancercentrum.se/" },
    ],
  },
  {
    id: "A7",
    learnFrom: { text: "Pirkanmaa: Finland's most complete cancer data (stage recorded for 72% of new cancers vs 42% nationally, Syöpä 2024)", url: SYOPA2024_URL },
    resources: "~0.5 FTE analyst for 3 months using existing patient-record data; no new IT system",
    title: "Start measuring time-to-treatment now using THL's 2016 definitions",
    stage: "treatment",
    level: "Wellbeing services county",
    triggers: ["__always__"],
    why: "Waiting times from referral to treatment are not published by county and cancer type against the THL targets. Nationally only the number of patients over the 180-day legal limit is reported (about 600–700, under 2%, in 2024), so the strategy's 'treatment within target times' indicator cannot be followed county by county.",
    what: "Every month, compute referral received → first treatment per cancer type from the county's own patient-record data, using the THL 21/2016 definitions, and publish it next to the national target times.",
    first90: [
      "Validate referral and first-treatment dates in the county's records first (Hilmo covers ~92% of Cancer Registry patients, but these dates have not been validated)",
      "Extract referral-arrival dates, diagnosis codes (C00–C97) and first-treatment procedures from the county's patient records",
      "Apply the THL 21/2016 definitions and calculate the median days and the share treated within target",
      "Share the monthly report with the YTA area and FICAN",
    ],
    owner: "County chief medical officer + analytics/knowledge-management unit",
    kpi: "Monthly published share of patients treated within target time, per cancer type",
    effort: "Low",
    roadmap: ["3.1.2", "3.1.4", "3.2"],
    evidence: [
      { label: "THL Ohjaus 21/2016: Hoitoonpääsyn seuranta syövän hoidossa (definitions + target times)", url: THL_2016_URL },
      { label: "Järvelin et al. Lääkärilehti 2019: Hilmo vs Cancer Registry; referral and first-treatment dates still need validation", url: "https://www.laakarilehti.fi/tieteessa/alkuperaistutkimukset/kohti-luotettavaa-syovan-hoitoon-paasyn-seurantaa-hilmon-ja-syoparekisterin-diagnoositietojen-vertailu/" },
      { label: "IHE Cancer Dashboard Finland 2026: ~600–700 patients (under 2%) exceeded the 180-day limit in 2024; county statistics group all cancers together", url: "https://ihe.se/app/uploads/2026/04/IHE-Cancer-Dashboard-Finland_.pdf" },
      { label: "National Cancer Strategy p. 5 + 33: 'patients get treatment within target times' (Goal 3 indicator)", url: STRATEGY_URL },
    ],
  },
  {
    id: "A8",
    resources: "1–2 nurse-navigator FTE for the first pathway",
    title: "Cancer pathway nurse navigator for every new suspected-cancer patient",
    stage: "treatment",
    level: "Wellbeing services county",
    triggers: ["spec_wait6m", "surv_colon", "surv_breast"],
    why: "The roadmap notes that when the service chain is poorly coordinated, the total time to treatment can become very long (p. 13).",
    what: "A named nurse navigator follows each patient from suspected cancer to treatment start, books the next step before the current one ends, and escalates delays.",
    first90: [
      "Appoint 1–2 navigators for the highest-volume pathway (e.g. colorectal)",
      "Give navigators a waitlist view and authority to escalate",
      "Measure days lost between steps before and after",
    ],
    owner: "Head of oncology / cancer center of the county",
    kpi: "Time from diagnosis to treatment start within target for ≥ 80% of patients",
    effort: "Medium",
    roadmap: ["3.1.2", "3.3"],
    evidence: [
      { label: "Freund et al. JNCI 2014: patient navigation improved timely diagnostic resolution (Patient Navigation Research Program)", url: "https://doi.org/10.1093/jnci/dju115" },
      { label: "Implementation roadmap p. 12–13: coordination gaps prolong time to treatment", url: ROADMAP_URL },
    ],
  },
  {
    id: "A9",
    resources: "FIT kits and lab analysis; one GP training session per health center",
    title: "FIT test triage for symptomatic patients in primary care (colorectal)",
    stage: "outcome",
    level: "Health center",
    triggers: ["surv_colon"],
    why: "Colon cancer survival in this county is below the Finnish average, which suggests late diagnosis or slower pathways.",
    what: "GPs use a quantitative faecal immunochemical test (FIT) for patients with lower-GI symptoms to prioritise colonoscopy for those at highest risk.",
    first90: [
      "Agree on FIT thresholds and the referral rule with the endoscopy unit",
      "Train GPs and stock FIT kits at health centers",
      "Audit time from FIT-positive result to colonoscopy",
    ],
    owner: "Primary care chief physician + endoscopy unit",
    kpi: "FIT-positive → colonoscopy ≤ 14 days for ≥ 90% of patients",
    effort: "Low",
    roadmap: ["2.5.2", "3.1.1"],
    evidence: [
      { label: "NICE DG56 (2023): quantitative FIT to guide colorectal cancer pathway referral in primary care", url: "https://www.nice.org.uk/guidance/dg56" },
    ],
  },
  {
    id: "A10",
    resources: "Oncology lead + data analyst for the audit; one weekly remote MDT slot",
    title: "Guideline-adherence audit and regional multidisciplinary team (MDT) review with the university hospital",
    stage: "outcome",
    level: "County + university hospital (YTA)",
    triggers: ["surv_colon", "surv_breast"],
    why: "Survival below the national level, persisting for several years, suggests differences in diagnostics or treatment practice.",
    what: "Run a yearly audit of guideline adherence for colorectal and breast cancer and present every new case at a joint (remote) MDT with the university hospital.",
    first90: [
      "Pick 5 audit indicators per cancer from national/Nordic guidelines",
      "Audit the last 12 months of cases",
      "Set up a weekly remote MDT with the YTA university hospital",
    ],
    owner: "County oncology lead + YTA university hospital",
    kpi: "≥ 95% of new cases reviewed by an MDT; close the survival gap to the national level",
    effort: "Medium",
    roadmap: ["3.1.1", "3.2"],
    evidence: [
      { label: "Boland et al. Cancer 2013: guideline adherence associated with better colon cancer survival (cited in roadmap)", url: "https://pubmed.ncbi.nlm.nih.gov/23280510/" },
      { label: "Seppä, Malila, Pitkäniemi. Acta Oncol 2020: survival variation between and within Finnish hospital districts", url: "https://pubmed.ncbi.nlm.nih.gov/32552300/" },
    ],
  },
  {
    id: "A11",
    resources: "Existing remote-visit tools; a travel-support budget",
    title: "Teleoncology and remote follow-up for sparsely populated areas",
    stage: "outcome",
    level: "Wellbeing services county",
    triggers: ["surv_breast", "surv_colon"],
    why: "Distance to treatment matters: palliative radiotherapy use is lower beyond 100 km, and outcomes are worse beyond 50 km (roadmap p. 13).",
    what: "Move appropriate oncology follow-ups, symptom monitoring and palliative consultations to remote visits and the hospital-at-home service so distance does not shape treatment choices.",
    first90: [
      "Identify patients living more than 100 km from the treatment unit",
      "Convert eligible follow-up visits to remote visits",
      "Offer travel support and accommodation for radiotherapy courses",
    ],
    owner: "County oncology + home hospital services",
    kpi: "Share of eligible follow-ups delivered remotely; travel distance no longer predicts treatment choice",
    effort: "Medium",
    roadmap: ["3.3", "3.5.3"],
    evidence: [
      { label: "Jääskeläinen et al. Duodecim 2023: oncological and palliative care as remote services (cited in roadmap)", url: "https://www.duodecimlehti.fi/" },
      { label: "Implementation roadmap p. 13: regional inequality and distance to treatment", url: ROADMAP_URL },
    ],
  },
  {
    id: "A12",
    resources: "Structured stage field in pathology and oncology templates; ~0.3 FTE registry nurse for 3 months",
    learnFrom: { text: "Pirkanmaa: stage recorded for 72% of new cancers vs 42% nationally (Syöpä 2024)", url: SYOPA2024_URL },
    title: "Raise stage-at-diagnosis recording to 70% by copying Pirkanmaa's practice",
    stage: "treatment",
    level: "Wellbeing services county",
    triggers: ["__always__"],
    why: "Stage at diagnosis is recorded for only 42% of new cancers nationally (33–42% in most areas), so the strategy's goal of 70% diagnosed at stage I–II cannot be monitored.",
    what: "Make stage a required structured field in the clinical cancer notification and send notifications to the Cancer Registry automatically, learning from Pirkanmaa.",
    first90: [
      "Peer visit: ask Pirkanmaa's cancer centre how it reached 72%",
      "Add a required structured stage field to the pathology and oncology templates",
      "Report the monthly share of new cancers with stage recorded",
    ],
    owner: "County chief medical officer + pathology and oncology leads",
    kpi: "≥ 70% of new cancers with stage recorded (Cancer Registry target)",
    effort: "Low",
    roadmap: ["3.1.4", "3.2"],
    evidence: [
      { label: "Syöpä 2024 report via Verkkouutiset (17.6.2026): stage recorded for 42% nationally, Pirkanmaa 72%, target ≥ 70%", url: SYOPA2024_URL },
      { label: "National Cancer Strategy p. 30 and 36: clinical cancer notifications to cover 90% automatically by 2030", url: STRATEGY_URL },
    ],
  },
];

export type MatchedAction = Action & { score: number; matchedOn: IndicatorFinding[]; impact?: ReturnType<typeof screeningImpact> };

/** Rank actions for a county by how strongly their trigger indicators show a gap. */
export function actionsFor(code: string, limit = 4): MatchedAction[] {
  const f = findingsFor(code);
  const byKey = Object.fromEntries(f.map((x) => [x.key, x]));
  const out: MatchedAction[] = [];
  for (const a of ACTIONS) {
    if (a.triggers.includes("__always__")) {
      out.push({ ...a, score: a.id === "A7" ? 0.75 : 0.5, matchedOn: [] });
      continue;
    }
    const matched = a.triggers.map((k) => byKey[k]).filter((x) => x && (x.signal !== "none" || x.belowTarget || x.earlyWarning));
    if (!matched.length) continue;
    const score = Math.max(
      ...matched.map((m) => (m.z != null ? -m.z : 0) + (m.belowTarget ? 0.6 : 0) + (m.earlyWarning ? 0.4 : 0) + (m.signal === "strong" ? 0.5 : 0))
    );
    const impact = a.triggers.map((k) => screeningImpact(k, code)).find(Boolean);
    // More people reached → higher priority (≈ +0.5 per 2,000 people per round, capped)
    const impactBonus = impact ? Math.min(1, impact.perRound / 4000) : 0;
    out.push({ ...a, score: score + impactBonus, matchedOn: matched, impact });
  }
  // Downstream pattern: outcome is the weakest stage while detection is on par, so the gap is likely created after the
  // first GP contact (symptom recognition, referral, diagnostics, treatment). Prioritise measuring time-to-treatment and downstream actions over screening actions.
  const weak = weakestStage(code);
  const det = stageScores(code).find((s) => s.stage === "detection")?.score;
  const downstream = !!weak && weak.score < -0.35 && weak.stage === "outcome" && det != null && det >= -0.2;
  if (downstream) for (const x of out) x.score += x.id === "A7" ? 3 : x.stage === "outcome" || x.stage === "treatment" || x.id === "A6" || x.id === "A4" ? 1 : 0;
  out.sort((a, b) => b.score - a.score);
  if (downstream) {
    const top = out.slice(0, limit);
    return top.some((x) => x.id === "A7") ? top : [...top.slice(0, limit - 1), out.find((x) => x.id === "A7")!];
  }
  // Always keep the measurement action (A7) in the plan: Goal 3 "treatment within target times" cannot be monitored without it.
  const gapActions = out.filter((x) => x.id !== "A7").slice(0, limit - 1);
  const a7 = out.find((x) => x.id === "A7")!;
  return [...gapActions, a7];
}


/** "Do this first": the highest-ranked low-effort action among the top three, otherwise the top action. */
export function doFirst(plan: MatchedAction[]) {
  return plan.slice(0, 3).find((x) => x.effort === "Low") ?? plan[0];
}
export const DO_FIRST_RULE = "Rule: the highest-ranked low-effort action among the top three (ranked by gap size, distance to target and people reached).";
