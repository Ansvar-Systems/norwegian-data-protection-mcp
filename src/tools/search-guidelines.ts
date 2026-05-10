/**
 * search_guidelines — extracted from src/index.ts by
 * scripts/apply-sector-regulator-golden-standard.py.
 *
 * Original tool name: no_dp_search_guidelines
 */

import { z } from "zod";
import { searchGuidelines } from "../db.js";
import { textContent, errorContent } from "./_helpers.js";

const SearchGuidelinesArgs = z.object({
  query: z.string().min(1),
  type: z.enum(["veileder", "retningslinje", "FAQ", "uttalelse"]).optional(),
  topic: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const SEARCH_GUIDELINES_TOOL = {
  name: "search_guidelines",
  description: "Search Datatilsynet published guidance on GDPR compliance topics.",
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
};

export async function handleSearchGuidelines(args: unknown) {
  const parsed = SearchGuidelinesArgs.parse(args);
  const results = searchGuidelines({
    query: parsed.query,
    type: parsed.type,
    topic: parsed.topic,
    limit: parsed.limit,
  });
  return textContent({ results, count: results.length });
}
