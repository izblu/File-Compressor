// pdf.js – PDF-Kompression im Browser mit der Bibliothek pdf.js (Mozilla).
//
// Idee: Jede Seite wird auf ein Canvas gerendert, als JPEG (mit der gewählten
// Qualitätsstufe) neu kodiert und anschließend zu einem neuen PDF zusammengesetzt.
// Das ist sehr leichtgewichtig (~1,4 MB Bibliothek statt ~10 MB Engine) und
// liefert für Scans/Foto-PDFs die beste Verkleinerung.
//
// Kompromiss: Der Text wird Teil des Bildes (nicht mehr markier-/durchsuchbar).
// Wird ein PDF dadurch nicht kleiner, behalten wir das Original ("keine Einsparung").
//
// pdf.js (~1,4 MB) wird absichtlich erst geladen, wenn wirklich ein PDF kommt.

// pdf.js nur einmal laden und den (großen) Worker lokal verdrahten.
let pdfjsPromise = null;
export function ladePdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("./lib/pdfjs/pdf.min.mjs").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = new URL(
        "./lib/pdfjs/pdf.worker.min.mjs",
        import.meta.url
      ).href;
      return lib;
    });
  }
  return pdfjsPromise;
}

// pdf-lib (~0,5 MB) für Zusammenführen/Trennen: einmal als UMD-Skript laden und
// das globale PDFLib zurückgeben. Wird nur bei Bedarf geladen.
let pdfLibPromise = null;
export function ladePdfLib() {
  if (!pdfLibPromise) {
    pdfLibPromise = new Promise((resolve, reject) => {
      if (window.PDFLib) return resolve(window.PDFLib);
      const s = document.createElement("script");
      s.src = "./lib/pdf-lib.min.js";
      s.onload = () =>
        window.PDFLib ? resolve(window.PDFLib) : reject(new Error("pdf-lib nicht verfügbar"));
      s.onerror = () => reject(new Error("pdf-lib konnte nicht geladen werden"));
      document.head.appendChild(s);
    });
  }
  return pdfLibPromise;
}

// "Dokument.pdf" -> "Dokument_compressed.pdf"
function zielName(originalName) {
  const punkt = originalName.lastIndexOf(".");
  const stamm = punkt > 0 ? originalName.slice(0, punkt) : originalName;
  return `${stamm}_compressed.pdf`;
}

// Render-Faktor so wählen, dass die längste Pixelkante der Seite ≈ maxSide ist
// (gleiche Logik wie bei Bildern). Geklemmt, damit nichts extrem groß/klein wird.
function zielSkalierung(breite, hoehe, maxSide) {
  const laengste = Math.max(breite, hoehe);
  let skala = maxSide / laengste;
  if (skala > 3) skala = 3;
  if (skala < 0.1) skala = 0.1;
  return skala;
}

// Canvas -> JPEG-Blob (klassisches Canvas-Element, läuft im Hauptthread).
function canvasZuJpeg(canvas, qualitaet) {
  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", qualitaet)
  );
}

// Baut aus einer Liste von JPEG-Seiten ein gültiges PDF (ein Bild pro Seite).
// Bewusst von Hand geschrieben – ein "ein JPEG je Seite"-PDF ist sehr einfach
// und spart eine weitere Bibliothek.
function bauePdf(seiten) {
  const enc = new TextEncoder();
  const teile = [];
  let laenge = 0;
  const offsets = []; // offsets[objektnummer] = Byte-Position

  const schreib = (stueck) => {
    const bytes = typeof stueck === "string" ? enc.encode(stueck) : stueck;
    teile.push(bytes);
    laenge += bytes.length;
  };
  const beginnObjekt = (nr) => {
    offsets[nr] = laenge;
    schreib(`${nr} 0 obj\n`);
  };
  const endeObjekt = () => schreib("\nendobj\n");

  // Kopf inkl. Binär-Markierung (gehört zu jedem PDF mit Binärinhalt).
  schreib("%PDF-1.7\n");
  schreib(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  const anzahl = seiten.length;
  const objekteGesamt = 2 + 3 * anzahl; // Catalog, Pages + (Page, Content, Bild) je Seite

  // 1: Katalog
  beginnObjekt(1);
  schreib("<< /Type /Catalog /Pages 2 0 R >>");
  endeObjekt();

  // 2: Seitenbaum
  const kinder = [];
  for (let i = 0; i < anzahl; i++) kinder.push(`${3 + i * 3} 0 R`);
  beginnObjekt(2);
  schreib(`<< /Type /Pages /Kids [ ${kinder.join(" ")} ] /Count ${anzahl} >>`);
  endeObjekt();

  for (let i = 0; i < anzahl; i++) {
    const { breite, hoehe, jpeg } = seiten[i];
    const seitenNr = 3 + i * 3;
    const inhaltNr = 4 + i * 3;
    const bildNr = 5 + i * 3;

    // Seite
    beginnObjekt(seitenNr);
    schreib(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${breite} ${hoehe}] ` +
        `/Resources << /XObject << /Im0 ${bildNr} 0 R >> >> /Contents ${inhaltNr} 0 R >>`
    );
    endeObjekt();

    // Inhalts-Stream: Bild über die ganze Seite zeichnen.
    const inhalt = `q\n${breite} 0 0 ${hoehe} 0 0 cm\n/Im0 Do\nQ\n`;
    const inhaltBytes = enc.encode(inhalt);
    beginnObjekt(inhaltNr);
    schreib(`<< /Length ${inhaltBytes.length} >>\nstream\n`);
    schreib(inhaltBytes);
    schreib("\nendstream");
    endeObjekt();

    // Bild (JPEG) als XObject.
    beginnObjekt(bildNr);
    schreib(
      `<< /Type /XObject /Subtype /Image /Width ${breite} /Height ${hoehe} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
    );
    schreib(jpeg);
    schreib("\nendstream");
    endeObjekt();
  }

  // Querverweistabelle (xref) + Trailer.
  const xrefPos = laenge;
  let xref = `xref\n0 ${objekteGesamt + 1}\n0000000000 65535 f \n`;
  for (let nr = 1; nr <= objekteGesamt; nr++) {
    xref += `${String(offsets[nr]).padStart(10, "0")} 00000 n \n`;
  }
  schreib(xref);
  schreib(
    `trailer\n<< /Size ${objekteGesamt + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`
  );

  // Alle Teile zu einem zusammenhängenden Byte-Array zusammenfügen.
  const ergebnis = new Uint8Array(laenge);
  let pos = 0;
  for (const teil of teile) {
    ergebnis.set(teil, pos);
    pos += teil.length;
  }
  return ergebnis;
}

// Ein PDF verkleinern. Rückgabe: { blob, name } oder null (keine Einsparung).
// onProgress(seite, anzahl) wird nach jeder fertigen Seite aufgerufen.
export async function compressPdf(file, cfg, onProgress) {
  const pdfjsLib = await ladePdfjs();
  const daten = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data: daten }).promise;
  const anzahl = doc.numPages;
  const seiten = [];

  try {
    for (let p = 1; p <= anzahl; p++) {
      const page = await doc.getPage(p);

      const basis = page.getViewport({ scale: 1 });
      const skala = zielSkalierung(basis.width, basis.height, cfg.maxSide);
      const viewport = page.getViewport({ scale: skala });

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      const ctx = canvas.getContext("2d");

      // Weißer Hintergrund (JPEG kann keine Transparenz).
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await canvasZuJpeg(canvas, cfg.quality / 100);
      const jpeg = new Uint8Array(await blob.arrayBuffer());
      seiten.push({ breite: canvas.width, hoehe: canvas.height, jpeg });

      page.cleanup();
      if (onProgress) onProgress(p, anzahl);
    }
  } finally {
    await doc.destroy();
  }

  const out = bauePdf(seiten);

  // "Keine Einsparung"-Regel: nicht kleiner -> Original behalten.
  if (out.length >= file.size) return null;

  return { blob: new Blob([out], { type: "application/pdf" }), name: zielName(file.name) };
}
