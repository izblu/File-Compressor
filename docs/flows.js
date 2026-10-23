// flows.js – die Schritte je Aktion (HANDOFF Kapitel 6). Schritt 1 "Datei
// wählen" ist der Startscreen; hier stehen die Schritte ab Schritt 2.
//
// Bauabschnitt 3 (Wizard-Rahmen): Die Schritte zeigen vorerst nur einen
// Platzhalter. Die echten Screens folgen in Bauabschnitt 4 in der Reihenfolge
// Verkleinern → Umwandeln → Trennen → Zusammenführen / Seiten ordnen.

import { el } from "./shared.js";
import { icon } from "./icons.js";
import { hauptKnopf } from "./wizard.js";
import { zeigeToast } from "./ui.js";

// Titel der Schritte (wie in den Referenz-Screens), der letzte ist immer "Speichern".
const SCHRITTE = {
  verkleinern:     ["Wie stark verkleinern?", "Speichern"],
  zusammenfuehren: ["Seiten anordnen", "Speichern"],
  trennen:         ["Seiten auswählen", "Speichern"],
  ordnen:          ["Seiten anordnen", "Speichern"],
  umwandeln:       ["Speichern"],
};

// Dateiname ohne Endung.
const ohneEndung = (name) => name.replace(/\.[^.]+$/, "");

// Vorschlag für den Dateinamen (HANDOFF 6.2) – noch ohne Sonderfälle von Trennen/Umwandeln.
function namensVorschlag(aktion, dateien) {
  const name = ohneEndung(dateien[0].file.name);
  if (aktion === "zusammenfuehren") return { name: "Zusammengeführt", endung: "pdf" };
  if (aktion === "ordnen") return { name: `${name}_geordnet`, endung: "pdf" };
  if (aktion === "verkleinern") return { name: `${name}_klein`, endung: dateien[0].format.toLowerCase() };
  return { name, endung: "pdf" };
}

function platzhalter(titel) {
  const karte = el("div", "card wizard-platzhalter");
  const ic = el("span", "wizard-platzhalter-ic");
  ic.append(icon("info", 24, 2));
  karte.append(ic, el("p", "t-l", titel),
    el("p", "t-body t-muted", "Dieser Schritt wird im nächsten Bauabschnitt gebaut."));
  return karte;
}

// Dateiname-Feld mit fester Endung (wird in Bauabschnitt 4 je Aktion verfeinert).
function namensFeld(ctx) {
  const vorschlag = namensVorschlag(ctx.aktion, ctx.dateien);
  if (ctx.optionen.name == null) ctx.optionen.name = vorschlag.name;

  const feld = el("div", "field");
  const label = el("label", null, "Dateiname");
  label.htmlFor = "dateiname";
  const box = el("div", "field-box");
  const input = el("input");
  input.id = "dateiname";
  input.value = ctx.optionen.name;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.addEventListener("input", () => {
    ctx.optionen.name = input.value;
    ctx.geaendert();
  });
  box.append(input, el("span", "field-ext", `.${vorschlag.endung}`));
  feld.append(label, box,
    el("p", "field-hint", "Wird als neue Datei gespeichert – das Original bleibt unverändert."));
  return feld;
}

// Liefert die Schritte für den Wizard: [{ titel, baue(ctx) }].
export function schritteFuer(aktion) {
  return SCHRITTE[aktion].map((titel) => ({
    titel,
    baue(ctx) {
      if (!ctx.istLetzter) {
        return { inhalt: platzhalter(titel), dock: hauptKnopf("Weiter", ctx.weiter) };
      }
      const box = el("div", "fk-stack wizard-stapel");
      box.append(platzhalter(titel), namensFeld(ctx));
      const speichern = hauptKnopf("Speichern", () =>
        zeigeToast("Speichern wird in Bauabschnitt 5 angebunden."), "speichern");
      return { inhalt: box, dock: speichern };
    },
  }));
}
