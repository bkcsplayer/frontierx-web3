"use client";

import { useTranslation } from "react-i18next";
import { supportedLanguages, type SupportedLanguage } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

const languageLabels: Record<SupportedLanguage, string> = {
  en: "EN",
  zh: "CN",
};

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "en").startsWith("zh") ? "zh" : "en";

  return (
    <div
      role="group"
      className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--glass-bg)] p-1"
      aria-label={t("nav.language")}
    >
      {supportedLanguages.map((language) => (
        <button
          key={language}
          type="button"
          className={cn(
            "h-8 rounded-full px-3 font-[var(--font-jetbrains-mono)] text-xs font-semibold transition",
            current === language
              ? "bg-[var(--accent-blue)] text-white shadow-[0_0_18px_rgba(59,130,246,0.25)]"
              : "text-[var(--text-secondary)] hover:text-[var(--accent-cyan)]",
          )}
          aria-pressed={current === language}
          disabled={current === language}
          onClick={() => void i18n.changeLanguage(language)}
        >
          {languageLabels[language]}
        </button>
      ))}
    </div>
  );
}
