# Workout PWA Case Study

## Problem

운동 기록 앱은 입력 도중 네트워크가 흔들리거나 페이지를 다시 열어도 기록이 끊기면 안 됩니다. 많은 초기 CRUD 앱은 저장 성공 여부를 서버 왕복에 묶어 두기 때문에, 오프라인 상황이나 느린 모바일 환경에서 사용성이 급격히 떨어집니다.

## Goal

- 운동 세션을 로컬에서 즉시 기록한다.
- 새로고침, 재진입, 오프라인 복귀 이후에도 저장된 세션을 복구한다.
- optional sync를 붙이더라도 로컬 기록 UX를 훼손하지 않는다.
- 인터뷰에서 local-first, Dexie, Zustand, Zod, outbox 설계를 설명할 수 있게 만든다.

## Architecture

- UI: Next.js App Router + React 19
- Client state: Zustand
- Persistence: Dexie / IndexedDB
- Runtime validation: Zod
- Optional sync: outbox + retry/backoff + app startup crash recovery
- Verification: Playwright E2E + Playwright runner 기반 sync integration tests

## Key technical decisions

### 1. Draft 입력과 저장 상태 분리

세션 화면에서는 입력 중 draft를 따로 유지하고, 저장 시점에만 Zod로 검증한 뒤 영속화합니다. 덕분에 입력 UX는 빠르게 유지하면서 저장 데이터의 형식을 통제할 수 있습니다.

### 2. Local-first를 기본 계약으로 고정

세션과 루틴은 IndexedDB에 먼저 기록되고, sync는 뒤따르는 선택적 계층입니다. 네트워크는 부가 기능이지 기록의 전제조건이 아닙니다.

### 3. Outbox를 명시적 상태 머신으로 관리

이벤트는 `pending -> processing -> synced` 또는 `pending/failed -> blocked` 경로를 가집니다. `blocked`를 별도 상태로 두어 400/401/409 같은 비재시도 오류가 무한 재시도되지 않게 했습니다.

### 4. Crash recovery 우선

앱이 sync 도중 종료되면 `processing` 이벤트를 startup 시 `pending`으로 복구합니다. 이 덕분에 “처리 중에 멈춘 이벤트가 영구 유실되는 상황”을 피할 수 있습니다.

## Trade-offs

- IndexedDB는 브라우저 저장공간 제약을 받습니다.
- sync route는 현재 append-only 이벤트 전달 계층이며, 완전한 다중 기기 병합 해결책은 아닙니다.
- 기록 자체는 로컬 우선이라 빠르지만, cross-device consistency는 추가 서버 계약이 필요합니다.

## Edge cases handled

- 네트워크 오류, 429, 5xx는 backoff 후 재시도
- 400, 401, 403, 404, 409는 `blocked`로 종료
- max attempts 초과 이벤트는 terminal 상태로 이동
- crash 후 `processing` 이벤트 복구
- 루틴 삭제 시 관련 세션 삭제 이벤트도 outbox에 함께 적재
- 브라우저 저장 실패 시 세션 화면에 명시적 경고 노출

## Testing strategy

- `npm run test`
  sync retry policy, API adapter mapping, Dexie outbox candidate selection, cascade delete outbox 적재를 deterministic하게 검증
- `npm run test:e2e`
  세션 생성/저장/복구, 오프라인 부팅, 온라인 복귀 후 outbox 흐름을 실제 브라우저 기준으로 검증

## What I learned

- local-first 앱은 “오프라인에서도 된다”보다 “실패 상태를 어떻게 드러내는가”가 더 중요합니다.
- outbox는 단순 큐보다 상태 머신으로 다뤄야 면접에서 설명 가능한 설계가 됩니다.
- append-only sync라도 terminal failure, cascade semantics, crash recovery를 명확히 하지 않으면 신뢰성이 급격히 떨어집니다.

## Interview talking points

- Dexie와 Zustand를 조합해 local-first source of truth를 어떻게 유지했는지
- Zod를 저장 경계에만 적용해 입력 UX와 데이터 무결성을 분리한 이유
- outbox retryable/non-retryable failure를 어떻게 구분했는지
- startup crash recovery와 blocked/dead-letter 상태를 왜 도입했는지
- routine delete와 session delete를 event log 기준으로 어떻게 맞췄는지
