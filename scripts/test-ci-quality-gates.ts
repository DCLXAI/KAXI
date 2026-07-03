import { readFileSync } from "fs";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): void {
  if (!condition) fail(message);
}

type PackageJson = {
  scripts?: Record<string, string>;
};

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as PackageJson;
const scripts = packageJson.scripts || {};
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

function collectReferencedScripts(scriptName: string, seen = new Set<string>()): Set<string> {
  if (seen.has(scriptName)) return seen;
  seen.add(scriptName);

  const command = scripts[scriptName] || "";
  for (const match of command.matchAll(/\bbun\s+run\s+([A-Za-z0-9:_-]+)/g)) {
    collectReferencedScripts(match[1], seen);
  }
  return seen;
}

for (const required of ["ci:types", "ci:domain", "ci:ops", "ci"]) {
  assert(scripts[required], `missing CI profile script: ${required}`);
}

const ciReferences = collectReferencedScripts("ci");
const excludedFromFullCi = new Set([
  // Browser E2E is intentionally separate; CI still type-checks e2e fixtures through test:e2e:types.
  "test:e2e",
]);

const testScripts = Object.keys(scripts)
  .filter((name) => name.startsWith("test:"))
  .filter((name) => !excludedFromFullCi.has(name))
  .sort();

for (const testScript of testScripts) {
  assert(ciReferences.has(testScript), `${testScript} is not reachable from bun run ci`);
}

for (const profile of ["ci:types", "ci:domain", "ci:ops"]) {
  assert(
    workflow.includes(`bun run ${profile}`),
    `.github/workflows/ci.yml should call bun run ${profile} instead of duplicating its test list`
  );
}

console.log(`PASS CI quality gates: ${testScripts.length} test scripts covered by bun run ci`);
