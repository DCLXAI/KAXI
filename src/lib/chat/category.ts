export const CHAT_CATEGORIES = ["visa", "documents", "school", "cost", "general"] as const;

export type ChatCategory = (typeof CHAT_CATEGORIES)[number];

const CHAT_CATEGORY_SET = new Set<string>(CHAT_CATEGORIES);

export function inferChatCategory(question: string, explicitValue?: unknown): ChatCategory {
  const explicit = typeof explicitValue === "string" ? explicitValue.trim().toLowerCase() : "";
  if (CHAT_CATEGORY_SET.has(explicit) && explicit !== "general") return explicit as ChatCategory;

  const normalized = question.normalize("NFKC").trim().toLowerCase();

  // Classify the requested task before the visa/school entity. This keeps
  // "D-2 cost" in cost and "D-4 documents" in documents under strict search.
  if (
    /비용|학비|등록금|수수료|예산|기숙사비|생활비|costs?|tuition|fees?|budget|living\s*expenses?|chi\s*phí|học\s*phí|lệ\s*phí|ngân\s*sách|ký\s*túc\s*xá|зардал|сургалтын\s*төлбөр|хураамж|төсөв|дотуур\s*байр/u.test(normalized)
  ) return "cost";
  if (
    /서류|입학허가|재정\s*증빙|잔고\s*증명|여권|증명서|결핵|documents?|paperwork|certificate|bank\s*statement|proof\s*of\s*funds|passport|hồ\s*sơ|giấy\s*tờ|chứng\s*minh\s*tài\s*chính|số\s*dư|hộ\s*chiếu|бичиг\s*баримт|материал|тодорхойлолт|санхүүгийн\s*нотолгоо|банкны\s*үлдэгдэл|паспорт/u.test(normalized)
  ) return "documents";
  if (
    /인증\s*대학|학교.{0,20}(?:추천|비교|선택)|어느\s*(?:학교|대학)|accredited\s*universit|certified\s*universit|which\s+(?:school|university)|compare.{0,20}(?:school|universit)|recommend.{0,20}(?:school|universit)|trường.{0,20}(?:chứng\s*nhận|nào|so\s*sánh|đề\s*xuất)|đại\s*học.{0,20}(?:chứng\s*nhận|nào)|итгэмжлэгдсэн\s*их\s*сургууль|ямар\s*их\s*сургууль|сургууль.{0,20}(?:харьцуул|санал)/u.test(normalized)
  ) return "school";
  if (
    /비자|체류|연장|전환|출입국|d-?\d|e-?\d|f-?\d|visa|status\s*of\s*stay|permitted\s*stay|stay\s*period|immigration|extension|change\s*of\s*status|thị\s*thực|lưu\s*trú|gia\s*hạn|chuyển\s*đổi|xuất\s*nhập\s*cảnh|виз|оршин\s*суух|хугацаа\s*сунгах|ангилал\s*солих|цагаачлал/u.test(normalized)
  ) return "visa";
  if (
    /학교|대학|입학|어학당|university|college|school|admission|trường|đại\s*học|nhập\s*học|viện\s*ngôn\s*ngữ|сургууль|их\s*сургууль|элсэлт|хэлний\s*бэлтгэл/u.test(normalized)
  ) return "school";
  return "general";
}
