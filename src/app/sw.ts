/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const taskId = event.notification.data?.taskId;
  const url = taskId ? `/task/${taskId}` : "/my-day";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});

// Handle push notifications (data-only fallback — webpush.notification is handled natively by Chrome)
self.addEventListener("push", (event) => {
  console.log("[SW] Push received, has data:", !!event.data);

  // When the Cloud Function sends webpush.notification, Chrome shows the notification
  // natively and event.data will be empty or contain only non-notification data.
  // We only need to show a notification here for data-only fallback messages.
  if (!event.data) return;

  let payload: Record<string, unknown> = {};
  try {
    payload = event.data.json() as Record<string, unknown>;
    console.log("[SW] Push payload keys:", Object.keys(payload));
  } catch {
    // Treat as plain text
    event.waitUntil(
      self.registration.showNotification("Do It", {
        body: event.data.text(),
        icon: "/icons/icon-192.png",
      })
    );
    return;
  }

  // If the payload contains a notification object, Chrome already showed it natively.
  // Showing it again here would create a duplicate — skip.
  if (payload.notification) return;

  // Data-only message — show it ourselves
  const title = (payload.title as string) || "Do It";
  const body = (payload.body as string) || "You have a reminder";
  const tag = (payload.tag as string) || "reminder";
  const taskId = (payload.taskId as string) || undefined;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag,
      data: { taskId },
    } as NotificationOptions)
  );
});

serwist.addEventListeners();
