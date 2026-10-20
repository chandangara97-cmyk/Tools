/**
 * Monthly verification before demand generation (especially Garbage).
 * Shows every structure with its Residential / Commercial units name-wise,
 * allows add or remove (deactivate), then the admin confirms generation.
 */
import React, { useMemo, useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, Building2 } from 'lucide-react';
import type { PropertyRecord } from '../utils/gisUtils';
import {
  PropertyUnit, unitList, unitsToRecord, nextUnitId, isUnitHead, needsUnits, unitBilling,
} from '../services/units';
import type { HeadId } from '../services/heads';
import { headLabel } from '../services/heads';
import { fixedAmountFor, type PayableRates } from '../services/payableRates';
import { queueSave } from '../services/syncQueue';
import { periodLabel } from '../services/collection';
import { money } from './CollectionPanel';

type Draft = PropertyUnit & { saved?: boolean };

interface Props {
  townKey: string;
  townName: string;
  head: HeadId;
  period: string;
  /** Parent properties that will receive (or already have) demand for this period. */
  records: PropertyRecord[];
  rates: PayableRates | undefined;
  pendingAmount: number;
  pendingCount: number;
  canEdit: boolean;
  onRecordSaved: (rec: PropertyRecord) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const field =
  'w-full h-9 rounded-lg bg-[#0d1224] border border-[#2f3a6b] px-2 text-sm text-white outline-none focus:border-[#9aa8ff]';

export const UnitVerifyModal: React.FC<Props> = ({
  townKey, townName, head, period, records, rates, pendingAmount, pendingCount,
  canEdit, onRecordSaved, onConfirm, onCancel,
}) => {
  const unitHead = isUnitHead(head);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft[]>([]);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Group: parent property → units (for unit heads) or the property itself (for others)
  const structures = useMemo(() => {
    return records
      .filter((r) => r && r.id && r.town === townName)
      .map((r) => {
        const units = unitList(r);
        const inactive = units.filter((u) => !u.active);
        // Count exactly what the demand engine bills: every active unit, or the building itself when it has no units.
        const b = unitBilling(r);
        const resRate = fixedAmountFor(rates, 'Residential') ?? 0;
        const comRate = fixedAmountFor(rates, 'Commercial') ?? 0;
        const resAmt = resRate * b.residential;
        const comAmt = comRate * b.commercial;
        const needs = needsUnits(r);
        return { rec: r, units, resN: b.residential, comN: b.commercial, unitsN: b.total, resRate, comRate, inactive, resAmt, comAmt, total: resAmt + comAmt, needs };
      })
      .sort((a, b) => a.rec.id.localeCompare(b.rec.id));
  }, [records, townName, rates]);

  const openEdit = (r: PropertyRecord) => {
    if (dirty && !window.confirm('Unsaved unit changes. Discard them?')) return;
    setExpanded(r.id);
    setDraft(unitList(r).map((u) => ({ ...u, saved: true })));
    setDirty(false);
    setMsg(null);
  };

  const edit = (i: number, patch: Partial<Draft>) => {
    setDraft((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    setDirty(true);
    setMsg(null);
  };

  const addUnit = (use: 'Residential' | 'Commercial') => {
    if (!expanded) return;
    const id = nextUnitId(draft);
    setDraft([
      ...draft,
      {
        id,
        label: use === 'Commercial' ? `Shop ${id}` : `Unit ${id}`,
        use,
        occupantType: 'Owner',
        occupant: '',
        active: true,
        occupancyStatus: 'Owner-occupied',
        unitId: `${expanded}-${id}`,
        parentPropertyId: expanded,
      },
    ]);
    setDirty(true);
    setMsg(null);
  };

  const removeUnit = (i: number) => {
    const u = draft[i];
    // Soft-remove: mark inactive so history stays; if never saved, drop from draft
    if (u.saved) {
      edit(i, { active: false });
    } else {
      setDraft((d) => d.filter((_, j) => j !== i));
      setDirty(true);
    }
  };

  const saveUnits = async () => {
    const parent = structures.find((s) => s.rec.id === expanded)?.rec;
    if (!parent || !canEdit) return;
    setBusy(true);
    try {
      const nextUnits = unitsToRecord(draft);
      const { units: _drop, ...rest } = parent as PropertyRecord & { units?: unknown };
      const next: PropertyRecord = { ...rest, ...(nextUnits ? { units: nextUnits } : {}) } as PropertyRecord;
      const saved = queueSave(townKey, next, [], parent);
      onRecordSaved(saved);
      setDraft(unitList(saved).map((u) => ({ ...u, saved: true })));
      setDirty(false);
      setMsg('Units saved.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not save units.');
    }
    setBusy(false);
  };

  const totalRes = structures.reduce((a, s) => a + s.resN, 0);
  const totalCom = structures.reduce((a, s) => a + s.comN, 0);
  const totalAmt = structures.reduce((a, s) => a + s.total, 0);
  const needCount = structures.filter((s) => s.needs).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4">
      <div className="bg-[#12182e] border border-[#28325c] rounded-t-2xl sm:rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-[#28325c]">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#9aa8ff]" />
              Verify units before {headLabel(head)} demand
            </h2>
            <p className="text-sm text-[#aab4dc] mt-1">
              Period <b className="text-white">{periodLabel(period)}</b>
              {' · '}
              {pendingCount} bill{pendingCount === 1 ? '' : 's'} · {money(pendingAmount)}
            </p>
            <p className="text-xs text-[#8790bd] mt-1">
              Check every structure’s Residential and Commercial units by name. Add or remove as needed, then generate.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-2 rounded-lg text-[#aab4dc] hover:bg-[#1e2748]" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary bar */}
        <div className="px-4 py-2 bg-[#0d1224] border-b border-[#28325c] flex flex-wrap gap-3 text-xs">
          <span className="text-[#aab4dc]">Active Residential: <b className="text-white">{totalRes}</b></span>
          <span className="text-[#aab4dc]">Active Commercial: <b className="text-white">{totalCom}</b></span>
          <span className="text-[#aab4dc]">Total units: <b className="text-white">{totalRes + totalCom}</b></span>
          <span className="text-[#aab4dc]">Full month: <b className="text-white">{money(totalAmt)}</b></span>
          {needCount > 0 && (
            <span className="text-[#f2b233] font-bold">{needCount} mixed building{needCount > 1 ? 's' : ''} still need units</span>
          )}
        </div>

        {/* Structure list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {structures.length === 0 && (
            <p className="text-sm text-[#aab4dc] p-4 text-center">No properties in this town for this head.</p>
          )}
          {structures.map(({ rec, resN, comN, unitsN, resRate, comRate, resAmt, comAmt, total, needs }) => {
            const isOpen = expanded === rec.id;
            return (
              <div key={rec.id} className="rounded-xl border border-[#28325c] bg-[#181f3d] overflow-hidden">
                <button
                  type="button"
                  onClick={() => (isOpen ? (dirty ? null : setExpanded(null)) : openEdit(rec))}
                  className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-[#1e2748]"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {rec.id} · {rec.owner || '—'}
                    </div>
                    <div className="text-[11px] text-[#8790bd] truncate">
                      Ward {rec.ward || '—'}{rec.hno ? ` · H.No ${rec.hno}` : ''}{rec.addr ? ` · ${rec.addr}` : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    {needs ? (
                      <span className="text-[#f2b233] font-bold">Needs units</span>
                    ) : unitHead ? (
                      <>
                        <div className="text-[#aab4dc]">
                          R <b className="text-white">{resN}</b> · C <b className="text-white">{comN}</b> · {unitsN} unit{unitsN === 1 ? '' : 's'}
                        </div>
                        <div className="text-white font-bold">{money(total)}</div>
                      </>
                    ) : (
                      <div className="text-white font-bold">{rec.use || '—'}</div>
                    )}
                  </div>
                </button>

                {isOpen && unitHead && (
                  <div className="border-t border-[#28325c] p-3 space-y-2 bg-[#0d1224]">
                    {/* Active units */}
                    <div className="text-[11px] font-bold text-[#9aa8ff] uppercase">Active units (billed)</div>
                    {draft.filter((u) => u.active).length === 0 && (
                      <p className="text-xs text-[#f2b233]">No active units. Add at least one Residential or Commercial unit.</p>
                    )}
                    {draft.map((u, i) =>
                      u.active ? (
                        <div key={u.id} className="grid grid-cols-12 gap-1.5 items-center text-sm">
                          <div className="col-span-4">
                            <input
                              disabled={!canEdit}
                              className={field}
                              value={u.label}
                              placeholder="Label e.g. Ground Floor Shop 1"
                              onChange={(e) => edit(i, { label: e.target.value })}
                            />
                          </div>
                          <div className="col-span-2">
                            <select
                              disabled={!canEdit}
                              className={field}
                              value={u.use}
                              onChange={(e) => edit(i, { use: e.target.value as PropertyUnit['use'] })}
                            >
                              <option>Residential</option>
                              <option>Commercial</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <select
                              disabled={!canEdit}
                              className={field}
                              value={u.occupantType}
                              onChange={(e) =>
                                edit(i, {
                                  occupantType: e.target.value as PropertyUnit['occupantType'],
                                  occupancyStatus:
                                    e.target.value === 'Tenant'
                                      ? 'Tenanted'
                                      : e.target.value === 'Vacant'
                                        ? 'Vacant'
                                        : 'Owner-occupied',
                                })
                              }
                            >
                              <option>Owner</option>
                              <option>Tenant</option>
                              <option>Vacant</option>
                            </select>
                          </div>
                          <div className="col-span-3">
                            <input
                              disabled={!canEdit}
                              className={field}
                              value={u.occupant}
                              placeholder="Occupant name"
                              onChange={(e) => edit(i, { occupant: e.target.value })}
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            {canEdit && (
                              <button
                                type="button"
                                title="Remove (mark inactive)"
                                onClick={() => removeUnit(i)}
                                className="p-1.5 rounded-lg text-[#ff9fa2] hover:bg-[#2a1a2a]"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ) : null,
                    )}

                    {/* Inactive (closed) */}
                    {draft.some((u) => !u.active) && (
                      <>
                        <div className="text-[11px] font-bold text-[#8790bd] uppercase mt-2">Closed units (not billed)</div>
                        {draft.map((u, i) =>
                          !u.active ? (
                            <div key={u.id} className="flex items-center justify-between text-xs text-[#8790bd] py-1">
                              <span>
                                {u.label || u.id} · {u.use} · {u.occupant || '—'}
                              </span>
                              {canEdit && (
                                <button
                                  type="button"
                                  className="text-[#9aa8ff] font-bold"
                                  onClick={() => edit(i, { active: true })}
                                >
                                  Restore
                                </button>
                              )}
                            </div>
                          ) : null,
                        )}
                      </>
                    )}

                    {canEdit && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => addUnit('Residential')}
                          className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#2a3464] text-[#9aa8ff]"
                        >
                          <Plus className="w-3.5 h-3.5" /> Residential
                        </button>
                        <button
                          type="button"
                          onClick={() => addUnit('Commercial')}
                          className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#2a3464] text-[#9aa8ff]"
                        >
                          <Plus className="w-3.5 h-3.5" /> Commercial
                        </button>
                        <button
                          type="button"
                          disabled={!dirty || busy}
                          onClick={() => void saveUnits()}
                          className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#4f46e5] text-white disabled:opacity-40 ml-auto"
                        >
                          Save units
                        </button>
                      </div>
                    )}
                    {msg && <p className="text-xs text-[#aab4dc]">{msg}</p>}
                    {(resAmt > 0 || comAmt > 0) && (
                      <p className="text-[11px] text-[#8790bd]">
                        This structure → {resN} Residential × {money(resRate)} = {money(resAmt)} + {comN} Commercial × {money(comRate)} = {money(comAmt)} = <b className="text-white">{money(total)}</b>
                        {' '}({unitsN} unit{unitsN === 1 ? '' : 's'}; after save, list refreshes on next open)
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#28325c] flex flex-wrap gap-2 justify-end bg-[#181f3d]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-[#aab4dc] bg-[#2a3464]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || (dirty && !!expanded)}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#f2b233] text-[#2b1d00] disabled:opacity-40"
            title={dirty ? 'Save unit changes first' : undefined}
          >
            <CheckCircle2 className="w-4 h-4" />
            Units verified — Generate {headLabel(head)} demand
          </button>
        </div>
      </div>
    </div>
  );
};
