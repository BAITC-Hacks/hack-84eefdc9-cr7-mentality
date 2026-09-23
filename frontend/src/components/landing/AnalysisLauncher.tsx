"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/components/preferences/PreferencesProvider";
import { PreferencesControls } from "@/components/preferences/PreferencesControls";
import type { AnalysisId } from "../../contracts/api";
import { startAnalysis } from "../../lib/analysis-api";
import styles from "./AnalysisLauncher.module.css";

type AnalysisLauncherProps = {
  onAnalysisStarted: (analysisId: AnalysisId) => void;
};

export function AnalysisLauncher({ onAnalysisStarted }: AnalysisLauncherProps) {
  const { t, intlLocale } = useI18n("landing");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readyId, setReadyId] = useState<AnalysisId | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const handleStart = async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 300_000);
    setIsLoading(true);
    setError(null);
    setReadyId(null);

    try {
      const result = await startAnalysis(controller.signal);
      setReadyId(result.analysis_id);
      onAnalysisStarted(result.analysis_id);
    } catch {
      setError(controller.signal.aborted ? "launcher.error.timeout" : "launcher.error.failed");
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.preferences}><PreferencesControls /></div>
      <section className={styles.content} aria-labelledby="launch-title">
        <div className={styles.intro}>
          <p className={styles.kicker}>{t("launcher.kicker")}</p>
          <h1 id="launch-title">{t("launcher.title")}</h1>
          <p className={styles.description}>
            {t("launcher.description")}
          </p>
        </div>

        <section className={styles.dataset} aria-labelledby="dataset-title">
          <div className={styles.datasetHeader}>
            <div>
              <p className={styles.sectionLabel}>{t("launcher.dataset")}</p>
              <h2 id="dataset-title">{t("launcher.datasetName")}</h2>
            </div>
            <span className={styles.datasetStatus}>{t("launcher.ready")}</span>
          </div>
          <dl className={styles.stats}>
            <div><dt>{t("launcher.nodes")}</dt><dd>{new Intl.NumberFormat(intlLocale).format(2248)}</dd></div>
            <div><dt>{t("launcher.edges")}</dt><dd>{new Intl.NumberFormat(intlLocale).format(3119)}</dd></div>
            <div><dt>{t("launcher.transactions")}</dt><dd>{new Intl.NumberFormat(intlLocale).format(4840)}</dd></div>
          </dl>
          <p className={styles.datasetNote}>
            {t("launcher.datasetNote")}
          </p>
        </section>

        <div className={styles.actions}>
          <button
            className={styles.primaryAction}
            disabled={isLoading}
            onClick={handleStart}
            type="button"
          >
            {t(isLoading ? "launcher.calculating" : "launcher.start")}
          </button>
          <a className={styles.secondaryAction} href="/methodology">{t("nav.methodology")}</a>
        </div>

        {isLoading && (
          <p className={styles.status} role="status" aria-live="polite">
            {t("launcher.progress")}
          </p>
        )}
        {readyId && <p className={styles.success} role="status">{t("launcher.success", { id: readyId })}</p>}
        {error && <p className={styles.error} role="alert">{t(error)}</p>}
      </section>

      <footer className={styles.footer}>
        {t("launcher.disclaimer")}
      </footer>
    </main>
  );
}
