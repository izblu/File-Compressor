// redact.js – Aktion "Schwärzen" ohne Oberfläche (Konzept Kap. 2, Nachtrag Kap. 2).
// Die Stellen werden IN DIE PIXEL gemalt, nie als Rechteck darübergelegt:
//   · PDF: jede Seite rendern (lange Kante 2000 px), die Stellen schwarz
//     übermalen, als JPEG kodieren und mit bauePdf ein reines Bild-PDF bauen –
//     ohne Text, Metadaten, Kommentare, Anhänge, Formularfelder und Lesezeichen.
//     Auch Seiten ohne Stelle werden so neu aufgebaut ("wie ein sauberer Scan").
//   · Bild: auf ein Canvas zeichnen, übermalen, neu kodieren. PNG bleibt PNG,
//     alles andere wird JPG. EXIF, XMP und IPTC fallen dabei weg; was ein
//     Browser trotzdem hineinschreibt, wird entfernt.
// Danach prüft eine Selbstprüfung das Ergebnis (Konzept 2.7). Schlägt sie fehl,
// gibt es einen SelbstpruefungFehler statt eines Ergebnisses – gespeichert wird
// dann nichts.
//
// Stellen: { [seite]: [{ x, y, w, h }] } bzw. beim Bild eine Liste – in Prozent
// der angezeigten (ggf. durch das PDF gedrehten) Seite, genau so, wie
// rendereSeite sie zeichnet.

import { oeffnePdfjs, rendereSeite, canvasZuBlob, bauePdf } from "./pdf.js";
import { dekodiere, zeichne, alsBlob, istPng } from "./image.js";

const SEITE_PX = 2000;       // lange Kante je PDF-Seite (A4 ≈ 170 dpi, gut lesbar und druckbar)
const JPEG_SEITE = 0.85;     // Qualität der Seitenbilder im PDF
const JPEG_BILD = 0.92;      // Qualität bei Fotos
const MAX_PIXEL = 16777216;  // Canvas-Grenze in Safari (iPhone) – größere Fotos werden verkleinert

// Metadaten-Felder eines PDFs, die im Ergebnis fehlen müssen.
const PDF_ANGABEN = ["Title", "Author", "Subject", "Keywords", "Creator", "Producer", "CreationDate", "ModDate", "Custom"];

export class SelbstpruefungFehler extends Error {
  constructor(grund) {
    super(`Selbstprüfung: ${grund}`);
    this.name = "SelbstpruefungFehler";
  }
}

// Stellen schwarz in ein Canvas malen. Die Grenzen werden nach außen auf ganze
// Pixel gerundet – so entstehen keine halb deckenden Randpixel.
export function maleStellen(ctx, breite, hoehe, stellen) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000000";
  for (const s of stellen) {
    const x0 = Math.max(0, Math.floor((s.x / 100) * breite));
    const y0 = Math.max(0, Math.floor((s.y / 100) * hoehe));
    const x1 = Math.min(breite, Math.ceil(((s.x + s.w) / 100) * breite));
    const y1 = Math.min(hoehe, Math.ceil(((s.y + s.h) / 100) * hoehe));
    if (x1 > x0 && y1 > y0) ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  ctx.restore();
}

// --- PDF ---

// Rückgabe: { blob, seiten } – schon geprüft. beiSeite(seite, anzahl, canvas)
// meldet jede fertige Seite (canvas = die geschwärzte Seite, nur während des
// Aufrufs gültig); signal bricht ab.
export async function schwaerzePdf(file, stellen, { signal, beiSeite } = {}) {
  const doc = await oeffnePdfjs(file);
  const anzahl = doc.numPages;
  const seiten = [];
  try {
    for (let p = 1; p <= anzahl; p++) {
      signal?.throwIfAborted();
      const { canvas, breite, hoehe } = await rendereSeite(await doc.getPage(p), SEITE_PX);
      maleStellen(canvas.getContext("2d"), canvas.width, canvas.height, stellen[p] || []);
      const jpeg = await canvasZuBlob(canvas, "image/jpeg", JPEG_SEITE);
      seiten.push({
        breite, hoehe, pxBreite: canvas.width, pxHoehe: canvas.height,
        jpeg: new Uint8Array(await jpeg.arrayBuffer()),
      });
      if (beiSeite) beiSeite(p, anzahl, canvas);
      canvas.width = canvas.height = 0; // Speicher sofort freigeben (hilft Safari)
    }
  } finally {
    await doc.destroy();
  }
  signal?.throwIfAborted();
  const blob = new Blob([bauePdf(seiten)], { type: "application/pdf" });
  await pruefePdf(blob, anzahl);
  return { blob, seiten: anzahl };
}

// Selbstprüfung: das Ergebnis noch einmal mit pdf.js öffnen. Es muss die
// richtige Seitenzahl haben; auf keiner Seite darf Text (auch unsichtbarer),
// ein Kommentar oder ein Formularfeld stehen; Metadaten, Anhänge und
// Lesezeichen darf es nicht geben.
async function pruefePdf(blob, anzahl) {
  const doc = await oeffnePdfjs(blob);
  try {
    if (doc.numPages !== anzahl) throw new SelbstpruefungFehler(`${doc.numPages} statt ${anzahl} Seiten`);
    for (let p = 1; p <= anzahl; p++) {
      const page = await doc.getPage(p);
      if ((await page.getTextContent()).items.length) throw new SelbstpruefungFehler(`Text auf Seite ${p}`);
      if ((await page.getAnnotations()).length) throw new SelbstpruefungFehler(`Kommentar auf Seite ${p}`);
      page.cleanup();
    }
    const { info, metadata } = await doc.getMetadata();
    if (metadata || info.IsAcroFormPresent || PDF_ANGABEN.some((k) => info[k])) throw new SelbstpruefungFehler("Metadaten");
    if (await doc.getAttachments()) throw new SelbstpruefungFehler("Anhänge");
    if (await doc.getOutline()) throw new SelbstpruefungFehler("Lesezeichen");
  } finally {
    await doc.destroy();
  }
}

// --- Bild ---

// stellen = die Stellen auf dem Bild (Liste). Rückgabe: { blob, png, breite,
// hoehe, verkleinert } – schon geprüft. verkleinert = das Foto war größer als
// die Canvas-Grenze und hat jetzt weniger Pixel.
export async function schwaerzeBild(file, stellen, { signal, beiSeite } = {}) {
  const png = istPng(file);
  const bild = await dekodiere(file);
  let canvas;
  let faktor;
  try {
    signal?.throwIfAborted();
    faktor = Math.min(1, Math.sqrt(MAX_PIXEL / (bild.breite * bild.hoehe)));
    canvas = zeichne(bild, Math.max(1, Math.floor(bild.breite * faktor)), Math.max(1, Math.floor(bild.hoehe * faktor)), !png);
  } finally {
    bild.schliessen();
  }
  maleStellen(canvas.getContext("2d"), canvas.width, canvas.height, stellen);
  if (beiSeite) beiSeite(1, 1, canvas);
  const roh = await alsBlob(canvas, png ? "png" : "jpg", JPEG_BILD);
  const { width: breite, height: hoehe } = canvas;
  canvas.width = canvas.height = 0;
  signal?.throwIfAborted();
  const bytes = ohneBildangaben(new Uint8Array(await roh.arrayBuffer()), png);
  if (bildangaben(bytes, png).length) throw new SelbstpruefungFehler("Bildangaben");
  return { blob: new Blob([bytes], { type: roh.type }), png, breite, hoehe, verkleinert: faktor < 1 };
}

// Abschnitte einer Bilddatei, die Angaben zum Bild tragen können:
// JPEG: APP1 (EXIF mit Ort, Kamera und Vorschaubild; XMP), APP13 (IPTC), Kommentar.
// PNG: eXIf und alle Text-Abschnitte (darin stecken XMP und Roh-EXIF/IPTC).
// Rückgabe: Liste [{ von, bis }] (Byte-Bereiche). Unlesbare Datei → Fehler.
function bildangaben(b, png) {
  const treffer = [];
  if (png) {
    // Signatur (8 Byte), dann Abschnitte: Länge (4) · Typ (4) · Daten · Prüfsumme (4).
    for (let i = 8; i + 8 <= b.length;) {
      const laenge = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
      const typ = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
      if (["eXIf", "tEXt", "iTXt", "zTXt"].includes(typ)) treffer.push({ von: i, bis: i + 12 + laenge });
      if (typ === "IEND") return treffer;
      i += 12 + laenge;
    }
    throw new SelbstpruefungFehler("PNG unvollständig");
  }
  // JPEG: Anfang FFD8, dann Abschnitte FFxx + Länge (2) bis zu den Bilddaten (FFDA).
  if (b[0] !== 0xff || b[1] !== 0xd8) throw new SelbstpruefungFehler("kein JPEG");
  for (let i = 2; i + 4 <= b.length && b[i] === 0xff;) {
    const marke = b[i + 1];
    if (marke === 0xda) return treffer;
    const bis = i + 2 + ((b[i + 2] << 8) | b[i + 3]);
    if (marke === 0xe1 || marke === 0xed || marke === 0xfe) treffer.push({ von: i, bis });
    i = bis;
  }
  throw new SelbstpruefungFehler("JPEG unvollständig");
}

function ohneBildangaben(b, png) {
  const weg = bildangaben(b, png);
  if (!weg.length) return b;
  const teile = [];
  let pos = 0;
  for (const { von, bis } of weg) {
    teile.push(b.subarray(pos, von));
    pos = bis;
  }
  teile.push(b.subarray(pos));
  const neu = new Uint8Array(teile.reduce((s, t) => s + t.length, 0));
  let i = 0;
  for (const t of teile) {
    neu.set(t, i);
    i += t.length;
  }
  return neu;
}
