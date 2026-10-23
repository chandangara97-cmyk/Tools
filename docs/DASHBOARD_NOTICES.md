# Funds dashboard and dues notices

## Funds dashboard (`dashboard` tab)
- Admin, platform owner and cashier **land on it right after sign-in**. Everyone else keeps the menu.
- Live from the ledgers of every bill head (property tax, water, garbage, sewerage, other): KPI cards,
  pie charts (pending by bill, collected by payment mode), bar charts (demand / collected / pending by bill,
  last 6 months of collections, ward-wise pending), recovery by bill and the 5 largest dues.
- Code: `src/services/fundStats.ts` (maths), `src/components/charts.tsx` (SVG charts), `src/components/FundsDashboard.tsx`.

## Dues notices (`notices` tab, admin / owner / cashier)
- One notice per property lists **all** pending bills of that structure. Filters: bills, ward, minimum due,
  overdue only, only owners with a mobile number, "pay within N days", extra message.
- Per owner: WhatsApp, SMS (opens on the device with the text ready) and printable notice.
- Bulk: WhatsApp one by one (queue), print all, download all (HTML), CSV list. Max 200 per print/download.
- Owner mobile numbers are saved at `ownerContacts/<town>/<propertyId>` (a mobile already entered on a unit is used as fallback).
  Each notice is logged at `notices/<town>/<propertyId>` and in the audit trail.
- Code: `src/services/noticeText.ts`, `src/services/noticeStore.ts`, `src/components/NoticesPage.tsx`.

## Database rules
`database.rules.secure.json` has two new blocks (`ownerContacts`, `notices`): readable by the ULB's staff, writable by admin,
cashier and supervisor. If you use the secure rules, publish them: `firebase deploy --only database`.
The demo `database.rules.json` already allows everything (but it **expires on 20 Nov 2026**, see DEMO_MODE.md).

## Tests
`npm run test:funds` (stats and notice text), `npm run test:search` (landing page and tab access).
