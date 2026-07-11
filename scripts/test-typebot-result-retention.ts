import { strict as assert } from "assert";
import { enforceTypebotResultRetention } from "../src/lib/typebot/result-retention";

const now = new Date("2026-07-11T00:00:00.000Z");
const env = {
  TYPEBOT_API_TOKEN: "test-typebot-token",
  TYPEBOT_BOT_ID: "bot-1",
  TYPEBOT_API_BASE_URL: "https://typebot.example.test",
  TYPEBOT_RESULT_RETENTION_DAYS: "7",
} as NodeJS.ProcessEnv;

function createFetch() {
  const deletes: string[][] = [];
  const fetchImpl = async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    assert.equal(init?.headers && (init.headers as Record<string, string>).authorization, "Bearer test-typebot-token");
    if (init?.method === "DELETE") {
      deletes.push((url.searchParams.get("resultIds") || "").split(","));
      return new Response(null, { status: 200 });
    }
    assert.equal(url.searchParams.get("timeFilter"), "allTime");
    if (url.searchParams.get("cursor") === "0") {
      return Response.json({
        results: [
          { id: "old-1", createdAt: "2026-07-01T00:00:00.000Z" },
          { id: "old-2", createdAt: "2026-07-03T23:59:59.000Z" },
        ],
        nextCursor: 2,
      });
    }
    return Response.json({
      results: [{ id: "recent-1", createdAt: "2026-07-10T00:00:00.000Z" }],
    });
  };
  return { fetchImpl, deletes };
}

const dryRunFetch = createFetch();
const dryRun = await enforceTypebotResultRetention({ dryRun: true, env, now, fetchImpl: dryRunFetch.fetchImpl });
assert.equal(dryRun.configured, true);
assert.equal(dryRun.examined, 3);
assert.equal(dryRun.eligible, 2);
assert.equal(dryRun.deleted, 0);
assert.deepEqual(dryRunFetch.deletes, []);

const executeFetch = createFetch();
const executed = await enforceTypebotResultRetention({ env, now, fetchImpl: executeFetch.fetchImpl });
assert.equal(executed.deleted, 2);
assert.equal(executed.deleteFailures, 0);
assert.deepEqual(executeFetch.deletes, [["old-1", "old-2"]]);

let unconfiguredCalls = 0;
const unconfigured = await enforceTypebotResultRetention({
  dryRun: true,
  env: {} as NodeJS.ProcessEnv,
  now,
  fetchImpl: async () => {
    unconfiguredCalls += 1;
    return new Response(null, { status: 500 });
  },
});
assert.equal(unconfigured.configured, false);
assert.equal(unconfiguredCalls, 0);

const failed = await enforceTypebotResultRetention({
  dryRun: true,
  env,
  now,
  fetchImpl: async () => new Response(null, { status: 401 }),
});
assert.equal(failed.apiFailures, 1);
assert.match(failed.error || "", /HTTP 401/);

console.log("PASS Typebot result retention: pagination, cutoff, deletion batches, disabled state, and API failures");
