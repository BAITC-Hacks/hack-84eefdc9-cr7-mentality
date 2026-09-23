import type { AnalysisId, Gid, GraphNode } from "@/contracts/api";
export type WorkspaceState = {
  analysisId: AnalysisId | null;
  selectedGid: Gid | null;
  selectedClusterId: number | null;
  graphHops: 0 | 1 | 2;
  colorBy: "role" | "cluster";
  offset: number;
};
export type AnalystPanelProps = {
  analysisId: AnalysisId;
  focusGids: Gid[];
  onSelectGid: (gid: Gid) => void;
};
export type NodeDrawerProps = {
  node: GraphNode | null;
  onSelectGid: (gid: Gid) => void;
};
export type WorkspaceAction =
  | { type: "analysis"; id: string | null; gid?: string | null }
  | {
      type: "location";
      id: string | null;
      gid: string | null;
      clusterId: number | null;
    }
  | { type: "select"; gid: Gid }
  | { type: "cluster"; id: number | null }
  | { type: "hops"; value: 0 | 1 | 2 }
  | { type: "color"; value: "role" | "cluster" }
  | { type: "page"; offset: number };
export function clusterIdFromParam(value: string | null) {
  if (value === null || !/^(0|[1-9][0-9]*)$/.test(value)) return null;
  const clusterId = Number(value);
  return Number.isSafeInteger(clusterId) ? clusterId : null;
}
export function initialWorkspace(
  analysisId: string | null,
  selectedGid: string | null,
  clusterId: number | null = null,
): WorkspaceState {
  return {
    analysisId,
    selectedGid,
    selectedClusterId: selectedGid === null ? clusterId : null,
    graphHops: 1,
    colorBy: "role",
    offset: 0,
  };
}
export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case "location":
      return state.analysisId !== action.id
        ? initialWorkspace(action.id, action.gid, action.clusterId)
        : {
            ...state,
            selectedGid: action.gid,
            selectedClusterId: action.gid === null ? action.clusterId : null,
          };
    case "analysis":
      return initialWorkspace(action.id, action.gid ?? null);
    case "select":
      return { ...state, selectedGid: action.gid, selectedClusterId: null };
    case "cluster":
      return { ...state, selectedClusterId: action.id, selectedGid: null };
    case "hops":
      return { ...state, graphHops: action.value };
    case "color":
      return { ...state, colorBy: action.value };
    case "page":
      return { ...state, offset: Math.max(0, action.offset) };
  }
}
