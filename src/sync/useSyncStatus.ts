import { useSyncExternalStore } from "react";
import { formatTime } from "../lib/dates";
import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from "./engine";

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatus);
}

export function describeSyncStatus(status: SyncStatus): string {
  const waiting = status.pending ? ` · ${status.pending} waiting` : "";
  switch (status.state) {
    case "disconnected":
      return "Not connected";
    case "offline":
      return "Offline" + waiting;
    case "syncing":
      return "Syncing…";
    case "synced":
      return (status.lastSyncedAt ? `Synced ${formatTime(status.lastSyncedAt)}` : "Synced") + waiting;
    case "error":
      return "Sync failed, retrying" + waiting;
  }
}
