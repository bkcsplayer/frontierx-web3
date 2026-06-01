"use client";

import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { NFTArtwork } from "@/components/nft/NFTArtwork";
import { useFrontierPassToken } from "@/lib/contracts/hooks/useFrontierPass";

export function NFTCard({ tokenId, revealed }: { tokenId: bigint; revealed: boolean }) {
  const { rarityIndex, rarityLabel, tokenUri, isLoading } = useFrontierPassToken(tokenId);
  const displayRarity = revealed ? rarityLabel : "Hidden";

  return (
    <Card className="group overflow-hidden p-4 transition hover:-translate-y-1 hover:border-[var(--border-strong)]">
      <div className="relative">
        {tokenUri ? (
          <NFTArtwork tokenId={tokenId} tokenUri={tokenUri} rarityIndex={rarityIndex} revealed={revealed} />
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center rounded-2xl border border-[var(--border-subtle)]">
            <Loading label="Loading pass" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(5,5,16,0.92)] via-[rgba(5,5,16,0.55)] to-transparent px-4 pb-4 pt-16 text-center">
          <div className="font-[var(--font-orbitron)] text-2xl font-bold">#{tokenId.toString()}</div>
          <div className="mt-2 font-[var(--font-jetbrains-mono)] text-xs uppercase tracking-[0.22em] text-[var(--accent-cyan)]">
            {displayRarity}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Frontier Pass #{tokenId.toString()}</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {tokenUri ? "On-chain metadata loaded from IPFS" : "Metadata pending"}
          </p>
        </div>
        {isLoading ? <Loading label="Syncing" /> : null}
      </div>
    </Card>
  );
}
