import React, { useMemo, useState } from 'react';
import { useStepBack, readStep } from '../hooks/useStepBack';
import { AlertTriangle, Printer, Download, Undo2, Receipt, Search, Landmark } from 'lucide-react';
import type { PropertyRecord } from '../utils/gisUtils';
import { triggerFileDownload } from '../utils/gisUtils';
import { useAuth, canCollect, canManageLedger, canSeeAudit, canEditRates, canSetPayableRates } from '../services/auth';
import { HeadId, HEAD_LIST, headLabel, useTownHeads } from '../services/heads';
import { expandForHead, isUnitHead, needsUnits } from '../services/units';
import { PayableRates, fixedAmountFor, isMonthly, savePayableRates, usePayableRates, validateRates } from '../services/payableRates';
import { financialYearOf } from '../services/assessment';
import { useAssessments } from '../services/assessmentStore';
import {
  CollectionSettings, LedgerEntry, PayMode, computeLedger, previewPayment, quoteFull, rupeesInWords,
  todayIso, validateSettings, dueDateOf, periodLabel, periodStart, monthKeys, liveDemand,
} from '../services/collection';
import {
  generateDemands, generateFixedDemands, postAdjustment, postPayment, reverseEntries, saveHeadSettings, useAudit, useHeadSettings, useLedgers,
} from '../services/collectionStore';

interface Props {
  /** The bill head chosen on the menu. The page works on this head only. */
  lockedHead: HeadId;
  townKey: string;
  townName: string;
  records: PropertyRecord[];
  settings: CollectionSettings;
  settingsSaved: boolean;
}

export const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const inp = 'bg-white border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2 shadow-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none';
const card = 'bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_8px_28px_rgba(20,44,83,0.06)]';
const btn = 'inline-flex items-center gap-1.5 text-sm font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40 transition-all active:scale-[0.98]';
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

function receiptHtml(o: {
  head: HeadId; town: string; rec: PropertyRecord; pay: LedgerEntry; rebate?: LedgerEntry; cancelled: boolean;
  parts: { fy: string; interest: number; principal: number }[]; balanceAfter: number;
}) {
  const { head, town, rec, pay, rebate, cancelled, parts, balanceAfter } = o;
  const rows = parts.map((p) => `<tr><td>${esc(periodLabel(p.fy))}</td><td class="r">${money(p.principal)}</td><td class="r">${money(p.interest)}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(pay.receiptNo)}</title>
<style>body{font-family:Arial,sans-serif;font-size:13px;margin:24px;color:#111}h1{font-size:18px;margin:0}h2{font-size:14px;margin:2px 0 14px}
table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #999;padding:5px 8px;text-align:left}.r{text-align:right}
.kv td{border:none;padding:2px 8px 2px 0}.big{font-size:16px;font-weight:bold}.stamp{color:#b00;font-size:28px;font-weight:bold;border:3px solid #b00;display:inline-block;padding:2px 12px;transform:rotate(-6deg);margin:6px 0}
.sig{margin-top:48px;display:flex;justify-content:space-between}</style></head><body>
<h1>${esc(town)}</h1><h2>${esc(headLabel(head))} receipt</h2>
${cancelled ? '<div class="stamp">CANCELLED</div>' : ''}
<table class="kv"><tr><td>Receipt no.</td><td><b>${esc(pay.receiptNo)}</b></td><td>Date</td><td><b>${esc(pay.date)}</b></td></tr>
<tr><td>Property ID</td><td>${esc(rec.id)}</td><td>Ward</td><td>${esc(rec.ward)}</td></tr>
<tr><td>Owner</td><td>${esc(rec.owner)}</td><td>House / plot</td><td>${esc(rec.hno)}</td></tr>
<tr><td>Paid by</td><td>${esc(pay.payer || rec.owner)}</td><td>Mode</td><td>${esc((pay.mode || '').toUpperCase())}${pay.ref ? ' / ' + esc(pay.ref) : ''}</td></tr></table>
<table><tr><th>Financial year</th><th class="r">Tax</th><th class="r">Interest</th></tr>${rows}</table>
${rebate ? `<p>Early-payment rebate allowed with this payment (${esc(rebate.fy)}): ${money(rebate.amount)}</p>` : ''}
<p class="big">Amount received: ${money(pay.amount)}</p><p>${esc(rupeesInWords(pay.amount))}</p>
<p>Balance due after this payment: ${money(balanceAfter)}</p>
<div class="sig"><span>Payer</span><span>Cashier</span></div></body></html>`;
}

export function printHtml(html: string) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  f.srcdoc = html;
  f.onload = () => { try { f.contentWindow?.focus(); f.contentWindow?.print(); } finally { setTimeout(() => f.remove(), 60000); } };
}

export const CollectionPanel: React.FC<Props> = ({ lockedHead, townKey, townName, records, settings: propertySettings, settingsSaved: propertySaved }) => {
  const { role } = useAuth();
  const heads = useTownHeads(townKey);
  const activeHead: HeadId = lockedHead;
  const other = useHeadSettings(townKey, activeHead);
  const settings = activeHead === 'property_tax' ? propertySettings : other.settings;
  const settingsSaved = activeHead === 'property_tax' ? propertySaved : other.saved;
  const ledgers = useLedgers(townKey, activeHead);
  const ratesAll = usePayableRates(townKey);
  const rates = ratesAll[activeHead] || { residential: null, commercial: null };
  const audit = useAudit(townKey, canSeeAudit(role));
  const today = todayIso();
  const thisFy = financialYearOf(new Date());
  const [fy, setFy] = useState(thisFy);
  const [month, setMonth] = useState(monthKeys(0, 0)[0]);
  // monthly bills (water, garbage...) are raised per month; everything else per financial year
  const monthly = isMonthly(activeHead, ratesAll[activeHead]);
  const period = monthly ? month : fy;
  const assessments = useAssessments(townKey, fy);
  const [q, setQ] = useState('');
  const [filterWard, setFilterWard] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterDue, setFilterDue] = useState<'all' | 'due' | 'paid'>('all');
  const [sel, setSel] = useState<string | null>(() => readStep('csel', '') || null);
  const selNav = useStepBack('csel', sel ?? '', (v: string) => setSel(v || null), '');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  type CollectionPage = 'overview' | 'properties' | 'update' | 'settings' | 'rates' | 'audit';
  const [collectionPage, setCollectionPageRaw] = useState<CollectionPage>(() => readStep<CollectionPage>('cpage', 'overview'));
  const pageNav = useStepBack<CollectionPage>('cpage', collectionPage, setCollectionPageRaw, 'overview', ['csel']);
  const setCollectionPage = pageNav.go;

  const townRecords = useMemo(() => expandForHead(records.filter((r) => r.town === townName), activeHead, ledgers), [records, townName, activeHead, ledgers]);
  const needUnits = useMemo(() => isUnitHead(activeHead) ? records.filter((r) => r.town === townName && needsUnits(r)).length : 0, [records, townName, activeHead]);
  const rows = useMemo(() => townRecords.map((r) => {
    const entries = ledgers[r.id] || [];
    return { r, entries, led: computeLedger(entries, settings, today) };
  }), [townRecords, ledgers, settings, today]);

  const totals = useMemo(() => {
    let principal = 0, interest = 0, withDues = 0, demanded = 0;
    rows.forEach(({ led, entries }) => {
      principal += led.principalDue; interest += led.interestDue;
      if (led.totalDue > 0) withDues++;
      if (entries.some((e) => e.type === 'demand')) demanded++;
    });
    return { principal, interest, withDues, demanded };
  }, [rows]);

  const approvedCount = Object.values(assessments).filter((a) => a.status === 'approved' && a.calc.tax !== null && a.calc.tax > 0).length;
  const alreadyDemanded = rows.filter(({ entries }) => !!liveDemand(entries, fy)).length;

  const run = async (label: string, work: () => Promise<string | void>) => {
    setBusy(true); setMsg('');
    try { const extra = await work(); setMsg(`${label}${extra ? ': ' + extra : ' done.'}`); }
    catch (e) {
      const m = (e as Error).message || '';
      setMsg(`${label} failed: ${m.includes('PERMISSION') ? 'your role is not allowed to do this, or the entry breaks a rule (for example an assessment that changed after approval).' : m}`);
    } finally { setBusy(false); }
  };

  const generate = () => {
    const placeholder = Object.values(assessments).some((a) => a.status === 'approved' && a.rateStatus === 'placeholder');
    if (!window.confirm(`Generate demand for ${fy} from ${approvedCount} approved assessment(s)?${placeholder ? '\n\nSome of them used PLACEHOLDER rates, so the demand would not be official.' : ''}\n\nA demand cannot be edited afterwards, only adjusted or reversed.`)) return;
    void run('Demand', async () => {
      const r = await generateDemands(townKey, fy, assessments, ledgers);
      return `${r.created} created, ${r.skippedExisting} already had one${r.noTax ? `, ${r.noTax} skipped (no tax computed)` : ''}.`;
    });
  };

  const fixedTargets = useMemo(() => townRecords.filter((r) => r.billable !== false && (fixedAmountFor(rates, r.use) ?? 0) > 0), [townRecords, rates]);
  const fixedPending = fixedTargets.filter((r) => !liveDemand(ledgers[r.id] || [], period)).length;
  const generateFixed = () => {
    if (!window.confirm(`Generate ${headLabel(activeHead)} demand for ${periodLabel(period)} from the fixed amounts${monthly ? ' (charged per month)' : ''} (Residential ${rates.residential === null ? 'not set' : money(rates.residential)}, Commercial ${rates.commercial === null ? 'not set' : money(rates.commercial)}) for ${fixedPending} propert${fixedPending === 1 ? 'y' : 'ies'}?\n\nA demand cannot be edited afterwards, only adjusted or reversed.`)) return;
    void run('Fixed-amount demand', async () => {
      const r = await generateFixedDemands(townKey, period, townRecords.filter((x) => x.billable !== false).map((x) => ({ id: x.id, use: x.use })), rates, ledgers, activeHead);
      return `${r.created} created, ${r.skippedExisting} already had one, ${r.noRate} skipped (not Residential/Commercial or no amount set).${needUnits ? ` ${needUnits} mixed-use building(s) have no units yet: add their shops and flats in the survey form.` : ''}`;
    });
  };

  const wardOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(({ r }) => {
      const w = String(r.ward ?? '').trim();
      if (w) set.add(w);
    });
    return [...set].sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ''), 10);
      const nb = parseInt(b.replace(/\D/g, ''), 10);
      if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [rows]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const name = filterName.trim().toLowerCase();
    const ward = filterWard.trim().toLowerCase();
    const f = rows.filter(({ r, led }) => {
      if (ward && String(r.ward ?? '').trim().toLowerCase() !== ward) return false;
      if (name && !String(r.owner ?? '').toLowerCase().includes(name)) return false;
      if (filterDue === 'due' && !(led.totalDue > 0.004)) return false;
      if (filterDue === 'paid' && led.totalDue > 0.004) return false;
      if (t && ![r.id, r.owner, r.hno, r.ward].some((x) => String(x).toLowerCase().includes(t))) return false;
      return true;
    });
    return f.sort((a, b) => b.led.totalDue - a.led.totalDue).slice(0, 100);
  }, [rows, q, filterWard, filterName, filterDue]);

  const filtersActive = !!(filterWard || filterName.trim() || filterDue !== 'all' || q.trim());
  const clearFilters = () => { setQ(''); setFilterWard(''); setFilterName(''); setFilterDue('all'); };

  const exportLedger = () => {
    const head = ['Property ID', 'Ward', 'Owner', 'Year', 'Due date', 'Demand', 'Adjustments', 'Rebate', 'Paid tax', 'Paid interest', 'Tax due', 'Interest due', 'Total due'];
    const qt = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const lines: string[] = [];
    rows.forEach(({ r, led }) => led.rows.forEach((x) => lines.push([r.id, r.ward, qt(r.owner), x.fy, x.dueDate, x.demand, x.adjustments, x.rebate, x.paidPrincipal, x.paidInterest, x.principalDue, x.interestDue, x.totalDue].join(','))));
    triggerFileDownload([head.join(','), ...lines].join('\n'), `${townName}_${activeHead}_Ledger_${today}.csv`, 'text/csv');
  };

  const selected = sel ? rows.find(({ r }) => r.id === sel) : undefined;

  return (
    <div className="collection-panel cashier-desk page-enter space-y-4">
      {(settings.status === 'placeholder' || settings.interestPctPerMonth === null) && (
        <div className="rounded-lg p-3 text-xs bg-amber-50 text-amber-900 border border-amber-200 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-none mt-0.5" />
          <span>
            {settingsSaved ? 'Collection rules are saved but marked placeholder.' : 'No collection rules saved for this town yet.'}{' '}
            {settings.interestPctPerMonth === null ? 'Interest is not set, so none is charged. ' : ''}
            {settings.rebatePct === 0 ? 'No early-payment rebate is set. ' : ''}
          </span>
        </div>
      )}

      {needUnits > 0 && (
        <div className="rounded-lg p-3 text-xs bg-amber-50 text-amber-900 border border-amber-200 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-none mt-0.5" />
          <span>{needUnits} building(s) are mixed or other use and have no units, so they get no {headLabel(activeHead).toLowerCase()} bill. Open each in the survey form and add its shops and flats under "Units in this building".</span>
        </div>
      )}

      <nav className="flex flex-wrap gap-2" aria-label="Collection pages">
        {([
          // Cashiers live on Collect payment; put it first so the counter is one tap away
          ...(canCollect(role) ? [{ id: 'properties' as const, title: 'Collect payment' }] : []),
          { id: 'overview' as const, title: 'Overview' },
          ...(!canCollect(role) ? [{ id: 'properties' as const, title: 'Collect payment' }] : []),
          ...(canSetPayableRates(role) ? [{ id: 'update' as const, title: 'Update dues' }] : []),
          ...(canEditRates(role) ? [{ id: 'settings' as const, title: 'Due date & interest' }] : []),
          ...(canSetPayableRates(role) ? [{ id: 'rates' as const, title: 'Fixed amounts' }] : []),
          ...(canSeeAudit(role) ? [{ id: 'audit' as const, title: 'Audit trail' }] : []),
        ]).map((item) => (
          <button key={item.id} type="button" onClick={() => setCollectionPage(item.id)}
            className={`text-sm font-bold px-4 py-2.5 rounded-xl border transition-all ${collectionPage === item.id ? 'bg-gradient-to-r from-blue-600 to-cyan-500 border-transparent text-white shadow-md shadow-blue-500/25' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-slate-900 hover:shadow-sm'}`}>
            {item.title}
          </button>
        ))}
      </nav>

      {collectionPage === 'overview' && <div className={`${card} space-y-3`}>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2"><Landmark className="w-4 h-4" /> {headLabel(activeHead)} · demand &amp; collection</h3>
          {monthly ? (
            <select value={month} onChange={(e) => setMonth(e.target.value)} className={inp} aria-label="Billing month">
              {monthKeys(11, 1).map((k) => <option key={k} value={k}>{periodLabel(k)}</option>)}
            </select>
          ) : (
            <select value={fy} onChange={(e) => setFy(e.target.value)} className={inp} aria-label="Financial year">
              {[-1, 0, 1].map((d) => { const y = parseInt(thisFy.slice(0, 4), 10) + d; const l = `${y}-${String((y + 1) % 100).padStart(2, '0')}`; return <option key={l} value={l}>{l}</option>; })}
            </select>
          )}
          <span className="text-[11px] text-slate-500">Due date for {periodLabel(period)}: {dueDateOf(period, settings)}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Tax outstanding</span>
            <b className="text-xl font-mono text-slate-900 tracking-tight">{money(totals.principal)}</b>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-4 border border-amber-200/60 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700/80 block mb-1">Interest outstanding</span>
            <b className="text-xl font-mono text-amber-800 tracking-tight">{money(totals.interest)}</b>
          </div>
          <div className="bg-gradient-to-br from-rose-50 to-white rounded-2xl p-4 border border-rose-200/50 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700/80 block mb-1">Properties with dues</span>
            <b className="text-xl font-mono text-rose-900 tracking-tight">{totals.withDues}</b>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-4 border border-blue-200/60 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700/80 block mb-1">Demand · {periodLabel(period)}</span>
            <b className="text-xl font-mono text-blue-900 tracking-tight">{activeHead === 'property_tax' ? `${alreadyDemanded} / ${approvedCount}` : `${rows.filter(({ entries }) => !!liveDemand(entries, period)).length} / ${fixedTargets.length}`}</b>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageLedger(role) && activeHead === 'property_tax' && (
            <button type="button" disabled={busy || approvedCount === alreadyDemanded} onClick={generate} className={`${btn} bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20`}>
              Generate demand for {fy}
            </button>
          )}
          {canManageLedger(role) && (
            <button type="button" disabled={busy || fixedPending === 0} onClick={generateFixed} className={`${btn} bg-amber-400 text-amber-950`}>
              {monthly ? `Generate ${periodLabel(period)} bills` : 'Generate demand from fixed amounts'} ({fixedPending})
            </button>
          )}
          <button type="button" onClick={exportLedger} disabled={!rows.some(({ led }) => led.rows.length)} className={`${btn} bg-slate-100 text-slate-500 border border-slate-200`}>
            <Download className="w-3.5 h-3.5" /> Ledger summary (CSV)
          </button>
        </div>
        {msg && <p className="text-xs text-amber-700">{msg}</p>}
      </div>}

      {collectionPage === 'properties' && <div className={`${card} space-y-4`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Find property</h3>
            <p className="text-xs text-slate-500 mt-0.5">Filter by ward and owner name, then open to see full details and take payment.</p>
          </div>
          {filtersActive && (
            <button type="button" onClick={clearFilters} className="text-xs font-bold text-blue-600 hover:text-blue-800 px-2 py-1">
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Ward no.
            <select
              value={filterWard}
              onChange={(e) => setFilterWard(e.target.value)}
              className={`${inp} w-full mt-1.5`}
              aria-label="Filter by ward number"
            >
              <option value="">All wards</option>
              {wardOptions.map((w) => (
                <option key={w} value={w}>Ward {w}</option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Owner / name
            <input
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Type owner name…"
              className={`${inp} w-full mt-1.5`}
              aria-label="Filter by owner name"
            />
          </label>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Due status
            <select
              value={filterDue}
              onChange={(e) => setFilterDue(e.target.value as 'all' | 'due' | 'paid')}
              className={`${inp} w-full mt-1.5`}
              aria-label="Filter by due status"
            >
              <option value="all">All</option>
              <option value="due">Has dues</option>
              <option value="paid">Cleared / no dues</option>
            </select>
          </label>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Property ID / house no.
            <div className="relative mt-1.5">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ID or house / plot…"
                className={`${inp} w-full !pl-9`}
                aria-label="Search property ID or house number"
              />
            </div>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{list.length}</span> shown
          {filterWard && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-semibold">Ward {filterWard}</span>}
          {filterName.trim() && <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100 font-semibold">Name: {filterName.trim()}</span>}
          {filterDue === 'due' && <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 font-semibold">Has dues</span>}
          {filterDue === 'paid' && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">Cleared</span>}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead className="text-slate-500 border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-2.5">Property / owner</th>
                <th className="p-2.5">Ward</th>
                <th className="p-2.5 text-right">Fixed amount</th>
                <th className="p-2.5 text-right">Tax due</th>
                <th className="p-2.5 text-right">Interest</th>
                <th className="p-2.5 text-right">Total</th>
                <th className="p-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {list.map(({ r, led }) => (
                <tr key={r.id} className={`border-b border-slate-100 text-slate-800 hover:bg-slate-50/80 ${sel === r.id ? 'bg-blue-50' : ''}`}>
                  <td className="p-2.5">
                    <div className="font-mono text-[12px] font-semibold text-slate-900">{r.id}</div>
                    <div className="text-[11px] text-slate-600 font-sans mt-0.5">{r.owner || '—'}</div>
                    {r.hno ? <div className="text-[10px] text-slate-400">House / plot {r.hno}</div> : null}
                  </td>
                  <td className="p-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                      {r.ward || '—'}
                    </span>
                  </td>
                  <td className="p-2.5 text-right text-amber-700 font-mono">
                    {fixedAmountFor(rates, r.use) === null ? '—' : money(fixedAmountFor(rates, r.use) as number)}
                    <div className="text-[10px] text-slate-500 font-sans">{r.use}</div>
                  </td>
                  <td className="p-2.5 text-right font-mono">{money(led.principalDue)}</td>
                  <td className="p-2.5 text-right font-mono">{money(led.interestDue)}</td>
                  <td className="p-2.5 text-right font-bold font-mono">
                    <span className={led.totalDue > 0.004 ? 'text-rose-700' : 'text-emerald-700'}>{money(led.totalDue)}</span>
                  </td>
                  <td className="p-2.5">
                    <button
                      type="button"
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                        sel === r.id
                          ? 'bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                      }`}
                      onClick={() => (sel === r.id ? selNav.back() : selNav.go(r.id))}
                    >
                      {sel === r.id ? 'Close' : 'Open details'}
                    </button>
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <div className="font-semibold text-slate-700 mb-1">No matching properties</div>
                    <div className="text-xs">Try another ward, name, or clear filters.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {(filtersActive ? list.length === 100 : rows.length > 100) && (
          <p className="text-[10px] text-slate-400">Showing up to 100 rows (highest dues first). Narrow with ward or name to find others.</p>
        )}
      </div>}

      {selected && collectionPage === 'properties' && (
        <PropertyLedger
          key={selected.r.id}
          town={townName} townKey={townKey} rec={selected.r} entries={selected.entries} settings={settings}
          busy={busy} run={run} role={role} head={activeHead} fixedAmount={fixedAmountFor(rates, selected.r.use)}
        />
      )}

      {collectionPage === 'update' && canSetPayableRates(role) && (
        <ManualDues townKey={townKey} head={activeHead} monthly={monthly} rows={rows} busy={busy} run={run} />
      )}

      {collectionPage === 'settings' && canEditRates(role) && (
        <div className={card}>
          <button type="button" className="text-xs font-bold text-blue-600" onClick={() => setShowSettings(!showSettings)}>
            {showSettings ? 'Close' : 'Enter / edit'} {headLabel(activeHead)} due date, interest and rebate rules for {townName}
          </button>
          {showSettings && <SettingsEditor key={JSON.stringify(settings)} initial={settings} busy={busy} onSave={(s) => void run('Collection rules saved', async () => { await saveHeadSettings(townKey, activeHead, s); setShowSettings(false); })} />}
        </div>
      )}

      {collectionPage === 'rates' && canSetPayableRates(role) && <RateFiller key={JSON.stringify(ratesAll)} townName={townName} heads={HEAD_LIST.filter((h) => heads.includes(h.id)).map((h) => h.id)} all={ratesAll} busy={busy} onSave={(h, r) => void run(`${headLabel(h)} fixed amounts saved`, async () => { await savePayableRates(townKey, h, r, ratesAll[h]); })} />}

      {collectionPage === 'audit' && canSeeAudit(role) && (
        <div className={card}>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Audit log (latest 60)</h4>
          <div className="max-h-64 overflow-y-auto text-[11px] font-mono space-y-1 text-slate-600">
            {audit.map((a) => <div key={a.id}>{new Date(a.at).toLocaleString('en-IN')} · {a.by.slice(0, 6)} · <b>{a.action}</b>{a.propertyId ? ` · ${a.propertyId}` : ''} · {a.detail}</div>)}
            {!audit.length && <div className="text-slate-400">Nothing logged yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
const PropertyLedger: React.FC<{
  town: string; townKey: string; rec: PropertyRecord; entries: LedgerEntry[]; settings: CollectionSettings;
  busy: boolean; run: (label: string, work: () => Promise<string | void>) => Promise<void>; role: ReturnType<typeof useAuth>['role'];
  fixedAmount: number | null; head: HeadId;
}> = ({ town, townKey, rec, entries, settings, busy, run, role, fixedAmount, head }) => {
  const today = todayIso();
  const led = useMemo(() => computeLedger(entries, settings, today), [entries, settings, today]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [mode, setMode] = useState<PayMode>('cash');
  const [refNo, setRefNo] = useState('');
  const [payer, setPayer] = useState('');
  const [note, setNote] = useState('');
  const [useRebate, setUseRebate] = useState(false);
  const [adjFy, setAdjFy] = useState(led.rows[0]?.fy || '');
  const [adjAmt, setAdjAmt] = useState('');
  const [adjWhy, setAdjWhy] = useState('');

  const ledAt = useMemo(() => computeLedger(entries, settings, date), [entries, settings, date]);
  const rebateFy = ledAt.rows.find((r) => r.rebateAvailable > 0)?.fy;
  const amt = parseFloat(amount);
  const preview = useMemo(
    () => (amt > 0 ? previewPayment(entries, settings, { amount: amt, date, rebateFy: useRebate ? rebateFy : undefined }) : null),
    [entries, settings, amt, date, useRebate, rebateFy],
  );

  const cancelled = useMemo(() => new Set(entries.filter((e) => e.type === 'reversal').map((e) => e.reverses as string)), [entries]);
  const sorted = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at), [entries]);

  const fillFull = () => {
    const quote = quoteFull(entries, settings, date, useRebate);
    setAmount(String(quote.total));
  };

  const submit = () => run('Payment', async () => {
    const r = await postPayment({
      town: townKey, propertyId: rec.id, ownerName: rec.owner, amount: amt, date, mode,
      ref: refNo, payer, note, rebateFy: useRebate ? rebateFy : undefined, head,
    }, entries, settings);
    setAmount(''); setRefNo(''); setNote(''); setUseRebate(false);
    return `receipt ${r.receiptNo} for ${money(amt)}${r.rebate ? ` (rebate ${money(r.rebate)} allowed)` : ''}. Print it from the list below.`;
  });

  const reverse = (e: LedgerEntry) => {
    const ids = e.type === 'payment' && e.receiptNo
      ? entries.filter((x) => x.receiptNo === e.receiptNo && (x.type === 'payment' || x.type === 'rebate') && !cancelled.has(x.id)).map((x) => x.id)
      : [e.id];
    const why = window.prompt(`Reverse ${e.type}${e.receiptNo ? ' ' + e.receiptNo : ''} of ${money(e.amount)}?\n\nReason (kept in the audit log):`);
    if (!why || !why.trim()) return;
    void run('Reversal', async () => { await reverseEntries(townKey, rec.id, entries, ids, why, head); });
  };

  const printReceipt = (pay: LedgerEntry, download: boolean) => {
    const rebate = entries.find((x) => x.type === 'rebate' && x.receiptNo === pay.receiptNo);
    const parts = led.allocations[pay.id]?.parts || [];
    const upTo = entries.filter((x) => x.at <= Math.max(pay.at, rebate?.at || 0) && !(x.type === 'reversal'));
    const balanceAfter = computeLedger(upTo, settings, pay.date).totalDue;
    const html = receiptHtml({ head, town, rec, pay, rebate, cancelled: cancelled.has(pay.id), parts, balanceAfter });
    if (download) triggerFileDownload(html, `Receipt_${(pay.receiptNo || pay.id).replace(/[^A-Za-z0-9]/g, '_')}.html`, 'text/html');
    else printHtml(html);
  };

  const submitAdjust = () => run('Adjustment', async () => {
    await postAdjustment(townKey, rec.id, adjFy, parseFloat(adjAmt), adjWhy, today, head);
    setAdjAmt(''); setAdjWhy('');
  });

  return (
    <div className={`${card} space-y-4`}>
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">Property details</p>
            <h3 className="text-base font-extrabold text-slate-900 font-mono tracking-tight">{rec.id}</h3>
            <p className="text-sm font-semibold text-slate-800 mt-1">{rec.owner || '—'}</p>
          </div>
          <div className="text-right text-xs text-slate-600 space-y-1">
            <div><span className="text-slate-400 font-medium">Ward</span> <span className="font-bold text-slate-800 ml-1">{rec.ward || '—'}</span></div>
            <div><span className="text-slate-400 font-medium">House / plot</span> <span className="font-bold text-slate-800 ml-1">{rec.hno || '—'}</span></div>
            <div><span className="text-slate-400 font-medium">Use</span> <span className="font-bold text-slate-800 ml-1">{rec.use || '—'}</span></div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="text-slate-500 border-b border-slate-200">
            <tr><th className="p-2">Year</th><th className="p-2">Due on</th><th className="p-2 text-right">Demand</th><th className="p-2 text-right">Rebate</th><th className="p-2 text-right">Paid</th><th className="p-2 text-right">Tax due</th><th className="p-2 text-right">Interest due</th></tr>
          </thead>
          <tbody>
            {led.rows.map((x) => (
              <tr key={x.fy} className="border-b border-slate-100 text-slate-800">
                <td className="p-2">{periodLabel(x.fy)}</td><td className="p-2">{x.dueDate}</td>
                <td className="p-2 text-right">{money(x.demand + x.adjustments)}</td>
                <td className="p-2 text-right">{money(x.rebate)}</td>
                <td className="p-2 text-right">{money(x.paidPrincipal + x.paidInterest)}</td>
                <td className="p-2 text-right">{money(x.principalDue)}</td>
                <td className="p-2 text-right">{money(x.interestDue)}</td>
              </tr>
            ))}
            {!led.rows.length && <tr><td colSpan={7} className="p-3 text-center text-slate-500">No demand raised for this property yet.</td></tr>}
          </tbody>
        </table>
        <p className="text-base font-extrabold text-rose-700 mt-3 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          Total due today: <span className="font-mono tracking-tight">{money(led.totalDue)}</span>
        </p>
        {led.warnings.map((w) => <p key={w} className="text-[11px] text-amber-700">⚠ {w}</p>)}
      </div>

      {canCollect(role) && led.totalDue > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-sky-50 rounded-2xl p-4 sm:p-5 space-y-3 border-2 border-emerald-200/80 shadow-[0_10px_28px_rgba(16,185,129,0.1)]">
          <div className="pointer-events-none absolute -right-10 -top-10 w-36 h-36 rounded-full bg-emerald-400/15 blur-2xl" aria-hidden />
          <h4 className="relative text-sm font-extrabold text-emerald-900 tracking-tight flex flex-wrap items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-emerald-500 text-white grid place-items-center shadow-md shadow-emerald-500/35">
              <Receipt className="w-4 h-4" />
            </span>
            Take payment
            <span className="sm:ml-auto text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full font-mono">
              Due {money(led.totalDue)}
            </span>
          </h4>
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <label className="text-[11px] font-semibold text-slate-600">Amount (₹)<input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inp} w-full mt-1`} /></label>
            <label className="text-[11px] font-semibold text-slate-600">Date<input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value || today)} className={`${inp} w-full mt-1`} /></label>
            <label className="text-[11px] font-semibold text-slate-600">Mode
              <select value={mode} onChange={(e) => setMode(e.target.value as PayMode)} className={`${inp} w-full mt-1`}>
                <option value="cash">Cash</option><option value="upi">UPI</option><option value="cheque">Cheque</option><option value="other">Other</option>
              </select>
            </label>
            {mode !== 'cash' && <label className="text-[11px] font-semibold text-slate-600">{mode === 'cheque' ? 'Cheque no.' : mode === 'upi' ? 'UPI txn ID' : 'Reference'}<input value={refNo} onChange={(e) => setRefNo(e.target.value)} className={`${inp} w-full mt-1`} /></label>}
          </div>
          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="text-[11px] font-semibold text-slate-600">Paid by (if not the owner)<input value={payer} onChange={(e) => setPayer(e.target.value)} className={`${inp} w-full mt-1`} /></label>
            <label className="text-[11px] font-semibold text-slate-600">Note<input value={note} onChange={(e) => setNote(e.target.value)} className={`${inp} w-full mt-1`} /></label>
          </div>
          {rebateFy && (
            <label className="relative flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <input type="checkbox" checked={useRebate} onChange={(e) => setUseRebate(e.target.checked)} className="rounded" />
              Allow early-payment rebate for {rebateFy} ({money(ledAt.rows.find((r) => r.fy === rebateFy)?.rebateAvailable || 0)}) — needs full payment
            </label>
          )}
          <div className="relative flex flex-wrap items-center gap-2 pt-1">
            {fixedAmount !== null && <button type="button" onClick={() => setAmount(String(Math.min(fixedAmount, ledAt.totalDue)))} className={`${btn} bg-amber-400 text-amber-950 hover:bg-amber-300`}>Fill fixed ({money(fixedAmount)})</button>}
            <button type="button" onClick={fillFull} className={`${btn} bg-white text-slate-700 border border-slate-200 hover:border-slate-300`}>Fill full amount</button>
            <button type="button" disabled={busy || !preview?.ok} onClick={() => void submit()} className={`${btn} bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40`}>Record payment</button>
          </div>
          {preview && !preview.ok && <p className="text-[11px] text-red-600">{preview.error}</p>}
          {preview?.ok && (
            <div className="text-[11px] text-slate-600 font-mono">
              {preview.allocation?.parts.map((p) => <div key={p.fy}>{periodLabel(p.fy)}: interest {money(p.interest)}, tax {money(p.principal)}</div>)}
              {preview.rebate > 0 && <div>Rebate {money(preview.rebate)} will be posted with this payment.</div>}
              <div>Balance after: {money(preview.result?.totalDue || 0)}</div>
            </div>
          )}
        </div>
      )}

      {canManageLedger(role) && led.rows.length > 0 && (
        <details className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
          <summary className="text-xs font-bold text-slate-500 cursor-pointer">Adjust a year's demand (e.g. after re-assessment)</summary>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            <label className="text-[11px] text-slate-500">Year<select value={adjFy} onChange={(e) => setAdjFy(e.target.value)} className={`${inp} w-full mt-1`}>{led.rows.map((x) => <option key={x.fy} value={x.fy}>{periodLabel(x.fy)}</option>)}</select></label>
            <label className="text-[11px] text-slate-500">Amount (+ more, − less)<input type="number" step="0.01" value={adjAmt} onChange={(e) => setAdjAmt(e.target.value)} className={`${inp} w-full mt-1`} /></label>
            <label className="text-[11px] text-slate-500 col-span-2">Reason<input value={adjWhy} onChange={(e) => setAdjWhy(e.target.value)} className={`${inp} w-full mt-1`} /></label>
          </div>
          <button type="button" disabled={busy || !adjFy || !parseFloat(adjAmt) || !adjWhy.trim()} onClick={() => void submitAdjust()} className={`${btn} bg-slate-800 text-white mt-2`}>Post adjustment</button>
        </details>
      )}

      <div className="overflow-x-auto">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Entries</h4>
        <table className="w-full text-xs text-left">
          <thead className="text-slate-500 border-b border-slate-200"><tr><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Year</th><th className="p-2 text-right">Amount</th><th className="p-2">Receipt / detail</th><th className="p-2"></th></tr></thead>
          <tbody>
            {sorted.map((e) => {
              const isCancelled = cancelled.has(e.id);
              return (
                <tr key={e.id} className={`border-b border-slate-100 ${isCancelled || e.type === 'reversal' ? 'text-slate-400' : 'text-slate-800'}`}>
                  <td className="p-2">{e.date}</td>
                  <td className={`p-2 ${isCancelled ? 'line-through' : ''}`}>{e.type}</td>
                  <td className="p-2">{periodLabel(e.fy)}</td>
                  <td className={`p-2 text-right ${isCancelled ? 'line-through' : ''}`}>{money(e.amount)}</td>
                  <td className="p-2 text-[11px]">
                    {e.receiptNo && <span className="font-mono">{e.receiptNo}</span>} {e.mode ? `${e.mode}${e.ref ? ' ' + e.ref : ''}` : ''} {e.reason ? `· ${e.reason}` : ''} {e.note ? `· ${e.note}` : ''}
                    {isCancelled && <b className="text-red-600"> · reversed</b>}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {e.type === 'payment' && (
                      <>
                        <button type="button" title="Print receipt" className="text-blue-600 mr-2" onClick={() => printReceipt(e, false)}><Printer className="inline w-3.5 h-3.5" /></button>
                        <button type="button" title="Download receipt" className="text-blue-600 mr-2" onClick={() => printReceipt(e, true)}><Download className="inline w-3.5 h-3.5" /></button>
                      </>
                    )}
                    {canManageLedger(role) && e.type !== 'reversal' && e.type !== 'rebate' && !isCancelled && (
                      <button type="button" disabled={busy} title="Reverse this entry" className="text-red-600" onClick={() => reverse(e)}><Undo2 className="inline w-3.5 h-3.5" /> Reverse</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!sorted.length && <tr><td colSpan={6} className="p-3 text-center text-slate-500">No entries.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
type RowSet = { r: PropertyRecord; entries: LedgerEntry[]; led: ReturnType<typeof computeLedger> }[];

/** Admin only: add a charge or arrears, or reduce or waive dues, on any property and any period. Posted as an adjustment, so it is audited and can be reversed. */
const ManualDues: React.FC<{ townKey: string; head: HeadId; monthly: boolean; rows: RowSet; busy: boolean; run: (label: string, work: () => Promise<string | void>) => Promise<void> }> = ({ townKey, head, monthly, rows, busy, run }) => {
  const [q, setQ] = useState('');
  const [pid, setPid] = useState<string | null>(null);
  const [mode, setMode] = useState<'add' | 'cut'>('add');
  const thisFy = financialYearOf(new Date());
  const fyOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => { const y = parseInt(thisFy.slice(0, 4), 10) - i + 1; return `${y}-${String((y + 1) % 100).padStart(2, '0')}`; }), [thisFy]);
  const [period, setPeriod] = useState(monthly ? monthKeys(0, 0)[0] : thisFy);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(periodStart(monthly ? monthKeys(0, 0)[0] : thisFy));
  const [why, setWhy] = useState('');

  const found = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return rows.filter(({ r }) => `${r.id} ${r.owner} ${r.hno}`.toLowerCase().includes(t)).slice(0, 8);
  }, [q, rows]);
  const cur = pid ? rows.find(({ r }) => r.id === pid) : undefined;
  const choosePeriod = (k: string) => { setPeriod(k); setDate(periodStart(k)); };
  const amt = Math.abs(parseFloat(amount));
  const signed = mode === 'add' ? amt : -amt;
  const ok = !!cur && amt > 0 && isFinite(amt) && why.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const submit = () => {
    if (!cur) return;
    if (!window.confirm(`${mode === 'add' ? 'Add' : 'Reduce'} ${money(amt)} on ${headLabel(head)} for ${periodLabel(period)}?\n\nOwner: ${cur.r.owner}\nProperty: ${cur.r.id}\nEffective date: ${date}\nReason: ${why.trim()}\n\nIt is recorded in the audit trail. A mistake can be reversed from Collect payment.`)) return;
    void run('Dues updated', async () => {
      await postAdjustment(townKey, cur.r.id, period, signed, why.trim(), date, head);
      setAmount(''); setWhy('');
    });
  };
  const fld = `${inp} w-full mt-1`;

  return (
    <div className={`${card} space-y-4`}>
      <h3 className="text-lg font-bold text-slate-800">Update dues of {headLabel(head)}</h3>
      <label className="text-[11px] text-slate-500 block">Property ID or owner
        <input value={q} onChange={(e) => { setQ(e.target.value); setPid(null); }} className={fld} placeholder="Type at least 2 letters" />
      </label>
      {!cur && found.map(({ r, led }) => (
        <button key={r.id} type="button" onClick={() => setPid(r.id)} className="stub w-full text-left bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md p-3 flex justify-between gap-3">
          <span className="min-w-0"><span className="block font-bold text-slate-800 truncate">{r.owner}</span><span className="block text-xs text-slate-500">{r.id} · Ward {r.ward}</span></span>
          <span className="slab font-bold text-[#ff6b6f] whitespace-nowrap">{money(led.totalDue)}</span>
        </button>
      ))}
      {cur && (
        <>
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-sm">
            <b className="text-slate-800">{cur.r.owner}</b> <span className="text-slate-500">· {cur.r.id}</span>
            <div className="mt-1 text-slate-500">Due now on {headLabel(head)}: <b className="text-[#ff6b6f]">{money(cur.led.totalDue)}</b></div>
            {cur.led.rows.length > 0 && (
              <div className="mt-2 overflow-x-auto"><table className="w-full text-xs"><tbody>
                {cur.led.rows.map((x) => <tr key={x.fy} className="border-t border-[#252e56]"><td className="py-1">{periodLabel(x.fy)}</td><td className="text-right">{money(x.principalDue + x.interestDue)}</td></tr>)}
              </tbody></table></div>
            )}
          </div>
          <div className="flex gap-2">
            {([['add', 'Add charge or arrears'], ['cut', 'Reduce or waive']] as const).map(([m, label]) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
                className={`flex-1 text-sm font-bold px-3 py-2.5 rounded-xl border ${mode === m ? 'bg-gradient-to-r from-blue-600 to-cyan-500 border-transparent text-white shadow-md shadow-blue-500/25' : 'bg-white border-slate-200 text-slate-500'}`}>{label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[11px] text-slate-500">{monthly ? 'Month' : 'Financial year'}
              {monthly
                ? <input type="month" value={period} onChange={(e) => e.target.value && choosePeriod(e.target.value)} className={fld} />
                : <select value={period} onChange={(e) => choosePeriod(e.target.value)} className={fld}>{fyOptions.map((k) => <option key={k}>{k}</option>)}</select>}
            </label>
            <label className="text-[11px] text-slate-500">Amount (₹)<input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={fld} /></label>
            <label className="text-[11px] text-slate-500">Effective date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fld} /></label>
            <label className="text-[11px] text-slate-500">Reason<input value={why} onChange={(e) => setWhy(e.target.value)} className={fld} placeholder="For example: arrears from old register" /></label>
          </div>
          <p className="text-[11px] text-slate-400">Interest on an added amount runs from the due date of its period when the effective date is on or before it. For arrears of an earlier period, keep the date at the start of that period.</p>
          <button type="button" disabled={busy || !ok} onClick={submit} className={`${btn} bg-amber-400 text-amber-950`}>{mode === 'add' ? 'Add to dues' : 'Reduce dues'}</button>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
export const RateRow: React.FC<{ head: HeadId; initial: PayableRates | undefined; busy: boolean; onSave: (h: HeadId, r: { residential: number | null; commercial: number | null; frequency: 'yearly' | 'monthly' }) => void; townName: string }> = ({ head, initial, busy, onSave, townName }) => {
  const [res, setRes] = useState(initial?.residential == null ? '' : String(initial.residential));
  const [com, setCom] = useState(initial?.commercial == null ? '' : String(initial.commercial));
  const [err, setErr] = useState('');
  const [freq, setFreq] = useState<'yearly' | 'monthly'>(head !== 'property_tax' && initial?.frequency === 'monthly' ? 'monthly' : 'yearly');
  const per = freq === 'monthly' ? 'month' : 'year';
  const toNum = (v: string) => (v.trim() === '' ? null : Number(v));
  const save = () => {
    const r = { residential: toNum(res), commercial: toNum(com), frequency: freq };
    const e = validateRates(r);
    if (e) { setErr(e); return; }
    if (!window.confirm(`Save ${headLabel(head)} fixed amounts for ${townName}?\n\nResidential: ${r.residential === null ? 'not set' : money(r.residential)}\nCommercial: ${r.commercial === null ? 'not set' : money(r.commercial)}\nCharged: ${freq === 'monthly' ? 'every month' : 'once a year'}\n\nDemands already raised are not changed.`)) return;
    setErr(''); onSave(head, r);
  };
  return (
    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2">
      <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider">{headLabel(head)}</h4>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-[11px] text-slate-500">Residential (₹ per property per {per})<input type="number" inputMode="decimal" min="0" step="0.01" value={res} onChange={(e) => setRes(e.target.value)} className={`${inp} w-full mt-1`} /></label>
        <label className="text-[11px] text-slate-500">Commercial (₹ per property per {per})<input type="number" inputMode="decimal" min="0" step="0.01" value={com} onChange={(e) => setCom(e.target.value)} className={`${inp} w-full mt-1`} /></label>
      </div>
      {head !== 'property_tax' && (
        <fieldset className="flex gap-2" aria-label="How often this bill is charged">
          {(['yearly', 'monthly'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFreq(f)} aria-pressed={freq === f}
              className={`text-sm font-bold px-4 py-2 rounded-xl border ${freq === f ? 'bg-gradient-to-r from-blue-600 to-cyan-500 border-transparent text-white shadow-md shadow-blue-500/25' : 'bg-white border-slate-200 text-slate-500'}`}>
              {f === 'monthly' ? 'Charged every month' : 'Charged once a year'}
            </button>
          ))}
        </fieldset>
      )}
      {err && <p className="text-xs text-red-600">{err}</p>}
      <button type="button" disabled={busy} onClick={save} className={`${btn} bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20`}>Save {headLabel(head)} amounts</button>
    </div>
  );
};

const RateFiller: React.FC<{ townName: string; heads: HeadId[]; all: Record<string, PayableRates>; busy: boolean; onSave: (h: HeadId, r: { residential: number | null; commercial: number | null; frequency: 'yearly' | 'monthly' }) => void }> = ({ townName, heads, all, busy, onSave }) => (
  <div className={`${card} space-y-3`}>
    <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider">Fixed amounts payable · {townName}</h3>
    
    {heads.map((h) => <RateRow key={h} head={h} initial={all[h]} busy={busy} onSave={onSave} townName={townName} />)}
    <p className="text-[11px] text-slate-400">Changing these does not alter demands already generated; use an adjustment for those. Every change is written to the audit trail.</p>
  </div>
);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const SettingsEditor: React.FC<{ initial: CollectionSettings; busy: boolean; onSave: (s: CollectionSettings) => void }> = ({ initial, busy, onSave }) => {
  const [s, setS] = useState<CollectionSettings>(initial);
  const [err, setErr] = useState('');
  const num = (v: string) => (v === '' ? NaN : Number(v));
  const md = (label: string, m: number, d: number, set: (m: number, d: number) => void) => (
    <div className="flex items-end gap-2">
      <label className="text-[11px] text-slate-500">{label}<select value={m} onChange={(e) => set(Number(e.target.value), d)} className={`${inp} w-full mt-1`}>{MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select></label>
      <label className="text-[11px] text-slate-500">Day<input type="number" min={1} max={31} value={d} onChange={(e) => set(m, num(e.target.value))} className={`${inp} w-16 mt-1`} /></label>
    </div>
  );
  const save = () => {
    const e = validateSettings(s);
    if (e) { setErr(e); return; }
    if (s.status === 'approved' && s.interestPctPerMonth === null && !window.confirm('Interest % per month is blank, so no interest will be charged. Save as approved anyway?')) return;
    setErr(''); onSave(s);
  };
  return (
    <div className="mt-3 space-y-3 text-xs">
      <div className="grid sm:grid-cols-2 gap-3">
        {md('Due date: month', s.dueMonth, s.dueDay, (m, d) => setS({ ...s, dueMonth: m, dueDay: d }))}
        <label className="text-[11px] text-slate-500">Clause for due date<input value={s.clauses.due || ''} onChange={(e) => setS({ ...s, clauses: { ...s.clauses, due: e.target.value } })} className={`${inp} w-full mt-1`} /></label>
        <label className="text-[11px] text-slate-500">Interest % per month, or part of a month (blank = none)<input type="number" step="0.01" value={s.interestPctPerMonth ?? ''} onChange={(e) => setS({ ...s, interestPctPerMonth: e.target.value === '' ? null : num(e.target.value) })} className={`${inp} w-full mt-1`} /></label>
        <label className="text-[11px] text-slate-500">Grace days after due date<input type="number" min={0} value={s.interestGraceDays} onChange={(e) => setS({ ...s, interestGraceDays: num(e.target.value) })} className={`${inp} w-full mt-1`} /></label>
        <label className="text-[11px] text-slate-500 sm:col-span-2">Clause for interest<input value={s.clauses.interest || ''} onChange={(e) => setS({ ...s, clauses: { ...s.clauses, interest: e.target.value } })} className={`${inp} w-full mt-1`} /></label>
        <label className="text-[11px] text-slate-500">Early-payment rebate % (0 = none)<input type="number" step="0.01" value={s.rebatePct} onChange={(e) => setS({ ...s, rebatePct: num(e.target.value) })} className={`${inp} w-full mt-1`} /></label>
        {md('Rebate last date: month', s.rebateMonth, s.rebateDay, (m, d) => setS({ ...s, rebateMonth: m, rebateDay: d }))}
        <label className="text-[11px] text-slate-500 sm:col-span-2">Clause for rebate<input value={s.clauses.rebate || ''} onChange={(e) => setS({ ...s, clauses: { ...s.clauses, rebate: e.target.value } })} className={`${inp} w-full mt-1`} /></label>
        <label className="text-[11px] text-slate-500 sm:col-span-2">Notes<textarea value={s.notes} onChange={(e) => setS({ ...s, notes: e.target.value })} rows={2} className={`${inp} w-full mt-1`} /></label>
        <label className="text-[11px] text-slate-500">Status
          <select value={s.status} onChange={(e) => setS({ ...s, status: e.target.value as CollectionSettings['status'] })} className={`${inp} w-full mt-1`}><option value="placeholder">placeholder</option><option value="approved">approved (notified rules)</option></select>
        </label>
      </div>
      <p className="text-[11px] text-slate-400">Interest is simple, charged at the start of each month after the due date on the tax still unpaid at that moment. Payments clear interest first, then tax, oldest year first. Changing these rules changes the dues shown for all properties from now on.</p>
      {err && <p className="text-red-600">{err}</p>}
      <button type="button" disabled={busy} onClick={save} className={`${btn} bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20`}>Save rules</button>
    </div>
  );
};
