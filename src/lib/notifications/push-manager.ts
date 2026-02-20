export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  const result = await Notification.requestPermission();
  return result === "granted";
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function showLocalNotification(
  title: string,
  options?: NotificationOptions & { taskId?: string }
): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const registration = await navigator.serviceWorker?.ready;
  if (registration) {
    await registration.showNotification(title, {
      body: options?.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: options?.tag || "reminder",
      data: { taskId: options?.taskId },
      vibrate: [200, 100, 200],
      ...options,
    });
  } else {
    // Fallback to regular notification
    new Notification(title, {
      body: options?.body,
      icon: "/icons/icon-192.png",
    });
  }
}
