# KAXI Document Verification Engine

Status: Draft implementation

## Scope

The engine verifies uploaded student visa documents after OCR. It is not an approval guarantee and does not replace administrative-scrivener review.

## Layers

1. Rule layer
   - Uses `VisaDocumentRequirement.validationRules`.
   - Checks required file presence, required OCR fields, issuing-policy metadata, and freshness rules such as `issue_date_within:90:days`.
   - Supports deterministic OCR value-quality rules such as `numeric_positive:balance`, `numeric_positive:paid_amount`, and `numeric_range:attendance_rate:0:100`; these only check OCR value shape/range, not whether an amount satisfies a legally sufficient threshold.
   - Treats `NOT_UPLOADED`, `MISSING`, `EXPIRED`, and `REJECTED` files as not present for required-document checks.
   - Emits `ocr_extraction_missing` or `ocr_status_not_ready` when a file is present but deterministic validation cannot safely use OCR extraction yet.
   - Flags future issue dates as `document_issue_date_in_future` and past expiration dates as `document_expired` when the matrix requires expiry fields.

2. RAG layer
   - Retrieves approved/current `KnowledgeDocument` and `KnowledgeChunk` rows through pgvector hybrid search.
   - Builds the retrieval query from the visa/action/document requirement plus safe OCR extraction context such as duties, business type, program, or other non-identity text.
   - Excludes sensitive OCR values such as names, passport/registration numbers, addresses, dates, wage/balance/amount fields, and contact details from the retrieval query.
   - The optional LLM judgment payload is sanitized again with the same sensitive-field policy, so the selected provider receives field presence and non-sensitive semantic context rather than raw OCR identity or financial values.
   - Accepts retrieved chunks only when `vectorScore >= DOCUMENT_RAG_MIN_VECTOR_SCORE` or `keywordScore > DOCUMENT_RAG_MIN_KEYWORD_SCORE`.
   - Accepted source payloads include `sourceType`, `reviewStatus`, `validFrom/validTo`, `lastCheckedAt`, `acceptedBy`, score values, and the thresholds used for the decision.
   - Optional provider-neutral JSON judgment can be enabled per call; Kimi's OpenAI-compatible API is the default.
   - RAG retrieval and LLM judgment are tracked separately in `layerDetails.rag`.
   - Every result includes `basis.notice`, `basis.officialSourceCount`, and `basis.latestCheckedAt` so operators can see whether the verification is grounded in current official sources or only in the matrix/rules.
   - Accepted RAG chunks that are not official sources produce `rag_basis_non_official`; official grounding requires both an `official_` source type and an approved official HTTPS host such as `*.go.kr` or `*.korea.kr`. Non-official chunks remain visible for debugging, but the RAG layer is warning-level and the document stays human-reviewable.
   - A missing managed LLM key does not erase accepted RAG sources; it emits `llm_judgment_unavailable`, sets `layerDetails.rag.llm.status="unconfigured"`, and keeps the document human-reviewable.

3. Cross-document layer
   - Compares OCR metadata across the same `StudentProfile`.
   - Detects name mismatches.
   - Detects passport-number mismatches across submitted documents without exposing the OCR passport values in issue evidence.
   - Detects birth-date mismatches across submitted documents without exposing the OCR birth-date values in issue evidence.
   - Detects school/institute-name mismatches across admission, enrollment, transcript, and education documents.
   - Detects school/institute-name mismatches between OCR and the selected student profile school.
   - Compares OCR-extracted requested visa type and stay/action values against the active case context, so a D-4 extension form is not silently accepted for a D-2 issuance case.
   - Supports cross-rule hooks such as `cross_check:job_description:visa_occupation`.
   - For E-7, compares job-description/employment text with employer business-registration industry text. Clear category mismatches produce `cross_document_occupation_industry_mismatch`; missing or unclassifiable fields stay human-reviewable instead of being treated as a pass.

## Production Policy

- Approved matrix rows are preferred over pending rows, even when the pending row is a more specific applicant context.
- PENDING matrix rows can be evaluated only when no approved matching row exists, and always produce `requirement_not_approved`.
- Production workflows should treat any non-approved requirement as human-review required.
- Official-source harvest creates PENDING RAG candidates only. Approval must happen through admin/legal review before embedding into production RAG.
- Weak RAG retrieval produces `rag_basis_weak`; those chunks are not exposed as accepted evidence and the document remains human-review required.
- Internal, synthetic, or otherwise non-official accepted RAG evidence produces `rag_basis_non_official`; production verification should not treat it as sufficient grounding.
- Weak or missing RAG also produces a basis notice saying no official RAG source passed the configured threshold.
- API/audit payloads include accepted RAG source counts and LLM status so pilot operators can distinguish "no basis retrieved" from "basis retrieved, LLM unavailable".

## Commands

```bash
bun run test:document-verification
bun run test:document-verification-api
bun run test:document-verification-batch
bun run test:official-source-harvest
bun run knowledge:harvest:official -- --persist --min-chunks 500
```

Admin API:

```bash
POST /api/admin/documents/:id/verify
POST /api/admin/documents/verify-batch
GET  /api/admin/documents/verification-metrics
```

Default behavior:

- `enableRag=true`
- `enableLlm=false`
- `persist=true`
- `minRagVectorScore=DOCUMENT_RAG_MIN_VECTOR_SCORE` or `0.8`
- `minRagKeywordScore=DOCUMENT_RAG_MIN_KEYWORD_SCORE` or `0`

Batch verification:

- Accepts `studentProfileId` or `caseId`.
- Checks the visa document matrix for required document types that have no uploaded/present `DocumentItem`.
- Optionally creates `MISSING` placeholders with `createMissingPlaceholders=true`.
- Detects multiple present documents for the same required document type as set-level `duplicate_document_type:*` issues, with duplicate counts in `summary.duplicateDocumentTypes` and `summary.duplicateDocumentItems`.
- Runs the same Layer 1/2/3 item verifier for all relevant documents and returns a set-level summary.

Admin routes require admin auth and write audit logs such as `document.verified` or `document.set_verified`.
Operators can run item-level or case-level verification from `/admin/cases/:id` and monitor feedback quality at `/admin/documents`.

Reviewer feedback:

- `POST /api/admin/documents/:id/verification-feedback` records `ACCURATE`, `FALSE_POSITIVE`, `FALSE_NEGATIVE`, or `NEEDS_REVIEW` labels.
- `GET /api/admin/documents/verification-metrics` aggregates feedback coverage, accuracy, false-positive/false-negative rates, frequent issue codes, and layer statuses for pilot monitoring.
