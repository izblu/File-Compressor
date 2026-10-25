// editor.js – Seiten-Editor (HANDOFF Screens 10–14, Kapitel 9) für
// "Zusammenführen" und "Seiten ordnen": alle Seiten als Kacheln, beim
// Zusammenführen farbig markiert nach Ursprungsdatei (immer mit Dateinummer).
//   · Ziehen zum Umordnen: Touch nach Long-Press (250 ms), Maus nach 4 px;
//     Tastatur: Leertaste hebt an, Pfeiltasten verschieben, Leertaste legt ab.
//   · Antippen (oder ⋯) öffnet das Seitenmenü: Seite groß ansehen · Drehen ·
//     An den Anfang · Ans Ende · Löschen.
//   · Mehrfachauswahl über "Auswählen" oder Long-Press ohne Bewegung > 500 ms:
//     Verschieben (danach Ziel antippen) · Drehen · Löschen.
//   · Löschen immer mit Toast "Rückgängig", keine Rückfrage.
//
// Am PC (ab 1024 px, HANDOFF 21b) nutzt der Editor die volle Breite: Raster mit
// 4–5 Spalten, Fußleiste "8 Seiten aus 5 Dateien" + "Weiter". Beim Ziehen
// bleiben die anderen Kacheln stehen, eine Einfüge-Linie zeigt das Ziel. Beim
// Zusammenführen lassen sich Dateien direkt in den Editor ziehen.
//
// Zustand in ctx.optionen (bleibt bei Zurück/Weiter erhalten):
//   o.dateien – Ursprungsdateien; Position + 1 = Dateinummer
//   o.seiten  – [{ id, datei, nr, drehung }] in der neuen Reihenfolge

import { el, seitenText, kurzerName } from "./shared.js";
import { icon } from "./icons.js";
import { hauptKnopf } from "./wizard.js";
import { oeffneSheet, zeigeToast, ansage, wenigBewegung } from "./ui.js";
import { oeffneDatei, freigeben, OeffnenFehler } from "./intake.js";
import { meldeOeffnenFehler, meldeAblage } from "./start.js";
import { beobachteSeiten } from "./thumbs.js";
import { zeigeVollbild } from "./vollbild.js";

const ANSICHT_KEY = "fk-editor-spalten"; // "2" | "1" (am PC: kleine | große Vorschau)
const breit = window.matchMedia("(min-width: 1024px)");                  // PC-Layout
const maus = window.matchMedia("(hover: hover) and (pointer: fine)");    // "Klicke" statt "Tippe"
const HEBEN_MS = 250;       // Touch: so lange halten, bis die Seite angehoben ist
const AUSWAHL_MS = 500;     // so lange halten (ohne Bewegung) → Mehrfachauswahl
const MAUS_SCHWELLE = 4;    // px – ab hier zieht die Maus
const TOUCH_SCHWELLE = 10;  // px – Bewegung vor dem Anheben = Scrollen
const RAND = 64;            // px – Auto-Scroll am oberen/unteren Rand
const NACHRUTSCHEN = { duration: 340, easing: "cubic-bezier(.65, 0, .35, 1)" };

let naechsteId = 1;

// Alle Seiten einer Datei als Einträge für den Editor.
function seitenVon(datei) {
  return Array.from({ length: datei.seiten }, (_, i) => ({ id: naechsteId++, datei, nr: i + 1, drehung: 0 }));
}

// Markierung einer Ursprungsdatei: Nummer und Farbe m1…m5 (ab der 6. wiederholt).
export function markeVon(o, datei) {
  const nummer = o.dateien.indexOf(datei) + 1;
  return { nummer, klasse: `bg-m${((nummer - 1) % 5) + 1}` };
}

function gemerkteSpalten() {
  try { return localStorage.getItem(ANSICHT_KEY) === "1" ? 1 : 2; } catch { return 2; }
}

function merkeSpalten(n) {
  try { localStorage.setItem(ANSICHT_KEY, String(n)); } catch {}
}

// Animation neu starten (Klasse entfernen, Reflow, wieder setzen).
function spieleAb(element, klasse) {
  element.classList.remove(klasse);
  void element.offsetWidth;
  element.classList.add(klasse);
  element.addEventListener("animationend", () => element.classList.remove(klasse), { once: true });
}

function iconKnopf(iconName, label, beiKlick, groesse = 20) {
  const b = el("button", "icon-btn");
  b.type = "button";
  b.setAttribute("aria-label", label);
  b.append(icon(iconName, groesse, 2));
  b.addEventListener("click", beiKlick);
  return b;
}

// --- Schritt 2: Seiten anordnen ---

export function editorSchritt(ctx) {
  const o = ctx.optionen;
  const zusammen = ctx.aktion === "zusammenfuehren";
  if (!o.seiten) {
    o.dateien = [...ctx.dateien];
    o.seiten = o.dateien.flatMap(seitenVon);
  }

  let spalten = gemerkteSpalten();
  let modus = "normal";         // "normal" | "auswahl" | "ziel" (Verschieben: Ziel antippen)
  const auswahl = new Set();    // ids der ausgewählten Seiten
  const teile = new Map();      // id → { s, k, seite, num, rotText, winkel, gross }
  const laufend = new WeakMap(); // Kachel → laufende Nachrutsch-Animation
  const beobachter = beobachteSeiten();
  let zug = null;               // Ziehen mit Finger/Maus
  let tasten = null;            // per Tastatur angehobene Seite
  let klickSperreBis = 0;       // Klick direkt nach Ziehen/Long-Press ignorieren
  let nachAbbruch = false;      // Ziehen per Esc abgebrochen → folgenden Klick ignorieren
  let oeffnet = false;          // weitere Dateien werden gerade geöffnet
  let ablageAn = false;         // Dateien werden gerade über den Editor gezogen
  let rueckgaengig = null;      // Toast mit "Rückgängig"

  const teil = (k) => teile.get(Number(k.dataset.id));
  const body = () => box.closest(".fk-body");
  const gewaehlte = () => o.seiten.filter((s) => auswahl.has(s.id));
  // Spalten, die das Raster gerade wirklich zeigt (Handy 1–2, PC 2–6).
  const spaltenJetzt = () => getComputedStyle(raster).gridTemplateColumns.split(" ").length;

  // --- Aufbau ---

  const box = el("div", "fk-stack ed");

  const legende = el("div", "legend ed-legende");
  legende.setAttribute("aria-label", "Ursprungsdateien");

  const leiste = el("div", "toolbar");
  const zahl = el("span", "t-s t-muted ed-zahl");
  const auswaehlen = el("button", "btn-link", "Auswählen");
  auswaehlen.type = "button";
  auswaehlen.addEventListener("click", () => {
    setzeModus("auswahl");
    const erste = o.seiten[0] && teile.get(o.seiten[0].id).k;
    if (erste) erste.focus({ preventScroll: true });
  });
  const ansicht = el("div", "viewtoggle");
  ansicht.setAttribute("role", "group");
  ansicht.setAttribute("aria-label", "Ansicht");
  const zwei = ansichtKnopf(2, "ansicht-2-spalten");
  const eine = ansichtKnopf(1, "ansicht-1-spalte");
  ansicht.append(zwei, eine);
  beschrifteAnsicht();
  leiste.append(zahl, auswaehlen, ansicht);

  const raster = el("div", "ed-raster ist-normal");
  raster.setAttribute("role", "group");
  raster.setAttribute("aria-label", "Seiten");
  const hilfe = el("p", "sr-only",
    "Eingabetaste öffnet die Optionen. Leertaste hebt die Seite an, Pfeiltasten verschieben sie, Leertaste legt sie ab.");
  hilfe.id = "ed-hilfe";

  // Ziel "ans Ende" beim Verschieben der Auswahl
  const ende = el("button", "tile-slot ed-ende");
  ende.type = "button";
  ende.hidden = true;
  ende.append(icon("ans-ende", 22, 2), el("span", null, "Hier einfügen"), el("span", "t-xs ed-ende-sub", "ans Ende"));
  ende.addEventListener("click", () => fuegeEin(null));
  raster.append(ende);

  // "+ Weitere Dateien hinzufügen" (nur beim Zusammenführen)
  let neu = null;
  let neuText = null;
  let neuPlus = null;
  let eingabe = null;
  if (zusammen) {
    neu = el("button", "tile-add ed-neu");
    neu.type = "button";
    neuPlus = el("span", "plus");
    neuText = el("span", null, "Weitere Dateien hinzufügen");
    // Nur mit Maus: Dateien lassen sich auch in den Editor ziehen.
    neu.append(neuPlus, neuText, el("span", "t-xs t-muted ed-neu-oder", "oder hierher ziehen"));
    zeigeNeuBereit();
    eingabe = el("input");
    eingabe.type = "file";
    eingabe.accept = "application/pdf,image/*";
    eingabe.multiple = true;
    eingabe.hidden = true;
    neu.addEventListener("click", () => { if (!oeffnet) eingabe.click(); });
    eingabe.addEventListener("change", () => {
      const files = [...eingabe.files];
      eingabe.value = "";
      fuegeDateienHinzu(files);
    });
    raster.append(neu);
  }

  for (const s of o.seiten) raster.insertBefore(baueKachel(s), ende);

  box.append(...(zusammen ? [legende] : []), leiste, raster, hilfe, ...(eingabe ? [eingabe] : []));

  // Dock je Modus. Am PC steht links daneben "8 Seiten aus 5 Dateien".
  const weiterKnopf = hauptKnopf("Weiter", ctx.weiter);
  const fussText = el("p", "t-body t-muted ed-fuss");
  fussText.setAttribute("aria-live", "polite");

  const selbar = el("div", "selbar");
  selbar.setAttribute("role", "toolbar");
  selbar.setAttribute("aria-label", "Ausgewählte Seiten");
  const verschiebenK = selKnopf("verschieben", "Verschieben", () => setzeModus("ziel"));
  const drehenK = selKnopf("drehen", "Drehen", () => drehe(gewaehlte()));
  const loeschenK = selKnopf("loeschen", "Löschen", () => loesche(gewaehlte()));
  loeschenK.classList.add("danger");
  selbar.append(verschiebenK, drehenK, loeschenK);

  const zielHinweis = el("p", "t-s t-2 ed-dock-hinweis");

  // Kopfzeilen der Modi
  const auswahlTitel = el("b", "t-num");
  auswahlTitel.setAttribute("aria-live", "polite");
  const alleKnopf = el("button", "btn-link ed-alle", "Alle");
  alleKnopf.type = "button";
  alleKnopf.addEventListener("click", () => {
    if (auswahl.size === o.seiten.length) auswahl.clear();
    else {
      o.seiten.forEach((s) => auswahl.add(s.id));
      ctx.geaendert();
    }
    aktualisiere();
  });
  const auswahlKopf = {
    links: iconKnopf("schliessen", "Auswahl beenden", () => {
      setzeModus("normal");
      auswaehlen.focus({ preventScroll: true });
    }),
    titel: auswahlTitel,
    rechts: alleKnopf,
  };
  const zielKopf = {
    links: iconKnopf("zurueck", "Zurück zur Auswahl", () => setzeModus("auswahl"), 22),
    titel: el("b", null, "Wohin verschieben?"),
  };

  function ansichtKnopf(n, iconName) {
    const b = el("button");
    b.type = "button";
    b.append(icon(iconName, 18, 2));
    b.addEventListener("click", () => setzeSpalten(n));
    return b;
  }

  // Am PC gibt es mehr als 2 Spalten – dort heißt es "Kleine/Große Vorschau".
  function beschrifteAnsicht() {
    zwei.setAttribute("aria-label", breit.matches ? "Kleine Vorschau" : "2 Spalten");
    eine.setAttribute("aria-label", breit.matches ? "Große Vorschau" : "1 Spalte");
  }

  function selKnopf(iconName, text, beiKlick) {
    const b = el("button");
    b.type = "button";
    b.append(icon(iconName, 22, 1.9), el("span", null, text));
    b.addEventListener("click", beiKlick);
    return b;
  }

  // --- Kacheln ---

  function baueKachel(s) {
    const k = el("div", "tile ed-kachel");
    k.tabIndex = 0;
    k.setAttribute("role", "button");
    k.dataset.id = String(s.id);
    const m = zusammen ? markeVon(o, s.datei) : null;

    if (m) {
      const band = el("span", `tile-band ${m.klasse}`);
      band.setAttribute("aria-hidden", "true");
      k.append(band);
    }
    const rahmen = el("span", "tile-page seite-rahmen");
    const seite = el("span", "seite");
    seite.style.setProperty("--r", s.datei.verhaeltnis);
    rahmen.append(seite);

    const haken = el("span", "tile-check");
    haken.append(icon("haken", 16, 3));
    const rot = el("span", "tile-rot");
    const rotText = el("span");
    rot.append(icon("drehen", 12, 2.6), rotText);
    const einfuegen = el("span", "ed-einfuegen");
    einfuegen.append(el("span", "ed-einfuegen-text", "Hier einfügen"));
    for (const x of [haken, rot, einfuegen]) x.setAttribute("aria-hidden", "true");

    const fuss = el("span", "tile-foot");
    if (m) fuss.append(el("span", `marker ${m.klasse}`, String(m.nummer)));
    const num = el("span", "tile-num");
    // ⋯ nur als Hinweis – die ganze Kachel öffnet das Seitenmenü.
    const mehr = el("span", "icon-btn ed-mehr");
    mehr.setAttribute("aria-hidden", "true");
    mehr.append(icon("mehr", 20, 3));
    fuss.append(num, mehr);

    k.append(rahmen, haken, rot, einfuegen, fuss);

    const t = { s, k, seite, num, rotText, winkel: s.drehung, gross: spalten === 1 };
    teile.set(s.id, t);
    zeigeDrehung(t);
    beobachter.beobachte(seite, s.datei, s.nr, t.gross ? "gross" : "klein");
    return k;
  }

  function zeigeDrehung(t) {
    t.seite.style.setProperty("--grad", `${t.winkel}deg`);
    t.seite.classList.toggle("ist-quer", t.s.drehung % 180 !== 0);
    t.k.classList.toggle("ist-gedreht", t.s.drehung !== 0);
    t.rotText.textContent = `${t.s.drehung}°`;
  }

  // Texte, Zustände und Zähler an die aktuelle Reihenfolge anpassen.
  function aktualisiere() {
    const n = o.seiten.length;
    o.seiten.forEach((s, i) => {
      const t = teile.get(s.id);
      const pos = i + 1;
      const name = s.datei.file.name;
      const an = auswahl.has(s.id);
      t.num.textContent = zusammen && spalten === 1 ? `Seite ${pos} · ${name}` : `Seite ${pos}`;
      t.k.classList.toggle("is-selected", an && modus !== "normal");

      let label = `Seite ${pos} von ${n}`;
      if (zusammen) label += `, aus ${name}`;
      if (s.drehung) label += `, gedreht um ${s.drehung}°`;
      if (modus === "ziel") label = an ? `${label}, wird verschoben` : `Vor Seite ${pos} einfügen`;
      t.k.setAttribute("aria-label", label);
      if (modus === "auswahl") t.k.setAttribute("aria-pressed", String(an));
      else t.k.removeAttribute("aria-pressed");
      if (modus === "normal") t.k.setAttribute("aria-describedby", "ed-hilfe");
      else t.k.removeAttribute("aria-describedby");
      if (modus === "ziel" && an) t.k.setAttribute("aria-disabled", "true");
      else t.k.removeAttribute("aria-disabled");
    });

    zahl.textContent = zusammen ? seitenText(n) : `${o.dateien[0].file.name} · ${seitenText(n)}`;
    zahl.title = zusammen ? "" : o.dateien[0].file.name;
    if (zusammen) zeigeLegende();
    zeigeFuss();

    if (modus === "auswahl") {
      auswahlTitel.textContent = `${auswahl.size} ausgewählt`;
      alleKnopf.textContent = auswahl.size === n ? "Keine" : "Alle";
      const keine = auswahl.size === 0;
      verschiebenK.disabled = keine || auswahl.size === n;
      drehenK.disabled = keine;
      loeschenK.disabled = keine;
    }
  }

  // Fußleiste am PC: "8 Seiten aus 5 Dateien" bzw. beim Ziehen von Dateien der Hinweis.
  function zeigeFuss() {
    const n = o.seiten.length;
    const dateien = new Set(o.seiten.map((s) => s.datei)).size;
    if (ablageAn) fussText.textContent = "Loslassen zum Hinzufügen – die Seiten kommen ans Ende.";
    else if (zusammen) fussText.textContent = `${seitenText(n)} aus ${dateien === 1 ? "1 Datei" : `${dateien} Dateien`}`;
    else fussText.textContent = `${o.dateien[0].file.name} · ${seitenText(n)}`;
    fussText.classList.toggle("t-accent", ablageAn);
  }

  // Legende: nur Dateien, von denen noch Seiten übrig sind.
  function zeigeLegende() {
    const benutzt = new Set(o.seiten.map((s) => s.datei));
    legende.replaceChildren(...o.dateien.filter((d) => benutzt.has(d)).map((d) => {
      const m = markeVon(o, d);
      const eintrag = el("span");
      eintrag.title = d.file.name;
      eintrag.append(el("i", `marker ${m.klasse}`, String(m.nummer)), el("span", "ed-legende-name", kurzerName(d.file.name)));
      return eintrag;
    }));
  }

  // --- Ansicht 2 Spalten / 1 Spalte ---

  function setzeSpalten(n, anfang = false) {
    // Die oberste sichtbare Seite soll nach dem Umschalten an derselben Stelle stehen.
    const b = anfang ? null : body();
    const oben = b && o.seiten.map((s) => teile.get(s.id).k)
      .find((k) => k.getBoundingClientRect().bottom > b.getBoundingClientRect().top);
    const obenVorher = oben && oben.getBoundingClientRect().top;
    spalten = n;
    if (!anfang) merkeSpalten(n);
    raster.classList.toggle("ist-eine-spalte", n === 1);
    for (const [knopf, an] of [[zwei, n === 2], [eine, n === 1]]) {
      knopf.classList.toggle("is-on", an);
      knopf.setAttribute("aria-pressed", String(an));
    }
    if (n === 1) {
      for (const t of teile.values()) {
        if (t.gross) continue;
        t.gross = true;
        beobachter.beobachte(t.seite, t.s.datei, t.s.nr, "gross");
      }
    }
    if (anfang) return;
    aktualisiere();
    spieleAb(raster, "in-fade");
    if (oben) b.scrollTop += oben.getBoundingClientRect().top - obenVorher;
  }

  // --- Modi: normal · Auswahl · Ziel (Verschieben) ---

  function setzeModus(neuerModus) {
    modus = neuerModus;
    if (modus === "normal") auswahl.clear();
    raster.classList.toggle("ist-normal", modus === "normal");
    raster.classList.toggle("ist-auswahl", modus !== "normal");
    raster.classList.toggle("ist-ziel", modus === "ziel");
    legende.hidden = modus !== "normal";
    leiste.hidden = modus !== "normal";
    ende.hidden = modus !== "ziel";
    if (modus === "normal") {
      ctx.setzeKopf(null);
      ctx.setzeDock([fussText, weiterKnopf]);
    } else if (modus === "auswahl") {
      ctx.setzeKopf(auswahlKopf);
      ctx.setzeDock(selbar);
    } else {
      const n = auswahl.size;
      zielHinweis.textContent = `${maus.matches ? "Klicke" : "Tippe"} auf „Hier einfügen“ – ${n === 1 ? "die Seite kommt" : `die ${n} Seiten kommen`} dorthin.`;
      ctx.setzeKopf(zielKopf);
      ctx.setzeDock(zielHinweis);
    }
    aktualisiere();
  }

  function schalteAuswahl(s) {
    if (auswahl.has(s.id)) auswahl.delete(s.id);
    else {
      auswahl.add(s.id);
      ctx.geaendert();
    }
    aktualisiere();
  }

  function starteAuswahl(s) {
    try { navigator.vibrate?.(10); } catch {}
    setzeModus("auswahl");
    schalteAuswahl(s);
  }

  // Zurück (Pfeil fehlt im Modus, aber Browser/Android-Geste): erst den Modus verlassen.
  ctx.beiZurueck(() => {
    if (zug) { lege(true); return true; }
    if (tasten) { legeTaste(true); return true; }
    if (modus === "ziel") { setzeModus("auswahl"); return true; }
    if (modus === "auswahl") { setzeModus("normal"); return true; }
    return false;
  });

  // --- Reihenfolge ändern ---

  // Kacheln, die sich durch aendern() verschieben, gleiten an ihren neuen Platz (FLIP).
  function gleite(aendern, ohne = null) {
    if (wenigBewegung()) {
      aendern();
      return;
    }
    const kacheln = [...raster.children].filter((k) => !k.hidden && k !== ohne);
    const vorher = new Map(kacheln.map((k) => [k, k.getBoundingClientRect()]));
    for (const k of kacheln) laufend.get(k)?.cancel();
    aendern();
    const hoehe = window.innerHeight;
    let n = 0;
    for (const [k, r] of vorher) {
      if (!k.isConnected || k.hidden) continue;
      const jetzt = k.getBoundingClientRect();
      const dx = r.left - jetzt.left;
      const dy = r.top - jetzt.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      // Außerhalb des Bildschirms nicht animieren (lange PDFs).
      if ((r.bottom < -100 && jetzt.bottom < -100) || (r.top > hoehe + 100 && jetzt.top > hoehe + 100)) continue;
      laufend.set(k, k.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { ...NACHRUTSCHEN, delay: Math.min(n++, 4) * 40, fill: "backwards" },
      ));
    }
  }

  // DOM-Reihenfolge der Kacheln an o.seiten anpassen (gelöschte entfernen).
  function ordneDom() {
    const soll = o.seiten.map((s) => teile.get(s.id).k);
    const bleibt = new Set(soll);
    for (const k of raster.querySelectorAll(".ed-kachel")) if (!bleibt.has(k)) k.remove();
    soll.forEach((k, i) => {
      if (raster.children[i] !== k) raster.insertBefore(k, raster.children[i] || ende);
    });
  }

  function ordne(reihenfolge) {
    gleite(() => {
      o.seiten = reihenfolge;
      ordneDom();
    });
    ctx.geaendert();
    aktualisiere();
  }

  function verschiebeNach(s, ziel) {
    const rest = o.seiten.filter((x) => x !== s);
    rest.splice(ziel, 0, s);
    ordne(rest);
    ansage(`Seite ist jetzt an Position ${ziel + 1} von ${rest.length}.`);
  }

  // Auswahl verschieben: vor die Seite vor (oder ans Ende, wenn null).
  function fuegeEin(vor) {
    const sel = gewaehlte();
    if (!sel.length) return;
    const rest = o.seiten.filter((s) => !auswahl.has(s.id));
    rest.splice(vor ? rest.indexOf(vor) : rest.length, 0, ...sel);
    ordne(rest);
    setzeModus("normal");
    const erste = teile.get(sel[0].id).k;
    erste.focus({ preventScroll: true });
    erste.scrollIntoView({ block: "nearest", behavior: wenigBewegung() ? "auto" : "smooth" });
    ansage(`${sel.length === 1 ? "Seite" : `${sel.length} Seiten`} verschoben, jetzt ab Position ${o.seiten.indexOf(sel[0]) + 1}.`);
  }

  function drehe(liste) {
    if (!liste.length) return;
    for (const s of liste) {
      s.drehung = (s.drehung + 90) % 360;
      const t = teile.get(s.id);
      t.winkel += 90;
      zeigeDrehung(t);
    }
    ctx.geaendert();
    aktualisiere();
    ansage(liste.length === 1 ? `Seite gedreht, jetzt ${liste[0].drehung}°.` : `${liste.length} Seiten gedreht.`);
  }

  // Löschen ohne Rückfrage, dafür mit "Rückgängig" (5 s).
  function loesche(liste) {
    if (!liste.length) return;
    if (liste.length >= o.seiten.length) {
      zeigeToast("Mindestens eine Seite muss bleiben.");
      return;
    }
    const plaetze = liste.map((s) => ({ s, index: o.seiten.indexOf(s) }));
    const weg = new Set(liste);
    const naechste = o.seiten.slice(plaetze[0].index).find((s) => !weg.has(s))
      || o.seiten.slice(0, plaetze[0].index).reverse().find((s) => !weg.has(s));
    gleite(() => {
      o.seiten = o.seiten.filter((s) => !weg.has(s));
      ordneDom();
    });
    ctx.geaendert();
    if (modus !== "normal") setzeModus("normal");
    else aktualisiere();
    if (naechste) teile.get(naechste.id).k.focus({ preventScroll: true });
    rueckgaengig = zeigeToast(liste.length === 1 ? "Seite gelöscht" : `${liste.length} Seiten gelöscht`, {
      iconName: "loeschen", aktion: "Rückgängig", beiAktion: () => stelleWiederHer(plaetze),
    });
  }

  function stelleWiederHer(plaetze) {
    if (ctx.signal.aborted) return;
    const reihenfolge = [...o.seiten];
    for (const { s, index } of plaetze) reihenfolge.splice(Math.min(index, reihenfolge.length), 0, s);
    gleite(() => {
      o.seiten = reihenfolge;
      ordneDom();
    });
    for (const { s } of plaetze) {
      const t = teile.get(s.id);
      if (!wenigBewegung()) spieleAb(t.k, "in-page");
      // Bilder, die ankamen, während die Seite gelöscht war, erneut anmelden
      // (schon fertige kommen sofort aus dem Cache).
      beobachter.beobachte(t.seite, s.datei, s.nr, t.gross ? "gross" : "klein");
    }
    aktualisiere();
    teile.get(plaetze[0].s.id).k.focus({ preventScroll: true });
    ansage(plaetze.length === 1 ? "Seite wiederhergestellt." : `${plaetze.length} Seiten wiederhergestellt.`);
  }

  // --- Antippen & Seitenmenü ---

  function tippe(t) {
    if (modus === "normal") oeffneMenue(t);
    else if (modus === "auswahl") schalteAuswahl(t.s);
    else if (!auswahl.has(t.s.id)) fuegeEin(t.s);
  }

  const sperreKlick = () => { klickSperreBis = performance.now() + 400; };

  raster.addEventListener("click", (e) => {
    if (nachAbbruch) {
      nachAbbruch = false;
      return;
    }
    if (performance.now() < klickSperreBis) return;
    const k = e.target.closest(".ed-kachel");
    if (k) tippe(teil(k));
  });

  function oeffneMenue(t) {
    const { s, k } = t;
    const i = o.seiten.indexOf(s);
    const n = o.seiten.length;
    let sheet = null;

    const zeile = (iconName, text, aktion, { gefahr, aus, grund } = {}) => {
      const b = el("button", `mrow compact${gefahr ? " danger" : ""}`);
      b.type = "button";
      const ic = el("span", "mrow-ic");
      ic.append(icon(iconName, 22, 1.9));
      const tx = el("span", "mrow-tx");
      tx.append(el("span", "mrow-t", text));
      if (grund) {
        const warum = el("span", "mrow-why");
        warum.append(icon("info", 15, 2), el("span", null, grund));
        tx.append(warum);
      }
      b.append(ic, tx);
      if (aus || grund) {
        b.classList.add("is-disabled");
        b.setAttribute("aria-disabled", "true");
      } else {
        b.addEventListener("click", aktion);
      }
      return b;
    };

    const nav = el("nav", "fk-stack ed-menue");
    nav.setAttribute("aria-label", "Seitenaktionen");
    const trenner = el("div", "sep");
    trenner.setAttribute("aria-hidden", "true");
    nav.append(
      zeile("lupe", "Seite groß ansehen", () => {
        sheet.schliessen();
        zeigeVollbild({
          seiten: o.seiten, start: o.seiten.indexOf(s), ausloeser: k,
          marke: zusammen ? (x) => markeVon(o, x.datei) : null,
        });
      }),
      zeile("drehen", "Drehen", () => { drehe([s]); sheet.schliessen(); }),
      zeile("an-den-anfang", "An den Anfang", () => { verschiebeNach(s, 0); sheet.schliessen(); }, { aus: i === 0 }),
      zeile("ans-ende", "Ans Ende", () => { verschiebeNach(s, n - 1); sheet.schliessen(); }, { aus: i === n - 1 }),
      trenner,
      zeile("loeschen", "Löschen", () => { sheet.schliessen(); loesche([s]); }, {
        gefahr: true, grund: n === 1 ? "Mindestens eine Seite muss bleiben" : null,
      }),
    );

    // Kopf: Miniatur + "Seite 3" + Herkunft
    const bild = el("span", "ed-kopfbild seite-rahmen");
    bild.setAttribute("aria-hidden", "true");
    const mini = t.seite.cloneNode(true);
    mini.style.transition = "none";
    bild.append(mini);
    let unterzeile;
    if (zusammen) {
      const m = markeVon(o, s.datei);
      unterzeile = [el("span", `marker marker-klein ${m.klasse}`, String(m.nummer)), `aus ${kurzerName(s.datei.file.name)}`];
    } else {
      unterzeile = `ursprünglich Seite ${s.nr}`;
    }

    k.classList.add("ist-offen");
    sheet = oeffneSheet({
      titel: `Seite ${i + 1}`, kleinerTitel: true, unterzeile, kopfBild: bild, inhalt: nav, ausloeser: k,
      beiSchliessen: () => k.classList.remove("ist-offen"),
    });
  }

  // --- Tastatur ---

  const PFEILE = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: "hoch", ArrowDown: "runter" };

  function schrittWeite(taste) {
    const p = PFEILE[taste];
    if (p === "hoch") return -spaltenJetzt();
    if (p === "runter") return spaltenJetzt();
    return p;
  }

  raster.addEventListener("keydown", (e) => {
    const k = e.target;
    if (!k.classList || !k.classList.contains("ed-kachel")) return;
    const t = teil(k);
    const weite = schrittWeite(e.key);

    if (tasten) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); legeTaste(false); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); legeTaste(true); }
      else if (weite) { e.preventDefault(); bewegeTaste(weite); }
      else if (e.key === "Tab") legeTaste(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      tippe(t);
    } else if (e.key === " ") {
      e.preventDefault();
      if (modus === "normal") hebeTaste(t);
      else tippe(t);
    } else if (weite) {
      // Pfeiltasten wandern von Kachel zu Kachel.
      e.preventDefault();
      const i = o.seiten.indexOf(t.s) + weite;
      const ziel = o.seiten[Math.max(0, Math.min(o.seiten.length - 1, i))];
      teile.get(ziel.id).k.focus();
    }
  });

  function hebeTaste(t) {
    tasten = { t, vorher: [...o.seiten] };
    t.k.classList.add("ist-angehoben");
    const pos = o.seiten.indexOf(t.s) + 1;
    ansage(`Seite ${pos} angehoben. Pfeiltasten verschieben, Leertaste legt ab, Escape bricht ab.`);
  }

  function bewegeTaste(weite) {
    const { s, k } = tasten.t;
    const i = o.seiten.indexOf(s);
    const ziel = Math.max(0, Math.min(o.seiten.length - 1, i + weite));
    if (ziel === i) return;
    const rest = o.seiten.filter((x) => x !== s);
    rest.splice(ziel, 0, s);
    gleite(() => {
      o.seiten = rest;
      ordneDom();
    });
    aktualisiere();
    k.focus({ preventScroll: true });
    k.scrollIntoView({ block: "nearest" });
    ansage(`Position ${ziel + 1} von ${o.seiten.length}`);
  }

  function legeTaste(abbruch) {
    const { t, vorher } = tasten;
    tasten = null;
    t.k.classList.remove("ist-angehoben");
    if (abbruch) {
      gleite(() => {
        o.seiten = vorher;
        ordneDom();
      });
      aktualisiere();
      ansage("Verschieben abgebrochen.");
    } else {
      if (vorher.some((s, i) => o.seiten[i] !== s)) ctx.geaendert();
      ansage(`Seite abgelegt an Position ${o.seiten.indexOf(t.s) + 1}.`);
    }
    t.k.focus({ preventScroll: true });
  }

  // --- Ziehen mit Finger oder Maus (Pointer Events) ---

  raster.addEventListener("pointerdown", (e) => {
    nachAbbruch = false;
    if (modus !== "normal" || tasten || zug || !e.isPrimary || e.button !== 0) return;
    const k = e.target.closest(".ed-kachel");
    if (!k) return;
    zug = {
      t: teil(k), id: e.pointerId, typ: e.pointerType, phase: "wartet", bewegt: false,
      x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(),
    };
    if (zug.typ !== "mouse") zug.timer = setTimeout(hebe, HEBEN_MS);
    try { k.setPointerCapture(e.pointerId); } catch {}
  });

  raster.addEventListener("pointermove", (e) => {
    if (!zug || e.pointerId !== zug.id) return;
    zug.x = e.clientX;
    zug.y = e.clientY;
    const weit = Math.hypot(zug.x - zug.x0, zug.y - zug.y0);
    if (zug.phase === "wartet") {
      if (zug.typ === "mouse") {
        if (weit > MAUS_SCHWELLE) hebe();
      } else if (weit > TOUCH_SCHWELLE) {
        endeZug(); // der Finger scrollt die Seite
        return;
      }
    }
    if (zug && zug.phase === "zieht") {
      if (weit > MAUS_SCHWELLE) zug.bewegt = true;
      folge();
    }
  });

  raster.addEventListener("pointerup", (e) => {
    if (!zug || e.pointerId !== zug.id) return;
    const lange = performance.now() - zug.t0 > AUSWAHL_MS;
    const { t, phase, bewegt } = zug;
    if (phase === "wartet") {
      endeZug();
      if (lange) {
        sperreKlick();
        starteAuswahl(t.s);
      }
      return;
    }
    sperreKlick();
    lege(false);
    if (!bewegt && lange) starteAuswahl(t.s);
  });

  raster.addEventListener("pointercancel", (e) => {
    if (!zug || e.pointerId !== zug.id) return;
    if (zug.phase === "zieht") lege(true);
    else endeZug();
  });

  // Während eine Seite gezogen wird, darf der Finger nicht scrollen.
  raster.addEventListener("touchmove", (e) => {
    if (zug && zug.phase === "zieht") e.preventDefault();
  }, { passive: false });
  raster.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".ed-kachel")) e.preventDefault();
  });

  function endeZug() {
    if (!zug) return;
    clearTimeout(zug.timer);
    document.removeEventListener("keydown", escBeimZiehen, true);
    try { zug.t.k.releasePointerCapture(zug.id); } catch {}
    zug = null;
  }

  // Esc bricht das Ziehen ab: Die Seite kehrt an ihren Platz zurück.
  function escBeimZiehen(e) {
    if (e.key !== "Escape" || !zug || zug.phase !== "zieht") return;
    e.preventDefault();
    e.stopPropagation();
    lege(true);
    nachAbbruch = true; // der Klick beim Loslassen öffnet kein Seitenmenü
  }

  // Seite anheben: Platzhalter an ihre Stelle, die Kachel folgt dem Zeiger.
  // Handy: Der Platzhalter wandert mit, die anderen Kacheln rutschen nach.
  // PC: Platzhalter und Kacheln bleiben stehen, eine Einfüge-Linie zeigt das Ziel.
  function hebe() {
    if (!zug || zug.phase !== "wartet") return;
    clearTimeout(zug.timer);
    const { k } = zug.t;
    const r = k.getBoundingClientRect();
    laufend.get(k)?.cancel();
    zug.phase = "zieht";
    zug.dx = zug.x - r.left;
    zug.dy = zug.y - r.top;
    zug.ziel = zug.start = o.seiten.indexOf(zug.t.s);
    zug.platz = el("div", "tile-slot ed-platz");
    zug.platz.setAttribute("aria-hidden", "true");
    k.before(zug.platz);
    if (breit.matches) {
      zug.linie = el("span", "ed-linie");
      zug.linie.setAttribute("aria-hidden", "true");
      zug.linie.hidden = true;
      raster.append(zug.linie);
      // Kleiner und leicht durchscheinend (Referenz 21b), zum Zeiger hin verkleinert.
      k.classList.add("ist-pc-zug");
      k.style.transformOrigin = `${zug.dx}px ${zug.dy}px`;
    }
    Object.assign(k.style, {
      position: "fixed", left: `${r.left}px`, top: `${r.top}px`,
      width: `${r.width}px`, height: `${r.height}px`, margin: "0", zIndex: "20",
    });
    k.classList.add("is-dragging");
    document.addEventListener("keydown", escBeimZiehen, true);
    try { navigator.vibrate?.(10); } catch {}
    zug.raf = requestAnimationFrame(rolle);
  }

  function folge() {
    const { k } = zug.t;
    k.style.left = `${zug.x - zug.dx}px`;
    k.style.top = `${zug.y - zug.dy}px`;
    pruefeZiel();
  }

  // Wohin käme die Seite, wenn man jetzt losließe? Platzhalter (Handy) bzw.
  // Einfüge-Linie (PC) dorthin.
  function pruefeZiel() {
    const andere = o.seiten.filter((s) => s !== zug.t.s).map((s) => teile.get(s.id).k);
    const r = raster.getBoundingClientRect();
    const px = zug.x - r.left;
    const py = zug.y - r.top;
    const eineSpalte = spaltenJetzt() === 1;
    let ziel = 0;
    for (const k of andere) {
      const links = k.offsetLeft;
      const oben = k.offsetTop;
      const danach = eineSpalte
        ? py > oben + k.offsetHeight / 2
        : py > oben + k.offsetHeight || (py >= oben && px > links + k.offsetWidth / 2);
      if (danach) ziel++;
    }
    if (zug.linie) {
      zug.ziel = ziel;
      zeigeLinie(andere, ziel, py, eineSpalte);
      return;
    }
    if (ziel === zug.ziel) return;
    zug.ziel = ziel;
    gleite(() => raster.insertBefore(zug.platz, andere[ziel] || ende), zug.t.k);
  }

  // Einfüge-Linie in die Lücke vor andere[ziel] setzen. Steht der Zeiger noch
  // in der Reihe der vorigen Seite, sitzt sie rechts neben ihr (Reihenende).
  // Am alten Platz (Ziel = Start) zeigt nur der Platzhalter, dass sich nichts ändert.
  function zeigeLinie(andere, ziel, py, eineSpalte) {
    const linie = zug.linie;
    if (ziel === zug.start) {
      linie.hidden = true;
      return;
    }
    const stil = getComputedStyle(raster);
    const vor = andere[ziel - 1];
    const nach = andere[ziel];
    const amEnde = vor && (!nach || (nach.offsetTop !== vor.offsetTop && py < vor.offsetTop + vor.offsetHeight));
    const k = amEnde ? vor : nach;
    let x, y, b, h;
    if (eineSpalte) {
      const luecke = parseFloat(stil.rowGap) || 0;
      x = k.offsetLeft + 10;
      y = (amEnde ? k.offsetTop + k.offsetHeight + luecke / 2 : k.offsetTop - luecke / 2) - 2;
      b = k.offsetWidth - 20;
      h = 4;
    } else {
      const luecke = parseFloat(stil.columnGap) || 0;
      x = (amEnde ? k.offsetLeft + k.offsetWidth + luecke / 2 : k.offsetLeft - luecke / 2) - 2;
      y = k.offsetTop + 10;
      b = 4;
      h = k.offsetHeight - 20;
    }
    const neuDa = linie.hidden;
    linie.hidden = false;
    if (neuDa) linie.style.transition = "none"; // erscheint am Ziel, gleitet erst danach
    linie.style.width = `${b}px`;
    linie.style.height = `${h}px`;
    linie.style.transform = `translate(${x}px, ${y}px)`;
    if (neuDa) {
      void linie.offsetWidth;
      linie.style.transition = "";
    }
  }

  // Auto-Scroll, solange die Seite am oberen/unteren Rand gehalten wird.
  function rolle() {
    if (!zug || zug.phase !== "zieht") return;
    const b = body();
    const r = b.getBoundingClientRect();
    let v = 0;
    if (zug.y < r.top + RAND) v = zug.y - (r.top + RAND);
    else if (zug.y > r.bottom - RAND) v = zug.y - (r.bottom - RAND);
    if (v) {
      const vorher = b.scrollTop;
      b.scrollTop += Math.max(-18, Math.min(18, v / 3));
      if (b.scrollTop !== vorher) pruefeZiel();
    }
    zug.raf = requestAnimationFrame(rolle);
  }

  // Ablegen (abbruch = zurück an den alten Platz).
  function lege(abbruch) {
    const { t, platz, ziel, raf, linie } = zug;
    const { k } = t;
    cancelAnimationFrame(raf);
    if (linie) linie.remove();
    const vonL = parseFloat(k.style.left);
    const vonT = parseFloat(k.style.top);
    endeZug();

    let reihenfolge = null;
    if (!abbruch) {
      reihenfolge = o.seiten.filter((s) => s !== t.s);
      reihenfolge.splice(ziel, 0, t.s);
      if (reihenfolge.every((s, i) => s === o.seiten[i])) reihenfolge = null;
    }

    const angehoben = getComputedStyle(k).transform; // scale + Drehung während des Ziehens
    const ursprung = k.style.transformOrigin;
    gleite(() => {
      k.style.transition = "none";
      k.classList.remove("is-dragging", "ist-pc-zug");
      for (const p of ["position", "left", "top", "width", "height", "margin", "zIndex", "transformOrigin"]) k.style[p] = "";
      platz.remove();
      if (reihenfolge) o.seiten = reihenfolge;
      ordneDom();
    }, k);

    // Die Kachel gleitet vom Finger an ihren Platz.
    const jetzt = k.getBoundingClientRect();
    k.style.transition = "";
    if (!wenigBewegung()) {
      const von = `translate(${vonL - jetzt.left}px, ${vonT - jetzt.top}px) ${angehoben === "none" ? "" : angehoben}`;
      k.style.transformOrigin = ursprung;
      const anim = k.animate([{ transform: von }, { transform: "none" }], { duration: 260, easing: "cubic-bezier(.2, .8, .2, 1)" });
      anim.finished.then(() => { k.style.transformOrigin = ""; }, () => { k.style.transformOrigin = ""; });
      laufend.set(k, anim);
    }

    if (reihenfolge) {
      ctx.geaendert();
      aktualisiere();
      ansage(`Seite abgelegt an Position ${o.seiten.indexOf(t.s) + 1}.`);
    }
  }

  // --- Weitere Dateien hinzufügen ---

  function zeigeNeuBereit() {
    neu.removeAttribute("aria-busy");
    neu.classList.remove("ist-beschaeftigt");
    neuPlus.replaceChildren(icon("hinzufuegen", 22, 2.2));
    neuText.textContent = "Weitere Dateien hinzufügen";
  }

  async function fuegeDateienHinzu(files) {
    if (oeffnet || !files.length) return;
    oeffnet = true;
    neu.setAttribute("aria-busy", "true");
    neu.classList.add("ist-beschaeftigt");
    const spinner = el("span", "spinner");
    neuPlus.replaceChildren(spinner);
    neuText.textContent = "Wird geöffnet …";
    weiterKnopf.disabled = true;
    ansage("Wird geöffnet …");

    const neueSeiten = [];
    const fehler = [];
    for (const f of files) {
      try {
        const d = await oeffneDatei(f);
        if (ctx.signal.aborted) {
          freigeben(d);
          continue;
        }
        o.dateien.push(d);
        ctx.beimEnde(() => freigeben(d)); // gehört nicht zur Auswahl im Startscreen
        neueSeiten.push(...seitenVon(d));
      } catch (e) {
        fehler.push(e instanceof OeffnenFehler ? e : new OeffnenFehler("beschaedigt", f));
      }
    }
    oeffnet = false;
    if (ctx.signal.aborted) return;
    zeigeNeuBereit();
    weiterKnopf.disabled = false;

    if (neueSeiten.length) {
      const kacheln = neueSeiten.map(baueKachel);
      gleite(() => {
        o.seiten.push(...neueSeiten);
        for (const k of kacheln) raster.insertBefore(k, ende);
      });
      if (!wenigBewegung()) kacheln.slice(0, 6).forEach((k) => spieleAb(k, "in-page"));
      ctx.geaendert();
      aktualisiere();
      kacheln[0].scrollIntoView({ block: "nearest", behavior: wenigBewegung() ? "auto" : "smooth" });
      ansage(`${seitenText(neueSeiten.length)} hinzugefügt.`);
    }
    meldeOeffnenFehler(fehler);
  }

  // Dateien vom Rechner in den Editor ziehen (nur beim Zusammenführen): Rahmen
  // um den Editor, die Kachel "Weitere Dateien hinzufügen" leuchtet auf.
  function zeigeAblage(an) {
    ablageAn = an;
    body()?.classList.toggle("ist-ablage", an);
    neu.classList.toggle("is-over", an);
    if (an) neuText.textContent = "Loslassen zum Hinzufügen";
    else if (!oeffnet) zeigeNeuBereit();
    zeigeFuss();
  }

  // --- Start ---

  const abmelden = zusammen
    ? meldeAblage({
        bereit: () => modus === "normal" && !zug && !tasten && !oeffnet,
        zeige: zeigeAblage,
        lege: fuegeDateienHinzu,
      })
    : () => {};

  const beiBreite = () => {
    beschrifteAnsicht();
    aktualisiere();
  };
  breit.addEventListener("change", beiBreite);

  ctx.signal.addEventListener("abort", () => {
    if (zug) endeZug();
    abmelden();
    breit.removeEventListener("change", beiBreite);
    beobachter.beende();
    if (rueckgaengig) rueckgaengig.schliessen();
  }, { once: true });

  setzeSpalten(spalten, true);
  aktualisiere();
  return { inhalt: box, dock: [fussText, weiterKnopf] };
}
