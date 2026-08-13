export interface CanaryEvidence {
  windowHours: number;
  observedWrites: number;
  criticalOpsEvents: number;
  crossTenantEvents: number;
  duplicateOpenHandoffs: number;
  terminalQueueFailures: number;
  traceCoverage: number;
  traceEligibleUnits: number;
  tracePiiViolations: number;
  legacyDefaultRows: number;
  unsafeTenantColumns: number;
  truncated: boolean;
}

export interface CanaryThresholds {
  minimumHours: number;
  minimumWrites: number;
  minimumTraceUnits: number;
  minimumTraceCoverage: number;
}

export function canaryGateErrors(evidence: CanaryEvidence, thresholds: CanaryThresholds) {
  const errors: string[] = [];
  if (evidence.windowHours < thresholds.minimumHours) errors.push("observation_window_too_short");
  if (evidence.observedWrites < thresholds.minimumWrites) errors.push("insufficient_write_samples");
  if (evidence.traceEligibleUnits < thresholds.minimumTraceUnits) errors.push("insufficient_trace_samples");
  if (evidence.traceCoverage < thresholds.minimumTraceCoverage) errors.push("trace_coverage_below_target");
  if (evidence.tracePiiViolations > 0) errors.push("trace_pii_detected");
  if (evidence.legacyDefaultRows > 0) errors.push("legacy_default_tenant_rows_detected");
  if (evidence.unsafeTenantColumns > 0) errors.push("implicit_tenant_column_detected");
  if (evidence.criticalOpsEvents > 0) errors.push("critical_ops_event_detected");
  if (evidence.crossTenantEvents > 0) errors.push("cross_tenant_event_detected");
  if (evidence.duplicateOpenHandoffs > 0) errors.push("duplicate_open_handoff_detected");
  if (evidence.terminalQueueFailures > 0) errors.push("terminal_queue_failure_detected");
  if (evidence.truncated) errors.push("evidence_truncated");
  return errors;
}
