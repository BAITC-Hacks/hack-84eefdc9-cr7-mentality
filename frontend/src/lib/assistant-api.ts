import type { AnalysisId, AssistantRequest, AssistantResponse } from "../contracts/api";

type ApiErrorBody = {
  error?: {
    message?: string;
  };
};

export async function postAssistant(
  analysisId: AnalysisId,
  request: AssistantRequest,
  signal: AbortSignal,
): Promise<AssistantResponse> {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
  const response = await fetch(
    `${baseUrl}/api/v1/analyses/${encodeURIComponent(analysisId)}/assistant`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new Error(body?.error?.message ?? "Не удалось получить пояснение. Повторите запрос.");
  }

  return (await response.json()) as AssistantResponse;
}
