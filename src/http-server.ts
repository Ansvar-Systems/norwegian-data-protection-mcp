#!/usr/bin/env node

/**
 * HTTP Server Entry Point for Docker Deployment
 *
 * Provides Streamable HTTP transport for remote MCP clients.
 * Use src/index.ts for local stdio-based usage.
 *
 * Endpoints:
 *   GET  /health  — liveness probe
 *   POST /mcp     — MCP Streamable HTTP (session-aware)
 */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
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

const PORT = parseInt(process.env["PORT"] ?? "3000", 10);
const SERVER_NAME = "norwegian-data-protection-mcp";
const DATA_AGE = "2026-04-04";
const SOURCE_URL = "https://www.datatilsynet.no/";

let pkgVersion = "0.1.0";
try {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf8"),
  ) as { version: string };
  pkgVersion = pkg.version;
} catch {
  // fallback
}

// --- Tool definitions (shared with index.ts) ---------------------------------

const TOOLS = [
  {
    name: "no_dp_search_decisions",
    description:
      "Search Datatilsynet enforcement decisions, guidance documents, and regulatory opinions on GDPR and Norwegian data protection law.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query in Norwegian (e.g., 'personvern', 'behandlingsgrunnlag', 'databehandleravtale')" },
        type: {
          type: "string",
          enum: ["vedtak", "overtredelsesgebyr", "varsel", "uttalelse"],
          description: "Filter by decision type. Optional.",
        },
        topic: { type: "string", description: "Filter by topic ID. Optional." },
        limit: { type: "number", description: "Max results (default 20)." },
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
        reference: { type: "string", description: "Datatilsynet decision reference" },
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
        query: { type: "string", description: "Search query in Norwegian" },
        type: {
          type: "string",
          enum: ["veileder", "retningslinje", "FAQ", "uttalelse"],
          description: "Filter by guidance type. Optional.",
        },
        topic: { type: "string", description: "Filter by topic ID. Optional." },
        limit: { type: "number", description: "Max results (default 20)." },
      },
      required: ["query"],
    },
  },
  {
    name: "no_dp_get_guideline",
    description: "Get a specific Datatilsynet guidance document by its database ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Guideline database ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "no_dp_list_topics",
    description: "List all covered data protection topics with Norwegian and English names.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "no_dp_list_sources",
    description: "List all data sources used by this MCP server, including authority, coverage counts, and update frequency.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "no_dp_check_data_freshness",
    description: "Check when the data in this MCP server was last updated and what coverage it provides.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "no_dp_about",
    description: "Norwegian Data Protection MCP server. Covers Datatilsynet enforcement decisions, GDPR guidance, and regulatory opinions.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
];

// --- Zod schemas -------------------------------------------------------------

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

// --- Helpers -----------------------------------------------------------------

function responseMeta() {
  return {
    disclaimer:
      "Datatilsynet decisions and guidance documents are public records. This is informational only and not legal advice. Verify with official sources at datatilsynet.no.",
    data_age: DATA_AGE,
    source_url: SOURCE_URL,
  };
}

// --- MCP server factory ------------------------------------------------------

function createMcpServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: pkgVersion },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    function textContent(data: unknown) {
      const payload =
        typeof data === "object" && data !== null && !Array.isArray(data)
          ? { ...(data as Record<string, unknown>), _meta: responseMeta() }
          : { data, _meta: responseMeta() };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
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

    try {
      switch (name) {
        case "no_dp_search_decisions": {
          const parsed = SearchDecisionsArgs.parse(args);
          const results = searchDecisions({ query: parsed.query, type: parsed.type, topic: parsed.topic, limit: parsed.limit });
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
          if (!decision) return errorContent(`Decision not found: ${parsed.reference}`, "not_found");
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
          const results = searchGuidelines({ query: parsed.query, type: parsed.type, topic: parsed.topic, limit: parsed.limit });
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
          if (!guideline) return errorContent(`Guideline not found: id=${parsed.id}`, "not_found");
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
            description: "Norwegian Data Protection MCP server. Covers Datatilsynet enforcement decisions, GDPR guidance, and regulatory opinions on personopplysningsloven and the Norwegian GDPR implementation.",
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

  return server;
}

// --- HTTP server -------------------------------------------------------------

async function main(): Promise<void> {
  const sessions = new Map<
    string,
    { transport: StreamableHTTPServerTransport; server: Server }
  >();

  const httpServer = createServer((req, res) => {
    handleRequest(req, res, sessions).catch((err) => {
      console.error(`[${SERVER_NAME}] Unhandled error:`, err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    });
  });

  async function handleRequest(
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    activeSessions: Map<
      string,
      { transport: StreamableHTTPServerTransport; server: Server }
    >,
  ): Promise<void> {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", server: SERVER_NAME, version: pkgVersion }));
      return;
    }

    if (url.pathname === "/mcp") {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && activeSessions.has(sessionId)) {
        const session = activeSessions.get(sessionId)!;
        await session.transport.handleRequest(req, res);
        return;
      }

      const mcpServer = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK type mismatch with exactOptionalPropertyTypes
      await mcpServer.connect(transport as any);

      transport.onclose = () => {
        if (transport.sessionId) {
          activeSessions.delete(transport.sessionId);
        }
        mcpServer.close().catch(() => {});
      };

      await transport.handleRequest(req, res);

      if (transport.sessionId) {
        activeSessions.set(transport.sessionId, { transport, server: mcpServer });
      }
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }

  httpServer.listen(PORT, () => {
    console.error(`${SERVER_NAME} v${pkgVersion} (HTTP) listening on port ${PORT}`);
    console.error(`MCP endpoint:  http://localhost:${PORT}/mcp`);
    console.error(`Health check:  http://localhost:${PORT}/health`);
  });

  process.on("SIGTERM", () => {
    console.error("Received SIGTERM, shutting down...");
    httpServer.close(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
