# Coverage -- Norwegian Data Protection MCP

Current coverage of Norwegian data protection regulatory data from Datatilsynet.

**Last updated:** 2026-04-04

---

## Sources

| Source | Authority | Records | Content |
|--------|-----------|---------|---------|
| **Datatilsynet** | Norwegian Data Protection Authority | 180 decisions | Overtredelsesgebyr, vedtak, klagevedtak, irettesettelser, forbud, varsler on GDPR enforcement |
| **Datatilsynet** | Norwegian Data Protection Authority | 186 guidelines | Veiledere, rapporter, hoeringsuttalelser, verktoy on data protection compliance |
| **Topics** | Controlled vocabulary | 30 topics | Data protection topic taxonomy (Norwegian + English names) |
| **Total** | | **396 records** | ~820 KB SQLite database |

---

## Decision Types

| Type | Norwegian Term | Count | Description |
|------|---------------|-------|-------------|
| `overtredelsesgebyr` | Overtredelsesgebyr (Administrative Fine) | 89 | GDPR fines imposed on organisations |
| `vedtak` | Vedtak (Decision) | 34 | Formal enforcement decisions by Datatilsynet |
| `klagevedtak` | Klagevedtak (Appeal Decision) | 30 | Decisions on complaints and appeals |
| `irettesettelse` | Irettesettelse (Reprimand) | 16 | Formal reprimands without financial penalty |
| `forbud` | Forbud (Prohibition) | 8 | Orders to cease processing activities |
| `varsel` | Varsel om vedtak (Notice of Decision) | 3 | Preliminary notices before final decision |

### Fines Summary

- **97 fine decisions** across all decision types
- **113 unique entities** sanctioned
- **531.0M NOK** total fines across all decisions
- Covers sectors including telecommunications, municipalities, healthcare, education, finance, and technology

---

## Guideline Types

| Type | Norwegian Term | Count | Description |
|------|---------------|-------|-------------|
| `veileder` | Veileder (Guide) | 127 | Practical compliance guidance documents |
| `rapport` | Rapport (Report) | 35 | Published reports and analysis from Datatilsynet |
| `hoeringsuttalelse` | Hoeringsuttalelse (Consultation Response) | 22 | Datatilsynet responses to legislative consultations |
| `verktoy` | Verktoy (Tool) | 2 | Interactive compliance tools and checklists |

---

## Topics (30 Total)

The topic taxonomy covers core data protection areas including:

- **samtykke** -- Consent (GDPR Art. 6(1)(a), Art. 7)
- **informasjonskapsler** -- Cookies and online tracking
- **konsekvensvurdering** -- Data Protection Impact Assessment (DPIA)
- **personvernombud** -- Data Protection Officer (DPO)
- **databehandleravtale** -- Data processing agreements
- **overforing** -- International data transfers
- **innsyn** -- Data subject access rights
- **barn** -- Children's data protection
- **arbeidsforhold** -- Employment and workplace privacy
- **kameraovervaking** -- Camera surveillance / CCTV
- **helsedata** -- Health data
- **behandlingsgrunnlag** -- Legal basis for processing
- **informasjonsplikt** -- Transparency and information obligations
- **avvikshendelser** -- Data breach notification
- **kunstig_intelligens** -- Artificial intelligence and automated decisions

Use `no_dp_list_topics` to get the full list with Norwegian and English names.

---

## What Is NOT Included

This dataset does not cover:

- **Full legal text** -- records contain summaries, not complete decision or guidance text from datatilsynet.no
- **Personvernnemnda decisions** -- Privacy Appeals Board rulings are not included
- **Court judgments** -- Norwegian court decisions on data protection are not covered
- **EDPB guidelines** -- European Data Protection Board guidance is covered by the [EU Regulations MCP](https://github.com/Ansvar-Systems/EU_compliance_MCP), not this server
- **Sector-specific guidance** -- guidance from Nkom, Helsetilsynet, Finanstilsynet, and other regulators is not included
- **Historical decision versions** -- only current final versions are covered
- **Lovdata legislation text** -- personopplysningsloven and forskrift om behandling av personopplysninger are referenced but not included as full text

---

## Limitations

- **Norwegian text only** -- all regulatory content is in Norwegian. English search queries may return limited results.
- **Summaries, not full legal text** -- records contain representative summaries, not the complete official text from datatilsynet.no.
- **Manual refresh** -- data is updated manually. Recent decisions and guidance may not be reflected.
- **No real-time tracking** -- appeals, amendments, and new decisions are not tracked automatically.
- **Fine amounts** -- amounts are as reported; currency adjustments, payment status, and appeal outcomes are not tracked.

---

## Planned Improvements

Additional data sources planned:

- **personvernnemnda.no** -- Privacy Appeals Board decisions
- **lovdata.no** -- personopplysningsloven and related regulations (full text)
- **Automated refresh** -- scheduled ingestion from datatilsynet.no for new decisions and guidance

---

## Language

All content is in Norwegian. The following search terms are useful starting points:

| Norwegian Term | English Equivalent |
|----------------|-------------------|
| personvern | privacy / data protection |
| samtykke | consent |
| behandlingsgrunnlag | legal basis for processing |
| databehandleravtale | data processing agreement |
| konsekvensvurdering | data protection impact assessment (DPIA) |
| informasjonskapsler | cookies |
| personvernombud | data protection officer (DPO) |
| overforing | international transfer |
| innsyn | access right / subject access |
| kameraovervaking | camera surveillance / CCTV |
| helsedata | health data |
| avvikshendelser | data breach |
| barn | children |
| arbeidsforhold | employment |
| informasjonsplikt | transparency obligation |
| overtredelsesgebyr | administrative fine |
| vedtak | decision |
| varsel | notice / warning |
