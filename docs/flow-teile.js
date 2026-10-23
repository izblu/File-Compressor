// flow-teile.js – Bausteine, die mehrere Abläufe teilen: Dateizeile,
// Auswahl-Karten (radiogroup), Hinweise, Dateiname-Feld mit Namensvorschau,
// Ausgabe-Zeile und der Verarbeiten-Screen samt Ablauf ("mitVerarbeitung").

import { el, humanSize, seitenText, zusammensetzung } from "./shared.js";
import { icon } from "./icons.js";
import { ansage, zeigeToast, wenigBewegung } from "./ui.js";

// Inhalt eines Schritts: senkrechter Stapel mit Abstand.
export function schrittInhalt(...kinder) {
  const box = el("div", "fk-stack schritt");
  box.append(...kinder.filter(Boolean));
  return box;
}

// Abschnitt mit kleiner Überschrift (z. B. "Ausgabe", "Umwandeln in").
export function abschnitt(titel, ...kinder) {
  const sek = el("section", "fk-stack abschnitt");
  const h = el("h2", "t-s t-2");
  if (Array.isArray(titel)) h.append(...titel);
  else h.textContent = titel;
  sek.append(h, ...kinder.filter(Boolean));
  return sek;
}

// --- Datei-Darstellung ---

// Kleine Vorschau einer Datei (1. Seite bzw. Bild).
export function miniatur(eintrag, klasse = "mini") {
  const box = el("span", klasse);
  box.setAttribute("aria-hidden", "true");
  const img = el("img");
  img.src = eintrag.vorschau;
  img.alt = "";
  img.decoding = "async";
  img.draggable = false;
  box.append(img);
  return box;
}

// Untertitel einer Datei: "12 Seiten" bzw. "4032 × 3024 px".
export function dateiInfo(eintrag) {
  return eintrag.art === "pdf" ? seitenText(eintrag.seiten) : `${eintrag.breite} × ${eintrag.hoehe} px`;
}

// Karte mit der gewählten Datei (oder "3 Dateien") ganz oben im Schritt.
export function dateiZeile(dateien) {
  const zeile = el("div", "card fk-row datei-zeile");
  const text = el("div", "fk-stack datei-zeile-text");
  let groesse;
  if (dateien.length === 1) {
    const d = dateien[0];
    const name = el("span", "t-s datei-zeile-name", d.file.name);
    name.title = d.file.name;
    zeile.append(miniatur(d));
    text.append(name, el("span", "t-xs t-muted", dateiInfo(d)));
    groesse = d.file.size;
  } else {
    const stapel = el("span", "mini-stapel");
    stapel.setAttribute("aria-hidden", "true");
    dateien.slice(0, 3).forEach((d) => stapel.append(miniatur(d)));
    zeile.append(stapel);
    text.append(el("span", "t-s datei-zeile-name", `${dateien.length} Dateien`),
      el("span", "t-xs t-muted", zusammensetzung(dateien)));
    groesse = dateien.reduce((s, d) => s + d.file.size, 0);
  }
  zeile.append(text, el("span", "t-l t-num datei-zeile-groesse", humanSize(groesse)));
  return zeile;
}

// --- Auswahl (radiogroup) ---

// Options-Karte (.opt) als role="radio". grund = warum nicht wählbar
// (ausgegraut, mit Info-Symbol). vis = Bild links (Element).
export function optKarte({ wert, titel, sub, badge, vis, grund, klasse = "" }) {
  const karte = el(grund ? "div" : "button", `opt ${klasse}`.trim());
  if (!grund) karte.type = "button";
  karte.setAttribute("role", "radio");
  karte.dataset.wert = wert;
  if (vis) {
    vis.classList.add("opt-vis");
    vis.setAttribute("aria-hidden", "true");
    karte.append(vis);
  }
  const haupt = el("span", "opt-main");
  const t = el("span", "opt-title", titel);
  if (badge) t.append(el("span", "badge badge-accent", badge));
  haupt.append(t);
  if (grund) {
    karte.classList.add("is-disabled");
    karte.setAttribute("aria-disabled", "true");
    const warum = el("span", "mrow-why");
    warum.append(icon("info", 15, 2), el("span", null, grund));
    haupt.append(warum);
  } else if (sub) {
    haupt.append(el("span", "opt-sub", sub));
  }
  karte.append(haupt);
  if (!grund) {
    const radio = el("span", "radio");
    radio.setAttribute("aria-hidden", "true");
    karte.append(radio);
  }
  return karte;
}

// Macht aus einem Container mit role="radio"-Elementen (data-wert) eine
// radiogroup: Antippen wählt, Pfeiltasten wandern, nur die gewählte Option
// ist per Tab erreichbar. an = Klasse der gewählten Option.
export function radioGruppe(gruppe, { label, wert, beiWahl, an = "is-selected" }) {
  gruppe.setAttribute("role", "radiogroup");
  gruppe.setAttribute("aria-label", label);
  const alle = () => [...gruppe.querySelectorAll('[role="radio"]')];
  const waehlbar = () => alle().filter((r) => r.getAttribute("aria-disabled") !== "true" && !r.disabled);

  function setze(neu) {
    let gefunden = false;
    for (const r of alle()) {
      const ja = r.dataset.wert === neu;
      gefunden ||= ja;
      r.setAttribute("aria-checked", String(ja));
      r.classList.toggle(an, ja);
      r.tabIndex = ja ? 0 : -1;
    }
    if (!gefunden && waehlbar()[0]) waehlbar()[0].tabIndex = 0;
  }

  gruppe.addEventListener("click", (e) => {
    const r = e.target.closest('[role="radio"]');
    if (!r || !waehlbar().includes(r) || r.getAttribute("aria-checked") === "true") return;
    setze(r.dataset.wert);
    beiWahl(r.dataset.wert);
  });
  gruppe.addEventListener("keydown", (e) => {
    const schritt = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    const liste = waehlbar();
    const i = liste.indexOf(document.activeElement);
    if (!schritt || i < 0) return;
    e.preventDefault();
    const ziel = liste[(i + schritt + liste.length) % liste.length];
    ziel.focus();
    ziel.click();
  });

  setze(wert);
  return { setze };
}

// --- Hinweise ---

// Hinweis-Kasten (.note). art: "" | "warning" | "danger"; text = String oder Elemente.
export function hinweis(text, { art = "", iconName, titel } = {}) {
  const box = el("div", `note${art ? ` note-${art}` : ""}`);
  box.append(icon(iconName || (art ? "warnung" : "info"), 18, 2));
  const inhalt = el("div", "fk-stack note-text");
  if (titel) inhalt.append(el("b", "note-titel", titel));
  if (typeof text === "string") inhalt.append(el("span", null, text));
  else inhalt.append(...[].concat(text));
  box.append(inhalt);
  return box;
}

// --- Dateiname ---

let feldNummer = 0;

// Dateiname-Feld mit fester Endung. beiEingabe(text) bei jeder Änderung.
export function namensFeld({ wert, endung, beiEingabe, label = "Dateiname", mitHinweis = true }) {
  const feld = el("div", "field");
  const id = `dateiname-${++feldNummer}`;
  const l = el("label", null, label);
  l.htmlFor = id;
  const box = el("div", "field-box");
  const input = el("input");
  input.id = id;
  input.value = wert;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.enterKeyHint = "done";
  input.addEventListener("input", () => beiEingabe(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur(); // Tastatur am Handy schließen
  });
  const ext = el("span", "field-ext", `.${endung}`);
  box.append(input, ext);
  feld.append(l, box);
  const hinweisText = el("p", "field-hint", HINWEIS_NEU[1]);
  if (mitHinweis) feld.append(hinweisText);
  return {
    element: feld,
    input,
    setzeEndung: (e) => { ext.textContent = `.${e}`; },
    // Hinweis passend zur Zahl der entstehenden Dateien.
    setzeAnzahl: (n) => { hinweisText.textContent = HINWEIS_NEU[n > 1 ? 2 : 1]; },
  };
}

const HINWEIS_NEU = {
  1: "Wird als neue Datei gespeichert – das Original bleibt unverändert.",
  2: "Werden als neue Dateien gespeichert – das Original bleibt unverändert.",
};

// Vorschau der entstehenden Dateinamen. Bei vielen: erste zwei · … · letzter.
export function namensListe() {
  const liste = el("div", "namelist");
  liste.setAttribute("aria-label", "Vorschau der Dateinamen");
  const zeile = (name) => {
    const s = el("span");
    s.append(icon("datei", 16, 2), el("span", "namelist-name", name));
    return s;
  };
  return {
    element: liste,
    zeige(namen) {
      const teile = namen.length > 4
        ? [zeile(namen[0]), zeile(namen[1]), el("span", "t-muted namelist-luecke", "…"), zeile(namen.at(-1))]
        : namen.map(zeile);
      liste.replaceChildren(...teile);
    },
  };
}

// "Stärke: Mittel · PDF" + "Ändern" (zurück zum vorigen Schritt).
export function ausgabeZeile(teile, beiAendern) {
  const karte = el("div", "card fk-row ausgabe-zeile");
  const text = el("span", "t-body ausgabe-text");
  text.append(...teile);
  const aendern = el("button", "btn-link", "Ändern");
  aendern.type = "button";
  aendern.addEventListener("click", beiAendern);
  karte.append(text, aendern);
  return karte;
}

// --- Verarbeiten ---

const UMFANG = 678.58; // 2π · 108 (Kreis um die Seite)

// Verarbeiten-Screen (Referenz 08): Ring um die Seiten-Miniatur, Titel,
// Fortschritt in Worten, Segmentleiste je Einheit (Seite oder Datei).
export function verarbeitenScreen({ text, einheiten, eintrag }) {
  const box = el("div", "fk-stack verarb");

  const ring = el("div", "verarb-ring");
  ring.setAttribute("aria-hidden", "true");
  const glow = el("span", "verarb-glow");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 236 236");
  svg.setAttribute("class", "verarb-kreis");
  svg.innerHTML =
    '<circle class="verarb-bahn" cx="118" cy="118" r="108" fill="none" stroke-width="6"/>' +
    `<circle class="verarb-bogen" cx="118" cy="118" r="108" fill="none" stroke-width="6" stroke-linecap="round" stroke-dasharray="${UMFANG}" stroke-dashoffset="${UMFANG}"/>`;
  const bogen = svg.lastChild;
  const seite = el("div", "verarb-seite");
  const img = el("img");
  img.alt = "";
  seite.append(img, el("span", "verarb-strahl"));
  ring.append(glow, svg, seite);

  const status = el("div", "fk-stack verarb-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const zeile = el("p", "t-body t-muted t-num");
  status.append(el("p", "t-title", text), zeile);

  // Segmente nur bei 2–24 Einheiten, sonst ein durchgehender Balken.
  const leiste = el("div", "fk-row verarb-leiste");
  leiste.setAttribute("aria-hidden", "true");
  const segmente = [];
  let balken = null;
  if (einheiten >= 2 && einheiten <= 24) {
    for (let i = 0; i < einheiten; i++) segmente.push(leiste.appendChild(el("span", "sd")));
  } else if (einheiten > 24) {
    leiste.classList.add("ist-balken");
    balken = leiste.appendChild(el("span", "sd done"));
  }

  box.append(ring, status);
  if (einheiten >= 2) box.append(leiste);

  function zeigeDatei(d) {
    img.src = d.vorschau;
    seite.style.setProperty("--r", d.verhaeltnis);
  }
  zeigeDatei(eintrag);

  // anteil 0…1, text = Zeile unter dem Titel, fertig = abgeschlossene Einheiten.
  function setze({ anteil, text: zeilenText, fertig = 0, datei }) {
    bogen.setAttribute("stroke-dashoffset", String(UMFANG * (1 - Math.min(1, anteil))));
    if (zeilenText != null) zeile.textContent = zeilenText;
    segmente.forEach((s, i) => {
      s.classList.toggle("done", i < fertig);
      s.classList.toggle("now", i === fertig && anteil < 1);
    });
    if (balken) balken.style.width = `${Math.round(anteil * 100)}%`;
    if (datei) zeigeDatei(datei);
  }
  setze({ anteil: 0 });

  return { element: box, setze };
}

// Fortschritt in Worten: "Seite 3 von 12 · 25 %" bzw. "Datei 2 von 3 · 40 %".
export function fortschrittText(einheit, nummer, anzahl, anteil) {
  const prozent = `${Math.round(anteil * 100)} %`;
  return anzahl > 1 ? `${einheit} ${nummer} von ${anzahl} · ${prozent}` : prozent;
}

// Haupt-Button in den Zustand "arbeitet" (Spinner + Text). Liefert eine
// Funktion, die den alten Zustand wiederherstellt.
export function arbeitet(knopf, text) {
  const vorher = [...knopf.childNodes];
  const spinner = el("span", "spinner");
  spinner.setAttribute("aria-hidden", "true");
  knopf.replaceChildren(spinner, el("span", null, text));
  knopf.classList.add("is-working");
  knopf.setAttribute("aria-busy", "true");
  return () => {
    knopf.replaceChildren(...vorher);
    knopf.classList.remove("is-working");
    knopf.removeAttribute("aria-busy");
  };
}

const MIN_SICHTBAR = 700; // ms – der Verarbeiten-Screen soll nicht nur aufblitzen

// Führt job({ signal, melde }) aus. Der Haupt-Button zeigt sofort "arbeitet";
// dauert es länger als 400 ms, erscheint der Verarbeiten-Screen (Abbrechen
// bzw. Zurück → wieder der Schritt, die Arbeit hört auf).
// danach(ergebnis) läuft im Anschluss, solange der Button noch arbeitet
// (z. B. das Speichern).
// Rückgabe: { ergebnis, zwischen } – ergebnis = null bei Abbruch oder Fehler
// (dann mit Toast fehlerText); zwischen = Verarbeiten-Screen ist noch zu sehen.
export async function mitVerarbeitung(ctx, { knopf, titel, text, einheiten, fehlerText, job, danach }) {
  const { signal } = ctx;
  const screen = verarbeitenScreen({ text, einheiten, eintrag: ctx.dateien[0] });
  const zuruecksetzen = arbeitet(knopf, text);
  let gezeigtUm = 0;

  const timer = setTimeout(() => {
    if (signal.aborted) return;
    const abbrechen = el("button", "btn btn-secondary btn-block", "Abbrechen");
    abbrechen.type = "button";
    abbrechen.addEventListener("click", () => ctx.zurueck());
    ctx.zeigeZwischen({ titel, inhalt: screen.element, dock: abbrechen });
    gezeigtUm = performance.now();
  }, 400);

  try {
    const ergebnis = await job({ signal, melde: screen.setze });
    clearTimeout(timer);
    if (signal.aborted) return { ergebnis: null, zwischen: false };
    if (gezeigtUm) {
      // Ring zu Ende füllen, kurz stehen lassen, dann geht es weiter.
      screen.setze({ anteil: 1, fertig: einheiten });
      const rest = MIN_SICHTBAR - (performance.now() - gezeigtUm);
      if (rest > 0 && !wenigBewegung()) await new Promise((r) => setTimeout(r, rest));
      if (signal.aborted) return { ergebnis: null, zwischen: false };
    }
    if (danach) {
      knopf.lastChild.textContent = "Wird gespeichert …";
      await danach(ergebnis);
    }
    return { ergebnis, zwischen: Boolean(gezeigtUm) };
  } catch (e) {
    clearTimeout(timer);
    if (signal.aborted) return { ergebnis: null, zwischen: false };
    console.error(e);
    if (gezeigtUm) ctx.schliesseZwischen();
    zeigeToast(fehlerText);
    ansage(fehlerText);
    return { ergebnis: null, zwischen: false };
  } finally {
    if (knopf.isConnected) zuruecksetzen();
  }
}
