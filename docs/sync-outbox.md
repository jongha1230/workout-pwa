# Sync Outbox

## Purpose

sync outbox는 로컬 변경을 네트워크 가용성과 분리하기 위한 전달 큐입니다. 운동 기록은 먼저 IndexedDB에 저장되고, outbox는 뒤에서 이벤트를 서버에 밀어 넣습니다.

## Event lifecycle

- `pending`
  아직 전송되지 않은 이벤트
- `processing`
  sync engine이 현재 전송 중인 이벤트
- `failed`
  retryable failure가 발생했고 backoff 대기 중인 이벤트
- `blocked`
  non-retryable failure이거나 max attempts를 초과한 terminal 이벤트
- `synced`
  서버로 성공적으로 전달된 이벤트

## Retryable vs non-retryable failures

### Retryable

- 네트워크 오류
- HTTP `429`
- HTTP `5xx`

이 경우 이벤트는 `failed`로 남고 backoff 이후 다시 후보가 됩니다.

### Non-retryable

- HTTP `400`
- HTTP `401`
- HTTP `403`
- HTTP `404`
- HTTP `409`
- route가 명시적으로 `retryable: false`를 반환한 경우

이 경우 이벤트는 `blocked`로 이동하고 다시 후보가 되지 않습니다.

## Backoff behavior

- 1st failed attempt: `5s`
- 2nd failed attempt: `15s`
- 3rd failed attempt: `30s`
- 그 이후에도 계속 실패하면 `blocked`

현재 구현은 최대 4회 전달 시도 후 terminal 상태로 전환합니다.

## Candidate selection

`listOutboxSyncCandidates()`는 다음 조건만 만족하는 이벤트를 반환합니다.

- `pending`
- retry delay가 지난 `failed`

`processing`, `blocked`, `synced`는 절대 후보에 포함되지 않습니다.

## Crash recovery

앱이 sync 도중 종료되면 일부 이벤트가 `processing`에 남을 수 있습니다. startup 시 `resetProcessingOutboxEvents()`가 이를 `pending`으로 되돌려 다음 flush에서 다시 처리합니다.

## Routine/session delete semantics

- 루틴 삭제는 로컬에서 관련 세션 삭제를 동반합니다.
- outbox에는 관련 `session delete` 이벤트와 `routine delete` 이벤트를 모두 기록합니다.
- 이는 서버에 cascade delete 계약이 없더라도 event stream만으로 삭제 의미를 재현하기 위한 선택입니다.

## Known limitations

- outbox는 append-only 이벤트 전달 계층이지 완전한 sync protocol은 아닙니다.
- blocked 이벤트를 자동 복구하는 관리자 UI는 아직 없습니다.
- sync route가 실제로는 raw event ingestion이므로, downstream consumer의 해석 정책이 필요합니다.
