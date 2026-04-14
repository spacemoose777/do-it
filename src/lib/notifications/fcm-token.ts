import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getFCMToken } from "@/lib/firebase/messaging";

export async function registerFCMToken(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission === "denied") return;

  // Request permission upfront if not yet decided — this is the one prompt the user sees
  if (Notification.permission === "default") {
    const result = await Notification.requestPermission();
    if (result !== "granted") return;
  }

  const token = await getFCMToken();
  if (!token) return;

  await setDoc(doc(db, "users", userId, "fcm_tokens", token), {
    token,
    updatedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
  });
}

export async function unregisterFCMToken(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const token = await getFCMToken();
    if (!token) return;
    await deleteDoc(doc(db, "users", userId, "fcm_tokens", token));
  } catch {
    // Token may already be gone
  }
}
