"use client";
import { useI18n } from "@/components/preferences/PreferencesProvider";
import { ArrowLeftRight, CircleDot, Layers3, Wallet } from "lucide-react";
import type { DashboardResponse } from "@/contracts/api";
import { compactMoney, integer, money } from "@/lib/format";
export function SummaryCards({ data }: { data: DashboardResponse }) {
  const { t, intlLocale } = useI18n("workspace");
  const { stats } = data;
  const cards = [
    {
      label: t("summary.turnover"),
      value: compactMoney(stats.graph_turnover_kzt, intlLocale),
      hint: t("summary.turnoverHint"),
      icon: Wallet,
      title: money(stats.graph_turnover_kzt, true, intlLocale),
    },
    {
      label: t("summary.nodes"),
      value: integer(stats.n_nodes, intlLocale),
      hint: t("summary.seeds", { count: integer(stats.n_seed, intlLocale) }),
      icon: CircleDot,
    },
    {
      label: t("summary.edges"),
      value: integer(stats.n_edges, intlLocale),
      hint: t("transactions.count", { count: integer(stats.n_transactions, intlLocale) }),
      icon: ArrowLeftRight,
    },
    {
      label: t("summary.clusters"),
      value: integer(stats.n_clusters, intlLocale),
      hint: t("summary.clustersHint"),
      icon: Layers3,
    },
  ];
  return (
    <div className="summary-grid">
      {cards.map(({ label, value, hint, icon: Icon, title }) => (
        <article className="summary-card" key={label}>
          <div className="summary-label">
            {label}
            <Icon size={17} />
          </div>
          <div className="summary-value" title={title}>
            {value}
          </div>
          <p>{hint}</p>
        </article>
      ))}
    </div>
  );
}
