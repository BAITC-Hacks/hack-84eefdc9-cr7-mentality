import type { AnalysisId, AnalyzeResponse, DashboardResponse } from "../contracts/api";

type ApiErrorBody = {
  error?: {
    message?: string;
  };
};

type ExportFilename = DashboardResponse["exports"][number]["filename"];

const exportFilenames: ExportFilename[] = [
  "nodes_roles.csv",
  "clusters.csv",
  "top_nodes.csv",
];

function apiUrl(path: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
  return `${baseUrl}${path}`;
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new Error(body?.error?.message ?? "Сервис временно недоступен. Попробуйте ещё раз.");
  }
  return (await response.json()) as T;
}

export async function startAnalysis(signal: AbortSignal): Promise<AnalyzeResponse> {
  const response = await fetch(apiUrl("/api/v1/analyze"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataset_id: "hackalem-july-2026" }),
    signal,
  });
  return readResponse<AnalyzeResponse>(response);
}

export async function fetchDashboard(
  analysisId: AnalysisId,
  signal?: AbortSignal,
): Promise<DashboardResponse> {
  const response = await fetch(
    apiUrl(`/api/v1/analyses/${encodeURIComponent(analysisId)}?offset=0&limit=20`),
    { method: "GET", signal },
  );
  return readResponse<DashboardResponse>(response);
}

export function exportDownloadPath(analysisId: AnalysisId, filename: string) {
  if (!exportFilenames.includes(filename as ExportFilename)) return null;
  return `/api/v1/analyses/${encodeURIComponent(analysisId)}/exports/${filename}`;
}

export function exportDownloadUrl(analysisId: AnalysisId, filename: string) {
  const path = exportDownloadPath(analysisId, filename);
  return path ? apiUrl(path) : null;
}

