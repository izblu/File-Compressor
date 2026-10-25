// flow-ordnen.js – Abläufe "Zusammenführen" und "Seiten ordnen" (HANDOFF 6,
// Screens 10–14, 10s, 10t): Schritt 2 "Seiten anordnen" (Seiten-Editor, siehe
// editor.js) → Schritt 3 "Speichern" mit Ergebnis-Karte, Format und Dateiname.
// Verarbeitet wird nach dem Tipp auf "Speichern".

import { el, ohneEndung, sichererName, seitenText } from "./shared.js";
import { icon } from "./icons.js";
import { hauptKnopf } from "./wizard.js";
import { baueDokument } from "./merge.js";
import { speicherZiel } from "./save.js";
import { zeigeGespeichert } from "./gespeichert.js";
import { editorSchritt, markeVon } from "./editor.js";
import { schrittInhalt, abschnitt, namensFeld, mitVerarbeitung, fortschrittText, seitenMini } from "./flow-teile.js";

// Gleiche Schritte für beide Aktionen; der Editor unterscheidet über ctx.aktion.
export function seitenSchritte() {
  return [
    { titel: "Seiten anordnen", baue: editorSchritt, breit: true },
    { titel: "Speichern", baue: speichernSchritt },
  ];
}

// --- Ergebnis-Karten ---

// Kleine Seite (weißes Papier), optional mit Bild und farbigem Band oben.
function miniSeite(url, band) {
  const mini = el("span", "ed-mini");
  if (url) {
    const img = el("img");
    img.src = url;
    img.alt = "";
    img.draggable = false;
    mini.append(img);
  }
  if (band) mini.append(el("i", band));
  return mini;
}

// Zusammenführen (10s): Ursprungsdateien → ein PDF, "1 PDF mit 5 Seiten · aus 3 Dateien".
function zusammenKarte(o, benutzt) {
  const karte = el("section", "card fk-stack ed-ergebnis");
  karte.setAttribute("aria-label", "Ergebnis");

  const vis = el("div", "fk-row ed-ergebnis-vis");
  vis.setAttribute("aria-hidden", "true");
  const quellen = el("div", "fk-row ed-quellen");
  for (const d of benutzt.slice(0, 3)) quellen.append(miniSeite(d.vorschau, markeVon(o, d).klasse));
  if (benutzt.length > 3) quellen.append(el("span", "t-s t-muted", `+${benutzt.length - 3}`));
  const stapel = el("div", "ed-stapel");
  const vorne = miniSeite();
  vorne.append(el("span", "tag", "PDF"));
  stapel.append(miniSeite(), miniSeite(), vorne);
  const pfeil = el("span", "ed-pfeil");
  pfeil.append(icon("pfeil-rechts", 22, 2.2));
  vis.append(quellen, pfeil, stapel);

  const text = el("div", "fk-stack ed-ergebnis-text");
  text.append(
    el("p", "t-h", `1 PDF mit ${seitenText(o.seiten.length)}`),
    el("p", "t-body t-muted", benutzt.length === 1 ? "aus 1 Datei" : `aus ${benutzt.length} Dateien`),
  );
  karte.append(vis, text);
  return karte;
}

function aenderung(iconName, text) {
  const b = el("span", "badge badge-accent");
  b.append(icon(iconName, 12, 2.6), el("span", null, text));
  return b;
}

// Seiten ordnen (10t): neue erste Seite, Name, Seitenzahl und was sich geändert hat.
function ordnenKarte(o) {
  const d = o.dateien[0];
  const erste = o.seiten[0];
  const karte = el("section", "card fk-stack ed-ergebnis is-ordnen");
  karte.setAttribute("aria-label", "Ergebnis");

  const kopf = el("div", "fk-row ed-ordnen-kopf");
  const rahmen = seitenMini({ eintrag: d, nr: erste.nr, drehung: erste.drehung }, "ed-ordnen-mini");
  const text = el("div", "fk-stack ed-ordnen-text");
  const name = el("p", "t-h ed-ordnen-name", d.file.name);
  name.title = d.file.name;
  text.append(name, el("p", "t-body t-muted", `${seitenText(o.seiten.length)} · PDF`));
  kopf.append(rahmen, text);

  const liste = el("div", "fk-row ed-aenderungen");
  const umgestellt = o.seiten.some((s, i) => i > 0 && s.nr < o.seiten[i - 1].nr);
  const gedreht = o.seiten.filter((s) => s.drehung).length;
  const geloescht = d.seiten - o.seiten.length;
  if (umgestellt) liste.append(aenderung("tauschen", "Reihenfolge geändert"));
  if (gedreht) liste.append(aenderung("drehen", gedreht === 1 ? "1 Seite gedreht" : `${gedreht} Seiten gedreht`));
  if (geloescht) liste.append(aenderung("loeschen", geloescht === 1 ? "1 Seite gelöscht" : `${geloescht} Seiten gelöscht`));
  if (!liste.childElementCount) liste.append(el("span", "t-s t-muted", "Noch nichts geändert – die Seiten bleiben, wie sie sind."));

  karte.append(kopf, liste);
  return karte;
}

// --- Schritt 3: Speichern ---

function speichernSchritt(ctx) {
  const o = ctx.optionen;
  const zusammen = ctx.aktion === "zusammenfuehren";
  const vorschlag = zusammen ? "Zusammengeführt" : `${ohneEndung(o.dateien[0].file.name)}_geordnet`;
  o.name ??= vorschlag;
  const benutzt = o.dateien.filter((d) => o.seiten.some((s) => s.datei === d));

  const knopf = hauptKnopf("Speichern", speichern, "speichern");

  const format = el("div", "card fk-row ausgabe-format");
  format.append(el("span", "t-body ausgabe-text", "Format"), el("b", "t-body", "PDF"));

  const feld = namensFeld({
    wert: o.name, endung: "pdf",
    hinweis: benutzt.length > 1 ? "Wird als neue Datei gespeichert – die Originale bleiben unverändert." : null,
    beiEingabe: (v) => { o.name = v; ctx.geaendert(); },
  });

  async function speichern() {
    const name = `${sichererName(o.name, vorschlag)}.pdf`;
    const ziel = await speicherZiel([name]);
    if (!ziel) return; // "Speichern unter" abgebrochen
    const seiten = o.seiten;
    const n = seiten.length;
    let zuletzt = null; // Datei, deren Vorschau der Verarbeiten-Screen gerade zeigt
    const gespeichert = await mitVerarbeitung(ctx, {
      knopf,
      titel: zusammen ? "Zusammenführen" : "Seiten ordnen",
      text: zusammen ? "Wird zusammengeführt …" : "Wird geordnet …",
      einheiten: n,
      fehlerText: zusammen
        ? "Das Zusammenführen hat leider nicht geklappt. Versuche es noch einmal."
        : "Das Ordnen hat leider nicht geklappt. Versuche es noch einmal.",
      job: ({ signal, melde }) => {
        melde({ anteil: 0, fertig: 0, text: fortschrittText("Seite", 1, n, 0) });
        return baueDokument(seiten, {
          signal,
          beiSeite: (f, gesamt) => {
            const naechste = seiten[Math.min(f, gesamt - 1)].datei;
            const datei = naechste !== zuletzt ? (zuletzt = naechste) : undefined;
            melde({ anteil: f / gesamt, fertig: f, text: fortschrittText("Seite", f, gesamt, f / gesamt), datei });
          },
        });
      },
      ziel,
      dateien: (blob) => [{ blob, name }],
    });
    if (!gespeichert) return;
    const erste = seiten[0];
    zeigeGespeichert(ctx, {
      gespeichert,
      bilder: [{ eintrag: erste.datei, nr: erste.nr, drehung: erste.drehung }],
      info: seitenText(n),
      herkunft: { aktion: ctx.aktion, vorher: benutzt.reduce((s, d) => s + d.file.size, 0) },
    });
  }

  return {
    inhalt: schrittInhalt(
      zusammen ? zusammenKarte(o, benutzt) : ordnenKarte(o),
      abschnitt("Ausgabe", format),
      feld.element,
    ),
    dock: knopf,
  };
}
