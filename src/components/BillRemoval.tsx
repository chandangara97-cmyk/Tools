import React, { useMemo, useState } from 'react';
import { Trash2, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import type { PropertyRecord } from '../utils/gisUtils';
import { HeadId, headLabel } from '../services/heads';
import type { LedgersByHead } from '../services/liability';
import { LedgerEntry, periodLabel, planVoid } from '../services/collection';
import { voidDemands } from '../services/collectionStore';
import { money } from './CollectionPanel';

type Scope = 'town' | 'ward' | 'structure';

interface Props {
  townKey: string;
  town: PropertyRecord[];
  heads: HeadId[];
  ledgers: LedgersByHead;
  busy: boolean;
  /** The month or financial year this head is billed in (from the page's period pickers). */
  periodOf: (head: HeadId) => string;
  /** Generate the missing bills of one head, only for ledgers `inScope`, starting from the given ledgers. */
  regenerate: (head: HeadId, ledgers: Record<string, LedgerEntry[]>, inScope: (key: string) => boolean) => Promise<string>;
  run: (done: string, work: () => Promise<void>) => Promise<void>;
  report: (lines: string[]) => void;
}

const card = 'bg-[#181f3d] border border-[#28325c] rounded-xl p-4';
const sel = 'h-11 w-full rounded-lg bg-[#0d1224] border border-[#2f3a6b] px-2 text-sm text-white outline-none focus:border-[#9aa8ff]';
const pidOf = (key: string) => key.split('~')[0];

/**
 * Remove the bills of one month (or year) for the whole town, one ward or one structure, and optionally raise them
 * again at today's amounts. A removed bill is cancelled by a reversal entry, so the history stays. A bill that already
 * has a payment is never removed.
 */
export const BillRemoval: React.FC<Props> = ({ townKey, town, heads, ledgers, busy, periodOf, regenerate, run, report }) => {
  const [head, setHead] = useState<HeadId>(heads.includes('garbage') ? 'garbage' : heads[0]);
  const [scope, setScope] = useState<Scope>('town');
  const [ward, setWard] = useState('');
  const [q, setQ] = useState('');
  const [structure, setStructure] = useState<PropertyRecord | null>(null);
  const [reason, setReason] = useState('');

  const period = periodOf(head);
  const wards = useMemo(() => [...new Set(town.map((r) => String(r.ward)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [town]);
  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return town.filter((r) => [r.id, r.owner, r.hno].some((x) => String(x ?? '').toLowerCase().includes(s))).slice(0, 8);
  }, [q, town]);

  const inScope = useMemo<(key: string) => boolean>(() => {
    if (scope === 'ward') { const ids = new Set(town.filter((r) => String(r.ward) === ward).map((r) => r.id)); return (k) => ids.has(pidOf(k)); }
    if (scope === 'structure') { const id = structure?.id; return (k) => !!id && pidOf(k) === id; }
    return () => true;
  }, [scope, ward, structure, town]);

  const scopeReady = scope === 'town' || (scope === 'ward' && !!ward) || (scope === 'structure' && !!structure);
  const led = ledgers[head] || {};
  const plan = useMemo(() => (scopeReady ? planVoid(led, period, inScope) : { items: [], amount: 0, keptPaid: 0 }), [led, period, inScope, scopeReady]); // eslint-disable-line react-hooks/exhaustive-deps
  const where = scope === 'town' ? 'the whole town' : scope === 'ward' ? `ward ${ward}` : structure ? `structure ${structure.id}` : '';
  const ok = scopeReady && plan.items.length > 0 && reason.trim().length > 2 && !busy;

  const confirm = (again: boolean) => {
    const n = plan.items.length;
    const text = `${again ? 'Remove and regenerate' : 'Remove'} ${headLabel(head)} bills for ${periodLabel(period)} in ${where}?\n\n${n} bill${n === 1 ? '' : 's'} (${money(plan.amount)}) will be cancelled.${plan.keptPaid ? `\n${plan.keptPaid} with a payment will be kept.` : ''}${again ? '\n\nNew bills are then raised at the current amounts.' : ''}\n\nThe cancelled bills stay in the history as reversals.`;
    if (!window.confirm(text)) return false;
    if (n > 20) { const t = window.prompt(`This removes ${n} bills. Type REMOVE to continue.`); if ((t || '').trim().toUpperCase() !== 'REMOVE') return false; }
    return true;
  };

  const go = (again: boolean) => {
    if (!ok || !confirm(again)) return;
    report([]);
    void run(again ? 'Bills removed and regenerated.' : 'Bills removed.', async () => {
      const added = await voidDemands(townKey, head, period, plan.items, led, reason);
      const lines = [`${headLabel(head)} (${periodLabel(period)}): ${plan.items.length} bill${plan.items.length === 1 ? '' : 's'} removed${plan.keptPaid ? `, ${plan.keptPaid} kept (paid)` : ''}`];
      if (again) {
        const merged: Record<string, LedgerEntry[]> = { ...led };
        for (const [k, es] of Object.entries(added)) merged[k] = [...(led[k] || []), ...es];
        lines.push(`${headLabel(head)} (${periodLabel(period)}): regenerated, ${await regenerate(head, merged, inScope)}`);
      }
      report(lines);
      setReason('');
    });
  };

  const chip = (on: boolean) => `flex-1 text-sm font-bold px-3 py-2.5 rounded-xl border ${on ? 'bg-[#4f46e5] border-[#9aa8ff] text-white' : 'bg-[#0d1224] border-[#2f3a6b] text-[#aab4dc]'}`;

  return (
    <section className={`${card} space-y-3`}>
      <h3 className="text-sm font-bold text-[#ffe3a3] uppercase tracking-wider">Remove or regenerate bills</h3>
      <p className="text-xs text-[#aab4dc]">Pick the head and scope. The month or year is the one chosen at the top of this page.</p>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-[11px] font-bold text-[#aab4dc] uppercase">Bill head
          <select className={`${sel} mt-1`} value={head} onChange={(e) => setHead(e.target.value as HeadId)}>
            {heads.map((h) => <option key={h} value={h}>{headLabel(h)}</option>)}
          </select></label>
        <div className="text-[11px] font-bold text-[#aab4dc] uppercase">Period
          <div className="mt-1 h-11 rounded-lg bg-[#121830] border border-[#252e56] px-3 flex items-center text-sm text-white normal-case">{periodLabel(period)}</div></div>
      </div>

      <div className="flex gap-2">
        {([['town', 'Whole town'], ['ward', 'One ward'], ['structure', 'One structure']] as [Scope, string][]).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={scope === k} onClick={() => setScope(k)} className={chip(scope === k)}>{l}</button>
        ))}
      </div>

      {scope === 'ward' && (
        <select className={sel} value={ward} onChange={(e) => setWard(e.target.value)}>
          <option value="">Choose ward…</option>
          {wards.map((w) => <option key={w} value={w}>Ward {w}</option>)}
        </select>
      )}

      {scope === 'structure' && (structure
        ? (
          <div className="rounded-lg bg-[#121830] border border-[#252e56] p-3 flex items-center gap-2">
            <span className="flex-1 min-w-0 text-sm text-white"><b>{structure.owner || 'Owner not entered'}</b><span className="block text-xs text-[#aab4dc]">{structure.id} · Ward {structure.ward}</span></span>
            <button type="button" onClick={() => { setStructure(null); setQ(''); }} className="text-xs font-bold text-[#9aa8ff]">Change</button>
          </div>
        )
        : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa8ff]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Property ID, owner or house no." className="w-full h-11 pl-9 pr-3 rounded-lg bg-[#0d1224] border border-[#2f3a6b] text-sm text-white outline-none focus:border-[#9aa8ff]" />
            </div>
            {found.map((r) => (
              <button key={r.id} type="button" onClick={() => setStructure(r)} className="w-full text-left rounded-lg bg-[#121830] border border-[#252e56] p-2.5 text-sm text-white">
                <b>{r.owner || 'Owner not entered'}</b><span className="block text-xs text-[#aab4dc]">{r.id} · Ward {r.ward}{r.hno ? ` · ${r.hno}` : ''}</span>
              </button>
            ))}
          </div>
        ))}

      {scopeReady && (
        <div className="rounded-lg bg-[#121830] p-3 text-sm">
          <b className="text-white">{plan.items.length} bill{plan.items.length === 1 ? '' : 's'}</b> <span className="text-[#aab4dc]">can be removed in {where}</span>
          <b className="ml-2 text-[#ffe3a3]">{money(plan.amount)}</b>
          {plan.keptPaid > 0 && <p className="text-[11px] text-[#ffe3a3] mt-1 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 flex-none mt-0.5" />{plan.keptPaid} bill{plan.keptPaid > 1 ? 's have' : ' has'} a payment and will be kept. Reverse the payment first if that bill must go.</p>}
        </div>
      )}

      <label className="block text-[11px] font-bold text-[#aab4dc] uppercase">Reason (required)
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. wrong rate used, billed vacant units" className={`${sel} mt-1 font-normal normal-case`} />
      </label>

      <div className="flex gap-2">
        <button type="button" disabled={!ok} onClick={() => go(false)} className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold px-3 py-3 rounded-xl bg-[#3a1d27] border border-[#7a3140] text-[#ffb4a8] disabled:opacity-40"><Trash2 className="w-4 h-4" /> Remove</button>
        <button type="button" disabled={!ok} onClick={() => go(true)} className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold px-3 py-3 rounded-xl bg-[#f2b233] text-[#2b1d00] disabled:opacity-40"><RefreshCw className="w-4 h-4" /> Remove &amp; regenerate</button>
      </div>
      <p className="text-[11px] text-[#8790bd]">Regenerated bills use today's amounts and units. The automatic daily billing does not bring a removed bill back.</p>
    </section>
  );
};
