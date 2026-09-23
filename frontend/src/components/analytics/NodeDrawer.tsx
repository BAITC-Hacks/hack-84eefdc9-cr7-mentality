import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  CircleDot,
  Info,
} from "lucide-react";
import type { GraphNode } from "@/contracts/api";
import type { NodeDrawerProps } from "@/features/workspace/types";
import { roles } from "@/lib/role-colors";
import { compactMoney, integer, money, scoreLabel } from "@/lib/format";
import styles from "./NodeDrawer.module.css";

const featureLabels = {
  inflow: "Входящий поток",
  in_degree: "Число плательщиков",
  betweenness: "Посредничество",
  seed_reach: "Достижимость от seed",
  role: "Роль",
};

const coverageNotes: Record<
  GraphNode["flags"][number],
  { label: string; detail: string }
> = {
  depth4_censored: {
    label: "Исходящие неизвестны",
    detail:
      "На 4-м колене исходящие неизвестны. Отсутствие переводов не подтверждает удержание денег или конечного получателя.",
  },
  seed_inflow_incomplete: {
    label: "Входящие seed неполны",
    detail:
      "У исходного seed входящие неполны. Отношение потоков не участвует в определении роли.",
  },
  outflow_exceeds_observed_inflow: {
    label: "Исходящий поток выше входящего",
    detail:
      "Исходящий поток больше наблюдаемого входящего. Это указывает на неполноту покрытия.",
  },
  isolated: {
    label: "Нет наблюдаемых связей",
    detail:
      "Изолированный узел сохранён в анализе. Связей в выгрузке нет.",
  },
  self_transfers_excluded: {
    label: "Самопереводы исключены из метрик",
    detail:
      "Переводы самому себе сохранены в графе и исключены из структурных метрик и ролей.",
  },
};

export function NodeDrawer({
  node,
  children,
}: NodeDrawerProps & { children?: React.ReactNode }) {
  if (!node)
    return (
      <aside className={styles.drawer} aria-label="Карточка узла">
        <div className={styles.empty}>
          <CircleDot size={28} aria-hidden="true" />
          <h2>Узел не выбран</h2>
        </div>
      </aside>
    );

  const role = roles[node.role];
  const { metrics } = node;
  const coverageSummary = node.flags
    .filter((flag) => flag !== "self_transfers_excluded")
    .map((flag) => coverageNotes[flag].label)
    .join(" · ");

  return (
    <aside className={styles.drawer} aria-label={`Карточка узла ${node.gid}`}>
      <header className={styles.identity}>
        <div className={styles.selectedLabel}>
          <CircleDot size={14} aria-hidden="true" />
          <span>Выбранный узел</span>
        </div>
        <h2
          className={`${styles.gid} ${node.gid.length > 12 ? styles.longGid : ""}`}
          title={node.gid}
        >
          {node.gid}
        </h2>
        <div className={styles.role}>
          <span
            className={styles.swatch}
            style={{ backgroundColor: role.color }}
            aria-hidden="true"
          />
          {role.label}
        </div>
        <p className={styles.context}>
          {node.is_seed && <span>Seed</span>}
          <span>Глубина {node.depth}</span>
          <span>Кластер {node.cluster_id}</span>
        </p>
        <dl className={styles.flows}>
          <div>
            <dt>
              <ArrowDownLeft size={14} aria-hidden="true" />Входящий
            </dt>
            <dd title={money(metrics.observed_in_kzt)}>
              {compactMoney(metrics.observed_in_kzt)}
            </dd>
          </div>
          <div>
            <dt>
              <ArrowUpRight size={14} aria-hidden="true" />Исходящий
            </dt>
            <dd title={money(metrics.observed_out_kzt)}>
              {compactMoney(metrics.observed_out_kzt)}
            </dd>
          </div>
        </dl>
        <p className={styles.participants}>
          <span>Отправителей <strong>{integer(metrics.in_degree)}</strong></span>
          <span>Получателей <strong>{integer(metrics.out_degree)}</strong></span>
        </p>
        {coverageSummary && (
          <p className={styles.coverageSummary}>
            <Info size={14} aria-hidden="true" />
            <span>{coverageSummary}</span>
          </p>
        )}
      </header>

      <section className={styles.evidence} aria-label="Основания проверки">
        <h3 className={styles.heading}>Основания проверки</h3>
        <p className={styles.ruleCaption}>Правило: {node.rule_id || "Не указано"}</p>
        <details className={styles.details} key={`evidence-${node.gid}`}>
          <summary>
            <span>Признаки роли</span>
            <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
          </summary>
          <p className={styles.evidenceText}>
            {node.evidence || "Основание не указано в анализе."}
          </p>
        </details>

        <details className={styles.details} key={`priority-${node.gid}`}>
          <summary>
            <span>Приоритет и признаки</span>
            <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
          </summary>
          <dl className={styles.scores}>
            <div>
              <dt>Приоритет проверки</dt>
              <dd title={String(node.priority_score)}>
                {scoreLabel(node.priority_score)}<span> / 1</span>
              </dd>
            </div>
            <div>
              <dt>Признаки роли</dt>
              <dd title={String(node.role_score)}>
                {scoreLabel(node.role_score)}<span> / 1</span>
              </dd>
            </div>
          </dl>
          <p className={styles.note}>Обе оценки эвристические, не вероятности.</p>
          {node.priority_breakdown.length > 0 && (
            <>
              <h4 className={styles.detailHeading}>Что формирует приоритет</h4>
              <dl className={styles.breakdown}>
              {node.priority_breakdown.map((item, index) => (
                <div key={`${item.feature}-${index}`}>
                  <dt>
                    {featureLabels[item.feature]}
                    <span>
                      Нормированное значение: {item.normalized_value} · Вес: {item.weight}
                    </span>
                  </dt>
                  <dd title={`Вклад: ${item.contribution}`}>+{item.contribution}</dd>
                </div>
              ))}
              </dl>
            </>
          )}
        </details>

        <details className={styles.details} key={`metrics-${node.gid}`}>
          <summary>
            <span>Все метрики</span>
            <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
          </summary>
          <dl className={styles.metrics}>
            <div><dt>Наблюдаемый входящий</dt><dd>{money(metrics.observed_in_kzt)}</dd></div>
            <div><dt>Наблюдаемый исходящий</dt><dd>{money(metrics.observed_out_kzt)}</dd></div>
            <div><dt>Плательщиков</dt><dd>{integer(metrics.in_degree)}</dd></div>
            <div><dt>Получателей</dt><dd>{integer(metrics.out_degree)}</dd></div>
            <div><dt>Других seed</dt><dd>{integer(metrics.reachable_seed_count)}</dd></div>
            <div><dt>Посредничество (betweenness)</dt><dd>{metrics.betweenness}</dd></div>
            <div>
              <dt>Отношение исходящего к входящему</dt>
              <dd>{metrics.observed_out_in_ratio ?? "Не определено"}</dd>
            </div>
            <div>
              <dt>Использование отношения потоков</dt>
              <dd>
                {metrics.ratio_usable
                  ? "Допустимо для определения роли"
                  : "Не используется в определении роли"}
              </dd>
            </div>
          </dl>
          <p className={styles.note}>Метрики рассчитаны по полному анализу.</p>
          {node.flags.length > 0 && (
            <>
              <h4 className={styles.detailHeading}>Ограничения наблюдения</h4>
              <dl className={styles.coverage}>
                {node.flags.map((flag) => (
                  <div key={flag}>
                    <dt>{coverageNotes[flag].label}</dt>
                    <dd>{coverageNotes[flag].detail}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </details>
      </section>
      {children}
    </aside>
  );
}
