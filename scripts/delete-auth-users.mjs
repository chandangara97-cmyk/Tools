// Bulk-delete Firebase Authentication accounts by User ID prefix.
// Usage:  node scripts/delete-auth-users.mjs serviceAccount.json nerwa_,bhuntar_ [--yes]   (comma-separated prefixes)
// Needs:  npm i firebase-admin   (service account key: Firebase Console > Project settings > Service accounts)
import { readFileSync } from "node:fs";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [keyFile, prefixArg, flag] = process.argv.slice(2);
const prefix = prefixArg;
const prefixes = (prefixArg || "").toLowerCase().split(",").map(x => x.trim()).filter(Boolean);
if (!keyFile || !prefix) { console.error("usage: node delete-auth-users.mjs <serviceAccount.json> <id-prefix> [--yes]"); process.exit(1); }
// keyFile "adc" = use your own Google login (Cloud Shell), no key file needed
initializeApp(keyFile === "adc"
  ? { credential: applicationDefault(), projectId: "propertytax-1b855" }
  : { credential: cert(JSON.parse(readFileSync(keyFile, "utf8"))) });
const auth = getAuth();

const hit = []; let token;
do {
  const page = await auth.listUsers(1000, token);
  for (const u of page.users) if (prefixes.some(x => (u.email || "").toLowerCase().startsWith(x))) hit.push(u);
  token = page.pageToken;
} while (token);

console.log(`${hit.length} account(s) start with "${prefix}":`);
hit.slice(0, 20).forEach(u => console.log("  " + u.email));
if (flag !== "--yes") { console.log("Dry run. Add --yes to delete."); process.exit(0); }
for (let i = 0; i < hit.length; i += 1000) {
  const r = await auth.deleteUsers(hit.slice(i, i + 1000).map(u => u.uid));
  console.log(`deleted ${r.successCount}, failed ${r.failureCount}`);
}
