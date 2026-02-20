"use client";

import Checkbox from "@/components/ui/Checkbox";
import type { Subtask } from "@/types/task";

interface SubtaskItemProps {
  subtask: Subtask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function SubtaskItem({ subtask, onToggle, onDelete }: SubtaskItemProps) {
  return (
    <div className="flex items-center gap-2 px-1 group">
      <Checkbox
        checked={subtask.is_completed}
        onChange={() => onToggle(subtask.id)}
      />
      <span
        className={`flex-1 text-sm ${
          subtask.is_completed ? "line-through text-text-secondary" : "text-text-primary"
        }`}
      >
        {subtask.title}
      </span>
      <button
        onClick={() => onDelete(subtask.id)}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-bg-tertiary rounded transition-all"
      >
        <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
