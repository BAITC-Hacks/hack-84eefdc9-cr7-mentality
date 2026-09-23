"use client";

import type { EvidenceFact, Gid } from "../../contracts/api";
import { useI18n } from "@/components/preferences/PreferencesProvider";
import styles from "./AnalystPanel.module.css";

type EvidenceLinkProps = {
  fact: EvidenceFact;
  onSelectGid: (gid: Gid) => void;
};

export function EvidenceLink({ fact, onSelectGid }: EvidenceLinkProps) {
  const { t } = useI18n("extras");
  return (
    <button
      className={styles.evidenceLink}
      onClick={() => onSelectGid(fact.gid)}
      type="button"
      aria-label={t("analyst.openNode", { gid: fact.gid, text: fact.text })}
    >
      <span>{fact.text}</span>
      <span className={styles.evidenceGid}>{t("analyst.node", { gid: fact.gid })}</span>
    </button>
  );
}
