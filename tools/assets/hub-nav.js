/* Floating quick-nav for every tool page. Needs assets/tools.js loaded first.
   Adds a small button (bottom-left) that opens a menu of all tools and a link back to the hub.
   Hidden when printing and when the page is inside an iframe. */
(function () {
  if (window.top !== window.self) return;
  var here = decodeURIComponent((location.pathname.split('/').pop() || 'index.html'));
  if (here === 'index.html' || here === '') return;
  if (!window.NSO_TOOLS || !window.NSO_CATEGORIES) return;

  var css = '' +
  '.nsohn-btn{position:fixed;left:12px;bottom:12px;z-index:2147483000;width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.25);' +
  'background:#0b2545;color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);opacity:.9;padding:0;font:inherit}' +
  '.nsohn-btn:hover,.nsohn-btn:focus-visible{opacity:1;outline:2px solid #c8963e;outline-offset:2px}' +
  '.nsohn-ov{position:fixed;inset:0;z-index:2147483001;background:rgba(8,16,32,.45);display:none}' +
  '.nsohn-ov.open{display:block}' +
  '.nsohn-panel{position:absolute;left:10px;bottom:62px;width:min(340px,calc(100vw - 20px));max-height:min(78vh,620px);overflow:auto;background:#fff;color:#0f172a;' +
  'border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.35);font:13px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;border:1px solid #d9dee7}' +
  '.nsohn-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;background:#0b2545;color:#fff;border-radius:14px 14px 0 0;position:sticky;top:0}' +
  '.nsohn-head b{font-size:13px;letter-spacing:.2px}' +
  '.nsohn-head a{color:#f3d9a4;text-decoration:none;font-weight:600;font-size:12px;display:inline-flex;gap:6px;align-items:center}' +
  '.nsohn-cat{padding:10px 14px 2px;font-size:10.5px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:#64748b}' +
  '.nsohn-panel a.nsohn-i{display:flex;align-items:center;gap:10px;padding:8px 14px;color:#0f172a;text-decoration:none}' +
  '.nsohn-panel a.nsohn-i:hover{background:#f1f5f9}' +
  '.nsohn-panel a.nsohn-i.cur{background:#eef3fb;font-weight:700;box-shadow:inset 3px 0 0 #0b2545}' +
  '.nsohn-i svg{flex:none;color:#475569}' +
  '.nsohn-i .nsohn-new{margin-left:auto;font-size:9.5px;font-weight:700;background:#c8963e;color:#1b1100;border-radius:999px;padding:2px 7px}' +
  '.nsohn-foot{padding:8px 14px 12px;color:#64748b;font-size:11px}' +
  '@media print{.nsohn-btn,.nsohn-ov{display:none!important}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var btn = document.createElement('button');
  btn.className = 'nsohn-btn'; btn.type = 'button';
  btn.setAttribute('aria-label', 'Open tools menu'); btn.title = 'All tools';
  btn.innerHTML = window.NSO_icon('grid', 20);

  var ov = document.createElement('div'); ov.className = 'nsohn-ov';
  var html = '<div class="nsohn-panel" role="dialog" aria-label="Tools menu">' +
    '<div class="nsohn-head"><b>Field Tools</b><a href="index.html">' + window.NSO_icon('home', 15) + ' Tools home</a></div>';
  window.NSO_CATEGORIES.forEach(function (c) {
    var items = window.NSO_TOOLS.filter(function (t) { return t.cat === c.id && t.status !== 'soon'; });
    if (!items.length) return;
    html += '<div class="nsohn-cat">' + c.name + '</div>';
    items.forEach(function (t) {
      html += '<a class="nsohn-i' + (t.file === here ? ' cur' : '') + '" href="' + t.file + '">' + window.NSO_icon(t.icon, 16) + '<span>' + t.title + '</span>' +
        (t.isNew ? '<span class="nsohn-new">NEW</span>' : '') + '</a>';
    });
  });
  html += '<div class="nsohn-foot">Esc to close</div></div>';
  ov.innerHTML = html;

  function open() { ov.classList.add('open'); }
  function close() { ov.classList.remove('open'); }
  btn.addEventListener('click', function () { ov.classList.contains('open') ? close() : open(); });
  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  function mount() { document.body.appendChild(btn); document.body.appendChild(ov); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
