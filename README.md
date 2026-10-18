# Ward-wise properties update — files to apply

## Code files (go to GitHub, in your Tools repo)
- `database.rules.json` -> replace the file at the repo root
- `firebase.ts` -> replace `src/firebase.ts`
- `syncQueue.ts` -> replace `src/services/syncQueue.ts`

Commit and push these three. Your existing GitHub Actions workflow
(`Deploy to GitHub Pages`) builds and redeploys automatically on push to `main`.

## Data file (goes to Firebase, NOT to GitHub)
- `properties_nested.json` -> Firebase Console -> Realtime Database ->
  open the `properties` node -> kebab menu -> Import JSON.
  This replaces only the `properties` subtree (Bhota, Shimla_MC, Nerwa),
  nothing else in the database is touched.

Contains:
- Bhota (ward 1) and Shimla_MC (ward 6): your original 3 real records,
  re-nested under their ward.
- Nerwa (ward 4): 14 synthetic demo records — a full mix of homes, shops,
  and government buildings. Not real survey data; every record is tagged
  `createdBy: "demo-seed"` and `rem: "Sample/demo record - not real survey data"`
  so it's easy to find and clear out later.

## Deploy order
1. Publish the new `database.rules.json` to Realtime Database first.
2. Push the 3 code files to GitHub (triggers the Pages redeploy).
3. Import `properties_nested.json` at the `properties` node.

Doing the rules first avoids a gap where old-shaped data sits under new rules.
