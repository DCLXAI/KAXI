# A1. RAG 지식 코퍼스 검수

검수 관점:

- 법령 인용의 정확성: 조·항 번호, 기간, 수수료 숫자
- 최신성: lastCheckedAt 이후 개정 여부
- 요약 과정의 왜곡 여부
- validTo/supersededBy 설정 적정성
- 사용자 답변에 보여도 되는 공식 근거인지

| 항목 | doc_id | 제목 | topic | 현재 상태 | 확인일 | 출처 |
|---|---|---|---|---|---|---|
| A1-001 | d2-overview | D-2 비자 개요 | visa | APPROVED | 2026-07-01 | Study in Korea · 한국유학종합시스템 |
| A1-002 | d4-overview | D-4 비자 개요 | visa | APPROVED | 2026-07-01 | Study in Korea · 교육부 |
| A1-003 | d10-overview | D-10 구직·창업준비 체류자격 개요 | visa | APPROVED | 2026-07-03 | Korea Visa Portal · Visa Types |
| A1-004 | study-in-korea-d10-change-documents | D-10-1 구직 체류자격 변경 제출서류 | documents | APPROVED | 2026-07-14 | Study in Korea · D-10-1 구직 체류자격 변경 |
| A1-005 | visa-documents | 비자 신청 필수 서류 | documents | APPROVED | 2026-07-01 | Study in Korea |
| A1-006 | tuberculosis-test | 결핵진단서 안내 | documents | APPROVED | 2026-07-01 | 법무부 출입국외국인정책본부 |
| A1-007 | accredited-university | 교육국제화역량 인증대학 제도 | school | APPROVED | 2026-07-03 | Study in Korea · 교육국제화역량 인증대학 |
| A1-008 | visa-portal-visa-types | 대한민국 비자포털 비자 유형 목록 | visa | APPROVED | 2026-07-03 | Korea Visa Portal · Visa Types |
| A1-009 | cost-breakdown | 유학 총비용 항목 분해 | cost | APPROVED | 2026-07-01 | KAXI internal analysis |
| A1-010 | topik-requirement | TOPIK 요구 등급 | documents | APPROVED | 2026-07-01 | 국립국제교육원/TOPIK |
| A1-011 | standard-admission | 표준입학허가서 제도 | documents | APPROVED | 2026-07-01 | 법무부 출입국외국인정책본부 |
| A1-012 | financial-proof | 재정능력 증빙 | documents | APPROVED | 2026-07-01 | 법무부 비자 발급 안내 |
| A1-013 | visa-guarantee-warning | 비자 보장 거짓 광고 경고 | warning | APPROVED | 2026-07-01 | KAXI safety guideline |
| A1-014 | fake-documents-warning | 허위서류 불법 위험 | warning | APPROVED | 2026-07-01 | 국가법령정보센터 |
| A1-015 | illegal-employment-warning | 불법취업·취업 매칭 위험 | warning | APPROVED | 2026-07-01 | 국가법령정보센터 |
| A1-016 | administrative-scrivener | 행정사 업무 영역 | legal | APPROVED | 2026-07-01 | 국가법령정보센터 |
| A1-017 | after-arrival | 입국 후 의무 절차 | process | APPROVED | 2026-07-01 | 법무부 출입국외국인정책본부 |
| A1-018 | immigration-law-recent-promulgations | 출입국관리법 최근공포·시행일자 감시 | legal | APPROVED | 2026-07-02 | 국가법령정보센터 · 최근공포법령 |
| A1-019 | immigration-decree-current-text | 출입국관리법 시행령 최신 본문 감시 | legal | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 시행령 |
| A1-020 | immigration-law-interpretation-hierarchy | 출입국·체류 답변의 법령 해석 순서 | legal | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 |
| A1-021 | immigration-act-visa-passport-requirement | 입국 시 여권·사증 원칙과 무사증 예외 | legal | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제7조 |
| A1-022 | immigration-act-visa-issuance-certificate | 사증 종류와 사증발급인정서·초청인 대리신청 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제8조·제9조 |
| A1-023 | immigration-act-stay-status-scope | 체류자격과 활동범위의 기본 법리 | legal | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 |
| A1-024 | immigration-act-general-stay-status | 일반체류자격의 단기·장기 구분 | legal | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제10조의2 |
| A1-025 | immigration-act-permanent-residence-status | 영주자격(F-5)의 법률상 기본요건 | legal | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제10조의3 |
| A1-026 | immigration-act-entry-ban | 입국금지·입국거부 위험 사유 | warning | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제11조 |
| A1-027 | immigration-act-entry-inspection | 입국심사의 여권·사증·목적·체류기간 요건 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제12조 |
| A1-028 | immigration-decree-long-term-status-table | 시행령 별표상 장기체류자격 분류 | legal | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 시행령 |
| A1-029 | immigration-decree-short-term-status-table | 시행령 별표상 단기체류자격 분류 | legal | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 시행령 별표 1 |
| A1-030 | immigration-decree-permanent-residence-table | 시행령 별표상 영주(F-5) 자격 범위 | legal | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 시행령 별표 1의3 |
| A1-031 | immigration-rule-stay-permission-review-criteria | 체류자격 부여·변경·연장 심사기준 | legal | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 시행규칙 |
| A1-032 | immigration-act-permission-matrix | 변경·연장·자격외활동의 허가 구조 | legal | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 |
| A1-033 | immigration-act-employment-restriction | 외국인 고용·취업 제한의 기본 원칙 | warning | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제18조 |
| A1-034 | immigration-act-employer-reporting-duty | 외국인을 고용한 자 등의 15일 신고의무 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제19조 |
| A1-035 | immigration-act-student-management-reporting | 외국인유학생 학적 변동 관리·신고 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제19조의4 |
| A1-036 | immigration-act-outside-status-activity | 체류자격 외 활동허가와 유학생 아르바이트 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제20조 |
| A1-037 | immigration-act-workplace-change-addition | 근무처 변경·추가 허가와 신고 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제21조 |
| A1-038 | immigration-act-activity-scope-restriction | 활동범위·거소 제한과 준수사항 | legal | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제22조 |
| A1-039 | immigration-act-false-application-documents | 허위서류 제출·알선 금지 | warning | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제26조 |
| A1-040 | immigration-act-permit-cancellation-change | 각종 허가 등의 취소·변경과 7일 전 통지 | warning | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제89조 |
| A1-041 | immigration-act-status-grant | 체류자격 부여의 법령상 기한 | legal | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제23조 |
| A1-042 | immigration-act-status-change | 체류자격 변경허가의 법령 근거 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제24조 |
| A1-043 | immigration-act-stay-extension | 체류기간 연장허가의 법령 근거 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제25조 |
| A1-044 | immigration-act-marriage-immigrant-extension-special | 결혼이민자 등 피해자 체류기간 연장 특칙 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제25조의2 |
| A1-045 | immigration-act-emergency-extension-special | 국가비상사태 등 체류기간 연장 특칙 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제25조의5 |
| A1-046 | immigration-act-departure-inspection | 외국인 출국심사와 유효 여권 확인 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제28조 |
| A1-047 | immigration-act-departure-suspension | 외국인 출국정지와 이의신청 가능성 | warning | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제29조 |
| A1-048 | immigration-act-reentry-permit | 재입국허가와 면제 기준 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제30조 |
| A1-049 | immigration-act-alien-registration | 외국인등록 90일 의무 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제31조 |
| A1-050 | immigration-act-registration-change-report | 외국인등록사항 변경신고 15일 의무 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제35조 |
| A1-051 | immigration-act-address-change-report | 체류지 변경신고 15일 의무 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제36조 |
| A1-052 | immigration-act-arc-return-duty | 외국인등록증 반납과 일시 보관 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제37조 |
| A1-053 | immigration-act-biometric-information-duty | 외국인 생체정보 제공 의무 | process | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제38조 |
| A1-054 | immigration-act-deportation-grounds | 강제퇴거 대상과 영주자격 예외 | warning | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제46조 |
| A1-055 | immigration-act-detention-order | 보호명령서·긴급보호와 48시간 요건 | warning | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제51조 |
| A1-056 | immigration-act-deportation-objection | 강제퇴거명령 이의신청 7일 기한 | warning | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제60조 |
| A1-057 | immigration-act-deportation-detention | 강제퇴거명령 후 보호기간과 연장 한계 | warning | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제63조 |
| A1-058 | immigration-act-detention-temporary-release | 보호의 일시해제와 보증금·조건 | warning | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제65조 |
| A1-059 | immigration-act-departure-recommendation-order | 출국권고·출국명령과 불이행 리스크 | warning | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 제67조·제68조 |
| A1-060 | immigration-rule-documents-attachments | 시행규칙상 첨부서류·아포스티유 확인 | documents | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 시행규칙 |
| A1-061 | immigration-rule-fees | 사증·체류 민원 수수료의 법령 근거 | cost | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 시행규칙 수수료 |
| A1-062 | immigration-law-violation-risk | 체류자격 위반·불법취업·허위서류 위험 | warning | APPROVED | 2026-07-02 | 국가법령정보센터 · 출입국관리법 |
| A1-063 | d-4-to-d-2-transfer | D-4 → D-2 전환 절차 | process | APPROVED | 2026-07-01 | 법무부 출입국외국인정책본부 |
| A1-064 | hikorea-integrated-status-manual | 하이코리아 체류자격별 통합 안내 매뉴얼 | visa | APPROVED | 2026-07-02 | 하이코리아 체류자격별 통합 안내 매뉴얼 |
| A1-065 | hikorea-d2-d4-d10-e7-f2-f5-requirements | D-2/D-4/D-10/E-7/F-2/F-5 체류 요건 확인 원칙 | visa | APPROVED | 2026-07-02 | 하이코리아 체류자격별 통합 안내 매뉴얼 |
| A1-066 | hikorea-stay-extension | 하이코리아 체류기간 연장 기준 | process | APPROVED | 2026-07-02 | 하이코리아 체류기간연장 안내 |
| A1-067 | hikorea-status-change | 하이코리아 체류자격 변경 기준 | process | APPROVED | 2026-07-02 | 하이코리아 체류자격변경 안내 |
| A1-068 | hikorea-activity-permit | 체류자격외활동 및 유학생 시간제취업 | process | APPROVED | 2026-07-02 | 하이코리아 체류자격외활동 안내 |
| A1-069 | hikorea-forms-document-checklist | 하이코리아 민원서식 및 제출서류 체크리스트 | documents | APPROVED | 2026-07-02 | 하이코리아 민원서식 |
| A1-070 | hikorea-online-visit-application | 전자민원·방문예약 절차 | process | APPROVED | 2026-07-02 | 하이코리아 전자민원 |
| A1-071 | hikorea-fees-processing-authentication | 수수료·처리기간·원본/번역/아포스티유 확인 | cost | APPROVED | 2026-07-02 | 하이코리아 출입국/체류안내 |
| A1-072 | hikorea-policy-notice-monitor | 정책 변경성 공지 모니터링 | warning | APPROVED | 2026-07-02 | 하이코리아 공지사항 |
| A1-073 | hikorea-homepage-urgent-notices | 하이코리아 첫 화면 긴급 공지 감시 | warning | APPROVED | 2026-07-02 | 하이코리아 첫 화면 긴급 공지 |
| A1-074 | moj-immigration-policy-news | 법무부 출입국·외국인정책본부 주요소식 감시 | process | APPROVED | 2026-07-03 | 법무부 출입국외국인정책본부 주요소식 |
| A1-075 | moj-notice-board-visa-policy | 법무부 공지사항 체류·사증 정책 감시 | warning | APPROVED | 2026-07-03 | 법무부 공지사항 · 체류·사증 정책 |
| A1-076 | moj-e7-wage-requirement-2026 | 2026년 특정활동(E-7) 임금요건 기준 공고 | visa | APPROVED | 2026-07-03 | 법무부 공지사항 · E-7 임금요건 2026 |
| A1-077 | moj-f6-marriage-visa-criteria | F-6 결혼동거 사증 발급 요건·심사면제 기준 고시 | visa | APPROVED | 2026-07-03 | 법무부 공지사항 · F-6 결혼동거 사증 고시 |
| A1-078 | moj-f4-employment-restriction-preannouncement | F-4 재외동포 취업활동 제한범위 행정예고 | warning | APPROVED | 2026-07-03 | 법무부 공지사항 · F-4 취업제한 행정예고 |
| A1-079 | moj-skilled-worker-points-visa | 외국인 숙련기능인력 점수제 비자 | visa | APPROVED | 2026-07-03 | 법무부 정책서비스 · 숙련기능인력 점수제 비자 |
| A1-080 | moj-seasonal-worker-program | 외국인 계절근로자 프로그램 | visa | APPROVED | 2026-07-03 | 법무부 정책서비스 · 계절근로자 프로그램 |
| A1-081 | moj-online-stay-visa-center | 온라인체류·사증민원센터 | process | APPROVED | 2026-07-03 | 법무부 정책서비스 · 온라인체류·사증민원센터 |
| A1-082 | moj-stay-management-policy | 법무부 외국인 체류관리 정책 | process | APPROVED | 2026-07-03 | 법무부 이민정책 · 외국인 체류관리 |
| A1-083 | moj-tax-health-arrears-extension-restriction | 비자연장 전 세금·건강보험료 체납 확인 | warning | APPROVED | 2026-07-03 | 법무부 주요제도 · 세금·건강보험료 체납 확인 |
| A1-084 | moj-social-integration-program-kiip | 사회통합프로그램(KIIP) 체류·영주·국적 활용 | visa | APPROVED | 2026-07-03 | 법무부 주요제도 · 사회통합프로그램 |
| A1-085 | moj-k-eta-entry-authorization | 전자여행허가제(K-ETA) 입국 전 확인 | process | APPROVED | 2026-07-03 | 법무부 주요제도 · 전자여행허가제(K-ETA) |
| A1-086 | moj-k-eta-scam-warning | K-ETA 유사 웹사이트·대행 주의 | warning | APPROVED | 2026-07-03 | 법무부 공지사항 · K-ETA 유사 웹사이트 주의 |
| A1-087 | moj-e-arrival-card | 전자입국신고서(e-Arrival card) 제출 대상 | process | APPROVED | 2026-07-03 | 법무부 주요제도 · 전자입국신고서(e-Arrival card) |
| A1-088 | moj-e-arrival-card-notice | 전자입국신고서 시행 공지와 운영 세부 | process | APPROVED | 2026-07-03 | 법무부 공지사항 · 전자입국신고서 시행 알림 |
| A1-089 | moj-office-jurisdiction-seoul-incheon-gyeonggi | 서울·인천·경기 출입국 관할구역 | process | APPROVED | 2026-07-03 | 법무부 소속기관 · 서울/인천/경기 관할구역 |
| A1-090 | moj-office-jurisdiction-busan-gyeongnam | 부산·경남 출입국 관할구역 | process | APPROVED | 2026-07-03 | 법무부 소속기관 · 부산/경남 관할구역 |
| A1-091 | moj-office-jurisdiction-gwangju-jeolla-jeju | 광주·전라·제주 출입국 관할구역 | process | APPROVED | 2026-07-03 | 법무부 소속기관 · 광주/전라/제주 관할구역 |
| A1-092 | moj-office-jurisdiction-daegu-gyeongbuk-gangwon | 대구·경북·강원 출입국 관할구역 | process | APPROVED | 2026-07-03 | 법무부 소속기관 · 대구/경북/강원 관할구역 |
| A1-093 | moj-office-jurisdiction-daejeon-chungcheong | 대전·충청 출입국 관할구역 | process | APPROVED | 2026-07-03 | 법무부 소속기관 · 대전/충청 관할구역 |
| A1-094 | moj-mobile-immigration-office | 이동출입국사무소 운영 확인 | process | APPROVED | 2026-07-03 | 법무부 누리집안내 · 이동출입국사무소 |
| A1-095 | broker-redflags | 브로커 위험 신호 체크리스트 | warning | APPROVED | 2026-07-01 | KAXI safety guideline |

---

## A1-001 d2-overview

- 제목: D-2 비자 개요
- 카테고리: visa
- 출처 라벨: Study in Korea · 한국유학종합시스템
- 출처 URL: https://www.studyinkorea.go.kr
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-01-01 ~ 없음
- 최종 확인일: 2026-07-01
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 1

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — D-2 비자 개요

```
D-2는 학위과정 유학생 체류자격입니다. 전문대·대학교·대학원·전문대학원 학위과정에 등록된 외국인 유학생이 신청합니다. 교육부 인증대학(교육국제화역량 인증)은 사증 심사 혜택을 받을 수 있으며, 비인증대학은 기준 미충족 시 비자심사 강화대학으로 지정될 수 있습니다. 2025년 기준 학위과정 비자정밀 심사대학은 16개교입니다.
```

### EN — D-2 Visa Overview

```
D-2 is for degree-program international students (college, university, graduate school). Accredited universities (education internationalization capacity认证) get visa screening benefits. Non-accredited schools may be designated as strict visa review schools. In 2025, 16 degree programs are under strict visa review.
```

### VI — Tổng quan visa D-2

```
D-2 là visa cho sinh viên quốc tế theo học chương trình cấp bằng (cao đẳng, đại học, thạc sĩ, tiến sĩ). Trường được认证 (giáo dục quốc tế hóa) được hưởng lợi khi xét visa. Các trường không đạt chuẩn có thể bị đưa vào danh sách kiểm tra gắt. Năm 2025 có 16 trường bị xét visa kỹ.
```

### MN — D-2 визийн тойм

```
D-2 нь зэргийн курсийн оюутны виз. Коллеж, их сургууль, магистр, докторын курс. Боловсролын олон улсын чадавхын итгэмжлэлтэй сургууль нь визний давуу эрхтэй. 2025 онд 16 сургууль нарийвчилсан шалгалтад орсон.
```

---

## A1-002 d4-overview

- 제목: D-4 비자 개요
- 카테고리: visa
- 출처 라벨: Study in Korea · 교육부
- 출처 URL: https://www.studyinkorea.go.kr
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-01-01 ~ 없음
- 최종 확인일: 2026-07-01
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 1

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — D-4 비자 개요

```
D-4는 비학위 연수과정 유학생 체류자격입니다. 어학당·교환학생·연구원 등이 해당합니다. 한국어 기초가 없어도 입학 가능합니다. 2025년 기준 어학연수과정 비자정밀 심사대학은 4개교이며, 2026년 2학기부터 1년간 해당 대학은 비자 발급이 제한됩니다.
```

### EN — D-4 Visa Overview

```
D-4 is for non-degree programs (Korean language institutes, exchange students, researchers). No TOPIK required. In 2025, 4 language programs are under strict review, with 1-year visa restriction from 2026 semester 2.
```

### VI — Tổng quan visa D-4

```
D-4 là visa cho chương trình không cấp bằng (lớp tiếng Hàn, trao đổi, nghiên cứu). Không cần TOPIK. Năm 2025 có 4 trường bị xét visa kỹ, từ kỳ 2/2026 bị hạn chế visa 1 năm.
```

### MN — D-4 визийн тойм

```
D-4 нь зэргийн бус курсийн виз. Солонгос хэлний курс, солилцооны оюутан, судлаач. TOPIK шаардлагагүй. 2025 онд 4 сургууль, 2026/II-ээс 1 жил виз хязгаарлагдана.
```

---

## A1-003 d10-overview

- 제목: D-10 구직·창업준비 체류자격 개요
- 카테고리: visa
- 출처 라벨: Korea Visa Portal · Visa Types
- 출처 URL: https://www.visa.go.kr/openPage.do?LANG_TYPE=EN&MENU_ID=10102
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — D-10 구직·창업준비 체류자격 개요

```
Korea Visa Portal은 전문인력 범주에서 구직(D-10-1)과 기술창업준비(D-10-2)를 구분합니다. D-10은 단순히 졸업하면 자동으로 부여되는 자격이 아니며, 목표 활동이 E계열 전문분야 구직·연수인지 또는 기술창업 준비인지, 현재 체류자격과 만료일, 학력·경력·구직활동 계획, 국내 변경 가능 여부를 확인해야 합니다. 실제 허가 요건과 제출서류는 출입국관리법·시행령·시행규칙 및 최신 HiKorea 체류자격별 안내를 우선 확인합니다.
```

### EN — D-10 Job-Seeking and Startup-Preparation Overview

```
The Korea Visa Portal distinguishes Job Seeker (D-10-1) from Business Startup preparation (D-10-2). D-10 is not granted automatically upon graduation. Review whether the target activity is job seeking or training in an E-series professional field, or technology-startup preparation; the current status and expiry date; education, experience, and job-search plan; and whether domestic change is available. Confirm actual eligibility and documents against the Immigration Act, Enforcement Decree, Enforcement Rule, and current HiKorea status guidance.
```

### VI — Tổng quan tư cách D-10 tìm việc và chuẩn bị khởi nghiệp

```
Korea Visa Portal phân biệt D-10-1 dành cho tìm việc và D-10-2 dành cho chuẩn bị khởi nghiệp công nghệ. D-10 không tự động được cấp chỉ vì đã tốt nghiệp. Cần kiểm tra hoạt động mục tiêu có thuộc tìm việc/đào tạo trong lĩnh vực chuyên môn nhóm E hay chuẩn bị khởi nghiệp, tư cách hiện tại và ngày hết hạn, học lực/kinh nghiệm/kế hoạch tìm việc, cùng khả năng đổi tư cách trong Hàn Quốc. Điều kiện và hồ sơ thực tế phải ưu tiên Luật, Nghị định, Quy tắc thi hành và hướng dẫn HiKorea mới nhất.
```

### MN — D-10 ажил хайх ба стартап бэлтгэлийн ангиллын тойм

```
Korea Visa Portal нь ажил хайх D-10-1 ба технологийн стартап бэлтгэх D-10-2-ыг ялгадаг. Сургуулиа төгссөнөөр D-10 автоматаар олгогдохгүй. Зорилго нь E ангиллын мэргэжлийн ажил хайх/дадлага эсвэл стартап бэлтгэл мөн эсэх, одоогийн ангилал ба дуусах өдөр, боловсрол/туршлага/ажил хайх төлөвлөгөө, Солонгост ангилал өөрчлөх боломжийг шалгана. Бодит нөхцөл, материалыг хууль, журам, дүрэм болон хамгийн сүүлийн HiKorea заавраас баталгаажуулна.
```

---

## A1-004 study-in-korea-d10-change-documents

- 제목: D-10-1 구직 체류자격 변경 제출서류
- 카테고리: documents
- 출처 라벨: Study in Korea · D-10-1 구직 체류자격 변경
- 출처 URL: https://studyinkorea.go.kr/ko/life/residenceAndStayInfo.do?tab=job-seeker-visa
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-01 ~ 없음
- 최종 확인일: 2026-07-14
- 확인자: kaxi-official-source-review
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — D-10-1 구직 체류자격 변경 제출서류

```
Study in Korea의 구직비자(D-10-1) 안내에 따르면 체류자격 변경 시 기본적으로 신청서, 사진, 여권 사본, 수수료, 외국인등록증 사본, 구직활동계획서, 학위증명서, 체류지 입증서류를 준비합니다. 한국어 능력 또는 경력 증명은 해당하는 경우 제출하며, 재정능력 입증은 월 생활비 90만 원의 6개월분을 기준으로 안내됩니다. 다만 유학(D-2)에서 구직(D-10)으로 처음 변경하는 경우 재정능력 입증 제출이 면제된다고 안내되어 있습니다. 신청인의 현재 체류자격과 세부 유형에 따라 추가서류가 달라질 수 있으므로 접수 전 하이코리아 1345 또는 관할 출입국외국인관서에서 최신 목록을 확인해야 합니다.
```

### EN — Documents for changing to D-10-1 job-seeking status

```
Study in Korea's D-10-1 job-seeking guidance lists the core change-of-status packet as an application form, photo, passport copy, fee, alien registration card copy, job-seeking activity plan, degree certificate, and proof of residence. Korean-language proficiency or career certificates apply when relevant; financial proof is described as six months of living expenses at KRW 900,000 per month. A first change from Study (D-2) to Job-Seeking (D-10) is exempt from the financial-proof submission. Confirm the latest checklist through 1345 or the competent immigration office because additional documents can depend on the applicant's current status and subtype.
```

### VI — Hồ sơ đổi sang tư cách tìm việc D-10-1

```
Theo hướng dẫn visa tìm việc D-10-1 của Study in Korea, hồ sơ cơ bản khi đổi tư cách gồm đơn, ảnh, bản sao hộ chiếu, lệ phí, bản sao thẻ đăng ký người nước ngoài, kế hoạch tìm việc, bằng cấp và giấy tờ chứng minh nơi cư trú. Nộp chứng chỉ tiếng Hàn hoặc kinh nghiệm nghề nghiệp nếu áp dụng; chứng minh tài chính được hướng dẫn theo mức 900.000 KRW mỗi tháng trong 6 tháng. Người lần đầu đổi từ D-2 sang D-10 được miễn nộp chứng minh tài chính. Cần xác nhận danh sách mới nhất qua 1345 hoặc cơ quan xuất nhập cảnh phụ trách vì có thể phát sinh giấy tờ bổ sung.
```

### MN — D-10-1 ажил хайх ангилалд шилжих материал

```
Study in Korea-ийн D-10-1 ажил хайх визийн зааварт ангилал өөрчлөх үндсэн материалд өргөдөл, зураг, паспортын хуулбар, хураамж, гадаадын иргэний бүртгэлийн картын хуулбар, ажил хайх төлөвлөгөө, диплом болон оршин суух газрын нотолгоо орно. Хамаарах тохиолдолд солонгос хэлний түвшин эсвэл ажлын туршлагын баримт өгнө; санхүүгийн нотолгоог сарын 900,000 воны 6 сарын дүнгээр тайлбарласан. D-2-оос D-10 руу анх удаа шилжиж буй хүн санхүүгийн нотолгооноос чөлөөлөгдөнө. Нэмэлт материал шаардагдаж болох тул 1345 эсвэл харьяа цагаачлалын байгууллагаас хамгийн сүүлийн жагсаалтыг шалгана.
```

---

## A1-005 visa-documents

- 제목: 비자 신청 필수 서류
- 카테고리: documents
- 출처 라벨: Study in Korea
- 출처 URL: https://www.studyinkorea.go.kr
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-01-01 ~ 없음
- 최종 확인일: 2026-07-01
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 1

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 비자 신청 필수 서류

```
한국유학종합시스템에 따르면 D-2/D-4 비자 신청에는 여권 사본, 증명사진, 교육기관 사업자등록증, 표준입학허가서, 학력 증빙, 재정능력 증빙 등이 필요합니다. 국가·프로그램에 따라 추가 서류가 요구될 수 있으며, 관할 재외공관 확인이 필수입니다. 결핵진단서는 베트남·몽골·중국·필리핀·미얀마·우즈베키스탄·태국·인도네시아·네팔 등 일부 국가 출신자에게 필요합니다.
```

### EN — Required visa documents

```
Per Study in Korea, D-2/D-4 visa requires: passport copy, ID photo, school business registration, standard admission letter, education proof, financial proof. TB test required for citizens of Vietnam, Mongolia, China, Philippines, Myanmar, Uzbekistan, Thailand, Indonesia, Nepal.
```

### VI — Hồ sơ visa bắt buộc

```
Theo hệ thống Study in Korea, visa D-2/D-4 cần: hộ chiếu, ảnh, giấy ĐKKD cơ sở giáo dục, giấy nhập học chuẩn, bằng cấp, chứng minh tài chính. Có thể cần thêm giấy khám LAO cho công dân Việt Nam, Mông Cổ, Trung Quốc, Philippines...
```

### MN — Визийн шаардлагатай баримт

```
Study in Korea системд D-2/D-4 визанд: паспорт, зураг, боловсролын байгууллагын гэрчилгээ, стандарт элсэлтийн зөвшөөрөл, боловсролын баталгаа, санхүүгийн баталгаа хэрэгтэй. Монгол, Вьетнам, Хятад, Филиппин зэрэг орны иргэдэд сүрьеэний үзлэг шаардлагатай.
```

---

## A1-006 tuberculosis-test

- 제목: 결핵진단서 안내
- 카테고리: documents
- 출처 라벨: 법무부 출입국외국인정책본부
- 출처 URL: https://www.immigration.go.kr
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-01-01 ~ 없음
- 최종 확인일: 2026-07-01
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 1

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 결핵진단서 안내

```
결핵진단서는 한국법무부 지정 병원에서 검사받아야 하며, 결과는 6개월 유효합니다. 베트남 (하노이 가톨릭대학교 강북성모병원, 호치민 빈머 의과대학병원), 몽골 (국립제3병원, 가축위생병원) 등에 지정 병원이 있습니다. 검사 비용은 국가별로 약 30~80달러입니다. 검사 결과 이상 발견시 비자 발급이 제한될 수 있습니다.
```

### EN — Tuberculosis test

```
TB test must be at Korean Ministry of Justice designated hospitals. Result valid 6 months. In Vietnam: Duc Hospital (Hanoi), Chợ Rẫy (HCMC). Mongolia: National 3rd Hospital. Cost ~30-80 USD. Abnormal results may restrict visa.
```

### VI — Giấy khám LAO

```
Giấy khám LAO phải khám tại bệnh viện chỉ định của Bộ Tư pháp Hàn Quốc. Kết quả có hiệu lực 6 tháng. Tại Việt Nam: bệnh viện Đức (Hà Nội), Chợ Rẫy (HCMC). Chi phí khoảng 30-80 USD.
```

### MN — Сүрьеэний үзлэг

```
Сүрьеэний үзлэгийг Солонгосын Хууль зүй яамны заасан эмнэлэгт хийлгэх. Үр дүн 6 сар хүчинтэй. Монголд Үндэсний 3-р эмнэлэг, мал амьтны эрүүл мэндийн эмнэлэгт. Үнэ 30-80 ам.доллар.
```

---

## A1-007 accredited-university

- 제목: 교육국제화역량 인증대학 제도
- 카테고리: school
- 출처 라벨: Study in Korea · 교육국제화역량 인증대학
- 출처 URL: https://studyinkorea.go.kr/ko/plan/certifiedUniversity.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-03-03 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 교육국제화역량 인증대학 제도

```
Study in Korea의 교육국제화역량 인증제(IEQAS) 안내에 따르면 법무부와 교육부는 우수 외국인 유학생 유치를 위해 매년 국제화 역량이 높은 대학을 평가·인증합니다. 2026-03-03 최종 수정 기준 인증대학은 학위과정 184개(대학교 135, 전문대학 33, 대학원대학 16), 한국어연수과정 126개(대학교 104, 전문대학 20, 대학원대학 2)로 공시되어 있습니다. 인증대학은 외국인 유학생 사증 심사기준 완화와 주중 시간제취업 허가시간 추가 등 혜택이 있고, 비인증대학은 별도 점검과 비자심사 강화 대상이 될 수 있으므로 학교 추천·서류 안내 전에 최신 인증 여부를 확인해야 합니다.
```

### EN — Accredited universities (Internationalization Capacity)

```
Study in Korea's IEQAS guidance says the Ministry of Justice and Ministry of Education annually evaluate and certify universities with strong internationalization capacity. As last modified on 2026-03-03, it lists 184 certified degree-program institutions and 126 certified Korean-language-program institutions. Certified universities may receive relaxed student-visa screening and additional weekday part-time work allowances, while non-certified universities may be inspected or face stricter visa review, so current certification must be checked before school or document guidance.
```

### VI — Trường认证 năng lực quốc tế hóa

```
Theo Study in Korea về IEQAS, Bộ Tư pháp và Bộ Giáo dục hằng năm đánh giá và chứng nhận các trường có năng lực quốc tế hóa cao để thu hút sinh viên quốc tế. Bản sửa đổi 2026-03-03 công bố 184 chương trình cấp bằng được chứng nhận và 126 chương trình tiếng Hàn được chứng nhận. Trường được chứng nhận có thể hưởng lợi khi xét visa và giờ làm thêm trong tuần; trường không được chứng nhận có thể bị kiểm tra hoặc xét visa chặt hơn, nên cần kiểm tra trạng thái mới nhất trước khi tư vấn trường/hồ sơ.
```

### MN — Олон улсын чадавхын итгэмжлэлтэй сургууль

```
Study in Korea-ийн IEQAS тайлбараар Хууль зүйн яам болон Боловсролын яам олон улсын чадавх өндөр сургуулийг жил бүр үнэлж баталгаажуулдаг. 2026-03-03-нд шинэчилсэн жагсаалтаар зэрэг олгох 184 байгууллага, солонгос хэлний 126 байгууллага баталгаажсан байна. Баталгаажсан сургууль визний шалгалт болон долоо хоногийн цагийн ажлын зөвшөөрөлд давуу байж болох тул сургууль санал болгох, материалын зөвлөгөө өгөхийн өмнө одоогийн баталгааг шалгана.
```

---

## A1-008 visa-portal-visa-types

- 제목: 대한민국 비자포털 비자 유형 목록
- 카테고리: visa
- 출처 라벨: Korea Visa Portal · Visa Types
- 출처 URL: https://www.visa.go.kr/openPage.do?LANG_TYPE=EN&MENU_ID=10102
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 대한민국 비자포털 비자 유형 목록

```
Korea Visa Portal의 비자 유형 목록은 법무부가 운영하는 사증 안내의 운영 보조 근거입니다. 2026-07-03 확인 기준 Study·Language Training 범주에는 Associate Degree(D-2-1), Bachelor's Degree(D-2-2), Master's Degree(D-2-3), Doctoral Degree(D-2-4), Research Study(D-2-5), Exchange Student(D-2-6), Korean Language Trainee(D-4-1), Student(D-4-3), Foreign Language Trainee(D-4-7)가 표시됩니다. Professional 범주에는 Job Seeker(D-10-1), Business Startup(D-10-2), Foreign National of Special Ability(E-7-1) 등이 표시됩니다. 실제 체류자격 판단은 출입국관리법·시행령·시행규칙을 우선하고, 비자포털은 명칭·분류·신청 경로 확인용으로 사용합니다.
```

### EN — Korea Visa Portal visa-type list

```
The Korea Visa Portal visa-type list is operational guidance run by the Ministry of Justice. As checked on 2026-07-03, Study·Language Training includes D-2-1, D-2-2, D-2-3, D-2-4, D-2-5, D-2-6, D-4-1, D-4-3, and D-4-7; Professional includes D-10-1, D-10-2, and E-7-1. Legal stay-status conclusions must prioritize the Immigration Act, Enforcement Decree, and Enforcement Rule; the portal is used to confirm labels, categories, and application routes.
```

### VI — Danh mục loại visa trên Korea Visa Portal

```
Danh mục loại visa trên Korea Visa Portal là căn cứ nghiệp vụ bổ trợ do Bộ Tư pháp vận hành. Kiểm tra ngày 2026-07-03: nhóm Study·Language Training gồm D-2-1, D-2-2, D-2-3, D-2-4, D-2-5, D-2-6, D-4-1, D-4-3, D-4-7; nhóm Professional gồm D-10-1, D-10-2 và E-7-1. Việc xác định tư cách lưu trú vẫn ưu tiên Luật Quản lý xuất nhập cảnh, Nghị định và Quy tắc thi hành; cổng visa dùng để kiểm tra tên, phân loại và đường nộp.
```

### MN — БНСУ-ын визийн порталын визийн төрлийн жагсаалт

```
Korea Visa Portal-ийн визийн төрөл нь Хууль зүйн яамны ажиллагааны туслах эх сурвалж. 2026-07-03-ны шалгалтаар Study·Language Training бүлэгт D-2-1, D-2-2, D-2-3, D-2-4, D-2-5, D-2-6, D-4-1, D-4-3, D-4-7; Professional бүлэгт D-10-1, D-10-2, E-7-1 зэрэг байна. Оршин суух эрхийн дүгнэлтэд хууль, журам, дүрмийг түрүүлж үзэж, визийн портал нь нэршил, ангилал, өргөдлийн замыг шалгахад хэрэглэгдэнэ.
```

---

## A1-009 cost-breakdown

- 제목: 유학 총비용 항목 분해
- 카테고리: cost
- 출처 라벨: KAXI internal analysis
- 출처 URL: https://kaxi.vercel.app/sources/cost-analysis
- 출처 유형: internal_analysis
- 관할: KAXI
- 유효기간: 2026-01-01 ~ 없음
- 최종 확인일: 2026-07-01
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 유학 총비용 항목 분해

```
한국 유학 총비용은 등록금·기숙사비·서류비·번역공증비·비자수수료·항공권·입국 초기 정착비로 분해됩니다. 어학당 1학기 등록금은 130~190만원, 4년제는 350~520만원 정도입니다. 기숙사비는 6개월 150~300만원. 번역공증은 문서당 15,000~50,000원. 비자 신청 수수료는 60,000원(단수). 항공권은 편도 30~60만원. 정착비는 통신·교통·생활비 포함 1~2백만원이 적정합니다. 브로커가 총액만 말하면 30% 이상 부풀려져 있을 수 있으므로 항목별 비교가 필수입니다.
```

### EN — Total cost itemized breakdown

```
Korea study total cost: tuition, dorm, docs, translation, visa, flight, settlement. Language: 1.3-1.9M KRW/semester. University: 3.5-5.2M/semester. Dorm: 1.5-3M/6mo. Translation: 15-50K/doc. Visa: 60K. Flight: 300-600K. Settlement: 1-2M. If broker total is 30%+ higher, compare items.
```

### VI — Phân tích tổng chi phí du học

```
Tổng chi phí du học Hàn Quốc: học phí, KTX, hồ sơ, dịch+công chứng, phí visa, vé máy bay, chi phí ban đầu. Lớp tiếng: 1.3-1.9 triệu KRW/kỳ. Đại học: 3.5-5.2 triệu/kỳ. KTX: 1.5-3 triệu/6 tháng. Dịch+công chứng: 15,000-50,000 KRW/tài liệu. Visa: 60,000 KRW. Vé: 300-600k KRW. Nếu môi giới báo tổng cao hơn 30% → so sánh kỹ.
```

### MN — Нийт зардлын задаргаа

```
Солонгос улсад сурах нийт зардал: төлбөр, дотуур байр, баримт, орчуулга гэрчилгээ, виз хураамж, нисэх тийз, анхны зардал. Хэлний курс 1.3-1.9 сая/семестр. Их сургууль 3.5-5.2 сая. Дотуур байр 1.5-3 сая/6 сар. Орчуулга 15-50 мянга/баримт. Виз 60,000. Зуучлагч 30%+ өндөр бол харьцуул.
```

---

## A1-010 topik-requirement

- 제목: TOPIK 요구 등급
- 카테고리: documents
- 출처 라벨: 국립국제교육원/TOPIK
- 출처 URL: https://www.topik.go.kr
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-01-01 ~ 없음
- 최종 확인일: 2026-07-01
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 1

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — TOPIK 요구 등급

```
TOPIK(Test of Proficiency in Korean)은 1~6급으로 구성됩니다. 학위과정 입학은 보통 TOPIK 4급 이상이 필요하며, 전공·대학에 따라 3급 또는 5급이 요구될 수 있습니다. 어학당은 TOPIK 점수가 필요 없습니다. 일부 대학은 자체 한국어 시험으로 대체 가능합니다. TOPIK은 매년 4~6회 시행되며 응시료는 약 40,000~60,000원입니다.
```

### EN — TOPIK requirement

```
TOPIK levels 1-6. Universities typically require 4+ (some 3 or 5). Language programs: none. Some schools have own tests. Held 4-6 times/year, fee 40-60K KRW.
```

### VI — Yêu cầu TOPIK

```
TOPIK có 6 cấp. ĐH cần TOPIK 4+ (có nơi 3 hoặc 5). Lớp tiếng không cần. Một số trường cho phép thi riêng. TOPIK 4-6 lần/năm, phí 40-60k KRW.
```

### MN — TOPIK шаардлага

```
TOPIK 6 түвшинтэй. Их сургууль 4+ шаардлагатай (зарим 3 эсвэл 5). Хэлний курс шаардлагагүй. Зарим сургууль өөрийн шалгалттай. Жилд 4-6 удаа, хураамж 40-60k KRW.
```

---

## A1-011 standard-admission

- 제목: 표준입학허가서 제도
- 카테고리: documents
- 출처 라벨: 법무부 출입국외국인정책본부
- 출처 URL: https://www.immigration.go.kr
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-01-01 ~ 없음
- 최종 확인일: 2026-07-01
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 1

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 표준입학허가서 제도

```
표준입학허가서는 법무부 지정 양식으로 학교가 발급하는 공식 입학 허가 문서입니다. 일반 입학허가서와 달리 비자 신청시 필수이며, 학교의 사업자등록증 사본과 함께 제출해야 합니다. 학교 합격 후 학교 유학담당자에게 요청하여 발급받아야 합니다. 발급에는 보통 1~2주가 소요됩니다.
```

### EN — Standard Admission Letter

```
Standard Admission Letter is a Ministry of Justice-designated form issued by the school. Required for visa, with school business registration. Request from school after admission. Takes 1-2 weeks.
```

### VI — Giấy nhập học chuẩn

```
Giấy nhập học chuẩn là mẫu của Bộ Tư pháp, do trường cấp. Bắt buộc khi xin visa, kèm ĐKKD của trường. Sau khi đậu, yêu cầu trường cấp. Mất 1-2 tuần.
```

### MN — Стандарт элсэлтийн зөвшөөрөл

```
Стандарт элсэлтийн зөвшөөрөл нь Хууль зүй яамны загвараар сургууль олгоно. Визанд заавал хэрэгтэй, сургуулийн гэрчилгээтэй хамт. 1-2 долоо хоног болно.
```

---

## A1-012 financial-proof

- 제목: 재정능력 증빙
- 카테고리: documents
- 출처 라벨: 법무부 비자 발급 안내
- 출처 URL: https://www.visa.go.kr
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-01-01 ~ 없음
- 최종 확인일: 2026-07-01
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 1

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 재정능력 증빙

```
재정능력 증빙은 본인 또는 부모 명의 은행 잔고증명서로 제출합니다. D-2는 보통 20,000달러 이상, D-4는 13,000달러 이상의 잔고를 1개월 이상 유지해야 합니다. 국가에 따라 6개월 이상 유지를 요구할 수 있습니다. 허위 잔고증명서 제출은 강제퇴거·입국금지 대상이며, 플랫폼은 허위서류 요청을 거부합니다.
```

### EN — Financial proof

```
Financial proof via bank balance certificate (self or parents). D-2: 20,000+ USD, D-4: 13,000+ USD, held 1+ month. Some countries need 6 months. Fake certificates = deportation + entry ban. Platform refuses fake document requests.
```

### VI — Chứng minh tài chính

```
Chứng minh tài chính bằng sổ tiết kiệm bản thân hoặc bố mẹ. D-2 cần 20,000+ USD, D-4 cần 13,000+ USD, duy trì 1+ tháng. Một số nước cần 6 tháng. Sổ giả = trục xuất + cấm nhập cảnh.
```

### MN — Санхүүгийн баталгаа

```
Санхүүгийн баталгаа нь өөрийн эсвэл эцэг эхийн нэр дээрх банкны үлдэгдлийн гэрчилгээ. D-2 20,000+ ам.доллар, D-4 13,000+ ам.доллар, 1+ сар хадгалах. Хуурамч баримт = албадан гаргах + хориг.
```

---

## A1-013 visa-guarantee-warning

- 제목: 비자 보장 거짓 광고 경고
- 카테고리: warning
- 출처 라벨: KAXI safety guideline
- 출처 URL: https://kaxi.vercel.app/sources/safety-guideline
- 출처 유형: internal_policy
- 관할: KAXI
- 유효기간: 2026-01-01 ~ 없음
- 최종 확인일: 2026-07-01
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 1

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 비자 보장 거짓 광고 경고

```
비자 발급 여부는 영사의 재량이며, 어떤 브로커나 유학원도 '비자 100% 보장'을 약속할 수 없습니다. 비자 보장을 약속하는 것은 허위 광고에 해당하며, 계약 후 비자 거절시 책임을 회피하는 경우가 많습니다. KAXI는 비자 발급을 보장하지 않으며, 비자 가능성을 판단하지 않습니다. 개별 비자 판단은 행정사 상담으로 연결됩니다.
```

### EN — Visa guarantee false advertising warning

```
Visa is at consul's discretion. No one can guarantee 100% visa. 'Visa guarantee' is false advertising. Platform does not guarantee visa, refers to admin lawyer for individual cases.
```

### VI — Cảnh báo quảng cáo xảo trá 'bảo đảm visa'

```
Visa do lãnh sự quyết định. Không ai bảo đảm 100% visa. Hứa 'bảo đảm visa' là quảng cáo giả. Nền tảng không bảo đảm visa, chuyển sang luật sư cho từng trường hợp.
```

### MN — 'Виз баталгаа' хуурамч зар сурталчилгаа

```
Визийг консул шийдвэрлэнэ. 'Виз 100% баталгаа' гэдэг хуурамч зар. Платформ виз баталгаажуулдаггүй, тусгай зөвлөгөөнд шилжүүлнэ.
```

---

## A1-014 fake-documents-warning

- 제목: 허위서류 불법 위험
- 카테고리: warning
- 출처 라벨: 국가법령정보센터
- 출처 URL: https://www.law.go.kr
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-01 ~ 없음
- 최종 확인일: 2026-07-01
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 1

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 허위서류 불법 위험

```
허위 잔고증명·허위 학력증명서·허위 재직증명서 제출은 출입국관리법 위반으로 강제퇴거·입국금지(최장 10년) 대상입니다. 또한 사문서위조죄(형법 제231조)로 형사처벌 대상입니다. KAXI는 허위서류 작성·제공을 요청하는 사용자에게 서비스를 제공하지 않으며, 합법적 준비 경로를 안내합니다.
```

### EN — Fake documents illegal risk

```
Fake bank statements, fake diplomas = deportation + entry ban up to 10 years. Criminal liability under criminal code. Platform refuses, guides to legal preparation.
```

### VI — Rủi ro hồ sơ giả

```
Không được dùng sổ tiết kiệm giả, chứng minh tài chính giả, bằng giả hoặc giấy chứng nhận giả để xin visa. Hồ sơ giả có thể dẫn đến trục xuất, cấm nhập cảnh tới 10 năm và trách nhiệm hình sự theo luật. Nền tảng từ chối yêu cầu làm hoặc dùng hồ sơ giả, chỉ hướng dẫn chuẩn bị tài liệu hợp pháp.
```

### MN — Хуурамч баримтын хууль бус эрсдэл

```
Хуурамч банкны баримт, боловсролын гэрчилгээ = албадан гаргах + 10 жил хүртэл хориг. Эрүүгийн хариуцлага. Платформ татгалзаж, хууль ёсны замаар зааварлана.
```

---

## A1-015 illegal-employment-warning

- 제목: 불법취업·취업 매칭 위험
- 카테고리: warning
- 출처 라벨: 국가법령정보센터
- 출처 URL: https://www.law.go.kr
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-01 ~ 없음
- 최종 확인일: 2026-07-01
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 1

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 불법취업·취업 매칭 위험

```
미등록 유료직업소개사업은 직업안정법 제47조 위반으로 5년 이하 징역 또는 5천만원 이하 벌금 대상입니다. D-2/D-4 비자 소지자의 아르바이트는 별도 시간제취업허가(S-3)를 받아야 하며, 허가 없는 취업은 불법취업으로 강제퇴거 대상입니다. KAXI는 취업 매칭을 제공하지 않으며, 합법 취업은 고용노동부 고용허가제를 통해야 함을 안내합니다.
```

### EN — Illegal employment risk

```
Unregistered job matching = up to 5yr prison or 50M KRW fine. D-2/D-4 part-time work needs S-3 permit. Without = illegal work → deportation. Platform provides no job matching.
```

### VI — Rủi ro việc làm bất hợp pháp

```
Giới thiệu việc làm không đăng ký = phạt 5 năm tù hoặc 50 triệu KRW. D-2/D-4 muốn làm thêm cần giấy phép (S-3). Không phép = trục xuất. Nền tảng không ghép việc làm.
```

### MN — Хууль бус ажлын эрсдэл

```
Бүртгэлгүй ажлын байрны зуучлал = 5 жил хүртэл хорих эсвэл 50 сая KRW торгууль. D-2/D-4 ажиллахын тулд тусгай зөвшөөрөл (S-3) хэрэгтэй. Платформ ажил холбохгүй.
```

---

## A1-016 administrative-scrivener

- 제목: 행정사 업무 영역
- 카테고리: legal
- 출처 라벨: 국가법령정보센터
- 출처 URL: https://www.law.go.kr
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-01 ~ 없음
- 최종 확인일: 2026-07-01
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 1

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 행정사 업무 영역

```
행정사법 제2조에 따라 행정사는 행정기관 제출 서류 작성, 권리·의무나 사실증명 서류 작성, 작성된 서류의 제출 대행 등을 업무로 합니다. 비자 신청서 작성, 출입국 제출서류 작성, 체류자격 변경 신청 대행은 행정사 영역입니다. KAXI는 일반 안내만 제공하며, 개별 비자 판단·서류 작성·제출 대행은 행정사 파트너에게 위탁합니다.
```

### EN — Administrative scrivener scope

```
Per Admin Scrivener Act Art. 2, admin lawyers prepare administrative documents and submit on behalf. Visa applications, stay status changes need admin lawyer. Platform provides general guidance only.
```

### VI — Lĩnh vực luật sư hành chính

```
Theo luật hành chính, luật sư hành chính được phép soạn hồ sơ nộp cơ quan, đại diện nộp. Visa, thay đổi tư cách lưu trú → cần luật sư. Nền tảng chỉ hướng dẫn chung.
```

### MN — Зөвлөгөөний талбар

```
Зөвлөгөөний хуулиар албан баримт бэлтгэх, төлөөлөн гаргах эрхтэй. Виз, байршил өөрчлөх → зөвлөгөө шаардлагатай. Платформ ерөнхий заавар өгнө.
```

---

## A1-017 after-arrival

- 제목: 입국 후 의무 절차
- 카테고리: process
- 출처 라벨: 법무부 출입국외국인정책본부
- 출처 URL: https://www.immigration.go.kr
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-01-01 ~ 없음
- 최종 확인일: 2026-07-01
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 1

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 입국 후 의무 절차

```
외국인 유학생은 입국 후 90일 이내 외국인등록을 해야 합니다. 등록시 여권·표준입학허가서·증명사진·수수료 30,000원이 필요합니다. 건강보험 가입은 의무이며 월 35,000~70,000원입니다. 은행 계좌 개설시 외국인등록증·여권·주소 증빙이 필요합니다. 통신 가입은 외국인등록증 또는 여권+입국사실증명으로 가능합니다.
```

### EN — Mandatory procedures after arrival

```
Within 90 days of arrival, register for ARC. Requires: passport, admission letter, photo, 30,000 KRW fee. Health insurance mandatory (35-70K/month). Bank account needs ARC, passport, address proof.
```

### VI — Thủ tục bắt buộc sau nhập cảnh

```
Sau nhập cảnh, đăng ký người nước ngoài trong 90 ngày. Cần: hộ chiếu, giấy nhập học, ảnh, phí 30,000 KRW. Bắt buộc bảo hiểm y tế 35-70k/tháng. Mở tài khoản cần ARC, hộ chiếu, địa chỉ.
```

### MN — Орсны дараах заавал хийх ажил

```
Орсны дараа 90 хоногийн дотор гадаадын иргэний бүртгэл хийх. Пасспорт, элсэлтийн зөвшөөрөл, зураг, 30,000 KRW. Эрүүл мэндийн даатгал заавал. Банкны данс нээхэд ARC шаардлагатай.
```

---

## A1-018 immigration-law-recent-promulgations

- 제목: 출입국관리법 최근공포·시행일자 감시
- 카테고리: legal
- 출처 라벨: 국가법령정보센터 · 최근공포법령
- 출처 URL: https://www.law.go.kr/LSW/nwRvsLsPop.do?chrIdx=10&cptOfi=&lsKndCd=&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95&p_epubdt=&p_epubno=&p_spubdt=&p_spubno=&searchType=lsNm&sortIdx=0
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 출입국관리법 최근공포·시행일자 감시

```
KAXI는 국가법령정보센터의 최근공포법령과 본문을 함께 감시합니다. 2026-07-02 확인 기준 출입국관리법은 2025-07-22 일부개정·2026-01-23 시행본, 출입국관리법 시행규칙은 2026-01-23 시행본, 출입국관리법 시행령은 2025-05-27 시행본을 기준으로 봅니다. 최근공포/시행예정 항목에 새 법률·시행령·시행규칙이 보이면 자동 크롤러는 production RAG를 직접 바꾸지 않고 PENDING 후보와 영향 rule/user 목록을 생성해야 합니다.
```

### EN — Immigration law promulgation and effective-date monitor

```
KAXI monitors both the National Law Information Center's recent-promulgation list and current statutory text. As checked on 2026-07-02, the Immigration Act basis is the 2026-01-23 effective text, the Enforcement Rule is the 2026-01-23 effective text, and the Enforcement Decree is the 2025-05-27 effective text. New promulgations or effective dates must create PENDING candidates and impact lists, not direct production RAG changes.
```

### VI — Theo dõi luật xuất nhập cảnh mới ban hành/ngày hiệu lực

```
KAXI theo dõi đồng thời danh sách luật mới ban hành và văn bản hiện hành trên cổng luật quốc gia. Tại thời điểm kiểm tra 2026-07-02, căn cứ là Luật quản lý xuất nhập cảnh hiệu lực 2026-01-23, Quy tắc thi hành hiệu lực 2026-01-23 và Nghị định thi hành hiệu lực 2025-05-27. Nếu có văn bản mới hoặc ngày hiệu lực mới, crawler chỉ tạo ứng viên PENDING và danh sách rule/người dùng bị ảnh hưởng.
```

### MN — Цагаачлалын хуулийн шинэчлэл ба хүчинтэй огноо хянах

```
KAXI нь үндэсний хууль мэдээллийн төвийн шинэчлэгдсэн хууль болон хүчинтэй эхийг хамтад нь хянадаг. 2026-07-02-ны шалгалтаар Цагаачлалын хууль 2026-01-23, хэрэгжүүлэх дүрэм 2026-01-23, хэрэгжүүлэх журам 2025-05-27 хүчинтэй эхийг суурь болгож байна. Шинэ хүчинтэй огноо илэрвэл crawler нь production RAG-г шууд өөрчлөхгүй, PENDING нэр дэвшигч ба нөлөөлөх rule/user жагсаалт үүсгэнэ.
```

---

## A1-019 immigration-decree-current-text

- 제목: 출입국관리법 시행령 최신 본문 감시
- 카테고리: legal
- 출처 라벨: 국가법령정보센터 · 출입국관리법 시행령
- 출처 URL: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=271319
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2025-05-27 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 출입국관리법 시행령 최신 본문 감시

```
출입국관리법 시행령은 체류자격 분류와 세부 활동 범위를 정하는 2순위 법령 근거입니다. 법률 조문만으로 답하기 어려운 D-2, D-4, D-10, E-7, F-2, F-5 체류자격의 범위는 시행령 본문과 별표 1의2를 함께 확인해야 합니다. 시행령 개정은 서류 체크리스트보다 먼저 compliance rule과 답변 근거에 반영되어야 하며, 하이코리아 매뉴얼이 아직 갱신되지 않았더라도 법령 기준을 우선합니다.
```

### EN — Current Enforcement Decree text monitor

```
The Enforcement Decree is the second-level legal basis for stay-status classes and activity scopes. D-2, D-4, D-10, E-7, F-2, and F-5 questions require both the decree text and Table 1-2. Decree changes should trigger compliance-rule and answer-basis review before operational checklists.
```

### VI — Theo dõi văn bản Nghị định thi hành mới nhất

```
Nghị định thi hành là căn cứ pháp lý cấp 2 cho phân loại tư cách lưu trú và phạm vi hoạt động. Với D-2, D-4, D-10, E-7, F-2, F-5, cần kiểm tra cả văn bản nghị định và Bảng 1-2. Khi nghị định thay đổi, rule và căn cứ trả lời phải được rà soát trước checklist vận hành.
```

### MN — Хэрэгжүүлэх журмын одоогийн эхийг хянах

```
Хэрэгжүүлэх журам нь оршин суух ангилал ба үйл ажиллагааны хүрээг тогтоох хоёр дахь шатны эрх зүйн эх сурвалж. D-2, D-4, D-10, E-7, F-2, F-5 ангиллыг журам болон Хүснэгт 1-2-той хамт шалгана. Журам өөрчлөгдвөл HiKorea гарын авлагаас түрүүлж rule болон хариултын суурьд тусгана.
```

---

## A1-020 immigration-law-interpretation-hierarchy

- 제목: 출입국·체류 답변의 법령 해석 순서
- 카테고리: legal
- 출처 라벨: 국가법령정보센터 · 출입국관리법
- 출처 URL: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 출입국·체류 답변의 법령 해석 순서

```
외국인 출입국·비자·체류 답변은 법률인 출입국관리법을 최상위 근거로 보고, 그 위임을 받은 출입국관리법 시행령의 체류자격 분류와 시행규칙의 제출서류·수수료를 차례로 확인해야 합니다. 하이코리아 안내, 비자 내비게이터, 체류자격별 매뉴얼은 행정 실무를 이해하는 보조 근거입니다. 법령과 안내가 충돌하거나 최신성이 불명확하면 법령과 관할 출입국외국인관서 확인을 우선하고, 개별 사례 판단은 행정사 검토로 연결합니다.
```

### EN — Legal hierarchy for immigration and stay-status answers

```
Immigration, visa, and stay-status answers must start from the Immigration Act, then apply the Enforcement Decree's stay-status classifications and the Enforcement Rule's document and fee rules. HiKorea, Visa Navigator, and status manuals are operational guidance. If guidance conflicts with law or freshness is unclear, prioritize law and competent immigration-office confirmation, and route case-specific judgment to an administrative scrivener.
```

### VI — Thứ tự giải thích pháp luật về xuất nhập cảnh/lưu trú

```
Câu trả lời về xuất nhập cảnh, visa và lưu trú phải đặt Luật Quản lý xuất nhập cảnh làm căn cứ cao nhất, sau đó kiểm tra phân loại tư cách lưu trú trong Nghị định thi hành và hồ sơ/phí trong Quy tắc thi hành. Hướng dẫn HiKorea, Visa Navigator và sổ tay theo tư cách lưu trú là căn cứ nghiệp vụ bổ trợ. Nếu có mâu thuẫn hoặc chưa chắc mới nhất, ưu tiên luật và xác nhận với cơ quan xuất nhập cảnh có thẩm quyền.
```

### MN — Цагаачлал, оршин суух асуудлын эрх зүйн тайлбарын дараалал

```
Гадаад иргэний хил нэвтрэх, виз, оршин суух асуултад эхлээд Цагаачлалын хяналтын тухай хуулийг, дараа нь хэрэгжүүлэх журам дахь ангилал, хэрэгжүүлэх дүрмийн материал/хураамжийг шалгана. HiKorea болон гарын авлага нь практик туслах эх сурвалж. Зөрчил эсвэл шинэчлэл тодорхойгүй бол хууль болон харьяа байгууллагын баталгааг түрүүнд үзнэ.
```

---

## A1-021 immigration-act-visa-passport-requirement

- 제목: 입국 시 여권·사증 원칙과 무사증 예외
- 카테고리: legal
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제7조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0007&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 입국 시 여권·사증 원칙과 무사증 예외

```
출입국관리법 제7조는 외국인이 한국에 입국할 때 유효한 여권과 법무부장관이 발급한 사증을 가지는 것을 원칙으로 둡니다. 예외적으로 재입국허가 또는 재입국허가 면제 기간 안의 재입국, 사증면제협정 대상자, 국제친선·관광·대한민국 이익 등을 위해 별도 입국허가를 받은 사람, 난민여행증명서 유효기간 내 재입국 등은 사증 없이 입국할 수 있습니다. 다만 사증면제협정은 공공질서나 국가이익상 필요할 때 일시 정지될 수 있으므로, KAXI는 무사증·B-1/B-2·K-ETA 상담에서 국적, 여권 유효기간, 재입국허가 여부, 협정 적용 정지 여부, 입국금지 사유를 함께 확인해야 합니다.
```

### EN — Passport and visa rule at entry, with visa-free exceptions

```
Immigration Act Article 7 sets the baseline rule that a foreign national entering Korea must hold a valid passport and a visa issued by the Minister of Justice. Exceptions can include re-entry within a re-entry permit or exemption period, visa-waiver treaty coverage, separate entry permission for international friendship, tourism, or Korean interests, and return with a valid refugee travel document. Visa-waiver treaty application can be suspended for public order or national interest, so KAXI should check nationality, passport validity, B-1/B-2 or K-ETA route, re-entry permit status, possible suspension, and entry-ban grounds together.
```

### VI — Nguyên tắc hộ chiếu, visa khi nhập cảnh và ngoại lệ miễn visa

```
Điều 7 của Luật Quản lý xuất nhập cảnh đặt nguyên tắc người nước ngoài khi nhập cảnh Hàn Quốc phải có hộ chiếu hợp lệ và visa do Bộ trưởng Tư pháp cấp. Ngoại lệ có thể gồm tái nhập cảnh trong thời hạn giấy phép hoặc miễn giấy phép tái nhập cảnh, đối tượng của hiệp định miễn visa, người được cấp phép nhập cảnh riêng vì hữu nghị quốc tế, du lịch hoặc lợi ích của Hàn Quốc, hoặc tái nhập cảnh bằng giấy thông hành tị nạn còn hiệu lực. Hiệp định miễn visa có thể bị tạm dừng vì trật tự công hoặc lợi ích quốc gia, nên KAXI phải kiểm tra quốc tịch, hộ chiếu, K-ETA/B-1/B-2, giấy phép tái nhập cảnh và rủi ro cấm nhập cảnh.
```

### MN — Нэвтрэх үед паспорт, визийн зарчим ба визгүй нэвтрэх онцгой тохиолдол

```
Цагаачлалын хуулийн 7 дугаар зүйлээр гадаад иргэн Солонгост нэвтрэхдээ хүчинтэй паспорт болон Хууль зүйн сайдын олгосон визтэй байх нь үндсэн зарчим. Харин дахин нэвтрэх зөвшөөрөлтэй буюу чөлөөлөлтийн хугацаанд дахин нэвтрэх, визгүй зорчих хэлэлцээрийн хамрах иргэн, олон улсын найрамдал/аялал/Солонгосын ашиг сонирхлын үүднээс тусгай нэвтрэх зөвшөөрөл авсан хүн, хүчинтэй дүрвэгчийн аяллын баримтаар дахин нэвтрэх зэрэг онцгой тохиолдол бий. KAXI визгүй, B-1/B-2, K-ETA зөвлөгөөнд иргэншил, паспорт, дахин нэвтрэх зөвшөөрөл, хэлэлцээр түр зогссон эсэх, нэвтрэх хоригийг хамтад нь шалгана.
```

---

## A1-022 immigration-act-visa-issuance-certificate

- 제목: 사증 종류와 사증발급인정서·초청인 대리신청
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제8조·제9조
- 출처 URL: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 사증 종류와 사증발급인정서·초청인 대리신청

```
출입국관리법 제8조는 사증을 1회 입국용 단수사증과 2회 이상 입국 가능한 복수사증으로 구분하고, 사증발급 기준과 절차는 법무부령에 위임합니다. 제9조는 법무부장관이 사증 발급 전에 필요하다고 인정하면 입국하려는 외국인의 신청으로 사증발급인정서를 발급할 수 있고, 그 외국인을 초청하려는 사람이 발급신청을 대리할 수 있다고 정합니다. D-2/D-4 표준입학허가, E-7 고용, E-8 계절근로, F-6 초청처럼 초청자·학교·고용주가 관여하는 사건에서는 사증발급인정서 대상 여부, 초청인의 대리 신청 권한, 재외공관 사증 신청 단계, 시행규칙상 첨부서류를 함께 확인해야 합니다.
```

### EN — Visa types and certificate for confirmation of visa issuance

```
Immigration Act Article 8 distinguishes single-entry visas from multiple-entry visas and delegates visa issuance criteria and procedures to Ministry of Justice rules. Article 9 allows a certificate for confirmation of visa issuance to be issued before visa issuance when the Minister of Justice considers it necessary, based on the foreign national's application, and the person intending to invite that foreign national may apply on their behalf. For D-2/D-4 admissions, E-7 employment, E-8 seasonal work, F-6 invitations, or other sponsor-driven matters, KAXI should check whether a certificate route applies, whether the inviter can apply on behalf of the applicant, the overseas mission visa step, and Enforcement Rule attachments.
```

### VI — Loại visa, giấy xác nhận cấp visa và việc người mời nộp thay

```
Điều 8 phân biệt visa một lần và visa nhiều lần, đồng thời giao tiêu chuẩn và thủ tục cấp visa cho Quy tắc thi hành của Bộ Tư pháp. Điều 9 cho phép Bộ trưởng Tư pháp cấp giấy xác nhận cấp visa trước khi cấp visa khi thấy cần thiết, theo đơn của người nước ngoài muốn nhập cảnh; người dự định mời người nước ngoài có thể nộp thay. Với D-2/D-4, E-7, E-8, F-6 hoặc hồ sơ có trường, chủ sử dụng lao động hay người mời, KAXI phải kiểm tra đối tượng cấp giấy xác nhận, quyền nộp thay của người mời, bước nộp tại cơ quan đại diện ở nước ngoài và hồ sơ theo Quy tắc thi hành.
```

### MN — Визийн төрөл, виз олгох зөвшөөрлийн бичиг ба уригчийн төлөөлөн мэдүүлэх

```
8 дугаар зүйл нь нэг удаагийн виз ба олон удаагийн визийг ялгаж, виз олгох шалгуур, журмыг Хууль зүйн яамны дүрэмд даалгана. 9 дүгээр зүйлээр Хууль зүйн сайд шаардлагатай гэж үзвэл нэвтрэх гэж буй гадаад иргэний хүсэлтээр виз олгох зөвшөөрлийн бичиг гаргаж болох ба тухайн хүнийг урих этгээд хүсэлтийг төлөөлөн гаргаж болно. D-2/D-4, E-7, E-8, F-6 зэрэг сургууль, ажил олгогч, уригч оролцсон хэрэгт KAXI зөвшөөрлийн бичиг шаардлагатай эсэх, уригчийн төлөөлөх эрх, гадаад дахь консулын визийн шат, хавсаргах материалыг шалгана.
```

---

## A1-023 immigration-act-stay-status-scope

- 제목: 체류자격과 활동범위의 기본 법리
- 카테고리: legal
- 출처 라벨: 국가법령정보센터 · 출입국관리법
- 출처 URL: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 체류자격과 활동범위의 기본 법리

```
출입국관리법 체계에서 외국인은 체류자격을 가져야 하고, 대한민국 체류 중에는 그 체류자격과 체류기간의 범위 안에서 활동해야 합니다. 따라서 D-2, D-4, D-10, E-7, F-2, F-5 같은 기호는 단순한 명칭이 아니라 허용 활동과 체류관리 판단의 출발점입니다. 답변은 먼저 현재 체류자격, 목표 활동, 체류기간 만료일, 등록 여부를 확인한 뒤 법령상 허용 범위와 별도 허가 필요성을 구분해야 합니다.
```

### EN — Core rule: stay status and permitted activity scope

```
Under the Immigration Act system, a foreign national must hold a stay status and act only within the permitted status and period. Codes like D-2, D-4, D-10, E-7, F-2, and F-5 are not mere labels; they define the starting point for permitted activities and stay management. Answers must first identify current status, target activity, expiry date, and registration status.
```

### VI — Nguyên tắc pháp lý về tư cách lưu trú và phạm vi hoạt động

```
Theo hệ thống Luật Quản lý xuất nhập cảnh, người nước ngoài phải có tư cách lưu trú và chỉ được hoạt động trong phạm vi tư cách và thời hạn được cho phép. Vì vậy D-2, D-4, D-10, E-7, F-2, F-5 không chỉ là tên visa mà là điểm bắt đầu để xác định hoạt động được phép. Cần hỏi tư cách hiện tại, hoạt động muốn làm, ngày hết hạn và tình trạng đăng ký trước khi trả lời.
```

### MN — Оршин суух ангилал ба үйл ажиллагааны хүрээний үндсэн зарчим

```
Цагаачлалын хуулийн тогтолцоонд гадаад иргэн оршин суух ангилалтай байх бөгөөд зөвшөөрөгдсөн ангилал, хугацааны хүрээнд үйл ажиллагаа явуулна. D-2, D-4, D-10, E-7, F-2, F-5 нь зөвшөөрөгдөх үйл ажиллагааг тогтоох эхлэл. Хариулт өгөхөөс өмнө одоогийн ангилал, хийх үйл ажиллагаа, дуусах огноо, бүртгэлийг шалгана.
```

---

## A1-024 immigration-act-general-stay-status

- 제목: 일반체류자격의 단기·장기 구분
- 카테고리: legal
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제10조의2
- 출처 URL: https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000817596
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 일반체류자격의 단기·장기 구분

```
출입국관리법 제10조의2는 일반체류자격을 단기체류자격과 장기체류자격으로 나눕니다. 단기체류자격은 관광·방문 등의 목적으로 원칙적으로 90일 이하 머무는 체류자격이고, 장기체류자격은 유학, 연수, 투자, 주재, 결혼 등의 목적으로 90일을 초과하여 법무부령상 체류기간 상한 범위에서 거주할 수 있는 체류자격입니다. 따라서 KAXI는 C-3 같은 단기방문과 D-2, D-4, D-10, E-7, F-2 같은 장기체류자격을 답변 초반에 분리하고, 90일 기준·활동 목적·시행령 별표상 해당성을 함께 확인해야 합니다.
```

### EN — Short-term and long-term ordinary stay statuses

```
Article 10-2 divides ordinary stay status into short-term and long-term status. Short-term status covers tourism, visits, and similar purposes for, in principle, 90 days or less. Long-term status covers study, training, investment, assignment, marriage, and similar purposes for more than 90 days within the maximum stay period set by Ministry of Justice rules. KAXI should separate C-3 short-term questions from D-2, D-4, D-10, E-7, and F-2 long-term questions, then check the 90-day threshold, activity purpose, and applicable Enforcement Decree table.
```

### VI — Phân biệt tư cách lưu trú thông thường ngắn hạn và dài hạn

```
Điều 10-2 chia tư cách lưu trú thông thường thành ngắn hạn và dài hạn. Tư cách ngắn hạn là lưu trú cho mục đích du lịch, thăm thân hoặc tương tự, về nguyên tắc không quá 90 ngày. Tư cách dài hạn là lưu trú quá 90 ngày cho mục đích học tập, đào tạo, đầu tư, phái cử, hôn nhân hoặc tương tự trong giới hạn thời hạn do Quy tắc của Bộ Tư pháp quy định. KAXI phải tách rõ C-3 ngắn hạn với D-2, D-4, D-10, E-7, F-2 dài hạn, rồi kiểm tra mốc 90 ngày, mục đích hoạt động và bảng tư cách trong Nghị định.
```

### MN — Ердийн оршин суух ангиллын богино ба урт хугацааны ялгаа

```
10-2 дугаар зүйл нь ердийн оршин суух ангиллыг богино хугацааны болон урт хугацааны ангилалд хуваадаг. Богино хугацаа нь аялал, айлчлал зэрэг зорилгоор зарчмаар 90 хоногоос ихгүй байх ангилал. Урт хугацаа нь суралцах, дадлага, хөрөнгө оруулалт, томилолт, гэрлэлт зэрэг зорилгоор 90 хоногоос дээш, Хууль зүйн яамны дүрэмд заасан дээд хугацааны хүрээнд оршин суух ангилал. KAXI C-3 богино хугацаа ба D-2, D-4, D-10, E-7, F-2 урт хугацааг ялгаж, 90 хоног, зорилго, журам дахь хүснэгтийг шалгана.
```

---

## A1-025 immigration-act-permanent-residence-status

- 제목: 영주자격(F-5)의 법률상 기본요건
- 카테고리: legal
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제10조의3
- 출처 URL: https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000817607
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 영주자격(F-5)의 법률상 기본요건

```
출입국관리법 제10조의3은 영주자격을 대한민국에 영주할 수 있는 체류자격으로 두고, 활동범위와 체류기간 제한을 받지 않는다고 봅니다. 일반적인 영주 신청은 대한민국 법령 준수 등 품행 단정, 본인 또는 생계가 같은 가족의 소득·재산 등에 따른 생계유지능력, 한국어능력과 한국사회·문화 이해 등 기본소양, 대통령령상 기간 이상 체류요건을 함께 확인해야 합니다. 다만 난민인정자, 특별공로자, 인도적 체류허가자 등은 일부 요건을 완화·면제받을 수 있으므로 F-5 상담은 시행령 별표 1의3, 고시, 범죄·체납·체류이력까지 같이 검토해야 합니다.
```

### EN — Statutory baseline for Permanent Residence (F-5)

```
Article 10-3 defines permanent residence as a status allowing a foreign national to reside permanently in Korea without the ordinary limits on activity scope and stay period. A standard F-5 review checks good conduct, including compliance with Korean laws; livelihood ability based on the applicant's or same-household family's income or assets; basic knowledge such as Korean language and understanding of Korean society and culture; and the stay-period requirement prescribed by Presidential Decree. Refugees, specially meritorious persons, and humanitarian stay holders may receive exemptions or relaxed requirements, so F-5 advice must also review Enforcement Decree Table 1-3, notices, criminal history, arrears, and stay history.
```

### VI — Điều kiện pháp luật cơ bản của thường trú F-5

```
Điều 10-3 đặt F-5 là tư cách thường trú cho phép cư trú lâu dài tại Hàn Quốc, không bị giới hạn về phạm vi hoạt động và thời hạn lưu trú như các tư cách thông thường. Hồ sơ thường trú thông thường phải kiểm tra phẩm hạnh như tuân thủ pháp luật Hàn Quốc, năng lực sinh kế theo thu nhập/tài sản của bản thân hoặc gia đình cùng sinh kế, kiến thức cơ bản như tiếng Hàn và hiểu biết xã hội-văn hóa Hàn Quốc, cùng thời gian lưu trú theo Nghị định. Người được công nhận tị nạn, người có công đặc biệt hoặc người được cho lưu trú nhân đạo có thể được miễn hoặc nới một số điều kiện, nên tư vấn F-5 phải kiểm tra Bảng 1-3, thông báo, tiền án, nợ và lịch sử lưu trú.
```

### MN — F-5 байнгын оршин суух эрхийн хуулийн үндсэн нөхцөл

```
10-3 дугаар зүйл нь F-5 байнгын оршин суух эрхийг Солонгост байнга оршин суух ангилал гэж тогтоож, ердийн үйл ажиллагаа ба хугацааны хязгаарлалтад хамаарахгүй гэж үздэг. Ердийн F-5 хүсэлтэд Солонгосын хууль сахих зэрэг зан төлөв, өөрийн эсвэл нэг амьжиргаатай гэр бүлийн орлого/хөрөнгөөс шалтгаалсан амьжиргааны чадвар, солонгос хэл ба нийгэм-соёлын үндсэн мэдлэг, журамд заасан хугацаагаар оршин суусан эсэхийг хамт шалгана. Дүрвэгч, онцгой гавьяатай хүн, хүмүүнлэг оршин суух зөвшөөрөлтэй хүн зарим нөхцөлөөс чөлөөлөгдөж болох тул F-5 зөвлөгөөнд Хүснэгт 1-3, зарлал, гэмт хэрэг, өр, оршин суух түүхийг хамт үзнэ.
```

---

## A1-026 immigration-act-entry-ban

- 제목: 입국금지·입국거부 위험 사유
- 카테고리: warning
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제11조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0011&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 입국금지·입국거부 위험 사유

```
출입국관리법 제11조는 법무부장관이 특정 외국인에 대해 입국을 금지하거나 거부할 수 있는 위험 사유를 둡니다. 공중위생상 위해, 공공의 안전·대한민국의 이익 침해 우려, 경제질서·사회질서·선량한 풍속 침해 우려, 국내체류비용 부담 능력 부족, 강제퇴거명령으로 출국 후 일정 기간이 지나지 않은 경우 등이 입국 단계의 핵심 리스크입니다. KAXI는 비자 발급 가능성이나 입국 가능성을 단정하지 않고, 과거 강제퇴거·출국명령·범죄·감염병·체류비용·초청 경위가 있으면 관할 재외공관 또는 출입국외국인관서 확인과 행정사 검토를 우선 안내해야 합니다.
```

### EN — Grounds for entry ban or refusal

```
Immigration Act Article 11 sets entry-ban and entry-refusal risk grounds. Key issues include public-health risk, risk to public safety or Korean interests, risk to economic or social order or good morals, inability to bear stay costs, and insufficient time after departure under a deportation order. KAXI must not guarantee entry or visa issuance; where there is prior deportation, departure order, criminal history, infectious-disease issue, funding weakness, or invitation concern, the answer should route to the competent mission or immigration office and administrative-scrivener review.
```

### VI — Căn cứ cấm hoặc từ chối nhập cảnh

```
Điều 11 của Luật Quản lý xuất nhập cảnh đặt các căn cứ mà Bộ trưởng Tư pháp có thể cấm hoặc từ chối nhập cảnh. Rủi ro gồm nguy hại y tế công cộng, nguy cơ xâm hại an toàn công cộng hoặc lợi ích của Hàn Quốc, trật tự kinh tế/xã hội hoặc thuần phong mỹ tục, không đủ khả năng chi trả chi phí lưu trú, hoặc chưa đủ thời gian sau khi rời Hàn Quốc theo lệnh trục xuất. KAXI không được bảo đảm khả năng nhập cảnh; nếu có tiền sử trục xuất, lệnh xuất cảnh, án tích, bệnh truyền nhiễm, thiếu tài chính hoặc nghi vấn về thư mời, cần hướng dẫn kiểm tra với cơ quan có thẩm quyền và chuyên gia hành chính.
```

### MN — Нэвтрэхийг хориглох эсвэл татгалзах үндэслэл

```
Цагаачлалын хуулийн 11 дүгээр зүйл нь Хууль зүйн сайд тодорхой гадаад иргэнийг нэвтрүүлэхийг хориглох эсвэл татгалзах үндэслэлийг тогтоодог. Нийтийн эрүүл мэнд, нийтийн аюулгүй байдал эсвэл Солонгосын ашиг сонирхолд хор учруулах эрсдэл, эдийн засаг/нийгмийн дэг журам, оршин суух зардал даах чадваргүй байдал, албадан гаргаснаас хойш шаардлагатай хугацаа өнгөрөөгүй байдал зэрэг нь гол эрсдэл. KAXI нэвтрэх боломжийг батлахгүй, өмнөх албадан гаргалт, гарах тушаал, гэмт хэрэг, өвчин, санхүү, урилга зэрэгт эрх бүхий байгууллага ба мэргэжилтний шалгалтыг зөвлөнө.
```

---

## A1-027 immigration-act-entry-inspection

- 제목: 입국심사의 여권·사증·목적·체류기간 요건
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제12조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0012&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 입국심사의 여권·사증·목적·체류기간 요건

```
출입국관리법 제12조는 외국인이 입국할 때 여권과 입국신고서를 제출해 입국심사를 받고, 유효한 여권·필요한 사증 또는 사전여행허가, 체류자격에 맞는 입국목적, 법무부령상 체류기간, 입국금지·거부 대상 아님을 확인받는 구조를 둡니다. KAXI는 C-3, K-ETA, D-2/D-4 입국 상담에서 사증 소지 여부만 보지 말고, 실제 입국목적과 체류자격의 일치, 왕복항공권·숙소·재정자료, 입국금지 사유, 전자입국신고 또는 K-ETA 적용 여부를 함께 확인해야 합니다.
```

### EN — Entry inspection: passport, visa, purpose, and stay-period checks

```
Immigration Act Article 12 makes entry permission depend on inspection of passport and entry declaration, valid passport and required visa or electronic travel authorization, purpose matching the stay status, stay period under Ministry of Justice rules, and absence of entry-ban grounds. For C-3, K-ETA, D-2, or D-4 entry questions, KAXI should check actual purpose, status fit, return ticket, address, funding, entry-ban risk, and electronic arrival/K-ETA requirements rather than treating visa possession as enough.
```

### VI — Điều kiện kiểm tra nhập cảnh về hộ chiếu, visa, mục đích và thời hạn

```
Điều 12 quy định người nước ngoài khi nhập cảnh phải qua kiểm tra nhập cảnh và chứng minh hộ chiếu, visa hoặc giấy phép du lịch điện tử khi cần, mục đích nhập cảnh phù hợp với tư cách lưu trú, thời hạn lưu trú theo quy định và không thuộc diện cấm/từ chối nhập cảnh. Khi tư vấn C-3, K-ETA, D-2/D-4, KAXI phải kiểm tra không chỉ visa mà còn mục đích thực tế, tài liệu vé/địa chỉ/tài chính, rủi ro cấm nhập cảnh và yêu cầu khai báo nhập cảnh điện tử hoặc K-ETA.
```

### MN — Нэвтрэх шалгалтын паспорт, виз, зорилго, хугацааны нөхцөл

```
12 дугаар зүйл нь гадаад иргэн нэвтрэхдээ паспорт ба нэвтрэх мэдүүлгээ өгч шалгуулан, шаардлагатай виз/цахим аяллын зөвшөөрөл, зорилго нь оршин суух ангилалтай нийцэх эсэх, хугацаа, нэвтрэх хориггүй эсэхийг батлах бүтэцтэй. KAXI C-3, K-ETA, D-2/D-4 зөвлөгөөнд зөвхөн виз байгаа эсэхээс гадна бодит зорилго, буцах тасалбар/байр/санхүү, нэвтрэх хориг, цахим мэдүүлгийг шалгана.
```

---

## A1-028 immigration-decree-long-term-status-table

- 제목: 시행령 별표상 장기체류자격 분류
- 카테고리: legal
- 출처 라벨: 국가법령정보센터 · 출입국관리법 시행령
- 출처 URL: https://www.law.go.kr/flDownload.do?flNm=%5B%EB%B3%84%ED%91%9C+1%EC%9D%982%5D+%EC%9E%A5%EA%B8%B0%EC%B2%B4%EB%A5%98%EC%9E%90%EA%B2%A9%28%EC%A0%9C12%EC%A1%B0+%EA%B4%80%EB%A0%A8%29%0A&flSeq=53439589
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 시행령 별표상 장기체류자격 분류

```
출입국관리법 시행령 제12조 관련 별표는 장기체류자격의 사람 또는 활동범위를 정합니다. 유학(D-2)은 전문대학 이상 교육기관 또는 학술연구기관의 정규과정 교육·특정 연구, 일반연수(D-4)는 법무부장관이 정하는 요건의 교육·연수·연구활동, 구직(D-10)은 E계열 취업 분야의 구직·연수 또는 창업 준비, 특정활동(E-7)은 공공기관·민간단체 등과의 계약에 따른 법무부장관 지정 활동으로 해석합니다. F-2, F-5는 거주·영주 영역으로 별도 세부 요건과 심사기준 확인이 필요합니다.
```

### EN — Long-term stay-status classifications under the Enforcement Decree

```
The Enforcement Decree table linked to Article 12 defines long-term stay statuses by eligible person or activity scope. D-2 covers degree study or specific research at higher-education or research institutions; D-4 covers training, education, or research under Ministry of Justice conditions; D-10 covers job seeking/training for E-series fields or startup preparation; E-7 covers activities specially designated by the Minister of Justice under contract. F-2 and F-5 require separate residence/permanent-residence criteria.
```

### VI — Phân loại tư cách lưu trú dài hạn trong phụ lục nghị định

```
Phụ lục liên quan Điều 12 của Nghị định thi hành quy định đối tượng hoặc phạm vi hoạt động của tư cách lưu trú dài hạn. D-2 là học chính quy/nghiên cứu tại cơ sở từ cao đẳng trở lên hoặc viện nghiên cứu; D-4 là đào tạo/nghiên cứu tại cơ sở đáp ứng điều kiện do Bộ trưởng Tư pháp quy định; D-10 là tìm việc/đào tạo trong lĩnh vực E hoặc chuẩn bị khởi nghiệp; E-7 là hoạt động được Bộ trưởng Tư pháp chỉ định theo hợp đồng. F-2/F-5 cần kiểm tra điều kiện riêng.
```

### MN — Хэрэгжүүлэх журмын урт хугацааны оршин суух ангилал

```
Хэрэгжүүлэх журмын 12 дугаар зүйлтэй холбоотой хавсралт нь урт хугацааны оршин суух ангиллын хүн ба үйл ажиллагааг тогтоодог. D-2 нь дээд боловсрол/судалгааны байгууллагын үндсэн сургалт, D-4 нь Хууль зүйн сайдын тогтоосон нөхцөлтэй сургалт/дадлага/судалгаа, D-10 нь E ангиллын ажил хайх эсвэл стартап бэлтгэл, E-7 нь гэрээний үндсэн дээр сайдын тусгайлан заасан үйл ажиллагаа. F-2/F-5 нь тусдаа нарийвчилсан шалгууртай.
```

---

## A1-029 immigration-decree-short-term-status-table

- 제목: 시행령 별표상 단기체류자격 분류
- 카테고리: legal
- 출처 라벨: 국가법령정보센터 · 출입국관리법 시행령 별표 1
- 출처 URL: https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsiSeq=271319&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95+%EC%8B%9C%ED%96%89%EB%A0%B9&bylNo=0001&bylBrNo=00&bylCls=BE&bylEfYd=20250601&bylEfYdYn=Y
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2025-06-01 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 시행령 별표상 단기체류자격 분류

```
출입국관리법 시행령 제12조 관련 별표 1은 단기체류자격의 사람 또는 활동범위를 정합니다. 2026-07-02 확인 기준 단기체류자격은 사증면제(B-1), 관광·통과(B-2), 일시취재(C-1), 단기방문(C-3), 단기취업(C-4) 등으로 구성됩니다. 단기방문(C-3)은 시장조사, 업무 연락, 상담, 계약 등 상용활동과 관광, 통과, 요양, 친지 방문, 행사·회의 참가 등 90일을 넘지 않는 체류를 전제로 하며 영리 목적자는 제외됩니다. 단기취업(C-4)은 일시 흥행, 광고·패션 모델, 강의·강연, 연구, 기술지도 등 단기 수익활동에 연결될 수 있으므로 C-3와 혼동하면 불법취업 위험이 생깁니다.
```

### EN — Short-term stay-status classifications under the Enforcement Decree

```
Table 1 linked to Article 12 of the Enforcement Decree defines short-term stay statuses by eligible person or activity scope. As checked on 2026-07-02, it includes Visa Waiver (B-1), Tourist/Transit (B-2), Temporary News Coverage (C-1), Short-Term Visit (C-3), and Short-Term Employment (C-4). C-3 covers non-profit short stays under 90 days such as market research, business contact, consultation, contract discussion, tourism, transit, medical stay, family visit, events, or meetings; profit-making activity is excluded. C-4 can cover short-term paid activity such as performance, modeling, lectures, research, or technical guidance, so confusing C-3 and C-4 creates illegal-work risk.
```

### VI — Phân loại tư cách lưu trú ngắn hạn trong phụ lục nghị định

```
Phụ lục 1 liên quan Điều 12 của Nghị định thi hành quy định phạm vi người hoặc hoạt động của tư cách lưu trú ngắn hạn. Kiểm tra ngày 2026-07-02, nhóm này gồm miễn visa B-1, du lịch/quá cảnh B-2, báo chí ngắn hạn C-1, thăm ngắn hạn C-3 và làm việc ngắn hạn C-4. C-3 dành cho hoạt động thương mại không sinh lợi trực tiếp, du lịch, quá cảnh, thăm thân, hội nghị hoặc sự kiện dưới 90 ngày; người có mục đích kiếm lợi không thuộc phạm vi này. C-4 có thể áp dụng cho hoạt động có thu nhập ngắn hạn như biểu diễn, người mẫu, giảng dạy, nghiên cứu hoặc hướng dẫn kỹ thuật.
```

### MN — Хэрэгжүүлэх журмын богино хугацааны оршин суух ангилал

```
Хэрэгжүүлэх журмын 12 дугаар зүйлтэй холбоотой 1 дүгээр хавсралт нь богино хугацааны оршин суух ангиллын хүн ба үйл ажиллагааг тогтоодог. 2026-07-02-ны шалгалтаар B-1 визээс чөлөөлөгдөх, B-2 аялал/дамжин өнгөрөх, C-1 түр сурвалжлага, C-3 богино хугацааны айлчлал, C-4 богино хугацааны ажил зэрэг орно. C-3 нь 90 хоногоос ихгүй худалдааны холбоо, аялал, дамжин өнгөрөх, төрөл садангийн айлчлал, арга хэмжээ/хуралд оролцох зэрэгт зориулагдаж, ашиг олох зорилготой хүнийг хамруулахгүй. C-4 нь богино хугацааны орлоготой ажилд холбогдож болно.
```

---

## A1-030 immigration-decree-permanent-residence-table

- 제목: 시행령 별표상 영주(F-5) 자격 범위
- 카테고리: legal
- 출처 라벨: 국가법령정보센터 · 출입국관리법 시행령 별표 1의3
- 출처 URL: https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsiSeq=271319&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95+%EC%8B%9C%ED%96%89%EB%A0%B9&bylNo=0001&bylBrNo=03&bylCls=BE&bylEfYd=20250601&bylEfYdYn=Y
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2025-06-01 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 시행령 별표상 영주(F-5) 자격 범위

```
출입국관리법 시행령 제12조의2 관련 별표 1의3은 영주(F-5) 자격에 부합하는 사람의 범위를 정합니다. 2026-07-02 확인 기준 별표 1의3은 법 제46조제1항 각 호의 강제퇴거 사유에 해당하지 않는 사람 중 일정 요건을 충족한 사람을 대상으로 합니다. 대표적으로 성년으로서 주재(D-7)부터 특정활동(E-7)까지 또는 거주(F-2) 자격으로 5년 이상 체류한 사람, 국민 또는 영주(F-5)자의 배우자·미성년 자녀로 일정 기간 체류한 사람 등이 포함될 수 있습니다. F-5 상담은 별표 1의3만으로 끝나지 않고 품행, 생계유지, 기본소양, 범죄·체류 이력, 고시·세부지침을 함께 확인해야 합니다.
```

### EN — Permanent residence (F-5) scope under the Enforcement Decree

```
Table 1-3 linked to Article 12-2 of the Enforcement Decree defines who fits Permanent Residence (F-5). As checked on 2026-07-02, a person must first not fall under Immigration Act Article 46(1) deportation grounds and must satisfy one of the listed eligibility paths. Examples include adults who have stayed for at least five years under D-7 through E-7 or F-2, and spouses or minor children of Korean nationals or F-5 holders after a required stay period. F-5 advice must also check conduct, livelihood, basic knowledge, criminal and stay history, notices, and detailed guidance.
```

### VI — Phạm vi tư cách thường trú F-5 trong phụ lục nghị định

```
Phụ lục 1-3 liên quan Điều 12-2 của Nghị định thi hành quy định phạm vi người phù hợp với thường trú F-5. Kiểm tra ngày 2026-07-02, đối tượng trước hết không thuộc các lý do cưỡng chế trục xuất tại Điều 46 khoản 1 của Luật và phải đáp ứng điều kiện cụ thể. Ví dụ có thể gồm người trưởng thành lưu trú từ 5 năm trở lên bằng các tư cách D-7 đến E-7 hoặc F-2, hoặc vợ/chồng/con chưa thành niên của công dân Hàn Quốc hoặc người F-5 sau thời gian lưu trú nhất định. Tư vấn F-5 còn phải kiểm tra phẩm hạnh, sinh kế, kiến thức cơ bản, tiền án/lịch sử lưu trú và thông báo/hướng dẫn chi tiết.
```

### MN — Хэрэгжүүлэх журмын F-5 байнгын оршин суух хүрээ

```
Хэрэгжүүлэх журмын 12-2 дугаар зүйлтэй холбоотой 1-3 дугаар хавсралт нь F-5 байнгын оршин суух эрхэд нийцэх хүний хүрээг тогтоодог. 2026-07-02-ны шалгалтаар эхлээд хуулийн 46 дугаар зүйлийн албадан гаргах үндэслэлд хамаарахгүй байх ба тодорхой нөхцөл хангана. Жишээ нь D-7-оос E-7 хүртэл эсвэл F-2 эрхээр 5-аас дээш жил байсан насанд хүрсэн хүн, Солонгос иргэн эсвэл F-5 эрхтэй хүний эхнэр/нөхөр, насанд хүрээгүй хүүхэд тодорхой хугацаа байсан тохиолдол байж болно. F-5 зөвлөгөөнд зан төлөв, амьжиргаа, үндсэн мэдлэг, гэмт хэрэг ба оршин суух түүх, нарийвчилсан журам хамт шалгана.
```

---

## A1-031 immigration-rule-stay-permission-review-criteria

- 제목: 체류자격 부여·변경·연장 심사기준
- 카테고리: legal
- 출처 라벨: 국가법령정보센터 · 출입국관리법 시행규칙
- 출처 URL: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283059
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 체류자격 부여·변경·연장 심사기준

```
출입국관리법 시행규칙 제31조의2는 체류자격 부여, 체류자격 변경허가, 체류기간 연장허가를 할 때 외국인이 제9조의2제1호부터 제3호까지, 제5호 및 제6호의 요건을 갖추었는지 심사해야 한다고 정합니다. 이 구조는 단순히 서류 목록을 맞추는 문제가 아니라 유효한 여권, 입국금지·거부 대상 여부, 시행령 별표 1·1의2·1의3의 체류자격 해당성, 체류자격별 법무부장관 기준 등을 함께 보는 심사입니다. 따라서 KAXI는 변경·연장 가능성을 단정하지 않고, 현재 체류자격, 만료일, 활동 목적, 위반 이력, 관할관서 판단 가능성을 함께 확인해야 합니다.
```

### EN — Review criteria for grant, change, and extension of stay status

```
Article 31-2 of the Enforcement Rule requires immigration offices, when granting a status, approving a status change, or extending a stay period, to review whether the foreign national satisfies the relevant requirements in Article 9-2. This is not just a document-list check; it includes valid passport status, entry-ban or denial grounds, whether the person fits the status tables in Enforcement Decree Tables 1, 1-2, and 1-3, and whether status-specific Ministry of Justice standards are satisfied. KAXI therefore must not guarantee change or extension outcomes and must check current status, expiry date, activity purpose, violation history, and competent-office judgment.
```

### VI — Tiêu chí xét cấp, đổi và gia hạn tư cách lưu trú

```
Điều 31-2 của Quy tắc thi hành yêu cầu khi cấp tư cách lưu trú, cho phép đổi tư cách hoặc gia hạn thời hạn lưu trú, cơ quan phải xem xét người nước ngoài có đáp ứng các điều kiện tại Điều 9-2 khoản 1 đến 3, 5 và 6 hay không. Đây không chỉ là kiểm tra danh sách hồ sơ; còn gồm hộ chiếu hợp lệ, có thuộc diện cấm/từ chối nhập cảnh không, có phù hợp với tư cách trong các phụ lục 1, 1-2, 1-3 của Nghị định không, và có đáp ứng tiêu chuẩn do Bộ trưởng Tư pháp đặt ra cho từng tư cách không. Vì vậy KAXI không được cam kết khả năng đổi/gia hạn mà phải kiểm tra tư cách hiện tại, ngày hết hạn, mục đích hoạt động, lịch sử vi phạm và quyết định của văn phòng có thẩm quyền.
```

### MN — Оршин суух ангилал олгох, өөрчлөх, сунгах шалгуур

```
Хэрэгжүүлэх дүрмийн 31-2 дугаар зүйл нь оршин суух ангилал олгох, ангилал өөрчлөх, хугацаа сунгах үед гадаад иргэн 9-2 дугаар зүйлийн 1-3, 5, 6 дахь нөхцөлийг хангасан эсэхийг шалгахыг шаарддаг. Энэ нь зөвхөн материалын жагсаалт биш; хүчинтэй паспорт, нэвтрэх хориг/татгалзах үндэслэл, хэрэгжүүлэх журмын 1, 1-2, 1-3 дугаар хавсралтын ангилалд нийцэх эсэх, тухайн ангиллын Хууль зүйн сайдын шалгуур зэргийг хамтад нь үзнэ. KAXI өөрчлөх/сунгах боломжийг батлахгүй, одоогийн ангилал, хугацаа, үйл ажиллагаа, зөрчлийн түүх, харьяа байгууллагын шийдвэрийг шалгана.
```

---

## A1-032 immigration-act-permission-matrix

- 제목: 변경·연장·자격외활동의 허가 구조
- 카테고리: legal
- 출처 라벨: 국가법령정보센터 · 출입국관리법
- 출처 URL: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 변경·연장·자격외활동의 허가 구조

```
출입국관리법상 현 체류자격과 다른 활동을 병행하려면 체류자격 외 활동허가를 검토하고, 근무처 변경·추가는 별도 허가 또는 신고 구조를 확인해야 합니다. 현재 자격을 중지하고 다른 체류자격 활동을 하려면 체류자격 변경허가가 문제 되고, 허가받은 체류기간을 넘겨 계속 체류하려면 체류기간 연장허가가 문제 됩니다. 90일 초과 체류 외국인은 외국인등록 의무와 체류지·등록사항 변경 신고도 함께 확인해야 합니다.
```

### EN — Permission matrix for status change, extension, and outside-status activity

```
Under the Immigration Act, outside-status activity permission is considered when the person keeps the current status but performs another activity; workplace changes/additions have separate permit or reporting structures. If the current status activity stops and another status activity begins, status-change permission is at issue. If the person stays beyond the permitted period, stay-extension permission is at issue. Stays over 90 days also require alien registration and reporting of address or registration changes.
```

### VI — Cấu trúc xin phép thay đổi, gia hạn và hoạt động ngoài tư cách

```
Theo Luật Quản lý xuất nhập cảnh, nếu vừa giữ tư cách hiện tại vừa làm hoạt động khác, cần xem xét phép hoạt động ngoài tư cách; thay đổi/thêm nơi làm việc có cơ chế phép hoặc thông báo riêng. Nếu dừng tư cách hiện tại để làm hoạt động thuộc tư cách khác, cần xem xét thay đổi tư cách; nếu ở quá thời hạn đã được cho phép, cần gia hạn. Người ở quá 90 ngày cũng phải kiểm tra nghĩa vụ đăng ký người nước ngoài và khai báo thay đổi nơi ở/thông tin.
```

### MN — Өөрчлөх, сунгах, ангиллаас гадуурх үйл ажиллагааны зөвшөөрлийн бүтэц

```
Цагаачлалын хуулиар одоогийн ангиллаа хадгалж өөр үйл ажиллагаа хийх бол ангиллаас гадуурх үйл ажиллагааны зөвшөөрөл, ажлын байр өөрчлөх/нэмэх бол тусдаа зөвшөөрөл эсвэл мэдэгдэл шалгана. Өөр ангиллын үндсэн үйл ажиллагаа хийх бол ангилал өөрчлөх, хугацаа хэтрүүлэн байх бол хугацаа сунгах асуудал болно. 90 хоногоос дээш оршин суух бол бүртгэл болон хаяг/мэдээлэл өөрчлөлтийн үүргийг шалгана.
```

---

## A1-033 immigration-act-employment-restriction

- 제목: 외국인 고용·취업 제한의 기본 원칙
- 카테고리: warning
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제18조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0018&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 외국인 고용·취업 제한의 기본 원칙

```
출입국관리법 제18조는 외국인이 대한민국에서 취업하려면 취업활동을 할 수 있는 체류자격을 받아야 한다고 정합니다. 취업 가능한 체류자격을 가진 외국인도 지정된 근무처가 아닌 곳에서 근무하면 안 되고, 누구든 취업 가능한 체류자격이 없는 사람을 고용하거나 그 고용을 알선·권유해서는 안 됩니다. 따라서 KAXI는 '일해도 되는지' 질문에서 현재 체류자격, 취업활동 허용 여부, 지정 근무처, 근로계약 상대방, 별도 허가·신고 필요성을 먼저 확인해야 합니다.
```

### EN — Basic rule on foreign-national employment restriction

```
Immigration Act Article 18 requires a foreign national to hold a stay status that permits employment before working in Korea. Even a person with an employment-permitted status must not work outside the designated workplace, and no one may employ, broker, or solicit employment for a person without an employment-permitted status. KAXI should check current status, work authorization, designated workplace, contracting party, and any separate permission or reporting requirement before answering whether work is allowed.
```

### VI — Nguyên tắc hạn chế việc làm của người nước ngoài

```
Điều 18 Luật Quản lý xuất nhập cảnh quy định người nước ngoài muốn làm việc tại Hàn Quốc phải có tư cách lưu trú cho phép hoạt động làm việc. Ngay cả khi có tư cách được làm việc, người đó không được làm tại nơi không được chỉ định; người khác cũng không được tuyển dụng, môi giới hoặc khuyến dụ việc làm cho người không có tư cách được làm việc. KAXI phải kiểm tra tư cách hiện tại, quyền làm việc, nơi làm việc được chỉ định, bên ký hợp đồng và giấy phép/thông báo riêng.
```

### MN — Гадаад иргэний ажил эрхлэлтийн хязгаарлалтын үндсэн зарчим

```
Цагаачлалын хуулийн 18 дугаар зүйлээр Солонгост ажиллах гадаад иргэн ажиллах боломжтой оршин суух ангилалтай байх ёстой. Ажиллах ангилалтай байсан ч заасан ажлын байраас өөр газар ажиллаж болохгүй; ажиллах эрхгүй хүнийг ажиллуулах, зуучлах, санал болгохыг хориглоно. KAXI одоогийн ангилал, ажиллах эрх, заасан ажлын байр, гэрээний тал, тусдаа зөвшөөрөл/мэдэгдлийг шалгана.
```

---

## A1-034 immigration-act-employer-reporting-duty

- 제목: 외국인을 고용한 자 등의 15일 신고의무
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제19조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0019&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 외국인을 고용한 자 등의 15일 신고의무

```
출입국관리법 제19조는 취업활동을 할 수 있는 체류자격을 가진 외국인을 고용한 자에게 일정한 사유가 생기면 15일 이내 신고의무를 둡니다. 고용계약 해지, 퇴직, 사망, 소재불명, 고용계약의 중요 내용 변경처럼 외국인의 취업·체류 심사에 영향을 줄 수 있는 사건은 근무처 변경허가나 체류자격 문제와 별도로 사업주 신고 리스크가 생깁니다. KAXI는 E-7 등 취업자격 상담에서 외국인 본인의 허가뿐 아니라 고용주의 신고기한, 변경일, 퇴직일, 새 근무처 시작일, 계약서 변경 내용을 함께 확인해야 합니다.
```

### EN — Employer reporting duty within 15 days

```
Immigration Act Article 19 creates an employer reporting duty when specified events occur for a foreign national who holds a stay status permitting employment. Contract termination, resignation, death, inability to locate the worker, or material employment-contract changes can create employer reporting risk separate from the worker's own workplace-change or stay-status issue. For E-7 and other work-status consultations, KAXI should check the employer's reporting deadline, event date, resignation date, new workplace start date, and changed contract terms.
```

### VI — Nghĩa vụ khai báo trong 15 ngày của người sử dụng lao động nước ngoài

```
Điều 19 Luật Quản lý xuất nhập cảnh đặt nghĩa vụ khai báo trong 15 ngày đối với người sử dụng lao động nước ngoài có tư cách được làm việc khi phát sinh một số sự kiện. Chấm dứt hợp đồng, thôi việc, tử vong, không rõ nơi ở hoặc thay đổi nội dung quan trọng của hợp đồng lao động có thể tạo rủi ro khai báo cho doanh nghiệp, tách biệt với việc người lao động phải xin phép hoặc khai báo thay đổi nơi làm việc. KAXI cần kiểm tra thời hạn khai báo của chủ sử dụng, ngày thay đổi, ngày nghỉ việc, ngày bắt đầu nơi làm việc mới và nội dung hợp đồng sửa đổi.
```

### MN — Гадаад ажилтны ажил олгогчийн 15 хоногийн мэдэгдэх үүрэг

```
Цагаачлалын хуулийн 19 дүгээр зүйл нь ажиллах эрхтэй гадаад иргэнийг ажиллуулж буй этгээдэд тодорхой нөхцөл үүсвэл 15 хоногийн дотор мэдэгдэх үүрэг тогтоодог. Гэрээ дуусах, ажлаас гарах, нас барах, байршил тодорхойгүй болох, хөдөлмөрийн гэрээний чухал нөхцөл өөрчлөгдөх зэрэг нь ажилтны ажлын байр өөрчлөх зөвшөөрлөөс гадна ажил олгогчийн мэдэгдлийн эрсдэл үүсгэнэ. KAXI E-7 зэрэг ажиллах ангиллын зөвлөгөөнд ажил олгогчийн хугацаа, өөрчлөгдсөн өдөр, ажлаас гарсан өдөр, шинэ ажлын эхлэх өдөр, гэрээний өөрчлөлтийг шалгана.
```

---

## A1-035 immigration-act-student-management-reporting

- 제목: 외국인유학생 학적 변동 관리·신고
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제19조의4
- 출처 URL: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 외국인유학생 학적 변동 관리·신고

```
출입국관리법 제19조의4는 외국인유학생을 받는 학교의 관리·신고 구조를 둡니다. D-2, D-4 유학생이 휴학, 제적, 미등록, 연수 중단, 행방불명 등 학업 지속성과 체류자격 유지에 영향을 주는 상태가 되면 학교의 신고와 출입국 심사 리스크가 함께 발생할 수 있습니다. KAXI는 유학생 상담에서 본인의 체류기간 연장·변경 요건만 보지 말고, 학적 상태, 학교 국제처 통보 여부, 변동일, 유학생정보시스템 반영 여부, 관할 출입국·외국인관서의 추가 요구를 확인해야 합니다.
```

### EN — Foreign-student status management and reporting

```
Immigration Act Article 19-4 provides a management and reporting framework for schools that host foreign students. For D-2 and D-4 students, leave of absence, removal from the register, non-registration, training discontinuation, or disappearance can trigger both school reporting and stay-review risk. KAXI should check the student's academic status, whether the international office has been notified, the status-change date, student-information-system updates, and any additional requirements from the competent immigration office.
```

### VI — Quản lý và khai báo biến động học tịch của du học sinh nước ngoài

```
Điều 19-4 Luật Quản lý xuất nhập cảnh đặt cơ chế quản lý và khai báo đối với trường tiếp nhận du học sinh nước ngoài. Khi du học sinh D-2 hoặc D-4 nghỉ học tạm thời, bị xóa tên, không đăng ký, dừng khóa học hoặc mất liên lạc, rủi ro khai báo của trường và rủi ro xét lưu trú có thể phát sinh cùng lúc. KAXI cần kiểm tra tình trạng học tịch, việc thông báo với phòng quốc tế, ngày biến động, cập nhật trên hệ thống du học sinh và yêu cầu bổ sung của cơ quan xuất nhập cảnh.
```

### MN — Гадаад оюутны сургалтын байдлын өөрчлөлтийг удирдах ба мэдэгдэх

```
Цагаачлалын хуулийн 19-4 дүгээр зүйл нь гадаад оюутан хүлээн авдаг сургуулийн удирдлага, мэдэгдлийн бүтцийг тогтоодог. D-2, D-4 оюутан чөлөө авах, сургуулиас хасагдах, бүртгүүлэхгүй байх, сургалтаа зогсоох, холбоо тасрах үед сургууль мэдэгдэх үүрэг болон оршин суух шалгалтын эрсдэл зэрэг үүсэж болно. KAXI оюутны сунгалт/өөрчлөлтөөс гадна сургалтын байдал, сургуулийн олон улсын албанд мэдэгдсэн эсэх, өөрчлөгдсөн өдөр, системийн тусгал, харьяа байгууллагын шаардлагыг шалгана.
```

---

## A1-036 immigration-act-outside-status-activity

- 제목: 체류자격 외 활동허가와 유학생 아르바이트
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제20조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0020&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 체류자격 외 활동허가와 유학생 아르바이트

```
출입국관리법 제20조는 대한민국에 체류하는 외국인이 현재 체류자격에 해당하는 활동과 함께 다른 체류자격에 해당하는 활동을 하려면 미리 법무부장관의 체류자격 외 활동허가를 받아야 한다고 정합니다. 유학생(D-2) 또는 어학연수생(D-4-1)의 시간제취업 상담도 단순 아르바이트 가능 여부가 아니라, 현재 자격 유지, 학교 확인, 근무시간·업종 제한, 하이코리아 허가·신고 가능 여부를 같이 봐야 합니다. 주된 활동이 바뀌는 경우에는 체류자격 외 활동이 아니라 체류자격 변경 검토 대상일 수 있습니다.
```

### EN — Outside-status activity permission and student part-time work

```
Article 20 requires advance permission for activities outside status when a foreign national keeps the current status activity while also performing an activity belonging to another status. Student part-time work for D-2 or D-4-1 is therefore not just a yes/no question; KAXI should check current-status maintenance, school confirmation, work-hour and industry limits, and HiKorea permission or reporting availability. If the new activity becomes the primary activity, status change may be the correct route instead.
```

### VI — Phép hoạt động ngoài tư cách và làm thêm của du học sinh

```
Điều 20 quy định người nước ngoài đang ở Hàn Quốc muốn vừa giữ hoạt động theo tư cách hiện tại vừa thực hiện hoạt động thuộc tư cách khác phải xin phép hoạt động ngoài tư cách trước. Với du học sinh D-2 hoặc học tiếng D-4-1 làm thêm, cần kiểm tra việc duy trì tư cách hiện tại, xác nhận của trường, giới hạn giờ/ngành nghề và khả năng xin phép hoặc thông báo trên HiKorea. Nếu hoạt động mới trở thành hoạt động chính, có thể phải xét đổi tư cách thay vì chỉ xin hoạt động ngoài tư cách.
```

### MN — Ангиллаас гадуурх үйл ажиллагааны зөвшөөрөл ба оюутны цагийн ажил

```
20 дугаар зүйлээр гадаад иргэн одоогийн ангиллын үйл ажиллагаагаа хадгалж өөр ангиллын үйл ажиллагааг зэрэг хийх бол урьдчилан ангиллаас гадуурх үйл ажиллагааны зөвшөөрөл авах ёстой. D-2 оюутан эсвэл D-4-1 хэлний суралцагчийн цагийн ажилд одоогийн ангилал, сургуулийн баталгаа, цаг/салбарын хязгаар, HiKorea зөвшөөрөл эсвэл мэдэгдлийг шалгана. Шинэ үйл ажиллагаа үндсэн бол ангилал өөрчлөх асуудал байж болно.
```

---

## A1-037 immigration-act-workplace-change-addition

- 제목: 근무처 변경·추가 허가와 신고
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제21조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0021&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 근무처 변경·추가 허가와 신고

```
출입국관리법 제21조는 외국인이 체류자격의 범위 안에서 근무처를 변경하거나 추가하려면 원칙적으로 미리 법무부장관의 허가를 받아야 한다고 정합니다. 다만 전문 지식·기술·기능을 가진 사람으로서 대통령령이 정하는 사람은 근무처를 변경하거나 추가한 날부터 15일 이내 신고 구조가 적용될 수 있습니다. 허가·신고 없이 근무처를 바꾼 외국인을 고용하거나 고용을 알선하는 것도 금지됩니다. KAXI는 E-계열, E-7, 연구·전문직 상담에서 현재 지정 근무처, 새 계약 시작일, 신고 대상인지 허가 대상인지, 고용주·알선자 리스크를 함께 확인해야 합니다.
```

### EN — Workplace change or addition permission and reporting

```
Article 21 states that a foreign national changing or adding a workplace within the scope of the stay status generally must obtain permission in advance. A person with professional knowledge, technology, or skills as prescribed by Presidential Decree may instead fall under a report-within-15-days structure after the change or addition. Employing or brokering a foreign national who lacks the required workplace permission or report is also prohibited. KAXI should check the current designated workplace, new contract start date, whether the case is permission or reporting, and employer or broker risk.
```

### VI — Phép hoặc khai báo thay đổi/thêm nơi làm việc

```
Điều 21 quy định khi người nước ngoài thay đổi hoặc thêm nơi làm việc trong phạm vi tư cách lưu trú, về nguyên tắc phải xin phép trước. Tuy nhiên người có kiến thức, kỹ thuật hoặc kỹ năng chuyên môn theo Nghị định có thể thuộc diện khai báo trong vòng 15 ngày kể từ ngày thay đổi/thêm nơi làm việc. Việc tuyển dụng hoặc môi giới người chưa có phép/thông báo cần thiết cũng bị cấm. KAXI phải kiểm tra nơi làm việc được chỉ định, ngày bắt đầu hợp đồng mới, diện xin phép hay khai báo, và rủi ro của chủ sử dụng hoặc môi giới.
```

### MN — Ажлын байр өөрчлөх/нэмэх зөвшөөрөл ба мэдэгдэл

```
21 дүгээр зүйлээр гадаад иргэн өөрийн ангиллын хүрээнд ажлын байраа өөрчлөх эсвэл нэмэх бол зарчмаар урьдчилан зөвшөөрөл авах ёстой. Харин журамд заасан мэргэжлийн мэдлэг, техник, ур чадвартай хүн өөрчилсөн/нэмсэн өдрөөс 15 хоногийн дотор мэдэгдэх бүтэцтэй байж болно. Шаардлагатай зөвшөөрөл/мэдэгдэлгүй хүнийг ажиллуулах эсвэл зуучлахыг хориглоно. KAXI заасан ажлын байр, шинэ гэрээний эхлэх өдөр, зөвшөөрөл эсвэл мэдэгдлийн төрөл, ажил олгогч/зуучлагчийн эрсдэлийг шалгана.
```

---

## A1-038 immigration-act-activity-scope-restriction

- 제목: 활동범위·거소 제한과 준수사항
- 카테고리: legal
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제22조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0022&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 활동범위·거소 제한과 준수사항

```
출입국관리법 제22조는 법무부장관이 공공의 안녕질서나 대한민국의 중요한 이익을 위해 필요하다고 인정하면 대한민국에 체류하는 외국인에 대해 거소 또는 활동의 범위를 제한하거나 필요한 준수사항을 정할 수 있다고 합니다. 이 조문은 일반적인 체류자격 판단과 달리 개별 사안의 제한·조건 부과 근거가 될 수 있으므로, KAXI는 특정 지역·활동 제한, 출석 요구, 준수조건 위반 가능성이 보이면 단정 답변을 피하고 결정서·통지서와 관할관서 확인을 요구해야 합니다.
```

### EN — Restriction of activity scope, residence, and compliance conditions

```
Article 22 allows the Minister of Justice, when necessary for public order or important Korean interests, to restrict a foreign national's place of residence or scope of activity, or set other required compliance conditions. Because this can support case-specific restrictions or conditions, KAXI should avoid categorical advice when a notice, appearance request, regional or activity restriction, or compliance-condition issue appears, and should require review of the official notice and competent-office confirmation.
```

### VI — Hạn chế phạm vi hoạt động, nơi cư trú và nghĩa vụ tuân thủ

```
Điều 22 cho phép Bộ trưởng Tư pháp hạn chế nơi cư trú hoặc phạm vi hoạt động của người nước ngoài đang ở Hàn Quốc, hoặc đặt ra nghĩa vụ tuân thủ cần thiết, khi cần vì trật tự công cộng hoặc lợi ích quan trọng của Hàn Quốc. Đây có thể là căn cứ cho điều kiện hoặc hạn chế cá biệt, nên nếu có giấy thông báo, yêu cầu có mặt, hạn chế khu vực/hoạt động hoặc nguy cơ vi phạm điều kiện, KAXI không nên kết luận chắc chắn mà cần kiểm tra văn bản và cơ quan có thẩm quyền.
```

### MN — Үйл ажиллагааны хүрээ, оршин суух газрыг хязгаарлах ба дагах нөхцөл

```
22 дугаар зүйлээр нийтийн аюулгүй байдал, дэг журам эсвэл Солонгосын чухал ашиг сонирхолд шаардлагатай гэж үзвэл Хууль зүйн сайд гадаад иргэний оршин суух газар, үйл ажиллагааны хүрээг хязгаарлах эсвэл дагах нөхцөл тогтоож болно. Энэ нь хувь хэрэгт тавигдсан хязгаар, нөхцлийн үндэс байж болох тул KAXI мэдэгдэл, ирэх шаардлага, бүс/үйл ажиллагааны хязгаар, нөхцөл зөрчих эрсдэл байвал бичиг баримт болон харьяа байгууллагыг шалгуулна.
```

---

## A1-039 immigration-act-false-application-documents

- 제목: 허위서류 제출·알선 금지
- 카테고리: warning
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제26조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0026&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 허위서류 제출·알선 금지

```
출입국관리법 제26조는 체류자격 외 활동, 근무처 변경·추가, 체류자격 부여·변경·연장 등 허가 신청과 관련하여 위조·변조 문서나 거짓 사실이 적힌 신청서 등을 제출하는 부정 신청과, 그런 행위를 알선·권유하는 행위를 금지합니다. KAXI는 잔고증명, 재직증명, 고용계약, 학교서류, 초청서 등에서 허위 작성·대여·브로커 알선 요청이 감지되면 서비스를 거절하고, 정정·철회·합법 자료 준비와 행정사 검토로 안내해야 합니다.
```

### EN — Ban on false application documents and brokerage

```
Article 26 prohibits fraudulent applications using forged or altered documents, or applications containing false facts, in permission matters such as outside-status activity, workplace change or addition, grant, change, or extension of stay status; it also prohibits brokering or encouraging those acts. If KAXI detects requests to fabricate bank balances, employment certificates, employment contracts, school documents, or invitation letters, it should refuse assistance and route the user toward correction, withdrawal, lawful evidence preparation, and administrative-scrivener review.
```

### VI — Cấm nộp hoặc môi giới hồ sơ giả

```
Điều 26 cấm nộp hồ sơ giả, tài liệu bị làm giả/sửa đổi hoặc đơn có nội dung sai sự thật trong các hồ sơ xin phép như hoạt động ngoài tư cách, thay đổi/thêm nơi làm việc, cấp/đổi/gia hạn tư cách lưu trú; đồng thời cấm môi giới hoặc khuyến dụ hành vi đó. Nếu KAXI phát hiện yêu cầu làm giả chứng minh tài chính, chứng nhận việc làm, hợp đồng lao động, giấy tờ trường học hoặc thư mời, cần từ chối hỗ trợ và hướng dẫn sửa, rút hồ sơ hoặc chuẩn bị tài liệu hợp pháp với hành chính viên.
```

### MN — Хуурамч материал өгөх, зуучлахыг хориглох

```
26 дугаар зүйл нь ангиллаас гадуурх үйл ажиллагаа, ажлын байр өөрчлөх/нэмэх, ангилал олгох/өөрчлөх/сунгах зэрэг зөвшөөрлийн хүсэлтэд хуурамч, өөрчилсөн бичиг баримт эсвэл худал мэдээлэлтэй өргөдөл өгөх, мөн түүнийг зуучлах/санал болгохыг хориглодог. KAXI санхүүгийн баталгаа, ажил эрхлэлтийн тодорхойлолт, хөдөлмөрийн гэрээ, сургуулийн материал, урилга зэрэгт хуурамч хүсэлт илэрвэл татгалзаж, засах/буцаах/хууль ёсны материал бэлтгэхийг зөвлөнө.
```

---

## A1-040 immigration-act-permit-cancellation-change

- 제목: 각종 허가 등의 취소·변경과 7일 전 통지
- 카테고리: warning
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제89조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0089&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 4

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 각종 허가 등의 취소·변경과 7일 전 통지

```
출입국관리법 제89조는 사증발급, 사증발급인정서, 입국허가, 조건부 입국허가, 상륙허가, 체류자격외활동허가, 근무처 변경·추가, 체류자격 부여·변경·연장 등 허가를 취소하거나 변경할 수 있는 근거입니다. 신원보증 철회, 거짓이나 부정한 방법으로 허가를 받은 사실, 허가조건 위반, 허가상태를 유지할 수 없는 중대한 사정 변경, 법 위반이나 출입국관리공무원의 정당한 직무명령 위반이 문제될 수 있습니다. 취소·변경을 위해 출석하게 하여 의견을 들을 수 있고, 그 경우 취소·변경 사유와 출석일시·장소를 출석일 7일 전까지 통지해야 합니다. KAXI는 허가취소 상담에서 통지서 수령 여부, 출석일, 취소 사유, 신원보증·허가조건·허위자료 여부, 의견진술 자료와 행정쟁송 기한을 즉시 확인해야 합니다.
```

### EN — Cancellation or change of immigration permissions and seven-day notice

```
Immigration Act Article 89 is the legal basis for cancelling or changing immigration permissions, including visa issuance, certificate for confirmation of visa issuance, entry permission, conditional entry permission, landing permissions, outside-status activity permission, workplace change or addition, and grant, change, or extension of stay status. Grounds include withdrawal or loss of a guarantor, permission obtained by false or otherwise improper means, breach of permission conditions, serious changed circumstances making the permission unsustainable, serious legal violations, or violation of a lawful immigration officer order. If the person is summoned for an opinion hearing, the reason for cancellation or change and the date, time, and place of appearance must be notified seven days before the appearance date. KAXI should check notice receipt, appearance date, cancellation grounds, guarantor and permission conditions, false-document allegations, evidence for opinion submission, and appeal or litigation deadlines.
```

### VI — Hủy hoặc thay đổi các loại giấy phép và thông báo trước 7 ngày

```
Điều 89 Luật Quản lý xuất nhập cảnh là căn cứ để hủy hoặc thay đổi nhiều loại phép như cấp visa, giấy xác nhận cấp visa, cho phép nhập cảnh, cho phép nhập cảnh có điều kiện, phép lên bờ, hoạt động ngoài tư cách lưu trú, đổi/thêm nơi làm việc, cấp/đổi/gia hạn tư cách lưu trú. Các căn cứ gồm rút bảo lãnh, phát hiện giấy phép được cấp bằng cách gian dối hoặc bất chính, vi phạm điều kiện giấy phép, thay đổi hoàn cảnh nghiêm trọng khiến giấy phép không thể duy trì, hoặc vi phạm pháp luật hay mệnh lệnh công vụ hợp pháp của công chức xuất nhập cảnh. Khi yêu cầu người nước ngoài đến trình bày ý kiến, lý do hủy/thay đổi, thời gian và địa điểm phải được thông báo trước ngày có mặt 7 ngày. KAXI cần kiểm tra thông báo, ngày có mặt, lý do hủy, bảo lãnh/điều kiện/giấy tờ sai, tài liệu giải trình và thời hạn khiếu kiện.
```

### MN — Зөвшөөрөл цуцлах, өөрчлөх ба 7 хоногийн өмнөх мэдэгдэл

```
Цагаачлалын хуулийн 89 дүгээр зүйл нь виз олгох, виз олгох батламж, нэвтрэх зөвшөөрөл, нөхцөлтэй нэвтрэх зөвшөөрөл, буух зөвшөөрөл, ангиллаас гадуурх үйл ажиллагаа, ажлын байр өөрчлөх/нэмэх, оршин суух ангилал олгох/өөрчлөх/сунгах зэрэг зөвшөөрлийг цуцлах эсвэл өөрчлөх үндэслэл юм. Батлан даагч баталгаагаа татсан, зөвшөөрлийг худал эсвэл шударга бус аргаар авсан, зөвшөөрлийн нөхцөл зөрчсөн, зөвшөөрлийг цааш хадгалах боломжгүй ноцтой нөхцөл өөрчлөгдсөн, хууль эсвэл цагаачлалын ажилтны хууль ёсны тушаал зөрчсөн эсэхийг шалгана. Санал сонсохоор дуудах бол цуцлах/өөрчлөх шалтгаан, ирэх өдөр, газрыг 7 хоногийн өмнө мэдэгдэх ёстой. KAXI мэдэгдэл, ирэх өдөр, үндэслэл, батлан даалт/нөхцөл/хуурамч материал, тайлбар нотлох баримт, маргааны хугацааг шалгана.
```

---

## A1-041 immigration-act-status-grant

- 제목: 체류자격 부여의 법령상 기한
- 카테고리: legal
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제23조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0023&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 체류자격 부여의 법령상 기한

```
출입국관리법 제23조는 제10조에 따른 체류자격을 가지지 못하고 대한민국에 체류하게 되는 외국인의 체류자격 부여 기한을 정합니다. 대한민국에서 출생한 외국인은 출생한 날부터 90일 이내에, 대한민국에서 체류 중 대한민국 국적을 상실하거나 이탈하는 등 사유가 발생한 외국인은 그 사유가 발생한 날부터 60일 이내에 대통령령으로 정하는 바에 따라 체류자격을 받아야 합니다. 체류자격 부여 심사기준은 법무부령으로 정하므로, KAXI는 출생일 또는 국적상실·이탈일, 현재 등록·여권 상태, 부모 또는 본인의 체류자격, 관할관서 제출서류를 함께 확인해야 합니다.
```

### EN — Statutory deadlines for grant of stay status

```
Immigration Act Article 23 sets deadlines for foreign nationals who come to stay in Korea without a status under Article 10. A foreign child born in Korea must obtain a status within 90 days from birth. A person who loses or renounces Korean nationality while staying in Korea, or has a similar ground arise, must obtain a status within 60 days from that ground. The review criteria are set by Ministry of Justice rules, so KAXI should check the birth date or nationality-loss date, passport and registration status, the parent or applicant's status, and competent-office documents together.
```

### VI — Thời hạn pháp lý để được cấp tư cách lưu trú

```
Điều 23 Luật Quản lý xuất nhập cảnh quy định thời hạn xin cấp tư cách lưu trú cho người nước ngoài ở Hàn Quốc mà chưa có tư cách theo Điều 10. Người nước ngoài sinh tại Hàn Quốc phải được cấp tư cách trong vòng 90 ngày kể từ ngày sinh; người mất hoặc thôi quốc tịch Hàn Quốc khi đang ở Hàn Quốc phải được cấp tư cách trong vòng 60 ngày kể từ ngày phát sinh lý do. Tiêu chí xét cấp do Quy tắc của Bộ Tư pháp quy định, vì vậy KAXI phải kiểm tra ngày sinh hoặc ngày mất/thôi quốc tịch, tình trạng hộ chiếu/đăng ký, tư cách của cha mẹ hoặc bản thân, và hồ sơ tại cơ quan có thẩm quyền.
```

### MN — Оршин суух ангилал олгох хууль дахь хугацаа

```
Цагаачлалын хуулийн 23 дугаар зүйл нь 10 дугаар зүйлд заасан оршин суух ангилалгүйгээр Солонгост байх болсон гадаад иргэний ангилал авах хугацааг тогтоодог. Солонгост төрсөн гадаад хүүхэд төрсөн өдрөөс 90 хоногийн дотор, Солонгост байхдаа Солонгосын иргэншлээ алдсан эсвэл гарсан хүн тухайн шалтгаан үүссэн өдрөөс 60 хоногийн дотор ангилал авах ёстой. Шалгах шалгуурыг Хууль зүйн яамны дүрэм тогтоодог тул KAXI төрсөн өдөр, иргэншил алдсан өдөр, паспорт/бүртгэл, эцэг эх эсвэл өөрийн ангилал, харьяа байгууллагын материалыг шалгана.
```

---

## A1-042 immigration-act-status-change

- 제목: 체류자격 변경허가의 법령 근거
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제24조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0024&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 체류자격 변경허가의 법령 근거

```
출입국관리법 제24조는 대한민국에 체류하는 외국인이 현재 체류자격과 다른 체류자격에 해당하는 활동을 하려면 대통령령으로 정하는 바에 따라 미리 법무부장관의 체류자격 변경허가를 받아야 한다고 정합니다. 외국공관 직원 등 제31조제1항 각 호에 해당하던 사람이 신분 변경으로 체류자격을 변경하려는 경우에는 신분이 변경된 날부터 30일 이내 허가를 받아야 합니다. 변경허가의 심사기준은 법무부령으로 정하므로, KAXI는 목표 활동을 시작했는지, 현재 자격 활동을 중단했는지, 변경 가능 체류자격인지, 시행령 별표·시행규칙 첨부서류·HiKorea 실무 안내를 함께 확인해야 합니다.
```

### EN — Legal basis for change-of-status permission

```
Immigration Act Article 24 requires a foreign national staying in Korea to obtain change-of-status permission in advance, as prescribed by Presidential Decree, before engaging in activities under a status different from the current one. A person who was in one of the Article 31(1) exempt categories and changes identity must obtain change permission within 30 days from that change. The review criteria are set by Ministry of Justice rules, so KAXI should check whether the new activity has started, whether the current activity stopped, whether domestic change is available for the target status, and the Enforcement Decree tables, Enforcement Rule attachments, and HiKorea guidance.
```

### VI — Căn cứ pháp lý của phép đổi tư cách lưu trú

```
Điều 24 Luật Quản lý xuất nhập cảnh quy định người nước ngoài đang ở Hàn Quốc muốn hoạt động theo tư cách khác với tư cách hiện tại phải xin phép đổi tư cách lưu trú trước theo Nghị định. Người từng thuộc nhóm miễn đăng ký như Điều 31(1) nhưng thay đổi thân phận và cần đổi tư cách phải xin trong vòng 30 ngày từ ngày thay đổi. Tiêu chí xét do Quy tắc của Bộ Tư pháp quy định, nên KAXI phải kiểm tra đã bắt đầu hoạt động mới chưa, có dừng hoạt động cũ không, tư cách mục tiêu có thể đổi trong nước không, cùng bảng tư cách trong Nghị định, hồ sơ trong Quy tắc và hướng dẫn HiKorea.
```

### MN — Оршин суух ангилал өөрчлөх зөвшөөрлийн хууль зүйн үндэс

```
Цагаачлалын хуулийн 24 дүгээр зүйлээр Солонгост байгаа гадаад иргэн одоогийн ангиллаас өөр ангиллын үйл ажиллагаа хийх бол журмаар тогтоосны дагуу урьдчилан Хууль зүйн сайдын ангилал өөрчлөх зөвшөөрөл авах ёстой. 31 дүгээр зүйлийн 1 дэх хэсгийн бүлэгт байсан хүн статус нь өөрчлөгдвөл өөрчлөгдсөн өдрөөс 30 хоногийн дотор зөвшөөрөл авах ёстой. Шалгуурыг Хууль зүйн яамны дүрэм тогтоодог тул KAXI шинэ үйл ажиллагаа эхэлсэн эсэх, одоогийн үйл ажиллагаагаа зогсоосон эсэх, дотоодод өөрчлөх боломжтой эсэх, журам/хавсралт/HiKorea зааврыг хамт шалгана.
```

---

## A1-043 immigration-act-stay-extension

- 제목: 체류기간 연장허가의 법령 근거
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제25조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0025&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 체류기간 연장허가의 법령 근거

```
출입국관리법 제25조는 외국인이 체류기간을 초과하여 계속 체류하려면 대통령령으로 정하는 바에 따라 체류기간이 끝나기 전에 법무부장관의 체류기간 연장허가를 받아야 한다고 정합니다. 체류기간 연장허가의 심사기준은 법무부령으로 정합니다. 따라서 KAXI는 단순히 '연장 가능'이라고 답하지 말고, 현재 체류기간 만료일, 국내 체류 여부, 체류자격별 연장 가능성, 세금·건강보험료 체납, 학교·고용·소득 요건, 시행규칙 첨부서류와 HiKorea 신청 가능 기간을 함께 확인해야 합니다.
```

### EN — Legal basis for stay-extension permission

```
Immigration Act Article 25 requires a foreign national who wants to continue staying beyond the stay period to obtain stay-extension permission from the Minister of Justice before the stay period ends, as prescribed by Presidential Decree. The review criteria are set by Ministry of Justice rules. KAXI therefore should not merely say extension is possible; it should check the current expiry date, whether the applicant is in Korea, status-specific extension availability, tax and health-insurance arrears, school/employment/income conditions, Enforcement Rule attachments, and the HiKorea filing window.
```

### VI — Căn cứ pháp lý của gia hạn thời gian lưu trú

```
Điều 25 Luật Quản lý xuất nhập cảnh quy định người nước ngoài muốn tiếp tục ở lại quá thời hạn lưu trú phải xin phép gia hạn trước khi thời hạn kết thúc, theo Nghị định. Tiêu chí xét gia hạn do Quy tắc của Bộ Tư pháp quy định. Vì vậy KAXI không được chỉ nói 'có thể gia hạn' mà phải kiểm tra ngày hết hạn hiện tại, người nộp có ở trong Hàn Quốc không, khả năng gia hạn theo tư cách, nợ thuế/bảo hiểm y tế, điều kiện trường học/việc làm/thu nhập, hồ sơ trong Quy tắc và thời gian nộp trên HiKorea.
```

### MN — Оршин суух хугацаа сунгах зөвшөөрлийн хууль зүйн үндэс

```
Цагаачлалын хуулийн 25 дугаар зүйлээр гадаад иргэн зөвшөөрөгдсөн хугацаанаас цааш үргэлжлүүлэн байх бол хугацаа дуусахаас өмнө журмаар тогтоосны дагуу Хууль зүйн сайдын сунгах зөвшөөрөл авах ёстой. Сунгалтын шалгуурыг Хууль зүйн яамны дүрэм тогтоодог. KAXI зөвхөн 'сунгаж болно' гэж хэлэхгүй, одоогийн дуусах өдөр, Солонгост байгаа эсэх, тухайн ангиллын сунгалт, татвар/эрүүл мэндийн даатгалын өр, сургууль/ажил/орлогын нөхцөл, хавсралт материал, HiKorea өргөдлийн хугацааг хамт шалгана.
```

---

## A1-044 immigration-act-marriage-immigrant-extension-special

- 제목: 결혼이민자 등 피해자 체류기간 연장 특칙
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제25조의2
- 출처 URL: https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000822759
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 결혼이민자 등 피해자 체류기간 연장 특칙

```
출입국관리법 제25조의2는 가정폭력, 성폭력범죄, 아동학대범죄, 인신매매등 피해와 관련해 재판·수사 또는 법률상 권리구제 절차가 진행 중인 외국인이 체류기간 연장허가를 신청하는 경우, 그 절차가 끝날 때까지 체류기간 연장을 허가할 수 있는 특칙을 둡니다. 이 조항은 특히 국민의 배우자인 결혼이민자, 성폭력·아동학대·인신매매 피해자가 체류자격 상실이나 만료 위험 속에서도 권리구제 절차를 진행할 수 있게 하는 안전장치입니다. KAXI는 폭력·학대·피해 호소가 있으면 단순 F-6 연장 가능성만 보지 말고 사건 진행 여부, 보호명령·고소·수사·재판 자료, 신변안전, 행정사와 피해자 지원기관 연계를 우선 확인해야 합니다.
```

### EN — Stay-extension special rule for marriage immigrants and victims

```
Article 25-2 allows stay extension until the end of court, investigation, or other legal relief procedures when a foreign national applies for extension in connection with domestic violence, sexual crime, child abuse, or human-trafficking victimization. This is a protective rule for marriage immigrants who are spouses of Korean nationals and for sexual-violence, child-abuse, and human-trafficking victims facing status-expiry or status-loss risk. If KAXI detects violence, abuse, or victimization, it should not treat the case as a routine F-6 extension; it should check case status, protection orders, complaint, investigation or court records, personal safety, and referral to an administrative scrivener and victim-support organization.
```

### VI — Quy định đặc biệt gia hạn lưu trú cho người kết hôn di trú và nạn nhân

```
Điều 25-2 cho phép gia hạn thời hạn lưu trú đến khi kết thúc thủ tục tố tụng, điều tra hoặc cứu trợ quyền lợi nếu người nước ngoài là nạn nhân liên quan đến bạo lực gia đình, tội phạm tình dục, lạm dụng trẻ em hoặc mua bán người và xin gia hạn lưu trú. Quy định này đặc biệt bảo vệ người kết hôn với công dân Hàn Quốc, nạn nhân bạo lực tình dục, lạm dụng trẻ em hoặc mua bán người khi có nguy cơ hết hạn hoặc mất tư cách lưu trú. KAXI phải kiểm tra tiến trình vụ việc, lệnh bảo vệ, đơn tố cáo, hồ sơ điều tra/tòa án, an toàn cá nhân và kết nối hành chính viên hoặc tổ chức hỗ trợ nạn nhân.
```

### MN — Гэрлэлтийн цагаач болон хохирогчийн хугацаа сунгах тусгай журам

```
25-2 дугаар зүйл нь гэр бүлийн хүчирхийлэл, бэлгийн гэмт хэрэг, хүүхдийн хүчирхийлэл, хүн худалдаалахтай холбоотой шүүх, мөрдөн шалгах эсвэл эрх хамгаалах ажиллагаа явагдаж байгаа гадаад иргэн хугацаа сунгах хүсэлт гаргавал тухайн ажиллагаа дуусах хүртэл сунгах боломжтой тусгай журамтай. Энэ нь Солонгос иргэний эхнэр/нөхөр, бэлгийн хүчирхийлэл, хүүхдийн хүчирхийлэл, хүн худалдаалах гэмт хэргийн хохирогчийн эрх хамгаалах ажиллагааг дэмжих хамгаалалт. KAXI хэрэг явц, хамгаалах захирамж, гомдол, мөрдөн шалгах/шүүх материал, аюулгүй байдал, мэргэжлийн тусламжийг шалгана.
```

---

## A1-045 immigration-act-emergency-extension-special

- 제목: 국가비상사태 등 체류기간 연장 특칙
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제25조의5
- 출처 URL: https://www.law.go.kr/LSW/lsRvsDocListP.do?chrClsCd=010202&lsId=001707&lsRvsGubun=all
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 국가비상사태 등 체류기간 연장 특칙

```
출입국관리법 제25조의5는 국가비상사태, 국경의 폐쇄, 장기적인 항공기 운항 중단 등 외국인의 책임 없는 사유로 대한민국에서 출국할 수 없다고 인정되는 경우에 체류기간 연장허가 특칙을 두는 조항입니다. 법무부장관은 이런 사유가 있는 외국인에 대해 체류기간 연장허가를 하거나 직권으로 체류기간을 연장할 수 있습니다. KAXI는 전쟁·감염병·대규모 항공 중단·본국 입국 제한 같은 질문에서 일반 연장 요건만 안내하지 말고, 출국 불능 사유의 객관 자료, 항공편 취소 내역, 본국 입국 제한 공지, 관할관서의 직권연장 공지 여부를 함께 확인해야 합니다.
```

### EN — Emergency stay-extension special rule

```
Article 25-5 creates a special stay-extension rule when a foreign national is recognized as unable to depart Korea for reasons not attributable to them, such as a national emergency, border closure, or long-term flight suspension. The Minister of Justice may grant extension permission or extend the stay period ex officio. KAXI should not answer these cases only with ordinary extension requirements; it should check objective evidence of inability to depart, flight-cancellation records, home-country entry restrictions, and competent-office notices on ex officio extension.
```

### VI — Quy định đặc biệt gia hạn lưu trú trong tình trạng khẩn cấp quốc gia

```
Điều 25-5 đặt quy định đặc biệt về gia hạn lưu trú khi người nước ngoài không thể rời Hàn Quốc vì lý do không thuộc trách nhiệm của họ, như tình trạng khẩn cấp quốc gia, đóng cửa biên giới hoặc ngừng bay dài ngày. Bộ trưởng Tư pháp có thể cho phép gia hạn hoặc gia hạn thời hạn lưu trú theo thẩm quyền. KAXI phải kiểm tra chứng cứ khách quan về việc không thể xuất cảnh, lịch hủy chuyến bay, thông báo hạn chế nhập cảnh của nước về và thông báo gia hạn theo thẩm quyền của cơ quan xuất nhập cảnh.
```

### MN — Үндэсний онцгой байдал зэрэг үед хугацаа сунгах тусгай журам

```
25-5 дугаар зүйл нь үндэсний онцгой байдал, хил хаагдах, нислэг удаан хугацаагаар зогсох зэрэг гадаад иргэний буруугүй шалтгаанаар Солонгосоос гарах боломжгүй болсон үед хугацаа сунгах тусгай журам тогтоодог. Хууль зүйн сайд сунгах зөвшөөрөл өгөх эсвэл өөрийн эрхээр хугацааг сунгаж болно. KAXI дайн, халдварт өвчин, олон нислэг цуцлагдах, эх орон нь нэвтрүүлэхгүй байх зэрэгт гарах боломжгүйг нотлох баримт, нислэгийн цуцлалт, эх орны хил/нэвтрэх мэдэгдэл, харьяа байгууллагын албан сунгалтын зарлалыг шалгана.
```

---

## A1-046 immigration-act-departure-inspection

- 제목: 외국인 출국심사와 유효 여권 확인
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제28조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0028&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 외국인 출국심사와 유효 여권 확인

```
출입국관리법 제28조는 외국인이 출국할 때 유효한 여권을 가지고 출국하는 출입국항에서 출입국관리공무원의 출국심사를 받아야 한다고 정합니다. 출국심사에서는 유효 여권, 위조·변조 여권 문제, 출입국항이 아닌 장소에서의 심사, 선박·항공기 출입, 생체정보 활용이 함께 문제될 수 있습니다. KAXI는 출국 상담에서 단순 항공권 여부만 보지 말고 여권 유효성, 체류기간 만료일, 출국정지 가능성, 외국인등록증 반납·재입국허가 여부, 공항·항만 출국심사 절차를 함께 확인해야 합니다.
```

### EN — Departure inspection and valid passport check for foreign nationals

```
Immigration Act Article 28 requires a foreign national departing Korea to hold a valid passport and undergo departure inspection by an immigration officer at the departure port. Departure inspection can involve passport validity, forged or altered passport issues, inspection outside ordinary ports, vessel or aircraft procedures, and use of biometric information. KAXI should check passport validity, stay-period expiry, possible departure suspension, alien registration card return or re-entry permission, and airport or seaport departure procedure together.
```

### VI — Kiểm tra xuất cảnh và hộ chiếu hợp lệ của người nước ngoài

```
Điều 28 Luật Quản lý xuất nhập cảnh yêu cầu người nước ngoài khi rời Hàn Quốc phải có hộ chiếu hợp lệ và chịu kiểm tra xuất cảnh tại cửa khẩu xuất cảnh. Khi kiểm tra có thể phát sinh vấn đề hộ chiếu giả hoặc bị sửa đổi, kiểm tra tại nơi không phải cửa khẩu thông thường, tàu bay/tàu biển và sử dụng thông tin sinh trắc học. KAXI cần kiểm tra hiệu lực hộ chiếu, ngày hết hạn lưu trú, khả năng bị đình chỉ xuất cảnh, việc nộp thẻ đăng ký người nước ngoài hoặc giấy phép tái nhập, và quy trình tại sân bay/cảng.
```

### MN — Гадаад иргэний гарах шалгалт ба хүчинтэй паспорт

```
Цагаачлалын хуулийн 28 дугаар зүйлээр гадаад иргэн Солонгосоос гарахдаа хүчинтэй паспорттой байж, гарах боомт дээр цагаачлалын ажилтны гарах шалгалтад орно. Шалгалтад паспортын хүчинтэй байдал, хуурамч/өөрчилсөн паспорт, ердийн боомтоос өөр газарт шалгах, нисэх онгоц/хөлөг онгоц, биометр мэдээлэл ашиглах асуудал орж болно. KAXI гарах зөвлөгөөнд паспорт, хугацаа дуусах өдөр, гарахыг түр зогсоох эрсдэл, бүртгэлийн карт/дахин орох зөвшөөрөл, нисэх буудал/боомтын журмыг шалгана.
```

---

## A1-047 immigration-act-departure-suspension

- 제목: 외국인 출국정지와 이의신청 가능성
- 카테고리: warning
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제29조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0029&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 외국인 출국정지와 이의신청 가능성

```
출입국관리법 제29조는 법무부장관이 제4조 제1항 또는 제2항 각 호에 해당하는 외국인에 대해 출국을 정지할 수 있다고 정합니다. 이 조항은 내국인 출국금지 구조 일부를 준용하므로, 형사재판·수사, 형 집행, 벌금·추징금·세금 등 미납, 공공안전·경제질서 관련 사유가 있으면 출국이 막힐 수 있습니다. KAXI는 '비행기를 타면 나갈 수 있느냐'는 질문에서 체류기간뿐 아니라 출국정지 통지, 사건번호, 체납·벌금·범칙금, 이의신청 또는 해제 신청 가능성을 확인하고 행정사·변호사 검토를 안내해야 합니다.
```

### EN — Departure suspension for foreign nationals and objection route

```
Immigration Act Article 29 allows the Minister of Justice to suspend departure of a foreign national who falls within the referenced Article 4 grounds. Because it borrows parts of the departure-ban framework, criminal trial or investigation, sentence execution, unpaid fines, surcharges or taxes, and public-safety or economic-order grounds can prevent departure. KAXI should not answer departure questions only by checking the flight or stay expiry; it should check any departure-suspension notice, case number, unpaid taxes or fines, and possible objection or cancellation request with administrative-scrivener or attorney review.
```

### VI — Đình chỉ xuất cảnh đối với người nước ngoài và khả năng khiếu nại

```
Điều 29 Luật Quản lý xuất nhập cảnh cho phép Bộ trưởng Tư pháp đình chỉ xuất cảnh đối với người nước ngoài thuộc các căn cứ được viện dẫn từ Điều 4. Cơ chế này áp dụng tương tự một số quy định về cấm xuất cảnh, nên phiên tòa hoặc điều tra hình sự, thi hành án, tiền phạt/thu hồi/thuế chưa nộp, hoặc lý do an toàn công cộng, trật tự kinh tế có thể làm người đó không rời Hàn Quốc được. KAXI phải kiểm tra thông báo đình chỉ, số vụ việc, nợ thuế/phạt, và khả năng khiếu nại hoặc xin gỡ đình chỉ.
```

### MN — Гадаад иргэний гарахыг түр зогсоох ба гомдол гаргах боломж

```
Цагаачлалын хуулийн 29 дүгээр зүйл нь 4 дүгээр зүйлд заасан үндэслэлтэй гадаад иргэний гарахыг Хууль зүйн сайд түр зогсоож болохыг тогтоодог. Эрүүгийн хэрэг, мөрдөн шалгах ажиллагаа, ял биелүүлэх, торгууль/татварын өр, нийтийн аюулгүй байдал, эдийн засгийн дэг журам зэрэг шалтгаан гарч болно. KAXI нислэгээр гарах боломжийг хэлэхдээ зөвхөн визийн хугацааг бус гарахыг зогсоосон мэдэгдэл, хэрэг, өр төлбөр, гомдол эсвэл цуцлуулах хүсэлтийг шалгана.
```

---

## A1-048 immigration-act-reentry-permit

- 제목: 재입국허가와 면제 기준
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제30조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0030&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 재입국허가와 면제 기준

```
출입국관리법 제30조는 외국인등록을 하였거나 등록이 면제된 외국인이 체류기간 내에 출국하였다가 재입국하려는 경우 재입국허가를 받을 수 있는 구조를 정합니다. 재입국허가는 한 차례만 재입국하는 단수재입국허가와 2회 이상 재입국하는 복수재입국허가로 구분됩니다. 영주자격자와 법무부령으로 정하는 재입국허가 면제 사유가 있는 사람은 면제될 수 있으나, 면제 여부와 허가기간은 최신 시행규칙·하이코리아·관할관서 안내를 확인해야 합니다. 허가기간 내 질병 등 부득이한 사유로 재입국할 수 없으면 기간 만료 전에 재입국허가기간 연장허가를 검토해야 합니다.
```

### EN — Re-entry permit and exemption basis

```
Immigration Act Article 30 provides the re-entry permit structure for foreign nationals who have alien registration or are exempt from registration and leave Korea during their stay period before returning. Re-entry permits are divided into single re-entry and multiple re-entry permits. F-5 permanent residents and people with Ministry-of-Justice-rule exemption grounds may be exempt, but current Enforcement Rule, HiKorea, and competent-office guidance must be checked. If illness or another unavoidable reason prevents return within the permit period, re-entry permit period extension should be reviewed before expiry.
```

### VI — Giấy phép tái nhập cảnh và miễn trừ

```
Điều 30 Luật Quản lý xuất nhập cảnh quy định cơ chế giấy phép tái nhập cảnh cho người nước ngoài đã đăng ký hoặc được miễn đăng ký khi ra khỏi Hàn Quốc và muốn tái nhập trong thời hạn lưu trú. Có giấy phép tái nhập một lần và nhiều lần. Người có F-5 hoặc người thuộc diện miễn theo Quy tắc của Bộ Tư pháp có thể được miễn, nhưng cần kiểm tra Quy tắc thi hành, HiKorea và cơ quan có thẩm quyền mới nhất. Nếu không thể tái nhập trong thời hạn vì bệnh hoặc lý do bất khả kháng, cần xin gia hạn thời hạn tái nhập trước khi hết hạn.
```

### MN — Дахин нэвтрэх зөвшөөрөл ба чөлөөлөлт

```
Цагаачлалын хуулийн 30 дугаар зүйл нь бүртгэлтэй эсвэл бүртгэлээс чөлөөлөгдсөн гадаад иргэн оршин суух хугацаандаа гарч дахин орох тохиолдолд дахин нэвтрэх зөвшөөрлийн бүтэц тогтоодог. Нэг удаагийн болон олон удаагийн зөвшөөрөл гэж ангилна. F-5 болон журамд заасан чөлөөлөлтийн тохиолдол байж болох ч одоогийн дүрэм, HiKorea, харьяа байгууллагын зааврыг шалгана. Өвчин зэрэг шалтгаанаар хугацаандаа буцаж орж чадахгүй бол хугацаа дуусахаас өмнө сунгалтыг шалгана.
```

---

## A1-049 immigration-act-alien-registration

- 제목: 외국인등록 90일 의무
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제31조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0031&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 외국인등록 90일 의무

```
출입국관리법 제31조는 외국인이 입국한 날부터 90일을 초과하여 대한민국에 체류하려면 입국한 날부터 90일 이내에 체류지를 관할하는 지방출입국·외국인관서의 장에게 외국인등록을 해야 한다고 정합니다. 체류자격을 새로 부여받거나 체류자격 변경허가를 받아 입국일부터 90일을 초과해 체류하게 되는 경우에는 그 허가를 받을 때 외국인등록 의무가 문제될 수 있습니다. 등록이 완료되면 외국인등록번호가 부여됩니다. KAXI는 외국인등록 상담에서 입국일, 체류예정기간, 현재 체류자격, 관할관서, 제출서류와 예약 가능 여부를 함께 확인해야 합니다.
```

### EN — Alien registration within 90 days

```
Immigration Act Article 31 requires a foreign national who will stay in Korea for more than 90 days from entry to complete alien registration within 90 days at the competent local immigration office for the place of stay. If a person receives a grant of status or status-change permission and will stay more than 90 days from entry, registration may be required at that permission point. After registration, an alien registration number is assigned. KAXI should check entry date, intended stay length, current status, competent office, documents, and reservation availability together.
```

### VI — Nghĩa vụ đăng ký người nước ngoài trong 90 ngày

```
Điều 31 Luật Quản lý xuất nhập cảnh quy định người nước ngoài ở Hàn Quốc quá 90 ngày kể từ ngày nhập cảnh phải đăng ký người nước ngoài trong vòng 90 ngày tại cơ quan xuất nhập cảnh có thẩm quyền theo nơi cư trú. Nếu được cấp tư cách lưu trú hoặc đổi tư cách và vì vậy ở quá 90 ngày, nghĩa vụ đăng ký có thể phát sinh tại thời điểm được cấp/đổi tư cách. Sau khi đăng ký sẽ được cấp số đăng ký người nước ngoài. KAXI cần kiểm tra ngày nhập cảnh, thời gian dự kiến ở lại, tư cách hiện tại, cơ quan có thẩm quyền, hồ sơ và khả năng đặt lịch.
```

### MN — 90 хоногийн дотор гадаад иргэний бүртгэл

```
Цагаачлалын хуулийн 31 дүгээр зүйлээр гадаад иргэн орж ирсэн өдрөөс 90 хоногоос дээш Солонгост байх бол 90 хоногийн дотор оршин суугаа газрын харьяа цагаачлалын байгууллагад бүртгүүлэх ёстой. Оршин суух ангилал олгогдсон эсвэл өөрчлөгдсөнөөр 90 хоногоос дээш байх болсон бол зөвшөөрөл авах үед бүртгэлийн үүрэг үүсэж болно. Бүртгүүлсний дараа гадаад иргэний бүртгэлийн дугаар олгоно. KAXI нь орсон огноо, байх хугацаа, одоогийн ангилал, харьяа байгууллага, материал ба цаг захиалгыг шалгана.
```

---

## A1-050 immigration-act-registration-change-report

- 제목: 외국인등록사항 변경신고 15일 의무
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제35조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0035&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 외국인등록사항 변경신고 15일 의무

```
출입국관리법 제35조는 등록외국인의 성명, 성별, 생년월일, 국적 또는 여권의 번호·발급일자·유효기간이 변경되었을 때 15일 이내에 체류지 관할 지방출입국·외국인관서의 장에게 외국인등록사항 변경신고를 해야 한다고 정합니다. 여권 갱신, 국적 변경, 이름 표기 변경처럼 단순해 보이는 변경도 신고기한을 놓치면 과태료·체류심사 리스크가 생길 수 있습니다. KAXI는 여권을 새로 받았는지, 변경일이 언제인지, 외국인등록증·여권 등 제출자료와 전자민원 가능 여부를 확인해야 합니다.
```

### EN — Registration information change report within 15 days

```
Immigration Act Article 35 requires registered foreign nationals to report within 15 days when name, gender, date of birth, nationality, passport number, passport issue date, or passport expiry date changes. Passport renewal, nationality change, or name-spelling changes can create fine or stay-review risk if the deadline is missed. KAXI should check the change date, new passport, alien registration card, required materials, and whether e-application is available.
```

### VI — Nghĩa vụ khai báo thay đổi thông tin đăng ký trong 15 ngày

```
Điều 35 Luật Quản lý xuất nhập cảnh yêu cầu người nước ngoài đã đăng ký phải khai báo thay đổi trong vòng 15 ngày khi thay đổi họ tên, giới tính, ngày sinh, quốc tịch hoặc số hộ chiếu, ngày cấp, ngày hết hạn hộ chiếu. Việc đổi hộ chiếu, đổi quốc tịch hoặc đổi cách ghi tên cũng có thể tạo rủi ro phạt tiền hoặc bất lợi khi xét lưu trú nếu quá hạn. KAXI cần kiểm tra ngày thay đổi, hộ chiếu mới, thẻ đăng ký người nước ngoài và khả năng khai báo điện tử.
```

### MN — Бүртгэлийн мэдээлэл өөрчлөгдвөл 15 хоногийн дотор мэдэгдэх

```
Цагаачлалын хуулийн 35 дугаар зүйлээр бүртгэлтэй гадаад иргэний нэр, хүйс, төрсөн огноо, иргэншил эсвэл паспортын дугаар, олгосон өдөр, хүчинтэй хугацаа өөрчлөгдвөл 15 хоногийн дотор харьяа байгууллагад бүртгэлийн мэдээлэл өөрчлөгдсөнийг мэдэгдэх ёстой. Паспорт шинэчлэх, иргэншил өөрчлөх, нэрийн бичлэг өөрчлөх зэрэг нь хугацаа хэтэрвэл торгууль, оршин суух шалгалтын эрсдэл үүсгэнэ. KAXI өөрчлөгдсөн өдөр, шинэ паспорт, бүртгэлийн карт, цахим мэдүүлгийг шалгана.
```

---

## A1-051 immigration-act-address-change-report

- 제목: 체류지 변경신고 15일 의무
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제36조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0036&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 체류지 변경신고 15일 의무

```
출입국관리법 제36조는 등록외국인이 체류지를 변경했을 때 전입한 날부터 15일 이내에 새로운 체류지의 시·군·구 또는 읍·면·동의 장이나 새 체류지를 관할하는 지방출입국·외국인관서의 장에게 전입신고를 해야 한다고 정합니다. 신고 시 외국인등록증을 제출해야 하며, 시행령 제45조는 체류지 변경신고서와 법무부령 서류를 제출하고 정보통신망을 이용할 수 있다고 정합니다. 이사, 기숙사 이동, 임대차 변경 상담에서는 실제 전입일, 새 주소 증빙, 관할관서·지자체 접수 가능 여부, 온라인 신고 가능 여부를 확인해야 합니다.
```

### EN — Place-of-stay change report within 15 days

```
Immigration Act Article 36 requires a registered foreign national who changes place of stay to report within 15 days from moving in to either the local government office for the new place of stay or the competent immigration office. The alien registration card must be submitted, and Enforcement Decree Article 45 provides for a place-of-stay change report with Ministry-of-Justice-rule documents and possible use of the designated information network. For moving, dormitory changes, or lease changes, KAXI should check actual move-in date, new-address proof, competent local or immigration office, and online-report availability.
```

### VI — Nghĩa vụ khai báo thay đổi nơi cư trú trong 15 ngày

```
Điều 36 Luật Quản lý xuất nhập cảnh yêu cầu người nước ngoài đã đăng ký khi thay đổi nơi cư trú phải khai báo trong vòng 15 ngày kể từ ngày chuyển đến, tại cơ quan hành chính địa phương hoặc cơ quan xuất nhập cảnh có thẩm quyền theo nơi cư trú mới. Khi khai báo phải nộp thẻ đăng ký người nước ngoài; Điều 45 Nghị định thi hành quy định có thể nộp đơn thay đổi nơi cư trú và giấy tờ theo Quy tắc, có thể sử dụng mạng thông tin do Bộ Tư pháp quy định. Khi tư vấn chuyển nhà/ký túc xá/hợp đồng thuê, cần kiểm tra ngày chuyển thực tế, chứng minh địa chỉ mới, nơi tiếp nhận và khả năng khai báo online.
```

### MN — Оршин суугаа газар өөрчлөгдвөл 15 хоногийн дотор мэдэгдэх

```
Цагаачлалын хуулийн 36 дугаар зүйлээр бүртгэлтэй гадаад иргэн оршин суугаа газраа өөрчилсөн бол шилжсэн өдрөөс 15 хоногийн дотор шинэ газрын захиргаа эсвэл харьяа цагаачлалын байгууллагад мэдэгдэх ёстой. Мэдүүлэхдээ гадаад иргэний бүртгэлийн картыг өгнө; хэрэгжүүлэх журмын 45 дугаар зүйл нь мэдүүлгийн маягт, шаардлагатай баримт болон мэдээллийн сүлжээ ашиглах боломжийг заадаг. Нүүх, дотуур байр солих, түрээсийн өөрчлөлтөд бодит шилжсэн өдөр, шинэ хаягийн нотолгоо, хаана хүлээн авах, онлайн мэдүүлгийг шалгана.
```

---

## A1-052 immigration-act-arc-return-duty

- 제목: 외국인등록증 반납과 일시 보관
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제37조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0037&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 외국인등록증 반납과 일시 보관

```
출입국관리법 제37조는 등록외국인이 출국하거나 대한민국 국적을 취득하거나 사망하는 등 사유가 생겼을 때 외국인등록증 반납·회수 구조를 정합니다. 출국 시에는 원칙적으로 출입국관리공무원에게 등록증을 반납하지만, 재입국허가를 받았거나 복수사증 소지 등 예외가 있으면 반납하지 않는 구조가 문제될 수 있습니다. 일시 보관된 등록증은 다시 입국한 뒤 15일 이내 되찾아야 하는 경우가 있으므로, KAXI는 출국 목적, 재입국허가·면제 여부, 복수사증 여부, 국적취득·사망·분실 사유, 반납 또는 회수 시점을 확인해야 합니다.
```

### EN — Alien registration card return and temporary retention

```
Immigration Act Article 37 sets the return and collection framework for an alien registration card when a registered foreign national departs, acquires Korean nationality, dies, or has a similar ground arise. On departure, the card is generally returned to an immigration officer, but exceptions such as re-entry permission or a multiple-entry visa may matter. If the card is temporarily retained, it may need to be recovered within 15 days after re-entry. KAXI should check departure purpose, re-entry permission or exemption, multiple-visa status, nationality acquisition, death or loss grounds, and the return or collection timing.
```

### VI — Nộp lại và tạm giữ thẻ đăng ký người nước ngoài

```
Điều 37 Luật Quản lý xuất nhập cảnh quy định cơ chế nộp lại hoặc thu hồi thẻ đăng ký người nước ngoài khi người đã đăng ký xuất cảnh, nhập quốc tịch Hàn Quốc, tử vong hoặc phát sinh lý do tương tự. Khi xuất cảnh, về nguyên tắc thẻ được nộp cho cán bộ xuất nhập cảnh, nhưng có thể có ngoại lệ như giấy phép tái nhập cảnh hoặc thị thực nhiều lần. Nếu thẻ được tạm giữ, có trường hợp phải nhận lại trong vòng 15 ngày sau khi tái nhập. KAXI cần kiểm tra mục đích xuất cảnh, tái nhập, thị thực nhiều lần, quốc tịch, tử vong, mất thẻ và thời điểm nộp hoặc thu hồi.
```

### MN — Гадаад иргэний бүртгэлийн карт буцаах ба түр хадгалуулах

```
Цагаачлалын хуулийн 37 дугаар зүйл нь бүртгэлтэй гадаад иргэн гарах, Солонгосын иргэншил авах, нас барах зэрэг үед бүртгэлийн картыг буцаах эсвэл хураах бүтцийг тогтоодог. Гарах үед зарчмаар картыг цагаачлалын ажилтанд буцаадаг боловч дахин нэвтрэх зөвшөөрөл, олон удаагийн виз зэрэг онцгой нөхцөл байж болно. Түр хадгалуулсан картыг дахин орсны дараа 15 хоногийн дотор авах шаардлагатай тохиолдол байдаг. KAXI гарах зорилго, дахин орох зөвшөөрөл/чөлөөлөлт, олон виз, иргэншил, нас баралт, алдагдал, буцаах хугацааг шалгана.
```

---

## A1-053 immigration-act-biometric-information-duty

- 제목: 외국인 생체정보 제공 의무
- 카테고리: process
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제38조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0038&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 외국인 생체정보 제공 의무

```
출입국관리법 제38조는 일정한 외국인에게 지문·얼굴정보 등 생체정보 제공 의무를 둡니다. 17세 이상으로 외국인등록을 하거나 국내거소신고를 하는 사람, 신원 확인이 필요한 조사 대상자 등은 생체정보 제공이 문제될 수 있고, 정당한 사유 없이 제공을 거부하면 체류기간 연장허가 등 체류 관련 허가가 불허될 수 있습니다. KAXI는 외국인등록, 국내거소신고, 조사·단속, 지문 채취 거부 상담에서 나이, 신청 유형, 거부 사유, 이전 등록 이력, 관할관서 안내를 확인해야 합니다.
```

### EN — Foreign-national biometric information duty

```
Immigration Act Article 38 requires biometric information such as fingerprints and facial information from certain foreign nationals. A person aged 17 or older who completes alien registration or a domestic residence report, or a person whose identity needs confirmation during investigation, may fall within the duty. Refusal without a legitimate reason can lead to denial of stay-related permissions such as extension. KAXI should check age, application type, refusal reason, prior registration history, and competent-office guidance.
```

### VI — Nghĩa vụ cung cấp thông tin sinh trắc học của người nước ngoài

```
Điều 38 Luật Quản lý xuất nhập cảnh đặt nghĩa vụ cung cấp thông tin sinh trắc học như vân tay và khuôn mặt đối với một số người nước ngoài. Người từ 17 tuổi trở lên khi đăng ký người nước ngoài hoặc khai báo cư trú trong nước, hoặc người cần xác minh danh tính trong quá trình điều tra, có thể phải cung cấp thông tin này. Nếu từ chối không có lý do chính đáng, các phép liên quan đến lưu trú như gia hạn có thể bị từ chối. KAXI cần kiểm tra tuổi, loại hồ sơ, lý do từ chối, lịch sử đăng ký và hướng dẫn của cơ quan có thẩm quyền.
```

### MN — Гадаад иргэний биометр мэдээлэл өгөх үүрэг

```
Цагаачлалын хуулийн 38 дугаар зүйл нь тодорхой гадаад иргэнд хурууны хээ, нүүрний мэдээлэл зэрэг биометр мэдээлэл өгөх үүрэг тогтоодог. 17 ба түүнээс дээш настай бүртгэл хийлгэх эсвэл дотоод оршин суух мэдэгдэл гаргах хүн, мөн шалгалтад иргэний үнэмлэх тогтоох шаардлагатай хүн энэ үүрэгт хамрагдаж болно. Хүндэтгэх шалтгаангүйгээр татгалзвал хугацаа сунгах зэрэг оршин суух зөвшөөрөл татгалзагдаж болзошгүй. KAXI нас, хүсэлтийн төрөл, татгалзсан шалтгаан, өмнөх бүртгэл, харьяа байгууллагын зааврыг шалгана.
```

---

## A1-054 immigration-act-deportation-grounds

- 제목: 강제퇴거 대상과 영주자격 예외
- 카테고리: warning
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제46조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0046&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 강제퇴거 대상과 영주자격 예외

```
출입국관리법 제46조는 강제퇴거 대상 사유를 묶어 두는 핵심 제재 조항입니다. 입국·상륙 관련 위반, 체류자격·체류기간·활동범위 위반, 취업 가능 자격 없는 취업 또는 지정 근무처 위반, 체류자격외활동·변경·연장 등 허가 위반, 허위서류 제출, 외국인등록 의무 위반, 중대한 형사처벌 등이 강제퇴거 리스크로 이어질 수 있습니다. 영주자격자는 원칙적으로 보호가 있으나 내란·외환 범죄, 일정한 중형 선고, 밀입국 관련 중대 위반 등 예외가 있으므로, KAXI는 무허가취업·허위서류·장기 불법체류·형사사건이 보이면 단정 답변을 피하고 결정서·통지서·체류이력 확인과 행정사 검토를 우선해야 합니다.
```

### EN — Deportation grounds and permanent-residence exception

```
Immigration Act Article 46 is the core deportation-ground provision. Entry or landing violations, stay-status or stay-period violations, unauthorized work or designated-workplace violations, violations of outside-status activity, change, or extension permissions, false documents, alien-registration violations, and serious criminal matters can create deportation risk. F-5 permanent residents have baseline protection but serious exceptions remain. Where unauthorized work, false documents, long overstay, or criminal proceedings appear, KAXI should avoid definitive advice and require review of notices, orders, stay history, and administrative-scrivener guidance.
```

### VI — Căn cứ trục xuất bắt buộc và ngoại lệ thường trú

```
Điều 46 là điều khoản chế tài trung tâm về các căn cứ trục xuất. Vi phạm nhập cảnh/hạ cánh, vi phạm tư cách hoặc thời hạn lưu trú, làm việc không có tư cách hoặc ngoài nơi làm việc được chỉ định, vi phạm các phép hoạt động ngoài tư cách/đổi/gia hạn, hồ sơ giả, vi phạm đăng ký người nước ngoài và án hình sự nghiêm trọng đều có thể dẫn đến rủi ro trục xuất. Người có F-5 được bảo vệ theo nguyên tắc nhưng vẫn có ngoại lệ nghiêm trọng; khi có làm việc trái phép, hồ sơ giả, quá hạn dài ngày hoặc án hình sự, KAXI phải yêu cầu kiểm tra quyết định/thông báo/lịch sử lưu trú và tư vấn chuyên gia.
```

### MN — Албадан гаргах үндэслэл ба байнгын оршин суугчийн онцгой тохиолдол

```
46 дугаар зүйл нь албадан гаргах үндэслэлийг тогтоодог гол заалт. Нэвтрэх/буухтай холбоотой зөрчил, оршин суух ангилал/хугацаа/үйл ажиллагааны зөрчил, ажиллах эрхгүй ажиллах эсвэл заасан ажлын байрнаас өөр газар ажиллах, зөвшөөрөлгүй өөр үйл ажиллагаа/өөрчлөлт/сунгалт, хуурамч материал, бүртгэлийн үүрэг зөрчих, хүнд эрүүгийн хэрэг зэрэг нь албадан гаргах эрсдэл болдог. F-5 эрхтэй хүн зарчмаар хамгаалалттай боловч ноцтой онцгой тохиолдол бий; KAXI шийдвэр/мэдэгдэл/түүхийг шалгуулж мэргэжлийн зөвлөгөө рүү чиглүүлнэ.
```

---

## A1-055 immigration-act-detention-order

- 제목: 보호명령서·긴급보호와 48시간 요건
- 카테고리: warning
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제51조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0051&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 4

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 보호명령서·긴급보호와 48시간 요건

```
출입국관리법 제51조는 강제퇴거 사유에 해당한다고 의심할 상당한 이유가 있고 도주하거나 도주할 염려가 있는 외국인에 대한 보호명령 구조를 정합니다. 원칙적으로 출입국관리공무원은 지방출입국·외국인관서의 장으로부터 보호명령서를 발급받아 보호할 수 있고, 보호명령서 신청에는 보호 필요성을 인정할 자료가 첨부되어야 합니다. 긴급한 경우에는 먼저 긴급보호를 할 수 있지만 즉시 긴급보호서를 보여주어야 하고, 48시간 이내 보호명령서를 발급받아 보여주지 못하면 즉시 보호를 해제해야 합니다. KAXI는 단속·조사·보호 상담에서 보호명령서 존재, 긴급보호서 제시 여부, 보호 개시 시각, 48시간 경과 여부, 도주 우려 근거, 제46조 사유와 이의신청·일시해제 가능성을 함께 확인해야 합니다.
```

### EN — Detention/protection order, emergency protection, and 48-hour rule

```
Immigration Act Article 51 sets the protection or detention-order structure for a foreign national where there are reasonable grounds to suspect Article 46 deportation grounds and the person has fled or is likely to flee. In principle, an immigration officer may protect the person after obtaining a protection order from the head of the local immigration office, and the application must include materials showing the need for protection. In an emergency, the person may be protected first, but an emergency protection document must be shown immediately. If a protection order is not issued and shown within 48 hours, protection must be released immediately. KAXI should check the order, emergency document, protection start time, 48-hour deadline, flight-risk basis, Article 46 grounds, and objection or temporary-release options.
```

### VI — Lệnh bảo hộ, bảo hộ khẩn cấp và yêu cầu 48 giờ

```
Điều 51 Luật Quản lý xuất nhập cảnh quy định lệnh bảo hộ đối với người nước ngoài có lý do đáng kể để nghi ngờ thuộc căn cứ trục xuất và đang bỏ trốn hoặc có nguy cơ bỏ trốn. Về nguyên tắc, công chức xuất nhập cảnh phải được người đứng đầu cơ quan xuất nhập cảnh địa phương cấp lệnh bảo hộ; hồ sơ xin lệnh phải kèm tài liệu chứng minh sự cần thiết của việc bảo hộ. Trong trường hợp khẩn cấp có thể bảo hộ trước, nhưng phải lập và xuất trình giấy bảo hộ khẩn cấp ngay; nếu trong vòng 48 giờ không được cấp và xuất trình lệnh bảo hộ thì phải chấm dứt bảo hộ ngay. KAXI cần kiểm tra lệnh bảo hộ, giấy khẩn cấp, thời điểm bắt đầu, mốc 48 giờ, căn cứ nguy cơ bỏ trốn, căn cứ Điều 46 và khả năng khiếu nại hoặc tạm giải tỏa bảo hộ.
```

### MN — Хамгаалах тушаал, яаралтай хамгаалалт ба 48 цагийн шаардлага

```
Цагаачлалын хуулийн 51 дүгээр зүйл нь албадан гаргах үндэслэлтэй гэж сэжиглэх хангалттай шалтгаан, зугтах эсвэл зугтах эрсдэл байгаа гадаад иргэнийг хамгаалах тушаалаар байлгах журмыг тогтоодог. Зарчим нь цагаачлалын ажилтан орон нутгийн байгууллагын даргаас хамгаалах тушаал авч байж хамгаална; хүсэлтэд хамгаалах шаардлагыг нотлох материал хавсаргана. Яаралтай үед түрүүлж хамгаалж болох боловч яаралтай хамгаалах бичгийг шууд үзүүлэх ёстой бөгөөд 48 цагийн дотор хамгаалах тушаал авч үзүүлж чадахгүй бол хамгаалалтыг даруй дуусгана. KAXI тушаал, яаралтай бичиг, эхэлсэн цаг, 48 цаг, зугтах эрсдэл, 46 дугаар зүйл, гомдол/түр чөлөөлөх боломжийг шалгана.
```

---

## A1-056 immigration-act-deportation-objection

- 제목: 강제퇴거명령 이의신청 7일 기한
- 카테고리: warning
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제60조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0060&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 강제퇴거명령 이의신청 7일 기한

```
출입국관리법 제60조는 강제퇴거명령에 대한 이의신청 절차를 정합니다. 강제퇴거명령서를 받은 사람은 받은 날부터 7일 이내 지방출입국·외국인관서의 장을 거쳐 법무부장관에게 이의신청서를 제출해야 합니다. 관서장은 심사결정서와 조사기록을 첨부해 제출하고, 법무부장관의 결정에 따라 이유 있으면 지체 없이 통지하고 보호 중인 경우 보호를 해제해야 합니다. KAXI는 강제퇴거 상담에서 통지서 수령일, 7일 기한, 송달 방식, 보호 여부, 조사기록·소명자료, 별도 행정소송·집행정지 검토 필요성을 즉시 확인해야 합니다.
```

### EN — Seven-day objection period for deportation orders

```
Immigration Act Article 60 sets the objection procedure for a deportation order. A person who receives a deportation order must submit an objection to the Minister of Justice through the head of the local immigration office within seven days from receipt. The office forwards the review decision and investigation records, and if the objection is found to have grounds, the person must be notified and released if under detention or protection. KAXI should immediately check receipt date, the seven-day deadline, service method, detention status, supporting records, and whether separate administrative litigation or stay of execution needs professional review.
```

### VI — Thời hạn 7 ngày khiếu nại lệnh trục xuất

```
Điều 60 Luật Quản lý xuất nhập cảnh quy định thủ tục khiếu nại đối với lệnh trục xuất. Người nhận lệnh phải nộp đơn khiếu nại cho Bộ trưởng Tư pháp thông qua cơ quan xuất nhập cảnh trong vòng 7 ngày kể từ ngày nhận lệnh. Cơ quan tiếp nhận gửi kèm quyết định thẩm tra và hồ sơ điều tra; nếu khiếu nại có căn cứ, người đang bị giữ phải được thông báo và được chấm dứt giữ theo quyết định. KAXI cần kiểm tra ngày nhận lệnh, thời hạn 7 ngày, cách tống đạt, tình trạng bị giữ, hồ sơ giải trình và khả năng cần kiện hành chính hoặc xin đình chỉ thi hành.
```

### MN — Албадан гаргах тушаалд 7 хоногийн дотор гомдол гаргах

```
Цагаачлалын хуулийн 60 дугаар зүйл нь албадан гаргах тушаалд гомдол гаргах журмыг тогтоодог. Тушаал авсан хүн авсан өдрөөс 7 хоногийн дотор орон нутгийн цагаачлалын байгууллагаар дамжуулан Хууль зүйн сайдад гомдол гаргах ёстой. Байгууллага шалгалтын шийдвэр, мөрдөн шалгах материалыг хавсаргана; гомдол үндэслэлтэй бол мэдэгдэж, хамгаалалтад байгаа бол суллах ёстой. KAXI тушаал авсан өдөр, 7 хоногийн хугацаа, хүргүүлсэн хэлбэр, хамгаалалт, тайлбар нотолгоо, захиргааны маргаан/гүйцэтгэл зогсоох боломжийг шалгана.
```

---

## A1-057 immigration-act-deportation-detention

- 제목: 강제퇴거명령 후 보호기간과 연장 한계
- 카테고리: warning
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제63조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0063&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 4

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 강제퇴거명령 후 보호기간과 연장 한계

```
출입국관리법 제63조는 강제퇴거명령 후 보호소 또는 보호시설에 얼마나 보호될 수 있는지, 즉 즉시 송환할 수 없는 경우의 보호기간과 연장 한계를 정합니다. 여권이 없거나 교통편이 확보되지 않는 등 사유가 있으면 2개월 범위에서 송환할 수 있을 때까지 보호시설에 보호할 수 있고, 2개월 후에도 송환할 수 없으면 외국인보호위원회 승인으로 매 3개월 범위에서 연장할 수 있습니다. 총 보호기간은 원칙적으로 9개월을 넘을 수 없지만, 난민신청·소송으로 송환 절차가 지연되거나 중대한 범죄 사유가 있으면 20개월 한계가 문제될 수 있습니다. KAXI는 보호 상담에서 강제퇴거명령일, 보호 개시일, 여권·항공편 확보 여부, 송환 협조 여부, 난민·소송 진행, 보호기간 연장 승인 여부를 확인해야 합니다.
```

### EN — Detention/protection period after deportation order

```
Immigration Act Article 63 governs protection or detention after a deportation order when immediate repatriation is not possible. If the person lacks a passport, transportation is unavailable, or similar grounds exist, the person may be held in a protection facility for up to two months until repatriation becomes possible. If repatriation remains impossible after two months, extensions of up to three months at a time require prior approval from the Foreigners' Protection Committee. The total period is generally capped at nine months, but a twenty-month cap may arise where repatriation is delayed by refugee applications or litigation, or specified serious-crime grounds. KAXI should check the deportation-order date, protection start date, passport and flight availability, cooperation with repatriation, refugee or litigation status, and extension approvals.
```

### VI — Thời hạn giữ sau lệnh trục xuất và giới hạn gia hạn

```
Điều 63 Luật Quản lý xuất nhập cảnh quy định việc giữ người đã nhận lệnh trục xuất khi chưa thể đưa họ ra khỏi Hàn Quốc ngay. Nếu không có hộ chiếu, chưa có phương tiện vận chuyển hoặc có lý do tương tự, người đó có thể bị giữ tại cơ sở bảo hộ trong phạm vi 2 tháng cho đến khi có thể hồi hương; sau 2 tháng, việc gia hạn từng đợt tối đa 3 tháng cần phê chuẩn của Ủy ban bảo hộ người nước ngoài. Tổng thời gian giữ theo nguyên tắc không quá 9 tháng, nhưng có thể phát sinh giới hạn 20 tháng trong trường hợp thủ tục hồi hương bị trì hoãn do xin tị nạn/kiện tụng hoặc một số tội nghiêm trọng. KAXI phải kiểm tra ngày lệnh, ngày bắt đầu giữ, hộ chiếu/chuyến bay, hợp tác hồi hương, tị nạn/kiện tụng và phê chuẩn gia hạn.
```

### MN — Албадан гаргах тушаалын дараах хамгаалах хугацаа ба сунгалтын хязгаар

```
Цагаачлалын хуулийн 63 дугаар зүйл нь албадан гаргах тушаал авсан хүнийг шууд буцаах боломжгүй үед хамгаалах журмыг тогтоодог. Паспортгүй, тээврийн хэрэгсэлгүй зэрэг шалтгаан байвал буцаах хүртэл 2 сарын хүрээнд хамгаалах байгууламжид байлгаж болно; 2 сарын дараа ч буцаах боломжгүй бол Гадаад иргэний хамгаалах зөвлөлийн зөвшөөрлөөр 3 сарын хүрээнд сунгана. Нийт хугацаа зарчмаар 9 сараас хэтрэхгүй боловч дүрвэгчийн хүсэлт/шүүх маргаан эсвэл ноцтой гэмт хэрэгтэй бол 20 сарын хязгаар асуудал болно. KAXI тушаалын өдөр, хамгаалах эхэлсэн өдөр, паспорт/нислэг, хамтран ажилласан эсэх, дүрвэгч/шүүх ажиллагаа, сунгалтын зөвшөөрлийг шалгана.
```

---

## A1-058 immigration-act-detention-temporary-release

- 제목: 보호의 일시해제와 보증금·조건
- 카테고리: warning
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제65조
- 출처 URL: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0065&lsiSeq=272921&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 4

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 보호의 일시해제와 보증금·조건

```
출입국관리법 제65조는 보호 중인 외국인의 보호 일시해제 제도를 정합니다. 지방출입국·외국인관서장은 직권으로 피보호자의 정상, 해제요청 사유, 자산 등을 고려해 2천만원 이하의 보증금을 예치시키고 주거 제한, 정기 보고, 신원보증인 지정 등 조건을 붙여 보호를 일시해제할 수 있습니다. 외국인보호위원회도 피보호자, 보증인 또는 법정대리인 등의 신청을 받아 일시해제를 결정할 수 있고, 결정이 있으면 관서장은 보호를 일시해제해야 합니다. KAXI는 보호 일시해제 상담에서 보호 사유와 기간, 가족·질병·출국준비 등 해제 요청 사유, 보증금 가능성, 주거·보고 조건 이행 가능성, 보증인·대리인 신청권과 취소 위험을 확인해야 합니다.
```

### EN — Temporary release from immigration protection, bond, and conditions

```
Immigration Act Article 65 provides temporary release from immigration protection or detention. The head of the local immigration office may release the protected person ex officio after considering circumstances, release-request grounds, assets, and related factors, with a bond of up to 20 million won and conditions such as residence restrictions, regular reporting, or designation of a guarantor. The Foreigners' Protection Committee may also decide temporary release on application by the protected person, guarantor, or legal representative, and the office must release the person when such a decision is made. KAXI should check protection grounds and duration, release-request reasons such as family, illness, or departure preparation, bond feasibility, ability to comply with residence and reporting conditions, guarantor or representative standing, and cancellation risk.
```

### VI — Tạm giải tỏa bảo hộ, tiền bảo đảm và điều kiện

```
Điều 65 Luật Quản lý xuất nhập cảnh quy định việc tạm giải tỏa bảo hộ đối với người đang bị bảo hộ. Người đứng đầu cơ quan xuất nhập cảnh địa phương có thể tự quyết định tạm giải tỏa sau khi xem xét hoàn cảnh của người bị bảo hộ, lý do yêu cầu, tài sản và các yếu tố khác, với tiền bảo đảm tối đa 20 triệu won và các điều kiện như hạn chế nơi cư trú, báo cáo định kỳ hoặc chỉ định người bảo lãnh. Ủy ban bảo hộ người nước ngoài cũng có thể quyết định theo đơn của người bị bảo hộ, người bảo lãnh hoặc đại diện pháp luật; khi có quyết định thì cơ quan phải tạm giải tỏa bảo hộ. KAXI cần kiểm tra lý do và thời gian bảo hộ, lý do xin thả tạm, khả năng nộp bảo đảm, khả năng tuân thủ điều kiện cư trú/báo cáo, người bảo lãnh/đại diện và rủi ro bị hủy.
```

### MN — Хамгаалалтаас түр чөлөөлөх, барьцаа ба нөхцөл

```
Цагаачлалын хуулийн 65 дугаар зүйл нь хамгаалалтад байгаа хүнийг хамгаалалтаас түр чөлөөлөх журмыг тогтоодог. Орон нутгийн цагаачлалын байгууллагын дарга хүний нөхцөл байдал, чөлөөлөх хүсэлтийн шалтгаан, хөрөнгө зэргийг харгалзан 20 сая воноос ихгүй барьцаа, оршин суух газрын хязгаар, тогтмол тайлагнах, батлан даагч томилох зэрэг нөхцөлтэйгөөр түр чөлөөлж болно. Гадаад иргэний хамгаалах зөвлөл мөн хамгаалагдаж буй хүн, батлан даагч эсвэл хууль ёсны төлөөлөгчийн хүсэлтээр шийдвэр гаргаж болох бөгөөд шийдвэр гарвал байгууллага түр чөлөөлөх ёстой. KAXI хамгаалалтын шалтгаан/хугацаа, гэр бүл/өвчин/гарах бэлтгэл, барьцаа, хаяг/тайлагнах нөхцөл, батлан даагч/төлөөлөгч, цуцлах эрсдэлийг шалгана.
```

---

## A1-059 immigration-act-departure-recommendation-order

- 제목: 출국권고·출국명령과 불이행 리스크
- 카테고리: warning
- 출처 라벨: 국가법령정보센터 · 출입국관리법 제67조·제68조
- 출처 URL: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-01-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 4

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 출국권고·출국명령과 불이행 리스크

```
출입국관리법 제67조는 위반 정도가 가볍거나 법무부장관이 필요하다고 인정하는 경우 지방출입국·외국인관서장이 자진 출국을 권고할 수 있게 하고, 출국권고서에는 발급일부터 5일 범위의 출국기한이 붙을 수 있습니다. 제68조는 강제퇴거 사유가 있으나 자기비용으로 자진 출국하려는 사람, 출국권고를 이행하지 않은 사람, 허가 취소·과태료·통고처분 후 출국조치가 타당한 사람 등에 대해 출국명령을 할 수 있게 합니다. 출국명령에는 기한, 주거 제한, 조건, 이행보증금이 붙을 수 있고, 기한을 넘기거나 조건을 위반하면 강제퇴거명령서가 발급될 수 있으므로 KAXI는 사용자의 통지서 종류·발급일·기한·조건부터 확인해야 합니다.
```

### EN — Departure recommendation, departure order, and non-compliance risk

```
Immigration Act Articles 67 and 68 distinguish departure recommendation from departure order. A departure recommendation can be issued for light violations or other cases where voluntary departure is considered necessary, and it may set a short deadline from issuance. A departure order can apply where deportation grounds exist but the person will leave at their own expense, where a recommendation was not followed, or after cancellation, administrative fine, or notice disposition where departure is considered appropriate. Orders may include a deadline, residence restrictions, conditions, and a performance bond; missing the deadline or breaching conditions can lead to a deportation order. KAXI should first identify the notice type, issue date, deadline, and conditions.
```

### VI — Khuyến nghị xuất cảnh, lệnh xuất cảnh và rủi ro không thực hiện

```
Điều 67 cho phép cơ quan xuất nhập cảnh khuyến nghị người nước ngoài tự nguyện xuất cảnh khi mức vi phạm nhẹ hoặc cần thiết; giấy khuyến nghị có thể ấn định thời hạn trong phạm vi 5 ngày từ ngày cấp. Điều 68 cho phép ra lệnh xuất cảnh đối với người có căn cứ trục xuất nhưng muốn tự trả chi phí để rời đi, người không thực hiện khuyến nghị xuất cảnh, hoặc trường hợp bị hủy phép/xử phạt mà cần cho xuất cảnh. Lệnh có thể kèm thời hạn, hạn chế cư trú, điều kiện và tiền bảo đảm; nếu không rời đi đúng hạn hoặc vi phạm điều kiện, có thể chuyển sang lệnh trục xuất.
```

### MN — Гарах зөвлөмж, гарах тушаал ба биелүүлэхгүй байх эрсдэл

```
67 дугаар зүйл нь зөрчил хөнгөн эсвэл шаардлагатай гэж үзвэл цагаачлалын байгууллага өөрийн хүсэлтээр гарахыг зөвлөж болохыг заана; зөвлөмжид олгосон өдрөөс 5 хоногийн доторх хугацаа заагдаж болно. 68 дугаар зүйл нь албадан гаргах үндэслэлтэй боловч өөрийн зардлаар гарах хүн, гарах зөвлөмж биелүүлээгүй хүн, зөвшөөрөл цуцлагдсан эсвэл торгууль/мэдэгдэл авсан хүнийг гарах тушаалаар гаргах боломжтой. Хугацаа, оршин суух хязгаар, нөхцөл, баталгааны мөнгө хавсардаг тул KAXI эхлээд мэдэгдлийн төрөл, огноо, хугацаа, нөхцөлийг шалгана.
```

---

## A1-060 immigration-rule-documents-attachments

- 제목: 시행규칙상 첨부서류·아포스티유 확인
- 카테고리: documents
- 출처 라벨: 국가법령정보센터 · 출입국관리법 시행규칙
- 출처 URL: https://www.law.go.kr/LSW//lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0076&lsiSeq=283059&urlMode=lsScJoRltInfoR
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 시행규칙상 첨부서류·아포스티유 확인

```
출입국관리법 시행규칙 제76조는 사증발급 등 신청의 체류자격별 첨부서류를 별표 5와 별표 5의2로 연결합니다. 별표 5의2는 체류자격외활동, 근무처 변경·추가, 체류자격부여, 체류자격변경, 체류기간연장, 외국인등록 등 국내 체류 민원의 신청구분별 첨부서류를 정합니다. 해외 발급 서류는 국가·문서별로 아포스티유 또는 영사확인, 번역·공증 필요 여부를 확인해야 하며, 담당 공무원은 심사 중 추가 자료를 요구할 수 있습니다.
```

### EN — Attachments and apostille under the Enforcement Rule

```
Article 76 of the Enforcement Rule links visa and stay petition attachments to Tables 5 and 5-2. Table 5-2 covers attachments for outside-status activity, workplace changes/additions, grant of status, change of status, extension of stay, and alien registration. Foreign-issued documents may require apostille or consular confirmation, translation, and notarization, and immigration officers may request additional materials during review.
```

### VI — Hồ sơ đính kèm và apostille theo Quy tắc thi hành

```
Điều 76 của Quy tắc thi hành liên kết hồ sơ đính kèm theo từng tư cách lưu trú với Phụ lục 5 và 5-2. Phụ lục 5-2 quy định hồ sơ cho hoạt động ngoài tư cách, thay đổi/thêm nơi làm việc, cấp tư cách, thay đổi tư cách, gia hạn và đăng ký người nước ngoài. Tài liệu cấp ở nước ngoài có thể cần apostille hoặc xác nhận lãnh sự, dịch/công chứng, và cơ quan xét duyệt có thể yêu cầu bổ sung.
```

### MN — Хавсаргах материал ба апостиль

```
Хэрэгжүүлэх дүрмийн 76 дугаар зүйл нь виз болон оршин суух өргөдлийн хавсаргах материалыг 5 болон 5-2 дугаар хавсралтад холбодог. 5-2 хавсралт нь нэмэлт үйл ажиллагаа, ажлын байр өөрчлөх, ангилал олгох/өөрчлөх, хугацаа сунгах, гадаад иргэний бүртгэлийн материалыг тогтооно. Гадаадад олгосон баримтад апостиль эсвэл консулын баталгаа, орчуулга/нотариат шаардагдаж болно.
```

---

## A1-061 immigration-rule-fees

- 제목: 사증·체류 민원 수수료의 법령 근거
- 카테고리: cost
- 출처 라벨: 국가법령정보센터 · 출입국관리법 시행규칙 수수료
- 출처 URL: https://www.law.go.kr/LSW//lumLsLinkPop.do?chrClsCd=010202&lspttninfSeq=82731
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 사증·체류 민원 수수료의 법령 근거

```
출입국관리법 시행규칙 제71조는 사증발급신청 심사수수료를 단수·복수 및 체류기간 기준으로 정하고, 제72조는 입국·체류 관련 각종 허가 수수료를 정합니다. 체류자격외활동, 근무처 변경·추가, 체류자격부여, 체류자격 변경, 체류기간 연장, 외국인등록증 발급·재발급 등의 수수료가 항목별로 구분됩니다. 실제 납부액은 전자민원 여부, 감면, 국적·상호주의, 고시 변경에 따라 달라질 수 있으므로 접수 전 최신 금액을 확인해야 합니다.
```

### EN — Legal basis for visa and stay petition fees

```
Article 71 of the Enforcement Rule sets visa-application examination fees by visa type and stay period, while Article 72 sets fees for entry and stay permits. Outside-status activity, workplace change/addition, grant or change of status, extension of stay, and alien registration card issuance/reissuance are separate fee categories. Actual payment can vary by e-application, exemption, nationality/reciprocity, or updated notices.
```

### VI — Căn cứ pháp luật về lệ phí visa/lưu trú

```
Điều 71 của Quy tắc thi hành quy định phí xét visa theo loại visa và thời hạn lưu trú; Điều 72 quy định phí cho các loại phép liên quan nhập cảnh/lưu trú. Các khoản như hoạt động ngoài tư cách, thay đổi/thêm nơi làm việc, cấp tư cách, thay đổi tư cách, gia hạn và cấp/cấp lại thẻ đăng ký được tách riêng. Số tiền thực tế có thể thay đổi theo nộp online, miễn giảm, quốc tịch/nguyên tắc tương hỗ hoặc thông báo mới.
```

### MN — Виз, оршин суух өргөдлийн хураамжийн эрх зүйн үндэс

```
Хэрэгжүүлэх дүрмийн 71 дүгээр зүйл нь визийн хураамжийг, 72 дугаар зүйл нь хил нэвтрэх болон оршин суух зөвшөөрлийн хураамжийг тогтоодог. Нэмэлт үйл ажиллагаа, ажлын байр өөрчлөх/нэмэх, ангилал олгох/өөрчлөх, хугацаа сунгах, бүртгэлийн карт олгох/дахин олгох зэрэг нь тусдаа. Бодит дүн нь цахим өргөдөл, хөнгөлөлт, харилцан зарчим, шинэ мэдэгдлээс хамаарна.
```

---

## A1-062 immigration-law-violation-risk

- 제목: 체류자격 위반·불법취업·허위서류 위험
- 카테고리: warning
- 출처 라벨: 국가법령정보센터 · 출입국관리법
- 출처 URL: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
- 출처 유형: official_law
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 체류자격 위반·불법취업·허위서류 위험

```
외국인은 허가된 체류자격과 활동범위를 벗어나 취업하거나 활동하면 체류자격 위반 문제가 발생할 수 있습니다. 취업활동은 취업 가능한 체류자격 또는 별도 허가 구조를 먼저 확인해야 하며, D-2/D-4 유학생의 시간제취업도 허가·신고 요건을 별도로 봐야 합니다. 허위서류, 허위초청, 무허가 취업, 체류기간 도과 등은 사안에 따라 강제퇴거, 입국금지, 형사처벌 또는 과태료·범칙금으로 이어질 수 있으므로 KAXI는 불법 요청을 거절하고 합법 준비 경로만 안내합니다.
```

### EN — Risk of status violation, unauthorized work, and false documents

```
A foreign national who works or acts outside the permitted stay status and activity scope can face a status-violation issue. Work requires a work-authorized status or separate permission, and D-2/D-4 student part-time work has its own permission/reporting conditions. False documents, false invitations, unauthorized work, and overstay can lead to deportation, entry bans, criminal penalties, or administrative fines depending on the case.
```

### VI — Rủi ro vi phạm tư cách lưu trú, làm việc trái phép và hồ sơ giả

```
Nếu người nước ngoài làm việc hoặc hoạt động ngoài phạm vi tư cách lưu trú đã được phép, có thể phát sinh vi phạm. Hoạt động có thu nhập phải kiểm tra tư cách được làm việc hoặc giấy phép riêng; làm thêm của D-2/D-4 cũng cần kiểm tra điều kiện giấy phép/thông báo. Hồ sơ giả, mời giả, làm việc không phép hoặc quá hạn có thể dẫn đến trục xuất, cấm nhập cảnh, xử phạt hình sự hoặc tiền phạt tùy vụ việc.
```

### MN — Ангилал зөрчих, зөвшөөрөлгүй ажил, хуурамч баримтын эрсдэл

```
Гадаад иргэн зөвшөөрөгдсөн ангилал, үйл ажиллагааны хүрээнээс гадуур ажиллавал зөрчил болно. Ажил хийхийн өмнө ажиллах боломжтой ангилал эсвэл тусгай зөвшөөрлийг шалгана; D-2/D-4 оюутны цагийн ажил ч тусдаа нөхцөлтэй. Хуурамч баримт, хуурамч урилга, зөвшөөрөлгүй ажил, хугацаа хэтрүүлэх нь албадан гаргах, нэвтрэх хориг, эрүүгийн хариуцлага, торгуульд хүргэж болно.
```

---

## A1-063 d-4-to-d-2-transfer

- 제목: D-4 → D-2 전환 절차
- 카테고리: process
- 출처 라벨: 법무부 출입국외국인정책본부
- 출처 URL: https://www.immigration.go.kr
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-01-01 ~ 없음
- 최종 확인일: 2026-07-01
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 1

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — D-4 → D-2 전환 절차

```
어학당 수료 후 학위과정 진학시 체류자격 변경(D-4→D-2) 신청이 필요합니다. 학교 합격통지서, 표준입학허가서, TOPIK 4급 이상 증빙, 재학증명서, 재적증명서를 출입국관리사무소에 제출합니다. 심사는 2~4주 소요됩니다. 국외여행허가를 받지 않고 출국시 변경 신청이 취소될 수 있으므로 주의가 필요합니다.
```

### EN — D-4 to D-2 transfer

```
After language program → degree program: change D-4 to D-2. Submit: admission letter, TOPIK 4+, school cert. Takes 2-4 weeks. Don't leave without travel permit.
```

### VI — Chuyển visa D-4 → D-2

```
Học xong tiếng → ĐH cần đổi visa D-4 sang D-2. Nộp: giấy báo đậu, TOPIK 4+, giấy nhập học. 2-4 tuần. Không đi nước ngoài không phép.
```

### MN — D-4 → D-2 шилжих

```
Хэл төгсөөд их сургуульд орох D-4 → D-2 шилжих. Элсэлтийн зөвшөөрөл, TOPIK 4+ шаардлагатай. 2-4 долоо хоног. Зөвшөөрөлгүй гадагшаа явахыг хоригдоно.
```

---

## A1-064 hikorea-integrated-status-manual

- 제목: 하이코리아 체류자격별 통합 안내 매뉴얼
- 카테고리: visa
- 출처 라벨: 하이코리아 체류자격별 통합 안내 매뉴얼
- 출처 URL: https://www.hikorea.go.kr/board/BoardNtcDetailR.pt?BBS_GB_CD=BS10&BBS_SEQ=1&NTCCTT_SEQ=1062&page=1
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-06-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 하이코리아 체류자격별 통합 안내 매뉴얼

```
하이코리아는 체류자격별 통합 안내 매뉴얼을 통해 사증 및 체류 민원의 신청대상과 필요서류를 안내합니다. 이 매뉴얼은 지침 변경 시 수정되지만 업로드에 시간이 걸릴 수 있으므로, 최신 지침에 따른 정확한 상담은 1345 또는 방문예약 후 관할 출입국외국인관서 확인이 필요합니다. KAXI는 D-2, D-4, D-10, E-7, F-2, F-5 질의에서 출입국관리법·시행령·시행규칙 근거를 먼저 확인하고, 이 문서는 운영 서류·절차 보조 근거로 사용합니다.
```

### EN — HiKorea integrated stay-status manual

```
HiKorea publishes an integrated manual by stay status for visa and residence petitions, covering applicant scope and required documents. The manual is updated when rules change, but publication can lag, so current case advice should be checked through 1345 or the competent immigration office. KAXI checks the Immigration Act, Enforcement Decree, and Enforcement Rule first, then uses this manual as operational document/procedure guidance.
```

### VI — Sổ tay HiKorea theo từng tư cách lưu trú

```
HiKorea công bố sổ tay theo từng tư cách lưu trú để hướng dẫn đối tượng nộp và hồ sơ cần thiết cho visa/lưu trú. Tài liệu được cập nhật khi hướng dẫn thay đổi, nhưng có thể chậm đăng tải; vì vậy cần xác nhận qua 1345 hoặc văn phòng xuất nhập cảnh có thẩm quyền. KAXI kiểm tra Luật, Nghị định và Quy tắc thi hành trước, rồi dùng tài liệu này làm căn cứ nghiệp vụ bổ trợ.
```

### MN — HiKorea оршин суух ангиллын нэгдсэн гарын авлага

```
HiKorea нь виз болон оршин суух өргөдлийн ангилал бүрийн хамрах хүрээ, бүрдүүлэх материалыг нэгдсэн гарын авлагаар тайлбарладаг. Журам өөрчлөгдвөл шинэчилдэг боловч нийтлэх хугацаа хоцорч болох тул 1345 эсвэл харьяа цагаачлалын байгууллагаар баталгаажуулах шаардлагатай. KAXI нь эхлээд хууль, хэрэгжүүлэх журам, дүрмийг шалгаж, энэ эх сурвалжийг ажиллагааны туслах үндэслэл болгон ашиглана.
```

---

## A1-065 hikorea-d2-d4-d10-e7-f2-f5-requirements

- 제목: D-2/D-4/D-10/E-7/F-2/F-5 체류 요건 확인 원칙
- 카테고리: visa
- 출처 라벨: 하이코리아 체류자격별 통합 안내 매뉴얼
- 출처 URL: https://www.hikorea.go.kr/board/BoardNtcDetailR.pt?BBS_GB_CD=BS10&BBS_SEQ=1&NTCCTT_SEQ=1062&page=1
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-06-23 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — D-2/D-4/D-10/E-7/F-2/F-5 체류 요건 확인 원칙

```
체류자격별 판단은 현재 체류자격, 목표 체류자격, 활동 목적, 학교/고용/소득/체류기간/위반 이력에 따라 달라집니다. 먼저 출입국관리법상 체류자격·활동범위와 시행령 별표의 D-2, D-4, D-10, E-7, F-2, F-5 분류를 확인한 뒤, 하이코리아 체류자격별 매뉴얼로 신청대상·첨부서류·변경/연장 가능성을 보조 확인해야 합니다. 불명확하면 사용자의 현재 자격, 만료일, 학교명 또는 고용조건, 예산/재정증빙을 먼저 물어봅니다.
```

### EN — D-2/D-4/D-10/E-7/F-2/F-5 requirement check policy

```
Stay-status evaluation depends on current status, target status, activity purpose, school/employment/income, remaining stay period, and violation history. D-2 covers degree study, D-4 training/language programs, D-10 job seeking or startup preparation, E-7 professional/specific activities, F-2 residence, and F-5 permanent residence. If facts are missing, ask for current status, expiry date, school or employment conditions, and budget/financial proof before answering.
```

### VI — Nguyên tắc kiểm tra điều kiện D-2/D-4/D-10/E-7/F-2/F-5

```
Đánh giá tư cách lưu trú phụ thuộc vào tư cách hiện tại, tư cách muốn chuyển, mục đích hoạt động, trường học/việc làm/thu nhập/thời hạn lưu trú và lịch sử vi phạm. D-2 là du học cấp bằng, D-4 là đào tạo/ngôn ngữ, D-10 là tìm việc/chuẩn bị khởi nghiệp, E-7 là hoạt động chuyên môn, F-2 là cư trú, F-5 là vĩnh trú. Khi thiếu thông tin, cần hỏi tư cách hiện tại, ngày hết hạn, trường hoặc điều kiện tuyển dụng, ngân sách/chứng minh tài chính.
```

### MN — D-2/D-4/D-10/E-7/F-2/F-5 нөхцөл шалгах зарчим

```
Оршин суух ангиллын үнэлгээ нь одоогийн ангилал, хүсэж буй ангилал, үйл ажиллагааны зорилго, сургууль/ажил/орлого/хугацаа/зөрчлийн түүхээс хамаарна. D-2 нь зэрэг олгох сургалт, D-4 нь хэлний болон сургалтын хөтөлбөр, D-10 нь ажил хайх/стартап бэлтгэл, E-7 нь тусгай мэргэжлийн ажил, F-2 нь оршин суух, F-5 нь байнгын оршин суух ангилал. Мэдээлэл дутуу бол одоогийн ангилал, дуусах огноо, сургууль/ажлын нөхцөл, санхүүгийн нотолгоог асууна.
```

---

## A1-066 hikorea-stay-extension

- 제목: 하이코리아 체류기간 연장 기준
- 카테고리: process
- 출처 라벨: 하이코리아 체류기간연장 안내
- 출처 URL: https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=181&PARENT_ID=140
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 하이코리아 체류기간 연장 기준

```
체류기간을 초과해 계속 체류하려는 외국인은 체류기간연장허가를 받아야 합니다. 하이코리아 안내 기준으로 연장 신청은 현재 체류기간 만료 전 4개월부터 만료 당일까지 가능하며, 만료일 이후 신청하면 범칙금이 부과될 수 있습니다. 기본 제출 축은 체류기간연장허가 신청서, 여권, 해당자의 외국인등록증, 체류자격별 첨부서류, 수수료입니다. 해외 체류 중 민원신청이나 대리 신청은 불가할 수 있으므로 신청 당일 국내 체류 여부를 확인합니다.
```

### EN — HiKorea stay extension guidance

```
A foreign national who wants to stay beyond the permitted period must obtain stay-extension permission. HiKorea states that extension can be filed from four months before expiry through the expiry date, and late filing can trigger penalties. The core packet is an extension application, passport, alien registration card if applicable, status-specific attachments, and fee. Confirm the applicant is in Korea on the filing date.
```

### VI — Gia hạn thời gian lưu trú trên HiKorea

```
Người muốn ở quá thời hạn đã được cho phép phải xin gia hạn. Theo HiKorea, có thể nộp từ 4 tháng trước ngày hết hạn đến đúng ngày hết hạn; nộp sau hạn có thể bị phạt. Hồ sơ cơ bản gồm đơn gia hạn, hộ chiếu, thẻ đăng ký người nước ngoài nếu có, tài liệu theo tư cách lưu trú và phí. Cần kiểm tra người nộp có đang ở Hàn Quốc vào ngày nộp hay không.
```

### MN — HiKorea оршин суух хугацаа сунгах

```
Зөвшөөрөгдсөн хугацаанаас цааш байх бол хугацаа сунгах зөвшөөрөл авах ёстой. HiKorea-ийн дагуу дуусахаас 4 сарын өмнөөс дуусах өдөр хүртэл хүсэлт гаргаж болно; хугацаа өнгөрвөл торгууль гарах эрсдэлтэй. Үндсэн материал нь сунгах өргөдөл, паспорт, гадаад иргэний бүртгэлийн карт, ангиллын нэмэлт материал, хураамж.
```

---

## A1-067 hikorea-status-change

- 제목: 하이코리아 체류자격 변경 기준
- 카테고리: process
- 출처 라벨: 하이코리아 체류자격변경 안내
- 출처 URL: https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=184&PARENT_ID=141
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 하이코리아 체류자격 변경 기준

```
현재 체류자격의 활동을 중지하고 다른 체류자격 활동을 하려는 경우 체류자격변경허가가 필요합니다. 하이코리아는 원칙적으로 출국 후 해당 체류자격 사증을 받아 입국해야 하며, 국내에서 변경 요건을 갖출 수 있는 경우 엄격한 심사를 거쳐 제한적으로 변경할 수 있다고 안내합니다. 변경하려는 활동을 시작하기 전 관할 출입국외국인관서에서 허가를 받아야 하며, 제출서류는 목표 체류자격별 매뉴얼로 확인합니다.
```

### EN — HiKorea status-change guidance

```
If the applicant stops the current status activity and begins an activity under another status, change-of-status permission is required. HiKorea states the default principle is to depart, obtain the appropriate visa, and re-enter; domestic change is limited and strictly reviewed when requirements can be met in Korea. Permission must be obtained before starting the new activity.
```

### VI — Thay đổi tư cách lưu trú trên HiKorea

```
Khi dừng hoạt động theo tư cách hiện tại và muốn hoạt động theo tư cách khác, cần xin phép thay đổi tư cách lưu trú. HiKorea nêu nguyên tắc là ra khỏi Hàn Quốc, nhận visa phù hợp rồi nhập cảnh lại; chỉ một số trường hợp đủ điều kiện trong nước mới được xét nghiêm ngặt. Phải xin phép trước khi bắt đầu hoạt động mới.
```

### MN — HiKorea оршин суух ангилал өөрчлөх

```
Одоогийн ангиллын үйл ажиллагааг зогсоож өөр ангиллын үйл ажиллагаа хийх бол ангилал өөрчлөх зөвшөөрөл хэрэгтэй. HiKorea-ийн үндсэн зарчим нь гадагш гарч тохирох виз авч дахин орох; харин Солонгост шаардлага хангаж чадвал хатуу шалгалтаар хязгаарлагдмал өөрчлөлт зөвшөөрнө. Шинэ үйл ажиллагааг эхлэхээс өмнө зөвшөөрөл авна.
```

---

## A1-068 hikorea-activity-permit

- 제목: 체류자격외활동 및 유학생 시간제취업
- 카테고리: process
- 출처 라벨: 하이코리아 체류자격외활동 안내
- 출처 URL: https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=187&PARENT_ID=142
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 체류자격외활동 및 유학생 시간제취업

```
현재 체류자격을 유지하면서 다른 체류자격에 해당하는 활동을 병행하려면 사전에 체류자격외활동허가를 받아야 합니다. 하이코리아 전자민원에는 유학생(D-2) 및 어학연수생(D-4-1) 시간제취업 허가/신고 메뉴가 별도로 제공됩니다. 병행 활동이 전일 근무 등 주된 활동이 되는 경우 체류자격외활동이 아니라 출국 후 새 사증 또는 체류자격변경 검토 대상입니다. KAXI는 취업 매칭을 하지 않고 허가 필요 여부만 안내합니다.
```

### EN — Activities outside status and student part-time work

```
A foreign national who keeps the current stay status but also performs an activity under another status needs prior permission for activities outside status. HiKorea provides separate e-application items for part-time work permission/reporting for D-2 students and D-4-1 language trainees. If the activity becomes full-time or primary, review a new visa or status change instead. KAXI does not match jobs; it only flags permit requirements.
```

### VI — Hoạt động ngoài tư cách lưu trú và làm thêm của du học sinh

```
Nếu vừa giữ tư cách hiện tại vừa làm hoạt động thuộc tư cách khác, cần xin phép hoạt động ngoài tư cách trước. HiKorea có mục riêng cho giấy phép/thông báo làm thêm của du học sinh D-2 và học tiếng D-4-1. Nếu hoạt động đó trở thành công việc chính toàn thời gian, cần xem xét visa mới hoặc thay đổi tư cách, không chỉ xin hoạt động phụ.
```

### MN — Оршин суух ангиллаас гадуурх үйл ажиллагаа ба оюутны цагийн ажил

```
Одоогийн ангиллаа хадгалж өөр ангиллын үйл ажиллагааг зэрэг хийх бол урьдчилан зөвшөөрөл авна. HiKorea цахим өргөдөлд D-2 оюутан болон D-4-1 хэлний суралцагчийн цагийн ажлын зөвшөөрөл/мэдэгдлийн цэс тусдаа байдаг. Бүтэн цагийн үндсэн ажил бол нэмэлт үйл ажиллагаа биш, шинэ виз эсвэл ангилал өөрчлөх асуудал болно.
```

---

## A1-069 hikorea-forms-document-checklist

- 제목: 하이코리아 민원서식 및 제출서류 체크리스트
- 카테고리: documents
- 출처 라벨: 하이코리아 민원서식
- 출처 URL: https://www.hikorea.go.kr/board/BoardApplicationListR.pt
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 하이코리아 민원서식 및 제출서류 체크리스트

```
하이코리아 민원서식 목록에는 통합신청서(신고서), 신원보증서, 유학생현황, 어학연수생현황, 외국인유학(어학연수)생 시간제취업 확인서 등 체류 민원에 쓰이는 양식이 제공됩니다. KAXI의 서류 체크리스트는 이 서식 목록과 체류자격별 매뉴얼을 함께 근거로 삼아야 하며, 사용자에게는 원본/사본, 번역, 공증, 아포스티유 또는 영사확인 필요 여부를 별도 확인하도록 안내합니다.
```

### EN — HiKorea forms and document checklist

```
HiKorea's forms list provides stay-petition forms such as the integrated application/report form, letter of guarantee, international student and language trainee lists, and student part-time work confirmation. KAXI document checklists should combine this forms list with the status-specific manual and ask users to separately verify original/copy, translation, notarization, apostille, or consular confirmation needs.
```

### VI — Biểu mẫu HiKorea và danh sách hồ sơ

```
Danh mục biểu mẫu HiKorea cung cấp các mẫu dùng cho lưu trú như đơn tổng hợp, giấy bảo lãnh, danh sách du học sinh/học tiếng và xác nhận làm thêm của du học sinh. Checklist của KAXI phải kết hợp danh mục biểu mẫu này với sổ tay theo từng tư cách lưu trú, đồng thời yêu cầu kiểm tra bản gốc/bản sao, dịch thuật, công chứng, apostille hoặc xác nhận lãnh sự.
```

### MN — HiKorea маягт ба бүрдүүлэх материалын жагсаалт

```
HiKorea-ийн маягтын жагсаалтад нэгдсэн өргөдөл/мэдэгдэл, батлан даалтын бичиг, оюутан/хэлний суралцагчийн жагсаалт, оюутны цагийн ажлын баталгааны маягт зэрэг орно. KAXI-ийн материалын жагсаалт энэ маягт болон ангиллын гарын авлагыг хамтад нь ашиглаж, эх хувь/хуулбар, орчуулга, нотариат, апостиль эсвэл консулын баталгааг тусад нь шалгуулна.
```

---

## A1-070 hikorea-online-visit-application

- 제목: 전자민원·방문예약 절차
- 카테고리: process
- 출처 라벨: 하이코리아 전자민원
- 출처 URL: https://www.hikorea.go.kr/cvlappl/CvlapplStep1.pt
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 전자민원·방문예약 절차

```
하이코리아 전자민원은 평일 운영 시간 내 온라인 민원 선택, 인증, 민원작성, 신청결과 확인 흐름으로 제공됩니다. 전자민원 항목에는 등록외국인의 체류기간연장허가, 등록외국인의 체류자격 변경허가, 유학생(D-2) 및 어학연수생(D-4-1) 시간제취업 허가/신고 등이 포함됩니다. 심사를 위해 출석 요구나 실태조사가 있을 수 있고, 심사 완료 전 담당자 연락 없이 출국하면 심사가 종결될 수 있으므로 방문예약/전자민원 가능 여부와 국내 체류 여부를 먼저 확인합니다.
```

### EN — E-application and visit reservation process

```
HiKorea e-application follows a flow of selecting a petition, authentication, form completion, and result check during operating hours. Items include extension of stay for registered foreigners, change of stay status, and part-time work permission/reporting for D-2 and D-4-1 students. Immigration may request appearance or field checks, and leaving Korea before review completion without contacting the officer can close the review.
```

### VI — Thủ tục e-application và đặt lịch thăm

```
E-application trên HiKorea đi theo luồng chọn loại đơn, xác thực, điền đơn và kiểm tra kết quả trong giờ vận hành. Các mục gồm gia hạn lưu trú cho người đã đăng ký, thay đổi tư cách lưu trú, giấy phép/thông báo làm thêm cho D-2/D-4-1. Có thể bị yêu cầu có mặt hoặc kiểm tra thực tế; nếu rời Hàn Quốc trước khi xét xong mà không liên hệ, hồ sơ có thể kết thúc.
```

### MN — Цахим өргөдөл ба айлчлалын цаг захиалга

```
HiKorea цахим өргөдөл нь ажлын цагт өргөдөл сонгох, баталгаажуулах, бөглөх, үр дүн шалгах урсгалтай. Үүнд бүртгэлтэй гадаадын иргэний хугацаа сунгах, ангилал өөрчлөх, D-2/D-4-1 цагийн ажлын зөвшөөрөл/мэдэгдэл багтана. Шалгалтын явцад ирэх шаардлага эсвэл бодит шалгалт байж болох ба дуусахаас өмнө мэдэгдэлгүй гарвал хэрэг хаагдаж болно.
```

---

## A1-071 hikorea-fees-processing-authentication

- 제목: 수수료·처리기간·원본/번역/아포스티유 확인
- 카테고리: cost
- 출처 라벨: 하이코리아 출입국/체류안내
- 출처 URL: https://www.hikorea.go.kr/info/InfoMain.pt
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 수수료·처리기간·원본/번역/아포스티유 확인

```
하이코리아의 연장·변경·자격외활동 안내는 신청서, 여권, 외국인등록증, 체류자격별 첨부서류, 수수료를 기본 확인 축으로 제시합니다. 실제 수수료와 처리기간은 민원 종류, 관할관서, 전자민원 가능 여부, 추가 심사·실태조사 여부에 따라 달라질 수 있습니다. 해외 발급 서류는 원본 제출, 번역, 공증, 아포스티유 또는 영사확인이 필요한지 국가·문서별로 다르므로 접수 전 관할관서 또는 1345 확인을 권장합니다.
```

### EN — Fees, processing time, originals, translation, and apostille

```
HiKorea guidance for extension, status change, and outside-status activity uses the application form, passport, alien registration card, status-specific attachments, and fee as the core filing checks. Actual fee and processing time vary by petition type, competent office, e-application availability, and additional review or field checks. Foreign-issued documents may need originals, translation, notarization, apostille, or consular confirmation depending on country and document.
```

### VI — Phí, thời gian xử lý, bản gốc/dịch thuật/apostille

```
Hướng dẫn HiKorea về gia hạn, thay đổi tư cách và hoạt động ngoài tư cách thường kiểm tra đơn, hộ chiếu, thẻ đăng ký người nước ngoài, tài liệu theo tư cách và phí. Phí và thời gian xử lý thực tế thay đổi theo loại hồ sơ, văn phòng có thẩm quyền, khả năng nộp online và việc kiểm tra bổ sung. Tài liệu cấp ở nước ngoài có thể cần bản gốc, dịch, công chứng, apostille hoặc xác nhận lãnh sự tùy quốc gia/tài liệu.
```

### MN — Хураамж, шийдвэрлэх хугацаа, эх хувь/орчуулга/апостиль

```
HiKorea-ийн сунгалт, ангилал өөрчлөх, нэмэлт үйл ажиллагааны заавар нь өргөдөл, паспорт, гадаад иргэний бүртгэлийн карт, ангиллын хавсралт, хураамжийг үндсэн шалгалт болгодог. Бодит хураамж ба шийдвэрлэх хугацаа нь өргөдлийн төрөл, харьяа байгууллага, цахимаар болох эсэх, нэмэлт шалгалтаас хамаарна. Гадаадад олгосон баримт эх хувь, орчуулга, нотариат, апостиль эсвэл консулын баталгаа шаардаж болно.
```

---

## A1-072 hikorea-policy-notice-monitor

- 제목: 정책 변경성 공지 모니터링
- 카테고리: warning
- 출처 라벨: 하이코리아 공지사항
- 출처 URL: https://www.hikorea.go.kr/board/BoardNtcListR.pt
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 정책 변경성 공지 모니터링

```
하이코리아 공지사항에는 체류·사증 관리 매뉴얼, 전자팩스 신고대상 변경, 특정 제도 시행 등 정책 변경성 문서가 게시됩니다. KAXI 자동 크롤링은 공지 제목·첨부파일·게시일의 diff 감지만 수행하고, production RAG 반영은 관리자 승인 후에만 해야 합니다. 예를 들어 육성형 전문기술인력 제도처럼 D-10·E-7 계열에 영향을 줄 수 있는 문서는 관련 compliance rule과 기존 사용자 질의 로그의 영향 목록을 산출해야 합니다.
```

### EN — Policy-change notice monitoring

```
HiKorea notices can publish policy-changing documents such as visa/stay management manuals, e-fax filing changes, and new program rollouts. KAXI automation should only detect diffs in notice title, attachment, and posted date; production RAG updates require admin approval. Documents that may affect D-10 or E-7, such as skill-development professional workforce manuals, should produce impacted compliance-rule and user-query lists.
```

### VI — Theo dõi thông báo thay đổi chính sách

```
Thông báo HiKorea có thể chứa tài liệu thay đổi chính sách như sổ tay quản lý visa/lưu trú, thay đổi kênh fax điện tử hoặc chế độ mới. Crawler của KAXI chỉ nên phát hiện diff về tiêu đề, tệp đính kèm và ngày đăng; chỉ đưa vào production RAG sau khi admin phê duyệt. Tài liệu có thể ảnh hưởng D-10/E-7 phải sinh danh sách rule và người dùng bị ảnh hưởng.
```

### MN — Бодлогын өөрчлөлтийн мэдэгдэл хянах

```
HiKorea мэдэгдэлд виз/оршин суух удирдлагын гарын авлага, цахим факсын өөрчлөлт, шинэ тогтолцооны хэрэгжилт зэрэг бодлогын өөрчлөлт нийтлэгдэж болно. KAXI автомат crawler нь зөвхөн гарчиг, хавсралт, нийтэлсэн огнооны ялгааг илрүүлж, production RAG-д зөвхөн админ баталсны дараа оруулна. D-10/E-7-д нөлөөлөх баримт нь rule болон хэрэглэгчийн нөлөөллийн жагсаалт гаргана.
```

---

## A1-073 hikorea-homepage-urgent-notices

- 제목: 하이코리아 첫 화면 긴급 공지 감시
- 카테고리: warning
- 출처 라벨: 하이코리아 첫 화면 긴급 공지
- 출처 URL: https://www.hikorea.go.kr/index.html
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-02
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 하이코리아 첫 화면 긴급 공지 감시

```
하이코리아 첫 화면은 공지사항 목록보다 빠르게 사칭사이트 주의, 전자팩스 신고대상 변경, 전자민원·방문예약 운영 안내 같은 실무 변경을 노출할 수 있습니다. KAXI는 공지 게시판뿐 아니라 첫 화면의 긴급 배너와 주요 링크도 매일 감시합니다. 이런 변경은 법령 자체는 아니지만 접수 방식, 제출 채널, 사용자 안전 안내에 직접 영향을 주므로 PENDING 후보와 운영 알림으로 분리해 검수합니다.
```

### EN — HiKorea homepage urgent-notice monitor

```
The HiKorea homepage can expose practical changes such as scam-site warnings, e-fax filing changes, or e-application/visit-reservation operation notices before users find them in the notice list. KAXI monitors homepage urgent banners and main links daily. These are not statutes, but they affect filing channels and user-safety guidance, so they become PENDING candidates and operations alerts.
```

### VI — Theo dõi thông báo khẩn trên trang chính HiKorea

```
Trang chính HiKorea có thể hiển thị cảnh báo giả mạo, thay đổi đối tượng khai báo e-fax, hoặc hướng dẫn vận hành e-application/đặt lịch trước danh sách thông báo. KAXI theo dõi cả banner khẩn và liên kết chính hằng ngày. Các thay đổi này không phải luật nhưng ảnh hưởng trực tiếp đến cách nộp, kênh nộp và an toàn người dùng.
```

### MN — HiKorea нүүр хуудасны яаралтай мэдэгдэл хянах

```
HiKorea нүүр хуудас нь хуурамч сайт, цахим факс, цахим өргөдөл/цаг захиалгын ажиллагааны мэдэгдлийг зарын жагсаалтаас түрүүлж харуулж болно. KAXI нь яаралтай баннер болон гол холбоосыг өдөр бүр хянадаг. Энэ нь хууль биш боловч мэдүүлэх арга, суваг, хэрэглэгчийн аюулгүй байдалд шууд нөлөөлнө.
```

---

## A1-074 moj-immigration-policy-news

- 제목: 법무부 출입국·외국인정책본부 주요소식 감시
- 카테고리: process
- 출처 라벨: 법무부 출입국외국인정책본부 주요소식
- 출처 URL: https://www.immigration.go.kr/immigration/3341/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 법무부 출입국·외국인정책본부 주요소식 감시

```
법무부 출입국·외국인정책본부 주요소식은 하이코리아 매뉴얼보다 먼저 제도 도입, 시행기간, 대상 변경, 외국인 정책 방향을 공지할 수 있습니다. KAXI는 주요소식을 매일 감시하되, 사용자에게 곧바로 확정 요건처럼 안내하지 않습니다. 법령·시행령·시행규칙에 근거가 있는지 확인하고, 운영 지침으로 확정되기 전에는 '정책 공지 단계'로 표시해 행정사 검토를 요구합니다.
```

### EN — Ministry of Justice immigration policy news monitor

```
MOJ immigration policy news may announce programs, effective periods, target changes, or policy direction before HiKorea manuals are updated. KAXI monitors it daily but does not treat it as a finalized filing requirement until the statutory/regulatory basis and operational guidance are confirmed. Until then, responses should mark it as a policy-notice stage and require administrative-scrivener review.
```

### VI — Theo dõi tin chính của Cục xuất nhập cảnh Bộ Tư pháp

```
Tin chính của Cục xuất nhập cảnh Bộ Tư pháp có thể công bố chương trình, thời hạn áp dụng, thay đổi đối tượng hoặc định hướng chính sách trước khi sổ tay HiKorea cập nhật. KAXI theo dõi hằng ngày nhưng không trình bày ngay như điều kiện đã chốt; cần kiểm tra căn cứ luật/nghị định/quy tắc và đánh dấu là giai đoạn thông báo chính sách cho đến khi có hướng dẫn vận hành.
```

### MN — Хууль зүйн яамны цагаачлалын гол мэдээ хянах

```
Хууль зүйн яамны цагаачлалын гол мэдээ нь HiKorea гарын авлагаас өмнө шинэ тогтолцоо, хэрэгжих хугацаа, хамрах хүрээ, бодлогын чиглэлийг зарлаж болно. KAXI өдөр бүр хянах боловч шууд батлагдсан шаардлага мэт хариулахгүй; хууль, журам, дүрмийн үндэслэл болон үйл ажиллагааны зааврыг шалгана.
```

---

## A1-075 moj-notice-board-visa-policy

- 제목: 법무부 공지사항 체류·사증 정책 감시
- 카테고리: warning
- 출처 라벨: 법무부 공지사항 · 체류·사증 정책
- 출처 URL: https://www.immigration.go.kr/moj/223/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-04-16 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 법무부 공지사항 체류·사증 정책 감시

```
법무부 공지사항 보드는 출입국·체류·사증 정책 변경성 문서가 올라오는 핵심 공식 출처입니다. 2026-07-03 확인 기준 공지 게시판에는 비자신청센터 운영기관 선정, 특정 체류자격별 기준 공고, 고시·행정예고 같은 문서가 함께 게시됩니다. KAXI는 제목·게시일·첨부파일 diff를 매일 감지하되, 자동 크롤링 결과를 곧바로 확정 요건으로 답하지 않고 법령·고시·하이코리아 운영 안내와 대조한 뒤 관리자 승인 문서만 production RAG에 반영합니다.
```

### EN — MOJ stay and visa policy notice monitor

```
The MOJ notice board is a core official source for immigration, stay, and visa policy-change documents. As checked on 2026-07-03, it includes visa-center operation notices, stay-status standards, ministry notices, and administrative preannouncements. KAXI monitors title, posted-date, and attachment diffs daily, but does not answer crawler output as final requirements until it is checked against statutes, notices, and HiKorea operational guidance and approved by an admin.
```

### VI — Theo dõi thông báo chính sách lưu trú/visa của Bộ Tư pháp

```
Bảng thông báo của Bộ Tư pháp là nguồn chính thức quan trọng cho tài liệu thay đổi chính sách xuất nhập cảnh, lưu trú và visa. Kiểm tra ngày 2026-07-03, bảng này gồm thông báo trung tâm visa, tiêu chuẩn theo tư cách lưu trú, quyết định và dự thảo thông báo hành chính. KAXI chỉ phát hiện diff tiêu đề/ngày/tệp đính kèm hằng ngày và chỉ đưa vào production RAG sau khi đối chiếu luật, quyết định và hướng dẫn vận hành.
```

### MN — Хууль зүйн яамны оршин суух/визийн бодлогын мэдэгдэл хянах

```
Хууль зүйн яамны мэдэгдлийн самбар нь цагаачлал, оршин суух, визийн бодлогын өөрчлөлтийн албан ёсны чухал эх сурвалж. 2026-07-03-ны шалгалтаар визийн төв, оршин суух ангиллын стандарт, тушаал ба захиргааны урьдчилсан мэдэгдэл нийтлэгддэг. KAXI өдөр бүр гарчиг, огноо, хавсралтын ялгааг илрүүлж, хууль ба ажиллагааны заавартай тулгасны дараа л production RAG-д оруулна.
```

---

## A1-076 moj-e7-wage-requirement-2026

- 제목: 2026년 특정활동(E-7) 임금요건 기준 공고
- 카테고리: visa
- 출처 라벨: 법무부 공지사항 · E-7 임금요건 2026
- 출처 URL: https://www.immigration.go.kr/bbs/moj/184/601893/artclView.do?layout=unknown
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2025-12-29 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 2026년 특정활동(E-7) 임금요건 기준 공고

```
법무부 공지사항에는 2025-12-29 작성일로 '2026년 특정활동(E-7) 체류자격 임금요건 기준 공고'가 게시되어 있고, 문서에는 [법무부 공고 2025-406호] 및 첨부 PDF가 표시됩니다. 이 문서는 E-7 채용·체류자격 변경·연장 상담에서 임금요건을 확인해야 하는 공식 운영 근거입니다. 다만 실제 적용 금액, 직종별 예외, 경과규정은 첨부 원문과 최신 하이코리아/관할관서 지침까지 대조해야 하므로, KAXI 답변은 원문 공고와 확인일을 제시하고 개별 사건은 행정사 검토로 넘겨야 합니다.
```

### EN — 2026 E-7 wage-requirement standard

```
The MOJ notice dated 2025-12-29 publishes the 2026 wage-requirement standard for the Specific Activity (E-7) stay status, showing MOJ Public Notice 2025-406 and an attached PDF. It is an official operational basis for E-7 hiring, status-change, and extension checks. Actual amounts, occupation-specific exceptions, and transition rules must still be checked against the original attachment and latest operational guidance, so KAXI should show the source and checked date and route individual cases to administrative-scrivener review.
```

### VI — Tiêu chuẩn tiền lương E-7 năm 2026

```
Thông báo Bộ Tư pháp ngày 2025-12-29 đăng 'Tiêu chuẩn tiền lương cho tư cách lưu trú E-7 năm 2026', kèm Công báo Bộ Tư pháp số 2025-406 và tệp PDF. Đây là căn cứ vận hành chính thức khi tư vấn tuyển dụng, đổi tư cách hoặc gia hạn E-7. Mức áp dụng, ngoại lệ theo ngành và quy định chuyển tiếp phải đối chiếu tệp gốc và hướng dẫn mới nhất.
```

### MN — 2026 оны E-7 цалингийн шаардлагын стандарт

```
2025-12-29-ний Хууль зүйн яамны мэдэгдэлд 2026 оны E-7 цалингийн шаардлагын стандарт, 2025-406 дугаар мэдэгдэл болон PDF хавсралт нийтлэгдсэн. Энэ нь E-7 ажилд авах, ангилал өөрчлөх, сунгах зөвлөгөөнд албан ёсны ажиллагааны үндэслэл болно. Гэвч бодит дүн, мэргэжлийн онцгой журам, шилжилтийн заалтыг эх PDF болон шинэ заавартай тулгана.
```

---

## A1-077 moj-f6-marriage-visa-criteria

- 제목: F-6 결혼동거 사증 발급 요건·심사면제 기준 고시
- 카테고리: visa
- 출처 라벨: 법무부 공지사항 · F-6 결혼동거 사증 고시
- 출처 URL: https://www.immigration.go.kr/bbs/moj/184/601864/artclView.do?layout=unknown
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2025-12-26 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — F-6 결혼동거 사증 발급 요건·심사면제 기준 고시

```
법무부 공지사항에는 2025-12-26 작성일로 '결혼동거 목적의 사증 발급에 필요한 요건 및 심사면제 기준 고시(법무부고시 제2025-534호)'가 게시되어 있습니다. F-6 결혼동거 사증 상담에서는 이 고시가 소득·주거·의사소통·혼인진정성 심사와 면제 기준을 확인해야 하는 공식 근거가 될 수 있습니다. 개별 사건은 혼인 경위, 국적, 초청인·피초청인 자료, 범죄·체류 이력에 따라 달라지므로 원문 고시와 첨부파일 확인 후 판단해야 합니다.
```

### EN — F-6 marriage visa criteria and review-exemption standard

```
The MOJ notice dated 2025-12-26 publishes Ministry Notice 2025-534 on criteria for issuing marriage-cohabitation visas and review exemptions. For F-6 consultations, it can be an official basis for checking income, housing, communication, marriage genuineness, and exemption standards. Individual cases vary by marriage facts, nationality, inviter/applicant materials, and criminal or stay history, so the original notice and attachment must be reviewed before judgment.
```

### VI — Tiêu chí cấp visa kết hôn F-6 và miễn thẩm tra

```
Thông báo Bộ Tư pháp ngày 2025-12-26 đăng quyết định về điều kiện cấp visa mục đích hôn nhân chung sống và tiêu chí miễn thẩm tra, số 2025-534. Khi tư vấn F-6, đây có thể là căn cứ chính thức để kiểm tra thu nhập, nhà ở, giao tiếp, tính chân thực của hôn nhân và miễn thẩm tra. Hồ sơ cụ thể cần đọc bản gốc và tài liệu kèm theo.
```

### MN — F-6 гэрлэлтийн визийн нөхцөл ба шалгалтаас чөлөөлөх стандарт

```
2025-12-26-ний мэдэгдэлд гэрлэлтийн хамт амьдрах зорилготой визийн нөхцөл ба шалгалтаас чөлөөлөх стандартын 2025-534 дугаар журам нийтлэгдсэн. F-6 зөвлөгөөнд орлого, орон байр, хэлний харилцаа, гэрлэлтийн үнэн бодит байдал, чөлөөлөлтийг шалгах албан ёсны үндэслэл болж болно. Хувийн хэрэг бүрт эх бичвэр ба хавсралтыг шалгана.
```

---

## A1-078 moj-f4-employment-restriction-preannouncement

- 제목: F-4 재외동포 취업활동 제한범위 행정예고
- 카테고리: warning
- 출처 라벨: 법무부 공지사항 · F-4 취업제한 행정예고
- 출처 URL: https://www.immigration.go.kr/bbs/moj/184/602340/artclView.do?layout=unknown
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-01-09 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — F-4 재외동포 취업활동 제한범위 행정예고

```
법무부 공지사항에는 2026-01-08 작성일의 '재외동포(F-4) 자격의 취업활동 제한범위 고시' 행정예고가 게시되어 있으며, 법무부 공고 제2026-2호와 2026-01-09 기준 문구가 표시됩니다. 행정예고는 확정 고시 전 의견수렴 단계일 수 있으므로, KAXI는 이를 F-4 취업 가능 여부의 최종 결론으로 답하지 않습니다. 다만 F-4 상담에서 직종 제한, 위반 위험, 변경 가능성을 안내하고 확정 고시 여부를 추가 확인해야 하는 경고 출처로 사용합니다.
```

### EN — F-4 employment-restriction preannouncement

```
The MOJ notice dated 2026-01-08 is an administrative preannouncement on the employment-restriction scope for Overseas Korean (F-4) status, showing MOJ Public Notice 2026-2 and a 2026-01-09 notice date. A preannouncement may be a consultation stage before a final notice, so KAXI must not answer it as the final rule for whether an F-4 holder may work in a job. It is used as a warning source to check job restrictions, violation risk, and whether the final notice has been issued.
```

### VI — Dự thảo thông báo hạn chế việc làm F-4

```
Thông báo Bộ Tư pháp ngày 2026-01-08 về phạm vi hạn chế hoạt động việc làm của tư cách F-4 là giai đoạn dự thảo/tham vấn, có Công báo số 2026-2 và ngày 2026-01-09. KAXI không dùng nó như kết luận cuối cùng về việc F-4 có được làm nghề cụ thể hay không; chỉ dùng làm cảnh báo cần kiểm tra quyết định cuối cùng.
```

### MN — F-4 гадаад дахь солонгос иргэдийн ажил эрхлэлтийн хязгаарын урьдчилсан мэдэгдэл

```
2026-01-08-ний мэдэгдэлд F-4 ангиллын ажил эрхлэлтийн хязгаарын захиргааны урьдчилсан мэдэгдэл, 2026-2 дугаар албан мэдэгдэл нийтлэгдсэн. Энэ нь эцсийн журам гарахаас өмнөх санал авах шат байж болох тул KAXI F-4 ажиллах эрхийн эцсийн дүгнэлт болгон ашиглахгүй. Харин ажил мэргэжлийн хязгаар, эрсдэл, өөрчлөлтийг шалгах анхааруулга болгон хэрэглэнэ.
```

---

## A1-079 moj-skilled-worker-points-visa

- 제목: 외국인 숙련기능인력 점수제 비자
- 카테고리: visa
- 출처 라벨: 법무부 정책서비스 · 숙련기능인력 점수제 비자
- 출처 URL: https://www.immigration.go.kr/moj/187/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 외국인 숙련기능인력 점수제 비자

```
법무부 정책서비스의 외국인 숙련기능인력 점수제 비자 안내는 E-9·E-10·H-2 등 비전문취업 인력이 숙련기능인력으로 전환할 때 확인해야 하는 운영 근거입니다. 페이지는 최근 10년 이내 일정 기간 체류·취업 이력, 사회통합프로그램 이수에 따른 기간 완화, 벌금형·세금체납·출입국 위반·불법체류 이력 배제, 일반·특별 전환 쿼터 같은 심사 축을 제시합니다. 실제 E-7-4 가능성 판단은 점수표, 업종·사업장 요건, 최신 쿼터와 관할관서 지침을 함께 확인해야 합니다.
```

### EN — Skilled worker points-based visa

```
The MOJ policy-service page on the skilled-worker points-based visa is operational guidance for E-9, E-10, H-2 and similar non-professional workers seeking conversion to skilled-worker status. It highlights stay/work history, period relief through social-integration completion, exclusions for fines, tax arrears, immigration violations or illegal stay, and general/special conversion quotas. Actual E-7-4 eligibility needs the score table, industry and workplace rules, latest quota, and competent-office guidance.
```

### VI — Visa lao động kỹ năng điểm số

```
Trang dịch vụ chính sách của Bộ Tư pháp về visa lao động kỹ năng điểm số là căn cứ vận hành khi lao động E-9/E-10/H-2 chuyển sang nhóm kỹ năng. Trang nêu trục kiểm tra như lịch sử cư trú/làm việc, giảm thời gian khi hoàn thành KIIP, loại trừ do phạt tiền/nợ thuế/vi phạm xuất nhập cảnh/cư trú bất hợp pháp và hạn ngạch chuyển đổi. Cần kiểm tra bảng điểm, ngành, nơi làm việc, hạn ngạch mới nhất và văn phòng có thẩm quyền.
```

### MN — Гадаад ур чадвартай ажилтны онооны виз

```
Хууль зүйн яамны ур чадвартай ажилтны онооны визийн хуудас нь E-9, E-10, H-2 зэрэг ажилчид ур чадвартай ангилал руу шилжихэд хэрэглэх ажиллагааны эх сурвалж. Оршин суусан/ажилласан хугацаа, KIIP-ээр хугацаа хөнгөлөх, торгууль/татвар/цагаачлалын зөрчил/хууль бус оршин суусан түүхийн хасалт, ерөнхий ба тусгай квот зэрэг шалгалтын тэнхлэгийг харуулна.
```

---

## A1-080 moj-seasonal-worker-program

- 제목: 외국인 계절근로자 프로그램
- 카테고리: visa
- 출처 라벨: 법무부 정책서비스 · 계절근로자 프로그램
- 출처 URL: https://www.immigration.go.kr/moj/194/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 외국인 계절근로자 프로그램

```
법무부 정책서비스의 외국인 계절근로자 프로그램 안내는 농·어촌 일손 부족 대응을 위한 단기·계절성 인력 제도의 운영 근거입니다. 프로그램은 지방자치단체 수요조사, 법무부 배정심사, 송출국 또는 결혼이민자 가족 초청, 사증발급인정서·사증발급, 국내 입국 후 근로와 관리 절차를 축으로 설명됩니다. 단기 C-4·계절근로 E-8 등 세부 자격, 체류기간, 고용주 요건, 무단이탈·브로커 위험은 매년 배정계획과 관할 지침을 확인해야 합니다.
```

### EN — Foreign seasonal worker program

```
The MOJ policy-service page on the foreign seasonal worker program is operational guidance for short-term and seasonal labor programs responding to agricultural and fishery labor shortages. The process centers on local-government demand surveys, MOJ allocation review, sending-country or marriage-migrant family invitation channels, visa-issuance certificates or visas, and post-entry work/management. Detailed C-4 or E-8 status, stay period, employer requirements, absconding risk, and broker risk must be checked against the yearly allocation plan and local guidance.
```

### VI — Chương trình lao động thời vụ nước ngoài

```
Trang chương trình lao động thời vụ nước ngoài của Bộ Tư pháp là nguồn vận hành cho nhân lực ngắn hạn/theo mùa ở nông-ngư nghiệp. Quy trình gồm khảo sát nhu cầu của địa phương, phân bổ của Bộ Tư pháp, hợp tác với nước phái cử hoặc gia đình người kết hôn nhập cư, xác nhận cấp visa/visa và quản lý sau nhập cảnh. Cần kiểm tra kế hoạch phân bổ hằng năm và hướng dẫn địa phương cho C-4, E-8, thời hạn lưu trú, điều kiện chủ sử dụng và rủi ro môi giới.
```

### MN — Гадаад улирлын ажилтны хөтөлбөр

```
Хууль зүйн яамны улирлын ажилтны хөтөлбөр нь хөдөө аж ахуй, загас агнуурын улирлын ажиллах хүчний албан ёсны ажиллагааны эх сурвалж. Орон нутгийн эрэлт, яамны хуваарилалт, илгээгч улс эсвэл гэрлэлтийн цагаачийн гэр бүлийн урилга, визийн зөвшөөрөл ба виз, орж ирсний дараах ажил ба хяналтыг тайлбарладаг.
```

---

## A1-081 moj-online-stay-visa-center

- 제목: 온라인체류·사증민원센터
- 카테고리: process
- 출처 라벨: 법무부 정책서비스 · 온라인체류·사증민원센터
- 출처 URL: https://www.immigration.go.kr/moj/198/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 온라인체류·사증민원센터

```
법무부 온라인체류·사증민원센터 안내는 전자사증과 전자민원으로 신청할 수 있는 체류·사증 절차를 설명하는 공식 운영 출처입니다. 페이지는 우수인재·전자비자 대상, 재외공관 방문 없이 비자포털에서 신청 가능한 흐름, 등록외국인의 체류기간연장·체류자격변경·근무처변경·체류지변경 등 전자민원 항목, 전자민원 수수료 감면 가능성을 안내합니다. 다만 대상 자격과 신청 가능 여부는 비자포털/하이코리아의 현재 메뉴와 관할관서 판단에 따라 달라질 수 있습니다.
```

### EN — Online stay and visa petition center

```
The MOJ online stay and visa petition center is an official operational source for procedures available through e-visa and e-application. It covers eligible e-visa channels, applying through the Visa Portal without visiting a mission in some cases, e-application items for registered foreigners such as extension, status change, workplace change, and address change, and potential e-application fee discounts. Eligibility and online availability still depend on the current Visa Portal/HiKorea menu and competent-office judgment.
```

### VI — Trung tâm dân sự lưu trú/visa trực tuyến

```
Trang Trung tâm dân sự lưu trú/visa trực tuyến của Bộ Tư pháp giải thích thủ tục có thể nộp bằng e-visa và e-application. Trang nêu đối tượng tài năng/e-visa, luồng nộp qua Visa Portal không cần đến cơ quan lãnh sự trong một số trường hợp, các hồ sơ điện tử như gia hạn, đổi tư cách, đổi nơi làm việc, đổi địa chỉ và khả năng giảm phí. Đối tượng và khả năng nộp cần kiểm tra menu hiện tại và cơ quan có thẩm quyền.
```

### MN — Цахим оршин суух/визийн үйлчилгээний төв

```
Хууль зүйн яамны цахим оршин суух/визийн үйлчилгээний төв нь e-visa болон цахим өргөдлөөр гаргах боломжтой журмыг тайлбарладаг. Шилдэг авьяастан/e-visa, Visa Portal-оор өргөдөл гаргах урсгал, бүртгэлтэй гадаад иргэний сунгалт, ангилал өөрчлөх, ажлын газар ба оршин суух хаяг өөрчлөх зэрэг цахим үйлчилгээ, хураамжийн хөнгөлөлтийг заана.
```

---

## A1-082 moj-stay-management-policy

- 제목: 법무부 외국인 체류관리 정책
- 카테고리: process
- 출처 라벨: 법무부 이민정책 · 외국인 체류관리
- 출처 URL: https://www.immigration.go.kr/immigration/1515/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 법무부 외국인 체류관리 정책

```
법무부 외국인 체류관리 페이지는 전자비자, 유학생 관리, 노동시장 수요를 고려한 외국인 유입정책, 계절근로자 제도, 숙련기능인력 점수제 비자(E-7-4) 같은 체류관리 정책의 상위 운영 배경을 설명합니다. 2026-07-03 확인 기준 법무부는 일부 외국인이 비자포털로 전자비자를 신청·발급받을 수 있도록 하고, 유학생은 우수한 학습프로그램과 지원체계를 갖춘 학교 선택을 장려하며, 2024년에는 항공기 부품 제조원·요양보호사·송전전기원 등 전문·기능인력(E-7) 직종 신설을 안내합니다. 이 페이지는 구체 서류 요건 자체보다 정책 방향과 제도 연결 관계를 확인하는 보조 근거입니다.
```

### EN — MOJ foreigner stay-management policy

```
The MOJ foreigner stay-management page explains the policy background for e-visas, international-student management, labor-demand-based immigration policy, seasonal workers, and the skilled-worker points visa (E-7-4). As checked on 2026-07-03, MOJ describes e-visa application through the Visa Portal, encourages students to choose institutions with strong programs and support systems, and notes 2024 additions to certain E-7 professional/skilled occupations such as aircraft-parts manufacturing, care work, and power-transmission electrical work. This page is a supporting source for policy direction and program relationships, not a substitute for detailed filing requirements.
```

### VI — Chính sách quản lý lưu trú người nước ngoài của Bộ Tư pháp

```
Trang quản lý lưu trú người nước ngoài của Bộ Tư pháp mô tả nền chính sách cho e-visa, quản lý du học sinh, chính sách tiếp nhận lao động theo nhu cầu thị trường, lao động thời vụ và visa kỹ năng E-7-4. Kiểm tra ngày 2026-07-03, Bộ Tư pháp nêu việc nộp e-visa qua Visa Portal, khuyến khích du học sinh chọn trường có chương trình và hệ thống hỗ trợ tốt, và giới thiệu bổ sung một số nghề E-7 trong năm 2024. Trang này là căn cứ phụ để hiểu định hướng chính sách, không thay thế điều kiện hồ sơ cụ thể.
```

### MN — Хууль зүйн яамны гадаад иргэний оршин суух удирдлага

```
Хууль зүйн яамны гадаад иргэний оршин суух удирдлагын хуудас нь цахим виз, оюутны удирдлага, хөдөлмөрийн зах зээлийн хэрэгцээнд суурилсан гадаад ажиллах хүчний бодлого, улирлын ажилтан, E-7-4 ур чадвартай ажилтны визийн бодлогын суурийг тайлбарладаг. 2026-07-03-ны шалгалтаар Visa Portal цахим виз, сайн хөтөлбөртэй сургууль сонгохыг дэмжих, 2024 онд E-7 зарим мэргэжил нэмсэн тухай дурдсан. Энэ нь нарийн бичиг баримтын шаардлага бус бодлогын чиглэл ба тогтолцооны холбоог шалгах туслах эх сурвалж.
```

---

## A1-083 moj-tax-health-arrears-extension-restriction

- 제목: 비자연장 전 세금·건강보험료 체납 확인
- 카테고리: warning
- 출처 라벨: 법무부 주요제도 · 세금·건강보험료 체납 확인
- 출처 URL: https://www.immigration.go.kr/immigration/1522/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 비자연장 전 세금·건강보험료 체납 확인

```
법무부의 '외국인 비자연장 전 세금·건강보험료 체납 확인제도' 안내에 따르면 출입국관리공무원은 관계부처가 제공한 체납정보를 활용해 비자연장 등을 신청하는 외국인의 세금·건강보험료 체납 여부를 확인합니다. 체납이 있더라도 안내에 따라 모두 납부하면 정상적인 체류연장이 가능하지만, 미납 시에는 체류연장이 제한될 수 있고 원칙적으로 6개월 이하만 허가될 수 있습니다. 이 제도는 전국 38개 출입국기관에서 운영되며 외국인보호소와 출입국지원센터는 제외됩니다. 연장 상담에서는 소득·고용·학교 요건뿐 아니라 세금, 건강보험료, 부당이득금 체납 여부를 반드시 확인해야 합니다.
```

### EN — Tax and health-insurance arrears check before visa extension

```
MOJ guidance on tax and health-insurance arrears checks before visa extension says immigration officers use arrears data supplied by related agencies when reviewing foreign nationals applying for extension and similar stay permissions. If arrears are paid in full after notice, normal extension may be possible; if unpaid, extension may be restricted and, in principle, allowed for no more than six months. The system operates at 38 immigration offices nationwide, excluding immigration detention and support centers. Extension consultations must therefore check tax, health-insurance, and unjust-enrichment arrears alongside income, employment, and school requirements.
```

### VI — Kiểm tra nợ thuế/bảo hiểm y tế trước khi gia hạn visa

```
Theo hướng dẫn của Bộ Tư pháp về kiểm tra nợ thuế và bảo hiểm y tế trước khi gia hạn visa, cán bộ xuất nhập cảnh dùng thông tin nợ do cơ quan liên quan cung cấp để kiểm tra người nước ngoài khi xin gia hạn. Nếu có nợ nhưng thanh toán đầy đủ theo hướng dẫn thì có thể gia hạn bình thường; nếu chưa nộp, thời hạn gia hạn có thể bị hạn chế và về nguyên tắc có thể chỉ được cho 6 tháng trở xuống. Chế độ vận hành tại 38 cơ quan xuất nhập cảnh, trừ cơ sở bảo hộ và trung tâm hỗ trợ xuất nhập cảnh.
```

### MN — Виз сунгахаас өмнөх татвар/эрүүл мэндийн даатгалын өр шалгалт

```
Хууль зүйн яамны виз сунгалтаас өмнөх татвар, эрүүл мэндийн даатгалын өр шалгах журамд зааснаар цагаачлалын ажилтан холбогдох байгууллагаас ирүүлсэн өрийн мэдээллээр сунгалт хүссэн гадаад иргэнийг шалгана. Өртэй ч бүрэн төлбөл хэвийн сунгалт боломжтой; төлөөгүй бол сунгалт хязгаарлагдаж зарчмын хувьд 6 сараас доош хугацаагаар зөвшөөрөгдөж болно. Энэ нь 38 цагаачлалын байгууллагад хэрэгждэг.
```

---

## A1-084 moj-social-integration-program-kiip

- 제목: 사회통합프로그램(KIIP) 체류·영주·국적 활용
- 카테고리: visa
- 출처 라벨: 법무부 주요제도 · 사회통합프로그램
- 출처 URL: https://www.immigration.go.kr/moj/369/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 사회통합프로그램(KIIP) 체류·영주·국적 활용

```
법무부 사회통합프로그램 안내에 따르면 참여 대상은 국적·영주 등 체류자격을 취득하려는 재한외국인과 국적취득 후 3년 이내인 사람입니다. 이수혜택은 체류허가 및 영주·국적 신청 시 가점 부여 또는 귀화시험 면제 등으로 안내됩니다. 과정은 한국어와 한국문화 0~4단계, 한국사회 이해 과정으로 구성되며 한국사회 이해는 영주자격 취득 시 70시간, 국적취득 시 100시간 기준이 표시됩니다. 신청은 사회통합정보망 회원가입 후 단계배정을 거쳐 진행하고, 사전평가는 KIIP 평가 사이트에서 신청하며 응시 수수료 38,000원이 안내되어 있습니다. F-2/F-5, E-7-4, 귀화 또는 점수제 상담에서는 이수 단계·사전평가·유효한 증빙을 반드시 확인해야 합니다.
```

### EN — KIIP for stay permission, permanent residence, and nationality

```
MOJ KIIP guidance says eligible participants include foreign residents seeking stay statuses such as permanent residence or nationality, and people within three years after acquiring Korean nationality. Benefits include points for stay, permanent-residence, or nationality applications, and possible exemption from the naturalization test. The curriculum includes Korean language and culture levels 0-4 plus Understanding Korean Society; the latter is shown as 70 hours for permanent residence and 100 hours for nationality. Applicants register through Socinet and level placement; the pre-test is handled through the KIIP test site with a 38,000 KRW fee. F-2/F-5, E-7-4, naturalization, and point-based consultations must verify the completion level, pre-test status, and current proof.
```

### VI — Chương trình hội nhập xã hội KIIP cho lưu trú, thường trú và quốc tịch

```
Theo hướng dẫn KIIP của Bộ Tư pháp, người nước ngoài tại Hàn Quốc muốn lấy tư cách lưu trú như thường trú/quốc tịch và người đã nhập quốc tịch trong vòng 3 năm có thể tham gia. Lợi ích gồm điểm cộng khi xin lưu trú, thường trú hoặc quốc tịch, hoặc miễn kỳ thi nhập quốc tịch. Chương trình gồm tiếng Hàn và văn hóa Hàn 0-4 cấp, cùng khóa hiểu biết xã hội Hàn Quốc; phần này là 70 giờ cho thường trú và 100 giờ cho quốc tịch. Đăng ký qua Socinet sau khi phân cấp; bài kiểm tra đầu vào đăng ký tại trang KIIP test với phí 38,000 KRW.
```

### MN — KIIP нийгмийн нэгтгэлийн хөтөлбөр ба оршин суух/байнгын оршин суух/иргэншил

```
Хууль зүйн яамны KIIP тайлбараар оршин суух эрх, байнгын оршин суух, иргэншил авахыг хүссэн гадаад иргэн болон иргэншил авснаас хойш 3 жилийн доторх хүн хамрагдаж болно. Давуу тал нь оршин суух, байнгын оршин суух, иргэншлийн өргөдөлд оноо нэмэх эсвэл иргэншлийн шалгалтаас чөлөөлөх зэрэг. Хөтөлбөр нь Солонгос хэл, соёл 0-4 шат болон Солонгос нийгмийн ойлголтоос бүрдэнэ; байнгын оршин суухад 70 цаг, иргэншилд 100 цаг гэж заасан.
```

---

## A1-085 moj-k-eta-entry-authorization

- 제목: 전자여행허가제(K-ETA) 입국 전 확인
- 카테고리: process
- 출처 라벨: 법무부 주요제도 · 전자여행허가제(K-ETA)
- 출처 URL: https://www.immigration.go.kr/immigration/3339/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 3

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 전자여행허가제(K-ETA) 입국 전 확인

```
법무부 전자여행허가제(K-ETA) 안내에 따르면 K-ETA는 무사증 입국 가능 국가 국민이 한국 입국 전 여행정보를 입력하고 여행허가를 받는 제도입니다. 법무부 페이지는 대상 국가·지역을 B-1 사증면제 67개와 B-2 관광통과 45개 등 총 112개로 안내하고, 공식 홈페이지(www.k-eta.go.kr) 또는 모바일 앱에서 항공기·선박 탑승 최소 72시간 전 신청을 권장합니다. 수수료는 10,000원, 유효기간은 원칙적으로 3년이지만 여권 유효기간이 더 짧으면 그 기간까지만 유효합니다. K-ETA 대상자는 승인 없이는 한국행 항공기·선박 탑승이 제한될 수 있고, 승인자는 입국신고서 제출이 면제됩니다. 외교·관용 여권, ABTC, 승무원·선원, 환승객, 17세 이하 또는 65세 이상 등 면제 사유는 최신 원문 기준으로 다시 확인해야 합니다.
```

### EN — K-ETA pre-entry authorization check

```
MOJ K-ETA guidance says K-ETA is a pre-entry travel authorization for nationals eligible for visa-free entry who submit travel information before entering Korea. The page lists 112 countries/regions, including 67 B-1 visa-waiver and 45 B-2 tourist/transit categories, and recommends applying through the official website or mobile app at least 72 hours before boarding an aircraft or ship. The fee is KRW 10,000, validity is generally three years but capped by passport validity, K-ETA-required travelers may be unable to board without approval, and approved travelers are exempt from the arrival card. Exemptions such as diplomatic/official passports, ABTC, crew/seafarers, transit passengers, and age-based exemptions must be checked against the current official text.
```

### VI — Kiểm tra K-ETA trước khi nhập cảnh

```
Theo hướng dẫn K-ETA của Bộ Tư pháp, K-ETA là cơ chế người thuộc quốc gia được miễn visa nhập thông tin du lịch và nhận phép đi Hàn Quốc trước khi nhập cảnh. Trang nêu 112 quốc gia/khu vực, gồm 67 diện miễn visa B-1 và 45 diện du lịch/quá cảnh B-2; nên nộp qua website chính thức hoặc ứng dụng trước khi lên máy bay/tàu ít nhất 72 giờ. Phí là 10,000 KRW, hiệu lực nguyên tắc 3 năm nhưng không vượt quá hạn hộ chiếu. Người thuộc diện K-ETA có thể bị hạn chế lên máy bay/tàu nếu chưa được chấp thuận, và người có K-ETA được miễn phiếu nhập cảnh.
```

### MN — K-ETA нэвтрэхийн өмнөх шалгалт

```
Хууль зүйн яамны K-ETA тайлбараар K-ETA нь визгүй нэвтрэх боломжтой улсын иргэн Солонгост ирэхээс өмнө аяллын мэдээллээ оруулж зөвшөөрөл авах тогтолцоо. Нийт 112 улс/бүсэд B-1 визээс чөлөөлөгдөх 67, B-2 аялал/дамжин өнгөрөх 45 багтдаг. Албан ёсны сайт эсвэл апп-аар онгоц/усан онгоцонд суухаас дор хаяж 72 цагийн өмнө хүсэлт гаргахыг зөвлөдөг. Хураамж 10,000 вон, хүчинтэй хугацаа зарчмаар 3 жил боловч паспортын хугацаа богино бол тэр хүртэл хүчинтэй.
```

---

## A1-086 moj-k-eta-scam-warning

- 제목: K-ETA 유사 웹사이트·대행 주의
- 카테고리: warning
- 출처 라벨: 법무부 공지사항 · K-ETA 유사 웹사이트 주의
- 출처 URL: https://www.immigration.go.kr/bbs/immigration/220/597906/artclView.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2025-08-12 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — K-ETA 유사 웹사이트·대행 주의

```
법무부는 2025-08-12 공지에서 K-ETA 유사 웹사이트 주의를 안내했습니다. K-ETA 신청은 공식 홈페이지(www.k-eta.go.kr) 또는 K-ETA 모바일 앱에서 해야 하며, 한국 정부는 K-ETA 신청 대행기관을 지정하지 않았다고 공지합니다. 상담 답변에서 K-ETA 수수료·승인 가능성·긴급 대행을 내세우는 외부 사이트나 브로커가 등장하면 공식 사이트 여부, 결제 금액, 개인정보 제출 경로를 먼저 확인하도록 안내해야 합니다.
```

### EN — K-ETA unofficial website and agency warning

```
The MOJ notice dated 2025-08-12 warns about K-ETA lookalike websites. K-ETA applications should be made through the official website or K-ETA mobile app, and the Korean government has not designated K-ETA application agencies. If an outside site or broker promotes K-ETA fees, guaranteed approval, or urgent handling, KAXI should tell users to verify the official site, payment amount, and personal-data submission route first.
```

### VI — Cảnh báo website/đại lý K-ETA không chính thức

```
Thông báo Bộ Tư pháp ngày 2025-08-12 cảnh báo về các website tương tự K-ETA. Hồ sơ K-ETA phải nộp qua website chính thức hoặc ứng dụng K-ETA; chính phủ Hàn Quốc không chỉ định cơ quan đại lý K-ETA. Khi tư vấn, nếu có website ngoài hoặc môi giới quảng cáo phí, khả năng được duyệt hoặc xử lý khẩn, cần kiểm tra trước website chính thức, số tiền thanh toán và nơi gửi dữ liệu cá nhân.
```

### MN — K-ETA төстэй сайт, зуучлагчийн анхааруулга

```
2025-08-12-ны Хууль зүйн яамны мэдэгдэл K-ETA-тэй төстэй сайтуудаас болгоомжлохыг анхааруулсан. K-ETA хүсэлтийг албан ёсны сайт эсвэл апп-аар гаргах бөгөөд Солонгосын засгийн газар K-ETA зуучлагч байгууллага томилоогүй. Гаднын сайт, зуучлагч төлбөр, баталгаатай зөвшөөрөл, яаралтай үйлчилгээ санал болговол албан ёсны сайт, төлбөр, хувийн мэдээлэл өгөх сувгийг шалгана.
```

---

## A1-087 moj-e-arrival-card

- 제목: 전자입국신고서(e-Arrival card) 제출 대상
- 카테고리: process
- 출처 라벨: 법무부 주요제도 · 전자입국신고서(e-Arrival card)
- 출처 URL: https://www.immigration.go.kr/immigration/3509/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 전자입국신고서(e-Arrival card) 제출 대상

```
법무부 전자입국신고서(e-Arrival card) 안내와 2025-02-18 시행 공지에 따르면 전자입국신고서는 종이 입국신고서를 온라인으로 제출하는 제도이며, 2025-02-24부터 시행됩니다. 원칙적으로 한국에 입국하는 외국인은 입국신고서를 제출해야 하지만 등록외국인(영주권자와 국내거소신고자 포함), 유효한 K-ETA 승인자, 항공기 승무원 등은 면제됩니다. 도착 예정일 기준 대한민국 표준시 3일 전부터 제출할 수 있고, 제출 후 72시간 내 입국하지 않으면 효력이 없어질 수 있습니다. 만 14세 미만은 가족 등 대리인이 제출해야 하며, 여러 명은 추가 신청자로 9명까지 함께 제출하고 10명 이상은 PC 홈페이지 단체 제출 기능을 사용합니다.
```

### EN — e-Arrival card submission scope

```
MOJ e-Arrival card guidance and the 2025-02-18 implementation notice say the e-Arrival card is the online submission version of the paper arrival card, effective from 2025-02-24. In principle, foreigners entering Korea submit an arrival card, but registered foreigners, including permanent residents and domestic-residence reporters, valid K-ETA holders, and aircraft crew are exempt. It can be submitted from three days before arrival in Korean Standard Time, and may become invalid if the traveler does not enter within 72 hours after submission. Applicants under 14 must be submitted by family or another representative; up to nine people can be added together, while ten or more use group submission on the PC website.
```

### VI — Đối tượng nộp e-Arrival card

```
Theo hướng dẫn e-Arrival card và thông báo ngày 2025-02-18 của Bộ Tư pháp, e-Arrival card là chế độ nộp phiếu nhập cảnh giấy bằng hình thức trực tuyến, áp dụng từ 2025-02-24. Về nguyên tắc người nước ngoài nhập cảnh Hàn Quốc phải nộp phiếu nhập cảnh, nhưng người nước ngoài đã đăng ký, thường trú nhân, người khai báo cư trú trong nước, người có K-ETA còn hiệu lực và tổ bay được miễn. Có thể nộp từ 3 ngày trước ngày đến theo giờ Hàn Quốc; nếu không nhập cảnh trong 72 giờ sau khi nộp thì có thể hết hiệu lực.
```

### MN — e-Arrival card мэдүүлэх хүрээ

```
Хууль зүйн яамны e-Arrival card тайлбар болон 2025-02-18-ны мэдэгдлээр цахим нэвтрэх мэдүүлэг нь цаасан arrival card-ыг онлайнаар өгөх тогтолцоо бөгөөд 2025-02-24-өөс хэрэгжинэ. Ерөнхийдөө Солонгост орж буй гадаад иргэн мэдүүлэг өгнө. Харин бүртгэлтэй гадаад иргэн, байнгын оршин суугч, дотоод оршин суух мэдэгдэлтэй хүн, хүчинтэй K-ETA зөвшөөрөлтэй хүн, онгоцны баг гэх мэт нь чөлөөлөгдөнө. Солонгосын цагаар ирэхээс 3 хоногийн өмнөөс өгч болно.
```

---

## A1-088 moj-e-arrival-card-notice

- 제목: 전자입국신고서 시행 공지와 운영 세부
- 카테고리: process
- 출처 라벨: 법무부 공지사항 · 전자입국신고서 시행 알림
- 출처 URL: https://www.immigration.go.kr/bbs/immigration/224/592036/artclView.do?layout=unknown
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2025-02-24 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 전자입국신고서 시행 공지와 운영 세부

```
법무부의 2025-02-18 전자입국신고서 시행 공지는 2025-02-24 시행, 2025년 12월까지 종이 입국신고서 병행 사용 가능, 제출 수수료 없음, 별도 승인 절차 없음, 입국 시 PDF나 출력물을 지참할 필요 없음이라는 운영 원칙을 안내합니다. 제출 시 여권, 항공편 또는 선박편, 국내 체류지 주소, 이메일을 준비하고, 입국심사 전까지 입력 정보 수정이 가능합니다. KAXI는 입국신고서 상담에서 e-Arrival 제출 여부만 답하지 말고 K-ETA 보유 여부, 등록외국인 여부, 단체 제출 규모, 도착 예정일과 제출 시각을 함께 확인해야 합니다.
```

### EN — e-Arrival card implementation notice

```
The MOJ 2025-02-18 e-Arrival implementation notice states that the system starts on 2025-02-24, paper arrival cards can be used in parallel until December 2025, there is no fee, there is no separate approval process, and travelers do not need to carry a PDF or printout at entry. Submission requires passport, flight or ship, Korean address, and email information, and the entered data can be modified before immigration inspection. KAXI should check K-ETA status, registered-foreigner status, group size, arrival date, and submission timing together.
```

### VI — Thông báo triển khai e-Arrival card

```
Thông báo Bộ Tư pháp ngày 2025-02-18 nêu e-Arrival card áp dụng từ 2025-02-24, có thể dùng song song phiếu giấy đến hết tháng 12/2025, không có phí, không có quy trình phê duyệt riêng và không cần mang PDF/bản in khi nhập cảnh. Khi nộp cần chuẩn bị hộ chiếu, chuyến bay/tàu, địa chỉ lưu trú tại Hàn Quốc và email; có thể sửa thông tin trước khi qua kiểm tra nhập cảnh.
```

### MN — e-Arrival card хэрэгжилтийн мэдэгдэл

```
2025-02-18-ны мэдэгдэлд e-Arrival card 2025-02-24-өөс хэрэгжих, 2025 оны 12 сар хүртэл цаасан мэдүүлгийг зэрэг хэрэглэх, хураамжгүй, тусдаа зөвшөөрөл шаардахгүй, орж ирэхдээ PDF эсвэл хэвлэмэл авч явах шаардлагагүй гэж заасан. Паспорт, нислэг/усан онгоц, Солонгост байх хаяг, имэйл бэлдэж, хилээр орохоос өмнө мэдээллээ засаж болно.
```

---

## A1-089 moj-office-jurisdiction-seoul-incheon-gyeonggi

- 제목: 서울·인천·경기 출입국 관할구역
- 카테고리: process
- 출처 라벨: 법무부 소속기관 · 서울/인천/경기 관할구역
- 출처 URL: https://www.immigration.go.kr/immigration/2057/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 4

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 서울·인천·경기 출입국 관할구역

```
법무부 소속기관 관할구역 안내는 서울·인천·경기 지역의 출입국·외국인관서별 관할, 주소, 대표전화, 업무 범위를 확인하는 공식 출처입니다. 외국인등록, 체류기간연장, 체류자격변경, 체류지 변경신고, 방문예약을 안내하기 전에는 거주지·근무지·신청 업무 기준의 관할관서를 먼저 확인해야 합니다. 2026-07-03 확인 기준 서울출입국·외국인청은 관악구, 광진구, 강남구, 강동구, 동작구, 송파구, 성동구, 서초구, 용산구와 성남시, 하남시, 과천시를 관할 예시로 표시합니다. 세종로출장소는 종로구, 중구, 은평구, 동대문구, 중랑구, 도봉구, 성북구, 강북구, 노원구를, 서울남부출입국·외국인사무소는 서대문구, 마포구, 강서구, 양천구, 영등포구, 구로구, 금천구를 표시합니다. 인천·수원·양주·안산·고양·김포공항 등은 지역과 업무가 나뉘므로 최종 접수 전 원문과 1345 안내를 재확인해야 합니다.
```

### EN — Seoul, Incheon, and Gyeonggi immigration office jurisdiction

```
The MOJ office-jurisdiction page is the official source for immigration-office jurisdiction, address, phone number, and service scope in Seoul, Incheon, and Gyeonggi. Before advising on alien registration, extension, status change, address reporting, or visit reservation, KAXI must check the competent office by residence, workplace, and petition type. As checked on 2026-07-03, the Seoul office lists districts including Gangnam, Songpa, Seocho, Yongsan, and the cities of Seongnam, Hanam, and Gwacheon; Sejongno and Seoul Southern list separate district groups. Incheon, Suwon, Yangju, Ansan, Goyang, and Gimpo Airport have regional and service-scope splits, so the original page and 1345 should be checked before filing.
```

### VI — Khu vực thẩm quyền xuất nhập cảnh Seoul·Incheon·Gyeonggi

```
Trang thẩm quyền cơ quan trực thuộc Bộ Tư pháp là nguồn chính thức để kiểm tra văn phòng, địa chỉ, số điện thoại và phạm vi nghiệp vụ cho Seoul, Incheon và Gyeonggi. Trước khi hướng dẫn đăng ký người nước ngoài, gia hạn, đổi tư cách, khai báo địa chỉ hoặc đặt lịch, cần xác định văn phòng theo nơi cư trú, nơi làm việc và loại việc. Kiểm tra ngày 2026-07-03, văn phòng Seoul nêu các khu như Gangnam, Songpa, Seocho, Yongsan và các thành phố Seongnam, Hanam, Gwacheon; Sejongno và Seoul Southern có phạm vi riêng. Incheon, Suwon, Yangju, Ansan, Goyang và Gimpo Airport có chia theo địa bàn/nghiệp vụ nên phải kiểm tra bản gốc và 1345 trước khi nộp.
```

### MN — Сөүл·Инчон·Кёнги цагаачлалын харьяалал

```
Хууль зүйн яамны харьяа байгууллагын нутаг дэвсгэрийн хуудас нь Сөүл, Инчон, Кёнги бүсийн байгууллага, хаяг, утас, үйлчилгээний хамрах хүрээг шалгах албан ёсны эх сурвалж. Гадаад иргэний бүртгэл, сунгалт, ангилал өөрчлөх, хаяг мэдэгдэх, цаг захиалга зөвлөхөөс өмнө оршин суугаа газар, ажиллах газар, үйлчилгээний төрлөөр харьяалах байгууллагыг шалгана. 2026-07-03-нд Сөүл байгууллага Gangnam, Songpa, Seocho, Yongsan болон Seongnam, Hanam, Gwacheon зэрэг газрыг жишээ болгон харуулсан; Sejongno болон Seoul Southern тусдаа хамрах хүрээтэй. Эцсийн мэдүүлгийн өмнө эх сурвалж болон 1345-г дахин шалгана.
```

---

## A1-090 moj-office-jurisdiction-busan-gyeongnam

- 제목: 부산·경남 출입국 관할구역
- 카테고리: process
- 출처 라벨: 법무부 소속기관 · 부산/경남 관할구역
- 출처 URL: https://www.immigration.go.kr/immigration/2058/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 부산·경남 출입국 관할구역

```
법무부 부산·경남 관할구역 안내는 부산출입국·외국인청, 별관, 김해출장소, 김해공항출장소, 울산출장소, 창원출입국·외국인사무소와 거제·사천·통영출장소의 관할과 업무 범위를 구분합니다. 2026-07-03 확인 기준 부산 본청과 별관은 부산 지역과 경남 일부 지역을 다루되, 선박·조사·사범·난민·국적·체류 업무가 장소별로 나뉘어 표시됩니다. 김해공항은 공항 출입국심사 업무, 울산은 울산광역시와 경주시를 표시합니다. 부산·경남 사용자의 방문예약이나 접수 안내는 지역명만으로 단정하지 말고 업무 종류까지 확인해야 합니다.
```

### EN — Busan and Gyeongnam immigration office jurisdiction

```
The MOJ Busan and Gyeongnam page separates the jurisdiction and service scope of the Busan office, annex, Gimhae, Gimhae Airport, Ulsan, Changwon, and the Geoje, Sacheon, and Tongyeong branches. As checked on 2026-07-03, Busan covers Busan and parts of Gyeongnam, but ship, investigation, violation, refugee, nationality, and stay services are split by location. Visit-reservation or filing guidance should therefore check both geography and petition type.
```

### VI — Khu vực thẩm quyền xuất nhập cảnh Busan·Gyeongnam

```
Trang Busan·Gyeongnam của Bộ Tư pháp phân biệt thẩm quyền và phạm vi nghiệp vụ của văn phòng Busan, phụ lục, Gimhae, Gimhae Airport, Ulsan, Changwon và các chi nhánh Geoje, Sacheon, Tongyeong. Kiểm tra ngày 2026-07-03, Busan xử lý Busan và một phần Gyeongnam nhưng nghiệp vụ tàu biển, điều tra, vi phạm, tị nạn, quốc tịch và lưu trú được chia theo địa điểm. Không nên kết luận chỉ bằng tên khu vực; cần kiểm tra cả loại việc.
```

### MN — Бусан·Кённам цагаачлалын харьяалал

```
Бусан·Кённам хуудас нь Busan, Gimhae, Gimhae Airport, Ulsan, Changwon болон Geoje, Sacheon, Tongyeong салбаруудын харьяалал ба үйлчилгээний хүрээг ялгадаг. 2026-07-03-ны шалгалтаар Бусан нь бүс ба зарим Кённам нутгийг хариуцах боловч хөлөг онгоц, мөрдөн шалгах, зөрчил, дүрвэгч, иргэншил, оршин суух ажил нь байрлалаар хуваагдана. Зөвлөгөө өгөхдөө зөвхөн хотын нэрээр биш үйлчилгээний төрлөөр шалгана.
```

---

## A1-091 moj-office-jurisdiction-gwangju-jeolla-jeju

- 제목: 광주·전라·제주 출입국 관할구역
- 카테고리: process
- 출처 라벨: 법무부 소속기관 · 광주/전라/제주 관할구역
- 출처 URL: https://www.immigration.go.kr/immigration/2059/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 광주·전라·제주 출입국 관할구역

```
법무부 광주·전라·제주 관할구역 안내는 제주출입국·외국인청, 여수출입국·외국인사무소, 광양출장소, 광주출입국·외국인사무소와 무안·목포 등 지역 사무소의 관할을 확인하는 공식 출처입니다. 2026-07-03 확인 기준 제주 관서는 제주특별자치도를 표시하고, 여수·광양·광주 권역은 지역과 업무가 세분되어 있습니다. 항만·공항·체류 민원·출장소 운영 여부가 다를 수 있으므로, 광주·전라·제주 지역 안내는 원문 관할표와 1345 확인을 함께 요구해야 합니다.
```

### EN — Gwangju, Jeolla, and Jeju immigration office jurisdiction

```
The MOJ Gwangju, Jeolla, and Jeju page is the official source for the jurisdiction of Jeju, Yeosu, Gwangyang, Gwangju, and local offices such as Muan and Mokpo. As checked on 2026-07-03, Jeju lists Jeju Special Self-Governing Province, while Yeosu, Gwangyang, and Gwangju are divided by region and service type. Because port, airport, stay-service, and branch-office operation can differ, KAXI should require the original table and 1345 confirmation.
```

### VI — Khu vực thẩm quyền xuất nhập cảnh Gwangju·Jeolla·Jeju

```
Trang Gwangju·Jeolla·Jeju của Bộ Tư pháp là nguồn chính thức để kiểm tra thẩm quyền của Jeju, Yeosu, Gwangyang, Gwangju và các chi nhánh như Muan, Mokpo. Kiểm tra ngày 2026-07-03, Jeju áp dụng cho tỉnh tự trị đặc biệt Jeju, còn Yeosu, Gwangyang và Gwangju được chia theo khu vực và nghiệp vụ. Cần kiểm tra bảng gốc và 1345 vì cảng, sân bay, lưu trú và chi nhánh có thể khác nhau.
```

### MN — Гванжу·Жолла·Жэжү цагаачлалын харьяалал

```
Гванжу·Жолла·Жэжү хуудас нь Jeju, Yeosu, Gwangyang, Gwangju болон Muan, Mokpo зэрэг байгууллагын харьяаллыг шалгах албан ёсны эх сурвалж. 2026-07-03-ны байдлаар Jeju нь Жэжү тусгай өөртөө засах мужийг харуулдаг бөгөөд Yeosu, Gwangyang, Gwangju бүс нь газар нутаг ба ажлын төрлөөр хуваагдана. Боомт, нисэх буудал, оршин суух үйлчилгээ, салбарын ажиллагааг эх хүснэгт болон 1345-аар шалгана.
```

---

## A1-092 moj-office-jurisdiction-daegu-gyeongbuk-gangwon

- 제목: 대구·경북·강원 출입국 관할구역
- 카테고리: process
- 출처 라벨: 법무부 소속기관 · 대구/경북/강원 관할구역
- 출처 URL: https://www.immigration.go.kr/immigration/2060/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 대구·경북·강원 출입국 관할구역

```
법무부 대구·경북·강원 관할구역 안내는 대구출입국·외국인사무소, 포항출장소, 구미출장소, 춘천출입국·외국인사무소와 고성·동해출장소 등 권역별 관할을 확인하는 공식 출처입니다. 2026-07-03 확인 기준 대구·경북은 대구, 경산, 영천, 청도 등과 포항·구미 권역으로 업무가 나뉘고, 강원은 춘천 사무소와 고성·동해 등 출장소로 나뉘어 표시됩니다. 원주 등 강원 지역 민원은 이동출입국사무소 운영 여부도 함께 확인해야 하며, 주소지 기준 관할과 실제 접수 가능 업무가 일치하는지 원문으로 재확인해야 합니다.
```

### EN — Daegu, Gyeongbuk, and Gangwon immigration office jurisdiction

```
The MOJ Daegu, Gyeongbuk, and Gangwon page is the official source for the jurisdiction of Daegu, Pohang, Gumi, Chuncheon, and branches such as Goseong and Donghae. As checked on 2026-07-03, Daegu/Gyeongbuk and Gangwon are split by region and service scope. For Gangwon cases such as Wonju, KAXI should also check mobile immigration-office operation and verify whether the residence-based office can actually receive the petition type.
```

### VI — Khu vực thẩm quyền xuất nhập cảnh Daegu·Gyeongbuk·Gangwon

```
Trang Daegu·Gyeongbuk·Gangwon của Bộ Tư pháp là nguồn chính thức cho Daegu, Pohang, Gumi, Chuncheon và các chi nhánh Goseong, Donghae. Kiểm tra ngày 2026-07-03, Daegu/Gyeongbuk và Gangwon được chia theo địa bàn và nghiệp vụ. Với các khu vực như Wonju, cần kiểm tra thêm văn phòng di động và xác nhận bản gốc xem nơi cư trú và nghiệp vụ có được tiếp nhận tại văn phòng đó không.
```

### MN — Дэгү·Кёнбук·Канвон цагаачлалын харьяалал

```
Дэгү·Кёнбук·Канвон хуудас нь Daegu, Pohang, Gumi, Chuncheon болон Goseong, Donghae салбаруудын харьяаллыг шалгах албан ёсны эх сурвалж. 2026-07-03-ны байдлаар бүс нутгууд газар ба ажлын төрлөөр хуваагддаг. Wonju зэрэг Канвон бүсийн асуудалд хөдөлгөөнт цагаачлалын албаны ажиллагааг давхар шалгаж, оршин суугаа газрын харьяалал ба бодитоор авах үйлчилгээ нийцэж байгаа эсэхийг эх сурвалжаар баталгаажуулна.
```

---

## A1-093 moj-office-jurisdiction-daejeon-chungcheong

- 제목: 대전·충청 출입국 관할구역
- 카테고리: process
- 출처 라벨: 법무부 소속기관 · 대전/충청 관할구역
- 출처 URL: https://www.immigration.go.kr/immigration/2061/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 대전·충청 출입국 관할구역

```
법무부 대전·충청 관할구역 안내는 대전출입국·외국인사무소, 천안출장소, 아산출장소, 서산출장소 등 충청권 관할과 업무 범위를 확인하는 공식 출처입니다. 2026-07-03 확인 기준 대전 관서는 대전광역시, 충청남도 일부, 충청북도 영동군·옥천군, 세종특별자치시를 표시하되 천안·아산·서산 등 제외·분리 지역이 함께 표시됩니다. 충청권은 산업단지, 학교, 거주지 이전 상담이 많으므로 체류지와 근무지 중 어떤 기준으로 접수해야 하는지 원문 관할표, 하이코리아 방문예약 가능 항목, 1345 안내를 함께 확인해야 합니다.
```

### EN — Daejeon and Chungcheong immigration office jurisdiction

```
The MOJ Daejeon and Chungcheong page is the official source for the jurisdiction and service scope of Daejeon, Cheonan, Asan, Seosan, and related offices. As checked on 2026-07-03, Daejeon lists Daejeon, parts of Chungnam, Yeongdong and Okcheon in Chungbuk, and Sejong, while Cheonan, Asan, Seosan, and other areas are separated. For industrial-complex, school, or address-move cases, KAXI should check the original table, HiKorea reservation items, and 1345 together.
```

### VI — Khu vực thẩm quyền xuất nhập cảnh Daejeon·Chungcheong

```
Trang Daejeon·Chungcheong của Bộ Tư pháp là nguồn chính thức cho Daejeon, Cheonan, Asan, Seosan và các văn phòng liên quan. Kiểm tra ngày 2026-07-03, Daejeon gồm Daejeon, một phần Chungnam, Yeongdong/Okcheon của Chungbuk và Sejong, nhưng Cheonan, Asan, Seosan và một số khu vực được tách riêng. Với khu công nghiệp, trường học hoặc chuyển địa chỉ, cần kiểm tra bảng gốc, mục đặt lịch HiKorea và 1345.
```

### MN — Дэжон·Чүнчон цагаачлалын харьяалал

```
Дэжон·Чүнчон хуудас нь Daejeon, Cheonan, Asan, Seosan зэрэг байгууллагын харьяалал ба үйлчилгээний хүрээг шалгах албан ёсны эх сурвалж. 2026-07-03-ны байдлаар Daejeon нь Дэжон, Чүннамын зарим хэсэг, Чүнбукийн Yeongdong/Okcheon, Sejong-г хамардаг боловч Cheonan, Asan, Seosan зэрэг тусдаа бүсүүдтэй. Аж үйлдвэрийн бүс, сургууль, хаяг шилжилтийн зөвлөгөөнд эх хүснэгт, HiKorea цаг захиалга, 1345-г хамтад нь шалгана.
```

---

## A1-094 moj-mobile-immigration-office

- 제목: 이동출입국사무소 운영 확인
- 카테고리: process
- 출처 라벨: 법무부 누리집안내 · 이동출입국사무소
- 출처 URL: https://www.immigration.go.kr/immigration/2344/subview.do
- 출처 유형: official_government
- 관할: KR
- 유효기간: 2026-07-02 ~ 없음
- 최종 확인일: 2026-07-03
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 2

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 이동출입국사무소 운영 확인

```
법무부 이동출입국사무소 안내 페이지는 관할기관별 이동출입국사무소와 운영 안내문 다운로드를 제공하는 공식 출처입니다. 2026-07-03 확인 기준 페이지는 춘천출입국·외국인사무소 관할 원주 이동출입국사무소 운영 안내문을 표시합니다. 이동출입국사무소는 운영일, 장소, 처리 가능 업무, 예약 방식이 바뀔 수 있으므로 사용자가 원주 등 원거리 지역에서 접수하려는 경우 관할 사무소, 운영 안내문, 하이코리아 방문예약 가능 여부를 확인한 뒤 안내해야 합니다. 이동사무소가 없거나 해당 업무를 처리하지 않으면 상급 관할관서 방문이 필요할 수 있습니다.
```

### EN — Mobile immigration office operation check

```
The MOJ mobile immigration-office page is the official source for mobile-office lists and operation-notice downloads by competent office. As checked on 2026-07-03, it shows an operation notice for the Wonju mobile immigration office under the Chuncheon office. Operation date, location, eligible petition types, and reservation method can change, so cases in remote areas such as Wonju should verify the competent office, operation notice, and HiKorea reservation availability before advising a visit.
```

### VI — Kiểm tra văn phòng xuất nhập cảnh lưu động

```
Trang văn phòng xuất nhập cảnh lưu động của Bộ Tư pháp cung cấp danh sách văn phòng lưu động theo cơ quan quản lý và tệp hướng dẫn vận hành. Kiểm tra ngày 2026-07-03, trang hiển thị hướng dẫn cho văn phòng lưu động Wonju thuộc Chuncheon. Ngày hoạt động, địa điểm, loại việc và cách đặt lịch có thể thay đổi, nên người ở vùng xa như Wonju phải kiểm tra cơ quan quản lý, thông báo vận hành và khả năng đặt lịch trên HiKorea trước khi đi.
```

### MN — Хөдөлгөөнт цагаачлалын албаны ажиллагаа шалгах

```
Хууль зүйн яамны хөдөлгөөнт цагаачлалын албаны хуудас нь харьяа байгууллага бүрийн хөдөлгөөнт алба болон ажиллагааны зааврын таталтыг өгдөг албан ёсны эх сурвалж. 2026-07-03-ны байдлаар Chuncheon байгууллагын Wonju хөдөлгөөнт албаны заавар харагдана. Ажиллах өдөр, газар, авах үйлчилгээ, цаг захиалга өөрчлөгдөж болох тул Wonju зэрэг хол бүсээс мэдүүлэх үед харьяа байгууллага, ажиллагааны мэдэгдэл, HiKorea цаг захиалгыг шалгана.
```

---

## A1-095 broker-redflags

- 제목: 브로커 위험 신호 체크리스트
- 카테고리: warning
- 출처 라벨: KAXI safety guideline
- 출처 URL: https://kaxi.vercel.app/sources/safety-guideline
- 출처 유형: internal_policy
- 관할: KAXI
- 유효기간: 2026-01-01 ~ 없음
- 최종 확인일: 2026-07-01
- 확인자: partner_agent_001
- 현재 검수상태: APPROVED
- supersededBy: 없음
- DB chunk 수: 1

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### KO — 브로커 위험 신호 체크리스트

```
브로커 위험 신호: 1) 비용을 항목별로 설명하지 않고 총액만 말함. 2) 비자 100% 보장 약속. 3) 허위 잔고증명·허위 서류 제공 제안. 4) 불법취업 알선. 5) 계약서 없이 현금만 요구. 6) 학교 직원인 척 하며 특정 학교 강요. 7) 비용이 공식 예상보다 30% 이상 높음. 8) SNS·지인 통한 사적 연락만. 이런 신호가 있으면 KAXI 비용 계산기로 항목별 비교 후 행정사 상담을 권장합니다.
```

### EN — Broker red flag checklist

```
Broker red flags: 1) Total only, no itemization. 2) 100% visa guarantee. 3) Offers fake docs. 4) Illegal job matching. 5) Cash only, no contract. 6) Forces specific school, pretends school staff. 7) 30%+ over official estimate. 8) Private SNS contact only. → Compare items, consult lawyer.
```

### VI — Dấu hiệu môi giới rủi ro

```
Dấu hiệu môi giới rủi ro: 1) Chỉ báo tổng, không rõ từng mục. 2) Bảo đảm 100% visa. 3) Đề nghị sổ giả. 4) Giới thiệu việc bất hợp pháp. 5) Tiền mặt, không hợp đồng. 6) Ép chọn trường. 7) Cao hơn 30% thực tế. 8) Liên lạc qua SNS. Nếu thấy → so sánh phí + gặp luật sư.
```

### MN — Зуучлагчийн эрсдэлийн дохио

```
Зуучлагчийн эрсдэлийн дохио: 1) Зөвхөн нийт дүн, задлахгүй. 2) Виз 100% баталгаа. 3) Хуурамч баримт санал. 4) Хууль бус ажил. 5) Бэлэн мөнгө, гэрээгүй. 6) Сургуулийн ажилтан дүр эсвэл албадах. 7) Бодит зардал 30%+ өндөр. 8) Зөвхөн SNS-ээр холбоо. → Харьцуулж, зөвлөгөө авна.
```

