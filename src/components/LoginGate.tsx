import React, { useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../services/auth';
import { DEMO_MODE } from '../config/demo';

// The ONE sign-in page is the site root (landing/index.html). This gate no longer has its own form:
// anyone who is not signed in is sent there. Deployed base is ".../app/", so the login page is one level up.
const loginPageUrl = (): string | null => {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/app/') ? base.slice(0, -4) : null; // null = local dev server (no landing page)
};

export const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, ulb, loading, deviceBlock, signOut } = useAuth();
  if (DEMO_MODE) return <>{children}</>; // demo: no sign-in page, no password

  useEffect(() => {
    if (loading || user) return;
    const url = loginPageUrl();
    if (url) window.location.replace(url);
  }, [loading, user]);

  if (loading) {
    return <div className="p-10 text-center text-sm text-[#aab4dc]">Checking sign-in…</div>;
  }

  if (!user) {
    return (
      <div className="p-10 text-center text-sm text-[#aab4dc]">
        {loginPageUrl()
          ? 'Taking you to the sign-in page…'
          : 'Local dev: sign in on the landing page (landing/index.html), then reload.'}
      </div>
    );
  }

  if (deviceBlock) {
    return (
      <div className="max-w-sm mx-auto mt-16 bg-[#181f3d] border border-red-400/40 rounded-xl p-6 text-center">
        <p className="text-sm text-red-200 font-semibold mb-2">Cannot open on this phone</p>
        <p className="text-xs text-[#aab4dc] mb-4">{deviceBlock}</p>
        <button type="button" onClick={() => void signOut()} className="text-xs font-bold text-[#9aa8ff] inline-flex items-center gap-1">
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </div>
    );
  }

  if (!role || !ulb) {
    return (
      <div className="max-w-sm mx-auto mt-16 bg-[#181f3d] border border-[#f2b233]/40 rounded-xl p-6 text-center">
        <p className="text-sm text-[#ffe3a3] font-semibold mb-2">Signed in as {user.email?.split('@')[0]}</p>
        <p className="text-xs text-[#aab4dc] mb-4">This ID is not linked to a ULB or has no role yet. Ask the administrator to assign both.</p>
        <button type="button" onClick={() => void signOut()} className="text-xs font-bold text-[#9aa8ff] inline-flex items-center gap-1">
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </div>
    );
  }
  return <>{children}</>;
};
