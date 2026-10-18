// Everything one property or one owner owes, across every bill head, as on today.
import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { HeadId, HEAD_LIST, splitLedgerKey } from './heads';
import { LedgerEntry, CollectionSettings, placeholderSettings, computeLedger } from './collection';

type LedgersByHead = Record<HeadId, Record<string, LedgerEntry[]>>;
const emptyLedgers = (): LedgersByHead => ({
  property_tax: {}, water: {}, garbage: {}, sewerage: {}, electricity: {}, other: {},
});

/** Every ledger of the town, grouped by bill head, with one database listener. */
export function useAllLedgers(townKey: string): LedgersByHead {
  const [all, setAll] = useState<LedgersByHead>(emptyLedgers);
  useEffect(() => {
    setAll(emptyLedgers());
    return onValue(ref(db, `ledger/${townKey}`), (snap) => {
      const raw = (snap.val() || {}) as Record<string, Record<string, Omit<LedgerEntry, 'id'>>>;
      const out = emptyLedgers();
      for (const [key, es] of Object.entries(raw)) {
        const k = splitLedgerKey(key);
        if (!out[k.head]) continue;
        out[k.head][k.pid] = Object.entries(es).map(([id, e]) => ({ ...e, id }));
      }
      setAll(out);
    }, () => { /* no permission or offline: show nothing */ });
  }, [townKey]);
  return all;
}

/** Due-date, interest and rebate rules for every bill head. */
export function useAllSettings(townKey: string): Record<HeadId, CollectionSettings> {
  const blank = () => Object.fromEntries(HEAD_LIST.map((h) => [h.id, placeholderSettings()])) as Record<HeadId, CollectionSettings>;
  const [s, setS] = useState<Record<HeadId, CollectionSettings>>(blank);
  useEffect(() => {
    let pt = placeholderSettings(); let others: Record<string, CollectionSettings> = {};
    const push = () => setS({
      ...blank(),
      ...Object.fromEntries(Object.entries(others).map(([h, v]) => [h, { ...placeholderSettings(), ...v, clauses: v.clauses || {} }])),
      property_tax: pt,
    } as Record<HeadId, CollectionSettings>);
    const u1 = onValue(ref(db, `collectionSettings/${townKey}`), (snap) => {
      const v = snap.val() as CollectionSettings | null;
      pt = v ? { ...placeholderSettings(), ...v, clauses: v.clauses || {} } : placeholderSettings();
      push();
    }, () => { /* keep defaults */ });
    const u2 = onValue(ref(db, `headSettings/${townKey}`), (snap) => {
      others = (snap.val() || {}) as Record<string, CollectionSettings>;
      push();
    }, () => { /* keep defaults */ });
    return () => { u1(); u2(); };
  }, [townKey]);
  return s;
}

export type PayStatus = 'paid' | 'partial' | 'pending' | 'no_demand';

export interface PeriodDue {
  fy: string;
  dueDate: string;
  principal: number;
  interest: number;
  total: number;
}

export interface HeadLiability {
  head: HeadId;
  principal: number;
  interest: number;
  total: number;
  /** Sum of demand (+ adjustment) amounts demanded for this head. */
  demanded: number;
  /** Sum of valid payment amounts posted against this head. */
  paid: number;
  billed: boolean;
  status: PayStatus;
  periods: PeriodDue[];
}

export interface PropertyLiability {
  propertyId: string;
  heads: HeadLiability[];
  total: number;
  paid: number;
  status: PayStatus;
}

function r2(n: number) {
  return Math.round(n * 100) / 100;
}

function headStatus(billed: boolean, totalDue: number, paid: number): PayStatus {
  if (!billed) return 'no_demand';
  if (totalDue <= 0.004) return 'paid';
  if (paid > 0.004) return 'partial';
  return 'pending';
}

function overallStatus(heads: HeadLiability[]): PayStatus {
  const active = heads.filter((h) => h.status !== 'no_demand');
  if (!active.length) return 'no_demand';
  if (active.every((h) => h.status === 'paid')) return 'paid';
  if (active.some((h) => h.status === 'paid' || h.status === 'partial') && active.some((h) => h.total > 0.004)) {
    return 'partial';
  }
  if (active.every((h) => h.status === 'pending')) return 'pending';
  return 'partial';
}

/** Dues of one property under the given bill heads.
 *  Always returns a row for every requested head (including no_demand). */
export function propertyLiability(
  pid: string,
  heads: HeadId[],
  ledgers: LedgersByHead,
  settings: Record<HeadId, CollectionSettings>,
  asOf: string,
): PropertyLiability {
  const out: HeadLiability[] = [];
  for (const h of heads) {
    const entries = ledgers[h]?.[pid] || [];
    const billed = entries.some((e) => e.type === 'demand');
    if (!entries.length) {
      out.push({
        head: h, principal: 0, interest: 0, total: 0, demanded: 0, paid: 0,
        billed: false, status: 'no_demand', periods: [],
      });
      continue;
    }
    const l = computeLedger(entries, settings[h] || placeholderSettings(), asOf);
    const demanded = r2(
      entries
        .filter((e) => e.type === 'demand' || e.type === 'adjustment')
        .reduce((a, e) => a + (e.amount || 0), 0),
    );
    // Payments that are not reversed — approximate via ledger: original payments minus we trust computeLedger balance
    const paid = r2(
      entries
        .filter((e) => e.type === 'payment')
        .reduce((a, e) => a + (e.amount || 0), 0),
    );
    const total = r2(l.totalDue);
    out.push({
      head: h,
      principal: r2(l.principalDue),
      interest: r2(l.interestDue),
      total,
      demanded,
      paid,
      billed,
      status: headStatus(billed, total, paid),
      periods: l.rows
        .filter((r) => r.totalDue > 0.004)
        .map((r) => ({
          fy: r.fy,
          dueDate: r.dueDate,
          principal: r.principalDue,
          interest: r.interestDue,
          total: r.totalDue,
        })),
    });
  }
  const total = r2(out.reduce((a, x) => a + x.total, 0));
  const paid = r2(out.reduce((a, x) => a + x.paid, 0));
  return {
    propertyId: pid,
    heads: out,
    total,
    paid,
    status: overallStatus(out),
  };
}

export const STATUS_LABEL: Record<PayStatus, string> = {
  paid: 'Paid',
  partial: 'Partially paid',
  pending: 'Pending',
  no_demand: 'No demand',
};
