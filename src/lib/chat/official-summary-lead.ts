import { QUESTION_INTENTS } from "@/lib/chat/retrieval-tuning";

type LeadLang = "ko" | "vi" | "mn" | "en";

const LEAD_HEADING: Record<LeadLang, string> = {
  ko: "바로 확인할 핵심",
  vi: "Điểm chính cần xem ngay",
  mn: "Шууд шалгах гол зүйл",
  en: "Key points first",
};

function splitSentences(content: string): string[] {
  return content
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。])\s+|(?<=[.。])(?=[가-힣])/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 12 && sentence.length <= 240);
}

// When the LLM has already failed, the fallback answer opens with the
// sentences that actually address the question — selected with the SAME
// intent evidence patterns the reranker uses — instead of opening with
// document summaries the user has to mine. Deterministic; returns null
// whenever nothing clearly qualifies so the existing layout stays intact.
export function buildOfficialSummaryLead(input: {
  question: string;
  docContents: Array<{ content: string; index: number }>;
  lang: LeadLang;
}): string | null {
  const intents = QUESTION_INTENTS.filter((intent) => intent.questionPattern.test(input.question));
  if (intents.length === 0) return null;

  const bullets: string[] = [];
  for (const doc of input.docContents.slice(0, 3)) {
    for (const sentence of splitSentences(doc.content)) {
      if (bullets.length >= 3) break;
      if (!intents.some((intent) => intent.evidencePattern.test(sentence))) continue;
      bullets.push(`- ${sentence} [${doc.index}]`);
    }
    if (bullets.length >= 3) break;
  }
  if (bullets.length === 0) return null;

  return `**${LEAD_HEADING[input.lang]}**\n\n${bullets.join("\n")}`;
}
