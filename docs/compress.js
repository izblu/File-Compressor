// compress.js – Aktion "Verkleinern" ohne Oberfläche: die Stärken, die Stufen
// für "Zielgröße" und das Verkleinern einer einzelnen Datei (Bilder über
// image.js/Canvas, PDFs über pdf.js).

import { verkleinereBild, istPng } from "./image.js";

// Dieselben drei Qualitätsstufen wie in compress.py (LEVELS).
export const STAERKEN = {
  stark:    { name: "Stark",    maxSide: 1000, quality: 50 },
  mittel:   { name: "Mittel",   maxSide: 1600, quality: 70 },
  schonend: { name: "Schonend", maxSide: 2200, quality: 85 },
};

// Für "Zielgröße": von bester Qualität bis zur kleinsten Stufe, bei der Text
// gerade noch lesbar bleibt. Genommen wird die beste Stufe unter dem Ziel.
const LEITER = [
  STAERKEN.schonend,
  STAERKEN.mittel,
  { maxSide: 1300, quality: 60 },
  STAERKEN.stark,
  { maxSide: 800, quality: 45 },
  { maxSide: 650, quality: 40 },
];

// Endung des Ergebnisses: PDF bleibt PDF, PNG bleibt PNG, alles andere wird JPG
// (eine .jpeg-Datei behält ihre Schreibweise).
export function endungNachVerkleinern(eintrag) {
  if (eintrag.art === "pdf") return "pdf";
  if (istPng(eintrag.file)) return "png";
  const ext = eintrag.file.name.split(".").pop().toLowerCase();
  return ext === "jpeg" ? "jpeg" : "jpg";
}

// Eine Datei (Eintrag aus intake.js) verkleinern.
// optionen: { staerke: "mittel" } oder { ziel: Bytes }.
// Rückgabe: { blob, unveraendert, erreicht, versuch }
//   unveraendert: nicht kleiner geworden → blob ist das Original
//   erreicht:     Zielgröße geschafft (bei "Stärke" immer true)
//   versuch:      Größe des verworfenen Ergebnisses (nur bei unveraendert)
export async function verkleinere(eintrag, optionen, { signal, beiSeite } = {}) {
  const original = eintrag.file;
  const { ziel } = optionen;

  // Schon kleiner als das Ziel → nichts zu tun.
  if (ziel && original.size <= ziel) return { blob: original, unveraendert: true, erreicht: true };

  const stufen = ziel ? LEITER : [STAERKEN[optionen.staerke]];
  const ergebnisse = eintrag.art === "pdf"
    ? await verkleinerePdf(original, stufen, { signal, beiSeite })
    : await verkleinereBild(original, stufen, { signal });

  let wahl = ergebnisse[0];
  let erreicht = true;
  if (ziel) {
    wahl = ergebnisse.find((b) => b.size <= ziel);
    if (!wahl) {
      erreicht = false;
      wahl = ergebnisse.reduce((klein, b) => (b.size < klein.size ? b : klein));
    }
  }

  // "Keine Einsparung"-Regel wie in compress.py: nicht kleiner → Original behalten.
  if (wahl.size >= original.size) {
    return { blob: original, unveraendert: true, erreicht: !ziel, versuch: wahl.size };
  }
  return { blob: wahl, unveraendert: false, erreicht };
}

async function verkleinerePdf(file, stufen, optionen) {
  const pdf = await import("./pdf.js");
  return pdf.verkleinerePdf(file, stufen, optionen);
}
