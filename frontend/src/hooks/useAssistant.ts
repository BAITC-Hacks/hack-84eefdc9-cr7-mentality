import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/preferences/PreferencesProvider";
import type { AnalysisId, AssistantResponse, Gid } from "../contracts/api";
import { buildAssistantRequest } from "../lib/assistant-request";
import { postAssistant } from "../lib/assistant-api";

export type AssistantValidationError =
  | "question_required"
  | "question_too_long"
  | "select_node"
  | "too_many_nodes";

export function useAssistant(analysisId: AnalysisId) {
  const { t } = useI18n("extras");
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<AssistantValidationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, [analysisId]);

  const ask = useCallback(
    async (question: string, focusGids: Gid[]) => {
      const request = buildAssistantRequest(question, focusGids);
      if ("error" in request) {
        setValidationError(request.error);
        return;
      }

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const requestId = ++requestIdRef.current;
      setResponse(null);
      setValidationError(null);
      setError(null);
      setIsLoading(true);

      try {
        const result = await postAssistant(analysisId, request, controller.signal);
        if (requestId === requestIdRef.current) setResponse(result);
      } catch (requestError) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        setError(
          requestError instanceof Error
            ? requestError.message || "request_failed"
            : "request_failed",
        );
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [analysisId],
  );

  return {
    response,
    error: error ? t("analyst.error") : null,
    errorDetail: error && !["Не удалось получить пояснение. Повторите запрос.", "Failed to fetch", "fetch failed", "request_failed"].includes(error) ? error : null,
    validationMessage: validationError ? t(`analyst.validation.${validationError}`) : null,
    isLoading,
    ask,
    modeLabel: response ? t(response.mode === "live" ? "analyst.mode.live" : response.fallback_reason === "disabled" ? "analyst.mode.rules" : "analyst.mode.fallback") : null,
  };
}
