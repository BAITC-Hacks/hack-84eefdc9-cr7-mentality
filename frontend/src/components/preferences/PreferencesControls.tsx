"use client";

import { Globe2, Moon, Sun } from "lucide-react";
import { parseLocale } from "@/lib/preferences";
import { useI18n, usePreferences } from "./PreferencesProvider";
import styles from "./PreferencesControls.module.css";

export function PreferencesControls({ className = "" }: { className?: string }) {
  const { locale, theme, setLocale, setTheme } = usePreferences();
  const { t } = useI18n();
  return <div className={`${styles.controls} ${className}`} role="group" aria-label={t("preferences.label")}>
    <label className={styles.language}>
      <Globe2 size={15} aria-hidden="true" />
      <select value={locale} onChange={(event) => setLocale(parseLocale(event.target.value))} aria-label={t("preferences.language")}>
        <option value="kk" lang="kk">Қазақша</option>
        <option value="ru" lang="ru">Русский</option>
        <option value="en" lang="en">English</option>
      </select>
    </label>
    <button type="button" className={styles.theme} onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={t(theme === "light" ? "preferences.toDark" : "preferences.toLight")} title={t(theme === "light" ? "preferences.toDark" : "preferences.toLight")} aria-pressed={theme === "dark"}>
      {theme === "light" ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
    </button>
  </div>;
}
