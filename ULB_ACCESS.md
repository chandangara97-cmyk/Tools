# Separate login per ULB

Every login belongs to one ULB. It can only read and write that ULB's data, and its dropdown shows only that ULB.

| Login | `users/<uid>/ulb` | Sees |
|---|---|---|
| Platform owner (you) | `*` | all ULBs, creates ULBs and logins |
| ULB admin | town name, e.g. `Bhota` | own ULB only, creates logins for own ULB |
| Monitor | town name | whole ULB, read only (all bill heads and audit log) |
| Supervisor (one per bill head) | town name + `head` | own ULB; approves and reverses |
| Data collector (under a supervisor) | town name + `head` + `supervisor` | own ULB; creates survey records |
| Cashier (one per ULB) | town name | own ULB; takes payments |

A login with no `ulb` gets no access. A ULB switched off in `ulbs/<town>/active` is locked out.

## One-time steps (do in this order)
1. Firebase Console > Realtime Database > Data > `users/<your UID>`: add `ulb` = `*` (keep `role` = `admin`).
2. Existing staff logins: add `ulb` = their town name (e.g. `Bhota`), otherwise they are locked out.
3. Add `ulbs/Bhota` with `name` = `Bhota`, `active` = true (boolean). Easier: after step 5 use the admin page.
4. Deploy the rules: `firebase deploy --only database`, then test in Rules Playground (a Bhota login must be denied on `properties/Amb`).
5. Open `admin_users.html`, sign in, and for each ULB:
   - Step 1 "Set up a ULB": tick the bill heads (property tax, water, garbage...) and press the button. It creates the ULB, 1 monitor, 1 cashier and 1 supervisor per head, e.g. `BHOTA_MON`, `BHOTA_CASH`, `BHOTA_SUP_WTR`.
   - Step 2 "Add data collectors": pick the supervisor and a number. IDs look like `BHOTA_WTR_C01`.
   - Download the CSV of passwords at once. Passwords are shown only once and are not stored anywhere, not even in the database.

## Notes
- Passwords cannot be reset from the admin page. Use Firebase Console > Authentication > the user > Reset password.
- A phone used by two ULBs: the second ULB's login clears the first ULB's local copy, or is blocked if unsent work is pending.
- The old admin page could not list users under the previous rules. The new page reads users by ULB.
- Bill heads are recorded on each supervisor and collector (`head`). The screens limit a head-tied supervisor to their own head; the database rules do not enforce the head yet.
- One cashier per ULB is enforced by the admin page, not by the database rules.

## What each login sees after sign-in
After sign-in the app opens on a menu with big buttons, showing only what that login may do. Pages that a login cannot use are not shown.

| Login | Menu |
|---|---|
| Cashier | A bare full-page property search box. No menu and no header controls; the bill and payment are made from the search result |
| Supervisor tied to one head (e.g. `_SUP_GAR`) | Search dues and that head only |
| Supervisor without a head (`_APR`, `_LDG`) | Search dues, all bill heads, survey, records, assessment, reports, ward map, exports |
| Data collector | Property survey, Property records |
| Assessor | Assessment, Property records |
| Monitor | Search dues, Reports, plus all bill heads (view only) |
| ULB admin / owner | Everything |

The head comes from `users/<uid>/head`, which the admin page already writes.

## Passwords are never stored
The admin page shows each new password once, in the "New IDs and passwords" table, with a CSV download and Copy. Nothing is saved in the database, and the rules have no `credentials` node any more.
- **If you used an earlier version of this page:** it saved IDs and passwords under `credentials/<town>`. Delete that whole node once in Firebase Console > Realtime Database (the rules now block the app from reading it, but the old data stays until you delete it). Then change the password of any login you still use, because those passwords sat in the database and in any backup or export taken before.
- Lost password: Firebase Console > Authentication > the user > Reset password.

## Who may change dues, and what the database enforces
- Ledger entries cannot be edited, only added (and cancelled by a reversal).
- **Payment and rebate:** cashier or admin. The time (`at`) must be the database server's own time, so a wrong phone clock cannot change it. The app also takes the payment date from the server's clock (India date), not the phone's.
- **Receipt numbers:** the counter moves up by exactly one, in the same write as the payment. If the save fails, no number is used up, so the series has no gaps.
- **Demand and reversal:** supervisor or admin.
- **Adjustment:** admin on any property and any period (the Pending dues page). A supervisor may adjust only a year or month that already has a demand (re-assessment); a supervisor cannot add arrears or waive dues for a period with no demand.
- **Not enforced by the database:** that a payment is not larger than the dues. The app checks this; the rules cannot add up ledger entries. Closing this needs a stored balance per property or a Cloud Function, which is not built.

## Search dues
Type a property ID, part of an owner's name, house number or UPN. The result shows the total liability on that property across every bill head (tax or charge, interest, due) as on today, and the total liability of the owner across all properties surveyed under the same owner name. A login only sees the bill heads it may open. No new database rules are needed; it reads the existing ledger.

## Monthly bills and manual dues
- **Monthly charging:** admin, Demand & Collection, Fixed amounts. For water, garbage, sewerage and other bills pick "Charged every month". The Residential and Commercial amounts then mean rupees per month. Property tax stays yearly. Deploy the updated rules (`firebase deploy --only database`) so the new `frequency` field is accepted.
- **Raising a month:** open that bill's collection page, Overview, choose the month, press "Generate <month> bills". One demand per property per month; existing ones are skipped.
- **Due date and interest:** a month's bill falls due on the due day (set in Due date & interest) of the following month. Interest per month and grace days work as before. Monthly bills carry no early-payment rebate.
- **Update dues (admin only):** pick a property, then Add charge or arrears, or Reduce or waive, for any year or month, with an effective date and a reason. It is saved as an adjustment, so it is audited and can be reversed from Collect payment. Use it to enter old arrears when moving from a paper register.
- The database rules still let a supervisor post adjustments; only the admin screen is limited to admins.

## Generate bill (cashier, supervisor, admin)
Search dues, open a property, press "Generate bill".
- **Full bill:** everything due on the property across all bill heads.
- **Customer's choice:** tick only the bills and months the customer asks for. The total updates as you tick.
- "Include the owner's other properties" adds them to the same bill.
- Print, or download as an HTML file. The bill shows owner, property, each item with due date, tax or charge, interest, total and the total in words, as on the date and time of printing.
- Bills are not numbered and nothing is saved in the database. It is a statement, not a receipt. Receipts still come from Collect payment.

## Tests
- `npm run test:collection` and `npm run test:search`: money maths, monthly bills, search, dues across bill heads (42 checks, no browser needed).
- `npm run test:browser`: opens the search page, collection pages and role menus in a real browser with a fake database and clicks through them (59 checks). One-time setup: `npm i -D playwright && npx playwright install chromium`.
- `npm run test:all` runs everything. Run it before each release.

## Common password, login dropdown and password reset
- **Common password:** on the admin page, "Common password" card. If filled (6+ characters), every new ID made on that page gets it instead of a random one. It is typed each session and never saved in the code or the database. A shared password is weak, so staff should use the new **Password** button in the app header to change theirs.
- **Login dropdown:** the sign-in page has a town box; picking a town lists that ULB's IDs with their role. The list lives at `loginDirectory/<town>/<ID>` (IDs and role names only, readable without signing in). New IDs are added automatically. For IDs made earlier press "Refresh login dropdown list" once. Removing an ID removes it from the list.
- **Reset password:** each ID on the admin page has a "Reset password" button. It calls the Cloud Function `resetLoginPassword` (a ULB admin only for own ULB). Deploy with `firebase deploy --only functions,database`.
- Passwords are still not stored or readable anywhere.
