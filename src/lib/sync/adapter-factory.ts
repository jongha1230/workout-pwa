import { NoopSyncAdapter } from "@/lib/sync/noop-adapter";
import { SupabaseSyncAdapter } from "@/lib/sync/supabase-adapter";
import type { SyncAdapter } from "@/lib/sync/types";

export const createSyncAdapter = (): SyncAdapter => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const supabaseSyncTable =
    process.env.NEXT_PUBLIC_SUPABASE_SYNC_TABLE?.trim() || "sync_events";

  if (supabaseUrl.length === 0 || supabaseAnonKey.length === 0) {
    return new NoopSyncAdapter();
  }

  return new SupabaseSyncAdapter({
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    tableName: supabaseSyncTable,
  });
};
