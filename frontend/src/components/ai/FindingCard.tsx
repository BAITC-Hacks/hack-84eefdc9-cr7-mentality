"use client";

import type { EvidenceFact, Finding, Gid } from "../../contracts/api";
import { useI18n } from "@/components/preferences/PreferencesProvider";
import { EvidenceLink } from "./EvidenceLink";
import styles from "./AnalystPanel.module.css";

type FindingCardProps = {
  finding: Finding;
  evidence: EvidenceFact[];
  onSelectGid: (gid: Gid) => void;
};

export function FindingCard({ finding, evidence, onSelectGid }: FindingCardProps) {
  const { t } = useI18n("extras");
  const factsById = new Map(evidence.map((fact) => [fact.id, fact]));

  return (
    <article className={styles.finding}>
      <h4>{finding.title}</h4>
      {finding.evidence_ids.length > 0 ? (
        <ul className={styles.evidenceList}>
          {finding.evidence_ids.map((id) => {
            const fact = factsById.get(id);
            return fact ? (
              <li key={id}>
                <EvidenceLink fact={fact} onSelectGid={onSelectGid} />
              </li>
            ) : null;
          })}
        </ul>
      ) : (
        <p className={styles.muted}>{t("analyst.noEvidence")}</p>
      )}
    </article>
  );
}
