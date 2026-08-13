import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

type ReviewDecision = "approved" | "rejected" | "needs_revision";

type ReviewRow = {
  caseId: string;
  decision: ReviewDecision;
  reviewer: string;
  reviewedAt: string;
  expectedDocIds: string[];
  expectedRiskLevel?: string | null;
  expectedHandoff?: boolean | null;
  expectedNoContext?: boolean;
  expectedRefusal?: boolean;
  notes?: string;
};

type StoredCase = {
  id: string;
  locale: string;
  category: string;
  question: string;
  expected_doc_ids: unknown;
  expected_risk_level: string | null;
  expected_handoff: boolean | null;
  active: boolean;
  metadata: Record<string, unknown> | null;
};

const reviewFile = process.env.RAG_BLIND_REVIEW_FILE?.trim() || process.argv[2]?.trim() || "";
if (!reviewFile) throw new Error("RAG_BLIND_REVIEW_FILE or a review JSON path is required");

const input = JSON.parse(readFileSync(reviewFile, "utf8")) as unknown;
if (!Array.isArray(input) || input.length === 0 || input.length > 300) {
  throw new Error("Review file must contain 1 to 300 rows");
}

const seen = new Set<string>();
const reviews = input.map((value, index) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Row ${index + 1} must be an object`);
  const row = value as Partial<ReviewRow>;
  const caseId = row.caseId?.trim() || "";
  const reviewer = row.reviewer?.trim() || "";
  const reviewedAt = row.reviewedAt?.trim() || "";
  if (!caseId.startsWith("blind-")) throw new Error(`Row ${index + 1} has an invalid blind case id`);
  if (seen.has(caseId)) throw new Error(`Duplicate case id: ${caseId}`);
  seen.add(caseId);
  if (!(["approved", "rejected", "needs_revision"] as const).includes(row.decision as ReviewDecision)) {
    throw new Error(`Row ${index + 1} has an invalid decision`);
  }
  if (!reviewer || reviewer.length > 160) throw new Error(`Row ${index + 1} requires an identified reviewer`);
  if (!reviewedAt || Number.isNaN(Date.parse(reviewedAt))) throw new Error(`Row ${index + 1} requires an ISO review timestamp`);
  const expectedDocIds = Array.isArray(row.expectedDocIds)
    ? [...new Set(row.expectedDocIds.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()))]
    : [];
  if (row.decision === "approved" && row.expectedNoContext !== true && expectedDocIds.length === 0) {
    throw new Error(`Approved row ${caseId} needs expected documents or expectedNoContext=true`);
  }
  if (row.expectedNoContext === true && expectedDocIds.length > 0) {
    throw new Error(`No-context row ${caseId} cannot include expected documents`);
  }
  return {
    ...row,
    caseId,
    reviewer,
    reviewedAt: new Date(reviewedAt).toISOString(),
    expectedDocIds,
  } as ReviewRow;
});

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
if (!url || !key) throw new Error("Supabase service configuration is required");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const existing = await supabase
  .from("rag_evaluation_cases")
  .select("id,locale,category,question,expected_doc_ids,expected_risk_level,expected_handoff,active,metadata")
  .in("id", reviews.map((row) => row.caseId));
if (existing.error) throw existing.error;
const byId = new Map(((existing.data || []) as StoredCase[]).map((row) => [row.id, row]));
const missing = reviews.map((row) => row.caseId).filter((id) => !byId.has(id));
if (missing.length > 0) throw new Error(`Blind candidates must be seeded first; missing: ${missing.join(", ")}`);

const updates = reviews.map((review) => {
  const stored = byId.get(review.caseId)!;
  if (stored.metadata?.cohort !== "expert-blind") throw new Error(`${review.caseId} is not an expert-blind candidate`);
  const approved = review.decision === "approved";
  return {
    ...stored,
    expected_doc_ids: review.expectedDocIds,
    expected_risk_level: review.expectedRiskLevel ?? null,
    expected_handoff: review.expectedHandoff ?? null,
    active: approved,
    metadata: {
      ...(stored.metadata || {}),
      reviewStatus: approved ? "expert_approved" : review.decision,
      reviewedBy: review.reviewer,
      reviewedAt: review.reviewedAt,
      reviewNotes: review.notes?.trim().slice(0, 2_000) || null,
      expectedNoContext: review.expectedNoContext === true,
      expectedRefusal: review.expectedRefusal === true,
      expectedStrictCategory: stored.category !== "general",
      expectedLocaleHeadings: review.expectedNoContext !== true,
      expectedOpenAiVector: true,
    },
  };
});

const saved = await supabase.from("rag_evaluation_cases").upsert(updates, { onConflict: "id" });
if (saved.error) throw saved.error;
const approvedCount = updates.filter((row) => row.active).length;
console.log(`PASS applied ${updates.length} expert reviews; ${approvedCount} cases activated`);
