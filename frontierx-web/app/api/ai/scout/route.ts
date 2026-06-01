import { handleAIAgentRequest, isRecord, readBoundedString } from "@/lib/api/agent-route";
import { scoutSystemPrompt } from "@/lib/api/ai-prompts";

export const runtime = "nodejs";

type ScoutPayload = {
  query: string;
};

export async function POST(request: Request) {
  return handleAIAgentRequest<ScoutPayload>(request, {
    cost: "10",
    validatePayload(payload) {
      if (!isRecord(payload)) {
        return { ok: false, error: "Invalid payload" };
      }

      const query = readBoundedString(payload.query, "query", { max: 500 });
      if (!query.ok) return query;

      return { ok: true, payload: { query: query.value } };
    },
    buildPrompt(payload) {
      return {
        systemPrompt: scoutSystemPrompt,
        userPrompt: `Analyze AI search visibility for: ${payload.query}`,
        maxTokens: 2_000,
      };
    },
  });
}
