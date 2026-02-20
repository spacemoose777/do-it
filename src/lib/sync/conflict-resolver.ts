// Last-write-wins conflict resolution based on updated_at timestamps

interface Timestamped {
  updated_at: string;
}

export function resolveConflict<T extends Timestamped>(
  local: T,
  remote: T
): T {
  const localTime = new Date(local.updated_at).getTime();
  const remoteTime = new Date(remote.updated_at).getTime();

  // Remote wins if it's newer or equal (server is source of truth on tie)
  return remoteTime >= localTime ? remote : local;
}
