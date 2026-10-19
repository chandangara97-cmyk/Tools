# Scheme Hub — Full Futuristic Theme (React + Landing + Tools)

This package extends the original **Tools-Futuristic-Redesign** so the **whole website**
shares one look: dark command-centre chrome, blue/cyan accents, glass bars, and bright
workspaces where data is shown.

## What is included

| Path | Role |
|------|------|
| `src/App.tsx` | React app shell (from original redesign) |
| `src/components/Navbar.tsx` | React command-centre navbar |
| `src/index.css` | React global theme |
| `public/hub-theme.css` | **Shared** theme for landing, admin, tools HTML |
| `public/hub-shell.js` | Shared sticky header for standalone pages |
| `landing/landing-futuristic-override.css` | Optional extra polish for the sign-in page |

## Apply (step by step)

1. **Backup** your project (or create a branch).

2. **React app** — copy these over the same paths:
   ```
   src/App.tsx
   src/components/Navbar.tsx
   src/index.css
   ```

3. **Standalone pages** — copy these over the same paths:
   ```
   public/hub-theme.css
   public/hub-shell.js
   ```
   (If your tools/landing pages already load `../hub-theme.css` and `../hub-shell.js`,
   they will pick up the new look automatically.)

4. **Landing page (optional extra polish)**  
   Either:
   - Add this line in `landing/index.html` **after** the existing `<style>` block:
     ```html
     <link rel="stylesheet" href="landing-futuristic-override.css">
     ```
     and place the CSS file next to `landing/index.html`,  
   **or**
   - Copy the rules from `landing/landing-futuristic-override.css` into the bottom of
     the landing page’s own `<style>` block.

5. **Install & build**
   ```bash
   npm install
   npm run build
   ```

6. **Test before deploy**
   - Login (Town + Super)
   - Every role (surveyor, assessor, cashier, public, …)
   - GIS survey, collection, reports, exports
   - Tools directory + KML converters
   - Mobile width and offline queue
   - Then rebuild the APK if you ship Android

## Design notes

- **Command surfaces** (navbar, tools band, dark panels): `#0a1020` / `#111a2d`
- **Accents**: blue `#477dff` + cyan `#25d6c5`
- **Data workspaces** (GIS survey inside React): stay light for readability
- Reduced-motion is respected
- No Firebase credentials or secrets are included

## Scope

| Area | Covered by this package |
|------|-------------------------|
| React hub (App, Navbar, global CSS) | Yes |
| Tools directory + converters | Yes (via hub-theme.css) |
| Admin console | Yes (via hub-theme.css variables) |
| Landing / sign-in | Yes (hub-theme + optional override) |
| APK | After you rebuild from the updated source |

