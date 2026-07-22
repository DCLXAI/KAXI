import type { TranslationKey } from "@/lib/i18n/translations";

export type DocumentTrack = "D-2" | "D-4" | "D-10" | "E-7";
export type DocumentStage = "school" | "admission" | "visa" | "arrival" | "post_graduation";
export type DocumentRequirement = "required" | "conditional" | "result";

export interface DocumentWorkflowStage {
  id: DocumentStage;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  sourceName: string;
  sourceUrl: string;
  checkedAt: string;
}

export interface DocumentUse {
  stage: DocumentStage;
  tracks: readonly DocumentTrack[];
  requirement: DocumentRequirement;
}

export interface DocumentWorkflowItem {
  type: string;
  labelKey: TranslationKey;
  issuerKey: TranslationKey;
  hintKey: TranslationKey;
  uses: readonly DocumentUse[];
}

const BOTH_TRACKS = ["D-2", "D-4"] as const;

export const DOCUMENT_WORKFLOW_STAGES: readonly DocumentWorkflowStage[] = [
  {
    id: "school",
    titleKey: "docs_stage_school",
    descriptionKey: "docs_stage_school_desc",
    sourceName: "Study in Korea",
    sourceUrl: "https://www.studyinkorea.go.kr/en/plan/schoolType.do?tab=associate-degree",
    checkedAt: "2026-07-11",
  },
  {
    id: "admission",
    titleKey: "docs_stage_admission",
    descriptionKey: "docs_stage_admission_desc",
    sourceName: "Study in Korea",
    sourceUrl: "https://studyinkorea.go.kr/ko/plan/visaAndStay.do",
    checkedAt: "2026-07-11",
  },
  {
    id: "visa",
    titleKey: "docs_stage_visa",
    descriptionKey: "docs_stage_visa_desc",
    sourceName: "Study in Korea / Korea Visa Portal",
    sourceUrl: "https://www.visa.go.kr/openPage.do?MENU_ID=1020502",
    checkedAt: "2026-07-11",
  },
  {
    id: "arrival",
    titleKey: "docs_stage_arrival",
    descriptionKey: "docs_stage_arrival_desc",
    sourceName: "Study in Korea",
    sourceUrl: "https://was2.studyinkorea.go.kr/ko/life/residenceAndStayInfo.do",
    checkedAt: "2026-07-11",
  },
  {
    id: "post_graduation",
    titleKey: "docs_stage_post_grad_title",
    descriptionKey: "docs_stage_post_grad_desc",
    sourceName: "하이코리아(HiKorea)",
    sourceUrl:
      "https://www.hikorea.go.kr/board/BoardNtcDetailR.pt?BBS_GB_CD=BS10&BBS_SEQ=1&NTCCTT_SEQ=1062&page=1",
    checkedAt: "2026-07-02",
  },
] as const;

export const DOCUMENT_WORKFLOW_ITEMS: readonly DocumentWorkflowItem[] = [
  {
    type: "school_application_form",
    labelKey: "docs_doc_school_application",
    issuerKey: "docs_issuer_applicant",
    hintKey: "docs_hint_form",
    uses: [{ stage: "school", tracks: BOTH_TRACKS, requirement: "required" }],
  },
  {
    type: "passport",
    labelKey: "docs_doc_passport",
    issuerKey: "docs_issuer_applicant",
    hintKey: "docs_hint_passport",
    uses: [
      { stage: "school", tracks: BOTH_TRACKS, requirement: "required" },
      { stage: "visa", tracks: BOTH_TRACKS, requirement: "required" },
      { stage: "arrival", tracks: BOTH_TRACKS, requirement: "required" },
    ],
  },
  {
    type: "id_photo",
    labelKey: "docs_doc_photo",
    issuerKey: "docs_issuer_applicant",
    hintKey: "docs_hint_photo",
    uses: [
      { stage: "visa", tracks: BOTH_TRACKS, requirement: "required" },
      { stage: "arrival", tracks: BOTH_TRACKS, requirement: "required" },
    ],
  },
  {
    type: "graduation_certificate",
    labelKey: "docs_doc_diploma",
    issuerKey: "docs_issuer_home_authority",
    hintKey: "docs_hint_authentication",
    uses: [
      { stage: "school", tracks: BOTH_TRACKS, requirement: "required" },
      { stage: "visa", tracks: BOTH_TRACKS, requirement: "required" },
    ],
  },
  {
    type: "transcript",
    labelKey: "docs_doc_transcript",
    issuerKey: "docs_issuer_home_authority",
    hintKey: "docs_hint_authentication",
    uses: [
      { stage: "school", tracks: ["D-2"], requirement: "required" },
      { stage: "school", tracks: ["D-4"], requirement: "conditional" },
    ],
  },
  {
    type: "study_plan",
    labelKey: "docs_doc_plan",
    issuerKey: "docs_issuer_applicant",
    hintKey: "docs_hint_school_specific",
    uses: [
      { stage: "school", tracks: ["D-2"], requirement: "conditional" },
      { stage: "school", tracks: ["D-4"], requirement: "required" },
    ],
  },
  {
    type: "language_proficiency",
    labelKey: "docs_doc_language",
    issuerKey: "docs_issuer_test_provider",
    hintKey: "docs_hint_school_specific",
    uses: [{ stage: "school", tracks: ["D-2"], requirement: "conditional" }],
  },
  {
    type: "family_relation",
    labelKey: "docs_doc_family",
    issuerKey: "docs_issuer_home_authority",
    hintKey: "docs_hint_authentication",
    uses: [
      { stage: "school", tracks: BOTH_TRACKS, requirement: "conditional" },
      { stage: "visa", tracks: BOTH_TRACKS, requirement: "conditional" },
    ],
  },
  {
    type: "financial_proof",
    labelKey: "docs_doc_finance",
    issuerKey: "docs_issuer_bank",
    hintKey: "docs_hint_financial",
    uses: [
      { stage: "admission", tracks: BOTH_TRACKS, requirement: "required" },
      { stage: "visa", tracks: BOTH_TRACKS, requirement: "required" },
    ],
  },
  {
    type: "tuition_payment_receipt",
    labelKey: "docs_doc_tuition",
    issuerKey: "docs_issuer_school",
    hintKey: "docs_hint_school_issued",
    uses: [{ stage: "admission", tracks: BOTH_TRACKS, requirement: "conditional" }],
  },
  {
    type: "standard_admission",
    labelKey: "docs_doc_admission",
    issuerKey: "docs_issuer_school",
    hintKey: "docs_hint_school_issued",
    uses: [
      { stage: "admission", tracks: BOTH_TRACKS, requirement: "required" },
      { stage: "visa", tracks: BOTH_TRACKS, requirement: "required" },
    ],
  },
  {
    type: "school_business_registration",
    labelKey: "docs_doc_business",
    issuerKey: "docs_issuer_school",
    hintKey: "docs_hint_school_issued",
    uses: [
      { stage: "admission", tracks: BOTH_TRACKS, requirement: "required" },
      { stage: "visa", tracks: BOTH_TRACKS, requirement: "required" },
    ],
  },
  {
    type: "visa_application_form",
    labelKey: "docs_doc_visa_application",
    issuerKey: "docs_issuer_applicant",
    hintKey: "docs_hint_form",
    uses: [{ stage: "visa", tracks: BOTH_TRACKS, requirement: "required" }],
  },
  {
    type: "training_plan",
    labelKey: "docs_doc_training_plan",
    issuerKey: "docs_issuer_applicant",
    hintKey: "docs_hint_mission",
    uses: [{ stage: "visa", tracks: ["D-4"], requirement: "required" }],
  },
  {
    type: "tuberculosis_certificate",
    labelKey: "docs_doc_tuberculosis",
    issuerKey: "docs_issuer_test_provider",
    hintKey: "docs_hint_mission",
    uses: [
      { stage: "visa", tracks: BOTH_TRACKS, requirement: "conditional" },
      { stage: "arrival", tracks: BOTH_TRACKS, requirement: "conditional" },
    ],
  },
  {
    type: "visa_grant_notice",
    labelKey: "docs_doc_visa_result",
    issuerKey: "docs_issuer_mission",
    hintKey: "docs_hint_result",
    uses: [{ stage: "visa", tracks: BOTH_TRACKS, requirement: "result" }],
  },
  {
    type: "residence_application_form",
    labelKey: "docs_doc_residence_application",
    issuerKey: "docs_issuer_applicant",
    hintKey: "docs_hint_form",
    uses: [{ stage: "arrival", tracks: BOTH_TRACKS, requirement: "required" }],
  },
  {
    type: "enrollment_certificate",
    labelKey: "docs_doc_enrollment",
    issuerKey: "docs_issuer_school",
    hintKey: "docs_hint_after_entry",
    uses: [{ stage: "arrival", tracks: BOTH_TRACKS, requirement: "required" }],
  },
  {
    type: "residence_proof",
    labelKey: "docs_doc_residence_proof",
    issuerKey: "docs_issuer_applicant",
    hintKey: "docs_hint_residence",
    uses: [{ stage: "arrival", tracks: BOTH_TRACKS, requirement: "required" }],
  },
  {
    type: "residence_card",
    labelKey: "docs_doc_residence_card",
    issuerKey: "docs_issuer_immigration",
    hintKey: "docs_hint_result",
    uses: [{ stage: "arrival", tracks: BOTH_TRACKS, requirement: "result" }],
  },
  // Post-graduation D-10/E-7 items mirror the visa-document-matrix seeds d10_change_*/e7_change_*.
  {
    type: "d10_integrated_application",
    labelKey: "docs_doc_d10_integrated_application",
    issuerKey: "docs_issuer_d10_integrated_application",
    hintKey: "docs_hint_d10_integrated_application",
    uses: [{ stage: "post_graduation", tracks: ["D-10"], requirement: "required" }],
  },
  {
    type: "d10_graduation_certificate",
    labelKey: "docs_doc_d10_graduation_certificate",
    issuerKey: "docs_issuer_d10_graduation_certificate",
    hintKey: "docs_hint_d10_graduation_certificate",
    uses: [{ stage: "post_graduation", tracks: ["D-10"], requirement: "required" }],
  },
  {
    type: "d10_job_seeking_plan",
    labelKey: "docs_doc_d10_job_seeking_plan",
    issuerKey: "docs_issuer_d10_job_seeking_plan",
    hintKey: "docs_hint_d10_job_seeking_plan",
    uses: [{ stage: "post_graduation", tracks: ["D-10"], requirement: "required" }],
  },
  {
    type: "d10_financial_proof",
    labelKey: "docs_doc_d10_financial_proof",
    issuerKey: "docs_issuer_d10_financial_proof",
    hintKey: "docs_hint_d10_financial_proof",
    uses: [{ stage: "post_graduation", tracks: ["D-10"], requirement: "required" }],
  },
  {
    type: "d10_residence_proof",
    labelKey: "docs_doc_d10_residence_proof",
    issuerKey: "docs_issuer_d10_residence_proof",
    hintKey: "docs_hint_d10_residence_proof",
    uses: [{ stage: "post_graduation", tracks: ["D-10"], requirement: "required" }],
  },
  {
    type: "e7_employment_contract",
    labelKey: "docs_doc_e7_employment_contract",
    issuerKey: "docs_issuer_e7_employment_contract",
    hintKey: "docs_hint_e7_employment_contract",
    uses: [{ stage: "post_graduation", tracks: ["E-7"], requirement: "required" }],
  },
  {
    type: "e7_business_registration",
    labelKey: "docs_doc_e7_business_registration",
    issuerKey: "docs_issuer_e7_business_registration",
    hintKey: "docs_hint_e7_business_registration",
    uses: [{ stage: "post_graduation", tracks: ["E-7"], requirement: "required" }],
  },
  {
    type: "e7_job_description",
    labelKey: "docs_doc_e7_job_description",
    issuerKey: "docs_issuer_e7_job_description",
    hintKey: "docs_hint_e7_job_description",
    uses: [{ stage: "post_graduation", tracks: ["E-7"], requirement: "required" }],
  },
  {
    type: "e7_degree_or_career",
    labelKey: "docs_doc_e7_degree_or_career",
    issuerKey: "docs_issuer_e7_degree_or_career",
    hintKey: "docs_hint_e7_degree_or_career",
    uses: [{ stage: "post_graduation", tracks: ["E-7"], requirement: "required" }],
  },
] as const;

export function getDocumentUse(
  item: DocumentWorkflowItem,
  stage: DocumentStage,
  track: DocumentTrack,
): DocumentUse | undefined {
  return item.uses.find((use) => use.stage === stage && use.tracks.includes(track));
}

export function getStageItems(stage: DocumentStage, track: DocumentTrack) {
  return DOCUMENT_WORKFLOW_ITEMS.flatMap((item) => {
    const use = getDocumentUse(item, stage, track);
    return use ? [{ item, use }] : [];
  });
}

export function getRequiredDocumentTypes(track: DocumentTrack, stage?: DocumentStage): string[] {
  return DOCUMENT_WORKFLOW_ITEMS.filter((item) =>
    item.uses.some(
      (use) =>
        use.requirement === "required" &&
        use.tracks.includes(track) &&
        (stage === undefined || use.stage === stage),
    ),
  ).map((item) => item.type);
}

export function isReusedDocument(item: DocumentWorkflowItem, stage: DocumentStage, track: DocumentTrack): boolean {
  const stageIndex = DOCUMENT_WORKFLOW_STAGES.findIndex((candidate) => candidate.id === stage);
  return item.uses.some(
    (use) =>
      use.tracks.includes(track) &&
      DOCUMENT_WORKFLOW_STAGES.findIndex((candidate) => candidate.id === use.stage) < stageIndex,
  );
}
