// app.js – Steuerung der Oberfläche.
// Verbindet Auswahl/Stufe aus index.html mit der Kompressionslogik und zeigt
// die Ergebnisse als Karten an. Bilder laufen über image.js (Canvas), PDFs
// über pdf.js (wird erst bei Bedarf nachgeladen).

import { compressImage } from "./image.js";

// Dieselben drei Qualitätsstufen wie in compress.py (LEVELS).
const LEVELS = {
  1: { name: "Stark",    maxSide: 1000, quality: 50 },
  2: { name: "Mittel",   maxSide: 1600, quality: 70 },
  3: { name: "Schonend", maxSide: 2200, quality: 85 },
};

// --- Elemente aus dem HTML ---
const dateiEingabe  = document.getElementById("dateiEingabe");
const dropZone      = document.getElementById("dropZone");
const ergebnisKarte = document.getElementById("ergebnisKarte");
const ergebnisListe = document.getElementById("ergebnisse");
const aktionsleiste = document.getElementById("aktionsleiste");
const leisteText    = document.getElementById("leisteText");
const alleLadenBtn  = document.getElementById("alleLaden");

// --- Zustand ---
const fertige = [];        // { blob, name, alt, neu }
let aktuelleDateien = [];  // zuletzt gewählte Dateien (für Stufenwechsel)
let vorschauUrls = [];     // Object-URLs der Thumbnails (zum Freigeben)
let laeuft = false;        // verhindert parallele Durchläufe

const LADE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>';

// --- kleine Helfer ---

// Bytes in lesbare Größe umwandeln (wie human_size in compress.py).
function humanSize(bytes) {
  let size = bytes;
  for (const einheit of ["B", "KB", "MB", "GB"]) {
    if (size < 1024) return `${size.toFixed(1)} ${einheit}`;
    size /= 1024;
  }
  return `${size.toFixed(1)} TB`;
}

// Aktuell gewählte Qualitätsstufe (1/2/3) auslesen.
function gewaehlteStufe() {
  const treffer = document.querySelector('input[name="stufe"]:checked');
  return Number(treffer ? treffer.value : 2);
}

// Kurzschreibweise zum Erzeugen eines HTML-Elements.
function el(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text != null) e.textContent = text;
  return e;
}

// Eine Datei (Blob) als Download anbieten. Auf dem Handy landet sie im
// Downloads-Ordner; am PC öffnet sich der "Speichern unter"-Dialog.
function ladeHerunter(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = el("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// --- Ergebnis-Karten ---

// Legt eine neue Karte im Status "wird verarbeitet" an und gibt Griffe darauf zurück.
function neueKarte(datei, istPdf) {
  ergebnisKarte.hidden = false;

  const root   = el("div", "ergebnis");
  const thumb  = istPdf ? el("div", "thumb thumb--pdf", "PDF") : el("div", "thumb");
  const info   = el("div", "ergebnis-info");
  const name   = el("div", "ergebnis-name", datei.name);
  const meta   = el("div", "ergebnis-meta");
  const status = el("span", "ergebnis-status", istPdf ? "PDF wird geladen …" : "wird verarbeitet …");
  meta.append(status);
  const balken = el("div", "balken");
  const fuell  = el("div", "balken-fuell");
  fuell.style.width = "100%";
  balken.append(fuell);
  info.append(name, meta, balken);
  const aktion = el("div", "ergebnis-aktion");
  aktion.append(el("div", "spinner"));
  root.append(thumb, info, aktion);
  ergebnisListe.append(root);

  return { root, thumb, status, meta, fuell, aktion };
}

// Fortschritt bei PDFs: "Seite x / y" + Balken füllen.
function fortschrittPdf(h, seite, anzahl) {
  h.status.textContent = `Seite ${seite} / ${anzahl}`;
  h.fuell.style.width = `${Math.round((seite / anzahl) * 100)}%`;
}

// Erfolgreiches Ergebnis: Größen, Ersparnis-Badge, Vorschau und Download-Knopf.
function zeigeErfolg(h, datei, ergebnis, istPdf) {
  const neu = ergebnis.blob.size;
  const alt = datei.size;
  const prozent = Math.max(0, Math.round((1 - neu / alt) * 100));

  h.status.textContent = `${humanSize(alt)} → ${humanSize(neu)}`;
  h.meta.append(el("span", "badge badge--success", `−${prozent} %`));
  h.fuell.style.width = `${Math.max(3, Math.round((neu / alt) * 100))}%`;

  // Vorschaubild (nur bei Bildern – zeigt das komprimierte Ergebnis).
  if (!istPdf) {
    const url = URL.createObjectURL(ergebnis.blob);
    vorschauUrls.push(url);
    h.thumb.style.backgroundImage = `url("${url}")`;
    h.thumb.style.backgroundSize = "cover";
    h.thumb.style.backgroundPosition = "center";
    h.thumb.textContent = "";
  }

  const knopf = el("button", "knopf klein");
  knopf.innerHTML = LADE_ICON + "Laden";
  knopf.addEventListener("click", () => ladeHerunter(ergebnis.blob, ergebnis.name));
  h.aktion.replaceChildren(knopf);
}

// Hinweis statt Ergebnis: "kein Gewinn" (neutral) oder "Fehler" (rot).
function zeigeHinweis(h, text, art) {
  h.status.textContent = text;
  const istFehler = art === "fehler";
  h.meta.append(el("span", `badge badge--${istFehler ? "fehler" : "neutral"}`,
    istFehler ? "Fehler" : "kein Gewinn"));
  h.fuell.style.width = "100%";
  h.aktion.replaceChildren();
  h.root.classList.add("kein-ergebnis");
}

// Aktionsbalken unten aktualisieren (Gesamt-Ersparnis + "Alle herunterladen").
function aktualisiereLeiste() {
  if (fertige.length === 0) {
    aktionsleiste.hidden = true;
    return;
  }
  aktionsleiste.hidden = false;

  const alt = fertige.reduce((s, f) => s + f.alt, 0);
  const neu = fertige.reduce((s, f) => s + f.neu, 0);
  const prozent = Math.max(0, Math.round((1 - neu / alt) * 100));
  const wort = fertige.length === 1 ? "Datei" : "Dateien";
  leisteText.textContent =
    `${fertige.length} ${wort} · ${humanSize(alt)} → ${humanSize(neu)} (−${prozent} %)`;

  alleLadenBtn.hidden = fertige.length < 2;
  alleLadenBtn.textContent = `Alle herunterladen (${fertige.length})`;
}

// --- Hauptablauf ---

async function verarbeite(dateien) {
  if (laeuft) return;
  laeuft = true;
  aktuelleDateien = dateien;

  // Zurücksetzen.
  ergebnisListe.replaceChildren();
  fertige.length = 0;
  vorschauUrls.forEach((u) => URL.revokeObjectURL(u));
  vorschauUrls = [];
  aktionsleiste.hidden = true;

  const cfg = LEVELS[gewaehlteStufe()];

  for (const datei of dateien) {
    const istPdf =
      datei.type === "application/pdf" || datei.name.toLowerCase().endsWith(".pdf");
    const h = neueKarte(datei, istPdf);

    // Dem Browser kurz Zeit zum Zeichnen geben (Spinner/Status wird sichtbar).
    await new Promise((r) => setTimeout(r));

    try {
      let ergebnis;
      if (istPdf) {
        // pdf.js (~1,4 MB) erst beim ersten PDF laden.
        const { compressPdf } = await import("./pdf.js");
        ergebnis = await compressPdf(datei, cfg, (s, n) => fortschrittPdf(h, s, n));
      } else {
        ergebnis = await compressImage(datei, cfg);
      }

      if (!ergebnis) {
        zeigeHinweis(h, "keine Einsparung – Original behalten", "neutral");
      } else {
        zeigeErfolg(h, datei, ergebnis, istPdf);
        fertige.push({
          blob: ergebnis.blob,
          name: ergebnis.name,
          alt: datei.size,
          neu: ergebnis.blob.size,
        });
      }
    } catch (e) {
      zeigeHinweis(h, `Fehler: ${e && e.message ? e.message : e}`, "fehler");
    }

    aktualisiereLeiste();
  }

  laeuft = false;
}

// --- Ereignisse verknüpfen ---

dateiEingabe.addEventListener("change", () => {
  if (dateiEingabe.files.length) verarbeite([...dateiEingabe.files]);
});

// Drag & Drop (vor allem am PC). Verhindert, dass der Browser die Datei öffnet.
["dragover", "dragenter"].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropZone.classList.add("aktiv");
  })
);
["dragleave", "dragend"].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropZone.classList.remove("aktiv");
  })
);
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("aktiv");
  const dateien = [...(e.dataTransfer ? e.dataTransfer.files : [])];
  if (dateien.length) verarbeite(dateien);
});

// Stufenwechsel merken und bereits gewählte Dateien sofort neu verarbeiten.
document.querySelectorAll('input[name="stufe"]').forEach((radio) =>
  radio.addEventListener("change", () => {
    try { localStorage.setItem("stufe", String(gewaehlteStufe())); } catch {}
    if (aktuelleDateien.length && !laeuft) verarbeite(aktuelleDateien);
  })
);

// Zuletzt gewählte Stufe wiederherstellen.
try {
  const gespeichert = localStorage.getItem("stufe");
  if (gespeichert && LEVELS[gespeichert]) {
    const r = document.querySelector(`input[name="stufe"][value="${gespeichert}"]`);
    if (r) r.checked = true;
  }
} catch {}

// "Alle herunterladen": leicht zeitversetzt, sonst lässt der Browser nur den
// ersten Download zu.
alleLadenBtn.addEventListener("click", () => {
  fertige.forEach((f, i) => setTimeout(() => ladeHerunter(f.blob, f.name), i * 350));
});

// --- Service-Worker registrieren (macht die App offline-fähig/installierbar) ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((e) => console.warn("Service-Worker nicht registriert:", e));
  });
}
