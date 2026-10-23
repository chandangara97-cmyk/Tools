// Excel settings workbook: build, read back, validate, diff. Run: npm run test:excel
import { buildWorkbook, readWorkbook, cellValue } from '../src/services/excelIO';
import { COLUMNS, HEAD_IDS, SHEET, Sheets, Row, TownState, parseConfig, diffConfig, planWrites, ParseContext, correctionEntryId } from '../src/services/excelConfig';
import { HEAD_LIST } from '../src/services/heads';
import { placeholderSettings } from '../src/services/collection';
import { nerwaDefaultRateTable, placeholderRateTable } from '../src/services/assessment';

let fails = 0;
const ok = (c: boolean, m: string) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };

ok(JSON.stringify(HEAD_IDS) === JSON.stringify(HEAD_LIST.map((h) => h.id)), 'head list matches the app');

const approved = { ...placeholderSettings(), status: 'approved' as const, dueMonth: 9, dueDay: 30, interestPctPerMonth: 1.5, interestGraceDays: 15, rebatePct: 5, rebateMonth: 6, rebateDay: 30, notes: 'Per bye-law 12', clauses: { due: 'cl. 5', interest: 'cl. 9' } };
const states: Record<string, TownState> = {
  Nerwa: { slug: 'Nerwa', name: 'Nerwa', active: true, heads: ['property_tax', 'water', 'garbage'],
    rates: { property_tax: { residential: 1200, commercial: 3000, frequency: 'yearly' }, water: { residential: 50.5, commercial: 120, frequency: 'monthly' } },
    rules: { property_tax: approved, water: placeholderSettings() }, bylaw: { ...nerwaDefaultRateTable(), adjustments: [{ name: 'Green cess', base: 'tax', kind: 'percent', value: 2, clause: '14(b)' }, { name: 'Hill deduction', base: 'rateable', kind: 'percent', value: -5, appliesToUse: 'Residential' }] } },
  Bhota: { slug: 'Bhota', name: 'Bhota', active: true, heads: ['property_tax', 'water', 'garbage', 'sewerage', 'other'], rates: {}, rules: {}, bylaw: null },
};
const towns = Object.values(states).map((t) => ({ slug: t.slug, name: t.name }));
const SUPER: ParseContext = { towns, canManageTowns: true, canWriteTown: () => true };
const NERWA_ADMIN: ParseContext = { towns: [towns[0]], canManageTowns: false, canWriteTown: (s) => s === 'Nerwa' };

const rt = async (edit?: (s: Sheets) => void) => {
  const buf = await buildWorkbook({ towns: Object.values(states), today: '2026-10-23' });
  const { sheets, missing } = await readWorkbook(buf);
  if (edit) edit(sheets);
  return { sheets, missing };
};
const find = (s: Sheets, sheet: string, pred: (r: Row) => boolean) => s[sheet].find(pred) as Row;
const msgs = (r: ReturnType<typeof parseConfig>, level: 'error' | 'warn' = 'error') => r.issues.filter((i) => i.level === level).map((i) => `${i.sheet}:${i.row} ${i.message}`);

(async () => {
  // ---- round trip: download then upload with no edit changes nothing ----
  const base = await rt();
  ok(base.missing.length === 0, 'all data sheets are in the downloaded workbook');
  const r0 = parseConfig(base.sheets, SUPER);
  ok(r0.errorCount === 0, 'unedited download has no errors: ' + msgs(r0).join(' | '));
  const d0 = diffConfig(r0.config, states);
  ok(d0.length === 0, 'unedited download produces zero changes: ' + JSON.stringify(d0.map((c) => c.town + c.area + c.label)));
  ok(Object.keys(r0.config.bylaws).length === 2, 'both towns have a bye-law table');
  ok(JSON.stringify(Object.keys(r0.config.bylaws.Bhota.zoneF1)) === JSON.stringify(Object.keys(placeholderRateTable('Bhota').zoneF1)), 'town without a saved table exports the placeholder');
  ok(r0.config.bylaws.Nerwa.adjustments?.length === 2 && r0.config.bylaws.Nerwa.adjustments[1].appliesToUse === 'Residential', 'adjustments survive the round trip');
  ok(r0.config.rates.find((r) => r.town === 'Nerwa' && r.head === 'water')?.residential === 50.5, 'decimal amount survives');
  ok(planWrites(r0.config, states, 'u1', 1).every((p) => !Object.keys(p.updates).length), 'no writes planned for an unedited file');

  // ---- edits become exactly the expected writes ----
  const e1 = await rt((s) => {
    find(s, SHEET.rates, (r) => r.Town === 'Nerwa' && r['Bill head'] === 'Property tax')['Residential amount'] = 1500;
    find(s, SHEET.rules, (r) => r.Town === 'Nerwa' && r['Bill head'] === 'Property tax')['Interest % per month'] = '2';
    find(s, SHEET.general, (r) => r.Town === 'Nerwa')['Tax rate %'] = 12;
    s[SHEET.corrections].push({ 'Correction ID': 'C-1', Town: 'Nerwa', 'Bill head': 'Water', 'Property ID': 'P-0001', Period: '2026-27', Amount: -250, Date: '2026-10-20', Reason: 'Meter fault' });
    find(s, SHEET.towns, (r) => r.Town === 'Bhota')['Sewerage'] = 'No';
  });
  const p1 = parseConfig(e1.sheets, SUPER);
  ok(p1.errorCount === 0, 'edited file valid: ' + msgs(p1).join(' | '));
  const c1 = diffConfig(p1.config, states);
  ok(c1.length === 4, `4 changes (rate, rule, bye-law, heads), got ${c1.length}: ${c1.map((c) => c.area + '/' + c.label).join(', ')}`);
  const w1 = planWrites(p1.config, states, 'u1', 99);
  const nerwa = w1.find((w) => w.town === 'Nerwa')!;
  ok(JSON.stringify(Object.keys(nerwa.updates).sort()) === JSON.stringify(['collectionSettings/Nerwa', 'payableRates/Nerwa/property_tax', 'rateTables/Nerwa']), 'Nerwa writes the three changed nodes only: ' + Object.keys(nerwa.updates));
  const pr = nerwa.updates['payableRates/Nerwa/property_tax'] as Record<string, unknown>;
  ok(pr.residential === 1500 && pr.commercial === 3000 && pr.updatedBy === 'u1' && pr.updatedAt === 99 && pr.frequency === 'yearly', 'payable rate carries who/when');
  ok((nerwa.updates['collectionSettings/Nerwa'] as { interestPctPerMonth: number }).interestPctPerMonth === 2, 'interest "2" read as a number');
  ok((nerwa.updates['rateTables/Nerwa'] as { taxRatePct: number; id: string }).taxRatePct === 12, 'bye-law tax rate changed');
  const bhota = w1.find((w) => w.town === 'Bhota')!;
  const heads = bhota.updates['ulbs/Bhota/heads'] as Record<string, string>;
  ok(!('sewerage' in heads) && heads.property_tax === 'Property tax' && Object.keys(heads).length === 4, 'sewerage hidden, others kept');
  ok(p1.config.corrections.length === 1 && p1.config.corrections[0].amount === -250 && correctionEntryId('C-1') === 'adj_C-1', 'correction parsed with fixed entry id');

  // ---- every kind of bad input is caught, with sheet and row ----
  const bad = async (name: string, edit: (s: Sheets) => void, want: RegExp, ctx: ParseContext = SUPER) => {
    const x = await rt(edit); const r = parseConfig(x.sheets, ctx);
    ok(r.errorCount > 0 && msgs(r).some((m) => want.test(m)), `${name}: ${msgs(r).slice(0, 2).join(' | ') || 'NO ERROR'}`);
    return r;
  };
  await bad('unknown town', (s) => { find(s, SHEET.rates, (r) => r.Town === 'Nerwa')['Town'] = 'Atlantis'; }, /not a set-up ULB/);
  await bad('negative amount', (s) => { find(s, SHEET.rates, (r) => r.Town === 'Nerwa' && r['Bill head'] === 'Water')['Commercial amount'] = -5; }, /from 0 upwards/);
  await bad('text amount', (s) => { find(s, SHEET.rates, (r) => r.Town === 'Nerwa' && r['Bill head'] === 'Water')['Commercial amount'] = 'abc'; }, /must be a number/);
  await bad('3 decimals', (s) => { find(s, SHEET.rates, (r) => r.Town === 'Nerwa' && r['Bill head'] === 'Water')['Commercial amount'] = 10.123; }, /2 decimals/);
  await bad('property tax monthly', (s) => { find(s, SHEET.rates, (r) => r.Town === 'Nerwa' && r['Bill head'] === 'Property tax')['Charged'] = 'Monthly'; }, /always charged yearly/);
  await bad('unknown head', (s) => { find(s, SHEET.rates, (r) => r.Town === 'Nerwa' && r['Bill head'] === 'Water')['Bill head'] = 'Electricity'; }, /not one of/);
  await bad('duplicate rate row', (s) => { s[SHEET.rates].push({ ...find(s, SHEET.rates, (r) => r.Town === 'Nerwa' && r['Bill head'] === 'Water') }); }, /appears twice/);
  await bad('bad due month', (s) => { find(s, SHEET.rules, (r) => r.Town === 'Nerwa' && r['Bill head'] === 'Property tax')['Due month'] = 'Smarch'; }, /Due month/);
  await bad('due day 40', (s) => { find(s, SHEET.rules, (r) => r.Town === 'Nerwa' && r['Bill head'] === 'Property tax')['Due day'] = 40; }, /Due date/);
  await bad('rebate 150', (s) => { find(s, SHEET.rules, (r) => r.Town === 'Nerwa' && r['Bill head'] === 'Property tax')['Rebate %'] = 150; }, /Rebate %/);
  await bad('bad status', (s) => { find(s, SHEET.rules, (r) => r.Town === 'Nerwa' && r['Bill head'] === 'Property tax')['Status'] = 'Maybe'; }, /Placeholder or Approved/);
  await bad('bye-law factor negative', (s) => { find(s, SHEET.factors, (r) => r.Town === 'Nerwa' && r.Key === 'RCC')['Value'] = -1; }, /Value must be a number/);
  await bad('bye-law factor key twice', (s) => { s[SHEET.factors].push({ ...find(s, SHEET.factors, (r) => r.Town === 'Nerwa' && r.Key === 'RCC') }); }, /listed twice/);
  await bad('two open age bands', (s) => { s[SHEET.age].push({ Town: 'Nerwa', 'Up to age (years)': null, Factor: 2 }); }, /left open/);
  await bad('fractional age', (s) => { find(s, SHEET.age, (r) => r.Town === 'Nerwa' && r['Up to age (years)'] === 10)['Up to age (years)'] = 10.5; }, /whole number/);
  await bad('approved bye-law with no tax rate', (s) => { const g = find(s, SHEET.general, (r) => r.Town === 'Nerwa'); g.Status = 'Approved'; g['Tax rate %'] = null; }, /needs a tax rate/);
  await bad('bad effective date', (s) => { find(s, SHEET.general, (r) => r.Town === 'Nerwa')['Effective from'] = '31/02/2026'; }, /real date/);
  await bad('adjustment kind', (s) => { find(s, SHEET.adjustments, (r) => r.Name === 'Green cess')['Kind'] = 'Whatever'; }, /Percent/);
  await bad('factors without a general row', (s) => { s[SHEET.general] = s[SHEET.general].filter((r) => r.Town !== 'Nerwa'); }, /no row on Bylaw_General/);
  await bad('deleted column', (s) => { for (const r of s[SHEET.rules]) delete r['Interest % per month']; }, /missing or renamed.*Interest/);
  const corr = (o: Partial<Record<string, string | number>>): Row => ({ 'Correction ID': 'C-9', Town: 'Nerwa', 'Bill head': 'Water', 'Property ID': 'P-1', Period: '2026-27', Amount: 10, Date: '2026-10-20', Reason: 'x', ...o } as Row);
  await bad('correction without id', (s) => { s[SHEET.corrections].push(corr({ 'Correction ID': '' })); }, /Correction ID is empty/);
  await bad('correction id with space', (s) => { s[SHEET.corrections].push(corr({ 'Correction ID': 'C 9' })); }, /letters, digits/);
  await bad('correction id twice', (s) => { s[SHEET.corrections].push(corr({}), corr({})); }, /used twice/);
  await bad('correction zero', (s) => { s[SHEET.corrections].push(corr({ Amount: 0 })); }, /non-zero/);
  await bad('correction no reason', (s) => { s[SHEET.corrections].push(corr({ Reason: ' ' })); }, /Reason is required/);
  await bad('correction bad period', (s) => { s[SHEET.corrections].push(corr({ Period: '2026' })); }, /Period must be/);
  await bad('correction period 2026-28', (s) => { s[SHEET.corrections].push(corr({ Period: '2026-28' })); }, /Period must be/);
  await bad('correction bad date', (s) => { s[SHEET.corrections].push(corr({ Date: 'yesterday' })); }, /real date/);
  await bad('correction unsafe property id', (s) => { s[SHEET.corrections].push(corr({ 'Property ID': 'a/b' })); }, /Property ID has/);
  const okc = parseConfig((await rt((s) => { s[SHEET.corrections].push(corr({ Period: '2026-10', Date: '31/03/2027', Amount: '₹1,250.50' })); })).sheets, SUPER);
  ok(okc.errorCount === 0 && okc.config.corrections[0].amount === 1250.5 && okc.config.corrections[0].date === '2027-03-31' && okc.config.corrections[0].period === '2026-10', 'month period, DD/MM/YYYY date and ₹1,250.50 are accepted');

  // ---- who may change what ----
  const ta = parseConfig(base.sheets, NERWA_ADMIN);
  ok(ta.errorCount > 0 && msgs(ta).every((m) => /Bhota|Only the platform owner/.test(m)), 'town admin: file with other towns is refused, only for the other towns and the Towns sheet: ' + msgs(ta).slice(0, 2).join(' | '));
  const ta2 = await rt((s) => { for (const k of Object.keys(s)) s[k] = s[k].filter((r) => !r.Town || r.Town === 'Nerwa'); s[SHEET.towns] = []; });
  const ta3 = parseConfig(ta2.sheets, NERWA_ADMIN);
  ok(ta3.errorCount === 0 && diffConfig(ta3.config, states).length === 0, 'town admin: own town only is fine and unchanged: ' + msgs(ta3).join(' | '));
  const ta4 = parseConfig((await rt((s) => { find(s, SHEET.towns, (r) => r.Town === 'Nerwa')['Active'] = 'No'; })).sheets, NERWA_ADMIN);
  ok(msgs(ta4).some((m) => /Only the platform owner/.test(m)), 'town admin cannot switch a town off');
  const ta5 = parseConfig((await rt((s) => { find(s, SHEET.rates, (r) => r.Town === 'Bhota' && r['Bill head'] === 'Water'); s[SHEET.rates].push({ Town: 'Bhota', 'Bill head': 'Water', 'Residential amount': 10, 'Commercial amount': 20, Charged: 'Yearly' }); })).sheets, { ...NERWA_ADMIN, towns });
  ok(msgs(ta5).some((m) => /not the admin of Bhota/.test(m)), 'town admin cannot change another town\'s rates');

  // ---- upload tolerance ----
  const t1 = parseConfig((await rt((s) => { find(s, SHEET.rates, (r) => r.Town === 'Nerwa' && r['Bill head'] === 'Water')['Town'] = 'nerwa'; find(s, SHEET.rates, (r) => r.Town === 'Nerwa' && r['Bill head'] === 'Property tax')['Bill head'] = 'property_tax'; })).sheets, SUPER);
  ok(t1.errorCount === 0, 'town and head are matched without regard to case or id form: ' + msgs(t1).join(' | '));
  const partial = parseConfig({ [SHEET.rates]: [{ ...COLUMNS[SHEET.rates].reduce((a, c) => ({ ...a, [c]: null }), {}), Town: 'Bhota', 'Bill head': 'Water', 'Residential amount': 30, 'Commercial amount': 60, Charged: 'Monthly' } as Row] }, SUPER);
  ok(partial.errorCount === 0 && diffConfig(partial.config, states).length === 1, 'a file with only one sheet is fine');
  ok(cellValue({ formula: 'A1', result: 7 }) === 7 && cellValue({ richText: [{ text: 'a' }, { text: 'b' }] }) === 'ab' && cellValue(new Date(Date.UTC(2026, 3, 1))) === '2026-04-01' && cellValue({ text: 'x', hyperlink: 'y' }) === 'x', 'formula, rich text, date and link cells read cleanly');

  console.log(fails ? `\n${fails} FAILED` : '\nall excel tests passed');
  process.exit(fails ? 1 : 0);
})();
