export type SyncOperation = "INSERT" | "UPDATE" | "DELETE";
export type SyncTable = "tasks" | "subtasks" | "task_lists";

export interface SyncQueueItem {
  id: string;
  table_name: SyncTable;
  record_id: string;
  operation: SyncOperation;
  data: Record<string, unknown>;
  created_at: string;
}

export interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  error: string | null;
}
