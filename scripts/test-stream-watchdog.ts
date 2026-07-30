import assert from "node:assert/strict";
import { createStreamWatchdog, type StreamWatchdogReason, type WatchdogTimers } from "../src/lib/ai/stream-watchdog";

// The chat client used to arm a single 25s abort timer at request start and
// never reset it, so an answer that was still streaming tokens got killed at 25s
// wall clock while /api/ai/unified/stream is allowed 60s. The fix is inactivity
// based, and "the timer resets on activity" is exactly the kind of claim a
// source-level check cannot prove — so drive the real module with a fake clock.

interface FakeClock {
  timers: WatchdogTimers;
  advance: (ms: number) => void;
  pending: () => number;
}

function fakeClock(): FakeClock {
  let now = 0;
  let nextId = 1;
  const scheduled = new Map<number, { at: number; callback: () => void }>();

  return {
    timers: {
      setTimeout(callback, ms) {
        const id = nextId++;
        scheduled.set(id, { at: now + ms, callback });
        return id;
      },
      clearTimeout(handle) {
        if (typeof handle === "number") scheduled.delete(handle);
      },
    },
    advance(ms) {
      const target = now + ms;
      // Fire in chronological order so a callback scheduled by another callback
      // still runs at the right simulated time.
      for (;;) {
        let dueId: number | null = null;
        let dueAt = Infinity;
        for (const [id, entry] of scheduled) {
          if (entry.at <= target && entry.at < dueAt) {
            dueAt = entry.at;
            dueId = id;
          }
        }
        if (dueId === null) break;
        const entry = scheduled.get(dueId)!;
        scheduled.delete(dueId);
        now = entry.at;
        entry.callback();
      }
      now = target;
    },
    pending() {
      return scheduled.size;
    },
  };
}

function watchdogUnderTest(clock: FakeClock) {
  const expirations: StreamWatchdogReason[] = [];
  const watchdog = createStreamWatchdog({
    onExpire: (reason) => expirations.push(reason),
    inactivityMs: 25_000,
    totalMs: 70_000,
    timers: clock.timers,
  });
  return { watchdog, expirations };
}

// 1. A silent stream still aborts on the inactivity budget.
{
  const clock = fakeClock();
  const { expirations } = watchdogUnderTest(clock);
  clock.advance(24_999);
  assert.deepEqual(expirations, [], "a stream is not aborted before the inactivity budget elapses");
  clock.advance(2);
  assert.deepEqual(expirations, ["inactivity"], "a silent stream aborts once the inactivity budget elapses");
}

// 2. The regression itself: a stream that keeps delivering events survives well
//    past 25s. Under the old single-shot timer this aborted at exactly 25s.
{
  const clock = fakeClock();
  const { watchdog, expirations } = watchdogUnderTest(clock);
  // Stops at 40s so the trailing silent stretch below stays inside the 70s
  // total ceiling — otherwise this scenario would prove the ceiling instead.
  for (let elapsed = 0; elapsed < 40_000; elapsed += 5_000) {
    clock.advance(5_000);
    assert.deepEqual(expirations, [], `must not abort at ${elapsed + 5_000}ms while events keep arriving`);
    watchdog.noteActivity();
  }
  // Now go quiet and confirm the reset armed a fresh full budget.
  clock.advance(24_999);
  assert.deepEqual(expirations, [], "the last event re-armed a full inactivity budget");
  clock.advance(2);
  assert.deepEqual(expirations, ["inactivity"], "silence after the last event still aborts");
}

// 3. The total ceiling ends a stream that trickles events forever, and it sits
//    above the server's own 60s budget so the server error surfaces first.
{
  const clock = fakeClock();
  const { watchdog, expirations } = watchdogUnderTest(clock);
  for (let elapsed = 0; elapsed < 100_000; elapsed += 1_000) {
    clock.advance(1_000);
    watchdog.noteActivity();
  }
  assert.deepEqual(expirations, ["total"], "an endlessly trickling stream is ended by the total ceiling");
}

// 4. Expiry and stop() are terminal: no second abort, and no timer is left
//    running to fire after the request already settled.
{
  const clock = fakeClock();
  const { watchdog, expirations } = watchdogUnderTest(clock);
  clock.advance(25_000);
  assert.deepEqual(expirations, ["inactivity"], "expired once");
  watchdog.noteActivity();
  clock.advance(200_000);
  assert.deepEqual(expirations, ["inactivity"], "noteActivity() after expiry cannot revive the watchdog");
  assert.equal(clock.pending(), 0, "no timer survives expiry");
}

{
  const clock = fakeClock();
  const { watchdog, expirations } = watchdogUnderTest(clock);
  clock.advance(10_000);
  watchdog.stop();
  assert.equal(clock.pending(), 0, "stop() clears both timers so a settled request cannot abort later");
  clock.advance(200_000);
  assert.deepEqual(expirations, [], "a stopped watchdog never fires");
}

console.log("PASS stream watchdog: inactivity resets on activity, total ceiling holds, expiry is terminal");

// Whichever side times out first owns the error the user sees, and the server's
// is the localized retryable one. The server can be configured all the way up to
// UNIFIED_AI_STREAM_TIMEOUT_MAX_MS and goes quiet during generation after its
// 650ms "generating" event, so a client budget at or below that ceiling would
// pre-empt it with a generic client abort. Pin the ordering rather than the
// numbers, so raising either budget cannot silently break it.
{
  const { UNIFIED_AI_STREAM_TIMEOUT_MAX_MS, unifiedAiStreamTimeoutMs } = await import("../src/lib/ai/unified-stream");
  const hook = await import("node:fs").then((fs) =>
    fs.readFileSync("src/components/agent/useAgentChat.ts", "utf8"),
  );

  assert.match(
    hook,
    /CLIENT_STREAM_INACTIVITY_MS = UNIFIED_AI_STREAM_TIMEOUT_MAX_MS \+ (\d[\d_]*)/,
    "the client inactivity budget must be derived from the server ceiling, not hardcoded",
  );
  const margin = Number(/CLIENT_STREAM_INACTIVITY_MS = UNIFIED_AI_STREAM_TIMEOUT_MAX_MS \+ ([\d_]+)/
    .exec(hook)![1].replace(/_/g, ""));
  assert.ok(margin > 0, "the client must sit strictly above the server ceiling, never equal to it");

  assert.ok(
    unifiedAiStreamTimeoutMs({ UNIFIED_AI_STREAM_TIMEOUT_MS: "999999" }) === UNIFIED_AI_STREAM_TIMEOUT_MAX_MS,
    "the server budget is still clamped to the exported ceiling the client derives from",
  );

  const totalMs = Number(/CLIENT_STREAM_TOTAL_MS = ([\d_]+)/.exec(hook)![1].replace(/_/g, ""));
  assert.ok(
    totalMs > UNIFIED_AI_STREAM_TIMEOUT_MAX_MS + margin,
    "the total ceiling must be a backstop above the inactivity budget, not below it",
  );
}

console.log("PASS stream watchdog: the client budget stays above the server's own timeout");
