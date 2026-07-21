# Agent Chat Persistence Implementation Plan (UX patch ②)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The /agent chat survives a refresh (anonymous, 24h signed-cookie session restored from the server) and, on login, the anonymous session is claimed into the account — with a "최근 상담 기록" list on /student making the save visible.

**Architecture:** All primitives already exist and are production-proven on the Typebot channel: `POST/GET /api/chat-session` (HTTP-only HMAC cookie `kaxi_chat_session`, 24h; `ensureChatSession` upsert; `loadChatSessionSnapshot` restore that strips session metadata), `persistChatExchange` (PII envelope encryption, idempotency-keyed), 90-day retention + delete-request cascade. The /agent surface simply never used any of it. We wire four thin pieces: (1) `/api/ai/unified` persists each turn best-effort via Next's `after()` using the cookie session; (2) `useAgentChat` establishes the session on mount and hydrates restored messages; (3) a `user_id` column + `POST /api/chat-session/claim` links the anonymous session at login (called from AuthComplete), with a login nudge in the chat; (4) /student lists the user's recent sessions. No new privacy policy: same table, same retention, same delete flow as the existing Typebot channel.

**Tech Stack:** TypeScript (Next.js App Router, `after()` from next/server), Prisma migration (SQL + schema), Supabase chat client, bun test scripts.

## Global Constraints

- Branch: `feat/agent-chat-persistence` off `main`. Commit per task. Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- NEVER stage `Capsomnia/` or `.superpowers/`; `git add <file> …` only.
- Migration discipline: author the SQL file + schema.prisma edit ONLY. NEVER run `prisma migrate`/`db:migrate`/`migrate resolve` in this session against ANY remote DB; local test DBs are prepared only by the hermetic scripts (prepare-test-db/prepare-e2e-db) that gates invoke themselves; production migration applies via the deploy workflow (established queue-SLA pattern).
- Persistence must be INVISIBLE to latency and reliability: wrapped in `after()` (Vercel-safe post-response work), every failure caught and logged with `console.warn`, never thrown. No cookie / invalid cookie → skip persistence silently (the answer flows exactly as today).
- The client restore is fail-soft: any error in POST/GET /api/chat-session leaves the user with today's fresh-chat behavior.
- Restored messages render text-only (no badges/sources) — the snapshot's metadata-stripping contract (`chat-session/route.ts:45-48`) is a privacy decision we keep.
- Claim safety: a session can be claimed only via the VALID signed cookie for that session, only when `user_id` is currently NULL (no stealing, no re-claim), and claiming requires an authenticated user.
- All user-visible strings in 4 locales (ko/vi/mn/en).
- Do NOT touch the Typebot path (`/api/typebot-rag`), the consult/agent delegate routes, or retention logic.

---

### Task 1: Server — persist unified chat turns (best-effort)

**Files:**
- Modify: `src/app/api/ai/unified/route.ts` (POST handler, after the normalized response is built ~line 223)
- Test: extend `scripts/test-chat-history.ts` (it already runs against the hermetic local DB and exercises `persistChatExchange`/`loadChatSessionSnapshot` — add an agent-turn case)

**Interfaces:**
- Consumes: `verifyChatSessionToken` + `CHAT_SESSION_COOKIE` from `@/lib/chat/session-token`; `persistChatExchange` from `@/lib/chat/persistence` (`PersistChatExchangeInput`: requestId, idempotencyKey, sessionKey, tenantId, locale, source, question, answer, provenance: RagProvenance, sources?, searchMeta?, latencyMs?, needsHuman?); `after` from `next/server`; `RagProvenance` from `@/lib/n8n/provenance`.
- Produces: every unified turn (expert AND action capability) lands in `chat_messages` keyed to the cookie session — which `GET /api/chat-session` already returns.

- [ ] **Step 1: Add the persistence hook in the unified POST**

In `src/app/api/ai/unified/route.ts`, add imports:

```ts
import { after } from "next/server";
import { CHAT_SESSION_COOKIE, verifyChatSessionToken } from "@/lib/chat/session-token";
import { persistChatExchange } from "@/lib/chat/persistence";
```

Then in `POST`, right BEFORE the final `return NextResponse.json(normalized, …)` (after `normalized` exists), insert:

```ts
  const chatSession = verifyChatSessionToken(req.cookies.get(CHAT_SESSION_COOKIE)?.value);
  if (chatSession?.sessionId) {
    const sessionId = chatSession.sessionId;
    const requestId = crypto.randomUUID();
    const record_ = record(normalized);
    const quality = record(record(record_.meta).quality);
    const answer = text(record_.answer);
    after(async () => {
      try {
        if (!answer) return;
        await persistChatExchange({
          requestId,
          idempotencyKey: `unified-${requestId}`,
          sessionKey: sessionId,
          tenantId: "default",
          locale: lang,
          source: "kaxi-site",
          question,
          answer,
          needsHuman: boolean(record_.needsHumanExpert),
          provenance: {
            workflowId: "kaxi-unified-chat",
            workflowVersionId: "kaxi-unified-chat@2026-07-21.v1",
            modelVersion: text(quality.backend, "unknown"),
            promptVersion: `kaxi-unified-${decision.capability}@v1`,
          },
          sources: record(record_.meta).sources,
          searchMeta: quality,
          latencyMs: Date.now() - startedAt,
        });
      } catch (error) {
        // Persistence is a convenience, never a gate: the user already has
        // the answer; losing one history row must stay invisible.
        console.warn("[unified chat persistence]", error instanceof Error ? error.message : error);
      }
    });
  }
```

Adapt mechanically to the file's local helpers (`record`, `text`, `boolean` already exist there; if `RagProvenance` requires additional/different mandatory fields, satisfy them with the same literal style and note it in the report). If the file returns from multiple success paths, hook the SINGLE final success return (both expert and action flow through it).

- [ ] **Step 2: Extend the history test**

In `scripts/test-chat-history.ts`, find how it calls `persistChatExchange` + `loadChatSessionSnapshot` today and add a case in the same style: persist an exchange with `idempotencyKey: "unified-<uuid>"`, `source: "kaxi-site"`, provenance `workflowId: "kaxi-unified-chat"`, then assert the snapshot returns the question/answer pair. (This pins the exact input shape the route now sends — if `persistChatExchange` rejects the shape, the test catches it hermetically.)

- [ ] **Step 3: Gates**

Run: `bun run ci:types && bun run lint` (both must PASS). `test:chat-history` needs the local hermetic DB — run `bun run test:chat-history`; if the session's permission layer blocks the local DB reset (Prisma consent gate), record "deferred to CI" — NEVER fabricate the consent env var.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/ai/unified/route.ts scripts/test-chat-history.ts
git commit -m "feat(chat): persist unified agent turns to the cookie session (best-effort)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Client — establish + restore the session on /agent

**Files:**
- Modify: `src/components/agent/useAgentChat.ts` (mount effect)
- Modify: `src/components/agent/types.ts` (add `restored?: boolean` to `AgentMessage` if no equivalent exists)

**Interfaces:**
- Consumes: `POST /api/chat-session` (`{ locale }` body → sets HTTP-only cookie, returns `{ sessionId, expiresIn }`), `GET /api/chat-session` (→ `{ sessionId, messages: Array<{ question, answer, createdAt, … }> }`, 401/404 when absent).
- Produces: on mount, prior turns appear in the thread before any user action; new turns persist via Task 1.

- [ ] **Step 1: Session bootstrap effect**

In `useAgentChat`, add one mount effect (alongside the existing status-fetch effect):

```ts
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await fetch("/api/chat-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale }),
        });
        const res = await fetch("/api/chat-session");
        if (!res.ok || !alive) return;
        const snapshot = await res.json() as { messages?: Array<{ question?: string; answer?: string; createdAt?: string }> };
        const restored = (snapshot.messages || []).flatMap((exchange, index): AgentMessage[] => {
          if (!exchange.question || !exchange.answer) return [];
          return [
            buildRestoredUserMessage(exchange.question, index),
            buildRestoredAssistantMessage(exchange.answer, index),
          ];
        });
        if (alive && restored.length > 0) {
          setMessages((current) => (current.length === 0 ? restored : current));
          setStarted(true);
        }
      } catch {
        // Fail soft: refresh-loss behavior is simply what we have today.
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Implement `buildRestoredUserMessage`/`buildRestoredAssistantMessage` as small local helpers producing the file's own `AgentMessage` shape (read the type first): user role with the question text; assistant role with the answer text, terminal/done state, `restored: true`, and NO meta/toolResults/routing (text-only fidelity by design). Match exactly how `send()` constructs messages so rendering needs no special-casing beyond the flag.

- [ ] **Step 2: Verify rendering tolerates restored messages**

Check `AgentResponseCard` renders an assistant message with no `meta`/`routing`/`toolResults` without crashing (all badge blocks are already conditional — confirm by reading; fix only if something dereferences unconditionally). Restored user messages render through the existing user-bubble path.

- [ ] **Step 3: Gates + local visual proof**

Run: `bun run ci:types && bun run lint`. Then the live check: start the dev server (`.claude/launch.json` name "kaxi-dev", port 3100), open /ko/agent in the browser pane, send a question (JS injection pattern: native value setter + input event + click 보내기), wait for the answer, RELOAD the page, and confirm the thread reappears (text-only). Screenshot as evidence.

- [ ] **Step 4: Commit**

```bash
git add src/components/agent/useAgentChat.ts src/components/agent/types.ts
git commit -m "feat(chat): restore the agent thread from the signed session on mount

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Login bridge — user_id column, claim endpoint, nudge, /student list

**Files:**
- Create: `prisma/postgres/migrations/20260721210000_chat_session_user_link/migration.sql`
- Modify: `prisma/postgres/schema.prisma` (ChatSession model)
- Create: `src/app/api/chat-session/claim/route.ts`
- Modify: `src/components/auth/AuthComplete.tsx` (fire claim after successful login)
- Modify: the /agent chat surface component that renders the thread (locate via `useAgentChat` usage) — login nudge line
- Modify: `src/app/student/page.tsx` (+ its data loader) — "최근 상담 기록" section
- Test: extend `scripts/test-chat-history.ts` (claim semantics)

**Interfaces:**
- Consumes: `verifyChatSessionToken`/`CHAT_SESSION_COOKIE`; `getCurrentKaxiUser` from `@/lib/supabase/auth` (`Promise<User | null>`); `db` (Prisma).
- Produces: `POST /api/chat-session/claim` → `{ claimed: boolean }`; `ChatSession.userId` nullable indexed column; /student section listing up to 5 of the user's sessions (date + first question preview).

- [ ] **Step 1: Migration**

`migration.sql`:

```sql
ALTER TABLE "chat_sessions" ADD COLUMN "user_id" TEXT;
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions"("user_id");
```

`schema.prisma` ChatSession: add `userId String? @map("user_id")` next to `typebotResultId` and `@@index([userId])` with the other indexes. (No RLS change: `chat_sessions` is server-owned with PUBLIC revoked — verified by test:supabase-rls, which must stay green.)

- [ ] **Step 2: Claim endpoint**

`src/app/api/chat-session/claim/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { parseLimit, rateLimit } from "@/lib/api/security";
import { db } from "@/lib/db";
import { getCurrentKaxiUser } from "@/lib/supabase/auth";
import { CHAT_SESSION_COOKIE, verifyChatSessionToken } from "@/lib/chat/session-token";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, {
    key: "chat-session-claim",
    limit: parseLimit(process.env.CHAT_SESSION_CLAIM_RATE_LIMIT, 10),
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  const user = await getCurrentKaxiUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const session = verifyChatSessionToken(req.cookies.get(CHAT_SESSION_COOKIE)?.value);
  if (!session?.sessionId) return NextResponse.json({ claimed: false }, { status: 200 });

  // Claim only the caller's own cookie-proven session, and only while it is
  // still unowned — a claimed session never changes hands.
  const result = await db.chatSession.updateMany({
    where: { sessionKey: session.sessionId, userId: null },
    data: { userId: user.id },
  });
  return NextResponse.json({ claimed: result.count > 0 });
}
```

(Confirm the `User` id field name via `getCurrentKaxiUser`'s return type — adjust `user.id` if it differs; note in report.)

- [ ] **Step 3: Fire claim at login completion**

In `src/components/auth/AuthComplete.tsx`, at the point where login is confirmed successful (read the component to find it — where it redirects to the role home), add a fire-and-forget:

```ts
      void fetch("/api/chat-session/claim", { method: "POST" }).catch(() => undefined);
```

before the redirect (must not delay or block it — no await on the redirect path).

- [ ] **Step 4: Login nudge in the chat**

In the /agent chat surface (the component consuming `useAgentChat` that renders the thread): when the user is NOT logged in (reuse however the page/nav derives auth state; if none is available client-side, call `GET /api/auth/session` the way the nav/login components do — copy their pattern) AND at least one assistant message exists, render one muted line under the thread:

- ko: `로그인하면 이 상담이 계정에 저장됩니다.` · vi: `Đăng nhập để lưu cuộc tư vấn này vào tài khoản.` · mn: `Нэвтэрвэл энэ зөвлөгөө таны бүртгэлд хадгалагдана.` · en: `Log in to save this conversation to your account.`

linking to `/login` (plain anchor styled like existing muted helper text in that component).

- [ ] **Step 5: /student recent-consultations section**

In `src/app/student/page.tsx` (server component; it already loads student data via Prisma): load

```ts
  const chatSessions = await db.chatSession.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { lastMessageAt: "desc" },
    take: 5,
    select: { sessionKey: true, startedAt: true, lastMessageAt: true, locale: true },
  });
```

plus, per session, the first question preview: `db.chatMessage.findFirst({ where: { sessionId: session.sessionKey }, orderBy: { createdAt: "asc" } })` and decode with `readPiiField` from `@/lib/privacy/pii` exactly the way `src/lib/chat/history.ts:170-173` does (same argument order, same truncation) — slice the preview to 80 chars. Render a simple card section "최근 상담 기록" (4-locale heading via the page's existing i18n mechanism — read how the page localizes; if it is ko-only server-rendered, follow its existing convention) listing date + preview, no links (v1). If the ChatMessage relation/field names differ (check schema.prisma `ChatMessage` model: the session FK is `session_id` mapped), adjust to the real Prisma field names.

- [ ] **Step 6: Claim-semantics test**

Extend `scripts/test-chat-history.ts`: after persisting a session, simulate claims directly against `db.chatSession.updateMany` semantics via the route's exact where-clause: claim with `userId: null` succeeds once (count 1); a second claim attempt for a DIFFERENT user id with the same where-clause (`userId: null`) yields count 0 (session already owned). Assert both counts.

- [ ] **Step 7: Gates**

Run: `bun run ci:types && bun run lint && bun run test:schema` (schema policy gate must accept the new column) — PASS required. `test:chat-history`, `test:supabase-rls` — run if the local DB is available, else defer to CI (never fabricate consent).

- [ ] **Step 8: Commit**

```bash
git add prisma/postgres/schema.prisma prisma/postgres/migrations/20260721210000_chat_session_user_link/migration.sql src/app/api/chat-session/claim/route.ts src/components/auth/AuthComplete.tsx src/app/student/page.tsx scripts/test-chat-history.ts
git commit -m "feat(chat): login claim bridge + student recent-consultations list

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
(Also stage the nudge component file — name it in the report.)

---

### Task 4: Rollout (operator-gated)

- [ ] PR → CI green (hermetic DB suites cover the migration + history/claim tests) → merge → `gh workflow run "Vercel Production Deploy"` (the workflow applies the migration before promotion) → post-deploy checks (health commit match, readiness, documents 401).
- [ ] Live probe (API-level, cookie jar): `POST /api/chat-session` (capture cookie) → `POST /api/ai/unified` with the cookie and a real question → `GET /api/chat-session` with the cookie → assert the question/answer pair is in `messages`. Then browser-level on production /ko/agent: ask → reload → thread restored (screenshot).
- [ ] Verify claim path shape only (no real login automation): unauthenticated `POST /api/chat-session/claim` → 401.
