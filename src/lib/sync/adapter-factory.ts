import { ApiSyncAdapter } from "@/lib/sync/api-adapter";
import { NoopSyncAdapter } from "@/lib/sync/noop-adapter";
import type { SyncAdapter } from "@/lib/sync/types";

export const createSyncAdapter = (): SyncAdapter => {
  const transport =
    process.env.NEXT_PUBLIC_SYNC_TRANSPORT?.trim().toLowerCase();

  if (transport !== "api") {
    return new NoopSyncAdapter();
  }

  return new ApiSyncAdapter();
};
