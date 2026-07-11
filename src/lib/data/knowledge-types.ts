// KAXI RAG 지식 베이스 — 타입 정의
import type { Lang } from "../i18n/translations";

export interface KnowledgeDoc {
  id: string;
  category: "visa" | "cost" | "documents" | "school" | "legal" | "process" | "warning";
  title: { ko: string; vi: string; mn: string; en: string };
  // 검색용 키워드 (소문자)
  keywords: string[];
  content: { ko: string; vi: string; mn: string; en: string };
  source: string;
  ragMeta?: RagDocumentMetadata;
}

export interface SourceMetadata {
  label: string;
  url: string;
  verifiedAt: string;
  reviewAfter: string;
  owner: "official" | "internal";
  sourceType?: SourceType;
  jurisdiction?: "KR" | "KAXI";
  validFrom?: string;
  validTo?: string | null;
  checkedBy?: string;
  reviewStatus?: ReviewStatus;
  supersedes?: string[];
  supersededBy?: string | null;
}

export type SourceType = "official_government" | "official_law" | "internal_analysis" | "internal_policy";
export type ReviewStatus = "draft" | "approved" | "needs_review" | "deprecated";

export interface ResolvedSourceMetadata extends SourceMetadata {
  sourceType: SourceType;
  jurisdiction: "KR" | "KAXI";
  validFrom: string;
  validTo: string | null;
  checkedBy: string;
  reviewStatus: ReviewStatus;
  supersedes: string[];
  supersededBy: string | null;
}

export interface KnowledgeDocWithMetadata extends KnowledgeDoc {
  sourceMeta: ResolvedSourceMetadata;
}

export interface RagDocumentMetadata {
  doc_id: string;
  title: string;
  source_url: string;
  source_type: SourceType;
  language: Lang;
  jurisdiction: "KR" | "KAXI";
  topic: KnowledgeDoc["category"];
  valid_from: string;
  valid_to: string | null;
  last_checked_at: string;
  checked_by: string;
  review_status: ReviewStatus;
  supersedes: string[];
  superseded_by: string | null;
  review_after: string;
  source_label: string;
  owner: "official" | "internal";
}
