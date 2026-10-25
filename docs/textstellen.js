// textstellen.js – Wörter und Zeichen-Rahmen einer PDF-Seite für "Wort antippen"
// und "Text suchen" beim Schwärzen (Konzept 2.4 / 2.4.1 / 4.5, Nachtrag 9.1).
//
// Die Rahmen kommen aus der Zeichenliste der Seite (page.getOperatorList): Der
// Textzustand (Schrift, Größe, Zeichen- und Wortabstand, Textmatrix,
// Unterformulare, Formularfelder) wird so nachgerechnet, wie pdf.js die
// Buchstaben beim Zeichnen setzt. Das ist genauer als der TextLayer
// (getTextContent), der die Breiten mit einer Ersatzschrift schätzt und bei
// vielen Schriften Buchstaben anschneidet (Ergebnis des Vorab-Tests).
// Fehlen Schriftdaten, greift dieser Ersatzweg doch – mit größerem Rand.
//
// Achtung: Das stützt sich auf interne Datenformate von pdf.js (Zeichenliste,
// Schriftdaten). Nach einem Update von lib/pdfjs den Vorab-Test erneut laufen
// lassen (Konzept 2.6).
//
// Jede Seite wird erst bei Bedarf gelesen, eine nach der anderen, und dann
// zwischengespeichert (wie in thumbs.js). Ergebnisse stehen in Prozent der
// angezeigten (ggf. gedrehten) Seite – wie die Stellen im Editor.

import { ladePdfjs } from "./pdf.js";
import { pdfDokument } from "./thumbs.js";

// Rand je Wort als Anteil der Schrifthöhe: u = am Wortanfang und -ende (manche
// Buchstaben wie das "f" in Times ragen über ihre Breite hinaus), v = oben/unten.
const RAND = { u: 0.1, v: 0.05 };
const RAND_ERSATZ = { u: 0.25, v: 0.1 }; // Ersatzweg: Breiten sind nur geschätzt
const SCHRIFT_WARTEN = 3000;            // ms – so lange wartet eine Seite höchstens auf eine Schrift
const MIN_ZEICHEN = 2;                  // kürzere Suchbegriffe finden zu viel
const ZIFFERN_OHNE_LEER = 4;            // ab so vielen Ziffern zählen Leerzeichen nicht (IBAN, Telefon)
const STRICH = /[-‐‑­]/; // Bindestrich, Trennstrich, weiches Trennzeichen
const STRICHE = /[-‐‑­]/g;
const STRICH_AM_ENDE = /[-‐‑­]$/;

const cache = new WeakMap(); // eintrag → { seiten: Map<nr, auftrag>, warte: [], laeuft, weg, hatText, textDa }

function cacheFuer(eintrag) {
  let c = cache.get(eintrag);
  if (!c) {
    c = { seiten: new Map(), warte: [], laeuft: false, weg: false, hatText: null, textDa: undefined };
    cache.set(eintrag, c);
    // Beim Entfernen der Datei (intake.freigeben) nichts mehr lesen.
    (eintrag.aufraeumen ||= []).push(() => {
      c.weg = true;
      cache.delete(eintrag);
    });
  }
  return c;
}

// --- Seiten der Reihe nach lesen ---

// Text einer Seite (1-basiert): Promise<Seite | null>. dringend = vor allen
// anderen wartenden Seiten lesen (die gezeigte Seite fürs Antippen).
function seite(eintrag, nr, dringend = false) {
  const c = cacheFuer(eintrag);
  let auftrag = c.seiten.get(nr);
  if (!auftrag) {
    auftrag = { nr };
    auftrag.promise = new Promise((fertig) => { auftrag.fertig = fertig; });
    c.seiten.set(nr, auftrag);
    c.warte.push(auftrag);
  }
  const i = c.warte.indexOf(auftrag);
  if (dringend && i > 0) c.warte.unshift(...c.warte.splice(i, 1));
  arbeite(eintrag, c);
  return auftrag.promise;
}

async function arbeite(eintrag, c) {
  if (c.laeuft) return;
  c.laeuft = true;
  while (c.warte.length && !c.weg) {
    const auftrag = c.warte.shift();
    let s = null;
    try { s = await liesSeite(eintrag, auftrag.nr); } catch { s = null; }
    auftrag.fertig(s);
  }
  for (const auftrag of c.warte.splice(0)) auftrag.fertig(null); // Datei wurde entfernt
  c.laeuft = false;
}

// Seite schon im Hintergrund lesen (z. B. sobald sie gezeigt wird).
export function bereiteVor(eintrag, nr, dringend = false) {
  seite(eintrag, nr, dringend);
}

async function liesSeite(eintrag, nr) {
  const { OPS } = await ladePdfjs();
  const doc = await pdfDokument(eintrag);
  const page = await doc.getPage(nr);
  const vp = page.getViewport({ scale: 1 });
  let glyphen = null;
  let rand = RAND;
  try { glyphen = await glyphenExakt(page, vp, OPS); } catch { glyphen = null; }
  if (!glyphen) {
    glyphen = await glyphenErsatz(page, vp);
    rand = RAND_ERSATZ;
  }
  page.cleanup();
  return baueSeite(glyphen, vp, rand);
}

// --- Exakte Zeichen-Rahmen aus der Zeichenliste ---

const ID = [1, 0, 0, 1, 0, 0];
const mal = (m1, m2) => [
  m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1],
  m1[0] * m2[2] + m1[2] * m2[3], m1[1] * m2[2] + m1[3] * m2[3],
  m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
];
const punkt = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
// Matrix aus den Argumenten eines Operators: (a, b, c, d, e, f) oder ([a … f]).
const matrix = (args) => Array.from(args.length === 1 && args[0] && args[0].length === 6 ? args[0] : args);

function schrift(page, name) {
  return new Promise((fertig) => {
    const uhr = setTimeout(() => fertig(null), SCHRIFT_WARTEN);
    try {
      page.commonObjs.get(name, (f) => { clearTimeout(uhr); fertig(f); });
    } catch {
      clearTimeout(uhr);
      fertig(null);
    }
  });
}

// Schrift, deren Maße pdf.js beim Zeichnen wirklich nutzt? (Bei Fehlern liefert
// pdf.js nur einen Text; "ungültige" Schriften zeichnet es mit einer Ersatzschrift.)
const brauchbar = (f) => f && typeof f === "object" && !f.vertical && !f.isInvalidPDFjsFont;
const SCHRIFT_MATRIX = [0.001, 0, 0, 0.001, 0, 0]; // gilt, wenn die Schrift keine eigene hat (z. B. Standardschriften)

// Liefert je gezeichnetem Zeichen { u, leer, h, winkel, a, e, L, T, R, B } in
// Punkt der angezeigten Seite – oder null, wenn Schriftdaten fehlen (Ersatzweg).
async function glyphenExakt(page, vp, OPS) {
  const { fnArray: fn, argsArray: argumente } = await page.getOperatorList();

  const namen = new Set();
  for (let i = 0; i < fn.length; i++) {
    if (fn[i] === OPS.setFont) namen.add(argumente[i][0]);
    else if (fn[i] === OPS.setGState) for (const [k, v] of argumente[i][0] || []) if (k === "Font") namen.add(v[0]);
  }
  const schriften = new Map();
  for (const name of namen) schriften.set(name, await schrift(page, name));

  const frisch = () => ({ ctm: ID, font: null, size: 0, dir: 1, cs: 0, ws: 0, hs: 1, leading: 0, rise: 0, tm: ID, x: 0, y: 0, lx: 0, ly: 0 });
  let st = frisch();
  const stapel = [];
  const glyphen = [];
  const setzeSchrift = (name, groesse) => {
    st.font = schriften.get(name);
    st.dir = groesse < 0 ? -1 : 1;
    st.size = Math.abs(groesse);
  };

  for (let i = 0; i < fn.length; i++) {
    const a = argumente[i] || [];
    switch (fn[i]) {
      case OPS.save: stapel.push({ ...st }); break;
      case OPS.restore: if (stapel.length) st = stapel.pop(); break;
      case OPS.transform: st.ctm = mal(st.ctm, matrix(a)); break;
      case OPS.paintFormXObjectBegin: stapel.push({ ...st }); if (a[0]) st.ctm = mal(st.ctm, Array.from(a[0])); break;
      case OPS.paintFormXObjectEnd: if (stapel.length) st = stapel.pop(); break;
      // Formularfelder und andere Anmerkungen: eigener Zustand ab der Seiten-Grundlage.
      case OPS.beginAnnotation:
        stapel.push(st);
        st = frisch();
        st.ctm = mal(Array.from(a[2] || ID), Array.from(a[3] || ID));
        break;
      case OPS.endAnnotation: if (stapel.length) st = stapel.pop(); break;
      case OPS.beginText: st.tm = ID; st.x = st.y = st.lx = st.ly = 0; break;
      case OPS.setFont: setzeSchrift(a[0], a[1]); break;
      case OPS.setGState: for (const [k, v] of a[0] || []) if (k === "Font") setzeSchrift(v[0], v[1]); break;
      case OPS.setTextMatrix: st.tm = matrix(a); st.x = st.y = st.lx = st.ly = 0; break;
      case OPS.moveText: st.x = st.lx += a[0]; st.y = st.ly += a[1]; break;
      case OPS.setLeadingMoveText: st.leading = a[1]; st.x = st.lx += a[0]; st.y = st.ly += a[1]; break;
      case OPS.nextLine: st.x = st.lx; st.y = st.ly += st.leading; break;
      case OPS.setCharSpacing: st.cs = a[0]; break;
      case OPS.setWordSpacing: st.ws = a[0]; break;
      case OPS.setHScale: st.hs = a[0] / 100; break;
      case OPS.setLeading: st.leading = -a[0]; break;
      case OPS.setTextRise: st.rise = a[0]; break;
      case OPS.showText: {
        if (!st.size) break; // Schriftgröße 0: pdf.js zeichnet nichts
        const font = st.font;
        if (!brauchbar(font)) return null;
        const skala = st.size * (font.fontMatrix || SCHRIFT_MATRIX)[0];
        const hs = st.hs * st.dir;
        const M = mal(mal(mal(vp.transform, st.ctm), st.tm), [1, 0, 0, 1, st.x, st.y + st.rise]);
        let asc = font.ascent;
        let desc = font.descent < 0 ? -font.descent : font.descent;
        if (!(asc > 0.5 && asc < 1.3)) asc = 0.85;
        if (!(desc > 0.05 && desc < 0.5)) desc = 0.25;
        const h = Math.hypot(M[2], M[3]) * st.size;
        const winkel = Math.atan2(M[1], M[0]);
        let gx = 0;
        for (const g of a[0]) {
          if (typeof g === "number") { gx -= (g * st.size) / 1000; continue; }
          const abstand = (g.isSpace ? st.ws : 0) + st.cs;
          const x0 = gx * hs;
          const x1 = (gx + g.width * skala) * hs;
          const u = (g.unicode || "").normalize("NFKC");
          const ecken = [[x0, -desc * st.size], [x1, -desc * st.size], [x0, asc * st.size], [x1, asc * st.size]].map(([x, y]) => punkt(M, x, y));
          const xs = ecken.map((p) => p[0]);
          const ys = ecken.map((p) => p[1]);
          glyphen.push({
            u, leer: g.isSpace || !u.trim(), h, winkel, a: punkt(M, x0, 0), e: punkt(M, x1, 0),
            L: Math.min(...xs), T: Math.min(...ys), R: Math.max(...xs), B: Math.max(...ys),
          });
          gx += g.width * skala + abstand * st.dir;
        }
        st.x += gx * hs;
        break;
      }
    }
  }
  return glyphen;
}

// --- Ersatzweg: Positionen aus getTextContent, Breiten per measureText ---

let messCtx = null;
function breiteVon(text, px, familie) {
  messCtx ||= document.createElement("canvas").getContext("2d");
  messCtx.font = `${px}px ${familie}`;
  return messCtx.measureText(text).width;
}

async function glyphenErsatz(page, vp) {
  const tc = await page.getTextContent();
  const glyphen = [];
  const bruch = { u: "", leer: true }; // trennt Textstücke
  for (const item of tc.items) {
    if (!item.str || !item.str.trim()) { if (item.hasEOL) glyphen.push(bruch); continue; }
    const stil = tc.styles[item.fontName] || {};
    const tx = mal(vp.transform, item.transform);
    let winkel = Math.atan2(tx[1], tx[0]);
    if (stil.vertical) winkel += Math.PI / 2;
    const h = Math.hypot(tx[2], tx[3]);
    if (h < 0.5) continue;
    const breite = (stil.vertical ? item.height : item.width) * vp.scale;
    const asc = stil.ascent > 0 ? stil.ascent : 0.8;
    const desc = stil.descent < 0 ? -stil.descent : 0.2;
    const familie = stil.fontFamily || "sans-serif";
    const natur = breiteVon(item.str, h, familie);
    const sx = natur > 0 ? breite / natur : 1;
    const d = [Math.cos(winkel), Math.sin(winkel)];
    const hoch = [Math.sin(winkel), -Math.cos(winkel)];
    const an = (u, v) => [tx[4] + d[0] * u + hoch[0] * v, tx[5] + d[1] * u + hoch[1] * v];
    let pos = 0;
    for (const zeichen of item.str) {
      const x0 = breiteVon(item.str.slice(0, pos), h, familie) * sx;
      pos += zeichen.length;
      const x1 = breiteVon(item.str.slice(0, pos), h, familie) * sx;
      const u = zeichen.normalize("NFKC");
      const ecken = [an(x0, -desc * h), an(x1, -desc * h), an(x0, asc * h), an(x1, asc * h)];
      const xs = ecken.map((p) => p[0]);
      const ys = ecken.map((p) => p[1]);
      glyphen.push({
        u, leer: !u.trim(), h, winkel, a: an(x0, 0), e: an(x1, 0),
        L: Math.min(...xs), T: Math.min(...ys), R: Math.max(...xs), B: Math.max(...ys),
      });
    }
    if (item.hasEOL) glyphen.push(bruch);
  }
  return glyphen;
}

// --- Zeichen zu Wörtern ---

// Liegt b in Schreibrichtung von a aus gesehen auf derselben Zeile? Liefert den
// Abstand entlang der Zeile (in Punkt) oder null.
function aufDerZeile(a, b) {
  if (Math.abs(b.winkel - a.winkel) > 0.01) return null;
  const d = [Math.cos(a.winkel), Math.sin(a.winkel)];
  const dx = b.a[0] - a.e[0];
  const dy = b.a[1] - a.e[1];
  const entlang = dx * d[0] + dy * d[1];
  const quer = -dx * d[1] + dy * d[0];
  if (Math.abs(quer) > 0.5 * a.h || entlang < -0.5 * a.h) return null;
  return entlang;
}

// Seite = { breite, hoehe (Punkt), box (je Zeichen L, T, R, B ohne Rand),
//           zeichen (je Zeichen der Text, bei Ligaturen mehrere Buchstaben),
//           woerter: [{ von, bis, text, h, grad, rand, zeilenEnde, dicht }],
//           ersatz (true = Ersatzweg, Rahmen nur geschätzt) }
function baueSeite(glyphen, vp, rand) {
  const zeichen = [];
  const box = [];
  const woerter = [];
  let akt = null;
  // Leerzeichen, Sprünge oder eine neue Zeile trennen Wörter (wie im Vorab-Test).
  for (const g of glyphen) {
    if (g.leer) { akt = null; continue; }
    if (akt) {
      const d = [Math.cos(akt.winkel), Math.sin(akt.winkel)];
      const dx = g.a[0] - akt.e[0];
      const dy = g.a[1] - akt.e[1];
      const entlang = dx * d[0] + dy * d[1];
      const quer = -dx * d[1] + dy * d[0];
      if (Math.abs(g.winkel - akt.winkel) > 0.01 || Math.abs(quer) > 0.3 * g.h || entlang > 0.15 * g.h || entlang < -0.3 * g.h) akt = null;
    }
    if (!akt) {
      akt = { von: zeichen.length, bis: 0, text: "", h: g.h, winkel: g.winkel, a: g.a, e: g.e, rand };
      woerter.push(akt);
    }
    zeichen.push(g.u);
    box.push(g.L, g.T, g.R, g.B);
    akt.bis = zeichen.length - 1;
    akt.text += g.u;
    akt.e = g.e;
    akt.h = Math.max(akt.h, g.h);
  }
  woerter.forEach((w, i) => {
    const grad = ((Math.round((w.winkel * 180) / Math.PI / 90) * 90) % 360 + 360) % 360;
    const naechstes = woerter[i + 1];
    const entlang = naechstes ? aufDerZeile(w, naechstes) : null;
    w.grad = grad;
    w.zeilenEnde = entlang === null;
    w.dicht = entlang !== null && entlang < 2.5 * w.h; // Treffer über beide Wörter: ein Rahmen
  });
  return { breite: vp.width, hoehe: vp.height, box: Float32Array.from(box), zeichen, woerter, ersatz: rand === RAND_ERSATZ };
}

// Rahmen über die Zeichen von … bis eines Wortes (Punkt): Rand quer zur
// Schreibrichtung immer, entlang nur am Wortanfang bzw. -ende. Eine Schnittkante
// mitten im Wort liegt genau zwischen zwei Buchstaben – ohne Zusatzrand.
function wortRahmen(s, w, von, bis) {
  let L = Infinity, T = Infinity, R = -Infinity, B = -Infinity;
  for (let k = von; k <= bis; k++) {
    L = Math.min(L, s.box[4 * k]);
    T = Math.min(T, s.box[4 * k + 1]);
    R = Math.max(R, s.box[4 * k + 2]);
    B = Math.max(B, s.box[4 * k + 3]);
  }
  const pu = w.rand.u * w.h;
  const pv = w.rand.v * w.h;
  const anfang = von === w.von ? pu : 0;
  const ende = bis === w.bis ? pu : 0;
  if (w.grad === 0) { L -= anfang; R += ende; T -= pv; B += pv; }
  else if (w.grad === 180) { R += anfang; L -= ende; T -= pv; B += pv; }
  else if (w.grad === 90) { T -= anfang; B += ende; L -= pv; R += pv; }
  else { B += anfang; T -= ende; L -= pv; R += pv; }
  return { L, T, R, B };
}

const vereint = (a, b) => ({ L: Math.min(a.L, b.L), T: Math.min(a.T, b.T), R: Math.max(a.R, b.R), B: Math.max(a.B, b.B) });

// Punkt → Prozent der Seite (wie die Stellen), auf die Seite begrenzt.
function inProzent(s, r) {
  const x = Math.max(0, (r.L / s.breite) * 100);
  const y = Math.max(0, (r.T / s.hoehe) * 100);
  return { x, y, w: Math.min(100, (r.R / s.breite) * 100) - x, h: Math.min(100, (r.B / s.hoehe) * 100) - y };
}

// --- Für den Editor ---

// Hat das PDF eine Textebene? Scans haben keine – dann gibt es weder Suche noch
// Antippen (Nachtrag S2b). Prüft Seite für Seite und hört beim ersten Text auf.
export function hatText(eintrag) {
  const c = cacheFuer(eintrag);
  if (!c.hatText) {
    c.hatText = (async () => {
      try {
        const doc = await pdfDokument(eintrag);
        for (let nr = 1; nr <= doc.numPages && !c.weg; nr++) {
          const tc = await (await doc.getPage(nr)).getTextContent();
          if (tc.items.some((item) => item.str && item.str.trim())) return true;
        }
      } catch {}
      return false;
    })().then((ja) => (c.textDa = ja));
  }
  return c.hatText;
}

// Schon bekannt, ob es Text gibt? true / false – oder undefined (wird noch geprüft).
export const textBekannt = (eintrag) => cache.get(eintrag)?.textDa;

// Alle Wörter einer Seite als Rahmen in Prozent (mit Rand) – fürs Antippen.
export async function woerterAuf(eintrag, nr) {
  const s = await seite(eintrag, nr, true);
  if (!s) return null;
  s.wortRahmen ||= s.woerter.map((w) => inProzent(s, wortRahmen(s, w, w.von, w.bis)));
  return s.wortRahmen;
}

// --- Suche ---

// Begriff bzw. Seitentext vergleichbar machen: Groß/klein egal, Bindestriche und
// Trennstriche zählen nicht, Leerzeichen und Zeilenumbrüche werden zu einem
// Leerzeichen – oder fallen ganz weg (ohneLeer, für Nummern wie die IBAN).
function normiere(text, ohneLeer) {
  let n = "";
  const karte = []; // je Buchstabe in n: Stelle im Original (-1 = Leerzeichen)
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (STRICH.test(c)) continue;
    if (/\s/.test(c)) {
      if (ohneLeer || !n || n.endsWith(" ")) continue;
      n += " ";
      karte.push(-1);
      continue;
    }
    const klein = c.toLocaleLowerCase("de");
    n += klein;
    for (let j = 0; j < klein.length; j++) karte.push(i);
  }
  if (n.endsWith(" ")) { n = n.slice(0, -1); karte.pop(); }
  return { n, karte };
}

// Text der Seite für die Suche: Wörter mit Leerzeichen dazwischen; ein
// Trennstrich am Zeilenende verbindet ohne Leerzeichen ("Muster-⏎mann").
function suchText(s) {
  if (s.such) return s.such;
  let text = "";
  const zuZeichen = []; // je Buchstabe im text: Nummer des Zeichens (-1 = Leerzeichen)
  s.woerter.forEach((w, i) => {
    for (let k = w.von; k <= w.bis; k++) {
      text += s.zeichen[k];
      for (let j = 0; j < s.zeichen[k].length; j++) zuZeichen.push(k);
    }
    if (w.zeilenEnde && i < s.woerter.length - 1 && STRICH_AM_ENDE.test(w.text)) return;
    text += " ";
    zuZeichen.push(-1);
  });
  const variante = (ohneLeer) => {
    const { n, karte } = normiere(text, ohneLeer);
    return { n, karte: karte.map((i) => (i < 0 ? -1 : zuZeichen[i])) };
  };
  s.such = { mit: variante(false), ohne: variante(true) };
  return s.such;
}

function finde({ n, karte }, q) {
  const bereiche = [];
  for (let pos = n.indexOf(q); pos >= 0; pos = n.indexOf(q, pos + q.length)) {
    bereiche.push({ von: karte[pos], bis: karte[pos + q.length - 1] });
  }
  return bereiche;
}

// Wort, in dem das Zeichen k liegt (binäre Suche).
function wortVon(s, k) {
  let lo = 0, hi = s.woerter.length - 1;
  while (lo < hi) {
    const mitte = (lo + hi + 1) >> 1;
    if (s.woerter[mitte].von <= k) lo = mitte;
    else hi = mitte - 1;
  }
  return lo;
}

const teilText = (s, von, bis) => s.zeichen.slice(von, bis + 1).join("");

// Ein Treffer: Rahmen nur über den gesuchten Zeichen (je Zeile einer) und ein
// Ausschnitt fürs Sheet – das ganze Wort mit je einem Wort davor und danach.
function baueTreffer(s, seiteNr, von, bis) {
  const wa = wortVon(s, von);
  const wb = wortVon(s, bis);
  const rechtecke = [];
  let zeile = null;
  let gesucht = "";
  for (let i = wa; i <= wb; i++) {
    const w = s.woerter[i];
    const a = Math.max(von, w.von);
    const b = Math.min(bis, w.bis);
    const r = wortRahmen(s, w, a, b);
    // Wörter derselben Zeile bekommen einen gemeinsamen Rahmen, jede Zeile einen eigenen.
    if (zeile && s.woerter[i - 1].dicht) {
      zeile = vereint(zeile, r);
    } else {
      if (zeile) rechtecke.push(zeile);
      zeile = r;
    }
    gesucht += teilText(s, a, b);
    if (i < wb && !(w.zeilenEnde && STRICH_AM_ENDE.test(w.text))) gesucht += " ";
  }
  rechtecke.push(zeile);
  // Text außerhalb der sichtbaren Seite zählt nicht.
  const sichtbar = rechtecke.map((r) => inProzent(s, r)).filter((r) => r.w > 0 && r.h > 0);
  if (!sichtbar.length) return null;

  const erstes = s.woerter[wa];
  const letztes = s.woerter[wb];
  let vorher = teilText(s, erstes.von, von - 1);
  if (wa > 0) vorher = `${wa > 1 ? "… " : ""}${s.woerter[wa - 1].text} ${vorher}`;
  let nachher = teilText(s, bis + 1, letztes.bis);
  if (wb < s.woerter.length - 1) nachher += ` ${s.woerter[wb + 1].text}${wb < s.woerter.length - 2 ? " …" : ""}`;
  return { seite: seiteNr, rechtecke: sichtbar, vorher, gesucht, nachher };
}

// Gültiger Suchbegriff? (mindestens zwei Zeichen ohne Leer- und Trennzeichen)
export const sucheMoeglich = (begriff) => normiere(begriff.normalize("NFKC"), true).n.length >= MIN_ZEICHEN;

// Sucht in allen Seiten. Liefert die Treffer in Lesereihenfolge:
// [{ seite, rechtecke: [{ x, y, w, h }], vorher, gesucht, nachher }] – oder null,
// wenn abgebrochen() unterwegs true meldet. beiSeite(nr, anzahl) nach jeder Seite.
export async function suche(eintrag, begriff, { beiSeite, abgebrochen } = {}) {
  if (!sucheMoeglich(begriff)) return [];
  const roh = begriff.normalize("NFKC").trim();
  const mitLeer = normiere(roh, false).n;
  const ohneLeer = normiere(roh, true).n;
  const auchOhneLeer = (ohneLeer.match(/\d/g) || []).length >= ZIFFERN_OHNE_LEER;
  const doc = await pdfDokument(eintrag);
  const anzahl = doc.numPages;
  const treffer = [];
  for (let nr = 1; nr <= anzahl; nr++) {
    const s = await seite(eintrag, nr);
    if (abgebrochen && abgebrochen()) return null;
    if (beiSeite) beiSeite(nr, anzahl);
    if (!s || !s.zeichen.length) continue;
    const t = suchText(s);
    const bereiche = finde(t.mit, mitLeer);
    if (auchOhneLeer) {
      for (const b of finde(t.ohne, ohneLeer)) {
        if (!bereiche.some((x) => x.von <= b.bis && b.von <= x.bis)) bereiche.push(b);
      }
      bereiche.sort((x, y) => x.von - y.von);
    }
    for (const b of bereiche) {
      const t = baueTreffer(s, nr, b.von, b.bis);
      if (t) treffer.push(t);
    }
  }
  return treffer;
}
