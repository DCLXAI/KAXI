# High 심각도 보안 패치 3건 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 심층 리뷰 High 3건 수정 — ① 문서 워크스페이스에 학생 세션 인증 적용(studentRef URL 시크릿 제거), ② /api/ai/chat 레이트리밋 기본값을 무제한→보수적 값으로, ③ RLS 비의존 인가 모델 결정 문서화.

**Architecture:** 문서 흐름의 신원 앵커를 localStorage UUID(`studentRef`)에서 Supabase 세션 파생 `StudentProfile.id`로 교체한다. 기존 서명 토큰(upload-intent→upload-direct) 구조는 유지하되 페이로드 필드만 `studentRef`→`studentProfileId`로 바꾼다. `ensureStudentProfile`(zaloUid 기반 유령 신원 생성)은 삭제한다.

**Tech Stack:** Next.js App Router (route handlers), Prisma, Supabase Auth (`requireKaxiUser`), bun 스크립트 테스트 (`scripts/test-*.ts`, `fail()`/`process.exit(1)` 패턴).

## Global Constraints

- 원격 Supabase 접근 절대 금지. 테스트는 로컬 PG17(포트 5433)만: `TEST_DATABASE_URL="postgresql://sunsu@localhost:5433/kaxi_test?schema=public"` (loopback + `_test` 접미사 필수 — `scripts/prepare-test-db.ts` 가드).
- 테스트 실행 시 `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="예, 동의합니다 (Recommended)"` env 필요.
- 이 계획의 3개 항목 외 어떤 수정도 금지 (리팩토링·기능 추가 금지). Medium 항목(XFF, zod, i18n 등)은 범위 밖.
- 커밋은 feature 브랜치 `fix/high-security-patches`에서만. push 금지.
- 테스트 스크립트는 기존 컨벤션(`fail()`, `assert()`, route 핸들러 직접 import) 유지. 테스트 env에는 Supabase env가 없으므로 `requireKaxiUser`는 항상 401 `AuthBridgeError`를 던진다 — 인증된 경로 로직은 repository 함수 레벨에서 검증한다.
- Next.js route 파일(`route.ts`)에는 HTTP 메서드/`runtime` 외 export 추가 금지 (빌드 타입체크가 거부).

---

### Task 0: 브랜치 생성

- [ ] **Step 1: feature 브랜치 생성**

```bash
cd /Users/sunsu/Desktop/KAXI
git checkout -b fix/high-security-patches
```

Run: `git branch --show-current`
Expected: `fix/high-security-patches`

---

### Task 1: repository/crypto 계층 — studentRef → studentProfileId

**Files:**
- Modify: `src/lib/documents/repository.ts` (40-46 `normalizeStudentRef` 삭제, 66-75 `createDocumentStorageKey`, 77-104 `ensureStudentProfile` 삭제→`getStudentProfileForUser` 신설, 106-107 `listStudentDocuments`→`listDocumentsForProfile`, 197-207 `commitDocumentUpload`)
- Modify: `src/lib/documents/crypto.ts:4-13` (`DocumentUploadTokenPayload.studentRef`→`studentProfileId`)
- Test: `scripts/test-document-flow.ts`

**Interfaces:**
- Consumes: `db` (Prisma), 기존 `sha256Hex`, `DEFAULT_DOCUMENT_TYPES`.
- Produces (Task 2·3이 사용):
  - `getStudentProfileForUser(userId: string): Promise<StudentProfile>` — 세션 User.id로 프로필 upsert 조회.
  - `listDocumentsForProfile(studentProfileId: string)` — 기존 `listStudentDocuments`와 동일 반환 형태.
  - `createDocumentStorageKey({ studentProfileId, documentType, originalName, sha256 }): string`
  - `commitDocumentUpload(input, context)` — `input.studentRef` 대신 `input.studentProfileId: string`.
  - `DocumentUploadTokenPayload.studentProfileId: string` (crypto.ts).

- [ ] **Step 1: 실패하는 테스트 작성** — `scripts/test-document-flow.ts`의 기존 studentRef 기반 준비 코드를 프로필 시드로 교체하고, 새 함수 계약을 검증하는 블록을 추가한다. 파일 상단 import 아래(기존 `try {` 블록 초입)에 삽입:

```ts
const { getStudentProfileForUser, listDocumentsForProfile, commitDocumentUpload: commitUpload } =
  await import("../src/lib/documents/repository");

// 세션 사용자 시드 (auth bridge가 만드는 형태와 동일)
const seededUser = await db.user.create({
  data: {
    role: "STUDENT",
    locale: "ko",
    email: "doc-test-student@kaxi.local",
    authUserId: "11111111-2222-4333-8444-555555555555",
  },
});

const profile = await getStudentProfileForUser(seededUser.id);
assert(profile.userId === seededUser.id, "getStudentProfileForUser must bind profile to the seeded user");

// 멱등성: 두 번 호출해도 같은 프로필
const profileAgain = await getStudentProfileForUser(seededUser.id);
assert(profileAgain.id === profile.id, "getStudentProfileForUser must be idempotent");

// 유령 신원(zaloUid doc:*) 생성 금지
const ghostUsers = await db.user.count({ where: { zaloUid: { startsWith: "doc:" } } });
assert(ghostUsers === 0, "no doc:* ghost users may be created");

const emptyList = await listDocumentsForProfile(profile.id);
assert(Array.isArray(emptyList) && emptyList.length > 0, "listDocumentsForProfile returns the default checklist");
assert(emptyList.every((d) => d.status === "NOT_UPLOADED"), "fresh profile has no uploaded documents");
```

기존 코드에서 `studentRef` 문자열로 intent/commit을 호출하던 부분은 Step 3에서 함께 갱신한다(이 시점에서는 컴파일 에러로 실패하는 것이 정상).

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd /Users/sunsu/Desktop/KAXI && TEST_DATABASE_URL="postgresql://sunsu@localhost:5433/kaxi_test?schema=public" PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="예, 동의합니다 (Recommended)" bun run test:documents`
Expected: FAIL — `getStudentProfileForUser is not a function` (또는 export 부재 컴파일 에러)

- [ ] **Step 3: repository.ts 구현**

`normalizeStudentRef`(40-46줄) 삭제. `ensureStudentProfile`(77-104줄)을 다음으로 교체:

```ts
export async function getStudentProfileForUser(userId: string) {
  return db.studentProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, nationality: "VN" },
  });
}
```

`createDocumentStorageKey`(66-75줄) 필드 교체:

```ts
export function createDocumentStorageKey(input: {
  studentProfileId: string;
  documentType: string;
  originalName: string;
  sha256: string;
}): string {
  const studentHash = sha256Hex(input.studentProfileId).slice(0, 20);
  const docType = input.documentType.replace(/[^\w.\-]+/g, "_").slice(0, 64);
  return `uploads/${studentHash}/${docType}/${Date.now()}-${input.sha256.slice(0, 16)}-${safeFileName(input.originalName)}`;
}
```

`listStudentDocuments(studentRef)`를 `listDocumentsForProfile(studentProfileId: string)`로 교체 — 함수 본문에서 `const profile = await ensureStudentProfile(studentRef);` 줄을 삭제하고 `where: { studentProfileId: profile.id }`를 `where: { studentProfileId }`로 바꾼다. 나머지 매핑 로직은 그대로.

`commitDocumentUpload`의 input 타입 필드 `studentRef: string`→`studentProfileId: string`, 본문 207줄을:

```ts
  const profile = await db.studentProfile.findUniqueOrThrow({
    where: { id: input.studentProfileId },
  });
```

`crypto.ts:5` — `studentRef: string;`→`studentProfileId: string;`.

- [ ] **Step 4: 이 파일의 나머지 컴파일 에러 정리 (routes/테스트는 다음 태스크)**

`repository.ts`와 `crypto.ts` 내부에서 `studentRef`를 참조하는 곳이 남아 있지 않은지 확인:

Run: `grep -n "studentRef" src/lib/documents/repository.ts src/lib/documents/crypto.ts`
Expected: 출력 없음

- [ ] **Step 5: 테스트의 기존 studentRef 사용부 갱신** — `scripts/test-document-flow.ts`에서 intent/direct/review 파이프라인을 검증하던 기존 블록 중, upload-intent 라우트 호출(세션 필요→Task 2에서 401 검증으로 전환) 대신 **서명 토큰을 직접 생성**해 upload-direct→review를 검증하도록 수정:

```ts
const { signDocumentUploadPayload } = await import("../src/lib/documents/crypto");
const { DOCUMENT_UPLOAD_TOKEN_TTL_SECONDS } = await import("../src/lib/documents/config");
const { createDocumentStorageKey: makeStorageKey } = await import("../src/lib/documents/repository");

const fileBytes = Buffer.from("KAXI test passport bytes");
const fileSha = sha256(fileBytes);
const storageKey = makeStorageKey({
  studentProfileId: profile.id,
  documentType: "passport",
  originalName: "passport.pdf",
  sha256: fileSha,
});
const uploadToken = signDocumentUploadPayload(
  {
    studentProfileId: profile.id,
    documentType: "passport",
    originalName: "passport.pdf",
    mimeType: "application/pdf",
    sizeBytes: fileBytes.byteLength,
    sha256: fileSha,
    storageKey,
    exp: Math.floor(Date.now() / 1000) + DOCUMENT_UPLOAD_TOKEN_TTL_SECONDS,
  },
  "test-document-upload-secret"
);
```

이후 기존 PUT upload-direct 호출부는 `?token=${encodeURIComponent(uploadToken)}`으로 그대로 재사용하고, 업로드 후:

```ts
const listAfter = await listDocumentsForProfile(profile.id);
const passport = listAfter.find((d) => d.documentType === "passport");
assert(passport && passport.status !== "NOT_UPLOADED", "committed upload must appear in profile document list");
```

기존 코드 중 `studentRef` 변수·쿼리스트링·body 필드는 모두 삭제. admin review 라우트 검증 블록은 그대로 유지(문서 id 소스만 위 결과로 교체).

- [ ] **Step 6: 테스트 실행 — repository 레벨 통과 확인** (라우트 401 블록은 Task 2에서 추가하므로, 이 시점에서 라우트 관련 기존 블록이 남아 컴파일 에러가 나면 해당 블록을 Task 2 형태로 미리 축소)

Run: Step 2와 동일 명령
Expected: PASS (`document flow` 스크립트 exit 0)

- [ ] **Step 7: 커밋**

```bash
git add src/lib/documents/repository.ts src/lib/documents/crypto.ts scripts/test-document-flow.ts
git commit -m "refactor(documents): anchor document identity to StudentProfile.id, drop studentRef ghost identities"
```

---

### Task 2: 문서 라우트 3개 — 세션 인증 적용

**Files:**
- Modify: `src/app/api/documents/route.ts` (전체 교체)
- Modify: `src/app/api/documents/upload-intent/route.ts` (전체 교체)
- Modify: `src/app/api/documents/upload-direct/route.ts:44-56` (payload 필드명만)
- Test: `scripts/test-document-flow.ts`

**Interfaces:**
- Consumes: Task 1의 `getStudentProfileForUser`, `listDocumentsForProfile`, `createDocumentStorageKey`, `DocumentUploadTokenPayload.studentProfileId`; 기존 `requireKaxiUser`, `AuthBridgeError` (`@/lib/supabase/auth`).
- Produces: `GET /api/documents` — 쿼리 파라미터 없음, 세션 쿠키 인증, 401 시 `{ error, code: "forbidden" }`. `POST /api/documents/upload-intent` — body에서 `studentRef` 제거.

- [ ] **Step 1: 실패하는 테스트 작성** — `scripts/test-document-flow.ts`에 라우트 401 검증 추가 (테스트 env에는 Supabase env가 없어 세션이 항상 null):

```ts
{
  const res = await listRoute.GET();
  const { status, body } = { status: res.status, body: await res.json() };
  assert(status === 401, `GET /api/documents without session must be 401, got ${status}`);
  assert(body.code === "forbidden", "401 body must carry AuthBridgeError code");
  assert(!JSON.stringify(body).includes("studentRef"), "response must not reference studentRef");
}
{
  const res = await intentRoute.POST(
    request("/api/documents/upload-intent", {
      method: "POST",
      body: JSON.stringify({ documentType: "passport", originalName: "a.pdf", mimeType: "application/pdf", sizeBytes: 10, sha256: "0".repeat(64) }),
    })
  );
  assert(res.status === 401, `upload-intent without session must be 401, got ${res.status}`);
}
```

주의: 새 `GET`은 인자를 받지 않으므로 `listRoute.GET()`로 호출.

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: Task 1 Step 2와 동일 명령
Expected: FAIL — 현재 GET은 `studentRef is required` 400 (또는 `req` undefined 에러)

- [ ] **Step 3: `src/app/api/documents/route.ts` 전체 교체**

```ts
import { NextResponse } from "next/server";
import { AuthBridgeError, requireKaxiUser } from "@/lib/supabase/auth";
import { getStudentProfileForUser, listDocumentsForProfile } from "@/lib/documents/repository";
import { getDocumentWorkspaceIssue } from "@/lib/documents/workspace-availability";

export const runtime = "nodejs";

export async function GET() {
  try {
    const workspaceIssue = getDocumentWorkspaceIssue("list");
    if (workspaceIssue) return NextResponse.json(workspaceIssue, { status: 503 });

    const user = await requireKaxiUser(["STUDENT"]);
    const profile = await getStudentProfileForUser(user.id);
    const documents = await listDocumentsForProfile(profile.id);
    return NextResponse.json({ documents });
  } catch (err) {
    if (err instanceof AuthBridgeError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[GET /api/documents]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

(부수 수정 포함: `err.message` 노출 제거 — 리뷰 Medium 항목이지만 같은 줄을 고치는 김에 반영, 새 코드 작성 범위 내.)

- [ ] **Step 4: `src/app/api/documents/upload-intent/route.ts` 전체 교체**

```ts
import { NextRequest, NextResponse } from "next/server";
import { AuthBridgeError, requireKaxiUser } from "@/lib/supabase/auth";
import { DOCUMENT_UPLOAD_TOKEN_TTL_SECONDS } from "@/lib/documents/config";
import { getDocumentUploadSigningSecret, signDocumentUploadPayload } from "@/lib/documents/crypto";
import {
  createDocumentStorageKey,
  getStudentProfileForUser,
  validateDocumentUpload,
} from "@/lib/documents/repository";
import { getDocumentWorkspaceIssue } from "@/lib/documents/workspace-availability";

export const runtime = "nodejs";

function isExpectedValidationError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("Unsupported MIME type") ||
    message.includes("File size must be") ||
    message.includes("sha256") ||
    message.includes("originalName")
  );
}

export async function POST(req: NextRequest) {
  try {
    const workspaceIssue = getDocumentWorkspaceIssue("upload");
    if (workspaceIssue) return NextResponse.json(workspaceIssue, { status: 503 });

    const user = await requireKaxiUser(["STUDENT"]);
    const profile = await getStudentProfileForUser(user.id);
    const secret = getDocumentUploadSigningSecret();

    const body = (await req.json().catch(() => ({}))) as {
      documentType?: string;
      originalName?: string;
      mimeType?: string;
      sizeBytes?: number;
      sha256?: string;
    };

    const documentType = String(body.documentType || "").trim();
    const originalName = String(body.originalName || "").trim();
    const mimeType = String(body.mimeType || "").trim();
    const sizeBytes = Number(body.sizeBytes);
    const sha256 = String(body.sha256 || "").trim().toLowerCase();

    if (!documentType) {
      return NextResponse.json({ error: "documentType is required" }, { status: 400 });
    }
    validateDocumentUpload({ originalName, mimeType, sizeBytes, sha256 });

    const storageKey = createDocumentStorageKey({
      studentProfileId: profile.id,
      documentType,
      originalName,
      sha256,
    });
    const exp = Math.floor(Date.now() / 1000) + DOCUMENT_UPLOAD_TOKEN_TTL_SECONDS;
    const token = signDocumentUploadPayload(
      { studentProfileId: profile.id, documentType, originalName, mimeType, sizeBytes, sha256, storageKey, exp },
      secret
    );

    return NextResponse.json({
      method: "PUT",
      uploadUrl: `${req.nextUrl.origin}/api/documents/upload-direct?token=${encodeURIComponent(token)}`,
      expiresAt: new Date(exp * 1000).toISOString(),
      headers: {
        "content-type": mimeType,
        "x-kaxi-file-sha256": sha256,
      },
      maxBytes: sizeBytes,
      storageKey,
    });
  } catch (err) {
    if (err instanceof AuthBridgeError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    if (isExpectedValidationError(err)) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid upload request" }, { status: 400 });
    }
    console.error("[POST /api/documents/upload-intent]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 5: `upload-direct/route.ts` 필드명 갱신** — 44줄 `actor: \`student:${payload.studentRef}\``→`actor: \`student:${payload.studentProfileId}\``, 51줄 `studentRef: payload.studentRef,`→`studentProfileId: payload.studentProfileId,`.

- [ ] **Step 6: 테스트 실행 — 전체 통과 확인**

Run: Task 1 Step 2와 동일 명령
Expected: PASS. 이어서 `grep -rn "studentRef" src/app/api/documents src/lib/documents` → 출력 없음.

- [ ] **Step 7: 커밋**

```bash
git add src/app/api/documents scripts/test-document-flow.ts
git commit -m "fix(security): require student session on document endpoints, remove studentRef capability URLs"
```

---

### Task 3: Documents.tsx — localStorage 신원 제거 + 로그인 유도

**Files:**
- Modify: `src/components/kbridge/Documents.tsx` (121-128 `getStudentRef` 삭제, 134/142-181 상태·fetch, 188-235 업로드 body, 렌더 상단에 로그인 CTA)

**Interfaces:**
- Consumes: Task 2의 새 API 계약 (GET 무파라미터, 401 시 `{ code: "forbidden" }`).
- Produces: UI 동작 — 미로그인 시 체크리스트는 FALLBACK_DOCS로 열람 가능하되 업로드 대신 `/student/login` 이동 버튼 노출.

- [ ] **Step 1: 구현** (컴포넌트 테스트 인프라 부재 — 검증은 Step 2 타입체크/린트 + Step 3 수동 확인)

변경 내용:
1. `getStudentRef` 함수(121-128줄)와 `studentRef` state(134줄), `setStudentRef` useEffect(174-176줄) 삭제. `authRequired` state 추가: `const [authRequired, setAuthRequired] = useState(false);`
2. `loadDocuments`를 파라미터 없는 형태로 교체:

```tsx
const loadDocuments = useCallback(async () => {
  setLoading(true);
  setError(null);
  setWorkspaceIssue(null);
  try {
    const res = await fetch("/api/documents");
    const data = await res.json();
    if (res.status === 401 || res.status === 403) {
      setAuthRequired(true);
      setServerBacked(false);
      setDocuments(FALLBACK_DOCS);
      return;
    }
    if (!res.ok) {
      setServerBacked(false);
      setWorkspaceIssue({
        error: data.error,
        detail: data.detail,
        operatorHint: data.operatorHint,
        requirements: Array.isArray(data.requirements) ? data.requirements : [],
      });
      setError(data.error || "문서 목록을 불러오지 못했습니다.");
      setDocuments(FALLBACK_DOCS);
      return;
    }
    setAuthRequired(false);
    setDocuments(data.documents || []);
    setServerBacked(true);
  } catch (err) {
    setServerBacked(false);
    setWorkspaceIssue(null);
    setError(err instanceof Error ? err.message : String(err));
    setDocuments(FALLBACK_DOCS);
  } finally {
    setLoading(false);
  }
}, []);
```

호출 useEffect는 `useEffect(() => { void loadDocuments(); }, [loadDocuments]);`로.
3. `triggerUpload`: `authRequired`면 파일 선택 대신 로그인 이동:

```tsx
const triggerUpload = (document: StudentDocument) => {
  if (authRequired) {
    window.location.href = "/student/login";
    return;
  }
  uploadTarget.current = document;
  fileRef.current?.click();
};
```

4. `onFile`: `!studentRef` 가드 제거, intent body에서 `studentRef` 필드 제거, 마지막 `await loadDocuments(studentRef)`→`await loadDocuments()`.
5. 렌더 상단(진행률 카드 위)에 `authRequired && (...)` 배너 — 파일 내 기존 error/workspaceIssue 배너와 같은 카드 스타일 재사용:

```tsx
{authRequired && (
  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
    <p className="font-medium">
      {lang === "ko" ? "문서 업로드는 로그인 후 이용할 수 있습니다." : "Sign in to upload documents."}
    </p>
    <button
      type="button"
      className="mt-2 rounded-md bg-primary px-3 py-1.5 text-primary-foreground"
      onClick={() => { window.location.href = "/student/login"; }}
    >
      {lang === "ko" ? "학생 로그인" : "Student sign in"}
    </button>
  </div>
)}
```

(파일 기존 스타일이 인라인 `lang === "ko" ?` 삼항이므로 동일 관용구 사용 — i18n 통합은 범위 밖.)

- [ ] **Step 2: 타입체크·린트 통과 확인**

Run: `cd /Users/sunsu/Desktop/KAXI && bunx tsc --noEmit && bunx eslint src/components/kbridge/Documents.tsx src/app/api/documents --no-warn-ignored`
Expected: 에러 0. (`tsc --noEmit`가 프로젝트 전체에서 studentRef 잔재 참조도 함께 잡아준다.)

- [ ] **Step 3: 수동 확인 (증거 수집)**

Run: `bun run dev` 후 브라우저에서 `http://localhost:3000/ko/docs` 접속.
Expected: 미로그인 상태에서 체크리스트 렌더 + "학생 로그인" 배너 노출, 업로드 버튼 클릭 시 `/student/login` 이동. 네트워크 탭에서 `GET /api/documents`가 401이고 URL에 studentRef 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/components/kbridge/Documents.tsx
git commit -m "fix(documents): drop localStorage identity, gate uploads behind student login"
```

---

### Task 4: /api/ai/chat 레이트리밋 보수적 기본값

**Files:**
- Modify: `src/lib/api/security.ts` (파일 하단에 상수 2개 추가)
- Modify: `src/app/api/ai/chat/route.ts:33,41`
- Test: `scripts/test-chat-security.ts`

**Interfaces:**
- Produces: `AI_CHAT_DEFAULT_RATE_LIMIT = 10` (분당), `AI_CHAT_DEFAULT_DAILY_QUOTA = 100` — `@/lib/api/security` export. env(`AI_CHAT_RATE_LIMIT`/`AI_CHAT_DAILY_QUOTA`)로 여전히 오버라이드 가능하며 명시적 `"unlimited"`도 유효(`parseLimit` 기존 동작).

- [ ] **Step 1: 실패하는 테스트 작성** — `scripts/test-chat-security.ts`는 DB 없이 순수 헬퍼를 검증하는 파일이다 (`import { strict as assert } from "assert"`, 라우트 호출 없음). 같은 스타일로 파일 하단 `console.log("PASS ...")` 직전에 추가:

```ts
import {
  AI_CHAT_DEFAULT_RATE_LIMIT,
  AI_CHAT_DEFAULT_DAILY_QUOTA,
  parseLimit,
} from "../src/lib/api/security";

assert.equal(AI_CHAT_DEFAULT_RATE_LIMIT, 10);
assert.equal(AI_CHAT_DEFAULT_DAILY_QUOTA, 100);
// env 미설정 → 보수적 기본값 (무제한 아님)
assert.equal(parseLimit(undefined, AI_CHAT_DEFAULT_RATE_LIMIT), 10);
assert.equal(parseLimit(undefined, AI_CHAT_DEFAULT_DAILY_QUOTA), 100);
// 명시적 무제한은 여전히 유효
assert.equal(parseLimit("unlimited", AI_CHAT_DEFAULT_RATE_LIMIT), 0);
```

(import는 파일 상단 기존 import 블록에 합칠 것.)

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd /Users/sunsu/Desktop/KAXI && bun run test:chat-security`
Expected: FAIL — `AI_CHAT_DEFAULT_RATE_LIMIT` export 부재로 컴파일/단언 실패

- [ ] **Step 3: 구현** — `src/lib/api/security.ts` 파일 끝에:

```ts
// /api/ai/chat 기본 한도 — env 미설정 시 무제한이 되지 않도록 하는 보수적 기본값.
// 운영에서 조정은 AI_CHAT_RATE_LIMIT / AI_CHAT_DAILY_QUOTA env로 (명시적 "unlimited" 허용).
export const AI_CHAT_DEFAULT_RATE_LIMIT = 10;
export const AI_CHAT_DEFAULT_DAILY_QUOTA = 100;
```

`src/app/api/ai/chat/route.ts` — import에 두 상수 추가 후:
- 33줄: `limit: parseLimit(process.env.AI_CHAT_RATE_LIMIT, 0),` → `limit: parseLimit(process.env.AI_CHAT_RATE_LIMIT, AI_CHAT_DEFAULT_RATE_LIMIT),`
- 41줄: `parseLimit(process.env.AI_CHAT_DAILY_QUOTA, 0)` → `parseLimit(process.env.AI_CHAT_DAILY_QUOTA, AI_CHAT_DEFAULT_DAILY_QUOTA)`

- [ ] **Step 4: 테스트 실행 + 라우트 배선 확인**

Run: `bun run test:chat-security && grep -n "AI_CHAT_DEFAULT" src/app/api/ai/chat/route.ts`
Expected: 테스트 PASS + grep 출력에 33줄·41줄 두 곳 (기본값 0 잔재 없음: `grep -n "AI_CHAT_RATE_LIMIT, 0\|AI_CHAT_DAILY_QUOTA, 0" src/app/api/ai/chat/route.ts` → 출력 없음)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/security.ts src/app/api/ai/chat/route.ts scripts/test-chat-security.ts
git commit -m "fix(security): conservative default rate limits for public ai/chat endpoint"
```

---

### Task 5: 인가 모델 결정 문서 (RLS 비의존 명문화)

**Files:**
- Create: `docs/security/authorization-model.md`

- [ ] **Step 1: 문서 작성** — 아래 내용 그대로 생성:

```markdown
# KAXI 인가(Authorization) 모델

**결정 (2026-07-10): 인가의 단일 진실원천은 앱 레벨이다. Supabase RLS는 이 앱의 방어 경계가 아니다.**

## 왜

런타임의 모든 DB 접근이 RLS를 우회하는 특권 커넥션을 사용한다:

- Prisma — DB 소유자 커넥션 (전 repository 모듈).
- Supabase service-role 클라이언트 — RLS 우회 키. 사용처(전수):
  - `src/lib/chat/persistence.ts` (chat_sessions, chat_attachments, retrieval_runs)
  - `src/lib/handoffs/admin.ts` (handoff_tasks, leads, lead_contacts, chat_messages, handoff_consent_evidence)
  - `src/lib/ops/events.ts`, `src/lib/ops/rag-system-health.ts`
  - `src/app/api/chat-attachments/route.ts`

따라서 RLS 정책이 존재하더라도 어떤 요청 경로에서도 강제되지 않는다.
"RLS가 지켜줄 것"이라는 가정으로 앱 레벨 체크를 생략하면 그대로 취약점이 된다.

## 규칙

1. 모든 API 라우트는 앱 레벨 인가를 직접 수행한다:
   - 관리자: `requireAdmin` (`src/lib/api/security.ts`)
   - 학생/파트너: `requireKaxiUser` (`src/lib/supabase/auth.ts`)
   - 서버 간: HMAC 서명 (`src/lib/n8n/signature.ts`, 문서 업로드 토큰 등)
2. 새 런타임 DB 접근은 Prisma를 기본으로 한다. service-role 클라이언트 사용은
   위 사용처 목록에 있는 모듈로 한정하고, 새로 추가할 경우 이 문서를 갱신한다.
3. service-role 경로의 손수 작성 SQL은 Prisma 마이그레이션과 드리프트할 수 있다 —
   `bun run test:schema` (스키마 패리티 게이트)가 CI에서 이를 감시한다.
4. 코드 리뷰 체크: 새 라우트에 인가 헬퍼 호출이 없다면 그것은 버그다
   (공개 의도라면 라우트 파일에 주석으로 명시).
```

- [ ] **Step 2: 커밋**

```bash
git add docs/security/authorization-model.md
git commit -m "docs(security): declare app-level authorization as the single enforcement boundary"
```

---

### Task 6: 최종 검증 게이트

- [ ] **Step 1: 문서·채팅 테스트 재실행 + 타입체크**

Run:
```bash
cd /Users/sunsu/Desktop/KAXI
export TEST_DATABASE_URL="postgresql://sunsu@localhost:5433/kaxi_test?schema=public"
export PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="예, 동의합니다 (Recommended)"
bun run test:documents && bun run test:document-verification && bun run test:chat-security && bunx tsc --noEmit
```
Expected: 4개 모두 성공 (test:document-verification은 commitDocumentUpload 시그니처 변경의 간접 영향 확인용).

- [ ] **Step 2: 전체 빌드**

Run: `bun run build` (로컬에서 — Codex 샌드박스 아님)
Expected: 빌드 성공. route.ts export 규칙 위반 없음 확인.

- [ ] **Step 3: 증거 요약 보고** — 각 명령의 실제 출력(마지막 10줄)을 모아 보고. 실패 시 여기서 멈추고 보고만.
