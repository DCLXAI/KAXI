// Vector Store — 임베딩 기반 문서 검색
// 인메모리 인덱스 + 파일 캐싱 (운영시 외부 Vector DB로 교체 가능)
// 하이브리드 모드: 임베딩 코사인 유사도 + 키워드 매칭 결합

import { KNOWLEDGE_DOCS, type KnowledgeDoc } from "../data/knowledge";
import type { Lang } from "../i18n/translations";
import {
  fitVectorizer,
  vectorize,
  cosineSimilarity,
  multilingualText,
  type Vectorizer,
  type Vector,
} from "./vectorizer";

export interface ScoredDoc {
  doc: KnowledgeDoc;
  score: number;
  vectorScore: number;
  keywordScore: number;
  matchedKeywords: string[];
}

interface VectorStore {
  vectorizer: Vectorizer | null;
  docVectors: Vector[];
  docIds: string[];
  ready: boolean;
}

// 싱글톤 인스턴스
let store: VectorStore = {
  vectorizer: null,
  docVectors: [],
  docIds: [],
  ready: false,
};

// 초기화 (lazy — 첫 검색시 또는 명시적 호출시)
export function initVectorStore(): void {
  if (store.ready) return;

  // 각 문서를 다국어 결합 텍스트로 변환
  const docTexts = KNOWLEDGE_DOCS.map((d) =>
    multilingualText({
      title: d.title,
      content: d.content,
      keywords: d.keywords,
    })
  );

  // Vectorizer 학습 (vocabulary + IDF)
  const vectorizer = fitVectorizer(docTexts);

  // 각 문서를 벡터화
  const docVectors = docTexts.map((t) => vectorize(t, vectorizer));

  store = {
    vectorizer,
    docVectors,
    docIds: KNOWLEDGE_DOCS.map((d) => d.id),
    ready: true,
  };

  console.log(
    `[VectorStore] Initialized: ${store.docIds.length} docs, dim=${vectorizer.dim}`
  );
}

// 키워드 매칭 점수 (기존 로직 유지, 보조 신호로 활용)
function keywordScore(query: string, doc: KnowledgeDoc): { score: number; matched: string[] } {
  const q = query.toLowerCase().trim();
  if (!q) return { score: 0, matched: [] };

  let score = 0;
  const matched: string[] = [];
  const words = q.split(/\s+/);

  for (const keyword of doc.keywords) {
    if (q.includes(keyword.toLowerCase())) {
      score += 3;
      matched.push(keyword);
      continue;
    }
    for (const w of words) {
      if (w.length > 2 && keyword.toLowerCase().includes(w)) {
        score += 1;
        if (!matched.includes(keyword)) matched.push(keyword);
      }
    }
  }

  // 제목 매칭 가중치
  for (const lang of ["ko", "vi", "mn", "en"] as Lang[]) {
    const title = doc.title[lang].toLowerCase();
    for (const w of words) {
      if (w.length > 2 && title.includes(w)) {
        score += 2;
      }
    }
  }

  return { score, matched };
}

// 하이브리드 검색: 임베딩 + 키워드 결합
export function hybridSearch(
  query: string,
  options: {
    topK?: number;
    vectorWeight?: number;
    keywordWeight?: number;
  } = {}
): ScoredDoc[] {
  const topK = options.topK ?? 3;
  const vectorWeight = options.vectorWeight ?? 1.2; // 임베딩 가중치 증가
  const keywordWeight = options.keywordWeight ?? 0.6;

  if (!store.ready) initVectorStore();
  if (!query.trim()) return [];

  // 동의어 확장 (한국어 일상 표현 → 공식 용어)
  const expandedQuery = expandSynonyms(query);

  // 쿼리 벡터화 (확장된 쿼리 사용)
  const queryVec = vectorize(expandedQuery, store.vectorizer!);

  // 각 문서에 대해 점수 계산
  const scored: ScoredDoc[] = KNOWLEDGE_DOCS.map((doc, i) => {
    const vScore = cosineSimilarity(queryVec, store.docVectors[i]);
    const { score: kScore, matched } = keywordScore(query, doc);

    // 정규화: 벡터 점수는 0~1, 키워드 점수는 로그 스케일 정규화
    const kScoreNorm = kScore > 0 ? Math.log(1 + kScore) / Math.log(20) : 0;

    const combined = vScore * vectorWeight + kScoreNorm * keywordWeight;

    return {
      doc,
      score: combined,
      vectorScore: vScore,
      keywordScore: kScore,
      matchedKeywords: matched,
    };
  });

  return scored
    .filter((s) => s.score > 0.03) // 임계값 낮춤 (의미적 검색 허용)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// 동의어 확장 — 일상어를 공식 용어로 변환하여 임베딩 질 향상
const SYNONYMS: Record<string, string[]> = {
  // 비용 관련
  "돈": ["비용", "cost", "chi phí", "зардал"],
  "얼마": ["비용", "가격", "cost", "price"],
  "비싸": ["비용", "cost", "높은"],
  "폭리": ["비용", "브로커", "redflag"],
  // 비자 관련
  "거절": ["거절", "refusal", "보장", "보증"],
  "어떡해": ["대응", "해결", "방법"],
  // 학교 관련
  "학교": ["대학", "어학당", "school", "university"],
  "대학교": ["대학", "university", "학위"],
  "어학당": ["언어", "language", "한국어"],
  "한국어": ["언어", "korean", "language", "topik"],
  // 서류 관련
  "서류": ["documents", "hồ sơ", "barimt", "증명서"],
  "서류들": ["documents", "증명서"],
  // 전환
  "끝나고": ["수료", "전환", "transfer"],
  "가려면": ["진학", "전환", "입학"],
  // 경고
  "허위": ["fake", "가짜", "거짓", "위조"],
  "잔고증명": ["재정", "financial", "잔고"],
  // 기타
  "필요해요": ["필요", "required", "요구"],
  "받아요": ["검사", "진단", "test"],
  "어디서": ["장소", "병원", "지정"],
};

function expandSynonyms(query: string): string {
  let expanded = query;

  for (const [key, syns] of Object.entries(SYNONYMS)) {
    if (query.includes(key)) {
      expanded += " " + syns.join(" ");
    }
  }

  return expanded;
}

// 순수 임베딩 검색 (키워드 없는 의미 검색용)
export function semanticSearch(query: string, topK = 3): ScoredDoc[] {
  if (!store.ready) initVectorStore();
  if (!query.trim()) return [];

  const queryVec = vectorize(query, store.vectorizer!);

  const scored: ScoredDoc[] = KNOWLEDGE_DOCS.map((doc, i) => ({
    doc,
    score: cosineSimilarity(queryVec, store.docVectors[i]),
    vectorScore: cosineSimilarity(queryVec, store.docVectors[i]),
    keywordScore: 0,
    matchedKeywords: [],
  }));

  return scored
    .filter((s) => s.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// 디버그용 — 스토어 상태 조회
export function getStoreStats() {
  return {
    ready: store.ready,
    docCount: store.docIds.length,
    dim: store.vectorizer?.dim ?? 0,
    vocabSize: store.vectorizer?.vocabulary.length ?? 0,
  };
}
