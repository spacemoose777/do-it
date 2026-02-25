"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTask } from "@/lib/db/indexed-db";
import { useTasks } from "@/hooks/useTasks";
import TaskDetail from "@/components/tasks/TaskDetail";
import type { Task } from "@/types/task";

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const { updateTask, toggleComplete, toggleImportant, toggleMyDay, toggleInProgress, deleteTask } = useTasks();

  useEffect(() => {
    async function load() {
      const t = await getTask(taskId);
      setTask(t || null);
      setLoading(false);
    }
    load();
  }, [taskId]);

  const handleUpdate = useCallback(async (id: string, updates: any) => {
    await updateTask(id, updates);
    const updated = await getTask(id);
    if (updated) setTask(updated);
  }, [updateTask]);

  const handleToggleComplete = useCallback(async (id: string) => {
    const updated = await toggleComplete(id);
    if (updated) setTask(updated);
  }, [toggleComplete]);

  const handleToggleImportant = useCallback(async (id: string) => {
    const updated = await toggleImportant(id);
    if (updated) setTask(updated);
  }, [toggleImportant]);

  const handleToggleMyDay = useCallback(async (id: string) => {
    const updated = await toggleMyDay(id);
    if (updated) setTask(updated);
  }, [toggleMyDay]);

  const handleToggleInProgress = useCallback(async (id: string) => {
    const updated = await toggleInProgress(id);
    if (updated) setTask(updated);
  }, [toggleInProgress]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-16 text-text-secondary">
        <p>Task not found</p>
      </div>
    );
  }

  return (
    <TaskDetail
      task={task}
      onUpdate={handleUpdate}
      onToggleComplete={handleToggleComplete}
      onToggleImportant={handleToggleImportant}
      onToggleMyDay={handleToggleMyDay}
      onToggleInProgress={handleToggleInProgress}
      onDelete={(id) => { deleteTask(id); router.back(); }}
      onClose={() => router.back()}
    />
  );
}
