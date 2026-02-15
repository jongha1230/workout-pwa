import { create } from "zustand";

export type SessionSet = {
  id: string;
  weight: number;
  reps: number;
};

type SessionStore = {
  sessions: Record<string, SessionSet[]>;
  addSet: (
    sessionId: string,
    // 마지막 세트의 weight와 reps를 기본값으로 사용할 때 사용
    seed?: { weight: number; reps: number },
  ) => string;
  updateSet: (
    sessionId: string,
    setId: string,
    patch: Partial<Omit<SessionSet, "id">>,
  ) => void;
  removeSet: (sessionId: string, setId: string) => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: {},
  addSet: (sessionId, seed) => {
    const setId = crypto.randomUUID();
    set((state) => {
      const prev = state.sessions[sessionId] ?? [];
      // 마지막 세트 가져오기
      const last = prev.length ? prev[prev.length - 1] : undefined;
      // 마지막 세트가 없으면 seed 또는 기본값 사용
      const initial =
        seed ??
        (last
          ? { weight: last.weight, reps: last.reps }
          : { weight: 0, reps: 1 });
      // 새 세트 추가
      const next = [...prev, { id: setId, ...initial }];
      // 상태 업데이트
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: next,
        },
      };
    });
    return setId;
  },
  updateSet: (sessionId, setId, patch) => {
    set((state) => {
      const prev = state.sessions[sessionId] ?? [];

      const next = prev.map((item) => {
        if (item.id !== setId) return item;
        return { ...item, ...patch };
      });

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: next,
        },
      };
    });
  },

  removeSet: (sessionId, setId) => {
    set((state) => {
      const prev = state.sessions[sessionId] ?? [];
      const next = prev.filter((item) => item.id !== setId);
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: next,
        },
      };
    });
  },
}));
