// flow-trennen.js – Ablauf "Trennen" (HANDOFF 6, Screens 15–16):
// Schritt 2 "Seiten auswählen" (Raster, Antippen = Haken) → Schritt 3
// "Speichern" (eine Datei oder je Seite eine, Dateiname mit Live-Vorschau).
// Verarbeitet wird nach dem Tipp auf "Speichern".

import { el, ohneEndung, sichererName } from "./shared.js";
import { icon } from "./icons.js";
import { hauptKnopf, setzeKnopfText } from "./wizard.js";
import { zeigeToast } from "./ui.js";
import { beobachteSeiten } from "./thumbs.js";
import { trenne } from "./split.js";
import { speichere } from "./save.js";
import {
  schrittInhalt, abschnitt, optKarte, radioGruppe, namensFeld, namensListe,
  mitVerarbeitung, fortschrittText,
} from "./flow-teile.js";

export function trennenSchritte() {
  return [
    { titel: "Seiten auswählen", baue: auswahlSchritt },
    { titel: "Speichern", baue: speichernSchritt },
  ];
}

// Zusammenhängende Seiten zu Bereichen: [3,4,5,7] → [[3,5],[7,7]].
function bereiche(seiten) {
  const liste = [];
  for (const s of seiten) {
    const letzter = liste.at(-1);
    if (letzter && s === letzter[1] + 1) letzter[1] = s;
    else liste.push([s, s]);
  }
  return liste;
}

// Für die Anzeige: "3, 4, 7" bzw. "1–4, 7" (ab 3 Seiten am Stück als Bereich).
function seitenAnzeige(seiten) {
  const teile = [];
  for (const [a, b] of bereiche(seiten)) {
    if (b - a >= 2) teile.push(`${a}–${b}`);
    else for (let s = a; s <= b; s++) teile.push(String(s));
  }
  return teile.length > 6 ? `${teile.slice(0, 5).join(", ")} …` : teile.join(", ");
}

// Für den Dateinamen (HANDOFF 6.2): "3-4-7"; ab 3 Seiten am Stück "1bis4".
function seitenImNamen(seiten) {
  const teile = [];
  for (const [a, b] of bereiche(seiten)) {
    if (b - a >= 2) teile.push(`${a}bis${b}`);
    else for (let s = a; s <= b; s++) teile.push(String(s));
  }
  return teile.join("-");
}

// --- Schritt 2: Seiten auswählen ---

function auswahlSchritt(ctx) {
  const o = ctx.optionen;
  const d = ctx.dateien[0];
  const anzahl = d.seiten;
  o.auswahl ??= new Set();

  const weiterKnopf = hauptKnopf("Weiter", ctx.weiter);

  // Werkzeugleiste: Zähler · Alle · Keine
  const zahl = el("b");
  const zaehler = el("p", "t-body t-num zaehler");
  zaehler.setAttribute("aria-live", "polite");
  zaehler.append(zahl, " ", el("span", "t-muted", `von ${anzahl} ausgewählt`));
  const alle = el("button", "btn-link", "Alle");
  alle.type = "button";
  const keine = el("button", "btn-link", "Keine");
  keine.type = "button";
  const leiste = el("div", "toolbar");
  leiste.append(zaehler, alle, keine);

  // Raster mit allen Seiten
  const raster = el("div", "seiten-raster");
  const kacheln = [];
  const beobachter = beobachteSeiten();
  ctx.signal.addEventListener("abort", () => beobachter.beende(), { once: true });

  for (let s = 1; s <= anzahl; s++) {
    const kachel = el("button", "tile");
    kachel.type = "button";
    kachel.setAttribute("aria-label", `Seite ${s}`);
    const rahmen = el("span", "tile-page seite-rahmen");
    const seite = el("span", "seite");
    seite.style.setProperty("--r", d.verhaeltnis);
    rahmen.append(seite);
    const haken = el("span", "tile-check");
    haken.setAttribute("aria-hidden", "true");
    haken.append(icon("haken", 16, 3));
    const fuss = el("span", "tile-foot");
    fuss.append(el("span", "tile-num", `Seite ${s}`));
    kachel.append(rahmen, haken, fuss);
    kachel.addEventListener("click", () => {
      if (o.auswahl.has(s)) o.auswahl.delete(s);
      else o.auswahl.add(s);
      ctx.geaendert();
      aktualisiere();
    });
    beobachter.beobachte(seite, d, s);
    raster.append(kachel);
    kacheln.push(kachel);
  }

  function aktualisiere() {
    kacheln.forEach((k, i) => {
      const an = o.auswahl.has(i + 1);
      k.classList.toggle("is-selected", an);
      k.setAttribute("aria-pressed", String(an));
    });
    zahl.textContent = String(o.auswahl.size);
    weiterKnopf.disabled = o.auswahl.size === 0;
  }

  alle.addEventListener("click", () => {
    for (let s = 1; s <= anzahl; s++) o.auswahl.add(s);
    ctx.geaendert();
    aktualisiere();
  });
  keine.addEventListener("click", () => {
    o.auswahl.clear();
    aktualisiere();
  });

  aktualisiere();
  return { inhalt: schrittInhalt(leiste, raster), dock: weiterKnopf };
}

// --- Schritt 3: Speichern ---

// Mini-Grafik der Options-Karten: Seiten → PDF(s).
function trennGrafik(eine) {
  const vis = el("span", "trenn-vis");
  if (eine) {
    const stapel = el("span", "fk-row trenn-stapel");
    for (let i = 0; i < 3; i++) stapel.append(el("span", "pg pg-klein"));
    vis.append(stapel, icon("pfeil-rechts", 16, 2.4), el("span", "pg pdf"));
  } else {
    for (let i = 0; i < 3; i++) vis.append(el("span", "pg pdf"));
  }
  return vis;
}

function speichernSchritt(ctx) {
  const o = ctx.optionen;
  const d = ctx.dateien[0];
  const seiten = [...o.auswahl].sort((a, b) => a - b);
  const n = seiten.length;
  const vorschlag = ohneEndung(d.file.name);
  o.trennart ??= "eine";
  o.name ??= vorschlag;
  const jede = () => n > 1 && o.trennart === "jede";

  function namen() {
    const basis = sichererName(o.name, vorschlag);
    if (n === 1) return [`${basis}_Seite${seiten[0]}.pdf`];
    if (!jede()) return [`${basis}_Seiten_${seitenImNamen(seiten)}.pdf`];
    return seiten.map((s) => `${basis}_Seite${s}.pdf`);
  }

  const knopf = hauptKnopf("Speichern", speichern, "speichern");
  const liste = namensListe();
  liste.element.setAttribute("aria-live", "polite");

  function aktualisiere() {
    const dateiNamen = namen();
    liste.zeige(dateiNamen);
    feld.setzeAnzahl(dateiNamen.length);
    setzeKnopfText(knopf, dateiNamen.length > 1 ? `Alle speichern (${dateiNamen.length})` : "Speichern");
  }

  let wahl = null;
  if (n > 1) {
    const gruppe = el("div", "trenn-karten");
    gruppe.append(
      optKarte({ wert: "eine", klasse: "ocard", titel: "Ausgewählte Seiten in einer Datei",
        sub: `${n} Seiten → 1 PDF`, vis: trennGrafik(true) }),
      optKarte({ wert: "jede", klasse: "ocard", titel: "Jede Seite als eigene Datei",
        sub: `${n} Seiten → ${n} PDFs`, vis: trennGrafik(false) }),
    );
    radioGruppe(gruppe, { label: "Ausgabe", wert: o.trennart, beiWahl: (w) => { o.trennart = w; aktualisiere(); } });
    wahl = abschnitt(["Wie speichern? ", el("span", "t-muted abschnitt-zusatz", `· Seiten ${seitenAnzeige(seiten)}`)], gruppe);
  }

  const feld = namensFeld({
    wert: o.name, endung: "pdf",
    beiEingabe: (v) => { o.name = v; ctx.geaendert(); aktualisiere(); },
  });

  async function speichern() {
    const dateiNamen = namen();
    const { ergebnis, zwischen } = await mitVerarbeitung(ctx, {
      knopf,
      titel: "Trennen",
      text: "Wird getrennt …",
      einheiten: dateiNamen.length,
      fehlerText: "Das Trennen hat leider nicht geklappt. Versuche es noch einmal.",
      job: ({ signal, melde }) => {
        melde({ anteil: 0, fertig: 0, text: fortschrittText("Datei", 1, dateiNamen.length, 0) });
        return trenne(d.file, seiten, jede(), {
          signal,
          beiDatei: (f, gesamt) => melde({ anteil: f / gesamt, fertig: f, text: fortschrittText("Datei", f, gesamt, f / gesamt) }),
        });
      },
      danach: (teile) => speichere(teile.map((e, i) => ({ blob: e.blob, name: dateiNamen[i] }))),
    });
    if (!ergebnis) return;
    if (zwischen) ctx.schliesseZwischen();
    zeigeToast(dateiNamen.length > 1 ? `${dateiNamen.length} Dateien gespeichert.` : `Gespeichert: ${dateiNamen[0]}`);
  }

  aktualisiere();
  return {
    inhalt: schrittInhalt(wahl, feld.element, abschnitt(n > 1 ? "So heißen die Dateien" : "So heißt die Datei", liste.element)),
    dock: knopf,
  };
}
