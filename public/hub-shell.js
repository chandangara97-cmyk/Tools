/* Scheme Hub 2026 — shared header for standalone pages (matches React Navbar).
   Include with: <script src="…/hub-shell.js" defer></script>
   Skipped inside iframes and when the page already has a .hub-bar. */
(function () {
  if (window.top !== window.self || document.querySelector('.hub-bar')) return;
  var me = document.currentScript;
  var base = me ? new URL('./', me.src).href : './';
  var bar = document.createElement('header');
  bar.className = 'hub-bar';
  bar.innerHTML =
    '<div class="hub-bar-in">' +
      '<a class="hub-brand" href="' + base + '">' +
        '<span class="hub-mark" aria-hidden="true">' +
          '<svg width="18" height="18" viewBox="0 0 30 30" fill="none">' +
            '<path d="M15 6 24 22H6z" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>' +
            '<circle cx="15" cy="17" r="2.2" fill="#fff"/>' +
          '</svg>' +
        '</span>' +
        '<span>Scheme Hub 2026</span>' +
      '</a>' +
      (/\/tools\//.test(location.pathname)
        ? '<nav class="hub-links">' +
            '<a href="' + base + 'tools/index.html">Tools</a>' +
            '<a href="' + base + '">Open app</a>' +
          '</nav>'
        : '') +
    '</div>';
  function mount() {
    document.body.insertBefore(bar, document.body.firstChild);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
