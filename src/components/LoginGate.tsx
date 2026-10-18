import React, { useState } from 'react';
import { Eye, EyeOff, Lock, LogOut } from 'lucide-react';
import { useAuth } from '../services/auth';

export const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, ulb, loading, deviceBlock, signIn, signOut } = useAuth();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  React.useEffect(() => { try { const v = localStorage.getItem('hub_id'); if (v) setUserId(v); } catch { /* ignore */ } }, []);

  if (loading) {
    return <div className="p-10 text-center text-sm text-[#9fc7c1]">Checking sign-in…</div>;
  }

  if (!user) {
    const submit = async () => {
      setErr(''); setBusy(true);
      try {
        await signIn(userId, password);
        try { if (remember) localStorage.setItem('hub_id', userId.trim()); else localStorage.removeItem('hub_id'); } catch { /* ignore */ }
      } catch (e) {
        const code = (e as { code?: string }).code || '';
        setErr(code.includes('network') ? 'No internet. First sign-in needs a connection.'
          : code.includes('too-many') ? 'Too many attempts. Please wait a few minutes.' : 'Wrong Town ID or password.');
      } finally { setBusy(false); }
    };
    const field = 'w-full h-14 pt-5 pb-1 px-4 rounded-2xl border border-white/15 bg-white/5 text-white text-base outline-none focus:border-[#2dd4bf] focus:ring-4 focus:ring-[#2dd4bf]/15';
    const lab = 'absolute left-4 top-1 text-[11px] text-[#2dd4bf] pointer-events-none';
    return (
      <div className="fixed inset-0 overflow-auto text-[#eaf5f3]" style={{ background: '#0b2e33' }}>
        <svg className="fixed inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <defs>
            <linearGradient id="lgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#071f2b" /><stop offset=".45" stopColor="#14545a" /><stop offset=".72" stopColor="#d9946a" /><stop offset="1" stopColor="#f4c58a" /></linearGradient>
            <radialGradient id="lgSun" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff2cf" /><stop offset=".25" stopColor="#ffd08a" stopOpacity=".8" /><stop offset="1" stopColor="#ffb070" stopOpacity="0" /></radialGradient>
            <linearGradient id="lgM1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fb7c4" /><stop offset="1" stopColor="#3f7a86" /></linearGradient>
            <linearGradient id="lgM2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f6f73" /><stop offset="1" stopColor="#14444a" /></linearGradient>
            <linearGradient id="lgM3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#14403f" /><stop offset="1" stopColor="#082524" /></linearGradient>
            <path id="lgPine" d="M0-34l9 15h-5l8 13h-6l9 14H-15l9-14h-6l8-13h-5z" />
          </defs>
          <rect width="1200" height="800" fill="url(#lgSky)" />
          <circle cx="880" cy="470" r="230" fill="url(#lgSun)" />
          <path d="M0 520l110-130 80 70 120-170 100 150 90-80 140 200 120-120 110 90 150-170 180 190v240H0z" fill="url(#lgM1)" opacity=".85" />
          <path d="M300 290l-50 80 40-20 25 30 20-40 30 25z M690 330l-40 60 35-15 25 25 20-35z M1020 350l-35 55 30-10 25 20 15-30z" fill="#eaf6f8" opacity=".9" />
          <path d="M0 600l140-110 110 80 150-130 140 120 130-90 150 130 120-80 140 90 120-60v320H0z" fill="url(#lgM2)" />
          <path d="M0 690l160-80 120 50 170-90 150 80 160-60 140 70 140-50 160 60v220H0z" fill="url(#lgM3)" />
          <g fill="#06201f"><use href="#lgPine" x="60" y="760" /><use href="#lgPine" x="215" y="750" /><use href="#lgPine" x="900" y="765" /><use href="#lgPine" x="1060" y="772" /><use href="#lgPine" x="1140" y="755" /><use href="#lgPine" x="330" y="785" /></g>
          <rect y="780" width="1200" height="20" fill="#051a19" />
        </svg>
        <div className="relative min-h-full flex flex-col items-center justify-center px-5 py-8">
          <div className="w-full max-w-[400px]">
            <div className="text-center mb-5">
              <div className="mx-auto mb-3 w-14 h-14 rounded-2xl grid place-items-center" style={{ background: 'linear-gradient(145deg,#2dd4bf,#0e8a7d)', boxShadow: '0 10px 30px rgba(45,212,191,.35)' }}>
                <Lock className="w-7 h-7 text-[#04201c]" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Scheme Hub 2026</h1>
              <p className="text-sm text-[#cfe6e2] mt-1">Property survey &amp; collection · Himachal Pradesh</p>
            </div>
            <div className="rounded-3xl border border-white/15 p-5" style={{ background: 'rgba(6,30,32,.68)', backdropFilter: 'blur(20px)', boxShadow: '0 30px 70px rgba(0,0,0,.45)' }}>
              <h2 className="text-xs font-bold text-[#2dd4bf] uppercase tracking-widest mb-4">Town sign-in</h2>
              <div className="relative mb-3">
                <label className={lab} htmlFor="gate-id">Town ID (e.g. BHOTA_SUP_PT)</label>
                <input id="gate-id" type="text" autoComplete="username" autoCapitalize="characters" spellCheck={false} value={userId} onChange={(e) => setUserId(e.target.value)} className={field} />
              </div>
              <div className="relative mb-3">
                <label className={lab} htmlFor="gate-pw">Password</label>
                <input id="gate-pw" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} className={field} />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label="Show password" className="absolute right-2 top-2 w-10 h-10 grid place-items-center text-[#9bbdb7]">
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#9bbdb7] mb-3">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 accent-[#2dd4bf]" /> Remember my ID on this device
              </label>
              {err && <p className="text-sm text-[#ffb4a8] text-center mb-3">{err}</p>}
              <button type="button" onClick={() => void submit()} disabled={busy || !userId || !password}
                className="w-full h-14 rounded-2xl text-base font-bold text-[#04201c] disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#5eead4,#2dd4bf)', boxShadow: '0 10px 26px rgba(45,212,191,.3)' }}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
              <a href={`${import.meta.env.BASE_URL}admin_users.html`} className="block text-center text-sm font-semibold text-[#f4c58a] mt-4">Admin login →</a>
            </div>
            <p className="text-center text-xs text-[#9bbdb7] mt-4">Accounts are created by the administrator. Independent field survey workspace, not affiliated with any government body.</p>
          </div>
        </div>
      </div>
    );
  }

  if (deviceBlock) {
    return (
      <div className="max-w-sm mx-auto mt-16 bg-[#0f242d] border border-red-400/40 rounded-xl p-6 text-center">
        <p className="text-sm text-red-200 font-semibold mb-2">Cannot open on this phone</p>
        <p className="text-xs text-[#9fc7c1] mb-4">{deviceBlock}</p>
        <button type="button" onClick={() => void signOut()} className="text-xs font-bold text-[#20b5a6] inline-flex items-center gap-1">
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </div>
    );
  }

  if (!role || !ulb) {
    return (
      <div className="max-w-sm mx-auto mt-16 bg-[#0f242d] border border-[#d6a34b]/40 rounded-xl p-6 text-center">
        <p className="text-sm text-[#f7dfae] font-semibold mb-2">Signed in as {user.email?.split('@')[0]}</p>
        <p className="text-xs text-[#9fc7c1] mb-4">This ID is not linked to a ULB or has no role yet. Ask the administrator to assign both.</p>
        <button type="button" onClick={() => void signOut()} className="text-xs font-bold text-[#20b5a6] inline-flex items-center gap-1">
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </div>
    );
  }
  return <>{children}</>;
};
