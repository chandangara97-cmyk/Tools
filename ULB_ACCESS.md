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
