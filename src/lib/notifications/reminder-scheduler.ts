import { getAllTasks, putTask } from "@/lib/db/indexed-db";
import { enqueue } from "@/lib/sync/sync-queue";
import { nowISOString } from "@/lib/date-utils";
import { showLocalNotification } from "./push-manager";

let checkInterval: NodeJS.Timeout | null = null;

export function startReminderChecker(userId: string): void {
  // Check every 60 seconds for due reminders
  if (checkInterval) clearInterval(checkInterval);

  checkInterval = setInterval(() => {
    checkReminders(userId);
  }, 60000);

  // Also check immediately
  checkReminders(userId);
}

export function stopReminderChecker(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

async function checkReminders(userId: string): Promise<void> {
  try {
    const tasks = await getAllTasks(userId);
    const now = new Date();

    for (const task of tasks) {
      if (task.is_completed) continue;

      // Support both the new `reminders` array and the legacy `reminder_at` field
      const allReminders: string[] = task.reminders?.length
        ? task.reminders
        : task.reminder_at
          ? [task.reminder_at]
          : [];

      const dueNow = allReminders.filter((r) => new Date(r) <= now);
      if (dueNow.length === 0) continue;

      // Fire a notification for each due reminder
      for (const r of dueNow) {
        await showLocalNotification(`Reminder: ${task.title}`, {
          body: task.notes || "You have a task reminder",
          tag: `reminder-${task.id}-${r}`,
          taskId: task.id,
        });
      }

      // Remove fired reminders so they don't fire again on the next check
      const remaining = allReminders.filter((r) => new Date(r) > now);
      const updated = {
        ...task,
        reminders: remaining,
        reminder_at: remaining[0] ?? null,
        updated_at: nowISOString(),
      };
      await putTask(updated);
      await enqueue("tasks", task.id, "UPDATE", updated as unknown as Record<string, unknown>);
    }
  } catch (err) {
    console.error("Reminder check failed:", err);
  }
}

export async function checkOverdueReminders(userId: string): Promise<void> {
  await checkReminders(userId);
}
