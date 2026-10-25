# FileKit – Nachtrag „Schwärzen & Weiterbearbeiten“ · Übergabe an die Umsetzung

Dieser Nachtrag ergänzt das bestehende Paket `filekit-handoff/` (Designsystem „Nacht“). Er enthält **nur Neues und Geändertes**. Alles, was hier nicht steht, gilt unverändert aus dem ersten `HANDOFF.md`. Die Kapitel-Nummern entsprechen dem ersten Dokument, damit du Ergänzungen leicht zuordnen kannst.

Bei Widersprüchen gilt: **dieser Nachtrag > erstes HANDOFF > Referenz-Screens > Designsystem-Boards**.

Der Nachtrag hat zwei Teile:

- **Teil A „Weiterbearbeiten“:** Nach „Gespeichert ✓“ kann man das Ergebnis direkt weiterbearbeiten, ohne es neu zu wählen.
- **Teil B „Schwärzen“:** eine neue Aktion. Sie macht Stellen in einem PDF oder Bild unkenntlich, und zwar endgültig: Der Inhalt darunter wird entfernt, nicht nur überdeckt.

> **Wichtig:** Das Designsystem „Nacht“ bleibt, wie es ist. `filekit.css` wird **nicht** verändert. Alles Neue steht in `design-system/filekit-ergaenzung.css`; diese Datei wird **nach** `filekit.css` eingebunden. Bestehende Klassen werden wiederverwendet, wo immer es geht.

---

## 2. Technische Vorgaben – Ergänzung

Die Vorgaben aus dem ersten HANDOFF gelten unverändert: kein Framework, kein Build-Schritt, Präfix `--fk-`, keine Hex-Werte im Markup außer in SVG-Illustrationen, nur Dunkel, Manrope lokal, Inline-SVG mit `currentColor`, Safe Area, Touch-Flächen mindestens 44 px, `prefers-reduced-motion`.

Neu für Schwärzen:

| Vorgabe | Umsetzung |
|---|---|
| Echtes Schwärzen | Stellen werden **in die Pixel gemalt**, nie als Vektor-Rechteck darübergelegt. PDF: jede Seite rendern (pdf.js o. ä., Vorschlag 200 dpi), schwarze Rechtecke malen und als Bild-PDF neu aufbauen – ohne Textebene. Bild: auf `<canvas>` malen und neu codieren. Genau das versprechen die Texte im Prüfbericht (Kap. 7, S10). |
| Aufräumen | PDF: Metadaten, Kommentare, Anhänge, Formularfelder und Lesezeichen entfernen. Bild: EXIF/XMP/IPTC verwerfen. Das passiert durch das Neucodieren über Canvas ohnehin; dennoch prüfen. |
| Koordinaten | Stellen in **Prozent der Seite** speichern (`{x, y, w, h}`, 0–100, bezogen auf Breite bzw. Höhe der Seite). So bleiben sie bei Zoom, Drehung des Geräts und beim Rendern in voller Auflösung richtig. |
| Text-Ebene | Für „Wort antippen“ und „Text suchen“ die Textebene von pdf.js nutzen (`getTextContent` + Positionen). Hat das PDF keine Textebene (Scan), sind beide Funktionen aus (S2b). |
| Weiterbearbeiten | Das gespeicherte Ergebnis bleibt als `Blob` im Speicher. Es wird **nicht** neu vom Gerät gewählt. |

## 3. Paketinhalt (Nachtrag)

```
HANDOFF.md                              ← dieser Nachtrag
design-system/filekit-ergaenzung.css    ← nur neue Tokens, Bausteine und Animationen (wird nach filekit.css eingebunden)
icons/*.svg                             ← 8 neue Icons (24er-Raster, Linie 1,8, currentColor)
referenz/screens/*.dc.html              ← alle neuen und geänderten Screens (A1–A4, S1–S12, 12)
referenz/designsystem/S0-Bausteine.dc.html   ← neue Icons, Tokens, Zustände und Bausteine im Überblick
referenz/designsystem/Z-Animationen.dc.html  ← Animationen zum Abspielen + Tabelle
```

Die Referenz-Dateien liest du wie im ersten HANDOFF (Kap. 3.1). Zusätzlich gilt:

- Die Editor-Screens S2–S6 und S12 enthalten eine **lauffähige Interaktions-Referenz** im `<script type="text/x-dc">`: Aufziehen, Antippen, Verschieben, Größe ändern, Löschen mit Toast, Rückgängig/Wiederholen, Tastatur und Ansagen. Die Logik kannst du als Vorlage nehmen. Die Seiteninhalte (Mietvertrag, Max Mustermann …) sind Platzhalter für echte gerenderte Seiten mit Textebene.
- Mehrere Screens teilen sich eine Vorlage und unterscheiden sich nur über ein Prop (`art`, `start`, `v`, `q`, `schon`). Der Standardwert steht jeweils in `data-props`.

## 4. Designsystem – Ergänzung

### 4.1 Neue Tokens (in `filekit-ergaenzung.css`)

| Token | Wert | Verwendung |
|---|---|---|
| `--fk-redact` | `#000000` | Stelle, deckend – genau so wird gespeichert |
| `--fk-redact-sel` | `rgba(0,0,0,.5)` | gewählte Stelle: halb durchsichtig, damit man sie genau ausrichten kann |
| `--fk-redact-ring` | `var(--fk-accent)` | 2-px-Rahmen der gewählten Stelle und des Aufzieh-Rahmens |
| `--fk-redact-draw` | `rgba(0,0,0,.38)` | Rahmen, der gerade aufgezogen wird |
| `--fk-handle` / `--fk-handle-edge` | `#ffffff` / `#0a1122` | Eck-Griffe: hell mit dunklem Rand, sichtbar auf Weiß und auf Schwarz |
| `--fk-paper-shadow` | | Schatten der Seite im Editor |
| `--fk-d-snap` | `160ms` | Stelle rastet ein / wird gelöscht / wird gewählt |
| `--fk-d-stagger` | `60ms` | Versatz beim Schwärzen mehrerer Treffer |
| `--fk-morph-y` | Standard `180px` | Parameter für A5: Abstand von der Datei-Karte zur Vorschau, per JS setzen (siehe Kap. 8) |

### 4.3 Neue Bausteine → Klassen

| Baustein | Klassen | Hinweise |
|---|---|---|
| Werkzeugleiste im Editor | `.tbar` mit `.icon-btn`, Trenner `.tsep`, Seitenknopf `.pgbtn` („2/12“) | sitzt in der Daumen-Zone über dem Dock, 52 px hoch |
| Icon-Button deaktiviert | `.icon-btn:disabled` / `.icon-btn.is-disabled` | **neuer Zustand** für einen bestehenden Baustein (Rückgängig/Wiederholen ohne Schritt, erste/letzte Seite). Die bestehende Regel `.icon-btn` bleibt unverändert. |
| Zeichenfläche | `.canvas-vp` (Ausschnitt) > `.pagewrap` (Seite; Zoom über `transform: translate() scale()`) | `touch-action: none`, Cursor `crosshair` |
| Stelle | `<button class="stelle">` + `.is-sel` (gewählt) · `.is-out` (wird gelöscht) | absolute Position in % der Seite |
| Aufzieh-Rahmen | `.draw` | nur während des Ziehens |
| Auswahl-Rahmen | `.sel-ui` mit vier Griffen `.hdl.tl/.tr/.bl/.br` und Papierkorb `.del` | Griff 12 px sichtbar, Tippfläche 44 px (`::before`); Papierkorb 44 px, Lage siehe Kap. 9 |
| Hinweis auf der Seite | `.hint-ov` (+ `small` für die Zusatzzeile) | nur solange die Datei noch keine Stelle hat |
| Schwebender Knopf | `.float-btn` | „Seite einpassen“, wenn hineingezoomt ist |
| Treffer-Liste | `.hit` (+ `.is-checked`, `.is-done`), `.cbox`, `.hit-pg`, Ausschnitt `.snip` mit `<mark>` | `<mark>` zeigt schwarz, was geschwärzt wird |
| Prüfbericht | `ul.report > li` (Haken-Icon + Text) | |
| Tipp-Hinweis | `.note.note-tip` | Abwandlung des bestehenden `.note` (Akzent-Tönung, Glühbirne bzw. Info-Icon) |
| Ergebnis-Hinweis | `.result-hint` | „Dein Ergebnis · schon gespeichert“ mit grünem Haken |
| Seiten-Miniatur mit Stellen | `.thumb` (+ `.is-current`), schwarze Balken `i`, Zähler `.thumb-badge` | Seitenübersicht S7, PC-Seitenleiste |
| Nur für Screenreader | `.sr-only` | Live-Region im Editor |

**Bestehende Regeln, die sich ändern:** keine. `filekit-ergaenzung.css` überschreibt keine Regel aus `filekit.css`. Sie ergänzt nur neue Klassen, einen neuen Zustand (`.icon-btn:disabled`) und eine Abwandlung (`.note-tip`).

## 5. Verbindliche Begriffe – Ergänzung

| Begriff | Bedeutung | Beispiele |
|---|---|---|
| **Wählen / Hinzufügen** | wie bisher | „Datei wählen“, „Weitere Dateien hinzufügen“, „Wird geöffnet …“ |
| **Verarbeiten** | wie bisher | „Wird geschwärzt …“ |
| **Speichern** | wie bisher – nur im letzten Schritt | „Speichern“, „Gespeichert ✓“ |
| **Schwärzen** | die neue Aktion | „Schwärzen“, „Stellen schwärzen“, „7 Treffer schwärzen“, „7 Stellen geschwärzt“ |
| **Stelle** | ein geschwärzter Bereich | „1 Stelle“, „3 Stellen“, „Stelle löschen“, „Stelle hinzufügen“ |
| **Weiterbearbeiten** | das Ergebnis direkt als neue Ausgangsdatei nehmen | „Diese Datei weiterbearbeiten“, „Diese 3 Dateien weiterbearbeiten“ |
| **Ergebnis** | die eben gespeicherte Datei | „Dein Ergebnis · schon gespeichert“, „3 Ergebnisse · schon gespeichert“, „Ergebnis ansehen“ |
| **Zoom** | Ansicht im Editor | „Hineinzoomen“, „Herauszoomen“, „Seite einpassen“ |

**Nicht verwenden** – auch nicht in `aria-label`, `title`, Ansagen oder Fehlermeldungen:

- „Laden“, „Herunterladen“, „Download“, „Upload“ (wie bisher)
- „markieren“ oder „Markierung“ für Stellen
- „Vergrößern“ oder „Verkleinern“ für Zoom (Verkleinern ist **nur** die Aktion)
- „weiterverarbeiten“, „Zensieren“, „Anonymisieren“

## 6. Ablauf – Ergänzung

```
Start ──Datei wählen──► Start (1 Datei) ──▾──► Aktionen-Menü ──► Schwärzen

Schwärzen      : 2/3 Stellen schwärzen ─► Verarbeiten ─► 3/3 Speichern (mit Prüfbericht) ─► Gespeichert ✓

Gespeichert ✓ (jede Aktion) ──„Diese Datei weiterbearbeiten“──► „Wird geöffnet …“ ─► Start mit Ergebnis (A5-Übergang)
                            └─„Noch eine Datei bearbeiten“──► Start (leer)
```

- **Schwärzen verarbeitet vor dem Speichern-Schritt** (wie Verkleinern), weil der Speichern-Schritt die neue Größe und den Prüfbericht zeigt.
- Schwärzen ist **nur für eine einzelne Datei** (1 PDF oder 1 Bild).
- **Zurück-Pfeil** im Editor → Startscreen mit der gewählten Datei. Die Stellen bleiben im Zustand erhalten, bis die Datei entfernt oder „Abbrechen“ bestätigt wird.
- **Abbrechen (×):** Gibt es mindestens eine Stelle (`dirty`), erst die Rückfrage „Bearbeitung abbrechen?“ (Screen 20c, unverändert). Sonst sofort.
- **Verarbeiten → Abbrechen** führt zurück in den Editor. Alle Stellen sind noch da.

### 6.1 Aktionen-Menü – Regeln (ersetzt die Tabelle aus dem ersten HANDOFF)

Reihenfolge im Menü immer gleich: **Verkleinern · Zusammenführen · Trennen · Seiten ordnen · Umwandeln · Schwärzen**. Schwärzen hat nie den Vorschlag.

Schwärzen im Menü:

- Titel: „Schwärzen“
- Satz: „Namen, Nummern oder andere Stellen unkenntlich machen.“
- Grund, wenn ausgegraut: „Nur für eine einzelne Datei“

| Auswahl | Verkleinern | Zusammenführen | Trennen | Seiten ordnen | Umwandeln | Schwärzen |
|---|---|---|---|---|---|---|
| 1 PDF | ✓ **Vorschlag** | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1 Bild | ✓ **Vorschlag** | ✓ (wird PDF) | ✗ „Nur für PDFs“ | ✗ „Nur für PDFs“ | ✓ | ✓ |
| mehrere, nur Bilder | ✓ (jede einzeln) | ✓ **Vorschlag** | ✗ „Nur für ein einzelnes PDF“ | ✗ „Nur für ein einzelnes PDF“ | ✓ | ✗ „Nur für eine einzelne Datei“ |
| mehrere, mit PDF | ✓ (jede einzeln) | ✓ **Vorschlag** | ✗ „Nur für ein einzelnes PDF“ | ✗ „Nur für ein einzelnes PDF“ | ✗ „Nur für Bilder oder ein einzelnes PDF“ | ✗ „Nur für eine einzelne Datei“ |
| **Ergebnis(se)** nach Weiterbearbeiten | wie oben, aber Vorschlag nur nach der Regel in 6.3 | wie oben, **ohne** Vorschlag | wie oben | wie oben | wie oben | wie oben |

Bei Ergebnissen trägt die Zeile, die den Vorschlag hätte, ihn nur, wenn Regel 6.3 greift. Sonst ist im Menü **nichts** hervorgehoben (A3c, A3d).

### 6.2 Dateinamen-Vorschläge – Ergänzung

| Aktion | Vorschlag |
|---|---|
| Schwärzen | `{Name}_geschwärzt.{ext}` (Bild behält sein Format: `.jpg` bleibt `.jpg`, `.png` bleibt `.png`) |
| Weiterbearbeiten | Die Nachsilbe hängt sich an den Namen des Ergebnisses, z. B. `Vertrag_geschwärzt_klein.pdf`. Dieselbe Nachsilbe nicht doppelt anhängen. |

Unter dem Feld beim Schwärzen **zwei** Zeilen, in dieser Reihenfolge:

1. „Steht im Dateinamen etwas Persönliches? Dann ändere ihn hier.“
2. „Wird als neue Datei gespeichert – das Original bleibt unverändert.“

### 6.3 Weiterbearbeiten – Vorschlag-Regel

Nach „Diese Datei weiterbearbeiten“ steht auf dem geteilten Button **nur dann „Verkleinern“**, wenn das Ergebnis groß ist oder deutlich größer geworden ist. Sonst gibt es **keinen** Vorschlag. Dann steht dort der Haupt-Button „Aktion wählen“ mit ▾, und er öffnet das Menü.

| Fall | Gespeichert ✓ | Startscreen mit Ergebnis |
|---|---|---|
| Ergebnis groß (Vorschlag: ≥ 2 MB) | Tipp: „Tipp: Die Datei ist 6,8 MB groß – du kannst sie gleich verkleinern, z. B. für Online-Formulare.“ | geteilter Button **Verkleinern** · ▾ (A2a / A2b) |
| Ergebnis deutlich größer geworden (Vorschlag: + 50 % **und** ≥ 1 MB) | Tipp: „Tipp: Die Datei ist größer geworden (0,2 MB → 2,4 MB) – du kannst sie gleich verkleinern.“ | geteilter Button **Verkleinern** · ▾ (A2a) |
| letzte Aktion war Verkleinern | kein Tipp | **Aktion wählen** ▾ (A3a) |
| sonst | kein Tipp | **Aktion wählen** ▾ (A3a / A3b) |

Die Schwellenwerte sind ein Vorschlag (siehe Kap. 13). Tipp und Vorschlag folgen immer derselben Regel: Wer den Tipp sieht, sieht auch den Vorschlag.

## 7. Screens – neu und geändert

Dateien in `referenz/screens/`. Mobile 375 × 812, PC 1280 breit.

### Teil A – Weiterbearbeiten

| Nr | Datei | Inhalt & Verhalten |
|---|---|---|
| A1a | `A1a-Gespeichert-Tipp` | **Ersetzt Screen 18.** Erfolgsmoment wie bisher: „Gespeichert“, „Die Datei liegt jetzt auf deinem Gerät.“, Datei-Karte „Zusammengeführt.pdf“ / „5 Seiten · 6,8 MB“. Darunter `.note-tip`: „Tipp: Die Datei ist 6,8 MB groß – du kannst sie gleich verkleinern, z. B. für Online-Formulare.“ Dock: sekundär „Diese Datei weiterbearbeiten“, primär „Noch eine Datei bearbeiten“. |
| A1b | `A1b-Gespeichert-ohne` | Wie A1a ohne Tipp. Karte „Vertrag_klein.pdf“ / „12 Seiten · 1,9 MB“ + Badge „−77 %“. |
| A1c | `A1c-Gespeichert-mehrere` | „3 Dateien gespeichert – sie liegen jetzt auf deinem Gerät.“ Karte mit 3 Zeilen („Vertrag_Seite3.pdf“ / „1 Seite · 0,4 MB“ …). Sekundär: „Diese 3 Dateien weiterbearbeiten“. |
| A1d | `A1d-Gespeichert-Schwaerzen` | Nach Schwärzen: Karte „Vertrag_geschwärzt.pdf“ / „2,4 MB · 12 Stellen geschwärzt“, Miniatur mit schwarzen Balken. Tipp: „Tipp: Die Datei ist größer geworden (0,2 MB → 2,4 MB) – du kannst sie gleich verkleinern.“ |
| A1e | `A1e-Gespeichert-oeffnet` | Nach Tipp auf „Diese Datei weiterbearbeiten“: Button wird `.btn.is-working` mit Spinner und „Wird geöffnet …“ (`aria-busy="true"`), bis der Startscreen bereit ist. Erst nach > 400 ms zeigen, sonst direkt weiter. |
| A2a | `A2a-Start-Ergebnis` | Startscreen mit Ergebnis: Vorschau-Karte wie Screen 3 („PDF“ · „Vertrag_geschwärzt.pdf“ · „2,4 MB“, „Seite 1 von 12“, × entfernt). Darunter `.result-hint` (`role="status"`): „Dein Ergebnis · schon gespeichert“. Dann „+ Weitere Dateien hinzufügen“. Geteilter Button **Verkleinern** · ▾ → A2c. |
| A2b | `A2b-Start-Ergebnisse` | Wie Screen 4 mit drei Ergebnissen („3 Dateien · 9,1 MB“ / „3 PDFs“). Hinweis „3 Ergebnisse · schon gespeichert“. Vorschlag Verkleinern (Ergebnisse groß) · ▾ → A2d. |
| A2c | `A2c-Aktionen-Ergebnis` | Menü „Was möchtest du tun?“ / „Vertrag_geschwärzt.pdf · 12 Seiten“. Verkleinern trägt „Vorschlag“. |
| A2d | `A2d-Aktionen-Ergebnisse` | Menü / „3 Ergebnisse · 3 PDFs · 9,1 MB“. Verkleinern trägt „Vorschlag“. Trennen, Seiten ordnen, Umwandeln und Schwärzen sind ausgegraut (6.1). |
| A3a | `A3a-Start-ohne` | Wie A2a mit „Vertrag_klein.pdf“ / „1,9 MB“. **Kein Vorschlag:** Haupt-Button „Aktion wählen“ ▾ → A3d. |
| A3b | `A3b-Start-ohne-mehrere` | Drei Ergebnisse aus Trennen („3 Dateien · 1,2 MB“). Hinweis „3 Ergebnisse · schon gespeichert“. „Aktion wählen“ ▾ → A3c. |
| A3c | `A3c-Aktionen-ohne-mehrere` | Menü / „3 Ergebnisse · 3 PDFs“. Nichts hervorgehoben. |
| A3d | `A3d-Aktionen-ohne` | Menü / „Vertrag_klein.pdf · 12 Seiten“. Nichts hervorgehoben. |
| A4 | `A4-PC-Start-Ergebnis` | PC-Startscreen (S1d) mit dem Ergebnis an Stelle der Dropzone: Vorschau, „Dein Ergebnis · schon gespeichert“, „Weitere Dateien hinzufügen“, geteilter Button. |
| A5 | (Übergang, siehe Kap. 8 und `Z-Animationen`) | Die Datei-Karte aus „Gespeichert ✓“ wächst zur großen Vorschau des Startscreens. |

Nach Weiterbearbeiten verhält sich der Startscreen genau wie nach „Datei wählen“: × entfernt die Datei(en), weitere Dateien lassen sich hinzufügen, das Menü folgt 6.1. Kommt eine weitere Datei dazu, verschwindet der Ergebnis-Hinweis.

### Teil B – Schwärzen

| Nr | Datei | Inhalt & Verhalten |
|---|---|---|
| S1a | `S1a-Start-leer` | **Ersetzt 01.** Wie bisher, die Info-Liste hat jetzt **sechs** Einträge (3 + 3): Verkleinern · Zusammen­führen · Trennen · Seiten ordnen · Umwandeln · Schwärzen. |
| S1b | `S1b-Aktionen-PDF` | **Ersetzt 05.** Menü mit sechs Zeilen; Schwärzen → S2a. |
| S1c | `S1c-Aktionen-mehrere` | **Ersetzt 05b.** Schwärzen ausgegraut: „Nur für eine einzelne Datei“. |
| S1d | `S1d-PC-Start` | **Ersetzt 21a.** Aktionen-Liste links mit Schwärzen als sechstem Eintrag. |
| S2a | `S2a-Stellen-leer` | Editor, PDF mit Text, noch keine Stelle. Kopf: „Stellen schwärzen“ / „Schritt 2 von 3“, Zurück, Abbrechen, Fortschritt. Seite groß. Hinweis-Karte auf der Seite: „Ziehe mit dem Finger über eine Stelle, um sie zu schwärzen. Einzelne Wörter kannst du auch antippen.“ Werkzeugleiste: Rückgängig · Wiederholen │ ‹ · „2/12“ · › │ Text suchen · ⋯. Dock: „Weiter“ deaktiviert. |
| S2b | `S2b-Scan-leer` | PDF **ohne** Textebene (Scan). Hinweis: „Ziehe mit dem Finger über eine Stelle, um sie zu schwärzen.“ + Zusatzzeile „In diesem PDF ist kein Text hinterlegt – die Suche ist daher nicht verfügbar.“ Kein Such-Icon, Wörter lassen sich nicht antippen. |
| S2c | `S2c-Bild-leer` | Bild. Hinweis: „Ziehe mit dem Finger über eine Stelle, um sie zu schwärzen.“ Ohne Blättern und ohne Suche. Ansagen sagen „auf dem Bild“ statt „auf Seite N“. |
| S3a | `S3a-Stellen` | Mit Stellen, eine davon gewählt: halb durchsichtig, Akzent-Rahmen, vier Eck-Griffe, Papierkorb darüber. Dock: „Weiter · 7 Stellen“ (Zähler über **alle** Seiten; „1 Stelle“ im Singular). |
| S3b | `S3b-Ziehen` | Während des Aufziehens: Rahmen `.draw` folgt dem Finger. |
| S4 | `S4-Zoom` | Hineingezoomt (2×). Einmaliger Hinweis (Coach-Mark): „Mit zwei Fingern verschieben“. Unten auf der Seite der schwebende Knopf „Seite einpassen“. |
| S5a | `S5a-Suchen` | Bottom Sheet „Text suchen und schwärzen“. Feld „Suchbegriff“, Platzhalter „z. B. einen Namen oder eine Nummer“, Tastatur offen. Leer-Text: „Durchsucht alle 12 Seiten. Geschwärzt werden nur die gesuchten Zeichen.“ Button „Treffer schwärzen“ deaktiviert. |
| S5b | `S5b-Suchen-Treffer` | Suche „Mustermann“: Zusammenfassung „7 Treffer auf 4 Seiten“ (`role="status"`) + „Alle“ · „Keine“. Liste: je Treffer Seite („Seite 2“), Ausschnitt mit dem Treffer schwarz hinterlegt, Kästchen. Alle Treffer sind anfangs ausgewählt. Button „7 Treffer schwärzen“ (Zahl = ausgewählte) → S6. |
| S5c | `S5c-Suchen-kein-Treffer` | „Kein Treffer“ / „Prüfe die Schreibweise oder suche nach einem Teil des Wortes.“ |
| S5d | `S5d-Suchen-schon` | Einige Treffer liegen schon unter einer Stelle: Hinweis „2 Treffer sind schon geschwärzt“ (Singular: „1 Treffer ist schon geschwärzt“). Diese Zeilen sind blass, abgehakt und nicht wählbar. Der Button zählt nur die neuen: „5 Treffer schwärzen“. |
| S6 | `S6-Nach-Suche` | Zurück im Editor: Die neuen Stellen erscheinen versetzt. Toast „7 Stellen geschwärzt“ + „Rückgängig“ (macht alle in einem Schritt rückgängig). |
| S7 | `S7-Seiten` | Seitenknopf „2/12“ → Sheet „Seiten“ / „7 Stellen auf 3 Seiten“. Drei Spalten Miniaturen mit schwarzen Balken und Zähler-Badge; aktuelle Seite mit Akzent-Rahmen. Antippen → zu dieser Seite springen und schließen. |
| S8 | `S8-Optionen` | ⋯ → Sheet „Seite 2“ / „4 Stellen auf dieser Seite“: „Stelle hinzufügen“ · „Ganze Seite schwärzen“ · (Trenner) · „Alle Stellen dieser Seite löschen“ (rot). |
| S9 | `S9-Verarbeiten` | Wie 08: Kopf „Stellen schwärzen“, „Wird geschwärzt …“, „Seite 3 von 12 · 25 %“ (`aria-live`), Miniatur mit schwarzen Balken, „Abbrechen“ → zurück in den Editor. Wechselt automatisch weiter. |
| S10a | `S10a-Speichern-PDF` | Kopf „Speichern“ / „Schritt 3 von 3“. Ergebnis-Karte: „Vertrag.pdf · 12 Seiten“, „12 Stellen auf 4 Seiten geschwärzt“, „3,1 MB → 3,4 MB“, Button „Ergebnis ansehen“ (→ Vollbild 13 mit dem Ergebnis). **Prüfbericht** (grüne Haken): „Inhalt unter den Stellen entfernt – nicht nur überdeckt“ · „Kein versteckter Text mehr enthalten (Text ist dadurch nicht mehr markierbar)“ · „Metadaten, Kommentare und Anhänge entfernt“. („markierbar“ meint hier das Markieren von Text zum Kopieren, nicht die Stellen – Wortlaut aus der Vorgabe.) Ausgabe: „Format“ · „PDF“. Hinweis: „Nur die geschwärzten Stellen sind entfernt. Prüfe vor dem Weitergeben alle Seiten.“ Dateiname „Vertrag_geschwärzt“ + „.pdf“ mit den zwei Zeilen aus 6.2. Button „Speichern“. |
| S10b | `S10b-Speichern-Bild` | Bild: „Brief.jpg · Foto“, „3 Stellen geschwärzt“, „2,8 MB → 2,1 MB“. Prüfbericht: „Inhalt unter den Stellen entfernt“ · „Ortsangaben, Kameradaten und Vorschaubild entfernt“. Format „JPG“, Name „Brief_geschwärzt“ + „.jpg“. |
| S10c | `S10c-Speichern-groesser` | Wie S10a mit „0,2 MB → 2,4 MB“ und zusätzlichem `.note-tip`: „Die Datei ist größer geworden. Nach dem Speichern kannst du sie gleich verkleinern.“ |
| S12 | `S12-PC-Editor` | PC (1280): links „Seiten“-Leiste mit Miniaturen und Zählern. Mitte: Werkzeugleiste (Rückgängig, Wiederholen │ Herauszoomen, Hineinzoomen, Seite einpassen │ ⋯) und die Seite. Rechts: Feld „Text suchen“ direkt sichtbar mit Treffern („7 Treffer auf 4 Seiten“, „2 Treffer sind schon geschwärzt“, „5 Treffer schwärzen“), darunter „Stellen auf dieser Seite“ als Liste („Stelle 1“ … je mit „Löschen“). Fußleiste: „7 Stellen auf 3 Seiten“ + „Weiter“. Hinweis-Text am PC: „Ziehe mit der Maus über eine Stelle, um sie zu schwärzen. Einzelne Wörter kannst du auch anklicken.“ |

### Geänderter Bestands-Screen

| Nr | Datei | Änderung |
|---|---|---|
| 12 | `12-Seitenmenue` | Menüpunkt „Vergrößert ansehen“ heißt jetzt **„Seite groß ansehen“** (Icon `lupe.svg` bleibt). Grund: „Vergrößern“ ist für den Zoom gesperrt. Sonst unverändert. |

**Ersetzt bzw. entfällt:** 01 → S1a · 05 → S1b · 05b → S1c · 18 → A1a–A1e · 21a → S1d.

**Nur im Prototyp neu verlinkt, in der App ohne Bedeutung:** 03, 04, 06 (▾ öffnet jetzt S1b/S1c) und 09, 09b, 10s, 10t, 16, 17 (führen jetzt zu A1).

## 8. Animationen – Ergänzung

Nur `transform` und `opacity`. Kurven wie bisher: ease-out `cubic-bezier(.2,.8,.2,1)` · sheet `(.32,.72,0,1)` · io `(.65,0,.35,1)` · spring `(.34,1.45,.64,1)`. Zum Ansehen: `referenz/designsystem/Z-Animationen.dc.html`.

| Moment | Dauer (ms) | Kurve | Was passiert | Bewegung reduzieren |
|---|---|---|---|---|
| Neue Stelle aufziehen | folgt dem Finger | – | Rahmen mit 38 % Schwarz und 2-px-Akzent-Rahmen wächst unter dem Finger. | gleich |
| Stelle rastet ein | 160 | spring | Beim Loslassen: Scale 1,06 → 1, Deckkraft 0,55 → 1, danach deckend schwarz (`fk-st-snap`). | sofort |
| Stelle wählen / abwählen | 160 | ease | Schwarz 100 % ↔ 50 %, Akzent-Rahmen ein/aus; Papierkorb ploppt auf (220, spring). | Überblendung |
| Treffer schwärzen | 160 je Stelle, +60 versetzt | spring | Neue Stellen erscheinen nacheinander; danach Toast „7 Stellen geschwärzt · Rückgängig“ (420, sheet). | alle sofort |
| Stelle löschen | 160 | ease | Blendet aus (Scale 0,96, `fk-st-out`), dann Toast „Stelle gelöscht · Rückgängig“. | sofort weg |
| Zoom / Seite einpassen | 320 | io | `transform: translate() scale()` der Seite; Knopf „Seite einpassen“ erscheint (200, fade). Beim Zusammendrücken folgt die Seite den Fingern ohne Übergang. | sofort |
| Seite blättern | 200 | ease | Überblendung zur nächsten Seite – bewusst ohne Wischen, weil ein Finger zeichnet. | sofort |
| A5 · Gespeichert ✓ → Start mit Ergebnis | 200 · 520 · +180 · 560 (+260) | ease · ease-out · sheet | Gespeichert-Screen blendet aus (200). Die Datei-Karte wächst aus ihrer Position zur großen Vorschau (520, `translateY(var(--fk-morph-y)) scale(.4)` → 0/1, `.in-morph`). Der Hinweis „Dein Ergebnis · schon gespeichert“ folgt (+180), der geteilte Button bzw. „Aktion wählen“ gleitet ein (560, +260). `--fk-morph-y` = senkrechter Abstand Karte → Vorschau, vorher messen. Alternativ View Transitions API mit Fallback. | Überblendung 200 |
| „Wird geöffnet …“ | 800 Schleife | linear | Spinner im Knopf, bis der Startscreen bereit ist. | ohne Drehung |

## 9. Schwärzen-Editor – Interaktion

### 9.1 Handy

| Geste / Eingabe | Ergebnis |
|---|---|
| Mit einem Finger ziehen (auf freier Fläche) | Neue Stelle aufziehen. Erst ab ca. 5 px Bewegung (Schwelle wird mit dem Zoom kleiner). Zu kleine Rahmen (< 1 % breit oder < 0,6 % hoch) werden verworfen. Die neue Stelle ist danach gewählt. |
| Ein Wort antippen (nur PDF mit Text) | Stelle genau über dem Wort (Rahmen der Textebene). Nicht gewählt, man kann gleich das nächste Wort antippen. |
| Stelle antippen | wählen |
| Gewählte Stelle ziehen | verschieben (bleibt innerhalb der Seite) |
| Eck-Griff ziehen | Größe ändern |
| Papierkorb an der gewählten Stelle | löschen → Toast „Stelle gelöscht“ + „Rückgängig“ (5 s). Keine Rückfrage. |
| Antippen daneben, während eine Stelle gewählt ist | **Nur abwählen** – erzeugt keine neue Stelle und schwärzt kein Wort. |
| Zwei Finger zusammen/auseinander | Herauszoomen / Hineinzoomen (1× bis Vorschlag 4×). Beim ersten Hineinzoomen einmalig „Mit zwei Fingern verschieben“. |
| Zwei Finger ziehen | Ausschnitt verschieben (gezoomt) |
| „Seite einpassen“ | zurück auf 1× |
| ‹ / › · „2/12“ | blättern · Seitenübersicht (S7) |
| Lupe | Text suchen (S5) |
| ⋯ | Optionen für diese Seite (S8) |
| Rückgängig / Wiederholen | über alle Seiten, bis 50 Schritte. Ein Schritt = eine Stelle hinzugefügt, verschoben, in der Größe geändert oder gelöscht, ein „Treffer schwärzen“ oder eine Aktion aus S8. Ohne Schritt deaktiviert. |

**Papierkorb-Lage:** standardmäßig rechts über der gewählten Stelle (10 px Abstand). Ist oben zu wenig Platz (Stelle liegt im oberen 12 %-Bereich), kommt er darunter (`.del.below`). Ist rechts zu wenig Platz, rückt er nach innen (`.del.edge`).

**„Stelle hinzufügen“ (S8):** legt eine Stelle mitten in den sichtbaren Ausschnitt (Vorschlag: 60 % × 4 % der Seite). Sie ist gewählt und lässt sich mit Griffen oder Tastatur anpassen. Das ist die Alternative zum Aufziehen.

**„Ganze Seite schwärzen“:** eine Stelle über die ganze Seite (0/0/100/100). **„Alle Stellen dieser Seite löschen“:** ohne Rückfrage, Toast mit „Rückgängig“.

**Text suchen:** sucht ohne Rücksicht auf Groß- und Kleinschreibung in der Textebene aller Seiten und aktualisiert beim Tippen (Vorschlag: 200 ms Verzögerung). Geschwärzt werden **nur die gesuchten Zeichen**, nicht das ganze Wort: „mustermann“ in „max.mustermann@example.de“ ergibt eine Stelle nur über „mustermann“. Treffer, die schon ganz unter einer Stelle liegen, gelten als „schon geschwärzt“.

### 9.2 PC (S12)

| Eingabe | Ergebnis |
|---|---|
| Mit der Maus ziehen | Stelle aufziehen (wie Finger) |
| Wort anklicken | Stelle über dem Wort |
| Klick auf Stelle, ziehen, Griffe | wählen, verschieben, Größe ändern |
| Strg+Z / Strg+Y (Mac: ⌘Z / ⇧⌘Z) | Rückgängig / Wiederholen |
| + / − / Strg + Mausrad | Hineinzoomen / Herauszoomen; Knopf „Seite einpassen“ |
| Liste „Stellen auf dieser Seite“ | Zeile fokussieren bzw. überfahren hebt die Stelle hervor; „Löschen“ löscht sie. |

**Mauszeiger:** Seite `crosshair` · Stelle `grab` (beim Ziehen `grabbing`) · Griffe oben links/unten rechts `nwse-resize`, oben rechts/unten links `nesw-resize` · Papierkorb und Knöpfe `pointer` · deaktivierte Knöpfe `not-allowed`.

### 9.3 Tastatur (Handy mit Tastatur und PC)

| Taste (Stelle fokussiert) | Ergebnis |
|---|---|
| Tab / Shift+Tab | nächste / vorige Stelle (Lesereihenfolge: oben → unten, links → rechts) |
| Pfeiltasten | verschieben (1 % der Breite bzw. 0,7 % der Höhe) |
| Shift + Pfeiltasten | Größe ändern |
| Entf / Rücktaste | löschen (mit Toast) |
| Esc | abwählen |

## 10. Icons – neu

Alle in `icons/`: 24 × 24, `stroke-width 1.8`, runde Enden und Ecken, `currentColor`.

| Datei | Verwendung |
|---|---|
| `schwaerzen.svg` | Aktion Schwärzen (Menü, Startscreen, Hinweis-Karte). Der Balken ist **gefüllt** (`fill="currentColor"`). |
| `suchen.svg` | „Text suchen“ – Lupe **ohne** Plus. `lupe.svg` (mit Plus) bleibt für „Seite groß ansehen“. |
| `rueckgaengig.svg` / `wiederholen.svg` | Rückgängig / Wiederholen |
| `hineinzoomen.svg` / `herauszoomen.svg` | Zoom am PC. `hineinzoomen.svg` hat dieselbe Form wie `lupe.svg`, aber einen eigenen Namen für die eigene Bedeutung. |
| `einpassen.svg` | Seite einpassen |
| `seiten-raster.svg` | Seitenknopf „2/12“ (Seitenübersicht) |

## 11. Barrierefreiheit – Ergänzung (Abnahmekriterien)

- **Stellen** sind echte `<button class="stelle">` mit `aria-label`: „Geschwärzte Stelle 2 von 3 auf Seite 4“. Beim Bild: „Geschwärzte Stelle 2 von 3 auf dem Bild“. Die Zählung gilt pro Seite in Lesereihenfolge.
- **Für jede Ziehen-Aktion gibt es eine Alternative:**
  - Aufziehen → Wort antippen, „Text suchen“, „Stelle hinzufügen“ (S8) oder „Ganze Seite schwärzen“
  - Verschieben und Größe ändern → Tastatur (9.3)
  - Zwei-Finger-Zoom → Knöpfe am PC; „Seite einpassen“ (am Handy siehe Kap. 13)
  - Blättern → ‹ › und die Seitenübersicht, kein Wischen
- **Ansagen** über eine `aria-live="polite"`-Region (`.sr-only`), wörtlich:
  - „Stelle hinzugefügt. 3 Stellen auf Seite 2.“ (Bild: „Stelle hinzugefügt. 3 Stellen auf dem Bild.“; Singular „1 Stelle“)
  - „7 Stellen geschwärzt.“
  - „Stelle gelöscht.“
  - „Rückgängig gemacht.“ · „Wiederholt.“
  - „Seite 3 von 12.“
- **Startscreen mit Ergebnis:** „Dein Ergebnis · schon gespeichert“ bzw. „3 Ergebnisse · schon gespeichert“ steht in `role="status"` und wird nach dem Übergang angesagt. Danach liegt der Fokus auf dem Haupt-Button (Verkleinern bzw. „Aktion wählen“).
- **„Wird geöffnet …“:** `aria-busy="true"` am Button.
- **Suche:** Feld mit sichtbarem `<label>` „Suchbegriff“. Zusammenfassung („7 Treffer auf 4 Seiten“, „Kein Treffer“) in `role="status"`. Treffer als `role="checkbox"` mit `aria-checked`; schon geschwärzte mit `aria-disabled="true"`.
- **Seitenübersicht:** Miniaturen mit `aria-label`, z. B. „Seite 2, 4 Stellen, aktuelle Seite“ / „Seite 3, keine Stellen“, plus `aria-current`.
- **Seitenknopf:** `aria-label="Seite 2 von 12 – Seitenübersicht"`. Deaktivierte Knöpfe sind echte `disabled`.
- **Kontrast:** Akzent-Rahmen `#2f6bf0` auf weißem Papier 4,7 : 1. Griffe hell mit dunklem Rand, also auf Weiß und auf Schwarz sichtbar.
- **Bewegung reduzieren:** in `filekit-ergaenzung.css` vorbereitet (nur Überblendungen, kein Zoom-Übergang). Den Versatz beim Treffer-Schwärzen im JS ebenfalls abschalten.

## 12. Empfohlenes Vorgehen

1. `filekit-ergaenzung.css` nach `filekit.css` einbinden; die 8 Icons übernehmen.
2. **Startscreen und Menü:** sechster Eintrag, Regeln 6.1, Screen 12 umbenennen.
3. **Teil A:** „Gespeichert ✓“ (A1) mit Tipp-Regel 6.3, Ergebnis als Blob halten, Startscreen mit Ergebnis (A2/A3/A4), Übergang A5.
4. **Schwärzen-Editor:** Zeichenfläche mit %-Koordinaten, Stellen, Auswahl, Griffe, Löschen und Toast, Rückgängig/Wiederholen, Tastatur, Ansagen. Danach Zoom, Seiten (S7) und Optionen (S8).
5. **Textebene:** Wort antippen und Text suchen (S5/S6); Scan-Erkennung (S2b).
6. **Verarbeiten und Speichern:** rendern, schwärzen, Bild-PDF bzw. Bild neu aufbauen, aufräumen (Kap. 2), Prüfbericht (S10).
7. **PC** (S12, A4).
8. **Prüfung:** Ein geschwärztes PDF in einem anderen Programm öffnen. Der Text unter den Stellen darf weder kopierbar noch durchsuchbar sein, und in der Datei darf er nicht mehr vorkommen. Außerdem Metadaten prüfen, 375 px und 1280 px, Tastatur, Screenreader-Stichprobe, Bewegung reduzieren, offline.

## 13. Offene Punkte (vor/bei Umsetzung klären)

1. **Schwellenwerte für „groß“** (6.3): Vorschlag ≥ 2 MB oder + 50 % und ≥ 1 MB. Mit echten Dateien prüfen.
2. **Zoom am Handy ohne zwei Finger:** Knöpfe gibt es nur am PC. Vorschlag: „Hineinzoomen“ / „Herauszoomen“ zusätzlich im ⋯-Menü (S8). Das ist noch nicht gezeichnet.
3. **Auflösung beim Schwärzen von PDFs:** Vorschlag 200 dpi. Höher heißt schärfer, aber größer (siehe S10c). Optional die Seiten ohne Stelle als Bild mit derselben Auflösung, damit nirgends versteckter Text bleibt.
4. **Scans ohne Textebene:** keine Texterkennung geplant. Falls gewünscht, wäre das eine eigene Erweiterung.
5. **Bildformate:** HEIC/WebP als Eingang? Ausgabeformat bleibt das Eingangsformat; für HEIC müsste man JPG nehmen.
6. **Prototyp-Grenzen** (nur Prototyp, nicht App):
   - Stellen, die man auf einem Board zeichnet, werden nicht auf andere Boards übernommen.
   - Zahlen und Namen passen auf den Pfaden nicht überall zusammen, z. B. zeigt 09 noch das alte Verkleinern-Ergebnis „8,4 MB → 1,9 MB“ und S10a „3,1 MB → 3,4 MB“ vor A1d mit „0,2 MB → 2,4 MB“.
   - Maßgeblich sind die Regeln in diesem Dokument.

## 14. Prototyp-Pfade

Im Design-Canvas die Seite **„Erweiterung · Schwärzen & Weiterbearbeiten“** öffnen, Board **S1a** wählen und ▶ starten.

1. **Schwärzen:** S1a „Datei wählen“ → 06 (einmaliger Hinweis am ▾) → ▾ → S1b „Schwärzen“ → S2a. Dort Stellen aufziehen, Wörter antippen, eine Stelle wählen und verschieben/löschen, Rückgängig. Dann Lupe → S5a/S5b „Mustermann“ → „7 Treffer schwärzen“ → S6 → „Weiter · 7 Stellen“ → S9 „Wird geschwärzt …“ → S10a (Prüfbericht) → „Speichern“ → A1d „Gespeichert ✓“.
2. **Weiterbearbeiten:** A1d „Diese Datei weiterbearbeiten“ → A1e „Wird geöffnet …“ → A2a (Vorschlag Verkleinern) → „Verkleinern“ → 07 → 08 → 09 → „Speichern“ → A1b „Gespeichert ✓“.
3. **Mehrere Ergebnisse:** S1a → 06 → ▾ → „Trennen“ → 15 → 16 „Jede Seite als eigene Datei“ → „Alle speichern (3)“ → A1c → „Diese 3 Dateien weiterbearbeiten“ → A3b → „Aktion wählen“ → A3c.
