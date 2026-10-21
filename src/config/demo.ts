// DEMO MODE: the app opens with no sign-in and no password.
// Everyone who opens it acts as a platform admin ("*" = all ULBs).
//
// TO TURN PASSWORDS BACK ON LATER:
//   1. set VITE_DEMO_MODE=false in .env (or change DEMO_DEFAULT below), rebuild
//   2. set VITE_DEMO_MODE=false is not enough for Firebase: also redeploy the original rules
//      (copy database.rules.secure.json over database.rules.json, then `firebase deploy --only database`)
//   3. landing/index.html and public/auth-guard.js each have a DEMO_MODE constant at the top: set it to false
const DEMO_DEFAULT = true;

export const DEMO_MODE: boolean =
  (import.meta.env.VITE_DEMO_MODE ?? String(DEMO_DEFAULT)) !== 'false';

export type DemoRole = 'admin' | 'supervisor' | 'surveyor' | 'assessor' | 'cashier' | 'monitor' | 'public';
export interface DemoProfileT { role: DemoRole; ulb: string; head: string | null; }

const KEY = 'demo_profile_v1';
const DEFAULT: DemoProfileT = { role: 'admin', ulb: '*', head: null };

/** Who the demo visitor is. Chosen with the on-screen switcher, or the address ?as=cashier&town=Bhota&head=garbage */
export function getDemoProfile(): DemoProfileT {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('as')) {
      const role = q.get('as') as DemoRole;
      const p = { role, ulb: q.get('town') || (role === 'admin' ? '*' : 'Bhota'), head: q.get('head') };
      localStorage.setItem(KEY, JSON.stringify(p));
      return p;
    }
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved?.role) return { ...DEFAULT, ...saved };
  } catch { /* ignore */ }
  return DEFAULT;
}

export function setDemoProfile(p: DemoProfileT) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
  const u = new URL(location.href); u.searchParams.delete('as'); u.searchParams.delete('town'); u.searchParams.delete('head');
  location.replace(u.toString());
}

export const DEMO_PROFILE = {
  uid: 'demo-user',
  email: 'demo@propertytax.app',
  name: 'Demo user',
};
