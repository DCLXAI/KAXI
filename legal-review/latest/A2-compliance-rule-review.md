# A2. 비자 룰 엔진 검수

검수 관점:

- 룰 조건이 실제 심사 기준과 일치하는지
- source_refs가 법적 근거로 충분한지
- HIGH/MEDIUM/LOW 위험 판정이 과소·과대하지 않은지
- fallbackPolicy가 사용자에게 과도한 확정 답변을 만들지 않는지

| 항목 | rule code | version | 제목 | 현재 상태 | 시행일 | required inputs |
|---|---|---:|---|---|---|---|
| A2-001 | visa-type-from-program | v1 | Infer D-2/D-4 from study program | APPROVED | 2026-01-01 | visa_type, program |
| A2-002 | core-document-checklist | v1 | Core D-2/D-4 document checklist | APPROVED | 2026-01-01 | visa_type |
| A2-003 | financial-proof-threshold | v1 | Financial proof note by visa type | APPROVED | 2026-01-01 | visa_type |
| A2-004 | tuberculosis-certificate-by-nationality | v1 | TB certificate for designated nationalities | APPROVED | 2026-01-01 | nationality |
| A2-005 | safety-and-admin-scrivener-escalation | v1 | Illegal request refusal and administrative-scrivener escalation | APPROVED | 2026-01-01 | has_refusal_history, requests_filing_representation, asks_for_fake_documents, asks_for_illegal_work, asks_for_visa_guarantee |
| A2-006 | language-proficiency-for-degree | v1 | TOPIK or equivalent language proof for D-2 degree programs | APPROVED | 2026-01-01 | visa_type, program, nationality |
| A2-007 | ongoing-financial-maintenance | v1 | Ongoing financial maintenance requirement during stay | APPROVED | 2026-01-01 | visa_type |
| A2-008 | health-insurance-mandatory | v1 | National health insurance or equivalent mandatory coverage | APPROVED | 2026-01-01 | visa_type |
| A2-009 | nationality-vn-mn-d2-scrutiny | v1 | Additional scrutiny and documents for Vietnamese/Mongolian D-2 applicants | APPROVED | 2026-01-01 | visa_type, nationality |
| A2-010 | program-vocational-d2-requirements | v1 | Specific requirements for vocational/career D-2 programs | APPROVED | 2026-01-01 | visa_type, program |
| A2-011 | d4-to-d2-transfer-path | v1 | Requirements for D-4 to D-2 status change | APPROVED | 2026-01-01 | visa_type, program |

---

## A2-001 visa-type-from-program v1

- 제목: Infer D-2/D-4 from study program
- 현재 검수상태: APPROVED
- reviewedBy: partner_agent_001
- reviewedAt: 2026-07-01
- effectiveFrom: 2026-01-01
- effectiveTo: 없음
- requiredInputs: visa_type, program
- fallbackPolicy: If neither visa_type nor program is known, ask a clarifying question before final checklist generation.
- DB tests: 27

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Source refs

- immigration-act-stay-status-scope: 출입국관리법 제10조·제17조 (2026-07-02) https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=245973
- immigration-decree-long-term-status-table: 출입국관리법 시행령 제12조·별표 1의2 (2026-07-02) https://www.law.go.kr/flDownload.do?flNm=%5B%EB%B3%84%ED%91%9C+1%EC%9D%982%5D+%EC%9E%A5%EA%B8%B0%EC%B2%B4%EB%A5%98%EC%9E%90%EA%B2%A9%28%EC%A0%9C12%EC%A1%B0+%EA%B4%80%EB%A0%A8%29%0A&flSeq=53439589
- moj-immigration-visa-navigator: 법무부 비자 내비게이터: 유학·연수(D-2, D-4) (2026-07-01) https://www.immigration.go.kr/bbs/immigration_eng/230/454086/download.do

### Condition AST

```json
{
  "op": "always"
}
```

### Output AST

```json
{
  "riskLevel": "LOW",
  "resultType": "visa_rule",
  "messageKey": "visa_type_from_program",
  "requiresHumanReview": false,
  "operations": [
    {
      "op": "infer_visa_type_from_program"
    }
  ]
}
```

---

## A2-002 core-document-checklist v1

- 제목: Core D-2/D-4 document checklist
- 현재 검수상태: APPROVED
- reviewedBy: partner_agent_001
- reviewedAt: 2026-07-01
- effectiveFrom: 2026-01-01
- effectiveTo: 없음
- requiredInputs: visa_type
- fallbackPolicy: If visa_type is missing, provide only a high-level checklist and ask whether the user is preparing D-2 or D-4.
- DB tests: 0

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Source refs

- immigration-act-stay-status-scope: 출입국관리법 제10조·제17조 (2026-07-02) https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=245973
- immigration-decree-long-term-status-table: 출입국관리법 시행령 제12조·별표 1의2 (2026-07-02) https://www.law.go.kr/flDownload.do?flNm=%5B%EB%B3%84%ED%91%9C+1%EC%9D%982%5D+%EC%9E%A5%EA%B8%B0%EC%B2%B4%EB%A5%98%EC%9E%90%EA%B2%A9%28%EC%A0%9C12%EC%A1%B0+%EA%B4%80%EB%A0%A8%29%0A&flSeq=53439589
- immigration-rule-documents-attachments: 출입국관리법 시행규칙 제76조·별표 5·별표 5의2 (2026-07-02) https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283059
- studyinkorea-visa-documents: Study in Korea visa document guidance (2026-07-01) https://www.studyinkorea.go.kr
- moj-immigration-visa-navigator: 법무부 비자 내비게이터: 유학·연수(D-2, D-4) (2026-07-01) https://www.immigration.go.kr/bbs/immigration_eng/230/454086/download.do

### Condition AST

```json
{
  "op": "always"
}
```

### Output AST

```json
{
  "riskLevel": "LOW",
  "resultType": "document_required",
  "messageKey": "core_document_checklist",
  "requiresHumanReview": false,
  "operations": [
    {
      "op": "add_core_documents"
    }
  ]
}
```

---

## A2-003 financial-proof-threshold v1

- 제목: Financial proof note by visa type
- 현재 검수상태: APPROVED
- reviewedBy: partner_agent_001
- reviewedAt: 2026-07-01
- effectiveFrom: 2026-01-01
- effectiveTo: 없음
- requiredInputs: visa_type
- fallbackPolicy: If visa_type is missing, state that financial proof differs by program and require embassy/school confirmation.
- DB tests: 0

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Source refs

- immigration-rule-documents-attachments: 출입국관리법 시행규칙 제76조·별표 5·별표 5의2 (2026-07-02) https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283059
- studyinkorea-visa-documents: Study in Korea visa document guidance (2026-07-01) https://www.studyinkorea.go.kr

### Condition AST

```json
{
  "op": "always"
}
```

### Output AST

```json
{
  "riskLevel": "MEDIUM",
  "resultType": "document_required",
  "messageKey": "financial_proof_threshold",
  "requiresHumanReview": false,
  "operations": [
    {
      "op": "add_financial_proof"
    }
  ]
}
```

---

## A2-004 tuberculosis-certificate-by-nationality v1

- 제목: TB certificate for designated nationalities
- 현재 검수상태: APPROVED
- reviewedBy: partner_agent_001
- reviewedAt: 2026-07-01
- effectiveFrom: 2026-01-01
- effectiveTo: 없음
- requiredInputs: nationality
- fallbackPolicy: If nationality is missing, ask for nationality and warn that some countries require a TB certificate.
- DB tests: 0

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Source refs

- immigration-rule-documents-attachments: 출입국관리법 시행규칙 제76조·별표 5·별표 5의2 (2026-07-02) https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283059
- studyinkorea-visa-documents: Study in Korea visa document guidance (2026-07-01) https://www.studyinkorea.go.kr
- moj-immigration-visa-navigator: 법무부 비자 내비게이터: 유학·연수(D-2, D-4) (2026-07-01) https://www.immigration.go.kr/bbs/immigration_eng/230/454086/download.do

### Condition AST

```json
{
  "op": "always"
}
```

### Output AST

```json
{
  "riskLevel": "MEDIUM",
  "resultType": "document_required",
  "messageKey": "tuberculosis_certificate_by_nationality",
  "requiresHumanReview": false,
  "operations": [
    {
      "op": "add_tuberculosis_document"
    }
  ]
}
```

---

## A2-005 safety-and-admin-scrivener-escalation v1

- 제목: Illegal request refusal and administrative-scrivener escalation
- 현재 검수상태: APPROVED
- reviewedBy: partner_agent_001
- reviewedAt: 2026-07-01
- effectiveFrom: 2026-01-01
- effectiveTo: 없음
- requiredInputs: has_refusal_history, requests_filing_representation, asks_for_fake_documents, asks_for_illegal_work, asks_for_visa_guarantee
- fallbackPolicy: Refuse fake-document, illegal-work, or guarantee requests; route lawful case-specific filing/refusal issues to a licensed administrative scrivener.
- DB tests: 0

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Source refs

- admin-scrivener-act: 행정사법 (2026-07-01) https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=170997
- immigration-act-stay-status-scope: 출입국관리법 제10조·제17조 (2026-07-02) https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=245973
- immigration-act-permission-matrix: 출입국관리법 제18조·제20조·제21조·제24조·제25조·제31조 (2026-07-02) https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=245973
- moj-immigration-visa-navigator: 법무부 비자 내비게이터: 유학·연수(D-2, D-4) (2026-07-01) https://www.immigration.go.kr/bbs/immigration_eng/230/454086/download.do

### Condition AST

```json
{
  "op": "always"
}
```

### Output AST

```json
{
  "riskLevel": "HIGH",
  "resultType": "human_review_required",
  "messageKey": "safety_and_admin_scrivener_escalation",
  "requiresHumanReview": true,
  "operations": [
    {
      "op": "apply_safety_escalation"
    }
  ]
}
```

---

## A2-006 language-proficiency-for-degree v1

- 제목: TOPIK or equivalent language proof for D-2 degree programs
- 현재 검수상태: APPROVED
- reviewedBy: partner_agent_001
- reviewedAt: 2026-07-01
- effectiveFrom: 2026-01-01
- effectiveTo: 없음
- requiredInputs: visa_type, program, nationality
- fallbackPolicy: For D-2 programs, require confirmation of school-specific TOPIK or English proficiency; recommend TOPIK 3+ as baseline for degree entry.
- DB tests: 0

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Source refs

- immigration-decree-long-term-status-table: 출입국관리법 시행령 제12조·별표 1의2 (2026-07-02) https://www.law.go.kr/flDownload.do?flNm=%5B%EB%B3%84%ED%91%9C+1%EC%9D%982%5D+%EC%9E%A5%EA%B8%B0%EC%B2%B4%EB%A5%98%EC%9E%90%EA%B2%A9%28%EC%A0%9C12%EC%A1%B0+%EA%B4%80%EB%A0%A8%29%0A&flSeq=53439589
- studyinkorea-visa-documents: Study in Korea visa document guidance (2026-07-01) https://www.studyinkorea.go.kr
- moj-immigration-visa-navigator: 법무부 비자 내비게이터: 유학·연수(D-2, D-4) (2026-07-01) https://www.immigration.go.kr/bbs/immigration_eng/230/454086/download.do

### Condition AST

```json
{
  "op": "always"
}
```

### Output AST

```json
{
  "riskLevel": "MEDIUM",
  "resultType": "document_required",
  "messageKey": "language_proficiency_for_degree",
  "requiresHumanReview": false,
  "operations": [
    {
      "op": "add_language_proof"
    }
  ]
}
```

---

## A2-007 ongoing-financial-maintenance v1

- 제목: Ongoing financial maintenance requirement during stay
- 현재 검수상태: APPROVED
- reviewedBy: partner_agent_001
- reviewedAt: 2026-07-01
- effectiveFrom: 2026-01-01
- effectiveTo: 없음
- requiredInputs: visa_type
- fallbackPolicy: Financial proof is not one-time; must be maintained. Embassy/school may re-check during extensions.
- DB tests: 0

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Source refs

- immigration-rule-documents-attachments: 출입국관리법 시행규칙 제76조·별표 5·별표 5의2 (2026-07-02) https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283059
- studyinkorea-visa-documents: Study in Korea visa document guidance (2026-07-01) https://www.studyinkorea.go.kr

### Condition AST

```json
{
  "op": "always"
}
```

### Output AST

```json
{
  "riskLevel": "MEDIUM",
  "resultType": "document_required",
  "messageKey": "ongoing_financial_maintenance",
  "requiresHumanReview": false,
  "operations": [
    {
      "op": "add_ongoing_financial_proof"
    }
  ]
}
```

---

## A2-008 health-insurance-mandatory v1

- 제목: National health insurance or equivalent mandatory coverage
- 현재 검수상태: APPROVED
- reviewedBy: partner_agent_001
- reviewedAt: 2026-07-01
- effectiveFrom: 2026-01-01
- effectiveTo: 없음
- requiredInputs: visa_type
- fallbackPolicy: Foreign students must join National Health Insurance or provide equivalent private coverage proof upon registration.
- DB tests: 0

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Source refs

- immigration-rule-documents-attachments: 출입국관리법 시행규칙 제76조·별표 5·별표 5의2 (2026-07-02) https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283059
- studyinkorea-visa-documents: Study in Korea visa document guidance (2026-07-01) https://www.studyinkorea.go.kr

### Condition AST

```json
{
  "op": "always"
}
```

### Output AST

```json
{
  "riskLevel": "LOW",
  "resultType": "document_required",
  "messageKey": "health_insurance_mandatory",
  "requiresHumanReview": false,
  "operations": [
    {
      "op": "add_insurance_proof"
    }
  ]
}
```

---

## A2-009 nationality-vn-mn-d2-scrutiny v1

- 제목: Additional scrutiny and documents for Vietnamese/Mongolian D-2 applicants
- 현재 검수상태: APPROVED
- reviewedBy: partner_agent_001
- reviewedAt: 2026-07-01
- effectiveFrom: 2026-01-01
- effectiveTo: 없음
- requiredInputs: visa_type, nationality
- fallbackPolicy: For VN/MN D-2, verify additional embassy-specific requirements; recommend extra financial or academic proof.
- DB tests: 0

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Source refs

- immigration-decree-long-term-status-table: 출입국관리법 시행령 제12조·별표 1의2 (2026-07-02) https://www.law.go.kr/flDownload.do?flNm=%5B%EB%B3%84%ED%91%9C+1%EC%9D%982%5D+%EC%9E%A5%EA%B8%B0%EC%B2%B4%EB%A5%98%EC%9E%90%EA%B2%A9%28%EC%A0%9C12%EC%A1%B0+%EA%B4%80%EB%A0%A8%29%0A&flSeq=53439589
- studyinkorea-visa-documents: Study in Korea visa document guidance (2026-07-01) https://www.studyinkorea.go.kr
- moj-immigration-visa-navigator: 법무부 비자 내비게이터: 유학·연수(D-2, D-4) (2026-07-01) https://www.immigration.go.kr/bbs/immigration_eng/230/454086/download.do

### Condition AST

```json
{
  "op": "always"
}
```

### Output AST

```json
{
  "riskLevel": "MEDIUM",
  "resultType": "document_required",
  "messageKey": "nationality_vn_mn_d2_scrutiny",
  "requiresHumanReview": false,
  "operations": [
    {
      "op": "add_vn_mn_d2_scrutiny"
    }
  ]
}
```

---

## A2-010 program-vocational-d2-requirements v1

- 제목: Specific requirements for vocational/career D-2 programs
- 현재 검수상태: APPROVED
- reviewedBy: partner_agent_001
- reviewedAt: 2026-07-01
- effectiveFrom: 2026-01-01
- effectiveTo: 없음
- requiredInputs: visa_type, program
- fallbackPolicy: Vocational D-2 requires proof of career relevance and may have stricter financial or language thresholds.
- DB tests: 0

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Source refs

- immigration-decree-long-term-status-table: 출입국관리법 시행령 제12조·별표 1의2 (2026-07-02) https://www.law.go.kr/flDownload.do?flNm=%5B%EB%B3%84%ED%91%9C+1%EC%9D%982%5D+%EC%9E%A5%EA%B8%B0%EC%B2%B4%EB%A5%98%EC%9E%90%EA%B2%A9%28%EC%A0%9C12%EC%A1%B0+%EA%B4%80%EB%A0%A8%29%0A&flSeq=53439589
- studyinkorea-visa-documents: Study in Korea visa document guidance (2026-07-01) https://www.studyinkorea.go.kr

### Condition AST

```json
{
  "op": "always"
}
```

### Output AST

```json
{
  "riskLevel": "MEDIUM",
  "resultType": "document_required",
  "messageKey": "program_vocational_d2_requirements",
  "requiresHumanReview": false,
  "operations": [
    {
      "op": "add_vocational_d2_proof"
    }
  ]
}
```

---

## A2-011 d4-to-d2-transfer-path v1

- 제목: Requirements for D-4 to D-2 status change
- 현재 검수상태: APPROVED
- reviewedBy: partner_agent_001
- reviewedAt: 2026-07-01
- effectiveFrom: 2026-01-01
- effectiveTo: 없음
- requiredInputs: visa_type, program
- fallbackPolicy: D-4 to D-2 transfer requires proof of academic progress, no gaps, and updated financials; timing critical.
- DB tests: 0

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Source refs

- immigration-act-permission-matrix: 출입국관리법 제18조·제20조·제21조·제24조·제25조·제31조 (2026-07-02) https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=245973
- immigration-decree-long-term-status-table: 출입국관리법 시행령 제12조·별표 1의2 (2026-07-02) https://www.law.go.kr/flDownload.do?flNm=%5B%EB%B3%84%ED%91%9C+1%EC%9D%982%5D+%EC%9E%A5%EA%B8%B0%EC%B2%B4%EB%A5%98%EC%9E%90%EA%B2%A9%28%EC%A0%9C12%EC%A1%B0+%EA%B4%80%EB%A0%A8%29%0A&flSeq=53439589
- studyinkorea-visa-documents: Study in Korea visa document guidance (2026-07-01) https://www.studyinkorea.go.kr

### Condition AST

```json
{
  "op": "always"
}
```

### Output AST

```json
{
  "riskLevel": "HIGH",
  "resultType": "human_review_required",
  "messageKey": "d4_to_d2_transfer_path",
  "requiresHumanReview": true,
  "operations": [
    {
      "op": "add_d4_to_d2_transfer_docs"
    }
  ]
}
```

