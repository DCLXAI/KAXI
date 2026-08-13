export interface LatencySample {
  firstProgressMs: number;
  completeMs: number;
}

export function percentile(values: number[], ratio: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] ?? null;
}

export function evaluateLatencyGate(input: {
  samples: LatencySample[];
  baselineCompleteP95Ms: number;
  coldFirstProgressBudgetMs: number;
  firstProgressP95BudgetMs?: number;
}) {
  const firstProgressP95Ms = percentile(input.samples.map((sample) => sample.firstProgressMs), 0.95);
  const completeP95Ms = percentile(input.samples.map((sample) => sample.completeMs), 0.95);
  const coldFirstProgressMs = input.samples[0]?.firstProgressMs ?? null;
  const completeBudgetMs = input.baselineCompleteP95Ms * 1.1;
  const errors: string[] = [];
  if (input.samples.length < 20) errors.push("insufficient_latency_samples");
  if (firstProgressP95Ms === null || firstProgressP95Ms > (input.firstProgressP95BudgetMs || 500)) {
    errors.push("first_progress_p95_exceeded");
  }
  if (completeP95Ms === null || completeP95Ms > completeBudgetMs) errors.push("complete_p95_regressed");
  if (coldFirstProgressMs === null || coldFirstProgressMs > input.coldFirstProgressBudgetMs) {
    errors.push("cold_first_progress_exceeded");
  }
  return { firstProgressP95Ms, completeP95Ms, coldFirstProgressMs, completeBudgetMs, errors };
}
