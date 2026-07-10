import { db } from "@/lib/db";

export type DocumentVerificationFeedbackLabel = "ACCURATE" | "FALSE_POSITIVE" | "FALSE_NEGATIVE" | "NEEDS_REVIEW";

export interface DocumentVerificationMetricsOptions {
  since?: Date;
  until?: Date;
  limit?: number;
}

export interface DocumentVerificationMetrics {
  window: {
    since: string;
    until: string;
  };
  totals: {
    verifiedDocuments: number;
    documentsWithFeedback: number;
    feedbackCount: number;
    feedbackCoverage: number;
    needsHumanReviewDocuments: number;
  };
  labels: Record<DocumentVerificationFeedbackLabel, number>;
  rates: {
    accuracy: number;
    falsePositive: number;
    falseNegative: number;
    needsReview: number;
  };
  issueCodes: Array<{ code: string; count: number }>;
  layerStatuses: Array<{ layer: string; status: string; count: number }>;
  recentFeedback: Array<{
    id: string;
    documentItemId: string;
    documentType: string | null;
    label: string;
    issueCodes: string[];
    reviewerActor: string;
    reviewerRole: string;
    note: string | null;
    createdAt: string;
  }>;
}

const FEEDBACK_LABELS: DocumentVerificationFeedbackLabel[] = [
  "ACCURATE",
  "FALSE_POSITIVE",
  "FALSE_NEGATIVE",
  "NEEDS_REVIEW",
];

function defaultSince(until: Date): Date {
  return new Date(until.getTime() - 30 * 24 * 60 * 60 * 1000);
}

function clampLimit(value: number | undefined): number {
  if (!Number.isFinite(value || NaN)) return 20;
  return Math.min(Math.max(Math.trunc(value || 20), 1), 100);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function rate(count: number, total: number): number {
  if (total <= 0) return 0;
  return Number((count / total).toFixed(4));
}

function increment(map: Map<string, number>, key: string): void {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function sortedCounts(map: Map<string, number>, limit = 20): Array<{ key: string; count: number }> {
  return [...map.entries()]
    .sort((a, b) => {
      if (a[1] !== b[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

export async function getDocumentVerificationMetrics(
  options: DocumentVerificationMetricsOptions = {}
): Promise<DocumentVerificationMetrics> {
  const until = options.until || new Date();
  const since = options.since || defaultSince(until);
  const limit = clampLimit(options.limit);

  const [feedback, verifiedDocuments, needsHumanReviewDocuments] = await Promise.all([
    db.documentVerificationFeedback.findMany({
      where: {
        createdAt: {
          gte: since,
          lte: until,
        },
      },
      include: {
        documentItem: {
          select: { documentType: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    db.documentItem.count({
      where: {
        ocrValidation: { not: undefined },
        updatedAt: {
          gte: since,
          lte: until,
        },
      },
    }),
    db.documentItem.count({
      where: {
        reviewStatus: "NEEDS_HUMAN_REVIEW",
        updatedAt: {
          gte: since,
          lte: until,
        },
      },
    }),
  ]);

  const labels = Object.fromEntries(FEEDBACK_LABELS.map((label) => [label, 0])) as Record<DocumentVerificationFeedbackLabel, number>;
  const issueCodeCounts = new Map<string, number>();
  const layerStatusCounts = new Map<string, number>();
  const documentIds = new Set<string>();

  for (const row of feedback) {
    if (FEEDBACK_LABELS.includes(row.label as DocumentVerificationFeedbackLabel)) {
      labels[row.label as DocumentVerificationFeedbackLabel] += 1;
    }
    documentIds.add(row.documentItemId);
    for (const code of asStringArray(row.issueCodes)) increment(issueCodeCounts, code);
    for (const [layer, status] of Object.entries(asRecord(row.layerStatuses))) {
      if (typeof status === "string") increment(layerStatusCounts, `${layer}:${status}`);
    }
  }

  const feedbackCount = feedback.length;
  const issueCodes = sortedCounts(issueCodeCounts).map(({ key, count }) => ({ code: key, count }));
  const layerStatuses = sortedCounts(layerStatusCounts).map(({ key, count }) => {
    const [layer, ...statusParts] = key.split(":");
    return { layer, status: statusParts.join(":"), count };
  });

  return {
    window: {
      since: since.toISOString(),
      until: until.toISOString(),
    },
    totals: {
      verifiedDocuments,
      documentsWithFeedback: documentIds.size,
      feedbackCount,
      feedbackCoverage: rate(documentIds.size, verifiedDocuments),
      needsHumanReviewDocuments,
    },
    labels,
    rates: {
      accuracy: rate(labels.ACCURATE, feedbackCount),
      falsePositive: rate(labels.FALSE_POSITIVE, feedbackCount),
      falseNegative: rate(labels.FALSE_NEGATIVE, feedbackCount),
      needsReview: rate(labels.NEEDS_REVIEW, feedbackCount),
    },
    issueCodes,
    layerStatuses,
    recentFeedback: feedback.slice(0, limit).map((row) => ({
      id: row.id,
      documentItemId: row.documentItemId,
      documentType: row.documentItem.documentType,
      label: row.label,
      issueCodes: asStringArray(row.issueCodes),
      reviewerActor: row.reviewerActor,
      reviewerRole: row.reviewerRole,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
