# 모션 리팩토링 (Emil Kowalski 기준) — 기반 + 진단 플로우

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** KAXI 인터랙션/모션 품질을 Emil Kowalski 디자인 엔지니어링 기준으로 끌어올린다. 아이덴티티(아이보리 에디토리얼·클레이·KaxiCat)와 모든 로직은 무변경. 스타일/모션만.

**Architecture:** 감사(3개 서브에이전트)로 확인된 findings 중 사용자가 선택한 Tier 1(기반) + Tier 2(진단 플로우)를 적용. Tier 1은 공유 프리미티브·globals.css라 앱 전체 전파. Tier 2는 진단 컴포넌트 국한.

**Tech Stack:** Tailwind v4(`@theme inline`), tw-animate-css(`animate-in`/`slide-in`), framer-motion(^12.23.2, 이미 사용 중), shadcn 프리미티브.

## Global Constraints

- **로직 무변경**: 상태·핸들러·데이터·라우팅·인증 손대지 않음. className·모션 토큰·전환 래핑만.
- **아이덴티티 무변경**: 색/폰트/레이아웃 토큰(globals.css의 색·폰트 변수) 변경 금지. 신규는 **모션 토큰만** 추가.
- **하드코딩 색 금지**. 브랜드 토큰 클래스만.
- **성능**: `transform`/`opacity`만 애니메이트. `transition-all` 금지 → 속성 명시. Framer는 `x`/`y` 쇼트핸드 대신 `transform` 문자열(하드웨어 가속) 또는 CSS 우선.
- **reduced-motion 존중**: 신규 모션은 전역 `prefers-reduced-motion` 규칙 또는 `motion-reduce:` 유틸로 감쇠(움직임 제거, opacity는 유지).
- **duration**: UI ≤300ms. press 100-160ms, 전환 150-250ms.
- **모션 토큰 계약(두 태스크 공유)**: `@theme inline`에 추가 →
  `--ease-snappy: cubic-bezier(0.23, 1, 0.32, 1);`(강한 ease-out, 진입/이탈·press)
  `--ease-fluid: cubic-bezier(0.77, 0, 0.175, 1);`(강한 ease-in-out, 화면 내 이동)
  Tailwind v4가 `ease-snappy`/`ease-fluid` 유틸 생성. 소비자는 이 유틸 사용.
- 커밋은 `slice/motion-refactor`에서만, push 금지. push 직전 rebase.
- 시각 검증: 배포 전 Playwright 스크린샷(랜딩·진단 폼·결과, ko/vi, 데스크톱+모바일) → 사용자 검수.

---

### Task 1: 모션 기반 레이어 (globals.css + 공유 프리미티브)

**Files:** `src/app/globals.css`, `src/components/ui/button.tsx`, `sheet.tsx`, `dropdown-menu.tsx`, `select.tsx`, `tabs.tsx`, `dialog.tsx`

**Interfaces:** Produces `ease-snappy`/`ease-fluid` 유틸(Task 2가 소비), 전역 reduced-motion 규칙.

- [ ] **Step 1: 모션 토큰** — `src/app/globals.css`의 `@theme inline` 블록(L6~)에 추가:
```css
  --ease-snappy: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-fluid: cubic-bezier(0.77, 0, 0.175, 1);
```
색/폰트 토큰은 손대지 말 것.

- [ ] **Step 2: 전역 reduced-motion** — globals.css 하단에 추가(전역 안전망):
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: hover 게이팅** — 터치에서 sticky hover 방지. globals.css의 `@custom-variant dark` 아래 추가:
```css
@custom-variant hover (@media (hover: hover) { &:hover });
```
(Tailwind v4 `hover:` 유틸 전역이 hover 가능 기기에서만 적용됨. 키보드는 focus로 별도라 영향 없음.)

- [ ] **Step 4: button press 피드백 + perf** — `src/components/ui/button.tsx:8` base 클래스에서 `transition-all` → `transition-[color,background-color,border-color,box-shadow,transform]` 로 교체하고 `active:scale-[0.97]` 추가. easing은 `ease-snappy`, `duration-100` 붙임. 예:
`"...rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-100 ease-snappy active:scale-[0.97] disabled:pointer-events-none..."`

- [ ] **Step 5: 상호작용 프리미티브 press 피드백** — 아래에 subtle `active:` 추가(스케일 또는 배경):
  - `dropdown-menu.tsx` DropdownMenuItem/RadioItem: `active:bg-accent/80`
  - `select.tsx` SelectItem: `active:bg-accent/80`
  - `tabs.tsx` TabsTrigger: `active:scale-[0.98]`
  - `dialog.tsx`/`sheet.tsx` Close 버튼: `active:opacity-60`
  (없으면 추가만, 기존 클래스 유지.)

- [ ] **Step 6: sheet duration·easing** — `sheet.tsx:61`의 `transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500` → `transition-transform ease-snappy data-[state=closed]:duration-200 data-[state=open]:duration-250`(300ms 이하, 속성 명시). slide는 이미 animate-in/out이 구동하므로 bare `transition` 제거.

- [ ] **Step 7: 검증** — `bunx tsc --noEmit` + `bunx eslint`(수정 파일) + `bun run build`. `grep -rn "transition-all" src/components/ui/button.tsx` 0건. `ease-snappy`/`ease-fluid`가 빌드 CSS에 생성됐는지(빌드 통과로 확인). 하드코딩 색 0.

- [ ] **Step 8: Commit** — `git add` 수정 파일 + `git commit -m "feat(motion): motion token layer, press feedback, reduced-motion, hover gating"`

---

### Task 2: 진단 플로우 모션

**Files:** `src/components/diagnosis/DiagnosisExperience.tsx`, `DiagnosisForm.tsx`, `DiagnosisResult.tsx`, `src/components/kbridge/ReadinessScoreCard.tsx`

**Interfaces:** Consumes `ease-snappy`(Task 1 토큰). framer-motion 사용 가능(이미 설치, 채팅에서 사용 중).

- [ ] **Step 1: 폼→결과 전환** — `DiagnosisExperience.tsx`의 `{showResult && <DiagnosisResult/>}` 결과 마운트에 진입 모션. tw-animate-css로 가볍게: 결과 컨테이너에 `animate-in fade-in slide-in-from-bottom-3 duration-300 ease-snappy motion-reduce:animate-none`. (framer AnimatePresence를 쓰면 exit도 가능하나, 폼→결과는 단방향이라 CSS 진입으로 충분.)

- [ ] **Step 2: 위저드 스텝 방향성 전환** — `DiagnosisForm.tsx` 멀티스텝(`{step === n && ...}`). `next()`/`previous()`에 방향 상태 추가(로직 아닌 표시용) 후, 스텝 콘텐츠를 framer `AnimatePresence mode="wait"`로 감싸 방향성 slide+fade:
  - 전진: enter from right(`transform: translateX(24px)`→0), exit to left.
  - 후진: 반대.
  - `transition={{ duration: 0.22, ease: [0.23,1,0.32,1] }}`, `transform` 문자열 사용(하드웨어 가속). `useReducedMotion()`으로 감쇠(reduced 시 x=0, opacity만).
  - `CardContent`가 `min-h` 고정이라 레이아웃 흔들림 없음. step state·검증·핸들러 로직 무변경.

- [ ] **Step 3: 선택 마이크로 피드백** — `DiagnosisForm.tsx` `ChoiceButton`의 `{selected && <CheckCircle2/>}` 체크 아이콘에 `animate-in zoom-in-75 duration-150 ease-snappy` (mount 시 scale-in). ChoiceButton 자체에 `active:scale-[0.98]`(press).

- [ ] **Step 4: 결과 카드 stagger** — `DiagnosisResult.tsx`의 6개 카드/블록에 순차 진입. 각 블록에 `animate-in fade-in slide-in-from-bottom-2 ease-snappy` + `style={{ animationDelay: \`${i * 60}ms\`, animationFillMode: "backwards" }}`(60ms 간격) 또는 nth-child delay. `motion-reduce:animate-none`. 인터랙션 블로킹 금지.

- [ ] **Step 5: ReadinessScoreCard perf** — `ReadinessScoreCard.tsx`의 진행률 바가 `width: ${score}%` 애니메이트(레이아웃 유발) → `transform: scaleX(${score/100})` + `transform-origin: left` + `transition-transform ease-snappy`로 전환(shadcn Progress와 동일 GPU 패턴). 트랙/필 구조 유지, 시각 결과 동일.

- [ ] **Step 6: 검증** — `bunx tsc --noEmit` + `bunx eslint`(수정 파일) + `bun run build`. 진단 로직(step state·계산·저장·라우팅) diff에 없음 확인(모션 래핑만). framer `x`/`y` 쇼트핸드 대신 `transform` 사용 확인. reduced-motion 분기 존재.

- [ ] **Step 7: Commit** — `git add` 수정 파일 + `git commit -m "feat(motion): diagnosis flow — form→result, directional steps, result stagger, progress perf"`

---

### Task 3: 게이트 + 시각 검수 + 배포 (오케스트레이터)

- [ ] tsc·build·test:i18n-parity·핵심 테스트. 로직 회귀 없음.
- [ ] Playwright: 랜딩·진단 폼(스텝 전환)·결과(stagger), ko/vi, 데스크톱+모바일. reduced-motion 에뮬레이션 1컷. → 사용자 검수.
- [ ] 태스크 리뷰 + 전체 브랜치 리뷰 → rebase → push → CI/배포 → 프로덕션 확인.
