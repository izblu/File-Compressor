// app.js – Einstieg der App: startet den Startscreen (start.js, Schritt 1
// "Datei wählen") und registriert den Service Worker.
// Die Wizard-Schritte der einzelnen Aktionen werden als Nächstes angebunden.

import { initStart } from "./start.js";
import { AKTIONEN } from "./intake.js";
import { zeigeToast } from "./ui.js";

initStart({
  beiAktion(aktionId) {
    // Platzhalter, bis der Wizard (Schritt 2 ff.) gebaut ist.
    const aktion = AKTIONEN.find((a) => a.id === aktionId);
    zeigeToast(`„${aktion.titel}“ wird im nächsten Bauabschnitt angebunden.`);
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
