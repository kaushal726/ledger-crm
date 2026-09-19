/* IndexedDB storage: one object store per collection, plus the sync outbox and a small
 * meta store. A local change and its outbox entry are written in one transaction, so a
 * change is never saved without also being queued for the Sheet (or the other way round).
 */
import { COLLECTIONS, type AnyRecord, type Collection, type DB } from "./types";
import { emptyDB } from "./seed";

const DB_NAME = "ledger-crm";
const DB_VERSION = 1;
const OUTBOX_STORE = "outbox";
const META_STORE = "meta";
const ALL_STORES = [...COLLECTIONS, OUTBOX_STORE, META_STORE];

export const META_KEYS = { cursor: "syncCursor" } as const;

export interface OutboxEntry {
  key: string;
  collection: Collection;
  id: string;
  updatedAt: number;
  record?: AnyRecord;
  deleted?: true;
}

export interface LoadedState {
  db: DB;
  outbox: OutboxEntry[];
  cursor: number;
}

export interface WriteBatch {
  clearRecords?: boolean;
  puts?: Partial<Record<Collection, AnyRecord[]>>;
  deletes?: Partial<Record<Collection, string[]>>;
  outboxPuts?: OutboxEntry[];
  outboxDeletes?: string[];
  meta?: Partial<Record<(typeof META_KEYS)[keyof typeof META_KEYS], unknown>>;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const idb = req.result;
      COLLECTIONS.forEach((c) => { if (!idb.objectStoreNames.contains(c)) idb.createObjectStore(c, { keyPath: "id" }); });
      if (!idb.objectStoreNames.contains(OUTBOX_STORE)) idb.createObjectStore(OUTBOX_STORE, { keyPath: "key" });
      if (!idb.objectStoreNames.contains(META_STORE)) idb.createObjectStore(META_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function requestResult<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function loadAll(): Promise<LoadedState> {
  const idb = await openDatabase();
  const tx = idb.transaction(ALL_STORES, "readonly");
  const db = emptyDB();
  await Promise.all(COLLECTIONS.map(async (c) => {
    (db as unknown as Record<Collection, AnyRecord[]>)[c] = await requestResult(tx.objectStore(c).getAll());
  }));
  const outbox = await requestResult(tx.objectStore(OUTBOX_STORE).getAll() as IDBRequest<OutboxEntry[]>);
  const meta = tx.objectStore(META_STORE);
  const cursor = Number(await requestResult(meta.get(META_KEYS.cursor))) || 0;
  return { db, outbox, cursor };
}

export async function writeBatch(batch: WriteBatch): Promise<void> {
  const idb = await openDatabase();
  const tx = idb.transaction(ALL_STORES, "readwrite");
  if (batch.clearRecords) COLLECTIONS.forEach((c) => tx.objectStore(c).clear());
  Object.entries(batch.deletes ?? {}).forEach(([c, ids]) => ids.forEach((id) => tx.objectStore(c).delete(id)));
  Object.entries(batch.puts ?? {}).forEach(([c, records]) => records.forEach((r) => tx.objectStore(c).put(r)));
  batch.outboxDeletes?.forEach((key) => tx.objectStore(OUTBOX_STORE).delete(key));
  batch.outboxPuts?.forEach((entry) => tx.objectStore(OUTBOX_STORE).put(entry));
  Object.entries(batch.meta ?? {}).forEach(([key, value]) => tx.objectStore(META_STORE).put(value, key));
  await transactionDone(tx);
}
