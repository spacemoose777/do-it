"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { fullSync, initialLoad, pushChanges } from "@/lib/sync/sync-engine";
import { pendingCount } from "@/lib/sync/sync-queue";
import { deleteMeta, getMeta } from "@/lib/db/indexed-db";
import type { SyncState } from "@/types/sync";

// Bump this string to force a one-time full resync on all clients.
const SYNC_MIGRATION_KEY = "do-it-sync-migration-v5";

// Safe localStorage helpers — localStorage can throw in Safari Private Browsing
// and some WebView environments. Failures are silent so they don't break sync.
function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

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
      // Ensure the Firebase Auth ID token is refreshed before making any
      // Firestore requests. onAuthStateChanged can fire while the token is
      // still being refreshed asynchronously; getDocsFromServer (unlike getDocs)
      // does not tolerate an unready auth state and will throw immediately.
      await user.getIdToken(/* forceRefresh */ false);

      // One-time migration: push pending local changes, then force initialLoad.
      if (!lsGet(SYNC_MIGRATION_KEY)) {
        await pushChanges(user.uid);
        await deleteMeta("last_sync");
        lsSet(SYNC_MIGRATION_KEY, "1");
      }

      // Decide: initial load (first ever sync) or incremental sync.
      const lastSync = await getMeta("last_sync");
      if (!lastSync) {
        let loadErr: unknown;
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            await initialLoad(user.uid);
            loadErr = undefined;
            break;
          } catch (e) {
            loadErr = e;
            // Back-off: 1s, 2s, 4s, 8s
            if (attempt < 4) await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
          }
        }
        if (loadErr) throw loadErr;
      } else {
        let syncErr: unknown;
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            await fullSync(user.uid);
            syncErr = undefined;
            break;
          } catch (e) {
            syncErr = e;
            if (attempt < 4) await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
          }
        }
        if (syncErr) throw syncErr;
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
      // Surface the real Firebase error code so it is visible in the UI
      // (e.g. "permission-denied", "unavailable", "unauthenticated").
      const message =
        err instanceof Error
          ? (err as any).code
            ? `${(err as any).code}: ${err.message}`
            : err.message
          : "Sync failed";
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
