# Tools -- Norwegian Data Protection MCP

6 tools for searching and retrieving Datatilsynet decisions, guidance, and data protection topics.

All data is in Norwegian. Tool descriptions and parameter names are in English.

---

## 1. no_dp_search_decisions

Full-text search across Datatilsynet enforcement decisions, sanctions, and regulatory opinions on GDPR and Norwegian data protection law. Returns vedtak (decisions), overtredelsesgebyr (fines), varsler (notices), and uttalelser (opinions).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search query in Norwegian (e.g., `personvern`, `behandlingsgrunnlag`, `databehandleravtale`, `konsekvensvurdering`) |
| `type` | string | No | Filter by decision type: `vedtak`, `overtredelsesgebyr`, `varsel`, `uttalelse` |
| `topic` | string | No | Filter by topic ID (e.g., `samtykke`, `informasjonskapsler`, `personvernombud`). Use `no_dp_list_topics` to see all IDs. |
| `limit` | number | No | Maximum results (default 20, max 100) |

**Returns:** Array of matching decisions with reference, title, date, type, entity name, fine amount (if applicable), summary, full text, topics, GDPR articles cited, and status.

**Example:**

```json
{
  "query": "overtredelsesgebyr samtykke",
  "type": "overtredelsesgebyr"
}
```

**Data sources:** Datatilsynet (datatilsynet.no).

**Limitations:** Summaries, not full legal text. Norwegian-language content only. Does not include Personvernnemnda appeal outcomes.

---

## 2. no_dp_get_decision

Get a specific Datatilsynet decision by its reference string. Returns the full record including text, metadata, fine amount, and GDPR articles cited.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `reference` | string | Yes | Datatilsynet decision reference (e.g., `20/02336`, `21/01209`) |

**Returns:** Single decision record with all fields, or an error if not found.

**Example:**

```json
{
  "reference": "20/02336"
}
```

**Data sources:** Datatilsynet (datatilsynet.no).

**Limitations:** Exact match on reference string. Partial matches are not supported -- use `no_dp_search_decisions` for fuzzy search.

---

## 3. no_dp_search_guidelines

Search Datatilsynet published guidance on GDPR compliance topics. Returns veiledere (guides), retningslinjer (guidelines), hoeringsuttalelser (consultation responses), FAQs, and uttalelser (opinions).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search query in Norwegian (e.g., `informasjonskapsler`, `konsekvensvurdering`, `personvernombud`, `kameraovervaking`) |
| `type` | string | No | Filter by guidance type: `veileder`, `retningslinje`, `FAQ`, `uttalelse` |
| `topic` | string | No | Filter by topic ID (e.g., `konsekvensvurdering`, `informasjonskapsler`, `overforing`). Use `no_dp_list_topics` to see all IDs. |
| `limit` | number | No | Maximum results (default 20, max 100) |

**Returns:** Array of matching guidance documents with reference, title, date, type, summary, full text, topics, and language.

**Example:**

```json
{
  "query": "informasjonskapsler",
  "type": "veileder"
}
```

**Data sources:** Datatilsynet (datatilsynet.no).

**Limitations:** Summaries, not full guidance text. Norwegian-language content only.

---

## 4. no_dp_get_guideline

Get a specific Datatilsynet guidance document by its database ID. The ID is returned in search results from `no_dp_search_guidelines`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | number | Yes | Guideline database ID (from search results) |

**Returns:** Single guideline record with all fields, or an error if not found.

**Example:**

```json
{
  "id": 5
}
```

**Data sources:** Datatilsynet (datatilsynet.no).

**Limitations:** Requires a valid database ID. Use `no_dp_search_guidelines` to find IDs.

---

## 5. no_dp_list_topics

List all covered data protection topics with Norwegian and English names. Returns the controlled vocabulary used for topic-based filtering in `no_dp_search_decisions` and `no_dp_search_guidelines`.

**Parameters:** None.

**Returns:** Array of topics with ID, Norwegian name (name_local), English name (name_en), and description.

**Example:**

```json
{}
```

**Data sources:** N/A (controlled vocabulary).

**Limitations:** None.

---

## 6. no_dp_about

Return metadata about this MCP server: version, description, data source, coverage summary, and tool list. Takes no parameters.

**Parameters:** None.

**Returns:** Server name, version, description, data source URL, coverage summary, and tool list (name, description).

**Example:**

```json
{}
```

**Data sources:** N/A (server metadata).

**Limitations:** None.
