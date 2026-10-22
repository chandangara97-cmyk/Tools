// Tests for property search, monthly bills and what a property owes. Run: npm run test:search
import { searchRecords, sameOwner, norm, compact } from '../src/services/propertySearch';
import { propertyLiability, rulesApproved, LedgersByHead } from '../src/services/liabilityCalc';
import { computeLedger, placeholderSettings, isMonthKey, periodLabel, periodStart, dueDateOf, monthKeys, LedgerEntry, CollectionSettings } from '../src/services/collection';
import { HeadId } from '../src/services/heads';
import { startTab, allowedTabs, isSearchOnly } from '../src/services/access';

let passed = 0; let failed = 0;
function test(name: string, fn: () => void) {
  try { fn(); console.log('ok  ' + name); passed++; } catch (e) { console.log('FAIL ' + name + '\n     ' + (e as Error).message); failed++; }
}
const eq = (a: unknown, b: unknown, m = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); };
const near = (a: number, b: number, m = '') => { if (Math.abs(a - b) > 0.005) throw new Error(`${m} expected ${b} got ${a}`); };

const recs = [
  { id: '0206001-01-0001', owner: 'Ram Lal Sharma', hno: '12', addr: 'Main Bazar', ward: '1', upn: 'U-77' },
  { id: '0206001-01-0002', owner: 'Ram Lal Sharma', hno: '14', addr: 'Main Bazar', ward: '1' },
  { id: '0206001-02-0001', owner: 'Sita Devi', hno: '3', addr: 'Mall Road', ward: '2' },
  { id: '0206001-02-0002', owner: '', hno: '', addr: '', ward: '2' },
  { id: '0206001-02-0003', owner: undefined, ward: '2' } as never,
  { id: '0206001-03-0001', owner: 'राम लाल', hno: '9', addr: 'बाज़ार', ward: '3' },
  { id: '0206001-03-0002', owner: 'राम कुमार', hno: '10', ward: '3' },
];

test('search: exact property ID returns only that property', () => eq(searchRecords(recs, '0206001-02-0001').map((r) => r.id), ['0206001-02-0001']));
test('search: ID typed without dashes or in capitals still matches', () => eq(searchRecords(recs, '0206001020001').map((r) => r.id), ['0206001-02-0001']));
test('search: part of an ID lists the matches', () => eq(searchRecords(recs, '0206001-01').length, 2));
test('search: owner name, any case, extra spaces', () => eq(searchRecords(recs, '  RAM   lal ').map((r) => r.id).slice(0, 2), ['0206001-01-0001', '0206001-01-0002']));
test('search: every word must match', () => eq(searchRecords(recs, 'sharma sita'), []));
test('search: house number and address words', () => eq(searchRecords(recs, 'mall 3').map((r) => r.id), ['0206001-02-0001']));
test('search: UPN', () => eq(searchRecords(recs, 'u-77').map((r) => r.id), ['0206001-01-0001']));
test('search: Hindi names work and do not match everything', () => {
  const r = searchRecords(recs, 'राम लाल').map((x) => x.id);
  eq(r, ['0206001-03-0001']);
  eq(searchRecords(recs, 'राम').length, 2);
});
test('search: punctuation only matches nothing, never everything', () => { eq(searchRecords(recs, '--'), []); eq(searchRecords(recs, '  '), []); eq(searchRecords(recs, '%%'), []); });
test('search: one letter is too short', () => eq(searchRecords(recs, 'r'), []));
test('search: records with no owner never crash', () => { searchRecords(recs, 'zz'); searchRecords(recs, 'ram'); });
test('search: result list is capped', () => { const many = Array.from({ length: 100 }, (_, i) => ({ id: `P${i}`, owner: 'Same Name' })); eq(searchRecords(many, 'same').length, 25); });
test('search: norm and compact survive null, numbers and objects', () => { eq(norm(null), ''); eq(norm(12), '12'); eq(compact(undefined), ''); });
test('owner grouping: same name groups, blank owner stays alone', () => {
  eq(sameOwner(recs, recs[0]).length, 2);
  eq(sameOwner(recs, recs[3]).map((r) => r.id), ['0206001-02-0002']);
  eq(sameOwner(recs, recs[4]).map((r) => r.id), ['0206001-02-0003']);
});

// ---- money: monthly bills, arrears, waivers, several heads
const S: CollectionSettings = { ...placeholderSettings(), status: 'approved', dueMonth: 3, dueDay: 31, interestPctPerMonth: 2, interestGraceDays: 0 };
const M: CollectionSettings = { ...S, dueDay: 10 };
let t = 0;
const e = (o: Partial<LedgerEntry>): LedgerEntry => ({ id: 'e' + t++, type: 'demand', fy: '', amount: 0, date: '', at: t, by: 'u', ...o } as LedgerEntry);
const heads: HeadId[] = ['property_tax', 'water', 'garbage'];
const emptyL = (): LedgersByHead => ({ property_tax: {}, water: {}, garbage: {}, sewerage: {}, other: {} });
const allS = (): Record<HeadId, CollectionSettings> => ({ property_tax: S, water: M, garbage: M, sewerage: M, other: M });

test('periods: a month is told apart from a financial year', () => {
  eq([isMonthKey('2026-10'), isMonthKey('2026-27'), isMonthKey('2026-13'), isMonthKey('2026-00')], [true, false, false, false]);
  eq([periodLabel('2026-10'), periodLabel('2026-27'), periodStart('2026-10'), periodStart('2026-27')], ['Oct 2026', '2026-27', '2026-10-01', '2026-04-01']);
});
test('periods: monthly bill falls due on the due day of the next month, including December', () => { eq(dueDateOf('2026-10', M), '2026-11-10'); eq(dueDateOf('2026-12', M), '2027-01-10'); });
test('periods: month list has 13 entries ending next month', () => { const k = monthKeys(11, 1); eq(k.length, 13); });
test('monthly: no interest before the due date, interest after', () => {
  const l1 = computeLedger([e({ id: 'demand_2026-10', fy: '2026-10', amount: 100, date: '2026-10-01' })], M, '2026-11-10');
  near(l1.totalDue, 100, 'on due date');
  const l2 = computeLedger([e({ id: 'demand_2026-10', fy: '2026-10', amount: 100, date: '2026-10-01' })], M, '2026-12-20');
  near(l2.interestDue, 4, 'two months after');
});
test('monthly: months are cleared oldest first and a payment is never lost', () => {
  const es = [e({ id: 'demand_2026-08', fy: '2026-08', amount: 100, date: '2026-08-01' }), e({ id: 'demand_2026-09', fy: '2026-09', amount: 100, date: '2026-09-01' }),
    e({ type: 'payment', fy: '2026-08', amount: 100, date: '2026-09-05', receiptNo: 'R1', mode: 'cash' } as Partial<LedgerEntry>)];
  const l = computeLedger(es, M, '2026-09-08');
  eq(l.rows.map((r) => [r.fy, Math.round(r.totalDue)]), [['2026-08', 0], ['2026-09', 100]]);
});
test('manual dues: old arrears accrue interest, a waiver lowers a month', () => {
  const es = [e({ type: 'adjustment', fy: '2025-26', amount: 500, date: '2025-04-01', reason: 'arrears' }), e({ id: 'demand_2026-09', fy: '2026-09', amount: 100, date: '2026-09-01' }), e({ type: 'adjustment', fy: '2026-09', amount: -30, date: '2026-09-02', reason: 'waiver' })];
  const l = computeLedger(es, S, '2026-09-30');
  near(l.rows.find((r) => r.fy === '2026-09')!.principalDue, 70, 'waived month');
  if (l.rows.find((r) => r.fy === '2025-26')!.interestDue <= 0) throw new Error('arrears should carry interest');
});
test('liability: totals across heads, per period', () => {
  const L = emptyL();
  L.property_tax['P1'] = [e({ id: 'demand_2026-27', fy: '2026-27', amount: 1000, date: '2026-04-01' })];
  L.water['P1'] = [e({ id: 'demand_2026-09', fy: '2026-09', amount: 100, date: '2026-09-01' })];
  const p = propertyLiability('P1', heads, L, allS(), '2026-10-01');
  eq(p.heads.map((h) => h.head), ['property_tax', 'water']);
  near(p.total, 1100, 'total'); eq(p.heads[1].periods.length, 1);
});
test('liability: property with no bills has no heads, total zero', () => { const p = propertyLiability('NONE', heads, emptyL(), allS(), '2026-10-01'); eq([p.heads.length, p.total], [0, 0]); });
test('liability: fully paid is zero but still shows the head', () => {
  const L = emptyL();
  L.garbage['P2'] = [e({ id: 'demand_2026-09', fy: '2026-09', amount: 50, date: '2026-09-01' }), e({ type: 'payment', fy: '2026-09', amount: 50, date: '2026-09-02', receiptNo: 'R2', mode: 'cash' } as Partial<LedgerEntry>)];
  const p = propertyLiability('P2', heads, L, allS(), '2026-09-03');
  eq([p.heads.length, Math.round(p.total)], [1, 0]); eq(p.heads[0].periods.length, 0);
});
test('liability: a damaged ledger is skipped, not a crash', () => {
  const L = emptyL();
  L.water['BAD'] = [{ id: 'x' } as unknown as LedgerEntry];
  L.property_tax['BAD'] = [e({ id: 'demand_2026-27', fy: '2026-27', amount: 10, date: '2026-04-01' })];
  const p = propertyLiability('BAD', heads, L, allS(), '2026-10-01');
  if (p.total < 9.99) throw new Error('good head should still count');
});
test('liability: head with missing settings falls back safely', () => {
  const L = emptyL(); L.water['P3'] = [e({ id: 'demand_2026-09', fy: '2026-09', amount: 10, date: '2026-09-01' })];
  const p = propertyLiability('P3', heads, L, {} as Record<HeadId, CollectionSettings>, '2026-10-01');
  near(p.total, 10);
});
test('rules: interest counts only when approved and a rate is set', () => {
  eq([rulesApproved(S), rulesApproved(placeholderSettings()), rulesApproved({ ...S, interestPctPerMonth: null }), rulesApproved(undefined)], [true, false, false, false]);
});

test('landing: a cashier opens on the work menu so every payment head is visible', () => eq(startTab('cashier', null, false), 'menu'));
test('landing: a cashier tied to one head also lands on the work menu', () => eq(startTab('cashier', 'water', false), 'menu'));
test('landing: other roles keep their usual start', () => {
  eq(startTab('surveyor', null, false), 'menu'); eq(startTab('admin', null, false), 'menu'); eq(startTab('monitor', null, false), 'menu');
  eq(startTab('supervisor', null, false), 'menu'); eq(startTab('assessor', null, false), 'menu'); eq(startTab(null, null, false), 'menu');
});
test('landing: the owner is never forced to the search page', () => eq(startTab('cashier', null, true), 'menu'));
test('access: cashier may open search and collection; general public search only', () => {
  eq(allowedTabs('cashier', null, false), ['search', 'collection']); eq(allowedTabs('cashier', 'water', false), ['search', 'collection']); eq(allowedTabs('public', null, false), ['search']);
});
test('search-only: general public lands on search; the flag covers only the public role', () => {
  eq(startTab('public', null, false), 'search');
  eq([isSearchOnly('cashier', false), isSearchOnly('public', false), isSearchOnly('supervisor', false), isSearchOnly('admin', false), isSearchOnly('cashier', true), isSearchOnly(null, false)], [false, true, false, false, false, false]);
});

console.log(`\n${passed} tests passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
