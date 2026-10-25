// intake.js – Datei-Eingang: erkennt den Typ (PDF oder Bild), öffnet die Datei
// zur Prüfung (geschützt? beschädigt? Format unbekannt?), liest Seitenzahl bzw.
// Bildmaße und erzeugt die Vorschau der ersten Seite. Liefert außerdem die
// Regeln für das Aktionen-Menü (welche Aktion passt zu welcher Auswahl).

// Bildformate, die FileKit annimmt. HEIC/HEIF können nur manche Browser
// (Safari) öffnen – scheitert das, gilt es als "Format geht nicht".
const BILD_FORMATE = {
  jpg: "JPG", jpeg: "JPG", png: "PNG", webp: "WEBP", gif: "GIF",
  bmp: "BMP", avif: "AVIF", heic: "HEIC", heif: "HEIF",
};
const OFT_NICHT_LESBAR = ["heic", "heif"];

// Längste Kante der Vorschau in CSS-Pixeln (größte Ansicht = 1 Datei).
const VORSCHAU_MAX = 300;

let naechsteId = 1;

// Fehler beim Öffnen; art = "geschuetzt" | "beschaedigt" | "format".
export class OeffnenFehler extends Error {
  constructor(art, datei) {
    super(art);
    this.art = art;
    this.datei = datei;
  }
}

function endung(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

function bildEndung(file) {
  const ext = endung(file.name);
  if (BILD_FORMATE[ext]) return ext;
  const ausTyp = file.type.startsWith("image/") ? file.type.slice(6) : "";
  return BILD_FORMATE[ausTyp] ? ausTyp : "";
}

// "pdf" | "bild" | null (Format wird nicht unterstützt).
export function dateiArt(file) {
  if (file.type === "application/pdf" || endung(file.name) === "pdf") return "pdf";
  return bildEndung(file) ? "bild" : null;
}

// Pixeldichte des Displays (gedeckelt), damit Vorschauen scharf, aber nicht riesig sind.
function pixeldichte() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

// Öffnet eine Datei und liefert einen Eintrag für die Auswahl:
// { id, file, art, format, seiten, breite, hoehe, verhaeltnis, vorschau }
// Wirft OeffnenFehler, wenn das nicht geht.
export async function oeffneDatei(file) {
  const art = dateiArt(file);
  if (!art) throw new OeffnenFehler("format", file);
  return art === "pdf" ? oeffnePdf(file) : oeffneBild(file);
}

async function oeffnePdf(file) {
  const { ladePdfjs } = await import("./pdf.js");
  const pdfjsLib = await ladePdfjs();

  let doc;
  try {
    const daten = new Uint8Array(await file.arrayBuffer());
    doc = await pdfjsLib.getDocument({ data: daten }).promise;
  } catch (e) {
    const geschuetzt = e && e.name === "PasswordException";
    throw new OeffnenFehler(geschuetzt ? "geschuetzt" : "beschaedigt", file);
  }

  try {
    const page = await doc.getPage(1);
    const basis = page.getViewport({ scale: 1 });
    const skala = (VORSCHAU_MAX * pixeldichte()) / Math.max(basis.width, basis.height);
    const vp = page.getViewport({ scale: skala });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(vp.width));
    canvas.height = Math.max(1, Math.ceil(vp.height));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white"; // Papier
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    page.cleanup();
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.88));

    return {
      id: naechsteId++,
      file,
      art: "pdf",
      format: "PDF",
      seiten: doc.numPages,
      breite: Math.round(basis.width),
      hoehe: Math.round(basis.height),
      verhaeltnis: basis.width / basis.height,
      vorschau: URL.createObjectURL(blob),
    };
  } catch {
    throw new OeffnenFehler("beschaedigt", file);
  } finally {
    doc.destroy();
  }
}

async function oeffneBild(file) {
  const ext = bildEndung(file);
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
    if (!img.naturalWidth) throw new Error("leer");
  } catch {
    URL.revokeObjectURL(url);
    throw new OeffnenFehler(OFT_NICHT_LESBAR.includes(ext) ? "format" : "beschaedigt", file);
  }
  return {
    id: naechsteId++,
    file,
    art: "bild",
    format: BILD_FORMATE[ext],
    seiten: 1,
    breite: img.naturalWidth,
    hoehe: img.naturalHeight,
    verhaeltnis: img.naturalWidth / img.naturalHeight,
    vorschau: url,
  };
}

// Speicher der Vorschau (und z. B. der Seiten-Miniaturen aus thumbs.js) wieder
// freigeben, wenn eine Datei entfernt wird.
export function freigeben(eintrag) {
  URL.revokeObjectURL(eintrag.vorschau);
  for (const aufraeumen of eintrag.aufraeumen || []) aufraeumen();
  eintrag.aufraeumen = [];
}

// --- Regeln für das Aktionen-Menü (HANDOFF 6.1) ---

// Reihenfolge im Menü ist immer gleich.
export const AKTIONEN = [
  { id: "verkleinern",     titel: "Verkleinern",    icon: "verkleinern" },
  { id: "zusammenfuehren", titel: "Zusammenführen", icon: "zusammenfuehren" },
  { id: "trennen",         titel: "Trennen",        icon: "trennen" },
  { id: "ordnen",          titel: "Seiten ordnen",  icon: "seiten-ordnen" },
  { id: "umwandeln",       titel: "Umwandeln",      icon: "umwandeln" },
  { id: "schwaerzen",      titel: "Schwärzen",      icon: "schwaerzen" },
];

// --- Vorschlag nach dem Weiterbearbeiten (Nachtrag 6.3) ---

const MB = 1024 * 1024; // wie humanSize: "2 MB" im Tipp heißt auch wirklich ≥ 2 MB
const GROSS = 2 * MB;
const GEWACHSEN_FAKTOR = 1.5;
const GEWACHSEN_MIN = 1 * MB;

// Soll nach einer Aktion Verkleinern vorgeschlagen werden?
// groessen = Bytes der Ergebnisdateien, herkunft = { aktion, vorher } (vorher =
// Bytes der Eingabe). Liefert null oder { art: "gewachsen" | "gross", vorher, nachher }.
// Der Tipp auf "Gespeichert ✓" und der Vorschlag im Startscreen nutzen beide
// diese Regel – wer den Tipp sieht, sieht auch den Vorschlag.
export function verkleinernGrund(groessen, herkunft) {
  if (!herkunft || herkunft.aktion === "verkleinern" || !groessen.length) return null;
  const nachher = groessen.reduce((s, g) => s + g, 0);
  const { vorher } = herkunft;
  if (nachher > vorher * GEWACHSEN_FAKTOR && nachher >= GEWACHSEN_MIN) return { art: "gewachsen", vorher, nachher };
  if (groessen.some((g) => g >= GROSS)) return { art: "gross", vorher, nachher };
  return null;
}

// Liefert { vorschlag, liste }; jeder Listeneintrag hat text (ein Satz) oder
// grund (warum die Aktion hier nicht passt → ausgegraut).
// herkunft (nur, solange ausschließlich Ergebnisse gewählt sind): Vorschlag
// nur mit Grund (verkleinernGrund), sonst null = kein Vorschlag.
export function aktionenFuer(dateien, herkunft = null) {
  const einzeln = dateien.length === 1;
  const pdfs = dateien.filter((d) => d.art === "pdf").length;
  const einPdf = einzeln && pdfs === 1;
  const nurBilder = pdfs === 0;

  const texte = {
    verkleinern: einzeln
      ? { text: "Dateigröße reduzieren, z. B. für Online-Formulare." }
      : { text: "Jede Datei einzeln verkleinern." },
    zusammenfuehren: einzeln
      ? { text: einPdf ? "Mehrere PDFs oder Bilder zu einem PDF verbinden."
                       : "Mit weiteren Dateien zu einem PDF verbinden." }
      : { text: "Alle Dateien zu einem PDF verbinden." },
    trennen: einPdf
      ? (dateien[0].seiten > 1
          ? { text: "Einzelne Seiten aus dem PDF herauslösen." }
          : { grund: "Das PDF hat nur eine Seite" })
      : { grund: einzeln ? "Nur für PDFs" : "Nur für ein einzelnes PDF" },
    ordnen: einPdf
      ? { text: "Seiten verschieben, drehen oder löschen." }
      : { grund: einzeln ? "Nur für PDFs" : "Nur für ein einzelnes PDF" },
    umwandeln: einPdf
      ? { text: "In JPG oder PNG umwandeln." }
      : nurBilder
        ? { text: einzeln ? umwandelnText(dateien[0].format) : "Alle Bilder in ein anderes Format umwandeln." }
        : { grund: "Nur für Bilder oder ein einzelnes PDF" },
    // Nie Vorschlag – Schwärzen ist eine bewusste Handlung (Nachtrag 6.1).
    schwaerzen: einzeln
      ? { text: "Namen, Nummern oder andere Stellen unkenntlich machen." }
      : { grund: "Nur für eine einzelne Datei" },
  };

  let vorschlag = einzeln ? "verkleinern" : "zusammenfuehren";
  if (herkunft) {
    vorschlag = verkleinernGrund(dateien.map((d) => d.file.size), herkunft) ? "verkleinern" : null;
  }

  return {
    vorschlag,
    liste: AKTIONEN.map((a) => ({ ...a, ...texte[a.id] })),
  };
}

function umwandelnText(format) {
  if (format === "JPG") return "In PDF oder PNG umwandeln.";
  if (format === "PNG") return "In PDF oder JPG umwandeln.";
  return "In PDF, JPG oder PNG umwandeln.";
}
