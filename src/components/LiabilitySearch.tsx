import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { PropertyRecord } from '../utils/gisUtils';
import { HeadId } from '../services/heads';
import { todayIso } from '../services/collection';
import { useAllLedgers, useAllSettings, propertyLiability } from '../services/liability';
import { BILL_NAME } from './WorkMenu';
import { money } from './CollectionPanel';

interface Props { townKey: string; townName: string; records: PropertyRecord[]; heads: HeadId[] }

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Search by property ID, owner, house number or UPN. Shows what is owed on the property and by the owner. */
export const LiabilitySearch: React.FC<Props> = ({ townKey, townName, records, heads }) => {
  const ledgers = useAllLedgers(townKey);
  const settings = useAllSettings(townKey);
  const today = todayIso();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string | null>(null);

  const town = useMemo(() => records.filter((r) => r.town === townName), [records, townName]);
  const byId = useMemo(() => new Map(town.map((r) => [r.id, r])), [town]);

  const matches = useMemo(() => {
    const t = norm(q);
    if (t.length < 2) return [];
    const c = compact(q);
    const words = t.split(' ');
    const exact = town.filter((r) => compact(r.id) === c);
    if (exact.length) return exact;
    return town.filter((r) => {
      const hay = norm(`${r.owner} ${r.hno} ${r.addr}`);
      return compact(r.id).includes(c) || (r.upn && compact(r.upn).includes(c)) || words.every((w) => hay.includes(w));
    }).slice(0, 25);
  }, [q, town]);

  const liab = (id: string) => propertyLiability(id, heads, ledgers, settings, today);

  const rec = picked ? byId.get(picked) : matches.length === 1 ? matches[0] : undefined;
  const ownerProps = useMemo(() => (rec ? town.filter((r) => norm(r.owner) === norm(rec.owner)) : []), [rec, town]);
  const ownerRows = useMemo(() => ownerProps.map((r) => ({ r, l: liab(r.id) })), [ownerProps, ledgers, settings, heads]); // eslint-disable-line react-hooks/exhaustive-deps
  const ownerTotal = ownerRows.reduce((a, x) => a + x.l.total, 0);
  const thisRow = rec ? ownerRows.find((x) => x.r.id === rec.id) : undefined;
  const clear = (n: number) => n <= 0.004;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa8ff]" />
        <input
          autoFocus value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }}
          placeholder="Property ID or owner name" aria-label="Property ID or owner name"
          className="w-full h-14 pl-12 pr-12 rounded-2xl bg-[#181f3d] border-2 border-[#2f3a6b] focus:border-[#9aa8ff] outline-none text-lg text-white placeholder:text-[#8790bd]"
        />
        {q && <button type="button" aria-label="Clear" onClick={() => { setQ(''); setPicked(null); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center text-[#aab4dc]"><X className="w-5 h-5" /></button>}
      </div>

      {q.trim().length >= 2 && !matches.length && <p className="text-sm text-[#aab4dc]">No property matches “{q.trim()}”. Try the full property ID or part of the owner’s name.</p>}

      {!rec && matches.length > 1 && (
        <ul className="space-y-2">
          {matches.map((r) => {
            const l = liab(r.id);
            return (
              <li key={r.id}>
                <button type="button" onClick={() => setPicked(r.id)} className="stub w-full text-left bg-[#181f3d] border border-[#2f3a6b] hover:border-[#9aa8ff] p-3 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-bold text-white truncate">{r.owner || 'Owner not recorded'}</span>
                    <span className="block text-xs text-[#aab4dc] truncate">{r.id} · Ward {r.ward}{r.hno ? ` · ${r.hno}` : ''}</span>
                  </span>
                  <span className={`slab text-lg font-bold whitespace-nowrap ${clear(l.total) ? 'text-[#34d399]' : 'text-[#ff6b6f]'}`}>{money(l.total)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {rec && thisRow && (
        <div className="space-y-4">
          {matches.length > 1 && <button type="button" onClick={() => setPicked(null)} className="text-sm font-bold text-[#9aa8ff]">Back to results</button>}

          <div className="stub bg-[#181f3d] border border-[#2f3a6b] p-4 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white leading-tight">{rec.owner || 'Owner not recorded'}</h2>
              <p className="text-sm text-[#aab4dc]">{rec.id} · Ward {rec.ward}{rec.hno ? ` · House ${rec.hno}` : ''}{rec.addr ? ` · ${rec.addr}` : ''}</p>
            </div>

            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <p className="text-xs text-[#aab4dc] mb-1">Total liability on this property</p>
                <span className={`stamp text-3xl ${clear(thisRow.l.total) ? 'clear' : ''}`}>{clear(thisRow.l.total) ? 'Nothing due' : money(thisRow.l.total)}</span>
              </div>
              {ownerRows.length > 1 && (
                <div>
                  <p className="text-xs text-[#aab4dc] mb-1">Total liability of the owner, {ownerRows.length} properties</p>
                  <span className={`stamp text-3xl ${clear(ownerTotal) ? 'clear' : ''}`}>{clear(ownerTotal) ? 'Nothing due' : money(ownerTotal)}</span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[#aab4dc] border-b border-[#2f3a6b]">
                  <tr><th className="text-left p-2">Bill</th><th className="text-right p-2">Tax / charge</th><th className="text-right p-2">Interest</th><th className="text-right p-2">Due</th></tr>
                </thead>
                <tbody>
                  {thisRow.l.heads.map((h) => (
                    <tr key={h.head} className="border-b border-[#252e56]">
                      <td className="p-2 font-bold text-white">{BILL_NAME[h.head]}</td>
                      <td className="p-2 text-right">{money(h.principal)}</td>
                      <td className="p-2 text-right">{money(h.interest)}</td>
                      <td className={`p-2 text-right font-bold ${clear(h.total) ? 'text-[#34d399]' : 'text-[#ff6b6f]'}`}>{money(h.total)}</td>
                    </tr>
                  ))}
                  {!thisRow.l.heads.length && <tr><td colSpan={4} className="p-3 text-[#aab4dc]">No demand has been raised on this property yet.</td></tr>}
                </tbody>
                {thisRow.l.heads.length > 0 && <tfoot><tr><td colSpan={3} className="p-2 text-right font-bold text-white">Total due</td><td className="p-2 text-right font-bold text-[#ffe3a3] text-base">{money(thisRow.l.total)}</td></tr></tfoot>}
              </table>
            </div>
            <p className="text-[11px] text-[#8790bd]">As on {today}.</p>
          </div>

          {ownerRows.length > 1 && (
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">All properties of {rec.owner}</h3>
              {ownerRows.map(({ r, l }) => (
                <button key={r.id} type="button" onClick={() => setPicked(r.id)} className={`stub w-full text-left bg-[#181f3d] border p-3 ${r.id === rec.id ? 'border-[#ffe3a3]' : 'border-[#2f3a6b] hover:border-[#9aa8ff]'}`}>
                  <span className="flex items-center justify-between gap-3">
                    <span className="min-w-0"><span className="block font-bold text-white truncate">{r.id}</span><span className="block text-xs text-[#aab4dc] truncate">Ward {r.ward}{r.hno ? ` · ${r.hno}` : ''}</span></span>
                    <span className={`slab text-lg font-bold whitespace-nowrap ${clear(l.total) ? 'text-[#34d399]' : 'text-[#ff6b6f]'}`}>{money(l.total)}</span>
                  </span>
                  {l.heads.filter((h) => !clear(h.total)).length > 0 && (
                    <span className="block text-xs text-[#aab4dc] mt-1">{l.heads.filter((h) => !clear(h.total)).map((h) => `${BILL_NAME[h.head]} ${money(h.total)}`).join(' · ')}</span>
                  )}
                </button>
              ))}
              <p className="text-[11px] text-[#8790bd]">Properties are grouped by the owner’s name as surveyed.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
