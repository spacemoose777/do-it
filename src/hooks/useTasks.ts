"use client";

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/AuthContext";
import * as idb from "@/lib/db/indexed-db";
import { enqueue } from "@/lib/sync/sync-queue";
import { nowISOString, todayDateString } from "@/lib/date-utils";
import { createNextRecurringTask, clearStaleMyDay } from "@/lib/recurrence";
import type { Task, TaskCreateInput, TaskUpdateInput } from "@/types/task";

export type SortField = "created_at" | "due_date" | "title" | "is_important";

export function useTasks(filter?: {
  listId?: string;
  myDay?: boolean;
  important?: boolean;
  planned?: boolean;
  includeCompleted?: boolean;
}) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortField>("created_at");

  const loadTasks = useCallback(async () => {
    if (!user) return;

    let data: Task[];

    if (filter?.listId) {
      data = await idb.getTasksByList(filter.listId);
    } else {
      data = await idb.getAllTasks(user.uid);
    }

    // Clear stale My Day items
    const cleaned = clearStaleMyDay(data);
    const staleItems = data.filter((t, i) => t !== cleaned[i]);
    for (const task of staleItems) {
      const cleanedTask = cleaned.find((c) => c.id === task.id)!;
      await idb.putTask(cleanedTask);
      await enqueue("tasks", task.id, "UPDATE", cleanedTask as unknown as Record<string, unknown>);
    }
    data = cleaned;

    // Apply filters
    if (filter?.myDay) {
      data = data.filter((t) => t.is_my_day);
    }
    if (filter?.important) {
      data = data.filter((t) => t.is_important);
    }
    if (filter?.planned) {
      data = data.filter((t) => t.due_date !== null);
    }
    if (!filter?.includeCompleted) {
      data = data.filter((t) => !t.is_completed);
    }

    setTasks(data);
    setLoading(false);
  }, [user, filter?.listId, filter?.myDay, filter?.important, filter?.planned, filter?.includeCompleted]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const sortedTasks = useCallback(() => {
    const sorted = [...tasks];
    switch (sortBy) {
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "due_date":
        sorted.sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date);
        });
        break;
      case "is_important":
        sorted.sort((a, b) => (b.is_important ? 1 : 0) - (a.is_important ? 1 : 0));
        break;
      case "created_at":
      default:
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
    }
    // Always show completed at the bottom
    sorted.sort((a, b) => (a.is_completed ? 1 : 0) - (b.is_completed ? 1 : 0));
    return sorted;
  }, [tasks, sortBy]);

  const createTask = useCallback(async (input: Partial<TaskCreateInput> & { title: string; list_id: string }) => {
    if (!user) return null;
    const now = nowISOString();
    const newTask: Task = {
      id: uuidv4(),
      user_id: user.uid,
      list_id: input.list_id,
      title: input.title,
      notes: input.notes || "",
      is_completed: false,
      completed_at: null,
      is_important: input.is_important || false,
      is_my_day: input.is_my_day || false,
      my_day_date: input.is_my_day ? todayDateString() : null,
      due_date: input.due_date || null,
      due_time: input.due_time || null,
      reminder_at: input.reminder_at || null,
      recurrence_rule: input.recurrence_rule || null,
      sort_order: input.sort_order || 0,
      created_at: now,
      updated_at: now,
    };

    await idb.putTask(newTask);
    await enqueue("tasks", newTask.id, "INSERT", newTask as unknown as Record<string, unknown>);
    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  }, [user]);

  const updateTask = useCallback(async (id: string, updates: TaskUpdateInput) => {
    const existing = await idb.getTask(id);
    if (!existing) return;

    // Handle My Day toggle
    if (updates.is_my_day !== undefined) {
      updates.my_day_date = updates.is_my_day ? todayDateString() : null;
    }

    const updated: Task = {
      ...existing,
      ...updates,
      updated_at: nowISOString(),
    };

    await idb.putTask(updated);
    await enqueue("tasks", id, "UPDATE", updated as unknown as Record<string, unknown>);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  const toggleComplete = useCallback(async (id: string) => {
    const existing = await idb.getTask(id);
    if (!existing) return;

    const now = nowISOString();
    const isCompleting = !existing.is_completed;

    const updated: Task = {
      ...existing,
      is_completed: isCompleting,
      completed_at: isCompleting ? now : null,
      updated_at: now,
    };

    await idb.putTask(updated);
    await enqueue("tasks", id, "UPDATE", updated as unknown as Record<string, unknown>);

    // Handle recurrence
    if (isCompleting && existing.recurrence_rule) {
      const nextTask = createNextRecurringTask(existing);
      if (nextTask) {
        await idb.putTask(nextTask);
        await enqueue("tasks", nextTask.id, "INSERT", nextTask as unknown as Record<string, unknown>);
        setTasks((prev) => [nextTask, ...prev.map((t) => (t.id === id ? updated : t))]);
        return;
      }
    }

    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }, []);

  const toggleImportant = useCallback(async (id: string) => {
    const existing = await idb.getTask(id);
    if (!existing) return;

    const updated: Task = {
      ...existing,
      is_important: !existing.is_important,
      updated_at: nowISOString(),
    };

    await idb.putTask(updated);
    await enqueue("tasks", id, "UPDATE", updated as unknown as Record<string, unknown>);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }, []);

  const toggleMyDay = useCallback(async (id: string) => {
    const existing = await idb.getTask(id);
    if (!existing) return;

    const addingToMyDay = !existing.is_my_day;
    const updated: Task = {
      ...existing,
      is_my_day: addingToMyDay,
      my_day_date: addingToMyDay ? todayDateString() : null,
      updated_at: nowISOString(),
    };

    await idb.putTask(updated);
    await enqueue("tasks", id, "UPDATE", updated as unknown as Record<string, unknown>);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await idb.deleteTask(id);
    await enqueue("tasks", id, "DELETE");
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    tasks: sortedTasks(),
    loading,
    sortBy,
    setSortBy,
    createTask,
    updateTask,
    toggleComplete,
    toggleImportant,
    toggleMyDay,
    deleteTask,
    refresh: loadTasks,
  };
}
