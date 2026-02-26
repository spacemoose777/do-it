"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { startReminderChecker, stopReminderChecker } from "@/lib/notifications/reminder-scheduler";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import OfflineIndicator from "@/components/layout/OfflineIndicator";
import ToastContainer from "@/components/ui/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      startReminderChecker(user.uid);
      return () => stopReminderChecker();
    }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <SyncProvider>
      <OfflineIndicator />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-h-screen pb-20 md:pb-0">
          <div className="max-w-2xl mx-auto px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
      <ToastContainer />
    </SyncProvider>
  );
}
