export const AGENT_RESPONSE_CACHE_TTL_MS = 5 * 60 * 1_000;
export const AGENT_RESPONSE_CACHE_MAX_ENTRIES = 12;

const SENSITIVE_PATTERN = /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b(?:\+?\d[\d\s().-]{7,}\d)\b|여권|passport|외국인등록번호|alien registration|주민등록번호|resident registration|zalo|wechat|telegram|kakao|line)/iu;
const HIGH_RISK_PATTERN = /(?:허위|위조|불법|강제퇴거|출국명령|입국금지|범죄|fake|forg(?:e|ed)|illegal|deport|removal order|entry ban|criminal|giả|bất hợp pháp|trục xuất|хуурамч|хууль бус|албадан гаргах)/iu;
const CONTEXTUAL_PATTERN = /^(?:그럼|그러면|그거|이거|위의|앞의|이 경우|그 경우|then|what about that|in that case|còn|vậy thì|trường hợp này|тэгвэл|энэ тохиолдолд)(?:\s|$|[?!.,])/iu;

export function isCacheableAgentQuestion(question: string): boolean {
  const normalized = question.normalize("NFKC").replace(/\s+/g, " ").trim();
  return normalized.length >= 4
    && normalized.length <= 400
    && !SENSITIVE_PATTERN.test(normalized)
    && !HIGH_RISK_PATTERN.test(normalized)
    && !CONTEXTUAL_PATTERN.test(normalized);
}

export function agentResponseCacheKey(question: string, locale: string): string {
  const normalized = question.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
  return `${locale}:${normalized}`;
}

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class AgentSessionResponseCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly ttlMs = AGENT_RESPONSE_CACHE_TTL_MS,
    private readonly maxEntries = AGENT_RESPONSE_CACHE_MAX_ENTRIES,
  ) {}

  get(key: string, now = Date.now()): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, now = Date.now()): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (typeof oldest !== "string") break;
      this.entries.delete(oldest);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
