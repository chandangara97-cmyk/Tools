// Excel-driven town configuration. Pure functions (no network, no Excel library), so they are easy to test and audit.
//
// One workbook carries, for any number of towns:
//   Towns        which ULBs are active and which bill heads each one has       (platform owner only)
//   Rates        fixed Residential / Commercial amounts per town and head
//   Rules        due date, interest, grace days and rebate per town and head
//   Bylaw_*      the property tax bye-law rate table (factors, age bands, surcharges) per town
//   Corrections  +/- adjustments to a property's bill for a period, each with a reason
//
// Rule of the upload: a row that is present SETS that value; a town or head that has no row is left alone.
// Nothing is deleted by leaving rows out. Every value is validated here before anything is written.
import type { HeadId } from './heads';
import { CollectionSettings, placeholderSettings, validateSettings } from './collection';
import { RateTable, Adjustment, validateRateTable, placeholderRateTable } from './assessment';

export const HEAD_IDS: HeadId[] = ['property_tax', 'water', 'garbage', 'sewerage', 'other'];
export const HEAD_LABELS: Record<HeadId, string> = {
  property_tax: 'Property tax', water: 'Water', garbage: 'Garbage', sewerage: 'Sewerage', other: 'Other utilities',
};
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type Cell = string | number | null;
export type Row = Record<string, Cell>;
export type Sheets = Record<string, Row[]>;

export interface Issue { sheet: string; row: number; level: 'error' | 'warn'; message: string }

// ---------- sheet layout (shared by the writer, the reader and the tests) ----------
export const SHEET = {
  towns: 'Towns', rates: 'Rates', rules: 'Rules',
  general: 'Bylaw_General', factors: 'Bylaw_Factors', age: 'Bylaw_Age', adjustments: 'Bylaw_Adjustments',
  corrections: 'Corrections',
} as const;

export const COLUMNS: Record<string, string[]> = {
  [SHEET.towns]: ['Town', 'Active', ...HEAD_IDS.map((h) => HEAD_LABELS[h])],
  [SHEET.rates]: ['Town', 'Bill head', 'Residential amount', 'Commercial amount', 'Charged'],
  [SHEET.rules]: ['Town', 'Bill head', 'Status', 'Due month', 'Due day', 'Rebate %', 'Rebate last month', 'Rebate last day', 'Interest % per month', 'Grace days', 'Notes', 'Clause: due date', 'Clause: rebate', 'Clause: interest'],
  [SHEET.general]: ['Town', 'Effective from', 'Status', 'Rebate %', 'Tax rate %', 'Bye-law title', 'Notified by', 'Notification no', 'Notification date', 'Bye-law notes', 'Notes', 'Clause: F1', 'Clause: F2', 'Clause: F3', 'Clause: F4', 'Clause: F5', 'Clause: Class', 'Clause: Rebate', 'Clause: Tax rate'],
  [SHEET.factors]: ['Town', 'Factor', 'Key', 'Value'],
  [SHEET.age]: ['Town', 'Up to age (years)', 'Factor'],
  [SHEET.adjustments]: ['Town', 'Name', 'Clause', 'Applies to', 'Kind', 'Value', 'Only for use'],
  [SHEET.corrections]: ['Correction ID', 'Town', 'Bill head', 'Property ID', 'Period', 'Amount', 'Date', 'Reason'],
};

export const FACTOR_NAMES = ['F1 Location (zone)', 'F2 Structure', 'F4 Occupancy', 'F5 Use', 'Class'] as const;
const FACTOR_FIELD: Record<string, 'zoneF1' | 'structureF2' | 'occupancyF4' | 'useF5' | 'classFactor'> = {
  f1: 'zoneF1', f2: 'structureF2', f4: 'occupancyF4', f5: 'useF5', class: 'classFactor',
};
/** "F1 Location (zone)", "f1" and "F1" all mean the location factor; "Class" the class factor. */
const factorField = (raw: string) => { const t = norm(raw); return FACTOR_FIELD[/^f[1245]/.test(t) ? t.slice(0, 2) : t.startsWith('class') ? 'class' : '']; };
const FACTOR_TITLE: Record<string, string> = { zoneF1: FACTOR_NAMES[0], structureF2: FACTOR_NAMES[1], occupancyF4: FACTOR_NAMES[2], useF5: FACTOR_NAMES[3], classFactor: FACTOR_NAMES[4] };

export const BASE_CHOICES = ['Rateable value', 'Tax'] as const;
export const KIND_CHOICES = ['Percent', 'Flat amount'] as const;
export const CHARGED_CHOICES = ['Yearly', 'Monthly'] as const;
export const STATUS_CHOICES = ['Placeholder', 'Approved'] as const;

// ---------- cell helpers ----------
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
const isBlank = (v: Cell | undefined) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
const text = (v: Cell | undefined) => (isBlank(v) ? '' : String(v).trim());

/** A number from a cell: accepts 1,250.50 and a rupee sign. Returns undefined when blank, NaN when not a number. */
function num(v: Cell | undefined): number | undefined | typeof NaN {
  if (isBlank(v)) return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  const t = String(v).replace(/[₹,\s]/g, '').replace(/%$/, '');
  if (!/^[-+]?\d*\.?\d+$/.test(t)) return NaN;
  return Number(t);
}
const cellsOf = (row: Row, header: string): Cell | undefined => {
  const want = norm(header);
  for (const k of Object.keys(row)) if (norm(k) === want) return row[k];
  return undefined;
};
const dateText = (v: Cell | undefined): string | null => { // YYYY-MM-DD, or null when it is not a date
  const t = text(v);
  if (!t) return '';
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // 31/03/2027 (India: day first)
  if (m) return ymd(+m[3], +m[2], +m[1]);
  return null;
};
function ymd(y: number, mo: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
const monthOf = (v: Cell | undefined): number | undefined | typeof NaN => {
  if (isBlank(v)) return undefined;
  const n = num(v);
  if (typeof n === 'number' && !Number.isNaN(n)) return n;
  const i = MONTHS.findIndex((m) => m.toLowerCase() === text(v).slice(0, 3).toLowerCase());
  return i < 0 ? NaN : i + 1;
};
const yesNo = (v: Cell | undefined): boolean | undefined => {
  const t = text(v).toLowerCase();
  if (['yes', 'y', 'true', '1', 'on'].includes(t)) return true;
  if (['no', 'n', 'false', '0', 'off'].includes(t)) return false;
  return undefined;
};
export function headFromText(v: Cell | undefined): HeadId | null {
  const t = norm(text(v));
  if (!t) return null;
  for (const h of HEAD_IDS) if (norm(h) === t || norm(HEAD_LABELS[h]) === t) return h;
  if (t === 'pt' || t === 'propertytax') return 'property_tax';
  if (t === 'otherutility' || t === 'otherutilities') return 'other';
  return null;
}

export interface KnownTown { slug: string; name: string }
export interface ParseContext {
  towns: KnownTown[];                // ULBs this login can see
  canManageTowns: boolean;           // platform owner only: ulbs/<town> is not writable by a town admin
  canWriteTown: (slug: string) => boolean;
}

export interface CorrectionRow { id: string; town: string; head: HeadId; propertyId: string; period: string; amount: number; date: string; reason: string; row: number }
export interface RateRow { town: string; head: HeadId; residential: number | null; commercial: number | null; frequency: 'yearly' | 'monthly'; row: number }
export interface RuleRow { town: string; head: HeadId; settings: CollectionSettings; row: number }
export interface TownRow { town: string; active: boolean | undefined; heads: HeadId[] | undefined; row: number }

export interface ParsedConfig {
  towns: TownRow[];
  rates: RateRow[];
  rules: RuleRow[];
  bylaws: Record<string, RateTable>;
  corrections: CorrectionRow[];
}

export interface ParseResult { config: ParsedConfig; issues: Issue[]; errorCount: number; warnCount: number }

/** Row numbers shown to the user count the header as row 1, like Excel does. */
export function parseConfig(sheets: Sheets, ctx: ParseContext): ParseResult {
  const issues: Issue[] = [];
  const err = (sheet: string, row: number, message: string) => issues.push({ sheet, row, level: 'error', message });
  const warn = (sheet: string, row: number, message: string) => issues.push({ sheet, row, level: 'warn', message });
  const config: ParsedConfig = { towns: [], rates: [], rules: [], bylaws: {}, corrections: [] };

  const resolve = (v: Cell | undefined): string | null => {
    const t = norm(text(v));
    if (!t) return null;
    const hit = ctx.towns.find((x) => norm(x.slug) === t) || ctx.towns.find((x) => norm(x.name) === t);
    return hit ? hit.slug : null;
  };
  /** Town of a row, checked against what this login may change. Reports its own problem and returns null. */
  const townOf = (sheet: string, rowNo: number, row: Row, header = 'Town'): string | null => {
    const raw = cellsOf(row, header);
    if (isBlank(raw)) { err(sheet, rowNo, 'Town is empty.'); return null; }
    const slug = resolve(raw);
    if (!slug) { err(sheet, rowNo, `Town "${text(raw)}" is not a set-up ULB. Pick it from the drop-down; new ULBs are created in Admin users.`); return null; }
    if (!ctx.canWriteTown(slug)) { err(sheet, rowNo, `You are not the admin of ${text(raw)}, so this row cannot be applied.`); return null; }
    return slug;
  };

  const rowsOf = (name: string) => sheets[name] || [];
  const live = (rows: Row[]) => rows.map((r, i) => ({ r, n: i + 2 })).filter(({ r }) => Object.values(r).some((v) => !isBlank(v)));
  // A deleted or renamed column would silently read as "empty" and could clear values, so every column must be there.
  const brokenSheets = new Set<string>();
  for (const [name, cols] of Object.entries(COLUMNS)) {
    const rows = live(rowsOf(name)); if (!rows.length) continue;
    const have = new Set(rows.flatMap(({ r }) => Object.keys(r).map(norm)));
    const lost = cols.filter((c) => !have.has(norm(c)));
    if (lost.length) { brokenSheets.add(name); err(name, 1, `Column(s) missing or renamed: ${lost.join(', ')}. Download a fresh workbook and copy your rows into it.`); }
  }

  // ----- Towns -----
  const seenTown = new Set<string>();
  for (const { r, n } of live(brokenSheets.has(SHEET.towns) ? [] : rowsOf(SHEET.towns))) {
    const raw = cellsOf(r, 'Town');
    const slug = resolve(raw);
    if (!slug) { err(SHEET.towns, n, `Town "${text(raw)}" is not a set-up ULB. New ULBs are created in Admin users.`); continue; }
    if (!ctx.canManageTowns) { err(SHEET.towns, n, 'Only the platform owner can switch towns on or off or change their bill heads. Remove this sheet\'s rows or ask the platform owner.'); continue; }
    if (seenTown.has(slug)) { err(SHEET.towns, n, `${text(raw)} appears twice on this sheet.`); continue; }
    seenTown.add(slug);
    const activeRaw = cellsOf(r, 'Active');
    const active = isBlank(activeRaw) ? undefined : yesNo(activeRaw);
    if (!isBlank(activeRaw) && active === undefined) { err(SHEET.towns, n, 'Active must be Yes or No.'); continue; }
    const heads: HeadId[] = [];
    let bad = false; let anyHeadCell = false;
    for (const h of HEAD_IDS) {
      const c = cellsOf(r, HEAD_LABELS[h]);
      if (isBlank(c)) continue;
      anyHeadCell = true;
      const y = yesNo(c);
      if (y === undefined) { err(SHEET.towns, n, `${HEAD_LABELS[h]} must be Yes or No.`); bad = true; } else if (y) heads.push(h);
    }
    if (bad) continue;
    if (anyHeadCell && !heads.includes('property_tax')) { warn(SHEET.towns, n, 'Property tax is always kept on for every town.'); heads.unshift('property_tax'); }
    config.towns.push({ town: slug, active, heads: anyHeadCell ? HEAD_IDS.filter((h) => heads.includes(h)) : undefined, row: n });
  }

  // ----- Rates -----
  const seenRate = new Set<string>();
  for (const { r, n } of live(brokenSheets.has(SHEET.rates) ? [] : rowsOf(SHEET.rates))) {
    const town = townOf(SHEET.rates, n, r); if (!town) continue;
    const head = headFromText(cellsOf(r, 'Bill head'));
    if (!head) { err(SHEET.rates, n, `Bill head "${text(cellsOf(r, 'Bill head'))}" is not one of: ${HEAD_IDS.map((h) => HEAD_LABELS[h]).join(', ')}.`); continue; }
    const key = `${town}|${head}`;
    if (seenRate.has(key)) { err(SHEET.rates, n, `${HEAD_LABELS[head]} for this town appears twice on this sheet.`); continue; }
    seenRate.add(key);
    const res = num(cellsOf(r, 'Residential amount')); const com = num(cellsOf(r, 'Commercial amount'));
    if (Number.isNaN(res)) { err(SHEET.rates, n, 'Residential amount must be a number.'); continue; }
    if (Number.isNaN(com)) { err(SHEET.rates, n, 'Commercial amount must be a number.'); continue; }
    const chargedRaw = text(cellsOf(r, 'Charged')).toLowerCase();
    if (chargedRaw && chargedRaw !== 'yearly' && chargedRaw !== 'monthly') { err(SHEET.rates, n, 'Charged must be Yearly or Monthly.'); continue; }
    if (chargedRaw === 'monthly' && head === 'property_tax') { err(SHEET.rates, n, 'Property tax is always charged yearly.'); continue; }
    const out = { residential: (res as number | undefined) ?? null, commercial: (com as number | undefined) ?? null };
    const msg = rateError(out);
    if (msg) { err(SHEET.rates, n, msg); continue; }
    if (out.residential === null && out.commercial === null) warn(SHEET.rates, n, 'Both amounts are empty; this clears the amounts for this head.');
    config.rates.push({ town, head, ...out, frequency: chargedRaw === 'monthly' ? 'monthly' : 'yearly', row: n });
  }

  // ----- Rules -----
  const seenRule = new Set<string>();
  for (const { r, n } of live(brokenSheets.has(SHEET.rules) ? [] : rowsOf(SHEET.rules))) {
    const town = townOf(SHEET.rules, n, r); if (!town) continue;
    const head = headFromText(cellsOf(r, 'Bill head'));
    if (!head) { err(SHEET.rules, n, `Bill head "${text(cellsOf(r, 'Bill head'))}" is not one of: ${HEAD_IDS.map((h) => HEAD_LABELS[h]).join(', ')}.`); continue; }
    const key = `${town}|${head}`;
    if (seenRule.has(key)) { err(SHEET.rules, n, `${HEAD_LABELS[head]} for this town appears twice on this sheet.`); continue; }
    seenRule.add(key);
    const base = placeholderSettings();
    const status = text(cellsOf(r, 'Status')).toLowerCase();
    if (status && status !== 'placeholder' && status !== 'approved') { err(SHEET.rules, n, 'Status must be Placeholder or Approved.'); continue; }
    const f = (h: string, dflt: number | null) => { const v = num(cellsOf(r, h)); return v === undefined ? dflt : v; };
    const dueMonth = monthOf(cellsOf(r, 'Due month')); const rebMonth = monthOf(cellsOf(r, 'Rebate last month'));
    const interest = num(cellsOf(r, 'Interest % per month'));
    const grace = num(cellsOf(r, 'Grace days'));
    const bad = [['Due month', dueMonth], ['Due day', f('Due day', base.dueDay)], ['Rebate %', f('Rebate %', base.rebatePct)], ['Rebate last month', rebMonth], ['Rebate last day', f('Rebate last day', base.rebateDay)], ['Interest % per month', interest], ['Grace days', grace]]
      .find(([, v]) => typeof v === 'number' && Number.isNaN(v));
    if (bad) { err(SHEET.rules, n, `${bad[0]} is not a valid number${bad[0] === 'Due month' || bad[0] === 'Rebate last month' ? ' or month name' : ''}.`); continue; }
    const s: CollectionSettings = {
      status: status === 'approved' ? 'approved' : 'placeholder',
      dueMonth: (dueMonth as number | undefined) ?? base.dueMonth,
      dueDay: f('Due day', base.dueDay) as number,
      rebatePct: f('Rebate %', base.rebatePct) as number,
      rebateMonth: (rebMonth as number | undefined) ?? base.rebateMonth,
      rebateDay: f('Rebate last day', base.rebateDay) as number,
      interestPctPerMonth: (interest as number | undefined) ?? null,
      interestGraceDays: (grace as number | undefined) ?? 0,
      notes: text(cellsOf(r, 'Notes')),
      clauses: pruneClauses({ due: text(cellsOf(r, 'Clause: due date')), rebate: text(cellsOf(r, 'Clause: rebate')), interest: text(cellsOf(r, 'Clause: interest')) }),
    };
    const msg = validateSettings(s);
    if (msg) { err(SHEET.rules, n, msg); continue; }
    if (s.status === 'approved' && s.interestPctPerMonth === null) warn(SHEET.rules, n, 'Approved with no interest % — no interest will be charged on late payment.');
    if (s.status === 'approved' && !s.clauses.due && !s.clauses.interest) warn(SHEET.rules, n, 'Approved without a bye-law clause for the due date or interest. Add the clause so the notice can cite it.');
    config.rules.push({ town, head, settings: s, row: n });
  }

  // ----- Bye-laws -----
  parseBylaws((n) => (brokenSheets.has(n) ? [] : rowsOf(n)), live, townOf, err, warn, config);

  // ----- Corrections -----
  const seenId = new Set<string>();
  for (const { r, n } of live(brokenSheets.has(SHEET.corrections) ? [] : rowsOf(SHEET.corrections))) {
    const id = text(cellsOf(r, 'Correction ID'));
    if (!id) { err(SHEET.corrections, n, 'Correction ID is empty. Give every correction its own ID (for example C-2026-001) — it stops the same correction being posted twice.'); continue; }
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) { err(SHEET.corrections, n, 'Correction ID may use letters, digits, - and _ only (up to 40).'); continue; }
    if (seenId.has(id)) { err(SHEET.corrections, n, `Correction ID ${id} is used twice in this file.`); continue; }
    seenId.add(id);
    const town = townOf(SHEET.corrections, n, r); if (!town) continue;
    const head = headFromText(cellsOf(r, 'Bill head'));
    if (!head) { err(SHEET.corrections, n, `Bill head "${text(cellsOf(r, 'Bill head'))}" is not one of: ${HEAD_IDS.map((h) => HEAD_LABELS[h]).join(', ')}.`); continue; }
    const pid = text(cellsOf(r, 'Property ID'));
    if (!pid) { err(SHEET.corrections, n, 'Property ID is empty.'); continue; }
    if (/[.$#[\]/\s]/.test(pid)) { err(SHEET.corrections, n, 'Property ID has a space or one of . $ # [ ] / — copy it exactly from the property record.'); continue; }
    const period = text(cellsOf(r, 'Period'));
    if (!isPeriod(period)) { err(SHEET.corrections, n, 'Period must be a financial year like 2026-27, or a month like 2026-10 for monthly bills.'); continue; }
    const amount = num(cellsOf(r, 'Amount'));
    if (amount === undefined || Number.isNaN(amount) || amount === 0) { err(SHEET.corrections, n, 'Amount must be a non-zero number (+ adds to the bill, − reduces it).'); continue; }
    if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) { err(SHEET.corrections, n, 'Amount can have at most 2 decimals.'); continue; }
    if (Math.abs(amount) > 100000000) { err(SHEET.corrections, n, 'Amount is too large.'); continue; }
    const date = dateText(cellsOf(r, 'Date'));
    if (!date) { err(SHEET.corrections, n, 'Date must be a real date (YYYY-MM-DD or DD/MM/YYYY).'); continue; }
    const reason = text(cellsOf(r, 'Reason'));
    if (!reason) { err(SHEET.corrections, n, 'Reason is required for every correction.'); continue; }
    if (reason.length > 300) { err(SHEET.corrections, n, 'Reason is too long (300 characters at most).'); continue; }
    config.corrections.push({ id, town, head, propertyId: pid, period, amount: amount as number, date, reason, row: n });
  }

  const errorCount = issues.filter((i) => i.level === 'error').length;
  return { config, issues, errorCount, warnCount: issues.length - errorCount };
}

const pruneClauses = <T extends Record<string, string>>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v)) as Partial<T>;
export const isPeriod = (p: string) => /^\d{4}-\d{2}$/.test(p) && Number(p.slice(5)) !== 0 && (Number(p.slice(5)) <= 12 || Number(p.slice(5)) === (Number(p.slice(0, 4)) + 1) % 100);

export function rateError(r: { residential: number | null; commercial: number | null }): string | null {
  for (const [label, v] of [['Residential', r.residential], ['Commercial', r.commercial]] as const) {
    if (v === null) continue;
    if (!isFinite(v) || v < 0 || v > 100000000) return `${label} amount must be a number from 0 upwards.`;
    if (Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) return `${label} amount can have at most 2 decimals (paise).`;
  }
  return null;
}

type RowN = { r: Row; n: number };
function parseBylaws(
  rowsOf: (n: string) => Row[], live: (rows: Row[]) => RowN[],
  townOf: (sheet: string, n: number, r: Row) => string | null,
  err: (s: string, n: number, m: string) => void, warn: (s: string, n: number, m: string) => void,
  config: ParsedConfig,
) {
  const general = new Map<string, { r: Row; n: number }>();
  for (const { r, n } of live(rowsOf(SHEET.general))) {
    const town = townOf(SHEET.general, n, r); if (!town) continue;
    if (general.has(town)) { err(SHEET.general, n, 'This town has two rows on Bylaw_General. Keep one.'); continue; }
    general.set(town, { r, n });
  }
  const orphan = (sheet: string, n: number, town: string) => {
    if (general.has(town)) return false;
    err(sheet, n, 'This town has no row on Bylaw_General, so these values have nowhere to go. Add the town there first.');
    return true;
  };

  const tables = new Map<string, RateTable>();
  for (const [town, { r, n }] of general) {
    const eff = dateText(cellsOf(r, 'Effective from'));
    if (!eff) { err(SHEET.general, n, 'Effective from must be a real date (YYYY-MM-DD or DD/MM/YYYY).'); continue; }
    const status = text(cellsOf(r, 'Status')).toLowerCase();
    if (status !== 'placeholder' && status !== 'approved') { err(SHEET.general, n, 'Status must be Placeholder or Approved.'); continue; }
    const reb = num(cellsOf(r, 'Rebate %')); const tax = num(cellsOf(r, 'Tax rate %'));
    if (reb === undefined || Number.isNaN(reb)) { err(SHEET.general, n, 'Rebate % must be a number (use 0 for none).'); continue; }
    if (Number.isNaN(tax)) { err(SHEET.general, n, 'Tax rate % must be a number or empty.'); continue; }
    const nd = dateText(cellsOf(r, 'Notification date'));
    if (nd === null) { err(SHEET.general, n, 'Notification date must be a real date or empty.'); continue; }
    const clauses = pruneClauses({
      F1: text(cellsOf(r, 'Clause: F1')), F2: text(cellsOf(r, 'Clause: F2')), F3: text(cellsOf(r, 'Clause: F3')), F4: text(cellsOf(r, 'Clause: F4')), F5: text(cellsOf(r, 'Clause: F5')),
      Class: text(cellsOf(r, 'Clause: Class')), Rebate: text(cellsOf(r, 'Clause: Rebate')), TaxRate: text(cellsOf(r, 'Clause: Tax rate')),
    }) as Record<string, string>;
    tables.set(town, {
      id: eff, town, effectiveFrom: eff, status: status as 'placeholder' | 'approved', note: text(cellsOf(r, 'Notes')),
      zoneF1: {}, structureF2: {}, ageF3: [], occupancyF4: {}, useF5: {}, classFactor: {},
      rebatePct: reb as number, taxRatePct: (tax as number | undefined) ?? null,
      bylaw: { title: text(cellsOf(r, 'Bye-law title')), authority: text(cellsOf(r, 'Notified by')), notificationNo: text(cellsOf(r, 'Notification no')), notificationDate: nd || '', notes: text(cellsOf(r, 'Bye-law notes')) },
      clauses, adjustments: [],
    });
  }

  const seenKey = new Set<string>();
  for (const { r, n } of live(rowsOf(SHEET.factors))) {
    const town = townOf(SHEET.factors, n, r); if (!town) continue;
    if (orphan(SHEET.factors, n, town)) continue;
    const t = tables.get(town); if (!t) continue; // its General row already failed
    const fRaw = text(cellsOf(r, 'Factor'));
    const field = factorField(fRaw);
    if (!field) { err(SHEET.factors, n, `Factor "${fRaw}" must be one of: ${FACTOR_NAMES.join(', ')}.`); continue; }
    const key = text(cellsOf(r, 'Key'));
    if (!key) { err(SHEET.factors, n, 'Key is empty (use "default" for the value used when nothing else matches).'); continue; }
    const value = num(cellsOf(r, 'Value'));
    if (value === undefined || Number.isNaN(value) || value < 0) { err(SHEET.factors, n, 'Value must be a number, 0 or more.'); continue; }
    const dupKey = `${town}|${field}|${key.toLowerCase()}`;
    if (seenKey.has(dupKey)) { err(SHEET.factors, n, `"${key}" is listed twice under ${FACTOR_TITLE[field]} for this town.`); continue; }
    seenKey.add(dupKey);
    t[field][key === 'DEFAULT' || key.toLowerCase() === 'default' ? 'default' : key] = value as number;
  }

  const seenAge = new Set<string>();
  for (const { r, n } of live(rowsOf(SHEET.age))) {
    const town = townOf(SHEET.age, n, r); if (!town) continue;
    if (orphan(SHEET.age, n, town)) continue;
    const t = tables.get(town); if (!t) continue;
    const upto = num(cellsOf(r, 'Up to age (years)')); const factor = num(cellsOf(r, 'Factor'));
    if (Number.isNaN(upto) || (upto !== undefined && (upto < 0 || !Number.isInteger(upto)))) { err(SHEET.age, n, 'Up to age must be a whole number of years, or empty for "older than every band above".'); continue; }
    if (factor === undefined || Number.isNaN(factor) || factor < 0) { err(SHEET.age, n, 'Factor must be a number, 0 or more.'); continue; }
    const k = `${town}|${upto ?? 'open'}`;
    if (seenAge.has(k)) { err(SHEET.age, n, upto === undefined ? 'Only one band can be left open (empty age).' : `The band "up to ${upto} years" is listed twice.`); continue; }
    seenAge.add(k);
    t.ageF3.push({ maxAge: (upto as number | undefined) ?? null, factor: factor as number });
  }

  for (const { r, n } of live(rowsOf(SHEET.adjustments))) {
    const town = townOf(SHEET.adjustments, n, r); if (!town) continue;
    if (orphan(SHEET.adjustments, n, town)) continue;
    const t = tables.get(town); if (!t) continue;
    const name = text(cellsOf(r, 'Name'));
    if (!name) { err(SHEET.adjustments, n, 'Name is empty.'); continue; }
    const baseT = norm(text(cellsOf(r, 'Applies to')));
    const base = baseT === 'rateablevalue' || baseT === 'rateable' ? 'rateable' : baseT === 'tax' ? 'tax' : null;
    if (!base) { err(SHEET.adjustments, n, 'Applies to must be "Rateable value" or "Tax".'); continue; }
    const kindT = norm(text(cellsOf(r, 'Kind')));
    const kind = kindT === 'percent' || kindT === 'percentage' ? 'percent' : kindT === 'flatamount' || kindT === 'flat' ? 'flat' : null;
    if (!kind) { err(SHEET.adjustments, n, 'Kind must be "Percent" or "Flat amount".'); continue; }
    const value = num(cellsOf(r, 'Value'));
    if (value === undefined || Number.isNaN(value)) { err(SHEET.adjustments, n, 'Value must be a number (negative for a deduction).'); continue; }
    const adj: Adjustment = { name, base, kind, value: value as number };
    const clause = text(cellsOf(r, 'Clause')); if (clause) adj.clause = clause;
    const use = text(cellsOf(r, 'Only for use')); if (use) adj.appliesToUse = use;
    (t.adjustments ||= []).push(adj);
  }

  for (const [town, t] of tables) {
    const n = general.get(town)!.n;
    let blocked = false;
    const block = (sheet: string, m: string) => { err(sheet, n, m); blocked = true; };
    t.ageF3.sort((a, b) => (a.maxAge ?? Infinity) - (b.maxAge ?? Infinity));
    for (const f of ['zoneF1', 'structureF2', 'occupancyF4', 'useF5', 'classFactor'] as const) {
      if (!Object.keys(t[f]).length) block(SHEET.factors, `${FACTOR_TITLE[f]} has no rows for ${town}. Add at least a "default" row.`);
      else if (!('default' in t[f])) warn(SHEET.factors, n, `${FACTOR_TITLE[f]} has no "default" row for ${town}; unknown values will use a factor of 1.`);
    }
    if (!t.ageF3.length) block(SHEET.age, `${town} has no age bands. Add at least one (leave "Up to age" empty for the oldest band).`);
    else if (t.ageF3[t.ageF3.length - 1].maxAge !== null) warn(SHEET.age, n, `${town} has no open-ended oldest band; buildings older than the last band use that band.`);
    if (t.status === 'approved') {
      if (t.taxRatePct === null) block(SHEET.general, 'An approved table needs a tax rate %.');
      if (!t.bylaw?.notificationNo) warn(SHEET.general, n, 'Approved without a notification number. Record the notification so the table can be traced.');
    }
    if (!blocked) { const msg = validateRateTable(t); if (msg) block(SHEET.general, msg); }
    if (!blocked) config.bylaws[town] = t;
  }
}

// ---------- the live state, in the same shape, for diffing and for the download ----------
export interface TownState {
  slug: string; name: string; active: boolean; heads: HeadId[];
  rates: Partial<Record<HeadId, { residential: number | null; commercial: number | null; frequency: 'yearly' | 'monthly' }>>;
  rules: Partial<Record<HeadId, CollectionSettings>>;
  bylaw: RateTable | null;
}

export interface Change { town: string; area: string; label: string; before: string; after: string }

const money = (n: number | null) => (n === null ? 'not set' : `₹${n}`);
const same = (a: unknown, b: unknown) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sortKeys(x)]));
  return v;
}
/** Comparable view of a rate table: drops the fields the app stamps itself. */
const tableCore = (t: RateTable) => ({ ...t, town: undefined, id: undefined, note: t.note || '', bylaw: { title: '', authority: '', notificationNo: '', notificationDate: '', notes: '', ...(t.bylaw || {}) }, clauses: t.clauses || {}, adjustments: t.adjustments || [] });
const settingsCore = (s: CollectionSettings) => ({ ...placeholderSettings(), ...s, clauses: s.clauses || {} });

/** What an upload would change for each town. Rows that equal the live value produce no change. */
export function diffConfig(cfg: ParsedConfig, current: Record<string, TownState>): Change[] {
  const out: Change[] = [];
  for (const t of cfg.towns) {
    const cur = current[t.town]; if (!cur) continue;
    if (t.active !== undefined && t.active !== cur.active) out.push({ town: t.town, area: 'Town', label: 'Active', before: cur.active ? 'Yes' : 'No', after: t.active ? 'Yes' : 'No' });
    if (t.heads && !same([...t.heads].sort(), [...cur.heads].sort())) {
      const lost = cur.heads.filter((h) => !t.heads!.includes(h));
      out.push({ town: t.town, area: 'Town', label: 'Bill heads', before: cur.heads.map((h) => HEAD_LABELS[h]).join(', '), after: t.heads.map((h) => HEAD_LABELS[h]).join(', ') + (lost.length ? `  (hides ${lost.map((h) => HEAD_LABELS[h]).join(', ')}; existing entries stay)` : '') });
    }
  }
  for (const r of cfg.rates) {
    const cur = current[r.town]?.rates[r.head] ?? { residential: null, commercial: null, frequency: 'yearly' as const };
    const next = { residential: r.residential, commercial: r.commercial, frequency: r.frequency };
    if (same(cur, next)) continue;
    out.push({ town: r.town, area: 'Rates', label: HEAD_LABELS[r.head], before: `Res ${money(cur.residential)} · Com ${money(cur.commercial)} · ${cur.frequency}`, after: `Res ${money(r.residential)} · Com ${money(r.commercial)} · ${r.frequency}` });
  }
  const sum = (s: CollectionSettings) => `${s.status} · due ${s.dueDay} ${MONTHS[s.dueMonth - 1]} · interest ${s.interestPctPerMonth === null ? 'not set' : s.interestPctPerMonth + '%/month'} · grace ${s.interestGraceDays}d · rebate ${s.rebatePct}% till ${s.rebateDay} ${MONTHS[s.rebateMonth - 1]}`;
  for (const r of cfg.rules) {
    const cur = settingsCore(current[r.town]?.rules[r.head] ?? placeholderSettings());
    if (same(cur, settingsCore(r.settings))) continue;
    out.push({ town: r.town, area: 'Rules', label: HEAD_LABELS[r.head], before: sum(cur), after: sum(r.settings) });
  }
  for (const [town, t] of Object.entries(cfg.bylaws)) {
    const saved = current[town]?.bylaw;
    const cur = saved ?? placeholderRateTable(town); // the app shows this table until one is saved, so matching it is no change
    if (same(tableCore(cur), tableCore(t))) continue;
    out.push({ town, area: 'Bye-laws', label: 'Property tax rate table', before: saved ? `${saved.status}, from ${saved.effectiveFrom}, tax ${saved.taxRatePct ?? 'not set'}%` : 'none saved (provisional default in use)', after: `${t.status}, from ${t.effectiveFrom}, tax ${t.taxRatePct ?? 'not set'}%` });
  }
  return out;
}

/** Database writes for ONE town (multi-path update). Only differing areas are included. */
export interface TownWrites { town: string; updates: Record<string, unknown>; changes: Change[] }
export function planWrites(cfg: ParsedConfig, current: Record<string, TownState>, uid: string, now: number): TownWrites[] {
  const changes = diffConfig(cfg, current);
  const byTown = new Map<string, TownWrites>();
  const bucket = (town: string) => { let b = byTown.get(town); if (!b) { b = { town, updates: {}, changes: [] }; byTown.set(town, b); } return b; };
  for (const c of changes) bucket(c.town).changes.push(c);
  const changed = (town: string, area: string, label?: string) => changes.some((c) => c.town === town && c.area === area && (!label || c.label === label));
  for (const t of cfg.towns) {
    if (t.active !== undefined && changed(t.town, 'Town', 'Active')) bucket(t.town).updates[`ulbs/${t.town}/active`] = t.active;
    if (t.heads && changed(t.town, 'Town', 'Bill heads')) bucket(t.town).updates[`ulbs/${t.town}/heads`] = Object.fromEntries(t.heads.map((h) => [h, HEAD_LABELS[h]]));
  }
  for (const r of cfg.rates) {
    if (!changed(r.town, 'Rates', HEAD_LABELS[r.head])) continue;
    bucket(r.town).updates[`payableRates/${r.town}/${r.head}`] = { residential: r.residential, commercial: r.commercial, frequency: r.frequency, updatedAt: now, updatedBy: uid };
  }
  for (const r of cfg.rules) {
    if (!changed(r.town, 'Rules', HEAD_LABELS[r.head])) continue;
    const path = r.head === 'property_tax' ? `collectionSettings/${r.town}` : `headSettings/${r.town}/${r.head}`;
    bucket(r.town).updates[path] = JSON.parse(JSON.stringify(r.settings));
  }
  for (const [town, t] of Object.entries(cfg.bylaws)) {
    if (!changed(town, 'Bye-laws')) continue;
    bucket(town).updates[`rateTables/${town}`] = JSON.parse(JSON.stringify({ ...t, town, id: t.effectiveFrom }));
  }
  return [...byTown.values()];
}

/** The ledger key a correction is written under, and its fixed entry id (so a second upload cannot post it again). */
export const correctionEntryId = (id: string) => `adj_${id}`;
