# Phase 0 — 전역 브랜드·완성도 기반 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 확정 아이덴티티(아이보리/웜다크 + 클레이 + KCAT 고양이)의 토큰·폰트·마스코트·전역 페이지·알림 뼈대를 한 번에 깐다 — 이후 S1~S6 슬라이스가 이 위에서 화면 단위로 진행된다.

**Architecture:** shadcn 시맨틱 CSS 변수(`--primary` 등)의 **값만 브랜드 팔레트로 재조율**하고(컴포넌트 무수정 전파), 채팅용 웜 다크는 `.chat-surface` 클래스 스코프로 같은 변수들을 재정의한다(전역 다크 토글 없음). 마스코트는 KCAT 투명 PNG 프레임을 `public/mascot/`로 이식해 `<KaxiCat>` 단일 컴포넌트로 소비한다. 알림은 추가형 Prisma 모델 + repository + fetch 기반 Resend 어댑터(미설정 시 인앱만).

**Tech Stack:** Next.js App Router(v16), Tailwind v4(`@theme`), next/font(local Pretendard + Google Noto Serif KR), sharp(아이콘 생성, 기존 의존성), Prisma, bun 테스트 스크립트.

## Global Constraints

- 스펙: `docs/superpowers/specs/2026-07-11-launch-readiness-redesign-design.md`. 팔레트 값은 스펙 §2.1 그대로: 아이보리 `#f0eee6`, 잉크 `#1f1e1d`, 클레이 `#c96442`, 채팅 다크 `#262521`/`#33312c`/`#d97757`.
- 스키마 변경은 **추가형만**(Notification 모델, 기존 테이블 불변). 원격 DB 직접 접근 금지 — 마이그레이션은 로컬 생성·커밋, 원격 적용은 배포 파이프라인.
- 신규 `test:*` 스크립트는 반드시 package.json의 `ci:ops` 또는 `ci:domain`에 배선(test-ci-quality-gates 가드).
- 사이트 전체 다크모드 토글 도입 금지(스펙 §7). `.dark` 클래스 값은 웜 다크 팔레트로 갱신만.
- 테스트 DB: `TEST_DATABASE_URL="postgresql://sunsu@localhost:5433/kaxi_test?schema=public" PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="예, 동의합니다 (Recommended)"`.
- KCAT 자산 원본: `/Users/sunsu/Desktop/KCAT/App/Resources/Game/` (자체 프로젝트 — 라이선스 문제 없음).
- 커밋은 작업 브랜치에서만, push 금지(오케스트레이터가 랜딩).

---

### Task 1: 브랜드 토큰 + 폰트

**Files:**
- Modify: `src/app/globals.css` (`:root`/`.dark` 변수 블록 교체, `@theme inline`의 `--font-*` 수정, `.chat-surface` 추가)
- Create: `src/fonts/PretendardVariable.woff2` (다운로드), `src/app/fonts.ts`
- Modify: `src/app/layout.tsx` (폰트 변수 클래스, themeColor)
- Modify: `tailwind.config.ts` (죽은 색 정의 제거)

**Interfaces:**
- Produces: Tailwind 클래스 `font-serif`(브랜드 세리프)·`font-sans`(Pretendard), 시맨틱 색상 클래스(`bg-background`, `text-primary` 등)가 브랜드 값으로 전파. `.chat-surface` 클래스(이후 S3가 채팅 루트에 부착).

- [ ] **Step 1: Pretendard 다운로드**

```bash
mkdir -p src/fonts
curl -fL -o src/fonts/PretendardVariable.woff2 \
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2"
ls -la src/fonts/PretendardVariable.woff2   # ~2MB 내외 확인
```
(실패 시 리포트에 명시하고 BLOCKED — 폰트 없이 진행 금지. 라이선스 SIL OFL.)

- [ ] **Step 2: `src/app/fonts.ts` 생성**

```ts
import localFont from "next/font/local";
import { Noto_Serif_KR } from "next/font/google";

export const pretendard = localFont({
  src: "../fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

// 헤드라인용. mn(키릴)은 Pretendard 폴백으로 커버.
export const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-serif-brand",
});
```

- [ ] **Step 3: `layout.tsx` 연결** — import 추가 후 `<html>`/`viewport` 수정:

```tsx
import { pretendard, notoSerifKr } from "./fonts";
```
`<html lang="ko" suppressHydrationWarning>` → `<html lang="ko" suppressHydrationWarning className={`${pretendard.variable} ${notoSerifKr.variable}`}>`
`viewport`의 `themeColor: "#000000"` → `themeColor: "#f0eee6"`.

- [ ] **Step 4: `globals.css` 토큰 교체**

`@theme inline` 블록에서 폰트 두 줄 교체:
```css
  --font-sans: var(--font-pretendard), ui-sans-serif, system-ui, sans-serif;
  --font-serif: var(--font-serif-brand), ui-serif, Georgia, serif;
```
(기존 `--font-sans: var(--font-geist-sans); --font-mono: var(--font-geist-mono);` 중 sans는 교체, mono 줄은 `--font-mono: ui-monospace, monospace;`로.)

`:root` 블록의 색 변수들을 브랜드 값으로 교체(radius·chart는 유지):
```css
:root {
  --radius: 0.75rem;
  --background: #f0eee6;
  --foreground: #1f1e1d;
  --card: #faf9f5;
  --card-foreground: #1f1e1d;
  --popover: #faf9f5;
  --popover-foreground: #1f1e1d;
  --primary: #c96442;
  --primary-foreground: #ffffff;
  --secondary: #e8e5db;
  --secondary-foreground: #3d3b36;
  --muted: #e8e5db;
  --muted-foreground: #6e6c66;
  --accent: #e4e0d3;
  --accent-foreground: #1f1e1d;
  --destructive: #b3261e;
  --border: #ddd9cc;
  --input: #ddd9cc;
  --ring: #c96442;
  --chart-1: #c96442;
  --chart-2: #116466;
  --chart-3: #2563eb;
  --chart-4: #b3892b;
  --chart-5: #6e6c66;
  --sidebar: #faf9f5;
  --sidebar-foreground: #1f1e1d;
  --sidebar-primary: #c96442;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #e8e5db;
  --sidebar-accent-foreground: #1f1e1d;
  --sidebar-border: #ddd9cc;
  --sidebar-ring: #c96442;
}
```

`.dark` 블록 전체를 웜 다크 값으로 교체하고, 동일 변수 세트를 갖는 `.chat-surface`를 추가(두 셀렉터를 콤마로 묶어 한 블록):
```css
.dark,
.chat-surface {
  --background: #262521;
  --foreground: #f0eee6;
  --card: #2d2b26;
  --card-foreground: #f0eee6;
  --popover: #2d2b26;
  --popover-foreground: #f0eee6;
  --primary: #d97757;
  --primary-foreground: #1f1e1d;
  --secondary: #33312c;
  --secondary-foreground: #e8e6de;
  --muted: #33312c;
  --muted-foreground: #a8a49a;
  --accent: #3a3831;
  --accent-foreground: #f0eee6;
  --destructive: #e2574a;
  --border: #3a3831;
  --input: #3a3831;
  --ring: #d97757;
  --chart-1: #d97757;
  --chart-2: #2d9d94;
  --chart-3: #60a5fa;
  --chart-4: #d4a72c;
  --chart-5: #a8a49a;
  --sidebar: #2d2b26;
  --sidebar-foreground: #f0eee6;
  --sidebar-primary: #d97757;
  --sidebar-primary-foreground: #1f1e1d;
  --sidebar-accent: #33312c;
  --sidebar-accent-foreground: #f0eee6;
  --sidebar-border: #3a3831;
  --sidebar-ring: #d97757;
}
```
(기존 `.dark { ... }` 블록의 나머지 잔여 변수 줄은 삭제. `@custom-variant dark` 줄은 유지 — 기존 `dark:` 사용처가 `.chat-surface.dark` 조합에서 동작.)

- [ ] **Step 5: `tailwind.config.ts` 정리** — 파일을 열어 `theme.extend.colors`(및 `darkMode` 설정) 블록만 삭제. `content` 경로 배열은 **유지**(플러그인·서드파티가 참조할 수 있음). 결과 파일이 사실상 `content`만 남으면 그대로 둔다.

- [ ] **Step 6: 검증**

```bash
bunx tsc --noEmit && bun run build 2>&1 | tail -5
```
Expected: tsc 클린, 빌드 성공. 이어 `grep -c "geist" src/app/globals.css` → 0.

- [ ] **Step 7: Commit**
```bash
git add src/fonts src/app/fonts.ts src/app/layout.tsx src/app/globals.css tailwind.config.ts
git commit -m "feat(brand): ivory/warm-dark token system, Pretendard + Noto Serif KR"
```

---

### Task 2: KaxiCat 마스코트 컴포넌트 + 브랜드 아이콘

**Files:**
- Create: `public/mascot/` (프레임 PNG 복사), `src/components/brand/KaxiCat.tsx`, `scripts/generate-brand-icons.ts`
- Create(스크립트 산출): `src/app/icon.png`, `src/app/apple-icon.png`, `public/og.png`
- Delete: `src/app/icon.svg` (PNG로 대체)
- Modify: `src/app/layout.tsx` (openGraph.images 추가)

**Interfaces:**
- Produces: `<KaxiCat state size inverted className label />` — `state: "running"|"breath"|"stretch"|"yawn"|"nap"|"napz"|"happy"`. 이후 태스크·슬라이스 전부 이걸 사용.

- [ ] **Step 1: 프레임 이식**

```bash
mkdir -p public/mascot
SRC=/Users/sunsu/Desktop/KCAT/App/Resources/Game
for f in cat_running_0 cat_running_1 cat_running_2 cat_running_3 cat_running_4 \
         pet_breath_0 pet_breath_1 pet_stretch_0 pet_stretch_1 \
         pet_yawn_0 pet_yawn_1 pet_nap_0 pet_nap_1 \
         pet_nap_z_0 pet_nap_z_1 pet_nap_z_2 pet_happy_0 pet_happy_1; do
  cp "$SRC/$f.png" public/mascot/
done
ls public/mascot | wc -l   # 18
```

- [ ] **Step 2: `src/components/brand/KaxiCat.tsx` 생성**

```tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type KaxiCatState =
  | "running" | "breath" | "stretch" | "yawn" | "nap" | "napz" | "happy";

const FRAMES: Record<KaxiCatState, string[]> = {
  running: [0, 1, 2, 3, 4].map((i) => `/mascot/cat_running_${i}.png`),
  breath: [0, 1].map((i) => `/mascot/pet_breath_${i}.png`),
  stretch: [0, 1].map((i) => `/mascot/pet_stretch_${i}.png`),
  yawn: [0, 1].map((i) => `/mascot/pet_yawn_${i}.png`),
  nap: [0, 1].map((i) => `/mascot/pet_nap_${i}.png`),
  napz: [0, 1, 2].map((i) => `/mascot/pet_nap_z_${i}.png`),
  happy: [0, 1].map((i) => `/mascot/pet_happy_${i}.png`),
};

const DEFAULT_FPS: Record<KaxiCatState, number> = {
  running: 10, breath: 2, stretch: 3, yawn: 3, nap: 2, napz: 2, happy: 4,
};

export function KaxiCat({
  state = "breath",
  size = 48,
  inverted = false,
  fps,
  className,
  label,
}: {
  state?: KaxiCatState;
  size?: number;
  /** 다크(chat) 표면에서 true — 검은 고양이를 흰색으로 반전 */
  inverted?: boolean;
  fps?: number;
  className?: string;
  /** 접근성 라벨. 없으면 장식 요소로 처리(aria-hidden) */
  label?: string;
}) {
  const frames = FRAMES[state];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    const ms = 1000 / (fps ?? DEFAULT_FPS[state]);
    const id = setInterval(() => setFrame((v) => (v + 1) % frames.length), ms);
    return () => clearInterval(id);
  }, [state, fps, frames.length]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 픽셀아트 프레임: 최적화 불필요, pixelated 유지
    <img
      src={frames[frame]}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      height={size}
      className={cn("select-none", className)}
      style={{ height: size, width: "auto", imageRendering: "pixelated",
               filter: inverted ? "invert(1)" : undefined }}
      draggable={false}
    />
  );
}
```

- [ ] **Step 3: 아이콘·OG 생성 스크립트** — `scripts/generate-brand-icons.ts` (sharp는 기존 의존성):

```ts
import sharp from "sharp";
import { mkdirSync } from "fs";

const CLAY = "#c96442";
const IVORY = "#f0eee6";
const INK = "#1f1e1d";
const CAT = "public/mascot/cat_running_0.png";

function roundedRect(size: number, radius: number, fill: string) {
  return Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${fill}"/></svg>`
  );
}

async function appIcon(out: string, size: number) {
  const cat = await sharp(CAT).resize({ height: Math.round(size * 0.5) }).toBuffer();
  await sharp(roundedRect(size, Math.round(size * 0.22), CLAY))
    .composite([{ input: cat, gravity: "center" }])
    .png()
    .toFile(out);
}

async function ogImage() {
  const cat = await sharp(CAT).resize({ height: 150 }).toBuffer();
  const svg = Buffer.from(`<svg width="1200" height="630">
    <rect width="1200" height="630" fill="${IVORY}"/>
    <rect x="0" y="602" width="1200" height="28" fill="${CLAY}"/>
    <text x="90" y="150" font-family="Apple SD Gothic Neo, sans-serif" font-size="34" font-weight="700" letter-spacing="6" fill="${CLAY}">KAXI</text>
    <text x="90" y="290" font-family="Apple SD Gothic Neo, serif" font-size="72" font-weight="700" fill="${INK}">한국 유학, 확실한 길로</text>
    <text x="90" y="390" font-family="Apple SD Gothic Neo, serif" font-size="72" font-weight="700" fill="${INK}">함께 달립니다.</text>
    <text x="90" y="480" font-family="Apple SD Gothic Neo, sans-serif" font-size="30" fill="#6e6c66">법무부 공식 출처 기반 비자 진단 · 검증된 행정사 연결</text>
  </svg>`);
  await sharp(svg).composite([{ input: cat, top: 420, left: 930 }]).png().toFile("public/og.png");
}

mkdirSync("public", { recursive: true });
await appIcon("src/app/icon.png", 512);
await appIcon("src/app/apple-icon.png", 180);
await ogImage();
console.log("brand icons generated: src/app/icon.png, src/app/apple-icon.png, public/og.png");
```

실행·검증:
```bash
bun run scripts/generate-brand-icons.ts && ls -la src/app/icon.png src/app/apple-icon.png public/og.png
rm src/app/icon.svg
```
(OG 텍스트는 로컬 macOS 폰트로 렌더 — 산출 PNG를 커밋하므로 CI/Vercel 폰트 불필요. 생성 후 `open public/og.png`로 한글 렌더 확인, 깨지면 font-family를 "AppleGothic"으로 교체 시도 후 리포트에 명시.)

- [ ] **Step 4: layout.tsx 메타에 OG 이미지 연결** — `openGraph: { ... }` 안에 추가:
```ts
    images: [{ url: "/og.png", width: 1200, height: 630 }],
```
같은 레벨에 트위터 카드도:
```ts
  twitter: { card: "summary_large_image", images: ["/og.png"] },
```

- [ ] **Step 5: 검증** — `bunx tsc --noEmit && bunx eslint src/components/brand/KaxiCat.tsx scripts/generate-brand-icons.ts` 클린, `bun run build` 성공.

- [ ] **Step 6: Commit**
```bash
git add public/mascot src/components/brand/KaxiCat.tsx scripts/generate-brand-icons.ts src/app/icon.png src/app/apple-icon.png public/og.png src/app/layout.tsx
git rm -q src/app/icon.svg 2>/dev/null; git add -u
git commit -m "feat(brand): KaxiCat mascot component, generated app icons and OG image"
```

---

### Task 3: 전역 페이지 (404·에러·로딩) + sitemap + 데모 문구 제거

**Files:**
- Create: `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/[locale]/loading.tsx`, `src/app/sitemap.ts`
- Modify: `src/components/diagnosis/DiagnosisResult.tsx` (문구), `public/robots.txt` (sitemap 참조)

**Interfaces:**
- Consumes: Task 2의 `<KaxiCat>`.

- [ ] **Step 1: `src/app/not-found.tsx`**

```tsx
import Link from "next/link";
import { KaxiCat } from "@/components/brand/KaxiCat";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <KaxiCat state="napz" size={72} label="잠자는 고양이" />
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">페이지를 찾을 수 없어요</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          주소가 바뀌었거나 존재하지 않는 페이지예요.
          <br />Page not found · Không tìm thấy trang · Хуудас олдсонгүй
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">홈으로</Link>
        <Link href="/ko/diagnose" className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground">3분 진단 시작</Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: `src/app/error.tsx`**

```tsx
"use client";

import { KaxiCat } from "@/components/brand/KaxiCat";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <KaxiCat state="yawn" size={72} label="놀란 고양이" />
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">잠깐 문제가 생겼어요</h1>
        <p className="mt-2 text-sm text-muted-foreground">일시적인 오류예요. 다시 시도해 주세요. · Something went wrong.</p>
      </div>
      <button onClick={reset} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        다시 시도
      </button>
    </main>
  );
}
```

- [ ] **Step 3: `src/app/[locale]/loading.tsx`**

```tsx
import { KaxiCat } from "@/components/brand/KaxiCat";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background">
      <KaxiCat state="running" size={56} label="불러오는 중" />
    </div>
  );
}
```

- [ ] **Step 4: `src/app/sitemap.ts`**

```ts
import type { MetadataRoute } from "next";

const BASE = "https://kaxi.vercel.app";
const LOCALES = ["ko", "vi", "mn", "en"] as const;
const VIEWS = ["", "/diagnose", "/schools", "/cost", "/docs", "/partners", "/consult", "/agent", "/privacy", "/terms"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return LOCALES.flatMap((locale) =>
    VIEWS.map((view) => ({
      url: `${BASE}/${locale}${view}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: view === "" ? 1 : 0.7,
    }))
  );
}
```
`public/robots.txt` 마지막에 한 줄 추가: `Sitemap: https://kaxi.vercel.app/sitemap.xml`

- [ ] **Step 5: 데모 문구 제거** — `src/components/diagnosis/DiagnosisResult.tsx`를 열어 다음을 교체(현재 ~120-123, ~144-147줄 부근, 라인은 흘러갔을 수 있으니 문자열로 검색):
  - `"결과를 저장하고 상담을 예약하세요 (데모: 관리자 화면에서 확인 가능)"` → `"결과를 저장하고 상담을 예약하세요"`
  - vi: `"Lưu kết quả và đặt lịch (demo)"` → `"Lưu kết quả và đặt lịch tư vấn"`
  - en: `"Save & book consultation (demo)"` → `"Save & book a consultation"`
  - mn 항목에 `(demo)`가 있으면 동일하게 제거.
  - 저장 성공 메시지 `"저장되었습니다! 관리자 화면에서도 확인 가능합니다"` 계열 → ko `"저장되었습니다. 상담 예약 시 이 결과가 함께 전달돼요."` / vi `"Đã lưu. Kết quả này sẽ được gửi kèm khi bạn đặt lịch tư vấn."` / en `"Saved. We'll attach this result when you book a consultation."` / mn `"Хадгаллаа. Зөвлөгөө захиалахад энэ үр дүн хавсаргагдана."`
  마지막으로 `grep -rn "demo\|데모\|관리자 화면" src/components/diagnosis/` → 잔존 0 확인.

- [ ] **Step 6: 검증** — `bunx tsc --noEmit` 클린, `bun run build` 성공 후 `curl -s localhost 빌드산출` 대신 빌드 로그에 `/sitemap.xml` 라우트 존재 확인(`grep sitemap` on build output). dev 서버로 `/nonexistent-page` 접속해 404 렌더 확인은 오케스트레이터 스크린샷 단계에서.

- [ ] **Step 7: Commit**
```bash
git add src/app/not-found.tsx src/app/error.tsx "src/app/[locale]/loading.tsx" src/app/sitemap.ts public/robots.txt src/components/diagnosis/DiagnosisResult.tsx
git commit -m "feat(global): branded 404/error/loading pages, sitemap, remove demo copy"
```

---

### Task 4: Notification 모델 + repository + 이메일 어댑터

**Files:**
- Modify: `prisma/postgres/schema.prisma` (Notification 모델 + User relation)
- Create: `prisma/postgres/migrations/<ts>_notifications/migration.sql` (prisma가 생성)
- Create: `src/lib/notifications/repository.ts`, `src/lib/notifications/email.ts`
- Test: `scripts/test-notifications.ts`, package.json `test:notifications` + `ci:ops` 배선

**Interfaces:**
- Produces:
  - `createNotification(input: { userId: string; type: NotificationType; titleKey: string; payload?: Record<string, unknown> }): Promise<Notification>` — 인앱 생성 + best-effort 이메일(`emailedAt` 기록).
  - `listNotificationsForUser(userId: string, opts?: { limit?: number }): Promise<Notification[]>`
  - `markAllRead(userId: string): Promise<number>`
  - `NotificationType = "document_reviewed" | "case_assigned" | "case_status" | "diagnosis_saved"`
  - email.ts: `sendNotificationEmail(input: { to: string; subject: string; text: string }): Promise<boolean>` — `RESEND_API_KEY`+`NOTIFY_EMAIL_FROM` 없으면 false(발송 안 함).

- [ ] **Step 1: 스키마 추가** — `schema.prisma`의 `model User` 관계 블록(auditEvents 줄 아래)에 `notifications Notification[]` 추가, 파일 말미에:

```prisma
model Notification {
  id        String    @id @default(cuid())
  userId    String
  type      String
  titleKey  String
  payload   Json      @default("{}")
  readAt    DateTime?
  emailedAt DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt])
  @@index([createdAt])
  @@map("notifications")
}
```

- [ ] **Step 2: 마이그레이션 생성(로컬 전용)**

```bash
DATABASE_URL="postgresql://sunsu@localhost:5433/kaxi_test?schema=public" \
  bunx prisma migrate dev --name notifications --create-only --schema prisma/postgres/schema.prisma
ls prisma/postgres/migrations | tail -1   # *_notifications 확인
DATABASE_URL="postgresql://sunsu@localhost:5433/kaxi_test?schema=public" \
  bunx prisma migrate deploy --schema prisma/postgres/schema.prisma
bun run db:generate
```

- [ ] **Step 3: 실패 테스트 작성** — `scripts/test-notifications.ts`:

```ts
import { prepareTestDb } from "./prepare-test-db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

prepareTestDb("notifications");

const { db } = await import("../src/lib/db");
const { createNotification, listNotificationsForUser, markAllRead } =
  await import("../src/lib/notifications/repository");

const user = await db.user.create({
  data: { role: "STUDENT", locale: "vi", email: "notify-test@example.com" },
});

// 이메일 미설정 환경: 인앱은 생성되고 emailedAt은 null이어야 한다
delete process.env.RESEND_API_KEY;
const n1 = await createNotification({
  userId: user.id,
  type: "document_reviewed",
  titleKey: "notifications.document_reviewed",
  payload: { documentType: "passport", reviewStatus: "APPROVED" },
});
assert(n1.id && n1.readAt === null, "notification must be created unread");
assert(n1.emailedAt === null, "email must be best-effort: no key -> emailedAt null");

const list = await listNotificationsForUser(user.id);
assert(list.length === 1 && list[0].id === n1.id, "listNotificationsForUser returns the row");

const marked = await markAllRead(user.id);
assert(marked === 1, `markAllRead must update 1 row, got ${marked}`);
const after = await listNotificationsForUser(user.id);
assert(after[0].readAt !== null, "readAt must be set after markAllRead");

// 잘못된 type 거부
let threw = false;
try {
  await createNotification({ userId: user.id, type: "bogus" as never, titleKey: "x" });
} catch { threw = true; }
assert(threw, "invalid type must throw");

console.log("PASS notifications: create (email best-effort), list, markAllRead, type guard");
process.exit(0);
```
package.json에 `"test:notifications": "bun run scripts/test-notifications.ts"` 추가, `ci:ops` 체인의 `test:readiness` 뒤에 `&& bun run test:notifications` 추가.

- [ ] **Step 4: RED 확인**
```bash
TEST_DATABASE_URL="postgresql://sunsu@localhost:5433/kaxi_test?schema=public" PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="예, 동의합니다 (Recommended)" bun run test:notifications
```
Expected: FAIL (repository 모듈 부재).

- [ ] **Step 5: `src/lib/notifications/email.ts`**

```ts
// fetch 기반 Resend 어댑터. 키 미설정이면 조용히 건너뛴다(인앱 알림은 항상 남음).
export async function sendNotificationEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.NOTIFY_EMAIL_FROM?.trim();
  if (!apiKey || !from) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: input.to, subject: input.subject, text: input.text }),
    });
    return res.ok;
  } catch (err) {
    console.warn("[notifications] email send failed", err instanceof Error ? err.message : err);
    return false;
  }
}
```

- [ ] **Step 6: `src/lib/notifications/repository.ts`**

```ts
import type { Notification } from "@prisma/client";
import { db } from "@/lib/db";
import { sendNotificationEmail } from "./email";

export const NOTIFICATION_TYPES = [
  "document_reviewed",
  "case_assigned",
  "case_status",
  "diagnosis_saved",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// 이메일 제목/본문(로케일별). 상세 화면 문구는 titleKey로 UI에서 렌더한다.
const EMAIL_SUBJECT: Record<string, Record<NotificationType, string>> = {
  ko: {
    document_reviewed: "[KAXI] 서류 심사 결과가 도착했어요",
    case_assigned: "[KAXI] 담당 행정사가 배정됐어요",
    case_status: "[KAXI] 케이스 진행 상황이 바뀌었어요",
    diagnosis_saved: "[KAXI] 진단 결과가 저장됐어요",
  },
  vi: {
    document_reviewed: "[KAXI] Đã có kết quả xét duyệt hồ sơ",
    case_assigned: "[KAXI] Đã có chuyên viên phụ trách hồ sơ của bạn",
    case_status: "[KAXI] Tiến độ hồ sơ của bạn đã thay đổi",
    diagnosis_saved: "[KAXI] Kết quả chẩn đoán đã được lưu",
  },
  mn: {
    document_reviewed: "[KAXI] Бичиг баримтын хяналтын хариу ирлээ",
    case_assigned: "[KAXI] Таны хэрэгт хариуцагч томилогдлоо",
    case_status: "[KAXI] Хэргийн явц өөрчлөгдлөө",
    diagnosis_saved: "[KAXI] Оношилгооны үр дүн хадгалагдлаа",
  },
  en: {
    document_reviewed: "[KAXI] Your document review result is ready",
    case_assigned: "[KAXI] An administrative agent has been assigned",
    case_status: "[KAXI] Your case status has changed",
    diagnosis_saved: "[KAXI] Your diagnosis result was saved",
  },
};

const EMAIL_BODY_SUFFIX: Record<string, string> = {
  ko: "자세한 내용은 KAXI 대시보드에서 확인하세요: https://kaxi.vercel.app/student",
  vi: "Xem chi tiết trên bảng điều khiển KAXI: https://kaxi.vercel.app/student",
  mn: "Дэлгэрэнгүйг KAXI самбараас харна уу: https://kaxi.vercel.app/student",
  en: "See details on your KAXI dashboard: https://kaxi.vercel.app/student",
};

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  titleKey: string;
  payload?: Record<string, unknown>;
}): Promise<Notification> {
  if (!NOTIFICATION_TYPES.includes(input.type)) {
    throw new Error(`unknown notification type: ${input.type}`);
  }

  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      titleKey: input.titleKey,
      payload: (input.payload ?? {}) as object,
    },
  });

  const user = await db.user.findUnique({ where: { id: input.userId }, select: { email: true, locale: true } });
  if (user?.email) {
    const locale = EMAIL_SUBJECT[user.locale] ? user.locale : "ko";
    const sent = await sendNotificationEmail({
      to: user.email,
      subject: EMAIL_SUBJECT[locale][input.type],
      text: EMAIL_BODY_SUFFIX[locale],
    });
    if (sent) {
      return db.notification.update({ where: { id: notification.id }, data: { emailedAt: new Date() } });
    }
  }
  return notification;
}

export function listNotificationsForUser(userId: string, opts: { limit?: number } = {}) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 30,
  });
}

export async function markAllRead(userId: string): Promise<number> {
  const result = await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
```

- [ ] **Step 7: GREEN + ci-gates**
```bash
TEST_DATABASE_URL=... PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=... bun run test:notifications   # PASS
bun run test:ci-gates   # PASS (배선 확인)
bunx tsc --noEmit
```

- [ ] **Step 8: Commit**
```bash
git add prisma/postgres/schema.prisma prisma/postgres/migrations src/lib/notifications scripts/test-notifications.ts package.json
git commit -m "feat(notifications): additive Notification model, repository with best-effort email adapter"
```

---

### Task 5: 알림 API + 학생 대시보드 알림 센터 자리

**Files:**
- Create: `src/app/api/notifications/route.ts`, `src/app/api/notifications/read-all/route.ts`, `src/components/notifications/NotificationSection.tsx`, `src/components/notifications/MarkAllReadButton.tsx`
- Modify: `src/app/student/page.tsx` (섹션 삽입)
- Test: `scripts/test-notifications.ts`에 라우트 401/동작 블록 추가

**Interfaces:**
- Consumes: Task 4 repository, `requireKaxiUser`/`AuthBridgeError`(`@/lib/supabase/auth`), Task 2 `<KaxiCat>`.
- Produces: `GET /api/notifications` → `{ notifications: [...] }`, `POST /api/notifications/read-all` → `{ marked: n }` (둘 다 STUDENT|PARTNER_AGENT 세션 필요, 미인증 401 `{error, code}`).

- [ ] **Step 1: 실패 테스트 추가** — `scripts/test-notifications.ts` 말미(console.log 직전)에:

```ts
const notificationsRoute = await import("../src/app/api/notifications/route");
const readAllRoute = await import("../src/app/api/notifications/read-all/route");

// 테스트 env에는 Supabase 세션이 없으므로 401 계약을 검증한다
const resList = await notificationsRoute.GET();
assert(resList.status === 401, `GET /api/notifications without session must be 401, got ${resList.status}`);
const resRead = await readAllRoute.POST();
assert(resRead.status === 401, `POST read-all without session must be 401, got ${resRead.status}`);
```
RED 확인(모듈 부재로 실패).

- [ ] **Step 2: `src/app/api/notifications/route.ts`**

```ts
import { NextResponse } from "next/server";
import { AuthBridgeError, requireKaxiUser } from "@/lib/supabase/auth";
import { listNotificationsForUser } from "@/lib/notifications/repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireKaxiUser(["STUDENT", "PARTNER_AGENT"]);
    const notifications = await listNotificationsForUser(user.id);
    return NextResponse.json({ notifications });
  } catch (err) {
    if (err instanceof AuthBridgeError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[GET /api/notifications]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: `src/app/api/notifications/read-all/route.ts`**

```ts
import { NextResponse } from "next/server";
import { AuthBridgeError, requireKaxiUser } from "@/lib/supabase/auth";
import { markAllRead } from "@/lib/notifications/repository";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await requireKaxiUser(["STUDENT", "PARTNER_AGENT"]);
    const marked = await markAllRead(user.id);
    return NextResponse.json({ marked });
  } catch (err) {
    if (err instanceof AuthBridgeError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[POST /api/notifications/read-all]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: 대시보드 섹션** — `src/components/notifications/NotificationSection.tsx` (서버 컴포넌트):

```tsx
import type { Notification } from "@prisma/client";
import { KaxiCat } from "@/components/brand/KaxiCat";
import { MarkAllReadButton } from "./MarkAllReadButton";

// Phase 0: titleKey 기반 최소 렌더(ko). 슬라이스 S5에서 로케일 렌더로 확장.
const TITLES: Record<string, string> = {
  "notifications.document_reviewed": "서류 심사 결과가 도착했어요",
  "notifications.case_assigned": "담당 행정사가 배정됐어요",
  "notifications.case_status": "케이스 진행 상황이 바뀌었어요",
  "notifications.diagnosis_saved": "진단 결과가 저장됐어요",
};

export function NotificationSection({ notifications }: { notifications: Notification[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-foreground">알림</h2>
        {notifications.some((n) => !n.readAt) && <MarkAllReadButton />}
      </div>
      {notifications.length === 0 ? (
        <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
          <KaxiCat state="nap" size={36} />
          <span>새 알림이 없어요. 서류 심사·케이스 소식이 여기에 도착해요.</span>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id} className="flex items-start gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-sm">
              <span className={n.readAt ? "mt-1.5 h-1.5 w-1.5 rounded-full bg-border" : "mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"} />
              <div>
                <p className="text-foreground">{TITLES[n.titleKey] ?? n.titleKey}</p>
                <p className="text-xs text-muted-foreground">{n.createdAt.toISOString().slice(0, 10)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

`src/components/notifications/MarkAllReadButton.tsx` (클라이언트):

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkAllReadButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/notifications/read-all", { method: "POST" });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="text-xs font-medium text-primary underline underline-offset-2 disabled:opacity-50"
    >
      모두 읽음
    </button>
  );
}
```

`src/app/student/page.tsx`: 상단 데이터 조회부에 `const notifications = await listNotificationsForUser(user.id, { limit: 10 });` 추가(import 포함), 기존 케이스/문서 섹션 **위**에 `<NotificationSection notifications={notifications} />` 삽입. 파일의 기존 구조·스타일은 건드리지 않는다(리스킨은 S5).

- [ ] **Step 5: GREEN + 전체 검증**
```bash
TEST_DATABASE_URL=... PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=... bun run test:notifications  # PASS(401 블록 포함)
bunx tsc --noEmit && bun run build 2>&1 | tail -3
```

- [ ] **Step 6: Commit**
```bash
git add src/app/api/notifications src/components/notifications src/app/student/page.tsx scripts/test-notifications.ts
git commit -m "feat(notifications): list/read-all API and student dashboard notification center"
```

---

### Task 6: i18n 로케일 정합성 CI 가드

**Files:**
- Create: `scripts/test-i18n-parity.ts`
- Modify: `package.json` (`test:i18n-parity` + `ci:domain` 배선)

- [ ] **Step 1: 실패 테스트(가드 자체) 작성** — `scripts/test-i18n-parity.ts`:

```ts
import { readFileSync } from "fs";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const LOCALES = ["ko", "vi", "mn", "en"] as const;

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object" && !Array.isArray(v)
      ? flattenKeys(v as Record<string, unknown>, key)
      : [key];
  });
}

const keysByLocale = new Map<string, Set<string>>();
for (const locale of LOCALES) {
  const parsed = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"));
  keysByLocale.set(locale, new Set(flattenKeys(parsed)));
}

const base = keysByLocale.get("ko")!;
let broken = false;
for (const locale of LOCALES.slice(1)) {
  const keys = keysByLocale.get(locale)!;
  const missing = [...base].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !base.has(k));
  if (missing.length || extra.length) {
    broken = true;
    console.error(`LOCALE ${locale}: missing=${missing.slice(0, 10).join(",")} extra=${extra.slice(0, 10).join(",")}`);
  }
}
if (broken) fail("locale message files are out of sync with ko.json");

console.log(`PASS i18n parity: ${base.size} keys aligned across ${LOCALES.join(", ")}`);
```
package.json: `"test:i18n-parity": "bun run scripts/test-i18n-parity.ts"`, `ci:domain` 체인의 `test:schema` 다음에 `&& bun run test:i18n-parity`.

- [ ] **Step 2: 실행 확인** — `bun run test:i18n-parity` → 현재 4개 파일 키 정합 상태이므로 PASS 기대. 일부러 vi.json에서 키 하나 지웠다 복구해 FAIL→PASS 동작 확인(RED 증거). `bun run test:ci-gates` PASS.

- [ ] **Step 3: Commit**
```bash
git add scripts/test-i18n-parity.ts package.json
git commit -m "ci(i18n): locale message parity guard across ko/vi/mn/en"
```

---

### Task 7: 최종 게이트 (오케스트레이터 직접 수행 가능)

- [ ] **Step 1: 로컬 통합 검증**
```bash
export TEST_DATABASE_URL="postgresql://sunsu@localhost:5433/kaxi_test?schema=public"
export PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="예, 동의합니다 (Recommended)"
bun run test:notifications && bun run test:i18n-parity && bun run test:ci-gates \
  && bun run test:documents && bunx tsc --noEmit && bun run build
```
Expected: 전부 성공.

- [ ] **Step 2: 시각 확인(스크린샷)** — dev 서버 기동 후 Playwright로 `/ko`(폰트·토큰 적용), `/nonexistent`(404 고양이), `/ko/diagnose`(로딩 상태) 데스크톱+모바일(390px) 캡처 → 사용자 검수. 여기서 액센트 미세조정 1회 기회(토큰 값만 수정).

- [ ] **Step 3: 랜딩** — 최신 origin/main 재fetch·rebase → push → CI/배포 모니터 → 프로덕션 `/api/health`·`/sitemap.xml`·OG 태그 확인.
