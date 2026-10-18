// Pure maths for what a property owes across bill heads. No database, so it can be tested on its own.
import { HeadId } from './heads';
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
    const entries = ledgers[h]?.[pid] || [];
    if (!entries.length) continue;
    try {
      const l = computeLedger(entries, settings[h] || placeholderSettings(), asOf);
      out.push({
        head: h, principal: fin(l.principalDue), interest: fin(l.interestDue), total: fin(l.totalDue), billed: entries.some((e) => e.type === 'demand'),
        periods: l.rows.filter((r) => fin(r.totalDue) > 0.004).map((r) => ({ fy: r.fy, dueDate: r.dueDate, principal: fin(r.principalDue), interest: fin(r.interestDue), total: fin(r.totalDue) })),
      });
    } catch { /* a damaged ledger for one head must not break the page */ }
  }
  return { propertyId: pid, heads: out, total: out.reduce((a, x) => a + x.total, 0) };
}
