// Builds the deployable site folder:  site/index.html (town login)  +  site/app/ (the React app).
// Run after `vite build` with VITE_BASE ending in /app/ (default /app/).
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';

if (!existsSync('dist')) throw new Error('dist/ not found. Run the build first.');
rmSync('site', { recursive: true, force: true });
mkdirSync('site', { recursive: true });
cpSync('dist', 'site/app', { recursive: true });
cpSync('landing/index.html', 'site/index.html');
if (existsSync('tools')) cpSync('tools', 'site/app/tools', { recursive: true }); // standalone GIS / KML tools
console.log('site/ ready: index.html (login) + app/');
