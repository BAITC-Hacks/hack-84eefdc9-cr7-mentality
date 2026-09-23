"use client";
import { useI18n } from "@/components/preferences/PreferencesProvider";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDot,
  ExternalLink,
  Info,
  ShieldAlert,
} from "lucide-react";
import type { NodeDrawerProps } from "@/features/workspace/types";
import { roles } from "@/lib/role-colors";
import { integer, money, scoreLabel } from "@/lib/format";
export function NodeDrawer({
  node,
  children,
  isDemo = false,
}: NodeDrawerProps & { children?: React.ReactNode; isDemo?: boolean }) {
  const { t, intlLocale, locale } = useI18n("workspace");
  if (!node)
    return (
      <aside className="panel node-panel">
        <div className="empty-node">
          <CircleDot size={30} />
          <h2>{t("node.select")}</h2>
          <p>
            {t("node.selectHint")}
          </p>
        </div>
      </aside>
    );
  const role = roles[node.role];
  return (
    <aside
      className="panel node-panel"
      aria-label={t("node.label", { gid: node.gid })}
    >
      <div className="panel-heading">
        <span className="eyebrow">{t("node.profile")}</span>
        <ExternalLink size={16} />
      </div>
      <div className="node-identity">
        <div className="node-id-row">
          <span
            className="node-symbol"
            style={{ background: role.soft, color: role.color }}
          >
            <CircleDot size={25} />
          </span>
          <div>
            <span className="muted">{t("node.identifier")}</span>
            <h2 className="mono">{node.gid}</h2>
          </div>
        </div>
        <div className="node-tags">
          <span
            className="role-badge"
            style={{ background: role.soft, color: role.color }}
          >
            <i style={{ background: role.color }} />
            {t(`role.${node.role}`)}
          </span>
          {node.is_seed && <span className="badge">{t("node.seed")}</span>}
          <span className="badge">{t("node.depth", { depth: node.depth })}</span>
          <span className="badge">{t("cluster", { id: node.cluster_id })}</span>
        </div>
      </div>
      <div className="node-section">
        <div className="section-title">
          {t("ranking.title")}{" "}
          <strong>
            {scoreLabel(node.priority_score, intlLocale)}
            <span> / 1</span>
          </strong>
        </div>
        <div className="score-track">
          <span style={{ width: `${node.priority_score * 100}%` }} />
        </div>
        <p className="microcopy">
          {t("node.scoreHint", { score: scoreLabel(node.role_score, intlLocale) })}
        </p>
      </div>
      <div className="node-section">
        <h3>{t("node.flows")}</h3>
        <div className="money-row">
          <span>
            <ArrowDownLeft size={15} />
            {t("node.incoming")}
          </span>
          <strong>{money(node.metrics.observed_in_kzt, true, intlLocale)}</strong>
        </div>
        <div className="money-row">
          <span>
            <ArrowUpRight size={15} />
            {t("node.outgoing")}
          </span>
          <strong>{money(node.metrics.observed_out_kzt, true, intlLocale)}</strong>
        </div>
        <div className="node-metrics">
          <div>
            <strong>{integer(node.metrics.in_degree, intlLocale)}</strong>
            <span>{t("node.payers")}</span>
          </div>
          <div>
            <strong>{integer(node.metrics.out_degree, intlLocale)}</strong>
            <span>{t("node.recipients")}</span>
          </div>
          <div>
            <strong>{integer(node.metrics.reachable_seed_count, intlLocale)}</strong>
            <span>{t("node.otherSeeds")}</span>
          </div>
        </div>
        <dl className="minor-metrics">
          <div>
            <dt>{t("node.betweenness")}</dt>
            <dd>{new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(node.metrics.betweenness)}</dd>
          </div>
          <div>
            <dt>{t("node.ratio")}</dt>
            <dd>
              {node.metrics.observed_out_in_ratio === null
                ? t("node.undefined")
                : scoreLabel(node.metrics.observed_out_in_ratio, intlLocale)}
            </dd>
          </div>
        </dl>
      </div>
      <div className="node-section">
        <h3>
          <Info size={15} />
          {t("node.evidence")}
        </h3>
        {!isDemo && locale !== "ru" && <p className="microcopy">{t("node.originalText")}</p>}
        <p className="evidence-text">{isDemo ? t(node.flags.includes("isolated") ? "demo.evidenceIsolated" : node.flags.includes("depth4_censored") ? "demo.evidenceDepth" : "demo.evidence") : node.evidence}</p>
        <p className="microcopy">
          {t("node.rule", { rule: node.rule_id })}
        </p>
        {node.flags.includes("self_transfers_excluded") && (
          <p className="microcopy">
            {t("node.selfTransfers")}
          </p>
        )}
        {node.priority_breakdown.length > 0 && (
          <details className="breakdown">
            <summary>{t("node.breakdown")}</summary>
            {node.priority_breakdown.map((item, i) => (
              <div key={`${item.feature}-${i}`}>
                <span>
                  {t(`feature.${item.feature}`)}
                  <small>
                    {t("node.normalized", { value: scoreLabel(item.normalized_value, intlLocale), weight: new Intl.NumberFormat(intlLocale).format(item.weight) })}
                  </small>
                </span>
                <strong>+{scoreLabel(item.contribution, intlLocale)}</strong>
              </div>
            ))}
          </details>
        )}
      </div>
      {(node.flags.includes("depth4_censored") ||
        node.flags.includes("seed_inflow_incomplete") ||
        node.flags.includes("outflow_exceeds_observed_inflow") ||
        node.flags.includes("isolated")) && (
        <div className="node-warnings">
          <h3>
            <ShieldAlert size={15} />
            {t("node.limitations")}
          </h3>
          {node.flags.includes("depth4_censored") && (
            <p>
              {t("node.depthLimit")}
            </p>
          )}
          {node.flags.includes("seed_inflow_incomplete") && (
            <p>
              {t("node.seedLimit")}
            </p>
          )}
          {node.flags.includes("outflow_exceeds_observed_inflow") && (
            <p>
              {t("node.outflowLimit")}
            </p>
          )}
          {node.flags.includes("isolated") && (
            <p>{t("node.isolatedLimit")}</p>
          )}
        </div>
      )}
      {children}
    </aside>
  );
}
