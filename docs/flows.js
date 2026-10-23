// flows.js – die Schritte je Aktion (HANDOFF Kapitel 6). Schritt 1 "Datei
// wählen" ist der Startscreen; hier stehen die Schritte ab Schritt 2.
//
// Verkleinern, Umwandeln und Trennen sind fertig (je ein eigenes Modul).
// Zusammenführen und Seiten ordnen (Seiten-Editor) zeigen bis Bauabschnitt 4b
// noch einen Platzhalter.

import { el } from "./shared.js";
import { icon } from "./icons.js";
import { hauptKnopf } from "./wizard.js";
import { zeigeToast } from "./ui.js";
import { verkleinernSchritte } from "./flow-verkleinern.js";
import { umwandelnSchritte } from "./flow-umwandeln.js";
import { trennenSchritte } from "./flow-trennen.js";

const FERTIG = {
  verkleinern: verkleinernSchritte,
  umwandeln: umwandelnSchritte,
  trennen: trennenSchritte,
};

// Titel der Schritte im Platzhalter (wie in den Referenz-Screens).
const PLATZHALTER = {
  zusammenfuehren: ["Seiten anordnen", "Speichern"],
  ordnen:          ["Seiten anordnen", "Speichern"],
};

function platzhalter(titel) {
  const karte = el("div", "card wizard-platzhalter");
  const ic = el("span", "wizard-platzhalter-ic");
  ic.append(icon("info", 24, 2));
  karte.append(ic, el("p", "t-l", titel),
    el("p", "t-body t-muted", "Dieser Schritt wird im nächsten Bauabschnitt gebaut."));
  return karte;
}

// Liefert die Schritte für den Wizard: [{ titel, baue(ctx) }].
export function schritteFuer(aktion) {
  if (FERTIG[aktion]) return FERTIG[aktion]();
  return PLATZHALTER[aktion].map((titel) => ({
    titel,
    baue(ctx) {
      if (!ctx.istLetzter) {
        return { inhalt: platzhalter(titel), dock: hauptKnopf("Weiter", ctx.weiter) };
      }
      const speichern = hauptKnopf("Speichern", () =>
        zeigeToast("Speichern wird mit dem Seiten-Editor angebunden."), "speichern");
      return { inhalt: platzhalter(titel), dock: speichern };
    },
  }));
}
