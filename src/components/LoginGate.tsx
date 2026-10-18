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
    return <div className="p-10 text-center text-sm text-[#aab4dc]">Checking sign-in…</div>;
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
          : code.includes('too-many') ? 'Too many attempts. Please wait a few minutes.' : 'Wrong User ID or password.');
      } finally { setBusy(false); }
    };
    const field = 'w-full h-14 pt-5 pb-1 px-4 rounded-2xl border border-white/15 bg-white/[0.06] text-white text-base outline-none focus:border-[#e8b84a]/50 focus:ring-4 focus:ring-[#e8b84a]/12 transition-all';
    const lab = 'absolute left-4 top-1 text-[11px] text-[#f7df9a] pointer-events-none font-medium tracking-wide';
    return (
      <div className="fixed inset-0 overflow-auto text-[#eef2fb]" style={{ background: '#05080f' }}>
        <svg className="fixed inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <defs>
            <linearGradient id="lgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#05080f" /><stop offset=".4" stopColor="#1a1f4a" /><stop offset=".7" stopColor="#c47a4a" /><stop offset="1" stopColor="#e2b04a" /></linearGradient>
            <radialGradient id="lgSun" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff2cf" /><stop offset=".25" stopColor="#f5d98a" stopOpacity=".85" /><stop offset="1" stopColor="#e2b04a" stopOpacity="0" /></radialGradient>
            <linearGradient id="lgM1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b97b0" /><stop offset="1" stopColor="#3a4568" /></linearGradient>
            <linearGradient id="lgM2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a3464" /><stop offset="1" stopColor="#121a2c" /></linearGradient>
            <linearGradient id="lgM3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f1628" /><stop offset="1" stopColor="#05080f" /></linearGradient>
            <path id="lgPine" d="M0-34l9 15h-5l8 13h-6l9 14H-15l9-14h-6l8-13h-5z" />
          </defs>
          <rect width="1200" height="800" fill="url(#lgSky)" />
          <circle cx="880" cy="470" r="230" fill="url(#lgSun)" />
          <path d="M0 520l110-130 80 70 120-170 100 150 90-80 140 200 120-120 110 90 150-170 180 190v240H0z" fill="url(#lgM1)" opacity=".85" />
          <path d="M300 290l-50 80 40-20 25 30 20-40 30 25z M690 330l-40 60 35-15 25 25 20-35z M1020 350l-35 55 30-10 25 20 15-30z" fill="#f5d98a" opacity=".75" />
          <path d="M0 600l140-110 110 80 150-130 140 120 130-90 150 130 120-80 140 90 120-60v320H0z" fill="url(#lgM2)" />
          <path d="M0 690l160-80 120 50 170-90 150 80 160-60 140 70 140-50 160 60v220H0z" fill="url(#lgM3)" />
          <g fill="#070b14"><use href="#lgPine" x="60" y="760" /><use href="#lgPine" x="215" y="750" /><use href="#lgPine" x="900" y="765" /><use href="#lgPine" x="1060" y="772" /><use href="#lgPine" x="1140" y="755" /><use href="#lgPine" x="330" y="785" /></g>
          <rect y="780" width="1200" height="20" fill="#05080f" />
        </svg>
        <div className="relative min-h-full flex flex-col items-center justify-center px-5 py-8">
          <div className="w-full max-w-[400px]">
            <div className="text-center mb-6">
              <div className="mx-auto mb-3.5 w-14 h-14 rounded-2xl grid place-items-center border border-[#e8b84a]/40" style={{ background: 'linear-gradient(145deg,rgba(232,184,74,.28),rgba(232,184,74,.06))', boxShadow: '0 12px 36px rgba(232,184,74,.22)' }}>
                <Lock className="w-6 h-6 text-[#f7df9a]" />
              </div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#f7df9a] mb-1">Himachal Pradesh</p>
              <h1 className="font-serif text-3xl tracking-tight text-white">Scheme Hub <em className="italic text-[#f7df9a]">2026</em></h1>
            </div>
            <div className="rounded-3xl border border-white/[0.12] p-5" style={{ background: 'rgba(12,18,32,.72)', backdropFilter: 'blur(24px)', boxShadow: '0 30px 70px rgba(0,0,0,.5)' }}>
              <h2 className="text-[11px] font-semibold text-[#f7df9a] uppercase tracking-[0.15em] mb-4">Sign in</h2>
              <div className="relative mb-3">
                <label className={lab} htmlFor="gate-id">User ID</label>
                <input id="gate-id" type="text" autoComplete="username" autoCapitalize="characters" spellCheck={false} value={userId} onChange={(e) => setUserId(e.target.value)} className={field} />
              </div>
              <div className="relative mb-3">
                <label className={lab} htmlFor="gate-pw">Password</label>
                <input id="gate-pw" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} className={field} />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label="Show password" className="absolute right-2 top-2 w-10 h-10 grid place-items-center text-[#8b97b0] hover:text-[#f7df9a] transition-colors">
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#8b97b0] mb-3">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 accent-[#e8b84a]" /> Remember my ID on this device
              </label>
              {err && <p className="text-sm text-[#ffb4a8] text-center mb-3">{err}</p>}
              <button type="button" onClick={() => void submit()} disabled={busy || !userId || !password}
                className="w-full h-14 rounded-2xl text-base font-semibold text-[#0a1220] disabled:opacity-60 transition-transform active:scale-[0.98]" style={{ background: 'linear-gradient(165deg,#f7df9a,#e8b84a)', boxShadow: '0 12px 32px rgba(232,184,74,.35)' }}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
              <a href={`${import.meta.env.BASE_URL}admin_users.html`} className="block text-center text-sm font-semibold text-[#f7df9a] mt-4 hover:underline">Admin login →</a>
            </div>
          </div>
        </div>
      </div>
    );

  }

  if (deviceBlock) {
    return (
      <div className="max-w-sm mx-auto mt-16 bg-[#121a2c]/90 border border-red-400/35 rounded-2xl p-6 text-center shadow-glass">
        <p className="text-sm text-red-200 font-semibold mb-2">Cannot open on this phone</p>
        <p className="text-xs text-[#8b97b0] mb-4">{deviceBlock}</p>
        <button type="button" onClick={() => void signOut()} className="text-xs font-semibold text-[#f7df9a] inline-flex items-center gap-1 hover:underline">
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </div>
    );
  }

  if (!role || !ulb) {
    return (
      <div className="max-w-sm mx-auto mt-16 bg-[#121a2c]/90 border border-[#e8b84a]/35 rounded-2xl p-6 text-center shadow-glass">
        <p className="text-sm text-[#f7df9a] font-semibold mb-2">Signed in as {user.email?.split('@')[0]}</p>
        <p className="text-xs text-[#8b97b0] mb-4">This ID is not linked to a ULB or has no role yet. Ask the administrator to assign both.</p>
        <button type="button" onClick={() => void signOut()} className="text-xs font-semibold text-[#f7df9a] inline-flex items-center gap-1 hover:underline">
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
