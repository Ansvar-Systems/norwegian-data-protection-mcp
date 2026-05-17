# Norwegian Data Protection MCP

<!-- ANSVAR-CTA-BEGIN -->
> ### ▶ Try this MCP instantly via Ansvar Gateway
> **50 free queries/day · no card required · OAuth signup at [ansvar.eu/gateway](https://ansvar.eu/gateway)**
>
> One endpoint, one OAuth signup, access from any MCP-compatible client.

### Connect

**Claude Code** (one line):

```bash
claude mcp add ansvar --transport http https://gateway.ansvar.eu/mcp
```

**Claude Desktop / Cursor** — add to `claude_desktop_config.json` (or `mcp.json`):

```json
{
  "mcpServers": {
    "ansvar": {
      "type": "url",
      "url": "https://gateway.ansvar.eu/mcp"
    }
  }
}
```

**Claude.ai** — Settings → Connectors → Add custom connector → paste `https://gateway.ansvar.eu/mcp`

First request opens an OAuth flow at [ansvar.eu/gateway](https://ansvar.eu/gateway). After signup, your client is bound to your account; tier (free / premium / team / company) determines fan-out, quota, and which downstream MCPs are reachable.

---

## Self-host this MCP

You can also clone this repo and build the corpus yourself. The schema,
fetcher, and tool implementations all live here. What is not in the repo is
the pre-built database — TDM and standards-licensing constraints on the
upstream sources mean we host the corpus on Ansvar infrastructure rather
than redistribute it as a public artifact.

Build your own: run this repo's ingestion script (entry-point varies per
repo — typically `scripts/ingest.sh`, `npm run ingest`, or `make ingest`;
check the repo root).
<!-- ANSVAR-CTA-END -->


MCP server for Norwegian data protection enforcement -- Datatilsynet decisions, GDPR fines, and compliance guidance.

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
| Decisions | 180 | Overtredelsesgebyr (fines), vedtak, klagevedtak, irettesettelser, forbud, varsler |
| Guidelines | 186 | Veiledere (guides), rapporter, hoeringsuttalelser, verktoy |
| Topics | 30 | Controlled vocabulary for data protection areas |
| **Total** | **396 records** | ~820 KB database |

### Key Statistics

- **97 fine decisions** totalling **531M NOK**
- **113 unique entities** sanctioned
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
