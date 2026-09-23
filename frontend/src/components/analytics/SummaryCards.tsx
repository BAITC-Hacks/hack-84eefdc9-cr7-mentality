import { ArrowLeftRight, CircleDot, Layers3, Wallet } from "lucide-react";
import type { DashboardResponse } from "@/contracts/api";
import { compactMoney, integer, money } from "@/lib/format";
export function SummaryCards({ data }: { data: DashboardResponse }) {
  const { stats } = data;
  const cards = [
    {
      label: "Наблюдаемый оборот",
      value: compactMoney(stats.graph_turnover_kzt),
      hint: "Сумма переводов за период",
      icon: Wallet,
      title: money(stats.graph_turnover_kzt),
    },
    {
      label: "Узлов в сети",
      value: integer(stats.n_nodes),
      hint: `${integer(stats.n_seed)} исходных seed-узлов`,
      icon: CircleDot,
    },
    {
      label: "Направленных связей",
      value: integer(stats.n_edges),
      hint: `${integer(stats.n_transactions)} транзакций`,
      icon: ArrowLeftRight,
    },
    {
      label: "Кластеров",
      value: integer(stats.n_clusters),
      hint: "Сообщества по структуре связей",
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
