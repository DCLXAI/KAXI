# Improvement backlog — 2026-07-31 audit
Re-derived across six lenses (honesty, silent failure, security, i18n/UX, reliability,
tests) and adversarially verified: every finding below had an independent agent try to
refute it and fail. **40 candidates -> 23 confirmed, 17 refuted.** The refuted ones are
listed at the end so nobody re-raises them.

This file exists because the previous backlog lived only in a conversation and was lost
when it was compacted, which is part of why several of these sat unfixed. Delete an entry
when it ships; add the PR number when you pick one up.

## HIGH (3)

### POST /api/leads rejects every real diagnosis (nextActions/warnings are localized objects, the schema demands strings) and the store turns the 400 into a local-only "saved" lead
`src/app/api/leads/route.ts:37` — silent-failure · effort: small

**What breaks.** `recommendPath()` always returns `nextActions` as four `{ko,vi,mn,en}` objects (src/lib/data/diagnosis.ts:490-514, unconditional), and `warnings` as the same object shape. The zod schema declares both as `z.array(z.string())`, so `parseJsonBody` returns 400 for *every* completed diagnosis. `useLeadStore.saveDiagnosis` catches, writes a `local-${Date.now()}` lead into zustand and returns its id, so the wizard shows a successful save and the admin lead inbox receives nothing. Introduced 2959293/a9f5f6c (2026-07-11). NOTE: this is already recorded in project memory as `store-catch-hides-api-rejection` (found 2026-07-31) — the memory claims scripts/test-leads-validation.ts pins it, but that file has no warnings/nextActions case, and the schema is unchanged on main. Dedupe if a fix is already in flight.

**Fix.** Type the two fields as the localized object array the producer actually emits, and build the test fixture in scripts/test-leads-validation.ts from `recommendPath()` output rather than literals so engine/schema drift fails CI. Separately, make saveDiagnosis distinguish a 4xx (contract violation — surface it) from a network error (offline fallback).

<details><summary>Evidence</summary>

- src/app/api/leads/route.ts:37-38 `warnings: z.array(z.string())`, `nextActions: z.array(z.string())`
- src/lib/data/diagnosis.ts:45-46 `warnings: { ko; vi; mn; en }[]`, `nextActions: { ko; vi; mn; en }[]`
- src/lib/data/diagnosis.ts:490-514 nextActions is a hardcoded 4-element array of localized objects — never empty, so the mismatch always fires
- src/store/kbridge.ts:119 `if (!res.ok) throw new Error(...)` → :127-156 catch writes `local-${Date.now()}` and returns its id
- scripts/test-leads-validation.ts covers age/education/currentVisa only; no case builds its body from recommendPath()

</details>

### Retention's `questionRedacted: false` / `contactRedacted: false` guards can never match in production, so no chat log, partner question, or lead contact is ever redacted or purged
`src/lib/privacy/retention.ts:143` — silent-failure · effort: medium

**What breaks.** In production `DATA_ENCRYPTION_KEY` is required (readiness `privacy.encryption`), so `preparePiiField` always returns `redacted: true`, and every ChatLog/PartnerRequest/DiagnosisLead row is written with `questionRedacted`/`contactRedacted` already `true`. The three retention filters (`chatWhere` L143, `partnerWhere` L151, `leadRedactWhere` L158) all require the flag to be `false`, so `db.chatLog.updateMany`, `db.partnerRequest.updateMany` and `db.diagnosisLead.updateMany` match zero rows forever. The decryptable `questionCiphertext`/`contactCiphertext` survives the 90/180/365-day retention windows AND survives a user's explicit deletion request (`POST /api/privacy/delete-request` only sets `deleteRequestedAt` on ChatLog/PartnerRequest for a question-based request — ChatLog has no lead relation, so the cascade at L259 does not reach it). The cron then reports `chatLogs: 0, partnerRequests: 0, leadsRedacted: 0`, which reads as "nothing was due" rather than "the filter cannot match". The user was told 요청을 접수했습니다 / "Matching records will be verified and handled securely".

**Fix.** Stop overloading the write-time `redacted` flag as the retention idempotency guard. Gate the updateMany on `deletedAt: null` (or a dedicated `retentionProcessedAt`) instead, and add an assertion to scripts/test-privacy-guards.ts that a lead/chatLog/partnerRequest created through the real write path (which sets redacted=true) is still matched and scrubbed by enforcePrivacyRetention.

<details><summary>Evidence</summary>

- src/lib/privacy/retention.ts:143 `questionRedacted: false` (also :151 partnerWhere, :158 `contactRedacted: false`)
- src/lib/privacy/pii.ts:136 `redacted: encrypted || safePlaintext !== trimmed` — true whenever a ciphertext was produced
- src/lib/privacy/chat-log.ts:20 `questionRedacted: protectedQuestion.redacted` at write time; src/lib/partners/repository.ts:94,131 and src/app/api/leads/route.ts:138 do the same
- src/lib/privacy/config.ts:87 `encryptionOk = dataEncryptionKey.strong && ...`, required by src/lib/ops/readiness.ts:350 — production always has the key
- Verified by running preparePiiField with a key set: `chatlog questionRedacted = true | ciphertext stored = true`, `lead contactRedacted = true | ciphertext stored = true`
- scripts/test-privacy-guards.ts:253 asserts only `consentsExpired` and `canonicalChatSessionsDeleted`; it never asserts `retention.chatLogs`/`partnerRequests`/`leadsRedacted` > 0, so the dead filter is untested

</details>

### POST /api/privacy/delete-request lets any anonymous caller schedule an irreversible hard-delete of other people's records
`src/app/api/privacy/delete-request/route.ts:18` — security · effort: medium

**What breaks.** The endpoint is unauthenticated and accepts `leadId`, `contact`, or `question` as the sole "proof" of ownership — nothing verifies the requester controls any of them. `contact`/`question` are matched by `hashPii()`, which normalises with trim + lowercase + whitespace collapse, so one submission matches every record whose value is textually identical. POSTing `{"question":"안녕하세요"}` (or any common phrasing a chatbot receives repeatedly) marks every matching ChatLog, every ChatMessage's parent ChatSession, and every HandoffLead's session with `deleteRequestedAt`. The next nightly cron then HARD-deletes them: `db.diagnosisLead.deleteMany({ where: { deleteRequestedAt: { not: null } } })` (retention.ts:259) and, per session, `DELETE FROM handoff_updates / handoff_tasks` + `handoffLeadContact.deleteMany` + `handoffLead.deleteMany` + `chatSession.deleteMany` (retention.ts:110-117). Strangers' consultation histories, contact rows and 행정사 handoff tasks are destroyed with no undo and no record of who asked. `withdrawLeadConsentsForPrivacyRequest` (line 103) additionally marks a real student's partner-routing consents WITHDRAWN. The published notice promises the opposite in all four languages: "유효한 삭제 요청이 확인되면" / "deleted after retention or a verified deletion request" (public-legal-copy.ts:60,100), and the receipt the user sees says "일치하는 기록은 안전하게 확인한 뒤 처리합니다" / "Matching records will be verified and handled securely" (public-legal-copy.ts:49,89). No verification step exists anywhere in the code path.

**Fix.** Do not let an unverified request reach a destructive state. Minimum: require proof of control of the identifier before setting `deleteRequestedAt` — e-mail/SMS a one-time confirmation link to the submitted `contact` and only mark records when that link is opened, and drop the `question`-hash matcher entirely (an exact question string is not an identity claim; it is a lookup key anyone can guess). Until that lands, cap each request to a single verified subject and make retention soft-delete leads and sessions with an operator-visible quarantine window instead of `deleteMany`, so a bad request is recoverable.

<details><summary>Evidence</summary>

- src/app/api/privacy/delete-request/route.ts:18 — `if (!leadId && !contact && !question) return jsonError(...)` is the only gate on the route; there is no session, token, OTP or ownership check
- src/app/api/privacy/delete-request/route.ts:67-93 — `const questionHash = hashPii(question)` then `db.chatLog.updateMany({ where: { questionHash }, data: { deleteRequestedAt: now } })` plus `db.chatMessage.findMany({ where: { questionHash } })` and `db.handoffLead.findMany({ where: { questionHash } })` to collect sessionKeys — all cross-user by construction
- src/app/api/privacy/delete-request/route.ts:95-101 — those collected keys go straight into `db.chatSession.updateMany({ where: { sessionKey: { in: [...] } }, data: { deleteRequestedAt: now } })`
- src/lib/privacy/pii.ts:27-29,50-53 — `normalizeForHash` lowercases/trims/collapses whitespace before the HMAC, so identical questions from different users collide by design
- src/lib/privacy/retention.ts:167-169,259 — `leadDeleteWhere = { deleteRequestedAt: { not: null } }` feeds `db.diagnosisLead.deleteMany({ where: leadDeleteWhere })` (hard delete, not soft)
- src/lib/privacy/retention.ts:64-78,110-117 — sessions with `deleteRequestedAt` are hard-deleted along with handoff_updates, handoff_tasks, handoffLeadContact and handoffLead rows

</details>

## MEDIUM (9)

### In-Korea D-10/E-7 filing costs are rendered under the "Estimated cost (6 months)" label
`src/components/diagnosis/DiagnosisResult.tsx:97` — honesty · effort: small

**What breaks.** A user picking "채용이 확정됐어요 (E-7 전환)" / "I have a job offer (E-7 switch)" sees the headline result card read "예상 비용 (6개월) — 1,000,000 KRW" (D-10 job-seeking: 1,500,000 KRW). That number is a status-change filing cost, not six months of living in Korea. On a product whose pitch is honest cost comparison against brokers, the single most prominent number on the diagnosis result is off by an order of magnitude for two of the six paths. The same mislabel repeats in the budget-gap warning, which tells an already-employed E-7 switcher their budget is short of "the estimated 6-month cost" and to "recheck tuition, housing, and settlement costs", and in the readiness factor label "Budget below estimated 6-month cost".

**Fix.** Make the cost label path-dependent instead of a single global string: add a `costBasis: "six_month_study" | "filing"` field to PathProfile, carry it on PathRecommendation, and pick the translation key from it in DiagnosisResult (plus the budget-gap warning text and readiness_factor_budget_gap). The comment at diagnosis.ts:131 already names the distinction; the display layer just never learned it.

<details><summary>Evidence</summary>

- src/lib/data/diagnosis.ts:131-133 comment on goal_in_korea_d10: "Application-cost scale (not study-cost): baseCost/basePrepMonths reflect a status-change filing, not tuition." goal_in_korea_d10.baseCost = 1_500_000 (line 138), goal_in_korea_e7.baseCost = 1_000_000 (line 155).
- src/lib/i18n/translations.ts:185 — result_estimated_cost: { ko: "예상 비용 (6개월)", en: "Estimated cost (6 months)" }; identical in messages/{ko,en,vi,mn}.json:129.
- src/components/diagnosis/DiagnosisResult.tsx:97-98 renders `t("result_estimated_cost")` over `result.estimatedCost` unconditionally for every pathKey, including goal_in_korea_d10/goal_in_korea_e7 (the only path-specific branch, line 100, adds a /docs CTA and does not touch the cost label).
- src/lib/data/diagnosis.ts:258-261 rule:budget-gap message hardcodes "예상 6개월 준비비" / "estimated 6-month cost" / "학비·기숙사·초기정착비" for all paths.
- src/lib/data/readiness.ts:143-145 uses 1_000_000/1_500_000 as `estimatedBase`, and a breach emits factor id `budget_gap`, translated at src/lib/i18n/translations.ts:202 as "Budget below estimated 6-month cost".

</details>

### remapCitations leaves citation numbers absent from usedSourceIndexes untouched, silently re-pointing them at the wrong source
`src/lib/chat/direct-lexical-fallback.ts:862` — honesty · effort: small

**What breaks.** After generation, the answer is renumbered so [n] matches the trimmed `sources` array. Any [n] the model wrote but omitted from usedSourceIndexes falls through the map and is emitted verbatim. If the model cites [1] and [3] but reports usedSourceIndexes=[3], the map is {3→1}: [3] correctly becomes [1] and [1] stays [1] — so two claims from two different documents now both point at document 3's title, URL and 확인일 in the rendered 근거 list. In the milder case (model cites [2], usedSourceIndexes=[1]) the answer carries a [2] with only one source listed. Nothing validates this; the guardrail only checks retrieval scores, not citation/source agreement. This is the live chat path (typebot-rag and the n8n rag-runtime both call runDirectRagFallback).

**Fix.** Make the unmapped branch drop the marker instead of preserving it — `return mapped ? `[${mapped}]` : ""` — or, stricter, treat any citation not present in usedSourceIndexes as invalid_generation and fall back to the extractive response, the way usedDocuments.length === 0 already does at line 1286.

<details><summary>Evidence</summary>

- src/lib/chat/direct-lexical-fallback.ts:859-866 — `const mapped = citationMap.get(Number(rawIndex)); return mapped ? `[${mapped}]` : citation;` — the unmapped branch preserves the stale index.
- src/lib/chat/direct-lexical-fallback.ts:1296-1303 — `usedDocuments` and therefore `sources` are built strictly from usedSourceIndexes, so the rendered 근거 list has no entry for the dropped index.
- src/lib/chat/grounded-rag-answer.ts:269-271 filters usedSourceIndexes to `index >= 1 && index <= Math.min(request.documents.length, 3)`, so the two lists can diverge even when the model was internally consistent (it cited [3] with only 2 documents supplied).
- The model-side guarantee is prompt-only: grounded-rag-answer.ts rule 6, "Every cited index must be included in usedSourceIndexes" — with no post-hoc check.
- scripts/test-rag-direct-fallback.ts only ever exercises usedSourceIndexes: [1] (lines 1212, 1272, 1323), so the divergent case has never been tested.

</details>

### Unauthenticated POST /api/partner-requests overwrites an arbitrary DiagnosisLead's name and contact from a client-supplied leadId
`src/lib/partners/repository.ts:122` — security · effort: small

**What breaks.** `leadId` comes straight off the request body (partner-requests/route.ts:15) and is never checked against the caller's session or cookie. `createPartnerRequest` then runs `db.diagnosisLead.update({ where: { id: finalLeadId }, data: { nickname, contact, contactCiphertext, contactHash, contactType } })` on whatever id was sent. Anyone who learns another user's lead id — it is handed to the browser by `POST /api/leads` (leads/route.ts:155) and kept in client state (store/kbridge.ts:257) — can replace that student's stored phone/e-mail with their own. The overwritten contact is exactly what the admin inbox and partner inbox reveal (`revealPii: true`, leads/route.ts:70, partner/requests/route.ts:18), so the 행정사 is then handed the attacker's contact under the victim's case. Line 115 also runs `ensurePartnerRoutingConsentForLead` first, so KARXY records a third-party-provision consent that the actual person never gave — a fabricated consent record in a product whose position is legal honesty.

**Fix.** Only accept a `leadId` the caller can prove it owns: resolve the lead from the authenticated user (`getCurrentKaxiUser()` → `DiagnosisLead.userId`) or from the signed `kaxi_chat_session` cookie, and fall back to `createAnonymousLead()` whenever the supplied id does not belong to the caller. Never let the request body select which existing lead row gets its nickname/contact rewritten.

<details><summary>Evidence</summary>

- src/app/api/partner-requests/route.ts:9-21 — POST has only `rateLimit({key:"partner:create", limit:10, windowMs:3600000})`; no session, cookie or token is read, and `leadId` is destructured raw from the body
- src/lib/partners/repository.ts:83 — `let finalLeadId = input.leadId || "anonymous"` with no ownership lookup
- src/lib/partners/repository.ts:122-136 — `if (name || contact) { await db.diagnosisLead.update({ where: { id: finalLeadId }, data: { ...(name ? { nickname: name } : {}), ...(contact ? { contact, contactCiphertext, contactHash, contactRedacted, contactType } : {}) } }) }`
- src/lib/partners/repository.ts:115-120 — `ensurePartnerRoutingConsentForLead({ leadId: finalLeadId, ... })` writes consent evidence against the same unverified lead
- src/store/kbridge.ts:250-262 — the client sends `leadId: leadId || "anonymous"`, confirming the id is browser-held and attacker-supplyable
- src/app/api/leads/route.ts:70 and src/app/api/partner/requests/route.ts:18 — both serialize with `{ revealPii: true }`, so the overwritten contact is what operators and partners actually see

</details>

### Every page is served as <html lang="ko"> including /vi, /mn and /en
`src/app/layout.tsx:57` — i18n-ux · effort: small

**What breaks.** Loading /vi/agent, /mn/diagnose or /en/schools serves Vietnamese, Mongolian and English content inside a document declared as Korean. A screen reader switches to Korean speech synthesis and reads Vietnamese diacritics and Cyrillic as Korean; browsers do not offer to translate the page; search engines index all four locales as Korean, which directly damages the Vietnamese- and Mongolian-language discovery channel this product depends on; and CJK line-breaking/font rules are applied to Latin and Cyrillic text.

**Fix.** Smallest change: in src/app/[locale]/layout.tsx render a tiny client component that sets `document.documentElement.lang = locale` on mount, or set `lang` via the locale-aware layout. Cleanest: move <html>/<body> into a locale-aware layout so the attribute is correct in the server-rendered HTML (which is what SEO reads).

<details><summary>Evidence</summary>

- src/app/layout.tsx:56-57 `<html lang="ko"` — grep for `<html` across src/ returns this single occurrence.
- src/app/[locale]/layout.tsx renders only `<NextIntlClientProvider>` around children; it emits no <html> element, so it cannot override the root.
- No runtime correction exists: grep for `documentElement.lang` across src/ returns nothing.
- The codebase already knows this matters and does it correctly elsewhere — src/app/student/page.tsx:73, src/app/partner/page.tsx:25, src/app/partner/cases/[id]/page.tsx:40 and src/components/auth/AuthComplete.tsx:71 all set `lang={locale}` on their <main>. Only the entire public [locale] tree is missed.

</details>

### The Claude gateway silently discards every `timeoutMs` budget and inherits the SDK's 10-minute timeout plus 2 retries
`/Users/sunsu/Desktop/KAXI/src/lib/ai/claude-gateway.ts:104` — reliability · effort: small

**What breaks.** `/api/typebot-rag` (maxDuration 60) budgets its grounded answer at 7.5s and its retry at 6s. Those numbers only exist on the Kimi leg. When the request lands on Claude — the default backend whenever Kimi is not explicitly configured, and always the failover leg taken when Kimi is already slow — the call is bounded by nothing the app chose. Kimi's 55s default burns first, failover hands to Claude, Claude runs to the SDK's own defaults, and Vercel kills the invocation at 60s. The user gets a raw platform 504 instead of KARXY's designed 'we could not ground this answer' fallback, and the ops_event that documents the fallback (`typebot-rag/route.ts:715`) is never written, so a provider outage looks like nothing happened.

**Fix.** Add `timeoutMs` to `ClaudeGatewayOptions` and thread it through: construct the client with `new Anthropic({ apiKey: key, maxRetries: 0 })` and pass `{ timeout: options.timeoutMs }` (or an `AbortSignal`) to `messages.create`/`messages.stream`. Keeping `maxRetries` at the SDK default silently multiplies whatever timeout is set.

<details><summary>Evidence</summary>

- /Users/sunsu/Desktop/KAXI/src/lib/ai/llm-types.ts:14 — `LlmGatewayOptions.timeoutMs` is part of the gateway contract
- /Users/sunsu/Desktop/KAXI/src/lib/ai/openai-compatible-gateway.ts:262 — the Kimi leg honors it: `providerFetch(..., process.env, options.timeoutMs)`
- /Users/sunsu/Desktop/KAXI/src/lib/ai/claude-gateway.ts:15-25 — `ClaudeGatewayOptions` has no `timeoutMs` field at all, so the value is dropped at the type boundary
- /Users/sunsu/Desktop/KAXI/src/lib/ai/claude-gateway.ts:104 — `new Anthropic({ apiKey: key })`; no `timeout`, no `maxRetries`
- /Users/sunsu/Desktop/KAXI/src/lib/ai/claude-gateway.ts:182-195 — `generateClaudeText` passes no signal and no per-request timeout to `messages.create`
- /Users/sunsu/Desktop/KAXI/node_modules/@anthropic-ai/sdk/client.d.ts:195,198 — installed SDK defaults are `timeout=10 minutes` and `maxRetries=2`; line 87 warns "request timeouts are retried by default, so in a worst-case scenario you may wait much longer than this timeout"

</details>

### The grounded-answer honesty guard (downgrade to no_context) has no test — every case in test:grounded-answer uses a valid, cited payload
`scripts/test-grounded-answer.ts:35` — tests · effort: small

**What breaks.** grounded-rag-answer.ts:264-278 is the single place that stops an ungrounded model reply from reaching a user as a cited answer: it drops citation indexes outside 1..min(documents,3) and then downgrades to `no_context` when `!output.supported`, the answer is empty, or nothing survived the index filter. Delete `!output.supported ||`, delete `|| usedSourceIndexes.length === 0`, or drop the range filter, and `bun run ci` stays fully green. Production would then return status "answered" for (a) a model that explicitly said the sources do not support the question, (b) an answer citing nothing, and (c) an answer whose [2] marker points at a source that was never supplied — all rendered by the consult/agent UI next to a verified-sources list and government URLs.

**Fix.** Add three assertions to scripts/test-grounded-answer.ts driving the real generateGroundedRagAnswer: script a `{supported:false, answer:"..."}` payload and assert status==="no_context"; script `{supported:true, usedSourceIndexes:[]}` and assert "no_context"; script `{supported:true, usedSourceIndexes:[2]}` with a single document and assert "no_context" (not an answered result carrying a dangling [2]).

<details><summary>Evidence</summary>

- scripts/test-grounded-answer.ts:35 — the only assertion labelled "the grounding guarantee is never rescued" tests parseGroundedModelOutput() returning null when the `supported` key is absent. That is the parser, not the guard.
- scripts/test-grounded-answer.ts:38-70 — every generateGroundedRagAnswer() case uses the single constant VALID = {supported:true, answer:…, usedSourceIndexes:[1]}; the file only varies retry/throw/not_configured plumbing. `supported:false`, `usedSourceIndexes:[]` and an out-of-range index never appear.
- src/lib/chat/grounded-rag-answer.ts:264 and :274 — the filter and the `if (!output.supported || !output.answer || usedSourceIndexes.length === 0)` downgrade.
- scripts/test-rag-direct-fallback.ts:1339-1345, :1381-1390, :1425-1432 — the only other coverage passes `generateAnswer: async () => ({ status: "no_context", … })`, i.e. a stub that hands the caller the verdict. The real function is never asked to produce it.
- Probe against the real module (scratchpad, repo unmodified) confirms today's behaviour is correct and unpinned: supported:false -> no_context, usedSourceIndexes:[] -> no_context, cites [2] with 1 document -> no_context.
- `bun run test:grounded-answer` exits 0 today.

</details>

### SLA watchdog reads an unordered 500-row window of each queue, so breaches past the cap never alert while the run still reports ok:true
`src/lib/ops/sla-watchdog.ts:141` — silent-failure · effort: medium

**What breaks.** `scanHandoffQueue` selects non-terminal `handoff_tasks` with `.limit(500)` and no `.order(...)`; `scanPartnerRequestQueue` and `scanEscalationCaseQueue` use Prisma `take: 500` with no `orderBy`. Once a queue holds more than 500 open items (only resolved/closed/duplicate leave the handoff queue, so this accumulates monotonically for an operator who doesn't close items), the rows outside the arbitrary window are never classified. They contribute nothing to `breached`/`approaching` and nothing to `failed`, so `runSlaWatchdog` returns `ok: true` and skips the `sla.watchdog_failed` event — a breached SLA becomes permanently invisible rather than late. Because the window is unordered, the same item can be excluded on every run.

**Fix.** Order each query by `slaDueAt`/`due_at` ascending (oldest deadline first) so the cap can only ever hide the least-urgent items, and page until exhausted or record the truncation in `SlaQueueCounts` (e.g. a `truncated` field that feeds `ok`).

<details><summary>Evidence</summary>

- src/lib/ops/sla-watchdog.ts:137-141 `.select(...).not("status","in","(resolved,closed,duplicate)").limit(500)` with no order
- src/lib/ops/sla-watchdog.ts:221 `take: 500` (partnerRequest) and :284 `take: 500` (escalationCase), neither with orderBy
- src/lib/ops/sla-watchdog.ts:358 `const ok = Object.values(queues).every((counts) => counts.failed === 0)` — truncation never increments failed
- src/lib/ops/sla-watchdog.ts:48-51 the type comment states a failure "must always show up here -- never as quietly-zeroed counts", which truncation violates

</details>

### Citation source pages render Korean-only body text although vi/mn translations exist in the corpus
`src/app/sources/[slug]/page.tsx:70` — i18n-ux · effort: medium

**What breaks.** A Vietnamese student on /vi/agent asks about brokers, gets an answer citing the KARXY safety guideline, clicks citation [2] — SourceAnnotations renders it as a real link because the URL is https://kaxi.vercel.app/sources/safety-guideline, not internal:// — and lands on a page that is 100% Korean. The page hardcodes document.title.ko (line 70) and document.content.ko (line 72), offering only an `English` <details> at line 76. Vietnamese and Mongolian versions of that exact text exist and are never shown. The page's own disclaimer (lines 60-62: this is internal analysis, not a legal interpretation or a visa guarantee) is Korean-only, so the honesty caveat is invisible to the two headline audiences, and the back link at line 44 is hardcoded href="/ko", dumping them onto the Korean site.

**Fix.** Accept a locale (a `?lang=` param read in the page, matching how /login does it, or move the route under [locale]) and index `document.title[lang]` / `document.content[lang]`, keeping the other three in the disclosure. Route the page chrome and the disclaimer through tr() keys, and make the back link `/${lang}`.

<details><summary>Evidence</summary>

- src/app/sources/[slug]/page.tsx:70 `{document.title.ko}` and :72 `{document.content.ko}` — no locale is read anywhere in the file; there is no lang/locale param or search param.
- src/app/sources/[slug]/page.tsx:76 `{document.content.en}` is the only alternative rendered, behind a <details summary>English</details>.
- Corpus coverage verified by running the module: `cost-breakdown`, `visa-guarantee-warning`, `broker-redflags` each have title langs [ko, vi, mn, en] and content langs [ko, vi, mn, en] in src/lib/data/knowledge-corpus.ts.
- src/lib/data/source-metadata.ts:919 and :926 publish these two internal sources with `url: `${siteBaseUrl()}/sources/cost-analysis`` and `/sources/safety-guideline`, i.e. real public URLs.
- src/components/kbridge/SourceAnnotations.tsx:154 and :189 render any source whose url does not start with `internal://` as a clickable <a href>, so these pages are on the user's click path from every locale.
- src/app/sources/[slug]/page.tsx:44 `<a href="/ko">`, :48 `상담 답변 출처`, :52/:56 `검토일`/`다음 검토일`, :60-62 Korean-only disclaimer.

</details>

### The same document is shown two different "review by" dates depending on which retrieval leg surfaced it

`src/lib/chat/shared-openai-rag.ts:70` — honesty · effort: small

**What breaks.** Two review horizons exist and disagree. Retrieval and the serving
projection hardcode **180 days** — eight migration files plus
`serving-projection.ts:435` (`180 * 24 * 60 * 60 * 1000`) — while governance uses
**92 days**, configurable through `KNOWLEDGE_REVIEW_AFTER_DAYS`
(`src/lib/knowledge/freshness.ts:1`). The citation metadata a user sees is computed
from whichever path produced it: `reviewAfter()` adds +180d on the serving path,
`reviewAfterDate()` applies the 92-day config on the repository path. So one
document can be cited to two users with two different 재검토 예정일. A document
92–180 days stale is simultaneously *servable* by the SQL gate and *stale* by the
governance check.

**Fix.** Give the horizon one definition. Export it from `freshness.ts`, pass it
into the SQL functions the way the legacy path already does — `pgvector-rag.ts:517`
passes `review_max_age_days` from `knowledgeReviewMaxAgeDays()`, so the pattern
exists — and delete the hardcoded 180s. If the two horizons are deliberately
different, they need different names and the user-facing date must state which one
it is.

<details><summary>Evidence</summary>

- `src/lib/chat/shared-openai-rag.ts:70-74` — `date.setUTCDate(date.getUTCDate() + 180)`
- `src/lib/knowledge/repository.ts:144-146` — `knowledgeReviewAfterDate()`, i.e. the 92-day config
- `src/lib/knowledge/freshness.ts:1` — `DEFAULT_KNOWLEDGE_REVIEW_MAX_AGE_DAYS = 92`
- `src/lib/knowledge/serving-projection.ts:435` — `180 * 24 * 60 * 60 * 1000`
- 8 migration files contain `interval '180 days'` in the retrieval predicate
- `src/lib/embeddings/pgvector-rag.ts:517` — the legacy path already parameterises the horizon, showing the newer path regressed on this

</details>

**Found by** the 2026-08-01 strengths assessment, as the caveat on an otherwise
strong design: retrieval re-derives document eligibility from the canonical row on
every query, but the predicate is restated in at least seven places with nothing
pinning them equal.

## LOW (12)

### The LLM-failure path in /api/ai/chat staples a fabricated [1] onto a static FAQ answer and attaches a retrieved official source to it
`src/app/api/ai/chat/route.ts:113` — honesty · effort: small

**What breaks.** When the answer LLM throws (timeout, gateway error) and the question keyword-matched an FAQ rule, `buildCitedFallbackAnswer(faq[lang], top, lang)` appends " [1]" to a canned FAQ sentence that was never derived from any retrieved document, then renders "📚 출처:\n- [1] {top.title} — {source} <{source_url}> (확인일 {last_checked_at})". Ask "비자 보장해주는 브로커" and the FAQ rule fires; the top retrieved chunk could be any 출입국관리법 doc, and the user is shown a specific claim marked [1] next to a law.go.kr URL that does not say it. Because the stapled marker makes hasNumericCitation() true, `grounded` comes back true and guardAnswerFields() does not refuse — the fabricated citation defeats the very check built to catch it.

**Fix.** Drop the invented citation from the FAQ branch: in buildCitedFallbackAnswer, emit the FAQ text with no [n] marker and no source line of its own, keeping [1] only on the genuine `excerpt` section. That leaves grounded=false for a FAQ-only answer, which is correct and lets the existing guardrail refuse it.

<details><summary>Evidence</summary>

- src/app/api/ai/chat/route.ts:112-116 — on `catch (llmErr)`: `answer = buildCitedFallbackAnswer(faq[lang], top, lang)` where `top = docs[0]`.
- src/app/api/ai/chat/route.ts:216 — `const sections = baseAnswer?.trim() ? [`${baseAnswer.trim()} [1]`] : [];` — the marker is invented, not produced by any model reading the doc.
- src/lib/data/faq.ts:1 ("AI 도우미 — 룰 기반 FAQ (데모)") and findFAQ at faq.ts:84-93: a pure `q.includes(keyword)` scan over a static table, entirely independent of `docs`.
- src/lib/knowledge/citations.ts:70-77 documents this exact regression as already fixed there: "This used to staple a `[1]` onto the first line when the model had not cited — which made an ungrounded answer read as a sourced legal statement next to a law.go.kr URL... so the marker is never invented now." The sibling helper in the chat route still does it.
- src/app/api/ai/chat/route.ts:126-136 — `guardAnswerFields({ ..., grounded: cited.grounded })`; cited.grounded is true because citations.ts:99 tests hasNumericCitation on the stapled body, so the refusal branch (response-guardrail.ts:118) never fires.
- Reachability note: /api/ai/chat is a deployed public POST route with its own rate limit and daily quota, but no shipped component currently calls it — AIAssistant.tsx:106 is the only caller and AIAssistant is never imported anywhere (grep for `<AIAssistant` / `kbridge/AIAssistant` returns only its own definition).

</details>

### Readiness applies the degree-study Korean penalty, and its "insufficient for degree program" label, to the D-10 career path
`src/lib/data/readiness.ts:117` — honesty · effort: small

**What breaks.** A user whose goal is "career" is routed to the D-10 job-seeking path, which is not a degree program. If their Korean is none/topik1 they get a -18 factor rendered as "한국어 수준이 학위과정에 부족함" / "Korean level insufficient for degree program" — the largest single deduction on their readiness card, justified by a reason that does not apply to the track they were recommended. The comment three lines above states the opposite intent for exactly this reason.

**Fix.** Restrict the branch to `visaType === "D-2"`, matching the good_korean_d2 branch on the next line and the factor's own label. If a Korean-level signal is wanted for D-10, give it a separate id and translation that says what it actually means for a job-seeking track.

<details><summary>Evidence</summary>

- src/lib/data/readiness.ts:112-115 comment: "The weight and the factor id below are both calibrated for degree study, so they are not applied to the in-Korea conversion tracks — a mis-labelled factor is worse than a missing one."
- src/lib/data/readiness.ts:117 — `if (!inKorea && (visaType === "D-2" || visaType === "D-10") && ...)`; `inKorea` (line 108) is only true for in_korea_job/in_korea_employment, so goal "career" → readinessVisaType "D-10" (line 83) enters the branch.
- src/lib/data/readiness.ts:121 pushes id "korean_low_for_degree", translated at src/lib/i18n/translations.ts:201 as "한국어 수준이 학위과정에 부족함" / "Korean level insufficient for degree program".
- The card renders the top-5 factors by |delta| (src/components/kbridge/ReadinessScoreCard.tsx:105, 122-124), so a -18 factor is always visible.

</details>

### The four operator alerts that say "a customer is waiting" are fired without await and without `after()`, immediately before the response returns
`src/app/api/leads/route.ts:144` — silent-failure · effort: small

**What breaks.** `sendOpsAlert(...)` is called as a bare floating promise one statement before `return NextResponse.json(...)`. On Vercel the invocation can be frozen or torn down once the response is sent, so the outbound POST to Slack/Resend may never complete — and the `.catch(err => console.warn(...))` means even a delivered-but-rejected attempt leaves no durable record. The same shape is in three more places, covering new lead, new partner request, new document upload, and new high-risk escalation case — i.e. every notification a solo operator depends on to know work arrived. The codebase already knows the fix: src/app/api/chat-attachments/route.ts:43 and src/app/api/ai/unified/route.ts:300 wrap the identical post-response work in `after()`.

**Fix.** Wrap each of the four `sendOpsAlert(...)` calls in `after(async () => { ... })` (import `after` from `next/server`), and route them through `recordOpsEvent` so an undelivered alert still leaves an ops_events row the admin panel shows.

<details><summary>Evidence</summary>

- src/app/api/leads/route.ts:144-153 floating `sendOpsAlert(...)` then :155 `return NextResponse.json(...)`; the file does not import `after` (:1)
- src/lib/partners/repository.ts:189-198 same pattern for `partner_request_created`
- src/app/api/documents/upload-direct/route.ts:73-82 same pattern for `document_uploaded`
- src/lib/cases/high-risk-hook.ts:43-52 same pattern for `high_risk_case_created`
- Contrast: src/app/api/chat-attachments/route.ts:43-54 wraps `recordOpsEvent` in `after(async () => ...)`

</details>

### Middleware login redirect drops both locale and destination, ignoring the helper written to prevent exactly this
`src/lib/supabase/policy.ts:40` — i18n-ux · effort: small

**What breaks.** A logged-out Vietnamese student opens a bookmarked /student (or their session cookie expires mid-session). The proxy redirects them to bare `/login`. UnifiedAuthForm defaults `requestedLocale` to "ko" when ?lang is absent (line 47), so they get a fully Korean sign-in form; and because `next` is absent too, after signing in they are sent to `/student` instead of back to the page they asked for (line 75). This is the most common way an unauthenticated user reaches /login, and it is the one path that bypasses the fix.

**Fix.** Have resolveProtectedPageRedirect (or the middleware call site, which has the NextRequest) build the target with loginHref(), passing the NEXT_LOCALE cookie value as the locale and `req.nextUrl.pathname + req.nextUrl.search` as `next`.

<details><summary>Evidence</summary>

- src/lib/supabase/policy.ts:40 `return isProtected ? "/login" : null;` — no lang, no next.
- src/lib/supabase/middleware.ts:10-16 takes that string verbatim: `NextResponse.redirect(new URL(redirectPath, req.url))`.
- src/lib/ui/login-href.ts:8 exports `loginHref(locale, next)` and its own header comment states the bug: "Call sites kept dropping one or the other — a Vietnamese student mid-upload would land on a Korean form and then get sent to the dashboard instead of back to the task."
- loginHref is used at src/components/kbridge/Documents.tsx:287 and src/components/agent/AgentLoginNudge.tsx:31, but grep shows it is never used on the middleware path.
- src/components/auth/UnifiedAuthForm.tsx:47 `searchParams.get("lang") || "ko"` and :75 `router.replace(data.redirectTo || "/student")` confirm both fallbacks.

</details>

### The RAG evidence panel is half-translated: Vietnamese/Mongolian readers get English for the labels that carry the meaning
`src/components/kbridge/SourceAnnotations.tsx:35` — i18n-ux · effort: small

**What breaks.** A Mongolian user expands the source panel under an AI answer. The disclosure summary is correct Mongolian ("Эх сурвалжийн үндэслэлийг харах"), but everything inside it is English: the panel heading "Source links and answer basis", the per-source kind badges "Official"/"Gov"/"Law"/"School", the "Source" external link, "Answer basis: ", "Source excerpt: ", "checked 2026-07-11" and "review after …". The panel that exists to prove the answer is grounded is the least readable part of the answer.

**Fix.** Move these ~11 strings into src/lib/i18n/translations.ts and call tr(key, lang). The dictionary already enforces all four locales through scripts/test-i18n-parity.ts, so the gap cannot reopen.

<details><summary>Evidence</summary>

- Four-locale helpers in the same file prove the intent and the omission: reviewStatusText handles ko/vi/mn/en at :44-50, detailsLabelText at :54-58.
- ko/en-only in the same file: :35 `lang === "ko" ? "학교" : "School"`, :37 `"법령" : "Law"`, :39 `"정부 공식" : "Gov"`, :41 `"공식" : "Official"`, :51 `` `검수 ${status}` : `review ${status}` ``, :66 vs the fallthrough `` `checked ${checked}` ``, :73 `` `재검토 …` : `review after …` ``, :149 `"출처 링크와 답변 근거" : "Source links and answer basis"`, :227 `"원문" : "Source"`, :235 `"답변 근거: " : "Answer basis: "`, :242 `"근거 발췌: " : "Source excerpt: "`.
- The caller passes an equally ko/en title: src/components/kbridge/AIAssistant.tsx:219 `title={lang === "ko" ? "출처 및 답변 근거" : "Sources and basis"}`.

</details>

### The app-wide error boundary is Korean-only, including its retry button
`src/app/error.tsx:10` — i18n-ux · effort: small

**What breaks.** Any runtime error on any route — /vi/cost, /en/schools, /mn/docs — renders this single global boundary. A non-Korean user sees a Korean heading ("잠깐 문제가 생겼어요"), a Korean body sentence, and a Korean recovery button ("다시 시도"). The only text they can read is the trailing English clause appended to the body line, which does not tell them the button is what retries.

**Fix.** error.tsx is a client component that cannot read params, but it can read `document.documentElement.lang` or the first path segment; at minimum give the button and heading the same four-language single-line treatment already used in not-found.tsx:12-13.

<details><summary>Evidence</summary>

- src/app/error.tsx:10 `잠깐 문제가 생겼어요`, :11 `일시적인 오류예요. 다시 시도해 주세요. · Something went wrong.`, :14 button label `다시 시도`, :8 KaxiCat `label="놀란 고양이"` (the accessible label).
- This is the only error boundary in the app — `find src/app -name error.tsx -o -name global-error.tsx` returns just this file, so no locale-scoped boundary shadows it.
- The sibling not-found.tsx at least lists all four languages in its body (`Page not found · Không tìm thấy trang · Хуудас олдсонгүй`), showing the four-way treatment was applied there and skipped here.

</details>

### The 404 page's recovery CTA hardcodes /ko/diagnose, switching non-Korean visitors to the Korean site
`src/app/not-found.tsx:17` — i18n-ux · effort: small

**What breaks.** A Vietnamese visitor mistypes or follows a stale /vi/... link, hits the 404, and the only forward action offered is a Korean-labelled button ("3분 진단 시작") that navigates to /ko/diagnose. Their locale is silently discarded: they land on the Korean diagnosis wizard. The other button ("홈으로", line 16) is also Korean-only and goes to `/`.

**Fix.** Change the href to `/diagnose` so the intl middleware negotiates the locale, and give both button labels the same four-language treatment already used two lines above.

<details><summary>Evidence</summary>

- src/app/not-found.tsx:17 `<Link href="/ko/diagnose" …>3분 진단 시작</Link>` — the locale prefix is a literal.
- src/app/not-found.tsx:16 `<Link href="/" …>홈으로</Link>`.
- The unprefixed path would have been negotiated correctly: src/proxy.ts:7 lists `/diagnose` in PUBLIC_LEGACY_PATHS and :27-33 routes it through next-intl's middleware, which resolves the visitor's locale.
- The body copy just above (lines 12-13) does list all four languages, so the page's authors clearly intended it to serve every locale — only the CTAs were missed.

</details>

### Route-segment loading spinner announces "불러오는 중" to every locale
`src/app/[locale]/loading.tsx:6` — i18n-ux · effort: small

**What breaks.** This is the loading UI for the whole [locale] segment, so it renders on /vi, /mn and /en navigations. Its only text is the mascot's accessible label, hardcoded Korean — a screen-reader user on /en/schools hears Korean announced during every route transition, and (compounded by the <html lang="ko"> issue above) hears it through a Korean voice.

**Fix.** Read the locale from params and use an existing translations.ts key for "loading", or omit the label so the spinner is treated as decorative rather than announcing the wrong language.

<details><summary>Evidence</summary>

- src/app/[locale]/loading.tsx:6 `<KaxiCat state="running" size={56} label="불러오는 중" />`.
- src/components/brand/KaxiCat.tsx documents `label` as the accessibility label ("접근성 라벨. 없으면 장식 요소로 처리(aria-hidden)"), so this string is exposed to assistive tech and is the segment's only announced content.
- The locale is available here — loading.tsx sits inside app/[locale] alongside layout.tsx, which already awaits `params` for the locale.

</details>

### Handoff SLA breaches alert before claiming the stamp — the concurrency fix applied to the other two queues was never applied here
`/Users/sunsu/Desktop/KAXI/src/lib/ops/sla-watchdog.ts:169` — reliability · effort: small

**What breaks.** `scanHandoffQueue` calls `alertBreach()` first and only then re-reads and stamps `breachAlertedAt`. The re-read guard prevents double *stamping*, not the double *alert*. Two concurrent scans both emit `sla.breached` for the same handoff task. This is not hypothetical: `vercel.json` runs `/api/ops/sla` at `45 18 * * *` and `.github/workflows/sla-watchdog.yml` runs the same endpoint at `45 * * * *` — both fire at 18:45 UTC daily, from two schedulers whose concurrency groups cannot see each other. Worse, if the stamp write fails after a successful alert (the `throw` at line 182/196 is swallowed into `counts.failed++` at line 202), the breach is re-alerted on every subsequent hourly run forever. `scanPartnerRequestQueue` and `scanEscalationCaseQueue` already claim-before-alert and say so in their comments.

**Fix.** Invert the order to match the other two queues: do the conditional metadata update first (guarded on `breachAlertedAt` still being absent) and call `alertBreach` only if that write actually claimed the row. Separately, either drop the daily `/api/ops/sla` cron from vercel.json or move it off :45 so the two schedulers never collide.

<details><summary>Evidence</summary>

- /Users/sunsu/Desktop/KAXI/src/lib/ops/sla-watchdog.ts:169 — `await alertBreach(item, now);` executes before any claim
- /Users/sunsu/Desktop/KAXI/src/lib/ops/sla-watchdog.ts:177-196 — the stamp is written afterwards; the guard at 188 only skips the write
- /Users/sunsu/Desktop/KAXI/src/lib/ops/sla-watchdog.ts:239-248 — partner_request: "Claim the stamp BEFORE alerting ... so two concurrent scans can never both alert the same breach"
- /Users/sunsu/Desktop/KAXI/src/lib/ops/sla-watchdog.ts:302-307 — escalation_case has the same claim-first pattern
- /Users/sunsu/Desktop/KAXI/vercel.json:24-25 — `/api/ops/sla` at `45 18 * * *`
- /Users/sunsu/Desktop/KAXI/.github/workflows/sla-watchdog.yml:10 — `cron: "45 * * * *"` against the same URL; its `concurrency: sla-watchdog` group cannot serialize against Vercel's scheduler

</details>

### The question mediator's two LLM calls carry no timeout at all, so a single request can consume ~110s of a 60s route
`/Users/sunsu/Desktop/KAXI/src/lib/chat/question-mediator.ts:614` — reliability · effort: small

**What breaks.** Both the primary mediation call and its retry omit `timeoutMs` entirely, unlike every sibling LLM caller. On the Kimi leg they therefore fall back to the gateway's 55s default; two sequential calls is 110s, and provider failover can double that again — inside `/api/typebot-rag`'s 60s ceiling and before the grounded-answer call has even started. A slow-but-alive provider turns every chat turn into a platform 504 with no persisted exchange, rather than the deterministic mediation fallback the code already implements at line 658.

**Fix.** Add a `questionMediatorTimeoutMs()` helper in the same shape as `groundedRagAnswerTimeoutMs` (clamped to roughly 6-8s) and pass it to both `generate` calls, with the retry clamped tighter.

<details><summary>Evidence</summary>

- /Users/sunsu/Desktop/KAXI/src/lib/chat/question-mediator.ts:614-623 — first `generate({...})` has `temperature`, `maxTokens`, `jsonSchema`, but no `timeoutMs`
- /Users/sunsu/Desktop/KAXI/src/lib/chat/question-mediator.ts:634-646 — the retry likewise has no `timeoutMs`
- /Users/sunsu/Desktop/KAXI/src/lib/ai/openai-compatible-gateway.ts:50-53 — absent `timeoutMs`, the default is `55_000`
- /Users/sunsu/Desktop/KAXI/src/lib/chat/grounded-rag-answer.ts:223 and /Users/sunsu/Desktop/KAXI/src/lib/chat/clarification-writer.ts:76 — the sibling callers that do set a bounded budget
- /Users/sunsu/Desktop/KAXI/src/app/api/typebot-rag/route.ts:453 — `await mediateRagQuestion({...})` runs first in the request
- /Users/sunsu/Desktop/KAXI/src/app/api/typebot-rag/route.ts:62 — route maxDuration is 60

</details>

### The wizard's currentVisa answer is never sent to /api/leads, and the lead test pins the omission as correct behaviour
`src/store/kbridge.ts:99` — tests · effort: small

**What breaks.** For the in-Korea goals (`in_korea_job`, `in_korea_employment`) the wizard refuses to advance past step 0 until the student picks D-2 or D-4 (DiagnosisForm.tsx:157). saveDiagnosis() then builds the POST body field by field and omits `currentVisa`, so `leadSchema` applies its `.default("")` and every in-Korea lead is stored with currentVisa = "". recommendPath() does not consume currentVisa either — being written onto the lead is the field's entire purpose, and the D-10/E-7 paths explicitly tell the operator that "현재 체류자격" needs 행정사 review (diagnosis.ts:311, :322). The operator opens that lead and sees no current status, for a question the student was forced to answer.

**Fix.** Add `currentVisa: input.currentVisa` to the saveDiagnosis body in src/store/kbridge.ts, and change scripts/test-leads-validation.ts to build its fixture from a real DiagnosisInput + recommendPath() output through the same field list the store sends, asserting the stored row keeps D-2. Derive the route's zod enum from DiagnosisInput["currentVisa"] instead of restating it.

<details><summary>Evidence</summary>

- src/store/kbridge.ts:99-118 — the POST body lists nickname…nextActions; there is no `currentVisa: input.currentVisa`. This is the only client write path (`"/api/leads"` POST appears once, kbridge.ts:96).
- src/components/diagnosis/DiagnosisForm.tsx:157 — `goalConfirmed && (!isInKoreaGoal || isOneOf(input.currentVisa || "", CURRENT_VISA_VALUES))`: the answer is mandatory for in-Korea goals.
- src/app/api/leads/route.ts:24 — `currentVisa: z.enum(["D-2","D-4",""]).optional().default("")`; the omission is silently absorbed.
- scripts/test-leads-validation.ts:104-112 — assertion 8, 'omitted currentVisa defaults to ""', is green precisely because the client omits it; every currentVisa case (:85, :97, :107) uses a hand-written `validBody` rather than a body built the way saveDiagnosis builds one.
- src/lib/data/diagnosis.ts:31 — currentVisa exists on DiagnosisInput but is referenced nowhere else in diagnosis.ts, so nothing downstream compensates.
- Second-order: src/app/api/leads/route.ts:24 restates the ["D-2","D-4"] domain with no link to DiagnosisInput["currentVisa"], unlike src/components/diagnosis/diagnosis-options.ts:8 which pins it with `satisfies`. Adding D-10 to the type would make the wizard offer an option the API 400s — and src/store/kbridge.ts:127-155 swallows that 400 into a `local-…` lead id, so the user still sees the success state.

</details>

### Public pages fall back to English for Vietnamese and Mongolian users via inline ko/en ternaries
`src/components/kbridge/CostCalculator.tsx:149` — i18n-ux · effort: medium

**What breaks.** On /vi/cost and /mn/cost the loading, empty and error states are English: "Loading school data...", "No school data", "Could not load operational school data.", plus "Saved!" and the "Saved estimates" card heading. Same on /vi/schools ("No matching schools. Adjust filters.", "Loading schools...", "Could not load school data.") and /vi/agent (composer placeholder, "Try asking", "Expert needed", "Next", "tools"). A Mongolian user who chose Mongolian in the switcher gets a page whose failure and empty states speak a third language. Nearby copy in these same files does handle all four locales, so the result is visibly mixed rather than consistently English.

**Fix.** Move each to a translations.ts key and call tr(key, lang). Prioritise the loading/empty/error states (CostCalculator 149/150/168, SchoolsExperience 73/78, useSchoolsDirectory 46) — those are the ones a stuck user reads.

<details><summary>Evidence</summary>

- src/components/kbridge/CostCalculator.tsx:149,150 (loading/empty), :168 (error), :194, :300, :315 — all `lang === "ko" ? <Korean> : <English>`; contrast :163, :184, :233 in the same file, which do spell out all four.
- src/components/schools/SchoolsExperience.tsx:73 (empty state), :78 (loading state); src/components/schools/useSchoolsDirectory.ts:46 (error state); src/components/schools/SchoolCard.tsx:73,75.
- src/components/agent/AgentComposer.tsx:43; AgentLanding.tsx:103,110,121; AgentClarifyPanel.tsx:65; AgentToolSteps.tsx:26; AgentResponseCard.tsx:130,136,310; AgentChatHeader.tsx:34; agent-config.ts:115-120.
- None of these are visible to CI: scripts/test-i18n-parity.ts:21-39 only compares messages/*.json against each other and against translations.ts, so strings that never entered either dictionary are invisible to the gate.

</details>

## Refuted (17)

Raised by a lens, killed by verification. Do not re-raise without new evidence.

- **OCR_DONE is shown to students as "내용 확인 완료 / Content checked" and counted as a completed required document** (honesty) — REFUTED — the finding reads only `ocr.ts` and stops one call too early. `processDocumentOcr` does not end at line 324.

**1. The "reviewStatus is left at PENDING" mechanism is wrong.** `src/lib/documents/ocr.ts:334-338` runs `verifyDocumentItem(updated.id, { persist: true, enableLlm: false, enableRa
- **Consult suppresses its own verified source list whenever the model writes a "📚 출처:" block, which the prompt orders it to do** (honesty) — The finding's consequence does not follow from the code. It assumes the in-answer "📚 출처:" list is the surface through which verified source_url/last_checked_at reach the user; it is not. consult/route.ts:279-288 returns retrievedDocs carrying sourceMeta/ragMeta (real source_url, last_checked_at, rev
- **Unified chat persistence failures are logged to console only — no ops event — so the site's main chat can stop persisting history entirely with nothing surfacing** (silent-failure) — REFUTED as stated. The code asymmetry is real (unified logs, typebot records an ops event), but every consequence the finding hangs on it fails when traced to the actual triggers it names.

1) "SUPABASE_CHAT_PERSISTENCE_NOT_CONFIGURED from an empty Vercel Sensitive var" does NOT produce a green read
- **Consult reports needsHumanExpert when the guardrail intervenes, but only files an escalation case when the LLM classifier said so — and a failed filing is swallowed** (silent-failure) — MECHANICS CONFIRMED, DEFECT FRAMING REFUTED.

The asymmetry is real and reachable. src/app/api/ai/consult/route.ts:251 gates escalation filing on `result.needsHumanExpert` alone while :290 returns `result.needsHumanExpert || guarded.needsHuman`. I confirmed guarded.needsHuman can be true with result
- **Chat-attachment retries are queued but nothing drains them on a schedule, and the health check cannot see a stuck `queued` job** (silent-failure) — REFUTED — a scheduled drainer exists; the finding only looked in `vercel.json` and missed the GitHub Actions cron that actually runs the worker.

Direct counter-evidence:

1. `/Users/sunsu/Desktop/KAXI/.github/workflows/chat-attachment-worker.yml:1-35` — a workflow named "Chat Attachment Worker" wit
- **Cron auth fails open outside NODE_ENV=production, using a narrower "is production" predicate than the rest of the codebase** (security) — The code fact at src/lib/security/cron-auth.ts:5-10 is real (`return process.env.NODE_ENV === "production" ? 503 : null`), but the stated consequence — an anonymous, destructive `GET /api/privacy/retention` on a deployed host — does not follow. Four independent reasons:

1. THE FAIL-OPEN BRANCH DOES
- **Unauthenticated /api/readiness echoes a raw runtime exception message into its JSON response** (security) — Refuted. The code path exists (a truncated exception message does reach the unauthenticated JSON), but the finding's security consequence does not follow, and its central differentiating claim is factually wrong.

1) "Every other error surface in this file is deliberately reduced to a boolean or a f
- **Document routes answer with an infrastructure fingerprint before authenticating the caller** (security) — The mechanical claim is accurate — `getDocumentWorkspaceIssue(...)` does run before `requireDocumentWorkspaceUser()` in all three routes (src/app/api/documents/upload-intent/route.ts:27-30, src/app/api/documents/route.ts:11-14, src/app/api/documents/upload-direct/route.ts:25-26), and the 503 body do
- **n8n verification receipts are replayable for their whole TTL — the nonce is consumed at /verify but the receipt is never single-use** (security) — REFUTED — the mechanism is described correctly but the stated consequence does not follow from the code.

TRUE PART: `verifyN8nVerificationReceipt` (src/lib/n8n/signature.ts:243-290) really is a pure signature/purpose/payloadHash/TTL check with no consumption step, and `verifyAndConsumeN8nSignature`
- **/api/ops/health's own probe timeouts sum to its entire maxDuration, so the daily health run dies exactly when the systems it watches are slow** (reliability) — The arithmetic in the finding is real but the causal story is not. The two budgets it sums belong to calls doing different work: continueChat (rag-system-health.ts:210, 45s) is the leg a degraded n8n/RAG backend makes slow, while startChat (rag-system-health.ts:184-195, 15s) only creates a Typebot s
- **/api/readiness performs six unbounded full-table scans on every request — public, uncached, and with no maxDuration of its own** (reliability) — The mechanical claims are partly true — /api/readiness (src/app/api/readiness/route.ts:6-9) is public, uncached, matched by nothing in src/proxy.ts:37-58 (so no rate limit), and it calls getRagServingProjectionStatus inline (src/lib/ops/readiness.ts:116), which paginates KnowledgeDocument/KnowledgeC
- **/api/privacy/retention is the only cron route with no maxDuration, and the work it does is unbounded in three separate places** (reliability) — The literal observation is true — /Users/sunsu/Desktop/KAXI/src/app/api/privacy/retention/route.ts:8 declares no maxDuration/runtime/dynamic, unlike the four other cron routes (/api/ops/health/route.ts:7, /api/ops/sla/route.ts:7, /api/ops/embedding-audit/route.ts:7, /api/knowledge/monitor/route.ts:1
- **verifyDocumentSet re-loads the whole student profile per document and verifies serially, with no cap and no budget inside maxDuration=120** (reliability) — Refuted as stated. (1) The finding's cost driver — a per-document LLM call — is not on the reachable path: the route defaults `enableLlm` to false (verify-batch/route.ts:40), the only in-app caller passes `enableLlm: false` explicitly (AdminCaseDetail.tsx:221-229), and docs/DOCUMENT_VERIFICATION_ENG
- **withTimeout races but never cancels, so an abandoned LLM request keeps running and billing after the route has answered** (reliability) — The mechanism is real — src/lib/api/security.ts:338-353 is a bare Promise.race with no AbortController — but both halves of the stated consequence are contradicted by the code.

(1) "keep the function instance alive and billed for minutes" is impossible: src/app/api/ai/agent/route.ts:33 declares `ex
- **The Typebot handoff consent gate is pinned only by grepping the route file for three substrings** (tests) — Every factual claim in the finding checks out, but the classification does not. Verified: scripts/test-lead-domain-privacy.ts:35-40 is a three-substring includes() check on the file text read at line 23, under an assertion message ("Typebot handoff must fail closed and persist a versioned consent re
- **test:quality is an unconditional SKIP under CI's environment, so the only retrieval-quality gate in `bun run ci` can never fail** (tests) — REFUTED on the stated consequences. The two factual premises check out, but the harm claims do not.

What is true:
- `.github/workflows/ci.yml:26-41` sets `DATABASE_URL` but none of `OPENAI_EMBEDDING_API_KEY`, `KAXI_QUERY_EMBEDDINGS_USE_OPENAI_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE
- **The RLS suite asserts a hand-written table list against four frozen 2026-07-08 migration files, so it can never fail and can never notice a new table** (tests) — Mechanically the description of the loop is accurate, but the finding is a missing-coverage/hardening observation, not a reachable defect, and its supporting evidence misattributes what the suite already checks.

What holds up:
- scripts/test-supabase-rls.ts:15-22 builds `migration` from four 2026-0
