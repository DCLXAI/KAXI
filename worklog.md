# K-Bridge Gateway Worklog

---
Task ID: 1
Agent: main (Super Z)
Task: K-Bridge Gateway MVP 프로토타입 구현 — "브로커 없이 준비하는 한국 유학" 원스톱 플랫폼

Work Log:
- fullstack-dev 스킬 로드 후 Next.js 16 프로젝트 초기화
- 다국어 사전 (KO/VI/MN/EN) 구축: src/lib/i18n/translations.ts
- 학교 20개 DB 시드: 어학당 8 + 전문대 3 + 4년제 6 + 대학원 1 + 비자심사강화 2 — 인증/일반/주의 플래그 포함
- 진단 추천 로직 구현: 10문항 입력 → 추천 경로/예상비용/필요서류/경고/다음액션
- AI 도우미 FAQ 룰베이스: D-2/D-4/비용/비자보장/허위서류/취업/결핵/TOPIK
- Zustand store: 언어설정(persist), 리드(persist), 서류상태(persist)
- 6개 핵심 화면 컴포넌트 구현:
  1. Landing — "브로커 없이 준비하는 한국 유학" + 브로커 비교표 + 4개 기능 카드
  2. Diagnosis — 10문항 폼 + 추천 결과 + 리드 저장
  3. Schools — 20개 학교 카드 + 4개 필터(지역/과정/인증/학비) + 인증 배지
  4. CostCalculator — 플랫폼 vs 브로커 항목별 비교표 + 30% 초과시 경고
  5. Documents — 10종 서류 + 7가지 상태 + 진행률 + 업로드/상태변경
  6. Partners — 5종 검증 파트너 + 취업매칭 제외 경고 + 상담요청 모달
- 관리자 리드 리스트 (데모) — 검색/상세보기
- AI 도우미 — 우하단 플로팅 버튼 + 빠른질문 3개 + 다국어 리마운트
- ESLint 통과 (React 19 strict rule 회피: setState in effect → onChange로 이동, key remount 패턴)
- Agent Browser로 모든 화면 검증: 랜딩/진단/결과/학교/비용/서류/파트너/관리자, 다국어 전환, AI 응답, 리드 저장→관리자 표시
- 스크린샷 7장 캡처: /home/z/my-project/download/kbridge-*.png

Stage Summary:
- 완성물: K-Bridge Gateway 프로토타입 (브로커 대체 한국 유학 준비 플랫폼)
- 6개 핵심 화면 + 다국어 4개 (KO/VI/MN/EN) + 학교 DB 20곳 + AI 도우미
- 7/22 데모 우선순위 8개 항목 중 8/8 구현 (랜딩, 진단폼, 학교DB, 비용계산기, 서류체크리스트, 행정사연결, 관리자 리드리스트, 샘플 플랜 리포트는 진단 결과로 통합)
- 기술 스택: Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Zustand(persist) + Lucide icons
- 법적 경계 명시: 취업매칭 제외(직업안정법), 비자보장/허위서류 거절, 행정사 영역 분리
- 모든 화면 브라우저 검증 완료, ESLint 통과, 런타임 에러 없음

---
Task ID: 1
Agent: sub-agent (학교 DB 확장)
Task: 학교 DB 20개 → 50개 확장

Work Log:
- 기존 20개 학교 유지 (구조/데이터 변경 없음)
- 추가 30개 학교 데이터 입력:
  - 어학당 12개: 서울 6 (ewha-klc, konkuk-kli, hongik-kli, sejong-klc, soongsil-kli, kookmin-kli) + 지방 6 (inha-kli, chonnam-kli, chosun-kli, keimyung-kli, cnu-kli, kangwon-kli)
  - 전문대 3개: indeok, dongseoul, suwon-sc
  - 4년제 9개: 서울 4 (konkuk-u, sejong-u, hongik-u, soongsil-u) + 지방 5 (inha-u, chonnam-u, cnu-u, keimyung-u, kangwon-u)
  - 대학원 2개: yonsei-grad, kaist-grad
  - 직업계열/요양보호사 3개: daegu-health, hanyang-women, suyoung-women
  - 비자심사 강화 1개: warn-3 (가명 C 직업훈련원)
- 베트남어/몽골어/영어 번역 4개 언어 모두 작성 (한국어 의미 보존)
- 기존 "Trường认证" 혼용 패턴 → "Trường được công nhận" 표준 베트남어로 개선 (신규 항목)
- 학비/기숙사비 가이드라인 준수 (어학당 130~190만, 전문대 230~280만, 4년제 340~520만, 기숙사 150~300만/6개월)
- 섹션별 주석 카운트 업데이트 (전문대 3→5, 4년제 6→15, 대학원 1→3, 비자강화 2→3)
- ESLint 검증 통과 (에러 0개)
- ID 중복 검증 완료 (50개 모두 unique)

Stage Summary:
- 총 50개 학교 DB 완성
- 카테고리별 분포:
  - 어학당 (D-4): 20개 (accredited 17 + standard 3 — 기존 jeju, 신규 chosun/kangwon)
  - 전문대 (D-2): 5개 (영진, 경북, 인덕, 동서울, 수원과학)
  - 4년제 (D-2): 15개 (서울 10 + 경기 1 + 부산 1 + 대구 1 + 광주 1 + 기타 1)
  - 대학원 (D-2): 3개 (SNU, 연세, KAIST)
  - 직업계열/요양보호사 (D-2): 4개 (청암, 대구보건, 한양여자, 수원여자)
  - 비자심사 강화 (caution): 3개 (warn-1, warn-2, warn-3 — 가명 표시)
- 지역별 분포: 서울 26 + 경기 4 + 부산 2 + 대구 5 + 광주 3 + 기타 10
- 인증 상태: accredited 44 / standard 3 / caution 3

---
Task ID: 7
Agent: sub-agent (데모 대본)
Task: 7/22 멘토 데모 3분 시나리오 대본 작성

Work Log:
- 이전 worklog 파악
- schools.ts / knowledge.ts 분석
- 3분 대본 작성 (5개 구간, Q&A, 백업 플로우, 체크리스트)

Stage Summary:
- /home/z/my-project/download/demo-script.md 생성
- 3분(180초) 분량
- 멘토 대상, 구어체, 실제 발화용

---
Task ID: 2-6, 8 (통합)
Agent: main (Super Z)
Task: 백엔드 영속화 + RAG 연동 + 프론트엔드 API 전환 + 브라우저 검증

Work Log:
- Prisma 스키마 정의: Lead, PartnerRequest, School, ChatLog 모델 (SQLite)
- db:push 실행으로 DB 생성
- API 라우트 6개 구현:
  - GET/POST /api/leads
  - GET/DELETE /api/leads/[id]
  - GET/POST /api/partner-requests
  - GET /api/schools
  - GET /api/stats (집계 통계)
  - POST /api/ai/chat (RAG + LLM)
- RAG 지식 베이스 구축: 17개 공식 문서 (visa/cost/documents/school/legal/process/warning 카테고리)
- 키워드 기반 retrieval 로직 (운영시 Vector DB로 교체 가능)
- z-ai-web-dev-sdk 연동: 서버 사이드 LLM 호출, 시스템 프롬프트로 컨텍스트 주입
- Zustand store를 API 호출 기반으로 전환 (saveDiagnosis, fetchLeads, submitPartnerRequest)
- AI 도우미: RAG API 호출, 출처 문서 표시, RAG+LLM 배지, 빠른 질문 4개
- Admin 페이지: 통계 대시보드 4개 (총 리드/상담대기/브로커 이용자/주요 경로), 국적별 분포, 새로고침 버튼
- Diagnosis: 비동기 저장, 로딩 스피너, 에러 처리
- Partners: API 호출 상담 요청, 로딩/에러 처리
- ESLint 통과, 런타임 에러 없음

브라우저 검증 (Agent Browser):
- [✓] 진단 폼 제출 → 서버 저장 → 관리자 표시
- [✓] 관리자 통계 대시보드 4개 정상 표시
- [✓] AI 도우미 "D-2와 D-4 차이?" → RAG+LLM 답변 + 참고 문서 3개 표시
- [✓] 파트너 상담 요청 → 서버 저장 → 관리자 통계 반영
- [✓] 50개 학교 DB 정상 표시 (인증대학 배지 포함)

Stage Summary:
- 완전한 풀스택 전환: localStorage → Prisma + SQLite
- RAG 파이프라인: 17개 공식 문서 → retrieval → LLM (z-ai-web-dev-sdk)
- 멘토 데모 준비 완료: 7/22 3분 시나리오 대본 (download/demo-script.md)
- 모든 API 엔드포인트 브라우저 검증 완료
