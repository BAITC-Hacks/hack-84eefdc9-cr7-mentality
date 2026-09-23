import type { EvidenceFact, Gid } from "../../contracts/api";
import styles from "./AnalystPanel.module.css";

type EvidenceLinkProps = {
  fact: EvidenceFact;
  onSelectGid: (gid: Gid) => void;
};

export function EvidenceLink({ fact, onSelectGid }: EvidenceLinkProps) {
  return (
    <button
      className={styles.evidenceLink}
      onClick={() => onSelectGid(fact.gid)}
      type="button"
      aria-label={`Открыть узел ${fact.gid}: ${fact.text}`}
    >
      <span>{fact.text}</span>
      <span className={styles.evidenceGid}>Узел {fact.gid}</span>
    </button>
  );
}
