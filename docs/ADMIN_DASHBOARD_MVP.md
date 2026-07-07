# KAXI Phase 3 Admin Dashboard MVP

Status: implemented
Last updated: 2026-07-01

## Routes

- `/admin/cases`: 신규 케이스, 마감 임박, 위험 케이스, 보완 요청, 승인 완료 큐.
- `/admin/cases/:id`: 학생 프로필, 대화 요약, 업로드 서류, 룰엔진 결과, AI 답변 초안, 승인/반려/수정 이력.
- `/admin/rules`: 룰 목록, 버전, 테스트 케이스 pass count, 행정사 승인 상태.
- `/admin/knowledge`: 출처 문서, 확인일, 승인/폐기 상태.
- `/admin/audit`: 케이스별 이벤트 로그와 관리자 액션 로그.

## Guard

All data APIs are under `/api/admin/*` and reuse `requireAdmin`.

- `owner`, `admin`, `viewer`: read.
- `owner`, `admin`: mutate.
- Session login and temporary `x-admin-key` are supported.

## Case Actions

The case detail screen exposes the core operating buttons:

- `approve_send`: 승인 후 학생에게 전송.
- `request_more_documents`: 반려, 추가서류 요청.
- `mark_high_risk`: 고위험, 직접 상담 필요.
- `stop_suspected_fraud`: 허위/위조 의심, 처리 중단.

Each action updates `EscalationCase`, creates `AgentReview`, and writes both `AuditEvent` and admin audit metadata.

## Demo Data

The admin demo seed creates five admin cases across the required queues.

Rebuild locally:

```bash
bun run db:prepare-local
bun run db:seed:schools
bun run db:seed:synonyms
bun run db:seed:rules
bun run db:seed:admin-demo
```

## CI

`bun run test:admin-dashboard` verifies:

- case bucket counts,
- case detail profile/documents/rule evaluations/AI draft,
- case action mutation and audit visibility,
- rule review status mutation,
- knowledge document approval,
- audit event retrieval.
