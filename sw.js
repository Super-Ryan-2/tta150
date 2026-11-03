/* TTA 150 — service worker : cache de l'app + des figures visitées (usage hors-ligne).
   VER doit être incrémenté à chaque changement de contenu du site (sinon les anciens caches restent). */
var VER = "tta150-v19";
var CORE = ["./", "./tta150-jeu.html"];
var NO_CACHE = ["TTA150-site.html", "images.json", "memento.pdf"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VER).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VER; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  var path = url.pathname;
  for (var i = 0; i < NO_CACHE.length; i++) if (path.indexOf(NO_CACHE[i]) >= 0) return; // trop gros ou jetable : transparent

  if (path.indexOf("/memento-imgs/") >= 0) {
    // figures : cache d'abord (relecture instantanée), mise à jour en arrière-plan
    e.respondWith(
      caches.open(VER).then(function (c) {
        var net = fetch(e.request).then(function (r) {
          if (r.ok) c.put(e.request, r.clone());
          return r;
        }).catch(function () { return null; });
        return c.match(e.request).then(function (hit) {
          return hit || net;
        });
      })
    );
    return;
  }

  // app & jeu : réseau d'abord (mises à jour), cache en repli hors-ligne
  e.respondWith(
    fetch(e.request).then(function (r) {
      if (r.ok && (r.headers.get("content-type") || "").indexOf("text/html") === 0) {
        caches.open(VER).then(function (c) { c.put(e.request, r.clone()); });
      }
      return r;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: true }).then(function (m) {
        return m || caches.match("./");
      });
    })
  );
});
