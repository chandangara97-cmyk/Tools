# Unapplied files (kept, not deleted)

These files were uploaded at the repo root instead of inside `src/`, so the build never used them.
`src/` already contains newer versions of everything here EXCEPT one feature:

- `services/assessment.ts` + `components/AssessmentPanel.tsx`: unit-based property tax
  (Rs 50 per residential unit, Rs 80 per commercial unit, "Nerwa/demo" rule). `src/` does not have this.
  To enable it, copy these two files over `src/services/assessment.ts` and `src/components/AssessmentPanel.tsx`
  and re-run `npm run test:all`. Do this only if those flat rates are what the ULB wants for every property.

- `components/WorkMenu.tsx`, `useHistoryBack.ts`, `index.css`: older than the `src/` copies. Safe to delete.
