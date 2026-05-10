/**
 * search_decisions — extracted from src/index.ts by
 * scripts/apply-sector-regulator-golden-standard.py.
 *
 * Original tool name: no_dp_search_decisions
 */

import { z } from "zod";
import { searchDecisions } from "../db.js";
import { textContent, errorContent } from "./_helpers.js";

const SearchDecisionsArgs = z.object({
  query: z.string().min(1),
  type: z.enum(["vedtak", "overtredelsesgebyr", "varsel", "uttalelse"]).optional(),
  topic: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const SEARCH_DECISIONS_TOOL = {
  name: "search_decisions",
  description: "Search Datatilsynet enforcement decisions, guidance documents, and regulatory opinions on GDPR and Norwegian data protection law.",
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
};

export async function handleSearchDecisions(args: unknown) {
  const parsed = SearchDecisionsArgs.parse(args);
  const results = searchDecisions({
    query: parsed.query,
    type: parsed.type,
    topic: parsed.topic,
    limit: parsed.limit,
  });
  return textContent({ results, count: results.length });
}
