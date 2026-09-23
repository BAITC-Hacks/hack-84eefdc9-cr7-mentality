import { z } from "zod";
import {
  analyzeResponseSchema,
  dashboardSchema,
  graphResponseSchema,
  assistantResponseSchema,
  exportFilenameSchema,
} from "@/lib/api-schema";
import type {
  AnalyzeRequest,
  AssistantRequest,
  DashboardQuery,
  GraphQuery,
  ExportLink,
} from "@/contracts/api";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
    public requestId?: string,
    public retryable = false,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000")
    .replace(/\/+$/, "")
    .replace(/\/api\/v1$/, "");
}
export function endpoint(path: string) {
  return `${apiBaseUrl()}/api/v1${path}`;
}
const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    request_id: z.string().optional(),
    retryable: z.boolean().optional(),
  }),
});

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
  timeoutMs = 30_000,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (init.signal?.aborted) controller.abort();
  init.signal?.addEventListener("abort", cancel, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetch(endpoint(path), {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const parsed = errorSchema.safeParse(body);
      if (parsed.success) {
        const e = parsed.data.error;
        throw new ApiError(
          e.code,
          e.message,
          response.status,
          e.request_id,
          e.retryable,
        );
      }
      throw new ApiError(
        "HTTP_ERROR",
        `Сервер вернул ошибку ${response.status}. Попробуйте ещё раз.`,
        response.status,
      );
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      throw new ApiError(
        "CONTRACT_MISMATCH",
        "Формат ответа API отличается от контракта фронтенда. Нужна сверка схемы с бэкендом.",
        response.status,
      );
    return parsed.data;
  } catch (error) {
    if (timedOut)
      throw new ApiError(
        "TIMEOUT",
        "Сервер не ответил вовремя. Повторите запрос.",
        0,
        undefined,
        true,
      );
    if (controller.signal.aborted)
      throw new DOMException("Запрос отменён", "AbortError");
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "NETWORK_ERROR",
      "Не удалось подключиться к API. Проверьте адрес бэкенда и CORS.",
      0,
      undefined,
      true,
    );
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", cancel);
  }
}

export function analyze(
  body: AnalyzeRequest = { dataset_id: "hackalem-july-2026" },
  signal?: AbortSignal,
) {
  return request(
    "/analyze",
    analyzeResponseSchema,
    { method: "POST", body: JSON.stringify(body), signal },
    300_000,
  );
}
export function getDashboard(
  analysisId: string,
  query: DashboardQuery = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    offset: String(query.offset ?? 0),
    limit: String(query.limit ?? 20),
  });
  return request(
    `/analyses/${encodeURIComponent(analysisId)}?${params}`,
    dashboardSchema,
    { signal },
  );
}
export async function getGraph(
  analysisId: string,
  query: GraphQuery = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.set(key, String(value));
  });
  const result = await request(
    `/analyses/${encodeURIComponent(analysisId)}/graph?${params}`,
    graphResponseSchema,
    { signal },
  );
  const ids = new Set(result.nodes.map((node) => node.gid));
  if (
    result.analysis_id !== analysisId ||
    ids.size !== result.nodes.length ||
    result.edges.some(
      (edge) => !ids.has(edge.source) || !ids.has(edge.target),
    ) ||
    (result.focus_gid !== null && !ids.has(result.focus_gid)) ||
    (query.focus_gid != null && result.focus_gid !== query.focus_gid)
  ) {
    throw new ApiError(
      "CONTRACT_MISMATCH",
      "API вернул несогласованный граф. Проверьте идентификатор анализа, выбранный узел и связи.",
    );
  }
  return result;
}
export function askAssistant(
  analysisId: string,
  body: AssistantRequest,
  signal?: AbortSignal,
) {
  return request(
    `/analyses/${encodeURIComponent(analysisId)}/assistant`,
    assistantResponseSchema,
    { method: "POST", body: JSON.stringify(body), signal },
    25_000,
  );
}
export function getExportUrl(
  analysisId: string,
  filename: ExportLink["filename"],
) {
  exportFilenameSchema.parse(filename);
  return endpoint(
    `/analyses/${encodeURIComponent(analysisId)}/exports/${filename}`,
  );
}
export const api = {
  analyze,
  getDashboard,
  getGraph,
  askAssistant,
  getExportUrl,
};
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Неизвестная ошибка. Попробуйте ещё раз.";
}
export function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
