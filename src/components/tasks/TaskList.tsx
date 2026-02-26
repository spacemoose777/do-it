"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import TaskItem from "./TaskItem";
import type { Task } from "@/types/task";

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onToggleInProgress: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onDelete?: (id: string) => void;
  showListName?: (task: Task) => string | undefined;
  emptyMessage?: string;
}

export default function TaskList({
  tasks,
  onToggleComplete,
  onToggleImportant,
  onToggleInProgress,
  onTaskClick,
  onDelete,
  showListName,
  emptyMessage = "No tasks yet",
}: TaskListProps) {
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());

  const handleToggleComplete = useCallback((id: string) => {
    setFadingIds((prev) => new Set([...prev, id]));
    setTimeout(() => {
      onToggleComplete(id);
      setFadingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }, 300);
  }, [onToggleComplete]);

  const incomplete = tasks.filter((t) => !t.is_completed);
  const completed = tasks.filter((t) => t.is_completed);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
        <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {incomplete.map((task) => (
        <div
          key={task.id}
          className={cn(
            "transition-opacity duration-300",
            fadingIds.has(task.id) ? "opacity-0" : "opacity-100"
          )}
        >
          <TaskItem
            task={task}
            onToggleComplete={handleToggleComplete}
            onToggleImportant={onToggleImportant}
            onToggleInProgress={onToggleInProgress}
            onClick={onTaskClick}
            onDelete={onDelete}
            showListName={showListName?.(task)}
          />
        </div>
      ))}

      {completed.length > 0 && (
        <details className="mt-4">
          <summary className="px-4 py-2 text-sm text-text-secondary cursor-pointer hover:text-text-primary">
            Completed ({completed.length})
          </summary>
          <div className="space-y-1 mt-1">
            {completed.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onToggleImportant={onToggleImportant}
                onToggleInProgress={onToggleInProgress}
                onClick={onTaskClick}
                onDelete={onDelete}
                showListName={showListName?.(task)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
