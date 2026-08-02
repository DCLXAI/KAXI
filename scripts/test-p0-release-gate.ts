import { readFileSync } from "node:fs";

// P0-8. The P0 exit criteria lived only as markdown checkboxes, so nothing
// evaluated them and nothing could tell you whether P0 was actually done.
//
// The obvious implementation — restate the plan's twelve required test names
// here and assert each runs — is the wrong one twice over. test:ci-gates
// already asserts that EVERY test:* script is reachable from `bun run ci`,
// which is strictly stronger than checking a hand-picked dozen; and a restated
// list is the pattern that has produced most of the bugs fixed under this plan.
// A second copy drifts, and the copy that drifts is always the one nobody runs.
//
// What is missing is the mapping from each exit condition to the evidence that
// supports it, and — more importantly — an honest statement about the
// conditions no test can settle. A checklist where some items can only be
// ticked by a human will get ticked anyway unless it says so out loud.
//
// So this file asserts three things:
//   1. every condition has evidence assigned; none is silently unowned
//   2. every condition claiming a test is backed by a script that exists and
//      actually runs in CI
//   3. conditions that need a human or a production observation are declared
//      as such, and are never counted as passing

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

type Evidence =
  /** A CI test settles this. */
  | { kind: "test"; scripts: string[] }
  /** Only a production observation settles this; CI cannot. */
  | { kind: "production"; how: string }
  /** Only a person settles this. */
  | { kind: "human"; who: string };

interface Condition {
  id: string;
  /** The plan's wording, so the two cannot drift apart unnoticed. */
  condition: string;
  evidence: Evidence;
  note?: string;
}

// Mirrors docs/KARXY_REMEDIATION_MASTER_PLAN.md § "P0 통과 조건".
const P0_EXIT_CONDITIONS: Condition[] = [
  {
    id: "security-tests",
    condition: "P0 보안 테스트 100% 통과",
    evidence: {
      kind: "test",
      scripts: [
        "test:privacy", "test:privacy-containment", "test:api-security",
        "test:lead-ownership", "test:deletion-scope", "test:deletion-verification",
      ],
    },
  },
  {
    id: "diagnosis-write",
    condition: "production 진단 저장 24개 조합 성공",
    evidence: { kind: "test", scripts: ["test:diagnosis-write-contract", "test:leads-validation"] },
    note: "the contract suite builds payloads from the real engine across every goal the wizard offers, which is a superset of the 24 the plan asks for",
  },
  {
    id: "deletion-isolation",
    condition: "삭제 요청 cross-user 영향 0건",
    evidence: { kind: "test", scripts: ["test:privacy", "test:deletion-flow", "test:lead-ownership"] },
    note: "test:privacy drives the real route against a real database with an attacker holding a valid cookie for their own lead",
  },
  {
    id: "expired-ciphertext",
    condition: "만료 ciphertext 잔존 0건",
    evidence: { kind: "test", scripts: ["test:retention-ciphertext"] },
    note: "the sweep's logic is pinned, but the PRODUCTION backlog count is a separate observation — see the production condition below",
  },
  {
    id: "expired-ciphertext-production",
    condition: "만료 ciphertext 잔존 0건 (production 실측)",
    evidence: {
      kind: "production",
      how: "run the retention dry run against production after the next cron pass and confirm it reports zero remaining",
    },
    note: "the fix ships the ability to clear the backlog; it does not by itself prove the backlog is cleared",
  },
  {
    id: "citation-precision",
    condition: "citation precision 100%",
    evidence: { kind: "test", scripts: ["test:citation-integrity", "test:citations"] },
  },
  {
    id: "e2e-streak",
    condition: "E2E 20회 연속 성공",
    evidence: {
      kind: "production",
      how: "20 consecutive green runs of the production synthetic flow; a single local pass is not a streak",
    },
  },
  {
    id: "no-critical-ops",
    condition: "P0 기간 신규 critical ops event 0건",
    evidence: { kind: "production", how: "review ops events over the P0 window; no test can observe a window that has not elapsed" },
  },
  {
    id: "independent-review",
    condition: "독립 reviewer 1인 이상 승인",
    evidence: { kind: "human", who: "a reviewer who did not write the change" },
    note: "deliberately not automatable — the point of the condition is that someone other than the author looked",
  },
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts?: Record<string, string> };
const scripts = packageJson.scripts || {};

/** Script names reachable from `bun run ci`, followed transitively. */
function reachableFromCi(name = "ci", seen = new Set<string>()): Set<string> {
  const body = scripts[name];
  if (!body) return seen;
  for (const match of body.matchAll(/bun run ([a-z0-9:_-]+)/g)) {
    const referenced = match[1]!;
    if (seen.has(referenced)) continue;
    seen.add(referenced);
    reachableFromCi(referenced, seen);
  }
  return seen;
}
const ciReachable = reachableFromCi();

// 1. No condition may be left without evidence. An unowned exit criterion is
//    how a release ships against a checklist nobody could have completed.
{
  const ids = new Set<string>();
  for (const item of P0_EXIT_CONDITIONS) {
    assertOk(item.condition.trim(), `${item.id} has no condition text`);
    assertOk(!ids.has(item.id), `duplicate condition id: ${item.id}`);
    ids.add(item.id);
    assertOk(item.evidence, `${item.id} has no evidence assigned`);
  }
  // Not a count. `length >= 8` let a condition be deleted as long as the total
  // stayed at eight, which is the same restate-instead-of-derive trap this file
  // exists to avoid — so the list is checked against the plan itself.
  const plan = readFileSync("docs/KARXY_REMEDIATION_MASTER_PLAN.md", "utf8");
  const section = plan.split("### P0 통과 조건")[1]?.split("\n#")[0] ?? "";
  assertOk(section.trim(), "could not find the plan's P0 exit-condition list; the heading may have been renamed");

  const planned = [...section.matchAll(/^- \[[ x]\] (.+)$/gm)].map((match) => match[1]!.trim());
  assertOk(planned.length >= 8, `expected the plan to list at least eight exit conditions, found ${planned.length}`);
  for (const wanted of planned) {
    assertOk(
      P0_EXIT_CONDITIONS.some((item) => item.condition.startsWith(wanted)),
      `the plan requires "${wanted}" but no condition here covers it`,
    );
  }
}

// 2. Every condition that claims a test must be backed by a script that exists
//    and actually runs. A condition pointing at a script nobody runs is worse
//    than one pointing at nothing, because it reads as covered.
{
  for (const item of P0_EXIT_CONDITIONS) {
    if (item.evidence.kind !== "test") continue;
    assertOk(item.evidence.scripts.length > 0, `${item.id} claims test evidence but names no script`);
    for (const script of item.evidence.scripts) {
      assertOk(scripts[script], `${item.id} cites ${script}, which is not defined in package.json`);
      assertOk(ciReachable.has(script), `${item.id} cites ${script}, which is not reachable from \`bun run ci\``);
    }
  }
}

// 3. Conditions that no test can settle must stay declared as such. If someone
//    later "automates" one by pointing it at a test, that is a claim about
//    reality which this assertion forces them to justify.
{
  const mustNotBeAutomated = new Set(["e2e-streak", "no-critical-ops", "independent-review", "expired-ciphertext-production"]);
  for (const item of P0_EXIT_CONDITIONS) {
    if (!mustNotBeAutomated.has(item.id)) continue;
    assertOk(
      item.evidence.kind !== "test",
      `${item.id} cannot be settled by a test run: it is about production over time, or about a person looking`,
    );
  }
  // And the reverse: at least half must be machine-checked, or this file is a
  // to-do list wearing a test's clothes.
  const automated = P0_EXIT_CONDITIONS.filter((item) => item.evidence.kind === "test").length;
  assertOk(
    automated >= 4,
    `only ${automated} exit conditions are machine-checked; the rest of P0 would rest on assertion alone`,
  );
}

console.log("PASS P0 release gate: every exit condition has evidence, and every cited test actually runs in CI");

const byKind = { test: 0, production: 0, human: 0 };
for (const item of P0_EXIT_CONDITIONS) byKind[item.evidence.kind] += 1;
console.log(
  `P0 exit conditions: ${byKind.test} machine-checked, `
  + `${byKind.production} need a production observation, ${byKind.human} need a person.`,
);
for (const item of P0_EXIT_CONDITIONS) {
  if (item.evidence.kind === "test") continue;
  const detail = item.evidence.kind === "production" ? item.evidence.how : item.evidence.who;
  console.log(`  OPEN [${item.evidence.kind}] ${item.condition} — ${detail}`);
}
