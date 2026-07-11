import {
  DOCUMENT_WORKFLOW_ITEMS,
  DOCUMENT_WORKFLOW_STAGES,
  getDocumentUse,
  getRequiredDocumentTypes,
  getStageItems,
  isReusedDocument,
} from "../src/lib/documents/workflow";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL ${message}`);
}

const types = DOCUMENT_WORKFLOW_ITEMS.map((item) => item.type);
assert(new Set(types).size === types.length, "document types must be unique");
assert(DOCUMENT_WORKFLOW_STAGES.length === 4, "workflow must contain four procedure stages");
assert(DOCUMENT_WORKFLOW_ITEMS.every((item) => item.uses.length > 0), "every document needs at least one workflow use");

for (const stage of DOCUMENT_WORKFLOW_STAGES) {
  assert(stage.sourceUrl.startsWith("https://"), `${stage.id} must link to an HTTPS official source`);
  assert(stage.checkedAt === "2026-07-11", `${stage.id} must carry the reviewed date`);
  assert(getStageItems(stage.id, "D-2").length > 0, `${stage.id} needs D-2 documents`);
  assert(getStageItems(stage.id, "D-4").length > 0, `${stage.id} needs D-4 documents`);
}

const passport = DOCUMENT_WORKFLOW_ITEMS.find((item) => item.type === "passport");
assert(passport, "passport workflow item is required");
assert(getDocumentUse(passport, "school", "D-2")?.requirement === "required", "passport starts at school application");
assert(isReusedDocument(passport, "visa", "D-2"), "passport should be reused for the visa stage");
assert(isReusedDocument(passport, "arrival", "D-4"), "passport should be reused after arrival");

const trainingPlan = DOCUMENT_WORKFLOW_ITEMS.find((item) => item.type === "training_plan");
assert(trainingPlan, "D-4 training plan must exist");
assert(getDocumentUse(trainingPlan, "visa", "D-4")?.requirement === "required", "D-4 visa requires a training plan");
assert(!getDocumentUse(trainingPlan, "visa", "D-2"), "D-2 must not show the D-4 training plan");

for (const type of ["family_relation", "tuberculosis_certificate"]) {
  const item = DOCUMENT_WORKFLOW_ITEMS.find((candidate) => candidate.type === type);
  assert(item, `${type} must exist`);
  assert(item.uses.every((use) => use.requirement === "conditional"), `${type} must stay conditional`);
}

const arrivalRequired = getRequiredDocumentTypes("D-2", "arrival");
for (const type of ["residence_application_form", "passport", "id_photo", "enrollment_certificate", "residence_proof"]) {
  assert(arrivalRequired.includes(type), `arrival stage must require ${type}`);
}
assert(!arrivalRequired.includes("residence_card"), "issued residence card must not count as a prerequisite");

for (const track of ["D-2", "D-4"] as const) {
  const allRequired = getRequiredDocumentTypes(track);
  assert(new Set(allRequired).size === allRequired.length, `${track} overall progress must count reused files once`);
}

console.log(`PASS document workflow (${DOCUMENT_WORKFLOW_ITEMS.length} document types, 4 stages)`);
