"use client";

import { useEffect } from "react";

import { startSyncEngine, stopSyncEngine } from "@/lib/sync/sync-engine";

export default function SyncEngineBootstrap() {
  useEffect(() => {
    startSyncEngine();

    return () => {
      stopSyncEngine();
    };
  }, []);

  return null;
}
