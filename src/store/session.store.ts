import { create } from "zustand";

import {
  getSession,
  upsertSessionSets,
} from "@/entities/session/repo/session.repo";
import type { SessionSet } from "@/lib/db";

export type { SessionSet };

const cloneSets = (sets: SessionSet[]): SessionSet[] =>
  sets.map((item) => ({
    id: item.id,
    weight: item.weight,
    reps: item.reps,
    completed: item.completed ?? false,
  }));

export type SessionStore = {
  sessions: Record<string, SessionSet[]>;
  persistenceErrors: Record<string, string | null>;
  hydrateSession: (sessionId: string) => Promise<void>;
  addSet: (
    sessionId: string,
    // 마지막 세트의 weight와 reps를 기본값으로 사용할 때 사용
    seed?: { weight: number; reps: number },
    options?: { persist?: boolean },
  ) => string;
  updateSet: (
    sessionId: string,
    setId: string,
    patch: Partial<Omit<SessionSet, "id">>,
  ) => void;
  removeSet: (
    sessionId: string,
    setId: string,
    options?: { persist?: boolean },
  ) => void;
  replaceSets: (sessionId: string, sets: SessionSet[]) => Promise<void>;
  clearPersistenceError: (sessionId: string) => void;
};

const buildPersistenceErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return "브라우저 저장 공간이 부족해 세션을 저장하지 못했습니다. 저장 공간을 정리한 뒤 다시 시도해 주세요.";
  }

  return "브라우저 저장소에 세션을 저장하지 못했습니다. 다시 시도해 주세요.";
};

export const useSessionStore = create<SessionStore>((set, get) => {
  const persistSessionSets = async (sessionId: string, sets: SessionSet[]) => {
    await upsertSessionSets(sessionId, sets);
    set((state) => ({
      persistenceErrors: {
        ...state.persistenceErrors,
        [sessionId]: null,
      },
    }));
  };

  return {
    sessions: {},
    persistenceErrors: {},
    hydrateSession: async (sessionId) => {
      const session = await getSession(sessionId);
      const hydratedSets = cloneSets(session?.sets ?? []);

      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: hydratedSets,
        },
        persistenceErrors: {
          ...state.persistenceErrors,
          [sessionId]: null,
        },
      }));
    },
    addSet: (sessionId, seed, options) => {
      const setId = crypto.randomUUID();
      const prev = get().sessions[sessionId] ?? [];
      const shouldPersist = options?.persist ?? true;
      // 마지막 세트 가져오기
      const last = prev.length ? prev[prev.length - 1] : undefined;
      // 마지막 세트가 없으면 seed 또는 기본값 사용
      const initial =
        seed ??
        (last
          ? { weight: last.weight, reps: last.reps }
          : { weight: 0, reps: 1 });
      // 새 세트 추가
      const next = [...prev, { id: setId, ...initial, completed: false }];

      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: next,
        },
      }));
      if (shouldPersist) {
        void persistSessionSets(sessionId, next).catch((error: unknown) => {
          const message = buildPersistenceErrorMessage(error);
          set((state) => ({
            persistenceErrors: {
              ...state.persistenceErrors,
              [sessionId]: message,
            },
          }));
          console.error("Failed to persist session sets.", error);
        });
      }

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
      void persistSessionSets(sessionId, next).catch((error: unknown) => {
        const message = buildPersistenceErrorMessage(error);
        set((state) => ({
          persistenceErrors: {
            ...state.persistenceErrors,
            [sessionId]: message,
          },
        }));
        console.error("Failed to persist session sets.", error);
      });
    },
    removeSet: (sessionId, setId, options) => {
      const prev = get().sessions[sessionId] ?? [];
      const shouldPersist = options?.persist ?? true;
      const next = prev.filter((item) => item.id !== setId);

      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: next,
        },
      }));
      if (shouldPersist) {
        void persistSessionSets(sessionId, next).catch((error: unknown) => {
          const message = buildPersistenceErrorMessage(error);
          set((state) => ({
            persistenceErrors: {
              ...state.persistenceErrors,
              [sessionId]: message,
            },
          }));
          console.error("Failed to persist session sets.", error);
        });
      }
    },
    replaceSets: async (sessionId, sets) => {
      const next = cloneSets(sets);

      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: next,
        },
      }));
      await persistSessionSets(sessionId, next);
    },
    clearPersistenceError: (sessionId) => {
      set((state) => ({
        persistenceErrors: {
          ...state.persistenceErrors,
          [sessionId]: null,
        },
      }));
    },
  };
});
