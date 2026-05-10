/**
 * list_topics — extracted from src/index.ts by
 * scripts/apply-sector-regulator-golden-standard.py.
 *
 * Original tool name: no_dp_list_topics
 */

import { listTopics } from "../db.js";
import { textContent, errorContent } from "./_helpers.js";



export const LIST_TOPICS_TOOL = {
  name: "list_topics",
  description: "List all covered data protection topics with Norwegian and English names. Use topic IDs to filter decisions and guidelines.",
  inputSchema: {
        type: "object" as const,
        properties: {},
        required: [],
      },
};

export async function handleListTopics(args: unknown) {
  const topics = listTopics();
  return textContent({ topics, count: topics.length });
}
