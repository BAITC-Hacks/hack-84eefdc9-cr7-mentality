import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisId, AssistantResponse, Gid } from "../contracts/api";
import { assistantModeLabel, buildAssistantRequest } from "../lib/assistant-request";
import { postAssistant } from "../lib/assistant-api";

export type AssistantValidationError =
  | "question_required"
  | "question_too_long"
  | "select_node"
  | "too_many_nodes";

const validationMessages: Record<AssistantValidationError, string> = {
  question_required: "Введите вопрос.",
  question_too_long: "Вопрос не должен превышать 1 000 символов.",
  select_node: "Выберите узел в графе, чтобы задать вопрос.",
  too_many_nodes: "Выберите не более пяти узлов.",
};

export function useAssistant(analysisId: AnalysisId) {
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
            ? requestError.message
            : "Не удалось получить пояснение. Повторите запрос.",
        );
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [analysisId],
  );

  return {
    response,
    error,
    validationMessage: validationError ? validationMessages[validationError] : null,
    isLoading,
    ask,
    modeLabel: response ? assistantModeLabel(response.mode, response.fallback_reason) : null,
  };
}
