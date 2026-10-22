// Cloud storage for rate tables and assessments (Phase 2). Online only: these are office tasks.
import { useEffect, useState } from 'react';
import { ref, set, onValue } from 'firebase/database';
import { auth, db } from '../firebase';
import { placeholderRateTable, RateTable, CalcResult } from './assessment';
import { getCurrentUid } from './auth';

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

/** Current rate table for a town; falls back to the placeholder until an admin saves one. */
export function useRateTable(townKey: string): { table: RateTable; saved: boolean } {
  const [state, setState] = useState<{ table: RateTable; saved: boolean }>({ table: placeholderRateTable(townKey), saved: false });
  useEffect(() => {
    setState({ table: placeholderRateTable(townKey), saved: false });
    return onValue(ref(db, `rateTables/${townKey}`), (snap) => {
      const v = snap.val() as RateTable | null;
      setState(v ? { table: v, saved: true } : { table: placeholderRateTable(townKey), saved: false });
    }, () => { /* no permission or offline: keep placeholder */ });
  }, [townKey]);
  return state;
}

export function saveRateTable(townKey: string, t: RateTable) {
  return set(ref(db, `rateTables/${townKey}`), clean({ ...t, town: townKey, id: t.effectiveFrom }));
}

export function useAssessments(townKey: string, fy: string): Record<string, Assessment> {
  const [map, setMap] = useState<Record<string, Assessment>>({});
  useEffect(() => {
    setMap({});
    return onValue(ref(db, `assessments/${townKey}/${fy}`), (snap) => {
      setMap((snap.val() as Record<string, Assessment>) || {});
    }, () => { /* ignore */ });
  }, [townKey, fy]);
  return map;
}

export function saveAssessment(a: Assessment) {
  return set(ref(db, `assessments/${a.town}/${a.fy}/${a.propertyId}`), clean(a));
}

export const currentUid = () => getCurrentUid();
