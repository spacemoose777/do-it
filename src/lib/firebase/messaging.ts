import { getApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

export async function getFCMToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;

    const registration = await navigator.serviceWorker.ready;
    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch {
    return null;
  }
}
