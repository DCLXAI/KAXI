# S5 — 학생 대시보드·문서 슬라이스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 학생 워크스페이스(`/student` 대시보드 + `/[locale]/docs` 문서)에 확정 아이덴티티를 적용하고, 진단↔계정 연결(`DiagnosisLead.userId`)과 문서 심사 이메일 알림(best-effort)을 배선한다.

**Architecture:** 정찰 결과 스펙 항목 3개는 **이미 운영자 선작업으로 완료**됨 — (a) `/documents` 데드링크는 `student/page.tsx`가 이미 `/${locale}/docs` 사용, (b) `student/page.tsx`의 `tr(...,"ko")` 고정은 이미 `workspaceLocale(user.locale)` 동적 처리, (c) 문서 심사 **인앱** 알림은 `reviewDocumentItem` 트랜잭션 내 `notifyDocumentReview` 배선 완료 + `WorkspaceNotifications` 읽기 UI 배포됨. 따라서 S5의 실작업은 **리스킨 + DiagnosisLead.userId + 이메일 어댑터** 세 가지다.

**Tech Stack:** Next.js 16(App Router, 서버 컴포넌트), Tailwind 브랜드 토큰, `<KaxiCat>`, shadcn `Card`, Prisma(추가형 마이그레이션, **로컬만**), nodemailer(lazy, best-effort SMTP).

## Global Constraints

- **스키마 변경은 추가형만**. 원격 DB(Supabase) 리셋·삭제·파괴적 마이그레이션 금지 — 로컬 PG(:5433 수동 기동)에만 `migrate dev`. 기존 컬럼/제약 변경 금지.
- 브랜드 토큰(`src/app/globals.css`) 변경 금지. 하드코딩 색(hex/arbitrary `[#...]`) 금지 — `bg-card`/`bg-background`/`bg-muted`/`text-foreground`/`text-muted-foreground`/`text-primary`/`border-border` 토큰 클래스만. (문서의 상태색 `bg-emerald-500`/`bg-rose-500`/`bg-amber-500`/`bg-sky-500`는 대응 시맨틱 토큰이 없으므로 **그대로 둔다** — 리스킨 대상 아님.)
- 헤드라인은 `font-serif`, 본문은 기본(Pretendard). 마스코트는 `<KaxiCat state size inverted label>`(`@/components/brand/KaxiCat`). 빈 상태(empty)=`nap`/`napz`, 환영/성공=`happy`, 밝은 배경이므로 `inverted` 미사용.
- i18n: 신규 문구는 **레거시 `tr()` + `translations.ts`** 방식 유지(대시보드가 이 방식 사용). 신규 키는 ko/vi/mn/en **4개 로케일 전부** 추가. `i18n-parity` 가드는 `messages/*.json`만 검사하므로 `translations.ts` 키는 수동 4로케일 정합 확인.
- 이메일은 **best-effort**: SMTP env 미설정 시 조용히 skip(인앱 알림은 유지, 503/예외 금지). 발송은 반드시 DB 트랜잭션 **커밋 이후·라우트 레벨**에서(트랜잭션 내 네트워크 호출 금지). 실패해도 심사 처리 성공 응답에 영향 없음.
- 커밋은 `slice/s5-dashboard`에서만, push 금지. origin/main은 상시 이동 → push 직전 재fetch·rebase.
- 시각 검증: 배포 전 Playwright로 `/student`·`/[locale]/docs`(데스크톱+모바일 390px, ko/vi) 스크린샷 → 사용자 검수.

---

### Task 1: `DiagnosisLead.userId` 스키마 + 로컬 마이그레이션 + `/api/leads` POST 옵셔널 연결

**Files:**
- Modify: `prisma/postgres/schema.prisma`(DiagnosisLead 모델, User 모델 역참조)
- Create: `prisma/postgres/migrations/<ts>_diagnosis_lead_user/migration.sql`(migrate dev 생성)
- Modify: `src/app/api/leads/route.ts`(POST 핸들러)

**Interfaces:**
- Consumes: `getCurrentKaxiUser()` (`src/lib/supabase/auth.ts:256`) — 로그인 사용자 `User`(`.id`) 또는 `null` 반환, 리다이렉트 없음.
- Produces: `DiagnosisLead.userId String?`(nullable), `User.diagnosisLeads DiagnosisLead[]` 역참조. Task 2가 `db.diagnosisLead.findMany({ where: { userId } })`로 소비.

- [ ] **Step 1: 스키마에 nullable userId + relation 추가**

`prisma/postgres/schema.prisma`의 `DiagnosisLead` 모델에 필드 추가(기존 `partnerRequests` 관계 아래, `@@index`들 위):
```prisma
  // 계정 연결 (로그인 상태로 저장 시)
  userId String?
  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
```
그리고 인덱스 목록에 추가:
```prisma
  @@index([userId])
```
`User` 모델에는 역참조 한 줄 추가(다른 relation 선언들 근처):
```prisma
  diagnosisLeads DiagnosisLead[]
```

- [ ] **Step 2: 마이그레이션 SQL 생성(적용 안 함) → 전진 적용**

로컬 PG(:5433) 기동됨, `.env.local`의 `DATABASE_URL`=`@localhost:5433`(오케스트레이터가 확인·복사 완료). **리셋 금지** — 절대 `migrate reset`/`db push --force`/`--accept-data-loss` 쓰지 말 것.

먼저 SQL만 생성(DB 미적용, 리셋 프롬프트 없음):
```bash
bunx prisma migrate dev --create-only --name diagnosis_lead_user --schema prisma/postgres/schema.prisma
```
그다음 전진 전용 적용(리셋 로직 없음, 드리프트 시 깨끗이 실패):
```bash
bunx prisma migrate deploy --schema prisma/postgres/schema.prisma
```
Expected: 새 마이그레이션 폴더 생성 + 로컬 DB에 `ALTER TABLE "diagnosis_leads" ADD COLUMN "userId" TEXT;` + FK(`ON DELETE SET NULL`) + 인덱스 적용. **원격 DB 금지 — 로컬 전용.** `migrate dev`가 리셋을 요구하거나 `migrate deploy`가 드리프트로 실패하면 **멈추고 오케스트레이터에 보고**(임의 reset 금지).

- [ ] **Step 3: 생성된 SQL 검토**

Run: `cat prisma/postgres/migrations/*diagnosis_lead_user*/migration.sql`
Expected: `ADD COLUMN "userId" TEXT` (NOT NULL 아님), FK `ON DELETE SET NULL`, `CREATE INDEX` on userId. 파괴적 구문(DROP/기존 컬럼 변경) 없음 확인.

- [ ] **Step 4: `/api/leads` POST에서 옵셔널 연결**

`src/app/api/leads/route.ts` POST 핸들러의 `db.diagnosisLead.create({ data: {...} })` 직전에 세션 조회 추가:
```ts
import { getCurrentKaxiUser } from "@/lib/supabase/auth";
// ...POST 핸들러 내, create 직전:
const kaxiUser = await getCurrentKaxiUser();
```
그리고 `create`의 `data` 객체에 추가:
```ts
    userId: kaxiUser?.id ?? null,
```
비로그인은 `null`(익명 저장 유지), 로그인은 연결. **클라이언트 변경 불필요** — 동일 오리진 fetch라 세션 쿠키가 자동 전송됨. rateLimit·기존 검증 로직 무변경.

- [ ] **Step 5: 클라이언트 생성 + 타입 확인**

Run: `bun run db:generate && bunx tsc --noEmit`
Expected: PASS. `db.diagnosisLead.create`의 `userId`가 타입에 존재.

- [ ] **Step 6: Commit**
```bash
git add prisma/postgres/schema.prisma prisma/postgres/migrations src/app/api/leads/route.ts
git commit -m "feat(diagnosis): link DiagnosisLead to logged-in user (nullable userId)"
```

---

### Task 2: "내 진단 이력" 조회 헬퍼 + 학생 대시보드 에디토리얼 리스킨

**Files:**
- Modify: `src/app/student/page.tsx`
- Modify: `src/lib/i18n/translations.ts`(신규 키 4로케일)

**Interfaces:**
- Consumes: `DiagnosisLead.userId`(Task 1), `tr(key, locale)`, `<KaxiCat>`, shadcn `Card`.

- [ ] **Step 1: 진단 이력 키 4로케일 추가**

`src/lib/i18n/translations.ts`의 대시보드 키 그룹(`student_my_page`/`student_cases`/`student_documents`/`empty_state` 근처)에 신규 키 추가. 각 키는 ko/vi/mn/en **전부**:
- `student_diagnoses` — ko "내 진단 이력" / vi "Lịch sử chẩn đoán" / mn "Миний оношилгооны түүх" / en "My diagnoses"
- `diagnosis_empty` — ko "저장된 진단이 없어요. 진단을 완료하면 여기에 모여요." / vi "Chưa có chẩn đoán nào được lưu." / mn "Хадгалсан оношилгоо алга." / en "No saved diagnoses yet."
- `diagnosis_view` — ko "결과 보기" / vi "Xem kết quả" / mn "Үр дүн харах" / en "View result"

(기존 키의 실제 문자열 톤과 맞춰 자연스럽게. 값 확정이 애매하면 기존 키 스타일을 따른다.)

- [ ] **Step 2: 진단 이력 데이터 조회**

`src/app/student/page.tsx`의 `profile` 조회 뒤에 추가:
```ts
  const diagnoses = await db.diagnosisLead.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, pathKey: true, estimatedCost: true, createdAt: true },
  });
```

- [ ] **Step 3: 대시보드 에디토리얼 리스킨 + KaxiCat**

`src/app/student/page.tsx` 렌더를 브랜드 아이덴티티로:
- `<main>` 배경 `bg-background`(현 `bg-muted/30` → 아이보리 톤 유지), 컨테이너 여백은 현행 유지.
- 페이지 헤더: `<h1>`에 `font-serif`(현 `text-2xl font-semibold` → `font-serif text-3xl`), 상단에 작은 환영 마스코트 `<KaxiCat state="happy" size={40} />`를 h1 옆 또는 위에 배치(과하지 않게 1개).
- 각 `Card`는 shadcn 기본이 이미 `--card` 브랜드 배경을 씀 — `CardTitle`을 `font-serif`로, 아이콘은 유지.
- **빈 상태에 마스코트**: 케이스/문서/진단 섹션의 empty 분기에서 밋밋한 텍스트 대신 `<KaxiCat state="nap" size={48} />` + 안내문(`text-muted-foreground text-sm`) 세로 정렬(`flex flex-col items-center gap-2 py-6`). 문서 empty의 업로드 링크(`/${locale}/docs`)는 유지.

- [ ] **Step 4: 진단 이력 섹션 추가**

케이스/문서 `grid` 아래에 새 `Card`(전폭 또는 grid 3번째):
- `CardTitle`(`font-serif`) = `tr("student_diagnoses", locale)`.
- `diagnoses.length === 0` → KaxiCat `nap` empty(`tr("diagnosis_empty", locale)`).
- 있으면 각 리드: `pathKey`(사람이 읽을 라벨은 기존 진단 라벨 매핑이 있으면 사용, 없으면 `pathKey` 원문), `estimatedCost`(`Intl.NumberFormat(workspaceDateLocale[locale])` KRW 포맷), `formatDate(createdAt, locale)`. 결과 링크는 진단 결과를 다시 볼 라우트가 없으면 텍스트만 표시(신규 결과 라우트는 **비범위** — 만들지 않음). 행 스타일은 기존 케이스/문서 행(`rounded-md border bg-background px-3 py-2 text-sm`)과 통일.

- [ ] **Step 5: 검증**

Run: `bunx tsc --noEmit && bunx eslint src/app/student/page.tsx` — PASS.
`grep -nP "#[0-9a-fA-F]{3,6}|\[#" src/app/student/page.tsx` — 하드코딩 색 0건.
신규 4키가 ko/vi/mn/en 모두 있는지 육안 확인.

- [ ] **Step 6: Commit**
```bash
git add src/app/student/page.tsx src/lib/i18n/translations.ts
git commit -m "feat(student): editorial dashboard reskin + diagnosis history + KaxiCat empty states"
```

---

### Task 3: 문서 화면(`Documents.tsx`) 에디토리얼 리스킨

**Files:**
- Modify: `src/components/kbridge/Documents.tsx`

**Interfaces:**
- Consumes: 기존 `UI_COPY: Record<Lang, {...}>`, `tr(key, lang)`, `<KaxiCat>`. 업로드/심사 로직·API 호출(`/api/documents`, `upload-intent`, `upload-direct`) **무변경**.

- [ ] **Step 1: 헤더·타이틀 세리프화**

`Documents.tsx`의 화면 제목/섹션 헤더에 `font-serif` 적용(현 sans 굵은 제목 → 세리프). 트랙 스위치(D-2/D-4)·4단계 탭(`school/admission/visa/arrival`)의 활성 상태는 이미 `border-primary`/`bg-primary/5` 브랜드 토큰 사용 — 유지. 색 하드코딩 추가 금지.

- [ ] **Step 2: 빈 상태·로딩·인증배너에 KaxiCat**

- 문서 목록이 비었거나 로그인 필요(`authRequired`) 배너: 밋밋한 텍스트 대신 `<KaxiCat state="nap" size={48} />` + 안내문 + 기존 로그인 CTA(`/login?next=...`) 유지. **인증 로직·loginHref 계산 무변경**.
- 로딩 스피너(있으면)를 `<KaxiCat state="running" size={40} />`로 교체(진단폼 S2와 동일 패턴).
- 문서 상태 아이콘/뱃지(`statusIcon`/`statusTone`/`requirementBadge`)의 raw 팔레트 색은 **그대로 둔다**(시맨틱 토큰 없음).

- [ ] **Step 3: 카드 톤 정리**

문서별 카드 컨테이너를 대시보드와 통일된 `border-border bg-card`(또는 기존 shadcn Card 유지) 톤으로. 하드코딩 배경색이 있으면 토큰으로 치환. 업로드/교체 버튼(주 CTA)은 `bg-primary`.

- [ ] **Step 4: 검증**

Run: `bunx tsc --noEmit && bunx eslint src/components/kbridge/Documents.tsx` — PASS.
`grep -nP "#[0-9a-fA-F]{3,6}|\[#" src/components/kbridge/Documents.tsx` — 신규 하드코딩 색 0건(기존 raw 팔레트 클래스는 무관, hex/arbitrary만 검사).
업로드/API 호출 라인이 diff에 없음(className+KaxiCat만) 확인.

- [ ] **Step 5: Commit**
```bash
git add src/components/kbridge/Documents.tsx
git commit -m "feat(docs): editorial reskin of documents workspace with KaxiCat states"
```

---

### Task 4: 문서 심사 이메일 알림 (best-effort SMTP 어댑터)

**Files:**
- Create: `src/lib/notifications/email.ts`
- Create: `scripts/test-notification-email.ts`
- Modify: `src/lib/notifications/domain.ts`(리뷰 이메일 페이로드 빌더 export)
- Modify: `src/app/api/admin/documents/[id]/review/route.ts`(커밋 후 best-effort 발송)
- Modify: `.env.example`(SMTP 변수 문서화)
- Modify: `package.json`(nodemailer 의존성)

**Interfaces:**
- Produces: `sendNotificationEmail({ to, subject, body, href? }): Promise<{ status: "sent" | "skipped" | "error" }>` — env 미설정 시 `skipped`, 예외 삼킴(throw 안 함). `buildDocumentReviewEmail(documentItemId, status, reviewStatus, tx?)` — 수신자 이메일/로케일/렌더된 subject·body 반환(없으면 `null`).

- [ ] **Step 1: nodemailer 추가**

Run: `bun add nodemailer && bun add -d @types/nodemailer`
Expected: `package.json`에 `nodemailer` 추가. (best-effort — 런타임에 SMTP env 없으면 로드/발송 안 함.)

- [ ] **Step 2: 이메일 어댑터 (실패 test 먼저)**

Create `scripts/test-notification-email.ts`:
```ts
import assert from "node:assert";
import { sendNotificationEmail, __setTransportForTest } from "../src/lib/notifications/email";

async function main() {
  // env 미설정 → skipped
  delete process.env.SMTP_HOST;
  const skipped = await sendNotificationEmail({ to: "a@b.com", subject: "s", body: "b" });
  assert.equal(skipped.status, "skipped", "no SMTP env → skipped");

  // mock transport → sent, subject 전달 확인
  const calls: any[] = [];
  __setTransportForTest({ sendMail: async (m: any) => { calls.push(m); return { messageId: "x" }; } });
  process.env.SMTP_HOST = "smtp.test"; process.env.SMTP_FROM = "no-reply@kaxi";
  const sent = await sendNotificationEmail({ to: "a@b.com", subject: "심사완료", body: "본문", href: "/ko/docs" });
  assert.equal(sent.status, "sent");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].to, "a@b.com");
  assert.equal(calls[0].subject, "심사완료");

  // 수신자 없음 → skipped
  __setTransportForTest({ sendMail: async () => { throw new Error("should not send"); } });
  const noRecipient = await sendNotificationEmail({ to: "", subject: "s", body: "b" });
  assert.equal(noRecipient.status, "skipped");

  console.log("PASS notification email adapter");
}
main().catch((e) => { console.error(e); process.exit(1); });
```
Run: `bun run scripts/test-notification-email.ts` → FAIL(모듈 없음).

- [ ] **Step 3: 어댑터 구현**

Create `src/lib/notifications/email.ts`:
```ts
import type { Transporter } from "nodemailer";

type SendInput = { to: string; subject: string; body: string; href?: string | null };
type SendResult = { status: "sent" | "skipped" | "error" };

let testTransport: { sendMail: (m: unknown) => Promise<unknown> } | null = null;
export function __setTransportForTest(t: typeof testTransport) { testTransport = t; }

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

async function getTransport() {
  if (testTransport) return testTransport;
  const nodemailer = await import("nodemailer");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  }) as unknown as Transporter;
}

export async function sendNotificationEmail(input: SendInput): Promise<SendResult> {
  if (!input.to || !smtpConfigured()) return { status: "skipped" };
  try {
    const transport = await getTransport();
    const text = input.href
      ? `${input.body}\n\nhttps://kaxi.vercel.app${input.href}`
      : input.body;
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text,
    });
    return { status: "sent" };
  } catch (err) {
    console.error("[notification email] send failed", err instanceof Error ? err.message : err);
    return { status: "error" };
  }
}
```
Run: `bun run scripts/test-notification-email.ts` → PASS.

- [ ] **Step 4: 리뷰 이메일 페이로드 빌더**

`src/lib/notifications/domain.ts`에 `notifyDocumentReview`가 이미 만드는 4로케일 카피·유저 조회를 재사용해, 커밋 후 발송용 빌더를 export:
```ts
export async function buildDocumentReviewEmail(
  documentItemId: string,
  status: string,
  reviewStatus: string,
  tx?: NotificationDb,
): Promise<{ to: string; subject: string; body: string; href: string } | null> {
  // notifyDocumentReview와 동일한 조회(documentItem→user)로 user.email/locale 확보.
  // user.email 없으면 null. copy는 notifyDocumentReview의 로케일 카피를 재사용(중복 정의 금지 — 공통 함수로 추출).
}
```
구현 시 `notifyDocumentReview` 내부의 카피 생성 로직을 `buildDocumentReviewCopy(...)` 같은 내부 함수로 추출해 인앱/이메일이 **동일 문구**를 쓰게 하라(DRY). subject=copy.title, body=copy.message, href=`/{locale}/docs`.

- [ ] **Step 5: 라우트에서 커밋 후 best-effort 발송**

`src/app/api/admin/documents/[id]/review/route.ts`에서 `reviewDocumentItem(...)`가 **resolve된 뒤**(트랜잭션 밖) 추가:
```ts
import { buildDocumentReviewEmail } from "@/lib/notifications/domain";
import { sendNotificationEmail } from "@/lib/notifications/email";
// ...reviewDocumentItem 성공 후:
try {
  const mail = await buildDocumentReviewEmail(id, status, reviewStatus);
  if (mail) await sendNotificationEmail(mail);
} catch (err) {
  console.error("[review email] skipped", err instanceof Error ? err.message : err);
}
```
심사 처리 응답은 이메일 결과와 **무관**(best-effort). 트랜잭션 내부에는 절대 넣지 않는다.

- [ ] **Step 6: `.env.example` 문서화**

`.env.example`에 주석 블록 추가:
```
# 알림 이메일(best-effort). 미설정 시 인앱 알림만 동작.
# Supabase Auth에 쓰는 동일 SMTP 계정을 재사용 가능.
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM="KAXI <no-reply@example.com>"
```

- [ ] **Step 7: 검증 + 배선**

Run: `bunx tsc --noEmit && bun run scripts/test-notification-email.ts` — PASS.
`scripts/test-notification-email.ts`를 `package.json`의 도메인 테스트 묶음(`ci:domain` 또는 유사)에 배선(기존 컨벤션 확인 후). 배선 위치 불명확하면 오케스트레이터에 보고.

- [ ] **Step 8: Commit**
```bash
git add src/lib/notifications/email.ts src/lib/notifications/domain.ts src/app/api/admin/documents/[id]/review/route.ts scripts/test-notification-email.ts .env.example package.json bun.lock
git commit -m "feat(notifications): best-effort SMTP email for document review (dormant without env)"
```

---

### Task 5: 최종 게이트 + 시각 검수 + 배포 (오케스트레이터)

- [ ] **Step 1: 통합 검증** — `bunx tsc --noEmit` + `bun run build` + `bun run test:i18n-parity` + `bun run scripts/test-notification-email.ts` + 관련 도메인/ops 테스트. 인증·업로드·심사 흐름 회귀 없음(로직 무변경 확인).
- [ ] **Step 2: 스크린샷** — 좀비 `next dev` pkill 후 dev 기동, 로컬 DB에 로그인 세션 필요한 `/student`는 인증 우회가 어려우면 컴포넌트/문서(`/ko/docs`·`/vi/docs`) 위주로 캡처(데스크톱+모바일 390px). 빈 상태 마스코트·세리프 확인 → 사용자 검수 루프.
- [ ] **Step 3: 리뷰 + 배포** — 태스크별 리뷰(로직 무변경·스코프·하드코딩색·4로케일) + 전체 브랜치 리뷰. 최신 origin/main rebase → push origin HEAD:main → CI/배포 모니터링 → 프로덕션 `/student`·`/ko/docs` 확인 + `/api/health`·`/api/readiness` 200 + 미인증 `/api/documents` 401. **마이그레이션은 배포 워크플로가 Supabase에 적용** — 로컬에서 원격 DB에 직접 적용 금지.
