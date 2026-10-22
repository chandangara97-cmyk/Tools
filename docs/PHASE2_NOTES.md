# Phase 2: Assessment

## What it does
- **Assessment tab** now starts with an Assessment panel: pick a financial year (April to March), assess all unassessed properties, submit drafts, supervisor approves or rejects, export the approved roll as CSV.
- **Working view** per property shows every factor and the line-by-line sum, so a taxpayer's query can be answered from the screen.
- **Rate table per town** (`rateTables/{town}`): factors for zone (F1), structure (F2), age band (F3), occupancy (F4), use (F5), class (`ncls`), rebate %, tax rate %. Admin edits it as JSON in the app. Each assessment stores which table version produced it.
- **Review flow:** draft -> submitted -> approved or rejected. Assessor/admin create and submit. Supervisor/admin approve or reject (with a reason). Approved records are not editable by assessors.
- Form-A and Form-E exports and the summary card now use the same engine instead of hard-coded numbers.

## Formula
Rateable value = built-up area x F1 x F2 x F3 x F4 x F5 x class factor
Net taxable value = rateable value - rebate %
Tax = net taxable value x tax rate %   (not computed until the rate table sets a tax rate)

## Important: the rates are placeholders
The old export used fixed numbers (location 5, age 4, RCC 3 else 2, let-out 2.5 else 2, commercial 2.5 else 1.5, rebate 10%). The new default table copies exactly those so nothing changes silently, and is labelled PLACEHOLDER everywhere. The tax rate % is blank. `ncls` has factor 1 until its meaning is confirmed. Before approving any real assessment, an admin must enter the notified rates and set status to "approved".

## Deploy
Re-deploy `database.rules.json` (adds `rateTables` and `assessments`). Existing Phase 1 rules are unchanged.

## Not yet done
- Vacant land (no built-up area) assesses to 0 with a warning; a land-rate rule is needed.
- Per-floor assessment lines (floors can have different use); currently one total per property.
- Appeals / re-assessment history beyond rejected -> redraft.
- Not run in a browser: the engine has automated tests; the screen and the rules were only type-checked and need testing in the Rules Playground and with real accounts.

## Entering bylaws by hand (added)
Admin > Assessment tab > "Enter / edit bylaw rates". A form replaces the old JSON box:
- **Bylaw reference:** title, notifying authority, notification no. and date, notes, effective-from date, and status (placeholder / approved).
- **Factor tables:** F1 location (by zone), F2 structure, F3 age (bands: "up to N years", factor), F4 occupancy, F5 use, class. Add or remove rows; "anything else" is the default row. Each rule has a **bylaw clause** box; the clause shows in each property's working view.
- **Rebate % and tax rate %**, each with a clause box.
- **Other charges and deductions:** any number of entries (cess, surcharge, concession, flat fee). Each has a name, clause, whether it applies to the rateable value or to the tax, percent or flat rupees, a value (negative = deduction), and an optional single use category.
- Saving as "approved" asks for confirmation if the tax rate or notification number is blank.
- The survey form now has a **Class** box (blank by default). Before this change `ncls` was not on the form and silently saved as "E" on new records. Existing records keep their stored value.

Adjustments are applied in this order: rateable value, minus rebate, plus value-based adjustments = net taxable value; times tax rate = tax; plus tax-based adjustments. Flat charges are skipped for properties with no built-up area.
