// split.js – Aktion "Trennen" ohne Oberfläche: ausgewählte Seiten aus einem
// PDF herauslösen – verlustfrei mit pdf-lib (Text bleibt markierbar).

import { ladePdfLib } from "./pdf.js";

// seiten: 1-basierte Seitenzahlen (aufsteigend). einzeln = true: je Seite ein
// eigenes PDF, sonst alle Seiten in einem PDF.
// Rückgabe: [{ blob, seiten }]. beiDatei(fertig, anzahl) meldet den Fortschritt.
export async function trenne(file, seiten, einzeln, { signal, beiDatei } = {}) {
  const PDFLib = await ladePdfLib();
  const quelle = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), {
    ignoreEncryption: true,
  });

  const gruppen = einzeln ? seiten.map((s) => [s]) : [seiten];
  const ergebnis = [];
  for (const gruppe of gruppen) {
    signal?.throwIfAborted();
    const ziel = await PDFLib.PDFDocument.create();
    const kopien = await ziel.copyPages(quelle, gruppe.map((s) => s - 1));
    kopien.forEach((p) => ziel.addPage(p));
    ergebnis.push({ blob: new Blob([await ziel.save()], { type: "application/pdf" }), seiten: gruppe });
    if (beiDatei) beiDatei(ergebnis.length, gruppen.length);
  }
  return ergebnis;
}
