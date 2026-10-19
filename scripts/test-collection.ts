// Run: npm run test:collection
import assert from 'node:assert/strict';
import { rekeyTowns, townSlug, townCode } from '../src/services/townPath';
import towns from '../src/data/townsData.json';
import { computeLedger, previewPayment, placeholderSettings, rupeesInWords, dueDateOf, setClock, todayIso, addMonths, LedgerEntry, CollectionSettings } from '../src/services/collection';

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok  ' + name); };

const S: CollectionSettings = { ...placeholderSettings(), dueMonth: 6, dueDay: 30, rebatePct: 5, rebateMonth: 6, rebateDay: 30, interestPctPerMonth: 2, interestGraceDays: 0 };
let seq = 0;
const E = (type: LedgerEntry['type'], fy: string, amount: number, date: string, extra: Partial<LedgerEntry> = {}): LedgerEntry =>
  ({ id: `e${++seq}`, type, fy, amount, date, at: seq, by: 'u', ...extra });

t('due date: April-December in first year, January-March in second', () => {
  assert.equal(dueDateOf('2026-27', S), '2026-06-30');
  assert.equal(dueDateOf('2026-27', { ...S, dueMonth: 3, dueDay: 31 }), '2027-03-31');
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
});

t('no interest on or before the due date', () => {
  const l = computeLedger([E('demand', '2026-27', 1000, '2026-04-01')], S, '2026-06-30');
  assert.equal(l.interestDue, 0); assert.equal(l.totalDue, 1000);
});

t('interest is per month or part of a month', () => {
  const d = [E('demand', '2026-27', 1000, '2026-04-01')];
  assert.equal(computeLedger(d, S, '2026-07-01').interestDue, 20);   // 1 day late = 1 month
  assert.equal(computeLedger(d, S, '2026-07-30').interestDue, 20);
  assert.equal(computeLedger(d, S, '2026-07-31').interestDue, 40);   // second month began 31 Jul
  assert.equal(computeLedger(d, S, '2026-07-31').principalDue, 1000); // no interest on interest
});

t('interest is not charged for months before the demand existed', () => {
  const d = [E('demand', '2026-27', 1000, '2026-10-17')];
  assert.equal(computeLedger(d, S, '2026-10-17').interestDue, 0);
});

t('interest not set: nothing charged and a warning is shown', () => {
  const l = computeLedger([E('demand', '2026-27', 1000, '2026-04-01')], { ...S, interestPctPerMonth: null }, '2027-01-01');
  assert.equal(l.interestDue, 0); assert.ok(l.warnings.length);
});

t('payment clears interest first, then principal', () => {
  const es = [E('demand', '2026-27', 1000, '2026-04-01'), E('payment', '2026-27', 520, '2026-07-10', { id: 'p1', receiptNo: 'R1' })];
  const l = computeLedger(es, S, '2026-07-10');
  assert.deepEqual(l.allocations.p1.parts, [{ fy: '2026-27', interest: 20, principal: 500 }]);
  assert.equal(l.principalDue, 500); assert.equal(l.interestDue, 0);
});

t('a partial payment lowers the interest base for later months', () => {
  const es = [E('demand', '2026-27', 1000, '2026-04-01'), E('payment', '2026-27', 520, '2026-07-10')];
  const l = computeLedger(es, S, '2026-07-31'); // 2nd month charged on 500 outstanding
  assert.equal(l.interestDue, 10);
});

t('oldest financial year is cleared first', () => {
  const es = [
    E('demand', '2025-26', 600, '2025-04-01'), E('demand', '2026-27', 1000, '2026-04-01'),
    E('payment', '2026-27', 700, '2026-05-01', { id: 'p1' }),
  ];
  const l = computeLedger(es, { ...S, interestPctPerMonth: null }, '2026-05-01');
  const a = l.allocations.p1.parts;
  assert.equal(a[0].fy, '2025-26'); assert.equal(a[0].principal, 600);
  assert.equal(a[1].fy, '2026-27'); assert.equal(a[1].principal, 100);
});

t('reversal makes the original entry as if it never happened', () => {
  const es = [E('demand', '2026-27', 1000, '2026-04-01'), E('payment', '2026-27', 400, '2026-05-01', { id: 'p1' })];
  assert.equal(computeLedger(es, S, '2026-05-02').principalDue, 600);
  es.push(E('reversal', '2026-27', 400, '2026-05-03', { reverses: 'p1', reason: 'cheque bounced' }));
  assert.equal(computeLedger(es, S, '2026-05-03').principalDue, 1000);
});

t('early-payment rebate: offered inside the window, gone after it', () => {
  const d = [E('demand', '2026-27', 1000, '2026-04-01')];
  assert.equal(computeLedger(d, S, '2026-06-30').rows[0].rebateAvailable, 50);
  assert.equal(computeLedger(d, S, '2026-07-01').rows[0].rebateAvailable, 0);
});

t('rebate needs full payment of the year', () => {
  const d = [E('demand', '2026-27', 1000, '2026-04-01')];
  const part = previewPayment(d, S, { amount: 500, date: '2026-05-01', rebateFy: '2026-27' });
  assert.equal(part.ok, false);
  const full = previewPayment(d, S, { amount: 950, date: '2026-05-01', rebateFy: '2026-27' });
  assert.equal(full.ok, true); assert.equal(full.rebate, 50);
  assert.equal(full.result!.totalDue, 0);
});

t('rebate is refused while an earlier year is unpaid', () => {
  const d = [E('demand', '2025-26', 600, '2025-04-01'), E('demand', '2026-27', 1000, '2026-04-01')];
  const p = previewPayment(d, { ...S, interestPctPerMonth: null }, { amount: 950, date: '2026-05-01', rebateFy: '2026-27' });
  assert.equal(p.ok, false);
});

t('overpayment is rejected', () => {
  const d = [E('demand', '2026-27', 1000, '2026-04-01')];
  assert.equal(previewPayment(d, S, { amount: 1000.01, date: '2026-05-01' }).ok, false);
  assert.equal(previewPayment(d, S, { amount: 1000, date: '2026-05-01' }).ok, true);
});

t('adjustment changes the demand and cannot push it below zero', () => {
  const es = [E('demand', '2026-27', 1000, '2026-04-01'), E('adjustment', '2026-27', -300, '2026-05-01', { reason: 're-assessment' })];
  assert.equal(computeLedger(es, S, '2026-05-02').principalDue, 700);
  es.push(E('adjustment', '2026-27', -5000, '2026-05-03'));
  assert.equal(computeLedger(es, S, '2026-05-04').principalDue, 0);
});

t('rupees in words', () => {
  assert.equal(rupeesInWords(0), 'Rupees zero only');
  assert.equal(rupeesInWords(12345.5), 'Rupees twelve thousand three hundred forty five and fifty paise only');
  assert.equal(rupeesInWords(2500000), 'Rupees twenty five lakh only');
  assert.equal(rupeesInWords(120000000), 'Rupees twelve crore only');
});

t('towns are keyed by name, keep their ULB code, no name collisions', () => {
  const k = rekeyTowns(towns as never);
  assert.equal(Object.keys(k).length, Object.keys(towns).length);
  assert.ok(k['Bhota']); assert.equal(townCode('Bhota'), '0206001');
  assert.equal(townSlug('Baijnath paprola'), 'Baijnath_paprola'); assert.equal(townCode('Baijnath_paprola'), '0202013');
  assert.deepEqual(Object.keys(rekeyTowns(k)).sort(), Object.keys(k).sort()); // running twice changes nothing
  assert.ok(Object.keys(k).every((x) => /^[A-Za-z0-9_]+$/.test(x)));
});

t('today comes from the set clock and is always the India (IST) date', () => {
  const at = (iso: string) => setClock(() => Date.parse(iso));
  at('2026-03-31T18:29:59Z'); assert.equal(todayIso(), '2026-03-31');   // 23:59:59 IST
  at('2026-03-31T18:30:00Z'); assert.equal(todayIso(), '2026-04-01');   // midnight IST: new day, new financial year
  at('2026-12-31T20:00:00Z'); assert.equal(todayIso(), '2027-01-01');
  setClock(() => Date.now());
});

t('a phone clock that is wrong does not move the date once the server offset is applied', () => {
  const server = Date.parse('2026-10-19T06:00:00Z');
  const phoneBehind = server - 3 * 24 * 3600 * 1000;           // phone is 3 days behind
  const offset = server - phoneBehind;                          // what Firebase reports as serverTimeOffset
  setClock(() => phoneBehind + offset);
  assert.equal(todayIso(), '2026-10-19');
  setClock(() => Date.now());
});

console.log(`\n${n} tests passed`);
