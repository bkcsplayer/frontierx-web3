"use client";

import Image from "next/image";
import Link from "next/link";
import { Bot, ChartNoAxesCombined, Coins, Flame, Gem, Network, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";
import { GlowEffect } from "@/components/ui/GlowEffect";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";

const stats = [
  { labelKey: "hero.stats.passes", value: "100", icon: Gem },
  { labelKey: "hero.stats.token", value: "$FRX", icon: Coins },
  { labelKey: "hero.stats.chains", value: "3", icon: Network },
  { labelKey: "hero.stats.agents", value: "3", icon: Bot },
];

const flow = [
  { titleKey: "hero.flow.mintTitle", bodyKey: "hero.flow.mintBody", icon: ShieldCheck },
  { titleKey: "hero.flow.stakeTitle", bodyKey: "hero.flow.stakeBody", icon: Coins },
  { titleKey: "hero.flow.arenaTitle", bodyKey: "hero.flow.arenaBody", icon: Trophy },
  { titleKey: "hero.flow.aiTitle", bodyKey: "hero.flow.aiBody", icon: Bot },
];

export default function Home() {
  const { t } = useTranslation();

  return (
    <PageWrapper>
      <div className="grid-overlay absolute inset-0 opacity-40" aria-hidden />
      <GlowEffect className="left-1/2 top-0 h-[540px] w-[540px] -translate-x-1/2" />
      <GlowEffect className="right-[-180px] top-[520px] h-[420px] w-[420px] bg-[radial-gradient(circle,rgba(139,92,246,0.22),transparent_68%)]" />

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-6 pb-20 pt-16 text-center lg:px-8 lg:pt-24">
        <div className="mb-8 rounded-full border border-[var(--border-default)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] backdrop-blur-xl">
          {t("hero.badge")}
        </div>

        <Image
          src="/logo.png"
          alt="FrontierX Protocol logo"
          width={132}
          height={132}
          priority
          className="mb-8 drop-shadow-[0_0_32px_rgba(6,182,212,0.28)]"
        />

        <h1 className="max-w-5xl text-balance font-[var(--font-orbitron)] text-5xl font-black uppercase tracking-[0.08em] md:text-7xl">
          {t("hero.title")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-secondary)] md:text-xl">
          {t("hero.description")}
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <ConnectWalletButton />
          <Link
            href="#economy"
            className="flex h-11 items-center rounded-full border border-[var(--border-strong)] px-6 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
          >
            {t("hero.explore")}
          </Link>
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.labelKey}
                className="p-6 text-left transition hover:-translate-y-1 hover:border-[var(--border-strong)]"
              >
                <Icon className="mb-5 h-6 w-6 text-[var(--accent-cyan)]" aria-hidden />
                <div className="font-[var(--font-jetbrains-mono)] text-3xl font-bold">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-[var(--text-secondary)]">{t(stat.labelKey)}</div>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="economy" className="relative z-10 mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.28em] text-[var(--accent-cyan)]">
              {t("hero.loopEyebrow")}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-bold md:text-5xl">
              {t("hero.loopTitle")}
            </h2>
          </div>
          <Link href="/mint" className="text-sm font-semibold text-[var(--accent-cyan)] hover:underline">
            {t("hero.startMinting")}
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {flow.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={item.titleKey} className="relative p-6">
                <span className="font-[var(--font-jetbrains-mono)] text-xs text-[var(--text-muted)]">
                  0{index + 1}
                </span>
                <Icon className="mt-5 h-7 w-7 text-[var(--accent-gold)]" aria-hidden />
                <h3 className="mt-5 text-xl font-semibold">{t(item.titleKey)}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{t(item.bodyKey)}</p>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-8">
            <ChartNoAxesCombined className="mb-6 h-8 w-8 text-[var(--accent-blue)]" aria-hidden />
            <h2 className="text-2xl font-bold">{t("hero.dualTokenTitle")}</h2>
            <p className="mt-4 leading-7 text-[var(--text-secondary)]">
              {t("hero.dualTokenBody")}
            </p>
          </Card>
          <Card className="p-8">
            <Bot className="mb-6 h-8 w-8 text-[var(--accent-purple)]" aria-hidden />
            <h2 className="text-2xl font-bold">{t("hero.aiUtilityTitle")}</h2>
            <p className="mt-4 leading-7 text-[var(--text-secondary)]">
              {t("hero.aiUtilityBody")}
            </p>
          </Card>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden p-8">
            <div className="flex items-center gap-3 text-[var(--accent-green)]">
              <Sparkles className="h-5 w-5" aria-hidden />
              <span className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.22em]">
                {t("hero.buildStatus")}
              </span>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                [t("hero.contracts"), "5 deployed locally"],
                [t("hero.tests"), "39 passing"],
                [t("hero.nftAssets"), "400 + placeholder"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-4">
                  <div className="font-[var(--font-jetbrains-mono)] text-2xl font-bold text-[var(--text-primary)]">
                    {value}
                  </div>
                  <div className="mt-2 text-sm text-[var(--text-muted)]">{label}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-8">
            <Flame className="mb-6 h-8 w-8 text-[var(--accent-red)]" aria-hidden />
            <h2 className="text-2xl font-bold">{t("hero.deflationTitle")}</h2>
            <p className="mt-4 leading-7 text-[var(--text-secondary)]">
              {t("hero.deflationBody")}
            </p>
          </Card>
        </div>
      </section>
    </PageWrapper>
  );
}
