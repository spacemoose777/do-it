"use client";

import { useState, type KeyboardEvent } from "react";
import { useSubtasks } from "@/hooks/useSubtasks";
import Checkbox from "@/components/ui/Checkbox";

interface SubtaskListProps {
  taskId: string;
}

export default function SubtaskList({ taskId }: SubtaskListProps) {
  const { subtasks, createSubtask, toggleSubtask, deleteSubtask, updateSubtask } = useSubtasks(taskId);
  const [newTitle, setNewTitle] = useState("");

  const handleAdd = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    createSubtask(trimmed);
    setNewTitle("");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const completed = subtasks.filter((s) => s.is_completed).length;

  return (
    <div className="space-y-2">
      {subtasks.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-text-secondary">
            Subtasks ({completed}/{subtasks.length})
          </span>
          {subtasks.length > 0 && (
            <div className="flex-1 ml-3 h-1 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${(completed / subtasks.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {subtasks.map((subtask) => (
        <div key={subtask.id} className="flex items-center gap-2 px-1 group">
          <Checkbox
            checked={subtask.is_completed}
            onChange={() => toggleSubtask(subtask.id)}
          />
          <span
            className={`flex-1 text-sm ${subtask.is_completed ? "line-through text-text-secondary" : "text-text-primary"}`}
          >
            {subtask.title}
          </span>
          <button
            onClick={() => deleteSubtask(subtask.id)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-bg-tertiary rounded transition-all"
          >
            <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 px-1">
        <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a step"
          className="flex-1 text-sm bg-transparent text-text-primary placeholder:text-text-secondary/60 focus:outline-none"
        />
      </div>
    </div>
  );
}
