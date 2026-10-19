# Scheme Hub — FULL Futuristic Theme (ALL pages)

One look for **every** surface in the product:

| Surface | How it is themed |
|---------|------------------|
| React app (GIS, collection, assessment, reports, tools dir, converters, login, …) | `src/App.tsx` + `Navbar.tsx` + `src/index.css` |
| Root app shell | `index.html` (theme-color + font) |
| Landing / sign-in | `landing/index.html` (palette + polish baked in) |
| Admin console | `public/admin_users.html` + `public/hub-theme.css` |
| Tools directory | already loads `hub-theme.css` → updated file |
| GIS property survey (standalone HTML) | already loads `hub-theme.css` → updated file |
| KML converters | already loads `hub-theme.css` → updated file |
| Shared header on standalone pages | `public/hub-shell.js` |

## Files to copy (overwrite same paths)

```
src/App.tsx
src/components/Navbar.tsx
src/components/WorkMenu.tsx
src/services/access.ts
src/hooks/useHistoryBack.ts
src/index.css
index.html
landing/index.html
public/hub-theme.css
public/hub-shell.js
public/admin_users.html
```

Optional (only if you prefer not to overwrite landing HTML):
```
landing/landing-futuristic-override.css
```

## Apply steps

1. Backup or branch the repo.
2. Copy every file above into the matching path in your project.
3. ```bash
   npm install
   npm run build
   ```
4. Test **all** of these before deploy:
   - Landing sign-in (town + super)
   - Every role (surveyor, assessor, supervisor, cashier, public, admin)
   - GIS survey (React + standalone HTML tool)
   - Collection, assessment, demand, reports, exports
   - Tools directory + both KML tools
   - Admin console (create users / towns)
   - Mobile width + offline queue
5. Rebuild the Android APK after the web build succeeds.

## Design tokens (shared)

| Token | Value |
|-------|-------|
| Command background | `#0a1020` |
| Raised surface | `#111a2d` |
| Field / input | `#0b1324` |
| Accent blue | `#477dff` |
| Accent cyan | `#25d6c5` |
| Text on dark | `#e8f0ff` |
| Muted | `#8da2c4` |
| Font | Inter |

Data-heavy React panels (survey tables, ledgers) stay on a **light workspace** so numbers stay readable; chrome (nav, tools, landing, admin) stays **dark command-centre**.

## Notes

- Tools HTML files (`tools/*.html`) are **not** duplicated here because they already link `../hub-theme.css` and `../hub-shell.js`. Replacing `public/hub-theme.css` is enough for them.
- No Firebase keys, `.env`, or user data are included.
- After apply, run your existing tests (`npm run test:all` if available).


## Cashier: all payment heads

`src/services/access.ts` is updated so **cashier** logins:
- Are **not** locked to full-screen search only
- Get tabs: `search` + `collection`
- Land on the **Work Menu** after sign-in
- See **every** payment head enabled for the town (Property tax, Water, Garbage, Sewerage, Other)
- `public` role remains search-only


## Back button (does not exit on first press)

`src/hooks/useHistoryBack.ts` + `src/App.tsx`:
- Each in-app page change pushes browser history
- Hardware / browser **Back** goes one step inside the app
- At the home view, first Back shows “Press Back again to leave”; second Back within 2s can leave

## Font size

Base type is raised to **17px** (mobile) / **18px** (tablet+), with scaled headings and controls
in `src/index.css` and `public/hub-theme.css`.
