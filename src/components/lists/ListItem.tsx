"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TaskList } from "@/types/task";

interface ListItemProps {
  list: TaskList;
  isActive: boolean;
  taskCount?: number;
}

export default function ListItem({ list, isActive, taskCount }: ListItemProps) {
  return (
    <Link
      href={`/lists/${list.id}`}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
        isActive
          ? "bg-accent/10 text-accent"
          : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
      )}
    >
      <span
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: list.color }}
      />
      <span className="flex-1 truncate">{list.name}</span>
      {taskCount !== undefined && taskCount > 0 && (
        <span className="text-xs text-text-secondary/60">{taskCount}</span>
      )}
    </Link>
  );
}
