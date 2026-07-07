# KAXI Privacy Policy Draft

Status: draft for legal review
Last checked: 2026-07-01
Review status: needs_legal_review

This draft follows the current 개인정보보호위원회 privacy-policy guide listing checked on 2026-07-01 and the Personal Information Protection Act structure for collection/use, third-party provision, consignment, retention, data-subject rights, and overseas transfer. Final wording must be reviewed before publication.

## 1. Controller

Controller: KAXI
Privacy contact: [insert privacy contact email]
Address: [insert business address]

## 2. Personal Information Processed

| Service | Required data | Optional data | Purpose | Retention draft |
| --- | --- | --- | --- | --- |
| AI question/consult | question text, language, generated answer, retrieved source IDs | profile facts voluntarily entered by user | answer generation, abuse prevention, quality improvement | raw chat logs: shortest feasible period; default operation target 30 days unless user account history is implemented |
| School/cost tools | selected filters, budget, preferred region/program | school name, dormitory preference | recommendation and cost calculation | session/local or short operational logs |
| Partner request | name/contact or lead ID, consultation topic, preferred partner type | documents or additional context voluntarily submitted | route request to selected partner and manage response | until request handling ends plus legally required retention |
| Admin/security logs | admin ID, action, timestamp, IP-derived security data | reason memo | audit, security, misuse prevention | security/audit retention policy |
| Deletion request | contact or exact question hash, request content | verification context | receive and process privacy rights request | rights-handling record retention policy |

## 3. Collection and Use

KAXI collects minimum necessary information to provide the requested service, secure the platform, handle user requests, and comply with legal obligations. If KAXI uses personal information for a new incompatible purpose, it must obtain consent or establish another lawful basis before use.

## 4. Third-Party Provision

KAXI may provide personal information to an external partner only when the user requests partner connection and the required notice/consent basis is satisfied. The MVP runtime blocks partner routing unless active consent exists for third-party provision, processing consignment notice, and overseas-transfer notice.

Draft third-party provision table:

| Recipient | Items | Purpose | Retention by recipient | Trigger |
| --- | --- | --- | --- | --- |
| Licensed administrative-scrivener partner | lead ID/contact, consultation topic, visa type, relevant user-provided facts | case-specific consultation, document/submission scope evaluation | partner legal/contract retention period | user requests administrative-scrivener connection |
| Translation/notarization partner | contact, document type, language pair, deadline | quote and service delivery | partner legal/contract retention period | user requests translation/notarization |
| School/admission partner | contact, target school/program, application context | admission inquiry support | partner legal/contract retention period | user requests school/admission connection |

No partner may receive fake-document requests, illegal job-placement requests, or data unrelated to the requested service.

## 5. Processing Consignment

KAXI may use infrastructure and software vendors to operate the service. The consignment contract or terms must require processing only within the entrusted purpose, technical/managerial safeguards, confidentiality, deletion/return, and subprocessor control.

Draft consignment table:

| Processor | Entrusted work | Data involved | Location |
| --- | --- | --- | --- |
| Vercel or hosting provider | web/API hosting, logs, deployment | request metadata, service logs | overseas possible depending on hosting region |
| Database/storage provider | application database/storage | user/lead/chat/partner request records | configured deployment region |
| Anthropic Claude API provider | answer generation and structured extraction | redacted prompt text and retrieved context sent for generation | provider/API processing region |
| Email/SMS provider | notifications and partner routing | contact, message template | depends on provider |

## 6. Overseas Transfer

If KAXI sends, stores, or makes personal information accessible outside Korea through hosting, AI, analytics, email, or partner tools, KAXI must disclose the overseas transfer items, country, recipient, timing/method, purpose, retention/use period, and refusal method where applicable.

Draft overseas-transfer register:

| Recipient | Country | Items | Purpose | Transfer timing/method | Retention | User choice |
| --- | --- | --- | --- | --- | --- | --- |
| [insert hosting provider legal entity] | [insert country] | service logs, database records as configured | service operation | encrypted network transfer during service use | provider/account retention | service may be unavailable if essential transfer is refused |
| [insert AI provider if used] | [insert country] | prompt, context, generated output | AI generation | API request when user asks AI | provider policy / KAXI retention | offer non-AI or partner route where feasible |
| [insert email/SMS provider] | [insert country] | contact, notification content | notices and partner routing | API request when notification is sent | provider policy / KAXI retention | alternative contact where feasible |

The current deployment must keep this table environment-specific. Phase 2 uses the managed Anthropic Claude API path for LLM calls, so overseas-transfer disclosure must cover prompt/context transmission whenever personal information can be included after redaction.

## 7. Retention and Deletion

KAXI must define retention periods by record type and delete or anonymize personal information without delay when the purpose is achieved or retention expires, except where law requires retention.

Operational guardrails already implemented in the app include:

- PII redaction/encryption helpers;
- chat-log persistence guards;
- explicit partner-routing consent checks before `PartnerRequest` creation;
- consent grant/missing/withdrawal/expiry audit events;
- retention enforcement endpoint and script;
- privacy delete request endpoint;
- admin audit logs for privacy operations.

## 8. Rights of Data Subjects

Users may request access, correction, deletion, suspension of processing, and withdrawal of consent where applicable. KAXI should provide a clear request channel and process requests without revealing whether another person's record exists.

## 9. Safety Measures

KAXI should maintain:

- encrypted transport;
- least-privilege admin access;
- hashed or encrypted sensitive fields;
- admin audit logging;
- production database policy preventing accidental non-Postgres writes;
- retention automation;
- access review for partner data exports.

## 10. Children and Minors

If KAXI knowingly serves minors, the final policy and UI must implement age checks and legal-representative consent where required. Until that flow is implemented, avoid collecting unnecessary minor data.

## 11. Changes and Notice

Material changes to collection, third-party provision, consignment, overseas transfer, or retention must be notified before they take effect where required.

## Evidence Sources

- 개인정보보호위원회 안내서 목록: https://www.pipc.go.kr/np/cop/bbs/selectBoardList.do?bbsId=BS217&mCode=D010030000
- 개인정보 보호법: https://www.law.go.kr/LSW/lsInfoP.do?ancNo=21445&ancYd=20260310&efYd=20260911&lsiSeq=283839
