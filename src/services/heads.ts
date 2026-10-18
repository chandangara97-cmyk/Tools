// Bill heads (utility bills). Property tax keeps its original database keys; every other head is stored
// beside it with a "<head>~" prefix on the property key, e.g. ledger/Bhota/water~0206001-01-0001.
import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';

export type HeadId = 'property_tax' | 'water' | 'garbage' | 'sewerage' | 'electricity' | 'other';
export const HEAD_LIST: { id: HeadId; label: string; short: string }[] = [
  { id: 'property_tax', label: 'Property tax', short: 'PT' },
  { id: 'water', label: 'Water', short: 'WTR' },
  { id: 'garbage', label: 'Garbage', short: 'GAR' },
  { id: 'sewerage', label: 'Sewerage', short: 'SWR' },
  { id: 'electricity', label: 'Electricity', short: 'ELC' },
  { id: 'other', label: 'Other utilities', short: 'OTH' },
];
export const headLabel = (h: HeadId) => HEAD_LIST.find((x) => x.id === h)?.label || h;
export const headShort = (h: HeadId) => HEAD_LIST.find((x) => x.id === h)?.short || h;

/** Database key under ledger/<town>/ for a property in a head. */
export const ledgerKey = (head: HeadId, pid: string) => (head === 'property_tax' ? pid : `${head}~${pid}`);
/** Inverse of ledgerKey: which head and property a ledger key belongs to. */
export function splitLedgerKey(key: string): { head: HeadId; pid: string } {
  const i = key.indexOf('~');
  if (i < 0) return { head: 'property_tax', pid: key };
  return { head: key.slice(0, i) as HeadId, pid: key.slice(i + 1) };
}

/** Heads switched on for this ULB (ulbs/<town>/heads). If none are recorded, all heads are offered. */
export function useTownHeads(townKey: string): HeadId[] {
  const [heads, setHeads] = useState<HeadId[]>(HEAD_LIST.map((h) => h.id));
  useEffect(() => {
    return onValue(ref(db, `ulbs/${townKey}/heads`), (snap) => {
      const v = (snap.val() || {}) as Record<string, string>;
      const on = HEAD_LIST.map((h) => h.id).filter((id) => id in v);
      setHeads(on.length ? (on.includes('property_tax') ? on : ['property_tax', ...on]) : HEAD_LIST.map((h) => h.id));
    }, () => { /* keep default */ });
  }, [townKey]);
  return heads;
}
