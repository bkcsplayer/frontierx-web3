"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ChainSwitcher } from "@/components/wallet/ChainSwitcher";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";

const navItems = [
  { href: "/mint", labelKey: "nav.mint" },
  { href: "/stake", labelKey: "nav.stake" },
  { href: "/arena", labelKey: "nav.arena" },
  { href: "/ai-hub", labelKey: "nav.aiHub" },
  { href: "/dashboard", labelKey: "nav.dashboard" },
];

export function Navbar() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[rgba(5,5,16,0.72)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label={t("nav.home")}>
          <Image src="/logo.png" alt="" width={38} height={38} priority />
          <span className="font-[var(--font-orbitron)] text-base font-semibold tracking-[0.22em] text-[var(--text-primary)]">
            FRONTIERX
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-[var(--text-secondary)] lg:flex" aria-label="Primary">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-[var(--accent-cyan)]">
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <div className="hidden sm:block">
            <ChainSwitcher />
          </div>
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}
