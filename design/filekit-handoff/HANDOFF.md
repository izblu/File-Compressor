# FileKit – Redesign „Nacht“ · Übergabe an die Umsetzung

Dieses Paket enthält alles, um das neue Design von FileKit umzusetzen: Designsystem als fertige CSS-Datei, Icons als SVG, App-Icon, Illustrationen und alle Screens als Referenz-Markup. Dieses Dokument ist die verbindliche Spezifikation; bei Widersprüchen gilt: **dieses Dokument > Referenz-Screens > Designsystem-Boards**.

> **Wichtig:** Nur die Oberfläche wird neu gebaut. Die bestehende Verarbeitungslogik (PDF/Bild verkleinern, zusammenführen, trennen, ordnen, umwandeln) bleibt erhalten und wird an die neue UI angebunden.

---

## 1. Produkt & Ziel

- **FileKit** ist eine installierbare Web-App (PWA). PDFs und Bilder werden **ausschließlich auf dem Gerät** bearbeitet, auch offline.
- Zielgruppe: ganz normale Menschen (Rechnung für ein Formular verkleinern, Scans zu einem PDF verbinden).
- **Mobile-first** (375 px Referenzbreite), am PC muss es ebenfalls gut aussehen.
- Anmutung: ruhig, hochwertig, vertrauenswürdig, feine Animationen. Stilrichtung „Nacht“: tiefes Dunkelblau, leuchtender Akzent, Schrift Manrope.
- **Nur Dunkelmodus.** Der helle Modus wurde verworfen – kein `prefers-color-scheme`-Umschalten bauen.

## 2. Technische Vorgaben (hart)

| Vorgabe | Umsetzung |
|---|---|
| Kein Framework, kein Build-Schritt | Reines HTML/CSS/JavaScript (ES-Module ok, sofern ohne Bundler lauffähig). |
| Farben/Abstände als CSS-Variablen | Alles liegt in `design-system/filekit.css` (Präfix `--fk-`). Keine Hex-Werte im App-Code, außer in SVG-Illustrationen. |
| Nur Dunkel | `<meta name="color-scheme" content="dark">`, `<meta name="theme-color" content="#060a13">`, Manifest `theme_color`/`background_color` = `#060a13`. |
| Icons | Inline-SVG mit `stroke="currentColor"` (Dateien in `icons/`). Keine Icon-Fonts, keine Emojis. |
| Offline | Schrift **Manrope** (SIL OFL 1.1) als lokale WOFF2-Datei mitliefern, **kein Google-Fonts-Link**. Quelle: npm `@fontsource-variable/manrope` (enthält Latin-WOFF2 + Lizenz) oder Google Fonts Download. Lizenzdatei `OFL.txt` mit ausliefern. Im Service Worker cachen. |
| Safe Area | Ohne Browserleiste installiert: `viewport-fit=cover`, Ränder über `env(safe-area-inset-*)` (siehe 4.2). |
| Touch-Flächen | mindestens 44 × 44 px. |
| Bewegung reduzieren | `prefers-reduced-motion: reduce` → nur Überblendungen (bereits in `filekit.css`). |

Schrift-Einbindung (Beispiel):

```css
@font-face {
  font-family: "Manrope";
  src: url("/fonts/manrope-latin-wght-normal.woff2") format("woff2-variations");
  font-weight: 400 800;
  font-style: normal;
  font-display: swap;
}
```

## 3. Paketinhalt

```
HANDOFF.md                      ← dieses Dokument
design-system/filekit.css       ← Tokens + Komponenten + Animationen (produktionsreif, s. 4.2)
icons/*.svg                     ← 33 UI-Icons (24er-Raster, Linie 1,8) + App-Icons
illustrations/dropzone*.svg     ← Dropzone-Illustration Ruhe / Drag-over
referenz/screens/*.dc.html      ← alle Screens als Referenz-Markup (siehe 3.1)
referenz/designsystem/*.dc.html ← Designsystem-Boards (Farben, Typo, Komponenten, Icons, Animationen)
```

### 3.1 Wie die Referenz-Dateien zu lesen sind

Die `.dc.html`-Dateien stammen aus dem Design-Werkzeug und laufen **nicht** eigenständig (sie erwarten eine Laufzeit `support.js`, die nicht Teil des Pakets ist). Sie sind **Markup-Referenz**, nicht zum 1:1-Kopieren:

- Relevant ist der Inhalt von `<x-dc> … </x-dc>`: echtes HTML mit den Klassen aus `filekit.css`. Struktur, Klassen, Texte, Abstände und ARIA-Attribute übernehmen.
- `{{name}}` sind Platzhalter, die im `<script type="text/x-dc">` unter `renderVals()` berechnet werden – dort steht das **Interaktionsverhalten** (z. B. Auswahl, Live-Vorschau der Dateinamen).
- `<sc-for list=… as=…>` = Schleife, `<sc-if value=…>` = Bedingung.
- `<a href="XY.dc.html">` = Navigation im Prototyp → in der App ein Wizard-Schritt/Zustandswechsel, keine echte Seite.
- Inline-`style` mit `padding: 60px …` / `height: 812px` sind Mock-Werte für den 375×812-Rahmen (siehe 4.2).
- Inhalte wie „Vertrag.pdf“, Seitenzahlen, Rechnungspositionen und `.doc`-Strich-Seiten sind **Platzhalter** für echte Daten bzw. echte Seiten-Thumbnails (Canvas/Bild aus pdf.js o. ä.).

## 4. Designsystem

### 4.1 Tokens (Auszug – vollständig in `filekit.css`)

| Gruppe | Token | Wert | Verwendung |
|---|---|---|---|
| Fläche | `--fk-bg` | `#060a13` | Hintergrund (+ Glow `--fk-bg-glow` von oben) |
| | `--fk-surface-1/2/3` | `#0d1424` / `#121b2e` / `#1a2540` | Karten · Sheets/Dialoge · gedrückt/Icon-Kacheln |
| | `--fk-line` / `--fk-line-strong` | Weiß 8 % / 16 % | Ränder |
| Text | `--fk-text` / `--fk-text-2` / `--fk-muted` | `#eef2fb` / `#c3cbdb` / `#8e9ab2` | 17,7 : 1 · 12,1 : 1 · 7,0 : 1 |
| | `--fk-faint` | `#5f6a82` | **nur** Deaktiviertes |
| Akzent | `--fk-accent` | `#2f6bf0` | Haupt-Button (Weiß darauf 4,7 : 1) |
| | `--fk-accent-text` | `#79a2ff` | Akzent als Text/Icon (7,9 : 1) |
| | `--fk-accent-tint` / `--fk-accent-glow` | `#14213f` / `rgba(59,116,255,.45)` | Markierte Karten · Schein |
| Status | `--fk-success-text` / `--fk-warning-text` / `--fk-danger-text` | `#4ade80` / `#fbbf24` / `#f87171` | Ersparnis · Hinweis · Fehler/Löschen |
| Markierung | `--fk-m1 … --fk-m5` | `#f5a524` `#2dd4bf` `#f472b6` `#c4b5fd` `#a3e635` | Ursprungsdatei im Seiten-Editor (Text darauf `#0a1122`); **immer mit Dateinummer**, nie nur Farbe |
| Schrift | `--fk-font` | Manrope | Skala: display 32 · title 24 · h 20 · l 17 · body 15 · s 13 · xs 12 · micro 11 |
| Abstände | `--fk-s-1 … 9` | 4 8 12 16 20 24 32 40 56 | 4er-Raster, Bildschirmrand 20–24 px |
| Radien | `--fk-r-xs … 2xl` | 6 10 14 18 22 28 | Seite · – · Feld · Button · Karte · Sheet/Dropzone |
| Schatten | `--fk-sh-1/2/glow/lift/btn` | | Kachel · Sheet · Vorschau · gezogene Seite · Button |
| Bewegung | `--fk-ease-out/sheet/io/spring`, `--fk-d-*` | | siehe Kapitel 8 |

### 4.2 `filekit.css` in der App verwenden – drei Anpassungen

Die Datei ist produktionsreif, enthält aber drei Mock-Werte aus dem Design-Werkzeug:

1. **Safe Area:** In `:root` `--fk-safe-top: 47px; --fk-safe-bottom: 34px;` ersetzen durch
   `--fk-safe-top: env(safe-area-inset-top, 0px); --fk-safe-bottom: max(env(safe-area-inset-bottom, 0px), 16px);`
   und im Viewport-Meta `viewport-fit=cover` setzen. Der Startscreen nutzt im Mock feste `padding: 60px 24px 30px` → in der App `calc(var(--fk-safe-top) + 13px) 24px calc(var(--fk-safe-bottom) + 12px)`.
2. **`.fk-app`** ist im Mock fest 375 × 812. In der App: `width: 100%; max-width: 480px; margin: 0 auto; min-height: 100dvh; height: 100dvh;` (Wizard-Schritte scrollen in `.fk-body`, das Dock bleibt unten).
3. **`.fk-page`** (PC-Layout) nutzt `min-height: 100vh` → `100dvh`.

### 4.3 Komponenten → Klassen

| Komponente | Klassen | Hinweise |
|---|---|---|
| Kopfzeile ab Schritt 2 | `.fk-top` > `.fk-top-row` (Zurück · `.fk-top-title` mit `<b>` Titel + `<span>` „Schritt 2 von 3“ · Abbrechen) + `.fk-progress > i` (Breite = Fortschritt) | `role="progressbar"` + `aria-valuenow` |
| Dock (Daumen-Zone) | `.fk-dock` | Genau **ein** Haupt-Button („Weiter“, im letzten Schritt „Speichern“) |
| Buttons | `.btn` + `.btn-primary / -secondary / -ghost / -danger`, `.btn-block`, `.btn-sm`, `.btn-link` | Zustände: `:active`/`.is-pressed`, `:disabled`, `.is-working` (+ `.spinner`, `aria-busy`) |
| Geteilter Button | `.split` > `.split-main` · `.split-div` · `.split-more` | ▾-Teil 58 px breit (mind. 48), `aria-label="Weitere Aktionen"` |
| Icon-Button | `.icon-btn` (+ `.glass`, `.is-on`) | immer `aria-label` |
| Options-Karte | `.opt` (+ `.is-selected`, `.is-disabled`), `.opt-main/.opt-title/.opt-sub`, `.radio` | als `role="radio"` in `role="radiogroup"` |
| Umschalter | `.seg` > Buttons, aktiv `.is-on` | Qualität / Zielgröße |
| Chips | `.chip` (+ `.is-on`) | Zielgrößen |
| Badges | `.badge` + `-accent/-success/-warning`, `.badge-big`, `.tag` | „empfohlen“, „Vorschlag“, „−77 %“, „PDF“ |
| Hinweis | `.note` (+ `-warning`, `-danger`) | |
| Dateiname-Feld | `.field` > `label` + `.field-box` (`input` + `.field-ext` mit fester Endung) + `.field-hint`; Live-Vorschau `.namelist` | Endung nicht editierbar |
| Dropzone | `.dz-ring` > `.dz` (+ `.dz-halo`, `.dz-art`), Drag-over: `.dz-ring.is-over` | umlaufende Lichtkante via `@property --fk-ang` |
| Vorschau | `.preview`, `.preview-halo`, `.preview-page`, `.pill` | |
| Seiten-Kachel | `.tile` (+ `.is-selected`, `.is-dragging`, `.is-rotated`), `.tile-page`, `.tile-band` + `.bg-m1…5`, `.tile-foot`, `.tile-num`, `.tile-check`, `.tile-rot`, Platzhalter `.tile-slot`, `.tile-add` | |
| Markierung & Legende | `.marker.bg-mN`, `.legend` | |
| Werkzeugleiste | `.toolbar`, `.viewtoggle` | 2 Spalten / 1 Spalte |
| Auswahl-Leiste | `.selbar` (3 Buttons, `.danger`) | Verschieben · Drehen · Löschen |
| Bottom Sheet | `.scrim` + `.sheet` > `.sheet-handle`, `.sheet-head`, `.mrow` (+ `.is-suggested`, `.is-disabled` mit `.mrow-why`, `.danger`, `.compact`), `.sep` | `role="dialog"`, Fokus-Falle, Esc/Scrim/Wischen schließt |
| Dialog | `.scrim` + `.dialog` | `role="alertdialog"` |
| Toast | `.toast` (heller Toast auf Dunkel) | `role="status"`, 5 s sichtbar |
| Coach-Mark | `.coach` + `.coach-arrow`, Ring `.pulse` | |
| Vertrauens-Leiste | `.trust` | |

## 5. Verbindliche Begriffe

| Begriff | Bedeutung | Beispiele |
|---|---|---|
| **Wählen / Hinzufügen** | Datei vom Gerät in die App holen | „Datei wählen“, „Weitere Dateien hinzufügen“, „Wird geöffnet …“ |
| **Verarbeiten** | App arbeitet | „Wird verkleinert …“, „Wird zusammengeführt …“ |
| **Speichern** | Ergebnis aufs Gerät schreiben – **nur im letzten Schritt** | „Speichern“, „Alle speichern (3)“, „Gespeichert ✓“ |

**Nicht verwenden:** „Laden“, „Herunterladen“, „Download“, „Upload“ – auch nicht in `aria-label`, `title` oder Fehlermeldungen.

## 6. Ablauf (Wizard mit Verzweigungen)

Keine Tab-Leiste, kein Menü – es geht immer mit der Datei los. Ein einziger Wizard, Zustand z. B. `{ files[], action, step, options, dirty }`.

```
Start (leer) ──Datei wählen──► Start (1 Datei | mehrere) ──geteilter Button──► Aktion
   │                                    │ ▾ → Aktionen-Menü (Bottom Sheet)
   └─ Fehler (geschützt/beschädigt/Format)

Verkleinern     : 2/3 Stärke wählen ─► Verarbeiten ─► 3/3 Speichern ─► Gespeichert ✓
Zusammenführen  : 2/3 Seiten anordnen ─► 3/3 Speichern ─► (Verarbeiten) ─► Gespeichert ✓
Seiten ordnen   : 2/3 Seiten anordnen ─► 3/3 Speichern ─► (Verarbeiten) ─► Gespeichert ✓
Trennen         : 2/3 Seiten auswählen ─► 3/3 Speichern ─► (Verarbeiten) ─► Gespeichert ✓
Umwandeln       : 2/2 Speichern (Format) ─► (Verarbeiten) ─► Gespeichert ✓
```

- Schritt 1 ist immer „Datei wählen“ (Startscreen) – daher beginnt die Anzeige bei „Schritt 2 von N“.
- **Verkleinern** verarbeitet vor dem Speichern-Schritt (weil das Ergebnis „8,4 MB → 1,9 MB“ angezeigt wird). Bei den anderen Aktionen wird nach Tipp auf „Speichern“ verarbeitet; dauert das > 400 ms, den Verarbeiten-Screen bzw. `.btn.is-working` zeigen.
- **Zurück-Pfeil:** einen Schritt zurück, Eingaben bleiben erhalten.
- **Abbrechen (×):** zurück zum Startscreen. Wurde schon etwas bearbeitet (`dirty`: Seiten verschoben/gedreht/gelöscht/ausgewählt, Name geändert), erst Rückfrage „Bearbeitung abbrechen?“ (Screen 20c). Sonst sofort.
- Browser-Zurück (Android-Geste) = Zurück-Pfeil (History-State je Schritt).
- „Noch eine Datei bearbeiten“ setzt alles zurück auf Start (leer).

### 6.1 Aktionen-Menü – Regeln

Vorschlag auf dem geteilten Button: **1 Datei → Verkleinern**, **mehrere Dateien → Zusammenführen**. Reihenfolge im Menü immer gleich: Verkleinern · Zusammenführen · Trennen · Seiten ordnen · Umwandeln. Unpassende Aktionen bleiben sichtbar, sind ausgegraut und nennen den Grund.

| Auswahl | Verkleinern | Zusammenführen | Trennen | Seiten ordnen | Umwandeln |
|---|---|---|---|---|---|
| 1 PDF | ✓ **Vorschlag** | ✓ (weitere Dateien im Editor) | ✓ | ✓ | ✓ JPG/PNG |
| 1 Bild | ✓ **Vorschlag** | ✓ (wird PDF) | ✗ „Nur für PDFs“ | ✗ „Nur für PDFs“ | ✓ |
| mehrere, nur Bilder | ✓ (jede einzeln) | ✓ **Vorschlag** | ✗ „Nur für ein einzelnes PDF“ | ✗ „Nur für ein einzelnes PDF“ | ✓ |
| mehrere, mit PDF | ✓ (jede einzeln) | ✓ **Vorschlag** | ✗ „Nur für ein einzelnes PDF“ | ✗ „Nur für ein einzelnes PDF“ | ✗ „Nur für Bilder oder ein einzelnes PDF“ |

### 6.2 Dateinamen-Vorschläge

Eingabefeld mit Vorschlag, Endung fest dahinter. Unerlaubte Zeichen (`/ \ : * ? " < > |`) beim Speichern ersetzen, leeres Feld → Vorschlag verwenden.

| Aktion | Vorschlag |
|---|---|
| Verkleinern | `{Name}_klein.{ext}` |
| Zusammenführen | `Zusammengeführt.pdf` |
| Seiten ordnen | `{Name}_geordnet.pdf` |
| Trennen – eine Datei | `{Name}_Seiten_3-4-7.pdf` |
| Trennen – je Seite | `{Name}_Seite3.pdf`, `{Name}_Seite4.pdf`, … (Live-Vorschau unter dem Feld) |
| Umwandeln (mehrseitig) | `{Name}_Seite1.jpg … {Name}_Seite12.jpg` (Vorschau: erste zwei · … · letzte) |
| Umwandeln (einseitig) | `{Name}.{neue Endung}` |

Unter dem Feld: „Wird als neue Datei gespeichert – das Original bleibt unverändert.“

## 7. Screens

Nummern = Referenzdateien in `referenz/screens/`. Mobile 375 px, PC siehe 21a/21b.

| Nr | Datei | Inhalt & Verhalten |
|---|---|---|
| 1 | `01-Start-leer` | Logo + Name, Claim „Deine PDFs & Bilder – bearbeitet auf **deinem Gerät.**“ (letzte Worte in Akzent), Dropzone „Datei wählen“ / „PDF oder Bild – auch mehrere“ (öffnet `<input type="file" multiple accept="application/pdf,image/*">`). Darunter reine Info, **nicht klickbar**: 5 Aktionen mit Icon, umbrechend 3 + 2, zentriert. Unten Vertrauens-Leiste „privat · offline · Nichts verlässt dein Gerät“. |
| 3 | `03-Eine-Datei` | Dropzone verwandelt sich in Vorschau (1. Seite / Bild). **Oben in der Vorschau-Karte:** Tag „PDF“, Dateiname, Größe (z. B. „8,4 MB“); unten links Pill „Seite 1 von 12“; oben rechts × (Datei entfernen → Start). Darunter „+ Weitere Dateien hinzufügen“. Geteilter Button gleitet ein. |
| 4 | `04-Mehrere-Dateien` | Vorschau-Karte über volle Breite: oben „3 Dateien · 4,7 MB“ + „2 Bilder, 1 PDF“; darunter horizontaler Streifen: je Datei Name + Größe **über** der Miniatur, Pill „1 Seite“/„3 Seiten“, × je Datei. Vorschlag „Zusammenführen“. |
| 5 / 5b | `05-Aktionen-PDF`, `05b-Aktionen-mehrere` | Bottom Sheet „Was möchtest du tun?“ + Unterzeile (Datei/Anzahl), 5 Zeilen mit Icon, Titel, einem Satz; Vorschlag markiert (`.is-suggested` + Badge „Vorschlag“); unpassende ausgegraut mit Grund (6.1). |
| 6 | `06-Hinweis` | Wie 3, plus einmaliger Coach-Mark „Weitere Aktionen“ am ▾ (nach 900 ms), ▾ pulsiert. „Verstanden“ oder Tipp auf ▾ schließt ihn; Merker in `localStorage`, danach nie wieder. |
| 7 / 7b | `07-Staerke-Qualitaet`, `07b-Staerke-Zielgroesse` | „Wie stark verkleinern?“ · Dateizeile · Umschalter Qualität/Zielgröße. Qualität: Stark „kleinste Datei“ · **Mittel „gute Balance“ + „empfohlen“ (Standard)** · Schonend „beste Qualität“. Zielgröße: Chips 500 KB · 1 MB · **2 MB (Standard)** · 5 MB · „Eigener Wert“ (zeigt Feld mit fester Einheit „MB“); Satz „FileKit versucht, die Datei unter 2 MB zu bringen.“ Bei PDFs Hinweis „Text ist danach nicht mehr markierbar.“ Zielgrößen ≥ aktueller Größe ausblenden oder deaktivieren. |
| 8 | `08-Verarbeiten` | Ring-Fortschritt um die Seiten-Miniatur, „Wird verkleinert …“, „Seite 3 von 12 · 25 %“ (`aria-live`), Segmentleiste je Seite, Button „Abbrechen“ (sekundär) → zurück zu Schritt 2. Bei mehreren Dateien: „Datei 2 von 3“. Wechselt automatisch weiter. |
| 9 | `09-Speichern-Verkleinern` | Ergebnis-Karte: „8,4 MB → **1,9 MB**“ + Badge „−77 %“, Vorher/Nachher-Balken (animiert). Ausgabe-Zeile „Stärke: Mittel · PDF“ + „Ändern“. Dateiname-Feld. Button „Speichern“ (mehrere Dateien: „Alle speichern (3)“, Ergebnis je Datei als Liste). |
| 9b | `09b-Zielgroesse-nicht-erreicht` | Ehrliche Variante: Balken mit Ziel-Markierung, Warn-Hinweis „Zielgröße nicht erreicht – Kleiner als 2,6 MB geht bei dieser Datei nicht, ohne dass der Text unleserlich wird …“, Ghost-Button „Andere Zielgröße wählen“ + „Speichern“. |
| 10 | `10-Seiten-anordnen` | „Seiten anordnen“ (Zusammenführen). Legende der Ursprungsdateien, Werkzeugleiste: „5 Seiten“ · „Auswählen“ · Ansicht 2/1 Spalten. 2-Spalten-Raster großer Kacheln mit farbiger Markierung + Dateinummer, „Seite N“, ⋯-Menü. Zustände: normal · markiert · **wird gezogen** (angehoben, −2,5°, Schatten, Platzhalter gestrichelt) · gedreht (Badge „90°“). Kachel „+ Weitere Dateien hinzufügen“ am Ende. |
| 10b | `10b-Eine-Spalte` | 1-Spalten-Ansicht: Seite so groß, dass man Text lesen kann. |
| 10c | `10c-Seiten-ordnen` | Seiten ordnen (eine Datei): wie 10, ohne Legende/Markierung, „Vertrag.pdf · 12 Seiten“. |
| 11 | `11-Mehrfachauswahl` | Auswahlmodus: Kopfzeile „3 ausgewählt“ mit × (beenden) und „Alle/Keine“; Kacheln mit Haken; Dock wird Auswahl-Leiste Verschieben · Drehen · Löschen. Drehen dreht alle markierten um 90°. |
| 12 | `12-Seitenmenue` | Bottom Sheet pro Seite: Kopf mit Miniatur + „Seite 3 · aus Rechnung.pdf“; Vergrößert ansehen (Lupe) · Drehen · An den Anfang · Ans Ende · (Trenner) · Löschen (rot). |
| 13 | `13-Vollbild` | Vollbild schwarz, Seite groß, „Seite 3 von 5“ + Marker, Wischen links/rechts (Pointer-Events, Schwelle 40 px) + Pfeil-Buttons + Punkte. × schließt. |
| 14 | `14-Toast` | Nach Löschen: Toast „Seite gelöscht“ + „Rückgängig“ über dem Dock; übrige Kacheln rutschen nach. |
| — | `10s-Speichern-Zusammen`, `10t-Speichern-Ordnen` | Speichern-Schritt: Ergebnis-Karte („1 PDF mit 5 Seiten · aus 3 Dateien“ bzw. Änderungs-Badges „Reihenfolge geändert“, „1 Seite gedreht“), Ausgabe „Format: PDF“, Dateiname, „Speichern“. |
| 15 | `15-Trennen-Auswahl` | „Seiten auswählen“: Raster, Antippen = Haken, „Alle“/„Keine“, Zähler „3 von 12 ausgewählt“ (`aria-live`). „Weiter“ deaktiviert bei 0. |
| 16 | `16-Trennen-Speichern` | Zwei Options-Karten nebeneinander mit Mini-Grafik: „Ausgewählte Seiten in einer Datei“ (3 Seiten → 1 PDF) · „Jede Seite als eigene Datei“ (3 Seiten → 3 PDFs). Dateiname mit **Live-Vorschau** aller entstehenden Namen. Button „Speichern“ bzw. „Alle speichern (3)“. |
| 17 | `17-Umwandeln-Speichern` | „Schritt 2 von 2“. Format-Karten PDF „für Dokumente“ · JPG „klein, für Fotos“ · PNG „verlustfrei, mit Transparenz“; das Ausgangsformat ist deaktiviert („Ist bereits ein PDF“). Hinweis „Jede der 12 Seiten wird ein eigenes Bild.“ Endung im Feld wechselt mit dem Format. |
| 18 | `18-Gespeichert` | Erfolgsmoment: Kreis ploppt auf, Haken zeichnet sich, Ring + 8 Funken; „Gespeichert“, „Die Datei liegt jetzt auf deinem Gerät.“, Datei-Karte (Name, Größe, ggf. Ersparnis-Badge). Button „Noch eine Datei bearbeiten“. Inhalt der Karte je Aktion anpassen (bei mehreren: „3 Dateien gespeichert“). |
| 20a | `20a-Fehler-Datei` | Fehlerkarte statt Dropzone (+ kurzes Schütteln): geschützt „Diese Datei ist geschützt – Das PDF hat ein Passwort …“ bzw. beschädigt „Datei lässt sich nicht öffnen …“. Button „Andere Datei wählen“. |
| 20b | `20b-Fehler-Format` | „Dieses Format geht leider nicht – FileKit kann PDFs und Bilder (z. B. JPG, PNG) öffnen.“ (Formatliste an die echte Unterstützung anpassen). |
| 20c | `20c-Abbrechen` | Dialog „Bearbeitung abbrechen?“ – „Weiter bearbeiten“ (primär) · „Änderungen verwerfen“ (sekundär, rote Schrift). |
| 21a | `21a-PC-Start` | PC ≥ 1024 px: zweispaltig – links Claim (bis 56 px) + Aktionen-Liste, rechts große Dropzone mit „oder hierher ziehen“; Vertrauens-Leiste oben rechts. **Drag-over:** Rand voll Akzent, Fläche heller, gestrichelte Innenlinie, Illustration hebt sich, Text „Loslassen zum Öffnen“ / „Die Datei bleibt auf deinem Gerät.“ Drop auf die ganze Seite erlauben. |
| 21b | `21b-PC-Editor` | Seiten-Editor am PC: Kopfzeile mit Schrittanzeige, Raster `auto-fill, minmax(190px, 1fr)` (4–5 Spalten), Einfüge-Linie beim Ziehen, Fußleiste „8 Seiten aus 5 Dateien“ + „Weiter“ rechts. |

**PC-Ansicht für alle übrigen Schritte:** dieselben Screens in einer zentrierten Spalte (`max-width: 480px`), Dock unten in der Spalte. Nur Start und Seiten-Editor nutzen die volle Breite.

## 8. Animationen

Nur `transform` und `opacity`. Klassen und Keyframes liegen in `filekit.css` (`.in-card`, `.in-page`, `.in-halo`, `.in-up`, `.in-dock`, `.in-step`, `.in-step-back`, `.d1…d6`, `.sheet`, `.toast`, `.coach`, `.dialog`).

| Moment | Dauer (ms) | Kurve | Was passiert | Bewegung reduzieren |
|---|---|---|---|---|
| Dropzone Ruhe | 5000 / 7000 Schleife | ease-in-out / linear | Illustration schwebt ±5 px, Halo atmet, Lichtkante umrundet den Rand | alles still |
| Dropzone Drag-over | 200 · 600 | ease-out · spring | Rand Akzent, Scale 1,02, Illustration hebt sich 12 px, „+“ → Pfeil | nur Farbe |
| Dropzone → Vorschau | 520 (+80/+120/+180) | ease-out | Karte 0,95→1; Seite aus 10 px/0,92; Halo wächst (900); Metadaten folgen | Überblendung 200 |
| Geteilter Button ein | 560 (+260) | sheet | von unten (120 %) | Überblendung |
| Coach-Mark | 460 (+900), Puls 1800 | spring | ploppt aus dem ▾ | ohne Puls |
| Schritt vor/zurück | 320 | ease-out | Inhalt ±28 px seitlich, Kopfzeile steht, Fortschritt wächst | Überblendung |
| Bottom Sheet | 480 auf · 280 zu | sheet · io | von unten, Abdunklung 320 | Überblendung |
| Button-Druck | 120 · 200 los | ease-out | Scale 0,98, dunkler | nur Farbe |
| Seite anheben | 200 | spring | Scale 1,06, −2,5°, Lift-Schatten + Ring | nur Ring |
| Nachrutschen | 340 (+40 versetzt) | io | FLIP-Technik | sofort |
| Seite drehen | 320 | io | 90° + Scale 0,707 | sofort |
| Verarbeiten | 420 je Seite · 900 Schleife | ease-out · io | Ring füllt sich, Scan-Strahl | Ring + Zahl |
| Gespeichert ✓ | 460 · 380 (+280) · 760 | spring · ease-out | Kreis, Haken zeichnet, Ring + Funken, Button nach 520 | Haken sofort |
| Toast | 420 ein · 200 aus (5 s) | sheet | 24 px hoch | Überblendung |
| Fehler | 420 + 420 | ease-out | Karte erscheint, Schütteln ±5 px | kein Schütteln |

Kurven: ease-out `cubic-bezier(.2,.8,.2,1)` · sheet `(.32,.72,0,1)` · io `(.65,0,.35,1)` · spring `(.34,1.45,.64,1)`.
Die Dropzone→Vorschau-Verwandlung kann alternativ mit der View Transitions API (`document.startViewTransition`, mit Fallback) umgesetzt werden.

## 9. Seiten-Editor – Interaktion

- **Ziehen:** Pointer Events. Touch: Long-Press 250 ms hebt an (kurze Vibration `navigator.vibrate(10)` falls verfügbar), Maus: sofort nach 4 px Bewegung. Platzhalter `.tile-slot`, andere Kacheln rutschen per FLIP nach. Auto-Scroll am oberen/unteren Rand. Am PC zusätzlich Einfüge-Linie.
- **Alternative ohne Ziehen (Barrierefreiheit):** ⋯-Menü „An den Anfang“ / „Ans Ende“, Auswahlmodus „Verschieben“; per Tastatur: Kachel fokussieren, Leertaste hebt an, Pfeiltasten verschieben, Leertaste setzt ab, Esc bricht ab (Ansage über `aria-live`).
- **Mehrfach-Auswahl:** über „Auswählen“ (oder Long-Press ohne Bewegung > 500 ms). „Verschieben“ in der Auswahl-Leiste → danach Ziel antippen („Hier einfügen“).
- **Löschen** immer mit Toast „Rückgängig“ (5 s), keine Rückfrage.
- **Ansicht 2/1 Spalten** in `localStorage` merken.
- Markierungsfarben nach Reihenfolge der Dateien m1…m5; ab der 6. Datei wiederholen, Dateinummer bleibt eindeutig.

## 10. Icons & App-Icon

- `icons/*.svg`: 24 × 24, `stroke-width 1.8`, runde Enden/Ecken, `currentColor`. Im Markup inline einfügen (Größe 16–26 px, Strichstärke bei kleinen Größen 2–2,2).
- `verkleinern.svg` besteht aus zwei Pfaden (gestrichelter Rahmen mit 60 % Deckkraft + kleines Blatt mit Pfeil) – beide übernehmen.
- **App-Icon:** `app-icon.svg` (Verlauf + Lichtkante, für 180/192/512 px PNG rendern), `app-icon-maskable.svg` (vollflächig, Motiv in der 80-%-Safe-Zone, `"purpose": "maskable"`), `app-icon-klein.svg` (vereinfacht für < 48 px, Favicon).
- Manifest: `"display": "standalone"`, `"theme_color": "#060a13"`, `"background_color": "#060a13"`, Icons 192 + 512 (any) und 512 (maskable); `apple-touch-icon` 180 px.

## 11. Barrierefreiheit (Abnahmekriterien)

- Kontraste wie in 4.1 (Text ≥ 4,5 : 1). `--fk-faint` nur für Deaktiviertes.
- Echte `<button>`, `<a>`, `<input>` + `<label>`; Icon-Buttons mit `aria-label`.
- Auswahlen als `radiogroup`/`radio` bzw. `aria-pressed`; Fortschritt `role="progressbar"`; Zähler und Verarbeiten-Status `aria-live="polite"`.
- Sheets/Dialoge: Fokus hinein, Fokus-Falle, Esc schließt, Fokus zurück zum Auslöser.
- Fokus-Ring sichtbar (`:focus-visible`, `--fk-focus`).
- Markierungen nie nur über Farbe (Dateinummer im Marker).
- `prefers-reduced-motion` respektieren (in `filekit.css` vorbereitet; Ziehen/FLIP im JS ebenfalls abschalten).

## 12. Empfohlenes Vorgehen

1. **Grundlage:** `filekit.css` einbinden (mit den 3 Anpassungen aus 4.2), Manrope lokal + `@font-face`, Meta-Tags/Manifest/Icons, Service Worker cached Schrift + CSS.
2. **Startscreen:** leer, Drag-over (PC), 1 Datei, mehrere Dateien, Fehlerzustände, geteilter Button, Aktionen-Menü inkl. Regeln 6.1, einmaliger Hinweis.
3. **Wizard-Rahmen:** Zustandsmodell, Kopfzeile mit Schritt-Anzeige, Dock, Zurück/Abbrechen/Rückfrage, Schrittwechsel-Animation, History-Handling.
4. **Flows** in dieser Reihenfolge: Verkleinern → Umwandeln → Trennen → Zusammenführen/Seiten ordnen (Editor zuletzt, weil am aufwendigsten).
5. **Gespeichert ✓** und Speichern-Mechanik (File System Access API mit Fallback auf `<a download>` – im UI trotzdem nur „Speichern“ sagen).
6. **PC-Layout** (Start, Editor, zentrierte Spalte für den Rest).
7. **Prüfung:** 375 px und 1280 px, Tastatur-Bedienung, Screenreader-Stichprobe, Bewegung reduzieren, Offline (Flugmodus) und installierte PWA (Safe Area).

## 13. Offene Punkte (vor/bei Umsetzung klären)

1. **Ausgabe-Optionen** bei Zusammenführen / Seiten ordnen: derzeit nur „Format: PDF“. Gewünscht z. B. „danach gleich verkleinern“?
2. **Unterstützte Formate:** Fehlertext 20b nennt „PDFs und Bilder (z. B. JPG, PNG)“ – an tatsächliche Unterstützung anpassen (HEIC? WebP?).
3. **Umwandeln mit mehreren Bildern:** ein PDF pro Bild oder ein gemeinsames PDF? (Design zeigt nur 1 PDF → Bilder.)
4. **Verkleinern mit mehreren Dateien:** Speichern-Screen als Liste je Datei ist beschrieben, aber nicht gezeichnet – nach Muster von Screen 9 umsetzen.
5. **„Gespeichert ✓“:** Karteninhalt je Aktion (im Design mit Verkleinern-Ergebnis gezeigt).
