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
    const base = import.meta.env.BASE_URL || '/';
    const loginBg = `${base.endsWith('/') ? base : base + '/'}login-bg-himachal.png`;
    return (
      <div className="fixed inset-0 overflow-auto text-[#e4e8fa]">
        <style>{`
          .login-bg-himachal {
            background-image: url("${loginBg}");
            background-size: cover;
            background-repeat: no-repeat;
            /* Mobile portrait: keep valley + hills in frame (avoid cropping title text awkwardly) */
            background-position: 58% 42%;
          }
          @media (min-width: 768px) {
            .login-bg-himachal {
              /* Desktop: show full composition — temple left, mountains centre, icons right */
              background-position: center center;
            }
          }
          @media (min-width: 1200px) and (min-aspect-ratio: 16/10) {
            .login-bg-himachal {
              background-position: center 35%;
            }
          }
        `}</style>
        {/* Himachal Pradesh scenic background */}
        <div className="login-bg-himachal fixed inset-0" aria-hidden />
        {/* Lighter scrim: image stays visible, form still readable */}
        <div
          className="fixed inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 50% 45%, rgba(8,12,28,0.38) 0%, rgba(8,12,28,0.62) 100%), linear-gradient(180deg, rgba(6,10,24,0.25) 0%, rgba(6,10,24,0.15) 40%, rgba(6,10,24,0.55) 100%)',
          }}
          aria-hidden
        />
        <div className="relative min-h-full flex flex-col items-center justify-center px-5 py-8">
          <div className="w-full max-w-[400px]">
            <div className="text-center mb-5">
              <div className="mx-auto mb-3 w-14 h-14 rounded-2xl grid place-items-center" style={{ background: 'linear-gradient(145deg,#a5b4ff,#4f46e5)', boxShadow: '0 10px 30px rgba(165,180,255,.35)' }}>
                <Lock className="w-7 h-7 text-[#0e1230]" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">Scheme Hub 2026</h1>
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/95 drop-shadow-md">
                Himachal Pradesh · Urban local bodies
              </p>
            </div>
            <div className="rounded-3xl border border-white/25 p-5" style={{ background: 'rgba(10,14,32,.78)', backdropFilter: 'blur(24px) saturate(150%)', boxShadow: '0 30px 70px rgba(0,0,0,.45)' }}>
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
