import { v4 as uuidv4 } from "uuid";
import { addToSyncQueue, getAllSyncQueue, removeSyncQueueItem, getSyncQueueCount } from "@/lib/db/indexed-db";
import type { SyncQueueItem, SyncOperation, SyncTable } from "@/types/sync";
import { nowISOString } from "@/lib/date-utils";

export async function enqueue(
  tableName: SyncTable,
  recordId: string,
  operation: SyncOperation,
  data: Record<string, unknown> = {}
): Promise<void> {
  // Deduplicate UPDATE entries: replace any existing pending UPDATE for the same record
  if (operation === "UPDATE") {
    const existing = await getAllSyncQueue();
    const duplicate = existing.find(
      (item) => item.table_name === tableName && item.record_id === recordId && item.operation === "UPDATE"
    );
    if (duplicate) {
      await removeSyncQueueItem(duplicate.id);
    }
  }

  const item: SyncQueueItem = {
    id: uuidv4(),
    table_name: tableName,
    record_id: recordId,
    operation,
    data,
    created_at: nowISOString(),
  };
  await addToSyncQueue(item);
}

export async function dequeue(id: string): Promise<void> {
  await removeSyncQueueItem(id);
}

export async function peekAll(): Promise<SyncQueueItem[]> {
  return getAllSyncQueue();
}

export async function pendingCount(): Promise<number> {
  return getSyncQueueCount();
}
