// Phase 2 assessment engine. Pure functions, no network, so it is easy to test and to audit.
// Formula (same shape as the existing Form-E export):
//   Rateable value = built-up area x F1 x F2 x F3 x F4 x F5 x class factor
//   Net taxable value = Rateable value - rebate
//   Tax = Net taxable value x tax rate %   (only when the rate table sets a tax rate)
import type { PropertyRecord } from '../utils/gisUtils';

export interface AgeBand { maxAge: number | null; factor: number } // null = no upper limit

/** Where the numbers come from: the bylaw / notification the town is following. */
export interface BylawInfo {
  title: string;            // e.g. name of the municipal property tax bye-laws
  authority: string;        // who notified it
  notificationNo: string;
  notificationDate: string; // YYYY-MM-DD or empty
  notes: string;
}

/** Extra surcharge, deduction or flat charge from the bylaws, beyond the five factors. */
export interface Adjustment {
  name: string;
  clause?: string;
  base: 'rateable' | 'tax';   // 'rateable': changes the taxable value; 'tax': changes the tax itself
  kind: 'percent' | 'flat';   // percent of the base, or a fixed rupee amount
  value: number;              // negative = deduction
  appliesToUse?: string;      // blank = every property; otherwise only this use category
}

export interface RateTable {
  id: string;                    // = effectiveFrom
  town: string;                  // town key
  effectiveFrom: string;         // YYYY-MM-DD
  status: 'placeholder' | 'approved';
  note: string;
  zoneF1: Record<string, number>;       // location factor by zone
  structureF2: Record<string, number>;  // by structure type; "default" for anything else
  ageF3: AgeBand[];                     // ascending by maxAge
  occupancyF4: Record<string, number>;  // by occupancy; "default"
  useF5: Record<string, number>;        // by use category; "default"
  classFactor: Record<string, number>;  // by `ncls`; "default"
  rebatePct: number;
  taxRatePct: number | null;            // null = not set yet, tax is not computed
  bylaw?: BylawInfo;
  clauses?: Record<string, string>;     // clause reference per rule: F1..F5, Class, Rebate, TaxRate
  adjustments?: Adjustment[];
}

export interface FactorLine { factor: string; basis: string; value: number; clause?: string }
export interface AdjustmentLine { name: string; clause?: string; base: 'rateable' | 'tax'; amount: number }

export interface CalcResult {
  builtUp: number;
  lines: FactorLine[];
  rateableValue: number;
  rebate: number;
  netTaxableValue: number;
  tax: number | null;
  adjustments?: AdjustmentLine[];
  warnings: string[];
}

/** Values copied from the app's existing hard-coded Form-E export. NOT notified rates. */
export function placeholderRateTable(town: string, effectiveFrom = '2026-04-01'): RateTable {
  if (town === 'Nerwa') return nerwaDefaultRateTable(effectiveFrom);
  return {
    id: effectiveFrom,
    town,
    effectiveFrom,
    status: 'placeholder',
    note: 'PLACEHOLDER factors copied from the old export. Replace with the notified rates before approving any assessment.',
    zoneF1: { A: 5, B: 5, default: 5 },
    structureF2: { RCC: 3, default: 2 },
    ageF3: [{ maxAge: null, factor: 4 }],
    occupancyF4: { 'Let out': 2.5, default: 2 },
    useF5: { Commercial: 2.5, default: 1.5 },
    classFactor: { default: 1 },
    rebatePct: 10,
    taxRatePct: null,
    bylaw: { title: '', authority: '', notificationNo: '', notificationDate: '', notes: '' },
    clauses: {},
    adjustments: [],
  };
}

/**
 * Nerwa starts with this PROVISIONAL table so tax can be calculated for testing.
 * These are NOT notified bye-law values. Status stays 'placeholder', so a supervisor cannot approve
 * assessments until an admin replaces the factors with the notified ones and sets the table to 'approved'.
 */
export function nerwaDefaultRateTable(effectiveFrom = '2026-04-01'): RateTable {
  return {
    id: effectiveFrom,
    town: 'Nerwa',
    effectiveFrom,
    status: 'placeholder',
    note: 'DEFAULT PROVISIONAL rate table for Nerwa so tax can be calculated for testing. NOT notified rates. Replace with the bye-law values and set to approved before any real demand.',
    zoneF1: { A: 6, B: 5, C: 4, default: 4 },
    structureF2: { RCC: 3, 'Brick-Slate': 2.5, 'Stone-Slate': 2, default: 2 },
    ageF3: [{ maxAge: 10, factor: 4 }, { maxAge: 25, factor: 3.5 }, { maxAge: 50, factor: 3 }, { maxAge: null, factor: 2.5 }],
    occupancyF4: { 'Owner-occupied': 2, Tenanted: 2.5, 'Let out': 2.5, Vacant: 1, default: 2 },
    useF5: { Residential: 1.5, Commercial: 2.5, 'Mixed use': 2, Mixed: 2, Industrial: 2.5, Institutional: 1.5, 'Vacant land': 1, Vacant: 1, 'Under construction': 1, default: 1.5 },
    classFactor: { C: 1.1, D: 1, E: 0.9, default: 1 },
    rebatePct: 10,
    taxRatePct: 10,
    bylaw: { title: 'Provisional default (replace with the notified municipal property tax bye-laws)', authority: '', notificationNo: '', notificationDate: '', notes: 'Factors follow the Form-E structure; values are placeholders.' },
    clauses: {},
    adjustments: [],
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const pick = (m: Record<string, number>, key: string) =>
  key in m ? { v: m[key], hit: true } : { v: m.default ?? 1, hit: false };

/** Financial year label (April to March) for a date, e.g. 2026-10-17 -> "2026-27". */
export function financialYearOf(d: Date): string {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

export function calcAssessment(rec: PropertyRecord, t: RateTable, asOfYear: number): CalcResult {
  const warnings: string[] = [];
  const builtUp = Number(rec.bu) || 0;
  if (builtUp <= 0) warnings.push('No built-up area. Land-only assessment is not defined in this rate table, so value is 0.');

  const z = pick(t.zoneF1, rec.zone);
  const s = pick(t.structureF2, rec.str);
  const o = pick(t.occupancyF4, rec.occ);
  const u = pick(t.useF5, rec.use);
  const c = pick(t.classFactor, rec.ncls);
  if (!z.hit && !('default' in t.zoneF1)) warnings.push(`No location factor for zone "${rec.zone}".`);
  if (!u.hit) warnings.push(`Use "${rec.use}" is not in the rate table; default factor used.`);

  const yearBuilt = parseInt(rec.yr, 10);
  let ageFactor: number;
  let ageBasis: string;
  const bands = [...t.ageF3].sort((a, b) => (a.maxAge ?? Infinity) - (b.maxAge ?? Infinity));
  if (isNaN(yearBuilt)) {
    ageFactor = bands[bands.length - 1]?.factor ?? 1;
    ageBasis = 'year built missing';
    warnings.push('Year built is missing; oldest age band used.');
  } else {
    const age = Math.max(0, asOfYear - yearBuilt);
    const band = bands.find((b) => b.maxAge === null || age <= b.maxAge) ?? bands[bands.length - 1];
    ageFactor = band?.factor ?? 1;
    ageBasis = `${age} years old`;
  }

  const cl = (k: string) => t.clauses?.[k] || undefined;
  const lines: FactorLine[] = [
    { factor: 'F1 Location', basis: `zone ${rec.zone}`, value: z.v, clause: cl('F1') },
    { factor: 'F2 Structure', basis: rec.str, value: s.v, clause: cl('F2') },
    { factor: 'F3 Age', basis: ageBasis, value: ageFactor, clause: cl('F3') },
    { factor: 'F4 Occupancy', basis: rec.occ, value: o.v, clause: cl('F4') },
    { factor: 'F5 Use', basis: rec.use, value: u.v, clause: cl('F5') },
    { factor: 'Class', basis: `class ${rec.ncls || '-'}`, value: c.v, clause: cl('Class') },
  ];

  const rateableValue = r2(lines.reduce((acc, l) => acc * l.value, builtUp));
  const rebate = r2((rateableValue * t.rebatePct) / 100);

  // bylaw adjustments (surcharges, deductions, flat charges)
  const adjLines: AdjustmentLine[] = [];
  const applicable = (t.adjustments || []).filter((a) => builtUp > 0 && (!a.appliesToUse || a.appliesToUse === rec.use));
  const amountOf = (a: Adjustment, base: number) => r2(a.kind === 'percent' ? (base * a.value) / 100 : a.value);
  let netTaxableValue = r2(rateableValue - rebate);
  for (const a of applicable.filter((x) => x.base === 'rateable')) {
    const amount = amountOf(a, rateableValue);
    netTaxableValue = r2(netTaxableValue + amount);
    adjLines.push({ name: a.name, clause: a.clause, base: 'rateable', amount });
  }
  if (netTaxableValue < 0) { netTaxableValue = 0; warnings.push('Adjustments made the taxable value negative; set to 0.'); }

  let tax = t.taxRatePct === null ? null : r2((netTaxableValue * t.taxRatePct) / 100);
  if (t.taxRatePct === null) warnings.push('Tax rate % is not set in the rate table, so tax is not computed.');
  for (const a of applicable.filter((x) => x.base === 'tax')) {
    if (tax === null) { warnings.push(`"${a.name}" not applied: tax rate % is not set.`); continue; }
    const amount = amountOf(a, tax);
    tax = Math.max(0, r2(tax + amount));
    adjLines.push({ name: a.name, clause: a.clause, base: 'tax', amount });
  }
  return { builtUp, lines, rateableValue, rebate, netTaxableValue, tax, adjustments: adjLines, warnings };
}

/** Light validation for the rate table JSON an admin pastes in. Returns error text or null. */
export function validateRateTable(t: unknown): string | null {
  const x = t as RateTable;
  if (!x || typeof x !== 'object') return 'Not an object.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x.effectiveFrom || '')) return 'effectiveFrom must be YYYY-MM-DD.';
  for (const k of ['zoneF1', 'structureF2', 'occupancyF4', 'useF5', 'classFactor'] as const) {
    const m = x[k];
    if (!m || typeof m !== 'object') return `${k} is missing.`;
    for (const [key, v] of Object.entries(m)) if (typeof v !== 'number' || !(v >= 0)) return `${k}.${key} must be a number >= 0.`;
  }
  if (!Array.isArray(x.ageF3) || !x.ageF3.length) return 'ageF3 needs at least one band.';
  for (const b of x.ageF3) if (typeof b.factor !== 'number' || !(b.factor >= 0)) return 'Each age band needs a numeric factor.';
  if (typeof x.rebatePct !== 'number' || x.rebatePct < 0 || x.rebatePct > 100) return 'rebatePct must be 0 to 100.';
  if (x.taxRatePct !== null && (typeof x.taxRatePct !== 'number' || x.taxRatePct < 0)) return 'taxRatePct must be a number or null.';
  for (const a of x.adjustments || []) {
    if (!a.name || !a.name.trim()) return 'Every adjustment needs a name.';
    if (a.base !== 'rateable' && a.base !== 'tax') return `Adjustment "${a.name}": base must be rateable or tax.`;
    if (a.kind !== 'percent' && a.kind !== 'flat') return `Adjustment "${a.name}": kind must be percent or flat.`;
    if (typeof a.value !== 'number' || isNaN(a.value)) return `Adjustment "${a.name}": value must be a number.`;
  }
  if (x.status !== 'placeholder' && x.status !== 'approved') return 'status must be "placeholder" or "approved".';
  return null;
}
