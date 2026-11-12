"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { startSync } from "@/lib/store/sync";

/**
 * Loads the saved state after first paint, then starts the sync queue.
 * Renders nothing.
 */
export function StoreBoot() {
  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    void Promise.resolve(useStore.persist.rehydrate()).then(() => {
      if (cancelled) return;
      useStore.setState({ hydrated: true });
      stop = startSync();
    });
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      cancelled = true;
      stop();
    };
  }, []);
  return null;
}
