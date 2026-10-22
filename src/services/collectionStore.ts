// Cloud + Local offline storage for collection settings, ledgers, receipts, audit log.
// Fully offline-first: works without network, saves to local storage immediately,
// and syncs automatically with Firebase when reconnected.
import { useEffect, useState } from 'react';
import { ref, set, get, onValue, update, push, serverTimestamp, query, limitToLast, orderByKey } from 'firebase/database';
import './serverClock';
import { db } from '../firebase';
import { financialYearOf } from './assessment';
import type { Assessment } from './assessmentStore';
import { currentUid } from './assessmentStore';
import { ulbCode } from './ids';
import { HeadId, headLabel, ledgerKey, splitLedgerKey } from './heads';
import {
  CollectionSettings, LedgerEntry, PayMode, placeholderSettings, previewPayment, liveDemand, nextDemandId, VoidItem,
} from './collection';
import {
  KEY_RAW_LEDGER,
  KEY_SETTINGS,
  KEY_HEAD_SETTINGS,
  KEY_RECEIPT_COUNTER,
  getInitialLedgerForTown,
  getInitialPropertiesForTown,
} from './offlineData';
import { queueLedgerUpdate, queueSettingsSave } from './syncQueue';

const clean = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export interface AuditEntry { id: string; at: number; by: string; action: string; propertyId?: string; detail: string }

const KEY_AUDIT = (town: string) => `ptax_audit_${town}`;

function getLocalAudit(town: string): AuditEntry[] {
  try {
    const raw = localStorage.getItem(KEY_AUDIT(town));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAudit(town: string, entry: AuditEntry) {
  try {
    const list = [entry, ...getLocalAudit(town)].slice(0, 100);
    localStorage.setItem(KEY_AUDIT(town), JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('ptax_audit_updated', { detail: { town } }));
  } catch { /* ignore */ }
}

function getLocalRawLedger(townKey: string): Record<string, Record<string, Omit<LedgerEntry, 'id'>>> {
  try {
    const rawStr = localStorage.getItem(KEY_RAW_LEDGER(townKey));
    if (rawStr) return JSON.parse(rawStr);
    const props = getInitialPropertiesForTown(townKey, townKey);
    return getInitialLedgerForTown(townKey, props);
  } catch {
    return {};
  }
}

function saveLocalRawLedger(townKey: string, raw: Record<string, Record<string, Omit<LedgerEntry, 'id'>>>) {
  try {
    localStorage.setItem(KEY_RAW_LEDGER(townKey), JSON.stringify(raw));
    window.dispatchEvent(new CustomEvent('ptax_ledger_updated', { detail: { town: townKey } }));
  } catch { /* ignore */ }
}

function parseLedgerForHead(raw: Record<string, Record<string, Omit<LedgerEntry, 'id'>>>, head: HeadId): Record<string, LedgerEntry[]> {
  const out: Record<string, LedgerEntry[]> = {};
  for (const [key, es] of Object.entries(raw || {})) {
    const k = splitLedgerKey(key);
    if (k.head !== head || !es || typeof es !== 'object') continue;
    out[k.pid] = Object.entries(es).map(([id, e]) => ({ ...e, id }));
  }
  return out;
}

function getLocalLedgerForHead(townKey: string, head: HeadId): Record<string, LedgerEntry[]> {
  const raw = getLocalRawLedger(townKey);
  return parseLedgerForHead(raw, head);
}

function getLocalReceiptCounter(townKey: string, ctrKey: string): number {
  try {
    const v = localStorage.getItem(KEY_RECEIPT_COUNTER(townKey, ctrKey));
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function setLocalReceiptCounter(townKey: string, ctrKey: string, val: number) {
  try {
    localStorage.setItem(KEY_RECEIPT_COUNTER(townKey, ctrKey), String(val));
  } catch { /* ignore */ }
}

export function useCollectionSettings(townKey: string): { settings: CollectionSettings; saved: boolean } {
  const loadLocal = () => {
    try {
      const v = localStorage.getItem(KEY_SETTINGS(townKey));
      if (v) return { settings: { ...placeholderSettings(), ...JSON.parse(v), status: 'approved' as const }, saved: true };
    } catch { /* ignore */ }
    return { settings: { ...placeholderSettings(), status: 'approved' as const, rebatePct: 10, dueMonth: 3, dueDay: 31 }, saved: false };
  };

  const [state, setState] = useState(loadLocal);

  useEffect(() => {
    setState(loadLocal());

    const onUpdate = (e: Event) => {
      const ce = e as CustomEvent<{ town: string }>;
      if (!ce.detail || ce.detail.town === townKey) {
        setState(loadLocal());
      }
    };
    window.addEventListener('ptax_settings_updated', onUpdate);

    let unsub: (() => void) | undefined;
    try {
      unsub = onValue(ref(db, `collectionSettings/${townKey}`), (snap) => {
        const v = snap.val() as CollectionSettings | null;
        if (v) {
          const s = { ...placeholderSettings(), ...v, clauses: v.clauses || {} };
          try { localStorage.setItem(KEY_SETTINGS(townKey), JSON.stringify(s)); } catch { /* ignore */ }
          setState({ settings: s, saved: true });
        }
      }, () => { /* offline: keep local */ });
    } catch {
      /* offline */
    }

    return () => {
      window.removeEventListener('ptax_settings_updated', onUpdate);
      unsub?.();
    };
  }, [townKey]);

  return state;
}

export async function saveCollectionSettings(townKey: string, s: CollectionSettings) {
  try {
    localStorage.setItem(KEY_SETTINGS(townKey), JSON.stringify(s));
    window.dispatchEvent(new CustomEvent('ptax_settings_updated', { detail: { town: townKey } }));
  } catch { /* ignore */ }

  const cleanData = clean(s);
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const p = set(ref(db, `collectionSettings/${townKey}`), cleanData);
      const to = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 2500));
      await Promise.race([p, to]);
      return;
    }
  } catch { /* network error */ }

  queueSettingsSave(townKey, undefined, cleanData);
}

/** Rules of a bill head other than property tax: headSettings/<town>/<head>. */
export function useHeadSettings(townKey: string, head: HeadId): { settings: CollectionSettings; saved: boolean } {
  const loadLocal = () => {
    if (head === 'property_tax') {
      try {
        const v = localStorage.getItem(KEY_SETTINGS(townKey));
        if (v) return { settings: { ...placeholderSettings(), ...JSON.parse(v), status: 'approved' as const }, saved: true };
      } catch { /* ignore */ }
      return { settings: { ...placeholderSettings(), status: 'approved' as const, rebatePct: 10, dueMonth: 3, dueDay: 31 }, saved: false };
    }
    try {
      const v = localStorage.getItem(KEY_HEAD_SETTINGS(townKey, head));
      if (v) return { settings: { ...placeholderSettings(), ...JSON.parse(v), status: 'approved' as const }, saved: true };
    } catch { /* ignore */ }
    return { settings: { ...placeholderSettings(), status: 'approved' as const }, saved: false };
  };

  const [state, setState] = useState(loadLocal);

  useEffect(() => {
    setState(loadLocal());
    if (head === 'property_tax') return;

    const onUpdate = (e: Event) => {
      const ce = e as CustomEvent<{ town: string }>;
      if (!ce.detail || ce.detail.town === townKey) setState(loadLocal());
    };
    window.addEventListener('ptax_settings_updated', onUpdate);

    let unsub: (() => void) | undefined;
    try {
      unsub = onValue(ref(db, `headSettings/${townKey}/${head}`), (snap) => {
        const v = snap.val() as CollectionSettings | null;
        if (v) {
          const s = { ...placeholderSettings(), ...v, clauses: v.clauses || {} };
          try { localStorage.setItem(KEY_HEAD_SETTINGS(townKey, head), JSON.stringify(s)); } catch { /* ignore */ }
          setState({ settings: s, saved: true });
        }
      }, () => { /* offline */ });
    } catch {
      /* offline */
    }

    return () => {
      window.removeEventListener('ptax_settings_updated', onUpdate);
      unsub?.();
    };
  }, [townKey, head]);

  return state;
}

export async function saveHeadSettings(townKey: string, head: HeadId, s: CollectionSettings): Promise<void> {
  if (head === 'property_tax') {
    await saveCollectionSettings(townKey, s);
    return;
  }
  try {
    localStorage.setItem(KEY_HEAD_SETTINGS(townKey, head), JSON.stringify(s));
    window.dispatchEvent(new CustomEvent('ptax_settings_updated', { detail: { town: townKey } }));
  } catch { /* ignore */ }

  const cleanData = clean(s);
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const p = set(ref(db, `headSettings/${townKey}/${head}`), cleanData);
      const to = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 2500));
      await Promise.race([p, to]);
      return;
    } catch { /* queue */ }
  }
  queueSettingsSave(townKey, head, cleanData);
}

/** All ledgers of a town: propertyId -> entries. Offline-first: loads immediately. */
export function useLedgers(townKey: string, head: HeadId = 'property_tax'): Record<string, LedgerEntry[]> {
  const [map, setMap] = useState<Record<string, LedgerEntry[]>>(() => getLocalLedgerForHead(townKey, head));

  useEffect(() => {
    setMap(getLocalLedgerForHead(townKey, head));

    const onUpdate = (e: Event) => {
      const ce = e as CustomEvent<{ town: string }>;
      if (!ce.detail || ce.detail.town === townKey) {
        setMap(getLocalLedgerForHead(townKey, head));
      }
    };
    window.addEventListener('ptax_ledger_updated', onUpdate);

    let unsub: (() => void) | undefined;
    try {
      unsub = onValue(ref(db, `ledger/${townKey}`), (snap) => {
        const raw = (snap.val() || {}) as Record<string, Record<string, Omit<LedgerEntry, 'id'>>>;
        if (raw && Object.keys(raw).length > 0) {
          saveLocalRawLedger(townKey, raw);
          setMap(parseLedgerForHead(raw, head));
        }
      }, () => { /* offline */ });
    } catch {
      /* offline */
    }

    return () => {
      window.removeEventListener('ptax_ledger_updated', onUpdate);
      unsub?.();
    };
  }, [townKey, head]);

  return map;
}

export function useAudit(townKey: string, enabled: boolean): AuditEntry[] {
  const [list, setList] = useState<AuditEntry[]>(() => (enabled ? getLocalAudit(townKey) : []));

  useEffect(() => {
    if (!enabled) { setList([]); return; }
    setList(getLocalAudit(townKey));

    const onUpdate = (e: Event) => {
      const ce = e as CustomEvent<{ town: string }>;
      if (!ce.detail || ce.detail.town === townKey) setList(getLocalAudit(townKey));
    };
    window.addEventListener('ptax_audit_updated', onUpdate);

    let unsub: (() => void) | undefined;
    try {
      unsub = onValue(query(ref(db, `audit/${townKey}`), orderByKey(), limitToLast(60)), (snap) => {
        const raw = (snap.val() || {}) as Record<string, Omit<AuditEntry, 'id'>>;
        if (raw && Object.keys(raw).length > 0) {
          const fromCloud = Object.entries(raw).map(([id, e]) => ({ ...e, id }));
          const merged = [...fromCloud, ...getLocalAudit(townKey)];
          const seen = new Set<string>();
          const deduped: AuditEntry[] = [];
          for (const item of merged) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              deduped.push(item);
            }
          }
          deduped.sort((a, b) => b.at - a.at);
          setList(deduped);
        }
      }, () => { /* offline */ });
    } catch {
      /* offline */
    }

    return () => {
      window.removeEventListener('ptax_audit_updated', onUpdate);
      unsub?.();
    };
  }, [townKey, enabled]);

  return list;
}

const auditEntry = (action: string, detail: string, propertyId?: string): AuditEntry => ({
  id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  at: Date.now(),
  by: currentUid(),
  action,
  detail,
  ...(propertyId ? { propertyId } : {}),
});

const newKey = (path: string) => {
  try {
    return push(ref(db, path)).key || `k_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  } catch {
    return `k_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  }
};

export interface PaymentInput {
  town: string; propertyId: string; ownerName: string;
  amount: number; date: string; mode: PayMode; ref?: string; payer?: string; note?: string;
  rebateFy?: string;
  head?: HeadId;
}
export interface PaymentResult { receiptNo: string; paymentId: string; rebate: number }

/** Post one payment (and its rebate, if any) under a fresh receipt number. Offline-first! */
export async function postPayment(p: PaymentInput, entries: LedgerEntry[], settings: CollectionSettings): Promise<PaymentResult> {
  const prev = previewPayment(entries, settings, { amount: p.amount, date: p.date, rebateFy: p.rebateFy });
  if (!prev.ok) throw new Error(prev.error);
  if (p.mode !== 'cash' && !p.ref?.trim()) throw new Error(p.mode === 'cheque' ? 'Enter the cheque number.' : 'Enter the transaction reference.');

  const head = p.head || 'property_tax';
  const rcFy = financialYearOf(new Date(p.date + 'T00:00:00'));
  const ctrKey = head === 'property_tax' ? rcFy : `${head}_${rcFy}`;
  const ctrPath = `receiptCounters/${p.town}/${ctrKey}`;
  const lKey = ledgerKey(head, p.propertyId);
  const base = `ledger/${p.town}/${lKey}`;
  const firstFy = prev.result?.rows.find((r) => r.fy)?.fy || rcFy;

  // 1. Calculate counter locally with fallback
  let curCounter = getLocalReceiptCounter(p.town, ctrKey);
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const getPromise = get(ref(db, ctrPath));
      const toPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 1200));
      const snap = await Promise.race([getPromise, toPromise]);
      const cloudVal = snap.val();
      if (typeof cloudVal === 'number' && cloudVal > curCounter) {
        curCounter = cloudVal;
      }
    }
  } catch { /* offline or timeout */ }

  const next = curCounter + 1;
  setLocalReceiptCounter(p.town, ctrKey, next);

  const receiptNo = head === 'property_tax'
    ? `${ulbCode(p.town)}/${rcFy}/${String(next).padStart(6, '0')}`
    : `${ulbCode(p.town)}/${head.toUpperCase().slice(0, 3)}/${rcFy}/${String(next).padStart(6, '0')}`;

  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const rebateId = `reb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = Date.now();

  const paymentEntry: Omit<LedgerEntry, 'id'> = {
    type: 'payment',
    fy: firstFy,
    amount: p.amount,
    date: p.date,
    at: now,
    by: currentUid(),
    receiptNo,
    mode: p.mode,
    ...(p.ref?.trim() ? { ref: p.ref.trim() } : {}),
    ...(p.payer?.trim() ? { payer: p.payer.trim() } : {}),
    ...(p.note?.trim() ? { note: p.note.trim() } : {}),
  };

  const rebateEntry: Omit<LedgerEntry, 'id'> | null = (prev.rebate > 0 && prev.rebateFy) ? {
    type: 'rebate',
    fy: prev.rebateFy,
    amount: prev.rebate,
    date: p.date,
    at: now,
    by: currentUid(),
    receiptNo,
    note: 'Early-payment rebate',
  } : null;

  // 2. Save to local raw ledger immediately
  const raw = getLocalRawLedger(p.town);
  raw[lKey] = raw[lKey] || {};
  raw[lKey][paymentId] = paymentEntry;
  if (rebateEntry) {
    raw[lKey][rebateId] = rebateEntry;
  }
  saveLocalRawLedger(p.town, raw);

  // 3. Log audit entry locally
  const aud = auditEntry(
    'payment',
    `${headLabel(head)} receipt ${receiptNo}, ₹${p.amount}, ${p.mode}${prev.rebate ? `, rebate ₹${prev.rebate}` : ''}`,
    p.propertyId,
  );
  saveLocalAudit(p.town, aud);

  // 4. Prepare cloud updates
  const updates: Record<string, unknown> = {
    [ctrPath]: next,
    [`${base}/${paymentId}`]: clean(paymentEntry),
  };
  if (rebateEntry) {
    updates[`${base}/${rebateId}`] = clean(rebateEntry);
  }
  updates[`audit/${p.town}/${aud.id}`] = clean(aud);

  // 5. If online, attempt cloud write; else queue for sync
  let synced = false;
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const upPromise = update(ref(db), updates);
      const toPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 2500));
      await Promise.race([upPromise, toPromise]);
      synced = true;
    }
  } catch {
    synced = false;
  }

  if (!synced) {
    queueLedgerUpdate(p.town, updates);
  }

  return { receiptNo, paymentId, rebate: prev.rebate };
}

/** Cancel entries by posting reversal entries. Works completely offline. */
export async function reverseEntries(
  town: string, propertyId: string, entries: LedgerEntry[], ids: string[], reason: string, head: HeadId = 'property_tax',
) {
  if (!reason.trim()) throw new Error('A reason is required.');
  const lKey = ledgerKey(head, propertyId);
  const base = `ledger/${town}/${lKey}`;
  const updates: Record<string, unknown> = {};
  const done = new Set(entries.filter((e) => e.type === 'reversal').map((e) => e.reverses));
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const labels: string[] = [];

  const raw = getLocalRawLedger(town);
  raw[lKey] = raw[lKey] || {};

  for (const id of ids) {
    const o = entries.find((e) => e.id === id);
    if (!o || o.type === 'reversal' || done.has(id)) continue;
    const revId = `rev_${id}`;
    const revEntry: Omit<LedgerEntry, 'id'> = {
      type: 'reversal', fy: o.fy, amount: Math.abs(o.amount), date, at: Date.now(), by: currentUid(),
      reverses: id, reason: reason.trim(), ...(o.receiptNo ? { receiptNo: o.receiptNo } : {}),
    };
    raw[lKey][revId] = revEntry;
    updates[`${base}/${revId}`] = clean(revEntry);
    labels.push(`${o.type}${o.receiptNo ? ' ' + o.receiptNo : ''} ₹${o.amount}`);
  }

  if (!labels.length) throw new Error('Nothing to reverse (already reversed?).');

  saveLocalRawLedger(town, raw);

  const aud = auditEntry('reversal', `${headLabel(head)}: ${labels.join('; ')}. Reason: ${reason.trim()}`, propertyId);
  saveLocalAudit(town, aud);
  updates[`audit/${town}/${aud.id}`] = clean(aud);

  let synced = false;
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const up = update(ref(db), updates);
      const to = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 2500));
      await Promise.race([up, to]);
      synced = true;
    }
  } catch { synced = false; }

  if (!synced) {
    queueLedgerUpdate(town, updates);
  }
}

/** Demand for a financial year = the tax on each approved assessment. Offline-first! */
export async function generateDemands(
  town: string, fy: string, assessments: Record<string, Assessment>, ledgers: Record<string, LedgerEntry[]>,
): Promise<{ created: number; skippedExisting: number; noTax: number }> {
  const date = new Date();
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const todo: { pid: string; a: Assessment; did: string }[] = [];
  let skippedExisting = 0, noTax = 0;

  for (const [pid, a] of Object.entries(assessments)) {
    if (a.status !== 'approved') continue;
    if (a.calc.tax === null || !(a.calc.tax > 0)) { noTax++; continue; }
    if (liveDemand(ledgers[pid] || [], fy)) { skippedExisting++; continue; }
    todo.push({ pid, a, did: nextDemandId(ledgers[pid] || [], fy) });
  }

  const raw = getLocalRawLedger(town);
  const updates: Record<string, unknown> = {};

  for (const { pid, a, did } of todo) {
    const lKey = ledgerKey('property_tax', pid);
    raw[lKey] = raw[lKey] || {};
    const entry: Omit<LedgerEntry, 'id'> = {
      type: 'demand', fy, amount: a.calc.tax!, date: day, at: Date.now(), by: currentUid(), rateTableId: a.rateTableId,
      note: `From approved assessment (${a.rateStatus} rates)`,
    };
    raw[lKey][did] = entry;
    updates[`ledger/${town}/${lKey}/${did}`] = clean(entry);
  }

  if (todo.length > 0) {
    saveLocalRawLedger(town, raw);
    const aud = auditEntry('demand', `Generated ${todo.length} demand(s) for ${fy}`);
    saveLocalAudit(town, aud);
    updates[`audit/${town}/${aud.id}`] = clean(aud);

    let synced = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const up = update(ref(db), updates);
        const to = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 3000));
        await Promise.race([up, to]);
        synced = true;
      }
    } catch { synced = false; }

    if (!synced) {
      queueLedgerUpdate(town, updates);
    }
  }

  return { created: todo.length, skippedExisting, noTax };
}

/** Demand from town fixed amounts. Offline-first! */
export async function generateFixedDemands(
  town: string, fy: string, props: { id: string; use: string }[], rates: { residential: number | null; commercial: number | null },
  ledgers: Record<string, LedgerEntry[]>, head: HeadId = 'property_tax',
): Promise<{ created: number; skippedExisting: number; noRate: number }> {
  const date = new Date();
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const todo: { id: string; amt: number; use: string; did: string }[] = [];
  let skippedExisting = 0, noRate = 0;

  for (const p of props) {
    const amt = p.use === 'Residential' ? rates.residential : p.use === 'Commercial' ? rates.commercial : null;
    if (amt === null || !(amt > 0)) { noRate++; continue; }
    if (liveDemand(ledgers[p.id] || [], fy)) { skippedExisting++; continue; }
    todo.push({ id: p.id, amt, use: p.use, did: nextDemandId(ledgers[p.id] || [], fy) });
  }

  const raw = getLocalRawLedger(town);
  const updates: Record<string, unknown> = {};

  for (const t of todo) {
    const lKey = ledgerKey(head, t.id);
    raw[lKey] = raw[lKey] || {};
    const entry: Omit<LedgerEntry, 'id'> = {
      type: 'demand', fy, amount: t.amt, date: day, at: Date.now(), by: currentUid(), source: 'fixed',
      note: `${headLabel(head)}: fixed town amount (${t.use})`,
    };
    raw[lKey][t.did] = entry;
    updates[`ledger/${town}/${lKey}/${t.did}`] = clean(entry);
  }

  if (todo.length > 0) {
    saveLocalRawLedger(town, raw);
    const aud = auditEntry('demand', `${headLabel(head)}: generated ${todo.length} fixed-amount demand(s) for ${fy}`);
    saveLocalAudit(town, aud);
    updates[`audit/${town}/${aud.id}`] = clean(aud);

    let synced = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const up = update(ref(db), updates);
        const to = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 3000));
        await Promise.race([up, to]);
        synced = true;
      }
    } catch { synced = false; }

    if (!synced) {
      queueLedgerUpdate(town, updates);
    }
  }

  return { created: todo.length, skippedExisting, noRate };
}

/** Extra demand (+) or reduction (-) on a year. Offline-first! */
export function postAdjustment(town: string, propertyId: string, fy: string, amount: number, reason: string, date: string, head: HeadId = 'property_tax') {
  if (!reason.trim()) throw new Error('A reason is required.');
  if (!amount || isNaN(amount)) throw new Error('Enter a non-zero amount.');

  const lKey = ledgerKey(head, propertyId);
  const adjId = `adj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const entry: Omit<LedgerEntry, 'id'> = {
    type: 'adjustment', fy, amount, date, at: Date.now(), by: currentUid(), reason: reason.trim(),
  };

  const raw = getLocalRawLedger(town);
  raw[lKey] = raw[lKey] || {};
  raw[lKey][adjId] = entry;
  saveLocalRawLedger(town, raw);

  const aud = auditEntry('adjustment', `${headLabel(head)} ${fy} ${amount > 0 ? '+' : ''}${amount}. ${reason.trim()}`, propertyId);
  saveLocalAudit(town, aud);

  const updates: Record<string, unknown> = {
    [`ledger/${town}/${lKey}/${adjId}`]: clean(entry),
    [`audit/${town}/${aud.id}`]: clean(aud),
  };

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    update(ref(db), updates).catch(() => {
      queueLedgerUpdate(town, updates);
    });
  } else {
    queueLedgerUpdate(town, updates);
  }
}

/** Cancel bills with reversal entries. Offline-first! */
export async function voidDemands(
  town: string, head: HeadId, period: string, items: VoidItem[], ledgers: Record<string, LedgerEntry[]>, reason: string,
): Promise<Record<string, LedgerEntry[]>> {
  if (!reason.trim()) throw new Error('A reason is required.');
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const added: Record<string, LedgerEntry[]> = {};
  const updates: Record<string, unknown> = {};

  const raw = getLocalRawLedger(town);

  for (const it of items) {
    const lKey = ledgerKey(head, it.key);
    raw[lKey] = raw[lKey] || {};
    for (const id of it.ids) {
      const o = (ledgers[it.key] || []).find((e) => e.id === id);
      if (!o) continue;
      const revId = `rev_${id}`;
      const revEntry: Omit<LedgerEntry, 'id'> = {
        type: 'reversal', fy: o.fy, amount: Math.abs(o.amount), date: day, at: Date.now(), by: currentUid(), reverses: id, reason: reason.trim(),
      };
      raw[lKey][revId] = revEntry;
      updates[`ledger/${town}/${lKey}/${revId}`] = clean(revEntry);
      (added[it.key] ||= []).push({ ...revEntry, id: revId } as LedgerEntry);
    }
  }

  saveLocalRawLedger(town, raw);

  const aud = auditEntry('reversal', `${headLabel(head)} ${period}: removed ${items.length} bill(s). Reason: ${reason.trim()}`);
  saveLocalAudit(town, aud);
  updates[`audit/${town}/${aud.id}`] = clean(aud);

  let synced = false;
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const up = update(ref(db), updates);
      const to = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 2500));
      await Promise.race([up, to]);
      synced = true;
    }
  } catch { synced = false; }

  if (!synced) {
    queueLedgerUpdate(town, updates);
  }

  return added;
}
