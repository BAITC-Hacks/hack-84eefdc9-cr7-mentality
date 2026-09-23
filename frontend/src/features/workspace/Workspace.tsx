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
import { useI18n } from "@/components/preferences/PreferencesProvider";
import { getExportUrl } from "@/lib/api";
import { demoAvailable, useWorkspace } from "./useWorkspace";
import { clusterIdFromParam } from "./types";
import { AnalysisStart } from "./AnalysisStart";
const NetworkGraph = dynamic(() => import("@/components/graph/NetworkGraph"), {
  ssr: false,
  loading: () => <GraphLoading />,
});

function GraphLoading() {
  const { t } = useI18n("workspace");
  return <Loading label={t("graph.preparing")} />;
}

export function Workspace() {
  const { t, intlLocale } = useI18n("workspace");
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
      <main className={`workspace ${state.analysisId ? "workspace-results" : "workspace-intro"}`}>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span />
              {t("heading.eyebrow")}
            </div>
            <h1>{t("heading.title")}</h1>
            <p>{t("heading.description")}</p>
          </div>
          <div className="heading-actions">
            {data && (
              <span className="period">
                <CalendarDays size={15} />
                {dateLabel(data.period.start, intlLocale)} — {dateLabel(data.period.end, intlLocale)}
              </span>
            )}
            <Button
              variant="outline"
              onClick={state.analysisId ? retry : startAnalysis}
              disabled={running}
            >
              <RotateCw size={15} className={running ? "spin" : ""} />
              {state.analysisId ? t("refresh") : t("connect")}
            </Button>
          </div>
        </div>
        {isDemo && (
          <div className="demo-banner">
            <FlaskConical size={17} />
            <strong>{t("demo.title")}</strong>
            <span>
              {t("demo.description")}
            </span>
            <a href="/workspace">{t("demo.api")}</a>
          </div>
        )}
        {runError && <ErrorState message={runError} onRetry={startAnalysis} />}
        {!state.analysisId ? (
          <AnalysisStart onStart={startAnalysis} running={running} showDemo={demoAvailable} />
        ) : (
          <>
            {summary.loading && (
              <div
                className="summary-skeleton"
                role="status"
                aria-label={t("summary.loading")}
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
                  <summary>{t("coverage.summary")}</summary>
                  <p>
                    {t("coverage.stats", { components: data.stats.n_weak_components, isolated: data.stats.n_isolated_nodes, depth: data.stats.n_depth4_censored })}
                  </p>
                  <p>
                    {t("coverage.selfTransfers", { amount: money(data.stats.self_transfer_turnover_kzt, true, intlLocale) })}
                  </p>
                </details>
                <div className="coverage-notice">
                  <Info size={16} />
                  <span>
                    <strong>{t("coverage.title")}</strong>{" "}{t("coverage.notice")}
                  </span>
                  <a href="/methodology">{t("details")}</a>
                </div>
                {data.warnings.length > 0 && (
                  <details className="api-warnings">
                    <summary>
                      {t("warnings.title", { count: data.warnings.length })}
                    </summary>
                    {data.warnings.map((warning, i) => (
                      <p key={i}>{warning.code === "SYNTHETIC_UI" ? t("demo.warning") : warning.message}</p>
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
                    isDemo={isDemo}
                    selectedGid={selectedNode?.gid ?? state.selectedGid}
                    onSelectGid={onSelectGid}
                    onPage={(offset) => act({ type: "page", offset })}
                  />
                ) : (
                  <section className="panel">
                    {summary.error ? (
                      <p className="empty-text">
                        {t("ranking.unavailable")}
                      </p>
                    ) : (
                      <Loading label={t("ranking.wait")} />
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
                        {t("graph.title")}
                      </h2>
                      <p>{t("graph.description")}</p>
                    </div>
                    <div className="segmented" aria-label={t("graph.color")}>
                      <button
                        aria-pressed={state.colorBy === "role"}
                        className={state.colorBy === "role" ? "selected" : ""}
                        onClick={() => act({ type: "color", value: "role" })}
                      >
                        {t("graph.byRole")}
                      </button>
                      <button
                        aria-pressed={state.colorBy === "cluster"}
                        className={
                          state.colorBy === "cluster" ? "selected" : ""
                        }
                        onClick={() => act({ type: "color", value: "cluster" })}
                      >
                        {t("graph.byCluster")}
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
                    {graph.loading && <Loading label={t("graph.loading")} />}
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
                          {t("graph.empty")}
                        </p>
                      ))}
                  </div>
                  {graph.data?.truncated && (
                    <div className="truncated-notice" role="status">
                      {t("graph.truncated", { shown: graph.data.nodes.length, total: graph.data.matched_nodes })}
                    </div>
                  )}
                  <GraphLegend colorBy={state.colorBy} data={graph.data} />
                  {graph.data && (
                    <details className="accessible-graph">
                      <summary>{t("graph.list")}</summary>
                      <div className="node-button-list">
                        {graph.data.nodes.map((node) => (
                          <button
                            key={node.gid}
                            onClick={() => onSelectGid(node.gid)}
                          >
                            {node.gid}
                            <span>{t(`role.${node.role}`)}</span>
                          </button>
                        ))}
                      </div>
                      <div className="table-scroll">
                        <table>
                          <caption>{t("graph.tableCaption")}</caption>
                          <thead>
                            <tr>
                              <th>{t("sender")}</th>
                              <th>{t("recipient")}</th>
                              <th>{t("amount")}</th>
                              <th>{t("transfers")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {graph.data.edges.map((e, i) => (
                              <tr key={i}>
                                <td>{e.source}</td>
                                <td>{e.target}</td>
                                <td>{money(e.sum_kzt, true, intlLocale)}</td>
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
              <NodeDrawer node={selectedNode} onSelectGid={onSelectGid} isDemo={isDemo}>
                {selectedNode &&
                  (isDemo ? (
                    <div className="analyst-placeholder">
                      <h3>{t("demo.explanation")}</h3>
                      <p>
                        {t("demo.aiDisabled")}
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
                    ? t("demo.example")
                    : t("analysis.id", { id: state.analysisId ?? "" })}{" "}
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
