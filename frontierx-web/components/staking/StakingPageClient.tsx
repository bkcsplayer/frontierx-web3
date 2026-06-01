"use client";

import { Coins, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { RewardsDisplay } from "@/components/staking/RewardsDisplay";
import { StakePanel } from "@/components/staking/StakePanel";
import { StakedNFTList } from "@/components/staking/StakedNFTList";
import { Card } from "@/components/ui/Card";
import { GlowEffect } from "@/components/ui/GlowEffect";

export function StakingPageClient() {
  const { t } = useTranslation();

  return (
    <PageWrapper>
      <div className="grid-overlay absolute inset-0 opacity-35" aria-hidden />
      <GlowEffect className="left-1/2 top-4 h-[520px] w-[520px] -translate-x-1/2" />
      <GlowEffect className="right-[-180px] top-[520px] h-[420px] w-[420px] bg-[radial-gradient(circle,rgba(245,158,11,0.16),transparent_68%)]" />

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="mb-10 max-w-3xl">
          <p className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.28em] text-[var(--accent-cyan)]">
            FRX Staking
          </p>
          <h1 className="mt-4 font-[var(--font-orbitron)] text-4xl font-black uppercase tracking-[0.08em] md:text-6xl">
            {t("stake.title")}
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            Stake revealed Frontier Access Pass NFTs to earn FRX. Higher rarity passes earn faster,
            and staked passes still count for protocol access through `effectivePassHolder()`.
          </p>
        </div>

        <Card className="mb-8 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[var(--accent-green)]" aria-hidden />
              <p className="text-sm text-[var(--text-secondary)]">
                Staking is custodial: unstaking returns the NFT and claims any pending rewards.
              </p>
            </div>
            <div className="flex items-center gap-2 font-[var(--font-jetbrains-mono)] text-sm text-[var(--accent-gold)]">
              <Coins className="h-4 w-4" aria-hidden />
              Rates: 100 / 150 / 250 / 500 FRX per day
            </div>
          </div>
        </Card>

        <RewardsDisplay />

        <div className="mt-8 grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <StakePanel />
          <StakedNFTList />
        </div>
      </section>
    </PageWrapper>
  );
}
