import { createClient } from "@supabase/supabase-js";
import { getRagServingProjectionStatus } from "../src/lib/knowledge/serving-projection";

const CONFIRMATION = "CUTOVER_LEGACY_RAG";

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const before = await getRagServingProjectionStatus();
  console.log(JSON.stringify({ phase: "preflight", status: before }, null, 2));

  if (before.legacyChunks === 0) {
    console.log("Legacy RAG rows are already cut over.");
    return;
  }
  if (!process.argv.includes("--execute") || argValue("--confirm") !== CONFIRMATION) {
    console.log(`Dry run only. Pass --execute --confirm ${CONFIRMATION} after evaluation passes.`);
    return;
  }

  const expected = Number.parseInt(argValue("--expected-ready") || String(before.eligibleChunks), 10);
  if (!Number.isFinite(expected) || expected <= 0 || expected !== before.eligibleChunks) {
    throw new Error(`--expected-ready must equal the current eligible chunk count (${before.eligibleChunks})`);
  }
  if (before.readyChunks < expected || before.citationReadyChunks < expected) {
    throw new Error(
      `Cutover blocked: ready=${before.readyChunks}, citationReady=${before.citationReadyChunks}, expected=${expected}`,
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Supabase service configuration is required");
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const cutover = await supabase.rpc("kaxi_finalize_legacy_rag_cutover", {
    expected_ready_count: expected,
  });
  if (cutover.error) throw cutover.error;

  const after = await getRagServingProjectionStatus();
  console.log(JSON.stringify({ phase: "cutover", result: cutover.data, status: after }, null, 2));
  if (after.legacyChunks !== 0) {
    throw new Error(`Legacy RAG cutover did not finish (${after.legacyChunks} row(s) remain)`);
  }
}

main().catch((error) => {
  const message = error instanceof Error
    ? error.message
    : error && typeof error === "object"
      ? JSON.stringify(error)
      : String(error);
  console.error(`[rag-serving:cutover] ${message}`);
  process.exitCode = 1;
});
