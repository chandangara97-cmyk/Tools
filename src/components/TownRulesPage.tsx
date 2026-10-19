import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { HeadId, headLabel } from '../services/heads';
import { saveHeadSettings } from '../services/collectionStore';
import { useAllSettings } from '../services/liability';
import { PayableRates, savePayableRates, usePayableRates } from '../services/payableRates';
import { CollectionSettings } from '../services/collection';
import { useAuth, canSetPayableRates } from '../services/auth';
import { money, RateRow, SettingsEditor } from './CollectionPanel';

interface Props { townKey: string; townName: string; heads: HeadId[] }

const card = 'bg-[#181f3d] border border-[#28325c] rounded-xl p-4';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const amt = (n: number | null | undefined) => (n === null || n === undefined ? 'not set' : money(n));

const summary = (s: CollectionSettings, r: PayableRates | undefined) => [
  `Residential ${amt(r?.residential)}`, `Commercial ${amt(r?.commercial)}`,
  r?.frequency === 'monthly' ? 'monthly' : 'yearly',
  `Due ${s.dueDay} ${MON[s.dueMonth - 1]}`,
  `Interest ${s.interestPctPerMonth === null ? 'not set' : `${s.interestPctPerMonth}%/month`}`,
  `Rebate ${s.rebatePct}%`,
  s.status === 'approved' ? 'approved' : 'placeholder',
].join(' · ');

/** Admin page: every entry that bills are made from, set once for the whole town. Interest %, due date, rebate and the fixed amounts apply to every property of this ULB. */
export const TownRulesPage: React.FC<Props> = ({ townKey, townName, heads }) => {
  const { role, isSuper } = useAuth();
  const { settings, ready } = useAllSettings(townKey);
  const rates = usePayableRates(townKey);
  const [open, setOpen] = useState<HeadId | null>(heads[0] ?? null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  if (!(isSuper || canSetPayableRates(role))) return <p className="text-[#ff9fa2]">Only the ULB admin can change the bill rules.</p>;

  const run = async (done: string, work: () => Promise<void>) => {
    setBusy(true); setErr(''); setNote('');
    try { await work(); setNote(done); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save. Check the internet connection and try again.'); }
    setBusy(false);
  };
  const copyToAll = (from: HeadId) => {
    const others = heads.filter((h) => h !== from);
    if (!others.length || !window.confirm(`Use the ${headLabel(from)} due date, interest, grace days and rebate for ${others.map(headLabel).join(', ')} as well?\n\nFixed amounts are not copied. This changes the dues shown for every property of ${townName}.`)) return;
    void run('Rules copied to all bills.', async () => { for (const h of others) await saveHeadSettings(townKey, h, { ...settings[from], clauses: { ...settings[from].clauses } }); });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className={card}>
        <h2 className="text-xl font-bold text-white">Bill rules · {townName}</h2>
        <p className="text-sm text-[#aab4dc] mt-1">Set once here. The same fixed amounts, due date, interest %, grace days and rebate % apply to every property and every cashier of this town.</p>
      </div>
      {note && <p role="status" className="text-sm text-[#34d399] flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{note}</p>}
      {err && <p role="alert" className="text-sm text-[#ff9fa2]">{err}</p>}
      {!ready && <p className="text-sm text-[#aab4dc]">Loading rules…</p>}
      {ready && heads.map((h) => {
        const isOpen = open === h;
        return (
          <section key={h} className={card}>
            <button type="button" onClick={() => setOpen(isOpen ? null : h)} aria-expanded={isOpen} className="w-full text-left flex items-start gap-2">
              {isOpen ? <ChevronDown className="w-5 h-5 text-[#9aa8ff] mt-0.5 flex-none" /> : <ChevronRight className="w-5 h-5 text-[#9aa8ff] mt-0.5 flex-none" />}
              <span className="min-w-0">
                <span className="block text-lg font-bold text-white">{headLabel(h)}</span>
                <span className="block text-xs text-[#aab4dc]">{summary(settings[h], rates[h])}</span>
              </span>
            </button>
            {isOpen && (
              <div className="mt-3 space-y-4">
                <RateRow key={`r-${h}-${JSON.stringify(rates[h] ?? null)}`} head={h} initial={rates[h]} busy={busy} townName={townName}
                  onSave={(hd, r) => void run(`${headLabel(hd)} fixed amounts saved.`, () => savePayableRates(townKey, hd, r, rates[hd]))} />
                <div className="bg-[#121830] rounded-lg p-3">
                  <h4 className="text-xs font-bold text-[#ffe3a3] uppercase tracking-wider">Due date, interest and rebate</h4>
                  <SettingsEditor key={`s-${h}-${JSON.stringify(settings[h])}`} initial={settings[h]} busy={busy}
                    onSave={(s) => void run(`${headLabel(h)} rules saved.`, () => saveHeadSettings(townKey, h, s))} />
                  {heads.length > 1 && <button type="button" disabled={busy} onClick={() => copyToAll(h)} className="mt-3 text-xs font-bold px-3 py-2 rounded-lg bg-[#2a3464] text-[#9aa8ff] disabled:opacity-40">Use these rules for all bills</button>}
                </div>
              </div>
            )}
          </section>
        );
      })}
      <p className="text-[11px] text-[#8790bd]">Interest only counts once a bill’s status is set to “approved”. Changing a rule changes the dues shown for all properties from now on; demands already raised keep their amount. Every change is recorded in the audit trail.</p>
    </div>
  );
};
