# AI / Startup / Administrative-Scrivener Role Boundary

Status: draft for legal review
Last checked: 2026-07-01
Review status: needs_legal_review

## Product Boundary Statement

KAXI is a study-abroad preparation platform. The AI and platform provide general guidance based on official sources and structured checklists. KAXI does not itself perform licensed administrative-scrivener work, visa filing representation, official document drafting for submission, proxy submission, or outcome guarantees.

When a request crosses into case-specific legal/administrative judgment, administrative-agency submission documents, appeal/objection strategy, or filing representation, the service must route the user to a licensed administrative-scrivener partner.

## 업무분장표

| Work item | AI allowed | Startup/operator allowed | Administrative scrivener required | Product handling |
| --- | --- | --- | --- | --- |
| Official-source summary of D-2/D-4 categories | Yes | Yes | No | Answer with source notice and review date. |
| General document checklist by visa type/nationality | Yes | Yes | No | Mark as general checklist; require official office confirmation. |
| School search, tuition/cost comparison, accreditation metadata | Yes | Yes | No | Use verified source metadata and review cadence. |
| Intake of user profile and missing information | Yes | Yes | No | Collect minimum necessary data; avoid sensitive free-text persistence where possible. |
| Detect red flags such as refusal history, overstay, fake documents, illegal work | Yes | Yes | No | Refuse illegal request; escalate lawful complex cases. |
| Explain that D-2/D-4 part-time work generally needs permission | Yes | Yes | No | No job matching; link to official/partner review. |
| Decide whether a specific student will receive/lose visa approval | No | No | Yes | Refuse prediction/guarantee; route to partner. |
| Draft final documents for submission to immigration or an administrative agency | No | No | Yes | Partner engagement required. |
| Submit documents, act as proxy, communicate with agency on behalf of student | No | No | Yes | Partner engagement required. |
| Appeal, objection, refusal-response strategy | No | No | Yes | Partner engagement required. |
| Paid administrative-scrivener consultation | No | No, except routing/payment support | Yes | Separate partner contract/mandate. |
| Translation/notarization referral | Yes, referral only | Yes, referral and scheduling | Partner/vendor as applicable | Keep scope separate from visa judgment. |
| Employment placement or paid job matching | No | No | No | Prohibited for KAXI MVP. |
| Visa approval guarantee or broker guarantee | No | No | No | Must be rejected and logged as safety signal. |

## Escalation Triggers

Escalate to an administrative-scrivener partner when the user mentions:

- past visa refusal, deportation, overstay, criminal record, fake document history, or unclear status;
- D-4 to D-2 change of status where timing, status validity, or prior attendance is material;
- family invitation, status extension, appeal, objection, or immigration office submission;
- request to write, revise, certify, or submit documents to an agency;
- request for certainty, approval guarantee, or a statement that could be understood as official legal judgment.

## Mandatory User-Facing Disclaimer

Short form:

> KAXI AI는 공식 출처 기반 일반 안내만 제공합니다. 비자·체류자격의 개별 판단, 행정기관 제출서류 작성·제출 대행, 불복/이의신청 전략은 행정사 등 자격 있는 전문가 검토가 필요합니다.

RAG source form:

> 이 안내는 2026-07-01에 확인된 Study in Korea / 법무부 출처 기준입니다. 개인 상황에 따라 달라질 수 있어 접수 전 행정사 검토가 필요합니다.

## Evidence Sources

- 행정사법: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=170997
- 행정사법 시행령: https://law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=900767489
- 법무부 비자 내비게이터: https://www.immigration.go.kr/bbs/immigration_eng/230/454086/download.do

