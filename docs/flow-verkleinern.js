// flow-verkleinern.js – Ablauf "Verkleinern" (HANDOFF 6, Screens 07–09b):
// Schritt 2 "Wie stark verkleinern?" (Qualität oder Zielgröße) → Verarbeiten →
// Schritt 3 "Speichern" (Ergebnis, Ausgabe, Dateiname). Verarbeitet wird vor
// dem Speichern-Schritt, weil dort das Ergebnis ("8,4 MB → 1,9 MB") steht.

import { el, humanSize, ersparnis, ohneEndung, sichererName, eindeutigeNamen } from "./shared.js";
import { icon } from "./icons.js";
import { hauptKnopf } from "./wizard.js";
import { STAERKEN, verkleinere, endungNachVerkleinern } from "./compress.js";
import { speicherZiel } from "./save.js";
import { zeigeGespeichert } from "./gespeichert.js";
import {
  schrittInhalt, abschnitt, miniatur, dateiInfo, dateiZeile, optKarte, radioGruppe,
  hinweis, namensFeld, ausgabeZeile, mitVerarbeitung, fortschrittText, speichereErgebnis,
} from "./flow-teile.js";

// Zielgrößen dezimal gerechnet (2 MB = 2 000 000 Byte): So passt "unter 2 MB"
// für jedes Formular, egal wie es selbst rechnet.
const MB = 1000 * 1000;
const ZIELE = [
  { wert: "500k", bytes: 500 * 1000, text: "500 KB" },
  { wert: "1m", bytes: 1 * MB, text: "1 MB" },
  { wert: "2m", bytes: 2 * MB, text: "2 MB" },
  { wert: "5m", bytes: 5 * MB, text: "5 MB" },
];

const zahlText = (n) => n.toLocaleString("de-DE", { maximumFractionDigits: 2 });

export function verkleinernSchritte() {
  return [
    { titel: "Wie stark verkleinern?", baue: staerkeSchritt },
    { titel: "Speichern", baue: speichernSchritt },
  ];
}

// --- Zielgröße ---

const groessteDatei = (dateien) => Math.max(...dateien.map((d) => d.file.size));

// Standard: 2 MB – es sei denn, die Datei ist schon kleiner; dann das größte
// Ziel darunter (oder ein eigener Wert, wenn alle Vorgaben zu groß sind).
function standardZiel(groesste) {
  const passend = ZIELE.filter((z) => z.bytes < groesste);
  if (passend.some((z) => z.wert === "2m")) return "2m";
  return passend.length ? passend.at(-1).wert : "eigen";
}

function standardEigen(groesste) {
  return zahlText(Math.max(0.1, Math.round((groesste / MB / 2) * 10) / 10));
}

// Gewählte Zielgröße prüfen: { ok, bytes, text, fehler }.
function zielInfo(o, dateien) {
  if (o.ziel !== "eigen") {
    const z = ZIELE.find((x) => x.wert === o.ziel);
    return { ok: true, bytes: z.bytes, text: z.text };
  }
  const zahl = parseFloat(String(o.eigen).replace(",", ".").replace(/[^\d.]/g, ""));
  if (!(zahl > 0)) return { ok: false, fehler: "Bitte eine Zahl größer als 0 eingeben." };
  const bytes = Math.round(zahl * MB);
  const text = `${zahlText(zahl)} MB`;
  if (bytes >= groessteDatei(dateien)) {
    return { ok: false, text, fehler: dateien.length === 1
      ? "Die Datei ist schon kleiner – wähle einen kleineren Wert."
      : "Alle Dateien sind schon kleiner – wähle einen kleineren Wert." };
  }
  return { ok: true, bytes, text };
}

// --- Schritt 2: Wie stark verkleinern? ---

function staerkeSchritt(ctx) {
  const o = ctx.optionen;
  const { dateien } = ctx;
  const einzeln = dateien.length === 1;
  const groesste = groessteDatei(dateien);
  o.modus ??= "qualitaet";
  o.staerke ??= "mittel";
  o.ziel ??= standardZiel(groesste);
  o.eigen ??= standardEigen(groesste);

  const weiterKnopf = hauptKnopf("Weiter", starte);
  const bereich = el("div", "fk-stack schritt-bereich");

  // Umschalter Qualität | Zielgröße
  const seg = el("div", "seg");
  seg.setAttribute("role", "group");
  seg.setAttribute("aria-label", "Art der Verkleinerung");
  const segKnoepfe = [["qualitaet", "Qualität"], ["ziel", "Zielgröße"]].map(([wert, text]) => {
    const k = el("button", null, text);
    k.type = "button";
    k.addEventListener("click", () => {
      if (o.modus === wert) return;
      o.modus = wert;
      zeigeBereich(true);
    });
    seg.append(k);
    return [wert, k];
  });

  function zeigeBereich(animiert) {
    for (const [wert, k] of segKnoepfe) {
      k.classList.toggle("is-on", o.modus === wert);
      k.setAttribute("aria-pressed", String(o.modus === wert));
    }
    bereich.replaceChildren(o.modus === "ziel" ? zielBereich() : qualitaetBereich());
    if (animiert) {
      bereich.classList.remove("in-fade");
      void bereich.offsetWidth;
      bereich.classList.add("in-fade");
    }
    pruefe();
  }

  function pruefe() {
    weiterKnopf.disabled = o.modus === "ziel" && !zielInfo(o, dateien).ok;
  }

  // Qualität: Stark · Mittel (empfohlen) · Schonend
  function qualitaetBereich() {
    const gruppe = el("div", "fk-stack opt-liste");
    const karten = [
      ["stark", "kleinste Datei"],
      ["mittel", "gute Balance"],
      ["schonend", "beste Qualität"],
    ].map(([wert, sub]) => {
      const vis = el("span", `staerke-vis is-${wert}`);
      vis.append(el("span", "staerke-blatt"));
      return optKarte({ wert, titel: STAERKEN[wert].name, sub, vis,
        badge: wert === "mittel" ? "empfohlen" : null });
    });
    gruppe.append(...karten);
    radioGruppe(gruppe, { label: "Stärke", wert: o.staerke, beiWahl: (w) => { o.staerke = w; } });
    return gruppe;
  }

  // Zielgröße: Chips 500 KB · 1 MB · 2 MB · 5 MB · Eigener Wert
  function zielBereich() {
    const chips = el("div", "fk-row chip-reihe");
    const zuGross = (z) => z.bytes >= groesste;
    for (const z of ZIELE) {
      const chip = el("button", "chip", z.text);
      chip.type = "button";
      chip.setAttribute("role", "radio");
      chip.dataset.wert = z.wert;
      chip.disabled = zuGross(z);
      chips.append(chip);
    }
    const eigenChip = el("button", "chip");
    eigenChip.type = "button";
    eigenChip.setAttribute("role", "radio");
    eigenChip.dataset.wert = "eigen";
    eigenChip.append(icon("stift", 16, 2), el("span", null, "Eigener Wert"));
    chips.append(eigenChip);

    const eigenFeld = el("div", "field in-up");
    const label = el("label", null, "Eigene Zielgröße");
    label.htmlFor = "zielEigen";
    const box = el("div", "field-box");
    const input = el("input");
    input.id = "zielEigen";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.enterKeyHint = "done";
    input.value = o.eigen;
    box.append(input, el("span", "field-ext", "MB"));
    const fehler = el("p", "field-hint is-fehler");
    fehler.setAttribute("aria-live", "polite");
    eigenFeld.append(label, box, fehler);

    const satzZiel = el("b", "satz-ziel");
    const satz = el("p", "t-body t-muted");
    satz.append(`FileKit versucht, ${einzeln ? "die Datei" : "jede Datei"} unter `, satzZiel, " zu bringen.");

    function aktualisiere() {
      const info = zielInfo(o, dateien);
      eigenFeld.hidden = o.ziel !== "eigen";
      fehler.textContent = o.ziel === "eigen" && !info.ok ? info.fehler : "";
      satz.hidden = !info.ok;
      if (info.ok) satzZiel.textContent = info.text;
      pruefe();
    }

    input.addEventListener("input", () => {
      o.eigen = input.value;
      aktualisiere();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
    });

    radioGruppe(chips, {
      label: "Zielgröße", wert: o.ziel, an: "is-on",
      beiWahl: (w) => {
        o.ziel = w;
        aktualisiere();
        if (w === "eigen") input.focus();
      },
    });
    aktualisiere();

    const sek = abschnitt("Maximale Dateigröße", chips, eigenFeld, satz);
    if (ZIELE.every(zuGross)) {
      sek.append(hinweis(einzeln
        ? "Die Datei ist schon kleiner als 500 KB. Du kannst einen eigenen Wert eingeben."
        : "Alle Dateien sind schon kleiner als 500 KB. Du kannst einen eigenen Wert eingeben."));
    }
    return sek;
  }

  // Weiter: verarbeiten (oder das letzte Ergebnis wiederverwenden, wenn sich
  // nichts geändert hat), dann zum Speichern-Schritt.
  async function starte() {
    const optionen = o.modus === "ziel" ? { ziel: zielInfo(o, dateien).bytes } : { staerke: o.staerke };
    const schluessel = JSON.stringify(optionen);
    if (o.ergebnis && o.ergebnis.schluessel === schluessel) return ctx.weiter();

    const seiten = einzeln && dateien[0].art === "pdf" ? dateien[0].seiten : 0;
    const ergebnis = await mitVerarbeitung(ctx, {
      knopf: weiterKnopf,
      titel: "Verkleinern",
      text: "Wird verkleinert …",
      einheiten: einzeln ? seiten : dateien.length,
      fehlerText: "Das Verkleinern hat leider nicht geklappt. Versuche es noch einmal.",
      job: ({ signal, melde }) => verkleinereAlle(dateien, optionen, { signal, melde }),
    });
    if (!ergebnis) return;
    o.ergebnis = { schluessel, optionen, liste: ergebnis };
    ctx.weiter();
  }

  zeigeBereich(false);
  const pdfHinweis = dateien.some((d) => d.art === "pdf") ? hinweis("Text ist danach nicht mehr markierbar.") : null;
  return { inhalt: schrittInhalt(dateiZeile(dateien), seg, bereich, pdfHinweis), dock: weiterKnopf };
}

// Alle Dateien nacheinander verkleinern. Bei mehreren Dateien bricht ein
// Fehler nicht alles ab – die Datei wird dann als "nicht verkleinert" geführt.
async function verkleinereAlle(dateien, optionen, { signal, melde }) {
  const n = dateien.length;
  const liste = [];
  for (let i = 0; i < n; i++) {
    const d = dateien[i];
    const stand = (anteilDatei, seite, seiten) => {
      const anteil = (i + anteilDatei) / n;
      melde({
        anteil,
        fertig: n > 1 ? i : seite,
        datei: d,
        text: n > 1 ? fortschrittText("Datei", i + 1, n, anteil) : fortschrittText("Seite", Math.max(seite, 1), seiten, anteil),
      });
    };
    stand(0, 0, d.art === "pdf" ? d.seiten : 1);
    try {
      const r = await verkleinere(d, optionen, {
        signal,
        beiSeite: (p, seiten) => stand(p / seiten, p, seiten),
      });
      liste.push({ eintrag: d, ...r });
    } catch (e) {
      if (signal.aborted || n === 1) throw e;
      console.error(e);
      liste.push({ eintrag: d, blob: d.file, unveraendert: true, erreicht: false, fehler: true });
    }
    stand(1, d.art === "pdf" ? d.seiten : 1, d.art === "pdf" ? d.seiten : 1);
  }
  return liste;
}

// --- Schritt 3: Speichern ---

function formatText(liste) {
  const formate = [...new Set(liste.map((r) => {
    const e = endungNachVerkleinern(r.eintrag);
    return e === "jpeg" ? "JPG" : e.toUpperCase();
  }))];
  return formate.join(", ");
}

function zielText(bytes) {
  const z = ZIELE.find((x) => x.bytes === bytes);
  return z ? z.text : `${zahlText(bytes / MB)} MB`;
}

// Pfeil "→" zwischen vorher und nachher (für Screenreader: "zu").
function pfeil() {
  const p = icon("pfeil-rechts", 18, 2.2);
  p.removeAttribute("aria-hidden");
  p.setAttribute("role", "img");
  p.setAttribute("aria-label", "zu");
  p.classList.add("t-muted");
  return p;
}

// Ergebnis-Karte: "8,4 MB → 1,9 MB", Badge "−77 %", Balken Vorher/Nachher
// (mit Ziel-Markierung, wenn die Zielgröße verfehlt wurde).
function ergebnisKarte({ bild, titel, vorher, nachher, ziel, erreicht }) {
  const karte = el("section", "card fk-stack ergebnis");
  karte.setAttribute("aria-label", "Ergebnis");

  const kopf = el("div", "fk-row ergebnis-kopf");
  const text = el("div", "fk-stack ergebnis-text");
  const werte = el("p", "fk-row t-num ergebnis-werte");
  werte.append(el("span", "t-l t-muted", humanSize(vorher)), pfeil(), el("span", "t-title", humanSize(nachher)));
  text.append(el("p", "t-s t-2 ergebnis-titel", titel), werte);
  kopf.append(bild, text, el("span", "badge badge-success badge-big t-num in-up d4", ersparnis(vorher, nachher)));

  const balken = el("div", "fk-stack ergebnis-balken");
  balken.setAttribute("aria-hidden", "true");
  const reihe = (label, ...inhalt) => {
    const r = el("div", "fk-row balken-reihe");
    r.append(el("span", "t-xs t-muted balken-label", label), ...inhalt);
    return r;
  };
  const spur = el("span", "balken-spur");
  // Der Balken schrumpft von voller Breite auf das Ergebnis (per scaleX).
  const breite = Math.max(2, (nachher / vorher) * 100);
  const nach = el("span", `balken bar-after${erreicht ? "" : " is-warning"}`);
  nach.style.width = `${breite}%`;
  nach.style.setProperty("--von", String(100 / breite));
  spur.append(nach);
  if (!erreicht && ziel) {
    const prozent = Math.min(100, (ziel / vorher) * 100);
    const pos = `${prozent}%`;
    const strich = el("span", "balken-ziel");
    strich.style.left = pos;
    const rand = prozent < 15 ? " am-anfang" : prozent > 85 ? " am-ende" : "";
    const marke = el("span", `t-xs balken-ziel-text${rand}`, `Ziel ${zielText(ziel)}`);
    marke.style.left = pos;
    spur.append(strich, marke);
    balken.classList.add("mit-ziel");
  }
  balken.append(reihe("Vorher", el("span", "balken balken-voll")), reihe("Nachher", spur));
  karte.append(kopf, balken);
  return karte;
}

function speichernSchritt(ctx) {
  const o = ctx.optionen;
  const { liste, optionen } = o.ergebnis;
  const einzeln = liste.length === 1;
  const ziel = optionen.ziel || 0;
  const zuSpeichern = liste.filter((r) => !r.unveraendert);
  const verfehlt = liste.filter((r) => !r.unveraendert && !r.erreicht);

  const ausgabe = ausgabeZeile(
    ziel
      ? ["Zielgröße: ", el("b", null, zielText(ziel)), ` · ${formatText(liste)}`]
      : ["Stärke: ", el("b", null, STAERKEN[optionen.staerke].name), ` · ${formatText(liste)}`],
    ctx.zurueck
  );
  const andereWahl = ziel ? "Andere Zielgröße wählen" : "Andere Stärke wählen";

  // Nichts ist kleiner geworden → nichts zu speichern.
  if (!zuSpeichern.length) {
    const r = liste[0];
    // "Stark" nur vorschlagen, wenn es Aussicht hat: Es spart grob zwei Drittel
    // gegenüber "Mittel". Text-PDFs werden beim Verkleinern dagegen meist größer.
    const starkHilft = !ziel && optionen.staerke !== "stark" && r.versuch && r.versuch * 0.35 < r.eintrag.file.size;
    const text = einzeln
      ? (starkHilft
          ? `Mit „${STAERKEN[optionen.staerke].name}“ wird diese Datei nicht kleiner. Versuche es mit „Stark“.`
          : "Diese Datei lässt sich nicht weiter verkleinern – sie ist schon gut komprimiert.")
      : "Keine der Dateien ist kleiner geworden – sie sind schon gut komprimiert.";
    const karte = einzeln ? kleineDateiKarte(r) : null;
    const zurueck = hauptKnopf(andereWahl, ctx.zurueck);
    return {
      inhalt: schrittInhalt(karte, hinweis(text, { art: "warning", titel: "Kleiner geht es nicht" }), ausgabe),
      dock: zurueck,
    };
  }

  const teile = [];
  let namen;

  if (einzeln) {
    const r = liste[0];
    const d = r.eintrag;
    const endung = endungNachVerkleinern(d);
    const vorschlag = `${ohneEndung(d.file.name)}_klein`;
    o.name ??= vorschlag;
    teile.push(ergebnisKarte({
      bild: miniatur(d, "mini mini-gross"),
      titel: `${d.file.name} · ${dateiInfo(d)}`,
      vorher: d.file.size, nachher: r.blob.size, ziel, erreicht: r.erreicht,
    }));
    if (!r.erreicht) {
      teile.push(hinweis(
        `Kleiner als ${humanSize(r.blob.size)} geht bei dieser Datei nicht, ohne dass ${d.art === "pdf" ? "der Text unleserlich wird" : "das Bild zu unscharf wird"}. Du kannst sie so speichern oder eine andere Zielgröße wählen.`,
        { art: "warning", titel: "Zielgröße nicht erreicht" }
      ));
    }
    teile.push(abschnitt("Ausgabe", ausgabe));
    const feld = namensFeld({
      wert: o.name, endung,
      beiEingabe: (v) => { o.name = v; ctx.geaendert(); },
    });
    teile.push(feld.element);
    namen = () => [`${sichererName(o.name, vorschlag)}.${endung}`];
  } else {
    const vorher = liste.reduce((s, r) => s + r.eintrag.file.size, 0);
    const nachher = liste.reduce((s, r) => s + r.blob.size, 0);
    const stapel = el("span", "mini-stapel mini-stapel-gross");
    stapel.setAttribute("aria-hidden", "true");
    liste.slice(0, 3).forEach((r) => stapel.append(miniatur(r.eintrag)));
    teile.push(ergebnisKarte({
      bild: stapel, titel: `${liste.length} Dateien`, vorher, nachher, ziel, erreicht: !verfehlt.length,
    }));
    const dateiNamen = eindeutigeNamen(liste.map((r) =>
      `${ohneEndung(r.eintrag.file.name)}_klein.${endungNachVerkleinern(r.eintrag)}`));
    teile.push(ergebnisListe(liste, dateiNamen, ziel));
    if (verfehlt.length) {
      teile.push(hinweis(
        `${verfehlt.length === 1 ? "Bei 1 Datei" : `Bei ${verfehlt.length} Dateien`} geht es nicht kleiner, ohne dass Text oder Bild unleserlich werden. Du kannst sie so speichern oder eine andere Zielgröße wählen.`,
        { art: "warning", titel: "Zielgröße nicht überall erreicht" }
      ));
    }
    teile.push(abschnitt("Ausgabe", ausgabe));
    teile.push(el("p", "field-hint", "Werden als neue Dateien gespeichert – die Originale bleiben unverändert."));
    namen = () => liste.map((r, i) => (r.unveraendert ? null : dateiNamen[i])).filter(Boolean);
  }

  const n = zuSpeichern.length;
  const speichern = hauptKnopf(n > 1 ? `Alle speichern (${n})` : "Speichern", async () => {
    const dateiNamen = namen();
    const ziel = await speicherZiel(dateiNamen);
    if (!ziel) return; // "Speichern unter" abgebrochen
    const gespeichert = await speichereErgebnis(speichern, ziel,
      zuSpeichern.map((r, i) => ({ blob: r.blob, name: dateiNamen[i] })));
    if (!gespeichert) return;
    const vorher = zuSpeichern.reduce((s, r) => s + r.eintrag.file.size, 0);
    zeigeGespeichert(ctx, {
      gespeichert,
      bilder: zuSpeichern.map((r) => ({ eintrag: r.eintrag })),
      badge: ersparnis(vorher, gespeichert.reduce((s, d) => s + d.groesse, 0)),
    });
  }, "speichern");

  const dock = [speichern];
  if (verfehlt.length) {
    const ghost = el("button", "btn btn-ghost btn-block btn-ghost-klein", andereWahl);
    ghost.type = "button";
    ghost.addEventListener("click", ctx.zurueck);
    dock.unshift(ghost);
  }
  return { inhalt: schrittInhalt(...teile), dock };
}

// Karte für eine Datei, die nicht kleiner wurde (nur Name und Größe).
function kleineDateiKarte(r) {
  const d = r.eintrag;
  const karte = el("section", "card fk-row ergebnis-kopf ergebnis");
  const text = el("div", "fk-stack ergebnis-text");
  text.append(el("p", "t-s t-2 ergebnis-titel", `${d.file.name} · ${dateiInfo(d)}`),
    el("p", "t-title t-num", humanSize(d.file.size)));
  karte.append(miniatur(d, "mini mini-gross"), text);
  return karte;
}

// Mehrere Dateien: Ergebnis je Datei.
function ergebnisListe(liste, namen, ziel) {
  const ul = el("ul", "card ergebnis-liste");
  ul.setAttribute("aria-label", "Ergebnis je Datei");
  liste.forEach((r, i) => {
    const li = el("li", "fk-row ergebnis-zeile");
    const text = el("div", "fk-stack ergebnis-zeile-text");
    const name = el("span", "t-s ergebnis-zeile-name", r.unveraendert ? r.eintrag.file.name : namen[i]);
    name.title = name.textContent;
    let sub;
    let badge = null;
    if (r.fehler) {
      sub = "ließ sich nicht verkleinern";
    } else if (r.unveraendert) {
      sub = ziel && r.eintrag.file.size <= ziel
        ? `schon kleiner als ${zielText(ziel)} – bleibt, wie sie ist`
        : "schon gut komprimiert – bleibt, wie sie ist";
    } else {
      sub = `${humanSize(r.eintrag.file.size)} → ${humanSize(r.blob.size)}`;
      badge = el("span", `badge t-num ${r.erreicht ? "badge-success" : "badge-warning"}`,
        ersparnis(r.eintrag.file.size, r.blob.size));
    }
    text.append(name, el("span", "t-xs t-muted t-num", sub));
    li.append(miniatur(r.eintrag), text);
    if (badge) li.append(badge);
    ul.append(li);
  });
  return ul;
}
