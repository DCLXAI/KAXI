# Phase 0 Data Foundation

상태: initial implementation

## 현재 구현

### Visa Document Matrix

`VisaDocumentRequirement`는 체류자격·신청유형별 서류 요건의 운영 테이블입니다.

포함 필드:

- `visaType`: D-2, D-4, D-10, E-7, F-2, F-5
- `stayAction`: issuance, extension, change, permanent_residence
- `applicantContext`: degree, language_training, d4_to_d2, job_seeking 등
- `documentType`: passport, financial_proof, residence_proof 등
- `required`, `validityDays`, `issuer`
- `requiredFields`: 필수 기재 항목
- `validationRules`: Layer 1 deterministic validation rule keys
- `sourceRefs`, `sourceUrl`, `sourceType`
- `reviewStatus`, `checkedBy`, `lastCheckedAt`

초기 seed:

```bash
bun run db:seed:visa-docs
```

현재 seed는 50건이며 법률 검수 전 상태이므로 `reviewStatus=PENDING`, `checkedBy=phase0_seed_unreviewed`로 들어갑니다. 행정사 검수 후 `APPROVED`된 row만 direct-client public read policy에 노출됩니다.

검증:

```bash
bun run test:visa-document-matrix
```

완료 기준:

- 50개 서류 matrix row 존재
- 20개 이상 validation rule row 정의
- D-2, D-4, D-10, E-7, F-2, F-5 포함
- Supabase RLS: approved row만 public read

### Supabase pgvector RAG

이미 구현된 항목:

- `KnowledgeDocument`, `KnowledgeChunk`
- `vector` extension
- `KnowledgeChunk.embedding vector(384)`
- HNSW cosine index
- tsvector GIN index
- hybrid RRF SQL function
- approved/current/non-superseded 문서만 검색

공식 출처 수집 경로:

- `GET/POST /api/knowledge/monitor`: scheduled watchlist diff 또는 PENDING 후보 생성
- `bun run knowledge:harvest:official -- --persist --min-chunks 500`: 500+ 청크 확장을 위한 bulk harvest
- `bun run knowledge:embed:candidates -- --min-candidate-chunks 500`: 승인 전 후보 청크 사전 임베딩

Bulk harvest는 공식 watchlist를 fetch하고 변경된 본문을 PENDING `KnowledgeDocument` 후보로 저장합니다. 관리자/행정사 승인 전에는 production RAG 검색 대상이 아니며, 승인 후 `bun run knowledge:pgvector`를 다시 실행해야 임베딩됩니다.
HTML/텍스트 공식 출처는 본문을 정규화해 청킹하고, PDF 공식 첨부는 `pdf-parse`로 텍스트를 추출한 뒤 `extraction_method`, `content_type`, `byte_sha256`, `byte_length`, `extracted_chars` 메타데이터와 함께 후보 본문에 포함합니다. `knowledge:harvest:official` CLI는 `html`, `pdf_text`, `plain_text`, `binary_metadata` 방식별 수집 건수와 추출 오류를 로그로 출력합니다. PDF 파싱에 실패하거나 텍스트가 비어 있으면 수집 작업을 실패시키지 않고 기존처럼 바이너리 해시/크기와 `extraction_error`를 저장합니다. HWP/엑셀/ZIP 등 비-PDF 첨부는 아직 텍스트 추출 대상이 아니며 변경 감지용 바이너리 메타데이터만 후보화합니다.
후보 청크 사전 임베딩은 승인 직후 전환 시간을 줄이기 위한 운영 편의 기능입니다. 승인 시 기존 후보 chunk row와 pgvector embedding을 보존하므로, 행정사 승인 직후 `knowledge:promote:candidates`가 strict 검증, 승인 적용, corpus finalization, production audit을 한 번에 수행합니다. Production 검색 SQL은 여전히 `reviewStatus=APPROVED` 문서만 반환합니다. 500+ readiness는 전체 승인 청크뿐 아니라 `sourceType`이 `official_`로 시작하고 `sourceUrl`이 허용된 공식 HTTPS 도메인(`*.go.kr`, `*.korea.kr`)인 승인/임베딩 청크가 500개 이상인지도 별도로 검증합니다.

현재 임베딩 모델은 `Xenova/multilingual-e5-small` 384차원입니다. `OpenAI text-embedding-3-small` 1536차원으로 전환하려면 별도 migration으로 `vector(1536)` 컬럼 또는 신규 embedding table을 추가해야 합니다.

## Phase 1 연결

Layer 1 deterministic validation은 `VisaDocumentRequirement.validationRules`와 OCR 결과를 비교하는 방식으로 연결합니다.

초기 검증 축:

- 서류 슬롯 누락
- 발급기관 누락
- 발급일/유효기간 초과
- 필수 기재 항목 누락
- 교차 검증 rule key: `cross_check:*`

Layer 2 RAG/Claude 판단은 현재 `KnowledgeDocument`/`KnowledgeChunk` 검색 결과와 연결합니다.

Layer 3 cross-document 검증은 matrix row의 `validationRules` 중 `cross_check:*` key를 기준으로 별도 evaluator를 확장합니다.

초기 구현 위치:

- `src/lib/documents/verification.ts`
- Layer 1: `VisaDocumentRequirement.validationRules` vs. `DocumentItem.ocrExtractedRedacted`
- Layer 2: approved pgvector RAG 검색, 선택적 Claude JSON 판단
- Layer 3: 동일 학생 프로필 내 이름 불일치, E-7 직무/회사 증빙 등 교차 검증 hook
