// flow-umwandeln.js – Ablauf "Umwandeln" (HANDOFF 6, Screen 17): nur ein
// Schritt "Speichern" (Schritt 2 von 2) mit Zielformat und Dateiname.
// Verarbeitet wird nach dem Tipp auf "Speichern".
//   1 PDF       → JPG/PNG (jede Seite ein Bild)
//   1 Bild      → PDF/JPG/PNG
//   mehrere Bilder → jedes Bild einzeln (für EIN gemeinsames PDF gibt es "Zusammenführen")

import { el, ohneEndung, sichererName, eindeutigeNamen } from "./shared.js";
import { hauptKnopf, setzeKnopfText } from "./wizard.js";
import { zeigeToast } from "./ui.js";
import { pdfZuBildern, bildUmwandeln, formatVon } from "./convert.js";
import { speichere } from "./save.js";
import {
  schrittInhalt, abschnitt, optKarte, radioGruppe, hinweis, namensFeld, namensListe,
  mitVerarbeitung, fortschrittText,
} from "./flow-teile.js";

const FORMATE = [
  { wert: "pdf", titel: "PDF", sub: "für Dokumente" },
  { wert: "jpg", titel: "JPG", sub: "klein, für Fotos" },
  { wert: "png", titel: "PNG", sub: "verlustfrei, mit Transparenz" },
];

export function umwandelnSchritte() {
  return [{ titel: "Speichern", baue: speichernSchritt }];
}

// Welches Zielformat ist gesperrt, weil alle Dateien es schon haben? → Grund.
function sperrGrund(wert, dateien) {
  const quellen = new Set(dateien.map(formatVon));
  if (quellen.size !== 1 || !quellen.has(wert)) return null;
  const name = wert.toUpperCase();
  return dateien.length === 1 ? `Ist bereits ein ${name}` : `Sind bereits ${name}s`;
}

// Standard: PDF → JPG, JPG → PDF, sonst JPG.
function standardFormat(dateien) {
  const quelle = formatVon(dateien[0]);
  const wunsch = dateien.length === 1 && quelle === "jpg" ? "pdf" : "jpg";
  return sperrGrund(wunsch, dateien) ? "pdf" : wunsch;
}

function speichernSchritt(ctx) {
  const o = ctx.optionen;
  const { dateien } = ctx;
  const d = dateien[0];
  const einPdf = d.art === "pdf";              // laut Aktionen-Regeln dann genau eine Datei
  const einzeln = dateien.length === 1;
  const seiten = einPdf ? d.seiten : 1;
  const vorschlag = ohneEndung(d.file.name);
  o.format ??= standardFormat(dateien);
  o.name ??= vorschlag;

  // Entstehende Dateinamen für das gewählte Format.
  function namen() {
    const f = o.format;
    if (einzeln) {
      const basis = sichererName(o.name, vorschlag);
      if (seiten === 1) return [`${basis}.${f}`];
      return Array.from({ length: seiten }, (_, i) => `${basis}_Seite${i + 1}.${f}`);
    }
    return eindeutigeNamen(dateien.map((x) => `${ohneEndung(x.file.name)}.${f}`));
  }

  // Formate (das Ausgangsformat ist ausgegraut).
  const gruppe = el("div", "fk-stack opt-liste");
  gruppe.append(...FORMATE.map((f) => optKarte({
    wert: f.wert, titel: f.titel, sub: f.sub, grund: sperrGrund(f.wert, dateien), vis: el("span", "fmt", f.titel),
  })));
  radioGruppe(gruppe, { label: "Format", wert: o.format, beiWahl: (w) => { o.format = w; aktualisiere(); } });

  const notiz = el("div", "notiz");
  const feld = einzeln
    ? namensFeld({ wert: o.name, endung: o.format, beiEingabe: (v) => { o.name = v; ctx.geaendert(); aktualisiere(); } })
    : null;
  const liste = namensListe();
  const listenAbschnitt = abschnitt(einzeln ? "So heißen die Dateien" : "So heißen die neuen Dateien", liste.element);

  const knopf = hauptKnopf("Speichern", speichern, "speichern");

  function aktualisiere() {
    const n = namen();
    if (feld) {
      feld.setzeEndung(o.format);
      feld.setzeAnzahl(n.length);
    }
    // Eine Datei mit einer Seite: Das Feld zeigt den Namen schon.
    listenAbschnitt.hidden = einzeln && n.length === 1;
    liste.zeige(n);
    setzeKnopfText(knopf, n.length > 1 ? `Alle speichern (${n.length})` : "Speichern");
    const text = notizText();
    notiz.replaceChildren(...(text ? [hinweis(text)] : []));
  }

  // Ein kurzer Hinweis, falls es etwas zu wissen gibt.
  function notizText() {
    const f = o.format;
    if (einPdf && seiten > 1) return `Jede der ${seiten} Seiten wird ein eigenes Bild.`;
    if (!einzeln && f === "pdf") return "Jedes Bild wird ein eigenes PDF. Für ein gemeinsames PDF gibt es „Zusammenführen“.";
    const gleich = dateien.filter((x) => formatVon(x) === f).length;
    if (!einzeln && gleich) {
      return `${gleich === 1 ? "1 Bild ist" : `${gleich} Bilder sind`} schon ein ${f.toUpperCase()} und ${gleich === 1 ? "bleibt" : "bleiben"} unverändert.`;
    }
    if (f === "jpg" && dateien.some((x) => formatVon(x) === "png")) return "Transparente Bereiche werden weiß.";
    if (f === "png" && !einPdf) return "PNG-Dateien sind meist deutlich größer als JPG.";
    return "";
  }

  async function speichern() {
    const dateiNamen = namen();
    const { ergebnis, zwischen } = await mitVerarbeitung(ctx, {
      knopf,
      titel: "Umwandeln",
      text: "Wird umgewandelt …",
      einheiten: einPdf ? seiten : dateien.length,
      fehlerText: "Das Umwandeln hat leider nicht geklappt. Versuche es noch einmal.",
      job: ({ signal, melde }) => wandleUm(dateien, o.format, { signal, melde }),
      danach: (blobs) => speichere(blobs.map((blob, i) => ({ blob, name: dateiNamen[i] }))),
    });
    if (!ergebnis) return;
    if (zwischen) ctx.schliesseZwischen();
    zeigeToast(dateiNamen.length > 1 ? `${dateiNamen.length} Dateien gespeichert.` : `Gespeichert: ${dateiNamen[0]}`);
  }

  aktualisiere();
  return {
    inhalt: schrittInhalt(
      abschnitt("Umwandeln in", gruppe),
      notiz,
      feld && feld.element,
      listenAbschnitt,
      einzeln ? null : el("p", "field-hint", "Werden als neue Dateien gespeichert – die Originale bleiben unverändert.")
    ),
    dock: knopf,
  };
}

// Umwandeln; Rückgabe: Liste von Blobs in der Reihenfolge der Namen.
async function wandleUm(dateien, format, { signal, melde }) {
  const d = dateien[0];
  if (d.art === "pdf") {
    melde({ anteil: 0, fertig: 0, text: fortschrittText("Seite", 1, d.seiten, 0) });
    const bilder = await pdfZuBildern(d.file, format, {
      signal,
      beiSeite: (p, n) => melde({ anteil: p / n, fertig: p, text: fortschrittText("Seite", p, n, p / n) }),
    });
    return bilder.map((b) => b.blob);
  }
  const n = dateien.length;
  const blobs = [];
  for (let i = 0; i < n; i++) {
    melde({ anteil: i / n, fertig: i, datei: dateien[i], text: fortschrittText("Datei", i + 1, n, i / n) });
    blobs.push(await bildUmwandeln(dateien[i], format, { signal }));
  }
  melde({ anteil: 1, fertig: n, text: fortschrittText("Datei", n, n, 1) });
  return blobs;
}
