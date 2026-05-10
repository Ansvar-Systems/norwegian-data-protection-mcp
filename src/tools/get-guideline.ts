/**
 * get_guideline — extracted from src/index.ts by
 * scripts/apply-sector-regulator-golden-standard.py.
 *
 * Original tool name: no_dp_get_guideline
 */

import { z } from "zod";
import { getGuideline } from "../db.js";
import { buildCitation } from "../citation.js";
import { textContent, errorContent } from "./_helpers.js";

const GetGuidelineArgs = z.object({
  id: z.number().int().positive(),
});

export const GET_GUIDELINE_TOOL = {
  name: "get_guideline",
  description: "Get a specific Datatilsynet guidance document by its database ID.",
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
};

export async function handleGetGuideline(args: unknown) {
  const parsed = GetGuidelineArgs.parse(args);
  const guideline = getGuideline(parsed.id);
  if (!guideline) {
    return errorContent(`Guideline not found: id=${parsed.id}`);
  }
  const g = guideline as unknown as Record<string, unknown>;
  return textContent({
    ...g,
    _citation: buildCitation(
      String(g.reference ?? g.title ?? `guideline-${parsed.id}`),
      String(g.title ?? `Guideline ${parsed.id}`),
      "no_dp_get_guideline",
      { id: String(parsed.id) },
    ),
  });
}
