import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

type TaskDoc = admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>;

export const sendReminders = onSchedule(
  { schedule: "every 5 minutes", timeZone: "UTC" },
  async () => {
    const now = new Date();
    const nowISO = now.toISOString();

    // Collection group query — searches users/{uid}/tasks across all users
    const tasksSnap = await db
      .collectionGroup("tasks")
      .where("reminder_at", "<=", nowISO)
      .get();

    if (tasksSnap.empty) return;

    // Group tasks by user — uid comes from the doc path (users/{uid}/tasks/{taskId})
    // because user_id is stripped from the Firestore doc when pushed by the client
    const byUser = new Map<string, TaskDoc[]>();
    for (const doc of tasksSnap.docs) {
      const data = doc.data();
      if (data["is_completed"] === true) continue;
      if (!data["reminder_at"]) continue;

      const uid = doc.ref.parent.parent?.id;
      if (!uid) continue;
      if (!byUser.has(uid)) byUser.set(uid, []);
      byUser.get(uid)!.push(doc);
    }

    for (const [uid, tasks] of byUser) {
      // Get all FCM tokens for this user
      const tokensSnap = await db
        .collection("users")
        .doc(uid)
        .collection("fcm_tokens")
        .get();

      if (tokensSnap.empty) continue;

      const tokens = tokensSnap.docs
        .map((d) => d.data()["token"] as string)
        .filter(Boolean);
      if (tokens.length === 0) continue;

      const batch = db.batch();

      for (const taskDoc of tasks) {
        const task = taskDoc.data();

        // Data-only FCM messages — our SW push handler shows the notification
        const messages: admin.messaging.Message[] = tokens.map((token) => ({
          token,
          data: {
            title: `Reminder: ${task["title"] as string}`,
            body: (task["notes"] as string) || "You have a task reminder",
            tag: `reminder-${taskDoc.id}`,
            taskId: taskDoc.id,
          },
        }));

        try {
          const result = await messaging.sendEach(messages);

          // Remove stale tokens
          for (let i = 0; i < result.responses.length; i++) {
            if (!result.responses[i].success) {
              const code = result.responses[i].error?.code;
              if (
                code === "messaging/registration-token-not-registered" ||
                code === "messaging/invalid-registration-token"
              ) {
                const staleToken = tokens[i];
                const staleDoc = tokensSnap.docs.find(
                  (d) => (d.data()["token"] as string) === staleToken
                );
                if (staleDoc) batch.delete(staleDoc.ref);
              }
            }
          }
        } catch (err) {
          console.error(`FCM send error for user ${uid}:`, err);
        }

        // Clear the fired reminder from the task
        const rawReminders = task["reminders"];
        const allReminders: string[] =
          Array.isArray(rawReminders) && rawReminders.length > 0
            ? (rawReminders as string[])
            : task["reminder_at"]
              ? [task["reminder_at"] as string]
              : [];

        const remaining = allReminders.filter((r) => new Date(r) > now);

        batch.update(taskDoc.ref, {
          reminders: remaining,
          reminder_at: remaining[0] ?? null,
          updated_at: nowISO,
        });
      }

      await batch.commit();
    }
  }
);
