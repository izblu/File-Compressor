// gespeichert.js – Erfolgsmoment nach dem Speichern (HANDOFF Screen 18):
// Kreis ploppt auf, Haken zeichnet sich, Ring + 8 Funken; "Gespeichert",
// Datei-Karte (Name, Größe, ggf. Ersparnis) und "Noch eine Datei bearbeiten".
// Zurück führt wieder zum Speichern-Schritt (siehe wizard.js, zeigeFertig).

import { el, humanSize } from "./shared.js";
import { seitenMini } from "./flow-teile.js";

const SVG = "http://www.w3.org/2000/svg";

function erfolgsZeichen() {
  const box = el("div", "gs-zeichen");
  box.setAttribute("aria-hidden", "true");
  box.append(el("span", "gs-schein"), el("span", "gs-ring"));
  for (let i = 0; i < 8; i++) {
    const funke = el("span", "gs-funke");
    funke.style.setProperty("--w", `${i * 45}deg`);
    funke.append(el("i"));
    box.append(funke);
  }
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "gs-kreis");
  svg.setAttribute("viewBox", "0 0 112 112");
  svg.innerHTML =
    '<circle class="gs-kreis-flaeche" cx="56" cy="56" r="56"/>' +
    '<circle class="gs-kreis-kante" cx="56" cy="56" r="55" fill="none" stroke-width="2"/>' +
    '<path class="gs-haken" d="M37 57.5l12.5 12.5L76 43.5" pathLength="100" fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>';
  box.append(svg);
  return box;
}

// Datei-Karte: eine Datei mit Name und Größe bzw. "3 Dateien gespeichert".
function dateiKarte({ gespeichert, bilder, info, badge }) {
  const karte = el("div", "card fk-row gs-karte in-up d6");
  const mehrere = gespeichert.length > 1;

  if (mehrere) {
    const stapel = el("span", "gs-stapel");
    stapel.setAttribute("aria-hidden", "true");
    bilder.slice(0, 3).forEach((b) => stapel.append(seitenMini(b, "gs-mini")));
    karte.append(stapel);
  } else {
    karte.append(seitenMini(bilder[0], "gs-mini"));
  }

  const groesse = humanSize(gespeichert.reduce((s, d) => s + d.groesse, 0));
  const text = el("div", "fk-stack gs-karte-text");
  const name = el("span", "t-l gs-name", mehrere ? `${gespeichert.length} Dateien gespeichert` : gespeichert[0].name);
  name.title = name.textContent;
  const zeile = mehrere ? `zusammen ${groesse}` : groesse;
  text.append(name, el("span", "t-s t-muted t-num", info ? `${zeile} · ${info}` : zeile));
  karte.append(text);
  if (badge) karte.append(el("span", "badge badge-success t-num", badge));
  return karte;
}

// gespeichert: [{ name, groesse }] (aus dem Speichern)
// bilder:      Seiten für die Miniatur(en) [{ eintrag, nr, drehung }]
// info:        Zusatz hinter der Größe, z. B. "5 Seiten" (optional)
// badge:       Ersparnis "−77 %" (optional, Verkleinern)
export function zeigeGespeichert(ctx, { gespeichert, bilder, info, badge }) {
  if (ctx.signal.aborted) return; // inzwischen woanders hin gegangen
  const mehrere = gespeichert.length > 1;

  const text = el("div", "fk-stack gs-text in-up d5");
  text.setAttribute("role", "status");
  const titel = el("h1", "t-display", "Gespeichert");
  titel.tabIndex = -1;
  text.append(titel, el("p", "t-body t-muted",
    mehrere ? "Die Dateien liegen jetzt auf deinem Gerät." : "Die Datei liegt jetzt auf deinem Gerät."));

  const screen = el("div", "fk-stack gs");
  screen.append(erfolgsZeichen(), text, dateiKarte({ gespeichert, bilder, info, badge }));

  const knopf = el("button", "btn btn-primary btn-block in-dock gs-knopf", "Noch eine Datei bearbeiten");
  knopf.type = "button";
  knopf.addEventListener("click", () => ctx.vonVorn());

  ctx.zeigeFertig({ inhalt: screen, dock: knopf });
}
