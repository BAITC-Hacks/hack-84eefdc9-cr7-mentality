"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ChartNoAxesColumn, FileText, GitFork, Network } from "lucide-react";

export function AppShell({ children, analysisId, demo = false }: {
  children: React.ReactNode;
  analysisId?: string | null;
  demo?: boolean;
}) {
  const pathname = usePathname();
  const query = analysisId ? `?analysis=${encodeURIComponent(analysisId)}${demo ? "&demo=1" : ""}` : "";
  const links = [
    { href: `/workspace${query}`, path: "/workspace", label: "Исследование", icon: Network },
    { href: "/methodology", path: "/methodology", label: "Методология", icon: ChartNoAxesColumn },
    { href: `/exports${query}`, path: "/exports", label: "Экспорт", icon: FileText },
  ];
  return (
    <div className="investigation-shell">
      <a className="skip-link" href="#research-main">К содержимому</a>
      <aside className="research-rail" aria-label="Разделы проекта">
        <Link className="rail-brand" href="/" title="Граф денег" aria-label="Граф денег, главная"><GitFork size={31} strokeWidth={1.65} /></Link>
        <nav>{links.map(({ href, path, label, icon: Icon }) => <Link key={path} href={href} title={label} aria-label={label} aria-current={pathname === path ? "page" : undefined}><Icon size={24} strokeWidth={1.7} /></Link>)}</nav>
        <span className="rail-signature" title="CR7 Mentality">C7</span>
      </aside>
      <div className="research-body">
        <header className="research-topbar">
          <Link href={`/workspace${query}`} className="research-wordmark">Граф денег<span>FINANCIAL INTELLIGENCE</span></Link>
          <nav aria-label="Основная навигация">{links.map(({ href, path, label }) => <Link key={path} href={href} aria-current={pathname === path ? "page" : undefined}>{label}</Link>)}</nav>
          <span className="research-mode"><Activity size={14} />{demo ? "Демонстрационный вид" : "Рабочая область"}</span>
        </header>
        {children}
      </div>
    </div>
  );
}
