import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LANGS, t, type Lang } from "../src/lib/i18n/translations";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const messagesDir = join(root, "messages");

function messagesFor(locale: Lang): Record<string, string> {
  return Object.fromEntries(
    Object.entries(t).map(([key, value]) => {
      const translations = value as Record<Lang, string>;
      return [
      key,
      translations[locale] ?? translations.en ?? translations.ko ?? key,
      ];
    }),
  );
}

await mkdir(messagesDir, { recursive: true });

for (const { code } of LANGS) {
  const file = join(messagesDir, `${code}.json`);
  await writeFile(file, `${JSON.stringify(messagesFor(code), null, 2)}\n`, "utf8");
  console.log(`wrote ${file}`);
}
