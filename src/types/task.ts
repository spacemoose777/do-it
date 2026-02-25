export interface TaskList {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  list_id: string;
  title: string;
  notes: string;
  is_completed: boolean;
  completed_at: string | null;
  is_important: boolean;
  is_in_progress: boolean;
  is_my_day: boolean;
  my_day_date: string | null;
  due_date: string | null;
  due_time: string | null;
  reminder_at: string | null;
  reminders: string[];
  recurrence_rule: RecurrenceRule | null;
  sort_order: number;
  my_day_sort_order: number | null;
  priority: number | null;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RecurrenceRule {
  type: "daily" | "weekdays" | "weekly" | "monthly" | "yearly" | "custom";
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  monthOfYear?: number;
  endDate?: string;
}

export type TaskCreateInput = Omit<Task, "id" | "user_id" | "created_at" | "updated_at">;
export type TaskUpdateInput = Partial<Omit<Task, "id" | "user_id" | "created_at">>;
export type SubtaskCreateInput = Omit<Subtask, "id" | "user_id" | "created_at" | "updated_at">;
export type TaskListCreateInput = Omit<TaskList, "id" | "user_id" | "created_at" | "updated_at">;
