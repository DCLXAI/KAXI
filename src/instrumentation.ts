import {
  assertProductionRuntimeEnvironment,
  runtimeEnvironment,
} from "@/infrastructure/config/runtime-environment";
import type { Instrumentation } from "next";

export async function register() {
  if (runtimeEnvironment().NEXT_RUNTIME === "nodejs") {
    assertProductionRuntimeEnvironment(runtimeEnvironment());
    const [{ registerTraceExporter }, { exportSpanToPostgres }, { assertProductionApplicationAiRuntimeConfig }] = await Promise.all([
      import("@/infrastructure/observability/tracing"),
      import("@/infrastructure/observability/postgres-trace-exporter"),
      import("@/infrastructure/config/application-ai-config"),
    ]);
    assertProductionApplicationAiRuntimeConfig(runtimeEnvironment());
    registerTraceExporter(exportSpanToPostgres);
    const { structuredLog } = await import("@/infrastructure/observability/structured-log");
    structuredLog({
      level: "info",
      event: "runtime.instrumentation.registered",
      service: "kaxi-web",
      fields: { runtime: "nodejs" },
    });
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, _request, context) => {
  if (runtimeEnvironment().NEXT_RUNTIME !== "nodejs") return;
  const { structuredLog } = await import("@/infrastructure/observability/structured-log");
  structuredLog({
    level: "error",
    event: "server.request.unhandled_error",
    service: "kaxi-web",
    fields: {
      error,
      routePath: context.routePath,
      routeType: context.routeType,
      routerKind: context.routerKind,
    },
  });
};
