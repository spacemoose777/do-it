"use client";

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/AuthContext";
import { useSync } from "@/contexts/SyncContext";
import * as idb from "@/lib/db/indexed-db";
import { enqueue } from "@/lib/sync/sync-queue";
import { nowISOString, todayDateString, tomorrowDateString } from "@/lib/date-utils";
import { createNextRecurringTask, clearStaleMyDay } from "@/lib/recurrence";
import type { Task, TaskCreateInput, TaskUpdateInput } from "@/types/task";

export type SortField = "created_at" | "due_date" | "title" | "is_important" | "priority";

// Normalize a task from storage: handle missing fields from older records
function normalizeTask(task: Task): Task {
  const reminders = task.reminders ?? (task.reminder_at ? [task.reminder_at] : []);
  return {
    ...task,
    reminders,
    priority: task.priority ?? null,
    my_day_sort_order: task.my_day_sort_order ?? null,
    is_in_progress: task.is_in_progress ?? false,
  };
}

export function useTasks(filter?: {
  listId?: string;
  myDay?: boolean;
  dueTomorrow?: boolean;
  important?: boolean;
  planned?: boolean;
  includeCompleted?: boolean;
}) {
  const { user } = useAuth();
  const { lastSyncedAt } = useSync();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortField>("created_at");

  // Re-apply active filters inline so UI stays consistent without a full reload
  const applyFilter = useCallback((taskList: Task[]): Task[] => {
    let result = taskList;
    if (filter?.myDay) result = result.filter((t) => t.is_my_day);
    if (filter?.dueTomorrow) {
      const tomorrow = tomorrowDateString();
      result = result.filter((t) => t.due_date === tomorrow);
    }
    if (filter?.important) result = result.filter((t) => t.is_important);
    if (filter?.planned) result = result.filter((t) => t.due_date !== null);
    if (!filter?.includeCompleted) result = result.filter((t) => !t.is_completed);
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.myDay, filter?.dueTomorrow, filter?.important, filter?.planned, filter?.includeCompleted]);

  const loadTasks = useCallback(async () => {
    if (!user) return;

    let data: Task[];

    if (filter?.listId) {
      data = await idb.getTasksByList(filter.listId);
    } else {
      data = await idb.getAllTasks(user.uid);
    }

    // Normalize tasks (handle missing new fields)
    data = data.map(normalizeTask);

    // Clear stale My Day items
    const cleaned = clearStaleMyDay(data);
    const staleItems = data.filter((t, i) => t !== cleaned[i]);
    for (const task of staleItems) {
      const cleanedTask = cleaned.find((c) => c.id === task.id)!;
      await idb.putTask(cleanedTask);
      await enqueue("tasks", task.id, "UPDATE", cleanedTask as unknown as Record<string, unknown>);
    }
    data = cleaned;

    // Auto-add tasks due today or overdue to My Day (placed at the top)
    const today = todayDateString();
    const toAutoAdd = data.filter(
      (t) => t.due_date !== null && t.due_date <= today && !t.is_my_day && !t.is_completed
    );
    if (toAutoAdd.length > 0) {
      const myDayTasks = data.filter((t) => t.is_my_day);
      const minExistingOrder =
        myDayTasks.length === 0
          ? 0
          : Math.min(...myDayTasks.map((t) => t.my_day_sort_order ?? 0));
      // Preserve the order the user arranged in "Due Tomorrow" (my_day_sort_order),
      // falling back to sort_order for tasks that were never manually reordered.
      const sortedToAutoAdd = [...toAutoAdd].sort((a, b) => {
        if (a.my_day_sort_order !== null && b.my_day_sort_order !== null)
          return a.my_day_sort_order - b.my_day_sort_order;
        if (a.my_day_sort_order !== null) return -1;
        if (b.my_day_sort_order !== null) return 1;
        return a.sort_order - b.sort_order;
      });
      let nextOrder = minExistingOrder - sortedToAutoAdd.length;
      for (const task of sortedToAutoAdd) {
        const updatedTask: Task = {
          ...task,
          is_my_day: true,
          my_day_date: today,
          my_day_sort_order: nextOrder++,
          updated_at: nowISOString(),
        };
        data = data.map((t) => (t.id === task.id ? updatedTask : t));
        await idb.putTask(updatedTask);
        await enqueue("tasks", task.id, "UPDATE", updatedTask as unknown as Record<string, unknown>);
      }
    }

    // Apply filters
    if (filter?.myDay) data = data.filter((t) => t.is_my_day);
    if (filter?.dueTomorrow) {
      const tomorrow = tomorrowDateString();
      data = data.filter((t) => t.due_date === tomorrow);
    }
    if (filter?.important) data = data.filter((t) => t.is_important);
    if (filter?.planned) data = data.filter((t) => t.due_date !== null);
    if (!filter?.includeCompleted) data = data.filter((t) => !t.is_completed);

    setTasks(data);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter?.listId, filter?.myDay, filter?.dueTomorrow, filter?.important, filter?.planned, filter?.includeCompleted]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks, lastSyncedAt]);

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
      case "priority":
        sorted.sort((a, b) => {
          if (a.priority === null && b.priority === null) return 0;
          if (a.priority === null) return 1;
          if (b.priority === null) return -1;
          return a.priority - b.priority;
        });
        break;
      case "created_at":
      default:
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
    }
    sorted.sort((a, b) => (a.is_completed ? 1 : 0) - (b.is_completed ? 1 : 0));
    return sorted;
  }, [tasks, sortBy]);

  const createTask = useCallback(async (input: Partial<TaskCreateInput> & { title: string; list_id: string }) => {
    if (!user) return null;
    const now = nowISOString();

    // Place My Day tasks at the top of the list
    let myDaySortOrder: number | null = null;
    if (input.is_my_day) {
      const myDayTasks = tasks.filter((t) => t.is_my_day && !t.is_completed);
      const minOrder = myDayTasks.length === 0 ? 0 : Math.min(...myDayTasks.map((t) => t.my_day_sort_order ?? 0));
      myDaySortOrder = minOrder - 1;
    }

    const newTask: Task = {
      id: uuidv4(),
      user_id: user.uid,
      list_id: input.list_id,
      title: input.title,
      notes: input.notes || "",
      is_completed: false,
      completed_at: null,
      is_important: input.is_important || false,
      is_in_progress: input.is_in_progress || false,
      is_my_day: input.is_my_day || false,
      my_day_date: input.is_my_day ? todayDateString() : null,
      due_date: input.due_date || null,
      due_time: input.due_time || null,
      reminder_at: input.reminder_at || null,
      reminders: input.reminders || (input.reminder_at ? [input.reminder_at] : []),
      recurrence_rule: input.recurrence_rule || null,
      sort_order: input.sort_order || 0,
      my_day_sort_order: myDaySortOrder,
      priority: input.priority ?? null,
      created_at: now,
      updated_at: now,
    };

    await idb.putTask(newTask);
    await enqueue("tasks", newTask.id, "INSERT", newTask as unknown as Record<string, unknown>);
    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  }, [user, tasks]);

  const updateTask = useCallback(async (id: string, updates: TaskUpdateInput) => {
    const existing = await idb.getTask(id);
    if (!existing) return;

    const normalizedExisting = normalizeTask(existing);

    // Handle My Day toggle: place at top when adding
    if (updates.is_my_day !== undefined) {
      updates.my_day_date = updates.is_my_day ? todayDateString() : null;
      if (updates.is_my_day) {
        const myDayTasks = tasks.filter((t) => t.is_my_day);
        const minOrder = myDayTasks.length === 0 ? 0 : Math.min(...myDayTasks.map((t) => t.my_day_sort_order ?? 0));
        updates.my_day_sort_order = minOrder - 1;
      } else {
        updates.my_day_sort_order = null;
      }
    }

    const updated: Task = {
      ...normalizedExisting,
      ...updates,
      updated_at: nowISOString(),
    };

    await idb.putTask(updated);
    await enqueue("tasks", id, "UPDATE", updated as unknown as Record<string, unknown>);
    setTasks((prev) => applyFilter(prev.map((t) => (t.id === id ? updated : t))));
    return updated;
  }, [tasks, applyFilter]);

  const toggleComplete = useCallback(async (id: string) => {
    const existing = await idb.getTask(id);
    if (!existing) return;

    const normalizedExisting = normalizeTask(existing);
    const now = nowISOString();
    const isCompleting = !normalizedExisting.is_completed;

    const updated: Task = {
      ...normalizedExisting,
      is_completed: isCompleting,
      completed_at: isCompleting ? now : null,
      ...(isCompleting ? { is_my_day: false, my_day_date: null, my_day_sort_order: null } : {}),
      updated_at: now,
    };

    await idb.putTask(updated);
    await enqueue("tasks", id, "UPDATE", updated as unknown as Record<string, unknown>);

    // Handle recurrence
    if (isCompleting && normalizedExisting.recurrence_rule) {
      // Guard: skip if a future incomplete occurrence already exists (e.g. from another tab/device)
      const allTasks = await idb.getAllTasks(normalizedExisting.user_id);
      const ruleKey = JSON.stringify(normalizedExisting.recurrence_rule);
      const alreadyExists = allTasks.some(
        (t) =>
          !t.is_completed &&
          t.id !== id &&
          t.title === normalizedExisting.title &&
          t.list_id === normalizedExisting.list_id &&
          JSON.stringify(t.recurrence_rule) === ruleKey &&
          t.due_date !== null &&
          t.due_date > (normalizedExisting.due_date ?? "")
      );
      const nextTask = alreadyExists ? null : createNextRecurringTask(normalizedExisting);
      if (nextTask) {
        const normalizedNext = normalizeTask(nextTask as Task);
        await idb.putTask(normalizedNext);
        await enqueue("tasks", normalizedNext.id, "INSERT", normalizedNext as unknown as Record<string, unknown>);
        setTasks((prev) => applyFilter([normalizedNext, ...prev.map((t) => (t.id === id ? updated : t))]));
        return updated;
      }
    }

    setTasks((prev) => applyFilter(prev.map((t) => (t.id === id ? updated : t))));
    return updated;
  }, [applyFilter]);

  const toggleImportant = useCallback(async (id: string) => {
    const existing = await idb.getTask(id);
    if (!existing) return;

    const normalizedExisting = normalizeTask(existing);
    const updated: Task = {
      ...normalizedExisting,
      is_important: !normalizedExisting.is_important,
      updated_at: nowISOString(),
    };

    await idb.putTask(updated);
    await enqueue("tasks", id, "UPDATE", updated as unknown as Record<string, unknown>);
    setTasks((prev) => applyFilter(prev.map((t) => (t.id === id ? updated : t))));
    return updated;
  }, [applyFilter]);

  const toggleMyDay = useCallback(async (id: string) => {
    const existing = await idb.getTask(id);
    if (!existing) return;

    const normalizedExisting = normalizeTask(existing);
    const addingToMyDay = !normalizedExisting.is_my_day;

    // Place at top of My Day when adding
    let myDaySortOrder: number | null = null;
    if (addingToMyDay) {
      const myDayTasks = tasks.filter((t) => t.is_my_day);
      const minOrder = myDayTasks.length === 0 ? 0 : Math.min(...myDayTasks.map((t) => t.my_day_sort_order ?? 0));
      myDaySortOrder = minOrder - 1;
    }

    const updated: Task = {
      ...normalizedExisting,
      is_my_day: addingToMyDay,
      my_day_date: addingToMyDay ? todayDateString() : null,
      my_day_sort_order: myDaySortOrder,
      updated_at: nowISOString(),
    };

    await idb.putTask(updated);
    await enqueue("tasks", id, "UPDATE", updated as unknown as Record<string, unknown>);
    setTasks((prev) => applyFilter(prev.map((t) => (t.id === id ? updated : t))));
    return updated;
  }, [tasks, applyFilter]);

  const toggleInProgress = useCallback(async (id: string) => {
    const existing = await idb.getTask(id);
    if (!existing) return;

    const normalizedExisting = normalizeTask(existing);
    const updated: Task = {
      ...normalizedExisting,
      is_in_progress: !normalizedExisting.is_in_progress,
      updated_at: nowISOString(),
    };

    await idb.putTask(updated);
    await enqueue("tasks", id, "UPDATE", updated as unknown as Record<string, unknown>);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await idb.deleteTask(id);
    await enqueue("tasks", id, "DELETE");
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const batchReorderMyDay = useCallback(async (updates: Array<{ id: string; my_day_sort_order: number }>) => {
    const now = nowISOString();
    const updatedMap = new Map<string, Task>();
    for (const { id, my_day_sort_order } of updates) {
      const existing = await idb.getTask(id);
      if (!existing) continue;
      const updated: Task = { ...normalizeTask(existing), my_day_sort_order, updated_at: now };
      await idb.putTask(updated);
      await enqueue("tasks", id, "UPDATE", updated as unknown as Record<string, unknown>);
      updatedMap.set(id, updated);
    }
    setTasks((prev) => prev.map((t) => updatedMap.get(t.id) ?? t));
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
    toggleInProgress,
    deleteTask,
    batchReorderMyDay,
    refresh: loadTasks,
  };
}
