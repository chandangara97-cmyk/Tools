# Phase 4: Reports and notices (tab "6. Reports & Notices")

All reports read the Phase 3 ledger. Dues are as on today; any ward can be picked.

- **Ward-wise collection:** properties, demanded, collected, rebate allowed, outstanding (tax + interest), defaulters, % collected. Choose a date range for "collected" (by receipt date; reversed receipts excluded). CSV export.
- **Defaulters:** a property with dues for a year whose due date has passed. Filter by ward and minimum due. CSV export. Print or download **notices of arrears**.
- **Demand bills:** year-wise bill for every property with dues in the chosen ward, with any open early-payment rebate. Print or download.
- **Bill/notice wording:** one text box; put the notified clause or last date there. Nothing legal is hard-coded.
- **Paid / unpaid map:** survey points coloured paid (green), part paid (amber), unpaid (red), no demand (grey). Ward boundaries drawn from the town's ward polygons, each tinted red to green by recovery. Plain SVG with no base map, so it works offline. Tap a dot for owner and dues. Properties without GPS are counted but not drawn.

## Limits
- Print/download covers 200 bills or notices at a time (pick one ward).
- Downloaded bills/notices are HTML files; open and print from a browser. Direct print may not work inside the Android app.
- The map draws the ward boundaries stored for the town, with ward numbers, and the survey points on top. Picking a ward zooms to it. Wards can be tinted by recovery (share of demand already cleared). There is no street/satellite base map.
- Reports load the whole town ledger in the browser (fine for a ULB-sized town).
- Not run in a browser; `tsc` and `npm run build` pass. Check the totals against a few properties by hand before using the figures officially.
