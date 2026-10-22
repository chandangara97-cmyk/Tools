# Scheme Hub 2026 (CivicCollect)

Field survey and property-tax system for Himachal Pradesh urban local bodies (ULBs):
GIS property survey, assessment, demand and collection, citizen portal, reports,
and KML/WKT converters.

**Stack:** React 19, TypeScript, Vite 8, Tailwind 4, Firebase (Auth + Realtime Database + Cloud Functions),
Capacitor 8 (Android APK) and PWA. Needs Node 24+.

**Offline-first:** collections, ledgers, assessments and receipts save to local storage first and
sync to Firebase when the network returns (`src/services/offlineData.ts`, `syncQueue.ts`).
Also: UPI QR payment links, WhatsApp demand notices/receipts, 58/80 mm thermal receipts, advance-payment credit.

## Run

```
npm install
npm run dev            # http://localhost:3000
npm run build          # tsc + vite build
npm run test:all       # collection + search + browser tests
```

## Data layout (Realtime Database)

- `properties/{town}/{ward}/{propertyId}` (ward-nested; see `src/services/ids.ts` `wardKey`)
- `photos/{town}/{propertyId}`, `users/{uid}/role`, ledgers, counters

Rules live in `database.rules.json`. Never loosen them to make a write work.

## Roles

`admin`, `surveyor`, `assessor`, `supervisor`, `monitor`, `cashier`, `public`.
Assessor drafts, supervisor approves and reverses.

**`cashier` and `public` see one thing only: a full-screen property search box** (no menu,
no tabs, no tools). The cashier makes the bill from the search result. Create a general-public
login in the admin console with role "General public". It can read the town's property and
dues data through the existing database rules, so give that login only to people who may see
owner names and dues. Both roles go straight into the app from the landing page.
The role-to-page map is one function: `allowedTabs` in `src/services/access.ts`.

## One theme, one layout

The whole product uses one indigo palette and one header (brand bar, then page).
- React app: `src/index.css`, `tailwind.config.js`, `Navbar.tsx`.
- Standalone pages (landing, admin, tools): link `public/hub-theme.css` last in `<head>` and
  `public/hub-shell.js`. Change colours in `hub-theme.css` only; do not add a new palette to a page.

## Docs

All setup notes are in `docs/`:
- `docs/FINAL_SETUP.md`: first-time Firebase + deploy checklist (start here)
- `docs/BUILD_APK.md`: Android build
- `docs/RAZORPAY_SETUP.md`: online payments (keys stay in Cloud Functions)
- `docs/ULB_ACCESS.md`, `docs/BILLING_AUTOMATION_SETUP.md`, `docs/PHASE*_NOTES.md`: background notes

Security: deploy `database.rules.secure.json` for production; set the UPI payee address per ULB
(the code falls back to a placeholder VPA).

## Data migration

`properties_nested.json` is a one-time import for the `properties` node in Firebase
Console (Realtime Database > Import JSON). It contains demo records tagged
`createdBy: "demo-seed"`. Do not import it into a live database with real data.

## Deploy

Push to `main`: GitHub Actions builds and publishes to GitHub Pages. Publish
`database.rules.json` before pushing code that changes the data shape.
