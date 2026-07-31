import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { DIAGNOSIS_DOC_KEYS, DIAGNOSIS_GOALS, DIAGNOSIS_PATH_KEYS } from "../src/lib/data/diagnosis";
import { PARTNER_TYPES } from "../src/lib/partners/types";
import { ANONYMOUS_LEAD_PLACEHOLDER } from "../src/lib/partners/anonymous-lead";
import { documentLabel, goalLabel, partnerLabel, pathLabel } from "../src/components/admin-leads/i18n";
import { hasNoDiagnosis } from "../src/components/admin-leads/lead-record";
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
//
// The second half of the suite pins the class underneath that one: the FALLBACKS
// themselves used to be real answers, so values that are not wizard answers at
// all — "" and the stub rows' "unknown" — were rendered as somebody's deliberate
// choice rather than as absent data. See "absent data never borrows a real
// answer's label" below.

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
    fallback: "goal_unrecognized",
  },
  {
    name: "pathKey",
    values: DIAGNOSIS_PATH_KEYS,
    keyFor: (pathKey) => pathKey,
    label: (pathKey) => pathLabel(echo, pathKey),
    fallback: "path_unrecognized",
  },
  {
    name: "requiredDoc",
    values: DIAGNOSIS_DOC_KEYS,
    keyFor: (key) => key,
    label: (key) => documentLabel(echo, key),
    fallback: "docs_doc_unrecognized",
  },
  {
    name: "partnerType",
    values: [...PARTNER_TYPES] as string[],
    keyFor: (type) => `partner_${type}`,
    label: (type) => partnerLabel(echo, type),
    fallback: "partner_unrecognized",
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
    pathLabel(echo, "goal_unsure") === "path_unrecognized",
    "a non-path key must still fall back rather than be treated as a path",
  );
}

// Unknown values keep falling back rather than rendering a raw key at an
// operator, every fallback resolves to a real translation — and, the property
// that actually protects the operator, NO FALLBACK IS A MEMBER OF ITS OWN
// DOMAIN. All four used to be:
//
//   goal      -> goal_unsure         "잘 모름", an answer the wizard offers
//   pathKey   -> goal_language       D-4 한국어 연수, a path the engine recommends
//   doc       -> docs_doc_passport   여권, on every unrecognized badge
//   partner   -> partner_admin       행정사
//
// so a value with no legitimate label was handed somebody else's and rendered as
// indistinguishable from the real thing. Checked against the domain constants
// themselves, so re-pointing any fallback at a real value fails here.
for (const domain of DOMAINS) {
  const rendered = domain.label("kaxi_not_a_real_value");
  assertOk(
    rendered === domain.fallback,
    `${domain.name} must still fall back to "${domain.fallback}" for an unknown value, got "${rendered}"`,
  );
  assertOk(
    domain.fallback in translations,
    `${domain.name} falls back to "${domain.fallback}", which does not exist in translations.ts`,
  );
  assertOk(
    !domain.values.map(domain.keyFor).includes(domain.fallback),
    `${domain.name} falls back to "${domain.fallback}", which is a real ${domain.name} — an unlabelled value would be shown to the operator as that answer instead of as an unknown one`,
  );
}

console.log("PASS admin lead labels: path keys stay their own namespace, and no fallback is a real answer");

// Falling back is not enough on its own: the goal and path fallbacks USED to be
// goal_unsure ("잘 모름") and goal_language (D-4 한국어 연수), which are answers
// the wizard offers. That is the defect underneath the allowlist drift PR #71
// fixed. Drift hands a value the WRONG label; this hands a value with no
// legitimate label SOMEBODY ELSE'S, so absent data was displayed as a deliberate
// answer and the operator had no way to tell them apart.
//
// Two such values reach the label functions today and neither is a wizard
// answer: "" (POST /api/leads validates goal as z.string().optional().default(""))
// and ANONYMOUS_LEAD_PLACEHOLDER (written into goal and pathKey on the stub rows
// createAnonymousLead() creates for partner requests with no saved diagnosis).
{
  const goals: readonly string[] = DIAGNOSIS_GOALS;

  assertOk(
    !goals.includes(ANONYMOUS_LEAD_PLACEHOLDER) && !DIAGNOSIS_PATH_KEYS.includes(ANONYMOUS_LEAD_PLACEHOLDER),
    `"${ANONYMOUS_LEAD_PLACEHOLDER}" must not be a wizard goal or a real path — if it becomes one, the stub rows need a different sentinel`,
  );

  // Absent data reads as absent, in both columns.
  for (const value of ["", ANONYMOUS_LEAD_PLACEHOLDER]) {
    const rendered = goalLabel(echo, value);
    assertOk(
      rendered === "goal_not_recorded",
      `a lead with goal ${JSON.stringify(value)} recorded no goal, but renders "${rendered}" — the operator sees an answer nobody gave`,
    );
  }
  assertOk(
    pathLabel(echo, ANONYMOUS_LEAD_PLACEHOLDER) === "path_not_recorded",
    "a stub lead has no recommended path, so its path column must not render a real one",
  );

  // ...and is still distinguishable from a user who deliberately answered
  // "잘 모름", which is the whole point of not reusing goal_unsure.
  assertOk(
    goalLabel(echo, "unsure") === "goal_unsure",
    "an explicit \"not sure\" answer must keep its own label",
  );

  // An arbitrary garbage value renders as neither. It cannot be labelled as a
  // real answer (that was the bug) and must not be labelled as absent data
  // either, because it is a drift/corruption signal, not an empty field.
  for (const garbage of ["kaxi_not_a_real_value", "unsure_", "goal_unsure", "미확인"]) {
    assertOk(
      goalLabel(echo, garbage) === "goal_unrecognized",
      `goal ${JSON.stringify(garbage)} is not a wizard answer and not a recorded absence, but renders "${goalLabel(echo, garbage)}"`,
    );
    assertOk(
      pathLabel(echo, garbage) === "path_unrecognized",
      `pathKey ${JSON.stringify(garbage)} is not a real path and not a recorded absence, but renders "${pathLabel(echo, garbage)}"`,
    );
  }

  for (const key of ["goal_not_recorded", "path_not_recorded", "admin_no_diagnosis"]) {
    assertOk(key in translations, `"${key}" does not exist in translations.ts — it would render the raw key at an operator`);
  }
}

console.log("PASS admin lead labels: absent data never borrows a real answer's label");

// The stub rows are structurally different, not just missing one field, so the
// lead table marks the ROW rather than only relabelling its goal cell.
{
  assertOk(
    hasNoDiagnosis({ goal: ANONYMOUS_LEAD_PLACEHOLDER, pathKey: ANONYMOUS_LEAD_PLACEHOLDER }),
    "the stub rows createAnonymousLead() writes must be marked as having no diagnosis",
  );
  assertOk(
    hasNoDiagnosis({ goal: "", pathKey: "" }),
    "a lead with neither a goal nor a path has no diagnosis",
  );
  assertOk(
    !hasNoDiagnosis({ goal: "unsure", pathKey: "goal_language" }),
    "a user who answered \"not sure\" completed the wizard — marking that row would be the same lie in the other direction",
  );
  assertOk(
    !hasNoDiagnosis({ goal: "in_korea_employment", pathKey: "goal_in_korea_e7" }),
    "the highest-intent lead the wizard produces must never be marked as having no diagnosis",
  );
  assertOk(
    !hasNoDiagnosis({ goal: "", pathKey: "goal_in_korea_e7" }),
    "a real recommended path means the diagnosis ran, even if the goal column is empty",
  );

  // The admin side keys off the literal createAnonymousLead() writes, so that
  // literal needs one definition. Restoring the bare "unknown" strings would
  // leave the stub rows unmarked again while every assertion above still passed.
  const repository = readFileSync("src/lib/partners/repository.ts", "utf8");
  assertOk(
    repository.includes("ANONYMOUS_LEAD_PLACEHOLDER") && !repository.includes('"unknown"'),
    'createAnonymousLead() must write ANONYMOUS_LEAD_PLACEHOLDER, not a bare "unknown" literal — the admin lead inbox recognises stub rows by that constant',
  );
}

console.log("PASS admin lead labels: stub leads are marked as rows, real leads are not");

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
