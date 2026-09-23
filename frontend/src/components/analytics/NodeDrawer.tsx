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
const featureLabels = {
  inflow: "Входящий поток",
  in_degree: "Число плательщиков",
  betweenness: "Посредничество",
  seed_reach: "Достижимость от seed",
  role: "Роль",
};
export function NodeDrawer({
  node,
  children,
}: NodeDrawerProps & { children?: React.ReactNode }) {
  if (!node)
    return (
      <aside className="panel node-panel">
        <div className="empty-node">
          <CircleDot size={30} />
          <h2>Выберите узел</h2>
          <p>
            Нажмите на узел в графе или таблице, чтобы увидеть признаки и
            ограничения.
          </p>
        </div>
      </aside>
    );
  const role = roles[node.role];
  return (
    <aside
      className="panel node-panel"
      aria-label={`Карточка узла ${node.gid}`}
    >
      <div className="panel-heading">
        <span className="eyebrow">ПРОФИЛЬ УЗЛА</span>
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
            <span className="muted">Идентификатор</span>
            <h2 className="mono">{node.gid}</h2>
          </div>
        </div>
        <div className="node-tags">
          <span
            className="role-badge"
            style={{ background: role.soft, color: role.color }}
          >
            <i style={{ background: role.color }} />
            {role.label}
          </span>
          {node.is_seed && <span className="badge">Seed</span>}
          <span className="badge">Глубина {node.depth}</span>
          <span className="badge">Кластер {node.cluster_id}</span>
        </div>
      </div>
      <div className="node-section">
        <div className="section-title">
          Приоритет проверки{" "}
          <strong>
            {scoreLabel(node.priority_score)}
            <span> / 1</span>
          </strong>
        </div>
        <div className="score-track">
          <span style={{ width: `${node.priority_score * 100}%` }} />
        </div>
        <p className="microcopy">
          Выраженность признаков роли: {scoreLabel(node.role_score)}.
          Эвристическая оценка, не вероятность.
        </p>
      </div>
      <div className="node-section">
        <h3>Наблюдаемые потоки</h3>
        <div className="money-row">
          <span>
            <ArrowDownLeft size={15} />
            Входящий
          </span>
          <strong>{money(node.metrics.observed_in_kzt)}</strong>
        </div>
        <div className="money-row">
          <span>
            <ArrowUpRight size={15} />
            Исходящий
          </span>
          <strong>{money(node.metrics.observed_out_kzt)}</strong>
        </div>
        <div className="node-metrics">
          <div>
            <strong>{integer(node.metrics.in_degree)}</strong>
            <span>Плательщиков</span>
          </div>
          <div>
            <strong>{integer(node.metrics.out_degree)}</strong>
            <span>Получателей</span>
          </div>
          <div>
            <strong>{integer(node.metrics.reachable_seed_count)}</strong>
            <span>Других seed</span>
          </div>
        </div>
        <dl className="minor-metrics">
          <div>
            <dt>Betweenness</dt>
            <dd>{node.metrics.betweenness.toFixed(4)}</dd>
          </div>
          <div>
            <dt>Отношение исходящего к входящему</dt>
            <dd>
              {node.metrics.observed_out_in_ratio === null
                ? "Не определено"
                : node.metrics.observed_out_in_ratio.toFixed(3)}
            </dd>
          </div>
        </dl>
      </div>
      <div className="node-section">
        <h3>
          <Info size={15} />
          Основание роли
        </h3>
        <p className="evidence-text">{node.evidence}</p>
        <p className="microcopy">
          Правило: {node.rule_id}. Метрики рассчитаны по полному анализу.
        </p>
        {node.flags.includes("self_transfers_excluded") && (
          <p className="microcopy">
            Переводы самому себе сохранены в графе и исключены из структурных
            метрик и ролей.
          </p>
        )}
        {node.priority_breakdown.length > 0 && (
          <details className="breakdown">
            <summary>Что формирует приоритет</summary>
            {node.priority_breakdown.map((item, i) => (
              <div key={`${item.feature}-${i}`}>
                <span>
                  {featureLabels[item.feature]}
                  <small>
                    Нормированное значение: {scoreLabel(item.normalized_value)}{" "}
                    · Вес: {item.weight}
                  </small>
                </span>
                <strong>+{scoreLabel(item.contribution)}</strong>
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
            Ограничения наблюдения
          </h3>
          {node.flags.includes("depth4_censored") && (
            <p>
              На 4-м колене исходящие неизвестны. Отсутствие переводов не
              подтверждает удержание денег или конечного получателя.
            </p>
          )}
          {node.flags.includes("seed_inflow_incomplete") && (
            <p>
              У исходного seed входящие неполны. Отношение потоков не участвует
              в определении роли.
            </p>
          )}
          {node.flags.includes("outflow_exceeds_observed_inflow") && (
            <p>
              Исходящий поток больше наблюдаемого входящего. Это указывает на
              неполноту покрытия.
            </p>
          )}
          {node.flags.includes("isolated") && (
            <p>Изолированный узел сохранён в анализе. Связей в выгрузке нет.</p>
          )}
        </div>
      )}
      {children}
    </aside>
  );
}
