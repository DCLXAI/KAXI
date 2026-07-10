# A3. 비자 서류 매트릭스 검수

검수 관점:

- 체류자격/신청유형별 서류 포함 여부가 실제 업무 기준과 맞는지
- 유효기간, 발행기관, 필수 기재 항목이 과소·과대하지 않은지
- `validationRules`가 OCR/Layer 1 검증에 충분한지
- 국적·대사관·학교별 차이가 있는 항목은 applicantContext 또는 notes로 분리해야 하는지

| 항목 | code | visa | action | context | documentType | 현재 상태 | validityDays |
|---|---|---|---|---|---|---|---:|
| A3-001 | d2_issuance_passport | D-2 | issuance | general | passport | PENDING |  |
| A3-002 | d2_issuance_visa_application_form | D-2 | issuance | general | visa_application_form | PENDING |  |
| A3-003 | d2_issuance_photo | D-2 | issuance | general | photo | PENDING | 180 |
| A3-004 | d2_issuance_standard_admission_letter | D-2 | issuance | degree | standard_admission_letter | PENDING |  |
| A3-005 | d2_issuance_final_education_certificate | D-2 | issuance | degree | final_education_certificate | PENDING |  |
| A3-006 | d2_issuance_transcript | D-2 | issuance | degree | transcript | PENDING |  |
| A3-007 | d2_issuance_financial_proof | D-2 | issuance | degree | financial_proof | PENDING | 90 |
| A3-008 | d2_issuance_family_relation | D-2 | issuance | sponsor_family | family_relation | PENDING | 90 |
| A3-009 | d2_issuance_study_plan | D-2 | issuance | degree | study_plan | PENDING |  |
| A3-010 | d2_issuance_language_proficiency | D-2 | issuance | degree | language_proficiency | PENDING |  |
| A3-011 | d4_issuance_passport | D-4 | issuance | language_training | passport | PENDING |  |
| A3-012 | d4_issuance_application_form | D-4 | issuance | language_training | visa_application_form | PENDING |  |
| A3-013 | d4_issuance_photo | D-4 | issuance | language_training | photo | PENDING | 180 |
| A3-014 | d4_issuance_admission_letter | D-4 | issuance | language_training | admission_letter | PENDING |  |
| A3-015 | d4_issuance_education_certificate | D-4 | issuance | language_training | education_certificate | PENDING |  |
| A3-016 | d4_issuance_financial_proof | D-4 | issuance | language_training | financial_proof | PENDING | 90 |
| A3-017 | d4_issuance_training_plan | D-4 | issuance | language_training | training_plan | PENDING |  |
| A3-018 | d4_issuance_tb_certificate | D-4 | issuance | high_tb_nationality | tuberculosis_certificate | PENDING | 90 |
| A3-019 | d2_extension_integrated_application | D-2 | extension | general | integrated_application_form | PENDING |  |
| A3-020 | d2_extension_passport_arc | D-2 | extension | general | passport_arc | PENDING |  |
| A3-021 | d2_extension_enrollment_certificate | D-2 | extension | degree | enrollment_certificate | PENDING | 30 |
| A3-022 | d2_extension_transcript_attendance | D-2 | extension | degree | transcript_or_attendance | PENDING | 30 |
| A3-023 | d2_extension_financial_proof | D-2 | extension | degree | financial_proof | PENDING | 90 |
| A3-024 | d2_extension_residence_proof | D-2 | extension | general | residence_proof | PENDING |  |
| A3-025 | d4_extension_integrated_application | D-4 | extension | language_training | integrated_application_form | PENDING |  |
| A3-026 | d4_extension_passport_arc | D-4 | extension | language_training | passport_arc | PENDING |  |
| A3-027 | d4_extension_enrollment_certificate | D-4 | extension | language_training | enrollment_certificate | PENDING | 30 |
| A3-028 | d4_extension_attendance_certificate | D-4 | extension | language_training | attendance_certificate | PENDING | 30 |
| A3-029 | d4_extension_financial_proof | D-4 | extension | language_training | financial_proof | PENDING | 90 |
| A3-030 | d4_extension_tuition_receipt | D-4 | extension | language_training | tuition_payment_receipt | PENDING |  |
| A3-031 | d4_to_d2_change_integrated_application | D-2 | change | d4_to_d2 | integrated_application_form | PENDING |  |
| A3-032 | d4_to_d2_change_standard_admission_letter | D-2 | change | d4_to_d2 | standard_admission_letter | PENDING |  |
| A3-033 | d4_to_d2_change_attendance | D-2 | change | d4_to_d2 | d4_attendance_certificate | PENDING | 30 |
| A3-034 | d4_to_d2_change_progress | D-2 | change | d4_to_d2 | d4_completion_or_transcript | PENDING | 30 |
| A3-035 | d4_to_d2_change_financial_proof | D-2 | change | d4_to_d2 | financial_proof | PENDING | 90 |
| A3-036 | d4_to_d2_change_residence_proof | D-2 | change | d4_to_d2 | residence_proof | PENDING |  |
| A3-037 | d10_change_integrated_application | D-10 | change | job_seeking | integrated_application_form | PENDING |  |
| A3-038 | d10_change_graduation_certificate | D-10 | change | job_seeking | graduation_certificate | PENDING | 30 |
| A3-039 | d10_change_job_seeking_plan | D-10 | change | job_seeking | job_seeking_plan | PENDING |  |
| A3-040 | d10_change_financial_proof | D-10 | change | job_seeking | financial_proof | PENDING | 90 |
| A3-041 | d10_change_residence_proof | D-10 | change | job_seeking | residence_proof | PENDING |  |
| A3-042 | e7_change_employment_contract | E-7 | change | specific_activity | employment_contract | PENDING |  |
| A3-043 | e7_change_business_registration | E-7 | change | specific_activity | employer_business_registration | PENDING | 90 |
| A3-044 | e7_change_job_description | E-7 | change | specific_activity | job_description | PENDING |  |
| A3-045 | e7_change_degree_or_career | E-7 | change | specific_activity | degree_or_career_certificate | PENDING |  |
| A3-046 | f2_change_integrated_application | F-2 | change | residence | integrated_application_form | PENDING |  |
| A3-047 | f2_change_income_tax_certificate | F-2 | change | residence | income_tax_certificate | PENDING | 90 |
| A3-048 | f2_change_residence_proof | F-2 | change | residence | residence_proof | PENDING |  |
| A3-049 | f5_permanent_residence_application_package | F-5 | permanent_residence | general | permanent_residence_application_package | PENDING |  |
| A3-050 | f5_permanent_residence_criminal_record | F-5 | permanent_residence | general | criminal_record_or_overseas_certificate | PENDING | 180 |

---

## A3-001 d2_issuance_passport

- 체류자격: D-2
- 신청유형: issuance
- 신청자 맥락: general
- 서류 유형: passport
- 한글명: 여권
- 영문명: Passport
- 필수 여부: required
- 유효기간: 없음
- 발행기관: applicant_home_country
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: immigration-decree-long-term-status-table, immigration-rule-documents-attachments, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "passport_no",
    "labelKo": "여권번호",
    "labelEn": "Passport number",
    "required": true
  },
  {
    "key": "full_name",
    "labelKo": "성명",
    "labelEn": "Full name",
    "required": true
  },
  {
    "key": "birth_date",
    "labelKo": "생년월일",
    "labelEn": "Date of birth",
    "required": true
  },
  {
    "key": "expiry_date",
    "labelKo": "만료일",
    "labelEn": "Expiry date",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:passport_no:present",
  "field:full_name:present",
  "field:birth_date:present",
  "field:expiry_date:present"
]
```



---

## A3-002 d2_issuance_visa_application_form

- 체류자격: D-2
- 신청유형: issuance
- 신청자 맥락: general
- 서류 유형: visa_application_form
- 한글명: 사증발급신청서
- 영문명: Visa application form
- 필수 여부: required
- 유효기간: 없음
- 발행기관: applicant
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "full_name",
    "labelKo": "성명",
    "labelEn": "Full name",
    "required": true
  },
  {
    "key": "nationality",
    "labelKo": "국적",
    "labelEn": "Nationality",
    "required": true
  },
  {
    "key": "passport_no",
    "labelKo": "여권번호",
    "labelEn": "Passport number",
    "required": true
  },
  {
    "key": "contact",
    "labelKo": "연락처",
    "labelEn": "Contact",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:full_name:present",
  "field:nationality:present",
  "field:passport_no:present",
  "field:contact:present"
]
```



---

## A3-003 d2_issuance_photo

- 체류자격: D-2
- 신청유형: issuance
- 신청자 맥락: general
- 서류 유형: photo
- 한글명: 표준 사진
- 영문명: Standard photo
- 필수 여부: required
- 유효기간: 180
- 발행기관: applicant
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "photo_standard",
    "labelKo": "사진 규격",
    "labelEn": "Photo specification",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:photo_standard:present",
  "issue_date_within:180:days"
]
```



---

## A3-004 d2_issuance_standard_admission_letter

- 체류자격: D-2
- 신청유형: issuance
- 신청자 맥락: degree
- 서류 유형: standard_admission_letter
- 한글명: 표준입학허가서
- 영문명: Standard admission letter
- 필수 여부: required
- 유효기간: 없음
- 발행기관: receiving_university
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: immigration-decree-long-term-status-table, immigration-rule-documents-attachments, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "student_name",
    "labelKo": "학생 성명",
    "labelEn": "Student name",
    "required": true
  },
  {
    "key": "school_name",
    "labelKo": "학교명",
    "labelEn": "School name",
    "required": true
  },
  {
    "key": "program",
    "labelKo": "과정",
    "labelEn": "Program",
    "required": true
  },
  {
    "key": "admission_period",
    "labelKo": "입학 기간",
    "labelEn": "Admission period",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:student_name:present",
  "field:school_name:present",
  "field:program:present",
  "field:admission_period:present"
]
```



---

## A3-005 d2_issuance_final_education_certificate

- 체류자격: D-2
- 신청유형: issuance
- 신청자 맥락: degree
- 서류 유형: final_education_certificate
- 한글명: 최종학력 입증서류
- 영문명: Final education certificate
- 필수 여부: required
- 유효기간: 없음
- 발행기관: previous_school_or_authority
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: immigration-decree-long-term-status-table, immigration-rule-documents-attachments, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "student_name",
    "labelKo": "학생 성명",
    "labelEn": "Student name",
    "required": true
  },
  {
    "key": "school_name",
    "labelKo": "학교명",
    "labelEn": "School name",
    "required": true
  },
  {
    "key": "graduation_date",
    "labelKo": "졸업일",
    "labelEn": "Graduation date",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:student_name:present",
  "field:school_name:present",
  "field:graduation_date:present"
]
```



---

## A3-006 d2_issuance_transcript

- 체류자격: D-2
- 신청유형: issuance
- 신청자 맥락: degree
- 서류 유형: transcript
- 한글명: 성적증명서
- 영문명: Transcript
- 필수 여부: required
- 유효기간: 없음
- 발행기관: previous_school
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "student_name",
    "labelKo": "학생 성명",
    "labelEn": "Student name",
    "required": true
  },
  {
    "key": "school_name",
    "labelKo": "학교명",
    "labelEn": "School name",
    "required": true
  },
  {
    "key": "grades",
    "labelKo": "성적",
    "labelEn": "Grades",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:student_name:present",
  "field:school_name:present",
  "field:grades:present"
]
```



---

## A3-007 d2_issuance_financial_proof

- 체류자격: D-2
- 신청유형: issuance
- 신청자 맥락: degree
- 서류 유형: financial_proof
- 한글명: 재정능력 입증서류
- 영문명: Financial proof
- 필수 여부: required
- 유효기간: 90
- 발행기관: bank_or_sponsor
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: immigration-decree-long-term-status-table, immigration-rule-documents-attachments, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "holder_name",
    "labelKo": "예금주",
    "labelEn": "Account holder",
    "required": true
  },
  {
    "key": "balance",
    "labelKo": "잔액",
    "labelEn": "Balance",
    "required": true
  },
  {
    "key": "issue_date",
    "labelKo": "발급일",
    "labelEn": "Issue date",
    "required": true
  },
  {
    "key": "currency",
    "labelKo": "통화",
    "labelEn": "Currency",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:holder_name:present",
  "field:balance:present",
  "field:issue_date:present",
  "field:currency:present",
  "numeric_positive:balance",
  "issue_date_within:90:days"
]
```

### Seed note

Validity and balance thresholds vary by mission and program; legal reviewer must confirm before approval.


---

## A3-008 d2_issuance_family_relation

- 체류자격: D-2
- 신청유형: issuance
- 신청자 맥락: sponsor_family
- 서류 유형: family_relation
- 한글명: 가족관계 입증서류
- 영문명: Family relationship proof
- 필수 여부: required
- 유효기간: 90
- 발행기관: civil_registry_or_public_authority
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "applicant_name",
    "labelKo": "신청인",
    "labelEn": "Applicant",
    "required": true
  },
  {
    "key": "sponsor_name",
    "labelKo": "보증인",
    "labelEn": "Sponsor",
    "required": true
  },
  {
    "key": "relationship",
    "labelKo": "관계",
    "labelEn": "Relationship",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:applicant_name:present",
  "field:sponsor_name:present",
  "field:relationship:present",
  "issue_date_within:90:days"
]
```



---

## A3-009 d2_issuance_study_plan

- 체류자격: D-2
- 신청유형: issuance
- 신청자 맥락: degree
- 서류 유형: study_plan
- 한글명: 학업계획서
- 영문명: Study plan
- 필수 여부: required
- 유효기간: 없음
- 발행기관: applicant
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: studyinkorea-visa-documents, visa-portal-visa-types

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "study_goal",
    "labelKo": "학업 목표",
    "labelEn": "Study goal",
    "required": true
  },
  {
    "key": "program_fit",
    "labelKo": "과정 적합성",
    "labelEn": "Program fit",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:study_goal:present",
  "field:program_fit:present"
]
```



---

## A3-010 d2_issuance_language_proficiency

- 체류자격: D-2
- 신청유형: issuance
- 신청자 맥락: degree
- 서류 유형: language_proficiency
- 한글명: 한국어/영어 능력 증빙
- 영문명: Korean or English proficiency proof
- 필수 여부: required
- 유효기간: 없음
- 발행기관: topik_or_language_test_provider
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: studyinkorea-visa-documents, visa-portal-visa-types

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "test_name",
    "labelKo": "시험명",
    "labelEn": "Test name",
    "required": true
  },
  {
    "key": "score_or_level",
    "labelKo": "점수/등급",
    "labelEn": "Score or level",
    "required": true
  },
  {
    "key": "test_date",
    "labelKo": "시험일",
    "labelEn": "Test date",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:test_name:present",
  "field:score_or_level:present",
  "field:test_date:present"
]
```



---

## A3-011 d4_issuance_passport

- 체류자격: D-4
- 신청유형: issuance
- 신청자 맥락: language_training
- 서류 유형: passport
- 한글명: 여권
- 영문명: Passport
- 필수 여부: required
- 유효기간: 없음
- 발행기관: applicant_home_country
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: immigration-decree-long-term-status-table, immigration-rule-documents-attachments, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "passport_no",
    "labelKo": "여권번호",
    "labelEn": "Passport number",
    "required": true
  },
  {
    "key": "full_name",
    "labelKo": "성명",
    "labelEn": "Full name",
    "required": true
  },
  {
    "key": "expiry_date",
    "labelKo": "만료일",
    "labelEn": "Expiry date",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:passport_no:present",
  "field:full_name:present",
  "field:expiry_date:present"
]
```



---

## A3-012 d4_issuance_application_form

- 체류자격: D-4
- 신청유형: issuance
- 신청자 맥락: language_training
- 서류 유형: visa_application_form
- 한글명: 사증발급신청서
- 영문명: Visa application form
- 필수 여부: required
- 유효기간: 없음
- 발행기관: applicant
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "full_name",
    "labelKo": "성명",
    "labelEn": "Full name",
    "required": true
  },
  {
    "key": "nationality",
    "labelKo": "국적",
    "labelEn": "Nationality",
    "required": true
  },
  {
    "key": "passport_no",
    "labelKo": "여권번호",
    "labelEn": "Passport number",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:full_name:present",
  "field:nationality:present",
  "field:passport_no:present"
]
```



---

## A3-013 d4_issuance_photo

- 체류자격: D-4
- 신청유형: issuance
- 신청자 맥락: language_training
- 서류 유형: photo
- 한글명: 표준 사진
- 영문명: Standard photo
- 필수 여부: required
- 유효기간: 180
- 발행기관: applicant
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "photo_standard",
    "labelKo": "사진 규격",
    "labelEn": "Photo specification",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:photo_standard:present",
  "issue_date_within:180:days"
]
```



---

## A3-014 d4_issuance_admission_letter

- 체류자격: D-4
- 신청유형: issuance
- 신청자 맥락: language_training
- 서류 유형: admission_letter
- 한글명: 입학허가서
- 영문명: Admission letter
- 필수 여부: required
- 유효기간: 없음
- 발행기관: language_institute
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: immigration-decree-long-term-status-table, immigration-rule-documents-attachments, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "student_name",
    "labelKo": "학생 성명",
    "labelEn": "Student name",
    "required": true
  },
  {
    "key": "institute_name",
    "labelKo": "교육기관명",
    "labelEn": "Institute name",
    "required": true
  },
  {
    "key": "training_period",
    "labelKo": "연수 기간",
    "labelEn": "Training period",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:student_name:present",
  "field:institute_name:present",
  "field:training_period:present"
]
```



---

## A3-015 d4_issuance_education_certificate

- 체류자격: D-4
- 신청유형: issuance
- 신청자 맥락: language_training
- 서류 유형: education_certificate
- 한글명: 최종학력 입증서류
- 영문명: Education certificate
- 필수 여부: required
- 유효기간: 없음
- 발행기관: previous_school_or_authority
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "student_name",
    "labelKo": "학생 성명",
    "labelEn": "Student name",
    "required": true
  },
  {
    "key": "school_name",
    "labelKo": "학교명",
    "labelEn": "School name",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:student_name:present",
  "field:school_name:present"
]
```



---

## A3-016 d4_issuance_financial_proof

- 체류자격: D-4
- 신청유형: issuance
- 신청자 맥락: language_training
- 서류 유형: financial_proof
- 한글명: 재정능력 입증서류
- 영문명: Financial proof
- 필수 여부: required
- 유효기간: 90
- 발행기관: bank_or_sponsor
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: immigration-decree-long-term-status-table, immigration-rule-documents-attachments, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "holder_name",
    "labelKo": "예금주",
    "labelEn": "Account holder",
    "required": true
  },
  {
    "key": "balance",
    "labelKo": "잔액",
    "labelEn": "Balance",
    "required": true
  },
  {
    "key": "issue_date",
    "labelKo": "발급일",
    "labelEn": "Issue date",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:holder_name:present",
  "field:balance:present",
  "field:issue_date:present",
  "numeric_positive:balance",
  "issue_date_within:90:days"
]
```



---

## A3-017 d4_issuance_training_plan

- 체류자격: D-4
- 신청유형: issuance
- 신청자 맥락: language_training
- 서류 유형: training_plan
- 한글명: 연수계획서
- 영문명: Training plan
- 필수 여부: required
- 유효기간: 없음
- 발행기관: language_institute_or_applicant
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: studyinkorea-visa-documents, visa-portal-visa-types

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "training_goal",
    "labelKo": "연수 목적",
    "labelEn": "Training goal",
    "required": true
  },
  {
    "key": "training_schedule",
    "labelKo": "연수 일정",
    "labelEn": "Training schedule",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:training_goal:present",
  "field:training_schedule:present"
]
```



---

## A3-018 d4_issuance_tb_certificate

- 체류자격: D-4
- 신청유형: issuance
- 신청자 맥락: high_tb_nationality
- 서류 유형: tuberculosis_certificate
- 한글명: 결핵진단서
- 영문명: Tuberculosis certificate
- 필수 여부: required
- 유효기간: 90
- 발행기관: designated_medical_institution
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.studyinkorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "applicant_name",
    "labelKo": "신청인",
    "labelEn": "Applicant",
    "required": true
  },
  {
    "key": "exam_date",
    "labelKo": "검진일",
    "labelEn": "Exam date",
    "required": true
  },
  {
    "key": "result",
    "labelKo": "검진 결과",
    "labelEn": "Result",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:applicant_name:present",
  "field:exam_date:present",
  "field:result:present",
  "issue_date_within:90:days"
]
```



---

## A3-019 d2_extension_integrated_application

- 체류자격: D-2
- 신청유형: extension
- 신청자 맥락: general
- 서류 유형: integrated_application_form
- 한글명: 통합신청서
- 영문명: Integrated application form
- 필수 여부: required
- 유효기간: 없음
- 발행기관: applicant
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "alien_registration_no",
    "labelKo": "외국인등록번호",
    "labelEn": "Alien registration number",
    "required": true
  },
  {
    "key": "stay_action",
    "labelKo": "신청 업무",
    "labelEn": "Stay action",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:alien_registration_no:present",
  "field:stay_action:present"
]
```



---

## A3-020 d2_extension_passport_arc

- 체류자격: D-2
- 신청유형: extension
- 신청자 맥락: general
- 서류 유형: passport_arc
- 한글명: 여권 및 외국인등록증
- 영문명: Passport and alien registration card
- 필수 여부: required
- 유효기간: 없음
- 발행기관: applicant_home_country_and_moj
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "passport_no",
    "labelKo": "여권번호",
    "labelEn": "Passport number",
    "required": true
  },
  {
    "key": "alien_registration_no",
    "labelKo": "외국인등록번호",
    "labelEn": "Alien registration number",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:passport_no:present",
  "field:alien_registration_no:present"
]
```



---

## A3-021 d2_extension_enrollment_certificate

- 체류자격: D-2
- 신청유형: extension
- 신청자 맥락: degree
- 서류 유형: enrollment_certificate
- 한글명: 재학증명서
- 영문명: Certificate of enrollment
- 필수 여부: required
- 유효기간: 30
- 발행기관: university
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "student_name",
    "labelKo": "학생 성명",
    "labelEn": "Student name",
    "required": true
  },
  {
    "key": "school_name",
    "labelKo": "학교명",
    "labelEn": "School name",
    "required": true
  },
  {
    "key": "enrollment_status",
    "labelKo": "재학 상태",
    "labelEn": "Enrollment status",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:student_name:present",
  "field:school_name:present",
  "field:enrollment_status:present",
  "issue_date_within:30:days"
]
```



---

## A3-022 d2_extension_transcript_attendance

- 체류자격: D-2
- 신청유형: extension
- 신청자 맥락: degree
- 서류 유형: transcript_or_attendance
- 한글명: 성적/출석 증빙
- 영문명: Transcript or attendance proof
- 필수 여부: required
- 유효기간: 30
- 발행기관: university
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "student_name",
    "labelKo": "학생 성명",
    "labelEn": "Student name",
    "required": true
  },
  {
    "key": "semester",
    "labelKo": "학기",
    "labelEn": "Semester",
    "required": true
  },
  {
    "key": "academic_status",
    "labelKo": "학업 상태",
    "labelEn": "Academic status",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:student_name:present",
  "field:semester:present",
  "field:academic_status:present",
  "issue_date_within:30:days"
]
```



---

## A3-023 d2_extension_financial_proof

- 체류자격: D-2
- 신청유형: extension
- 신청자 맥락: degree
- 서류 유형: financial_proof
- 한글명: 체류경비 입증서류
- 영문명: Proof of stay expenses
- 필수 여부: required
- 유효기간: 90
- 발행기관: bank_or_sponsor
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "holder_name",
    "labelKo": "예금주",
    "labelEn": "Account holder",
    "required": true
  },
  {
    "key": "balance",
    "labelKo": "잔액",
    "labelEn": "Balance",
    "required": true
  },
  {
    "key": "issue_date",
    "labelKo": "발급일",
    "labelEn": "Issue date",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:holder_name:present",
  "field:balance:present",
  "field:issue_date:present",
  "numeric_positive:balance",
  "issue_date_within:90:days"
]
```



---

## A3-024 d2_extension_residence_proof

- 체류자격: D-2
- 신청유형: extension
- 신청자 맥락: general
- 서류 유형: residence_proof
- 한글명: 체류지 입증서류
- 영문명: Proof of residence
- 필수 여부: required
- 유효기간: 없음
- 발행기관: landlord_school_or_public_authority
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "address",
    "labelKo": "주소",
    "labelEn": "Address",
    "required": true
  },
  {
    "key": "occupant_name",
    "labelKo": "거주자 성명",
    "labelEn": "Occupant name",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:address:present",
  "field:occupant_name:present"
]
```



---

## A3-025 d4_extension_integrated_application

- 체류자격: D-4
- 신청유형: extension
- 신청자 맥락: language_training
- 서류 유형: integrated_application_form
- 한글명: 통합신청서
- 영문명: Integrated application form
- 필수 여부: required
- 유효기간: 없음
- 발행기관: applicant
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "alien_registration_no",
    "labelKo": "외국인등록번호",
    "labelEn": "Alien registration number",
    "required": true
  },
  {
    "key": "stay_action",
    "labelKo": "신청 업무",
    "labelEn": "Stay action",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:alien_registration_no:present",
  "field:stay_action:present"
]
```



---

## A3-026 d4_extension_passport_arc

- 체류자격: D-4
- 신청유형: extension
- 신청자 맥락: language_training
- 서류 유형: passport_arc
- 한글명: 여권 및 외국인등록증
- 영문명: Passport and alien registration card
- 필수 여부: required
- 유효기간: 없음
- 발행기관: applicant_home_country_and_moj
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "passport_no",
    "labelKo": "여권번호",
    "labelEn": "Passport number",
    "required": true
  },
  {
    "key": "alien_registration_no",
    "labelKo": "외국인등록번호",
    "labelEn": "Alien registration number",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:passport_no:present",
  "field:alien_registration_no:present"
]
```



---

## A3-027 d4_extension_enrollment_certificate

- 체류자격: D-4
- 신청유형: extension
- 신청자 맥락: language_training
- 서류 유형: enrollment_certificate
- 한글명: 재학/연수 증명서
- 영문명: Enrollment or training certificate
- 필수 여부: required
- 유효기간: 30
- 발행기관: language_institute
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "student_name",
    "labelKo": "학생 성명",
    "labelEn": "Student name",
    "required": true
  },
  {
    "key": "training_period",
    "labelKo": "연수 기간",
    "labelEn": "Training period",
    "required": true
  },
  {
    "key": "enrollment_status",
    "labelKo": "재학 상태",
    "labelEn": "Enrollment status",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:student_name:present",
  "field:training_period:present",
  "field:enrollment_status:present",
  "issue_date_within:30:days"
]
```



---

## A3-028 d4_extension_attendance_certificate

- 체류자격: D-4
- 신청유형: extension
- 신청자 맥락: language_training
- 서류 유형: attendance_certificate
- 한글명: 출석증명서
- 영문명: Attendance certificate
- 필수 여부: required
- 유효기간: 30
- 발행기관: language_institute
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "student_name",
    "labelKo": "학생 성명",
    "labelEn": "Student name",
    "required": true
  },
  {
    "key": "attendance_rate",
    "labelKo": "출석률",
    "labelEn": "Attendance rate",
    "required": true
  },
  {
    "key": "period",
    "labelKo": "대상 기간",
    "labelEn": "Covered period",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:student_name:present",
  "field:attendance_rate:present",
  "field:period:present",
  "numeric_range:attendance_rate:0:100",
  "issue_date_within:30:days"
]
```



---

## A3-029 d4_extension_financial_proof

- 체류자격: D-4
- 신청유형: extension
- 신청자 맥락: language_training
- 서류 유형: financial_proof
- 한글명: 체류경비 입증서류
- 영문명: Proof of stay expenses
- 필수 여부: required
- 유효기간: 90
- 발행기관: bank_or_sponsor
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "holder_name",
    "labelKo": "예금주",
    "labelEn": "Account holder",
    "required": true
  },
  {
    "key": "balance",
    "labelKo": "잔액",
    "labelEn": "Balance",
    "required": true
  },
  {
    "key": "issue_date",
    "labelKo": "발급일",
    "labelEn": "Issue date",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:holder_name:present",
  "field:balance:present",
  "field:issue_date:present",
  "numeric_positive:balance",
  "issue_date_within:90:days"
]
```



---

## A3-030 d4_extension_tuition_receipt

- 체류자격: D-4
- 신청유형: extension
- 신청자 맥락: language_training
- 서류 유형: tuition_payment_receipt
- 한글명: 등록금 납입 증명
- 영문명: Tuition payment receipt
- 필수 여부: required
- 유효기간: 없음
- 발행기관: language_institute
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: hikorea-d2-d4-d10-e7-f2-f5-requirements, studyinkorea-visa-documents

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "student_name",
    "labelKo": "학생 성명",
    "labelEn": "Student name",
    "required": true
  },
  {
    "key": "paid_amount",
    "labelKo": "납입액",
    "labelEn": "Paid amount",
    "required": true
  },
  {
    "key": "covered_period",
    "labelKo": "대상 기간",
    "labelEn": "Covered period",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:student_name:present",
  "field:paid_amount:present",
  "field:covered_period:present",
  "numeric_positive:paid_amount"
]
```



---

## A3-031 d4_to_d2_change_integrated_application

- 체류자격: D-2
- 신청유형: change
- 신청자 맥락: d4_to_d2
- 서류 유형: integrated_application_form
- 한글명: 통합신청서
- 영문명: Integrated application form
- 필수 여부: required
- 유효기간: 없음
- 발행기관: applicant
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "current_status",
    "labelKo": "현재 체류자격",
    "labelEn": "Current status",
    "required": true
  },
  {
    "key": "requested_status",
    "labelKo": "변경 체류자격",
    "labelEn": "Requested status",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:current_status:present",
  "field:requested_status:present"
]
```



---

## A3-032 d4_to_d2_change_standard_admission_letter

- 체류자격: D-2
- 신청유형: change
- 신청자 맥락: d4_to_d2
- 서류 유형: standard_admission_letter
- 한글명: 표준입학허가서
- 영문명: Standard admission letter
- 필수 여부: required
- 유효기간: 없음
- 발행기관: receiving_university
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "student_name",
    "labelKo": "학생 성명",
    "labelEn": "Student name",
    "required": true
  },
  {
    "key": "program",
    "labelKo": "과정",
    "labelEn": "Program",
    "required": true
  },
  {
    "key": "admission_period",
    "labelKo": "입학 기간",
    "labelEn": "Admission period",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:student_name:present",
  "field:program:present",
  "field:admission_period:present"
]
```



---

## A3-033 d4_to_d2_change_attendance

- 체류자격: D-2
- 신청유형: change
- 신청자 맥락: d4_to_d2
- 서류 유형: d4_attendance_certificate
- 한글명: D-4 연수 출석 증빙
- 영문명: D-4 attendance proof
- 필수 여부: required
- 유효기간: 30
- 발행기관: language_institute
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "student_name",
    "labelKo": "학생 성명",
    "labelEn": "Student name",
    "required": true
  },
  {
    "key": "attendance_rate",
    "labelKo": "출석률",
    "labelEn": "Attendance rate",
    "required": true
  },
  {
    "key": "training_period",
    "labelKo": "연수 기간",
    "labelEn": "Training period",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:student_name:present",
  "field:attendance_rate:present",
  "field:training_period:present",
  "numeric_range:attendance_rate:0:100",
  "issue_date_within:30:days"
]
```



---

## A3-034 d4_to_d2_change_progress

- 체류자격: D-2
- 신청유형: change
- 신청자 맥락: d4_to_d2
- 서류 유형: d4_completion_or_transcript
- 한글명: D-4 학업 진척 증빙
- 영문명: D-4 study progress proof
- 필수 여부: required
- 유효기간: 30
- 발행기관: language_institute
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "student_name",
    "labelKo": "학생 성명",
    "labelEn": "Student name",
    "required": true
  },
  {
    "key": "level_or_grade",
    "labelKo": "등급/성적",
    "labelEn": "Level or grade",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:student_name:present",
  "field:level_or_grade:present",
  "issue_date_within:30:days"
]
```



---

## A3-035 d4_to_d2_change_financial_proof

- 체류자격: D-2
- 신청유형: change
- 신청자 맥락: d4_to_d2
- 서류 유형: financial_proof
- 한글명: 재정능력 입증서류
- 영문명: Financial proof
- 필수 여부: required
- 유효기간: 90
- 발행기관: bank_or_sponsor
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "holder_name",
    "labelKo": "예금주",
    "labelEn": "Account holder",
    "required": true
  },
  {
    "key": "balance",
    "labelKo": "잔액",
    "labelEn": "Balance",
    "required": true
  },
  {
    "key": "issue_date",
    "labelKo": "발급일",
    "labelEn": "Issue date",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:holder_name:present",
  "field:balance:present",
  "field:issue_date:present",
  "numeric_positive:balance",
  "issue_date_within:90:days"
]
```



---

## A3-036 d4_to_d2_change_residence_proof

- 체류자격: D-2
- 신청유형: change
- 신청자 맥락: d4_to_d2
- 서류 유형: residence_proof
- 한글명: 체류지 입증서류
- 영문명: Proof of residence
- 필수 여부: required
- 유효기간: 없음
- 발행기관: landlord_school_or_public_authority
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "address",
    "labelKo": "주소",
    "labelEn": "Address",
    "required": true
  },
  {
    "key": "occupant_name",
    "labelKo": "거주자 성명",
    "labelEn": "Occupant name",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:address:present",
  "field:occupant_name:present"
]
```



---

## A3-037 d10_change_integrated_application

- 체류자격: D-10
- 신청유형: change
- 신청자 맥락: job_seeking
- 서류 유형: integrated_application_form
- 한글명: 통합신청서
- 영문명: Integrated application form
- 필수 여부: required
- 유효기간: 없음
- 발행기관: applicant
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "current_status",
    "labelKo": "현재 체류자격",
    "labelEn": "Current status",
    "required": true
  },
  {
    "key": "requested_status",
    "labelKo": "변경 체류자격",
    "labelEn": "Requested status",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:current_status:present",
  "field:requested_status:present"
]
```



---

## A3-038 d10_change_graduation_certificate

- 체류자격: D-10
- 신청유형: change
- 신청자 맥락: job_seeking
- 서류 유형: graduation_certificate
- 한글명: 졸업/수료 증명
- 영문명: Graduation or completion certificate
- 필수 여부: required
- 유효기간: 30
- 발행기관: university
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: hikorea-d2-d4-d10-e7-f2-f5-requirements, visa-portal-visa-types

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "student_name",
    "labelKo": "학생 성명",
    "labelEn": "Student name",
    "required": true
  },
  {
    "key": "graduation_date",
    "labelKo": "졸업/수료일",
    "labelEn": "Graduation or completion date",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:student_name:present",
  "field:graduation_date:present",
  "issue_date_within:30:days"
]
```



---

## A3-039 d10_change_job_seeking_plan

- 체류자격: D-10
- 신청유형: change
- 신청자 맥락: job_seeking
- 서류 유형: job_seeking_plan
- 한글명: 구직활동계획서
- 영문명: Job seeking plan
- 필수 여부: required
- 유효기간: 없음
- 발행기관: applicant
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: hikorea-d2-d4-d10-e7-f2-f5-requirements, visa-portal-visa-types

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "career_goal",
    "labelKo": "취업 목표",
    "labelEn": "Career goal",
    "required": true
  },
  {
    "key": "activity_plan",
    "labelKo": "활동 계획",
    "labelEn": "Activity plan",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:career_goal:present",
  "field:activity_plan:present"
]
```



---

## A3-040 d10_change_financial_proof

- 체류자격: D-10
- 신청유형: change
- 신청자 맥락: job_seeking
- 서류 유형: financial_proof
- 한글명: 체류경비 입증서류
- 영문명: Proof of stay expenses
- 필수 여부: required
- 유효기간: 90
- 발행기관: bank_or_sponsor
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: hikorea-d2-d4-d10-e7-f2-f5-requirements, visa-portal-visa-types

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "holder_name",
    "labelKo": "예금주",
    "labelEn": "Account holder",
    "required": true
  },
  {
    "key": "balance",
    "labelKo": "잔액",
    "labelEn": "Balance",
    "required": true
  },
  {
    "key": "issue_date",
    "labelKo": "발급일",
    "labelEn": "Issue date",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:holder_name:present",
  "field:balance:present",
  "field:issue_date:present",
  "numeric_positive:balance",
  "issue_date_within:90:days"
]
```



---

## A3-041 d10_change_residence_proof

- 체류자격: D-10
- 신청유형: change
- 신청자 맥락: job_seeking
- 서류 유형: residence_proof
- 한글명: 체류지 입증서류
- 영문명: Proof of residence
- 필수 여부: required
- 유효기간: 없음
- 발행기관: landlord_school_or_public_authority
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "address",
    "labelKo": "주소",
    "labelEn": "Address",
    "required": true
  },
  {
    "key": "occupant_name",
    "labelKo": "거주자 성명",
    "labelEn": "Occupant name",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:address:present",
  "field:occupant_name:present"
]
```



---

## A3-042 e7_change_employment_contract

- 체류자격: E-7
- 신청유형: change
- 신청자 맥락: specific_activity
- 서류 유형: employment_contract
- 한글명: 고용계약서
- 영문명: Employment contract
- 필수 여부: required
- 유효기간: 없음
- 발행기관: employer
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: hikorea-d2-d4-d10-e7-f2-f5-requirements, visa-portal-visa-types

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "employee_name",
    "labelKo": "근로자 성명",
    "labelEn": "Employee name",
    "required": true
  },
  {
    "key": "employer_name",
    "labelKo": "고용주",
    "labelEn": "Employer",
    "required": true
  },
  {
    "key": "job_title",
    "labelKo": "직무",
    "labelEn": "Job title",
    "required": true
  },
  {
    "key": "wage",
    "labelKo": "임금",
    "labelEn": "Wage",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:employee_name:present",
  "field:employer_name:present",
  "field:job_title:present",
  "field:wage:present",
  "numeric_positive:wage"
]
```



---

## A3-043 e7_change_business_registration

- 체류자격: E-7
- 신청유형: change
- 신청자 맥락: specific_activity
- 서류 유형: employer_business_registration
- 한글명: 사업자등록증
- 영문명: Employer business registration
- 필수 여부: required
- 유효기간: 90
- 발행기관: employer_or_tax_authority
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: hikorea-d2-d4-d10-e7-f2-f5-requirements, visa-portal-visa-types

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "business_no",
    "labelKo": "사업자등록번호",
    "labelEn": "Business registration number",
    "required": true
  },
  {
    "key": "company_name",
    "labelKo": "상호",
    "labelEn": "Company name",
    "required": true
  },
  {
    "key": "industry_code",
    "labelKo": "업종",
    "labelEn": "Industry",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:business_no:present",
  "field:company_name:present",
  "field:industry_code:present",
  "issue_date_within:90:days"
]
```



---

## A3-044 e7_change_job_description

- 체류자격: E-7
- 신청유형: change
- 신청자 맥락: specific_activity
- 서류 유형: job_description
- 한글명: 직무기술서
- 영문명: Job description
- 필수 여부: required
- 유효기간: 없음
- 발행기관: employer
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: hikorea-d2-d4-d10-e7-f2-f5-requirements, visa-portal-visa-types

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "job_title",
    "labelKo": "직무",
    "labelEn": "Job title",
    "required": true
  },
  {
    "key": "duties",
    "labelKo": "담당업무",
    "labelEn": "Duties",
    "required": true
  },
  {
    "key": "required_qualification",
    "labelKo": "자격요건",
    "labelEn": "Required qualification",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:job_title:present",
  "field:duties:present",
  "field:required_qualification:present",
  "cross_check:job_description:visa_occupation"
]
```



---

## A3-045 e7_change_degree_or_career

- 체류자격: E-7
- 신청유형: change
- 신청자 맥락: specific_activity
- 서류 유형: degree_or_career_certificate
- 한글명: 학위/경력 증빙
- 영문명: Degree or career certificate
- 필수 여부: required
- 유효기간: 없음
- 발행기관: university_or_previous_employer
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: hikorea-d2-d4-d10-e7-f2-f5-requirements, visa-portal-visa-types

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "applicant_name",
    "labelKo": "신청인",
    "labelEn": "Applicant",
    "required": true
  },
  {
    "key": "degree_or_position",
    "labelKo": "학위/직위",
    "labelEn": "Degree or position",
    "required": true
  },
  {
    "key": "period",
    "labelKo": "기간",
    "labelEn": "Period",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:applicant_name:present",
  "field:degree_or_position:present",
  "field:period:present"
]
```



---

## A3-046 f2_change_integrated_application

- 체류자격: F-2
- 신청유형: change
- 신청자 맥락: residence
- 서류 유형: integrated_application_form
- 한글명: 통합신청서
- 영문명: Integrated application form
- 필수 여부: required
- 유효기간: 없음
- 발행기관: applicant
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "current_status",
    "labelKo": "현재 체류자격",
    "labelEn": "Current status",
    "required": true
  },
  {
    "key": "requested_status",
    "labelKo": "변경 체류자격",
    "labelEn": "Requested status",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:current_status:present",
  "field:requested_status:present"
]
```



---

## A3-047 f2_change_income_tax_certificate

- 체류자격: F-2
- 신청유형: change
- 신청자 맥락: residence
- 서류 유형: income_tax_certificate
- 한글명: 소득/납세 증빙
- 영문명: Income or tax proof
- 필수 여부: required
- 유효기간: 90
- 발행기관: tax_authority_or_employer
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: hikorea-d2-d4-d10-e7-f2-f5-requirements, visa-portal-visa-types

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "applicant_name",
    "labelKo": "신청인",
    "labelEn": "Applicant",
    "required": true
  },
  {
    "key": "income_amount",
    "labelKo": "소득금액",
    "labelEn": "Income amount",
    "required": true
  },
  {
    "key": "tax_year",
    "labelKo": "과세연도",
    "labelEn": "Tax year",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:applicant_name:present",
  "field:income_amount:present",
  "field:tax_year:present",
  "numeric_positive:income_amount",
  "issue_date_within:90:days"
]
```



---

## A3-048 f2_change_residence_proof

- 체류자격: F-2
- 신청유형: change
- 신청자 맥락: residence
- 서류 유형: residence_proof
- 한글명: 체류지 입증서류
- 영문명: Proof of residence
- 필수 여부: required
- 유효기간: 없음
- 발행기관: landlord_or_public_authority
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: hikorea-forms-document-checklist, hikorea-d2-d4-d10-e7-f2-f5-requirements

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "address",
    "labelKo": "주소",
    "labelEn": "Address",
    "required": true
  },
  {
    "key": "occupant_name",
    "labelKo": "거주자 성명",
    "labelEn": "Occupant name",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:address:present",
  "field:occupant_name:present"
]
```



---

## A3-049 f5_permanent_residence_application_package

- 체류자격: F-5
- 신청유형: permanent_residence
- 신청자 맥락: general
- 서류 유형: permanent_residence_application_package
- 한글명: 영주자격 신청 기본서류
- 영문명: Permanent residence application package
- 필수 여부: required
- 유효기간: 없음
- 발행기관: applicant
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-decree-long-term-status-table, hikorea-d2-d4-d10-e7-f2-f5-requirements, visa-portal-visa-types

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "current_status",
    "labelKo": "현재 체류자격",
    "labelEn": "Current status",
    "required": true
  },
  {
    "key": "residence_history",
    "labelKo": "체류 이력",
    "labelEn": "Residence history",
    "required": true
  },
  {
    "key": "application_basis",
    "labelKo": "신청 근거",
    "labelEn": "Application basis",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:current_status:present",
  "field:residence_history:present",
  "field:application_basis:present"
]
```



---

## A3-050 f5_permanent_residence_criminal_record

- 체류자격: F-5
- 신청유형: permanent_residence
- 신청자 맥락: general
- 서류 유형: criminal_record_or_overseas_certificate
- 한글명: 범죄경력/해외 공적 증빙
- 영문명: Criminal record or overseas public certificate
- 필수 여부: required
- 유효기간: 180
- 발행기관: public_authority
- 현재 검수상태: PENDING
- 확인자: phase0_seed_unreviewed
- 확인일: 2026-07-03
- 출처: https://www.hikorea.go.kr
- sourceRefs: immigration-rule-documents-attachments, hikorea-d2-d4-d10-e7-f2-f5-requirements, visa-portal-visa-types

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### 필수 기재 항목

```json
[
  {
    "key": "applicant_name",
    "labelKo": "신청인",
    "labelEn": "Applicant",
    "required": true
  },
  {
    "key": "issue_date",
    "labelKo": "발급일",
    "labelEn": "Issue date",
    "required": true
  },
  {
    "key": "issuing_authority",
    "labelKo": "발행기관",
    "labelEn": "Issuing authority",
    "required": true
  }
]
```

### Layer 1 검증 rule keys

```json
[
  "required_document_present",
  "issuer_present",
  "field:applicant_name:present",
  "field:issue_date:present",
  "field:issuing_authority:present",
  "issue_date_within:180:days"
]
```

### Seed note

F-5 routes differ significantly; legal reviewer must confirm route-specific required documents.


