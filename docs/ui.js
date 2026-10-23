// ui.js – wiederverwendbare Oberflächen-Bausteine: Bottom Sheet, Dialog
// (Rückfrage), vollflächige Ebene (Vollbild), Toast und Ansagen für
// Screenreader. Sheets, Dialoge und Ebenen liegen in #ebene (außerhalb der
// Ansichten); solange eins offen ist, werden Startscreen und Wizard "inert"
// geschaltet (Fokus bleibt im Sheet bzw. Dialog).

import { el } from "./shared.js";
import { icon } from "./icons.js";

export const wenigBewegung = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Kurze Nachricht für Screenreader (unsichtbar).
export function ansage(text) {
  const box = document.getElementById("ansage");
  box.textContent = "";
  setTimeout(() => { box.textContent = text; }, 50);
}

// Startscreen und Wizard sperren (inert), solange ein Sheet/Dialog offen ist.
function sperre(an) {
  document.querySelectorAll(".fk-app").forEach((ansicht) => { ansicht.inert = an; });
  document.documentElement.classList.toggle("ist-gesperrt", an);
}

// --- Bottom Sheet ---

let offen = null; // offenes Sheet oder offener Dialog: { scrim, sheet, ausloeser, schliessen }

export function sheetIstOffen() {
  return offen !== null;
}

// Schließt ein offenes Sheet/Dialog (z. B. bei Browser-Zurück), ohne Animation
// nur mit sofort = true.
export function schliesseOverlay(sofort = true) {
  if (offen) offen.schliessen(sofort);
}

// Öffnet ein Bottom Sheet mit Kopf (Titel, Unterzeile, Schließen) und Inhalt.
// Schließt über ×, Abdunklung, Esc oder nach unten wischen; danach geht der
// Fokus zurück zum Auslöser. kopfBild = Element links im Kopf (z. B. Seiten-
// Miniatur), unterzeile = Text oder Element(e), beiSchliessen() beim Schließen.
export function oeffneSheet({ titel, unterzeile, inhalt, ausloeser, kopfBild, kleinerTitel = false, beiSchliessen }) {
  if (offen) offen.schliessen(true);

  const scrim = el("div", "scrim");
  scrim.setAttribute("aria-hidden", "true");

  const sheet = el("div", "sheet");
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "sheetTitel");
  sheet.tabIndex = -1;

  const griff = el("div", "sheet-griff");
  griff.setAttribute("aria-hidden", "true");
  griff.append(el("div", "sheet-handle"));

  const kopf = el("div", "sheet-head");
  if (kopfBild) kopf.append(kopfBild);
  const titelBox = el("div", "sheet-titel");
  const h = el("h2", kleinerTitel ? "t-l" : "t-h", titel);
  h.id = "sheetTitel";
  titelBox.append(h);
  if (unterzeile) {
    const u = el("p", "t-s t-muted sheet-unterzeile");
    u.append(...[].concat(unterzeile));
    titelBox.append(u);
  }
  const zu = el("button", "icon-btn glass");
  zu.type = "button";
  zu.setAttribute("aria-label", "Schließen");
  zu.append(icon("schliessen", 18, 2));
  kopf.append(titelBox, zu);

  sheet.append(griff, kopf, inhalt);
  document.getElementById("ebene").append(scrim, sheet);
  sperre(true);

  // Nach dem Einfahren die Animation lösen, damit Wischen per transform geht.
  sheet.addEventListener("animationend", () => { sheet.style.animation = "none"; }, { once: true });

  function schliessen(sofort = false) {
    if (!offen || offen.sheet !== sheet) return;
    offen = null;
    document.removeEventListener("keydown", beiTaste);
    sperre(false);

    const weg = () => { scrim.remove(); sheet.remove(); };
    if (sofort) {
      weg();
    } else {
      // Ausfahren: 280 ms, Kurve "io" (bei "Bewegung reduzieren" nur Überblenden).
      sheet.style.animation = "none";
      scrim.style.animation = "none";
      const kurve = "280ms var(--fk-ease-io)";
      scrim.style.transition = `opacity ${kurve}`;
      scrim.style.opacity = "0";
      if (wenigBewegung()) {
        sheet.style.transition = "opacity 200ms ease";
        sheet.style.opacity = "0";
      } else {
        sheet.style.transition = `transform ${kurve}`;
        sheet.style.transform = "translateY(100%)";
      }
      setTimeout(weg, 300);
    }
    if (beiSchliessen) beiSchliessen();
    if (ausloeser && ausloeser.isConnected) ausloeser.focus();
  }

  function beiTaste(e) {
    if (e.key === "Escape") { e.preventDefault(); schliessen(); }
  }
  document.addEventListener("keydown", beiTaste);
  scrim.addEventListener("click", () => schliessen());
  zu.addEventListener("click", () => schliessen());

  // Nach unten wischen (am Griff oder im Kopf) schließt das Sheet.
  let zug = null;
  sheet.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".sheet-griff, .sheet-head") || e.target.closest("button")) return;
    zug = { y: e.clientY, t: performance.now(), id: e.pointerId };
    sheet.style.animation = "none";
    sheet.style.transition = "none";
    sheet.setPointerCapture(e.pointerId);
  });
  sheet.addEventListener("pointermove", (e) => {
    if (!zug || e.pointerId !== zug.id) return;
    const dy = Math.max(0, e.clientY - zug.y);
    sheet.style.transform = `translateY(${dy}px)`;
  });
  const loslassen = (e) => {
    if (!zug || e.pointerId !== zug.id) return;
    const dy = Math.max(0, e.clientY - zug.y);
    const tempo = dy / Math.max(1, performance.now() - zug.t);
    zug = null;
    if (dy > 90 || (dy > 24 && tempo > 0.6)) {
      schliessen();
    } else {
      sheet.style.transition = "transform 200ms var(--fk-ease-out)";
      sheet.style.transform = "";
    }
  };
  sheet.addEventListener("pointerup", loslassen);
  sheet.addEventListener("pointercancel", loslassen);

  offen = { scrim, sheet, ausloeser, schliessen };
  sheet.focus();
  return { schliessen };
}

// --- Dialog (Rückfrage, z. B. "Bearbeitung abbrechen?") ---

// knoepfe: [{ text, art: "primary" | "secondary" | "danger", beiKlick }] – der
// erste bekommt den Fokus. Esc und Tipp auf die Abdunklung schließen ohne Aktion.
export function oeffneDialog({ titel, text, knoepfe, ausloeser }) {
  if (offen) offen.schliessen(true);

  const scrim = el("div", "scrim");
  scrim.setAttribute("aria-hidden", "true");

  const dialog = el("div", "dialog");
  dialog.setAttribute("role", "alertdialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "dialogTitel");
  dialog.setAttribute("aria-describedby", "dialogText");
  const h = el("h2", "t-h", titel);
  h.id = "dialogTitel";
  const p = el("p", "t-body t-2", text);
  p.id = "dialogText";

  const reihe = el("div", "fk-stack dialog-knoepfe");
  const buttons = knoepfe.map((k) => {
    const art = k.art === "primary" ? "btn-primary" : "btn-secondary";
    const knopf = el("button", `btn btn-block ${art}${k.art === "danger" ? " is-danger" : ""}`, k.text);
    knopf.type = "button";
    knopf.addEventListener("click", () => {
      schliessen(true, !k.beiKlick);
      if (k.beiKlick) k.beiKlick();
    });
    return knopf;
  });
  reihe.append(...buttons);
  dialog.append(h, p, reihe);
  document.getElementById("ebene").append(scrim, dialog);
  sperre(true);

  function schliessen(sofort = false, fokusZurueck = true) {
    if (!offen || offen.sheet !== dialog) return;
    offen = null;
    document.removeEventListener("keydown", beiTaste);
    sperre(false);
    const weg = () => { scrim.remove(); dialog.remove(); };
    if (sofort) {
      weg();
    } else {
      for (const teil of [scrim, dialog]) {
        teil.style.animation = "none";
        teil.style.transition = "opacity 200ms ease";
        teil.style.opacity = "0";
      }
      setTimeout(weg, 220);
    }
    if (fokusZurueck && ausloeser && ausloeser.isConnected) ausloeser.focus();
  }

  function beiTaste(e) {
    if (e.key === "Escape") { e.preventDefault(); schliessen(); }
  }
  document.addEventListener("keydown", beiTaste);
  scrim.addEventListener("click", () => schliessen());

  offen = { scrim, sheet: dialog, ausloeser, schliessen };
  buttons[0].focus();
  return { schliessen };
}

// --- Vollflächige Ebene (z. B. Vollbild-Ansicht einer Seite) ---

// Legt element über alles: sperrt die Ansichten, Esc und Browser-Zurück
// schließen, danach geht der Fokus zurück zum Auslöser.
export function oeffneVollflaeche({ element, ausloeser, beiSchliessen }) {
  if (offen) offen.schliessen(true);
  document.getElementById("ebene").append(element);
  sperre(true);

  function schliessen(sofort = false) {
    if (!offen || offen.sheet !== element) return;
    offen = null;
    document.removeEventListener("keydown", beiTaste);
    sperre(false);
    if (sofort) {
      element.remove();
    } else {
      element.style.transition = "opacity 200ms ease";
      element.style.opacity = "0";
      setTimeout(() => element.remove(), 220);
    }
    if (beiSchliessen) beiSchliessen();
    if (ausloeser && ausloeser.isConnected) ausloeser.focus();
  }

  function beiTaste(e) {
    if (e.key === "Escape") { e.preventDefault(); schliessen(); }
  }
  document.addEventListener("keydown", beiTaste);

  offen = { sheet: element, ausloeser, schliessen };
  return { schliessen };
}

// --- Toast (5 s sichtbar, optional mit Icon und Aktion wie "Rückgängig") ---

let toastWeg = null; // schließt den gerade sichtbaren Toast

// Rückgabe: { schliessen } – z. B. wenn "Rückgängig" nicht mehr passt.
export function zeigeToast(text, { aktion, beiAktion, iconName } = {}) {
  const box = document.getElementById("toasts");
  if (toastWeg) toastWeg(true);

  const toast = el("div", "toast");
  if (iconName) toast.append(icon(iconName, 18, 2));
  toast.append(el("span", "toast-text", text));
  if (aktion) {
    const knopf = el("button", "btn-link", aktion);
    knopf.type = "button";
    knopf.addEventListener("click", () => { weg(); beiAktion(); });
    toast.append(knopf);
  }
  box.append(toast);

  const timer = setTimeout(() => weg(), 5000);
  function weg(sofort = false) {
    if (toastWeg !== weg) return; // schon geschlossen oder ersetzt
    toastWeg = null;
    clearTimeout(timer);
    if (sofort) {
      toast.remove();
      return;
    }
    toast.classList.add("is-closing");
    setTimeout(() => toast.remove(), 200);
  }
  toastWeg = weg;
  return { schliessen: () => weg() };
}
