# ADR-0002: n8n Orchestration and Failover Semantics

Status: Accepted

Date: 2026-08-13

Owners: Product Owner, Tech Lead, Operations

Related: `docs/PRD_TECHNICAL_ARCHITECTURE_UPLIFT.md`, `docs/KAXI_RAG_SYSTEM_AUDIT.md`

## Context

KAXI supports direct RAG execution and a signed n8n path. The n8n workflow verifies the request and calls `https://karxy.com/api/internal/n8n/rag-runtime`. That internal endpoint executes the same KAXI retrieval implementation used by the direct path.

This is valuable as a signed channel adapter, orchestration boundary, controlled retry path, and provenance source. It is not an independent RAG failure domain: both paths still depend on KAXI application code, the same canonical PostgreSQL/Supabase state, and substantially the same retrieval/provider infrastructure.

Calling this path a backup runtime or failover without qualification can overstate availability, produce misleading SLO evidence, and lead operators to assume a failure has been isolated when the request has only taken an additional network hop.

## Decision

n8n is defined as a **signed orchestration and channel-integration layer**, not an independent RAG runtime.

n8n may:

- verify and forward signed channel requests
- coordinate bounded external steps
- attach immutable orchestration provenance
- provide a controlled retry route
- handle asynchronous integration workflows

n8n may not:

- own canonical chat, retrieval, handoff, or consent state
- duplicate KAXI retrieval/risk/guardrail policy
- be counted as an independent availability zone while it calls back into KAXI Core
- transform an uncommitted KAXI result into an accepted persistence result

Metrics and user-facing/admin terminology will distinguish:

- `direct execution`
- `n8n-orchestrated execution`
- `retry/recovery path`
- `independent runtime failover` only when the alternate path has a separate deployment and can survive loss of the primary KAXI runtime

The Application Use Case remains the canonical policy implementation. Direct Web/Typebot adapters and the signed n8n adapter call the same use case.

## Consequences

### Positive

- Availability claims match the real fault domains.
- Core RAG and persistence policy stay in one tested implementation.
- n8n remains useful for orchestration without becoming a second source of truth.
- Traces can distinguish an extra orchestration hop from actual provider/runtime failover.

### Negative

- Current backup/failover labels and dashboards require migration.
- Loss of the KAXI runtime is not mitigated by the current n8n callback.
- True independent failover, if required, needs a separate deployable runtime and additional operational cost.

## Rejected alternatives

### Treat the current n8n callback as independent failover

Rejected because the callback re-enters KAXI and shares the primary implementation and data dependencies.

### Duplicate retrieval and persistence inside n8n

Rejected because policy and schema drift would undermine citation, privacy, handoff, and release gates.

### Remove n8n immediately

Rejected because signed orchestration, channel integration, provenance, and workflow operations remain useful capabilities.

## Independent failover criteria

An alternate path may be called independent failover only if tests prove that it:

1. runs in a separately deployed execution environment;
2. remains available when the primary KAXI Web runtime is unavailable;
3. has independently bounded provider and network dependencies;
4. preserves the same retrieval, citation, risk, privacy, and persistence contract;
5. passes governed evaluation and forced-primary-outage tests;
6. emits distinct fault-domain and recovery telemetry.

## Validation

- Workflow tests continue to prove verifier-first, thin orchestration.
- Architecture tests prevent policy implementation from moving into Route-to-Route composition.
- Operational metrics label n8n executions as orchestrated/retry paths.
- Forced outage tests must name the dependency actually removed and may not infer independence from a successful callback alone.
