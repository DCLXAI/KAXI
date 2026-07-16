export const OFFICIAL_KOREAN_SOURCE_HOST_SUFFIXES = [
  "go.kr",
  "korea.kr",
] as const;

export const OFFICIAL_KNOWLEDGE_SOURCE_URL_SQL_REGEX =
  "^https://([a-z0-9-]+\\.)*(go\\.kr|korea\\.kr)(:[0-9]+)?([/?#]|$)";

export function hasOfficialKnowledgeSourceType(sourceType: string | null | undefined): boolean {
  return Boolean(sourceType?.startsWith("official_"));
}

function hostMatchesSuffix(hostname: string, suffix: string): boolean {
  return hostname === suffix || hostname.endsWith(`.${suffix}`);
}

export function hasOfficialKnowledgeSourceUrl(sourceUrl: string | null | undefined): boolean {
  if (!sourceUrl?.trim()) return false;
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    return OFFICIAL_KOREAN_SOURCE_HOST_SUFFIXES.some((suffix) => hostMatchesSuffix(hostname, suffix));
  } catch {
    return false;
  }
}

// The immigration.go.kr CMS serves some pages behind an https->http downgrade
// redirect (same host, same path — their misconfiguration, e.g. menu 3509).
// A pure protocol downgrade on an already-pinned official host+path is
// tolerated for MONITORING because every ingested candidate still passes
// human review before serving; anything else stays rejected.
export function isOfficialProtocolDowngrade(
  originalUrl: string | null | undefined,
  finalUrl: string | null | undefined,
): boolean {
  if (!hasOfficialKnowledgeSourceUrl(originalUrl)) return false;
  if (!finalUrl?.trim()) return false;
  try {
    const original = new URL(originalUrl as string);
    const final = new URL(finalUrl);
    if (final.protocol !== "http:") return false;
    if (final.hostname.toLowerCase() !== original.hostname.toLowerCase()) return false;
    if (final.port && final.port !== "80") return false;
    if (final.pathname !== original.pathname) return false;
    const normalizeSearch = (value: string) => (value === "?" ? "" : value);
    return normalizeSearch(final.search) === normalizeSearch(original.search);
  } catch {
    return false;
  }
}

export function isOfficialKnowledgeSource(input: {
  sourceType?: string | null;
  sourceUrl?: string | null;
  owner?: string | null;
}): boolean {
  return (
    (hasOfficialKnowledgeSourceType(input.sourceType) || input.owner === "official") &&
    hasOfficialKnowledgeSourceUrl(input.sourceUrl)
  );
}
