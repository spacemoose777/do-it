"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-warning/90 text-black text-center py-1 text-xs font-medium z-50">
      You&apos;re offline. Changes will sync when you reconnect.
    </div>
  );
}
