// Funds dashboard maths: demand, collection and pending across every bill head. Pure functions, no database.
import { HeadId, HEAD_LIST } from './heads';
import { LedgerEntry, CollectionSettings, placeholderSettings, computeLedger } from './collection';
import { UNIT_SEP } from './units';
import type { LedgersByHead } from './liabilityCalc';

export interface HeadStat { head: HeadId; demand: number; collected: number; rebate: number; pending: number; interest: number }
export interface MonthStat { key: string; label: string; total: number; byHead: Partial<Record<HeadId, number>> }
export interface WardStat { ward: string; pending: number; properties: number }
export interface PropertyDue { pid: string; total: number; overdue: number; byHead: Partial<Record<HeadId, number>> }
export interface FundStats {
  asOf: string;
  totals: {
    demand: number; collected: number; rebate: number; pending: number; interest: number;
    today: number; thisMonth: number; recovery: number; defaulters: number; withDues: number;
  };
  perHead: HeadStat[];
  byMode: { mode: string; amount: number }[];
  monthly: MonthStat[];
  wards: WardStat[];
  dues: PropertyDue[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const r2 = (n: number) => Math.round(n * 100) / 100;
const fin = (n: number) => (Number.isFinite(n) ? n : 0);

/** Property id of a ledger key (garbage keys carry a unit suffix). */
export const baseId = (key: string) => { const i = key.indexOf(UNIT_SEP); return i < 0 ? key : key.slice(0, i); };

/** The last `n` calendar months ending with the month of `asOf`, oldest first. */
export function lastMonths(asOf: string, n: number): { key: string; label: string }[] {
  const y = parseInt(asOf.slice(0, 4), 10), m = parseInt(asOf.slice(5, 7), 10) - 1;
  const out: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - i, 1));
    const mm = d.getUTCMonth();
    out.push({ key: `${d.getUTCFullYear()}-${String(mm + 1).padStart(2, '0')}`, label: `${MONTHS[mm]} ${String(d.getUTCFullYear()).slice(2)}` });
  }
  return out;
}

/**
 * @param wardOf  property id -> ward, so pending can be grouped by ward
 * @param heads   heads to include
 */
export function computeFundStats(
  heads: HeadId[], ledgers: LedgersByHead, settings: Record<HeadId, CollectionSettings>,
  wardOf: (pid: string) => string | undefined, asOf: string, months = 6,
): FundStats {
  const perHead: HeadStat[] = [];
  const byMode = new Map<string, number>();
  const monthList = lastMonths(asOf, months);
  const monthly: MonthStat[] = monthList.map((m) => ({ ...m, total: 0, byHead: {} }));
  const monthIdx = new Map(monthList.map((m, i) => [m.key, i]));
  const props = new Map<string, PropertyDue>();
  let today = 0, thisMonth = 0;

  for (const h of HEAD_LIST.map((x) => x.id).filter((id) => heads.includes(id))) {
    const hs: HeadStat = { head: h, demand: 0, collected: 0, rebate: 0, pending: 0, interest: 0 };
    const s = settings[h] || placeholderSettings();
    for (const [key, entries] of Object.entries(ledgers[h] || {})) {
      if (!entries?.length) continue;
      const gone = new Set(entries.filter((e: LedgerEntry) => e.type === 'reversal' && e.reverses).map((e) => e.reverses as string));
      for (const e of entries) {
        if (e.type === 'reversal' || gone.has(e.id) || e.date > asOf) continue;
        const a = fin(e.amount);
        if (e.type === 'demand' || e.type === 'adjustment') hs.demand += a;
        else if (e.type === 'rebate') hs.rebate += a;
        else if (e.type === 'payment') {
          hs.collected += a;
          const mode = e.mode || 'other';
          byMode.set(mode, (byMode.get(mode) || 0) + a);
          if (e.date === asOf) today += a;
          const mk = e.date.slice(0, 7);
          if (mk === asOf.slice(0, 7)) thisMonth += a;
          const i = monthIdx.get(mk);
          if (i !== undefined) { monthly[i].total += a; monthly[i].byHead[h] = (monthly[i].byHead[h] || 0) + a; }
        }
      }
      try {
        const l = computeLedger(entries, s, asOf);
        const total = fin(l.totalDue);
        hs.pending += total; hs.interest += fin(l.interestDue);
        if (total > 0.004) {
          const pid = baseId(key);
          const p = props.get(pid) || { pid, total: 0, overdue: 0, byHead: {} };
          p.total += total; p.byHead[h] = (p.byHead[h] || 0) + total;
          p.overdue += l.rows.filter((r) => r.dueDate < asOf && r.totalDue > 0.004).reduce((a, r) => a + fin(r.totalDue), 0);
          props.set(pid, p);
        }
      } catch { /* one damaged ledger must not break the dashboard */ }
    }
    for (const k of ['demand', 'collected', 'rebate', 'pending', 'interest'] as const) hs[k] = r2(hs[k]);
    perHead.push(hs);
  }

  const wardMap = new Map<string, WardStat>();
  for (const p of props.values()) {
    const w = wardOf(p.pid) || 'Unknown';
    const x = wardMap.get(w) || { ward: w, pending: 0, properties: 0 };
    x.pending += p.total; x.properties += 1; wardMap.set(w, x);
  }
  const sum = (k: keyof HeadStat) => r2(perHead.reduce((a, x) => a + (x[k] as number), 0));
  const collected = sum('collected'), pending = sum('pending');
  const dues = [...props.values()].map((p) => ({ ...p, total: r2(p.total), overdue: r2(p.overdue) })).sort((a, b) => b.total - a.total);
  return {
    asOf,
    totals: {
      demand: sum('demand'), collected, rebate: sum('rebate'), pending, interest: sum('interest'),
      today: r2(today), thisMonth: r2(thisMonth),
      recovery: collected + pending > 0 ? Math.round((collected / (collected + pending)) * 1000) / 10 : 0,
      defaulters: dues.filter((p) => p.overdue > 0.004).length, withDues: dues.length,
    },
    perHead,
    byMode: [...byMode.entries()].map(([mode, amount]) => ({ mode, amount: r2(amount) })).sort((a, b) => b.amount - a.amount),
    monthly: monthly.map((m) => ({ ...m, total: r2(m.total) })),
    wards: [...wardMap.values()].map((w) => ({ ...w, pending: r2(w.pending) })).sort((a, b) => b.pending - a.pending),
    dues,
  };
}
