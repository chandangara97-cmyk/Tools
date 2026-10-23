# Demo mode (no passwords)

The app opens straight into the work menu as a platform admin ("Demo Admin", all ULBs). No login, no password.

## Demonstration notice
The front page and the app both show a "Sign-in is temporarily disabled" notice first (once per browser session). It disappears when `DEMO_MODE` is set to false.

## What was switched off
| Place | How |
|---|---|
| React app (`src/`) | `src/config/demo.ts` -> `DEMO_MODE`. Auth, login gate, sign-out and change-password are bypassed. |
| Login page (`landing/index.html`) | `const DEMO_MODE=true` at the top of the script. Redirects to `app/`. Open `/?login=1` to see the form. |
| Standalone tools (`public/auth-guard.js`) | `var DEMO_MODE = true` on line 5. |
| Firebase rules (`database.rules.json`) | Fully open **until 20 Nov 2026 00:00 UTC**, then they lock by themselves. Real rules are saved in `database.rules.secure.json`. |

## Deploy the open rules
    firebase deploy --only database

## Switching role during the demo
Tap the yellow **DEMO** button (bottom-left) and pick Role, Town (and Bill head for a supervisor). The page reloads as that login. Or open a link such as `/app/?as=cashier&town=Bhota`. Only `admin` can be "All towns"; every other role needs one town.

## NOT covered by demo mode
- `admin_users.html` (create/delete logins) still needs a real admin sign-in.
- Cloud Functions in `functions/index.js` (set password, delete login, Razorpay) still require a signed-in user.

## Turn security back on (after the demo)
1. `src/config/demo.ts`: set `DEMO_DEFAULT = false` (or build with `VITE_DEMO_MODE=false`)
2. `landing/index.html` and `public/auth-guard.js`: set `DEMO_MODE` to `false`
3. `cp database.rules.secure.json database.rules.json && firebase deploy --only database`
4. Rebuild and redeploy the site.

## Warning
While the open rules are deployed, anyone who has the database URL can read and write the whole database (property, ledger and payment data). Use test data, and re-deploy the secure rules as soon as the demo is over.
