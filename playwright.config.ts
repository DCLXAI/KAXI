import { defineConfig, devices } from "@playwright/test";
import { join } from "path";

const e2eDb = join(process.cwd(), "db", "e2e.db");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "bun run scripts/prepare-e2e-db.ts && bunx next dev -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: `file:${e2eDb}`,
      ADMIN_API_KEY: "e2e-admin-key",
      NEXTAUTH_SECRET: "e2e-nextauth-secret",
      AGENT_BACKEND: "tool-fallback",
      ZAI_ENABLED: "false",
      AI_AGENT_RATE_LIMIT: "0",
      AI_AGENT_DAILY_QUOTA: "0",
      AI_AGENT_LOGGING_ENABLED: "true",
      AI_AGENT_LEDGER_ENABLED: "true",
      AI_EMBEDDING_INIT_TIMEOUT_MS: "100",
      TRANSFORMERS_ALLOW_REMOTE: "false",
      VECTOR_CACHE_FILE: join(process.cwd(), "data", "vector-store", "embeddings-cache.json"),
      MODEL_CACHE_DIR: join(process.cwd(), "data", "model-cache"),
    },
  },
});
