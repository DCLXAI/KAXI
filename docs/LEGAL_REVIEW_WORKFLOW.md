# Legal Review Workflow

KAXI의 자문 행정사 검수 패킷을 생성하고, 검수 결과를 운영 DB의 `reviewStatus` 필드에 반영하는 절차입니다.

## 1. 검수 패킷 생성

```bash
bun run legal-review:export
```

기본 출력 위치는 `legal-review/latest`입니다.

생성 파일:

- `README.md`: 검수자 안내
- `A1-knowledge-corpus-review.md`: RAG 지식 문서별 원문, 출처, 확인일
- `A1B-harvested-candidates-review.md`: 공식 출처 harvest 후보 문서/청크 검수
- `A2-compliance-rule-review.md`: 비자 룰별 조건, 출력, 법적 근거
- `A3-visa-document-matrix-review.md`: 체류자격별 서류 매트릭스 검수
- `BCD-service-boundary-review.md`: 법무 문서, UI 문구, 사실 데이터 체크리스트
- `review-decisions.template.jsonl`: DB 반영용 결정 파일
- `review-decisions.example.jsonl`: 작성 예시

DB 연결 없이 static source만 뽑으려면:

```bash
bun run legal-review:export -- --static-only --out legal-review/static
```

## 2. 검수 결과 입력

`review-decisions.template.jsonl`의 각 줄을 검수자가 채웁니다.

공식 출처 harvest 후보만 별도 파일로 뽑으려면:

```bash
bun run legal-review:candidates -- --out legal-review/latest/harvested-candidate-decisions.jsonl
```

Label Studio에서 후보 문서를 검수하려면 pending 후보를 태스크 JSON과 labeling config XML로 내보냅니다.

```bash
bun run legal-review:label-studio:export -- \
  --out legal-review/latest/label-studio-candidates.json \
  --config-out legal-review/latest/label-studio-candidate-config.xml
```

Label Studio 프로젝트를 만들 때 `label-studio-candidate-config.xml`을 labeling interface로 넣고, `label-studio-candidates.json`을 import합니다. 각 태스크에는 `doc_id`, 출처 URL, 주제, supersedes, 청크 수, 실제 pgvector embedding 수, chunk preview가 포함됩니다. 공식 출처 수집 메타데이터도 함께 들어가며, `extraction_method`가 `html`, `pdf_text`, `plain_text`, `binary_metadata`, `unknown` 중 무엇인지와 `content_type`, `byte_length`, `extracted_chars`, `extraction_error`를 확인할 수 있습니다. 검수자는 decision(`APPROVED`/`PENDING`/`REJECTED`), `checked_by`, `checked_at`, `notes`를 채웁니다.

Label Studio export JSON을 기존 `review-decisions` JSONL로 변환하려면:

```bash
bun run legal-review:label-studio:import -- \
  --file legal-review/latest/label-studio-export.json \
  --out legal-review/latest/label-studio-decisions.jsonl
```

이후 검증/반영 절차는 동일합니다.

```bash
bun run legal-review:validate -- \
  --file legal-review/latest/label-studio-decisions.jsonl \
  --require-decisions \
  --require-candidate-coverage
```

검수 완료 후 후보 전체를 같은 결정으로 채운 파일을 만들려면:

```bash
LEGAL_REVIEW_CHECKED_BY="홍길동 행정사 00-0000" \
bun run legal-review:candidates -- \
  --decision APPROVED \
  --out legal-review/latest/harvested-candidate-decisions.approved.jsonl
```

허용 decision:

- `APPROVED`: 승인, production RAG/룰 반영 가능
- `PENDING`: 수정 또는 추가 검토 필요
- `REJECTED`: 폐기 또는 검색/룰 적용 금지
- 빈 문자열: 아직 미검수, apply 스크립트가 건너뜀

`checkedBy`에는 행정사 성명과 자격번호 등 추적 가능한 식별자를 넣습니다.

## 3. 검수 파일 사전검증

빈 후보 결정 파일이 현재 DB의 모든 pending 후보를 포함하는지 확인:

```bash
bun run legal-review:validate -- \
  --file legal-review/latest/harvested-candidate-decisions.jsonl \
  --require-candidate-coverage
```

검수 완료 후 production RAG 500+ 청크 승인을 반영하기 전 strict 검증:

```bash
bun run legal-review:validate -- \
  --file legal-review/latest/harvested-candidate-decisions.approved.jsonl \
  --require-decisions \
  --require-candidate-coverage \
  --require-approved-candidate-chunks 500
```

사전검증은 중복 대상, 존재하지 않는 문서/룰/서류 매트릭스, placeholder `checkedBy`, 누락된 `checkedAt`, 미래 확인일, pending 후보 누락, 승인 후보 청크 부족, 승인 후보의 실제 pgvector embedding 누락을 실패로 처리합니다.

현재 pending 후보를 승인하면 500+ approved embedded corpus가 되는지 projection으로 확인:

```bash
bun run knowledge:check:candidates
```

이 명령은 pending 후보 청크 수, 후보 임베딩 수, 후보 승인 시 supersede될 기존 승인 문서 수, 그리고 승인 후 예상 approved/embedded chunk 수를 계산합니다.

`/admin/knowledge`의 후보 승인 UI도 같은 운영 경계를 따릅니다. 화면에는 pending 후보 수, 후보 청크/임베딩 수, 승인 후 예상 approved embedded chunk 수, supersede 예정 문서 수, 현재 production corpus 충족 여부가 표시됩니다. 후보 문서를 승인하려면 행정사 검수자 식별자와 확인일이 필요하며, 후보 전체 승인은 현재 pending 후보 전체 포함, 실제 pgvector embedding 완료, 500+ 후보 청크 기준을 서버에서 다시 확인합니다.

## 3-1. 후보 승인 원샷 승격

행정사 검수가 끝난 후보 승인 파일은 아래 원샷 명령을 권장합니다. 이 명령은 strict validation, 후보 승인 projection, DB apply, approved corpus finalization, production-approved audit을 순서대로 실행합니다.

```bash
bun run knowledge:promote:candidates -- \
  --file legal-review/latest/harvested-candidate-decisions.approved.jsonl \
  --min-approved-candidate-chunks 500 \
  --min-approved-chunks 500 \
  --min-approved-embedded-chunks 500
```

중간 단계 중 하나라도 실패하면 이후 단계는 실행하지 않습니다.

## 4. DB 반영

먼저 dry-run:

```bash
bun run legal-review:apply -- --file legal-review/latest/review-decisions.template.jsonl
```

실제 반영:

```bash
LEGAL_REVIEW_CHECKED_BY="홍길동 행정사 00-0000" \
bun run legal-review:apply -- --file legal-review/latest/review-decisions.template.jsonl --apply
```

공식 출처 후보를 500+ production RAG corpus로 전환하는 승인 파일은 apply 단계에서도 strict gate를 걸어 실행합니다:

```bash
bun run legal-review:apply -- \
  --file legal-review/latest/harvested-candidate-decisions.approved.jsonl \
  --apply \
  --require-decisions \
  --require-candidate-coverage \
  --require-approved-candidate-chunks 500
```

반영 대상:

- `knowledge_document`: `KnowledgeDocument.reviewStatus`, `checkedBy`, `lastCheckedAt`, `validTo`, `supersededBy`
- `compliance_rule_version`: `ComplianceRuleVersion.reviewStatus`, `reviewedBy`, `reviewedAt`, `effectiveTo`
- `visa_document_requirement`: `VisaDocumentRequirement.reviewStatus`, `checkedBy`, `lastCheckedAt`, `validityDays`

각 반영은 `AuditEvent`에 `legal_review_decision_applied`로 남습니다. `notes`는 본문 테이블에는 저장하지 않고 audit metadata에 저장합니다.

공식 출처 harvest 후보를 `APPROVED`로 반영하면 기존 공식 문서의 `supersededBy`도 함께 갱신되어, 승인 후보가 production RAG의 canonical source로 교체됩니다. 후보의 기존 chunk boundary는 유지됩니다.
사전 임베딩된 후보를 승인하는 경우 기존 `KnowledgeChunk` row와 pgvector embedding을 보존합니다. 따라서 `bun run knowledge:embed:candidates`를 미리 돌려두면 승인 후 500+ corpus 전환 시간이 줄어듭니다.

## 5. RAG 재반영

검수 결과를 반영한 뒤 production RAG를 갱신할 때:

```bash
bun run knowledge:pgvector
```

승인된 RAG corpus 임베딩과 500+ 기준 확인을 한 번에 처리하려면:

```bash
bun run knowledge:finalize:corpus -- --min-approved-chunks 500 --min-approved-embedded-chunks 500
```

행정사가 직접 검수해 `checkedBy`가 static metadata와 달라진 문서는 이후 static ingest가 `reviewStatus`를 다시 덮어쓰지 않도록 보존됩니다.

500+ corpus 전환 확인:

```bash
bun run knowledge:check:corpus -- --min-approved-chunks 500 --min-approved-embedded-chunks 500
```
