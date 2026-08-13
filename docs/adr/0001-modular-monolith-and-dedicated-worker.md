# ADR-0001: Modular Monolith and Dedicated Worker

Status: Accepted

Date: 2026-08-13

Owners: Product Owner, Tech Lead

Related: `docs/PRD_TECHNICAL_ARCHITECTURE_UPLIFT.md`

## Context

KAXI is a Next.js 16 application with one PostgreSQL/Supabase operational store, a governed RAG corpus, several public and authenticated surfaces, Typebot and n8n integrations, and durable attachment jobs. The domain model and release controls benefit from one transactional data boundary, but the application currently mixes short-lived user requests with PDF parsing, ONNX inference, OCR, ingestion, source monitoring, and queue draining.

The production build confirms that this is an execution-boundary problem rather than a reason to split every domain into a service. The AI route traces are approximately 189 MiB uncompressed and the source monitor trace is approximately 168 MiB because native and document-processing dependencies share the web deployment. At the same time, chat, retrieval, handoff, consent, and deletion require strong consistency across shared data.

## Decision

KAXI will evolve as a **modular monolith with a dedicated asynchronous Worker runtime**.

The Next.js deployment remains the delivery and control plane:

- UI and Server Component rendering
- authentication and request/session context
- public and integration HTTP adapters
- runtime contract validation
- enqueue and status APIs

Framework-independent application modules own use-case orchestration. Domain modules own business invariants. Infrastructure adapters implement PostgreSQL/Supabase, storage, LLM, n8n, and notification ports.

The Worker runtime owns:

- attachment security checks, OCR/PDF extraction, and storage promotion
- official-source monitoring and ingestion
- embedding work
- transactional outbox delivery
- reconciliation and other long-running jobs

Web and Worker may share application/domain packages, but they must use separate entrypoints and deployment traces. PostgreSQL remains the source of truth and initial durable coordination mechanism. Queue processing assumes at-least-once delivery; consumers must be idempotent.

## Dependency rules

1. Delivery adapters may call application use cases but not repositories in multi-step workflows.
2. Application modules may depend on domain modules and port interfaces.
3. Domain modules may not import Next.js, Prisma, Supabase SDKs, or provider SDKs.
4. Infrastructure modules implement ports and are the only place service-role clients may be created.
5. Route Handlers may not import other Route Handlers.
6. Public presentation modules may not import Admin presentation modules.
7. Heavy native/document dependencies may not enter the Web/API deployment trace after the Worker cutover.

Architecture fitness tests enforce these rules incrementally. Phase 0 records the exact existing exceptions; later phases must remove rather than expand them.

## Consequences

### Positive

- Chat, retrieval, and handoff can retain one transactional database boundary.
- Heavy work gains independent concurrency, timeout, retry, and failure isolation.
- Channel adapters share policy without duplicating core logic.
- Operational deployment size and user-request cold-start risk can fall without introducing distributed transactions across all domains.
- A future service split remains possible at an explicit module/port boundary.

### Negative

- Web and Worker require coordinated versioning of shared contracts.
- At-least-once delivery requires idempotency, leases, and reconciliation.
- The existing flat `src/lib` structure must be migrated gradually.
- Two deployable runtimes add operational surface area.

## Rejected alternatives

### Keep every job in Next.js Route Handlers

Rejected because request timeouts, native dependency traces, scheduler frequency, and resource contention already constrain the system.

### Split every domain into microservices

Rejected because KAXI currently benefits from one data owner and strong consistency. It would add network failure modes, service authentication, duplicated observability, and distributed transaction complexity without measured scale pressure.

### Move business policy into n8n

Rejected because it would duplicate retrieval, persistence, privacy, and release controls outside the canonical code and test boundary.

## Validation

- Architecture boundary test rejects new route-to-route and public-to-admin dependencies.
- Build measurement records client and server trace footprints.
- Worker kill, stale lease, duplicate delivery, and storage reconciliation tests must pass before the Worker becomes primary.
- Existing RAG, citation, privacy, RLS, and release gates remain mandatory.

## Revisit when

- A domain requires independent scaling or release cadence that the Worker/module boundary cannot provide.
- Cross-domain transaction volume or team ownership creates measurable contention.
- Regulatory or regional isolation requires a separate data owner.
