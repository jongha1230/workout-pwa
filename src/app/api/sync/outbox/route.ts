import { NextResponse } from "next/server";

import { isRetryableHttpStatus } from "@/lib/sync/retry-policy";
import type { OutboxEvent } from "@/lib/sync/types";

type SyncApiResponse =
  | { ok: true }
  | { ok: false; retryable: boolean; error: string };

const DEFAULT_SYNC_TABLE = "sync_events";
const MAX_SYNC_REQUEST_BYTES = 64 * 1024;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isValidOutboxEvent = (value: unknown): value is OutboxEvent => {
  if (!isRecord(value)) return false;

  const hasStringField = (...keys: string[]): boolean =>
    keys.every((key) => typeof value[key] === "string");

  const hasNumberField = (...keys: string[]): boolean =>
    keys.every((key) => typeof value[key] === "number");

  const hasValidEntityType =
    value.entityType === "session" || value.entityType === "routine";
  const hasValidOperation =
    value.op === "create" || value.op === "update" || value.op === "delete";

  return (
    hasStringField("id", "entityId") &&
    hasNumberField("createdAt", "updatedAt", "attemptCount") &&
    hasValidEntityType &&
    hasValidOperation &&
    isRecord(value.payload)
  );
};

const createResponse = (
  body: SyncApiResponse,
  status: number,
): NextResponse<SyncApiResponse> => NextResponse.json(body, { status });

const normalizeOrigin = (
  value: string,
): { protocol: string; hostname: string; port: string } | null => {
  try {
    const url = new URL(value);
    return {
      protocol: url.protocol,
      hostname: url.hostname.toLowerCase(),
      port:
        url.port || (url.protocol === "https:" ? "443" : url.protocol === "http:" ? "80" : ""),
    };
  } catch {
    return null;
  }
};

const isLoopbackHostname = (hostname: string): boolean =>
  LOOPBACK_HOSTS.has(hostname.toLowerCase());

const isEquivalentOrigin = (
  left: { protocol: string; hostname: string; port: string },
  right: { protocol: string; hostname: string; port: string },
): boolean => {
  if (left.protocol !== right.protocol || left.port !== right.port) {
    return false;
  }

  if (left.hostname === right.hostname) {
    return true;
  }

  return isLoopbackHostname(left.hostname) && isLoopbackHostname(right.hostname);
};

const isLegacyJwtKey = (value: string): boolean =>
  value.split(".").length === 3;

const createSupabaseAuthHeaders = (apiKey: string): HeadersInit => {
  const headers: HeadersInit = {
    apikey: apiKey,
  };

  if (isLegacyJwtKey(apiKey)) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
};

const isSameOriginRequest = (request: Request): boolean => {
  const originHeader = request.headers.get("origin");
  if (!originHeader) {
    return true;
  }

  const requestOrigin = normalizeOrigin(request.url);
  const origin = normalizeOrigin(originHeader);
  if (!requestOrigin || !origin) {
    return false;
  }

  if (isEquivalentOrigin(origin, requestOrigin)) {
    return true;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!forwardedHost) {
    return false;
  }

  const inferredProtocol =
    forwardedProto?.trim() ||
    requestOrigin.protocol.slice(0, requestOrigin.protocol.length - 1);
  const forwardedOrigin = normalizeOrigin(`${inferredProtocol}://${forwardedHost}`);
  return forwardedOrigin ? isEquivalentOrigin(origin, forwardedOrigin) : false;
};

export async function POST(
  request: Request,
): Promise<NextResponse<SyncApiResponse>> {
  const isRouteEnabled = process.env.SYNC_ROUTE_ENABLED?.trim() === "true";
  if (!isRouteEnabled) {
    return createResponse(
      {
        ok: false,
        retryable: false,
        error: "Sync route is disabled.",
      },
      503,
    );
  }

  if (!isSameOriginRequest(request)) {
    return createResponse(
      {
        ok: false,
        retryable: false,
        error: "Cross-origin sync request is not allowed.",
      },
      403,
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_SYNC_REQUEST_BYTES
  ) {
    return createResponse(
      {
        ok: false,
        retryable: false,
        error: "Sync request payload is too large.",
      },
      413,
    );
  }

  const body = (await request.json().catch(() => null)) as unknown;
  if (!isValidOutboxEvent(body)) {
    return createResponse(
      {
        ok: false,
        retryable: false,
        error: "Invalid outbox event payload.",
      },
      400,
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const syncTable =
    process.env.SUPABASE_SYNC_TABLE?.trim() || DEFAULT_SYNC_TABLE;

  if (supabaseUrl.length === 0 || serviceRoleKey.length === 0) {
    return createResponse(
      {
        ok: false,
        retryable: false,
        error: "Sync server environment is missing.",
      },
      500,
    );
  }

  const syncEndpoint = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/${syncTable}`;

  try {
    const response = await fetch(syncEndpoint, {
      method: "POST",
      headers: {
        ...createSupabaseAuthHeaders(serviceRoleKey),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        id: body.id,
        entity_type: body.entityType,
        entity_id: body.entityId,
        op: body.op,
        payload: body.payload,
        client_created_at: body.createdAt,
        client_updated_at: body.updatedAt,
        client_attempt_count: body.attemptCount,
      }),
    });

    if (response.ok) {
      return createResponse({ ok: true }, 200);
    }

    const upstreamError = await response.text().catch(() => "");
    const retryable = isRetryableHttpStatus(response.status);
    console.error("Supabase sync request failed.", {
      status: response.status,
      body: upstreamError,
    });

    return createResponse(
      {
        ok: false,
        retryable,
        error:
          upstreamError.length > 0
            ? `Supabase sync failed with status ${response.status}: ${upstreamError}`
            : `Supabase sync failed with status ${response.status}`,
      },
      retryable ? 503 : 400,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sync route error";
    return createResponse(
      {
        ok: false,
        retryable: true,
        error: message,
      },
      503,
    );
  }
}
