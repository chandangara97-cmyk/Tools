// Everything one property or one owner owes, across every bill head, as on today.
import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { HeadId, HEAD_LIST, splitLedgerKey } from './heads';
import { LedgerEntry, CollectionSettings, placeholderSettings } from './collection';
import type { LedgersByHead } from './liabilityCalc';

import {
  KEY_RAW_LEDGER,
  KEY_SETTINGS,
  KEY_HEAD_SETTINGS,
  getInitialLedgerForTown,
  getInitialPropertiesForTown,
} from './offlineData';

const emptyLedgers = (): LedgersByHead => ({ property_tax: {}, water: {}, garbage: {}, sewerage: {}, other: {} });

export type LoadState = 'loading' | 'ready' | 'error';

function parseRawLedger(raw: Record<string, Record<string, Omit<LedgerEntry, 'id'>>>): LedgersByHead {
  const out = emptyLedgers();
  for (const [key, es] of Object.entries(raw || {})) {
    const k = splitLedgerKey(key);
    if (!out[k.head] || !es || typeof es !== 'object') continue;
    out[k.head][k.pid] = Object.entries(es).map(([id, e]) => ({ ...e, id }));
  }
  return out;
}

export function loadLocalLedgers(townKey: string): LedgersByHead {
  try {
    let rawStr = localStorage.getItem(KEY_RAW_LEDGER(townKey));
    if (!rawStr) {
      const props = getInitialPropertiesForTown(townKey, townKey);
      const seeded = getInitialLedgerForTown(townKey, props);
      return parseRawLedger(seeded);
    }
    return parseRawLedger(JSON.parse(rawStr));
  } catch {
    return emptyLedgers();
  }
}

/** Every ledger of the town, grouped by bill head. Offline-first: loads immediately from local database. */
export function useAllLedgers(townKey: string): { ledgers: LedgersByHead; status: LoadState } {
  const [all, setAll] = useState<LedgersByHead>(() => loadLocalLedgers(townKey));
  const [status, setStatus] = useState<LoadState>('ready');

  useEffect(() => {
    // Immediate local load
    setAll(loadLocalLedgers(townKey));
    setStatus('ready');

    const onUpdate = (e: Event) => {
      const ce = e as CustomEvent<{ town: string }>;
      if (!ce.detail || ce.detail.town === townKey) {
        setAll(loadLocalLedgers(townKey));
      }
    };
    window.addEventListener('ptax_ledger_updated', onUpdate);

    let unsub: (() => void) | undefined;
    try {
      unsub = onValue(
        ref(db, `ledger/${townKey}`),
        (snap) => {
          const raw = (snap.val() || {}) as Record<string, Record<string, Omit<LedgerEntry, 'id'>>>;
          if (raw && Object.keys(raw).length > 0) {
            try {
              localStorage.setItem(KEY_RAW_LEDGER(townKey), JSON.stringify(raw));
            } catch { /* ignore */ }
            setAll(parseRawLedger(raw));
            setStatus('ready');
          }
        },
        () => {
          // Keep local data on error or offline
          setStatus('ready');
        },
      );
    } catch {
      // Offline environment
      setStatus('ready');
    }

    return () => {
      window.removeEventListener('ptax_ledger_updated', onUpdate);
      unsub?.();
    };
  }, [townKey]);

  return { ledgers: all, status };
}

function loadLocalSettings(townKey: string): Record<HeadId, CollectionSettings> {
  const blank = () => Object.fromEntries(HEAD_LIST.map((h) => [h.id, { ...placeholderSettings(), status: 'approved' }])) as Record<HeadId, CollectionSettings>;
  try {
    const ptRaw = localStorage.getItem(KEY_SETTINGS(townKey));
    const pt = ptRaw ? JSON.parse(ptRaw) : { ...placeholderSettings(), status: 'approved' };
    const res = blank();
    res.property_tax = pt;
    for (const h of HEAD_LIST) {
      if (h.id === 'property_tax') continue;
      const hRaw = localStorage.getItem(KEY_HEAD_SETTINGS(townKey, h.id));
      if (hRaw) {
        res[h.id] = JSON.parse(hRaw);
      }
    }
    return res;
  } catch {
    return blank();
  }
}

/** Due-date, interest and rebate rules for every bill head. Offline-first: ready immediately. */
export function useAllSettings(townKey: string): { settings: Record<HeadId, CollectionSettings>; ready: boolean } {
  const [s, setS] = useState<Record<HeadId, CollectionSettings>>(() => loadLocalSettings(townKey));
  const [ready, setReady] = useState(true);

  useEffect(() => {
    setS(loadLocalSettings(townKey));
    setReady(true);

    const onUpdate = (e: Event) => {
      const ce = e as CustomEvent<{ town: string }>;
      if (!ce.detail || ce.detail.town === townKey) {
        setS(loadLocalSettings(townKey));
      }
    };
    window.addEventListener('ptax_settings_updated', onUpdate);

    let pt = s.property_tax || placeholderSettings();
    let others: Record<string, CollectionSettings> = {};
    const push = () => {
      const merged = {
        ...loadLocalSettings(townKey),
        ...Object.fromEntries(Object.entries(others).map(([h, v]) => [h, { ...placeholderSettings(), ...v, clauses: v.clauses || {} }])),
        property_tax: pt,
      } as Record<HeadId, CollectionSettings>;
      setS(merged);
      setReady(true);
    };

    let u1: (() => void) | undefined;
    let u2: (() => void) | undefined;
    try {
      u1 = onValue(ref(db, `collectionSettings/${townKey}`), (snap) => {
        const v = snap.val() as CollectionSettings | null;
        if (v) {
          pt = { ...placeholderSettings(), ...v, clauses: v.clauses || {} };
          try { localStorage.setItem(KEY_SETTINGS(townKey), JSON.stringify(pt)); } catch { /* ignore */ }
          push();
        }
      }, () => { /* offline: ignore */ });

      u2 = onValue(ref(db, `headSettings/${townKey}`), (snap) => {
        const v = (snap.val() || {}) as Record<string, CollectionSettings>;
        if (v && Object.keys(v).length > 0) {
          others = v;
          push();
        }
      }, () => { /* offline: ignore */ });
    } catch {
      /* offline */
    }

    return () => {
      window.removeEventListener('ptax_settings_updated', onUpdate);
      u1?.();
      u2?.();
    };
  }, [townKey]);

  return { settings: s, ready };
}

export { rulesApproved, propertyLiability } from './liabilityCalc';
export type { PeriodDue, UnitDue, HeadLiability, PropertyLiability, LedgersByHead } from './liabilityCalc';
