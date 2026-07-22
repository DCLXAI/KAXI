# Lifecycle Phase A — D-10/E-7 Workspace Tracks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The docs workspace covers the post-graduation lifecycle: D-10 (구직) and E-7 (취업) tracks with a new 졸업 후 stage, reachable from chat CTAs and deep links — honestly scoped (no executable compliance verdicts for these visas; RAG + 행정사 안내 posture, same as the existing D-10 diagnosis policy).

**Architecture:** Extend the existing fixed-catalog model, not replace it. `DocumentTrack` widens to four values; a fifth stage `post_graduation` joins `DOCUMENT_WORKFLOW_STAGES` (HiKorea-stamped); nine new items (5×D-10, 4×E-7) derived from the ALREADY-EXISTING `VISA_DOCUMENT_REQUIREMENT_SEEDS` (d10_change_*/e7_change_*) join `DOCUMENT_WORKFLOW_ITEMS` with full 4-locale keys in translations.ts. `Documents.tsx` renders a lifecycle-ordered 4-track selector and hides stages that have no items for the selected track. The chat bridge widens end-to-end: `docsWorkspaceHref` clamp, the expert-path track regex, and the `get_documents` tool enum (with an explicit honesty rule for the rules-engine gap). vi/mn strings are drafted here and flagged for native review — they are UI labels, not legal advice.

**Tech Stack:** TypeScript (Next.js), translations.ts flat 4-locale object, bun test scripts, Playwright smoke.

## Global Constraints

- Branch: `feat/lifecycle-workspace-tracks` off `main`. Commit per task. Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- NEVER stage `Capsomnia/` or `.superpowers/`; `git add <file> …` only. Never run prisma/db commands (no schema changes in Phase A).
- HONESTY POSTURE (binding): D-10/E-7 have no approved executable compliance rules (`complianceCoverage`, diagnosis.ts:355-363). Nothing in this phase may emit a rule-engine VERDICT for them; checklists cite HiKorea and carry the existing "개별 심사 요건은 다를 수 있음 · 행정사 검토 권장" posture via the stage's source stamp + existing workspace disclaimers.
- New-item ids and label keys are namespaced: item `type` values `d10_integrated_application, d10_graduation_certificate, d10_job_seeking_plan, d10_financial_proof, d10_residence_proof, e7_employment_contract, e7_business_registration, e7_job_description, e7_degree_or_career`; translation keys `docs_doc_<type>` / `docs_issuer_<type>` / `docs_hint_<type>` plus `docs_stage_post_grad_title` / `docs_stage_post_grad_desc`.
- vi/mn strings below are DRAFTS: add one comment line above the new translations block: `// vi/mn drafts pending native review (lifecycle phase A)`.
- Existing D-2/D-4 behavior byte-identical: no existing item/stage/track edited; suites that pin item counts (`test:documents`, `test:document-workflow`, `test:schema` policy) may need their pins consciously advanced — never weakened.
- Track order everywhere user-visible: `D-4, D-2, D-10, E-7` (lifecycle order).

---

### Task 1: Catalog — track type, post_graduation stage, 9 items, 4-locale strings

**Files:**
- Modify: `src/lib/documents/workflow.ts`
- Modify: `src/lib/i18n/translations.ts`
- Tests: run/adjust `scripts/test-document-workflow.ts` + `bun run test:i18n-parity` pins

**Interfaces:**
- Produces: `DocumentTrack = "D-2" | "D-4" | "D-10" | "E-7"` (workflow.ts:3 — single source; Documents.tsx imports it); stage id `"post_graduation"`; the nine item `type` ids above (config.ts's DEFAULT_DOCUMENT_TYPES derives automatically — no edit there).

- [ ] **Step 1: Widen the track type + add the stage**

In `workflow.ts`: `export type DocumentTrack = "D-2" | "D-4" | "D-10" | "E-7";`. Append to `DOCUMENT_WORKFLOW_STAGES` (match the existing stage object shape exactly — read one first):

- id `post_graduation`, titleKey `docs_stage_post_grad_title`, descriptionKey `docs_stage_post_grad_desc`, sourceName `하이코리아(HiKorea)`, sourceUrl `https://www.hikorea.go.kr/board/BoardNtcDetailR.pt?BBS_GB_CD=BS10&BBS_SEQ=1&NTCCTT_SEQ=1062&page=1`, checkedAt `2026-07-02` (matches the corpus doc's checked date).

- [ ] **Step 2: Add the nine items**

Follow the existing item shape (`type`, `labelKey`, `issuerKey`, `hintKey`, `uses: [{ stage, tracks, requirement }]`). All nine use `stage: "post_graduation"`, `requirement: "required"`; D-10 items `tracks: ["D-10"]`, E-7 items `tracks: ["E-7"]`. (These mirror the visa-document-matrix seeds `d10_change_*`/`e7_change_*` — cite that in a one-line comment above the block.)

- [ ] **Step 3: Translations**

Append to translations.ts (flat object, existing per-key `{ ko, vi, mn, en }` pattern), preceded by the drafts-pending-review comment. Exact strings:

```
docs_stage_post_grad_title: ko 졸업 후 비자 준비 / vi Chuẩn bị visa sau tốt nghiệp / mn Төгссөний дараах визийн бэлтгэл / en Post-graduation visa preparation
docs_stage_post_grad_desc: ko 졸업 후 구직(D-10)·취업(E-7) 자격 변경에 필요한 서류입니다. 개별 심사 요건은 다를 수 있어 접수 전 행정사 검토를 권장합니다. / vi Hồ sơ cần cho việc đổi sang visa tìm việc (D-10) hoặc làm việc (E-7) sau tốt nghiệp. Yêu cầu xét duyệt có thể khác nhau, nên nhờ chuyên gia hành chính kiểm tra trước khi nộp. / mn Төгссөний дараа ажил хайх (D-10) болон ажиллах (E-7) визэд шилжихэд шаардлагатай бичиг баримт. Шалгуур өөр байж болох тул мэдүүлэхээс өмнө мэргэжилтнээр хянуулахыг зөвлөж байна. / en Documents for changing to job-seeking (D-10) or employment (E-7) status after graduation. Screening requirements vary; have an administrative expert review before filing.

docs_doc_d10_integrated_application: ko 통합신청서 / vi Đơn đăng ký tổng hợp / mn Нэгдсэн өргөдлийн маягт / en Integrated application form
docs_issuer_d10_integrated_application: ko 출입국·외국인관서 서식 / vi Mẫu của cơ quan xuất nhập cảnh / mn Цагаачлалын байгууллагын маягт / en Immigration office form
docs_hint_d10_integrated_application: ko 하이코리아 서식을 내려받아 신청 유형에 D-10 자격변경을 표기합니다. / vi Tải mẫu từ HiKorea và đánh dấu đổi sang D-10. / mn HiKorea-с маягт татаж, D-10 өөрчлөлтийг тэмдэглэнэ. / en Download the HiKorea form and mark the D-10 status change.

docs_doc_d10_graduation_certificate: ko 졸업·수료 증명서 / vi Giấy chứng nhận tốt nghiệp hoặc hoàn thành / mn Төгссөн буюу дүүргэсний гэрчилгээ / en Graduation or completion certificate
docs_issuer_d10_graduation_certificate: ko 재학 중인 학교 / vi Trường đang theo học / mn Суралцаж буй сургууль / en Your school
docs_hint_d10_graduation_certificate: ko 졸업예정증명서도 인정될 수 있으니 학교 행정실에 확인하세요. / vi Giấy chứng nhận sắp tốt nghiệp cũng có thể được chấp nhận; hỏi văn phòng trường. / mn Төгсөх гэж буй тодорхойлолт ч хүчинтэй байж болно; сургуулиасаа лавлана уу. / en A certificate of expected graduation may also qualify; check with your school office.

docs_doc_d10_job_seeking_plan: ko 구직활동계획서 / vi Kế hoạch tìm việc / mn Ажил хайх төлөвлөгөө / en Job-seeking plan
docs_issuer_d10_job_seeking_plan: ko 본인 작성 / vi Tự soạn / mn Өөрөө бэлтгэнэ / en Written by you
docs_hint_d10_job_seeking_plan: ko 구직 분야·활동 계획을 구체적으로 적을수록 심사에 유리합니다. / vi Viết cụ thể lĩnh vực và kế hoạch tìm việc sẽ thuận lợi hơn khi xét duyệt. / mn Ажил хайх чиглэл, төлөвлөгөөгөө тодорхой бичих тусам сайн. / en The more specific your field and activity plan, the smoother the review.

docs_doc_d10_financial_proof: ko 체류경비 입증서류 / vi Chứng minh chi phí lưu trú / mn Оршин суух зардлын нотолгоо / en Proof of stay expenses
docs_issuer_d10_financial_proof: ko 은행 / vi Ngân hàng / mn Банк / en Bank
docs_hint_d10_financial_proof: ko 잔고증명서는 발급일 기준이 적용되니 신청 직전에 발급받으세요. / vi Giấy xác nhận số dư tính theo ngày cấp; xin cấp ngay trước khi nộp. / mn Үлдэгдлийн тодорхойлолт олгосон огноогоор тооцогдоно; мэдүүлэхийн өмнөхөн авна уу. / en Balance certificates count from the issue date; get it right before filing.

docs_doc_d10_residence_proof: ko 체류지 입증서류 / vi Chứng minh nơi cư trú / mn Оршин суугаа газрын нотолгоо / en Proof of residence
docs_issuer_d10_residence_proof: ko 임대인·기숙사 등 / vi Chủ nhà hoặc ký túc xá / mn Түрээслүүлэгч эсвэл дотуур байр / en Landlord or dormitory
docs_hint_d10_residence_proof: ko 임대차계약서, 기숙사 확인서 등 실제 거주를 입증하는 서류입니다. / vi Hợp đồng thuê nhà hoặc xác nhận ký túc xá chứng minh nơi ở thực tế. / mn Түрээсийн гэрээ, дотуур байрны тодорхойлолт зэрэг бодит оршин суугааг нотолно. / en A lease contract or dormitory confirmation proving where you actually live.

docs_doc_e7_employment_contract: ko 고용계약서 / vi Hợp đồng lao động / mn Хөдөлмөрийн гэрээ / en Employment contract
docs_issuer_e7_employment_contract: ko 고용주 / vi Công ty tuyển dụng / mn Ажил олгогч / en Employer
docs_hint_e7_employment_contract: ko 직무·임금·기간이 명시된 계약서가 필요합니다. 임금 요건은 연도별 고시를 확인하세요. / vi Hợp đồng phải ghi rõ công việc, lương và thời hạn; kiểm tra mức lương tối thiểu theo thông báo hằng năm. / mn Ажил үүрэг, цалин, хугацааг тодорхой заасан гэрээ хэрэгтэй; жил бүрийн цалингийн шаардлагыг шалгана уу. / en The contract must state duties, wage, and term; check the annual wage requirement notice.

docs_doc_e7_business_registration: ko 사업자등록증(고용주) / vi Đăng ký kinh doanh của công ty / mn Ажил олгогчийн бизнесийн бүртгэл / en Employer business registration
docs_issuer_e7_business_registration: ko 고용주 / vi Công ty tuyển dụng / mn Ажил олгогч / en Employer
docs_hint_e7_business_registration: ko 고용주가 준비하는 서류입니다. 회사에 요청하세요. / vi Do công ty chuẩn bị; hãy đề nghị công ty cung cấp. / mn Ажил олгогч бэлтгэнэ; компаниасаа хүсээрэй. / en Prepared by the employer — request it from the company.

docs_doc_e7_job_description: ko 직무기술서 / vi Bản mô tả công việc / mn Ажлын байрны тодорхойлолт / en Job description
docs_issuer_e7_job_description: ko 고용주 / vi Công ty tuyển dụng / mn Ажил олгогч / en Employer
docs_hint_e7_job_description: ko 담당 직무가 E-7 허용 직종에 해당함을 보여야 합니다. / vi Phải cho thấy công việc thuộc ngành nghề được phép của E-7. / mn Ажил үүрэг нь E-7-д зөвшөөрөгдсөн мэргэжилд хамаарахыг харуулна. / en It must show the role falls under an E-7-eligible occupation.

docs_doc_e7_degree_or_career: ko 학위·경력 증빙 / vi Bằng cấp hoặc chứng nhận kinh nghiệm / mn Диплом эсвэл туршлагын нотолгоо / en Degree or career certificate
docs_issuer_e7_degree_or_career: ko 학교·전 직장 / vi Trường hoặc nơi làm việc cũ / mn Сургууль эсвэл өмнөх ажил олгогч / en School or previous employer
docs_hint_e7_degree_or_career: ko 학위증명서 또는 경력증명서로 직종 요건 충족을 입증합니다. / vi Chứng minh đáp ứng yêu cầu ngành nghề bằng bằng cấp hoặc giấy xác nhận kinh nghiệm. / mn Мэргэжлийн шаардлагыг диплом эсвэл ажилласан тодорхойлолтоор нотолно. / en Prove the occupation requirement with a degree or career certificate.
```

- [ ] **Step 4: Gates (pins advanced consciously)**

Run: `bun run test:i18n-parity && bun run ci:types && bun run lint`, and `bun run test:document-workflow`/`bun run test:documents` if runnable locally (DB-gated → defer to CI). If any suite pins item counts or track unions, advance the pin with a comment; report every pin changed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/documents/workflow.ts src/lib/i18n/translations.ts
git commit -m "feat(docs): post-graduation stage + D-10/E-7 tracks in the workspace catalog

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
(Plus any test files whose pins were advanced — name them.)

---

### Task 2: Workspace UI — lifecycle track selector + stage filtering + deep link

**Files:**
- Modify: `src/components/kbridge/Documents.tsx`
- Modify: `tests/e2e/kaxi-smoke.spec.ts` (extend the existing docs deep-link test)

- [ ] **Step 1:** READ Documents.tsx: find the track selector render and the stage sections render. Changes:
  - Track options become `["D-4", "D-2", "D-10", "E-7"] as const` in that order (reuse `DocumentTrack`).
  - `?track=` validation accepts the two new values (the existing `trackParam === "D-2" || trackParam === "D-4"` checks — generalize against the track list).
  - Stage sections render ONLY when the stage has ≥1 item whose `uses` include the selected track (derive from `DOCUMENT_WORKFLOW_ITEMS`; D-2/D-4 keep showing all four current stages exactly as today — verify no existing stage becomes empty for them; `post_graduation` shows only for D-10/E-7, and the four study stages hide for D-10/E-7 since no items reference those tracks).
  - The diagnosis-derived default only ever yields D-2/D-4 — unchanged.
- [ ] **Step 2:** Extend the smoke test: after the existing D-4 deep-link assertions, add `await page.goto("/ko/docs?track=D-10");` + assert URL retained and the page shows the post-graduation stage title text `졸업 후 비자 준비` (anonymous banner still fine to assert if the section requires auth — READ how stage sections render for anonymous users first: if the checklist body is auth-gated, assert the URL + banner only, and note it).
- [ ] **Step 3:** Gates: `bun run ci:types && bun run lint && bun run test:e2e` (local hermetic run; fall back to `--list` + CI only if environmentally blocked).
- [ ] **Step 4:** Commit (`feat(docs): lifecycle track selector, stage filtering, D-10/E-7 deep links`, trailer, exact files).

---

### Task 3: Chat bridge — CTA clamp, expert regex, get_documents honesty

**Files:**
- Modify: `src/lib/agent/meta.ts` (`docsWorkspaceHref`)
- Modify: `src/app/api/ai/unified/route.ts` (expert-path track regex)
- Modify: `src/lib/agent/tools.ts` (`get_documents`)
- Test: extend `scripts/test-unified-ai-router.ts`

- [ ] **Step 1:** `docsWorkspaceHref`: accept `"D-2" | "D-4" | "D-10" | "E-7"` (same clamp style; anything else → `/docs`).
- [ ] **Step 2:** Expert path: replace the track regex so D-10 wins before D-2/D-4 digits and E-7 is recognized: match against the question with `/d\s*-?\s*10/i` → `D-10`, else `/e\s*-?\s*7/i` → `E-7`, else the existing `/d\s*-?\s*(2|4)/i` → `D-2|D-4`.
- [ ] **Step 3:** `get_documents`: widen the `visa_type` enum to `["D-2","D-4","D-10","E-7"]` and READ its execute path: run `evaluateVisaRulesWithDbFallback` for D-10 in a quick local script/unit to see what it returns. Decision rule (binding): if the rules engine returns an executable verdict structure for D-10/E-7, DO NOT expose a verdict — for these two visas the tool must return the checklist from `VISA_DOCUMENT_REQUIREMENT_SEEDS` (filter by visaType d10/e7) plus the fixed caveat string `실행형 판정 규칙이 없는 자격입니다. 공식 안내 기준 체크리스트이며 행정사 검토를 권장합니다.` (and the localized equivalents if the tool localizes — read how it localizes today and follow). D-2/D-4 behavior byte-identical.
- [ ] **Step 4:** Tests: unified-router — documents-mode question `"D-10 비자로 바꾸려면 서류 뭐가 필요해?"` → suggestion href `/docs?track=D-10`; an E-7 question → `/docs?track=E-7`; existing D-4 pins unchanged. `docsWorkspaceHref` pins extended (D-10, E-7, D-9→`/docs`).
- [ ] **Step 5:** Gates: `bun run ci:types && bun run lint && bun run test:unified-ai` (+ `test:agent`/`test:rules` if locally runnable, else CI). Commit (`feat(agent): route D-10/E-7 document questions to the new workspace tracks`, trailer).

---

### Task 4: Rollout

- [ ] PR → CI green → merge → deploy → post-deploy checks. Live probes: `/ko/docs?track=D-10` 200 + stage title visible where anonymous rendering allows; unified documents-mode D-10 question returns the CTA with `/docs?track=D-10`; a D-4 question's CTA unchanged (regression).
