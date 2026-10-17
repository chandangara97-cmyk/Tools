import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Send, Calculator, Download } from 'lucide-react';
import type { PropertyRecord } from '../utils/gisUtils';
import { triggerFileDownload } from '../utils/gisUtils';
import { useAuth, canAssess, canApprove, canEditRates } from '../services/auth';
import { calcAssessment, financialYearOf, RateTable } from '../services/assessment';
import { RateTableEditor } from './RateTableEditor';
import { Assessment, AssessmentStatus, saveAssessment, saveRateTable, useAssessments, currentUid } from '../services/assessmentStore';

interface Props {
  townKey: string;
  townName: string;
  records: PropertyRecord[];
  rateTable: RateTable;
  rateSaved: boolean;
}

const STATUS_STYLE: Record<AssessmentStatus | 'none', string> = {
  none: 'bg-[#142831] text-[#9fc7c1]',
  draft: 'bg-sky-950/60 text-sky-200',
  submitted: 'bg-[#d6a34b]/20 text-[#f7dfae]',
  approved: 'bg-[#0e8a7d]/25 text-[#20b5a6]',
  rejected: 'bg-red-950/50 text-red-300',
};

const inr = (n: number | null | undefined) => (n === null || n === undefined ? '-' : `₹${Math.round(n).toLocaleString('en-IN')}`);

export const AssessmentPanel: React.FC<Props> = ({ townKey, townName, records, rateTable, rateSaved }) => {
  const { role, displayName } = useAuth();
  const now = new Date();
  const thisFy = financialYearOf(now);
  const startYear = parseInt(thisFy.slice(0, 4), 10);
  const fyOptions = [`${startYear - 1}-${String(startYear % 100).padStart(2, '0')}`, thisFy, `${startYear + 1}-${String((startYear + 2) % 100).padStart(2, '0')}`];
  const [fy, setFy] = useState(thisFy);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [showRates, setShowRates] = useState(false);
  const assessments = useAssessments(townKey, fy);
  const asOfYear = parseInt(fy.slice(0, 4), 10);

  const townRecords = useMemo(() => records.filter((r) => r.town === townName), [records, townName]);
  const rows = useMemo(
    () => townRecords.map((r) => ({ r, a: assessments[r.id], live: calcAssessment(r, rateTable, asOfYear) })),
    [townRecords, assessments, rateTable, asOfYear],
  );

  const counts = useMemo(() => {
    const c = { none: 0, draft: 0, submitted: 0, approved: 0, rejected: 0 };
    rows.forEach(({ a }) => { c[a ? a.status : 'none']++; });
    return c;
  }, [rows]);

  const run = async (label: string, work: () => Promise<number>) => {
    setBusy(true); setMsg('');
    try { const n = await work(); setMsg(`${label}: ${n} record${n === 1 ? '' : 's'}.`); }
    catch (e) { setMsg(`${label} failed: ${(e as Error).message.includes('PERMISSION') ? 'your role is not allowed to do this.' : (e as Error).message}`); }
    finally { setBusy(false); }
  };

  const makeAssessment = (r: PropertyRecord, status: AssessmentStatus, prev?: Assessment): Assessment => ({
    propertyId: r.id, town: townKey, ward: r.ward, fy,
    rateTableId: rateTable.id, rateStatus: rateTable.status,
    status, calc: calcAssessment(r, rateTable, asOfYear),
    assessedBy: currentUid(), assessedAt: Date.now(),
    ...(prev?.reviewNote ? { reviewNote: prev.reviewNote } : {}),
  });

  const assessAll = () => run('Drafted', async () => {
    const todo = rows.filter(({ a }) => !a || a.status === 'draft' || a.status === 'rejected');
    for (const { r, a } of todo) await saveAssessment(makeAssessment(r, 'draft', a));
    return todo.length;
  });
  const submitAll = () => run('Submitted for review', async () => {
    const todo = rows.filter(({ a }) => a && a.status === 'draft');
    for (const { a } of todo) await saveAssessment({ ...a!, status: 'submitted' });
    return todo.length;
  });
  const review = (a: Assessment, status: 'approved' | 'rejected') => {
    let note = '';
    if (status === 'rejected') {
      note = window.prompt('Reason for rejection (shown to the assessor):') || '';
      if (!note.trim()) return;
    }
    if (status === 'approved' && a.rateStatus === 'placeholder' &&
        !window.confirm('This assessment used PLACEHOLDER rates, not notified rates. Approve anyway?')) return;
    void run(status === 'approved' ? 'Approved' : 'Rejected', async () => {
      await saveAssessment({ ...a, status, reviewedBy: currentUid(), reviewedAt: Date.now(), reviewNote: note });
      return 1;
    });
  };
  const approveAllSubmitted = () => {
    const todo = rows.filter(({ a }) => a && a.status === 'submitted');
    if (!todo.length) return;
    const ph = todo.some(({ a }) => a!.rateStatus === 'placeholder');
    if (!window.confirm(`Approve ${todo.length} submitted assessment(s)?${ph ? '\n\nSome used PLACEHOLDER rates.' : ''}`)) return;
    void run('Approved', async () => {
      for (const { a } of todo) await saveAssessment({ ...a!, status: 'approved', reviewedBy: currentUid(), reviewedAt: Date.now(), reviewNote: '' });
      return todo.length;
    });
  };

  const exportCsv = () => {
    const head = ['Property ID', 'Ward', 'Owner', 'Use', 'Built-up (sq m)', 'Rateable value', 'Rebate', 'Net taxable value', 'Tax', 'Status', 'Rate table', 'Rates'];
    const q = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = rows.filter(({ a }) => a && a.status === 'approved').map(({ r, a }) => [
      r.id, r.ward, q(r.owner), r.use, a!.calc.builtUp, a!.calc.rateableValue, a!.calc.rebate,
      a!.calc.netTaxableValue, a!.calc.tax ?? '', a!.status, a!.rateTableId, a!.rateStatus,
    ].join(','));
    triggerFileDownload([head.join(','), ...lines].join('\n'), `${townName}_Assessment_${fy}_approved.csv`, 'text/csv');
  };

  const saveRates = (t: RateTable) => run('Rate table saved', async () => {
    await saveRateTable(townKey, t);
    setShowRates(false);
    return 1;
  });

  return (
    <div className="space-y-4">
      {rateTable.status === 'placeholder' && (
        <div className="rounded-lg p-3 text-xs bg-[#d6a34b]/20 text-[#f7dfae] border border-[#d6a34b]/40 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-none mt-0.5" />
          <span>{rateSaved ? 'The saved rate table is marked placeholder.' : 'No rate table saved for this town yet.'} Values below use placeholder factors copied from the old export, so they are not official. An admin must enter the notified rates and set the table to "approved".</span>
        </div>
      )}

      <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-bold text-[#20b5a6] uppercase tracking-wider">Assessment {fy}</h3>
          <select value={fy} onChange={(e) => setFy(e.target.value)} className="bg-[#091a1f] border border-[#23534d] text-white text-xs rounded p-1.5">
            {fyOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <span className="text-[11px] text-[#9fc7c1]">Rate table from {rateTable.effectiveFrom}, {rateTable.status}</span>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
          {(['none', 'draft', 'submitted', 'approved', 'rejected'] as const).map((k) => (
            <span key={k} className={`px-2 py-1 rounded ${STATUS_STYLE[k]}`}>{k === 'none' ? 'not assessed' : k} {counts[k]}</span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {canAssess(role) && (
            <>
              <button type="button" disabled={busy} onClick={() => void assessAll()} className="inline-flex items-center gap-1 bg-[#0e8a7d] disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg">
                <Calculator className="w-3.5 h-3.5" /> Assess all unassessed
              </button>
              <button type="button" disabled={busy || !counts.draft} onClick={() => void submitAll()} className="inline-flex items-center gap-1 bg-[#1b433e] disabled:opacity-40 text-[#20b5a6] text-xs font-bold px-3 py-2 rounded-lg">
                <Send className="w-3.5 h-3.5" /> Submit drafts for review
              </button>
            </>
          )}
          {canApprove(role) && (
            <button type="button" disabled={busy || !counts.submitted} onClick={approveAllSubmitted} className="inline-flex items-center gap-1 bg-[#1b433e] disabled:opacity-40 text-[#20b5a6] text-xs font-bold px-3 py-2 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5" /> Approve all submitted
            </button>
          )}
          <button type="button" disabled={!counts.approved} onClick={exportCsv} className="inline-flex items-center gap-1 bg-[#142831] disabled:opacity-40 text-[#9fc7c1] text-xs font-bold px-3 py-2 rounded-lg border border-[#23534d]">
            <Download className="w-3.5 h-3.5" /> Approved roll (CSV)
          </button>
        </div>
        {msg && <p className="text-xs text-[#f7dfae]">{msg}</p>}
        {!canAssess(role) && !canApprove(role) && <p className="text-[11px] text-[#7fa6a0]">Your role can view assessments only.</p>}
      </div>

      <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl shadow-lg overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="text-[#9fc7c1] border-b border-[#1d434c]">
            <tr><th className="p-2.5">Property</th><th className="p-2.5">Use</th><th className="p-2.5 text-right">Built-up</th><th className="p-2.5 text-right">Net value</th><th className="p-2.5 text-right">Tax</th><th className="p-2.5">Status</th><th className="p-2.5"></th></tr>
          </thead>
          <tbody>
            {rows.map(({ r, a, live }) => {
              const c = a ? a.calc : live;
              const st: AssessmentStatus | 'none' = a ? a.status : 'none';
              const stale = !!a && (a.status === 'draft' || a.status === 'submitted') && a.calc.netTaxableValue !== live.netTaxableValue;
              return (
                <React.Fragment key={r.id}>
                  <tr className="border-b border-[#14333b] text-white">
                    <td className="p-2.5 font-mono">{r.id}<div className="text-[10px] text-[#9fc7c1] font-sans">{r.owner}</div></td>
                    <td className="p-2.5">{r.use}</td>
                    <td className="p-2.5 text-right">{c.builtUp}</td>
                    <td className="p-2.5 text-right">{inr(c.netTaxableValue)}</td>
                    <td className="p-2.5 text-right">{inr(c.tax)}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded font-semibold ${STATUS_STYLE[st]}`}>{st === 'none' ? 'not assessed' : st}</span>
                      {stale && <div className="text-[10px] text-[#f7dfae]">survey or rates changed since</div>}
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      <button type="button" className="text-[#20b5a6] font-bold mr-2" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Hide' : 'Working'}</button>
                      {canApprove(role) && a?.status === 'submitted' && (
                        <>
                          <button type="button" disabled={busy} className="text-emerald-300 font-bold mr-2" onClick={() => review(a, 'approved')}>Approve</button>
                          <button type="button" disabled={busy} className="text-red-300 font-bold" onClick={() => review(a, 'rejected')}><XCircle className="inline w-3 h-3" /> Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                  {open === r.id && (
                    <tr className="bg-[#091a1f] text-[#cfe6e2]">
                      <td colSpan={7} className="p-3">
                        <div className="font-mono space-y-0.5">
                          <div>Built-up area: {c.builtUp} sq m</div>
                          {c.lines.map((l) => <div key={l.factor}>x {l.factor} ({l.basis}): {l.value}{l.clause ? `  [${l.clause}]` : ''}</div>)}
                          <div>= Rateable value {inr(c.rateableValue)}; rebate {inr(c.rebate)}</div>
                          {(c.adjustments || []).map((x) => <div key={x.name}>{x.amount < 0 ? '-' : '+'} {x.name} ({x.base === 'tax' ? 'on tax' : 'on value'}): {inr(Math.abs(x.amount))}{x.clause ? `  [${x.clause}]` : ''}</div>)}
                          <div>= Net taxable value {inr(c.netTaxableValue)}; tax {inr(c.tax)}</div>
                        </div>
                        {c.warnings.map((w) => <div key={w} className="text-[#f7dfae] mt-1">⚠ {w}</div>)}
                        {a && <div className="mt-1 text-[#9fc7c1]">Rate table {a.rateTableId} ({a.rateStatus}){a.reviewNote ? `; review note: ${a.reviewNote}` : ''}</div>}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {!rows.length && <tr><td colSpan={7} className="p-4 text-center text-[#9fc7c1]">No surveyed properties in {townName} yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {canEditRates(role) && (
        <div className="bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow-lg">
          <button type="button" className="text-xs font-bold text-[#20b5a6]" onClick={() => setShowRates(!showRates)}>
            {showRates ? 'Close' : 'Enter / edit'} bylaw rates for {townName}
          </button>
          {showRates && <RateTableEditor key={rateTable.id + rateTable.status} initial={rateTable} busy={busy} onSave={(t) => void saveRates(t)} />}
        </div>
      )}
      <p className="text-[11px] text-[#7fa6a0]">Signed in as {displayName}. Assessments are saved to the cloud and need an internet connection.</p>
    </div>
  );
};
