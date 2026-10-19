import React, { useEffect, useMemo, useState } from 'react';
import { useStepBack, readStep } from '../hooks/useStepBack';
import { Search, X, CheckCircle2 } from 'lucide-react';
import type { PropertyRecord } from '../utils/gisUtils';
import { HeadId, headLabel } from '../services/heads';
import { financialYearOf } from '../services/assessment';
import { todayIso, periodLabel, periodStart, monthKeys, comparePeriods } from '../services/collection';
import { postAdjustment } from '../services/collectionStore';
import { useAuth, canManageLedger } from '../services/auth';
import { usePayableRates, isMonthly } from '../services/payableRates';
import { useAllLedgers, useAllSettings, propertyLiability, PropertyLiability } from '../services/liability';
import { money } from './CollectionPanel';

interface Props { townKey: string; townName: string; records: PropertyRecord[]; heads: HeadId[] }

const inp = 'bg-[#121830] border border-[#2f3a6b] text-white text-sm rounded-lg p-2 w-full mt-1';
const card = 'bg-[#181f3d] border border-[#28325c] rounded-xl p-4';
const none = (n: number) => n <= 0.004;

const fyList = (n: number) => {
  const y0 = parseInt(financialYearOf(new Date()).slice(0, 4), 10);
  return Array.from({ length: n }, (_, i) => { const y = y0 - i; return `${y}-${String((y + 1) % 100).padStart(2, '0')}`; });
};

/** One bill head of one property: what is pending, and a box to set it. Saved as an audited adjustment. */
const HeadEditor: React.FC<{ townKey: string; pid: string; owner: string; head: HeadId; monthly: boolean; liab: PropertyLiability; onDone: (m: string) => void }> = ({ townKey, pid, owner, head, monthly, liab, onDone }) => {
  const h = liab.heads.find((x) => x.head === head);
  const current = monthly ? monthKeys(0, 0)[0] : financialYearOf(new Date());
  const periods = useMemo(() => {
    const set = new Set<string>([current, ...(h?.periods.map((p) => p.fy) || [])]);
    (monthly ? monthKeys(11, 0) : fyList(8)).forEach((k) => set.add(k));
    return [...set].sort((a, b) => comparePeriods(b, a));
  }, [h, monthly, current]);
  const [period, setPeriod] = useState(h?.periods[0]?.fy || current);
  const pend = h?.periods.find((p) => p.fy === period);
  const principalNow = pend?.principal || 0;
  const [val, setVal] = useState(String(principalNow));
  const [why, setWhy] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setVal(String(principalNow)); }, [period, principalNow]);

  const target = parseFloat(val);
  const delta = Number.isFinite(target) ? Math.round((target - principalNow) * 100) / 100 : 0;
  const ok = Number.isFinite(target) && target >= 0 && Math.abs(delta) >= 0.01 && why.trim().length > 0 && !busy;

  const save = async (newTarget: number) => {
    const d = Math.round((newTarget - principalNow) * 100) / 100;
    if (!window.confirm(`Set ${headLabel(head)} pending for ${periodLabel(period)} from ${money(principalNow)} to ${money(newTarget)}?\n\nOwner: ${owner}\nProperty: ${pid}\nChange: ${d > 0 ? '+' : '−'}${money(Math.abs(d))}\nReason: ${why.trim()}\n\nIt shows at once on every page and is recorded in the audit trail.`)) return;
    setBusy(true); setErr('');
    try {
      await postAdjustment(townKey, pid, period, d, why.trim(), periodStart(period), head);
      setWhy('');
      onDone(`${headLabel(head)} pending for ${periodLabel(period)} is now ${money(newTarget)}.`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save. Check the internet connection and try again.'); }
    setBusy(false);
  };

  return (
    <div className={`${card} space-y-3`}>
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-lg font-bold text-white">{headLabel(head)}</h4>
        <span className={`slab font-bold ${h && !none(h.total) ? 'text-[#ff6b6f]' : 'text-[#34d399]'}`}>{h ? (none(h.total) ? 'Nothing pending' : `Pending ${money(h.total)}`) : 'No bill yet'}</span>
      </div>
      {h && h.periods.length > 0 && (
        <table className="w-full text-xs"><tbody>
          {h.periods.map((p) => (
            <tr key={p.fy} className="border-t border-[#252e56]">
              <td className="py-1 text-[#aab4dc]">{periodLabel(p.fy)}</td>
              <td className="text-right text-[#aab4dc]">Charge {money(p.principal)}</td>
              <td className="text-right text-[#aab4dc]">Interest {money(p.interest)}</td>
              <td className="text-right font-bold text-white">{money(p.total)}</td>
            </tr>
          ))}
        </tbody></table>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[11px] text-[#aab4dc]">{monthly ? 'Month' : 'Financial year'}
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={inp}>{periods.map((k) => <option key={k} value={k}>{periodLabel(k)}</option>)}</select>
        </label>
        <label className="text-[11px] text-[#aab4dc]">Pending charge should be (₹)
          <input type="number" inputMode="decimal" min="0" step="0.01" value={val} onChange={(e) => setVal(e.target.value)} className={inp} />
        </label>
        <label className="col-span-2 text-[11px] text-[#aab4dc]">Reason
          <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="For example: arrears from old register" className={inp} />
        </label>
      </div>
      {Number.isFinite(target) && Math.abs(delta) >= 0.01 && <p className="text-xs text-[#ffe3a3]">Will {delta > 0 ? 'add' : 'reduce by'} {money(Math.abs(delta))}.</p>}
      {err && <p role="alert" className="text-xs text-[#ff9fa2]">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!ok} onClick={() => void save(target)} className="text-sm font-bold px-4 py-2.5 rounded-xl bg-[#f2b233] text-[#2b1d00] disabled:opacity-40">Update pending</button>
        <button type="button" disabled={busy || principalNow <= 0 || !why.trim()} onClick={() => void save(0)} className="text-sm font-bold px-4 py-2.5 rounded-xl bg-[#2a3464] text-[#9aa8ff] disabled:opacity-40">Clear this period</button>
      </div>
    </div>
  );
};

/** Admin page: see every pending due of the ULB and set it. Cashier search, bill pages and reports read the same live ledger, so a change shows everywhere at once. */
export const AdminDuesPage: React.FC<Props> = ({ townKey, townName, records, heads }) => {
  const { role, isSuper } = useAuth();
  const { ledgers, status } = useAllLedgers(townKey);
  const { settings, ready: settingsReady } = useAllSettings(townKey);
  const rates = usePayableRates(townKey);
  const ready = status === 'ready' && settingsReady;
  const today = todayIso();
  const [q, setQ] = useState('');
  const [pid, setPid] = useState<string | null>(() => readStep('duesPid', '') || null);
  const pidNav = useStepBack('duesPid', pid ?? '', (v: string) => setPid(v || null), '');
  const [onlyDue, setOnlyDue] = useState(true);
  const [note, setNote] = useState('');

  const town = useMemo(() => records.filter((r) => r && r.id && r.town === townName), [records, townName]);
  const rows = useMemo(() => (ready ? town.map((r) => ({ r, l: propertyLiability(r.id, heads, ledgers, settings, today) })) : []), [ready, town, heads, ledgers, settings, today]);
  const totalPending = rows.reduce((a, x) => a + x.l.total, 0);
  const withDues = rows.filter((x) => !none(x.l.total)).length;
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((x) => (!onlyDue || !none(x.l.total)) && (!t || `${x.r.id} ${x.r.owner} ${x.r.hno}`.toLowerCase().includes(t)))
      .sort((a, b) => b.l.total - a.l.total).slice(0, 60);
  }, [rows, q, onlyDue]);
  const cur = pid ? rows.find((x) => x.r.id === pid) : undefined;

  if (!(isSuper || canManageLedger(role)) || role === 'supervisor') return <p className="text-[#ff9fa2]">Only the ULB admin can update dues.</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {status === 'error' && <p role="alert" className="text-sm text-[#ff9fa2]">Dues could not be loaded. Check the internet connection and reopen this page.</p>}
      {!cur && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className={card}><p className="text-xs text-[#aab4dc]">Total pending · {townName}</p><p className="slab text-2xl font-bold text-[#ff6b6f]">{ready ? money(totalPending) : '…'}</p></div>
            <div className={card}><p className="text-xs text-[#aab4dc]">Properties with dues</p><p className="slab text-2xl font-bold text-white">{ready ? `${withDues} / ${town.length}` : '…'}</p></div>
          </div>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa8ff] pointer-events-none" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Property ID or owner name" aria-label="Property ID or owner name" autoComplete="off"
              className="w-full h-14 text-base pl-12 pr-12 rounded-2xl bg-[#181f3d] border-2 border-[#2f3a6b] focus:border-[#9aa8ff] outline-none text-white placeholder:text-[#8790bd]" />
            {q && <button type="button" aria-label="Clear" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center text-[#aab4dc]"><X className="w-5 h-5" /></button>}
          </div>
          <label className="flex items-center gap-2 text-sm text-[#aab4dc]"><input type="checkbox" checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)} /> Show only properties with pending dues</label>
          {note && <p role="status" className="text-sm text-[#34d399] flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{note}</p>}
          <ul className="space-y-2">
            {shown.map(({ r, l }) => (
              <li key={r.id}>
                <button type="button" onClick={() => { pidNav.go(r.id); setNote(''); }} className="w-full text-left bg-[#181f3d] border border-[#2f3a6b] hover:border-[#9aa8ff] rounded-xl p-3 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-bold text-white truncate">{r.owner || 'Owner not recorded'}</span>
                    <span className="block text-xs text-[#aab4dc] truncate">{r.id} · Ward {r.ward}{r.hno ? ` · ${r.hno}` : ''}</span>
                    <span className="block text-[11px] text-[#8790bd] truncate">{l.heads.filter((h) => !none(h.total)).map((h) => `${headLabel(h.head)} ${money(h.total)}`).join(' · ') || 'No pending dues'}</span>
                  </span>
                  <span className={`slab font-bold whitespace-nowrap ${none(l.total) ? 'text-[#34d399]' : 'text-[#ff6b6f]'}`}>{money(l.total)}</span>
                </button>
              </li>
            ))}
          </ul>
          {ready && !shown.length && <p className="text-sm text-[#aab4dc]">{town.length ? 'No property matches.' : 'No surveyed properties in this ULB yet.'}</p>}
          {ready && shown.length === 60 && <p className="text-[11px] text-[#8790bd]">Showing the first 60. Type to narrow down.</p>}
        </>
      )}
      {cur && (
        <div className="space-y-3">
          <button type="button" onClick={() => pidNav.back()} className="text-sm font-bold text-[#9aa8ff]">Back to list</button>
          <div className={card}>
            <h2 className="text-2xl font-bold text-white leading-tight">{cur.r.owner || 'Owner not recorded'}</h2>
            <p className="text-sm text-[#aab4dc]">{cur.r.id} · Ward {cur.r.ward}{cur.r.hno ? ` · House ${cur.r.hno}` : ''}</p>
            <p className="mt-2 text-xs text-[#aab4dc]">Total pending, all bills</p>
            <p className={`slab text-3xl font-bold ${none(cur.l.total) ? 'text-[#34d399]' : 'text-[#ff6b6f]'}`}>{money(cur.l.total)}</p>
            <p className="text-[11px] text-[#8790bd] mt-1">As on {today}. Changes below appear on the cashier’s search, bill pages and reports straight away.</p>
          </div>
          {note && <p role="status" className="text-sm text-[#34d399] flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{note}</p>}
          {heads.map((h) => (
            <HeadEditor key={h} townKey={townKey} pid={cur.r.id} owner={cur.r.owner} head={h} monthly={isMonthly(h, rates[h])} liab={cur.l} onDone={setNote} />
          ))}
          <p className="text-[11px] text-[#8790bd]">Interest is worked out by the system from the due date, so only the charge is set here. Every change is saved as an adjustment in the audit trail and can be reversed from Collect payment.</p>
        </div>
      )}
    </div>
  );
};
