// flow-schwaerzen.js – Ablauf "Schwärzen" (Nachtrag Kap. 6, Screens S2–S10):
// Schritt 2 "Stellen schwärzen" (Editor, siehe schwaerzen-editor.js) →
// Verarbeiten "Wird geschwärzt …" → Schritt 3 "Speichern" mit Prüfbericht.
// Nur für eine einzelne Datei (1 PDF oder 1 Bild).
//
// Stand: Der Editor ist gebaut, mit Textebene (Wort antippen, Text suchen,
// Scan-Erkennung – siehe textstellen.js). Verarbeiten und Speichern folgen in einem
// eigenen Abschnitt (Nachtrag Kap. 12, Schritt 6) – bis dahin ist Schritt 3
// ein Platzhalter, damit sich Weiter und Zurück schon prüfen lassen.

import { el } from "./shared.js";
import { hauptKnopf } from "./wizard.js";
import { stellenSchritt, stellenSumme } from "./schwaerzen-editor.js";
import { schrittInhalt, dateiZeile, hinweis } from "./flow-teile.js";

export function schwaerzenSchritte() {
  return [
    { titel: "Stellen schwärzen", baue: stellenSchritt },
    { titel: "Speichern", baue: speichernSchritt },
  ];
}

// --- Schritt 3: Speichern (Platzhalter) ---

function speichernSchritt(ctx) {
  const d = ctx.dateien[0];
  const knopf = hauptKnopf("Speichern", () => {}, "speichern");
  knopf.disabled = true;
  return {
    inhalt: schrittInhalt(
      dateiZeile([d]),
      el("p", "t-body t-2", stellenSumme(ctx.optionen.stellen, d.art === "bild")),
      hinweis("Verarbeiten und Speichern kommen im nächsten Bauabschnitt."),
    ),
    dock: knopf,
  };
}
