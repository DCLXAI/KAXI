# KAXI 런칭 준비 리디자인 — 설계 스펙

작성: 2026-07-11 · 상태: 사용자 승인 (브레인스토밍 완료)

## 1. 목적과 기준

베트남·몽골 유학생이 **실제로 쓰기 시작해도 되는 수준**(실사용자 런칭)으로 웹디자인·UX·제품 완결성을 끌어올린다. 범위는 **학생 대면 화면 전부 + 운영 필수 루프**(새 케이스/문서 알림). 어드민 UI 미화는 범위 밖.

근거가 된 현황 평가 (2026-07-11, origin/main 기준):
- 디자인: 브랜드 폰트 미로드(전체 OS 기본 폰트), Tailwind v3/v4 토큰 이중화(`tailwind.config.ts` 색 정의가 죽은 코드), 다크모드 CSS만 있고 도달 불가, 404/에러/로딩 페이지 전무, OG 이미지·사이트맵 부재.
- 완결성: 진단 저장 후 안내하는 "관리자 화면"으로 가는 라우트 부재(죽은 코드), 리드→파트너 퍼널이 파트너 대시보드와 구조적 단절, AI "전문가 필요" 배지가 아무 동작 없음(`studentProfileId` 미전달로 훅 상시 no-op), 문서 심사 결과 알림 전무, `student/page.tsx`의 `/documents` 데드링크.
- 다국어: 로그인 폼(`UnifiedAuthForm`)·학생/파트너 대시보드가 한국어 하드코딩(`tr(...,"ko")`), i18n 3중 체계(next-intl 20파일 / 레거시 tr() 15파일 / 인라인 삼항 152회), `(demo)` 문구가 실화면 노출.

## 2. 확정 비주얼 아이덴티티

**하이브리드 (J안)**: 정보 화면(랜딩·진단·문서·대시보드)은 **아이보리 에디토리얼**, AI 채팅(상담·에이전트)은 **웜 다크** — "여기서부터 AI와 대화"라는 공간 전환.

### 2.1 팔레트 (시맨틱 토큰, globals.css `@theme` 단일 소스)
| 토큰 | 값 | 용도 |
|---|---|---|
| `--background` | `#f0eee6` | 정보 화면 배경 (아이보리) |
| `--surface` | `#e8e5db` | 카드/보조 표면 |
| `--ink` | `#1f1e1d` | 본문 텍스트 |
| `--muted` | `#6e6c66` | 보조 텍스트 |
| `--accent` | `#c96442` | CTA·링크·포인트 (클레이) |
| `--accent-soft` | `#e8a087` | 액센트 보조 |
| `--chat-bg` | `#262521` | 채팅 배경 (웜 다크) |
| `--chat-surface` | `#33312c` | AI 말풍선 |
| `--chat-ink` | `#f0eee6` | 채팅 텍스트 (크림) |
| `--chat-accent` | `#d97757` | 채팅 액센트 |

S1 배포 후 실화면에서 액센트 미세조정 기회 1회 (토큰만 바꾸면 전파).

### 2.2 타이포그래피
- 디스플레이/헤드라인: **Noto Serif KR** (`next/font/google`) — ko·vi 라틴 커버, mn 키릴은 본문 폰트 폴백.
- 본문/UI: **Pretendard Variable** (로컬 번들) — ko·라틴·키릴 커버.
- 현재 폰트 미로드 버그는 이 작업으로 해소.

### 2.3 마스코트: KCAT 픽셀 고양이
- 자산: `/Users/sunsu/Desktop/KCAT/App/Resources/Game/`의 투명 PNG 프레임을 `public/mascot/`로 이식 (자체 프로젝트 자산 — 라이선스 문제 없음).
- 컴포넌트: `<KaxiCat state="running|stretch|yawn|nap|breath" size inverted />` 하나로 통일. CSS `steps()` 스프라이트 애니메이션. 다크 표면에선 `filter: invert(1)`로 흰 고양이.
- 상태 매핑: 로딩·진행=달리기 / 입력 대기=기지개 / 빈 상태=하품 / 결과 없음·404=낮잠(Z) / AI 아바타=숨쉬기.
- 파비콘·앱아이콘도 고양이 실루엣 기반으로 교체.

## 3. 진행 구조: Phase 0 + 수직 슬라이스 (2안)

각 슬라이스 = 격리 worktree → 구현 → 리뷰 → CI/배포. 슬라이스마다 해당 화면의 ①아이덴티티 적용 ②완결성 갭 ③i18n 통합을 동시에 처리.

### Phase 0 — 전역 기반 (1회)
1. 디자인 토큰 재정립: `globals.css` `@theme`에 §2.1 팔레트. `tailwind.config.ts`의 죽은 색 정의 제거(파일 자체는 콘텐츠 경로 설정 유지 여부 확인 후 정리). 사이트 전체 다크모드 토글은 도입하지 않음 — 채팅 표면만 상시 웜 다크(도달 불가 ThemeProvider 문제 소멸).
2. `next/font` 폰트 로드 (§2.2), `--font-sans`/`--font-serif` 토큰 연결.
3. `<KaxiCat>` 컴포넌트 + 자산 이식 (§2.3).
4. 전역 완성도: `not-found.tsx`(낮잠 고양이+홈/진단 유도), `error.tsx`, 주요 라우트 `loading.tsx`(달리는 고양이), favicon.ico+PNG, OG 이미지(정적 1종), `sitemap.xml`(next-sitemap 또는 route handler), `(demo)`/"관리자 화면" 문구 전수 제거.
5. 알림 인프라 뼈대: `Notification` 모델(§4.1) + 생성 헬퍼 + 이메일 어댑터 인터페이스(구현체는 Resend 우선 검토, 없으면 Supabase SMTP — Phase 0 구현 시 확정) + 대시보드 알림 센터 UI 자리(빈 상태 포함).

### 슬라이스 (여정 순서)
| # | 화면 | 아이덴티티 | 완결성 | i18n |
|---|---|---|---|---|
| S1 | 랜딩+헤더/푸터 | 아이보리 히어로, 세리프, 고양이, 모바일 햄버거 메뉴 | `features_title` 키 중복 버그, 푸터를 consult/agent에도 노출, 회사 정보(사업자·연락처) 푸터 추가 | Landing/Header 레거시 tr()·하드코딩 제거 |
| S2 | 진단 | 멀티스텝 위저드(진행률 표시), 결과 카드 리스킨 | 제출 로딩/disabled, zod 검증(기존 parseJsonBody 패턴), 결과→상담 예약/저장 후속 CTA, 비로그인 저장 시 가입 유도 | diagnosis 화면 삼항 제거 |
| S3 | AI 상담·에이전트 | 웜 다크 채팅 전환, 고양이 아바타·타이핑 애니메이션 | 로그인 시 `studentProfileId` 전달→needsHumanExpert 시 케이스 자동 생성+안내 카드, 비로그인은 로그인/연락처 CTA, 429/503 친화 메시지(재시도 안내) | Agent/ConsultLanding 삼항 제거 |
| S4 | 로그인·온보딩 | 리스킨 | 로그인 후 리다이렉트에 로케일 유지, `syncUser`에 실제 locale 전달 | UnifiedAuthForm 전체 next-intl화(최심각), SupabaseAuthForm lang 전파 |
| S5 | 학생 대시보드+문서 | 리스킨, 빈 상태 고양이 | `/documents` 데드링크 수정, 문서 심사 알림 트리거(인앱+이메일), `DiagnosisLead.userId` 연결+"내 진단 이력" | student/page `tr(...,"ko")` 고정 해소(서버 컴포넌트 getTranslations) |
| S6 | 리드→파트너 퍼널+운영 알림 | 어드민 최소 UI(리스킨 아님) | `/admin/leads` 라우트 신설(기존 AdminDashboard 컴포넌트 재연결), `PATCH /api/partner-requests/[id]` 상태 전이, 새 리드/케이스/문서 시 `sendOpsAlert` 배선 | — |

S6 완료 시 레거시 `translations.ts` 삭제 가능 상태가 목표(잔존 참조 0 확인 후 별도 제거).

## 4. 데이터·기능 설계 (스키마 변경은 전부 추가형)

### 4.1 Notification
```prisma
model Notification {
  id        String    @id @default(cuid())
  userId    String
  type      String    // document_reviewed | case_assigned | case_status | diagnosis_saved
  titleKey  String    // i18n 키 — 본문은 렌더 시 로케일로
  payload   Json
  readAt    DateTime?
  emailedAt DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, readAt])
}
```
- 생성 헬퍼 `createNotification()`: 인앱 즉시, 이메일은 사용자 `User.locale` 템플릿으로 best-effort(실패해도 인앱 유지, `emailedAt` null).
- 트리거: `reviewDocumentItem`(S5), 케이스 상태 전이·배정(S5/S6).

### 4.2 진단↔계정: `DiagnosisLead.userId String?` (nullable 추가)
익명 진단은 그대로. 로그인 저장 시 연결, 저장 후 가입 시 "내 계정에 연결" 1클릭(세션의 leadId로). 대시보드 "내 진단 이력".

### 4.3 에스컬레이션 복구 (S3)
채팅 클라이언트: 로그인 상태면 `studentProfileId` 포함(자기 프로필 ID는 세션 파생 — 서버에서 세션과 일치 검증, 임의 값 신뢰 금지). `needsHumanExpert` 시: 로그인 → 케이스 생성+"행정사가 검토합니다" 카드 / 비로그인 → 로그인·연락처 CTA.

### 4.4 퍼널 복구 (S6)
- `/admin/leads`: 기존 `AdminDashboard`/`AdminLeadDetailModal` 재활용, `requireAdmin` 게이트.
- `PATCH /api/partner-requests/[id]`: `pending→contacted→closed` 상태 전이(+감사 로그).
- ops 알림: 리드 생성·케이스 생성·문서 업로드 시 기존 `sendOpsAlert`(Slack) 호출 — 인프라 기존재, 배선만.

## 5. i18n 통합 전략

- **빅뱅 금지**: 손대는 슬라이스의 화면만 그때 next-intl로 통합. 인라인 삼항→키, 레거시 tr()→키, 4개 로케일 동시 추가.
- 서버 컴포넌트는 `getTranslations({locale})`, locale은 라우트 파라미터 또는 로그인 사용자 `User.locale`.
- **CI 가드 추가**: 4개 로케일 키 정합성 스크립트(개수·누락 비교) — 한 로케일만 추가되는 회귀 방지.

## 6. 검증 전략

- 슬라이스 공통: 기존 CI 전체 + tsc + 빌드. 신규 기능은 `scripts/test-*.ts` 컨벤션 + ci:ops/ci:domain 배선(가드 통과 필수).
- 신규 테스트: 알림 생성·이메일 어댑터(mock 발송), DiagnosisLead-user 연결, partner-request 상태 전이, i18n 키 정합성.
- 시각 검증: 슬라이스 배포 전 로컬 dev를 Playwright로 스크린샷 → 사용자 확인 루프(모바일 뷰포트 포함).
- 알림 E2E(로컬 DB): 문서 심사→Notification 생성→이메일 어댑터 호출.

## 7. 비범위 (이번 패치에서 하지 않음)

어드민 UI 리스킨, Zalo/메신저 알림(별도 트랙), 사이트 전체 다크모드 토글, 결제/수익화 기능 자체(퍼널 연결까지만), 새 기능 추가(PRD Phase 4 트랙 ①③④), BGE-M3 등 임베딩 교체.

## 8. 리스크와 완화

- **origin/main이 활발히 움직임**(운영자·Codex 상시 커밋) → 슬라이스 단위 짧은 브랜치, push 직전 재fetch·rebase(확립된 프로세스).
- **채팅 다크 전환의 컴포넌트 파급** → S3에서 chat 스코프 토큰(`--chat-*`)으로 격리, 전역 토큰 불변.
- **이메일 발송 의존** → 어댑터 뒤로 격리, 미설정 시 인앱만 동작(503 아님).
- **다국어 세리프 커버리지** → mn(키릴)은 Pretendard 폴백 명시, S1 스크린샷에서 3개 언어 검수.
