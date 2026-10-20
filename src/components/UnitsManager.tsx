import React, { useMemo, useState } from 'react';
import { Search, Plus, Trash2, Save, CloudUpload, Cloud, CloudOff, Lock, X } from 'lucide-react';
import type { PropertyRecord } from '../utils/gisUtils';
import { PropertyUnit, unitList, unitsToRecord, nextUnitId, UNIT_SEP } from '../services/units';
import { useLedgers } from '../services/collectionStore';
import { usePayableRates, fixedAmountFor, isMonthly } from '../services/payableRates';
import { queueSave, flush, useSyncState } from '../services/syncQueue';
import { money } from './CollectionPanel';

type Draft = PropertyUnit & { saved?: boolean };
type Filter = 'all' | 'with' | 'without';

interface Props {
  townKey: string;
  townName: string;
  records: PropertyRecord[];
  /** Whether this login may change records (surveyor, supervisor, admin). */
  canEdit: boolean;
  /** Called with the saved record so the rest of the app shows the new units at once. */
  onSaved: (rec: PropertyRecord) => void;
}

const field = 'w-full h-10 rounded-lg bg-[#0d1224] border border-[#2f3a6b] px-2 text-sm text-white outline-none focus:border-[#9aa8ff]';
const occFor = (t: PropertyUnit['occupantType']) => (t === 'Tenant' ? 'Tenanted' : t === 'Vacant' ? 'Vacant' : 'Owner-occupied');

/**
 * Units page: the shops, flats and floors inside a structure. Garbage is billed per active unit, so this is
 * where staff add, edit, close or remove them. Every save goes through the offline queue (saved on the device
 * first, then uploaded to Firebase), and "Sync now" pushes anything still waiting.
 */
export const UnitsManager: React.FC<Props> = ({ townKey, townName, records, canEdit, onSaved }) => {
  const sync = useSyncState();
  const ledgers = useLedgers(townKey, 'garbage');
  const ratesAll = usePayableRates(townKey);
  const rates = ratesAll.garbage;

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft[]>([]);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const town = useMemo(() => records.filter((r) => r && r.id && r.town === townName), [records, townName]);
  const picked = pickedId ? town.find((r) => r.id === pickedId) : undefined;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return town
      .filter((r) => {
        const n = unitList(r).length;
        if (filter === 'with' && !n) return false;
        if (filter === 'without' && n) return false;
        if (!s) return true;
        return [r.id, r.owner, r.hno, r.ward, r.upn, r.addr].some((x) => String(x ?? '').toLowerCase().includes(s));
      })
      .slice(0, 60);
  }, [town, q, filter]);

  const choose = (r: PropertyRecord) => {
    if (dirty && !window.confirm('You have unsaved unit changes. Leave without saving?')) return;
    setPickedId(r.id); setDraft(unitList(r).map((u) => ({ ...u, saved: true }))); setDirty(false); setMsg(null);
  };

  const hasBills = (u: Draft) => !!u.saved && (ledgers[`${picked?.id}${UNIT_SEP}${u.id}`] || []).length > 0;
  const edit = (i: number, patch: Partial<Draft>) => { setDraft((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x))); setDirty(true); setMsg(null); };
  const setOcc = (i: number, t: PropertyUnit['occupantType']) => edit(i, { occupantType: t, occupancyStatus: occFor(t) });

  const add = () => {
    if (!picked) return;
    const id = nextUnitId(draft);
    setDraft([...draft, {
      id, label: '', use: 'Residential', occupantType: 'Owner', occupant: '', active: true,
      occupancyStatus: 'Owner-occupied', unitId: `${picked.id}-${id}`, parentPropertyId: picked.id,
    }]);
    setDirty(true); setMsg(null);
  };
  const remove = (i: number) => {
    const u = draft[i];
    if (hasBills(u)) return;
    if (u.saved && !window.confirm(`Remove "${u.label || u.id}" from this structure?`)) return;
    setDraft(draft.filter((_, j) => j !== i)); setDirty(true); setMsg(null);
  };

  const save = () => {
    if (!picked || !canEdit) return;
    const noName = draft.find((u) => !u.label.trim());
    if (noName) { setMsg({ type: 'err', text: `Give every unit a name (e.g. "Shop 01"). ${noName.id} has none.` }); return; }
    const noTenant = draft.find((u) => u.occupantType === 'Tenant' && !u.occupant.trim());
    if (noTenant) { setMsg({ type: 'err', text: `Enter the tenant's name for "${noTenant.label}", or change it to Owner or Vacant.` }); return; }
    const dup = draft.find((u, i) => draft.findIndex((x) => x.label.trim().toLowerCase() === u.label.trim().toLowerCase()) !== i);
    if (dup) { setMsg({ type: 'err', text: `Two units are named "${dup.label}". Give each a different name.` }); return; }

    const { units: _old, ...rest } = picked;
    const nextUnits = unitsToRecord(draft);
    const next: PropertyRecord = { ...rest, ...(nextUnits ? { units: nextUnits } : {}) } as PropertyRecord;
    const saved = queueSave(townKey, next, [], picked); // device first, then Firebase
    onSaved(saved);
    setDraft(unitList(saved).map((u) => ({ ...u, saved: true })));
    setDirty(false);
    setMsg({ type: 'ok', text: `Saved ${draft.length} unit${draft.length === 1 ? '' : 's'} for ${picked.id}. ${sync.online ? 'Uploading to Firebase…' : 'Will upload when you are back online.'}` });
  };

  const active = draft.filter((u) => u.active);
  const perUnit = (u: Draft) => fixedAmountFor(rates, u.use);
  const monthTotal = active.reduce((a, u) => a + (perUnit(u) ?? 0), 0);
  const per = isMonthly('garbage', rates) ? 'month' : 'year';
  const vacantActive = active.filter((u) => u.occupantType === 'Vacant').length;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      {/* Sync status */}
      <div className="rounded-2xl bg-[#181f3d] border border-[#2f3a6b] p-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 rounded px-2 py-1 font-semibold ${sync.online ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {sync.online ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}{sync.online ? 'Connected to Firebase' : 'Offline: saved on this device'}
        </span>
        <span className="text-[#aab4dc]">{sync.pending ? `${sync.pending} change${sync.pending > 1 ? 's' : ''} waiting to upload` : 'Everything is uploaded'}</span>
        <button type="button" disabled={!sync.online || sync.flushing || !sync.pending} onClick={() => void flush()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold bg-[#4f46e5] text-white disabled:opacity-40">
          <CloudUpload className="w-4 h-4" /> {sync.flushing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {/* Structure list */}
      {!picked && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa8ff] pointer-events-none" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Property ID, owner, house no. or ward"
              className="w-full h-12 pl-10 pr-3 rounded-xl bg-[#181f3d] border-2 border-[#2f3a6b] focus:border-[#9aa8ff] outline-none text-white placeholder:text-[#8790bd]" />
          </div>
          <div className="flex gap-2 text-xs font-bold">
            {([['all', 'All'], ['with', 'With units'], ['without', 'No units']] as [Filter, string][]).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setFilter(k)} className={`px-3 py-2 rounded-lg border ${filter === k ? 'bg-[#4f46e5] border-[#9aa8ff] text-white' : 'bg-[#0d1224] border-[#2f3a6b] text-[#aab4dc]'}`}>{l}</button>
            ))}
          </div>
          <div className="space-y-2">
            {list.map((r) => {
              const n = unitList(r).length;
              return (
                <button key={r.id} type="button" onClick={() => choose(r)} className="w-full text-left rounded-xl bg-[#181f3d] border border-[#252e56] p-3 flex items-center gap-3">
                  <span className="flex-1 min-w-0">
                    <b className="text-white block truncate">{r.owner || 'Owner not entered'}</b>
                    <span className="text-xs text-[#aab4dc]">{r.id} · Ward {r.ward}{r.hno ? ` · ${r.hno}` : ''} · {r.use}</span>
                  </span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${n ? 'bg-emerald-100 text-emerald-800' : 'bg-[#0d1224] text-[#aab4dc] border border-[#2f3a6b]'}`}>{n ? `${n} unit${n > 1 ? 's' : ''}` : 'No units'}</span>
                </button>
              );
            })}
            {!list.length && <p className="text-sm text-[#aab4dc] text-center py-6">No structure found.</p>}
            {town.length > 60 && !q && <p className="text-xs text-[#8790bd] text-center">Showing 60 of {town.length}. Search to narrow down.</p>}
          </div>
        </div>
      )}

      {/* One structure */}
      {picked && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-[#181f3d] border border-[#2f3a6b] p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{picked.owner || 'Owner not entered'}</h2>
              <p className="text-xs text-[#aab4dc]">{picked.id} · Ward {picked.ward}{picked.hno ? ` · ${picked.hno}` : ''} · {picked.use}</p>
            </div>
            <button type="button" aria-label="Back to list" onClick={() => { if (dirty && !window.confirm('Discard unsaved unit changes?')) return; setPickedId(null); setDirty(false); setMsg(null); }}
              className="w-9 h-9 grid place-items-center rounded-lg border border-[#2f3a6b] text-[#aab4dc]"><X className="w-4 h-4" /></button>
          </div>

          {!canEdit && <p className="rounded-lg bg-amber-100 text-amber-900 text-xs font-semibold p-2">Your login can view units but not change them.</p>}

          {draft.map((u, i) => {
            const billed = hasBills(u);
            const amt = perUnit(u);
            return (
              <div key={u.id} className={`rounded-2xl border p-3 space-y-2 ${u.active ? 'bg-[#181f3d] border-[#2f3a6b]' : 'bg-[#121830] border-[#252e56] opacity-80'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#9aa8ff]">{u.id}</span>
                  {u.active && amt !== null && <span className="text-xs text-[#ffe3a3] font-bold">{money(amt)} / {per}</span>}
                  {u.active && amt === null && <span className="text-xs text-[#ff9a9a] font-bold">No rate set</span>}
                  {!u.active && <span className="text-xs text-[#aab4dc] font-bold">Closed: not billed</span>}
                  {billed && <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#aab4dc]"><Lock className="w-3 h-3" /> Has bills</span>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-[#aab4dc] col-span-2">Unit name
                    <input disabled={!canEdit} className={field} value={u.label} placeholder="Shop 01 / Flat 2 / Ground floor" onChange={(e) => edit(i, { label: e.target.value })} /></label>
                  <label className="text-[11px] text-[#aab4dc]">Use
                    <select disabled={!canEdit} className={field} value={u.use} onChange={(e) => edit(i, { use: e.target.value as PropertyUnit['use'] })}><option>Residential</option><option>Commercial</option></select></label>
                  <label className="text-[11px] text-[#aab4dc]">Occupied by
                    <select disabled={!canEdit} className={field} value={u.occupantType} onChange={(e) => setOcc(i, e.target.value as PropertyUnit['occupantType'])}><option>Owner</option><option>Tenant</option><option>Vacant</option></select></label>
                  <label className="text-[11px] text-[#aab4dc]">Who pays
                    <input disabled={!canEdit} className={field} value={u.occupant} placeholder={u.occupantType === 'Tenant' ? "Tenant's name" : 'Name'} onChange={(e) => edit(i, { occupant: e.target.value })} /></label>
                  <label className="text-[11px] text-[#aab4dc]">Mobile
                    <input disabled={!canEdit} className={field} inputMode="tel" value={u.mobile || ''} onChange={(e) => edit(i, { mobile: e.target.value })} /></label>
                  {u.use === 'Commercial' && (
                    <label className="text-[11px] text-[#aab4dc] col-span-2">Business type
                      <input disabled={!canEdit} className={field} value={u.businessType || ''} placeholder="Pharmacy, clinic, hardware store…" onChange={(e) => edit(i, { businessType: e.target.value })} /></label>
                  )}
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input type="checkbox" disabled={!canEdit} checked={u.active} onChange={(e) => edit(i, { active: e.target.checked })} className="w-5 h-5 accent-[#9aa8ff]" /> In use
                  </label>
                  <span className="flex-1" />
                  {canEdit && (billed
                    ? <span className="text-[11px] text-[#aab4dc]">Billed units can only be closed, so old bills stay visible.</span>
                    : <button type="button" onClick={() => remove(i)} className="inline-flex items-center gap-1 text-xs font-bold text-[#ffb4a8]"><Trash2 className="w-4 h-4" /> Remove</button>)}
                </div>
              </div>
            );
          })}

          {!draft.length && <p className="text-sm text-[#aab4dc] text-center py-4">This structure has no units. {picked.use === 'Mixed' ? 'A Mixed building cannot be billed for garbage until you add its shops or flats.' : 'It is billed once, as one building, at its own rate.'}</p>}

          <div className="rounded-2xl bg-[#181f3d] border border-[#f2b233]/50 p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#aab4dc]">{active.length} unit{active.length === 1 ? '' : 's'} billed for garbage</span>
              <b className="text-[#ffe3a3]">{money(monthTotal)} / {per}</b>
            </div>
            {vacantActive > 0 && <p className="text-[11px] text-[#ffe3a3]">{vacantActive} vacant unit{vacantActive > 1 ? 's are' : ' is'} still billed while marked "In use". Untick "In use" to stop billing it.</p>}
            {msg && <p className={`text-xs font-semibold rounded p-2 ${msg.type === 'ok' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}`}>{msg.text}</p>}
            <div className="flex gap-2">
              {canEdit && <button type="button" onClick={add} className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold px-3 py-3 rounded-xl bg-[#1d2547] border border-[#2f3a6b] text-[#9aa8ff]"><Plus className="w-4 h-4" /> Add unit</button>}
              {canEdit && <button type="button" onClick={save} disabled={!dirty} className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold px-3 py-3 rounded-xl bg-[#f2b233] text-[#2b1d00] disabled:opacity-40"><Save className="w-4 h-4" /> Save units</button>}
            </div>
            <p className="text-[11px] text-[#8790bd]">Saving keeps the change on this device first, then uploads it to Firebase. New units get their garbage demand the next time demands are generated.</p>
          </div>
        </div>
      )}
    </div>
  );
};
