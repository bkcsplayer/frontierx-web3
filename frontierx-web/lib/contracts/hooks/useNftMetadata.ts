"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNftMetadata } from "@/lib/nft/metadata";
export function useNftMetadata(tokenUri?: string) {
  return useQuery({
    queryKey: ["nft-metadata", tokenUri],
    enabled: Boolean(tokenUri),
    staleTime: 60_000,
    retry: false,
    throwOnError: false,
    queryFn: ({ signal }) => fetchNftMetadata(tokenUri!, signal),
  });
}
