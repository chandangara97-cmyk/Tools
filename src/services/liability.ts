// Everything one property or one owner owes, across every bill head, as on today.
import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { HeadId, HEAD_LIST, splitLedgerKey } from './heads';
import { LedgerEntry, CollectionSettings, placeholderSettings, computeLedger } from './collection';

type LedgersByHead = Record<HeadId, Record<string, LedgerEntry[]>>;
const emptyLedgers = (): LedgersByHead => ({ property_tax: {}, water: {}, garbage: {}, sewerage: {}, other: {} });

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
    const push = () => setS({ ...blank(), ...Object.fromEntries(Object.entries(others).map(([h, v]) => [h, { ...placeholderSettings(), ...v, clauses: v.clauses || {} }])), property_tax: pt } as Record<HeadId, CollectionSettings>);
    const u1 = onValue(ref(db, `collectionSettings/${townKey}`), (snap) => {
      const v = snap.val() as CollectionSettings | null;
      pt = v ? { ...placeholderSettings(), ...v, clauses: v.clauses || {} } : placeholderSettings(); push();
    }, () => { /* keep defaults */ });
    const u2 = onValue(ref(db, `headSettings/${townKey}`), (snap) => { others = (snap.val() || {}) as Record<string, CollectionSettings>; push(); }, () => { /* keep defaults */ });
    return () => { u1(); u2(); };
  }, [townKey]);
  return s;
}

export interface HeadLiability { head: HeadId; principal: number; interest: number; total: number; billed: boolean }
export interface PropertyLiability { propertyId: string; heads: HeadLiability[]; total: number }

/** Dues of one property under the given bill heads. Heads with no demand are left out. */
export function propertyLiability(
  pid: string, heads: HeadId[], ledgers: LedgersByHead, settings: Record<HeadId, CollectionSettings>, asOf: string,
): PropertyLiability {
  const out: HeadLiability[] = [];
  for (const h of heads) {
    const entries = ledgers[h]?.[pid] || [];
    if (!entries.length) continue;
    const l = computeLedger(entries, settings[h], asOf);
    out.push({ head: h, principal: l.principalDue, interest: l.interestDue, total: l.totalDue, billed: entries.some((e) => e.type === 'demand') });
  }
  return { propertyId: pid, heads: out, total: out.reduce((a, x) => a + x.total, 0) };
}
