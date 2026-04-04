/**
 * Seed the Datatilsynet (Norwegian) database with sample decisions and guidelines
 * for testing.
 *
 * Includes real Norwegian Datatilsynet decisions (Grindr, Oslo Kommune, Stortinget)
 * and representative guidance documents so MCP tools can be tested without
 * running a full data ingestion pipeline.
 *
 * Usage:
 *   npx tsx scripts/seed-sample.ts
 *   npx tsx scripts/seed-sample.ts --force   # drop and recreate
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA_SQL } from "../src/db.js";

const DB_PATH = process.env["NO_DP_DB_PATH"] ?? "data/no-dp.db";
const force = process.argv.includes("--force");

// --- Bootstrap database ------------------------------------------------------

const dir = dirname(DB_PATH);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

if (force && existsSync(DB_PATH)) {
  unlinkSync(DB_PATH);
  console.log(`Deleted existing database at ${DB_PATH}`);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(SCHEMA_SQL);

console.log(`Database initialised at ${DB_PATH}`);

// --- Topics ------------------------------------------------------------------

interface TopicRow {
  id: string;
  name_local: string;
  name_en: string;
  description: string;
}

const topics: TopicRow[] = [
  {
    id: "samtykke",
    name_local: "Samtykke",
    name_en: "Consent",
    description: "Innhenting, gyldighet og tilbaketrekking av samtykke til behandling av personopplysninger (art. 7 GDPR).",
  },
  {
    id: "informasjonskapsler",
    name_local: "Informasjonskapsler (cookies)",
    name_en: "Cookies and trackers",
    description: "Plassering og lesing av informasjonskapsler og sporere på brukerens enhet (ekomloven).",
  },
  {
    id: "overforing",
    name_local: "Overføring til tredjeland",
    name_en: "International transfers",
    description: "Overføring av personopplysninger til tredjeland eller internasjonale organisasjoner (art. 44-49 GDPR).",
  },
  {
    id: "konsekvensvurdering",
    name_local: "Personvernkonsekvensvurdering (DPIA)",
    name_en: "Data Protection Impact Assessment (DPIA)",
    description: "Vurdering av risiko for de registrertes rettigheter og friheter ved høyrisiko-behandling (art. 35 GDPR).",
  },
  {
    id: "avvik",
    name_local: "Avviksbehandling",
    name_en: "Data breach notification",
    description: "Melding av brudd på personopplysningssikkerheten til Datatilsynet og berørte registrerte (art. 33-34 GDPR).",
  },
  {
    id: "innebygd_personvern",
    name_local: "Innebygd personvern",
    name_en: "Privacy by design",
    description: "Integrering av personvern allerede ved utforming og som standard (art. 25 GDPR).",
  },
  {
    id: "arbeidsforhold",
    name_local: "Personvern i arbeidsforhold",
    name_en: "Employee monitoring",
    description: "Behandling av personopplysninger i arbeidsforhold og overvåking av ansatte.",
  },
  {
    id: "helsedata",
    name_local: "Helseopplysninger",
    name_en: "Health data",
    description: "Behandling av helseopplysninger — særlige kategorier av personopplysninger med forsterkede krav (art. 9 GDPR).",
  },
  {
    id: "innsyn",
    name_local: "Innsynsrett",
    name_en: "Subject access rights",
    description: "De registrertes rett til innsyn i egne personopplysninger og øvrige rettigheter (art. 12-23 GDPR).",
  },
  {
    id: "barn",
    name_local: "Barn og unge",
    name_en: "Children's data",
    description: "Beskyttelse av barn og unges personopplysninger, særlig i digitale tjenester (art. 8 GDPR).",
  },
  {
    id: "kameraovervaking",
    name_local: "Kameraovervåking",
    name_en: "Camera surveillance",
    description: "Kameraovervåking på arbeidsplasser, offentlige steder og boligområder (personopplysningsloven kap. 7).",
  },
];

const insertTopic = db.prepare(
  "INSERT OR IGNORE INTO topics (id, name_local, name_en, description) VALUES (?, ?, ?, ?)",
);

for (const t of topics) {
  insertTopic.run(t.id, t.name_local, t.name_en, t.description);
}

console.log(`Inserted ${topics.length} topics`);

// --- Decisions ---------------------------------------------------------------

interface DecisionRow {
  reference: string;
  title: string;
  date: string;
  type: string;
  entity_name: string;
  fine_amount: number | null;
  summary: string;
  full_text: string;
  topics: string;
  gdpr_articles: string;
  status: string;
}

const decisions: DecisionRow[] = [
  // Grindr — NOK 65 million fine (2021)
  {
    reference: "20/02336",
    title: "Vedtak om overtredelsesgebyr — Grindr LLC",
    date: "2021-12-13",
    type: "overtredelsesgebyr",
    entity_name: "Grindr LLC",
    fine_amount: 65_000_000,
    summary:
      "Datatilsynet ila Grindr LLC et overtredelsesgebyr på 65 millioner kroner for ulovlig deling av personopplysninger med tredjeparter for reklameformål. Grindr delte GPS-posisjon, IP-adresse, reklameid og det faktum at brukeren brukte appen — som avslører seksuell orientering — uten gyldig samtykke.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Grindr LLC. Saken gjaldt Grindrs deling av personopplysninger med annonseteknologiselskaper. Datatilsynet konstaterte at Grindr delte personopplysninger, inkludert GPS-lokasjon, IP-adresse, reklameid og det faktum at en person brukte Grindr, med flere tredjeparter for reklameformål. Ettersom Grindr er en datingapp for menn som har sex med menn, avslører bruk av appen brukerens seksuelle orientering, som er en særlig kategori av personopplysninger etter GDPR artikkel 9. Datatilsynet fant at Grindr ikke hadde gyldig rettslig grunnlag for delingen. Samtykket som ble innhentet gjennom appen var ikke gyldig fordi: (1) brukerne måtte akseptere hele personvernerklæringen for å bruke appen — det var ingen mulighet til å velge bort deling med tredjeparter; (2) informasjonen som ble gitt om datadelingen var utilstrekkelig og vanskelig å forstå; (3) det forelå ikke uttrykkelig samtykke til behandling av særlige kategorier av personopplysninger. Overtredelsesgebyret på 65 millioner kroner ble opprettholdt av Personvernnemnda i vedtak av 12. desember 2022.",
    topics: JSON.stringify(["samtykke", "overforing"]),
    gdpr_articles: JSON.stringify(["6", "9"]),
    status: "final",
  },
  // Oslo Kommune — Osloskolen sak (2021)
  {
    reference: "20/03790",
    title: "Vedtak mot Oslo kommune — Osloskolen elevovervåking",
    date: "2021-10-14",
    type: "vedtak",
    entity_name: "Oslo kommune (Utdanningsetaten)",
    fine_amount: null,
    summary:
      "Datatilsynet ga Oslo kommune pålegg for manglende personvernkonsekvensvurdering (DPIA) og utilstrekkelig informasjon til elever og foresatte om behandling av personopplysninger i digitale læringsplattformer i Osloskolen.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot Oslo kommune ved Utdanningsetaten for behandling av personopplysninger i Osloskolen. Saken gjaldt kommunens bruk av digitale læringsplattformer og verktøy, blant annet iPad-er med programvare som samlet inn betydelige mengder data om elevene. Datatilsynet konstaterte at Oslo kommune: (1) ikke hadde gjennomført personvernkonsekvensvurdering (DPIA) i henhold til GDPR artikkel 35 — den systematiske overvåkingen av barns atferd i en skolekontekst utgjør høyrisiko-behandling; (2) ikke hadde gitt tilstrekkelig informasjon til elever og foresatte om hvilke personopplysninger som ble samlet inn, hvordan de ble behandlet, og hvem som hadde tilgang; (3) ikke hadde tilstrekkelige databehandleravtaler med leverandørene av læringsplattformene. Datatilsynet ga kommunen pålegg om å gjennomføre DPIA, forbedre informasjonen til de registrerte, og inngå tilfredsstillende databehandleravtaler innen fastsatte frister.",
    topics: JSON.stringify(["konsekvensvurdering", "barn"]),
    gdpr_articles: JSON.stringify(["13", "28", "35"]),
    status: "final",
  },
  // Stortinget data breach (2021)
  {
    reference: "21/01209",
    title: "Vedtak mot Stortinget — datainnbrudd e-postsystem",
    date: "2021-06-22",
    type: "vedtak",
    entity_name: "Stortinget",
    fine_amount: null,
    summary:
      "Datatilsynet konkluderte med at Stortinget hadde brutt GDPR artikkel 32 og 33 i forbindelse med datainnbruddet i Stortingets e-postsystem i august og september 2020, der uvedkommende fikk tilgang til e-postkontoer tilhørende stortingsrepresentanter og ansatte.",
    full_text:
      "Datatilsynet har fattet vedtak i saken om datainnbruddet i Stortingets e-postsystem. I august og september 2020 ble Stortingets e-postsystem utsatt for et cyberangrep der uvedkommende fikk tilgang til e-postkontoer tilhørende stortingsrepresentanter og ansatte. Personopplysninger inkludert e-postinnhold, vedlegg og kontaktinformasjon ble kompromittert. Datatilsynet konstaterte at Stortinget: (1) ikke hadde implementert tilstrekkelige tekniske og organisatoriske tiltak for å sikre e-postsystemet i henhold til GDPR artikkel 32 — spesielt manglet tofaktorautentisering på e-postkontoene; (2) ikke meldte bruddet til Datatilsynet innen 72-timersfristen i GDPR artikkel 33, noe som forsinket muligheten for å iverksette beskyttende tiltak for de berørte; (3) ikke hadde tilstrekkelige rutiner for hendelseshåndtering og varsling. Datatilsynet uttalte alvorlig kritikk av Stortingets manglende sikkerhetstiltak og manglende overholdelse av meldeplikten. Saken illustrerer at offentlige institusjoner, inkludert nasjonalforsamlingen, er underlagt de samme personvernreglene som andre virksomheter.",
    topics: JSON.stringify(["avvik"]),
    gdpr_articles: JSON.stringify(["32", "33"]),
    status: "final",
  },
  // Norwegian municipality — biometric employee tracking
  {
    reference: "21/03482",
    title: "Vedtak mot kommune — biometrisk tidsregistrering",
    date: "2022-03-10",
    type: "vedtak",
    entity_name: "Senja kommune",
    fine_amount: 500_000,
    summary:
      "Datatilsynet ila Senja kommune et overtredelsesgebyr på 500 000 kroner for bruk av fingeravtrykksbasert tidsregistrering av ansatte uten tilstrekkelig rettslig grunnlag og uten å ha gjennomført en personvernkonsekvensvurdering.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Senja kommune for behandling av biometriske personopplysninger. Kommunen brukte et system for tidsregistrering basert på de ansattes fingeravtrykk. Fingeravtrykk er biometriske data og utgjør en særlig kategori av personopplysninger etter GDPR artikkel 9. Datatilsynet konstaterte at Senja kommune: (1) ikke hadde gyldig rettslig grunnlag for behandlingen — samtykke fra ansatte i et arbeidsforhold er normalt ikke gyldig på grunn av maktforholdet, og det forelå ikke nødvendig unntakshjemmel etter personopplysningsloven § 6; (2) ikke hadde gjennomført en personvernkonsekvensvurdering (DPIA) i henhold til GDPR artikkel 35 — bruk av biometriske data for å identifisere enkeltpersoner er en behandling som sannsynligvis medfører høy risiko; (3) ikke hadde gitt tilstrekkelig informasjon til de ansatte om behandlingen i henhold til GDPR artikkel 13. Datatilsynet ila kommunen et overtredelsesgebyr på 500 000 kroner og ga pålegg om å avslutte bruken av fingeravtrykksbasert tidsregistrering.",
    topics: JSON.stringify(["arbeidsforhold", "konsekvensvurdering"]),
    gdpr_articles: JSON.stringify(["6", "9", "13", "35"]),
    status: "final",
  },
  // Telenor — international transfer
  {
    reference: "22/00814",
    title: "Varsel om vedtak mot Telenor — overføring til tredjeland",
    date: "2022-11-28",
    type: "varsel",
    entity_name: "Telenor ASA",
    fine_amount: null,
    summary:
      "Datatilsynet sendte varsel om vedtak til Telenor for overføring av personopplysninger til India uten tilstrekkelig beskyttelsesnivå etter Schrems II-dommen, og for manglende gjennomføring av supplerende tiltak for å sikre et tilstrekkelig beskyttelsesnivå.",
    full_text:
      "Datatilsynet har sendt varsel om vedtak til Telenor ASA i forbindelse med selskapets overføring av personopplysninger til tredjeland. Telenor overførte personopplysninger om norske kunder og ansatte til India gjennom sin driftsmodell med globale driftssentre. Etter EU-domstolens avgjørelse i Schrems II-saken (C-311/18) ble overføringsmekanismen Privacy Shield kjent ugyldig, og Standard Contractual Clauses (SCC) krever supplerende tiltak dersom mottakerlandets lovgivning ikke gir et tilstrekkelig beskyttelsesnivå. Datatilsynet konstaterte at Telenor: (1) overførte personopplysninger til India basert på SCC uten å ha gjennomført en tilstrekkelig vurdering av indisk lovgivning og praksis (Transfer Impact Assessment); (2) ikke hadde implementert tilstrekkelige supplerende tiltak — kryptering var ikke implementert på alle overføringer, og tilgangskontroller var utilstrekkelige; (3) overførte flere kategorier av personopplysninger enn nødvendig. Datatilsynet varslet om pålegg om å stanse overføringene til tilstrekkelige tiltak var implementert.",
    topics: JSON.stringify(["overforing"]),
    gdpr_articles: JSON.stringify(["44", "46"]),
    status: "final",
  },
];

const insertDecision = db.prepare(`
  INSERT OR IGNORE INTO decisions
    (reference, title, date, type, entity_name, fine_amount, summary, full_text, topics, gdpr_articles, status)
  VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertDecisionsAll = db.transaction(() => {
  for (const d of decisions) {
    insertDecision.run(
      d.reference,
      d.title,
      d.date,
      d.type,
      d.entity_name,
      d.fine_amount,
      d.summary,
      d.full_text,
      d.topics,
      d.gdpr_articles,
      d.status,
    );
  }
});

insertDecisionsAll();
console.log(`Inserted ${decisions.length} decisions`);

// --- Guidelines --------------------------------------------------------------

interface GuidelineRow {
  reference: string | null;
  title: string;
  date: string;
  type: string;
  summary: string;
  full_text: string;
  topics: string;
  language: string;
}

const guidelines: GuidelineRow[] = [
  {
    reference: "DT-VEILEDER-COOKIES-2022",
    title: "Veileder om informasjonskapsler (cookies)",
    date: "2022-03-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om informasjonskapsler og sporere. Forklarer når samtykke er nødvendig, hvordan samtykkebannere skal utformes, og hva som gjelder for tredjeparts informasjonskapsler under ekomloven og GDPR.",
    full_text:
      "Datatilsynets veileder om informasjonskapsler presiserer reglene i ekomloven § 2-7b og personopplysningsloven. Veilederen behandler: (1) Hvilke informasjonskapsler krever samtykke — alle informasjonskapsler som ikke er strengt nødvendige for tjenestens funksjon krever forhåndssamtykke; dette omfatter analyse-cookies, markedsføringscookies og sosiale medier-cookies; (2) Krav til samtykke — samtykke må innhentes før informasjonskapsler plasseres; samtykket skal være spesifikt, informert og gitt ved en aktiv handling; forhåndsavkryssede bokser er ikke gyldig samtykke; (3) Likeverdige valg — muligheten til å avslå informasjonskapsler skal presenteres på samme fremtredende måte som muligheten til å akseptere; (4) Dokumentasjon — virksomheten skal kunne dokumentere at gyldig samtykke er innhentet; (5) Tredjepartstjenester — bruk av tjenester som Google Analytics og sosiale medier-knapper innebærer databehandling fra tredjeparter, og det skal inngås databehandleravtaler; (6) Teknisk gjennomføring — informasjonskapsler skal ikke plasseres via JavaScript før samtykke er gitt.",
    topics: JSON.stringify(["informasjonskapsler", "samtykke"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-DPIA-2021",
    title: "Veileder om vurdering av personvernkonsekvenser (DPIA)",
    date: "2021-09-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkonsekvensvurdering (DPIA). Forklarer når en DPIA er påkrevet, hvordan den gjennomføres, og Datatilsynets liste over behandlingsaktiviteter som alltid krever DPIA.",
    full_text:
      "Veilederen beskriver kravene til personvernkonsekvensvurdering (DPIA) etter GDPR artikkel 35. En DPIA er påkrevet når en behandling sannsynligvis vil medføre høy risiko for fysiske personers rettigheter og friheter. Datatilsynet har utarbeidet en liste over behandlingsaktiviteter som alltid krever DPIA, blant annet: (1) systematisk og omfattende overvåking av offentlig tilgjengelige områder; (2) behandling av biometriske data for å identifisere fysiske personer; (3) behandling av genetiske data; (4) behandling av særlige kategorier av personopplysninger i stor skala; (5) systematisk overvåking av arbeidstakere; (6) behandling av barns personopplysninger i stor skala. DPIA-prosessen skal inneholde: en systematisk beskrivelse av behandlingen, en vurdering av nødvendighet og proporsjonalitet, en vurdering av risikoen for de registrertes rettigheter og friheter, og planlagte tiltak for å håndtere risikoen. Dersom DPIA viser at behandlingen medfører høy risiko som ikke kan reduseres til et akseptabelt nivå, skal den behandlingsansvarlige konsultere Datatilsynet før behandlingen starter (art. 36 GDPR).",
    topics: JSON.stringify(["konsekvensvurdering"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-OVERFOERING-2022",
    title: "Veileder om overføring av personopplysninger til tredjeland",
    date: "2022-06-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om overføring av personopplysninger til land utenfor EØS etter Schrems II-dommen. Dekker overføringsmekanismer, Transfer Impact Assessment (TIA), og supplerende tiltak.",
    full_text:
      "Veilederen gir praktisk veiledning om overføring av personopplysninger til tredjeland etter GDPR kapittel V og EU-domstolens avgjørelse i Schrems II-saken (C-311/18). Overføringsgrunnlag — personopplysninger kan overføres til tredjeland basert på: (1) en beslutning om tilstrekkelig beskyttelsesnivå fra EU-kommisjonen (art. 45); (2) Standard Contractual Clauses (SCC) vedtatt av EU-kommisjonen (art. 46 nr. 2 bokstav c); (3) bindende virksomhetsregler (BCR, art. 47); (4) unntak for særlige situasjoner (art. 49). Transfer Impact Assessment (TIA) — ved bruk av SCC eller BCR må den behandlingsansvarlige gjennomføre en vurdering av om mottakerlandets lovgivning og praksis gir et tilstrekkelig beskyttelsesnivå. TIA skal blant annet vurdere: lovgivning om myndighetstilgang til data, rettsmidler tilgjengelig for registrerte, og uavhengige tilsynsmyndigheters kompetanse. Supplerende tiltak — dersom TIA viser mangler ved mottakerlandets beskyttelsesnivå, må det iverksettes supplerende tekniske, kontraktsmessige eller organisatoriske tiltak. Eksempler inkluderer: ende-til-ende-kryptering der mottakeren ikke har tilgang til krypteringsnøklene, pseudonymisering, og dataminimering.",
    topics: JSON.stringify(["overforing"]),
    language: "no",
  },
];

const insertGuideline = db.prepare(`
  INSERT INTO guidelines (reference, title, date, type, summary, full_text, topics, language)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertGuidelinesAll = db.transaction(() => {
  for (const g of guidelines) {
    insertGuideline.run(
      g.reference,
      g.title,
      g.date,
      g.type,
      g.summary,
      g.full_text,
      g.topics,
      g.language,
    );
  }
});

insertGuidelinesAll();
console.log(`Inserted ${guidelines.length} guidelines`);

// --- Summary -----------------------------------------------------------------

const decisionCount = (
  db.prepare("SELECT count(*) as cnt FROM decisions").get() as { cnt: number }
).cnt;
const guidelineCount = (
  db.prepare("SELECT count(*) as cnt FROM guidelines").get() as { cnt: number }
).cnt;
const topicCount = (
  db.prepare("SELECT count(*) as cnt FROM topics").get() as { cnt: number }
).cnt;
const decisionFtsCount = (
  db.prepare("SELECT count(*) as cnt FROM decisions_fts").get() as { cnt: number }
).cnt;
const guidelineFtsCount = (
  db.prepare("SELECT count(*) as cnt FROM guidelines_fts").get() as { cnt: number }
).cnt;

console.log(`\nDatabase summary:`);
console.log(`  Topics:         ${topicCount}`);
console.log(`  Decisions:      ${decisionCount} (FTS entries: ${decisionFtsCount})`);
console.log(`  Guidelines:     ${guidelineCount} (FTS entries: ${guidelineFtsCount})`);
console.log(`\nDone. Database ready at ${DB_PATH}`);

db.close();
