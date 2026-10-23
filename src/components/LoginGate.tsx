import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../services/auth';
import { DEMO_MODE } from '../config/demo';

// The ONE sign-in page is the site root (landing/index.html). This gate no longer has its own form:
// anyone who is not signed in is sent there. Deployed base is ".../app/", so the login page is one level up.
const loginPageUrl = (): string | null => {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/app/') ? base.slice(0, -4) : null; // null = local dev server (no landing page)
};


// Demonstration notice. In demo mode there is no sign-in, so anyone opening the app address directly
// first sees this page once per browser session. "?demo=1" (from the front page button) or "?as=..." skips it.
const NOTICE_SEEN = 'demo_notice_seen_v1';
const DemoNoticeGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [seen, setSeen] = useState<boolean>(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('demo') || q.get('as')) {
        sessionStorage.setItem(NOTICE_SEEN, '1');
        return true;
      }
      return sessionStorage.getItem(NOTICE_SEEN) === '1';
    } catch {
      return false;
    }
  });
  if (seen) return <>{children}</>;
  const open = () => {
    try { sessionStorage.setItem(NOTICE_SEEN, '1'); } catch { /* ignore */ }
    setSeen(true);
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-[#0a1020]">
      <div role="status" className="max-w-md w-full rounded-3xl border border-white/10 bg-[#111a2d] p-6 shadow-2xl">
        <span className="inline-block rounded-full border border-[#f2b233]/40 bg-[#f2b233]/15 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-[#ffd98a]">
          Demonstration mode
        </span>
        <h1 className="mt-4 mb-2 text-2xl font-bold text-white">Sign-in is temporarily disabled</h1>
        <p className="mb-3 text-[15px] text-[#d6dcf5]">
          IDs and passwords are switched off while this tool is shown with demo data. No real field data is loaded here.
        </p>
        <p className="mb-3 text-[15px] text-[#d6dcf5]">
          When real field data goes live, every bill head will be password protected, and each urban body will sign in with its own ID.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {['Property tax', 'Water', 'Garbage', 'Sewerage', 'Other bills'].map((h) => (
            <span key={h} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[13px] text-white">{h}</span>
          ))}
        </div>
        <p lang="hi" className="mb-5 border-t border-white/10 pt-3 text-[14px] text-[#c3cdea]">
          लॉगिन अभी अस्थायी रूप से बंद है। डेमो में ID और पासवर्ड बंद हैं। वास्तविक फील्ड डेटा शुरू होने पर सभी हेड (प्रॉपर्टी टैक्स, पानी, कचरा आदि) पासवर्ड से सुरक्षित होंगे।
        </p>
        <button type="button" onClick={open} className="w-full rounded-xl bg-gradient-to-br from-[#4f8cff] to-[#477dff] py-3.5 font-bold text-white">
          Open the demonstration
        </button>
      </div>
    </div>
  );
};

export const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, ulb, loading, deviceBlock, signOut } = useAuth();
  if (DEMO_MODE) return <DemoNoticeGate>{children}</DemoNoticeGate>; // demo: no sign-in page, no password; shows the notice first

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
