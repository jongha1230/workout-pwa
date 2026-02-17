import { create } from "zustand";

import { getSession, upsertSessionSets } from "@/entities/session/repo/session.repo";
import type { SessionSet } from "@/lib/db";

export type { SessionSet };

const cloneSets = (sets: SessionSet[]): SessionSet[] =>
  sets.map((item) => ({
    id: item.id,
    weight: item.weight,
    reps: item.reps,
  }));

export type SessionStore = {
  sessions: Record<string, SessionSet[]>;
  hydrateSession: (sessionId: string) => Promise<void>;
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
  replaceSets: (sessionId: string, sets: SessionSet[]) => void;
};

export const useSessionStore = create<SessionStore>((set, get) => {
  const persistSessionSets = (sessionId: string, sets: SessionSet[]) => {
    void upsertSessionSets(sessionId, sets).catch((error: unknown) => {
      console.error("Failed to persist session sets.", error);
    });
  };

  return {
    sessions: {},
    hydrateSession: async (sessionId) => {
      const session = await getSession(sessionId);
      const hydratedSets = cloneSets(session?.sets ?? []);

      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: hydratedSets,
        },
      }));
    },
    addSet: (sessionId, seed) => {
      const setId = crypto.randomUUID();
      const prev = get().sessions[sessionId] ?? [];
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

      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: next,
        },
      }));
      persistSessionSets(sessionId, next);

      return setId;
    },
    updateSet: (sessionId, setId, patch) => {
      const prev = get().sessions[sessionId] ?? [];
      const next = prev.map((item) => {
        if (item.id !== setId) return item;
        return { ...item, ...patch };
      });

      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: next,
        },
      }));
      persistSessionSets(sessionId, next);
    },
    removeSet: (sessionId, setId) => {
      const prev = get().sessions[sessionId] ?? [];
      const next = prev.filter((item) => item.id !== setId);

      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: next,
        },
      }));
      persistSessionSets(sessionId, next);
    },
    replaceSets: (sessionId, sets) => {
      const next = cloneSets(sets);

      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: next,
        },
      }));
      persistSessionSets(sessionId, next);
    },
  };
});
