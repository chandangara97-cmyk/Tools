// Pure maths for what a property owes across bill heads. No database, so it can be tested on its own.
import { HeadId } from './heads';
import { isUnitHead, belongsTo } from './units';
import { LedgerEntry, CollectionSettings, placeholderSettings, computeLedger } from './collection';

export type LedgersByHead = Record<HeadId, Record<string, LedgerEntry[]>>;

/** Interest is only counted once the head's due-date rules are approved and an interest rate is set. */
export const rulesApproved = (s: CollectionSettings | undefined) => !!s && s.status === 'approved' && s.interestPctPerMonth !== null;

export interface PeriodDue { fy: string; dueDate: string; principal: number; interest: number; total: number }
export interface HeadLiability { head: HeadId; principal: number; interest: number; total: number; billed: boolean; periods: PeriodDue[] }
export interface PropertyLiability { propertyId: string; heads: HeadLiability[]; total: number }

const fin = (n: number) => (Number.isFinite(n) ? n : 0);

/** Dues of one property under the given bill heads. Heads with no demand are left out. Never throws. */
export function propertyLiability(
  pid: string, heads: HeadId[], ledgers: LedgersByHead, settings: Record<HeadId, CollectionSettings>, asOf: string,
): PropertyLiability {
  const out: HeadLiability[] = [];
  for (const h of heads) {
    // garbage: a building's dues are the sum over its units' ledgers (and any older whole-building ledger)
    const map = ledgers[h] || {};
    const keys = isUnitHead(h) ? Object.keys(map).filter((k) => belongsTo(pid, k)) : (map[pid] ? [pid] : []);
    let principal = 0, interest = 0, total = 0, billed = false, any = false;
    const periods = new Map<string, PeriodDue>();
    for (const k of keys) {
      const entries = map[k] || [];
      if (!entries.length) continue;
      try {
        const l = computeLedger(entries, settings[h] || placeholderSettings(), asOf);
        any = true;
        principal += fin(l.principalDue); interest += fin(l.interestDue); total += fin(l.totalDue);
        billed = billed || entries.some((e) => e.type === 'demand');
        for (const r of l.rows) {
          if (fin(r.totalDue) <= 0.004) continue;
          const cur = periods.get(r.fy);
          if (cur) { cur.principal += fin(r.principalDue); cur.interest += fin(r.interestDue); cur.total += fin(r.totalDue); }
          else periods.set(r.fy, { fy: r.fy, dueDate: r.dueDate, principal: fin(r.principalDue), interest: fin(r.interestDue), total: fin(r.totalDue) });
        }
      } catch { /* a damaged ledger for one bill must not break the page */ }
    }
    if (!any) continue;
    out.push({ head: h, principal, interest, total, billed, periods: [...periods.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate)) });
  }
  return { propertyId: pid, heads: out, total: out.reduce((a, x) => a + x.total, 0) };
}
