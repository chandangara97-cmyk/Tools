# CivicCollect portal — Firebase records and billing update

## Preserved
- Original CivicCollect React/Tailwind visual design and existing Citizen, Tax Estimator, Cashier and Admin views.
- New Property Records view uses the same design language and mobile-friendly cards.

## Added
- Firebase Authentication sign-in for the new Property Records view.
- Live property search across owner, property ID, UPN, house number and address.
- Live billing-ledger balances from opening balance + posted demands + penalties - confirmed payments - credits.
- Property field editing with audit records containing actor UID/email, action, detail and timestamp.
- Opening balance adjustment, duplicate-protected demand posting, confirmed-payment entry, garbage rate editor, and bylaw/resolution notes.
- Demo-seed records are blocked from demand/payment posting.

## Important deployment checks
1. Install dependencies (`npm install`) and run `npm run build` before deployment.
2. Firebase Authentication Email/Password must be enabled and the administrator must already exist in Firebase Auth.
3. The authenticated user's `/users/{uid}` record must have a permitted role and ULB scope matching your existing Firebase rules. UI sign-in alone does not grant write access.
4. The uploaded export has flat `properties/{town}/{propertyId}` records while the companion Tools-main rules file appears to expect `properties/{town}/{ward}/{propertyId}` for writes. Confirm the deployed rules and data shape before live editing. Do not weaken database rules to make writes work.
5. Existing data does not include approved property-tax rates, most utility rates, confirmed payments, or legal bylaw text. These are intentionally not invented. Garbage rates already in the export remain unchanged; the UI does not automatically generate recurring demands.
6. The full updated JSON export preserves the uploaded records and adds empty, explicitly unapproved bylaw placeholders. Importing a full export replaces the database contents; back up the live database first and prefer a targeted update for only the `bylaws` node if preserving live concurrent data is important.
7. A payment recorded here is marked confirmed and reduces the computed ledger balance. Connect this action to your official receipt/collection process and apply server-side role rules before using it for real collections.
