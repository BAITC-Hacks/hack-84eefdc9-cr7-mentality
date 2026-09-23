"use client";

import { useEffect, useState } from "react";
import type { DashboardResponse, ExportFilename } from "../../contracts/api";
import { exportDownloadUrl, fetchDashboard } from "../../lib/analysis-api";
import styles from "./ExportsPanel.module.css";

const exportTitles: Record<ExportFilename, { title: string; description: string }> = {
  "nodes_roles.csv": {
    title: "Узлы и роли",
    description: "Метрики, выбранная роль, кластер и фактическое evidence для каждого узла.",
  },
  "clusters.csv": {
    title: "Кластеры",
    description: "Состав сообществ, число seed, внутренний оборот и проверяемая гипотеза.",
  },
  "top_nodes.csv": {
    title: "Топ узлов",
    description: "Первые узлы по приоритету ручной проверки и основные причины ранжирования.",
  },
};

const exportOrder: ExportFilename[] = ["nodes_roles.csv", "clusters.csv", "top_nodes.csv"];

function formatPeriod(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  const from = formatter.format(new Date(`${start}T00:00:00`));
  const to = formatter.format(new Date(`${end}T00:00:00`));
  return `${from} — ${to}`;
}

export function ExportsPanel() {
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const id = search.get("analysis_id") ?? search.get("analysis");
    setAnalysisId(id);

    if (!id) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    void fetchDashboard(id, controller.signal)
      .then((result) => setDashboard(result))
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Не удалось загрузить список выгрузок.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const exports = dashboard
    ? exportOrder.flatMap((filename) => {
        const item = dashboard.exports.find((candidate) => candidate.filename === filename);
        const href = exportDownloadUrl(dashboard.analysis_id, filename);
        return item && href ? [{ filename, href }] : [];
      })
    : [];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Результаты расчёта</p>
        <h1>Выгрузки</h1>
        <p>Скачайте CSV-файлы, сформированные для выбранного анализа.</p>
      </header>

      {isLoading && <p className={styles.status} role="status">Загружаю список файлов...</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      {!isLoading && !error && !analysisId && (
        <section className={styles.empty}>
          <h2>Анализ ещё не выбран</h2>
          <p>Сначала запустите анализ, чтобы подготовить выгрузки.</p>
          <a className={styles.action} href="/">Перейти к запуску</a>
        </section>
      )}

      {!isLoading && !error && analysisId && dashboard && (
        <>
          <section className={styles.meta} aria-label="Параметры анализа">
            <span>Анализ <strong>{dashboard.analysis_id}</strong></span>
            <span>Период <strong>{formatPeriod(dashboard.period.start, dashboard.period.end)}</strong></span>
          </section>

          {exports.length ? (
            <ul className={styles.list}>
              {exports.map(({ filename, href }) => (
                <li className={styles.row} key={filename}>
                  <div>
                    <h2>{exportTitles[filename].title}</h2>
                    <p>{exportTitles[filename].description}</p>
                    <code>{filename}</code>
                  </div>
                  <a className={styles.download} href={href} aria-label={`Скачать ${filename}`}>
                    Скачать CSV
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyNote}>Для этого анализа пока нет выгрузок.</p>
          )}

          <p className={styles.note}>
            Файлы относятся к одному analysis_id. CSV содержит результаты snapshot и не требует OpenAI.
          </p>
        </>
      )}
    </main>
  );
}
