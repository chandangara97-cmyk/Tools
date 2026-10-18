// Fixed amount a customer pays, entered by hand for each urban body (town) by that town's admin.
// One amount for Residential properties and one for Commercial. Stored at payableRates/<town>.
import { useEffect, useState } from 'react';
import { ref, set, onValue, push } from 'firebase/database';
import { db } from '../firebase';
import { currentUid } from './assessmentStore';

export interface PayableRates {
  residential: number | null;   // rupees, null = not filled yet
  commercial: number | null;
  updatedAt?: number;
  updatedBy?: string;
}

export const emptyRates = (): PayableRates => ({ residential: null, commercial: null });

export function usePayableRates(townKey: string): { rates: PayableRates; saved: boolean } {
  const [state, setState] = useState({ rates: emptyRates(), saved: false });
  useEffect(() => {
    setState({ rates: emptyRates(), saved: false });
    return onValue(ref(db, `payableRates/${townKey}`), (snap) => {
      const v = snap.val() as Partial<PayableRates> | null;
      setState(v
        ? { rates: { ...emptyRates(), ...v, residential: typeof v.residential === 'number' ? v.residential : null, commercial: typeof v.commercial === 'number' ? v.commercial : null }, saved: true }
        : { rates: emptyRates(), saved: false });
    }, () => { /* no permission or offline: keep empty */ });
  }, [townKey]);
  return state;
}

/** Fixed amount for a property's use. Only Residential and Commercial have one; anything else returns null. */
export function fixedAmountFor(rates: PayableRates, use: string): number | null {
  if (use === 'Residential') return rates.residential;
  if (use === 'Commercial') return rates.commercial;
  return null;
}

export function validateRates(r: { residential: number | null; commercial: number | null }): string | null {
  for (const [label, v] of [['Residential', r.residential], ['Commercial', r.commercial]] as const) {
    if (v === null) continue;
    if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > 100000000) return `${label} amount must be a number from 0 upwards.`;
    if (Math.round(v * 100) !== v * 100) return `${label} amount can have at most 2 decimals (paise).`;
  }
  return null;
}

/** Save the town's fixed amounts and log who changed what. Only the town's admin passes the database rules. */
export async function savePayableRates(townKey: string, r: { residential: number | null; commercial: number | null }, before: PayableRates) {
  const err = validateRates(r);
  if (err) throw new Error(err);
  const body = { residential: r.residential, commercial: r.commercial, updatedAt: Date.now(), updatedBy: currentUid() };
  await set(ref(db, `payableRates/${townKey}`), JSON.parse(JSON.stringify(body)));
  const f = (n: number | null) => (n === null ? 'not set' : `₹${n}`);
  await set(push(ref(db, `audit/${townKey}`)), {
    at: Date.now(), by: currentUid(), action: 'rates',
    detail: `Fixed amounts: Residential ${f(before.residential)} -> ${f(r.residential)}; Commercial ${f(before.commercial)} -> ${f(r.commercial)}`,
  });
}
