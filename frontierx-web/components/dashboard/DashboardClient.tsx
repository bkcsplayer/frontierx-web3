"use client";

import {
  Activity,
  BarChart3,
  CircleDollarSign,
  Flame,
  Gem,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { formatEther } from "viem";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GlowEffect } from "@/components/ui/GlowEffect";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { useProtocolDashboard, type DashboardActivity } from "@/lib/contracts/hooks/useProtocolDashboard";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function DashboardClient() {
  const { t } = useTranslation();
  const dashboard = useProtocolDashboard();
  const mintedPercent =
    dashboard.stats.nftMaxSupply > BigInt(0)
      ? Math.min(100, Number((dashboard.stats.nftMinted * BigInt(100)) / dashboard.stats.nftMaxSupply))
      : 0;

  return (
    <PageWrapper>
      <div className="grid-overlay absolute inset-0 opacity-30" aria-hidden />
      <GlowEffect className="left-[-120px] top-24 h-[420px] w-[420px]" />
      <GlowEffect className="right-[-120px] top-[520px] h-[420px] w-[420px] bg-[radial-gradient(circle,rgba(16,185,129,0.14),transparent_68%)]" />

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-16">
        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.32em] text-[var(--accent-cyan)]">
              {t("dashboard.eyebrow")}
            </p>
            <h1 className="mt-4 font-[var(--font-orbitron)] text-4xl font-bold uppercase tracking-[0.08em] md:text-5xl">
              {t("dashboard.title")}
            </h1>
            <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
              {t("dashboard.description")}
            </p>
          </div>
          <Button variant="secondary" onClick={dashboard.refetch} disabled={dashboard.isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", dashboard.isLoading && "animate-spin")} aria-hidden />
            {t("dashboard.refresh")}
          </Button>
        </div>

        {dashboard.error ? (
          <Card className="mb-8 border-[rgba(239,68,68,0.35)] p-5 text-sm text-[var(--accent-red)]">
            {t("dashboard.rpcError")}
          </Card>
        ) : null}

        {!dashboard.isDashboardReady ? (
          <ReadinessCard
            isSupportedChain={dashboard.isSupportedChain}
            hasFRXToken={dashboard.hasFRXToken}
            hasFrontierPass={dashboard.hasFrontierPass}
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={Landmark}
                label={t("dashboard.treasury")}
                value={`${formatFRX(dashboard.stats.treasuryBalance)} FRX`}
                help="Current treasury wallet balance"
                tone="cyan"
              />
              <StatCard
                icon={Flame}
                label={t("dashboard.burned")}
                value={`${formatFRX(dashboard.stats.totalBurned)} FRX`}
                help="FRX removed by burns and sinks"
                tone="red"
              />
              <StatCard
                icon={CircleDollarSign}
                label={t("dashboard.minted")}
                value={`${formatFRX(dashboard.stats.totalMinted)} FRX`}
                help="Rewards minted by staking"
                tone="gold"
              />
              <StatCard
                icon={Gem}
                label={t("dashboard.circulating")}
                value={`${formatFRX(dashboard.stats.circulatingSupply)} FRX`}
                help="Total supply minus treasury"
                tone="green"
              />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-[var(--font-jetbrains-mono)] text-xs uppercase tracking-[0.24em] text-[var(--accent-cyan)]">
                  {t("dashboard.frontierPass")}
                </p>
                <h2 className="mt-2 text-2xl font-bold">{t("dashboard.supplyCustody")}</h2>
              </div>
              <ShieldCheck className="h-8 w-8 text-[var(--accent-green)]" aria-hidden />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <MiniMetric
                label={t("dashboard.nftsMinted")}
                value={`${dashboard.stats.nftMinted.toString()} / ${dashboard.stats.nftMaxSupply.toString()}`}
              />
              <MiniMetric label={t("dashboard.nftsStaked")} value={dashboard.stats.nftStaked.toString()} />
            </div>

            <div className="mt-6">
              <div className="mb-2 flex justify-between text-xs text-[var(--text-secondary)]">
                <span>{t("dashboard.mintProgress")}</span>
                <span>{mintedPercent}%</span>
              </div>
              <div
                className="h-3 overflow-hidden rounded-full border border-[var(--border-subtle)] bg-white/[0.04]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={mintedPercent}
                aria-label="NFT mint progress"
              >
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-cyan),var(--accent-purple))] transition-[width]"
                  style={{ width: `${mintedPercent}%` }}
                />
              </div>
            </div>
              </Card>

              <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-[var(--font-jetbrains-mono)] text-xs uppercase tracking-[0.24em] text-[var(--accent-gold)]">
                  {t("dashboard.gameEconomy")}
                </p>
                <h2 className="mt-2 text-2xl font-bold">{t("dashboard.lotteryForge")}</h2>
              </div>
              <Trophy className="h-8 w-8 text-[var(--accent-gold)]" aria-hidden />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MiniMetric label={t("dashboard.lotteryRound")} value={dashboard.stats.lotteryRound.toString()} />
              <MiniMetric label={t("dashboard.pool")} value={`${formatFRX(dashboard.stats.lotteryPool)} FRX`} />
              <MiniMetric label={t("dashboard.entries")} value={dashboard.stats.lotteryEntries.toString()} />
              <MiniMetric label={t("dashboard.forgePlays")} value={dashboard.stats.forgePlays.toString()} />
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-4 text-sm leading-6 text-[var(--text-secondary)]">
              Base staking rate is{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {formatFRX(dashboard.stats.baseRate)} FRX / day
              </span>
              . Crystal Forge has paid out{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {formatFRX(dashboard.stats.forgePaidOut)} FRX
              </span>
              .
            </div>
              </Card>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <ActivityFeed activities={dashboard.activity} loading={dashboard.isLoading} />
              <ChainStatus statuses={dashboard.chainStatuses} />
            </div>
          </>
        )}

        {!dashboard.isDashboardReady ? (
          <div className="mt-8">
            <ChainStatus statuses={dashboard.chainStatuses} />
          </div>
        ) : null}
      </section>
    </PageWrapper>
  );
}

function ReadinessCard({
  isSupportedChain,
  hasFRXToken,
  hasFrontierPass,
}: {
  isSupportedChain: boolean;
  hasFRXToken: boolean;
  hasFrontierPass: boolean;
}) {
  const { t } = useTranslation();
  const reason = !isSupportedChain
    ? "Switch to a supported FrontierX chain to view protocol analytics."
    : !hasFRXToken
      ? "Configure the FRXToken address for this chain before reading token analytics."
      : !hasFrontierPass
        ? "Configure the FrontierPass address for this chain before reading NFT analytics."
        : "Dashboard data is not ready for this chain.";

  return (
    <Card className="p-8 text-center">
      <ShieldCheck className="mx-auto mb-5 h-12 w-12 text-[var(--accent-cyan)]" aria-hidden />
      <h2 className="text-2xl font-bold">{t("dashboard.notConfigured")}</h2>
      <p className="mx-auto mt-3 max-w-2xl leading-7 text-[var(--text-secondary)]">{reason}</p>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  help,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  help: string;
  tone: "cyan" | "gold" | "green" | "red";
}) {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/[0.03]", toneClass(tone))}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <BarChart3 className="h-5 w-5 text-[var(--text-muted)]" aria-hidden />
      </div>
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 truncate font-[var(--font-orbitron)] text-2xl font-bold">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{help}</p>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 font-[var(--font-orbitron)] text-xl font-bold">{value}</p>
    </div>
  );
}

function ActivityFeed({ activities, loading }: { activities: DashboardActivity[]; loading: boolean }) {
  const { t } = useTranslation();

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-[var(--font-jetbrains-mono)] text-xs uppercase tracking-[0.24em] text-[var(--accent-cyan)]">
            {t("dashboard.recentActivity")}
          </p>
          <h2 className="mt-2 text-2xl font-bold">{t("dashboard.eventStream")}</h2>
        </div>
        <Activity className="h-7 w-7 text-[var(--accent-cyan)]" aria-hidden />
      </div>

      {activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-4 rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-4"
            >
              <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", dotClass(activity.tone))} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{activity.label}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {activity.detail} · {activity.timestamp ? relativeTime(activity.timestamp) : `Block ${activity.blockNumber.toString()}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-8 text-center text-sm text-[var(--text-secondary)]">
          {loading ? "Loading recent protocol events..." : "No recent protocol events found in the configured scan window."}
        </div>
      )}
    </Card>
  );
}

function ChainStatus({
  statuses,
}: {
  statuses: Array<{ id: number; name: string; active: boolean; configuredContracts: number }>;
}) {
  const { t } = useTranslation();

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-[var(--font-jetbrains-mono)] text-xs uppercase tracking-[0.24em] text-[var(--accent-green)]">
            {t("dashboard.chainStatus")}
          </p>
          <h2 className="mt-2 text-2xl font-bold">{t("dashboard.configuredNetworks")}</h2>
        </div>
        <Sparkles className="h-7 w-7 text-[var(--accent-green)]" aria-hidden />
      </div>

      <div className="space-y-3">
        {statuses.map((status) => (
          <div
            key={status.id}
            className={cn(
              "rounded-2xl border p-4",
              status.active
                ? "border-[rgba(16,185,129,0.42)] bg-[rgba(16,185,129,0.08)]"
                : "border-[var(--border-subtle)] bg-white/[0.03]",
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <p className="font-semibold">{status.name}</p>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs",
                  status.active ? "bg-[rgba(16,185,129,0.16)] text-[var(--accent-green)]" : "bg-white/[0.04] text-[var(--text-muted)]",
                )}
              >
                {status.active ? t("dashboard.active") : t("dashboard.available")}
              </span>
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {t("dashboard.contractsConfigured", { count: status.configuredContracts })}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function formatFRX(value: bigint) {
  const numeric = Number(formatEther(value));
  if (!Number.isFinite(numeric)) return formatEther(value);
  return formatNumber(numeric, numeric >= 1000 ? 0 : 2);
}

function relativeTime(timestamp: number) {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function toneClass(tone: "cyan" | "gold" | "green" | "red") {
  return {
    cyan: "border-[rgba(6,182,212,0.35)] text-[var(--accent-cyan)]",
    gold: "border-[rgba(245,158,11,0.35)] text-[var(--accent-gold)]",
    green: "border-[rgba(16,185,129,0.35)] text-[var(--accent-green)]",
    red: "border-[rgba(239,68,68,0.35)] text-[var(--accent-red)]",
  }[tone];
}

function dotClass(tone: DashboardActivity["tone"]) {
  return {
    green: "bg-[var(--accent-green)]",
    cyan: "bg-[var(--accent-cyan)]",
    gold: "bg-[var(--accent-gold)]",
    red: "bg-[var(--accent-red)]",
    purple: "bg-[var(--accent-purple)]",
  }[tone];
}
