# Local-First Architecture

## Overview

`workout-pwa`는 네트워크보다 로컬 저장을 우선하는 운동 기록 앱입니다. 사용자는 입력 즉시 브라우저 안에서 기록을 유지하고, 선택적으로 sync outbox가 서버에 이벤트를 전달합니다.

## Main building blocks

### Next.js App Router

- 홈, 루틴 목록/상세, 세션 화면, sync route를 분리합니다.
- PWA shell과 offline fallback은 앱 재진입 경험을 보강합니다.

### Zustand session store

- 세션 화면의 set 목록은 Zustand가 관리합니다.
- draft 입력값은 컴포넌트 로컬 state에 두고, 저장된 세트는 store + IndexedDB에 둡니다.

### Dexie / IndexedDB

- `sessions`, `routines`, `sync_outbox` 세 테이블을 사용합니다.
- 로컬 기록과 복구는 Dexie가 담당합니다.

### Zod validation

- 세트 입력과 루틴 템플릿은 저장 직전에 검증합니다.
- TypeScript 타입만으로 보장할 수 없는 runtime 품질을 보완합니다.

## Data flow

1. 사용자가 세트를 수정한다.
2. draft 상태는 즉시 UI에 반영된다.
3. 저장 시 Zod validation을 통과한 데이터만 repository로 들어간다.
4. repository가 Dexie에 기록하고, sync outbox 이벤트를 적재한다.
5. sync engine이 네트워크 가능 시 outbox를 flush한다.

## Why local-first here

- 운동 중에는 네트워크보다 빠른 입력이 더 중요합니다.
- 세션은 “지금 이 기기에서 다시 이어서 열 수 있는가”가 핵심 가치입니다.
- optional sync는 백업/복구 계층이지, 기록의 필수 경로가 아닙니다.

## Reliability notes

- `processing` 상태에서 앱이 종료되면 startup 시 `pending`으로 복구합니다.
- 비재시도 오류는 `blocked`로 이동해 무한 재시도를 막습니다.
- 브라우저 저장 실패는 세션 화면에 경고로 드러냅니다.

## Routine deletion semantics

- 로컬에서는 루틴 삭제 시 관련 세션도 함께 삭제합니다.
- outbox에는 session delete 이벤트와 routine delete 이벤트를 모두 적재합니다.
- 서버 측에서 cascade를 가정하지 않고, event stream만 봐도 삭제 의미를 재구성할 수 있게 맞췄습니다.

## Known limitations

- IndexedDB quota를 넘기면 로컬 저장이 실패할 수 있습니다.
- sync route는 append-only 전달 계층이라 conflict merge나 multi-device convergence를 완전히 해결하지 않습니다.
- outbox 적재와 도메인 쓰기가 현재 모든 경로에서 하나의 atomic transaction으로 묶여 있지는 않습니다.
