"use client";

import Link from "next/link";
import { PreferencesControls } from "@/components/preferences/PreferencesControls";
import { useI18n } from "@/components/preferences/PreferencesProvider";
import styles from "./MethodologyContent.module.css";

const roleIds = ["R1", "R2", "R3", "R4", "R5", "R6"] as const;
const metrics = ["flows", "degree", "ratio", "seeds", "centrality"] as const;
const metricSymbols = { flows: "I / O", degree: "Uin / Uout", ratio: "r = O / I", seeds: "S", centrality: "B" };
const limitations = ["depth", "seed", "outflow", "difference", "coverage"] as const;

export function MethodologyContent() {
  const { t } = useI18n("extras");

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <Link href="/">← {t("common.home")}</Link>
        <PreferencesControls />
      </div>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{t("methodology.eyebrow")}</p>
        <h1>{t("methodology.title")}</h1>
        <p>{t("methodology.description")}</p>
      </header>
      <section className={styles.section} aria-labelledby="how-to-read">
        <h2 id="how-to-read">{t("methodology.readTitle")}</h2>
        <p>{t("methodology.readDescription")}</p>
      </section>
      <section className={styles.section}>
        <h2>{t("methodology.metricsTitle")}</h2>
        <div className={styles.tableWrap} role="region" aria-label={t("methodology.metricsTitle")} tabIndex={0}>
          <table>
            <thead><tr><th>{t("methodology.metric")}</th><th>{t("methodology.meaning")}</th></tr></thead>
            <tbody>{metrics.map((metric) => <tr key={metric}><th>{metricSymbols[metric]}</th><td>{t(`methodology.metric.${metric}`)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className={styles.section}>
        <h2>{t("methodology.rolesTitle")}</h2>
        <p>{t("methodology.rolesDescription")}</p>
        <div className={styles.tableWrap} role="region" aria-label={t("methodology.rolesLabel")} tabIndex={0}>
          <table>
            <thead><tr><th>{t("methodology.rule")}</th><th>{t("methodology.role")}</th><th>{t("methodology.condition")}</th></tr></thead>
            <tbody>{roleIds.map((id) => <tr key={id}><th>{id}</th><td>{t(`methodology.role.${id}`)}</td><td><code>{t(`methodology.rule.${id}`)}</code></td></tr>)}</tbody>
          </table>
        </div>
        <p className={styles.note}>{t("methodology.rolesNote")}</p>
      </section>
      <section className={styles.section}>
        <h2>{t("methodology.priorityTitle")}</h2>
        <p>{t("methodology.priorityDescription")}</p>
        <pre className={styles.formula}>priority = 0.30·P(I) + 0.20·P(Uin) + 0.20·P(B) + 0.20·P(S) + 0.10·W(role)</pre>
        <p>{t("methodology.priorityFormula")}</p>
        <p>{t("methodology.priorityOrder")}</p>
      </section>
      <section className={styles.section}>
        <h2>{t("methodology.clustersTitle")}</h2>
        <p>{t("methodology.clustersDescription")}</p>
      </section>
      <section className={`${styles.section} ${styles.limits}`}>
        <h2>{t("methodology.limitsTitle")}</h2>
        <ul>{limitations.map((limit) => <li key={limit}><strong>{t(`methodology.limit.${limit}.title`)}:</strong> {t(`methodology.limit.${limit}.description`)}</li>)}</ul>
        <p className={styles.depthExample}>{t("methodology.depthExample")}</p>
      </section>
      <section className={styles.section}>
        <h2>{t("methodology.aiTitle")}</h2>
        <p>{t("methodology.aiDescription")}</p>
      </section>
    </main>
  );
}
