// icons.js – die UI-Icons aus dem Designsystem (design/filekit-handoff/icons
// und design/filekit-handoff-erweiterung/icons) als Inline-SVG. 24er-Raster,
// runde Enden, Strichfarbe = currentColor.

const NS = "http://www.w3.org/2000/svg";

const PFADE = {
  "an-den-anfang": '<path d="M6 4h12M12 20V9M7 13l5-5 5 5"/>',
  "ans-ende": '<path d="M6 20h12M12 4v11M7 11l5 5 5-5"/>',
  "ansicht-1-spalte": '<path d="M6 3.5h12A1.5 1.5 0 0 1 19.5 5v4a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 9V5A1.5 1.5 0 0 1 6 3.5zM6 13.5h12a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19v-4A1.5 1.5 0 0 1 6 13.5z"/>',
  "ansicht-2-spalten": '<path d="M5 3.5h4A1.5 1.5 0 0 1 10.5 5v4A1.5 1.5 0 0 1 9 10.5H5A1.5 1.5 0 0 1 3.5 9V5A1.5 1.5 0 0 1 5 3.5zM15 3.5h4A1.5 1.5 0 0 1 20.5 5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13.5 9V5A1.5 1.5 0 0 1 15 3.5zM5 13.5h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9 20.5H5A1.5 1.5 0 0 1 3.5 19v-4A1.5 1.5 0 0 1 5 13.5zM15 13.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4a1.5 1.5 0 0 1 1.5-1.5z"/>',
  "aufklappen": '<path d="m6 9 6 6 6-6"/>',
  "bild": '<path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 17l5-5 4 4 3-3 6 6M14.5 9.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0"/>',
  "datei": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5"/>',
  "datei-beschaedigt": '<path d="M14 3H7a2 2 0 0 0-2 2v6l3 2-3 2v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5M11 13l3-2"/>',
  "datei-geschuetzt": '<path d="M7.5 11h9a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5v-5A2.5 2.5 0 0 1 7.5 11zM8 11V8a4 4 0 0 1 8 0v3M12 15v2"/>',
  "datei-unbekannt": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5M10 12.5a2 2 0 1 1 2.7 1.9c-.4.2-.7.5-.7 1v.3M12 18.5h.01"/>',
  "drehen": '<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8M21 3v5h-5"/>',
  "einpassen": '<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/>',
  // Haken im Kreis: "Dein Ergebnis · schon gespeichert" (Nachtrag A2).
  "erledigt": '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M8 12.5l2.8 2.8L16 10"/>',
  "fehler": '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M15 9l-6 6M9 9l6 6"/>',
  // Blatt mit gefüllter Fläche: "Ganze Seite schwärzen" (Nachtrag S8).
  "ganze-seite": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5"/><rect x="7.5" y="10" width="9" height="8.5" rx="1" fill="currentColor"/>',
  "geraet": '<path d="M8.5 2h7A2.5 2.5 0 0 1 18 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 19.5v-15A2.5 2.5 0 0 1 8.5 2zM10.5 18h3"/>',
  "geraet-pc": '<path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 20h8M12 16v4"/>',
  "haken": '<path d="M5 12.5l4.5 4.5L19 7"/>',
  "herauszoomen": '<path d="M4 11a7 7 0 1 0 14 0a7 7 0 1 0-14 0M20 20l-3.5-3.5M8 11h6"/>',
  "hineinzoomen": '<path d="M4 11a7 7 0 1 0 14 0a7 7 0 1 0-14 0M20 20l-3.5-3.5M11 8v6M8 11h6"/>',
  "hinzufuegen": '<path d="M12 5v14M5 12h14"/>',
  "info": '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 11v5M12 8h.01"/>',
  "loeschen": '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  "lupe": '<path d="M4 11a7 7 0 1 0 14 0a7 7 0 1 0-14 0M20 20l-3.5-3.5M11 8v6M8 11h6"/>',
  "mehr": '<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/>',
  "offline": '<path d="M2 2l20 20M8.5 16.4a5 5 0 0 1 7 0M5 12.6a10 10 0 0 1 5.2-2.6M19 12.6a10 10 0 0 0-2.4-1.7M2 8.8a15 15 0 0 1 4.3-2.7M10.7 5.1A15 15 0 0 1 22 8.8M12 20h.01"/>',
  "pfeil-rechts": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  "rueckgaengig": '<path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  "schliessen": '<path d="M6 6l12 12M18 6 6 18"/>',
  "schloss": '<path d="M7.5 11h9a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5v-5A2.5 2.5 0 0 1 7.5 11zM8 11V8a4 4 0 0 1 8 0v3"/>',
  // Der Balken ist gefüllt (HANDOFF-Nachtrag Kap. 10).
  "schwaerzen": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5M8.5 17.5h7"/><rect x="8" y="11" width="8" height="3" rx=".8" fill="currentColor"/>',
  "seiten-raster": '<rect x="4" y="3" width="6.5" height="8" rx="1.3"/><rect x="13.5" y="3" width="6.5" height="8" rx="1.3"/><rect x="4" y="13" width="6.5" height="8" rx="1.3"/><rect x="13.5" y="13" width="6.5" height="8" rx="1.3"/>',
  "seiten-ordnen": '<path d="M4.5 3h5A1.5 1.5 0 0 1 11 4.5v7A1.5 1.5 0 0 1 9.5 13h-5A1.5 1.5 0 0 1 3 11.5v-7A1.5 1.5 0 0 1 4.5 3zM14.5 11h5a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-5a1.5 1.5 0 0 1-1.5-1.5v-7a1.5 1.5 0 0 1 1.5-1.5zM15 3h2a3 3 0 0 1 3 3v1M18 5.5 20 7.5 22 5.5M9 21H7a3 3 0 0 1-3-3v-1M6 18.5 4 16.5 2 18.5"/>',
  "speichern": '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  "stift": '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
  "suchen": '<path d="M4 11a7 7 0 1 0 14 0a7 7 0 1 0-14 0M20 20l-3.5-3.5"/>',
  "tauschen": '<path d="M5 9l-3 3 3 3M19 9l3 3-3 3M2 12h20"/>',
  // Glühbirne: Tipp-Zeile auf "Gespeichert ✓" (Nachtrag A1a).
  "tipp": '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  "trennen": '<path d="M3 6a3 3 0 1 0 6 0a3 3 0 1 0-6 0M3 18a3 3 0 1 0 6 0a3 3 0 1 0-6 0M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>',
  "umwandeln": '<path d="M21 12a9 9 0 0 0-15.5-6.2L3 8M3 3v5h5M3 12a9 9 0 0 0 15.5 6.2L21 16M21 21v-5h-5"/>',
  "verkleinern": '<path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" stroke-dasharray="2.2 2.4" opacity=".6"/><path d="M7 12.5h3.5l2 2V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4.5a2 2 0 0 1 2-2zM18.5 5.5 13.5 10.5M13.5 6.5v4h4"/>',
  "verschieben": '<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>',
  "warnung": '<path d="M12 3 2 21h20L12 3zM12 10v5M12 18h.01"/>',
  "weiter": '<path d="M9 18l6-6-6-6"/>',
  "wiederholen": '<path d="M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  "zurueck": '<path d="M15 18l-6-6 6-6"/>',
  "zusammenfuehren": '<path d="M8 17H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2M16 6h-6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10l-4-4zM16 6v4h4M11 14.5h6M11 18h4"/>',
};

// Icon als SVG-Element. Kleine Größen brauchen einen kräftigeren Strich
// (Design: 16–20 px → 2–2,2).
export function icon(name, groesse = 24, strich = 1.8) {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("width", groesse);
  s.setAttribute("height", groesse);
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("fill", "none");
  s.setAttribute("stroke", "currentColor");
  s.setAttribute("stroke-width", strich);
  s.setAttribute("stroke-linecap", "round");
  s.setAttribute("stroke-linejoin", "round");
  s.setAttribute("aria-hidden", "true");
  s.innerHTML = PFADE[name] || "";
  return s;
}
