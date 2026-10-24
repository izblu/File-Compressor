// wizard.js – der Rahmen für alle Schritte ab "Schritt 2": Kopfzeile (Zurück ·
// Titel + "Schritt 2 von 3" · Abbrechen), Fortschrittsbalken, scrollender
// Inhalt (.fk-body) und Dock mit genau einem Haupt-Button.
//
// Zustand: { aktion, dateien, schritte, schritt, optionen, dirty, zwischen, lauf }.
// Jeder Schritt einer Aktion ist ein Objekt { titel, baue(ctx), breit? }; baue
// liefert { inhalt, dock } (je ein Element oder eine Liste von Elementen).
// breit = am PC über die volle Fensterbreite (nur der Seiten-Editor); alle
// anderen Schritte stehen in einer zentrierten Spalte.
//
// Verlauf: Jeder Schritt hat einen eigenen History-Eintrag. So ist
// Browser-Zurück (Android-Geste) dasselbe wie der Zurück-Pfeil.
//
// Zwischen-Screen: Während einer Verarbeitung zeigt ein Schritt einen eigenen
// Screen (ctx.zeigeZwischen) mit eigenem History-Eintrag. Zurück bricht die
// Verarbeitung ab und zeigt den Schritt wieder; geht es danach weiter, ersetzt
// der nächste Schritt den Eintrag des Zwischen-Screens.
//
// Abschluss: "Gespeichert ✓" (ctx.zeigeFertig) ist ein Zwischen-Screen ohne
// Kopfzeile – Zurück zeigt wieder den Speichern-Schritt, ctx.vonVorn
// ("Noch eine Datei bearbeiten") führt zum leeren Startscreen.
//
// ctx.signal wird abgebrochen, sobald die Ansicht wechselt (anderer Schritt,
// Zurück aus dem Zwischen-Screen, Abbrechen) – laufende Arbeit hört dann auf.
//
// Zurück (Pfeil, Browser, Android-Geste) schließt zuerst, was gerade offen ist:
// ein Sheet/Dialog oder das, was der Schritt über ctx.beiZurueck meldet (z. B.
// den Auswahlmodus im Seiten-Editor). Erst dann geht es einen Schritt zurück.

import { el } from "./shared.js";
import { icon } from "./icons.js";
import { oeffneDialog, schliesseOverlay, sheetIstOffen, ansage } from "./ui.js";

const start = document.getElementById("app");

let rahmen = null;      // Elemente: { wizard, kopf, reihe, titel, schrittText, balken, fortschritt, body, dock, zurueck, abbrechen, sonderKopf }
let z = null;           // Zustand des laufenden Wizards (null = Startscreen)
let beiEnde = () => {}; // zurück zum Startscreen: beiEnde({ leeren })

// --- Aufbau ---

function baueRahmen() {
  const wizard = el("div", "fk-app wizard");
  wizard.hidden = true;

  const kopf = el("header", "fk-top");
  const reihe = el("div", "fk-top-row");
  const zurueck = el("button", "icon-btn");
  zurueck.type = "button";
  zurueck.setAttribute("aria-label", "Zurück");
  zurueck.append(icon("zurueck", 22, 2));
  const titelBox = el("div", "fk-top-title");
  const titel = el("b");
  titel.tabIndex = -1; // bekommt nach jedem Schrittwechsel den Fokus
  const schrittText = el("span");
  titelBox.append(titel, schrittText);
  const abbrechen = el("button", "icon-btn fk-top-x");
  abbrechen.type = "button";
  abbrechen.setAttribute("aria-label", "Abbrechen");
  abbrechen.append(icon("schliessen", 20, 2));
  // Am PC in der breiten Ansicht (Seiten-Editor) steht "Abbrechen" als Text da.
  const abbrechenText = el("button", "btn btn-ghost btn-sm fk-top-abbrechen", "Abbrechen");
  abbrechenText.type = "button";
  reihe.append(zurueck, titelBox, abbrechen, abbrechenText);

  const fortschritt = el("div", "fk-progress");
  fortschritt.setAttribute("role", "progressbar");
  fortschritt.setAttribute("aria-valuemin", "1");
  const balken = el("i");
  fortschritt.append(balken);
  kopf.append(reihe, fortschritt);

  const body = el("main", "fk-body wizard-body");
  const dock = el("div", "fk-dock");
  wizard.append(kopf, body, dock);
  document.getElementById("ebene").before(wizard);

  zurueck.addEventListener("click", () => history.back());
  abbrechen.addEventListener("click", () => abbrechenMitRueckfrage(abbrechen));
  abbrechenText.addEventListener("click", () => abbrechenMitRueckfrage(abbrechenText));

  return { wizard, kopf, reihe, titel, schrittText, balken, fortschritt, body, dock, zurueck, abbrechen, sonderKopf: null };
}

// Eigene Kopfzeile für einen Modus im Schritt (z. B. "3 ausgewählt" mit ×
// links und "Alle" rechts); die Schritt-Anzeige bleibt. null = normale Kopfzeile.
function setzeKopf(teile) {
  if (rahmen.sonderKopf) {
    rahmen.sonderKopf.remove();
    rahmen.sonderKopf = null;
  }
  rahmen.reihe.hidden = Boolean(teile);
  if (!teile) return;
  const reihe = el("div", "fk-top-row");
  const titelBox = el("div", "fk-top-title");
  titelBox.append(teile.titel, el("span", null, rahmen.schrittText.textContent));
  const links = teile.links || el("span");
  const rechts = teile.rechts || el("span");
  rechts.classList.add("fk-top-rechts");
  reihe.append(links, titelBox, rechts);
  rahmen.reihe.after(reihe);
  rahmen.sonderKopf = reihe;
}

// Animation neu starten (Klasse entfernen, Reflow, wieder setzen).
function spieleAb(element, klasse) {
  element.classList.remove("in-step", "in-step-back", "in-fade");
  void element.offsetWidth;
  element.classList.add(klasse);
  element.addEventListener("animationend", () => element.classList.remove(klasse), { once: true });
}

const alsListe = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

// --- Schritte anzeigen ---

// Laufende Arbeit der bisherigen Ansicht beenden und eine neue beginnen.
function neuerLauf() {
  if (z.lauf) z.lauf.abort();
  z.lauf = new AbortController();
}

// richtung: "neu" (aus dem Startscreen), "vor" oder "zurueck".
function zeigeSchritt(index, richtung) {
  z.schritt = index;
  z.zwischen = false;
  z.beiZurueck = null;
  neuerLauf();
  setzeKopf(null);
  rahmen.kopf.hidden = false;
  const schritt = z.schritte[index];
  const nummer = index + 2;              // Schritt 1 ist immer "Datei wählen"
  const gesamt = z.schritte.length + 1;
  const text = `Schritt ${nummer} von ${gesamt}`;

  // breit: am PC über die volle Breite (Seiten-Editor), sonst zentrierte Spalte.
  rahmen.wizard.classList.toggle("ist-breit", Boolean(schritt.breit));
  rahmen.titel.textContent = schritt.titel;
  rahmen.schrittText.textContent = text;
  rahmen.fortschritt.setAttribute("aria-label", text);
  rahmen.fortschritt.setAttribute("aria-valuemax", String(gesamt));
  rahmen.fortschritt.setAttribute("aria-valuenow", String(nummer));
  rahmen.balken.style.width = `${(nummer / gesamt) * 100}%`;

  const { inhalt, dock } = schritt.baue(kontext());
  rahmen.body.replaceChildren(...alsListe(inhalt));
  rahmen.dock.replaceChildren(...alsListe(dock));
  rahmen.body.scrollTop = 0;

  spieleAb(rahmen.body, richtung === "zurueck" ? "in-step-back" : "in-step");
  if (richtung === "neu") spieleAb(rahmen.dock, "in-fade");
  rahmen.titel.focus({ preventScroll: true });
}

// Das bekommt jeder Schritt in baue(ctx) mit.
function kontext() {
  return {
    aktion: z.aktion,
    dateien: z.dateien,
    optionen: z.optionen,            // Eingaben, bleiben bei Zurück erhalten
    istLetzter: z.schritt === z.schritte.length - 1,
    signal: z.lauf.signal,
    weiter,
    zurueck: () => history.back(),   // wie der Zurück-Pfeil
    geaendert() { z.dirty = true; }, // etwas bearbeitet → Abbrechen fragt nach
    zeigeZwischen,
    schliesseZwischen,
    zeigeFertig,
    vonVorn: abbrechen,              // "Noch eine Datei bearbeiten": leerer Startscreen
    // fn() bei Zurück; liefert true, wenn der Schritt es selbst erledigt hat
    // (z. B. Auswahlmodus beendet) – dann bleibt der Schritt stehen.
    beiZurueck(fn) { z.beiZurueck = fn; },
    setzeKopf,
    setzeDock(inhalt) { rahmen.dock.replaceChildren(...alsListe(inhalt)); },
    // fn() läuft, wenn der Wizard endet (z. B. im Schritt geöffnete Dateien freigeben).
    beimEnde(fn) { z.aufraeumen.push(fn); },
  };
}

function weiter() {
  if (!z || z.schritt >= z.schritte.length - 1) return;
  const neu = z.schritt + 1;
  const eintrag = { fk: "wizard", schritt: neu };
  if (z.zwischen) history.replaceState(eintrag, "");
  else history.pushState(eintrag, "");
  zeigeSchritt(neu, "vor");
}

// Zwischen-Screen im laufenden Schritt (z. B. "Wird verkleinert …"). Kopfzeile
// und Schritt-Anzeige bleiben, nur der Titel wechselt. Folgt er auf einen
// anderen Zwischen-Screen, übernimmt er dessen History-Eintrag.
// ohneKopf: Kopfzeile ausblenden; den Fokus bekommt dann die Überschrift im Inhalt.
function zeigeZwischen({ titel, inhalt, dock, ohneKopf = false }) {
  if (!z) return;
  if (!z.zwischen) history.pushState({ fk: "wizard", schritt: z.schritt, zwischen: true }, "");
  z.zwischen = true;
  setzeKopf(null);
  rahmen.wizard.classList.remove("ist-breit");
  rahmen.kopf.hidden = ohneKopf;
  if (titel) rahmen.titel.textContent = titel;
  rahmen.body.replaceChildren(...alsListe(inhalt));
  rahmen.dock.replaceChildren(...alsListe(dock));
  rahmen.body.scrollTop = 0;
  spieleAb(rahmen.body, "in-fade");
  (ohneKopf ? rahmen.body.querySelector("h1") || rahmen.body : rahmen.titel).focus({ preventScroll: true });
}

// "Gespeichert ✓": Zwischen-Screen ohne Kopfzeile. Gespeichert ist
// gespeichert – Abbrechen fragt danach nicht mehr nach.
function zeigeFertig({ inhalt, dock }) {
  if (!z) return;
  zeigeZwischen({ inhalt, dock, ohneKopf: true });
  z.dirty = false;
}

// Zwischen-Screen verlassen und den Schritt wieder zeigen.
function schliesseZwischen() {
  if (z && z.zwischen) history.back();
}

// --- Abbrechen & Zurück ---

function rueckfrage(ausloeser, beiVerwerfen) {
  oeffneDialog({
    titel: "Bearbeitung abbrechen?",
    text: "Deine Änderungen gehen verloren. Die Originaldateien bleiben unverändert.",
    ausloeser,
    knoepfe: [
      { text: "Weiter bearbeiten", art: "primary" },
      { text: "Änderungen verwerfen", art: "danger", beiKlick: beiVerwerfen },
    ],
  });
}

// × : zurück zum leeren Startscreen – mit Rückfrage, wenn schon etwas bearbeitet wurde.
function abbrechenMitRueckfrage(ausloeser) {
  if (z.dirty) rueckfrage(ausloeser, abbrechen);
  else abbrechen();
}

function abbrechen() {
  z.leeren = true;
  z.dirty = false;
  z.springt = true;
  // Alle Wizard-Einträge im Verlauf überspringen; popstate beendet dann den Wizard.
  history.go(-(z.schritt + 1 + (z.zwischen ? 1 : 0)));
}

function beende({ leeren }) {
  schliesseOverlay();
  z.lauf.abort();
  for (const fn of z.aufraeumen) fn();
  z = null;
  setzeKopf(null);
  rahmen.wizard.hidden = true;
  rahmen.wizard.classList.remove("ist-breit");
  rahmen.body.replaceChildren();
  rahmen.dock.replaceChildren();
  start.hidden = false;
  spieleAb(start, leeren ? "in-fade" : "in-step-back");
  beiEnde({ leeren });
}

function beiPopstate(e) {
  const ziel = e.state && e.state.fk === "wizard" ? e.state.schritt : null;

  if (!z) {
    // Veralteter Wizard-Eintrag (z. B. Browser-Vor nach dem Abbrechen) → zum Start.
    if (ziel !== null) history.go(-(ziel + 1));
    return;
  }

  // Zurück, während ein Sheet/Dialog offen ist oder der Schritt selbst etwas zu
  // schließen hat: nur das schließen und im Schritt bleiben (Eintrag zurücklegen).
  const zurueck = ziel === null || ziel < z.schritt;
  if (zurueck && !z.zwischen && !z.springt) {
    const overlay = sheetIstOffen();
    if (overlay || (z.beiZurueck && z.beiZurueck())) {
      if (overlay) schliesseOverlay(false);
      history.pushState({ fk: "wizard", schritt: z.schritt }, "");
      return;
    }
  }
  if (sheetIstOffen()) schliesseOverlay();

  if (ziel === null) {
    // Zurück aus Schritt 2 zum Startscreen. Bearbeitetes erst nach Rückfrage verwerfen.
    if (z.dirty) {
      history.pushState({ fk: "wizard", schritt: z.schritt }, "");
      rueckfrage(rahmen.zurueck, () => {
        z.dirty = false;
        z.springt = true;
        history.go(-(z.schritt + 1));
      });
      return;
    }
    beende({ leeren: Boolean(z.leeren) });
    return;
  }

  const index = Math.min(Math.max(ziel, 0), z.schritte.length - 1);
  const zuZwischen = Boolean(e.state.zwischen);
  if (index !== z.schritt) {
    zeigeSchritt(index, index < z.schritt ? "zurueck" : "vor");
    if (zuZwischen) history.back(); // veralteter Zwischen-Eintrag (Browser-Vor)
  } else if (z.zwischen && !zuZwischen) {
    zeigeSchritt(index, "zurueck");  // Zurück aus dem Zwischen-Screen: Verarbeitung abbrechen
  } else if (!z.zwischen && zuZwischen) {
    history.back();                  // Browser-Vor in einen beendeten Zwischen-Screen
  }
}

// --- Öffentlich ---

// beiEnde({ leeren }) wird aufgerufen, wenn der Wizard zum Startscreen
// zurückkehrt: leeren = true nach Abbrechen (alles zurücksetzen), sonst
// bleiben die gewählten Dateien erhalten.
export function initWizard(optionen) {
  beiEnde = optionen.beiEnde;
  rahmen = baueRahmen();
  // Nach einem Neuladen gibt es keine Dateien mehr → alten Wizard-Eintrag vergessen.
  if (history.state && history.state.fk === "wizard") history.replaceState(null, "");
  window.addEventListener("popstate", beiPopstate);
}

// Startet den Wizard für eine Aktion. schritte = [{ titel, baue(ctx) }].
export function starteWizard({ aktion, dateien, schritte }) {
  z = {
    aktion, dateien, schritte, schritt: 0, optionen: {}, dirty: false, zwischen: false, lauf: null,
    beiZurueck: null, aufraeumen: [], springt: false,
  };
  history.pushState({ fk: "wizard", schritt: 0 }, "");
  start.hidden = true;
  rahmen.wizard.hidden = false;
  window.scrollTo(0, 0);
  zeigeSchritt(0, "neu");
  ansage(`${rahmen.titel.textContent}, ${rahmen.schrittText.textContent}`);
}

// Haupt-Button fürs Dock ("Weiter" bzw. im letzten Schritt "Speichern").
// Solange er arbeitet (.is-working), werden weitere Tipps ignoriert.
export function hauptKnopf(text, beiKlick, iconName) {
  const knopf = el("button", "btn btn-primary btn-block");
  knopf.type = "button";
  if (iconName) knopf.append(icon(iconName, 20, 2.1));
  knopf.append(el("span", null, text));
  knopf.addEventListener("click", (e) => {
    if (!knopf.classList.contains("is-working")) beiKlick(e);
  });
  return knopf;
}

// Text des Haupt-Buttons ändern (Icon bleibt).
export function setzeKnopfText(knopf, text) {
  knopf.querySelector("span:last-child").textContent = text;
}
