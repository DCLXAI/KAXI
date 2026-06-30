// 다국어 문장 임베딩 (의미 검색용)
// 순수 TypeScript 구현 — 외부 모델 다운로드 불필요
// 접근 방식:
//   1. 다국어 텍스트 정규화 (소문자화, 구두점 분리)
//   2. Character n-gram (2~4) + Word unigram 결합 → 희소 벡터
//   3. TF-IDF 가중치 적용
//   4. L2 정규화 → 코사인 유사도로 검색
// 다국어(한국어/베트남어/몽골어/영어) 모두에 작동
// 운영시 Vector DB(Pinecone, Weaviate, Qdrant)로 교체 가능하도록 인터페이스 설계

export type Vector = number[];

// 텍스트 정규화
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Word tokens (공백 기준)
function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter((t) => t.length > 1);
}

// 텍스트 → feature bag (word + char n-gram)
function extractFeatures(text: string): Map<string, number> {
  const features = new Map<string, number>();
  const tokens = tokenize(text);

  // Word unigram (가중치 2.0)
  for (const w of tokens) {
    features.set(`w:${w}`, (features.get(`w:${w}`) ?? 0) + 2.0);
  }

  // Word bigram (가중치 1.5) — "비용" + "필요" → "비용 필요" 맥락 잡기
  for (let i = 0; i < tokens.length - 1; i++) {
    const bg = `b:${tokens[i]}_${tokens[i + 1]}`;
    features.set(bg, (features.get(bg) ?? 0) + 1.5);
  }

  // Character 2-4 gram (가중치 1.0) — 어근 일치 + 다국어 지원
  const normalized = normalize(text).replace(/\s+/g, "");
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i <= normalized.length - n; i++) {
      const g = `c${n}:${normalized.slice(i, i + n)}`;
      features.set(g, (features.get(g) ?? 0) + 1.0);
    }
  }

  return features;
}

// 문서 컬렉션으로부터 vocabulary 구축 + IDF 계산
export interface Vectorizer {
  vocabulary: string[]; // feature names
  vocabIndex: Map<string, number>;
  idf: Float32Array; // vocabulary 크기
  dim: number;
}

export function fitVectorizer(documents: string[]): Vectorizer {
  // 모든 문서의 feature 모으기
  const docFeatures = documents.map(extractFeatures);

  // vocabulary 구축
  const vocabSet = new Set<string>();
  const docCount = new Map<string, number>();

  for (const feats of docFeatures) {
    for (const [k] of feats) {
      vocabSet.add(k);
      docCount.set(k, (docCount.get(k) ?? 0) + 1);
    }
  }

  const vocabulary = Array.from(vocabSet).sort();
  const vocabIndex = new Map<string, number>();
  vocabulary.forEach((v, i) => vocabIndex.set(v, i));

  // IDF 계산: log((N + 1) / (df + 1)) + 1 (smooth)
  const N = documents.length;
  const idf = new Float32Array(vocabulary.length);
  for (let i = 0; i < vocabulary.length; i++) {
    const df = docCount.get(vocabulary[i]) ?? 0;
    idf[i] = Math.log((N + 1) / (df + 1)) + 1;
  }

  return { vocabulary, vocabIndex, idf, dim: vocabulary.length };
}

// 텍스트 → TF-IDF 벡터 (L2 정규화)
export function vectorize(text: string, vec: Vectorizer): Vector {
  const v = new Float32Array(vec.dim);
  const feats = extractFeatures(text);

  let sumSq = 0;
  for (const [k, tf] of feats) {
    const idx = vec.vocabIndex.get(k);
    if (idx === undefined) continue;
    const weight = tf * vec.idf[idx];
    v[idx] = weight;
    sumSq += weight * weight;
  }

  // L2 정규화 (코사인 유사도 = 내적)
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < v.length; i++) {
    v[i] /= norm;
  }

  return Array.from(v);
}

// 코사인 유사도 (이미 L2 정규화되어 있으므로 내적)
export function cosineSimilarity(a: Vector, b: Vector): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

// 다국어 문서를 결합하여 단일 임베딩용 텍스트 생성
// 각 언어 텍스트를 모두 합침 — 다국어 검색시 어떤 언어로 질문해도 매칭 가능
export function multilingualText(doc: {
  title: { ko: string; vi: string; mn: string; en: string };
  content: { ko: string; vi: string; mn: string; en: string };
  keywords?: string[];
}): string {
  const parts: string[] = [];
  parts.push(doc.title.ko, doc.title.vi, doc.title.mn, doc.title.en);
  parts.push(doc.content.ko, doc.content.vi, doc.content.mn, doc.content.en);
  if (doc.keywords && doc.keywords.length > 0) {
    parts.push(doc.keywords.join(" "));
  }
  return parts.join(" ");
}
