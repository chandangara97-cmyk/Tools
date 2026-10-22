# Phase 1: Central database setup

## What changed
| Area | Change |
|---|---|
| Logins | Email/password sign-in. Roles: `surveyor`, `supervisor`, `assessor`, `cashier`, `admin`. |
| Permanent IDs | `ULB-WARD-NNNN` (e.g. `0206001-01-0042`). Issued by a central counter. Each device reserves blocks of 50 per ward, so IDs can be issued offline. |
| Duplicates | Same ward + house/plot no., or same UPN, is blocked on the form and again centrally (atomic claim in `dupIndex`). |
| Offline queue | Saves/deletes/photos are stored on the device and uploaded when online. Items rejected by the server show as "not uploaded" with Fix / Dismiss. |
| Photos | Up to 3 per property, compressed in the browser to about 1024 px JPEG. Stored at `photos/{town}/{id}`. |
| Rules | `database.rules.json` replaces the open read/write rules. Nothing is readable without a signed-in user who has a role. |

Role permissions in Phase 1: surveyor = create and edit; supervisor/admin = also delete and upload old device-only records; assessor/cashier = read only (their screens come in Phases 2 and 3).

## One-time Firebase setup (project `propertytax-1b855`)
1. Console > Authentication > Sign-in method > enable **Email/Password**.
2. Authentication > Users > add each staff member. Copy each user's **UID**.
3. Realtime Database > add, for each user (the first admin must be added by hand here):
   `users/<UID>/role = "admin"` and `users/<UID>/name = "Full Name"`.
   After that, an admin can manage `users/*` from the console.
4. Deploy the rules: `firebase deploy --only database` (uses `firebase.json` and `database.rules.json`), or paste `database.rules.json` into Realtime Database > Rules.
5. `npm install` then `npm run dev`.

**Deploy the new rules only after step 3**, or nobody (including you) can read the data. Old copies of the app without login stop working once the rules are live. This is intended.

## Things to know
- Existing data: records already in the cloud keep their old IDs (e.g. `1-0001`). Only new properties get the new format. Records that exist only on a phone appear as "never uploaded" with an upload button for supervisors/admins. Do not upload the two built-in demo records.
- Existing records have no duplicate keys registered yet. Re-saving a record registers it.
- Photos and queued changes live in `localStorage` (about 5 MB). Upload before filling a phone with offline work.
- Deleting is supervisor/admin only in Phase 1. Phase 3 (payments) must use reversal entries, not deletes.
- Not yet verified: this was written without network access, so `npm install`, `npm run build` and the Firebase rules simulator have not been run. Test the rules in Console > Realtime Database > Rules > Rules Playground before relying on them.
