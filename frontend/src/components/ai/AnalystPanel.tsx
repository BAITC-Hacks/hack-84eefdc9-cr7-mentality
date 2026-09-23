"use client";

import { useState, type FormEvent } from "react";
import type { AnalysisId, Gid } from "../../contracts/api";
import { useAssistant } from "../../hooks/useAssistant";
import { FindingCard } from "./FindingCard";
import styles from "./AnalystPanel.module.css";

export type AnalystPanelProps = {
  analysisId: AnalysisId;
  focusGids: Gid[];
  onSelectGid: (gid: Gid) => void;
};

export function AnalystPanel({ analysisId, focusGids, onSelectGid }: AnalystPanelProps) {
  const [question, setQuestion] = useState("");
  const { response, error, validationMessage, isLoading, ask, modeLabel } =
    useAssistant(analysisId);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(question, focusGids);
  };

  return (
    <section className={styles.panel} aria-labelledby="analyst-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Пояснение к выбранным данным</p>
          <h3 id="analyst-title">Аналитик</h3>
        </div>
        <span className={styles.scope}>
          {focusGids.length ? `Узлов: ${focusGids.length}` : "Узел не выбран"}
        </span>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label htmlFor="assistant-question">Вопрос аналитику</label>
        <textarea
          id="assistant-question"
          maxLength={1000}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Почему этот узел стоит проверить?"
          rows={3}
          value={question}
        />
        <div className={styles.formFooter}>
          <span className={styles.counter}>{question.length}/1000</span>
          <button
            className={styles.submit}
            disabled={isLoading || focusGids.length === 0 || focusGids.length > 5}
            type="submit"
          >
            {isLoading ? "Готовлю ответ..." : "Спросить аналитика"}
          </button>
        </div>
        {!focusGids.length && (
          <p className={styles.hint} role="status">
            Выберите узел в графе, чтобы задать вопрос.
          </p>
        )}
        {focusGids.length > 5 && (
          <p className={styles.hint} role="status">
            Для одного запроса выберите не более пяти узлов.
          </p>
        )}
        {validationMessage && <p className={styles.error} role="alert">{validationMessage}</p>}
      </form>

      {isLoading && (
        <div className={styles.loading} role="status" aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          Анализирую только факты выбранных узлов...
        </div>
      )}

      {error && (
        <div className={styles.errorBox} role="alert">
          <strong>Не удалось получить ответ</strong>
          <p>{error}</p>
        </div>
      )}

      {response && (
        <div className={styles.answer} aria-live="polite">
          <div className={styles.answerHeading}>
            <h4>Пояснение</h4>
            <span className={response.mode === "live" ? styles.liveMode : styles.fallbackMode}>
              {modeLabel}
            </span>
          </div>
          {response.mode === "fallback" && (
            <p className={styles.fallbackNote}>
              Сервис ИИ недоступен. Ниже показаны правила и факты анализа.
            </p>
          )}
          {response.answer.status === "insufficient_data" && (
            <p className={styles.fallbackNote}>Недостаточно данных для этого вопроса.</p>
          )}
          <p className={styles.summary}>{response.answer.summary}</p>
          {response.answer.findings.map((finding, index) => (
            <FindingCard
              key={`${finding.title}-${index}`}
              finding={finding}
              evidence={response.evidence}
              onSelectGid={onSelectGid}
            />
          ))}
          {response.answer.missing_data.length > 0 && (
            <section className={styles.answerSection}>
              <h4>Ограничения данных</h4>
              <ul>{response.answer.missing_data.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          )}
          {response.answer.next_steps.length > 0 && (
            <section className={styles.answerSection}>
              <h4>Что проверить дальше</h4>
              <ul>{response.answer.next_steps.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          )}
          <p className={styles.disclaimer}>
            Это структурные признаки для ручной проверки, а не вывод о виновности.
          </p>
        </div>
      )}
    </section>
  );
}
