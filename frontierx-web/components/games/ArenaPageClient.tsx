"use client";

import { ShieldCheck, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { CrystalForgePanel } from "@/components/games/CrystalForgePanel";
import { LotteryPanel } from "@/components/games/LotteryPanel";
import { NFTGate } from "@/components/nft/NFTGate";
import { Card } from "@/components/ui/Card";
import { GlowEffect } from "@/components/ui/GlowEffect";

export function ArenaPageClient() {
  const { t } = useTranslation();

  return (
    <PageWrapper>
      <div className="grid-overlay absolute inset-0 opacity-35" aria-hidden />
      <GlowEffect className="left-1/2 top-4 h-[520px] w-[520px] -translate-x-1/2" />
      <GlowEffect className="right-[-180px] top-[560px] h-[420px] w-[420px] bg-[radial-gradient(circle,rgba(239,68,68,0.16),transparent_68%)]" />

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="mb-10 max-w-3xl">
          <p className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.28em] text-[var(--accent-cyan)]">
            {t("arena.eyebrow")}
          </p>
          <h1 className="mt-4 font-[var(--font-orbitron)] text-4xl font-black uppercase tracking-[0.08em] md:text-6xl">
            {t("arena.title")}
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            {t("arena.description")}
          </p>
        </div>

        <NFTGate>
          <div className="space-y-8">
            <Card className="p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-[var(--accent-green)]" aria-hidden />
                  <p className="text-sm text-[var(--text-secondary)]">
                    {t("arena.access")}
                  </p>
                </div>
                <div className="flex items-center gap-2 font-[var(--font-jetbrains-mono)] text-sm text-[var(--accent-gold)]">
                  <Trophy className="h-4 w-4" aria-hidden />
                  {t("arena.split")}
                </div>
              </div>
            </Card>

            <LotteryPanel />

            <CrystalForgePanel />
          </div>
        </NFTGate>
      </section>
    </PageWrapper>
  );
}
