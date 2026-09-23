"use client";

import { useRef, useState } from "react";
import type { AnalysisId } from "../../contracts/api";
import { startAnalysis } from "../../lib/analysis-api";
import styles from "./AnalysisLauncher.module.css";

type AnalysisLauncherProps = {
  onAnalysisStarted: (analysisId: AnalysisId) => void;
};

export function AnalysisLauncher({ onAnalysisStarted }: AnalysisLauncherProps) {
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
    } catch (requestError) {
      setError(
        controller.signal.aborted
          ? "Расчёт занял больше пяти минут. Можно повторить запуск."
          : requestError instanceof Error
            ? requestError.message
            : "Не удалось запустить анализ. Проверьте соединение и повторите попытку.",
      );
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.content} aria-labelledby="launch-title">
        <div className={styles.intro}>
          <p className={styles.kicker}>Анализ направленных переводов</p>
          <h1 id="launch-title">Исследуйте связи и потоки средств</h1>
          <p className={styles.description}>
            Запустите воспроизводимый расчёт, чтобы перейти к узлам с наивысшим приоритетом,
            направленным связям и подтверждающим фактам.
          </p>
        </div>

        <section className={styles.dataset} aria-labelledby="dataset-title">
          <div className={styles.datasetHeader}>
            <div>
              <p className={styles.sectionLabel}>Набор данных</p>
              <h2 id="dataset-title">HackAlem · июль 2026</h2>
            </div>
            <span className={styles.datasetStatus}>Готов к расчёту</span>
          </div>
          <dl className={styles.stats}>
            <div><dt>Узлы</dt><dd>2 248</dd></div>
            <div><dt>Направленные связи</dt><dd>3 119</dd></div>
            <div><dt>Транзакции</dt><dd>4 840</dd></div>
          </dl>
          <p className={styles.datasetNote}>
            Порог отображения, внутрибанковское покрытие и границы выгрузки будут указаны в анализе.
          </p>
        </section>

        <div className={styles.actions}>
          <button
            className={styles.primaryAction}
            disabled={isLoading}
            onClick={handleStart}
            type="button"
          >
            {isLoading ? "Выполняется расчёт..." : "Запустить анализ"}
          </button>
          <a className={styles.secondaryAction} href="/methodology">Методология</a>
        </div>

        {isLoading && (
          <p className={styles.status} role="status" aria-live="polite">
            Считаю метрики и кластеры. Это может занять несколько минут.
          </p>
        )}
        {readyId && <p className={styles.success} role="status">Анализ готов: {readyId}</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </section>

      <footer className={styles.footer}>
        Результаты — структурные сигналы для ручной проверки, не вывод о виновности.
      </footer>
    </main>
  );
}
