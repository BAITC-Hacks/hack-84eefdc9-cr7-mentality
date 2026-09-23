import type { AnalysisId, AssistantResponse } from "../contracts/api";

/**
 * Synthetic response for development previews only.
 * This factory is intentionally not used by the production assistant request.
 */
export function createAssistantDevelopmentMock(analysisId: AnalysisId): AssistantResponse {
  return {
    analysis_id: analysisId,
    mode: "fallback",
    fallback_reason: "disabled",
    answer: {
      status: "ok",
      summary:
        "СИНТЕТИЧЕСКИЙ ПРИМЕР ДЛЯ DEV/PREVIEW. Все значения вымышлены и не описывают реальные счета или переводы.",
      findings: [
        {
          title: "Демо-сценарий: повторяющиеся входящие связи",
          evidence_ids: ["synthetic:demo-node-01:in-degree"],
        },
      ],
      missing_data: [
        "Ответ создан локальной заглушкой и не основан на данных анализа.",
        "Демонстрационный признак не является выводом о виновности или нарушении.",
      ],
      next_steps: [
        "Для реальной проверки используйте подтвержденные данные и предусмотренную методологию.",
      ],
    },
    evidence: [
      {
        id: "synthetic:demo-node-01:in-degree",
        gid: "DEMO-NODE-01",
        metric: "in_degree",
        value: "4",
        unit: "counterparties",
        text:
          "Вымышленное демонстрационное значение: четыре входящие связи. Это не сведения о реальном узле.",
      },
    ],
  };
}
