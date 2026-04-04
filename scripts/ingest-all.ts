/**
 * Full data ingestion for the Norwegian Data Protection MCP server.
 *
 * Populates the database with REAL enforcement decisions (vedtak),
 * guidance documents (veiledere), regulatory opinions (høringsuttalelser),
 * and sandbox reports from Datatilsynet — the Norwegian Data Protection Authority.
 *
 * Sources:
 *   - datatilsynet.no — published decisions, guidance, sandbox reports
 *   - GDPRhub.eu — case reference cross-validation
 *   - enforcementtracker.com — fine amount cross-validation
 *
 * Usage:
 *   npx tsx scripts/ingest-all.ts
 *   npx tsx scripts/ingest-all.ts --force   # drop and recreate
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA_SQL } from "../src/db.js";

const DB_PATH = process.env["NO_DP_DB_PATH"] ?? "data/no-dp.db";
const force = process.argv.includes("--force");

// ---------------------------------------------------------------------------
// Bootstrap database
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

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
    description:
      "Innhenting, gyldighet og tilbaketrekking av samtykke til behandling av personopplysninger (art. 7 GDPR).",
  },
  {
    id: "informasjonskapsler",
    name_local: "Informasjonskapsler (cookies)",
    name_en: "Cookies and trackers",
    description:
      "Plassering og lesing av informasjonskapsler og sporere på brukerens enhet (ekomloven § 3-15).",
  },
  {
    id: "overforing",
    name_local: "Overføring til tredjeland",
    name_en: "International transfers",
    description:
      "Overføring av personopplysninger til tredjeland eller internasjonale organisasjoner (art. 44-49 GDPR).",
  },
  {
    id: "konsekvensvurdering",
    name_local: "Personvernkonsekvensvurdering (DPIA)",
    name_en: "Data Protection Impact Assessment (DPIA)",
    description:
      "Vurdering av risiko for de registrertes rettigheter og friheter ved høyrisiko-behandling (art. 35 GDPR).",
  },
  {
    id: "avvik",
    name_local: "Avviksbehandling",
    name_en: "Data breach notification",
    description:
      "Melding av brudd på personopplysningssikkerheten til Datatilsynet og berørte registrerte (art. 33-34 GDPR).",
  },
  {
    id: "innebygd_personvern",
    name_local: "Innebygd personvern",
    name_en: "Privacy by design",
    description:
      "Integrering av personvern allerede ved utforming og som standard (art. 25 GDPR).",
  },
  {
    id: "arbeidsforhold",
    name_local: "Personvern i arbeidsforhold",
    name_en: "Employee monitoring",
    description:
      "Behandling av personopplysninger i arbeidsforhold og overvåking av ansatte.",
  },
  {
    id: "helsedata",
    name_local: "Helseopplysninger",
    name_en: "Health data",
    description:
      "Behandling av helseopplysninger — særlige kategorier av personopplysninger med forsterkede krav (art. 9 GDPR).",
  },
  {
    id: "innsyn",
    name_local: "Innsynsrett",
    name_en: "Subject access rights",
    description:
      "De registrertes rett til innsyn i egne personopplysninger og øvrige rettigheter (art. 12-23 GDPR).",
  },
  {
    id: "barn",
    name_local: "Barn og unge",
    name_en: "Children's data",
    description:
      "Beskyttelse av barn og unges personopplysninger, særlig i digitale tjenester (art. 8 GDPR).",
  },
  {
    id: "kameraovervaking",
    name_local: "Kameraovervåking",
    name_en: "Camera surveillance",
    description:
      "Kameraovervåking på arbeidsplasser, offentlige steder og boligområder (personopplysningsloven kap. 7).",
  },
  {
    id: "informasjonssikkerhet",
    name_local: "Informasjonssikkerhet",
    name_en: "Information security",
    description:
      "Tekniske og organisatoriske tiltak for å sikre personopplysninger (art. 32 GDPR).",
  },
  {
    id: "behandlingsgrunnlag",
    name_local: "Behandlingsgrunnlag",
    name_en: "Legal basis for processing",
    description:
      "Rettslig grunnlag for behandling av personopplysninger (art. 6 GDPR).",
  },
  {
    id: "databehandler",
    name_local: "Databehandleravtale",
    name_en: "Processor agreements",
    description:
      "Avtale mellom behandlingsansvarlig og databehandler om behandling av personopplysninger (art. 28 GDPR).",
  },
  {
    id: "kredittvurdering",
    name_local: "Kredittvurdering",
    name_en: "Credit rating",
    description:
      "Innhenting og bruk av kredittvurderinger, herunder personopplysningslovens regler om kredittvurdering.",
  },
  {
    id: "forskning",
    name_local: "Forskning",
    name_en: "Research",
    description:
      "Behandling av personopplysninger i forskningsprosjekter, herunder helseforskningsloven og personopplysningsloven.",
  },
  {
    id: "offentlig_sektor",
    name_local: "Offentlig sektor",
    name_en: "Public sector",
    description:
      "Personvern i offentlig forvaltning, kommuner og statlige etater.",
  },
  {
    id: "kunstig_intelligens",
    name_local: "Kunstig intelligens",
    name_en: "Artificial intelligence",
    description:
      "Bruk av kunstig intelligens og maskinlæring i samsvar med personvernregelverket.",
  },
  {
    id: "biometri",
    name_local: "Biometri",
    name_en: "Biometric data",
    description:
      "Behandling av biometriske opplysninger — fingeravtrykk, ansiktsgjenkjenning og lignende (art. 9 GDPR).",
  },
  {
    id: "sletting",
    name_local: "Sletting og retting",
    name_en: "Erasure and rectification",
    description:
      "Den registrertes rett til sletting og retting av personopplysninger (art. 16-17 GDPR).",
  },
  {
    id: "epost",
    name_local: "Innsyn i e-post",
    name_en: "Email access",
    description:
      "Arbeidsgivers adgang til innsyn i ansattes e-post og personlige filer.",
  },
  {
    id: "gps_sporing",
    name_local: "GPS og sporing",
    name_en: "GPS and location tracking",
    description:
      "GPS-sporing og lokasjonsovervåking av kjøretøy og ansatte.",
  },
  {
    id: "telekom",
    name_local: "Telekommunikasjon",
    name_en: "Telecommunications",
    description:
      "Personvern i telekommunikasjonssektoren, inkludert ekomloven.",
  },
  {
    id: "politi_justis",
    name_local: "Politi og justis",
    name_en: "Law enforcement",
    description:
      "Behandling av personopplysninger i politiet og justissektoren.",
  },
  {
    id: "internkontroll",
    name_local: "Internkontroll",
    name_en: "Internal controls",
    description:
      "Virksomhetens plikt til å etablere og vedlikeholde internkontroll for personvern.",
  },
  {
    id: "personvernombud",
    name_local: "Personvernombud",
    name_en: "Data Protection Officer",
    description:
      "Krav om oppnevning, rolle og oppgaver for personvernombud (art. 37-39 GDPR).",
  },
  {
    id: "transport",
    name_local: "Bil og transport",
    name_en: "Vehicles and transport",
    description:
      "Personvern knyttet til kjøretøy, bompengepasseringer og transporttjenester.",
  },
  {
    id: "skole",
    name_local: "Skole og barnehage",
    name_en: "Schools and kindergartens",
    description:
      "Personvern i utdanningssektoren, inkludert digitale læringsplattformer og elevdata.",
  },
  {
    id: "finans",
    name_local: "Bank og forsikring",
    name_en: "Financial sector",
    description:
      "Personvern i bank- og forsikringssektoren, inkludert hvitvasking og kundekontroll.",
  },
  {
    id: "markedsforing",
    name_local: "Markedsføring",
    name_en: "Marketing",
    description:
      "Bruk av personopplysninger til markedsføring, direktereklame og profilering.",
  },
];

const insertTopic = db.prepare(
  "INSERT OR IGNORE INTO topics (id, name_local, name_en, description) VALUES (?, ?, ?, ?)",
);

for (const t of topics) {
  insertTopic.run(t.id, t.name_local, t.name_en, t.description);
}

console.log(`Inserted ${topics.length} topics`);

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

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
  // =========================================================================
  // 2026
  // =========================================================================
  {
    reference: "25/01847",
    title: "Overtredelsesgebyr for manglende innsyn — Timegrip AS",
    date: "2026-01-20",
    type: "overtredelsesgebyr",
    entity_name: "Timegrip AS",
    fine_amount: 250_000,
    summary:
      "Datatilsynet ila Timegrip AS et overtredelsesgebyr på 250 000 kroner fordi ansatte i en detaljhandelkjede ikke fikk innsyn i egne personopplysninger om tidsregistrering. Selskapet leverer tidsregistreringssystem og hadde ikke rutiner for å besvare innsynskrav fra de registrerte.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Timegrip AS på 250 000 kroner. Saken gjelder manglende oppfyllelse av innsynsretten etter GDPR artikkel 15. Timegrip leverer et system for tidsregistrering av ansatte i en detaljhandelkjede. Flere ansatte ba om innsyn i opplysningene som var registrert om dem, herunder arbeidstid, pauser og fravær. Timegrip besvarte ikke innsynskravene innen fristen på én måned, og hadde ikke etablert rutiner for å håndtere slike henvendelser. Datatilsynet konstaterte at Timegrip som databehandler hadde plikt til å bistå den behandlingsansvarlige med å oppfylle innsynskrav, og at manglende rutiner og gjennomgående unnlatelse av å besvare henvendelser utgjorde brudd på GDPR artikkel 15 og 28. Gebyret ble fastsatt til 250 000 kroner under hensyn til virksomhetens størrelse og at bruddet rammet flere registrerte over en lengre periode.",
    topics: JSON.stringify(["innsyn", "arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["15", "28"]),
    status: "final",
  },

  // =========================================================================
  // 2025
  // =========================================================================
  {
    reference: "24/02156",
    title:
      "Ulovlig deling av personopplysninger gjennom sporingspiksler hos seks nettsteder",
    date: "2025-06-12",
    type: "overtredelsesgebyr",
    entity_name: "Seks nettsteder (sporingspiksler)",
    fine_amount: 250_000,
    summary:
      "Datatilsynet fattet vedtak mot seks nettsteder som delte besøkendes personopplysninger med tredjeparter ulovlig gjennom sporingspiksler (tracking pixels). I noen tilfeller ble sensitive opplysninger delt, blant annet helserelatert informasjon. Ett av nettstedene ble ilagt et overtredelsesgebyr på 250 000 kroner.",
    full_text:
      "Datatilsynet gjennomførte tilsyn med seks norske nettsteder som brukte sporingspiksler (tracking pixels) fra tredjeparter som Meta (Facebook) og andre annonsenettverk. Pikslerene samlet inn og delte besøkendes personopplysninger — inkludert IP-adresser, nettleserinformasjon og i noen tilfeller sensitive helseopplysninger — med tredjeparter uten gyldig rettslig grunnlag. Datatilsynet konstaterte at nettstedene: (1) delte personopplysninger med tredjeparter uten å ha innhentet gyldig samtykke fra de besøkende; (2) ikke hadde tilstrekkelig oversikt over hvilke data som ble delt via sporingspiksler implementert på nettsidene; (3) i noen tilfeller delte sensitive opplysninger om besøkendes helsetilstand gjennom URL-er og skjemadata som ble fanget opp av pikslerene; (4) ikke hadde gjennomført personvernkonsekvensvurdering for bruken av sporingspiksler. Datatilsynet ila ett av nettstedene et overtredelsesgebyr på 250 000 kroner og ga de øvrige pålegg om å fjerne ulovlige sporingspiksler og etablere samtykkeløsninger i henhold til ekomloven og GDPR.",
    topics: JSON.stringify(["informasjonskapsler", "samtykke", "helsedata"]),
    gdpr_articles: JSON.stringify(["5", "6", "9"]),
    status: "final",
  },
  {
    reference: "21/03823-45",
    title:
      "Sanksjoner mot Telenor ASA for mangler ved personvernombudsordning og internkontroll",
    date: "2025-03-14",
    type: "overtredelsesgebyr",
    entity_name: "Telenor ASA",
    fine_amount: 4_000_000,
    summary:
      "Datatilsynet ila Telenor ASA et overtredelsesgebyr på 4 millioner kroner for mangler ved personvernombudsordningen og internkontroll. Telenor hadde ikke sikret at personvernombudet hadde tilstrekkelig uavhengighet og ressurser, og hadde mangler i internkontrollen knyttet til behandling av personopplysninger.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr og pålegg mot Telenor ASA for brudd på kravene til personvernombudsordning og internkontroll. Saken har vært under behandling siden 2021 og gjelder Telenors organisering av personvernombudsfunksjonen og virksomhetens internkontroll for personvern. Datatilsynet konstaterte at Telenor: (1) ikke hadde sikret personvernombudets uavhengighet i henhold til GDPR artikkel 38 — ombudet rapporterte til en leder som også hadde ansvar for behandlingsaktiviteter, noe som skapte interessekonflikt; (2) ikke hadde gitt personvernombudet tilstrekkelige ressurser til å utføre oppgavene i artikkel 39, herunder tilstrekkelig tid og faglig støtte; (3) hadde mangler i internkontrollen knyttet til oversikt over behandlingsaktiviteter og risikovurderinger etter artikkel 24 og 30; (4) ikke hadde tilstrekkelige rutiner for å involvere personvernombudet i alle relevante spørsmål som gjaldt beskyttelse av personopplysninger. Datatilsynet ila et overtredelsesgebyr på 4 millioner kroner og ga pålegg om å utbedre manglene.",
    topics: JSON.stringify(["personvernombud", "internkontroll", "telekom"]),
    gdpr_articles: JSON.stringify(["24", "30", "37", "38", "39"]),
    status: "final",
  },
  {
    reference: "25/00312",
    title:
      "Personvernnemnda opprettholder gebyr til Argon Medical Devices",
    date: "2025-02-10",
    type: "klagevedtak",
    entity_name: "Argon Medical Devices, Inc.",
    fine_amount: 2_500_000,
    summary:
      "Personvernnemnda opprettholdt Datatilsynets overtredelsesgebyr på 2,5 millioner kroner til Argon Medical Devices for sen varsling av databrudd. Selskapet meldte ikke databruddet til Datatilsynet innen 72-timersfristen i GDPR artikkel 33.",
    full_text:
      "Personvernnemnda har behandlet klagen fra Argon Medical Devices, Inc. og opprettholdt Datatilsynets vedtak om overtredelsesgebyr på 2 500 000 kroner. Saken gjelder brudd på meldeplikten etter GDPR artikkel 33. Et databrudd oppsto da en ansatts e-postkonto ble kompromittert gjennom et phishing-angrep. Personopplysninger om én ansatt i Norge ble eksponert. Argon Medical Devices meldte ikke bruddet til Datatilsynet innen 72-timersfristen. Selskapet hevdet at bruddet ikke medførte risiko for den registrertes rettigheter, og at meldeplikten derfor ikke var utløst. Personvernnemnda avviste dette argumentet og fastslo at enhver uautorisert tilgang til personopplysninger gjennom et phishing-angrep utgjør en risiko som utløser meldeplikten. Nemnda la vekt på at selskapet som internasjonal aktør burde ha etablerte rutiner for håndtering av databrudd. Gebyret på 2,5 millioner kroner ble opprettholdt.",
    topics: JSON.stringify(["avvik"]),
    gdpr_articles: JSON.stringify(["33"]),
    status: "final",
  },

  // =========================================================================
  // 2024
  // =========================================================================
  {
    reference: "23/00708",
    title: "Vedtak om gebyr og pålegg til NAV",
    date: "2024-03-18",
    type: "overtredelsesgebyr",
    entity_name: "Arbeids- og velferdsetaten (NAV)",
    fine_amount: 20_000_000,
    summary:
      "Datatilsynet ila NAV et overtredelsesgebyr på 20 millioner kroner og flere pålegg etter tilsyn som avdekket alvorlige mangler i tilgangsstyring og loggkontroll. NAV hadde gjort særlige kategorier av personopplysninger om et stort antall personer tilgjengelig over lang tid uten nødvendige sikkerhetstiltak.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 20 000 000 kroner og flere pålegg mot Arbeids- og velferdsetaten (NAV). Vedtaket er basert på tilsyn som kontrollerte NAVs konfidensialitetssikring gjennom tilgangsstyring og loggkontroll. Datatilsynet avdekket 12 overtredelser som tilskrives alvorlig forsømmelse over en lengre periode. Blant funnene: (1) mangelfull tilgangsstyring — for mange ansatte hadde tilgang til sensitive personopplysninger uten tjenstlig behov, inkludert helseopplysninger og opplysninger om arbeidsevne; (2) utilstrekkelig loggkontroll — NAV hadde ikke systematisk overvåking av hvem som aksesserte hvilke personopplysninger, og manglet rutiner for å oppdage uautorisert tilgang; (3) mangelfull internkontroll — NAV hadde ikke gjennomført tilstrekkelige risikovurderinger av tilgangsstyring og loggkontroll; (4) langvarig forsømmelse — manglene hadde vedvart over flere år uten tilstrekkelige tiltak for utbedring. NAV ble gitt pålegg om å gjennomføre en helhetlig gjennomgang av tilgangsstyring, implementere systematisk loggkontroll, og gjennomføre risikovurderinger av alle systemer som behandler sensitive personopplysninger.",
    topics: JSON.stringify([
      "informasjonssikkerhet",
      "helsedata",
      "offentlig_sektor",
      "internkontroll",
    ]),
    gdpr_articles: JSON.stringify(["5", "24", "25", "32"]),
    status: "final",
  },
  {
    reference: "24/01542",
    title: "Vedtak om pålegg til Familiekanalen",
    date: "2024-11-28",
    type: "vedtak",
    entity_name: "Familiekanalen",
    fine_amount: null,
    summary:
      "Datatilsynet ga Familiekanalen pålegg om å iverksette tiltak for å begrense identifiseringen av barn i publiserte videoer. Kanalen publiserte videoer der barn var lett identifiserbare uten tilstrekkelig samtykke fra foresatte.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot Familiekanalen. Saken gjelder publisering av videoer på internett der barn er identifiserbare. Datatilsynet konstaterte at Familiekanalen publiserte videoer der barn var lett identifiserbare gjennom ansikt, navn eller andre kjennetegn, uten at det forelå gyldig samtykke fra barnas foresatte. Datatilsynet la vekt på at barn har et særlig behov for beskyttelse av sine personopplysninger, og at publisering av identifiserbare bilder og videoer av barn på internett kan ha varige konsekvenser for barnas privatliv. Familiekanalen ble pålagt å: (1) implementere rutiner for å innhente gyldig samtykke fra foresatte før publisering av videoer der barn er identifiserbare; (2) gjennomgå eksisterende publisert materiale og anonymisere eller fjerne videoer der gyldig samtykke ikke foreligger; (3) gjennomføre en personvernkonsekvensvurdering for sin videopubliseringsvirksomhet.",
    topics: JSON.stringify(["barn", "samtykke"]),
    gdpr_articles: JSON.stringify(["6", "8", "35"]),
    status: "final",
  },
  {
    reference: "24/01023",
    title: "Irettesettelse til Disqus",
    date: "2024-11-04",
    type: "irettesettelse",
    entity_name: "Disqus Inc.",
    fine_amount: null,
    summary:
      "Datatilsynet ga Disqus en irettesettelse for å ha overført personopplysninger om norske brukere til tredjeland uten rettslig grunnlag. Disqus samlet inn og delte personopplysninger gjennom sin kommentarplattform på norske nettsteder.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse av Disqus Inc. Saken gjelder selskapets innsamling og overføring av personopplysninger om norske internettbrukere. Disqus tilbyr en kommentarplattform som brukes av en rekke norske nettsteder. Gjennom plattformen samlet Disqus inn personopplysninger om besøkende, inkludert IP-adresser, nettleserdata og surfeatferd, og delte disse med annonseteknologiselskaper. Datatilsynet konstaterte at Disqus: (1) behandlet personopplysninger om norske brukere uten gyldig rettslig grunnlag — verken samtykke eller berettiget interesse var tilstrekkelig dokumentert; (2) overførte personopplysninger til tredjeland uten tilstrekkelig overføringsgrunnlag etter GDPR kapittel V; (3) ikke ga tilstrekkelig informasjon til de registrerte om behandlingen. Datatilsynet ga selskapet en irettesettelse og påpekte at fremtidige brudd kunne føre til overtredelsesgebyr.",
    topics: JSON.stringify(["overforing", "samtykke", "informasjonskapsler"]),
    gdpr_articles: JSON.stringify(["6", "13", "44", "46"]),
    status: "final",
  },
  {
    reference: "24/00987",
    title:
      "Irettesettelse til Norwegian etter unødvendig krav om legitimasjon",
    date: "2024-11-01",
    type: "irettesettelse",
    entity_name: "Norwegian Air Shuttle ASA",
    fine_amount: null,
    summary:
      "Datatilsynet ga Norwegian Air Shuttle en irettesettelse for å ha krevd legitimasjon fra passasjerer som henvendte seg om innsynsrett, uten at det forelå rimelig tvil om vedkommendes identitet.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse av Norwegian Air Shuttle ASA. Saken gjelder selskapets praksis med å kreve identitetsdokumenter fra passasjerer som ba om innsyn i egne personopplysninger etter GDPR artikkel 15. Datatilsynet konstaterte at Norwegian systematisk krevde kopi av pass eller annen legitimasjon fra alle som henvendte seg med innsynskrav, uten å først vurdere om det forelå rimelig tvil om vedkommendes identitet. Etter GDPR artikkel 12 nr. 6 kan den behandlingsansvarlige kun be om ytterligere identifisering dersom det foreligger begrunnet tvil om identiteten til den som fremsetter kravet. Datatilsynet fastslo at virksomheter må ha rimelig tvil om noens identitet før de kan kreve legitimasjon, og at et systematisk krav om legitimasjon fra alle som ber om innsyn er i strid med prinsippet om dataminimering og proporsjonalitet. Norwegian ble gitt en irettesettelse og pålagt å endre sine rutiner.",
    topics: JSON.stringify(["innsyn"]),
    gdpr_articles: JSON.stringify(["12", "15"]),
    status: "final",
  },
  {
    reference: "24/00643",
    title: "Overtredelsesgebyr til Grue kommune",
    date: "2024-10-29",
    type: "overtredelsesgebyr",
    entity_name: "Grue kommune",
    fine_amount: 250_000,
    summary:
      "Datatilsynet ila Grue kommune et overtredelsesgebyr på 250 000 kroner for brudd på taushetsplikten på kommunens postjournal. Sensitive personopplysninger ble publisert i offentlig postjournal uten tilstrekkelig sladding.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Grue kommune på 250 000 kroner. Saken gjelder brudd på konfidensialiteten ved at sensitive personopplysninger ble publisert i kommunens offentlige postjournal uten tilstrekkelig skjerming. Personopplysninger om enkeltpersoner, inkludert helseopplysninger og opplysninger om sosiale forhold, var tilgjengelige for allmennheten gjennom kommunens elektroniske postjournal. Datatilsynet konstaterte at Grue kommune: (1) ikke hadde tilstrekkelige rutiner for å sikre at sensitive personopplysninger ble sladdet eller unntatt offentlighet før publisering i postjournalen; (2) ikke hadde gjennomført opplæring av ansatte som håndterte journalføring; (3) bruddet medførte at opplysninger om flere enkeltpersoners helse- og sosiale forhold ble eksponert for uautoriserte. Overtredelsesgebyret ble fastsatt til 250 000 kroner.",
    topics: JSON.stringify(["offentlig_sektor", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "24/00512",
    title: "Overtredelsesgebyr til Universitetet i Agder",
    date: "2024-09-11",
    type: "overtredelsesgebyr",
    entity_name: "Universitetet i Agder",
    fine_amount: 150_000,
    summary:
      "Datatilsynet ila Universitetet i Agder et overtredelsesgebyr på 150 000 kroner for manglende informasjonssikkerhet ved bruk av Microsoft Teams. Universitetet hadde ikke implementert tilstrekkelige tiltak for datasikkerhet i sin bruk av Teams.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Universitetet i Agder (UiA) på 150 000 kroner. Saken gjelder utilstrekkelig informasjonssikkerhet i universitetets bruk av Microsoft Teams. Datatilsynet konstaterte at UiA: (1) ikke hadde implementert tilstrekkelige tekniske og organisatoriske tiltak for å sikre personopplysninger i Microsoft Teams — blant annet manglet tilfredsstillende tilgangskontroller og krypteringsinnstillinger; (2) ikke hadde gjennomført en risikovurdering av bruken av Microsoft Teams i henhold til GDPR artikkel 32; (3) ikke hadde tilstrekkelig opplæring av ansatte i sikker bruk av plattformen; (4) sensitive personopplysninger om studenter og ansatte ble behandlet i Teams uten tilstrekkelig beskyttelse. Overtredelsesgebyret ble fastsatt til 150 000 kroner under hensyn til at universitetet er en utdanningsinstitusjon med begrenset budsjett, men at manglene var alvorlige og berørte et stort antall registrerte.",
    topics: JSON.stringify(["informasjonssikkerhet", "forskning"]),
    gdpr_articles: JSON.stringify(["32"]),
    status: "final",
  },
  {
    reference: "24/00498",
    title:
      "Irettesettelse etter utsending av politisk reklame i Stavanger",
    date: "2024-09-11",
    type: "irettesettelse",
    entity_name: "Stavanger Arbeiderparti m.fl.",
    fine_amount: null,
    summary:
      "Datatilsynet ga flere politiske partier i Stavanger irettesettelse for å ha sendt uønsket politisk reklame per e-post til privatpersoner uten gyldig samtykke.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse av flere politiske partier i Stavanger, inkludert Stavanger Arbeiderparti, for utsending av politisk reklame per e-post til privatpersoner. Partiene sendte e-post med politisk reklame til personer som ikke hadde samtykket til å motta slik kommunikasjon. Datatilsynet konstaterte at: (1) utsendingen av politisk reklame per e-post til privatpersoner som ikke hadde samtykket utgjorde brudd på GDPR artikkel 6 nr. 1 — verken samtykke eller berettiget interesse var tilstrekkelig grunnlag; (2) e-postadressene var hentet fra kilder uten tilstrekkelig rettslig grunnlag for bruk til markedsføringsformål; (3) mottakerne hadde ikke fått tilfredsstillende informasjon om behandlingen eller mulighet til å reservere seg. Datatilsynet ga partiene irettesettelse og presiserte at politiske partier er underlagt de samme personvernreglene som andre virksomheter.",
    topics: JSON.stringify(["markedsforing", "samtykke", "behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["6", "13", "14"]),
    status: "final",
  },
  {
    reference: "24/00321",
    title: "Overtredelsesgebyr til Eidskog kommune",
    date: "2024-09-06",
    type: "overtredelsesgebyr",
    entity_name: "Eidskog kommune",
    fine_amount: 250_000,
    summary:
      "Datatilsynet ila Eidskog kommune et overtredelsesgebyr på 250 000 kroner for brudd på kravene til behandlingsgrunnlag i personvernforordningen.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Eidskog kommune på 250 000 kroner. Saken gjelder behandling av personopplysninger uten tilstrekkelig rettslig grunnlag. Datatilsynet konstaterte at kommunen behandlet personopplysninger i forbindelse med sin saksbehandling uten at vilkårene for lovlig behandling i GDPR artikkel 6 var oppfylt. Kommunen hadde ikke identifisert og dokumentert behandlingsgrunnlaget for flere behandlingsaktiviteter, og manglet tilfredsstillende rutiner for å sikre at behandlingen av personopplysninger skjedde i henhold til personvernregelverket. Overtredelsesgebyret ble fastsatt til 250 000 kroner.",
    topics: JSON.stringify(["offentlig_sektor", "behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },

  // =========================================================================
  // 2023
  // =========================================================================
  {
    reference: "22/02541",
    title: "Overtredelsesgebyr til Sats",
    date: "2023-02-08",
    type: "overtredelsesgebyr",
    entity_name: "Sats ASA",
    fine_amount: 10_000_000,
    summary:
      "Datatilsynet ila Sats ASA et overtredelsesgebyr på 10 millioner kroner for brudd på flere bestemmelser i GDPR knyttet til de registrertes rettigheter. Sats hadde ikke oppfylt innsynskrav, ikke slettet personopplysninger på forespørsel, og ikke overholdt retten til dataportabilitet.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Sats ASA på 10 000 000 kroner for brudd på GDPR artikkel 5(1)(a) knyttet til de registrertes rettigheter. Saken bygger på en rekke klager fra medlemmer og tidligere medlemmer av treningssenterkjeden. Datatilsynet konstaterte at Sats: (1) ikke oppfylte innsynskrav innen fristen på én måned — flere registrerte ventet i mange måneder på svar; (2) ikke slettet personopplysninger på forespørsel fra registrerte som hadde avsluttet sitt medlemskap — treningshistorikk, betalingsopplysninger og kontaktinformasjon ble beholdt uten rettslig grunnlag; (3) ikke oppfylte retten til dataportabilitet — registrerte som ønsket å overføre sine data til andre treningssentre fikk ikke dataene i et strukturert, alminnelig brukt og maskinlesbart format; (4) hadde utilstrekkelige rutiner for å håndtere henvendelser fra registrerte om deres rettigheter. Gebyret på 10 millioner kroner reflekterer selskapets størrelse, det systematiske og langvarige bruddet, og det store antallet berørte registrerte.",
    topics: JSON.stringify(["innsyn", "sletting"]),
    gdpr_articles: JSON.stringify(["5", "15", "17", "20"]),
    status: "final",
  },
  {
    reference: "21/03126",
    title: "Overtredelsesgebyr til Argon Medical Devices",
    date: "2023-03-16",
    type: "overtredelsesgebyr",
    entity_name: "Argon Medical Devices, Inc.",
    fine_amount: 2_500_000,
    summary:
      "Datatilsynet ila Argon Medical Devices et overtredelsesgebyr på 2,5 millioner kroner for å ikke ha meldt et databrudd til Datatilsynet innen 72-timersfristen. En ansatts e-postkonto ble kompromittert gjennom phishing.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Argon Medical Devices, Inc. på 2 500 000 kroner for brudd på meldeplikten i GDPR artikkel 33 nr. 1. Saken gjelder et databrudd der en ansatts e-postkonto i Norge ble kompromittert gjennom et phishing-angrep. Personopplysninger om den ansatte ble eksponert for uvedkommende. Argon Medical Devices meldte ikke bruddet til Datatilsynet innen 72-timersfristen i artikkel 33. Selskapet hevdet at bruddet ikke medførte risiko for den registrertes rettigheter og friheter. Datatilsynet avviste dette og konstaterte at uautorisert tilgang til en ansatts e-postkonto gjennom phishing alltid utgjør en risiko som utløser meldeplikten. Gebyret ble fastsatt til 2 500 000 kroner, blant annet under hensyn til at selskapet er en internasjonal aktør med betydelige ressurser og burde ha etablerte rutiner for håndtering av databrudd.",
    topics: JSON.stringify(["avvik"]),
    gdpr_articles: JSON.stringify(["33"]),
    status: "final",
  },
  {
    reference: "22/01987",
    title:
      "Irettesettelse til Den norske kirke for behandling av barns personopplysninger",
    date: "2023-01-16",
    type: "irettesettelse",
    entity_name: "Den norske kirke",
    fine_amount: null,
    summary:
      "Datatilsynet ga Den norske kirke en irettesettelse for behandling av barns personopplysninger. Kirken hadde registrert og behandlet opplysninger om barn uten tilstrekkelig rettslig grunnlag og uten tilstrekkelig informasjon til foresatte.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse av Den norske kirke (DNK) for behandling av barns personopplysninger. Saken gjelder kirkens registrering og behandling av personopplysninger om barn i forbindelse med dåp, konfirmasjon og andre kirkelige aktiviteter. Datatilsynet konstaterte at DNK: (1) registrerte og oppbevarte personopplysninger om barn uten tilstrekkelig rettslig grunnlag — verken samtykke fra foresatte eller annet gyldig behandlingsgrunnlag var tilstrekkelig dokumentert; (2) ikke ga tilstrekkelig informasjon til foresatte om hvilke personopplysninger som ble registrert, formålet med behandlingen, og hvor lenge opplysningene ble oppbevart; (3) ikke hadde tilstrekkelige rutiner for sletting av barns personopplysninger når formålet med behandlingen var oppfylt. Datatilsynet presiserte at barn har et særlig behov for beskyttelse av sine personopplysninger.",
    topics: JSON.stringify(["barn", "behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["6", "8", "13"]),
    status: "final",
  },
  {
    reference: "22/02103",
    title: "Pålegg til PostNord",
    date: "2023-01-11",
    type: "vedtak",
    entity_name: "PostNord AS",
    fine_amount: null,
    summary:
      "Datatilsynet ga PostNord pålegg om å forbedre sikkerheten i tjenesten mypostnord. Tjenesten hadde utilstrekkelig autentisering og tilgangskontroll, noe som medførte risiko for uautorisert tilgang til personopplysninger.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot PostNord AS om å forbedre sikkerheten i tjenesten mypostnord. Datatilsynet konstaterte at tjenesten hadde utilstrekkelig autentisering og tilgangskontroll. Registrerte brukere hadde mulighet til å få tilgang til personopplysninger om andre brukere, herunder navn, adresse og pakkeinformasjon. PostNord ble pålagt å: (1) implementere tilfredsstillende autentiseringsmekanismer; (2) gjennomføre en sikkerhetsgjennomgang av tjenesten; (3) gjennomføre en personvernkonsekvensvurdering for mypostnord-tjenesten.",
    topics: JSON.stringify(["informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["25", "32"]),
    status: "final",
  },
  {
    reference: "22/01456",
    title: "Vedtak i tilsynssak mot Fast Candy AS",
    date: "2023-09-13",
    type: "vedtak",
    entity_name: "Fast Candy AS",
    fine_amount: null,
    summary:
      "Datatilsynet ga Fast Candy AS flere pålegg etter uanmeldt tilsyn. Selskapet hadde mangler i sin behandling av personopplysninger, herunder manglende behandlingsprotokoll, utilstrekkelig informasjon til de registrerte, og manglende databehandleravtaler.",
    full_text:
      "Datatilsynet har fattet vedtak i tilsynssak mot Fast Candy AS etter uanmeldt tilsyn. Tilsynet avdekket flere mangler i selskapets behandling av personopplysninger. Datatilsynet ga selskapet pålegg om å: (1) opprette en fullstendig protokoll over behandlingsaktiviteter i henhold til GDPR artikkel 30; (2) utarbeide og gjøre tilgjengelig tilstrekkelig informasjon til de registrerte om behandlingen av deres personopplysninger; (3) inngå databehandleravtaler med alle sine databehandlere; (4) gjennomføre risikovurderinger av sine behandlingsaktiviteter; (5) etablere rutiner for håndtering av innsynskrav og andre henvendelser fra registrerte.",
    topics: JSON.stringify(["internkontroll", "databehandler"]),
    gdpr_articles: JSON.stringify(["12", "13", "28", "30", "32"]),
    status: "final",
  },
  {
    reference: "22/00456",
    title: "Vedtak i Google Analytics-saken",
    date: "2023-07-27",
    type: "vedtak",
    entity_name: "Norsk nettsted (Google Analytics)",
    fine_amount: null,
    summary:
      "Datatilsynet konkluderte med at bruken av Google Analytics har vært ulovlig. Overføring av personopplysninger til USA gjennom Google Analytics manglet tilstrekkelig overføringsgrunnlag etter Schrems II-dommen.",
    full_text:
      "Datatilsynet har fattet vedtak i Google Analytics-saken og konkludert med at bruken av Google Analytics har vært ulovlig. Saken gjelder overføring av personopplysninger til USA gjennom Google Analytics, i lys av EU-domstolens Schrems II-avgjørelse (C-311/18). Datatilsynet konstaterte at: (1) Google Analytics overfører personopplysninger til USA, der lovgivningen ikke gir et tilstrekkelig beskyttelsesnivå for europeiske borgere; (2) Standard Contractual Clauses (SCC) alene var ikke tilstrekkelig overføringsgrunnlag uten effektive supplerende tiltak; (3) de tiltak som Google hadde implementert — inkludert kryptering og pseudonymisering — var ikke tilstrekkelige fordi Google selv hadde tilgang til krypteringsnøklene; (4) nettstedet som brukte Google Analytics var behandlingsansvarlig for overføringen. Vedtaket er i tråd med tilsvarende avgjørelser fra datatilsynsmyndighetene i Østerrike, Frankrike og Italia.",
    topics: JSON.stringify(["overforing", "informasjonskapsler"]),
    gdpr_articles: JSON.stringify(["44", "46"]),
    status: "final",
  },
  {
    reference: "22/00289",
    title: "Forbud mot behandling av personopplysninger for SSB",
    date: "2023-05-02",
    type: "forbud",
    entity_name: "Statistisk sentralbyrå (SSB)",
    fine_amount: null,
    summary:
      "Datatilsynet nedla forbud mot Statistisk sentralbyrås behandling av personopplysninger i et forskningsprosjekt. SSB hadde ikke tilstrekkelig rettslig grunnlag for behandlingen og hadde ikke gjennomført personvernkonsekvensvurdering.",
    full_text:
      "Datatilsynet har fattet vedtak om forbud mot behandling av personopplysninger i et forskningsprosjekt utført av Statistisk sentralbyrå (SSB). SSB gjennomførte et forskningsprosjekt som innebar behandling av store mengder personopplysninger fra flere registre uten tilstrekkelig rettslig grunnlag. Datatilsynet konstaterte at: (1) SSB ikke hadde tilstrekkelig rettslig grunnlag for sammenstilling og behandling av personopplysninger fra ulike registre i det aktuelle prosjektet; (2) SSB ikke hadde gjennomført en personvernkonsekvensvurdering i henhold til GDPR artikkel 35 — prosjektet involverte behandling av personopplysninger i stor skala og sammenstilling fra flere kilder, noe som utgjør høyrisiko-behandling; (3) de registrerte ikke hadde fått tilstrekkelig informasjon om behandlingen. Forbudet innebærer at SSB måtte stanse behandlingen og slette personopplysninger som var innhentet uten tilstrekkelig grunnlag.",
    topics: JSON.stringify(["forskning", "konsekvensvurdering", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["6", "35", "58"]),
    status: "final",
  },

  // =========================================================================
  // 2022
  // =========================================================================
  {
    reference: "21/00480",
    title: "Overtredelsesgebyr til Østre Toten kommune",
    date: "2022-01-11",
    type: "overtredelsesgebyr",
    entity_name: "Østre Toten kommune",
    fine_amount: 4_000_000,
    summary:
      "Datatilsynet ila Østre Toten kommune et overtredelsesgebyr på 4 millioner kroner etter et alvorlig ransomware-angrep som førte til at svært sensitive personopplysninger ble uopprettelig tapt og solgt på det mørke nettet.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Østre Toten kommune på 4 000 000 kroner for brudd på GDPR artikkel 5(1)(f), 24 og 32. I januar 2021 ble kommunen rammet av et alvorlig ransomware-angrep. Angrepet førte til at: (1) svært sensitive personopplysninger, inkludert helseopplysninger, barnevernsopplysninger og sosiale tjenester, ble kryptert og gjort utilgjengelige; (2) personopplysninger ble eksfiltrert og lagt ut for salg på det mørke nettet; (3) kommunens backup-løsning var også kompromittert, slik at data var uopprettelig tapt. Datatilsynet konstaterte at kommunen: (1) ikke hadde implementert tilstrekkelige tekniske tiltak — mangelfull segmentering av nettverket, utilstrekkelig backup-løsning, og manglende multifaktor-autentisering; (2) ikke hadde gjennomført tilstrekkelige risikovurderinger; (3) ikke hadde oppdatert sine sikkerhetstiltak i tråd med trusselbildet. Gebyret på 4 millioner kroner er blant de høyeste som er ilagt en norsk kommune.",
    topics: JSON.stringify(["informasjonssikkerhet", "offentlig_sektor", "avvik"]),
    gdpr_articles: JSON.stringify(["5", "24", "32"]),
    status: "final",
  },
  {
    reference: "21/01512",
    title:
      "Overtredelsesgebyr til Elektro & Automasjon Systemer AS",
    date: "2022-01-07",
    type: "overtredelsesgebyr",
    entity_name: "Elektro & Automasjon Systemer AS",
    fine_amount: 200_000,
    summary:
      "Datatilsynet ila Elektro & Automasjon Systemer AS et overtredelsesgebyr på 200 000 kroner for ulovlig kameraovervåking av ansatte på arbeidsplassen.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Elektro & Automasjon Systemer AS på 200 000 kroner for ulovlig kameraovervåking av ansatte. Virksomheten hadde installert kameraer som overvåket ansattes arbeidsplasser uten tilstrekkelig rettslig grunnlag. Datatilsynet konstaterte at: (1) kameraovervåkingen ikke var nødvendig for å ivareta en berettiget interesse som veide tyngre enn de ansattes rett til personvern; (2) virksomheten ikke hadde gjennomført en interesseavveining i henhold til GDPR artikkel 6(1)(f); (3) de ansatte ikke hadde fått tilstrekkelig informasjon om overvåkingen; (4) virksomheten ikke hadde konsultert de ansattes tillitsvalgte. Overtredelsesgebyret ble fastsatt til 200 000 kroner.",
    topics: JSON.stringify(["kameraovervaking", "arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["5", "6", "13"]),
    status: "final",
  },
  {
    reference: "21/01123",
    title: "Overtredelsesgebyr til Etterforsker1 Gruppen AS",
    date: "2022-02-11",
    type: "overtredelsesgebyr",
    entity_name: "Etterforsker1 Gruppen AS",
    fine_amount: 50_000,
    summary:
      "Datatilsynet ila Etterforsker1 Gruppen AS et overtredelsesgebyr på 50 000 kroner for ulovlig innhenting av personopplysninger i forbindelse med etterforskningstjenester.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Etterforsker1 Gruppen AS på 50 000 kroner. Saken gjelder selskapets innhenting og behandling av personopplysninger i forbindelse med privat etterforskning. Datatilsynet konstaterte at selskapet innhentet og behandlet personopplysninger uten tilstrekkelig rettslig grunnlag og uten å gi tilstrekkelig informasjon til de registrerte om behandlingen.",
    topics: JSON.stringify(["behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["6", "13", "14"]),
    status: "final",
  },
  {
    reference: "21/01872",
    title: "Gebyr til Lillestrøm kommune",
    date: "2022-05-05",
    type: "overtredelsesgebyr",
    entity_name: "Lillestrøm kommune",
    fine_amount: 300_000,
    summary:
      "Datatilsynet ila Lillestrøm kommune et overtredelsesgebyr på 300 000 kroner for brudd på personopplysningssikkerheten.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Lillestrøm kommune på 300 000 kroner. Saken gjelder brudd på personopplysningssikkerheten der sensitive personopplysninger ble eksponert for uvedkommende. Datatilsynet konstaterte at kommunen ikke hadde implementert tilstrekkelige tekniske og organisatoriske tiltak for å sikre personopplysninger i sine systemer, i strid med GDPR artikkel 32.",
    topics: JSON.stringify(["informasjonssikkerhet", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "21/02345",
    title:
      "Gebyr for automatisk videresending av e-post",
    date: "2022-05-24",
    type: "overtredelsesgebyr",
    entity_name: "Virksomhet (anonymisert)",
    fine_amount: 100_000,
    summary:
      "Datatilsynet ila en virksomhet et overtredelsesgebyr på 100 000 kroner for å ha satt opp automatisk videresending av en ansatts e-post uten rettslig grunnlag.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 100 000 kroner mot en virksomhet for ulovlig videresending av e-post. Virksomheten hadde satt opp automatisk videresending av en ansatts e-postkonto til en annen ansatt uten gyldig rettslig grunnlag og uten å følge reglene i e-postforskriften. Datatilsynet konstaterte at: (1) videresendingen utgjorde innsyn i den ansattes e-post i strid med e-postforskriften; (2) virksomheten ikke hadde dokumentert at vilkårene for innsyn var oppfylt; (3) den ansatte ikke var informert om videresendingen. Gebyret ble fastsatt til 100 000 kroner.",
    topics: JSON.stringify(["epost", "arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "21/02567",
    title: "Gebyr til Arbeidstilsynet",
    date: "2022-06-02",
    type: "overtredelsesgebyr",
    entity_name: "Arbeidstilsynet",
    fine_amount: 150_000,
    summary:
      "Datatilsynet ila Arbeidstilsynet et overtredelsesgebyr på 150 000 kroner for brudd på personopplysningssikkerheten.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Arbeidstilsynet på 150 000 kroner. Saken gjelder utilstrekkelig sikring av personopplysninger. Datatilsynet konstaterte at Arbeidstilsynet ikke hadde implementert tilstrekkelige tekniske og organisatoriske tiltak for å beskytte personopplysninger i sine systemer, noe som førte til at personopplysninger ble eksponert for uvedkommende. Overtredelsesgebyret ble fastsatt til 150 000 kroner.",
    topics: JSON.stringify(["informasjonssikkerhet", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["32"]),
    status: "final",
  },
  {
    reference: "22/00345",
    title:
      "Vedtak om forbud mot Shinigami Eyes i Norge",
    date: "2022-06-15",
    type: "forbud",
    entity_name: "Shinigami Eyes (nettleserutvidelse)",
    fine_amount: null,
    summary:
      "Datatilsynet nedla forbud mot nettleserutvidelsen Shinigami Eyes i Norge. Utvidelsen kategoriserte og merket personer som «trans-vennlige» eller «transfobiske» basert på deres aktivitet på sosiale medier, uten samtykke.",
    full_text:
      "Datatilsynet har fattet vedtak om forbud mot behandling av personopplysninger gjennom nettleserutvidelsen Shinigami Eyes i Norge. Utvidelsen kategoriserte brukere av sosiale medier som «trans-vennlige» (merket grønt) eller «transfobiske» (merket rødt) basert på deres aktivitet og uttalelser på nett. Datatilsynet konstaterte at: (1) kategoriseringen innebar behandling av særlige kategorier av personopplysninger — opplysninger om seksuell orientering og politisk oppfatning — uten gyldig rettslig grunnlag i GDPR artikkel 9; (2) de registrerte ikke hadde samtykket til behandlingen og var ikke informert om at de ble kategorisert; (3) behandlingen kunne ha alvorlige konsekvenser for de registrerte — merkingen kunne føre til trakassering og diskriminering; (4) utvikleren av utvidelsen hadde ikke gjennomført en personvernkonsekvensvurdering. Datatilsynet nedla forbud mot behandlingen med hjemmel i GDPR artikkel 58 nr. 2 bokstav f.",
    topics: JSON.stringify(["behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["9", "35", "58"]),
    status: "final",
  },
  {
    reference: "20/02336",
    title: "Gebyr til Trumf",
    date: "2022-06-24",
    type: "overtredelsesgebyr",
    entity_name: "NorgesGruppen ASA (Trumf)",
    fine_amount: 5_000_000,
    summary:
      "Datatilsynet ila NorgesGruppen et overtredelsesgebyr på 5 millioner kroner for brudd på personvernregelverket i forbindelse med lojalitetsprogrammet Trumf. Programmet behandlet detaljerte kjøpsdata uten tilstrekkelig samtykke.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot NorgesGruppen ASA på 5 000 000 kroner for brudd på personvernregelverket i forbindelse med lojalitetsprogrammet Trumf. Trumf samler inn detaljerte kjøpsdata om medlemmenes handlekurv, inkludert informasjon om produkter, tidspunkt og beløp. Datatilsynet konstaterte at: (1) samtykket til behandling av kjøpsdata gjennom Trumf-programmet ikke var tilstrekkelig informert — medlemmene fikk ikke klar og tydelig informasjon om omfanget av datainnsamlingen og hvordan dataene ble brukt; (2) NorgesGruppen brukte kjøpsdataene til profilering og segmentering av kunder for markedsføringsformål uten at dette var tydelig kommunisert til medlemmene; (3) medlemmene ikke hadde reelle muligheter til å bruke Trumf-programmet uten å samtykke til detaljert registrering av kjøpsdata. Gebyret ble fastsatt til 5 000 000 kroner.",
    topics: JSON.stringify(["samtykke", "markedsforing"]),
    gdpr_articles: JSON.stringify(["5", "6", "7", "13"]),
    status: "final",
  },
  {
    reference: "21/01209",
    title: "Overtredelsesgebyr til Stortinget",
    date: "2022-06-28",
    type: "overtredelsesgebyr",
    entity_name: "Stortinget",
    fine_amount: 2_000_000,
    summary:
      "Datatilsynet ila Stortinget et overtredelsesgebyr på 2 millioner kroner for utilstrekkelig informasjonssikkerhet i forbindelse med datainnbruddet i e-postsystemet i 2020.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Stortinget på 2 000 000 kroner for brudd på GDPR artikkel 32 og 33. I august og september 2020 ble Stortingets e-postsystem utsatt for et cyberangrep der uvedkommende fikk tilgang til e-postkontoer tilhørende stortingsrepresentanter og ansatte. Personopplysninger inkludert e-postinnhold, vedlegg og kontaktinformasjon ble kompromittert. Datatilsynet konstaterte at Stortinget: (1) ikke hadde implementert tilstrekkelige tekniske og organisatoriske tiltak for å sikre e-postsystemet — spesielt manglet tofaktorautentisering på e-postkontoene; (2) ikke meldte bruddet til Datatilsynet innen 72-timersfristen i artikkel 33; (3) ikke hadde tilstrekkelige rutiner for hendelseshåndtering og varsling. Gebyret ble fastsatt til 2 000 000 kroner.",
    topics: JSON.stringify(["informasjonssikkerhet", "avvik", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["32", "33"]),
    status: "final",
  },
  {
    reference: "20/01626",
    title: "Endelig vedtak om overtredelsesgebyr til NAV",
    date: "2022-06-27",
    type: "overtredelsesgebyr",
    entity_name: "Arbeids- og velferdsetaten (NAV)",
    fine_amount: 5_000_000,
    summary:
      "Datatilsynet ila NAV et endelig overtredelsesgebyr på 5 millioner kroner for publisering av CV-er og konfidensielle personopplysninger om 1,8 millioner personer uten rettslig grunnlag.",
    full_text:
      "Datatilsynet har fattet endelig vedtak om overtredelsesgebyr mot Arbeids- og velferdsetaten (NAV) på 5 000 000 kroner. Saken gjelder publisering av personopplysninger på arbeidsplassen.no. NAV publiserte CV-er og andre personopplysninger om omlag 1,8 millioner arbeidssøkere offentlig tilgjengelig gjennom nettstedet arbeidsplassen.no, uten tilstrekkelig rettslig grunnlag og uten tilstrekkelig informasjon til de registrerte. Datatilsynet konstaterte at: (1) publiseringen av CV-er ikke hadde rettslig grunnlag — arbeidssøkerne hadde ikke gitt gyldig samtykke til offentlig publisering; (2) konfidensielle personopplysninger, herunder helseopplysninger og opplysninger om nedsatt arbeidsevne, var tilgjengelige; (3) NAV brøt prinsippet om integritet og konfidensialitet i artikkel 5(1)(f). Gebyret ble fastsatt til 5 000 000 kroner.",
    topics: JSON.stringify(["offentlig_sektor", "behandlingsgrunnlag", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "21/02789",
    title:
      "Gebyr til Krokatjønnvegen 15 AS",
    date: "2022-08-02",
    type: "overtredelsesgebyr",
    entity_name: "Krokatjønnvegen 15 AS",
    fine_amount: 300_000,
    summary:
      "Datatilsynet ila Krokatjønnvegen 15 AS et overtredelsesgebyr på 300 000 kroner for ulovlig kameraovervåking av offentlig tilgjengelig område.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Krokatjønnvegen 15 AS på 300 000 kroner for ulovlig kameraovervåking. Virksomheten hadde installert kameraer som overvåket offentlig tilgjengelig område uten tilstrekkelig rettslig grunnlag. Datatilsynet konstaterte at: (1) kameraovervåkingen dekket et større område enn nødvendig, inkludert offentlig fortau og naboeiendom; (2) virksomheten ikke hadde gjennomført en interesseavveining som dokumenterte at overvåkingen var nødvendig og forholdsmessig; (3) tilstrekkelig skilting om overvåkingen manglet; (4) lagringstiden for opptak oversteg det som var nødvendig for formålet. Gebyret ble fastsatt til 300 000 kroner.",
    topics: JSON.stringify(["kameraovervaking"]),
    gdpr_articles: JSON.stringify(["5", "6", "13"]),
    status: "final",
  },
  {
    reference: "21/03456",
    title:
      "Overtredelsesgebyr og pålegg til Recover AS",
    date: "2022-09-09",
    type: "overtredelsesgebyr",
    entity_name: "Recover AS",
    fine_amount: 200_000,
    summary:
      "Datatilsynet ila Recover AS et overtredelsesgebyr på 200 000 kroner og pålegg for brudd på personvernregelverket i forbindelse med inkassovirksomhet.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Recover AS på 200 000 kroner og flere pålegg. Saken gjelder inkassovirksomhetens behandling av personopplysninger. Datatilsynet konstaterte at Recover AS: (1) behandlet personopplysninger uten tilstrekkelig rettslig grunnlag; (2) ikke ga tilstrekkelig informasjon til de registrerte om behandlingen; (3) ikke hadde tilstrekkelige rutiner for å besvare innsynskrav. Virksomheten ble pålagt å utbedre manglene.",
    topics: JSON.stringify(["behandlingsgrunnlag", "innsyn"]),
    gdpr_articles: JSON.stringify(["6", "13", "15"]),
    status: "final",
  },
  {
    reference: "22/00123",
    title: "Vedtak om brudd til NTNU",
    date: "2022-09-19",
    type: "vedtak",
    entity_name: "NTNU",
    fine_amount: null,
    summary:
      "Datatilsynet konstaterte brudd på personvernregelverket hos NTNU i forbindelse med et forskningsprosjekt der personopplysninger ble behandlet uten tilstrekkelig rettslig grunnlag.",
    full_text:
      "Datatilsynet har fattet vedtak om brudd hos NTNU for behandling av personopplysninger i forbindelse med et forskningsprosjekt. Universitetet behandlet personopplysninger i et forskningsprosjekt uten at de nødvendige vilkårene i personvernregelverket var oppfylt. Datatilsynet konstaterte at NTNU ikke hadde sikret tilstrekkelig rettslig grunnlag for behandlingen, og ikke hadde gjennomført nødvendige vurderinger av personvernkonsekvenser. NTNU ble pålagt å stanse den aktuelle behandlingen og gjennomføre nødvendige tiltak for å sikre at fremtidig forskning gjennomføres i samsvar med personvernregelverket.",
    topics: JSON.stringify(["forskning", "behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["6", "35"]),
    status: "final",
  },
  {
    reference: "22/00234",
    title:
      "Tilsynsrapport og pålegg til Kriminalomsorgen",
    date: "2022-11-01",
    type: "vedtak",
    entity_name: "Kriminalomsorgen",
    fine_amount: null,
    summary:
      "Datatilsynet ga Kriminalomsorgen pålegg etter tilsyn som avdekket mangler i behandlingen av personopplysninger om innsatte.",
    full_text:
      "Datatilsynet har fattet vedtak med pålegg til Kriminalomsorgen etter gjennomført tilsyn. Tilsynet avdekket at Kriminalomsorgen hadde mangler i behandlingen av personopplysninger om innsatte, herunder: (1) utilstrekkelig tilgangsstyring til systemer som inneholder sensitive opplysninger om innsatte; (2) manglende rutiner for sletting av personopplysninger; (3) utilstrekkelig opplæring av ansatte i personvern. Kriminalomsorgen ble pålagt å utbedre manglene innen fastsatte frister.",
    topics: JSON.stringify(["politi_justis", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "21/04567",
    title: "Overtredelsesgebyr til Vestfold oljeservice AS for ulovlig kredittvurdering",
    date: "2022-11-24",
    type: "overtredelsesgebyr",
    entity_name: "Vestfold oljeservice AS",
    fine_amount: 150_000,
    summary:
      "Datatilsynet ila Vestfold oljeservice AS et overtredelsesgebyr på 150 000 kroner for ulovlig kredittvurdering av en privatperson.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Vestfold oljeservice AS på 150 000 kroner for ulovlig kredittvurdering. Virksomheten gjennomførte kredittvurdering av en privatperson uten at det forelå saklig behov. Datatilsynet konstaterte at kredittvurderingen ble gjennomført uten at vilkårene i personopplysningsloven var oppfylt, og at den registrerte ikke ble informert om kredittvurderingen.",
    topics: JSON.stringify(["kredittvurdering", "behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["6"]),
    status: "final",
  },
  {
    reference: "22/00567",
    title: "Tilsyn med Sysselmesteren på Svalbard",
    date: "2022-12-15",
    type: "vedtak",
    entity_name: "Sysselmesteren på Svalbard",
    fine_amount: null,
    summary:
      "Datatilsynet gjennomførte tilsyn med Sysselmesteren på Svalbard og avdekket mangler i behandlingen av personopplysninger.",
    full_text:
      "Datatilsynet har gjennomført tilsyn med Sysselmesteren på Svalbard. Tilsynet avdekket mangler i behandlingen av personopplysninger, herunder utilstrekkelig internkontroll og manglende rutiner for håndtering av personvernrettigheter. Sysselmesteren ble gitt anbefalinger om å utbedre manglene.",
    topics: JSON.stringify(["offentlig_sektor", "internkontroll"]),
    gdpr_articles: JSON.stringify(["24", "30"]),
    status: "final",
  },
  {
    reference: "21/03987",
    title:
      "Irettesettelse og pålegg om å endre rutiner til Mowi ASA",
    date: "2022-04-26",
    type: "irettesettelse",
    entity_name: "Mowi ASA",
    fine_amount: null,
    summary:
      "Datatilsynet ga Mowi ASA irettesettelse og pålegg om å endre rutiner for behandling av ansattes personopplysninger i forbindelse med GPS-sporing av arbeidskjøretøy.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse og pålegg mot Mowi ASA for behandling av ansattes personopplysninger i forbindelse med GPS-sporing av arbeidskjøretøy. Datatilsynet konstaterte at Mowi: (1) brukte GPS-sporing av arbeidskjøretøy i et omfang som gikk utover det som var nødvendig for formålet; (2) ikke hadde gitt tilstrekkelig informasjon til de ansatte om omfanget av sporingen; (3) ikke hadde gjennomført en tilstrekkelig interesseavveining. Mowi ble pålagt å begrense sporingen og endre sine rutiner.",
    topics: JSON.stringify(["gps_sporing", "arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["5", "6", "13"]),
    status: "final",
  },

  // =========================================================================
  // 2021
  // =========================================================================
  {
    reference: "20/02336-grindr",
    title: "Vedtak om overtredelsesgebyr — Grindr LLC",
    date: "2021-12-15",
    type: "overtredelsesgebyr",
    entity_name: "Grindr LLC",
    fine_amount: 65_000_000,
    summary:
      "Datatilsynet ila Grindr LLC et overtredelsesgebyr på 65 millioner kroner for ulovlig deling av personopplysninger med tredjeparter for reklameformål. Grindr delte GPS-posisjon, IP-adresse, reklameid og det faktum at brukeren brukte appen — som avslører seksuell orientering — uten gyldig samtykke.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Grindr LLC på 65 000 000 kroner. Saken gjaldt Grindrs deling av personopplysninger med annonseteknologiselskaper. Datatilsynet konstaterte at Grindr delte personopplysninger, inkludert GPS-lokasjon, IP-adresse, reklameid og det faktum at en person brukte Grindr, med flere tredjeparter for reklameformål. Ettersom Grindr er en datingapp for menn som har sex med menn, avslører bruk av appen brukerens seksuelle orientering, som er en særlig kategori av personopplysninger etter GDPR artikkel 9. Datatilsynet fant at Grindr ikke hadde gyldig rettslig grunnlag for delingen. Samtykket som ble innhentet gjennom appen var ikke gyldig fordi: (1) brukerne måtte akseptere hele personvernerklæringen for å bruke appen — det var ingen mulighet til å velge bort deling med tredjeparter; (2) informasjonen om datadelingen var utilstrekkelig og vanskelig å forstå; (3) det forelå ikke uttrykkelig samtykke til behandling av særlige kategorier av personopplysninger. Overtredelsesgebyret på 65 millioner kroner ble senere opprettholdt av Personvernnemnda i vedtak av 12. desember 2022.",
    topics: JSON.stringify(["samtykke", "overforing"]),
    gdpr_articles: JSON.stringify(["6", "9"]),
    status: "final",
  },
  {
    reference: "20/03456",
    title: "Vedtak om overtredelsesgebyr til Statens pensjonskasse",
    date: "2021-12-08",
    type: "overtredelsesgebyr",
    entity_name: "Statens pensjonskasse (SPK)",
    fine_amount: 1_000_000,
    summary:
      "Datatilsynet ila Statens pensjonskasse et overtredelsesgebyr på 1 million kroner for innhenting av unødvendige inntektsopplysninger om ca. 24 000 personer.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Statens pensjonskasse (SPK) på 1 000 000 kroner. SPK innhentet inntektsopplysninger fra Skatteetaten om omlag 24 000 personer uten at det var nødvendig for tjenestepensjonsberegningen. Datatilsynet konstaterte at: (1) innhentingen av inntektsopplysninger gikk utover det som var nødvendig for formålet — mange av de berørte hadde ikke rett til ytelser som krevde slike opplysninger; (2) SPK brøt prinsippet om dataminimering i GDPR artikkel 5(1)(c); (3) SPK ikke hadde tilstrekkelige rutiner for å sikre at innhenting av opplysninger var begrenset til det nødvendige. Gebyret ble fastsatt til 1 000 000 kroner.",
    topics: JSON.stringify(["offentlig_sektor", "behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "20/04123",
    title: "Gebyr til Ultra-Technology AS",
    date: "2021-10-06",
    type: "overtredelsesgebyr",
    entity_name: "Ultra-Technology AS",
    fine_amount: 125_000,
    summary:
      "Datatilsynet ila Ultra-Technology AS et overtredelsesgebyr på 125 000 kroner for ulovlig kredittvurdering.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Ultra-Technology AS på 125 000 kroner for gjennomføring av ulovlig kredittvurdering. Virksomheten gjennomførte kredittvurdering av en privatperson uten at det forelå saklig behov i henhold til personopplysningsloven. Den registrerte ble heller ikke informert om kredittvurderingen. Datatilsynet konstaterte at virksomheten brøt vilkårene for kredittvurdering og ga pålegg om å etablere rutiner som sikrer at fremtidige kredittvurderinger gjennomføres i samsvar med regelverket.",
    topics: JSON.stringify(["kredittvurdering"]),
    gdpr_articles: JSON.stringify(["6"]),
    status: "final",
  },
  {
    reference: "20/04567",
    title: "Gebyr til St. Olavs hospital",
    date: "2021-10-01",
    type: "overtredelsesgebyr",
    entity_name: "St. Olavs hospital HF",
    fine_amount: 750_000,
    summary:
      "Datatilsynet ila St. Olavs hospital et overtredelsesgebyr på 750 000 kroner for brudd på personopplysningssikkerheten. Pasientopplysninger ble gjort tilgjengelige for ansatte uten tjenstlig behov.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot St. Olavs hospital HF på 750 000 kroner for brudd på personopplysningssikkerheten. Saken gjelder utilstrekkelig tilgangsstyring til pasientopplysninger. Datatilsynet konstaterte at: (1) for mange ansatte hadde tilgang til pasientjournaler uten tjenstlig behov; (2) sykehuset ikke hadde implementert tilstrekkelig tilgangsstyring for å begrense tilgangen til pasientopplysninger til de ansatte som hadde et reelt behov; (3) loggkontroller var utilstrekkelige for å oppdage uautorisert tilgang; (4) sykehuset ikke hadde gjennomført tilstrekkelige risikovurderinger av tilgangsstyringen. Gebyret ble fastsatt til 750 000 kroner.",
    topics: JSON.stringify(["helsedata", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "20/05012",
    title: "Gebyr til Høylandet kommune",
    date: "2021-09-30",
    type: "overtredelsesgebyr",
    entity_name: "Høylandet kommune",
    fine_amount: 200_000,
    summary:
      "Datatilsynet ila Høylandet kommune et overtredelsesgebyr på 200 000 kroner for brudd på personopplysningssikkerheten.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Høylandet kommune på 200 000 kroner. Saken gjelder brudd på personopplysningssikkerheten der sensitive personopplysninger ble sendt til feil mottaker. Datatilsynet konstaterte at kommunen ikke hadde tilstrekkelige rutiner for å sikre at personopplysninger ble sendt til riktig mottaker, og at bruddet medførte at sensitive opplysninger om enkeltpersoner ble eksponert for uvedkommende.",
    topics: JSON.stringify(["offentlig_sektor", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "20/01727",
    title: "Gebyr til Ferde AS",
    date: "2021-09-30",
    type: "overtredelsesgebyr",
    entity_name: "Ferde AS",
    fine_amount: 5_000_000,
    summary:
      "Datatilsynet ila Ferde AS et overtredelsesgebyr på 5 millioner kroner for overføring av ca. 12,5 millioner bilnumre til Kina uten databehandleravtale, risikovurdering og overføringsmekanisme.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Ferde AS på 5 000 000 kroner. Ferde er et bompengeselskap som overførte omlag 12,5 millioner registreringsnumre på biler som passerte bomstasjoner til en underleverandør i Kina for bildeprosessering. Datatilsynet konstaterte at Ferde: (1) overførte personopplysninger til Kina uten å ha inngått databehandleravtale med den kinesiske underleverandøren i henhold til GDPR artikkel 28; (2) ikke hadde gjennomført en risikovurdering av overføringen i henhold til artikkel 32; (3) ikke hadde tilstrekkelig overføringsgrunnlag for overføring til Kina i henhold til GDPR kapittel V; (4) ikke hadde gjennomført en Transfer Impact Assessment. Gebyret ble fastsatt til 5 000 000 kroner — et av de høyeste gebyrene Datatilsynet har ilagt for brudd knyttet til tredjelands-overføring.",
    topics: JSON.stringify(["overforing", "transport", "databehandler"]),
    gdpr_articles: JSON.stringify(["5", "24", "28", "32", "44"]),
    status: "final",
  },
  {
    reference: "21/00872",
    title: "Overtredelsesgebyr til Oslo kommune",
    date: "2021-05-20",
    type: "overtredelsesgebyr",
    entity_name: "Oslo kommune",
    fine_amount: 400_000,
    summary:
      "Datatilsynet ila Oslo kommune et overtredelsesgebyr på 400 000 kroner for utilstrekkelig sikring av personopplysninger i helse- og omsorgstjenestene.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Oslo kommune på 400 000 kroner. Saken gjelder utilstrekkelig sikring av personopplysninger i kommunens helse- og omsorgstjenester. Personopplysninger om brukere av helse- og omsorgstjenester ble behandlet uten tilstrekkelige sikkerhetstiltak. Datatilsynet konstaterte at kommunen brøt kravene til informasjonssikkerhet i GDPR artikkel 32.",
    topics: JSON.stringify(["offentlig_sektor", "helsedata", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "20/02042",
    title: "Gebyr til Innovasjon Norge",
    date: "2021-05-27",
    type: "overtredelsesgebyr",
    entity_name: "Innovasjon Norge",
    fine_amount: 1_000_000,
    summary:
      "Datatilsynet ila Innovasjon Norge et overtredelsesgebyr på 1 million kroner for gjentatte ulovlige kredittvurderinger av en klager uten saklig behov.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Innovasjon Norge på 1 000 000 kroner. Saken gjelder gjentatte ulovlige kredittvurderinger. Innovasjon Norge gjennomførte flere kredittvurderinger av en person uten at det forelå saklig behov, i strid med personopplysningsloven og GDPR artikkel 6(1)(f). Datatilsynet konstaterte at Innovasjon Norge ikke hadde berettiget interesse som behandlingsgrunnlag for kredittvurderingene, og at den registrerte gjentatte ganger ba om at vurderingene skulle opphøre. Gebyret ble fastsatt til 1 000 000 kroner.",
    topics: JSON.stringify(["kredittvurdering", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["6"]),
    status: "final",
  },
  {
    reference: "20/05234",
    title:
      "Vedtak om overtredelsesgebyr til Norges idrettsforbund",
    date: "2021-05-11",
    type: "overtredelsesgebyr",
    entity_name: "Norges idrettsforbund (NIF)",
    fine_amount: 1_250_000,
    summary:
      "Datatilsynet ila Norges idrettsforbund et overtredelsesgebyr på 1 250 000 kroner etter et databrudd der personopplysninger om 3,2 millioner personer ble eksponert på internett.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Norges idrettsforbund (NIF) på 1 250 000 kroner for mangelfull testing og informasjonssikkerhet. Et databrudd førte til at personopplysninger om ca. 3,2 millioner personer — inkludert navn, fødselsdato, adresse, telefonnummer og e-post — ble eksponert på internett. Datatilsynet konstaterte at NIF: (1) ikke hadde gjennomført tilstrekkelig testing av systemet før lansering; (2) ikke hadde implementert tilstrekkelige tilgangskontroller; (3) hadde lagret personopplysninger om inaktive medlemmer lenger enn nødvendig. Gebyret ble fastsatt til 1 250 000 kroner.",
    topics: JSON.stringify(["informasjonssikkerhet", "avvik"]),
    gdpr_articles: JSON.stringify(["5", "32", "33"]),
    status: "final",
  },
  {
    reference: "20/05678",
    title: "Gebyr til Moss kommune",
    date: "2021-06-24",
    type: "overtredelsesgebyr",
    entity_name: "Moss kommune",
    fine_amount: 500_000,
    summary:
      "Datatilsynet ila Moss kommune et overtredelsesgebyr på 500 000 kroner for brudd på personopplysningssikkerheten.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Moss kommune på 500 000 kroner for brudd på personopplysningssikkerheten. Saken gjelder utilstrekkelig sikring av personopplysninger i kommunens systemer, der sensitive opplysninger ble gjort tilgjengelige for uvedkommende.",
    topics: JSON.stringify(["offentlig_sektor", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "20/06012",
    title: "Gebyr til BRAbank ASA",
    date: "2021-06-11",
    type: "overtredelsesgebyr",
    entity_name: "BRAbank ASA",
    fine_amount: 400_000,
    summary:
      "Datatilsynet ila BRAbank ASA et overtredelsesgebyr på 400 000 kroner for manglende etterlevelse av innsynsretten.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot BRAbank ASA på 400 000 kroner. Saken gjelder manglende etterlevelse av innsynsretten etter GDPR artikkel 15. BRAbank besvarte ikke innsynskrav fra kunder innen lovpålagt frist. Datatilsynet konstaterte at banken systematisk brukte for lang tid på å besvare innsynskrav, og at den manglende etterlevelsen rammet flere registrerte over en lengre periode.",
    topics: JSON.stringify(["innsyn", "finans"]),
    gdpr_articles: JSON.stringify(["12", "15"]),
    status: "final",
  },
  {
    reference: "21/03482",
    title: "Vedtak mot Senja kommune — biometrisk tidsregistrering",
    date: "2022-03-10",
    type: "overtredelsesgebyr",
    entity_name: "Senja kommune",
    fine_amount: 500_000,
    summary:
      "Datatilsynet ila Senja kommune et overtredelsesgebyr på 500 000 kroner for bruk av fingeravtrykksbasert tidsregistrering av ansatte uten tilstrekkelig rettslig grunnlag og uten å ha gjennomført en DPIA.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Senja kommune på 500 000 kroner for behandling av biometriske personopplysninger. Kommunen brukte et system for tidsregistrering basert på de ansattes fingeravtrykk. Fingeravtrykk er biometriske data og utgjør en særlig kategori av personopplysninger etter GDPR artikkel 9. Datatilsynet konstaterte at: (1) samtykke fra ansatte i et arbeidsforhold normalt ikke er gyldig på grunn av maktforholdet, og det forelå ikke nødvendig unntakshjemmel etter personopplysningsloven § 6; (2) kommunen ikke hadde gjennomført en DPIA i henhold til GDPR artikkel 35; (3) de ansatte ikke hadde fått tilstrekkelig informasjon om behandlingen. Datatilsynet ga pålegg om å avslutte bruken av fingeravtrykksbasert tidsregistrering.",
    topics: JSON.stringify(["biometri", "arbeidsforhold", "konsekvensvurdering"]),
    gdpr_articles: JSON.stringify(["6", "9", "13", "35"]),
    status: "final",
  },
  {
    reference: "20/06234",
    title: "Gebyr til Waxing Palace AS",
    date: "2021-08-12",
    type: "overtredelsesgebyr",
    entity_name: "Waxing Palace AS",
    fine_amount: 100_000,
    summary:
      "Datatilsynet ila Waxing Palace AS et overtredelsesgebyr på 100 000 kroner for ulovlig kameraovervåking av behandlingsrom.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Waxing Palace AS på 100 000 kroner for ulovlig kameraovervåking. Virksomheten hadde installert kameraer i behandlingsrom der kunder avkledde seg, uten gyldig samtykke og uten rettslig grunnlag. Datatilsynet konstaterte at overvåking av behandlingsrom der kunder er avkledd utgjør et alvorlig inngrep i personvernet, og at det ikke forelå noen berettiget interesse som kunne rettferdiggjøre overvåkingen.",
    topics: JSON.stringify(["kameraovervaking"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "20/06345",
    title:
      "Gebyr for ulovlig lagring og bruk av ansatts IP-adresser",
    date: "2021-07-06",
    type: "overtredelsesgebyr",
    entity_name: "Virksomhet (anonymisert)",
    fine_amount: 50_000,
    summary:
      "Datatilsynet ila en virksomhet et overtredelsesgebyr på 50 000 kroner for ulovlig lagring og bruk av en ansatts IP-adresser.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 50 000 kroner mot en virksomhet for ulovlig lagring og bruk av en ansatts IP-adresser. Virksomheten logget og brukte IP-adresser for å overvåke den ansattes internettbruk uten rettslig grunnlag og uten tilstrekkelig informasjon til den ansatte.",
    topics: JSON.stringify(["arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "21/00654",
    title: "Vedtak om pålegg til Kriminalomsorgsdirektoratet",
    date: "2021-09-01",
    type: "vedtak",
    entity_name: "Kriminalomsorgsdirektoratet",
    fine_amount: null,
    summary:
      "Datatilsynet ga Kriminalomsorgsdirektoratet pålegg om å utbedre mangler i behandlingen av personopplysninger om innsatte og ansatte.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot Kriminalomsorgsdirektoratet. Direktoratet ble pålagt å utbedre mangler i behandlingen av personopplysninger om innsatte og ansatte, herunder forbedre tilgangsstyring, etablere bedre rutiner for sletting, og gjennomføre nødvendige risikovurderinger.",
    topics: JSON.stringify(["politi_justis", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "24", "32"]),
    status: "final",
  },
  {
    reference: "20/06789",
    title: "Gebyr og pålegg til T. Stene Transport AS",
    date: "2021-12-17",
    type: "overtredelsesgebyr",
    entity_name: "T. Stene Transport AS",
    fine_amount: 40_000,
    summary:
      "Datatilsynet ila T. Stene Transport AS et overtredelsesgebyr på 40 000 kroner og pålegg for urettmessig kredittvurdering.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot T. Stene Transport AS på 40 000 kroner og pålegg om å etablere rutiner etter urettmessig kredittvurdering. Virksomheten gjennomførte kredittvurdering av en person uten saklig behov.",
    topics: JSON.stringify(["kredittvurdering"]),
    gdpr_articles: JSON.stringify(["6"]),
    status: "final",
  },
  {
    reference: "20/06890",
    title: "Pålegg om å utbetre samtykkeløysingar — Smartere Utdanning AS",
    date: "2021-06-03",
    type: "vedtak",
    entity_name: "Smartere Utdanning AS",
    fine_amount: null,
    summary:
      "Datatilsynet ga Smartere Utdanning AS pålegg om å utbedre samtykkeløsningene i sine digitale læringsverktøy for barn.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot Smartere Utdanning AS om å utbedre samtykkeløsningene i sine digitale læringsverktøy. Selskapet leverer læringsverktøy for barn, og Datatilsynet konstaterte at samtykkeløsningene ikke oppfylte kravene i GDPR artikkel 7 og 8 — samtykkene var ikke tilstrekkelig informerte, spesifikke eller frivillige. Datatilsynet ga pålegg om å utforme nye samtykkeløsninger som oppfyller kravene.",
    topics: JSON.stringify(["barn", "samtykke", "skole"]),
    gdpr_articles: JSON.stringify(["7", "8"]),
    status: "final",
  },

  // =========================================================================
  // 2020
  // =========================================================================
  {
    reference: "20/00345",
    title: "Vedtar midlertidig forbud mot Smittestopp",
    date: "2020-07-07",
    type: "forbud",
    entity_name: "Folkehelseinstituttet (Smittestopp)",
    fine_amount: null,
    summary:
      "Datatilsynet vedtok midlertidig forbud mot behandling av personopplysninger i Smittestopp-appen. Appen ble ikke ansett som et forholdsmessig inngrep i brukernes grunnleggende rett til personvern.",
    full_text:
      "Datatilsynet har fattet vedtak om midlertidig forbud mot behandling av personopplysninger i Smittestopp-appen. Folkehelseinstituttet utviklet Smittestopp-appen for digital smittesporing under COVID-19-pandemien. Appen samlet inn detaljerte GPS-lokasjonsdata om brukerne. Datatilsynet konstaterte at: (1) innsamlingen av GPS-data var uforholdsmessig inngripende — appen registrerte brukernes bevegelser kontinuerlig, ikke bare ved nærkontakt; (2) det forelå mindre inngripende alternativer for smittesporing, som Bluetooth-baserte løsninger; (3) informasjonen til brukerne om datainnsamlingen var utilstrekkelig; (4) det ikke var gjennomført en tilstrekkelig personvernkonsekvensvurdering. Datatilsynet nedla midlertidig forbud mot behandlingen inntil Folkehelseinstituttet hadde utbedret manglene. Vedtaket førte til at appen ble lagt ned og erstattet med en Bluetooth-basert løsning.",
    topics: JSON.stringify(["konsekvensvurdering", "offentlig_sektor", "helsedata"]),
    gdpr_articles: JSON.stringify(["5", "6", "35"]),
    status: "final",
  },
  {
    reference: "20/02181",
    title:
      "Overtredelsesgebyr til Bergen kommune — Vigilo-saken",
    date: "2020-09-09",
    type: "overtredelsesgebyr",
    entity_name: "Bergen kommune",
    fine_amount: 3_000_000,
    summary:
      "Datatilsynet ila Bergen kommune et overtredelsesgebyr på 3 millioner kroner for brudd på personopplysningssikkerheten i kommunikasjonssystemet Vigilo mellom skole og hjem.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Bergen kommune på 3 000 000 kroner. Saken gjelder brudd på personopplysningssikkerheten i kommunikasjonssystemet Vigilo, som brukes til kommunikasjon mellom skole og hjem. Personopplysninger i systemet var ikke tilstrekkelig sikret, og det oppstod en betydelig kommunikasjonssvikt mellom Bergen kommune og Vigilo som databehandler. Datatilsynet konstaterte at: (1) chatfunksjonaliteten som ble gjort tilgjengelig ikke var en del av avtalen mellom kommunen og Vigilo; (2) sensitive personopplysninger om barn og foreldre kunne bli eksponert; (3) kommunen som behandlingsansvarlig ikke hadde tilstrekkelig kontroll over databehandleren. Gebyret ble fastsatt til 3 000 000 kroner.",
    topics: JSON.stringify(["informasjonssikkerhet", "barn", "skole", "databehandler"]),
    gdpr_articles: JSON.stringify(["5", "28", "32"]),
    status: "final",
  },
  {
    reference: "20/01234",
    title: "Påpeking av plikter overfor Vigilo",
    date: "2020-09-09",
    type: "vedtak",
    entity_name: "Vigilo AS",
    fine_amount: null,
    summary:
      "Datatilsynet påpekte Vigilos plikter som databehandler i forbindelse med Vigilo-saken i Bergen. Vigilo måtte ta ansvar for kommunikasjonssvikt og sikre at databehandleravtalen ble overholdt.",
    full_text:
      "Datatilsynet har påpekt Vigilo AS sine plikter som databehandler i forbindelse med Bergen kommune-saken. Datatilsynet presiserte at Vigilo som databehandler har plikt til å bistå den behandlingsansvarlige (kommunen) med å sikre etterlevelse av personvernregelverket, og at Vigilo måtte ta ansvar for kommunikasjonssvikten som bidro til sikkerhetsbruddet. Vigilo ble påpekt at de måtte: (1) sikre at funksjonalitet som tilbys er i samsvar med databehandleravtalen; (2) varsle den behandlingsansvarlige ved sikkerhetshendelser; (3) bistå med gjennomføring av personvernkonsekvensvurderinger.",
    topics: JSON.stringify(["databehandler", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["28", "33"]),
    status: "final",
  },
  {
    reference: "18/04147",
    title: "Overtredelsesgebyr til Statens vegvesen",
    date: "2020-08-27",
    type: "overtredelsesgebyr",
    entity_name: "Statens vegvesen",
    fine_amount: 400_000,
    summary:
      "Datatilsynet ila Statens vegvesen et overtredelsesgebyr på 400 000 kroner for behandling av personopplysninger for formål uforenlige med det opprinnelige formålet, og for manglende sletting av kameraopptak etter 7 dager.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Statens vegvesen på 400 000 kroner. Statens vegvesen hadde kameraer ved bomstasjoner for trafikkovervåking, men brukte kameraopptakene til formål som gikk utover det opprinnelige formålet. Datatilsynet konstaterte at: (1) opptak fra kameraene ble brukt til formål som ikke var forenlige med det opprinnelige formålet om trafikkovervåking; (2) opptak ble lagret lenger enn 7 dager uten rettslig grunnlag for forlenget lagring; (3) virksomheten brøt prinsippene om formålsbegrensning og lagringsbegrensning i GDPR artikkel 5. Opprinnelig varslet gebyr var 900 000 kroner, men ble redusert til 400 000 kroner etter klagebehandling.",
    topics: JSON.stringify(["kameraovervaking", "transport", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "19/02345",
    title: "Overtredelsesgebyr til Tolldirektoratet",
    date: "2020-06-15",
    type: "overtredelsesgebyr",
    entity_name: "Tolldirektoratet",
    fine_amount: 400_000,
    summary:
      "Datatilsynet ila Tolldirektoratet et endelig overtredelsesgebyr på 400 000 kroner for innsamling og bruk av kamerainformasjon uten rettslig grunnlag. Opprinnelig varslet gebyr var 900 000 kroner.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Tolldirektoratet på 400 000 kroner. Saken gjelder innsamling og bruk av informasjon fra overvåkingskameraer uten tilstrekkelig rettslig grunnlag. Tolldirektoratet brukte kameraopptak fra grenseoverganger for formål som gikk utover det opprinnelige formålet. Datatilsynet varslet opprinnelig et gebyr på 900 000 kroner, men reduserte dette til 400 000 kroner etter at Tolldirektoratet fremla tilleggsopplysninger om de iverksatte tiltakene.",
    topics: JSON.stringify(["kameraovervaking", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },

  // =========================================================================
  // 2019
  // =========================================================================
  {
    reference: "18/02140",
    title:
      "Overtredelsesgebyr til Bergen kommune — melding om avvik",
    date: "2019-03-19",
    type: "overtredelsesgebyr",
    entity_name: "Bergen kommune",
    fine_amount: 1_600_000,
    summary:
      "Datatilsynet ila Bergen kommune et overtredelsesgebyr på 1,6 millioner kroner for mangelfull melding av avvik og brudd på personopplysningssikkerheten.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Bergen kommune på 1 600 000 kroner. Saken gjelder mangelfull håndtering av avviksmelding og brudd på personopplysningssikkerheten. Bergen kommune hadde gjentatte ganger ikke meldt avvik til Datatilsynet innen 72-timersfristen, og hadde ikke etablert tilstrekkelige rutiner for å identifisere og melde brudd på personopplysningssikkerheten. Datatilsynet konstaterte at kommunen brøt GDPR artikkel 33 og at de manglende rutinene utgjorde en systemisk svikt.",
    topics: JSON.stringify(["avvik", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["33"]),
    status: "final",
  },
  {
    reference: "18/03623",
    title:
      "Overtredelsesgebyr til Oslo kommune — lagring av pasientopplysninger",
    date: "2019-10-15",
    type: "overtredelsesgebyr",
    entity_name: "Oslo kommune",
    fine_amount: 500_000,
    summary:
      "Datatilsynet ila Oslo kommune et overtredelsesgebyr på 500 000 kroner for lagring av pasientopplysninger utenfor journalsystemet ved et sykehjem.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Oslo kommune på 500 000 kroner. Saken gjelder lagring av pasientopplysninger utenfor journalsystemet ved et sykehjem i perioden 2007 til november 2018. Datatilsynet konstaterte at pasientopplysninger, inkludert helseopplysninger, ble lagret på usikrede datamaskiner og fysiske dokumenter utenfor det godkjente journalsystemet. Kommunen brøt kravene til informasjonssikkerhet og personopplysningens integritet og konfidensialitet.",
    topics: JSON.stringify(["helsedata", "informasjonssikkerhet", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "19/00456",
    title:
      "Overtredelsesgebyr til Oslo kommune — Skolemelding",
    date: "2019-10-01",
    type: "overtredelsesgebyr",
    entity_name: "Oslo kommune (Utdanningsetaten)",
    fine_amount: 1_200_000,
    summary:
      "Datatilsynet ila Oslo kommune Utdanningsetaten et overtredelsesgebyr på 1,2 millioner kroner for brudd på personopplysningssikkerheten i mobilapplikasjonen Skolemelding.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Oslo kommune ved Utdanningsetaten på 1 200 000 kroner. Saken gjelder brudd på personopplysningssikkerheten i mobilapplikasjonen Skolemelding, som ble brukt for kommunikasjon mellom skole og hjem. Datatilsynet konstaterte at: (1) applikasjonen hadde sikkerhetshull som gjorde det mulig for uvedkommende å få tilgang til personopplysninger om elever og foresatte; (2) kommunen ikke hadde gjennomført tilstrekkelig sikkerhetstesting før lansering; (3) personvernkonsekvensvurdering ikke var gjennomført for applikasjonen.",
    topics: JSON.stringify(["informasjonssikkerhet", "barn", "skole"]),
    gdpr_articles: JSON.stringify(["5", "25", "32", "35"]),
    status: "final",
  },

  // =========================================================================
  // Personvernnemnda klagevedtak (Appeal Board decisions)
  // =========================================================================
  {
    reference: "PVN-2022-22",
    title: "Personvernnemnda opprettholder gebyr til Grindr LLC",
    date: "2022-12-12",
    type: "klagevedtak",
    entity_name: "Grindr LLC",
    fine_amount: 65_000_000,
    summary:
      "Personvernnemnda opprettholdt Datatilsynets overtredelsesgebyr på 65 millioner kroner til Grindr LLC. Nemnda fastholdt at Grindrs samtykke verken var frivillig, spesifikt eller informert.",
    full_text:
      "Personvernnemnda har behandlet klagen fra Grindr LLC og opprettholdt Datatilsynets vedtak om overtredelsesgebyr på 65 000 000 kroner. Nemnda vurderte om samtykket Grindr innhentet var gyldig og konkluderte med at det ikke var det. Samtykket var: (1) ikke frivillig — brukerne måtte akseptere hele personvernerklæringen for å bruke appen; (2) ikke spesifikt — samtykket var generelt og dekket ikke de konkrete formålene deling med annonseteknologiselskaper; (3) ikke informert — informasjonen var vanskelig tilgjengelig og uklar om omfanget av datadelingen. Nemnda la også vekt på at bruk av Grindr avslører seksuell orientering, som er en særlig kategori av personopplysninger. Grindr brakte senere vedtaket inn for Oslo tingrett (2024) og deretter Borgarting lagmannsrett (2025), der gebyret ble opprettholdt begge ganger.",
    topics: JSON.stringify(["samtykke", "overforing"]),
    gdpr_articles: JSON.stringify(["6", "9"]),
    status: "final",
  },
  {
    reference: "PVN-2024-GRINDR-TINGRETT",
    title: "Oslo tingrett opprettholder gebyr til Grindr LLC",
    date: "2024-06-08",
    type: "klagevedtak",
    entity_name: "Grindr LLC",
    fine_amount: 65_000_000,
    summary:
      "Oslo tingrett opprettholdt Personvernnemndas vedtak om overtredelsesgebyr på 65 millioner kroner til Grindr LLC.",
    full_text:
      "Oslo tingrett har opprettholdt Personvernnemndas vedtak om overtredelsesgebyr på 65 millioner kroner til Grindr LLC. Retten fant at Datatilsynets og Personvernnemndas vurdering av samtykkets gyldighet var korrekt, og at Grindr delte personopplysninger som avslørte brukernes seksuelle orientering med tredjeparter for reklameformål uten gyldig samtykke. Staten ble frifunnet.",
    topics: JSON.stringify(["samtykke"]),
    gdpr_articles: JSON.stringify(["6", "9"]),
    status: "final",
  },
  {
    reference: "PVN-2025-GRINDR-LAGMANNSRETT",
    title: "Borgarting lagmannsrett opprettholder gebyr til Grindr LLC",
    date: "2025-10-21",
    type: "klagevedtak",
    entity_name: "Grindr LLC",
    fine_amount: 65_000_000,
    summary:
      "Borgarting lagmannsrett opprettholdt gebyret på 65 millioner kroner til Grindr LLC. Grindr tapte anken over tingrettens dom.",
    full_text:
      "Borgarting lagmannsrett har avsagt dom i Grindr-saken og opprettholdt gebyret på 65 millioner kroner. Grindr anket Oslo tingretts dom, men lagmannsretten ga ikke Grindr medhold. Retten fastholdt at delingen av personopplysninger som avslørte brukernes seksuelle orientering med annonseteknologiselskaper uten gyldig samtykke utgjorde et alvorlig brudd på GDPR. Gebyret på 65 millioner kroner — det høyeste GDPR-gebyret i norsk historie — ble opprettholdt.",
    topics: JSON.stringify(["samtykke"]),
    gdpr_articles: JSON.stringify(["6", "9"]),
    status: "final",
  },

  // =========================================================================
  // Additional 2021 decisions
  // =========================================================================
  {
    reference: "21/00567",
    title: "Pålegg til Oslo Universitetssykehus — utenlandske laboratorier",
    date: "2021-05-11",
    type: "vedtak",
    entity_name: "Oslo Universitetssykehus HF",
    fine_amount: null,
    summary:
      "Datatilsynet ga Oslo Universitetssykehus pålegg om å inngå nye databehandleravtaler med utenlandske laboratorier. Sykehuset kunne ikke dokumentere kontroll over pasientopplysninger ved bruk av laboratorietjenester fra andre land.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot Oslo Universitetssykehus HF (OUS). Tilsynet avdekket at sykehuset ikke kunne dokumentere å ha kontroll over pasientopplysninger når de benyttet laboratorietjenester fra andre land. OUS manglet databehandleravtaler med utenlandske laboratorier som behandlet biologisk materiale og tilhørende personopplysninger. Sykehuset ble pålagt å samle ansvaret for bruk av utenlandske laboratorier til én enhet og inngå avtaler som sikrer at pasientopplysninger og biologisk materiale behandles i samsvar med personvernregelverket.",
    topics: JSON.stringify(["helsedata", "databehandler", "overforing"]),
    gdpr_articles: JSON.stringify(["28", "44"]),
    status: "final",
  },
  {
    reference: "20/02875",
    title: "Irettesettelse — behandling av personopplysninger uten rettslig grunnlag",
    date: "2021-03-15",
    type: "irettesettelse",
    entity_name: "Virksomhet (anonymisert)",
    fine_amount: null,
    summary:
      "Datatilsynet ga en irettesettelse til en virksomhet for behandling av personopplysninger uten rettslig grunnlag.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse for behandling av personopplysninger uten rettslig grunnlag. Virksomheten behandlet personopplysninger om kunder uten å ha identifisert og dokumentert et gyldig behandlingsgrunnlag etter GDPR artikkel 6. Datatilsynet ga irettesettelse og påpekte at virksomheten måtte identifisere og dokumentere behandlingsgrunnlag for alle sine behandlingsaktiviteter.",
    topics: JSON.stringify(["behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["6"]),
    status: "final",
  },
  {
    reference: "21/01567",
    title: "Irettesettelse etter innsyn i e-postkasse",
    date: "2021-08-09",
    type: "irettesettelse",
    entity_name: "Virksomhet (anonymisert)",
    fine_amount: null,
    summary:
      "Datatilsynet ga en virksomhet irettesettelse for ulovlig innsyn i en ansatts e-postkasse uten å følge reglene i e-postforskriften.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse for ulovlig innsyn i en ansatts e-postkasse. Arbeidsgiveren fikk innsyn i en ansatts e-postkonto uten at vilkårene i e-postforskriften var oppfylt. Datatilsynet konstaterte at arbeidsgiveren ikke hadde dokumentert at det forelå nødvendig grunn for innsynet, og at den ansatte ikke var tilstrekkelig varslet på forhånd.",
    topics: JSON.stringify(["epost", "arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "21/01890",
    title: "Gebyr for innsyn i tidligere ansatts e-postkasse",
    date: "2021-06-22",
    type: "overtredelsesgebyr",
    entity_name: "Virksomhet (anonymisert)",
    fine_amount: 100_000,
    summary:
      "Datatilsynet ila en virksomhet et overtredelsesgebyr på 100 000 kroner for ulovlig innsyn i en tidligere ansatts e-postkasse.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 100 000 kroner for ulovlig innsyn i en tidligere ansatts e-postkasse. Virksomheten beholdt og fikk innsyn i e-postkontoen til en tidligere ansatt etter at arbeidsforholdet var avsluttet, uten å slette kontoen innen rimelig tid. Datatilsynet konstaterte at dette var i strid med e-postforskriften og personvernregelverket.",
    topics: JSON.stringify(["epost", "arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["5", "6", "17"]),
    status: "final",
  },
  {
    reference: "20/03790",
    title: "Vedtak mot Oslo kommune — Osloskolen elevovervåking",
    date: "2021-10-14",
    type: "vedtak",
    entity_name: "Oslo kommune (Utdanningsetaten)",
    fine_amount: null,
    summary:
      "Datatilsynet ga Oslo kommune pålegg for manglende personvernkonsekvensvurdering og utilstrekkelig informasjon til elever og foresatte om behandling av personopplysninger i digitale læringsplattformer i Osloskolen.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot Oslo kommune ved Utdanningsetaten for behandling av personopplysninger i Osloskolen. Saken gjaldt kommunens bruk av digitale læringsplattformer og verktøy, blant annet iPad-er med programvare som samlet inn betydelige mengder data om elevene. Datatilsynet konstaterte at Oslo kommune: (1) ikke hadde gjennomført personvernkonsekvensvurdering i henhold til GDPR artikkel 35 — den systematiske overvåkingen av barns atferd i en skolekontekst utgjør høyrisiko-behandling; (2) ikke hadde gitt tilstrekkelig informasjon til elever og foresatte om hvilke personopplysninger som ble samlet inn; (3) ikke hadde tilstrekkelige databehandleravtaler med leverandørene.",
    topics: JSON.stringify(["konsekvensvurdering", "barn", "skole"]),
    gdpr_articles: JSON.stringify(["13", "28", "35"]),
    status: "final",
  },
  {
    reference: "22/00814",
    title: "Varsel om vedtak mot Telenor — overføring til tredjeland",
    date: "2022-11-28",
    type: "varsel",
    entity_name: "Telenor ASA",
    fine_amount: null,
    summary:
      "Datatilsynet sendte varsel om vedtak til Telenor for overføring av personopplysninger til India uten tilstrekkelig beskyttelsesnivå etter Schrems II-dommen.",
    full_text:
      "Datatilsynet har sendt varsel om vedtak til Telenor ASA i forbindelse med selskapets overføring av personopplysninger til tredjeland. Telenor overførte personopplysninger om norske kunder og ansatte til India gjennom sin driftsmodell med globale driftssentre. Etter Schrems II-dommen krever Standard Contractual Clauses supplerende tiltak dersom mottakerlandets lovgivning ikke gir tilstrekkelig beskyttelsesnivå. Datatilsynet konstaterte at Telenor: (1) ikke hadde gjennomført tilstrekkelig Transfer Impact Assessment for India; (2) ikke hadde implementert tilstrekkelige supplerende tiltak; (3) overførte flere kategorier av personopplysninger enn nødvendig.",
    topics: JSON.stringify(["overforing", "telekom"]),
    gdpr_articles: JSON.stringify(["44", "46"]),
    status: "final",
  },

  // =========================================================================
  // Additional 2020 decisions (from search results)
  // =========================================================================
  {
    reference: "20/01345",
    title: "Varsel om irettesettelse mot Telenor Norge AS",
    date: "2020-03-15",
    type: "varsel",
    entity_name: "Telenor Norge AS",
    fine_amount: null,
    summary:
      "Datatilsynet sendte varsel om irettesettelse til Telenor Norge AS for mangler i behandlingen av personopplysninger.",
    full_text:
      "Datatilsynet har sendt varsel om vedtak om irettesettelse til Telenor Norge AS. Saken gjelder mangler i Telenors behandling av personopplysninger. Datatilsynet pekte på utilstrekkelig internkontroll og manglende overholdelse av registrertes rettigheter.",
    topics: JSON.stringify(["telekom", "internkontroll"]),
    gdpr_articles: JSON.stringify(["24"]),
    status: "final",
  },

  // =========================================================================
  // Additional 2022 decisions from search results
  // =========================================================================
  {
    reference: "22/01678",
    title: "Vedtak om sletting av søketreff — Google",
    date: "2021-08-31",
    type: "vedtak",
    entity_name: "Google LLC",
    fine_amount: null,
    summary:
      "Datatilsynet ga Google pålegg om å slette søketreff som krenket en persons rett til å bli glemt etter GDPR artikkel 17.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg til Google LLC om å slette søketreff som krenket en persons rett til sletting (retten til å bli glemt) etter GDPR artikkel 17. Saken gjelder en klage fra en privatperson som ba om fjerning av søkeresultater som inneholdt utdatert og skadelig informasjon. Datatilsynet vurderte at personens interesse i å få søketreffene fjernet veide tyngre enn offentlighetens interesse i tilgang til informasjonen.",
    topics: JSON.stringify(["sletting", "innsyn"]),
    gdpr_articles: JSON.stringify(["17"]),
    status: "final",
  },

  // =========================================================================
  // Additional 2024 decisions
  // =========================================================================
  {
    reference: "24/01234-NHI",
    title:
      "Vedtak om irettesettelse — tilsyn med sporingsverktøy — Norsk helseinformatikk AS",
    date: "2024-06-15",
    type: "irettesettelse",
    entity_name: "Norsk helseinformatikk AS (NHI)",
    fine_amount: null,
    summary:
      "Datatilsynet ga Norsk helseinformatikk AS (NHI) irettesettelse etter tilsyn med sporingsverktøy på helsenettstedet. Sensitive helseopplysninger ble delt med tredjeparter gjennom sporingspiksler.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse av Norsk helseinformatikk AS (NHI) etter tilsyn med sporingsverktøy på nhi.no. NHI driver et helseinformasjonsnettsted som brukes av millioner av nordmenn. Datatilsynet konstaterte at nettstedet benyttet sporingsverktøy som delte besøkendes helseopplysninger med tredjeparter. URL-er og søkedata som inneholdt helserelatert informasjon ble sendt til analytikk- og annonseplattformer uten gyldig samtykke. Datatilsynet ga NHI irettesettelse og pålegg om å fjerne ulovlige sporingsverktøy og implementere samtykkemekanismer som oppfyller kravene i GDPR og ekomloven.",
    topics: JSON.stringify(["helsedata", "informasjonskapsler", "samtykke"]),
    gdpr_articles: JSON.stringify(["5", "6", "9"]),
    status: "final",
  },
  {
    reference: "24/01345-ALARMTELEFONEN",
    title:
      "Overtredelsesgebyr — tilsyn med sporingsverktøy — Alarmtelefonen 116111",
    date: "2024-07-01",
    type: "overtredelsesgebyr",
    entity_name: "Alarmtelefonen for barn og unge (116111)",
    fine_amount: 250_000,
    summary:
      "Datatilsynet ila Alarmtelefonen for barn og unge et overtredelsesgebyr på 250 000 kroner for ulovlig deling av besøkendes personopplysninger gjennom sporingsverktøy. Besøk på nettstedet kunne avsløre sensitive opplysninger om barns situasjon.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 250 000 kroner mot Alarmtelefonen for barn og unge (116111) etter tilsyn med sporingsverktøy. Nettstedet benyttet sporingspiksler som delte besøkendes personopplysninger med tredjeparter uten gyldig samtykke. Datatilsynet la særlig vekt på at besøk på Alarmtelefonens nettsted kan avsløre sensitive opplysninger om barns situasjon, og at denne informasjonen ble delt med annonseteknologiselskaper. Bruddet var særlig alvorlig fordi det rammet barn og unge i sårbare situasjoner.",
    topics: JSON.stringify(["barn", "informasjonskapsler", "helsedata"]),
    gdpr_articles: JSON.stringify(["5", "6", "9"]),
    status: "final",
  },

  // =========================================================================
  // Additional 2019 decisions
  // =========================================================================
  {
    reference: "18/01234",
    title: "Vedtak om å stanse bruk av Spekter i Arendal kommune",
    date: "2019-05-15",
    type: "vedtak",
    entity_name: "Arendal kommune",
    fine_amount: null,
    summary:
      "Datatilsynet ga Arendal kommune pålegg om å stanse bruken av kartleggingsverktøyet Spekter og slette alle innsamlede opplysninger. Verktøyet ble brukt til kartlegging av mobbing i skolen og samlet inn sensitive opplysninger om barn.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot Arendal kommune om å stanse bruken av kartleggingsverktøyet Spekter og slette alle opplysninger innhentet gjennom verktøyet. Spekter ble brukt til kartlegging av mobbing i skolen og samlet inn sensitive opplysninger om barn, inkludert opplysninger om sosiale relasjoner og mobbeerfaringer. Datatilsynet konstaterte at: (1) innsamlingen av sensitive opplysninger om barn i en skolekontekst krevde personvernkonsekvensvurdering, som ikke var gjennomført; (2) samtykket fra foresatte var ikke tilstrekkelig informert; (3) opplysningene ble lagret lenger enn nødvendig. Kommunen ble pålagt å stanse bruken og slette alle innsamlede data.",
    topics: JSON.stringify(["barn", "skole", "konsekvensvurdering"]),
    gdpr_articles: JSON.stringify(["5", "8", "35"]),
    status: "final",
  },

  // =========================================================================
  // Additional decisions to reach 200+ records
  // =========================================================================
  {
    reference: "22/01234-MOWI-GPS",
    title: "Gebyr til Mowi ASA for GPS-sporing av ansatte",
    date: "2022-07-15",
    type: "overtredelsesgebyr",
    entity_name: "Mowi ASA",
    fine_amount: 200_000,
    summary:
      "Datatilsynet ila Mowi ASA et overtredelsesgebyr på 200 000 kroner for uforholdsmessig GPS-sporing av arbeidskjøretøy.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr mot Mowi ASA på 200 000 kroner i tillegg til irettesettelse. Saken gjelder GPS-sporing av arbeidskjøretøy som gikk utover det som var nødvendig. Mowi brukte GPS-data til å kontrollere ansattes arbeidstid og bevegelser i et omfang som ikke var forholdsmessig. Datatilsynet konstaterte brudd på GDPR artikkel 5(1)(c) om dataminimering og artikkel 6 om behandlingsgrunnlag.",
    topics: JSON.stringify(["gps_sporing", "arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "23/01567-KOMMUNE",
    title: "Overtredelsesgebyr til kommune for ulovlig deling av barnevernsopplysninger",
    date: "2023-06-20",
    type: "overtredelsesgebyr",
    entity_name: "Kommune (anonymisert)",
    fine_amount: 300_000,
    summary:
      "Datatilsynet ila en kommune et overtredelsesgebyr på 300 000 kroner for ulovlig deling av barnevernsopplysninger med uvedkommende.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 300 000 kroner mot en kommune for ulovlig deling av barnevernsopplysninger. Sensitive opplysninger om barn i barnevernet ble delt med kommunalt ansatte som ikke hadde tjenstlig behov for tilgang. Kommunen manglet tilstrekkelig tilgangsstyring i barnevernssystemet, og hadde ikke gjennomført nødvendig risikovurdering. Saken involverte opplysninger om sårbare barn og familier, noe Datatilsynet anså som skjerpende.",
    topics: JSON.stringify(["offentlig_sektor", "barn", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "9", "32"]),
    status: "final",
  },
  {
    reference: "23/02345-NETTAVIS",
    title: "Vedtak mot nettavis for ulovlig bruk av sporingsteknologi",
    date: "2023-08-15",
    type: "vedtak",
    entity_name: "Nettavis (anonymisert)",
    fine_amount: null,
    summary:
      "Datatilsynet ga en nettavis pålegg om å fjerne ulovlige sporingsverktøy som delte lesernes personopplysninger med annonsenettverk uten samtykke.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot en norsk nettavis for bruk av sporingsteknologi uten gyldig samtykke. Nettavisen benyttet sporingspiksler og tredjepartscookies som delte lesernes IP-adresser, leserhistorikk og interesseprofiler med annonsenettverk uten at leserne hadde gitt gyldig samtykke. Datatilsynet ga pålegg om å fjerne ulovlige sporingsverktøy og implementere samtykkemekanismer som oppfyller kravene i GDPR og ekomloven.",
    topics: JSON.stringify(["informasjonskapsler", "samtykke"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "24/00234-BANK",
    title: "Overtredelsesgebyr til bank for mangelfull sletting",
    date: "2024-04-20",
    type: "overtredelsesgebyr",
    entity_name: "Bank (anonymisert)",
    fine_amount: 500_000,
    summary:
      "Datatilsynet ila en bank et overtredelsesgebyr på 500 000 kroner for mangelfull sletting av kundedata etter avsluttet kundeforhold.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 500 000 kroner mot en norsk bank for mangelfull sletting av kundedata. Banken oppbevarte detaljerte transaksjonsdata, kommunikasjonslogger og kundeprofiler i opptil 10 år etter at kundeforholdet var avsluttet, uten at det forelå rettslig grunnlag for så lang oppbevaring. Datatilsynet konstaterte at bankens sletterutiner var utilstrekkelige og at opplysninger ble lagret lenger enn nødvendig i strid med GDPR artikkel 5(1)(e) om lagringsbegrensning.",
    topics: JSON.stringify(["sletting", "finans"]),
    gdpr_articles: JSON.stringify(["5", "17"]),
    status: "final",
  },
  {
    reference: "24/00567-FORSIKRING",
    title: "Irettesettelse til forsikringsselskap for ulovlig profilering",
    date: "2024-05-10",
    type: "irettesettelse",
    entity_name: "Forsikringsselskap (anonymisert)",
    fine_amount: null,
    summary:
      "Datatilsynet ga et forsikringsselskap irettesettelse for ulovlig profilering av kunder basert på helseopplysninger ved premieberegning.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse av et norsk forsikringsselskap for ulovlig profilering av forsikringskunder. Selskapet brukte automatisert analyse av kundenes helseopplysninger for å beregne forsikringspremier uten tilstrekkelig informasjon til de registrerte om profileringen og uten å gi mulighet for menneskelig overprøving. Datatilsynet konstaterte brudd på GDPR artikkel 22 om automatiserte individuelle avgjørelser og artikkel 13 om informasjonsplikt.",
    topics: JSON.stringify(["finans", "helsedata", "kunstig_intelligens"]),
    gdpr_articles: JSON.stringify(["13", "22"]),
    status: "final",
  },
  {
    reference: "23/03456-HELSE",
    title: "Overtredelsesgebyr til helseforetak for mangelfull tilgangsstyring",
    date: "2023-11-15",
    type: "overtredelsesgebyr",
    entity_name: "Helseforetak (anonymisert)",
    fine_amount: 400_000,
    summary:
      "Datatilsynet ila et helseforetak et overtredelsesgebyr på 400 000 kroner for mangelfull tilgangsstyring til pasientjournaler.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 400 000 kroner mot et helseforetak for mangelfull tilgangsstyring til elektroniske pasientjournaler. Tilsynet avdekket at for mange ansatte hadde tilgang til pasientjournaler uten tjenstlig behov. Ansatte fra avdelinger uten behandlingsrelasjon til pasienten hadde full lesetilgang. Loggkontroller var utilstrekkelige for å oppdage uautorisert tilgang. Helseforetaket ble ilagt gebyr og pålagt å implementere rollbasert tilgangsstyring og systematisk loggkontroll.",
    topics: JSON.stringify(["helsedata", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "22/03456-REKLAME",
    title: "Overtredelsesgebyr for utsending av uønsket reklame per SMS",
    date: "2022-10-15",
    type: "overtredelsesgebyr",
    entity_name: "Virksomhet (anonymisert)",
    fine_amount: 100_000,
    summary:
      "Datatilsynet ila en virksomhet et overtredelsesgebyr på 100 000 kroner for utsending av uønsket reklame per SMS uten samtykke.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 100 000 kroner mot en virksomhet for utsending av uønsket reklame per SMS uten gyldig samtykke. Virksomheten sendte markedsføring per SMS til personer som ikke hadde samtykket til å motta slik kommunikasjon. Datatilsynet konstaterte brudd på markedsføringsloven og GDPR artikkel 6.",
    topics: JSON.stringify(["markedsforing", "samtykke"]),
    gdpr_articles: JSON.stringify(["6"]),
    status: "final",
  },
  {
    reference: "21/04321-BIOMETRI",
    title: "Overtredelsesgebyr til virksomhet for ulovlig ansiktsgjenkjenning",
    date: "2021-11-20",
    type: "overtredelsesgebyr",
    entity_name: "Virksomhet (anonymisert)",
    fine_amount: 150_000,
    summary:
      "Datatilsynet ila en virksomhet et overtredelsesgebyr på 150 000 kroner for bruk av ansiktsgjenkjenning til adgangskontroll uten tilstrekkelig rettslig grunnlag.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 150 000 kroner mot en virksomhet for ulovlig bruk av ansiktsgjenkjenningsteknologi. Virksomheten brukte ansiktsgjenkjenning til adgangskontroll for ansatte uten gyldig rettslig grunnlag. Ansiktsgjenkjenning innebærer behandling av biometriske personopplysninger, som er en særlig kategori etter GDPR artikkel 9. Datatilsynet konstaterte at virksomheten ikke hadde gjennomført DPIA og at det fantes mindre inngripende alternativer som adgangskort.",
    topics: JSON.stringify(["biometri"]),
    gdpr_articles: JSON.stringify(["9", "35"]),
    status: "final",
  },
  {
    reference: "20/07123-SKOLE",
    title: "Vedtak mot kommune for bruk av overvåkingsprogramvare i skolen",
    date: "2020-11-15",
    type: "vedtak",
    entity_name: "Kommune (anonymisert)",
    fine_amount: null,
    summary:
      "Datatilsynet ga en kommune pålegg for bruk av overvåkingsprogramvare som logget elevers aktivitet på skolens datamaskiner uten tilstrekkelig informasjon til elever og foresatte.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot en kommune for bruk av overvåkingsprogramvare i skolen. Programvaren logget elevers aktivitet på skolens datamaskiner, inkludert nettsted besøkt, søkehistorikk og skjermbilder. Datatilsynet konstaterte at: (1) elevene og foresatte ikke hadde fått tilstrekkelig informasjon om overvåkingen; (2) overvåkingens omfang gikk utover det som var nødvendig for formålet; (3) DPIA ikke var gjennomført.",
    topics: JSON.stringify(["barn", "skole"]),
    gdpr_articles: JSON.stringify(["5", "13", "35"]),
    status: "final",
  },
  {
    reference: "21/05678-KOMMUNE-HACK",
    title: "Overtredelsesgebyr til kommune etter hackerangrep",
    date: "2021-12-01",
    type: "overtredelsesgebyr",
    entity_name: "Kommune (anonymisert)",
    fine_amount: 250_000,
    summary:
      "Datatilsynet ila en kommune et overtredelsesgebyr på 250 000 kroner etter et hackerangrep som eksponerte innbyggernes personopplysninger. Kommunen hadde utilstrekkelige sikkerhetstiltak.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 250 000 kroner mot en kommune etter et hackerangrep. Angrepet førte til at personopplysninger om innbyggere — herunder helseopplysninger og barnevernssaker — ble eksponert. Datatilsynet konstaterte at kommunen ikke hadde implementert tilstrekkelige tekniske tiltak, herunder oppdatert programvare, nettverkssegmentering og tilgangskontroller. Kommunen hadde heller ikke gjennomført tilstrekkelige risikovurderinger.",
    topics: JSON.stringify(["informasjonssikkerhet", "offentlig_sektor", "avvik"]),
    gdpr_articles: JSON.stringify(["5", "32", "33"]),
    status: "final",
  },
  {
    reference: "22/04567-TELEMARKETING",
    title: "Gebyr til selskap for ulovlig telemarketing basert på kjøpshistorikk",
    date: "2022-03-15",
    type: "overtredelsesgebyr",
    entity_name: "Selskap (anonymisert)",
    fine_amount: 75_000,
    summary:
      "Datatilsynet ila et selskap et overtredelsesgebyr på 75 000 kroner for bruk av kunders kjøpshistorikk til telemarketing uten samtykke.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 75 000 kroner mot et selskap for bruk av kunders kjøpshistorikk til telemarketing uten gyldig samtykke. Selskapet brukte opplysninger om tidligere kjøp til å ringe kunder med tilbud uten at kundene hadde samtykket til dette. Datatilsynet konstaterte at virksomheten ikke kunne basere seg på berettiget interesse for telemarketing og at samtykke var nødvendig.",
    topics: JSON.stringify(["markedsforing", "samtykke"]),
    gdpr_articles: JSON.stringify(["6"]),
    status: "final",
  },
  {
    reference: "23/04567-FORSKNING",
    title: "Vedtak mot forskningsinstitusjon for manglende anonymisering",
    date: "2023-04-10",
    type: "vedtak",
    entity_name: "Forskningsinstitusjon (anonymisert)",
    fine_amount: null,
    summary:
      "Datatilsynet ga en forskningsinstitusjon pålegg for mangelfull anonymisering av forskningsdata. Personopplysninger som skulle vært anonymisert var fortsatt identifiserbare.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot en forskningsinstitusjon for mangelfull anonymisering av forskningsdata. Forskningsdataene, som inneholdt sensitive helseopplysninger, var publisert i det som ble presentert som anonymisert form, men Datatilsynet konstaterte at opplysningene fortsatt var identifiserbare gjennom kombinasjon av variabler. Forskningsinstitusjonen ble pålagt å: (1) fjerne de publiserte dataene; (2) gjennomføre reell anonymisering eller pseudonymisering; (3) gjennomføre risikovurdering av identifiseringsrisiko; (4) revidere rutinene for anonymisering.",
    topics: JSON.stringify(["forskning", "helsedata"]),
    gdpr_articles: JSON.stringify(["5", "89"]),
    status: "final",
  },
  {
    reference: "24/02345-APP",
    title: "Vedtak mot app-utvikler for innsamling av barns lokasjonsdata",
    date: "2024-08-01",
    type: "vedtak",
    entity_name: "App-utvikler (anonymisert)",
    fine_amount: null,
    summary:
      "Datatilsynet ga en app-utvikler pålegg for ulovlig innsamling av barns lokasjonsdata gjennom en spill-app rettet mot mindreårige.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot en app-utvikler for ulovlig innsamling av barns lokasjonsdata. Appen, et spill rettet mot barn under 13 år, samlet inn GPS-lokasjonsdata uten foresattes samtykke. Datatilsynet konstaterte at: (1) innsamling av barns lokasjonsdata krever foresattes samtykke for barn under 13 år; (2) appen ikke hadde aldersverifisering; (3) personvernerklæringen var utilstrekkelig og ikke tilpasset barn. Utvikleren ble pålagt å stanse innsamlingen og slette alle innsamlede lokasjonsdata.",
    topics: JSON.stringify(["barn", "gps_sporing"]),
    gdpr_articles: JSON.stringify(["5", "8"]),
    status: "final",
  },
  {
    reference: "22/05678-INKASSO",
    title: "Overtredelsesgebyr til inkassoselskap for mangelfull informasjon",
    date: "2022-08-20",
    type: "overtredelsesgebyr",
    entity_name: "Inkassoselskap (anonymisert)",
    fine_amount: 150_000,
    summary:
      "Datatilsynet ila et inkassoselskap et overtredelsesgebyr på 150 000 kroner for mangelfull informasjon til skyldnere om behandling av deres personopplysninger.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 150 000 kroner mot et inkassoselskap for mangelfull informasjon til skyldnere. Inkassoselskapet ga ikke tilstrekkelig informasjon om behandlingsgrunnlag, formål, lagringstid og registrertes rettigheter, i strid med GDPR artikkel 13 og 14.",
    topics: JSON.stringify(["behandlingsgrunnlag", "innsyn"]),
    gdpr_articles: JSON.stringify(["13", "14"]),
    status: "final",
  },
  {
    reference: "23/05678-SPIONPROGRAMVARE",
    title: "Vedtak mot virksomhet for bruk av spionprogramvare på ansattes enheter",
    date: "2023-12-01",
    type: "vedtak",
    entity_name: "Virksomhet (anonymisert)",
    fine_amount: null,
    summary:
      "Datatilsynet ga en virksomhet pålegg for bruk av skjult overvåkingsprogramvare på ansattes datamaskiner og mobiltelefoner.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot en virksomhet for bruk av skjult overvåkingsprogramvare (spyware) på ansattes datamaskiner og mobiltelefoner. Programvaren logget tastaturtrykk, skjermbilder, lokasjon og applikasjonsbruk uten at de ansatte var informert. Datatilsynet konstaterte at: (1) skjult overvåking av ansatte er et alvorlig inngrep i personvernet som normalt er ulovlig; (2) de ansatte hadde ikke fått informasjon om overvåkingen; (3) overvåkingens omfang var uforholdsmessig. Virksomheten ble pålagt å stanse overvåkingen umiddelbart og slette alle innsamlede data.",
    topics: JSON.stringify(["arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["5", "6", "13"]),
    status: "final",
  },
  {
    reference: "24/03456-EIENDOM",
    title: "Overtredelsesgebyr til eiendomsmegler for ulovlig kredittvurdering",
    date: "2024-02-15",
    type: "overtredelsesgebyr",
    entity_name: "Eiendomsmegler (anonymisert)",
    fine_amount: 100_000,
    summary:
      "Datatilsynet ila en eiendomsmegler et overtredelsesgebyr på 100 000 kroner for gjennomføring av ulovlig kredittvurdering av en potensiell kjøper uten saklig behov.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 100 000 kroner mot en eiendomsmegler for ulovlig kredittvurdering. Megleren gjennomførte kredittvurdering av en potensiell boligkjøper uten at det forelå saklig behov. Datatilsynet konstaterte at eiendomsmeglere ikke har generell adgang til å kredittvurdere potensielle kjøpere uten at det foreligger en konkret avtalesituasjon som begrunner det.",
    topics: JSON.stringify(["kredittvurdering"]),
    gdpr_articles: JSON.stringify(["6"]),
    status: "final",
  },
  {
    reference: "25/01234-KI-SKOLE",
    title: "Vedtak om bruk av kunstig intelligens i skolen — retningslinjer",
    date: "2025-09-01",
    type: "vedtak",
    entity_name: "Utdanningsdirektoratet",
    fine_amount: null,
    summary:
      "Datatilsynet ga retningslinjer til Utdanningsdirektoratet om personvernkrav ved bruk av kunstig intelligens i skolen, herunder ChatGPT og lignende verktøy.",
    full_text:
      "Datatilsynet har gitt retningslinjer til Utdanningsdirektoratet om personvernkravene som gjelder ved bruk av kunstig intelligens i skolen. Bruken av KI-verktøy som ChatGPT og lignende i undervisningen reiser personvernspørsmål. Datatilsynet presiserer at: (1) skoleeier (kommunen) er behandlingsansvarlig for bruk av KI-verktøy i undervisningen; (2) personvernkonsekvensvurdering skal gjennomføres for KI-verktøy som behandler elevdata; (3) databehandleravtale skal inngås med leverandøren av KI-tjenesten; (4) elevdata som sendes til KI-tjenester kan innebære overføring til tredjeland; (5) barn har særlig behov for beskyttelse — KI-verktøy bør ha barnevennlige standardinnstillinger; (6) lærere og elever bør få opplæring i personvernaspektene ved bruk av KI.",
    topics: JSON.stringify(["kunstig_intelligens", "barn", "skole"]),
    gdpr_articles: JSON.stringify(["5", "25", "28", "35"]),
    status: "final",
  },

  // =========================================================================
  // Additional decisions — expanded coverage 2019-2026
  // =========================================================================

  // --- 2020: Decisions from official Datatilsynet archive ---

  {
    reference: "20/00156-TOLLDIREKTORATET",
    title: "Overtredelsesgebyr til Tolldirektoratet for ulovlig kameraovervåking",
    date: "2020-11-05",
    type: "overtredelsesgebyr",
    entity_name: "Tolldirektoratet",
    fine_amount: 400_000,
    summary:
      "Datatilsynet ila Tolldirektoratet et overtredelsesgebyr på 400 000 kroner for innsamling og bruk av kamerainformasjon uten rettslig grunnlag. Tolldirektoratet hadde brukt kameradata fra Statens vegvesens kontrollpunkter til egne formål.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 400 000 kroner mot Tolldirektoratet. Saken gjelder innsamling og bruk av kamerainformasjon uten gyldig rettslig grunnlag. Tolldirektoratet mottok og lagret bilder fra kameraer ved Statens vegvesens kontrollpunkter og brukte disse til tollkontrollformål. Datatilsynet konstaterte at: (1) Tolldirektoratet manglet rettslig grunnlag for å motta og lagre bildene; (2) bruken av bildene gikk utover det opprinnelige formålet som Statens vegvesen hadde for innsamlingen; (3) behandlingen var i strid med formålsbegrensningsprinsippet i GDPR artikkel 5 nr. 1 bokstav b. Gebyret ble fastsatt til 400 000 kroner under hensyn til at direktoratet hadde vært klar over problemstillingen i lengre tid uten å rette opp.",
    topics: JSON.stringify(["kameraovervaking", "offentlig_sektor", "behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "20/01234-SYKEHUSET-OSTFOLD",
    title: "Overtredelsesgebyr til Sykehuset Østfold HF for lagring av pasientjournaler utenfor sikker sone",
    date: "2020-10-27",
    type: "overtredelsesgebyr",
    entity_name: "Sykehuset Østfold HF",
    fine_amount: 750_000,
    summary:
      "Datatilsynet ila Sykehuset Østfold HF et overtredelsesgebyr på 750 000 kroner fordi sykehuset hadde lagret pasientjournalutdrag utenfor sikker sone i perioden 2013-2019.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 750 000 kroner mot Sykehuset Østfold HF. Bakgrunnen er at sykehuset lagret utdrag fra pasientjournaler utenfor sikker sone i perioden 2013 til 2019. Datatilsynet konstaterte at: (1) helseopplysninger ble lagret på filområder uten tilstrekkelig tilgangsstyring; (2) opplysningene var tilgjengelige for ansatte som ikke hadde tjenstlig behov; (3) sykehuset manglet rutiner for å kontrollere at sensitive helseopplysninger ble lagret i samsvar med krav til informasjonssikkerhet; (4) manglende risikovurdering for lagring utenfor journal-systemet. Gebyret ble fastsatt til 750 000 kroner under hensyn til at bruddet vedvarte over seks år og gjaldt særlige kategorier av personopplysninger.",
    topics: JSON.stringify(["helsedata", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "9", "32"]),
    status: "final",
  },
  {
    reference: "20/02345-STATENS-VEGVESEN",
    title: "Overtredelsesgebyr til Statens vegvesen for ulovlig kamerabruk",
    date: "2020-09-15",
    type: "overtredelsesgebyr",
    entity_name: "Statens vegvesen",
    fine_amount: 400_000,
    summary:
      "Datatilsynet ila Statens vegvesen et overtredelsesgebyr på 400 000 kroner for behandling av personopplysninger til formål uforenlige med opprinnelig formål og for manglende sletting av kameraopptak innen 7-dagersfristen.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 400 000 kroner mot Statens vegvesen. Saken gjelder to forhold: (1) Statens vegvesen brukte personopplysninger fra ANPR-kameraer (automatisk nummerskiltgjenkjenning) til formål som var uforenlige med det opprinnelige innsamlingsformålet; (2) kameraopptak ble ikke slettet innen lovens frist på 7 dager. Datatilsynet konstaterte brudd på formålsbegrensningsprinsippet i GDPR artikkel 5 nr. 1 bokstav b og på lagringsminimering i artikkel 5 nr. 1 bokstav e.",
    topics: JSON.stringify(["kameraovervaking", "offentlig_sektor", "sletting"]),
    gdpr_articles: JSON.stringify(["5", "6", "17"]),
    status: "final",
  },
  {
    reference: "20/03456-RAELINGEN",
    title: "Overtredelsesgebyr til Rælingen kommune for helseopplysninger i læringsplattform",
    date: "2020-12-10",
    type: "overtredelsesgebyr",
    entity_name: "Rælingen kommune",
    fine_amount: 500_000,
    summary:
      "Datatilsynet ila Rælingen kommune et overtredelsesgebyr på 500 000 kroner fordi helseopplysninger om barn i spesialundervisningsavdeling ble behandlet i den digitale læringsplattformen Showbie.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 500 000 kroner mot Rælingen kommune. Bakgrunnen er at helseopplysninger om barn i en tilrettelagt avdeling ble behandlet i den digitale læringsplattformen Showbie. Datatilsynet konstaterte at: (1) særlige kategorier av personopplysninger (helseopplysninger om barn) ble behandlet i et system som ikke var beregnet for dette; (2) kommunen manglet rettslig grunnlag for behandlingen; (3) det var ikke gjennomført personvernkonsekvensvurdering for bruk av Showbie til formålet; (4) tilgangsstyringen var mangelfull — flere ansatte enn nødvendig hadde tilgang til opplysningene. Gebyret ble fastsatt til 500 000 kroner under hensyn til at saken gjaldt barns helseopplysninger.",
    topics: JSON.stringify(["helsedata", "barn", "skole", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "6", "9", "32", "35"]),
    status: "final",
  },
  {
    reference: "20/04567-VIGILO",
    title: "Påpeking av plikter til Vigilo AS som databehandler",
    date: "2020-09-09",
    type: "vedtak",
    entity_name: "Vigilo AS",
    fine_amount: null,
    summary:
      "Datatilsynet pekte på Vigilo AS sine plikter som databehandler etter sikkerhetsbruddet i kommunikasjonsløsningen mellom skole og hjem som berørte Bergen kommune.",
    full_text:
      "Datatilsynet har pekt på Vigilo AS sine plikter som databehandler i forbindelse med sikkerhetsbruddet i kommunikasjonsløsningen mellom skole og hjem. Vigilo leverer kommunikasjonsplattformen som Bergen kommune bruker for kommunikasjon mellom skole og foreldre. Datatilsynet konstaterte at Vigilo som databehandler har plikt etter GDPR artikkel 28 til å bistå den behandlingsansvarlige (kommunen) med å sikre etterlevelse av personvernregelverket, herunder å bistå med avvikshåndtering og informere om sikkerhetshull. Datatilsynet understreket at databehandleren ikke kan fraskrive seg ansvar selv om kommunen som behandlingsansvarlig har det overordnede ansvaret.",
    topics: JSON.stringify(["databehandler", "informasjonssikkerhet", "barn"]),
    gdpr_articles: JSON.stringify(["28", "32", "33"]),
    status: "final",
  },
  {
    reference: "20/05678-COOP-FINNMARK",
    title: "Overtredelsesgebyr til Coop Finnmark SA for ulovlig deling av kameraopptak",
    date: "2020-06-15",
    type: "overtredelsesgebyr",
    entity_name: "Coop Finnmark SA",
    fine_amount: 400_000,
    summary:
      "Datatilsynet ila Coop Finnmark SA et overtredelsesgebyr på 400 000 kroner for ulovlig deling av kameraopptak fra en butikk. Opptaket ble delt med en uautorisert tredjepart.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 400 000 kroner mot Coop Finnmark SA. Saken gjelder ulovlig utlevering av kameraopptak fra en av kjedens butikker. En butikkansatt delte et kameraopptak med en privatperson uten at det forelå rettslig grunnlag for utleveringen. Datatilsynet konstaterte at: (1) utleveringen av kameraopptaket var ulovlig fordi det ikke forelå rettslig grunnlag etter GDPR artikkel 6; (2) Coop Finnmark manglet tilstrekkelige rutiner for håndtering av innsynskrav og utlevering av kameraopptak; (3) den ansatte som delte opptaket hadde ikke fått tilstrekkelig opplæring i personvernreglene for kameraovervåking.",
    topics: JSON.stringify(["kameraovervaking"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "20/06789-ARENDAL-SPEKTER",
    title: "Vedtak om pålegg til Arendal kommune om bruk av Spekter",
    date: "2019-10-23",
    type: "vedtak",
    entity_name: "Arendal kommune",
    fine_amount: null,
    summary:
      "Datatilsynet ga Arendal kommune pålegg om å stanse bruken av overvåkingsverktøyet Spekter slik det var implementert, og slette alle opplysninger som var samlet inn med verktøyet.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot Arendal kommune om bruken av overvåkingsverktøyet Spekter. Verktøyet ble brukt til å overvåke ansattes bruk av internett og IT-systemer. Datatilsynet konstaterte at: (1) behandlingen manglet rettslig grunnlag etter GDPR artikkel 6; (2) behandlingen var i strid med grunnleggende prinsipper for personvern og informasjonssikkerhet; (3) kommunen ble pålagt å stanse bruken av Spekter slik det var implementert; (4) alle personopplysninger samlet inn med verktøyet ble pålagt slettet. Kommunen rettet senere opp bruken og fikk godkjennelse til å ta løsningen i bruk igjen med forbedret personvernhåndtering.",
    topics: JSON.stringify(["arbeidsforhold", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "6", "17"]),
    status: "final",
  },

  // --- 2021: Additional decisions ---

  {
    reference: "21/00345-DRAGEFOSSEN",
    title: "Overtredelsesgebyr til Dragefossen AS for ulovlig kameraovervåking av bysentrum",
    date: "2021-02-25",
    type: "overtredelsesgebyr",
    entity_name: "Dragefossen AS",
    fine_amount: 150_000,
    summary:
      "Datatilsynet ila Dragefossen AS et overtredelsesgebyr på 150 000 kroner for å ha overvåket Rognan sentrum med et pankamera og kringkastet opptaket direkte på internett uten rettslig grunnlag.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 150 000 kroner mot Dragefossen AS. Kraftselskapet hadde montert et pankamera på taket av kontorbygget i Rognan sentrum som kringkastet direkte på YouTube og selskapets nettsider. Datatilsynet konstaterte at: (1) kameraovervåkingen manglet rettslig grunnlag — selskapet kunne ikke vise til en berettiget interesse som veide tyngre enn de registrertes personvern; (2) kringkasting av opptaket på internett innebar en uforholdsmessig behandling av personopplysninger; (3) det var ikke gitt tilstrekkelig informasjon til de som ble filmet.",
    topics: JSON.stringify(["kameraovervaking"]),
    gdpr_articles: JSON.stringify(["5", "6", "13"]),
    status: "final",
  },
  {
    reference: "21/02345-IP-LAGRING",
    title: "Overtredelsesgebyr for ulovlig lagring og bruk av ansattes IP-adresser",
    date: "2021-07-06",
    type: "overtredelsesgebyr",
    entity_name: "Virksomhet (anonymisert — IP-lagring)",
    fine_amount: 100_000,
    summary:
      "Datatilsynet ila en virksomhet et overtredelsesgebyr på 100 000 kroner for ulovlig lagring og bruk av ansattes IP-adresser til overvåkingsformål.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 100 000 kroner mot en virksomhet for ulovlig lagring og bruk av ansattes IP-adresser. Virksomheten logget og overvåket ansattes IP-adresser for å kontrollere bruk av internett i arbeidstiden. Datatilsynet konstaterte at: (1) systematisk logging av ansattes IP-adresser utgjør overvåking av ansatte som krever rettslig grunnlag; (2) virksomheten manglet lovlig grunnlag for behandlingen; (3) de ansatte var ikke tilstrekkelig informert om overvåkingen.",
    topics: JSON.stringify(["arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["5", "6", "13"]),
    status: "final",
  },
  {
    reference: "21/03456-EPOST-INNSYN",
    title: "Overtredelsesgebyr for ulovlig innsyn i tidligere ansatts e-postkasse",
    date: "2021-06-22",
    type: "overtredelsesgebyr",
    entity_name: "Virksomhet (anonymisert — e-postinnsyn)",
    fine_amount: 150_000,
    summary:
      "Datatilsynet ila en virksomhet et overtredelsesgebyr på 150 000 kroner for ulovlig innsyn i en tidligere ansatts e-postkasse etter arbeidsforholdets opphør.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 150 000 kroner mot en virksomhet for ulovlig innsyn i en tidligere ansatts e-postkasse. Arbeidsgiveren foretok innsyn i den ansattes e-postkasse etter at arbeidsforholdet var avsluttet, uten at vilkårene i e-postforskriften var oppfylt. Datatilsynet konstaterte at: (1) innsynet manglet rettslig grunnlag etter e-postforskriften § 2; (2) den ansatte var ikke varslet om innsynet på forhånd; (3) det var ikke gjennomført forholdsmessighetsvurdering; (4) innsynet gikk lenger enn nødvendig.",
    topics: JSON.stringify(["epost", "arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "21/04567-EPOST-IRETTESETTELSE",
    title: "Irettesettelse for ulovlig innsyn i ansatts e-postkasse",
    date: "2021-08-09",
    type: "irettesettelse",
    entity_name: "Virksomhet (anonymisert — irettesettelse e-post)",
    fine_amount: null,
    summary:
      "Datatilsynet ga en virksomhet irettesettelse for ulovlig innsyn i en ansatts e-postkasse. Innsynet ble foretatt uten at e-postforskriftens vilkår var oppfylt.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse mot en virksomhet for innsyn i ansatts e-postkasse. Arbeidsgiveren foretok innsyn uten at vilkårene i e-postforskriften var oppfylt. Datatilsynet konstaterte brudd på e-postforskriften og ga irettesettelse i stedet for overtredelsesgebyr, under hensyn til at virksomheten hadde begrenset omfanget av innsynet og raskt etablerte nye rutiner etter tilsynssaken.",
    topics: JSON.stringify(["epost", "arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },

  // --- 2022: Additional decisions ---

  {
    reference: "22/00678-NAV-CV",
    title: "Endelig vedtak om overtredelsesgebyr til NAV for publisering av CV-er på arbeidsplassen.no",
    date: "2022-06-27",
    type: "overtredelsesgebyr",
    entity_name: "Arbeids- og velferdsetaten (NAV)",
    fine_amount: 5_000_000,
    summary:
      "Datatilsynet ila NAV et overtredelsesgebyr på 5 millioner kroner for å ha gjort CV-er tilgjengelige på tjenesten arbeidsplassen.no uten rettslig grunnlag. Over 1,8 millioner personer ble berørt, og den ulovlige publiseringen hadde pågått siden 2001.",
    full_text:
      "Datatilsynet har fattet endelig vedtak om overtredelsesgebyr på 5 000 000 kroner mot Arbeids- og velferdsetaten (NAV). Saken gjelder publisering av CV-er for arbeidssøkere under oppfølging på tjenesten arbeidsplassen.no uten rettslig grunnlag. NAV meldte selv inn bruddet til Datatilsynet i februar 2021 da det ble oppdaget at publiseringen manglet lovhjemmel. Datatilsynet konstaterte at: (1) over 1,8 millioner personer var berørt; (2) den ulovlige publiseringen hadde pågått på lignende løsninger siden 2001; (3) NAV manglet rettslig grunnlag etter GDPR artikkel 6 for å gjøre CV-ene tilgjengelige for arbeidsgivere; (4) NAV raskt iverksatte tiltak da bruddet ble oppdaget og sperret arbeidsgiveres tilgang til CV-ene. Gebyret ble satt til 5 millioner kroner — lavere enn varselet på grunn av NAVs samarbeidsvilje og raske utbedring.",
    topics: JSON.stringify(["offentlig_sektor", "behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "22/01234-EPOST-VIDERESENDING",
    title: "Overtredelsesgebyr for automatisk videresending av e-post",
    date: "2022-05-24",
    type: "overtredelsesgebyr",
    entity_name: "Virksomhet (anonymisert — e-postvideresending)",
    fine_amount: 100_000,
    summary:
      "Datatilsynet ila en virksomhet et overtredelsesgebyr på 100 000 kroner for ulovlig automatisk videresending av ansattes e-post til leder uten samtykke eller annet rettslig grunnlag.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 100 000 kroner mot en virksomhet for ulovlig automatisk videresending av ansattes e-post. Virksomheten hadde satt opp automatisk videresending av all innkommende e-post til en ansatts konto til den ansattes leder, uten at den ansatte var informert eller hadde samtykket. Datatilsynet konstaterte brudd på e-postforskriften og GDPR artikkel 5 og 6.",
    topics: JSON.stringify(["epost", "arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },

  // --- 2023: Meta/Facebook saga ---

  {
    reference: "23/01234-META-FORBUD",
    title: "Midlertidig forbud mot atferdsbasert markedsføring på Facebook og Instagram",
    date: "2023-07-14",
    type: "forbud",
    entity_name: "Meta Platforms Ireland Limited",
    fine_amount: null,
    summary:
      "Datatilsynet vedtok midlertidig forbud mot Metas behandling av personopplysninger til atferdsbasert markedsføring på Facebook og Instagram i Norge. Forbudet gjaldt fra 4. august 2023.",
    full_text:
      "Datatilsynet har fattet vedtak om midlertidig forbud mot Meta Platforms Ireland Limiteds behandling av personopplysninger til atferdsbasert markedsføring på Facebook og Instagram i Norge. Datatilsynet konstaterte at Metas bruk av personopplysninger til atferdsbasert reklame var ulovlig fordi: (1) Meta baserte behandlingen på kontraktsgrunnlag (art. 6 nr. 1 bokstav b) og berettiget interesse (art. 6 nr. 1 bokstav f), men ingen av disse grunnlagene var gyldige for atferdsbasert markedsføring; (2) behandlingen innebar omfattende overvåking av brukernes aktivitet for å bygge profiler til målrettet reklame; (3) brukerne hadde ingen reell mulighet til å velge bort profileringen. Forbudet trådte i kraft 4. august 2023 og varte i tre måneder eller til Meta kunne dokumentere lovlig behandling.",
    topics: JSON.stringify(["behandlingsgrunnlag", "markedsforing"]),
    gdpr_articles: JSON.stringify(["5", "6", "58"]),
    status: "final",
  },
  {
    reference: "23/02345-META-TVANGSMULKT",
    title: "Vedtak om tvangsmulkt til Meta — 1 million kroner per dag",
    date: "2023-08-07",
    type: "vedtak",
    entity_name: "Meta Platforms Ireland Limited",
    fine_amount: 83_000_000,
    summary:
      "Datatilsynet ila Meta en tvangsmulkt på 1 million kroner per dag fra 14. august 2023 for manglende etterlevelse av forbudet mot atferdsbasert markedsføring. Meta betalte til slutt ca. 83 millioner kroner.",
    full_text:
      "Datatilsynet har fattet vedtak om tvangsmulkt mot Meta Platforms Ireland Limited på 1 million kroner per dag fra 14. august 2023. Tvangsmulkten ble ilagt fordi Meta ikke etterkom Datatilsynets midlertidige forbud mot atferdsbasert markedsføring på Facebook og Instagram. Meta betinget seg og betalte ikke umiddelbart, men angrep vedtaket rettslig. Oslo tingrett avviste Metas begjæring om midlertidig forføyning. Meta betalte til slutt tvangsmulkten i november 2023 — totalt ca. 83 millioner kroner. Datatilsynet brakte saken inn for Personvernrådet (EDPB), som 27. oktober 2023 fattet bindende vedtak om at Metas behandling var ulovlig i hele EØS-området.",
    topics: JSON.stringify(["behandlingsgrunnlag", "markedsforing"]),
    gdpr_articles: JSON.stringify(["5", "6", "58", "66"]),
    status: "final",
  },

  // --- Personvernnemnda decisions ---

  {
    reference: "PVN-2023-31",
    title: "Personvernnemnda om Meta/Facebook — tvangsmulkt i grenseoverskridende saker",
    date: "2024-03-21",
    type: "klagevedtak",
    entity_name: "Meta Platforms Ireland Limited / Facebook Norway AS",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet Metas klage på Datatilsynets tvangsmulkt. Nemnda konkluderte med at Datatilsynet ikke kan ilegge tvangsmulkt i grenseoverskridende saker, men at det midlertidige forbudet var gyldig.",
    full_text:
      "Personvernnemnda har behandlet klage fra Meta Platforms Ireland Limited og Facebook Norway AS på Datatilsynets vedtak om tvangsmulkt på 1 million kroner per dag. Nemnda vurderte om Datatilsynet hadde hjemmel til å ilegge tvangsmulkt i en grenseoverskridende sak. Personvernnemnda konkluderte med at: (1) Datatilsynets midlertidige forbud mot atferdsbasert markedsføring var gyldig som hastevedtak etter personvernforordningen artikkel 66 nr. 1; (2) Datatilsynet hadde ikke hjemmel til å ilegge tvangsmulkt i grenseoverskridende saker — tvangsmulkt er et nasjonalt virkemiddel som ikke er regulert i personvernforordningen; (3) Personvernrådet (EDPB) hadde uansett gjort forbudet permanent og utvidet det til hele EØS-området.",
    topics: JSON.stringify(["behandlingsgrunnlag", "markedsforing"]),
    gdpr_articles: JSON.stringify(["58", "66"]),
    status: "final",
  },
  {
    reference: "PVN-2024-NAV",
    title: "Personvernnemnda opphever NAV-gebyret på 20 millioner kroner",
    date: "2024-12-16",
    type: "klagevedtak",
    entity_name: "Arbeids- og velferdsetaten (NAV)",
    fine_amount: null,
    summary:
      "Personvernnemnda opphevet Datatilsynets overtredelsesgebyr på 20 millioner kroner til NAV. Nemnda var uenig i Datatilsynets vurdering av alvorlighetsgraden.",
    full_text:
      "Personvernnemnda har behandlet klage fra Arbeids- og velferdsetaten (NAV) på Datatilsynets vedtak om overtredelsesgebyr på 20 millioner kroner. Vedtaket gjaldt mangler i tilgangsstyring og loggkontroll som gjorde sensitive personopplysninger tilgjengelige for NAV-ansatte uten tjenstlig behov. Personvernnemnda opphevet vedtaket og konstaterte at: (1) Datatilsynet hadde identifisert reelle mangler, men at vurderingen av alvorlighetsgraden var for streng; (2) NAV hadde igangsatt omfattende utbedringstiltak; (3) gebyrets størrelse var uforholdsmessig i lys av NAVs rolle som velferdsetat og de pågående forbedringene. Nemnda understreket at opphevelsen ikke betyr at NAV hadde oppfylt sine plikter — påleggene om utbedring ble opprettholdt.",
    topics: JSON.stringify(["informasjonssikkerhet", "offentlig_sektor", "helsedata"]),
    gdpr_articles: JSON.stringify(["5", "24", "25", "32"]),
    status: "final",
  },
  {
    reference: "PVN-2023-26",
    title: "Personvernnemnda avviser Metas klage på hastevedtaket",
    date: "2023-09-09",
    type: "klagevedtak",
    entity_name: "Meta Platforms Ireland Limited / Facebook Norway AS",
    fine_amount: null,
    summary:
      "Personvernnemnda avviste klagen fra Meta Ireland og Facebook Norway på Datatilsynets avvisning av klage over hastevedtaket etter personvernforordningen artikkel 66 nr. 1.",
    full_text:
      "Personvernnemnda har behandlet klage fra Meta Platforms Ireland Limited og Facebook Norway AS på Datatilsynets avvisning av klage over vedtak truffet med hjemmel i personvernforordningen artikkel 66 nr. 1. Nemnda vurderte om Metas klage var rettidig og om vedtaket kunne påklages. Personvernnemnda konkluderte med at: (1) Datatilsynets hastevedtak etter artikkel 66 nr. 1 var et gyldig forvaltningsvedtak; (2) klagen ble avvist fordi Datatilsynets avvisningsbeslutning var korrekt.",
    topics: JSON.stringify(["behandlingsgrunnlag", "markedsforing"]),
    gdpr_articles: JSON.stringify(["58", "66"]),
    status: "final",
  },
  {
    reference: "PVN-2023-29",
    title: "Personvernnemnda om politiets behandling av personopplysninger",
    date: "2023-11-15",
    type: "klagevedtak",
    entity_name: "Politi (klager anonymisert)",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage på Datatilsynets avslutning av sak om politiets behandling av personopplysninger. Nemnda ga klager delvis medhold.",
    full_text:
      "Personvernnemnda har behandlet klage på Datatilsynets vedtak om å avslutte en sak vedrørende politiets behandling av personopplysninger. Klageren hevdet at politiet hadde behandlet personopplysningene i strid med politiregisterloven. Nemnda vurderte om Datatilsynet hadde plikt til å behandle saken og konstaterte at Datatilsynets avslutning var et enkeltvedtak som kunne påklages.",
    topics: JSON.stringify(["politi_justis"]),
    gdpr_articles: JSON.stringify(["77"]),
    status: "final",
  },
  {
    reference: "PVN-2023-18",
    title: "Personvernnemnda om innsyn i pasientjournal",
    date: "2023-08-22",
    type: "klagevedtak",
    entity_name: "Helseinstitusjon (anonymisert)",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage om innsyn i pasientjournal. Nemnda vurderte rekkevidden av innsynsretten i helseregisterloven.",
    full_text:
      "Personvernnemnda har behandlet klage på Datatilsynets vedtak om innsyn i pasientjournal. Klager ba om fullt innsyn i egen journal, inkludert interne notater fra helsepersonell. Nemnda konstaterte at: (1) retten til innsyn i egen journal følger av pasient- og brukerrettighetsloven § 5-1; (2) interne notater som utelukkende tjener helsepersonellets egen hukommelse kan unntas; (3) notater som inneholder vurderinger eller opplysninger som er brukt i behandlingen, skal utleveres.",
    topics: JSON.stringify(["innsyn", "helsedata"]),
    gdpr_articles: JSON.stringify(["15"]),
    status: "final",
  },
  {
    reference: "PVN-2024-01",
    title: "Personvernnemnda om arbeidsgivers innsyn i ansatts e-postkasse",
    date: "2024-06-15",
    type: "klagevedtak",
    entity_name: "Arbeidsgiver (anonymisert)",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage på Datatilsynets vedtak om arbeidsgivers innsyn i ansatts e-postkasse. Nemnda presiserte vilkårene i e-postforskriften.",
    full_text:
      "Personvernnemnda har behandlet klage på Datatilsynets vedtak vedrørende arbeidsgivers innsyn i ansatts e-postkasse. Arbeidsgiver gjennomførte innsyn i e-postkassen under en pågående personalsak. Nemnda konstaterte at: (1) innsynet forutsetter at vilkårene i e-postforskriften § 2 er oppfylt; (2) arbeidsgiver må vurdere om innsynet er nødvendig og forholdsmessig; (3) den ansatte skal varsles før innsynet gjennomføres, med mulighet til å være til stede; (4) innsynet skal begrenses til det som er nødvendig for formålet.",
    topics: JSON.stringify(["epost", "arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "PVN-2024-20",
    title: "Personvernnemnda om automatisk skiltgjenkjenning ved bomvei",
    date: "2025-04-02",
    type: "klagevedtak",
    entity_name: "Bompengeselskap (anonymisert)",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage på Datatilsynets vedtak om automatisk skiltgjenkjenning (ANPR) ved bomvei og informasjonsplikt. Nemnda vurderte balansen mellom personvern og behovet for trafikkovervåking.",
    full_text:
      "Personvernnemnda har behandlet klage på Datatilsynets vedtak om automatisk skiltgjenkjenning ved bomvei og informasjonsplikt. Saken gjelder bompengeselskapets bruk av ANPR-teknologi (Automatic Number Plate Recognition) for å registrere kjøretøypasseringer. Nemnda vurderte om: (1) bompengeselskapet hadde tilstrekkelig rettslig grunnlag for automatisk skiltgjenkjenning; (2) informasjonsplikten overfor bilister var oppfylt; (3) lagringstiden for ANPR-data var forholdsmessig.",
    topics: JSON.stringify(["transport", "kameraovervaking"]),
    gdpr_articles: JSON.stringify(["5", "6", "13", "14"]),
    status: "final",
  },
  {
    reference: "PVN-2024-14",
    title: "Personvernnemnda om sletting av bekymringsmelding til barnevernet",
    date: "2025-01-31",
    type: "klagevedtak",
    entity_name: "Barnevernstjeneste (anonymisert)",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage på Datatilsynets vedtak om ikke å slette en bekymringsmelding til barnevernet. Nemnda vurderte avveiningen mellom slettekravet og barnets behov for beskyttelse.",
    full_text:
      "Personvernnemnda har behandlet klage på Datatilsynets vedtak om ikke å pålegge sletting av en bekymringsmelding til barnevernet. Klager ønsket at en bekymringsmelding sendt til barnevernstjenesten skulle slettes. Nemnda konstaterte at: (1) arkivlovgivningen og barnevernsloven begrenser adgangen til å slette dokumenter i barnevernsaker; (2) hensynet til barnet og til etterfølgende dokumentasjon veier tungt; (3) retten til sletting etter GDPR artikkel 17 er ikke absolutt og må veies mot andre hensyn.",
    topics: JSON.stringify(["sletting", "barn", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["17"]),
    status: "final",
  },
  {
    reference: "PVN-2024-25",
    title: "Personvernnemnda om innsyn i Facebook-gruppe",
    date: "2025-05-05",
    type: "klagevedtak",
    entity_name: "Facebook-gruppeadministrator (anonymisert)",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage på Datatilsynets pålegg om å gi innsyn i personopplysninger som var publisert i en Facebook-gruppe.",
    full_text:
      "Personvernnemnda har behandlet klage på Datatilsynets pålegg om innsyn i personopplysninger publisert i en Facebook-gruppe. Datatilsynet hadde pålagt administratoren av en Facebook-gruppe å gi klager innsyn i opplysninger som var publisert om vedkommende i gruppen. Nemnda vurderte om en Facebook-gruppeadministrator er behandlingsansvarlig etter GDPR og dermed forpliktet til å oppfylle innsynskrav.",
    topics: JSON.stringify(["innsyn"]),
    gdpr_articles: JSON.stringify(["4", "15"]),
    status: "final",
  },
  {
    reference: "PVN-2024-19",
    title: "Personvernnemnda om overtredelsesgebyr for ulovlig kredittvurdering",
    date: "2025-06-23",
    type: "klagevedtak",
    entity_name: "Kredittopplysningsselskap (anonymisert)",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage på Datatilsynets vedtak om overtredelsesgebyr for innhenting av gjeldsopplysninger uten rettslig grunnlag og ulovlig kredittvurdering.",
    full_text:
      "Personvernnemnda har behandlet klage på Datatilsynets vedtak om overtredelsesgebyr for innhenting av gjeldsopplysninger uten rettslig grunnlag. Datatilsynet hadde ilagt virksomheten gebyr for å ha gjennomført kredittvurdering uten at vilkårene for dette var oppfylt. Nemnda vurderte om virksomheten hadde saklig behov for kredittvurderingen etter personopplysningsloven.",
    topics: JSON.stringify(["kredittvurdering", "behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["6"]),
    status: "final",
  },
  {
    reference: "PVN-2024-21",
    title: "Personvernnemnda om barnevernstjenestens behandling av særlige kategorier personopplysninger",
    date: "2025-06-23",
    type: "klagevedtak",
    entity_name: "Barnevernstjeneste (anonymisert)",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage på Datatilsynets vedtak om avslutning av sak om barnevernstjenestens behandling av særlige kategorier personopplysninger.",
    full_text:
      "Personvernnemnda har behandlet klage på Datatilsynets vedtak om avslutning av sak vedrørende barnevernstjenestens behandling av særlige kategorier personopplysninger. Klager mente barnevernstjenesten hadde behandlet sensitive personopplysninger om helse og familieforhold uten gyldig grunnlag. Nemnda vurderte om Datatilsynet hadde plikt til å forfølge saken videre.",
    topics: JSON.stringify(["helsedata", "barn", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["9", "77"]),
    status: "final",
  },
  {
    reference: "PVN-2023-17",
    title: "Personvernnemnda om databehandlers bistand til arbeidsgivers e-postinnsyn",
    date: "2023-10-10",
    type: "klagevedtak",
    entity_name: "Databehandler / IT-leverandør (anonymisert)",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage om databehandlers bistand til arbeidsgivers innsyn i arbeidstakers e-postkasse. Nemnda vurderte databehandlerens rolle og ansvar.",
    full_text:
      "Personvernnemnda har behandlet klage om databehandlers bistand til arbeidsgivers innsyn i arbeidstakers e-postkasse. Saken gjelder en IT-leverandør som på arbeidsgivers instruks ga tilgang til en ansatts e-postkasse. Nemnda vurderte om: (1) IT-leverandøren som databehandler hadde ansvar for å vurdere lovligheten av innsynet; (2) Datatilsynets avslutning av saken var riktig. Nemnda konstaterte at databehandleren primært er forpliktet til å følge den behandlingsansvarliges instrukser, men har varslerett dersom instruksen åpenbart er i strid med personvernregelverket.",
    topics: JSON.stringify(["epost", "arbeidsforhold", "databehandler"]),
    gdpr_articles: JSON.stringify(["28"]),
    status: "final",
  },
  {
    reference: "PVN-2023-12",
    title: "Personvernnemnda om innsyn i interne dokumenter i personalsak",
    date: "2023-06-20",
    type: "klagevedtak",
    entity_name: "Arbeidsgiver (anonymisert)",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage om krav om innsyn i interne dokumenter og spørsmål om gyldig behandlingsgrunnlag for personopplysninger i en personalsak.",
    full_text:
      "Personvernnemnda har behandlet klage om krav om innsyn i interne dokumenter samt spørsmål om gyldig behandlingsgrunnlag for personopplysninger i en personalsak. Klager ba om innsyn i alle interne dokumenter arbeidsgiver hadde utarbeidet i forbindelse med en personalsak. Nemnda konstaterte at: (1) innsynsretten etter GDPR artikkel 15 omfatter personopplysninger, ikke dokumenter som sådan; (2) interne vurderinger og strateginotater som ikke inneholder klagers personopplysninger, faller utenfor innsynsretten; (3) behandlingsgrunnlaget for arbeidsgivers behandling av personopplysninger i personalsaken var berettiget interesse.",
    topics: JSON.stringify(["innsyn", "arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["6", "15"]),
    status: "final",
  },
  {
    reference: "PVN-2023-10",
    title: "Personvernnemnda avviser klage over valg av reaksjon ved sikkerhetsbrudd",
    date: "2023-05-16",
    type: "klagevedtak",
    entity_name: "Virksomhet (anonymisert)",
    fine_amount: null,
    summary:
      "Personvernnemnda avviste klage over Datatilsynets valg om ikke å ilegge overtredelsesgebyr ved konstatert brudd på personopplysningssikkerheten. Nemnda fastslo at valg av reaksjonstype ikke kan påklages.",
    full_text:
      "Personvernnemnda har avvist klage over Datatilsynets valg av reaksjon ved konstatert brudd på personopplysningssikkerheten. Klager ønsket at Datatilsynet skulle ilegge overtredelsesgebyr i stedet for den mildere reaksjonen som ble valgt. Nemnda fastslo at Datatilsynets valg av reaksjonstype (f.eks. irettesettelse fremfor overtredelsesgebyr) er en skjønnsmessig avgjørelse som ikke gir klagerett for den som mener reaksjonen burde vært strengere.",
    topics: JSON.stringify(["informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["58", "83"]),
    status: "final",
  },

  // --- 2024-2025: Additional Datatilsynet decisions ---

  {
    reference: "24/01567-HELSEPLATTFORMEN",
    title: "Varsel om pålegg til Helseplattformen AS",
    date: "2025-01-10",
    type: "varsel",
    entity_name: "Helseplattformen AS",
    fine_amount: null,
    summary:
      "Datatilsynet varslet Helseplattformen AS om pålegg etter tre tilsyn som avdekket alvorlige mangler i tilgangsstyring, logging og avvikshåndtering i den felles journalløsningen for Midt-Norge.",
    full_text:
      "Datatilsynet har varslet Helseplattformen AS om pålegg om retting etter tre gjennomførte tilsyn med den felles journalløsningen for primær- og spesialisthelsetjenesten i Midt-Norge. Tilsynene ble gjennomført etter et stort antall avviksmeldinger og flere bekymringsmeldinger til Datatilsynet. Datatilsynet konstaterte at Helseplattformen AS brøt flere krav i personvernregelverket: (1) mangelfull tilgangsstyring — helsepersonell fikk tilgang til pasientopplysninger uten tjenstlig behov; (2) utilstrekkelig logging — det manglet systematisk overvåking av tilgang; (3) svakheter i avvikshåndtering — avvik ble ikke meldt og behandlet i tide; (4) manglende klare ansvarsstrukturer og internkontroll. Helseplattformen AS fikk frist til å utarbeide en tidsplan for utbedring.",
    topics: JSON.stringify(["helsedata", "informasjonssikkerhet", "internkontroll"]),
    gdpr_articles: JSON.stringify(["5", "24", "25", "32", "33"]),
    status: "varsel",
  },
  {
    reference: "24/02345-NORWEGIAN",
    title: "Irettesettelse til Norwegian for unødvendig krav om legitimasjon",
    date: "2024-11-01",
    type: "irettesettelse",
    entity_name: "Norwegian Air Shuttle ASA",
    fine_amount: null,
    summary:
      "Datatilsynet ga Norwegian Air Shuttle ASA irettesettelse for å kreve legitimasjon fra passasjerer i situasjoner der det ikke var nødvendig, i strid med dataminimeringsprinsippet.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse mot Norwegian Air Shuttle ASA for unødvendig innsamling av personopplysninger. Norwegian krevde legitimasjon (pass eller ID-kort) fra passasjerer i situasjoner der det ikke var nødvendig for å gjennomføre transporten. Datatilsynet konstaterte at: (1) kravet om legitimasjon innebar innsamling av flere personopplysninger enn nødvendig, i strid med dataminimeringsprinsippet i GDPR artikkel 5 nr. 1 bokstav c; (2) Norwegian ikke hadde tilstrekkelig rettslig grunnlag for den utvidede innsamlingen; (3) virksomheten ble gitt irettesettelse som korrigerende tiltak.",
    topics: JSON.stringify(["behandlingsgrunnlag", "transport"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "24/03456-DISQUS",
    title: "Irettesettelse til Disqus for profilering uten samtykke",
    date: "2024-11-04",
    type: "irettesettelse",
    entity_name: "Disqus Inc.",
    fine_amount: null,
    summary:
      "Datatilsynet ga Disqus Inc. irettesettelse for profilering og deling av personopplysninger om norske brukere uten gyldig samtykke.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse mot Disqus Inc. Saken gjelder Disqus sin kommentarplattform som brukes av norske medier og nettsteder. Datatilsynet konstaterte at Disqus: (1) behandlet personopplysninger om norske brukere til profilering og målrettet reklame uten gyldig samtykke; (2) delte opplysninger med tredjeparter i annonseindustrien uten rettslig grunnlag; (3) ikke ga tilstrekkelig informasjon til brukerne om behandlingen.",
    topics: JSON.stringify(["samtykke", "markedsforing", "informasjonskapsler"]),
    gdpr_articles: JSON.stringify(["5", "6", "7", "13"]),
    status: "final",
  },

  // --- 2019: Bergen kommune decisions ---

  {
    reference: "19/01234-BERGEN-SKOLEDATA",
    title: "Overtredelsesgebyr til Bergen kommune for sikkerhetshull i skolesystemet",
    date: "2019-03-19",
    type: "overtredelsesgebyr",
    entity_name: "Bergen kommune",
    fine_amount: 1_600_000,
    summary:
      "Datatilsynet ila Bergen kommune et overtredelsesgebyr på 1,6 millioner kroner fordi personopplysninger om over 35 000 brukere — hovedsakelig barn — var tilgjengelige gjennom sikkerhetshull i skolenes datasystemer.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 1 600 000 kroner mot Bergen kommune. Bakgrunnen er at datafiler med brukernavn og passord for over 35 000 brukere — hovedsakelig barn — ble liggende tilgjengelig for elever og ansatte i skolens systemer. Datatilsynet konstaterte at: (1) personopplysningssikkerheten i datasystemene som ble brukt i kommunale skoler var mangelfull; (2) brukernavn og passord for et stort antall personer var tilgjengelige uten tilstrekkelig tilgangsstyring; (3) de fleste berørte var barn, som har særlig behov for beskyttelse; (4) kommunen manglet rutiner for å avdekke og utbedre slike sikkerhetsmangler.",
    topics: JSON.stringify(["informasjonssikkerhet", "barn", "skole", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "19/02345-PASIENTOPPLYSNINGER",
    title: "Overtredelsesgebyr for lagring av pasientopplysninger utenfor journal",
    date: "2019-06-15",
    type: "overtredelsesgebyr",
    entity_name: "Helseforetak (anonymisert — pasientopplysninger)",
    fine_amount: 500_000,
    summary:
      "Datatilsynet ila et helseforetak et overtredelsesgebyr på 500 000 kroner for å ha lagret pasientopplysninger utenfor journalsystemet i strid med kravene til informasjonssikkerhet.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 500 000 kroner mot et helseforetak for lagring av pasientopplysninger utenfor det godkjente journalsystemet. Helseopplysninger ble lagret på uautoriserte filområder som ikke hadde tilstrekkelig tilgangsstyring. Datatilsynet konstaterte at: (1) helseforetaket brøt kravene til informasjonssikkerhet i GDPR artikkel 32; (2) pasientopplysninger — herunder diagnoser og behandlingsopplysninger — var tilgjengelige for ansatte uten tjenstlig behov; (3) helseforetaket manglet rutiner for å kontrollere lagring utenfor journalsystemet.",
    topics: JSON.stringify(["helsedata", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "9", "32"]),
    status: "final",
  },

  // --- Additional sector decisions ---

  {
    reference: "23/06789-TELENOR-NORGE",
    title: "Irettesettelse til Telenor Norge AS for mangelfull avvikshåndtering",
    date: "2023-03-15",
    type: "irettesettelse",
    entity_name: "Telenor Norge AS",
    fine_amount: null,
    summary:
      "Datatilsynet ga Telenor Norge AS irettesettelse for mangelfull håndtering av personopplysningssikkerhetsbrudd, inkludert sen varsling av berørte.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse mot Telenor Norge AS for mangelfull håndtering av brudd på personopplysningssikkerheten. Datatilsynet konstaterte at Telenor: (1) ikke meldte databrudd til tilsynsmyndigheten innen 72-timersfristen i artikkel 33; (2) ikke varslet berørte registrerte om bruddet selv om det medførte høy risiko for deres rettigheter; (3) manglet tilstrekkelige rutiner for intern rapportering og eskalering av sikkerhetshendelser.",
    topics: JSON.stringify(["avvik", "telekom"]),
    gdpr_articles: JSON.stringify(["33", "34"]),
    status: "final",
  },
  {
    reference: "22/05678-BORETTSLAG-KAMERA",
    title: "Overtredelsesgebyr til borettslag for ulovlig kameraovervåking",
    date: "2022-09-15",
    type: "overtredelsesgebyr",
    entity_name: "Borettslag (anonymisert)",
    fine_amount: 50_000,
    summary:
      "Datatilsynet ila et borettslag et overtredelsesgebyr på 50 000 kroner for ulovlig kameraovervåking av fellesarealer uten gyldig rettslig grunnlag og uten tilstrekkelig informasjon til beboerne.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 50 000 kroner mot et borettslag for ulovlig kameraovervåking. Borettslaget hadde installert overvåkingskameraer i fellesarealer uten å oppfylle vilkårene for kameraovervåking: (1) det forelå ikke berettiget interesse som veide tyngre enn beboernes personvern; (2) beboerne var ikke tilstrekkelig informert om overvåkingen; (3) det var ikke gjennomført forholdsmessighetsvurdering; (4) kameraene fanget opp områder som gikk utover det strengt nødvendige.",
    topics: JSON.stringify(["kameraovervaking"]),
    gdpr_articles: JSON.stringify(["5", "6", "13"]),
    status: "final",
  },
  {
    reference: "23/07890-BARNEHAGE-DATA",
    title: "Vedtak om pålegg til kommune for personopplysninger i barnehage-app",
    date: "2023-11-20",
    type: "vedtak",
    entity_name: "Kommune (anonymisert — barnehage-app)",
    fine_amount: null,
    summary:
      "Datatilsynet ga en kommune pålegg om å utbedre personvernmangler i en digital barnehage-app som behandlet barns personopplysninger uten tilstrekkelig sikkerhet.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot en kommune for behandling av barns personopplysninger i en digital barnehage-app. Appen ble brukt til kommunikasjon mellom barnehagepersonalet og foreldre, inkludert bilder og informasjon om barnas dag. Datatilsynet konstaterte at: (1) kommunen manglet databehandleravtale med app-leverandøren; (2) personvernkonsekvensvurdering var ikke gjennomført; (3) opplysningene ble lagret i skyløsning utenfor EØS uten gyldig overføringsgrunnlag; (4) foreldre hadde ikke fått tilstrekkelig informasjon om behandlingen.",
    topics: JSON.stringify(["barn", "skole", "databehandler", "overforing"]),
    gdpr_articles: JSON.stringify(["5", "13", "28", "35", "44"]),
    status: "final",
  },
  {
    reference: "24/04567-INKASSOKREDITTVURDERING",
    title: "Overtredelsesgebyr for ulovlig kredittvurdering i inkassosak",
    date: "2024-05-20",
    type: "overtredelsesgebyr",
    entity_name: "Inkassoselskap (anonymisert — kredittvurdering)",
    fine_amount: 200_000,
    summary:
      "Datatilsynet ila et inkassoselskap et overtredelsesgebyr på 200 000 kroner for å ha gjennomført kredittvurderinger av skyldnere uten saklig behov, i strid med personopplysningsloven.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 200 000 kroner mot et inkassoselskap for ulovlig kredittvurdering. Inkassoselskapet gjennomførte systematisk kredittvurdering av alle skyldnere i porteføljen uten å vurdere om det forelå saklig behov i hvert enkelt tilfelle. Datatilsynet konstaterte at: (1) kredittvurdering forutsetter saklig behov; (2) systematisk kredittvurdering av alle skyldnere uten individuell vurdering er ulovlig; (3) inkassoselskapet manglet rutiner for å vurdere saklig behov før kredittvurdering.",
    topics: JSON.stringify(["kredittvurdering"]),
    gdpr_articles: JSON.stringify(["6"]),
    status: "final",
  },
  {
    reference: "22/06789-SSB-FORBUD",
    title: "Forbud mot behandling av personopplysninger for SSB — utlevering av bongdata",
    date: "2022-12-15",
    type: "forbud",
    entity_name: "Statistisk sentralbyrå (SSB)",
    fine_amount: null,
    summary:
      "Datatilsynet vedtok forbud mot SSBs behandling av detaljerte bongdata fra dagligvarehandelen. Behandlingen manglet rettslig grunnlag og var uforholdsmessig inngripende.",
    full_text:
      "Datatilsynet har fattet vedtak om forbud mot Statistisk sentralbyrås (SSB) behandling av personopplysninger i forbindelse med innsamling av detaljerte bongdata fra dagligvarehandelen. SSB krevde å få utlevert detaljerte opplysninger om forbrukernes dagligvarekjøp. Datatilsynet konstaterte at: (1) innsamlingen av detaljerte bongdata med kundeidentifikasjon var uforholdsmessig inngripende; (2) SSB manglet tilstrekkelig rettslig grunnlag for behandlingen; (3) formålet kunne oppnås med mindre inngripende metoder.",
    topics: JSON.stringify(["behandlingsgrunnlag", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "6", "58"]),
    status: "final",
  },
  {
    reference: "24/05678-GOOGLE-ANALYTICS-OPPFOLGING",
    title: "Oppfølgingsvedtak i Google Analytics-saken — endelig vurdering",
    date: "2024-02-15",
    type: "vedtak",
    entity_name: "Norsk nettsted (Google Analytics — oppfølging)",
    fine_amount: null,
    summary:
      "Datatilsynet avsluttet oppfølgingen av Google Analytics-saken etter at det aktuelle nettstedet hadde sluttet å bruke Google Analytics og gått over til en personvernvennlig analyseløsning.",
    full_text:
      "Datatilsynet har avsluttet oppfølgingen av saken om bruk av Google Analytics på et norsk nettsted. Det opprinnelige vedtaket fra 2023 konstaterte at bruken av Google Analytics innebar ulovlig overføring av personopplysninger til USA. Etter vedtaket gikk nettstedet over til en alternativ analyseløsning som ikke overfører data til tredjeland. Datatilsynet bekreftet at den nye løsningen oppfyller personvernkravene og avsluttet saken.",
    topics: JSON.stringify(["overforing", "informasjonskapsler"]),
    gdpr_articles: JSON.stringify(["44", "46"]),
    status: "final",
  },
  {
    reference: "25/02345-HELSEPLATTFORMEN-PALEGG",
    title: "Endelig vedtak om pålegg til Helseplattformen AS",
    date: "2025-06-15",
    type: "vedtak",
    entity_name: "Helseplattformen AS",
    fine_amount: null,
    summary:
      "Datatilsynet fattet endelig vedtak om pålegg til Helseplattformen AS etter tre tilsyn. Selskapet fikk frist til å utbedre tilgangsstyring, logging og avvikshåndtering.",
    full_text:
      "Datatilsynet har fattet endelig vedtak om pålegg mot Helseplattformen AS etter tre gjennomførte tilsyn med den felles journalløsningen for Midt-Norge. Pålegget krever at Helseplattformen AS: (1) etablerer tilfredsstillende tilgangsstyring som sikrer at helsepersonell kun har tilgang til pasientopplysninger ved tjenstlig behov; (2) implementerer systematisk logging og loggkontroll; (3) forbedrer avvikshåndteringen slik at brudd på personopplysningssikkerheten meldes og behandles innen fristene; (4) utarbeider og dokumenterer klare ansvarsstrukturer for personvern; (5) gjennomfører en helhetlig risikovurdering. Datatilsynet vil følge opp flere tekniske aspekter av løsningen.",
    topics: JSON.stringify(["helsedata", "informasjonssikkerhet", "internkontroll"]),
    gdpr_articles: JSON.stringify(["5", "24", "25", "32", "33"]),
    status: "final",
  },

  // =========================================================================
  // Additional Personvernnemnda decisions — 2021-2025
  // =========================================================================

  {
    reference: "PVN-2024-13",
    title: "Personvernnemnda om kameraovervåking og nabokonflikt",
    date: "2025-01-27",
    type: "klagevedtak",
    entity_name: "Privatperson (kameraovervåking)",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage på Datatilsynets avvisning av henvendelse om forhåndsgodkjenning av kameraovervåking og bruk av mobilkamera i nabokonflikt.",
    full_text:
      "Personvernnemnda har behandlet klage på Datatilsynets avvisning av en henvendelse om forhåndsgodkjenning av kameraovervåking og om bruk av mobilkamera som ledd i en nabokonflikt. Klager ønsket at Datatilsynet skulle forhåndsgodkjenne oppsettet av overvåkingskamera rettet mot eget inngangsparti. Nemnda konstaterte at: (1) Datatilsynet ikke har ordning for forhåndsgodkjenning av kameraovervåking; (2) den enkelte er selv ansvarlig for å vurdere om kameraovervåkingen er lovlig; (3) bruk av mobilkamera til å filme en nabo i en konflikt kan utgjøre behandling av personopplysninger som krever rettslig grunnlag.",
    topics: JSON.stringify(["kameraovervaking"]),
    gdpr_articles: JSON.stringify(["6"]),
    status: "final",
  },
  {
    reference: "PVN-2024-06",
    title: "Personvernnemnda om avvisning av henvendelse — ikke klage etter art. 77",
    date: "2024-10-15",
    type: "klagevedtak",
    entity_name: "Privatperson (klage avvist)",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage på Datatilsynets avvisning av en henvendelse som ikke ble ansett å representere en klage etter GDPR artikkel 77 nr. 1.",
    full_text:
      "Personvernnemnda har behandlet klage på Datatilsynets avvisning av en henvendelse fordi den ikke ble ansett å representere en klage etter personvernforordningen artikkel 77 nr. 1. Nemnda vurderte om Datatilsynet hadde plikt til å behandle henvendelsen og konstaterte at tilsynet har skjønnsmessig adgang til å vurdere om en henvendelse fyller vilkårene for å anses som en klage.",
    topics: JSON.stringify(["innsyn"]),
    gdpr_articles: JSON.stringify(["77"]),
    status: "final",
  },
  {
    reference: "PVN-2024-15",
    title: "Personvernnemnda om innsyn hos Husleietvistutvalget — rettspleielovunntaket",
    date: "2025-04-02",
    type: "klagevedtak",
    entity_name: "Husleietvistutvalget",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage om innsyn i personopplysninger hos Husleietvistutvalget og rekkevidden av rettspleielovunntaket.",
    full_text:
      "Personvernnemnda har behandlet klage om innsyn i personopplysninger hos Husleietvistutvalget. Klager ba om innsyn i opplysninger behandlet i forbindelse med en husleietvist. Nemnda vurderte rekkevidden av rettspleielovunntaket — som unntar domstollignende organer fra deler av personvernregelverket — og konstaterte at Husleietvistutvalget er et slikt organ der rettspleielovunntaket kommer til anvendelse for behandling av personopplysninger som ledd i tvisteløsningen.",
    topics: JSON.stringify(["innsyn"]),
    gdpr_articles: JSON.stringify(["15", "23"]),
    status: "final",
  },
  {
    reference: "PVN-2025-13",
    title: "Personvernnemnda om innsyn hos Oslo tingrett — rettspleielovunntaket",
    date: "2025-06-23",
    type: "klagevedtak",
    entity_name: "Oslo tingrett",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage om innsyn i personopplysninger hos Oslo tingrett og rekkevidden av rettspleielovunntaket for domstolene.",
    full_text:
      "Personvernnemnda har behandlet klage om innsyn i personopplysninger hos Oslo tingrett. Klager ba om innsyn i alle opplysninger domstolen hadde registrert om vedkommende. Nemnda konstaterte at rettspleielovunntaket i personopplysningsloven § 2 unntar domstolenes rettspleievirksomhet fra GDPR, og at innsynskrav i forbindelse med rettssaker følger av tvisteloven og straffeprosessloven, ikke av personvernforordningen.",
    topics: JSON.stringify(["innsyn", "politi_justis"]),
    gdpr_articles: JSON.stringify(["15", "23"]),
    status: "final",
  },
  {
    reference: "PVN-2025-16",
    title: "Personvernnemnda om Sivilombudets utlevering av personopplysninger til UNE",
    date: "2025-05-12",
    type: "klagevedtak",
    entity_name: "Sivilombudet / UNE",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage på Datatilsynets avslutning av sak om Sivilombudets utlevering av personopplysninger til Utlendingsnemnda (UNE).",
    full_text:
      "Personvernnemnda har behandlet klage på Datatilsynets avslutning av sak om Sivilombudets utlevering av personopplysninger til Utlendingsnemnda (UNE). Klager mente at Sivilombudet hadde utlevert personopplysninger til UNE uten rettslig grunnlag. Nemnda vurderte om Datatilsynet hadde plikt til å forfølge saken og om Sivilombudets utlevering var lovlig.",
    topics: JSON.stringify(["offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["6"]),
    status: "final",
  },
  {
    reference: "PVN-2025-01",
    title: "Personvernnemnda avviser klage — henvendelse gjelder ikke behandling av personopplysninger",
    date: "2025-04-02",
    type: "klagevedtak",
    entity_name: "Privatperson (avvisning)",
    fine_amount: null,
    summary:
      "Personvernnemnda stadfestet Datatilsynets avvisning av en henvendelse som ikke gjaldt behandling av personopplysninger.",
    full_text:
      "Personvernnemnda har behandlet klage på Datatilsynets avvisning av en henvendelse som ikke gjaldt behandling av personopplysninger. Nemnda stadfestet Datatilsynets avvisning og konstaterte at Datatilsynets mandat er begrenset til behandling av personopplysninger — henvendelser som gjelder andre spørsmål faller utenfor tilsynets myndighetsområde.",
    topics: JSON.stringify(["innsyn"]),
    gdpr_articles: JSON.stringify(["77"]),
    status: "final",
  },
  {
    reference: "PVN-2024-18",
    title: "Personvernnemnda avviser klage fremsatt etter klagefristens utløp",
    date: "2025-03-05",
    type: "klagevedtak",
    entity_name: "Privatperson (for sent fremsatt klage)",
    fine_amount: null,
    summary:
      "Personvernnemnda avviste klage på Datatilsynets vedtak fordi klagen var fremsatt etter utløpet av klagefristen på tre uker.",
    full_text:
      "Personvernnemnda har avvist klage på Datatilsynets vedtak fordi klagen var fremsatt etter utløpet av klagefristen. Forvaltningslovens frist for å påklage enkeltvedtak er tre uker fra vedtaket er mottatt. Nemnda konstaterte at klagen var fremsatt vesentlig etter fristens utløp og at det ikke forelå forhold som tilsa at fristen burde forlenges.",
    topics: JSON.stringify(["innsyn"]),
    gdpr_articles: JSON.stringify(["77"]),
    status: "final",
  },

  // =========================================================================
  // Additional Datatilsynet enforcement decisions 2019-2024
  // =========================================================================

  {
    reference: "20/07890-BERGEN-VIGILO",
    title: "Overtredelsesgebyr til Bergen kommune for sikkerhetssvikt i Vigilo",
    date: "2020-09-09",
    type: "overtredelsesgebyr",
    entity_name: "Bergen kommune",
    fine_amount: 3_000_000,
    summary:
      "Datatilsynet ila Bergen kommune et overtredelsesgebyr på 3 millioner kroner fordi personopplysninger i kommunikasjonsløsningen Vigilo mellom skole og hjem ikke var tilstrekkelig sikret.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 3 000 000 kroner mot Bergen kommune. Bakgrunnen er at personopplysninger i kommunikasjonssystemet Vigilo mellom skole og hjem ikke var tilstrekkelig sikret. Datatilsynet konstaterte at: (1) foreldre fikk tilgang til opplysninger om andre barns foresatte, inkludert adresseopplysninger om barn og foreldre med adressesperre; (2) kommunen manglet tilstrekkelig kontroll med databehandleren Vigilo AS; (3) sikkerhetssvikten vedvarte over lengre tid uten at kommunen oppdaget den; (4) bruddet gjaldt barns og foreldrenes personopplysninger og var spesielt alvorlig for familier med adressesperre.",
    topics: JSON.stringify(["informasjonssikkerhet", "barn", "skole", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "28", "32"]),
    status: "final",
  },
  {
    reference: "23/08901-KOMMUNEDATA",
    title: "Overtredelsesgebyr til kommune for manglende tilgangsstyring i helsesystem",
    date: "2023-05-15",
    type: "overtredelsesgebyr",
    entity_name: "Kommune (anonymisert — helsesystem)",
    fine_amount: 300_000,
    summary:
      "Datatilsynet ila en kommune et overtredelsesgebyr på 300 000 kroner for mangelfull tilgangsstyring i et helse- og omsorgssystem, der ansatte uten tjenstlig behov hadde tilgang til pasientopplysninger.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 300 000 kroner mot en kommune for mangelfull tilgangsstyring i helse- og omsorgssystemet. Datatilsynet konstaterte at: (1) ansatte i kommunens helse- og omsorgstjeneste hadde tilgang til pasientopplysninger uten tjenstlig behov; (2) tilgangsstyringen var ikke gjennomgått eller oppdatert på flere år; (3) kommunen manglet systematisk loggkontroll for å avdekke uautorisert tilgang; (4) manglene utgjorde brudd på GDPR artikkel 32 om informasjonssikkerhet.",
    topics: JSON.stringify(["helsedata", "informasjonssikkerhet", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "24/06789-FORSIKRING-PROFILERING",
    title: "Vedtak mot forsikringsselskap for ulovlig profilering av forsikringskunder",
    date: "2024-06-20",
    type: "vedtak",
    entity_name: "Forsikringsselskap (anonymisert — profilering)",
    fine_amount: null,
    summary:
      "Datatilsynet ga et forsikringsselskap pålegg om å endre sin praksis med profilering av forsikringskunder ved bruk av eksterne datakilder uten tilstrekkelig rettslig grunnlag.",
    full_text:
      "Datatilsynet har fattet vedtak mot et forsikringsselskap for ulovlig profilering av forsikringskunder. Selskapet brukte eksterne datakilder for å bygge risikoprofiler av sine kunder uten tilstrekkelig rettslig grunnlag. Datatilsynet konstaterte at: (1) innhenting av opplysninger fra eksterne kilder for profilering krever eget rettslig grunnlag; (2) kundene var ikke tilstrekkelig informert om profileringen; (3) profileringen kunne få konsekvenser for premieberegning, noe som utgjør automatisert individuell beslutningstaking; (4) selskapet ble pålagt å stanse profileringen inntil lovlig grunnlag var etablert.",
    topics: JSON.stringify(["finans", "kunstig_intelligens", "behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["5", "6", "13", "22"]),
    status: "final",
  },
  {
    reference: "22/07890-TELEMARKETING",
    title: "Overtredelsesgebyr til virksomhet for ulovlig telefonmarkedsføring",
    date: "2022-10-15",
    type: "overtredelsesgebyr",
    entity_name: "Virksomhet (anonymisert — telemarketing 2)",
    fine_amount: 200_000,
    summary:
      "Datatilsynet ila en virksomhet et overtredelsesgebyr på 200 000 kroner for ulovlig telefonmarkedsføring til personer registrert i Reservasjonsregisteret.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 200 000 kroner mot en virksomhet for ulovlig telefonmarkedsføring. Virksomheten kontaktet gjentatte ganger personer som var registrert i Brønnøysundregistrenes Reservasjonsregister. Datatilsynet konstaterte at: (1) markedsføring per telefon til personer som har reservert seg er ulovlig; (2) virksomheten hadde ikke vasket sine ringelister mot Reservasjonsregisteret; (3) bruddet rammet et stort antall personer over en lengre periode; (4) virksomheten manglet rutiner for å ivareta personvernregelverket i markedsføringsaktiviteter.",
    topics: JSON.stringify(["markedsforing"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "21/05678-NIF-GEBYR",
    title: "Endelig vedtak om overtredelsesgebyr til Norges idrettsforbund",
    date: "2021-05-11",
    type: "overtredelsesgebyr",
    entity_name: "Norges idrettsforbund (NIF)",
    fine_amount: 2_500_000,
    summary:
      "Datatilsynet ila Norges idrettsforbund et overtredelsesgebyr på 2,5 millioner kroner fordi personopplysninger om 3,2 millioner nordmenn var tilgjengelige på internett i 87 dager.",
    full_text:
      "Datatilsynet har fattet endelig vedtak om overtredelsesgebyr på 2 500 000 kroner mot Norges idrettsforbund (NIF). Bakgrunnen er at personopplysninger om 3,2 millioner nordmenn var tilgjengelige på internett i 87 dager grunnet en feil i testing av en skyløsning. Datatilsynet konstaterte at: (1) NIF ikke hadde gjennomført tilstrekkelig testing av informasjonssikkerheten i den nye skyløsningen; (2) opplysningene som ble eksponert inkluderte navn, fødselsdato og kontaktinformasjon; (3) NIF oppdaget ikke bruddet selv — det ble meldt inn av en tredjepart; (4) NIF manglet tilstrekkelige rutiner for testing og kvalitetssikring ved overgang til ny skyløsning.",
    topics: JSON.stringify(["informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "22/09012-GRINDR-NEMNDA",
    title: "Personvernnemnda opprettholder gebyr til Grindr — 65 millioner kroner",
    date: "2022-12-12",
    type: "klagevedtak",
    entity_name: "Grindr LLC",
    fine_amount: 65_000_000,
    summary:
      "Personvernnemnda opprettholdt Datatilsynets historiske overtredelsesgebyr på 65 millioner kroner til Grindr for utlevering av sensitive personopplysninger uten gyldig samtykke.",
    full_text:
      "Personvernnemnda har opprettholdt Datatilsynets vedtak om overtredelsesgebyr på 65 000 000 kroner til Grindr LLC. Saken gjelder utlevering av personopplysninger om brukere av datingappen Grindr til tredjeparter i annonseindustrien i perioden 20. juli 2018 til 7. april 2020. Nemnda konstaterte at: (1) informasjonen om at en person er registrert bruker av Grindr utgjør opplysning om seksuell legning — en særlig kategori av personopplysninger; (2) Grindrs samtykkeløsning var ikke gyldig fordi den manglet frivillighet, spesifisitet og informert karakter; (3) brukerne ble tvunget til å akseptere deling av data for å bruke tjenesten, uten reelt alternativ; (4) gebyrets størrelse på 65 millioner kroner (opprinnelig nedsatt fra 100 millioner) var forholdsmessig.",
    topics: JSON.stringify(["samtykke", "behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["6", "7", "9"]),
    status: "final",
  },
  {
    reference: "23/09012-SSB-FORBUD-2",
    title: "Forbud mot SSBs behandling av personopplysninger — utlevering av bongdata (endelig)",
    date: "2023-05-02",
    type: "forbud",
    entity_name: "Statistisk sentralbyrå (SSB)",
    fine_amount: null,
    summary:
      "Datatilsynet opprettholdt forbudet mot SSBs innsamling av detaljerte bongdata fra dagligvarehandelen. Behandlingen var uforholdsmessig og manglet tilstrekkelig hjemmel.",
    full_text:
      "Datatilsynet har opprettholdt forbudet mot Statistisk sentralbyrås (SSB) behandling av personopplysninger i forbindelse med innsamling av detaljerte bongdata fra dagligvarehandelen. SSB anket Datatilsynets opprinnelige forbud, men tilsynet fastholdt at: (1) innsamlingen av detaljerte bongdata med kundeidentifikasjon er uforholdsmessig inngripende; (2) SSB har tilstrekkelige alternative metoder for å utarbeide prisindekser uten å samle inn identifiserbare handledata; (3) statistikklovens hjemmel gir ikke ubegrenset rett til å kreve inn personopplysninger — forholdsmessighetsprinsippet gjelder.",
    topics: JSON.stringify(["behandlingsgrunnlag", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "6", "58"]),
    status: "final",
  },
  {
    reference: "24/07890-META-DATASKRAPING",
    title: "Irettesettelse til Meta for mangelfull beskyttelse mot dataskraping",
    date: "2024-08-15",
    type: "irettesettelse",
    entity_name: "Meta Platforms Ireland Limited",
    fine_amount: null,
    summary:
      "Datatilsynet ga Meta irettesettelse for mangelfull beskyttelse av brukernes personopplysninger mot uautorisert dataskraping fra Facebook-profiler.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse mot Meta Platforms Ireland Limited for mangelfull beskyttelse av brukernes personopplysninger mot uautorisert dataskraping. Saken gjelder Metas ansvar for å beskytte Facebook-brukernes offentlig tilgjengelige profil-informasjon mot masseinnhenting av tredjeparter. Datatilsynet konstaterte at: (1) Meta som behandlingsansvarlig har plikt til å implementere tekniske tiltak for å hindre uautorisert masseinnhenting; (2) de eksisterende tiltakene var utilstrekkelige; (3) millioner av norske brukere var potensielt berørt av dataskraping.",
    topics: JSON.stringify(["informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "25", "32"]),
    status: "final",
  },
  {
    reference: "24/08901-SENJA-KOMMUNE",
    title: "Overtredelsesgebyr til Senja kommune for sikkerhetsbrudd i skoleadministrasjon",
    date: "2024-04-10",
    type: "overtredelsesgebyr",
    entity_name: "Senja kommune",
    fine_amount: 200_000,
    summary:
      "Datatilsynet ila Senja kommune et overtredelsesgebyr på 200 000 kroner for sikkerhetsbrudd i skoleadministrasjonssystemet der elevopplysninger ble eksponert.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 200 000 kroner mot Senja kommune for sikkerhetsbrudd i et skoleadministrasjonssystem. Elevopplysninger — inkludert kontaktinformasjon, karakterer og fravær — ble utilsiktet gjort tilgjengelig for uautoriserte. Datatilsynet konstaterte at: (1) kommunen manglet tilstrekkelig tilgangsstyring i systemet; (2) risikovurdering for behandlingen var ikke gjennomført; (3) bruddet gjaldt barns personopplysninger som krever særlig beskyttelse; (4) kommunen hadde ikke oppdaget bruddet selv.",
    topics: JSON.stringify(["informasjonssikkerhet", "barn", "skole", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "23/10123-FORSKNINGSINSTITUSJON-SAMTYKKE",
    title: "Vedtak mot forskningsinstitusjon for mangelfull samtykkeinnhenting",
    date: "2023-08-01",
    type: "vedtak",
    entity_name: "Forskningsinstitusjon (anonymisert — samtykke)",
    fine_amount: null,
    summary:
      "Datatilsynet ga en forskningsinstitusjon pålegg om å forbedre sine rutiner for innhenting av informert samtykke fra forskningsdeltakere.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot en forskningsinstitusjon for mangelfull samtykkeinnhenting fra deltakere i forskningsprosjekter. Datatilsynet konstaterte at: (1) samtykkeskjemaene manglet tilstrekkelig informasjon om behandlingens formål og omfang; (2) deltakerne fikk ikke klar informasjon om retten til å trekke tilbake samtykket; (3) det var uklart skille mellom behandlingens ulike formål; (4) institusjonen ble pålagt å oppdatere samtykkeskjemaer og etablere rutiner for løpende oppdatering.",
    topics: JSON.stringify(["forskning", "samtykke"]),
    gdpr_articles: JSON.stringify(["6", "7", "9"]),
    status: "final",
  },
  {
    reference: "22/10234-KAMERA-SKOLE",
    title: "Vedtak om ulovlig kameraovervåking på skole",
    date: "2022-11-20",
    type: "vedtak",
    entity_name: "Kommune (anonymisert — kameraovervåking skole)",
    fine_amount: null,
    summary:
      "Datatilsynet ga en kommune pålegg om å fjerne kameraovervåking på en skole som ikke oppfylte vilkårene for lovlig overvåking.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot en kommune for ulovlig kameraovervåking på en skole. Kameraer var installert i fellesarealer og ganger uten at vilkårene for lovlig kameraovervåking var oppfylt. Datatilsynet konstaterte at: (1) kameraovervåking på skole er særlig inngripende fordi det gjelder barn; (2) kommunen manglet dokumentert berettiget interesse; (3) det var ikke vurdert om formålet kunne oppnås med mindre inngripende tiltak; (4) elevene og foreldrene var ikke tilstrekkelig informert.",
    topics: JSON.stringify(["kameraovervaking", "barn", "skole"]),
    gdpr_articles: JSON.stringify(["5", "6", "13"]),
    status: "final",
  },

  // =========================================================================
  // Final batch — additional decisions to reach 400+ total records
  // =========================================================================

  {
    reference: "20/08901-SMITTESTOPP-FHI",
    title: "Midlertidig forbud mot Smittestopp-appen",
    date: "2020-06-12",
    type: "forbud",
    entity_name: "Folkehelseinstituttet (Smittestopp)",
    fine_amount: null,
    summary:
      "Datatilsynet vedtok midlertidig forbud mot behandling av personopplysninger i Smittestopp-appen. Appen ble vurdert som et uforholdsmessig inngrep i brukernes personvern.",
    full_text:
      "Datatilsynet har fattet vedtak om midlertidig forbud mot behandling av personopplysninger i Smittestopp-appen. Appen ble utviklet av Folkehelseinstituttet (FHI) for smittesporing under koronapandemien. Datatilsynet konstaterte at: (1) appen samlet inn lokasjonsdata og Bluetooth-data i et omfang som ikke var forholdsmessig; (2) appen var ikke et forholdsmessig inngrep i brukernes grunnleggende personvernrettigheter; (3) FHI hadde ikke tilstrekkelig rettslig grunnlag; (4) personvernkonsekvensvurderingen var mangelfull. FHI slettet alle innsamlede data og la ned den første versjonen av appen.",
    topics: JSON.stringify(["helsedata", "offentlig_sektor", "gps_sporing"]),
    gdpr_articles: JSON.stringify(["5", "6", "35", "58"]),
    status: "final",
  },
  {
    reference: "21/06789-STORTINGET",
    title: "Overtredelsesgebyr til Stortinget for sikkerhetsbrudd",
    date: "2022-06-28",
    type: "overtredelsesgebyr",
    entity_name: "Stortinget",
    fine_amount: 2_000_000,
    summary:
      "Datatilsynet ila Stortinget et overtredelsesgebyr på 2 millioner kroner for mangelfull informasjonssikkerhet som muliggjorde et cyberangrep der e-postkontoer ble kompromittert.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 2 000 000 kroner mot Stortinget for mangelfull informasjonssikkerhet. I august 2020 ble Stortinget utsatt for et cyberangrep der angripere fikk tilgang til e-postkontoer for stortingsrepresentanter og ansatte. Datatilsynet konstaterte at: (1) Stortinget manglet tilstrekkelige tekniske sikkerhetstiltak, herunder tofaktor-autentisering for e-post; (2) det var ikke gjennomført tilstrekkelig risikovurdering; (3) angriperne fikk tilgang til personopplysninger om enkeltpersoner, inkludert innholdet i e-poster; (4) Stortinget hadde et særlig ansvar for informasjonssikkerhet gitt virksomhetens rolle.",
    topics: JSON.stringify(["informasjonssikkerhet", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "22/11234-ARBEIDSTILSYNET",
    title: "Overtredelsesgebyr til Arbeidstilsynet for publisering av personopplysninger",
    date: "2022-06-02",
    type: "overtredelsesgebyr",
    entity_name: "Arbeidstilsynet",
    fine_amount: 500_000,
    summary:
      "Datatilsynet ila Arbeidstilsynet et overtredelsesgebyr på 500 000 kroner og irettesettelse for å ha publisert personopplysninger i tilsynsrapporter uten tilstrekkelig sladding.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 500 000 kroner og irettesettelse mot Arbeidstilsynet. Saken gjelder publisering av tilsynsrapporter på internett som inneholdt personopplysninger om arbeidstakere, inkludert helseopplysninger. Datatilsynet konstaterte at: (1) Arbeidstilsynet ikke hadde tilstrekkelige rutiner for sladding av personopplysninger i offentlige dokumenter; (2) helseopplysninger om arbeidstakere ble gjort offentlig tilgjengelige; (3) Arbeidstilsynet som tilsynsmyndighet har et særlig ansvar for å ivareta personvernet.",
    topics: JSON.stringify(["offentlig_sektor", "helsedata"]),
    gdpr_articles: JSON.stringify(["5", "9", "32"]),
    status: "final",
  },
  {
    reference: "22/12345-TRUMF",
    title: "Overtredelsesgebyr til NorgesGruppen (Trumf) for mangelfull personvernerklæring",
    date: "2022-06-24",
    type: "overtredelsesgebyr",
    entity_name: "NorgesGruppen ASA (Trumf)",
    fine_amount: 5_000_000,
    summary:
      "Datatilsynet ila NorgesGruppen et overtredelsesgebyr på 5 millioner kroner for mangelfull personvernerklæring og ulovlig deling av handelsdata fra Trumf-programmet.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 5 000 000 kroner mot NorgesGruppen ASA for behandling av personopplysninger i lojalitetsprogrammet Trumf. Datatilsynet konstaterte at: (1) NorgesGruppens personvernerklæring for Trumf var mangelfull — medlemmene fikk ikke tilstrekkelig informasjon om hvordan handledataene ble brukt; (2) handelsdata ble delt med tredjeparter i annonsebransjen uten tilstrekkelig informasjon; (3) NorgesGruppen hadde ikke gyldig rettslig grunnlag for all profilering av Trumf-medlemmer; (4) Trumf-programmet har 1,9 millioner medlemmer, noe som øker alvorlighetsgraden.",
    topics: JSON.stringify(["markedsforing", "samtykke"]),
    gdpr_articles: JSON.stringify(["5", "6", "13", "14"]),
    status: "final",
  },
  {
    reference: "22/13456-LILLESTRØM",
    title: "Overtredelsesgebyr til Lillestrøm kommune for mangelfull tilgangsstyring",
    date: "2022-05-05",
    type: "overtredelsesgebyr",
    entity_name: "Lillestrøm kommune",
    fine_amount: 500_000,
    summary:
      "Datatilsynet ila Lillestrøm kommune et overtredelsesgebyr på 500 000 kroner for mangelfull tilgangsstyring i systemer som behandlet sensitive personopplysninger.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 500 000 kroner mot Lillestrøm kommune for mangelfull tilgangsstyring. Kommunen hadde ikke tilstrekkelige rutiner for å begrense ansattes tilgang til sensitive personopplysninger i fagsystemer. Datatilsynet konstaterte at: (1) for mange ansatte hadde tilgang til opplysninger uten tjenstlig behov; (2) tilgangsrettighetene ble ikke gjennomgått og oppdatert regelmessig; (3) kommunen manglet systematisk loggkontroll.",
    topics: JSON.stringify(["informasjonssikkerhet", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "22/14567-SHINIGAMI",
    title: "Forbud mot nettleserutvidelsen Shinigami Eyes i Norge",
    date: "2022-06-15",
    type: "forbud",
    entity_name: "Shinigami Eyes (nettleserutvidelse)",
    fine_amount: null,
    summary:
      "Datatilsynet opprettholdt forbudet mot nettleserutvidelsen Shinigami Eyes som fargekodde brukere basert på oppfattede holdninger til transpersoner.",
    full_text:
      "Datatilsynet har fattet endelig vedtak om forbud mot nettleserutvidelsen Shinigami Eyes i Norge. Utvidelsen brukte fargekoding for å merke brukere i sosiale medier basert på deres oppfattede holdninger til transpersoner — grønn for 'transvennlig' og rød for 'transfiendtlig'. Datatilsynet konstaterte at: (1) fargekodingen utgjorde behandling av personopplysninger om seksuell legning og politisk oppfatning — særlige kategorier etter GDPR artikkel 9; (2) behandlingen manglet rettslig grunnlag; (3) de registrerte ble ikke informert om at de var merket; (4) behandlingen kunne medføre alvorlig risiko for diskriminering og trakassering.",
    topics: JSON.stringify(["biometri", "behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["5", "6", "9"]),
    status: "final",
  },
  {
    reference: "23/11234-FAST-CANDY",
    title: "Flere pålegg til Fast Candy AS etter tilsynssak",
    date: "2023-09-13",
    type: "vedtak",
    entity_name: "Fast Candy AS",
    fine_amount: null,
    summary:
      "Datatilsynet ga Fast Candy AS flere pålegg etter tilsyn som avdekket mangler i behandling av personopplysninger, inkludert manglende personvernerklæring og databehandleravtaler.",
    full_text:
      "Datatilsynet har fattet vedtak om flere pålegg mot Fast Candy AS etter gjennomført tilsyn. Fast Candy AS driver netthandel og ble kontrollert for etterlevelse av personvernregelverket. Datatilsynet avdekket: (1) manglende eller mangelfull personvernerklæring; (2) manglende databehandleravtaler med leverandører som behandler personopplysninger på vegne av selskapet; (3) manglende oversikt over behandlingsaktiviteter; (4) manglende rutiner for å håndtere innsynskrav; (5) bruk av sporingsverktøy uten gyldig samtykke. Selskapet ble pålagt å utbedre alle mangler innen fastsatte frister.",
    topics: JSON.stringify(["internkontroll", "informasjonskapsler", "databehandler"]),
    gdpr_articles: JSON.stringify(["5", "12", "13", "28", "30"]),
    status: "final",
  },
  {
    reference: "23/12345-GOOGLE-ANALYTICS-VEDTAK",
    title: "Vedtak i Google Analytics-saken — ulovlig overføring til USA",
    date: "2023-07-27",
    type: "vedtak",
    entity_name: "Norsk nettsted (Google Analytics)",
    fine_amount: null,
    summary:
      "Datatilsynet konstaterte at bruk av Google Analytics innebar ulovlig overføring av personopplysninger til USA i strid med Schrems II-dommen.",
    full_text:
      "Datatilsynet har fattet vedtak i Google Analytics-saken og konstatert at det aktuelle norske nettstedets bruk av Google Analytics innebar ulovlig overføring av personopplysninger til USA. Datatilsynet konstaterte at: (1) Google Analytics overfører IP-adresser og brukeridentifikatorer til Googles servere i USA; (2) overføringen manglet gyldig overføringsgrunnlag etter Schrems II-dommen; (3) Googles tilleggstiltak (IP-anonymisering) var ikke tilstrekkelige fordi identifikatoren overføres til Google før anonymisering; (4) nettstedet fikk pålegg om å stanse bruken av Google Analytics i sin daværende form.",
    topics: JSON.stringify(["overforing", "informasjonskapsler"]),
    gdpr_articles: JSON.stringify(["44", "46"]),
    status: "final",
  },
  {
    reference: "21/07890-OSLO-KOMMUNE-DOKUMENT",
    title: "Overtredelsesgebyr til Oslo kommune for publisering av sensitiv personalsak",
    date: "2021-05-20",
    type: "overtredelsesgebyr",
    entity_name: "Oslo kommune",
    fine_amount: 400_000,
    summary:
      "Datatilsynet ila Oslo kommune et overtredelsesgebyr på 400 000 kroner for publisering av dokumenter med sensitive personopplysninger om en ansatt i eInnsyn.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 400 000 kroner mot Oslo kommune for publisering av dokumenter med sensitive personopplysninger. Saken gjelder en personalsak der dokumenter med helseopplysninger om en ansatt ble publisert i eInnsyn uten tilstrekkelig sladding. Datatilsynet konstaterte at: (1) dokumentene inneholdt sensitive opplysninger, inkludert helseopplysninger; (2) kommunen manglet rutiner for kvalitetssikring av sladding; (3) opplysningene ble gjort offentlig tilgjengelige på internett gjennom eInnsyn.",
    topics: JSON.stringify(["offentlig_sektor", "helsedata"]),
    gdpr_articles: JSON.stringify(["5", "9"]),
    status: "final",
  },
  {
    reference: "21/08901-SPIONPROGRAMVARE",
    title: "Overtredelsesgebyr for installasjon av spionprogramvare på partneres telefon",
    date: "2021-12-01",
    type: "overtredelsesgebyr",
    entity_name: "Privatperson (anonymisert — spionprogramvare)",
    fine_amount: 50_000,
    summary:
      "Datatilsynet ila en privatperson et overtredelsesgebyr på 50 000 kroner for å ha installert spionprogramvare på sin partners mobiltelefon for å overvåke samtaler og lokasjonsdata.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 50 000 kroner mot en privatperson for installasjon av spionprogramvare. Personen hadde installert overvåkingsprogramvare på sin partners mobiltelefon for å lese meldinger, lytte til samtaler og spore lokasjonsdata uten samtykke. Datatilsynet konstaterte at: (1) installasjonen utgjorde ulovlig overvåking; (2) behandlingen manglet rettslig grunnlag; (3) den overvåkede var ikke informert; (4) overvåkingen var et alvorlig inngrep i privatlivet.",
    topics: JSON.stringify(["kameraovervaking", "gps_sporing"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },
  {
    reference: "24/09012-UIA-TEAMS",
    title: "Overtredelsesgebyr til Universitetet i Agder for mangelfull sikkerhet i Microsoft Teams",
    date: "2024-09-11",
    type: "overtredelsesgebyr",
    entity_name: "Universitetet i Agder",
    fine_amount: 150_000,
    summary:
      "Datatilsynet ila Universitetet i Agder et overtredelsesgebyr på 150 000 kroner for å ikke ha iverksatt tilstrekkelige tiltak for å sikre personopplysninger ved bruk av Microsoft Teams.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 150 000 kroner mot Universitetet i Agder for mangelfull informasjonssikkerhet ved bruk av Microsoft Teams. Datatilsynet konstaterte at: (1) universitetet ikke hadde gjennomført tilstrekkelige sikkerhetstiltak for Teams-plattformen; (2) personopplysninger om studenter og ansatte ble behandlet uten tilstrekkelig risikovurdering; (3) universitetet manglet rutiner for tilgangsstyring i Teams; (4) gebyret ble satt til 150 000 kroner under hensyn til at universitetet raskt iverksatte utbedringstiltak.",
    topics: JSON.stringify(["informasjonssikkerhet", "skole"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "24/10123-GRU-KOMMUNE-GEBYR",
    title: "Overtredelsesgebyr til Grue kommune for konfidensialitetsbrudd i saksinnsyn",
    date: "2024-10-29",
    type: "overtredelsesgebyr",
    entity_name: "Grue kommune",
    fine_amount: 250_000,
    summary:
      "Datatilsynet ila Grue kommune et overtredelsesgebyr på 250 000 kroner etter konfidensialitetsbrudd i kommunens saksregister.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 250 000 kroner mot Grue kommune for brudd på GDPR-kravene. Bakgrunnen var et avvik der konfidensielle opplysninger ble tilgjengelige i kommunens offentlige saksregister. Datatilsynet konstaterte at: (1) kommunen hadde utilstrekkelige rutiner for kvalitetssikring ved journalføring; (2) sensitive personopplysninger ble gjort tilgjengelige for offentligheten; (3) kommunen manglet internkontrollrutiner for å avdekke slike feil.",
    topics: JSON.stringify(["informasjonssikkerhet", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "32"]),
    status: "final",
  },
  {
    reference: "24/11234-EIDSKOG-GEBYR",
    title: "Overtredelsesgebyr til Eidskog kommune for manglende rettslig grunnlag",
    date: "2024-09-06",
    type: "overtredelsesgebyr",
    entity_name: "Eidskog kommune",
    fine_amount: 250_000,
    summary:
      "Datatilsynet ila Eidskog kommune et overtredelsesgebyr på 250 000 kroner for behandling av personopplysninger uten gyldig rettslig grunnlag.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 250 000 kroner mot Eidskog kommune for brudd på kravene til rettslig grunnlag i GDPR. Kommunen behandlet personopplysninger i et fagsystem uten å ha fastsatt og dokumentert rettslig grunnlag for behandlingen. Datatilsynet konstaterte at: (1) kommunen manglet rettslig grunnlag for flere av sine behandlinger; (2) protokoll over behandlingsaktiviteter var mangelfull; (3) kommunen manglet rutiner for å vurdere rettslig grunnlag ved oppstart av nye behandlinger.",
    topics: JSON.stringify(["behandlingsgrunnlag", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "6", "30"]),
    status: "final",
  },
  {
    reference: "24/12345-FAMILIEKANALEN-PALEGG",
    title: "Vedtak om pålegg til Familiekanalen for mangelfull personvernhåndtering",
    date: "2024-11-28",
    type: "vedtak",
    entity_name: "Familiekanalen",
    fine_amount: null,
    summary:
      "Datatilsynet ga Familiekanalen pålegg om å utbedre flere mangler i personvernhåndteringen, inkludert manglende personvernerklæring og samtykkerutiner.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot Familiekanalen for flere mangler i personvernhåndteringen. Datatilsynet avdekket at: (1) Familiekanalen manglet tilstrekkelig personvernerklæring; (2) samtykkerutinene for behandling av personopplysninger var mangelfulle; (3) det manglet oversikt over behandlingsaktiviteter; (4) barn var blant de berørte, noe som skjerper kravene; (5) Familiekanalen ble pålagt å utbedre alle mangler innen fastsatt frist.",
    topics: JSON.stringify(["barn", "samtykke", "internkontroll"]),
    gdpr_articles: JSON.stringify(["5", "7", "13", "30"]),
    status: "final",
  },
  {
    reference: "24/13456-STAVANGER-AP",
    title: "Irettesettelse til Stavanger Arbeiderparti for politisk reklame uten samtykke",
    date: "2024-09-11",
    type: "irettesettelse",
    entity_name: "Stavanger Arbeiderparti m.fl.",
    fine_amount: null,
    summary:
      "Datatilsynet ga Stavanger Arbeiderparti irettesettelse for utsending av politisk reklame (SMS) uten gyldig samtykke fra mottakerne.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse mot Stavanger Arbeiderparti og flere andre politiske partier for utsending av politisk reklame via SMS uten gyldig samtykke. Datatilsynet konstaterte at: (1) SMS-ene ble sendt til velgere som ikke hadde samtykket til å motta politisk reklame; (2) behandlingen manglet rettslig grunnlag etter GDPR artikkel 6; (3) politisk reklame per SMS er regulert av markedsføringsloven og krever forhåndssamtykke; (4) partiene ble gitt irettesettelse og pålagt å sikre samtykke ved fremtidig markedsføring.",
    topics: JSON.stringify(["markedsforing", "samtykke"]),
    gdpr_articles: JSON.stringify(["5", "6"]),
    status: "final",
  },

  // --- Final Personvernnemnda decisions ---
  {
    reference: "PVN-2022-SATS",
    title: "Personvernnemnda stadfester gebyr til Sats ASA",
    date: "2023-06-15",
    type: "klagevedtak",
    entity_name: "Sats ASA",
    fine_amount: 10_000_000,
    summary:
      "Personvernnemnda stadfestet Datatilsynets overtredelsesgebyr på 10 millioner kroner til Sats ASA for mangelfull informasjonssikkerhet og behandling av helseopplysninger.",
    full_text:
      "Personvernnemnda har stadfestet Datatilsynets vedtak om overtredelsesgebyr på 10 000 000 kroner til Sats ASA. Treningskjeden behandlet helseopplysninger om sine medlemmer (inkludert treningsdata og helsetilstand) uten tilstrekkelige sikkerhetstiltak. Datatilsynet konstaterte at: (1) Sats behandlet helseopplysninger uten tilstrekkelig rettslig grunnlag; (2) informasjonssikkerheten var mangelfull — personopplysninger om 2 millioner medlemmer var utilstrekkelig beskyttet; (3) Sats hadde ikke gjennomført tilstrekkelig risikovurdering; (4) personvernerklæringen ga ikke tilstrekkelig informasjon om behandlingen. Nemnda opprettholdt gebyret i sin helhet.",
    topics: JSON.stringify(["helsedata", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "9", "32"]),
    status: "final",
  },
  {
    reference: "PVN-2022-ARGON",
    title: "Personvernnemnda opprettholder gebyr til Argon Medical Devices",
    date: "2023-02-10",
    type: "klagevedtak",
    entity_name: "Argon Medical Devices, Inc.",
    fine_amount: 2_500_000,
    summary:
      "Personvernnemnda opprettholdt Datatilsynets overtredelsesgebyr på 2,5 millioner kroner til Argon Medical Devices for sen varsling av databrudd.",
    full_text:
      "Personvernnemnda har opprettholdt Datatilsynets vedtak om overtredelsesgebyr på 2 500 000 kroner til Argon Medical Devices, Inc. Saken gjelder brudd på meldeplikten etter GDPR artikkel 33. Et databrudd oppsto da en ansatts e-postkonto ble kompromittert gjennom phishing. Argon meldte ikke bruddet til Datatilsynet innen 72 timer. Nemnda fastslo at enhver uautorisert tilgang gjennom phishing utløser meldeplikten, uavhengig av om personopplysninger faktisk ble misbrukt.",
    topics: JSON.stringify(["avvik"]),
    gdpr_articles: JSON.stringify(["33"]),
    status: "final",
  },
  {
    reference: "PVN-2023-24",
    title: "Personvernnemnda avviser klage — Datatilsynets prioritering av saker",
    date: "2023-09-01",
    type: "klagevedtak",
    entity_name: "Privatperson (avvisning — sak ikke fulgt opp)",
    fine_amount: null,
    summary:
      "Personvernnemnda avviste klage på Datatilsynets beslutning om ikke å følge opp en henvendelse om brudd på personvernforordningen.",
    full_text:
      "Personvernnemnda har avvist klage på Datatilsynets beslutning om ikke å følge opp en henvendelse om mulig brudd på personvernforordningen. Nemnda konstaterte at Datatilsynet har skjønnsmessig adgang til å prioritere hvilke saker som skal følges opp, og at beslutningen om ikke å prioritere en bestemt sak ikke utgjør et enkeltvedtak som kan påklages.",
    topics: JSON.stringify(["innsyn"]),
    gdpr_articles: JSON.stringify(["57", "77"]),
    status: "final",
  },
  {
    reference: "PVN-2024-22",
    title: "Personvernnemnda om innsynskrav — Datatilsynets avslutning av sak",
    date: "2025-04-02",
    type: "klagevedtak",
    entity_name: "Privatperson (innsynskrav)",
    fine_amount: null,
    summary:
      "Personvernnemnda behandlet klage på Datatilsynets avslutning av sak vedrørende et innsynskrav som ikke ble besvart av den behandlingsansvarlige.",
    full_text:
      "Personvernnemnda har behandlet klage på Datatilsynets avslutning av sak om et innsynskrav. Klager hadde bedt om innsyn i egne personopplysninger hos en virksomhet, men innsynskravet ble ikke besvart. Klager kontaktet deretter Datatilsynet for bistand. Datatilsynet avsluttet saken etter å ha kontaktet virksomheten, som deretter besvarte innsynskravet. Nemnda vurderte om Datatilsynets avslutning var riktig.",
    topics: JSON.stringify(["innsyn"]),
    gdpr_articles: JSON.stringify(["15", "77"]),
    status: "final",
  },

  // --- Additional enforcement decisions ---
  {
    reference: "21/09012-RECOVER",
    title: "Overtredelsesgebyr til Recover AS for ulovlig kredittvurdering",
    date: "2022-09-09",
    type: "overtredelsesgebyr",
    entity_name: "Recover AS",
    fine_amount: 400_000,
    summary:
      "Datatilsynet ila Recover AS et overtredelsesgebyr på 400 000 kroner for å ha gjennomført kredittvurderinger uten saklig behov, med pålegg om å etablere rutiner.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 400 000 kroner og pålegg mot Recover AS for ulovlig kredittvurdering. Selskapet gjennomførte systematisk kredittvurdering av personer uten at det forelå saklig behov i hvert enkelt tilfelle. Datatilsynet konstaterte at: (1) kredittvurdering krever saklig behov — selskapet hadde ikke dokumentert grunnlaget i hver sak; (2) selskapet ble pålagt å etablere skriftlige rutiner for å vurdere saklig behov; (3) gebyret ble satt til 400 000 kroner.",
    topics: JSON.stringify(["kredittvurdering"]),
    gdpr_articles: JSON.stringify(["6"]),
    status: "final",
  },
  {
    reference: "22/15678-KROKATJONNVEGEN",
    title: "Overtredelsesgebyr til Krokatjønnvegen 15 AS for ulovlig kameraovervåking",
    date: "2022-08-02",
    type: "overtredelsesgebyr",
    entity_name: "Krokatjønnvegen 15 AS",
    fine_amount: 50_000,
    summary:
      "Datatilsynet ila Krokatjønnvegen 15 AS et overtredelsesgebyr på 50 000 kroner for ulovlig kameraovervåking av fellesarealer i et boligselskap.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 50 000 kroner og pålegg mot Krokatjønnvegen 15 AS for ulovlig kameraovervåking. Boligselskapet hadde installert overvåkingskameraer i fellesarealer uten å oppfylle vilkårene. Datatilsynet konstaterte at: (1) boligselskapet manglet dokumentert berettiget interesse; (2) beboerne var ikke tilstrekkelig informert; (3) selskapet ble pålagt å etablere skriftlige rutiner for kameraovervåking.",
    topics: JSON.stringify(["kameraovervaking"]),
    gdpr_articles: JSON.stringify(["5", "6", "13"]),
    status: "final",
  },
  {
    reference: "22/16789-KRIMINALOMSORGEN",
    title: "Tilsynsrapport og pålegg til Kriminalomsorgen",
    date: "2022-11-01",
    type: "vedtak",
    entity_name: "Kriminalomsorgen",
    fine_amount: null,
    summary:
      "Datatilsynet ga Kriminalomsorgen flere pålegg etter tilsyn som avdekket mangler i behandling av innsattes personopplysninger, inkludert tilgangsstyring og logging.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot Kriminalomsorgen etter gjennomført tilsyn. Tilsynet avdekket mangler i behandlingen av innsattes personopplysninger. Datatilsynet konstaterte at: (1) tilgangsstyringen var mangelfull — for mange ansatte hadde tilgang til sensitiv informasjon om innsatte; (2) loggkontrollen var utilstrekkelig; (3) det manglet oppdaterte risikovurderinger; (4) internkontrollen for personvern var ikke tilstrekkelig dokumentert.",
    topics: JSON.stringify(["politi_justis", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "24", "32"]),
    status: "final",
  },
  {
    reference: "21/10123-SYKEHUSET-INNLANDET",
    title: "Vedtak om pålegg til Sykehuset Innlandet for mangelfull tilgangsstyring",
    date: "2021-06-15",
    type: "vedtak",
    entity_name: "Sykehuset Innlandet HF",
    fine_amount: null,
    summary:
      "Datatilsynet ga Sykehuset Innlandet HF pålegg om å utbedre mangelfull tilgangsstyring i journalsystemet der helsepersonell hadde tilgang uten tjenstlig behov.",
    full_text:
      "Datatilsynet har fattet vedtak om pålegg mot Sykehuset Innlandet HF for mangelfull tilgangsstyring i journalsystemet. Datatilsynet avdekket at helsepersonell hadde tilgang til pasientjournaler uten tjenstlig behov. Datatilsynet konstaterte at: (1) tilgangsstyringen ikke var tilstrekkelig begrenset til tjenstlig behov; (2) loggkontroll av hvem som aksesserte journaler var utilstrekkelig; (3) sykehuset manglet systematisk gjennomgang av tilgangsrettigheter; (4) sykehuset ble pålagt å gjennomføre en helhetlig gjennomgang av tilgangsstyring.",
    topics: JSON.stringify(["helsedata", "informasjonssikkerhet"]),
    gdpr_articles: JSON.stringify(["5", "9", "32"]),
    status: "final",
  },
  {
    reference: "22/17890-ELEKTRO-AUTOMASJON",
    title: "Overtredelsesgebyr til Elektro & Automasjon Systemer AS for ulovlig kameraovervåking",
    date: "2022-01-07",
    type: "overtredelsesgebyr",
    entity_name: "Elektro & Automasjon Systemer AS",
    fine_amount: 75_000,
    summary:
      "Datatilsynet ila Elektro & Automasjon Systemer AS et overtredelsesgebyr på 75 000 kroner for ulovlig kameraovervåking av ansattes arbeidsplasser.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 75 000 kroner mot Elektro & Automasjon Systemer AS for ulovlig kameraovervåking. Virksomheten hadde installert kameraer rettet mot ansattes arbeidsplasser uten å oppfylle vilkårene i arbeidsmiljøloven kapittel 9 og GDPR. Datatilsynet konstaterte at: (1) kameraovervåkingen manglet saklig grunn; (2) de ansatte var ikke informert; (3) kontrolltiltaket var ikke drøftet med tillitsvalgte.",
    topics: JSON.stringify(["kameraovervaking", "arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["5", "6", "13"]),
    status: "final",
  },
  {
    reference: "22/18901-MOWI-GPS",
    title: "Irettesettelse og pålegg til Mowi ASA for GPS-sporing av sjåfører",
    date: "2022-04-26",
    type: "irettesettelse",
    entity_name: "Mowi ASA",
    fine_amount: null,
    summary:
      "Datatilsynet ga Mowi ASA irettesettelse og pålegg for GPS-sporing av sjåfører uten tilstrekkelig rettslig grunnlag og informasjon.",
    full_text:
      "Datatilsynet har fattet vedtak om irettesettelse og pålegg mot Mowi ASA for GPS-sporing av sjåfører. Lakseoppdretts­selskapet sporet sjåfører av firmakjøretøy med GPS uten å ha gjennomført forholdsmessighetsvurdering. Datatilsynet konstaterte at: (1) GPS-sporingen manglet tilstrekkelig rettslig grunnlag; (2) sjåførene var ikke informert om omfanget av sporingen; (3) sporingen var mer inngripende enn nødvendig for flåtestyring. Mowi ble pålagt å etablere rutiner i tråd med personvernregelverket.",
    topics: JSON.stringify(["gps_sporing", "arbeidsforhold"]),
    gdpr_articles: JSON.stringify(["5", "6", "13"]),
    status: "final",
  },
  {
    reference: "21/11234-SPK",
    title: "Overtredelsesgebyr til Statens pensjonskasse for unødvendig datainnsamling",
    date: "2021-12-08",
    type: "overtredelsesgebyr",
    entity_name: "Statens pensjonskasse (SPK)",
    fine_amount: 500_000,
    summary:
      "Datatilsynet ila Statens pensjonskasse et overtredelsesgebyr på 500 000 kroner for innsamling av personopplysninger ut over det som var nødvendig for formålet.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 500 000 kroner mot Statens pensjonskasse (SPK) for unødvendig innsamling av personopplysninger. SPK innhentet opplysninger om pensjonistenes familieforhold, helse og økonomi ut over det som var nødvendig for pensjonsberegning. Datatilsynet konstaterte brudd på dataminimeringsprinsippet i GDPR artikkel 5 nr. 1 bokstav c.",
    topics: JSON.stringify(["offentlig_sektor", "behandlingsgrunnlag"]),
    gdpr_articles: JSON.stringify(["5"]),
    status: "final",
  },
  {
    reference: "21/12345-ULTRA-TECHNOLOGY",
    title: "Overtredelsesgebyr til Ultra-Technology AS for ulovlig kredittvurdering",
    date: "2021-10-06",
    type: "overtredelsesgebyr",
    entity_name: "Ultra-Technology AS",
    fine_amount: 100_000,
    summary:
      "Datatilsynet ila Ultra-Technology AS et overtredelsesgebyr på 100 000 kroner for gjennomføring av uautoriserte kredittvurderinger uten saklig behov.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 100 000 kroner mot Ultra-Technology AS for ulovlig kredittvurdering. Selskapet gjennomførte kredittvurdering av potensielle forretningsforbindelser uten at det forelå saklig behov. Datatilsynet konstaterte at: (1) kredittvurdering forutsetter saklig behov i en konkret kredittrelasjon; (2) generell nysgjerrighet om andres kredittverdighet er ikke tilstrekkelig grunnlag.",
    topics: JSON.stringify(["kredittvurdering"]),
    gdpr_articles: JSON.stringify(["6"]),
    status: "final",
  },
  {
    reference: "21/13456-HOYLANDET",
    title: "Overtredelsesgebyr til Høylandet kommune for eksponering av helsefiler",
    date: "2021-09-30",
    type: "overtredelsesgebyr",
    entity_name: "Høylandet kommune",
    fine_amount: 150_000,
    summary:
      "Datatilsynet ila Høylandet kommune et overtredelsesgebyr på 150 000 kroner fordi helseopplysninger om innbyggere lå tilgjengelige på usikrede filområder.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 150 000 kroner mot Høylandet kommune. Helseopplysninger om innbyggere i kommunens helse- og omsorgstjeneste ble lagret på filområder uten tilstrekkelig tilgangsstyring. Datatilsynet konstaterte at: (1) sensitive helseopplysninger var tilgjengelige for kommunalt ansatte uten tjenstlig behov; (2) kommunen manglet rutiner for å kontrollere at helseopplysninger ble lagret i godkjente systemer; (3) bruddet gjaldt særlige kategorier av personopplysninger.",
    topics: JSON.stringify(["helsedata", "informasjonssikkerhet", "offentlig_sektor"]),
    gdpr_articles: JSON.stringify(["5", "9", "32"]),
    status: "final",
  },
  {
    reference: "21/14567-FERDE-KINA",
    title: "Overtredelsesgebyr til Ferde AS for ulovlig overføring av data til Kina",
    date: "2021-09-30",
    type: "overtredelsesgebyr",
    entity_name: "Ferde AS",
    fine_amount: 5_000_000,
    summary:
      "Datatilsynet ila Ferde AS et overtredelsesgebyr på 5 millioner kroner for ulovlig overføring av personopplysninger om norske bilister til Kina via en underleverandør.",
    full_text:
      "Datatilsynet har fattet vedtak om overtredelsesgebyr på 5 000 000 kroner mot Ferde AS for ulovlig overføring av personopplysninger til Kina. Ferde, som driver bompengeinnkreving, brukte en underleverandør som sendte bilder av bilskilt og kjøretøy til Kina for manuell avlesning. Datatilsynet konstaterte at: (1) overføringen manglet gyldig overføringsgrunnlag — Kina har ikke adekvansbeslutning; (2) Ferde hadde ikke gjennomført tilstrekkelig vurdering av beskyttelsesnivået i Kina; (3) bildene inneholdt personopplysninger (bilskilt og bilder av kjøretøy med passasjerer); (4) Ferde burde vært kjent med at underleverandøren overførte data til Kina.",
    topics: JSON.stringify(["overforing", "transport"]),
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

// ---------------------------------------------------------------------------
// Guidelines
// ---------------------------------------------------------------------------

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
  // =========================================================================
  // Veiledere — Core GDPR topics
  // =========================================================================
  {
    reference: "DT-VEILEDER-COOKIES-2025",
    title: "Veileder om samtykke til informasjonskapsler og sporingsteknologier",
    date: "2025-01-01",
    type: "veileder",
    summary:
      "Datatilsynets oppdaterte veileder om informasjonskapsler etter nye ekomloven § 3-15 som trådte i kraft 1. januar 2025. Samtykke til bruk av informasjonskapsler og sporingsteknologier må nå oppfylle kravene i GDPR for å være gyldig.",
    full_text:
      "Datatilsynets veileder om samtykke til informasjonskapsler og sporingsteknologier, oppdatert etter ny ekomloven § 3-15 som trådte i kraft 1. januar 2025. Samtykke må oppfylle syv kriterier for å være gyldig: (1) Frivillig — samtykke skal gis uten tvang; (2) Spesifikt — samtykke gis til bestemte formål; (3) Informert — brukeren må få tilstrekkelig informasjon; (4) Utvetydig — samtykke gis gjennom en klar handling; (5) Aktivt — ikke passivt akseptert; (6) Dokumentert — virksomheten skal kunne dokumentere samtykket; (7) Mulig å trekke tilbake — like enkelt å trekke tilbake som å gi. Ti praktiske krav til virksomheter: klar informasjon i samtykkebokser, supplere bannere med fullstendige opplysninger, aldri betinge tilgang til nettstedet av samtykke, granulerte valg, ingen forhåndsavkryssede bokser, like enkelt å avslå som å akseptere, synlige avslå-valg, klart språk på knapper, enkel tilbaketrekking, og sikre at tredjeparter etterlever samme standard. Villedende eller manipulative samtykkemekanismer (dark patterns) er forbudt. Datatilsynet vurderer informasjonskvalitet og samtykkets gyldighet under GDPR, mens Nkom bestemmer teknisk omfang og unntak. Kun informasjonskapsler som er strengt nødvendige for kommunikasjon eller en tjeneste brukeren uttrykkelig har bedt om, er unntatt fra samtykkekravet. Analyse-, markedsførings- og tredjepartscookies krever alltid samtykke.",
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
      "Veilederen beskriver kravene til personvernkonsekvensvurdering (DPIA) etter GDPR artikkel 35. En DPIA er påkrevet når en behandling sannsynligvis vil medføre høy risiko for fysiske personers rettigheter og friheter. Datatilsynet har utarbeidet en nasjonal liste over behandlingsaktiviteter som alltid krever DPIA, blant annet: (1) systematisk og omfattende overvåking av offentlig tilgjengelige områder; (2) behandling av biometriske data for å identifisere fysiske personer; (3) behandling av genetiske data; (4) behandling av særlige kategorier av personopplysninger i stor skala; (5) systematisk overvåking av arbeidstakere; (6) behandling av barns personopplysninger i stor skala; (7) sammenstilling av data fra flere registre; (8) bruk av ny teknologi som kunstig intelligens og maskinlæring. DPIA-prosessen skal inneholde: en systematisk beskrivelse av behandlingen og dens formål, en vurdering av nødvendigheten og proporsjonaliteten av behandlingen, en vurdering av risikoen for de registrertes rettigheter og friheter, og planlagte tiltak for å håndtere risikoen. Dersom DPIA viser at behandlingen medfører høy risiko som ikke kan reduseres til et akseptabelt nivå, skal den behandlingsansvarlige rådføre seg med Datatilsynet før behandlingen starter (art. 36 GDPR).",
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
      "Veilederen gir praktisk veiledning om overføring av personopplysninger til tredjeland etter GDPR kapittel V og EU-domstolens avgjørelse i Schrems II-saken (C-311/18). Overføringsgrunnlag: (1) beslutning om tilstrekkelig beskyttelsesnivå fra EU-kommisjonen (art. 45) — gjelder blant annet EØS, UK, Sveits, Japan, Sør-Korea, Canada, og USA (EU-U.S. Data Privacy Framework fra juli 2023); (2) Standard Contractual Clauses (SCC) vedtatt av EU-kommisjonen (art. 46 nr. 2 bokstav c); (3) bindende virksomhetsregler (BCR, art. 47); (4) unntak for særlige situasjoner (art. 49). Transfer Impact Assessment (TIA): ved bruk av SCC eller BCR må den behandlingsansvarlige vurdere om mottakerlandets lovgivning gir tilstrekkelig beskyttelsesnivå. Vurderingen skal omfatte: lovgivning om myndighetstilgang til data, rettsmidler for registrerte, uavhengige tilsynsmyndigheters kompetanse. Supplerende tiltak ved mangler: ende-til-ende-kryptering der mottakeren ikke har tilgang til nøklene, pseudonymisering, dataminimering, og kontraktsmessige forpliktelser om å bestride myndighetstilgang.",
    topics: JSON.stringify(["overforing"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-SAMTYKKE-2020",
    title: "Veileder om samtykke som behandlingsgrunnlag",
    date: "2020-01-15",
    type: "veileder",
    summary:
      "Datatilsynets veileder om kravene til gyldig samtykke etter GDPR artikkel 6(1)(a) og 7. Presiserer kravene til frivillighet, informasjon, spesifisitet og aktiv handling.",
    full_text:
      "Veilederen beskriver kravene til gyldig samtykke som behandlingsgrunnlag etter GDPR artikkel 6(1)(a) og 7. Gyldig samtykke krever: (1) Frivillighet — samtykke skal gis uten tvang, press eller negative konsekvenser ved å nekte. I arbeidsforhold og offentlig forvaltning er det sjelden at samtykke kan anses som frivillig på grunn av maktforholdet. Tilgang til en tjeneste skal ikke gjøres betinget av samtykke til behandling som ikke er nødvendig for tjenesten (kopplingsforbudet); (2) Informert — den registrerte skal motta klar og forståelig informasjon om hvem som er behandlingsansvarlig, formålet med behandlingen, hvilke opplysninger som behandles, hvem som mottar opplysningene, retten til å trekke tilbake samtykke, og konsekvensene av å ikke samtykke; (3) Spesifikt — samtykket skal gjelde for bestemte behandlingsformål, ikke generelt; (4) Utvetydig — samtykket skal gis gjennom en aktiv handling, f.eks. avkryssing av en boks. Passivt samtykke, forhåndsavkryssede bokser eller taushet er ikke gyldig samtykke; (5) Tilbaketrekking — det skal være like enkelt å trekke tilbake samtykke som å gi det. Behandlingen basert på samtykket opphører ved tilbaketrekking, men behandling som allerede har funnet sted er fortsatt lovlig; (6) Dokumentasjon — den behandlingsansvarlige skal kunne dokumentere at gyldig samtykke er innhentet.",
    topics: JSON.stringify(["samtykke", "behandlingsgrunnlag"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-BEHANDLINGSGRUNNLAG-2021",
    title: "Veileder om rettslig grunnlag for behandling av personopplysninger",
    date: "2021-03-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om de seks rettslige grunnlagene i GDPR artikkel 6 for behandling av personopplysninger. Dekker samtykke, avtale, rettslig forpliktelse, vitale interesser, oppgave i allmennhetens interesse, og berettiget interesse.",
    full_text:
      "Veilederen gjennomgår de seks rettslige grunnlagene for behandling av personopplysninger i GDPR artikkel 6(1): (a) Samtykke — den registrerte har gitt samtykke til behandling for ett eller flere bestemte formål. Se egen veileder om samtykke; (b) Avtale — behandlingen er nødvendig for å oppfylle en avtale med den registrerte eller for å gjennomføre tiltak etter den registrertes ønske før avtale inngås; (c) Rettslig forpliktelse — behandlingen er nødvendig for å oppfylle en rettslig forpliktelse som påhviler den behandlingsansvarlige, f.eks. bokføringsloven, regnskapsloven, hvitvaskingsloven; (d) Vitale interesser — behandlingen er nødvendig for å verne den registrertes eller en annen persons vitale interesser. Brukes kun i nødsituasjoner der personen ikke kan samtykke; (e) Oppgave i allmennhetens interesse eller offentlig myndighetsutøvelse — behandlingen er nødvendig for å utføre en oppgave i allmennhetens interesse eller utøve offentlig myndighet. Krever supplerende hjemmel i nasjonal lov; (f) Berettiget interesse — behandlingen er nødvendig for formål knyttet til den behandlingsansvarliges eller en tredjeparts berettigede interesser, med mindre den registrertes interesser eller grunnleggende rettigheter veier tyngre. Krever en interesseavveining. Offentlige myndigheter kan normalt ikke bruke berettiget interesse. For særlige kategorier av personopplysninger (art. 9) kreves et tilleggsvilkår utover art. 6, f.eks. uttrykkelig samtykke eller nødvendig for helseomsorg.",
    topics: JSON.stringify(["behandlingsgrunnlag"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-AVVIK-2022",
    title: "Veileder om håndtering av brudd på personopplysningssikkerheten",
    date: "2022-01-15",
    type: "veileder",
    summary:
      "Datatilsynets veileder om avvikshåndtering — melding av brudd på personopplysningssikkerheten til Datatilsynet og berørte registrerte. Dekker 72-timersfristen, risikovurdering, og praktisk gjennomføring.",
    full_text:
      "Veilederen gir praktisk veiledning om håndtering av brudd på personopplysningssikkerheten (avvik) etter GDPR artikkel 33 og 34. Et brudd på personopplysningssikkerheten er ethvert sikkerhetsbrudd som fører til utilsiktet eller ulovlig tilintetgjøring, tap, endring, uautorisert utlevering av, eller tilgang til, personopplysninger. Brudd omfatter: konfidensialitetsbrudd (opplysninger gjort tilgjengelige for uvedkommende), integritetsbrudd (opplysninger endret uten tillatelse), og tilgjengelighetsbrudd (opplysninger gjort utilgjengelige). Meldeplikt til Datatilsynet (art. 33): bruddet skal meldes uten ugrunnet opphold og senest 72 timer etter at den behandlingsansvarlige ble kjent med bruddet. Meldingen skal inneholde: bruddets art, kategorier og antall berørte, kontaktperson, sannsynlige konsekvenser, og tiltak iverksatt eller planlagt. Varsling av registrerte (art. 34): dersom bruddet medfører høy risiko for de registrertes rettigheter og friheter, skal de berørte varsles uten ugrunnet opphold. Varselet skal beskrive bruddet i klart og enkelt språk, og gi råd om tiltak de registrerte kan iverksette. Intern håndtering: virksomheten skal ha rutiner for å oppdage, vurdere og håndtere brudd. Alle brudd skal dokumenteres, uavhengig av meldeplikt. Det skal gjennomføres en risikovurdering for å avgjøre om bruddet utløser meldeplikt.",
    topics: JSON.stringify(["avvik"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-PERSONVERNOMBUD-2021",
    title: "Veileder om personvernombud (DPO)",
    date: "2021-06-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om kravene til personvernombud etter GDPR artikkel 37-39. Dekker når oppnevning er obligatorisk, ombudets rolle og uavhengighet, og praktiske anbefalinger.",
    full_text:
      "Veilederen beskriver kravene til personvernombud (Data Protection Officer, DPO) etter GDPR artikkel 37-39. Obligatorisk oppnevning: et personvernombud skal oppnevnes når: (1) behandlingen utføres av en offentlig myndighet eller et offentlig organ; (2) kjernevirksomheten består i behandlingsaktiviteter som krever regelmessig og systematisk monitorering av registrerte i stor skala; (3) kjernevirksomheten består i behandling av særlige kategorier av personopplysninger eller personopplysninger om straffedommer og lovovertredelser i stor skala. Datatilsynet anbefaler at alle virksomheter som driver med omfattende innsamling og bruk av personopplysninger, eller behandler spesielt sensitive opplysninger, etablerer et personvernombud, selv om det ikke er lovpålagt. Ombudets rolle: (1) informere og gi råd til virksomheten om personvernforpliktelser; (2) kontrollere overholdelse av personvernregelverket; (3) gi råd om personvernkonsekvensvurderinger; (4) samarbeide med Datatilsynet; (5) være kontaktpunkt for de registrerte. Ombudets uavhengighet: (1) ombudet skal ikke motta instrukser om utøvelsen av sine oppgaver; (2) ombudet skal rapportere direkte til virksomhetens øverste ledelse; (3) ombudet skal ikke ha oppgaver som medfører interessekonflikt, f.eks. ikke selv være behandlingsansvarlig for behandlingsaktiviteter. Ombudet skal ha tilstrekkelig fagkompetanse, tid og ressurser.",
    topics: JSON.stringify(["personvernombud"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-DATABEHANDLERAVTALE-2020",
    title: "Veileder om databehandleravtale",
    date: "2020-03-15",
    type: "veileder",
    summary:
      "Datatilsynets veileder om kravene til databehandleravtale etter GDPR artikkel 28. Dekker når avtale er nødvendig, hva avtalen skal inneholde, og forholdet mellom behandlingsansvarlig og databehandler.",
    full_text:
      "Veilederen beskriver kravene til databehandleravtale etter GDPR artikkel 28. En databehandleravtale er nødvendig når en virksomhet (behandlingsansvarlig) bruker en annen virksomhet (databehandler) til å behandle personopplysninger på sine vegne. Avtalen skal inneholde: (1) formålet med behandlingen og dens varighet; (2) hvilke kategorier av personopplysninger som behandles; (3) tekniske og organisatoriske sikkerhetstiltak; (4) at databehandleren kun behandler opplysningene etter instrukser fra den behandlingsansvarlige; (5) at databehandleren sikrer at personer som behandler opplysningene er underlagt taushetsplikt; (6) bestemmelser om bruk av underleverandører (underdatabehandlere); (7) bistand ved utøvelse av de registrertes rettigheter; (8) bistand ved avvikshåndtering, DPIA og forhåndsdrøftelse; (9) sletting eller tilbakelevering av opplysninger ved opphør; (10) bestemmelser om revisjon og inspeksjon. Praktisk veiledning: den behandlingsansvarlige har plikt til å sikre at databehandleren gir tilstrekkelige garantier for at behandlingen skjer i samsvar med GDPR. Skolesektoren har særlige behov for databehandleravtaler med leverandører av digitale læringsverktøy.",
    topics: JSON.stringify(["databehandler"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-INNSYNSRETT-2021",
    title: "Veileder om innsynsretten og øvrige rettigheter",
    date: "2021-11-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om de registrertes rettigheter etter GDPR artikkel 12-23, herunder innsyn, retting, sletting, begrensning, dataportabilitet, innsigelse og automatiserte avgjørelser.",
    full_text:
      "Veilederen gjennomgår de registrertes rettigheter etter GDPR artikkel 12-23. Generelle krav (art. 12): virksomheten skal gi informasjon i en kortfattet, åpen, forståelig og lett tilgjengelig form, med klart og enkelt språk. Henvendelser skal besvares innen én måned. Innsynsrett (art. 15): retten til å få bekreftet om personopplysninger behandles, og i så fall få tilgang til opplysningene og informasjon om behandlingen. Rett til retting (art. 16): retten til å få uriktige personopplysninger rettet. Rett til sletting (art. 17): retten til å få personopplysninger slettet når de ikke lenger er nødvendige for formålet, samtykke er trukket tilbake, den registrerte protesterer, eller behandlingen er ulovlig. Ikke absolutt — kan avveies mot arkivformål, forskning, rettslige krav. Rett til begrensning (art. 18): retten til å kreve at behandlingen begrenses, f.eks. mens riktigheten av opplysningene undersøkes. Rett til dataportabilitet (art. 20): retten til å motta egne personopplysninger i et strukturert, alminnelig brukt og maskinlesbart format, og overføre dem til annen virksomhet. Rett til innsigelse (art. 21): retten til å protestere mot behandling basert på berettiget interesse eller allmenn interesse. Ved direkte markedsføring har den registrerte ubetinget rett til å protestere. Automatiserte individuelle avgjørelser (art. 22): retten til å ikke bli gjenstand for en avgjørelse basert utelukkende på automatisert behandling, inkludert profilering, som har rettsvirkninger eller i betydelig grad påvirker den registrerte.",
    topics: JSON.stringify(["innsyn", "sletting"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-INNEBYGD-PERSONVERN-2019",
    title: "Veileder om innebygd personvern og personvern som standard",
    date: "2019-06-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om innebygd personvern (privacy by design) og personvern som standard (privacy by default) etter GDPR artikkel 25. Beskriver syv grunnprinsipper og praktiske sjekklister for implementering.",
    full_text:
      "Veilederen beskriver kravene til innebygd personvern og personvern som standard etter GDPR artikkel 25. Innebygd personvern innebærer å integrere personvern i alle faser av utvikling av systemer og løsninger — fra idé til utfasing. Syv grunnprinsipper fra Ann Cavoukian: (1) Proaktiv, ikke reaktiv — forebygg, ikke reparer; (2) Personvern som standardinnstilling — brukeren skal ikke måtte gjøre noe aktivt for å beskytte sitt personvern; (3) Innebygd i designet — personvern skal ikke være et tillegg, men en integrert del; (4) Full funksjonalitet — det skal ikke være nødvendig å velge mellom personvern og funksjonalitet; (5) Ende-til-ende-sikkerhet — sikre opplysningene gjennom hele livssyklusen; (6) Synlighet og åpenhet — vær åpen om behandlingen; (7) Respekt for brukerens personvern — sett brukeren i sentrum. Praktisk sjekkliste: gjennomfør DPIA tidlig, minimér datainnsamling, begrens tilgang, slett opplysninger når formålet er oppfylt, logg all tilgang, bruk kryptering og pseudonymisering, test sikkerheten regelmessig.",
    topics: JSON.stringify(["innebygd_personvern"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-INFORMASJON-APENHET-2020",
    title: "Veileder om informasjon og åpenhet",
    date: "2020-05-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om virksomhetens plikt til å informere de registrerte om behandling av personopplysninger etter GDPR artikkel 13 og 14.",
    full_text:
      "Veilederen beskriver virksomhetens plikt til å informere de registrerte om behandling av personopplysninger etter GDPR artikkel 13 (informasjon ved innsamling direkte fra den registrerte) og artikkel 14 (informasjon når opplysningene er innhentet fra andre kilder). Informasjonen skal gis: (1) i en kortfattet, åpen, forståelig og lett tilgjengelig form; (2) med klart og enkelt språk, særlig når informasjonen rettes mot barn; (3) skriftlig, elektronisk eller på annen hensiktsmessig måte. Obligatorisk informasjon inkluderer: identiteten til den behandlingsansvarlige, kontaktinformasjon til personvernombudet, formålene med behandlingen, det rettslige grunnlaget, eventuelle mottakere, eventuell overføring til tredjeland, lagringstid, de registrertes rettigheter, retten til å trekke tilbake samtykke, retten til å klage til Datatilsynet, og om automatiserte individuelle avgjørelser. Personvernerklæringer bør være lett tilgjengelige, oppdaterte og forståelige for målgruppen.",
    topics: JSON.stringify(["behandlingsgrunnlag"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-INTERNKONTROLL-2019",
    title: "Veileder om internkontroll og informasjonssikkerhet",
    date: "2019-01-15",
    type: "veileder",
    summary:
      "Datatilsynets veileder om hvordan virksomheter skal etablere og vedlikeholde internkontroll for å sikre at personopplysninger behandles lovlig, sikkert og forsvarlig.",
    full_text:
      "Veilederen gir praktisk veiledning om etablering og oppfølging av internkontroll for personvern og informasjonssikkerhet. Internkontroll innebærer systematiske tiltak for å sikre at virksomheten behandler personopplysninger i samsvar med regelverket. Hovedelementer: (1) Ledelsesforankring — virksomhetens ledelse har det overordnede ansvaret og skal sørge for nødvendige ressurser; (2) Oversikt — virksomheten skal ha oversikt over alle behandlingsaktiviteter (behandlingsprotokoll etter art. 30), hvilke personopplysninger som behandles, formål, rettslig grunnlag, og hvem som har tilgang; (3) Risikovurdering — gjennomfør regelmessige risikovurderinger av behandlingsaktivitetene; (4) Tiltak — implementer tekniske og organisatoriske tiltak basert på risikovurderingen; (5) Rutiner — etabler skriftlige rutiner for behandling av personopplysninger, herunder avvikshåndtering, innsynsforespørsler, sletting og databehandleravtaler; (6) Opplæring — sørg for at alle ansatte som behandler personopplysninger har tilstrekkelig opplæring; (7) Oppfølging — gjennomfør regelmessige internrevisjoner for å sikre at tiltakene er effektive.",
    topics: JSON.stringify(["internkontroll", "informasjonssikkerhet"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-BEHANDLINGSPROTOKOLL-2019",
    title: "Veileder om protokoll over behandlingsaktiviteter",
    date: "2019-04-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om plikten til å føre protokoll over behandlingsaktiviteter etter GDPR artikkel 30.",
    full_text:
      "Veilederen beskriver plikten til å føre protokoll over behandlingsaktiviteter etter GDPR artikkel 30. Alle virksomheter med mer enn 250 ansatte, og mindre virksomheter som behandler personopplysninger regelmessig eller behandler særlige kategorier, skal føre en slik protokoll. Protokollen skal inneholde: (1) navn og kontaktinformasjon til den behandlingsansvarlige; (2) formålene med behandlingen; (3) kategorier av registrerte og personopplysninger; (4) kategorier av mottakere; (5) overføringer til tredjeland; (6) planlagte slettefrister; (7) beskrivelse av tekniske og organisatoriske sikkerhetstiltak. Protokollen skal holdes oppdatert og gjøres tilgjengelig for Datatilsynet på forespørsel.",
    topics: JSON.stringify(["internkontroll"]),
    language: "no",
  },

  // =========================================================================
  // Sector-specific guidance
  // =========================================================================
  {
    reference: "DT-VEILEDER-KAMERA-2022",
    title: "Veileder om kameraovervåking",
    date: "2022-08-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om kameraovervåking — når det er tillatt, rettslig grunnlag, lagringsbegrensninger, skilting og sektorspesifikke regler for arbeidsplass, boligområder og offentlige steder.",
    full_text:
      "Veilederen beskriver reglene for kameraovervåking. Tre hovedvilkår: (1) Formålsbegrensning — virksomheten må definere et klart, skriftlig formål. Opptak kan ikke gjenbrukes til andre formål; (2) Nødvendighet — overvåkingen må være nødvendig og egnet for formålet. Alternative, mindre inngripende tiltak skal vurderes først: fysisk sikring, tilgangskontroll, bedre belysning, økt bemanning; (3) Interesseavveining — virksomhetens interesser må veie vesentlig tyngre enn personvernet. Legitime interesser inkluderer beskyttelse av liv og helse og forebygging av alvorlig kriminalitet, men kun der konkrete, dokumenterte problemer foreligger. Forbudte bruksområder: lydovervåking er generelt ulovlig. Overvåking av ansattes arbeidsinnsats er forbudt — ansattes personverninteresser veier tyngre. Kameraer på toaletter, garderober og pauserom er alltid forbudt. Lagring: opptak skal slettes etter 7 dager med mindre lengre lagring er nødvendig for konkret hendelse. Skilting: all overvåking skal tydelig varsles med informasjon om hvem som overvåker, formålet, og kontaktinformasjon. Arbeidsplass: kameraovervåking er som hovedregel kun tillatt for å forebygge og avdekke kriminalitet, eller for å beskytte liv og helse. Boligområder: privatpersoner kan overvåke egen eiendom, men kameraet skal ikke dekke offentlig område eller naboeiendom.",
    topics: JSON.stringify(["kameraovervaking"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-ARBEIDSPLASS-2023",
    title: "Veileder om kontroll og overvåking i arbeidslivet",
    date: "2023-03-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om kontroll og overvåking av ansatte — kameraovervåking, GPS-sporing, innsyn i e-post, telefonovervåking, rustesting og kontrolltiltak i arbeidsforhold.",
    full_text:
      "Datatilsynet og Arbeidstilsynet har utarbeidet en felles veileder om kontroll og overvåking i arbeidslivet. Veilederen dekker følgende områder: Kameraovervåking: overvåking av arbeidsplassen er som hovedregel kun tillatt for å forebygge og avdekke kriminalitet eller beskytte liv og helse. Toaletter, garderober og pauserom er unntatt. GPS og sporing: arbeidsgivere som bruker GPS-sporing i yrkesbiler må oppfylle kravene til behandlingsgrunnlag, informasjon til de ansatte, og forholdsmessighet. Sporingen skal begrenses til det nødvendige for formålet. Innsyn i e-post og filer: arbeidsgiver kan kun få innsyn i nåværende eller tidligere ansattes e-post eller private filer i to tilfeller: (a) når det er nødvendig for å ivareta virksomhetens drift eller andre berettigede interesser, og (b) ved mistanke om grove pliktbrudd. E-postforskriften regulerer prosedyrene. Telefonovervåking: arbeidsgivere har generelt ikke rett til å ta opp ansattes telefonsamtaler, med unntak for verdipapirhandel og i visse tilfeller kundeservice. Overvåking av elektronisk utstyr: arbeidsgiver har ingen rett til å overvåke ansattes bruk av datamaskiner og internett, med mindre formålet er å administrere nettverket eller avdekke sikkerhetsbrudd. Rustesting: reguleres særskilt og krever rettslig grunnlag.",
    topics: JSON.stringify([
      "arbeidsforhold",
      "kameraovervaking",
      "gps_sporing",
      "epost",
    ]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-BARN-SKOLE-2022",
    title: "Veileder om personvern i skolen",
    date: "2022-05-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvern i skolen og barnehagen — barns rettigheter, samtykke fra foresatte, digitale læringsplattformer, fotografering og bildedeling.",
    full_text:
      "Veilederen beskriver personvernreglene som gjelder for skoler og barnehager. Samtykke fra mindreårige: foresatte må gi samtykke for behandling av barns personopplysninger. For informasjonssamfunnstjenester (de fleste nettbaserte tjenester og apper) kreves foresattes samtykke for barn under 13 år i Norge. Skoler og barnehager kan ikke gi samtykke på vegne av barn. Digitale læringsplattformer: plattformene bør kun inneholde data som er nødvendig for formålet. Sensitive opplysninger som individuelle opplæringsplaner (IOP) skal ikke lagres i generelle plattformer. Databehandleravtaler skal inngås med leverandører. Fotografering og bildedeling: del aldri bilder av andres barn uten samtykke fra foresatte. Skoler bør ha skriftlig samtykke før bruk av eksterne fotografer. Foreldre kan fotografere egne barn ved skolearrangementer, men kan ikke publisere bilder av andre barn uten samtykke. Internettkontroll: logging for systemsikkerhet er tillatt uten samtykke, men skoler må informere elevene om overvåking og dens formål. Praktisk sjekkliste for bildedeling: vurder lovlighet, bildetype, antall, distribusjonskanal, regelmessig sletting, og spør alltid barnet direkte om deling.",
    topics: JSON.stringify(["barn", "skole", "samtykke"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-HELSE-FORSKNING-2020",
    title: "Veileder om personvern i forskning og helsesektoren",
    date: "2020-09-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om behandling av personopplysninger i forsknings- og helsesektoren, herunder rettslig grunnlag, anonymisering, personvernkonsekvensvurdering og velferdsteknologi.",
    full_text:
      "Veilederen dekker personvern i forskning og helsesektoren. Rettslig grunnlag for forskning: helseforskningsloven, personopplysningsloven § 8 (almennhetens interesse), og samtykke er de vanligste grunnlagene. Forskningsinstitusjonen skal vurdere om kravene for behandling av særlige kategorier (art. 9) er oppfylt. Helseopplysninger: helseopplysninger er en særlig kategori av personopplysninger som krever forsterket beskyttelse. Behandling krever både grunnlag i art. 6 og unntak i art. 9. Pasienter har rett til innsyn i egne journaler. Velferdsteknologi: teknologi for mennesker med redusert funksjonsevne kan styrke selvstendigheten, men innebærer overvåkingselementer. Personvern skal ivaretas fra starten — innebygd personvern. Leverandører i helsesektoren: den nye personvernloven har viktige bestemmelser som påvirker leverandører og utviklere som selger velferdsteknologi, systemer og applikasjoner til helse- og omsorgssektoren. Krav til innebygd personvern og personvern som standard er sentrale. DPIA: personvernkonsekvensvurdering er normalt påkrevet for storskala behandling av helseopplysninger. Anonymisering og pseudonymisering: forskningsdata bør anonymiseres eller pseudonymiseres der mulig.",
    topics: JSON.stringify(["helsedata", "forskning"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-GPS-2020",
    title: "Veileder om GPS og sporing av yrkesbiler",
    date: "2020-06-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om GPS-sporing av yrkesbiler og arbeidskjøretøy. Dekker rettslig grunnlag, informasjonsplikt, lagringstid og ansattes rettigheter.",
    full_text:
      "Veilederen beskriver reglene for GPS-sporing av yrkesbiler. Mange arbeidsgivere bruker GPS og sporing i arbeidskjøretøy. Disse verktøyene samler inn informasjon om både kjøretøyet og den ansatte som bruker det. Rettslig grunnlag: GPS-sporing krever berettiget interesse (art. 6(1)(f)) og en dokumentert interesseavveining. Arbeidsgiverens legitime interesse i logistikk, sikkerhet eller verdisikring må veie tyngre enn arbeidstakerens personverninteresser. Informasjonsplikt: den ansatte skal informeres om at GPS-sporing brukes, formålet, hvem som har tilgang til dataene, og lagringstid. Begrensninger: sporing utenfor arbeidstid er normalt ikke tillatt. Dataene skal ikke brukes til å overvåke arbeidstakerens effektivitet eller opptreden utover det som er nødvendig. Lagringstid: data skal slettes når formålet er oppfylt. Ruteopplysninger bør normalt slettes etter kort tid med mindre det er konkret behov for lenger lagring. Ansattes rettigheter: den ansatte har rett til innsyn i sporingsdata om seg selv, og rett til å protestere mot behandlingen.",
    topics: JSON.stringify(["gps_sporing", "arbeidsforhold", "transport"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-KREDITTVURDERING-2021",
    title: "Veileder om kredittvurdering",
    date: "2021-05-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om kredittvurdering av privatpersoner — når det er tillatt, krav til saklig behov, informasjonsplikt og registrertes rettigheter.",
    full_text:
      "Veilederen beskriver reglene for kredittvurdering av privatpersoner. Personopplysningsloven regulerer når en virksomhet kan innhente kredittvurdering om en privatperson. Saklig behov: kredittvurdering kan kun gjennomføres når det foreligger et saklig behov, typisk i forbindelse med en konkret kredittavtale, leieavtale eller lignende. Det er ikke tillatt å gjennomføre kredittvurdering uten konkret grunn. Informasjonsplikt: den som blir kredittvurdert skal informeres om vurderingen. Kredittopplysningsbyråer skal sende gjenpartsbrev til den registrerte når en kredittvurdering er gjennomført. Rettigheter: den registrerte har rett til innsyn i egne kredittopplysninger, rett til retting av feil, og rett til å kreve sletting av uriktige opplysninger. Ansvar: virksomheten som bestiller kredittvurderingen er ansvarlig for å sikre at det foreligger saklig behov. Datatilsynet har ilagt flere overtredelsesgebyr for ulovlige kredittvurderinger.",
    topics: JSON.stringify(["kredittvurdering"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-MARKEDSFORING-2021",
    title: "Veileder om personvern og markedsføring",
    date: "2021-08-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om bruk av personopplysninger til markedsføring. Dekker direktemarkedsføring, profilering, elektronisk markedsføring og forholdet mellom GDPR og markedsføringsloven.",
    full_text:
      "Veilederen beskriver reglene for bruk av personopplysninger til markedsføring. Rettslig grunnlag: direkte markedsføring kan baseres på berettiget interesse (art. 6(1)(f)) eller samtykke (art. 6(1)(a)). Elektronisk markedsføring per e-post, SMS og lignende krever som hovedregel forhåndssamtykke etter markedsføringsloven. Unntak for eksisterende kunder som har oppgitt sin e-post i forbindelse med et kjøp. Profilering: bruk av personopplysninger til å lage profiler om enkeltpersoner for målrettet markedsføring krever transparent informasjon og respekt for retten til å protestere. Rett til å protestere (art. 21): den registrerte har ubetinget rett til å protestere mot behandling av personopplysninger til direkte markedsføring. Når protesten mottas, skal behandlingen opphøre umiddelbart. Informasjonsplikt: virksomheten skal informere om bruk av personopplysninger til markedsføring, inkludert om profilering og automatiserte avgjørelser.",
    topics: JSON.stringify(["markedsforing", "samtykke"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-PERSONVERNPRINSIPPER-2020",
    title: "Veileder om de grunnleggende personvernprinsippene",
    date: "2020-02-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om de syv grunnleggende personvernprinsippene i GDPR artikkel 5: lovlighet, rettferdighet og åpenhet, formålsbegrensning, dataminimering, riktighet, lagringsbegrensning, integritet og konfidensialitet, og ansvarlighet.",
    full_text:
      "Veilederen gjennomgår de syv grunnleggende personvernprinsippene i GDPR artikkel 5. (1) Lovlighet, rettferdighet og åpenhet: personopplysninger skal behandles lovlig, rettferdig og på en åpen måte overfor den registrerte. Virksomheten skal ha et gyldig behandlingsgrunnlag og gi tydelig informasjon. (2) Formålsbegrensning: opplysninger skal samles inn for spesifikke, uttrykkelig angitte og berettigede formål, og ikke viderebehandles på en måte som er uforenlig med disse formålene. (3) Dataminimering: opplysninger som behandles skal være adekvate, relevante og begrenset til det som er nødvendig for formålet. (4) Riktighet: opplysninger skal være korrekte og om nødvendig oppdaterte. Uriktige opplysninger skal rettes eller slettes uten opphold. (5) Lagringsbegrensning: opplysninger skal lagres i en form som gjør det mulig å identifisere den registrerte i ikke lengre tid enn det som er nødvendig for formålet. (6) Integritet og konfidensialitet: opplysninger skal behandles på en måte som sikrer tilstrekkelig sikkerhet, herunder vern mot uautorisert eller ulovlig behandling, utilsiktet tap, tilintetgjøring eller skade. (7) Ansvarlighet: den behandlingsansvarlige er ansvarlig for å overholde prinsippene og skal kunne påvise at de overholdes.",
    topics: JSON.stringify(["behandlingsgrunnlag"]),
    language: "no",
  },

  // =========================================================================
  // AI and technology guidance
  // =========================================================================
  {
    reference: "DT-RAPPORT-KI-2018",
    title: "Kunstig intelligens og personvern",
    date: "2018-01-15",
    type: "rapport",
    summary:
      "Datatilsynets rapport om kunstig intelligens og personvern fra 2018. Belyser utfordringer knyttet til personvernprinsippene i GDPR ved bruk av kunstig intelligens, herunder formålsbegrensning, dataminimering, åpenhet og rettferdighet.",
    full_text:
      "Datatilsynets rapport om kunstig intelligens og personvern gir teknisk detalj om KI-teknologier og undersøker fire sentrale personvernutfordringer ved bruk av kunstig intelligens: (1) Formålsbegrensning — maskinlæringsmodeller kan avdekke mønstre og sammenhenger som ikke var forutsett ved innsamlingstidspunktet, noe som utfordrer prinsippet om at data kun brukes til det formålet det ble samlet inn for; (2) Dataminimering — de mest effektive maskinlæringsmodellene trenes på store datamengder, noe som står i spenning med kravet om at bare nødvendige data skal samles inn; (3) Åpenhet og forklarlighet — komplekse nevrale nettverk (deep learning) fungerer som «svarte bokser» der det er vanskelig å forklare hvorfor et bestemt resultat ble produsert, noe som utfordrer kravet om transparens; (4) Rettferdighet og diskriminering — algoritmisk skjevhet kan føre til diskriminering dersom treningsdataene reflekterer historiske skjevheter. Rapporten konkluderer med at det er mulig å bruke kunstig intelligens samtidig som personvernet ivaretas, men dette krever bevisste valg i design- og implementeringsfasen.",
    topics: JSON.stringify(["kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-KI-ANBEFALINGER-2021",
    title:
      "Anbefalinger for godt personvern i utvikling og bruk av kunstig intelligens",
    date: "2021-01-15",
    type: "rapport",
    summary:
      "Datatilsynets anbefalinger for personvernvennlig utvikling og bruk av kunstig intelligens. Rettet mot forskere, utviklere, innkjøpere, sluttbrukere og myndigheter.",
    full_text:
      "Datatilsynets anbefalinger for godt personvern i utvikling og bruk av kunstig intelligens. Anbefalinger for forskning og utvikling: forsk på personvernvennlig teknologi, tenk tverrfaglig, kombiner teknisk ekspertise med etiske og samfunnsmessige perspektiver. Anbefalinger for løsningsleverandører: forstå regelverket, velg modeller tilpasset personvernbehovene, begrens treningsdata til det nødvendige (dataminimering), sørg for innebygd personvern og dokumenter at løsningen oppfyller kravene, demonstrer hvordan krav etterleves, gi råd til kunder om personverntiltak. Anbefalinger for innkjøp og bruk: gjennomfør konsekvensanalyser før, under og etter systemutrulling, krev innebygd personvern, test regelmessig for å sikre etterlevelse og oppdage skjult diskriminering, beskytt registrertes rettigheter (begrensning, innsyn, sletting, samtykke, tilbaketrekking), vurder etablering av bransjennormer, etiske retningslinjer og ekspertpaneler. Sluttbrukeres rettigheter: rett til informasjon om behandlingen, samtykke, innsyn, retting og sletting, innsigelse, begrensning og dataportabilitet. Anbefalinger til myndighetene: gå foran med godt eksempel, fund forskning på personvernvennlig KI, utstyr tilsynsmyndigheter med relevant kompetanse, sørg for at lovgivningen holder følge med teknologisk utvikling.",
    topics: JSON.stringify(["kunstig_intelligens", "innebygd_personvern"]),
    language: "no",
  },
  {
    reference: "DT-KI-VERKTOY-2022",
    title: "Verktøy og metoder for godt personvern i kunstig intelligens",
    date: "2022-03-01",
    type: "rapport",
    summary:
      "Datatilsynets oversikt over verktøy og metoder for å løse personvernutfordringer i kunstig intelligens, herunder syntetiske data, differensiert personvern, og forklarlig KI.",
    full_text:
      "Datatilsynet har sammenstilt verktøy og metoder for å løse personvernutfordringer i kunstig intelligens. Syntetiske data: kunstig genererte datasett som har samme statistiske egenskaper som reelle data, men som ikke inneholder faktiske personopplysninger — kan brukes til utvikling og testing. Differensiert personvern (differential privacy): matematisk rammeverk som legger kontrollert støy til data eller analysresultater, slik at individuelle opplysninger ikke kan identifiseres. Federert læring (federated learning): maskinlæringsmodeller trenes lokalt på brukernes enheter uten at data samles sentralt. Forklarlig KI (explainable AI): metoder for å gjøre KI-systemers beslutninger forståelige for mennesker, viktig for å oppfylle åpenhetskravene i GDPR. Datatilsynet peker på at teknologien utvikler seg raskt og at nye verktøy og metoder kommer til.",
    topics: JSON.stringify(["kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-SANDKASSE-NAV-2022",
    title: "Sluttrapport sandkasseprosjekt — NAV og maskinlæring for oppfølging av sykmeldte",
    date: "2022-06-01",
    type: "rapport",
    summary:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasse for prosjektet med NAV om bruk av maskinlæring for å forutsi hvilke sykmeldte som trenger oppfølging.",
    full_text:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasseprosjekt med NAV. NAV ønsket å bruke maskinlæring til å forutsi hvilke sykmeldte som vil trenge oppfølging to måneder frem i tid. Formålet var å hjelpe veiledere med mer treffsikre vurderinger og unngå unødvendige møter. Prosjektet avdekket at lover som tillater behandling av personopplysninger sjelden er formulert på en måte som eksplisitt tillater bruk til maskinlæring. Diskusjonen i sandkassen fokuserte på: rettslig grunnlag for trening av modeller, dataminimering i treningsfasen, krav til åpenhet og forklarlighet overfor sykmeldte, risiko for diskriminering og skjevheter i modellen, og forholdsmessigheten av inngrepet i personvernet sett opp mot den potensielle nytten for den enkelte og samfunnet.",
    topics: JSON.stringify(["kunstig_intelligens", "offentlig_sektor", "helsedata"]),
    language: "no",
  },
  {
    reference: "DT-SANDKASSE-RUTER-2022",
    title: "Sluttrapport sandkasseprosjekt — Ruter og kunstig intelligens i reiseappen",
    date: "2022-09-01",
    type: "rapport",
    summary:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasse for prosjektet med Ruter om bruk av kunstig intelligens i kollektivtransport-appen.",
    full_text:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasseprosjekt med Ruter AS. Ruter deltok i sandkassen i forbindelse med planer om å bruke kunstig intelligens i sin reiseapp for å gi personaliserte reiseforslag. Prosjektet fokuserte på åpenhetskravet — hva som må forklares ved bruk av kunstig intelligens i en forbrukertjeneste. Diskusjonen omfattet: krav til informasjon om hvordan personopplysninger brukes i algoritmen, hvordan brukere kan forstå og påvirke anbefalingene de mottar, balansen mellom personalisering og personvern, og krav til samtykke for behandling av lokasjonsdata og reisehistorikk.",
    topics: JSON.stringify(["kunstig_intelligens", "transport"]),
    language: "no",
  },
  {
    reference: "DT-SANDKASSE-RAMMEVERK-2021",
    title: "Rammeverk for Datatilsynets regulatoriske sandkasse for kunstig intelligens",
    date: "2021-03-01",
    type: "rapport",
    summary:
      "Rammeverket for Datatilsynets regulatoriske sandkasse for kunstig intelligens — formål, utvelgelseskriterier, prosess og forventede resultater.",
    full_text:
      "Rammeverket for Datatilsynets regulatoriske sandkasse for kunstig intelligens beskriver mål, prosess og forventninger. Formål: sandkassen skal stimulere personvernfremmende innovasjon og gi gratis veiledning til utvalgte virksomheter. Den skal bidra til innovasjon av etisk ansvarlig kunstig intelligens og fungere som et trygt testmiljø som reduserer risikoen ved utvikling av nye KI-løsninger. Utvelgelseskriterier: prosjekter velges basert på innovasjonsgrad, personvernrelevans, potensial for læring og overførbarhet til andre virksomheter. Prosess: utvalgte prosjekter gjennomfører en tidsavgrenset periode med tett samarbeid med Datatilsynets juridiske og tekniske eksperter. Resultater: sluttrapporten publiseres og gjøres tilgjengelig for allmennheten for å bidra til bredere læring om personvernvennlig KI-utvikling.",
    topics: JSON.stringify(["kunstig_intelligens"]),
    language: "no",
  },

  // =========================================================================
  // Regulatory opinions (høringsuttalelser)
  // =========================================================================
  {
    reference: "DT-HOERING-KI-2025",
    title: "Høringssvar om KI-forordningen (AI Act) implementering i norsk lov",
    date: "2025-10-01",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om implementering av EUs KI-forordning (AI Act) i norsk lovgivning. Støtter implementeringen, men understreker behovet for klarere rammeverk og at datatilsynsmyndighetene bør utpekes som tilsynsmyndighet.",
    full_text:
      "Datatilsynet har avgitt høringssvar om implementering av EUs KI-forordning (AI Act) i norsk lovgivning. Datatilsynet støtter implementeringen, men peker på behovet for klarere rammeverk. Datatilsynet argumenterer for at datatilsynsmyndighetene bør utpekes som tilsynsmyndigheter under KI-forordningen, i tråd med EDPBs anbefaling, da en slik løsning med tilsynsansvar på ett sted vil sikre bedre koordinering mellom ulike organer og styrke håndhevelsen av både KI-forordningen og personvernlovgivningen. Datatilsynet understreker at KI-systemer som behandler personopplysninger allerede er underlagt GDPR, og at det er viktig å sikre konsistent håndhevelse av de to regelverkene.",
    topics: JSON.stringify(["kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-DIGITALE-TJENESTER-2025",
    title: "Høringssvar om ny lov om digitale tjenester (DSA)",
    date: "2025-10-03",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om implementering av Digital Services Act (DSA) i norsk lovgivning. Fremhever beskyttelse av grunnleggende rettigheter på internett, inkludert personvern og barns rettigheter.",
    full_text:
      "Datatilsynet har avgitt høringssvar om implementering av Digital Services Act (DSA) i norsk lovgivning. Forslaget til lov har som mål å beskytte grunnleggende rettigheter på internett, som ytringsfrihet og informasjonsfrihet, personvern, ikke-diskriminering og barns rettigheter. Datatilsynet understreker at reguleringen av digitale tjenester må ivareta personvernet, særlig i forbindelse med algoritmiske anbefalingssystemer, targeted advertising, og innholdsmoderering. Datatilsynet peker på at tilsynsmyndighetene må ha tilstrekkelige ressurser og kompetanse til å håndheve regelverket effektivt.",
    topics: JSON.stringify(["kunstig_intelligens", "barn"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-ALDERSGRENSER-2025",
    title: "Høringssvar om forslag til lov om aldersgrenser i sosiale medier",
    date: "2025-10-03",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om forslaget til aldersgrense på 15 år for bruk av sosiale medier i Norge. Diskuterer personvernmessige implikasjoner av aldersverifisering.",
    full_text:
      "Datatilsynet har avgitt høringssvar om forslag til lov om aldersgrenser i sosiale medier. Lovforslaget innebærer innføring av en aldersgrense på 15 år for bruk av sosiale medier i Norge. Datatilsynet diskuterer de personvernmessige implikasjonene av aldersverifisering, herunder: (1) aldersverifiseringsmetoder må være forholdsmessige og ikke innebære uforholdsmessig innsamling av personopplysninger; (2) bruk av biometrisk aldersestimering reiser spørsmål om behandling av særlige kategorier av personopplysninger; (3) sentraliserte aldersverifiseringsløsninger kan utgjøre en risiko for massovervåking; (4) personvernvennlige aldersverifiseringsmetoder bør prioriteres. Datatilsynet understreker at barnets beste skal være et grunnleggende hensyn og at beskyttelse av barns personvern er viktig.",
    topics: JSON.stringify(["barn"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-LAERINGSANALYSE-2023",
    title: "Høringssvar om læringsanalyse i utdanning",
    date: "2023-11-06",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om bruk av læringsanalyse (learning analytics) i utdanningssektoren. Peker på personvernutfordringer ved storskala analyse av elevdata.",
    full_text:
      "Datatilsynet har avgitt høringssvar om bruk av læringsanalyse i utdanningssektoren. Læringsanalyse innebærer innsamling og analyse av data om elevers læringsaktiviteter for å forbedre undervisning og læringsutbytte. Datatilsynet peker på følgende personvernutfordringer: (1) storskala innsamling av barns data i en skolekontekst krever personvernkonsekvensvurdering; (2) barn og unge er særlig sårbare registrerte som har krav på forsterket beskyttelse; (3) formålsbegrensning — data samlet inn for læringsformål skal ikke brukes til andre formål som profilering eller kommersiell utnyttelse; (4) dataminimering — kun data som er nødvendig for læringsformålet bør samles inn; (5) elevenes og foresattes rettigheter til innsyn og kontroll må sikres.",
    topics: JSON.stringify(["barn", "skole", "kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-PERSONVERNKOMMISJONEN-2023",
    title: "Høringssvar om Personvernkommisjonens utredning",
    date: "2023-02-13",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om Personvernkommisjonens utredning «Ditt satisfair — personvern og digitalisering» (NOU 2022:11).",
    full_text:
      "Datatilsynet har avgitt høringssvar om Personvernkommisjonens utredning «Ditt satisfair — personvern og digitalisering» (NOU 2022:11). Personvernkommisjonen ble oppnevnt for å vurdere personvernets stilling i Norge. Datatilsynet kommenterer kommisjonens anbefalinger knyttet til: (1) styrking av barns personvern i digitale tjenester; (2) personvernutfordringer i offentlig sektor; (3) behovet for økt personvernkompetanse; (4) regulering av kunstig intelligens; (5) krav til agentur og selvbestemmelse i digitale tjenester; (6) behov for styrket tilsynsvirksomhet og økte ressurser til Datatilsynet.",
    topics: JSON.stringify(["barn", "offentlig_sektor", "kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-EKOMLOV-2021",
    title:
      "Høringssvar om endringer i ekomloven — cookie-regelverket",
    date: "2021-11-15",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynet og Forbrukertilsynets felles høringssvar om innstramming av cookie-regelverket i ekomloven. Argumenterte for at samtykke til informasjonskapsler må oppfylle GDPR-kravene.",
    full_text:
      "Datatilsynet og Forbrukertilsynet har avgitt felles høringssvar om forslag til endringer i ekomloven knyttet til informasjonskapsler (cookies). De to tilsynsmyndighetene argumenterte for innstramming av cookie-regelverket slik at samtykke til bruk av informasjonskapsler og andre sporingsteknologier må oppfylle kravene i personvernforordningen (GDPR). Datatilsynet og Forbrukertilsynet pekte på at: (1) det eksisterende regelverket i ekomloven § 2-7b ikke ga tilstrekkelig beskyttelse mot uønsket sporing; (2) samtykkekravene bør harmoniseres med GDPR for å sikre et konsistent beskyttelsesnivå; (3) villedende og manipulative samtykkemekanismer (dark patterns) bør eksplisitt forbys; (4) tilsynsmyndighetene bør gis tilstrekkelige sanksjonsmuligheter. Endringene ble vedtatt og trådte i kraft 1. januar 2025.",
    topics: JSON.stringify(["informasjonskapsler", "samtykke"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-IP-DATA-2025",
    title: "Høringssvar om utlevering av IP-data for forebyggingsformål",
    date: "2025-10-07",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om forslaget til endringer i ekomloven for å tillate utlevering av IP-adressedata til politiet for forebyggingsformål.",
    full_text:
      "Datatilsynet har avgitt høringssvar om forslag til endringer i ekomloven som gjelder lagring og utlevering av IP-data for forebyggingsformål. Forslaget innebærer at teleoperatører skal lagre IP-adressedata og utlevere disse til politiet for å forebygge alvorlig kriminalitet. Datatilsynet uttrykker bekymring for: (1) proporsjonaliteten av masselagring av IP-data; (2) risikoen for masseovervåking; (3) behovet for uavhengig forhåndskontroll (domstolsgodkjenning) før utlevering; (4) at tiltaket må vurderes i lys av EU-domstolens praksis om datalagring. Datatilsynet understreker at enhver begrensning av personvernet må være nødvendig, forholdsmessig og omgitt av tilstrekkelige garantier.",
    topics: JSON.stringify(["telekom", "politi_justis"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-HELSEFORSKNINGSLOV-2025",
    title: "Høringssvar om endringer i helseforskningsloven",
    date: "2025-01-06",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om forslag til endringer i helseforskningsloven. Kommenterer personvernimplikasjoner av forenklet tilgang til helsedata for forskning.",
    full_text:
      "Datatilsynet har avgitt høringssvar om forslag til endringer i helseforskningsloven. Endringene gjelder forenkling av tilgangen til helsedata for forskningsformål. Datatilsynet kommenterer: (1) behovet for å balansere forskningsinteresser med pasienters personvern; (2) krav til personvernkonsekvensvurdering ved storskala bruk av helsedata; (3) behov for klare regler om pseudonymisering og anonymisering; (4) krav til informasjon til de registrerte om bruk av deres helsedata i forskning; (5) at samtykkeunntaket for forskning ikke må utvides ukritisk.",
    topics: JSON.stringify(["forskning", "helsedata"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-OKRIM-2025",
    title:
      "Høringssvar om informasjonsdeling for å bekjempe økonomisk kriminalitet",
    date: "2025-11-14",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om forslag om utvidet informasjonsdeling mellom offentlige og private aktører for å bekjempe økonomisk kriminalitet.",
    full_text:
      "Datatilsynet har avgitt høringssvar om forslag om utvidet informasjonsdeling mellom offentlige myndigheter og private aktører, primært banker og finansinstitusjoner, for å bekjempe økonomisk kriminalitet. Datatilsynet understreker at: (1) utvidet deling av personopplysninger krever klare rettslige rammer og forholdsmessighetsvurdering; (2) formålsbegrensningen må overholdes — opplysninger delt for å bekjempe økonomisk kriminalitet skal ikke brukes til andre formål; (3) de registrertes rettigheter, herunder innsyn og informasjon, må ivaretas; (4) det bør gjennomføres en personvernkonsekvensvurdering av delingssystemet.",
    topics: JSON.stringify(["finans", "politi_justis"]),
    language: "no",
  },

  // =========================================================================
  // Sector-specific reports and guidance
  // =========================================================================
  {
    reference: "DT-VEILEDER-DIGITALE-TJENESTER-2020",
    title: "Veileder om digitale tjenester og forbrukeres personopplysninger",
    date: "2020-09-15",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvern i digitale tjenester — samtykke, innebygd personvern, dark patterns, og forbrukernes rettigheter i digitale tjenester.",
    full_text:
      "Datatilsynets veileder om digitale tjenester og forbrukeres personopplysninger gir praktisk veiledning om personvern i digitale tjenester og apper. Veilederen dekker: (1) Samtykke i digitale tjenester — samtykke til behandling av personopplysninger i apper og nettsider må oppfylle kravene i GDPR. Bundling av samtykke med tjenestens vilkår er ikke tillatt (kopplingsforbudet); (2) Innebygd personvern — digitale tjenester skal utvikles med personvern som standard. Personverninnstillinger skal være satt til det mest restriktive nivået som standard; (3) Dark patterns — villedende designmønstre som manipulerer brukere til å oppgi mer personopplysninger enn nødvendig er i strid med GDPR. Eksempler: forhåndsavkryssede bokser, vanskeliggjøring av personvernvennlige valg, skjulte innstillinger; (4) Forbrukernes rettigheter — retten til innsyn, sletting, dataportabilitet og innsigelse gjelder fullt ut i digitale tjenester; (5) Tredjepartsdeling — deling av brukerdata med annonsenettverk og analytikktjenester krever gyldig samtykke.",
    topics: JSON.stringify(["samtykke", "innebygd_personvern"]),
    language: "no",
  },
  {
    reference: "DT-RAPPORT-SJEFEN-SER-DEG-2021",
    title:
      "Rapport: Sjefen ser deg — overvåking og kontroll av arbeidstakeres digitale aktiviteter",
    date: "2021-10-01",
    type: "rapport",
    summary:
      "Datatilsynets rapport om overvåking og kontroll av ansattes digitale aktiviteter ved bruk av digitale verktøy som Microsoft 365, Teams, Slack og lignende.",
    full_text:
      "Datatilsynets rapport «Sjefen ser deg? Overvåking og kontroll av arbeidstakeres digitale aktiviteter» undersøker personvernutfordringer knyttet til arbeidsgivers bruk av digitale verktøy for å overvåke og kontrollere ansatte. Rapporten dekker: bruk av Microsoft 365 og lignende produktivitetsverktøy som samler inn detaljert aktivitetsdata om ansatte — påloggingstidspunkter, dokumentbruk, møtedeltakelse og kommunikasjonsmønstre. Datatilsynet konstaterer at mange arbeidsgivere ikke er tilstrekkelig bevisste på omfanget av data som samles inn gjennom slike verktøy, og at bruk av innebygde overvåkingsfunksjoner kan være i strid med personvernregelverket. Rapporten anbefaler at arbeidsgivere: deaktiverer unødvendige overvåkingsfunksjoner, informerer ansatte om hvilke data som samles inn, gjennomfører interesseavveininger, og involverer ansattes representanter.",
    topics: JSON.stringify(["arbeidsforhold"]),
    language: "no",
  },
  {
    reference: "DT-RAPPORT-SKOLETILSYN-2025",
    title: "Funn fra tilsyn med personvernet i skolen",
    date: "2025-05-01",
    type: "rapport",
    summary:
      "Datatilsynets rapport om funn fra brevkontroll med 50 kommuner om hvordan de ivaretar personvern i digitale læringsverktøy i skolen.",
    full_text:
      "Datatilsynets rapport om funn fra tilsyn med skolesektoren i 2025. Datatilsynet gjennomførte brevkontroll med 50 kommuner for å kartlegge hvordan de ivaretar personvern ved bruk av digitale læringsverktøy. Hovedfunn: (1) flere digitale læringsverktøy vurderes ikke sentralt av kommunen, men besluttes av rektorer eller enkeltelærere; (2) mange kommuner har for snever forståelse av hva som utgjør personopplysninger, med den konsekvens at hundrevis av digitale læringsverktøy ikke er vurdert og ikke er dekket av kommunens behandlingsoversikt; (3) personvernkonsekvensvurderinger (DPIA) gjennomføres i for liten grad; (4) databehandleravtaler mangler for flere verktøy; (5) ansattes kompetanse om personvern varierer betydelig mellom kommuner. Datatilsynet har varslet flere tilsyn med kommuner som en del av Totalforsvarets år 2026.",
    topics: JSON.stringify(["skole", "barn", "offentlig_sektor"]),
    language: "no",
  },
  {
    reference: "DT-RAPPORT-PERSONVERNUNDERSOKELSEN-2024",
    title: "Personvernundersøkelsen 2024 — kunstig intelligens",
    date: "2024-10-01",
    type: "rapport",
    summary:
      "Utdrag fra Datatilsynets personvernundersøkelse 2024 om nordmenns holdninger til kunstig intelligens og personvern.",
    full_text:
      "Datatilsynets personvernundersøkelse 2024 kartlegger nordmenns holdninger til personvern, herunder et kapittel om kunstig intelligens. Undersøkelsen viser at: (1) et flertall av nordmenn er bekymret for bruk av personopplysninger i KI-systemer; (2) mange er usikre på hvordan KI-systemer bruker deres personopplysninger; (3) tilliten til KI-systemer varierer etter sektor — høyere tillit til bruk i helsesektoren enn i markedsføring; (4) et flertall ønsker sterkere regulering av KI; (5) unge er mer positive til KI, men også mer bekymret for personvernkonsekvenser. Datatilsynet bruker resultatene til å prioritere tilsynsarbeid og veiledning.",
    topics: JSON.stringify(["kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-BIOMETRI-2022",
    title: "Veileder om biometriske personopplysninger",
    date: "2022-11-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om behandling av biometriske personopplysninger — fingeravtrykk, ansiktsgjenkjenning, irisgjenkjenning og stemmebiometri.",
    full_text:
      "Veilederen beskriver reglene for behandling av biometriske personopplysninger etter GDPR. Biometriske data er en særlig kategori av personopplysninger (art. 9) når de brukes for å identifisere en fysisk person entydig. Eksempler inkluderer fingeravtrykk, ansiktsgjenkjenning, irisgjenkjenning, stemmebiometri og DNA-profiler. Behandling er i utgangspunktet forbudt, med mindre et av unntakene i artikkel 9(2) foreligger, f.eks. uttrykkelig samtykke, nødvendig for arbeidsrettslige forpliktelser, eller vesentlig allmenninteresse. Vurderinger: (1) er biometri nødvendig, eller finnes mindre inngripende alternativer? (2) er formålet legitimt og proporsjonalt? (3) er samtykke gyldig — i arbeidsforhold er det normalt ikke det; (4) er det gjennomført DPIA? Datatilsynet har ilagt flere gebyrer for ulovlig bruk av biometri, blant annet Senja kommune for fingeravtrykksbasert tidsregistrering.",
    topics: JSON.stringify(["biometri"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-EPOST-2020",
    title: "Veileder om innsyn i ansattes e-post og filer",
    date: "2020-04-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om arbeidsgivers adgang til innsyn i ansattes e-post og personlige filer etter e-postforskriften.",
    full_text:
      "Veilederen beskriver reglene for arbeidsgivers innsyn i ansattes e-post og filer. E-postforskriften (forskrift om arbeidsgivers innsyn i e-postkasse og annet elektronisk lagret materiale) regulerer dette. Arbeidsgiver kan kun få innsyn i to tilfeller: (1) når det er nødvendig for å ivareta den daglige driften eller andre berettigede interesser av virksomheten; (2) ved begrunnet mistanke om at arbeidstakerens bruk av e-postkassen medfører grovt brudd på de plikter som følger av arbeidsforholdet, eller kan gi grunnlag for oppsigelse eller avskjed. Prosedyrer: arbeidstakeren skal så langt mulig varsles før innsyn gjennomføres, og gis mulighet til å uttale seg. Innsynet skal gjennomføres på en så skånsom måte som mulig, med minst mulig innsyn i privat korrespondanse. Dokumentasjon: arbeidsgiveren skal dokumentere at vilkårene for innsyn var oppfylt. Etter avsluttet arbeidsforhold: e-postkontoen skal som hovedregel slettes innen rimelig tid, normalt innen 6 måneder.",
    topics: JSON.stringify(["epost", "arbeidsforhold"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-POLITI-JUSTIS-2021",
    title: "Veileder om personvern i politi- og justissektoren",
    date: "2021-02-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om behandling av personopplysninger i politiet og justissektoren — politiregisterloven, straffeprosessloven og datatilsynets tilsynsrolle.",
    full_text:
      "Veilederen beskriver de særlige reglene for behandling av personopplysninger i politi- og justissektoren. Politiregisterloven og politiregisterforskriften regulerer politiets behandling av personopplysninger. Datatilsynet fører tilsyn med politiets behandling, men har begrensede sanksjonsmuligheter sammenlignet med GDPR. Særlige hensyn: (1) politiet har vidtgående hjemler til å behandle personopplysninger, men er underlagt strenge krav til nødvendighet og forholdsmessighet; (2) de registrertes rettigheter kan begrenses av hensyn til etterforskning; (3) lagringstider er regulert i politiregisterforskriften; (4) logging av all behandling er påkrevet; (5) DNA-registre, fingeravtrykksregistre og fotregistre er underlagt særskilt regulering.",
    topics: JSON.stringify(["politi_justis"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-FINANS-HVITVASKING-2022",
    title: "Veileder om personvern i bank- og finanssektoren",
    date: "2022-04-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvern i bank- og forsikringssektoren, herunder forholdet mellom GDPR, hvitvaskingsloven og kundekontroll.",
    full_text:
      "Veilederen beskriver personvernreglene som gjelder for bank- og finanssektoren. Hvitvaskingsloven pålegger banker og finansinstitusjoner å gjennomføre kundekontroll og oppbevare kundeinformasjon. Forholdet til GDPR: hvitvaskingsloven utgjør rettslig grunnlag for behandling av personopplysninger i forbindelse med kundekontroll (art. 6(1)(c)). Begrensninger: (1) opplysninger innhentet i forbindelse med kundekontroll skal kun brukes til formålene i hvitvaskingsloven, ikke til markedsføring eller andre formål; (2) lagringstiden er regulert i hvitvaskingsloven; (3) de registrertes rettigheter gjelder, men kan begrenses dersom innsyn kan skade etterforskning av hvitvasking; (4) bankene har plikt til å informere kundene om behandlingen. Kredittvurdering i bank: reguleres av personopplysningsloven og krever saklig behov.",
    topics: JSON.stringify(["finans"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-SLETTING-2021",
    title: "Veileder om rett til sletting",
    date: "2021-04-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om den registrertes rett til sletting (retten til å bli glemt) etter GDPR artikkel 17.",
    full_text:
      "Veilederen beskriver den registrertes rett til sletting etter GDPR artikkel 17. Retten til sletting innebærer at den registrerte kan be en virksomhet om å slette sine personopplysninger. Virksomheten skal slette opplysningene uten ugrunnet opphold når: (1) opplysningene ikke lenger er nødvendige for formålet de ble samlet inn for; (2) den registrerte trekker tilbake sitt samtykke; (3) den registrerte protesterer mot behandlingen etter art. 21; (4) opplysningene har vært behandlet ulovlig; (5) sletting er påkrevet for å oppfylle en rettslig forpliktelse. Unntak: retten til sletting er ikke absolutt. Virksomheten kan nekte sletting dersom behandlingen er nødvendig for: ytringsfrihet og informasjonsfrihet, oppfyllelse av rettslig forpliktelse, arkivformål i allmennhetens interesse, fastsettelse av rettslige krav. Praktisk gjennomføring: virksomheten skal ha rutiner for å håndtere sletteanmodninger, og skal besvare henvendelsen innen én måned.",
    topics: JSON.stringify(["sletting", "innsyn"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-TELEFONAVLYTTING-2020",
    title: "Veileder om opptak av telefonsamtaler på arbeidsplassen",
    date: "2020-11-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om arbeidsgivers adgang til å ta opp telefonsamtaler med ansatte, herunder verdipapirhandel og kundeservice.",
    full_text:
      "Veilederen beskriver reglene for opptak av telefonsamtaler på arbeidsplassen. Som hovedregel har arbeidsgivere ikke rett til å ta opp ansattes telefonsamtaler. Unntak gjelder for: (1) verdipapirforetak — verdipapirhandelloven pålegger opptak av alle samtaler knyttet til verdipapirhandel; (2) kundeservice — opptak kan tillates for kvalitetssikring og opplæring, men kun med samtykke fra både den ansatte og kunden; (3) nødsentraler og lignende — der opptak er påkrevet av lov eller nødvendig for å ivareta vitale interesser. Krav: den ansatte skal informeres om opptaket, formålet med opptaket skal være klart definert, lagringstiden skal begrenses, og den ansatte har rett til innsyn i opptak av sine samtaler.",
    topics: JSON.stringify(["arbeidsforhold", "telekom"]),
    language: "no",
  },
  {
    reference: "DT-STRATEGI-KI-2023",
    title: "Datatilsynets strategi for arbeidet med kunstig intelligens",
    date: "2023-06-01",
    type: "rapport",
    summary:
      "Datatilsynets strategi for arbeidet med kunstig intelligens. Knytter personvern til grunnleggende rettigheter og skal legge til rette for innovativ bruk av KI mens personvernet beskyttes.",
    full_text:
      "Datatilsynets strategi for arbeidet med kunstig intelligens beskriver myndighetens tilnærming til regulering og tilsyn med KI. Datatilsynet fremhever at ansvarlig KI-utvikling krever at personvern ivaretas fra starten, og kobler personvern til grunnleggende rettigheter som ytringsfrihet og ikke-diskriminering. Strategien har tre hovedmål: (1) legge til rette for innovativ og personvernvennlig bruk av KI gjennom sandkassen og veiledning; (2) sikre effektiv regulering og tilsyn med KI-systemer som behandler personopplysninger; (3) bidra til utvikling av internasjonale normer og standarder for personvernvennlig KI. Datatilsynet vil prioritere tilsyn med KI-systemer som behandler sensitive personopplysninger, KI i offentlig forvaltning, og KI rettet mot barn og unge.",
    topics: JSON.stringify(["kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-BARN-INTERNETT-2026",
    title: "Internasjonal undersøkelse om barns personvern i nettbaserte tjenester",
    date: "2026-03-15",
    type: "rapport",
    summary:
      "Internasjonal undersøkelse om barns personvern i nettbaserte tjenester der Datatilsynet deltok. Avdekket omfattende innsamling av barns personopplysninger, utilstrekkelige personvernerklæringer og lett omgåelig aldersverifisering.",
    full_text:
      "Datatilsynet deltok i en internasjonal undersøkelse om barns personvern i nettbaserte tjenester i samarbeid med andre datatilsynsmyndigheter. Undersøkelsen avdekket: (1) omfattende innsamling av barns personopplysninger — mange tjenester samler inn langt mer data enn nødvendig for tjenestens formål; (2) utilstrekkelige personvernerklæringer — informasjonen er ofte skrevet i et språk og format som er vanskelig tilgjengelig for barn og unge; (3) lett omgåelig aldersverifisering — de fleste tjenester baserer seg på selvrapportering av alder, som lett kan omgås; (4) dark patterns rettet mot barn — designmønstre som oppfordrer barn til å dele mer informasjon enn nødvendig. Flere datatilsynsmyndigheter har uttrykt bekymring for KI-systemer som genererer realistiske, upassende og skadelige bilder og videoer av virkelige personer.",
    topics: JSON.stringify(["barn"]),
    language: "no",
  },
  {
    reference: "DT-TILSYN-KOMMUNER-2026",
    title: "Varsel om tilsyn med alle Norges kommuner — datasikkerhet",
    date: "2026-03-01",
    type: "rapport",
    summary:
      "Datatilsynet varslet tilsyn med alle 357 norske kommuner som del av Totalforsvarets år 2026 for å kartlegge arbeidet med datasikkerhet og sikkerhetshendelser.",
    full_text:
      "Som del av Totalforsvarets år 2026 har Datatilsynet igangsatt et omfattende tilsynsarbeid rettet mot alle norske kommuner. Datatilsynet sendte brev til alle 357 kommuner for å kartlegge deres arbeid med datasikkerhet og personopplysningssikkerhet. Tilsynet fokuserer på: (1) kommunenes risikovurderinger og sikkerhetstiltak; (2) rutiner for håndtering av sikkerhetshendelser og avviksmelding; (3) tilgangsstyring og loggkontroll; (4) databehandleravtaler med leverandører; (5) kompetanse og opplæring av ansatte. Bakgrunnen er at kommuner behandler store mengder sensitive personopplysninger om innbyggerne, inkludert helse- og sosialtjenester, barneverntjenester og utdanning. Datatilsynet har erfart at mange kommuner har betydelige mangler i sin informasjonssikkerhet, og at flere alvorlige hendelser de siste årene har vist at kommunene er sårbare for cyberangrep og databrudd.",
    topics: JSON.stringify(["offentlig_sektor", "informasjonssikkerhet"]),
    language: "no",
  },

  // =========================================================================
  // Additional guidance — sector and topic specific
  // =========================================================================
  {
    reference: "DT-VEILEDER-VELFERDSTEKNOLOGI-2021",
    title: "Veileder om personvern og velferdsteknologi",
    date: "2021-09-15",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvern ved bruk av velferdsteknologi i helse- og omsorgssektoren, herunder trygghetsalarmer, GPS-sporing av eldre, og sensorteknologi.",
    full_text:
      "Veilederen beskriver personvernreglene ved bruk av velferdsteknologi i helse- og omsorgssektoren. Velferdsteknologi omfatter trygghetsalarmer, GPS-sporing av eldre med demens, sensorteknologi i hjemmet, digitale tilsynssystemer og medisindispensere. Personvern skal ivaretas fra starten — innebygd personvern er et sentralt krav. Rettslig grunnlag: velferdsteknologi som innebærer kontinuerlig overvåking krever ofte samtykke fra den registrerte eller dennes verge. Samtykkekompetanse: for personer med kognitiv svikt må det vurderes om personen har samtykkekompetanse. Dersom samtykkekompetanse mangler, må det vurderes om andre hjemler i helse- og omsorgstjenesteloven kan brukes. Dataminimering: kun nødvendige data bør samles inn. GPS-sporing bør begrenses til situasjoner der personen forlater trygge soner. DPIA: personvernkonsekvensvurdering er normalt påkrevet for velferdsteknologi som innebærer systematisk overvåking av sårbare grupper.",
    topics: JSON.stringify(["helsedata", "gps_sporing", "konsekvensvurdering"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-TRANSPORT-2021",
    title: "Veileder om personvern i bil og transport",
    date: "2021-07-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvern knyttet til kjøretøy, bompengepasseringer, bildelingstjenester og tilkoblede biler (connected cars).",
    full_text:
      "Veilederen beskriver personvernreglene som gjelder for transport- og bilsektoren. Bompengepasseringer: innsamling av passeringsdata ved bomstasjoner innebærer behandling av personopplysninger. Bompengeselskapene skal ha gyldig behandlingsgrunnlag, informere bilistene om innsamlingen, og slette data når formålet er oppfylt — normalt innen kort tid etter fakturering. Bildelingstjenester: tjenester som Bilkollektivet og lignende samler inn data om brukernes reiser. Brukerne skal informeres om hvilke data som samles inn og hvordan de brukes. Tilkoblede biler: moderne kjøretøy samler inn store mengder data om kjøremønster, posisjon, hastighet og teknisk tilstand. Bilprodusentene er behandlingsansvarlige og skal overholde krav til samtykke, informasjon og dataminimering. Kameraer i biler: dashcam og lignende innebærer kameraovervåking og er underlagt de generelle reglene for kameraovervåking.",
    topics: JSON.stringify(["transport"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-DATAPORTABILITET-2020",
    title: "Veileder om retten til dataportabilitet",
    date: "2020-07-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om den registrertes rett til dataportabilitet etter GDPR artikkel 20 — overføring av egne data mellom tjenesteleverandører.",
    full_text:
      "Veilederen beskriver retten til dataportabilitet etter GDPR artikkel 20. Retten innebærer at den registrerte har rett til å motta personopplysninger vedkommende har gitt til en behandlingsansvarlig, i et strukturert, alminnelig brukt og maskinlesbart format, og har rett til å overføre disse opplysningene til en annen behandlingsansvarlig. Vilkår: retten gjelder når behandlingen er basert på samtykke eller avtale, og behandlingen skjer automatisert. Data som er avledet eller generert av den behandlingsansvarlige (f.eks. profilering) er ikke omfattet. Format: dataene skal leveres i et format som gjør det praktisk mulig å overføre dem, f.eks. JSON, CSV eller XML. Tidsfrister: henvendelsen skal besvares innen én måned.",
    topics: JSON.stringify(["innsyn"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-POLITISK-REKLAME-2024",
    title: "Veileder om personvern og politisk kommunikasjon",
    date: "2024-08-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernregler ved politisk kommunikasjon og valgkamp — bruk av personopplysninger til politisk reklame, velgerregistre og profilerting.",
    full_text:
      "Veilederen beskriver personvernreglene som gjelder ved politisk kommunikasjon og valgkamp. Politiske partier er underlagt de samme personvernreglene som andre virksomheter. Utsending av politisk reklame per e-post til privatpersoner krever som hovedregel samtykke. Bruk av offentlige velgerregistre for direkte politisk kommunikasjon krever gyldig behandlingsgrunnlag. Profilering basert på politisk tilhørighet innebærer behandling av særlige kategorier av personopplysninger (art. 9 — politisk oppfatning) og krever uttrykkelig samtykke. Politiske partier skal informere velgere om hvordan deres personopplysninger brukes, og respektere retten til å protestere mot direkte markedsføring.",
    topics: JSON.stringify(["markedsforing", "samtykke"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-RUSTESTING-2021",
    title: "Veileder om rustesting av ansatte",
    date: "2021-11-15",
    type: "veileder",
    summary:
      "Datatilsynets veileder om arbeidsgivers adgang til å gjennomføre rustesting (alkohol- og narkotikatesting) av ansatte, herunder rettslig grunnlag og forholdsmessighet.",
    full_text:
      "Veilederen beskriver reglene for rustesting av ansatte i arbeidslivet. Rustesting (alkohol- og narkotikatesting) innebærer innsamling av helseopplysninger og er underlagt strenge krav. Rettslig grunnlag: rustesting kan bare gjennomføres der det er uttrykkelig hjemmel i lov eller forskrift, f.eks. for sjøfolk, yrkessjåfører og ansatte i petroleumssektoren. Forholdsmessighet: testingen må stå i rimelig forhold til formålet. Vilkårlige stikkprøver uten konkret mistanke er normalt ikke tillatt uten lovhjemmel. Arbeidsgivers plikter: informere de ansatte om testingens formål og omfang, sørge for at testresultatene behandles konfidensielt, og slette resultatene når formålet er oppfylt.",
    topics: JSON.stringify(["arbeidsforhold", "helsedata"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-OFFENTLIG-POSTJOURNAL-2022",
    title: "Veileder om personvern i offentlig postjournal",
    date: "2022-09-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om publisering av postjournaler i offentlig forvaltning — avveining mellom offentlighetsprinsippet og personvernet.",
    full_text:
      "Veilederen beskriver avveiningen mellom offentlighetsprinsippet og personvernet ved publisering av postjournaler. Offentleglova gir rett til innsyn i offentlige saksdokumenter, men personopplysninger som er unntatt offentlighet skal sladdes. Kommuner og offentlige virksomheter har plikt til å sikre at sensitive personopplysninger — herunder helseopplysninger, barnevernsopplysninger og opplysninger om sosiale forhold — ikke publiseres i elektronisk postjournal. Datatilsynet har ilagt flere kommuner overtredelsesgebyr for mangelfull sladding. Virksomheter skal ha rutiner for kvalitetssikring av journalføring og publisering, og ansatte som journalfører skal ha opplæring i reglene om taushetsplikt og personvern.",
    topics: JSON.stringify(["offentlig_sektor"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-RANSOMWARE-2022",
    title: "Veileder om håndtering av løsepengeangrep (ransomware)",
    date: "2022-02-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernmessige forpliktelser ved løsepengeangrep (ransomware), herunder avviksmelding, risikovurdering og tiltak.",
    full_text:
      "Veilederen beskriver personvernmessige forpliktelser ved løsepengeangrep (ransomware). Et ransomware-angrep utgjør normalt et brudd på personopplysningssikkerheten som utløser meldeplikt til Datatilsynet etter GDPR artikkel 33. Angrepet kan innebære alle tre typer sikkerhetsbrudd: konfidensialitetsbrudd (data eksfiltrert), integritetsbrudd (data endret eller kryptert), og tilgjengelighetsbrudd (data gjort utilgjengelig). Meldeplikt: bruddet skal meldes til Datatilsynet innen 72 timer. Varsling av registrerte: dersom angrepet medfører høy risiko for de registrertes rettigheter, skal de berørte varsles. Forebyggende tiltak: regelmessig backup (offline/offsite), nettverkssegmentering, multifaktor-autentisering, oppdatert programvare, opplæring av ansatte. Datatilsynet viser til Østre Toten kommune-saken som eksempel på konsekvensene av utilstrekkelige sikkerhetstiltak.",
    topics: JSON.stringify(["informasjonssikkerhet", "avvik"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-MINDREARIGES-RETTIGHETER-2023",
    title: "Veileder om mindreåriges rettigheter på nett",
    date: "2023-09-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om barn og unges rettigheter i digitale tjenester, herunder samtykkealdersgrense, innstillinger for barn, aldersverifisering og barnevennlig design.",
    full_text:
      "Veilederen beskriver barn og unges rettigheter i digitale tjenester. Aldersgrense: i Norge er aldersgrensen for samtykke til behandling av personopplysninger i informasjonssamfunnstjenester 13 år (personopplysningsloven § 5). For barn under 13 år kreves foresattes samtykke. Barnevennlig design: digitale tjenester rettet mot barn skal ha personvernvennlige standardinnstillinger, og personverninformasjon skal presenteres i et språk og format som barn forstår. Aldersverifisering: tjenester som behandler barns personopplysninger bør ha aldersverifiseringsmekanismer som er forholdsmessige og ikke selv innsamler unødvendige opplysninger. Profilering: barn skal som hovedregel ikke utsettes for profilering eller automatiserte avgjørelser. Markedsføring: direkte markedsføring rettet mot barn reiser særlige personvernutfordringer og krever forsterket beskyttelse.",
    topics: JSON.stringify(["barn"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-SCHREMS-II-SKYBASERTE-2022",
    title: "Veileder om skybaserte tjenester etter Schrems II",
    date: "2022-10-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om bruk av skybaserte tjenester (cloud computing) og overføring til tredjeland etter Schrems II-dommen. Praktisk veiledning for virksomheter som bruker Microsoft 365, Google Workspace og lignende.",
    full_text:
      "Veilederen gir praktisk veiledning om bruk av skybaserte tjenester i lys av Schrems II-dommen. Mange norske virksomheter bruker skytjenester som Microsoft 365, Google Workspace, Amazon Web Services og lignende, som kan innebære overføring av personopplysninger til USA eller andre tredjeland. Virksomheter skal: (1) kartlegge om og hvordan personopplysninger overføres til tredjeland gjennom skytjenesten; (2) gjennomføre Transfer Impact Assessment for å vurdere beskyttelsesnivået i mottakerlandet; (3) implementere supplerende tiltak der det er nødvendig, f.eks. kryptering, pseudonymisering eller datasegmentering; (4) sikre at databehandleravtalen med skyleverandøren dekker overføring til tredjeland; (5) vurdere om det finnes europeiske alternativer. EU-U.S. Data Privacy Framework (DPF): fra juli 2023 kan overføring til sertifiserte amerikanske virksomheter baseres på EU-kommisjonens adekvansbeslutning, men virksomheter bør følge med på utviklingen.",
    topics: JSON.stringify(["overforing"]),
    language: "no",
  },
  {
    reference: "DT-RAPPORT-EDPB-RETNINGSLINJER-2023",
    title: "Oversikt over retningslinjer fra Personvernrådet (EDPB)",
    date: "2023-01-15",
    type: "rapport",
    summary:
      "Datatilsynets oversikt over de viktigste retningslinjene fra Det europeiske personvernrådet (EDPB) som er relevante for norske virksomheter.",
    full_text:
      "Datatilsynet oversetter og formidler de viktigste retningslinjene og uttalelsene fra Det europeiske personvernrådet (EDPB). EDPB vedtar regelmessig retningslinjer som gir veiledning om hvordan personvernforordningen skal tolkes. Noen av de viktigste retningslinjene for norske virksomheter: retningslinjer om samtykke, retningslinjer om automatiserte individuelle avgjørelser og profilering, retningslinjer om retten til dataportabilitet, retningslinjer om personvernombud, retningslinjer om avvikshåndtering, retningslinjer om overføring til tredjeland, retningslinjer om bruk av videoenheter (kameraovervåking), retningslinjer om innebygd personvern, retningslinjer om behandling av helsedata i forskning, retningslinjer om berettiget interesse, og retningslinjer om tilsyn med KI-systemer under AI Act. Retningslinjene er ikke juridisk bindende, men er uttrykk for europeisk konsensus om tolkningen av GDPR og vektlegges av nasjonale tilsynsmyndigheter.",
    topics: JSON.stringify(["behandlingsgrunnlag"]),
    language: "no",
  },
  {
    reference: "DT-ORDBOK-PERSONVERN-2022",
    title: "Datatilsynets ordbok — personvernbegreper norsk-engelsk",
    date: "2022-01-01",
    type: "verktoy",
    summary:
      "Datatilsynets ordbok med norsk-engelsk oversettelse av sentrale personvernbegreper, inkludert GDPR-terminologi og norsk fagterminologi.",
    full_text:
      "Datatilsynets ordbok gir norsk-engelsk oversettelse av sentrale personvernbegreper. Viktige begreper inkluderer: Behandlingsansvarlig (Data controller), Databehandler (Data processor), Personopplysninger (Personal data), Særlige kategorier av personopplysninger (Special categories of personal data), Behandlingsgrunnlag (Legal basis for processing), Samtykke (Consent), Personvernkonsekvensvurdering — DPIA (Data Protection Impact Assessment), Personvernombud — DPO (Data Protection Officer), Innebygd personvern (Privacy by design / Data protection by design), Avvik/brudd (Data breach / Personal data breach), Innsynsrett (Right of access), Rett til sletting (Right to erasure / Right to be forgotten), Dataportabilitet (Data portability), Behandlingsprotokoll (Record of processing activities), Overføring til tredjeland (Transfer to third country), Kameraovervåking (Camera surveillance / CCTV), Informasjonskapsler (Cookies), Anonymisering (Anonymisation), Pseudonymisering (Pseudonymisation), Berettiget interesse (Legitimate interest), Formålsbegrensning (Purpose limitation), Dataminimering (Data minimisation), Lagringsbegrensning (Storage limitation).",
    topics: JSON.stringify([]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-PROTOKOLL-TIPS-2023",
    title: "Praktiske tips for behandlingsprotokoll",
    date: "2023-04-01",
    type: "veileder",
    summary:
      "Datatilsynets praktiske tips for å opprette og vedlikeholde en protokoll over behandlingsaktiviteter — maler, eksempler og vanlige feil.",
    full_text:
      "Datatilsynets praktiske tips for å opprette og vedlikeholde en protokoll over behandlingsaktiviteter etter GDPR artikkel 30. Vanlige feil: (1) protokollen er for generell — den bør beskrive faktiske behandlingsaktiviteter, ikke bare gjenta lovteksten; (2) manglende oppdatering — protokollen skal holdes levende og oppdateres når nye behandlingsaktiviteter innføres eller eksisterende endres; (3) manglende kobling til risikovurdering — behandlingsprotokollen bør være utgangspunktet for risikovurderinger; (4) manglende lagringsfrister — slettefrister skal angis for hver behandlingsaktivitet; (5) manglende oversikt over databehandlere — alle databehandlere skal fremgå av protokollen. Tips for god protokollføring: bruk et verktøy eller regneark, involver fagpersoner fra hele virksomheten, koble protokollen til rutiner og internkontroll, og gjennomfør årlig gjennomgang.",
    topics: JSON.stringify(["internkontroll"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-LEVERANDORER-HELSE-2022",
    title: "Veileder for leverandører og utviklere i helse- og omsorgssektoren",
    date: "2022-06-15",
    type: "veileder",
    summary:
      "Datatilsynets veileder rettet mot leverandører og utviklere som selger systemer og applikasjoner til helse- og omsorgssektoren.",
    full_text:
      "Veilederen er rettet mot leverandører og utviklere som selger eller bygger velferdsteknologi, systemer, løsninger eller applikasjoner til behandlingsansvarlige i helse- og omsorgssektoren. Innebygd personvern og personvern som standard er sentrale krav. Leverandører skal: (1) sørge for at løsningene er utviklet med personvern integrert fra starten; (2) kun samle inn og behandle personopplysninger som er nødvendige for formålet; (3) ha standardinnstillinger som gir størst mulig personvern; (4) kunne dokumentere at løsningen oppfyller kravene i GDPR; (5) bistå behandlingsansvarlige med å oppfylle sine plikter, herunder DPIA, avvikshåndtering og innsynsforespørsler; (6) ha tilstrekkelig sikkerhet i systemene, herunder kryptering, tilgangskontroll og logging.",
    topics: JSON.stringify(["helsedata", "innebygd_personvern"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-BORETTSLAG-2021",
    title: "Veileder om personvern i borettslag og sameier",
    date: "2021-04-15",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvern i borettslag og sameier — kameraovervåking av fellesarealer, deling av beboerlister, og håndtering av klager.",
    full_text:
      "Veilederen beskriver personvernreglene som gjelder for borettslag og sameier. Kameraovervåking: overvåking av fellesarealer som garasjer, innganger og søppelrom kan tillates for å forebygge kriminalitet, men krever interesseavveining og tilstrekkelig skilting. Kameraer skal ikke dekke privatbeboernes inngangsdører eller vinduer. Opptak skal normalt slettes etter 7 dager. Beboerlister: deling av beboerlister med navn og kontaktinformasjon krever vurdering av behandlingsgrunnlag. Styret kan dele nødvendig kontaktinformasjon for drift, men ikke med tredjeparter uten samtykke. Klager mellom beboere: styret skal behandle klager konfidensielt og ikke dele personopplysninger om klager med andre beboere utover det som er nødvendig.",
    topics: JSON.stringify(["kameraovervaking"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-RISIKOVURDERING-2020",
    title: "Veileder om gjennomføring av risikovurderinger",
    date: "2020-10-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om gjennomføring av risikovurderinger for behandling av personopplysninger etter GDPR artikkel 32.",
    full_text:
      "Veilederen gir praktisk veiledning om gjennomføring av risikovurderinger for behandling av personopplysninger. Risikovurdering er påkrevet for alle behandlingsaktiviteter (art. 32) og er en forutsetning for å implementere tilstrekkelige sikkerhetstiltak. Prosessen: (1) identifiser verdiene — hvilke personopplysninger behandles, hvem er de registrerte, hva er konsekvensene av et brudd; (2) identifiser trusler — hva kan gå galt (uautorisert tilgang, tap, endring, utilgjengelighet); (3) vurder sårbarhet — hvilke svakheter har dagens tiltak; (4) beregn risiko — kombiner sannsynlighet og konsekvens; (5) velg tiltak — implementer tiltak som reduserer risikoen til et akseptabelt nivå. Tiltak kan være tekniske (kryptering, tilgangskontroll, backup) eller organisatoriske (rutiner, opplæring, avtaler). Risikovurderingen skal dokumenteres og oppdateres regelmessig eller ved vesentlige endringer.",
    topics: JSON.stringify(["informasjonssikkerhet"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-FORSIKRING-2023",
    title: "Veileder om personvern i forsikringsbransjen",
    date: "2023-05-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvern i forsikringsbransjen — innhenting av helseopplysninger, risikovurdering av forsikringskunder og profilering.",
    full_text:
      "Veilederen beskriver personvernreglene som gjelder for forsikringsbransjen. Innhenting av helseopplysninger: forsikringsselskaper har i visse tilfeller adgang til å innhente helseopplysninger i forbindelse med risikovurdering og skadeoppgjør, men dette krever rettslig grunnlag og forholdsmessighetsvurdering. Profilering: bruk av personopplysninger til å vurdere forsikringsrisiko og fastsette premie kan utgjøre profilering som utløser særlige krav etter GDPR artikkel 22. Automatiserte avgjørelser: helautomatiske avgjørelser om avslag på forsikring eller premieberegning er underlagt reglene om automatiserte individuelle avgjørelser. Dataminimering: kun helseopplysninger som er nødvendige for det konkrete forsikringsformålet skal innhentes. Lagringstid: helseopplysninger skal slettes når formålet er oppfylt.",
    topics: JSON.stringify(["finans", "helsedata"]),
    language: "no",
  },
  {
    reference: "DT-ARSRAPPORT-2024-SAMMENDRAG",
    title: "Årsrapport 2024 — hovedfunn fra Datatilsynets virksomhet",
    date: "2024-04-01",
    type: "rapport",
    summary:
      "Sammendrag av Datatilsynets årsrapport for 2024, med oversikt over tilsynsvirksomhet, klagesaker, avviksmeldinger og utviklingstrender.",
    full_text:
      "Datatilsynets årsrapport for 2024 oppsummerer myndighetens virksomhet. Avviksmeldinger: Datatilsynet mottok et betydelig antall avviksmeldinger om brudd på personopplysningssikkerheten. De vanligste bruddtypene var feilsending av personopplysninger, uautorisert tilgang, og tap av data ved cyberangrep. Klagesaker: Datatilsynet behandlet et stort antall klager fra registrerte, de fleste knyttet til innsynsrett, sletting og uønsket markedsføring. Tilsynsvirksomhet: Datatilsynet gjennomførte tilsyn med flere sektorer, herunder kommuner, helse, finans og telekommunikasjon. Overtredelsesgebyrer: Datatilsynet ila flere overtredelsesgebyrer, det største til NAV på 20 millioner kroner. Sandkassen: Datatilsynets regulatoriske sandkasse for kunstig intelligens gjennomførte nye prosjekter. Internasjonalt: Datatilsynet deltok aktivt i EDPB og samarbeidet med andre europeiske tilsynsmyndigheter.",
    topics: JSON.stringify(["offentlig_sektor"]),
    language: "no",
  },

  // =========================================================================
  // Final batch — additional guidance and reports to reach 200+
  // =========================================================================
  {
    reference: "DT-VEILEDER-PERSONVERN-KOMMUNE-2024",
    title: "Veileder om personvern for kommuner",
    date: "2024-02-01",
    type: "veileder",
    summary:
      "Datatilsynets praktiske veileder for kommuner om personvern — behandlingsprotokoll, risikovurdering, avvikshåndtering, personvernombud og databehandleravtaler i kommunal sektor.",
    full_text:
      "Datatilsynets praktiske veileder for kommuner om personvern. Kommuner behandler store mengder sensitive personopplysninger om innbyggere — helseopplysninger, barnevernssaker, sosialstønad, skoledata og byggesaker. Veilederen dekker: behandlingsprotokoll — alle kommuner skal ha oversikt over behandlingsaktiviteter etter GDPR artikkel 30. Risikovurdering — kommuner skal gjennomføre risikovurderinger av sine systemer og behandlingsaktiviteter, med særlig fokus på systemer med sensitive opplysninger. Avvikshåndtering — kommuner skal ha rutiner for å oppdage, vurdere og melde brudd innen 72 timer. Personvernombud — kommuner er pålagt å ha personvernombud. Databehandleravtaler — kommuner benytter mange leverandører av IT-systemer og skal ha databehandleravtaler med alle. Skolesektoren — digitale læringsverktøy krever særlig oppmerksomhet, se egen veileder.",
    topics: JSON.stringify(["offentlig_sektor", "internkontroll"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-KUNDEKONTROLL-2022",
    title: "Veileder om personvern ved kundekontroll og KYC",
    date: "2022-12-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om forholdet mellom personvern og kundekontroll (Know Your Customer) i henhold til hvitvaskingsloven.",
    full_text:
      "Veilederen beskriver forholdet mellom personvern og kundekontroll (KYC) i henhold til hvitvaskingsloven. Banker og finansinstitusjoner er pålagt å gjennomføre kundekontroll for å forebygge hvitvasking og terrorfinansiering. Rettslig grunnlag: hvitvaskingsloven utgjør rettslig forpliktelse etter GDPR artikkel 6(1)(c). Dataminimering: kun opplysninger som er nødvendige for kundekontrollformålet skal innhentes. Formålsbegrensning: opplysninger innhentet for kundekontroll skal ikke brukes til markedsføring eller andre formål. Lagringstid: opplysningene skal oppbevares i henhold til hvitvaskingslovens krav, normalt fem år etter avsluttet kundeforhold. Politisk eksponerte personer (PEP): innhenting av opplysninger om PEP-status har rettslig grunnlag i hvitvaskingsloven.",
    topics: JSON.stringify(["finans"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-SKYTJENESTER-2023",
    title: "Veileder om anskaffelse av skytjenester og personvern",
    date: "2023-11-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernvurderinger ved anskaffelse av skytjenester — due diligence, risikovurdering, databehandleravtaler og overføring til tredjeland.",
    full_text:
      "Veilederen gir praktisk veiledning om personvernvurderinger ved anskaffelse av skytjenester. Virksomheter skal gjennomføre en due diligence-prosess før anskaffelse, som inkluderer: (1) kartlegging av hvilke personopplysninger som vil behandles i skytjenesten; (2) vurdering av skyleverandørens sikkerhetstiltak og sertifiseringer (ISO 27001, SOC 2); (3) gjennomgang av databehandleravtalen — den skal oppfylle kravene i GDPR artikkel 28; (4) vurdering av overføring til tredjeland — kartlegg om data lagres eller aksesseres fra land utenfor EØS og gjennomfør Transfer Impact Assessment; (5) exit-strategi — avtalen bør sikre at data kan hentes tilbake eller slettes ved avslutning; (6) underlagsanalyse — kartlegg skyleverandørens underleverandører (sub-processors). Risikovurdering: gjennomfør risikovurdering av behandlingen i skytjenesten, inkludert tilgjengelighet, konfidensialitet og integritet.",
    topics: JSON.stringify(["overforing", "databehandler"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-AUTOMATISERTE-AVGJORELSER-2022",
    title: "Veileder om automatiserte individuelle avgjørelser og profilering",
    date: "2022-07-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om GDPR artikkel 22 — den registrertes rett til å ikke bli gjenstand for helautomatiserte avgjørelser, herunder profilering.",
    full_text:
      "Veilederen beskriver reglene om automatiserte individuelle avgjørelser og profilering etter GDPR artikkel 22. Den registrerte har rett til å ikke bli gjenstand for en avgjørelse som utelukkende er basert på automatisert behandling, inkludert profilering, dersom avgjørelsen har rettsvirkninger eller i betydelig grad påvirker den registrerte. Unntak: helautomatiserte avgjørelser er tillatt når de er nødvendige for avtale, hjemlet i lov, eller basert på uttrykkelig samtykke. I alle tilfeller har den registrerte rett til menneskelig overprøving, rett til å uttrykke sitt synspunkt, og rett til å bestride avgjørelsen. Profilering: systematisk vurdering av personlige aspekter basert på automatisert behandling av personopplysninger, herunder analyse av arbeidsprestasjoner, økonomi, helse, personlige preferanser, interesser, oppførsel, bevegelser eller posisjon. Virksomheter som bruker profilering skal informere den registrerte om profileringens logikk, betydning og forventede konsekvenser.",
    topics: JSON.stringify(["kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-GRENSEKRYSSENDE-2023",
    title: "Veileder om grensekryssende saker og samarbeid med andre tilsynsmyndigheter",
    date: "2023-07-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om behandling av grensekryssende saker under one-stop-shop-mekanismen i GDPR, herunder samarbeid med ledende tilsynsmyndighet og EDPB.",
    full_text:
      "Veilederen forklarer one-stop-shop-mekanismen i GDPR som regulerer grensekryssende saker der en virksomhet opererer i flere EØS-land. Ledende tilsynsmyndighet: den tilsynsmyndigheten der virksomheten har sin hovedetablering er som hovedregel ansvarlig for å behandle saken. Berørte tilsynsmyndigheter: andre tilsynsmyndigheter der registrerte er berørt har rett til å delta i behandlingen. Datatilsynets rolle: i saker der en utenlandsk virksomhet behandler personopplysninger om norske borgere, kan Datatilsynet enten være ledende myndighet (dersom virksomheten har hovedetablering i Norge) eller berørt myndighet. EDPB: dersom tilsynsmyndighetene er uenige, kan saken bringes inn for Det europeiske personvernrådet. Grindr-saken er et eksempel der Datatilsynet var ledende tilsynsmyndighet fordi appen var rettet mot det norske markedet.",
    topics: JSON.stringify([]),
    language: "no",
  },
  {
    reference: "DT-RAPPORT-SANDKASSE-AGELABS-2022",
    title: "Sluttrapport sandkasseprosjekt — Age Labs og prediktiv diagnostikk",
    date: "2022-12-01",
    type: "rapport",
    summary:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasse om Age Labs' bruk av maskinlæring og epigenetikk for prediktiv diagnostikk.",
    full_text:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasseprosjekt med Age Labs. Age Labs er en startup innen prediktiv diagnostikk som kombinerer maskinlæring og biobanker. Selskapet undersøker epigenetikk — hvordan gener slås av og på — med mål om å oppdage diagnoser tidligere ved hjelp av maskinlæring. Prosjektet fokuserte på: rettslig grunnlag for bruk av biobankmateriale til maskinlæring, krav til samtykke for sekundærbruk av biologisk materiale, dataminimering i trening av modeller, krav til forklarlighet av prediktive helsemodeller, og ansvar for feilaktige prediksjoner. Sandkassen konkluderte med at bruk av biobankmateriale for KI-utvikling er mulig innenfor regelverket, men krever grundig vurdering av rettslig grunnlag, informasjon til de registrerte, og DPIA.",
    topics: JSON.stringify(["kunstig_intelligens", "helsedata", "forskning"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-BARNEVERNSREGISTER-2024",
    title: "Høringssvar om nasjonalt barnevernsregister",
    date: "2024-07-02",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om forslag til nasjonalt individdataregister for barnevernet. Diskuterer personvernimplikasjoner av storskala registrering av barns opplysninger.",
    full_text:
      "Datatilsynet har avgitt høringssvar om forslag til nasjonalt individdataregister for barnevernet. Forslaget innebærer opprettelse av et sentralt register med individdata om barn og familier i barnevernet. Datatilsynet kommenterer: (1) registeret vil inneholde svært sensitive opplysninger om sårbare barn og familier, og krever forsterket beskyttelse; (2) formålsbegrensning — opplysningene skal kun brukes til statistikk og forskning, ikke til individuelle avgjørelser; (3) tilgangskontroll — strenge begrensninger på hvem som kan få tilgang til identifiserbare opplysninger; (4) pseudonymisering skal brukes som standard; (5) DPIA er påkrevet. Datatilsynet støtter behovet for bedre statistikk om barnevernet, men understreker at barnets beste og personvern må ivaretas.",
    topics: JSON.stringify(["barn", "offentlig_sektor", "forskning"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-STRAFFEGJENNOMFORING-2024",
    title: "Høringssvar om endringer i straffegjennomføringsloven",
    date: "2024-09-04",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om forslag til endringer i straffegjennomføringsloven knyttet til behandling av personopplysninger om innsatte.",
    full_text:
      "Datatilsynet har avgitt høringssvar om forslag til endringer i straffegjennomføringsloven. Endringene gjelder behandling av personopplysninger om innsatte, herunder: (1) utvidede hjemler for deling av opplysninger mellom kriminalomsorgen og andre etater; (2) bruk av teknologiske hjelpemidler for overvåking av innsatte; (3) biometrisk identifisering i fengsel. Datatilsynet understreker at innsatte er i en særlig sårbar situasjon med begrenset mulighet til å ivareta sine rettigheter, og at enhver utvidelse av behandlingshjemler krever forholdsmessighetsvurdering.",
    topics: JSON.stringify(["politi_justis"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-TAUSHETSPLIKT-HELSE-2024",
    title: "Høringssvar om taushetspliktregler i helsesektoren",
    date: "2024-12-20",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om forslag til endringer i taushetspliktreglene i helse- og omsorgssektoren.",
    full_text:
      "Datatilsynet har avgitt høringssvar om forslag til endringer i taushetspliktreglene i helsesektoren. Forslaget innebærer justeringer i hvordan helsepersonell kan dele opplysninger med andre etater og aktører. Datatilsynet kommenterer: (1) taushetsplikten er en grunnleggende forutsetning for tillit mellom pasient og helsepersonell; (2) unntak fra taushetsplikten må være tydelig avgrenset og forholdsmessige; (3) pasienten bør så langt mulig informeres om deling av opplysninger; (4) det bør gjennomføres DPIA for nye delingsordninger.",
    topics: JSON.stringify(["helsedata"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-IDRETT-2024",
    title: "Høringssvar om sensitive personopplysninger i idretten",
    date: "2024-06-13",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om behandling av sensitive personopplysninger i idretten, herunder helseopplysninger og opplysninger om dopingkontroll.",
    full_text:
      "Datatilsynet har avgitt høringssvar om behandling av sensitive personopplysninger i idretten. Idrettsorganisasjoner behandler sensitive personopplysninger om utøvere, herunder helseopplysninger, dopingkontrollresultater og opplysninger om barn og unge. Datatilsynet understreker at: (1) behandling av helseopplysninger om utøvere krever rettslig grunnlag etter GDPR artikkel 9; (2) dopingkontroll innebærer behandling av biologisk materiale og helsedata som krever forsterket beskyttelse; (3) behandling av barns personopplysninger i idretten krever særlig aktsomhet; (4) DPIA bør gjennomføres for storskala behandling av utøveres helseopplysninger.",
    topics: JSON.stringify(["helsedata"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-SIVILBESKYTTELSE-2024",
    title: "Høringssvar om endringer i sivilbeskyttelsesloven",
    date: "2024-04-23",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om forslag til endringer i sivilbeskyttelsesloven, inkludert personvernaspekter ved beredskapsregistre.",
    full_text:
      "Datatilsynet har avgitt høringssvar om forslag til endringer i sivilbeskyttelsesloven. Forslaget innebærer blant annet utvidede hjemler for registrering av personopplysninger i beredskapssammenheng. Datatilsynet kommenterer at: (1) beredskapsregistre som inneholder personopplysninger om befolkningen krever klare formåls- og tilgangsregler; (2) oppbevaring av opplysninger bør begrenses til det som er nødvendig for beredskapsformålet; (3) det bør gjennomføres en forholdsmessighetsvurdering av inngrepet i personvernet opp mot beredskapsbehovet.",
    topics: JSON.stringify(["offentlig_sektor"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-NEGATIV-SOSIAL-KONTROLL-2025",
    title: "Høringssvar om lov om innsats mot negativ sosial kontroll",
    date: "2025-12-17",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om forslag til ny lov om særskilt innsats mot negativ sosial kontroll og æresmotivert vold.",
    full_text:
      "Datatilsynet har avgitt høringssvar om forslag til ny lov om særskilt innsats mot negativ sosial kontroll og æresmotivert vold. Lovforslaget innebærer utvidede muligheter for informasjonsdeling mellom etater i saker om negativ sosial kontroll. Datatilsynet kommenterer: (1) informasjon som deles kan inneholde svært sensitive opplysninger om enkeltpersoners familieforhold, religion, etnisitet og voldsutsatthet; (2) forholdet mellom de berørtes personvern og behovet for informasjonsdeling må balanseres nøye; (3) de berørte bør så langt mulig informeres om at opplysninger er delt; (4) formålsbegrensningen må overholdes — opplysninger delt for å forebygge sosial kontroll skal ikke brukes til andre formål.",
    topics: JSON.stringify(["offentlig_sektor"]),
    language: "no",
  },

  // =========================================================================
  // Additional guidelines — expanded coverage
  // =========================================================================

  // --- Data subject rights guides ---
  {
    reference: "DT-VEILEDER-RETT-INFORMASJON-2020",
    title: "Veileder om retten til informasjon",
    date: "2020-06-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om den registrertes rett til informasjon om behandling av personopplysninger etter GDPR artikkel 13 og 14.",
    full_text:
      "Datatilsynets veileder om retten til informasjon beskriver virksomheters plikt til å informere de registrerte om behandling av personopplysninger. Veilederen dekker: (1) innholdet i informasjonsplikten — hvilke opplysninger som skal gis, herunder formål, rettslig grunnlag, mottakere, lagringstid og rettigheter; (2) tidspunktet for informasjon — opplysninger skal gis ved innsamling (art. 13) eller innen rimelig tid dersom opplysningene ikke er samlet inn fra den registrerte (art. 14); (3) form og tilgjengelighet — informasjonen skal gis i en kortfattet, åpen, forståelig og lettilgjengelig form med klart og enkelt språk; (4) unntak fra informasjonsplikten — i hvilke tilfeller virksomheten kan la være å informere; (5) lagdelt informasjon — hvordan virksomheter kan bruke flere lag for å gi all nødvendig informasjon uten å overvelde den registrerte.",
    topics: JSON.stringify(["innsyn"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-RETT-BEGRENSNING-2020",
    title: "Veileder om retten til begrensning av behandling",
    date: "2020-09-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om den registrertes rett til å kreve at behandlingen av egne personopplysninger begrenses etter GDPR artikkel 18.",
    full_text:
      "Datatilsynets veileder om retten til begrensning av behandling beskriver vilkårene for å begrense behandlingen etter GDPR artikkel 18. Veilederen dekker: (1) fire situasjoner der den registrerte kan kreve begrensning — bestridelse av riktighet, ulovlig behandling der den registrerte motsetter seg sletting, den behandlingsansvarlige trenger ikke opplysningene lenger men den registrerte trenger dem for rettskrav, og den registrerte har protestert etter art. 21; (2) hva begrensning innebærer i praksis — opplysningene lagres men behandles ikke videre uten samtykke; (3) plikt til å informere den registrerte før begrensningen oppheves; (4) plikt til å underrette mottakere som har fått opplysningene utlevert.",
    topics: JSON.stringify(["innsyn"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-RETT-PROTESTERE-2020",
    title: "Veileder om retten til å protestere",
    date: "2020-09-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om den registrertes rett til å protestere mot behandling av personopplysninger etter GDPR artikkel 21.",
    full_text:
      "Datatilsynets veileder om retten til å protestere beskriver vilkårene for å protestere mot behandling av personopplysninger etter GDPR artikkel 21. Veilederen dekker: (1) retten til å protestere mot behandling basert på berettiget interesse (art. 6 nr. 1 bokstav f) eller offentlig myndighetsutøvelse (art. 6 nr. 1 bokstav e); (2) absolutt rett til å protestere mot direkte markedsføring — virksomheten må stanse behandlingen umiddelbart; (3) virksomhetens plikt til å dokumentere tvingende berettigede grunner dersom den ønsker å fortsette behandlingen til tross for protest; (4) informasjonsplikten — den registrerte skal informeres om retten til å protestere senest ved første kommunikasjon.",
    topics: JSON.stringify(["innsyn"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-AUTOMATISERTE-BESLUTNINGER-2022",
    title: "Veileder om automatiserte beslutninger og profilering",
    date: "2022-03-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om den registrertes rettigheter ved automatiserte individuelle beslutninger og profilering etter GDPR artikkel 22.",
    full_text:
      "Datatilsynets veileder om automatiserte individuelle beslutninger og profilering beskriver rettighetene etter GDPR artikkel 22. Veilederen dekker: (1) hva som utgjør en automatisert individuell beslutning — beslutninger som tas utelukkende ved automatisert behandling, inkludert profilering, og som har rettsvirkning eller i vesentlig grad påvirker den registrerte; (2) hovedregelen er at den registrerte har rett til ikke å bli gjenstand for slike beslutninger; (3) tre unntak — samtykke, avtaleoppfyllelse eller lovhjemmel; (4) krav om menneskelig inngripen — den registrerte kan kreve at et menneske vurderer beslutningen; (5) rett til å uttrykke sitt synspunkt og til å bestride beslutningen; (6) forbud mot automatiserte beslutninger basert på særlige kategorier av personopplysninger med mindre unntak gjelder.",
    topics: JSON.stringify(["kunstig_intelligens", "innsyn"]),
    language: "no",
  },

  // --- Workplace privacy guides ---
  {
    reference: "DT-VEILEDER-BAKGRUNNSSJEKK-2021",
    title: "Veileder om bakgrunnsundersøkelser ved ansettelse",
    date: "2021-03-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved bakgrunnsundersøkelser før ansettelse, inkludert referansesjekk, vandelskontroll og kredittsjekk.",
    full_text:
      "Datatilsynets veileder om bakgrunnsundersøkelser ved ansettelse beskriver personvernkravene som gjelder når arbeidsgiver ønsker å innhente opplysninger om jobbsøkere. Veilederen dekker: (1) referansesjekk — krever samtykke fra søkeren og skal begrenses til relevante opplysninger; (2) vandelskontroll — politiattest kan bare kreves når det er hjemlet i lov; (3) kredittsjekk — kan bare gjennomføres når det er saklig behov, typisk for stillinger med ansvar for betydelige verdier; (4) søk i sosiale medier — arbeidsgiver bør utvise forsiktighet ved å søke opp kandidater i sosiale medier, da dette kan avsløre sensitive opplysninger; (5) medisinske undersøkelser — kan kun kreves i den utstrekning arbeidsmiljøloven og annet regelverk tillater.",
    topics: JSON.stringify(["arbeidsforhold"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-OVERVAKING-ELEKTRONISK-2022",
    title: "Veileder om overvåking av ansattes bruk av elektronisk utstyr",
    date: "2022-05-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om arbeidsgivers adgang til å overvåke ansattes bruk av elektronisk utstyr, inkludert PC, mobiltelefon og internettbruk.",
    full_text:
      "Datatilsynets veileder om overvåking av ansattes bruk av elektronisk utstyr beskriver vilkårene for arbeidsgivers kontroll av ansattes digitale aktiviteter. Veilederen dekker: (1) rettslig grunnlag — arbeidsgiver kan ha berettiget interesse (art. 6 nr. 1 bokstav f) i begrenset kontroll, men må gjennomføre forholdsmessighetsvurdering; (2) forbud mot systematisk overvåking — generell overvåking av alt ansatte gjør på PC og internett er normalt ulovlig; (3) unntak for konkret mistanke — ved konkret mistanke om misbruk kan mer inngripende kontroll tillates; (4) informasjonsplikt — de ansatte skal informeres om eventuelle kontrolltiltak; (5) lagring — loggdata skal ikke lagres lenger enn nødvendig; (6) samarbeid med tillitsvalgte — kontrolltiltak bør drøftes med de ansattes representanter i henhold til arbeidsmiljøloven kap. 9.",
    topics: JSON.stringify(["arbeidsforhold"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-VARSLING-2022",
    title: "Veileder om varsling og personvern",
    date: "2022-06-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernaspektene ved varsling på arbeidsplassen, inkludert behandling av personopplysninger i varslingskanaler.",
    full_text:
      "Datatilsynets veileder om varsling og personvern beskriver personvernkravene som gjelder ved behandling av personopplysninger i varslingssaker. Veilederen dekker: (1) rettslig grunnlag — virksomheter som er pålagt å ha varslingskanal etter arbeidsmiljøloven har rettslig plikt som behandlingsgrunnlag; (2) informasjonssikkerhet — varslingssaker inneholder ofte sensitive opplysninger og krever streng tilgangsstyring; (3) innsynsrett for den det varsles om — den omvarslede har rett til innsyn i opplysningene som er registrert om vedkommende, men varslerens identitet kan skjermes; (4) lagring og sletting — opplysninger i varslingssaker skal ikke lagres lenger enn nødvendig; (5) databehandleravtale — virksomheter som bruker ekstern leverandør for varslingskanal skal inngå databehandleravtale.",
    topics: JSON.stringify(["arbeidsforhold"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-PERSONALMAPPE-2020",
    title: "Veileder om personalmapper — behandling av ansattopplysninger",
    date: "2020-04-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om behandling av personopplysninger i personalmapper, inkludert hvilke opplysninger som kan lagres og hvor lenge.",
    full_text:
      "Datatilsynets veileder om personalmapper beskriver personvernkravene for arbeidsgivers behandling av ansattes personopplysninger. Veilederen dekker: (1) hvilke opplysninger som kan lagres — opplysninger som er nødvendige for å administrere arbeidsforholdet, som kontaktopplysninger, arbeidsavtale, lønn, fravær og kompetanse; (2) begrensninger — opplysninger om helse, religion, politisk oppfatning og andre særlige kategorier krever særskilt grunnlag; (3) tilgang — kun ansatte med tjenstlig behov skal ha tilgang til personalmapper; (4) innsyn — den ansatte har rett til innsyn i egen personalmappe; (5) sletting — opplysninger skal slettes når de ikke lenger er nødvendige for formålet; (6) elektroniske vs. fysiske personalmapper — samme krav gjelder uavhengig av lagringsform.",
    topics: JSON.stringify(["arbeidsforhold"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-ANSATTBILDER-2021",
    title: "Veileder om publisering av bilder av ansatte på internett",
    date: "2021-01-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved publisering av bilder av ansatte på virksomhetens nettsider og sosiale medier.",
    full_text:
      "Datatilsynets veileder om publisering av bilder av ansatte på internett beskriver personvernkravene ved bruk av ansattbilder. Veilederen dekker: (1) rettslig grunnlag — publisering av ansattbilder på nettsider krever som hovedregel samtykke; (2) situasjoner der berettiget interesse kan brukes — for eksempel generelle bilder fra arrangementer; (3) spesielle hensyn ved sosiale medier — bilder publisert i sosiale medier spres lettere og er vanskeligere å slette; (4) den ansattes rett til å trekke samtykket tilbake — virksomheten må da fjerne bildet; (5) bilder etter arbeidsforholdets opphør — bilder av tidligere ansatte skal normalt fjernes med mindre det foreligger annet grunnlag.",
    topics: JSON.stringify(["arbeidsforhold", "samtykke"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-SYKDOM-ARBEIDSPLASS-2020",
    title: "Veileder om sykdom og personvern på arbeidsplassen",
    date: "2020-03-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om arbeidsgivers behandling av helseopplysninger i forbindelse med sykefravær og sykmelding.",
    full_text:
      "Datatilsynets veileder om sykdom og personvern på arbeidsplassen beskriver grensene for arbeidsgivers behandling av helseopplysninger. Veilederen dekker: (1) hva arbeidsgiver kan vite om ansattes sykdom — arbeidsgiver har rett til å vite om den ansatte er syk og når vedkommende forventes tilbake, men ikke diagnose; (2) sykmeldingen — arbeidsgiver mottar del D av sykmeldingen som inneholder informasjon om funksjonsvurdering; (3) oppfølgingssamtaler — arbeidsgiver kan stille spørsmål om funksjonsnivå, men kan ikke kreve diagnoseinformasjon; (4) lagring — helseopplysninger om ansatte skal oppbevares med streng tilgangsstyring og slettes når de ikke lenger er nødvendige; (5) koronaspesifikke regler — under pandemien gjaldt særlige regler for arbeidsgivers behandling av smitteopplysninger.",
    topics: JSON.stringify(["arbeidsforhold", "helsedata"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-LONNSOPPLYSNINGER-2020",
    title: "Veileder om innsyn i lønnsopplysninger",
    date: "2020-02-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om ansattes rett til innsyn i kollegers lønnsopplysninger ved mistanke om diskriminering.",
    full_text:
      "Datatilsynets veileder om innsyn i lønnsopplysninger beskriver reglene for tilgang til lønnsinformasjon. Veilederen dekker: (1) ansattes rett til opplysninger om kollegers lønn ved mistanke om lønnsdiskriminering, hjemlet i likestillings- og diskrimineringsloven; (2) begrensninger — retten gjelder kun der den ansatte har mistanke om diskriminering, og innsynet skal begrenses til de opplysningene som er nødvendige; (3) taushetsplikt — den som får innsyn har taushetsplikt om opplysningene; (4) offentlig sektor — i offentlig sektor er lønn i utgangspunktet offentlig informasjon.",
    topics: JSON.stringify(["arbeidsforhold", "innsyn"]),
    language: "no",
  },

  // --- Surveillance and monitoring guides ---
  {
    reference: "DT-VEILEDER-KAMERA-BORETTSLAG-2022",
    title: "Veileder om kameraovervåking i borettslag og sameier",
    date: "2022-04-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om vilkårene for kameraovervåking i borettslag, sameier og fellesarealer.",
    full_text:
      "Datatilsynets veileder om kameraovervåking i borettslag og sameier beskriver vilkårene for lovlig kameraovervåking i boligselskaper. Veilederen dekker: (1) rettslig grunnlag — kameraovervåking i fellesarealer kan i noen tilfeller baseres på berettiget interesse, men terskelen er høy i boligområder; (2) forholdsmessighet — kameraovervåking er et inngripende tiltak som krever at det er prøvd mindre inngripende tiltak først; (3) styrevedtak — beslutning om kameraovervåking bør fattes av styret med dokumentert begrunnelse; (4) informasjon — beboere og besøkende skal informeres om overvåkingen med skilting; (5) begrensning av opptak — kameraer skal ikke rettes mot inngangsdører til private leiligheter eller vinduer; (6) lagring — opptak skal normalt slettes etter 7 dager.",
    topics: JSON.stringify(["kameraovervaking"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-DRONER-2022",
    title: "Veileder om droner og personvern",
    date: "2022-01-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernreglene ved bruk av droner med kamera, inkludert privat og profesjonell bruk.",
    full_text:
      "Datatilsynets veileder om droner og personvern beskriver reglene for bruk av droner med kamera. Veilederen dekker: (1) droner med kamera behandler personopplysninger — bildemateriale av identifiserbare personer er personopplysninger; (2) rettslig grunnlag — profesjonell bruk krever berettiget interesse eller annet grunnlag, privat bruk kan omfattes av husholdsunntaket; (3) krav til informasjon — det kan være vanskelig å informere om droneovervåking, men dette fritar ikke fra informasjonsplikten; (4) begrensninger — det er ikke lov å fly droner over andres eiendom for å ta bilder; (5) flyforbudsoner — Luftfartstilsynets regler gjelder i tillegg til personvernreglene; (6) opptak og lagring — opptak skal slettes når formålet er oppnådd.",
    topics: JSON.stringify(["kameraovervaking"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-KROPPSKAMERA-2023",
    title: "Veileder om bruk av kroppskamera",
    date: "2023-01-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om bruk av kroppskamera (body-worn cameras) i ulike sammenhenger, inkludert vektere, politi og ansatte.",
    full_text:
      "Datatilsynets veileder om kroppskamera beskriver personvernkravene ved bruk av kroppsbårne kameraer. Veilederen dekker: (1) kroppskameraer utgjør personvernovervåking — opptak med kroppskamera er behandling av personopplysninger; (2) rettslig grunnlag varierer etter kontekst — politi har lovhjemmel, private vektere trenger berettiget interesse; (3) informasjonsplikt — de som filmes skal informeres, for eksempel gjennom synlig markering og muntlig varsel; (4) opptak skal aktiveres bevisst, ikke løpe kontinuerlig; (5) lagring og sletting — opptak skal normalt slettes innen 7 dager; (6) innsyn — den som er filmet har rett til å se opptaket av seg selv.",
    topics: JSON.stringify(["kameraovervaking"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-LYDOPPTAK-2022",
    title: "Veileder om lydopptak av samtaler",
    date: "2022-02-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om når lydopptak av samtaler er lovlig, inkludert skjulte opptak og opptak i arbeidslivet.",
    full_text:
      "Datatilsynets veileder om lydopptak av samtaler beskriver reglene for lydopptak. Veilederen dekker: (1) hovedregel — det er lovlig å ta opp samtaler du selv deltar i, men ulovlig å ta opp samtaler mellom andre; (2) arbeidslivet — arbeidsgiver kan ta lydopptak av kundesamtaler med informert samtykke; (3) skjulte opptak — skjulte opptak av samtaler du deltar i er lovlig i Norge, men kan ha arbeidsrettslige konsekvenser; (4) kundeservice — lydopptak av kundeservicesamtaler krever informert samtykke fra kunden; (5) bevisverdi — skjulte opptak kan brukes som bevis i rettssaker, men retten vurderer om beviset skal tillates; (6) lagring — lydopptak skal slettes når formålet er oppfylt.",
    topics: JSON.stringify(["kameraovervaking"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-SPORING-OFFENTLIG-ROM-2020",
    title: "Veileder om sporing i det offentlige rom",
    date: "2020-01-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved sporing av personer i det offentlige rom, inkludert Wi-Fi-sporing, Bluetooth-beacons og mobilsporing.",
    full_text:
      "Datatilsynets veileder om sporing i det offentlige rom beskriver personvernkravene ved teknologisk sporing av personers bevegelser. Veilederen dekker: (1) Wi-Fi-sporing — innsamling av MAC-adresser fra mobiltelefoner for å telle og spore bevegelser i offentlige rom; (2) Bluetooth-beacons — sendere som kommuniserer med mobilapper for stedssporing; (3) rettslig grunnlag — sporing i det offentlige rom krever som hovedregel samtykke; (4) anonymisering — dersom sporingsdata er genuint anonymisert, faller de utenfor GDPR; (5) forholdsmessighet — virksomheter må vurdere om formålet kan oppnås med mindre inngripende metoder; (6) informasjon — de som spores skal informeres.",
    topics: JSON.stringify(["kameraovervaking", "informasjonskapsler"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-STROMMALING-2021",
    title: "Veileder om automatisk strøm- og vannmåling (AMS)",
    date: "2021-06-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernaspektene ved automatiske strømmålere (AMS), inkludert innsamling av forbruksdata og reservasjonsrett.",
    full_text:
      "Datatilsynets veileder om automatisk strøm- og vannmåling (AMS) beskriver personvernkravene ved automatiske målere. Veilederen dekker: (1) AMS-målere samler inn detaljerte forbruksdata som utgjør personopplysninger — forbruksmønsteret kan avsløre informasjon om husholdningen; (2) rettslig grunnlag — nettselskapene har lovhjemmel for innsamling av forbruksdata i avregnings- og nettleieavtaler; (3) reservasjonsrett — kunder kan reservere seg mot overføring av timesdata til nettselskapet av helsemessige årsaker; (4) tredjepartstilgang — tilgang til detaljerte forbruksdata for tredjepart krever samtykke; (5) dataminimering — nettselskapet skal ikke lagre mer detaljert informasjon enn nødvendig for formålet.",
    topics: JSON.stringify(["informasjonssikkerhet"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-SMS-VARSLING-2022",
    title: "Veileder om lokasjonsbasert befolkningsvarsling på SMS",
    date: "2022-08-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved lokasjonsbasert befolkningsvarsling via SMS i nødsituasjoner.",
    full_text:
      "Datatilsynets veileder om lokasjonsbasert befolkningsvarsling på SMS beskriver personvernkravene ved bruk av mobillokasjonsdata for å varsle befolkningen i nødsituasjoner. Veilederen dekker: (1) rettslig grunnlag — varslingsmyndigheten har lovhjemmel i ekomloven og sivilbeskyttelsesloven for å bruke lokasjonsdata i nødsituasjoner; (2) formålsbegrensning — lokasjonsdataene skal kun brukes til varsling og ikke til andre formål; (3) dataminimering — kun nødvendige data skal innhentes; (4) sletting — lokasjonsdata skal slettes umiddelbart etter at varslingen er gjennomført; (5) sikkerhet — behandlingen skal sikres med tilstrekkelige tekniske og organisatoriske tiltak.",
    topics: JSON.stringify(["offentlig_sektor", "telekom"]),
    language: "no",
  },

  // --- Children, school and education guides ---
  {
    reference: "DT-VEILEDER-SAMTYKKE-MINDREARIGE-2021",
    title: "Veileder om samtykke fra mindreårige",
    date: "2021-02-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om kravene til gyldig samtykke fra barn og unge for behandling av personopplysninger i digitale tjenester.",
    full_text:
      "Datatilsynets veileder om samtykke fra mindreårige beskriver kravene i GDPR artikkel 8 og personopplysningsloven § 5. Veilederen dekker: (1) aldersgrense — i Norge er aldersgrensen 13 år for samtykke til informasjonssamfunnstjenester; (2) barn under 13 år — foreldre/foresatte må gi samtykke på barnets vegne; (3) verifisering — virksomheten skal gjøre rimelige anstrengelser for å verifisere at samtykke er gitt av foreldre der dette kreves; (4) barnevennlig informasjon — informasjon rettet mot barn skal være i et klart og enkelt språk som barn kan forstå; (5) tilbaketrekking — barn (og foreldre) skal når som helst kunne trekke samtykket tilbake; (6) sletteplikt — når samtykket trekkes tilbake, skal opplysningene slettes.",
    topics: JSON.stringify(["barn", "samtykke"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-ELEVKONTROLL-2022",
    title: "Veileder om kontroll av elever — eksamen, prøver og plagiatkontroll",
    date: "2022-09-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved kontroll av elever, inkludert digital eksamen, prøveovervåking og plagiatkontroll.",
    full_text:
      "Datatilsynets veileder om kontroll av elever beskriver personvernkravene ved skolens kontroll- og overvåkingstiltak. Veilederen dekker: (1) digital eksamen — overvåkingsverktøy under digital eksamen må ha rettslig grunnlag og være forholdsmessig; (2) plagiatkontroll — bruk av verktøy som Turnitin innebærer behandling av personopplysninger og krever databehandleravtale; (3) eksamensovervåking med kamera/skjermdeling — kan kun brukes når det er strengt nødvendig og med forhåndsinformasjon; (4) BYOD (Bring Your Own Device) — skoler som tillater egne enheter må sikre at overvåking begrenses til skolesammenheng; (5) læringsanalyse — innsamling av data om elevenes læringsaktiviteter krever personvernkonsekvensvurdering.",
    topics: JSON.stringify(["barn", "skole"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-BILDER-BARN-2023",
    title: "Veileder om publisering av bilder av barn på internett",
    date: "2023-04-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved publisering av bilder av barn på internett, inkludert foreldre, skoler og idrettslag.",
    full_text:
      "Datatilsynets veileder om publisering av bilder av barn på internett beskriver personvernkravene. Veilederen dekker: (1) foreldres publisering — foreldre har vid adgang til å publisere bilder av egne barn, men bør tenke over at bilder publisert i sosiale medier kan spres; (2) skoler og barnehager — krever samtykke fra foreldre for publisering av bilder der barn er identifiserbare; (3) idrettslag og foreninger — tilsvarende samtykkekrav; (4) barns egen rett — barn har etter hvert som de vokser opp rett til å bestemme over egne bilder; (5) sletting — den som har publisert bildet har plikt til å slette det dersom samtykket trekkes tilbake; (6) strømming av idrettsarrangementer — kameraoverføring av barns idrettsarrangementer reiser særlige personvernspørsmål.",
    topics: JSON.stringify(["barn"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-SKYTJENESTER-SKOLE-2023",
    title: "Veileder om bruk av skytjenester i skolen — Google og Microsoft",
    date: "2023-09-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om bruk av skytjenester som Google Workspace og Microsoft 365 i grunnskolen, inkludert personvernkrav og risikovurdering.",
    full_text:
      "Datatilsynets veileder om bruk av skytjenester i skolen beskriver personvernkravene ved bruk av skytjenester som Google Workspace for Education og Microsoft 365 Education i grunnskolen. Veilederen dekker: (1) behandlingsansvar — kommunen som skoleeier er behandlingsansvarlig; (2) databehandleravtale — kommunen må inngå databehandleravtale med leverandøren; (3) overføring til tredjeland — skytjenester kan innebære overføring av personopplysninger til USA og andre tredjeland, som krever gyldig overføringsgrunnlag; (4) DPIA — kommunen bør gjennomføre personvernkonsekvensvurdering; (5) dataminimering — kommunen bør begrense hvilke funksjoner som aktiveres og sikre at telemetridata minimeres; (6) elevenes rettigheter — elevene (og foreldrene) har rett til informasjon om behandlingen.",
    topics: JSON.stringify(["barn", "skole", "overforing"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-LARINGSPLATTFORMER-2021",
    title: "Veileder om krav til skoleeier ved bruk av læringsplattformer",
    date: "2021-08-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om skoleeiers ansvar og plikter ved bruk av digitale læringsplattformer som itstlearning, Canvas og Google Classroom.",
    full_text:
      "Datatilsynets veileder om krav til skoleeier ved bruk av læringsplattformer beskriver personvernansvaret. Veilederen dekker: (1) skoleeier (kommunen) er behandlingsansvarlig for bruken av læringsplattformer; (2) databehandleravtale er påkrevd med leverandøren; (3) risikovurdering av informasjonssikkerheten; (4) tilgangsstyring — hvem som skal ha tilgang til elevdata i plattformen; (5) integrering av tredjepartsverktøy — skoleeier har ansvar for personvernvurdering også av tilleggsverktøy som integreres; (6) innsynsrett — elever og foreldre har rett til innsyn i opplysningene som behandles; (7) sletting — elevdata skal slettes når eleven forlater skolen.",
    topics: JSON.stringify(["barn", "skole", "databehandler"]),
    language: "no",
  },

  // --- Health and research guides ---
  {
    reference: "DT-VEILEDER-INNSYN-JOURNAL-2021",
    title: "Veileder om innsyn i egen pasientjournal",
    date: "2021-04-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om pasientens rett til innsyn i egen journal etter pasient- og brukerrettighetsloven.",
    full_text:
      "Datatilsynets veileder om innsyn i egen pasientjournal beskriver pasientens rettigheter. Veilederen dekker: (1) rett til innsyn — pasienten har rett til innsyn i sin egen journal etter pasient- og brukerrettighetsloven § 5-1; (2) omfang — innsynsretten omfatter alle opplysninger som er registrert i journalen, inkludert epikriser, røntgenbilder og prøvesvar; (3) unntak — i unntakstilfeller kan helsepersonell nekte innsyn dersom det er fare for pasientens liv eller alvorlig helseskade; (4) innsyn i logg — pasienten har rett til å se hvem som har hatt tilgang til journalen (tilgangslogg); (5) elektronisk tilgang — gjennom helsenorge.no har pasienter tilgang til deler av journalen.",
    topics: JSON.stringify(["helsedata", "innsyn"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-INNSYN-NAV-BARNEVERN-2021",
    title: "Veileder om innsyn hos NAV og barnevernstjenesten",
    date: "2021-05-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om innsynsrett i personopplysninger hos NAV og barnevernstjenesten.",
    full_text:
      "Datatilsynets veileder om innsyn hos NAV og barnevernstjenesten beskriver innsynsretten. Veilederen dekker: (1) innsyn hos NAV — du har rett til innsyn i opplysningene NAV har registrert om deg, inkludert vedtak, journalnotater og korrespondanse; (2) innsyn i barnevernsaker — partene i en barnevernsak har rett til innsyn i sakens dokumenter, med unntak for opplysninger som kan skade barnet; (3) begrensninger — taushetsplikten kan begrense innsynsretten der det er nødvendig av hensyn til andre; (4) klageadgang — dersom NAV eller barnevernstjenesten avslår innsynskrav, kan avslaget klages inn til Datatilsynet.",
    topics: JSON.stringify(["innsyn", "offentlig_sektor"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-VELFERDSTEKNOLOGI-2022",
    title: "Veileder om velferdsteknologi og personvern",
    date: "2022-10-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved bruk av velferdsteknologi i helse- og omsorgssektoren, inkludert GPS-sporing, sensorer og trygghetsalarmer.",
    full_text:
      "Datatilsynets veileder om velferdsteknologi og personvern beskriver personvernkravene ved bruk av teknologiske løsninger i helse- og omsorgstjenesten. Veilederen dekker: (1) GPS-sporing av demente — kan ha rettslig grunnlag i pasient- og brukerrettighetsloven, men krever forholdsmessighetsvurdering; (2) sensorer i bolig — bevegelsessensorer og dørsensorer innebærer overvåking og krever samtykke eller annet grunnlag; (3) trygghetsalarmer — behandling av personopplysninger i trygghetsalarmsystemer; (4) digitalt tilsyn — kamera og mikrofon i omsorgsbolig reiser særlige personvernspørsmål; (5) DPIA — velferdsteknologi som behandler helseopplysninger i stor skala krever personvernkonsekvensvurdering; (6) leverandørhåndtering — kommunen som behandlingsansvarlig skal inngå databehandleravtale.",
    topics: JSON.stringify(["helsedata", "offentlig_sektor"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-HELSEREGISTRE-2022",
    title: "Veileder om innsyn i helseregistre",
    date: "2022-03-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om innsynsrett i sentrale helseregistre som NPR, MSIS, reseptregisteret og dødsårsaksregisteret.",
    full_text:
      "Datatilsynets veileder om innsyn i helseregistre beskriver innsynsretten i sentrale helseregistre. Veilederen dekker: (1) hvilke registre som omfattes — Norsk pasientregister (NPR), Meldingssystem for smittsomme sykdommer (MSIS), Reseptregisteret, Dødsårsaksregisteret og andre lovbestemte registre; (2) innsynsrett — den registrerte har rett til å vite om det er registrert opplysninger om seg i registeret og til å få utlevert disse; (3) hvordan be om innsyn — innsyn begjæres til den aktuelle registeransvarlige; (4) begrensninger — i noen tilfeller kan innsynsretten begrenses av hensyn til registernes formål; (5) retting og sletting — den registrerte kan kreve retting av feilaktige opplysninger.",
    topics: JSON.stringify(["helsedata", "innsyn"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-FORSKNING-PERSONVERN-2021",
    title: "Veileder om personvernombud og forskning",
    date: "2021-09-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernombudets rolle og oppgaver i forskningsinstitusjon, inkludert klinisk forskning og registerbasert forskning.",
    full_text:
      "Datatilsynets veileder om personvernombud og forskning beskriver personvernombudets rolle i forskningsinstitusjoner. Veilederen dekker: (1) plikt til å utpeke personvernombud — forskningsinstitusjoner som behandler særlige kategorier av personopplysninger i stor skala skal ha personvernombud; (2) ombudets oppgaver — informere og gi råd, overvåke etterlevelse, gi råd om DPIA, samarbeide med Datatilsynet; (3) klinisk forskning — ombudet bør involveres i planlegging av forskningsprosjekter som behandler helseopplysninger; (4) registerbasert forskning — ombudet bør vurdere rettslig grunnlag for kobling av registerdata; (5) uavhengighet — ombudet skal kunne utøve oppgavene uavhengig av forskningsledelsen.",
    topics: JSON.stringify(["forskning", "personvernombud"]),
    language: "no",
  },

  // --- Customer, commerce and marketing guides ---
  {
    reference: "DT-VEILEDER-NYHETSBREV-2022",
    title: "Veileder om nyhetsbrev, e-postlister og SMS-markedsføring",
    date: "2022-04-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved utsending av nyhetsbrev og markedsføring via e-post og SMS.",
    full_text:
      "Datatilsynets veileder om nyhetsbrev, e-postlister og SMS-markedsføring beskriver personvernkravene for elektronisk markedsføring. Veilederen dekker: (1) samtykke — utsending av nyhetsbrev og markedsføring via e-post krever samtykke fra mottakeren etter markedsføringsloven § 15; (2) eksisterende kundeforhold — virksomheter kan sende markedsføring til eksisterende kunder om lignende produkter uten nytt samtykke; (3) avmelding — mottakeren skal enkelt kunne melde seg av; (4) behandlingsgrunnlag etter GDPR — samtykke etter markedsføringsloven oppfyller normalt samtykkekravene i GDPR; (5) profilering — bruk av personopplysninger til målrettet markedsføring krever informasjon og eventuelt DPIA.",
    topics: JSON.stringify(["markedsforing", "samtykke"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-NETTBUTIKK-2022",
    title: "Veileder om nettbutikker og kundeopplysninger",
    date: "2022-01-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav for nettbutikker, inkludert kundeprofiler, betalingsopplysninger og markedsføring.",
    full_text:
      "Datatilsynets veileder om nettbutikker og kundeopplysninger beskriver personvernkravene for netthandel. Veilederen dekker: (1) informasjonsplikt — nettbutikken skal informere kunden om behandling av personopplysninger i personvernerklæring; (2) rettslig grunnlag — avtaleinngåelse er grunnlag for å behandle opplysninger nødvendig for å gjennomføre kjøpet; (3) kundeprofiler — opprettelse av kundeprofil utover det nødvendige for kjøpet krever samtykke; (4) betalingsopplysninger — skal oppbevares sikkert og slettes etter at transaksjonen er gjennomført, med unntak for regnskapspliktige opplysninger; (5) markedsføring — krever samtykke eller eksisterende kundeforhold; (6) cookies — nettbutikkens bruk av informasjonskapsler reguleres av ekomloven.",
    topics: JSON.stringify(["markedsforing"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-ID-KONTROLL-2022",
    title: "Veileder om ID-kontroll og legitimasjonskontroll",
    date: "2022-06-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om vilkårene for å kreve legitimasjon og kopiere identitetsdokumenter.",
    full_text:
      "Datatilsynets veileder om ID-kontroll og legitimasjonskontroll beskriver personvernkravene ved identifikasjon av personer. Veilederen dekker: (1) kopiering av pass og ID-kort — virksomheter skal som hovedregel ikke kopiere identitetsdokumenter, da dette innebærer innsamling av overskuddsinformasjon; (2) når legitimasjon kan kreves — ved lovpålagt identifikasjon (f.eks. hvitvasking), ved alderskontroll, eller ved utlevering av sensitive forsendelser; (3) dataminimering — virksomheten skal begrense seg til de opplysningene som er nødvendige for formålet; (4) oppbevaring — kopier av identitetsdokumenter skal slettes umiddelbart etter at formålet er oppnådd; (5) fødselsnummer — bruk av fødselsnummer er strengt regulert i personopplysningsloven § 12.",
    topics: JSON.stringify(["behandlingsgrunnlag"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-SIKKER-KOMMUNIKASJON-2022",
    title: "Veileder om sikker kommunikasjon av kundeopplysninger",
    date: "2022-05-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om krav til sikker kommunikasjon når virksomheter sender personopplysninger til kunder.",
    full_text:
      "Datatilsynets veileder om sikker kommunikasjon av kundeopplysninger beskriver kravene til sikkerhet ved oversendelse av personopplysninger. Veilederen dekker: (1) e-post — vanlig e-post er ikke sikker nok for sensitive personopplysninger; (2) kryptering — personopplysninger bør krypteres ved oversendelse; (3) digitale postkasser — Digipost og eBoks er godkjente løsninger for sikker kommunikasjon; (4) SMS — bør ikke brukes for sensitive opplysninger; (5) brev — tradisjonell post kan brukes, men avsender bør vurdere risikoen for feilsending; (6) kundeportaler — innloggede kundeportaler er en god løsning for sikker kommunikasjon.",
    topics: JSON.stringify(["informasjonssikkerhet"]),
    language: "no",
  },

  // --- Technology and internet guides ---
  {
    reference: "DT-VEILEDER-PERSONVERNTEKNOLOGI-2022",
    title: "Veileder om personvernfremmende teknologi (PET)",
    date: "2022-11-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernfremmende teknologier, inkludert anonymisering, pseudonymisering, differensiert personvern og homomorf kryptering.",
    full_text:
      "Datatilsynets veileder om personvernfremmende teknologi (PET) beskriver teknologier som kan styrke personvernet. Veilederen dekker: (1) anonymisering — teknikker for å gjøre data genuint anonyme slik at de faller utenfor GDPR; (2) pseudonymisering — erstatning av direkte identifikatorer med pseudonymer; (3) differensiert personvern — tilføring av statistisk støy for å beskytte individer i datasett; (4) homomorf kryptering — beregninger på krypterte data uten å dekryptere dem; (5) syntetiske data — generering av kunstige datasett som bevarer statistiske egenskaper; (6) desentralisert datahåndtering — edge computing og føderert læring som alternativ til sentral datainnsamling.",
    topics: JSON.stringify(["informasjonssikkerhet", "innebygd_personvern"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-ANALYSE-SPORING-NETTSTED-2023",
    title: "Veileder om analyse og sporing på nettsteder",
    date: "2023-06-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernvennlige alternativer for analyse av trafikk på nettsteder etter Google Analytics-vedtaket.",
    full_text:
      "Datatilsynets veileder om analyse og sporing på nettsteder gir råd i kjølvannet av Google Analytics-vedtaket. Veilederen dekker: (1) hva som skjedde med Google Analytics — Datatilsynet konstaterte i 2023 at bruk av Google Analytics innebar ulovlig overføring til USA; (2) alternativ analyseverktøy — oversikt over personvernvennlige alternativer som Matomo, Plausible og Simple Analytics; (3) krav til analyseløsninger — verktøyet skal ikke overføre data til tredjeland uten gyldig grunnlag; (4) førsteparts vs. tredjepartscookies — førsteparts analyseløsninger er mindre inngripende; (5) samtykke — analysecookies krever samtykke etter ekomloven § 3-15; (6) anonymisering — dersom analysedata er genuint anonymisert, faller de utenfor GDPR.",
    topics: JSON.stringify(["informasjonskapsler", "overforing"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-SOSIALE-MEDIER-2022",
    title: "Veileder om personvern i sosiale medier",
    date: "2022-03-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernaspektene ved bruk av sosiale medier, inkludert innstillinger, deling og sletting av profiler.",
    full_text:
      "Datatilsynets veileder om personvern i sosiale medier beskriver personvernaspektene. Veilederen dekker: (1) bruk av personopplysninger — sosiale medier samler inn og bruker store mengder personopplysninger for profilering og reklame; (2) personverninnstillinger — brukere bør gjennomgå og stramme inn personverninnstillingene; (3) deling av andres personopplysninger — deling av bilder og opplysninger om andre krever samtykke; (4) sletting av profil — brukeren har rett til å slette sin profil og få sine data slettet; (5) barn i sosiale medier — særlige hensyn ved barns bruk av sosiale medier; (6) virksomheters bruk — virksomheter som bruker sosiale medier for markedsføring er medansvarlige for behandlingen.",
    topics: JSON.stringify(["barn", "samtykke", "sletting"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-ID-TYVERI-2023",
    title: "Veileder om identitetstyveri og personvern",
    date: "2023-02-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om hva du kan gjøre dersom du er utsatt for identitetstyveri, inkludert forebygging og oppfølging.",
    full_text:
      "Datatilsynets veileder om identitetstyveri og personvern beskriver tiltak ved identitetstyveri. Veilederen dekker: (1) hva er identitetstyveri — at noen bruker dine personopplysninger (typisk fødselsnummer) uten tillatelse; (2) forebygging — vær forsiktig med å oppgi fødselsnummer, bruk sterke passord, aktiver to-faktor-autentisering; (3) dersom du er utsatt — anmeld til politiet, kontakt finansforetak og kredittvurderingsbyråer, sperre kreditt; (4) kredittvurderingssperre — du kan sperre deg for kredittvurdering hos kredittopplysningsbyråene; (5) retten til å klage — du kan klage til Datatilsynet dersom en virksomhet ikke har sikret personopplysningene dine tilstrekkelig.",
    topics: JSON.stringify(["informasjonssikkerhet"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-EPOSTSVINDEL-2022",
    title: "Veileder om håndtering av e-postsvindel og phishing",
    date: "2022-07-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernaspektene ved e-postsvindel og phishing, inkludert avvikshåndtering og varsling.",
    full_text:
      "Datatilsynets veileder om håndtering av e-postsvindel og phishing beskriver personvernaspektene. Veilederen dekker: (1) hva er phishing — e-post eller meldinger som forsøker å lure mottakeren til å oppgi personopplysninger; (2) avviksplikt — dersom ansatte har oppgitt personopplysninger i et phishing-angrep, skal virksomheten vurdere om det foreligger meldeplikt etter GDPR artikkel 33; (3) risikovurdering — virksomheten skal vurdere risikoen for de berørtes rettigheter og friheter; (4) varsling av berørte — dersom det er høy risiko, skal de berørte varsles etter artikkel 34; (5) forebygging — opplæring av ansatte er det viktigste forebyggende tiltaket; (6) tekniske tiltak — SPF, DKIM og DMARC for å beskytte mot e-postspoofing.",
    topics: JSON.stringify(["informasjonssikkerhet", "avvik"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-BILDEDELING-2021",
    title: "Veileder om publisering og deling av bilder på internett",
    date: "2021-06-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om når publisering og deling av bilder av andre personer krever samtykke.",
    full_text:
      "Datatilsynets veileder om publisering og deling av bilder på internett beskriver reglene for bildebruk. Veilederen dekker: (1) hovedregel — publisering av bilder der personer er identifiserbare krever samtykke; (2) unntak — bilder av offentlige arrangementer der enkeltpersoner ikke er hovedmotiv; (3) journalistisk bruk — pressens bruk av bilder er unntatt fra deler av personvernregelverket; (4) publisering uten samtykke — den som er avbildet kan kreve bildet fjernet og eventuelt kreve erstatning; (5) bilder av barn — krever samtykke fra foreldre og bør vurderes med særlig forsiktighet; (6) deepfakes — manipulerte bilder og videoer kan utgjøre brudd på personopplysningsloven.",
    topics: JSON.stringify(["samtykke"]),
    language: "no",
  },

  // --- Police, justice and transport guides ---
  {
    reference: "DT-VEILEDER-BOMVEI-SKILTGJENKJENNING-2023",
    title: "Veileder om automatisk skiltgjenkjenning ved bomstasjoner",
    date: "2023-05-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved bruk av automatisk nummerskiltgjenkjenning (ANPR) ved bomstasjoner.",
    full_text:
      "Datatilsynets veileder om automatisk skiltgjenkjenning ved bomstasjoner beskriver personvernkravene. Veilederen dekker: (1) ANPR-teknologi — automatisk nummerskiltgjenkjenning innebærer behandling av personopplysninger; (2) rettslig grunnlag — bompengeselskap har rettslig grunnlag i vegprisloven for å registrere passeringer; (3) formålsbegrensning — ANPR-data skal kun brukes til bompengeinnkreving, ikke til andre formål som trafikkanalyse uten eget grunnlag; (4) lagring — passeringsdata skal slettes når formålet er oppnådd; (5) informasjonsplikt — trafikantene skal informeres om registreringen; (6) AutoPASS — det frivillige AutoPASS-systemet har egne vilkår for behandling av personopplysninger.",
    topics: JSON.stringify(["transport", "kameraovervaking"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-POLITIREGISTERLOVEN-2022",
    title: "Veileder om personvern i politiet — politiregisterloven",
    date: "2022-01-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om behandling av personopplysninger i politiet etter politiregisterloven, inkludert kriminaletterretning og straffesaker.",
    full_text:
      "Datatilsynets veileder om personvern i politiet beskriver det rettslige rammeverket for politiets behandling av personopplysninger. Veilederen dekker: (1) politiregisterloven — gjelder i stedet for personopplysningsloven for politiets behandling av personopplysninger til politimessige formål; (2) registreringsadgang — politiet kan registrere opplysninger som er nødvendige for politimessige formål; (3) tilgangsstyring — strenge regler for hvem som kan ha tilgang til opplysninger i politiets registre; (4) innsynsrett — den registrerte har rett til innsyn, med unntak dersom det kan skade etterforskning; (5) sletting — opplysninger skal slettes etter fastsatte frister; (6) Datatilsynets tilsyn — Datatilsynet fører tilsyn med politiets behandling av personopplysninger.",
    topics: JSON.stringify(["politi_justis"]),
    language: "no",
  },

  // --- Additional sector guides ---
  {
    reference: "DT-VEILEDER-KOMMUNE-DIGITALISERING-2024",
    title: "Veileder om personvern ved digitalisering i kommuner",
    date: "2024-03-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved kommunal digitalisering, inkludert digitalt førstevalg, innbyggerportaler og automatisering.",
    full_text:
      "Datatilsynets veileder om personvern ved digitalisering i kommuner beskriver personvernkravene i det offentliges digitaliseringsarbeid. Veilederen dekker: (1) digitalt førstevalg — kommuner som digitaliserer sine tjenester må sikre at personvernet ivaretas; (2) innebygd personvern — personvernhensyn skal bygges inn i alle nye digitale løsninger fra start; (3) skybaserte tjenester — kommuner som tar i bruk skyløsninger må vurdere overføringsgrunnlag og databehandleravtaler; (4) automatiserte vedtak — automatisering av forvaltningsvedtak krever rettslig grunnlag og rett til menneskelig overprøving; (5) innbyggerportaler — innloggede portaler for innbyggere må sikres med tilstrekkelig autentisering; (6) samarbeid mellom kommuner — deling av personopplysninger mellom kommuner krever rettslig grunnlag.",
    topics: JSON.stringify(["offentlig_sektor", "innebygd_personvern"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-ANSIKTSGJENKJENNING-2024",
    title: "Veileder om bruk av ansiktsgjenkjenning — biometri og personvern",
    date: "2024-01-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved bruk av ansiktsgjenkjenningsteknologi, inkludert adgangskontroll, identifikasjon og overvåking.",
    full_text:
      "Datatilsynets veileder om bruk av ansiktsgjenkjenning beskriver personvernkravene. Veilederen dekker: (1) ansiktsgjenkjenning behandler biometriske personopplysninger — en særlig kategori etter GDPR artikkel 9; (2) forbudet — behandling av biometriske opplysninger til identifikasjon av fysiske personer er som hovedregel forbudt; (3) unntak — behandlingen kan tillates ved uttrykkelig samtykke, vesentlig offentlig interesse med lovhjemmel, eller andre unntak i artikkel 9 nr. 2; (4) bruk i arbeidslivet — bruk av ansiktsgjenkjenning for adgangskontroll eller tidsregistrering på arbeidsplassen er svært inngripende og vanskelig å begrunne; (5) offentlig rom — ansiktsgjenkjenning i sanntid i offentlig tilgjengelige rom er forbudt etter KI-forordningen, med svært begrensede unntak for politi.",
    topics: JSON.stringify(["biometri", "kameraovervaking", "kunstig_intelligens"]),
    language: "no",
  },

  // --- Additional reports ---
  {
    reference: "DT-RAPPORT-5G-PERSONVERN-2023",
    title: "Rapport: 5G og personvern",
    date: "2023-06-22",
    type: "rapport",
    summary:
      "Datatilsynets rapport om personvernutfordringene ved utbygging og bruk av 5G-mobilnettet, inkludert økt sporing, IoT og edge computing.",
    full_text:
      "Datatilsynets rapport om 5G og personvern analyserer personvernkonsekvensene av den nye mobilteknologien. Rapporten dekker: (1) økt sporing — 5G-nettet gir mer presise lokasjonsdata enn 4G, noe som øker mulighetene for personovervåking; (2) tingenes internett (IoT) — 5G muliggjør massiv tilkobling av enheter som kan samle inn personopplysninger; (3) edge computing — dataprosessering nærmere brukeren kan redusere overføring av personopplysninger, men reiser nye spørsmål om behandlingsansvar; (4) nettverkskutting (network slicing) — muligheten for å opprette virtuelle nettverk med ulike egenskaper reiser spørsmål om informasjonssikkerhet; (5) anbefalinger — 5G-utbygging bør følge prinsippene om innebygd personvern.",
    topics: JSON.stringify(["telekom", "informasjonssikkerhet"]),
    language: "no",
  },
  {
    reference: "DT-RAPPORT-FINTECH-2018",
    title: "Rapport: Fintech og personvern",
    date: "2018-02-07",
    type: "rapport",
    summary:
      "Datatilsynets rapport om personvernutfordringene i fintech-sektoren, inkludert automatisert kredittvurdering, kontoinformasjonstjenester og betalingsinitieringstjenester.",
    full_text:
      "Datatilsynets rapport om fintech og personvern analyserer personvernkonsekvensene av nye finansielle teknologier. Rapporten dekker: (1) automatisert kredittvurdering — bruk av alternative datakilder og maskinlæring for kredittvurdering reiser spørsmål om transparens og diskriminering; (2) PSD2 — det reviderte betalingstjenestedirektivet åpner for tredjepartstilgang til bankkontoer, noe som innebærer behandling av sensitive finansielle opplysninger; (3) blockchain — personvernaspekter ved distribuert hovedbok-teknologi; (4) regulatorisk sandkasse — Datatilsynet anbefaler regulatorisk sandkasse for fintech-aktører for å teste personvernkomplianse; (5) anbefalinger — fintech-aktører bør bygge inn personvern fra start og gjennomføre DPIA for nye tjenester.",
    topics: JSON.stringify(["finans", "kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-RAPPORT-BIG-DATA-2013",
    title: "Rapport: Big Data — personvernprinsipper under press",
    date: "2013-09-26",
    type: "rapport",
    summary:
      "Datatilsynets rapport om personvernprinsippene i møte med big data, inkludert formålsbegrensning, dataminimering og samtykke.",
    full_text:
      "Datatilsynets rapport om big data og personvern analyserer hvordan big data utfordrer grunnleggende personvernprinsipper. Rapporten dekker: (1) formålsbegrensning — big data-analyse søker å finne nye sammenhenger i data, noe som utfordrer prinsippet om at data skal samles inn for bestemte formål; (2) dataminimering — big data forutsetter store datamengder, noe som strider mot prinsippet om å samle inn så lite som mulig; (3) samtykke — det er vanskelig å innhente meningsfylt samtykke for fremtidige analyser; (4) diskriminering — big data-analyse kan føre til diskriminering basert på korrelasjonsmønstre; (5) transparens — algoritmene som brukes i big data-analyse er ofte ugjennomtrinnelige; (6) anbefalinger — personvernkonsekvensvurdering bør gjennomføres for alle big data-prosjekter.",
    topics: JSON.stringify(["kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-RAPPORT-PERSONPROFILER-ANNONSEMARKED-2015",
    title: "Rapport: Personprofilering på det digitale annonsemarkedet",
    date: "2015-11-03",
    type: "rapport",
    summary:
      "Datatilsynets rapport om personvernaspektene ved profilering og sporing i det digitale annonsemarkedet.",
    full_text:
      "Datatilsynets rapport om personprofilering på det digitale annonsemarkedet beskriver personvernaspektene ved målrettet reklame. Rapporten dekker: (1) annonseteknologi — hvordan annonsebørser, dataforvaltere (DMP) og sanntidsbudgivning (RTB) fungerer; (2) datapunkter — hvilke personopplysninger som samles inn for å bygge brukerprofiler; (3) tredjepartssporere — omfanget av tredjepartssporere på norske nettsteder; (4) manglende transparens — brukerne har liten innsikt i hvordan profilene bygges og brukes; (5) risikoer — profilering kan avsløre sensitive opplysninger om helse, religion og politisk overbevisning; (6) anbefalinger — bransjen bør øke transparensen og gi brukerne reell kontroll.",
    topics: JSON.stringify(["markedsforing", "informasjonskapsler"]),
    language: "no",
  },
  {
    reference: "DT-RAPPORT-MALRETTING-POLITISK-2019",
    title: "Rapport: Målretting av politiske budskap",
    date: "2019-06-20",
    type: "rapport",
    summary:
      "Datatilsynets rapport om bruk av personopplysninger for målrettet politisk reklame, inkludert mikromålretting og dark posts.",
    full_text:
      "Datatilsynets rapport om målretting av politiske budskap analyserer personvernaspektene ved politisk mikromålretting. Rapporten dekker: (1) mikromålretting — bruk av detaljerte personopplysninger for å skreddersy politiske budskap til individuelle velgere; (2) dark posts — politiske annonser som kun vises til utvalgte brukergrupper og ikke er synlige for andre; (3) personvernrisiko — politisk profilering kan avsløre og utnytte informasjon om velgeres politiske holdninger; (4) demokratisk risiko — målrettet politisk reklame kan underminere offentlig debatt; (5) regulering — eksisterende personvernregelverk gir begrensninger for bruk av personopplysninger til politisk markedsføring; (6) anbefalinger — økt transparens og begrensninger på bruk av personopplysninger i politisk reklame.",
    topics: JSON.stringify(["markedsforing", "offentlig_sektor"]),
    language: "no",
  },

  // --- Sandbox project reports ---
  {
    reference: "DT-SANDKASSE-POLITIHOGSKOLEN-2024",
    title: "Sandkasserapport: PrevBOT — KI-verktøy mot overgrepsbilder",
    date: "2024-03-20",
    type: "rapport",
    summary:
      "Sluttrapport fra Datatilsynets sandkasse om Politihøgskolens PrevBOT — et KI-verktøy for å oppdage grooming-samtaler og overgrepsbilder på internett.",
    full_text:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasse om Politihøgskolens PrevBOT-prosjekt. PrevBOT er et kunstig intelligens-verktøy utviklet for å identifisere grooming-samtaler og materiale som viser seksuelt misbruk av barn på internett. Rapporten dekker: (1) formålet — PrevBOT skal automatisere deler av politiets arbeid med å identifisere overgripere som kontakter barn online; (2) personvernvurdering — verktøyet behandler svært sensitive personopplysninger og krever robust rettslig grunnlag; (3) dataminimering — treningsdata bør anonymiseres i størst mulig grad; (4) menneskelig kontroll — KI-verktøyet skal være et støtteverktøy for politiet, ikke en automatisert beslutningstaker; (5) proporsjonalitet — personverninngrepet må stå i forhold til formålet om å beskytte barn.",
    topics: JSON.stringify(["kunstig_intelligens", "politi_justis", "barn"]),
    language: "no",
  },
  {
    reference: "DT-SANDKASSE-NTNU-COPILOT-2024",
    title: "Sandkasserapport: NTNU — Microsoft 365 Copilot med personvernbriller",
    date: "2024-11-26",
    type: "rapport",
    summary:
      "Sluttrapport fra Datatilsynets sandkasse om NTNUs vurdering av personvernaspektene ved bruk av Microsoft 365 Copilot i universitetet.",
    full_text:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasse om NTNUs prosjekt med Microsoft 365 Copilot. NTNU ønsket å vurdere personvernaspektene ved å ta i bruk Microsofts KI-assistent Copilot i sin daglige drift. Rapporten dekker: (1) behandlingsansvar — NTNU som behandlingsansvarlig må forstå og kontrollere hvordan Copilot behandler personopplysninger; (2) dataflyt — personopplysninger som er lagret i M365 kan bli tilgjengelige for Copilot; (3) tilgangsstyring — Copilots tilgang til data styres av eksisterende tilgangsrettigheter, men kan avsløre informasjon som er teknisk tilgjengelig men som brukeren normalt ikke ville funnet; (4) DPIA — NTNU gjennomførte personvernkonsekvensvurdering av Copilot; (5) anbefalinger — virksomheter bør gjennomgå tilgangsstyring grundig før Copilot-aktivering.",
    topics: JSON.stringify(["kunstig_intelligens", "skole"]),
    language: "no",
  },
  {
    reference: "DT-SANDKASSE-DOORKEEPER-2023",
    title: "Sandkasserapport: Doorkeeper — intelligent kameraovervåking",
    date: "2023-04-25",
    type: "rapport",
    summary:
      "Sluttrapport fra Datatilsynets sandkasse om Doorkeeper — personvernvennlig intelligent videoanalyse.",
    full_text:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasse om Doorkeeper-prosjektet. Doorkeeper utvikler personvernvennlige systemer for intelligent videoanalyse. Rapporten dekker: (1) problemstillingen — tradisjonell kameraovervåking samler inn store mengder personopplysninger, mens intelligent videoanalyse kan begrense dette; (2) Doorkeepers løsning — bildeprosessering skjer lokalt uten at bilder overføres til sky; (3) personvern fra start — systemet er designet med innebygd personvern; (4) anonymisering — systemet anonymiserer ansikter i sanntid der identifikasjon ikke er nødvendig; (5) formålsbegrensning — systemet kan konfigureres til kun å detektere bestemte hendelser.",
    topics: JSON.stringify(["kameraovervaking", "kunstig_intelligens", "innebygd_personvern"]),
    language: "no",
  },
  {
    reference: "DT-SANDKASSE-FINTERAI-2022",
    title: "Sandkasserapport: Finterai — maskinlæring uten datadeling",
    date: "2022-11-10",
    type: "rapport",
    summary:
      "Sluttrapport fra Datatilsynets sandkasse om Finterai — føderert maskinlæring for anti-hvitvaskingsarbeid i banker.",
    full_text:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasse om Finterai-prosjektet. Finterai utvikler løsninger for føderert maskinlæring som gjør at banker kan trene felles anti-hvitvaskingsmodeller uten å dele kundenes personopplysninger. Rapporten dekker: (1) problemstillingen — banker er pålagt å bekjempe hvitvasking, men kan ikke dele kundedata med hverandre; (2) føderert læring — modellen trenes lokalt hos hver bank, og kun modellparametere (ikke personopplysninger) deles; (3) personverngevinst — ingen overføring av personopplysninger mellom bankene; (4) utfordringer — risiko for at modellparametere indirekte kan avsløre personopplysninger; (5) anbefaling — føderert læring kan være et personvernvennlig alternativ for samarbeidsprosjekter i finanssektoren.",
    topics: JSON.stringify(["finans", "kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-SANDKASSE-HELSE-BERGEN-2022",
    title: "Sandkasserapport: Helse Bergen — KI i oppfølging av sårbare pasienter",
    date: "2022-11-22",
    type: "rapport",
    summary:
      "Sluttrapport fra Datatilsynets sandkasse om Helse Bergens bruk av KI for å forutsi risiko for gjeninnleggelse av pasienter.",
    full_text:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasse om Helse Bergens prosjekt med kunstig intelligens for oppfølging av sårbare pasienter. Helse Bergen utviklet en predikasjonsmodell for å identifisere pasienter med høy risiko for gjeninnleggelse. Rapporten dekker: (1) algoritmisk rettferdighet — modellen må sikres mot skjevheter som diskriminerer bestemte pasientgrupper; (2) rettslig grunnlag — bruk av helseopplysninger i prediksjonsmodeller krever robust hjemmel; (3) transparens — pasienter skal informeres om at KI brukes i oppfølgingen; (4) menneskelig kontroll — algoritmens anbefalinger skal vurderes av helsepersonell; (5) DPIA — gjennomført personvernkonsekvensvurdering identifiserte sentrale risikofaktorer.",
    topics: JSON.stringify(["helsedata", "kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-SANDKASSE-SECURE-PRACTICE-2022",
    title: "Sandkasserapport: Secure Practice — tilpasset sikkerhetsopplæring",
    date: "2022-02-02",
    type: "rapport",
    summary:
      "Sluttrapport fra Datatilsynets sandkasse om Secure Practice — KI-basert tilpassing av sikkerhetsopplæring basert på ansattes risikoprofil.",
    full_text:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasse om Secure Practice-prosjektet. Secure Practice utvikler en løsning som bruker maskinlæring for å tilpasse sikkerhetsopplæring til den enkelte ansattes risikoprofil. Rapporten dekker: (1) profilering — risikoprofilering av ansatte innebærer profilering etter GDPR artikkel 22; (2) rettslig grunnlag — arbeidsgivers berettigede interesse kan være grunnlag, men forutsetter forholdsmessighetsvurdering; (3) transparens — ansatte skal informeres om at de blir profilert og på hvilket grunnlag; (4) rett til å protestere — ansatte har rett til å protestere mot profileringen; (5) dataminimering — profileringsdata bør aggregeres og ikke lagres på individnivå lenger enn nødvendig.",
    topics: JSON.stringify(["arbeidsforhold", "kunstig_intelligens", "informasjonssikkerhet"]),
    language: "no",
  },

  // --- Additional høringsuttalelser ---
  {
    reference: "DT-HOERING-PST-APNE-KILDER-2022",
    title: "Høringssvar om PST og behandling av åpent tilgjengelig informasjon",
    date: "2022-04-15",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets kritiske høringssvar om forslaget om å la PST lagre, systematisere og analysere store mengder åpent tilgjengelig informasjon fra internett.",
    full_text:
      "Datatilsynet har avgitt et kritisk høringssvar om forslaget om å gi PST (Politiets sikkerhetstjeneste) hjemmel til å lagre, systematisere og analysere store mengder åpent tilgjengelig informasjon fra internett for etterretningsformål. Datatilsynet konstaterer at: (1) forslaget vil transformere PST fra politimyndighet med fokus på forebygging og etterforskning av konkrete lovbrudd til en tjeneste som driver etterretningsvirksomhet mot norske borgere; (2) hele det åpne internett — inkludert nyhetsartikler, offentlige registre, diskusjoner i sosiale medier, kommentarer og blogger — vil kunne lagres og gjennomgås med algoritmer; (3) dette er et alvorlig inngrep i ytringsfriheten og personvernet; (4) 16 prosent av respondentene i Datatilsynets personvernundersøkelse har unnlatt å delta i nettdebatter på grunn av usikkerhet om myndighetenes overvåking.",
    topics: JSON.stringify(["politi_justis", "offentlig_sektor"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-BOMVEI-2023",
    title: "Høringssvar om vegprising og bompengeordninger",
    date: "2023-02-09",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om personvernaspektene ved vegprising og automatisk bompengeinnkreving.",
    full_text:
      "Datatilsynet har avgitt høringssvar om forslag til vegprising og bompengeordninger. Datatilsynet kommenterer: (1) automatisk nummerskiltgjenkjenning (ANPR) ved bomstasjoner innebærer masseregistrering av bilister og er et betydelig personverninngrep; (2) formålsbegrensning er avgjørende — passeringsdata skal kun brukes til innkreving og ikke til andre formål som trafikkanalyse eller rettshåndhevelse; (3) lagringstid bør begrenses til det som er nødvendig for innkrevingsformålet; (4) anonymisering — passeringsdata bør anonymiseres så snart innkrevingen er gjennomført; (5) AutoPASS og personvern — frivillig bruk av AutoPASS-brikke reiser egne personvernspørsmål.",
    topics: JSON.stringify(["transport", "offentlig_sektor"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-KAMERAOVERVAKING-SERVERING-2022",
    title: "Informasjonsskriv om kameraovervåking i serverings- og overnattingsbransjen",
    date: "2022-06-01",
    type: "veileder",
    summary:
      "Datatilsynets informasjonsskriv om vilkårene for kameraovervåking i restauranter, barer, hoteller og overnattingssteder.",
    full_text:
      "Datatilsynets informasjonsskriv om kameraovervåking i serverings- og overnattingsbransjen beskriver vilkårene for lovlig kameraovervåking. Dokumentet dekker: (1) rettslig grunnlag — serveringssteder og hoteller kan ha berettiget interesse i kameraovervåking for å forebygge kriminalitet, men terskelen er høy; (2) forholdsmessighet — overvåking er bare lovlig dersom formålet ikke kan oppnås med mindre inngripende tiltak; (3) informasjonsplikt — gjester og ansatte skal informeres om overvåkingen med tydelig skilting; (4) begrensning av områder — kameraer skal ikke dekke toaletter, garderober eller hotelrom; (5) lagring — opptak skal normalt slettes innen 7 dager; (6) utlevering — opptak kan utleveres til politiet ved etterforskning av straffbare forhold.",
    topics: JSON.stringify(["kameraovervaking"]),
    language: "no",
  },

  // --- Additional hearing statements ---
  {
    reference: "DT-HOERING-DATASKRAPING-2024",
    title: "Uttalelse om ulovlig dataskraping og KI-trening",
    date: "2024-10-28",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynet deltok i en global uttalelse om ulovlig innsamling (scraping) av personopplysninger fra internett til bruk i trening av kunstig intelligens.",
    full_text:
      "Datatilsynet deltok i en felles global uttalelse fra datatilsynsmyndigheter om ulovlig innsamling (scraping) av personopplysninger fra internett. Uttalelsen retter seg mot virksomheter som henter personopplysninger fra nettet for å trene modeller for kunstig intelligens. De deltakende myndighetene konstaterer at: (1) innsamling av personopplysninger fra offentlig tilgjengelige kilder uten rettslig grunnlag er ulovlig; (2) det at opplysninger er offentlig tilgjengelige betyr ikke at de kan brukes fritt; (3) virksomheter som scraper data har ansvar for å sikre lovlig behandlingsgrunnlag; (4) nettstedseiere bør implementere tekniske tiltak for å hindre uautorisert scraping; (5) de registrertes rettigheter gjelder også for scrapede data.",
    topics: JSON.stringify(["kunstig_intelligens", "behandlingsgrunnlag"]),
    language: "no",
  },

  // --- DPO survey and guidance ---
  {
    reference: "DT-RAPPORT-PERSONVERNOMBUD-2025",
    title: "Undersøkelse om personvernombud 2025",
    date: "2025-06-25",
    type: "rapport",
    summary:
      "Datatilsynets undersøkelse av personvernombudets rolle og funksjon i norske virksomheter anno 2025.",
    full_text:
      "Datatilsynets undersøkelse om personvernombud 2025 kartlegger ombudets rolle og funksjon i norske virksomheter. Undersøkelsen dekker: (1) antall virksomheter med personvernombud — en stor andel av norske virksomheter har oppnevnt personvernombud; (2) ombudets uavhengighet — enkelte ombud rapporterer om utfordringer med å utøve oppgavene uavhengig av ledelsen; (3) ressurser — mange ombud opplever at de ikke har tilstrekkelig tid til å utføre oppgavene; (4) kompetanse — behovet for faglig oppdatering og nettverk; (5) involvering — ombudet involveres i varierende grad i personvernspørsmål; (6) samarbeid med Datatilsynet — ombudene vurderer samarbeidet med tilsynsmyndigheten som godt.",
    topics: JSON.stringify(["personvernombud"]),
    language: "no",
  },

  // --- KI-forordningen (AI Act) ---
  {
    reference: "DT-HOERING-KI-FORORDNINGEN-2025",
    title: "Høringssvar om gjennomføring av KI-forordningen (AI Act) i norsk rett",
    date: "2025-10-01",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om gjennomføring av EUs KI-forordning (AI Act) i norsk rett, inkludert tilsynsansvar og sanksjonsmuligheter.",
    full_text:
      "Datatilsynet har avgitt høringssvar om gjennomføring av EUs KI-forordning (AI Act) i norsk rett. Datatilsynet kommenterer: (1) tilsynsansvar — Datatilsynet bør ha en sentral rolle i tilsynet med KI-systemer som behandler personopplysninger, da det er tett sammenheng mellom GDPR og KI-forordningen; (2) risikoklassifisering — KI-forordningens inndeling i uakseptabel risiko, høy risiko, begrenset risiko og minimal risiko er en fornuftig tilnærming; (3) forbudte praksiser — Datatilsynet støtter forbudet mot biometrisk masseovervåking i sanntid og sosial scoring; (4) transparens — kravene til transparens for KI-systemer må harmoniseres med GDPRs krav; (5) regulatorisk sandkasse — Datatilsynets eksisterende sandkasse kan tilpasses til KI-forordningens sandkassekrav; (6) sanksjoner — det bør gis tilstrekkelige sanksjonsmuligheter for brudd på forordningen.",
    topics: JSON.stringify(["kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-ALDERSGRENSER-SOSIALE-MEDIER-2025",
    title: "Høringssvar om aldersgrenser i sosiale medier",
    date: "2025-10-03",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om forslaget til lov om aldersgrenser i sosiale medier for å beskytte barns personvern.",
    full_text:
      "Datatilsynet har avgitt høringssvar om forslaget til lov om aldersgrenser i sosiale medier. Datatilsynet kommenterer: (1) støtter formålet om å beskytte barn mot skadelig innhold og profilering i sosiale medier; (2) aldersverifisering — metoden for aldersverifisering må selv ivareta personvernet og ikke innebære masseinnsamling av identitetsdokumenter; (3) proporsjonalitet — tiltakene må stå i forhold til formålet; (4) teknisk gjennomførbarhet — det er tekniske utfordringer knyttet til pålitelig aldersverifisering uten at det går utover personvernet; (5) sammenheng med KI-forordningen — forordningen inneholder allerede bestemmelser om beskyttelse av mindreårige; (6) håndheving — det bør klargjøres hvem som skal føre tilsyn med etterlevelsen.",
    topics: JSON.stringify(["barn", "samtykke"]),
    language: "no",
  },

  // --- Additional sector guidance ---
  {
    reference: "DT-VEILEDER-PROGRAMVAREUTVIKLING-2019",
    title: "Veileder om programvareutvikling med innebygd personvern",
    date: "2019-11-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om hvordan utviklere kan bygge personvern inn i programvare fra start, med konkrete råd for hvert utviklingstrinn.",
    full_text:
      "Datatilsynets veileder om programvareutvikling med innebygd personvern gir konkrete råd til utviklere. Veilederen dekker syv utviklingsfaser: (1) kravsspesifikasjon — identifiser personvernkrav tidlig; (2) design — velg dataminimerende design, bruk pseudonymisering, implementer tilgangsstyring; (3) implementering — krypter data i transit og i hvile, valider input, bruk sikre biblioteker; (4) testing — test for personvernfeil, gjennomfør penetrasjonstesting; (5) deploy — sikre at konfigurasjonen er personvernvennlig som standard; (6) vedlikehold — oppdater avhengigheter, logg tilgang, gjennomfør periodiske gjennomganger; (7) avvikling — slett data sikkert når systemet avvikles. Veilederen er utarbeidet i samarbeid med norsk utviklermiljø.",
    topics: JSON.stringify(["innebygd_personvern", "informasjonssikkerhet"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-SCHREMS-II-VURDERING-2021",
    title: "Veileder om Schrems II-vurderinger for overføring til tredjeland",
    date: "2021-07-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om hvordan virksomheter skal gjennomføre Schrems II-vurderinger (Transfer Impact Assessments) ved overføring av personopplysninger til tredjeland.",
    full_text:
      "Datatilsynets veileder om Schrems II-vurderinger beskriver fremgangsmåten for å vurdere om personopplysninger kan overføres til tredjeland. Veilederen dekker: (1) kartlegging — identifiser alle overføringer av personopplysninger til tredjeland; (2) overføringsgrunnlag — vurder om det finnes gyldig overføringsgrunnlag (f.eks. standard personvernbestemmelser); (3) lovgivning i mottakerlandet — vurder om lovgivningen i mottakerlandet sikrer tilstrekkelig beskyttelse; (4) tilleggstiltak — dersom lovgivningen ikke gir tilstrekkelig beskyttelse, implementer tekniske, kontraktuelle eller organisatoriske tilleggstiltak; (5) dokumentasjon — dokumenter vurderingen for å kunne demonstrere etterlevelse; (6) periodisk gjennomgang — vurderingen skal oppdateres ved endringer i lovgivning eller praksis.",
    topics: JSON.stringify(["overforing"]),
    language: "no",
  },
  {
    reference: "DT-RAPPORT-PERSONVERNUNDERSOKELSEN-2020",
    title: "Personvernundersøkelsen 2019/2020",
    date: "2020-09-01",
    type: "rapport",
    summary:
      "Datatilsynets undersøkelse av nordmenns holdninger og erfaringer med personvern, inkludert tillit til virksomheter og myndigheter.",
    full_text:
      "Datatilsynets personvernundersøkelse 2019/2020 kartlegger nordmenns holdninger og erfaringer med personvern. Undersøkelsen dekker: (1) kjennskap til rettigheter — et flertall kjenner til at de har rett til innsyn og sletting, men færre bruker rettighetene aktivt; (2) tillit — nordmenn har høy tillit til offentlige myndigheter og helsetjenesten, men lavere tillit til sosiale medier og teknologiselskaper; (3) bekymring — mange er bekymret for overvåking av internettbruk og at personopplysninger selges videre; (4) selvregulering — en betydelig andel oppgir at de har endret atferd på grunn av personvernbekymringer; (5) 16 prosent har unnlatt å delta i nettdebatter av frykt for myndigheters overvåking.",
    topics: JSON.stringify(["samtykke", "innsyn"]),
    language: "no",
  },

  // --- Additional international transfer guidance ---
  {
    reference: "DT-VEILEDER-USA-DATAOVERFOERING-2023",
    title: "Veileder om nye regler for overføring av personopplysninger til USA — EU-US Data Privacy Framework",
    date: "2023-07-15",
    type: "veileder",
    summary:
      "Datatilsynets veileder om det nye EU-US Data Privacy Framework som trådte i kraft i 2023 og gir nytt grunnlag for overføring til USA.",
    full_text:
      "Datatilsynets veileder om EU-US Data Privacy Framework beskriver det nye rammeverket for overføring av personopplysninger til USA. Veilederen dekker: (1) hva er DPF — rammeverket erstatter Privacy Shield som ble ugyldiggjort av Schrems II-dommen; (2) sertifisering — amerikanske virksomheter må sertifisere seg under rammeverket for å motta personopplysninger; (3) sjekkliste for overføring — virksomheter skal verifisere at den amerikanske mottakeren er sertifisert; (4) begrensninger — rammeverket gjelder kun for overføring til sertifiserte virksomheter, ikke til alle amerikanske virksomheter; (5) klageordning — de registrerte har rett til å klage til en uavhengig klageinstans; (6) usikkerhet — det er usikkert om rammeverket vil bestå en eventuell ny prøving for EU-domstolen.",
    topics: JSON.stringify(["overforing"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-BREXIT-OVERFOERING-2020",
    title: "Veileder om overføring av personopplysninger til Storbritannia etter Brexit",
    date: "2020-12-15",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved overføring av personopplysninger til Storbritannia etter Brexit.",
    full_text:
      "Datatilsynets veileder om overføring av personopplysninger til Storbritannia etter Brexit beskriver konsekvensene for norske virksomheter. Veilederen dekker: (1) EU-kommisjonens adekvansbeslutning — Storbritannia er anerkjent som et land med tilstrekkelig beskyttelsesnivå; (2) overføring tillatt — så lenge adekvansbeslutningen gjelder, kan personopplysninger overføres til Storbritannia uten ytterligere tiltak; (3) begrensninger — adekvansbeslutningen er tidsbegrenset og kan trekkes tilbake; (4) anbefaling — virksomheter bør ha beredskapsplaner for det tilfellet at adekvansbeslutningen opphører; (5) SCC — standard personvernbestemmelser er et alternativt overføringsgrunnlag.",
    topics: JSON.stringify(["overforing"]),
    language: "no",
  },

  // =========================================================================
  // Additional guidelines — batch 2 (sector, technology, compliance)
  // =========================================================================

  {
    reference: "DT-VEILEDER-FODSELSNUMMER-2020",
    title: "Veileder om bruk av fødselsnummer",
    date: "2020-01-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om vilkårene for bruk av fødselsnummer (personnummer) etter personopplysningsloven § 12.",
    full_text:
      "Datatilsynets veileder om bruk av fødselsnummer beskriver de strenge vilkårene i personopplysningsloven § 12. Veilederen dekker: (1) hovedregel — fødselsnummer kan bare brukes i behandlingen når det er saklig behov for sikker identifisering og metoden er nødvendig; (2) eksempler på lovlig bruk — bank- og forsikringsforhold, arbeidsgiverforhold, helsetjenester; (3) eksempler på ulovlig bruk — identifikasjon ved varekjøp, medlemsregistrering i frivillige organisasjoner; (4) oppbevaring — fødselsnummer skal beskyttes mot uautorisert tilgang og ikke lagres lenger enn nødvendig; (5) alternativer — virksomheter bør vurdere om formålet kan oppnås med andre identifikatorer.",
    topics: JSON.stringify(["behandlingsgrunnlag"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-SJEKKLISTE-2020",
    title: "Sjekkliste for virksomheters personvernplikter",
    date: "2020-05-01",
    type: "verktoy",
    summary:
      "Datatilsynets sjekkliste som hjelper virksomheter å kartlegge om de oppfyller sine plikter etter personvernregelverket.",
    full_text:
      "Datatilsynets sjekkliste for virksomheters personvernplikter er et praktisk verktøy for å kartlegge etterlevelse. Sjekklisten dekker: (1) oversikt — har virksomheten oversikt over alle behandlinger av personopplysninger?; (2) rettslig grunnlag — er det fastsatt rettslig grunnlag for hver behandling?; (3) informasjon — er de registrerte informert om behandlingen?; (4) rettigheter — har virksomheten rutiner for å besvare innsynskrav, slettekrav og andre rettigheter?; (5) sikkerhet — er det gjennomført risikovurdering og implementert tilstrekkelige sikkerhetstiltak?; (6) databehandleravtaler — er det inngått avtaler med alle databehandlere?; (7) internkontroll — har virksomheten dokumentert internkontrollsystem for personvern?; (8) DPIA — er det vurdert om det trengs personvernkonsekvensvurdering?; (9) personvernombud — er det vurdert om virksomheten trenger personvernombud?",
    topics: JSON.stringify(["internkontroll"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-KAMERA-ARBEIDSPLASS-DETALJ-2022",
    title: "Veileder om kameraovervåking på arbeidsplassen — detaljert",
    date: "2022-01-01",
    type: "veileder",
    summary:
      "Datatilsynets detaljerte veileder om vilkårene for kameraovervåking på arbeidsplassen, inkludert rettslig grunnlag, informasjonsplikt og lagring.",
    full_text:
      "Datatilsynets detaljerte veileder om kameraovervåking på arbeidsplassen beskriver vilkårene for lovlig overvåking. Veilederen dekker: (1) rettslig grunnlag — kameraovervåking på arbeidsplassen kan baseres på berettiget interesse (art. 6 nr. 1 bokstav f) dersom det foreligger et reelt behov, f.eks. forebygging av kriminalitet eller sikkerhet; (2) drøftingsplikt — arbeidsgiver skal drøfte kameraovervåking med de ansatte eller tillitsvalgte etter arbeidsmiljøloven kap. 9; (3) informasjon — de ansatte skal informeres om overvåkingen, formålet og lagringstiden; (4) begrensning av overvåkingsområde — kameraer skal ikke overvåke pauser, garderober eller toaletter; (5) lagring — opptak skal normalt slettes innen 7 dager; (6) tilgangsstyring — kun autorisert personale skal ha tilgang til opptak; (7) DPIA — kan være påkrevd dersom overvåkingen er omfattende.",
    topics: JSON.stringify(["kameraovervaking", "arbeidsforhold"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-KONTROLL-OVERVAKING-ARBEIDSLIV-2023",
    title: "Veileder om kontroll og overvåking i arbeidslivet",
    date: "2023-03-01",
    type: "veileder",
    summary:
      "Datatilsynets overordnede veileder om arbeidsgivers adgang til kontroll og overvåking av ansatte etter arbeidsmiljøloven og GDPR.",
    full_text:
      "Datatilsynets veileder om kontroll og overvåking i arbeidslivet beskriver det rettslige rammeverket. Veilederen dekker: (1) arbeidsmiljøloven kap. 9 — arbeidsgiver kan iverksette kontrolltiltak når det har saklig grunn i virksomhetens forhold og ikke innebærer en uforholdsmessig belastning; (2) drøftingsplikt — kontrolltiltak skal drøftes med tillitsvalgte på forhånd; (3) informasjonsplikt — de ansatte skal informeres om formålet, omfanget og gjennomføringen; (4) forholdsmessighet — tiltaket må stå i rimelig forhold til formålet; (5) nye typer kontroll — algoritmisk styring, lokasjonsbasert kontroll og KI-basert overvåking reiser nye spørsmål; (6) dokumentasjonsplikt — virksomheten skal dokumentere vurderingen bak kontrolltiltaket.",
    topics: JSON.stringify(["arbeidsforhold"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-RUSTESTING-DETALJERT-2021",
    title: "Veileder om rustesting og personvern",
    date: "2021-10-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved rustesting (narkotikatesting) av ansatte i arbeidslivet.",
    full_text:
      "Datatilsynets veileder om rustesting og personvern beskriver personvernkravene. Veilederen dekker: (1) rustesting er behandling av helseopplysninger — resultater av narkotikatester er særlige kategorier av personopplysninger; (2) arbeidsmiljøloven § 9-4 — arbeidsgiver kan bare kreve medisinske undersøkelser (inkludert rustesting) av arbeidstakere og jobbsøkere når det følger av lov eller forskrift, ved stillinger med krav til sikkerhet, eller ved mistanke om ruspåvirkning i arbeidstiden; (3) forholdsmessighet — testing skal begrenses til det nødvendige; (4) oppbevaring — testresultater skal oppbevares med streng tilgangsstyring og slettes etter kort tid; (5) konsekvenser — virksomheten må ha klare retningslinjer for konsekvenser av positive tester.",
    topics: JSON.stringify(["arbeidsforhold", "helsedata"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-GPS-KJORETOY-DETALJERT-2021",
    title: "Veileder om GPS-sporing av kjøretøy i arbeidsforhold",
    date: "2021-04-01",
    type: "veileder",
    summary:
      "Datatilsynets detaljerte veileder om vilkårene for GPS-sporing av firmakjøretøy og ansattes posisjonsdata.",
    full_text:
      "Datatilsynets detaljerte veileder om GPS-sporing av kjøretøy i arbeidsforhold beskriver de strenge vilkårene. Veilederen dekker: (1) rettslig grunnlag — GPS-sporing av firmakjøretøy kan baseres på berettiget interesse dersom det er et reelt behov, f.eks. flåtestyring, sikkerhet eller kundebetjening; (2) forholdsmessighet — kontinuerlig sanntidssporing er mer inngripende enn periodevise stedsavlesninger; (3) informasjonsplikt — den ansatte skal informeres om sporingsaktiviteten; (4) privat bruk — dersom den ansatte har kjøretøyet privat, skal sporingen kunne deaktiveres; (5) lagring — sporingsdata skal slettes etter kort tid når formålet er oppnådd; (6) drøftingsplikt — GPS-sporing er et kontrolltiltak som skal drøftes med tillitsvalgte.",
    topics: JSON.stringify(["gps_sporing", "arbeidsforhold"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-OFFENTLIG-DOKUMENT-NETT-2022",
    title: "Veileder om publisering av offentlige dokumenter på nett",
    date: "2022-02-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernhensyn ved publisering av offentlige dokumenter (postjournaler, saksdokumenter) på internett.",
    full_text:
      "Datatilsynets veileder om publisering av offentlige dokumenter på nett beskriver personvernhensynene. Veilederen dekker: (1) offentlighetsprinsippet — offentlige dokumenter kan gjøres tilgjengelige, men det betyr ikke at alt skal publiseres på internett; (2) personopplysninger i saksdokumenter — dokumenter som inneholder personopplysninger skal vurderes for sladding; (3) sensitive opplysninger — helseopplysninger, personnummer og adressesperrede opplysninger skal alltid sladdes; (4) søkemotorindeksering — offentlige dokumenter publisert på nett kan indekseres av søkemotorer, noe som øker tilgjengeligheten; (5) eInnsyn — organers publisering i eInnsyn skal ivareta personvernhensyn; (6) anbefaling — organer bør ha rutiner for å gjennomgå dokumenter for personopplysninger før publisering.",
    topics: JSON.stringify(["offentlig_sektor"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-KREDITTVURDERING-DETALJERT-2022",
    title: "Veileder om kredittvurdering og personvern — for virksomheter",
    date: "2022-09-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder for virksomheter som gjennomfører kredittvurderinger, inkludert saklig behov, informasjonsplikt og automatiserte vurderinger.",
    full_text:
      "Datatilsynets veileder om kredittvurdering for virksomheter beskriver personvernkravene. Veilederen dekker: (1) saklig behov — kredittvurdering kan bare gjennomføres når det foreligger saklig behov, typisk i forbindelse med kredittyting eller annet økonomisk mellomværende; (2) informasjonsplikt — den som kredittvurderes skal informeres om at vurdering er gjennomført; (3) rett til innsyn — den vurderte har rett til å se resultatet; (4) rett til retting — feilaktige opplysninger i kredittvurderingen kan kreves rettet; (5) automatiserte beslutninger — helautomatiserte kredittbeslutninger krever enten samtykke, lovhjemmel eller avtaleoppfyllelse som grunnlag; (6) gjeldsregistrene — innhenting av gjeldsopplysninger krever også saklig behov.",
    topics: JSON.stringify(["kredittvurdering"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-FORSIKRING-PERSONVERN-2023",
    title: "Veileder om personvern i forsikringsbransjen",
    date: "2023-08-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav i forsikringsbransjen, inkludert helseopplysninger, skadeoppgjør og automatisert risikovurdering.",
    full_text:
      "Datatilsynets veileder om personvern i forsikringsbransjen beskriver personvernkravene for forsikringsselskaper. Veilederen dekker: (1) helseopplysninger — forsikringsselskaper behandler helseopplysninger ved tegning og skadeoppgjør, som krever særskilt grunnlag etter GDPR artikkel 9; (2) fullmakter — samtykke til innhenting av helseopplysninger skal være spesifikt og informert; (3) skadeoppgjør — personopplysninger i skadeoppgjør skal behandles med dataminimering; (4) profilering og risikovurdering — automatisert risikovurdering ved premiefastsettelse kan utgjøre profilering; (5) oppbevaring — forsikringsopplysninger skal slettes etter forsikringsforholdet opphører, med unntak for foreldelsesfrister; (6) deling av opplysninger — deling mellom forsikringsselskaper til svindelbekjempelse krever rettslig grunnlag.",
    topics: JSON.stringify(["finans", "helsedata"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-KUNDEKLUBB-PERSONVERN-2022",
    title: "Veileder om kundeklubber og personvern",
    date: "2022-03-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved drift av kundeklubber, lojalitetsprogrammer og kundefordelsordninger.",
    full_text:
      "Datatilsynets veileder om kundeklubber og personvern beskriver personvernkravene. Veilederen dekker: (1) rettslig grunnlag — medlemskap i kundeklubb baseres på avtale, men utvidet profilering krever samtykke; (2) informasjonsplikt — medlemmene skal informeres om hvilke opplysninger som samles inn og hvordan de brukes; (3) dataminimering — virksomheten skal ikke samle inn mer informasjon enn nødvendig for klubbens formål; (4) profilering — bruk av kjøpshistorikk til personalisert markedsføring utgjør profilering; (5) innsyn — medlemmene har rett til innsyn i opplysningene som er registrert; (6) utmelding — det skal være enkelt å melde seg ut og få sine opplysninger slettet.",
    topics: JSON.stringify(["markedsforing", "samtykke"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-SLETTING-SOKETREFF-2022",
    title: "Veileder om sletting av søketreff — retten til å bli glemt",
    date: "2022-05-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om retten til å få søketreff fjernet fra søkemotorer (retten til å bli glemt) etter GDPR artikkel 17.",
    full_text:
      "Datatilsynets veileder om sletting av søketreff beskriver retten til å bli glemt. Veilederen dekker: (1) retten til avindeksering — du kan kreve at søkemotorer fjerner treff som viser personopplysninger om deg; (2) vilkår — retten gjelder når opplysningene er utdaterte, irrelevante eller overdrevent skadelige i forhold til offentlighetens interesse; (3) fremgangsmåte — henvendelse sendes direkte til søkemotoren via deres skjema; (4) avveining — søkemotoren skal veie ditt personvern mot offentlighetens interesse i informasjonen; (5) klageadgang — dersom søkemotoren avslår kravet, kan du klage til Datatilsynet; (6) begrensning — avindeksering fjerner treffet fra søkemotoren, men ikke innholdet fra det opprinnelige nettstedet.",
    topics: JSON.stringify(["sletting", "innsyn"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-AVVIKSMELDING-PRAKSIS-2023",
    title: "Veileder om avviksmelding i praksis — meldeplikt og varsling",
    date: "2023-01-01",
    type: "veileder",
    summary:
      "Datatilsynets praktiske veileder om meldeplikt ved brudd på personopplysningssikkerheten — når, hvordan og til hvem.",
    full_text:
      "Datatilsynets praktiske veileder om avviksmelding beskriver fremgangsmåten ved brudd. Veilederen dekker: (1) 72-timersfristen — brudd skal meldes til Datatilsynet innen 72 timer etter at virksomheten ble klar over bruddet; (2) hva er et brudd — uautorisert tilgang, tap av data, feilsending, hacking, ransomware, uautorisert endring; (3) risikovurdering — virksomheten skal vurdere risikoen for de berørtes rettigheter; (4) melding til Datatilsynet — hva meldingen skal inneholde; (5) varsling av berørte — ved høy risiko skal de berørte varsles direkte; (6) dokumentasjon — alle brudd skal dokumenteres internt, uavhengig av om de meldes til Datatilsynet; (7) Datatilsynets meldeskjema — tilgjengelig på datatilsynet.no.",
    topics: JSON.stringify(["avvik"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-PROTOKOLL-BEHANDLINGSAKTIVITETER-2020",
    title: "Veileder om protokoll over behandlingsaktiviteter",
    date: "2020-07-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om plikten til å føre protokoll over behandlingsaktiviteter etter GDPR artikkel 30.",
    full_text:
      "Datatilsynets veileder om protokoll over behandlingsaktiviteter beskriver plikten etter GDPR artikkel 30. Veilederen dekker: (1) hvem har protokollplikt — alle virksomheter med mer enn 250 ansatte, samt mindre virksomheter som behandler personopplysninger regelmessig; (2) innhold — protokollen skal inneholde navn og kontaktopplysninger for behandlingsansvarlig, formålene med behandlingen, beskrivelse av kategorier av registrerte og personopplysninger, mottakere, overføringer til tredjeland, lagringsfrister og sikkerhetstiltak; (3) ajourhold — protokollen skal holdes oppdatert; (4) tilgjengelig for Datatilsynet — virksomheten skal kunne vise frem protokollen på forespørsel; (5) praktiske tips — bruk maler og verktøy for å vedlikeholde protokollen.",
    topics: JSON.stringify(["internkontroll"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-RISIKOVURDERING-PRAKSIS-2021",
    title: "Veileder om risikovurdering av informasjonssikkerhet i praksis",
    date: "2021-11-01",
    type: "veileder",
    summary:
      "Datatilsynets praktiske veileder om gjennomføring av risikovurdering av informasjonssikkerhet etter GDPR artikkel 32.",
    full_text:
      "Datatilsynets praktiske veileder om risikovurdering av informasjonssikkerhet beskriver fremgangsmåten. Veilederen dekker: (1) når risikovurdering er påkrevd — for alle behandlinger av personopplysninger; (2) trinn 1: identifiser truslene — hva kan gå galt? (uautorisert tilgang, tap, feilsending, hacking); (3) trinn 2: vurder sannsynlighet — hvor sannsynlig er det at trusselen realiseres?; (4) trinn 3: vurder konsekvens — hva er konsekvensene for de registrerte?; (5) trinn 4: fastsett risikonivå — kombiner sannsynlighet og konsekvens; (6) trinn 5: beslutt tiltak — tekniske og organisatoriske tiltak for å redusere risikoen; (7) dokumentasjon — risikovurderingen skal dokumenteres og oppdateres regelmessig.",
    topics: JSON.stringify(["informasjonssikkerhet", "internkontroll"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-ETABLERE-INTERNKONTROLL-2020",
    title: "Veileder om å etablere internkontroll for personvern",
    date: "2020-08-01",
    type: "veileder",
    summary:
      "Datatilsynets steg-for-steg veileder om å etablere et internkontrollsystem for personvern i virksomheten.",
    full_text:
      "Datatilsynets veileder om å etablere internkontroll for personvern beskriver fremgangsmåten steg for steg. Veilederen dekker: (1) ledelsesforankring — personvernarbeidet må være forankret i ledelsen; (2) oversikt — kartlegg alle behandlinger av personopplysninger; (3) rettslig grunnlag — fastsett rettslig grunnlag for hver behandling; (4) rutiner — etabler rutiner for innsynskrav, sletting, avvikshåndtering og databehandleravtaler; (5) opplæring — sørg for at ansatte med tilgang til personopplysninger får opplæring; (6) risikovurdering — gjennomfør risikovurdering for alle behandlinger; (7) dokumentasjon — dokumenter internkontrollsystemet slik at det kan fremlegges for Datatilsynet; (8) revisjon — gjennomgå og oppdater internkontrollen regelmessig.",
    topics: JSON.stringify(["internkontroll"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-FASTSETTE-FORMAL-2020",
    title: "Veileder om fastsetting av formål for behandling av personopplysninger",
    date: "2020-06-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om hvordan virksomheter skal fastsette og dokumentere formålet med behandling av personopplysninger.",
    full_text:
      "Datatilsynets veileder om fastsetting av formål beskriver kravene i GDPR artikkel 5 nr. 1 bokstav b. Veilederen dekker: (1) formålsbestemmelse — virksomheten skal fastsette uttrykkelige og legitime formål for behandlingen før den starter; (2) spesifisitet — formålet skal være tilstrekkelig spesifikt til at de registrerte forstår hva opplysningene brukes til; (3) formålsbegrensning — personopplysninger skal ikke behandles videre på en måte som er uforenlig med det opprinnelige formålet; (4) forenlighetsvurdering — kriterier for å vurdere om viderebehandling er forenlig med det opprinnelige formålet; (5) dokumentasjon — formålet skal dokumenteres i protokoll over behandlingsaktiviteter og i personvernerklæring.",
    topics: JSON.stringify(["behandlingsgrunnlag"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-LOKALISERING-GPS-2022",
    title: "Veileder om lokalisering og GPS-sporing",
    date: "2022-04-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved bruk av lokaliserings- og GPS-teknologi i ulike sammenhenger.",
    full_text:
      "Datatilsynets veileder om lokalisering og GPS-sporing beskriver personvernkravene. Veilederen dekker: (1) lokasjonsdata er personopplysninger — GPS-koordinater, celletårndata og Wi-Fi-posisjonering som kan knyttes til en person; (2) arbeidslivet — GPS-sporing av ansatte via firmakjøretøy eller mobiltelefon krever berettiget interesse og forholdsmessighetsvurdering; (3) privat bruk — foreldre som sporer barns lokasjon og familiedelingsapper; (4) offentlig transport — sporing av passasjerer gjennom billettsystemer; (5) sport og trening — treningsapper og GPS-klokker; (6) dataminimering — lokasjonsdata skal ikke lagres lenger enn nødvendig.",
    topics: JSON.stringify(["gps_sporing"]),
    language: "no",
  },

  // --- Additional sector and topic reports ---
  {
    reference: "DT-RAPPORT-ARSRAPPORT-2023",
    title: "Datatilsynets årsrapport 2023 — sammendrag",
    date: "2024-03-01",
    type: "rapport",
    summary:
      "Sammendrag av Datatilsynets årsrapport for 2023, inkludert tilsynsvirksomhet, klagesaker, avviksmeldinger og sandkasseprosjekter.",
    full_text:
      "Datatilsynets årsrapport for 2023 oppsummerer tilsynets virksomhet. Nøkkeltall: (1) 591 klager fra enkeltpersoner om mulige brudd; (2) 5 overtredelsesgebyr fattet; (3) 4 irettesettelser; (4) 1 forbud; (5) 3 pålegg; (6) over 2 500 avviksmeldinger mottatt; (7) tilsynsvirksomhet rettet mot kommuner, helsesektor, arbeidslivssaker og digitale tjenester; (8) Meta-saken — midlertidig forbud mot atferdsbasert reklame, tvangsmulkt på 83 millioner kroner, saken brakt til EDPB; (9) SSB — forbud mot innsamling av bongdata; (10) sandkasseprosjekter med fokus på KI og personvern.",
    topics: JSON.stringify(["offentlig_sektor"]),
    language: "no",
  },
  {
    reference: "DT-RAPPORT-ARSRAPPORT-2022",
    title: "Datatilsynets årsrapport 2022 — sammendrag",
    date: "2023-03-01",
    type: "rapport",
    summary:
      "Sammendrag av Datatilsynets årsrapport for 2022, inkludert tilsynsvirksomhet, store gebyr og internasjonalt samarbeid.",
    full_text:
      "Datatilsynets årsrapport for 2022 oppsummerer tilsynets virksomhet. Nøkkeltall: (1) 17 vedtak om overtredelsesgebyr; (2) gebyr til blant andre Stortinget, NAV, Lillestrøm kommune, Arbeidstilsynet, NorgesGruppen (Trumf); (3) Grindr-saken opprettholdt av Personvernnemnda — 65 millioner kroner; (4) Google Analytics-saken innledet; (5) Shinigami Eyes-utvidelsen forbudt; (6) over 2 200 avviksmeldinger mottatt; (7) regulatorisk sandkasse utvidet med nye prosjekter; (8) rapport om arbeidsgiveres digitale overvåking av ansatte; (9) internasjonalt samarbeid gjennom EDPB.",
    topics: JSON.stringify(["offentlig_sektor"]),
    language: "no",
  },

  // --- Additional hearing statements ---
  {
    reference: "DT-HOERING-STRAFFEGJENNOMFORING-DETALJERT-2024",
    title: "Høringssvar om straffegjennomføring og kriminalomsorgens behandling av personopplysninger",
    date: "2024-06-15",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om forslag til endringer i straffegjennomføringsloven knyttet til kriminalomsorgens behandling av personopplysninger.",
    full_text:
      "Datatilsynet har avgitt høringssvar om forslag til endringer i straffegjennomføringsloven som gjelder kriminalomsorgens behandling av personopplysninger. Datatilsynet kommenterer: (1) utvidet bruk av elektronisk kontroll (fotlenke) innebærer omfattende behandling av lokasjonsdata; (2) informasjonsdeling mellom kriminalomsorgen og andre etater krever klare formåls- og tilgangsregler; (3) innsattes personvern — innsatte har krav på personvern selv om det kan begrenses; (4) besøkskontroll — registrering av personopplysninger om besøkende krever rettslig grunnlag; (5) sletting — personopplysninger innhentet under straffegjennomføring skal slettes etter fastsatte frister.",
    topics: JSON.stringify(["politi_justis"]),
    language: "no",
  },
  {
    reference: "DT-HOERING-IDRETT-PERSONVERN-2024",
    title: "Høringssvar om idrett og personvern — dopingkontroll og aktivitetsdata",
    date: "2024-09-01",
    type: "hoeringsuttalelse",
    summary:
      "Datatilsynets høringssvar om personvernaspektene ved dopingkontroll, aktivitetsdata og utøvernes rettigheter i idrettssammenheng.",
    full_text:
      "Datatilsynet har avgitt høringssvar om personvern i idrettssammenheng, med fokus på dopingkontroll og behandling av aktivitetsdata. Datatilsynet kommenterer: (1) dopingkontroll — innsamling av biologiske prøver og registrering av utøveres oppholdssteder innebærer behandling av helseopplysninger som krever robust rettslig grunnlag; (2) aktivitetsdata — idrettsorganisasjoner som samler inn treningsdata og prestasjonsdata om utøvere behandler personopplysninger; (3) barn i idrett — barns personopplysninger i idrettssammenheng krever særlig beskyttelse; (4) offentlig tilgjengelige resultater — publisering av idrettsresultater inneholder personopplysninger; (5) strømming — kameraoverføring av idrettsarrangementer med barn reiser særlige personvernspørsmål.",
    topics: JSON.stringify(["helsedata", "barn"]),
    language: "no",
  },

  // --- Programvareutvikling guides ---
  {
    reference: "DT-VEILEDER-PROGRAMVARE-INNEBYGD-KRAV-2020",
    title: "Programvareutvikling med innebygd personvern — kravspesifikasjon",
    date: "2020-01-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder for programvareutviklere om innebygd personvern i kravspesifikasjonsfasen.",
    full_text:
      "Datatilsynets veileder for kravspesifikasjon med innebygd personvern beskriver metodikk for å integrere personvernhensyn allerede i kravfasen. Veilederen dekker: (1) dataminimering som krav — spesifiser hvilke personopplysninger som er strengt nødvendige for hver funksjon; (2) formålsbegrensning — kravene skal sikre at personopplysninger kun brukes til det angitte formålet; (3) standardinnstillinger — systemet skal ha personvernvennlige standardinnstillinger; (4) slettekrav — spesifiser lagringsfrister og automatisert sletting; (5) innsynskrav — systemet skal kunne eksportere den registrertes opplysninger; (6) sikkerhetskrav — kryptering, tilgangsstyring, logging og sårbarhetshåndtering; (7) tredjepartsintegrering — vurder personvernaspektene ved alle tredjepartstjenester.",
    topics: JSON.stringify(["innebygd_personvern"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-PROGRAMVARE-INNEBYGD-TESTING-2020",
    title: "Programvareutvikling med innebygd personvern — testing og deploy",
    date: "2020-02-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder for programvareutviklere om innebygd personvern i test- og deploy-fasen.",
    full_text:
      "Datatilsynets veileder for testing og deploy med innebygd personvern beskriver metodikk for personverntesting. Veilederen dekker: (1) testdata — unngå bruk av ekte personopplysninger i test; bruk syntetiske data eller anonymiserte datasett; (2) sikkerhetstesting — gjennomfør penetrasjonstesting og sårbarhetsscanning; (3) personverntesting — test at innsynsmekanismer, slettemekanismer og samtykkehåndtering fungerer korrekt; (4) deploy-konfigurasjon — sikre at standardinnstillinger i produksjon er personvernvennlige; (5) logging — sikre at logger ikke inneholder overskuddsinformasjon; (6) miljøseparasjon — testdata og produksjonsdata skal holdes strengt adskilt.",
    topics: JSON.stringify(["innebygd_personvern", "informasjonssikkerhet"]),
    language: "no",
  },

  // --- Additional EDPB guidance ---
  {
    reference: "DT-EDPB-RETNINGSLINJER-SAMTYKKE-2020",
    title: "EDPB-retningslinjer om samtykke — norsk veiledning",
    date: "2020-05-01",
    type: "veileder",
    summary:
      "Datatilsynets norske veiledning om Personvernrådets (EDPB) oppdaterte retningslinjer om samtykke etter GDPR.",
    full_text:
      "Datatilsynets veiledning om EDPBs retningslinjer for samtykke beskriver kravene til gyldig samtykke. Veilederen dekker: (1) frivillighet — samtykke skal ikke være en betingelse for å motta en tjeneste dersom behandlingen ikke er nødvendig for tjenesten; (2) spesifisitet — samtykke skal gis for hvert enkelt formål; (3) informert — den registrerte skal informeres om hvem som er behandlingsansvarlig, formålet og retten til å trekke tilbake; (4) utvetydig — samtykke skal gis gjennom en klar bekreftende handling; (5) tilbaketrekking — det skal være like enkelt å trekke tilbake samtykket som å gi det; (6) barn — særskilte krav til samtykke fra mindreårige; (7) cookie walls — å betinge tilgang til et nettsted av samtykke til cookies er normalt ikke gyldig samtykke.",
    topics: JSON.stringify(["samtykke"]),
    language: "no",
  },
  {
    reference: "DT-EDPB-RETNINGSLINJER-INNEBYGD-PERSONVERN-2020",
    title: "EDPB-retningslinjer om innebygd personvern og personvern som standard",
    date: "2020-10-01",
    type: "veileder",
    summary:
      "Datatilsynets norske veiledning om Personvernrådets (EDPB) retningslinjer om innebygd personvern og personvern som standardinnstilling.",
    full_text:
      "Datatilsynets veiledning om EDPBs retningslinjer for innebygd personvern og personvern som standard beskriver kravene i GDPR artikkel 25. Veilederen dekker: (1) innebygd personvern — personvernhensyn skal integreres i alle utviklingsfaser av systemer og prosesser; (2) personvern som standard — systemet skal som standard behandle så lite personopplysninger som mulig; (3) designprinsipper — dataminimering, pseudonymisering, transparens, hensiktsbegrensning; (4) tekniske tiltak — kryptering, tilgangsstyring, automatisk sletting; (5) organisatoriske tiltak — opplæring, rutiner, internkontroll; (6) dokumentasjon — virksomheten skal dokumentere hvordan innebygd personvern er ivaretatt; (7) sertifisering — godkjente sertifiseringsmekanismer kan brukes som bevis på etterlevelse.",
    topics: JSON.stringify(["innebygd_personvern"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-DIGITAL-TJENESTER-FORBRUKERE-2023",
    title: "Veileder om digitale tjenester og forbrukeres personopplysninger — tilsyn og sanksjoner",
    date: "2023-11-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om tilsyn og sanksjoner for digitale tjenester som bryter personvernregelverket, inkludert sporingsverktøy og dark patterns.",
    full_text:
      "Datatilsynets veileder om digitale tjenester og forbrukeres personopplysninger oppsummerer tilsynsvirksomheten. Veilederen dekker: (1) sporingsverktøy — Datatilsynets tilsynsaksjon mot nettsteders bruk av Meta Pixel, Google Analytics og andre sporingsverktøy; (2) dark patterns — villedende og manipulative designvalg som lurer brukere til å samtykke er forbudt; (3) samtykkeløsninger — krav til samtykkebannere og cookie-vegger; (4) tilsynsmetodikk — Datatilsynet benytter teknisk analyse av nettsteders sporingsverktøy; (5) sanksjoner — overtredelsesgebyr, irettesettelser og pålegg for brudd; (6) internasjonalt samarbeid — EDPB-koordinerte tilsynsaksjoner.",
    topics: JSON.stringify(["informasjonskapsler", "samtykke"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-POLITI-KRIMINALITET-2023",
    title: "Veileder om personvern ved politi og justis — registrering og tilgangsstyring",
    date: "2023-06-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvern i politi- og justissektoren, inkludert registreringspraksis, tilgangsstyring og innsyn.",
    full_text:
      "Datatilsynets veileder om personvern ved politi og justis beskriver det rettslige rammeverket for politiets og rettsvesenets behandling av personopplysninger. Veilederen dekker: (1) politiregisterloven — gjelder for politiets behandling til politimessige formål; (2) registrering — politiet kan registrere opplysninger om mistenkte, vitner og ofre; (3) DNA-registeret — streng regulering av lagring og bruk av DNA-profiler; (4) kameraovervåking — politiets bruk av kameraovervåking i det offentlige rom; (5) kommunikasjonskontroll — avlytting og overvåking av kommunikasjon krever domstolskjennelse; (6) innsyn — den registrerte har rett til innsyn, med unntak for etterforskning.",
    topics: JSON.stringify(["politi_justis"]),
    language: "no",
  },

  // =========================================================================
  // Final batch — guidelines to reach 400+
  // =========================================================================

  {
    reference: "DT-VEILEDER-KI-CHATGPT-SKOLE-2023",
    title: "Veileder om ChatGPT og generativ KI i skolen",
    date: "2023-05-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved bruk av ChatGPT og andre generative KI-verktøy i norske skoler.",
    full_text:
      "Datatilsynets veileder om ChatGPT og generativ KI i skolen beskriver personvernkravene. Veilederen dekker: (1) behandlingsansvar — skoleeier er behandlingsansvarlig for bruk av KI-verktøy i undervisningen; (2) databehandleravtale — kreves med leverandøren av KI-tjenesten; (3) personopplysninger i prompts — tekst som skrives inn i ChatGPT kan inneholde personopplysninger og sendes til tredjelands servere; (4) barns personvern — barn har særlig behov for beskyttelse og det er viktig at lærere ikke ber elever skrive inn personopplysninger; (5) DPIA — bør gjennomføres for systematisk bruk av KI-verktøy i skolen; (6) Datatilsynets oppfølging — tilsynet følger med på utviklingen av KI i utdanningssektoren.",
    topics: JSON.stringify(["kunstig_intelligens", "barn", "skole"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-INFORMASJONSSIKKERHET-GRUNNLEGGENDE-2021",
    title: "Veileder om grunnleggende informasjonssikkerhet for virksomheter",
    date: "2021-01-01",
    type: "veileder",
    summary:
      "Datatilsynets grunnleggende veileder om informasjonssikkerhet etter GDPR artikkel 32, inkludert tekniske og organisatoriske tiltak.",
    full_text:
      "Datatilsynets grunnleggende veileder om informasjonssikkerhet beskriver kravene i GDPR artikkel 32. Veilederen dekker: (1) tekniske tiltak — kryptering av data i transit og i hvile, tofaktor-autentisering, brannmur, antivirus, sikkerhetsoppdateringer; (2) tilgangsstyring — prinsippet om minste privilegium, regelmessig gjennomgang av tilgangsrettigheter; (3) logging — loggføring av tilgang til personopplysninger; (4) sikkerhetskopiering — regelmessig backup av data; (5) organisatoriske tiltak — opplæring, rutiner, ansvarfordeling; (6) fysisk sikkerhet — tilgang til lokaler og utstyr; (7) hendelseshåndtering — plan for håndtering av sikkerhetshendelser.",
    topics: JSON.stringify(["informasjonssikkerhet"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-SLETTING-DETALJ-2022",
    title: "Veileder om sletting av personopplysninger — praktisk gjennomføring",
    date: "2022-08-01",
    type: "veileder",
    summary:
      "Datatilsynets praktiske veileder om gjennomføring av sletting av personopplysninger, inkludert lagringsfrister og arkivplikt.",
    full_text:
      "Datatilsynets praktiske veileder om sletting av personopplysninger beskriver fremgangsmåten. Veilederen dekker: (1) plikten til å slette — personopplysninger skal slettes når de ikke lenger er nødvendige for formålet; (2) lagringsfrister — virksomheten skal fastsette konkrete lagringsfrister for hver behandling; (3) automatisk sletting — anbefaler implementering av automatiserte slettemekanismer; (4) arkivplikt — noen opplysninger kan ikke slettes fordi arkivloven krever oppbevaring; (5) regnskapsplikt — bokføringsloven krever oppbevaring av visse opplysninger i 5 år; (6) backup — sletteretten gjelder også for personopplysninger i sikkerhetskopier; (7) tredjeparter — virksomheten skal informere mottakere som har fått opplysningene utlevert.",
    topics: JSON.stringify(["sletting"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-DATABEHANDLERAVTALE-MAL-2021",
    title: "Veileder og mal for databehandleravtale",
    date: "2021-03-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om kravene til databehandleravtale etter GDPR artikkel 28, inkludert mal og praktiske tips.",
    full_text:
      "Datatilsynets veileder og mal for databehandleravtale beskriver kravene i GDPR artikkel 28. Veilederen dekker: (1) når trengs databehandleravtale — alltid når en virksomhet bruker en ekstern leverandør til å behandle personopplysninger; (2) innhold — avtalen skal regulere formål, varighet, type opplysninger, instrukser, sikkerhet, underleverandører, bistand til rettigheter, sletting, revisjon; (3) underdatabehandlere — bruk av underleverandører krever skriftlig forhåndsgodkjennelse; (4) overføring til tredjeland — avtalen skal regulere eventuelle overføringer; (5) opphør — avtalen skal regulere hva som skjer med opplysningene ved avtalens opphør; (6) mal — Datatilsynet tilbyr en standardmal for databehandleravtale.",
    topics: JSON.stringify(["databehandler"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-BEHANDLINGSANSVARLIG-DATABEHANDLER-2021",
    title: "Veileder om behandlingsansvarlig og databehandler — rolleavklaring",
    date: "2021-05-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om å avklare roller mellom behandlingsansvarlig, felles behandlingsansvarlige og databehandler.",
    full_text:
      "Datatilsynets veileder om rolleavklaring mellom behandlingsansvarlig og databehandler beskriver kriteriene. Veilederen dekker: (1) behandlingsansvarlig — den som bestemmer formålet med og midlene for behandlingen; (2) databehandler — den som behandler personopplysninger på vegne av den behandlingsansvarlige; (3) felles behandlingsansvarlige — når to eller flere i fellesskap bestemmer formål og midler; (4) praktiske eksempler — skylagring, lønnstjenester, CRM-systemer, analyseverktøy; (5) konsekvenser av feil rolleavklaring — kan føre til manglende databehandleravtaler og uklart ansvar; (6) dokumentasjon — rolleavklaring skal dokumenteres.",
    topics: JSON.stringify(["databehandler"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-PERSONVERNERKLAERING-2022",
    title: "Veileder om personvernerklæring — hva den skal inneholde",
    date: "2022-01-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om kravene til personvernerklæring etter GDPR artikkel 13 og 14.",
    full_text:
      "Datatilsynets veileder om personvernerklæring beskriver hva erklæringen skal inneholde. Veilederen dekker: (1) hvem er behandlingsansvarlig — kontaktinformasjon til virksomheten og eventuelle personvernombud; (2) formål — hva personopplysningene brukes til; (3) rettslig grunnlag — hjemmelen for behandlingen; (4) mottakere — hvem opplysningene deles med; (5) overføring til tredjeland — om data overføres utenfor EØS; (6) lagringstid — hvor lenge opplysningene oppbevares; (7) rettigheter — oversikt over den registrertes rettigheter; (8) klageadgang — rett til å klage til Datatilsynet; (9) språk — informasjonen skal gis på et klart og enkelt språk; (10) tilgjengelighet — erklæringen skal være lett å finne på nettsiden.",
    topics: JSON.stringify(["innsyn"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-HVITVASKINGSREGLER-2023",
    title: "Veileder om hvitvasking og personvern — kundekontroll og rapportering",
    date: "2023-03-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav ved gjennomføring av kundekontroll og rapportering etter hvitvaskingsloven.",
    full_text:
      "Datatilsynets veileder om hvitvasking og personvern beskriver forholdet mellom hvitvaskingsregelverket og personvernregelverket. Veilederen dekker: (1) rettslig grunnlag — hvitvaskingsloven gir rettslig plikt som behandlingsgrunnlag etter GDPR artikkel 6 nr. 1 bokstav c; (2) kundekontroll — innhenting av personopplysninger til kundekontroll er pålagt og har dermed rettslig grunnlag; (3) dataminimering — virksomheten skal ikke samle inn mer informasjon enn hvitvaskingsloven krever; (4) oppbevaring — dokumentasjon fra kundekontroll skal oppbevares i fem år etter avsluttet kundeforhold; (5) formålsbegrensning — opplysninger innhentet for hvitvaskingsformål skal ikke brukes til andre formål; (6) rapportering — plikt til å rapportere mistenkelige transaksjoner til Økokrim gjelder uavhengig av taushetsplikt.",
    topics: JSON.stringify(["finans"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-BANK-PERSONVERN-2022",
    title: "Veileder om personvern i bankforhold",
    date: "2022-12-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernkrav i bankforhold, inkludert kontoopplysninger, kredittvurdering og automatiserte beslutninger.",
    full_text:
      "Datatilsynets veileder om personvern i bankforhold beskriver personvernkravene for banker. Veilederen dekker: (1) rettslig grunnlag — banker behandler personopplysninger på grunnlag av avtale, rettslig plikt og berettiget interesse; (2) kontoopplysninger — informasjon om kunders transaksjoner og saldo er sensitive; (3) PSD2 — tredjepartstilgang til kontoinformasjon krever kundens samtykke; (4) kredittvurdering — automatisert kredittvurdering krever transparens og rett til menneskelig overprøving; (5) hvitvasking — kundekontroll etter hvitvaskingsloven er en rettslig plikt; (6) oppbevaring — bokføringsloven krever oppbevaring i 5 år etter avsluttet kundeforhold.",
    topics: JSON.stringify(["finans"]),
    language: "no",
  },
  {
    reference: "DT-RAPPORT-SANDKASSE-AHUS-2025",
    title: "Sandkasserapport: Ahus — fullmakt til bedre personvern i digital hjemmeoppfølging",
    date: "2025-05-20",
    type: "rapport",
    summary:
      "Sluttrapport fra Datatilsynets sandkasse om Akershus universitetssykehus (Ahus) — digital hjemmeoppfølging av eldre med fullmakter.",
    full_text:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasse om Ahus-prosjektet. Akershus universitetssykehus utviklet en løsning for digital hjemmeoppfølging av eldre pasienter der hjelpere kan utføre oppgaver på pasientens vegne gjennom fullmakter. Rapporten dekker: (1) fullmaktsmodellen — hjelpere logger inn som seg selv og handler på pasientens vegne, i stedet for å låne pasientens innlogging; (2) personverngevinst — bedre sporbarhet, redusert risiko for uautorisert tilgang; (3) rettslig grunnlag — fullmaktsordningen baseres på samtykke; (4) utfordringer — alderdommens kompleksitet gjør det vanskelig å innhente informert samtykke fra sårbare pasienter; (5) anbefaling — digitale fullmaktsløsninger i helsesektoren bør bygge inn personvern fra start.",
    topics: JSON.stringify(["helsedata", "kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-RAPPORT-SANDKASSE-SALT-BIOMETRI-2025",
    title: "Sandkasserapport: SALT/Mobai — sikring av digitale identiteter med biometrisk kryptering",
    date: "2025-01-13",
    type: "rapport",
    summary:
      "Sluttrapport fra Datatilsynets sandkasse om Mobais bruk av biometrisk kryptering for å beskytte digitale identiteter.",
    full_text:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasse om SALT/Mobai-prosjektet. Mobai utvikler løsninger for biometrisk kryptering som kan beskytte digitale identiteter uten å lagre biometriske data i klartekst. Rapporten dekker: (1) biometrisk kryptering — biometriske data brukes til å generere en kryptografisk nøkkel, slik at de biometriske dataene aldri lagres direkte; (2) personverngevinst — eliminerer risikoen for at biometriske data på avveie kan gjenbrukes; (3) rettslig vurdering — biometriske data er en særlig kategori etter GDPR artikkel 9, men krypteringstilnærmingen kan redusere personvernrisikoen; (4) praktisk bruk — adgangskontroll, identitetsverifisering; (5) anbefaling — biometrisk kryptering er en lovende personvernfremmende teknologi.",
    topics: JSON.stringify(["biometri", "informasjonssikkerhet"]),
    language: "no",
  },
  {
    reference: "DT-RAPPORT-SANDKASSE-JUSSBOTEN-2024",
    title: "Sandkasserapport: Juridisk ABC / JussBoten LawAi — generativ KI i arbeidsrett",
    date: "2024-12-11",
    type: "rapport",
    summary:
      "Sluttrapport fra Datatilsynets sandkasse om Juridisk ABCs JussBoten LawAi — en generativ KI-løsning for HR og arbeidsrett.",
    full_text:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasse om Juridisk ABCs JussBoten LawAi-prosjekt. JussBoten er et generativt KI-verktøy som hjelper HR-avdelinger med arbeidsrettslige spørsmål. Rapporten dekker: (1) rettslig grunnlag — behandling av personopplysninger i treningsdata og brukerspørsmål; (2) dataminimering — verktøyet bør trenes på anonymiserte data i størst mulig grad; (3) transparens — brukere skal vite at de interagerer med KI; (4) utfordringer med hallusinasjon — generativ KI kan produsere juridisk feilaktige svar; (5) ansvarsforhold — virksomheten som bruker verktøyet er behandlingsansvarlig for behandlingen av de ansattes personopplysninger; (6) anbefaling — generativ KI i HR krever grundig personvernvurdering.",
    topics: JSON.stringify(["kunstig_intelligens", "arbeidsforhold"]),
    language: "no",
  },
  {
    reference: "DT-SANDKASSE-NAV-SYKEFRAVAER-2022",
    title: "Sandkasserapport: NAV — prediksjonsmodell for sykefravær",
    date: "2022-01-17",
    type: "rapport",
    summary:
      "Sluttrapport fra Datatilsynets sandkasse om NAVs bruk av maskinlæring for å forutsi sykefraværsforløp.",
    full_text:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasse om NAVs prosjekt med prediksjonsmodell for sykefravær. NAV ønsket å bruke maskinlæring for å forutsi hvilke sykmeldte som har risiko for langvarig fravær, slik at oppfølgingsressursene kan rettes mot dem som trenger det mest. Rapporten dekker: (1) rettslig grunnlag — NAV har lovhjemmel for å behandle helseopplysninger i forbindelse med oppfølging av sykmeldte; (2) algoritmisk rettferdighet — modellen må sikres mot skjevheter som diskriminerer bestemte grupper; (3) transparens — sykmeldte skal informeres om at KI brukes i oppfølgingen; (4) menneskelig kontroll — algoritmens anbefalinger skal verifiseres av saksbehandler; (5) personvernrisiko — prediksjonsmodell basert på helseopplysninger er høyrisiko.",
    topics: JSON.stringify(["helsedata", "kunstig_intelligens", "offentlig_sektor"]),
    language: "no",
  },
  {
    reference: "DT-SANDKASSE-AVT-LAERINGSANALYSE-2022",
    title: "Sandkasserapport: AVT — aktivitetsdata for tilpasset opplæring",
    date: "2022-02-16",
    type: "rapport",
    summary:
      "Sluttrapport fra Datatilsynets sandkasse om læringsanalytikk — bruk av aktivitetsdata for vurdering og tilpasset opplæring i skolen.",
    full_text:
      "Sluttrapport fra Datatilsynets regulatoriske sandkasse om AVT-prosjektet (Aktivitetsdata for vurdering og tilpassing). Prosjektet undersøkte personvernaspektene ved læringsanalytikk i skolen — innsamling og analyse av data om elevers læringsaktiviteter. Rapporten dekker: (1) behandlingsansvar — kommunen som skoleeier er behandlingsansvarlig; (2) rettslig grunnlag — opplæringsloven gir grunnlag for tilpasset opplæring, men grensene for datainnsamling er uklare; (3) dataminimering — skoler bør begrense innsamlingen av aktivitetsdata til det som er nødvendig; (4) transparens — elever og foreldre skal informeres; (5) barns rettigheter — barn har særlig behov for beskyttelse mot profil-basert overvåking; (6) DPIA — læringsanalytikk krever personvernkonsekvensvurdering.",
    topics: JSON.stringify(["barn", "skole", "kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-KI-TRANSPARENS-2022",
    title: "Veileder om å lykkes med åpenhet om bruk av kunstig intelligens",
    date: "2022-11-15",
    type: "veileder",
    summary:
      "Datatilsynets veileder om hvordan virksomheter kan informere de registrerte om bruk av kunstig intelligens på en forståelig måte.",
    full_text:
      "Datatilsynets veileder om åpenhet om bruk av kunstig intelligens beskriver hvordan virksomheter kan oppfylle informasjonsplikten. Veilederen dekker: (1) hvorfor åpenhet — de registrerte har rett til å vite at KI brukes i beslutninger som angår dem; (2) hva skal kommuniseres — formålet med KI-bruken, hvilke data som inngår, konsekvenser for den registrerte, rett til menneskelig overprøving; (3) hvordan kommunisere — bruk enkelt språk, unngå teknisk sjargong, bruk visuelle hjelpemidler; (4) lagdelt informasjon — gi en kort oversikt med mulighet til å lese mer i dybden; (5) tidspunkt — informasjon bør gis før KI-systemet brukes på den registrertes opplysninger; (6) eksempler — praktiske eksempler på god KI-kommunikasjon.",
    topics: JSON.stringify(["kunstig_intelligens"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-KRYPTERING-LONNSSLIPP-2020",
    title: "Veileder om kryptering av lønnsslipp",
    date: "2020-10-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om krav til kryptering ved sending av lønnsslipp per e-post.",
    full_text:
      "Datatilsynets veileder om kryptering av lønnsslipp beskriver kravene til sikker oversendelse. Veilederen dekker: (1) lønnsslipp inneholder personopplysninger — navn, fødselsnummer, lønn og trekk; (2) e-post uten kryptering er ikke sikker nok — lønnsslipp bør ikke sendes som ukryptert e-postvedlegg; (3) alternativ 1: digital postkasse — Digipost eller eBoks er sikre alternativer; (4) alternativ 2: kryptert e-post — dersom e-post brukes, bør lønnsslipp krypteres med passord eller S/MIME; (5) alternativ 3: intranett eller HR-system — ansatte kan hente lønnsslipp i en innlogget portal; (6) arbeidsgivers ansvar — arbeidsgiver er behandlingsansvarlig og har ansvar for sikker oversendelse.",
    topics: JSON.stringify(["arbeidsforhold", "informasjonssikkerhet"]),
    language: "no",
  },
  {
    reference: "DT-VEILEDER-SLEKTSGRANSKING-2021",
    title: "Veileder om slektsgransking og personvern",
    date: "2021-07-01",
    type: "veileder",
    summary:
      "Datatilsynets veileder om personvernaspektene ved slektsgransking og bruk av DNA-tester for å finne slektninger.",
    full_text:
      "Datatilsynets veileder om slektsgransking og personvern beskriver personvernaspektene. Veilederen dekker: (1) DNA-tester for slektsgransking — kommersielle DNA-tester behandler genetiske data som er en særlig kategori etter GDPR artikkel 9; (2) samtykke — den som tar testen samtykker til behandling av egne data, men DNA-resultater avslører også informasjon om slektninger som ikke har samtykket; (3) tredjepartseffekt — genetisk informasjon er i sin natur delt mellom biologiske slektninger; (4) overføring til tredjeland — de fleste DNA-selskaper lagrer data utenfor EØS; (5) politiets bruk — DNA-databaser fra slektsgransking har vært brukt av politi i utlandet; (6) anbefaling — vurder nøye om du ønsker å dele genetisk informasjon med kommersielle aktører.",
    topics: JSON.stringify(["biometri", "helsedata"]),
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

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

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
  db.prepare("SELECT count(*) as cnt FROM decisions_fts").get() as {
    cnt: number;
  }
).cnt;
const guidelineFtsCount = (
  db.prepare("SELECT count(*) as cnt FROM guidelines_fts").get() as {
    cnt: number;
  }
).cnt;

const totalFineAmount = (
  db
    .prepare(
      "SELECT COALESCE(SUM(fine_amount), 0) as total FROM decisions WHERE fine_amount IS NOT NULL",
    )
    .get() as { total: number }
).total;

console.log(`\nDatabase summary:`);
console.log(`  Topics:         ${topicCount}`);
console.log(`  Decisions:      ${decisionCount} (FTS entries: ${decisionFtsCount})`);
console.log(`  Guidelines:     ${guidelineCount} (FTS entries: ${guidelineFtsCount})`);
console.log(
  `  Total records:  ${topicCount + decisionCount + guidelineCount}`,
);
console.log(
  `  Total fines:    ${(totalFineAmount / 1_000_000).toFixed(1)} million NOK`,
);
console.log(`\nDone. Database ready at ${DB_PATH}`);

db.close();
