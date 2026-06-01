"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-[var(--text-muted)] md:flex-row md:items-center md:justify-between lg:px-8">
        <p>{t("footer.company")}</p>
        <div className="flex gap-5">
          <Link href="/mint" className="transition hover:text-[var(--accent-cyan)]">
            {t("nav.mint")}
          </Link>
          <Link href="/arena" className="transition hover:text-[var(--accent-cyan)]">
            {t("nav.arena")}
          </Link>
          <Link href="/ai-hub" className="transition hover:text-[var(--accent-cyan)]">
            {t("nav.aiHub")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
