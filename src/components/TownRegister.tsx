import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { PropertyRecord } from '../utils/gisUtils';
import { useAuth } from '../services/auth';
import { calcAssessment } from '../services/assessment';
import { useRateTable, saveRateTable } from '../services/assessmentStore';

interface Props { townKey: string; townName: string; records: PropertyRecord[] }

const card = 'bg-[#181f3d] border border-[#28325c] rounded-xl p-4';
const inp = 'bg-[#121830] border border-[#2f3a6b] text-white text-sm rounded-lg p-2';
const inr = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const YEAR = new Date().getFullYear();

/** Admin-only: every property of the town with the tax its bye-law rate table gives, plus the rate table itself. */
export const TownRegister: React.FC<Props> = ({ townKey, townName, records }) => {
  const { role, isSuper } = useAuth();
  const { table, saved } = useRateTable(townKey);
  const [q, setQ] = useState('');
  const [ward, setWard] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<'records' | 'bylaws'>('records');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const wards = useMemo(() => [...new Set(records.map((r) => String(r.ward)))].sort((a, b) => Number(a) - Number(b)), [records]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return records
      .filter((r) => (!ward || String(r.ward) === ward) && (!s || [r.id, r.owner, r.act, r.hno, r.addr, r.upn].join(' ').toLowerCase().includes(s)))
      .map((r) => ({ r, c: calcAssessment(r, table, YEAR) }));
  }, [records, q, ward, table]);

  if (!(isSuper || role === 'admin')) return <p className="text-[#ff9fa2]">Only the ULB admin can open this page.</p>;

  const total = rows.reduce((a, x) => a + (x.c.tax ?? 0), 0);
  const saveDefault = async () => {
    if (!window.confirm(`Save this provisional bye-law table for ${townName} to the database?\n\nIt stays marked "placeholder", so no assessment can be approved until you replace the values with the notified ones.`)) return;
    setBusy(true); setMsg('');
    try { await saveRateTable(townKey, table); setMsg('Bye-law table saved for ' + townName + '.'); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save. Check the internet connection.'); }
    setBusy(false);
  };
  const sel = rows.find((x) => x.r.id === open);
  const mp = (m: Record<string, number>) => Object.entries(m).map(([k, v]) => <tr key={k}><td className="py-1 pr-3">{k}</td><td className="text-right">{v}</td></tr>);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['records', 'bylaws'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === t ? 'bg-[#4f6bff] text-white' : 'bg-[#181f3d] text-[#aab4e6]'}`}>{t === 'records' ? 'Records' : 'Bye-laws'}</button>
        ))}
      </div>
      {table.status !== 'approved' && (
        <div className={`${card} text-sm text-[#ffd48a]`}>
          {saved ? 'The saved rate table is marked placeholder.' : `No bye-law table is saved for ${townName} yet; the default below is used.`} Tax figures are for testing only.
          {!saved && <button disabled={busy} onClick={saveDefault} className="ml-3 underline font-semibold">Save to database</button>}
        </div>
      )}
      {msg && <p role="status" className="text-sm text-[#9be3b5]">{msg}</p>}

      {tab === 'records' && (
        <>
          <div className="flex flex-wrap gap-2">
            <label className="relative flex-1 min-w-[200px]"><Search className="w-4 h-4 absolute left-3 top-3 text-[#8a96c8]" />
              <input className={`${inp} w-full pl-9`} placeholder="Search ID, owner, house no. or business" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search records" />
            </label>
            <select className={inp} value={ward} onChange={(e) => setWard(e.target.value)} aria-label="Ward">
              <option value="">All wards</option>{wards.map((w) => <option key={w}>{w}</option>)}
            </select>
          </div>
          <p className="text-sm text-[#aab4e6]">{rows.length} of {records.length} properties in {townName} · tax {inr(total)}</p>
          <div className="space-y-2">
            {rows.slice(0, 200).map(({ r, c }) => (
              <button key={r.id} onClick={() => setOpen(open === r.id ? null : r.id)} className={`${card} w-full text-left`}>
                <div className="flex justify-between gap-3"><span className="font-semibold text-white">{r.owner || 'Owner not recorded'}</span><span className="text-white font-semibold">{c.tax != null && c.builtUp > 0 ? inr(c.tax) : '—'}</span></div>
                <div className="text-xs text-[#8a96c8]">{r.id} · Ward {r.ward}{r.act ? ' · ' + r.act : ''}{r.use ? ' · ' + r.use : ''}</div>
                {open === r.id && sel && (
                  <table className="w-full text-xs mt-3 text-[#cfd6f5]"><tbody>
                    <tr><td>Built-up area</td><td className="text-right">{c.builtUp}</td></tr>
                    {c.lines.map((l) => <tr key={l.factor}><td>× {l.factor} ({l.basis})</td><td className="text-right">{l.value}</td></tr>)}
                    <tr><td>Rateable value</td><td className="text-right">{inr(c.rateableValue)}</td></tr>
                    <tr><td>Rebate {table.rebatePct}%</td><td className="text-right">−{inr(c.rebate)}</td></tr>
                    <tr><td>Net taxable value</td><td className="text-right">{inr(c.netTaxableValue)}</td></tr>
                    <tr className="font-semibold text-white"><td>Tax at {table.taxRatePct}%</td><td className="text-right">{c.tax != null ? inr(c.tax) : '—'}</td></tr>
                  </tbody></table>
                )}
              </button>
            ))}
            {rows.length > 200 && <p className="text-xs text-[#8a96c8]">Showing the first 200. Narrow the search to see the rest.</p>}
            {rows.length === 0 && <p className="text-sm text-[#8a96c8]">No property matches. Clear the search or pick another ward.</p>}
          </div>
        </>
      )}

      {tab === 'bylaws' && (
        <div className={`${card} text-sm text-[#cfd6f5] space-y-3`}>
          <h3 className="text-white font-semibold">{table.bylaw?.title || 'Bye-law rate table'}</h3>
          <p>Effective from {table.effectiveFrom} · rebate {table.rebatePct}% · tax rate {table.taxRatePct ?? 'not set'}% · status {table.status}</p>
          <p>Built-up area × location × structure × age × occupancy × use × class factor gives the rateable value. Subtract the rebate, then apply the tax rate. To change any value, use Assessment, then “Enter / edit bye-law rates”.</p>
          <table className="w-full"><tbody>
            <tr><th className="text-left text-white">Location (zone)</th><th /></tr>{mp(table.zoneF1)}
            <tr><th className="text-left text-white pt-2">Structure</th><th /></tr>{mp(table.structureF2)}
            <tr><th className="text-left text-white pt-2">Age</th><th /></tr>
            {table.ageF3.map((b, i) => <tr key={i}><td className="py-1">{b.maxAge == null ? 'Older' : 'Up to ' + b.maxAge + ' years'}</td><td className="text-right">{b.factor}</td></tr>)}
            <tr><th className="text-left text-white pt-2">Occupancy</th><th /></tr>{mp(table.occupancyF4)}
            <tr><th className="text-left text-white pt-2">Use</th><th /></tr>{mp(table.useF5)}
            <tr><th className="text-left text-white pt-2">Class</th><th /></tr>{mp(table.classFactor)}
          </tbody></table>
        </div>
      )}
    </div>
  );
};
