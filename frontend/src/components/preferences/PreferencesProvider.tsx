"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { catalogs, type Namespace } from "@/locales/catalogs";
import { interpolate, intlLocales, LOCALE_COOKIE, THEME_COOKIE, type Locale, type Theme, type TranslationValues } from "@/lib/preferences";

export type { Locale, Theme } from "@/lib/preferences";

type Preferences = {
  locale: Locale;
  theme: Theme;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
};

const PreferencesContext = createContext<Preferences | null>(null);

function savePreference(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function PreferencesProvider({ children, initialLocale, initialTheme }: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialTheme: Theme;
}) {
  const [locale, updateLocale] = useState(initialLocale);
  const [theme, updateTheme] = useState(initialTheme);
  const setLocale = useCallback((next: Locale) => {
    savePreference(LOCALE_COOKIE, next);
    document.documentElement.lang = next;
    updateLocale(next);
  }, []);
  const setTheme = useCallback((next: Theme) => {
    savePreference(THEME_COOKIE, next);
    document.documentElement.dataset.theme = next;
    updateTheme(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    document.title = catalogs[locale].common["meta.title"];
    document.querySelector('meta[name="description"]')?.setAttribute("content", catalogs[locale].common["meta.description"]);
  }, [locale, theme]);

  const value = useMemo(() => ({ locale, theme, setLocale, setTheme }), [locale, theme, setLocale, setTheme]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const preferences = useContext(PreferencesContext);
  if (!preferences) throw new Error("PreferencesProvider is required");
  return preferences;
}

export function useI18n(namespace: Namespace = "common") {
  const { locale } = usePreferences();
  const t = useCallback((key: string, values?: TranslationValues) => {
    const message = catalogs[locale][namespace][key] ?? catalogs.ru[namespace][key] ?? key;
    return interpolate(message, values);
  }, [locale, namespace]);
  return { t, locale, intlLocale: intlLocales[locale] };
}
