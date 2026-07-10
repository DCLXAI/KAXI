import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { db } from "../src/lib/db";
import { searchPgvectorKnowledge } from "../src/lib/embeddings/pgvector-rag";
import { getCandidateApprovalReadiness, getRagCorpusReadiness } from "../src/lib/knowledge/corpus-readiness";
import { parseOfficialSourceExtractionMetadata } from "../src/lib/knowledge/harvest-metadata";
import { matrixCompletenessSummary } from "../src/lib/documents/visa-document-matrix";

type CheckStatus = "pass" | "fail" | "warn";

interface AuditCheck {
  key: string;
  status: CheckStatus;
  detail: string;
  evidence?: Record<string, unknown>;
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function check(condition: unknown, key: string, detail: string, evidence?: Record<string, unknown>): AuditCheck {
  return { key, status: condition ? "pass" : "fail", detail, evidence };
}

function warn(condition: unknown, key: string, detail: string, evidence?: Record<string, unknown>): AuditCheck {
  return { key, status: condition ? "pass" : "warn", detail, evidence };
}

function packageScripts(): Record<string, string> {
  return JSON.parse(readFileSync("package.json", "utf8")).scripts || {};
}

function lineCount(path: string): number {
  if (!existsSync(path)) return 0;
  const content = readFileSync(path, "utf8").trim();
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

function jsonArrayCount(path: string): number {
  if (!existsSync(path)) return 0;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

async function pendingCandidateSearchCheck(options: { allowNoPendingCandidate?: boolean } = {}): Promise<AuditCheck> {
  const candidate = await db.knowledgeDocument.findFirst({
    where: {
      reviewStatus: "PENDING",
      docId: { contains: "__candidate__" },
    },
    orderBy: { lastCheckedAt: "desc" },
    select: { docId: true, title: true },
  });
  if (!candidate) {
    if (options.allowNoPendingCandidate) {
      return check(true, "rag.pending_candidate_search_exclusion", "No pending candidate remains after production approval; approved-only search exclusion is vacuously satisfied.");
    }
    return check(false, "rag.pending_candidate_search_exclusion", "No pending candidate exists to test approved-only search.");
  }

  const results = await searchPgvectorKnowledge(candidate.docId, { topK: 5, languages: ["ko"] });
  const leaked = results.some((result) => result.doc.ragMeta?.doc_id === candidate.docId || result.doc.id === candidate.docId);
  const nonApproved = results.filter((result) => result.doc.ragMeta?.review_status && result.doc.ragMeta.review_status !== "approved");

  return check(
    !leaked && nonApproved.length === 0,
    "rag.pending_candidate_search_exclusion",
    "Embedded PENDING candidates must not be returned by production pgvector search.",
    {
      candidateDocId: candidate.docId,
      returnedDocIds: results.map((result) => result.doc.ragMeta?.doc_id || result.doc.id),
      nonApproved: nonApproved.map((result) => result.doc.ragMeta?.doc_id || result.doc.id),
    }
  );
}

async function main() {
  const minCandidateChunks = positiveInt(argValue("--min-candidate-chunks"), 500);
  const minApprovedChunks = positiveInt(argValue("--min-approved-chunks"), 500);
  const minApprovedOfficialChunks = positiveInt(argValue("--min-approved-official-chunks"), minApprovedChunks);
  const minApprovedOfficialEmbeddedChunks = positiveInt(
    argValue("--min-approved-official-embedded-chunks"),
    minApprovedOfficialChunks
  );
  const requireProductionApproved = hasFlag("--require-production-approved");
  const scripts = packageScripts();
  const matrix = matrixCompletenessSummary();
  const corpus = await getRagCorpusReadiness({
    minApprovedChunks,
    minApprovedEmbeddedChunks: minApprovedChunks,
    minApprovedOfficialChunks,
    minApprovedOfficialEmbeddedChunks,
  });
  const candidateApproval = await getCandidateApprovalReadiness({
    minCandidateChunks,
    minCandidateEmbeddedChunks: minCandidateChunks,
    minProjectedApprovedChunks: minApprovedChunks,
    minProjectedApprovedEmbeddedChunks: minApprovedChunks,
  });
  const [
    visaDocumentRows,
    pendingCandidates,
    pendingCandidateChunks,
    embeddedPendingCandidateChunks,
    testArtifacts,
  ] = await Promise.all([
    db.visaDocumentRequirement.count(),
    db.knowledgeDocument.count({ where: { reviewStatus: "PENDING", docId: { contains: "__candidate__" } } }),
    db.knowledgeChunk.count({ where: { document: { reviewStatus: "PENDING", docId: { contains: "__candidate__" } } } }),
    db.knowledgeChunk.count({
      where: {
        embeddingDim: 384,
        embeddingModel: "Xenova/multilingual-e5-small",
        document: { reviewStatus: "PENDING", docId: { contains: "__candidate__" } },
      },
    }),
    db.knowledgeDocument.count({
      where: {
        OR: [
          { docId: { startsWith: "mock-official-source-" } },
          { docId: { startsWith: "official-base-doc" } },
          { docId: { startsWith: "test-" } },
          { docId: { startsWith: "candidate-hidden-needle" } },
        ],
      },
    }),
  ]);

  const reviewDir = join(process.cwd(), "legal-review", "latest");
  const candidateDecisionRows = lineCount(join(reviewDir, "harvested-candidate-decisions.jsonl"));
  const templateDecisionRows = lineCount(join(reviewDir, "review-decisions.template.jsonl"));
  const labelStudioTaskRows = jsonArrayCount(join(reviewDir, "label-studio-candidates.json"));
  const labelStudioConfigExists = existsSync(join(reviewDir, "label-studio-candidate-config.xml"));
  const pendingCandidateFirstChunks = await db.knowledgeDocument.findMany({
    where: { reviewStatus: "PENDING", docId: { contains: "__candidate__" } },
    select: {
      docId: true,
      chunks: {
        orderBy: { chunkIndex: "asc" },
        take: 4,
        select: { content: true },
      },
    },
  });
  const pendingCandidateExtractionMethods = pendingCandidateFirstChunks.map((candidate) => ({
    docId: candidate.docId,
    extractionMethod: parseOfficialSourceExtractionMetadata(candidate.chunks.map((chunk) => chunk.content).join("\n")).extractionMethod,
  }));
  const candidatesWithExtractionMetadata = pendingCandidateExtractionMethods.filter((candidate) => candidate.extractionMethod !== "unknown").length;
  const extractionMethodCounts = pendingCandidateExtractionMethods.reduce<Record<string, number>>((acc, candidate) => {
    acc[candidate.extractionMethod] = (acc[candidate.extractionMethod] || 0) + 1;
    return acc;
  }, {});
  const corpusCheck = requireProductionApproved
    ? check(corpus.ok, "rag.production_approved_corpus", "Approved production corpus satisfies the configured total and official-source embedded chunk floors.", {
        approvedChunks: corpus.approvedChunks,
        approvedEmbeddedChunks: corpus.approvedEmbeddedChunks,
        approvedOfficialChunks: corpus.approvedOfficialChunks,
        approvedOfficialEmbeddedChunks: corpus.approvedOfficialEmbeddedChunks,
        minApprovedChunks,
        minApprovedOfficialChunks,
        minApprovedOfficialEmbeddedChunks,
        reasons: corpus.reasons,
      })
    : warn(corpus.ok, "rag.production_approved_corpus", "Approved production corpus satisfies the configured total and official-source embedded chunk floors.", {
        approvedChunks: corpus.approvedChunks,
        approvedEmbeddedChunks: corpus.approvedEmbeddedChunks,
        approvedOfficialChunks: corpus.approvedOfficialChunks,
        approvedOfficialEmbeddedChunks: corpus.approvedOfficialEmbeddedChunks,
        minApprovedChunks,
        minApprovedOfficialChunks,
        minApprovedOfficialEmbeddedChunks,
        reasons: corpus.reasons,
      });

  const candidateChecks: AuditCheck[] = requireProductionApproved
    ? [
        warn(
          pendingCandidates === 0,
          "rag.pending_candidates_remaining",
          "Production-approved mode does not require pending candidates; remaining candidates should be triaged separately.",
          { pendingCandidates, pendingCandidateChunks, embeddedPendingCandidateChunks }
        ),
      ]
    : [
        check(pendingCandidates > 0, "rag.pending_candidates", "Official-source harvest produced pending candidates.", { pendingCandidates }),
        check(pendingCandidateChunks >= minCandidateChunks, "rag.pending_candidate_chunks", "Official-source harvest produced 500+ pending candidate chunks.", { pendingCandidateChunks, minCandidateChunks }),
        check(embeddedPendingCandidateChunks >= minCandidateChunks, "rag.pending_candidate_embeddings", "Pending candidate chunks are pre-embedded for fast approval finalization.", { embeddedPendingCandidateChunks, minCandidateChunks }),
        check(candidateApproval.ok, "rag.candidate_approval_projection", "Approving all pending candidates would produce a 500+ approved official embedded corpus.", {
          pendingCandidates: candidateApproval.pendingCandidates,
          pendingCandidateChunks: candidateApproval.pendingCandidateChunks,
          pendingCandidateEmbeddedChunks: candidateApproval.pendingCandidateEmbeddedChunks,
          pendingOfficialCandidates: candidateApproval.pendingOfficialCandidates,
          pendingOfficialCandidateChunks: candidateApproval.pendingOfficialCandidateChunks,
          pendingOfficialCandidateEmbeddedChunks: candidateApproval.pendingOfficialCandidateEmbeddedChunks,
          projectedApprovedChunks: candidateApproval.projectedApprovedChunks,
          projectedApprovedEmbeddedChunks: candidateApproval.projectedApprovedEmbeddedChunks,
          projectedApprovedOfficialChunks: candidateApproval.projectedApprovedOfficialChunks,
          projectedApprovedOfficialEmbeddedChunks: candidateApproval.projectedApprovedOfficialEmbeddedChunks,
          projectedSupersededApprovedDocuments: candidateApproval.projectedSupersededApprovedDocuments,
          reasons: candidateApproval.reasons,
        }),
        check(candidateDecisionRows === pendingCandidates, "legal_review.candidate_decisions", "Candidate-only legal-review decision file has one row per pending candidate.", { candidateDecisionRows, pendingCandidates }),
        check(templateDecisionRows >= pendingCandidates, "legal_review.template_decisions", "Full legal-review template includes candidate and governance review rows.", { templateDecisionRows, pendingCandidates }),
        check(
          labelStudioTaskRows === pendingCandidates && labelStudioConfigExists,
          "legal_review.label_studio_tasks",
          "Label Studio review export has one task per pending candidate and an importable labeling config.",
          { labelStudioTaskRows, pendingCandidates, labelStudioConfigExists }
        ),
        check(
          candidatesWithExtractionMetadata === pendingCandidates,
          "rag.pending_candidate_extraction_metadata",
          "Pending official-source candidates include extraction metadata for review and audit.",
          {
            candidatesWithExtractionMetadata,
            pendingCandidates,
            extractionMethodCounts,
            missingSample: pendingCandidateExtractionMethods
              .filter((candidate) => candidate.extractionMethod === "unknown")
              .slice(0, 5)
              .map((candidate) => candidate.docId),
          }
        ),
      ];

  const checks: AuditCheck[] = [
    check(matrix.totalRows === 50, "matrix.static_rows", "Static visa document matrix contains exactly 50 labeled rows.", { totalRows: matrix.totalRows }),
    check(visaDocumentRows >= 50, "matrix.db_rows", "Database has seeded visa document matrix rows.", { visaDocumentRows }),
    check(matrix.validationRuleRows >= 20, "matrix.validation_rules", "Document matrix has 20+ validation-rule rows.", { validationRuleRows: matrix.validationRuleRows }),
    check(
      ["D-2", "D-4", "D-10", "E-7", "F-2", "F-5"].every((visaType) => matrix.visaTypes.includes(visaType)),
      "matrix.visa_type_coverage",
      "Document matrix covers D-2, D-4, D-10, E-7, F-2, and F-5.",
      { visaTypes: matrix.visaTypes }
    ),
    ...candidateChecks,
    corpusCheck,
    check(testArtifacts === 0, "db.no_test_artifacts", "Local DB has no test/mock knowledge artifacts.", { testArtifacts }),
    check(Boolean(scripts["knowledge:harvest:official"]), "scripts.harvest", "Official-source harvest script is registered."),
    check(Boolean(scripts["knowledge:embed:candidates"]), "scripts.embed_candidates", "Pending candidate pre-embedding script is registered."),
    check(
      Boolean(scripts["knowledge:check:candidates"] && scripts["knowledge:finalize:corpus"] && scripts["knowledge:promote:candidates"]),
      "scripts.finalize_corpus",
      "Candidate approval readiness, reviewed-candidate promotion, and approved corpus finalization scripts are registered."
    ),
    check(Boolean(scripts["legal-review:export"] && scripts["legal-review:apply"] && scripts["legal-review:candidates"] && scripts["legal-review:validate"]), "scripts.legal_review", "Legal-review export/apply/candidate validation scripts are registered."),
    check(
      Boolean(scripts["legal-review:label-studio:export"] && scripts["legal-review:label-studio:import"] && scripts["test:label-studio-review"]),
      "scripts.label_studio_review",
      "Label Studio legal-review export/import scripts and regression test are registered."
    ),
    check(Boolean(scripts["test:document-verification"]), "tests.layer1_layer3", "Layer 1/3 document verification test is registered."),
    check(Boolean(scripts["test:document-verification-api"]), "tests.verification_api", "Admin verification API test is registered."),
    check(Boolean(scripts["test:document-verification-batch"]), "tests.batch_verification", "Document-set batch verification test is registered."),
    check(Boolean(scripts["test:document-verification-metrics"]), "tests.metrics", "Reviewer feedback metrics test is registered."),
  ];

  checks.push(await pendingCandidateSearchCheck({ allowNoPendingCandidate: requireProductionApproved }));

  const failed = checks.filter((item) => item.status === "fail");
  const warnings = checks.filter((item) => item.status === "warn");

  const payload = {
    ok: failed.length === 0,
    productionApproved: corpus.ok,
    checkedAt: new Date().toISOString(),
    mode: requireProductionApproved ? "production-approved-required" : "pre-approval",
    summary: {
      checks: checks.length,
      passed: checks.filter((item) => item.status === "pass").length,
      warnings: warnings.length,
      failed: failed.length,
    },
    corpus,
    checks,
    failures: failed,
    warnings,
  };

  console.log(JSON.stringify(payload, null, 2));
  if (!payload.ok) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(`[phase0-phase1-readiness] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
