import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut, User } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from '../firebase';

/** surveyor = data collector, monitor = read-only view of the whole ULB. */
export type Role = 'surveyor' | 'supervisor' | 'assessor' | 'cashier' | 'admin' | 'monitor';
const ROLES: Role[] = ['surveyor', 'supervisor', 'assessor', 'cashier', 'admin', 'monitor'];

/** Every login belongs to ONE ULB (its town slug, e.g. "Bhota"). "*" = platform owner, sees all ULBs. */
export const ALL_ULBS = '*';
const LOGIN_DOMAIN = 'propertytax.app';

/** A User ID like RAJESH01 is stored in Firebase Auth as rajesh01@propertytax.app. */
export const toLoginEmail = (v: string) => {
  const t = v.trim().toLowerCase();
  return t.includes('@') ? t : `${t}@${LOGIN_DOMAIN}`;
};

/** Who may create/edit survey records in Phase 1. */
export const canWriteSurvey = (r: Role | null) => r === 'surveyor' || r === 'supervisor' || r === 'admin';
/** Who may run assessments (create drafts and submit them for review). */
export const canAssess = (r: Role | null) => r === 'assessor' || r === 'admin';
/** Who may approve or reject submitted assessments. */
export const canApprove = (r: Role | null) => r === 'supervisor' || r === 'admin';
/** Who may change the rate table. */
export const canEditRates = (r: Role | null) => r === 'admin';
/** Who may fill the town's fixed payable amounts (Residential / Commercial). Admin only; the database rules also tie it to the admin's own town. */
export const canSetPayableRates = (r: Role | null) => r === 'admin';
/** Who may take payments (create payment entries and receipts). */
export const canCollect = (r: Role | null) => r === 'cashier' || r === 'admin';
/** Who may generate demands, post adjustments and reverse ledger entries (kept apart from taking cash). */
export const canManageLedger = (r: Role | null) => r === 'supervisor' || r === 'admin';
/** Who may read the audit log. */
export const canSeeAudit = (r: Role | null) => r === 'supervisor' || r === 'admin' || r === 'monitor';
/** Who may delete survey records (and release their duplicate keys). */
export const canDeleteSurvey = (r: Role | null) => r === 'supervisor' || r === 'admin';

interface AuthState {
  user: User | null;
  role: Role | null;
  /** The ULB this login belongs to (town slug), "*" for the platform owner, null if none assigned. */
  ulb: string | null;
  isSuper: boolean;
  displayName: string;
  loading: boolean;
  /** Set when this phone still holds unsent work of another ULB. */
  deviceBlock: string;
  signIn: (userIdOrEmail: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};

const cacheKey = (uid: string) => `ptax_profile_${uid}`;
const DEVICE_ULB_KEY = 'ptax_device_ulb';
const QUEUE_KEY = 'ptax_queue_v1';

/**
 * One phone may be used by different ULBs. Local copies of survey data must never leak from one ULB
 * to the next. If the previous ULB has unsent work, block; otherwise wipe the local copies.
 * Returns an error message when blocked, else ''.
 */
function guardDevice(ulb: string | null): string {
  if (!ulb || ulb === ALL_ULBS) return '';
  try {
    const prev = localStorage.getItem(DEVICE_ULB_KEY);
    if (prev && prev !== ulb) {
      const pending = (JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') as unknown[]).length;
      if (pending > 0) {
        return `This phone still has ${pending} unsent change(s) from another ULB (${prev}). Sign in with that ULB's ID, let it sync, then try again.`;
      }
      localStorage.removeItem('gis_survey_properties_v2');
      localStorage.removeItem('gis_survey_custom_towns');
    }
    localStorage.setItem(DEVICE_ULB_KEY, ulb);
  } catch { /* storage blocked */ }
  return '';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [ulb, setUlb] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [deviceBlock, setDeviceBlock] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apply = (r: Role | null, u: string | null, name: string): boolean => {
      const block = guardDevice(u);
      setDeviceBlock(block);
      if (block) { setRole(null); setUlb(null); setDisplayName(name); return false; }
      setRole(r); setUlb(u); setDisplayName(name);
      return true;
    };
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) { setRole(null); setUlb(null); setDisplayName(''); setDeviceBlock(''); setLoading(false); return; }
      // cached profile first so the app opens offline
      try {
        const c = JSON.parse(localStorage.getItem(cacheKey(u.uid)) || 'null');
        if (c) apply(c.role, c.ulb ?? null, c.name);
      } catch { /* ignore */ }
      try {
        const snap = await get(ref(db, `users/${u.uid}`));
        const v = snap.val() as { role?: string; name?: string; ulb?: string } | null;
        const r = v?.role && (ROLES as string[]).includes(v.role) ? (v.role as Role) : null;
        const town = v?.ulb && typeof v.ulb === 'string' ? v.ulb : null;
        const name = v?.name || u.displayName || u.email || '';
        // a login without a ULB gets no access at all
        apply(town ? r : null, town, name);
        try { localStorage.setItem(cacheKey(u.uid), JSON.stringify({ role: town ? r : null, ulb: town, name })); } catch { /* ignore */ }
      } catch {
        if (!localStorage.getItem(cacheKey(u.uid))) { setRole(null); setUlb(null); setDisplayName(u.email || ''); }
      }
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async (userIdOrEmail: string, password: string) => {
    await signInWithEmailAndPassword(auth, toLoginEmail(userIdOrEmail), password);
  }, []);
  const signOut = useCallback(async () => { await fbSignOut(auth); }, []);

  const isSuper = ulb === ALL_ULBS;
  return <Ctx.Provider value={{ user, role, ulb, isSuper, displayName, loading, deviceBlock, signIn, signOut }}>{children}</Ctx.Provider>;
};
