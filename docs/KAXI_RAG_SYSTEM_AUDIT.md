# KAXI RAG System Audit and Delivery Plan

Checked: 2026-07-10 (Asia/Seoul)

## 1. Executive Status

The production backend chain is live: KAXI is the public security and persistence boundary, n8n owns retrieval/orchestration, Supabase owns canonical state and pgvector serving data, and Typebot remains an unpublished alternate conversation channel. The governed corpus and multilingual evaluation gates now pass. The application code now supports Kimi through its OpenAI-compatible API, but production still needs the selected provider environment variables and a fresh deployment.

| Area | Local/draft state | Live state | Release status |
| --- | --- | --- | --- |
| KAXI app | Full CI and production build pass | production deployment `dpl_9Tar6c1Xx17EUFzL23gHszFt3Avv` is `Ready` at `https://kaxi.vercel.app` | released; health passes, readiness is degraded only by the missing Anthropic key |
| n8n main workflow | 41-node workflow with shared Error Workflow, verifier-first webhooks, and success execution data disabled | active version `4d732810-a380-49ed-a5d8-ab434f0057bb`; capability contract `2026-07-10.v1` passes | published and evaluated |
| Typebot | top-level response mappings, stable Result ID session, and matching `x-kaxi-typebot-token` headers on both server-side webhook blocks | unpublished; historical test/smoke results retained | clear test data, then publish last |
| Supabase canonical corpus | 93 eligible documents, 199 eligible chunks, 199 citation-ready | migration ledger is current through `20260710180000_n8n_audit_metadata_only` | released |
| pgvector serving projection | governed sync/cutover tooling ready | 199/199 ready, 0 pending, 0 quarantined; evaluation 12/12 with 100% citation coverage | released |
| legacy RAG | quarantine and transactional cutover gate ready | 100 compatibility rows retained | cut over only with a separate explicit approval |
| Prisma operational DB | pooled runtime and direct migration URLs verified | managed Supabase PostgreSQL is writable and schema parity passes | released |
| school directory | 50 current rows with source metadata | readiness reports 50 active, 0 expired, 0 missing-source rows | operational; continue source review |
| operations | health ledger, n8n error persistence, and signed alert delivery exist | no human notification destination | connect Slack/email and test delivery |
| attachments | private storage, signature/MIME/hash checks, encrypted extraction, durable leased jobs | storage and queue controls pass; image OCR is blocked until the selected managed LLM key is configured | configure Kimi OCR, then add malware scan |
| Codex n8n MCP | browser OAuth approval callback completed; a fresh Codex process can enumerate n8n tools | the current desktop process may retain a stale MCP auth cache until restart | management access only; it does not publish or authorize the runtime webhook |

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
- Hosted readiness rejects loopback PostgreSQL, and the production DB check distinguishes local writability from a shared operational target.
- New canonical chat writes keep recoverable question, answer, retrieval query, and handoff text in AES-GCM ciphertext while legacy text columns receive redacted display copies; remote migration parity is still required.
- Privacy deletion now resolves canonical sessions by lead, contact hash, or question hash; scheduled retention removes storage objects, canonical chat/retrieval rows, n8n audit rows, and handoff records together.
- KAXI now creates encrypted, message-linked handoff tasks after canonical persistence; database-level dedupe keeps one open task and one keyed contact per session/question/contact.
- KAXI now writes metadata-only n8n audit rows linked to canonical messages. A database trigger replaces any duplicated question, answer, or source payload with fixed placeholders, including writes from an older n8n version.
- Production readiness now verifies the latest migration ledger entry plus the attachment queue, retention, encryption, handoff ownership, and audit-sanitizer objects in the connected PostgreSQL database.
- A local drift rehearsal reproduced the live ledger/object split, then applied all 23 pending or unrecorded migrations with `prisma migrate deploy` without conflict; the resulting database passed the canonical schema-parity gate.
- The website widget now restores up to 20 canonical exchanges from the signed HttpOnly session, decrypts recoverable text only on the server, restores verified HTTPS citations, preserves failed request identities for idempotent retry, and resumes or exposes pending/failed attachments after refresh.
- Production-corpus readiness now supports independent total and official-source floors while preserving strict equal floors by default. The local reviewed 199-chunk corpus passes with 199/199 total embeddings and 195/195 official-source embeddings; the remaining four approved internal guidance chunks retain mapped public citations in the serving projection.
- Vercel production deployment `dpl_9Tar6c1Xx17EUFzL23gHszFt3Avv` serves `/api/health` with HTTP 200, includes the current verifier/readiness/session-history routes, and retains the verified responsive widget layout.
- Production session endpoints use the managed PostgreSQL-backed shared rate limiter and keep session responses `private, no-store` with `Vary: Cookie`.
- Production readiness confirms the managed database, latest migration, gateway signing, Typebot gateway authentication, private attachment storage, privacy controls, school metadata, and shared rate limiting. The managed LLM/OCR checks remain required until Kimi credentials are configured in production.
- Active n8n version `4d732810-a380-49ed-a5d8-ab434f0057bb` preserves verifier-first runtime, ingestion, and handoff paths; carries canonical `docId` through citations; expands multilingual retrieval queries; and classifies multilingual forged-document requests as high risk.
- The serving projection is 199/199 ready with zero pending or quarantined chunks. Evaluation run `ecf8361b-01be-41e8-8b29-0079ddd98602` passed 12/12 cases with 100% citation coverage across Korean, English, Vietnamese, and Mongolian.

## 3. Remaining Release Gaps

1. Production readiness remains HTTP 503 until `AI_PROVIDER=kimi` and the server-only Kimi key/base URL/model are configured in Vercel and the application is redeployed. The n8n credential is separate and cannot satisfy the KAXI application runtime.
2. Typebot remains unpublished. Clear historical smoke results, confirm its retention behavior, then publish and run the channel-specific normal/no-context/high-risk/handoff tests.
3. The n8n Error Workflow persists `ops_events`, but a human Slack/email destination is not yet confirmed and tested.
4. The 100 legacy compatibility rows remain intentionally retained. The guarded cutover was not run because this release request did not authorize it.
5. Malware scanning and a secondary OCR provider are still outstanding attachment hardening work.

## 3.1 Production Evidence

| Boundary | Result | Evidence |
| --- | --- | --- |
| deployment | pass | Vercel reports production deployment `dpl_9Tar6c1Xx17EUFzL23gHszFt3Avv` as `Ready` and aliases it to `https://kaxi.vercel.app` |
| health | pass | `GET /api/health` returned HTTP 200 with version `0.2.0` |
| readiness safety | pass/degraded | all database, gateway, Typebot, privacy, storage, source, school, rate-limit, and admin checks pass; only the two Anthropic-dependent checks fail |
| signed verifier route | pass | unsigned POST returns HTTP 401 and a correctly signed ingestion-purpose probe returns HTTP 200 |
| desktop UI | pass | page and widget fit 1280x720; widget rect is 430x608 at right edge 1256 of 1280 |
| mobile UI | pass | no horizontal overflow at 390x844; widget rect is 358x680 with 16px side margins |
| chat and RAG E2E | pass | production evaluation created signed chat sessions and completed KAXI -> n8n -> Supabase retrieval for 12/12 cases |
| serving projection | pass | 199/199 ready, 0 pending, 0 quarantined, 199 citation-ready |
| evaluation | pass | 12/12 cases, 100% citation coverage, and 100% forged-document high-risk routing across four locales |

## 3.2 Local Evidence

| Boundary | Result | Evidence |
| --- | --- | --- |
| Phase 0/1 production audit | pass | 17/17 checks passed with zero warnings or failures using total floor 199 and official-source floor 195 |
| approved corpus | pass | 93 approved documents, 199 approved chunks, and 199 embedded chunks |
| official-source corpus | pass | 90 approved official documents, 195 official chunks, and 195 official embeddings |
| visa document matrix | pass | 50/50 rows seeded idempotently with all 50 validation-rule rows and D-2, D-4, D-10, E-7, F-2, and F-5 coverage |
| corpus policy regression | pass | strict default official-source floor still rejects internal-only capacity; explicitly reviewed mixed floors pass without weakening URL, freshness, or vector-presence checks |
| n8n OAuth callback | pass, management only | the browser approval callback authorized the Codex n8n MCP connection; it is separate from KAXI HMAC runtime authorization and does not activate draft workflows |
| n8n workflow invariant | pass, published | active/current version `4d732810-a380-49ed-a5d8-ab434f0057bb` has 41 nodes, verifier-first webhook edges, no executable placeholder secret, canonical citations, and multilingual risk/query handling |
| Typebot session/handoff contract | pass, unpublished | runtime sends `typebot-{{Result ID}}`, the session variable is assigned the same value, handoff reuses that session plus `handoffToken`, and both server-side Webhook blocks carry the same configured gateway header; no bot publication occurred |

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

Release status on 2026-07-10: managed database configuration, backup, migrations, KAXI production deployment, n8n publication, serving sync, and governed evaluation are complete. Legacy cutover and Typebot publication were intentionally not run because they require separate explicit approval.

1. Configure a real Supabase pooler URL for runtime and `SUPABASE_DIRECT_URL` for migrations; verify both targets without logging credentials. Complete.
2. Back up canonical tables, load the real direct Supabase URL, run `bun run db:migrate:deploy`, and require the canonical schema-parity readiness check to pass. Complete; the pre-migration backup is retained under `.tmp/supabase-backups/`.
3. Add the remaining Vercel preview controls: Supabase runtime pooler URL, application-side image OCR key, durable Blob storage, admin session/MFA values, and a human alert destination. The separate Typebot, n8n, privacy, cron, and upload-signing secrets are already configured in preview.
4. Re-run the existing preview verification after database migration parity: readiness, citation pages, unsigned/signed n8n verification, chat session, attachment storage/worker, and mobile widget. Health and responsive layout already pass.
5. Obtain explicit approval and promote KAXI to production. Complete.
6. Re-verify the already configured Typebot gateway secret on both server-side webhook headers immediately before publication.
7. Verify the prepared n8n draft still has successful execution data disabled, failed execution data retained, metadata-only telemetry, encrypted handoff-update mappings, and no duplicate initial handoff write.
8. Remove or archive Typebot smoke/test results and document the Typebot retention processor agreement.
9. Publish the validated n8n draft and verify the capability contract. Complete.
10. Sync the serving projection to 199/199 in resumable batches. Complete.
11. Run the governed RAG evaluation; require at least 85% overall and 100% citation validity/high-risk routing. Complete at 12/12 and 100% citation coverage.
12. Execute the guarded legacy cutover only at 199/199 readiness. Ready but not authorized or executed.
13. Publish Typebot and run channel-specific tests for normal, no-context, high-risk, retry, duplicate handoff, and attachment flows. Not authorized or executed.

Acceptance: all required readiness checks pass, Typebot and widget return grounded answers, every turn has one canonical message and retrieval run, and no new critical runtime error appears during the observation window.

### P1: Reliability and Operations

- Add a real Slack/email notification after `ops_events` persistence, with deduplication and escalation severity.
- Add a durable cursor and per-source run ledger to the now bounded concurrent monitor so interrupted GitHub batches can resume precisely.
- Add a dedicated queue runner with a frequent scheduler on infrastructure that supports sub-daily jobs; retain opportunistic drains as recovery, not the only worker trigger.
- Add malware scanning before promotion from quarantine to processed storage.
- Add a tested secondary vision provider and failover policy; the primary Anthropic dependency is now explicit in readiness.
- Add synthetic daily probes for KAXI -> n8n -> Supabase and Typebot start/continue chat, tagged so monitoring data can be filtered.
- Add cross-device continuation only after user authentication and explicit consent; anonymous refresh hydration is now limited to the signed 24-hour browser session.

Acceptance: alert delivery is tested, attachment jobs survive process termination, daily health covers all external dependencies, and recovery steps are documented and rehearsed.

### P2: Answer and Retrieval Quality

- Attach an n8n OpenAI chat-model credential and replace the deterministic answer builder with schema-constrained generation. Keep retrieval and risk classification independent.
- Calibrate category-specific similarity thresholds against the evaluation dataset instead of using one global default.
- Add a reranking stage and explicit legal-source priority after hybrid candidate generation.
- Expand evaluation cases for D-2/D-4/D-10, extension/change, part-time work, rejection, forged documents, and multilingual paraphrases.
- Track citation precision, retrieval recall, no-context rate, answer-grounding score, risk recall, and handoff precision by workflow version.
- Add user feedback tied to `message_id` and feed only reviewed failures into evaluation cases.

Acceptance: grounded-answer pass rate is at least 90%, high-risk recall is 100% on the governed set, unsupported claims are zero in sampled review, and p95 answer latency stays within the agreed SLO.

### P3: Product and Admin Experience

- Localize widget strings and error states for Korean, English, Vietnamese, and Mongolian.
- Add upload progress, processing ETA, accessible error details, and persisted retry state.
- Build an operator queue for unhandled questions, low-confidence retrieval, attachment failures, and overdue handoffs.
- Show source URL, checked date, category, top score, n8n execution ID, and workflow version in the admin conversation detail.
- Add lead ownership, SLA timers, status transitions, internal notes, and resolution feedback.
- Add analytics for question categories, containment, handoff conversion, unanswered topics, latency, and cost.

### P4: Scale, Privacy, and Governance

- Replace hard-coded `tenant_id=default` with authenticated tenant resolution and tenant-scoped uniqueness/RLS tests.
- Add key rotation procedures for session, Typebot, n8n, encryption, hash, admin, and cron secrets.
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
  -> serving projection 199/199 [complete]
  -> evaluation pass [complete]
  -> guarded legacy cutover [not executed]
  -> Typebot publish [not executed]
  -> Typebot channel E2E and observation window [pending]
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
- n8n OpenAI chat-model credential and model choice.
- Legacy RAG cutover after measured evaluation success.
- Typebot publication after retention cleanup and channel verification.

Future secret transmission, Typebot publication, school import, or legacy cutover must not be performed implicitly. The KAXI deployment and n8n publication documented above were performed with explicit user approval.
