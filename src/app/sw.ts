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

// Handle push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || "Do It", {
        body: data.body || "You have a reminder",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag || "reminder",
        data: data.data,
        vibrate: [200, 100, 200],
      })
    );
  } catch {
    // Not JSON, use as plain text
    event.waitUntil(
      self.registration.showNotification("Do It", {
        body: event.data.text(),
        icon: "/icons/icon-192.png",
      })
    );
  }
});

serwist.addEventListeners();
