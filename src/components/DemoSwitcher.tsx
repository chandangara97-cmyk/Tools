import React, { useEffect, useState } from 'react';
import { DEMO_MODE, getDemoProfile, setDemoProfile, DemoRole } from '../config/demo';

const ROLES: DemoRole[] = ['admin', 'supervisor', 'cashier', 'surveyor', 'assessor', 'monitor', 'public'];
const HEADS = ['', 'property_tax', 'water', 'garbage', 'sewerage', 'other'];

/** Floating demo-only box to change role / town without any password. */
export const DemoSwitcher: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [towns, setTowns] = useState<{ slug: string; name: string }[]>([]);
  const cur = getDemoProfile();
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}ulb_list.json`).then((r) => r.json()).then(setTowns).catch(() => {});
  }, []);
  if (!DEMO_MODE) return null;

  const apply = (patch: Partial<typeof cur>) => {
    const next = { ...cur, ...patch };
    // only admin may be "all towns"; every other role needs one town
    if (next.role !== 'admin' && next.ulb === '*') next.ulb = towns[0]?.slug || 'Bhota';
    if (next.role !== 'supervisor') next.head = null;
    setDemoProfile(next);
  };
  const sel = 'w-full rounded-lg bg-slate-800 border border-white/10 px-2 py-1.5 text-xs text-slate-100';

  return (
    <div className="fixed bottom-3 left-3 z-[300] text-left">
      {open && (
        <div className="mb-2 w-56 rounded-xl bg-slate-900/95 border border-white/10 p-3 shadow-xl space-y-2">
          <label className="block text-[10px] font-bold uppercase text-slate-400">Role
            <select className={sel} value={cur.role} onChange={(e) => apply({ role: e.target.value as DemoRole })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="block text-[10px] font-bold uppercase text-slate-400">Town
            <select className={sel} value={cur.ulb} onChange={(e) => apply({ ulb: e.target.value })}>
              {cur.role === 'admin' && <option value="*">All towns (owner)</option>}
              {towns.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
            </select>
          </label>
          {cur.role === 'supervisor' && (
            <label className="block text-[10px] font-bold uppercase text-slate-400">Bill head
              <select className={sel} value={cur.head || ''} onChange={(e) => apply({ head: e.target.value || null })}>
                {HEADS.map((h) => <option key={h} value={h}>{h || 'all heads'}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
      <button type="button" onClick={() => setOpen(!open)}
        className="rounded-full bg-amber-400 text-slate-900 text-[11px] font-black px-3 py-1.5 shadow-lg">
        DEMO · {cur.role}{cur.ulb !== '*' ? ` · ${cur.ulb}` : ''}
      </button>
    </div>
  );
};
