// merge.js – Modus "Zusammenführen": mehrere PDFs/Bilder zu einem PDF verbinden.
// Nutzt pdf-lib (verlustfrei Seiten kopieren / Bilder einbetten). Wird erst beim
// ersten Öffnen des Tabs geladen.

import { el, humanSize, ladeHerunter, LADE_ICON, setzeAktion } from "./shared.js";
import { ladePdfLib } from "./pdf.js";

// "1-3, 5" -> [0,1,2,4] (0-basiert, auf Seitenzahl geklemmt). Leer/ungültig -> null (= alle).
function parseSeiten(text, anzahl) {
  if (!text || !text.trim()) return null;
  const indizes = [];
  for (const teil of text.split(",")) {
    const t = teil.trim();
    if (!t) continue;
    const bereich = t.match(/^(\d+)\s*-\s*(\d+)$/);
    if (bereich) {
      let a = +bereich[1], b = +bereich[2];
      if (a > b) [a, b] = [b, a];
      for (let p = a; p <= b; p++) if (p >= 1 && p <= anzahl) indizes.push(p - 1);
    } else if (/^\d+$/.test(t)) {
      const p = +t;
      if (p >= 1 && p <= anzahl) indizes.push(p - 1);
    }
  }
  return indizes.length ? indizes : null;
}

// Bild -> JPEG-Bytes (+ Maße), zum Einbetten als PDF-Seite.
async function bildAlsJpeg(file) {
  let bmp;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bmp = await createImageBitmap(file);
  }
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0);
  if (bmp.close) bmp.close();
  const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.92));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: c.width, height: c.height };
}

export function initMerge() {
  const drop    = document.getElementById("mergeDrop");
  const eingabe = document.getElementById("mergeEingabe");
  const liste   = document.getElementById("mergeListe");
  const hinweis = document.getElementById("mergeHinweis");
  const ergebnis = document.getElementById("mergeErgebnis");
  const ausgabe  = document.getElementById("mergeAusgabe");

  const items = []; // { file, name, istPdf, bytes?, pageCount?, url?, seiten? }
  let laeuft = false;

  function aktualisiere() {
    hinweis.hidden = items.length === 0;
    zeichneListe();

    if (items.length >= 1) {
      const btn = el("button", "knopf voll");
      if (laeuft) {
        btn.textContent = "Wird zusammengeführt …";
        btn.disabled = true;
      } else {
        btn.textContent = `Zu PDF zusammenführen (${items.length})`;
        btn.addEventListener("click", zusammenfuehren);
      }
      setzeAktion(btn, "zusammenfuehren");
    } else {
      setzeAktion(null, "zusammenfuehren");
    }
  }

  function zeichneListe() {
    liste.replaceChildren();
    items.forEach((it, i) => liste.append(zeile(it, i)));
  }

  function zeile(it, i) {
    const root  = el("div", "datei-zeile");
    const thumb = it.istPdf ? el("div", "thumb thumb--pdf", "PDF") : el("div", "thumb");
    if (!it.istPdf && it.url) {
      thumb.style.backgroundImage = `url("${it.url}")`;
      thumb.style.backgroundSize = "cover";
      thumb.style.backgroundPosition = "center";
    }

    const info = el("div", "datei-info");
    info.append(el("div", "datei-name", it.name));
    info.append(el("div", "datei-meta",
      it.istPdf ? `PDF · ${it.pageCount ?? "…"} Seiten` : `Bild · ${humanSize(it.file.size)}`));

    if (it.istPdf) {
      const feld = el("input", "seiten-feld");
      feld.type = "text";
      feld.placeholder = "Seiten, z. B. 1-3, 5 (leer = alle)";
      feld.value = it.seiten || "";
      feld.addEventListener("input", () => { it.seiten = feld.value; });
      info.append(feld);
    }

    const knoepfe = el("div", "datei-knoepfe");
    const hoch = el("button", "icon-knopf", "↑");
    hoch.type = "button"; hoch.title = "nach oben"; hoch.disabled = i === 0;
    hoch.addEventListener("click", () => {
      [items[i - 1], items[i]] = [items[i], items[i - 1]];
      aktualisiere();
    });
    const runter = el("button", "icon-knopf", "↓");
    runter.type = "button"; runter.title = "nach unten"; runter.disabled = i === items.length - 1;
    runter.addEventListener("click", () => {
      [items[i + 1], items[i]] = [items[i], items[i + 1]];
      aktualisiere();
    });
    const weg = el("button", "icon-knopf entfernen", "✕");
    weg.type = "button"; weg.title = "entfernen";
    weg.addEventListener("click", () => {
      if (it.url) URL.revokeObjectURL(it.url);
      items.splice(i, 1);
      aktualisiere();
    });
    knoepfe.append(hoch, runter, weg);

    root.append(thumb, info, knoepfe);
    return root;
  }

  async function hinzufuegen(dateien) {
    for (const file of dateien) {
      const istPdf =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const item = { file, name: file.name, istPdf };
      if (istPdf) {
        try {
          const PDFLib = await ladePdfLib();
          const bytes = new Uint8Array(await file.arrayBuffer());
          const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
          item.pageCount = doc.getPageCount();
          item.bytes = bytes;
        } catch {
          item.pageCount = "?";
        }
      } else {
        item.url = URL.createObjectURL(file);
      }
      items.push(item);
    }
    aktualisiere();
  }

  async function zusammenfuehren() {
    if (laeuft || items.length === 0) return;
    laeuft = true;
    aktualisiere();
    ergebnis.hidden = false;
    ausgabe.replaceChildren(el("p", "panel-hinweis", "Wird zusammengeführt …"));

    try {
      const PDFLib = await ladePdfLib();
      const out = await PDFLib.PDFDocument.create();

      for (const it of items) {
        if (it.istPdf) {
          const bytes = it.bytes || new Uint8Array(await it.file.arrayBuffer());
          const src = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
          const idx = parseSeiten(it.seiten, src.getPageCount()) || src.getPageIndices();
          const kopien = await out.copyPages(src, idx);
          kopien.forEach((p) => out.addPage(p));
        } else {
          const { bytes, width, height } = await bildAlsJpeg(it.file);
          const img = await out.embedJpg(bytes);
          const page = out.addPage([width, height]);
          page.drawImage(img, { x: 0, y: 0, width, height });
        }
      }

      const bytes = await out.save();
      const blob = new Blob([bytes], { type: "application/pdf" });
      zeigeAusgabe(blob, "zusammengefuehrt.pdf", out.getPageCount());
    } catch (e) {
      ausgabe.replaceChildren(el("p", "panel-hinweis", `Fehler: ${e && e.message ? e.message : e}`));
    } finally {
      laeuft = false;
      aktualisiere();
    }
  }

  function zeigeAusgabe(blob, name, seiten) {
    const karte = el("div", "ergebnis");
    karte.append(el("div", "thumb thumb--pdf", "PDF"));
    const info = el("div", "ergebnis-info");
    info.append(el("div", "ergebnis-name", name));
    info.append(el("div", "ergebnis-meta", `${seiten} Seiten · ${humanSize(blob.size)}`));
    const aktion = el("div", "ergebnis-aktion");
    const btn = el("button", "knopf klein");
    btn.innerHTML = LADE_ICON + "Laden";
    btn.addEventListener("click", () => ladeHerunter(blob, name));
    aktion.append(btn);
    karte.append(info, aktion);
    ausgabe.replaceChildren(karte);
  }

  // Ereignisse
  eingabe.addEventListener("change", () => {
    if (eingabe.files.length) hinzufuegen([...eingabe.files]);
    eingabe.value = "";
  });
  ["dragover", "dragenter"].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("aktiv"); })
  );
  ["dragleave", "dragend"].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("aktiv"); })
  );
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("aktiv");
    const dateien = [...(e.dataTransfer ? e.dataTransfer.files : [])];
    if (dateien.length) hinzufuegen(dateien);
  });

  return { aktualisiere };
}
