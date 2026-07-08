export interface Synonym {
  id: string;
  source: string;
  targets: string[];
  category: string;
  origin: string;
  enabled: boolean;
  autoMeta: { frequency?: number; confidence?: number; chatLogIds?: string[] } | null;
  createdAt: string;
}

export interface Suggestion {
  source: string;
  targets: string[];
  category: string;
  confidence: number;
  reason: string;
}

export interface ChatlogAnalysis {
  summary: {
    total: number;
    recent: number;
    byLang: { lang: string; _count: number }[];
    bySource: { source: string; _count: number }[];
    failedCount: number;
  };
  topWords: { word: string; count: number }[];
  failedCases: {
    id: string;
    question: string;
    lang: string;
    topDocId?: string;
    topVecScore?: number;
    topKwScore?: number;
  }[];
}
