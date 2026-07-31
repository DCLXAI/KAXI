import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { DIAGNOSIS_DOC_KEYS, DIAGNOSIS_GOALS, DIAGNOSIS_PATH_KEYS } from "../src/lib/data/diagnosis";
import { PARTNER_TYPES } from "../src/lib/partners/types";
import { documentLabel, goalLabel, partnerLabel, pathLabel } from "../src/components/admin-leads/i18n";
import { t as MESSAGES } from "../src/lib/i18n/translations";

// The admin lead inbox resolves each stored value through an allowlist, and
// anything outside it renders the FALLBACK label — silently, with no warning.
// Three domains had outgrown their allowlist:
//
//   goal  in_korea_job / in_korea_employment    -> "not sure"
//   path  goal_in_korea_d10 / goal_in_korea_e7  -> "Korean language study"
//   docs  nine D-10 and E-7 document keys       -> "passport", on every badge
//
// So an E-7 lead — the highest-intent answer the wizard offers — appeared in the
// operator's queue as an undecided language student whose only required document
// was a passport. Wrong labels, not missing ones, which is why nobody noticed.
//
// The allowlists are now derived from the same constants the diagnosis engine
// and the partner write path use. This suite pins the property that actually
// matters and is NOT tautological: every value in each domain must resolve to
// its OWN key, and that key must exist as a translation. Adding a domain value
// without adding its translation fails here rather than shipping a fallback.

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

// Identity translator: whatever key the label function chose comes straight
// back, so the fallback is directly observable.
const echo = (key: string) => key;

const translations = MESSAGES as Record<string, unknown>;

interface Domain {
  name: string;
  values: readonly string[];
  keyFor: (value: string) => string;
  label: (value: string) => string;
  fallback: string;
}

const DOMAINS: Domain[] = [
  {
    name: "goal",
    values: DIAGNOSIS_GOALS,
    keyFor: (goal) => `goal_${goal}`,
    label: (goal) => goalLabel(echo, goal),
    fallback: "goal_unsure",
  },
  {
    name: "pathKey",
    values: DIAGNOSIS_PATH_KEYS,
    keyFor: (pathKey) => pathKey,
    label: (pathKey) => pathLabel(echo, pathKey),
    fallback: "goal_language",
  },
  {
    name: "requiredDoc",
    values: DIAGNOSIS_DOC_KEYS,
    keyFor: (key) => key,
    label: (key) => documentLabel(echo, key),
    fallback: "docs_doc_passport",
  },
  {
    name: "partnerType",
    values: [...PARTNER_TYPES] as string[],
    keyFor: (type) => `partner_${type}`,
    label: (type) => partnerLabel(echo, type),
    fallback: "partner_admin",
  },
];

assertOk(DOMAINS.every((domain) => domain.values.length > 0), "every domain must be non-empty — an empty import means the constant moved");

for (const domain of DOMAINS) {
  for (const value of domain.values) {
    const expected = domain.keyFor(value);
    const rendered = domain.label(value);

    assertOk(
      rendered === expected,
      `${domain.name} "${value}" renders "${rendered}" instead of "${expected}" — it is outside the label allowlist, so the operator sees the "${domain.fallback}" label for it`,
    );

    assertOk(
      expected in translations,
      `${domain.name} "${value}" needs translation key "${expected}", which does not exist in translations.ts — it would render the raw key`,
    );
  }
}

console.log(
  `PASS admin lead labels: ${DOMAINS.map((d) => `${d.values.length} ${d.name}`).join(", ")} all resolve to their own translated label`,
);

// Path keys are their own namespace. They used to be checked against the goal
// allowlist, which only worked because four PATH_PROFILES entries happen to be
// named after goals — the two that are not fell through to language study.
{
  assertOk(
    DIAGNOSIS_PATH_KEYS.includes("goal_in_korea_e7"),
    "the E-7 path key must still exist — this suite is pinning its label",
  );
  assertOk(
    pathLabel(echo, "goal_in_korea_e7") === "goal_in_korea_e7",
    "the E-7 path must not render the language-study label",
  );

  // A goal key that is not a path must not be accepted as one, and vice versa:
  // the two namespaces overlap only by naming coincidence.
  assertOk(
    !DIAGNOSIS_PATH_KEYS.includes("goal_unsure"),
    "goal_unsure is a goal, not a path — if it becomes a path this assertion should be revisited",
  );
  assertOk(
    pathLabel(echo, "goal_unsure") === "goal_language",
    "a non-path key must still fall back rather than be treated as a path",
  );
}

// Unknown values keep falling back rather than rendering a raw key at an
// operator. This is unchanged behaviour, pinned so the derivation above cannot
// accidentally turn the allowlists into a pass-through.
for (const domain of DOMAINS) {
  const rendered = domain.label("kaxi_not_a_real_value");
  assertOk(
    rendered === domain.fallback,
    `${domain.name} must still fall back to "${domain.fallback}" for an unknown value, got "${rendered}"`,
  );
}

console.log("PASS admin lead labels: path keys stay their own namespace and unknown values still fall back");

// Deriving the allowlists is only worth anything if the domain itself has one
// definition. The goal list had FIVE hand-written copies — diagnosis-options.ts,
// the diagnosis API's z.enum, the agent tool's JSON schema, the agent tool's
// argument parser, and the union on DiagnosisInput — none of them exhaustiveness
// checked, since `satisfies readonly DiagnosisInput["goal"][]` only proves a
// subset. They all point at DIAGNOSIS_GOALS now; keep it that way.
{
  const { GOAL_VALUES } = await import("../src/components/diagnosis/diagnosis-options");
  assertOk(
    GOAL_VALUES === (DIAGNOSIS_GOALS as readonly string[]),
    "GOAL_VALUES must be DIAGNOSIS_GOALS itself, not a copy of it",
  );

  const goalListPattern = new RegExp(
    DIAGNOSIS_GOALS.map((goal) => `"${goal}"`).join(",\\s*"),
  );
  const offenders = sourceFiles("src").filter((file) => {
    if (file === "src/lib/data/diagnosis.ts") return false; // the one definition
    return goalListPattern.test(readFileSync(file, "utf8"));
  });
  assertOk(
    offenders.length === 0,
    `these files restate the goal list instead of importing DIAGNOSIS_GOALS: ${offenders.join(", ")}`,
  );
}

console.log("PASS admin lead labels: the goal domain has exactly one definition");
