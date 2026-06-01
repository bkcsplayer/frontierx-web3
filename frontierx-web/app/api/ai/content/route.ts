import { handleAIAgentRequest, isRecord, readBoundedString } from "@/lib/api/agent-route";
import { platformPrompts } from "@/lib/api/ai-prompts";

export const runtime = "nodejs";

type ContentPayload = {
  topic: string;
  platform: keyof typeof platformPrompts;
};

export async function POST(request: Request) {
  return handleAIAgentRequest<ContentPayload>(request, {
    cost: "10",
    validatePayload(payload) {
      if (!isRecord(payload)) {
        return { ok: false, error: "Invalid payload" };
      }

      const topic = readBoundedString(payload.topic, "topic", { max: 1_000 });
      if (!topic.ok) return topic;

      if (typeof payload.platform !== "string" || !(payload.platform in platformPrompts)) {
        return { ok: false, error: "Unsupported platform" };
      }

      return {
        ok: true,
        payload: {
          topic: topic.value,
          platform: payload.platform,
        },
      };
    },
    buildPrompt(payload) {
      return {
        systemPrompt: platformPrompts[payload.platform],
        userPrompt: `Create platform-native content about:\n\n${payload.topic}`,
        maxTokens: 2_000,
      };
    },
    extraResponse(payload) {
      return { platform: payload.platform };
    },
  });
}
