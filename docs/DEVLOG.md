# Development Log

## 2026-02-14

### 요약

- 오프라인 우선 기록 UX를 위해 세션 상태는 네트워크와 분리된 로컬 상태로 설계했다.

### 구현

- 세트 리스트에서 마지막 세트 카드 강조 UI 적용
- 세트 CRUD (추가/수정/삭제) 흐름 정리
- Zustand 기반 세션 상태 관리 구조 고정
- Zod 기반 런타임 입력 검증 적용
- 최근값 자동 채움 UX 반영

### 설계 판단

- 입력 중 상태(`draft`)와 확정 상태(store)를 분리해 저장 타이밍 제어
- selector 내부 fallback 생성 대신 컴포넌트 레벨 기본값 처리로 참조 안정성 유지
- 마지막 세트는 진행 중 포커스로 간주해 시각적으로 구분

### 트러블슈팅

#### Zustand selector 참조 문제

`state.sessions[sessionId] ?? []` 형태의 fallback이 매 렌더마다 새로운 배열을 생성해
React `getSnapshot` 경고가 발생.

- selector 내부 fallback 제거
- 컴포넌트 레벨에서 `safeSets` 기본값 처리

### 배운 점

- 런타임 검증은 폼 UX와 데이터 품질을 동시에 지켜준다
- 불변성 보장과 참조 안정성은 별도로 설계해야 한다
- 사용자 입력 흐름(추가/수정/저장) 단계 분리가 유지보수성을 높인다

### 다음 액션

- [ ] 핵심 기록 플로우 안정화 이후 백업/동기화 계층 설계 초안 작성

→ Day1에서는 핵심 기록 플로우를 안정화하는 데 집중했다.

---

## 2026-02-15

### 요약

- ESLint/Prettier ignore 설정 정리하여 CI 환경과 로컬 환경 차이 제거

### 목표

- [x] GitHub repo 생성 및 첫 push
- [x] GitHub Actions CI 추가 (`lint` / `typecheck` / `build`)
- [x] Supabase 도입 전, Local-first 전략 결정 (README 목표와 정합성 검토)

### 운영 및 인프라

- `.github/workflows/ci.yml` 추가
- 트리거: `push`, `pull_request` on `main`
- 실행: Node 20, `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`

### CI 이슈

- `format:check` 스크립트가 원격에 반영되지 않아 CI 실패 → package.json 커밋으로 해결
- Prettier 포맷 불일치로 format check 실패 → `npm run format` 적용 후 재실행 예정

### 전략 메모

- README 목표상 네트워크가 불안정해도 운동 기록이 끊기면 안 된다.
- 따라서 현재 단계에서는 Local-first를 기본으로 유지한다.
- Supabase는 이후 선택적 동기화/백업 계층으로 도입한다.

### 리스크 관리

- Supabase를 1단계에서 바로 도입하지 않고,
  Local-first 기반을 먼저 안정화해 제품 목표와 기술 구조의 충돌을 방지한다.

### 배운 점

- CI 실패는 대부분 설정 누락이나 반영 누락에서 발생한다.
- Git rebase와 stash는 무섭지만, 흐름을 이해하면 충분히 복구 가능하다.
- 코드 품질 게이트를 초기에 구축하는 것이 중요하다.

### 다음 액션

- [x] 첫 push 후 GitHub Actions 실행 확인
- [x] CI 결과 반영해 체크 상태 업데이트
- [ ] IndexedDB(Dexie)로 sessions 영속화(새로고침 복구)
- [ ] Supabase sync draft 설계(offline queue)

→ Day2에서는 코드 품질과 운영 기반을 정리했다.
