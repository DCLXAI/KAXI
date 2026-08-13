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
const testManifest = JSON.parse(readFileSync("quality/test-manifest.json", "utf8")) as {
  schemaVersion?: number;
  suites?: Record<string, string[]>;
};

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

const testScripts = Object.keys(scripts)
  .filter((name) => name.startsWith("test:"))
  .sort();
const requiredSuites = ["types", "domain", "ops", "integration", "e2e", "performance"];
assert(testManifest.schemaVersion === 1, "test manifest schemaVersion must be 1");
for (const suite of requiredSuites) {
  assert((testManifest.suites?.[suite]?.length || 0) > 0, `test manifest is missing suite: ${suite}`);
}
const manifestReferences = new Set<string>();
for (const [suite, commands] of Object.entries(testManifest.suites || {})) {
  for (const command of commands) {
    assert(Boolean(scripts[command]), `test manifest ${suite} references missing package script: ${command}`);
    for (const referenced of collectReferencedScripts(command)) manifestReferences.add(referenced);
  }
}
for (const testScript of testScripts) {
  assert(manifestReferences.has(testScript), `${testScript} is not assigned to any test manifest suite`);
}
assert(workflow.includes("matrix:") && workflow.includes("suite: [types, domain, ops, integration, performance]"),
  "CI must run independent non-browser suites as a parallel matrix");
assert(workflow.includes("bun run ci:suite -- ${{ matrix.suite }}"), "CI matrix must execute the standard manifest runner");
assert(workflow.includes("bun run ci:suite -- e2e"), "CI must execute the e2e manifest suite");
assert(workflow.includes("actions/upload-artifact"), "CI must upload suite, bundle and trace artifacts");

for (const required of [
  "release:check:source",
  "release:check:backend",
  "release:check:typebot",
  "ops:check:schema-parity",
  "ops:check:rollout-readiness",
]) {
  assert(scripts[required], `missing release gate script: ${required}`);
}
assert(
  !deploymentWorkflow.includes("workflow_run:"),
  "production release must never start automatically after a main CI run",
);
assert(
  deploymentWorkflow.includes("workflow_dispatch:") && deploymentWorkflow.includes("operation:"),
  "production release must be manually dispatched with an explicit operation",
);
assert(
  deploymentWorkflow.includes("environment: production") && deploymentWorkflow.includes("deployment_authorized"),
  "production deploy must require the protected production environment and an explicit authorization input",
);
assert(
  deploymentWorkflow.includes("bun --env-file=\"$PRODUCTION_ENV_FILE\" run ops:check:rollout-readiness"),
  "production deploy must pass the value-redacting rollout preflight before build, migration or deployment",
);
assert(
  deploymentWorkflow.includes("inputs.operation == 'verify'") && deploymentWorkflow.includes("ops:check:schema-parity"),
  "production release must provide a read-only migration and schema verification operation",
);
assert(
  deploymentWorkflow.includes("EXPECTED_SHA: ${{ inputs.source_commit }}"),
  "production release must checkout and verify the manually approved source SHA",
);

function deploymentStep(name: string): string {
  const marker = `      - name: ${name}`;
  const start = deploymentWorkflow.indexOf(marker);
  assert(start >= 0, `production release is missing step: ${name}`);
  const next = deploymentWorkflow.indexOf("\n      - name:", start + marker.length);
  return deploymentWorkflow.slice(start, next >= 0 ? next : undefined);
}

for (const stepName of [
  "Run fail-closed production rollout preflight",
  "Check RAG serving projection drift",
  "Build with Vercel",
  "Apply PostgreSQL migrations",
  "Verify post-migration schema parity",
  "Deploy production canary without assigning domains",
  "Verify production canary end to end",
  "Promote verified canary to production domains",
]) {
  assert(
    deploymentStep(stepName).includes("if: ${{ inputs.operation == 'deploy' }}"),
    `${stepName} must run only for an explicitly selected deploy operation`,
  );
}
assert(
  deploymentStep("Verify applied production schema").includes("if: ${{ inputs.operation == 'verify' }}"),
  "read-only schema verification must run only for the verify operation",
);
const preflightIndex = deploymentWorkflow.indexOf("- name: Run fail-closed production rollout preflight");
for (const stepName of ["Build with Vercel", "Apply PostgreSQL migrations", "Deploy production canary without assigning domains"]) {
  assert(
    deploymentWorkflow.indexOf(`- name: ${stepName}`) > preflightIndex,
    `${stepName} must remain after the fail-closed rollout preflight`,
  );
}
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

// Everything above only matters if the gated workflow is the ONLY way code reaches
// production. It was not: Vercel's Git integration deploys every push to main on
// its own, and on 2026-07-30 it put 42fe6cb live while this workflow's canary step
// was failing — migrations, drift check, canary readiness and the Agent/Consult
// smoke tests all skipped, with a red run to look at. vercel.json now turns that
// trigger off for main only, so unspecified branches keep their PR previews.
{
  const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8")) as {
    git?: { deploymentEnabled?: boolean | Record<string, boolean> };
  };
  const deploymentEnabled = vercelConfig.git?.deploymentEnabled;
  const mainDisabled =
    deploymentEnabled === false ||
    (typeof deploymentEnabled === "object" && deploymentEnabled !== null && deploymentEnabled.main === false);
  assert(
    mainDisabled,
    "vercel.json must set git.deploymentEnabled.main = false — otherwise a push to main deploys to production without the migration, drift and canary gates in this workflow",
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

console.log(`PASS CI quality gates: ${testScripts.length} test scripts assigned across ${requiredSuites.length} manifest suites`);
