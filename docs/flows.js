// flows.js – die Schritte je Aktion (HANDOFF Kapitel 6). Schritt 1 "Datei
// wählen" ist der Startscreen; hier stehen die Schritte ab Schritt 2.

import { verkleinernSchritte } from "./flow-verkleinern.js";
import { umwandelnSchritte } from "./flow-umwandeln.js";
import { trennenSchritte } from "./flow-trennen.js";
import { seitenSchritte } from "./flow-ordnen.js";
import { schwaerzenSchritte } from "./flow-schwaerzen.js";

const SCHRITTE = {
  verkleinern: verkleinernSchritte,
  zusammenfuehren: seitenSchritte,
  trennen: trennenSchritte,
  ordnen: seitenSchritte,
  umwandeln: umwandelnSchritte,
  schwaerzen: schwaerzenSchritte,
};

// Liefert die Schritte für den Wizard: [{ titel, baue(ctx) }].
export function schritteFuer(aktion) {
  return SCHRITTE[aktion]();
}
