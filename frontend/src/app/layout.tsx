import type { Metadata } from "next";
import "./globals.css";
import "./investigation.css";
export const metadata: Metadata = {
  title: "Граф денег · Анализ связей",
  description:
    "Рабочее пространство для исследования наблюдаемых денежных потоков.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
