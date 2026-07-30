// A streaming answer has two failure modes and they need different budgets.
//
// The client used to arm one 25s timer at request start and never touch it
// again, so a stream that was healthily delivering tokens got aborted at 25s
// wall clock even though /api/ai/unified/stream is allowed 60s. Long grounded
// answers with several retrieval hops routinely cross that line, so the client
// was killing work the server was about to finish.
//
// What actually indicates a dead stream is silence, not elapsed time. This
// watchdog expires on inactivity and resets on every event, with a separate
// total ceiling so a stream that keeps trickling events forever still ends.
//
// Timers are injectable so the semantics can be tested against a fake clock —
// the reset behaviour is the whole point of this module and a source-level
// check cannot prove it.

export type StreamWatchdogReason = "inactivity" | "total";

export interface WatchdogTimers {
  setTimeout: (callback: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

export interface StreamWatchdog {
  noteActivity: () => void;
  stop: () => void;
}

const DEFAULT_TIMERS: WatchdogTimers = {
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as Parameters<typeof clearTimeout>[0]),
};

export function createStreamWatchdog(options: {
  onExpire: (reason: StreamWatchdogReason) => void;
  inactivityMs: number;
  totalMs: number;
  timers?: WatchdogTimers;
}): StreamWatchdog {
  const { onExpire, inactivityMs, totalMs } = options;
  const timers = options.timers ?? DEFAULT_TIMERS;

  let settled = false;
  let inactivityHandle: unknown = null;

  const clearAll = () => {
    timers.clearTimeout(inactivityHandle);
    timers.clearTimeout(totalHandle);
  };

  const expire = (reason: StreamWatchdogReason) => {
    if (settled) return;
    settled = true;
    clearAll();
    onExpire(reason);
  };

  const totalHandle = timers.setTimeout(() => expire("total"), totalMs);
  inactivityHandle = timers.setTimeout(() => expire("inactivity"), inactivityMs);

  return {
    noteActivity() {
      if (settled) return;
      timers.clearTimeout(inactivityHandle);
      inactivityHandle = timers.setTimeout(() => expire("inactivity"), inactivityMs);
    },
    stop() {
      if (settled) return;
      settled = true;
      clearAll();
    },
  };
}
