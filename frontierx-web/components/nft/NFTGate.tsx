"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Bot, LockKeyhole, ShieldCheck, Trophy, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAccount } from "wagmi";
import { Card } from "@/components/ui/Card";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { useFrontierPass } from "@/lib/contracts/hooks/useFrontierPass";

type NFTGateProps = {
  children?: ReactNode;
};

export function NFTGate({ children }: NFTGateProps) {
  const { t } = useTranslation();
  const { isConnected } = useAccount();
  const { hasPassAccess, isGateConfigured, isGateLoading, gateReadError } = useFrontierPass();

  if (!isConnected) {
    return (
      <GateCard
        icon={LockKeyhole}
        title={t("gate.connectTitle")}
        description={t("gate.connectDescription")}
        action={<ConnectWalletButton />}
      />
    );
  }

  if (!isGateConfigured) {
    return (
      <GateCard
        icon={LockKeyhole}
        title={t("gate.notConfiguredTitle")}
        description={t("gate.notConfiguredDescription")}
      />
    );
  }

  if (gateReadError) {
    return (
      <GateCard
        icon={LockKeyhole}
        title={t("gate.errorTitle")}
        description={gateReadError.message}
      />
    );
  }

  if (isGateLoading) {
    return (
      <GateCard
        icon={LockKeyhole}
        title={t("gate.loadingTitle")}
        description={t("gate.loadingDescription")}
      />
    );
  }

  if (!hasPassAccess) {
    return (
      <GateCard
        icon={LockKeyhole}
        title={t("gate.deniedTitle")}
        description={t("gate.deniedDescription")}
        action={
          <Link href="#mint-card" className="text-sm font-semibold text-[var(--accent-cyan)] hover:underline">
            {t("gate.mintNow")}
          </Link>
        }
      />
    );
  }

  return (
    <>
      {children ?? (
        <Card className="p-8">
          <div className="flex items-center gap-3 text-[var(--accent-green)]">
            <ShieldCheck className="h-6 w-6" aria-hidden />
            <p className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.22em]">
              {t("gate.verified")}
            </p>
          </div>
          <h2 className="mt-5 text-2xl font-bold">{t("gate.welcome")}</h2>
          <p className="mt-3 max-w-2xl leading-7 text-[var(--text-secondary)]">
            {t("gate.welcomeBody")}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <GateLink href="/arena" icon={Trophy} label="Enter Game Arena" />
            <GateLink href="/ai-hub" icon={Bot} label="Open AI Agent Hub" />
          </div>
        </Card>
      )}
    </>
  );
}

function GateCard({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="p-8 text-center">
      <Icon className="mx-auto mb-5 h-12 w-12 text-[var(--accent-cyan)]" aria-hidden />
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl leading-7 text-[var(--text-secondary)]">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </Card>
  );
}

function GateLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-4 text-sm font-semibold transition hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
    >
      <Icon className="h-5 w-5" aria-hidden />
      {label}
    </Link>
  );
}
