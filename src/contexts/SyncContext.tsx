"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { fullSync, initialLoad } from "@/lib/sync/sync-engine";
import { pendingCount } from "@/lib/sync/sync-queue";
import { clearAllData, getMeta } from "@/lib/db/indexed-db";

// Bump this string to force a one-time full resync on all clients.
// v4: clearAllData() wipes every IDB store so stale local records can't
// survive conflict resolution — the next triggerSync runs initialLoad
// and gets a completely fresh copy from Firestore.
const SYNC_MIGRATION_KEY = "do-it-sync-migration-v4";
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
      // One-time migration: clear stale queue items and reset last_sync so that
      // initialLoad runs on the next startup, pulling a clean copy from the server.
      if (!localStorage.getItem(SYNC_MIGRATION_KEY)) {
        // Wipe all local IDB data so stale records can't outlive a fresh pull
        await clearAllData();
        localStorage.setItem(SYNC_MIGRATION_KEY, "1");
      }

      // Check if we need an initial load
      const lastSync = await getMeta("last_sync");
      if (!lastSync) {
        await initialLoad(user.uid);
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
