"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { MintCard } from "@/components/nft/MintCard";
import { NFTGate } from "@/components/nft/NFTGate";
import { NFTGrid } from "@/components/nft/NFTGrid";
import { Card } from "@/components/ui/Card";
import { GlowEffect } from "@/components/ui/GlowEffect";

export function MintPageClient() {
  const { t } = useTranslation();

  return (
    <PageWrapper>
      <div className="grid-overlay absolute inset-0 opacity-35" aria-hidden />
      <GlowEffect className="left-1/2 top-4 h-[520px] w-[520px] -translate-x-1/2" />

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="mb-10 max-w-3xl">
          <p className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.28em] text-[var(--accent-cyan)]">
            {t("mint.eyebrow")}
          </p>
          <h1 className="mt-4 font-[var(--font-orbitron)] text-4xl font-black uppercase tracking-[0.08em] md:text-6xl">
            {t("mint.title")}
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            {t("mint.description")}
          </p>
        </div>

        <div id="mint-card">
          <MintCard />
        </div>

        <section className="mt-14">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.22em] text-[var(--text-muted)]">
                {t("mint.inventory")}
              </p>
              <h2 className="mt-2 text-2xl font-bold">{t("mint.myPasses")}</h2>
            </div>
          </div>
          <NFTGrid />
        </section>

        <section className="mt-14">
          <div className="mb-6 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-[var(--accent-green)]" aria-hidden />
            <h2 className="text-2xl font-bold">NFT Gated Content</h2>
          </div>
          <NFTGate>
            <Card className="p-8">
              <div className="flex items-center gap-3 text-[var(--accent-green)]">
                <ShieldCheck className="h-6 w-6" aria-hidden />
                <p className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.22em]">
                  {t("gate.verified")}
                </p>
              </div>
              <h3 className="mt-5 text-2xl font-bold">{t("gate.welcome")}</h3>
              <p className="mt-3 max-w-2xl leading-7 text-[var(--text-secondary)]">
                {t("gate.welcomeBody")}
              </p>
            </Card>
          </NFTGate>
        </section>
      </section>
    </PageWrapper>
  );
}
