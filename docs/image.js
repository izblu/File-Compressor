// image.js – Bildkompression direkt im Browser über die Canvas-API.
//
// Reproduziert das Verhalten von compress.py:
//   - Bild auf max_side herunterskalieren (nur verkleinern, nie vergrößern)
//   - als JPEG mit fester Qualität neu speichern (PNG bleibt PNG)
//   - wenn das Ergebnis nicht kleiner ist, wird es verworfen ("keine Einsparung",
//     entscheidet compress.js)
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
    breite: Math.max(1, Math.round(breite * faktor)),
    hoehe: Math.max(1, Math.round(hoehe * faktor)),
  };
}

export const istPng = (file) =>
  file.type === "image/png" || file.name.toLowerCase().endsWith(".png");

// Wandelt ein Canvas in ein Blob (Datei-Inhalt) um. Die nötige Methode
// unterscheidet sich je nachdem, ob ein normales oder ein Offscreen-Canvas
// verwendet wird – diese Hilfsfunktion gleicht das aus.
function canvasZuBlob(canvas, typ, qualitaet) {
  if (canvas.convertToBlob) {
    // OffscreenCanvas (kann auch in einem Web-Worker laufen)
    return canvas.convertToBlob({ type: typ, quality: qualitaet });
  }
  // Normales <canvas>-Element
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Bild nicht erzeugt"))), typ, qualitaet)
  );
}

// Passendes Canvas anlegen (Offscreen, falls verfügbar – sonst klassisch).
function neuesCanvas(breite, hoehe) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(breite, hoehe);
  const canvas = document.createElement("canvas");
  canvas.width = breite;
  canvas.height = hoehe;
  return canvas;
}

// Bild dekodieren. createImageBitmap ist schnell und beachtet die EXIF-Drehung
// (damit Handy-Fotos nicht auf der Seite liegen). Für Formate, die nur ein
// <img> öffnen kann (z. B. HEIC in Safari), gibt es einen Umweg.
// Rückgabe: { quelle, breite, hoehe, schliessen() } – quelle passt in drawImage.
export async function dekodiere(file) {
  let bitmap = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      bitmap = await createImageBitmap(file); // ältere Browser kennen die Option nicht
    } catch {
      bitmap = null;
    }
  }
  if (bitmap) {
    return { quelle: bitmap, breite: bitmap.width, hoehe: bitmap.height, schliessen: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } finally {
    URL.revokeObjectURL(url);
  }
  return { quelle: img, breite: img.naturalWidth, hoehe: img.naturalHeight, schliessen: () => {} };
}

// Bild auf ein Canvas zeichnen. weiss = Hintergrund füllen (für JPEG/PDF,
// sonst würden transparente Bereiche schwarz).
export function zeichne(bild, breite, hoehe, weiss) {
  const canvas = neuesCanvas(breite, hoehe);
  const ctx = canvas.getContext("2d");
  if (weiss) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, breite, hoehe);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bild.quelle, 0, 0, breite, hoehe);
  return canvas;
}

export function alsBlob(canvas, format, qualitaet) {
  return canvasZuBlob(canvas, format === "png" ? "image/png" : "image/jpeg",
    format === "png" ? undefined : qualitaet);
}

// Ein Bild in einer oder mehreren Stufen ({ maxSide, quality }) verkleinern:
// einmal dekodieren, je Stufe neu kodieren. PNG bleibt PNG; alles andere wird
// JPEG. Rückgabe: je Stufe ein Blob, in der Reihenfolge von stufen.
export async function verkleinereBild(file, stufen, { signal } = {}) {
  const png = istPng(file);
  const bild = await dekodiere(file);
  try {
    const ergebnisse = [];
    for (const s of stufen) {
      signal?.throwIfAborted();
      const { breite, hoehe } = zielMasse(bild.breite, bild.hoehe, s.maxSide);
      const canvas = zeichne(bild, breite, hoehe, !png);
      ergebnisse.push(await alsBlob(canvas, png ? "png" : "jpg", s.quality / 100));
    }
    return ergebnisse;
  } finally {
    bild.schliessen(); // Speicher früh freigeben.
  }
}
