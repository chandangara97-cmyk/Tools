// Garbage billed per unit: expansion of a mixed building and dues across its units. Run: npm run test:units
import { expandForHead, unitList, unitsToRecord, nextUnitId, needsUnits } from '../src/services/units';
import { propertyLiability } from '../src/services/liabilityCalc';
import { placeholderSettings } from '../src/services/collection';
import type { PropertyRecord } from '../src/utils/gisUtils';
import type { LedgerEntry } from '../src/services/collection';

let fails = 0;
const ok = (c: boolean, m: string) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };

const base = { town: 'T', ward: '1', sur: '', hno: '1', addr: '', occ: '', str: '', yr: '', floors: [1], bu: 1, land: 1, act: '', zone: 'A', ncls: '', tenant: '', upn: '', lat: '', lng: '', acc: '', rem: '', date: '' };
const rec = (id: string, extra: Partial<PropertyRecord>): PropertyRecord => ({ ...base, id, owner: 'Ramesh', use: 'Mixed', ...extra } as PropertyRecord);
const mixed = rec('P1', { units: {
  U1: { label: 'Ground floor shop', use: 'Commercial', occupantType: 'Owner', occupant: '', active: true },
  U2: { label: 'First floor flat', use: 'Residential', occupantType: 'Tenant', occupant: 'Sita', active: true },
  U3: { label: 'Old godown', use: 'Commercial', occupantType: 'Owner', occupant: '', active: false },
} });
const plain = rec('P2', { use: 'Residential' });
const unknown = rec('P3', { use: 'Mixed' });
const dem = (fy: string, amount: number): LedgerEntry => ({ id: `demand_${fy}`, type: 'demand', fy, amount, date: '2026-10-01', at: 1, by: 'x' } as LedgerEntry);

ok(unitList(mixed).length === 3 && unitList(mixed)[0].id === 'U1', 'units listed in order');
ok(nextUnitId(unitList(mixed)) === 'U04', 'next unit id');
ok(unitsToRecord([]) === undefined, 'empty units stored as nothing');
ok(needsUnits(unknown) && !needsUnits(mixed) && !needsUnits(plain), 'only mixed buildings without units need units');

const rows = expandForHead([mixed, plain, unknown], 'garbage', {});
ok(rows.map((r) => r.id).join(',') === 'P1~U1,P1~U2,P2,P3', 'one row per active unit; closed unit with no history hidden');
ok(rows[0].use === 'Commercial' && rows[1].use === 'Residential', 'each unit keeps its own use');
ok(rows[1].owner.includes('Sita') && rows[1].owner.includes('tenant'), 'tenant is the payer');
ok(expandForHead([mixed], 'water', {})[0].id === 'P1', 'other heads stay per building');

const withHistory = expandForHead([mixed], 'garbage', { P1: [dem('2026-09', 50)], 'P1~U3': [dem('2026-09', 80)] });
ok(withHistory.some((r) => r.id === 'P1' && r.billable === false), 'earlier whole-building bills stay visible, not billable');
ok(withHistory.some((r) => r.id === 'P1~U3' && r.billable === false), 'closed unit with history stays visible, not billable');

const S = { ...placeholderSettings() };
const settings = { property_tax: S, water: S, garbage: S, sewerage: S, other: S };
const ledgers = { property_tax: {}, water: {}, sewerage: {}, other: {}, garbage: { 'P1~U1': [dem('2026-10', 80)], 'P1~U2': [dem('2026-10', 50)], P2: [dem('2026-10', 50)], 'P10~U1': [dem('2026-10', 999)] } };
const l = propertyLiability('P1', ['garbage'], ledgers as never, settings as never, '2026-10-19');
ok(l.total === 130, `building dues add up its units (got ${l.total})`);
ok(l.heads[0].periods.length === 1 && l.heads[0].periods[0].total === 130, 'same month merges into one period');
ok(propertyLiability('P10', ['garbage'], ledgers as never, settings as never, '2026-10-19').total === 999, 'P1 does not pick up P10 units');
ok(propertyLiability('P2', ['garbage'], ledgers as never, settings as never, '2026-10-19').total === 50, 'plain building unchanged');

console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
