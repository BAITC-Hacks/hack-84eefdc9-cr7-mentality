export const locales = ["kk", "ru", "en"] as const;
export type Locale = (typeof locales)[number];
export type Theme = "light" | "dark";
export type TranslationValues = Record<string, string | number>;

export const LOCALE_COOKIE = "money-graph-locale";
export const THEME_COOKIE = "money-graph-theme";
export const intlLocales: Record<Locale, string> = {
  kk: "kk-KZ",
  ru: "ru-RU",
  en: "en-US",
};

export function parseLocale(value?: string): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : "ru";
}

export function parseTheme(value?: string): Theme {
  return value === "dark" ? "dark" : "light";
}

export function interpolate(message: string, values: TranslationValues = {}) {
  return message.replace(/\{([\w.]+)\}/g, (placeholder, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : placeholder,
  );
}
