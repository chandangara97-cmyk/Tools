// Fixed amount a customer pays, entered by hand for each urban body (town) and each bill head by that town's admin.
// One amount for Residential properties and one for Commercial. Stored at payableRates/<town>/<head>.
import { useEffect, useState } from 'react';
import { ref, set, onValue, push } from 'firebase/database';
import { db } from '../firebase';
import { currentUid } from './assessmentStore';
import { HeadId, headLabel } from './heads';

export interface PayableRates {
  residential: number | null;   // rupees, null = not filled yet
  commercial: number | null;
  /** 'monthly': the amounts are charged every month. Anything else: once a year. Only water, garbage, sewerage and other bills can be monthly. */
  frequency?: 'yearly' | 'monthly';
  updatedAt?: number;
  updatedBy?: string;
}
export const emptyRates = (): PayableRates => ({ residential: null, commercial: null, frequency: 'yearly' });

/** Is this bill head charged month by month? Property tax is always yearly. */
export const isMonthly = (head: HeadId, rates: PayableRates | undefined) => head !== 'property_tax' && rates?.frequency === 'monthly';

/** All heads' fixed amounts for a town: head -> rates. */
export function usePayableRates(townKey: string): Record<string, PayableRates> {
  const [map, setMap] = useState<Record<string, PayableRates>>({});
  useEffect(() => {
    setMap({});
    return onValue(ref(db, `payableRates/${townKey}`), (snap) => {
      const raw = (snap.val() || {}) as Record<string, Partial<PayableRates>>;
      const out: Record<string, PayableRates> = {};
      for (const [h, v] of Object.entries(raw)) {
        if (!v || typeof v !== 'object') continue;
        out[h] = { ...emptyRates(), ...v, residential: typeof v.residential === 'number' ? v.residential : null, commercial: typeof v.commercial === 'number' ? v.commercial : null, frequency: v.frequency === 'monthly' ? 'monthly' : 'yearly' };
      }
      setMap(out);
    }, () => { /* no permission or offline: keep empty */ });
  }, [townKey]);
  return map;
}

/** Which fixed amount a property's use belongs to. Tolerant of case, spaces and common spellings ("residential ", "RESIDENTIAL", "Residence"). Anything else (Mixed use, Institutional, Vacant land...) has no fixed amount. */
export type FixedClass = 'residential' | 'commercial';
export function fixedClassOf(use: string | null | undefined): FixedClass | null {
  const u = String(use ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!u) return null;
  if (u === 'commercial' || u === 'comm' || u === 'shop' || u === 'business') return 'commercial';
  if (u === 'residential' || u === 'residence' || u === 'res' || u === 'domestic' || u === 'house') return 'residential';
  return null;
}

/** Fixed amount for a property's use. Only Residential and Commercial have one; anything else returns null. */
export function fixedAmountFor(rates: PayableRates | undefined, use: string): number | null {
  if (!rates) return null;
  const c = fixedClassOf(use);
  return c === 'residential' ? rates.residential : c === 'commercial' ? rates.commercial : null;
}

export function validateRates(r: { residential: number | null; commercial: number | null }): string | null {
  for (const [label, v] of [['Residential', r.residential], ['Commercial', r.commercial]] as const) {
    if (v === null) continue;
    if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > 100000000) return `${label} amount must be a number from 0 upwards.`;
    if (Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) return `${label} amount can have at most 2 decimals (paise).`;
  }
  return null;
}

/** Save one head's fixed amounts and log who changed what. Only the town's admin passes the database rules. */
export async function savePayableRates(townKey: string, head: HeadId, r: { residential: number | null; commercial: number | null; frequency?: 'yearly' | 'monthly' }, before: PayableRates | undefined) {
  const err = validateRates(r);
  if (err) throw new Error(err);
  const freq = head !== 'property_tax' && r.frequency === 'monthly' ? 'monthly' : 'yearly';
  const body = { residential: r.residential, commercial: r.commercial, frequency: freq, updatedAt: Date.now(), updatedBy: currentUid() };
  await set(ref(db, `payableRates/${townKey}/${head}`), JSON.parse(JSON.stringify(body)));
  const f = (n: number | null | undefined) => (n === null || n === undefined ? 'not set' : `₹${n}`);
  await set(push(ref(db, `audit/${townKey}`)), {
    at: Date.now(), by: currentUid(), action: 'rates',
    detail: `${headLabel(head)} fixed amounts (${freq}): Residential ${f(before?.residential)} -> ${f(r.residential)}; Commercial ${f(before?.commercial)} -> ${f(r.commercial)}`,
  });
}
