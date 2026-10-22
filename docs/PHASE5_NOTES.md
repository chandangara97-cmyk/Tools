# Phase 5: Utility bills and fixed amounts

- Cashier tab has a bill-head selector: Property tax, Water, Garbage, Sewerage, Other utilities (heads switched on for the ULB in `ulbs/<town>/heads`; all five if none are recorded).
- Each head has its own ledger, receipt series, audit entries and rules (due date, interest, rebate).
  Property tax keeps its original keys. Other heads: `ledger/<town>/<head>~<propertyId>`, `receiptCounters/<town>/<head>_<fy>`, `headSettings/<town>/<head>`.
- Receipt numbers: property tax `code/FY/000001` (unchanged); others `code/WAT/FY/000001`, `GAR`, `SEW`, `OTH`.
- Fixed amounts (admin only, per town, per head): `payableRates/<town>/<head>` = `residential`, `commercial`. Page "Fixed amounts".
- Demand for water/garbage/sewerage/other is raised from the fixed amounts ("Generate demand from fixed amounts"). Property tax can use either assessments or fixed amounts.
- Not done: Phase 4 reports, notices and map still cover property tax only. Properties are the billing unit for every head (no separate water-connection register).
- Deploy: `firebase deploy --only database`, then test in the Rules Playground (non-admin cannot write `payableRates`; admin of another town cannot write this town).
