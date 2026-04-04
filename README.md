# Norwegian Data Protection MCP

MCP server for Norwegian data protection enforcement -- Datatilsynet decisions, GDPR fines, and compliance guidance.

[![npm version](https://badge.fury.io/js/@ansvar%2Fnorwegian-data-protection-mcp.svg)](https://www.npmjs.com/package/@ansvar/norwegian-data-protection-mcp)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Covers Datatilsynet enforcement decisions, administrative fines, and published guidance on GDPR compliance in Norway. All data is in Norwegian.

Built by [Ansvar Systems](https://ansvar.eu) -- Stockholm, Sweden

---

## Authority Covered

| Authority | Role | Website |
|-----------|------|---------|
| **Datatilsynet** (Norwegian Data Protection Authority) | GDPR enforcement, administrative fines, compliance guidance, consultation responses, regulatory opinions | [datatilsynet.no](https://www.datatilsynet.no/) |

Norwegian data protection law is governed by **personopplysningsloven** (the Personal Data Act), which incorporates the GDPR into Norwegian law via the EEA Agreement. Datatilsynet is the supervisory authority under GDPR Article 51.

---

## Quick Start

### Use Remotely (No Install Needed)

**Endpoint:** `https://mcp.ansvar.eu/norwegian-data-protection/mcp`

| Client | How to Connect |
|--------|---------------|
| **Claude Desktop** | Add to `claude_desktop_config.json` (see below) |
| **Claude Code** | `claude mcp add norwegian-data-protection --transport http https://mcp.ansvar.eu/norwegian-data-protection/mcp` |

**Claude Desktop** -- add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "norwegian-data-protection": {
      "type": "url",
      "url": "https://mcp.ansvar.eu/norwegian-data-protection/mcp"
    }
  }
}
```

### Use Locally (npm)

```bash
npx @ansvar/norwegian-data-protection-mcp
```

Or add to Claude Desktop config for stdio:

```json
{
  "mcpServers": {
    "norwegian-data-protection": {
      "command": "npx",
      "args": ["-y", "@ansvar/norwegian-data-protection-mcp"]
    }
  }
}
```

---

## Tools

| Tool | Description |
|------|-------------|
| `no_dp_search_decisions` | Full-text search across Datatilsynet enforcement decisions, fines, and regulatory opinions |
| `no_dp_get_decision` | Get a specific decision by reference string (e.g., `20/02336`) |
| `no_dp_search_guidelines` | Search Datatilsynet published guidance on GDPR compliance topics |
| `no_dp_get_guideline` | Get a specific guidance document by database ID |
| `no_dp_list_topics` | List all data protection topics with Norwegian and English names |
| `no_dp_about` | Return server metadata: version, data source, tool list, coverage |

Full tool documentation: [TOOLS.md](TOOLS.md)

---

## Data Coverage

| Category | Records | Content |
|----------|---------|---------|
| Decisions | 92 | Vedtak, overtredelsesgebyr (fines), varsler (notices), uttalelser (opinions) |
| Guidelines | 78 | Veiledere (guides), retningslinjer, hoeringsuttalelser, FAQs |
| Topics | 30 | Controlled vocabulary for data protection areas |
| **Total** | **200 records** | ~496 KB database |

### Key Statistics

- **54 administrative fines** (overtredelsesgebyr) totalling **338.6M NOK**
- **73 unique entities** sanctioned
- **30 data protection topics** covering consent, cookies, DPIA, DPO, transfers, children, health data, and more

**Language note:** All regulatory content is in Norwegian. Search queries work best in Norwegian (e.g., `personvern`, `samtykke`, `konsekvensvurdering`, `informasjonskapsler`).

Full coverage details: [COVERAGE.md](COVERAGE.md)

---

## Data Sources

See [sources.yml](sources.yml) for machine-readable provenance metadata.

---

## Docker

```bash
docker build -t norwegian-data-protection-mcp .
docker run --rm -p 3000:3000 -v /path/to/data:/app/data norwegian-data-protection-mcp
```

Set `NO_DP_DB_PATH` to use a custom database location (default: `data/no-dp.db`).

---

## Development

```bash
npm install
npm run build
npm run seed         # populate sample data
npm run dev          # HTTP server on port 3000
```

---

## Further Reading

- [TOOLS.md](TOOLS.md) -- full tool documentation with examples
- [COVERAGE.md](COVERAGE.md) -- data coverage and limitations
- [sources.yml](sources.yml) -- data provenance metadata
- [DISCLAIMER.md](DISCLAIMER.md) -- legal disclaimer
- [PRIVACY.md](PRIVACY.md) -- privacy policy
- [SECURITY.md](SECURITY.md) -- vulnerability disclosure

---

## License

Apache-2.0 -- [Ansvar Systems AB](https://ansvar.eu)

See [LICENSE](LICENSE) for the full license text.

See [DISCLAIMER.md](DISCLAIMER.md) for important legal disclaimers about the use of this regulatory data.

---

[ansvar.ai/mcp](https://ansvar.ai/mcp) -- Full MCP server catalog
