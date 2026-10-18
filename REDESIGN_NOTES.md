# Scheme Hub 2026 — New workspace layout

## Design direction
Replaced the dark premium/glass look with a modern civic operations workspace:
- White vertical navigation rail with clear active state and workspace footer
- Sticky light top bar with page title, breadcrumbs, search, notifications and profile context
- Soft blue-grey canvas and white content surfaces with subtle borders
- Blue primary actions; green/amber reserved for status
- Tighter typography and clearer information hierarchy
- Responsive mobile navigation and reduced-motion support

## Files changed
- `src/App.tsx` — app shell, workspace header, page title/breadcrumbs, footer
- `src/components/Navbar.tsx` — vertical responsive sidebar navigation
- `src/index.css` — new light design system and legacy component overrides
- `public/schemehub-light.css` — light theme overrides for standalone tools/admin/landing HTML pages
- `public/admin_users.html`, `tools/*.html`, `landing/index.html` — include standalone light stylesheet
- `redesign-preview.html` — static design mockup source

## Notes
- Existing survey/data logic and service modules were not intentionally changed.
- Build verification could not be completed in this environment because dependency installation did not finish. Run `npm install` and `npm run build` before deployment.
- The dashboard values in the static preview are illustrative design content, not live database metrics.
