"use client";

import { Gem } from "lucide-react";
import { Loading } from "@/components/ui/Loading";
import { useNftMetadata } from "@/lib/contracts/hooks/useNftMetadata";
import { isPlaceholderArtUrl, rarityArtPath } from "@/lib/nft/artwork";
import { ipfsToHttpUrl } from "@/lib/utils/ipfs";
import { cn } from "@/lib/utils/cn";

const rarityStyles = [
  "border-[rgba(6,182,212,0.35)]",
  "border-[rgba(139,92,246,0.42)]",
  "border-[rgba(245,158,11,0.46)]",
  "border-[rgba(16,185,129,0.48)]",
];

type NFTArtworkProps = {
  tokenId: bigint;
  tokenUri: string;
  rarityIndex: number;
  revealed: boolean;
  className?: string;
  compact?: boolean;
};

export function NFTArtwork({ tokenId, tokenUri, rarityIndex, revealed, className, compact = false }: NFTArtworkProps) {
  const { data, isLoading, isError } = useNftMetadata(revealed ? tokenUri : undefined);
  const localArtUrl = rarityArtPath(rarityIndex, revealed);
  const metadataImageUrl =
    data?.image && !isPlaceholderArtUrl(data.image) ? ipfsToHttpUrl(data.image) : "";
  const imageUrl = revealed ? localArtUrl || metadataImageUrl : localArtUrl;
  const borderClass = rarityStyles[revealed ? rarityIndex : 0] ?? rarityStyles[0];
  const label = data?.name ?? `Frontier Pass #${tokenId.toString()}`;
  const showLoading = !imageUrl && isLoading;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.18),rgba(15,15,35,0.88)_58%)]",
        borderClass,
        compact ? "h-12 w-12" : "aspect-[4/5] w-full",
        className,
      )}
    >
      {showLoading ? (
        <div className={cn("flex h-full items-center justify-center", compact ? "p-1" : "p-6")}>
          <Loading label={compact ? "Loading" : "Loading artwork"} />
        </div>
      ) : imageUrl && (!isError || imageUrl.startsWith("/")) ? (
        // eslint-disable-next-line @next/next/no-img-element -- IPFS SVG/PNG from dynamic gateway URLs
        <img
          src={imageUrl}
          alt={label}
          className={cn("h-full w-full object-cover", compact ? "p-1" : "p-4")}
          loading="lazy"
        />
      ) : (
        <div className={cn("flex h-full flex-col items-center justify-center text-center", compact ? "p-1" : "p-6")}>
          <Gem
            className={cn("text-[var(--accent-cyan)] drop-shadow-[0_0_24px_currentColor]", compact ? "h-5 w-5" : "h-12 w-12")}
            aria-hidden
          />
          {!compact ? (
            <p className="mt-3 font-[var(--font-jetbrains-mono)] text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Artwork unavailable
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
