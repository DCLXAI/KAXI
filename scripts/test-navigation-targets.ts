import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { VIEW_KEYS } from "../src/lib/kbridge/views";

// Two navigation bugs shipped to production undetected because nothing checked
// where our own links point:
//
//   1. localePath(locale, "/student") produced /ko/student — but /student and
//      /login live OUTSIDE app/[locale], so both CTAs on the chat escalation
//      card 404'd for every user.
//   2. onNavigate("consult") — "consult" is not a ViewKey, and viewToPath()
//      silently falls back to "/", so the post-diagnosis conversion CTA sent
//      users to the landing page.
//
// Both are invisible to types (plain strings) and to the build. Pin them here.

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx") || full.endsWith(".ts")) out.push(full);
  }
  return out;
}

const sourceFiles = walk("src");

// --- 1. localePath() must only be handed routes that exist under app/[locale].
const localeSegments = new Set(
  readdirSync("src/app/[locale]", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name),
);

for (const file of sourceFiles) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/localePath\(\s*[A-Za-z0-9_.]+\s*,\s*"(\/[a-z0-9-]*)"/g)) {
    const route = match[1];
    if (route === "/") continue;
    const segment = route.slice(1).split("/")[0];
    assert(
      localeSegments.has(segment),
      `${file} calls localePath() with "${route}", but src/app/[locale]/${segment} does not exist — the link would 404`,
    );
  }
}

// --- 2. onNavigate() only accepts view keys; anything else lands on "/".
const viewKeys = new Set<string>(VIEW_KEYS);

for (const file of sourceFiles) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/onNavigate\(\s*"([a-z0-9-]+)"\s*\)/g)) {
    const view = match[1];
    assert(
      viewKeys.has(view),
      `${file} calls onNavigate("${view}"), which is not a ViewKey — viewToPath() would silently send the user to the landing page`,
    );
  }
}

// --- 3. Every rendered /login link carries the language, because the auth form
// falls back to Korean without it. Only href literals are checked: server
// redirects build the URL object first and set lang on it separately. Admin
// surfaces are Korean-only by design and exempt.
const loginHrefPattern = /href=(?:"|\{`)\/login(\?[^"`]*)?(?:"|`\})/g;

for (const file of sourceFiles) {
  if (file.includes("/admin")) continue;
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(loginHrefPattern)) {
    const query = match[1] || "";
    assert(
      query.includes("lang="),
      `${file} renders an href to /login without a lang param — a non-Korean user would get a Korean auth screen (use loginHref())`,
    );
  }
}

console.log(
  `PASS navigation targets: localePath routes exist, ${viewKeys.size} view keys pinned, /login links carry locale`,
);

// robots.txt was a static file in public/, so the karxy.com cutover left its
// Sitemap line on kaxi.vercel.app while sitemap.xml itself emitted karxy.com —
// crawlers were handed the old host for weeks. Both must come from the one
// helper, and no route may hardcode a site host again.
{
  assert(
    !existsSync("public/robots.txt"),
    "public/robots.txt must not come back — a static file cannot follow a domain cutover"
  );
  for (const route of ["src/app/robots.ts", "src/app/sitemap.ts"]) {
    const source = readFileSync(route, "utf8");
    assert(
      /siteBaseUrl\(\)/.test(source),
      `${route} must build its URLs from siteBaseUrl() so they cannot drift apart`
    );
    assert(
      !/https:\/\/(kaxi\.vercel\.app|karxy\.com)/.test(source),
      `${route} must not hardcode a site host — that is exactly what drifted`
    );
  }
}

console.log("PASS crawler routes build their host from siteBaseUrl()");
