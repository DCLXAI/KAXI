import type { Lang } from "@/lib/i18n/translations";
import type { TenantContext } from "@/application/tenancy/tenant-context";

export type AiChannel = "web" | "typebot" | "n8n" | "internal";

export type ApplicationPrincipal =
  | { kind: "anonymous-session"; sessionId: string }
  | { kind: "user"; userId: string; role?: string }
  | { kind: "service"; service: string };

/**
 * Transport-neutral context passed to every AI use case.
 *
 * HTTP adapters own cookies, headers, authentication and body validation. The
 * application layer receives only the identity and execution data required to
 * enforce one policy across Web, Typebot and signed n8n calls.
 */
export interface AiRequestContext {
  requestId: string;
  idempotencyKey: string;
  principal: ApplicationPrincipal;
  tenantContext: TenantContext;
  locale: Lang;
  channel: AiChannel;
  traceId: string;
  traceparent?: string;
  clientIp?: string;
  signal?: AbortSignal;
  deadlineAt?: number;
}

export type AiExecutionStage =
  | "preflight"
  | "retrieval"
  | "provider_attempt"
  | "guardrail"
  | "persistence";

/** Infrastructure-supplied tracing/metrics port; application code stays backend-neutral. */
export type ObserveAiExecutionStage = <T>(
  stage: AiExecutionStage,
  run: () => Promise<T>,
) => Promise<T>;

export type ApplicationErrorCode =
  | "invalid_input"
  | "llm_unavailable"
  | "retrieval_unavailable"
  | "cancelled"
  | "deadline_exceeded"
  | "internal_error";

export interface ApplicationError {
  code: ApplicationErrorCode;
  message: string;
  detail?: string;
  retryable: boolean;
}

export type ApplicationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ApplicationError };

export function applicationError(
  code: ApplicationErrorCode,
  message: string,
  options: { detail?: string; retryable?: boolean } = {},
): ApplicationResult<never> {
  return {
    ok: false,
    error: {
      code,
      message,
      detail: options.detail,
      retryable: options.retryable ?? false,
    },
  };
}

export function assertExecutionActive(context: AiRequestContext): void {
  if (context.signal?.aborted) {
    const reason = context.signal.reason;
    throw new ApplicationExecutionError(
      "cancelled",
      reason instanceof Error ? reason.message : "Request was cancelled",
    );
  }
  if (context.deadlineAt !== undefined && Date.now() >= context.deadlineAt) {
    throw new ApplicationExecutionError("deadline_exceeded", "Application deadline exceeded");
  }
}

export class ApplicationExecutionError extends Error {
  constructor(
    public readonly code: Extract<ApplicationErrorCode, "cancelled" | "deadline_exceeded">,
    message: string,
  ) {
    super(message);
    this.name = "ApplicationExecutionError";
  }
}
