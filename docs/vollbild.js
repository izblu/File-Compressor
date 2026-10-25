// vollbild.js – Seite groß ansehen (HANDOFF Screen 13): schwarzer
// Hintergrund, Seite so groß wie möglich (so gedreht, wie sie gespeichert
// wird), "Seite 3 von 5" + Markierung der Ursprungsdatei. Blättern per Wischen
// (Schwelle 40 px), Pfeil-Buttons, Pfeiltasten; Punkte zeigen die Position.
// × , Esc oder Browser-Zurück schließen.

import { el } from "./shared.js";
import { icon } from "./icons.js";
import { oeffneVollflaeche } from "./ui.js";
import { seitenBild } from "./thumbs.js";

const SCHWELLE = 40;    // px – ab hier blättert ein Wischen
const MAX_PUNKTE = 12;  // bei mehr Seiten genügt "Seite 3 von 40"

function knopf(iconName, label) {
  const b = el("button", "icon-btn glass");
  b.type = "button";
  b.setAttribute("aria-label", label);
  b.append(icon(iconName, 20, 2));
  return b;
}

// seiten: [{ datei, nr, drehung }], start = Index der ersten gezeigten Seite,
// marke(seite) → { nummer, klasse } oder null (ohne Markierung).
export function zeigeVollbild({ seiten, start, marke, ausloeser }) {
  const n = seiten.length;
  let i = start;

  const box = el("div", "vollbild");
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Seitenansicht");

  const kopf = el("header", "fk-row vollbild-kopf");
  const zu = knopf("schliessen", "Schließen");
  const zaehler = el("p", "t-l t-num vollbild-zaehler");
  zaehler.setAttribute("aria-live", "polite");
  const markeBox = el("span", "fk-row vollbild-marke");
  kopf.append(zu, zaehler, markeBox);

  const buehne = el("div", "vollbild-buehne");
  const spur = el("div", "vollbild-spur");
  const folien = seiten.map((s) => {
    const folie = el("div", "vollbild-folie");
    const seite = el("span", "vollbild-seite");
    seite.style.setProperty("--r", s.datei.verhaeltnis);
    seite.style.setProperty("--grad", `${s.drehung}deg`);
    seite.classList.toggle("ist-quer", s.drehung % 180 !== 0);
    folie.append(seite);
    spur.append(folie);
    return { s, seite, geladen: false };
  });
  buehne.append(spur);

  const fuss = el("footer", "fk-stack vollbild-fuss");
  const reihe = el("div", "fk-row vollbild-reihe");
  const zurueck = knopf("zurueck", "Vorherige Seite");
  const weiter = knopf("weiter", "Nächste Seite");
  const punkte = el("div", "fk-row vollbild-punkte");
  punkte.setAttribute("aria-hidden", "true");
  const punktListe = n > 1 && n <= MAX_PUNKTE ? seiten.map(() => punkte.appendChild(el("span", "vollbild-punkt"))) : [];
  reihe.append(zurueck, punkte, weiter);
  const tipp = window.matchMedia("(pointer: coarse)").matches ? "Zum Blättern wischen" : "Mit den Pfeiltasten blättern";
  fuss.append(reihe, el("p", "t-xs t-muted", tipp));
  fuss.hidden = n === 1;

  box.append(kopf, buehne, fuss);

  function lade(j) {
    const f = folien[j];
    if (!f || f.geladen) return;
    f.geladen = true;
    seitenBild(f.s.datei, f.s.nr, "gross").then((b) => {
      if (!b || !box.isConnected) return;
      const img = el("img");
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      img.src = b.url;
      f.seite.style.setProperty("--r", b.verhaeltnis);
      f.seite.replaceChildren(img);
    });
  }

  function gehe(neu, sanft = true) {
    i = Math.max(0, Math.min(n - 1, neu));
    spur.style.transition = sanft ? "" : "none";
    spur.style.transform = `translateX(${-i * 100}%)`;
    zaehler.textContent = `Seite ${i + 1} von ${n}`;
    if (marke) {
      const m = marke(seiten[i]);
      markeBox.replaceChildren(el("span", `marker ${m.klasse}`, String(m.nummer)));
    }
    punktListe.forEach((p, j) => p.classList.toggle("ist-an", j === i));
    // Fokus nicht verlieren, wenn der gerade benutzte Pfeil am Ende ausgegraut wird.
    const fokus = document.activeElement;
    zurueck.disabled = i === 0;
    weiter.disabled = i === n - 1;
    if (fokus && fokus.disabled) (fokus === zurueck ? weiter : zurueck).focus();
    lade(i);
    lade(i + 1);
    lade(i - 1);
  }

  // Wischen: die Seiten folgen dem Finger, am Rand mit Widerstand.
  let wisch = null;
  buehne.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    wisch = { x: e.clientX, id: e.pointerId };
    try { buehne.setPointerCapture(e.pointerId); } catch {}
    spur.style.transition = "none";
  });
  buehne.addEventListener("pointermove", (e) => {
    if (!wisch || e.pointerId !== wisch.id) return;
    let dx = e.clientX - wisch.x;
    if ((i === 0 && dx > 0) || (i === n - 1 && dx < 0)) dx /= 3;
    spur.style.transform = `translateX(calc(${-i * 100}% + ${dx}px))`;
  });
  const loslassen = (e) => {
    if (!wisch || e.pointerId !== wisch.id) return;
    const dx = e.clientX - wisch.x;
    wisch = null;
    if (dx < -SCHWELLE) gehe(i + 1);
    else if (dx > SCHWELLE) gehe(i - 1);
    else gehe(i);
  };
  buehne.addEventListener("pointerup", loslassen);
  buehne.addEventListener("pointercancel", loslassen);

  box.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); gehe(i - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); gehe(i + 1); }
  });

  const ebene = oeffneVollflaeche({ element: box, ausloeser });
  zu.addEventListener("click", () => ebene.schliessen());
  zurueck.addEventListener("click", () => gehe(i - 1));
  weiter.addEventListener("click", () => gehe(i + 1));

  gehe(start, false);
  zu.focus();
}
