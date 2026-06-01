import "server-only";

import { NextResponse } from "next/server";
import { parseEther } from "viem";
import { callAI, type AIResponse } from "@/lib/api/ai-client";
import {
  claimNonceOnce,
  markBurnConsumed,
  releaseBurnReservation,
  reserveBurnOnce,
} from "@/lib/api/burn-consumption";
import { validateSignedAgentBody } from "@/lib/api/request-auth";
import { verifyBurn } from "@/lib/api/verify-burn";

export type AIAgentRequest = {
  txHash: `0x${string}`;
  chainId: number;
  walletAddress: `0x${string}`;
  payload: unknown;
};

export type PayloadValidation<TPayload> =
  | { ok: true; payload: TPayload }
  | { ok: false; error: string };

export type AgentRouteConfig<TPayload> = {
  cost: `${number}`;
  validatePayload: (payload: unknown) => PayloadValidation<TPayload>;
  buildPrompt: (payload: TPayload) => {
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
    temperature?: number;
  };
  extraResponse?: (payload: TPayload, aiResponse: AIResponse) => Record<string, unknown>;
};

export async function handleAIAgentRequest<TPayload>(request: Request, config: AgentRouteConfig<TPayload>) {
  try {
    const preflight = validateRequestPreflight(request);
    if (!preflight.ok) {
      return NextResponse.json({ success: false, error: preflight.error }, { status: preflight.status });
    }

    const route = new URL(request.url).pathname;
    const parsedJson = await readJsonWithLimit(request, 32_000);
    if (!parsedJson.ok) {
      return NextResponse.json({ success: false, error: parsedJson.error }, { status: parsedJson.status });
    }

    const bodyValidation = await validateSignedAgentBody(parsedJson.value, route);
    if (!bodyValidation.ok) {
      return NextResponse.json({ success: false, error: bodyValidation.error }, { status: 400 });
    }

    const payloadValidation = config.validatePayload(bodyValidation.body.payload);
    if (!payloadValidation.ok) {
      return NextResponse.json({ success: false, error: payloadValidation.error }, { status: 400 });
    }

    const nonceClaim = claimNonceOnce({
      chainId: bodyValidation.body.chainId,
      walletAddress: bodyValidation.body.walletAddress,
      nonce: bodyValidation.body.nonce,
      expiresAt: bodyValidation.body.expiresAt,
    });
    if (!nonceClaim.ok) {
      return NextResponse.json({ success: false, error: nonceClaim.error }, { status: 409 });
    }

    const burn = await verifyBurn({
      txHash: bodyValidation.body.txHash,
      chainId: bodyValidation.body.chainId,
      expectedBurner: bodyValidation.body.walletAddress,
      minimumAmount: parseEther(config.cost),
    });

    if (!burn.valid) {
      return NextResponse.json(
        { success: false, error: `Burn verification failed: ${burn.error}` },
        { status: 403 },
      );
    }

    const burnReservation = reserveBurnOnce({
      chainId: bodyValidation.body.chainId,
      txHash: bodyValidation.body.txHash,
      walletAddress: bodyValidation.body.walletAddress,
      requestHash: bodyValidation.requestHash,
    });
    if (!burnReservation.ok) {
      return NextResponse.json({ success: false, error: burnReservation.error }, { status: 409 });
    }

    let aiResponse: AIResponse;
    try {
      aiResponse = await callAI(config.buildPrompt(payloadValidation.payload));
      markBurnConsumed(burnReservation.key);
    } catch (error) {
      releaseBurnReservation(burnReservation.key);
      throw error;
    }

    return NextResponse.json({
      success: true,
      result: aiResponse.content,
      model: aiResponse.model,
      provider: aiResponse.provider,
      tokensUsed: aiResponse.tokensUsed,
      ...config.extraResponse?.(payloadValidation.payload, aiResponse),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

function validateRequestPreflight(request: Request):
  | { ok: true }
  | { ok: false; status: number; error: string } {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false, status: 415, error: "Content-Type must be application/json" };
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > 32_000) {
    return { ok: false, status: 413, error: "Request body too large" };
  }

  return { ok: true };
}

async function readJsonWithLimit(request: Request, maxBytes: number):
  Promise<
    | { ok: true; value: unknown }
    | { ok: false; status: number; error: string }
  > {
  if (!request.body) {
    return { ok: false, status: 400, error: "Request body is required" };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    received += value.byteLength;
    if (received > maxBytes) {
      reader.cancel().catch(() => undefined);
      return { ok: false, status: 413, error: "Request body too large" };
    }

    chunks.push(value);
  }

  try {
    const buffer = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return { ok: true, value: JSON.parse(new TextDecoder().decode(buffer)) };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body" };
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readBoundedString(
  value: unknown,
  field: string,
  { min = 1, max }: { min?: number; max: number },
) {
  if (typeof value !== "string") {
    return { ok: false as const, error: `${field} must be a string` };
  }

  const trimmed = value.trim();
  if (trimmed.length < min) {
    return { ok: false as const, error: `${field} is required` };
  }

  if (trimmed.length > max) {
    return { ok: false as const, error: `${field} must be ${max} characters or fewer` };
  }

  return { ok: true as const, value: trimmed };
}
