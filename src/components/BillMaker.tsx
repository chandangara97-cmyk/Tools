import React, { useMemo, useState } from 'react';
import { Printer, Download } from 'lucide-react';
import type { PropertyRecord } from '../utils/gisUtils';
import { triggerFileDownload } from '../utils/gisUtils';
import { useAuth } from '../services/auth';
import { HeadId } from '../services/heads';
import { periodLabel, rupeesInWords, todayIso } from '../services/collection';
import type { PropertyLiability } from '../services/liability';
import { unitList, UNIT_SEP } from '../services/units';
import { BILL_NAME } from './WorkMenu';
import { money, esc, printHtml } from './CollectionPanel';

export interface OwnerRow { r: PropertyRecord; l: PropertyLiability }
interface Item { key: string; r: PropertyRecord; unit?: string; head: HeadId; fy: string; dueDate: string; principal: number; interest: number; total: number }

function billHtml(town: string, items: Item[], by: string, now: Date) {
  const total = items.reduce((a, i) => a + i.total, 0);
  const owners = [...new Set(items.map((i) => i.r.owner))].join(', ');
  const props = [...new Map(items.map((i) => [i.r.id, i.r])).values()];
  const stamp = `${todayIso()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const hasUnit = items.some((i) => i.unit);
  const rows = items.map((i) => `<tr><td>${esc(BILL_NAME[i.head])}</td>${hasUnit ? `<td>${esc(i.unit || '')}</td>` : ''}${props.length > 1 ? `<td>${esc(i.r.id)}</td>` : ''}<td>${esc(periodLabel(i.fy))}</td><td>${esc(i.dueDate)}</td><td class="r">${money(i.principal)}</td><td class="r">${money(i.interest)}</td><td class="r">${money(i.total)}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Bill ${esc(props[0]?.id || '')}</title>
<style>body{font-family:Arial,sans-serif;font-size:13px;margin:24px;color:#111}h1{font-size:18px;margin:0}h2{font-size:14px;margin:2px 0 14px}
table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #999;padding:5px 8px;text-align:left}.r{text-align:right}
.kv td{border:none;padding:2px 8px 2px 0}.big{font-size:17px;font-weight:bold}.sig{margin-top:48px;display:flex;justify-content:space-between}small{color:#555}</style></head><body>
<h1>${esc(town)}</h1><h2>Bill for dues</h2>
<table class="kv"><tr><td>Owner</td><td><b>${esc(owners)}</b></td><td>Date</td><td><b>${esc(stamp)}</b></td></tr>
${props.map((r) => `<tr><td>Property ID</td><td>${esc(r.id)}</td><td>Ward / house</td><td>${esc(r.ward)}${r.hno ? ' / ' + esc(r.hno) : ''}</td></tr>`).join('')}</table>
<table><tr><th>Bill</th>${hasUnit ? '<th>Unit / occupant</th>' : ''}${props.length > 1 ? '<th>Property</th>' : ''}<th>Period</th><th>Due date</th><th class="r">Tax / charge</th><th class="r">Interest</th><th class="r">Due</th></tr>${rows}</table>
<p class="big">Total payable: ${money(total)}</p><p>${esc(rupeesInWords(total))}</p>
<p><small>Amounts are as on the date above. Interest may increase them after the due date. This is a bill, not a receipt.</small></p>
<div class="sig"><span>Prepared by ${esc(by)}</span><span>Cashier</span></div></body></html>`;
}

/** Cashier / supervisor / admin: a printable bill for everything due, or only the items the customer asks for. */
export const BillMaker: React.FC<{ town: string; rows: OwnerRow[]; currentId: string; onClose: () => void }> = ({ town, rows, currentId, onClose }) => {
  const { displayName } = useAuth();
  const [mode, setMode] = useState<'full' | 'choose'>('full');
  const [withOwner, setWithOwner] = useState(false);
  const [off, setOff] = useState<Record<string, boolean>>({}); // items the customer did not ask for

  // Garbage is billed per unit: one line per unit and period. Other heads stay one line per period.
  const all = useMemo<Item[]>(() => rows.flatMap(({ r, l }) => l.heads.flatMap((h): Item[] => {
    if (h.units && h.units.length) {
      const names = new Map(unitList(r).map((u) => [`${r.id}${UNIT_SEP}${u.id}`, `${u.label} · ${u.occupant || r.owner}${u.occupantType === 'Tenant' ? ' (tenant)' : ''}`]));
      return h.units.flatMap((u) => u.periods.map((p) => ({
        key: `${r.id}|${h.head}|${u.key}|${p.fy}`, r, head: h.head, unit: names.get(u.key) || 'Earlier bills (whole building)',
        fy: p.fy, dueDate: p.dueDate, principal: p.principal, interest: p.interest, total: p.total,
      })));
    }
    return h.periods.map((p) => ({
      key: `${r.id}|${h.head}|${p.fy}`, r, head: h.head, fy: p.fy, dueDate: p.dueDate, principal: p.principal, interest: p.interest, total: p.total,
    }));
  })), [rows]);
  const scope = all.filter((i) => withOwner || i.r.id === currentId);
  const picked = mode === 'full' ? scope : scope.filter((i) => !off[i.key]);
  const total = picked.reduce((a, i) => a + i.total, 0);
  const otherProps = rows.length > 1;

  const make = () => billHtml(town, picked, displayName || '', new Date());
  const chip = (on: boolean) => `flex-1 text-sm font-bold px-3 py-2.5 rounded-xl border ${on ? 'bg-[#4f46e5] border-[#9aa8ff] text-white' : 'bg-[#0d1224] border-[#2f3a6b] text-[#aab4dc]'}`;

  return (
    <div className="stub bg-[#181f3d] border border-[#f2b233] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-white">Generate bill</h3>
        <button type="button" onClick={onClose} className="text-sm font-bold text-[#9aa8ff]">Close</button>
      </div>
      <div className="flex gap-2">
        <button type="button" aria-pressed={mode === 'full'} onClick={() => setMode('full')} className={chip(mode === 'full')}>Full bill</button>
        <button type="button" aria-pressed={mode === 'choose'} onClick={() => setMode('choose')} className={chip(mode === 'choose')}>Customer’s choice</button>
      </div>
      {otherProps && (
        <label className="flex items-center gap-2 text-sm text-[#d6dcf5]">
          <input type="checkbox" checked={withOwner} onChange={(e) => setWithOwner(e.target.checked)} className="w-4 h-4 accent-[#9aa8ff]" />
          Include the owner’s other properties
        </label>
      )}
      {mode === 'choose' && (
        <div className="space-y-1">
          <div className="flex gap-3 text-xs font-bold text-[#9aa8ff]">
            <button type="button" onClick={() => setOff({})}>Select all</button>
            <button type="button" onClick={() => setOff(Object.fromEntries(all.map((i) => [i.key, true])))}>Clear</button>
          </div>
          {scope.map((i) => (
            <label key={i.key} className="flex items-center gap-3 bg-[#121830] border border-[#252e56] rounded-lg p-2.5 text-sm text-white">
              <input type="checkbox" checked={!off[i.key]} onChange={(e) => setOff({ ...off, [i.key]: !e.target.checked })} className="w-5 h-5 accent-[#9aa8ff] flex-none" />
              <span className="flex-1 min-w-0">
                <b>{BILL_NAME[i.head]}</b>{i.unit ? <> · {i.unit}</> : null} · {periodLabel(i.fy)}
                {withOwner && <span className="block text-xs text-[#aab4dc]">{i.r.id}</span>}
              </span>
              <span className="slab font-bold text-[#ff6b6f] whitespace-nowrap">{money(i.total)}</span>
            </label>
          ))}
        </div>
      )}
      {!scope.length && <p className="text-sm text-[#aab4dc]">Nothing is due, so there is nothing to bill.</p>}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-sm text-[#aab4dc]">Bill total <b className="slab text-xl text-[#ffe3a3]">{money(total)}</b></span>
        <span className="flex gap-2">
          <button type="button" disabled={!picked.length} onClick={() => printHtml(make())} className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-[#f2b233] text-[#2b1d00] disabled:opacity-40"><Printer className="w-4 h-4" /> Print</button>
          <button type="button" disabled={!picked.length} onClick={() => triggerFileDownload(make(), `Bill_${currentId}_${todayIso()}.html`, 'text/html')} className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-[#1d2547] border border-[#2f3a6b] text-[#aab4dc] disabled:opacity-40"><Download className="w-4 h-4" /> Download</button>
        </span>
      </div>
    </div>
  );
};
