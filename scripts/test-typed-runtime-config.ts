import assert from "node:assert/strict";
import {
  applicationAiRuntimeConfigIssues,
  assertProductionApplicationAiRuntimeConfig,
  getApplicationAiRuntimeConfig,
} from "../src/infrastructure/config/application-ai-config";
import {
  assertProductionRuntimeEnvironment,
  RUNTIME_SECRET_KEYS,
  runtimeEnvironmentIssues,
} from "../src/infrastructure/config/runtime-environment";
import {
  DEPLOYMENT_BUILD_KEYS,
  deploymentBuildEnvironment,
  PUBLIC_BUILD_KEYS,
  publicBuildEnvironment,
} from "../src/infrastructure/config/build-environment";

const config = getApplicationAiRuntimeConfig({
  AI_AGENT_RATE_LIMIT: "9",
  AI_CONSULT_DAILY_QUOTA: "41",
  AI_UNIFIED_REQUEST_DEADLINE_MS: "32000",
});
assert.equal(config.agentRateLimit, 9);
assert.equal(config.expertDailyQuota, 41);
assert.equal(config.unifiedRequestDeadlineMs, 32_000);

assert.deepEqual(applicationAiRuntimeConfigIssues({
  AI_AGENT_RATE_LIMIT: "0",
  AI_CONSULT_MAX_CHARS: "many",
  AI_AGENT_TIMEOUT_MS: "15000",
}), ["AI_AGENT_RATE_LIMIT", "AI_CONSULT_MAX_CHARS"]);

assert.throws(
  () => assertProductionApplicationAiRuntimeConfig({
    NODE_ENV: "production",
    AI_AGENT_RATE_LIMIT: "invalid",
  }),
  /Invalid AI runtime configuration: AI_AGENT_RATE_LIMIT/,
);
assert.doesNotThrow(() => assertProductionApplicationAiRuntimeConfig({
  NODE_ENV: "development",
  AI_AGENT_RATE_LIMIT: "invalid",
}));

assert.deepEqual(runtimeEnvironmentIssues({
  WORKER_POLL_MS: "0",
  SMTP_SECURE: "sometimes",
  TYPEBOT_RAG_RATE_LIMIT: "20",
}), [
  { key: "WORKER_POLL_MS", code: "invalid_positive_integer" },
  { key: "SMTP_SECURE", code: "invalid_boolean" },
]);
assert.throws(
  () => assertProductionRuntimeEnvironment({
    VERCEL_ENV: "production",
    WORKER_POLL_MS: "not-a-number",
  }),
  /Invalid server runtime configuration: WORKER_POLL_MS/,
);

assert.equal(publicBuildEnvironment({ NEXT_PUBLIC_APP_URL: "https://example.test" }).NEXT_PUBLIC_APP_URL, "https://example.test");
assert.equal(deploymentBuildEnvironment({ VERCEL_URL: "preview.example.test" }).VERCEL_URL, "preview.example.test");
assert.equal(RUNTIME_SECRET_KEYS.some((key) => key.startsWith("NEXT_PUBLIC_")), false);
assert.equal(new Set(RUNTIME_SECRET_KEYS).size, RUNTIME_SECRET_KEYS.length);
assert.equal(PUBLIC_BUILD_KEYS.every((key) => key.startsWith("NEXT_PUBLIC_")), true);
assert.equal(PUBLIC_BUILD_KEYS.some((key) => RUNTIME_SECRET_KEYS.includes(key as never)), false);
assert.equal(DEPLOYMENT_BUILD_KEYS.some((key) => RUNTIME_SECRET_KEYS.includes(key as never)), false);

console.log("PASS typed runtime config: public/build/secret classification, shared parsing, readiness diagnostics and production startup rejection");
