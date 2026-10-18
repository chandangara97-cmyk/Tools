const { chromium } = require('playwright')
const path = require('path');
const OUT = path.join(__dirname, '.out');
const PAGE = 'file://' + path.join(OUT, 'page.html');;
const TOWN = 'Test Town', KEY = 'TestTown';
const rec = (id, owner, extra = {}) => ({ id, owner, hno: '1', addr: 'Main Road', ward: '1', town: TOWN, usage: 'Residential', ...extra });
const records = [rec('P-001', 'Ram Lal Sharma'), rec('P-002', 'Sita Devi', { usage: 'Commercial' })];
const APPROVED = { status: 'approved', dueMonth: 3, dueDay: 31, rebatePct: 0, rebateMonth: 6, rebateDay: 30, interestPctPerMonth: 2, interestGraceDays: 0, notes: '', clauses: {} };
let pass = 0, fail = 0;
const check = (n, c, x = '') => { c ? (pass++, console.log('ok  ' + n)) : (fail++, console.log('FAIL ' + n + ' ' + x)); };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const open = async (role, db, head, fn = 'mountPanel', props = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } }); const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.addInitScript(([d, r]) => { window.__db = d; window.__role = r; window.__mode = 'ok'; window.confirm = () => true; window.alert = () => {}; }, [db, role]);
    await page.goto(PAGE);
    await page.evaluate(([f, p]) => window[f](p), [fn, fn === 'mountPanel' ? { lockedHead: head, townKey: KEY, townName: TOWN, records, settings: APPROVED, settingsSaved: true, ...props } : props]);
    return { page, ctx, errors };
  };
  const db = { collectionSettings: { [KEY]: APPROVED }, headSettings: { [KEY]: { water: { ...APPROVED, dueDay: 10 } } }, payableRates: { [KEY]: { water: { residential: 120, commercial: 300, frequency: 'monthly', updatedAt: 1, updatedBy: 'a' } } } };

  // admin, monthly water head
  let { page, ctx, errors } = await open('admin', db, 'water');
  await page.waitForSelector('nav button');
  const nav = await page.locator('nav button').allInnerTexts();
  check('admin nav: Overview, Collect payment, Update dues, Due date, Fixed amounts, Audit', ['Overview', 'Collect payment', 'Update dues', 'Due date & interest', 'Fixed amounts', 'Audit trail'].every((t) => nav.includes(t)), JSON.stringify(nav));
  check('monthly head: overview has a month picker, not a year picker', (await page.locator('select[aria-label="Billing month"]').count()) === 1 && (await page.locator('select[aria-label="Financial year"]').count()) === 0);
  check('monthly head: generate button is for the month', /Generate \w{3} \d{4} bills/.test(await page.locator('body').innerText()));
  check('monthly head: due date text for the month', /Due date for \w{3} \d{4}: \d{4}-\d{2}-10/.test(await page.locator('body').innerText()));
  await page.getByRole('button', { name: 'Update dues', exact: true }).click();
  await page.waitForSelector('text=Update dues of Water');
  await page.fill('input[placeholder="Type at least 2 letters"]', 'ram');
  await page.getByText('Ram Lal Sharma').first().click();
  check('update dues: pick property, month input is shown for a monthly head', (await page.locator('input[type=month]').count()) === 1);
  check('update dues: submit disabled until amount and reason', await page.getByRole('button', { name: 'Add to dues' }).isDisabled());
  await page.locator('input[type=number]').fill('75');
  await page.getByPlaceholder('For example: arrears from old register').fill('old arrears');
  check('update dues: submit enabled when complete', await page.getByRole('button', { name: 'Add to dues' }).isEnabled());
  await page.getByRole('button', { name: 'Reduce or waive' }).click();
  check('update dues: button label follows the mode', (await page.getByRole('button', { name: 'Reduce dues' }).count()) === 1);
  await page.getByRole('button', { name: 'Fixed amounts', exact: true }).click();
  await page.waitForSelector('text=Charged every month');
  check('fixed amounts: water shows monthly toggle pressed', (await page.locator('button[aria-pressed=true]', { hasText: 'Charged every month' }).count()) >= 1);
  check('fixed amounts: labels say per month', /per property per month/.test(await page.locator('body').innerText()));
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  check('no page errors (admin, water)', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // yearly property tax head: no month picker, no frequency toggle
  ({ page, ctx, errors } = await open('admin', db, 'property_tax'));
  await page.waitForSelector('nav button');
  check('yearly head: financial year picker, no month picker', (await page.locator('select[aria-label="Financial year"]').count()) === 1 && (await page.locator('select[aria-label="Billing month"]').count()) === 0);
  await page.getByRole('button', { name: 'Fixed amounts', exact: true }).click();
  await page.waitForTimeout(200);
  check('fixed amounts page: monthly option on the 4 utility heads, not on property tax', (await page.getByText('Charged every month').count()) === 4);
  check('no page errors (admin, property tax)', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // cashier: only what a cashier can use
  ({ page, ctx, errors } = await open('cashier', db, 'garbage'));
  await page.waitForSelector('nav button');
  const cn = await page.locator('nav button').allInnerTexts();
  check('cashier nav: Overview and Collect payment only', JSON.stringify(cn) === JSON.stringify(['Overview', 'Collect payment']), JSON.stringify(cn));
  await page.getByRole('button', { name: 'Collect payment' }).click();
  await page.waitForTimeout(200);
  check('no page errors (cashier)', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // menu per role
  const menu = async (role, tabs, bills) => {
    const r = await open(role, db, null, 'mountMenu', { townName: TOWN, tabs, bills });
    await r.page.waitForSelector('h2'); const t = await r.page.locator('body').innerText(); await r.ctx.close(); return { t, e: r.errors };
  };
  let m = await menu('cashier', ['search', 'collection'], ['property_tax', 'water', 'garbage']);
  check('cashier menu: Search dues + 3 bill buttons, nothing else', /Search dues/.test(m.t) && /Property tax/.test(m.t) && /Water bill/.test(m.t) && /Garbage bill/.test(m.t) && !/Property survey|Assessment|GIS exports|Ward map/.test(m.t) && m.e.length === 0, m.t.replace(/\n/g, ' | '));
  m = await menu('surveyor', ['survey', 'records'], ['property_tax']);
  check('collector menu: survey and records only', /Property survey/.test(m.t) && /Property records/.test(m.t) && !/Search dues|Garbage|Collect bills/.test(m.t), m.t.replace(/\n/g, ' | '));
  m = await menu('monitor', ['search', 'reports', 'collection'], ['property_tax', 'water']);
  check('monitor menu: search, reports and bills', /Search dues/.test(m.t) && /Reports & notices/.test(m.t) && /Water bill/.test(m.t));

  await browser.close();
  console.log(`\n${pass} checks passed${fail ? `, ${fail} FAILED` : ''}`);
  process.exit(fail ? 1 : 0);
})();
