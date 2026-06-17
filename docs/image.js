// image.js – Bildkompression direkt im Browser über die Canvas-API.
//
// Reproduziert das Verhalten von compress.py:
//   - Bild auf max_side herunterskalieren (nur verkleinern, nie vergrößern)
//   - als JPEG mit fester Qualität neu speichern (PNG bleibt PNG)
//   - wenn das Ergebnis nicht kleiner ist, wird es verworfen ("keine Einsparung")
//
// Es wird KEINE externe Bibliothek gebraucht – der Browser kann das von Haus aus.

// Berechnet die Zielmaße so, dass die längere Kante höchstens maxSide ist.
// Gibt die Originalmaße zurück, falls das Bild ohnehin klein genug ist.
function zielMasse(breite, hoehe, maxSide) {
  const laengsteKante = Math.max(breite, hoehe);
  if (laengsteKante <= maxSide) {
    return { breite, hoehe };
  }
  const faktor = maxSide / laengsteKante;
  return {
    breite: Math.round(breite * faktor),
    hoehe: Math.round(hoehe * faktor),
  };
}

// Hängt "_compressed" an den Dateinamen an und setzt die gewünschte Endung.
// Beispiel: "Urlaub.JPG" -> "Urlaub_compressed.jpg"
function zielName(originalName, endung) {
  const punkt = originalName.lastIndexOf(".");
  const stamm = punkt > 0 ? originalName.slice(0, punkt) : originalName;
  return `${stamm}_compressed.${endung}`;
}

// Wandelt ein Canvas in ein Blob (Datei-Inhalt) um. Die nötige Methode
// unterscheidet sich je nachdem, ob ein normales oder ein Offscreen-Canvas
// verwendet wird – diese Hilfsfunktion gleicht das aus.
function canvasZuBlob(canvas, typ, qualitaet) {
  if (canvas.convertToBlob) {
    // OffscreenCanvas (kann auch in einem Web-Worker laufen)
    return canvas.convertToBlob({ type: typ, quality: qualitaet });
  }
  // Normales <canvas>-Element
  return new Promise((resolve) => canvas.toBlob(resolve, typ, qualitaet));
}

// Komprimiert eine einzelne Bilddatei.
// Rückgabe: { blob, name }  oder  null, wenn keine Einsparung möglich war.
export async function compressImage(file, cfg) {
  const istPng =
    file.type === "image/png" || file.name.toLowerCase().endsWith(".png");

  // Bild dekodieren. createImageBitmap ist schnell und beachtet die
  // EXIF-Drehung (damit Handy-Fotos nicht auf der Seite liegen).
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Ältere Browser kennen die Option nicht -> ohne erneut versuchen.
    bitmap = await createImageBitmap(file);
  }

  const { breite, hoehe } = zielMasse(bitmap.width, bitmap.height, cfg.maxSide);

  // Passendes Canvas anlegen (Offscreen, falls verfügbar – sonst klassisch).
  let canvas;
  if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(breite, hoehe);
  } else {
    canvas = document.createElement("canvas");
    canvas.width = breite;
    canvas.height = hoehe;
  }

  const ctx = canvas.getContext("2d");

  // Für JPEG (kann keine Transparenz) zuerst weißen Hintergrund füllen,
  // damit transparente Bereiche nicht schwarz werden.
  if (!istPng) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, breite, hoehe);
  }
  ctx.drawImage(bitmap, 0, 0, breite, hoehe);
  if (bitmap.close) bitmap.close(); // Speicher früh freigeben.

  // PNG bleibt PNG; alles andere wird als JPEG mit gewählter Qualität gespeichert.
  const typ = istPng ? "image/png" : "image/jpeg";
  const qualitaet = istPng ? undefined : cfg.quality / 100;
  const blob = await canvasZuBlob(canvas, typ, qualitaet);

  // "Keine Einsparung"-Regel wie in compress.py: nicht kleiner -> verwerfen.
  if (!blob || blob.size >= file.size) {
    return null;
  }

  return { blob, name: zielName(file.name, istPng ? "png" : "jpg") };
}
