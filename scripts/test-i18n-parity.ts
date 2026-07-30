import { readdirSync, readFileSync } from "fs";
import { join } from "path";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const LOCALES = ["ko", "vi", "mn", "en"] as const;

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object" && !Array.isArray(v)
      ? flattenKeys(v as Record<string, unknown>, key)
      : [key];
  });
}

const keysByLocale = new Map<string, Set<string>>();
for (const locale of LOCALES) {
  const parsed = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"));
  keysByLocale.set(locale, new Set(flattenKeys(parsed)));
}

const base = keysByLocale.get("ko")!;
let broken = false;
for (const locale of LOCALES.slice(1)) {
  const keys = keysByLocale.get(locale)!;
  const missing = [...base].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !base.has(k));
  if (missing.length || extra.length) {
    broken = true;
    console.error(`LOCALE ${locale}: missing=${missing.slice(0, 10).join(",")} extra=${extra.slice(0, 10).join(",")}`);
  }
}
if (broken) fail("locale message files are out of sync with ko.json");

console.log(`PASS i18n parity: ${base.size} keys aligned across ${LOCALES.join(", ")}`);

// 행정사 is a licensed administrative scrivener, not a lawyer. The product's
// whole position is legal accuracy, and it repeatedly mistranslated its own core
// partner role — including in the corpus document that explains the
// Administrative Scrivener Act. Two manual sweeps each missed live strings, so
// pin it mechanically instead of trusting another read-through.
//
// The allowlist is narrow and each entry has a reason: query-matching lists must
// keep "lawyer"/"luật sư" because that is what users type, and narrowing them
// would only hurt retrieval.
const LAWYER_CLAIM = /lawyer|luật\s*sư|luat\s*su/i;

const LAWYER_ALLOWED_FILES = new Map([
  ["src/lib/agent/intent-keywords.ts", "intent keywords match what users type"],
  ["src/lib/data/synonym-seed.ts", "synonym expansion matches what users type"],
  [
    "src/lib/knowledge/verified-official-sources.ts",
    "village_lawyer is the actual name of the Ministry of Justice programme",
  ],
]);

// knowledge-corpus.ts carries both prose (must not claim lawyer) and retrieval
// keywords (must keep it), so it is filtered per line rather than per file.
const LAWYER_ALLOWED_LINE = /^\s*keywords:/;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

// messages/*.json is generated from translations.ts but is read directly by the
// next-intl surfaces (AdminLeadDetailModal via useTranslations()), so it is live
// text of its own and has to be scanned too — the last sweep fixed the source and
// left the generated copy claiming "Cần luật sư hành chính".
const scanned = [...sourceFiles("src"), ...LOCALES.map((locale) => `messages/${locale}.json`)];

const lawyerClaims: string[] = [];
for (const file of scanned) {
  if (LAWYER_ALLOWED_FILES.has(file)) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (!LAWYER_CLAIM.test(line)) return;
    if (LAWYER_ALLOWED_LINE.test(line)) return;
    lawyerClaims.push(`${file}:${index + 1}  ${line.trim().slice(0, 140)}`);
  });
}

if (lawyerClaims.length > 0) {
  for (const claim of lawyerClaims) console.error(`  ${claim}`);
  fail(
    `${lawyerClaims.length} user-facing string(s) still call 행정사 a lawyer — it is an administrative scrivener (vi: chuyên gia hành chính)`,
  );
}

console.log("PASS i18n parity: no user-facing string calls 행정사 a lawyer");
