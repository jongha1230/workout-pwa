# 🏋️ Workout PWA

## 🎯 Goal

운동 기록은 네트워크가 불안정한 환경에서도 끊기지 않아야 한다.
본 프로젝트는 **오프라인 우선 설계를 고려한 운동 기록 PWA**로,
입력 마찰을 최소화한 **“10초 기록 UX”** 구현을 목표로 한다.

---

## 🧠 Core Design Decisions

### 1️⃣ UI 상태와 확정 상태 분리

- 입력 중 상태는 `draftBySetId`로 관리
- 저장 시점에만 Zod 검증 후 Zustand store에 반영
- 입력 단계와 확정 데이터를 분리하여 UX 안정성 확보

---

### 2️⃣ 런타임 입력 검증 전략

- TypeScript는 컴파일 타임 검증만 수행
- 사용자 입력은 런타임 데이터이므로 Zod로 최종 검증 수행
- `z.coerce.number()`를 사용하여 문자열 입력을 안전하게 숫자로 변환 후 추가 검증

---

### 3️⃣ 최근값 기반 자동 채움 UX

- 새 세트 추가 시 직전 세트 값을 기본값으로 자동 설정
- 반복 입력을 최소화하여 실제 운동 환경에 적합한 입력 흐름 제공

---

## 🎬 Demo Scenarios

1. 홈 `세션 시작` 또는 루틴 상세 `이 루틴으로 시작` → 즉시 `/session/[id]` 진입 → 세트 추가
2. 새 세트 추가 시 이전 세트 값 자동 채움
3. 저장 시 Zod 기반 입력 검증 및 에러 메시지 표시
4. 세트 수정 및 삭제 가능

---

## 🛠 Tech Stack

- **Next.js (App Router)**
- **Zustand** – 경량 상태 관리
- **Zod** – 런타임 입력 검증
- **shadcn/ui + Tailwind CSS** – 컴포넌트 기반 UI 구성

---

## 🔥 Technical Highlights

_상세 개발 과정은 DEVLOG에 정리했습니다._

- **Local-first Architecture**: IndexedDB(Dexie)에 세션/루틴 데이터를 로컬로 저장
- **Persistence Verification**: 수동 재현과 Playwright E2E에서 새로고침 후 데이터 유지 확인
- **Quality Gate**: GitHub Actions에서 `lint`, `typecheck`, `build`, `test:e2e` 자동 실행

---

## 📓 Development Log

개발 과정 및 트러블슈팅 기록은 아래 문서에 정리되어 있습니다.

👉 [`docs/DEVLOG.md`](./docs/DEVLOG.md)

---
