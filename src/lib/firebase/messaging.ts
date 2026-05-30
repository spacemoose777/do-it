import { getApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

export async function getFCMToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("[FCM] Firebase Messaging not supported in this browser/context");
      return null;
    }

    if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
      console.error("[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — push notifications will not work");
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    console.log("[FCM] Service worker ready, scope:", registration.scope);

    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("[FCM] Token obtained:", token.slice(0, 20) + "...");
    } else {
      console.warn("[FCM] getToken returned empty — permission may not be granted or VAPID key may be wrong");
    }

    return token || null;
  } catch (err) {
    console.error("[FCM] Failed to get token:", err);
    return null;
  }
}
