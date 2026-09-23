"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/components/preferences/PreferencesProvider";
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
  const { t, intlLocale } = useI18n("extras");
  const [question, setQuestion] = useState("");
  const { response, error, errorDetail, validationMessage, isLoading, ask, modeLabel } =
    useAssistant(analysisId);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(question, focusGids);
  };

  return (
    <section className={styles.panel} aria-labelledby="analyst-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{t("analyst.eyebrow")}</p>
          <h3 id="analyst-title">{t("analyst.title")}</h3>
        </div>
        <span className={styles.scope}>
          {focusGids.length ? t("analyst.nodeCount", { count: new Intl.NumberFormat(intlLocale).format(focusGids.length) }) : t("analyst.noNode")}
        </span>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label htmlFor="assistant-question">{t("analyst.question")}</label>
        <textarea
          id="assistant-question"
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t("analyst.placeholder")}
          rows={3}
          value={question}
        />
        <div className={styles.formFooter}>
          <span className={styles.counter}>{Array.from(question).length}/1000</span>
          <button
            className={styles.submit}
            disabled={isLoading || focusGids.length === 0 || focusGids.length > 5}
            type="submit"
          >
            {isLoading ? t("analyst.preparing") : t("analyst.ask")}
          </button>
        </div>
        {!focusGids.length && (
          <p className={styles.hint} role="status">
            {t("analyst.selectNode")}
          </p>
        )}
        {focusGids.length > 5 && (
          <p className={styles.hint} role="status">
            {t("analyst.maxNodes")}
          </p>
        )}
        {validationMessage && <p className={styles.error} role="alert">{validationMessage}</p>}
      </form>

      {isLoading && (
        <div className={styles.loading} role="status" aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          {t("analyst.loading")}
        </div>
      )}

      {error && (
        <div className={styles.errorBox} role="alert">
          <strong>{t("analyst.errorTitle")}</strong>
          <p>{error}</p>
          {errorDetail && <p>{t("common.serverDetails", { message: errorDetail })}</p>}
        </div>
      )}

      {response && (
        <div className={styles.answer} aria-live="polite">
          <div className={styles.answerHeading}>
            <h4>{t("analyst.explanation")}</h4>
            <span className={response.mode === "live" ? styles.liveMode : styles.fallbackMode}>
              {modeLabel}
            </span>
          </div>
          <p className={styles.muted}>{t("analyst.originalLanguage")}</p>
          {response.mode === "fallback" && (
            <p className={styles.fallbackNote}>
              {t(
                response.fallback_reason === "disabled"
                  ? "analyst.fallbackDisabled"
                  : response.fallback_reason === "timeout"
                    ? "analyst.fallbackTimeout"
                    : "analyst.fallback",
              )}
            </p>
          )}
          {response.mode === "live" && response.answer.status === "insufficient_data" && (
            <p className={styles.fallbackNote}>{t("analyst.insufficientData")}</p>
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
              <h4>{t("analyst.limits")}</h4>
              <ul>{response.answer.missing_data.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          )}
          {response.answer.next_steps.length > 0 && (
            <section className={styles.answerSection}>
              <h4>{t("analyst.nextSteps")}</h4>
              <ul>{response.answer.next_steps.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          )}
          <p className={styles.disclaimer}>
            {t("analyst.disclaimer")}
          </p>
        </div>
      )}
    </section>
  );
}

export default AnalystPanel;
