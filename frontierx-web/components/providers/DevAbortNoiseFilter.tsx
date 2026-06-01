"use client";

import { useEffect } from "react";
import { isAbortLikeError } from "@/lib/utils/query";

/**
 * Wagmi/viem and metadata fetch requests are often cancelled on chain or route changes.
 * In development, those cancellations should not surface as runtime overlay errors.
 */
export function DevAbortNoiseFilter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isAbortLikeError(event.reason)) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", onUnhandledRejection);
  }, []);

  return null;
}
