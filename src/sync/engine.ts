/* Keeps this device in sync with the shared Google Sheet.
 *
 * Local-first: every local change lands in an outbox (persisted with the change itself),
 * so the app keeps working offline. A sync pushes the outbox to the Apps Script API, then
 * pulls every row changed since the last pull. Conflicts resolve per record: the newer
 * updatedAt wins.
 */
import { COLLECTIONS, type AnyRecord, type Collection, type DB } from "../data/types";
import type { Changes } from "../data/changes";
import { META_KEYS, writeBatch, type OutboxEntry } from "../data/persistence";
import { stableStringify } from "../lib/stableStringify";
import { fromRow, isDeletedRow, toRow, type SchemaContext, type SheetRow } from "./sheetSchema";
import { getApiUrl, isValidApiUrl, setApiUrl } from "./config";

export type SyncState = "disconnected" | "offline" | "syncing" | "synced" | "error";
export interface SyncStatus {
  state: SyncState;
  pending: number;
  lastSyncedAt: number | null;
}

export interface RemoteMerge {
  upserts: Partial<Record<Collection, AnyRecord[]>>;
  deletes: Partial<Record<Collection, string[]>>;
  outboxDeletes: string[];
  cursor: number;
}

export interface EngineHooks {
  getDB(): DB;
  schemaContext(): SchemaContext;
  applyRemote(merge: RemoteMerge): void;
}

interface PullResponse {
  cursor: number;
  data: Partial<Record<Collection, SheetRow[]>>;
}

const PUSH_DEBOUNCE_MS = 1500;
const POLL_INTERVAL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 60_000;
const PUSH_BATCH_SIZE = 200;

let hooks: EngineHooks | null = null;
const outbox = new Map<string, OutboxEntry>();
let cursor = 0;
let status: SyncStatus = { state: "disconnected", pending: 0, lastSyncedAt: null };
const listeners = new Set<() => void>();
let running = false;
let rerunRequested = false;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

export const keyOf = (collection: Collection, id: string) => `${collection}:${id}`;

/* ---------- status ---------- */

function setStatus(state: SyncState, lastSyncedAt = status.lastSyncedAt): void {
  status = { state, pending: outbox.size, lastSyncedAt };
  listeners.forEach((l) => l());
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function persist(batch: Parameters<typeof writeBatch>[0]): void {
  writeBatch(batch).catch((err) => console.error("Could not save sync state", err));
}

/* ---------- outbox ---------- */

export function queueLocal(changes: Changes, now: number): OutboxEntry[] {
  const entries: OutboxEntry[] = [];
  (Object.entries(changes) as [Collection, NonNullable<Changes[Collection]>][]).forEach(([collection, change]) => {
    change.upserts.forEach((record) => {
      entries.push({ key: keyOf(collection, record.id), collection, id: record.id, updatedAt: record.updatedAt, record });
    });
    change.deletes.forEach((id) => {
      entries.push({ key: keyOf(collection, id), collection, id, updatedAt: now, deleted: true });
    });
  });
  entries.forEach((e) => outbox.set(e.key, e));
  setStatus(status.state);
  return entries;
}

// After connecting, upload everything this device has; the Sheet keeps whichever copy is newer.
function queueAllLocal(): OutboxEntry[] {
  if (!hooks) return [];
  const db = hooks.getDB();
  const entries: OutboxEntry[] = [];
  COLLECTIONS.forEach((collection) => (db[collection] as AnyRecord[]).forEach((record) => {
    const key = keyOf(collection, record.id);
    if (outbox.has(key)) return;
    const entry: OutboxEntry = { key, collection, id: record.id, updatedAt: record.updatedAt || 0, record };
    outbox.set(key, entry);
    entries.push(entry);
  }));
  return entries;
}

/* ---------- network ---------- */

async function request<T>(method: "GET" | "POST", payload: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url = getApiUrl();
    // text/plain keeps the POST a "simple" request: Apps Script can't answer CORS preflights.
    const res = method === "GET"
      ? await fetch(`${url}?${new URLSearchParams(payload as Record<string, string>)}`, { signal: controller.signal })
      : await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { ok: boolean; error?: string } & T;
    if (!body.ok) throw new Error(body.error || "Sync failed");
    return body;
  } finally {
    clearTimeout(timer);
  }
}

async function pushOutbox(): Promise<void> {
  if (!hooks) return;
  let entries = [...outbox.values()];
  while (entries.length) {
    const batch = entries.slice(0, PUSH_BATCH_SIZE);
    const ctx = hooks.schemaContext();
    const changes = batch.map((e) => ({
      collection: e.collection,
      row: e.deleted || !e.record
        ? { id: e.id, updatedAt: e.updatedAt, deleted: true }
        : { ...toRow(e.collection, e.record, ctx), updatedAt: e.updatedAt },
    }));
    await request("POST", { action: "push", changes });
    const done = batch.filter((e) => outbox.get(e.key) === e).map((e) => e.key); // keep entries edited meanwhile
    done.forEach((key) => outbox.delete(key));
    persist({ outboxDeletes: done });
    entries = entries.slice(PUSH_BATCH_SIZE);
  }
}

function mergeRemote(data: PullResponse["data"], nextCursor: number): RemoteMerge {
  const merge: RemoteMerge = { upserts: {}, deletes: {}, outboxDeletes: [], cursor: nextCursor };
  if (!hooks) return merge;
  const db = hooks.getDB();

  COLLECTIONS.forEach((collection) => {
    const rows = data?.[collection] ?? [];
    if (!rows.length) return;
    const local = new Map((db[collection] as AnyRecord[]).map((r) => [r.id, r]));
    const upserts: AnyRecord[] = [];
    const deletes: string[] = [];

    rows.forEach((row) => {
      const id = String(row.id);
      const key = keyOf(collection, id);
      const pending = outbox.get(key);
      if (pending && pending.updatedAt > (Number(row.updatedAt) || 0)) return; // our newer edit is still to be pushed
      if (pending) {
        outbox.delete(key);
        merge.outboxDeletes.push(key);
      }
      if (isDeletedRow(row)) {
        if (local.has(id)) deletes.push(id);
        return;
      }
      const incoming = fromRow(collection, row);
      const current = local.get(id);
      if (current && stableStringify(current) === stableStringify(incoming)) return;
      upserts.push(incoming);
    });

    if (upserts.length) merge.upserts[collection] = upserts;
    if (deletes.length) merge.deletes[collection] = deletes;
  });
  return merge;
}

async function pull(): Promise<void> {
  if (!hooks) return;
  const res = await request<PullResponse>("GET", { action: "pull", since: String(cursor) });
  const merge = mergeRemote(res.data, Number(res.cursor) || cursor);
  cursor = merge.cursor;
  hooks.applyRemote(merge);
}

/* ---------- sync loop ---------- */

export async function syncNow(): Promise<void> {
  if (!getApiUrl()) return setStatus("disconnected");
  if (!navigator.onLine) return setStatus("offline");
  if (running) {
    rerunRequested = true;
    return;
  }
  running = true;
  setStatus("syncing");
  try {
    await pushOutbox();
    await pull();
    setStatus("synced", Date.now());
  } catch (err) {
    console.warn("Sheet sync failed", err);
    setStatus(navigator.onLine ? "error" : "offline");
  } finally {
    running = false;
    if (rerunRequested) {
      rerunRequested = false;
      void syncNow();
    }
  }
}

export function scheduleSync(): void {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void syncNow(), PUSH_DEBOUNCE_MS);
}

/* ---------- connection ---------- */

export function connect(url: string): boolean {
  if (!isValidApiUrl(url)) return false;
  setApiUrl(url);
  cursor = 0;
  persist({ outboxPuts: queueAllLocal(), meta: { [META_KEYS.cursor]: 0 } });
  void syncNow();
  return true;
}

export function disconnect(): void {
  setApiUrl(null);
  cursor = 0;
  persist({ meta: { [META_KEYS.cursor]: 0 } });
  setStatus("disconnected");
}

export function initSync(engineHooks: EngineHooks, loaded: { outbox: OutboxEntry[]; cursor: number }): void {
  if (hooks) return;
  hooks = engineHooks;
  loaded.outbox.forEach((e) => outbox.set(e.key, e));
  cursor = loaded.cursor;
  window.addEventListener("online", () => void syncNow());
  window.addEventListener("offline", () => setStatus("offline"));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncNow();
  });
  setInterval(() => {
    if (document.visibilityState === "visible") void syncNow();
  }, POLL_INTERVAL_MS);
  void syncNow();
}
