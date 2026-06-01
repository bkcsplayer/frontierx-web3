"use client";

import { useEffect, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n, { supportedLanguages, type SupportedLanguage } from "@/lib/i18n/config";

const languageStorageKey = "frontierx-language";

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <HtmlLanguageSync />
      {children}
    </I18nextProvider>
  );
}

function HtmlLanguageSync() {
  const { i18n: instance } = useTranslation();

  useEffect(() => {
    const storedLanguage = getStoredLanguage();
    const browserLanguage = navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
    const targetLanguage = storedLanguage ?? browserLanguage;

    if (normalizeLanguage(i18n.language) !== targetLanguage) {
      void i18n.changeLanguage(targetLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = instance.resolvedLanguage || instance.language || "en";
    setStoredLanguage(normalizeLanguage(instance.resolvedLanguage || instance.language));
  }, [instance.language, instance.resolvedLanguage]);

  return null;
}

function getStoredLanguage(): SupportedLanguage | undefined {
  try {
    const stored = localStorage.getItem(languageStorageKey);
    return stored ? normalizeLanguage(stored) : undefined;
  } catch {
    return undefined;
  }
}

function setStoredLanguage(language: SupportedLanguage) {
  try {
    localStorage.setItem(languageStorageKey, language);
  } catch {
    // Some browsers can block storage; language switching should still work for the session.
  }
}

function normalizeLanguage(language?: string | null): SupportedLanguage {
  if (language?.toLowerCase().startsWith("zh")) return "zh";
  return supportedLanguages.includes(language as SupportedLanguage) ? (language as SupportedLanguage) : "en";
}
