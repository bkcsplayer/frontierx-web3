import { handleAIAgentRequest, isRecord, readBoundedString } from "@/lib/api/agent-route";
import { distillSystemPrompt } from "@/lib/api/ai-prompts";

export const runtime = "nodejs";

type DistillPayload = {
  text: string;
};

export async function POST(request: Request) {
  return handleAIAgentRequest<DistillPayload>(request, {
    cost: "15",
    validatePayload(payload) {
      if (!isRecord(payload)) {
        return { ok: false, error: "Invalid payload" };
      }

      const text = readBoundedString(payload.text, "text", { max: 8_000 });
      if (!text.ok) return text;

      return { ok: true, payload: { text: text.value } };
    },
    buildPrompt(payload) {
      return {
        systemPrompt: distillSystemPrompt,
        userPrompt: `Distill the following text into structured knowledge:\n\n${payload.text}`,
        maxTokens: 3_000,
        temperature: 0.4,
      };
    },
  });
}
