# KAXI 자문 행정사 검수 패킷

생성일: 2026-07-10

## 포함 파일

| 파일 | 용도 |
|---|---|
| A1-knowledge-corpus-review.md | RAG 지식 문서별 원문/출처/확인일/검수 체크란 |
| A1B-harvested-candidates-review.md | 공식 출처 harvest 후보 문서/청크 검수 체크란 |
| A2-compliance-rule-review.md | 비자 룰 엔진/DB seed 규칙별 조건·출처·검수 체크란 |
| A3-visa-document-matrix-review.md | 체류자격별 서류 매트릭스 50건 검수 체크란 |
| BCD-service-boundary-review.md | 법무 문서, UI 문구, 사실 데이터 검수 체크리스트 |
| review-decisions.template.jsonl | DB 반영용 결정 입력 템플릿 |
| review-decisions.example.jsonl | 작성 예시 |

## 현재 범위

- 지식 코퍼스: 93건
- 공식 출처 harvest 후보: 78건 / 후보 청크 718개
- 비자 룰: 11건
- 비자 서류 매트릭스: 50건
- DB 상태 포함: 예
- 출력 디렉터리: /Users/sunsu/Desktop/KAXI/legal-review/latest

## 검수 결정 입력 방법

`review-decisions.template.jsonl`에서 각 줄의 `decision`, `checkedBy`, `checkedAt`, `notes`를 채웁니다.

허용 decision:

- `APPROVED`: 검수 승인, production RAG/룰 반영 가능
- `PENDING`: 수정 또는 추가 검토 필요
- `REJECTED`: 폐기 또는 검색/룰 적용 금지
- 빈 문자열: 아직 미검수, DB 반영 스크립트가 건너뜀

DB 반영 전 사전검증:

```
bun run legal-review:validate -- --file legal-review/latest/review-decisions.template.jsonl
```

공식 출처 후보를 500+ production RAG 청크로 승인하는 파일은 strict 검증을 먼저 통과해야 합니다:

```
bun run legal-review:validate -- --file legal-review/latest/harvested-candidate-decisions.approved.jsonl --require-decisions --require-candidate-coverage --require-approved-candidate-chunks 500
```

DB 반영 dry-run:

```
bun run legal-review:apply -- --file legal-review/latest/review-decisions.template.jsonl
```

DB 실제 반영:

```
LEGAL_REVIEW_CHECKED_BY="홍길동 행정사 00-0000" bun run legal-review:apply -- --file legal-review/latest/review-decisions.template.jsonl --apply
```

공식 출처 후보를 500+ production RAG corpus로 전환할 때는 apply 단계에서도 strict gate를 켭니다:

```
bun run legal-review:apply -- --file legal-review/latest/harvested-candidate-decisions.approved.jsonl --apply --require-decisions --require-candidate-coverage --require-approved-candidate-chunks 500
```

권장 원샷 승격 명령:

```
bun run knowledge:promote:candidates -- --file legal-review/latest/harvested-candidate-decisions.approved.jsonl --min-approved-candidate-chunks 500 --min-approved-chunks 500 --min-approved-embedded-chunks 500
```

주의: `notes`는 `AuditEvent.metadata`에 남기고, 현재 `KnowledgeDocument`와 `ComplianceRuleVersion` 본문 테이블에는 별도 note 컬럼이 없습니다.

공식 출처 harvest 후보는 `APPROVED` 후에만 production RAG 대상이 됩니다. 승인 뒤 `bun run knowledge:pgvector`를 실행해 승인된 청크를 임베딩하세요.
