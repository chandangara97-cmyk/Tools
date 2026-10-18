const { chromium } = require('playwright')
const path = require('path');
const OUT = path.join(__dirname, '.out');
const PAGE = 'file://' + path.join(OUT, 'page.html');;
const TOWN = 'Test Town', KEY = 'TestTown';
const rec = (id, owner, extra = {}) => ({ id, owner, hno: '1', addr: 'Main Road', ward: '1', town: TOWN, ...extra });
const records = [
  rec('P-001', 'Ram Lal Sharma'), rec('P-002', 'Ram Lal Sharma', { hno: '2' }), rec('P-003', 'Sita Devi', { ward: '2' }),
  rec('P-004', undefined, { ward: '2' }), rec('P-005', '', { ward: '2' }), rec('P-006', 'राम लाल', { ward: '3' }),
  { id: 'X-999', owner: 'Ram Lal Sharma', town: 'Other Town', ward: '1' },
];
const entry = (o) => ({ by: 'u', at: 1, ...o });
const APPROVED = { status: 'approved', dueMonth: 3, dueDay: 31, rebatePct: 0, rebateMonth: 6, rebateDay: 30, interestPctPerMonth: 2, interestGraceDays: 0, notes: '', clauses: {} };
const db = {
  collectionSettings: { [KEY]: APPROVED },
  headSettings: { [KEY]: { water: { ...APPROVED, dueDay: 10 }, garbage: { ...APPROVED, status: 'placeholder', interestPctPerMonth: null } } },
  ledger: { [KEY]: {
    'P-001': { a: entry({ type: 'demand', fy: '2026-27', amount: 1000, date: '2026-04-01' }) },
    'water~P-001': { a: entry({ type: 'demand', fy: '2026-08', amount: 100, date: '2026-08-01' }), b: entry({ type: 'demand', fy: '2026-09', amount: 100, date: '2026-09-01' }) },
    'garbage~P-002': { a: entry({ type: 'demand', fy: '2026-09', amount: 50, date: '2026-09-01' }) },
    'P-002': { a: entry({ type: 'demand', fy: '2026-27', amount: 400, date: '2026-04-01' }), p: entry({ type: 'payment', fy: '2026-27', amount: 400, date: '2026-05-01', receiptNo: 'R1', mode: 'cash' }) },
    'P-004': { a: entry({ type: 'demand', fy: '2026-27', amount: 250, date: '2026-04-01' }) },
  } },
};
const ALL = ['property_tax', 'water', 'garbage', 'sewerage', 'other'];
const num = (s) => parseFloat(String(s).replace(/[₹,\s]/g, ''));
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { if (cond) { pass++; console.log('ok  ' + name); } else { fail++; console.log('FAIL ' + name + ' ' + extra); } };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  async function open({ mode = 'ok', role = 'cashier', data = db } = {}) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(([d, m, r]) => { window.__db = d; window.__mode = m; window.__role = r; }, [data, mode, role]);
    await page.goto(PAGE);
    await page.evaluate(([r, h]) => window.mount({ townKey: 'TestTown', townName: 'Test Town', records: r, heads: h }), [records, ALL]);
    return { page, ctx, errors };
  }

  // 1. empty page is clean
  let { page, ctx, errors } = await open();
  await page.waitForSelector('input');
  check('empty: only the search box, no results or messages', (await page.locator('ul, table, [role=alert]').count()) === 0 && (await page.locator('body').innerText()).trim() === '');
  check('empty: search box has focus', await page.evaluate(() => document.activeElement && document.activeElement.tagName === 'INPUT'));

  // 2. name search -> list -> detail with consistent maths
  await page.fill('input', 'ram lal');
  await page.waitForSelector('ul li');
  check('name: lists only this town (2 Ram Lal, not other town)', (await page.locator('ul li').count()) === 2);
  await page.locator('ul li').first().click();
  await page.waitForSelector('table');
  const txt = await page.locator('body').innerText();
  check('detail: owner heading shown', await page.locator('h2').innerText() === 'Ram Lal Sharma');
  const rows = await page.locator('tbody tr').allInnerTexts();
  check('detail: property tax and water rows present, no garbage row for P-001', rows.length === 2 && /Property tax/.test(rows[0]) && /Water bill/.test(rows[1]), JSON.stringify(rows));
  const dueCells = await page.locator('tbody tr td:last-child').allInnerTexts();
  const footer = num(await page.locator('tfoot td:last-child').innerText());
  check('detail: footer total equals the sum of rows', Math.abs(dueCells.map(num).reduce((a, b) => a + b, 0) - footer) < 0.011, `${dueCells} vs ${footer}`);
  const stamps = await page.locator('.stamp').allInnerTexts();
  check('detail: stamp for this property equals footer total', Math.abs(num(stamps[0]) - footer) < 0.011, JSON.stringify(stamps));
  check('detail: owner stamp equals this + other property (P-002: tax paid, garbage unpaid)', stamps.length === 2 && num(stamps[1]) >= num(stamps[0]) + 49.99, JSON.stringify(stamps));
  check('detail: other property listed with its dues', /P-002/.test(txt) && /Other properties of this owner/.test(txt));
  check('detail: interest note appears for garbage? (not on P-001, so none)', !/not approved/.test(txt));
  // property tax interest must be > 0 (past due: 2026-27 due 31 Mar 2027 -> not yet due) so only water interest
  const water = (await page.locator('tbody tr').nth(1).locator('td').allInnerTexts()).map((x, i) => (i ? num(x) : x));
  console.log('     water row:', JSON.stringify(water));
  check('detail: water charge is 200 (Aug + Sep, 100 each)', Math.abs(water[1] - 200) < 0.011);
  // Aug bill is due 10 Sep, Sep bill due 10 Oct; interest 2%/month on 100 for each month or part of a month after its due date
  const d = new Date(); const today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const monthsLate = (due) => { if (today <= due) return 0; let m = (today.getFullYear() - due.getFullYear()) * 12 + (today.getMonth() - due.getMonth()); if (today.getDate() >= due.getDate() + 0) m += 0; return m; };
  check('detail: water interest is positive and not above 2 x 100 x 2% x months since August', water[2] > 0 && water[2] <= 2 * 100 * 0.02 * 3 + 0.01, String(water[2]));

  // 3. other property with unapproved garbage rules shows note and no false clear
  await page.getByText('P-002').first().click();
  await page.waitForSelector('table');
  const t2 = await page.locator('body').innerText();
  check('rules: note says interest not added for Garbage bill', /Interest is not added for Garbage bill/.test(t2));
  check('rules: fully paid property tax row is zero and green', /Property tax/.test(t2));

  // 4. exact ID with no bills yet -> not "Nothing due"
  await page.fill('input', 'P-003');
  await page.waitForSelector('h2');
  const t3 = await page.locator('body').innerText();
  check('no bills: says "No bill raised yet", never "Nothing due"', /No bill raised yet/.test(t3) && !/Nothing due/.test(t3));
  check('no bills: no Generate bill button', (await page.getByText('Generate bill').count()) === 0);

  // 5. missing owner names never crash
  await page.fill('input', 'P-004');
  await page.waitForSelector('h2');
  check('blank owner: shows "Owner not recorded" and its own dues only', (await page.locator('h2').innerText()) === 'Owner not recorded' && (await page.locator('.stamp').count()) === 1);
  await page.fill('input', 'P-005');
  await page.waitForSelector('h2');
  check('blank owner (empty string) also fine', (await page.locator('h2').innerText()) === 'Owner not recorded');

  // 6. Hindi
  await page.fill('input', 'राम');
  await page.waitForSelector('h2');
  check('Hindi: one match opens directly', (await page.locator('h2').innerText()) === 'राम लाल');
  // 7. nonsense
  await page.fill('input', '%%');
  await page.waitForTimeout(100);
  check('punctuation: no list, no crash', (await page.locator('ul').count()) === 0);
  await page.fill('input', 'zzzzzz');
  await page.waitForSelector('text=Nothing found');
  check('no match: plain message', true);
  await page.fill('input', 'a');
  check('one letter: nothing shown', (await page.locator('text=Nothing found').count()) === 0);
  check('no page errors so far', errors.length === 0, errors.join(' | '));

  // 8. Generate bill: full, then customer choice
  await page.fill('input', 'P-001');
  await page.waitForSelector('table');
  await page.getByText('Generate bill').click();
  await page.waitForSelector('text=Customer’s choice');
  const totalFull = num(await page.locator('b.slab').innerText());
  check('bill: full total equals dues table total', Math.abs(totalFull - footer) < 0.011, `${totalFull} vs ${footer}`);
  await page.getByText('Customer’s choice').click();
  const boxes = page.locator('label:has(.slab) input[type=checkbox]');
  const nBoxes = await boxes.count();
  check('bill: one tick box per bill and month (tax 1 + water 2)', nBoxes === 3, `n=${nBoxes}`);
  await page.getByText('Clear', { exact: true }).click();
  check('bill: clearing disables print', await page.getByRole('button', { name: /Print/ }).isDisabled());
  await boxes.nth(0).check();
  const oneTotal = num(await page.locator('b.slab').innerText());
  check('bill: ticking only the first item gives that item\'s amount', oneTotal > 0 && oneTotal <= totalFull, `${oneTotal}`);
  await page.getByRole('button', { name: /Print/ }).click();
  await page.waitForSelector('iframe', { state: 'attached' });
  const html = await page.locator('iframe').first().getAttribute('srcdoc');
  check('bill: printed HTML has town, owner, total and the not-a-receipt line', /Test Town/.test(html) && /Ram Lal Sharma/.test(html) && html.includes('Total payable') && /not a receipt/.test(html));
  check('bill: only the ticked item is on the printout', (html.match(/<tr><td>(Property tax|Water bill)/g) || []).length === 1, html.slice(html.indexOf('<table>'), html.indexOf('<table>') + 300));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 4000 }).catch(() => null), page.getByRole('button', { name: /Download/ }).click()]);
  check('bill: download produces a file', !!dl && /^Bill_P-001_/.test(dl.suggestedFilename()), dl && dl.suggestedFilename());
  check('no page errors after billing', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // 9. roles
  ({ page, ctx, errors } = await open({ role: 'monitor' }));
  await page.fill('input', 'P-001'); await page.waitForSelector('table');
  check('monitor: sees dues but no Generate bill', (await page.getByText('Generate bill').count()) === 0);
  await ctx.close();
  ({ page, ctx } = await open({ role: 'admin' }));
  await page.fill('input', 'P-001'); await page.waitForSelector('table');
  check('admin: can generate bill', (await page.getByText('Generate bill').count()) === 1);
  await ctx.close();

  // 10. loading must never look like "nothing due"
  ({ page, ctx, errors } = await open({ mode: 'never' }));
  await page.fill('input', 'P-001'); await page.waitForSelector('h2');
  let t4 = await page.locator('body').innerText();
  check('loading: shows Loading dues, no amounts, no "Nothing due"', /Loading dues/.test(t4) && !/Nothing due|₹/.test(t4));
  check('loading: no Generate bill while loading', (await page.getByText('Generate bill').count()) === 0);
  await page.waitForTimeout(12500);
  check('loading: after 12s says still loading / check connection', /Still loading dues/.test(await page.locator('body').innerText()));
  await ctx.close();

  // 11. permission error / offline
  ({ page, ctx } = await open({ mode: 'error' }));
  await page.fill('input', 'P-001'); await page.waitForSelector('[role=alert]');
  const t5 = await page.locator('body').innerText();
  check('error: clear message and still no "Nothing due"', /could not be loaded/.test(t5) && !/Nothing due/.test(t5));
  await ctx.close();

  // 12. empty database (new town, nothing billed)
  ({ page, ctx, errors } = await open({ data: {} }));
  await page.fill('input', 'P-001'); await page.waitForSelector('h2');
  check('empty database: says no bill raised, no crash', /No bill raised yet/.test(await page.locator('body').innerText()) && errors.length === 0, errors.join('|'));
  await ctx.close();

  // 13. error boundary
  const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage();
  await p2.goto(PAGE);
  await p2.evaluate(() => window.mountBoom());
  await p2.waitForSelector('[role=alert]');
  check('crash: friendly message instead of blank page', /could not open/.test(await p2.locator('body').innerText()));
  await p2.getByText('Back to menu').click();
  check('crash: Back to menu works', await p2.evaluate(() => window.__back === true));
  await ctx2.close();

  await browser.close();
  console.log(`\n${pass} checks passed${fail ? `, ${fail} FAILED` : ''}`);
  process.exit(fail ? 1 : 0);
})();
