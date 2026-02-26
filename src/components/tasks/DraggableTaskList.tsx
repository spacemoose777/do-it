"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import TaskItem from "./TaskItem";
import type { Task, TaskUpdateInput } from "@/types/task";

interface DraggableTaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onToggleInProgress: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, updates: TaskUpdateInput) => void;
  emptyMessage?: string;
}

export default function DraggableTaskList({
  tasks,
  onToggleComplete,
  onToggleImportant,
  onToggleInProgress,
  onTaskClick,
  onDelete,
  onReorder,
  emptyMessage = "No tasks yet",
}: DraggableTaskListProps) {
  const incomplete = tasks.filter((t) => !t.is_completed);
  const completed = tasks.filter((t) => t.is_completed);

  const sortByMyDayOrder = (list: Task[]) =>
    [...list].sort((a, b) => {
      const aO = a.my_day_sort_order ?? 999999;
      const bO = b.my_day_sort_order ?? 999999;
      return aO - bO;
    });

  const [localOrder, setLocalOrder] = useState<Task[]>(() => sortByMyDayOrder(incomplete));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());
  const [ghostY, setGhostY] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemEls = useRef<Map<string, HTMLElement>>(new Map());
  const isDragging = useRef(false);
  const draggingIdRef = useRef<string | null>(null);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  // Sync local order when the incoming tasks list changes (not during a drag)
  useEffect(() => {
    if (!isDragging.current) {
      setLocalOrder(sortByMyDayOrder(incomplete));
    }
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const getDropIndexAtY = useCallback(
    (clientY: number): number => {
      let best = localOrder.length - 1;
      for (let i = 0; i < localOrder.length; i++) {
        const el = itemEls.current.get(localOrder[i].id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
          best = i;
          break;
        }
      }
      return best;
    },
    [localOrder]
  );

  // Non-passive touchmove to prevent page scroll during drag
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const y = e.touches[0].clientY;
      setDropIndex(getDropIndexAtY(y));
      setGhostY(y);
    };
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, [getDropIndexAtY]);

  const handleToggleComplete = useCallback((id: string) => {
    setFadingIds((prev) => new Set([...prev, id]));
    setTimeout(() => {
      onToggleComplete(id);
      setFadingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }, 300);
  }, [onToggleComplete]);

  const commitDrop = useCallback(
    (finalDropIndex: number | null) => {
      const id = draggingIdRef.current;
      if (id === null) return;

      if (finalDropIndex !== null) {
        const fromIndex = localOrder.findIndex((t) => t.id === id);
        if (fromIndex !== -1 && fromIndex !== finalDropIndex) {
          const newOrder = [...localOrder];
          const [moved] = newOrder.splice(fromIndex, 1);
          newOrder.splice(finalDropIndex, 0, moved);
          setLocalOrder(newOrder);
          newOrder.forEach((task, idx) => {
            onReorder(task.id, { my_day_sort_order: idx });
          });
        }
      }

      isDragging.current = false;
      draggingIdRef.current = null;
      setDraggingId(null);
      setDropIndex(null);
      setGhostY(null);
    },
    [localOrder, onReorder]
  );

  // Long-press anywhere on the task row starts the drag (400 ms)
  const handleRowTouchStart = useCallback((taskId: string, e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;

    dragTimerRef.current = setTimeout(() => {
      isDragging.current = true;
      draggingIdRef.current = taskId;
      setDraggingId(taskId);
      setGhostY(touchStartY.current);
    }, 400);
  }, []);

  const handleRowTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current && dragTimerRef.current) {
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
      // Cancel long-press if finger moves more than 8 px
      if (dy > 8 || dx > 8) {
        clearTimeout(dragTimerRef.current);
        dragTimerRef.current = null;
      }
    }
  }, []);

  const handleRowTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
        dragTimerRef.current = null;
      }
      if (isDragging.current) {
        e.preventDefault();
        commitDrop(dropIndex);
      }
    },
    [commitDrop, dropIndex]
  );

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

  const ghostTask = draggingId ? localOrder.find((t) => t.id === draggingId) : null;

  return (
    <div ref={containerRef} className="space-y-1 select-none">
      {localOrder.map((task, index) => {
        const isDraggingThis = draggingId === task.id;
        const isDropTarget = dropIndex === index && draggingId !== null && !isDraggingThis;

        return (
          <div key={task.id}>
            {isDropTarget && (
              <div className="mx-4 my-1 h-1 rounded-full bg-accent opacity-80" />
            )}
            <div
              ref={(el) => {
                if (el) itemEls.current.set(task.id, el);
                else itemEls.current.delete(task.id);
              }}
              className={cn(
                "relative transition-opacity duration-100",
                isDraggingThis && "opacity-40",
                fadingIds.has(task.id) ? "opacity-0 duration-300" : ""
              )}
              onTouchStart={(e) => handleRowTouchStart(task.id, e)}
              onTouchMove={handleRowTouchMove}
              onTouchEnd={handleRowTouchEnd}
            >
              <TaskItem
                task={task}
                onToggleComplete={handleToggleComplete}
                onToggleImportant={onToggleImportant}
                onToggleInProgress={onToggleInProgress}
                onClick={onTaskClick}
                onDelete={onDelete}
              />
            </div>
          </div>
        );
      })}

      {ghostTask && ghostY !== null && (
        <div
          className="fixed left-4 right-4 z-50 pointer-events-none rounded-xl bg-bg-secondary shadow-2xl px-4 py-3 opacity-90"
          style={{ top: ghostY - 28 }}
        >
          <p className="text-sm text-text-primary truncate">{ghostTask.title}</p>
        </div>
      )}

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
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
