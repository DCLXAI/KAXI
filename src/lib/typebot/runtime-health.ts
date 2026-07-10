export type TypebotRuntimeTurn = {
  messages?: Array<{
    id?: string;
    content?: { richText?: Array<{ children?: Array<{ text?: string }> }> };
  }>;
  input?: { id?: string; type?: string } | null;
  sessionId?: string;
  typebot?: { publishedAt?: string };
};

const FAILURE_TEXT = /unauthori[sz]ed|인증되지 않은 요청|서명 검증|gateway secret|internal error|요청을 처리하지 못/i;

export function typebotRuntimeMessageText(turn: TypebotRuntimeTurn) {
  return (turn.messages || [])
    .flatMap((message) => message.content?.richText || [])
    .flatMap((paragraph) => paragraph.children || [])
    .map((child) => child.text || "")
    .join(" ")
    .trim();
}

export function validatePublishedTypebotRuntime(
  start: TypebotRuntimeTurn,
  continuation: TypebotRuntimeTurn,
  options: { requireHandoffConsent?: boolean } = {},
) {
  const errors: string[] = [];
  if (!start.sessionId) errors.push("Typebot startChat did not return a sessionId");
  if (!start.typebot?.publishedAt) errors.push("Typebot does not expose a published version");
  if (start.input?.id !== "block_question") errors.push(`unexpected initial input: ${start.input?.id || "missing"}`);

  const text = typebotRuntimeMessageText(continuation);
  if (!text || FAILURE_TEXT.test(text)) errors.push("Typebot grounded-answer turn contains a gateway or runtime failure");
  if (!(continuation.messages || []).some((message) => message.id === "block_answer")) {
    errors.push("published Typebot did not render the grounded answer block");
  }

  if (options.requireHandoffConsent) {
    if (!(continuation.messages || []).some((message) => message.id === "block_privacy_notice")) {
      errors.push("published Typebot does not show the handoff privacy notice");
    }
    if (continuation.input?.id !== "block_privacy_consent") {
      errors.push(`published Typebot does not stop at explicit consent: ${continuation.input?.id || "missing"}`);
    }
  } else if (continuation.input?.id !== "block_followup") {
    errors.push(`published Typebot did not return to the safe follow-up input: ${continuation.input?.id || "missing"}`);
  }
  return errors;
}
