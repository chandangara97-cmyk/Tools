// Builds the search and collection pages with a fake database so they can be driven in a real browser.
// Needs: npm i -D playwright (and npx playwright install chromium). Run: npm run test:browser
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '../../src');
const G = path.resolve(HERE, '../../node_modules');
const OUT = path.join(HERE, '.out');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'page.html'), '<!doctype html><meta charset="utf-8"><div id="root"></div><script src="out.js"></script>');
// every icon any source file imports from lucide-react, so a new page can never break this list
const iconSet = new Set();
const scan = (dir) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
  const full = path.join(dir, f.name);
  if (f.isDirectory()) scan(full);
  else if (/\.tsx?$/.test(f.name)) for (const m of fs.readFileSync(full, 'utf8').matchAll(/import\s*\{([^}]*)\}\s*from\s*'lucide-react'/g)) m[1].split(',').map((x) => x.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach((n) => iconSet.add(n));
} };
scan(SRC);
const icons = [...iconSet];
const stubs = {
  'lucide-react': `import React from 'react';\n` + icons.map((n) => `export const ${n} = (p) => React.createElement('svg', { 'data-icon': '${n}' });`).join('\n'),
  '@capacitor/filesystem': `export const Filesystem = { writeFile: async () => ({ uri: 'x' }) }; export const Directory = { Cache: 'CACHE' }; export const Encoding = { UTF8: 'utf8' };`,
  '@capacitor/share': `export const Share = { share: async () => {} };`,
  'firebase/app': `export const initializeApp = () => ({});`,
  'firebase/auth': `export const getAuth = () => ({}); export const onAuthStateChanged = () => () => {}; export const signInWithEmailAndPassword = async () => ({}); export const signOut = async () => {};`,
  'firebase/database': `
const walk = (o, path) => path.split('/').filter(Boolean).reduce((a, k) => (a == null ? a : a[k]), o);
export const getDatabase = () => ({});
export const ref = (_d, path) => ({ path });
export const onValue = (r, cb, err) => {
  const mode = window.__mode || 'ok'; const v = walk(window.__db || {}, r.path);
  if (mode === 'never') return () => {};
  const id = setTimeout(() => { if (mode === 'error') err && err(new Error('denied')); else cb({ val: () => (v === undefined ? null : JSON.parse(JSON.stringify(v))) }); }, 20);
  return () => clearTimeout(id);
};
export const get = async (r) => ({ val: () => walk(window.__db || {}, r.path) ?? null });
export const set = async () => {}; export const push = () => ({ key: 'k' }); export const update = async () => {}; export const remove = async () => {};
export const serverTimestamp = () => ({ '.sv': 'timestamp' }); export const runTransaction = async () => ({}); export const query = (r) => r; export const limitToLast = () => ({}); export const orderByKey = () => ({});
`,
};
const plug = {
  name: 'stubs',
  setup(b) {
    b.onResolve({ filter: /^(lucide-react|firebase\/.*|@capacitor\/.*)$/ }, (a) => ({ path: a.path, namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, (a) => ({ contents: stubs[a.path] || 'export {}', loader: 'js', resolveDir: G }));
    // firebase.ts config file: no real app
    b.onResolve({ filter: /\/firebase$/ }, (a) => (a.importer.includes('/Tools-main/src') ? { path: 'fbcfg', namespace: 'fb' } : undefined));
    b.onLoad({ filter: /.*/, namespace: 'fb' }, () => ({ contents: 'export const db = {}; export const auth = {}; export default {};', loader: 'js' }));
    // auth: a test double whose role comes from the page
    b.onResolve({ filter: /services\/auth$/ }, () => ({ path: 'authstub', namespace: 'au' }));
    b.onLoad({ filter: /.*/, namespace: 'au' }, () => ({ loader: 'js', contents: `
export const useAuth = () => ({ role: window.__role || 'cashier', head: null, displayName: 'Test User', isSuper: false, ulb: 'Test', user: {}, signOut: async () => {} });
export const canEditRates = (r) => r === 'admin'; export const canSetPayableRates = (r) => r === 'admin';
export const canCollect = (r) => r === 'cashier' || r === 'admin'; export const canManageLedger = (r) => r === 'supervisor' || r === 'admin';
export const canSeeAudit = (r) => r === 'supervisor' || r === 'admin' || r === 'monitor';
export const AuthProvider = ({ children }) => children;` }));
  },
};
fs.writeFileSync(path.join(OUT, 'entry.tsx'), `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { LiabilitySearch } from '${SRC}/components/LiabilitySearch';
import { CollectionPanel } from '${SRC}/components/CollectionPanel';
import { WorkMenu } from '${SRC}/components/WorkMenu';
import { ErrorBoundary } from '${SRC}/components/ErrorBoundary';
const Boom = () => { throw new Error('boom'); };
(window as any).mount = (props: any) => { const el = document.getElementById('root')!; el.innerHTML = ''; createRoot(el).render(<LiabilitySearch {...props} />); };
(window as any).mountPanel = (props: any) => { const el = document.getElementById('root')!; el.innerHTML = ''; createRoot(el).render(<CollectionPanel {...props} />); };
(window as any).mountMenu = (props: any) => { const el = document.getElementById('root')!; el.innerHTML = ''; createRoot(el).render(<WorkMenu {...props} onChoose={(c: any) => { (window as any).__chosen = c; }} />); };
(window as any).mountBoom = () => { const el = document.getElementById('root')!; el.innerHTML = ''; createRoot(el).render(<ErrorBoundary resetKey="a" onBack={() => { (window as any).__back = true; }}><Boom /></ErrorBoundary>); };
`);
await build({
  entryPoints: [path.join(OUT, 'entry.tsx')], bundle: true, outfile: path.join(OUT, 'out.js'), format: 'iife', jsx: 'automatic', platform: 'browser',
  plugins: [plug], alias: { react: G + '/react', 'react-dom': G + '/react-dom' }, define: { 'process.env.NODE_ENV': '"development"' }, logLevel: 'error', loader: { '.json': 'json' },
});
console.log('bundle ok', (fs.statSync(path.join(OUT, 'out.js')).size / 1024).toFixed(0) + ' KB');
