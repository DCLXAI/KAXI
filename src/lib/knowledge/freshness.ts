const DEFAULT_KNOWLEDGE_REVIEW_MAX_AGE_DAYS = 92;

export function knowledgeReviewMaxAgeDays(): number {
  const days = Number.parseInt(process.env.KNOWLEDGE_REVIEW_AFTER_DAYS || "", 10);
  return Number.isFinite(days) && days > 0 ? days : DEFAULT_KNOWLEDGE_REVIEW_MAX_AGE_DAYS;
}

export function knowledgeFreshnessCutoff(referenceDate = new Date(), maxAgeDays = knowledgeReviewMaxAgeDays()): Date {
  const cutoff = new Date(referenceDate);
  cutoff.setUTCDate(cutoff.getUTCDate() - maxAgeDays);
  return cutoff;
}

export function knowledgeReviewAfterDate(lastCheckedAt: Date, maxAgeDays = knowledgeReviewMaxAgeDays()): Date {
  const reviewAfter = new Date(lastCheckedAt);
  reviewAfter.setUTCDate(reviewAfter.getUTCDate() + maxAgeDays);
  return reviewAfter;
}

export function isKnowledgeReviewCurrent(lastCheckedAt: Date, referenceDate = new Date()): boolean {
  return knowledgeReviewAfterDate(lastCheckedAt).getTime() >= referenceDate.getTime();
}
