import type { AnalysisId, AssistantResponse } from "../contracts/api";
import ru from "../locales/ru/extras.json";
import kk from "../locales/kk/extras.json";
import en from "../locales/en/extras.json";

const messages = { ru, kk, en };

/**
 * Synthetic response for development previews only.
 * This factory is intentionally not used by the production assistant request.
 */
export function createAssistantDevelopmentMock(analysisId: AnalysisId, locale: keyof typeof messages = "ru"): AssistantResponse {
  const copy = messages[locale];
  return {
    analysis_id: analysisId,
    mode: "fallback",
    fallback_reason: "disabled",
    answer: {
      status: "ok",
      summary: copy["mock.summary"],
      findings: [
        {
          title: copy["mock.finding"],
          evidence_ids: ["synthetic:demo-node-01:in-degree"],
        },
      ],
      missing_data: [
        copy["mock.missingSource"],
        copy["mock.missingConclusion"],
      ],
      next_steps: [
        copy["mock.nextStep"],
      ],
    },
    evidence: [
      {
        id: "synthetic:demo-node-01:in-degree",
        gid: "DEMO-NODE-01",
        metric: "in_degree",
        value: "4",
        unit: "counterparties",
        text: copy["mock.evidence"],
      },
    ],
  };
}
