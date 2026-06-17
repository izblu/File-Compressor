// service-worker.js – macht die App offline nutzbar und installierbar.
//
// Strategie ("cache first"): beim ersten Besuch werden die App-Dateien in einen
// Cache gelegt; danach werden Anfragen bevorzugt aus dem Cache beantwortet.
// So startet die App auch ohne Internet.

const CACHE = "komprimierer-v1";

// Die zur App gehörenden Dateien. Bei Änderungen die Versionsnummer oben
// erhöhen (z. B. v2), damit Browser die neue Fassung laden.
const DATEIEN = [
  "index.html",
  "styles.css",
  "app.js",
  "image.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

// Installieren: alle App-Dateien in den Cache laden.
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(DATEIEN)));
  self.skipWaiting();
});

// Aktivieren: alte Cache-Versionen aufräumen.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((namen) =>
        Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
      )
  );
  self.clients.claim();
});

// Jede Anfrage: zuerst im Cache nachsehen, sonst aus dem Netz holen.
// Wenn beides fehlschlägt (offline + nicht im Cache), bei Seitenaufrufen
// ersatzweise index.html liefern.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((treffer) => {
      if (treffer) return treffer;
      return fetch(e.request).catch(() => {
        if (e.request.mode === "navigate") return caches.match("index.html");
      });
    })
  );
});
