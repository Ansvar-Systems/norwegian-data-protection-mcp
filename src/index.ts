#!/usr/bin/env node

/**
 * Norwegian Data Protection MCP — stdio entry point.
 *
 * Provides MCP tools for querying Datatilsynet (Norwegian DPA) decisions,
 * sanctions, and data protection guidance documents.
 *
 * Tool prefix: no_dp_
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  searchDecisions,
  getDecision,
  searchGuidelines,
  getGuideline,
  listTopics,
} from "./db.js";
import { buildCitation } from "./citation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pkgVersion = "0.1.0";
try {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf8"),
  ) as { version: string };
  pkgVersion = pkg.version;
} catch {
  // fallback to default
}

const SERVER_NAME = "norwegian-data-protection-mcp";
const DATA_AGE = "2026-04-04";
const SOURCE_URL = "https://www.datatilsynet.no/";

// --- Tool definitions ---------------------------------------------------------

const TOOLS = [
  {
    name: "no_dp_search_decisions",
    description:
      "Search Datatilsynet enforcement decisions, guidance documents, and regulatory opinions on GDPR and Norwegian data protection law.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query in Norwegian (e.g., 'personvern', 'behandlingsgrunnlag', 'databehandleravtale', 'konsekvensvurdering')",
        },
        type: {
          type: "string",
          enum: ["vedtak", "overtredelsesgebyr", "varsel", "uttalelse"],
          description: "Filter by decision type. Optional.",
        },
        topic: {
          type: "string",
          description: "Filter by topic ID (e.g., 'samtykke', 'informasjonskapsler', 'personvernombud'). Optional.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return. Defaults to 20.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "no_dp_get_decision",
    description:
      "Get a specific Datatilsynet decision by ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        reference: {
          type: "string",
          description: "Datatilsynet decision reference (e.g., '20/02336', '21/01209')",
        },
      },
      required: ["reference"],
    },
  },
  {
    name: "no_dp_search_guidelines",
    description:
      "Search Datatilsynet published guidance on GDPR compliance topics.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query in Norwegian (e.g., 'informasjonskapsler', 'konsekvensvurdering', 'personvernombud')",
        },
        type: {
          type: "string",
          enum: ["veileder", "retningslinje", "FAQ", "uttalelse"],
          description: "Filter by guidance type. Optional.",
        },
        topic: {
          type: "string",
          description: "Filter by topic ID (e.g., 'konsekvensvurdering', 'informasjonskapsler', 'overforing'). Optional.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return. Defaults to 20.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "no_dp_get_guideline",
    description:
      "Get a specific Datatilsynet guidance document by its database ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "number",
          description: "Guideline database ID (from no_dp_search_guidelines results)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "no_dp_list_topics",
    description:
      "List all covered data protection topics with Norwegian and English names. Use topic IDs to filter decisions and guidelines.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "no_dp_list_sources",
    description:
      "List all data sources used by this MCP server, including authority, coverage counts, and update frequency.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "no_dp_check_data_freshness",
    description:
      "Check when the data in this MCP server was last updated and what coverage it provides.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "no_dp_about",
    description: "Norwegian Data Protection MCP server. Covers Datatilsynet enforcement decisions, GDPR guidance, and regulatory opinions.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// --- Zod schemas for argument validation --------------------------------------

const SearchDecisionsArgs = z.object({
  query: z.string().min(1),
  type: z.enum(["vedtak", "overtredelsesgebyr", "varsel", "uttalelse"]).optional(),
  topic: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const GetDecisionArgs = z.object({
  reference: z.string().min(1),
});

const SearchGuidelinesArgs = z.object({
  query: z.string().min(1),
  type: z.enum(["veileder", "retningslinje", "FAQ", "uttalelse"]).optional(),
  topic: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const GetGuidelineArgs = z.object({
  id: z.number().int().positive(),
});

// --- Helpers ------------------------------------------------------------------

function responseMeta() {
  return {
    disclaimer:
      "Datatilsynet decisions and guidance documents are public records. This is informational only and not legal advice. Verify with official sources at datatilsynet.no.",
    data_age: DATA_AGE,
    source_url: SOURCE_URL,
  };
}

function textContent(data: unknown) {
  const payload =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? { ...(data as Record<string, unknown>), _meta: responseMeta() }
      : { data, _meta: responseMeta() };
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(payload, null, 2) },
    ],
  };
}

function errorContent(message: string, errorType = "tool_error") {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          { error: message, _meta: responseMeta(), _error_type: errorType },
          null,
          2,
        ),
      },
    ],
    isError: true as const,
  };
}

// --- Server setup ------------------------------------------------------------

const server = new Server(
  { name: SERVER_NAME, version: pkgVersion },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case "no_dp_search_decisions": {
        const parsed = SearchDecisionsArgs.parse(args);
        const results = searchDecisions({
          query: parsed.query,
          type: parsed.type,
          topic: parsed.topic,
          limit: parsed.limit,
        });
        const resultsWithCitation = (results as Record<string, unknown>[]).map((r) => ({
          ...r,
          _citation: buildCitation(
            String(r["reference"] ?? ""),
            String(r["title"] ?? r["reference"] ?? ""),
            "no_dp_get_decision",
            { reference: String(r["reference"] ?? "") },
            SOURCE_URL,
          ),
        }));
        return textContent({ results: resultsWithCitation, count: results.length });
      }

      case "no_dp_get_decision": {
        const parsed = GetDecisionArgs.parse(args);
        const decision = getDecision(parsed.reference);
        if (!decision) {
          return errorContent(`Decision not found: ${parsed.reference}`, "not_found");
        }
        const d = decision as Record<string, unknown>;
        return textContent({
          ...d,
          _citation: buildCitation(
            String(d["reference"] ?? parsed.reference),
            String(d["title"] ?? d["reference"] ?? parsed.reference),
            "no_dp_get_decision",
            { reference: parsed.reference },
            SOURCE_URL,
          ),
        });
      }

      case "no_dp_search_guidelines": {
        const parsed = SearchGuidelinesArgs.parse(args);
        const results = searchGuidelines({
          query: parsed.query,
          type: parsed.type,
          topic: parsed.topic,
          limit: parsed.limit,
        });
        const resultsWithCitation = (results as Record<string, unknown>[]).map((r) => ({
          ...r,
          _citation: buildCitation(
            String(r["reference"] ?? r["title"] ?? `guideline-${r["id"]}`),
            String(r["title"] ?? r["reference"] ?? `Guideline ${r["id"]}`),
            "no_dp_get_guideline",
            { id: r["id"] as number },
            SOURCE_URL,
          ),
        }));
        return textContent({ results: resultsWithCitation, count: results.length });
      }

      case "no_dp_get_guideline": {
        const parsed = GetGuidelineArgs.parse(args);
        const guideline = getGuideline(parsed.id);
        if (!guideline) {
          return errorContent(`Guideline not found: id=${parsed.id}`, "not_found");
        }
        const g = guideline as Record<string, unknown>;
        return textContent({
          ...g,
          _citation: buildCitation(
            String(g["reference"] ?? g["title"] ?? `guideline-${parsed.id}`),
            String(g["title"] ?? `Guideline ${parsed.id}`),
            "no_dp_get_guideline",
            { id: parsed.id },
            SOURCE_URL,
          ),
        });
      }

      case "no_dp_list_topics": {
        const topics = listTopics();
        return textContent({ topics, count: topics.length });
      }

      case "no_dp_list_sources": {
        return textContent({
          sources: [
            {
              name: "Datatilsynet (Norwegian Data Protection Authority)",
              authority: "Datatilsynet",
              official_url: SOURCE_URL,
              retrieval_method: "MANUAL_CURATION",
              update_frequency: "quarterly",
              coverage: {
                decisions: 180,
                guidelines: 186,
                topics: 30,
                total_records: 396,
              },
              license: "Public Domain (Norwegian government publications)",
              languages: ["no"],
            },
          ],
          data_age: DATA_AGE,
        });
      }

      case "no_dp_check_data_freshness": {
        return textContent({
          data_age: DATA_AGE,
          last_updated: DATA_AGE,
          is_stale: false,
          coverage: {
            decisions: 180,
            guidelines: 186,
            topics: 30,
            total_records: 396,
            fines_total_nok: 531000000,
            decisions_with_fines: 97,
            unique_entities_sanctioned: 113,
          },
          sources: [SOURCE_URL],
          update_frequency: "quarterly",
        });
      }

      case "no_dp_about": {
        return textContent({
          name: SERVER_NAME,
          version: pkgVersion,
          description:
            "Norwegian Data Protection MCP server. Covers Datatilsynet enforcement decisions, GDPR guidance, and regulatory opinions on personopplysningsloven and the Norwegian GDPR implementation.",
          data_source: `Datatilsynet (${SOURCE_URL})`,
          data_age: DATA_AGE,
          coverage: {
            decisions: 180,
            guidelines: 186,
            topics: 30,
            total_records: 396,
            fines_total_nok: 531000000,
          },
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
        });
      }

      default:
        return errorContent(`Unknown tool: ${name}`, "unknown_tool");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorContent(`Error executing ${name}: ${message}`);
  }
});

// --- Main --------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`${SERVER_NAME} v${pkgVersion} running on stdio\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
