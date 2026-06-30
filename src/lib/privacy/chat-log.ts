import { parsePositiveInt } from "@/lib/api/security";
import {
  canPersistPiiValue,
  preparePiiField,
  readPiiField,
  redactSensitiveText,
  retentionUntil,
} from "@/lib/privacy/pii";

export function canPersistChatQuestion(question: string): boolean {
  return canPersistPiiValue(question);
}

export function protectChatQuestion(question: string) {
  const protectedQuestion = preparePiiField(question, { kind: "text", maxPlainLength: 400 });
  return {
    question: protectedQuestion.plaintext || "[empty]",
    questionCiphertext: protectedQuestion.ciphertext,
    questionHash: protectedQuestion.hash,
    questionRedacted: protectedQuestion.redacted,
    retentionUntil: retentionUntil(parsePositiveInt(process.env.PRIVACY_CHATLOG_RETENTION_DAYS, 90)),
  };
}

export function readChatQuestion(log: {
  question: string;
  questionCiphertext?: string | null;
}): string {
  return readPiiField(log.question, log.questionCiphertext) || log.question;
}

export function safeChatQuestionForAnalytics(log: {
  question: string;
  questionCiphertext?: string | null;
}): string {
  return redactSensitiveText(readChatQuestion(log));
}
