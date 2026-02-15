# Development Log

---

## 2026-02-14

### 구현

- 세트 리스트에서 마지막 세트 카드 강조 UI 적용
- 세트 CRUD (추가/수정/삭제) 흐름 정리
- Zustand 기반 세션 상태 관리 구조 고정
- Zod 기반 런타임 입력 검증 적용
- 최근값 자동 채움 UX 반영

---

### 설계 판단

- 입력 중 상태(`draft`)와 확정 상태(store)를 분리해 저장 타이밍 제어
- selector 내부 fallback 생성 대신 컴포넌트 레벨 기본값 처리로 참조 안정성 유지
- 마지막 세트는 진행 중 포커스로 간주해 시각적으로 구분

---

### 트러블슈팅

#### Zustand selector 참조 문제

`state.sessions[sessionId] ?? []` 형태의 fallback이 매 렌더마다 새로운 배열을 생성해
React `getSnapshot` 경고가 발생.

-> selector 내부 fallback 제거
-> 컴포넌트 레벨에서 `safeSets` 기본값 처리

---

### 배운 점

- 런타임 검증은 폼 UX와 데이터 품질을 동시에 지켜준다
- 불변성 보장과 참조 안정성은 별도로 설계해야 한다
- 사용자 입력 흐름(추가/수정/저장) 단계 분리가 유지보수성을 높인다

---

## 2026-02-15

### 운영

- [x] GitHub repo 생성 및 첫 push
- [x] GitHub Actions CI 추가 (`lint` / `typecheck` / `build`)
- [ ] Supabase 도입 전 전략 확정 (README 목표와 정합성 검토)

### 전략 메모

- README 목표상 네트워크가 불안정해도 운동 기록이 끊기면 안 된다.
- 따라서 현재 단계에서는 Local-first를 기본으로 유지한다.
- Supabase는 이후 선택적 동기화/백업 계층으로 도입한다.
