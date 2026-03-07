import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getFCMToken } from "@/lib/firebase/messaging";

export async function registerFCMToken(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

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
