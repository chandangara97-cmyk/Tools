// Funds dashboard stats and dues notices. Run: npm run test:funds
import { computeFundStats, lastMonths } from '../src/services/fundStats';
import { buildNotice, whatsappText, smsText, noticesDocument, normalizeMobile, mobileFromRecord, addDaysIso, fmtDate } from '../src/services/noticeText';
import { propertyLiability } from '../src/services/liabilityCalc';
import { placeholderSettings } from '../src/services/collection';
import type { LedgerEntry } from '../src/services/collection';
import type { HeadId } from '../src/services/heads';

let fails = 0;
const ok = (c: boolean, m: string) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };

const TODAY = '2026-10-23';
const e = (o: Partial<LedgerEntry> & Pick<LedgerEntry, 'id' | 'type' | 'fy' | 'amount' | 'date'>): LedgerEntry => ({ at: 1, by: 'x', ...o } as LedgerEntry);
const S = { ...placeholderSettings() }; // no interest, due 31 March
const settings = { property_tax: S, water: S, garbage: S, sewerage: S, other: S } as never;
const ledgers = {
  property_tax: {
    P1: [e({ id: 'd1', type: 'demand', fy: '2025-26', amount: 3000, date: '2025-04-01' }), e({ id: 'p1', type: 'payment', fy: '2025-26', amount: 1000, date: '2026-10-23', mode: 'cash', receiptNo: 'R1' })],
    P2: [e({ id: 'd2', type: 'demand', fy: '2025-26', amount: 2000, date: '2025-04-01' }), e({ id: 'p2', type: 'payment', fy: '2025-26', amount: 2000, date: '2026-09-05', mode: 'upi' })],
    P3: [e({ id: 'd3', type: 'demand', fy: '2025-26', amount: 500, date: '2025-04-01' }), e({ id: 'p3', type: 'payment', fy: '2025-26', amount: 500, date: '2026-10-02', mode: 'cash' }), e({ id: 'r3', type: 'reversal', fy: '2025-26', amount: 500, date: '2026-10-03', reverses: 'p3' })],
  },
  garbage: { 'P1~U1': [e({ id: 'g1', type: 'demand', fy: '2026-10', amount: 100, date: '2026-10-01' })], 'P1~U2': [e({ id: 'g2', type: 'demand', fy: '2026-10', amount: 50, date: '2026-10-01' })] },
  water: {}, sewerage: {}, other: {},
} as never;
const wardOf = (pid: string) => ({ P1: '1', P2: '1', P3: '2' } as Record<string, string>)[pid];
const heads: HeadId[] = ['property_tax', 'garbage', 'water'];

const st = computeFundStats(heads, ledgers, settings, wardOf, TODAY);
const pt = st.perHead.find((h) => h.head === 'property_tax')!;
ok(pt.demand === 5500 && pt.collected === 3000, 'property tax: demand 5500, collected 3000 (reversed payment ignored)');
ok(pt.pending === 2500, 'property tax pending = 2000 (P1 balance) + 500 (P3, its payment was reversed)');
ok(st.perHead.find((h) => h.head === 'garbage')!.pending === 150, 'garbage pending sums the units');
ok(st.totals.pending === 2650 && st.totals.collected === 3000 && st.totals.demand === 5650, 'totals add across heads');
ok(st.totals.today === 1000, 'collected today only counts today');
ok(st.totals.thisMonth === 1000, 'this month only counts October');
ok(st.byMode.length === 2 && st.byMode[0].mode === 'upi' && st.byMode[0].amount === 2000 && st.byMode[1].mode === 'cash' && st.byMode[1].amount === 1000, 'payment modes sorted by amount (upi 2000, cash 1000)');
ok(st.monthly.length === 6 && st.monthly[5].key === '2026-10' && st.monthly[0].key === '2026-05', 'six months ending this month');
ok(st.monthly[5].byHead.property_tax === 1000 && st.monthly[4].byHead.property_tax === 2000, 'monthly collections split by bill');
const w1 = st.wards.find((w) => w.ward === '1')!;
ok(w1.properties === 1 && w1.pending === 2150, 'ward 1: only P1 owes, 2000 tax + 150 garbage');
ok(st.dues[0].pid === 'P1' && st.dues[0].byHead.garbage === 150, 'property list sorted by dues, garbage units rolled into the building');
ok(st.totals.defaulters === 2 && st.totals.withDues === 2, 'defaulters: P1 and P3 have overdue tax');
ok(st.totals.recovery === Math.round((3000 / (3000 + 2650)) * 1000) / 10, 'recovery rate');
ok(lastMonths('2026-02-10', 3).map((m) => m.key).join() === '2025-12,2026-01,2026-02', 'months roll over the year end');
const empty = computeFundStats(heads, { property_tax: {}, water: {}, garbage: {}, sewerage: {}, other: {} } as never, settings, wardOf, TODAY);
ok(empty.totals.pending === 0 && empty.totals.recovery === 0 && empty.dues.length === 0, 'empty town does not divide by zero');

// ---- notices
const rec = { id: 'P1', owner: 'Ramesh Kumar', ward: '1', hno: '12/A', addr: 'Main Bazaar', units: { U1: { label: 'Shop', use: 'Commercial', occupantType: 'Owner', occupant: '', active: true, mobile: '98160 12345' } } } as never;
const liab = propertyLiability('P1', heads, ledgers, settings, TODAY);
const n = buildNotice(rec, liab, heads, { town: 'Bhota', today: TODAY, payBy: addDaysIso(TODAY, 15), extra: ' Pay soon. ' });
ok(n.total === 2150 && n.heads.length === 2, 'notice lists every bill with dues (tax 2000 + garbage 150)');
ok(n.payBy === '2026-11-07' && fmtDate(n.payBy) === '07 Nov 2026', 'pay-by date');
ok(n.overdue === 2000, 'overdue = bills whose due date has passed');
const wa = whatsappText(n);
ok(wa.includes('Ramesh Kumar') && wa.includes('P1') && wa.includes('Property tax') && wa.includes('Garbage') && wa.includes('₹2,150'), 'WhatsApp text has owner, property, each bill and total');
ok(smsText(n).length < 320 && smsText(n).includes('₹2,150'), 'SMS text is short');
const html = noticesDocument([n, { ...n, owner: '<b>x</b>' }]);
ok(html.includes('Ramesh Kumar') && html.includes('&lt;b&gt;x&lt;/b&gt;') && !html.includes('<b>x</b>'), 'print notice escapes names');
ok(html.includes('Two thousand one hundred fifty') || html.toLowerCase().includes('two thousand one hundred fifty'), 'amount in words');
ok(normalizeMobile('98160 12345') === '919816012345' && normalizeMobile('+91-9816012345') === '919816012345' && normalizeMobile('09816012345') === '919816012345', 'mobile numbers are normalised');
ok(normalizeMobile('12345') === null && normalizeMobile('5816012345') === null && normalizeMobile('') === null, 'bad numbers are refused');
ok(mobileFromRecord(rec) === '98160 12345', 'mobile found on a unit');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
