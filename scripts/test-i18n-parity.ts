import { readFileSync } from "fs";

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
