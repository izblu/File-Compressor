// save.js – Ergebnisse aufs Gerät schreiben ("Speichern").
// Vorerst über einen unsichtbaren Link mit download-Attribut; Bauabschnitt 5
// ergänzt die File System Access API (Speicherort wählen) und den
// "Gespeichert ✓"-Screen. In der Oberfläche heißt es immer nur "Speichern".

function speichereEine({ blob, name }) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// dateien: [{ blob, name }]. Mehrere Dateien kurz nacheinander, sonst
// verwerfen manche Browser alle außer der ersten.
export async function speichere(dateien) {
  for (let i = 0; i < dateien.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 350));
    speichereEine(dateien[i]);
  }
}
