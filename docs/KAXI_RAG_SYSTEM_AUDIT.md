# KAXI RAG System Audit and Delivery Plan

Checked: 2026-07-14 (Asia/Seoul)

## 1. Executive Status

KAXI remains the public security, retrieval-policy, answer, and persistence boundary. n8n is reduced to signed verification, orchestration, and response return; Supabase owns canonical state and governed lexical/vector serving data, and Typebot remains an alternate conversation channel. The production alias is `Ready`, Promete release `kaxi-rag-runtime@2026-07-14.provider-independent-hybrid-v2` is published, and the post-deploy 8/16/64 Typebot-gateway evaluation passed with canonical persistence. Stored pgvector retrieval is active without an external query-embedding credential through a strict lexical-seed centroid, while automatic n8n-outage fallback remains lexical and policy-equivalent.

| Area | Local/draft state | Live state | Release status |
| --- | --- | --- | --- |
| KAXI app | Full TypeScript, cutover, readiness, lint, and production builds pass | `https://kaxi.vercel.app` is `Ready`; `/api/health` exposes the exact deployed source commit | released |
| n8n main workflow | thin signed orchestrator targeting workflow `rB3nfjvCyTODP803`; capability contract `2026-07-14.v3` | active version `43253aa9-3290-408b-9920-9dd214f6a818`; 34 nodes; newest 120 sampled executions all succeeded | released |
| Typebot | `data.*` response mappings, stable Result ID session, and matching server-side gateway headers | published as `kaxi-rag-typebot`; normal, high-risk, consent, and handoff E2E pass | released; continue synthetic observation |
| Supabase canonical corpus | 94 eligible documents, 201 eligible chunks, 201 citation-ready | migration ledger is current through `20260714100000_localized_knowledge_titles` | released |
| governed serving projection | lexical-v2, stored-vector centroid, pgvector hybrid RRF, and strict direct fallback | 201/201 ready; normal hybrid and forced-outage lexical evaluations each passed 64/64 | released |
| legacy RAG | quarantine and transactional cutover gate verified | 100 rows retained in server-only quarantine; `knowledge_chunks` is empty | cutover complete |
| Prisma operational DB | pooled runtime and direct migration URLs verified | managed Supabase PostgreSQL is writable and schema parity passes | released |
| school directory | 50 current rows with source metadata | readiness reports 50 active, 0 expired, 0 missing-source rows | operational; continue source review |
| operations | health ledger, n8n error persistence, signed webhook delivery, acknowledgement API/UI, real Typebot-turn probing, and independent GitHub issue alerting exist | required RAG checks pass; run `c6b7e510-053f-4c8e-8f03-cef69c416200` is `warning` only because the optional managed malware scanner is not configured | operational with one explicit warning |
| attachments | private storage, signature/MIME/hash checks, encrypted extraction, durable leased jobs, and scanner contract exist | storage and queue controls pass | add a production malware-scanner implementation and secondary OCR failover |
| Codex n8n MCP | OAuth completed for the Promete endpoint and CLI MCP tools are available | workflow details, version, and execution data were verified read-only; the already-running desktop process still requires restart to refresh its cached OAuth session | management access only; runtime authorization remains KAXI HMAC |

## 2. Implemented Controls

- KAXI-to-n8n HMAC, timestamp, purpose, nonce replay prevention, and HTTPS-only webhook configuration.
- Signed KAXI browser sessions, attachment ownership checks, private bucket flow, magic-byte validation, encrypted extraction, and retention metadata.
- Separate canonical `chat_messages`, `retrieval_runs`, `n8n_audit_messages`, attachment, lead/contact, handoff, health, ops-event, and evaluation tables.
- Session-scoped request identities, idempotent failure-to-success retry promotion, and cross-session idempotency collision rejection.
- Typebot Result ID session contract and a separate required Typebot gateway secret for both server-side webhook blocks.
- Approved/current/citation-ready serving projection with a transactional legacy cutover gate.
- Hybrid retrieval inputs, category fallback, configurable thresholds, no-context routing, citation validation, risk classification, and handoff deduplication.
- Responsive KAXI widget verified at 1280x720, 390x844, and 320x568 with 44px minimum utility controls.
- Vercel ARM and x64 Prisma engines included in the standalone build.
- Official-source monitoring now uses bounded concurrency; the Vercel daily cron checks nine critical sources while the GitHub matrix covers the full watchlist.
- Attachment processing now uses one durable job per attachment, atomic leased claims, retry backoff, stale-lease recovery, and terminal failure state.
- Daily health can deliver signed generic or Slack-formatted operations alerts; delivery remains disabled until an HTTPS destination is configured.
- Independent GitHub health monitoring opens or updates one `ops-health` incident and closes it on recovery, so n8n failures still reach a human channel without depending on n8n.
- Typebot Results are now included in daily privacy retention with a dedicated provider token, seven-day cutoff, bounded deletion batches, and a required health/readiness check.
- Hosted readiness rejects loopback PostgreSQL, and the production DB check distinguishes local writability from a shared operational target.
- New canonical chat writes keep recoverable question, answer, retrieval query, and handoff text in AES-GCM ciphertext while legacy text columns receive redacted display copies; remote migration parity is still required.
- Privacy deletion now resolves canonical sessions by lead, contact hash, or question hash; scheduled retention removes storage objects, canonical chat/retrieval rows, n8n audit rows, and handoff records together.
- KAXI now creates encrypted, message-linked handoff tasks after canonical persistence; database-level dedupe keeps one open task and one keyed contact per session/question/contact.
- Handoff assignment now resolves to a linked partner account, stores a versioned 2-hour urgent or 24-hour standard first-response SLA, derives overdue state in the admin queue, and records assignment audits without granting partner-side access to unconsented content.
- KAXI now writes metadata-only n8n audit rows linked to canonical messages. A database trigger replaces any duplicated question, answer, or source payload with fixed placeholders, including writes from an older n8n version.
- Every n8n runtime, ingestion, handoff, and capability response now emits evaluated `workflowId` and `executionId` plus immutable workflow, model, and prompt versions. KAXI preserves the same fields in response bodies and headers, and canonical chat, retrieval, n8n-audit, health, ops-event, and evaluation ledgers expose dedicated provenance columns.
- Production readiness now verifies the latest migration ledger entry plus the attachment queue, retention, encryption, handoff ownership, and audit-sanitizer objects in the connected PostgreSQL database.
- A local drift rehearsal reproduced the live ledger/object split, then applied all 23 pending or unrecorded migrations with `prisma migrate deploy` without conflict; the resulting database passed the canonical schema-parity gate.
- The website widget now restores up to 20 canonical exchanges from the signed HttpOnly session, decrypts recoverable text only on the server, restores verified HTTPS citations, preserves failed request identities for idempotent retry, and resumes or exposes pending/failed attachments after refresh.
- Production-corpus readiness now supports independent total and official-source floors while preserving strict equal floors by default. The local reviewed 199-chunk corpus passes with 199/199 total embeddings and 195/195 official-source embeddings; the remaining four approved internal guidance chunks retain mapped public citations in the serving projection.
- Vercel production is `Ready` and includes the provider-independent hybrid runtime, payload-bound verifier, readiness, and session-history routes; the immutable source commit is exposed by `/api/health`.
- Production session endpoints use the managed PostgreSQL-backed shared rate limiter and keep session responses `private, no-store` with `Vary: Cookie`.
- Production readiness confirms the managed database, latest migration, gateway signing, Typebot gateway authentication, private attachment storage, privacy controls, school metadata, and shared rate limiting. Managed provider availability and OCR failover remain independently monitored operational dependencies.
- Active n8n release `kaxi-rag-runtime@2026-07-14.provider-independent-hybrid-v2` preserves verifier-first runtime, ingestion, and handoff paths while moving retrieval and policy decisions into KAXI/SQL. Active version `43253aa9-3290-408b-9920-9dd214f6a818` returns explicit fields rather than an expression-local initializer, preventing the previously observed empty HTTP 200 body.
- The serving projection is 201/201 ready with zero eligible embedding gaps. Production run `8361bddb-5817-4e2b-98d0-72d08e6ecee3` passed 64/64 cases through `n8n-kaxi-orchestrated` and `kaxi-direct-hybrid`, with 100% document recall, citation validity, strict category, locale/rerank consistency, category inference, high-risk recall, and no-context accuracy; p95 latency was 3783ms. Run headers are now reconciled from the observed response provenance.
- Shadow run `4684c616-3589-4199-bb05-0fce85743121` passed 64/64 and measured 100% expected-document recall for lexical, vector, and hybrid candidate sets. With no external query provider, the vector strategy was `lexical-centroid`; if a configured provider fails, policy intentionally degrades to lexical-only.
- Published Typebot normal and high-risk turns returned the real `block_answer`, persisted Typebot sessions, and routed high risk through privacy consent. A final low-risk turn created canonical message `910`, retrieval run `88eaa384-972f-437b-a370-c0026658c751`, and successful n8n execution `367` with six retrieved candidates and three citations.
- Forced n8n outage run `1b12fd80-8138-426f-b9b9-33f8ab25b397` passed 64/64 through `kaxi-direct-lexical`; the gateway returned user-facing failures only when both orchestration and Supabase retrieval would be unavailable.
- System-health run `c6b7e510-053f-4c8e-8f03-cef69c416200` has no required failures. Supabase, signed n8n runtime, published Typebot, result retention, serving projection, latest full evaluation, operations queue, and attachment processing pass; only the optional managed malware scanner remains a warning.

## 3. Remaining Release Gaps

1. Connect a managed external malware scanner before describing uploaded files as fully scanned. Structural decode/re-encode and active-PDF rejection remain enabled, so this is an explicit warning rather than a RAG release blocker.
2. A direct Slack/email webhook remains optional; the independent GitHub issue and Actions failure channel is connected and testable without n8n.
3. The ingestion embedding branch still depends on an embedding provider; new ingestion should be tested whenever that credential changes. Query-time hybrid retrieval no longer shares that dependency.
4. Continue published-Typebot no-context and retry synthetic probes during the observation window.
5. Restart the Codex desktop process before expecting its in-process n8n MCP transport to use the newly approved OAuth token; the CLI MCP session is already authorized.

## 3.1 Production Evidence

| Boundary | Result | Evidence |
| --- | --- | --- |
| deployment | pass | Vercel production alias is `Ready`, and `/api/health` reports the immutable deployed commit |
| health | pass with warning | run `c6b7e510-053f-4c8e-8f03-cef69c416200` has zero required failures; only the optional managed malware scanner is unconfigured |
| readiness safety | pass | database, gateway, Typebot, privacy, storage, serving projection, attachment queue, and operations-event checks pass |
| signed verifier route | pass | malformed or unsigned requests are rejected before retrieval, and correctly signed payload-bound probes return HTTP 200 |
| desktop UI | pass | page and widget fit 1280x720; widget rect is 430x608 at right edge 1256 of 1280 |
| mobile UI | pass | no horizontal overflow at 390x844; the 320x568 layout keeps controls separated, uses accessible labels, and exposes answer updates through a live region |
| chat and RAG E2E | pass | published Typebot passed all four locale starts, Korean high-risk consent, and a real low-risk turn; session, canonical message, retrieval run, n8n execution `367`, and three citations were cross-checked in Supabase |
| serving projection | pass | 201/201 ready, 0 pending, 0 quarantined, 201 citation-ready |
| evaluation | pass | run `8361bddb-5817-4e2b-98d0-72d08e6ecee3`: 64/64 cases through n8n hybrid; all critical quality metrics 100%; p95 3783ms. Forced outage run `1b12fd80-8138-426f-b9b9-33f8ab25b397` also passed 64/64 through direct lexical fallback |
| n8n executions | pass | newest 120 sampled production executions all succeeded; post-16:00 UTC error, crash, and cancellation searches returned zero; final Typebot execution `367` succeeded |
| Typebot channel | pass | published normal and high-risk turns returned a real answer; consent and handoff created linked session, lead, contact, task, update, and consent evidence |

## 3.2 Local Evidence

| Boundary | Result | Evidence |
| --- | --- | --- |
| Phase 0/1 production audit | pass | 17/17 checks passed with zero warnings or failures using total floor 199 and official-source floor 195 |
| approved corpus | pass | 94 eligible documents, 201 eligible chunks, and 201 citation-ready serving rows |
| shadow retrieval | pass | 64/64 with 100% expected-document recall for lexical, stored-vector, and hybrid candidates using the provider-independent centroid strategy |
| visa document matrix | pass | 50/50 rows seeded idempotently with all 50 validation-rule rows and D-2, D-4, D-10, E-7, F-2, and F-5 coverage |
| corpus policy regression | pass | strict default official-source floor still rejects internal-only capacity; explicitly reviewed mixed floors pass without weakening URL, freshness, or vector-presence checks |
| n8n OAuth callback | pass, management only | the browser approval callback authorized the Codex CLI n8n MCP connection; the desktop process needs one restart to refresh its cached session. OAuth remains separate from KAXI HMAC runtime authorization |
| n8n workflow invariant | pass, published | workflow `rB3nfjvCyTODP803` has verifier-first webhook edges, a payload-bound verification receipt, executable orchestration and retrieval provenance, and no duplicate retrieval/classification code |
| Typebot session/handoff contract | pass, published | the Result ID variable produces `typebot-{{sessionId}}`, handoff reuses that session plus `handoffToken`, both server-side HTTP Request blocks authenticate, and live consent/handoff persistence passes |

## 4. Target Runtime Contract

```text
KAXI widget or Typebot
  -> KAXI session/source authentication and rate limit
  -> request normalization and idempotency
  -> HMAC-signed n8n runtime webhook
  -> governed hybrid pgvector retrieval
  -> citation-valid context
  -> structured answer and independent risk classification
  -> canonical chat/retrieval persistence
  -> response or deduplicated handoff
```

KAXI remains the only public service allowed to mint n8n signatures or use the Supabase service role. The custom KAXI widget should remain the website UI; Typebot is a separate channel using the same gateway, not a second persistence path.

## 5. Delivery Plan

### P0: Controlled Release

Release status on 2026-07-14: managed database configuration, backup, migrations through `20260714100000_localized_knowledge_titles`, KAXI production deployment, n8n publication, serving sync, provider-independent hybrid activation, governed evaluation, Typebot publication, primary channel E2E verification, and the explicitly approved legacy cutover are complete.

1. Configure a real Supabase pooler URL for runtime and `SUPABASE_DIRECT_URL` for migrations; verify both targets without logging credentials. Complete.
2. Back up canonical tables, load the real direct Supabase URL, run `bun run db:migrate:deploy`, and require the canonical schema-parity readiness check to pass. Complete; the pre-migration backup is retained under `.tmp/supabase-backups/`.
3. Add the remaining Vercel preview controls: application-side image OCR key and durable storage parity. Supabase runtime, linked admin sessions, GitHub operations alerts, and the separate Typebot, n8n, privacy, cron, and upload-signing secrets are configured.
4. Re-run the existing preview verification after database migration parity: readiness, citation pages, unsigned/signed n8n verification, chat session, attachment storage/worker, and mobile widget. Health and responsive layout already pass.
5. Obtain explicit approval and promote KAXI to production. Complete.
6. Re-verify the already configured Typebot gateway secret on both server-side webhook headers immediately before publication. Complete.
7. Verify the prepared n8n draft still has successful execution data disabled, failed execution data retained, metadata-only telemetry, encrypted handoff-update mappings, and no duplicate initial handoff write.
8. Remove or archive Typebot smoke/test results and document the Typebot retention processor agreement. Complete: the daily retention job deletes provider Results after seven days with a dedicated token.
9. Publish the validated n8n draft and verify the capability contract. Complete.
10. Sync the serving projection to 201/201 in resumable batches. Complete.
11. Run the governed RAG evaluation; require at least 95% overall, 90% per locale/category, 95% document recall/no-context accuracy, and 100% citation validity/strict category/locale-rerank/high-risk routing. Complete at 64/64 with all critical quality metrics at 100%.
12. Execute the guarded legacy cutover only at 201/201 readiness. Complete: 100 rows quarantined and removed; zero legacy rows remain live.
13. Publish Typebot and run channel-specific tests. Publication plus normal, high-risk, consent, and handoff E2E are complete; no-context and retry remain observation probes.

Acceptance: all required readiness checks pass, Typebot and widget return grounded answers, every turn has one canonical message and retrieval run, and no new critical runtime error appears during the observation window.

### P1: Reliability and Operations

- Optionally add Slack/email delivery alongside the active GitHub issue alert when a destination is approved.
- Add a durable cursor and per-source run ledger to the now bounded concurrent monitor so interrupted GitHub batches can resume precisely.
- Add a dedicated queue runner with a frequent scheduler on infrastructure that supports sub-daily jobs; retain opportunistic drains as recovery, not the only worker trigger.
- Add malware scanning before promotion from quarantine to processed storage.
- Add a tested secondary vision provider and failover policy; the primary Anthropic dependency is now explicit in readiness.
- Keep the implemented daily KAXI -> n8n -> Supabase and Typebot start/continue probes tagged so monitoring data can be filtered from customer traffic.
- Add cross-device continuation only after user authentication and explicit consent; anonymous refresh hydration is now limited to the signed 24-hour browser session.

Acceptance: alert delivery is tested, attachment jobs survive process termination, daily health covers all external dependencies, and recovery steps are documented and rehearsed.

### P2: Answer and Retrieval Quality

- Treat an n8n/OpenAI answer model as optional. The deterministic grounded builder remains the stable baseline; any schema-constrained generator must preserve independent retrieval, citation, and risk gates.
- Continue calibrating the implemented locale-by-category confidence policy, token coverage, top1/top2 margin, and low-confidence no-context routing as the reviewed evaluation set grows.
- Continue tuning the implemented locale-aware reranker and explicit source-authority/freshness/title weights without weakening strict category or locale filters.
- Expand evaluation cases for D-2/D-4/D-10, extension/change, part-time work, rejection, forged documents, and multilingual paraphrases.
- Track citation precision, retrieval recall, no-context rate, answer-grounding score, risk recall, and handoff precision by workflow version.
- Add user feedback tied to `message_id` and feed only reviewed failures into evaluation cases.

Acceptance: grounded-answer pass rate is at least 90%, high-risk recall is 100% on the governed set, unsupported claims are zero in sampled review, and p95 answer latency stays within the agreed SLO.

### P3: Product and Admin Experience

- Localize widget strings and error states for Korean, English, Vietnamese, and Mongolian.
- Add upload progress, processing ETA, accessible error details, and persisted retry state.
- Build an operator queue for unhandled questions, low-confidence retrieval, attachment failures, and overdue handoffs.
- Show source URL, checked date, category, top score, n8n execution ID, and workflow version in the admin conversation detail.
- Extend the implemented ownership, SLA timers, status transitions, and internal notes with structured resolution feedback.
- Add analytics for question categories, containment, handoff conversion, unanswered topics, latency, and cost.

### P4: Scale, Privacy, and Governance

- Replace hard-coded `tenant_id=default` with authenticated tenant resolution and tenant-scoped uniqueness/RLS tests.
- Dual-key overlap and rotation evidence are implemented for session, Typebot, n8n, admin, and cron secrets. Encryption-key re-encryption, hash backfill, and provider-side key regeneration remain coordinated runbook operations.
- Test backup/restore for canonical corpus, conversations, handoffs, and evaluation history.
- Add load, timeout, provider-failure, replay, forged-source, and storage-failure tests in preview.
- Review school data and legal sources with named reviewers before approval; never promote crawler output directly.
- Add authenticated data export and Typebot-side result deletion; KAXI canonical chat, retrieval, attachment, n8n-audit, and handoff deletion is now implemented locally.

## 6. Release Order

```text
Vercel production env [complete]
  -> remote database target and migration parity [complete]
  -> KAXI signed verification and chat bootstrap [complete]
  -> explicit production approval [complete]
  -> KAXI production deploy [complete]
  -> n8n draft publish [complete]
  -> serving projection 201/201 [complete]
  -> provider-independent hybrid shadow 64/64 [complete]
  -> staged and final evaluation pass [complete]
  -> guarded legacy cutover [complete: 100 quarantined, 100 removed]
  -> Typebot publish [complete]
  -> Typebot primary channel E2E [complete]
  -> no-context/retry observation probes [pending]
```

Publishing n8n before the KAXI verifier is live causes authorization failures. Publishing Typebot before the backend chain passes exposes a broken customer flow.

## 7. Operational Targets

| Metric | Initial target |
| --- | --- |
| runtime availability | 99.5% monthly |
| grounded citation coverage | 100% of non-fallback answers |
| high-risk recall | 100% on governed evaluation cases |
| duplicate open handoffs | 0 |
| canonical persistence | at least 99.9% of accepted turns |
| answer latency | p95 <= 8s, p99 <= 15s |
| attachment processing | p95 <= 30s |
| no-context rate | <= 15%, reviewed weekly |
| alert acknowledgement | critical <= 15m, error <= 4h |

## 8. Decisions Requiring Owner Approval

- Production school-data import after source review.
- Choice and credentials for human alerts.
- Application-side OCR/vision provider and budget.
- Optional schema-constrained answer model and budget; retrieval does not depend on this choice.
- Legacy RAG cutover after measured evaluation success.
- Typebot no-context/retry observation results during continued production monitoring.

Future secret transmission or school import must not be performed implicitly. The KAXI deployment, n8n and Typebot publication, Typebot retention token, and legacy cutover documented above were performed with explicit user approval.
