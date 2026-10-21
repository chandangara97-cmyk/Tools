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

/** Who the demo visitor is. Change role/ulb to demo a different login (e.g. role 'cashier', ulb 'Bhota'). */
export const DEMO_PROFILE = {
  uid: 'demo-user',
  email: 'demo@propertytax.app',
  name: 'Demo Admin',
  role: 'admin' as const,
  ulb: '*',
};
