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
   - Download the CSV of passwords at once. Passwords are not stored anywhere.

## Notes
- Passwords cannot be reset from the admin page. Use Firebase Console > Authentication > the user > Reset password.
- A phone used by two ULBs: the second ULB's login clears the first ULB's local copy, or is blocked if unsent work is pending.
- The old admin page could not list users under the previous rules. The new page reads users by ULB.
- Bill heads are recorded on each supervisor and collector (`head`) but not enforced yet. Water and garbage screens do not exist yet; when they are built, the rules will limit each supervisor and collector to their own head.
- One cashier per ULB is enforced by the admin page, not by the database rules.

## What each login sees after sign-in
After sign-in the app opens on a menu with big buttons, showing only what that login may do. Pages that a login cannot use are not shown.

| Login | Menu |
|---|---|
| Cashier | Search dues, then one button per bill head of the ULB (Property tax, Water, Garbage, Sewerage, Other) |
| Supervisor tied to one head (e.g. `_SUP_GAR`) | Search dues and that head only |
| Supervisor without a head (`_APR`, `_LDG`) | Search dues, all bill heads, survey, records, assessment, reports, ward map, exports |
| Data collector | Property survey, Property records |
| Assessor | Assessment, Property records |
| Monitor | Search dues, Reports, plus all bill heads (view only) |
| ULB admin / owner | Everything |

The head comes from `users/<uid>/head`, which the admin page already writes.

## Saved IDs and passwords
When the admin page creates an ID, it also saves the User ID, password and function under `credentials/<town>/<uid>`. The admin page has a "Saved IDs and passwords (town wise)" card: pick a town in the dropdown to see its IDs, passwords and functions, with CSV download and copy.
- Only the platform owner and that town's ULB admin can read or write `credentials/<town>`. Deploy the rules: `firebase deploy --only database`.
- IDs created before this change have no saved password.
- If a password is reset in Firebase Console, this list is not updated.

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
