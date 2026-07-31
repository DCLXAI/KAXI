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
const deploymentWorkflow = readFileSync(".github/workflows/vercel-production.yml", "utf8");

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

for (const required of ["release:check:source", "release:check:backend", "release:check:typebot"]) {
  assert(scripts[required], `missing release gate script: ${required}`);
}
assert(deploymentWorkflow.includes("workflow_run:"), "production deploy must be triggered from a completed CI workflow");
assert(
  deploymentWorkflow.includes("github.event.workflow_run.conclusion == 'success'"),
  "production deploy must require a successful CI conclusion",
);
assert(
  deploymentWorkflow.includes("github.event.workflow_run.head_sha"),
  "production deploy must checkout and verify the CI-tested SHA",
);
assert(
  deploymentWorkflow.includes("bun run release:check:source"),
  "production deploy must reject a dirty or mismatched source checkout",
);
assert(
  deploymentWorkflow.includes("bun run rag:check:projection"),
  "production deploy must detect RAG serving projection drift before paying for a build and canary",
);
assert(
  deploymentWorkflow.includes("--skip-domain"),
  "production deploy must verify a canary before assigning production domains",
);
assert(
  deploymentWorkflow.includes("bun run release:check:backend"),
  "production deploy must exercise backend readiness before promotion",
);
assert(
  /vercel(@[^\s]+)? promote/.test(deploymentWorkflow),
  "production deploy must promote only after the canary passes",
);

// The workflow ran `bunx vercel`, which resolves whatever is latest on npm at
// that moment, so the release path was exposed to any upstream publish. CLI
// 58.4.0 deployed 0dab19d cleanly; 58.4.4 then failed the very next run — twice,
// identically — inside `deploy --prebuilt --archive=tgz`, on a node_modules path
// outside the prebuilt output. No commit of ours was involved.
{
  // Comment lines are prose, not invocations — the comment above this very
  // assertion quotes `bunx vercel` and would otherwise trip it.
  const executableLines = deploymentWorkflow
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"));

  const unpinned = executableLines.filter((line) => /bunx vercel(?!@)/.test(line));
  assert(
    unpinned.length === 0,
    `production deploy must pin the Vercel CLI — found ${unpinned.length} unpinned "bunx vercel" invocation(s), which resolve to whatever npm publishes next:\n${unpinned.map((line) => `    ${line.trim()}`).join("\n")}`,
  );
  assert(
    /VERCEL_CLI_VERSION:\s*"\d+\.\d+\.\d+"/.test(deploymentWorkflow),
    "the pinned Vercel CLI version must be an exact version, not a range",
  );
}

// The health alert commented on every run, so 17 days of identical "degraded"
// lines buried a real n8n/Typebot outage. It must stay quiet while the failing
// set is unchanged, or the alert is decoration.
const healthAlertWorkflow = readFileSync(".github/workflows/ops-health-alert.yml", "utf8");
assert(
  /Failed checks/.test(healthAlertWorkflow) && /previous/.test(healthAlertWorkflow),
  "the ops health alert must compare the failing checks against the previous notice before commenting again",
);

console.log(`PASS CI quality gates: ${testScripts.length} test scripts covered by bun run ci`);
