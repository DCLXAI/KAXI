# A1B. 공식 출처 Harvest 후보 검수

검수 관점:

- 공식 출처 본문이 정상 추출되었는지
- UI 메뉴/푸터/반복 잡음이 과도하지 않은지
- production RAG에 넣어도 되는 최신 공식 근거인지
- supersedes 대상 문서가 올바른지
- 승인 시 기존 답변/룰 영향이 있는지

| 항목 | doc_id | 제목 | topic | 현재 상태 | chunks | 추출 방식 | 추출 오류 | supersedes | 출처 |
|---|---|---|---|---|---:|---|---|---|---|
| A1B-001 | accredited-university__candidate__e909fc8f722e | [검토 후보] Study in Korea 교육국제화역량 인증대학 | school | PENDING | 12 | html |  | accredited-university | https://studyinkorea.go.kr/ko/plan/certifiedUniversity.do |
| A1B-002 | hikorea-activity-permit__candidate__8b5e04705f59 | [검토 후보] 하이코리아 체류자격외활동 안내 | process | PENDING | 5 | html |  | hikorea-activity-permit | https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=187&PARENT_ID=142 |
| A1B-003 | hikorea-d2-d4-d10-e7-f2-f5-requirements__candidate__1e2a2ce0cecb | [검토 후보] 하이코리아 D-2/D-4/D-10/E-7/F-2/F-5 요건 | visa | PENDING | 3 | html |  | hikorea-d2-d4-d10-e7-f2-f5-requirements | https://www.hikorea.go.kr/board/BoardNtcDetailR.pt?BBS_GB_CD=BS10&BBS_SEQ=1&NTCCTT_SEQ=1062&page=1 |
| A1B-004 | hikorea-fees-processing-authentication__candidate__58e63502a9ec | [검토 후보] 하이코리아 수수료·처리기간·원본/번역/아포스티유 안내 | cost | PENDING | 5 | html |  | hikorea-fees-processing-authentication | https://www.hikorea.go.kr/info/InfoMain.pt |
| A1B-005 | hikorea-forms-document-checklist__candidate__70f99808a28f | [검토 후보] 하이코리아 민원서식 및 제출서류 | documents | PENDING | 3 | html |  | hikorea-forms-document-checklist | https://www.hikorea.go.kr/board/BoardApplicationListR.pt |
| A1B-006 | hikorea-homepage-urgent-notices__candidate__507ead35c05f | [검토 후보] 하이코리아 첫 화면 긴급 공지·사칭사이트·전자민원 변경 | warning | PENDING | 1 | html |  | hikorea-homepage-urgent-notices | https://www.hikorea.go.kr/index.html |
| A1B-007 | hikorea-integrated-status-manual__candidate__270fe5ad9e19 | [검토 후보] 하이코리아 체류자격별 통합 안내 매뉴얼 | process | PENDING | 3 | html |  | hikorea-integrated-status-manual | https://www.hikorea.go.kr/board/BoardNtcDetailR.pt?BBS_GB_CD=BS10&BBS_SEQ=1&NTCCTT_SEQ=1062&page=1 |
| A1B-008 | hikorea-online-visit-application__candidate__70cee4e748e1 | [검토 후보] 하이코리아 전자민원·방문예약 | process | PENDING | 4 | html |  | hikorea-online-visit-application | https://www.hikorea.go.kr/cvlappl/CvlapplStep1.pt |
| A1B-009 | hikorea-policy-notice-monitor__candidate__98529da69070 | [검토 후보] 하이코리아 공지사항 정책 변경 감시 | warning | PENDING | 4 | html |  | hikorea-policy-notice-monitor | https://www.hikorea.go.kr/board/BoardNtcListR.pt |
| A1B-010 | hikorea-status-change__candidate__552d957ec23b | [검토 후보] 하이코리아 체류자격변경 안내 | process | PENDING | 5 | html |  | hikorea-status-change | https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=184&PARENT_ID=141 |
| A1B-011 | hikorea-stay-extension__candidate__8147f008db7b | [검토 후보] 하이코리아 체류기간연장 안내 | process | PENDING | 4 | html |  | hikorea-stay-extension | https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=181&PARENT_ID=140 |
| A1B-012 | immigration-act-activity-scope-restriction__candidate__377c1bf98c37 | [검토 후보] 출입국관리법 제22조 활동범위의 제한 | legal | PENDING | 5 | html |  | immigration-act-activity-scope-restriction | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0022&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-013 | immigration-act-address-change-report__candidate__11a9b360168e | [검토 후보] 출입국관리법 제36조 체류지 변경신고 | process | PENDING | 7 | html |  | immigration-act-address-change-report | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0036&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-014 | immigration-act-alien-registration__candidate__fc4fa989246c | [검토 후보] 출입국관리법 제31조 외국인등록 | process | PENDING | 6 | html |  | immigration-act-alien-registration | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0031&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-015 | immigration-act-arc-return-duty__candidate__c5bdd363ab8f | [검토 후보] 출입국관리법 제37조 외국인등록증의 반납 등 | process | PENDING | 7 | html |  | immigration-act-arc-return-duty | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0037&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-016 | immigration-act-biometric-information-duty__candidate__61979eaa2245 | [검토 후보] 출입국관리법 제38조 생체정보의 제공 등 | process | PENDING | 6 | html |  | immigration-act-biometric-information-duty | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0038&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-017 | immigration-act-departure-inspection__candidate__98c9bf0ccdaf | [검토 후보] 출입국관리법 제28조 출국심사 | process | PENDING | 6 | html |  | immigration-act-departure-inspection | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0028&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-018 | immigration-act-departure-recommendation-order__candidate__e5dfb4ec5cf6 | [검토 후보] 출입국관리법 제67조·제68조 출국권고·출국명령 | warning | PENDING | 7 | html |  | immigration-act-departure-recommendation-order | https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921 |
| A1B-019 | immigration-act-departure-suspension__candidate__54514553018e | [검토 후보] 출입국관리법 제29조 외국인 출국의 정지 | warning | PENDING | 5 | html |  | immigration-act-departure-suspension | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0029&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-020 | immigration-act-deportation-detention__candidate__e519bf52b608 | [검토 후보] 출입국관리법 제63조 강제퇴거명령을 받은 사람의 보호 | warning | PENDING | 7 | html |  | immigration-act-deportation-detention | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0063&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-021 | immigration-act-deportation-grounds__candidate__460fedb60049 | [검토 후보] 출입국관리법 제46조 강제퇴거의 대상자 | warning | PENDING | 7 | html |  | immigration-act-deportation-grounds | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0046&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-022 | immigration-act-deportation-objection__candidate__8bec0621fb38 | [검토 후보] 출입국관리법 제60조 강제퇴거명령 이의신청 | warning | PENDING | 6 | html |  | immigration-act-deportation-objection | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0060&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-023 | immigration-act-detention-order__candidate__c4993f3e709e | [검토 후보] 출입국관리법 제51조 보호명령서·긴급보호 | warning | PENDING | 6 | html |  | immigration-act-detention-order | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0051&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-024 | immigration-act-detention-temporary-release__candidate__a362d5e76848 | [검토 후보] 출입국관리법 제65조 보호의 일시해제 | warning | PENDING | 6 | html |  | immigration-act-detention-temporary-release | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0065&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-025 | immigration-act-emergency-extension-special__candidate__c6c1dc6a8051 | [검토 후보] 출입국관리법 제25조의5 국가비상사태 등 체류기간 연장 특칙 | process | PENDING | 123 | html |  | immigration-act-emergency-extension-special | https://www.law.go.kr/LSW/lsRvsDocListP.do?chrClsCd=010202&lsId=001707&lsRvsGubun=all |
| A1B-026 | immigration-act-employer-reporting-duty__candidate__04f917b02012 | [검토 후보] 출입국관리법 제19조 외국인을 고용한 자 등의 신고의무 | process | PENDING | 6 | html |  | immigration-act-employer-reporting-duty | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0019&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-027 | immigration-act-employment-restriction__candidate__81483070ee8c | [검토 후보] 출입국관리법 제18조 외국인 고용의 제한 | warning | PENDING | 5 | html |  | immigration-act-employment-restriction | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0018&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-028 | immigration-act-entry-ban__candidate__4f0a6e128145 | [검토 후보] 출입국관리법 제11조 입국의 금지 등 | warning | PENDING | 6 | html |  | immigration-act-entry-ban | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0011&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-029 | immigration-act-entry-inspection__candidate__0ec3a09c0f0f | [검토 후보] 출입국관리법 제12조 입국심사 | process | PENDING | 6 | html |  | immigration-act-entry-inspection | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0012&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-030 | immigration-act-false-application-documents__candidate__3b2a96aaf155 | [검토 후보] 출입국관리법 제26조 허위서류 제출 등의 금지 | warning | PENDING | 5 | html |  | immigration-act-false-application-documents | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0026&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-031 | immigration-act-general-stay-status__candidate__71219c28ce2a | [검토 후보] 출입국관리법 제10조의2 일반체류자격 | legal | PENDING | 2 | html |  | immigration-act-general-stay-status | https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000817596 |
| A1B-032 | immigration-act-marriage-immigrant-extension-special__candidate__8e7c1ccddba2 | [검토 후보] 출입국관리법 제25조의2 결혼이민자 등에 대한 특칙 | process | PENDING | 2 | html |  | immigration-act-marriage-immigrant-extension-special | https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000822759 |
| A1B-033 | immigration-act-outside-status-activity__candidate__634884f1d19e | [검토 후보] 출입국관리법 제20조 체류자격 외 활동 | process | PENDING | 5 | html |  | immigration-act-outside-status-activity | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0020&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-034 | immigration-act-permanent-residence-status__candidate__bf8f48b6e238 | [검토 후보] 출입국관리법 제10조의3 영주자격 | legal | PENDING | 2 | html |  | immigration-act-permanent-residence-status | https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000817607 |
| A1B-035 | immigration-act-permission-matrix__candidate__6d7b039362d7 | [검토 후보] 출입국관리법 변경·연장·자격외활동 허가 구조 | legal | PENDING | 7 | html |  | immigration-act-permission-matrix | https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921 |
| A1B-036 | immigration-act-permit-cancellation-change__candidate__0d0cd98a1301 | [검토 후보] 출입국관리법 제89조 각종 허가 등의 취소·변경 | warning | PENDING | 6 | html |  | immigration-act-permit-cancellation-change | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0089&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-037 | immigration-act-reentry-permit__candidate__75136e0a0a33 | [검토 후보] 출입국관리법 제30조 재입국허가 | process | PENDING | 6 | html |  | immigration-act-reentry-permit | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0030&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-038 | immigration-act-registration-change-report__candidate__c7dc22a53a72 | [검토 후보] 출입국관리법 제35조 외국인등록사항 변경신고 | process | PENDING | 5 | html |  | immigration-act-registration-change-report | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0035&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-039 | immigration-act-status-change__candidate__dcac344e8dab | [검토 후보] 출입국관리법 제24조 체류자격 변경허가 | process | PENDING | 5 | html |  | immigration-act-status-change | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0024&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-040 | immigration-act-status-grant__candidate__f3c957a288a6 | [검토 후보] 출입국관리법 제23조 체류자격 부여 | legal | PENDING | 5 | html |  | immigration-act-status-grant | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0023&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-041 | immigration-act-stay-extension__candidate__292771283d50 | [검토 후보] 출입국관리법 제25조 체류기간 연장허가 | process | PENDING | 5 | html |  | immigration-act-stay-extension | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0025&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-042 | immigration-act-stay-status-scope__candidate__5d59ed335c39 | [검토 후보] 출입국관리법 체류자격·활동범위 | legal | PENDING | 7 | html |  | immigration-act-stay-status-scope | https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921 |
| A1B-043 | immigration-act-student-management-reporting__candidate__fa7b90a1f13b | [검토 후보] 출입국관리법 제19조의4 외국인유학생의 관리 등 | process | PENDING | 7 | html |  | immigration-act-student-management-reporting | https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921 |
| A1B-044 | immigration-act-visa-issuance-certificate__candidate__6fabe79be31d | [검토 후보] 출입국관리법 제8조·제9조 사증·사증발급인정서 | process | PENDING | 5 | html |  | immigration-act-visa-issuance-certificate | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0009&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-045 | immigration-act-visa-passport-requirement__candidate__2b37f5ab43ab | [검토 후보] 출입국관리법 제7조 외국인의 입국 | legal | PENDING | 6 | html |  | immigration-act-visa-passport-requirement | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0007&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-046 | immigration-act-workplace-change-addition__candidate__aec35dcf7a93 | [검토 후보] 출입국관리법 제21조 근무처 변경·추가 | process | PENDING | 6 | html |  | immigration-act-workplace-change-addition | https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0021&lsiSeq=272921&urlMode=lsScJoRltInfoR |
| A1B-047 | immigration-decree-current-text__candidate__5e2912adb490 | [검토 후보] 출입국관리법 시행령 최신 본문 | legal | PENDING | 7 | html |  | immigration-decree-current-text | https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=271319 |
| A1B-048 | immigration-decree-long-term-status-table__candidate__eb5ea5ef1a3d | [검토 후보] 출입국관리법 시행령 별표 1의2 장기체류자격 | legal | PENDING | 1 | html |  | immigration-decree-long-term-status-table | https://www.law.go.kr/LSW/lsLawLinkInfo.do?lsJoLnkSeq=1000870036 |
| A1B-049 | immigration-decree-permanent-residence-table__candidate__c56921189f95 | [검토 후보] 출입국관리법 시행령 별표 1의3 영주자격 | legal | PENDING | 1 | html |  | immigration-decree-permanent-residence-table | https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsiSeq=271319&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95+%EC%8B%9C%ED%96%89%EB%A0%B9&bylNo=0001&bylBrNo=03&bylCls=BE&bylEfYd=20250601&bylEfYdYn=Y |
| A1B-050 | immigration-decree-short-term-status-table__candidate__9e224f703e52 | [검토 후보] 출입국관리법 시행령 별표 1 단기체류자격 | legal | PENDING | 1 | html |  | immigration-decree-short-term-status-table | https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsiSeq=271319&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95+%EC%8B%9C%ED%96%89%EB%A0%B9&bylNo=0001&bylBrNo=00&bylCls=BE&bylEfYd=20250601&bylEfYdYn=Y |
| A1B-051 | immigration-law-interpretation-hierarchy__candidate__48e3364c2f98 | [검토 후보] 출입국관리법 제10조·제17조 법령 해석 순서 | legal | PENDING | 7 | html |  | immigration-law-interpretation-hierarchy | https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921 |
| A1B-052 | immigration-law-recent-promulgations__candidate__a065d94b0378 | [검토 후보] 국가법령정보센터 출입국관리법 최근공포·시행일자 | legal | PENDING | 4 | html |  | immigration-law-recent-promulgations | https://www.law.go.kr/LSW/nwRvsLsPop.do?chrIdx=10&cptOfi=&lsKndCd=&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95&p_epubdt=&p_epubno=&p_spubdt=&p_spubno=&searchType=lsNm&sortIdx=0 |
| A1B-053 | immigration-law-violation-risk__candidate__9a2027323281 | [검토 후보] 출입국관리법 위반 제재 | warning | PENDING | 7 | html |  | immigration-law-violation-risk | https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921 |
| A1B-054 | immigration-rule-documents-attachments__candidate__410678ec5390 | [검토 후보] 출입국관리법 시행규칙 제76조·별표 5·별표 5의2 | documents | PENDING | 7 | html |  | immigration-rule-documents-attachments | https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283059 |
| A1B-055 | immigration-rule-fees__candidate__f47b81203fa6 | [검토 후보] 출입국관리법 시행규칙 제71조·제72조 수수료 | cost | PENDING | 6 | html |  | immigration-rule-fees | https://www.law.go.kr/LSW//lumLsLinkPop.do?chrClsCd=010202&lspttninfSeq=82731 |
| A1B-056 | immigration-rule-stay-permission-review-criteria__candidate__bd619bfb5181 | [검토 후보] 출입국관리법 시행규칙 제31조의2 체류자격 부여 등 심사기준 | legal | PENDING | 7 | html |  | immigration-rule-stay-permission-review-criteria | https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283059 |
| A1B-057 | moj-e-arrival-card__candidate__bed737953ab0 | [검토 후보] 법무부 전자입국신고서(e-Arrival card) | process | PENDING | 10 | html |  | moj-e-arrival-card | https://www.immigration.go.kr/immigration/3509/subview.do |
| A1B-058 | moj-e-arrival-card-notice__candidate__fb216c3681f5 | [검토 후보] 전자입국신고서 제도 시행 알림 | process | PENDING | 10 | html |  | moj-e-arrival-card-notice | https://www.immigration.go.kr/bbs/immigration/224/592036/artclView.do?layout=unknown |
| A1B-059 | moj-e7-wage-requirement-2026__candidate__6a302e277d50 | [검토 후보] 2026년 특정활동(E-7) 체류자격 임금요건 기준 | visa | PENDING | 13 | html |  | moj-e7-wage-requirement-2026 | https://www.immigration.go.kr/bbs/moj/184/601893/artclView.do?layout=unknown |
| A1B-060 | moj-f4-employment-restriction-preannouncement__candidate__3419a3323b68 | [검토 후보] 재외동포(F-4) 취업활동 제한범위 고시 행정예고 | warning | PENDING | 13 | html |  | moj-f4-employment-restriction-preannouncement | https://www.immigration.go.kr/bbs/moj/184/602340/artclView.do?layout=unknown |
| A1B-061 | moj-f6-marriage-visa-criteria__candidate__fe05ff0141fc | [검토 후보] 결혼동거 목적 사증 발급 요건·심사면제 기준 고시 | visa | PENDING | 13 | html |  | moj-f6-marriage-visa-criteria | https://www.immigration.go.kr/bbs/moj/184/601864/artclView.do?layout=unknown |
| A1B-062 | moj-immigration-policy-news__candidate__6790396f08d0 | [검토 후보] 법무부 출입국·외국인정책본부 주요소식 | process | PENDING | 61 | html |  | moj-immigration-policy-news | https://www.immigration.go.kr/immigration/3341/subview.do |
| A1B-063 | moj-k-eta-entry-authorization__candidate__dbbd7ed4b00d | [검토 후보] 법무부 전자여행허가제(K-ETA) | process | PENDING | 11 | html |  | moj-k-eta-entry-authorization | https://www.immigration.go.kr/immigration/3339/subview.do |
| A1B-064 | moj-k-eta-scam-warning__candidate__eb97caba54e1 | [검토 후보] K-ETA 유사 웹사이트 주의 | warning | PENDING | 2 | html |  | moj-k-eta-scam-warning | https://www.immigration.go.kr/bbs/immigration/220/597906/artclView.do |
| A1B-065 | moj-mobile-immigration-office__candidate__83b95d77ed5a | [검토 후보] 법무부 이동출입국사무소 운영 안내 | process | PENDING | 9 | html |  | moj-mobile-immigration-office | https://www.immigration.go.kr/immigration/2344/subview.do |
| A1B-066 | moj-notice-board-visa-policy__candidate__1bf1cec71776 | [검토 후보] 법무부 공지사항 체류·사증 정책 변경 | warning | PENDING | 15 | html |  | moj-notice-board-visa-policy | https://www.immigration.go.kr/moj/223/subview.do |
| A1B-067 | moj-office-jurisdiction-busan-gyeongnam__candidate__a16597b23768 | [검토 후보] 법무부 소속기관 관할구역 부산·경남 | process | PENDING | 11 | html |  | moj-office-jurisdiction-busan-gyeongnam | https://www.immigration.go.kr/immigration/2058/subview.do |
| A1B-068 | moj-office-jurisdiction-daegu-gyeongbuk-gangwon__candidate__befc6538daac | [검토 후보] 법무부 소속기관 관할구역 대구·경북·강원 | process | PENDING | 11 | html |  | moj-office-jurisdiction-daegu-gyeongbuk-gangwon | https://www.immigration.go.kr/immigration/2060/subview.do |
| A1B-069 | moj-office-jurisdiction-daejeon-chungcheong__candidate__6836a1e734a1 | [검토 후보] 법무부 소속기관 관할구역 대전·충청 | process | PENDING | 11 | html |  | moj-office-jurisdiction-daejeon-chungcheong | https://www.immigration.go.kr/immigration/2061/subview.do |
| A1B-070 | moj-office-jurisdiction-gwangju-jeolla-jeju__candidate__9febbb301669 | [검토 후보] 법무부 소속기관 관할구역 광주·전라·제주 | process | PENDING | 11 | html |  | moj-office-jurisdiction-gwangju-jeolla-jeju | https://www.immigration.go.kr/immigration/2059/subview.do |
| A1B-071 | moj-office-jurisdiction-seoul-incheon-gyeonggi__candidate__26aac0a989b6 | [검토 후보] 법무부 소속기관 관할구역 서울·인천·경기 | process | PENDING | 13 | html |  | moj-office-jurisdiction-seoul-incheon-gyeonggi | https://www.immigration.go.kr/immigration/2057/subview.do |
| A1B-072 | moj-online-stay-visa-center__candidate__46500b7fd97c | [검토 후보] 법무부 온라인체류·사증민원센터 | process | PENDING | 14 | html |  | moj-online-stay-visa-center | https://www.immigration.go.kr/moj/198/subview.do |
| A1B-073 | moj-seasonal-worker-program__candidate__d8e9827fc80e | [검토 후보] 법무부 외국인 계절근로자 프로그램 | visa | PENDING | 14 | html |  | moj-seasonal-worker-program | https://www.immigration.go.kr/moj/194/subview.do |
| A1B-074 | moj-skilled-worker-points-visa__candidate__3043680188d1 | [검토 후보] 법무부 외국인 숙련기능인력 점수제 비자 | visa | PENDING | 14 | html |  | moj-skilled-worker-points-visa | https://www.immigration.go.kr/moj/187/subview.do |
| A1B-075 | moj-social-integration-program-kiip__candidate__0971e19045aa | [검토 후보] 법무부 사회통합프로그램 | visa | PENDING | 13 | html |  | moj-social-integration-program-kiip | https://www.immigration.go.kr/moj/369/subview.do |
| A1B-076 | moj-stay-management-policy__candidate__36ade67cce9c | [검토 후보] 법무부 외국인 체류관리 정책 | process | PENDING | 22 | html |  | moj-stay-management-policy | https://www.immigration.go.kr/immigration/1515/subview.do |
| A1B-077 | moj-tax-health-arrears-extension-restriction__candidate__71ca200088a3 | [검토 후보] 외국인 비자연장 전 세금·건강보험료 체납 확인제도 | warning | PENDING | 10 | html |  | moj-tax-health-arrears-extension-restriction | https://www.immigration.go.kr/immigration/1522/subview.do |
| A1B-078 | visa-portal-visa-types__candidate__28fe675280d0 | [검토 후보] Korea Visa Portal 비자 유형 목록 | visa | PENDING | 7 | html |  | visa-portal-visa-types | https://www.visa.go.kr/openPage.do?LANG_TYPE=EN&MENU_ID=10102 |

---

## A1B-001 accredited-university__candidate__e909fc8f722e

- 제목: [검토 후보] Study in Korea 교육국제화역량 인증대학
- sourceUrl: https://studyinkorea.go.kr/ko/plan/certifiedUniversity.do
- sourceType: official_government
- topic: school
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: accredited-university
- supersededBy: 없음
- chunkCount: 12
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 72067
- extractedChars: 9400
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# Study in Korea 교육국제화역량 인증대학
source_url: https://studyinkorea.go.kr/ko/plan/certifiedUniversity.do
source_type: official_government
topic: school
legal_priority: 4
monitor_cadence: daily
change_signals: last_modified, certified_university_count, degree_program_list, language_program_list, excellent_accredited_list
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 6c906aba07284ba98b67c054ed89f4ab4c333f840cb5559e16be3bf24d6ba6b4
byte_length: 72067
extracted_chars: 9400

우수 인증 대학 | Plan your studies | 한국유학종합시스템(스터디인코리아) | Run by Korean Government

콘텐츠 바로가기

주메뉴 바로가기

StudyinKorea

Language

한국어 (한국어)

영어 (English)

네팔어 (नेपाली)

독일어 (Deutsch)

러시아어 (Русский)

말레이어 (Bahasa Melayu)

몽골어 (Монгол хэл)

미얀마어 (Мьянма тілі)

베트남어 (Tiếng Việt)

벵골어 (বাংলা)

스리랑카어 (සිංහල)

---

## chunk 1
스페인어 (Español)

아랍어 (العربية)

아일랜드어 (Gaeilge)

암하라어 (አማርኛ)

네덜란드어 (Nederlands)

우르두어 (اردو)

우즈베크어 (Oʻzbekcha)

인도네시아어 (Bahasa Indonesia)

일본어 (日本語)

중국어(간체) (简体中文)

카자흐어 (Қазақша)

태국어 (ภาษาไทย)

터키어 (Türkçe)

페르시아어 (فارسی)

포르투갈어 (Português)

프랑스어 (Français)

필리핀어 (Filipino)

헝가리어 (Magyar)

힌디어 (हिन्दी)

아이콘 - icon-search

검색

아이콘 - icon-login

로그인

아이콘 - icon-join

회원가입

사이트맵

아이콘 - icon-menu-rect

사이트맵

-->

아이콘 - icon-menu

전체메뉴

아이콘 - icon-close

Why Korea

접기/펼치기

한국의 매력

수준 높은 교육과정

다양한 장학금 지원

만족도 높은 유학 생활

실무 지향 학습

세계적인 기술과 미래

풍부한 한국 문화

통계로 보는 한국

-->

-->

-->

-->

-->

-->

-->

Plan your studies

접기/펼치기

한국의 교육제도

학교 유형

우수 인증 대학

언어 능력 기준 및 TOPIK

유학경비

장학금

학생비자 및 체류자격

Flowchart

차트 아이콘

온라인 원서 접수

문서 아이콘

가이드북

책 아이콘

-->

-->

-->

-->

-->

-->

-->

Life in Korea

---

## chunk 2
접기/펼치기

한국 입국 수속

생활 및 주거 정보

한국의 지역소개

생활비 및 경비

거주 자격 및 체류 기간

생활 법률 정보

-->

-->

-->

-->

-->

-->

-->

Work in Korea

접기/펼치기

한국에서의 취업

외국인 유학생 취업제도

자원봉사 및 산업 경험

채용 정보

-->

-->

-->

-->

-->

-->

-->

Education Fair

온라인

오프라인

Community

접기/펼치기

유학 스토리

스터디인코리아서포터즈

재한 유학생회

문의 & FAQ

-->

-->

-->

-->

-->

-->

-->

Notice

접기/펼치기

공지 & 뉴스

장학금 공지

유용한 정보

자료실

닫기 아이콘

검색어를 입력해 주세요

대학

학과

장학금

콘텐츠

Select category

대학 ( )

학과 ( )

장학금 ( )

콘텐츠 ( )

Search all Schools for

Search

최근 검색어

인기 검색어

최근 1주일 기준

icon-home

Plan your studies

우수 인증 대학

인증 대학

국제화 역량이 높은 한국의 인증 대학을 확인해 보세요.

교육국제화 역량 인증제

교육 국제화 역량 인증제 International Education Quality Assurance System(IEQAS)란?

---

## chunk 3
우수 외국인 유학생 유치를 위해 국제화 역량이 높은 대학을 인증 함으로써 국제화 역량을 제고하기 위하여 매년 법무부와 교육부에서 조사를 실시하고 있습니다. 한국으로 유학을 준비하고 계신다면 국제화 역량 인증 대학을 확인하시고 지원해 주세요.

인증 대학 특성

최종 수정일 :

2026-03-03

기본요건과 평가 영역(전략 및 선발, 유학생 지원, 유학생 관리 및 성과)을 모두 충족해야 인증 자격이 주어지며 인증 대학에는 외국인 비자 발급 시 심사 기준을 완화하여 적용하고 외국인 유학생의 주중 시간제 취업 활동 허가 시간을 추가하는 등의 다양한 혜택이 제공됩니다.

인증 대학 명단

학위과정

대학 수 184교

일반대학(135)

---

## chunk 4
가천대학교, 가톨릭대학교(본교), 강남대학교, 강서대학교, 강원대학교(강릉캠퍼스), 강원대학교(삼척캠퍼스), 강원대학교(원주캠퍼스), 강원대학교(춘천캠퍼스), 건국대학교, 건국대학교(글로컬), 건양대학교(본교), 경기대학교(본교), 경남대학교, 경동대학교(본교), 경북대학교, 경상국립대학교, 경성대학교, 경운대학교, 경일대학교, 경희대학교, 계명대학교, 고려대학교, 고려대학교(세종), 고신대학교, 광운대학교, 광주과학기술원, 광주대학교, 광주여자대학교, 국립경국대학교, 국립공주대학교, 국립군산대학교, 국립금오공과대학교, 국립목포대학교, 국립부경대학교, 국립순천대학교, 국립창원대학교, 국립한국교통대학교, 국립한국해양대학교, 국립한밭대학교, 국민대학교, 김천대학교, 나사렛대학교, 남서울대학교, 단국대학교(본교), 대구가톨릭대학교, 대구대학교, 대구한의대학교, 대신대학교, 대전대학교, 대진대학교, 덕성여자대학교, 동국대학교, 동국대학교(WISE), 동덕여자대학교, 동명대학교, 동서대학교, 동신대학교, 동아대학교, 동의대학교, 명지대학교(서울캠퍼스), 목원대학교, 배재대학교, 백석대학교, 부산대학교, 부산외국어대학교, 삼육대학교, 상명대학교(본교), 서강대학교, 서경대학교, 서울과학기술대학교, 서울기독대학교, 서울대학교, 서울시립대학교, 서울신학대학교, 서울여자대학교, 선문대학교, 성결대학교, 성공회대학교, 성균관대학교, 성신여자대학교, 세명대학교, 세종대학교, 숙명여자대학교, 순천향대학교, 숭실대학교, 신라대학교, 신한대학교(본교), 아주대학교, 안양대학교(본교), 연세대학교, 연세대학교(미래), 영남대학교, 영산

---

## chunk 5
대학교(본교), 우석대학교, 우송대학교, 울산과학기술원, 울산대학교(본교), 원광대학교, 위덕대학교, 을지대학교(본교), 이화여자대학교, 인제대학교(본교), 인천대학교, 인하대학교, 전남대학교, 전북대학교, 전주대학교, 제주대학교, 조선대학교, 중부대학교, 중앙대학교(본교), 중원대학교, 차의과학대학교, 창신대학교, 청주대학교, 충남대학교, 충북대학교, 평택대학교, 포항공과대학교, 한국과학기술원, 한국교원대학교, 한국기술교육대학교, 한국성서대학교, 한국외국어대학교, 한국항공대학교, 한남대학교, 한동대학교, 한림대학교, 한서대학교, 한성대학교(본교), 한세대학교, 한양대학교, 한양대학교(ERICA), 호서대학교, 홍익대학교(본교)

---

## chunk 6
전문대학(33)

경남도립거창대학, 경남정보대학교, 경복대학교, 경인여자대학교, 계명문화대학교, 국립창원대학교 남해캠퍼스, 군장대학교, 대림대학교, 동원과학기술대학교, 동원대학교, 동의과학대학교, 명지전문대학, 목포과학대학교, 부산과학기술대학교(본교), 부천대학교, 서울예술대학교, 서정대학교, 안산대학교, 영남이공대학교, 영진전문대학교, 오산대학교, 용인예술과학대학교, 울산과학대학교, 원광보건대학교, 인덕대학교, 인하공업전문대학, 장안대학교, 전북과학대학교, 전주비전대학교, 제주관광대학교, 제주한라대학교, 한국영상대학교, 한양여자대학교

대학원 대학(16)

개신대학원대학교, 과학기술연합대학원대학교, 국립암센터국제암대학원대학교, 국제언어대학원대학교, 동방문화대학원대학교, 서울과학종합대학원대학교, 서울미디어대학원대학교, 서울외국어대학원대학교, 선학유피대학원대학교, 수도국제대학원대학교, 예명대학원대학교, 온석대학원대학교(본교), 한국개발연구원국제정책대학원대학교, 한국전력국제원자력대학원대학교, 한국학중앙연구원 한국학대학원, 횃불트리니티신학대학원대학교

어학연수 과정

대학 수 126교

일반대학(104)

---

## chunk 7
가천대학교, 가톨릭대학교(본교), 강원대학교(강릉캠퍼스), 강원대학교(삼척캠퍼스), 강원대학교(원주캠퍼스), 강원대학교(춘천캠퍼스), 건국대학교, 건양대학교(본교), 경기대학교(본교), 경남대학교, 경동대학교(본교), 경북대학교, 경상국립대학교, 경성대학교, 경운대학교, 경일대학교, 경희대학교, 계명대학교, 고려대학교, 고려대학교(세종), 광운대학교, 광주대학교, 국립경국대학교, 국립공주대학교, 국립군산대학교, 국립부경대학교, 국립순천대학교, 국립창원대학교, 국립한국교통대학교, 국립한밭대학교, 국민대학교, 나사렛대학교, 남서울대학교, 단국대학교(본교), 대구가톨릭대학교, 대구대학교, 대신대학교, 대전대학교, 덕성여자대학교, 동국대학교, 동국대학교(WISE), 동명대학교, 동서대학교, 동신대학교, 동아대학교, 명지대학교(서울캠퍼스), 목원대학교, 배재대학교, 백석대학교, 부산대학교, 부산외국어대학교, 삼육대학교, 서강대학교, 서경대학교, 서울과학기술대학교, 서울대학교, 서울시립대학교, 서울신학대학교, 서울여자대학교, 선문대학교, 성결대학교, 성균관대학교, 성신여자대학교, 세명대학교, 세종대학교, 숙명여자대학교, 순천향대학교, 숭실대학교, 신라대학교, 신한대학교(본교), 아주대학교, 연세대학교, 연세대학교(미래), 영남대학교, 영산대학교(본교), 우송대학교, 울산대학교(본교), 원광대학교, 위덕대학교, 이화여자대학교, 인제대학교(본교), 인천대학교, 인하대학교, 전남대학교, 전북대학교, 제주대학교, 조선대학교, 중부대학교, 중앙대학교(본교), 창신대학교, 청주대학교, 충남대학교, 충북대학교, 평택대학교, 한국기술
```

---

## A1B-002 hikorea-activity-permit__candidate__8b5e04705f59

- 제목: [검토 후보] 하이코리아 체류자격외활동 안내
- sourceUrl: https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=187&PARENT_ID=142
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: hikorea-activity-permit
- supersededBy: 없음
- chunkCount: 5
- extractionMethod: html
- contentType: text/html; charset=UTF-8
- byteLength: 43407
- extractedChars: 4977
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 하이코리아 체류자격외활동 안내
source_url: https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=187&PARENT_ID=142
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: content_hash
extraction_method: html
content_type: text/html; charset=UTF-8
byte_sha256: 8910db2bca5625816680dd28943ebf830b306c32c57147f0c70ce57788aafb53
byte_length: 43407
extracted_chars: 4977

출입국/체류안내

**********************************************************************

* DATE AUTHOR DESCRIPTION

**********************************************************************

* 2019-05-09 전예원 최초작성

**********************************************************************

-->

출입국/체류 상세 < 하이코리아

본문 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

..

로그인

회원가입

이용안내

고객센터

한국어

ENGLISH

中文

통합검색

검색

---

## chunk 1
통합검색 닫기

Hi Korea

민원신청

전자민원

방문예약

출입국민원 대행기관 이용

출입국우대카드(기관담당자전용)

온라인 상륙허가

정보조회

민원신청결과

전자민원

방문예약

사증발급인정서

난민 이의신청

기타 조회 서비스 -->

기타 조회 서비스

관할 출입국.외국인관서 조회

등록증 · 거소증 유효확인

등록증·거소증 분실(철회) 신고

외국인 취업 및 고용가능여부 조회

출입국민원 대행기관 조회

법무부지정 의료기관 조회

체류만료일조회

육아도우미 교육수료자 조회

통합고용변동 민원조회

전자민원 허가서 발급 확인

출국금지 여부 조회
(한국인 전용)

국적심사 진행상황 조회

자동출입국심사

SES 안내

Smart Entry Service란?

이용대상

SES Auto-gate 이용방법

SES 등록센터 및 이용가능 공항

자동출입국심사 상호이용

한·미국(SeS-GE)

한-홍콩(SES-e-Channel)

한-마카오(SES-APC)

한-대만(SES-e-Gate)

한-독일(SES-EasyPASS)

정보광장

비자내비게이터(맞춤형 
체류가이드)

동포 맞춤형 길라잡이

체류자격별 안내메뉴얼

한국생활 길잡이

출입국/체류안내

국적/귀화안내

사회통합

기술창업이민

투자이민

투자지원

고용지원

출입국관련 법령지침정보

빅데이터 분석·시각화

뉴스·공지

공지사항

보도자료

자료실

민원서식

뉴스레터

하이코리아에서는

편리한 민원신청을 위해
온라인으로 신청하실 수 있는 서비스를 제공하고 있습니다.

출입국/체류안내

초청/사증(VISA) 
 
 
 사증

---

## chunk 2
사증발급인정서

사증발급인정서 신청결과조회

국제 결혼안내프로그램

출입국심사 
 
 
 국민출입국심사

외국인출입국심사

남북한왕래

승무원출입국심사/상륙허가

선박 등의 장 및 운수업자의 책임

출입국우대카드

외국인의 체류 
 
 
 체류일반

외국인등록

체류기간
연장

체류자격변경

체류자격외활동

근무처변경/추가

체류자격부여

재입국허가(복수)

각종신고의무

국적/귀화 
 
 
 국적민원 접수장소

귀화(일반,간이,특별)

국적회복

국적판정

국적취득

국적 선택의무/선택절차/이탈절차/보유상실

국적선택명령/국적상실결정/외국국적포기의무

국적법 질의응답

종합평가 및 면접심사

국적증서수여식

기초 법 제도 및 질서 
 
 
 법과 질서

재외동포 
 
 
 거소신고의의/절차

재외동포 활동범위

지원부서 안내

동포관련 사이트

동포 맞춤형 길라잡이

난민인정 
 
 
 개요

난민신청 및 심사절차

체류/취업

처우

출입국사범/보호 
 
 
 출입국사범 의미/조사

출입국사범 심사결정

출입국사범 보호

증명발급 
 
 
 증명발급

알기쉬운 출입국 안내 
 
 
 관광, 통과, 각종행사, 회의참가 등

친척 방문, 가족 동거, 거주, 동반, 재외동포 등

사업의 목적

학업의 목적

취업의 목적

기타 목적

계절근로자 제도 
 
 
 개요

대상자

허용업종 및 허용인원

계절근로 사증 종류

통계 자료

재외공관 등 제공자료

개인정보 수집·이용안내

홈 출입국/체류안내

체류자격외활동

체류자격외활동허가 절차/방법

체류자격별 안내메뉴얼

체류자격외활동허가 절차/방법

---

## chunk 3
체류자격외활동허가 절차도

체류자격외활동이란?

체류외국인이 현 체류자격을 유지하면서, 그 체류자격에 관련되는 활동외의 다른 활동을 병행하여 하고자 하는 경우를 말합니다.

대한민국에 체류하는 외국인이 현재 소지하고 있는 체류자격과 다른 체류자격에 해당하는 활동을 병행하여 하고자 하는 경우 반드시 사전에 체류자격외활동허가를 받아야 합니다.

병행하고자 하는 활동이 전일 근무 등 주된 활동인 경우에는 체류자격외활동을 허가하지 않으므로, 출국 후 새로운 사증(VISA)을 받고 입국하거나 체류자격변경허가를 받아야 합니다.

체류자격외활동허가의 기본원칙

90일 이하 단기사증소지자는 체류자격외활동을 할 수 없습니다.

원 근무처보다 근무시간이 길거나 보수가 많을 경우에는 체류자격외활동을 제한합니다.

여러 직장을 갖는 등 체류상태가 건실하지 못하고 국익에 위배된다고 인정되는 때에는 체류자격외 활동을 허가하지 않습니다.

외국인이 대한민국의 고유문화 또는 고유예술에 대하여 전문가의 지도를 받거나 대학부설 어학원에서 한국어를 연수하고 자 하는 때에는 체류기간 범위내에서는 별도 체류자격외활동허가를 받지 않아도 됩니다.

체류자격외활동허가 신청기간

반드시 다른 체류자격에 해당하는 활동을 병행하기 이전에 관할 출입국관리사무소에서 체류자격외활동허가를 받아야 합니다.

체류자격외활동허가 신청방법

본인 또는 대리인이 주소지 관할 출입국관리사무소에 필요한 제출서류(상단 체류자격 클릭하여 참조)를 준비하셔서 신청하시면 됩니다.

체류자격외활동허가를 신청하여야 하는 경우(예시)

---

## chunk 4
유학자격(D-2) 소지 유학생이 학업을 계속하면서 시간제 아르바이트(S-3)를 하고자 하는 경우

종교의 체류자격(D-6)으로 활동하고 있는 선교사가 종교활동을 계속하면서 대학에서 강의(E-1)를 하고자 하는 경우

< 작성일 : 2013.01.01 >

인쇄하기

TOP

개인정보처리방침

웹접근성정책

원격접속

관련사이트

지역/지방정부

1345 
 (국번없이) 
 (FAX) 02-2650-4550 
 
 (FAX민원) 1577-1346 
 
 
 
 (해외문의) +82-2-1345, +82-2-6908-1345~6 
 
 트위터 -->
 페이스북

다운로드

아크로벳 다운로드 
 엑셀 다운로드 
 한글 다운로드 
 워드 다운로드

주소 : 경기도 과천시 관문로 47 정부과천청사 1동 ( 외국인종합안내센터 : 국번없이 1345 )

Copyright ⓒ 2020 HI KOREA. All rights Reserved.
```

---

## A1B-003 hikorea-d2-d4-d10-e7-f2-f5-requirements__candidate__1e2a2ce0cecb

- 제목: [검토 후보] 하이코리아 D-2/D-4/D-10/E-7/F-2/F-5 요건
- sourceUrl: https://www.hikorea.go.kr/board/BoardNtcDetailR.pt?BBS_GB_CD=BS10&BBS_SEQ=1&NTCCTT_SEQ=1062&page=1
- sourceType: official_government
- topic: visa
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: hikorea-d2-d4-d10-e7-f2-f5-requirements
- supersededBy: 없음
- chunkCount: 3
- extractionMethod: html
- contentType: text/html; charset=UTF-8
- byteLength: 40723
- extractedChars: 3247
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 하이코리아 D-2/D-4/D-10/E-7/F-2/F-5 요건
source_url: https://www.hikorea.go.kr/board/BoardNtcDetailR.pt?BBS_GB_CD=BS10&BBS_SEQ=1&NTCCTT_SEQ=1062&page=1
source_type: official_government
topic: visa
legal_priority: 4
monitor_cadence: daily
change_signals: content_hash
extraction_method: html
content_type: text/html; charset=UTF-8
byte_sha256: f05b1612e10f68df4fdb2b5906c0f1ed0c9d5e4f2230e68b6ebf3a5e384e2d14
byte_length: 40723
extracted_chars: 3247

멀티게시판 공지사항 상세조회 < 하이코리아

본문 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

..

로그인

회원가입

이용안내

고객센터

한국어

ENGLISH

中文

통합검색

검색

통합검색 닫기

Hi Korea

민원신청

전자민원

방문예약

출입국민원 대행기관 이용

출입국우대카드(기관담당자전용)

온라인 상륙허가

정보조회

민원신청결과

전자민원

방문예약

사증발급인정서

난민 이의신청

기타 조회 서비스 -->

기타 조회 서비스

관할 출입국.외국인관서 조회

등록증 · 거소증 유효확인

등록증·거소증 분실(철회) 신고

외국인 취업 및 고용가능여부 조회

출입국민원 대행기관 조회

---

## chunk 1
법무부지정 의료기관 조회

체류만료일조회

육아도우미 교육수료자 조회

통합고용변동 민원조회

전자민원 허가서 발급 확인

출국금지 여부 조회
(한국인 전용)

국적심사 진행상황 조회

자동출입국심사

SES 안내

Smart Entry Service란?

이용대상

SES Auto-gate 이용방법

SES 등록센터 및 이용가능 공항

자동출입국심사 상호이용

한·미국(SeS-GE)

한-홍콩(SES-e-Channel)

한-마카오(SES-APC)

한-대만(SES-e-Gate)

한-독일(SES-EasyPASS)

정보광장

비자내비게이터(맞춤형 
체류가이드)

동포 맞춤형 길라잡이

체류자격별 안내메뉴얼

한국생활 길잡이

출입국/체류안내

국적/귀화안내

사회통합

기술창업이민

투자이민

투자지원

고용지원

출입국관련 법령지침정보

빅데이터 분석·시각화

뉴스·공지

공지사항

보도자료

자료실

민원서식

뉴스레터

하이코리아에서는

편리한 민원신청을 위해
온라인으로 신청하실 수 있는 서비스를 제공하고 있습니다.

뉴스 · 공지

공지사항

보도자료

자료실

민원서식

뉴스레터

홈 뉴스 · 공지 공지사항

공지사항

공지사항 상세보기

제목

체류자격별 통합 안내 매뉴얼(최신)

작성자

HIKOREA

구분

HIKOREA

이메일

홈페이지

첨부

260709 사증.체류 민원 자격별 안내 매뉴얼 수정 이력.hwp

260709 체류민원 자격별 안내 매뉴얼.hwp

260709 사증민원 자격별 안내 매뉴얼.hwp

---

## chunk 2
안녕하십니까? 
 
 출입국업무(사증 및 체류)와 관련하여 각 체류자격별 신청대상 및 필요서류에 대한 이해를 돕기 위해 안내 매뉴얼을 제작하여 등재하오니 많은 이용 바랍니다. 
 체류자격별 통합 안내 매뉴얼은 지침 변경 시 수정하여 등재하고 있으나, 업로드 되는 데 시간이 소요될 수 있습니다. 
 
 따라서 최신 지침에 따른 정확한 상담을 받고자 하는 경우 1345에 전화하시거나 방문예약 후 관할 출입국외국인·관서에 방문하시기 바랍니다.

목록

인쇄하기

TOP

개인정보처리방침

웹접근성정책

원격접속

관련사이트

지역/지방정부

1345 
 (국번없이) 
 (FAX) 02-2650-4550 
 
 (FAX민원) 1577-1346 
 
 
 
 (해외문의) +82-2-1345, +82-2-6908-1345~6 
 
 트위터 -->
 페이스북

다운로드

아크로벳 다운로드 
 엑셀 다운로드 
 한글 다운로드 
 워드 다운로드

주소 : 경기도 과천시 관문로 47 정부과천청사 1동 ( 외국인종합안내센터 : 국번없이 1345 )

Copyright ⓒ 2020 HI KOREA. All rights Reserved.
```

---

## A1B-004 hikorea-fees-processing-authentication__candidate__58e63502a9ec

- 제목: [검토 후보] 하이코리아 수수료·처리기간·원본/번역/아포스티유 안내
- sourceUrl: https://www.hikorea.go.kr/info/InfoMain.pt
- sourceType: official_government
- topic: cost
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: hikorea-fees-processing-authentication
- supersededBy: 없음
- chunkCount: 5
- extractionMethod: html
- contentType: text/html; charset=UTF-8
- byteLength: 93917
- extractedChars: 10243
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 하이코리아 수수료·처리기간·원본/번역/아포스티유 안내
source_url: https://www.hikorea.go.kr/info/InfoMain.pt
source_type: official_government
topic: cost
legal_priority: 4
monitor_cadence: daily
change_signals: fee, processing_period, apostille, translation, original_document, authentication
extraction_method: html
content_type: text/html; charset=UTF-8
byte_sha256: d7ffb5f6ee69866913744c621b7cc7f8cd1c3ad945a28d48ec9b6cf7736fc9d4
byte_length: 93917
extracted_chars: 10243

출입국/체류 메인 < 하이코리아

본문 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

..

로그인

회원가입

이용안내

고객센터

한국어

ENGLISH

中文

통합검색

검색

통합검색 닫기

Hi Korea

민원신청

전자민원

방문예약

출입국민원 대행기관 이용

출입국우대카드(기관담당자전용)

온라인 상륙허가

정보조회

민원신청결과

전자민원

방문예약

사증발급인정서

난민 이의신청

기타 조회 서비스 -->

기타 조회 서비스

관할 출입국.외국인관서 조회

등록증 · 거소증 유효확인

등록증·거소증 분실(철회) 신고

외국인 취업 및 고용가능여부 조회

---

## chunk 1
출입국민원 대행기관 조회

법무부지정 의료기관 조회

체류만료일조회

육아도우미 교육수료자 조회

통합고용변동 민원조회

전자민원 허가서 발급 확인

출국금지 여부 조회
(한국인 전용)

국적심사 진행상황 조회

자동출입국심사

SES 안내

Smart Entry Service란?

이용대상

SES Auto-gate 이용방법

SES 등록센터 및 이용가능 공항

자동출입국심사 상호이용

한·미국(SeS-GE)

한-홍콩(SES-e-Channel)

한-마카오(SES-APC)

한-대만(SES-e-Gate)

한-독일(SES-EasyPASS)

정보광장

비자내비게이터(맞춤형 
체류가이드)

동포 맞춤형 길라잡이

체류자격별 안내메뉴얼

한국생활 길잡이

출입국/체류안내

국적/귀화안내

사회통합

기술창업이민

투자이민

투자지원

고용지원

출입국관련 법령지침정보

빅데이터 분석·시각화

뉴스·공지

공지사항

보도자료

자료실

민원서식

뉴스레터

하이코리아에서는

편리한 민원신청을 위해
온라인으로 신청하실 수 있는 서비스를 제공하고 있습니다.

출입국/체류안내

초청/사증(VISA) 
 
 
 사증

사증발급인정서

사증발급인정서 신청결과조회

국제 결혼안내프로그램

출입국심사 
 
 
 국민출입국심사

외국인출입국심사

남북한왕래

승무원출입국심사/상륙허가

선박 등의 장 및 운수업자의 책임

출입국우대카드

외국인의 체류 
 
 
 체류일반

외국인등록

체류기간
연장

체류자격변경

체류자격외활동

근무처변경/추가

체류자격부여

재입국허가(복수)

각종신고의무

---

## chunk 2
국적/귀화 
 
 
 국적민원 접수장소

귀화(일반,간이,특별)

국적회복

국적판정

국적취득

국적 선택의무/선택절차/이탈절차/보유상실

국적선택명령/국적상실결정/외국국적포기의무

국적법 질의응답

종합평가 및 면접심사

국적증서수여식

기초 법 제도 및 질서 
 
 
 법과 질서

재외동포 
 
 
 거소신고의의/절차

재외동포 활동범위

지원부서 안내

동포관련 사이트

동포 맞춤형 길라잡이

난민인정 
 
 
 개요

난민신청 및 심사절차

체류/취업

처우

출입국사범/보호 
 
 
 출입국사범 의미/조사

출입국사범 심사결정

출입국사범 보호

증명발급 
 
 
 증명발급

알기쉬운 출입국 안내 
 
 
 관광, 통과, 각종행사, 회의참가 등

친척 방문, 가족 동거, 거주, 동반, 재외동포 등

사업의 목적

학업의 목적

취업의 목적

기타 목적

계절근로자 제도 
 
 
 개요

대상자

허용업종 및 허용인원

계절근로 사증 종류

통계 자료

재외공관 등 제공자료

개인정보 수집·이용안내

홈 출입국/체류안내

출입국/체류 안내

알기쉬운 출입국업무 안내

알기쉬운 출입국업무 안내

번호

출입국 목적

체류기간

대상자

90일 이하

91일 이상

1

관광, 통과, 각종행사, 회의참가 등

보기

B1, B2, C3

2

친척 방문, 가족 동거, 거주, 동반, 재외동포 등

보기

보기

B1, B2, C3, F1 ~ 4

3

사업의 목적

보기

보기

C3, D7 ~ 9

4

학업의 목적

보기

보기

C3, D2, D4

5

취업의 목적

보기

보기

---

## chunk 3
C4, E1~E7, H1

6

기타 목적

보기

보기

C1, C3, D1, D5, D6

※ A1~A3, D3, E9~E10, F5는 안내에서 제외함.

출입국·외국인관서 종합민원안내

출입국·외국인관서 종합민원안내

초청/사증(VISA)

출입국심사

외국인의 체류

국적/귀화

사증(VISA)

사증발급인정서

사증발급인정서 신청결과조회

국제 결혼안내프로그램

국민출입국심사

외국인출입국심사

남북한왕래

승무원/상륙허가

선반/여객기심사

출입국우대카드

체류일반

외국인등록

체류기간연장

체류자격변경

체류자격외활동

근무처변경/추가

체류자격부여

재입국허가

각종신고의무

국적업무일반

귀화(일반,간이,특별)

국적회복

국적취득

국적 선택의무/선택절차/이탈절차/보유상실

국적법 질의응답

종합평가 및 면접심사

국적선택명령/국적상실결정/외국국적포기의무

국적증서수여식

국적판정

기초 법 제도 및 질서

재외동포

난민인정

출입국사범/보호

법과 질서

재외동포 활동범위

거소신고의의/절차

지원부서 안내

동포관련 사이트

동포 맞춤형 길라잡이

개요

난민신청 및 심사절차

체류/취업

처우

출입국사범 의미/조사

출입국사범 심사결정

출입국사범 보호

증명발급

계절근로자 제도

증명발급

개요

대상자

허용업종 및 허용인원

계절근로 사증 종류

통계 자료

재외공관 등 제공자료

개인정보 수집·이용안내

TOP

개인정보처리방침

웹접근성정책

원격접속

관련사이트

지역/지방정부

---

## chunk 4
1345 
 (국번없이) 
 (FAX) 02-2650-4550 
 
 (FAX민원) 1577-1346 
 
 
 
 (해외문의) +82-2-1345, +82-2-6908-1345~6 
 
 트위터 -->
 페이스북

다운로드

아크로벳 다운로드 
 엑셀 다운로드 
 한글 다운로드 
 워드 다운로드

주소 : 경기도 과천시 관문로 47 정부과천청사 1동 ( 외국인종합안내센터 : 국번없이 1345 )

Copyright ⓒ 2020 HI KOREA. All rights Reserved.
```

---

## A1B-005 hikorea-forms-document-checklist__candidate__70f99808a28f

- 제목: [검토 후보] 하이코리아 민원서식 및 제출서류
- sourceUrl: https://www.hikorea.go.kr/board/BoardApplicationListR.pt
- sourceType: official_government
- topic: documents
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: hikorea-forms-document-checklist
- supersededBy: 없음
- chunkCount: 3
- extractionMethod: html
- contentType: text/html; charset=UTF-8
- byteLength: 2156438
- extractedChars: 490851
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 하이코리아 민원서식 및 제출서류
source_url: https://www.hikorea.go.kr/board/BoardApplicationListR.pt
source_type: official_government
topic: documents
legal_priority: 4
monitor_cadence: daily
change_signals: content_hash
extraction_method: html
content_type: text/html; charset=UTF-8
byte_sha256: efbd33018886ae58d97dd50df7506c839653f5f412900be760581e158db60c81
byte_length: 2156438
extracted_chars: 490851

멀티게시판 민원서식 < 하이코리아

본문 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

..

로그인

회원가입

이용안내

고객센터

한국어

ENGLISH

中文

통합검색

검색

통합검색 닫기

Hi Korea

민원신청

전자민원

방문예약

출입국민원 대행기관 이용

출입국우대카드(기관담당자전용)

온라인 상륙허가

정보조회

민원신청결과

전자민원

방문예약

사증발급인정서

난민 이의신청

기타 조회 서비스 -->

기타 조회 서비스

관할 출입국.외국인관서 조회

등록증 · 거소증 유효확인

등록증·거소증 분실(철회) 신고

외국인 취업 및 고용가능여부 조회

출입국민원 대행기관 조회

법무부지정 의료기관 조회

체류만료일조회

육아도우미 교육수료자 조회

통합고용변동 민원조회

---

## chunk 1
전자민원 허가서 발급 확인

출국금지 여부 조회
(한국인 전용)

국적심사 진행상황 조회

자동출입국심사

SES 안내

Smart Entry Service란?

이용대상

SES Auto-gate 이용방법

SES 등록센터 및 이용가능 공항

자동출입국심사 상호이용

한·미국(SeS-GE)

한-홍콩(SES-e-Channel)

한-마카오(SES-APC)

한-대만(SES-e-Gate)

한-독일(SES-EasyPASS)

정보광장

비자내비게이터(맞춤형 
체류가이드)

동포 맞춤형 길라잡이

체류자격별 안내메뉴얼

한국생활 길잡이

출입국/체류안내

국적/귀화안내

사회통합

기술창업이민

투자이민

투자지원

고용지원

출입국관련 법령지침정보

빅데이터 분석·시각화

뉴스·공지

공지사항

보도자료

자료실

민원서식

뉴스레터

하이코리아에서는

편리한 민원신청을 위해
온라인으로 신청하실 수 있는 서비스를 제공하고 있습니다.

뉴스 · 공지

공지사항

보도자료

자료실

민원서식

뉴스레터

홈 뉴스 · 공지 민원서식

민원서식

목록

체류 관련

통합신청서(신고서)

신원보증서(한글)

신원보증서(영문)

고용·연수외국인변동사유발생신고서

유학생현황

어학연수생현황

방문취업동포취업개시등신고서

외국인유학(어학연수)생 시간제취업 확인서

산업연수(D-3) 연수계획서

산업연수(D-3) 연수일지

산업연수(D-3) 연수기간 연장신청 사유서

출국기한유예신청서

거주숙소제공사실확인서(영문병기)

거주숙소제공사실확인서(중문병기)

논문지도·졸업시험·학점취득 지도교수 확인서(국문)

---

## chunk 2
유학생 시간제취업 요건 준수 확인서(국문)

사업자(고용주) 및 신청인 서약서

영주(F-5) 자격 신청자 기본 정보

한글병기 신청서

한글병기 신청서(영문)

한글병기 신청서(중문)

불법체류외국인 자진출국 신고서

재학여부 신고서

외국인 직업 신고서

취업 외 목적 방문취업(H-2) 체류자격 소지자 안내 및 유의사항

국내 체류 중 비취업 서약서
```

---

## A1B-006 hikorea-homepage-urgent-notices__candidate__507ead35c05f

- 제목: [검토 후보] 하이코리아 첫 화면 긴급 공지·사칭사이트·전자민원 변경
- sourceUrl: https://www.hikorea.go.kr/index.html
- sourceType: official_government
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: hikorea-homepage-urgent-notices
- supersededBy: 없음
- chunkCount: 1
- extractionMethod: html
- contentType: text/html
- byteLength: 1685
- extractedChars: 23
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 하이코리아 첫 화면 긴급 공지·사칭사이트·전자민원 변경
source_url: https://www.hikorea.go.kr/index.html
source_type: official_government
topic: warning
legal_priority: 4
monitor_cadence: daily
change_signals: homepage_notice, scam_warning, e-application_change, fax_policy_change
extraction_method: html
content_type: text/html
byte_sha256: e99e8e014334877c4e60a2390dce1fdf9ad8d33668f9834c04dc85d45684c934
byte_length: 1685
extracted_chars: 23

Welcome to G4F of KOREA
```

---

## A1B-007 hikorea-integrated-status-manual__candidate__270fe5ad9e19

- 제목: [검토 후보] 하이코리아 체류자격별 통합 안내 매뉴얼
- sourceUrl: https://www.hikorea.go.kr/board/BoardNtcDetailR.pt?BBS_GB_CD=BS10&BBS_SEQ=1&NTCCTT_SEQ=1062&page=1
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: hikorea-integrated-status-manual
- supersededBy: 없음
- chunkCount: 3
- extractionMethod: html
- contentType: text/html; charset=UTF-8
- byteLength: 40723
- extractedChars: 3247
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 하이코리아 체류자격별 통합 안내 매뉴얼
source_url: https://www.hikorea.go.kr/board/BoardNtcDetailR.pt?BBS_GB_CD=BS10&BBS_SEQ=1&NTCCTT_SEQ=1062&page=1
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: content_hash
extraction_method: html
content_type: text/html; charset=UTF-8
byte_sha256: f05b1612e10f68df4fdb2b5906c0f1ed0c9d5e4f2230e68b6ebf3a5e384e2d14
byte_length: 40723
extracted_chars: 3247

멀티게시판 공지사항 상세조회 < 하이코리아

본문 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

..

로그인

회원가입

이용안내

고객센터

한국어

ENGLISH

中文

통합검색

검색

통합검색 닫기

Hi Korea

민원신청

전자민원

방문예약

출입국민원 대행기관 이용

출입국우대카드(기관담당자전용)

온라인 상륙허가

정보조회

민원신청결과

전자민원

방문예약

사증발급인정서

난민 이의신청

기타 조회 서비스 -->

기타 조회 서비스

관할 출입국.외국인관서 조회

등록증 · 거소증 유효확인

등록증·거소증 분실(철회) 신고

외국인 취업 및 고용가능여부 조회

출입국민원 대행기관 조회

---

## chunk 1
법무부지정 의료기관 조회

체류만료일조회

육아도우미 교육수료자 조회

통합고용변동 민원조회

전자민원 허가서 발급 확인

출국금지 여부 조회
(한국인 전용)

국적심사 진행상황 조회

자동출입국심사

SES 안내

Smart Entry Service란?

이용대상

SES Auto-gate 이용방법

SES 등록센터 및 이용가능 공항

자동출입국심사 상호이용

한·미국(SeS-GE)

한-홍콩(SES-e-Channel)

한-마카오(SES-APC)

한-대만(SES-e-Gate)

한-독일(SES-EasyPASS)

정보광장

비자내비게이터(맞춤형 
체류가이드)

동포 맞춤형 길라잡이

체류자격별 안내메뉴얼

한국생활 길잡이

출입국/체류안내

국적/귀화안내

사회통합

기술창업이민

투자이민

투자지원

고용지원

출입국관련 법령지침정보

빅데이터 분석·시각화

뉴스·공지

공지사항

보도자료

자료실

민원서식

뉴스레터

하이코리아에서는

편리한 민원신청을 위해
온라인으로 신청하실 수 있는 서비스를 제공하고 있습니다.

뉴스 · 공지

공지사항

보도자료

자료실

민원서식

뉴스레터

홈 뉴스 · 공지 공지사항

공지사항

공지사항 상세보기

제목

체류자격별 통합 안내 매뉴얼(최신)

작성자

HIKOREA

구분

HIKOREA

이메일

홈페이지

첨부

260709 사증.체류 민원 자격별 안내 매뉴얼 수정 이력.hwp

260709 체류민원 자격별 안내 매뉴얼.hwp

260709 사증민원 자격별 안내 매뉴얼.hwp

---

## chunk 2
안녕하십니까? 
 
 출입국업무(사증 및 체류)와 관련하여 각 체류자격별 신청대상 및 필요서류에 대한 이해를 돕기 위해 안내 매뉴얼을 제작하여 등재하오니 많은 이용 바랍니다. 
 체류자격별 통합 안내 매뉴얼은 지침 변경 시 수정하여 등재하고 있으나, 업로드 되는 데 시간이 소요될 수 있습니다. 
 
 따라서 최신 지침에 따른 정확한 상담을 받고자 하는 경우 1345에 전화하시거나 방문예약 후 관할 출입국외국인·관서에 방문하시기 바랍니다.

목록

인쇄하기

TOP

개인정보처리방침

웹접근성정책

원격접속

관련사이트

지역/지방정부

1345 
 (국번없이) 
 (FAX) 02-2650-4550 
 
 (FAX민원) 1577-1346 
 
 
 
 (해외문의) +82-2-1345, +82-2-6908-1345~6 
 
 트위터 -->
 페이스북

다운로드

아크로벳 다운로드 
 엑셀 다운로드 
 한글 다운로드 
 워드 다운로드

주소 : 경기도 과천시 관문로 47 정부과천청사 1동 ( 외국인종합안내센터 : 국번없이 1345 )

Copyright ⓒ 2020 HI KOREA. All rights Reserved.
```

---

## A1B-008 hikorea-online-visit-application__candidate__70cee4e748e1

- 제목: [검토 후보] 하이코리아 전자민원·방문예약
- sourceUrl: https://www.hikorea.go.kr/cvlappl/CvlapplStep1.pt
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: hikorea-online-visit-application
- supersededBy: 없음
- chunkCount: 4
- extractionMethod: html
- contentType: text/html; charset=UTF-8
- byteLength: 54584
- extractedChars: 4541
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 하이코리아 전자민원·방문예약
source_url: https://www.hikorea.go.kr/cvlappl/CvlapplStep1.pt
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: content_hash
extraction_method: html
content_type: text/html; charset=UTF-8
byte_sha256: 75bb917a60cf99e52a5038594cc22b6b6e60204dcbfbf372f220e529b014a67f
byte_length: 54584
extracted_chars: 4541

전자민원 목록 < 하이코리아

본문 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

..

로그인

회원가입

이용안내

고객센터

한국어

ENGLISH

中文

통합검색

검색

통합검색 닫기

Hi Korea

민원신청

전자민원

방문예약

출입국민원 대행기관 이용

출입국우대카드(기관담당자전용)

온라인 상륙허가

정보조회

민원신청결과

전자민원

방문예약

사증발급인정서

난민 이의신청

기타 조회 서비스 -->

기타 조회 서비스

관할 출입국.외국인관서 조회

등록증 · 거소증 유효확인

등록증·거소증 분실(철회) 신고

외국인 취업 및 고용가능여부 조회

출입국민원 대행기관 조회

법무부지정 의료기관 조회

체류만료일조회

육아도우미 교육수료자 조회

통합고용변동 민원조회

전자민원 허가서 발급 확인

---

## chunk 1
출국금지 여부 조회
(한국인 전용)

국적심사 진행상황 조회

자동출입국심사

SES 안내

Smart Entry Service란?

이용대상

SES Auto-gate 이용방법

SES 등록센터 및 이용가능 공항

자동출입국심사 상호이용

한·미국(SeS-GE)

한-홍콩(SES-e-Channel)

한-마카오(SES-APC)

한-대만(SES-e-Gate)

한-독일(SES-EasyPASS)

정보광장

비자내비게이터(맞춤형 
체류가이드)

동포 맞춤형 길라잡이

체류자격별 안내메뉴얼

한국생활 길잡이

출입국/체류안내

국적/귀화안내

사회통합

기술창업이민

투자이민

투자지원

고용지원

출입국관련 법령지침정보

빅데이터 분석·시각화

뉴스·공지

공지사항

보도자료

자료실

민원서식

뉴스레터

하이코리아에서는

편리한 민원신청을 위해
온라인으로 신청하실 수 있는 서비스를 제공하고 있습니다.

민원신청

전자민원 
 
 
 전자민원 안내

전자민원 신청

방문예약 
 
 
 방문예약 신청

방문예약 신청현황(비회원)

출입국민원 대행기관 이용

출입국우대카드 
 
 
 출입국우대카드 안내

담당자 로그인

담당자 등록신청

자진출국 사전신고

홈 민원신청 전자민원 전자민원 신청

전자민원

1.민원선택 선택됨

2.인증

3.민원작성

4.민원신청결과

민원선택

재입국허가(복수)

비전문취업(E-9) 근무처변경허가

등록외국인의 체류기간연장허가

재외동포(F-4) 거소신고자 체류기간 연장허가

단기체류자 체류기간연장허가

H-2의 근로개시 및 취업개시 통합신고

등록외국인의 체류자격 변경허가

---

## chunk 2
체류자격 외 활동허가(가사ㆍ육아 분야 등)

가사ㆍ육아 분야 등 활동 개시 신고

유학생(D-2) 및 어학연수생(D-4-1) 시간제취업 허가

유학생(D-2) 및 어학연수생(D-4-1) 시간제취업 신고

재외동포 거소 이전신고

C3 재입국자 체류지 신고

등록외국인의 출국을 위한 기간연장허가

단기체류자의 출국을 위한 기간연장허가

여권변경 신고

재학사항(초,중,고)변경 신고

취업정보 (변경)신고

체류지 변경 신고

체류자격 외 활동허가(포괄적 사전허가)

포괄적 체류자격 외 활동 취업 개시 및 종료 신고

※ 본인은「전자정부법」제36조에 따라 이 건 업무처리를 위해 담당공무원이 필요한 사항을
행정정보 공동이용을 통해 확인하는 것에 동의합니다.

「출입국관리법」에 따라 심사를 위하여 출석을 요구하거나, 실태조사가 필요할 수 있습니다.
또한, 심사결과에 따라 신청이 불허가 될 수 있습니다.

행정정보 공동이용 동의 여부 확인

코로나19로 인한 격리 대상자입니까? 
 예 
 아니오

※ 재입국허가자는 재입국시 유효한 PCR 음성 검사서를 소지해야 합니다.
 
 - 미소지 시 입국이 불허 될 수 있습니다.
 
 동의 
 비동의(비동의시 재입국허가 신청 불가)

심사가 완료되기 전에 담당자에게 연락 없이 출국하는 경우 허가 여부 결정 없이 심사가 종결될 수 있으니 유의하시기 바랍니다.

다음

TOP

개인정보처리방침

웹접근성정책

원격접속

관련사이트

지역/지방정부

---

## chunk 3
1345 
 (국번없이) 
 (FAX) 02-2650-4550 
 
 (FAX민원) 1577-1346 
 
 
 
 (해외문의) +82-2-1345, +82-2-6908-1345~6 
 
 트위터 -->
 페이스북

다운로드

아크로벳 다운로드 
 엑셀 다운로드 
 한글 다운로드 
 워드 다운로드

주소 : 경기도 과천시 관문로 47 정부과천청사 1동 ( 외국인종합안내센터 : 국번없이 1345 )

Copyright ⓒ 2020 HI KOREA. All rights Reserved.
```

---

## A1B-009 hikorea-policy-notice-monitor__candidate__98529da69070

- 제목: [검토 후보] 하이코리아 공지사항 정책 변경 감시
- sourceUrl: https://www.hikorea.go.kr/board/BoardNtcListR.pt
- sourceType: official_government
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: hikorea-policy-notice-monitor
- supersededBy: 없음
- chunkCount: 4
- extractionMethod: html
- contentType: text/html; charset=UTF-8
- byteLength: 43599
- extractedChars: 3891
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 하이코리아 공지사항 정책 변경 감시
source_url: https://www.hikorea.go.kr/board/BoardNtcListR.pt
source_type: official_government
topic: warning
legal_priority: 4
monitor_cadence: daily
change_signals: notice_title, attachment, posted_date, manual_update
extraction_method: html
content_type: text/html; charset=UTF-8
byte_sha256: 1afc3181066856f83636d8bd3b696c0d1571ba649badf970235085defe051ed0
byte_length: 43599
extracted_chars: 3891

멀티게시판 공지사항 < 하이코리아

본문 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

..

로그인

회원가입

이용안내

고객센터

한국어

ENGLISH

中文

통합검색

검색

통합검색 닫기

Hi Korea

민원신청

전자민원

방문예약

출입국민원 대행기관 이용

출입국우대카드(기관담당자전용)

온라인 상륙허가

정보조회

민원신청결과

전자민원

방문예약

사증발급인정서

난민 이의신청

기타 조회 서비스 -->

기타 조회 서비스

관할 출입국.외국인관서 조회

등록증 · 거소증 유효확인

등록증·거소증 분실(철회) 신고

외국인 취업 및 고용가능여부 조회

출입국민원 대행기관 조회

법무부지정 의료기관 조회

체류만료일조회

---

## chunk 1
육아도우미 교육수료자 조회

통합고용변동 민원조회

전자민원 허가서 발급 확인

출국금지 여부 조회
(한국인 전용)

국적심사 진행상황 조회

자동출입국심사

SES 안내

Smart Entry Service란?

이용대상

SES Auto-gate 이용방법

SES 등록센터 및 이용가능 공항

자동출입국심사 상호이용

한·미국(SeS-GE)

한-홍콩(SES-e-Channel)

한-마카오(SES-APC)

한-대만(SES-e-Gate)

한-독일(SES-EasyPASS)

정보광장

비자내비게이터(맞춤형 
체류가이드)

동포 맞춤형 길라잡이

체류자격별 안내메뉴얼

한국생활 길잡이

출입국/체류안내

국적/귀화안내

사회통합

기술창업이민

투자이민

투자지원

고용지원

출입국관련 법령지침정보

빅데이터 분석·시각화

뉴스·공지

공지사항

보도자료

자료실

민원서식

뉴스레터

하이코리아에서는

편리한 민원신청을 위해
온라인으로 신청하실 수 있는 서비스를 제공하고 있습니다.

뉴스 · 공지

공지사항

보도자료

자료실

민원서식

뉴스레터

홈 뉴스 · 공지 공지사항

공지사항

구분

제목

내용

제목+내용

검색어

조회

전체

HIKOREA

SES

이동

건수

:

1597

공지사항 목록

번호

구분

제목

작성자

등록일

1

HIKOREA

전자민원 일부항목 일시 중단 안내

HIKOREA

2026-07-10

2

HIKOREA

행정안전부 주민등록정보시스템 관련 작업에 따른 외국인실명인증서비스 일시 중단 안내

HIKOREA

2026-07-10

3

HIKOREA

---

## chunk 2
「이주배경 아동‧청소년 홍보대사」 모집 공고

HIKOREA

2026-07-09

4

HIKOREA

2026년 의료관광 우수 유치기관 지정 계획 공고

강유나

2026-07-09

5

HIKOREA

양주출입국외국인사무소 대행기관 전용창구 시행 예정

HIKOREA

2026-07-07

6

HIKOREA

인도네시아 단체관광객 한시 무사증입국 시행 관련 국내 여행사 추가 등록 안내

HiKorea

2026-07-06

7

HIKOREA

「육성형 전문기술인력 제도」사증･체류관리 매뉴얼

HiKorea

2026-06-29

8

HIKOREA

2026. 6. 30.(화) 출입국민원 대행기관 보수교육 취소 공고 (대전출입국외국인사무소)

HIKOREA

2026-06-22

9

HIKOREA

2026년 7월 출입국민원 대행기관 교육일정 알림

HIKOREA

2026-06-19

10

HIKOREA

2026.6.30.(화) 출입국민원 대행기관 교육 취소 공고

HIKOREA

2026-06-19

| 1 [2] [3] [4] [5] [6] [7] [8] [9] [10] > >|

TOP

개인정보처리방침

웹접근성정책

원격접속

관련사이트

지역/지방정부

1345 
 (국번없이) 
 (FAX) 02-2650-4550 
 
 (FAX민원) 1577-1346 
 
 
 
 (해외문의) +82-2-1345, +82-2-6908-1345~6 
 
 트위터 -->
 페이스북

다운로드

아크로벳 다운로드 
 엑셀 다운로드 
 한글 다운로드 
 워드 다운로드

---

## chunk 3
주소 : 경기도 과천시 관문로 47 정부과천청사 1동 ( 외국인종합안내센터 : 국번없이 1345 )

Copyright ⓒ 2020 HI KOREA. All rights Reserved.
```

---

## A1B-010 hikorea-status-change__candidate__552d957ec23b

- 제목: [검토 후보] 하이코리아 체류자격변경 안내
- sourceUrl: https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=184&PARENT_ID=141
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: hikorea-status-change
- supersededBy: 없음
- chunkCount: 5
- extractionMethod: html
- contentType: text/html; charset=UTF-8
- byteLength: 43203
- extractedChars: 4875
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 하이코리아 체류자격변경 안내
source_url: https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=184&PARENT_ID=141
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: content_hash
extraction_method: html
content_type: text/html; charset=UTF-8
byte_sha256: db610bf704a21af084d70dada6a01cf73eb08617e11f6d59fd6149ec142bde9b
byte_length: 43203
extracted_chars: 4875

출입국/체류안내

**********************************************************************

* DATE AUTHOR DESCRIPTION

**********************************************************************

* 2019-05-09 전예원 최초작성

**********************************************************************

-->

출입국/체류 상세 < 하이코리아

본문 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

..

로그인

회원가입

이용안내

고객센터

한국어

ENGLISH

中文

통합검색

검색

---

## chunk 1
통합검색 닫기

Hi Korea

민원신청

전자민원

방문예약

출입국민원 대행기관 이용

출입국우대카드(기관담당자전용)

온라인 상륙허가

정보조회

민원신청결과

전자민원

방문예약

사증발급인정서

난민 이의신청

기타 조회 서비스 -->

기타 조회 서비스

관할 출입국.외국인관서 조회

등록증 · 거소증 유효확인

등록증·거소증 분실(철회) 신고

외국인 취업 및 고용가능여부 조회

출입국민원 대행기관 조회

법무부지정 의료기관 조회

체류만료일조회

육아도우미 교육수료자 조회

통합고용변동 민원조회

전자민원 허가서 발급 확인

출국금지 여부 조회
(한국인 전용)

국적심사 진행상황 조회

자동출입국심사

SES 안내

Smart Entry Service란?

이용대상

SES Auto-gate 이용방법

SES 등록센터 및 이용가능 공항

자동출입국심사 상호이용

한·미국(SeS-GE)

한-홍콩(SES-e-Channel)

한-마카오(SES-APC)

한-대만(SES-e-Gate)

한-독일(SES-EasyPASS)

정보광장

비자내비게이터(맞춤형 
체류가이드)

동포 맞춤형 길라잡이

체류자격별 안내메뉴얼

한국생활 길잡이

출입국/체류안내

국적/귀화안내

사회통합

기술창업이민

투자이민

투자지원

고용지원

출입국관련 법령지침정보

빅데이터 분석·시각화

뉴스·공지

공지사항

보도자료

자료실

민원서식

뉴스레터

하이코리아에서는

편리한 민원신청을 위해
온라인으로 신청하실 수 있는 서비스를 제공하고 있습니다.

출입국/체류안내

초청/사증(VISA) 
 
 
 사증

---

## chunk 2
사증발급인정서

사증발급인정서 신청결과조회

국제 결혼안내프로그램

출입국심사 
 
 
 국민출입국심사

외국인출입국심사

남북한왕래

승무원출입국심사/상륙허가

선박 등의 장 및 운수업자의 책임

출입국우대카드

외국인의 체류 
 
 
 체류일반

외국인등록

체류기간
연장

체류자격변경

체류자격외활동

근무처변경/추가

체류자격부여

재입국허가(복수)

각종신고의무

국적/귀화 
 
 
 국적민원 접수장소

귀화(일반,간이,특별)

국적회복

국적판정

국적취득

국적 선택의무/선택절차/이탈절차/보유상실

국적선택명령/국적상실결정/외국국적포기의무

국적법 질의응답

종합평가 및 면접심사

국적증서수여식

기초 법 제도 및 질서 
 
 
 법과 질서

재외동포 
 
 
 거소신고의의/절차

재외동포 활동범위

지원부서 안내

동포관련 사이트

동포 맞춤형 길라잡이

난민인정 
 
 
 개요

난민신청 및 심사절차

체류/취업

처우

출입국사범/보호 
 
 
 출입국사범 의미/조사

출입국사범 심사결정

출입국사범 보호

증명발급 
 
 
 증명발급

알기쉬운 출입국 안내 
 
 
 관광, 통과, 각종행사, 회의참가 등

친척 방문, 가족 동거, 거주, 동반, 재외동포 등

사업의 목적

학업의 목적

취업의 목적

기타 목적

계절근로자 제도 
 
 
 개요

대상자

허용업종 및 허용인원

계절근로 사증 종류

통계 자료

재외공관 등 제공자료

개인정보 수집·이용안내

홈 출입국/체류안내

체류자격변경

체류자격변경허가 절차/방법

체류자격별 안내메뉴얼

체류자격변경허가 절차/방법

---

## chunk 3
체류자격변경허가 절차도

체류자격변경이란?

대한민국에 체류하는 외국인이 현재 체류자격에 해당하는 활동을 중지하고 다른 체류자격에 해당하는 활동을 하고자 하는 경우를 말합니다.

체류자격변경허가의 기본원칙

원칙적으로 현재의 체류자격에 해당하는 활동을 중지하고 다른 체류자격에 해당하는 활동을 하고자 하는 경우 출국 후 해당 체류자격의 사증(VISA)을 받고 입국하여야 합니다.

다만, 국내에서 해당 체류자격 변경에 필요한 요건을 갖출 수 있는 경우 엄격한 심사를 거쳐 제한적으로 체류자격변경을 할 수 있습니다.

변경하고자 하는 체류자격에 필요한 요건과 제출서류는 상단 체류자격을 클릭하여 참고하시거나 관할 출입국관리사무소에 문의하시기 바랍니다.

체류자격변경허가 신청기간

반드시 다른 체류자격에 해당하는 활동을 하기 이전에 관할 출입국관리사무소에서 체류자격변경허가를 받아야 합니다.

외교(A-1), 공무(A-2), 협정(A-3) 체류자격자 등이 신분변경으로 그 체류자격을 변경하고자 하는 경우에는 신분변경일로부터 30일 이내에 체류자격변경허가를 받아야 합니다.

체류자격변경허가 신청방법

본인 또는 대리인이 주소지 관할 출입국관리사무소에 필요한 제출서류(체류자격별 제출서류 참조)를 준비하셔서 신청하시면 됩니다.

체류자격변경허가를 신청하여야 하는 경우(예시)

단기방문(C-3)으로 활동하고 있는 외국인이 대한민국에 투자(D-8)를 하려는 경우

어학연수(D-4)를 마친 후 대학에 유학(D-2) 하고자 하는 경우

한국인과 결혼한 외국인이 결혼이민(F-6)으로 체류자격변경을 하고자 하는 경우

---

## chunk 4
< 작성일 : 2013.01.01 >

인쇄하기

TOP

개인정보처리방침

웹접근성정책

원격접속

관련사이트

지역/지방정부

1345 
 (국번없이) 
 (FAX) 02-2650-4550 
 
 (FAX민원) 1577-1346 
 
 
 
 (해외문의) +82-2-1345, +82-2-6908-1345~6 
 
 트위터 -->
 페이스북

다운로드

아크로벳 다운로드 
 엑셀 다운로드 
 한글 다운로드 
 워드 다운로드

주소 : 경기도 과천시 관문로 47 정부과천청사 1동 ( 외국인종합안내센터 : 국번없이 1345 )

Copyright ⓒ 2020 HI KOREA. All rights Reserved.
```

---

## A1B-011 hikorea-stay-extension__candidate__8147f008db7b

- 제목: [검토 후보] 하이코리아 체류기간연장 안내
- sourceUrl: https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=181&PARENT_ID=140
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: hikorea-stay-extension
- supersededBy: 없음
- chunkCount: 4
- extractionMethod: html
- contentType: text/html; charset=UTF-8
- byteLength: 42053
- extractedChars: 4501
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 하이코리아 체류기간연장 안내
source_url: https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=181&PARENT_ID=140
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: content_hash
extraction_method: html
content_type: text/html; charset=UTF-8
byte_sha256: 38f4b873271d1983b66a5e7ced4ee92dc66bbabe23d191aa0b087ed063e5815a
byte_length: 42053
extracted_chars: 4501

출입국/체류안내

**********************************************************************

* DATE AUTHOR DESCRIPTION

**********************************************************************

* 2019-05-09 전예원 최초작성

**********************************************************************

-->

출입국/체류 상세 < 하이코리아

본문 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

..

로그인

회원가입

이용안내

고객센터

한국어

ENGLISH

中文

통합검색

검색

---

## chunk 1
통합검색 닫기

Hi Korea

민원신청

전자민원

방문예약

출입국민원 대행기관 이용

출입국우대카드(기관담당자전용)

온라인 상륙허가

정보조회

민원신청결과

전자민원

방문예약

사증발급인정서

난민 이의신청

기타 조회 서비스 -->

기타 조회 서비스

관할 출입국.외국인관서 조회

등록증 · 거소증 유효확인

등록증·거소증 분실(철회) 신고

외국인 취업 및 고용가능여부 조회

출입국민원 대행기관 조회

법무부지정 의료기관 조회

체류만료일조회

육아도우미 교육수료자 조회

통합고용변동 민원조회

전자민원 허가서 발급 확인

출국금지 여부 조회
(한국인 전용)

국적심사 진행상황 조회

자동출입국심사

SES 안내

Smart Entry Service란?

이용대상

SES Auto-gate 이용방법

SES 등록센터 및 이용가능 공항

자동출입국심사 상호이용

한·미국(SeS-GE)

한-홍콩(SES-e-Channel)

한-마카오(SES-APC)

한-대만(SES-e-Gate)

한-독일(SES-EasyPASS)

정보광장

비자내비게이터(맞춤형 
체류가이드)

동포 맞춤형 길라잡이

체류자격별 안내메뉴얼

한국생활 길잡이

출입국/체류안내

국적/귀화안내

사회통합

기술창업이민

투자이민

투자지원

고용지원

출입국관련 법령지침정보

빅데이터 분석·시각화

뉴스·공지

공지사항

보도자료

자료실

민원서식

뉴스레터

하이코리아에서는

편리한 민원신청을 위해
온라인으로 신청하실 수 있는 서비스를 제공하고 있습니다.

출입국/체류안내

초청/사증(VISA) 
 
 
 사증

---

## chunk 2
사증발급인정서

사증발급인정서 신청결과조회

국제 결혼안내프로그램

출입국심사 
 
 
 국민출입국심사

외국인출입국심사

남북한왕래

승무원출입국심사/상륙허가

선박 등의 장 및 운수업자의 책임

출입국우대카드

외국인의 체류 
 
 
 체류일반

외국인등록

체류기간
연장

체류자격변경

체류자격외활동

근무처변경/추가

체류자격부여

재입국허가(복수)

각종신고의무

국적/귀화 
 
 
 국적민원 접수장소

귀화(일반,간이,특별)

국적회복

국적판정

국적취득

국적 선택의무/선택절차/이탈절차/보유상실

국적선택명령/국적상실결정/외국국적포기의무

국적법 질의응답

종합평가 및 면접심사

국적증서수여식

기초 법 제도 및 질서 
 
 
 법과 질서

재외동포 
 
 
 거소신고의의/절차

재외동포 활동범위

지원부서 안내

동포관련 사이트

동포 맞춤형 길라잡이

난민인정 
 
 
 개요

난민신청 및 심사절차

체류/취업

처우

출입국사범/보호 
 
 
 출입국사범 의미/조사

출입국사범 심사결정

출입국사범 보호

증명발급 
 
 
 증명발급

알기쉬운 출입국 안내 
 
 
 관광, 통과, 각종행사, 회의참가 등

친척 방문, 가족 동거, 거주, 동반, 재외동포 등

사업의 목적

학업의 목적

취업의 목적

기타 목적

계절근로자 제도 
 
 
 개요

대상자

허용업종 및 허용인원

계절근로 사증 종류

통계 자료

재외공관 등 제공자료

개인정보 수집·이용안내

홈 출입국/체류안내

체류기간연장

체류기간연장허가 절차/방법

체류자격별 안내메뉴얼

체류기간연장허가 절차/방법

---

## chunk 3
체류기간연장허가 절차도

체류기간연장이란?

이전에 허가받은 체류기간을 초과하여 계속 대한민국에 체류하고자 하는 외국인은 체류기간연장허가를 받아야 합니다.

체류기간연장허가 신청기간

체류기간연장을 신청하려고 하는 외국인은 현재의 체류기간이 만료하기 전 4개월부터 만료 당일까지 신청하여야 합니다.

체류기간만료일이 지난 후 체류기간연장허가를 신청하게 되면 범칙금이 부과됩니다.(출입국관리법 제25조)

체류기간연장허가 신청방법

본인 또는 대리인 (국민의배우자(F-6)등 대리인이 불가능한 자격이 있으니 확인요망) 이 주소지 관할 출입국관리사무소에 필요한 제출서류(체류자격별 제출서류 참조)를 준비하셔서 신청하시면 됩니다.

단, 신청당일 본인이 국내에 체류하고 있는 경우 신청이 가능(해외에서 민원신청 및 대리는 불가)

체류자격별 제출서류는 상단의 체류자격표를 클릭하여 확인하시기 바랍니다.

< 작성일 : 2013.01.01 >

인쇄하기

TOP

개인정보처리방침

웹접근성정책

원격접속

관련사이트

지역/지방정부

1345 
 (국번없이) 
 (FAX) 02-2650-4550 
 
 (FAX민원) 1577-1346 
 
 
 
 (해외문의) +82-2-1345, +82-2-6908-1345~6 
 
 트위터 -->
 페이스북

다운로드

아크로벳 다운로드 
 엑셀 다운로드 
 한글 다운로드 
 워드 다운로드

주소 : 경기도 과천시 관문로 47 정부과천청사 1동 ( 외국인종합안내센터 : 국번없이 1345 )

Copyright ⓒ 2020 HI KOREA. All rights Reserved.
```

---

## A1B-012 immigration-act-activity-scope-restriction__candidate__377c1bf98c37

- 제목: [검토 후보] 출입국관리법 제22조 활동범위의 제한
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0022&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: legal
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-activity-scope-restriction
- supersededBy: 없음
- chunkCount: 5
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 71508
- extractedChars: 3150
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제22조 활동범위의 제한
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0022&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: legal
legal_priority: 1
monitor_cadence: daily
change_signals: activity_scope, residence_restriction, compliance_conditions, public_order
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: f145bada1f7d282cc686c08195ce88854ce3229e7a4bdb37b8fc8590be74c330
byte_length: 71508
extracted_chars: 3150

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제22조(활동범위의 제한) 법무부장관은 공공의 안녕질서나 대한민국의 중요한 이익을 위하여 필요하다고 인정하면 대한민국에 체류하는 외국인에 대하여 거소(居所) 또는 활동의 범위를 제한하거나 그 밖에 필요한 준수사항을 정할 수 있다.

[전문개정 2010. 5. 14.]

---

## chunk 2
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 3

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 4
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-013 immigration-act-address-change-report__candidate__11a9b360168e

- 제목: [검토 후보] 출입국관리법 제36조 체류지 변경신고
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0036&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-address-change-report
- supersededBy: 없음
- chunkCount: 7
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 75663
- extractedChars: 4327
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제36조 체류지 변경신고
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0036&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: address_change, place_of_stay, moving, 15_days, online_report, mobile_arc
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: e48687f2b7d219fc32d51aef653202d64bbe8e3e6caef7ad4d23878e71dcacdd
byte_length: 75663
extracted_chars: 4327

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제36조(체류지 변경의 신고) ① 제31조 에 따라 등록을 한 외국인이 체류지를 변경하였을 때에는 대통령령 으로 정하는 바에 따라 전입한 날부터 15일 이내에 새로운 체류지의 시ㆍ군ㆍ구 또는 읍ㆍ면ㆍ동의 장이나 그 체류지를 관할하는 지방출입국ㆍ외국인관서의 장에게 전입신고를 하여야 한다.   <개정 2014. 3. 18., 2016. 3. 29., 2018. 3. 20., 2020. 6. 9.>

---

## chunk 2
② 외국인이 제1항에 따른 신고를 할 때에는 외국인등록증을 제출하여야 한다. 이 경우 시ㆍ군ㆍ구 또는 읍ㆍ면ㆍ동의 장이나 지방출입국ㆍ외국인관서의 장은 그 외국인등록증에 체류지 변경사항을 적은 후 돌려주어야 한다.   <개정 2014. 3. 18., 2016. 3. 29.> 
 
 ③ 제1항에 따라 전입신고를 받은 지방출입국ㆍ외국인관서의 장은 지체 없이 새로운 체류지의 시ㆍ군ㆍ구 또는 읍ㆍ면ㆍ동의 장에게 체류지 변경 사실을 통보하여야 한다.   <개정 2014. 3. 18., 2016. 3. 29.> 
 
 ④ 제1항에 따라 직접 전입신고를 받거나 제3항에 따라 지방출입국ㆍ외국인관서의 장으로부터 체류지 변경통보를 받은 시ㆍ군ㆍ구 또는 읍ㆍ면ㆍ동의 장은 지체 없이 종전 체류지의 시ㆍ군ㆍ구 또는 읍ㆍ면ㆍ동의 장에게 체류지 변경신고서 사본을 첨부하여 외국인등록표의 이송을 요청하여야 한다.   <개정 2014. 3. 18., 2016. 3. 29.> 
 
 ⑤ 제4항에 따라 외국인등록표 이송을 요청받은 종전 체류지의 시ㆍ군ㆍ구 또는 읍ㆍ면ㆍ동의 장은 이송을 요청받은 날부터 3일 이내에 새로운 체류지의 시ㆍ군ㆍ구 또는 읍ㆍ면ㆍ동의 장에게 외국인등록표를 이송하여야 한다.   <개정 2016. 3. 29.> 
 
 ⑥ 제5항에 따라 외국인등록표를 이송받은 시ㆍ군ㆍ구 또는 읍ㆍ면ㆍ동의 장은 신고인의 외국인등록표를 정리하고 제34조 제2항 에 따라 관리하여야 한다.   <개정 2016. 3. 29.> 
 
 ⑦ 제1항에 따라 전입신고를 받은 시ㆍ군ㆍ구 또는 읍ㆍ면ㆍ동의 장이나 지방출입국ㆍ외국인관서의 장은 대통령령 으로 정하는 

---

## chunk 3
바에 따라 그 사실을 지체 없이 종전 체류지를 관할하는 지방출입국ㆍ외국인관서의 장에게 통보하여야 한다.   <개정 2014. 3. 18., 2016. 3. 29.> 
 
 ⑧ 제2항에도 불구하고 제33조 제6항 에 따라 모바일외국인등록증을 발급받은 자가 「민원 처리에 관한 법률」 제12조의2 에 따라 전자민원창구를 이용하는 경우에는 체류지 변경사항을 모바일외국인등록증에 수록하는 것으로 제2항 후단에 따라 외국인등록증에 위 사항을 기재하는 것을 갈음할 수 있다.   <신설 2023. 6. 13.> 
 
 [전문개정 2010. 5. 14.]

---

## chunk 4
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 5

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 6
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-014 immigration-act-alien-registration__candidate__fc4fa989246c

- 제목: [검토 후보] 출입국관리법 제31조 외국인등록
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0031&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-alien-registration
- supersededBy: 없음
- chunkCount: 6
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 74091
- extractedChars: 3888
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제31조 외국인등록
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0031&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: alien_registration, 90_days, registration_number, local_office, status_change
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 22bfece4381e13335bbd534095069db0b7c98de9c4b70083864183e4f4c30940
byte_length: 74091
extracted_chars: 3888

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제31조(외국인등록) ① 외국인이 입국한 날부터 90일을 초과하여 대한민국에 체류하려면 대통령령 으로 정하는 바에 따라 입국한 날부터 90일 이내에 그의 체류지를 관할하는 지방출입국ㆍ외국인관서의 장에게 외국인등록을 하여야 한다. 다만, 다음 각 호의 어느 하나에 해당하는 외국인의 경우에는 그러하지 아니하다.   <개정 2014. 3. 18.>

---

## chunk 2
1. 주한외국공관(대사관과 영사관을 포함한다)과 국제기구의 직원 및 그의 가족 
 
 2. 대한민국정부와의 협정에 따라 외교관 또는 영사와 유사한 특권 및 면제를 누리는 사람과 그의 가족 
 
 3. 대한민국정부가 초청한 사람 등으로서 법무부령 으로 정하는 사람 
 
 ② 제1항에도 불구하고 같은 항 각 호의 어느 하나에 해당하는 외국인은 본인이 원하는 경우 체류기간 내에 외국인등록을 할 수 있다.   <신설 2016. 3. 29.> 
 
 ③ 제23조 에 따라 체류자격을 받는 사람으로서 그 날부터 90일을 초과하여 체류하게 되는 사람은 제1항 각 호 외의 부분 본문에도 불구하고 체류자격을 받는 때에 외국인등록을 하여야 한다.   <개정 2016. 3. 29.> 
 
 ④ 제24조 에 따라 체류자격 변경허가를 받는 사람으로서 입국한 날부터 90일을 초과하여 체류하게 되는 사람은 제1항 각 호 외의 부분 본문에도 불구하고 체류자격 변경허가를 받는 때에 외국인등록을 하여야 한다.   <개정 2016. 3. 29.> 
 
 ⑤ 지방출입국ㆍ외국인관서의 장은 제1항부터 제4항까지의 규정에 따라 외국인등록을 한 사람에게는 대통령령 으로 정하는 방법에 따라 개인별로 고유한 등록번호(이하 “외국인등록번호”라 한다)를 부여하여야 한다.   <개정 2014. 3. 18., 2016. 3. 29.> 
 
 [전문개정 2010. 5. 14.]

---

## chunk 3
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 4

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 5
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-015 immigration-act-arc-return-duty__candidate__c5bdd363ab8f

- 제목: [검토 후보] 출입국관리법 제37조 외국인등록증의 반납 등
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0037&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-arc-return-duty
- supersededBy: 없음
- chunkCount: 7
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 74294
- extractedChars: 3921
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제37조 외국인등록증의 반납 등
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0037&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: arc_return, departure, reentry_permit, multiple_visa, naturalization, death, 15_days
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 5be05603bfb773680e6cb415756a949636ab8381432d05f7ce073fa367a1655c
byte_length: 74294
extracted_chars: 3921

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제37조(외국인등록증의 반납 등) ① 제31조 에 따라 등록을 한 외국인이 출국할 때에는 출입국관리공무원에게 외국인등록증을 반납하여야 한다. 다만, 다음 각 호의 어느 하나에 해당하는 경우에는 그러하지 아니하다.

---

## chunk 2
1. 재입국허가를 받고 일시 출국하였다가 그 허가기간 내에 다시 입국하려는 경우 
 
 2. 복수사증 소지자나 재입국허가 면제대상 국가의 국민으로서 일시 출국하였다가 허가된 체류기간 내에 다시 입국하려는 경우 
 
 3. 난민여행증명서를 발급받고 일시 출국하였다가 그 유효기간 내에 다시 입국하려는 경우 
 
 ② 제31조 에 따라 등록을 한 외국인이 국민이 되거나 사망한 경우 또는 제31조 제1항 각 호의 어느 하나에 해당하게 된 경우( 같은 조 제2항 에 따라 외국인등록을 한 경우는 제외한다)에는 대통령령 으로 정하는 바에 따라 외국인등록증을 반납하여야 한다.   <개정 2016. 3. 29.> 
 
 ③ 지방출입국ㆍ외국인관서의 장은 제1항이나 제2항에 따라 외국인등록증을 반납받으면 대통령령 으로 정하는 바에 따라 그 사실을 지체 없이 체류지의 시ㆍ군ㆍ구 및 읍ㆍ면ㆍ동의 장에게 통보하여야 한다.   <개정 2014. 3. 18., 2018. 3. 20.> 
 
 ④ 지방출입국ㆍ외국인관서의 장은 대한민국의 이익을 위하여 필요하다고 인정하면 제1항 각 호의 어느 하나에 해당하는 외국인의 외국인등록증을 일시 보관할 수 있다.   <개정 2014. 3. 18.> 
 
 ⑤ 제4항의 경우 그 외국인이 허가된 기간 내에 다시 입국하였을 때에는 15일 이내에 지방출입국ㆍ외국인관서의 장으로부터 외국인등록증을 돌려받아야 하고, 그 허가받은 기간 내에 다시 입국하지 아니하였을 때에는 제1항에 따라 외국인등록증을 반납한 것으로 본다.   <개정 2014. 3. 18., 2020. 6. 9.> 
 
 [전문개정 2010. 5. 

---

## chunk 3
14.]

---

## chunk 4
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 5

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 6
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-016 immigration-act-biometric-information-duty__candidate__61979eaa2245

- 제목: [검토 후보] 출입국관리법 제38조 생체정보의 제공 등
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0038&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-biometric-information-duty
- supersededBy: 없음
- chunkCount: 6
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 73658
- extractedChars: 3703
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제38조 생체정보의 제공 등
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0038&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: biometric_information, fingerprints, face, alien_registration, domestic_residence_report, extension_denial
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: e1fc86e3be3899b2c6862dc9b2cd2588fc71667a80b94f6d74e9fff53d6298ec
byte_length: 73658
extracted_chars: 3703

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제38조(생체정보의 제공 등) ① 다음 각 호의 어느 하나에 해당하는 외국인은 법무부령 으로 정하는 바에 따라 생체정보를 제공하여야 한다.   <개정 2016. 3. 29., 2020. 6. 9.>

---

## chunk 2
1. 다음 각 목의 어느 하나에 해당하는 사람으로서 17세 이상인 사람 
 
 가. 제31조 에 따라 외국인등록을 하여야 하는 사람( 같은 조 제2항 에 따라 외국인등록을 하려는 사람은 제외한다) 
 
 나. 「재외동포의 출입국과 법적 지위에 관한 법률」 제6조 에 따라 국내거소신고를 하려는 사람 
 
 2. 이 법을 위반하여 조사를 받거나 그 밖에 다른 법률을 위반하여 수사를 받고 있는 사람 
 
 3. 신원이 확실하지 아니한 사람 
 
 4. 제1호부터 제3호까지에서 규정한 사람 외에 법무부장관이 대한민국의 안전이나 이익 또는 해당 외국인의 안전이나 이익을 위하여 특히 필요하다고 인정하는 사람 
 
 ② 지방출입국ㆍ외국인관서의 장은 제1항에 따른 생체정보의 제공을 거부하는 외국인에게는 체류기간 연장허가 등 이 법에 따른 허가를 하지 아니할 수 있다.   <개정 2014. 3. 18., 2020. 6. 9.> 
 
 ③ 법무부장관은 제1항에 따라 제공받은 생체정보를 「개인정보 보호법」 에 따라 보유하고 관리한다.   <개정 2011. 3. 29., 2020. 6. 9.> 
 
 [전문개정 2010. 5. 14.]
[제목개정 2020. 6. 9.]

---

## chunk 3
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 4

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 5
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-017 immigration-act-departure-inspection__candidate__98c9bf0ccdaf

- 제목: [검토 후보] 출입국관리법 제28조 출국심사
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0028&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-departure-inspection
- supersededBy: 없음
- chunkCount: 6
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 73594
- extractedChars: 3433
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제28조 출국심사
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0028&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: departure_inspection, valid_passport, forged_passport, biometric_departure, departure_port
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 6f0b9ca2c16273028577c7e43758d47ebed86dfcaa38284c9ca2facb855a5540
byte_length: 73594
extracted_chars: 3433

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제28조(출국심사) ① 외국인이 출국할 때에는 유효한 여권을 가지고 출국하는 출입국항에서 출입국관리공무원의 출국심사를 받아야 한다.

---

## chunk 2
② 제1항의 경우에 출입국항이 아닌 장소에서의 출국심사에 관하여는 제3조 제1항 단서를 준용한다. 
 
 ③ 제1항과 제2항의 경우에 위조되거나 변조된 외국인의 여권ㆍ선원신분증명서에 관하여는 제5조 를 준용한다.   <개정 2014. 12. 30.> 
 
 ④ 제1항과 제2항의 경우에 선박등의 출입에 관하여는 제12조 제6항 을 준용한다. 
 
 ⑤ 외국인의 출국심사에 관하여는 제3조 제2항 을 준용한다. 
 
 ⑥ 출입국관리공무원은 제12조의2 제1항 또는 제3항 에 따라 제공 또는 제출받은 생체정보를 출국심사에 활용할 수 있다.   <신설 2016. 3. 29., 2020. 6. 9.> 
 
 [전문개정 2010. 5. 14.]

---

## chunk 3
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 4

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 5
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-018 immigration-act-departure-recommendation-order__candidate__e5dfb4ec5cf6

- 제목: [검토 후보] 출입국관리법 제67조·제68조 출국권고·출국명령
- sourceUrl: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
- sourceType: official_law
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-departure-recommendation-order
- supersededBy: 없음
- chunkCount: 7
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 145569
- extractedChars: 4163
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제67조·제68조 출국권고·출국명령
source_url: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
source_type: official_law
topic: warning
legal_priority: 1
monitor_cadence: daily
change_signals: departure_recommendation, departure_order, departure_deadline, performance_bond, deportation_order
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: ddad46e3ea686a334009e39fb01690685ed1e2dd6fa22cd50099768853cc0092
byte_length: 145569
extracted_chars: 4163

---

## chunk 1
법령 > 본문 > 출입국관리법 | 국가법령정보센터 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령
 
 - 출입국관리법 
 
 (신구법 비교는 공포단위 서비스입니다) 
 
 
 
 
 
 
 신구법비교 
 국가법령정보센터에서 제공하는 신구법
비교는 시스템으로 자동 생성한 것으로
참고용으로만 이용하시기 바라며, 정확한
개정내용의 확인은 제·개정이유(제·개정문)
또는 관보를 확인해 주세요. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 출입국관리법 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 본문목록열림 본문 
 
 
 
 부칙목록열림 부칙 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문 
 제정·개정이유 
 별표·서식 
 연혁 
 3단비교 
 신구법비교 
 법령체계도 
 시행일/공포 서비스개선 : 시행,연혁(ancYnChk: 0=시행, 1=공포) 파라미터 추가 --> 
 법령비교 
 생활법령정보 
 조례위임조문 
 위임조례 
 한눈보기 
 원문다운로드 
 음성지원 
 점자뷰어 
 
 
 
 
 
 
 
 
 
 
 
 조문 선택 조문선택 
 화면내검색 
 새창 선택 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 조례위임조문 
 법령에서 자치법규로 위임한

---

## chunk 2
 사항이 있는
 조문의 목록을 제공하고 바로가기 기능을
 제공합니다. 
 
 
 
 위임조례 
 현재 보고있는 법에서 위임한 사항이 있는 자치법규에 대한 자치법규를 검색하여 목록을 제공합니다. 
 
 
 
 한눈에 이해되는 법령정보 
 법령 속 어려운 내용을 그림이나 표로 표현하여 알기 쉽게 제공합니다. 한눈보기는 법제처에서 제공하는 가공된 법령정보로 법령 그 자체는 아닙니다. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 | 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 

---

## chunk 3
TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 

---

## chunk 4
닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 


---

## chunk 5
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 용지/폰트설정 
 
 
 범위설정 
 
 
 
 
 
 
 일부범위입력 
 
 
 
 시행령 연계 데이터를 보려면 전체를 선택해주세요 
 
 
 
 
 
 법령본문 
 
 
 
 
 전체 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 HWP파일 
 
 
 
 
 EXCEL파일 
 
 
 
 
 PDF파일 
 
 
 
 
 DOC파일 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

---

## chunk 6

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위임행정규칙 
 법률·대통령령·총리령·부령 등 상위법령에서 위임한 사항을
 훈령·예규·고시·공고 등의 형식으로 정하고 있는 행정규칙을 말합니다. 
 
 
 
 
 
 
 닫기
```

---

## A1B-019 immigration-act-departure-suspension__candidate__54514553018e

- 제목: [검토 후보] 출입국관리법 제29조 외국인 출국의 정지
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0029&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-departure-suspension
- supersededBy: 없음
- chunkCount: 5
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 72232
- extractedChars: 3239
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제29조 외국인 출국의 정지
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0029&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: warning
legal_priority: 1
monitor_cadence: daily
change_signals: departure_suspension, departure_ban, objection, criminal_case, tax_arrears
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 6fa51ae77b2796d3f3ae8e7f63de0978dcacdd00223c78ac4165928a674ec452
byte_length: 72232
extracted_chars: 3239

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제29조(외국인 출국의 정지) ① 법무부장관은 제4조 제1항 또는 제2항 각 호의 어느 하나에 해당하는 외국인에 대하여는 출국을 정지할 수 있다.   <개정 2011. 7. 18.>

② 제1항의 경우에 제4조 제3항부터 제5항 까지와 제4조의2부터 제4조의5 까지의 규정을 준용한다. 이 경우 “출국금지”는 “출국정지”로 본다.   <개정 2011. 7. 18., 2018. 3. 20.> 
 
 [전문개정 2010. 5. 14.]

---

## chunk 2
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 3

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 4
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-020 immigration-act-deportation-detention__candidate__e519bf52b608

- 제목: [검토 후보] 출입국관리법 제63조 강제퇴거명령을 받은 사람의 보호
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0063&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-deportation-detention
- supersededBy: 없음
- chunkCount: 7
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 76822
- extractedChars: 4514
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제63조 강제퇴거명령을 받은 사람의 보호
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0063&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: warning
legal_priority: 1
monitor_cadence: daily
change_signals: deportation_detention, protection_facility, 2_months, 9_months, 20_months, foreigners_protection_committee
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 077e8b25baf24e7720aaad1c781d559464cd75161857f90683c3e649a37d6120
byte_length: 76822
extracted_chars: 4514

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제63조(강제퇴거명령을 받은 사람의 보호) ① 지방출입국ㆍ외국인관서의 장은 강제퇴거명령을 받은 사람이 여권을 소지하지 아니하였거나 교통편이 확보되지 아니하는 등의 사유로 그 사람을 즉시 대한민국 밖으로 송환할 수 없는 경우에는 2개월의 범위에서 그 사람을 송환할 수 있을 때까지 보호시설에 보호할 수 있다.

---

## chunk 2
② 지방출입국ㆍ외국인관서의 장은 제1항에 해당하는 사람이 송환에 협조하지 아니하는 등의 사유로 2개월이 지난 후에도 송환할 수 없는 경우에는 매 3개월의 범위에서 미리 외국인보호위원회의 보호기간 연장 승인을 받아 그 사람을 송환할 수 있을 때까지 보호기간을 연장할 수 있으며, 이 경우 연장기간을 포함한 총 보호기간은 9개월을 넘을 수 없다. 다만, 송환하려는 사람을 9개월이 지난 후에도 송환할 수 없는 경우로서 다음 각 호의 어느 하나에 해당하는 경우에는 매 3개월의 범위에서 미리 외국인보호위원회의 보호기간 연장 승인을 받아 그 사람을 송환할 수 있을 때까지 보호기간을 연장할 수 있으며, 이 경우 연장기간을 포함한 총 보호기간은 20개월을 넘을 수 없다. 
 
 1. 송환하려는 사람이 강제퇴거명령을 받은 이후에 「난민법」 에 따라 난민인정 신청을 하거나 「난민법」 에 따른 법무부장관 또는 지방출입국ㆍ외국인관서의 장의 결정에 대하여 소송을 제기하여 송환 절차가 지연된 경우 
 
 2. 송환하려는 사람이 다음 각 목의 어느 하나에 해당하는 경우 
 
 가. 「국가보안법」 에 규정된 죄를 범한 사람 
 
 나. 「국민보호와 공공안전을 위한 테러방지법」 에 규정된 죄를 범한 사람 
 
 다. 「공중 등 협박목적 및 대량살상무기확산을 위한 자금조달행위의 금지에 관한 법률」 에 규정된 죄를 범한 사람 
 
 라. 「형법」 제2편제1장 내란의 죄, 제2장 외환의 죄, 제4장 국교에 관한 죄 또는 제5장 공안을 해하는 죄를 범한 사람 
 
 마. 그 밖에 공공질서나 국민의 안전을 해치는 범죄로서 살인, 상해, 강간, 추행,

---

## chunk 3
 강도 등 대통령령 으로 정하는 범죄를 범하여 금고 이상의 형을 선고받은 사람 
 
 ③ 외국인보호위원회는 제2항에 따른 보호기간 연장 승인 신청을 심사하는 경우에는 송환의 가능성, 보호의 필요성, 송환국의 협조 여부 등을 고려하여야 하며, 보호기간 연장을 승인하는 경우에는 피보호자의 송환을 위하여 필요한 최소한의 기간으로 연장기간을 정하여야 한다. 
 
 ④ 법무부장관은 제1항 및 제2항에 따른 피보호자의 송환업무 등을 위하여 필요하다고 인정하는 경우 법무부령 으로 정하는 바에 따라 피보호자를 다른 보호시설로 이송하도록 지방출입국ㆍ외국인관서의 장에게 명할 수 있다. 
 
 ⑤ 제1항에 따른 보호에 관하여는 제53조부터 제55조 까지, 제56조의2부터 제56조의9 까지 및 제57조 를 준용하고, 제2항에 따른 보호에 관하여는 제56조의2부터 제56조의9 까지 및 제57조 를 준용한다. 
 
 [전문개정 2025. 3. 18.]
[2025. 3. 18. 법률 제20794호에 의하여 2023. 3. 23. 헌법재판소에서 헌법불합치 결정된 이 조를 개정함.]

---

## chunk 4
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 5

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 6
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-021 immigration-act-deportation-grounds__candidate__460fedb60049

- 제목: [검토 후보] 출입국관리법 제46조 강제퇴거의 대상자
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0046&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-deportation-grounds
- supersededBy: 없음
- chunkCount: 7
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 81678
- extractedChars: 4413
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제46조 강제퇴거의 대상자
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0046&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: warning
legal_priority: 1
monitor_cadence: daily
change_signals: deportation, removal, unauthorized_work, false_documents, alien_registration_violation, f5_exception
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 11d453059fefb2a908e3e470e06c60c9ece9affb4970b9aa3b73bde32e34264f
byte_length: 81678
extracted_chars: 4413

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제46조(강제퇴거의 대상자) ① 지방출입국ㆍ외국인관서의 장은 이 장에 규정된 절차에 따라 다음 각 호의 어느 하나에 해당하는 외국인을 대한민국 밖으로 강제퇴거시킬 수 있다.   <개정 2012. 1. 26., 2014. 3. 18., 2016. 3. 29., 2018. 3. 20., 2021. 8. 17.>

---

## chunk 2
1. 제7조 를 위반한 사람 
 
 2. 제7조의2 를 위반한 외국인 또는 같은 조 에 규정된 허위초청 등의 행위로 입국한 외국인 
 
 3. 제11조 제1항 각 호의 어느 하나에 해당하는 입국금지 사유가 입국 후에 발견되거나 발생한 사람 
 
 4. 제12조 제1항 ㆍ제2항 또는 제12조의3 을 위반한 사람 
 
 5. 제13조 제2항 에 따라 지방출입국ㆍ외국인관서의 장이 붙인 허가조건을 위반한 사람 
 
 6. 제14조 제1항 , 제14조의2 제1항 , 제15조 제1항 , 제16조 제1항 또는 제16조의2 제1항 에 따른 허가를 받지 아니하고 상륙한 사람 
 
 7. 제14조 제3항 ( 제14조의2 제3항 에 따라 준용되는 경우를 포함한다), 제15조 제2항 , 제16조 제2항 또는 제16조의2 제2항 에 따라 지방출입국ㆍ외국인관서의 장 또는 출입국관리공무원이 붙인 허가조건을 위반한 사람 
 
 8. 제17조 제1항 ㆍ제2항, 제18조 , 제20조 , 제23조 , 제24조 또는 제25조 를 위반한 사람 
 
 9. 제21조 제1항 본문을 위반하여 허가를 받지 아니하고 근무처를 변경ㆍ추가하거나 같은 조 제2항 을 위반하여 외국인을 고용ㆍ알선한 사람 
 
 10. 제22조 에 따라 법무부장관이 정한 거소 또는 활동범위의 제한이나 그 밖의 준수사항을 위반한 사람 
 
 10의2. 제26조 를 위반한 외국인 
 
 11. 제28조 제1항 및 제2항 을 위반하여 출국하려고 한 사람 
 
 12. 제31조 에 따른 외국인등록 의무를 위반한 사람 
 
 12의2. 제33조의3 을 위반한 외국인 
 
 13. 금고 이상

---

## chunk 3
의 형을 선고받고 석방된 사람 
 
 14. 제76조의4 제1항 각 호의 어느 하나에 해당하는 사람 
 
 15. 그 밖에 제1호부터 제10호까지, 제10호의2, 제11호, 제12호, 제12호의2, 제13호 또는 제14호에 준하는 사람으로서 법무부령 으로 정하는 사람 
 
 ② 영주자격을 가진 사람은 제1항에도 불구하고 대한민국 밖으로 강제퇴거되지 아니한다. 다만, 다음 각 호의 어느 하나에 해당하는 사람은 그러하지 아니하다.   <개정 2018. 3. 20.> 
 
 1. 「형법」 제2편제1장 내란의 죄 또는 제2장 외환의 죄를 범한 사람 
 
 2. 5년 이상의 징역 또는 금고의 형을 선고받고 석방된 사람 중 법무부령 으로 정하는 사람 
 
 3. 제12조의3 제1항 또는 제2항 을 위반하거나 이를 교사(敎唆) 또는 방조(幇助)한 사람 
 
 [전문개정 2010. 5. 14.]

---

## chunk 4
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 5

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 6
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-022 immigration-act-deportation-objection__candidate__8bec0621fb38

- 제목: [검토 후보] 출입국관리법 제60조 강제퇴거명령 이의신청
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0060&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-deportation-objection
- supersededBy: 없음
- chunkCount: 6
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 72486
- extractedChars: 3586
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제60조 강제퇴거명령 이의신청
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0060&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: warning
legal_priority: 1
monitor_cadence: daily
change_signals: deportation_objection, 7_days, minister_of_justice, release_from_detention, investigation_records
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 338810ae25e784b7ba4f5eeebf98a3a13169103dd3bbec206d78e2fa7ba2e839
byte_length: 72486
extracted_chars: 3586

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제60조(이의신청) ① 용의자는 강제퇴거명령에 대하여 이의신청을 하려면 강제퇴거명령서를 받은 날부터 7일 이내에 지방출입국ㆍ외국인관서의 장을 거쳐 법무부장관에게 이의신청서를 제출하여야 한다.   <개정 2014. 3. 18.>

---

## chunk 2
② 지방출입국ㆍ외국인관서의 장은 제1항에 따른 이의신청서를 접수하면 심사결정서와 조사기록을 첨부하여 법무부장관에게 제출하여야 한다.   <개정 2014. 3. 18.> 
 
 ③ 법무부장관은 제1항과 제2항에 따른 이의신청서 등을 접수하면 이의신청이 이유 있는지를 심사결정하여 그 결과를 지방출입국ㆍ외국인관서의 장에게 알려야 한다.   <개정 2014. 3. 18.> 
 
 ④ 지방출입국ㆍ외국인관서의 장은 법무부장관으로부터 이의신청이 이유 있다는 결정을 통지받으면 지체 없이 용의자에게 그 사실을 알리고, 용의자가 보호되어 있으면 즉시 그 보호를 해제하여야 한다.   <개정 2014. 3. 18.> 
 
 ⑤ 지방출입국ㆍ외국인관서의 장은 법무부장관으로부터 이의신청이 이유 없다는 결정을 통지받으면 지체 없이 용의자에게 그 사실을 알려야 한다.   <개정 2014. 3. 18.> 
 
 [전문개정 2010. 5. 14.]

---

## chunk 3
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 4

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 5
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-023 immigration-act-detention-order__candidate__c4993f3e709e

- 제목: [검토 후보] 출입국관리법 제51조 보호명령서·긴급보호
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0051&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-detention-order
- supersededBy: 없음
- chunkCount: 6
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 72996
- extractedChars: 3602
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제51조 보호명령서·긴급보호
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0051&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: warning
legal_priority: 1
monitor_cadence: daily
change_signals: protection_order, emergency_protection, 48_hours, risk_of_flight, release_if_no_order
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 8cb6d88612a7cc69b7f7368b1d31856809450ee65bd962f25a8099a0b8d356f5
byte_length: 72996
extracted_chars: 3602

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제51조(보호) ① 출입국관리공무원은 외국인이 제46조 제1항 각 호의 어느 하나에 해당된다고 의심할 만한 상당한 이유가 있고 도주하거나 도주할 염려가 있으면 지방출입국ㆍ외국인관서의 장으로부터 보호명령서를 발급받아 그 외국인을 보호할 수 있다.   <개정 2014. 3. 18.>

---

## chunk 2
② 제1항에 따른 보호명령서의 발급을 신청할 때에는 보호의 필요성을 인정할 수 있는 자료를 첨부하여 제출하여야 한다. 
 
 ③ 출입국관리공무원은 외국인이 제46조 제1항 각 호의 어느 하나에 해당된다고 의심할 만한 상당한 이유가 있고 도주하거나 도주할 염려가 있는 긴급한 경우에 지방출입국ㆍ외국인관서의 장으로부터 보호명령서를 발급받을 여유가 없을 때에는 그 사유를 알리고 긴급히 보호할 수 있다.   <개정 2014. 3. 18.> 
 
 ④ 출입국관리공무원은 제3항에 따라 외국인을 긴급히 보호하면 즉시 긴급보호서를 작성하여 그 외국인에게 내보여야 한다. 
 
 ⑤ 출입국관리공무원은 제3항에 따라 외국인을 보호한 경우에는 48시간 이내에 보호명령서를 발급받아 외국인에게 내보여야 하며, 보호명령서를 발급받지 못한 경우에는 즉시 보호를 해제하여야 한다. 
 
 [전문개정 2010. 5. 14.]

---

## chunk 3
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 4

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 5
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-024 immigration-act-detention-temporary-release__candidate__a362d5e76848

- 제목: [검토 후보] 출입국관리법 제65조 보호의 일시해제
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0065&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-detention-temporary-release
- supersededBy: 없음
- chunkCount: 6
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 72157
- extractedChars: 3449
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제65조 보호의 일시해제
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0065&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: warning
legal_priority: 1
monitor_cadence: daily
change_signals: temporary_release, bond, 20_million_won, residence_restriction, regular_reporting, foreigners_protection_committee
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 6694cc04db65ff39daf85b46ead26857ffeb76ed42132e28320cd0c2c337ade2
byte_length: 72157
extracted_chars: 3449

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제65조(보호의 일시해제) ① 지방출입국ㆍ외국인관서의 장은 직권으로 피보호자의 정상(情狀), 해제요청 사유, 자산 및 그 밖의 사항을 고려하여 2천만원 이하의 보증금을 예치시키고 주거의 제한, 정기 보고, 신원보증인의 지정 등 그 밖에 필요한 조건을 붙여 보호를 일시해제할 수 있다.

---

## chunk 2
② 외국인보호위원회는 피보호자(피보호자의 보증인 또는 법정대리인등을 포함한다)의 신청을 받아 피보호자에 대한 보호의 일시해제를 결정할 수 있다. 
 
 ③ 지방출입국ㆍ외국인관서의 장은 피보호자가 제2항에 따라 보호의 일시해제 결정을 받으면 그의 보호를 일시해제하여야 한다. 이 경우 보증금의 예치 및 주거의 제한 등 조건의 부가에 관하여는 제1항을 준용한다. 
 
 ④ 제1항부터 제3항까지에 따른 보호의 일시해제 신청, 보증금의 예치 및 반환 등의 절차는 대통령령 으로 정한다. 
 
 [전문개정 2025. 3. 18.]

---

## chunk 3
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 4

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 5
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-025 immigration-act-emergency-extension-special__candidate__c6c1dc6a8051

- 제목: [검토 후보] 출입국관리법 제25조의5 국가비상사태 등 체류기간 연장 특칙
- sourceUrl: https://www.law.go.kr/LSW/lsRvsDocListP.do?chrClsCd=010202&lsId=001707&lsRvsGubun=all
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-emergency-extension-special
- supersededBy: 없음
- chunkCount: 123
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 413086
- extractedChars: 151836
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제25조의5 국가비상사태 등 체류기간 연장 특칙
source_url: https://www.law.go.kr/LSW/lsRvsDocListP.do?chrClsCd=010202&lsId=001707&lsRvsGubun=all
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: national_emergency, border_closure, flight_suspension, extension_by_office, no_fault_departure_limit
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 2c562b5c7ad50903a1732c2ce755df0bb889a57fb4d107ea8e4008c08e440872
byte_length: 413086
extracted_chars: 151836

---

## chunk 1
국가법령정보센터 
 
 
 
 
 
 
 
 
 
 
 
 
 제정·개정문 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 출입국관리법 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 【제정·개정문】 
 
 
 
 
 국회에서 의결된 출입국관리법 일부개정법률을 이에 공포한다. 
          대통령        이재명 (인) 
    2025년 7월 22일 
          국무총리        김민석 
          국무위원 법무부 장관        정성호 
 
⊙법률 제20992호 
출입국관리법 일부개정법률 
 
출입국관리법 일부를 다음과 같이 개정한다. 
 
제19조의5를 다음과 같이 신설한다. 
제19조의5(계절근로 프로그램 등) ① 법무부장관은 계절적 특성이 있는 농ㆍ어업 등 분야에서 취업활동을 하려는 외국인(이하 "계절근로자"라 한다)의 도입ㆍ체류 등을 관리 및 지원하기 위하여 계절근로 프로그램(이하 "계절근로 프로그램"이라 한다)을 시행할 수 있다. 
  ② 계절근로 프로그램의 기본계획, 계절근로자 취업가능 업종 및 도입규모 등 결정에 관한 법무부장관의 자문에 응하기 위하여 법무부장관 소속으로 계절근로 정책협의회(이하 "정책협의회"라 한다)를 둔다. 
  ③ 법무부장관은 계절근로 프로그램을 효과적으로 시행하기 위하여 관계 중앙행정기관의 장의 의견을 들어 법무부령으로 정하는 바에 따라 전문인력 및 시설 등을 갖춘 기관, 법인 또는 단체를 계절근로 전문기관(이하 "전

---

## chunk 2
문기관"이라 한다)으로 지정ㆍ운영할 수 있다. 
  ④ 전문기관은 다음 각 호의 업무를 수행한다. 
  1. 지방자치단체가 수행하는 외국 정부 또는 외국 지방자치단체와의 계절근로자 도입 관련 업무협약(MOU) 체결 지원에 관한 사항 
  2. 계절근로자의 선발ㆍ입국ㆍ교육ㆍ통역ㆍ체류ㆍ출국 지원 등에 관한 사항 
  3. 그 밖에 계절근로 프로그램의 효과적인 운영을 위하여 법무부장관이 필요하다고 인정한 사항 
  ⑤ 국가와 지방자치단체는 예산의 범위에서 전문기관의 운영에 필요한 비용의 전부 또는 일부를 지원할 수 있다. 
  ⑥ 법무부장관은 계절근로 프로그램을 효과적으로 운영하기 위하여 정보통신망을 설치ㆍ운영할 수 있고, 정보통신망의 설치ㆍ운영에 관하여 필요한 사항은 법무부장관이 정한다. 
  ⑦ 법무부장관은 전문기관이 다음 각 호의 어느 하나에 해당하는 경우에는 법무부령으로 정하는 바에 따라 지정을 취소하거나 6개월 이내의 기간을 정하여 업무정지를 명할 수 있다. 다만, 제1호에 해당하는 경우에는 지정을 취소하여야 한다. 
  1. 거짓이나 그 밖의 부정한 방법으로 지정을 받은 경우 
  2. 정당한 사유 없이 1년 이상 계속하여 제4항의 업무를 수행하지 아니한 경우 
  3. 제3항에 따른 지정기준에 적합하지 아니하게 된 경우 
  ⑧ 법무부장관은 제7항에 따라 지정을 취소하거나 업무정지를 명하려면 청문을 하여야 한다. 
  ⑨ 국가, 지방자치단체 및 제3항에 따른 전문기관을 제외하고는 누구든지 계절근로자의 선발, 알선 및 채용에 개입하여서는 아니 된다. 
  ⑩ 제2항에 따른 정책협의회의 구성 및 운영, 제

---

## chunk 3
3항에 따른 전문기관의 지정기준 및 절차, 제7항에 따른 처분의 세부기준 및 그 밖에 필요한 사항은 법무부령으로 정한다. 
 
제94조에 제11호의2를 다음과 같이 신설한다. 
  11의2. 제19조의5제9항을 위반하여 계절근로자의 선발, 알선 및 채용에 개입하는 행위를 한 사람 
 
제99조의3에 제2호의3을 다음과 같이 신설한다. 
  2의3. 제94조제11호의2의 위반행위 
 
          부칙 
이 법은 공포 후 6개월이 경과한 날부터 시행한다.

---

## chunk 4
출입국관리법 
 
 
 
 [시행 2025. 6. 1.] [법률 제20794호, 2025. 3. 18., 일부개정] 
 
 
 【제정·개정문】 
 
 
 
 
 국회에서 의결된 출입국관리법 일부개정법률을 이에 공포한다. 
          대통령 권한대행 국무위원 부총리 겸 기획재정부 장관        최상목 (인) 
    2025년 3월 18일 
          국무총리 직무대행 국무위원 부총리 겸 기획재정부 장관        최상목 
          국무위원 법무부 장관         
 
⊙법률 제20794호 
출입국관리법 일부개정법률 
 
출입국관리법 일부를 다음과 같이 개정한다. 
 
제4조제1항제6호를 제7호로 하고, 같은 항에 제6호를 다음과 같이 신설하며, 같은 항 제7호(종전의 제6호) 중 "제5호"를 "제6호"로 한다. 
  6. 「근로기준법」 제43조의2에 따라 명단이 공개된 체불사업주 
 
제46조의2 중 "주거의 제한"을 "주거의 제한, 정기 보고, 신원보증인의 지정 등"으로 한다. 
 
제55조를 다음과 같이 한다. 
제55조(보호에 대한 심사청구) ① 보호명령서에 따라 보호된 사람이나 그의 법정대리인등은 보호에 대하여 이의가 있는 경우에는 지방출입국ㆍ외국인관서의 장을 거쳐 제66조의4에 따른 외국인보호위원회(이하 "외국인보호위원회"라 한다)에 보호에 대한 심사를 청구할 수 있다. 
  ② 외국인보호위원회는 제1항에 따른 심사청구를 받으면 지체 없이 관계 서류를 심사하여 그 청구가 이유 없는 경우에는 기각하는 결정을 하고, 그 청구가 이유 있는 경우에는 보호된 사람을 보호해제하는

---

## chunk 5
 결정을 한다. 
 
제56조의9의 제목 "(이의신청 절차 등의 게시)"를 "(심사청구 절차 등의 게시)"로 하고, 같은 조 중 "이의신청"을 "심사청구"로 한다. 
 
제63조를 다음과 같이 한다. 
제63조(강제퇴거명령을 받은 사람의 보호) ① 지방출입국ㆍ외국인관서의 장은 강제퇴거명령을 받은 사람이 여권을 소지하지 아니하였거나 교통편이 확보되지 아니하는 등의 사유로 그 사람을 즉시 대한민국 밖으로 송환할 수 없는 경우에는 2개월의 범위에서 그 사람을 송환할 수 있을 때까지 보호시설에 보호할 수 있다. 
  ② 지방출입국ㆍ외국인관서의 장은 제1항에 해당하는 사람이 송환에 협조하지 아니하는 등의 사유로 2개월이 지난 후에도 송환할 수 없는 경우에는 매 3개월의 범위에서 미리 외국인보호위원회의 보호기간 연장 승인을 받아 그 사람을 송환할 수 있을 때까지 보호기간을 연장할 수 있으며, 이 경우 연장기간을 포함한 총 보호기간은 9개월을 넘을 수 없다. 다만, 송환하려는 사람을 9개월이 지난 후에도 송환할 수 없는 경우로서 다음 각 호의 어느 하나에 해당하는 경우에는 매 3개월의 범위에서 미리 외국인보호위원회의 보호기간 연장 승인을 받아 그 사람을 송환할 수 있을 때까지 보호기간을 연장할 수 있으며, 이 경우 연장기간을 포함한 총 보호기간은 20개월을 넘을 수 없다. 
  1. 송환하려는 사람이 강제퇴거명령을 받은 이후에 「난민법」에 따라 난민인정 신청을 하거나 「난민법」에 따른 법무부장관 또는 지방출입국ㆍ외국인관서의 장의 결정에 대하여 소송을 제기하여 송환 절차가 지연된 경우 
  2. 송환하려는 사람이 다음 각 

---

## chunk 6
목의 어느 하나에 해당하는 경우 
    가. 「국가보안법」에 규정된 죄를 범한 사람 
    나. 「국민보호와 공공안전을 위한 테러방지법」에 규정된 죄를 범한 사람 
    다. 「공중 등 협박목적 및 대량살상무기확산을 위한 자금조달행위의 금지에 관한 법률」에 규정된 죄를 범한 사람 
    라. 「형법」 제2편제1장 내란의 죄, 제2장 외환의 죄, 제4장 국교에 관한 죄 또는 제5장 공안을 해하는 죄를 범한 사람 
    마. 그 밖에 공공질서나 국민의 안전을 해치는 범죄로서 살인, 상해, 강간, 추행, 강도 등 대통령령으로 정하는 범죄를 범하여 금고 이상의 형을 선고받은 사람 
  ③ 외국인보호위원회는 제2항에 따른 보호기간 연장 승인 신청을 심사하는 경우에는 송환의 가능성, 보호의 필요성, 송환국의 협조 여부 등을 고려하여야 하며, 보호기간 연장을 승인하는 경우에는 피보호자의 송환을 위하여 필요한 최소한의 기간으로 연장기간을 정하여야 한다. 
  ④ 법무부장관은 제1항 및 제2항에 따른 피보호자의 송환업무 등을 위하여 필요하다고 인정하는 경우 법무부령으로 정하는 바에 따라 피보호자를 다른 보호시설로 이송하도록 지방출입국ㆍ외국인관서의 장에게 명할 수 있다. 
  ⑤ 제1항에 따른 보호에 관하여는 제53조부터 제55조까지, 제56조의2부터 제56조의9까지 및 제57조를 준용하고, 제2항에 따른 보호에 관하여는 제56조의2부터 제56조의9까지 및 제57조를 준용한다. 
 
제63조의2 및 제63조의3을 각각 다음과 같이 신설한다. 
제63조의2(강제퇴거명령을 받은 사람의 보호해제) ① 지방출입국ㆍ외국인관서의

---

## chunk 7
 장은 제63조제1항 및 제2항에 따른 보호기간의 상한을 넘은 경우 즉시 보호를 해제하여야 한다. 
  ② 지방출입국ㆍ외국인관서의 장은 제63조제2항에 따른 외국인보호위원회의 보호기간 연장 승인을 받지 못한 경우 지체 없이 보호를 해제하여야 한다. 
  ③ 지방출입국ㆍ외국인관서의 장은 다른 국가가 강제퇴거명령을 받은 사람의 입국을 거부하는 등 제63조에 따른 피보호자를 명백히 송환할 수 없게 된 경우 보호를 해제할 수 있다. 
  ④ 지방출입국ㆍ외국인관서의 장은 제1항부터 제3항까지에 따라 보호를 해제하는 경우 주거의 제한, 정기 보고, 신원보증인의 지정, 보증금의 납부 등 그 밖에 필요한 조건을 붙일 수 있다. 
제63조의3(보호해제된 사람의 재보호) ① 지방출입국ㆍ외국인관서의 장은 제63조의2 및 이 조 제2항에 따라 보호해제된 사람이 다음 각 호의 어느 하나에 해당하는 경우에는 그 사람을 다시 보호(이하 "재보호"라 한다)할 수 있다. 
  1. 도주한 경우 
  2. 강제퇴거명령을 받은 사유가 아닌 다른 사유로 제46조제1항 각 호의 어느 하나에 해당함이 밝혀졌거나, 제46조제1항 각 호의 어느 하나에 해당하게 된 경우 
  3. 제63조의2제4항에 따라 보호를 해제할 때 붙인 조건을 위반한 경우 
  ② 제1항에 따른 재보호 및 그 보호해제 등에 관하여는 제53조부터 제55조까지, 제56조의2부터 제56조의9까지, 제57조, 제63조(제5항은 제외한다) 및 제63조의2를 준용한다. 
  ③ 제2항에 따라 재보호기간을 계산할 때에는 종전에 제63조에 따라 보호한 기간 및 종전에 제1항에 따라 재보호한 
```

---

## A1B-026 immigration-act-employer-reporting-duty__candidate__04f917b02012

- 제목: [검토 후보] 출입국관리법 제19조 외국인을 고용한 자 등의 신고의무
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0019&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-employer-reporting-duty
- supersededBy: 없음
- chunkCount: 6
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 74320
- extractedChars: 3674
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제19조 외국인을 고용한 자 등의 신고의무
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0019&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: employer_report, 15_days, dismissal, resignation, disappearance, employment_contract_change, e7
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 7b05d407f44740313020bda545e81673038c894787c09b201febf5e7eafb75c2
byte_length: 74320
extracted_chars: 3674

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제19조(외국인을 고용한 자 등의 신고의무) ① 제18조 제1항 에 따라 취업활동을 할 수 있는 체류자격을 가지고 있는 외국인을 고용한 자는 다음 각 호의 어느 하나에 해당하는 사유가 발생하면 대통령령 으로 정하는 바에 따라 15일 이내에 지방출입국ㆍ외국인관서의 장에게 신고하여야 한다.   <개정 2014. 3. 18., 2020. 6. 9.>

---

## chunk 2
1. 외국인을 해고하거나 외국인이 퇴직 또는 사망한 경우 
 
 2. 고용된 외국인의 소재를 알 수 없게 된 경우 
 
 3. 고용계약의 중요한 내용을 변경한 경우 
 
 ② 제19조의2 에 따라 외국인에게 산업기술을 연수시키는 업체의 장에 대하여는 제1항을 준용한다. 
 
 ③ 「외국인근로자의 고용 등에 관한 법률」 의 적용을 받는 외국인을 고용한 자가 제1항에 따른 신고를 한 경우 그 신고사실이 같은 법 제17조 제1항 에 따른 신고사유에 해당하는 때에는 같은 항에 따른 신고를 한 것으로 본다.   <신설 2014. 10. 15.> 
 
 ④ 제1항에 따라 신고를 받은 지방출입국ㆍ외국인관서의 장은 그 신고사실이 제3항에 해당하는 경우 지체 없이 외국인을 고용한 자의 소재지를 관할하는 「직업안정법」 제2조의2 제1호 에 따른 직업안정기관의 장에게 통보하여야 한다.   <신설 2014. 10. 15.> 
 
 [전문개정 2010. 5. 14.]

---

## chunk 3
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 4

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 5
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-027 immigration-act-employment-restriction__candidate__81483070ee8c

- 제목: [검토 후보] 출입국관리법 제18조 외국인 고용의 제한
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0018&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-employment-restriction
- supersededBy: 없음
- chunkCount: 5
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 72216
- extractedChars: 3353
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제18조 외국인 고용의 제한
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0018&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: warning
legal_priority: 1
monitor_cadence: daily
change_signals: employment_restriction, work_status, designated_workplace, employer_ban
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: cce703052574fc8ddbf1a497df58767895dfe01205ef74769e4fd8259050ae5a
byte_length: 72216
extracted_chars: 3353

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제18조(외국인 고용의 제한) ① 외국인이 대한민국에서 취업하려면 대통령령 으로 정하는 바에 따라 취업활동을 할 수 있는 체류자격을 받아야 한다.

② 제1항에 따른 체류자격을 가진 외국인은 지정된 근무처가 아닌 곳에서 근무하여서는 아니 된다. 
 
 ③ 누구든지 제1항에 따른 체류자격을 가지지 아니한 사람을 고용하여서는 아니 된다. 
 
 ④ 누구든지 제1항에 따른 체류자격을 가지지 아니한 사람의 고용을 알선하거나 권유하여서는 아니 된다. 
 
 ⑤ 누구든지 제1항에 따른 체류자격을 가지지 아니한 사람의 고용을 알선할 목적으로 그를 자기 지배하에 두는 행위를 하여서는 아니 된다. 
 
 [전문개정 2010. 5. 14.]

---

## chunk 2
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 3

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 4
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-028 immigration-act-entry-ban__candidate__4f0a6e128145

- 제목: [검토 후보] 출입국관리법 제11조 입국의 금지 등
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0011&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-entry-ban
- supersededBy: 없음
- chunkCount: 6
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 73430
- extractedChars: 3864
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제11조 입국의 금지 등
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0011&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: warning
legal_priority: 1
monitor_cadence: daily
change_signals: entry_ban, refusal_of_entry, public_safety, deportation_history, stay_cost
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 7efc53f81d218a3fb2198e230a16cd5c5ba9126d606c78fdc4e5a21c1dd6d60f
byte_length: 73430
extracted_chars: 3864

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제11조(입국의 금지 등) ① 법무부장관은 다음 각 호의 어느 하나에 해당하는 외국인에 대하여는 입국을 금지할 수 있다.   <개정 2015. 1. 6.>

---

## chunk 2
1. 감염병환자, 마약류중독자, 그 밖에 공중위생상 위해를 끼칠 염려가 있다고 인정되는 사람 
 
 2. 「총포ㆍ도검ㆍ화약류 등의 안전관리에 관한 법률」 에서 정하는 총포ㆍ도검ㆍ화약류 등을 위법하게 가지고 입국하려는 사람 
 
 3. 대한민국의 이익이나 공공의 안전을 해치는 행동을 할 염려가 있다고 인정할 만한 상당한 이유가 있는 사람 
 
 4. 경제질서 또는 사회질서를 해치거나 선량한 풍속을 해치는 행동을 할 염려가 있다고 인정할 만한 상당한 이유가 있는 사람 
 
 5. 사리 분별력이 없고 국내에서 체류활동을 보조할 사람이 없는 정신장애인, 국내체류비용을 부담할 능력이 없는 사람, 그 밖에 구호(救護)가 필요한 사람 
 
 6. 강제퇴거명령을 받고 출국한 후 5년이 지나지 아니한 사람 
 
 7. 1910년 8월 29일부터 1945년 8월 15일까지 사이에 다음 각 목의 어느 하나에 해당하는 정부의 지시를 받거나 그 정부와 연계하여 인종, 민족, 종교, 국적, 정치적 견해 등을 이유로 사람을 학살ㆍ학대하는 일에 관여한 사람 
 
 가. 일본 정부 
 
 나. 일본 정부와 동맹 관계에 있던 정부 
 
 다. 일본 정부의 우월한 힘이 미치던 정부 
 
 8. 제1호부터 제7호까지의 규정에 준하는 사람으로서 법무부장관이 그 입국이 적당하지 아니하다고 인정하는 사람 
 
 ② 법무부장관은 입국하려는 외국인의 본국(本國)이 제1항 각 호 외의 사유로 국민의 입국을 거부할 때에는 그와 동일한 사유로 그 외국인의 입국을 거부할 수 있다. 
 
 [전문개정 2010. 5. 14.]

---

## chunk 3
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 4

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 5
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-029 immigration-act-entry-inspection__candidate__0ec3a09c0f0f

- 제목: [검토 후보] 출입국관리법 제12조 입국심사
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0012&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-entry-inspection
- supersededBy: 없음
- chunkCount: 6
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 74539
- extractedChars: 3682
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제12조 입국심사
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0012&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: entry_inspection, valid_passport, visa, entry_purpose, k_eta, stay_period
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: d9e109f506979dda2ecc7ce819f5dfe3e3849a601e9fe5bfba915b86800e8769
byte_length: 74539
extracted_chars: 3682

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제12조(입국심사) ① 외국인이 입국하려는 경우에는 입국하는 출입국항에서 대통령령 으로 정하는 바에 따라 여권과 입국신고서를 출입국관리공무원에게 제출하여 입국심사를 받아야 한다.   <개정 2020. 6. 9.>

---

## chunk 2
② 제1항에 관하여는 제6조 제1항 단서 및 같은 조 제3항 을 준용한다. 
 
 ③ 출입국관리공무원은 입국심사를 할 때에 다음 각 호의 요건을 갖추었는지를 심사하여 입국을 허가한다.   <개정 2020. 2. 4.> 
 
 1. 여권과 사증이 유효할 것. 다만, 사증은 이 법에서 요구하는 경우만을 말한다. 
 
 1의2. 제7조의3 제2항 에 따른 사전여행허가서가 유효할 것 
 
 2. 입국목적이 체류자격에 맞을 것 
 
 3. 체류기간이 법무부령 으로 정하는 바에 따라 정하여졌을 것 
 
 4. 제11조 에 따른 입국의 금지 또는 거부의 대상이 아닐 것 
 
 ④ 출입국관리공무원은 외국인이 제3항 각 호의 요건을 갖추었음을 증명하지 못하면 입국을 허가하지 아니할 수 있다. 
 
 ⑤ 출입국관리공무원은 제7조 제2항 제2호 또는 제3호 에 해당하는 사람에게 입국을 허가할 때에는 대통령령 으로 정하는 바에 따라 체류자격을 부여하고 체류기간을 정하여야 한다. 
 
 ⑥ 출입국관리공무원은 제1항이나 제2항에 따른 심사를 하기 위하여 선박등에 출입할 수 있다. 
 
 [전문개정 2010. 5. 14.]

---

## chunk 3
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 4

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 5
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-030 immigration-act-false-application-documents__candidate__3b2a96aaf155

- 제목: [검토 후보] 출입국관리법 제26조 허위서류 제출 등의 금지
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0026&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-false-application-documents
- supersededBy: 없음
- chunkCount: 5
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 72314
- extractedChars: 3269
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제26조 허위서류 제출 등의 금지
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0026&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: warning
legal_priority: 1
monitor_cadence: daily
change_signals: false_documents, forged_documents, application_broker, permit_application
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 34c0d51f418169b9a4129a5af6af4f4c730b888a816be76463c61aa7e3e67a73
byte_length: 72314
extracted_chars: 3269

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제26조(허위서류 제출 등의 금지) 누구든지 제20조 , 제21조 , 제23조부터 제25조 까지, 제25조의2 , 제25조의3 및 제25조의4 에 따른 허가 신청과 관련하여 다음 각 호의 어느 하나에 해당하는 행위를 해서는 아니 된다.   <개정 2019. 4. 23.>

1. 위조ㆍ변조된 문서 등을 입증자료로 제출하거나 거짓 사실이 적힌 신청서 등을 제출하는 등 부정한 방법으로 신청하는 행위 
 
 2. 제1호의 행위를 알선ㆍ권유하는 행위 
 
 [본조신설 2016. 3. 29.]

---

## chunk 2
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 3

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 4
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-031 immigration-act-general-stay-status__candidate__71219c28ce2a

- 제목: [검토 후보] 출입국관리법 제10조의2 일반체류자격
- sourceUrl: https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000817596
- sourceType: official_law
- topic: legal
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-general-stay-status
- supersededBy: 없음
- chunkCount: 2
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 4994
- extractedChars: 559
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제10조의2 일반체류자격
source_url: https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000817596
source_type: official_law
topic: legal
legal_priority: 1
monitor_cadence: daily
change_signals: short_term_status, long_term_status, 90_days, activity_scope, decree_delegation
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 630bcedd8249815387d7f23846b514b5baff34153ff98b53dfdcdfaddc381b7f
byte_length: 4994
extracted_chars: 559

조문정보 | 국가법령정보센터 
 
 
 
 
 
 
 > 추가 --> 
 
 시행,연혁 법령 개선 시행여부--> 
 
 
 
 
 
 조문정보 
 
 
 
   
 > 추가 조문 보기 paramVO.ancYnChk 시행,연혁구분코드 추가, 현행법령,연혁(시행) = "0", 연혁(공포) = "1" --> 
   
 
 
 
 
 
 
 
 조문정보
 
 
 
 출입국관리법 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정]

---

## chunk 1
제10조의2(일반체류자격) ① 제10조제1호에 따른 일반체류자격(이하 "일반체류자격"이라 한다)은 다음 각 호의 구분에 따른다.

1. 단기체류자격: 관광, 방문 등의 목적으로 대한민국에 90일 이하의 기간(사증면제협정이나 상호주의에 따라 90일을 초과하는 경우에는 그 기간) 동안 머물 수 있는 체류자격

2. 장기체류자격: 유학, 연수, 투자, 주재, 결혼 등의 목적으로 대한민국에 90일을 초과하여 법무부령으로 정하는 체류기간의 상한 범위에서 거주할 수 있는 체류자격
```

---

## A1B-032 immigration-act-marriage-immigrant-extension-special__candidate__8e7c1ccddba2

- 제목: [검토 후보] 출입국관리법 제25조의2 결혼이민자 등에 대한 특칙
- sourceUrl: https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000822759
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-marriage-immigrant-extension-special
- supersededBy: 없음
- chunkCount: 2
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 5882
- extractedChars: 886
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제25조의2 결혼이민자 등에 대한 특칙
source_url: https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000822759
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: marriage_immigrant, domestic_violence, sexual_violence, child_abuse, human_trafficking
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: a46182d6e1a8e47e5bb9f65198b4e82bf76ebb6869446ba5d7087237b6f88fa7
byte_length: 5882
extracted_chars: 886

조문정보 | 국가법령정보센터 
 
 
 
 
 
 
 > 추가 --> 
 
 시행,연혁 법령 개선 시행여부--> 
 
 
 
 
 
 조문정보 
 
 
 
   
 
 
 
 
 
 
 
 조문정보
 
 
 
 출입국관리법 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정]

제25조의2(결혼이민자 등에 대한 특칙) ① 법무부장관은 다음 각 호의 어느 하나에 해당하는 외국인이 체류기간 연장허가를 신청하는 경우에는 해당 재판 등의 권리구제 절차가 종료할 때까지 체류기간 연장을 허가할 수 있다.

---

## chunk 1
1. 「가정폭력범죄의 처벌 등에 관한 특례법」 제2조제1호의 가정폭력을 이유로 법원의 재판, 수사기관의 수사 또는 그 밖의 법률에 따른 권리구제 절차가 진행 중인 대한민국 국민의 배우자인 외국인

2. 「성폭력범죄의 처벌 등에 관한 특례법」 제2조제1항의 성폭력범죄를 이유로 법원의 재판, 수사기관의 수사 또는 그 밖의 법률에 따른 권리구제 절차가 진행 중인 외국인

3. 「아동학대범죄의 처벌 등에 관한 특례법」 제2조제4호의 아동학대범죄를 이유로 법원의 재판, 수사기관의 수사 또는 그 밖의 법률에 따른 권리구제 절차가 진행 중인 외국인 아동 및 「아동복지법」 제3조제3호의 보호자(아동학대행위자는 제외한다)

4. 「인신매매등방지 및 피해자보호 등에 관한 법률」 제3조의 인신매매등피해자로서 법원의 재판, 수사기관의 수사 또는 그 밖의 법률에 따른 권리구제 절차가 진행 중인 외국인

② 법무부장관은 제1항에 따른 체류 연장기간 만료 이후에도 피해 회복 등을 위하여 필요하다고 인정하는 경우에는 체류기간 연장을 허가할 수 있다.

[전문개정 2022.12.13]
```

---

## A1B-033 immigration-act-outside-status-activity__candidate__634884f1d19e

- 제목: [검토 후보] 출입국관리법 제20조 체류자격 외 활동
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0020&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-outside-status-activity
- supersededBy: 없음
- chunkCount: 5
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 71663
- extractedChars: 3163
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제20조 체류자격 외 활동
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0020&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: outside_status_activity, prior_permission, part_time_work, d2, d4
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 7310539386a9935e3df7a142605e5c63ede91acadbb3d548dbc494e9592691a9
byte_length: 71663
extracted_chars: 3163

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제20조(체류자격 외 활동) 대한민국에 체류하는 외국인이 그 체류자격에 해당하는 활동과 함께 다른 체류자격에 해당하는 활동을 하려면 대통령령 으로 정하는 바에 따라 미리 법무부장관의 체류자격 외 활동허가를 받아야 한다.   <개정 2020. 6. 9.>

[전문개정 2010. 5. 14.]

---

## chunk 2
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 3

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 4
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-034 immigration-act-permanent-residence-status__candidate__bf8f48b6e238

- 제목: [검토 후보] 출입국관리법 제10조의3 영주자격
- sourceUrl: https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000817607
- sourceType: official_law
- topic: legal
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-permanent-residence-status
- supersededBy: 없음
- chunkCount: 2
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 5006
- extractedChars: 525
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제10조의3 영주자격
source_url: https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000817607
source_type: official_law
topic: legal
legal_priority: 1
monitor_cadence: daily
change_signals: permanent_residence, f5, conduct, livelihood, basic_knowledge, relaxation
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 851acd16c3ebee89d0cf1bc633af652c056da922d3dcddf2537f9b32d22403ee
byte_length: 5006
extracted_chars: 525

조문정보 | 국가법령정보센터 
 
 
 
 
 
 
 > 추가 --> 
 
 시행,연혁 법령 개선 시행여부--> 
 
 
 
 
 
 조문정보 
 
 
 
   
 > 추가 조문 보기 paramVO.ancYnChk 시행,연혁구분코드 추가, 현행법령,연혁(시행) = "0", 연혁(공포) = "1" --> 
   
 
 
 
 
 
 
 
 조문정보
 
 
 
 출입국관리법 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정]

---

## chunk 1
제10조의3(영주자격) ② 영주자격을 취득하려는 사람은 대통령령으로 정하는 영주의 자격에 부합한 사람으로서 다음 각 호의 요건을 모두 갖추어야 한다.

1. 대한민국의 법령을 준수하는 등 품행이 단정할 것

2. 본인 또는 생계를 같이하는 가족의 소득, 재산 등으로 생계를 유지할 능력이 있을 것

3. 한국어능력과 한국사회ㆍ문화에 대한 이해 등 대한민국에서 계속 살아가는 데 필요한 기본소양을 갖추고 있을 것
```

---

## A1B-035 immigration-act-permission-matrix__candidate__6d7b039362d7

- 제목: [검토 후보] 출입국관리법 변경·연장·자격외활동 허가 구조
- sourceUrl: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
- sourceType: official_law
- topic: legal
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-permission-matrix
- supersededBy: 없음
- chunkCount: 7
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 145569
- extractedChars: 4163
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 변경·연장·자격외활동 허가 구조
source_url: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
source_type: official_law
topic: legal
legal_priority: 1
monitor_cadence: daily
change_signals: content_hash
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 29a9d373e2ccaacbd4476910bf32b8e58dfb4d8f5051fa22d9a620172d6925a0
byte_length: 145569
extracted_chars: 4163

---

## chunk 1
법령 > 본문 > 출입국관리법 | 국가법령정보센터 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령
 
 - 출입국관리법 
 
 (신구법 비교는 공포단위 서비스입니다) 
 
 
 
 
 
 
 신구법비교 
 국가법령정보센터에서 제공하는 신구법
비교는 시스템으로 자동 생성한 것으로
참고용으로만 이용하시기 바라며, 정확한
개정내용의 확인은 제·개정이유(제·개정문)
또는 관보를 확인해 주세요. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 출입국관리법 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 본문목록열림 본문 
 
 
 
 부칙목록열림 부칙 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문 
 제정·개정이유 
 별표·서식 
 연혁 
 3단비교 
 신구법비교 
 법령체계도 
 시행일/공포 서비스개선 : 시행,연혁(ancYnChk: 0=시행, 1=공포) 파라미터 추가 --> 
 법령비교 
 생활법령정보 
 조례위임조문 
 위임조례 
 한눈보기 
 원문다운로드 
 음성지원 
 점자뷰어 
 
 
 
 
 
 
 
 
 
 
 
 조문 선택 조문선택 
 화면내검색 
 새창 선택 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 조례위임조문 
 법령에서 자치법규로 위임한

---

## chunk 2
 사항이 있는
 조문의 목록을 제공하고 바로가기 기능을
 제공합니다. 
 
 
 
 위임조례 
 현재 보고있는 법에서 위임한 사항이 있는 자치법규에 대한 자치법규를 검색하여 목록을 제공합니다. 
 
 
 
 한눈에 이해되는 법령정보 
 법령 속 어려운 내용을 그림이나 표로 표현하여 알기 쉽게 제공합니다. 한눈보기는 법제처에서 제공하는 가공된 법령정보로 법령 그 자체는 아닙니다. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 | 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 

---

## chunk 3
TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 

---

## chunk 4
닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 


---

## chunk 5
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 용지/폰트설정 
 
 
 범위설정 
 
 
 
 
 
 
 일부범위입력 
 
 
 
 시행령 연계 데이터를 보려면 전체를 선택해주세요 
 
 
 
 
 
 법령본문 
 
 
 
 
 전체 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 HWP파일 
 
 
 
 
 EXCEL파일 
 
 
 
 
 PDF파일 
 
 
 
 
 DOC파일 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

---

## chunk 6

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위임행정규칙 
 법률·대통령령·총리령·부령 등 상위법령에서 위임한 사항을
 훈령·예규·고시·공고 등의 형식으로 정하고 있는 행정규칙을 말합니다. 
 
 
 
 
 
 
 닫기
```

---

## A1B-036 immigration-act-permit-cancellation-change__candidate__0d0cd98a1301

- 제목: [검토 후보] 출입국관리법 제89조 각종 허가 등의 취소·변경
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0089&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-permit-cancellation-change
- supersededBy: 없음
- chunkCount: 6
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 74373
- extractedChars: 3694
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제89조 각종 허가 등의 취소·변경
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0089&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: warning
legal_priority: 1
monitor_cadence: daily
change_signals: permit_cancellation, permission_change, guarantor_withdrawal, false_permission, 7_day_notice, opinion_hearing
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 8a00fcf990b723865fe851cd1fe05bba6b74d2efcaf8512561a693629797f41f
byte_length: 74373
extracted_chars: 3694

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제89조(각종 허가 등의 취소ㆍ변경) ① 법무부장관은 외국인이 다음 각 호의 어느 하나에 해당하면 제8조 에 따른 사증발급, 제9조 에 따른 사증발급인정서의 발급, 제12조 제3항 에 따른 입국허가, 제13조 에 따른 조건부 입국허가, 제14조 에 따른 승무원 상륙허가, 제14조의2 에 따른 관광상륙허가 또는 제20조 ㆍ 제21조 및 제23조부터 제25조 까지의 규정에 따른 체류허가 등을 취소하거나 변경할 수 있다.   <개정 2012. 1. 26.>

---

## chunk 2
1. 신원보증인이 보증을 철회하거나 신원보증인이 없게 된 경우 
 
 2. 거짓이나 그 밖의 부정한 방법으로 허가 등을 받은 것이 밝혀진 경우 
 
 3. 허가조건을 위반한 경우 
 
 4. 사정 변경으로 허가상태를 더 이상 유지시킬 수 없는 중대한 사유가 발생한 경우 
 
 5. 제1호부터 제4호까지에서 규정한 경우 외에 이 법 또는 다른 법을 위반한 정도가 중대하거나 출입국관리공무원의 정당한 직무명령을 위반한 경우 
 
 ② 법무부장관은 제1항에 따른 각종 허가 등의 취소나 변경에 필요하다고 인정하면 해당 외국인이나 제79조 에 따른 신청인을 출석하게 하여 의견을 들을 수 있다. 
 
 ③ 제2항의 경우에 법무부장관은 취소하거나 변경하려는 사유, 출석일시와 장소를 출석일 7일 전까지 해당 외국인이나 신청인에게 통지하여야 한다. 
 
 [전문개정 2010. 5. 14.]

---

## chunk 3
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 4

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 5
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-037 immigration-act-reentry-permit__candidate__75136e0a0a33

- 제목: [검토 후보] 출입국관리법 제30조 재입국허가
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0030&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-reentry-permit
- supersededBy: 없음
- chunkCount: 6
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 73077
- extractedChars: 3551
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제30조 재입국허가
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0030&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: reentry_permit, single_multiple_permit, exemption, extension, f5
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 8716f6c6cf3194e4f1dfc1c90f802be9618dad0dc61ad76b2f6be3e1647a6b59
byte_length: 73077
extracted_chars: 3551

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제30조(재입국허가) ① 법무부장관은 제31조 에 따라 외국인등록을 하거나 그 등록이 면제된 외국인이 체류기간 내에 출국하였다가 재입국하려는 경우 그의 신청을 받아 재입국을 허가할 수 있다. 다만, 영주자격을 가진 사람과 재입국허가를 면제하여야 할 상당한 이유가 있는 사람으로서 법무부령 으로 정하는 사람에 대하여는 재입국허가를 면제할 수 있다.   <개정 2018. 3. 20.>

---

## chunk 2
② 제1항에 따른 재입국허가는 한 차례만 재입국할 수 있는 단수재입국허가와 2회 이상 재입국할 수 있는 복수재입국허가로 구분한다. 
 
 ③ 외국인이 질병이나 그 밖의 부득이한 사유로 제1항에 따라 허가받은 기간 내에 재입국할 수 없는 경우에는 그 기간이 끝나기 전에 법무부장관의 재입국허가기간 연장허가를 받아야 한다. 
 
 ④ 법무부장관은 재입국허가기간 연장허가에 관한 권한을 대통령령 으로 정하는 바에 따라 재외공관의 장에게 위임할 수 있다. 
 
 ⑤ 재입국허가 및 그 기간의 연장허가와 재입국허가의 면제에 관한 기준과 절차는 법무부령 으로 정한다. 
 
 [전문개정 2010. 5. 14.]

---

## chunk 3
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 4

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 5
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-038 immigration-act-registration-change-report__candidate__c7dc22a53a72

- 제목: [검토 후보] 출입국관리법 제35조 외국인등록사항 변경신고
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0035&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-registration-change-report
- supersededBy: 없음
- chunkCount: 5
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 71986
- extractedChars: 3293
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제35조 외국인등록사항 변경신고
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0035&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: registration_change, passport_change, name_gender_birth_nationality, 15_days
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: b40af7eda64241f80b0439b668af4270a1c316ce5426a55f1d6708948b5b8cdc
byte_length: 71986
extracted_chars: 3293

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제35조(외국인등록사항의 변경신고) 제31조 에 따라 등록을 한 외국인은 다음 각 호의 어느 하나에 해당하는 사항이 변경되었을 때에는 대통령령 으로 정하는 바에 따라 15일 이내에 체류지 관할 지방출입국ㆍ외국인관서의 장에게 외국인등록사항 변경신고를 하여야 한다.   <개정 2014. 3. 18., 2020. 6. 9.>

1. 성명, 성별, 생년월일 및 국적 
 
 2. 여권의 번호, 발급일자 및 유효기간 
 
 3. 제1호 및 제2호에서 규정한 사항 외에 법무부령 으로 정하는 사항 
 
 [전문개정 2010. 5. 14.]

---

## chunk 2
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 3

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 4
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-039 immigration-act-status-change__candidate__dcac344e8dab

- 제목: [검토 후보] 출입국관리법 제24조 체류자격 변경허가
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0024&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-status-change
- supersededBy: 없음
- chunkCount: 5
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 72492
- extractedChars: 3325
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제24조 체류자격 변경허가
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0024&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: status_change, prior_permission, 30_days, review_criteria
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 3adee9b324efc2c8db445657e8b5a982186472141be10402b3c1c5b91397eb16
byte_length: 72492
extracted_chars: 3325

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제24조(체류자격 변경허가) ① 대한민국에 체류하는 외국인이 그 체류자격과 다른 체류자격에 해당하는 활동을 하려면 대통령령 으로 정하는 바에 따라 미리 법무부장관의 체류자격 변경허가를 받아야 한다.   <개정 2020. 6. 9.>

② 제31조 제1항 각 호의 어느 하나에 해당하는 사람으로서 그 신분이 변경되어 체류자격을 변경하려는 사람은 신분이 변경된 날부터 30일 이내에 법무부장관의 체류자격 변경허가를 받아야 한다. 
 
 ③ 제1항에 따른 체류자격 변경허가의 심사기준은 법무부령 으로 정한다.   <신설 2020. 6. 9.> 
 
 [전문개정 2010. 5. 14.]

---

## chunk 2
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 3

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 4
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-040 immigration-act-status-grant__candidate__f3c957a288a6

- 제목: [검토 후보] 출입국관리법 제23조 체류자격 부여
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0023&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: legal
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-status-grant
- supersededBy: 없음
- chunkCount: 5
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 72316
- extractedChars: 3313
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제23조 체류자격 부여
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0023&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: legal
legal_priority: 1
monitor_cadence: daily
change_signals: status_grant, birth_in_korea, nationality_loss, 90_days, 60_days
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: c1d6436d23055a8eaeae87c6e0557e8ff515bbed0b63b85248551ee13942d597
byte_length: 72316
extracted_chars: 3313

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제23조(체류자격 부여) ① 다음 각 호의 어느 하나에 해당하는 외국인이 제10조 에 따른 체류자격을 가지지 못하고 대한민국에 체류하게 되는 경우에는 다음 각 호의 구분에 따른 기간 이내에 대통령령 으로 정하는 바에 따라 체류자격을 받아야 한다.

1. 대한민국에서 출생한 외국인: 출생한 날부터 90일 
 
 2. 대한민국에서 체류 중 대한민국의 국적을 상실하거나 이탈하는 등 그 밖의 사유가 발생한 외국인: 그 사유가 발생한 날부터 60일 
 
 ② 제1항에 따른 체류자격 부여의 심사기준은 법무부령 으로 정한다. 
 
 [전문개정 2020. 6. 9.]

---

## chunk 2
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 3

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 4
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-041 immigration-act-stay-extension__candidate__292771283d50

- 제목: [검토 후보] 출입국관리법 제25조 체류기간 연장허가
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0025&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-stay-extension
- supersededBy: 없음
- chunkCount: 5
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 71911
- extractedChars: 3203
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제25조 체류기간 연장허가
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0025&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: stay_extension, before_expiry, review_criteria, overstay
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 34f588dbb3eb766ae2c8cc115b2d4f50ef22b4ba013a6ff4778f24c7aab96570
byte_length: 71911
extracted_chars: 3203

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제25조(체류기간 연장허가) ① 외국인이 체류기간을 초과하여 계속 체류하려면 대통령령 으로 정하는 바에 따라 체류기간이 끝나기 전에 법무부장관의 체류기간 연장허가를 받아야 한다.   <개정 2020. 6. 9.>

② 제1항에 따른 체류기간 연장허가의 심사기준은 법무부령 으로 정한다.   <신설 2020. 6. 9.> 
 
 [전문개정 2010. 5. 14.]

---

## chunk 2
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 3

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 4
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-042 immigration-act-stay-status-scope__candidate__5d59ed335c39

- 제목: [검토 후보] 출입국관리법 체류자격·활동범위
- sourceUrl: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
- sourceType: official_law
- topic: legal
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-stay-status-scope
- supersededBy: 없음
- chunkCount: 7
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 145569
- extractedChars: 4163
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 체류자격·활동범위
source_url: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
source_type: official_law
topic: legal
legal_priority: 1
monitor_cadence: daily
change_signals: content_hash
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 6b281b6d6ab5b2a744cabf17acf9e7c787fef75f7b8569b5a29e2b39075455e6
byte_length: 145569
extracted_chars: 4163

---

## chunk 1
법령 > 본문 > 출입국관리법 | 국가법령정보센터 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령
 
 - 출입국관리법 
 
 (신구법 비교는 공포단위 서비스입니다) 
 
 
 
 
 
 
 신구법비교 
 국가법령정보센터에서 제공하는 신구법
비교는 시스템으로 자동 생성한 것으로
참고용으로만 이용하시기 바라며, 정확한
개정내용의 확인은 제·개정이유(제·개정문)
또는 관보를 확인해 주세요. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 출입국관리법 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 본문목록열림 본문 
 
 
 
 부칙목록열림 부칙 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문 
 제정·개정이유 
 별표·서식 
 연혁 
 3단비교 
 신구법비교 
 법령체계도 
 시행일/공포 서비스개선 : 시행,연혁(ancYnChk: 0=시행, 1=공포) 파라미터 추가 --> 
 법령비교 
 생활법령정보 
 조례위임조문 
 위임조례 
 한눈보기 
 원문다운로드 
 음성지원 
 점자뷰어 
 
 
 
 
 
 
 
 
 
 
 
 조문 선택 조문선택 
 화면내검색 
 새창 선택 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 조례위임조문 
 법령에서 자치법규로 위임한

---

## chunk 2
 사항이 있는
 조문의 목록을 제공하고 바로가기 기능을
 제공합니다. 
 
 
 
 위임조례 
 현재 보고있는 법에서 위임한 사항이 있는 자치법규에 대한 자치법규를 검색하여 목록을 제공합니다. 
 
 
 
 한눈에 이해되는 법령정보 
 법령 속 어려운 내용을 그림이나 표로 표현하여 알기 쉽게 제공합니다. 한눈보기는 법제처에서 제공하는 가공된 법령정보로 법령 그 자체는 아닙니다. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 | 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 

---

## chunk 3
TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 

---

## chunk 4
닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 


---

## chunk 5
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 용지/폰트설정 
 
 
 범위설정 
 
 
 
 
 
 
 일부범위입력 
 
 
 
 시행령 연계 데이터를 보려면 전체를 선택해주세요 
 
 
 
 
 
 법령본문 
 
 
 
 
 전체 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 HWP파일 
 
 
 
 
 EXCEL파일 
 
 
 
 
 PDF파일 
 
 
 
 
 DOC파일 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

---

## chunk 6

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위임행정규칙 
 법률·대통령령·총리령·부령 등 상위법령에서 위임한 사항을
 훈령·예규·고시·공고 등의 형식으로 정하고 있는 행정규칙을 말합니다. 
 
 
 
 
 
 
 닫기
```

---

## A1B-043 immigration-act-student-management-reporting__candidate__fa7b90a1f13b

- 제목: [검토 후보] 출입국관리법 제19조의4 외국인유학생의 관리 등
- sourceUrl: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-student-management-reporting
- supersededBy: 없음
- chunkCount: 7
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 145569
- extractedChars: 4163
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제19조의4 외국인유학생의 관리 등
source_url: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: foreign_student_management, school_reporting, leave_of_absence, removal_from_register, training_discontinuation, disappearance, d2, d4
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 29a9d373e2ccaacbd4476910bf32b8e58dfb4d8f5051fa22d9a620172d6925a0
byte_length: 145569
extracted_chars: 4163

---

## chunk 1
법령 > 본문 > 출입국관리법 | 국가법령정보센터 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령
 
 - 출입국관리법 
 
 (신구법 비교는 공포단위 서비스입니다) 
 
 
 
 
 
 
 신구법비교 
 국가법령정보센터에서 제공하는 신구법
비교는 시스템으로 자동 생성한 것으로
참고용으로만 이용하시기 바라며, 정확한
개정내용의 확인은 제·개정이유(제·개정문)
또는 관보를 확인해 주세요. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 출입국관리법 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 본문목록열림 본문 
 
 
 
 부칙목록열림 부칙 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문 
 제정·개정이유 
 별표·서식 
 연혁 
 3단비교 
 신구법비교 
 법령체계도 
 시행일/공포 서비스개선 : 시행,연혁(ancYnChk: 0=시행, 1=공포) 파라미터 추가 --> 
 법령비교 
 생활법령정보 
 조례위임조문 
 위임조례 
 한눈보기 
 원문다운로드 
 음성지원 
 점자뷰어 
 
 
 
 
 
 
 
 
 
 
 
 조문 선택 조문선택 
 화면내검색 
 새창 선택 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 조례위임조문 
 법령에서 자치법규로 위임한

---

## chunk 2
 사항이 있는
 조문의 목록을 제공하고 바로가기 기능을
 제공합니다. 
 
 
 
 위임조례 
 현재 보고있는 법에서 위임한 사항이 있는 자치법규에 대한 자치법규를 검색하여 목록을 제공합니다. 
 
 
 
 한눈에 이해되는 법령정보 
 법령 속 어려운 내용을 그림이나 표로 표현하여 알기 쉽게 제공합니다. 한눈보기는 법제처에서 제공하는 가공된 법령정보로 법령 그 자체는 아닙니다. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 | 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 

---

## chunk 3
TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 

---

## chunk 4
닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 


---

## chunk 5
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 용지/폰트설정 
 
 
 범위설정 
 
 
 
 
 
 
 일부범위입력 
 
 
 
 시행령 연계 데이터를 보려면 전체를 선택해주세요 
 
 
 
 
 
 법령본문 
 
 
 
 
 전체 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 HWP파일 
 
 
 
 
 EXCEL파일 
 
 
 
 
 PDF파일 
 
 
 
 
 DOC파일 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

---

## chunk 6

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위임행정규칙 
 법률·대통령령·총리령·부령 등 상위법령에서 위임한 사항을
 훈령·예규·고시·공고 등의 형식으로 정하고 있는 행정규칙을 말합니다. 
 
 
 
 
 
 
 닫기
```

---

## A1B-044 immigration-act-visa-issuance-certificate__candidate__6fabe79be31d

- 제목: [검토 후보] 출입국관리법 제8조·제9조 사증·사증발급인정서
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0009&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-visa-issuance-certificate
- supersededBy: 없음
- chunkCount: 5
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 72124
- extractedChars: 3230
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제8조·제9조 사증·사증발급인정서
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0009&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: single_visa, multiple_visa, visa_issuance_certificate, certificate_for_confirmation_of_visa_issuance, inviter_proxy_application, article_8_single_multiple_visa
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: c8b53c49d3858725508773b0a440731cc27e9de8a375b6da534a5679d9f00098
byte_length: 72124
extracted_chars: 3230

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제9조(사증발급인정서) ① 법무부장관은 제7조 제1항 에 따른 사증을 발급하기 전에 특히 필요하다고 인정할 때에는 입국하려는 외국인의 신청을 받아 사증발급인정서를 발급할 수 있다.

② 제1항에 따른 사증발급인정서 발급신청은 그 외국인을 초청하려는 자가 대리할 수 있다. 
 
 ③ 제1항에 따른 사증발급인정서의 발급대상ㆍ발급기준 및 발급절차는 법무부령 으로 정한다. 
 
 [전문개정 2010. 5. 14.]

---

## chunk 2
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 3

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 4
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-045 immigration-act-visa-passport-requirement__candidate__2b37f5ab43ab

- 제목: [검토 후보] 출입국관리법 제7조 외국인의 입국
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0007&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: legal
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-visa-passport-requirement
- supersededBy: 없음
- chunkCount: 6
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 73162
- extractedChars: 3666
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제7조 외국인의 입국
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0007&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: legal
legal_priority: 1
monitor_cadence: daily
change_signals: valid_passport, visa_requirement, visa_free, visa_waiver, reentry_permit, entry_permission
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: cdb757e57bfcc32a43b3a9ac6a5934918db3cbcbde06301fbce37280d627497d
byte_length: 73162
extracted_chars: 3666

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제7조(외국인의 입국) ① 외국인이 입국할 때에는 유효한 여권과 법무부장관이 발급한 사증(査證)을 가지고 있어야 한다.

---

## chunk 2
② 다음 각 호의 어느 하나에 해당하는 외국인은 제1항에도 불구하고 사증 없이 입국할 수 있다. 
 
 1. 재입국허가를 받은 사람 또는 재입국허가가 면제된 사람으로서 그 허가 또는 면제받은 기간이 끝나기 전에 입국하는 사람 
 
 2. 대한민국과 사증면제협정을 체결한 국가의 국민으로서 그 협정에 따라 면제대상이 되는 사람 
 
 3. 국제친선, 관광 또는 대한민국의 이익 등을 위하여 입국하는 사람으로서 대통령령 으로 정하는 바에 따라 따로 입국허가를 받은 사람 
 
 4. 난민여행증명서를 발급받고 출국한 후 그 유효기간이 끝나기 전에 입국하는 사람 
 
 ③ 법무부장관은 공공질서의 유지나 국가이익에 필요하다고 인정하면 제2항제2호에 해당하는 사람에 대하여 사증면제협정의 적용을 일시 정지할 수 있다. 
 
 ④ 대한민국과 수교(修交)하지 아니한 국가나 법무부장관이 외교부장관과 협의하여 지정한 국가의 국민은 제1항에도 불구하고 대통령령 으로 정하는 바에 따라 재외공관의 장이나 지방출입국ㆍ외국인관서의 장이 발급한 외국인입국허가서를 가지고 입국할 수 있다.   <개정 2013. 3. 23., 2014. 3. 18.> 
 
 [전문개정 2010. 5. 14.]

---

## chunk 3
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 4

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 5
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-046 immigration-act-workplace-change-addition__candidate__aec35dcf7a93

- 제목: [검토 후보] 출입국관리법 제21조 근무처 변경·추가
- sourceUrl: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0021&lsiSeq=272921&urlMode=lsScJoRltInfoR
- sourceType: official_law
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-act-workplace-change-addition
- supersededBy: 없음
- chunkCount: 6
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 72836
- extractedChars: 3421
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제21조 근무처 변경·추가
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0021&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: process
legal_priority: 1
monitor_cadence: daily
change_signals: workplace_change, workplace_addition, 15_days, employer_referral_ban
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 8899e4bb7bf1f0d017665de1f2e3b051548e080fa0de030c3ea478d5e17017ca
byte_length: 72836
extracted_chars: 3421

---

## chunk 1
국가법령정보센터 | 변경조문 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 화면내검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ancYnChk 파라미터 추가 --> 
 
 
 
 
 출입국관리법 
 
 
 
 
 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 법무부 ( 출입국기획과 ), 02-2110-4116 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 제21조(근무처의 변경ㆍ추가) ① 대한민국에 체류하는 외국인이 그 체류자격의 범위에서 그의 근무처를 변경하거나 추가하려면 대통령령 으로 정하는 바에 따라 미리 법무부장관의 허가를 받아야 한다. 다만, 전문적인 지식ㆍ기술 또는 기능을 가진 사람으로서 대통령령 으로 정하는 사람은 근무처를 변경하거나 추가한 날부터 15일 이내에 대통령령 으로 정하는 바에 따라 법무부장관에게 신고하여야 한다.   <개정 2020. 6. 9.>

---

## chunk 2
② 누구든지 제1항 본문에 따른 근무처의 변경허가ㆍ추가허가를 받지 아니한 외국인을 고용하거나 고용을 알선하여서는 아니 된다. 다만, 다른 법률에 따라 고용을 알선하는 경우에는 그러하지 아니하다. 
 
 ③ 제1항 단서에 해당하는 사람에 대하여는 제18조 제2항 을 적용하지 아니한다. 
 
 [전문개정 2010. 5. 14.]

---

## chunk 3
위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 

---

## chunk 4

 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령

---

## chunk 5
용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 |
```

---

## A1B-047 immigration-decree-current-text__candidate__5e2912adb490

- 제목: [검토 후보] 출입국관리법 시행령 최신 본문
- sourceUrl: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=271319
- sourceType: official_law
- topic: legal
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-decree-current-text
- supersededBy: 없음
- chunkCount: 7
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 145930
- extractedChars: 4194
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 시행령 최신 본문
source_url: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=271319
source_type: official_law
topic: legal
legal_priority: 2
monitor_cadence: daily
change_signals: content_hash
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: d244bb3247f849e7fc3a068a2bb41a38b363a0e9a6261713562b8de4b7a397f2
byte_length: 145930
extracted_chars: 4194

---

## chunk 1
법령 > 본문 > 출입국관리법 시행령 | 국가법령정보센터 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령
 
 - 출입국관리법 시행령 
 
 (신구법 비교는 공포단위 서비스입니다) 
 
 
 
 
 
 
 신구법비교 
 국가법령정보센터에서 제공하는 신구법
비교는 시스템으로 자동 생성한 것으로
참고용으로만 이용하시기 바라며, 정확한
개정내용의 확인은 제·개정이유(제·개정문)
또는 관보를 확인해 주세요. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 출입국관리법 시행령 [시행 2025. 6. 1.] [대통령령 제35540호, 2025. 5. 27., 일부개정] 
 
 
 본문목록열림 본문 
 
 
 
 부칙목록열림 부칙 
 
 
 
 별표목록열림 별표 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문 
 제정·개정이유 
 별표·서식 
 연혁 
 3단비교 
 신구법비교 
 법령체계도 
 시행일/공포 서비스개선 : 시행,연혁(ancYnChk: 0=시행, 1=공포) 파라미터 추가 --> 
 법령비교 
 생활법령정보 
 조례위임조문 
 위임조례 
 한눈보기 
 원문다운로드 
 음성지원 
 점자뷰어 
 
 
 
 
 
 
 
 
 
 
 
 조문 선택 조문선택 
 화면내검색 
 새창 선택 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

---

## chunk 2

 
 
 
 조례위임조문 
 법령에서 자치법규로 위임한 사항이 있는
 조문의 목록을 제공하고 바로가기 기능을
 제공합니다. 
 
 
 
 위임조례 
 현재 보고있는 법에서 위임한 사항이 있는 자치법규에 대한 자치법규를 검색하여 목록을 제공합니다. 
 
 
 
 한눈에 이해되는 법령정보 
 법령 속 어려운 내용을 그림이나 표로 표현하여 알기 쉽게 제공합니다. 한눈보기는 법제처에서 제공하는 가공된 법령정보로 법령 그 자체는 아닙니다. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 | 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기

---

## chunk 3
 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글)

---

## chunk 4
 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 


---

## chunk 5
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 용지/폰트설정 
 
 
 범위설정 
 
 
 
 
 
 
 일부범위입력 
 
 
 
 시행령 연계 데이터를 보려면 전체를 선택해주세요 
 
 
 
 
 
 법령본문 
 
 
 
 
 전체 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 HWP파일 
 
 
 
 
 EXCEL파일 
 
 
 
 
 PDF파일 
 
 
 
 
 DOC파일 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 


---

## chunk 6
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위임행정규칙 
 법률·대통령령·총리령·부령 등 상위법령에서 위임한 사항을
 훈령·예규·고시·공고 등의 형식으로 정하고 있는 행정규칙을 말합니다. 
 
 
 
 
 
 
 닫기
```

---

## A1B-048 immigration-decree-long-term-status-table__candidate__eb5ea5ef1a3d

- 제목: [검토 후보] 출입국관리법 시행령 별표 1의2 장기체류자격
- sourceUrl: https://www.law.go.kr/LSW/lsLawLinkInfo.do?lsJoLnkSeq=1000870036
- sourceType: official_law
- topic: legal
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-decree-long-term-status-table
- supersededBy: 없음
- chunkCount: 1
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 5779
- extractedChars: 66
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 시행령 별표 1의2 장기체류자격
source_url: https://www.law.go.kr/LSW/lsLawLinkInfo.do?lsJoLnkSeq=1000870036
source_type: official_law
topic: legal
legal_priority: 2
monitor_cadence: daily
change_signals: content_hash
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 3cc9e2648136356dbb4bd2574d01f0cdca0105b29126ced0ee548ece41fa7935
byte_length: 5779
extracted_chars: 66

별표·서식 > 장기체류자격(제12조 관련) | 국가법령정보센터 
 
 
 
 
 
 
 
 
 
 
 
 
 별표·서식
```

---

## A1B-049 immigration-decree-permanent-residence-table__candidate__c56921189f95

- 제목: [검토 후보] 출입국관리법 시행령 별표 1의3 영주자격
- sourceUrl: https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsiSeq=271319&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95+%EC%8B%9C%ED%96%89%EB%A0%B9&bylNo=0001&bylBrNo=03&bylCls=BE&bylEfYd=20250601&bylEfYdYn=Y
- sourceType: official_law
- topic: legal
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-decree-permanent-residence-table
- supersededBy: 없음
- chunkCount: 1
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 5807
- extractedChars: 78
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 시행령 별표 1의3 영주자격
source_url: https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsiSeq=271319&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95+%EC%8B%9C%ED%96%89%EB%A0%B9&bylNo=0001&bylBrNo=03&bylCls=BE&bylEfYd=20250601&bylEfYdYn=Y
source_type: official_law
topic: legal
legal_priority: 2
monitor_cadence: daily
change_signals: permanent_residence, f5, eligibility_scope, article_12_2, deportation_exclusion
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 1fa9fc851d4b78680ccfad73d1bd98255b53819c45b879059ab7d61096513da3
byte_length: 5807
extracted_chars: 78

별표·서식 > 영주자격에 부합하는 사람(제12조의2제1항 관련) | 국가법령정보센터 
 
 
 
 
 
 
 
 
 
 
 
 
 별표·서식
```

---

## A1B-050 immigration-decree-short-term-status-table__candidate__9e224f703e52

- 제목: [검토 후보] 출입국관리법 시행령 별표 1 단기체류자격
- sourceUrl: https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsiSeq=271319&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95+%EC%8B%9C%ED%96%89%EB%A0%B9&bylNo=0001&bylBrNo=00&bylCls=BE&bylEfYd=20250601&bylEfYdYn=Y
- sourceType: official_law
- topic: legal
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-decree-short-term-status-table
- supersededBy: 없음
- chunkCount: 1
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 5779
- extractedChars: 66
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 시행령 별표 1 단기체류자격
source_url: https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsiSeq=271319&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95+%EC%8B%9C%ED%96%89%EB%A0%B9&bylNo=0001&bylBrNo=00&bylCls=BE&bylEfYd=20250601&bylEfYdYn=Y
source_type: official_law
topic: legal
legal_priority: 2
monitor_cadence: daily
change_signals: short_term_status, b1, b2, c1, c3, c4, activity_scope
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 031c8eb55fa7bb086f7cc2a03abf4924db5e9a9484333a2cc69d3022b2eb7fac
byte_length: 5779
extracted_chars: 66

별표·서식 > 단기체류자격(제12조 관련) | 국가법령정보센터 
 
 
 
 
 
 
 
 
 
 
 
 
 별표·서식
```

---

## A1B-051 immigration-law-interpretation-hierarchy__candidate__48e3364c2f98

- 제목: [검토 후보] 출입국관리법 제10조·제17조 법령 해석 순서
- sourceUrl: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
- sourceType: official_law
- topic: legal
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-law-interpretation-hierarchy
- supersededBy: 없음
- chunkCount: 7
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 145569
- extractedChars: 4163
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 제10조·제17조 법령 해석 순서
source_url: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
source_type: official_law
topic: legal
legal_priority: 1
monitor_cadence: daily
change_signals: stay_status, activity_scope, law_decree_rule_hierarchy, article_10, article_17
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 6b281b6d6ab5b2a744cabf17acf9e7c787fef75f7b8569b5a29e2b39075455e6
byte_length: 145569
extracted_chars: 4163

---

## chunk 1
법령 > 본문 > 출입국관리법 | 국가법령정보센터 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령
 
 - 출입국관리법 
 
 (신구법 비교는 공포단위 서비스입니다) 
 
 
 
 
 
 
 신구법비교 
 국가법령정보센터에서 제공하는 신구법
비교는 시스템으로 자동 생성한 것으로
참고용으로만 이용하시기 바라며, 정확한
개정내용의 확인은 제·개정이유(제·개정문)
또는 관보를 확인해 주세요. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 출입국관리법 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 본문목록열림 본문 
 
 
 
 부칙목록열림 부칙 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문 
 제정·개정이유 
 별표·서식 
 연혁 
 3단비교 
 신구법비교 
 법령체계도 
 시행일/공포 서비스개선 : 시행,연혁(ancYnChk: 0=시행, 1=공포) 파라미터 추가 --> 
 법령비교 
 생활법령정보 
 조례위임조문 
 위임조례 
 한눈보기 
 원문다운로드 
 음성지원 
 점자뷰어 
 
 
 
 
 
 
 
 
 
 
 
 조문 선택 조문선택 
 화면내검색 
 새창 선택 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 조례위임조문 
 법령에서 자치법규로 위임한

---

## chunk 2
 사항이 있는
 조문의 목록을 제공하고 바로가기 기능을
 제공합니다. 
 
 
 
 위임조례 
 현재 보고있는 법에서 위임한 사항이 있는 자치법규에 대한 자치법규를 검색하여 목록을 제공합니다. 
 
 
 
 한눈에 이해되는 법령정보 
 법령 속 어려운 내용을 그림이나 표로 표현하여 알기 쉽게 제공합니다. 한눈보기는 법제처에서 제공하는 가공된 법령정보로 법령 그 자체는 아닙니다. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 | 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 

---

## chunk 3
TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 

---

## chunk 4
닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 


---

## chunk 5
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 용지/폰트설정 
 
 
 범위설정 
 
 
 
 
 
 
 일부범위입력 
 
 
 
 시행령 연계 데이터를 보려면 전체를 선택해주세요 
 
 
 
 
 
 법령본문 
 
 
 
 
 전체 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 HWP파일 
 
 
 
 
 EXCEL파일 
 
 
 
 
 PDF파일 
 
 
 
 
 DOC파일 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

---

## chunk 6

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위임행정규칙 
 법률·대통령령·총리령·부령 등 상위법령에서 위임한 사항을
 훈령·예규·고시·공고 등의 형식으로 정하고 있는 행정규칙을 말합니다. 
 
 
 
 
 
 
 닫기
```

---

## A1B-052 immigration-law-recent-promulgations__candidate__a065d94b0378

- 제목: [검토 후보] 국가법령정보센터 출입국관리법 최근공포·시행일자
- sourceUrl: https://www.law.go.kr/LSW/nwRvsLsPop.do?chrIdx=10&cptOfi=&lsKndCd=&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95&p_epubdt=&p_epubno=&p_spubdt=&p_spubno=&searchType=lsNm&sortIdx=0
- sourceType: official_law
- topic: legal
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-law-recent-promulgations
- supersededBy: 없음
- chunkCount: 4
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 29110
- extractedChars: 2232
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 국가법령정보센터 출입국관리법 최근공포·시행일자
source_url: https://www.law.go.kr/LSW/nwRvsLsPop.do?chrIdx=10&cptOfi=&lsKndCd=&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95&p_epubdt=&p_epubno=&p_spubdt=&p_spubno=&searchType=lsNm&sortIdx=0
source_type: official_law
topic: legal
legal_priority: 1
monitor_cadence: daily
change_signals: new_promulgation, effective_date, law_number, decree_or_rule_update
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 2d27265328f38a4e99acbf237462f40a6ce85e7c32a5948fd8dcf41a9679fdc9
byte_length: 29110
extracted_chars: 2232

---

## chunk 1
최신법령정보 > 최근공포법령 | 국가법령정보센터 
 
 
 
 
 
 
 
 본문바로가기 
 
 
 
 
 
 
 국가법령정보센터
 
 최신법령정보
 
 
 
 
 
 
 
 
 
 
 최근공포법령 
 최근시행법령 
 시행예정법령 
 
 
 
 
 
 
 
 
 
 법령종류 
 
 
 
 
 
 법령종류 
 
 
 전체 법률 대통령령 총리령 부령 
 
 
 소관부처 
 
 
 전체 고용노동부 과학기술정보통신부 교육부 국가보훈부 국방부 국토교통부 기획재정부 기후에너지환경부 농림축산식품부 문화체육관광부 법무부 보건복지부 산업통상부 성평등가족부 외교부 인사혁신처 재정경제부 중소벤처기업부 통일부 해양수산부 행정안전부 고위공직자범죄수사처 국가데이터처 기획예산처 법제처 식품의약품안전처 지식재산처 검찰청 경찰청 관세청 국가유산청 국세청 기상청 농촌진흥청 방위사업청 병무청 산림청 새만금개발청 소방청 우주항공청 재외동포청 조달청 질병관리청 해양경찰청 행정중심복합도시건설청 개인정보보호위원회 공정거래위원회 국가인권위원회 국민권익위원회 금융위원회 방송미디어통신위원회 원자력안전위원회 국가정보원 국무조정실 기타 대통령경호처 감사원 국회 대법원 민주평화통일자문회의 중앙선거관리위원회 헌법재판소 
 
 
 구분 
 법령명 공포일자 공포번호 
 
 
 
 검색어 
 
 
 
 공포일자 
  
  ~  
  
 
 
 
 공포번호 
 
 ~ 
 
 
 
 
 검색 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 총
 172 건 (1/12) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 


---

## chunk 2
 
 
 
 
 
 
 최근공포법령 검색목록
 
 
 
 
 
 
 
 
 
 
 
 
 
 번호 
 법령명 
 소관부처 
 제정·개정구분 
 법령종류 
 공포번호 
 공포일자 
 시행일자 
 
 
 
 
 
 1 
 출입국관리법 시행규칙 
 법무부 
 일부개정 
 법무부령 
 제1106호 
 2026. 1. 23. 
 2026. 1. 23. 
 
 
 
 2 
 출입국관리법 시행규칙 
 법무부 
 일부개정 
 법무부령 
 제1103호 
 2025. 11. 6. 
 2025. 11. 6. 
 
 
 
 3 
 출입국관리법 
 법무부 
 일부개정 
 법률 
 제20992호 
 2025. 7. 22. 
 2026. 1. 23. 
 
 
 
 4 
 출입국관리법 시행규칙 
 법무부 
 일부개정 
 법무부령 
 제1097호 
 2025. 5. 30. 
 2025. 6. 1. 
 
 
 
 5 
 출입국관리법 시행령 
 법무부 
 일부개정 
 대통령령 
 제35540호 
 2025. 5. 27. 
 2025. 6. 1. 
 
 
 
 6 
 출입국관리법 
 법무부 
 일부개정 
 법률 
 제20794호 
 2025. 3. 18. 
 2025. 6. 1. 
 
 
 
 7 
 출입국관리법 시행규칙 
 법무부 
 일부개정 
 법무부령 
 제1086호 
 2024. 12. 24. 
 2025. 1. 1. 
 
 
 
 8 
 출입국관리법 
 법무부 
 일부개정 
 법률 
 제20578호 
 2024. 12. 20. 
 2025. 6. 21. 
 
 
 
 9 
 출입국관리법 시행규칙 
 법무부 
 일부개정 
 법무부령 
 

---

## chunk 3
제1083호 
 2024. 10. 29. 
 2024. 10. 29. 
 
 
 
 10 
 출입국관리법 시행령 
 법무부 
 일부개정 
 대통령령 
 제34966호 
 2024. 10. 29. 
 2024. 10. 29. 
 
 
 
 11 
 출입국관리법 시행규칙 
 법무부 
 일부개정 
 법무부령 
 제1063호 
 2023. 12. 14. 
 2023. 12. 14. 
 
 
 
 12 
 출입국관리법 시행규칙 
 법무부 
 일부개정 
 법무부령 
 제1062호 
 2023. 12. 14. 
 2023. 12. 14. 
 
 
 
 13 
 출입국관리법 시행령 
 법무부 
 일부개정 
 대통령령 
 제33918호 
 2023. 12. 12. 
 2023. 12. 14. 
 
 
 
 14 
 출입국관리법 시행규칙 
 법무부 
 일부개정 
 법무부령 
 제1054호 
 2023. 6. 30. 
 2023. 6. 30. 
 
 
 
 15 
 출입국관리법 시행규칙 
 법무부 
 일부개정 
 법무부령 
 제1052호 
 2023. 6. 14. 
 2023. 6. 14. 
 
 
 
 
 
 
 
 
 
 
 
 
 1
 
 2 
 
 3 
 
 4 
 
 5 
 
 6 
 
 7 
 
 8 
 
 9 
 
 10
```

---

## A1B-053 immigration-law-violation-risk__candidate__9a2027323281

- 제목: [검토 후보] 출입국관리법 위반 제재
- sourceUrl: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
- sourceType: official_law
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-law-violation-risk
- supersededBy: 없음
- chunkCount: 7
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 145569
- extractedChars: 4163
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 위반 제재
source_url: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
source_type: official_law
topic: warning
legal_priority: 1
monitor_cadence: daily
change_signals: content_hash
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 29a9d373e2ccaacbd4476910bf32b8e58dfb4d8f5051fa22d9a620172d6925a0
byte_length: 145569
extracted_chars: 4163

---

## chunk 1
법령 > 본문 > 출입국관리법 | 국가법령정보센터 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령
 
 - 출입국관리법 
 
 (신구법 비교는 공포단위 서비스입니다) 
 
 
 
 
 
 
 신구법비교 
 국가법령정보센터에서 제공하는 신구법
비교는 시스템으로 자동 생성한 것으로
참고용으로만 이용하시기 바라며, 정확한
개정내용의 확인은 제·개정이유(제·개정문)
또는 관보를 확인해 주세요. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 출입국관리법 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정] 
 
 
 본문목록열림 본문 
 
 
 
 부칙목록열림 부칙 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문 
 제정·개정이유 
 별표·서식 
 연혁 
 3단비교 
 신구법비교 
 법령체계도 
 시행일/공포 서비스개선 : 시행,연혁(ancYnChk: 0=시행, 1=공포) 파라미터 추가 --> 
 법령비교 
 생활법령정보 
 조례위임조문 
 위임조례 
 한눈보기 
 원문다운로드 
 음성지원 
 점자뷰어 
 
 
 
 
 
 
 
 
 
 
 
 조문 선택 조문선택 
 화면내검색 
 새창 선택 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 조례위임조문 
 법령에서 자치법규로 위임한

---

## chunk 2
 사항이 있는
 조문의 목록을 제공하고 바로가기 기능을
 제공합니다. 
 
 
 
 위임조례 
 현재 보고있는 법에서 위임한 사항이 있는 자치법규에 대한 자치법규를 검색하여 목록을 제공합니다. 
 
 
 
 한눈에 이해되는 법령정보 
 법령 속 어려운 내용을 그림이나 표로 표현하여 알기 쉽게 제공합니다. 한눈보기는 법제처에서 제공하는 가공된 법령정보로 법령 그 자체는 아닙니다. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 | 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 

---

## chunk 3
TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 

---

## chunk 4
닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 


---

## chunk 5
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 용지/폰트설정 
 
 
 범위설정 
 
 
 
 
 
 
 일부범위입력 
 
 
 
 시행령 연계 데이터를 보려면 전체를 선택해주세요 
 
 
 
 
 
 법령본문 
 
 
 
 
 전체 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 HWP파일 
 
 
 
 
 EXCEL파일 
 
 
 
 
 PDF파일 
 
 
 
 
 DOC파일 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

---

## chunk 6

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위임행정규칙 
 법률·대통령령·총리령·부령 등 상위법령에서 위임한 사항을
 훈령·예규·고시·공고 등의 형식으로 정하고 있는 행정규칙을 말합니다. 
 
 
 
 
 
 
 닫기
```

---

## A1B-054 immigration-rule-documents-attachments__candidate__410678ec5390

- 제목: [검토 후보] 출입국관리법 시행규칙 제76조·별표 5·별표 5의2
- sourceUrl: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283059
- sourceType: official_law
- topic: documents
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-rule-documents-attachments
- supersededBy: 없음
- chunkCount: 7
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 146250
- extractedChars: 4215
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 시행규칙 제76조·별표 5·별표 5의2
source_url: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283059
source_type: official_law
topic: documents
legal_priority: 3
monitor_cadence: daily
change_signals: content_hash
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 42063f47505820e7c904568805796fe4ffd07e4e7a95b27944ca2e934f9d19fd
byte_length: 146250
extracted_chars: 4215

---

## chunk 1
법령 > 본문 > 출입국관리법 시행규칙 | 국가법령정보센터 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령
 
 - 출입국관리법 시행규칙 
 
 (신구법 비교는 공포단위 서비스입니다) 
 
 
 
 
 
 
 신구법비교 
 국가법령정보센터에서 제공하는 신구법
비교는 시스템으로 자동 생성한 것으로
참고용으로만 이용하시기 바라며, 정확한
개정내용의 확인은 제·개정이유(제·개정문)
또는 관보를 확인해 주세요. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 출입국관리법 시행규칙 [시행 2026. 1. 23.] [법무부령 제1106호, 2026. 1. 23., 일부개정] 
 
 
 본문목록열림 본문 
 
 
 
 부칙목록열림 부칙 
 
 
 
 별표목록열림 별표 
 
 
 
 서식목록열림 서식 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문 
 제정·개정이유 
 별표·서식 
 연혁 
 3단비교 
 신구법비교 
 법령체계도 
 시행일/공포 서비스개선 : 시행,연혁(ancYnChk: 0=시행, 1=공포) 파라미터 추가 --> 
 법령비교 
 생활법령정보 
 조례위임조문 
 위임조례 
 한눈보기 
 원문다운로드 
 음성지원 
 점자뷰어 
 
 
 
 
 
 
 
 
 
 
 
 조문 선택 조문선택 
 화면내검색 
 새창 선택 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 


---

## chunk 2
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 조례위임조문 
 법령에서 자치법규로 위임한 사항이 있는
 조문의 목록을 제공하고 바로가기 기능을
 제공합니다. 
 
 
 
 위임조례 
 현재 보고있는 법에서 위임한 사항이 있는 자치법규에 대한 자치법규를 검색하여 목록을 제공합니다. 
 
 
 
 한눈에 이해되는 법령정보 
 법령 속 어려운 내용을 그림이나 표로 표현하여 알기 쉽게 제공합니다. 한눈보기는 법제처에서 제공하는 가공된 법령정보로 법령 그 자체는 아닙니다. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 | 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 

---

## chunk 3

 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 

---

## chunk 4

 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 

---

## chunk 5
HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 용지/폰트설정 
 
 
 범위설정 
 
 
 
 
 
 
 일부범위입력 
 
 
 
 시행령 연계 데이터를 보려면 전체를 선택해주세요 
 
 
 
 
 
 법령본문 
 
 
 
 
 전체 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 HWP파일 
 
 
 
 
 EXCEL파일 
 
 
 
 
 PDF파일 
 
 
 
 
 DOC파일 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

---

## chunk 6

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위임행정규칙 
 법률·대통령령·총리령·부령 등 상위법령에서 위임한 사항을
 훈령·예규·고시·공고 등의 형식으로 정하고 있는 행정규칙을 말합니다. 
 
 
 
 
 
 
 닫기
```

---

## A1B-055 immigration-rule-fees__candidate__f47b81203fa6

- 제목: [검토 후보] 출입국관리법 시행규칙 제71조·제72조 수수료
- sourceUrl: https://www.law.go.kr/LSW//lumLsLinkPop.do?chrClsCd=010202&lspttninfSeq=82731
- sourceType: official_law
- topic: cost
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-rule-fees
- supersededBy: 없음
- chunkCount: 6
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 28878
- extractedChars: 3036
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 시행규칙 제71조·제72조 수수료
source_url: https://www.law.go.kr/LSW//lumLsLinkPop.do?chrClsCd=010202&lspttninfSeq=82731
source_type: official_law
topic: cost
legal_priority: 3
monitor_cadence: daily
change_signals: content_hash
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 587d86a97fc259b55438c3b45928091f9f8682ada1b2a8f7ea5588e01af9898a
byte_length: 28878
extracted_chars: 3036

---

## chunk 1
연계정보 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 > 추가 --> 
 
 
 
 
 연계정보
 
 
 
 
 
 
 
 
 
 
 
 
 자동생성한 정보입니다, 참고용으로 사용하시기 바랍니다. --> 
 
 
 
 검색 
 
 
 
 
 
 
 
 
 
 
 
 1. 출입국관리법 시행규칙
 [시행 2026. 1. 23.] [법무부령 제1106호, 2026. 1. 23., 일부개정] 
 
 
 제71조 사증 등 발급신청 심사수수료 
 
 제72조 각종 허가 등에 관한 수수료 
 
 제73조 수수료의 납부방법 
 
 
 
 
 
 
 
 
 출입국관리법 시행규칙
 
 
 [시행 2026. 1. 23.] [법무부령 제1106호, 2026. 1. 23., 일부개정] 
 
 
 
 
 
 
 
 
 
 
 
 
   제71조(사증 등 발급신청 심사수수료) ① 사증발급신청에 대한 심사수수료( 제11조 제1항 에 해당하는 경우에는 개인별로 납부하는 수수료액을 말한다)는 다음과 같다. <개정 1998. 4. 1., 2002. 4. 27., 2010. 11. 16., 2013. 12. 23.> 
 
 1. 단수사증

가. 체류기간 90일 이하: 미합중국통화(이하 “미화”라 한다) 40불 상당의 금액

나. 체류기간 91일 이상: 미화 60불 상당의 금액 
 
 2. 복수사증

가. 2회까지 입국할 수 있는 복수사증: 미화 70불 상당의 금액

---

## chunk 2
나. 횟수에 제한 없이 입국할 수 있는 복수사증: 미화 90불 상당의 금액 
 
 ② 재외공관의 장이 외국인입국허가서를 발급하는 때의 심사수수료는 제1항의 규정에 의한 상당금액으로 한다. <개정 2002. 4. 27.> 
 
 ③ 재외공관의 장은 제1항 및 제2항의 수수료를 주재국의 통화로 징수하는 때에는 환시세의 변동을 고려하여 그 기준액을 정해야 한다. 이 경우 주재국의 공관이 둘 이상인 경우에는 대사가 이를 정한다. <개정 2022. 2. 7.> 
 
 ④ 재외공관의 장은 국제관례 또는 상호주의원칙에 비추어 제1항의 규정에 의한 수수료와 달리 정하고자 하는 때에는 법무부장관의 승인을 얻어야 한다. 
 
 [제목개정 2002. 4. 27.]

제72조(각종 허가 등에 관한 수수료) 외국인의 입국 및 체류와 관련된 허가 및 출입국사실증명 발급 등에 관한 수수료는 다음 각 호와 같다. <개정 2013. 1. 1., 2013. 12. 23., 2016. 9. 29., 2018. 5. 15., 2018. 9. 21., 2020. 12. 10., 2023. 6. 14., 2024. 12. 24.>

---

## chunk 3
1. 청장ㆍ사무소장 또는 출장소장이 하는 입국허가 또는 외국인 입국허가서 발급: 5만원. 다만, 영 제10조 제4항 단서에 해당하는 경우에는 10만원으로 한다. 
 
 1의2. 사전여행허가서 발급: 1만원 
 
 2. 체류자격 외 활동허가: 12만원. 다만, 영 별표 1의2 중 5. 유학(D-2) 또는 7. 일반연수(D-4) 체류자격을 가지고 있는 사람에 대한 시간제 취업 허용 등 법무부장관이 인정하는 경우에는 2만원으로 한다. 
 
 3. 근무처의 변경ㆍ추가 허가: 12만원 
 
 4. 체류자격부여: 8만원. 다만, 영 별표 1의2 중 27. 결혼이민(F-6) 체류자격에 해당하는 경우에는 4만원으로 한다. 
 
 5. 체류자격 변경 허가: 10만원. 다만, 영 별표 1의3 영주(F-5) 체류자격에 해당하는 경우에는 20만원으로 한다. 
 
 6. 체류기간 연장 허가: 6만원. 다만, 영 별표 1의2 중 27. 결혼이민(F-6) 체류자격을 가지고 있는 경우에는 3만원으로 한다. 
 
 7. 단수재입국허가: 3만원 
 
 8. 복수재입국허가: 5만원 
 
 9. 재입국허가기간 연장허가: 미화 20달러에 상당하는 금액 
 
 10. 외국인등록증 발급 및 재발급: 3만 5천원 
 
 10의2. 영주증 재발급: 3만 5천원 
 
 11. 출입국에 관한 사실증명: 2천원(1통당) 
 
 12. 외국인등록 사실증명의 발급 및 열람: 발급은 1통당 2천원, 열람은 1건 1회당 1천원 
 
 13. 난민여행증명서 발급 및 재발급: 1만원 
 
 14. 난민여행증명서 유효기간 연장허가: 미화 5달러에 상당하는 금액 
 
 1

---

## chunk 4
4의2. 법 제88조의3 에 따른 외국인체류확인서의 열람: 1건 1회당 300원 
 
 14의3. 법 제88조의3 에 따른 외국인체류확인서의 교부: 1통당 400원. 다만, 법 제88조의3 제2항 제3호 에 따른 외국인체류확인서 교부는 500원으로 한다. 
 
 15. 영 제15조 제4항 제1호 나목 에 해당하는 외국인의 자동출입국심사 등록: 법무부장관이 정하는 금액 
 
 [전문개정 2012. 2. 29.]

---

## chunk 5
제73조(수수료의 납부방법) 수수료의 납부방법은 다음 각 호와 같다. <개정 2004. 8. 23., 2010. 11. 16., 2012. 2. 29., 2012. 5. 25., 2016. 9. 29., 2018. 5. 15., 2020. 9. 25.>

1. 청, 사무소 또는 출장소에 납부하는 경우 : 해당 수수료 금액에 상당하는 수입인지 또는 정보통신망을 이용한 전자화폐ㆍ전자결제. 다만, 다음 각 목의 수수료는 그 목에서 정한 방법으로 납부하여야 한다.

가. 외국인등록증 발급 및 재발급 수수료: 현금 또는 현금 납입을 증명하는 증표

나. 영 제15조 제4항 제1호 나목 에 해당하는 외국인의 자동출입국심사 등록 수수료: 현금, 신용카드ㆍ직불카드 또는 정보통신망을 이용한 전자화폐ㆍ전자결제 중에서 법무부장관이 정하는 방법 
 
 2. 시ㆍ군ㆍ구 또는 읍ㆍ면ㆍ동에 납부하는 경우 : 해당 수수료 금액에 상당하는 수입증지 또는 정보통신망을 이용한 전자화폐ㆍ전자결제 
 
 3. 재외공관에 납부하는 경우 : 해당 수수료 금액에 상당하는 수입인지ㆍ현금 또는 현금의 납입을 증명하는 증표 
 
 [전문개정 2003. 9. 24.]

파일형식 선택 
 
 
 
 
 
 
 
 
 
 파일형식
 
 HWP PDF
```

---

## A1B-056 immigration-rule-stay-permission-review-criteria__candidate__bd619bfb5181

- 제목: [검토 후보] 출입국관리법 시행규칙 제31조의2 체류자격 부여 등 심사기준
- sourceUrl: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283059
- sourceType: official_law
- topic: legal
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: immigration-rule-stay-permission-review-criteria
- supersededBy: 없음
- chunkCount: 7
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 146250
- extractedChars: 4215
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 출입국관리법 시행규칙 제31조의2 체류자격 부여 등 심사기준
source_url: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283059
source_type: official_law
topic: legal
legal_priority: 3
monitor_cadence: daily
change_signals: review_criteria, article_9_2, article_31_2, status_grant, status_change, extension
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 0a526f8a84e224e3c106862ac689b7ce6b6ea5c82a66e714fb2c784290e518f7
byte_length: 146250
extracted_chars: 4215

---

## chunk 1
법령 > 본문 > 출입국관리법 시행규칙 | 국가법령정보센터 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령
 
 - 출입국관리법 시행규칙 
 
 (신구법 비교는 공포단위 서비스입니다) 
 
 
 
 
 
 
 신구법비교 
 국가법령정보센터에서 제공하는 신구법
비교는 시스템으로 자동 생성한 것으로
참고용으로만 이용하시기 바라며, 정확한
개정내용의 확인은 제·개정이유(제·개정문)
또는 관보를 확인해 주세요. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 출입국관리법 시행규칙 [시행 2026. 1. 23.] [법무부령 제1106호, 2026. 1. 23., 일부개정] 
 
 
 본문목록열림 본문 
 
 
 
 부칙목록열림 부칙 
 
 
 
 별표목록열림 별표 
 
 
 
 서식목록열림 서식 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문 
 제정·개정이유 
 별표·서식 
 연혁 
 3단비교 
 신구법비교 
 법령체계도 
 시행일/공포 서비스개선 : 시행,연혁(ancYnChk: 0=시행, 1=공포) 파라미터 추가 --> 
 법령비교 
 생활법령정보 
 조례위임조문 
 위임조례 
 한눈보기 
 원문다운로드 
 음성지원 
 점자뷰어 
 
 
 
 
 
 
 
 
 
 
 
 조문 선택 조문선택 
 화면내검색 
 새창 선택 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 


---

## chunk 2
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 조례위임조문 
 법령에서 자치법규로 위임한 사항이 있는
 조문의 목록을 제공하고 바로가기 기능을
 제공합니다. 
 
 
 
 위임조례 
 현재 보고있는 법에서 위임한 사항이 있는 자치법규에 대한 자치법규를 검색하여 목록을 제공합니다. 
 
 
 
 한눈에 이해되는 법령정보 
 법령 속 어려운 내용을 그림이나 표로 표현하여 알기 쉽게 제공합니다. 한눈보기는 법제처에서 제공하는 가공된 법령정보로 법령 그 자체는 아닙니다. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 카카오톡 
 
 페이스북 
 
 트위터 
 
 라인 
 
 주소복사 
 
 
 
 
 
 
 복사 | 
 돋보기 
 | 
 
 생활법령정보 
 | 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위로 
 
 아래로 
 
 검색조문선택 
 
 
 
 
 화면내검색 입력 폼 
 
 검색어 입력 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 
 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 모드 
 

---

## chunk 3

 전체저장 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 XLS(엑셀) 
 
 TXT(텍스트) 
 
 한글(본문) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP 
 
 HWPX 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 

---

## chunk 4

 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록 저장
 
 닫기 
 
 
 파일형식
 
 
 
 HWP(한글) 
 
 TXT(텍스트) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 본문저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 PDF 
 
 오피스(DOC) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 법령용어명 
 
 
 
 
 
 
 
 파일형식
 
 한글(HWP) PDF 
 오피스(DOC) --> 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 법령용어명 
 
 
 목록저장
 
 닫기 
 
 
 파일형식
 
 
 
 한글(HWP) 
 
 TXT(텍스트) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML HWP(한글) XLS(엑셀) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 

---

## chunk 5
HWP(한글) 
 
 XLS(엑셀) 
 
 PDF 
 
 DOC 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 파일형식 선택 
 
 
 
 
 
 
 
 
 파일형식
 
 HTML XLS(엑셀) HWP(한글) 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 내용저장
 
 닫기 
 
 
 파일형식
 
 
 
 HTML 
 
 HWP(한글) 
 
 XLS(엑셀) 
 
 
 
 
 
 저장 
 닫기 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 용지/폰트설정 
 
 
 범위설정 
 
 
 
 
 
 
 일부범위입력 
 
 
 
 시행령 연계 데이터를 보려면 전체를 선택해주세요 
 
 
 
 
 
 법령본문 
 
 
 
 
 전체 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 HWP파일 
 
 
 
 
 EXCEL파일 
 
 
 
 
 PDF파일 
 
 
 
 
 DOC파일 
 
 
 
 
 
 
 
 HTML파일 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

---

## chunk 6

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 위임행정규칙 
 법률·대통령령·총리령·부령 등 상위법령에서 위임한 사항을
 훈령·예규·고시·공고 등의 형식으로 정하고 있는 행정규칙을 말합니다. 
 
 
 
 
 
 
 닫기
```

---

## A1B-057 moj-e-arrival-card__candidate__bed737953ab0

- 제목: [검토 후보] 법무부 전자입국신고서(e-Arrival card)
- sourceUrl: https://www.immigration.go.kr/immigration/3509/subview.do
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-e-arrival-card
- supersededBy: 없음
- chunkCount: 10
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 222779
- extractedChars: 47022
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 법무부 전자입국신고서(e-Arrival card)
source_url: https://www.immigration.go.kr/immigration/3509/subview.do
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: e_arrival_card, arrival_card, submission_window, exemption, paper_card_transition, fee
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: f2500c356e1b1578cba2ae8bbb09270b555d6630912dff78436a59c514a4f8ff
byte_length: 222779
extracted_chars: 47022

전자입국신고서(e-Arrival card)

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

법무부 출입국·외국인정책본부

국가상징안내

법무부

ENGLISH

누리집 지도

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

---

## chunk 1
사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

---

## chunk 2
전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

누리집 지도 
 
 
 
 
 
 
 
 
 검색열기

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

검색닫기

메뉴열기 
 
 
 
 법무부

ENGLISH

누리집 지도

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

---

## chunk 3
소식지 &apos;공존&apos;

-->

정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

---

## chunk 4
전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

메뉴닫기

close

자주 찾는 메뉴

업무공지

채용공지

새소식

소속기관

법령

통계자료

보도자료

주요제도 -->
 주요제도

미디어자료

정보공개목록

이민정책

규제개선 -->
 규제개선

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기

URL 주소 
 
 
 
 URL 주소

복사

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

---

## chunk 5
질서있는 개방을 선도하고 국민과 외국인이 조화를 이루며 살아가는
 성숙한 다문화 환경을 조성하여 안정적인 사회통합을 이루어 나가겠습니다.

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

immigration_ms_S

---

## chunk 6
대한민국 전자입국신고(e-Arrival card)는 기존에 입국심사관에게 제출했던 종이 입국신고서를 대한민국 입국 전 온라인으로 작성하고 제출할 수 있도록 하는 제도입니다.

누가 작성해야 하나요?

전자입국신고서 작성 대상자는 종이 입국신고서 작성 대상자와 동일하며, 원칙적으로 모든 외국인은 입국신고서 작성 대상자입니다. 다만, 등록외국인, 유효한 전자여행허가(K-ETA)를 소지한 외국인, 항공기 승무원 등은 신고대상이 아닙니다.

어떻게 신고할 수 있나요?

대한민국 도착 3일전부터 전자입국신고 홈페이지( www.e-arrivalcard. go.kr )에서 작성·제출할 수 있으며, PC 또는 모바일웹으로 접속할 수 있습니다.
 
 제출정보는 여권정보, 입국정보, 출국정보, 입국목적, 체류예정지 및 연락처, 직업정보 등이며, 제출 후 72시간까지 유효합니다. 
 
 전자입국신고는 무료입니다. 대한민국 방문 전 온라인으로 입국신고서를 작성하면 간편하고 신속한 입국심사를 받으실 수 있습니다.
 
 보다 자세한 사항은 전자입국신고 공식 홈페이지( www.e-arrivalcard. go.kr )에서 확인하시기 바랍니다.

담당부서 : 
 
 
 
 전화번호 :

페이지 설문조사 양식 
 홈페이지의 서비스 품질 향상을 위해 만족도 조사를 실시하고 있습니다. 이 페이지에서 제공하는 정보에 대하여 얼마나 만족하셨습니까?

매우만족

만족

보통

불만족

매우불만족

실국본부운영

실국본부 홈페이지

범죄예방정책국

교정본부

출입국&middot;외국인정책본부

특수목적 홈페이지

공익신탁 공시시스템

대한민국 비자포털

---

## chunk 7
법률홈닥터

이로운법

사회통합정보망

솔로몬로파크(대전)

솔로몬로파크(부산)

스타트업 창업지원 법무플랫폼

자동출입국심사서비스 -->

자동출입국심사서비스

전자공증시스템

중소기업법률지원

통일법제데이터베이스

하이코리아 -->

하이코리아

형사사법포털

소속기관

법무연수원

법무연수원

대검찰청

대검찰청

광주고등검찰청

광주지방검찰청

광주지방검찰청 목포지청

광주지방검찰청 순천지청

광주지방검찰청 장흥지청

광주지방검찰청 해남지청

대구고등검찰청

대구지방검찰청

대구지방검찰청 경주지청

대구지방검찰청 김천지청

대구지방검찰청 상주지청

대구지방검찰청 안동지청

대구지방검찰청 영덕지청

대구지방검찰청 의성지청

대구지방검찰청 포항지청

대구지방검찰청 서부지청

대전고등검찰청

대전지방검찰청

대전지방검찰청 공주지청

대전지방검찰청 논산지청

대전지방검찰청 서산지청

대전지방검찰청 천안지청

대전지방검찰청 홍성지청

부산고등검찰청

부산지방검찰청

부산지방검찰청 동부지청

부산지방검찰청 서부지청

서울고등검찰청

서울중앙지방검찰청

서울남부지방검찰청

서울동부지방검찰청

서울북부지방검찰청

서울서부지방검찰청

의정부지방검찰청

의정부지방검찰청 고양지청

수원지방검찰청

수원지방검찰청 성남지청

수원지방검찰청 안산지청

수원지방검찰청 안양지청

수원지방검찰청 여주지청

수원지방검찰청 평택지청

울산지방검찰청

인천지방검찰청

인천지방검찰청 부천지청

전주지방검찰청

전주지방검찰청 군산지청

전주지방검찰청 남원지청

전주지방검찰청 정읍지청

제주지방검찰청

창원지방검찰청

창원지방검찰청 거창지청
```

---

## A1B-058 moj-e-arrival-card-notice__candidate__fb216c3681f5

- 제목: [검토 후보] 전자입국신고서 제도 시행 알림
- sourceUrl: https://www.immigration.go.kr/bbs/immigration/224/592036/artclView.do?layout=unknown
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-e-arrival-card-notice
- supersededBy: 없음
- chunkCount: 10
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 240815
- extractedChars: 45766
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 전자입국신고서 제도 시행 알림
source_url: https://www.immigration.go.kr/bbs/immigration/224/592036/artclView.do?layout=unknown
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: effective_date, submission_window, exemptions, group_submission, paper_card_transition
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 1349377ebe7654bcb556036f02bcd40536152fca5b974599ce4059f7e96f18e8
byte_length: 240815
extracted_chars: 45766

기타

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

법무부 출입국·외국인정책본부

국가상징안내

법무부

ENGLISH

누리집 지도

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

---

## chunk 1
-->

정보공개 청구

불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

---

## chunk 2
전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

누리집 지도 
 
 
 
 
 
 
 
 
 검색열기

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

검색닫기

메뉴열기 
 
 
 
 법무부

ENGLISH

누리집 지도

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

---

## chunk 3
소식지 &apos;공존&apos;

-->

정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

---

## chunk 4
전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

메뉴닫기

close

자주 찾는 메뉴

업무공지

채용공지

새소식

소속기관

법령

통계자료

보도자료

주요제도 -->
 주요제도

미디어자료

정보공개목록

이민정책

규제개선 -->
 규제개선

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기

URL 주소 
 
 
 
 URL 주소

복사

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

---

## chunk 5
질서있는 개방을 선도하고 국민과 외국인이 조화를 이루며 살아가는
 성숙한 다문화 환경을 조성하여 안정적인 사회통합을 이루어 나가겠습니다.

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

-->

카드뉴스

-->

인포그래픽

-->

웹툰

-->

동영상

-->

기타

immigration_ms_S

fnctId=bbs,fnctNo=224

전자입국신고서(e-Arrival card) 제도 시행 알림

-->

글번호 
 592036 
 
 
 -->
 
 
 
 
 
 작성일
 
 
 2025.02.18
 
 
 
 
 수정일
 
 
 2025.02.18
 
 -->
 
 
 조회수
 
 15695

첨부파일 
 
 
 
 
 
 
 
 
 
 
 
 
 전자입국신고 (e-Arrival card) 리플릿(영어).pdf

바로보기

전자입국신고 (e-Arrival card) 리플릿(일본어).pdf

바로보기

전자입국신고 (e-Arrival card) 리플릿(중국어).pdf

바로보기

전자입국신고 (e-Arrival card) 리플릿(국어).pdf

바로보기

전자입국신고 (e-Arrival card) 리플릿(베트남어).pdf

바로보기

---

## chunk 6
이전글
 
 
 
 
 
 
 
 
 
 
 
 요양기관 본인확인제도
 
 
 
 
 
 
 2024-06-13 09:45:12.0

다음글 
 
 
 
 
 
 
 
 
 
 
 제18회 세계인의 날 기념행사 개최 
 
 
 
 
 
 
 2025-04-23 16:41:54.0

법무부의 해당 저작물은 " 공공누리 1유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 2유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 3유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 4유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

담당부서 : 
 
 
 
 전화번호 :

페이지 설문조사 양식 
 홈페이지의 서비스 품질 향상을 위해 만족도 조사를 실시하고 있습니다. 이 페이지에서 제공하는 정보에 대하여 얼마나 만족하셨습니까?

매우만족

만족

보통

불만족

매우불만족

실국본부운영

실국본부 홈페이지

범죄예방정책국

교정본부

출입국&middot;외국인정책본부

특수목적 홈페이지

공익신탁 공시시스템

대한민국 비자포털

법률홈닥터

이로운법

사회통합정보망

솔로몬로파크(대전)

솔로몬로파크(부산)

스타트업 창업지원 법무플랫폼

자동출입국심사서비스 -->

자동출입국심사서비스

전자공증시스템

중소기업법률지원

통일법제데이터베이스

하이코리아 -->

하이코리아

형사사법포털

소속기관

법무연수원

법무연수원

대검찰청

대검찰청

광주고등검찰청

---

## chunk 7
광주지방검찰청

광주지방검찰청 목포지청

광주지방검찰청 순천지청

광주지방검찰청 장흥지청

광주지방검찰청 해남지청

대구고등검찰청

대구지방검찰청

대구지방검찰청 경주지청

대구지방검찰청 김천지청

대구지방검찰청 상주지청

대구지방검찰청 안동지청

대구지방검찰청 영덕지청

대구지방검찰청 의성지청

대구지방검찰청 포항지청

대구지방검찰청 서부지청

대전고등검찰청

대전지방검찰청

대전지방검찰청 공주지청

대전지방검찰청 논산지청

대전지방검찰청 서산지청

대전지방검찰청 천안지청

대전지방검찰청 홍성지청

부산고등검찰청

부산지방검찰청

부산지방검찰청 동부지청

부산지방검찰청 서부지청

서울고등검찰청

서울중앙지방검찰청

서울남부지방검찰청

서울동부지방검찰청

서울북부지방검찰청

서울서부지방검찰청

의정부지방검찰청

의정부지방검찰청 고양지청

수원지방검찰청

수원지방검찰청 성남지청

수원지방검찰청 안산지청

수원지방검찰청 안양지청

수원지방검찰청 여주지청

수원지방검찰청 평택지청

울산지방검찰청

인천지방검찰청

인천지방검찰청 부천지청

전주지방검찰청

전주지방검찰청 군산지청

전주지방검찰청 남원지청

전주지방검찰청 정읍지청

제주지방검찰청

창원지방검찰청

창원지방검찰청 거창지청

창원지방검찰청 마산지청

창원지방검찰청 밀양지청

창원지방검찰청 진주지청

창원지방검찰청 통영지청

청주지방검찰청

청주지방검찰청 영동지청

청주지방검찰청 제천지청

청주지방검찰청 충주지청

춘천지방검찰청

춘천지방검찰청 강릉지청

춘천지방검찰청 속초지청

춘천지방검찰청 영월지청

춘천지방검찰청 원주지청

산하기관 관련 단체
```

---

## A1B-059 moj-e7-wage-requirement-2026__candidate__6a302e277d50

- 제목: [검토 후보] 2026년 특정활동(E-7) 체류자격 임금요건 기준
- sourceUrl: https://www.immigration.go.kr/bbs/moj/184/601893/artclView.do?layout=unknown
- sourceType: official_government
- topic: visa
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-e7-wage-requirement-2026
- supersededBy: 없음
- chunkCount: 13
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 258391
- extractedChars: 51010
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 2026년 특정활동(E-7) 체류자격 임금요건 기준
source_url: https://www.immigration.go.kr/bbs/moj/184/601893/artclView.do?layout=unknown
source_type: official_government
topic: visa
legal_priority: 4
monitor_cadence: daily
change_signals: e7, wage_requirement, public_notice, attachment, effective_year
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 7ec0aa355522863738c8d12bc88ff5e8954db6daa42fca1f00cb007a3e4627d8
byte_length: 258391
extracted_chars: 51010

공지사항

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

국가상징안내

어린이

ENGLISH

SNS 
 
 
 인스타그램

스레드

페이스북

엑스

유튜브

네이버 블로그

티스토리

법무부

통합검색

통합검색

검색어를 입력해주세요

전체 
 메뉴 
 기관 
 직원 
 게시판 
 웹페이지 
 뉴스소식 
 자료

-->
 
 
 검색어 삭제 
 
 
 검색 버튼

인기 검색어

주간

일간

주간 검색어

일간 검색어

최근검색어

최근검색어 전체 삭제

최근검색어 전체 삭제 
 
 
 -->

자동완성 닫기

닫기

---

## chunk 1
전체메뉴

어린이

ENGLISH

본인인증 해제

-->

온라인민원

열기

-->

교도소·구치소

교도소·구치소

-->

일반접견 예약

-->

화상접견 예약

-->

스마트접견 예약

-->

접견예약 확인

-->

변호인접견 예약

-->

변호인화상접견 예약

-->

변호인접견예약 확인

-->

보관금 조회

-->

반입도서 관리

-->

수용·출소 증명서발급

보호관찰소·소년원·분류심사원·국립법무병원

보호관찰소·소년원·분류심사원·국립법무병원

-->

소년보호 편지쓰기

-->

소년보호 증명발급

-->

국립법무병원 대면면회 예약

-->

국립법무병원 화상면회 예약

-->

사회봉사 국민공모

사증·출입국·체류·국적

사증·출입국·체류·국적

-->

출입국 전자민원(하이코리아)

-->

출입국사무소 방문예약

-->

사증발급 인정서 결과조회

-->

출입국 사실증명 발급

-->

외국인등록 사실증명 발급

-->

국내거소신고 발급

-->

국적선택신고 발급

-->

국적이탈신고 발급

변호사시험·사법시험

변호사시험·사법시험

-->

변호사시험 합격증명 발급

-->

사법시험 합격증명 발급

정보공개/개방

열기

-->

정보공개청구 안내

정보공개청구 안내

-->

정보공개제도

-->

수수료 안내

사전정보공표

사전정보공표

-->

공표대상 법무행정정보의 목록

-->

주요정책 추진과정 공개

-->

행정자료실

정보목록

정보목록

-->

정보목록(24년 7월 ~)

-->

정보목록(06년 1월 ~ 24년 6월)

정보공개 청구

---

## chunk 2
-->

공개여부 및 불복 신청 사례

-->

정책실명제

정책실명제

-->

국민신청실명제

-->

정책실명 공개과제

공공데이터 개방

공공데이터 개방

-->

공공데이터 개방 현황

-->

공공데이터 개방 알림

-->

공공데이터 신청 사례

-->

공공데이터 오류신고/수요조사

-->

한눈에 보는 법무 공공데이터

청렴자료공개

청렴자료공개

-->

반부패 청렴자료

-->

감사계획·결과

-->

수의계약 현황

-->

업무추진비

-->

부패행위현황

국고보조금

-->

비공개 대상 정보안내

법무정책서비스

열기

-->

국정과제

-->

법무/검찰

법무/검찰

-->

주택임대차법령정보

-->

상가건물임대차법령정보

-->

공증

-->

재외공관공증

-->

법무법인

-->

마을변호사

-->

국제법무지원

-->

법률시장 개방

-->

국제아동탈취

-->

송무업무

-->

신고포상금제 지급

-->

남북관계

-->

중소기업 법률지원

-->

공익신탁제도

-->

무죄재판서게재

범죄예방

범죄예방

-->

법교육

-->

사회봉사 국민공모제

-->

전자감독제도

-->

범죄예방 환경개선사업

-->

신상정보 등록제도

-->

전자보석제도

-->

전자장치 부착 잠정조치

-->

전자감독 피해자 보호 시스템

-->

수강명령제도

인권

인권

-->

국가인권정책기본계획

-->

국제인권규범

-->

국제인권뉴스레터

-->

인권보호제도

-->

범죄피해자 보호·지원제도

-->

---

## chunk 3
범죄피해자 원스톱 솔루션 센터

-->

인권정책자료실

-->

인권침해신고센터

교정

교정

-->

교정직 경력경쟁채용시험

-->

수형자 집중인성교육

-->

구인·구직 만남의 날(채용면접)

-->

스마트접견제도

-->

교정시설 원격의료시스템

-->

심리치료프로그램 운영

-->

교정민원콜센터

-->

교정정보 빅데이터 시각화

출입국·외국인

출입국·외국인

-->

출입국관리직 경력경쟁채용시험

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금 ･ 건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

외국인보호위원회

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

시험정보

시험정보

-->

변호사시험

-->

법조윤리시험

-->

사법시험

-->

시험자료실

-->

참여마당

정책참여

정책참여

-->

전자공청회

-->

국민생각함

법령/자료

열기

-->

법령정보

법령정보

-->

훈령

-->

예규

-->

고시

-->

입법 예고

-->

행정 예고

-->

개정 법령

-->

소관 법령

-->

---

## chunk 4
가이드라인(지침)

통계정보

통계정보

-->

통계자료

-->

교정통계

-->

출입국통계

-->

e-나라지표

자료실

자료실

-->

업무자료

-->

간행물

-->

국회관련자료

-->

재정정보

해외자료

해외자료

-->

해외 법제 자료 및 최신 동향

-->

투자분쟁 관련 자료

법무뉴스

열기

-->

보도자료

보도자료

-->

보도자료

-->

보도설명자료

공지사항

공지사항

-->

공지사항

-->

법무행사

-->

입찰정보

채용정보

-->

홍보자료

홍보자료

-->

동영상

-->

카드뉴스

-->

웹툰/정보 그림

-->

홍보책자

-->

소식지

-->

맞춤형 관심분야

-->

정부 출범 1주년 성과 기획 콘텐츠

국정성과 홍보자료

-->

국정성과 홍보자료

국민참여

열기

-->

포상참여

포상참여

-->

포상대상자공개

제안합니다

제안합니다

-->

제안합니다

신고센터

신고센터

-->

보조금 부조리 신고

-->

공직퇴임변호사 수임제한 위반 신고

-->

인권침해 신고

-->

부조리 신고

-->

부조리 신고(익명)

-->

비리공직자 내부공익 신고

-->

예산낭비 신고

-->

예산절감 제안신청

-->

변호사·공증 신문고

-->

비영리법인 부정비리 신고

-->

공익신고

-->

안전신고

-->

채용비리신고

규제개혁

규제개혁

-->

자료마당

-->

알림마당

-->

규제혁파 과제

-->

정부입법

-->

부처별 보도자료

-->

부처별 규제

-->

---

## chunk 5
규제혁신 홍보자료

-->

규제정보포털

-->

규제개혁신문고

-->

규제입증요청

적극행정

적극행정

-->

제도소개

-->

국민참여

-->

적극행정 소송지원

-->

적극행정 자료실

-->

적극행정 우수사례

협동조합 경영공시

-->

청렴생각함

법무부 소개

열기

-->

장관소개

-->

차관소개

차관소개

-->

약력

-->

역대차관

기관소개

기관소개

-->

비전과 임무

-->

예산

-->

연혁

-->

상징

-->

브랜드

조직과 기능

조직과 기능

-->

본부

-->

소속기관/검찰청

-->

산하기관

-->

직원검색

청사안내

청사안내

-->

층별안내

-->

찾아오시는길

누리집 안내

열기

-->

누리집 이용안내

-->

누리집 지도

-->

개인정보처리방침

개인정보처리방침

-->

이전 개인정보처리방침

알기쉬운 개인정보처리방침

-->

정보주체 권리보장

-->

저작권정책

-->

뷰어프로그램내려받기

-->

홈페이지 개선의견

-->

전화번호안내

-->

법무부 통합검색

누리집 지도 
 
 
 메뉴닫기

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기 
 
 
 페이스북

엑스

카카오스토리 
 
 핀터레스트 
 
 
 
 
 
 
 URL 주소 
 
 
 
 URL 주소

복사

닫기

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

---

## chunk 6
초기화

-->

국민의 나라, 정의로운 대한민국! 공정하고 정의로운, 인권이 존중받는 사회!

법무부가 함께합니다. 
 --->

법무뉴스

-->

보도자료

보도자료

-->

보도자료

-->

보도설명자료

공지사항

공지사항

-->

공지사항

-->

법무행사

-->

입찰정보

채용정보

-->

홍보자료

홍보자료

-->

동영상

-->

카드뉴스

-->

웹툰/정보 그림

-->

홍보책자

-->

소식지

-->

맞춤형 관심분야

-->

정부 출범 1주년 성과 기획 콘텐츠

국정성과 홍보자료

-->

국정성과 홍보자료

moj_ms_S

fnctId=bbs,fnctNo=184

2026년 특정활동(E-7) 체류자격 임금요건 기준 공고

-->

글번호 
 601893 
 
 
 -->
 
 
 
 
 
 작성일
 
 
 2025.12.29
 
 
 
 
 수정일
 
 
 2025.12.29
 
 -->
 
 
 조회수
 
 15397

담당부서 
 
 
 체류관리과

담당자 
 
 
 출입국대표

전화번호 
 
 
 0221104492

공공누리 
 
 
 4유형

2026년 특정활동(E-7) 체류자격 임금요건 기준 공고

[법무부 공고 2025-406호]

2026년 특정활동(E-7) 체류자격 임금요건을 붙이과 같이 공지합니다.

첨부파일 
 
 
 
 
 
 
 
 
 
 
 
 
 
 [법무부 공고 2025-406호] 2026년 특정활동(E-7) 체류자격 임금요건 기준 공고.pdf

바로보기 
 바로듣기

---

## chunk 7
이전글
 
 
 
 
 
 
 
 
 
 
 
 결혼동거 목적의 사증 발급에 필요한 요건 및 심사면제 기준 고시(법무부고시 제2025-534호)
 
 
 
 
 
 
 2025-12-26 17:38:23.0

다음글 
 
 
 
 
 
 
 
 
 
 
 [출입국‧외국인정책본부] 2025년 외국인고용실태조사(농업, 제조업분야) 보고서(25.12.29)
 
 
 
 
 
 
 2026-01-02 08:13:31.0

법무부의 해당 저작물은 " 공공누리 0유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 1유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 2유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 3유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 4유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 AI유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

담당부서 : 
 
 
 
 전화번호 :

페이지 설문조사 양식 
 홈페이지의 서비스 품질 향상을 위해 만족도 조사를 실시하고 있습니다. 이 페이지에서 제공하는 정보에 대하여 얼마나 만족하셨습니까?

매우만족

만족

보통

불만족

매우불만족
```

---

## A1B-060 moj-f4-employment-restriction-preannouncement__candidate__3419a3323b68

- 제목: [검토 후보] 재외동포(F-4) 취업활동 제한범위 고시 행정예고
- sourceUrl: https://www.immigration.go.kr/bbs/moj/184/602340/artclView.do?layout=unknown
- sourceType: official_government
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-f4-employment-restriction-preannouncement
- supersededBy: 없음
- chunkCount: 13
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 263646
- extractedChars: 51443
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 재외동포(F-4) 취업활동 제한범위 고시 행정예고
source_url: https://www.immigration.go.kr/bbs/moj/184/602340/artclView.do?layout=unknown
source_type: official_government
topic: warning
legal_priority: 4
monitor_cadence: daily
change_signals: f4, employment_restriction, administrative_preannouncement, attachment, comment_period
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: c327807aab959f0e7b4a657e7a22dce8a12b05342bb71d5c03b3c9ed19ebb699
byte_length: 263646
extracted_chars: 51443

공지사항

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

국가상징안내

어린이

ENGLISH

SNS 
 
 
 인스타그램

스레드

페이스북

엑스

유튜브

네이버 블로그

티스토리

법무부

통합검색

통합검색

검색어를 입력해주세요

전체 
 메뉴 
 기관 
 직원 
 게시판 
 웹페이지 
 뉴스소식 
 자료

-->
 
 
 검색어 삭제 
 
 
 검색 버튼

인기 검색어

주간

일간

주간 검색어

일간 검색어

최근검색어

최근검색어 전체 삭제

---

## chunk 1
최근검색어 전체 삭제 
 
 
 -->

자동완성 닫기

닫기

전체메뉴

어린이

ENGLISH

본인인증 해제

-->

온라인민원

열기

-->

교도소·구치소

교도소·구치소

-->

일반접견 예약

-->

화상접견 예약

-->

스마트접견 예약

-->

접견예약 확인

-->

변호인접견 예약

-->

변호인화상접견 예약

-->

변호인접견예약 확인

-->

보관금 조회

-->

반입도서 관리

-->

수용·출소 증명서발급

보호관찰소·소년원·분류심사원·국립법무병원

보호관찰소·소년원·분류심사원·국립법무병원

-->

소년보호 편지쓰기

-->

소년보호 증명발급

-->

국립법무병원 대면면회 예약

-->

국립법무병원 화상면회 예약

-->

사회봉사 국민공모

사증·출입국·체류·국적

사증·출입국·체류·국적

-->

출입국 전자민원(하이코리아)

-->

출입국사무소 방문예약

-->

사증발급 인정서 결과조회

-->

출입국 사실증명 발급

-->

외국인등록 사실증명 발급

-->

국내거소신고 발급

-->

국적선택신고 발급

-->

국적이탈신고 발급

변호사시험·사법시험

변호사시험·사법시험

-->

변호사시험 합격증명 발급

-->

사법시험 합격증명 발급

정보공개/개방

열기

-->

정보공개청구 안내

정보공개청구 안내

-->

정보공개제도

-->

수수료 안내

사전정보공표

사전정보공표

-->

공표대상 법무행정정보의 목록

-->

주요정책 추진과정 공개

-->

행정자료실

정보목록

정보목록

-->

정보목록(24년 7월 ~)

---

## chunk 2
-->

정보목록(06년 1월 ~ 24년 6월)

정보공개 청구

-->

공개여부 및 불복 신청 사례

-->

정책실명제

정책실명제

-->

국민신청실명제

-->

정책실명 공개과제

공공데이터 개방

공공데이터 개방

-->

공공데이터 개방 현황

-->

공공데이터 개방 알림

-->

공공데이터 신청 사례

-->

공공데이터 오류신고/수요조사

-->

한눈에 보는 법무 공공데이터

청렴자료공개

청렴자료공개

-->

반부패 청렴자료

-->

감사계획·결과

-->

수의계약 현황

-->

업무추진비

-->

부패행위현황

국고보조금

-->

비공개 대상 정보안내

법무정책서비스

열기

-->

국정과제

-->

법무/검찰

법무/검찰

-->

주택임대차법령정보

-->

상가건물임대차법령정보

-->

공증

-->

재외공관공증

-->

법무법인

-->

마을변호사

-->

국제법무지원

-->

법률시장 개방

-->

국제아동탈취

-->

송무업무

-->

신고포상금제 지급

-->

남북관계

-->

중소기업 법률지원

-->

공익신탁제도

-->

무죄재판서게재

범죄예방

범죄예방

-->

법교육

-->

사회봉사 국민공모제

-->

전자감독제도

-->

범죄예방 환경개선사업

-->

신상정보 등록제도

-->

전자보석제도

-->

전자장치 부착 잠정조치

-->

전자감독 피해자 보호 시스템

-->

수강명령제도

인권

인권

-->

국가인권정책기본계획

-->

국제인권규범

-->

국제인권뉴스레터

-->

인권보호제도

-->

---

## chunk 3
범죄피해자 보호·지원제도

-->

범죄피해자 원스톱 솔루션 센터

-->

인권정책자료실

-->

인권침해신고센터

교정

교정

-->

교정직 경력경쟁채용시험

-->

수형자 집중인성교육

-->

구인·구직 만남의 날(채용면접)

-->

스마트접견제도

-->

교정시설 원격의료시스템

-->

심리치료프로그램 운영

-->

교정민원콜센터

-->

교정정보 빅데이터 시각화

출입국·외국인

출입국·외국인

-->

출입국관리직 경력경쟁채용시험

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금 ･ 건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

외국인보호위원회

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

시험정보

시험정보

-->

변호사시험

-->

법조윤리시험

-->

사법시험

-->

시험자료실

-->

참여마당

정책참여

정책참여

-->

전자공청회

-->

국민생각함

법령/자료

열기

-->

법령정보

법령정보

-->

훈령

-->

예규

-->

고시

-->

입법 예고

-->

행정 예고

-->

개정 법령

---

## chunk 4
-->

소관 법령

-->

가이드라인(지침)

통계정보

통계정보

-->

통계자료

-->

교정통계

-->

출입국통계

-->

e-나라지표

자료실

자료실

-->

업무자료

-->

간행물

-->

국회관련자료

-->

재정정보

해외자료

해외자료

-->

해외 법제 자료 및 최신 동향

-->

투자분쟁 관련 자료

법무뉴스

열기

-->

보도자료

보도자료

-->

보도자료

-->

보도설명자료

공지사항

공지사항

-->

공지사항

-->

법무행사

-->

입찰정보

채용정보

-->

홍보자료

홍보자료

-->

동영상

-->

카드뉴스

-->

웹툰/정보 그림

-->

홍보책자

-->

소식지

-->

맞춤형 관심분야

-->

정부 출범 1주년 성과 기획 콘텐츠

국정성과 홍보자료

-->

국정성과 홍보자료

국민참여

열기

-->

포상참여

포상참여

-->

포상대상자공개

제안합니다

제안합니다

-->

제안합니다

신고센터

신고센터

-->

보조금 부조리 신고

-->

공직퇴임변호사 수임제한 위반 신고

-->

인권침해 신고

-->

부조리 신고

-->

부조리 신고(익명)

-->

비리공직자 내부공익 신고

-->

예산낭비 신고

-->

예산절감 제안신청

-->

변호사·공증 신문고

-->

비영리법인 부정비리 신고

-->

공익신고

-->

안전신고

-->

채용비리신고

규제개혁

규제개혁

-->

자료마당

-->

알림마당

-->

규제혁파 과제

-->

정부입법

-->

부처별 보도자료

---

## chunk 5
-->

부처별 규제

-->

규제혁신 홍보자료

-->

규제정보포털

-->

규제개혁신문고

-->

규제입증요청

적극행정

적극행정

-->

제도소개

-->

국민참여

-->

적극행정 소송지원

-->

적극행정 자료실

-->

적극행정 우수사례

협동조합 경영공시

-->

청렴생각함

법무부 소개

열기

-->

장관소개

-->

차관소개

차관소개

-->

약력

-->

역대차관

기관소개

기관소개

-->

비전과 임무

-->

예산

-->

연혁

-->

상징

-->

브랜드

조직과 기능

조직과 기능

-->

본부

-->

소속기관/검찰청

-->

산하기관

-->

직원검색

청사안내

청사안내

-->

층별안내

-->

찾아오시는길

누리집 안내

열기

-->

누리집 이용안내

-->

누리집 지도

-->

개인정보처리방침

개인정보처리방침

-->

이전 개인정보처리방침

알기쉬운 개인정보처리방침

-->

정보주체 권리보장

-->

저작권정책

-->

뷰어프로그램내려받기

-->

홈페이지 개선의견

-->

전화번호안내

-->

법무부 통합검색

누리집 지도 
 
 
 메뉴닫기

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기 
 
 
 페이스북

엑스

카카오스토리 
 
 핀터레스트 
 
 
 
 
 
 
 URL 주소 
 
 
 
 URL 주소

복사

닫기

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

---

## chunk 6
현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

국민의 나라, 정의로운 대한민국! 공정하고 정의로운, 인권이 존중받는 사회!

법무부가 함께합니다. 
 --->

법무뉴스

-->

보도자료

보도자료

-->

보도자료

-->

보도설명자료

공지사항

공지사항

-->

공지사항

-->

법무행사

-->

입찰정보

채용정보

-->

홍보자료

홍보자료

-->

동영상

-->

카드뉴스

-->

웹툰/정보 그림

-->

홍보책자

-->

소식지

-->

맞춤형 관심분야

-->

정부 출범 1주년 성과 기획 콘텐츠

국정성과 홍보자료

-->

국정성과 홍보자료

moj_ms_S

fnctId=bbs,fnctNo=184

「재외동포(F-4) 자격의 취업활동 제한범위 고시」 행정예고

-->

글번호 
 602340 
 
 
 -->
 
 
 
 
 
 작성일
 
 
 2026.01.08
 
 
 
 
 수정일
 
 
 2026.01.09
 
 -->
 
 
 조회수
 
 10118

담당부서 
 
 
 동포체류통합과

담당자 
 
 
 장다정

전화번호 
 
 
 02-2110-4147

공공누리 
 
 
 4유형

법무부 공고 제2026-2호

「재외동포(F-4) 자격의 취업활동 제한범위 고시」 행정예고

---

## chunk 7
재외동포(F-4) 자격의 취업활동 제한 범위 고시 행정예고 관련, 그 이유와 주요 내용을 국민에게 미리 알려 이에 대한 의견을 듣기 위하여 「행정절차법」제46조에 따라 다음과 같이 다음과 같이 공고합니다.

2026년 1월 9일

법무부 장관

[붙임1] 행정예고(재외동포(F-4) 자격의 취업활동 제한범위 고시)

[붙임2] 개정본문(재외동포(F-4) 자격의 취업활동 제한범위 고시)

[붙임3] 신구조문대비표(재외동포(F-4) 자격의 취업활동 제한범위 고시)

첨부파일 
 
 
 
 
 
 
 
 
 
 
 
 
 
 [붙임1] 행정예고(재외동포(F-4) 자격의 취업활동 제한범위 고시).pdf

바로보기 
 바로듣기

[붙임2] 개정본문(재외동포(F-4) 자격의 취업활동 제한범위 고시).pdf

바로보기 
 바로듣기

[붙임3] 신·구조문대비표(재외동포(F-4) 자격의 취업활동 제한범위 고시) 수정본.pdf

바로보기 
 바로듣기

이전글
 
 
 
 
 
 
 
 
 
 
 
 제19회 세계인의 날 기념 사회통합 업무 유공 정부포상 후보자 공모
 
 
 
 
 
 
 2026-01-07 15:53:32.0

다음글 
 
 
 
 
 
 
 
 
 
 
 공증인 모집 공고
 
 
 
 
 
 
 2026-01-09 08:04:40.0

법무부의 해당 저작물은 " 공공누리 0유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 1유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.
```

---

## A1B-061 moj-f6-marriage-visa-criteria__candidate__fe05ff0141fc

- 제목: [검토 후보] 결혼동거 목적 사증 발급 요건·심사면제 기준 고시
- sourceUrl: https://www.immigration.go.kr/bbs/moj/184/601864/artclView.do?layout=unknown
- sourceType: official_government
- topic: visa
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-f6-marriage-visa-criteria
- supersededBy: 없음
- chunkCount: 13
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 259124
- extractedChars: 51051
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 결혼동거 목적 사증 발급 요건·심사면제 기준 고시
source_url: https://www.immigration.go.kr/bbs/moj/184/601864/artclView.do?layout=unknown
source_type: official_government
topic: visa
legal_priority: 4
monitor_cadence: daily
change_signals: f6, marriage_visa, ministry_notice, exemption_standard, attachment
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: d24083f50bb06a2abb7617b2a254e6c0b114bafc021b65baf9254c467f10883e
byte_length: 259124
extracted_chars: 51051

공지사항

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

국가상징안내

어린이

ENGLISH

SNS 
 
 
 인스타그램

스레드

페이스북

엑스

유튜브

네이버 블로그

티스토리

법무부

통합검색

통합검색

검색어를 입력해주세요

전체 
 메뉴 
 기관 
 직원 
 게시판 
 웹페이지 
 뉴스소식 
 자료

-->
 
 
 검색어 삭제 
 
 
 검색 버튼

인기 검색어

주간

일간

주간 검색어

일간 검색어

최근검색어

최근검색어 전체 삭제

최근검색어 전체 삭제 
 
 
 -->

자동완성 닫기

닫기

---

## chunk 1
전체메뉴

어린이

ENGLISH

본인인증 해제

-->

온라인민원

열기

-->

교도소·구치소

교도소·구치소

-->

일반접견 예약

-->

화상접견 예약

-->

스마트접견 예약

-->

접견예약 확인

-->

변호인접견 예약

-->

변호인화상접견 예약

-->

변호인접견예약 확인

-->

보관금 조회

-->

반입도서 관리

-->

수용·출소 증명서발급

보호관찰소·소년원·분류심사원·국립법무병원

보호관찰소·소년원·분류심사원·국립법무병원

-->

소년보호 편지쓰기

-->

소년보호 증명발급

-->

국립법무병원 대면면회 예약

-->

국립법무병원 화상면회 예약

-->

사회봉사 국민공모

사증·출입국·체류·국적

사증·출입국·체류·국적

-->

출입국 전자민원(하이코리아)

-->

출입국사무소 방문예약

-->

사증발급 인정서 결과조회

-->

출입국 사실증명 발급

-->

외국인등록 사실증명 발급

-->

국내거소신고 발급

-->

국적선택신고 발급

-->

국적이탈신고 발급

변호사시험·사법시험

변호사시험·사법시험

-->

변호사시험 합격증명 발급

-->

사법시험 합격증명 발급

정보공개/개방

열기

-->

정보공개청구 안내

정보공개청구 안내

-->

정보공개제도

-->

수수료 안내

사전정보공표

사전정보공표

-->

공표대상 법무행정정보의 목록

-->

주요정책 추진과정 공개

-->

행정자료실

정보목록

정보목록

-->

정보목록(24년 7월 ~)

-->

정보목록(06년 1월 ~ 24년 6월)

정보공개 청구

---

## chunk 2
-->

공개여부 및 불복 신청 사례

-->

정책실명제

정책실명제

-->

국민신청실명제

-->

정책실명 공개과제

공공데이터 개방

공공데이터 개방

-->

공공데이터 개방 현황

-->

공공데이터 개방 알림

-->

공공데이터 신청 사례

-->

공공데이터 오류신고/수요조사

-->

한눈에 보는 법무 공공데이터

청렴자료공개

청렴자료공개

-->

반부패 청렴자료

-->

감사계획·결과

-->

수의계약 현황

-->

업무추진비

-->

부패행위현황

국고보조금

-->

비공개 대상 정보안내

법무정책서비스

열기

-->

국정과제

-->

법무/검찰

법무/검찰

-->

주택임대차법령정보

-->

상가건물임대차법령정보

-->

공증

-->

재외공관공증

-->

법무법인

-->

마을변호사

-->

국제법무지원

-->

법률시장 개방

-->

국제아동탈취

-->

송무업무

-->

신고포상금제 지급

-->

남북관계

-->

중소기업 법률지원

-->

공익신탁제도

-->

무죄재판서게재

범죄예방

범죄예방

-->

법교육

-->

사회봉사 국민공모제

-->

전자감독제도

-->

범죄예방 환경개선사업

-->

신상정보 등록제도

-->

전자보석제도

-->

전자장치 부착 잠정조치

-->

전자감독 피해자 보호 시스템

-->

수강명령제도

인권

인권

-->

국가인권정책기본계획

-->

국제인권규범

-->

국제인권뉴스레터

-->

인권보호제도

-->

범죄피해자 보호·지원제도

-->

---

## chunk 3
범죄피해자 원스톱 솔루션 센터

-->

인권정책자료실

-->

인권침해신고센터

교정

교정

-->

교정직 경력경쟁채용시험

-->

수형자 집중인성교육

-->

구인·구직 만남의 날(채용면접)

-->

스마트접견제도

-->

교정시설 원격의료시스템

-->

심리치료프로그램 운영

-->

교정민원콜센터

-->

교정정보 빅데이터 시각화

출입국·외국인

출입국·외국인

-->

출입국관리직 경력경쟁채용시험

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금 ･ 건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

외국인보호위원회

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

시험정보

시험정보

-->

변호사시험

-->

법조윤리시험

-->

사법시험

-->

시험자료실

-->

참여마당

정책참여

정책참여

-->

전자공청회

-->

국민생각함

법령/자료

열기

-->

법령정보

법령정보

-->

훈령

-->

예규

-->

고시

-->

입법 예고

-->

행정 예고

-->

개정 법령

-->

소관 법령

-->

---

## chunk 4
가이드라인(지침)

통계정보

통계정보

-->

통계자료

-->

교정통계

-->

출입국통계

-->

e-나라지표

자료실

자료실

-->

업무자료

-->

간행물

-->

국회관련자료

-->

재정정보

해외자료

해외자료

-->

해외 법제 자료 및 최신 동향

-->

투자분쟁 관련 자료

법무뉴스

열기

-->

보도자료

보도자료

-->

보도자료

-->

보도설명자료

공지사항

공지사항

-->

공지사항

-->

법무행사

-->

입찰정보

채용정보

-->

홍보자료

홍보자료

-->

동영상

-->

카드뉴스

-->

웹툰/정보 그림

-->

홍보책자

-->

소식지

-->

맞춤형 관심분야

-->

정부 출범 1주년 성과 기획 콘텐츠

국정성과 홍보자료

-->

국정성과 홍보자료

국민참여

열기

-->

포상참여

포상참여

-->

포상대상자공개

제안합니다

제안합니다

-->

제안합니다

신고센터

신고센터

-->

보조금 부조리 신고

-->

공직퇴임변호사 수임제한 위반 신고

-->

인권침해 신고

-->

부조리 신고

-->

부조리 신고(익명)

-->

비리공직자 내부공익 신고

-->

예산낭비 신고

-->

예산절감 제안신청

-->

변호사·공증 신문고

-->

비영리법인 부정비리 신고

-->

공익신고

-->

안전신고

-->

채용비리신고

규제개혁

규제개혁

-->

자료마당

-->

알림마당

-->

규제혁파 과제

-->

정부입법

-->

부처별 보도자료

-->

부처별 규제

-->

---

## chunk 5
규제혁신 홍보자료

-->

규제정보포털

-->

규제개혁신문고

-->

규제입증요청

적극행정

적극행정

-->

제도소개

-->

국민참여

-->

적극행정 소송지원

-->

적극행정 자료실

-->

적극행정 우수사례

협동조합 경영공시

-->

청렴생각함

법무부 소개

열기

-->

장관소개

-->

차관소개

차관소개

-->

약력

-->

역대차관

기관소개

기관소개

-->

비전과 임무

-->

예산

-->

연혁

-->

상징

-->

브랜드

조직과 기능

조직과 기능

-->

본부

-->

소속기관/검찰청

-->

산하기관

-->

직원검색

청사안내

청사안내

-->

층별안내

-->

찾아오시는길

누리집 안내

열기

-->

누리집 이용안내

-->

누리집 지도

-->

개인정보처리방침

개인정보처리방침

-->

이전 개인정보처리방침

알기쉬운 개인정보처리방침

-->

정보주체 권리보장

-->

저작권정책

-->

뷰어프로그램내려받기

-->

홈페이지 개선의견

-->

전화번호안내

-->

법무부 통합검색

누리집 지도 
 
 
 메뉴닫기

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기 
 
 
 페이스북

엑스

카카오스토리 
 
 핀터레스트 
 
 
 
 
 
 
 URL 주소 
 
 
 
 URL 주소

복사

닫기

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

---

## chunk 6
초기화

-->

국민의 나라, 정의로운 대한민국! 공정하고 정의로운, 인권이 존중받는 사회!

법무부가 함께합니다. 
 --->

법무뉴스

-->

보도자료

보도자료

-->

보도자료

-->

보도설명자료

공지사항

공지사항

-->

공지사항

-->

법무행사

-->

입찰정보

채용정보

-->

홍보자료

홍보자료

-->

동영상

-->

카드뉴스

-->

웹툰/정보 그림

-->

홍보책자

-->

소식지

-->

맞춤형 관심분야

-->

정부 출범 1주년 성과 기획 콘텐츠

국정성과 홍보자료

-->

국정성과 홍보자료

moj_ms_S

fnctId=bbs,fnctNo=184

결혼동거 목적의 사증 발급에 필요한 요건 및 심사면제 기준 고시(법무부고시 제2025-534호)

-->

글번호 
 601864 
 
 
 -->
 
 
 
 
 
 작성일
 
 
 2025.12.26
 
 
 
 
 수정일
 
 
 2025.12.26
 
 -->
 
 
 조회수
 
 5367

담당부서 
 
 
 이민통합과

담당자 
 
 
 김동완

전화번호 
 
 
 02-2110-4145

공공누리 
 
 
 4유형

<법무부 고시 제2025-534호>

「 결혼동거 목적의 사증 발급에 필요한 요건 및 심사면제 기준 고시 」를 붙임과 같이 안내드립니다.

붙임 : 결혼동거 목적의 사증 발급에 필요한 요건 및 심사면제 기준 고시(법무부 고시 제2025호-534호)

---

## chunk 7
첨부파일 
 
 
 
 
 
 
 
 
 
 
 
 
 
 결혼동거 목적의 사증 발급에 필요한 요건 및 심사면제 기준 고시(법무부고시 제2025-534호).pdf

바로보기 
 바로듣기

이전글
 
 
 
 
 
 
 
 
 
 
 
 출입국 소식지 &apos;공존&apos; 겨울호 발간 
 
 
 
 
 
 
 2025-12-12 09:42:39.0

다음글 
 
 
 
 
 
 
 
 
 
 
 2026년 특정활동(E-7) 체류자격 임금요건 기준 공고
 
 
 
 
 
 
 2025-12-29 13:19:37.0

법무부의 해당 저작물은 " 공공누리 0유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 1유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 2유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 3유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 4유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 AI유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

담당부서 : 
 
 
 
 전화번호 :

페이지 설문조사 양식 
 홈페이지의 서비스 품질 향상을 위해 만족도 조사를 실시하고 있습니다. 이 페이지에서 제공하는 정보에 대하여 얼마나 만족하셨습니까?

매우만족

만족

보통

불만족

매우불만족
```

---

## A1B-062 moj-immigration-policy-news__candidate__6790396f08d0

- 제목: [검토 후보] 법무부 출입국·외국인정책본부 주요소식
- sourceUrl: https://www.immigration.go.kr/immigration/3341/subview.do
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-immigration-policy-news
- supersededBy: 없음
- chunkCount: 61
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 399769
- extractedChars: 80456
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 법무부 출입국·외국인정책본부 주요소식
source_url: https://www.immigration.go.kr/immigration/3341/subview.do
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: policy_news, visa_program, status_program, effective_period
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 5157e2f9bc007f3eea8bfbe3499994d67d41aa0d4f160783a63531944dc1703f
byte_length: 399769
extracted_chars: 80456

출입국 주요 소식

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

법무부 출입국·외국인정책본부

국가상징안내

법무부

ENGLISH

누리집 지도

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

---

## chunk 1
소식지 &apos;공존&apos;

-->

정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

---

## chunk 2
전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

누리집 지도 
 
 
 
 
 
 
 
 
 검색열기

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

검색닫기

메뉴열기 
 
 
 
 법무부

ENGLISH

누리집 지도

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

---

## chunk 3
정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

---

## chunk 4
해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

메뉴닫기

close

자주 찾는 메뉴

업무공지

채용공지

새소식

소속기관

법령

통계자료

보도자료

주요제도 -->
 주요제도

미디어자료

정보공개목록

이민정책

규제개선 -->
 규제개선

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기

URL 주소 
 
 
 
 URL 주소

복사

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

질서있는 개방을 선도하고 국민과 외국인이 조화를 이루며 살아가는
 성숙한 다문화 환경을 조성하여 안정적인 사회통합을 이루어 나가겠습니다.

---

## chunk 5
뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

immigration_ms_S

fnctId=bbs,fnctNo=487

2026년 6월 
 
 
 법무부, 6월부터 &lsquo;이민자 인권&middot;권익팀&rsquo; 신설&hellip;외국인 인권 사각지대 없앤다 
 2026. 6. 1. 임금체불, 불법 브로커, 열악한 주거환경 등 고질적인 외국인 노동자 인권침해 문제를 해결하기 위해 법무부가 직접 &lsquo;컨트롤타워&rsquo;를 구축한다. 법무부(장관 정성호)는 외국인 노동자에 대한 인권침해를 예방하고 실질적인 권익 보호 체계를 강화하기 위해 오는 6월 1일 출입국&middot;외국인정책본부 내에 &lsquo;이민자 인권&middot;권익팀&rsquo;을 정식 출범한다.

---

## chunk 6
농어촌 외국인 숙련인력 고용 한도 50%로 확대&hellip; 외국인 노동자 '부당 이직' 시 이전 경력도 인정 
 2026. 6. 1. 오는 6월부터 농어촌 지역의 외국인 숙련기능인력(E-7-4) 고용 허용 한도가 기존 30%에서 최대 50%까지 대폭 확대됩니다. 또한, 임금체불이나 폭행 등 부당한 처우로 인해 불가피하게 직장을 옮긴 외국인 근로자도 이전 근무 경력을 그대로 인정받아 비자를 변경하거나 연장할 수 있게 바뀝니다. 법무부(장관 정성호)는 산업현장의 만성적 인력난을 해소하고 외국인 근로자가 안정적으로 머물며 일할 수 있도록 이 같은 내용을 골자로 한 「숙련기능인력(E-7-4)」 제도 개선안을 마련하여 2026년 6월 시행합니다.

&ldquo;출입국･이민정책 혁신으로 민생경제 회복과 지역발전 뒷받침&rdquo; 
 2026. 6. 8. 법무부(장관 정성호)는 인구감소지역에서 인력난을 완화하고 지역경제에 활력을 불어넣기 위해 ｢지역활력 소상공인 고용특례｣를 신설하여 2026년 5월 18일(월)부터 시행합니다. 2026년 3월 3일 법무부에서 발표한 『2030 이민정책 미래전략』중 핵심 과제인 ｢지역활력 소상공인 고용특례｣는 인구감소지역에서 소상공인과 농업법인이 일정한 요건을 갖추면 지역특화형 우수인재(F-2-R) 비자를 가진 외국인을 고용할 수 있도록 한 제도입니다.

---

## chunk 7
한&middot;미 이민당국 협력 강화&hellip; &lsquo;공항 심사 빨라지고 불법이민 꼼짝 못한다&rsquo; 
 2026. 6. 8. 법무부(장관 정성호)는 계절근로자 도입 규모가 급증함에 따라, 전문성을 바탕으로 지방정부의 계절근로자 관련 업무를 지원하기 위해 2026. 5. 14.(목) 관계부처와 민간위원이 참여하는 「중앙 계절근로 전문기관 지정심사위원회」(위원장: 출입국정책단장)를 개최하고 &lsquo;농림수산식품교육문화정보원&rsquo;을 「중앙 계절근로 전문기관」으로 선정하였습니다.

법무부, 미 국무부와 &lsquo;외국인노동자 인권&rsquo; 논의&hellip;&ldquo;인권 침해 예방 총력, 국제 평가 방어&rdquo; 
 2026. 6. 9. 법무부(장관 정성호)가 최근 사회적 화두로 떠오른 외국인노동자 인권침해 문제에 대해 미국 국무부와 만나 국내 인권 보호 정책과 개선 성과를 공유했습니다. 법무부는 이민자 인권보호의 총괄 부처로서 최근 사회적으로 문제되고 있는 외국인노동자 인권침해 예방과 보호에 총력 대응하고 있습니다. ※ (최근 법무부 대응 조치) 인권침해 사건 현장 출동, 신속한 피해 구제, 1345로 인권침해 일원화 및 내선 1번 부여, 「외국인 인권보호 및 권익증진협의회」 활성화로 실효적인 피해자 지원조치 실행, 계절근로 실태점검을 통한 인권침해 위반 적발 및 시정, 출입국‧외국인정책본부 내 인권‧권익팀(서기관 팀장) 신설로 범정부적 총괄기능 강화 등
```

---

## A1B-063 moj-k-eta-entry-authorization__candidate__dbbd7ed4b00d

- 제목: [검토 후보] 법무부 전자여행허가제(K-ETA)
- sourceUrl: https://www.immigration.go.kr/immigration/3339/subview.do
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-k-eta-entry-authorization
- supersededBy: 없음
- chunkCount: 11
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 223547
- extractedChars: 47385
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 법무부 전자여행허가제(K-ETA)
source_url: https://www.immigration.go.kr/immigration/3339/subview.do
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: k_eta, visa_free_entry, fee, validity, exemption, boarding_requirement, official_site
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 100ec662c49b9eee9e56c39dd8ecce5308cedbd0e1ce86c3293020535cd6d5ed
byte_length: 223547
extracted_chars: 47385

전자여행허가제(K-ETA)

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

법무부 출입국·외국인정책본부

국가상징안내

법무부

ENGLISH

누리집 지도

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

---

## chunk 1
불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

---

## chunk 2
전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

누리집 지도 
 
 
 
 
 
 
 
 
 검색열기

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

검색닫기

메뉴열기 
 
 
 
 법무부

ENGLISH

누리집 지도

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

---

## chunk 3
정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

---

## chunk 4
해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

메뉴닫기

close

자주 찾는 메뉴

업무공지

채용공지

새소식

소속기관

법령

통계자료

보도자료

주요제도 -->
 주요제도

미디어자료

정보공개목록

이민정책

규제개선 -->
 규제개선

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기

URL 주소 
 
 
 
 URL 주소

복사

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

질서있는 개방을 선도하고 국민과 외국인이 조화를 이루며 살아가는
 성숙한 다문화 환경을 조성하여 안정적인 사회통합을 이루어 나가겠습니다.

---

## chunk 5
이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

immigration_ms_S

---

## chunk 6
대한민국 전자여행허가(K-ETA, Korea Electronic Travel Authorization) 제도는 무사증입국 대상 국민 주석 이 입국하고자 할 때, 홈페이지에 개인 및 여행관련 정보를 사전에 입력하여 여행허가를 받는 제도입니다.
 
 주석 대상국가‧지역은 총 112개로 사증면제 협정국가(B-1) 67개, 관광통과(B-2) 45개 국가‧지역 국민임 
 
 
 20개 언어(한국어, 중국어, 영어, 베트남어, 태국어, 일본어, 몽골어, 인니어, 프랑스어, 방글라데시어, 파키스탄어, 러시아어, 네팔어, 캄보디아어, 미얀마어, 독일어, 스페인어, 필리핀어, 아랍어, 스리랑카어)로 전화 상담서비스 제공

-->

어디에서 이용할 수 있나요?

전자여행허가(K-ETA)는 공식 웹사이트( 
 www.k-eta.go.kr ) 또는 모바일 앱(K-ETA)에서 신청할 수 있습니다.

어떻게 신청해야 하나요?

---

## chunk 7
언제든지 신청가능 하나, 항공기 및 선박에 탑승하기 최소 72시간 전에 공식 웹사이트 또는 모바일앱에서 신청할것을 권고합니다.
 (단, 외교·관용 여권 소지자, ABTC 소지자, 승무원 및 선원, 환승객, 17세 이하·65세 이상 외국인 등은 K-ETA 신청 제외) 
 
 K-ETA 수수료는 한화 1만원이며, 3년간 유효합니다.(단, 여권 유효기간이 짧은 경우 여권 유효기간까지 유효)
 
 전자여행허가(K-ETA) 신청 후 통상 72시간 이내에 "K-ETA 공식홈페이지 신청결과 조회"를 통해 심사 결과 확인이 가능합니다.
 
 전자여행허가(K-ETA) 대상 외국인은 K-ETA 허가서를 받아야 한국행 항공기 및 선박에 탑승이 가능합니다.
 
 전자여행허가(K-ETA)를 받은 소지 외국인은 입국신고서 작성이 면제되어 편리하고 신속하게 입국심사를 받을 수 있습니다.
 
 보다 자세한 사항은 K-ETA 공식 홈페이지( www.k-eta.go.kr )에서 확인하시기 바랍니다.

담당부서 : 
 
 
 
 전화번호 :

페이지 설문조사 양식 
 홈페이지의 서비스 품질 향상을 위해 만족도 조사를 실시하고 있습니다. 이 페이지에서 제공하는 정보에 대하여 얼마나 만족하셨습니까?

매우만족

만족

보통

불만족

매우불만족

실국본부운영

실국본부 홈페이지

범죄예방정책국

교정본부

출입국&middot;외국인정책본부

특수목적 홈페이지

공익신탁 공시시스템

대한민국 비자포털

법률홈닥터

이로운법

사회통합정보망

솔로몬로파크(대전)

솔로몬로파크(부산)

스타트업 창업지원 법무플랫폼

자동출입국심사서비스 -->
```

---

## A1B-064 moj-k-eta-scam-warning__candidate__eb97caba54e1

- 제목: [검토 후보] K-ETA 유사 웹사이트 주의
- sourceUrl: https://www.immigration.go.kr/bbs/immigration/220/597906/artclView.do
- sourceType: official_government
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-k-eta-scam-warning
- supersededBy: 없음
- chunkCount: 2
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 25718
- extractedChars: 1643
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# K-ETA 유사 웹사이트 주의
source_url: https://www.immigration.go.kr/bbs/immigration/220/597906/artclView.do
source_type: official_government
topic: warning
legal_priority: 4
monitor_cadence: daily
change_signals: unofficial_site, agency_warning, official_website, mobile_app, scam_warning
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: cac3d423d7743284e894dbb56d8c44872d00f0c985ccac904a4188f8396b4c50
byte_length: 25718
extracted_chars: 1643

법무부

L o a d i n g . . .

-->

전자여행허가제(K-ETA) 유사 웹사이트 주의

-->

글번호 
 597906 
 
 
 -->
 
 
 
 
 
 작성일
 
 
 2025.08.12
 
 
 
 
 수정일
 
 
 2025.08.18
 
 -->
 
 
 조회수
 
 4622 
 
 
 
 
 
 
 
 
 
 
 
 담당부서 
 출입국심사과

전자여행허가(K-ETA) 신청은

공식 웹사이트( www.k-eta.go.kr ) 또는 모바일앱(K-ETA ) 을 이용하시기 바랍니다.

첨부파일 
 
 
 
 
 첨부파일이(가) 없습니다.

---

## chunk 1
이전글
 
 
 
 
 
 
 
 
 
 
 
 호우피해 특별재난지역 체류외국인 지원 방안 
 
 
 
 
 
 
 2025-07-28 13:50:41.0

다음글 
 
 
 
 
 
 
 
 
 
 
 제80년 광복절 기념 독립유공자 후손 대한민국 국적증서 수여식 
 
 
 
 
 
 
 2025-08-20 10:48:49.0

법무부의 해당 저작물은 " 공공누리 1유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 2유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 3유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.

법무부의 해당 저작물은 " 공공누리 4유형(출처표시) " 조건에 따라 누구나 이용할 수 있습니다.
```

---

## A1B-065 moj-mobile-immigration-office__candidate__83b95d77ed5a

- 제목: [검토 후보] 법무부 이동출입국사무소 운영 안내
- sourceUrl: https://www.immigration.go.kr/immigration/2344/subview.do
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-mobile-immigration-office
- supersededBy: 없음
- chunkCount: 9
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 202332
- extractedChars: 41448
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 법무부 이동출입국사무소 운영 안내
source_url: https://www.immigration.go.kr/immigration/2344/subview.do
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: mobile_office, operation_notice, download, competent_office, schedule, service_location
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 11d5982be177972387603445e0838091afc29c84fe7b44dfb32b67ad9ff02535
byte_length: 202332
extracted_chars: 41448

이동출입국 사무소 안내

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

법무부 출입국·외국인정책본부

국가상징안내

법무부

ENGLISH

누리집 지도

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

---

## chunk 1
불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

---

## chunk 2
전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

누리집 지도 
 
 
 
 
 
 
 
 
 검색열기

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

검색닫기

메뉴열기 
 
 
 
 법무부

ENGLISH

누리집 지도

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

---

## chunk 3
정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

---

## chunk 4
해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

메뉴닫기

close

자주 찾는 메뉴

업무공지

채용공지

새소식

소속기관

법령

통계자료

보도자료

주요제도 -->
 주요제도

미디어자료

정보공개목록

이민정책

규제개선 -->
 규제개선

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기

URL 주소 
 
 
 
 URL 주소

복사

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

질서있는 개방을 선도하고 국민과 외국인이 조화를 이루며 살아가는
 성숙한 다문화 환경을 조성하여 안정적인 사회통합을 이루어 나가겠습니다.

---

## chunk 5
누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

immigration_ms_S

이동출입국사무소 안내
 
 
 해당 이동출입국사무소를 클릭하시면 운영 안내문을 보실 수 있습니다.

이동출입국사무소 관할청 및 운영안내문 정보 안내 
 
 
 
 
 
 
 
 
 관할기관 
 이동출입국사무소 
 운영안내 
 
 
 
 
 
 인천출입국·외국인청 
 김포 이동출입국사무소 
 다운로드

출입국외국인지원센터 이동출입국사무소 
 다운로드

--> 
 
 인천출입국·외국인청 
 출입국외국인지원센터 이동출입국사무소 
 다운로드

--> 
 부산출입국·외국인청 
 양산 이동출입국사무소 
 다운로드

--> 
 
 대구출입국·외국인사무소 
 안동 이동출입국사무소 
 다운로드

//---> 
 
 창원출입국·외국인사무소 
 진주 이동출입국사무소 
 다운로드

--> 
 
 춘천출입국·외국인사무소 
 원주 이동출입국사무소 
 다운로드 
 
 
 
 
 
 
 
 
 인천출입국·외국인청

김포이동출입국사무소

출입국외국인지원센터 이동출입국사무소

부산출입국·외국인청

양산 이동출입국사무소

대구출입국·외국인사무소

안동 이동출입국사무소

창원출입국·외국인사무소

진주 이동출입국사무소

춘천출입국·외국인사무소

원주 이동출입국사무소

-->

담당부서 : 
 
 
 
 전화번호 :

페이지 설문조사 양식 
 홈페이지의 서비스 품질 향상을 위해 만족도 조사를 실시하고 있습니다. 이 페이지에서 제공하는 정보에 대하여 얼마나 만족하셨습니까?

매우만족

만족

보통

불만족

매우불만족

---

## chunk 6
실국본부운영

실국본부 홈페이지

범죄예방정책국

교정본부

출입국&middot;외국인정책본부

특수목적 홈페이지

공익신탁 공시시스템

대한민국 비자포털

법률홈닥터

이로운법

사회통합정보망

솔로몬로파크(대전)

솔로몬로파크(부산)

스타트업 창업지원 법무플랫폼

자동출입국심사서비스 -->

자동출입국심사서비스

전자공증시스템

중소기업법률지원

통일법제데이터베이스

하이코리아 -->

하이코리아

형사사법포털

소속기관

법무연수원

법무연수원

대검찰청

대검찰청

광주고등검찰청

광주지방검찰청

광주지방검찰청 목포지청

광주지방검찰청 순천지청

광주지방검찰청 장흥지청

광주지방검찰청 해남지청

대구고등검찰청

대구지방검찰청

대구지방검찰청 경주지청

대구지방검찰청 김천지청

대구지방검찰청 상주지청

대구지방검찰청 안동지청

대구지방검찰청 영덕지청

대구지방검찰청 의성지청

대구지방검찰청 포항지청

대구지방검찰청 서부지청

대전고등검찰청

대전지방검찰청

대전지방검찰청 공주지청

대전지방검찰청 논산지청

대전지방검찰청 서산지청

대전지방검찰청 천안지청

대전지방검찰청 홍성지청

부산고등검찰청

부산지방검찰청

부산지방검찰청 동부지청

부산지방검찰청 서부지청

서울고등검찰청

서울중앙지방검찰청

서울남부지방검찰청

서울동부지방검찰청

서울북부지방검찰청

서울서부지방검찰청

의정부지방검찰청

의정부지방검찰청 고양지청

수원지방검찰청

수원지방검찰청 성남지청

수원지방검찰청 안산지청

수원지방검찰청 안양지청

수원지방검찰청 여주지청

수원지방검찰청 평택지청

울산지방검찰청

인천지방검찰청

---

## chunk 7
인천지방검찰청 부천지청

전주지방검찰청

전주지방검찰청 군산지청

전주지방검찰청 남원지청

전주지방검찰청 정읍지청

제주지방검찰청

창원지방검찰청

창원지방검찰청 거창지청

창원지방검찰청 마산지청

창원지방검찰청 밀양지청

창원지방검찰청 진주지청

창원지방검찰청 통영지청

청주지방검찰청

청주지방검찰청 영동지청

청주지방검찰청 제천지청

청주지방검찰청 충주지청

춘천지방검찰청

춘천지방검찰청 강릉지청

춘천지방검찰청 속초지청

춘천지방검찰청 영월지청

춘천지방검찰청 원주지청

산하기관 관련 단체

산하기관 관련단체

대한법률구조공단

범죄예방위원전국연합회

법조협회

전국범죄피해자지원연합회

정부법무공단

한국법무보호복지공단

한국소년보호협회

IOM이민정책연구원

-->

정부기관

정부부처

재정경제부

교육부

과학기술정보통신부

외교부

통일부

법무부

국방부

행정안전부

국가보훈부

문화체육관광부

농림축산식품부

산업통상부

보건복지부

기후에너지환경부

고용노동부

성평등가족부

국토교통부

해양수산부

중소벤처기업부

정부기관

국가인권위원회

감사원

국가정보원

방송미디어통신위원회

민주평화통일자문회의

국민경제자문회의

국가과학기술자문회의

인사혁신처

법제처

식품의약품안전처

공정거래위원회

금융위원회

국민권익위원회

원자력안전위원회

국세청

관세청

조달청

국가데이터처

검찰청

병무청

방위사업청

경찰청

소방청

농촌진흥청

산림청

특허청 2025.10.16. upd-->

지식재산처

기상청

행정중심복합도시건설청

새만금개발청

해양경찰청

기획예산처

바로가기
```

---

## A1B-066 moj-notice-board-visa-policy__candidate__1bf1cec71776

- 제목: [검토 후보] 법무부 공지사항 체류·사증 정책 변경
- sourceUrl: https://www.immigration.go.kr/moj/223/subview.do
- sourceType: official_government
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-notice-board-visa-policy
- supersededBy: 없음
- chunkCount: 15
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 272468
- extractedChars: 52854
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 법무부 공지사항 체류·사증 정책 변경
source_url: https://www.immigration.go.kr/moj/223/subview.do
source_type: official_government
topic: warning
legal_priority: 4
monitor_cadence: daily
change_signals: notice_title, posted_date, attachment, visa_policy, stay_policy, e7, f6, f4
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 4c1aac32071c24cab7a109d9026774f106b297d4eed8069275b22b2d57e09923
byte_length: 272468
extracted_chars: 52854

공지사항

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

국가상징안내

어린이

ENGLISH

SNS 
 
 
 인스타그램

스레드

페이스북

엑스

유튜브

네이버 블로그

티스토리

법무부

통합검색

통합검색

검색어를 입력해주세요

전체 
 메뉴 
 기관 
 직원 
 게시판 
 웹페이지 
 뉴스소식 
 자료

-->
 
 
 검색어 삭제 
 
 
 검색 버튼

인기 검색어

주간

일간

주간 검색어

일간 검색어

최근검색어

최근검색어 전체 삭제

최근검색어 전체 삭제 
 
 
 -->

자동완성 닫기

닫기

전체메뉴

어린이

ENGLISH

---

## chunk 1
본인인증 해제

-->

온라인민원

열기

-->

교도소·구치소

교도소·구치소

-->

일반접견 예약

-->

화상접견 예약

-->

스마트접견 예약

-->

접견예약 확인

-->

변호인접견 예약

-->

변호인화상접견 예약

-->

변호인접견예약 확인

-->

보관금 조회

-->

반입도서 관리

-->

수용·출소 증명서발급

보호관찰소·소년원·분류심사원·국립법무병원

보호관찰소·소년원·분류심사원·국립법무병원

-->

소년보호 편지쓰기

-->

소년보호 증명발급

-->

국립법무병원 대면면회 예약

-->

국립법무병원 화상면회 예약

-->

사회봉사 국민공모

사증·출입국·체류·국적

사증·출입국·체류·국적

-->

출입국 전자민원(하이코리아)

-->

출입국사무소 방문예약

-->

사증발급 인정서 결과조회

-->

출입국 사실증명 발급

-->

외국인등록 사실증명 발급

-->

국내거소신고 발급

-->

국적선택신고 발급

-->

국적이탈신고 발급

변호사시험·사법시험

변호사시험·사법시험

-->

변호사시험 합격증명 발급

-->

사법시험 합격증명 발급

정보공개/개방

열기

-->

정보공개청구 안내

정보공개청구 안내

-->

정보공개제도

-->

수수료 안내

사전정보공표

사전정보공표

-->

공표대상 법무행정정보의 목록

-->

주요정책 추진과정 공개

-->

행정자료실

정보목록

정보목록

-->

정보목록(24년 7월 ~)

-->

정보목록(06년 1월 ~ 24년 6월)

정보공개 청구

-->

공개여부 및 불복 신청 사례

---

## chunk 2
-->

정책실명제

정책실명제

-->

국민신청실명제

-->

정책실명 공개과제

공공데이터 개방

공공데이터 개방

-->

공공데이터 개방 현황

-->

공공데이터 개방 알림

-->

공공데이터 신청 사례

-->

공공데이터 오류신고/수요조사

-->

한눈에 보는 법무 공공데이터

청렴자료공개

청렴자료공개

-->

반부패 청렴자료

-->

감사계획·결과

-->

수의계약 현황

-->

업무추진비

-->

부패행위현황

국고보조금

-->

비공개 대상 정보안내

법무정책서비스

열기

-->

국정과제

-->

법무/검찰

법무/검찰

-->

주택임대차법령정보

-->

상가건물임대차법령정보

-->

공증

-->

재외공관공증

-->

법무법인

-->

마을변호사

-->

국제법무지원

-->

법률시장 개방

-->

국제아동탈취

-->

송무업무

-->

신고포상금제 지급

-->

남북관계

-->

중소기업 법률지원

-->

공익신탁제도

-->

무죄재판서게재

범죄예방

범죄예방

-->

법교육

-->

사회봉사 국민공모제

-->

전자감독제도

-->

범죄예방 환경개선사업

-->

신상정보 등록제도

-->

전자보석제도

-->

전자장치 부착 잠정조치

-->

전자감독 피해자 보호 시스템

-->

수강명령제도

인권

인권

-->

국가인권정책기본계획

-->

국제인권규범

-->

국제인권뉴스레터

-->

인권보호제도

-->

범죄피해자 보호·지원제도

-->

범죄피해자 원스톱 솔루션 센터

-->

인권정책자료실

-->

---

## chunk 3
인권침해신고센터

교정

교정

-->

교정직 경력경쟁채용시험

-->

수형자 집중인성교육

-->

구인·구직 만남의 날(채용면접)

-->

스마트접견제도

-->

교정시설 원격의료시스템

-->

심리치료프로그램 운영

-->

교정민원콜센터

-->

교정정보 빅데이터 시각화

출입국·외국인

출입국·외국인

-->

출입국관리직 경력경쟁채용시험

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금 ･ 건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

외국인보호위원회

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

시험정보

시험정보

-->

변호사시험

-->

법조윤리시험

-->

사법시험

-->

시험자료실

-->

참여마당

정책참여

정책참여

-->

전자공청회

-->

국민생각함

법령/자료

열기

-->

법령정보

법령정보

-->

훈령

-->

예규

-->

고시

-->

입법 예고

-->

행정 예고

-->

개정 법령

-->

소관 법령

-->

가이드라인(지침)

통계정보

통계정보

-->

통계자료

-->

---

## chunk 4
교정통계

-->

출입국통계

-->

e-나라지표

자료실

자료실

-->

업무자료

-->

간행물

-->

국회관련자료

-->

재정정보

해외자료

해외자료

-->

해외 법제 자료 및 최신 동향

-->

투자분쟁 관련 자료

법무뉴스

열기

-->

보도자료

보도자료

-->

보도자료

-->

보도설명자료

공지사항

공지사항

-->

공지사항

-->

법무행사

-->

입찰정보

채용정보

-->

홍보자료

홍보자료

-->

동영상

-->

카드뉴스

-->

웹툰/정보 그림

-->

홍보책자

-->

소식지

-->

맞춤형 관심분야

-->

정부 출범 1주년 성과 기획 콘텐츠

국정성과 홍보자료

-->

국정성과 홍보자료

국민참여

열기

-->

포상참여

포상참여

-->

포상대상자공개

제안합니다

제안합니다

-->

제안합니다

신고센터

신고센터

-->

보조금 부조리 신고

-->

공직퇴임변호사 수임제한 위반 신고

-->

인권침해 신고

-->

부조리 신고

-->

부조리 신고(익명)

-->

비리공직자 내부공익 신고

-->

예산낭비 신고

-->

예산절감 제안신청

-->

변호사·공증 신문고

-->

비영리법인 부정비리 신고

-->

공익신고

-->

안전신고

-->

채용비리신고

규제개혁

규제개혁

-->

자료마당

-->

알림마당

-->

규제혁파 과제

-->

정부입법

-->

부처별 보도자료

-->

부처별 규제

-->

규제혁신 홍보자료

-->

규제정보포털

-->

규제개혁신문고

---

## chunk 5
-->

규제입증요청

적극행정

적극행정

-->

제도소개

-->

국민참여

-->

적극행정 소송지원

-->

적극행정 자료실

-->

적극행정 우수사례

협동조합 경영공시

-->

청렴생각함

법무부 소개

열기

-->

장관소개

-->

차관소개

차관소개

-->

약력

-->

역대차관

기관소개

기관소개

-->

비전과 임무

-->

예산

-->

연혁

-->

상징

-->

브랜드

조직과 기능

조직과 기능

-->

본부

-->

소속기관/검찰청

-->

산하기관

-->

직원검색

청사안내

청사안내

-->

층별안내

-->

찾아오시는길

누리집 안내

열기

-->

누리집 이용안내

-->

누리집 지도

-->

개인정보처리방침

개인정보처리방침

-->

이전 개인정보처리방침

알기쉬운 개인정보처리방침

-->

정보주체 권리보장

-->

저작권정책

-->

뷰어프로그램내려받기

-->

홈페이지 개선의견

-->

전화번호안내

-->

법무부 통합검색

누리집 지도 
 
 
 메뉴닫기

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기 
 
 
 페이스북

엑스

카카오스토리 
 
 핀터레스트 
 
 
 
 
 
 
 URL 주소 
 
 
 
 URL 주소

복사

닫기

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

---

## chunk 6
국민의 나라, 정의로운 대한민국! 공정하고 정의로운, 인권이 존중받는 사회!

법무부가 함께합니다. 
 --->

법무뉴스

-->

보도자료

보도자료

-->

보도자료

-->

보도설명자료

공지사항

공지사항

-->

공지사항

-->

법무행사

-->

입찰정보

채용정보

-->

홍보자료

홍보자료

-->

동영상

-->

카드뉴스

-->

웹툰/정보 그림

-->

홍보책자

-->

소식지

-->

맞춤형 관심분야

-->

정부 출범 1주년 성과 기획 콘텐츠

국정성과 홍보자료

-->

국정성과 홍보자료

moj_ms_S

fnctId=bbs,fnctNo=184

게시물 검색 
 검색항목 
 
 
 
 제목 
 
 
 
 
 
 담당부서 
 
 
 
 검색어 입력 
 
 -->
 검색

총 5503 개의 게시물이 있습니다.

게시글 리스트

공지사항 _ 법무뉴스>공지사항 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 번호 
 제목 
 
 
 
 
 
 
 
 
 
 
 담당부서 
 
 
 
 
 첨부파일 
 
 작성일 
 조회수

5503 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 [출입국ㆍ외국인정책본부] 2026년 의료관광 우수 유치기관 지정 계획 공고 
 
 새글작성 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 체류관리과 
 
 
 
 
 
 
 
 
 
 
 
 2개 첨부파일 제공

2026.07.09
 
 
 
 
 
 
 
 377

---

## chunk 7
5502 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 [출입국ㆍ외국인정책본부] 2026년 7월 출입국 현장투어 모집 안내 
 
 새글작성 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 출입국기획과 
 
 
 
 
 
 
 
 
 
 
 첨부파일 없음

2026.07.09
 
 
 
 
 
 
 
 283

5501 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 2025년도 중앙행정기관 자체평가 행정관리역량 부문 운영실태 점검결과 
 
 새글작성 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 혁신행정담당관실 
 
 
 
 
 
 
 
 
 
 
 
 1개 첨부파일 제공

2026.07.08
 
 
 
 
 
 
 
 590

5500 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 2027년도 검사 신규임용 실무기록평가 결과(역량평가 대상자) 및 향후 일정 등 안내 
 
 새글작성 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 검찰과 
 
 
 
 
 
 
 
 
 
 
 
 1개 첨부파일 제공

2026.07.06
 
 
 
 
 
 
 
 1258
```

---

## A1B-067 moj-office-jurisdiction-busan-gyeongnam__candidate__a16597b23768

- 제목: [검토 후보] 법무부 소속기관 관할구역 부산·경남
- sourceUrl: https://www.immigration.go.kr/immigration/2058/subview.do
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-office-jurisdiction-busan-gyeongnam
- supersededBy: 없음
- chunkCount: 11
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 222940
- extractedChars: 45797
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 법무부 소속기관 관할구역 부산·경남
source_url: https://www.immigration.go.kr/immigration/2058/subview.do
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: office_jurisdiction, service_scope, airport_office, address, phone, regional_office
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 757baa4670bfdfd910c4ddc52c615bfe4a284531cb904818ed35e224e79cbd4f
byte_length: 222940
extracted_chars: 45797

부산/경남

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

법무부 출입국·외국인정책본부

국가상징안내

법무부

ENGLISH

누리집 지도

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

---

## chunk 1
-->

소식지 &apos;공존&apos;

-->

정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

---

## chunk 2
전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

누리집 지도 
 
 
 
 
 
 
 
 
 검색열기

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

검색닫기

메뉴열기 
 
 
 
 법무부

ENGLISH

누리집 지도

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

---

## chunk 3
정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

---

## chunk 4
해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

메뉴닫기

close

자주 찾는 메뉴

업무공지

채용공지

새소식

소속기관

법령

통계자료

보도자료

주요제도 -->
 주요제도

미디어자료

정보공개목록

이민정책

규제개선 -->
 규제개선

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기

URL 주소 
 
 
 
 URL 주소

복사

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

질서있는 개방을 선도하고 국민과 외국인이 조화를 이루며 살아가는
 성숙한 다문화 환경을 조성하여 안정적인 사회통합을 이루어 나가겠습니다.

---

## chunk 5
출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

immigration_ms_S

fnctId=mapApi,fnctNo=301

-->

-->

-->

-->

-->

-->

-->

-->

-->

-->

---

## chunk 6
Untitled Document 
 
 
 
 부산/경남 관할구역안내 - 기관명, 관할구역, 주소, 전화/팩스 목록 
 
 
 
 
 
 
 
 
 
 기관명 
 관할구역 
 주소 
 전화/팩스 
 
 
 
 
 
 부산
출입국·외국인청
본관 
 
 
 부산광역시 (김해국제공항 제외), 경상남도 양산시
 
 취급업무 : 선박, 조사, 사범, 보호
 
 
 부산광역시 중구 충장대로 22-1
[우48940] 
 T. 051-461-3091
 F. 051-463-7255 
 
 
 
 부산
출입국·외국인청
별관 
 
 
 부산광역시 (김해국제공항 제외), 경상남도 김해시,양산시, 밀양시 
 
 취급업무 : 체류, 사증·유학(1층), 국적, 난민, 송무(2층), 이민통합, 총무(7층)
 
 
 부산광역시 중구 충장대로 7
교보생명 중앙동사옥
[우48939] 
 T. 051-461-3091 ~ 6
F. 051-461-3128 
 
 
 
 부산
 출입국·외국인청
 김해출장소 
 
 
 김해시, 밀양시
 
 
 경남 김해시 가락로 58(부원동 830-1) 부원동우체국 5층
[우50921] 
 T. 055-344-7830~5
 F. 055-344-7812 
 
 
 
 김해공항
 출입국·외국인사무소 
 
 
 김해국제공항 출입국심사전담
 
 
 부산광역시 강서구 공항진입로 108
[우46718] 
 T. 051-979-1300
 F. 051-979-1305 
 
 
 
 울산
출입국·외국인사무소 
 
 
 울산광역시
 
 경상북도 경주시
 
 
 울산광역시 중구 종가로 405-1(성안동 238)
[우44543] 
 T. 

---

## chunk 7
052-279-8024
F. 052-279-8028 
 
 
 
 창원
 출입국·외국인사무소 
 
 
 경상남도(김해시, 밀양시, 양산시 제외)
 
 
 경남 창원시 마산합포구 제2부두로 30
[우51716] 
 T. 055-981-6000
 F.055-247-9150 
 
 
 
 창원
 출입국·외국인사무소
 거제출장소 
 
 
 경상남도 거제시
 
 
 경남 거제시 연초면 연사1길 24(연초면 연사리 302)
[우53209] 
 T. 055-681-8133
 F. 055-682-2433 
 
 
 
 창원
 출입국·외국인사무소
 사천출장소 
 
 
 경상남도 사천시, 남해군, 하동군
 
 
 경남 사천시 삼천포대교로 450번지(동림동 181-29)
[우52557] 
 T. 055-835-3988
 F. 055-835-4087 
 
 
 
 창원
 출입국·외국인사무소
 통영출장소 
 
 
 경상남도 통영시
 
 
 경남 통영시 남망길 5번지(동호동 171-10)
[우53051] 
 T. 055-645-3405
 F. 055-645-3441
```

---

## A1B-068 moj-office-jurisdiction-daegu-gyeongbuk-gangwon__candidate__befc6538daac

- 제목: [검토 후보] 법무부 소속기관 관할구역 대구·경북·강원
- sourceUrl: https://www.immigration.go.kr/immigration/2060/subview.do
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-office-jurisdiction-daegu-gyeongbuk-gangwon
- supersededBy: 없음
- chunkCount: 11
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 221362
- extractedChars: 45552
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 법무부 소속기관 관할구역 대구·경북·강원
source_url: https://www.immigration.go.kr/immigration/2060/subview.do
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: office_jurisdiction, service_scope, branch_office, address, phone, regional_office
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 599197b5aa526460b6019d2d7417addde57c5f063f13fc3e9c66babbb848c58b
byte_length: 221362
extracted_chars: 45552

대구/경북/강원

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

법무부 출입국·외국인정책본부

국가상징안내

법무부

ENGLISH

누리집 지도

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

---

## chunk 1
불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

---

## chunk 2
전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

누리집 지도 
 
 
 
 
 
 
 
 
 검색열기

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

검색닫기

메뉴열기 
 
 
 
 법무부

ENGLISH

누리집 지도

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

---

## chunk 3
정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

---

## chunk 4
해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

메뉴닫기

close

자주 찾는 메뉴

업무공지

채용공지

새소식

소속기관

법령

통계자료

보도자료

주요제도 -->
 주요제도

미디어자료

정보공개목록

이민정책

규제개선 -->
 규제개선

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기

URL 주소 
 
 
 
 URL 주소

복사

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

질서있는 개방을 선도하고 국민과 외국인이 조화를 이루며 살아가는
 성숙한 다문화 환경을 조성하여 안정적인 사회통합을 이루어 나가겠습니다.

---

## chunk 5
출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

immigration_ms_S

fnctId=mapApi,fnctNo=303

-->

-->

-->

-->

-->

-->

-->

-->

---

## chunk 6
대구/경북/강원 관할구역안내 - 기관명, 관할구역, 주소, 전화/팩스 목록 
 
 
 
 
 
 
 
 
 
 기관명 
 관할구역 
 주소 
 전화/팩스 
 
 
 
 
 
 대구
 출입국·외국인사무소 
 
 
 대구광역시, 경상북도 (포항시, 울진군, 영덕군, 울릉군,구미시, 김천시, 상주시, 문경시, 칠곡군 제외)
 
 
 
 대구 동구 이노밸리로 345
[우41069] 
 T. 053-980-3517
 F. 053-980-3580 
 
 
 
 대구
 출입국·외국인사무소
 포항출장소 
 
 
 경상북도 포항시, 울진군, 영덕군, 울릉군
 
 
 경북 포항시 북구 우창동로 13
[우37636] 
 T. 054-247-5363
 F. 054-240-5492 
 
 
 
 대구
 출입국·외국인사무소
 구미출장소 
 
 
 경상북도 구미시, 김천시, 상주시, 문경시, 칠곡군
 
 
 경북 구미시 구미대로 350-27 구미시종합비즈니스지원센터(구.금오공대 산학연구동) 4층
[우39253] 
 T. 054-459-3505
 F. 054-459-3580 
 
 
 
 춘천
 출입국·외국인사무소 
 
 
 강원특별자치도(동해시, 강릉시, 삼척시, 태백시, 정선군, 속초시, 양양군, 고성군, 철원군 제외), 경기도 가평군
 
 
 강원특별자치도 춘천시 동내면 사암길 12(학곡리 29-1)
[우24408] 
 T. 033-269-3210
 F. 033-269-3294 
 
 
 
 춘천
 출입국·외국인사무소
 고성출장소 
 
 
 고성터미널 남북왕래 출입심사전담
 
 
 강원특별자치도 고성군 현내면 동해대로 9097
[우

---

## chunk 7
24701] 
 T. 033-680-5100
 F. 033-680-5102 
 
 
 
 춘천
 출입국·외국인사무소
 동해출장소 
 
 
 강원특별자치도 동해시, 강릉시, 삼척시, 태백시, 정선군
 
 
 강원특별자치도 동해시 해안로 225
[우25769] 
 T. 033-535-5723
 F. 033-533-8153 
 
 
 
 춘천
 출입국·외국인사무소
 속초출장소 
 
 
 강원특별자치도 속초시, 양양군, 고성군
 
 
 강원특별자치도 속초시 청초호반로 189, 속초법무합동청사
[우24854] 
 T. 033-636-8614
 F. 033-636-8615
```

---

## A1B-069 moj-office-jurisdiction-daejeon-chungcheong__candidate__6836a1e734a1

- 제목: [검토 후보] 법무부 소속기관 관할구역 대전·충청
- sourceUrl: https://www.immigration.go.kr/immigration/2061/subview.do
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-office-jurisdiction-daejeon-chungcheong
- supersededBy: 없음
- chunkCount: 11
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 221910
- extractedChars: 45783
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 법무부 소속기관 관할구역 대전·충청
source_url: https://www.immigration.go.kr/immigration/2061/subview.do
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: office_jurisdiction, service_scope, branch_office, address, phone, regional_office
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: dd4c2518fe3b9e713879a0314ec1419cebc580c7d0fbe3c4e253c378169fd087
byte_length: 221910
extracted_chars: 45783

대전/충청

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

법무부 출입국·외국인정책본부

국가상징안내

법무부

ENGLISH

누리집 지도

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

---

## chunk 1
-->

소식지 &apos;공존&apos;

-->

정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

---

## chunk 2
전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

누리집 지도 
 
 
 
 
 
 
 
 
 검색열기

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

검색닫기

메뉴열기 
 
 
 
 법무부

ENGLISH

누리집 지도

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

---

## chunk 3
정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

---

## chunk 4
해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

메뉴닫기

close

자주 찾는 메뉴

업무공지

채용공지

새소식

소속기관

법령

통계자료

보도자료

주요제도 -->
 주요제도

미디어자료

정보공개목록

이민정책

규제개선 -->
 규제개선

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기

URL 주소 
 
 
 
 URL 주소

복사

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

질서있는 개방을 선도하고 국민과 외국인이 조화를 이루며 살아가는
 성숙한 다문화 환경을 조성하여 안정적인 사회통합을 이루어 나가겠습니다.

---

## chunk 5
출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

immigration_ms_S

fnctId=mapApi,fnctNo=304

-->

-->

-->

-->

-->

-->

-->

---

## chunk 6
대전/충청 관할구역안내 - 기관명, 관할구역, 주소, 전화/팩스 목록 
 
 
 
 
 
 
 
 
 
 기관명 
 관할구역 
 주소 
 전화/팩스 
 
 
 
 
 
 대전
 출입국·외국인사무소 
 
 
 대전광역시, 충청남도 (천안시, 아산시, 서산시, 당진시, 예산군, 태안군, 홍성군, 당진항, 장항항, 보령항 제외) 충청북도 영동군, 옥천군, 세종특별자치시 
 
 
 대전광역시 중구 목중로 26번길 7 (중촌동)
[우34812] 
 T. 042-220-2001~2,4
 F. 042-256-0496
 
 ※ 체류관련팩스
 F. 042-255-0496 
 
 
 
 대전
 출입국·외국인사무소
 천안출장소 
 
 
 천안시, 아산시, 예산군
 
 
 충청남도 천안시 서북구 광장로 215 (불당동) 충남북부상공회의소 403호
[우31169] 
 T. 041-621-1347
 F. 041-622-1345
 
 
 
 
 대전
 출입국·외국인사무소
 천안출장소
 아산다문화이주민
 플러스센터 
 
 
 천안시, 아산시, 예산군
 
 
 충청남도 아산시 아산로 79 유신빌딩 4층
[우31505] 
 T. 041-549-7441
 F. 041-549-7443 
 
 
 
 대전
 출입국·외국인사무소
 천안출장소
 천안다문화이주민
 플러스센터 
 
 
 천안시, 아산시, 예산군
 
 
 충청남도 천안시 동남구 버들로40, 동남구보건소 별관 8층 
 T. 041-566-1346
 F. 041-566-1347 
 
 
 
 대전
 출입국·외국인사무소
 서산출장소 
 
 
 충청남도 서산시, 태안군, 홍성군, 보령항
 
 


---

## chunk 7
 충청남도 서산시 읍내3로 28 (읍내동) 서림빌딩 6층
[우31984] 
 T. 041-681-6188
 F. 041-681-6182 
 
 
 
 대전
 출입국·외국인사무소
 당진출장소 
 
 
 충청남도 당진시, 당진항
 
 
 충청남도 당진시 송악읍 고대공단2길 79-33 항만지원센터2층
[우31719] 
 T. 041-352-6174
 F. 041)352-6170 
 
 
 
 청주
 출입국·외국인사무소 
 
 
 충청북도(영동군, 옥천군 제외), 청주국제공항
 
 
 충북 청주시 흥덕구 비하로 12번길 52 (본소)
[우28365] 
 T. 043-230-9000
F. 043-236-4907 
 
 
 
 청주
출입국·외국인사무소
음성다문화이주민
플러스센터 
 
 
 충북일대(영동군, 옥천군 제외)
 
 
 충청북도 음성군 금왕읍 금석로71, 3층 
 T. 043-878-2671
 F. 043-877-3670 
 
 
 
 청주외국인보호소 
 
 
 외국인보호전담
 
 
 충북 청주시 서원구 청남로 1887번길 49
[우28634] 
 T. 043-290-7512
 F. 043-290-7590
```

---

## A1B-070 moj-office-jurisdiction-gwangju-jeolla-jeju__candidate__9febbb301669

- 제목: [검토 후보] 법무부 소속기관 관할구역 광주·전라·제주
- sourceUrl: https://www.immigration.go.kr/immigration/2059/subview.do
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-office-jurisdiction-gwangju-jeolla-jeju
- supersededBy: 없음
- chunkCount: 11
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 221864
- extractedChars: 45770
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 법무부 소속기관 관할구역 광주·전라·제주
source_url: https://www.immigration.go.kr/immigration/2059/subview.do
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: office_jurisdiction, service_scope, branch_office, address, phone, regional_office
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 8ba85ed0918558987a30630bb70e70f0a9929be82e6a923c177980c71e717f58
byte_length: 221864
extracted_chars: 45770

광주/전라/제주

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

법무부 출입국·외국인정책본부

국가상징안내

법무부

ENGLISH

누리집 지도

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

---

## chunk 1
불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

---

## chunk 2
전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

누리집 지도 
 
 
 
 
 
 
 
 
 검색열기

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

검색닫기

메뉴열기 
 
 
 
 법무부

ENGLISH

누리집 지도

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

---

## chunk 3
정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

---

## chunk 4
해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

메뉴닫기

close

자주 찾는 메뉴

업무공지

채용공지

새소식

소속기관

법령

통계자료

보도자료

주요제도 -->
 주요제도

미디어자료

정보공개목록

이민정책

규제개선 -->
 규제개선

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기

URL 주소 
 
 
 
 URL 주소

복사

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

질서있는 개방을 선도하고 국민과 외국인이 조화를 이루며 살아가는
 성숙한 다문화 환경을 조성하여 안정적인 사회통합을 이루어 나가겠습니다.

---

## chunk 5
출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

immigration_ms_S

fnctId=mapApi,fnctNo=302

-->

-->

-->

-->

-->

-->

-->

---

## chunk 6
광주/전라/제주 관할구역안내 - 기관명, 관할구역, 주소, 전화/팩스 목록 
 
 
 
 
 
 
 
 
 
 기관명 
 관할구역 
 주소 
 전화/팩스 
 
 
 
 
 
 제주
 출입국·외국인청 
 
 
 제주특별자치도
 
 
 제주특별자치도 제주시 용담로 3
[우63150] 
 T. 064-741-5400
 F. 064-741-5491 
 
 
 
 여수
 출입국·외국인사무소 
 
 
 전남광주통합특별시 여수시, 순천시
 
 
 전남광주통합특별시 여수시 무선로 265
[우59638] 
 T. 061-689-5511
(야간 : 061-689-5551)
 F. 061-684-6974 
 
 
 
 여수
 출입국·외국인사무소
 광양출장소 
 
 
 전남광주통합특별시 광양시
 
 
 전남광주통합특별시 광양시 중동 2길 23
[우57784] 
 T. 061-792-1139
 F. 061-792-9928 
 
 
 
 여수
 출입국·외국인사무소
 광양다문화
이주민플러스센터 
 
 
 전남광주통합특별시 광양시
(근무일자 : 매주 수요일)
 
 
 전남광주통합특별시 광양시 동광2길 9-7 광양시가족센터 3층
[우57786] 
 T. 061-795-8386
 F. 061-794-8387 
 
 
 
 광주
 출입국·외국인사무소 
 
 
 전남광주통합특별시(목포시, 완도군, 신안군, 무안군, 진도군, 영암군, 해남군, 여수시, 순천시, 광양시 제외)
 
 
 전남광주통합특별시 서구 상무대로911번길 22 (쌍촌동 627-1)
[우61969] 
 T. 062-605-5280
 F. 062-605-5299 
 
 
 
 광주

---

## chunk 7

 출입국·외국인사무소
 무안공항출장소 
 
 
 무안국제공항 출입국심사 전담
 
 
 전남광주통합특별시 무안군 망운면 공항로 970-260
[우58533] 
 T. 061-453-8846
F. 061-453-8845 
 
 
 
 광주
 출입국·외국인사무소
 목포출장소 
 
 
 전남광주통합특별시 목포시, 완도군, 신안군, 무안군, 진도군, 영암군, 해남군
 
 
 전남광주통합특별시 목포시 백년대로 412번길 26(옥암동)
[우58684] 
 T. 061-282-7294
 F. 061-282-7293 
 
 
 
 전주
 출입국·외국인사무소 
 
 
 전북특별자치도 (군산시 제외)
 
 
 전북특별자치도 전주시 덕진구 동부대로 857
[우54903] 
 T. 063-249-8693~4
 F. 063-245-6165 
 
 
 
 전주
 출입국·외국인사무소
 군산출장소 
 
 
 전북특별자치도 군산시, 장항항, 군산미공군 비행장
 
 
 전북특별자치도 군산시 대학로 151-1 (문화동 877-21)
[우54115] 
 T. 063-440-8400
 F. 063-440-8405
```

---

## A1B-071 moj-office-jurisdiction-seoul-incheon-gyeonggi__candidate__26aac0a989b6

- 제목: [검토 후보] 법무부 소속기관 관할구역 서울·인천·경기
- sourceUrl: https://www.immigration.go.kr/immigration/2057/subview.do
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-office-jurisdiction-seoul-incheon-gyeonggi
- supersededBy: 없음
- chunkCount: 13
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 231301
- extractedChars: 47716
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 법무부 소속기관 관할구역 서울·인천·경기
source_url: https://www.immigration.go.kr/immigration/2057/subview.do
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: office_jurisdiction, visit_reservation, address, phone, service_scope, regional_office
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: cc899bd3de08b15706e0d74dd9a0fa095fef0d8ca193dd3d0f37322aed476985
byte_length: 231301
extracted_chars: 47716

서울/인천/경기

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

법무부 출입국·외국인정책본부

국가상징안내

법무부

ENGLISH

누리집 지도

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

---

## chunk 1
불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

---

## chunk 2
전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

누리집 지도 
 
 
 
 
 
 
 
 
 검색열기

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

검색닫기

메뉴열기 
 
 
 
 법무부

ENGLISH

누리집 지도

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

---

## chunk 3
정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

---

## chunk 4
해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

메뉴닫기

close

자주 찾는 메뉴

업무공지

채용공지

새소식

소속기관

법령

통계자료

보도자료

주요제도 -->
 주요제도

미디어자료

정보공개목록

이민정책

규제개선 -->
 규제개선

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기

URL 주소 
 
 
 
 URL 주소

복사

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

질서있는 개방을 선도하고 국민과 외국인이 조화를 이루며 살아가는
 성숙한 다문화 환경을 조성하여 안정적인 사회통합을 이루어 나가겠습니다.

---

## chunk 5
출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

immigration_ms_S

fnctId=mapApi,fnctNo=300

-->

-->

-->

-->

-->

-->

-->

-->

-->

-->

-->

-->

-->

-->

-->

-->

-->

서울/경기/인천 관할구역안내 - 기관명, 관할구역, 주소, 전화/팩스 목록 
 
 
 
 
 
 
 
 
 
 기관명 
 관할구역 
 주소 
 전화/팩스 
 
 
 
 
 
 인천공항
출입국·외국인청 
 
 
 인천국제공항
 
 출입국심사전담
 
 
 인천광역시 영종구 공항로 272
[우23358] 
 ※ 민원실(출입국사실증명 등)

■ 제1터미널
 T : 032-740-7391~2
 F : 032-740-7395

---

## chunk 6
■ 제2터미널 
 T : 032-740-7361~2
 F : 032-740-7360 
 
 
 
 인천공항
 출입국·외국인청
 서울역출장소 
 
 
 출입국심사전담
 
 
 서울시 용산구 한강대로 405 서울역 지하2층
[우04301] 
 T.02-362-8432 
 F. 02-362-8436 
 
 
 
 서울
 출입국·외국인청 
 
 
 서울 9개구, 3개시
관악구, 광진구, 강남구, 강동구, 동작구, 송파구, 성동구, 서초구, 용산구
 
 성남시, 하남시, 과천시
 
 
 서울 양천구 목동동로 151
[우08013] 
 T. 02-2650-6214
F. 02-2650-6295
[종합안내센터] 국번없이 1345 
 
 
 
 서울
출입국·외국인청
세종로출장소 
 
 
 종로구, 중구, 은평구, 동대문구, 중랑구, 도봉구, 성북구, 강북구, 노원구
 
 
 서울시 종로구 종로 38 
서울글로벌센터 2,3층
[우03188] 
 T. 02-731-1799
 F.02-731-1791 
 
 
 
 인천
 출입국·외국인청 
 
 
 인천광역시
 (인천국제공항 제외), 부천시, 김포시
 
 
 인천광역시 제물포구 서해대로393(항동 7가 1-31)
[우22306] 
 T. 032-890-6300
 F. 032-890-6400 
 
 
 
 인천
 출입국·외국인청
 김포다문화이주민
플러스센터 
 
 
 김포시, 강화군
 
 
 경기도 김포시 양촌읍 황금로110번길 52(학운리 2769)
[우10047] 
 T. 031-981-0042
 F. 031-981-0400 
 
 
 
 수원
 출입국·외국인청
 
 
 
 경기

---

## chunk 7
도 의왕시, 수원시, 용인시, 이천시, 화성시, 광주시, 양평군, 여주시
 
 
 수원시 영통구 반달로 39(영통동)
[우16705] 
 T. 031-695-3817
 F. 031-695-3810 
 
 
 
 수원
 출입국·외국인청
 평택출장소 
 
 
 경기도 평택시(평택항은 제외), 안성시, 오산시, 오산군용비행장
 
 
 경기도 평택시 경기대로 1375 CK타워3,4층
[우17774] 
 T. 031-8024-9612
 F. 031-8024-9640 
 
 
 
 수원
 출입국·외국인청
 평택항만 출장소 
 
 
 평택항
 
 
 경기도 평택시 포승읍 하만호길 155-40
[우17962] 
 T. 031-683-6938
 F. 031-686-8361 
 
 
 
 서울남부
 출입국·외국인사무소 
 
 
 서울 7개구
서대문구, 마포구, 강서구, 양천구, 영등포구, 구로구, 금천구
 
 
 
 
 서울 강서구 마곡서1로 48
[우07799] 
 T. 02-6980-4812
 F. 02-6980-4990
 [종합민원센터] 국번없이 1345
 
 
 
 
 서울남부
 출입국·외국인사무소
영등포출입국민원센터 
 
 
 서울 7개구
서대문구, 마포구, 강서구, 양천구, 영등포구, 구로구, 금천구
 
 
 
 
 서울 영등포구 도신로 40
[우07379] 
 T. 02-3284-6000
 F. 02-3284-6050 
 
 
 
 
 안산출입국·외국인사무소 
 
 
 경기도 안산시, 시흥시, 안양시, 군포시, 광명시
 
 
 
 체류, 사증, 국적, 증명발급 업무 제외
 
 
 
 
 경기도 안산시 단원구 광덕4
```

---

## A1B-072 moj-online-stay-visa-center__candidate__46500b7fd97c

- 제목: [검토 후보] 법무부 온라인체류·사증민원센터
- sourceUrl: https://www.immigration.go.kr/moj/198/subview.do
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-online-stay-visa-center
- supersededBy: 없음
- chunkCount: 14
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 277726
- extractedChars: 59895
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 법무부 온라인체류·사증민원센터
source_url: https://www.immigration.go.kr/moj/198/subview.do
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: e_visa, e_application, online_petition, stay_extension, fee_discount
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: c32534ee4bd44eee83ea8fd23d6f26034018a64c0bf6ea9fdc0ce6195562e0b4
byte_length: 277726
extracted_chars: 59895

온라인체류·사증민원센터

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

국가상징안내

어린이

ENGLISH

SNS 
 
 
 인스타그램

스레드

페이스북

엑스

유튜브

네이버 블로그

티스토리

법무부

통합검색

통합검색

검색어를 입력해주세요

전체 
 메뉴 
 기관 
 직원 
 게시판 
 웹페이지 
 뉴스소식 
 자료

-->
 
 
 검색어 삭제 
 
 
 검색 버튼

인기 검색어

주간

일간

주간 검색어

일간 검색어

최근검색어

최근검색어 전체 삭제

최근검색어 전체 삭제 
 
 
 -->

자동완성 닫기

닫기

전체메뉴

어린이

ENGLISH

---

## chunk 1
본인인증 해제

-->

온라인민원

열기

-->

교도소·구치소

교도소·구치소

-->

일반접견 예약

-->

화상접견 예약

-->

스마트접견 예약

-->

접견예약 확인

-->

변호인접견 예약

-->

변호인화상접견 예약

-->

변호인접견예약 확인

-->

보관금 조회

-->

반입도서 관리

-->

수용·출소 증명서발급

보호관찰소·소년원·분류심사원·국립법무병원

보호관찰소·소년원·분류심사원·국립법무병원

-->

소년보호 편지쓰기

-->

소년보호 증명발급

-->

국립법무병원 대면면회 예약

-->

국립법무병원 화상면회 예약

-->

사회봉사 국민공모

사증·출입국·체류·국적

사증·출입국·체류·국적

-->

출입국 전자민원(하이코리아)

-->

출입국사무소 방문예약

-->

사증발급 인정서 결과조회

-->

출입국 사실증명 발급

-->

외국인등록 사실증명 발급

-->

국내거소신고 발급

-->

국적선택신고 발급

-->

국적이탈신고 발급

변호사시험·사법시험

변호사시험·사법시험

-->

변호사시험 합격증명 발급

-->

사법시험 합격증명 발급

정보공개/개방

열기

-->

정보공개청구 안내

정보공개청구 안내

-->

정보공개제도

-->

수수료 안내

사전정보공표

사전정보공표

-->

공표대상 법무행정정보의 목록

-->

주요정책 추진과정 공개

-->

행정자료실

정보목록

정보목록

-->

정보목록(24년 7월 ~)

-->

정보목록(06년 1월 ~ 24년 6월)

정보공개 청구

-->

공개여부 및 불복 신청 사례

---

## chunk 2
-->

정책실명제

정책실명제

-->

국민신청실명제

-->

정책실명 공개과제

공공데이터 개방

공공데이터 개방

-->

공공데이터 개방 현황

-->

공공데이터 개방 알림

-->

공공데이터 신청 사례

-->

공공데이터 오류신고/수요조사

-->

한눈에 보는 법무 공공데이터

청렴자료공개

청렴자료공개

-->

반부패 청렴자료

-->

감사계획·결과

-->

수의계약 현황

-->

업무추진비

-->

부패행위현황

국고보조금

-->

비공개 대상 정보안내

법무정책서비스

열기

-->

국정과제

-->

법무/검찰

법무/검찰

-->

주택임대차법령정보

-->

상가건물임대차법령정보

-->

공증

-->

재외공관공증

-->

법무법인

-->

마을변호사

-->

국제법무지원

-->

법률시장 개방

-->

국제아동탈취

-->

송무업무

-->

신고포상금제 지급

-->

남북관계

-->

중소기업 법률지원

-->

공익신탁제도

-->

무죄재판서게재

범죄예방

범죄예방

-->

법교육

-->

사회봉사 국민공모제

-->

전자감독제도

-->

범죄예방 환경개선사업

-->

신상정보 등록제도

-->

전자보석제도

-->

전자장치 부착 잠정조치

-->

전자감독 피해자 보호 시스템

-->

수강명령제도

인권

인권

-->

국가인권정책기본계획

-->

국제인권규범

-->

국제인권뉴스레터

-->

인권보호제도

-->

범죄피해자 보호·지원제도

-->

범죄피해자 원스톱 솔루션 센터

-->

인권정책자료실

-->

---

## chunk 3
인권침해신고센터

교정

교정

-->

교정직 경력경쟁채용시험

-->

수형자 집중인성교육

-->

구인·구직 만남의 날(채용면접)

-->

스마트접견제도

-->

교정시설 원격의료시스템

-->

심리치료프로그램 운영

-->

교정민원콜센터

-->

교정정보 빅데이터 시각화

출입국·외국인

출입국·외국인

-->

출입국관리직 경력경쟁채용시험

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금 ･ 건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

외국인보호위원회

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

시험정보

시험정보

-->

변호사시험

-->

법조윤리시험

-->

사법시험

-->

시험자료실

-->

참여마당

정책참여

정책참여

-->

전자공청회

-->

국민생각함

법령/자료

열기

-->

법령정보

법령정보

-->

훈령

-->

예규

-->

고시

-->

입법 예고

-->

행정 예고

-->

개정 법령

-->

소관 법령

-->

가이드라인(지침)

통계정보

통계정보

-->

통계자료

-->

---

## chunk 4
교정통계

-->

출입국통계

-->

e-나라지표

자료실

자료실

-->

업무자료

-->

간행물

-->

국회관련자료

-->

재정정보

해외자료

해외자료

-->

해외 법제 자료 및 최신 동향

-->

투자분쟁 관련 자료

법무뉴스

열기

-->

보도자료

보도자료

-->

보도자료

-->

보도설명자료

공지사항

공지사항

-->

공지사항

-->

법무행사

-->

입찰정보

채용정보

-->

홍보자료

홍보자료

-->

동영상

-->

카드뉴스

-->

웹툰/정보 그림

-->

홍보책자

-->

소식지

-->

맞춤형 관심분야

-->

정부 출범 1주년 성과 기획 콘텐츠

국정성과 홍보자료

-->

국정성과 홍보자료

국민참여

열기

-->

포상참여

포상참여

-->

포상대상자공개

제안합니다

제안합니다

-->

제안합니다

신고센터

신고센터

-->

보조금 부조리 신고

-->

공직퇴임변호사 수임제한 위반 신고

-->

인권침해 신고

-->

부조리 신고

-->

부조리 신고(익명)

-->

비리공직자 내부공익 신고

-->

예산낭비 신고

-->

예산절감 제안신청

-->

변호사·공증 신문고

-->

비영리법인 부정비리 신고

-->

공익신고

-->

안전신고

-->

채용비리신고

규제개혁

규제개혁

-->

자료마당

-->

알림마당

-->

규제혁파 과제

-->

정부입법

-->

부처별 보도자료

-->

부처별 규제

-->

규제혁신 홍보자료

-->

규제정보포털

-->

규제개혁신문고

---

## chunk 5
-->

규제입증요청

적극행정

적극행정

-->

제도소개

-->

국민참여

-->

적극행정 소송지원

-->

적극행정 자료실

-->

적극행정 우수사례

협동조합 경영공시

-->

청렴생각함

법무부 소개

열기

-->

장관소개

-->

차관소개

차관소개

-->

약력

-->

역대차관

기관소개

기관소개

-->

비전과 임무

-->

예산

-->

연혁

-->

상징

-->

브랜드

조직과 기능

조직과 기능

-->

본부

-->

소속기관/검찰청

-->

산하기관

-->

직원검색

청사안내

청사안내

-->

층별안내

-->

찾아오시는길

누리집 안내

열기

-->

누리집 이용안내

-->

누리집 지도

-->

개인정보처리방침

개인정보처리방침

-->

이전 개인정보처리방침

알기쉬운 개인정보처리방침

-->

정보주체 권리보장

-->

저작권정책

-->

뷰어프로그램내려받기

-->

홈페이지 개선의견

-->

전화번호안내

-->

법무부 통합검색

누리집 지도 
 
 
 메뉴닫기

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기 
 
 
 페이스북

엑스

카카오스토리 
 
 핀터레스트 
 
 
 
 
 
 
 URL 주소 
 
 
 
 URL 주소

복사

닫기

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

---

## chunk 6
국민의 나라, 정의로운 대한민국! 공정하고 정의로운, 인권이 존중받는 사회!

법무부가 함께합니다. 
 --->

법무정책서비스

-->

국정과제

-->

법무/검찰

법무/검찰

-->

주택임대차법령정보

-->

상가건물임대차법령정보

-->

공증

-->

재외공관공증

-->

법무법인

-->

마을변호사

-->

국제법무지원

-->

법률시장 개방

-->

국제아동탈취

-->

송무업무

-->

신고포상금제 지급

-->

남북관계

-->

중소기업 법률지원

-->

공익신탁제도

-->

무죄재판서게재

범죄예방

범죄예방

-->

법교육

-->

사회봉사 국민공모제

-->

전자감독제도

-->

범죄예방 환경개선사업

-->

신상정보 등록제도

-->

전자보석제도

-->

전자장치 부착 잠정조치

-->

전자감독 피해자 보호 시스템

-->

수강명령제도

인권

인권

-->

국가인권정책기본계획

-->

국제인권규범

-->

국제인권뉴스레터

-->

인권보호제도

-->

범죄피해자 보호·지원제도

-->

범죄피해자 원스톱 솔루션 센터

-->

인권정책자료실

-->

인권침해신고센터

교정

교정

-->

교정직 경력경쟁채용시험

-->

수형자 집중인성교육

-->

구인·구직 만남의 날(채용면접)

-->

스마트접견제도

-->

교정시설 원격의료시스템

-->

심리치료프로그램 운영

-->

교정민원콜센터

-->

교정정보 빅데이터 시각화

출입국·외국인

출입국·외국인

-->

출입국관리직 경력경쟁채용시험

-->

사회통합 정책

---

## chunk 7
-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금 ･ 건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

외국인보호위원회

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

시험정보

시험정보

-->

변호사시험

-->

법조윤리시험

-->

사법시험

-->

시험자료실

-->

참여마당

정책참여

정책참여

-->

전자공청회

-->

국민생각함

moj_ms_S

어떤 제도인가요?

해외 우수인재와 외국인 단체관광객에게 비자를 온라인으로 신속하게 발급하고, 국내체류 외국인의 출입국･체류 민원을 원격으로 처리하기 위해 설립된 전국 단위의 온라인민원･비자 발급 전담기구입니다.

어떤 업무를 처리하나요?

전자비자 발급
```

---

## A1B-073 moj-seasonal-worker-program__candidate__d8e9827fc80e

- 제목: [검토 후보] 법무부 외국인 계절근로자 프로그램
- sourceUrl: https://www.immigration.go.kr/moj/194/subview.do
- sourceType: official_government
- topic: visa
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-seasonal-worker-program
- supersededBy: 없음
- chunkCount: 14
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 278107
- extractedChars: 60003
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 법무부 외국인 계절근로자 프로그램
source_url: https://www.immigration.go.kr/moj/194/subview.do
source_type: official_government
topic: visa
legal_priority: 4
monitor_cadence: daily
change_signals: seasonal_worker, mou, quota, local_government, procedure
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: d752d62774a91921a56aed8025e5239cddab503c34643c9ba3f3bb42f59cbb9a
byte_length: 278107
extracted_chars: 60003

외국인 계절근로자 프로그램

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

국가상징안내

어린이

ENGLISH

SNS 
 
 
 인스타그램

스레드

페이스북

엑스

유튜브

네이버 블로그

티스토리

법무부

통합검색

통합검색

검색어를 입력해주세요

전체 
 메뉴 
 기관 
 직원 
 게시판 
 웹페이지 
 뉴스소식 
 자료

-->
 
 
 검색어 삭제 
 
 
 검색 버튼

인기 검색어

주간

일간

주간 검색어

일간 검색어

최근검색어

최근검색어 전체 삭제

최근검색어 전체 삭제 
 
 
 -->

자동완성 닫기

닫기

전체메뉴

어린이

ENGLISH

본인인증 해제

-->

---

## chunk 1
온라인민원

열기

-->

교도소·구치소

교도소·구치소

-->

일반접견 예약

-->

화상접견 예약

-->

스마트접견 예약

-->

접견예약 확인

-->

변호인접견 예약

-->

변호인화상접견 예약

-->

변호인접견예약 확인

-->

보관금 조회

-->

반입도서 관리

-->

수용·출소 증명서발급

보호관찰소·소년원·분류심사원·국립법무병원

보호관찰소·소년원·분류심사원·국립법무병원

-->

소년보호 편지쓰기

-->

소년보호 증명발급

-->

국립법무병원 대면면회 예약

-->

국립법무병원 화상면회 예약

-->

사회봉사 국민공모

사증·출입국·체류·국적

사증·출입국·체류·국적

-->

출입국 전자민원(하이코리아)

-->

출입국사무소 방문예약

-->

사증발급 인정서 결과조회

-->

출입국 사실증명 발급

-->

외국인등록 사실증명 발급

-->

국내거소신고 발급

-->

국적선택신고 발급

-->

국적이탈신고 발급

변호사시험·사법시험

변호사시험·사법시험

-->

변호사시험 합격증명 발급

-->

사법시험 합격증명 발급

정보공개/개방

열기

-->

정보공개청구 안내

정보공개청구 안내

-->

정보공개제도

-->

수수료 안내

사전정보공표

사전정보공표

-->

공표대상 법무행정정보의 목록

-->

주요정책 추진과정 공개

-->

행정자료실

정보목록

정보목록

-->

정보목록(24년 7월 ~)

-->

정보목록(06년 1월 ~ 24년 6월)

정보공개 청구

-->

공개여부 및 불복 신청 사례

-->

정책실명제

---

## chunk 2
정책실명제

-->

국민신청실명제

-->

정책실명 공개과제

공공데이터 개방

공공데이터 개방

-->

공공데이터 개방 현황

-->

공공데이터 개방 알림

-->

공공데이터 신청 사례

-->

공공데이터 오류신고/수요조사

-->

한눈에 보는 법무 공공데이터

청렴자료공개

청렴자료공개

-->

반부패 청렴자료

-->

감사계획·결과

-->

수의계약 현황

-->

업무추진비

-->

부패행위현황

국고보조금

-->

비공개 대상 정보안내

법무정책서비스

열기

-->

국정과제

-->

법무/검찰

법무/검찰

-->

주택임대차법령정보

-->

상가건물임대차법령정보

-->

공증

-->

재외공관공증

-->

법무법인

-->

마을변호사

-->

국제법무지원

-->

법률시장 개방

-->

국제아동탈취

-->

송무업무

-->

신고포상금제 지급

-->

남북관계

-->

중소기업 법률지원

-->

공익신탁제도

-->

무죄재판서게재

범죄예방

범죄예방

-->

법교육

-->

사회봉사 국민공모제

-->

전자감독제도

-->

범죄예방 환경개선사업

-->

신상정보 등록제도

-->

전자보석제도

-->

전자장치 부착 잠정조치

-->

전자감독 피해자 보호 시스템

-->

수강명령제도

인권

인권

-->

국가인권정책기본계획

-->

국제인권규범

-->

국제인권뉴스레터

-->

인권보호제도

-->

범죄피해자 보호·지원제도

-->

범죄피해자 원스톱 솔루션 센터

-->

인권정책자료실

-->

인권침해신고센터

교정

---

## chunk 3
교정

-->

교정직 경력경쟁채용시험

-->

수형자 집중인성교육

-->

구인·구직 만남의 날(채용면접)

-->

스마트접견제도

-->

교정시설 원격의료시스템

-->

심리치료프로그램 운영

-->

교정민원콜센터

-->

교정정보 빅데이터 시각화

출입국·외국인

출입국·외국인

-->

출입국관리직 경력경쟁채용시험

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금 ･ 건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

외국인보호위원회

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

시험정보

시험정보

-->

변호사시험

-->

법조윤리시험

-->

사법시험

-->

시험자료실

-->

참여마당

정책참여

정책참여

-->

전자공청회

-->

국민생각함

법령/자료

열기

-->

법령정보

법령정보

-->

훈령

-->

예규

-->

고시

-->

입법 예고

-->

행정 예고

-->

개정 법령

-->

소관 법령

-->

가이드라인(지침)

통계정보

통계정보

-->

통계자료

-->

교정통계

-->

출입국통계

---

## chunk 4
-->

e-나라지표

자료실

자료실

-->

업무자료

-->

간행물

-->

국회관련자료

-->

재정정보

해외자료

해외자료

-->

해외 법제 자료 및 최신 동향

-->

투자분쟁 관련 자료

법무뉴스

열기

-->

보도자료

보도자료

-->

보도자료

-->

보도설명자료

공지사항

공지사항

-->

공지사항

-->

법무행사

-->

입찰정보

채용정보

-->

홍보자료

홍보자료

-->

동영상

-->

카드뉴스

-->

웹툰/정보 그림

-->

홍보책자

-->

소식지

-->

맞춤형 관심분야

-->

정부 출범 1주년 성과 기획 콘텐츠

국정성과 홍보자료

-->

국정성과 홍보자료

국민참여

열기

-->

포상참여

포상참여

-->

포상대상자공개

제안합니다

제안합니다

-->

제안합니다

신고센터

신고센터

-->

보조금 부조리 신고

-->

공직퇴임변호사 수임제한 위반 신고

-->

인권침해 신고

-->

부조리 신고

-->

부조리 신고(익명)

-->

비리공직자 내부공익 신고

-->

예산낭비 신고

-->

예산절감 제안신청

-->

변호사·공증 신문고

-->

비영리법인 부정비리 신고

-->

공익신고

-->

안전신고

-->

채용비리신고

규제개혁

규제개혁

-->

자료마당

-->

알림마당

-->

규제혁파 과제

-->

정부입법

-->

부처별 보도자료

-->

부처별 규제

-->

규제혁신 홍보자료

-->

규제정보포털

-->

규제개혁신문고

-->

규제입증요청

적극행정

---

## chunk 5
적극행정

-->

제도소개

-->

국민참여

-->

적극행정 소송지원

-->

적극행정 자료실

-->

적극행정 우수사례

협동조합 경영공시

-->

청렴생각함

법무부 소개

열기

-->

장관소개

-->

차관소개

차관소개

-->

약력

-->

역대차관

기관소개

기관소개

-->

비전과 임무

-->

예산

-->

연혁

-->

상징

-->

브랜드

조직과 기능

조직과 기능

-->

본부

-->

소속기관/검찰청

-->

산하기관

-->

직원검색

청사안내

청사안내

-->

층별안내

-->

찾아오시는길

누리집 안내

열기

-->

누리집 이용안내

-->

누리집 지도

-->

개인정보처리방침

개인정보처리방침

-->

이전 개인정보처리방침

알기쉬운 개인정보처리방침

-->

정보주체 권리보장

-->

저작권정책

-->

뷰어프로그램내려받기

-->

홈페이지 개선의견

-->

전화번호안내

-->

법무부 통합검색

누리집 지도 
 
 
 메뉴닫기

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기 
 
 
 페이스북

엑스

카카오스토리 
 
 핀터레스트 
 
 
 
 
 
 
 URL 주소 
 
 
 
 URL 주소

복사

닫기

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

국민의 나라, 정의로운 대한민국! 공정하고 정의로운, 인권이 존중받는 사회!

---

## chunk 6
법무부가 함께합니다. 
 --->

법무정책서비스

-->

국정과제

-->

법무/검찰

법무/검찰

-->

주택임대차법령정보

-->

상가건물임대차법령정보

-->

공증

-->

재외공관공증

-->

법무법인

-->

마을변호사

-->

국제법무지원

-->

법률시장 개방

-->

국제아동탈취

-->

송무업무

-->

신고포상금제 지급

-->

남북관계

-->

중소기업 법률지원

-->

공익신탁제도

-->

무죄재판서게재

범죄예방

범죄예방

-->

법교육

-->

사회봉사 국민공모제

-->

전자감독제도

-->

범죄예방 환경개선사업

-->

신상정보 등록제도

-->

전자보석제도

-->

전자장치 부착 잠정조치

-->

전자감독 피해자 보호 시스템

-->

수강명령제도

인권

인권

-->

국가인권정책기본계획

-->

국제인권규범

-->

국제인권뉴스레터

-->

인권보호제도

-->

범죄피해자 보호·지원제도

-->

범죄피해자 원스톱 솔루션 센터

-->

인권정책자료실

-->

인권침해신고센터

교정

교정

-->

교정직 경력경쟁채용시험

-->

수형자 집중인성교육

-->

구인·구직 만남의 날(채용면접)

-->

스마트접견제도

-->

교정시설 원격의료시스템

-->

심리치료프로그램 운영

-->

교정민원콜센터

-->

교정정보 빅데이터 시각화

출입국·외국인

출입국·외국인

-->

출입국관리직 경력경쟁채용시험

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

---

## chunk 7
-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금 ･ 건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

외국인보호위원회

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

시험정보

시험정보

-->

변호사시험

-->

법조윤리시험

-->

사법시험

-->

시험자료실

-->

참여마당

정책참여

정책참여

-->

전자공청회

-->

국민생각함

moj_ms_S

'외국인 계절근로자 프로그램'은 어떤 제도인가요?

파종기‧수확기 등 계절성이 있어 단기간‧집중적으로 일손이 필요한 농‧어업 분야에서 합법적으로 외국인을 고용할 수 있는 제도
 
 일손이 필요한 기간이 짧아 ‘ 고용허가제* ’를 통한 외국인 고용이 어려운 농‧어업 분야에 최대 8개월 간 계절근로자 고용을 허용 * 연중 상시 외국인 근로자가 필요한 축산 분야 등을 대상으로 외국인 고용 허가

계절근로자 도입 주체는 어디인가요?
```

---

## A1B-074 moj-skilled-worker-points-visa__candidate__3043680188d1

- 제목: [검토 후보] 법무부 외국인 숙련기능인력 점수제 비자
- sourceUrl: https://www.immigration.go.kr/moj/187/subview.do
- sourceType: official_government
- topic: visa
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-skilled-worker-points-visa
- supersededBy: 없음
- chunkCount: 14
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 278272
- extractedChars: 60099
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 법무부 외국인 숙련기능인력 점수제 비자
source_url: https://www.immigration.go.kr/moj/187/subview.do
source_type: official_government
topic: visa
legal_priority: 4
monitor_cadence: daily
change_signals: e7-4, skilled_worker, quota, eligibility, employment_limit
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: eb177539656500a8c7a87ebbdf7593e5dc608c30f1f03576477ee7d73ffadf46
byte_length: 278272
extracted_chars: 60099

외국인 숙련기능인력 점수제 비자

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

국가상징안내

어린이

ENGLISH

SNS 
 
 
 인스타그램

스레드

페이스북

엑스

유튜브

네이버 블로그

티스토리

법무부

통합검색

통합검색

검색어를 입력해주세요

전체 
 메뉴 
 기관 
 직원 
 게시판 
 웹페이지 
 뉴스소식 
 자료

-->
 
 
 검색어 삭제 
 
 
 검색 버튼

인기 검색어

주간

일간

주간 검색어

일간 검색어

최근검색어

최근검색어 전체 삭제

최근검색어 전체 삭제 
 
 
 -->

자동완성 닫기

닫기

전체메뉴

어린이

ENGLISH

본인인증 해제

---

## chunk 1
-->

온라인민원

열기

-->

교도소·구치소

교도소·구치소

-->

일반접견 예약

-->

화상접견 예약

-->

스마트접견 예약

-->

접견예약 확인

-->

변호인접견 예약

-->

변호인화상접견 예약

-->

변호인접견예약 확인

-->

보관금 조회

-->

반입도서 관리

-->

수용·출소 증명서발급

보호관찰소·소년원·분류심사원·국립법무병원

보호관찰소·소년원·분류심사원·국립법무병원

-->

소년보호 편지쓰기

-->

소년보호 증명발급

-->

국립법무병원 대면면회 예약

-->

국립법무병원 화상면회 예약

-->

사회봉사 국민공모

사증·출입국·체류·국적

사증·출입국·체류·국적

-->

출입국 전자민원(하이코리아)

-->

출입국사무소 방문예약

-->

사증발급 인정서 결과조회

-->

출입국 사실증명 발급

-->

외국인등록 사실증명 발급

-->

국내거소신고 발급

-->

국적선택신고 발급

-->

국적이탈신고 발급

변호사시험·사법시험

변호사시험·사법시험

-->

변호사시험 합격증명 발급

-->

사법시험 합격증명 발급

정보공개/개방

열기

-->

정보공개청구 안내

정보공개청구 안내

-->

정보공개제도

-->

수수료 안내

사전정보공표

사전정보공표

-->

공표대상 법무행정정보의 목록

-->

주요정책 추진과정 공개

-->

행정자료실

정보목록

정보목록

-->

정보목록(24년 7월 ~)

-->

정보목록(06년 1월 ~ 24년 6월)

정보공개 청구

-->

공개여부 및 불복 신청 사례

-->

---

## chunk 2
정책실명제

정책실명제

-->

국민신청실명제

-->

정책실명 공개과제

공공데이터 개방

공공데이터 개방

-->

공공데이터 개방 현황

-->

공공데이터 개방 알림

-->

공공데이터 신청 사례

-->

공공데이터 오류신고/수요조사

-->

한눈에 보는 법무 공공데이터

청렴자료공개

청렴자료공개

-->

반부패 청렴자료

-->

감사계획·결과

-->

수의계약 현황

-->

업무추진비

-->

부패행위현황

국고보조금

-->

비공개 대상 정보안내

법무정책서비스

열기

-->

국정과제

-->

법무/검찰

법무/검찰

-->

주택임대차법령정보

-->

상가건물임대차법령정보

-->

공증

-->

재외공관공증

-->

법무법인

-->

마을변호사

-->

국제법무지원

-->

법률시장 개방

-->

국제아동탈취

-->

송무업무

-->

신고포상금제 지급

-->

남북관계

-->

중소기업 법률지원

-->

공익신탁제도

-->

무죄재판서게재

범죄예방

범죄예방

-->

법교육

-->

사회봉사 국민공모제

-->

전자감독제도

-->

범죄예방 환경개선사업

-->

신상정보 등록제도

-->

전자보석제도

-->

전자장치 부착 잠정조치

-->

전자감독 피해자 보호 시스템

-->

수강명령제도

인권

인권

-->

국가인권정책기본계획

-->

국제인권규범

-->

국제인권뉴스레터

-->

인권보호제도

-->

범죄피해자 보호·지원제도

-->

범죄피해자 원스톱 솔루션 센터

-->

인권정책자료실

-->

---

## chunk 3
인권침해신고센터

교정

교정

-->

교정직 경력경쟁채용시험

-->

수형자 집중인성교육

-->

구인·구직 만남의 날(채용면접)

-->

스마트접견제도

-->

교정시설 원격의료시스템

-->

심리치료프로그램 운영

-->

교정민원콜센터

-->

교정정보 빅데이터 시각화

출입국·외국인

출입국·외국인

-->

출입국관리직 경력경쟁채용시험

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금 ･ 건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

외국인보호위원회

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

시험정보

시험정보

-->

변호사시험

-->

법조윤리시험

-->

사법시험

-->

시험자료실

-->

참여마당

정책참여

정책참여

-->

전자공청회

-->

국민생각함

법령/자료

열기

-->

법령정보

법령정보

-->

훈령

-->

예규

-->

고시

-->

입법 예고

-->

행정 예고

-->

개정 법령

-->

소관 법령

-->

가이드라인(지침)

통계정보

통계정보

-->

통계자료

-->

---

## chunk 4
교정통계

-->

출입국통계

-->

e-나라지표

자료실

자료실

-->

업무자료

-->

간행물

-->

국회관련자료

-->

재정정보

해외자료

해외자료

-->

해외 법제 자료 및 최신 동향

-->

투자분쟁 관련 자료

법무뉴스

열기

-->

보도자료

보도자료

-->

보도자료

-->

보도설명자료

공지사항

공지사항

-->

공지사항

-->

법무행사

-->

입찰정보

채용정보

-->

홍보자료

홍보자료

-->

동영상

-->

카드뉴스

-->

웹툰/정보 그림

-->

홍보책자

-->

소식지

-->

맞춤형 관심분야

-->

정부 출범 1주년 성과 기획 콘텐츠

국정성과 홍보자료

-->

국정성과 홍보자료

국민참여

열기

-->

포상참여

포상참여

-->

포상대상자공개

제안합니다

제안합니다

-->

제안합니다

신고센터

신고센터

-->

보조금 부조리 신고

-->

공직퇴임변호사 수임제한 위반 신고

-->

인권침해 신고

-->

부조리 신고

-->

부조리 신고(익명)

-->

비리공직자 내부공익 신고

-->

예산낭비 신고

-->

예산절감 제안신청

-->

변호사·공증 신문고

-->

비영리법인 부정비리 신고

-->

공익신고

-->

안전신고

-->

채용비리신고

규제개혁

규제개혁

-->

자료마당

-->

알림마당

-->

규제혁파 과제

-->

정부입법

-->

부처별 보도자료

-->

부처별 규제

-->

규제혁신 홍보자료

-->

규제정보포털

-->

규제개혁신문고

---

## chunk 5
-->

규제입증요청

적극행정

적극행정

-->

제도소개

-->

국민참여

-->

적극행정 소송지원

-->

적극행정 자료실

-->

적극행정 우수사례

협동조합 경영공시

-->

청렴생각함

법무부 소개

열기

-->

장관소개

-->

차관소개

차관소개

-->

약력

-->

역대차관

기관소개

기관소개

-->

비전과 임무

-->

예산

-->

연혁

-->

상징

-->

브랜드

조직과 기능

조직과 기능

-->

본부

-->

소속기관/검찰청

-->

산하기관

-->

직원검색

청사안내

청사안내

-->

층별안내

-->

찾아오시는길

누리집 안내

열기

-->

누리집 이용안내

-->

누리집 지도

-->

개인정보처리방침

개인정보처리방침

-->

이전 개인정보처리방침

알기쉬운 개인정보처리방침

-->

정보주체 권리보장

-->

저작권정책

-->

뷰어프로그램내려받기

-->

홈페이지 개선의견

-->

전화번호안내

-->

법무부 통합검색

누리집 지도 
 
 
 메뉴닫기

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기 
 
 
 페이스북

엑스

카카오스토리 
 
 핀터레스트 
 
 
 
 
 
 
 URL 주소 
 
 
 
 URL 주소

복사

닫기

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

---

## chunk 6
국민의 나라, 정의로운 대한민국! 공정하고 정의로운, 인권이 존중받는 사회!

법무부가 함께합니다. 
 --->

법무정책서비스

-->

국정과제

-->

법무/검찰

법무/검찰

-->

주택임대차법령정보

-->

상가건물임대차법령정보

-->

공증

-->

재외공관공증

-->

법무법인

-->

마을변호사

-->

국제법무지원

-->

법률시장 개방

-->

국제아동탈취

-->

송무업무

-->

신고포상금제 지급

-->

남북관계

-->

중소기업 법률지원

-->

공익신탁제도

-->

무죄재판서게재

범죄예방

범죄예방

-->

법교육

-->

사회봉사 국민공모제

-->

전자감독제도

-->

범죄예방 환경개선사업

-->

신상정보 등록제도

-->

전자보석제도

-->

전자장치 부착 잠정조치

-->

전자감독 피해자 보호 시스템

-->

수강명령제도

인권

인권

-->

국가인권정책기본계획

-->

국제인권규범

-->

국제인권뉴스레터

-->

인권보호제도

-->

범죄피해자 보호·지원제도

-->

범죄피해자 원스톱 솔루션 센터

-->

인권정책자료실

-->

인권침해신고센터

교정

교정

-->

교정직 경력경쟁채용시험

-->

수형자 집중인성교육

-->

구인·구직 만남의 날(채용면접)

-->

스마트접견제도

-->

교정시설 원격의료시스템

-->

심리치료프로그램 운영

-->

교정민원콜센터

-->

교정정보 빅데이터 시각화

출입국·외국인

출입국·외국인

-->

출입국관리직 경력경쟁채용시험

-->

사회통합 정책

---

## chunk 7
-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금 ･ 건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

외국인보호위원회

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

시험정보

시험정보

-->

변호사시험

-->

법조윤리시험

-->

사법시험

-->

시험자료실

-->

참여마당

정책참여

정책참여

-->

전자공청회

-->

국민생각함

moj_ms_S

어떤 제도인가요?

국내에서 비전문취업(E-9), 선원취업(E-10), 방문취업(H-2) 비자로 5년 이상 근무 중인 외국인이 숙련도 등 분야에서 자격 요건을 충족할 경우 장기 체류할 수 있는 비자(E-7-4)로 변경 신청할 수 있는 제도입니다. 
 단, 취업 기간이 4년 이상이더라도 사회통합프로고램 3단계 이상을 이수한 경우 취업 기간을 충족한 것으로 봄

누가 신청할 수 있나요?
```

---

## A1B-075 moj-social-integration-program-kiip__candidate__0971e19045aa

- 제목: [검토 후보] 법무부 사회통합프로그램
- sourceUrl: https://www.immigration.go.kr/moj/369/subview.do
- sourceType: official_government
- topic: visa
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-social-integration-program-kiip
- supersededBy: 없음
- chunkCount: 13
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 278025
- extractedChars: 59970
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 법무부 사회통합프로그램
source_url: https://www.immigration.go.kr/moj/369/subview.do
source_type: official_government
topic: visa
legal_priority: 4
monitor_cadence: daily
change_signals: kiip, permanent_residence, naturalization, points, course_hours, pre_test_fee
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 7c722e00e0ca26a1679a78705ea6878e4956a4187f840161d8447274e3f3d697
byte_length: 278025
extracted_chars: 59970

사회통합프로그램

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

국가상징안내

어린이

ENGLISH

SNS 
 
 
 인스타그램

스레드

페이스북

엑스

유튜브

네이버 블로그

티스토리

법무부

통합검색

통합검색

검색어를 입력해주세요

전체 
 메뉴 
 기관 
 직원 
 게시판 
 웹페이지 
 뉴스소식 
 자료

-->
 
 
 검색어 삭제 
 
 
 검색 버튼

인기 검색어

주간

일간

주간 검색어

일간 검색어

최근검색어

최근검색어 전체 삭제

최근검색어 전체 삭제 
 
 
 -->

자동완성 닫기

닫기

전체메뉴

어린이

ENGLISH

본인인증 해제

---

## chunk 1
-->

온라인민원

열기

-->

교도소·구치소

교도소·구치소

-->

일반접견 예약

-->

화상접견 예약

-->

스마트접견 예약

-->

접견예약 확인

-->

변호인접견 예약

-->

변호인화상접견 예약

-->

변호인접견예약 확인

-->

보관금 조회

-->

반입도서 관리

-->

수용·출소 증명서발급

보호관찰소·소년원·분류심사원·국립법무병원

보호관찰소·소년원·분류심사원·국립법무병원

-->

소년보호 편지쓰기

-->

소년보호 증명발급

-->

국립법무병원 대면면회 예약

-->

국립법무병원 화상면회 예약

-->

사회봉사 국민공모

사증·출입국·체류·국적

사증·출입국·체류·국적

-->

출입국 전자민원(하이코리아)

-->

출입국사무소 방문예약

-->

사증발급 인정서 결과조회

-->

출입국 사실증명 발급

-->

외국인등록 사실증명 발급

-->

국내거소신고 발급

-->

국적선택신고 발급

-->

국적이탈신고 발급

변호사시험·사법시험

변호사시험·사법시험

-->

변호사시험 합격증명 발급

-->

사법시험 합격증명 발급

정보공개/개방

열기

-->

정보공개청구 안내

정보공개청구 안내

-->

정보공개제도

-->

수수료 안내

사전정보공표

사전정보공표

-->

공표대상 법무행정정보의 목록

-->

주요정책 추진과정 공개

-->

행정자료실

정보목록

정보목록

-->

정보목록(24년 7월 ~)

-->

정보목록(06년 1월 ~ 24년 6월)

정보공개 청구

-->

공개여부 및 불복 신청 사례

-->

---

## chunk 2
정책실명제

정책실명제

-->

국민신청실명제

-->

정책실명 공개과제

공공데이터 개방

공공데이터 개방

-->

공공데이터 개방 현황

-->

공공데이터 개방 알림

-->

공공데이터 신청 사례

-->

공공데이터 오류신고/수요조사

-->

한눈에 보는 법무 공공데이터

청렴자료공개

청렴자료공개

-->

반부패 청렴자료

-->

감사계획·결과

-->

수의계약 현황

-->

업무추진비

-->

부패행위현황

국고보조금

-->

비공개 대상 정보안내

법무정책서비스

열기

-->

국정과제

-->

법무/검찰

법무/검찰

-->

주택임대차법령정보

-->

상가건물임대차법령정보

-->

공증

-->

재외공관공증

-->

법무법인

-->

마을변호사

-->

국제법무지원

-->

법률시장 개방

-->

국제아동탈취

-->

송무업무

-->

신고포상금제 지급

-->

남북관계

-->

중소기업 법률지원

-->

공익신탁제도

-->

무죄재판서게재

범죄예방

범죄예방

-->

법교육

-->

사회봉사 국민공모제

-->

전자감독제도

-->

범죄예방 환경개선사업

-->

신상정보 등록제도

-->

전자보석제도

-->

전자장치 부착 잠정조치

-->

전자감독 피해자 보호 시스템

-->

수강명령제도

인권

인권

-->

국가인권정책기본계획

-->

국제인권규범

-->

국제인권뉴스레터

-->

인권보호제도

-->

범죄피해자 보호·지원제도

-->

범죄피해자 원스톱 솔루션 센터

-->

인권정책자료실

-->

---

## chunk 3
인권침해신고센터

교정

교정

-->

교정직 경력경쟁채용시험

-->

수형자 집중인성교육

-->

구인·구직 만남의 날(채용면접)

-->

스마트접견제도

-->

교정시설 원격의료시스템

-->

심리치료프로그램 운영

-->

교정민원콜센터

-->

교정정보 빅데이터 시각화

출입국·외국인

출입국·외국인

-->

출입국관리직 경력경쟁채용시험

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금 ･ 건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

외국인보호위원회

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

시험정보

시험정보

-->

변호사시험

-->

법조윤리시험

-->

사법시험

-->

시험자료실

-->

참여마당

정책참여

정책참여

-->

전자공청회

-->

국민생각함

법령/자료

열기

-->

법령정보

법령정보

-->

훈령

-->

예규

-->

고시

-->

입법 예고

-->

행정 예고

-->

개정 법령

-->

소관 법령

-->

가이드라인(지침)

통계정보

통계정보

-->

통계자료

-->

---

## chunk 4
교정통계

-->

출입국통계

-->

e-나라지표

자료실

자료실

-->

업무자료

-->

간행물

-->

국회관련자료

-->

재정정보

해외자료

해외자료

-->

해외 법제 자료 및 최신 동향

-->

투자분쟁 관련 자료

법무뉴스

열기

-->

보도자료

보도자료

-->

보도자료

-->

보도설명자료

공지사항

공지사항

-->

공지사항

-->

법무행사

-->

입찰정보

채용정보

-->

홍보자료

홍보자료

-->

동영상

-->

카드뉴스

-->

웹툰/정보 그림

-->

홍보책자

-->

소식지

-->

맞춤형 관심분야

-->

정부 출범 1주년 성과 기획 콘텐츠

국정성과 홍보자료

-->

국정성과 홍보자료

국민참여

열기

-->

포상참여

포상참여

-->

포상대상자공개

제안합니다

제안합니다

-->

제안합니다

신고센터

신고센터

-->

보조금 부조리 신고

-->

공직퇴임변호사 수임제한 위반 신고

-->

인권침해 신고

-->

부조리 신고

-->

부조리 신고(익명)

-->

비리공직자 내부공익 신고

-->

예산낭비 신고

-->

예산절감 제안신청

-->

변호사·공증 신문고

-->

비영리법인 부정비리 신고

-->

공익신고

-->

안전신고

-->

채용비리신고

규제개혁

규제개혁

-->

자료마당

-->

알림마당

-->

규제혁파 과제

-->

정부입법

-->

부처별 보도자료

-->

부처별 규제

-->

규제혁신 홍보자료

-->

규제정보포털

-->

규제개혁신문고

---

## chunk 5
-->

규제입증요청

적극행정

적극행정

-->

제도소개

-->

국민참여

-->

적극행정 소송지원

-->

적극행정 자료실

-->

적극행정 우수사례

협동조합 경영공시

-->

청렴생각함

법무부 소개

열기

-->

장관소개

-->

차관소개

차관소개

-->

약력

-->

역대차관

기관소개

기관소개

-->

비전과 임무

-->

예산

-->

연혁

-->

상징

-->

브랜드

조직과 기능

조직과 기능

-->

본부

-->

소속기관/검찰청

-->

산하기관

-->

직원검색

청사안내

청사안내

-->

층별안내

-->

찾아오시는길

누리집 안내

열기

-->

누리집 이용안내

-->

누리집 지도

-->

개인정보처리방침

개인정보처리방침

-->

이전 개인정보처리방침

알기쉬운 개인정보처리방침

-->

정보주체 권리보장

-->

저작권정책

-->

뷰어프로그램내려받기

-->

홈페이지 개선의견

-->

전화번호안내

-->

법무부 통합검색

누리집 지도 
 
 
 메뉴닫기

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기 
 
 
 페이스북

엑스

카카오스토리 
 
 핀터레스트 
 
 
 
 
 
 
 URL 주소 
 
 
 
 URL 주소

복사

닫기

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

---

## chunk 6
국민의 나라, 정의로운 대한민국! 공정하고 정의로운, 인권이 존중받는 사회!

법무부가 함께합니다. 
 --->

법무정책서비스

-->

국정과제

-->

법무/검찰

법무/검찰

-->

주택임대차법령정보

-->

상가건물임대차법령정보

-->

공증

-->

재외공관공증

-->

법무법인

-->

마을변호사

-->

국제법무지원

-->

법률시장 개방

-->

국제아동탈취

-->

송무업무

-->

신고포상금제 지급

-->

남북관계

-->

중소기업 법률지원

-->

공익신탁제도

-->

무죄재판서게재

범죄예방

범죄예방

-->

법교육

-->

사회봉사 국민공모제

-->

전자감독제도

-->

범죄예방 환경개선사업

-->

신상정보 등록제도

-->

전자보석제도

-->

전자장치 부착 잠정조치

-->

전자감독 피해자 보호 시스템

-->

수강명령제도

인권

인권

-->

국가인권정책기본계획

-->

국제인권규범

-->

국제인권뉴스레터

-->

인권보호제도

-->

범죄피해자 보호·지원제도

-->

범죄피해자 원스톱 솔루션 센터

-->

인권정책자료실

-->

인권침해신고센터

교정

교정

-->

교정직 경력경쟁채용시험

-->

수형자 집중인성교육

-->

구인·구직 만남의 날(채용면접)

-->

스마트접견제도

-->

교정시설 원격의료시스템

-->

심리치료프로그램 운영

-->

교정민원콜센터

-->

교정정보 빅데이터 시각화

출입국·외국인

출입국·외국인

-->

출입국관리직 경력경쟁채용시험

-->

사회통합 정책

---

## chunk 7
-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금 ･ 건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

외국인보호위원회

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

시험정보

시험정보

-->

변호사시험

-->

법조윤리시험

-->

사법시험

-->

시험자료실

-->

참여마당

정책참여

정책참여

-->

전자공청회

-->

국민생각함

-->

사회통합프로그램

-->

조기적응프로그램

-->

국제결혼안내프로그램

moj_ms_S

재한외국인이 우리 사회 구성원으로서 살아가는데 필요한 기본소양 (한국어, 한국문화) 함양 기회 제공

누가 참여할 수 있나요?

국적, 영주 등 체류자격을 취득하려는 재한외국인, 국적취득 후 3년 이내인 사람 
 
 이수혜택 : 체류허가 및 영주·국적 신청 시 가점 부여 또는 귀화시험 면제 등

어떤 과정인가요?

한국어와 한국문화 
 
 0~4단계로 구성
 
 사전평가(=레벨 테스트) 등을 거쳐 단계배정
 
 
 
 한국사회 이해 
 
 영주자격 취득 시 70시간, 국적취득 시 100시간

어떻게 신청하나요?
```

---

## A1B-076 moj-stay-management-policy__candidate__36ade67cce9c

- 제목: [검토 후보] 법무부 외국인 체류관리 정책
- sourceUrl: https://www.immigration.go.kr/immigration/1515/subview.do
- sourceType: official_government
- topic: process
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-stay-management-policy
- supersededBy: 없음
- chunkCount: 22
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 241554
- extractedChars: 53829
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 법무부 외국인 체류관리 정책
source_url: https://www.immigration.go.kr/immigration/1515/subview.do
source_type: official_government
topic: process
legal_priority: 4
monitor_cadence: daily
change_signals: student_policy, e7_occupation, seasonal_worker, e7-4, stay_management
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 762f1821156f80401da0248c2e75809ea1a304d32ac157c5dbc1f0db3085cbdc
byte_length: 241554
extracted_chars: 53829

외국인 체류관리

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

법무부 출입국·외국인정책본부

국가상징안내

법무부

ENGLISH

누리집 지도

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

---

## chunk 1
소식지 &apos;공존&apos;

-->

정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

---

## chunk 2
전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

누리집 지도 
 
 
 
 
 
 
 
 
 검색열기

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

검색닫기

메뉴열기 
 
 
 
 법무부

ENGLISH

누리집 지도

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

---

## chunk 3
정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

---

## chunk 4
해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

메뉴닫기

close

자주 찾는 메뉴

업무공지

채용공지

새소식

소속기관

법령

통계자료

보도자료

주요제도 -->
 주요제도

미디어자료

정보공개목록

이민정책

규제개선 -->
 규제개선

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기

URL 주소 
 
 
 
 URL 주소

복사

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

질서있는 개방을 선도하고 국민과 외국인이 조화를 이루며 살아가는
 성숙한 다문화 환경을 조성하여 안정적인 사회통합을 이루어 나가겠습니다.

---

## chunk 5
이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

immigration_ms_S

외국인 체류관리

---

## chunk 6
법무부는 합법적인 이주를 장려하고 촉진하며 지원하기 위하여 다양한 정책적 지원방안을 시행하고 있습니다.
 
 2013년부터 교수/연구원 등 전문인력, 의료관광객, 단체관광객 등 일부 외국인의 경우, 재외공관을 방문하지 않고도 온라인(비자포털, www.visa.go.kr )으로 대한민국 비자를 신청/발급 받아 신속, 편리하게 입국할 수 있도록 전자비자 제도를 시행함으로써 비자신청 민원편의를 도모하고 있습니다.
 
 또한 유학비자를 발급받고자 하는 학생들의 경우, 우수한 학습프로그램과 유학생 지원체계를 보유하고 있는 학교를 선택하도록 장려함으로써 우수한 외국 학생들이 한국에서 인적 자본을 성장시킬 수 있도록 지속적으로 지원하고 있습니다.

노동시장의 수요를 고려한 외국인유입정책

법무부는 고용노동부, 산업통상자원부 등 관계부처와 유기적으로 협력하여 외국인근로자 정책을 수립･시행하고 있습니다.
 
 2024년에는 내국인 구인 노력에도 불구하고 심각한 인력난을 겪고 있는 항공기, 송전, 요양분야에 외국인력을 신속히 공급하기 위해 전문·기능인력(E-7) 내 직종을 신설*하는 등 비자제도를 개선하였습니다. * 항공기(부품)제조원, 요양보호사, 송전전기원
 
 
 또한 구인난을 겪고 있는 분야의 수요를 고려하여, 농어업 부문인 1차 산업 및 도장･금형･주조 등 기초 2차 산업의 비숙련 부문에도 외국인력이 활용될 수 있도록 다양한 비자정책을 시행하고 있습니다.

계절근로자 제도

---

## chunk 7
농‧어촌의 고질적인 인력부족 문제를 해소하기 위하여 관계부처와 협업하여 2015년 10월부터 ‘외국인 계절근로자 제도’를 도입･운영하고 있습니다.
 
 ‘외국인 계절근로자 제도’란 계절적 수요에 따라 일손이 집중적으로 필요한 농‧어번기에 외국인을 단기간(최대 8개월까지) 탄력적으로 고용할 수 있는 제도입니다.

외국인 숙련기능인력 점수제 비자

주조‧금형‧용접 등 뿌리산업과 중소 제조업 등 심각한 인력난을 겪고 있는 분야에 숙련기능인력을 확보하기 위해 2017년 8월 1일부터 ‘외국인 숙련기능인력 점수제 비자(E-7-4)’를 도입하였으며, 시범사업 결과를 반영하여 2018년부터 본격적으로 실시하고 있습니다.
 
 ‘숙련기능인력 점수제 비자’란 최근 10년간 국내에서 비전문취업(E-9), 선원취업(E-10), 방문취업(H-2) 자격으로 4년 이상 체류한 등록외국인이 숙련도‧연령‧경력‧한국어능력 등 항목에서 일정 점수요건을 충족할 경우 장기체류 가능한 특정활동(E-7-4) 자격으로 변경할 수 있는 제도를 말합니다.

해외 우수인재 유치
```

---

## A1B-077 moj-tax-health-arrears-extension-restriction__candidate__71ca200088a3

- 제목: [검토 후보] 외국인 비자연장 전 세금·건강보험료 체납 확인제도
- sourceUrl: https://www.immigration.go.kr/immigration/1522/subview.do
- sourceType: official_government
- topic: warning
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: moj-tax-health-arrears-extension-restriction
- supersededBy: 없음
- chunkCount: 10
- extractionMethod: html
- contentType: text/html;charset=UTF-8
- byteLength: 224058
- extractedChars: 47242
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# 외국인 비자연장 전 세금·건강보험료 체납 확인제도
source_url: https://www.immigration.go.kr/immigration/1522/subview.do
source_type: official_government
topic: warning
legal_priority: 4
monitor_cadence: daily
change_signals: tax_arrears, health_insurance_arrears, extension_restriction, six_month_limit, office_scope
extraction_method: html
content_type: text/html;charset=UTF-8
byte_sha256: 43539d77ba0985c381657a521e542dce2d6b911a2d47e05a5029714c65f37c17
byte_length: 224058
extracted_chars: 47242

외국인 비자연장 전 세금·건강보험료 체납 확인제도

본문 바로가기

주메뉴 바로가기

주메뉴 바로가기

이 누리집은 대한민국 공식 전자정부 누리집입니다.

법무부 출입국·외국인정책본부

국가상징안내

법무부

ENGLISH

누리집 지도

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

---

## chunk 1
-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

소식지 &apos;공존&apos;

-->

정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

---

## chunk 2
전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

누리집 지도 
 
 
 
 
 
 
 
 
 검색열기

-->

검색분류

통합검색

메뉴검색

게시판

이미지

동영상

첨부문서

-->

검색어를 입력하세요

-->

검색닫기

메뉴열기 
 
 
 
 법무부

ENGLISH

누리집 지도

-->

온라인민원

-->

고객참여

-->

칭찬합시다

-->

출입국 현장투어

-->

정책제안

-->

출입국사범신고

-->

신고센터

-->

설문조사

-->

정보공개

-->

정보목록

-->

사전정보 공표

-->

정보공개 청구

불친절·불만 신고

-->

---

## chunk 3
소식지 &apos;공존&apos;

-->

정책메일서비스 신청

-->

증명서진위확인 검증 프로그램

뉴스·공지

-->

새소식

-->

업무공지

-->

본부

-->

소속기관

채용정보

-->

보도·설명자료

-->

보도자료

-->

설명자료

-->

기고·인터뷰

출입국 주요 소식

-->

포토뉴스

-->

희망나눔

-->

홍보자료

-->

미디어 자료

-->

소식지

자료실

-->

법령

-->

간행물

-->

통계자료

-->

연구자료

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

---

## chunk 4
전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

빅데이터·통계

-->

빅데이터 분석

-->

주요통계

-->

통계월보

-->

통계연보

-->

공공데이터 개방

출입국·외국인정책본부 소개

-->

본부장 소개

-->

인사말

-->

동정

-->

역대 본부장 및 국장

본부소개

-->

비전과 임무

-->

연혁

-->

기념일

-->

조직과 기능

-->

오시는 길

-->

제4차 외국인정책 기본계획

소속기관

-->

소속기관목록

-->

서울/인천/경기

-->

부산/경남

-->

광주/전라/제주

-->

대구/경북/강원

-->

대전/충청

누리집안내

-->

누리집 지도

-->

해외 주재관

-->

이동출입국 사무소 안내

메뉴닫기

close

자주 찾는 메뉴

업무공지

채용공지

새소식

소속기관

법령

통계자료

보도자료

주요제도 -->
 주요제도

미디어자료

정보공개목록

이민정책

규제개선 -->
 규제개선

홈

화면작게 
 기본 
 화면크게

페이지 인쇄

공유 
 
 
 보내기

URL 주소 
 
 
 
 URL 주소

복사

즐겨찾기 
 
 
 즐겨찾는 메뉴

닫기

현재 페이지를 즐겨찾는 메뉴로 등록하시겠습니까? 
 (즐겨찾는 메뉴는 최근 등록한 5개 메뉴가 노출됩니다) 
 
 메뉴 추가하기

초기화

-->

---

## chunk 5
질서있는 개방을 선도하고 국민과 외국인이 조화를 이루며 살아가는
 성숙한 다문화 환경을 조성하여 안정적인 사회통합을 이루어 나가겠습니다.

이민정책

-->

해외 이민정책 동향

-->

아시아

-->

미국·중남미

-->

유럽

이민정책

-->

국경관리

-->

외국인 체류관리

-->

불법체류 외국인 관리

-->

국적

-->

이민자 사회통합

-->

난민

-->

국제협력

주요제도

-->

사회통합 정책

-->

외국인종합안내센터(1345)

-->

온라인체류·사증민원센터

-->

외국인 계절근로자 프로그램

-->

외국인 숙련기능인력 점수제 비자

-->

공익사업 투자이민제

-->

외국인지문확인시스템

-->

탑승자 사전확인제도

-->

승객정보사전분석시스템

-->

자동출입국심사서비스

-->

자동출입국심사서비스 상호 이용

-->

보호의 일시해제 제도

-->

외국인 비자연장 전 세금·건강보험료 체납 확인제도

-->

출입국 우대카드 제도

-->

출국금지 심의위원회

-->

아프리카돼지열병 국내 유입 차단 대책

-->

전자여행허가제(K-ETA)

-->

전자입국신고서(e-Arrival card)

-->

외국인등록증 진위확인 시스템

해외 국가정황정보

-->

아시아

-->

중동

-->

아프리카

-->

중앙아시아·러시아

-->

기타

immigration_ms_S

관계부처 간 체납정보를 공유하여 지속적으로 세금을 체납하는 외국인에 대한 비자연장을 제한함으로써 자진 납부를 유도합니다.

어떻게 운영되나요?

---

## chunk 6
출입국관리공무원이 관계부처에서 보낸 체납정보를 활용하여 비자 연장 등을 신청하는 외국인의 세금 · 건강보험료 체납여부를 확인하고,
 
 체납이 있는 경우 출입국관리공무원의 납부 안내에 따라 체납액을 모두 납부하면 정상적으로 비자연장이 가능하지만, 미납 시에는 비자연장을 제한함으로써 체납액 납부를 유도합니다.

step1 
 징세기관 → 법무부
자료요청
 
 
 
 
 만19세이상 합법체류 
등록외국인 자료
 
 
 
 
 
 step2 
 법무부 → 징세기관
외국인 자료제공
 
 
 
 
 성명, 외국인 등록번호, 
신분구분
 
 
 
 
 
 step3 
 징세기관 → 법무부
체납정보 제공
 
 
 
 
 등록외국인의 체납액, 
전자납부번호 등
 
 
 
 
 
 step4 
 체류허가 담당자
체납확인/납부고지
 
 
 
 
 외국인 체류허가 연장 
신청 시 
 
 
 
 
 
 step5 
 체납액
납부/미납부
 
 
 
 
 체납액 납부 
 
 정상적 체류연장(체류
자격 별로 차이는
있으나 통상 2~5년)
 
 
 
 체납액 미납부 
 
 제한적 체류연장
(원칙적으로 6개월
이하만 허가)

어디서 운영하나요?

38개 전국 출입국기관에서 운영합니다.
 
 단, 외국인보호소, 출입국지원센터 제외

어떤 효과가 있나요?

국내 체류질서 확립 및 국가 재정 누수방지 기여

담당부서 : 
 
 
 
 전화번호 :

페이지 설문조사 양식 
 홈페이지의 서비스 품질 향상을 위해 만족도 조사를 실시하고 있습니다. 이 페이지에서 제공하는 정보에 대하여 얼마나 만족하셨습니까?

매우만족

만족

보통

불만족

---

## chunk 7
매우불만족

실국본부운영

실국본부 홈페이지

범죄예방정책국

교정본부

출입국&middot;외국인정책본부

특수목적 홈페이지

공익신탁 공시시스템

대한민국 비자포털

법률홈닥터

이로운법

사회통합정보망

솔로몬로파크(대전)

솔로몬로파크(부산)

스타트업 창업지원 법무플랫폼

자동출입국심사서비스 -->

자동출입국심사서비스

전자공증시스템

중소기업법률지원

통일법제데이터베이스

하이코리아 -->

하이코리아

형사사법포털

소속기관

법무연수원

법무연수원

대검찰청

대검찰청

광주고등검찰청

광주지방검찰청

광주지방검찰청 목포지청

광주지방검찰청 순천지청

광주지방검찰청 장흥지청

광주지방검찰청 해남지청

대구고등검찰청

대구지방검찰청

대구지방검찰청 경주지청

대구지방검찰청 김천지청

대구지방검찰청 상주지청

대구지방검찰청 안동지청

대구지방검찰청 영덕지청

대구지방검찰청 의성지청

대구지방검찰청 포항지청

대구지방검찰청 서부지청

대전고등검찰청

대전지방검찰청

대전지방검찰청 공주지청

대전지방검찰청 논산지청

대전지방검찰청 서산지청

대전지방검찰청 천안지청

대전지방검찰청 홍성지청

부산고등검찰청

부산지방검찰청

부산지방검찰청 동부지청

부산지방검찰청 서부지청

서울고등검찰청

서울중앙지방검찰청

서울남부지방검찰청

서울동부지방검찰청

서울북부지방검찰청

서울서부지방검찰청

의정부지방검찰청

의정부지방검찰청 고양지청

수원지방검찰청

수원지방검찰청 성남지청

수원지방검찰청 안산지청

수원지방검찰청 안양지청

수원지방검찰청 여주지청

수원지방검찰청 평택지청

울산지방검찰청

인천지방검찰청
```

---

## A1B-078 visa-portal-visa-types__candidate__28fe675280d0

- 제목: [검토 후보] Korea Visa Portal 비자 유형 목록
- sourceUrl: https://www.visa.go.kr/openPage.do?LANG_TYPE=EN&MENU_ID=10102
- sourceType: official_government
- topic: visa
- language: ko
- jurisdiction: KR
- validFrom: 2026-07-10
- validTo: 없음
- lastCheckedAt: 2026-07-10
- checkedBy: official-source-harvest
- reviewStatus: PENDING
- supersedes: visa-portal-visa-types
- supersededBy: 없음
- chunkCount: 7
- extractionMethod: html
- contentType: text/html;charset=utf-8
- byteLength: 67573
- extractedChars: 5885
- extractionError: 없음

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

```

```

### Candidate Content Preview

```
## chunk 0
# Korea Visa Portal 비자 유형 목록
source_url: https://www.visa.go.kr/openPage.do?LANG_TYPE=EN&MENU_ID=10102
source_type: official_government
topic: visa
legal_priority: 4
monitor_cadence: daily
change_signals: visa_type_list, d2_subtypes, d4_subtypes, d10_subtypes, e7_subtypes, f5_subtypes
extraction_method: html
content_type: text/html;charset=utf-8
byte_sha256: 79dfd9c7fdaa2493cf4951bd9063d2a582c8223ae1a43950f1bd12c773ee4502
byte_length: 67573
extracted_chars: 5885

호환성보기 제거 -->
 
 
 
 
 KOREA VISA PORTAL

Loading. Please wait.

HOME

LOGIN

JOIN

SITE MAP

한국어

中文

General Guide

Application

Check Application Status

Immigrant Investor

Help Center

Member

Etc

비자신청센터

Korea Visa Application Center

Short Term Visit

Visa Exempted (B-1)

Tourist / Transit (General) (B-2-1)

---

## chunk 1
Tourist / Transit (Jeju) (B-2-2)

Short-Term General (C-3-1)

Group Tourist (C-3-2)

Business Visitor (General) (C-3-4)

Business Visitor (Agreement) (C-3-5)

Business Visitor (Sponsored) (C-3-6)

Short term Visitor (Overseas Korean) (C-3-8)

Ordinary Tourist (C-3-9)

Working Holiday (H-1)

Direct Transit Visa(Air-side)(C-3-10)

Professional

Short-Term Employee (C-4)

Job Seeker (D-10-1)

Business Startup (D-10-2)

Professor (E-1)

Foreign Language Instructor (General) (E-2-1)

Teaching Assistant (E-2-2)

Foreign Language Instructor (by FTA) (E-2-91)

Researcher (E-3)

Technical Instructor / Technician (E-4)

Professional (E-5)

Artist (E-6-1)

Hotel and Adult Entertainment (E-6-2)

Athlete (E-6-3)

Foreign National of Special Ability (E-7-1)

Independent Professional (by FTA) (E-7-91)

---

## chunk 2
Special talent (F-5-11)

Investment

Incorporated Enterprise (D-8-1)

Business Venture (D-8-2)

Unincorporated Enterprise (D-8-3)

Technology and Business Startup (D-8-4)

Intra-Company Transferee (by FTA) (D-8-91)

Big Investor (F-5-5)

Work and Visit

Work and Visit (Family Connection) (H-2-1)

Work and Visit (Parents/Spouse of D-2 Student) (H-2-2)

Work and Visit (By lottery) (H-2-5)

Work and Visit (Expired visa) (H-2-7)

Trainee

Korean Arts and Culture (D1-00)

Industrial Trainee (D-3-11)

Industrial Trainee (Technology) (D-3-12)

Industrial Trainee (Plant) (D-3-13)

General Trainee (Others) (D-4-2)

Trainee Chef (Korean Cuisine) (D-4-5)

General Trainee (Private Institute) (D-4-6)

Medical Treatment

Medical Tourist (C-3-3)

Treatment and Recuperation (G-1-10)

---

## chunk 3
Intra-Company Transfer

Intra-Company Transferee (Foreign Company) (D-7-1)

Intra-Company Transferee (Domestic Company) (D-7-2)

Intra-Company Transferee (by FTA) (D-7-91)

Contractual Service Supplier (by FTA) (D-7-92)

International Trade

International Trade (D-9-1)

Technician (Industrial Machinery) (D-9-2)

Technician (Ship Building) (D-9-3)

Individual Foreign Business Man (D-9-4)

Family Visitor &middot; Dependent Family

Cohabitee of diplomat/foreign government official (F-1-3)

Marriage Immigrant Parents and Families(F-1-5)

Spouse/underage children of F-4 Overseas Korean (F-1-9)

Parents of international student (F-1-13)

Underage children of Korean National (F-2-2)

Spouse of permanent resident (F-2-3)

Dependent Family (F-3-1)

Non - Professional

Manufacturing (E-9-1)

---

## chunk 4
Construction (E-9-2)

Agriculture (E-9-3)

Fishery (E-9-4)

Service (E-9-5)

Forestry (E-9-9)

Mining industry (E-9-10)

Coastal Crew (E-10-1)

Fishing ship crew (E-10-2)

Cruise Ship Crew (E-10-3)

Household assistant of diplomat (F-1-21)

Household assistant of big investor (F-1-22)

Household assistant of high-tech investor (F-1-23)

Household assistant of professional (F-1-24)

Study &middot; Language Training

Associate Degree (D-2-1)

Bachelor's Degree (D-2-2)

Master's Degree (D-2-3)

Doctoral Degree (D-2-4)

Research Study (D-2-5)

Exchange Student (D-2-6)

Korean Language Trainee (D-4-1)

Student (Elementary, Middle, High School) (D-4-3)

Foreign Language Trainee (D-4-7)

Journalism &middot; Religious Affairs

Short-Term News Coverage (C-1)

Long-term News Coverage (D-5)

---

## chunk 5
Religious Worker (D-6)

Overseas Korean

Overseas Korean (F-4-11)

Descendant of Overseas Korean (F-4-12)

Former D or E visa holder (F-4-13)

University Graduates (F-4-14)

Permanent resident of OECD country (F-4-15)

Corporate Executive (F-4-16)

Entrepreneur of $100,000 (F-4-17)

Multinational Company (F-4-18)

Representative of overseas Koreans organization (F-4-19)

Government Employee (F-4-20)

Teacher (F-4-21)

Person of Age 60 or older (F-4-25)

Marriage Migrant

Spouse of a Korean National (F-6-1)

Child Raising (F-6-2)

Diplomacy &middot; Official Business

Diplomacy (A-1)

Foreign Government Official (A-2)

이용약관

개인정보 처리방침

저작권 보호정책

이메일 무단수집거부

고객센터

Terms and Conditions

Privacy Policy

Copyright Protection Policy

Prohibition of Unauthorized Collection of E-mail Address

---

## chunk 6
Help Center

使用条款

个人信息处理方针

版权保护政策

拒绝自动接收邮件

客服中心

Building#1, Government Complex-Gwacheon, 47, Gwanmun-ro, Gwacheon-si, Gyeonggi-do, Republic of Korea ( Immigration Contact Center : +82-1345 )

COPYRIGHT&copy;MINISTRY OF JUSTICE. REPUBLIC OF KOREA. ALL RIGHT RESERVED.

※ Visa portal is optimized for IE7, Chrome, Firefox, Safari, Opera browsers and 1024*768 pixels.

Related Sites 
 Ministry of Justice 
 Ministry of Trade, Industry and Energy 
 The Seoul Global Center 
 Ministry of Labor 
 Invest Korea 
 Immigration bureau 
 Digital KOTRA 
 Human Resources Development Service of Korea 
 Korea employment information service 
 KOREA.NET 
 KBS WORLD 
 Hi Korea 
 e-Arrival card

Go
```

