// Phase 3 collection engine. Pure functions, no network, so it is easy to test and to audit.
//
// Model: a property's ledger is an append-only list of entries. Nothing is edited or deleted.
// A mistake is fixed by a reversal entry that points at the original.
//   demand      tax demanded for a financial year (from the approved assessment)
//   adjustment  later change to a year's demand (+ or -), e.g. after re-assessment
//   rebate      early-payment rebate granted with a payment
//   payment     money received (cash / UPI / cheque / other), carries the receipt number
//   reversal    cancels one earlier entry; the cancelled entry is treated as if it never happened
//
// Rules applied (all from CollectionSettings, which an admin edits; none are hard-coded):
//   - Due date per financial year.
//   - Interest: simple interest, X% per month "or part of a month", charged on the principal still
//     outstanding at the start of each month after the due date (+ grace days). No interest on interest.
//     Interest runs only on amounts that have been demanded.
//   - Early-payment rebate: Y% of the year's demand if the year is cleared in full by the last rebate date.
//   - A payment clears interest first, then principal, oldest financial year first.

export type EntryType = 'demand' | 'payment' | 'rebate' | 'reversal' | 'adjustment';
export type PayMode = 'cash' | 'upi' | 'cheque' | 'other' | 'razorpay';

export interface LedgerEntry {
  id: string;
  type: EntryType;
  fy: string;            // "2026-27"
  amount: number;        // rupees; > 0, except adjustment which may be negative
  date: string;          // effective date YYYY-MM-DD
  at: number;            // when it was recorded (ms)
  by: string;            // uid
  receiptNo?: string;    // payment and rebate (shared with its payment)
  mode?: PayMode;
  ref?: string;          // UPI transaction id / cheque number
  payer?: string;
  note?: string;
  reverses?: string;     // reversal only: id of the cancelled entry
  reason?: string;       // reversal / adjustment: why
  rateTableId?: string;  // demand: which rate table produced the assessment
  source?: 'fixed';      // demand: raised from the town's fixed Residential / Commercial amount
}

export interface CollectionSettings {
  status: 'placeholder' | 'approved';
  dueMonth: number;      // 1-12; April to December falls in the FY's first year, January to March in the second
  dueDay: number;
  rebatePct: number;     // 0 = no early-payment rebate
  rebateMonth: number;
  rebateDay: number;
  interestPctPerMonth: number | null; // null = not set, no interest is charged
  interestGraceDays: number;
  notes: string;
  clauses: { due?: string; rebate?: string; interest?: string };
}

/** Neutral starting values. Nothing here is a notified rule; an admin must enter the real ones. */
export function placeholderSettings(): CollectionSettings {
  return {
    status: 'placeholder',
    dueMonth: 3, dueDay: 31,
    rebatePct: 0, rebateMonth: 6, rebateDay: 30,
    interestPctPerMonth: null, interestGraceDays: 0,
    notes: '', clauses: {},
  };
}

export function validateSettings(s: CollectionSettings): string | null {
  const okMD = (m: number, d: number) => Number.isInteger(m) && m >= 1 && m <= 12 && Number.isInteger(d) && d >= 1 && d <= 31;
  if (!okMD(s.dueMonth, s.dueDay)) return 'Due date month/day is not valid.';
  if (!okMD(s.rebateMonth, s.rebateDay)) return 'Rebate last date month/day is not valid.';
  if (typeof s.rebatePct !== 'number' || s.rebatePct < 0 || s.rebatePct > 100) return 'Rebate % must be 0 to 100.';
  if (s.interestPctPerMonth !== null && (typeof s.interestPctPerMonth !== 'number' || s.interestPctPerMonth < 0 || s.interestPctPerMonth > 100)) return 'Interest % per month must be blank or 0 to 100.';
  if (!Number.isInteger(s.interestGraceDays) || s.interestGraceDays < 0 || s.interestGraceDays > 365) return 'Grace days must be a whole number from 0 to 365.';
  return null;
}

// ---------- dates (UTC, YYYY-MM-DD strings) ----------
const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const todayIso = () => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; };

export function addDays(s: string, n: number): string {
  const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return toIso(d);
}
export function addMonths(s: string, n: number): string {
  const d = parse(s);
  const day = d.getUTCDate();
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(day, last));
  return toIso(t);
}
function clampDay(y: number, m: number, d: number): string {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${pad(m)}-${pad(Math.min(d, last))}`;
}
/** Calendar date for a month/day that belongs to a financial year (April-March). */
function dateInFy(fy: string, month: number, day: number): string {
  const start = parseInt(fy.slice(0, 4), 10);
  return clampDay(month >= 4 ? start : start + 1, month, day);
}
// A billing period is a financial year ("2026-27") or, for monthly bills, a calendar month ("2026-10").
// A month key is told apart from a year key because a year's second part is the next year's last two digits.
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function isMonthKey(k: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(k)) return false;
  const y = parseInt(k.slice(0, 4), 10), m = parseInt(k.slice(5), 10);
  return m >= 1 && m <= 12 && m !== (y + 1) % 100;
}
/** "2026-10" -> "Oct 2026"; a financial year stays as it is. */
export const periodLabel = (k: string) => (isMonthKey(k) ? `${MONTH_NAMES[parseInt(k.slice(5), 10) - 1]} ${k.slice(0, 4)}` : k);
/** First day of a period: 1 April for a year, the 1st for a month. */
export const periodStart = (k: string) => (isMonthKey(k) ? `${k}-01` : `${k.slice(0, 4)}-04-01`);
export const comparePeriods = (a: string, b: string) => periodStart(a).localeCompare(periodStart(b)) || a.localeCompare(b);
/** Month keys from `back` months ago to `ahead` months ahead of today, newest first. */
export function monthKeys(back = 11, ahead = 1): string[] {
  const n = new Date(); const out: string[] = [];
  for (let i = ahead; i >= -back; i--) { const d = new Date(n.getFullYear(), n.getMonth() + i, 1); out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); }
  return out;
}

export const dueDateOf = (fy: string, s: CollectionSettings) => {
  if (isMonthKey(fy)) { // a month's bill falls due on the due day of the following month
    const y = parseInt(fy.slice(0, 4), 10), m = parseInt(fy.slice(5), 10);
    return m === 12 ? clampDay(y + 1, 1, s.dueDay) : clampDay(y, m + 1, s.dueDay);
  }
  return dateInFy(fy, s.dueMonth, s.dueDay);
};
/** Monthly bills carry no early-payment rebate. */
export const rebateLastDateOf = (fy: string, s: CollectionSettings) => (isMonthKey(fy) ? '' : dateInFy(fy, s.rebateMonth, s.rebateDay));

const r2 = (n: number) => Math.round(n * 100) / 100;

// ---------- the ledger ----------
export interface FyRow {
  fy: string;
  dueDate: string;
  demand: number;          // gross demand
  adjustments: number;     // net of later adjustments
  rebate: number;          // rebate already granted
  paidPrincipal: number;
  paidInterest: number;
  principalDue: number;
  interestAccrued: number; // total interest charged so far
  interestDue: number;     // charged and still unpaid
  totalDue: number;
  rebateAvailable: number; // rebate that a full payment today would earn
}
export interface PaymentAlloc {
  entryId: string;
  parts: { fy: string; interest: number; principal: number }[];
  unallocated: number;     // money received beyond everything due (should be 0)
}
export interface LedgerResult {
  rows: FyRow[];
  principalDue: number;
  interestDue: number;
  totalDue: number;
  paidTotal: number;
  allocations: Record<string, PaymentAlloc>;
  warnings: string[];
}

interface FyState { demand: number; adj: number; rebate: number; paidP: number; paidI: number; P: number; I: number; accrued: number }
const ORD: Record<EntryType, number> = { demand: 1, adjustment: 1, rebate: 2, payment: 3, reversal: 9 };

export function computeLedger(entries: LedgerEntry[], s: CollectionSettings, asOf: string): LedgerResult {
  const warnings: string[] = [];
  const cancelled = new Set(entries.filter((e) => e.type === 'reversal' && e.reverses).map((e) => e.reverses as string));
  const active = entries.filter((e) => e.type !== 'reversal' && !cancelled.has(e.id) && e.date <= asOf);

  type Ev = { date: string; ord: number; at: number; id: string; fy: string; e?: LedgerEntry };
  const evs: Ev[] = active.map((e) => ({ date: e.date, ord: ORD[e.type], at: e.at, id: e.id, fy: e.fy, e }));

  const rate = s.interestPctPerMonth ?? 0;
  const fys = [...new Set(active.map((e) => e.fy))].sort(comparePeriods);
  if (rate > 0) {
    for (const fy of fys) {
      const due = dueDateOf(fy, s);
      for (let k = 0; k < 240; k++) {
        const cd = addDays(addMonths(due, k), 1 + s.interestGraceDays);
        if (cd > asOf) break;
        evs.push({ date: cd, ord: 0, at: 0, id: `charge_${fy}_${k}`, fy });
      }
    }
  } else if (active.some((e) => e.type === 'demand') && s.interestPctPerMonth === null) {
    warnings.push('Interest % per month is not set, so no interest is charged.');
  }
  evs.sort((a, b) => a.date.localeCompare(b.date) || a.ord - b.ord || a.at - b.at || a.id.localeCompare(b.id));

  const st: Record<string, FyState> = {};
  const get = (fy: string) => (st[fy] ||= { demand: 0, adj: 0, rebate: 0, paidP: 0, paidI: 0, P: 0, I: 0, accrued: 0 });
  const allocations: Record<string, PaymentAlloc> = {};
  let paidTotal = 0;

  for (const ev of evs) {
    const x = get(ev.fy);
    if (!ev.e) { // monthly interest charge on principal outstanding right now
      const add = r2((x.P * rate) / 100);
      x.I = r2(x.I + add); x.accrued = r2(x.accrued + add);
      continue;
    }
    const e = ev.e;
    if (e.type === 'demand') { x.demand = r2(x.demand + e.amount); x.P = r2(x.P + e.amount); }
    else if (e.type === 'adjustment') { x.adj = r2(x.adj + e.amount); x.P = Math.max(0, r2(x.P + e.amount)); }
    else if (e.type === 'rebate') { x.rebate = r2(x.rebate + e.amount); x.P = Math.max(0, r2(x.P - e.amount)); }
    else if (e.type === 'payment') {
      let rem = e.amount;
      paidTotal = r2(paidTotal + e.amount);
      const alloc: PaymentAlloc = { entryId: e.id, parts: [], unallocated: 0 };
      for (const fy of Object.keys(st).sort(comparePeriods)) {
        if (rem <= 0) break;
        const y = st[fy];
        const pi = Math.min(y.I, rem); rem = r2(rem - pi);
        const pp = Math.min(y.P, rem); rem = r2(rem - pp);
        if (pi > 0 || pp > 0) {
          y.I = r2(y.I - pi); y.paidI = r2(y.paidI + pi);
          y.P = r2(y.P - pp); y.paidP = r2(y.paidP + pp);
          alloc.parts.push({ fy, interest: pi, principal: pp });
        }
      }
      alloc.unallocated = r2(rem);
      if (rem > 0) warnings.push(`Payment ${e.receiptNo || e.id} exceeds the dues by ${rem.toFixed(2)}; the excess is not credited to any year.`);
      allocations[e.id] = alloc;
    }
  }

  const rebateLimit = (fy: string) => rebateLastDateOf(fy, s);
  const rows: FyRow[] = Object.keys(st).sort(comparePeriods).map((fy) => {
    const y = st[fy];
    const avail = s.rebatePct > 0 && asOf <= rebateLimit(fy) && y.rebate === 0 && y.P > 0
      ? Math.min(y.P, r2(((y.demand + y.adj) * s.rebatePct) / 100)) : 0;
    return {
      fy, dueDate: dueDateOf(fy, s), demand: y.demand, adjustments: y.adj, rebate: y.rebate,
      paidPrincipal: y.paidP, paidInterest: y.paidI, principalDue: y.P, interestAccrued: y.accrued,
      interestDue: y.I, totalDue: r2(y.P + y.I), rebateAvailable: avail,
    };
  });
  const principalDue = r2(rows.reduce((a, r) => a + r.principalDue, 0));
  const interestDue = r2(rows.reduce((a, r) => a + r.interestDue, 0));
  return { rows, principalDue, interestDue, totalDue: r2(principalDue + interestDue), paidTotal, allocations, warnings };
}

export interface PaymentPreview {
  ok: boolean;
  error?: string;
  rebate: number;          // rebate that will be posted with this payment (0 if none)
  rebateFy?: string;
  result?: LedgerResult;   // ledger after the payment
  allocation?: PaymentAlloc;
}

/** Check a payment before it is posted: no overpayment, rebate only when the year is cleared in full. */
export function previewPayment(
  entries: LedgerEntry[], s: CollectionSettings,
  p: { amount: number; date: string; rebateFy?: string },
): PaymentPreview {
  if (!(p.amount > 0)) return { ok: false, error: 'Enter an amount above zero.', rebate: 0 };
  const before = computeLedger(entries, s, p.date);
  let rebate = 0;
  const hyp: LedgerEntry[] = [...entries];
  if (p.rebateFy) {
    const row = before.rows.find((r) => r.fy === p.rebateFy);
    if (!row || row.rebateAvailable <= 0) return { ok: false, error: `No early-payment rebate is available for ${p.rebateFy} on this date.`, rebate: 0 };
    rebate = row.rebateAvailable;
    hyp.push({ id: '__rebate__', type: 'rebate', fy: p.rebateFy, amount: rebate, date: p.date, at: Number.MAX_SAFE_INTEGER - 1, by: '' });
  }
  const after0 = computeLedger(hyp, s, p.date);
  if (p.amount > after0.totalDue + 0.004) {
    return { ok: false, error: `Amount is more than the dues (₹${after0.totalDue.toFixed(2)}${rebate ? ' after rebate' : ''}). Advance payments are not supported yet.`, rebate: 0 };
  }
  hyp.push({ id: '__payment__', type: 'payment', fy: before.rows[0]?.fy || '', amount: p.amount, date: p.date, at: Number.MAX_SAFE_INTEGER, by: '' });
  const result = computeLedger(hyp, s, p.date);
  if (p.rebateFy) {
    const row = result.rows.find((r) => r.fy === p.rebateFy);
    if (!row || row.principalDue > 0 || row.interestDue > 0) {
      return { ok: false, error: `The rebate needs ${p.rebateFy} (and any earlier year) paid in full, including interest. Pay ₹${after0.totalDue.toFixed(2)} to clear everything.`, rebate: 0 };
    }
  }
  return { ok: true, rebate, rebateFy: p.rebateFy, result, allocation: result.allocations['__payment__'] };
}

/** Everything a full payment today would cost, with or without the rebate. */
export function quoteFull(entries: LedgerEntry[], s: CollectionSettings, date: string, withRebate: boolean) {
  const base = computeLedger(entries, s, date);
  const rebate = withRebate ? base.rows.reduce((a, r) => a + r.rebateAvailable, 0) : 0;
  return { total: r2(base.totalDue - rebate), rebate: r2(rebate), gross: base.totalDue };
}

// ---------- receipt helpers ----------
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function below100(n: number) { return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`; }
function below1000(n: number) { return n >= 100 ? `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ' ' + below100(n % 100) : ''}` : below100(n); }

/** 12345.5 -> "Rupees twelve thousand three hundred forty five and fifty paise only" (Indian grouping). */
export function rupeesInWords(amount: number): string {
  const paise = Math.round(amount * 100);
  const rupees = Math.floor(paise / 100), p = paise % 100;
  const parts: string[] = [];
  let n = rupees;
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${below1000(crore)} crore`);
  if (lakh) parts.push(`${below100(lakh)} lakh`);
  if (thousand) parts.push(`${below100(thousand)} thousand`);
  if (n) parts.push(below1000(n));
  const r = parts.join(' ') || 'zero';
  const words = `Rupees ${r}${p ? ` and ${below100(p)} paise` : ''} only`;
  return words.charAt(0).toUpperCase() + words.slice(1);
}
