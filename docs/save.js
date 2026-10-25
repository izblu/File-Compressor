// save.js – Ergebnisse aufs Gerät schreiben ("Speichern"). In der Oberfläche
// heißt es immer nur "Speichern".
//
// Eine Datei: Wo der Browser es kann (Chrome/Edge am PC), öffnet sich der
// echte "Speichern unter"-Dialog – Ort und Name sind wählbar (File System
// Access API). Sonst – und bei mehreren Dateien – legt der Browser sie wie
// gewohnt in seinen Ordner für gespeicherte Dateien (unsichtbarer Link mit
// download-Attribut).
//
// Ablauf: speicherZiel() direkt im Tipp auf "Speichern" aufrufen – den Dialog
// öffnet der Browser nur, solange der Tipp "frisch" ist (wenige Sekunden).
// Danach verarbeiten und mit ziel.schreibe() speichern.
//
// ziel.schreibe() liefert die gespeicherten Dateien samt Blob zurück – damit
// lässt sich das Ergebnis gleich weiterbearbeiten (gespeichert.js).

const TYPEN = {
  pdf: { description: "PDF-Dokument", accept: { "application/pdf": [".pdf"] } },
  jpg: { description: "JPG-Bild", accept: { "image/jpeg": [".jpg", ".jpeg"] } },
  jpeg: { description: "JPG-Bild", accept: { "image/jpeg": [".jpeg", ".jpg"] } },
  png: { description: "PNG-Bild", accept: { "image/png": [".png"] } },
};

const endung = (name) => name.split(".").pop().toLowerCase();

// namen = die Dateinamen, die entstehen werden. Rückgabe: ein Ziel
// { schreibe(dateien), verwerfe() } – oder null, wenn der Dialog abgebrochen wurde.
export async function speicherZiel(namen) {
  if (namen.length === 1 && typeof window.showSaveFilePicker === "function") {
    const typ = TYPEN[endung(namen[0])];
    try {
      const handle = await window.showSaveFilePicker({
        id: "filekit",       // der Browser merkt sich den zuletzt gewählten Ordner
        startIn: "downloads",
        suggestedName: namen[0],
        ...(typ ? { types: [typ], excludeAcceptAllOption: true } : {}),
      });
      return dialogZiel(handle);
    } catch (e) {
      if (e.name === "AbortError") return null;
      // z. B. Tipp nicht mehr "frisch" → wie in anderen Browsern speichern
      console.warn("„Speichern unter“ nicht möglich:", e);
    }
  }
  return linkZiel();
}

// --- "Speichern unter"-Dialog ---

function dialogZiel(handle) {
  // Der Dialog legt die Datei schon leer an. Kommt nichts hinein (Verarbeitung
  // abgebrochen oder fehlgeschlagen), wird sie wieder entfernt – aber nur,
  // wenn sie wirklich leer ist.
  async function verwerfe() {
    try {
      const datei = await handle.getFile();
      if (datei.size === 0 && handle.remove) await handle.remove();
    } catch {
      // nicht angelegt oder schon weg – nichts zu tun
    }
  }

  return {
    // dateien: [{ blob, name }] (genau eine). Rückgabe: [{ name, groesse, blob }] –
    // mit dem Namen, den der Nutzer im Dialog gewählt hat.
    async schreibe([datei]) {
      let stream = null;
      try {
        stream = await handle.createWritable();
        await stream.write(datei.blob);
        await stream.close();
      } catch (e) {
        if (stream) await stream.abort().catch(() => {});
        await verwerfe();
        throw e;
      }
      return [{ name: handle.name, groesse: datei.blob.size, blob: datei.blob }];
    },
    verwerfe,
  };
}

// --- Fallback: unsichtbarer Link ---

function perLink({ blob, name }) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function linkZiel() {
  return {
    // Mehrere Dateien kurz nacheinander, sonst verwerfen manche Browser alle
    // außer der ersten.
    async schreibe(dateien) {
      for (let i = 0; i < dateien.length; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, 350));
        perLink(dateien[i]);
      }
      return dateien.map((d) => ({ name: d.name, groesse: d.blob.size, blob: d.blob }));
    },
    verwerfe() {},
  };
}
