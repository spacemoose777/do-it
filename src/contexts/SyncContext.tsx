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

      // Check if we need an initial load
      const lastSync = await getMeta("last_sync");
      if (!lastSync) {
        // Retry initialLoad up to 3 times — a transient network error should
        // not leave the app permanently empty.
        let loadErr: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await initialLoad(user.uid);
            loadErr = undefined;
            break;
          } catch (e) {
            loadErr = e;
            if (attempt < 2) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          }
        }
        if (loadErr) throw loadErr;
      } else {
        await fullSync(user.uid);
      }

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
      const message = err instanceof Error ? err.message : "Sync failed";
      console.error("[SyncContext] Sync failed:", err);
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        error: message,
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
