"use client";

import { cn } from "@/lib/utils";
import { formatDueDate, isDueDateOverdue } from "@/lib/date-utils";
import Checkbox from "@/components/ui/Checkbox";
import SwipeAction from "@/components/ui/SwipeAction";
import type { Task } from "@/types/task";

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onClick: (task: Task) => void;
  onDelete?: (id: string) => void;
  showListName?: string;
}

function priorityBadgeClass(p: number): string {
  if (p === 1) return "bg-danger text-white";
  if (p === 2) return "bg-warning text-white";
  if (p === 3) return "bg-accent text-white";
  return "bg-bg-tertiary text-text-secondary";
}

export default function TaskItem({
  task,
  onToggleComplete,
  onToggleImportant,
  onClick,
  onDelete,
  showListName,
}: TaskItemProps) {
  const reminders = task.reminders ?? (task.reminder_at ? [task.reminder_at] : []);

  const content = (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-tertiary/50 transition-colors",
        task.is_completed && "opacity-50"
      )}
      onClick={() => onClick(task)}
    >
      <Checkbox
        checked={task.is_completed}
        onChange={() => onToggleComplete(task.id)}
      />

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm text-text-primary truncate",
            task.is_completed && "line-through text-text-secondary"
          )}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {task.priority !== null && task.priority !== undefined && (
            <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded leading-none", priorityBadgeClass(task.priority))}>
              P{task.priority}
            </span>
          )}
          {showListName && (
            <span className="text-xs text-text-secondary">{showListName}</span>
          )}
          {task.due_date && (
            <span
              className={cn(
                "text-xs",
                isDueDateOverdue(task.due_date) && !task.is_completed
                  ? "text-danger"
                  : "text-text-secondary"
              )}
            >
              {formatDueDate(task.due_date)}
            </span>
          )}
          {task.recurrence_rule && (
            <svg className="w-3 h-3 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183" />
            </svg>
          )}
          {reminders.length > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-text-secondary">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {reminders.length > 1 && <span>{reminders.length}</span>}
            </span>
          )}
          {task.is_my_day && (
            <svg className="w-3 h-3 text-warning" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          )}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleImportant(task.id);
        }}
        className="flex-shrink-0 p-1"
      >
        <svg
          className={cn(
            "w-5 h-5 transition-colors",
            task.is_important ? "text-warning fill-warning" : "text-text-secondary/30 hover:text-text-secondary"
          )}
          fill={task.is_important ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      </button>
    </div>
  );

  // Only use swipe on mobile (touch devices)
  if (onDelete) {
    return (
      <SwipeAction
        onSwipeRight={() => onToggleComplete(task.id)}
        onSwipeLeft={() => onDelete(task.id)}
      >
        {content}
      </SwipeAction>
    );
  }

  return content;
}
