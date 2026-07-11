import type { Locale } from "@/i18n/routing";
import type { SourceAnnotation } from "@/components/kbridge/SourceAnnotations";

export type ConsultLocale = Locale;
export type ConsultMode = "general" | "visa" | "documents" | "appeal" | "business";

export interface ConsultMessage {
  role: "user" | "ai";
  text: string;
  disclaimer?: string;
  retrievedDocs?: RetrievedDoc[];
  retrieval?: RetrievalDiagnostics;
  searchMeta?: SearchMeta[];
  suggestedFollowups?: string[];
  needsHumanExpert?: boolean;
  consultationQuestion?: string;
  backend?: string;
}

export interface RetrievalDiagnostics {
  backend?: string;
  methods?: string[];
  requestedSemantic?: boolean;
  pgvectorUsed?: boolean;
  pgvectorConfigured?: boolean;
  resultCount?: number;
}

export interface SearchMeta {
  id: string;
  title?: string;
  score?: number;
  vectorScore?: number;
  keywordScore?: number;
  method?: string;
  category?: string;
  docSource?: string;
}

export interface RetrievedDoc {
  id: string;
  title: string;
  category: string;
  source: string;
  excerpt?: string;
  sourceMeta?: {
    label?: string;
    url?: string;
    verifiedAt?: string;
    reviewAfter?: string;
    owner?: string;
    sourceType?: string;
    reviewStatus?: string;
    checkedBy?: string;
  };
  ragMeta?: {
    last_checked_at?: string;
    review_status?: string;
    checked_by?: string;
  };
  basis?: string;
}

export function sourceAnnotationsFromDocs(docs?: RetrievedDoc[]): SourceAnnotation[] {
  return (docs || []).map((doc): SourceAnnotation => ({
    id: doc.id,
    title: doc.title,
    label: doc.sourceMeta?.label || doc.source,
    source: doc.source,
    url: doc.sourceMeta?.url || null,
    kind: doc.sourceMeta?.owner === "internal" ? "internal" : "knowledge",
    owner: doc.sourceMeta?.owner,
    verifiedAt: doc.sourceMeta?.verifiedAt || doc.ragMeta?.last_checked_at,
    reviewAfter: doc.sourceMeta?.reviewAfter,
    sourceType: doc.sourceMeta?.sourceType,
    reviewStatus: doc.sourceMeta?.reviewStatus || doc.ragMeta?.review_status,
    checkedBy: doc.sourceMeta?.checkedBy || doc.ragMeta?.checked_by,
    basis: doc.basis,
    excerpt: doc.excerpt,
  }));
}
