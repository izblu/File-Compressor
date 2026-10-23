// merge.js – "Zusammenführen" und "Seiten ordnen" ohne Oberfläche: baut aus
// einer Liste von Seiten (neue Reihenfolge, gedreht, aus PDFs und Bildern) ein
// neues PDF. PDF-Seiten werden verlustfrei kopiert (Text bleibt markierbar),
// Bilder als eigene Seite eingebettet.

import { ladePdfLib } from "./pdf.js";
import { bildAlsSeite } from "./convert.js";

// seiten: [{ datei (Eintrag aus intake.js), nr (1-basiert), drehung (0/90/180/270) }].
// beiSeite(fertig, anzahl) meldet den Fortschritt; signal bricht ab.
export async function baueDokument(seiten, { signal, beiSeite } = {}) {
  const PDFLib = await ladePdfLib();
  const ziel = await PDFLib.PDFDocument.create();

  // Jedes PDF nur einmal öffnen und alle benötigten Seiten auf einmal kopieren.
  const kopien = new Map(); // datei → Map(nr → kopierte Seite)
  const pdfs = new Set(seiten.filter((s) => s.datei.art === "pdf").map((s) => s.datei));
  for (const datei of pdfs) {
    signal?.throwIfAborted();
    const quelle = await PDFLib.PDFDocument.load(new Uint8Array(await datei.file.arrayBuffer()), {
      ignoreEncryption: true,
    });
    const nummern = seiten.filter((s) => s.datei === datei).map((s) => s.nr);
    const kopiert = await ziel.copyPages(quelle, nummern.map((n) => n - 1));
    kopien.set(datei, new Map(nummern.map((n, i) => [n, kopiert[i]])));
  }

  for (let i = 0; i < seiten.length; i++) {
    signal?.throwIfAborted();
    const s = seiten[i];
    const seite = s.datei.art === "pdf"
      ? ziel.addPage(kopien.get(s.datei).get(s.nr))
      : await bildAlsSeite(ziel, s.datei.file);
    if (s.drehung) {
      // Eine schon gedrehte PDF-Seite (/Rotate) dreht von dort aus weiter.
      const winkel = (((seite.getRotation().angle + s.drehung) % 360) + 360) % 360;
      seite.setRotation(PDFLib.degrees(winkel));
    }
    if (beiSeite) beiSeite(i + 1, seiten.length);
  }

  signal?.throwIfAborted();
  return new Blob([await ziel.save()], { type: "application/pdf" });
}
