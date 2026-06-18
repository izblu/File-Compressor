// shared.js – gemeinsame Helfer für alle Modi (Verkleinern/Zusammenführen/Trennen).

// Bytes in lesbare Größe (wie human_size in compress.py).
export function humanSize(bytes) {
  let size = bytes;
  for (const einheit of ["B", "KB", "MB", "GB"]) {
    if (size < 1024) return `${size.toFixed(1)} ${einheit}`;
    size /= 1024;
  }
  return `${size.toFixed(1)} TB`;
}

// Kurzschreibweise zum Erzeugen eines HTML-Elements.
export function el(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text != null) e.textContent = text;
  return e;
}

// Eine Datei (Blob) als Download anbieten.
export function ladeHerunter(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = el("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Download-Symbol für Knöpfe.
export const LADE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>';

// Welcher Modus ist gerade aktiv (anhand der unteren Navigation)?
export function aktiverModus() {
  const t = document.querySelector(".tab.aktiv");
  return t ? t.dataset.modus : "verkleinern";
}

// Kontextuelle Aktionsleiste (über der Navigation) füllen oder ausblenden.
// fuerModus stellt sicher, dass nur der aktive Modus die Leiste beschreibt.
export function setzeAktion(inhalt, fuerModus) {
  if (fuerModus && aktiverModus() !== fuerModus) return;
  const leiste = document.getElementById("aktionsleiste");
  leiste.replaceChildren();
  if (!inhalt) {
    leiste.hidden = true;
    return;
  }
  const wrap = el("div", "aktion-inhalt");
  if (Array.isArray(inhalt)) wrap.append(...inhalt);
  else wrap.append(inhalt);
  leiste.append(wrap);
  leiste.hidden = false;
}
