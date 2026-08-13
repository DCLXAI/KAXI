# Worker replay and reconciliation runbook

이 문서는 Worker, outbox, attachment terminal failure를 운영자가 안전하게 재처리하는 절차다. 데이터베이스 row를 직접 수정하거나 payload를 복사해 새 작업을 만드는 절차가 아니다.

## 권한과 불변 조건

- Admin Ops의 `owner` 역할만 replay할 수 있다. `admin`과 `viewer`는 조회 또는 진단만 수행한다.
- 대상 row의 `tenantId`를 기준으로 새 signed tenant claim을 발급한다. 요청자가 임의 tenant를 지정할 수 없다.
- `REPLAY` 확인 문자열과 8~500자의 운영 사유가 모두 필요하다.
- 사유 원문은 감사 로그에 저장하지 않고 `reasonDigest`만 남긴다.
- 기존 idempotency key와 aggregate identity를 유지한다. 별도 row 생성은 금지한다.
- 한 번에 하나의 terminal failure만 재처리하고 결과를 확인한 뒤 다음 대상으로 진행한다.

## 사전 점검

1. incident/ticket 번호, operator, UTC 시작 시각, 대상 queue와 row ID를 기록한다.
2. Admin Ops에서 failureCode, attempts, trace ID, tenantId를 확인한다. payload와 개인정보를 감사 채널에 복사하지 않는다.
3. 같은 tenant와 idempotency key에 이미 성공한 side effect가 없는지 provider 기록과 trace ledger를 조회한다.
4. DB, storage, 외부 provider가 정상이며 queue consumer가 통제 가능한지 확인한다.
5. attachment는 quarantine object 존재 여부와 promotion ledger 상태를 함께 확인한다.

## Stop-the-line 조건

다음 중 하나라도 발생하면 추가 replay를 중단하고 Worker consumer를 정지한다.

- tenantId 또는 signed claim 검증 실패
- 같은 idempotency key의 중복 외부 side effect
- replay 후 attempts 증가만 반복되고 failureCode가 바뀌지 않음
- attachment object와 DB pointer가 서로 다른 tenant/bucket을 가리킴
- 감사 로그, trace 또는 queue 상태 중 하나라도 관측되지 않음

consumer 정지는 enqueue를 삭제하거나 DB를 rollback하는 의미가 아니다. 새 입력은 durable queue에 남겨 두고 원인이 제거된 뒤 기존 consumer 또는 검증된 이전 drain으로 처리한다.

## Replay 실행

Admin Ops 화면의 Dead-letter replay에서 대상과 failureCode를 다시 확인하고 실행한다. API로 실행할 때도 브라우저/승인된 운영 클라이언트의 owner 세션을 사용한다.

```text
POST /api/admin/ops/dead-letters/{uuid}/replay
Content-Type: application/json

{"kind":"worker|outbox|attachment","reason":"incident와 복구 근거 8자 이상","confirmation":"REPLAY"}
```

정상 응답은 `202`와 `queued` 상태다. Worker는 lease/deadline과 tenant claim을 갱신하고, outbox는 동일 idempotency key로 `retry`가 되며, attachment는 job과 attachment를 하나의 transaction으로 quarantine/queued 상태에 맞춘다. 이미 처리된 대상은 다시 변경되지 않는다.

## Reconciliation 및 완료 판정

1. queue에서 해당 row가 claim되고 최종 `completed` 또는 `processed`가 되는지 확인한다.
2. trace ID로 Web/use case/DB 또는 provider/Worker span이 이어지는지 확인한다.
3. attachment는 promotion reconciler를 실행해 object 존재 위치와 DB storage pointer가 일치하고 상태가 `ready`인지 확인한다.
4. outbox는 동일 idempotency key로 provider side effect가 정확히 한 번만 관측되는지 확인한다.
5. `admin.ops.dead_letter.replay` 감사 event에 operator, target ID, tenantId, queue, previousAttempts, failureCode, reasonDigest가 있는지 확인한다.
6. backlog oldest age와 DLQ count가 기준선으로 돌아오면 incident에 UTC 완료 시각과 검증 evidence를 남긴다.

## Rollback 전략

schema/data migration을 역으로 삭제하지 않는다. 잘못된 replay가 의심되면 consumer를 정지하고 해당 idempotency key의 후속 side effect를 차단한다. Web enqueue는 유지하며, 배포 rollback이 필요하면 검증된 이전 Worker image/drain으로 전환한다. attachment promotion이 object move와 DB commit 사이에서 멈춘 경우 수동 pointer 변경 대신 promotion reconciliation을 실행한다.

## Rehearsal evidence template

```text
UTC start/end:
Environment:
Operator / owner approval:
Incident or rehearsal ID:
Kind / target ID / tenantId / failureCode:
Preflight trace and dependency result:
Replay HTTP result:
Queue final state:
Idempotency/provider verification:
Trace coverage:
Audit event ID (reasonDigest present):
Reconciliation result:
Stop-the-line triggered: yes/no
```
