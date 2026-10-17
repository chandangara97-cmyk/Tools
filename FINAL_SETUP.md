# Final setup (do in this order)

## 1. Build and check (your computer)
```
npm install
npm run test:collection     # expect: 16 tests passed
npm run build               # expect: built, no errors
```

## 2. Firebase (project propertytax-1b855)
1. Authentication > Sign-in method > enable **Email/Password**.
2. Authentication > Users > add every staff member. Copy each **UID**.
3. Realtime Database > Data > add for each user:
   `users/<UID>/role` and `users/<UID>/name`
   Roles: `admin` (you, first), `surveyor`, `assessor`, `supervisor`, `cashier`.
   Keep duties apart: assessor drafts, supervisor approves and reverses, cashier takes cash.
4. Only now deploy the rules (before step 3 nobody can read anything):
   `firebase deploy --only database`
5. Test in Console > Realtime Database > Rules > Rules Playground:
   - cashier: can create a payment, cannot create a demand or reversal
   - supervisor: can create a demand only when it equals the approved tax; can reverse
   - nobody: can overwrite or delete a ledger or audit entry
   - receipt counter: only +1 at a time, only cashier/admin

## 3. Host the app
`firebase deploy --only hosting` (uses `dist/`, config added). Any other static host also works; HTTPS is needed for GPS and the camera. Phone app: see BUILD_APK.md.

## 4. First-time data entry (admin, in the app)
1. Pick the town in the ULB dropdown. Spell the name finally now: the name is the database path.
2. Assessment tab > "Enter / edit bylaw rates": enter the notified factors, rebate, tax rate and clause numbers; set status **approved**.
3. Demand & Collection tab > "Enter / edit due date, interest and rebate rules": enter and set **approved**.
4. Survey properties. Do not upload the two built-in demo records.

## 5. Yearly cycle
Assessor: Assess all > Submit. Supervisor: Approve. Supervisor: Generate demand. Cashier: take payments, print receipts. Reports tab: defaulters, bills, notices, ward totals.

## 6. Before real money
- Test with real accounts on a phone, including offline survey work.
- Check a few properties by hand against your manual register (tax, interest, rebate).
- Keep a database backup: Realtime Database > Data > Export JSON, weekly.

## Not done yet
Per-town roles (one role works for all towns), Aadhaar vault and PostgreSQL backend (needs legal sign-off), vacant-land rate, per-floor assessment, advance payments, appeals history, old-record migration.
