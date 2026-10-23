// start.js – Startscreen = Schritt 1 "Datei wählen". Zustände: leer (Dropzone),
// Drag-over, "Wird geöffnet …", 1 Datei (große Vorschau), mehrere Dateien
// (Streifen), Fehlerkarte. Nach der Wahl gleitet der geteilte Button ein:
// Hauptteil = vorgeschlagene Aktion, ▾ = Aktionen-Menü (Bottom Sheet).
// Beim ersten Mal erscheint einmalig der Hinweis "Weitere Aktionen".

import { el, humanSize } from "./shared.js";
import { icon } from "./icons.js";
import { oeffneDatei, freigeben, aktionenFuer, AKTIONEN, OeffnenFehler } from "./intake.js";
import { oeffneSheet, sheetIstOffen, zeigeToast, ansage } from "./ui.js";

const HINWEIS_KEY = "fk-hinweis-weitere-aktionen";

const app = document.getElementById("app");
const zone = document.getElementById("zone");
const dropzone = document.getElementById("dropzone");
const dateiwahl = document.getElementById("dateiwahl");

const zustand = {
  dateien: [],    // geöffnete Dateien (Einträge aus intake.js)
  oeffnet: false, // gerade werden Dateien geöffnet
};

let beiAktion = () => {};
let wahlHinzufuegen = false; // öffnet die Dateiwahl zum Ersetzen oder Hinzufügen?
let ansicht = null;          // Elemente der Dateiansicht: { vorschau, mehr, dock, splitMain, ... }
let fehlerKarte = null;

// --- Texte ---

const seitenText = (n) => (n === 1 ? "1 Seite" : `${n} Seiten`);

// "2 Bilder, 1 PDF"
function zusammensetzung(dateien) {
  const pdfs = dateien.filter((d) => d.art === "pdf").length;
  const bilder = dateien.length - pdfs;
  const teile = [];
  if (bilder) teile.push(bilder === 1 ? "1 Bild" : `${bilder} Bilder`);
  if (pdfs) teile.push(pdfs === 1 ? "1 PDF" : `${pdfs} PDFs`);
  return teile.join(", ");
}

function kurzerName(name) {
  return name.length > 30 ? `${name.slice(0, 19)}…${name.slice(-9)}` : name;
}

const FEHLER = {
  geschuetzt: {
    ton: "danger", icon: "datei-geschuetzt",
    titel: "Diese Datei ist geschützt",
    text: "Das PDF hat ein Passwort. Geschützte PDFs kann FileKit nicht öffnen.",
    kurz: (n) => `„${n}“ ist geschützt und wurde nicht hinzugefügt.`,
  },
  beschaedigt: {
    ton: "danger", icon: "datei-beschaedigt",
    titel: "Datei lässt sich nicht öffnen",
    text: "Die Datei ist beschädigt oder unvollständig. Versuche es mit einer anderen Kopie.",
    kurz: (n) => `„${n}“ lässt sich nicht öffnen.`,
  },
  format: {
    ton: "warning", icon: "datei-unbekannt",
    titel: "Dieses Format geht leider nicht",
    text: "FileKit kann PDFs und Bilder (z. B. JPG, PNG, WebP) öffnen.",
    kurz: (n) => `„${n}“: Dieses Format geht leider nicht.`,
  },
};

// --- Dateien wählen und öffnen ---

function waehleVomGeraet(hinzufuegen) {
  if (zustand.oeffnet) return;
  wahlHinzufuegen = hinzufuegen;
  dateiwahl.click();
}

async function waehle(files, hinzufuegen) {
  if (zustand.oeffnet || !files.length) return;
  zustand.oeffnet = true;
  if (!hinzufuegen) zeigeLeer();
  zeigeBeschaeftigt(true, hinzufuegen);
  ansage("Wird geöffnet …");

  const neu = [];
  const fehler = [];
  for (const f of files) {
    try {
      neu.push(await oeffneDatei(f));
    } catch (e) {
      fehler.push(e instanceof OeffnenFehler ? e : new OeffnenFehler("beschaedigt", f));
    }
  }

  zustand.oeffnet = false;
  zeigeBeschaeftigt(false, hinzufuegen);
  const ersteWahl = zustand.dateien.length === 0;
  zustand.dateien.push(...neu);

  if (!zustand.dateien.length) {
    zeigeFehler(fehler);
    return;
  }
  zeigeDateien(ersteWahl);
  if (fehler.length === 1) zeigeToast(FEHLER[fehler[0].art].kurz(kurzerName(fehler[0].datei.name)));
  else if (fehler.length > 1) zeigeToast(`${fehler.length} Dateien ließen sich nicht öffnen.`);
  if (neu.length) ansage(beschreibeAuswahl());
}

function beschreibeAuswahl() {
  const d = zustand.dateien;
  if (d.length === 1) return `${d[0].file.name} gewählt, ${seitenText(d[0].seiten)}.`;
  return `${d.length} Dateien gewählt: ${zusammensetzung(d)}.`;
}

function entferne(id) {
  const i = zustand.dateien.findIndex((d) => d.id === id);
  if (i < 0) return;
  freigeben(zustand.dateien[i]);
  zustand.dateien.splice(i, 1);
  if (zustand.dateien.length) {
    zeigeDateien(false);
    ansage(`Datei entfernt. ${beschreibeAuswahl()}`);
  } else {
    zeigeLeer(true);
    dropzone.focus();
    ansage("Datei entfernt. Keine Datei gewählt.");
  }
}

// --- Zustände anzeigen ---

function zeigeBeschaeftigt(an, hinzufuegen) {
  if (hinzufuegen && ansicht) {
    const m = ansicht.mehr;
    m.setAttribute("aria-disabled", String(an));
    m.replaceChildren(
      an ? el("span", "spinner") : icon("hinzufuegen", 18, 2.2),
      el("span", null, an ? "Wird geöffnet …" : "Weitere Dateien hinzufügen")
    );
  } else {
    dropzone.classList.toggle("is-busy", an);
    dropzone.setAttribute("aria-busy", String(an));
  }
}

// Leerer Startscreen (Dropzone). neu = Dropzone kurz einblenden.
function zeigeLeer(neu = false) {
  if (ansicht) {
    ansicht.vorschau.remove();
    ansicht.mehr.remove();
    ansicht.dock.remove();
    ansicht = null;
  }
  if (fehlerKarte) {
    fehlerKarte.remove();
    fehlerKarte = null;
  }
  zustand.dateien.forEach(freigeben);
  zustand.dateien = [];
  app.classList.remove("has-files", "has-error", "ist-zurueck");
  dropzone.hidden = false;
  if (neu) {
    dropzone.classList.remove("is-neu");
    void dropzone.offsetWidth; // Animation neu starten
    dropzone.classList.add("is-neu");
  }
}

function zeigeFehler(fehler) {
  zeigeLeer();
  const f = fehler[0];
  const info = FEHLER[f.art];

  const karte = el("section", `card start-fehler is-${info.ton}`);
  karte.setAttribute("role", "alert");
  const ic = el("span", "fehler-ic");
  ic.append(icon(info.icon, 28, 1.9));
  const datei = el("span", "fehler-datei t-s t-muted");
  const weitere = fehler.length > 1 ? ` und ${fehler.length - 1} weitere` : "";
  datei.append(icon("datei", 14, 2), el("span", null, kurzerName(f.datei.name) + weitere));
  const knopf = el("button", "btn btn-primary btn-block", "Andere Datei wählen");
  knopf.type = "button";
  knopf.addEventListener("click", () => waehleVomGeraet(false));
  karte.append(ic, el("h2", "t-h", info.titel), el("p", "t-body t-2", info.text), datei, knopf);

  dropzone.hidden = true;
  zone.append(karte);
  fehlerKarte = karte;
  app.classList.add("has-error");
  knopf.focus({ preventScroll: true });
}

// Dateiansicht: Vorschau (1 Datei / mehrere), "Weitere Dateien hinzufügen",
// geteilter Button. ersteWahl = Verwandlung der Dropzone mit voller Animation.
function zeigeDateien(ersteWahl) {
  if (fehlerKarte) {
    fehlerKarte.remove();
    fehlerKarte = null;
  }
  dropzone.hidden = true;
  dropzone.classList.remove("is-over");
  app.classList.remove("has-error", "ist-zurueck");
  app.classList.add("has-files");

  const vorschau = zustand.dateien.length === 1
    ? baueEinzel(zustand.dateien[0], ersteWahl)
    : baueMehrere(zustand.dateien, ersteWahl);

  if (!ansicht) {
    ansicht = baueAnsicht();
    zone.append(vorschau, ansicht.mehr, ansicht.dock);
  } else {
    ansicht.vorschau.replaceWith(vorschau);
  }
  ansicht.vorschau = vorschau;

  const { vorschlag } = aktionenFuer(zustand.dateien);
  const aktion = AKTIONEN.find((a) => a.id === vorschlag);
  ansicht.vorschlag = vorschlag;
  ansicht.splitMain.replaceChildren(icon(aktion.icon, 20, 2.1), el("span", null, aktion.titel));
  if (ansicht.coachText) ansicht.coachText.textContent = hinweisText(vorschlag);

  // Fokus auf den Haupt-Button, wenn er sonst verloren ginge (z. B. × entfernt).
  const fokusWeg = !document.activeElement || document.activeElement === document.body;
  if (ersteWahl || fokusWeg) ansicht.splitMain.focus({ preventScroll: true });
}

function vorschauBild(d) {
  const img = el("img");
  img.src = d.vorschau;
  img.alt = "";
  img.decoding = "async";
  img.draggable = false;
  return img;
}

function entfernenKnopf(label, klasse, groesse, id) {
  const knopf = el("button", `icon-btn glass ${klasse}`);
  knopf.type = "button";
  knopf.setAttribute("aria-label", label);
  knopf.append(icon("schliessen", groesse, groesse < 18 ? 2.2 : 2));
  knopf.addEventListener("click", () => entferne(id));
  return knopf;
}

// Eine Datei: große Vorschau der ersten Seite bzw. des Bildes.
function baueEinzel(d, anim) {
  const sek = el("section", `preview start-preview ${anim ? "in-card" : "in-fade"}`);
  sek.setAttribute("aria-label", `Vorschau von ${d.file.name}`);

  const kopf = el("div", "preview-kopf");
  const zeile = el("div", "preview-zeile");
  const name = el("p", "t-h preview-name", d.file.name);
  name.title = d.file.name;
  zeile.append(el("span", "tag", d.format), name,
    el("p", "t-body t-muted preview-groesse", humanSize(d.file.size)));
  kopf.append(zeile);

  const halo = el("span", `preview-halo${anim ? " in-halo" : ""}`);
  halo.setAttribute("aria-hidden", "true");

  const seite = el("div", `preview-page start-seite${anim ? " in-page" : ""}`);
  seite.style.setProperty("--r", d.verhaeltnis);
  seite.append(vorschauBild(d));

  const pill = el("span", `pill start-pill${anim ? " in-up d4" : ""}`,
    d.art === "pdf" ? `Seite 1 von ${d.seiten}` : `${d.breite} × ${d.hoehe} px`);

  sek.append(kopf, halo, seite, pill, entfernenKnopf("Datei entfernen", "start-weg", 18, d.id));
  return sek;
}

// Mehrere Dateien: Kopf mit Anzahl/Größe, darunter ein Streifen mit allen Dateien.
function baueMehrere(dateien, anim) {
  const sek = el("section", `preview start-preview is-multi ${anim ? "in-card" : "in-fade"}`);
  sek.setAttribute("aria-label", "Gewählte Dateien");

  const summe = dateien.reduce((s, d) => s + d.file.size, 0);
  const kopf = el("div", "preview-kopf is-multi");
  kopf.append(el("p", "t-h", `${dateien.length} Dateien · ${humanSize(summe)}`),
    el("p", "t-body t-muted", zusammensetzung(dateien)));

  const halo = el("span", `preview-halo${anim ? " in-halo" : ""}`);
  halo.setAttribute("aria-hidden", "true");

  const streifen = el("ul", "strip");
  dateien.forEach((d, i) => {
    const li = el("li", anim ? `in-page d${Math.min(i + 1, 6)}` : null);
    const info = el("div", "strip-info");
    const name = el("span", "t-s strip-name", d.file.name);
    name.title = d.file.name;
    info.append(name, el("span", "t-xs t-muted", humanSize(d.file.size)));
    const seite = el("div", "preview-page strip-seite");
    seite.style.setProperty("--r", d.verhaeltnis);
    seite.append(vorschauBild(d), el("span", "pill strip-pill", seitenText(d.seiten)),
      entfernenKnopf(`${d.file.name} entfernen`, "strip-weg", 16, d.id));
    li.append(info, seite);
    streifen.append(li);
  });

  sek.append(kopf, halo, streifen);
  return sek;
}

// "Weitere Dateien hinzufügen" + Dock mit geteiltem Button (+ einmaliger Hinweis).
function baueAnsicht() {
  const mehr = el("button", "btn-link start-mehr in-up d3");
  mehr.type = "button";
  mehr.append(icon("hinzufuegen", 18, 2.2), el("span", null, "Weitere Dateien hinzufügen"));
  mehr.addEventListener("click", () => {
    if (mehr.getAttribute("aria-disabled") !== "true") waehleVomGeraet(true);
  });

  const dock = el("div", "start-dock in-dock");
  const split = el("div", "split");
  split.setAttribute("role", "group");
  split.setAttribute("aria-label", "Aktion");
  const splitMain = el("button", "split-main");
  splitMain.type = "button";
  const trenner = el("span", "split-div");
  trenner.setAttribute("aria-hidden", "true");
  const splitMore = el("button", "split-more");
  splitMore.type = "button";
  splitMore.setAttribute("aria-label", "Weitere Aktionen");
  splitMore.setAttribute("aria-haspopup", "dialog");
  splitMore.append(icon("aufklappen", 20, 2.1));
  split.append(splitMain, trenner, splitMore);
  dock.append(split);

  const teile = { mehr, dock, splitMain, coachText: null };

  splitMain.addEventListener("click", () => beiAktion(teile.vorschlag, zustand.dateien));
  splitMore.addEventListener("click", () => {
    hinweisWeg();
    oeffneAktionen(splitMore);
  });

  if (!hinweisGesehen()) {
    const puls = el("span", "pulse start-puls");
    puls.setAttribute("aria-hidden", "true");
    const coach = el("div", "coach start-coach");
    coach.setAttribute("role", "dialog");
    coach.setAttribute("aria-label", "Hinweis");
    const text = el("p", "coach-text");
    const reihe = el("div", "coach-reihe");
    const ok = el("button", "btn-link", "Verstanden");
    ok.type = "button";
    ok.addEventListener("click", () => {
      hinweisWeg();
      splitMore.focus();
    });
    reihe.append(ok);
    const pfeil = el("span", "coach-arrow");
    pfeil.setAttribute("aria-hidden", "true");
    coach.append(el("p", "coach-titel", "Weitere Aktionen"), text, reihe, pfeil);
    dock.append(puls, coach);
    Object.assign(teile, { coach, puls, coachText: text });
  }
  return teile;
}

// --- Einmaliger Hinweis "Weitere Aktionen" ---

function hinweisGesehen() {
  try { return localStorage.getItem(HINWEIS_KEY) === "1"; } catch { return false; }
}

function hinweisText(vorschlag) {
  const namen = AKTIONEN.filter((a) => a.id !== vorschlag).map((a) => a.titel);
  return `Hier findest du ${namen.slice(0, -1).join(", ")} und ${namen.at(-1)}.`;
}

function hinweisWeg() {
  try { localStorage.setItem(HINWEIS_KEY, "1"); } catch {}
  if (!ansicht || !ansicht.coach) return;
  ansicht.coach.remove();
  ansicht.puls.remove();
  ansicht.coach = ansicht.puls = ansicht.coachText = null;
}

// --- Aktionen-Menü (Bottom Sheet) ---

function oeffneAktionen(ausloeser) {
  const { vorschlag, liste } = aktionenFuer(zustand.dateien);
  const box = el("div", "sheet-liste");
  let sheet = null;

  for (const a of liste) {
    const zeile = el("button", "mrow");
    zeile.type = "button";
    const ic = el("span", "mrow-ic");
    ic.append(icon(a.icon, 22, 1.9));
    const tx = el("span", "mrow-tx");
    const titel = el("span", "mrow-t", a.titel);

    if (a.grund) {
      zeile.classList.add("is-disabled");
      zeile.setAttribute("aria-disabled", "true");
      const warum = el("span", "mrow-why");
      warum.append(icon("info", 15, 2), el("span", null, a.grund));
      tx.append(titel, warum);
    } else {
      if (a.id === vorschlag) {
        zeile.classList.add("is-suggested");
        titel.append(el("span", "badge badge-accent", "Vorschlag"));
      }
      tx.append(titel, el("span", "mrow-d", a.text));
      zeile.addEventListener("click", () => {
        sheet.schliessen();
        beiAktion(a.id, zustand.dateien);
      });
    }
    zeile.append(ic, tx);
    box.append(zeile);
  }

  sheet = oeffneSheet({ titel: "Was möchtest du tun?", unterzeile: sheetUnterzeile(), inhalt: box, ausloeser });
}

function sheetUnterzeile() {
  const d = zustand.dateien;
  if (d.length > 1) return `${d.length} Dateien · ${zusammensetzung(d)}`;
  const n = d[0];
  return `${n.file.name} · ${n.art === "pdf" ? seitenText(n.seiten) : humanSize(n.file.size)}`;
}

// --- Ziehen & Ablegen (Drop auf die ganze Seite) ---

let ziehTiefe = 0;

const ziehtDateien = (e) => e.dataTransfer && [...e.dataTransfer.types].includes("Files");

function setzeZiehen(an) {
  if (ansicht) {
    ansicht.vorschau.classList.toggle("is-over", an);
  } else {
    if (an && fehlerKarte) zeigeLeer();
    dropzone.classList.toggle("is-over", an);
  }
}

function initZiehen() {
  document.addEventListener("dragenter", (e) => {
    if (!ziehtDateien(e) || app.hidden || sheetIstOffen()) return;
    e.preventDefault();
    if (ziehTiefe++ === 0 && !zustand.oeffnet) setzeZiehen(true);
  });
  document.addEventListener("dragover", (e) => {
    if (!ziehtDateien(e)) return;
    e.preventDefault(); // sonst öffnet der Browser die Datei selbst
    e.dataTransfer.dropEffect = app.hidden || sheetIstOffen() ? "none" : "copy";
  });
  document.addEventListener("dragleave", (e) => {
    if (!ziehtDateien(e) || ziehTiefe === 0) return;
    if (--ziehTiefe === 0) setzeZiehen(false);
  });
  document.addEventListener("drop", (e) => {
    if (!ziehtDateien(e)) return;
    e.preventDefault();
    ziehTiefe = 0;
    setzeZiehen(false);
    if (app.hidden || sheetIstOffen()) return;
    waehle([...e.dataTransfer.files], zustand.dateien.length > 0);
  });
}

// --- Rückkehr aus dem Wizard ---

// leeren = true (Abbrechen): alles zurücksetzen. Sonst (Zurück aus Schritt 2)
// bleiben die Dateien gewählt und der Fokus liegt wieder auf dem Haupt-Button.
export function zurueckZumStart({ leeren }) {
  if (leeren || !ansicht) {
    zeigeLeer(true);
    dropzone.focus({ preventScroll: true });
  } else {
    app.classList.add("ist-zurueck"); // Einstiegs-Animationen nicht erneut abspielen
    ansicht.splitMain.focus({ preventScroll: true });
  }
}

// --- Start ---

// beiAktion(aktionId, dateien) wird aufgerufen, wenn eine Aktion gewählt wurde.
export function initStart(optionen) {
  beiAktion = optionen.beiAktion;
  dropzone.addEventListener("click", () => waehleVomGeraet(false));
  dateiwahl.addEventListener("change", () => {
    const files = [...dateiwahl.files];
    dateiwahl.value = ""; // dieselbe Datei später erneut wählbar
    waehle(files, wahlHinzufuegen);
  });
  initZiehen();
}
