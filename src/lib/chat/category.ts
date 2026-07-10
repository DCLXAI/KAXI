export const CHAT_CATEGORIES = ["visa", "documents", "school", "cost", "general"] as const;

export type ChatCategory = (typeof CHAT_CATEGORIES)[number];

const CHAT_CATEGORY_SET = new Set<string>(CHAT_CATEGORIES);

export function inferChatCategory(question: string, explicitValue?: unknown): ChatCategory {
  const explicit = typeof explicitValue === "string" ? explicitValue.trim().toLowerCase() : "";
  if (CHAT_CATEGORY_SET.has(explicit) && explicit !== "general") return explicit as ChatCategory;

  const normalized = question.trim().toLowerCase();
  if (/비자|visa|체류|d-?\d|e-?\d|f-?\d|연장|전환|출입국/.test(normalized)) return "visa";
  if (/서류|documents?|입학허가|재정|잔고|여권|사진|결핵|증빙|hồ sơ/.test(normalized)) {
    return "documents";
  }
  if (/학교|대학|입학|어학당|university|school/.test(normalized)) return "school";
  if (/비용|학비|수수료|잔고|재정|cost|tuition/.test(normalized)) return "cost";
  return "general";
}
