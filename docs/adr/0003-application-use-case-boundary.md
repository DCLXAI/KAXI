# ADR-0003: Application Use Case Boundary

- Status: Accepted
- Date: 2026-08-13
- Owners: Backend / Tech Lead

## Context

`/api/ai/unified`가 Agent와 Consult Route Handler를 직접 import하고 synthetic
`NextRequest`로 다시 호출했다. Stream Route Handler도 Unified Route Handler를
직접 import했다. 이 구조에서는 인증·rate limit·validation이 실행 경로에 따라
중복되거나 누락될 수 있고, 핵심 정책을 Next.js runtime 없이 단위 테스트할 수
없었다.

## Decision

1. AI 실행은 `src/application/ai`의 framework-independent use case가 담당한다.
2. 모든 use case는 `AiRequestContext`를 받는다. 이 context에는 request,
   idempotency, principal, tenant, locale/channel, trace, cancellation, deadline이
   명시된다.
3. use case는 `ApplicationResult<T>`만 반환하며 `Request`, `Response`,
   `NextRequest`, `NextResponse`를 반환하지 않는다.
4. HTTP body limit, rate limit, quota, schema validation, cookie/session 해석과
   status/header 변환은 `src/adapters/http`에 둔다.
5. Unified use case가 Action/Expert use case를 직접 조합한다. Route Handler 또는
   HTTP adapter끼리 core policy를 위임하지 않는다.
6. `scripts/test-ai-application-contract.ts`가 application runtime import closure의
   Next.js/HTTP adapter 의존을 거절한다.
7. `scripts/test-architecture-boundaries.ts`가 Route Handler 간 import 0건을
   merge gate로 유지한다.

## Consequences

- Direct Agent, Direct Consult, Unified와 Stream adapter가 동일 실행 정책을 사용할
  수 있다.
- transport별 인증·검증은 명시적으로 남고, application policy는 Bun 환경에서
  독립 테스트할 수 있다.
- Typebot/n8n은 다음 단계에서 같은 context/result 계약의 RAG use case에 연결해야
  한다.
- persistence는 아직 모든 AI use case 내부에서 원자적이지 않다. ADR-0004의
  transaction/outbox 결정으로 보완한다.
