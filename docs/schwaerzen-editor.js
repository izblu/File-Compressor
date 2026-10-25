// schwaerzen-editor.js – Schritt "Stellen schwärzen" (Nachtrag Kap. 9, Screens
// S2–S8): immer eine Seite groß, die Seite selbst ist die Zeichenfläche.
//   · Ein Finger (Maus) zieht eine neue Stelle auf. Antippen wählt eine Stelle,
//     Ziehen verschiebt sie, die Eck-Griffe ändern die Größe, der Papierkorb
//     löscht (Toast "Rückgängig", keine Rückfrage). Antippen daneben wählt nur ab.
//   · PDF mit Text: Ein Wort antippen legt eine Stelle genau über das Wort (nicht
//     gewählt). Die Lupe öffnet "Text suchen und schwärzen" (S5): Die gewählten
//     Treffer werden in einem Schritt zu Stellen (S6). Ohne Textebene (Scan, S2b)
//     und bei Bildern gibt es beides nicht. Wortrahmen und Suche: textstellen.js.
//   · Zwei Finger zoomen (1×–4×) und verschieben, "Seite einpassen" führt
//     zurück auf 1×. Ohne zwei Finger: Hineinzoomen/Herauszoomen im ⋯-Menü,
//     Strg + Mausrad oder + / −.
//   · Rückgängig/Wiederholen über alle Seiten (bis 50 Schritte), springt zur
//     betroffenen Seite.
//   · ‹ › und die Seitenübersicht (S7) blättern – bewusst ohne Wischen, weil ein
//     Finger zeichnet. ⋯ = Optionen für diese Seite (S8).
//   · Tastatur (Stelle fokussiert): Pfeile verschieben, Umschalt + Pfeile ändern
//     die Größe (mit Strg in größeren Schritten), Entf löscht, Esc/Enter wählt ab.
//     Überall: Strg+Z / Strg+Y, Bild↑ / Bild↓, + / −.
//
// Stellen stehen in Prozent der angezeigten Seite ({ x, y, w, h }, 0–100). So
// bleiben sie bei Zoom, Drehung des Geräts und beim Rendern in voller
// Auflösung richtig.
//
// Zustand in ctx.optionen (bleibt bei Zurück/Weiter erhalten):
//   o.stellen – { [seite]: [{ id, x, y, w, h }] }. Wird nie verändert, sondern
//               bei jeder Änderung ersetzt – so ist jeder alte Stand ein Schnappschuss.
//   o.verlauf – { zurueck: [{ stand, seite }], vor: [...] } für Rückgängig/Wiederholen
//   o.seite   – die gezeigte Seite (1-basiert)

import { el, seitenText } from "./shared.js";
import { icon } from "./icons.js";
import { hauptKnopf } from "./wizard.js";
import { oeffneSheet, sheetIstOffen, zeigeToast, ansage, wenigBewegung } from "./ui.js";
import { seitenBild } from "./thumbs.js";
import { hatText, textBekannt, bereiteVor, woerterAuf, suche, sucheMoeglich } from "./textstellen.js";

const maus = window.matchMedia("(hover: hover) and (pointer: fine)"); // "Maus" statt "Finger"
const ZIEH_SCHWELLE = 5;    // px – ab hier zieht der Finger eine Stelle auf bzw. verschiebt sie
const MIN_B = 1;            // % – schmalere oder …
const MIN_H = 0.6;          // % – … niedrigere Rahmen waren Fehltipps
const MAX_ZOOM = 4;
const ZOOM_SCHRITT = 2;     // Hineinzoomen/Herauszoomen per Menü und + / −
const SCHARF_AB = 1.3;      // ab diesem Zoom ein schärferes Seitenbild nachholen
const MAX_SCHRITTE = 50;    // so weit reicht Rückgängig
const SCHRITT_X = 1;        // % der Breite je Pfeiltaste
const SCHRITT_Y = 0.7;      // % der Höhe je Pfeiltaste
const ZOOM_HINWEIS_KEY = "fk-hinweis-zoom";
const WORT_TOLERANZ = { finger: 12, maus: 3 }; // px – so weit daneben trifft ein Tipp noch das Wort
const SUCH_PAUSE = 200;     // ms – die Suche läuft, wenn das Tippen so lange ruht

let naechsteId = 1;

export const stellenText = (n) => (n === 1 ? "1 Stelle" : `${n} Stellen`);

const anzahlIn = (stellen) => Object.values(stellen).reduce((s, liste) => s + liste.length, 0);

// "7 Stellen auf 3 Seiten" (beim Bild nur "3 Stellen").
export function stellenSumme(stellen, bild) {
  const n = anzahlIn(stellen);
  if (!n) return "Noch keine Stelle";
  if (bild) return stellenText(n);
  const seiten = Object.values(stellen).filter((liste) => liste.length).length;
  return `${stellenText(n)} auf ${seitenText(seiten)}`;
}

const klemme = (v, min, max) => Math.max(min, Math.min(max, v));

// Liegt das Rechteck r ganz unter der Stelle s? (kleine Toleranz für Rundungen)
function deckt(s, r) {
  const t = 0.02;
  return s.x <= r.x + t && s.y <= r.y + t && s.x + s.w >= r.x + r.w - t && s.y + s.h >= r.y + r.h - t;
}

// Lesereihenfolge: oben → unten, in derselben Zeile links → rechts.
function lesefolge(a, b) {
  const dy = (a.y + a.h / 2) - (b.y + b.h / 2);
  if (Math.abs(dy) < Math.min(a.h, b.h) / 2) return a.x - b.x;
  return dy;
}

// Animation neu starten (Klasse entfernen, Reflow, wieder setzen).
function spieleAb(element, klasse) {
  element.classList.remove(klasse);
  void element.offsetWidth;
  element.classList.add(klasse);
  element.addEventListener("animationend", () => element.classList.remove(klasse), { once: true });
}

function werkzeug(iconName, label, beiKlick, strich = 1.8) {
  const b = el("button", "icon-btn");
  b.type = "button";
  b.setAttribute("aria-label", label);
  b.append(icon(iconName, 22, strich));
  b.addEventListener("click", beiKlick);
  return b;
}

function trenner(klasse) {
  const t = el("span", klasse);
  t.setAttribute("aria-hidden", "true");
  return t;
}

function zoomHinweisGesehen() {
  try { return localStorage.getItem(ZOOM_HINWEIS_KEY) === "1"; } catch { return false; }
}

function merkeZoomHinweis() {
  try { localStorage.setItem(ZOOM_HINWEIS_KEY, "1"); } catch {}
}

// --- Schritt 2: Stellen schwärzen ---

export function stellenSchritt(ctx) {
  const o = ctx.optionen;
  const d = ctx.dateien[0];
  const bild = d.art === "bild";
  const n = bild ? 1 : d.seiten;
  const mehrseitig = n > 1;
  o.stellen ??= {};
  o.verlauf ??= { zurueck: [], vor: [] };
  o.seite ??= 1;

  let gewaehlt = null;        // id der gewählten Stelle (auf der gezeigten Seite)
  let zug = null;             // Geste mit einem Finger bzw. der Maus
  let pinch = null;           // Geste mit zwei Fingern (Zoom und Verschieben)
  let blockiert = false;      // nach zwei Fingern zeichnet der letzte Finger nicht mehr
  let zoom = { z: 1, fx: 0, fy: 0 }; // fx/fy = Verschiebung als Anteil der Seitengröße (≤ 0)
  let tastenFolge = null;     // Stelle, die gerade per Tastatur bewegt wird (zählt als ein Schritt)
  let toast = null;           // Toast mit "Rückgängig"
  let ladeNr = 0;             // Seitenbilder einer längst verlassenen Seite verwerfen
  let scharf = false;         // schärferes Bild für die gezeigte Seite schon angefordert
  let zoomHinweisTimer = 0;
  const finger = new Map();   // pointerId → { x, y } aller Finger auf der Bühne
  const knoepfe = new Map();  // id → <button class="stelle">
  let auswahlUi = null;       // { id, box, weg } – Rahmen mit Griffen und Papierkorb
  let mitText = bild ? false : textBekannt(d); // Textebene: true / false / undefined = wird noch geprüft
  let versetzt = null;        // Set neuer Stellen, die nacheinander erscheinen (nach "Treffer schwärzen")

  const liste = (seite = o.seite) => o.stellen[seite] || [];
  const anzahl = () => anzahlIn(o.stellen);
  const wo = () => (bild ? " auf dem Bild" : ` auf Seite ${o.seite}`);

  // --- Aufbau ---

  const box = el("div", "fk-stack sw");
  const buehne = el("div", "sw-buehne");
  const vp = el("div", "canvas-vp");
  vp.style.setProperty("--r", d.verhaeltnis);
  const blatt = el("div", "pagewrap");
  blatt.setAttribute("role", "group");
  blatt.tabIndex = -1; // nimmt den Fokus auf, wenn die fokussierte Stelle gelöscht wird
  const seitenBildEl = el("img", "sw-bild");
  seitenBildEl.alt = "";
  seitenBildEl.draggable = false;
  const rahmen = el("div", "draw");
  rahmen.hidden = true;
  blatt.append(seitenBildEl, rahmen);

  // Hinweis-Karte: Mit Textebene lassen sich auch Wörter antippen; beim Scan
  // erklärt eine Zusatzzeile, warum die Suche fehlt (S2a / S2b / S2c).
  const hinweisKarte = el("div", "hint-ov in-fade");
  const hinweisText = el("span");
  const hinweisZusatz = el("small", null, "In diesem PDF ist kein Text hinterlegt – die Suche ist daher nicht verfügbar.");
  hinweisKarte.append(icon("schwaerzen", 26, 1.8), hinweisText, hinweisZusatz);

  function setzeHinweis() {
    const ziehen = `Ziehe mit ${maus.matches ? "der Maus" : "dem Finger"} über eine Stelle, um sie zu schwärzen.`;
    hinweisText.textContent = mitText
      ? `${ziehen} Einzelne Wörter kannst du auch ${maus.matches ? "anklicken" : "antippen"}.`
      : ziehen;
    hinweisZusatz.hidden = bild || mitText !== false;
  }
  setzeHinweis();

  const einpassen = el("button", "float-btn sw-einpassen");
  einpassen.type = "button";
  einpassen.hidden = true;
  einpassen.append(icon("einpassen", 18, 2), el("span", null, "Seite einpassen"));
  einpassen.addEventListener("click", () => setzeZoom(1, 0, 0));

  const zoomHinweis = el("div", "coach sw-zoom-hinweis");
  zoomHinweis.setAttribute("role", "status");
  zoomHinweis.hidden = true;
  zoomHinweis.append(el("p", null, "Mit zwei Fingern verschieben"));

  vp.append(blatt, hinweisKarte, einpassen, zoomHinweis);
  buehne.append(vp);

  // Werkzeugleiste: Rückgängig · Wiederholen │ ‹ · "2/12" · › │ Text suchen · ⋯
  const leiste = el("div", "tbar");
  leiste.setAttribute("role", "toolbar");
  leiste.setAttribute("aria-label", "Werkzeuge");
  const rueckK = werkzeug("rueckgaengig", "Rückgängig", rueckgaengig);
  const vorK = werkzeug("wiederholen", "Wiederholen", wiederholen);
  const vorigeK = werkzeug("zurueck", "Vorherige Seite", () => blaettere(o.seite - 1), 2);
  const naechsteK = werkzeug("weiter", "Nächste Seite", () => blaettere(o.seite + 1), 2);
  const seitenK = el("button", "pgbtn");
  seitenK.type = "button";
  seitenK.setAttribute("aria-haspopup", "dialog");
  const seitenZahl = el("span");
  seitenK.append(icon("seiten-raster", 16, 2), seitenZahl);
  seitenK.addEventListener("click", oeffneSeiten);
  const suchenK = werkzeug("suchen", "Text suchen", oeffneSuche, 1.9);
  suchenK.setAttribute("aria-haspopup", "dialog");
  suchenK.hidden = !mitText; // erst sichtbar, wenn feststeht, dass es Text gibt
  const mehrK = werkzeug("mehr", "Weitere Optionen", oeffneOptionen, 3);
  mehrK.setAttribute("aria-haspopup", "dialog");
  leiste.append(rueckK, vorK);
  if (mehrseitig) leiste.append(trenner("tsep"), vorigeK, seitenK, naechsteK);
  leiste.append(trenner("tsep"));
  if (!bild) leiste.append(suchenK);
  leiste.append(mehrK);

  box.append(buehne, leiste);

  // Dock: "Weiter" – deaktiviert, solange es keine Stelle gibt, sonst "Weiter · 7 Stellen".
  const weiterKnopf = hauptKnopf("Weiter", () => ctx.weiter());
  const weiterZahl = el("span", "sw-weiter-zahl");
  weiterKnopf.append(weiterZahl);

  // --- Seite zeigen ---

  function zeigeSeite(anim) {
    const meine = ++ladeNr;
    scharf = false;
    gewaehlt = null;
    zeigeAuswahl();
    setzeZoom(1, 0, 0, false);
    blatt.setAttribute("aria-label", bild ? "Bild" : `Seite ${o.seite} von ${n}`);
    if (bild) {
      setzeSeitenBild(d.vorschau, d.verhaeltnis);
    } else {
      // Bis das Bild da ist, bleibt das Papier weiß (keine Stellen über der falschen Seite).
      seitenBildEl.hidden = true;
      seitenBildEl.removeAttribute("src");
      const nr = o.seite;
      seitenBild(d, nr, "gross").then((b) => {
        if (meine !== ladeNr || !b) return;
        setzeSeitenBild(b.url, b.verhaeltnis);
        if (mitText) bereiteVor(d, nr, true); // Wörter fürs Antippen
        if (nr < n) seitenBild(d, nr + 1, "gross"); // nächste Seite schon vorbereiten
      });
    }
    zeichneStellen(true);
    aktualisiere();
    if (anim) spieleAb(vp, "in-fade");
  }

  function setzeSeitenBild(url, verhaeltnis) {
    vp.style.setProperty("--r", verhaeltnis);
    seitenBildEl.src = url;
    seitenBildEl.hidden = false;
  }

  // Hineingezoomt: einmal ein schärferes Seitenbild holen und ohne Aufblitzen tauschen.
  function holeScharf() {
    if (bild || scharf || zoom.z < SCHARF_AB) return;
    scharf = true;
    const meine = ladeNr;
    seitenBild(d, o.seite, "zoom").then(async (b) => {
      if (!b || meine !== ladeNr) return;
      const vorab = new Image();
      vorab.src = b.url;
      await vorab.decode().catch(() => {});
      if (meine === ladeNr) seitenBildEl.src = b.url;
    });
  }

  function blaettere(nr) {
    if (nr < 1 || nr > n || nr === o.seite) return;
    brichZugAb();
    o.seite = nr;
    zeigeSeite(true);
    ansage(`Seite ${nr} von ${n}.`);
  }

  // --- Stellen zeigen ---

  function baueStelle(id) {
    const k = el("button", "stelle");
    k.type = "button";
    k.dataset.id = String(id);
    k.addEventListener("focus", () => waehle(id));
    k.addEventListener("keydown", (e) => taste(e, id));
    return k;
  }

  function setzeLage(element, s) {
    element.style.left = `${s.x}%`;
    element.style.top = `${s.y}%`;
    element.style.width = `${s.w}%`;
    element.style.height = `${s.h}%`;
  }

  // Stellen der gezeigten Seite in Lesereihenfolge (= Tab-Reihenfolge) zeigen.
  // Vorhandene Knöpfe bleiben stehen, neue rasten ein – außer ruhig = true
  // (die Seite wird gerade erst gezeigt). Stellen aus "Treffer schwärzen"
  // erscheinen nacheinander (+60 ms je Stelle, bei "Bewegung reduzieren" alle sofort).
  function zeichneStellen(ruhig = false) {
    const sortiert = [...liste()].sort(lesefolge);
    let folge = 0;
    const bleibt = new Set(sortiert.map((s) => s.id));
    for (const [id, k] of knoepfe) {
      if (bleibt.has(id)) continue;
      k.remove();
      knoepfe.delete(id);
    }
    const fokus = document.activeElement;
    let davor = seitenBildEl;
    sortiert.forEach((s, i) => {
      let k = knoepfe.get(s.id);
      if (!k) {
        k = baueStelle(s.id);
        if (versetzt && versetzt.has(s.id)) {
          if (!wenigBewegung()) {
            k.style.animationDelay = `calc(var(--fk-d-stagger) * ${folge++})`;
            k.addEventListener("animationend", () => { k.style.animationDelay = ""; }, { once: true });
          }
        } else if (ruhig) {
          k.style.animation = "none";
        }
        knoepfe.set(s.id, k);
      }
      setzeLage(k, s);
      k.classList.toggle("is-sel", s.id === gewaehlt);
      k.setAttribute("aria-label", `Geschwärzte Stelle ${i + 1} von ${sortiert.length}${wo()}`);
      if (davor.nextSibling !== k) blatt.insertBefore(k, davor.nextSibling);
      davor = k;
    });
    // Ein umsortierter Knopf verliert den Fokus – zurückgeben.
    if (fokus && fokus.isConnected && fokus !== document.activeElement && blatt.contains(fokus)) {
      fokus.focus({ preventScroll: true });
    }
    versetzt = null;
    zeigeAuswahl();
  }

  function waehle(id, { fokus = false } = {}) {
    if (gewaehlt !== id) {
      gewaehlt = id;
      tastenFolge = null;
      for (const [i, k] of knoepfe) k.classList.toggle("is-sel", i === id);
    }
    zeigeAuswahl();
    if (fokus && id != null) knoepfe.get(id)?.focus({ preventScroll: true });
  }

  // Rahmen mit vier Eck-Griffen und Papierkorb über der gewählten Stelle. Bei
  // jeder neuen Wahl neu gebaut, damit der Papierkorb wieder aufploppt.
  function zeigeAuswahl() {
    const s = gewaehlt != null && liste().find((x) => x.id === gewaehlt);
    if (!s) {
      auswahlUi?.box.remove();
      auswahlUi = null;
      return;
    }
    if (!auswahlUi || auswahlUi.id !== s.id) {
      auswahlUi?.box.remove();
      const ui = el("div", "sel-ui");
      for (const ecke of ["tl", "tr", "bl", "br"]) {
        const griff = el("span", `hdl ${ecke}`);
        griff.dataset.ecke = ecke;
        griff.setAttribute("aria-hidden", "true");
        ui.append(griff);
      }
      const weg = el("button", "del");
      weg.type = "button";
      weg.setAttribute("aria-label", "Stelle löschen");
      weg.append(icon("loeschen", 20, 1.9));
      const id = s.id;
      weg.addEventListener("click", () => loesche(id));
      ui.append(weg);
      blatt.append(ui);
      auswahlUi = { id, box: ui, weg };
    }
    setzeLage(auswahlUi.box, s);
    // Papierkorb über der Stelle; oben zu wenig Platz → darunter, rechts → nach innen.
    auswahlUi.weg.classList.toggle("below", s.y < 12);
    auswahlUi.weg.classList.toggle("edge", s.x + s.w > 92);
  }

  // Zähler, Knöpfe und Hinweis an den Stand anpassen.
  function aktualisiere() {
    const gesamt = anzahl();
    rueckK.disabled = !o.verlauf.zurueck.length;
    vorK.disabled = !o.verlauf.vor.length;
    vorigeK.disabled = o.seite <= 1;
    naechsteK.disabled = o.seite >= n;
    seitenZahl.textContent = `${o.seite}/${n}`;
    seitenK.setAttribute("aria-label", `Seite ${o.seite} von ${n} – Seitenübersicht`);
    weiterKnopf.disabled = gesamt === 0;
    weiterZahl.textContent = gesamt ? `· ${stellenText(gesamt)}` : "";
    // Der Hinweis gilt, bis die Datei eine Stelle hat; beim Aufziehen tritt er zurück.
    hinweisKarte.hidden = gesamt > 0 || Boolean(zug && zug.art === "neu" && zug.bewegt);
  }

  // --- Ändern (jeder Schritt lässt sich rückgängig machen) ---

  // stand = o.stellen vor der Änderung, seite = wo sie passiert.
  function merke(stand = o.stellen, seite = o.seite) {
    const v = o.verlauf;
    v.zurueck.push({ stand, seite });
    if (v.zurueck.length > MAX_SCHRITTE) v.zurueck.shift();
    v.vor = [];
    tastenFolge = null;
    // "Rückgängig" im Toast meint den Schritt davor – nach einem neuen Schritt passt das nicht mehr.
    toast?.schliessen();
    toast = null;
  }

  function setzeListe(neu, seite = o.seite) {
    o.stellen = { ...o.stellen, [seite]: neu };
  }

  function nachAenderung() {
    ctx.geaendert(anzahl() > 0); // Abbrechen/Zurück fragt nur nach, solange es Stellen gibt
    zeichneStellen();
    aktualisiere();
  }

  function ersetze(s) {
    setzeListe(liste().map((x) => (x.id === s.id ? s : x)));
  }

  // rechtecke = [{ x, y, w, h }]; waehlen = die (letzte) neue Stelle wählen.
  function fuegeHinzu(rechtecke, { waehlen = false } = {}) {
    merke();
    const neu = rechtecke.map((r) => ({ id: naechsteId++, x: r.x, y: r.y, w: r.w, h: r.h }));
    setzeListe([...liste(), ...neu]);
    if (waehlen) gewaehlt = neu.at(-1).id;
    nachAenderung();
    if (waehlen) knoepfe.get(gewaehlt)?.focus({ preventScroll: true });
    ansage(`Stelle hinzugefügt. ${stellenText(liste().length)}${wo()}.`);
  }

  // "Stelle hinzufügen" (S8): 60 % × 4 % mitten in den sichtbaren Ausschnitt,
  // gewählt – zum Anpassen mit Griffen oder Tastatur.
  function fuegeMitteHinzu() {
    const breite = 60 / zoom.z;
    const hoehe = 4 / zoom.z;
    const mx = (-zoom.fx * 100 + 50) / zoom.z;
    const my = (-zoom.fy * 100 + 50) / zoom.z;
    fuegeHinzu([{
      x: klemme(mx - breite / 2, 0, 100 - breite), y: klemme(my - hoehe / 2, 0, 100 - hoehe), w: breite, h: hoehe,
    }], { waehlen: true });
  }

  // Löschen ohne Rückfrage, mit Toast "Rückgängig". fokusWeiter = per Tastatur
  // gelöscht → die nächste Stelle bekommt den Fokus.
  function loesche(id, { fokusWeiter = false } = {}) {
    const k = knoepfe.get(id);
    if (!k || k.classList.contains("is-out")) return;
    const seite = o.seite;
    const sortiert = [...liste()].sort(lesefolge);
    const i = sortiert.findIndex((s) => s.id === id);
    const naechste = sortiert[i + 1] || sortiert[i - 1];
    if (gewaehlt === id) waehle(null);

    const weg = () => {
      if (ctx.signal.aborted || !liste(seite).some((s) => s.id === id)) return;
      merke(o.stellen, seite);
      setzeListe(liste(seite).filter((s) => s.id !== id), seite);
      nachAenderung();
      const ziel = fokusWeiter && naechste && knoepfe.get(naechste.id);
      if (ziel) ziel.focus({ preventScroll: true });
      else if (!blatt.contains(document.activeElement) || document.activeElement === document.body) blatt.focus({ preventScroll: true });
      toast = zeigeToast("Stelle gelöscht", { iconName: "loeschen", aktion: "Rückgängig", beiAktion: rueckgaengig });
      ansage("Stelle gelöscht.");
    };
    if (wenigBewegung()) {
      weg();
    } else {
      k.classList.add("is-out"); // blendet aus (160 ms), dann weg
      setTimeout(weg, 160);
    }
  }

  function loescheSeite() {
    const zahl = liste().length;
    if (!zahl) return;
    merke();
    setzeListe([]);
    gewaehlt = null;
    nachAenderung();
    const text = zahl === 1 ? "Stelle gelöscht" : `${zahl} Stellen gelöscht`;
    toast = zeigeToast(text, { iconName: "loeschen", aktion: "Rückgängig", beiAktion: rueckgaengig });
    ansage(`${text}.`);
  }

  function rueckgaengig() {
    const schritt = o.verlauf.zurueck.pop();
    if (!schritt) return;
    o.verlauf.vor.push({ stand: o.stellen, seite: schritt.seite });
    stelleHer(schritt, "Rückgängig gemacht.");
  }

  function wiederholen() {
    const schritt = o.verlauf.vor.pop();
    if (!schritt) return;
    o.verlauf.zurueck.push({ stand: o.stellen, seite: schritt.seite });
    stelleHer(schritt, "Wiederholt.");
  }

  // Einen Stand wiederherstellen und dorthin blättern, wo er sich geändert hat.
  function stelleHer({ stand, seite }, text) {
    brichZugAb();
    tastenFolge = null;
    toast?.schliessen();
    toast = null;
    o.stellen = stand;
    ctx.geaendert(anzahl() > 0);
    if (seite !== o.seite) {
      o.seite = seite;
      zeigeSeite(true);
      ansage(`${text} Seite ${seite} von ${n}.`);
    } else {
      gewaehlt = null;
      zeichneStellen();
      aktualisiere();
      ansage(text);
    }
  }

  // --- Zoom ---

  // tx/ty = Verschiebung in px. Die Seite deckt den Ausschnitt immer ganz ab.
  function setzeZoom(z, tx, ty, animiert = true) {
    const { width: b, height: h } = vp.getBoundingClientRect();
    z = klemme(z, 1, MAX_ZOOM);
    if (z < 1.02) z = 1;
    const x = klemme(tx, b * (1 - z), 0);
    const y = klemme(ty, h * (1 - z), 0);
    zoom = { z, fx: b ? x / b : 0, fy: h ? y / h : 0 };
    blatt.style.transition = animiert ? "" : "none";
    wendeZoomAn();
  }

  // Zoomen um einen Punkt im Ausschnitt (px; ohne Angabe: die Mitte) – er bleibt stehen.
  function zoomeUm(z, mx, my, animiert = true) {
    const { width: b, height: h } = vp.getBoundingClientRect();
    const px = mx ?? b / 2;
    const py = my ?? h / 2;
    const sx = (px - zoom.fx * b) / zoom.z; // Punkt auf der Seite (bei 1×)
    const sy = (py - zoom.fy * h) / zoom.z;
    const neu = klemme(z, 1, MAX_ZOOM);
    setzeZoom(neu, px - sx * neu, py - sy * neu, animiert);
  }

  function wendeZoomAn() {
    const { width: b, height: h } = vp.getBoundingClientRect();
    blatt.style.transform = `translate(${zoom.fx * b}px, ${zoom.fy * h}px) scale(${zoom.z})`;
    blatt.style.setProperty("--z", zoom.z); // Griffe und Papierkorb behalten ihre Größe
    const an = zoom.z > 1;
    if (einpassen.hidden === an) {
      einpassen.hidden = !an;
      if (an) spieleAb(einpassen, "in-fade");
    }
    if (an) {
      zeigeZoomHinweis();
      holeScharf();
    } else {
      zoomHinweis.hidden = true;
    }
  }

  // Beim ersten Hineinzoomen (Touch) einmalig: "Mit zwei Fingern verschieben".
  function zeigeZoomHinweis() {
    if (maus.matches || zoomHinweisGesehen()) return;
    merkeZoomHinweis();
    zoomHinweis.hidden = false;
    clearTimeout(zoomHinweisTimer);
    zoomHinweisTimer = setTimeout(() => { zoomHinweis.hidden = true; }, 4000);
  }

  function starteZoomGeste() {
    const [a, b] = [...finger.values()];
    const r = vp.getBoundingClientRect();
    pinch = {
      abstand: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      mitte: { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top },
      z: zoom.z, tx: zoom.fx * r.width, ty: zoom.fy * r.height,
    };
    blockiert = true;
  }

  // Die Seite folgt den Fingern ohne Übergang: Der Punkt, der anfangs zwischen
  // ihnen lag, bleibt zwischen ihnen.
  function folgeZoomGeste() {
    const [a, b] = [...finger.values()];
    const r = vp.getBoundingClientRect();
    const z = klemme(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.abstand, 1, MAX_ZOOM);
    const sx = (pinch.mitte.x - pinch.tx) / pinch.z;
    const sy = (pinch.mitte.y - pinch.ty) / pinch.z;
    const mx = (a.x + b.x) / 2 - r.left;
    const my = (a.y + b.y) / 2 - r.top;
    setzeZoom(z, mx - sx * z, my - sy * z, false);
  }

  // --- Zeigen, Ziehen, Zoomen (Pointer Events auf der ganzen Bühne) ---

  // Lage des Zeigers in % der Seite (die Seite kann gezoomt sein).
  function punkt(e) {
    const r = blatt.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  }

  buehne.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".del, .float-btn")) return; // eigene Knöpfe
    if (e.pointerType === "mouse" && e.button !== 0) return;
    finger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { buehne.setPointerCapture(e.pointerId); } catch {}
    if (finger.size === 2) {
      brichZugAb();
      starteZoomGeste();
      return;
    }
    if (finger.size > 2 || blockiert || zug) return;
    if (!e.target.closest(".pagewrap")) return; // neben der Seite: nur zwei Finger
    e.preventDefault(); // kein Markieren, kein Fokuswechsel durch die Maus
    const p = punkt(e);
    const basis = { id: e.pointerId, x0: e.clientX, y0: e.clientY, p0: p, bewegt: false, vorher: o.stellen };
    const griff = e.target.closest(".hdl");
    const stelle = e.target.closest(".stelle");
    if (griff && gewaehlt != null) {
      zug = { ...basis, art: "groesse", ecke: griff.dataset.ecke, s: liste().find((x) => x.id === gewaehlt) };
    } else if (stelle) {
      const id = Number(stelle.dataset.id);
      zug = { ...basis, art: "schiebe", s: liste().find((x) => x.id === id) };
      waehle(id, { fokus: true });
    } else {
      zug = { ...basis, art: "neu" };
    }
  });

  buehne.addEventListener("pointermove", (e) => {
    if (!finger.has(e.pointerId)) return;
    finger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch) {
      if (finger.size >= 2) folgeZoomGeste();
      return;
    }
    if (!zug || e.pointerId !== zug.id) return;
    if (!zug.bewegt) {
      if (Math.hypot(e.clientX - zug.x0, e.clientY - zug.y0) < ZIEH_SCHWELLE) return;
      zug.bewegt = true;
      if (zug.art === "neu") {
        if (gewaehlt != null) waehle(null);
        rahmen.hidden = false;
        hinweisKarte.hidden = true;
      } else {
        blatt.classList.add("ist-ziehen");
      }
    }
    const p = punkt(e);
    const dx = p.x - zug.p0.x;
    const dy = p.y - zug.p0.y;

    if (zug.art === "neu") {
      const x = klemme(Math.min(p.x, zug.p0.x), 0, 100);
      const y = klemme(Math.min(p.y, zug.p0.y), 0, 100);
      zug.r = { x, y, w: Math.min(Math.abs(dx), 100 - x), h: Math.min(Math.abs(dy), 100 - y) };
      setzeLage(rahmen, zug.r);
      return;
    }
    const s = zug.s;
    let neu;
    if (zug.art === "schiebe") {
      neu = { ...s, x: klemme(s.x + dx, 0, 100 - s.w), y: klemme(s.y + dy, 0, 100 - s.h) };
    } else {
      let x1 = s.x, y1 = s.y, x2 = s.x + s.w, y2 = s.y + s.h;
      if (zug.ecke.includes("l")) x1 = klemme(s.x + dx, 0, x2 - MIN_B);
      if (zug.ecke.includes("r")) x2 = klemme(x2 + dx, x1 + MIN_B, 100);
      if (zug.ecke.includes("t")) y1 = klemme(s.y + dy, 0, y2 - MIN_H);
      if (zug.ecke.includes("b")) y2 = klemme(y2 + dy, y1 + MIN_H, 100);
      neu = { ...s, x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    ersetze(neu);
    setzeLage(knoepfe.get(s.id), neu);
    zeigeAuswahl();
  });

  function loslassen(e, abbruch) {
    if (!finger.delete(e.pointerId)) return;
    if (pinch) {
      if (finger.size < 2) {
        pinch = null;
        blatt.style.transition = "";
      }
      if (!finger.size) blockiert = false;
      return;
    }
    if (!finger.size) blockiert = false;
    if (!zug || e.pointerId !== zug.id) return;
    if (abbruch) {
      brichZugAb();
      return;
    }
    const z = zug;
    zug = null;
    blatt.classList.remove("ist-ziehen");
    if (z.art === "neu") {
      rahmen.hidden = true;
      if (z.bewegt && z.r && z.r.w >= MIN_B && z.r.h >= MIN_H) fuegeHinzu([z.r], { waehlen: true });
      else if (!z.bewegt && gewaehlt != null) waehle(null); // daneben getippt: nur abwählen
      else if (!z.bewegt && mitText) tippeWort(z.p0, e.pointerType === "mouse");
      aktualisiere();
    } else if (z.bewegt) {
      merke(z.vorher);
      nachAenderung();
    }
  }

  buehne.addEventListener("pointerup", (e) => loslassen(e, false));
  buehne.addEventListener("pointercancel", (e) => loslassen(e, true));
  buehne.addEventListener("contextmenu", (e) => e.preventDefault());
  buehne.addEventListener("gesturestart", (e) => e.preventDefault()); // Safari: kein Zoom der ganzen Seite

  // Wort antippen (nur PDF mit Text): Stelle genau über das Wort (Rahmen aus
  // textstellen.js), nicht gewählt – man kann gleich das nächste antippen. Ein
  // Finger trifft selten genau: Liegt der Tipp knapp daneben, zählt das nächste Wort.
  async function tippeWort(p, mitMaus) {
    const meine = ladeNr;
    const seite = o.seite;
    const woerter = await woerterAuf(d, seite);
    if (!woerter || ctx.signal.aborted || meine !== ladeNr) return;
    const r = blatt.getBoundingClientRect();
    const pxX = r.width / 100;  // Bildschirm-Pixel je Prozent (mit Zoom)
    const pxY = r.height / 100;
    let bestes = null;
    let abstand = Infinity;
    for (const w of woerter) {
      const dx = Math.max(w.x - p.x, 0, p.x - (w.x + w.w)) * pxX;
      const dy = Math.max(w.y - p.y, 0, p.y - (w.y + w.h)) * pxY;
      // Im Rahmen (auch bei sich überlappenden): das Wort, dessen Mitte am nächsten liegt.
      const a = dx || dy
        ? Math.hypot(dx, dy)
        : Math.hypot((w.x + w.w / 2 - p.x) * pxX, (w.y + w.h / 2 - p.y) * pxY) - 1e6;
      if (a < abstand) {
        abstand = a;
        bestes = w;
      }
    }
    if (!bestes || abstand > (mitMaus ? WORT_TOLERANZ.maus : WORT_TOLERANZ.finger)) return;
    if (liste(seite).some((s) => deckt(s, bestes))) return; // schon geschwärzt (z. B. doppelt getippt)
    fuegeHinzu([bestes]);
  }

  // Laufendes Ziehen abbrechen: Aufziehen verwerfen, Verschieben zurücknehmen.
  function brichZugAb() {
    if (!zug) return;
    const z = zug;
    zug = null;
    blatt.classList.remove("ist-ziehen");
    rahmen.hidden = true;
    if (z.art !== "neu" && z.bewegt) {
      o.stellen = z.vorher;
      zeichneStellen();
    }
    aktualisiere();
  }

  // Strg + Mausrad zoomt um den Mauszeiger; gezoomt verschiebt das Mausrad.
  buehne.addEventListener("wheel", (e) => {
    const r = vp.getBoundingClientRect();
    const zeilen = e.deltaMode === 1 ? 33 : 1;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoomeUm(zoom.z * Math.exp(-e.deltaY * zeilen * 0.002), e.clientX - r.left, e.clientY - r.top, false);
    } else if (zoom.z > 1) {
      e.preventDefault();
      setzeZoom(zoom.z, zoom.fx * r.width - e.deltaX * zeilen, zoom.fy * r.height - e.deltaY * zeilen, false);
    }
  }, { passive: false });

  // --- Tastatur ---

  // Pfeile verschieben, Umschalt + Pfeile ändern die Größe, Strg = 5 Schritte.
  // Eine Folge von Tastendrücken an derselben Stelle ist ein Rückgängig-Schritt.
  function taste(e, id) {
    const s = liste().find((x) => x.id === id);
    if (!s) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      loesche(id, { fokusWeiter: true });
      return;
    }
    if (e.key === "Escape" || e.key === "Enter") {
      e.preventDefault();
      if (gewaehlt === id) {
        e.stopPropagation();
        waehle(null);
      }
      return;
    }
    const pfeil = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!pfeil) return;
    e.preventDefault();
    const f = e.ctrlKey || e.metaKey ? 5 : 1;
    const dx = pfeil[0] * SCHRITT_X * f;
    const dy = pfeil[1] * SCHRITT_Y * f;
    const neu = e.shiftKey
      ? { ...s, w: klemme(s.w + dx, MIN_B, 100 - s.x), h: klemme(s.h + dy, MIN_H, 100 - s.y) }
      : { ...s, x: klemme(s.x + dx, 0, 100 - s.w), y: klemme(s.y + dy, 0, 100 - s.h) };
    if (["x", "y", "w", "h"].every((k) => neu[k] === s[k])) return;
    if (tastenFolge !== id) {
      merke();
      tastenFolge = id;
    }
    if (gewaehlt !== id) waehle(id);
    ersetze(neu);
    nachAenderung();
  }

  function globaleTaste(e) {
    if (sheetIstOffen() || !box.isConnected) return;
    if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
    const strg = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (strg && k === "z" && !e.shiftKey) {
      e.preventDefault();
      rueckgaengig();
    } else if (strg && (k === "y" || (k === "z" && e.shiftKey))) {
      e.preventDefault();
      wiederholen();
    } else if (strg || e.altKey) {
      return;
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      blaettere(o.seite + (e.key === "PageUp" ? -1 : 1));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomeUm(zoom.z * ZOOM_SCHRITT);
    } else if (e.key === "-") {
      e.preventDefault();
      zoomeUm(zoom.z / ZOOM_SCHRITT);
    } else if (e.key === "Escape" && (zug || gewaehlt != null)) {
      brichZugAb();
      waehle(null);
    }
  }
  document.addEventListener("keydown", globaleTaste);

  // Zurück (Pfeil, Browser, Android-Geste) beendet zuerst das Ziehen bzw. die Auswahl.
  ctx.beiZurueck(() => {
    if (zug) { brichZugAb(); return true; }
    if (gewaehlt != null) { waehle(null); return true; }
    return false;
  });

  // --- Text suchen und schwärzen (S5, S6) ---

  // Bottom Sheet mit Feld "Suchbegriff", Treffern zum An- und Abhaken und dem
  // Knopf "7 Treffer schwärzen". Sucht beim Tippen (nach 200 ms Pause) in allen
  // Seiten. Treffer, die schon ganz unter einer Stelle liegen, sind blass und
  // nicht wählbar.
  function oeffneSuche() {
    if (!mitText) return;
    for (let nr = 1; nr <= n; nr++) bereiteVor(d, nr); // alle Seiten lesen, während getippt wird

    const feld = el("div", "field sw-suche-feld");
    const label = el("label", null, "Suchbegriff");
    label.htmlFor = "sw-suchbegriff";
    const feldBox = el("div", "field-box");
    const lupe = el("span", "sw-suche-lupe");
    lupe.append(icon("suchen", 18, 2));
    const eingabe = el("input");
    eingabe.id = "sw-suchbegriff";
    eingabe.type = "search";
    eingabe.placeholder = "z. B. einen Namen oder eine Nummer";
    eingabe.autocomplete = "off";
    eingabe.spellcheck = false;
    eingabe.enterKeyHint = "search";
    feldBox.append(lupe, eingabe);
    feld.append(label, feldBox);

    // Zusammenfassung ("7 Treffer auf 4 Seiten" / "Kein Treffer") mit Alle · Keine
    const kopfZeile = el("div", "fk-row sw-suche-kopf");
    const zusammenfassung = el("p", "t-l t-num sw-suche-status");
    zusammenfassung.setAttribute("role", "status");
    const alleK = el("button", "btn-link", "Alle");
    const keineK = el("button", "btn-link", "Keine");
    alleK.type = keineK.type = "button";
    kopfZeile.append(zusammenfassung, alleK, keineK);
    const erklaerung = el("p", "t-s t-muted");
    const schonHinweis = el("p", "note sw-suche-schon");
    const schonText = el("span");
    schonHinweis.append(icon("haken", 18, 2.2), schonText);
    const trefferListe = el("div", "sw-treffer");
    trefferListe.setAttribute("role", "group");
    trefferListe.setAttribute("aria-label", "Treffer");
    const bereich = el("div", "fk-stack sw-suche-bereich");
    bereich.append(kopfZeile, erklaerung, schonHinweis, trefferListe);

    const losK = el("button", "btn btn-primary btn-block");
    losK.type = "button";
    const fuss = el("div", "sw-suche-fuss");
    fuss.append(losK);
    const suchInhalt = el("div", "sw-suche-inhalt");
    suchInhalt.append(feld, bereich, fuss);

    let treffer = [];  // [{ seite, rechtecke, vorher, gesucht, nachher, schon, an, knopf }]
    let lauf = 0;      // Ergebnisse einer überholten Suche verwerfen
    let pause = 0;
    let offen = true;
    const leerText = `${n > 1 ? `Durchsucht alle ${n} Seiten.` : "Durchsucht die ganze Seite."} Geschwärzt werden nur die gesuchten Zeichen.`;
    const neue = () => treffer.filter((t) => !t.schon && t.an);

    function setzeHaken(t) {
      const an = t.schon || t.an;
      t.knopf.classList.toggle("is-checked", an);
      t.knopf.setAttribute("aria-checked", String(an));
    }

    function aktualisiereKnopf() {
      const zahl = neue().length;
      losK.disabled = zahl === 0;
      losK.textContent = zahl ? `${zahl} Treffer schwärzen` : "Treffer schwärzen";
    }

    function trefferKnopf(t) {
      const k = el("button", t.schon ? "hit is-done" : "hit");
      k.type = "button";
      k.setAttribute("role", "checkbox");
      const kasten = el("span", "cbox");
      kasten.setAttribute("aria-hidden", "true");
      kasten.append(icon("haken", 14, 3.2));
      const ausschnitt = el("span", "snip");
      ausschnitt.append(t.vorher, el("mark", null, t.gesucht), t.nachher); // <mark> zeigt, was schwarz wird
      k.append(kasten, el("span", "hit-pg", `Seite ${t.seite}`), ausschnitt);
      t.knopf = k;
      if (t.schon) {
        k.setAttribute("aria-disabled", "true");
      } else {
        k.addEventListener("click", () => {
          t.an = !t.an;
          setzeHaken(t);
          aktualisiereKnopf();
        });
      }
      setzeHaken(t);
      return k;
    }

    // zustand: "leer" (noch kein Begriff), "sucht" (Seiten werden noch gelesen) oder "fertig"
    function zeige(zustand, text = "") {
      const mitTreffern = zustand === "fertig" && treffer.length > 0;
      const seiten = new Set(treffer.map((t) => t.seite)).size;
      zusammenfassung.textContent = zustand !== "fertig" ? ""
        : mitTreffern ? `${treffer.length} Treffer auf ${seitenText(seiten)}` : "Kein Treffer";
      alleK.hidden = keineK.hidden = !mitTreffern;
      erklaerung.textContent = zustand === "leer" ? leerText
        : zustand === "sucht" ? text
        : mitTreffern ? "" : "Prüfe die Schreibweise oder suche nach einem Teil des Wortes.";
      erklaerung.hidden = !erklaerung.textContent;
      const schon = mitTreffern ? treffer.filter((t) => t.schon).length : 0;
      schonText.textContent = schon === 1 ? "1 Treffer ist schon geschwärzt" : `${schon} Treffer sind schon geschwärzt`;
      schonHinweis.hidden = !schon;
      trefferListe.replaceChildren(...(mitTreffern ? treffer.map(trefferKnopf) : []));
      trefferListe.hidden = !mitTreffern;
      trefferListe.scrollTop = 0;
      aktualisiereKnopf();
    }

    async function sucheJetzt() {
      clearTimeout(pause);
      const meine = ++lauf;
      const begriff = eingabe.value;
      if (!sucheMoeglich(begriff)) {
        treffer = [];
        zeige("leer");
        return;
      }
      const ergebnis = await suche(d, begriff, {
        abgebrochen: () => meine !== lauf || !offen,
        beiSeite: (nr, anzahl) => {
          if (meine === lauf && nr < anzahl) {
            treffer = [];
            zeige("sucht", `Durchsucht Seite ${nr + 1} von ${anzahl} …`);
          }
        },
      });
      if (!ergebnis || meine !== lauf || !offen) return;
      treffer = ergebnis.map((t) => ({
        ...t, an: true, schon: t.rechtecke.every((r) => liste(t.seite).some((s) => deckt(s, r))),
      }));
      zeige("fertig");
    }

    eingabe.addEventListener("input", () => {
      clearTimeout(pause);
      pause = setTimeout(sucheJetzt, SUCH_PAUSE);
    });
    eingabe.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      sucheJetzt();
      eingabe.blur(); // Tastatur am Handy schließen, damit Treffer und Knopf zu sehen sind
    });
    const alleSetzen = (an) => {
      for (const t of treffer) {
        if (t.schon) continue;
        t.an = an;
        setzeHaken(t);
      }
      aktualisiereKnopf();
    };
    alleK.addEventListener("click", () => alleSetzen(true));
    keineK.addEventListener("click", () => alleSetzen(false));
    losK.addEventListener("click", () => {
      const auswahl = neue();
      if (!auswahl.length) return;
      sheet.schliessen();
      schwaerzeTreffer(auswahl);
    });

    // Bildschirmtastatur: Das Sheet rückt über sie, damit Treffer und Knopf sichtbar bleiben.
    const vv = window.visualViewport;
    const passeAn = () => {
      if (!vv) return;
      const tastatur = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      sheet.sheet.style.setProperty("--tastatur", `${Math.round(tastatur)}px`);
      sheet.sheet.style.setProperty("--sichtbar", `${Math.round(vv.height)}px`);
    };

    const sheet = oeffneSheet({
      titel: "Text suchen und schwärzen", inhalt: suchInhalt, ausloeser: suchenK, klasse: "sw-suche",
      beiSchliessen: () => {
        offen = false;
        clearTimeout(pause);
        vv?.removeEventListener("resize", passeAn);
        vv?.removeEventListener("scroll", passeAn);
      },
    });
    passeAn();
    vv?.addEventListener("resize", passeAn);
    vv?.addEventListener("scroll", passeAn);
    zeige("leer");
    eingabe.focus();
  }

  // "N Treffer schwärzen" (S6): ein Rückgängig-Schritt für alle Treffer, auch über
  // mehrere Seiten. Danach die Seite mit dem ersten Treffer zeigen; die neuen
  // Stellen erscheinen nacheinander, Toast "7 Stellen geschwärzt · Rückgängig".
  function schwaerzeTreffer(auswahl) {
    const erste = auswahl[0].seite;
    merke(o.stellen, erste);
    const neu = { ...o.stellen };
    versetzt = new Set();
    for (const t of auswahl) {
      const dazu = t.rechtecke.map((r) => ({ id: naechsteId++, x: r.x, y: r.y, w: r.w, h: r.h }));
      for (const s of dazu) versetzt.add(s.id);
      neu[t.seite] = [...(neu[t.seite] || []), ...dazu];
    }
    const zahl = versetzt.size;
    o.stellen = neu;
    if (erste !== o.seite) {
      brichZugAb();
      o.seite = erste;
      zeigeSeite(true);
    } else {
      gewaehlt = null;
    }
    nachAenderung();
    const text = `${stellenText(zahl)} geschwärzt`;
    toast = zeigeToast(text, { iconName: "haken", aktion: "Rückgängig", beiAktion: rueckgaengig });
    ansage(`${text}.`);
  }

  // --- Seitenübersicht (S7) ---

  function oeffneSeiten() {
    const raster = el("div", "sw-seiten");
    raster.setAttribute("role", "list");
    let sheet = null;

    // Miniaturen erst rendern, wenn sie in die Nähe des sichtbaren Bereichs kommen.
    const io = new IntersectionObserver((eintraege) => {
      for (const e of eintraege) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        seitenBild(d, Number(e.target.dataset.nr), "klein").then((b) => {
          if (!b || !e.target.isConnected) return;
          const img = el("img");
          img.src = b.url;
          img.alt = "";
          img.draggable = false;
          e.target.style.aspectRatio = String(b.verhaeltnis);
          e.target.prepend(img);
        });
      }
    }, { rootMargin: "200px 0px" });

    for (let nr = 1; nr <= n; nr++) {
      const stellen = liste(nr);
      const aktuell = nr === o.seite;
      const eintrag = el("div", "sw-titem");
      eintrag.setAttribute("role", "listitem");
      const t = el("button", `thumb${aktuell ? " is-current" : ""}`);
      t.type = "button";
      t.dataset.nr = String(nr);
      t.style.aspectRatio = String(d.verhaeltnis);
      for (const s of stellen) {
        const balken = el("i");
        setzeLage(balken, s);
        t.append(balken);
      }
      if (stellen.length) {
        const badge = el("span", "thumb-badge");
        const zeichen = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        zeichen.setAttribute("width", "10");
        zeichen.setAttribute("height", "10");
        zeichen.setAttribute("viewBox", "0 0 10 10");
        zeichen.setAttribute("aria-hidden", "true");
        zeichen.innerHTML = '<rect x="0" y="3" width="10" height="4" rx="1" fill="currentColor"/>';
        badge.append(zeichen, el("span", null, String(stellen.length)));
        t.append(badge);
      }
      t.setAttribute("aria-label",
        `Seite ${nr}, ${stellen.length ? stellenText(stellen.length) : "keine Stellen"}${aktuell ? ", aktuelle Seite" : ""}`);
      if (aktuell) t.setAttribute("aria-current", "page");
      t.addEventListener("click", () => {
        sheet.schliessen();
        blaettere(nr);
      });
      eintrag.append(t, el("span", null, `Seite ${nr}`));
      raster.append(eintrag);
      io.observe(t);
    }

    sheet = oeffneSheet({
      titel: "Seiten", unterzeile: stellenSumme(o.stellen, bild), inhalt: raster, ausloeser: seitenK,
      beiSchliessen: () => io.disconnect(),
    });
    raster.querySelector(".is-current")?.scrollIntoView({ block: "nearest" });
  }

  // --- Optionen für diese Seite (S8) ---

  function oeffneOptionen() {
    const hier = liste().length;
    let sheet = null;

    const zeile = (iconName, text, aktion, { gefahr = false, aus = false } = {}) => {
      const b = el("button", `mrow compact${gefahr ? " danger" : ""}`);
      b.type = "button";
      const ic = el("span", "mrow-ic");
      ic.append(icon(iconName, 22, 1.9));
      b.append(ic, el("span", "mrow-t", text));
      if (aus) {
        b.classList.add("is-disabled");
        b.setAttribute("aria-disabled", "true");
      } else {
        b.addEventListener("click", () => {
          sheet.schliessen();
          aktion();
        });
      }
      return b;
    };

    const nav = el("nav", "fk-stack");
    nav.setAttribute("aria-label", "Weitere Optionen");
    nav.append(
      zeile("hinzufuegen", "Stelle hinzufügen", fuegeMitteHinzu),
      zeile("ganze-seite", bild ? "Ganzes Bild schwärzen" : "Ganze Seite schwärzen",
        () => fuegeHinzu([{ x: 0, y: 0, w: 100, h: 100 }])),
      trenner("sep"),
      // Zoomen ohne zwei Finger (Nachtrag Kap. 13, Punkt 2).
      zeile("hineinzoomen", "Hineinzoomen", () => zoomeUm(zoom.z * ZOOM_SCHRITT), { aus: zoom.z >= MAX_ZOOM }),
      zeile("herauszoomen", "Herauszoomen", () => zoomeUm(zoom.z / ZOOM_SCHRITT), { aus: zoom.z <= 1 }),
      trenner("sep"),
      zeile("loeschen", bild ? "Alle Stellen löschen" : "Alle Stellen dieser Seite löschen", loescheSeite,
        { gefahr: true, aus: !hier }),
    );

    const ort = bild ? "auf dem Bild" : "auf dieser Seite";
    sheet = oeffneSheet({
      titel: bild ? "Bild" : `Seite ${o.seite}`,
      unterzeile: hier ? `${stellenText(hier)} ${ort}` : `Noch keine Stelle ${ort}`,
      inhalt: nav, ausloeser: mehrK,
    });
  }

  // --- Start ---

  // Drehen des Geräts o. ä.: Zoom und Verschiebung bleiben (als Anteile gespeichert).
  const groesse = new ResizeObserver(() => {
    blatt.style.transition = "none";
    wendeZoomAn();
  });
  groesse.observe(vp);

  // Hat das PDF eine Textebene? Erst dann gibt es Lupe und Antippen (sonst S2b).
  if (mitText === undefined) {
    hatText(d).then((ja) => {
      if (ctx.signal.aborted) return;
      mitText = ja;
      setzeHinweis();
      if (!ja) return;
      suchenK.hidden = false;
      spieleAb(suchenK, "in-fade");
      bereiteVor(d, o.seite, true);
    });
  }

  ctx.signal.addEventListener("abort", () => {
    document.removeEventListener("keydown", globaleTaste);
    groesse.disconnect();
    clearTimeout(zoomHinweisTimer);
    finger.clear();
    zug = pinch = null;
    toast?.schliessen();
  }, { once: true });

  zeigeSeite(false);
  return { inhalt: box, dock: weiterKnopf };
}
