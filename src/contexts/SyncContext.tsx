"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { fullSync, initialLoad, pushChanges } from "@/lib/sync/sync-engine";
import { pendingCount } from "@/lib/sync/sync-queue";
import { deleteMeta, getMeta } from "@/lib/db/indexed-db";

// Bump this string to force a one-time full resync on all clients.
// v5: push pending local changes first, then clear last_sync so initialLoad
// fetches a fresh copy from Firestore. Non-destructive — IDB is not wiped,
// so tasks are not lost if the network is unavailable during migration.
const SYNC_MIGRATION_KEY = "do-it-sync-migration-v5";
import type { SyncState } from "@/types/sync";

interface SyncContextType extends SyncState {
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

// How long a sync is allowed to run before we abort and retry next interval.
// Keeps the Firestore SDK from spinning heavy reconnect logic for too long on
// degraded connections, which was causing the JS thread to stall and making
// UI interactions (e.g. bottom nav taps) appear frozen.
const SYNC_TIMEOUT_MS = 15_000;

function withSyncTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Sync timed out")), SYNC_TIMEOUT_MS)
    ),
  ]);
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
    error: null,
  });
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  const updatePendingCount = useCallback(async () => {
    const count = await pendingCount();
    setState((prev) => ({ ...prev, pendingCount: count }));
  }, []);

  const triggerSync = useCallback(async () => {
    if (!user || !isOnline || isSyncingRef.current) return;
    // Don't sync while the page is hidden — saves the JS thread for when the
    // user is actually looking at the app.
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

    isSyncingRef.current = true;
    setState((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      // One-time migration: push any pending local changes, then force a fresh
      // initialLoad from Firestore so stale local records are overwritten by
      // authoritative server data.
      if (!localStorage.getItem(SYNC_MIGRATION_KEY)) {
        // Flush pending queue first so local changes aren't lost
        await pushChanges(user.uid);
        // Clear last_sync so the initialLoad branch below runs
        await deleteMeta("last_sync");
        localStorage.setItem(SYNC_MIGRATION_KEY, "1");
      }

      // Check if we need an initial load, wrapped in a timeout so a hanging
      // Firestore request doesn't stall the JS thread indefinitely.
      const lastSync = await getMeta("last_sync");
      await withSyncTimeout(
        lastSync ? fullSync(user.uid).then(() => undefined) : initialLoad(user.uid)
      );

      const count = await pendingCount();
      isSyncingRef.current = false;
      setState({
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
        pendingCount: count,
        error: null,
      });
    } catch (err) {
      isSyncingRef.current = false;
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        error: err instanceof Error ? err.message : "Sync failed",
      }));
    }
  }, [user, isOnline]);

  // Initial sync on login
  useEffect(() => {
    if (user && isOnline) {
      triggerSync();
    }
  }, [user?.uid, isOnline]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic sync every 30 seconds when online
  useEffect(() => {
    if (user && isOnline) {
      syncIntervalRef.current = setInterval(() => {
        triggerSync();
      }, 30000);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [user?.uid, isOnline, triggerSync]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && user) {
      triggerSync();
    }
  }, [isOnline]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Sync when the tab becomes visible again (user switches back to the app).
  // This catches the case where the background interval was skipped.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && isOnline && user) {
        triggerSync();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isOnline, triggerSync]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update pending count periodically
  useEffect(() => {
    updatePendingCount();
  }, [state.isSyncing, updatePendingCount]);

  return (
    <SyncContext.Provider value={{ ...state, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error("useSync must be used within SyncProvider");
  return context;
}
