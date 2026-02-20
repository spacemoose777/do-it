"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSync } from "@/contexts/SyncContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { clearAllData } from "@/lib/db/indexed-db";
import Header from "@/components/layout/Header";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { lastSyncedAt, pendingCount, triggerSync, isSyncing } = useSync();
  const isOnline = useOnlineStatus();

  const handleClearLocal = async () => {
    if (confirm("This will clear all local data. Your data will be re-synced from the server on next load. Continue?")) {
      await clearAllData();
      window.location.reload();
    }
  };

  const handleSignOut = async () => {
    await clearAllData();
    await signOut();
  };

  return (
    <>
      <Header title="Settings" />

      <div className="space-y-6">
        {/* Account */}
        <section className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Account</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">{user?.email}</p>
              <p className="text-xs text-text-secondary">Signed in</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="btn-danger w-full text-sm">
            Sign Out
          </button>
        </section>

        {/* Sync */}
        <section className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Sync</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Status</span>
              <span className={isOnline ? "text-success" : "text-warning"}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Last synced</span>
              <span className="text-text-primary">
                {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : "Never"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Pending changes</span>
              <span className={pendingCount > 0 ? "text-warning" : "text-text-primary"}>
                {pendingCount}
              </span>
            </div>
          </div>
          <button
            onClick={triggerSync}
            disabled={!isOnline || isSyncing}
            className="btn-secondary w-full text-sm"
          >
            {isSyncing ? "Syncing..." : "Sync Now"}
          </button>
        </section>

        {/* Data */}
        <section className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Data</h2>
          <button onClick={handleClearLocal} className="btn-secondary w-full text-sm">
            Clear Local Cache
          </button>
          <p className="text-xs text-text-secondary">
            Clears offline data. Your tasks remain safe on the server and will re-sync.
          </p>
        </section>

        {/* About */}
        <section className="card p-5 space-y-2">
          <h2 className="text-sm font-semibold text-text-primary">About</h2>
          <p className="text-xs text-text-secondary">
            Do It v1.0.0 — Voice-first task management
          </p>
        </section>
      </div>
    </>
  );
}
