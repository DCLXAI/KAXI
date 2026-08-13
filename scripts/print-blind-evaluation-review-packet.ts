import { buildBlindEvaluationCandidates } from "../quality/blind-eval-candidates";

const packet = buildBlindEvaluationCandidates().map((candidate) => ({
  caseId: candidate.id,
  locale: candidate.locale,
  category: candidate.category,
  question: candidate.question,
  candidateExpectedDocIds: candidate.expectedDocIds,
  decision: "pending",
  reviewer: "",
  reviewedAt: "",
  expectedDocIds: candidate.expectedDocIds,
  expectedRiskLevel: candidate.expectedRiskLevel,
  expectedHandoff: candidate.expectedHandoff,
  expectedNoContext: candidate.expectedNoContext,
  expectedRefusal: candidate.expectedRefusal,
  notes: "",
}));

process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
