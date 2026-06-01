import { NextResponse } from "next/server";
import { canAcceptBurnConsumption } from "@/lib/api/burn-consumption";

export const runtime = "nodejs";

export async function GET() {
  const burnConsumptionReady = canAcceptBurnConsumption();

  return NextResponse.json({
    success: true,
    burnConsumptionReady,
    error: burnConsumptionReady
      ? undefined
      : "Durable burn consumption storage is required before paid AI requests can be accepted in production.",
  });
}
