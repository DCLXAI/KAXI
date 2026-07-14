export const PRODUCT_EVENT_NAMES = [
  "page_view",
  "diagnosis_viewed",
  "diagnosis_card_selected",
  "diagnosis_completed",
  "chatbot_opened",
  "chatbot_question_sent",
  "chatbot_answer_succeeded",
  "chatbot_answer_failed",
  "chatbot_no_context",
  "chatbot_retry",
  "citation_clicked",
  "handoff_created",
  "handoff_assigned",
  "handoff_response_completed",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];
export type ProductLocale = "ko" | "en" | "vi" | "mn";

export const PRODUCT_EVENT_NAME_SET = new Set<string>(PRODUCT_EVENT_NAMES);

export function productLocale(value: unknown): ProductLocale {
  return value === "en" || value === "vi" || value === "mn" ? value : "ko";
}
