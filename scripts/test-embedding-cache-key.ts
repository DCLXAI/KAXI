// Unit test: embedding cache key must be versioned so a model/dim/prefix
// change automatically invalidates stale on-disk vector cache entries.
// Run: bun run scripts/test-embedding-cache-key.ts
import { embeddingCacheKey, EMBEDDING_CACHE_VERSION } from "../src/lib/embeddings/vector-store";
import type { KnowledgeDoc } from "../src/lib/data/knowledge";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const doc: KnowledgeDoc = {
  id: "test-doc-1",
  category: "visa",
  title: { ko: "제목", vi: "tiêu đề", mn: "гарчиг", en: "title" },
  keywords: ["test"],
  content: { ko: "내용", vi: "nội dung", mn: "агуулга", en: "content" },
  source: "test",
};

const key = embeddingCacheKey(doc);

assert(
  key.startsWith(`${EMBEDDING_CACHE_VERSION}:`),
  `cache key must be prefixed with EMBEDDING_CACHE_VERSION, got: ${key}`
);
assert(key.includes(doc.id), `cache key must include doc id, got: ${key}`);

// Bumping the version must change the key for the same doc content, so any
// past cache (keyed without the version, or with an older version) misses.
const legacyStyleKey = key.slice(`${EMBEDDING_CACHE_VERSION}:`.length);
assert(
  legacyStyleKey !== key,
  "versioned key must differ from the unversioned (legacy) key shape"
);
assert(
  legacyStyleKey.startsWith(`${doc.id}:`),
  `unversioned tail should still be "<docId>:<digest>", got: ${legacyStyleKey}`
);

// Same doc content -> same key (deterministic).
const key2 = embeddingCacheKey(doc);
assert(key === key2, "embeddingCacheKey must be deterministic for identical doc content");

// Different content -> different digest (different key).
const doc2: KnowledgeDoc = { ...doc, content: { ...doc.content, ko: "다른 내용" } };
const key3 = embeddingCacheKey(doc2);
assert(key3 !== key, "different doc content must produce a different cache key");

console.log(`PASS: embeddingCacheKey is versioned (${EMBEDDING_CACHE_VERSION}) and deterministic`);
