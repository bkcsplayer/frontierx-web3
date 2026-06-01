"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { DevAbortNoiseFilter } from "@/components/providers/DevAbortNoiseFilter";
import { wagmiConfig } from "@/lib/wallet/config";
import { isAbortLikeError } from "@/lib/utils/query";

function ignoreAbortError(error: unknown) {
  if (isAbortLikeError(error)) return;
}

function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: ignoreAbortError,
    }),
    mutationCache: new MutationCache({
      onError: ignoreAbortError,
    }),
    defaultOptions: {
      queries: {
        throwOnError: false,
        retry: (failureCount, error) => {
          if (isAbortLikeError(error)) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        throwOnError: false,
      },
    },
  });
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#3B82F6",
            accentColorForeground: "#F8FAFC",
            borderRadius: "large",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          <DevAbortNoiseFilter />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
