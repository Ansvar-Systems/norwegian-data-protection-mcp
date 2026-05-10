/**
 * get_decision — extracted from src/index.ts by
 * scripts/apply-sector-regulator-golden-standard.py.
 *
 * Original tool name: no_dp_get_decision
 */

import { z } from "zod";
import { getDecision } from "../db.js";
import { buildCitation } from "../citation.js";
import { textContent, errorContent } from "./_helpers.js";

const GetDecisionArgs = z.object({
  reference: z.string().min(1),
});

export const GET_DECISION_TOOL = {
  name: "get_decision",
  description: "Get a specific Datatilsynet decision by ID.",
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
};

export async function handleGetDecision(args: unknown) {
  const parsed = GetDecisionArgs.parse(args);
  const decision = getDecision(parsed.reference);
  if (!decision) {
    return errorContent(`Decision not found: ${parsed.reference}`);
  }
  const d = decision as unknown as Record<string, unknown>;
  return textContent({
    ...d,
    _citation: buildCitation(
      String(d.reference ?? parsed.reference),
      String(d.title ?? d.reference ?? parsed.reference),
      "no_dp_get_decision",
      { reference: parsed.reference },
    ),
  });
}
