# Phase 3: Demand and collection

## What it does (Assessment tab -> new tab "5. Demand & Collection")
- **Demand:** supervisor/admin generates the annual demand for a financial year from approved assessments (tax on each). One demand per property per year. Cannot be edited later, only adjusted (+/-) or reversed.
- **Payments:** cashier/admin records cash, UPI or cheque (reference required for UPI and cheque). Each payment gets a receipt number `ULB/FY/000001`, issued in sequence per town and financial year. Printable receipt (amount in words, split into tax and interest per year, balance after) and a download copy.
- **Ledger per property:** every entry (demand, adjustment, rebate, payment, reversal) is listed. Year-wise table shows demand, rebate, paid, tax due, interest due.
- **Reversal, not delete:** supervisor/admin reverses a payment, demand or adjustment with a reason. A payment and its rebate reverse together. The receipt shows CANCELLED on reprint. A reversed entry is treated as if it never happened (interest is recalculated).
- **Audit log:** payments, reversals, adjustments and demand runs are logged (who, when, what). Supervisor/admin can read it. It cannot be edited or deleted.
- **Ledger summary CSV** for all properties.

## Rules (editable, nothing hard-coded)
Admin > "Enter / edit due date, interest and rebate rules". Starts as PLACEHOLDER: due 31 March, no interest, no rebate. Fill in from the notified bylaws and mark approved.
- Due date per financial year (month and day).
- Interest: simple, X% per month **or part of a month**, charged at the start of each month after the due date (plus optional grace days) on the tax still unpaid at that moment. No interest on interest. Interest runs only on amounts already demanded.
- Early-payment rebate: Y% of the year's demand, only if the year (and any earlier year) is paid in full, including interest, by the last rebate date.
- A payment clears interest first, then tax, oldest year first.
If your bylaws work differently (daily interest, interest on interest, rebate on partial payment, different payment order), tell me the clause and I will change `src/services/collection.ts`.

## Roles
- Cashier: take payments. Supervisor: generate demand, adjust, reverse, read audit. Admin: everything, plus the rules.
- Cashier cannot reverse their own entry; supervisor cannot take cash.
- Still one role for all towns (see "Not done").

## Deploy
1. `npm install` (adds `tsx` for tests), `npm run build`.
2. Deploy `database.rules.json` (adds `collectionSettings`, `ledger`, `receiptCounters`, `audit`).
3. Create at least one `cashier` user in `users/{uid}` with `role: "cashier"`.

## Tested here
- `npm run test:collection`: 15 tests on the engine (due dates, interest by month or part, no interest before a demand exists, interest-first allocation, oldest year first, reversal, rebate window and full-payment condition, overpayment, adjustment, amount in words). All pass.
- `tsc` clean and `npm run build` succeeds.

## NOT tested (needs you)
- The screen has not been opened in a browser or on a phone. Printing in the Android app may not work; use "Download receipt" there.
- The database rules were only checked as valid JSON. Test in the Firebase Rules Playground / emulator:
  - cashier can create `payment` and `rebate` entries, cannot create `demand` or `reversal`;
  - supervisor can create `demand` (only when the amount equals the approved assessment's tax), `adjustment`, `reversal`;
  - nobody can overwrite or delete an existing ledger entry or audit entry;
  - a second `demand_{fy}` for the same property is refused; a reversal of a missing entry is refused;
  - receipt counter only moves up by exactly 1; only cashier/admin can touch it.
- Money is stored as rupees with paise rounded at each step; check a few real cases against your manual register before go-live.

## Known gaps
- No advance payments: paying more than the dues is refused.
- A reversed demand cannot be re-created for that year (the id is used). Post a positive adjustment instead.
- A receipt number can be skipped if the network drops between getting the number and saving the payment. The counter never goes backwards or repeats; gaps are visible in the sequence.
- Demand uses the assessment's total tax per property (one total, not per floor). If an approved assessment changes after demand, post an adjustment by hand.
- Whole-town ledger is loaded into the browser. Fine for a ULB-sized town; move to the PostgreSQL backend for scale.
- `bun.lock` is out of date after adding `tsx`; run `npm install` (or `bun install`).

## Towns are saved under the town name (added)
- The ULB dropdown (top of the survey page, sorted A-Z) selects the town. Everything is stored under the town NAME: `properties/Bhota/...`, `ledger/Bhota/...`, `rateTables/Bhota`, `collectionSettings/Bhota`, `assessments/Bhota/...`, `audit/Bhota/...`. Spaces become underscores (`Baijnath_paprola`).
- Property IDs and receipt numbers still use the ULB (LGD) code, so they do not change: `0206001-01-0001`, `0206001/2026-27/000001`.
- Do not rename a town after data is saved: the name is the path, so a renamed town would look empty. Fix spelling before go-live.
- Nothing was deployed yet, so no data needs moving. If you already saved test data under the old keys (`bhota-0206001`), it will not show; re-enter it or ask me for a one-time copy script.
