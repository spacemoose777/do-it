import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocsFromServer,
  enableNetwork,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import * as idb from "@/lib/db/indexed-db";
import { peekAll, dequeue, pendingCount } from "./sync-queue";
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
      await setDoc(docRef, docData);
      break;
    }
    case "DELETE": {
      await deleteDoc(docRef);
      break;
    }
  }
}

export async function pullChanges(userId: string): Promise<void> {
  // enableNetwork() is a no-op if already connected, but if the Firestore SDK
  // has internally marked itself as offline (can happen transiently on init or
  // after a background tab resumes), this brings it back online so
  // getDocsFromServer doesn't immediately throw [code=unavailable].
  await enableNetwork(db).catch(() => {});

  const [listsSnap, tasksSnap, subtasksSnap] = await Promise.all([
    getDocsFromServer(taskListsCol(userId)),
    getDocsFromServer(tasksCol(userId)),
    getDocsFromServer(subtasksCol(userId)),
  ]);

  // Build local lookup maps so we can do conflict resolution in O(1)
  const [localTasksArr, localListsArr] = await Promise.all([
    idb.getAllTasks(userId),
    idb.getAllTaskLists(userId),
  ]);
  const localTaskMap = new Map(localTasksArr.map((t) => [t.id, t]));
  const localListMap = new Map(localListsArr.map((l) => [l.id, l]));

  // ── Task lists: server wins on tie (server is source of truth) ──────────────
  const listsToWrite: TaskList[] = [];
  listsSnap.forEach((docSnap) => {
    const server = { ...docSnap.data(), id: docSnap.id, user_id: userId } as TaskList;
    const local = localListMap.get(server.id);
    if (!local || new Date(server.updated_at) >= new Date(local.updated_at)) {
      listsToWrite.push(server);
    }
  });
  if (listsToWrite.length > 0) await idb.putManyTaskLists(listsToWrite);

  // ── Tasks: conflict resolution — keep whichever side is newer ───────────────
  // NOTE: the old code filtered by `updated_at > lastSyncDate`, which caused
  // tasks created offline and pushed late to be permanently missed by other
  // devices that had already synced past that timestamp. We now compare against
  // the local record directly instead of against a wall-clock cutoff.
  const tasksToWrite: Task[] = [];
  tasksSnap.forEach((docSnap) => {
    const server = { ...docSnap.data(), id: docSnap.id, user_id: userId } as Task;
    const local = localTaskMap.get(server.id);
    if (!local || new Date(server.updated_at) >= new Date(local.updated_at)) {
      tasksToWrite.push(server);
    }
  });
  if (tasksToWrite.length > 0) await idb.putManyTasks(tasksToWrite);

  // ── Subtasks: always accept server (subtask conflicts are rare) ──────────────
  const subtasks: Subtask[] = subtasksSnap.docs.map(
    (d) => ({ ...d.data(), id: d.id, user_id: userId } as Subtask)
  );
  if (subtasks.length > 0) await idb.putManySubtasks(subtasks);

  // ── Server-side delete detection ─────────────────────────────────────────────
  // Skip if there are pending pushes — local records may not have reached the
  // server yet and would be incorrectly deleted.
  const pending = await pendingCount();
  if (pending === 0) {
    const serverTaskIds = new Set(tasksSnap.docs.map((d) => d.id));
    for (const local of localTasksArr) {
      if (!serverTaskIds.has(local.id)) await idb.deleteTask(local.id);
    }

    const serverSubtaskIds = new Set(subtasksSnap.docs.map((d) => d.id));
    const localSubtasks = await Promise.all(
      localTasksArr.map((t) => idb.getSubtasksByTask(t.id))
    );
    for (const group of localSubtasks) {
      for (const local of group) {
        if (!serverSubtaskIds.has(local.id)) await idb.deleteSubtask(local.id);
      }
    }

    const serverListIds = new Set(listsSnap.docs.map((d) => d.id));
    for (const local of localListsArr) {
      if (!serverListIds.has(local.id)) await idb.deleteTaskList(local.id);
    }
  }

  await idb.setMeta("last_sync", new Date().toISOString());
}

export async function fullSync(userId: string): Promise<{ pushed: number; errors: number }> {
  // Pull server changes first so local IDB reflects server truth before we push.
  // This prevents stale local timestamps from winning conflict resolution.
  await pullChanges(userId);
  const result = await pushChanges(userId);
  return result;
}

export async function initialLoad(userId: string): Promise<void> {
  // Ensure the Firestore SDK is in an online state before attempting the load.
  await enableNetwork(db).catch(() => {});

  const [listsSnap, tasksSnap, subtasksSnap] = await Promise.all([
    getDocsFromServer(taskListsCol(userId)),
    getDocsFromServer(tasksCol(userId)),
    getDocsFromServer(subtasksCol(userId)),
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
    const { user_id, ...docData } = defaultList as unknown as Record<string, unknown>;
    await setDoc(doc(taskListsCol(userId), defaultList.id), docData);
  }

  await idb.setMeta("last_sync", new Date().toISOString());
}
