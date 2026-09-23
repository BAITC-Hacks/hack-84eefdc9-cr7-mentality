"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownToLine, ArrowRight, CalendarDays, ChevronDown, CircleHelp, Network, Play, RotateCw, Sparkles } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PriorityTable } from "@/components/analytics/PriorityTable";
import { DailyFlowChart } from "@/components/analytics/DailyFlowChart";
import { NodeDrawer } from "@/components/analytics/NodeDrawer";
import AnalystPanel from "@/components/ai/AnalystPanel";
import { GraphToolbar } from "@/components/graph/GraphToolbar";
import { GraphLegend } from "@/components/graph/GraphLegend";
import { Button } from "@/components/ui/button";
import { ErrorState, Loading } from "@/components/ui/Status";
import { canonicalGid, dateLabel, integer, money } from "@/lib/format";
import { roles } from "@/lib/role-colors";
import { getExportUrl } from "@/lib/api";
import { demoAvailable, useWorkspace } from "./useWorkspace";
import { clusterIdFromParam } from "./types";

const NetworkGraph = dynamic(() => import("@/components/graph/NetworkGraph"), { ssr: false, loading: () => <Loading label="Подготавливаем граф…" /> });

export function Workspace() {
  const params = useSearchParams();
  const rawGid = params.get("gid");
  const rawClusterId = params.get("cluster_id");
  const selectedGid = canonicalGid(rawGid);
  const selectedClusterId = selectedGid === null ? clusterIdFromParam(rawClusterId) : null;
  useEffect(() => {
    const url = new URL(window.location.href);
    if (rawGid !== null) {
      if (selectedGid === null) url.searchParams.delete("gid");
      else url.searchParams.set("gid", selectedGid);
    }
    if (selectedGid !== null || (rawClusterId !== null && selectedClusterId === null)) url.searchParams.delete("cluster_id");
    else if (selectedClusterId !== null) url.searchParams.set("cluster_id", String(selectedClusterId));
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }, [rawGid, rawClusterId, selectedGid, selectedClusterId]);
  const { state, act, summary, graph, selectedNode, isDemo, running, runError, startAnalysis, onSelectGid, retry } = useWorkspace(params.get("analysis"), selectedGid, selectedClusterId, params.get("demo") === "1");
  const data = summary.data;

  return <AppShell analysisId={state.analysisId} demo={isDemo}>
    <main className="research-main" id="research-main">
      <header className="research-heading">
        <div><h1>Исследование связей</h1></div>
        {data && <dl className="research-totals">
          <div><dt>узлов</dt><dd>{integer(data.stats.n_nodes)}</dd></div>
          <div><dt>связей</dt><dd>{integer(data.stats.n_edges)}</dd></div>
          <div><dt>переводов</dt><dd>{integer(data.stats.n_transactions)}</dd></div>
        </dl>}
      </header>
      <div className="research-context">
        <span><CalendarDays size={14} />{data ? `${dateLabel(data.period.start)} — ${dateLabel(data.period.end)} ${data.period.end.slice(0, 4)}` : "Подготовленный набор данных"}</span>
        <div>{isDemo && <span className="synthetic-label">Синтетические данные</span>}<button type="button" className="context-refresh" onClick={state.analysisId ? retry : startAnalysis} disabled={running} title="Обновить анализ" aria-label="Обновить анализ"><RotateCw size={15} className={running ? "spin" : ""} /></button></div>
      </div>
      {runError && <ErrorState message={runError} onRetry={startAnalysis} />}
      {!state.analysisId ? <section className="research-start">
        <Network size={48} strokeWidth={1.2} /><h2>Новое исследование</h2><p>Подготовленный набор · июль 2026</p>
        <Button onClick={startAnalysis} disabled={running}><Play size={16} />{running ? "Выполняется расчёт…" : "Запустить анализ"}</Button>
        {running && <p role="status">Расчёт может занять до 5 минут.</p>}
        {demoAvailable && <a href="/workspace?demo=1">Открыть демонстрацию <ArrowRight size={15} /></a>}
      </section> : <>
        {summary.error && <ErrorState message={summary.error} onRetry={retry} />}
        {summary.loading && <div className="research-loading"><Loading label="Загружаем сводку…" /></div>}
        <div className="research-grid">
          <div className="research-left">
            <section className="research-graph" aria-label="Исследование направленного графа">
              <GraphToolbar state={state} clusters={data?.clusters ?? []} act={act} onSelectGid={onSelectGid} />
              <div className="graph-stage" aria-busy={graph.loading}>
                {graph.loading && <Loading label="Загружаем связи узла…" />}
                {graph.error && <ErrorState message={graph.error} onRetry={retry} />}
                {graph.data && (graph.data.nodes.length ? <NetworkGraph data={graph.data} colorBy={state.colorBy} onSelectGid={onSelectGid} /> : <p className="empty-text">В выбранной области нет узлов.</p>)}
              </div>
              {graph.data?.truncated && <p className="research-truncated" role="status">Показано {graph.data.nodes.length} из {graph.data.matched_nodes} узлов. Метрики рассчитаны по полному анализу.</p>}
              <GraphLegend colorBy={state.colorBy} data={graph.data} />
              <details className="research-queue" id="priority-queue">
                <summary><ChevronDown size={17} /><strong>Приоритет проверки</strong><span>{data ? integer(data.ranking.total) : ""} узлов</span></summary>
                {data && <PriorityTable data={data} selectedGid={selectedNode?.gid ?? state.selectedGid} onSelectGid={onSelectGid} onPage={(offset) => act({ type: "page", offset })} />}
              </details>
              {graph.data && <details className="research-accessible"><summary>Узлы и связи списком <span>{graph.data.nodes.length} / {graph.data.edges.length}</span></summary>
                <div className="node-button-list">{graph.data.nodes.map((node) => <button key={node.gid} onClick={() => onSelectGid(node.gid)} aria-pressed={node.gid === selectedNode?.gid}>{node.gid}<span>{roles[node.role].label}</span></button>)}</div>
                <div className="table-scroll" tabIndex={0} aria-label="Связи подграфа"><table><caption>Все связи показанного подграфа</caption><thead><tr><th>Отправитель</th><th>Получатель</th><th>Сумма</th><th>Переводов</th></tr></thead><tbody>{graph.data.edges.map((edge) => <tr key={edge.id}><td>{edge.source}</td><td>{edge.target}</td><td>{money(edge.sum_kzt)}</td><td>{edge.n_tx}</td></tr>)}</tbody></table></div>
              </details>}
            </section>
          </div>
          <div className="research-right">
            <NodeDrawer node={selectedNode} onSelectGid={onSelectGid}>
              {selectedNode && <details className="research-assistant" key={`${state.analysisId}:${selectedNode.gid}`}>
                <summary><span><strong><Sparkles size={16} />AI-аналитик</strong><span>Пояснить признаки узла</span></span><span className="assistant-arrow"><ArrowRight size={22} /></span></summary>
                <div className="assistant-content">{isDemo ? <p>Синтетический пример. AI доступен после запуска анализа подготовленного набора.</p> : <AnalystPanel analysisId={state.analysisId} focusGids={[selectedNode.gid]} onSelectGid={onSelectGid} />}</div>
              </details>}
            </NodeDrawer>
            <div className="research-coverage"><CircleHelp size={16} /><p>Глубина: до 4 колен<br />Переводы от 5 000 ₸<br />Эвристики для ручной проверки</p><a href="/methodology" title="Методология и ограничения" aria-label="Методология и ограничения"><ArrowRight size={16} /></a></div>
          </div>
        </div>
        {data && <section className="research-secondary" aria-label="Динамика и покрытие данных">
          <DailyFlowChart data={data.charts.daily_flow} />
          <div className="research-data-note"><h2>Покрытие исследования</h2><dl><div><dt>Кластеры</dt><dd>{data.stats.n_clusters}</dd></div><div><dt>Слабые компоненты</dt><dd>{data.stats.n_weak_components}</dd></div><div><dt>Изолированные узлы</dt><dd>{data.stats.n_isolated_nodes}</dd></div><div><dt>Узлы на 4-м колене</dt><dd>{data.stats.n_depth4_censored}</dd></div></dl><p>Внутрибанковские переводы. Достижимость не подтверждает перемещение одних и тех же средств.</p><details><summary>Оборот и замечания</summary><p>Наблюдаемый оборот: {money(data.stats.graph_turnover_kzt)}. Переводы самому себе: {money(data.stats.self_transfer_turnover_kzt)}.</p>{data.warnings.map((warning, index) => <p key={index}>{warning.message}</p>)}</details></div>
        </section>}
        <footer className="research-footer"><span>{isDemo ? "Синтетический пример" : `Анализ ${state.analysisId}`} · rules-v1</span>{!isDemo && <a href={getExportUrl(state.analysisId, "nodes_roles.csv")} download><ArrowDownToLine size={15} />Выгрузить узлы</a>}</footer>
      </>}
    </main>
  </AppShell>;
}
