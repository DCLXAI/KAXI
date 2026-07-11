export type TypebotRuntimeTurn = {
  messages?: Array<{
    id?: string;
    content?: { richText?: Array<{ children?: Array<{ text?: string }> }> };
  }>;
  input?: {
    id?: string;
    type?: string;
    items?: Array<{ content?: string }>;
  } | null;
  sessionId?: string;
  typebot?: { publishedAt?: string };
};

export const TYPEBOT_RUNTIME_LOCALES = ["ko", "en", "vi", "mn"] as const;
export type TypebotRuntimeLocale = (typeof TYPEBOT_RUNTIME_LOCALES)[number];

const FAILURE_TEXT = /unauthori[sz]ed|인증되지 않은 요청|서명 검증|gateway secret|internal error|요청을 처리하지 못/i;

export function typebotRuntimeMessageText(turn: TypebotRuntimeTurn) {
  return (turn.messages || [])
    .flatMap((message) => message.content?.richText || [])
    .flatMap((paragraph) => paragraph.children || [])
    .map((child) => child.text || "")
    .join(" ")
    .trim();
}

export function typebotRuntimeMessageTextById(turn: TypebotRuntimeTurn, messageId: string) {
  return typebotRuntimeMessageText({
    messages: (turn.messages || []).filter((message) => message.id === messageId),
  });
}

function hasRuntimeMessage(turn: TypebotRuntimeTurn, messageId: string) {
  return (turn.messages || []).some((message) => message.id === messageId);
}

export function typebotRuntimeBlockId(locale: TypebotRuntimeLocale, name: string) {
  return `block_${locale}_${name}`;
}

export function validatePublishedTypebotStart(
  start: TypebotRuntimeTurn,
  locale: TypebotRuntimeLocale = "ko",
) {
  const errors: string[] = [];
  if (!start.sessionId) errors.push("Typebot startChat did not return a sessionId");
  if (!start.typebot?.publishedAt) errors.push("Typebot does not expose a published version");
  const expectedInput = typebotRuntimeBlockId(locale, "question");
  if (start.input?.id !== expectedInput) {
    errors.push(`unexpected ${locale} initial input: ${start.input?.id || "missing"}`);
  }
  return errors;
}

export function validatePublishedTypebotRuntime(
  start: TypebotRuntimeTurn,
  continuation: TypebotRuntimeTurn,
  options: {
    requireHandoffConsent?: boolean;
    locale?: TypebotRuntimeLocale;
  } = {},
) {
  const locale = options.locale || "ko";
  const errors = validatePublishedTypebotStart(start, locale);

  if (hasRuntimeMessage(continuation, typebotRuntimeBlockId(locale, "persistence_warning"))) {
    errors.push("Typebot chat persistence was not confirmed");
  }
  if (hasRuntimeMessage(continuation, typebotRuntimeBlockId(locale, "handoff_failed"))) {
    errors.push("Typebot handoff persistence was not confirmed");
  }
  if (hasRuntimeMessage(continuation, typebotRuntimeBlockId(locale, "http_failed"))) {
    errors.push("Typebot displayed the recoverable HTTP failure branch");
  }
  if (hasRuntimeMessage(continuation, typebotRuntimeBlockId(locale, "no_context"))) {
    errors.push("Typebot returned no context for the grounded health probe");
  }

  const answerBlockId = typebotRuntimeBlockId(locale, "answer");
  const answerText = typebotRuntimeMessageTextById(continuation, answerBlockId);
  if (!answerText || FAILURE_TEXT.test(answerText)) {
    errors.push("Typebot grounded-answer turn contains a gateway or runtime failure");
  }
  if (!hasRuntimeMessage(continuation, answerBlockId)) {
    errors.push("published Typebot did not render the grounded answer block");
  }

  if (options.requireHandoffConsent) {
    if (!hasRuntimeMessage(continuation, typebotRuntimeBlockId(locale, "privacy_notice"))) {
      errors.push("published Typebot does not show the handoff privacy notice");
    }
    if (continuation.input?.id !== typebotRuntimeBlockId(locale, "privacy_consent")) {
      errors.push(`published Typebot does not stop at explicit consent: ${continuation.input?.id || "missing"}`);
    }
  } else if (continuation.input?.id !== typebotRuntimeBlockId(locale, "followup")) {
    errors.push(`published Typebot did not return to the safe follow-up input: ${continuation.input?.id || "missing"}`);
  }
  return errors;
}

export function validatePublishedTypebotFallbackRuntime(
  start: TypebotRuntimeTurn,
  continuation: TypebotRuntimeTurn,
  options: {
    locale: TypebotRuntimeLocale;
    expected: "no-context" | "http-error";
  },
) {
  const errors = validatePublishedTypebotStart(start, options.locale);
  const answerBlockId = typebotRuntimeBlockId(options.locale, "answer");
  if (hasRuntimeMessage(continuation, answerBlockId)) {
    errors.push("Typebot fallback path leaked the normal answer block");
  }

  if (options.expected === "http-error") {
    if (!hasRuntimeMessage(continuation, typebotRuntimeBlockId(options.locale, "http_failed"))) {
      errors.push("Typebot did not display the localized HTTP failure message");
    }
    if (continuation.input?.id !== typebotRuntimeBlockId(options.locale, "http_failed_choice")) {
      errors.push(`Typebot HTTP failure did not continue to retry choices: ${continuation.input?.id || "missing"}`);
    }
    return errors;
  }

  if (!hasRuntimeMessage(continuation, typebotRuntimeBlockId(options.locale, "no_context"))) {
    errors.push("Typebot did not display the localized no-context message");
  }
  const allowedInputs = new Set([
    typebotRuntimeBlockId(options.locale, "followup"),
    typebotRuntimeBlockId(options.locale, "privacy_consent"),
  ]);
  if (!continuation.input?.id || !allowedInputs.has(continuation.input.id)) {
    errors.push(`Typebot no-context path did not continue safely: ${continuation.input?.id || "missing"}`);
  }
  return errors;
}
