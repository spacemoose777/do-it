import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { DB_NAME, DB_VERSION } from "@/lib/constants";
import type { Task, Subtask, TaskList } from "@/types/task";
import type { SyncQueueItem } from "@/types/sync";

interface DoItDB extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: {
      "by-list": string;
      "by-user": string;
      "by-my-day": [string, number];
      "by-important": [string, number];
      "by-due-date": string;
    };
  };
  subtasks: {
    key: string;
    value: Subtask;
    indexes: {
      "by-task": string;
    };
  };
  task_lists: {
    key: string;
    value: TaskList;
    indexes: {
      "by-user": string;
    };
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      "by-created": string;
    };
  };
  meta: {
    key: string;
    value: { key: string; value: string };
  };
}

let dbPromise: Promise<IDBPDatabase<DoItDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<DoItDB>> {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is not available on the server");
  }

  if (!dbPromise) {
    dbPromise = openDB<DoItDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Tasks store
        const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
        taskStore.createIndex("by-list", "list_id");
        taskStore.createIndex("by-user", "user_id");
        taskStore.createIndex("by-due-date", "due_date");

        // Subtasks store
        const subtaskStore = db.createObjectStore("subtasks", { keyPath: "id" });
        subtaskStore.createIndex("by-task", "task_id");

        // Task lists store
        const listStore = db.createObjectStore("task_lists", { keyPath: "id" });
        listStore.createIndex("by-user", "user_id");

        // Sync queue store
        const syncStore = db.createObjectStore("sync_queue", { keyPath: "id" });
        syncStore.createIndex("by-created", "created_at");

        // Meta store (last sync time, etc.)
        db.createObjectStore("meta", { keyPath: "key" });
      },
    });
  }

  return dbPromise;
}

// =====================================================
// TASK OPERATIONS
// =====================================================

export async function getAllTasks(userId: string): Promise<Task[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("tasks", "by-user", userId);
  return all;
}

export async function getTasksByList(listId: string): Promise<Task[]> {
  const db = await getDB();
  return db.getAllFromIndex("tasks", "by-list", listId);
}

export async function getTask(id: string): Promise<Task | undefined> {
  const db = await getDB();
  return db.get("tasks", id);
}

export async function putTask(task: Task): Promise<void> {
  const db = await getDB();
  await db.put("tasks", task);
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDB();
  // Delete subtasks first
  const subtasks = await db.getAllFromIndex("subtasks", "by-task", id);
  const tx = db.transaction(["tasks", "subtasks"], "readwrite");
  for (const st of subtasks) {
    await tx.objectStore("subtasks").delete(st.id);
  }
  await tx.objectStore("tasks").delete(id);
  await tx.done;
}

export async function putManyTasks(tasks: Task[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("tasks", "readwrite");
  for (const task of tasks) {
    await tx.store.put(task);
  }
  await tx.done;
}

// =====================================================
// SUBTASK OPERATIONS
// =====================================================

export async function getSubtasksByTask(taskId: string): Promise<Subtask[]> {
  const db = await getDB();
  return db.getAllFromIndex("subtasks", "by-task", taskId);
}

export async function putSubtask(subtask: Subtask): Promise<void> {
  const db = await getDB();
  await db.put("subtasks", subtask);
}

export async function deleteSubtask(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("subtasks", id);
}

export async function putManySubtasks(subtasks: Subtask[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("subtasks", "readwrite");
  for (const st of subtasks) {
    await tx.store.put(st);
  }
  await tx.done;
}

// =====================================================
// TASK LIST OPERATIONS
// =====================================================

export async function getAllTaskLists(userId: string): Promise<TaskList[]> {
  const db = await getDB();
  return db.getAllFromIndex("task_lists", "by-user", userId);
}

export async function getTaskList(id: string): Promise<TaskList | undefined> {
  const db = await getDB();
  return db.get("task_lists", id);
}

export async function putTaskList(list: TaskList): Promise<void> {
  const db = await getDB();
  await db.put("task_lists", list);
}

export async function deleteTaskList(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("task_lists", id);
}

export async function putManyTaskLists(lists: TaskList[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("task_lists", "readwrite");
  for (const list of lists) {
    await tx.store.put(list);
  }
  await tx.done;
}

// =====================================================
// SYNC QUEUE OPERATIONS
// =====================================================

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await getDB();
  await db.put("sync_queue", item);
}

export async function getAllSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("sync_queue", "by-created");
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("sync_queue", id);
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  await db.clear("sync_queue");
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDB();
  return db.count("sync_queue");
}

// =====================================================
// META OPERATIONS
// =====================================================

export async function getMeta(key: string): Promise<string | undefined> {
  const db = await getDB();
  const result = await db.get("meta", key);
  return result?.value;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put("meta", { key, value });
}

export async function deleteMeta(key: string): Promise<void> {
  const db = await getDB();
  await db.delete("meta", key);
}

// =====================================================
// BULK OPERATIONS (for sync)
// =====================================================

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["tasks", "subtasks", "task_lists", "sync_queue", "meta"], "readwrite");
  await tx.objectStore("tasks").clear();
  await tx.objectStore("subtasks").clear();
  await tx.objectStore("task_lists").clear();
  await tx.objectStore("sync_queue").clear();
  await tx.objectStore("meta").clear();
  await tx.done;
}
