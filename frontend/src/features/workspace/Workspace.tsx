"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Download,
  FlaskConical,
  Info,
  Network,
  Play,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { SummaryCards } from "@/components/analytics/SummaryCards";
import { PriorityTable } from "@/components/analytics/PriorityTable";
import { DailyFlowChart } from "@/components/analytics/DailyFlowChart";
import { NodeDrawer } from "@/components/analytics/NodeDrawer";
import AnalystPanel from "@/components/ai/AnalystPanel";
import { GraphToolbar } from "@/components/graph/GraphToolbar";
import { GraphLegend } from "@/components/graph/GraphLegend";
import { Button } from "@/components/ui/button";
import { ErrorState, Loading } from "@/components/ui/Status";
import { canonicalGid, dateLabel, money } from "@/lib/format";
import { roles } from "@/lib/role-colors";
import { getExportUrl } from "@/lib/api";
import { demoAvailable, useWorkspace } from "./useWorkspace";
import { clusterIdFromParam } from "./types";
const NetworkGraph = dynamic(() => import("@/components/graph/NetworkGraph"), {
  ssr: false,
  loading: () => <Loading label="Подготавливаем граф…" />,
});

export function Workspace() {
  const params = useSearchParams();
  const rawGid = params.get("gid");
  const rawClusterId = params.get("cluster_id");
  const selectedGid = canonicalGid(rawGid);
  const selectedClusterId =
    selectedGid === null ? clusterIdFromParam(rawClusterId) : null;
  useEffect(() => {
    const url = new URL(window.location.href);
    if (rawGid !== null) {
      if (selectedGid === null) url.searchParams.delete("gid");
      else url.searchParams.set("gid", selectedGid);
    }
    if (
      selectedGid !== null ||
      (rawClusterId !== null && selectedClusterId === null)
    )
      url.searchParams.delete("cluster_id");
    else if (selectedClusterId !== null)
      url.searchParams.set("cluster_id", String(selectedClusterId));
    if (url.href !== window.location.href)
      window.history.replaceState(null, "", url);
  }, [rawGid, rawClusterId, selectedGid, selectedClusterId]);
  const {
    state,
    act,
    summary,
    graph,
    selectedNode,
    isDemo,
    running,
    runError,
    startAnalysis,
    onSelectGid,
    retry,
  } = useWorkspace(
    params.get("analysis"),
    selectedGid,
    selectedClusterId,
    params.get("demo") === "1",
  );
  const data = summary.data;
  return (
    <AppShell analysisId={state.analysisId} demo={isDemo}>
      <main className="workspace">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span />
              ИССЛЕДОВАНИЕ ТРАНЗАКЦИЙ
            </div>
            <h1>Обзор сети</h1>
            <p>Находите связи. Проверяйте гипотезы. Следуйте за потоком.</p>
          </div>
          <div className="heading-actions">
            {data && (
              <span className="period">
                <CalendarDays size={15} />
                {dateLabel(data.period.start)} — {dateLabel(data.period.end)}
              </span>
            )}
            <Button
              variant="outline"
              onClick={state.analysisId ? retry : startAnalysis}
              disabled={running}
            >
              <RotateCw size={15} className={running ? "spin" : ""} />
              {state.analysisId ? "Обновить" : "Подключиться"}
            </Button>
          </div>
        </div>
        {isDemo && (
          <div className="demo-banner">
            <FlaskConical size={17} />
            <strong>Демонстрация UI</strong>
            <span>
              Синтетические данные. Реальный анализ и ИИ не запускались.
            </span>
            <a href="/workspace">Перейти к API →</a>
          </div>
        )}
        {runError && <ErrorState message={runError} onRetry={startAnalysis} />}
        {!state.analysisId ? (
          <section className="panel start-panel">
            <div className="start-icon">
              <Network size={37} />
            </div>
            <span className="eyebrow">НОВОЕ ИССЛЕДОВАНИЕ</span>
            <h2>Увидеть структуру денежных потоков</h2>
            <p>
              Запустите расчёт подготовленного датасета, чтобы открыть
              приоритетные узлы, связи и признаки ролей.
            </p>
            <Button onClick={startAnalysis} disabled={running}>
              <Play size={16} />
              {running ? "Выполняется расчёт…" : "Запустить анализ"}
            </Button>
            {running && (
              <p role="status">
                Расчёт может занять до 5 минут. Подготовленный результат
                загрузится быстрее.
              </p>
            )}
            {demoAvailable && (
              <a className="demo-link" href="/workspace?demo=1">
                Открыть демонстрацию интерфейса
              </a>
            )}
            <div className="start-note">
              <ShieldCheck size={16} />
              Приоритет помогает аналитической проверке и не устанавливает
              виновность.
            </div>
          </section>
        ) : (
          <>
            {summary.loading && (
              <div
                className="summary-skeleton"
                role="status"
                aria-label="Загружаем сводку"
              >
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} />
                ))}
              </div>
            )}
            {summary.error && (
              <ErrorState message={summary.error} onRetry={retry} />
            )}
            {data && (
              <>
                <SummaryCards data={data} />
                <details className="coverage-details">
                  <summary>Покрытие данных и оборот по self-transfers</summary>
                  <p>
                    Слабых компонент: {data.stats.n_weak_components}.
                    Изолированных узлов: {data.stats.n_isolated_nodes}. Узлов на
                    4-м колене: {data.stats.n_depth4_censored}.
                  </p>
                  <p>
                    Переводы самому себе:{" "}
                    {money(data.stats.self_transfer_turnover_kzt)}. Они учтены в
                    обороте отдельно от структурных метрик.
                  </p>
                </details>
                <div className="coverage-notice">
                  <Info size={16} />
                  <span>
                    <strong>Границы наблюдения:</strong> внутрибанковские
                    переводы от 5 000 ₸, до 4-го колена. Роли — гипотезы для
                    проверки.
                  </span>
                  <a href="/methodology">Подробнее ↗</a>
                </div>
                {data.warnings.length > 0 && (
                  <details className="api-warnings">
                    <summary>
                      Замечания к анализу ({data.warnings.length})
                    </summary>
                    {data.warnings.map((warning, i) => (
                      <p key={i}>{warning.message}</p>
                    ))}
                  </details>
                )}
              </>
            )}
            <div className="analysis-grid">
              <div className="left-column">
                {data ? (
                  <PriorityTable
                    data={data}
                    selectedGid={selectedNode?.gid ?? state.selectedGid}
                    onSelectGid={onSelectGid}
                    onPage={(offset) => act({ type: "page", offset })}
                  />
                ) : (
                  <section className="panel">
                    {summary.error ? (
                      <p className="empty-text">
                        Рейтинг недоступен. Повторите загрузку сводки.
                      </p>
                    ) : (
                      <Loading label="Ожидаем рейтинг узлов…" />
                    )}
                  </section>
                )}
              </div>
              <div className="center-column">
                <section className="panel graph-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        <Network size={17} />
                        Карта связей
                      </h2>
                      <p>Исследуйте направленные денежные потоки</p>
                    </div>
                    <div className="segmented" aria-label="Окраска графа">
                      <button
                        aria-pressed={state.colorBy === "role"}
                        className={state.colorBy === "role" ? "selected" : ""}
                        onClick={() => act({ type: "color", value: "role" })}
                      >
                        По ролям
                      </button>
                      <button
                        aria-pressed={state.colorBy === "cluster"}
                        className={
                          state.colorBy === "cluster" ? "selected" : ""
                        }
                        onClick={() => act({ type: "color", value: "cluster" })}
                      >
                        По кластерам
                      </button>
                    </div>
                  </div>
                  <GraphToolbar
                    state={state}
                    clusters={data?.clusters ?? []}
                    act={act}
                    onSelectGid={onSelectGid}
                  />
                  <div className="graph-stage">
                    {graph.loading && <Loading label="Загружаем связи узла…" />}
                    {graph.error && (
                      <ErrorState message={graph.error} onRetry={retry} />
                    )}
                    {graph.data &&
                      (graph.data.nodes.length ? (
                        <NetworkGraph
                          data={graph.data}
                          colorBy={state.colorBy}
                          onSelectGid={onSelectGid}
                        />
                      ) : (
                        <p className="empty-text">
                          В выбранной области нет узлов.
                        </p>
                      ))}
                  </div>
                  {graph.data?.truncated && (
                    <div className="truncated-notice" role="status">
                      Показано {graph.data.nodes.length} из{" "}
                      {graph.data.matched_nodes} узлов. Выбранный узел сохранён;
                      метрики рассчитаны по полному анализу.
                    </div>
                  )}
                  <GraphLegend colorBy={state.colorBy} data={graph.data} />
                  {graph.data && (
                    <details className="accessible-graph">
                      <summary>Узлы и связи списком</summary>
                      <div className="node-button-list">
                        {graph.data.nodes.map((node) => (
                          <button
                            key={node.gid}
                            onClick={() => onSelectGid(node.gid)}
                          >
                            {node.gid}
                            <span>{roles[node.role].label}</span>
                          </button>
                        ))}
                      </div>
                      <div className="table-scroll">
                        <table>
                          <caption>Все связи показанного подграфа</caption>
                          <thead>
                            <tr>
                              <th>Отправитель</th>
                              <th>Получатель</th>
                              <th>Сумма</th>
                              <th>Переводов</th>
                            </tr>
                          </thead>
                          <tbody>
                            {graph.data.edges.map((e, i) => (
                              <tr key={i}>
                                <td>{e.source}</td>
                                <td>{e.target}</td>
                                <td>{money(e.sum_kzt)}</td>
                                <td>{e.n_tx}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}
                </section>
                {data && <DailyFlowChart data={data.charts.daily_flow} />}
              </div>
              <NodeDrawer node={selectedNode} onSelectGid={onSelectGid}>
                {selectedNode &&
                  (isDemo ? (
                    <div className="analyst-placeholder">
                      <h3>Объяснение по данным</h3>
                      <p>
                        В режиме демонстрации запросы ИИ отключены. Признаки
                        узла показаны выше.
                      </p>
                    </div>
                  ) : (
                    <AnalystPanel
                      key={`${state.analysisId}:${selectedNode.gid}`}
                      analysisId={state.analysisId}
                      focusGids={[selectedNode.gid]}
                      onSelectGid={onSelectGid}
                    />
                  ))}
              </NodeDrawer>
            </div>
            {data && (
              <div className="workspace-footer">
                <span>
                  <ShieldCheck size={14} />
                  {isDemo
                    ? "Синтетический пример"
                    : `Анализ ${state.analysisId}`}{" "}
                  · {data.algorithm_version}
                </span>
                {!isDemo && (
                  <div className="export-links">
                    <Download size={15} />
                    {(
                      [
                        "nodes_roles.csv",
                        "clusters.csv",
                        "top_nodes.csv",
                      ] as const
                    ).map((filename) => (
                      <a
                        key={filename}
                        href={getExportUrl(state.analysisId!, filename)}
                        download
                      >
                        {filename}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
