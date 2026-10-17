import React, { useState } from 'react';
import { Lock, LogOut } from 'lucide-react';
import { useAuth } from '../services/auth';

export const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, loading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) {
    return <div className="p-10 text-center text-sm text-[#9fc7c1]">Checking sign-in…</div>;
  }

  if (!user) {
    const submit = async () => {
      setErr(''); setBusy(true);
      try { await signIn(email, password); }
      catch (e) {
        const code = (e as { code?: string }).code || '';
        setErr(code.includes('network') ? 'No internet. First sign-in needs a connection.' : 'Wrong email or password.');
      } finally { setBusy(false); }
    };
    return (
      <div className="max-w-sm mx-auto mt-16 bg-[#0f242d] border border-[#1d434c] rounded-xl p-6 shadow-lg">
        <h2 className="text-sm font-bold text-[#20b5a6] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" /> Property Survey Sign-in
        </h2>
        <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Email</label>
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-[#091a1f] border border-[#23534d] text-white text-sm rounded-lg p-2.5 mb-3" />
        <label className="block text-xs text-[#9fc7c1] mb-1 font-semibold">Password</label>
        <input type="password" autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
          className="w-full bg-[#091a1f] border border-[#23534d] text-white text-sm rounded-lg p-2.5 mb-3" />
        {err && <p className="text-xs text-red-300 mb-3">{err}</p>}
        <button type="button" onClick={() => void submit()} disabled={busy || !email || !password}
          className="w-full bg-[#0e8a7d] hover:bg-[#11a394] disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-lg">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-[11px] text-[#7fa6a0] mt-3">Accounts are created by the administrator.</p>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="max-w-sm mx-auto mt-16 bg-[#0f242d] border border-[#d6a34b]/40 rounded-xl p-6 text-center">
        <p className="text-sm text-[#f7dfae] font-semibold mb-2">Signed in as {user.email}</p>
        <p className="text-xs text-[#9fc7c1] mb-4">No role is assigned to this account yet. Ask the administrator to assign one (surveyor, supervisor, assessor, cashier).</p>
        <button type="button" onClick={() => void signOut()} className="text-xs font-bold text-[#20b5a6] inline-flex items-center gap-1">
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </div>
    );
  }
  return <>{children}</>;
};
