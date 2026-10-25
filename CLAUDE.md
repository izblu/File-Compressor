# FileKit – Arbeitsweise & Konventionen

Notizen für Claude, damit die Zusammenarbeit über Sessions hinweg gleich bleibt.

## Sprache
- Mit dem Nutzer immer auf **Deutsch** kommunizieren (Programmier-Einsteiger, Erklärungen einfach halten).

## Commit-Ablauf (WICHTIG – ausdrücklicher Wunsch des Nutzers)
- Wenn ein abgeschlossener, getesteter Stand erreicht ist: **NICHT sofort** Commit-Texte erzeugen.
- **Zuerst fragen**, ob der Nutzer zum Committen bereit ist.
- **Erst nach seiner Bestätigung** zwei Texte liefern – jeweils in einem **eigenen Code-Block**
  (damit die Kopier-Funktion funktioniert):
  1. **Zusammenfassung** – eine kurze Betreffzeile.
  2. **Beschreibung** – Stichpunkte mit den Details der Änderung.
- Der Nutzer committet/pusht selbst über **GitHub Desktop**; Render deployt automatisch vom `main`-Branch.

## Redesign FileKit 2.0 (läuft, Branch `redesign`)
- Freigegebenes Konzept: `design/konzept.md` – Design-Briefing für Claude Design: `design/briefing.md`.
- **Verbindliche Spezifikation des fertigen Designs:** `design/filekit-handoff/HANDOFF.md` (geht bei Widersprüchen
  vor `konzept.md`). Nur Dunkelmodus, Schrift Manrope lokal, Designsystem `docs/filekit.css` (Präfix `--fk-`).
- Umsetzung in der Reihenfolge von Kapitel 12 der HANDOFF; nach jedem Abschnitt dem Nutzer das Ergebnis zeigen.
  **Stand:** Schritte 1–6 umgesetzt und committet (letzter: c3bd0df). Schritt 7 (Schlussprüfung) **entfällt**
  auf Wunsch des Nutzers – an seine Stelle tritt die Erweiterung „Weiterbearbeiten“ + „Schwärzen“ (siehe unten).
  Branch `redesign` ist noch nicht gepusht und nicht in `main`.
- Aufteilung: Claude Design gestaltet (Designsystem + klickbarer Prototyp), Claude Code baut die Technik
  und setzt das übergebene Design um. Übergebene Design-Dateien landen in `design/`.

## Erweiterung „Weiterbearbeiten“ + „Schwärzen“ (läuft, ebenfalls Branch `redesign`)
- Freigegebene Konzepte: `design/abschluss-konzept.md` und `design/schwaerzen-konzept.md`.
- **Verbindlich fürs Design:** Nachtrag `design/filekit-handoff-erweiterung/HANDOFF.md` (ergänzt die erste HANDOFF).
  CSS-Ergänzung liegt als `docs/filekit-ergaenzung.css` (wird nach `filekit.css` eingebunden, nicht verändern).
- **Abweichungen vom Nachtrag, vom Nutzer entschieden (25.10.2026):**
  1. Zurück aus dem Schwärzen-Editor wie bei allen Aktionen: mit Stellen erst Rückfrage „Bearbeitung abbrechen?“
     (20c), dann verwerfen – die Stellen werden **nicht** im Hintergrund gehalten.
  2. Dateinamen verketten ohne Kürzen: dieselbe Nachsilbe darf doppelt vorkommen (`Vertrag_klein_klein.pdf`).
  3. Zoom am Handy ohne zwei Finger: „Hineinzoomen“ / „Herauszoomen“ zusätzlich im ⋯-Menü (S8).
  4. „Gespeichert ✓“ listet **immer alle** gespeicherten Dateien (kein „und 6 weitere“). Wird es eng, scrollt die
     Dateiliste in sich, damit Tipp und Knöpfe sichtbar bleiben. Abstand 22 px wie in A1a.
  - Außerdem nach den Konzepten: Wortrahmen nach dem exakten Verfahren aus dem Vorab-Test (nicht `getTextContent`),
    Bilder: PNG bleibt PNG, alles andere wird JPG.
- Reihenfolge: 1) CSS + Icons → 2) Teil A „Weiterbearbeiten“ → 3) Schwärzen in Abschnitten (Menüeintrag erst mit
  dem Editor). Nach jedem Abschnitt dem Nutzer das Ergebnis zeigen.
- **Stand:** 1) committet (665ae70). 2) Teil A „Weiterbearbeiten“ gebaut, im Browser geprüft und vom Nutzer
  abgenommen (25.10.2026, c3f4805). 3) Schwärzen, erster Abschnitt gebaut, im Browser geprüft, vom Nutzer
  abgenommen und committet (25.10.2026): Menüeintrag + Startscreen 3 + 3, Editor `schwaerzen-editor.js`
  (Aufziehen, Auswahl, Griffe, Papierkorb + Toast, Rückgängig/Wiederholen über alle Seiten, Tastatur, Ansagen, Zoom,
  S7, S8 mit Zoom-Einträgen), `flow-schwaerzen.js` (Schritt 3 „Speichern“ ist noch ein Platzhalter). Der Toast liegt
  wie in der Referenz über der Werkzeugleiste – vom Nutzer so bestätigt.
  Schwärzen, Abschnitt Textebene (Nachtrag Kap. 12, Schritt 5) gebaut, im Browser geprüft, vom Nutzer
  abgenommen und committet (25.10.2026): neues Modul `textstellen.js` (exakte Wortrahmen aus der
  Zeichenliste, Ersatzweg mit größerem Rand, Suche), Wort antippen, Lupe → Sheet „Text suchen und schwärzen“
  (S5a–S5d), S6 (versetzt, Toast, ein Rückgängig-Schritt), Scan-Erkennung (S2b). Testserver `web-direkt-8030`.
  Schwärzen, Abschnitt Verarbeiten + Speichern (Nachtrag Kap. 12, Schritt 6) gebaut und im Browser geprüft
  und auf Wunsch des Nutzers committet (25.10.2026): neues Modul `redact.js` (Seiten mit 2000 px rendern,
  Stellen in die Pixel malen – Grenzen nach außen gerundet –, JPEG 0,85, reines Bild-PDF über `bauePdf`; Bilder:
  PNG bleibt PNG, sonst JPG 0,92, EXIF/XMP/IPTC-Abschnitte werden zusätzlich entfernt, Fotos > 16 MP verkleinert;
  Selbstprüfung mit pdf.js: Seitenzahl, kein Text, keine Kommentare/Formulare/Metadaten/Anhänge/Lesezeichen –
  sonst Fehlermeldung statt Speichern). S9 (Miniatur = gerade geschwärzte Seite, Abbrechen → Editor),
  S10a–S10c, A1d (Miniatur, Größe und `herkunft` aus dem Ergebnis). Während des Verarbeitens ist der Editor
  gesperrt (`inert`). Service Worker v15.
  Schwärzen, PC-Layout S12 (Nachtrag Kap. 12, Schritt 7) gebaut, im Browser geprüft (bei 1024 und 1280 px;
  375 px unverändert) und auf Wunsch des Nutzers committet (25.10.2026): Schritt `breit: true`, `schwaerzen-editor.js` setzt ab
  1024 px `.ist-pc` und ordnet dieselben Elemente um – links Spalte „Seiten“ (Miniaturen mit Balken + Badge, Klick
  springt, ↑/↓ wechseln, nur eine Miniatur im Tab-Ablauf), Mitte Werkzeugleiste (Rückgängig · Wiederholen │
  Herauszoomen · Hineinzoomen · Seite einpassen │ ⋯) über der Seite, rechts „Text suchen“ fest sichtbar (bleibt nach
  dem Schwärzen stehen, Treffer folgen Rückgängig/Wiederholen) und „Stellen auf dieser Seite“ (Zeile überfahren/
  fokussieren hebt die Stelle hervor, „Löschen“). Fußleiste „7 Stellen auf 3 Seiten“ + „Weiter“. Mauszeiger laut 9.2
  (auch während des Ziehens). ⋯-Menü am PC ohne Zoom-Einträge. A4 (PC-Start mit Ergebnis) war schon fertig.
  Service Worker v16.
  Schlussprüfung (Nachtrag Kap. 12, Schritt 8) durchgeführt (25.10.2026, auf Wunsch des Nutzers committet): Ergebnis-PDF
  außerhalb der App geprüft (PyMuPDF + Xpdf `pdftotext`) – nur Bilder, kein Text, Katalog nur `/Pages`, kein
  `/Info`, keine Kommentare/Formulare/Anhänge/Lesezeichen/XMP/JavaScript, Stellen in den Pixeln schwarz; JPG ohne
  EXIF/XMP/IPTC/Kommentar (nur Chromes sRGB-Profil), PNG ohne Text-/eXIf-Abschnitte, Transparenz bleibt.
  375 px und 1280 px (S12, A4), Tastatur, Ansagen, Bewegung reduzieren, Offline und Begriffe bestanden.
  Behoben: Spinner dreht sich bei „Bewegung reduzieren“ nicht mehr (`styles.css`), Toasts im Schwärzen-Editor
  werden nicht doppelt vorgelesen (`zeigeToast({ stumm })`, die wörtlichen Ansagen bleiben), S10b zeigt
  „Brief.jpg · Foto“ (PNG: „· Bild“). Service Worker v17.
  Danach vom Nutzer entschieden und umgesetzt (25.10.2026): pdf.js, der pdf.js-Worker und pdf-lib stehen jetzt in
  der Vorab-Liste des Service Workers (vorher erst bei Bedarf gecacht → fehlten nach jedem Update offline);
  eine fokussierte, aber nicht gewählte Stelle zeigt den Akzent-Ring statt des blassen Fokusrahmens
  (`styles.css` überschreibt nur die Farbe, `filekit-ergaenzung.css` bleibt unverändert). Mit echten Tasten im
  Browser-Pane geprüft (Tab, Esc, Pfeil, Entf, Strg+Z). Nicht prüfbar: echter Screenreader, echter Flugmodus.
  **Nächster Schritt:** Push + Merge nach `main` (entscheidet der Nutzer).

## Begriffe in der App (verbindlich)
- **Wählen / Hinzufügen** = Datei in die App holen · **Verarbeiten** = App arbeitet ·
  **Speichern** = Ergebnis aufs Gerät schreiben (nur im letzten Schritt).
- Nicht verwenden: „Laden", „Herunterladen", „Download", „Upload".

## Geparkte Aufgaben
- Keine. Die früheren Aufgaben „Abschluss-Workflow überarbeiten“ und „Dokumente schwärzen“ sind als Konzepte
  freigegeben und werden gerade gebaut (siehe „Erweiterung“ oben). Davor erledigt: Dropzone-Icons und einheitliche
  Dropzone-Texte (im Redesign umgesetzt).
