"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PreferencesControls } from "@/components/preferences/PreferencesControls";
import { useI18n } from "@/components/preferences/PreferencesProvider";
import type { DashboardResponse } from "../../contracts/api";
import { exportDownloadUrl, fetchDashboard } from "../../lib/analysis-api";
import styles from "./ExportsPanel.module.css";

type ExportFilename = DashboardResponse["exports"][number]["filename"];

const exportKeys: Record<ExportFilename, string> = {
  "nodes_roles.csv": "nodes", "clusters.csv": "clusters", "top_nodes.csv": "top",
};

const exportOrder: ExportFilename[] = ["nodes_roles.csv", "clusters.csv", "top_nodes.csv"];

function formatPeriod(start: string, end: string, locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });
  const from = formatter.format(new Date(`${start}T00:00:00`));
  const to = formatter.format(new Date(`${end}T00:00:00`));
  return `${from} — ${to}`;
}

export function ExportsPanel() {
  const { t, intlLocale } = useI18n("extras");
  const searchParams = useSearchParams();
  const analysisId = searchParams.get("analysis_id") ?? searchParams.get("analysis");
  const [result, setResult] = useState<{ id: string; dashboard: DashboardResponse } | null>(null);
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null);
  const dashboard = result?.id === analysisId ? result.dashboard : null;
  const error = failure?.id === analysisId ? failure.message : null;
  const hasFailure = failure?.id === analysisId;
  const isLoading = Boolean(analysisId && !dashboard && !hasFailure);

  useEffect(() => {
    if (!analysisId) return;

    const controller = new AbortController();
    void fetchDashboard(analysisId, controller.signal)
      .then((dashboard) => setResult({ id: analysisId, dashboard }))
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setFailure({
            id: analysisId,
            message: requestError instanceof Error
              ? requestError.message || "request_failed"
              : "request_failed",
          });
        }
      });

    return () => controller.abort();
  }, [analysisId]);

  const exports = dashboard
    ? exportOrder.flatMap((filename) => {
        const item = dashboard.exports.find((candidate) => candidate.filename === filename);
        const href = exportDownloadUrl(dashboard.analysis_id, filename);
        return item && href ? [{ filename, href }] : [];
      })
    : [];

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <Link href="/">← {t("common.home")}</Link>
        <PreferencesControls />
      </div>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{t("exports.eyebrow")}</p>
        <h1>{t("exports.title")}</h1>
        <p>{t("exports.description")}</p>
      </header>

      {isLoading && <p className={styles.status} role="status">{t("exports.loading")}</p>}
      {hasFailure && (
        <div className={styles.error} role="alert">
          <p>{t("exports.error")}</p>
          {error && !["Сервис временно недоступен. Попробуйте ещё раз.", "Failed to fetch", "fetch failed", "request_failed"].includes(error) && (
            <p>{t("common.serverDetails", { message: error })}</p>
          )}
        </div>
      )}

      {!isLoading && !error && !analysisId && (
        <section className={styles.empty}>
          <h2>{t("exports.emptyTitle")}</h2>
          <p>{t("exports.emptyDescription")}</p>
          <Link className={styles.action} href="/workspace">{t("exports.start")}</Link>
        </section>
      )}

      {!isLoading && !error && analysisId && dashboard && (
        <>
          <section className={styles.meta} aria-label={t("exports.parameters")}>
            <span>{t("exports.analysis")} <strong>{dashboard.analysis_id}</strong></span>
            <span>{t("exports.period")} <strong>{formatPeriod(dashboard.period.start, dashboard.period.end, intlLocale)}</strong></span>
          </section>

          {exports.length ? (
            <ul className={styles.list}>
              {exports.map(({ filename, href }) => (
                <li className={styles.row} key={filename}>
                  <div>
                    <h2>{t(`exports.${exportKeys[filename]}.title`)}</h2>
                    <p>{t(`exports.${exportKeys[filename]}.description`)}</p>
                    <code>{filename}</code>
                  </div>
                  <a className={styles.download} href={href} aria-label={t("exports.downloadFile", { filename })}>
                    {t("exports.download")}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyNote}>{t("exports.noFiles")}</p>
          )}

          <p className={styles.note}>
            {t("exports.note")}
          </p>
        </>
      )}
    </main>
  );
}

export function ExportsLoading() {
  const { t } = useI18n("extras");
  return <main className={styles.page} role="status">{t("exports.loading")}</main>;
}
