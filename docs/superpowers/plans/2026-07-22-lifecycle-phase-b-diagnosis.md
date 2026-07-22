# Lifecycle Phase B — In-Korea Diagnosis Branch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Students already in Korea can run the diagnosis for their post-graduation move: two new goals — 구직 준비(→D-10) and 채용 확정(→E-7) — with their current visa captured, honest rag-only compliance posture (mirroring the existing D-10 policy), and a result CTA into the Phase-A workspace tracks.

**Architecture:** Follow the wizard's existing hardcoded-step architecture instead of fighting it: two NEW goal values (`in_korea_job`, `in_korea_employment`) join step 0, with a conditional current-visa sub-select shown only for them (no new step; TOTAL_STEPS unchanged). The engine gains two `PATH_PROFILES` (`goal_in_korea_d10` → D-10 with the Phase-A d10 doc keys; `goal_in_korea_e7` → E-7 with the e7 doc keys), `DiagnosisVisaType` gains `"E-7"`, `complianceCoverage` gains an E-7 rag-only arm, and a `policy:e7-rag-only-compliance` rule mirrors the D-10 one. Persistence: `DiagnosisLead.currentVisa` (one nullable column migration); `goal`/`pathKey` are plain String columns so the new values need no schema change, and the zod schema is non-strict so rollout ordering is safe. The result screen links the two new paths to `/docs?track=D-10|E-7`.

**Tech Stack:** TypeScript (Next.js), Prisma migration (SQL + schema authored only), zod, dual i18n stores (messages/*.json + translations.ts), bun test scripts.

## Global Constraints

- Branch: `feat/lifecycle-diagnosis-in-korea` off `main` (AFTER Phase A merges). Commit per task. Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- NEVER stage `Capsomnia/` or `.superpowers/`. Migration files authored ONLY — never run prisma migrate/reset in-session; production applies via the deploy workflow; the required-migration pin (`REQUIRED_PRODUCTION_MIGRATION` in src/lib/ops/schema-parity.ts + scripts/test-production-cutover.ts:21) MUST be advanced to the new migration name in the same task that adds it (the cutover tripwire).
- HONESTY POSTURE (binding): D-10 and E-7 recommendations never claim rule-engine verdicts. `complianceCoverage` returns `rag_only` for both (E-7 arm added, `unsupportedReason: "e7_compliance_rule_engine_not_implemented"`); the `policy:e7-rag-only-compliance` warning mirrors the D-10 rule's framing (law/HiKorea RAG + 행정사 검토). `/api/diagnosis`'s rule-engine gate stays D-2/D-4-only.
- Existing four goals/paths byte-identical: no existing profile, rule text, step copy, or pin weakened. `compliance.visaType` stays typed `"D-2"|"D-4"|null` (E-7/D-10 pass null, as D-10 does today).
- New goal values: `in_korea_job`, `in_korea_employment`. New pathKeys: `goal_in_korea_d10`, `goal_in_korea_e7`. New input field: `currentVisa?: "D-2" | "D-4" | ""` (optional, default "").
- New-profile docs arrays reuse the Phase-A keys verbatim: D-10 → `docs_doc_d10_integrated_application, docs_doc_d10_graduation_certificate, docs_doc_d10_job_seeking_plan, docs_doc_d10_financial_proof, docs_doc_d10_residence_proof`; E-7 → `docs_doc_e7_employment_contract, docs_doc_e7_business_registration, docs_doc_e7_job_description, docs_doc_e7_degree_or_career`.
- All new user-visible strings in 4 locales, in BOTH i18n stores where each is consumed (wizard strings → messages/*.json; pathKey labels → translations.ts AND messages/*.json for parity); vi/mn marked as drafts pending native review.
- baseCost/basePrepMonths for the new profiles: D-10 `baseCost: 1_500_000, basePrepMonths: 1`; E-7 `baseCost: 1_000_000, basePrepMonths: 2` (application-cost scale, not study-cost scale — the result copy must NOT present these as tuition-like totals; reuse however goal_career/D-10 frames cost today — READ it first; if goal_career's D-10 framing already handles this, mirror it).

---

### Task 1: Engine — profiles, E-7 type, rag-only coverage, rules

**Files:**
- Modify: `src/lib/data/diagnosis.ts`
- Modify: `src/lib/i18n/translations.ts` (+ the 4 `messages/*.json` for the same keys)
- Test: extend `scripts/test-diagnosis-rules.ts` (find the actual diagnosis test script via package.json `test:diagnosis`)

- [ ] **Step 1:** `DiagnosisVisaType` gains `"E-7"` (:6). `DiagnosisInput` gains `currentVisa?: "D-2" | "D-4" | ""` and `goal` union gains `"in_korea_job" | "in_korea_employment"`.
- [ ] **Step 2:** Two `PATH_PROFILES` entries (shape per :81-114): `goal_in_korea_d10` (visaType "D-10", docs = the five d10 keys, sourceRefs mirroring goal_career's D-10 refs — READ them) and `goal_in_korea_e7` (visaType "E-7", docs = the four e7 keys, sourceRefs: the HiKorea combined-requirements URL used by the Phase-A stage + `moj-e7-wage-requirement-2026`'s source if the profile shape wants doc ids vs urls — match whatever sourceRefs holds today). `selectPathProfile`: the two new goals map directly to their profiles (before the existing chain; existing behavior untouched).
- [ ] **Step 3:** `complianceCoverage`: E-7 arm returning `status: "rag_only"`, `unsupportedReason: "e7_compliance_rule_engine_not_implemented"` (mirror the D-10 arm exactly). New rule `policy:e7-rag-only-compliance` in DIAGNOSIS_RULES: `applies: profile.visaType === "E-7"`, riskDelta 1, 4-locale warning mirroring the D-10 rule's text with E-7 wording + the annual wage-notice caution ("임금 요건은 연도별 고시 확인").
- [ ] **Step 4:** `inferDiagnosisVisaType` (:128-130) handles the new goals; grep every `DiagnosisVisaType` switch/map (the Phase-B survey lists them: /api/diagnosis/route.ts:126,131,145-146; tools.ts:430) and give each an explicit, honest arm (rule-engine gate stays D-2/D-4; escalation category strings extended).
- [ ] **Step 5:** pathKey labels: `goal_in_korea_d10` ko `졸업 후 구직(D-10) 준비` · vi `Chuẩn bị visa tìm việc (D-10) sau tốt nghiệp` · mn `Төгссөний дараах ажил хайх (D-10) бэлтгэл` · en `Post-graduation job-seeking (D-10)`; `goal_in_korea_e7` ko `취업 확정 후 E-7 전환` · vi `Chuyển sang E-7 sau khi có việc làm` · mn `Ажилд орсны дараа E-7 руу шилжих` · en `Switch to E-7 after a job offer` — in translations.ts AND all four messages/*.json (drafts comment).
- [ ] **Step 6:** Tests: extend the diagnosis suite — new-goal recommendations return the right visaType/pathKey/docs (exact five/four key arrays), compliance coverage rag_only for both with the exact unsupportedReason strings, the E-7 policy warning fires, and EXISTING goal pins unchanged. Gates: `bun run test:diagnosis && bun run test:i18n-parity && bun run ci:types && bun run lint` (DB-gated suites → CI). Commit (`feat(diagnosis): in-Korea D-10/E-7 paths with rag-only honesty`).

---

### Task 2: Persistence — currentVisa column, leads schema, portal labels

**Files:**
- Create: `prisma/postgres/migrations/20260722210000_diagnosis_current_visa/migration.sql` → `ALTER TABLE "DiagnosisLead" ADD COLUMN "current_visa" TEXT;` (CHECK the actual table name/casing in schema.prisma's @@map before writing — DiagnosisLead may map to a snake_case table; author accordingly)
- Modify: `prisma/postgres/schema.prisma` (`currentVisa String? @map("current_visa")` on DiagnosisLead)
- Modify: `src/app/api/leads/route.ts` (zod: `currentVisa: z.enum(["D-2","D-4",""]).optional().default("")` — match the file's optional-default style; add to the create block)
- Modify: `src/lib/ops/schema-parity.ts` + `scripts/test-production-cutover.ts` (advance the required-migration pin to `20260722210000_diagnosis_current_visa`)
- Test: extend `scripts/test-leads-validation.ts` (currentVisa persists; invalid value → 400; omitted → "")

- [ ] Steps: author migration + schema; wire zod + create; advance BOTH pins; extend validation tests; gates `bun run ci:types && bun run lint && bun run test:cutover` (+ test:leads-validation/test:schema locally if possible, else CI). Commit (`feat(diagnosis): persist the in-Korea current visa`).

---

### Task 3: Wizard UI + result CTA

**Files:**
- Modify: `src/components/diagnosis/DiagnosisForm.tsx` (+ `useDiagnosisFlow.ts` DEFAULT_INPUT gains `currentVisa: ""`)
- Modify: `src/components/diagnosis/DiagnosisResult.tsx`
- Modify: `messages/{ko,vi,mn,en}.json` (wizard strings)
- Test: extend `tests/e2e/kaxi-smoke.spec.ts` ONLY if cheap (the wizard already has an e2e touch in the landing test — do NOT destabilize it; a units-only task is acceptable, say so)

- [ ] **Step 1:** Step 0 gains the two goal options after the existing four (labels: `goal_in_korea_job` ko `졸업 후 한국에서 구직할 거예요` · vi `Tôi sẽ tìm việc tại Hàn Quốc sau tốt nghiệp` · mn `Төгсөөд Солонгост ажил хайна` · en `I'll look for a job in Korea after graduating`; `goal_in_korea_employment` ko `채용이 확정됐어요 (E-7 전환)` · vi `Tôi đã có việc làm (chuyển E-7)` · mn `Ажилд орох нь батлагдсан (E-7)` · en `I have a job offer (E-7 switch)`), following goalOptions' existing structure; when either is selected, render a compact current-visa sub-select on the SAME screen (`현재 비자` D-2/D-4 buttons; key `diagnose_current_visa_label` 4-locale) writing `onUpdate({ currentVisa })`. Step validity for step 0 with the new goals requires currentVisa chosen. Later steps untouched (they remain meaningful: korean level, region).
- [ ] **Step 2:** `DiagnosisResult.tsx`: when `result.pathKey` is one of the two new keys, render an additional CTA link `내 서류 워크스페이스에서 준비 시작` (4-locale key `diagnose_cta_docs_workspace`) → `/docs?track=D-10` or `/docs?track=E-7` per visaType, styled like the existing CTA buttons (READ them). Existing CTAs unchanged.
- [ ] **Step 3:** i18n keys in all four messages/*.json (+ translations.ts if any of these keys are consumed server-side — check `tr(` usages; wizard-only keys need messages/*.json only, per the existing diagnose_* convention).
- [ ] **Step 4:** Gates: `bun run ci:types && bun run lint && bun run test:i18n-parity && bun run test:e2e` (suite must stay green even untouched). Commit (`feat(diagnosis): in-Korea wizard branch + workspace CTA`).

---

### Task 4: Rollout

- [ ] PR → CI green → merge → deploy (migration applies; readiness under the new parity pin proves it) → post-deploy checks. Live probes: POST /api/leads with `goal: "in_korea_job", currentVisa: "D-2"` → 201 and the lead echoes currentVisa; /ko/diagnose renders the new goal options (browser or HTTP smoke); a D-10-path result's docs CTA href correct (unit-verified; visually if the pane cooperates).
