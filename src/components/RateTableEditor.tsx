import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { RateTable, Adjustment, AgeBand, validateRateTable } from '../services/assessment';

interface Props {
  initial: RateTable;
  busy: boolean;
  onSave: (t: RateTable) => void;
}

const inp = 'w-full bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded-lg p-2 focus:border-[#9aa8ff]';
const lbl = 'block text-[11px] text-[#aab4dc] mb-1 font-semibold';
const card = 'bg-[#12172e] border border-[#28325c] rounded-lg p-3 space-y-2';

const SUGGEST: Record<string, string[]> = {
  zoneF1: ['A', 'B'],
  structureF2: ['RCC', 'Pucca (other)', 'Semi-pucca', 'Kutcha'],
  occupancyF4: ['Owner-occupied', 'Let out', 'Vacant'],
  useF5: ['Residential', 'Commercial', 'Mixed use', 'Industrial', 'Institutional', 'Vacant land'],
  classFactor: [],
};

type MapKey = 'zoneF1' | 'structureF2' | 'occupancyF4' | 'useF5' | 'classFactor';

const MapEditor: React.FC<{
  id: MapKey; title: string; code: string; hint: string;
  map: Record<string, number>; clause: string;
  onMap: (m: Record<string, number>) => void; onClause: (c: string) => void;
}> = ({ id, title, code, hint, map, clause, onMap, onClause }) => {
  // keep rows in a stable order: named rows first, "default" last
  const keys = Object.keys(map).filter((k) => k !== 'default');
  const setKey = (old: string, nw: string) => {
    if (!nw.trim() || (nw !== old && nw in map)) return;
    const next: Record<string, number> = {};
    for (const k of Object.keys(map)) next[k === old ? nw : k] = map[k];
    onMap(next);
  };
  const setVal = (k: string, v: string) => onMap({ ...map, [k]: v === '' ? 0 : Number(v) });
  const del = (k: string) => { const n = { ...map }; delete n[k]; onMap(n); };
  const add = () => {
    let name = 'new'; let i = 1;
    while (name in map) name = `new${i++}`;
    onMap({ ...map, [name]: 1 });
  };
  return (
    <div className={card}>
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-xs font-bold text-white">{code} {title}</h4>
        <span className="text-[10px] text-[#8790bd]">{hint}</span>
      </div>
      <datalist id={`dl-${id}`}>{SUGGEST[id].map((s) => <option key={s} value={s} />)}</datalist>
      {keys.map((k) => (
        <div key={k} className="grid grid-cols-[1fr_90px_32px] gap-2 items-center">
          <input className={inp} defaultValue={k} list={`dl-${id}`} onBlur={(e) => setKey(k, e.target.value)} />
          <input className={inp} type="number" step="any" value={map[k]} onChange={(e) => setVal(k, e.target.value)} />
          <button type="button" onClick={() => del(k)} aria-label="Remove row" className="text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      <div className="grid grid-cols-[1fr_90px_32px] gap-2 items-center">
        <span className="text-xs text-[#ffe3a3] px-1">anything else (default)</span>
        <input className={inp} type="number" step="any" value={map.default ?? 1} onChange={(e) => setVal('default', e.target.value)} />
        <span />
      </div>
      <button type="button" onClick={add} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9aa8ff]"><Plus className="w-3 h-3" /> Add row</button>
      <div>
        <label className={lbl}>Bylaw clause for this rule</label>
        <input className={inp} value={clause} placeholder="e.g. Rule 12(3), Schedule II" onChange={(e) => onClause(e.target.value)} />
      </div>
    </div>
  );
};

export const RateTableEditor: React.FC<Props> = ({ initial, busy, onSave }) => {
  const [t, setT] = useState<RateTable>(() => ({
    ...initial,
    bylaw: initial.bylaw || { title: '', authority: '', notificationNo: '', notificationDate: '', notes: '' },
    clauses: initial.clauses || {},
    adjustments: initial.adjustments || [],
  }));
  const [err, setErr] = useState('');
  const set = (patch: Partial<RateTable>) => setT((p) => ({ ...p, ...patch }));
  const clause = (k: string) => t.clauses?.[k] || '';
  const setClause = (k: string, v: string) => set({ clauses: { ...t.clauses, [k]: v } });
  const bylaw = t.bylaw!;
  const setBylaw = (patch: Partial<typeof bylaw>) => set({ bylaw: { ...bylaw, ...patch } });

  const bands = [...t.ageF3];
  const setBand = (i: number, patch: Partial<AgeBand>) => set({ ageF3: bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const adjs = t.adjustments || [];
  const setAdj = (i: number, patch: Partial<Adjustment>) => set({ adjustments: adjs.map((a, j) => (j === i ? { ...a, ...patch } : a)) });

  const save = () => {
    const cleaned: RateTable = {
      ...t,
      id: t.effectiveFrom,
      ageF3: [...t.ageF3].sort((a, b) => (a.maxAge ?? Infinity) - (b.maxAge ?? Infinity)),
    };
    const e = validateRateTable(cleaned);
    if (e) { setErr(e); return; }
    if (cleaned.status === 'approved' && cleaned.taxRatePct === null && !window.confirm('Tax rate % is empty, so no tax will be computed. Save as approved anyway?')) return;
    if (cleaned.status === 'approved' && !cleaned.bylaw?.notificationNo.trim() &&
        !window.confirm('No bylaw notification number is entered. Save as approved anyway?')) return;
    setErr('');
    onSave(cleaned);
  };

  return (
    <div className="mt-3 space-y-4">
      <p className="text-[11px] text-[#aab4dc]">Type the values from your town's bylaws. Existing assessments keep the table they were made with; new assessments use this one.</p>

      <div className={card}>
        <h4 className="text-xs font-bold text-white">Bylaw reference</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div><label className={lbl}>Bylaw / rules title</label><input className={inp} value={bylaw.title} onChange={(e) => setBylaw({ title: e.target.value })} /></div>
          <div><label className={lbl}>Notifying authority</label><input className={inp} value={bylaw.authority} onChange={(e) => setBylaw({ authority: e.target.value })} /></div>
          <div><label className={lbl}>Notification no.</label><input className={inp} value={bylaw.notificationNo} onChange={(e) => setBylaw({ notificationNo: e.target.value })} /></div>
          <div><label className={lbl}>Notification date</label><input className={inp} type="date" value={bylaw.notificationDate} onChange={(e) => setBylaw({ notificationDate: e.target.value })} /></div>
        </div>
        <div><label className={lbl}>Notes</label><textarea className={inp} rows={2} value={bylaw.notes} onChange={(e) => setBylaw({ notes: e.target.value })} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div><label className={lbl}>Effective from</label><input className={inp} type="date" value={t.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} /></div>
          <div>
            <label className={lbl}>Status</label>
            <select className={inp} value={t.status} onChange={(e) => set({ status: e.target.value as RateTable['status'] })}>
              <option value="placeholder">placeholder (not official)</option>
              <option value="approved">approved (matches the bylaws)</option>
            </select>
          </div>
        </div>
      </div>

      <MapEditor id="zoneF1" code="F1" title="Location factor, by zone" hint="zone code, factor" map={t.zoneF1} clause={clause('F1')} onMap={(m) => set({ zoneF1: m })} onClause={(c) => setClause('F1', c)} />
      <MapEditor id="structureF2" code="F2" title="Structure factor" hint="structure type, factor" map={t.structureF2} clause={clause('F2')} onMap={(m) => set({ structureF2: m })} onClause={(c) => setClause('F2', c)} />

      <div className={card}>
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-xs font-bold text-white">F3 Age factor, by age of building</h4>
          <span className="text-[10px] text-[#8790bd]">up to N years old, factor</span>
        </div>
        {bands.map((b, i) => (
          <div key={i} className="grid grid-cols-[1fr_90px_32px] gap-2 items-center">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#aab4dc] whitespace-nowrap">up to</span>
              <input className={inp} type="number" min={0} placeholder="no limit" value={b.maxAge ?? ''} onChange={(e) => setBand(i, { maxAge: e.target.value === '' ? null : Number(e.target.value) })} />
              <span className="text-[11px] text-[#aab4dc]">years</span>
            </div>
            <input className={inp} type="number" step="any" value={b.factor} onChange={(e) => setBand(i, { factor: e.target.value === '' ? 0 : Number(e.target.value) })} />
            <button type="button" disabled={bands.length < 2} onClick={() => set({ ageF3: bands.filter((_, j) => j !== i) })} aria-label="Remove band" className="text-red-300 p-1 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <p className="text-[10px] text-[#8790bd]">Leave "years" empty on the last band for buildings older than all the others.</p>
        <button type="button" onClick={() => set({ ageF3: [...bands, { maxAge: 0, factor: 1 }] })} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9aa8ff]"><Plus className="w-3 h-3" /> Add age band</button>
        <div><label className={lbl}>Bylaw clause for this rule</label><input className={inp} value={clause('F3')} onChange={(e) => setClause('F3', e.target.value)} /></div>
      </div>

      <MapEditor id="occupancyF4" code="F4" title="Occupancy factor" hint="occupancy, factor" map={t.occupancyF4} clause={clause('F4')} onMap={(m) => set({ occupancyF4: m })} onClause={(c) => setClause('F4', c)} />
      <MapEditor id="useF5" code="F5" title="Use factor" hint="use category, factor" map={t.useF5} clause={clause('F5')} onMap={(m) => set({ useF5: m })} onClause={(c) => setClause('F5', c)} />
      <MapEditor id="classFactor" code="Class" title="Classification factor" hint="class code, factor" map={t.classFactor} clause={clause('Class')} onMap={(m) => set({ classFactor: m })} onClause={(c) => setClause('Class', c)} />

      <div className={card}>
        <h4 className="text-xs font-bold text-white">Rebate, tax rate and vacant land</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Rebate on rateable value (%)</label>
            <input className={inp} type="number" step="any" min={0} max={100} value={t.rebatePct} onChange={(e) => set({ rebatePct: e.target.value === '' ? 0 : Number(e.target.value) })} />
            <input className={`${inp} mt-1`} placeholder="Bylaw clause" value={clause('Rebate')} onChange={(e) => setClause('Rebate', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Tax rate on net taxable value (%)</label>
            <input className={inp} type="number" step="any" min={0} placeholder="not set" value={t.taxRatePct ?? ''} onChange={(e) => set({ taxRatePct: e.target.value === '' ? null : Number(e.target.value) })} />
            <input className={`${inp} mt-1`} placeholder="Bylaw clause" value={clause('TaxRate')} onChange={(e) => setClause('TaxRate', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Vacant land base rate (₹/sq m)</label>
            <input className={inp} type="number" step="any" min={0} placeholder="10" value={t.landRatePerSqM ?? ''} onChange={(e) => set({ landRatePerSqM: e.target.value === '' ? undefined : Number(e.target.value) })} />
            <input className={`${inp} mt-1`} placeholder="Bylaw clause" value={clause('LandRate')} onChange={(e) => setClause('LandRate', e.target.value)} />
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-xs font-bold text-white">Other charges and deductions from the bylaws</h4>
          <span className="text-[10px] text-[#8790bd]">cess, surcharge, concession, flat fee</span>
        </div>
        {adjs.length === 0 && <p className="text-[11px] text-[#8790bd]">None entered.</p>}
        {adjs.map((a, i) => (
          <div key={i} className="border border-[#28325c] rounded-lg p-2 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><label className={lbl}>Name</label><input className={inp} value={a.name} onChange={(e) => setAdj(i, { name: e.target.value })} /></div>
              <div><label className={lbl}>Bylaw clause</label><input className={inp} value={a.clause || ''} onChange={(e) => setAdj(i, { clause: e.target.value })} /></div>
              <div>
                <label className={lbl}>Applied to</label>
                <select className={inp} value={a.base} onChange={(e) => setAdj(i, { base: e.target.value as Adjustment['base'] })}>
                  <option value="rateable">rateable value (changes the taxable value)</option>
                  <option value="tax">the tax amount</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Type</label>
                <select className={inp} value={a.kind} onChange={(e) => setAdj(i, { kind: e.target.value as Adjustment['kind'] })}>
                  <option value="percent">percent</option>
                  <option value="flat">flat rupees per property</option>
                </select>
              </div>
              <div><label className={lbl}>Value (negative = deduction)</label><input className={inp} type="number" step="any" value={a.value} onChange={(e) => setAdj(i, { value: e.target.value === '' ? 0 : Number(e.target.value) })} /></div>
              <div>
                <label className={lbl}>Only for use category</label>
                <select className={inp} value={a.appliesToUse || ''} onChange={(e) => setAdj(i, { appliesToUse: e.target.value })}>
                  <option value="">all properties</option>
                  {SUGGEST.useF5.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <button type="button" onClick={() => set({ adjustments: adjs.filter((_, j) => j !== i) })} className="inline-flex items-center gap-1 text-[11px] font-bold text-red-300"><Trash2 className="w-3 h-3" /> Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => set({ adjustments: [...adjs, { name: '', base: 'tax', kind: 'percent', value: 0, appliesToUse: '' }] })} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9aa8ff]"><Plus className="w-3 h-3" /> Add charge or deduction</button>
      </div>

      {err && <p className="text-xs text-red-300">{err}</p>}
      <button type="button" disabled={busy} onClick={save} className="bg-[#4f46e5] disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg">Save rate table</button>
    </div>
  );
};
