/* App state: an immutable DB snapshot kept in memory, saved to IndexedDB and synced to
 * the Sheet. All local edits go through commit(); rows pulled from the Sheet come in
 * through applyRemote().
 */
import { useSyncExternalStore } from "react";
import * as sync from "../sync/engine";
import type { SchemaContext } from "../sync/sheetSchema";
import { hasChanges, stampChanges, type Changes } from "./changes";
import { getLedgerIndex, itemsSummary, orderTotal } from "./ledger";
import { META_KEYS, loadAll, writeBatch, type LoadedState } from "./persistence";
import { emptyDB, seededDB } from "./seed";
import { COLLECTIONS, type AnyRecord, type Collection, type DB } from "./types";

type RecordMap<T> = Partial<Record<Collection, T[]>>;

let state: DB = emptyDB();
let ready = false;
const listeners = new Set<() => void>();
const storageErrorListeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDB(): DB {
  return state;
}

export function onStorageError(listener: () => void): () => void {
  storageErrorListeners.add(listener);
  return () => storageErrorListeners.delete(listener);
}

function reportStorageError(err: unknown): void {
  console.error("Local storage write failed", err);
  storageErrorListeners.forEach((l) => l());
}

function save(batch: Parameters<typeof writeBatch>[0]): void {
  writeBatch(batch).catch(reportStorageError);
}

/* ---------- local edits ---------- */

export function commit(recipe: (db: DB) => DB): void {
  const prev = state;
  const draft = recipe(prev);
  if (draft === prev) return;
  const now = Date.now();
  const { next, changes } = stampChanges(prev, draft, now);
  if (!hasChanges(changes)) return;

  state = next;
  notify();
  const outboxPuts = sync.queueLocal(changes, now);
  save({ puts: upsertsOf(changes), deletes: deletesOf(changes), outboxPuts });
  sync.scheduleSync();
}

function upsertsOf(changes: Changes): RecordMap<AnyRecord> {
  return Object.fromEntries(Object.entries(changes).map(([c, ch]) => [c, ch.upserts]));
}

function deletesOf(changes: Changes): RecordMap<string> {
  return Object.fromEntries(Object.entries(changes).map(([c, ch]) => [c, ch.deletes]));
}

/* ---------- rows pulled from the Sheet ---------- */

function applyRemote(merge: sync.RemoteMerge): void {
  const next = { ...state } as unknown as Record<Collection, AnyRecord[]>;
  let changed = false;

  COLLECTIONS.forEach((c) => {
    const upserts = merge.upserts[c] ?? [];
    const deletes = new Set(merge.deletes[c] ?? []);
    if (!upserts.length && !deletes.size) return;
    const incoming = new Map(upserts.map((r) => [r.id, r]));
    const list = (state[c] as AnyRecord[]).filter((r) => !deletes.has(r.id)).map((r) => incoming.get(r.id) ?? r);
    const present = new Set(list.map((r) => r.id));
    upserts.forEach((r) => { if (!present.has(r.id)) list.push(r); });
    next[c] = list;
    changed = true;
  });

  if (changed) {
    state = next as unknown as DB;
    notify();
  }
  save({ puts: merge.upserts, deletes: merge.deletes, outboxDeletes: merge.outboxDeletes, meta: { [META_KEYS.cursor]: merge.cursor } });
}

function schemaContext(): SchemaContext {
  const index = getLedgerIndex(state);
  return {
    customerName: (id) => index.customersById.get(id)?.name ?? "",
    customerPhone: (id) => index.customersById.get(id)?.phone ?? "",
    contractorName: (id) => (id && index.contractorsById.get(id)?.name) || "",
    orderTotal,
    itemsSummary,
  };
}

/* ---------- startup ---------- */

export async function initStore(): Promise<void> {
  let loaded: LoadedState;
  try {
    loaded = await loadAll();
  } catch (err) {
    reportStorageError(err);
    loaded = { db: seededDB(), outbox: [], cursor: 0, initialized: true };
  }
  if (!loaded.initialized) {
    const seed = seededDB();
    loaded.db = { ...loaded.db, items: seed.items, settings: seed.settings };
    save({ puts: { items: seed.items, settings: seed.settings }, meta: { [META_KEYS.initialized]: true } });
  }
  state = loaded.db;
  ready = true;
  notify();
  sync.initSync({ getDB, schemaContext, applyRemote }, loaded);
}

/* ---------- React bindings ---------- */

export function useDB(): DB {
  return useSyncExternalStore(subscribe, getDB);
}

export function useStoreReady(): boolean {
  return useSyncExternalStore(subscribe, () => ready);
}
