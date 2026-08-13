import type {
  AiRequestContext,
  ObserveAiExecutionStage,
} from "@/application/ai/contracts";
import {
  newTraceContext,
  parseTraceparent,
  requestTraceContext,
} from "@/infrastructure/observability/trace-context";
import { withSpan } from "@/infrastructure/observability/tracing";

export interface AiHttpRequestIdentity {
  requestId: string;
  traceId: string;
  traceparent: string;
}

export type ObserveAiHttpStage = <T>(stage: string, run: () => Promise<T>) => Promise<T>;

function validRequestId(value: string | null): string | null {
  const normalized = value?.trim() || "";
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(normalized) ? normalized : null;
}

export function createAiHttpRequestIdentity(headers: Headers): AiHttpRequestIdentity {
  const requestedId = validRequestId(headers.get("x-request-id"));
  const trace = requestTraceContext(headers);
  return {
    requestId: requestedId ? requestedId.slice(0, 128) : crypto.randomUUID(),
    traceId: trace.traceId,
    traceparent: trace.traceparent,
  };
}

/** Adds correlation data to compatibility error responses without exposing request payloads. */
export async function attachAiResponseIdentity(
  response: Response,
  identity: AiHttpRequestIdentity,
): Promise<Response> {
  const headers = new Headers(response.headers);
  headers.set("x-request-id", identity.requestId);
  headers.set("traceparent", identity.traceparent);
  try {
    const payload = await response.clone().json() as unknown;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      headers.set("content-type", "application/json; charset=utf-8");
      return new Response(JSON.stringify({
        ...payload as Record<string, unknown>,
        requestId: identity.requestId,
        traceId: identity.traceId,
      }), { status: response.status, statusText: response.statusText, headers });
    }
  } catch {
    // Non-JSON responses retain their original body and receive correlation headers only.
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function observeAiHttpRequest<T>(input: {
  identity: AiHttpRequestIdentity;
  operation: string;
  run: (observeStage: ObserveAiHttpStage) => Promise<T>;
}) {
  const parent = parseTraceparent(input.identity.traceparent) || newTraceContext(input.identity.traceId);
  const requestAttributes = {
    requestId: input.identity.requestId,
    channel: "web",
    operation: input.operation,
  };
  return withSpan({
    name: "ai.request",
    parent,
    attributes: requestAttributes,
    run: (requestSpan) => input.run((stage, run) => withSpan({
      name: `ai.${stage}`,
      parent: requestSpan,
      attributes: requestAttributes,
      run: () => run(),
    })),
  });
}

function parentContext(context: AiRequestContext) {
  return parseTraceparent(context.traceparent) || newTraceContext(context.traceId);
}

function attributes(context: AiRequestContext, operation: string) {
  return {
    requestId: context.requestId,
    tenantId: context.tenantContext.tenantId,
    channel: context.channel,
    operation,
  };
}

export function observeAiRequest<T>(input: {
  context: AiRequestContext;
  operation: string;
  run: (observeStage: ObserveAiExecutionStage) => Promise<T>;
}) {
  return withSpan({
    name: "ai.request",
    parent: parentContext(input.context),
    attributes: attributes(input.context, input.operation),
    run: (requestSpan) => input.run((stage, run) => withSpan({
      name: `ai.${stage}`,
      parent: requestSpan,
      attributes: attributes(input.context, input.operation),
      run: () => run(),
    })),
  });
}

export function observeDetachedAiStage<T>(input: {
  context: AiRequestContext;
  operation: string;
  stage: string;
  run: () => Promise<T>;
}) {
  return withSpan({
    name: input.stage,
    parent: parentContext(input.context),
    attributes: attributes(input.context, input.operation),
    run: () => input.run(),
  });
}
