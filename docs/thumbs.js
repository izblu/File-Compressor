// thumbs.js – Seiten-Miniaturen von PDFs für die Seiten-Raster (Trennen, später
// der Seiten-Editor). Jede Seite wird höchstens einmal gerendert (Cache je
// Datei), erst wenn sie ins Bild kommt, und immer eine nach der anderen –
// so bleibt das Handy auch bei langen PDFs flüssig.

import { oeffnePdfjs, rendereSeite, canvasZuBlob } from "./pdf.js";

const KANTE = 440; // längste Kante der Miniatur in Pixeln (scharf bei 2 Spalten)

const cache = new WeakMap(); // eintrag → { doc, bilder: Map<seite, Promise<{ url, verhaeltnis } | null>> }
let kette = Promise.resolve();

function cacheFuer(eintrag) {
  let c = cache.get(eintrag);
  if (!c) {
    c = { doc: null, bilder: new Map() };
    cache.set(eintrag, c);
    // Beim Entfernen der Datei (intake.freigeben) alles wieder freigeben.
    (eintrag.aufraeumen ||= []).push(() => {
      c.weg = true;
      for (const p of c.bilder.values()) p.then((b) => b && URL.revokeObjectURL(b.url));
      if (c.doc) c.doc.then((d) => d.destroy()).catch(() => {});
      cache.delete(eintrag);
    });
  }
  return c;
}

async function rendere(eintrag, c, seite) {
  if (c.weg) return null; // Datei wurde inzwischen entfernt
  if (!c.doc) c.doc = oeffnePdfjs(eintrag.file);
  const doc = await c.doc;
  const { canvas, breite, hoehe } = await rendereSeite(await doc.getPage(seite), KANTE);
  const blob = await canvasZuBlob(canvas, "image/jpeg", 0.82);
  canvas.width = canvas.height = 0;
  return { url: URL.createObjectURL(blob), verhaeltnis: breite / hoehe };
}

// Miniatur einer Seite (1-basiert): Promise<{ url, verhaeltnis }> oder null.
export function seitenBild(eintrag, seite) {
  const c = cacheFuer(eintrag);
  if (!c.bilder.has(seite)) {
    kette = kette.then(() => rendere(eintrag, c, seite)).catch(() => null);
    c.bilder.set(seite, kette);
  }
  return c.bilder.get(seite);
}

// Zeigt Seiten in ihren Boxen (Element mit --r = Seitenverhältnis), sobald
// sie in die Nähe des sichtbaren Bereichs kommen.
// beobachte(box, eintrag, seite) meldet eine Box an, beende() hört auf
// (z. B. beim Schrittwechsel).
export function beobachteSeiten() {
  const auftraege = new WeakMap(); // box → { eintrag, seite }
  const neu = [];
  let io = null;

  const zeige = (box) => {
    const a = auftraege.get(box);
    if (!a) return;
    auftraege.delete(box);
    seitenBild(a.eintrag, a.seite).then((b) => {
      if (!b || !box.isConnected) return;
      const img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      img.src = b.url;
      box.style.setProperty("--r", b.verhaeltnis);
      box.replaceChildren(img);
      box.classList.add("ist-da");
    });
  };

  // Erst beobachten, wenn die Boxen im Dokument stehen: Dann ist der scrollende
  // Bereich (.fk-body) bekannt und Seiten knapp darunter werden schon vorbereitet.
  const starte = () => {
    const boxen = neu.splice(0).filter((b) => b.isConnected);
    if (!boxen.length) return;
    if (!("IntersectionObserver" in window)) return boxen.forEach(zeige);
    if (!io) {
      io = new IntersectionObserver((eintraege) => {
        for (const e of eintraege) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          zeige(e.target);
        }
      }, { root: boxen[0].closest(".fk-body"), rootMargin: "400px 0px" });
    }
    boxen.forEach((b) => io.observe(b));
  };

  return {
    beobachte(box, eintrag, seite) {
      auftraege.set(box, { eintrag, seite });
      neu.push(box);
      if (neu.length === 1) requestAnimationFrame(starte);
    },
    beende() {
      neu.length = 0;
      if (io) io.disconnect();
    },
  };
}
