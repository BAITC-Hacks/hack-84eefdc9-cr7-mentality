"use client";

import Link from "next/link";
import { ArrowUpRight, Download, Layers3, Network, ShieldCheck } from "lucide-react";
import { useI18n } from "@/components/preferences/PreferencesProvider";
import { PreferencesControls } from "@/components/preferences/PreferencesControls";

export function AppShell({ children, analysisId, demo = false }: {
  children: React.ReactNode;
  analysisId?: string | null;
  demo?: boolean;
}) {
  const { t } = useI18n();
  const query = analysisId
    ? `?analysis=${encodeURIComponent(analysisId)}${demo ? "&demo=1" : ""}`
    : "";

  return (
    <div className="app-shell">
      <div className="analysis-chrome">
        <header className="analysis-header">
          <Link href="/" className="analysis-brand" aria-label={t("brand")}>
            <span className="analysis-brand-mark" aria-hidden="true"><i /><i /><i /></span>
            <span>{t("brand")}</span>
          </Link>
          <span className="analysis-header-caption">{t("brand.subtitle")}</span>
          <PreferencesControls />
        </header>
        <div className="analysis-subnav">
          <nav className="analysis-nav" aria-label={t("shell.navigation")}>
            <Link className="analysis-nav-link active" href={`/workspace${query}`} aria-current="page"><Network size={15} />{t("shell.network")}</Link>
            <Link className="analysis-nav-link" href="/methodology"><Layers3 size={15} />{t("shell.methodology")}</Link>
            <Link className="analysis-nav-link" href={`/exports${query}`}><Download size={15} />{t("shell.exports")}</Link>
          </nav>
          <span className={`analysis-status ${demo ? "is-demo" : ""}`}><i />{t(demo ? "shell.demo" : "shell.analysis")}</span>
        </div>
      </div>
      {children}
      <footer className="analysis-footer">
        <span><ShieldCheck size={17} />{t("shell.scope")}</span>
        <Link href="/methodology">{t("shell.methodology")} <ArrowUpRight size={15} /></Link>
      </footer>
    </div>
  );
}
