import { NextResponse, type NextRequest } from "next/server";

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

export function proxy(request: NextRequest) {
  const key = getClientKey(request);
  const now = Date.now();
  const entry = rateLimit.get(key);

  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_REQUESTS) {
      return NextResponse.json({ success: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    entry.count += 1;
    return NextResponse.next();
  }

  rateLimit.set(key, { count: 1, resetAt: now + WINDOW_MS });
  return NextResponse.next();
}

export const config = {
  matcher: "/api/ai/:path*",
};

function getClientKey(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
