import type { AnalysisId, AssistantRequest, AssistantResponse } from "../contracts/api";
import { askAssistant } from "./api";

export async function postAssistant(
  analysisId: AnalysisId,
  request: AssistantRequest,
  signal: AbortSignal,
): Promise<AssistantResponse> {
  return askAssistant(analysisId, request, signal);
}
