import React, { useEffect, useMemo, useState } from 'react';
import { useStepBack, readStep } from '../hooks/useStepBack';
import { Search, X } from 'lucide-react';
import { PropertyRecord } from '../utils/gisUtils';
import { HeadId } from '../services/heads';
import { todayIso } from '../services/collection';
import { useAuth, canCollect, canManageLedger } from '../services/auth';
import { useAllLedgers, useAllSettings, propertyLiability, rulesApproved, PropertyLiability } from '../services/liability';
import { searchRecords, sameOwner, MIN_QUERY } from '../services/propertySearch';
import { BILL_NAME } from './WorkMenu';
import { money } from './CollectionPanel';
import { BillMaker } from './BillMaker';

interface Props { townKey: string; townName: string; records: PropertyRecord[]; heads: HeadId[]; /** Cashier / general public: the box fills the screen and is the only thing on it. */ fullScreen?: boolean }

const none = (n: number) => n <= 0.004;
const tone = (l: PropertyLiability) => (!l.heads.length ? 'text-[#8790bd]' : none(l.total) ? 'text-[#34d399]' : 'text-[#ff6b6f]');

/** One box: type a property ID or owner. The slip shows what is owed on the property and by its owner. */
export const LiabilitySearch: React.FC<Props> = ({ townKey, townName, records, heads, fullScreen = false }) => {
  const { role } = useAuth();
  const { ledgers, status } = useAllLedgers(townKey);
  const { settings, ready: settingsReady } = useAllSettings(townKey);
  const ready = status === 'ready' && settingsReady;
  const today = todayIso();
  const canBill = canCollect(role) || canManageLedger(role);

  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string | null>(() => readStep('srchPick', '') || null);
  const pickNav = useStepBack('srchPick', picked ?? '', (v: string) => setPicked(v || null), '');
  const [billing, setBilling] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (ready) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(t);
  }, [ready]);

  const town = useMemo(() => records.filter((r) => r && r.id && r.town === townName), [records, townName]);
  const matches = useMemo(() => searchRecords(town, q), [town, q]);
  const rec = (picked && town.find((r) => r.id === picked)) || (matches.length === 1 ? matches[0] : undefined);

  const dues = (id: string) => propertyLiability(id, heads, ledgers, settings, today);
  const listed = useMemo(() => (rec ? [] : matches.map((r) => ({ r, l: dues(r.id) }))), [rec, matches, ledgers, settings, heads]); // eslint-disable-line react-hooks/exhaustive-deps
  const ownerRows = useMemo(() => (rec ? sameOwner(town, rec).map((r) => ({ r, l: dues(r.id) })) : []), [rec, town, ledgers, settings, heads]); // eslint-disable-line react-hooks/exhaustive-deps
  const ownerTotal = ownerRows.reduce((a, x) => a + x.l.total, 0);
  const mine = rec ? ownerRows.find((x) => x.r.id === rec.id) : undefined;
  const skipped = mine ? mine.l.heads.filter((h) => !rulesApproved(settings[h.head])).map((h) => BILL_NAME[h.head]) : [];

  const search = (v: string) => { setQ(v); setPicked(null); setBilling(false); };
  const Amount: React.FC<{ l: PropertyLiability; big?: boolean }> = ({ l, big }) => (
    <span className={`slab font-bold whitespace-nowrap ${big ? 'text-lg' : ''} ${tone(l)}`}>
      {!ready ? '…' : !l.heads.length ? 'No bill' : money(l.total)}
    </span>
  );

  const idle = fullScreen && !q.trim();
  return (
    <div className={fullScreen ? `min-h-[calc(100vh-3.5rem)] w-full px-4 sm:px-10 py-6 flex flex-col ${idle ? 'justify-center' : ''}` : ''}>
    <div className={`${fullScreen ? 'w-full max-w-4xl mx-auto' : 'max-w-2xl mx-auto'} space-y-4`}>
      {idle && (
        <div className="text-center mb-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Property dues</h1>
          <p className="text-sm text-[#aab4dc] mt-1">{townName}</p>
        </div>
      )}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa8ff] pointer-events-none" />
        <input
          autoFocus value={q} onChange={(e) => search(e.target.value)} inputMode="search" autoComplete="off" spellCheck={false}
          placeholder="Property ID or owner name" aria-label="Property ID or owner name"
          className={`w-full ${fullScreen ? 'h-16 text-base sm:text-xl' : 'h-14 text-lg'} pl-12 pr-12 rounded-2xl bg-[#181f3d] border-2 border-[#2f3a6b] focus:border-[#9aa8ff] outline-none text-white placeholder:text-[#8790bd]`}
        />
        {q && <button type="button" aria-label="Clear" onClick={() => search('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center text-[#aab4dc]"><X className="w-5 h-5" /></button>}
      </div>

      {status === 'error' && <p role="alert" className="text-sm text-[#ff9fa2]">Dues could not be loaded. Check the internet connection and reopen this page.</p>}
      {status !== 'error' && !ready && slow && <p role="status" className="text-sm text-[#ffcf8a]">Still loading dues. Check the internet connection.</p>}

      {q.trim().length >= MIN_QUERY && !rec && !matches.length && (
        <p className="text-sm text-[#aab4dc]">Nothing found for “{q.trim()}”.</p>
      )}

      {listed.length > 1 && (
        <ul className="space-y-2">
          {listed.map(({ r, l }) => (
            <li key={r.id}>
              <button type="button" onClick={() => pickNav.go(r.id)} className="stub w-full text-left bg-[#181f3d] border border-[#2f3a6b] hover:border-[#9aa8ff] p-3 flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-bold text-white truncate">{r.owner || 'Owner not recorded'}</span>
                  <span className="block text-xs text-[#aab4dc] truncate">{r.id} · Ward {r.ward}{r.hno ? ` · ${r.hno}` : ''}</span>
                </span>
                <Amount l={l} big />
              </button>
            </li>
          ))}
        </ul>
      )}

      {rec && mine && (
        <div className="space-y-3">
          {matches.length > 1 && <button type="button" onClick={() => pickNav.back()} className="text-sm font-bold text-[#9aa8ff]">Back to results</button>}

          <div className="stub bg-[#181f3d] border border-[#2f3a6b] p-4 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white leading-tight">{rec.owner || 'Owner not recorded'}</h2>
              <p className="text-sm text-[#aab4dc]">{rec.id} · Ward {rec.ward}{rec.hno ? ` · House ${rec.hno}` : ''}</p>
            </div>

            {!ready ? (
              <p className="text-[#aab4dc]">Loading dues…</p>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                  <div>
                    <p className="text-xs text-[#aab4dc] mb-1">This property</p>
                    {!mine.l.heads.length
                      ? <span className="text-lg text-[#aab4dc]">No bill raised yet</span>
                      : <span className={`stamp text-3xl ${none(mine.l.total) ? 'clear' : ''}`}>{none(mine.l.total) ? 'Nothing due' : money(mine.l.total)}</span>}
                  </div>
                  {ownerRows.length > 1 && (
                    <div>
                      <p className="text-xs text-[#aab4dc] mb-1">Owner, {ownerRows.length} properties</p>
                      <span className={`stamp text-3xl ${none(ownerTotal) ? 'clear' : ''}`}>{none(ownerTotal) ? 'Nothing due' : money(ownerTotal)}</span>
                    </div>
                  )}
                </div>

                {mine.l.heads.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-[#aab4dc] border-b border-[#2f3a6b]">
                        <tr><th className="text-left p-2">Bill</th><th className="text-right p-2">Tax / charge</th><th className="text-right p-2">Interest</th><th className="text-right p-2">Due</th></tr>
                      </thead>
                      <tbody>
                        {mine.l.heads.map((h) => (
                          <tr key={h.head} className="border-b border-[#252e56]">
                            <td className="p-2 font-bold text-white">{BILL_NAME[h.head]}</td>
                            <td className="p-2 text-right">{money(h.principal)}</td>
                            <td className="p-2 text-right">{money(h.interest)}</td>
                            <td className={`p-2 text-right font-bold ${none(h.total) ? 'text-[#34d399]' : 'text-[#ff6b6f]'}`}>{money(h.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr><td colSpan={3} className="p-2 text-right font-bold text-white">Total due</td><td className="p-2 text-right font-bold text-[#ffe3a3] text-base">{money(mine.l.total)}</td></tr></tfoot>
                    </table>
                  </div>
                )}

                {skipped.length > 0 && <p className="text-xs text-[#ffcf8a]">Interest is not added for {skipped.join(', ')}: its collection rules are not approved yet.</p>}
                <p className="text-[11px] text-[#8790bd]">As on {today}</p>
                {canBill && !billing && mine.l.heads.length > 0 && !none(mine.l.total) && (
                  <button type="button" onClick={() => setBilling(true)} className="text-sm font-bold px-4 py-2.5 rounded-xl bg-[#f2b233] text-[#2b1d00]">Generate bill</button>
                )}
              </>
            )}
          </div>

          {ready && canBill && billing && <BillMaker key={rec.id} town={townName} rows={ownerRows} currentId={rec.id} onClose={() => setBilling(false)} />}

          {ready && ownerRows.length > 1 && (
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Other properties of this owner</h3>
              {ownerRows.filter((x) => x.r.id !== rec.id).map(({ r, l }) => (
                <button key={r.id} type="button" onClick={() => { pickNav.go(r.id); setBilling(false); }} className="stub w-full text-left bg-[#181f3d] border border-[#2f3a6b] hover:border-[#9aa8ff] p-3 flex items-center justify-between gap-3">
                  <span className="min-w-0"><span className="block font-bold text-white truncate">{r.id}</span><span className="block text-xs text-[#aab4dc] truncate">Ward {r.ward}{r.hno ? ` · ${r.hno}` : ''}</span></span>
                  <Amount l={l} big />
                </button>
              ))}
              <p className="text-[11px] text-[#8790bd]">Grouped by the owner’s name as surveyed.</p>
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
};
