// Cloud + Local offline storage for rate tables and assessments (Phase 2).
// Fully offline-first: persists locally, works with zero network, and syncs when online.
import { useEffect, useState } from 'react';
import { ref, set, onValue } from 'firebase/database';
import { auth, db } from '../firebase';
import { placeholderRateTable, RateTable, CalcResult } from './assessment';
import { getCurrentUid } from './auth';
import {
  KEY_RATE_TABLE,
  KEY_ASSESSMENTS,
  getInitialAssessmentsForTown,
  getInitialPropertiesForTown,
} from './offlineData';
import { queueAssessmentSave, queueRateTableSave } from './syncQueue';

export type AssessmentStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface Assessment {
  propertyId: string;
  town: string;          // town key
  ward: string;
  fy: string;            // "2026-27"
  rateTableId: string;   // which rate table version produced this
  rateStatus: 'placeholder' | 'approved';
  status: AssessmentStatus;
  calc: CalcResult;
  assessedBy: string;
  assessedAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNote?: string;
}

const clean = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function getLocalRateTable(townKey: string): RateTable {
  try {
    const raw = localStorage.getItem(KEY_RATE_TABLE(townKey));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return placeholderRateTable(townKey);
}

/** Current rate table for a town. Offline-first: returns local rate table immediately. */
export function useRateTable(townKey: string): { table: RateTable; saved: boolean } {
  const [state, setState] = useState<{ table: RateTable; saved: boolean }>(() => ({
    table: getLocalRateTable(townKey),
    saved: true,
  }));

  useEffect(() => {
    setState({ table: getLocalRateTable(townKey), saved: true });

    const onUpdate = (e: Event) => {
      const ce = e as CustomEvent<{ town: string }>;
      if (!ce.detail || ce.detail.town === townKey) {
        setState({ table: getLocalRateTable(townKey), saved: true });
      }
    };
    window.addEventListener('ptax_ratetable_updated', onUpdate);

    let unsub: (() => void) | undefined;
    try {
      unsub = onValue(
        ref(db, `rateTables/${townKey}`),
        (snap) => {
          const v = snap.val() as RateTable | null;
          if (v) {
            try { localStorage.setItem(KEY_RATE_TABLE(townKey), JSON.stringify(v)); } catch { /* ignore */ }
            setState({ table: v, saved: true });
          }
        },
        () => { /* offline: keep local table */ },
      );
    } catch {
      /* offline */
    }

    return () => {
      window.removeEventListener('ptax_ratetable_updated', onUpdate);
      unsub?.();
    };
  }, [townKey]);

  return state;
}

export function saveRateTable(townKey: string, t: RateTable) {
  const full = { ...t, town: townKey, id: t.effectiveFrom };
  try {
    localStorage.setItem(KEY_RATE_TABLE(townKey), JSON.stringify(full));
    window.dispatchEvent(new CustomEvent('ptax_ratetable_updated', { detail: { town: townKey } }));
  } catch { /* ignore */ }

  const cleanData = clean(full);
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    set(ref(db, `rateTables/${townKey}`), cleanData).catch(() => {
      queueRateTableSave(townKey, cleanData);
    });
  } else {
    queueRateTableSave(townKey, cleanData);
  }
}

function getLocalAssessments(townKey: string, fy: string): Record<string, Assessment> {
  try {
    const raw = localStorage.getItem(KEY_ASSESSMENTS(townKey, fy));
    if (raw) return JSON.parse(raw);
    const props = getInitialPropertiesForTown(townKey, townKey);
    return getInitialAssessmentsForTown(townKey, props);
  } catch {
    return {};
  }
}

export function useAssessments(townKey: string, fy: string): Record<string, Assessment> {
  const [map, setMap] = useState<Record<string, Assessment>>(() => getLocalAssessments(townKey, fy));

  useEffect(() => {
    setMap(getLocalAssessments(townKey, fy));

    const onUpdate = (e: Event) => {
      const ce = e as CustomEvent<{ town: string; fy: string }>;
      if (!ce.detail || (ce.detail.town === townKey && ce.detail.fy === fy)) {
        setMap(getLocalAssessments(townKey, fy));
      }
    };
    window.addEventListener('ptax_assessments_updated', onUpdate);

    let unsub: (() => void) | undefined;
    try {
      unsub = onValue(
        ref(db, `assessments/${townKey}/${fy}`),
        (snap) => {
          const v = snap.val() as Record<string, Assessment> | null;
          if (v && Object.keys(v).length > 0) {
            try { localStorage.setItem(KEY_ASSESSMENTS(townKey, fy), JSON.stringify(v)); } catch { /* ignore */ }
            setMap(v);
          }
        },
        () => { /* offline */ },
      );
    } catch {
      /* offline */
    }

    return () => {
      window.removeEventListener('ptax_assessments_updated', onUpdate);
      unsub?.();
    };
  }, [townKey, fy]);

  return map;
}

export function saveAssessment(a: Assessment) {
  try {
    const current = getLocalAssessments(a.town, a.fy);
    current[a.propertyId] = a;
    localStorage.setItem(KEY_ASSESSMENTS(a.town, a.fy), JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('ptax_assessments_updated', { detail: { town: a.town, fy: a.fy } }));
  } catch { /* ignore */ }

  const cleanData = clean(a);
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    set(ref(db, `assessments/${a.town}/${a.fy}/${a.propertyId}`), cleanData).catch(() => {
      queueAssessmentSave(cleanData);
    });
  } else {
    queueAssessmentSave(cleanData);
  }
}

export const currentUid = () => getCurrentUid();
