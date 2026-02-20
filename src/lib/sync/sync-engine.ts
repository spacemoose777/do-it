import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import * as idb from "@/lib/db/indexed-db";
import { peekAll, dequeue } from "./sync-queue";
import type { SyncQueueItem } from "@/types/sync";
import type { Task, Subtask, TaskList } from "@/types/task";

// Firestore collection references
function tasksCol(userId: string) {
  return collection(db, "users", userId, "tasks");
}
function subtasksCol(userId: string) {
  return collection(db, "users", userId, "subtasks");
}
function taskListsCol(userId: string) {
  return collection(db, "users", userId, "task_lists");
}

export async function pushChanges(userId: string): Promise<{ pushed: number; errors: number }> {
  const queue = await peekAll();
  let pushed = 0;
  let errors = 0;

  for (const item of queue) {
    try {
      await pushSingleItem(userId, item);
      await dequeue(item.id);
      pushed++;
    } catch (err) {
      console.error(`Sync push failed for ${item.table_name}/${item.record_id}:`, err);
      errors++;
    }
  }

  return { pushed, errors };
}

async function pushSingleItem(userId: string, item: SyncQueueItem): Promise<void> {
  const { table_name, record_id, operation, data } = item;

  // Get the correct collection reference
  const colRef = table_name === "tasks"
    ? tasksCol(userId)
    : table_name === "subtasks"
      ? subtasksCol(userId)
      : taskListsCol(userId);

  const docRef = doc(colRef, record_id);

  switch (operation) {
    case "INSERT":
    case "UPDATE": {
      // Firestore uses setDoc with merge for both insert and update
      // Remove the user_id field since it's encoded in the path
      const { user_id, ...docData } = data as Record<string, unknown>;
      await setDoc(docRef, docData, { merge: true });
      break;
    }
    case "DELETE": {
      await deleteDoc(docRef);
      break;
    }
  }
}

export async function pullChanges(userId: string): Promise<void> {
  const lastSync = await idb.getMeta("last_sync");
  const lastSyncDate = lastSync ? new Date(lastSync) : null;

  // Pull task lists
  const listsSnap = await getDocs(taskListsCol(userId));
  const lists: TaskList[] = [];
  listsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const list = { ...data, id: docSnap.id, user_id: userId } as TaskList;
    if (!lastSyncDate || new Date(list.updated_at) > lastSyncDate) {
      lists.push(list);
    }
  });
  if (lists.length > 0) {
    await idb.putManyTaskLists(lists);
  }

  // Pull tasks
  const tasksSnap = await getDocs(tasksCol(userId));
  const tasks: Task[] = [];
  tasksSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const task = { ...data, id: docSnap.id, user_id: userId } as Task;
    if (!lastSyncDate || new Date(task.updated_at) > lastSyncDate) {
      tasks.push(task);
    }
  });
  if (tasks.length > 0) {
    await idb.putManyTasks(tasks);
  }

  // Pull subtasks
  const subtasksSnap = await getDocs(subtasksCol(userId));
  const subtasks: Subtask[] = [];
  subtasksSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const subtask = { ...data, id: docSnap.id, user_id: userId } as Subtask;
    if (!lastSyncDate || new Date(subtask.updated_at) > lastSyncDate) {
      subtasks.push(subtask);
    }
  });
  if (subtasks.length > 0) {
    await idb.putManySubtasks(subtasks);
  }

  // Detect server-side deletes:
  // Compare local IDB records against server - if a record exists locally but not on server, delete it
  if (lastSyncDate) {
    const serverTaskIds = new Set(tasksSnap.docs.map((d) => d.id));
    const localTasks = await idb.getAllTasks(userId);
    for (const local of localTasks) {
      if (!serverTaskIds.has(local.id)) {
        await idb.deleteTask(local.id);
      }
    }

    const serverSubtaskIds = new Set(subtasksSnap.docs.map((d) => d.id));
    const localSubtasks = await Promise.all(
      localTasks.map((t) => idb.getSubtasksByTask(t.id))
    );
    for (const group of localSubtasks) {
      for (const local of group) {
        if (!serverSubtaskIds.has(local.id)) {
          await idb.deleteSubtask(local.id);
        }
      }
    }

    const serverListIds = new Set(listsSnap.docs.map((d) => d.id));
    const localLists = await idb.getAllTaskLists(userId);
    for (const local of localLists) {
      if (!serverListIds.has(local.id)) {
        await idb.deleteTaskList(local.id);
      }
    }
  }

  await idb.setMeta("last_sync", new Date().toISOString());
}

export async function fullSync(userId: string): Promise<{ pushed: number; errors: number }> {
  // Push local changes first, then pull server changes
  const result = await pushChanges(userId);
  await pullChanges(userId);
  return result;
}

export async function initialLoad(userId: string): Promise<void> {
  // Full load from server on first login / empty local DB
  const [listsSnap, tasksSnap, subtasksSnap] = await Promise.all([
    getDocs(taskListsCol(userId)),
    getDocs(tasksCol(userId)),
    getDocs(subtasksCol(userId)),
  ]);

  const lists = listsSnap.docs.map((d) => ({ ...d.data(), id: d.id, user_id: userId } as TaskList));
  const tasks = tasksSnap.docs.map((d) => ({ ...d.data(), id: d.id, user_id: userId } as Task));
  const subtasks = subtasksSnap.docs.map((d) => ({ ...d.data(), id: d.id, user_id: userId } as Subtask));

  if (lists.length > 0) await idb.putManyTaskLists(lists);
  if (tasks.length > 0) await idb.putManyTasks(tasks);
  if (subtasks.length > 0) await idb.putManySubtasks(subtasks);

  // If no default list exists on server, create one
  if (lists.length === 0) {
    const { v4: uuidv4 } = await import("uuid");
    const now = new Date().toISOString();
    const defaultList: TaskList = {
      id: uuidv4(),
      user_id: userId,
      name: "Tasks",
      icon: "list",
      color: "#6366f1",
      sort_order: 0,
      is_default: true,
      created_at: now,
      updated_at: now,
    };
    await idb.putTaskList(defaultList);
    // Push to Firestore
    const { user_id, ...docData } = defaultList as Record<string, unknown>;
    await setDoc(doc(taskListsCol(userId), defaultList.id), docData);
  }

  await idb.setMeta("last_sync", new Date().toISOString());
}
