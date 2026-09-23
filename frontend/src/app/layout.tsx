import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PreferencesProvider } from "@/components/preferences/PreferencesProvider";
import { catalogs } from "@/locales/catalogs";
import { LOCALE_COOKIE, THEME_COOKIE, parseLocale, parseTheme } from "@/lib/preferences";
import "./globals.css";
import "./themes.css";
import "@/features/workspace/workspace.css";

export async function generateMetadata(): Promise<Metadata> {
  const preferences = await cookies();
  const messages = catalogs[parseLocale(preferences.get(LOCALE_COOKIE)?.value)].common;
  return { title: messages["meta.title"], description: messages["meta.description"] };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const preferences = await cookies();
  const locale = parseLocale(preferences.get(LOCALE_COOKIE)?.value);
  const theme = parseTheme(preferences.get(THEME_COOKIE)?.value);
  return (
    <html lang={locale} data-theme={theme}>
      <body><PreferencesProvider initialLocale={locale} initialTheme={theme}>{children}</PreferencesProvider></body>
    </html>
  );
}
