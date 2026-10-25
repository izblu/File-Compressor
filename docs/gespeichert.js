// gespeichert.js – Erfolgsmoment nach dem Speichern (Nachtrag A1, ersetzt
// Screen 18): Kreis ploppt auf, Haken zeichnet sich, Ring + 8 Funken;
// "Gespeichert", Datei-Karte (Name, Größe, ggf. Ersparnis) und – nur mit gutem
// Grund – ein Tipp zum Verkleinern. Dock: "Diese Datei weiterbearbeiten"
// (sekundär) über "Noch eine Datei bearbeiten" (Haupt-Button).
// Zurück führt wieder zum Speichern-Schritt (siehe wizard.js, zeigeFertig).
//
// Weiterbearbeiten: Die gespeicherten Blobs werden wie frisch gewählte Dateien
// geöffnet (oeffneDatei) und als neue Auswahl an den Startscreen gegeben. Die
// nächste Aktion kennt so nur die Bytes des Ergebnisses – nie das Original.

import { el, humanSize } from "./shared.js";
import { seitenMini, arbeitet, hinweis } from "./flow-teile.js";
import { oeffneDatei, freigeben, verkleinernGrund } from "./intake.js";
import { zeigeToast, ansage } from "./ui.js";

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

// info/badge gelten für alle Dateien (Text) oder je Datei (Liste).
const jeDatei = (wert, i) => (Array.isArray(wert) ? wert[i] : wert);

// Inhalt einer Zeile: Name, darunter "5 Seiten · 6,8 MB" bzw. "2,4 MB ·
// 12 Stellen geschwärzt", rechts ggf. "−77 %".
function dateiText(datei, info, badge, zusatz) {
  const text = el("div", "fk-stack gs-karte-text");
  const name = el("span", "t-l gs-name", datei.name);
  name.title = datei.name;
  const zeile = [info, humanSize(datei.groesse), zusatz].filter(Boolean).join(" · ");
  text.append(name, el("span", "t-s t-muted t-num", zeile));
  return badge ? [text, el("span", "badge badge-success t-num", badge)] : [text];
}

// Datei-Karte: eine Datei bzw. eine Zeile je Datei (A1c). Die Liste zeigt
// immer alle Dateien; wird es zu viel, scrollt sie in sich (styles.css, .gs),
// damit Tipp und Knöpfe sichtbar bleiben.
function dateiKarte({ gespeichert, bilder, info, badge, zusatz }) {
  const bild = (i) => bilder[Math.min(i, bilder.length - 1)];
  const zeile = (i) => dateiText(gespeichert[i], jeDatei(info, i), jeDatei(badge, i), jeDatei(zusatz, i));

  if (gespeichert.length === 1) {
    const karte = el("div", "card fk-row gs-karte in-up d6");
    karte.append(seitenMini(bild(0), "gs-mini"), ...zeile(0));
    return karte;
  }

  const karte = el("ul", `card gs-karte ist-liste in-up d6${gespeichert.length > 2 ? " ist-lang" : ""}`);
  // Scrollbar → auch per Tastatur erreichbar.
  karte.tabIndex = 0;
  karte.setAttribute("aria-label", "Gespeicherte Dateien");
  gespeichert.forEach((_, i) => {
    const li = el("li", "fk-row gs-zeile");
    li.append(seitenMini(bild(i), "gs-mini"), ...zeile(i));
    karte.append(li);
  });
  return karte;
}

// Tipp unter der Karte (Nachtrag 6.3) – nur, wenn Verkleinern einen Grund hat.
// Zahl und Einheit bleiben zusammen ("6 KB" bricht nicht um).
function tippText(grund, mehrere) {
  const g = (bytes) => humanSize(bytes).replace(" ", " ");
  if (grund.art === "gewachsen") {
    return `Tipp: ${mehrere ? "Die Dateien sind" : "Die Datei ist"} größer geworden (${g(grund.vorher)} → ${g(grund.nachher)}) – du kannst sie gleich verkleinern.`;
  }
  return mehrere
    ? `Tipp: Die Dateien sind zusammen ${g(grund.nachher)} groß – du kannst sie gleich verkleinern.`
    : `Tipp: Die Datei ist ${g(grund.nachher)} groß – du kannst sie gleich verkleinern, z. B. für Online-Formulare.`;
}

const OEFFNEN_FEHLER = (mehrere) =>
  `Das Öffnen hat leider nicht geklappt. ${mehrere ? "Die Dateien sind" : "Die Datei ist"} trotzdem gespeichert.`;

// gespeichert: [{ name, groesse, blob }] (aus dem Speichern)
// bilder:      Seiten für die Miniaturen, je Datei [{ eintrag, nr, drehung }]
// info:        Zusatz vor der Größe, z. B. "5 Seiten" – Text oder Liste je Datei (optional)
// badge:       Ersparnis "−77 %" – Text oder Liste je Datei (optional, Verkleinern)
// zusatz:      Text nach der Größe, z. B. "12 Stellen geschwärzt" – Text oder Liste je Datei (optional)
// herkunft:    { aktion, vorher } – vorher = Bytes der Eingabe; Grundlage für Tipp und Vorschlag
export function zeigeGespeichert(ctx, { gespeichert, bilder, info, badge, zusatz, herkunft }) {
  if (ctx.signal.aborted) return; // inzwischen woanders hin gegangen
  const mehrere = gespeichert.length > 1;
  herkunft ??= { aktion: ctx.aktion, vorher: Infinity };

  const text = el("div", "fk-stack gs-text in-up d5");
  text.setAttribute("role", "status");
  const titel = el("h1", "t-display", "Gespeichert");
  titel.tabIndex = -1;
  text.append(titel, el("p", "t-body t-muted", mehrere
    ? `${gespeichert.length} Dateien gespeichert – sie liegen jetzt auf deinem Gerät.`
    : "Die Datei liegt jetzt auf deinem Gerät."));

  const karte = dateiKarte({ gespeichert, bilder, info, badge, zusatz });
  const screen = el("div", "fk-stack gs");
  screen.append(erfolgsZeichen(), text, karte);

  const grund = verkleinernGrund(gespeichert.map((d) => d.groesse), herkunft);
  if (grund) {
    const tipp = hinweis(tippText(grund, mehrere), { art: "tip", iconName: "tipp" });
    tipp.classList.add("gs-tipp", "in-up", "d6");
    screen.append(tipp);
  }

  const weiter = el("button", "btn btn-secondary btn-block in-dock gs-knopf",
    mehrere ? `Diese ${gespeichert.length} Dateien weiterbearbeiten` : "Diese Datei weiterbearbeiten");
  weiter.type = "button";
  const neu = el("button", "btn btn-primary btn-block in-dock gs-knopf", "Noch eine Datei bearbeiten");
  neu.type = "button";
  neu.addEventListener("click", () => ctx.vonVorn());

  // Ergebnisse öffnen; "Wird geöffnet …" erst nach 400 ms (sonst direkt weiter).
  let oeffnet = false;
  weiter.addEventListener("click", async () => {
    if (oeffnet) return;
    oeffnet = true;
    let zuruecksetzen = null;
    const timer = setTimeout(() => {
      zuruecksetzen = arbeitet(weiter, "Wird geöffnet …");
      ansage("Wird geöffnet …");
    }, 400);

    const eintraege = [];
    let fehler = false;
    try {
      for (const d of gespeichert) {
        if (ctx.signal.aborted) break;
        eintraege.push(await oeffneDatei(new File([d.blob], d.name, { type: d.blob.type })));
      }
    } catch (e) {
      console.error(e);
      fehler = true;
    }
    clearTimeout(timer);

    const uebernommen = !fehler && !ctx.signal.aborted &&
      (await ctx.weiterbearbeiten({ eintraege, herkunft, von: karte.getBoundingClientRect() }));
    if (uebernommen) return; // ab jetzt gehören die Einträge dem Startscreen

    eintraege.forEach(freigeben);
    oeffnet = false;
    if (zuruecksetzen && weiter.isConnected) zuruecksetzen();
    if (fehler && !ctx.signal.aborted) {
      zeigeToast(OEFFNEN_FEHLER(mehrere));
      ansage(OEFFNEN_FEHLER(mehrere));
    }
  });

  ctx.zeigeFertig({ inhalt: screen, dock: [weiter, neu] });
}
