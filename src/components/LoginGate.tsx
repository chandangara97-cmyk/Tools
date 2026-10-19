import React, { useState } from 'react';
import { Eye, EyeOff, Lock, LogOut } from 'lucide-react';
import { ref as dbRef, get as dbGet } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../services/auth';

export const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, ulb, loading, deviceBlock, signIn, signOut } = useAuth();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [towns, setTowns] = useState<{ slug: string; name: string }[]>([]);
  const [town, setTown] = useState('');
  const [ids, setIds] = useState<{ id: string; label: string }[]>([]);
  const [idsMsg, setIdsMsg] = useState('');
  const [manual, setManual] = useState(false);
  React.useEffect(() => {
    try {
      const v = localStorage.getItem('hub_id'); const t = localStorage.getItem('hub_town');
      if (v) { setUserId(v); if (!t) setManual(true); }
      if (t) setTown(t);
    } catch { /* ignore */ }
    fetch(`${import.meta.env.BASE_URL}ulb_list.json`).then((r) => r.json()).then(setTowns).catch(() => setManual(true));
  }, []);
  // Only IDs and role labels are listed here (loginDirectory), never passwords.
  React.useEffect(() => {
    if (!town) { setIds([]); setIdsMsg(''); return; }
    let off = false; setIdsMsg('Loading IDs…');
    dbGet(dbRef(db, `loginDirectory/${town}`)).then((s) => {
      if (off) return;
      const v = (s.val() || {}) as Record<string, unknown>;
      const list = Object.entries(v).map(([id, label]) => ({ id, label: String(label) }))
        .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
      setIds(list); setIdsMsg(list.length ? '' : 'No IDs listed for this ULB yet');
    }).catch(() => { if (!off) { setIds([]); setIdsMsg('Could not load IDs. Type the ID instead.'); } });
    return () => { off = true; };
  }, [town]);

  if (loading) {
    return <div className="p-10 text-center text-sm text-[#aab4dc]">Checking sign-in…</div>;
  }

  if (!user) {
    const submit = async () => {
      setErr(''); setBusy(true);
      try {
        await signIn(userId, password);
        try { if (remember) { localStorage.setItem('hub_id', userId.trim()); if (town && !manual) localStorage.setItem('hub_town', town); } else { localStorage.removeItem('hub_id'); localStorage.removeItem('hub_town'); } } catch { /* ignore */ }
      } catch (e) {
        const code = (e as { code?: string }).code || '';
        setErr(code.includes('network') ? 'No internet. First sign-in needs a connection.'
          : code.includes('too-many') ? 'Too many attempts. Please wait a few minutes.' : 'Wrong User ID or password.');
      } finally { setBusy(false); }
    };
    const field = 'w-full h-14 pt-5 pb-1 px-4 rounded-2xl border border-white/15 bg-white/5 text-white text-base outline-none focus:border-[#a5b4ff] focus:ring-4 focus:ring-[#a5b4ff]/15';
    const lab = 'absolute left-4 top-1 text-[11px] text-[#a5b4ff] pointer-events-none';
    return (
      <div className="fixed inset-0 overflow-auto text-[#e4e8fa]" style={{ background: '#0d1030' }}>
        <svg className="fixed inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <defs>
            <linearGradient id="lgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d1030" /><stop offset=".45" stopColor="#2b2f78" /><stop offset=".72" stopColor="#d9946a" /><stop offset="1" stopColor="#ffcf8a" /></linearGradient>
            <radialGradient id="lgSun" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff2cf" /><stop offset=".25" stopColor="#ffd08a" stopOpacity=".8" /><stop offset="1" stopColor="#ffb070" stopOpacity="0" /></radialGradient>
            <linearGradient id="lgM1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9aa3e0" /><stop offset="1" stopColor="#4a4f9c" /></linearGradient>
            <linearGradient id="lgM2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#343a86" /><stop offset="1" stopColor="#1b2058" /></linearGradient>
            <linearGradient id="lgM3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#141845" /><stop offset="1" stopColor="#0a0d2b" /></linearGradient>
            <path id="lgPine" d="M0-34l9 15h-5l8 13h-6l9 14H-15l9-14h-6l8-13h-5z" />
          </defs>
          <rect width="1200" height="800" fill="url(#lgSky)" />
          <circle cx="880" cy="470" r="230" fill="url(#lgSun)" />
          <path d="M0 520l110-130 80 70 120-170 100 150 90-80 140 200 120-120 110 90 150-170 180 190v240H0z" fill="url(#lgM1)" opacity=".85" />
          <path d="M300 290l-50 80 40-20 25 30 20-40 30 25z M690 330l-40 60 35-15 25 25 20-35z M1020 350l-35 55 30-10 25 20 15-30z" fill="#f1f2ff" opacity=".9" />
          <path d="M0 600l140-110 110 80 150-130 140 120 130-90 150 130 120-80 140 90 120-60v320H0z" fill="url(#lgM2)" />
          <path d="M0 690l160-80 120 50 170-90 150 80 160-60 140 70 140-50 160 60v220H0z" fill="url(#lgM3)" />
          <g fill="#070a22"><use href="#lgPine" x="60" y="760" /><use href="#lgPine" x="215" y="750" /><use href="#lgPine" x="900" y="765" /><use href="#lgPine" x="1060" y="772" /><use href="#lgPine" x="1140" y="755" /><use href="#lgPine" x="330" y="785" /></g>
          <rect y="780" width="1200" height="20" fill="#050719" />
        </svg>
        <div className="relative min-h-full flex flex-col items-center justify-center px-5 py-8">
          <div className="w-full max-w-[400px]">
            <div className="text-center mb-5">
              <div className="mx-auto mb-3 w-14 h-14 rounded-2xl grid place-items-center" style={{ background: 'linear-gradient(145deg,#a5b4ff,#4f46e5)', boxShadow: '0 10px 30px rgba(165,180,255,.35)' }}>
                <Lock className="w-7 h-7 text-[#0e1230]" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Scheme Hub 2026</h1>
            </div>
            <div className="rounded-3xl border border-white/15 p-5" style={{ background: 'rgba(13,16,40,.68)', backdropFilter: 'blur(20px)', boxShadow: '0 30px 70px rgba(0,0,0,.45)' }}>
              <h2 className="text-xs font-bold text-[#a5b4ff] uppercase tracking-widest mb-4">Sign in</h2>
              {!manual && (
                <>
                  <div className="relative mb-3">
                    <label className={lab} htmlFor="gate-town">ULB / Town</label>
                    <select id="gate-town" value={town} onChange={(e) => { setTown(e.target.value); setUserId(''); }} className={field} style={{ colorScheme: 'dark' }}>
                      <option value="">Select town…</option>
                      {towns.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="relative mb-3">
                    <label className={lab} htmlFor="gate-id">User ID</label>
                    <select id="gate-id" value={userId} onChange={(e) => setUserId(e.target.value)} disabled={!town} className={field} style={{ colorScheme: 'dark' }}>
                      <option value="">{town ? (idsMsg || 'Select ID…') : 'Select town first'}</option>
                      {ids.map((x) => <option key={x.id} value={x.id}>{x.id} – {x.label}</option>)}
                    </select>
                  </div>
                </>
              )}
              {manual && (
                <div className="relative mb-3">
                  <label className={lab} htmlFor="gate-id">User ID</label>
                  <input id="gate-id" type="text" autoComplete="username" autoCapitalize="characters" spellCheck={false} value={userId} onChange={(e) => setUserId(e.target.value)} className={field} />
                </div>
              )}
              <button type="button" onClick={() => setManual(!manual)} className="text-xs font-semibold text-[#a5b4ff] mb-3">
                {manual ? 'Pick ID from list' : 'ID not in the list? Type it'}
              </button>
              <div className="relative mb-3">
                <label className={lab} htmlFor="gate-pw">Password</label>
                <input id="gate-pw" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} className={field} />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label="Show password" className="absolute right-2 top-2 w-10 h-10 grid place-items-center text-[#8790bd]">
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#8790bd] mb-3">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 accent-[#a5b4ff]" /> Remember my ID on this device
              </label>
              {err && <p className="text-sm text-[#ffb4a8] text-center mb-3">{err}</p>}
              <button type="button" onClick={() => void submit()} disabled={busy || !userId || !password}
                className="w-full h-14 rounded-2xl text-base font-bold text-[#0e1230] disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#c7d0ff,#a5b4ff)', boxShadow: '0 10px 26px rgba(165,180,255,.3)' }}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
              <a href={`${import.meta.env.BASE_URL}admin_users.html`} className="block text-center text-sm font-semibold text-[#ffcf8a] mt-4">Admin login →</a>
            </div>
          </div>
        </div>
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
