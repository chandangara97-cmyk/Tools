/* Scheme Hub 2026 - single sign-in guard for standalone pages.
   Include in <head> (classic script, no defer):  <script src="../auth-guard.js"></script>
   If nobody is signed in, the page is sent to the one login page (site root).
   Sign-in happens ONLY on that page; Firebase keeps the session for the whole site. */
(function () {
  var me = document.currentScript;
  var landing = me ? new URL('../', me.src).href : '../';   /* auth-guard.js lives in /app/, login is one level up */
  var root = document.documentElement;
  root.style.visibility = 'hidden';                          /* no flash of protected content */
  var show = function () { root.style.visibility = ''; };
  var go = function () { location.replace(landing); };
  var V = '11.0.0', B = 'https://www.gstatic.com/firebasejs/' + V + '/';
  Promise.all([import(B + 'firebase-app.js'), import(B + 'firebase-auth.js')]).then(function (m) {
    var app = m[0].initializeApp({
      apiKey: 'AIzaSyBJw_9j0wP1dY42wfYYDk_3kIMNKZqHujQ',
      authDomain: 'propertytax-1b855.firebaseapp.com',
      projectId: 'propertytax-1b855',
      appId: '1:1062167049262:web:1270c8199c81addce11bbf'
    }, 'guard');
    /* same apiKey = same stored session as the login page, but the guard keeps its own app name */
    m[1].onAuthStateChanged(m[1].getAuth(app), function (u) {
      if (u) { try { localStorage.setItem('hub_signed_in', '1'); } catch (e) {} show(); }
      else { try { localStorage.removeItem('hub_signed_in'); } catch (e) {} go(); }
    });
  }).catch(function () {
    /* offline and the Firebase script is not cached: allow only if this device signed in before */
    var ok = false; try { ok = localStorage.getItem('hub_signed_in') === '1'; } catch (e) {}
    ok ? show() : go();
  });
})();
