// Pre-deploy gate: stop a release early when the RAG serving projection has drifted.
//
// Production /api/readiness returns 503 whenever the required `rag.openai_pgvector`
// check is not ok, and that check is satisfied only when servingProjection.cutoverReady
// is true (src/lib/ops/readiness.ts). Today the deploy workflow only learns that ~10
// minutes in, at "Verify production canary end to end" — after a full Vercel build, a
// production migration, and a canary deployment have already been paid for, and with
// `concurrency: kaxi-production` holding the next release attempt behind it.
//
// The projection is shared Supabase state, so drift that already exists is visible
// before any of that work starts. This gate reads it and turns an opaque ten-minute
// "readiness returned HTTP 503" into a sub-30-second failure that names the fix.
//
// WHY HTTP AND NOT A DIRECT SUPABASE READ: SUPABASE_SERVICE_ROLE_KEY is a Vercel
// Sensitive Environment Variable whose value is non-readable after creation (see
// CLAUDE.md), so `vercel pull` writes it as "" and it is not a GitHub secret either.
// A Supabase-direct read would therefore find no credential and silently skip on every
// deploy — a permanently green no-op. /api/readiness is unauthenticated and publishes
// the whole projection object, so probing it needs no credential anywhere and reports
// the same state the canary will be judged against.
//
// Scope: this catches drift that already exists when the release starts — the recurring
// case, where a cron harvest or a corpus edit changes an eligible document while its
// serving row keeps the old projection metadata. A release that itself introduces new
// eligible chunks can still surface at the canary gate; that path is unchanged.

// This gate needs no imports at all, so mark the file a module — top-level await below
// is only legal in one.
export {};

const DEFAULT_BASE_URL = "https://kaxi.vercel.app";
// /api/readiness paginates the whole serving projection out of Supabase before it
// answers, so it routinely takes 5-11s and a cold start takes longer. These match
// scripts/check-production-cutover.ts:187, which polls the same endpoint at 30s.
// A tighter budget just turns a healthy production into a skipped check.
const ATTEMPTS = 4;
const RETRY_DELAY_MS = 5000;
const TIMEOUT_MS = 30000;

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

// Indeterminate, not drifted: we could not read the projection at all. Blocking here
// would invent a new way to fail a release over something we have not actually observed
// (production briefly unreachable, a first deploy, an endpoint shape change). Surface it
// as a workflow annotation so it cannot pass unnoticed, and let the canary gate — which
// still runs downstream exactly as before — remain the backstop.
function indeterminate(reason: string): never {
  console.log(`::warning::RAG serving projection drift check skipped — ${reason}`);
  console.log(`SKIP RAG serving projection drift check: ${reason}`);
  process.exit(0);
}

type ProjectionShape = {
  cutoverReady?: boolean;
  eligibleChunks?: number;
  vectorReadyChunks?: number;
  outdatedEmbeddingChunks?: number;
  pendingChunks?: number;
  citationReadyChunks?: number;
  legacyChunks?: number;
  error?: string;
};

const baseUrl = (argument("base-url") || process.env.CUTOVER_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
const readinessUrl = `${baseUrl}/api/readiness`;

async function fetchReadiness(): Promise<Record<string, unknown>> {
  let lastError = "unknown error";

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      // A drifted projection makes this endpoint answer 503, so the body is parsed
      // regardless of status — the HTTP code is never the verdict here.
      const response = await fetch(readinessUrl, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return await response.json() as Record<string, unknown>;
    } catch (error) {
      lastError = errorMessage(error);
      if (attempt < ATTEMPTS) await Bun.sleep(RETRY_DELAY_MS);
    }
  }

  indeterminate(`${readinessUrl} was unreachable after ${ATTEMPTS} attempts (${lastError})`);
}

const payload = await fetchReadiness();
const checks = Array.isArray(payload.checks) ? payload.checks as Array<Record<string, unknown>> : [];
const ragCheck = checks.find((check) => check.key === "rag.openai_pgvector");

if (!ragCheck) {
  indeterminate(`${readinessUrl} did not report a rag.openai_pgvector check`);
}

const projection = ((ragCheck.metadata as Record<string, unknown> | undefined)?.projection || {}) as ProjectionShape;

// readiness.ts wraps the projection read in a .catch that degrades it to { error }, so a
// production deployment that cannot reach Supabase publishes no numbers to judge.
if (typeof projection.cutoverReady !== "boolean") {
  indeterminate(
    `${readinessUrl} published no projection numbers`
    + `${projection.error ? ` (${projection.error})` : ""}`,
  );
}

console.log(JSON.stringify({ baseUrl, projection }, null, 2));

if (projection.cutoverReady) {
  console.log(
    `PASS RAG serving projection: ${projection.vectorReadyChunks}/${projection.eligibleChunks} eligible chunks are serving-ready.`,
  );
} else {
  // cutoverReady is the exact condition src/lib/ops/readiness.ts gates on, so this
  // verdict cannot disagree with the canary check it is standing in front of.
  console.error(
    `FAIL RAG serving projection drift: ${projection.vectorReadyChunks}/${projection.eligibleChunks} chunks serving-ready `
    + `(outdated=${projection.outdatedEmbeddingChunks}, pending=${projection.pendingChunks}, `
    + `citationReady=${projection.citationReadyChunks}/${projection.eligibleChunks}, legacy=${projection.legacyChunks}).`,
  );
  console.error(
    "Production /api/readiness reports rag.openai_pgvector as failed while this is true, so the canary gate would reject this release.",
  );
  console.error("Resolve with the governed sync (additive, non-destructive), then rerun the deploy:");
  console.error("  bun run rag:serving:sync                                                  # dry run: preflight numbers only");
  console.error("  bun run rag:serving:sync --execute --confirm-contract <ACTIVE_CONTRACT>");
  console.error("  (ACTIVE_CONTRACT is the constant at the top of scripts/sync-rag-serving-projection.ts)");
  process.exitCode = 1;
}
