export const PENDING_SESSION_ID_STORAGE_KEY = "workout-pwa:pending-session-id";

export const setPendingSessionId = (sessionId: string): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_SESSION_ID_STORAGE_KEY, sessionId);
};

export const consumePendingSessionId = (sessionId: string): boolean => {
  if (typeof window === "undefined") return false;

  const pendingSessionId = window.localStorage.getItem(
    PENDING_SESSION_ID_STORAGE_KEY,
  );
  if (pendingSessionId !== sessionId) {
    return false;
  }

  window.localStorage.removeItem(PENDING_SESSION_ID_STORAGE_KEY);
  return true;
};
