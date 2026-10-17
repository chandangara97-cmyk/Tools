# Separate login per ULB

Every login belongs to one ULB. It can only read and write that ULB's data, and its dropdown shows only that ULB.

| Login | `users/<uid>/ulb` | Sees |
|---|---|---|
| Platform owner (you) | `*` | all ULBs, creates ULBs and logins |
| ULB admin | town name, e.g. `Bhota` | own ULB only, creates logins for own ULB |
| Staff (surveyor, assessor, supervisor, cashier) | town name | own ULB only |

A login with no `ulb` gets no access. A ULB switched off in `ulbs/<town>/active` is locked out.

## One-time steps (do in this order)
1. Firebase Console > Realtime Database > Data > `users/<your UID>`: add `ulb` = `*` (keep `role` = `admin`).
2. Existing staff logins: add `ulb` = their town name (e.g. `Bhota`), otherwise they are locked out.
3. Add `ulbs/Bhota` with `name` = `Bhota`, `active` = true (boolean). Easier: after step 5 use the admin page.
4. Deploy the rules: `firebase deploy --only database`, then test in Rules Playground (a Bhota login must be denied on `properties/Amb`).
5. Open `admin_users.html`, sign in, add each ULB, then create its admin and staff IDs and passwords.

## Notes
- Passwords cannot be reset from the admin page. Use Firebase Console > Authentication > the user > Reset password.
- A phone used by two ULBs: the second ULB's login clears the first ULB's local copy, or is blocked if unsent work is pending.
- The old admin page could not list users under the previous rules. The new page reads users by ULB.
