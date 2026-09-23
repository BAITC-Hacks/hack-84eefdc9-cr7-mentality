export type AssistantRequest = {
  question: string;
  focus_gids: string[];
};

export type AssistantRequestError =
  | "question_required"
  | "question_too_long"
  | "select_node"
  | "too_many_nodes";

export function buildAssistantRequest(
  questionInput: string,
  selectedGids: string[],
): AssistantRequest | { error: AssistantRequestError } {
  const question = questionInput.trim();
  const focus_gids = [...new Set(selectedGids)];

  if (!question) return { error: "question_required" };
  if (question.length > 1000) return { error: "question_too_long" };
  if (focus_gids.length === 0) return { error: "select_node" };
  if (focus_gids.length > 5) return { error: "too_many_nodes" };

  return { question, focus_gids };
}

export function assistantModeLabel(
  mode: "live" | "fallback",
  fallbackReason: string | null,
) {
  if (mode === "live") return "Ответ ИИ";
  return fallbackReason === "disabled" ? "Правила без ИИ" : "Резервный ответ";
}
