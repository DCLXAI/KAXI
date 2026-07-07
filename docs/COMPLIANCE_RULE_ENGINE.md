# KAXI Compliance Rule Engine v0.2

Status: implemented for D-2/D-4 MVP rules
Last updated: 2026-07-01

## Scope

The D-2/D-4 visa checklist rules now run through versioned database records when an operational DB is available. The static v0 rules remain only as a public demo fallback for environments where the compliance tables are unavailable.

## Rule Storage

Each executable rule is represented by:

- `ComplianceRule`: stable rule identity, domain, visa type, rule type, lifecycle status.
- `ComplianceRuleVersion`: effective date window, `conditionAst`, `outputAst`, `requiredInputs`, `sourceRefs`, `fallbackPolicy`, and legal review status.
- `ComplianceRuleTest`: golden input/expected output cases loaded from `quality/visa-rule-golden-cases.json`.
- `ComplianceEvaluation`: per-student execution evidence when `persistEvaluation` is enabled.

## Execution Policy

The evaluator only loads rule versions matching all of the following:

- `ComplianceRule.status = ACTIVE`
- `ComplianceRule.domain = student_visa`
- `ComplianceRuleVersion.reviewStatus = APPROVED`
- `effectiveFrom <= referenceDate`
- `effectiveTo IS NULL OR effectiveTo >= referenceDate`

Before execution, every loaded version must include:

- non-empty `requiredInputs`
- non-empty `sourceRefs`
- non-empty `fallbackPolicy`

An approved active rule missing `sourceRefs` raises `ComplianceRuleValidationError`; CI treats that as a hard failure.

## DSL

The JSON DSL is intentionally narrow for the MVP.

- `conditionAst`: `always`, equality/inequality, numeric comparisons, membership, existence, truthy/falsy, `all`, `any`, and `not`.
- `outputAst`: risk level, result type, message key, human-review flag, and one or more visa-rule operations.

Current D-2/D-4 operations:

- `infer_visa_type_from_program`
- `add_core_documents`
- `add_financial_proof`
- `add_tuberculosis_document`
- `apply_safety_escalation`

## Seeds And Tests

Load rules locally or in CI:

```bash
bun run db:seed:rules
```

Verify the engine:

```bash
bun run test:rules
```

The test resets an isolated PostgreSQL test DB, replays Prisma migrations, seeds the approved D-2/D-4 rule versions, and verifies:

- golden rule pass rate is 100%
- at least 20 golden cases are maintained
- PENDING rules do not execute
- future and expired rules do not execute
- approved active rules without `sourceRefs` fail
- `ComplianceEvaluation` rows are stored for persisted evaluations

## Source Notice

Rule output carries `source_refs` on both the overall evaluation and each generated document. RAG answers separately use source metadata to display:

> 이 안내는 2026-07-01에 확인된 Study in Korea / 법무부 출처 기준입니다. 개인 상황에 따라 달라질 수 있어 접수 전 행정사 검토가 필요합니다.

The operating rule is the same for both RAG and rules: no official source metadata means no production-grade answer.
