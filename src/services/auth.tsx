import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut, User } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from '../firebase';

export type Role = 'surveyor' | 'supervisor' | 'assessor' | 'cashier' | 'admin';
const ROLES: Role[] = ['surveyor', 'supervisor', 'assessor', 'cashier', 'admin'];

/** Who may create/edit survey records in Phase 1. */
export const canWriteSurvey = (r: Role | null) => r === 'surveyor' || r === 'supervisor' || r === 'admin';
/** Who may run assessments (create drafts and submit them for review). */
export const canAssess = (r: Role | null) => r === 'assessor' || r === 'admin';
/** Who may approve or reject submitted assessments. */
export const canApprove = (r: Role | null) => r === 'supervisor' || r === 'admin';
/** Who may change the rate table. */
export const canEditRates = (r: Role | null) => r === 'admin';
/** Who may take payments (create payment entries and receipts). */
export const canCollect = (r: Role | null) => r === 'cashier' || r === 'admin';
/** Who may generate demands, post adjustments and reverse ledger entries (kept apart from taking cash). */
export const canManageLedger = (r: Role | null) => r === 'supervisor' || r === 'admin';
/** Who may read the audit log. */
export const canSeeAudit = (r: Role | null) => r === 'supervisor' || r === 'admin';
/** Who may delete survey records (and release their duplicate keys). */
export const canDeleteSurvey = (r: Role | null) => r === 'supervisor' || r === 'admin';

interface AuthState {
  user: User | null;
  role: Role | null;
  displayName: string;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};

const cacheKey = (uid: string) => `ptax_profile_${uid}`;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) { setRole(null); setDisplayName(''); setLoading(false); return; }
      // cached profile first so the app opens offline
      try {
        const c = JSON.parse(localStorage.getItem(cacheKey(u.uid)) || 'null');
        if (c) { setRole(c.role); setDisplayName(c.name); }
      } catch { /* ignore */ }
      try {
        const snap = await get(ref(db, `users/${u.uid}`));
        const v = snap.val() as { role?: string; name?: string } | null;
        const r = v?.role && (ROLES as string[]).includes(v.role) ? (v.role as Role) : null;
        const name = v?.name || u.displayName || u.email || '';
        setRole(r); setDisplayName(name);
        try { localStorage.setItem(cacheKey(u.uid), JSON.stringify({ role: r, name })); } catch { /* ignore */ }
      } catch {
        if (!localStorage.getItem(cacheKey(u.uid))) { setRole(null); setDisplayName(u.email || ''); }
      }
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);
  const signOut = useCallback(async () => { await fbSignOut(auth); }, []);

  return <Ctx.Provider value={{ user, role, displayName, loading, signIn, signOut }}>{children}</Ctx.Provider>;
};
