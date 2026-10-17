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
