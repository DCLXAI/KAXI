# 모션 Tier 3 폴리시 (Emil Kowalski 기준)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** 감사에서 확인된 Tier 3 폴리시 적용 — TypebotBubble 채팅 패널 모션, 랜딩 stagger/스크롤 리빌, KaxiCat reduced-motion·오프스크린 pause, 채팅 메시지 framer 교정, 탭/아이콘 crossfade. 로직·아이덴티티 무변경.

**Architecture:** Tier 1이 배포한 기반(`ease-snappy`/`ease-fluid` 토큰, 전역 reduced-motion, hover 게이팅) 위에서 표면별 폴리시. 4개 태스크, 파일 전부 분리 → 병렬 실행.

**Tech Stack:** tw-animate-css(`animate-in`), framer-motion(AnimatePresence·useInView·useReducedMotion), IntersectionObserver.

## Global Constraints

- **로직 무변경**: 상태·핸들러·fetch·라우팅·세션 관련 코드 손대지 않음. 모션 래핑·className·순수 표시 상태만.
- **framer**: `x`/`y` 쇼트핸드 금지 → `transform: "translateY(10px)"` 문자열(하드웨어 가속). easing 배열 `[0.23,1,0.32,1]`.
- **CSS 클래스**: `ease-snappy` 토큰 유틸 사용(이미 존재). `transition-all` 금지 → 속성 명시. `transform`/`opacity`만 애니메이트.
- **reduced-motion**: 신규 모션 전부 `motion-reduce:animate-none`(CSS) 또는 `useReducedMotion()`(framer) 분기. Tier1 전역 감쇠가 있지만 컴포넌트 레벨에서도 명시.
- duration ≤300ms(진입 150-250ms, 이탈은 더 빠르게). stagger 30-80ms, 인터랙션 블로킹 금지.
- 하드코딩 색 금지. 커밋은 slice/motion-tier3에서만, push 금지.
- 시각 검증: Playwright(랜딩 스크롤 후·채팅 패널 열림·reduced-motion) → 사용자 검수.

---

### Task 1: TypebotBubble 채팅 패널 열기/닫기 모션

**Files:** `src/components/typebot/TypebotBubble.tsx`

감사: 패널(`isOpen && (<section>...)`, ~L801-1031)이 토글 시 즉시 mount/unmount — 사이트 최대 진입점인데 모션 0.

- [ ] **Step 1**: framer `AnimatePresence` + `motion.section`으로 패널 래핑(기존 section을 motion.section으로, `{isOpen && ...}` 조건은 AnimatePresence 안으로). 버블 버튼(우하단)에서 자라나는 origin-aware 진입:
  - `initial={{ opacity: 0, transform: "translateY(8px) scale(0.97)" }}`, `animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}`, `exit={{ opacity: 0, transform: "translateY(8px) scale(0.97)" }}`
  - `style={{ transformOrigin: "bottom right" }}`(모바일 풀스크린 레이아웃이면 center 허용 — 기존 레이아웃 클래스 보고 판단)
  - `transition={{ duration: 0.2, ease: [0.23,1,0.32,1] }}`, exit는 `duration: 0.15`.
  - `useReducedMotion()` 시 transform 제거(opacity만).
- [ ] **Step 2**: 패널 내부 로직(세션 생성·메시지·input 핸들러) 절대 무변경 확인 — 래핑만. 버블 토글 버튼 자체에 press는 Tier1 button이 아닐 수 있으니 커스텀 버튼이면 `active:scale-[0.97] transition-transform duration-100 ease-snappy` 추가.
- [ ] **Step 3**: `bunx tsc --noEmit` + eslint + 로직 무변경 git diff 자가확인. Commit: `feat(motion): typebot panel origin-aware open/close`

### Task 2: 랜딩 stagger·스크롤 리빌·perf 정리

**Files:** `src/components/kbridge/Landing.tsx`

감사: features 4카드(L230-255) 동시 마운트, 통계(L129-147) 값 스왑 무모션, `transition-all` 3곳(L154·192·236), 섹션 진입 무모션.

- [ ] **Step 1: features 카드 stagger 스크롤 리빌** — framer `motion.div` + `whileInView`로 카드별 진입: `initial={{ opacity: 0, transform: "translateY(12px)" }}`, `whileInView={{ opacity: 1, transform: "translateY(0px)" }}`, `viewport={{ once: true, margin: "-60px" }}`, `transition={{ duration: 0.25, ease: [0.23,1,0.32,1], delay: i * 0.05 }}`. `useReducedMotion()` 시 transform 제거. 카드 hover `-translate-y-0.5`는 유지.
- [ ] **Step 2: 주요 섹션 리빌(절제)** — AI 배너·상담 배너·브로커 비교·하단 CTA 등 4-5개 섹션 래퍼에 동일 whileInView fade+8px(delay 없음, 0.25s). 히어로는 스크롤 리빌 대신 마운트 진입 1회(`animate-in fade-in duration-300 ease-snappy motion-reduce:animate-none`) — 첫 화면이 늦게 보이면 안 되므로 slide 없이 fade만.
- [ ] **Step 3: 통계 값 스왑 fade** — 값 `—`→실제값 교체 시 `<span key={String(value)} className="inline-block animate-in fade-in duration-200 ease-snappy motion-reduce:animate-none">` 패턴으로 리마운트 fade.
- [ ] **Step 4: transition-all 정리** — L154·192·236의 `transition-all` → `transition-[border-color,box-shadow,transform] ease-snappy`(hover translate 있는 카드) 또는 실제 변하는 속성만.
- [ ] **Step 5**: tsc+eslint+로직(fetch/stats/링크) 무변경 확인. Commit: `feat(motion): landing scroll reveal, feature stagger, stat swap fade`

### Task 3: KaxiCat reduced-motion·오프스크린 pause

**Files:** `src/components/brand/KaxiCat.tsx`

감사: `setInterval` 프레임 루프(L50-54)가 reduced-motion 무시, 탭 숨김/뷰포트 밖에서도 계속 돎.

- [ ] **Step 1: reduced-motion** — `matchMedia("(prefers-reduced-motion: reduce)")` 확인(+change 리스너). reduce면 인터벌 시작 안 함(정적 첫 프레임 표시). SSR 가드(`typeof window`).
- [ ] **Step 2: 오프스크린·탭 숨김 pause** — 래퍼 ref에 `IntersectionObserver`(뷰포트 밖이면 인터벌 정지, 들어오면 재개) + `visibilitychange`(document.hidden 시 정지). 프레임 상태는 유지(재개 시 이어서).
- [ ] **Step 3**: 컴포넌트 API(`state/size/fps/inverted/label`)·렌더 출력 무변경. 기존 render-phase frame reset 패턴 보존. tsc+eslint. 사용처(랜딩/404/error/loading/진단/로그인) 회귀 없음(빌드로 확인). Commit: `feat(motion): KaxiCat respects reduced motion, pauses offscreen/hidden`

### Task 4: 채팅 framer 교정 + 탭/아이콘 crossfade

**Files:** `src/components/consult/ConsultMessageList.tsx`, `src/components/consult/ConsultLanding.tsx`, `src/components/agent/AgentMessageList.tsx`, `src/components/agent/AgentLanding.tsx`, `src/components/ui/tabs.tsx`, `src/components/diagnosis/DiagnosisForm.tsx`(아이콘만), `src/components/auth/UnifiedAuthForm.tsx`(아이콘만)

- [ ] **Step 1: framer 쇼트핸드 교정** — 4개 채팅 파일의 `initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}` → `initial={{ opacity: 0, transform: "translateY(10px)" }} animate={{ opacity: 1, transform: "translateY(0px)" }}` + 명시 `transition={{ duration: 0.18, ease: [0.23,1,0.32,1] }}`. `useReducedMotion()` 시 transform 제거. 메시지 append 로직·key 무변경.
- [ ] **Step 2: TabsContent 진입** — `tabs.tsx` TabsContent에 `data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 duration-200 ease-snappy motion-reduce:animate-none` 추가(기존 클래스 보존). 로그인/회원가입 탭 전환이 순간 교체→fade+slide.
- [ ] **Step 3: 아이콘 스왑 crossfade** — DiagnosisForm 제출 버튼(L404 `{submitting ? <Loader2/> : <ArrowRight/>}`)과 UnifiedAuthForm 동일 패턴(L228·233·237·256): 각 아이콘에 `animate-in fade-in zoom-in-75 duration-150 ease-snappy motion-reduce:animate-none` 클래스 추가(마운트 시 fade+scale-in — 조건 로직 무변경, className만).
- [ ] **Step 4**: tsc+eslint(7파일)+`grep`으로 framer `y:` 쇼트핸드 잔존 0 확인. 채팅 세션/메시지/인증 로직 무변경 git diff 자가확인. Commit: `feat(motion): chat framer hardware-accel, tab content entry, icon crossfade`

### Task 5: 게이트+검수+배포 (오케스트레이터)

- [ ] tsc·build·i18n-parity. 클린 빌드(`rm -rf .next`) 후 컴파일 CSS 증거 확인(dev 서버 켜기 전에!).
- [ ] Playwright: 랜딩(스크롤 후 features 표시)·채팅 패널 열림·진단·reduced-motion 1컷 → 검수.
- [ ] 태스크 리뷰 → rebase → push → CI/배포 → 프로덕션 확인.
