// shared.js – gemeinsame Helfer: Größen und Texte, Dateinamen, Elemente erzeugen.

// Bytes in lesbare Größe, deutsch formatiert: "512 B", "740 KB", "8,4 MB".
export function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1000) return `${Math.round(kb)} KB`;
  const zahl = (n) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  const mb = kb / 1024;
  if (mb < 1000) return `${zahl(mb)} MB`;
  return `${zahl(mb / 1024)} GB`;
}

// Kurzschreibweise zum Erzeugen eines HTML-Elements.
export function el(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text != null) e.textContent = text;
  return e;
}

// --- Texte ---

export const seitenText = (n) => (n === 1 ? "1 Seite" : `${n} Seiten`);

// "2 Bilder, 1 PDF"
export function zusammensetzung(dateien) {
  const pdfs = dateien.filter((d) => d.art === "pdf").length;
  const bilder = dateien.length - pdfs;
  const teile = [];
  if (bilder) teile.push(bilder === 1 ? "1 Bild" : `${bilder} Bilder`);
  if (pdfs) teile.push(pdfs === 1 ? "1 PDF" : `${pdfs} PDFs`);
  return teile.join(", ");
}

export function kurzerName(name) {
  return name.length > 30 ? `${name.slice(0, 19)}…${name.slice(-9)}` : name;
}

// Ersparnis in Prozent als Text: "−77 %" (echtes Minuszeichen).
export function ersparnis(vorher, nachher) {
  const p = Math.round((1 - nachher / vorher) * 100);
  return `−${Math.max(p, 0)} %`;
}

// --- Dateinamen ---

// Dateiname ohne Endung.
export const ohneEndung = (name) => name.replace(/\.[^.]+$/, "");

// Eingabe aus dem Dateiname-Feld absichern (HANDOFF 6.2): unerlaubte Zeichen
// ersetzen, Leerzeichen/Punkte am Rand weg, leeres Feld → Vorschlag.
export function sichererName(text, vorschlag) {
  const name = String(text || "")
    .replace(/[/\\:*?"<>|\u0000-\u001f]/g, "_")
    .trim()
    .replace(/^\.+|[. ]+$/g, "");
  return name || vorschlag;
}

// Doppelte Namen in einer Liste eindeutig machen: "Foto.pdf", "Foto (2).pdf".
export function eindeutigeNamen(namen) {
  const gesehen = new Map();
  return namen.map((n) => {
    const key = n.toLowerCase();
    const zahl = (gesehen.get(key) || 0) + 1;
    gesehen.set(key, zahl);
    if (zahl === 1) return n;
    const punkt = n.lastIndexOf(".");
    return punkt > 0 ? `${n.slice(0, punkt)} (${zahl})${n.slice(punkt)}` : `${n} (${zahl})`;
  });
}
