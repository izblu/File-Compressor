// service-worker.js – macht die App offline nutzbar und installierbar.
//
// Strategie ("cache first"): beim ersten Besuch werden die App-Dateien in einen
// Cache gelegt; danach werden Anfragen bevorzugt aus dem Cache beantwortet.
// So startet die App auch ohne Internet.

const CACHE = "filekit-v9";

// Die zur App gehörenden Dateien. Bei Änderungen die Versionsnummer oben
// erhöhen (z. B. v6), damit Browser die neue Fassung laden.
// Die großen Bibliotheken (lib/pdfjs/* ~1,4 MB, lib/pdf-lib.min.js ~0,5 MB)
// werden NICHT vorab geladen, sondern erst bei Bedarf zur Laufzeit gecacht
// (siehe fetch-Handler unten).
const DATEIEN = [
  "index.html",
  "filekit.css",
  "styles.css",
  "fonts/manrope-latin-wght-normal.woff2",
  "app.js",
  "start.js",
  "wizard.js",
  "flows.js",
  "flow-teile.js",
  "flow-verkleinern.js",
  "flow-umwandeln.js",
  "flow-trennen.js",
  "flow-ordnen.js",
  "editor.js",
  "vollbild.js",
  "intake.js",
  "ui.js",
  "icons.js",
  "shared.js",
  "thumbs.js",
  "save.js",
  "gespeichert.js",
  "compress.js",
  "convert.js",
  "split.js",
  "merge.js",
  "image.js",
  "pdf.js",
  "manifest.json",
  "icons/app-icon-klein.svg",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
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
// Erfolgreiche Antworten aus dem eigenen Ursprung werden zur Laufzeit
// mitgecacht – so landet z. B. die pdf.js-Bibliothek (~1,4 MB) nach dem ersten
// Laden im Cache und ist danach offline verfügbar.
// Wenn alles fehlschlägt (offline + nicht im Cache), bei Seitenaufrufen
// ersatzweise index.html liefern.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((treffer) => {
      if (treffer) return treffer;
      return fetch(e.request)
        .then((antwort) => {
          if (antwort.ok && new URL(e.request.url).origin === self.location.origin) {
            const kopie = antwort.clone();
            caches.open(CACHE).then((c) => c.put(e.request, kopie));
          }
          return antwort;
        })
        .catch(() => {
          if (e.request.mode === "navigate") return caches.match("index.html");
        });
    })
  );
});
