"use client";

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/AuthContext";
import * as idb from "@/lib/db/indexed-db";
import { enqueue } from "@/lib/sync/sync-queue";
import { nowISOString } from "@/lib/date-utils";
import type { TaskList, TaskListCreateInput } from "@/types/task";

export function useTaskLists() {
  const { user } = useAuth();
  const [lists, setLists] = useState<TaskList[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLists = useCallback(async () => {
    if (!user) return;
    const data = await idb.getAllTaskLists(user.uid);
    setLists(data.sort((a, b) => a.sort_order - b.sort_order));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const createList = useCallback(async (input: Partial<TaskListCreateInput>) => {
    if (!user) return null;
    const now = nowISOString();
    const newList: TaskList = {
      id: uuidv4(),
      user_id: user.uid,
      name: input.name || "New List",
      icon: input.icon || "list",
      color: input.color || "#6366f1",
      sort_order: lists.length,
      is_default: false,
      created_at: now,
      updated_at: now,
    };

    await idb.putTaskList(newList);
    await enqueue("task_lists", newList.id, "INSERT", newList as unknown as Record<string, unknown>);
    setLists((prev) => [...prev, newList]);
    return newList;
  }, [user, lists.length]);

  const updateList = useCallback(async (id: string, updates: Partial<TaskList>) => {
    const existing = await idb.getTaskList(id);
    if (!existing) return;

    const updated = { ...existing, ...updates, updated_at: nowISOString() };
    await idb.putTaskList(updated);
    await enqueue("task_lists", id, "UPDATE", updated as unknown as Record<string, unknown>);
    setLists((prev) => prev.map((l) => (l.id === id ? updated : l)));
  }, []);

  const deleteList = useCallback(async (id: string) => {
    await idb.deleteTaskList(id);
    await enqueue("task_lists", id, "DELETE");
    setLists((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const getDefaultList = useCallback(() => {
    return lists.find((l) => l.is_default) || lists[0];
  }, [lists]);

  return {
    lists,
    loading,
    createList,
    updateList,
    deleteList,
    getDefaultList,
    refresh: loadLists,
  };
}
