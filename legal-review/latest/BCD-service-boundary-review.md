# B/C/D. 법무 문서·서비스 문구·사실 데이터 검수

| 항목 | 그룹 | 대상 | 위치 | 검수 관점 |
|---|---|---|---|---|
| B1 | legal_documents | 역할 경계 정의 | docs/legal/role-boundary.md | AI 상담·서류 사전검증·케이스 인계가 행정사 업무 대행으로 오인되지 않는지 |
| B2 | legal_documents | 파트너 행정사 계약 초안 | docs/legal/admin-scrivener-partner-contract-draft.md | 수수료 모델, 책임 분담, 손해배상, 소개·알선료 리스크 |
| B3 | legal_documents | 개인정보처리방침 초안 | docs/legal/privacy-policy-draft.md | 수집 항목, 보존기간, Claude API 국외이전 고지 |
| B4 | legal_documents | 제3자 제공 흐름 | docs/legal/data-sharing-flow.md | THIRD_PARTY_PROVISION 동의 시점과 행정사 제공 정보 범위 |
| B5 | legal_documents | 학생 이용약관 초안 | docs/legal/student-terms-draft.md | AI 안내 한계 고지와 면책 조항 |
| C1 | service_copy | AI 답변 고지문 | src/components/kbridge/SourceAnnotations.tsx, src/app/api/ai/consult/route.ts, src/lib/agent/meta.ts | 법률 자문 아님, 출처, 확인일, 4개 언어 문구의 법적 등가성 |
| C2 | service_copy | 거절·경고 시나리오 | src/lib/agent/fallback.ts, src/lib/agent/agent.ts, src/app/api/ai/consult/route.ts | 허위서류, 비자보장, 불법취업, 취업매칭 제외 문구의 적정성 |
| C3 | service_copy | 파트너 노출 문구 | src/components, src/app | 검증된 행정사 표현의 근거와 자격 확인 절차 |
| C4 | service_copy | 고위험 에스컬레이션 트리거 | src/lib/cases/high-risk-hook.ts | 불법체류, 강제퇴거, 이의신청 등 AI가 넘겨야 하는 케이스 누락 여부 |
| D1 | facts | 학교 DB 50곳 | src/lib/data/schools.ts, School table | 인증대학 여부, 학비 범위, 비자심사 강화 플래그 근거와 명예훼손 리스크 |
| D2 | facts | 비용 계산 수치 | src/lib, components cost breakdown | 학비, 비자수수료, 생활비, 처리비용의 최신성 |
| D3 | facts | 서류 체크리스트/OCR 유형 | Documents 화면, src/lib/documents | 체류유형별 필수 서류 누락·과잉 여부 |

---

## B1. 역할 경계 정의

- 그룹: legal_documents
- 위치: docs/legal/role-boundary.md
- 검수 관점: AI 상담·서류 사전검증·케이스 인계가 행정사 업무 대행으로 오인되지 않는지

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

---

## B2. 파트너 행정사 계약 초안

- 그룹: legal_documents
- 위치: docs/legal/admin-scrivener-partner-contract-draft.md
- 검수 관점: 수수료 모델, 책임 분담, 손해배상, 소개·알선료 리스크

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

---

## B3. 개인정보처리방침 초안

- 그룹: legal_documents
- 위치: docs/legal/privacy-policy-draft.md
- 검수 관점: 수집 항목, 보존기간, Claude API 국외이전 고지

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

---

## B4. 제3자 제공 흐름

- 그룹: legal_documents
- 위치: docs/legal/data-sharing-flow.md
- 검수 관점: THIRD_PARTY_PROVISION 동의 시점과 행정사 제공 정보 범위

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

---

## B5. 학생 이용약관 초안

- 그룹: legal_documents
- 위치: docs/legal/student-terms-draft.md
- 검수 관점: AI 안내 한계 고지와 면책 조항

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

---

## C1. AI 답변 고지문

- 그룹: service_copy
- 위치: src/components/kbridge/SourceAnnotations.tsx, src/app/api/ai/consult/route.ts, src/lib/agent/meta.ts
- 검수 관점: 법률 자문 아님, 출처, 확인일, 4개 언어 문구의 법적 등가성

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

---

## C2. 거절·경고 시나리오

- 그룹: service_copy
- 위치: src/lib/agent/fallback.ts, src/lib/agent/agent.ts, src/app/api/ai/consult/route.ts
- 검수 관점: 허위서류, 비자보장, 불법취업, 취업매칭 제외 문구의 적정성

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

---

## C3. 파트너 노출 문구

- 그룹: service_copy
- 위치: src/components, src/app
- 검수 관점: 검증된 행정사 표현의 근거와 자격 확인 절차

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

---

## C4. 고위험 에스컬레이션 트리거

- 그룹: service_copy
- 위치: src/lib/cases/high-risk-hook.ts
- 검수 관점: 불법체류, 강제퇴거, 이의신청 등 AI가 넘겨야 하는 케이스 누락 여부

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

---

## D1. 학교 DB 50곳

- 그룹: facts
- 위치: src/lib/data/schools.ts, School table
- 검수 관점: 인증대학 여부, 학비 범위, 비자심사 강화 플래그 근거와 명예훼손 리스크

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

---

## D2. 비용 계산 수치

- 그룹: facts
- 위치: src/lib, components cost breakdown
- 검수 관점: 학비, 비자수수료, 생활비, 처리비용의 최신성

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

---

## D3. 서류 체크리스트/OCR 유형

- 그룹: facts
- 위치: Documents 화면, src/lib/documents
- 검수 관점: 체류유형별 필수 서류 누락·과잉 여부

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

