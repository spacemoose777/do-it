"use client";

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/AuthContext";
import * as idb from "@/lib/db/indexed-db";
import { enqueue } from "@/lib/sync/sync-queue";
import { nowISOString } from "@/lib/date-utils";
import type { Subtask } from "@/types/task";

export function useSubtasks(taskId: string) {
  const { user } = useAuth();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubtasks = useCallback(async () => {
    const data = await idb.getSubtasksByTask(taskId);
    setSubtasks(data.sort((a, b) => a.sort_order - b.sort_order));
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    loadSubtasks();
  }, [loadSubtasks]);

  const createSubtask = useCallback(async (title: string) => {
    if (!user) return null;
    const now = nowISOString();
    const newSubtask: Subtask = {
      id: uuidv4(),
      task_id: taskId,
      user_id: user.uid,
      title,
      is_completed: false,
      sort_order: subtasks.length,
      created_at: now,
      updated_at: now,
    };

    await idb.putSubtask(newSubtask);
    await enqueue("subtasks", newSubtask.id, "INSERT", newSubtask as unknown as Record<string, unknown>);
    setSubtasks((prev) => [...prev, newSubtask]);
    return newSubtask;
  }, [user, taskId, subtasks.length]);

  const toggleSubtask = useCallback(async (id: string) => {
    const existing = subtasks.find((s) => s.id === id);
    if (!existing) return;

    const updated: Subtask = {
      ...existing,
      is_completed: !existing.is_completed,
      updated_at: nowISOString(),
    };

    await idb.putSubtask(updated);
    await enqueue("subtasks", id, "UPDATE", updated as unknown as Record<string, unknown>);
    setSubtasks((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }, [subtasks]);

  const deleteSubtask = useCallback(async (id: string) => {
    await idb.deleteSubtask(id);
    await enqueue("subtasks", id, "DELETE");
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateSubtask = useCallback(async (id: string, title: string) => {
    const existing = subtasks.find((s) => s.id === id);
    if (!existing) return;

    const updated: Subtask = {
      ...existing,
      title,
      updated_at: nowISOString(),
    };

    await idb.putSubtask(updated);
    await enqueue("subtasks", id, "UPDATE", updated as unknown as Record<string, unknown>);
    setSubtasks((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }, [subtasks]);

  return {
    subtasks,
    loading,
    createSubtask,
    toggleSubtask,
    deleteSubtask,
    updateSubtask,
    refresh: loadSubtasks,
  };
}
