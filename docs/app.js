// app.js – Einstieg der App: verbindet den Startscreen (start.js, Schritt 1
// "Datei wählen") mit dem Wizard (wizard.js, Schritte ab 2) und registriert
// den Service Worker.

import { initStart, zurueckZumStart } from "./start.js";
import { initWizard, starteWizard } from "./wizard.js";
import { schritteFuer } from "./flows.js";

initWizard({
  beiEnde: zurueckZumStart,
});

initStart({
  beiAktion(aktion, dateien) {
    starteWizard({ aktion, dateien, schritte: schritteFuer(aktion) });
  },
});

// --- Service-Worker registrieren ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((e) => console.warn("Service-Worker nicht registriert:", e));
  });
}
