# Pastel Primary Tokens + Home Landing Refresh

Date: 2026-07-16
Status: Approved (operator chose lavender pastel, token+home-refresh scope, keep pink accents untouched)

## Problem

The global primary color `#718bff` (periwinkle) reads saturated and heavy on the
warm cream background (`#f0eee6`). The operator wants the primary-colored
elements (upload button, 인증대학 badge, 지원하기 button, CTA band) softened to a
light pastel tone, plus an overall readability/design polish of the homepage.

## Decisions (operator-chosen)

- **Palette: lavender pastel** — the soft version of the current periwinkle, so
  brand continuity is kept. Chosen over powder blue / mint / peach mockups.
- **Scope: global token swap + Landing visual refresh.** No structural redesign
  of home sections; no per-page styling outside home beyond what the shared
  tokens propagate automatically.
- **Pink stays.** Existing pink accents — `--icon-accent` (`#e5a0b3` light /
  `#efafc0` dark) and any pink borders/icons — are NOT modified.

## 1. Color token swap (`src/app/globals.css`)

| Token | Current | New | Why |
| --- | --- | --- | --- |
| `--primary` | `#718bff` | `#c7d2fe` | lavender pastel fill |
| `--primary-foreground` | `#17191f` light / `#1f1e1d` dark | `#2c3577` | dark navy-lavender text on pastel fill; contrast ~8:1 (WCAG AA/AAA) |
| `--sidebar-primary-foreground` | `#17191f` | `#2c3577` | matches `--primary-foreground` |
| `--ring` | `#718bff` | `#a5b4fc` | one step deeper than the fill so focus rings stay visible on cream |
| `--chart-1` | `#718bff` | `#a5b4fc` | pure `#c7d2fe` is too faint for chart marks on cream |
| `--sidebar-primary` | `#718bff` | `#c7d2fe` | consistency |
| `--sidebar-ring` | `#718bff` | `#a5b4fc` | consistency with `--ring` |

Dark mode (`.dark`, `.chat-surface`): same values — pastel fill with dark navy
text stays legible on the dark background, matching the current pattern where
`--primary` is identical in both modes. `--icon-accent` untouched in both modes.

Text on pastel is the readability rule: every pastel fill pairs with a dark
text color from the same family, never white/light text.

## 2. Readability pass (token-level + home)

- Verify `--muted-foreground` (and any secondary text used on the cream
  background) meets 4.5:1; darken one step if it fails. Record measured ratios
  in the implementation report.
- Hero subtitle/paragraphs: constrain line length (`max-w-*`) and normalize
  `line-height` so multi-line Korean text doesn't sprawl.
- Broker comparison table: clearer row separation and consistent text sizing.

## 3. Landing refresh (`src/components/kbridge/Landing.tsx`, structure kept)

All seven sections keep their order and content. Style-only changes:

- **Hero**: tidy the heading hierarchy (size/leading/tracking); hero badge picks
  up the new pastel token automatically.
- **Stats (3 cards) / Features (4 cards)**: soft lavender-tint card backgrounds
  where emphasis is needed, unified radius/border/padding. Pink accents that
  already exist stay pink.
- **CTA band** (`bg-primary` block at Landing.tsx:245): inherits the pastel fill
  + navy text via tokens; verify the inner `variant="secondary"` button still
  contrasts against the pastel band and adjust that one spot if it doesn't.
- **Vertical rhythm**: consistent section spacing scale.

## Out of scope

- New sections, section reordering, or content changes.
- Styling work on non-home views (schools, documents, partner, admin) beyond
  what the token swap propagates.
- Dark-mode overhaul beyond the primary-token rows above.
- Any change to pink accents/icons/borders (`--icon-accent` and friends).

## Verification

1. `bun run ci:types && bun run lint && bun run build` green.
2. Local preview: visually confirm home, a SchoolCard (인증대학 badge + 지원하기
   button), and the Documents upload button; screenshot each.
3. Contrast: record ratios for `#c7d2fe`/`#2c3577` (fill/text), `#a5b4fc` ring
   on `#f0eee6`, and the final `--muted-foreground` on `#f0eee6`.
4. No regression: primary-colored elements outside home (chat, partner inbox)
   spot-checked to confirm the pastel token reads correctly there too.
