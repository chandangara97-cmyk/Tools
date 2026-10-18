// Everything one property or one owner owes, across every bill head, as on today.
import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { HeadId, HEAD_LIST, splitLedgerKey } from './heads';
import { LedgerEntry, CollectionSettings, placeholderSettings } from './collection';
import type { LedgersByHead } from './liabilityCalc';

const emptyLedgers = (): LedgersByHead => ({ property_tax: {}, water: {}, garbage: {}, sewerage: {}, other: {} });

export type LoadState = 'loading' | 'ready' | 'error';

/** Every ledger of the town, grouped by bill head, with one database listener. Says whether the data has really arrived. */
export function useAllLedgers(townKey: string): { ledgers: LedgersByHead; status: LoadState } {
  const [all, setAll] = useState<LedgersByHead>(emptyLedgers);
  const [status, setStatus] = useState<LoadState>('loading');
  useEffect(() => {
    setAll(emptyLedgers()); setStatus('loading');
    return onValue(ref(db, `ledger/${townKey}`), (snap) => {
      const raw = (snap.val() || {}) as Record<string, Record<string, Omit<LedgerEntry, 'id'>>>;
      const out = emptyLedgers();
      for (const [key, es] of Object.entries(raw)) {
        const k = splitLedgerKey(key);
        if (!out[k.head] || !es || typeof es !== 'object') continue;
        out[k.head][k.pid] = Object.entries(es).map(([id, e]) => ({ ...e, id }));
      }
      setAll(out); setStatus('ready');
    }, () => setStatus('error'));
  }, [townKey]);
  return { ledgers: all, status };
}

/** Due-date, interest and rebate rules for every bill head. `ready` is true once both places they live have answered. */
export function useAllSettings(townKey: string): { settings: Record<HeadId, CollectionSettings>; ready: boolean } {
  const blank = () => Object.fromEntries(HEAD_LIST.map((h) => [h.id, placeholderSettings()])) as Record<HeadId, CollectionSettings>;
  const [s, setS] = useState<Record<HeadId, CollectionSettings>>(blank);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    let pt = placeholderSettings(); let others: Record<string, CollectionSettings> = {};
    const got = { a: false, b: false };
    const push = () => {
      setS({ ...blank(), ...Object.fromEntries(Object.entries(others).map(([h, v]) => [h, { ...placeholderSettings(), ...v, clauses: v.clauses || {} }])), property_tax: pt } as Record<HeadId, CollectionSettings>);
      if (got.a && got.b) setReady(true);
    };
    const u1 = onValue(ref(db, `collectionSettings/${townKey}`), (snap) => {
      const v = snap.val() as CollectionSettings | null;
      pt = v ? { ...placeholderSettings(), ...v, clauses: v.clauses || {} } : placeholderSettings(); got.a = true; push();
    }, () => { got.a = true; push(); });
    const u2 = onValue(ref(db, `headSettings/${townKey}`), (snap) => { others = (snap.val() || {}) as Record<string, CollectionSettings>; got.b = true; push(); }, () => { got.b = true; push(); });
    return () => { u1(); u2(); };
  }, [townKey]);
  return { settings: s, ready };
}

export { rulesApproved, propertyLiability } from './liabilityCalc';
export type { PeriodDue, HeadLiability, PropertyLiability, LedgersByHead } from './liabilityCalc';
