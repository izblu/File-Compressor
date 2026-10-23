// convert.js – Aktion "Umwandeln" ohne Oberfläche:
//   PDF  → JPG/PNG: jede Seite wird ein eigenes Bild (Rendern mit pdf.js)
//   Bild → PDF:     ein PDF mit einer Seite (pdf-lib, Bild in voller Auflösung)
//   Bild → JPG/PNG: neu kodieren (Canvas)

import { oeffnePdfjs, rendereSeite, canvasZuBlob, ladePdfLib } from "./pdf.js";
import { dekodiere, zeichne, alsBlob, istPng } from "./image.js";

// Längste Kante der Bilder aus PDF-Seiten (A4 ≈ 1414 × 2000 px, gut lesbar).
const SEITE_PX = 2000;
const JPG_QUALITAET = 0.9;

// Längste Seite der PDF-Seite aus einem Bild in Punkt (= lange Kante von A4).
// Die Seite bekommt das Seitenverhältnis des Bildes; so druckt es sich gut.
const SEITE_PT = 842;

const MIME = { pdf: "application/pdf", jpg: "image/jpeg", png: "image/png" };

// Format eines Eintrags aus intake.js als Kürzel: "pdf" | "jpg" | "png" | "webp" …
export function formatVon(eintrag) {
  return eintrag.format.toLowerCase();
}

// PDF → Bilder. Rückgabe: [{ blob, seite }] (seite = 1-basiert).
export async function pdfZuBildern(file, format, { signal, beiSeite } = {}) {
  const doc = await oeffnePdfjs(file);
  const bilder = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      signal?.throwIfAborted();
      const { canvas } = await rendereSeite(await doc.getPage(p), SEITE_PX);
      const blob = await canvasZuBlob(canvas, MIME[format], format === "jpg" ? JPG_QUALITAET : undefined);
      canvas.width = canvas.height = 0;
      bilder.push({ blob, seite: p });
      if (beiSeite) beiSeite(p, doc.numPages);
    }
  } finally {
    await doc.destroy();
  }
  return bilder;
}

// Bild → PDF/JPG/PNG. Hat das Bild schon das Zielformat, bleibt es unverändert.
export async function bildUmwandeln(eintrag, format, { signal } = {}) {
  if (formatVon(eintrag) === format) return eintrag.file;
  signal?.throwIfAborted();
  if (format === "pdf") return bildZuPdf(eintrag.file);

  const bild = await dekodiere(eintrag.file);
  try {
    // JPG kann keine Transparenz → weißer Hintergrund.
    const canvas = zeichne(bild, bild.breite, bild.hoehe, format === "jpg");
    return await alsBlob(canvas, format, JPG_QUALITAET);
  } finally {
    bild.schliessen();
  }
}

// Ein Bild als PDF-Seite. PNG bleibt verlustfrei (mit Transparenz), alles
// andere wird als JPEG eingebettet – nach der EXIF-Drehung, damit Handy-Fotos
// richtig herum stehen.
export async function bildZuPdf(file) {
  const PDFLib = await ladePdfLib();
  const png = istPng(file);
  const bild = await dekodiere(file);
  let bytes;
  try {
    const canvas = zeichne(bild, bild.breite, bild.hoehe, !png);
    const blob = await alsBlob(canvas, png ? "png" : "jpg", 0.92);
    bytes = new Uint8Array(await blob.arrayBuffer());
  } finally {
    bild.schliessen();
  }

  const doc = await PDFLib.PDFDocument.create();
  const eingebettet = png ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  const faktor = SEITE_PT / Math.max(eingebettet.width, eingebettet.height);
  const breite = eingebettet.width * faktor;
  const hoehe = eingebettet.height * faktor;
  doc.addPage([breite, hoehe]).drawImage(eingebettet, { x: 0, y: 0, width: breite, height: hoehe });
  return new Blob([await doc.save()], { type: MIME.pdf });
}
