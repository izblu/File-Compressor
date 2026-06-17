// app.js – Steuerung der Oberfläche.
// Verbindet die Buttons/Eingaben aus index.html mit der Kompressionslogik.

import { compressImage } from "./image.js";
// PDF-Unterstützung wird in Etappe 4 ergänzt:
// import { compressPdf } from "./pdf.js";

// Dieselben drei Qualitätsstufen wie in compress.py (LEVELS).
const LEVELS = {
  1: { name: "Stark",    maxSide: 1000, quality: 50 },
  2: { name: "Mittel",   maxSide: 1600, quality: 70 },
  3: { name: "Schonend", maxSide: 2200, quality: 85 },
};

// --- Elemente aus dem HTML einsammeln ---
const dateiEingabe   = document.getElementById("dateiEingabe");
const dropZone       = document.getElementById("dropZone");
const ergebnisKarte  = document.getElementById("ergebnisKarte");
const ergebnisListe  = document.getElementById("ergebnisse");
const zusammenfassung = document.getElementById("zusammenfassung");
const alleLadenBtn   = document.getElementById("alleLaden");

// Sammelt die fertigen Ergebnisse (für "Alle herunterladen" + Statistik).
const fertige = [];

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

// --- Anzeige der Ergebnisse ---

// Legt eine neue Listenzeile für eine Datei an und zeigt die Ergebnis-Karte.
function neueZeile(name) {
  ergebnisKarte.hidden = false;
  const li = el("li", "ergebnis");
  const kopf = el("div", "ergebnis-name", name);
  const status = el("div", "ergebnis-status", "…");
  li.append(kopf, status);
  ergebnisListe.append(li);
  return { li, status };
}

// Erfolgreiches Ergebnis anzeigen: Größen, Ersparnis und Download-Knopf.
function zeigeErfolg(zeile, altBytes, ergebnis) {
  const neuBytes = ergebnis.blob.size;
  const prozent = Math.round((1 - neuBytes / altBytes) * 100);
  zeile.status.textContent =
    `${humanSize(altBytes)} → ${humanSize(neuBytes)}  (−${prozent} %)`;

  const knopf = el("button", "knopf klein", "Herunterladen");
  knopf.addEventListener("click", () => ladeHerunter(ergebnis.blob, ergebnis.name));
  zeile.li.append(knopf);
}

// Statt eines Ergebnisses einen Hinweis/Fehler anzeigen.
function zeigeHinweis(zeile, text) {
  zeile.status.textContent = text;
  zeile.li.classList.add("kein-ergebnis");
}

// Gesamt-Statistik unter der Liste aktualisieren.
function aktualisiereZusammenfassung() {
  alleLadenBtn.hidden = fertige.length < 2;
  if (fertige.length === 0) {
    zusammenfassung.textContent = "";
    return;
  }
  const alt = fertige.reduce((s, f) => s + f.alt, 0);
  const neu = fertige.reduce((s, f) => s + f.neu, 0);
  const prozent = Math.round((1 - neu / alt) * 100);
  zusammenfassung.textContent =
    `Fertig: ${fertige.length} Datei(en) verkleinert. ` +
    `Gesamt ${humanSize(alt)} → ${humanSize(neu)} (−${prozent} %).`;
}

// --- Hauptablauf ---

async function verarbeite(dateien) {
  // Vorherige Durchläufe zurücksetzen.
  ergebnisListe.replaceChildren();
  zusammenfassung.textContent = "";
  fertige.length = 0;

  const cfg = LEVELS[gewaehlteStufe()];

  for (const datei of dateien) {
    const zeile = neueZeile(datei.name);

    // Dem Browser kurz Zeit zum Zeichnen geben (Status "…" wird sichtbar).
    await new Promise((r) => setTimeout(r));

    const istPdf =
      datei.type === "application/pdf" ||
      datei.name.toLowerCase().endsWith(".pdf");

    try {
      if (istPdf) {
        // Kommt in Etappe 4.
        zeigeHinweis(zeile, "PDF-Unterstützung folgt in Kürze.");
        continue;
      }

      const ergebnis = await compressImage(datei, cfg);
      if (!ergebnis) {
        zeigeHinweis(zeile, "keine Einsparung möglich – Original behalten");
        continue;
      }

      zeigeErfolg(zeile, datei.size, ergebnis);
      fertige.push({ ...ergebnis, alt: datei.size, neu: ergebnis.blob.size });
    } catch (e) {
      zeigeHinweis(zeile, `Fehler: ${e.message || e}`);
    }
  }

  aktualisiereZusammenfassung();
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
["dragleave", "drop"].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropZone.classList.remove("aktiv");
  })
);
dropZone.addEventListener("drop", (e) => {
  const dateien = [...(e.dataTransfer ? e.dataTransfer.files : [])];
  if (dateien.length) verarbeite(dateien);
});

// "Alle herunterladen": leicht zeitversetzt, weil Browser sonst nur den
// ersten Download zulassen.
alleLadenBtn.addEventListener("click", () => {
  fertige.forEach((f, i) =>
    setTimeout(() => ladeHerunter(f.blob, f.name), i * 300)
  );
});

// --- Service-Worker registrieren (macht die App offline-fähig/installierbar) ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((e) => console.warn("Service-Worker nicht registriert:", e));
  });
}
