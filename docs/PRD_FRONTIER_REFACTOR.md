# KAXI 프런티어급 리팩토링 PRD — 행정사 × 외국인 플랫폼

Status: Draft v1.0
작성일: 2026-07-08
대상 독자: 제품 오너, 개발 리드, 파트너 행정사 자문

---

## 0. 요약 (Executive Summary)

KAXI는 현재 **"브로커 없이 준비하는 한국 유학" MVP**다. Next.js 16 단일 앱에 진단·학교DB·서류 체크리스트·룰 엔진·RAG 지식베이스·개인정보 거버넌스까지 이미 상당한 도메인 자산이 쌓여 있다. 그러나 실제 운영 가능한 플랫폼이 되기에는 4가지 구조적 결함이 있다:

1. **RAG가 pgvector가 아니다.** 임베딩이 프로세스 내(@xenova/transformers, 384차원) + JSON 파일 캐시로 동작하고, `KnowledgeChunk.embeddingJson`(JSONB)에 저장될 뿐 DB 차원의 벡터 검색이 없다. 지식이 수백 건을 넘는 순간 확장 불가.
2. **AI 백엔드가 운영 불가능한 구조다.** 기본 백엔드가 Codex CLI 서버리스이고, 폴백이 "개발자 Mac으로 뚫는 remote-bridge 터널"이다. 개발자 노트북이 꺼지면 상담 기능이 죽는 아키텍처는 프로덕션이 아니다.
3. **단일 관리자·단일 테넌트다.** env 기반 관리자 1명(NextAuth) 외에 학생·행정사 계정 체계가 없다. "행정사 플랫폼"이 되려면 파트너 행정사가 로그인해서 케이스를 처리하는 워크스페이스가 필수다.
4. **제품 정의가 좁다.** 유학(D-2/D-4) 준비에 갇혀 있다. 행정사 시장의 실제 수요는 체류 전반(연장·변경·영주·귀화·E-7/F-2/F-4/F-6, 사업자등록, 각종 민원 대행)이다.

본 PRD는 KAXI를 **"외국인의 한국 체류 전 생애주기를 커버하는, 행정사와 외국인을 연결하는 AI 기반 케이스 협업 플랫폼"**으로 재정의하고, Supabase PostgreSQL + pgvector 기반의 단계별 리팩토링 계획(Phase 0~4)을 제시한다.

---

## 1. 비전 재정의

### 1.1 As-Is → To-Be

| | As-Is (현재 MVP) | To-Be (목표) |
|---|---|---|
| 포지셔닝 | 유학 준비 정보 플랫폼 | 외국인 체류 생애주기 × 행정사 케이스 협업 플랫폼 |
| 사용자 | 익명 방문자(베트남 유학 준비생) + 관리자 1명 | 외국인 회원, 파트너 행정사(사무소 단위), 플랫폼 운영자 |
| AI 역할 | FAQ 룰베이스 + 실험적 LLM 상담 | 근거 인용(grounded) 자가진단 → 서류 준비 → 행정사 인계까지의 코파일럿 |
| 지식베이스 | 정적 TS 파일 + DB 문서, 인메모리 벡터 | pgvector 기반 승인·버전 관리되는 법령/고시/매뉴얼 코퍼스 |
| 수익 | 없음 | 행정사 리드/케이스 수수료, 사무소 구독(SaaS), 프리미엄 진단 리포트 |

### 1.2 핵심 원칙 (기존 자산 계승)

현재 코드에 이미 새겨진 법적 경계는 그대로 계승·강화한다 (docs/legal/role-boundary.md 기반):

- **플랫폼은 행정심판·대행을 직접 수행하지 않는다.** 유상 대행 업무는 등록 행정사(파트너)에게 인계한다 (행정사법 경계).
- **취업 매칭 제외** (직업안정법), **비자 보장·허위서류 요청 거절**은 룰 엔진 하드가드로 유지.
- **AI 답변은 법률 자문이 아니라 "공식 출처 안내 + 준비도 진단"**이며, 반드시 출처 인용(citations)과 고위험 시 에스컬레이션(EscalationCase)을 동반한다.

---

## 2. As-Is 진단 (코드베이스 근거)

### 2.1 잘 만들어진 자산 (버리지 말 것)

| 자산 | 위치 | 평가 |
|---|---|---|
| Phase 1 도메인 스키마 (25 모델) | `prisma/postgres/schema.prisma` | Organization/User/StudentProfile/Consent/EscalationCase/AuditEvent 등 멀티테넌트 확장의 뼈대가 이미 존재. KnowledgeDocument에 validFrom/validTo/reviewStatus/supersededBy 등 법령 지식 버저닝 필드 완비 |
| 컴플라이언스 룰 엔진 | `src/lib/rules/` (visa-rule-engine 466줄, compliance-dsl) | 룰 AST + 버전 + 테스트 + 법적 검토 상태(LegalReviewStatus)까지. 행정사 도메인 확장의 핵심 자산 |
| 지식 거버넌스 | `src/lib/knowledge/` (repository 772줄, source-monitor, citations, legal-basis) | 출처 감사, 변경 diff, 영향도(rule/user impact) 분석, 모니터 알림까지 구현됨 |
| 개인정보 체계 | `src/lib/privacy/` + Consent 모델 | 동의 스코프 6종, PII 암호화/HMAC 해시, 보존기간 강제, 프로덕션 env 프리플라이트 |
| 도메인 테스트 게이트 | `package.json`의 ci:domain / ci:ops (20+ 스크립트) | 인용 검증, 프라이버시 가드, 스키마 정책 등 도메인 특화 게이트 — 형태만 표준화하면 됨 |
| 다국어 기반 | KO/VI/MN/EN 번역, Synonym 테이블 | 외국인 대상 서비스의 필수 자산 |

### 2.2 구조적 부채 (리팩토링 대상)

| # | 부채 | 근거 | 리스크 |
|---|---|---|---|
| D1 | 벡터 검색이 인메모리 + JSON 파일 캐시 | `src/lib/embeddings/vector-store.ts` — multilingual-e5-small 384d + TF-IDF 폴백, `data/vector-store/embeddings-cache.json` | 서버리스 콜드스타트마다 재적재, 지식 수천 건 확장 불가, 검색 품질 한계 |
| D2 | AI 백엔드 4종 혼재 | `backend-selector.ts` — codex / zai / tool-fallback / remote-bridge(개발자 Mac 터널) | 운영 신뢰성 없음, 비용·품질 통제 불가, 응답 지연 52초 타임아웃 설계 |
| D3 | Prisma 이중 스키마 (SQLite/Postgres) | `prisma/schema.prisma` + `prisma/postgres/schema.prisma`, 파리티 검증 스크립트로 유지 | 스키마 25모델 × 2를 수동 동기화. 마이그레이션 사고 위험, 개발 마찰 |
| D4 | 인증이 관리자 1명 | `auth-options.ts` — ADMIN_EMAIL/ADMIN_PASSWORD_HASH env | 학생/행정사 계정, 사무소 테넌시, RLS 전부 부재 |
| D5 | 프론트가 단일 [view] 라우터 + 거대 컴포넌트 | `src/app/[view]/page.tsx` + kbridge/ 16개 파일 10,700줄 (Agent.tsx 1,161줄) | SEO/딥링크/코드 스플리팅 불가, 유지보수 곤란 |
| D6 | 테스트가 bun 스크립트 40여 개 | `scripts/test-*.ts` | 러너/리포팅/커버리지 표준 부재. CI 시간 선형 증가 |
| D7 | 리포지토리 위생 | 루트에 `.kaxi-admin-credentials.txt`, dev.log, tsbuildinfo, download/, upload/ 등 | **자격증명 파일은 즉시 폐기·로테이션 필요.** 저장소 정리 필요 |
| D8 | 문서 저장이 DB 바이트 기본 | `DOCUMENT_UPLOAD_STORAGE_BACKEND="database"` | 여권/통장 사본을 DB row에 저장 — 용량·보안·비용 모두 부적합 |

---

## 3. To-Be 제품 정의

### 3.1 페르소나

1. **외국인 이용자 (P1)** — 유학생(D-2/D-4), 취업자(E-7/E-9), 결혼이민(F-6), 동포(F-4/H-2), 장기체류자(F-2/F-5 준비). 언어: VI/MN/EN/KO(+확장: UZ, TH, KM, NE). 니즈: "내 상황에서 뭘 할 수 있고, 뭘 준비해야 하고, 누구에게 맡겨야 하나".
2. **파트너 행정사 (P2)** — 출입국 전문 행정사 사무소. 니즈: 검증된 리드, 사전 정리된 케이스 파일(서류·타임라인·리스크 진단 포함), 반복 질문 자동화.
3. **플랫폼 운영자 (P3)** — 지식베이스 승인, 룰 배포, 파트너 관리, 감사/컴플라이언스 모니터링.

### 3.2 핵심 유저 저니 (케이스 파이프라인)

```
[외국인]                                 [플랫폼]                        [행정사]
 언어 선택 → 상황 진단(슬롯 수집)  →  룰 엔진 + RAG 근거 진단        
 준비도 스코어 + 필요서류 체크리스트 ←  (readiness + compliance)      
 서류 업로드/OCR → 자동 검증        →  고위험/대행필요 판정 시         
                                        EscalationCase 생성·매칭   →   케이스 수임, 워크스페이스에서
 진행상황 알림 (다국어)            ←   상태 동기화                ←   서류 검토·보완요청·진행 업데이트
 완료·후기                          →  수수료 정산, 감사로그
```

### 3.3 기능 모듈 (우선순위순)

| 모듈 | 설명 | 기존 자산 | 신규 작업 |
|---|---|---|---|
| F1. 자가진단 + 준비도 | 체류목적별 슬롯 수집 → 룰 엔진 평가 → 준비도 점수·필요서류·경고 | Diagnosis, readiness.ts, visa-rule-engine | 룰셋을 유학 외 체류유형(연장/변경/E-7/F-6 등)으로 확장. 룰은 반드시 법령 출처 참조(sourceRefs) 필수화 |
| F2. AI 상담 (Grounded Q&A) | pgvector RAG + 출처 인용 + 다국어 답변, 고위험 에스컬레이션 | agent/, knowledge/, citations | 백엔드를 Claude API로 표준화(§5.3), 검색을 pgvector로 이전(§5.2) |
| F3. 서류함 + OCR | 업로드 → OCR → 필드 추출 → 룰 검증 → 만료 알림 | DocumentItem/UploadedFile, DOCUMENTS_OCR_FLOW.md | Supabase Storage 이전, OCR 파이프라인(Claude 비전) 실구현 |
| F4. 행정사 매칭·케이스 협업 | 에스컬레이션 → 사무소 매칭 → 케이스 워크스페이스(서류 공유, 코멘트, 상태) | EscalationCase, AgentReview, Organization | **신규 최대 작업.** 행정사용 대시보드, 수임·정산 흐름, 제3자 제공 동의 연동 |
| F5. 지식 운영 콘솔 | 문서 인제스천 → 청킹 → 임베딩 → 법적 검토 → 승인 배포, 출처 모니터 | admin/knowledge, source-monitor | 인제스천 파이프라인 자동화(§6), 승인 워크플로 UI |
| F6. 학교/기관 디렉토리 | 기존 학교 DB → "검증 기관 디렉토리"로 일반화 | schools/ | 데이터 갱신 파이프라인, 검증 배지 정책 문서화 |
| F7. 운영·감사 | 감사로그, 보존기간, 레이트리밋, 준비도 대시보드 | audit.ts, ops/ | 관측성 표준화(§5.8) |

### 3.4 수익 모델 (운영 가능성의 전제)

1. **케이스 인계 수수료** — 검증 리드/케이스당 정액 또는 수임료의 %. (요금은 행정사와 이용자 간 계약; 플랫폼은 중개 수수료 — 행정사법 자문 필요, docs/legal 계약 초안 확장)
2. **행정사 SaaS 구독** — 케이스 워크스페이스, 반복 질문 자동응답 위젯, 서류 사전검증 도구.
3. **프리미엄 진단 리포트** — 상세 준비도 리포트 + 타임라인 (무료 진단의 상위 버전).

---

## 4. 법·컴플라이언스 요구사항 (Non-negotiable)

1. **행정사법 경계**: 플랫폼 명의의 서류 작성·제출 대행 금지. 모든 대행 업무는 파트너 행정사 명의. UI 전반에 역할 고지.
2. **개인정보보호법**: 제3자 제공(행정사 인계) 시 건별 동의 — 기존 `THIRD_PARTY_PROVISION` 동의 스코프를 케이스 인계 플로우에 강제 연결. 국외이전 스코프는 LLM API 사용과 연동(§5.3).
3. **AI 고지**: AI 답변에 "법률 자문 아님 + 출처 + 최종 확인일" 상시 표기 (기존 SourceAnnotations 계승). 답변 불가/저신뢰 시 침묵보다 에스컬레이션.
4. **보존·파기**: 기존 retention 체계를 케이스/서류로 확장 — 케이스 종결 후 N일 파기, OCR 원문 최소보존.
5. **감사가능성**: 룰 평가 결과(ComplianceEvaluation), AI 답변의 사용 청크·모델·버전을 AuditEvent에 기록 (일부 구현됨 — 전 경로로 확대).

---

## 5. 기술 아키텍처 리팩토링

### 5.1 데이터베이스: Postgres 단일화 (Supabase)

- **이중 스키마 폐지.** `prisma/postgres/schema.prisma`를 유일한 스키마로 승격, SQLite 스키마와 파리티 스크립트 삭제. 로컬 개발·CI는 Docker Postgres 또는 `supabase start`로 통일 (pgvector 포함 이미지).
- Prisma 유지하되, 벡터 검색·하이브리드 검색은 `$queryRaw` + SQL 뷰/함수로 구현 (Prisma는 vector 타입을 `Unsupported("vector")`로 선언).
- 마이그레이션은 `SUPABASE_DIRECT_URL`로 `prisma migrate deploy` (기존 SUPABASE_INTEGRATION.md 절차 유지).
- 레거시 MVP 테이블(Lead, PartnerRequest 등)은 Phase 1 모델로 데이터 이관 후 단계적 폐기.

### 5.2 pgvector RAG 설계 (핵심)

**5.2.1 스키마**

```sql
create extension if not exists vector;

-- KnowledgeChunk 확장: embeddingJson(JSONB) → 네이티브 vector로 이전
alter table "KnowledgeChunk"
  add column embedding vector(1024),
  add column tsv tsvector generated always as (to_tsvector('simple', content)) stored;

create index knowledge_chunk_embedding_hnsw
  on "KnowledgeChunk" using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index knowledge_chunk_tsv on "KnowledgeChunk" using gin (tsv);
```

- 차원 1024 = BGE-M3 / voyage 계열 기준. `embeddingModel`/`embeddingDim` 컬럼(기존 존재)으로 모델 버전 관리 — 모델 교체 시 신 컬럼 병행 → 재임베딩 → 스왑.
- 한국어 형태소 분석이 없는 환경을 감안해 keyword 축은 `simple` tsvector + **기존 Synonym 테이블로 질의 확장**(이미 자산 있음). 필요 시 pg_bigm/pg_trgm 추가 검토.

**5.2.2 하이브리드 검색 (RRF)**

```sql
with vec as (
  select id, row_number() over (order by embedding <=> $1) as r
  from "KnowledgeChunk" c
  join "KnowledgeDocument" d on d.id = c."documentId"
  where d."reviewStatus" = 'APPROVED'
    and (d."validTo" is null or d."validTo" > now())
    and d.language = any($2)          -- 질의 언어 + ko 원문
  order by embedding <=> $1 limit 40
),
kw as (
  select id, row_number() over (order by ts_rank(tsv, q) desc) as r
  from "KnowledgeChunk", websearch_to_tsquery('simple', $3) q
  where tsv @@ q limit 40
)
select id, sum(1.0/(60+r)) as rrf
from (select * from vec union all select * from kw) t
group by id order by rrf desc limit $4;
```

- 검색 필터는 **거버넌스와 일체화**: APPROVED + 유효기간 내 문서만. 기존 `KNOWLEDGE_RAG_SOURCE=strict_db` 정책을 SQL WHERE로 강제.
- 기존 인메모리 vector-store.ts는 **로컬/오프라인 폴백**으로만 축소 유지 후 Phase 3에서 제거.

**5.2.3 임베딩 모델**

| 옵션 | 장점 | 단점 | 권고 |
|---|---|---|---|
| BGE-M3 (1024d, self-host) | 다국어(KO/VI/EN 강함) + dense/sparse 동시, 비용 고정 | 추론 서버 운영 필요 | **1순위** — Supabase Edge/전용 소형 GPU 또는 CPU 추론 |
| 관리형 임베딩 API (예: Voyage multilingual) | 무운영 | 국외이전 이슈, 종속 | 초기 속도 우선 시 대안 |
| 현행 multilingual-e5-small 384d | 이미 동작 | 법령 한국어 검색 품질 한계 | 마이그레이션 기간 폴백만 |

- 어떤 선택이든 `embeddingModel` 컬럼 기준으로 **질의 임베딩과 문서 임베딩 모델 일치 검증**을 런타임 가드로 추가.

**5.2.4 청킹·인용**

- 법령/고시류: 조문 단위 청킹(조·항 메타데이터 보존), 매뉴얼/FAQ: 400~800자 의미 단위. 기존 chunk-quality.ts 지표(중복률, 길이 분포)를 인제스천 게이트로 편입.
- 답변 인용은 청크 ID → 문서 sourceUrl + validFrom/lastCheckedAt으로 렌더 (기존 citations.ts 로직 계승).

### 5.3 AI 백엔드 표준화

- **remote-bridge(Mac 터널)·Codex CLI 서버리스·z-ai 경로 전면 제거.** 백엔드 선택기 4종 분기를 단일 LLM 게이트웨이 모듈로 대체.
- **Anthropic Claude API 채택** (TypeScript SDK `@anthropic-ai/sdk`):
  - 상담/에이전트(F2): `claude-opus-4-8` + adaptive thinking — 다국어 법령 추론 품질이 제품의 핵심이므로 최상위 모델 기본. 비용 최적화가 필요해지면 라우팅(단순 FAQ→경량 모델)은 운영 데이터 확보 후 결정.
  - 구조화 추출(슬롯 추출, OCR 후 필드 정규화): structured outputs(`output_config.format`)로 스키마 보장 — 기존 slot-extraction.ts의 정규식 접근을 대체·보강.
  - 문서 OCR/판독(F3): Claude 비전 입력(PDF/이미지) 활용.
  - 지식 인제스천 배치(요약·메타데이터 추출): Batch API(50% 비용).
- **기존 가드 자산 재접속**: preflight(주제 필터), 레이트리밋/쿼터, AgentRequestLedger, 인용 검증을 게이트웨이 앞뒤로 그대로 연결. `AI_REQUIRE_LLM`/폴백 정책 env 는 "LLM 불가 시 룰베이스 공식 요약 폴백" 1개로 단순화.
- 프롬프트 캐싱: 시스템 프롬프트(역할 경계·법적 고지)와 룰 컨텍스트를 안정 프리픽스로 고정해 `cache_control` 적용.
- 개인정보: LLM 호출 전 PII 마스킹(기존 pii.ts) 필수 경유 + 국외이전 동의 스코프 연동. ZDR/보존 정책은 법무 검토 항목으로 명시.

### 5.4 인증·멀티테넌시·RLS

- **Supabase Auth 도입** (SUPABASE_INTEGRATION.md Phase 4 실행):
  - 외국인: 이메일/전화 + 소셜(Zalo/Google) — User.zaloUid 필드 기존 존재.
  - 행정사: 사무소(Organization, type=PARTNER_AGENT_OFFICE) 초대 기반 가입, 운영자 승인.
  - 관리자: 기존 NextAuth+TOTP를 Supabase Auth MFA로 이관.
- **RLS 정책** (DATABASE_PHASE1.md에 예고된 후속작업):
  - 학생 데이터(StudentProfile/DocumentItem/UploadedFile): 본인 + 케이스 배정된 사무소만 (제3자 제공 동의 GRANTED 조건).
  - EscalationCase: 배정 조직 스코프. KnowledgeDocument: 운영자 쓰기, 전체 읽기(APPROVED만 공개 뷰).
  - 서비스 롤 키는 서버 전용, 앱 런타임은 세션 토큰 기반 접근으로 RLS 통과.

### 5.5 문서·스토리지·OCR

- 업로드 바이트를 DB → **Supabase Storage(private bucket) + 서명 URL**로 이전 (기존 upload-intent 서명 흐름 재사용). DB에는 메타데이터·해시·암호화 키 참조만.
- OCR 파이프라인: 업로드 → 바이러스/포맷 검증 → Claude 비전 추출(structured output) → 룰 검증(만료일, 성명 일치) → NEEDS_REVIEW/APPROVED. 상태 머신은 기존 DocumentStatus enum 그대로.
- 암호화: 기존 crypto.ts(DATA_ENCRYPTION_KEY) 유지, Storage 측 at-rest 암호화와 이중화.

### 5.6 프론트엔드 재구성

- `[view]` 단일 라우트 → App Router 세그먼트 분리: `/(public)` 랜딩·진단·디렉토리, `/(student)` 서류함·케이스, `/(partner)` 행정사 워크스페이스, `/(admin)` 운영 콘솔. 코드 스플리팅 + SEO(다국어 metadata) 확보.
- kbridge 거대 컴포넌트(Agent.tsx 1,161줄 등)를 기능 모듈별로 분해, 서버 컴포넌트 우선.
- i18n: 커스텀 translations.ts → next-intl(이미 의존성 존재)로 이관, 라우팅 로케일(`/vi/...`) 도입.

### 5.7 테스트·CI 표준화

- bun 스크립트 40여 개를 **Vitest 스위트로 이식**하되, 도메인 게이트 분류(ci:types/domain/ops)는 유지. Playwright E2E는 핵심 저니(진단→에스컬레이션→케이스) 시나리오로 확장.
- RAG 품질 회귀: 기존 quality/ 데이터셋을 **검색 recall@k + 인용 정확도 + 다국어 답변 평가** 고정 벤치로 승격, PR 게이트화.
- 저장소 위생: `.kaxi-admin-credentials.txt` 즉시 삭제·크리덴셜 로테이션, *.tsbuildinfo/log/다운로드 산출물 gitignore 정리.

### 5.8 관측성·운영

- 구조화 로깅(요청 ID, 케이스 ID, 모델·토큰 사용량) + Sentry(에러) + 간단한 비용 대시보드(LLM 토큰, 임베딩 호출).
- 기존 readiness/health API를 유지하되 업타임 모니터 연결. CRON(보존기간 강제, 출처 모니터)은 Vercel Cron/Supabase cron으로 고정.

---

## 6. 지식·데이터 파이프라인 (운영 프로세스)

1. **수집**: 출입국·외국인정책본부 고시/공지, 하이코리아 매뉴얼, 법제처 국가법령정보 — source-monitor(기존)가 변경 감지 → 후보 등록.
2. **정제·청킹**: 조문/섹션 단위 파싱 → chunk-quality 게이트 → Claude 배치로 요약·주제·언어 메타데이터 생성 (기존 enrich-knowledge-metadata 계승).
3. **임베딩**: BGE-M3 1024d → `KnowledgeChunk.embedding` upsert (contentHash 기준 증분).
4. **법적 검토**: diff + 영향도(연관 룰·과거 답변 사용자) 리포트(기존 repository.ts 구현) → 운영자/자문 행정사 승인 → APPROVED 배포.
5. **룰 동기화**: 지식 변경이 참조 룰(sourceRefs)에 영향 시 룰 초안 자동 생성 → ComplianceRuleTest 통과 → 버전 배포.
6. **폐기**: supersededBy 체인으로 구버전 검색 제외(SQL 필터), 이력은 감사용 보존.

---

## 7. 비기능 요구사항

| 항목 | 목표 |
|---|---|
| 검색 지연 | 하이브리드 검색 p95 < 150ms (HNSW, 10만 청크 기준) |
| 상담 응답 | 첫 토큰 p95 < 4s (스트리밍), 전체 < 30s |
| 가용성 | 99.5% (Vercel + Supabase 관리형) — Mac 터널 의존 제거가 전제 |
| 보안 | RLS 전 테이블, 서명 URL 만료 ≤ 10분, PII 마스킹 후 LLM 전송, 비밀키 Vercel env 전용 |
| 비용 가드 | 사용자당 일일 LLM 쿼터(기존 env 체계 유지), 월 비용 알림 |
| 접근성/언어 | 4개 언어 100% 커버리지 유지, 신규 문자열 번역 CI 체크 |

---

## 8. 단계별 로드맵

### Phase 0 — 안전화·기반 정리 (1~2주)
- [ ] `.kaxi-admin-credentials.txt` 삭제 + 전 크리덴셜 로테이션, 저장소 위생 정리
- [ ] Supabase 프로젝트 생성, Postgres 컷오버(기존 절차), `vector` extension 활성화
- [ ] SQLite 이중 스키마 폐지, 로컬 개발 Docker/supabase-cli Postgres 통일
- **Exit**: 프로덕션이 Supabase Postgres 단일 스키마로 동작, ci 통과

### Phase 1 — pgvector RAG 컷오버 (2~3주)
- [ ] KnowledgeChunk embedding vector(1024) + HNSW/GIN 인덱스 마이그레이션
- [ ] 임베딩 모델 확정(BGE-M3 권고) + 전량 재임베딩 배치
- [ ] 하이브리드 검색(RRF) SQL 함수 + Synonym 질의 확장, strict_db 필터 내장
- [ ] 검색 품질 벤치(recall@k) 기존 대비 ≥ 동등 확인 후 인메모리 스토어 폴백 강등
- **Exit**: 프로덕션 RAG가 pgvector로 서빙, 품질 벤치 통과

### Phase 2 — AI 백엔드 표준화 (2~3주)
- [ ] Claude API 게이트웨이 모듈 구현(스트리밍, structured outputs, 프롬프트 캐싱)
- [ ] backend-selector 4종 분기·remote-bridge·codex 경로 제거
- [ ] 기존 가드(프리플라이트/쿼터/인용 검증/PII 마스킹) 재접속, 국외이전 동의 연동
- [ ] 답변 품질 평가셋 재실행 + 비용 대시보드
- **Exit**: 상담·에이전트가 관리형 API로만 동작, 개발자 로컬 의존 0

### Phase 3 — 멀티테넌시·행정사 워크스페이스 (4~6주)
- [ ] Supabase Auth(학생/행정사/관리자) + RLS 전면 적용
- [ ] 케이스 파이프라인: 에스컬레이션→매칭→수임→협업→종결 (EscalationCase 확장)
- [ ] 서류함 Storage 이전 + OCR 파이프라인 실구현
- [ ] 파트너 온보딩(계약·검증 절차는 docs/legal 초안 확정과 병행)
- **Exit**: 파일럿 행정사 사무소 1~3곳이 실제 케이스 1건 이상 처리

### Phase 4 — 도메인 확장·상용화 (지속)
- [ ] 룰셋·지식을 체류 전반(연장/변경/E-7/F-6/영주 등)으로 확장 — 유형별 자문 행정사 검수
- [ ] 프론트 세그먼트 재구성 완료, next-intl 이관, SEO
- [ ] 수익화(케이스 수수료 정산, 구독) + 결제
- [ ] 테스트 Vitest 이식 완료, 관측성 대시보드
- **Exit**: 월 활성 케이스·유료 파트너 지표(§9) 달성

---

## 9. KPI

| 지표 | 6개월 목표 |
|---|---|
| 진단 완료율 (시작→결과) | ≥ 60% |
| AI 답변 인용률 (출처 포함 답변 비율) | ≥ 95% |
| 에스컬레이션→행정사 수임 전환율 | ≥ 25% |
| 케이스 파일 완성도 (행정사 추가요청 없이 개시 가능 비율) | ≥ 70% |
| 검색 품질 recall@5 (평가셋) | ≥ 0.85 |
| 활성 파트너 사무소 / 월 처리 케이스 | 5곳 / 50건 |

---

## 10. 리스크 & 오픈 이슈

| 리스크 | 완화 |
|---|---|
| 행정사법·중개 수수료 적법성 | 자문 행정사/변호사 검토 선행 (Phase 3 게이트). 수수료 모델 대안: 순수 SaaS 구독 |
| LLM 국외이전(개인정보) | PII 마스킹 기본 + 국외이전 동의 스코프, 마스킹 불가 데이터는 LLM 미전송 |
| 지식 최신성 (법령 개정 미반영 답변) | validTo/lastCheckedAt 필터 + 출처 모니터 알림 + 답변에 확인일 표기. 미확인 기간 초과 문서 자동 검색 제외 |
| BGE-M3 셀프호스팅 운영 부담 | 초기엔 관리형 임베딩 API로 시작 후 전환 가능 (embeddingModel 버저닝으로 무중단 교체) |
| 파트너 확보 실패 | Phase 3 파일럿을 기존 PartnerRequest 데이터/네트워크에서 소수 정예로 시작 |
| 오픈 이슈 | ① 임베딩 모델 최종 선택(운영 vs 품질) ② 결제/정산 PG 선정 ③ 베트남 외 타깃 국가 우선순위 ④ 케이스 SLA 정책 |

---

## 부록 A. 삭제/폐기 대상 목록

- `src/lib/codex/` 전체, `scripts/codex-local-bridge.ts`, `/api/codex/*` — remote-bridge 계열
- `src/lib/ai/zai.ts` 및 z-ai-web-dev-sdk 의존성
- `prisma/schema.prisma`(SQLite) + 파리티 검증 스크립트 (Phase 0 이후)
- `data/vector-store/embeddings-cache.json` 및 파일 캐시 경로 (Phase 1 이후)
- 루트 위생: `.kaxi-admin-credentials.txt`(즉시), `dev.log`, `*.tsbuildinfo`, `download/`, `upload/`, `tool-results/`

## 부록 B. 참조 문서

- `docs/DATABASE_PHASE1.md` — Phase 1 스키마 정책 (본 PRD가 계승)
- `docs/SUPABASE_INTEGRATION.md` — Supabase 컷오버 절차 (Phase 0 실행서)
- `docs/legal/*` — 역할 경계·계약·개인정보 초안 (Phase 3 전 확정 필요)
- `docs/COMPLIANCE_RULE_ENGINE.md`, `docs/READINESS_SCORE_DESIGN.md` — 룰/준비도 설계
