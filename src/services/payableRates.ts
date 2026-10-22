// Fixed amount a customer pays, entered by hand for each urban body (town) and each bill head by that town's admin.
// One amount for Residential properties and one for Commercial.
// Offline-first: loads immediately from local storage and syncs when online.
import { useEffect, useState } from 'react';
import { ref, set, onValue, push } from 'firebase/database';
import { db } from '../firebase';
import { currentUid } from './assessmentStore';
import { HeadId, headLabel } from './heads';
import { KEY_PAYABLE_RATES, defaultPayableRates } from './offlineData';
import { queuePayableRatesSave } from './syncQueue';

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

function getLocalPayableRates(townKey: string): Record<string, PayableRates> {
  try {
    const raw = localStorage.getItem(KEY_PAYABLE_RATES(townKey));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return defaultPayableRates;
}

/** All heads' fixed amounts for a town: head -> rates. Offline-first: returns local data immediately. */
export function usePayableRates(townKey: string): Record<string, PayableRates> {
  const [map, setMap] = useState<Record<string, PayableRates>>(() => getLocalPayableRates(townKey));

  useEffect(() => {
    setMap(getLocalPayableRates(townKey));

    const onUpdate = (e: Event) => {
      const ce = e as CustomEvent<{ town: string }>;
      if (!ce.detail || ce.detail.town === townKey) {
        setMap(getLocalPayableRates(townKey));
      }
    };
    window.addEventListener('ptax_payablerates_updated', onUpdate);

    let unsub: (() => void) | undefined;
    try {
      unsub = onValue(
        ref(db, `payableRates/${townKey}`),
        (snap) => {
          const raw = (snap.val() || {}) as Record<string, Partial<PayableRates>>;
          if (raw && Object.keys(raw).length > 0) {
            const out: Record<string, PayableRates> = {};
            for (const [h, v] of Object.entries(raw)) {
              if (!v || typeof v !== 'object') continue;
              out[h] = {
                ...emptyRates(),
                ...v,
                residential: typeof v.residential === 'number' ? v.residential : null,
                commercial: typeof v.commercial === 'number' ? v.commercial : null,
                frequency: v.frequency === 'monthly' ? 'monthly' : 'yearly',
              };
            }
            try { localStorage.setItem(KEY_PAYABLE_RATES(townKey), JSON.stringify(out)); } catch { /* ignore */ }
            setMap(out);
          }
        },
        () => { /* offline */ },
      );
    } catch {
      /* offline */
    }

    return () => {
      window.removeEventListener('ptax_payablerates_updated', onUpdate);
      unsub?.();
    };
  }, [townKey]);

  return map;
}

/** Fixed amount for a property's use. Only Residential and Commercial have one; anything else returns null. */
export function fixedAmountFor(rates: PayableRates | undefined, use: string): number | null {
  if (!rates) return null;
  if (use === 'Residential') return rates.residential;
  if (use === 'Commercial') return rates.commercial;
  return null;
}

export function validateRates(r: { residential: number | null; commercial: number | null }): string | null {
  for (const [label, v] of [['Residential', r.residential], ['Commercial', r.commercial]] as const) {
    if (v === null) continue;
    if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > 100000000) return `${label} amount must be a number from 0 upwards.`;
    if (Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) return `${label} amount can have at most 2 decimals (paise).`;
  }
  return null;
}

/** Save one head's fixed amounts and log who changed what. Offline-first: saves locally and queues for sync. */
export async function savePayableRates(
  townKey: string,
  head: HeadId,
  r: { residential: number | null; commercial: number | null; frequency?: 'yearly' | 'monthly' },
  before: PayableRates | undefined,
) {
  const err = validateRates(r);
  const freq: 'yearly' | 'monthly' = head !== 'property_tax' && r.frequency === 'monthly' ? 'monthly' : 'yearly';
  const body: PayableRates = { residential: r.residential, commercial: r.commercial, frequency: freq, updatedAt: Date.now(), updatedBy: currentUid() };

  // Save to local storage
  const current = getLocalPayableRates(townKey);
  current[head] = body;
  try {
    localStorage.setItem(KEY_PAYABLE_RATES(townKey), JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('ptax_payablerates_updated', { detail: { town: townKey } }));
  } catch { /* ignore */ }

  const cleanBody = JSON.parse(JSON.stringify(body));

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    set(ref(db, `payableRates/${townKey}/${head}`), cleanBody).catch(() => {
      queuePayableRatesSave(townKey, head, cleanBody);
    });
    const f = (n: number | null | undefined) => (n === null || n === undefined ? 'not set' : `₹${n}`);
    set(push(ref(db, `audit/${townKey}`)), {
      at: Date.now(), by: currentUid(), action: 'rates',
      detail: `${headLabel(head)} fixed amounts (${freq}): Residential ${f(before?.residential)} -> ${f(r.residential)}; Commercial ${f(before?.commercial)} -> ${f(r.commercial)}`,
    }).catch(() => {});
  } else {
    queuePayableRatesSave(townKey, head, cleanBody);
  }
}
