"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  analyze,
  ApiError,
  getDashboard,
  getGraph,
  isAbort,
} from "@/lib/api";
import { canonicalGid } from "@/lib/format";
import {
  clusterIdFromParam,
  initialWorkspace,
  workspaceReducer,
  type WorkspaceAction,
} from "./types";

export const demoAvailable =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ENABLE_DEMO === "true";
function useResource<T>(
  key: string | null,
  loader: (signal: AbortSignal) => Promise<T>,
) {
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: Error;
  } | null>(null);
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    let active = true;
    Promise.resolve()
      .then(() => loader(controller.signal))
      .then((data) => {
        if (active) setResult({ key, data });
      })
      .catch((error) => {
        if (active && !isAbort(error))
          setResult({ key, error: error instanceof Error ? error : new Error("Unknown error") });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [key, loader]);
  const current = result?.key === key ? result : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: key !== null && !current,
  };
}
export function useWorkspace(
  initialAnalysis: string | null,
  initialGid: string | null,
  initialClusterId: number | null,
  demoRequested: boolean,
) {
  const isDemo = demoAvailable && demoRequested;
  const [state, dispatch] = useReducer(
    workspaceReducer,
    initialWorkspace(
      isDemo ? "demo_synthetic" : initialAnalysis,
      initialGid,
      initialClusterId,
    ),
  );
  const urlAnalysis = isDemo ? "demo_synthetic" : initialAnalysis;
  const urlKey = JSON.stringify([urlAnalysis, initialGid, initialClusterId]);
  const [previousUrlKey, setPreviousUrlKey] = useState(urlKey);
  // Next links and native history can both change query params without a remount.
  if (previousUrlKey !== urlKey) {
    setPreviousUrlKey(urlKey);
    if (
      state.analysisId !== urlAnalysis ||
      state.selectedGid !== initialGid ||
      state.selectedClusterId !== initialClusterId
    )
      dispatch({
        type: "location",
        id: urlAnalysis,
        gid: initialGid,
        clusterId: initialClusterId,
      });
  }
  const [revision, reload] = useReducer((n: number) => n + 1, 0);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<Error | null>(null);
  const runController = useRef<AbortController | null>(null);
  const summaryLoader = useCallback(
    async (signal: AbortSignal) => {
      if (process.env.NODE_ENV !== "production" && isDemo) {
        const { demoDashboard } = await import("@/mocks/analytics");
        return demoDashboard(state.offset);
      }
      const result = await getDashboard(
        state.analysisId!,
        { offset: state.offset, limit: 20 },
        signal,
      );
      if (result.analysis_id !== state.analysisId)
        throw new ApiError(
          "CONTRACT_MISMATCH",
          "Ответ относится к другому анализу.",
        );
      return result;
    },
    [isDemo, state.analysisId, state.offset],
  );
  const graphLoader = useCallback(
    async (signal: AbortSignal) => {
      const query = {
        focus_gid: state.selectedGid ?? undefined,
        hops: state.graphHops,
        max_nodes: 250,
        cluster_id: state.selectedClusterId ?? undefined,
      };
      if (process.env.NODE_ENV !== "production" && isDemo) {
        const { demoGraph } = await import("@/mocks/analytics");
        return demoGraph(query);
      }
      return getGraph(state.analysisId!, query, signal);
    },
    [
      isDemo,
      state.analysisId,
      state.selectedGid,
      state.graphHops,
      state.selectedClusterId,
    ],
  );
  const summary = useResource(
    state.analysisId
      ? `s:${state.analysisId}:${state.offset}:${revision}:${isDemo}`
      : null,
    summaryLoader,
  );
  const graph = useResource(
    state.analysisId
      ? `g:${state.analysisId}:${state.selectedGid}:${state.graphHops}:${state.selectedClusterId}:${revision}:${isDemo}`
      : null,
    graphLoader,
  );

  const act = useCallback((action: WorkspaceAction) => {
    dispatch(action);
    if (
      action.type === "analysis" ||
      action.type === "select" ||
      action.type === "cluster"
    ) {
      const url = new URL(window.location.href);
      if (action.type === "analysis") {
        if (action.id) url.searchParams.set("analysis", action.id);
        else url.searchParams.delete("analysis");
        url.searchParams.delete("gid");
        url.searchParams.delete("cluster_id");
        if (action.gid) url.searchParams.set("gid", action.gid);
      } else if (action.type === "select") {
        url.searchParams.set("gid", action.gid);
        url.searchParams.delete("cluster_id");
      } else {
        url.searchParams.delete("gid");
        if (action.id === null) url.searchParams.delete("cluster_id");
        else url.searchParams.set("cluster_id", String(action.id));
      }
      window.history.pushState(null, "", url);
    }
  }, []);
  useEffect(() => {
    const handleBack = () => {
      runController.current?.abort();
      const params = new URLSearchParams(window.location.search);
      dispatch({
        type: "location",
        id: isDemo ? "demo_synthetic" : params.get("analysis"),
        gid: canonicalGid(params.get("gid")),
        clusterId:
          params.get("gid") === null
            ? clusterIdFromParam(params.get("cluster_id"))
            : null,
      });
    };
    window.addEventListener("popstate", handleBack);
    return () => {
      window.removeEventListener("popstate", handleBack);
      runController.current?.abort();
    };
  }, [isDemo]);
  const startAnalysis = useCallback(async () => {
    if (runController.current) return;
    const controller = new AbortController();
    runController.current = controller;
    setRunning(true);
    setRunError(null);
    try {
      const result = await analyze(undefined, controller.signal);
      if (!controller.signal.aborted) {
        act({ type: "analysis", id: result.analysis_id });
        reload();
      }
    } catch (error) {
      if (!isAbort(error)) setRunError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      if (runController.current === controller) {
        runController.current = null;
        setRunning(false);
      }
    }
  }, [act]);
  const onSelectGid = useCallback(
    (gid: string) => act({ type: "select", gid }),
    [act],
  );
  const selectedNode =
    graph.data?.nodes.find(
      (n) => n.gid === (state.selectedGid ?? graph.data?.focus_gid),
    ) ?? null;
  return {
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
    retry: reload,
  };
}
