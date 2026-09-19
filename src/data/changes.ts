import { COLLECTIONS, type AnyRecord, type Collection, type DB } from "./types";

export interface CollectionChanges {
  upserts: AnyRecord[];
  deletes: string[];
}
export type Changes = Partial<Record<Collection, CollectionChanges>>;

function listOf(db: DB, c: Collection): AnyRecord[] {
  return db[c] as AnyRecord[];
}

/**
 * Compares two immutable states. Records whose object reference changed are treated as
 * edited and get a fresh updatedAt; records that disappeared are deletions.
 */
export function stampChanges(prev: DB, draft: DB, now: number): { next: DB; changes: Changes } {
  const next = { ...draft };
  const changes: Changes = {};

  COLLECTIONS.forEach((c) => {
    const before = listOf(prev, c);
    const after = listOf(draft, c);
    if (before === after) return;

    const beforeById = new Map(before.map((r) => [r.id, r]));
    const afterIds = new Set<string>();
    const upserts: AnyRecord[] = [];
    const stamped = after.map((r) => {
      afterIds.add(r.id);
      if (beforeById.get(r.id) === r) return r;
      const fresh = { ...r, updatedAt: now } as AnyRecord;
      upserts.push(fresh);
      return fresh;
    });
    const deletes = before.filter((r) => !afterIds.has(r.id)).map((r) => r.id);
    if (!upserts.length && !deletes.length) return;

    (next as unknown as Record<Collection, AnyRecord[]>)[c] = stamped;
    changes[c] = { upserts, deletes };
  });

  return { next, changes };
}

export function hasChanges(changes: Changes): boolean {
  return Object.keys(changes).length > 0;
}
