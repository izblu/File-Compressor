// pdf.js – PDF-Kompression im Browser mit MuPDF (WebAssembly).
//
// Verkleinert die in einem PDF eingebetteten Bilder (herunterrechnen + als JPEG
// neu kodieren) – analog zu compress_pdf / _recompress_pdf_image in compress.py.
// Text und Layout des PDFs bleiben unverändert.
//
// MuPDF ist eine ~10 MB große WebAssembly-Engine. Diese Datei wird in app.js
// daher absichtlich erst dann geladen, wenn wirklich ein PDF verarbeitet wird.

import * as mupdf from "./lib/mupdf.js";

// Zielmaße so, dass die längere Kante höchstens maxSide ist (nur verkleinern).
function zielMasse(breite, hoehe, maxSide) {
  const laengste = Math.max(breite, hoehe);
  if (laengste <= maxSide) return { breite, hoehe };
  const faktor = maxSide / laengste;
  return { breite: Math.round(breite * faktor), hoehe: Math.round(hoehe * faktor) };
}

// "Dokument.pdf" -> "Dokument_compressed.pdf"
function zielName(originalName) {
  const punkt = originalName.lastIndexOf(".");
  const stamm = punkt > 0 ? originalName.slice(0, punkt) : originalName;
  return `${stamm}_compressed.pdf`;
}

// Ein einzelnes eingebettetes Bild herunterrechnen und als JPEG zurückschreiben.
// obj ist die *indirekte* Referenz auf das Bild-Objekt (Stream-Operationen
// funktionieren nur darauf, nicht auf dem aufgelösten Dictionary).
async function rekomprimiereBild(doc, obj, cfg) {
  const dict = obj.resolve();

  // Nur echte Bilder verarbeiten.
  const subtype = dict.get("Subtype");
  if (!subtype.isName() || subtype.asName() !== "Image") return;

  // Bilder mit Transparenz/Maske überspringen – JPEG kann kein Alpha (wie compress.py).
  if (!dict.get("SMask").isNull()) return;
  const maske = dict.get("ImageMask");
  if (maske.isBoolean() && maske.asBoolean()) return;

  // Ursprüngliche Stream-Größe merken (für den Vergleich danach).
  let altBytes = Infinity;
  const laenge = dict.get("Length");
  if (laenge.isNumber()) altBytes = laenge.asNumber();

  // Bild dekodieren -> Pixmap -> PNG -> Bitmap (lässt den Browser dekodieren).
  const pixmap = doc.loadImage(obj).toPixmap();
  const bitmap = await createImageBitmap(
    new Blob([pixmap.asPNG()], { type: "image/png" })
  );

  // Auf Zielgröße skalieren und als JPEG mit gewählter Qualität kodieren.
  const { breite, hoehe } = zielMasse(bitmap.width, bitmap.height, cfg.maxSide);
  const canvas = new OffscreenCanvas(breite, hoehe);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; // JPEG kennt keine Transparenz
  ctx.fillRect(0, 0, breite, hoehe);
  ctx.drawImage(bitmap, 0, 0, breite, hoehe);
  if (bitmap.close) bitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: cfg.quality / 100 });
  const jpegBytes = new Uint8Array(await blob.arrayBuffer());

  // Nur ersetzen, wenn das neue Bild wirklich kleiner ist (wie compress.py).
  if (jpegBytes.length >= altBytes) return;

  // Bild-Objekt in-place durch das neue JPEG ersetzen. Weil wir das vorhandene
  // Objekt überschreiben, bleiben alle Verweise aus den Seiten gültig.
  for (const key of ["SMask", "Mask", "Decode", "DecodeParms", "ImageMask", "Interpolate"]) {
    try { obj.delete(key); } catch {}
  }
  obj.put("Width", breite);
  obj.put("Height", hoehe);
  obj.put("ColorSpace", doc.newName("DeviceRGB"));
  obj.put("BitsPerComponent", 8);
  obj.put("Filter", doc.newName("DCTDecode")); // DCTDecode = JPEG
  obj.writeRawStream(jpegBytes);
}

// Ein PDF verkleinern. Rückgabe: { blob, name } oder null (keine Einsparung).
export async function compressPdf(file, cfg) {
  const doc = new mupdf.PDFDocument(new Uint8Array(await file.arrayBuffer()));

  // Alle Objekte durchgehen und Bilder neu komprimieren.
  const anzahl = doc.countObjects();
  for (let i = 1; i < anzahl; i++) {
    let obj;
    try {
      obj = doc.newIndirect(i);
    } catch {
      continue;
    }
    try {
      await rekomprimiereBild(doc, obj, cfg);
    } catch {
      // Einzelnes Bild überspringen statt den ganzen Vorgang abzubrechen.
    }
  }

  // compress = Streams komprimieren, garbage=compact = ungenutzte Objekte entfernen.
  const out = doc.saveToBuffer("compress,garbage=compact").asUint8Array();

  // "Keine Einsparung"-Regel: nicht kleiner -> Original behalten.
  if (out.length >= file.size) return null;

  return { blob: new Blob([out], { type: "application/pdf" }), name: zielName(file.name) };
}
