import { getAllTasks } from "@/lib/db/indexed-db";
import { showLocalNotification } from "./push-manager";

let checkInterval: NodeJS.Timeout | null = null;

export function startReminderChecker(userId: string): void {
  // Check every 30 seconds for due reminders
  if (checkInterval) clearInterval(checkInterval);

  checkInterval = setInterval(() => {
    checkReminders(userId);
  }, 30000);

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
      if (
        task.reminder_at &&
        !task.is_completed &&
        new Date(task.reminder_at) <= now
      ) {
        // Show notification
        await showLocalNotification(`Reminder: ${task.title}`, {
          body: task.notes || "You have a task reminder",
          tag: `reminder-${task.id}`,
          taskId: task.id,
        });

        // Clear the reminder so it doesn't fire again
        // We don't update via the hook here to avoid circular deps
        // The user will see the notification and can act on it
      }
    }
  } catch (err) {
    console.error("Reminder check failed:", err);
  }
}

export async function checkOverdueReminders(userId: string): Promise<void> {
  await checkReminders(userId);
}
