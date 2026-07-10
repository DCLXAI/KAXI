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
