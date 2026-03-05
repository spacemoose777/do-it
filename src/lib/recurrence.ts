import { v4 as uuidv4 } from "uuid";
import type { Task } from "@/types/task";
import { getNextOccurrence, nowISOString, todayDateString, tomorrowDateString } from "./date-utils";

export function createNextRecurringTask(completedTask: Task): Task | null {
  if (!completedTask.recurrence_rule || !completedTask.due_date) {
    return null;
  }

  let nextDueDate = getNextOccurrence(
    completedTask.recurrence_rule,
    completedTask.due_date
  );

  if (!nextDueDate) return null;

  // If the next occurrence is today or in the past (task was overdue), jump to
  // tomorrow instead of backfilling every missed day one at a time.
  // Uses <= so a 1-day-overdue daily task doesn't respawn due today again.
  const today = todayDateString();
  if (nextDueDate <= today) {
    nextDueDate = tomorrowDateString();
  }

  const now = nowISOString();

  return {
    ...completedTask,
    id: uuidv4(),
    is_completed: false,
    completed_at: null,
    is_my_day: false,
    my_day_date: null,
    due_date: nextDueDate,
    reminder_at: completedTask.reminder_at
      ? shiftReminder(completedTask.reminder_at, completedTask.due_date, nextDueDate)
      : null,
    sort_order: 0,
    created_at: now,
    updated_at: now,
  };
}

function shiftReminder(
  reminderAt: string,
  oldDueDate: string,
  newDueDate: string
): string {
  const reminderDate = new Date(reminderAt);
  const oldDue = new Date(oldDueDate);
  const newDue = new Date(newDueDate);
  const diffMs = newDue.getTime() - oldDue.getTime();
  return new Date(reminderDate.getTime() + diffMs).toISOString();
}

export function clearStaleMyDay(tasks: Task[]): Task[] {
  const today = todayDateString();
  return tasks.map((task) => {
    if (task.is_my_day && task.my_day_date && task.my_day_date < today) {
      return { ...task, is_my_day: false, my_day_date: null, updated_at: nowISOString() };
    }
    return task;
  });
}
