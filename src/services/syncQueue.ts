// Persistent offline write queue + cloud merge helpers.
// Every save/delete goes through here: it is stored on the device first, then pushed to Firebase
// whenever the connection is up. Duplicate keys are claimed atomically at push time.
import { useSyncExternalStore } from 'react';
import { ref, set, remove, runTransaction } from 'firebase/database';
import { auth, db, cloudWatchConnection } from '../firebase';
import type { PropertyRecord } from '../utils/gisUtils';
import { hnoDupKey, upnDupKey } from './ids';

export interface QueuedPhoto { id: string; data: string }

type Op =
  | { k: 'save'; town: string; rec: PropertyRecord; photos: QueuedPhoto[]; releaseKeys: string[]; q: number }
  | { k: 'delete'; town: string; id: string; keys: string[]; photoIds: string[]; q: number };

export interface Conflict { id: string; town: string; reason: string; rec: PropertyRecord; at: number }

const QUEUE_KEY = 'ptax_queue_v1';
const CONFLICT_KEY = 'ptax_conflicts_v1';
const seenKey = (town: string) => `ptax_seen_${town}`;
const TXN_TIMEOUT_MS = 10000;

let queue: Op[] = load<Op[]>(QUEUE_KEY, []);
let conflictList: Conflict[] = load<Conflict[]>(CONFLICT_KEY, []);
let connected = false;
let flushing = false;
let storageFull = false;
let version = 0;
const listeners = new Set<() => void>();

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
function persist() {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    localStorage.setItem(CONFLICT_KEY, JSON.stringify(conflictList));
    storageFull = false;
  } catch { storageFull = true; }
}
function changed() { version++; persist(); listeners.forEach((l) => l()); }

/** Duplicate-guard keys for a record: house no. within ward, plus UPN when present. */
export function dupKeysFor(rec: Pick<PropertyRecord, 'ward' | 'hno' | 'upn'>): string[] {
  const keys = [hnoDupKey(rec.ward, rec.hno)];
  if (rec.upn && rec.upn.trim()) keys.push(upnDupKey(rec.upn));
  return keys;
}

// ---------------- queueing ----------------
export function queueSave(town: string, rec: PropertyRecord, photos: QueuedPhoto[], previous?: PropertyRecord) {
  const uid = auth.currentUser?.uid || '';
  const now = Date.now();
  const full: PropertyRecord = JSON.parse(JSON.stringify({
    ...rec,
    createdBy: rec.createdBy || uid,
    createdAt: rec.createdAt || now,
    updatedBy: uid,
    updatedAt: now,
  }));
  const prevKeys = previous ? dupKeysFor(previous) : [];
  const newKeys = dupKeysFor(full);
  const releaseKeys = prevKeys.filter((k) => !newKeys.includes(k));

  // merge into an existing pending save for the same property
  const existing = queue.find((o) => o.k === 'save' && o.rec.id === rec.id) as Extract<Op, { k: 'save' }> | undefined;
  queue = queue.filter((o) => !(o.k === 'save' && o.rec.id === rec.id));
  const mergedPhotos = [...(existing?.photos || []), ...photos];
  const mergedRelease = Array.from(new Set([...(existing?.releaseKeys || []), ...releaseKeys]));
  queue.push({ k: 'save', town, rec: full, photos: mergedPhotos, releaseKeys: mergedRelease, q: now });
  conflictList = conflictList.filter((c) => c.id !== rec.id);
  changed();
  void flush();
  return full;
}

export function queueDelete(town: string, rec: PropertyRecord) {
  queue = queue.filter((o) => !(o.k === 'save' && o.rec.id === rec.id));
  conflictList = conflictList.filter((c) => c.id !== rec.id);
  queue.push({ k: 'delete', town, id: rec.id, keys: dupKeysFor(rec), photoIds: rec.photoIds || [], q: Date.now() });
  changed();
  void flush();
}

export const discardConflict = (id: string) => {
  conflictList = conflictList.filter((c) => c.id !== id);
  changed();
};

export const pendingSaves = (town: string) =>
  queue.filter((o): o is Extract<Op, { k: 'save' }> => o.k === 'save' && o.town === town).map((o) => o.rec);
export const pendingDeleteIds = (town: string) =>
  new Set(queue.filter((o) => o.k === 'delete' && o.town === town).map((o) => (o as Extract<Op, { k: 'delete' }>).id));

// ---------------- flushing ----------------
const withTimeout = <T,>(p: Promise<T>): Promise<T> =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), TXN_TIMEOUT_MS))]);

async function claim(town: string, key: string, id: string): Promise<{ ok: true } | { ok: false; owner: string }> {
  const r = ref(db, `dupIndex/${town}/${key}`);
  const res = await withTimeout(runTransaction(r, (cur) => (cur === null || cur === id ? id : undefined)));
  if (res.committed) return { ok: true };
  return { ok: false, owner: String(res.snapshot.val() ?? 'another record') };
}
async function release(town: string, key: string, id: string) {
  const r = ref(db, `dupIndex/${town}/${key}`);
  await withTimeout(runTransaction(r, (cur) => (cur === id ? null : undefined)));
}

const isPermission = (e: unknown) => /PERMISSION_DENIED/i.test(String((e as Error)?.message || e));

async function runOp(op: Op): Promise<'done' | 'conflict'> {
  if (op.k === 'save') {
    const { town, rec } = op;
    const keys = dupKeysFor(rec);
    const claimed: string[] = [];
    for (const k of keys) {
      const c = await claim(town, k, rec.id);
      if (!c.ok) {
        for (const done of claimed) await release(town, done, rec.id).catch(() => {});
        conflictList.push({
          id: rec.id, town, rec, at: Date.now(),
          reason: `House/UPN already registered as ${c.owner}. Change the house no./UPN or delete the duplicate.`,
        });
        return 'conflict';
      }
      claimed.push(k);
    }
    await withTimeout(set(ref(db, `properties/${town}/${rec.id}`), rec));
    for (const p of op.photos) {
      await withTimeout(set(ref(db, `photos/${town}/${rec.id}/${p.id}`), { data: p.data, at: Date.now() }));
    }
    for (const k of op.releaseKeys) await release(town, k, rec.id).catch(() => {});
    return 'done';
  }
  // delete: property first, then its keys and photos
  await withTimeout(remove(ref(db, `properties/${op.town}/${op.id}`)));
  await withTimeout(remove(ref(db, `photos/${op.town}/${op.id}`))).catch(() => {});
  for (const k of op.keys) await release(op.town, k, op.id).catch(() => {});
  return 'done';
}

export async function flush() {
  if (flushing || !connected || !auth.currentUser) return;
  flushing = true; changed();
  try {
    while (queue.length) {
      const op = queue[0];
      try {
        const out = await runOp(op);
        queue.shift();
        if (out === 'conflict') changed(); else changed();
      } catch (e) {
        if (isPermission(e)) {
          // permanent failure: park it so it never blocks the queue
          queue.shift();
          if (op.k === 'save') {
            conflictList.push({ id: op.rec.id, town: op.town, rec: op.rec, at: Date.now(), reason: 'Your role is not allowed to save this record.' });
          }
          changed();
        } else {
          break; // network trouble: keep the queue, retry later
        }
      }
    }
  } finally {
    flushing = false; changed();
  }
}

let started = false;
export function startSync() {
  if (started) return;
  started = true;
  cloudWatchConnection((c) => { connected = c; changed(); if (c) void flush(); });
  window.addEventListener('online', () => void flush());
  setInterval(() => void flush(), 30000);
}

// ---------------- merge cloud snapshot into the local list ----------------
const loadSeen = (town: string) => new Set<string>(load<string[]>(seenKey(town), []));

export function mergeCloud(
  town: string, townName: string, local: PropertyRecord[], cloud: PropertyRecord[],
): { merged: PropertyRecord[]; localOnly: PropertyRecord[] } {
  const seen = loadSeen(town);
  const cloudIds = new Set(cloud.map((r) => r.id));
  const pendS = new Map(pendingSaves(town).map((r) => [r.id, r]));
  const pendD = pendingDeleteIds(town);
  const confIds = new Set(conflictList.filter((c) => c.town === town).map((c) => c.id));

  const others = local.filter((r) => r.town !== townName);
  const mine = local.filter((r) => r.town === townName);
  const out: PropertyRecord[] = [];
  const localOnly: PropertyRecord[] = [];

  for (const c of cloud) { if (!pendD.has(c.id)) out.push(pendS.get(c.id) ?? c); }
  for (const [id, rec] of pendS) if (!cloudIds.has(id)) out.push(rec);
  for (const r of mine) {
    if (cloudIds.has(r.id) || pendS.has(r.id) || pendD.has(r.id)) continue;
    if (confIds.has(r.id)) { out.push(r); continue; }
    if (seen.has(r.id)) continue;            // it was in the cloud before: deleted by someone else
    localOnly.push(r); out.push(r);          // never uploaded (old local-only data)
  }
  try { localStorage.setItem(seenKey(town), JSON.stringify([...new Set([...seen, ...cloudIds])])); } catch { /* ignore */ }
  return { merged: [...others, ...out], localOnly };
}

// ---------------- React hook ----------------
interface SyncSnapshot { version: number; pending: number; conflicts: Conflict[]; online: boolean; flushing: boolean; storageFull: boolean }
let snap: SyncSnapshot = build();
function build(): SyncSnapshot {
  return { version, pending: queue.length, conflicts: conflictList, online: connected, flushing, storageFull };
}
export function useSyncState(): SyncSnapshot {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => { if (snap.version !== version) snap = build(); return snap; },
  );
}
