# Recurring billing setup

This project keeps the existing `ledger/<town>/<property-or-head~propertyId>` ledger as the source of truth. Payments and manual adjustments continue to use the existing app and reduce the computed balance; do not import a second ledger schema.

## Important safety default

`billingAutomation/enabled` is intentionally **false / absent by default**. The exported properties include demo-seeded records, and existing payable rates are not proof that a legal demand should be raised. Confirm the real property list, applicable rates, and notified frequency before enabling automation.

## What the scheduled function does

- Runs daily at 02:15 Asia/Kolkata.
- Creates monthly fixed-rate utility demands on the first day of each month.
- Creates yearly fixed-rate utility demands and approved-assessment property-tax demands on 1 April.
- Uses deterministic demand IDs (`demand_YYYY-MM` or `demand_YYYY-YY`) and skips existing IDs to prevent duplicate billing.
- Does not create a bill for a missing/non-positive rate or a non-Residential/non-Commercial property use.
- Writes to the existing `ledger` node, so the current dues screen and payment workflow remain the source of truth.

## Deployment

1. Confirm `firebase.json` uses the correct Firebase project and configure the project alias locally (do not commit credentials).
2. Install function dependencies: `cd functions && npm install`.
3. Deploy: `firebase deploy --only functions:generateRecurringBills`.
4. In Realtime Database, after validating real data and rates, set `billingAutomation/enabled` to boolean `true`.
5. Monitor `billingAutomationRuns` and Cloud Functions logs. Cloud Scheduler billing/permissions may be required by Firebase.

The function intentionally does not use client-side page loads to generate recurring demands. A browser is not a reliable scheduler.
