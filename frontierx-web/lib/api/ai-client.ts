import "server-only";

export type AIRequestOptions = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
};

export type AIResponse = {
  content: string;
  model: string;
  provider: "deepseek" | "minimax";
  tokensUsed: number;
};

export async function callAI(options: AIRequestOptions): Promise<AIResponse> {
  const providers = [callDeepSeek, callMiniMax];
  let lastError: unknown;

  for (const provider of providers) {
    try {
      return await provider(options);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(lastError instanceof Error ? lastError.message : "All AI providers failed");
}

async function callDeepSeek(options: AIRequestOptions): Promise<AIResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
  const response = await postOpenAICompatibleChat({
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    apiKey,
    model,
    options,
  });

  return {
    ...response,
    model,
    provider: "deepseek",
  };
}

async function callMiniMax(options: AIRequestOptions): Promise<AIResponse> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY is not configured");
  }

  const model = process.env.MINIMAX_MODEL || "MiniMax-M3";
  const response = await postOpenAICompatibleChat({
    baseUrl: process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1",
    apiKey,
    model,
    options,
  });

  return {
    ...response,
    model,
    provider: "minimax",
  };
}

async function postOpenAICompatibleChat({
  baseUrl,
  apiKey,
  model,
  options,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  options: AIRequestOptions;
}): Promise<Omit<AIResponse, "model" | "provider">> {
  const controller = new AbortController();
  const timeout = windowlessSetTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: options.systemPrompt },
          { role: "user", content: options.userPrompt },
        ],
        max_tokens: options.maxTokens ?? 2_000,
        temperature: options.temperature ?? 0.7,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI provider returned ${response.status}`);
    }

    const data = parseChatCompletionResponse(await response.json());
    const content = data.content;

    if (!content) {
      throw new Error("AI provider returned an empty response");
    }

    return {
      content,
      tokensUsed: data.tokensUsed,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseChatCompletionResponse(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.choices)) {
    throw new Error("AI provider returned an invalid response");
  }

  const firstChoice = value.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    throw new Error("AI provider returned no message");
  }

  const content = firstChoice.message.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("AI provider returned an empty response");
  }

  const usage = isRecord(value.usage) ? value.usage : undefined;
  const totalTokens = usage?.total_tokens;

  return {
    content: content.trim(),
    tokensUsed: typeof totalTokens === "number" && Number.isFinite(totalTokens) ? totalTokens : 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function windowlessSetTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}
