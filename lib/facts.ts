/** External facts used in the app. Each was read and checked against its source on 14 Nov 2026. */
export const IHE_URL = "https://ihe.se/app/uploads/2026/04/IHE-Cancer-Dashboard-Finland_.pdf";
export const SURVEY_URL = "https://www.sttinfo.fi/tiedote/70972938/kyselyselvitys-joka-kolmas-syopapotilas-kokee-diagnoosin-viivastyneen?publisherId=69820264";
export const CERVICAL_BIRTH_URL = "https://www.sttinfo.fi/tiedote/72484607/tutkimus-kohdunkaulasyovan-seulonta-ei-tavoita-kaikkia-naisia-yhta-hyvin?publisherId=69820264";
export const SCREEN_REGIONS_URL = "https://www.sttinfo.fi/tiedote/72173590/kolme-aluetta-erottuu-edukseen-syopaseulonnoissa-helsingissa-osallistuminen-jaa-selvasti-jalkeen?lang=fi";
export const STAGE_URL = "https://www.verkkouutiset.fi/a/syopatiedoissa-isot-alueelliset-erot-yksi-seutu-erottuu/";
export const THL_RRF_URL = "https://www.innokyla.fi/sites/default/files/2026-07/Hoitoonp%C3%A4%C3%A4sytiedon%20tietotuotanto%20-projektin%20loppuraportti.pdf";
export const GP_IT_URL = "https://www.verkkouutiset.fi/a/laakarille-paasy-on-hidastunut-selitetaan-tietojarjestelmien-muutoksilla/";
export const AZ_CKD_URL = "https://www.mynewsdesk.com/fi/astrazeneca/pressreleases/ensimmaeinen-kroonisen-munuaistaudin-seulontapilotti-onnistui-ja-toi-hyvinvointialueille-tyoekalun-seulonnan-vaikuttavuuden-arviointiin-3408579";
export const JARVELIN_URL = "https://www.laakarilehti.fi/tieteessa/alkuperaistutkimukset/kohti-luotettavaa-syovan-hoitoon-paasyn-seurantaa-hilmon-ja-syoparekisterin-diagnoositietojen-vertailu/";

export const FACTS = {
  nordic: { text: "Finland has the lowest 5-year survival for all cancers in the Nordic countries (men 69%, women 73%). Lung cancer 5-year survival is 17% for men vs 30% in Norway, and 29% for women vs 37%", source: "IHE Cancer Dashboard Finland 2026 (NORDCAN)", url: IHE_URL },
  lungWait: { text: "In a 2025 Nordic study of lung cancer pathways, getting a primary-care appointment took 14 days in Finland vs 2–7 days in Denmark, Norway and Sweden", source: "Khalife et al. 2025, via IHE 2026", url: IHE_URL },
  survey: { text: "A third of cancer patients needed at least three healthcare contacts before diagnosis (684 respondents)", source: "Suomen Syöpäpotilaat survey, 12 Mar 2025", url: SURVEY_URL },
  waits180: { text: "Nationally, about 600–700 cancer patients (under 2%) exceeded the 180-day treatment limit in 2024; some counties publish waiting statistics, but for all cancers together", source: "IHE Cancer Dashboard Finland 2026", url: IHE_URL },
  stage: { text: "Stage at diagnosis is recorded for 42% of new cancers nationally; Pirkanmaa 72%, most other areas 33–42%; target at least 70%", source: "Finnish Cancer Registry, Syöpä 2024 (via Verkkouutiset, 17 Jun 2026)", url: STAGE_URL },
  breastLang: { text: "Breast screening: 82% among women whose mother tongue is Finnish, Swedish or Sami vs 63% among other women (2020–21)", source: "Breast screening annual report, via IHE 2026", url: IHE_URL },
  cervicalBirth: { text: "Cervical screening: 73% among women born in Finland, 62% born elsewhere in Europe, 46% born in Africa (2019–23); the gap remains after adjusting for age, education and residence", source: "Finnish Cancer Registry study, 9 Nov 2026", url: CERVICAL_BIRTH_URL },
  screenRegions: { text: "The Cancer Registry's 2024 screening reports name Helsinki, Vantaa–Kerava and West Uusimaa as lowest and South Ostrobothnia, South Savo and Kainuu as highest", source: "Syöpäjärjestöt, 30 Jun 2026", url: SCREEN_REGIONS_URL },
  gpCoverage: { text: "National real-time care-guarantee monitoring covered 15 of 22 counties in 2021, 17 in 2022 and 21 in 2023", source: "THL Hoitoonpääsytiedon tietotuotanto final report", url: THL_RRF_URL },
  azPilot: { text: "AstraZeneca Finland's 2025 kidney-disease screening pilot with Pirkanmaa and Fimlab: 8,248 invited, 4,018 took part, 236 findings, plus a web tool for counties built with the University of Eastern Finland", source: "AstraZeneca press release, 8 Oct 2025", url: AZ_CKD_URL },
};
