export const PENDING_SESSION_ID_STORAGE_KEY = "workout-pwa:pending-session-id";
const PENDING_SESSION_TTL_MS = 5 * 60 * 1000;

type PendingSessionPayload = {
  sessionId: string;
  createdAt: number;
};

export const setPendingSessionId = (sessionId: string): void => {
  if (typeof window === "undefined") return;

  const payload: PendingSessionPayload = {
    sessionId,
    createdAt: Date.now(),
  };
  window.localStorage.setItem(
    PENDING_SESSION_ID_STORAGE_KEY,
    JSON.stringify(payload),
  );
};

export const consumePendingSessionId = (sessionId: string): boolean => {
  if (typeof window === "undefined") return false;

  const rawPayload = window.localStorage.getItem(
    PENDING_SESSION_ID_STORAGE_KEY,
  );
  if (!rawPayload) {
    return false;
  }

  let payload: PendingSessionPayload | null = null;
  try {
    payload = JSON.parse(rawPayload) as PendingSessionPayload;
  } catch {
    window.localStorage.removeItem(PENDING_SESSION_ID_STORAGE_KEY);
    return false;
  }

  const isValidShape =
    Boolean(payload?.sessionId) && Number.isFinite(payload?.createdAt);
  if (!isValidShape) {
    window.localStorage.removeItem(PENDING_SESSION_ID_STORAGE_KEY);
    return false;
  }

  const isExpired = Date.now() - payload.createdAt > PENDING_SESSION_TTL_MS;
  if (isExpired) {
    window.localStorage.removeItem(PENDING_SESSION_ID_STORAGE_KEY);
    return false;
  }

  if (payload.sessionId !== sessionId) {
    return false;
  }

  window.localStorage.removeItem(PENDING_SESSION_ID_STORAGE_KEY);
  return true;
};
