# Docs Workspace CTA Implementation Plan (UX patch ④)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document-related chat answers end with a real bridge into the product: a "내 서류 워크스페이스에서 준비 상태 관리하기" link that opens /docs with the right visa track preselected — closing the "answers don't lead anywhere" gap from the evaluation.

**Architecture:** The docs workspace is a FIXED-catalog checklist (D-2/D-4 tracks); the right CTA is navigation with track preselection, not item creation. Three thin pieces on existing seams: (1) `AgentSuggestion` gains an optional `href`; the suggestion renderer in `AgentResponseCard` (:283-301) gets a link branch (everything else about the chip row unchanged). (2) Emission: on the ACTION path, `buildSuggestions` (src/lib/agent/meta.ts:335-345) currently drops the "documents" suggestion when `get_documents` ran — exactly when the workspace link should appear instead; emit a link suggestion with `track` taken from the get_documents toolResult args. On the EXPERT path, `normalizeExpertResponse` (unified route) appends the link suggestion when `decision.mode === "documents"`, with `track` from a D-2/D-4 regex on the question. The href is locale-agnostic (`/docs?track=D-4`) — the proxy's legacy-path i18n routing localizes it, query preserved. (3) `Documents.tsx` reads `?track=` on mount to override the initial track (valid values only; falls back to today's leadStore default). Anonymous users hit the existing 401 banner whose `login?next=` already preserves the full URL — the bridge survives login with zero new machinery.

**Tech Stack:** TypeScript/React (Next.js), next/navigation useSearchParams, bun test scripts, Playwright smoke.

## Global Constraints

- Branch: `feat/docs-workspace-cta` off `main`. Commit per task. Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- NEVER stage `Capsomnia/` or `.superpowers/`; `git add <file> …` only. Never run prisma/db commands.
- No workspace/data-model changes: no new endpoints, no DocumentItem writes, no visa-document-matrix coupling. Navigation + preselection only.
- CTA label, 4 locales, exact strings: ko `내 서류 워크스페이스에서 준비 상태 관리하기` · vi `Quản lý hồ sơ trong không gian tài liệu của tôi` · mn `Миний бичиг баримтын самбарт бэлтгэлээ удирдах` · en `Track these documents in my workspace`.
- Track values: exactly `"D-2" | "D-4"`; anything else → omit the `track` param (never emit an invalid value; /docs ignores invalid/absent and keeps its current default).
- Existing suggestion behavior unchanged when the CTA doesn't apply: same library, same filtering, same 3-cap (the link suggestion is prepended and does not count against changing existing entries' semantics — cap the TOTAL at 4 with the link first, or keep 3 including it; pick keeping the slice at 3 AFTER prepending so the CTA always survives).
- All changes additive to response shape (`href` optional) — older clients/tests reading suggestions must not break.

---

### Task 1: Link suggestions — type, renderer, and both emission paths

**Files:**
- Modify: `src/components/agent/types.ts` (AgentSuggestion, ~:111-115)
- Modify: `src/lib/agent/meta.ts` (AgentSuggestion mirror ~:23-27; `buildSuggestions` ~:335-345; new DOCS_CTA labels)
- Modify: `src/app/api/ai/unified/route.ts` (`normalizeExpertResponse` suggestions block, ~:118-122)
- Modify: `src/components/agent/AgentResponseCard.tsx` (suggestions render, ~:283-301)
- Test: extend `scripts/test-unified-ai-router.ts`

**Interfaces:**
- Produces: `AgentSuggestion.href?: string`. Link suggestions have `prompt: ""` and `href: "/docs" | "/docs?track=D-2" | "/docs?track=D-4"`. Renderer: `href` present → `<a>` navigation chip; absent → today's `onSend(prompt)` button.

- [ ] **Step 1: Types**

In BOTH `src/components/agent/types.ts` and `src/lib/agent/meta.ts`, add to `AgentSuggestion`:

```ts
  href?: string;
```

- [ ] **Step 2: Action-path emission (meta.ts)**

Add above `buildSuggestions`:

```ts
const DOCS_WORKSPACE_CTA_LABELS: Record<Lang, string> = {
  ko: "내 서류 워크스페이스에서 준비 상태 관리하기",
  vi: "Quản lý hồ sơ trong không gian tài liệu của tôi",
  mn: "Миний бичиг баримтын самбарт бэлтгэлээ удирдах",
  en: "Track these documents in my workspace",
};

export function docsWorkspaceHref(track?: string): string {
  return track === "D-2" || track === "D-4" ? `/docs?track=${track}` : "/docs";
}
```

Rework `buildSuggestions`: when `used.has("get_documents")`, prepend the link suggestion (track from the get_documents toolResult's `args.visa_type` — inspect the `ToolResult` type in this file for the args field name; it carries the tool call args):

```ts
function buildSuggestions(toolResults: ToolResult[], lang: Lang): AgentSuggestion[] {
  const used = new Set(toolResults.map((item) => item.tool));
  const suggestions = SUGGESTION_LIBRARY[lang].filter((item) => {
    if (item.kind === "school") return !used.has("search_schools");
    if (item.kind === "cost") return !used.has("calculate_cost");
    if (item.kind === "documents") return !used.has("get_documents");
    if (item.kind === "partner") return !used.has("request_partner");
    return true;
  });
  if (used.has("get_documents")) {
    const documentsCall = toolResults.find((item) => item.tool === "get_documents");
    const visaType = typeof (documentsCall?.args as Record<string, unknown> | undefined)?.visa_type === "string"
      ? String((documentsCall?.args as Record<string, unknown>).visa_type)
      : undefined;
    suggestions.unshift({
      kind: "documents",
      label: DOCS_WORKSPACE_CTA_LABELS[lang],
      prompt: "",
      href: docsWorkspaceHref(visaType),
    });
  }
  return suggestions.slice(0, 3);
}
```

(Adapt the args access to the real `ToolResult` shape — if args are typed, drop the casts.)

- [ ] **Step 3: Expert-path emission (unified route)**

In `normalizeExpertResponse`, after the `suggestions` array is built from `suggestedFollowups`, append when the route decided documents mode (import `docsWorkspaceHref` and the label map — export `DOCS_WORKSPACE_CTA_LABELS` from meta.ts or re-declare per the route's local-literal style; prefer importing both from `@/lib/agent/meta`):

```ts
  if (decision.mode === "documents") {
    const trackMatch = question.match(/d\s*-?\s*(2|4)/i);
    suggestions.unshift({
      kind: "documents" as const,
      label: DOCS_WORKSPACE_CTA_LABELS[lang],
      prompt: "",
      href: docsWorkspaceHref(trackMatch ? `D-${trackMatch[1]}` : undefined),
    });
  }
```

- [ ] **Step 4: Renderer**

In `AgentResponseCard.tsx`'s suggestions map, branch on `suggestion.href` — same visual chip, link semantics:

```tsx
              suggestion.href ? (
                <a
                  key={`${suggestion.kind}-${suggestion.label}`}
                  href={suggestion.href}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-icon-accent/55 bg-background px-2.5 py-1.5 text-left text-xs hover:border-icon-accent hover:bg-muted"
                >
                  <ArrowRight className="h-3 w-3 text-icon-accent" />
                  <span className="font-medium">{suggestion.label}</span>
                </a>
              ) : (
                /* existing button unchanged */
              )
```

- [ ] **Step 5: Tests**

Extend `scripts/test-unified-ai-router.ts` beside its existing `normalizeExpertResponse` assertions:
- expert response normalized with a documents-mode decision and question `"D-4 비자 서류 알려줘"` → `meta.suggestions[0]` has `kind: "documents"`, `href: "/docs?track=D-4"`, `label` equal to the ko CTA string;
- a visa-code-free documents-mode question → `href: "/docs"`;
- a non-documents mode → no suggestion carries `href`.
Also import `docsWorkspaceHref` directly and pin: `("D-2") → "/docs?track=D-2"`, `("D-9") → "/docs"`, `(undefined) → "/docs"`.
For the action path: if `buildAgentMeta` (meta.ts) is exported and testable DB-free, add a block constructing toolResults containing `{ tool: "get_documents", args: { visa_type: "D-4" }, … }` and assert the first suggestion's href; if it needs unrelated context, test whatever exported seam reaches `buildSuggestions` and name it in the report.

- [ ] **Step 6: Gates + commit**

Run: `bun run ci:types && bun run lint && bun run test:unified-ai && bun run test:agent 2>/dev/null || true` — ci:types/lint/test:unified-ai must PASS (test:agent may need local DB; defer to CI if the consent gate blocks it, never fabricate consent).

```bash
git add src/components/agent/types.ts src/lib/agent/meta.ts src/app/api/ai/unified/route.ts src/components/agent/AgentResponseCard.tsx scripts/test-unified-ai-router.ts
git commit -m "feat(chat): docs-workspace link CTA on document answers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: /docs track deep link + smoke coverage

**Files:**
- Modify: `src/components/kbridge/Documents.tsx` (initial track derivation, ~:255,270-273)
- Modify: `tests/e2e/kaxi-smoke.spec.ts` (one new test)

**Interfaces:**
- Consumes: `?track=D-2|D-4` emitted by Task 1.
- Produces: /docs honors the param on first render; invalid/absent → today's behavior (leadStore diagnosis default).

- [ ] **Step 1: Read the param**

In `Documents.tsx` (client component): read `useSearchParams()` from `next/navigation`; where the initial `track` state is derived from `useLeadStore().currentDiagnosis`, prefer a VALID url param:

```ts
const searchParams = useSearchParams();
const trackParam = searchParams.get("track");
const initialTrack = trackParam === "D-2" || trackParam === "D-4"
  ? trackParam
  : /* existing diagnosis-derived default */;
```

Adapt to the file's actual state shape (read it first — the track state may live in useState with a lazy initializer or an effect; put the param check at the same decision point so the param wins ONCE on mount and manual switching afterwards is untouched). If the component tree needs a `<Suspense>` boundary for `useSearchParams` (Next requirement in some layouts), check how sibling views handle it and follow; note what you did.

- [ ] **Step 2: Smoke test**

Append to `tests/e2e/kaxi-smoke.spec.ts`:

```ts
test("docs workspace honors the track deep link for anonymous visitors", async ({ page }) => {
  await page.goto("/ko/docs?track=D-4");
  await expect(page).toHaveURL(/\/ko\/docs\?track=D-4$/);
  // Anonymous visitors keep the student-login banner; the page must not crash
  // and the deep link must survive the i18n proxy.
  await expect(page.getByText(/로그인/).first()).toBeVisible();
});
```

Run locally: `bun run test:e2e` (all pass incl. the new one) — if the suite can't run locally, `bunx playwright test --list` + defer to CI, never fake.

- [ ] **Step 3: Gates + commit**

Run: `bun run ci:types && bun run lint`

```bash
git add src/components/kbridge/Documents.tsx tests/e2e/kaxi-smoke.spec.ts
git commit -m "feat(docs): honor the visa-track deep link from chat CTAs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Rollout + production visual proof

Operational (orchestrator-driven):

- [ ] PR → CI green (e2e gate covers the deep link) → merge → deploy → standard post-deploy checks.
- [ ] Production visual: on /ko/agent ask `"D-4 비자로 가려면 필요한 서류 뭐야?"` (action path likely runs get_documents; if the expert path answers instead, its documents mode also emits) → screenshot the CTA chip under the answer → click it → confirm landing on /ko/docs?track=D-4 with the D-4 track active (or the login banner preserving the URL for anonymous).
