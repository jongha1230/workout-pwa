# 🏋️ Workout PWA

## 🎯 Goal

운동 기록은 네트워크가 불안정한 환경에서도 끊기지 않아야 한다.
본 프로젝트는 **오프라인 우선 설계를 고려한 운동 기록 PWA**로,
입력 마찰을 최소화한 **“10초 기록 UX”** 구현을 목표로 한다.

---

## 🔥 2026-02-17 기술 하이라이트 (Technical Highlights)

- 정보구조(IA) 재정렬: Home / Routines / Session 책임 분리
- Dexie 기반 Local-first 영속화 + hydration 적용
- 자동 채움 로직을 세션 내부로 제한 (Predictable UX)
- 저장 후 자동 리디렉션 제거
- Playwright E2E로 새로고침/재진입 복구 검증

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

1. 루틴 선택 → 세션 시작 → 세트 추가
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

## 📓 Development Log

개발 과정 및 트러블슈팅 기록은 아래 문서에 정리되어 있습니다.

👉 [`docs/DEVLOG.md`](./docs/DEVLOG.md)

---
