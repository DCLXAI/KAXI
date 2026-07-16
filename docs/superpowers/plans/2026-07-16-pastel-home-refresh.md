# Pastel Primary Tokens + Home Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap the saturated periwinkle primary (`#718bff`) for a lavender pastel fill with a dark companion token, without losing readability anywhere the old color was used as text/border/ring.

**Architecture:** All color comes from CSS variables in `src/app/globals.css` consumed via Tailwind v4 `@theme inline` mappings. The pastel fill (`--primary #c7d2fe`) keeps powering solid fills (buttons, badges, CTA band); a NEW `--primary-strong` token (`#4f5db3` light / `#a5b4fc` dark) takes over every place the old primary was used as colored text, icon, border, ring, or alpha tint — those all become invisible (~1.2:1) on a pastel. A mechanical class migration moves them.

**Tech Stack:** Next.js App Router, Tailwind CSS v4 (`@theme inline`), shadcn-style components (`cn()` = clsx + tailwind-merge, confirmed in `src/lib/utils.ts:2`).

**Spec:** `docs/superpowers/specs/2026-07-16-pastel-home-refresh-design.md`

## Global Constraints

- Pink stays untouched: `--icon-accent` (`#e5a0b3` light / `#efafc0` dark) and every pink icon/border. Do not edit them.
- Do NOT stage or commit `Capsomnia/` or `.superpowers/`.
- Commit trailer, verbatim: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Never run any `db:migrate*` / `prisma migrate` command — ambient DATABASE_URL points at PRODUCTION.
- No structural changes to Landing sections (order/content stay).
- Contrast targets (pre-measured, record in the report): pastel fill `#c7d2fe` vs text `#2c3577` = 7.5:1; `--primary-strong` `#4f5db3` on card `#faf9f5` = 5.6:1; dark `#a5b4fc` on `#2d2b26` = 7.1:1; ring `#6366f1` on cream = 3.9:1; `--muted-foreground` `#64625c` on cream = 5.25:1.

---

### Task 1: Token swap in globals.css

**Files:**
- Modify: `src/app/globals.css` (light `:root` 57-91, dark `.dark,.chat-surface` 93-127, `@theme inline` block near top)

**Interfaces:**
- Produces: CSS vars `--primary #c7d2fe`, `--primary-foreground #2c3577`, `--primary-strong` (NEW), `--ring #6366f1`, `--chart-1 #818cf8`; Tailwind utilities `text-primary-strong`, `bg-primary-strong`, `border-primary-strong`, `ring-primary-strong` (via the new `@theme` line). Task 2 and 3 depend on `primary-strong` existing.

- [ ] **Step 1: Edit the light block (`:root`)** — change exactly these declarations, leave everything else (including `--icon-accent`):

```css
  --primary: #c7d2fe;
  --primary-foreground: #2c3577;
  --primary-strong: #4f5db3;
  --muted-foreground: #64625c;
  --ring: #6366f1;
  --chart-1: #818cf8;
  --sidebar-primary: #c7d2fe;
  --sidebar-primary-foreground: #2c3577;
  --sidebar-ring: #6366f1;
```

(`--primary-strong` is a new line; put it right after `--primary-foreground`.)

- [ ] **Step 2: Edit the dark block (`.dark, .chat-surface`)** — same keys:

```css
  --primary: #c7d2fe;
  --primary-foreground: #2c3577;
  --primary-strong: #a5b4fc;
  --ring: #6366f1;
  --chart-1: #818cf8;
  --sidebar-primary: #c7d2fe;
  --sidebar-primary-foreground: #2c3577;
  --sidebar-ring: #6366f1;
```

(dark `--muted-foreground: #a8a49a` stays — measured 6.2:1, passes.)

- [ ] **Step 3: Register the Tailwind color** — in the `@theme inline` block, next to `--color-primary-foreground: var(--primary-foreground);` add:

```css
  --color-primary-strong: var(--primary-strong);
```

- [ ] **Step 4: Verify the old hex is gone**

Run: `grep -rn "#718bff" src/ && echo LEFTOVER || echo CLEAN`
Expected: `CLEAN` (if any hit appears outside globals.css, report it — do not silently change non-CSS files in this task).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: swap primary to lavender pastel and add primary-strong token

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Migrate text/border/ring/tint usages to primary-strong

The old `#718bff` read as a mid-tone: usable as text AND fill. The pastel only works as fill. Rule set (mechanical):

- `text-primary` → `text-primary-strong` — EVERY occurrence (never touch `text-primary-foreground`).
- Full-strength `border-primary`, `ring-primary` (state indicators) → `border-primary-strong`, `ring-primary-strong`.
- Alpha tints `bg-primary/N`, `border-primary/N`, `ring-primary/N` (N ≤ 60) → same class on `primary-strong` (keeps the visual weight the old mid-tone gave them).
- KEEP on `primary` (solid-fill family): `bg-primary` and `hover:bg-primary/90` in `button.tsx:13`, `badge.tsx:13`, and `Landing.tsx:245` CTA band; checkbox `data-[state=checked]:bg-primary` (its `data-[state=checked]:border-primary` DOES migrate to strong).
- `progress.tsx`: indicator `bg-primary` → `bg-primary-strong`, track `bg-primary/20` → `bg-primary-strong/20` (a pastel meter reads as empty).

**Files (inventory from the audit — modify each):**
- `src/app/login/page.tsx:10`
- `src/components/ui/radio-group.tsx:30` (`text-primary` → strong)
- `src/components/ui/button.tsx:22` (link variant text only; line 13 default fill stays)
- `src/components/ui/slider.tsx:56` (`border-primary` → strong)
- `src/components/ui/progress.tsx:17,24` (see rule above)
- `src/components/ui/checkbox.tsx:17` (border → strong; bg stays)
- `src/components/kbridge/CostCalculator.tsx:185,221`
- `src/components/kbridge/Partners.tsx:235,236,307`
- `src/components/kbridge/SourceAnnotations.tsx:129,160,165,196`
- `src/components/kbridge/Documents.tsx:473,495,505`
- `src/components/kbridge/Landing.tsx:184,221,235`
- `src/components/admin/AdminKnowledge.tsx:453`
- `src/components/admin/AdminHandoffs.tsx:299,300,302`
- `src/components/admin/AdminCases.tsx:94`
- `src/components/synonyms/SynonymSuggestionsCard.tsx:31`
- `src/components/agent/AgentLanding.tsx:53,91`
- `src/components/agent/AgentComposer.tsx:31`
- `src/components/legal/PublicLegalPage.tsx:21,47,48`
- `src/components/schools/SelectedSchoolsBanner.tsx:26,37`
- `src/components/diagnosis/HomeQuickDiagnosis.tsx:196,209,288,302,309,313,320,327`
- `src/components/diagnosis/DiagnosisForm.tsx:62,72` (line 62: `selected && "border-primary bg-primary/[0.06] shadow-sm ring-1 ring-primary"` → `selected && "border-primary-strong bg-primary-strong/[0.06] shadow-sm ring-1 ring-primary-strong"`)
- `src/components/diagnosis/DiagnosisResult.tsx:54,61,127,148,152,173,177`
- `src/components/workspace/WorkspaceNotifications.tsx:72`

**Interfaces:**
- Consumes: `primary-strong` utilities from Task 1.
- Produces: no `text-primary`-as-color remains; Task 3 assumes Landing.tsx:184/221/235 already migrated.

- [ ] **Step 1: Apply the rule set to every file in the inventory** (exact class rewrites per the rules; use the audit line numbers).

- [ ] **Step 2: Verify nothing was missed and nothing extra was touched**

Run:
```bash
grep -rn "text-primary" src --include="*.tsx" --include="*.ts" | grep -v "text-primary-foreground" | grep -v "text-primary-strong"
```
Expected: no output.
```bash
grep -rn "border-primary\b\|ring-primary\b\|border-primary/\|ring-primary/\|bg-primary/" src --include="*.tsx" | grep -v "primary-strong" | grep -v "primary-foreground"
```
Expected: ONLY the keep-list — `button.tsx:13` (`hover:bg-primary/90`), `badge.tsx:13` (`hover:bg-primary/90`), `checkbox.tsx:17` (`data-[state=checked]:bg-primary` twice).

- [ ] **Step 3: Type/lint gate**

Run: `bun run ci:types && bun run lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A src/components src/app/login
git commit -m "refactor: move text/border/ring primary usages to primary-strong

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Landing refresh (CTA band, hero polish)

**Files:**
- Modify: `src/components/kbridge/Landing.tsx:122-127` (hero), `:244-256` (CTA)

**Interfaces:**
- Consumes: pastel `bg-primary` band + `text-primary-foreground #2c3577` (Task 1).
- Produces: nothing downstream.

- [ ] **Step 1: Hero text flow** — line 122 add `text-balance` to the h1 classes; line 125 add `text-pretty` to the subtitle classes. No other hero change.

- [ ] **Step 2: CTA band internals** — the band `bg-primary ... text-primary-foreground` now renders pastel+navy automatically. Two inner elements break on a light band and must change:

Line 247 — the inverted (light) cat washes out on pastel; render it normal:
```tsx
<KaxiCat state="happy" size={44} />
```

Lines 251-254 — `variant="secondary"` (`#e8e5db`) is 1.2:1 against the pastel band, near-invisible. Replace with a solid navy that holds in BOTH modes (band and navy are mode-invariant, so hardcoded hex is deliberate here):
```tsx
<Button size="lg" className="gap-2 bg-[#2c3577] text-[#eef2ff] hover:bg-[#3b4690]" onClick={scrollToQuickDiagnosis}>
```
(keep the children; drop `variant="secondary"`. `cn()` uses tailwind-merge so the className fill overrides the default variant fill. Measured: text 10:1, button-vs-band 7.5:1.)

- [ ] **Step 3: Visual sanity in the browser** — start the dev server (`.claude/launch.json` / preview_start), open `/ko`, confirm: hero renders, CTA band is pastel with navy text and a navy button, broker table "KAXI" column is readable (deep lavender), feature-card hover shows a soft lavender border. Screenshot home.

- [ ] **Step 4: Commit**

```bash
git add src/components/kbridge/Landing.tsx
git commit -m "feat: refresh landing hero and CTA for the pastel primary

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Full verification + report

- [ ] **Step 1: Gates**

Run: `bun run ci:types && bun run lint && bun run build`
Expected: all exit 0 (build may take minutes).

- [ ] **Step 2: Preview walk** — with the dev server, visit and screenshot: `/ko` (home), `/ko/schools` (인증대학 badge + 지원하기 button on a SchoolCard), `/ko/docs` (업로드 button; also confirm the student-login banner still shows), one diagnosis flow card (selected state ring must be clearly visible). Check both light and `.dark` if a toggle exists.

- [ ] **Step 3: Report** — write `.superpowers/sdd/pastel-refresh-report.md` (NOT committed): per-task disposition, the contrast table from Global Constraints, screenshots taken, any file where the mechanical rule needed judgment.

## Self-review notes

- Spec coverage: token table → Task 1; readability pass (`--muted-foreground`, line length) → Task 1 + Task 3 Step 1 (broker table separation judged unnecessary — rows already have `border-t`; recorded as a deliberate no-op). Landing refresh → Task 3; CTA inner-button contrast check the spec demanded → Task 3 Step 2; verification section → Task 4.
- The spec's "soft lavender-tint card backgrounds" for stats/features: existing cards already use `bg-card` + `border-border/70` consistently; adding tints would fight the cream palette. Deliberate no-op, recorded here — the tinted surfaces the spec wanted already exist on HomeQuickDiagnosis (`bg-primary-strong/5` after migration).
- Type consistency: the only new identifier is the CSS var `--primary-strong` / utility `*-primary-strong`, defined in Task 1, consumed in Tasks 2-3.
