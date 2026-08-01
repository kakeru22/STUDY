export type SyncMode = "offline" | "online" | "syncing" | "conflict";

export type SyncState = {
  mode: SyncMode;
  unsyncedCount: number;
  lastSyncedAt: string | null;
  isAuthorized: boolean;
  statusMessage: string;
};

