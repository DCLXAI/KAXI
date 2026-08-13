import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Manifest = {
  schemaVersion: 1;
  suites: Record<string, string[]>;
};

function xml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const manifest = JSON.parse(readFileSync("quality/test-manifest.json", "utf8")) as Manifest;
if (manifest.schemaVersion !== 1) throw new Error("TEST_MANIFEST_VERSION_UNSUPPORTED");
const suite = process.argv[2];
if (!suite || !manifest.suites[suite]) {
  throw new Error(`Usage: bun run scripts/run-test-suite.ts <${Object.keys(manifest.suites).join("|")}>`);
}

const outputDirectory = join(process.cwd(), "artifacts", "test-results");
mkdirSync(outputDirectory, { recursive: true });
const cases: Array<{ name: string; seconds: number; status: number; output: string }> = [];

for (const script of manifest.suites[suite]) {
  const startedAt = performance.now();
  const result = spawnSync("bun", ["run", script], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  process.stdout.write(output);
  cases.push({
    name: script,
    seconds: (performance.now() - startedAt) / 1_000,
    status: result.status ?? 1,
    output,
  });
  if (result.status !== 0) break;
}

const failures = cases.filter((item) => item.status !== 0).length;
const duration = cases.reduce((total, item) => total + item.seconds, 0);
const report = [
  "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
  `<testsuite name="${xml(suite)}" tests="${cases.length}" failures="${failures}" time="${duration.toFixed(3)}">`,
  ...cases.map((item) => [
    `  <testcase classname="kaxi.${xml(suite)}" name="${xml(item.name)}" time="${item.seconds.toFixed(3)}">`,
    item.status === 0 ? "" : `    <failure message="exit ${item.status}">${xml(item.output.slice(-20_000))}</failure>`,
    `    <system-out>${xml(item.output.slice(-50_000))}</system-out>`,
    "  </testcase>",
  ].filter(Boolean).join("\n")),
  "</testsuite>",
  "",
].join("\n");
writeFileSync(join(outputDirectory, `${suite}.xml`), report, "utf8");
writeFileSync(join(outputDirectory, `${suite}.log`), cases.map((item) => item.output).join("\n"), "utf8");

if (failures > 0) process.exit(1);
console.log(`PASS ${suite} suite: ${cases.length} manifest command(s), JUnit report written`);
