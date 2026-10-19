import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../firebase';

/** Lets any signed-in login replace its own password (needed because many IDs start on a shared password). */
export const ChangePasswordButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => { setOpen(false); setCur(''); setPw1(''); setPw2(''); setMsg(null); };

  const save = async () => {
    const u = auth.currentUser;
    if (!u || !u.email) return;
    if (pw1.length < 8) return setMsg({ ok: false, text: 'Use 8 or more characters.' });
    if (pw1 !== pw2) return setMsg({ ok: false, text: 'The two new passwords do not match.' });
    if (pw1 === cur) return setMsg({ ok: false, text: 'The new password must be different.' });
    setBusy(true); setMsg(null);
    try {
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, cur));
      await updatePassword(u, pw1);
      setMsg({ ok: true, text: 'Password changed.' });
      setCur(''); setPw1(''); setPw2('');
    } catch (e) {
      const code = (e as { code?: string }).code || '';
      setMsg({ ok: false, text: code.includes('wrong-password') || code.includes('invalid-credential') ? 'Current password is wrong.'
        : code.includes('network') ? 'No internet.' : code.includes('weak') ? 'Password is too weak.' : 'Could not change the password.' });
    } finally { setBusy(false); }
  };

  const field = 'w-full h-11 px-3 rounded-xl border border-white/15 bg-white/5 text-white text-sm outline-none focus:border-[#a5b4ff]';
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Change password"
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold text-slate-300 hover:text-white">
        <KeyRound className="w-4 h-4" /><span className="hidden sm:inline">Password</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60" role="dialog" aria-modal="true" aria-label="Change password">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 p-5 text-slate-100" style={{ background: '#12163a' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Change password</h2>
              <button type="button" onClick={close} aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              <input type="password" autoComplete="current-password" placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} className={field} />
              <input type="password" autoComplete="new-password" placeholder="New password (8+ characters)" value={pw1} onChange={(e) => setPw1(e.target.value)} className={field} />
              <input type="password" autoComplete="new-password" placeholder="Repeat new password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={field} />
            </div>
            {msg && <p className={`text-sm mt-3 ${msg.ok ? 'text-emerald-300' : 'text-[#ffb4a8]'}`}>{msg.text}</p>}
            <button type="button" onClick={() => void save()} disabled={busy || !cur || !pw1 || !pw2}
              className="w-full h-11 mt-4 rounded-xl font-bold text-[#0e1230] disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#c7d0ff,#a5b4ff)' }}>
              {busy ? 'Saving…' : 'Save new password'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
