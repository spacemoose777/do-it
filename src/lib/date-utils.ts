import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  isPast,
  isThisWeek,
  parseISO,
  startOfDay,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  setDay,
  setDate,
  getDay,
} from "date-fns";
import type { RecurrenceRule } from "@/types/task";

export function formatDueDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date)) return format(date, "EEEE");
  return format(date, "MMM d");
}

export function formatFullDate(dateStr: string): string {
  return format(parseISO(dateStr), "EEEE, MMMM d, yyyy");
}

export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function formatReminderDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return `Today at ${format(date, "h:mm a")}`;
  if (isTomorrow(date)) return `Tomorrow at ${format(date, "h:mm a")}`;
  return format(date, "MMM d 'at' h:mm a");
}

export function isDueDateOverdue(dateStr: string): boolean {
  const date = startOfDay(parseISO(dateStr));
  const today = startOfDay(new Date());
  return isPast(date) && date < today;
}

export function todayDateString(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function nowISOString(): string {
  return new Date().toISOString();
}

export function getNextOccurrence(rule: RecurrenceRule, fromDate: string): string | null {
  const date = parseISO(fromDate);
  const interval = rule.interval || 1;

  let next: Date;

  switch (rule.type) {
    case "daily":
      next = addDays(date, interval);
      break;

    case "weekdays": {
      next = addDays(date, 1);
      while (getDay(next) === 0 || getDay(next) === 6) {
        next = addDays(next, 1);
      }
      break;
    }

    case "weekly":
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const currentDay = getDay(date);
        const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b);
        const nextDay = sortedDays.find((d) => d > currentDay);
        if (nextDay !== undefined) {
          next = setDay(date, nextDay);
        } else {
          next = setDay(addWeeks(date, interval), sortedDays[0]);
        }
      } else {
        next = addWeeks(date, interval);
      }
      break;

    case "monthly":
      next = addMonths(date, interval);
      if (rule.dayOfMonth) {
        next = setDate(next, rule.dayOfMonth);
      }
      break;

    case "yearly":
      next = addYears(date, interval);
      break;

    case "custom":
      next = addDays(date, interval);
      break;

    default:
      return null;
  }

  if (rule.endDate && next > parseISO(rule.endDate)) {
    return null;
  }

  return format(next, "yyyy-MM-dd");
}

export function getRecurrenceLabel(rule: RecurrenceRule): string {
  const interval = rule.interval || 1;
  switch (rule.type) {
    case "daily":
      return interval === 1 ? "Daily" : `Every ${interval} days`;
    case "weekdays":
      return "Weekdays";
    case "weekly":
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const days = rule.daysOfWeek.map((d) => dayNames[d]).join(", ");
        return interval === 1 ? `Weekly on ${days}` : `Every ${interval} weeks on ${days}`;
      }
      return interval === 1 ? "Weekly" : `Every ${interval} weeks`;
    case "monthly":
      return interval === 1 ? "Monthly" : `Every ${interval} months`;
    case "yearly":
      return interval === 1 ? "Yearly" : `Every ${interval} years`;
    case "custom":
      return `Every ${interval} days`;
    default:
      return "Repeating";
  }
}
