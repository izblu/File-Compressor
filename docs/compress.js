// compress.js – Aktion "Verkleinern" ohne Oberfläche: die Qualitätsstufen und
// das Verkleinern einer einzelnen Datei (Bilder über image.js/Canvas, PDFs über
// pdf.js). Die Oberfläche dazu (Stärke wählen, Verarbeiten, Speichern) folgt
// im Wizard.

import { compressImage } from "./image.js";

// Dieselben drei Qualitätsstufen wie in compress.py (LEVELS).
export const LEVELS = {
  1: { name: "Stark",    maxSide: 1000, quality: 50 },
  2: { name: "Mittel",   maxSide: 1600, quality: 70 },
  3: { name: "Schonend", maxSide: 2200, quality: 85 },
};

export function istPdf(datei) {
  return datei.type === "application/pdf" || datei.name.toLowerCase().endsWith(".pdf");
}

// Eine Datei verkleinern. Rückgabe { blob, name } oder null (keine Einsparung).
// onProgress(seite, anzahl) meldet bei PDFs den Fortschritt je Seite.
export async function verkleinere(datei, cfg, onProgress) {
  if (istPdf(datei)) {
    const { compressPdf } = await import("./pdf.js");
    return compressPdf(datei, cfg, onProgress);
  }
  return compressImage(datei, cfg);
}
