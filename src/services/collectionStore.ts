// Cloud storage for Phase 3: collection settings, ledgers, receipts, audit log. Online only (office work).
// Ledger entries are append-only; the database rules refuse edits and deletes.
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
  CollectionSettings, LedgerEntry, PayMode, placeholderSettings, previewPayment,
} from './collection';

const clean = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export interface AuditEntry { id: string; at: number; by: string; action: string; propertyId?: string; detail: string }

export function useCollectionSettings(townKey: string): { settings: CollectionSettings; saved: boolean } {
  const [state, setState] = useState({ settings: placeholderSettings(), saved: false });
  useEffect(() => {
    setState({ settings: placeholderSettings(), saved: false });
    return onValue(ref(db, `collectionSettings/${townKey}`), (snap) => {
      const v = snap.val() as CollectionSettings | null;
      setState(v ? { settings: { ...placeholderSettings(), ...v, clauses: v.clauses || {} }, saved: true } : { settings: placeholderSettings(), saved: false });
    }, () => { /* no permission or offline: keep defaults */ });
  }, [townKey]);
  return state;
}

export function saveCollectionSettings(townKey: string, s: CollectionSettings) {
  return set(ref(db, `collectionSettings/${townKey}`), clean(s));
}

/** Rules (due date, interest, rebate) of a bill head other than property tax: headSettings/<town>/<head>. */
export function useHeadSettings(townKey: string, head: HeadId): { settings: CollectionSettings; saved: boolean } {
  const [state, setState] = useState({ settings: placeholderSettings(), saved: false });
  useEffect(() => {
    setState({ settings: placeholderSettings(), saved: false });
    if (head === 'property_tax') return;
    return onValue(ref(db, `headSettings/${townKey}/${head}`), (snap) => {
      const v = snap.val() as CollectionSettings | null;
      setState(v ? { settings: { ...placeholderSettings(), ...v, clauses: v.clauses || {} }, saved: true } : { settings: placeholderSettings(), saved: false });
    }, () => { /* ignore */ });
  }, [townKey, head]);
  return state;
}
export function saveHeadSettings(townKey: string, head: HeadId, s: CollectionSettings) {
  return head === 'property_tax' ? saveCollectionSettings(townKey, s) : set(ref(db, `headSettings/${townKey}/${head}`), clean(s));
}

/** All ledgers of a town: propertyId -> entries. Fine for a ULB-sized town; move to SQL if it grows. */
export function useLedgers(townKey: string, head: HeadId = 'property_tax'): Record<string, LedgerEntry[]> {
  const [map, setMap] = useState<Record<string, LedgerEntry[]>>({});
  useEffect(() => {
    setMap({});
    return onValue(ref(db, `ledger/${townKey}`), (snap) => {
      const raw = (snap.val() || {}) as Record<string, Record<string, Omit<LedgerEntry, 'id'>>>;
      const out: Record<string, LedgerEntry[]> = {};
      for (const [key, es] of Object.entries(raw)) {
        const k = splitLedgerKey(key);
        if (k.head !== head) continue;
        out[k.pid] = Object.entries(es).map(([id, e]) => ({ ...e, id }));
      }
      setMap(out);
    }, () => { /* ignore */ });
  }, [townKey, head]);
  return map;
}

export function useAudit(townKey: string, enabled: boolean): AuditEntry[] {
  const [list, setList] = useState<AuditEntry[]>([]);
  useEffect(() => {
    setList([]);
    if (!enabled) return;
    return onValue(query(ref(db, `audit/${townKey}`), orderByKey(), limitToLast(60)), (snap) => {
      const raw = (snap.val() || {}) as Record<string, Omit<AuditEntry, 'id'>>;
      setList(Object.entries(raw).map(([id, e]) => ({ ...e, id })).sort((a, b) => b.at - a.at));
    }, () => { /* ignore */ });
  }, [townKey, enabled]);
  return list;
}

const auditEntry = (action: string, detail: string, propertyId?: string) =>
  clean({ at: Date.now(), by: currentUid(), action, detail, ...(propertyId ? { propertyId } : {}) });
const newKey = (path: string) => push(ref(db, path)).key as string;

export interface PaymentInput {
  town: string; propertyId: string; ownerName: string;
  amount: number; date: string; mode: PayMode; ref?: string; payer?: string; note?: string;
  rebateFy?: string;
  head?: HeadId;
}
export interface PaymentResult { receiptNo: string; paymentId: string; rebate: number }

/** Post one payment (and its rebate, if any) under a fresh receipt number, in a single atomic write. */
export async function postPayment(p: PaymentInput, entries: LedgerEntry[], settings: CollectionSettings): Promise<PaymentResult> {
  const prev = previewPayment(entries, settings, { amount: p.amount, date: p.date, rebateFy: p.rebateFy });
  if (!prev.ok) throw new Error(prev.error);
  if (p.mode !== 'cash' && !p.ref?.trim()) throw new Error(p.mode === 'cheque' ? 'Enter the cheque number.' : 'Enter the transaction reference.');

  const head = p.head || 'property_tax';
  const rcFy = financialYearOf(new Date(p.date + 'T00:00:00'));
  // property tax keeps its original counter and receipt format; other heads get their own series
  const ctrKey = head === 'property_tax' ? rcFy : `${head}_${rcFy}`;
  const ctrPath = `receiptCounters/${p.town}/${ctrKey}`;
  const base = `ledger/${p.town}/${ledgerKey(head, p.propertyId)}`;
  const firstFy = prev.result?.rows.find((r) => r.fy)?.fy || rcFy;

  // The receipt number is taken in the SAME write as the payment, so a failed save never leaves a gap in the series.
  // The rules only accept the counter going up by exactly one; if another cashier got there first, the whole write
  // is refused and we read the counter again and retry.
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const cur = (await get(ref(db, ctrPath))).val();
    const next = (typeof cur === 'number' ? cur : 0) + 1;
    const receiptNo = head === 'property_tax'
      ? `${ulbCode(p.town)}/${rcFy}/${String(next).padStart(6, '0')}`
      : `${ulbCode(p.town)}/${head.toUpperCase().slice(0, 3)}/${rcFy}/${String(next).padStart(6, '0')}`;
    const paymentId = newKey(base);
    // `at` is the database server's own time: the rules require it, so a wrong phone clock cannot change it
    const common = { at: serverTimestamp() as unknown as number, by: currentUid(), date: p.date, receiptNo };
    const updates: Record<string, unknown> = {
      [ctrPath]: next,
      [`${base}/${paymentId}`]: clean({
        ...common, type: 'payment', fy: firstFy, amount: p.amount, mode: p.mode,
        ...(p.ref?.trim() ? { ref: p.ref.trim() } : {}),
        ...(p.payer?.trim() ? { payer: p.payer.trim() } : {}),
        ...(p.note?.trim() ? { note: p.note.trim() } : {}),
      }),
    };
    if (prev.rebate > 0 && prev.rebateFy) {
      updates[`${base}/${newKey(base)}`] = clean({ ...common, type: 'rebate', fy: prev.rebateFy, amount: prev.rebate, note: 'Early-payment rebate' });
    }
    updates[`audit/${p.town}/${newKey(`audit/${p.town}`)}`] = auditEntry('payment', `${headLabel(head)} receipt ${receiptNo}, ₹${p.amount}, ${p.mode}${prev.rebate ? `, rebate ₹${prev.rebate}` : ''}`, p.propertyId);
    try {
      await update(ref(db), updates);
      return { receiptNo, paymentId, rebate: prev.rebate };
    } catch (e) { lastErr = e; }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Could not save the payment. Check the connection and try again.');
}

/** Cancel entries by posting reversal entries. `ids` are the entries to cancel (a payment and its rebate go together). */
export async function reverseEntries(town: string, propertyId: string, entries: LedgerEntry[], ids: string[], reason: string, head: HeadId = 'property_tax') {
  if (!reason.trim()) throw new Error('A reason is required.');
  const base = `ledger/${town}/${ledgerKey(head, propertyId)}`;
  const updates: Record<string, unknown> = {};
  const done = new Set(entries.filter((e) => e.type === 'reversal').map((e) => e.reverses));
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const labels: string[] = [];
  for (const id of ids) {
    const o = entries.find((e) => e.id === id);
    if (!o || o.type === 'reversal' || done.has(id)) continue;
    updates[`${base}/rev_${id}`] = clean({
      type: 'reversal', fy: o.fy, amount: Math.abs(o.amount), date, at: Date.now(), by: currentUid(),
      reverses: id, reason: reason.trim(), ...(o.receiptNo ? { receiptNo: o.receiptNo } : {}),
    });
    labels.push(`${o.type}${o.receiptNo ? ' ' + o.receiptNo : ''} ₹${o.amount}`);
  }
  if (!labels.length) throw new Error('Nothing to reverse (already reversed?).');
  updates[`audit/${town}/${newKey(`audit/${town}`)}`] = auditEntry('reversal', `${headLabel(head)}: ${labels.join('; ')}. Reason: ${reason.trim()}`, propertyId);
  await update(ref(db), updates);
}

/** Demand for a financial year = the tax on each approved assessment. Skips properties that already have one. */
export async function generateDemands(
  town: string, fy: string, assessments: Record<string, Assessment>, ledgers: Record<string, LedgerEntry[]>,
): Promise<{ created: number; skippedExisting: number; noTax: number }> {
  const date = new Date();
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const todo: { pid: string; a: Assessment }[] = [];
  let skippedExisting = 0, noTax = 0;
  for (const [pid, a] of Object.entries(assessments)) {
    if (a.status !== 'approved') continue;
    if (a.calc.tax === null || !(a.calc.tax > 0)) { noTax++; continue; }
    if ((ledgers[pid] || []).some((e) => e.id === `demand_${fy}`)) { skippedExisting++; continue; }
    todo.push({ pid, a });
  }
  for (let i = 0; i < todo.length; i += 100) {
    const updates: Record<string, unknown> = {};
    for (const { pid, a } of todo.slice(i, i + 100)) {
      updates[`ledger/${town}/${pid}/demand_${fy}`] = clean({
        type: 'demand', fy, amount: a.calc.tax, date: day, at: Date.now(), by: currentUid(), rateTableId: a.rateTableId,
        note: `From approved assessment (${a.rateStatus} rates)`,
      });
    }
    if (i + 100 >= todo.length) updates[`audit/${town}/${newKey(`audit/${town}`)}`] = auditEntry('demand', `Generated ${todo.length} demand(s) for ${fy}`);
    await update(ref(db), updates);
  }
  return { created: todo.length, skippedExisting, noTax };
}

/**
 * Demand from the town's fixed amounts (Residential / Commercial), for towns that fix the payable amount by hand
 * instead of computing it from an assessment. One demand per property per year; existing ones are skipped.
 */
export async function generateFixedDemands(
  town: string, fy: string, props: { id: string; use: string }[], rates: { residential: number | null; commercial: number | null },
  ledgers: Record<string, LedgerEntry[]>, head: HeadId = 'property_tax',
): Promise<{ created: number; skippedExisting: number; noRate: number }> {
  const date = new Date();
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const todo: { id: string; amt: number; use: string }[] = [];
  let skippedExisting = 0, noRate = 0;
  for (const p of props) {
    const amt = p.use === 'Residential' ? rates.residential : p.use === 'Commercial' ? rates.commercial : null;
    if (amt === null || !(amt > 0)) { noRate++; continue; }
    if ((ledgers[p.id] || []).some((e) => e.id === `demand_${fy}`)) { skippedExisting++; continue; }
    todo.push({ id: p.id, amt, use: p.use });
  }
  for (let i = 0; i < todo.length; i += 100) {
    const updates: Record<string, unknown> = {};
    for (const t of todo.slice(i, i + 100)) {
      updates[`ledger/${town}/${ledgerKey(head, t.id)}/demand_${fy}`] = clean({
        type: 'demand', fy, amount: t.amt, date: day, at: Date.now(), by: currentUid(), source: 'fixed',
        note: `${headLabel(head)}: fixed town amount (${t.use})`,
      });
    }
    if (i + 100 >= todo.length) updates[`audit/${town}/${newKey(`audit/${town}`)}`] = auditEntry('demand', `${headLabel(head)}: generated ${todo.length} fixed-amount demand(s) for ${fy}`);
    await update(ref(db), updates);
  }
  return { created: todo.length, skippedExisting, noRate };
}

/** Extra demand (+) or reduction (-) on a year, e.g. after a re-assessment. */
export function postAdjustment(town: string, propertyId: string, fy: string, amount: number, reason: string, date: string, head: HeadId = 'property_tax') {
  if (!reason.trim()) throw new Error('A reason is required.');
  if (!amount || isNaN(amount)) throw new Error('Enter a non-zero amount.');
  const base = `ledger/${town}/${ledgerKey(head, propertyId)}`;
  return update(ref(db), {
    [`${base}/${newKey(base)}`]: clean({ type: 'adjustment', fy, amount, date, at: Date.now(), by: currentUid(), reason: reason.trim() }),
    [`audit/${town}/${newKey(`audit/${town}`)}`]: auditEntry('adjustment', `${headLabel(head)} ${fy} ${amount > 0 ? '+' : ''}${amount}. ${reason.trim()}`, propertyId),
  });
}
