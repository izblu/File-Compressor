// split.js – Modus "Trennen": ein PDF öffnen, Seiten als Vorschau anhaken und
// als ein PDF oder als einzelne PDFs exportieren. Vorschau über pdf.js,
// das Heraustrennen über pdf-lib (verlustfrei).

import { el, humanSize, ladeHerunter, LADE_ICON, setzeAktion } from "./shared.js";
import { ladePdfjs, ladePdfLib } from "./pdf.js";

export function initSplit() {
  const drop     = document.getElementById("splitDrop");
  const eingabe  = document.getElementById("splitEingabe");
  const kopf     = document.getElementById("splitKopf");
  const info     = document.getElementById("splitInfo");
  const alleBtn  = document.getElementById("splitAlle");
  const keineBtn = document.getElementById("splitKeine");
  const grid     = document.getElementById("splitGrid");
  const ergebnis = document.getElementById("splitErgebnis");
  const ausgabe  = document.getElementById("splitAusgabe");

  let bytes = null;
  let name = "dokument.pdf";
  let anzahl = 0;
  const gewaehlt = new Set(); // 0-basierte Seitenindizes
  let laeuft = false;

  function aktualisiere() {
    if (!anzahl) {
      setzeAktion(null, "trennen");
      return;
    }
    const eins = el("button", "knopf flex");
    eins.textContent = `Als 1 PDF (${gewaehlt.size})`;
    eins.disabled = gewaehlt.size === 0 || laeuft;
    eins.addEventListener("click", () => exportiere(false));

    const einzeln = el("button", "knopf flex sekundaer");
    einzeln.textContent = `Einzelne (${gewaehlt.size})`;
    einzeln.disabled = gewaehlt.size === 0 || laeuft;
    einzeln.addEventListener("click", () => exportiere(true));

    setzeAktion([eins, einzeln], "trennen");
  }

  async function laden(file) {
    name = file.name;
    bytes = new Uint8Array(await file.arrayBuffer());
    gewaehlt.clear();
    grid.replaceChildren();
    ergebnis.hidden = true;
    kopf.hidden = false;
    info.textContent = "Seiten werden geladen …";

    try {
      const pdfjsLib = await ladePdfjs();
      const doc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
      anzahl = doc.numPages;
      info.textContent = `${anzahl} Seiten · zum Auswählen tippen`;

      for (let p = 1; p <= anzahl; p++) {
        const kachel = el("div", "seiten-kachel");
        const nummer = el("span", "nummer", String(p));
        const haken = el("span", "haken", "");
        kachel.append(nummer, haken);
        grid.append(kachel);

        const idx = p - 1;
        kachel.addEventListener("click", () => {
          if (gewaehlt.has(idx)) {
            gewaehlt.delete(idx);
            kachel.classList.remove("gewaehlt");
            haken.textContent = "";
          } else {
            gewaehlt.add(idx);
            kachel.classList.add("gewaehlt");
            haken.textContent = "✓";
          }
          aktualisiere();
        });

        // Vorschaubild rendern (kleine Auflösung).
        const page = await doc.getPage(p);
        const basis = page.getViewport({ scale: 1 });
        const skala = 220 / Math.max(basis.width, basis.height);
        const vp = page.getViewport({ scale: skala });
        const c = document.createElement("canvas");
        c.width = Math.ceil(vp.width);
        c.height = Math.ceil(vp.height);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const img = el("img");
        img.alt = `Seite ${p}`;
        img.src = c.toDataURL("image/jpeg", 0.7);
        kachel.insertBefore(img, nummer);
        page.cleanup();
      }
      await doc.destroy();
    } catch (e) {
      info.textContent = `Fehler beim Laden: ${e && e.message ? e.message : e}`;
    }
    aktualisiere();
  }

  async function exportiere(einzeln) {
    if (laeuft || gewaehlt.size === 0) return;
    laeuft = true;
    aktualisiere();
    ergebnis.hidden = false;
    ausgabe.replaceChildren(el("p", "panel-hinweis", "Wird erstellt …"));

    try {
      const PDFLib = await ladePdfLib();
      const src = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      const sortiert = [...gewaehlt].sort((a, b) => a - b);
      const stamm = name.replace(/\.pdf$/i, "");
      const dateien = [];

      if (einzeln) {
        for (const idx of sortiert) {
          const d = await PDFLib.PDFDocument.create();
          const [pg] = await d.copyPages(src, [idx]);
          d.addPage(pg);
          const b = await d.save();
          dateien.push({ blob: new Blob([b], { type: "application/pdf" }), name: `${stamm}_Seite${idx + 1}.pdf` });
        }
      } else {
        const d = await PDFLib.PDFDocument.create();
        const pgs = await d.copyPages(src, sortiert);
        pgs.forEach((p) => d.addPage(p));
        const b = await d.save();
        dateien.push({ blob: new Blob([b], { type: "application/pdf" }), name: `${stamm}_Auswahl.pdf` });
      }

      zeigeAusgabe(dateien);
    } catch (e) {
      ausgabe.replaceChildren(el("p", "panel-hinweis", `Fehler: ${e && e.message ? e.message : e}`));
    } finally {
      laeuft = false;
      aktualisiere();
    }
  }

  function zeigeAusgabe(dateien) {
    ausgabe.replaceChildren();
    dateien.forEach((d) => {
      const karte = el("div", "ergebnis");
      karte.append(el("div", "thumb thumb--pdf", "PDF"));
      const info2 = el("div", "ergebnis-info");
      info2.append(el("div", "ergebnis-name", d.name));
      info2.append(el("div", "ergebnis-meta", humanSize(d.blob.size)));
      const aktion = el("div", "ergebnis-aktion");
      const btn = el("button", "knopf klein");
      btn.innerHTML = LADE_ICON + "Laden";
      btn.addEventListener("click", () => ladeHerunter(d.blob, d.name));
      aktion.append(btn);
      karte.append(info2, aktion);
      ausgabe.append(karte);
    });

    if (dateien.length > 1) {
      const alle = el("button", "knopf voll");
      alle.style.marginTop = "10px";
      alle.textContent = `Alle ${dateien.length} herunterladen`;
      alle.addEventListener("click", () =>
        dateien.forEach((d, i) => setTimeout(() => ladeHerunter(d.blob, d.name), i * 350)));
      ausgabe.append(alle);
    }
  }

  // Ereignisse
  alleBtn.addEventListener("click", () => {
    if (!anzahl) return;
    gewaehlt.clear();
    for (let i = 0; i < anzahl; i++) gewaehlt.add(i);
    [...grid.children].forEach((k) => {
      k.classList.add("gewaehlt");
      k.querySelector(".haken").textContent = "✓";
    });
    aktualisiere();
  });
  keineBtn.addEventListener("click", () => {
    gewaehlt.clear();
    [...grid.children].forEach((k) => {
      k.classList.remove("gewaehlt");
      k.querySelector(".haken").textContent = "";
    });
    aktualisiere();
  });

  eingabe.addEventListener("change", () => {
    if (eingabe.files[0]) laden(eingabe.files[0]);
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
    const file = e.dataTransfer && e.dataTransfer.files[0];
    if (file) laden(file);
  });

  return { aktualisiere };
}
