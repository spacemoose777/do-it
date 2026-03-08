export const APP_NAME = "Do It";
export const DEFAULT_LIST_NAME = "Tasks";
export const DB_NAME = "do-it-db";
export const DB_VERSION = 2;

export const SORT_OPTIONS = [
  { value: "created_at", label: "Date created" },
  { value: "due_date", label: "Due date" },
  { value: "title", label: "Alphabetical" },
  { value: "is_important", label: "Importance" },
  { value: "priority", label: "Priority" },
] as const;

export const RECURRENCE_PRESETS = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom..." },
] as const;

export const LIST_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
] as const;

export const NAV_ITEMS = [
  { href: "/my-day", label: "My Day", icon: "sun" },
  { href: "/important", label: "Important", icon: "star" },
  { href: "/planned", label: "Planned", icon: "calendar" },
  { href: "/due-tomorrow", label: "Tomorrow", icon: "clock" },
  { href: "/all", label: "All Tasks", icon: "inbox" },
] as const;
