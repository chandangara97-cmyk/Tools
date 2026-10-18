import React, { useMemo, useState } from 'react';
import { AlertTriangle, Printer, Download, Undo2, Receipt, Search, Landmark } from 'lucide-react';
import type { PropertyRecord } from '../utils/gisUtils';
import { triggerFileDownload } from '../utils/gisUtils';
import { useAuth, canCollect, canManageLedger, canSeeAudit, canEditRates, canSetPayableRates } from '../services/auth';
import { PayableRates, fixedAmountFor, savePayableRates, usePayableRates, validateRates } from '../services/payableRates';
import { financialYearOf } from '../services/assessment';
import { useAssessments } from '../services/assessmentStore';
import {
  CollectionSettings, LedgerEntry, PayMode, computeLedger, previewPayment, quoteFull, rupeesInWords,
  todayIso, validateSettings, dueDateOf,
} from '../services/collection';
import {
  generateDemands, generateFixedDemands, postAdjustment, postPayment, reverseEntries, saveCollectionSettings, useAudit, useLedgers,
} from '../services/collectionStore';

interface Props {
  townKey: string;
  townName: string;
  records: PropertyRecord[];
  settings: CollectionSettings;
  settingsSaved: boolean;
}

export const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const inp = 'bg-[#091a1f] border border-[#23534d] text-white text-xs rounded p-1.5';
const card = 'bg-[#0f242d] border border-[#1d434c] rounded-xl p-4 shadow-lg';
const btn = 'inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-40';
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

function receiptHtml(o: {
  town: string; rec: PropertyRecord; pay: LedgerEntry; rebate?: LedgerEntry; cancelled: boolean;
  parts: { fy: string; interest: number; principal: number }[]; balanceAfter: number;
}) {
  const { town, rec, pay, rebate, cancelled, parts, balanceAfter } = o;
  const rows = parts.map((p) => `<tr><td>${esc(p.fy)}</td><td class="r">${money(p.principal)}</td><td class="r">${money(p.interest)}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(pay.receiptNo)}</title>
<style>body{font-family:Arial,sans-serif;font-size:13px;margin:24px;color:#111}h1{font-size:18px;margin:0}h2{font-size:14px;margin:2px 0 14px}
table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #999;padding:5px 8px;text-align:left}.r{text-align:right}
.kv td{border:none;padding:2px 8px 2px 0}.big{font-size:16px;font-weight:bold}.stamp{color:#b00;font-size:28px;font-weight:bold;border:3px solid #b00;display:inline-block;padding:2px 12px;transform:rotate(-6deg);margin:6px 0}
.sig{margin-top:48px;display:flex;justify-content:space-between}</style></head><body>
<h1>${esc(town)}</h1><h2>Property tax receipt</h2>
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

export const CollectionPanel: React.FC<Props> = ({ townKey, townName, records, settings, settingsSaved }) => {
  const { role, displayName } = useAuth();
  const ledgers = useLedgers(townKey);
  const { rates } = usePayableRates(townKey);
  const audit = useAudit(townKey, canSeeAudit(role));
  const today = todayIso();
  const thisFy = financialYearOf(new Date());
  const [fy, setFy] = useState(thisFy);
  const assessments = useAssessments(townKey, fy);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [collectionPage, setCollectionPage] = useState<'overview' | 'properties' | 'settings' | 'rates' | 'audit'>('overview');

  const townRecords = useMemo(() => records.filter((r) => r.town === townName), [records, townName]);
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
  const alreadyDemanded = rows.filter(({ entries }) => entries.some((e) => e.id === `demand_${fy}`)).length;

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

  const fixedTargets = useMemo(() => townRecords.filter((r) => (fixedAmountFor(rates, r.use) ?? 0) > 0), [townRecords, rates]);
  const fixedPending = fixedTargets.filter((r) => !(ledgers[r.id] || []).some((e) => e.id === `demand_${fy}`)).length;
  const generateFixed = () => {
    if (!window.confirm(`Generate demand for ${fy} from the fixed amounts (Residential ${rates.residential === null ? 'not set' : money(rates.residential)}, Commercial ${rates.commercial === null ? 'not set' : money(rates.commercial)}) for ${fixedPending} propert${fixedPending === 1 ? 'y' : 'ies'}?\n\nA demand cannot be edited afterwards, only adjusted or reversed.`)) return;
    void run('Fixed-amount demand', async () => {
      const r = await generateFixedDemands(townKey, fy, townRecords.map((x) => ({ id: x.id, use: x.use })), rates, ledgers);
      return `${r.created} created, ${r.skippedExisting} already had one, ${r.noRate} skipped (not Residential/Commercial or no amount set).`;
    });
  };

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = rows.filter(({ r }) => !t || [r.id, r.owner, r.hno, r.ward].some((x) => String(x).toLowerCase().includes(t)));
    return f.sort((a, b) => b.led.totalDue - a.led.totalDue).slice(0, 100);
  }, [rows, q]);

  const exportLedger = () => {
    const head = ['Property ID', 'Ward', 'Owner', 'Year', 'Due date', 'Demand', 'Adjustments', 'Rebate', 'Paid tax', 'Paid interest', 'Tax due', 'Interest due', 'Total due'];
    const qt = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const lines: string[] = [];
    rows.forEach(({ r, led }) => led.rows.forEach((x) => lines.push([r.id, r.ward, qt(r.owner), x.fy, x.dueDate, x.demand, x.adjustments, x.rebate, x.paidPrincipal, x.paidInterest, x.principalDue, x.interestDue, x.totalDue].join(','))));
    triggerFileDownload([head.join(','), ...lines].join('\n'), `${townName}_Ledger_${today}.csv`, 'text/csv');
  };

  const selected = sel ? rows.find(({ r }) => r.id === sel) : undefined;

  return (
    <div className="space-y-4">
      {(settings.status === 'placeholder' || settings.interestPctPerMonth === null) && (
        <div className="rounded-lg p-3 text-xs bg-[#d6a34b]/20 text-[#f7dfae] border border-[#d6a34b]/40 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-none mt-0.5" />
          <span>
            {settingsSaved ? 'Collection rules are saved but marked placeholder.' : 'No collection rules saved for this town yet.'}{' '}
            {settings.interestPctPerMonth === null ? 'Interest is not set, so none is charged. ' : ''}
            {settings.rebatePct === 0 ? 'No early-payment rebate is set. ' : ''}
            An admin must enter the notified due date, interest and rebate rules and mark them approved.
          </span>
        </div>
      )}

      <div className="rounded-2xl border border-[#23534d] bg-gradient-to-r from-[#102d35] via-[#0e282f] to-[#102c2a] p-3 sm:p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div><p className="text-[10px] uppercase tracking-[.22em] font-bold text-[#20b5a6]">Collection workspace</p><h2 className="text-lg font-extrabold text-white">Property tax collection</h2><p className="text-xs text-[#9fc7c1]">Each work area opens as its own page.</p></div>
          <span className="text-xs text-[#f7dfae] bg-[#d6a34b]/10 border border-[#d6a34b]/30 rounded-full px-3 py-1.5">{townName}</span>
        </div>
        <nav className="grid grid-cols-2 md:grid-cols-5 gap-2" aria-label="Collection pages">
          {([{id:'overview',n:'01',title:'Demand overview',sub:'Summary & generation'},{id:'properties',n:'02',title:'Properties & ledger',sub:'Search dues and record payment'},{id:'settings',n:'03',title:'Rules & settings',sub:'Due date, interest, rebate'},...(canSetPayableRates(role) ? [{id:'rates',n:'04',title:'Fixed amounts',sub:'Residential & commercial'} as const] : []),{id:'audit',n:canSetPayableRates(role) ? '05' : '04',title:'Audit trail',sub:'Review recorded actions'}] as const).map((item) => (
            <button key={item.id} type="button" onClick={() => setCollectionPage(item.id)} className={`text-left rounded-xl border p-3 transition-all ${collectionPage === item.id ? 'bg-[#0e8a7d] border-[#20b5a6] shadow-lg shadow-black/20' : 'bg-[#091a1f]/70 border-[#23534d] hover:border-[#20b5a6]/70 hover:bg-[#12343a]'}`}>
              <span className={`text-[10px] font-black tracking-widest ${collectionPage === item.id ? 'text-[#f7dfae]' : 'text-[#20b5a6]'}`}>{item.n}</span><span className="block text-xs font-bold text-white mt-1">{item.title}</span><span className="block text-[10px] text-[#c5d8df] mt-1">{item.sub}</span>
            </button>
          ))}
        </nav>
      </div>

      {collectionPage === 'overview' && <div className={`${card} space-y-3`}>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-bold text-[#20b5a6] uppercase tracking-wider flex items-center gap-2"><Landmark className="w-4 h-4" /> Demand &amp; collection</h3>
          <select value={fy} onChange={(e) => setFy(e.target.value)} className={inp}>
            {[-1, 0, 1].map((d) => { const y = parseInt(thisFy.slice(0, 4), 10) + d; const l = `${y}-${String((y + 1) % 100).padStart(2, '0')}`; return <option key={l} value={l}>{l}</option>; })}
          </select>
          <span className="text-[11px] text-[#9fc7c1]">Due date for {fy}: {dueDateOf(fy, settings)}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#091a1f] rounded-lg p-3"><span className="text-[#9fc7c1] block">Tax outstanding</span><b className="text-lg font-mono text-white">{money(totals.principal)}</b></div>
          <div className="bg-[#091a1f] rounded-lg p-3"><span className="text-[#9fc7c1] block">Interest outstanding</span><b className="text-lg font-mono text-[#f7dfae]">{money(totals.interest)}</b></div>
          <div className="bg-[#091a1f] rounded-lg p-3"><span className="text-[#9fc7c1] block">Properties with dues</span><b className="text-lg font-mono text-white">{totals.withDues}</b></div>
          <div className="bg-[#091a1f] rounded-lg p-3"><span className="text-[#9fc7c1] block">Demand raised for {fy}</span><b className="text-lg font-mono text-white">{alreadyDemanded} / {approvedCount}</b><span className="text-[10px] text-[#7fa6a0]">approved assessments with tax</span></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageLedger(role) && (
            <button type="button" disabled={busy || approvedCount === alreadyDemanded} onClick={generate} className={`${btn} bg-[#0e8a7d] text-white`}>
              Generate demand for {fy}
            </button>
          )}
          {canManageLedger(role) && (
            <button type="button" disabled={busy || fixedPending === 0} onClick={generateFixed} className={`${btn} bg-[#d6a34b] text-[#2b1d00]`}>
              Generate demand from fixed amounts ({fixedPending})
            </button>
          )}
          <button type="button" onClick={exportLedger} disabled={!rows.some(({ led }) => led.rows.length)} className={`${btn} bg-[#142831] text-[#9fc7c1] border border-[#23534d]`}>
            <Download className="w-3.5 h-3.5" /> Ledger summary (CSV)
          </button>
        </div>
        {msg && <p className="text-xs text-[#f7dfae]">{msg}</p>}
      </div>}

      {collectionPage === 'properties' && <div className={`${card} space-y-3`}>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-[#9fc7c1]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search property ID, owner, house no., ward" className={`${inp} flex-1`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[#9fc7c1] border-b border-[#1d434c]">
              <tr><th className="p-2">Property</th><th className="p-2">Ward</th><th className="p-2 text-right">Fixed amount</th><th className="p-2 text-right">Tax due</th><th className="p-2 text-right">Interest</th><th className="p-2 text-right">Total</th><th className="p-2"></th></tr>
            </thead>
            <tbody>
              {list.map(({ r, led }) => (
                <tr key={r.id} className={`border-b border-[#14333b] text-white ${sel === r.id ? 'bg-[#142831]' : ''}`}>
                  <td className="p-2 font-mono">{r.id}<div className="text-[10px] text-[#9fc7c1] font-sans">{r.owner}</div></td>
                  <td className="p-2">{r.ward}</td>
                  <td className="p-2 text-right text-[#f7dfae]">{fixedAmountFor(rates, r.use) === null ? '—' : money(fixedAmountFor(rates, r.use) as number)}<div className="text-[10px] text-[#9fc7c1]">{r.use}</div></td>
                  <td className="p-2 text-right">{money(led.principalDue)}</td>
                  <td className="p-2 text-right">{money(led.interestDue)}</td>
                  <td className="p-2 text-right font-bold">{money(led.totalDue)}</td>
                  <td className="p-2"><button type="button" className="text-[#20b5a6] font-bold" onClick={() => setSel(sel === r.id ? null : r.id)}>{sel === r.id ? 'Close' : 'Open'}</button></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={7} className="p-4 text-center text-[#9fc7c1]">No matching properties.</td></tr>}
            </tbody>
          </table>
          {rows.length > 100 && <p className="text-[10px] text-[#7fa6a0] mt-1">Showing the 100 highest dues. Search to find others.</p>}
        </div>
      </div>}

      {selected && collectionPage === 'properties' && (
        <PropertyLedger
          key={selected.r.id}
          town={townName} townKey={townKey} rec={selected.r} entries={selected.entries} settings={settings}
          busy={busy} run={run} role={role} fixedAmount={fixedAmountFor(rates, selected.r.use)}
        />
      )}

      {collectionPage === 'settings' && canEditRates(role) && (
        <div className={card}>
          <button type="button" className="text-xs font-bold text-[#20b5a6]" onClick={() => setShowSettings(!showSettings)}>
            {showSettings ? 'Close' : 'Enter / edit'} due date, interest and rebate rules for {townName}
          </button>
          {showSettings && <SettingsEditor key={JSON.stringify(settings)} initial={settings} busy={busy} onSave={(s) => void run('Collection rules saved', async () => { await saveCollectionSettings(townKey, s); setShowSettings(false); })} />}
        </div>
      )}

      {collectionPage === 'rates' && canSetPayableRates(role) && <RateFiller key={`${rates.residential}-${rates.commercial}`} townName={townName} initial={rates} busy={busy} onSave={(r) => void run('Fixed amounts saved', async () => { await savePayableRates(townKey, r, rates); })} />}

      {collectionPage === 'audit' && canSeeAudit(role) && (
        <div className={card}>
          <h4 className="text-xs font-bold text-[#9fc7c1] uppercase tracking-wider mb-2">Audit log (latest 60)</h4>
          <div className="max-h-64 overflow-y-auto text-[11px] font-mono space-y-1 text-[#cfe6e2]">
            {audit.map((a) => <div key={a.id}>{new Date(a.at).toLocaleString('en-IN')} · {a.by.slice(0, 6)} · <b>{a.action}</b>{a.propertyId ? ` · ${a.propertyId}` : ''} · {a.detail}</div>)}
            {!audit.length && <div className="text-[#7fa6a0]">Nothing logged yet.</div>}
          </div>
        </div>
      )}
      {collectionPage === 'settings' && !canEditRates(role) && <div className={card}><p className="text-sm font-bold text-white">Settings access restricted</p><p className="text-xs text-[#9fc7c1] mt-1">Your role cannot edit collection rules. Contact an administrator.</p></div>}
      {collectionPage === 'audit' && !canSeeAudit(role) && <div className={card}><p className="text-sm font-bold text-white">Audit access restricted</p><p className="text-xs text-[#9fc7c1] mt-1">Your role cannot view the audit trail.</p></div>}
      <p className="text-[11px] text-[#7fa6a0]">Signed in as {displayName}. Ledger entries cannot be edited or deleted; mistakes are fixed with a reversal. Needs an internet connection.</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
const PropertyLedger: React.FC<{
  town: string; townKey: string; rec: PropertyRecord; entries: LedgerEntry[]; settings: CollectionSettings;
  busy: boolean; run: (label: string, work: () => Promise<string | void>) => Promise<void>; role: ReturnType<typeof useAuth>['role'];
  fixedAmount: number | null;
}> = ({ town, townKey, rec, entries, settings, busy, run, role, fixedAmount }) => {
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
      ref: refNo, payer, note, rebateFy: useRebate ? rebateFy : undefined,
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
    void run('Reversal', async () => { await reverseEntries(townKey, rec.id, entries, ids, why); });
  };

  const printReceipt = (pay: LedgerEntry, download: boolean) => {
    const rebate = entries.find((x) => x.type === 'rebate' && x.receiptNo === pay.receiptNo);
    const parts = led.allocations[pay.id]?.parts || [];
    const upTo = entries.filter((x) => x.at <= Math.max(pay.at, rebate?.at || 0) && !(x.type === 'reversal'));
    const balanceAfter = computeLedger(upTo, settings, pay.date).totalDue;
    const html = receiptHtml({ town, rec, pay, rebate, cancelled: cancelled.has(pay.id), parts, balanceAfter });
    if (download) triggerFileDownload(html, `Receipt_${(pay.receiptNo || pay.id).replace(/[^A-Za-z0-9]/g, '_')}.html`, 'text/html');
    else printHtml(html);
  };

  const submitAdjust = () => run('Adjustment', async () => {
    await postAdjustment(townKey, rec.id, adjFy, parseFloat(adjAmt), adjWhy, today);
    setAdjAmt(''); setAdjWhy('');
  });

  return (
    <div className={`${card} space-y-4`}>
      <div>
        <h3 className="text-sm font-bold text-white font-mono">{rec.id}</h3>
        <p className="text-xs text-[#9fc7c1]">{rec.owner} · ward {rec.ward} · house/plot {rec.hno}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="text-[#9fc7c1] border-b border-[#1d434c]">
            <tr><th className="p-2">Year</th><th className="p-2">Due on</th><th className="p-2 text-right">Demand</th><th className="p-2 text-right">Rebate</th><th className="p-2 text-right">Paid</th><th className="p-2 text-right">Tax due</th><th className="p-2 text-right">Interest due</th></tr>
          </thead>
          <tbody>
            {led.rows.map((x) => (
              <tr key={x.fy} className="border-b border-[#14333b] text-white">
                <td className="p-2">{x.fy}</td><td className="p-2">{x.dueDate}</td>
                <td className="p-2 text-right">{money(x.demand + x.adjustments)}</td>
                <td className="p-2 text-right">{money(x.rebate)}</td>
                <td className="p-2 text-right">{money(x.paidPrincipal + x.paidInterest)}</td>
                <td className="p-2 text-right">{money(x.principalDue)}</td>
                <td className="p-2 text-right">{money(x.interestDue)}</td>
              </tr>
            ))}
            {!led.rows.length && <tr><td colSpan={7} className="p-3 text-center text-[#9fc7c1]">No demand raised for this property yet.</td></tr>}
          </tbody>
        </table>
        <p className="text-sm font-bold text-[#f7dfae] mt-2">Total due today: {money(led.totalDue)}</p>
        {led.warnings.map((w) => <p key={w} className="text-[11px] text-[#f7dfae]">⚠ {w}</p>)}
      </div>

      {canCollect(role) && led.totalDue > 0 && (
        <div className="bg-[#091a1f] rounded-lg p-3 space-y-2">
          <h4 className="text-xs font-bold text-[#20b5a6] uppercase tracking-wider flex items-center gap-1"><Receipt className="w-3.5 h-3.5" /> Take payment</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <label className="text-[11px] text-[#9fc7c1]">Amount (₹)<input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inp} w-full mt-1`} /></label>
            <label className="text-[11px] text-[#9fc7c1]">Date<input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value || today)} className={`${inp} w-full mt-1`} /></label>
            <label className="text-[11px] text-[#9fc7c1]">Mode
              <select value={mode} onChange={(e) => setMode(e.target.value as PayMode)} className={`${inp} w-full mt-1`}>
                <option value="cash">Cash</option><option value="upi">UPI</option><option value="cheque">Cheque</option><option value="other">Other</option>
              </select>
            </label>
            {mode !== 'cash' && <label className="text-[11px] text-[#9fc7c1]">{mode === 'cheque' ? 'Cheque no.' : mode === 'upi' ? 'UPI txn ID' : 'Reference'}<input value={refNo} onChange={(e) => setRefNo(e.target.value)} className={`${inp} w-full mt-1`} /></label>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-[11px] text-[#9fc7c1]">Paid by (if not the owner)<input value={payer} onChange={(e) => setPayer(e.target.value)} className={`${inp} w-full mt-1`} /></label>
            <label className="text-[11px] text-[#9fc7c1]">Note<input value={note} onChange={(e) => setNote(e.target.value)} className={`${inp} w-full mt-1`} /></label>
          </div>
          {rebateFy && (
            <label className="flex items-center gap-2 text-xs text-[#f7dfae]">
              <input type="checkbox" checked={useRebate} onChange={(e) => setUseRebate(e.target.checked)} />
              Allow early-payment rebate for {rebateFy} ({money(ledAt.rows.find((r) => r.fy === rebateFy)?.rebateAvailable || 0)}), needs full payment
            </label>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {fixedAmount !== null && <button type="button" onClick={() => setAmount(String(Math.min(fixedAmount, ledAt.totalDue)))} className={`${btn} bg-[#d6a34b] text-[#2b1d00]`}>Fill fixed amount ({money(fixedAmount)} {rec.use})</button>}
            <button type="button" onClick={fillFull} className={`${btn} bg-[#142831] text-[#9fc7c1] border border-[#23534d]`}>Fill full amount</button>
            <button type="button" disabled={busy || !preview?.ok} onClick={() => void submit()} className={`${btn} bg-[#0e8a7d] text-white`}>Record payment</button>
          </div>
          {preview && !preview.ok && <p className="text-[11px] text-red-300">{preview.error}</p>}
          {preview?.ok && (
            <div className="text-[11px] text-[#cfe6e2] font-mono">
              {preview.allocation?.parts.map((p) => <div key={p.fy}>{p.fy}: interest {money(p.interest)}, tax {money(p.principal)}</div>)}
              {preview.rebate > 0 && <div>Rebate {money(preview.rebate)} will be posted with this payment.</div>}
              <div>Balance after: {money(preview.result?.totalDue || 0)}</div>
            </div>
          )}
        </div>
      )}

      {canManageLedger(role) && led.rows.length > 0 && (
        <details className="bg-[#091a1f] rounded-lg p-3">
          <summary className="text-xs font-bold text-[#9fc7c1] cursor-pointer">Adjust a year's demand (e.g. after re-assessment)</summary>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            <label className="text-[11px] text-[#9fc7c1]">Year<select value={adjFy} onChange={(e) => setAdjFy(e.target.value)} className={`${inp} w-full mt-1`}>{led.rows.map((x) => <option key={x.fy}>{x.fy}</option>)}</select></label>
            <label className="text-[11px] text-[#9fc7c1]">Amount (+ more, − less)<input type="number" step="0.01" value={adjAmt} onChange={(e) => setAdjAmt(e.target.value)} className={`${inp} w-full mt-1`} /></label>
            <label className="text-[11px] text-[#9fc7c1] col-span-2">Reason<input value={adjWhy} onChange={(e) => setAdjWhy(e.target.value)} className={`${inp} w-full mt-1`} /></label>
          </div>
          <button type="button" disabled={busy || !adjFy || !parseFloat(adjAmt) || !adjWhy.trim()} onClick={() => void submitAdjust()} className={`${btn} bg-[#1b433e] text-[#20b5a6] mt-2`}>Post adjustment</button>
        </details>
      )}

      <div className="overflow-x-auto">
        <h4 className="text-xs font-bold text-[#9fc7c1] uppercase tracking-wider mb-1">Entries</h4>
        <table className="w-full text-xs text-left">
          <thead className="text-[#9fc7c1] border-b border-[#1d434c]"><tr><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Year</th><th className="p-2 text-right">Amount</th><th className="p-2">Receipt / detail</th><th className="p-2"></th></tr></thead>
          <tbody>
            {sorted.map((e) => {
              const isCancelled = cancelled.has(e.id);
              return (
                <tr key={e.id} className={`border-b border-[#14333b] ${isCancelled || e.type === 'reversal' ? 'text-[#7fa6a0]' : 'text-white'}`}>
                  <td className="p-2">{e.date}</td>
                  <td className={`p-2 ${isCancelled ? 'line-through' : ''}`}>{e.type}</td>
                  <td className="p-2">{e.fy}</td>
                  <td className={`p-2 text-right ${isCancelled ? 'line-through' : ''}`}>{money(e.amount)}</td>
                  <td className="p-2 text-[11px]">
                    {e.receiptNo && <span className="font-mono">{e.receiptNo}</span>} {e.mode ? `${e.mode}${e.ref ? ' ' + e.ref : ''}` : ''} {e.reason ? `· ${e.reason}` : ''} {e.note ? `· ${e.note}` : ''}
                    {isCancelled && <b className="text-red-300"> · reversed</b>}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {e.type === 'payment' && (
                      <>
                        <button type="button" title="Print receipt" className="text-[#20b5a6] mr-2" onClick={() => printReceipt(e, false)}><Printer className="inline w-3.5 h-3.5" /></button>
                        <button type="button" title="Download receipt" className="text-[#20b5a6] mr-2" onClick={() => printReceipt(e, true)}><Download className="inline w-3.5 h-3.5" /></button>
                      </>
                    )}
                    {canManageLedger(role) && e.type !== 'reversal' && e.type !== 'rebate' && !isCancelled && (
                      <button type="button" disabled={busy} title="Reverse this entry" className="text-red-300" onClick={() => reverse(e)}><Undo2 className="inline w-3.5 h-3.5" /> Reverse</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!sorted.length && <tr><td colSpan={6} className="p-3 text-center text-[#9fc7c1]">No entries.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
const RateFiller: React.FC<{ townName: string; initial: PayableRates; busy: boolean; onSave: (r: { residential: number | null; commercial: number | null }) => void }> = ({ townName, initial, busy, onSave }) => {
  const [res, setRes] = useState(initial.residential === null ? '' : String(initial.residential));
  const [com, setCom] = useState(initial.commercial === null ? '' : String(initial.commercial));
  const [err, setErr] = useState('');
  const toNum = (v: string) => (v.trim() === '' ? null : Number(v));
  const save = () => {
    const r = { residential: toNum(res), commercial: toNum(com) };
    const e = validateRates(r);
    if (e) { setErr(e); return; }
    if (!window.confirm(`Save fixed amounts for ${townName}?\n\nResidential: ${r.residential === null ? 'not set' : money(r.residential)}\nCommercial: ${r.commercial === null ? 'not set' : money(r.commercial)}\n\nDemands already raised are not changed.`)) return;
    setErr(''); onSave(r);
  };
  return (
    <div className={`${card} space-y-3`}>
      <h3 className="text-sm font-bold text-[#20b5a6] uppercase tracking-wider">Fixed amounts payable · {townName}</h3>
      <p className="text-[11px] text-[#9fc7c1]">Filled by hand for this urban body only. The cashier sees these amounts against each Residential and Commercial property. Other uses have no fixed amount.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-[11px] text-[#9fc7c1]">Residential (₹ per property per year)<input type="number" inputMode="decimal" min="0" step="0.01" value={res} onChange={(e) => setRes(e.target.value)} className={`${inp} w-full mt-1`} /></label>
        <label className="text-[11px] text-[#9fc7c1]">Commercial (₹ per property per year)<input type="number" inputMode="decimal" min="0" step="0.01" value={com} onChange={(e) => setCom(e.target.value)} className={`${inp} w-full mt-1`} /></label>
      </div>
      {err && <p className="text-xs text-red-300">{err}</p>}
      <button type="button" disabled={busy} onClick={save} className={`${btn} bg-[#0e8a7d] text-white`}>Save fixed amounts</button>
      <p className="text-[11px] text-[#7fa6a0]">Changing these does not alter demands already generated; use an adjustment for those. Every change is written to the audit trail.</p>
    </div>
  );
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const SettingsEditor: React.FC<{ initial: CollectionSettings; busy: boolean; onSave: (s: CollectionSettings) => void }> = ({ initial, busy, onSave }) => {
  const [s, setS] = useState<CollectionSettings>(initial);
  const [err, setErr] = useState('');
  const num = (v: string) => (v === '' ? NaN : Number(v));
  const md = (label: string, m: number, d: number, set: (m: number, d: number) => void) => (
    <div className="flex items-end gap-2">
      <label className="text-[11px] text-[#9fc7c1]">{label}<select value={m} onChange={(e) => set(Number(e.target.value), d)} className={`${inp} w-full mt-1`}>{MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select></label>
      <label className="text-[11px] text-[#9fc7c1]">Day<input type="number" min={1} max={31} value={d} onChange={(e) => set(m, num(e.target.value))} className={`${inp} w-16 mt-1`} /></label>
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
        <label className="text-[11px] text-[#9fc7c1]">Clause for due date<input value={s.clauses.due || ''} onChange={(e) => setS({ ...s, clauses: { ...s.clauses, due: e.target.value } })} className={`${inp} w-full mt-1`} /></label>
        <label className="text-[11px] text-[#9fc7c1]">Interest % per month, or part of a month (blank = none)<input type="number" step="0.01" value={s.interestPctPerMonth ?? ''} onChange={(e) => setS({ ...s, interestPctPerMonth: e.target.value === '' ? null : num(e.target.value) })} className={`${inp} w-full mt-1`} /></label>
        <label className="text-[11px] text-[#9fc7c1]">Grace days after due date<input type="number" min={0} value={s.interestGraceDays} onChange={(e) => setS({ ...s, interestGraceDays: num(e.target.value) })} className={`${inp} w-full mt-1`} /></label>
        <label className="text-[11px] text-[#9fc7c1] sm:col-span-2">Clause for interest<input value={s.clauses.interest || ''} onChange={(e) => setS({ ...s, clauses: { ...s.clauses, interest: e.target.value } })} className={`${inp} w-full mt-1`} /></label>
        <label className="text-[11px] text-[#9fc7c1]">Early-payment rebate % (0 = none)<input type="number" step="0.01" value={s.rebatePct} onChange={(e) => setS({ ...s, rebatePct: num(e.target.value) })} className={`${inp} w-full mt-1`} /></label>
        {md('Rebate last date: month', s.rebateMonth, s.rebateDay, (m, d) => setS({ ...s, rebateMonth: m, rebateDay: d }))}
        <label className="text-[11px] text-[#9fc7c1] sm:col-span-2">Clause for rebate<input value={s.clauses.rebate || ''} onChange={(e) => setS({ ...s, clauses: { ...s.clauses, rebate: e.target.value } })} className={`${inp} w-full mt-1`} /></label>
        <label className="text-[11px] text-[#9fc7c1] sm:col-span-2">Notes<textarea value={s.notes} onChange={(e) => setS({ ...s, notes: e.target.value })} rows={2} className={`${inp} w-full mt-1`} /></label>
        <label className="text-[11px] text-[#9fc7c1]">Status
          <select value={s.status} onChange={(e) => setS({ ...s, status: e.target.value as CollectionSettings['status'] })} className={`${inp} w-full mt-1`}><option value="placeholder">placeholder</option><option value="approved">approved (notified rules)</option></select>
        </label>
      </div>
      <p className="text-[11px] text-[#7fa6a0]">Interest is simple, charged at the start of each month after the due date on the tax still unpaid at that moment. Payments clear interest first, then tax, oldest year first. Changing these rules changes the dues shown for all properties from now on.</p>
      {err && <p className="text-red-300">{err}</p>}
      <button type="button" disabled={busy} onClick={save} className={`${btn} bg-[#0e8a7d] text-white`}>Save rules</button>
    </div>
  );
};
