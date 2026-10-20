// Removing and regenerating bills: which bills can go, and the ids of the new ones.
import { LedgerEntry, liveDemand, nextDemandId, planVoid } from '../src/services/collection';

let failed = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) failed++; };
const e = (id: string, type: LedgerEntry['type'], fy: string, amount: number, extra: Partial<LedgerEntry> = {}): LedgerEntry =>
  ({ id, type, fy, amount, date: '2026-10-01', at: 1, by: 'x', ...extra } as LedgerEntry);

const L: Record<string, LedgerEntry[]> = {
  'P1~U01': [e('demand_2026-10', 'demand', '2026-10', 80), e('demand_2026-09', 'demand', '2026-09', 80)],
  'P1~U02': [e('demand_2026-10', 'demand', '2026-10', 50), e('adj1', 'adjustment', '2026-10', -10)],
  'P2': [e('demand_2026-10', 'demand', '2026-10', 50), e('pay1', 'payment', '2026-10', 50)],
  'P3': [e('demand_2026-10', 'demand', '2026-10', 50), e('rev_demand_2026-10', 'reversal', '2026-10', 50, { reverses: 'demand_2026-10' })],
};

const all = planVoid(L, '2026-10', () => true);
ok(all.items.length === 2 && all.keptPaid === 1, 'whole town: 2 removable, 1 kept because paid; already removed one is ignored');
ok(all.amount === 80 + 50 - 10, 'amount counts the demand and its adjustment');
ok(all.items.find((i) => i.key === 'P1~U02')?.ids.length === 2, 'adjustments on the period are cancelled with the demand');
ok(planVoid(L, '2026-09', () => true).items.length === 1, 'other months are untouched');
const one = planVoid(L, '2026-10', (k) => k.split('~')[0] === 'P1');
ok(one.items.length === 2, 'one structure covers all its units');
ok(planVoid(L, '2026-10', (k) => k === 'nope').items.length === 0, 'nothing outside the scope');

ok(!!liveDemand(L['P1~U01'], '2026-10'), 'live demand found');
ok(!liveDemand(L['P3'], '2026-10'), 'a removed demand no longer counts');
ok(nextDemandId(L['P1~U01'], '2026-10') === 'demand_2026-10_r2', 'new id after removal is _r2');
ok(nextDemandId([], '2026-10') === 'demand_2026-10', 'first demand keeps the plain id');
const again = [...L['P3'], e('demand_2026-10_r2', 'demand', '2026-10', 60), e('rev_demand_2026-10_r2', 'reversal', '2026-10', 60, { reverses: 'demand_2026-10_r2' })];
ok(nextDemandId(again, '2026-10') === 'demand_2026-10_r3' && !liveDemand(again, '2026-10'), 'second removal gives _r3');

if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log('all passed');
