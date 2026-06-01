/** Benign cancellation from wagmi/viem or TanStack Query — not a user-facing failure. */
export function isAbortLikeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError" || error.name === "CancelledError") return true;
  return /aborted|cancelled/i.test(error.message);
}

/** Refetch without surfacing AbortError as unhandled rejections (Next.js dev overlay). */
export function refetchAllSettled(
  ...refetchers: Array<() => Promise<unknown>>
): Promise<PromiseSettledResult<unknown>[]> {
  return Promise.allSettled(refetchers.map((refetch) => refetch()));
}

/** Fire-and-forget refetch that ignores benign request cancellations. */
export function voidRefetch(refetch: () => Promise<unknown>) {
  void refetch().catch((error) => {
    if (isAbortLikeError(error)) return;
    console.error(error);
  });
}
