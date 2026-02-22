"use client";

import { useEffect } from "react";

const SERVICE_WORKER_PATH = "/sw.js";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
      } catch (error) {
        console.error("Failed to register service worker.", error);
      }
    };

    void registerServiceWorker();
  }, []);

  return null;
}
