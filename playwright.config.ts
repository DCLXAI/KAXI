import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";

// `test:e2e` resolves to node, not bun, so .env.local is not auto-loaded here —
// only the two keys a worktree needs to stay isolated are read, and anything
// already in the environment wins so CI's explicit values still take priority.
function fromEnvLocal(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  let contents: string;
  try {
    contents = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  } catch {
    return undefined; // absent in CI
  }
  let found: string | undefined;
  for (const line of contents.split("\n")) {
    const match = line.match(new RegExp(`^${key}\\s*=\\s*(.*)$`));
    if (match) found = match[1].trim().replace(/^["']|["']$/g, ""); // last wins
  }
  return found || undefined;
}

const e2eDatabaseUrl =
  fromEnvLocal("TEST_DATABASE_URL") || "postgresql://sunsu@localhost:5433/kaxi_phase0_test?schema=public";

// Worktrees set E2E_PORT so parallel sessions don't share a dev server. Its
// presence also forces a fresh server: reusing one started by another worktree
// would test that worktree's code and still report green.
const e2ePort = fromEnvLocal("E2E_PORT") || "3100";
const e2eUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: e2eUrl,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `bun run scripts/prepare-e2e-db.ts && bunx next dev -p ${e2ePort}`,
    url: e2eUrl,
    reuseExistingServer: !process.env.CI && e2ePort === "3100",
    timeout: 120_000,
    env: {
      DATABASE_URL: e2eDatabaseUrl,
      TEST_DATABASE_URL: e2eDatabaseUrl,
      ADMIN_API_KEY: "e2e-admin-key",
      CHAT_SESSION_SIGNING_SECRET: "e2e-chat-session-signing-secret-with-more-than-thirty-two-characters",
      // Dummy Supabase public config so the proxy-layer auth middleware is
      // constructible in CI (no .env.local there). Unauthenticated requests
      // never hit the network: with no session cookie, getUser() resolves a
      // null user locally, which is exactly the redirect path under test.
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-supabase-anon-key",
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
