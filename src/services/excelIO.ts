// Reads and writes the configuration workbook. The Excel library is large, so it is loaded only when this runs.
import type { Cell as XCell, Workbook } from 'exceljs';
import { placeholderRateTable } from './assessment';
import {
  BASE_CHOICES, CHARGED_CHOICES, COLUMNS, FACTOR_NAMES, HEAD_IDS, HEAD_LABELS, KIND_CHOICES, MONTHS, SHEET, STATUS_CHOICES,
  Cell, Row, Sheets, TownState,
} from './excelConfig';

const loadLib = async () => (await import('exceljs')).default;

/** A cell's value as plain text or number, whatever Excel stored (formula, rich text, date, link). */
export function cellValue(v: unknown): Cell {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('result' in o) return cellValue(o.result);                       // formula
    if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((t) => t.text).join('');
    if ('text' in o) return cellValue(o.text);                           // hyperlink
    if ('error' in o) return null;
  }
  return null;
}

const HEADER_FILL = 'FF1F3A93';
const NOTE_FILL = 'FFFFF4CC';
const INPUT_FILL = 'FFF3F6FF';

const LISTS = {
  towns: 'A', yesNo: 'B', heads: 'C', months: 'D', charged: 'E', status: 'F', base: 'G', kind: 'H', factors: 'I',
} as const;
const MAX_ROWS = 1000;

export interface BuildInput { towns: TownState[]; today: string }

export async function buildWorkbook(input: BuildInput): Promise<ArrayBuffer> {
  const ExcelJS = await loadLib();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Scheme Hub'; wb.created = new Date();

  addInstructions(wb, input);
  const sheets: Record<string, ReturnType<Workbook['addWorksheet']>> = {};
  for (const name of Object.values(SHEET)) {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.addRow(COLUMNS[name]);
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    head.alignment = { vertical: 'middle', wrapText: true };
    head.height = 32;
    COLUMNS[name].forEach((c, i) => { ws.getColumn(i + 1).width = Math.max(14, Math.min(34, c.length + 6)); });
    sheets[name] = ws;
  }
  const lists = wb.addWorksheet('Lists', { state: 'hidden' });
  const col = (letter: string, title: string, values: string[]) => { lists.getCell(`${letter}1`).value = title; values.forEach((v, i) => { lists.getCell(`${letter}${i + 2}`).value = v; }); };
  col(LISTS.towns, 'Towns', input.towns.map((t) => t.slug));
  col(LISTS.yesNo, 'Yes/No', ['Yes', 'No']);
  col(LISTS.heads, 'Bill heads', HEAD_IDS.map((h) => HEAD_LABELS[h]));
  col(LISTS.months, 'Months', MONTHS);
  col(LISTS.charged, 'Charged', [...CHARGED_CHOICES]);
  col(LISTS.status, 'Status', [...STATUS_CHOICES]);
  col(LISTS.base, 'Applies to', [...BASE_CHOICES]);
  col(LISTS.kind, 'Kind', [...KIND_CHOICES]);
  col(LISTS.factors, 'Factor', [...FACTOR_NAMES]);

  const range = (letter: string, n: number) => `Lists!$${letter}$2:$${letter}$${n + 1}`;
  const dropdown = (sheet: string, header: string, letter: string, n: number, strict = true) => {
    const ws = sheets[sheet]; const c = COLUMNS[sheet].indexOf(header) + 1;
    for (let r = 2; r <= MAX_ROWS; r++) ws.getCell(r, c).dataValidation = { type: 'list', allowBlank: true, formulae: [range(letter, n)], showErrorMessage: strict, errorStyle: 'stop', errorTitle: header, error: `Pick ${header} from the list.` };
  };
  const nTowns = Math.max(1, input.towns.length);

  // ----- Towns -----
  const S = SHEET;
  for (const t of input.towns) sheets[S.towns].addRow([t.slug, t.active ? 'Yes' : 'No', ...HEAD_IDS.map((h) => (t.heads.includes(h) ? 'Yes' : 'No'))]);
  dropdown(S.towns, 'Town', LISTS.towns, nTowns);
  for (const h of ['Active', ...HEAD_IDS.map((x) => HEAD_LABELS[x])]) dropdown(S.towns, h, LISTS.yesNo, 2);

  // ----- Rates and Rules: one row for every head the town has switched on -----
  for (const t of input.towns) {
    for (const h of HEAD_IDS.filter((x) => t.heads.includes(x))) {
      const r = t.rates[h];
      sheets[S.rates].addRow([t.slug, HEAD_LABELS[h], r?.residential ?? null, r?.commercial ?? null, r?.frequency === 'monthly' ? 'Monthly' : 'Yearly']);
      const s = t.rules[h];
      if (s) sheets[S.rules].addRow([t.slug, HEAD_LABELS[h], s.status === 'approved' ? 'Approved' : 'Placeholder', MONTHS[s.dueMonth - 1], s.dueDay, s.rebatePct, MONTHS[s.rebateMonth - 1], s.rebateDay, s.interestPctPerMonth, s.interestGraceDays, s.notes || null, s.clauses?.due || null, s.clauses?.rebate || null, s.clauses?.interest || null]);
      else sheets[S.rules].addRow([t.slug, HEAD_LABELS[h], 'Placeholder', 'Mar', 31, 0, 'Jun', 30, null, 0, null, null, null, null]);
    }
  }
  for (const sh of [S.rates, S.rules, S.general, S.factors, S.age, S.adjustments, S.corrections]) dropdown(sh, 'Town', LISTS.towns, nTowns);
  for (const sh of [S.rates, S.rules, S.corrections]) dropdown(sh, 'Bill head', LISTS.heads, HEAD_IDS.length);
  dropdown(S.rates, 'Charged', LISTS.charged, 2);
  dropdown(S.rules, 'Status', LISTS.status, 2);
  dropdown(S.rules, 'Due month', LISTS.months, 12); dropdown(S.rules, 'Rebate last month', LISTS.months, 12);
  for (const c of ['Residential amount', 'Commercial amount']) numberRule(sheets[S.rates], COLUMNS[S.rates].indexOf(c) + 1, 0, 100000000, 'a rupee amount, 0 or more');
  numberRule(sheets[S.rules], COLUMNS[S.rules].indexOf('Rebate %') + 1, 0, 100, 'a % from 0 to 100');
  numberRule(sheets[S.rules], COLUMNS[S.rules].indexOf('Interest % per month') + 1, 0, 100, 'a % from 0 to 100');

  // ----- Bye-laws (property tax) -----
  for (const t of input.towns) {
    const b = t.bylaw ?? placeholderRateTable(t.slug);
    const bl = b.bylaw; const cl = b.clauses || {};
    sheets[S.general].addRow([t.slug, b.effectiveFrom, b.status === 'approved' ? 'Approved' : 'Placeholder', b.rebatePct, b.taxRatePct, bl?.title || null, bl?.authority || null, bl?.notificationNo || null, bl?.notificationDate || null, bl?.notes || null, b.note || null, cl.F1 || null, cl.F2 || null, cl.F3 || null, cl.F4 || null, cl.F5 || null, cl.Class || null, cl.Rebate || null, cl.TaxRate || null]);
    const fac = (title: string, m: Record<string, number>) => Object.entries(m).forEach(([k, v]) => sheets[S.factors].addRow([t.slug, title, k, v]));
    fac(FACTOR_NAMES[0], b.zoneF1); fac(FACTOR_NAMES[1], b.structureF2); fac(FACTOR_NAMES[2], b.occupancyF4); fac(FACTOR_NAMES[3], b.useF5); fac(FACTOR_NAMES[4], b.classFactor);
    for (const a of b.ageF3) sheets[S.age].addRow([t.slug, a.maxAge, a.factor]);
    for (const a of b.adjustments || []) sheets[S.adjustments].addRow([t.slug, a.name, a.clause || null, a.base === 'tax' ? 'Tax' : 'Rateable value', a.kind === 'flat' ? 'Flat amount' : 'Percent', a.value, a.appliesToUse || null]);
  }
  dropdown(S.general, 'Status', LISTS.status, 2);
  dropdown(S.factors, 'Factor', LISTS.factors, FACTOR_NAMES.length);
  dropdown(S.adjustments, 'Applies to', LISTS.base, 2); dropdown(S.adjustments, 'Kind', LISTS.kind, 2);

  // ----- Corrections: empty on purpose, so an old download cannot re-post anything -----
  numberRule(sheets[S.corrections], COLUMNS[S.corrections].indexOf('Amount') + 1, -100000000, 100000000, 'a non-zero amount (− reduces the bill)');

  // text format for ids, periods and dates so Excel does not turn 2026-27 into a date
  const textCols: [string, string[]][] = [[S.general, ['Effective from', 'Notification date']], [S.corrections, ['Correction ID', 'Property ID', 'Period', 'Date']]];
  for (const [sh, cols] of textCols) for (const c of cols) sheets[sh].getColumn(COLUMNS[sh].indexOf(c) + 1).numFmt = '@';
  for (const sh of Object.values(S)) sheets[sh].eachRow((row, n) => { if (n > 1) row.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_FILL } }; }); });

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

function numberRule(ws: ReturnType<Workbook['addWorksheet']>, col: number, min: number, max: number, what: string) {
  for (let r = 2; r <= MAX_ROWS; r++) ws.getCell(r, col).dataValidation = { type: 'decimal', operator: 'between', allowBlank: true, formulae: [min, max], showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Number needed', error: `Enter ${what}.` };
}

function addInstructions(wb: Workbook, input: BuildInput) {
  const ws = wb.addWorksheet('Instructions', { properties: { tabColor: { argb: 'FFFFB020' } } });
  ws.getColumn(1).width = 110;
  const lines: [string, boolean][] = [
    ['Scheme Hub — town configuration workbook', true],
    [`Downloaded ${input.today}. It holds the live settings of ${input.towns.length} town(s). Edit, save, then upload it on the "Excel settings" page. The website updates as soon as you apply it.`, false],
    ['', false],
    ['HOW AN UPLOAD WORKS', true],
    ['• A row that is present SETS that value. A town or bill head with no row is left untouched. Leaving a row out never deletes anything.', false],
    ['• The whole file is checked first. If any row has a problem, nothing is applied and every problem is listed with its sheet and row number.', false],
    ['• You see a before / after list of every change, and confirm it, before anything is written. Unchanged rows are skipped.', false],
    ['• You can only change the town you are the admin of. Only the platform owner can change the Towns sheet.', false],
    ['• Every applied change is recorded in the audit trail.', false],
    ['', false],
    ['SHEETS', true],
    ['Towns — Active (Yes/No) and which bill heads each ULB has. Platform owner only. Property tax is always on. Hiding a head never deletes its entries.', false],
    ['Rates — fixed amounts a customer pays, per town and bill head: Residential, Commercial, and whether charged Yearly or Monthly (property tax is always yearly). Empty = not set.', false],
    ['Rules — Status, due date (month + day), rebate % and its last date, interest % per month, grace days, notes and bye-law clause for each town and head. Empty interest = no interest charged.', false],
    ['Bylaw_General — one row per town: effective date, Status, rebate %, tax rate %, notification details and clause references. A town\'s bye-law table is REPLACED as a whole when it has a row here.', false],
    ['Bylaw_Factors — Factor / Key / Value rows (zone, structure, occupancy, use, class). Use the key "default" for the fallback value.', false],
    ['Bylaw_Age — age bands: "Up to age (years)" and its factor. Leave the age empty for the oldest band (older than all others).', false],
    ['Bylaw_Adjustments — extra surcharges, deductions or flat charges: Applies to (Rateable value or Tax), Kind (Percent or Flat amount), Value (negative = deduction), optional use.', false],
    ['Corrections — a +/- change to one property\'s bill for one period. Needs a Correction ID, the exact Property ID, period (2026-27, or 2026-10 for monthly bills), amount, date and reason.', false],
    ['', false],
    ['CORRECTIONS ARE PERMANENT', true],
    ['• The ledger is append-only. A correction is added as a new entry; it is never edited. To undo one, post an opposite correction (or use Bill removal in the app).', false],
    ['• The Correction ID makes the upload safe to repeat: an ID that is already posted is skipped, never posted twice. Use a new ID for every new correction.', false],
    ['• A correction is rejected if that property has no bill for that period yet.', false],
    ['• The Corrections sheet downloads empty on purpose. Add only the new corrections you want posted.', false],
    ['', false],
    ['STATUS', true],
    ['• "Placeholder" values are for testing: assessments cannot be approved and interest is not charged on them. Set "Approved" only for values that come from the notified bye-laws, and fill the clause / notification columns.', false],
  ];
  lines.forEach(([t, bold], i) => {
    const c = ws.getCell(i + 1, 1);
    c.value = t; c.alignment = { wrapText: true, vertical: 'top' };
    if (bold) { c.font = { bold: true, size: i === 0 ? 14 : 11 }; if (i > 0) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NOTE_FILL } }; }
  });
}

/** All data sheets of an uploaded workbook as rows keyed by their header text. Sheets that are missing are simply empty. */
export async function readWorkbook(buf: ArrayBuffer): Promise<{ sheets: Sheets; missing: string[] }> {
  const ExcelJS = await loadLib();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const sheets: Sheets = {}; const missing: string[] = [];
  for (const name of Object.values(SHEET)) {
    const ws = wb.worksheets.find((w) => w.name.toLowerCase() === name.toLowerCase());
    if (!ws) { missing.push(name); sheets[name] = []; continue; }
    const headers: string[] = [];
    ws.getRow(1).eachCell({ includeEmpty: false }, (c: XCell, col: number) => { headers[col] = String(cellValue(c.value) ?? '').trim(); });
    const rows: Row[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const row: Row = {}; let any = false;
      headers.forEach((h, col) => { if (!h) return; const v = cellValue(ws.getRow(r).getCell(col).value); row[h] = v; if (v !== null && String(v).trim() !== '') any = true; });
      rows.push(any ? row : {}); // keep blank rows as blanks so row numbers still match Excel
    }
    while (rows.length && !Object.keys(rows[rows.length - 1]).length) rows.pop(); // the drop-down ranges make Excel report 1000 rows
    sheets[name] = rows;
  }
  return { sheets, missing };
}
