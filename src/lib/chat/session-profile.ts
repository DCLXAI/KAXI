export type SessionProfileLocale = "ko" | "en" | "vi" | "mn";
export type SessionProfileStudyStage = "language" | "undergraduate" | "graduate";
export type SessionProfileSource = "deterministic" | "mediation";
export type SessionProfileFieldKey = "nationality" | "currentVisa" | "targetVisa" | "studyStage";

export type SessionProfile = {
  version: "session-profile-v1";
  nationality?: string;
  currentVisa?: string;
  targetVisa?: string;
  studyStage?: SessionProfileStudyStage;
  fields?: Partial<Record<SessionProfileFieldKey, { turn: number; source: SessionProfileSource }>>;
};

export type SessionProfileSignals = Partial<{
  nationality: string;
  currentVisa: string;
  targetVisa: string;
  studyStage: SessionProfileStudyStage;
}>;

const PROFILE_VERSION = "session-profile-v1" as const;
const STUDY_STAGES: SessionProfileStudyStage[] = ["language", "undergraduate", "graduate"];

export function normalizeVisaCode(value: unknown) {
  const match = String(value || "").trim().toUpperCase().match(/^([CDEF])[-\s]?(\d+)(?:[-\s]?(\d+))?$/);
  return match ? `${match[1]}-${match[2]}${match[3] ? `-${match[3]}` : ""}` : "";
}

const VISA_CODE_PATTERN = /\b[cdef][-\s]?\d+(?:[-\s]?\d+)?\b/giu;

// Country surface forms → ISO 3166-1 alpha-2, covering KAXI's serving locales.
const NATIONALITY_PATTERNS: Array<{ code: string; pattern: RegExp }> = [
  { code: "vn", pattern: /베트남|việt\s?nam|vietnam(?:ese)?|вьетнам/iu },
  { code: "mn", pattern: /몽골|mongolia(?:n)?|монгол/iu },
  { code: "uz", pattern: /우즈베키스탄|uzbekistan|узбекистан|o['']zbekiston/iu },
  { code: "kz", pattern: /카자흐스탄|kazakhstan|казахстан/iu },
  { code: "cn", pattern: /중국|china|chinese|trung\s?quốc|хятад/iu },
  { code: "np", pattern: /네팔|nepal(?:i)?/iu },
  { code: "id", pattern: /인도네시아|indonesia(?:n)?/iu },
  { code: "ph", pattern: /필리핀|philippin(?:es|o)|филиппин/iu },
  { code: "th", pattern: /태국|thailand|thai\b/iu },
  { code: "mm", pattern: /미얀마|myanmar|burma/iu },
  { code: "bd", pattern: /방글라데시|bangladesh(?:i)?/iu },
  { code: "in", pattern: /인도(?!네시아)|(?<!s)india(?:n)?\b/iu },
  { code: "ru", pattern: /러시아|russia(?:n)?|россия|орос/iu },
];

// A nationality statement, not a mere topic mention ("베트남 유학생 통계" should not match).
const NATIONALITY_CONTEXT = /(사람|국적|출신|에서\s?왔|입니다|이에요|người|quốc tịch|хүн|иргэн|citizen|nationality|i\s?am\s?from|i'm\s?from|come\s?from)/iu;
// The context marker must be near the country term, not merely anywhere in the
// text ("베트남 유학생이 ... 제 국적으로도" is a topic mention, not a nationality claim).
const NATIONALITY_CONTEXT_RADIUS = 12;

const CURRENT_VISA_CONTEXT = /(연장|갱신|현재|지금|소지|가지고\s?있|다니|체류\s?중|로\s?체류|gia\s?hạn|hiện\s?tại|đang\s?(?:có|học|ở)|сунгах|одоо|байгаа|extend|renew|currently|i\s?have|i'm\s?on|holding)/iu;
const TARGET_VISA_CONTEXT = /(변경|바꾸|전환|목표|준비|취득|신청하려|받으려|chuyển|đổi\s?sang|mục\s?tiêu|chuẩn\s?bị|шилжих|солих|бэлтгэ|change\s?to|switch(?:ing)?\s?to|apply\s?for|planning|preparing|want\s?to\s?get)/iu;
// A "source" marker (ko postposition 에서/부터, en "from", vi "từ") immediately
// attached to a code means that code is where the user is coming FROM, i.e.
// currentVisa — the highest-precedence signal, checked before current/target/bare.
const SOURCE_VISA_SUFFIX_CONTEXT = /^\s?(에서부터|에서|부터)/iu;
const SOURCE_VISA_PREFIX_CONTEXT = /(from|từ)\s*$/iu;
const SOURCE_VISA_ADJACENCY_RADIUS = 8;

const STUDY_STAGE_PATTERNS: Array<{ stage: SessionProfileStudyStage; pattern: RegExp }> = [
  { stage: "graduate", pattern: /대학원|석사|박사|thạc\s?sĩ|tiến\s?sĩ|cao\s?học|магистр|доктор|graduate\s?school|master(?:'s)?|phd|doctoral/iu },
  { stage: "undergraduate", pattern: /학부|학사|대학교?\s?(입학|진학|지원)|đại\s?học|cử\s?nhân|бакалавр|их\s?сургууль|undergraduate|bachelor/iu },
  { stage: "language", pattern: /어학당|어학원|어학연수|한국어\s?연수|trường\s?tiếng|khóa\s?tiếng|хэлний\s?(бэлтгэл|сургалт)|language\s?(school|course|program)/iu },
];
// A stage mentioned only as a future/hypothetical plan (나중/계획/생각중/...) must
// not override a different stage the user asserts as current/ongoing (중/현재/다니).
const STUDY_FUTURE_CONTEXT = /(나중|계획|예정|생각\s?중|하려고|하고\s?싶|싶어)/iu;
const STUDY_FUTURE_CONTEXT_GLOBAL = /(나중|계획|예정|생각\s?중|하려고|하고\s?싶|싶어)/giu;
const STUDY_ONGOING_CONTEXT = /(중|현재|지금|다니)/iu;
const STUDY_STAGE_CONTEXT_RADIUS = 10;

function questionVisaCodes(question: string) {
  return Array.from(new Set(
    (question.match(VISA_CODE_PATTERN) || []).map(normalizeVisaCode).filter(Boolean),
  ));
}

function codeIndex(compact: string, code: string) {
  return compact.toUpperCase().replace(/-/g, " ").indexOf(code.replace(/-/g, " "));
}

function contextWindow(question: string, code: string) {
  const compact = question.replace(/\s+/g, " ");
  const index = codeIndex(compact, code);
  if (index < 0) return compact;
  // Narrow window: with two codes in one sentence ("D-4로 다니는데 D-2로 변경"),
  // a wide window lets the other code's cue leak in and misclassify.
  return compact.slice(Math.max(0, index - 24), index + code.length + 24);
}

// Is this specific code immediately preceded/followed by a "coming from" marker?
// Checked on a tight adjacency window so the other code's own markers in the
// same sentence cannot leak in.
function isSourceVisaCode(question: string, code: string) {
  const compact = question.replace(/\s+/g, " ");
  const index = codeIndex(compact, code);
  if (index < 0) return false;
  const before = compact.slice(Math.max(0, index - SOURCE_VISA_ADJACENCY_RADIUS), index);
  const after = compact.slice(index + code.length, index + code.length + SOURCE_VISA_ADJACENCY_RADIUS);
  return SOURCE_VISA_SUFFIX_CONTEXT.test(after) || SOURCE_VISA_PREFIX_CONTEXT.test(before);
}

function findNationality(text: string): string | undefined {
  for (const entry of NATIONALITY_PATTERNS) {
    const match = entry.pattern.exec(text);
    if (!match) continue;
    const start = match.index;
    const end = start + match[0].length;
    const window = text.slice(
      Math.max(0, start - NATIONALITY_CONTEXT_RADIUS),
      end + NATIONALITY_CONTEXT_RADIUS,
    );
    if (NATIONALITY_CONTEXT.test(window)) return entry.code;
  }
  return undefined;
}

function findStudyStage(text: string): SessionProfileStudyStage | undefined {
  const candidates = STUDY_STAGE_PATTERNS.flatMap((entry) => {
    const match = entry.pattern.exec(text);
    if (!match) return [];
    const start = match.index;
    const end = start + match[0].length;
    // Forward-only window: starting the slice at the match itself (not before)
    // keeps a preceding, unrelated stage's own ongoing marker (e.g. another
    // stage's "중" a few characters earlier in the sentence) from leaking in.
    const window = text.slice(start, end + STUDY_STAGE_CONTEXT_RADIUS);
    const hasFuture = STUDY_FUTURE_CONTEXT.test(window);
    // Strip future-plan phrases (e.g. "생각중" itself ends in 중) before testing
    // for an ongoing marker, so the future phrase's own trailing 중 cannot be
    // mistaken for a separate ongoing cue.
    const hasOngoing = STUDY_ONGOING_CONTEXT.test(window.replace(STUDY_FUTURE_CONTEXT_GLOBAL, " "));
    return [{ stage: entry.stage, hasFuture, hasOngoing }];
  });
  const chosen = candidates.find((candidate) => candidate.hasOngoing)
    || candidates.find((candidate) => !candidate.hasFuture)
    || candidates[0];
  return chosen?.stage;
}

export function extractProfileSignals(
  question: string,
  _locale: SessionProfileLocale,
): SessionProfileSignals {
  const text = question.normalize("NFKC");
  const signals: SessionProfileSignals = {};

  const nationality = findNationality(text);
  if (nationality) signals.nationality = nationality;

  for (const code of questionVisaCodes(text)) {
    const window = contextWindow(text, code);
    // SOURCE markers ("D-4에서", "from D-4") have the highest precedence: they
    // unambiguously mark the code the user is moving away from.
    if (isSourceVisaCode(text, code) && !signals.currentVisa) {
      signals.currentVisa = code;
    } else if (CURRENT_VISA_CONTEXT.test(window) && !signals.currentVisa) {
      // CURRENT cues are checked next: holding/attending/extending verbs are
      // stronger evidence than change/preparation verbs that may belong to the
      // other code in the same sentence.
      signals.currentVisa = code;
    } else if (TARGET_VISA_CONTEXT.test(window) && !signals.targetVisa) {
      signals.targetVisa = code;
    } else if (!signals.targetVisa) {
      // Bare fallback: once currentVisa is already resolved (e.g. via a source
      // marker), any other code in the sentence is the destination.
      signals.targetVisa = code;
    }
  }

  const stage = findStudyStage(text);
  if (stage) signals.studyStage = stage;

  return signals;
}

function cleanSignal(key: SessionProfileFieldKey, value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  if (key === "nationality") {
    const code = value.trim().toLowerCase();
    return /^[a-z]{2}$/.test(code) ? code : undefined;
  }
  if (key === "currentVisa" || key === "targetVisa") {
    return normalizeVisaCode(value) || undefined;
  }
  return STUDY_STAGES.includes(value as SessionProfileStudyStage) ? value : undefined;
}

const FIELD_KEYS: SessionProfileFieldKey[] = ["nationality", "currentVisa", "targetVisa", "studyStage"];

function applySessionProfileSignals(
  prev: SessionProfile,
  signals: SessionProfileSignals,
  turn: number,
  source: SessionProfileSource,
  fillOnly: boolean,
): SessionProfile {
  const next: SessionProfile = {
    version: PROFILE_VERSION,
    nationality: prev.nationality,
    currentVisa: prev.currentVisa,
    targetVisa: prev.targetVisa,
    studyStage: prev.studyStage,
    fields: { ...(prev.fields || {}) },
  };
  for (const key of FIELD_KEYS) {
    if (fillOnly && next[key]) continue;
    const value = cleanSignal(key, (signals as Record<string, unknown>)[key]);
    if (!value) continue;
    if (key === "studyStage") next.studyStage = value as SessionProfileStudyStage;
    else next[key] = value;
    next.fields = { ...(next.fields || {}), [key]: { turn, source } };
  }
  return next;
}

export function mergeSessionProfile(
  prev: SessionProfile,
  signals: SessionProfileSignals,
  turn: number,
  source: SessionProfileSource,
): SessionProfile {
  return applySessionProfileSignals(prev, signals, turn, source, false);
}

// Like mergeSessionProfile, but never overwrites a field prev already has a
// truthy value for. Used to apply mediation signals so they only fill gaps the
// deterministic pass missed, never overwrite what it already set this turn.
export function fillSessionProfile(
  prev: SessionProfile,
  signals: SessionProfileSignals,
  turn: number,
  source: SessionProfileSource,
): SessionProfile {
  return applySessionProfileSignals(prev, signals, turn, source, true);
}

export function parseSessionProfile(value: unknown): SessionProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { version: PROFILE_VERSION };
  }
  const record = value as Record<string, unknown>;
  if (record.version !== PROFILE_VERSION) return { version: PROFILE_VERSION };
  return mergeSessionProfile(
    { version: PROFILE_VERSION },
    {
      nationality: record.nationality as string,
      currentVisa: record.currentVisa as string,
      targetVisa: record.targetVisa as string,
      studyStage: record.studyStage as SessionProfileStudyStage,
    },
    0,
    "deterministic",
  );
}

export function profileVisaCodes(profile: SessionProfile): string[] {
  return Array.from(new Set([profile.currentVisa, profile.targetVisa].filter(
    (code): code is string => Boolean(code),
  )));
}

export function hasProfileFacts(profile: SessionProfile): boolean {
  return FIELD_KEYS.some((key) => Boolean(profile[key]));
}

export function profilePromptBlock(profile: SessionProfile): string {
  if (!hasProfileFacts(profile)) return "No stored user profile.";
  const parts: string[] = [];
  if (profile.nationality) parts.push(`nationality=${profile.nationality}`);
  if (profile.currentVisa) parts.push(`currentVisa=${profile.currentVisa}`);
  if (profile.targetVisa) parts.push(`targetVisa=${profile.targetVisa}`);
  if (profile.studyStage) parts.push(`studyStage=${profile.studyStage}`);
  return parts.join(", ");
}
