export type TraceCoverageUnitKind = "canonical" | "worker" | "outbox" | "attachment";

export interface TraceCoverageUnit {
  kind: TraceCoverageUnitKind;
  id: string;
  requestId: string;
  traceId: string;
  requiredSpanGroups: string[][];
}

export interface TraceCoverageSpan {
  requestId: string | null;
  traceId: string;
  name: string;
  attributes: unknown;
}

export interface TraceCoverageEvaluation {
  eligibleUnits: number;
  connectedUnits: number;
  coverage: number;
  piiViolationCount: number;
  byKind: Record<TraceCoverageUnitKind, { eligible: number; connected: number; coverage: number }>;
}

function spanNameMatches(actual: string, expected: string) {
  return expected.endsWith("*") ? actual.startsWith(expected.slice(0, -1)) : actual === expected;
}

function sensitiveAttributeViolation(value: unknown, key = ""): number {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + sensitiveAttributeViolation(item, key), 0);
  }
  if (!value || typeof value !== "object") {
    if (!/^(question|answer|contact|email|phone|authorization|token|secret)$/i.test(key)) return 0;
    return value === null || value === undefined || value === "" || value === "[redacted]" ? 0 : 1;
  }
  return Object.entries(value as Record<string, unknown>)
    .reduce((sum, [childKey, child]) => sum + sensitiveAttributeViolation(child, childKey), 0);
}

export function evaluateTraceCoverage(
  units: TraceCoverageUnit[],
  spans: TraceCoverageSpan[],
): TraceCoverageEvaluation {
  const spansByRequest = new Map<string, TraceCoverageSpan[]>();
  for (const span of spans) {
    if (!span.requestId) continue;
    const current = spansByRequest.get(span.requestId) || [];
    current.push(span);
    spansByRequest.set(span.requestId, current);
  }

  const counters: TraceCoverageEvaluation["byKind"] = {
    canonical: { eligible: 0, connected: 0, coverage: 0 },
    worker: { eligible: 0, connected: 0, coverage: 0 },
    outbox: { eligible: 0, connected: 0, coverage: 0 },
    attachment: { eligible: 0, connected: 0, coverage: 0 },
  };
  let connectedUnits = 0;
  for (const unit of units) {
    counters[unit.kind].eligible += 1;
    const matching = (spansByRequest.get(unit.requestId) || [])
      .filter((span) => span.traceId === unit.traceId);
    const connected = unit.requiredSpanGroups.every((group) =>
      group.some((expected) => matching.some((span) => spanNameMatches(span.name, expected))));
    if (connected) {
      connectedUnits += 1;
      counters[unit.kind].connected += 1;
    }
  }
  for (const value of Object.values(counters)) {
    value.coverage = value.eligible > 0 ? value.connected / value.eligible : 1;
  }
  return {
    eligibleUnits: units.length,
    connectedUnits,
    coverage: units.length > 0 ? connectedUnits / units.length : 0,
    piiViolationCount: spans.reduce(
      (sum, span) => sum + sensitiveAttributeViolation(span.attributes),
      0,
    ),
    byKind: counters,
  };
}
