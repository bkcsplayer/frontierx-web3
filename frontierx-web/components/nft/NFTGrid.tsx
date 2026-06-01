"use client";

import { WalletCards } from "lucide-react";
import { useAccount } from "wagmi";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { NFTCard } from "@/components/nft/NFTCard";
import { useFrontierPass } from "@/lib/contracts/hooks/useFrontierPass";

export function NFTGrid() {
  const { isConnected } = useAccount();
  const { ownedTokens, isInventoryLoading, inventoryReadError, isConfigured, revealed } = useFrontierPass();

  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <WalletCards className="mx-auto mb-4 h-10 w-10 text-[var(--accent-cyan)]" aria-hidden />
        <h2 className="text-xl font-semibold">Connect wallet to view your passes</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Owned NFTs will appear here after your wallet is connected.
        </p>
      </Card>
    );
  }

  if (!isConfigured) {
    return (
      <Card className="p-8 text-center">
        <WalletCards className="mx-auto mb-4 h-10 w-10 text-[var(--text-muted)]" aria-hidden />
        <h2 className="text-xl font-semibold">Contract address not configured</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Add the current chain&apos;s `NEXT_PUBLIC_*_FRONTIER_PASS_ADDRESS` before reading wallet NFTs.
        </p>
      </Card>
    );
  }

  if (inventoryReadError) {
    return (
      <Card className="p-8 text-center">
        <WalletCards className="mx-auto mb-4 h-10 w-10 text-[var(--accent-red)]" aria-hidden />
        <h2 className="text-xl font-semibold">Could not read wallet passes</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{inventoryReadError.message}</p>
      </Card>
    );
  }

  if (isInventoryLoading) {
    return (
      <Card className="p-8">
        <Loading label="Reading wallet passes" />
      </Card>
    );
  }

  if (ownedTokens.length === 0) {
    return (
      <Card className="p-8 text-center">
        <WalletCards className="mx-auto mb-4 h-10 w-10 text-[var(--accent-purple)]" aria-hidden />
        <h2 className="text-xl font-semibold">No Frontier Passes yet</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Mint one above to unlock gated protocol surfaces.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ownedTokens.map((tokenId) => (
        <NFTCard key={tokenId.toString()} tokenId={tokenId} revealed={revealed} />
      ))}
    </div>
  );
}
