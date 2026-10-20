import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { PropertyRecord } from '../utils/gisUtils';
import { HeadId, headLabel } from '../services/heads';
import { useAllLedgers, useAllSettings } from '../services/liability';
import { fixedAmountFor, isMonthly, savePayableRates, usePayableRates } from '../services/payableRates';
import { expandForHead, isUnitHead, needsUnits } from '../services/units';
import { generateDemands, generateFixedDemands, saveHeadSettings, useAudit } from '../services/collectionStore';
import { useAssessments } from '../services/assessmentStore';
import { financialYearOf } from '../services/assessment';
import { monthKeys, periodLabel, liveDemand } from '../services/collection';
import type { LedgerEntry } from '../services/collection';
import { BillRemoval } from './BillRemoval';
import { useAuth, canSetPayableRates } from '../services/auth';
import { money, RateRow, SettingsEditor } from './CollectionPanel';

interface Props { townKey: string; townName: string; records: PropertyRecord[]; heads: HeadId[] }

const card = 'bg-[#181f3d] border border-[#28325c] rounded-xl p-4';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const amt = (n: number | null | undefined) => (n === null || n === undefined ? 'not set' : money(n));
const sel = 'h-11 rounded-lg bg-[#0d1224] border border-[#2f3a6b] px-2 text-sm text-white outline-none focus:border-[#9aa8ff]';

/**
 * One page for the admin: every bill head's rules and amounts side by side, the recent changes to them,
 * and one button to generate the demand of all heads (or of a single head).
 */
export const DemandCenter: React.FC<Props> = ({ townKey, townName, records, heads }) => {
  const { role, isSuper } = useAuth();
  const { ledgers, status } = useAllLedgers(townKey);
  const { settings, ready } = useAllSettings(townKey);
  const rates = usePayableRates(townKey);
  const audit = useAudit(townKey, true);

  const thisFy = financialYearOf(new Date());
  const prevFy = financialYearOf(new Date(new Date().getFullYear() - 1, 5, 1));
  const [fy, setFy] = useState(thisFy);
  const [month, setMonth] = useState(monthKeys(0, 0)[0]);
  const assessments = useAssessments(townKey, fy);

  const [open, setOpen] = useState<HeadId | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [results, setResults] = useState<string[]>([]);

  const town = useMemo(() => records.filter((r) => r && r.id && r.town === townName), [records, townName]);

  const plan = useMemo(() => heads.map((h) => {
    const led = ledgers[h] || {};
    const r = rates[h];
    const s = settings[h];
    if (h === 'property_tax') {
      const ok = Object.entries(assessments).filter(([, a]) => a.status === 'approved' && a.calc.tax !== null && a.calc.tax > 0);
      const pend = ok.filter(([pid]) => !liveDemand(led[pid] || [], fy));
      return { head: h, period: fy, targets: ok.length, pending: pend.length, amount: pend.reduce((a, [, x]) => a + (x.calc.tax || 0), 0), recs: [] as PropertyRecord[], warns: [] as string[], s, r };
    }
    const period = isMonthly(h, r) ? month : fy;
    const recs = expandForHead(town, h, led);
    const live = recs.filter((x) => x.billable !== false);
    const targets = live.filter((x) => (fixedAmountFor(r, x.use) ?? 0) > 0);
    const pend = targets.filter((x) => !liveDemand(led[x.id] || [], period));
    const warns: string[] = [];
    const noRate = live.length - targets.length;
    if (noRate > 0) warns.push(`${noRate} item${noRate > 1 ? 's have' : ' has'} no amount (use is not Residential/Commercial, or the amount is not set).`);
    if (isUnitHead(h)) {
      const nu = town.filter(needsUnits).length;
      if (nu > 0) warns.push(`${nu} mixed-use building${nu > 1 ? 's have' : ' has'} no units yet, so nothing is billed for ${nu > 1 ? 'them' : 'it'}. Add units on the Units page.`);
      const vac = live.filter((x) => x.occ === 'Vacant').length;
      if (vac > 0) warns.push(`${vac} vacant unit${vac > 1 ? 's are' : ' is'} still billed. Untick "In use" on the Units page to stop that.`);
    }
    return { head: h, period, targets: targets.length, pending: pend.length, amount: pend.reduce((a, x) => a + (fixedAmountFor(r, x.use) ?? 0), 0), recs: live, warns, s, r };
  }), [heads, ledgers, rates, settings, assessments, town, fy, month]);

  if (!(isSuper || canSetPayableRates(role))) return <p className="text-[#ff9fa2]">Only the ULB admin can open the demand centre.</p>;

  const run = async (done: string, work: () => Promise<void>) => {
    setBusy(true); setErr(''); setNote('');
    try { await work(); setNote(done); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save. Check the internet connection and try again.'); }
    setBusy(false);
  };

  const gen = async (p: typeof plan[number], led: Record<string, LedgerEntry[]> = ledgers[p.head] || {}, inScope: (key: string) => boolean = () => true): Promise<string> => {
    if (p.head === 'property_tax') {
      const r = await generateDemands(townKey, fy, Object.fromEntries(Object.entries(assessments).filter(([pid]) => inScope(pid))), led);
      return `${r.created} created, ${r.skippedExisting} already had one${r.noTax ? `, ${r.noTax} skipped (no tax computed)` : ''}`;
    }
    const r = await generateFixedDemands(townKey, p.period, p.recs.filter((x) => inScope(x.id)).map((x) => ({ id: x.id, use: x.use })), p.r || { residential: null, commercial: null }, led, p.head);
    return `${r.created} created, ${r.skippedExisting} already had one, ${r.noRate} skipped`;
  };

  const generateOne = (p: typeof plan[number]) => {
    if (!window.confirm(`Generate ${headLabel(p.head)} demand for ${periodLabel(p.period)}?\n\n${p.pending} bill${p.pending === 1 ? '' : 's'} · ${money(p.amount)}\n\nA demand cannot be edited afterwards, only adjusted or reversed.`)) return;
    setResults([]);
    void run(`${headLabel(p.head)} demand done.`, async () => { setResults([`${headLabel(p.head)} (${periodLabel(p.period)}): ${await gen(p)}`]); });
  };

  const generateAll = () => {
    const todo = plan.filter((p) => p.pending > 0);
    if (!todo.length) return;
    const lines = todo.map((p) => `• ${headLabel(p.head)} · ${periodLabel(p.period)}: ${p.pending} bills, ${money(p.amount)}`).join('\n');
    const total = todo.reduce((a, p) => a + p.amount, 0);
    const unofficial = todo.filter((p) => p.s.status !== 'approved').map((p) => headLabel(p.head));
    if (!window.confirm(`Generate demand for all heads?\n\n${lines}\n\nTotal ${money(total)}${unofficial.length ? `\n\nRules still "placeholder" for: ${unofficial.join(', ')}. Their interest and due dates are not official yet.` : ''}\n\nA demand cannot be edited afterwards, only adjusted or reversed.`)) return;
    setResults([]);
    void run('All demands done.', async () => {
      const out: string[] = [];
      for (const p of todo) {
        try { out.push(`${headLabel(p.head)} (${periodLabel(p.period)}): ${await gen(p)}`); }
        catch (e) { out.push(`${headLabel(p.head)}: FAILED, ${e instanceof Error ? e.message : 'error'}`); }
      }
      setResults(out);
    });
  };

  const copyToAll = (from: HeadId) => {
    const others = heads.filter((h) => h !== from);
    if (!others.length || !window.confirm(`Use the ${headLabel(from)} due date, interest, grace days and rebate for ${others.map(headLabel).join(', ')} as well?\n\nFixed amounts are not copied.`)) return;
    void run('Rules copied to all bills.', async () => { for (const h of others) await saveHeadSettings(townKey, h, { ...settings[from], clauses: { ...settings[from].clauses } }); });
  };

  const changes = audit.filter((a) => ['rates', 'demand', 'adjustment'].includes(a.action)).slice(-15).reverse();
  const pendingAll = plan.reduce((a, p) => a + p.pending, 0);
  const amountAll = plan.reduce((a, p) => a + p.amount, 0);
  const loading = !ready || status !== 'ready';

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      <div className={card}>
        <h2 className="text-xl font-bold text-white">Demand centre · {townName}</h2>
        <p className="text-sm text-[#aab4dc] mt-1">Rules and amounts of every bill head on one page, and one button to generate the demand.</p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <label className="text-[11px] font-bold text-[#aab4dc] uppercase">Month (monthly heads)
            <select className={`${sel} w-full mt-1`} value={month} onChange={(e) => setMonth(e.target.value)}>
              {monthKeys(5, 1).reverse().map((m) => <option key={m} value={m}>{periodLabel(m)}</option>)}
            </select></label>
          <label className="text-[11px] font-bold text-[#aab4dc] uppercase">Financial year (yearly heads)
            <select className={`${sel} w-full mt-1`} value={fy} onChange={(e) => setFy(e.target.value)}>
              {[thisFy, prevFy].map((y) => <option key={y} value={y}>{y}</option>)}
            </select></label>
        </div>
      </div>

      {loading && <p className="text-sm text-[#aab4dc]">Loading…</p>}

      {!loading && (
        <div className={`${card} border-[#f2b233]/60 space-y-3`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-[#aab4dc]">Ready to generate</div>
              <b className="text-xl text-[#ffe3a3]">{pendingAll} bill{pendingAll === 1 ? '' : 's'} · {money(amountAll)}</b>
            </div>
            <button type="button" disabled={busy || !pendingAll} onClick={generateAll}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl font-bold bg-[#f2b233] text-[#2b1d00] disabled:opacity-40"><Zap className="w-5 h-5" /> Generate all</button>
          </div>
          {note && <p role="status" className="text-sm text-[#34d399] flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{note}</p>}
          {err && <p role="alert" className="text-sm text-[#ff9fa2]">{err}</p>}
          {results.map((x) => <p key={x} className="text-xs text-[#d6dcf5]">{x}</p>)}
        </div>
      )}

      {!loading && plan.map((p) => {
        const isOpen = open === p.head;
        const official = p.s.status === 'approved';
        return (
          <section key={p.head} className={card}>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-white">{headLabel(p.head)}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${official ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{official ? 'Rules approved' : 'Rules placeholder'}</span>
                </div>
                <div className="text-xs text-[#aab4dc] mt-1 space-y-0.5">
                  {p.head === 'property_tax'
                    ? <div>Amount: from approved assessments ({p.targets} approved)</div>
                    : <div>Residential <b className="text-white">{amt(p.r?.residential)}</b> · Commercial <b className="text-white">{amt(p.r?.commercial)}</b> · {isMonthly(p.head, p.r) ? 'every month' : 'once a year'}</div>}
                  <div>Due {p.s.dueDay} {MON[p.s.dueMonth - 1]} · Grace {p.s.interestGraceDays} days · Interest {p.s.interestPctPerMonth === null ? 'not set' : `${p.s.interestPctPerMonth}%/month`} · Rebate {p.s.rebatePct}%</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 mt-3 rounded-lg bg-[#121830] p-3">
              <div className="text-sm">
                <div className="text-[#aab4dc] text-xs">{periodLabel(p.period)}</div>
                <b className="text-white">{p.pending} to generate</b> <span className="text-[#aab4dc]">of {p.targets}</span>
                <b className="ml-2 text-[#ffe3a3]">{money(p.amount)}</b>
              </div>
              <button type="button" disabled={busy || !p.pending} onClick={() => generateOne(p)} className="text-sm font-bold px-3 py-2.5 rounded-lg bg-[#4f46e5] text-white disabled:opacity-40">Generate</button>
            </div>
            {p.warns.map((w) => <p key={w} className="mt-2 text-[11px] text-[#ffe3a3] flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 flex-none mt-0.5" />{w}</p>)}
            <button type="button" onClick={() => setOpen(isOpen ? null : p.head)} aria-expanded={isOpen} className="mt-3 w-full text-left text-sm font-bold text-[#9aa8ff] flex items-center gap-1">
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />} Change amounts and rules
            </button>
            {isOpen && (
              <div className="mt-3 space-y-4">
                <RateRow key={`r-${p.head}-${JSON.stringify(rates[p.head] ?? null)}`} head={p.head} initial={rates[p.head]} busy={busy} townName={townName}
                  onSave={(hd, r) => void run(`${headLabel(hd)} amounts saved.`, () => savePayableRates(townKey, hd, r, rates[hd]))} />
                <div className="bg-[#121830] rounded-lg p-3">
                  <h4 className="text-xs font-bold text-[#ffe3a3] uppercase tracking-wider">Due date, interest and rebate</h4>
                  <SettingsEditor key={`s-${p.head}-${JSON.stringify(p.s)}`} initial={p.s} busy={busy}
                    onSave={(s) => void run(`${headLabel(p.head)} rules saved.`, () => saveHeadSettings(townKey, p.head, s))} />
                  {heads.length > 1 && <button type="button" disabled={busy} onClick={() => copyToAll(p.head)} className="mt-3 text-xs font-bold px-3 py-2 rounded-lg bg-[#2a3464] text-[#9aa8ff] disabled:opacity-40">Use these rules for all bills</button>}
                </div>
              </div>
            )}
          </section>
        );
      })}

      {!loading && (
        <BillRemoval
          townKey={townKey} town={town} heads={heads} ledgers={ledgers} busy={busy}
          periodOf={(h) => plan.find((p) => p.head === h)?.period || fy}
          regenerate={(h, led, inScope) => gen(plan.find((p) => p.head === h) as typeof plan[number], led, inScope)}
          run={(done, work) => run(done, work)}
          report={(lines) => setResults(lines)}
        />
      )}

      {!loading && (
        <section className={card}>
          <h3 className="text-sm font-bold text-[#ffe3a3] uppercase tracking-wider">Recent changes</h3>
          {!changes.length && <p className="text-xs text-[#aab4dc] mt-2">No changes recorded yet.</p>}
          <div className="mt-2 space-y-2">
            {changes.map((a) => (
              <div key={a.id} className="text-xs border-b border-[#252e56] pb-2">
                <div className="text-[#8790bd]">{new Date(a.at).toLocaleString('en-IN')} · {a.action === 'rates' ? 'Amount changed' : a.action === 'demand' ? 'Demand generated' : 'Adjustment'}</div>
                <div className="text-[#d6dcf5]">{a.detail}</div>
              </div>
            ))}
          </div>
        </section>
      )}
      <p className="text-[11px] text-[#8790bd]">Changing an amount or rule does not change demands already generated; use an adjustment for those. Interest counts only for heads whose rules are approved.</p>
    </div>
  );
};
