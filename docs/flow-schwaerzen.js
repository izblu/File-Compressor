// flow-schwaerzen.js – Ablauf "Schwärzen" (Nachtrag Kap. 6, Screens S2–S10, A1d):
// Schritt 2 "Stellen schwärzen" (Editor, siehe schwaerzen-editor.js) →
// Verarbeiten "Wird geschwärzt …" (S9) → Schritt 3 "Speichern" mit Prüfbericht
// (S10a–S10c) → "Gespeichert ✓" (A1d). Nur für eine einzelne Datei (1 PDF oder 1 Bild).
//
// Verarbeitet wird vor dem Speichern-Schritt (wie bei Verkleinern): Dort stehen
// das echte Ergebnis (Miniatur, "Ergebnis ansehen"), die neue Größe und der
// Prüfbericht. Das Schwärzen selbst und die Selbstprüfung: redact.js.
//
// Sicherheit: Speichern-Schritt, Vollbild und "Gespeichert ✓" zeigen nur das
// Ergebnis – einen eigenen Eintrag aus den geschwärzten Bytes –, nie das Original.
//
// o.ergebnis = { stellen, blob, eintrag, … } gehört zu genau einem Stand der
// Stellen (o.stellen wird bei jeder Änderung ersetzt, nie verändert). Zurück in
// den Editor und ohne Änderung wieder "Weiter" → kein neues Verarbeiten.

import { el, humanSize, seitenText, ohneEndung, sichererName } from "./shared.js";
import { icon } from "./icons.js";
import { hauptKnopf } from "./wizard.js";
import { stellenSchritt, stellenSumme, stellenText } from "./schwaerzen-editor.js";
import { schwaerzePdf, schwaerzeBild, maleStellen } from "./redact.js";
import { endungNachVerkleinern } from "./compress.js";
import { oeffneDatei, freigeben, verkleinernGrund } from "./intake.js";
import { speicherZiel } from "./save.js";
import { zeigeGespeichert } from "./gespeichert.js";
import { zeigeVollbild } from "./vollbild.js";
import {
  schrittInhalt, abschnitt, seitenMini, hinweis, namensFeld, mitVerarbeitung, fortschrittText, speichereErgebnis,
} from "./flow-teile.js";

const MINI_PX = 240; // lange Kante der Seite im Verarbeiten-Screen

const FEHLER = "Das Schwärzen hat leider nicht geklappt. Versuche es noch einmal.";
const PRUEF_FEHLER = "Die Prüfung des Ergebnisses hat einen Fehler gefunden – zur Sicherheit wird nichts gespeichert. Versuche es noch einmal.";

export function schwaerzenSchritte() {
  return [
    { titel: "Stellen schwärzen", baue: (ctx) => stellenSchritt(ctx, { beiWeiter: (knopf) => verarbeite(ctx, knopf) }), breit: true },
    { titel: "Speichern", baue: speichernSchritt },
  ];
}

const anzahlIn = (stellen) => Object.values(stellen).reduce((s, liste) => s + liste.length, 0);

// Erste Seite mit einer Stelle – ihre Miniatur zeigt das Ergebnis.
function ersteSeite(stellen) {
  const seiten = Object.keys(stellen).filter((nr) => stellen[nr].length).map(Number);
  return seiten.length ? Math.min(...seiten) : 1;
}

// --- Verarbeiten (S9) ---

// Kleines Bild einer Seite mit schwarzen Stellen für den Verarbeiten-Screen.
// quelle = Bild oder Canvas. Rückgabe passt zu verarbeitenScreen.
function mini(quelle, breite, hoehe, stellen = []) {
  const skala = Math.min(1, MINI_PX / Math.max(breite, hoehe));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(breite * skala));
  c.height = Math.max(1, Math.round(hoehe * skala));
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(quelle, 0, 0, c.width, c.height);
  maleStellen(g, c.width, c.height, stellen);
  const vorschau = c.toDataURL("image/jpeg", 0.8);
  c.width = c.height = 0;
  return { vorschau, verhaeltnis: breite / hoehe };
}

// Seite 1 mit ihren Stellen, solange noch keine Seite fertig ist.
async function startMini(d, stellen) {
  const img = new Image();
  img.src = d.vorschau;
  try {
    await img.decode();
    return mini(img, img.naturalWidth, img.naturalHeight, stellen[1]);
  } catch {
    return null;
  }
}

// "Weiter" im Editor: verarbeiten (oder das letzte Ergebnis nehmen, wenn sich
// die Stellen nicht geändert haben), dann zum Speichern-Schritt.
async function verarbeite(ctx, knopf) {
  const o = ctx.optionen;
  const d = ctx.dateien[0];
  const stellen = o.stellen;
  if (o.ergebnis && o.ergebnis.stellen === stellen) return ctx.weiter();

  const n = d.art === "pdf" ? d.seiten : 1;
  let erzeugt = null; // Eintrag des Ergebnisses – wird er nicht gebraucht, wieder freigeben
  const ergebnis = await mitVerarbeitung(ctx, {
    knopf,
    titel: "Stellen schwärzen",
    text: "Wird geschwärzt …",
    einheiten: n,
    eintrag: await startMini(d, stellen),
    fehlerText: (e) => (e && e.name === "SelbstpruefungFehler" ? PRUEF_FEHLER : FEHLER),
    job: async ({ signal, melde }) => {
      melde({ anteil: 0, text: fortschrittText("Seite", 1, n, 0) });
      const beiSeite = (p, anzahl, canvas) => melde({
        anteil: p / anzahl, fertig: p, text: fortschrittText("Seite", p, anzahl, p / anzahl),
        datei: mini(canvas, canvas.width, canvas.height),
      });
      const r = d.art === "pdf"
        ? await schwaerzePdf(d.file, stellen, { signal, beiSeite })
        : await schwaerzeBild(d.file, stellen[1] || [], { signal, beiSeite });
      signal.throwIfAborted();
      const name = `${ohneEndung(d.file.name)}_geschwärzt.${endungNachVerkleinern(d)}`;
      erzeugt = await oeffneDatei(new File([r.blob], name, { type: r.blob.type }));
      return { ...r, eintrag: erzeugt };
    },
  });

  // Abgebrochen, fehlgeschlagen oder die Stellen haben sich inzwischen geändert.
  if (!ergebnis || ctx.signal.aborted || o.stellen !== stellen) {
    if (erzeugt) freigeben(erzeugt);
    return;
  }
  if (o.ergebnis) freigeben(o.ergebnis.eintrag);
  o.ergebnis = { stellen, ...ergebnis };
  ctx.beimEnde(() => freigeben(ergebnis.eintrag));
  ctx.weiter();
}

// --- Schritt 3: Speichern (S10a–S10c) ---

const PRUEFBERICHT = {
  pdf: [
    "Inhalt unter den Stellen entfernt – nicht nur überdeckt",
    "Kein versteckter Text mehr enthalten (Text ist dadurch nicht mehr markierbar)",
    "Metadaten, Kommentare und Anhänge entfernt",
  ],
  bild: [
    "Inhalt unter den Stellen entfernt",
    "Ortsangaben, Kameradaten und Vorschaubild entfernt",
  ],
};

// Ergebnis-Karte: Miniatur der ersten geschwärzten Seite AUS DEM ERGEBNIS,
// "12 Stellen auf 4 Seiten geschwärzt", "0,2 MB → 2,4 MB" (neutral, ohne
// Ersparnis-Badge) und "Ergebnis ansehen" (Vollbild mit den Seiten des Ergebnisses).
function ergebnisKarte(d, r) {
  const bild = d.art === "bild";
  const erste = ersteSeite(r.stellen);
  const e = r.eintrag;

  const karte = el("section", "card fk-stack ergebnis");
  karte.setAttribute("aria-label", "Ergebnis");
  const kopf = el("div", "fk-row ergebnis-kopf");
  const text = el("div", "fk-stack ergebnis-text sw-ergebnis-text");
  const titel = el("p", "t-s t-2 ergebnis-titel", `${d.file.name} · ${bild ? "Bild" : seitenText(e.seiten)}`);
  titel.title = d.file.name;
  const groesse = el("p", "t-s t-muted t-num");
  const pfeil = el("span", null, " → ");
  pfeil.setAttribute("aria-hidden", "true");
  groesse.append(humanSize(d.file.size), pfeil, el("span", "sr-only", " zu "), humanSize(r.blob.size));
  text.append(titel, el("p", "t-l", `${stellenSumme(r.stellen, bild)} geschwärzt`), groesse);
  kopf.append(seitenMini({ eintrag: e, nr: erste }, "mini-gross sw-ergebnis-mini"), text);

  const ansehen = el("button", "btn btn-secondary btn-sm btn-block");
  ansehen.type = "button";
  ansehen.append(icon("ansehen", 18, 2), el("span", null, "Ergebnis ansehen"));
  ansehen.addEventListener("click", () => zeigeVollbild({
    seiten: Array.from({ length: e.seiten }, (_, i) => ({ datei: e, nr: i + 1, drehung: 0 })),
    start: erste - 1,
    ausloeser: ansehen,
  }));

  karte.append(kopf, ansehen);
  return karte;
}

// Prüfbericht: nur Punkte, die die Selbstprüfung (redact.js) bestätigt hat.
function pruefbericht(bild) {
  const liste = el("ul", "report");
  for (const punkt of PRUEFBERICHT[bild ? "bild" : "pdf"]) {
    const li = el("li");
    li.append(icon("haken", 18, 2.4), el("span", null, punkt));
    liste.append(li);
  }
  return abschnitt("Prüfbericht", liste);
}

function formatZeile(endung) {
  const zeile = el("div", "card fk-row sw-format");
  zeile.append(el("span", "t-body sw-format-name", "Format"), el("b", "t-body", endung === "pdf" ? "PDF" : endung === "png" ? "PNG" : "JPG"));
  return zeile;
}

function speichernSchritt(ctx) {
  const o = ctx.optionen;
  const d = ctx.dateien[0];
  const r = o.ergebnis;
  const bild = d.art === "bild";
  const endung = endungNachVerkleinern(d);
  const vorschlag = `${ohneEndung(d.file.name)}_geschwärzt`;
  o.name ??= vorschlag;

  const teile = [
    ergebnisKarte(d, r),
    pruefbericht(bild),
    abschnitt("Ausgabe", formatZeile(endung)),
    hinweis(`Nur die geschwärzten Stellen sind entfernt. Prüfe vor dem Weitergeben ${bild ? "das ganze Bild" : "alle Seiten"}.`),
  ];
  if (r.verkleinert) {
    teile.push(hinweis(`Das Bild war sehr groß und hat jetzt ${r.breite} × ${r.hoehe} Pixel – sonst ließe es sich auf manchen Geräten nicht verarbeiten.`));
  }
  // Größer geworden: dieselbe Regel wie der Tipp auf "Gespeichert ✓" (Nachtrag 6.3).
  const herkunft = { aktion: "schwaerzen", vorher: d.file.size };
  if (verkleinernGrund([r.blob.size], herkunft)?.art === "gewachsen") {
    teile.push(hinweis("Die Datei ist größer geworden. Nach dem Speichern kannst du sie gleich verkleinern.", { art: "tip", iconName: "info" }));
  }

  // Dateiname mit zwei Zeilen darunter (Nachtrag 6.2).
  const feld = namensFeld({
    wert: o.name, endung, mitHinweis: false,
    beiEingabe: (v) => { o.name = v; ctx.geaendert(); },
  });
  feld.element.append(
    el("p", "field-hint", "Steht im Dateinamen etwas Persönliches? Dann ändere ihn hier."),
    el("p", "field-hint", "Wird als neue Datei gespeichert – das Original bleibt unverändert."),
  );
  teile.push(feld.element);

  const speichern = hauptKnopf("Speichern", async () => {
    const name = `${sichererName(o.name, vorschlag)}.${endung}`;
    const ziel = await speicherZiel([name]);
    if (!ziel) return; // "Speichern unter" abgebrochen
    const gespeichert = await speichereErgebnis(speichern, ziel, [{ blob: r.blob, name }]);
    if (!gespeichert) return;
    // Miniatur, Größe und Herkunft kommen aus dem Ergebnis – nie aus dem Original.
    zeigeGespeichert(ctx, {
      gespeichert,
      bilder: [{ eintrag: r.eintrag, nr: ersteSeite(r.stellen) }],
      zusatz: `${stellenText(anzahlIn(r.stellen))} geschwärzt`,
      herkunft,
    });
  }, "speichern");

  return { inhalt: schrittInhalt(...teile), dock: speichern };
}
