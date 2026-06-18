// app.js – Steuerung der Oberfläche: Modus-Umschaltung (untere Navigation) und
// der Modus "Verkleinern". Bilder über image.js (Canvas), PDFs über pdf.js.
// "Zusammenführen" und "Trennen" liegen in merge.js / split.js und werden erst
// beim ersten Öffnen des jeweiligen Tabs geladen.

import { compressImage } from "./image.js";
import { humanSize, el, ladeHerunter, LADE_ICON, setzeAktion } from "./shared.js";

// Dieselben drei Qualitätsstufen wie in compress.py (LEVELS).
const LEVELS = {
  1: { name: "Stark",    maxSide: 1000, quality: 50 },
  2: { name: "Mittel",   maxSide: 1600, quality: 70 },
  3: { name: "Schonend", maxSide: 2200, quality: 85 },
};

// --- Elemente für "Verkleinern" ---
const dateiEingabe  = document.getElementById("dateiEingabe");
const dropZone      = document.getElementById("dropZone");
const ergebnisKarte = document.getElementById("ergebnisKarte");
const ergebnisListe = document.getElementById("ergebnisse");

// --- Zustand "Verkleinern" ---
const fertige = [];        // { blob, name, alt, neu }
let aktuelleDateien = [];  // zuletzt gewählte Dateien (für Stufenwechsel)
let vorschauUrls = [];     // Object-URLs der Thumbnails (zum Freigeben)
let laeuft = false;        // verhindert parallele Durchläufe

// Aktuell gewählte Qualitätsstufe (1/2/3).
function gewaehlteStufe() {
  const treffer = document.querySelector('input[name="stufe"]:checked');
  return Number(treffer ? treffer.value : 2);
}

// --- Ergebnis-Karten ---

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

function fortschrittPdf(h, seite, anzahl) {
  h.status.textContent = `Seite ${seite} / ${anzahl}`;
  h.fuell.style.width = `${Math.round((seite / anzahl) * 100)}%`;
}

function zeigeErfolg(h, datei, ergebnis, istPdf) {
  const neu = ergebnis.blob.size;
  const alt = datei.size;
  const prozent = Math.max(0, Math.round((1 - neu / alt) * 100));

  h.status.textContent = `${humanSize(alt)} → ${humanSize(neu)}`;
  h.meta.append(el("span", "badge badge--success", `−${prozent} %`));
  h.fuell.style.width = `${Math.max(3, Math.round((neu / alt) * 100))}%`;

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

function zeigeHinweis(h, text, art) {
  h.status.textContent = text;
  const istFehler = art === "fehler";
  h.meta.append(el("span", `badge badge--${istFehler ? "fehler" : "neutral"}`,
    istFehler ? "Fehler" : "kein Gewinn"));
  h.fuell.style.width = "100%";
  h.aktion.replaceChildren();
  h.root.classList.add("kein-ergebnis");
}

// Aktionsleiste für "Verkleinern" (Gesamt-Ersparnis + "Alle herunterladen").
function aktualisiereCompressAktion() {
  if (fertige.length === 0) {
    setzeAktion(null, "verkleinern");
    return;
  }
  const alt = fertige.reduce((s, f) => s + f.alt, 0);
  const neu = fertige.reduce((s, f) => s + f.neu, 0);
  const prozent = Math.max(0, Math.round((1 - neu / alt) * 100));
  const wort = fertige.length === 1 ? "Datei" : "Dateien";
  const text = el("span", "leiste-text",
    `${fertige.length} ${wort} · ${humanSize(alt)} → ${humanSize(neu)} (−${prozent} %)`);

  if (fertige.length >= 2) {
    const btn = el("button", "knopf");
    btn.textContent = `Alle herunterladen (${fertige.length})`;
    btn.addEventListener("click", () =>
      fertige.forEach((f, i) => setTimeout(() => ladeHerunter(f.blob, f.name), i * 350)));
    setzeAktion([text, btn], "verkleinern");
  } else {
    setzeAktion(text, "verkleinern");
  }
}

// --- Hauptablauf "Verkleinern" ---

async function verarbeite(dateien) {
  if (laeuft) return;
  laeuft = true;
  aktuelleDateien = dateien;

  ergebnisListe.replaceChildren();
  fertige.length = 0;
  vorschauUrls.forEach((u) => URL.revokeObjectURL(u));
  vorschauUrls = [];
  setzeAktion(null, "verkleinern");

  const cfg = LEVELS[gewaehlteStufe()];

  for (const datei of dateien) {
    const istPdf =
      datei.type === "application/pdf" || datei.name.toLowerCase().endsWith(".pdf");
    const h = neueKarte(datei, istPdf);
    await new Promise((r) => setTimeout(r));

    try {
      let ergebnis;
      if (istPdf) {
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

    aktualisiereCompressAktion();
  }

  laeuft = false;
}

// --- Ereignisse "Verkleinern" ---

dateiEingabe.addEventListener("change", () => {
  if (dateiEingabe.files.length) verarbeite([...dateiEingabe.files]);
});

["dragover", "dragenter"].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add("aktiv"); })
);
["dragleave", "dragend"].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove("aktiv"); })
);
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("aktiv");
  const dateien = [...(e.dataTransfer ? e.dataTransfer.files : [])];
  if (dateien.length) verarbeite(dateien);
});

document.querySelectorAll('input[name="stufe"]').forEach((radio) =>
  radio.addEventListener("change", () => {
    try { localStorage.setItem("stufe", String(gewaehlteStufe())); } catch {}
    if (aktuelleDateien.length && !laeuft) verarbeite(aktuelleDateien);
  })
);

try {
  const gespeichert = localStorage.getItem("stufe");
  if (gespeichert && LEVELS[gespeichert]) {
    const r = document.querySelector(`input[name="stufe"][value="${gespeichert}"]`);
    if (r) r.checked = true;
  }
} catch {}

// --- Modus-Umschaltung (untere Navigation) ---

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
const initialisiert = {}; // merkt sich, ob merge/split schon geladen wurden

async function setzeModus(neu) {
  tabs.forEach((t) => {
    const aktiv = t.dataset.modus === neu;
    t.classList.toggle("aktiv", aktiv);
    if (aktiv) t.setAttribute("aria-current", "page");
    else t.removeAttribute("aria-current");
  });
  panels.forEach((p) => { p.hidden = p.dataset.modus !== neu; });

  setzeAktion(null); // Leiste zunächst leeren – der Modus füllt sie gleich neu

  if (neu === "zusammenfuehren" && !initialisiert.merge) {
    initialisiert.merge = (await import("./merge.js")).initMerge();
  }
  if (neu === "trennen" && !initialisiert.split) {
    initialisiert.split = (await import("./split.js")).initSplit();
  }

  if (neu === "verkleinern") aktualisiereCompressAktion();
  else if (neu === "zusammenfuehren") initialisiert.merge.aktualisiere();
  else if (neu === "trennen") initialisiert.split.aktualisiere();
}

tabs.forEach((t) => t.addEventListener("click", () => setzeModus(t.dataset.modus)));

// --- Service-Worker registrieren ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((e) => console.warn("Service-Worker nicht registriert:", e));
  });
}
