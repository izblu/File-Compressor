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

// pdf-lib (~0,5 MB) für Zusammenführen/Trennen/Umwandeln: einmal als UMD-Skript
// laden und das globale PDFLib zurückgeben. Wird nur bei Bedarf geladen.
let pdfLibPromise = null;
export function ladePdfLib() {
  if (!pdfLibPromise) {
    pdfLibPromise = new Promise((resolve, reject) => {
      if (window.PDFLib) return resolve(window.PDFLib);
      const s = document.createElement("script");
      s.src = "./lib/pdf-lib.min.js";
      s.onload = () =>
        window.PDFLib ? resolve(window.PDFLib) : reject(new Error("pdf-lib nicht verfügbar"));
      s.onerror = () => {
        pdfLibPromise = null; // beim nächsten Mal erneut versuchen
        reject(new Error("pdf-lib nicht verfügbar"));
      };
      document.head.appendChild(s);
    });
  }
  return pdfLibPromise;
}

// Ein PDF mit pdf.js öffnen (die Datei wird dafür einmal gelesen).
export async function oeffnePdfjs(file) {
  const pdfjsLib = await ladePdfjs();
  const daten = new Uint8Array(await file.arrayBuffer());
  return pdfjsLib.getDocument({ data: daten }).promise;
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

// Leeres Canvas mit weißem Papier (JPEG kann keine Transparenz).
function papier(breite, hoehe) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(breite));
  canvas.height = Math.max(1, Math.ceil(hoehe));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

// Speicher eines Canvas sofort freigeben (hilft vor allem Safari).
function canvasWeg(canvas) {
  canvas.width = 0;
  canvas.height = 0;
}

// Eine Seite so rendern, dass ihre längste Kante maxSide Pixel hat.
// Rückgabe: { canvas, breite, hoehe } – breite/hoehe = Seitengröße in Punkt.
export async function rendereSeite(page, maxSide) {
  const basis = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: zielSkalierung(basis.width, basis.height, maxSide) });
  const canvas = papier(viewport.width, viewport.height);
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  page.cleanup();
  return { canvas, breite: basis.width, hoehe: basis.height };
}

// Canvas -> Blob (klassisches Canvas-Element, läuft im Hauptthread).
export function canvasZuBlob(canvas, typ, qualitaet) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Bild nicht erzeugt"))), typ, qualitaet)
  );
}

// Canvas auf neue Pixelmaße verkleinern (für die kleineren Stufen).
function verkleinert(canvas, breite, hoehe) {
  const ziel = document.createElement("canvas");
  ziel.width = breite;
  ziel.height = hoehe;
  const ctx = ziel.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, breite, hoehe);
  return ziel;
}

// Zahl für das PDF (Punkt-Maße, höchstens 2 Nachkommastellen).
const pt = (n) => String(Math.round(n * 100) / 100);

// Baut aus einer Liste von JPEG-Seiten ein gültiges PDF (ein Bild pro Seite).
// Jede Seite: { breite, hoehe (Punkt), pxBreite, pxHoehe, jpeg }. Die Seite
// behält ihre Originalgröße, das Bild wird darauf gezogen.
// Bewusst von Hand geschrieben – ein "ein JPEG je Seite"-PDF ist sehr einfach
// und spart eine weitere Bibliothek. Außer den Bildern steht nichts darin: kein
// Text, keine Metadaten, keine Kommentare (darauf baut auch redact.js).
export function bauePdf(seiten) {
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
    const { breite, hoehe, pxBreite, pxHoehe, jpeg } = seiten[i];
    const seitenNr = 3 + i * 3;
    const inhaltNr = 4 + i * 3;
    const bildNr = 5 + i * 3;

    // Seite
    beginnObjekt(seitenNr);
    schreib(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pt(breite)} ${pt(hoehe)}] ` +
        `/Resources << /XObject << /Im0 ${bildNr} 0 R >> >> /Contents ${inhaltNr} 0 R >>`
    );
    endeObjekt();

    // Inhalts-Stream: Bild über die ganze Seite zeichnen.
    const inhalt = `q\n${pt(breite)} 0 0 ${pt(hoehe)} 0 0 cm\n/Im0 Do\nQ\n`;
    const inhaltBytes = enc.encode(inhalt);
    beginnObjekt(inhaltNr);
    schreib(`<< /Length ${inhaltBytes.length} >>\nstream\n`);
    schreib(inhaltBytes);
    schreib("\nendstream");
    endeObjekt();

    // Bild (JPEG) als XObject.
    beginnObjekt(bildNr);
    schreib(
      `<< /Type /XObject /Subtype /Image /Width ${pxBreite} /Height ${pxHoehe} ` +
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

// Ein PDF in einer oder mehreren Stufen ({ maxSide, quality }) verkleinern.
// Jede Seite wird nur einmal gerendert (in der größten nötigen Auflösung) und
// dann je Stufe als JPEG kodiert – so kostet "Zielgröße" kaum mehr Zeit.
// Rückgabe: je Stufe ein PDF-Blob, in der Reihenfolge von stufen.
// beiSeite(seite, anzahl) meldet den Fortschritt; signal bricht ab.
export async function verkleinerePdf(file, stufen, { signal, beiSeite } = {}) {
  const doc = await oeffnePdfjs(file);
  const anzahl = doc.numPages;
  const seiten = stufen.map(() => []);
  const groesste = Math.max(...stufen.map((s) => s.maxSide));

  try {
    for (let p = 1; p <= anzahl; p++) {
      signal?.throwIfAborted();
      const { canvas, breite, hoehe } = await rendereSeite(await doc.getPage(p), groesste);

      for (let i = 0; i < stufen.length; i++) {
        signal?.throwIfAborted();
        const s = stufen[i];
        const skala = zielSkalierung(breite, hoehe, s.maxSide);
        const pxBreite = Math.max(1, Math.ceil(breite * skala));
        const pxHoehe = Math.max(1, Math.ceil(hoehe * skala));
        const quelle = pxBreite >= canvas.width ? canvas : verkleinert(canvas, pxBreite, pxHoehe);
        const blob = await canvasZuBlob(quelle, "image/jpeg", s.quality / 100);
        seiten[i].push({
          breite, hoehe, pxBreite: quelle.width, pxHoehe: quelle.height,
          jpeg: new Uint8Array(await blob.arrayBuffer()),
        });
        if (quelle !== canvas) canvasWeg(quelle);
      }

      canvasWeg(canvas);
      if (beiSeite) beiSeite(p, anzahl);
    }
  } finally {
    await doc.destroy();
  }

  return seiten.map((s) => new Blob([bauePdf(s)], { type: "application/pdf" }));
}
