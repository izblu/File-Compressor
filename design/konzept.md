<!-- Freigegebenes Redesign-Konzept (Stand 23.10.2026). Grundlage für Claude Design (siehe briefing.md) und die Umsetzung in Claude Code. -->

# FileKit 2.0 – Konzept & Arbeitsaufteilung (Claude Design ↔ Claude Code)

## Kontext
FileKit (PWA, Vanilla-JS, läuft offline im Browser, deployt über Render vom `main`-Branch) soll komplett
überarbeitet werden: **ein einziger Wizard mit Verzweigungen** statt Tab-Leiste, hochwertiges Design mit
Animationen, große lesbare Seitenvorschau, eigener Dateiname, Zielgröße beim Verkleinern, eindeutige
Begriffe und zwei neue Aktionen: **„Seiten ordnen"** und **„Umwandeln"** (PDF/JPG/PNG).
Die Grundfunktionen (Verkleinern, Zusammenführen, Trennen) bleiben, werden aber verbessert.

Entscheidungen des Nutzers: **Datei zuerst, dann Aktion** (ein Wizard, verzweigt je nach Aktion) ·
**geteilter Button** `[ Aktion | ▾ ]` zur Aktionswahl · **Startscreen verwandelt sich** nach der Dateiwahl ·
**Mobile-first** · **Seiten-Editor** (sortieren + drehen + löschen) · **Zielgröße** ·
**Claude Design** für die Gestaltung, Claude Code für die Umsetzung.

---

## 1. Eindeutige Begriffe (gilt für die ganze App und das Design-Briefing)

| Begriff | Bedeutung | Beispiele im UI |
|---|---|---|
| **Wählen / Hinzufügen** | Datei vom Gerät **in die App holen** | „Datei wählen", „+ Weitere Dateien hinzufügen", Status „Wird geöffnet …" |
| **Verarbeiten** | App arbeitet | „Wird verkleinert …", „Wird zusammengeführt …" |
| **Speichern** | Ergebnis **aufs Gerät schreiben** – **nur im letzten Schritt** | Button „Speichern" / „Alle speichern (3)", danach „Gespeichert ✓" |

- **Nicht mehr verwendet:** „Laden", „Herunterladen", „Download", „Upload". Vertrauens-Hinweis wird zu
  „Nichts verlässt dein Gerät".
- Am PC (wo der Browser es kann) öffnet „Speichern" den echten **„Speichern unter"-Dialog** (Ort wählbar),
  sonst normaler Download-Ordner.

## 2. Der eine Wizard (die Tab-Leiste fällt weg)

```
Schritt 1: Datei wählen ──► Aktion wählen (geteilter Button)
                               │
     ┌───────────────┬─────────┼──────────────┬──────────────┐
     ▼               ▼         ▼              ▼              ▼
 Verkleinern   Zusammenführen  Trennen     Seiten ordnen   Umwandeln
 Stärke/Ziel-  Seiten-Editor   Seiten      Seiten-Editor   (direkt weiter)
 größe         (mehrere Dat.)  auswählen   (eine Datei)
     └───────────────┴─────────┴──────────────┴──────────────┘
                               ▼
     Letzter Schritt „Speichern" (für alle gleich aufgebaut):
     Ausgabe-Optionen · Dateiname · [ Speichern ]
```

**Schritt 1 – Startscreen (Gesicht der App), zwei Zustände:**
- **Leer:** Logo + Claim („Deine PDFs & Bilder – bearbeitet auf deinem Gerät."), große, dezent animierte
  Dropzone „Datei wählen", darunter als **reine Info (nicht klickbar)**, was FileKit kann, unten
  Vertrauens-Leiste mit Icons („privat · offline · Nichts verlässt dein Gerät").
- **Datei gewählt (animierter Übergang):** Die Dropzone verwandelt sich in eine **große Vorschau**
  (1. Seite bzw. Bild; bei mehreren Dateien ein Stapel/Streifen), darunter Name, Seitenzahl, Größe,
  „+ Weitere Dateien hinzufügen" und „×" zum Entfernen. Von unten gleitet der **geteilte Button** ein.

**Geteilter Button `[ Verkleinern | ▾ ]`** (nur hier – für die Wahl der Aktion)
- Hauptteil = vorgeschlagene Aktion mit Icon → Tap führt direkt zu Schritt 2 dieser Aktion.
- ▾-Teil (mind. 48 px breit) öffnet ein **großes Menü von unten** (Bottom Sheet): alle Aktionen mit Icon und
  einem Satz Erklärung; unpassende **ausgegraut mit kurzem Grund**.
- Beim ersten Mal ein kleiner Hinweis „Weitere Aktionen" am ▾ (danach nie wieder).
- **Regeln:**

  | Auswahl | Vorschlag auf dem Hauptteil | Im Menü aktiv | Im Menü ausgegraut (Grund) |
  |---|---|---|---|
  | 1 PDF | Verkleinern, wenn > 2 MB; sonst zuletzt genutzte Aktion (Standard: Verkleinern) | Verkleinern, Trennen, Seiten ordnen, Zusammenführen, Umwandeln (in Bilder) | – |
  | 1 Bild | Verkleinern | Verkleinern, Umwandeln, Zusammenführen | Trennen, Seiten ordnen („nur für PDFs") |
  | mehrere Bilder | Zusammenführen | Zusammenführen, Verkleinern (alle), Umwandeln (alle) | Trennen, Seiten ordnen („nur für ein einzelnes PDF") |
  | mehrere Dateien gemischt / mehrere PDFs | Zusammenführen | Zusammenführen, Verkleinern (alle) | Trennen, Seiten ordnen („nur für ein einzelnes PDF"), Umwandeln („nur für Bilder oder ein einzelnes PDF") |

  „Zuletzt genutzt" merkt sich nur den Namen der Aktion (keine Dateidaten) im Browser.

**Für alle weiteren Schritte gleich:**
- Kopfzeile: Zurück-Pfeil, Titel der Aktion, Schritt-Anzeige („Schritt 2 von 3" + Balken).
- Unten fest: **ein** Haupt-Button in der Daumen-Zone („Weiter", im letzten Schritt „Speichern").
- **Handy-Zurück-Taste = ein Schritt zurück**; Zurück aus Schritt 2 → Startscreen mit der Datei noch geladen
  (andere Aktion wählbar); Zurück vom Startscreen mit Datei → leerer Startscreen.
- Nach dem Speichern: „Gespeichert ✓" + „Noch eine Datei bearbeiten" (→ leerer Startscreen).

## 3. Die Zweige im Detail

| Aktion | Schritt 2 | Schritt 3 „Speichern" – Ausgabe-Optionen |
|---|---|---|
| **Verkleinern** (Bilder & PDFs) | Stärke: Umschalter **„Qualität"** (Stark/Mittel/Schonend) oder **„Zielgröße"** (500 KB / 1 MB / 2 MB / 5 MB / eigener Wert); „Weiter" startet die Verarbeitung (Animation) | Ergebnis alt → neu + Ersparnis je Datei · Dateiname je Datei |
| **Zusammenführen** | **Seiten-Editor** mit allen Seiten aller Dateien (farbige Markierung je Ursprungsdatei; verschieben/drehen/löschen; „+ Weitere Dateien hinzufügen") – ersetzt Pfeile und Textfeld „1-3, 5" | Dateiname · Seitenzahl & Größe |
| **Trennen** | Seiten antippen = auswählen (große Vorschau, Alle/Keine) | Sichtbare Wahl (zwei Karten): **„Ausgewählte Seiten in einer Datei"** (3 Seiten → 1 PDF) oder **„Jede Seite als eigene Datei"** (3 Seiten → 3 PDFs) · Dateiname mit Live-Vorschau der entstehenden Namen (z. B. `Vertrag_Seite3.pdf`) |
| **Seiten ordnen** | **Seiten-Editor** (derselbe wie bei Zusammenführen, mit einer Datei): ziehen, drehen, löschen, Rückgängig | Dateiname |
| **Umwandeln** (neu) | – (geht direkt zu „Speichern") | Sichtbare Formatwahl: **PDF** („für Dokumente") · **JPG** („klein, für Fotos") · **PNG** („verlustfrei, mit Transparenz") – nur sinnvolle Ziele werden angeboten. Bild → PDF/JPG/PNG; PDF → JPG/PNG (jede Seite ein Bild) · Dateiname |

**Grundregel:** Der geteilte Button ist nur für die **Aktion**. Alles, was bestimmt, **wie** gespeichert wird
(Format, eine oder mehrere Dateien, Name), steht **sichtbar im Speichern-Schritt** – weil der Dateiname
davon abhängt und beide Möglichkeiten gleich wichtig sind.

## 4. Gemeinsame Bausteine

**Datei-Eingang** (Startscreen + „Weitere Dateien hinzufügen")
- Eine zentrale Stelle für Dateiwahl & Drag-and-drop: erkennt Typ (PDF/Bild), liest Seitenzahl, erzeugt die
  erste Vorschau und liefert die Regeln für den geteilten Button. Die Dateien werden an den Zweig übergeben,
  damit nichts doppelt geöffnet wird.

**Seiten-Editor** (Zusammenführen + Seiten ordnen; Kachel-Raster auch für Trennen)
- Drag & Drop mit Touch: **Lang drücken = Seite aufnehmen** (normales Wischen scrollt weiter), Auto-Scroll
  am Rand, flüssiges Nachrutschen der anderen Seiten.
- **Mehrere Seiten markieren** → gemeinsam verschieben, drehen oder löschen (wichtig bei langen Dokumenten,
  z. B. eine ganze Datei an den Anfang).
- Pro Seite: Drehen (90°), Löschen (mit „Rückgängig"-Hinweis), Alternative ohne Ziehen über Seitenmenü
  („an den Anfang / ans Ende").
- Technik: **SortableJS lokal in `docs/lib/`** (inkl. Mehrfach-Ziehen; offline, bewährt auf Touch).

**Große Seitenvorschau**
- Handy: Standard **2 Spalten**, Umschalter auf **1 Spalte** (Seite gut lesbar) · PC: 3–4 Spalten.
- **Lupe → Vollbild-Ansicht** der Seite, durch Wischen zur nächsten Seite.
- Scharf gerendert (Kachelbreite × Pixeldichte des Displays), **nur sichtbare Seiten** werden gerendert.

**Speichern-Schritt** (letzter Schritt aller Zweige)
- Oben die Ausgabe-Optionen des Zweigs (siehe Tabelle), darunter **Dateiname**: Textfeld mit Vorschlag,
  Endung (`.pdf`/`.jpg`/`.png`) fest dahinter, verbotene Zeichen (`\/:*?"<>|`) werden entfernt,
  leer → Vorschlag.
- Vorschläge: Verkleinern `Name_klein`, Zusammenführen `Name-der-ersten-Datei_gesamt`,
  Trennen `Name_Auswahl` bzw. `Name_Seite{n}`, Seiten ordnen `Name_neu`, Umwandeln `Name`
  (bei mehreren Seiten/Bildern `Name_{n}`).

**Zielgröße** (Verkleinern)
- Bilder: JPEG-Qualität schrittweise suchen, reicht das nicht, zusätzlich Auflösung reduzieren.
  PNG: Auflösung reduzieren (Transparenz bleibt).
- PDFs: ein Probedurchlauf, danach gezielt nachjustiert (max. 2–3 Durchläufe).
- Ziel nicht erreichbar → kleinstmögliches Ergebnis + ehrlicher Hinweis. Bei PDFs weiterhin Hinweis
  „Text ist danach nicht mehr markierbar".

## 5. Design-Leitplanken (Briefing für Claude Design)
- Mobile-first (375 px Breite), Touch-Flächen ≥ 44 px, Daumen-Zone unten, Hell- **und** Dunkelmodus.
- Bestehende Marke als Ausgangspunkt: Blau `#2563eb`, App-Icon – darf veredelt werden.
- **Begriffe aus Abschnitt 1 verbindlich** (kein „Laden"/„Download").
- **Schwerpunkt Startscreen** in beiden Zuständen **und der Übergang dazwischen**, inkl. Drag-over-Zustand.
- **Geteilter Button + Bottom Sheet** (aktiv / vorgeschlagen / ausgegraut mit Grund) und einmaliger Hinweis.
- **Speichern-Schritt** als einheitliche Vorlage: Options-Karten (Format / eine vs. einzelne Dateien),
  Dateiname-Feld mit fester Endung, Live-Vorschau der Namen, Bestätigung „Gespeichert ✓".
- Weitere Bausteine: Wizard-Kopf & Schritt-Anzeige, Buttons (primär/sekundär/Ghost; Zustände
  normal/gedrückt/deaktiviert/arbeitet), Dropzone-Icons und **einheitliche Texte** (erledigt die 3 geparkten
  Aufgaben aus CLAUDE.md), Seiten-Kachel (normal/markiert/wird gezogen/gedreht), Mehrfach-Auswahl-Leiste,
  Vollbild-Seitenansicht, Stärke- & Zielgrößen-Auswahl, Verarbeitungs-Animation, Toast mit „Rückgängig",
  Leer- & Fehlerzustände.
- Animationen beschreiben (Dauer/Kurve): Startscreen-Verwandlung, Schrittwechsel, Button-Druck,
  Seiten-Nachrutschen, Erfolgs-Haken. Bei „Bewegung reduzieren" (Systemeinstellung) abgeschwächt.
- Technische Grenzen: **kein Framework, kein Build-Schritt** (reines HTML/CSS/JS), alles offline → eine
  Premium-Schrift (z. B. Inter) muss als Datei mitgeliefert werden, kein Google-Fonts-Link.

## 6. Wer macht was – und wann

| Phase | Wer | Was | Ergebnis |
|---|---|---|---|
| **0 – jetzt** | Claude Code | Dieses Konzept finalisieren; danach ein **fertiges Design-Briefing** als Datei `design/briefing.md` schreiben (zum Kopieren in Claude Design) | Briefing |
| **1** | **Claude Design** (du + Claude Design in Claude) | Designsystem (Farben, Schrift, Buttons, Icons, Animationen) + alle Screens des Wizards inkl. aller Zweige als klickbarer Prototyp; du gibst dort Feedback, bis es dir gefällt | Freigegebenes Design |
| **1b – parallel zu 1** | Claude Code | **Unsichtbare Technik** bauen, die vom Aussehen unabhängig ist: Wizard-Steuerung mit Zweigen (inkl. Zurück-Taste), Datei-Eingang + Regeln, Seiten-Editor-Logik, Vorschau-Rendering, Zielgröße, Umwandeln, Speichern-Schritt (Name, „Speichern unter") – mit schlichter Übergangs-Optik | Funktionierende Logik |
| **2 – Übergabe** | du | Design aus Claude Design an Claude Code übergeben (Übergabe/Export, Dateien in Ordner `design/` legen oder Link hier einfügen) | Design im Projekt |
| **3** | Claude Code | Design 1:1 umsetzen: neues HTML/CSS, Icons, Schrift, Animationen; Tab-Leiste entfernen | Fertige App |
| **4** | Claude Code + du | Test auf Handy & PC, Feinschliff; dann nach CLAUDE.md fragen, ob committet werden soll → Commit-Texte → du committest per GitHub Desktop | Live auf Render |

Warum so: Claude Design ist stark im visuellen Entwerfen und schnellen Ausprobieren von Varianten;
Claude Code kennt den Code und setzt um. Phase 1b spart Zeit, weil die Technik nicht auf das Design warten muss.
Hinweis: Das eigenständige Claude Design (claude.ai/design) schließt bis **14.12.2026** – Claude Design ist
jetzt direkt in Claude integriert; dort arbeiten.

## 7. Technische Umsetzung (Claude Code)
- **Neuer Branch** `redesign` von `main` (der bisherige Stand ist dort bereits gemerged).
- Struktur (weiter Vanilla-JS-Module, Zweige lazy geladen wie bisher):
  - `docs/app.js` → Startscreen (beide Zustände), geteilter Button + Bottom Sheet, **Wizard-Steuerung**
    (Schritte je Zweig, History-API für die Zurück-Taste, Übergänge).
    Verkleinern-Logik wandert nach `docs/compress.js`.
  - **Neu:** `docs/intake.js` (Datei-Eingang: Typ, Seitenzahl, erste Vorschau, Regeln für den Button).
  - **Neu:** `docs/page-editor.js` (Seiten-Editor, genutzt von Zusammenführen **und** Seiten ordnen) und
    `docs/preview.js` (Seitenvorschau: Rendern, nur sichtbare Seiten, Vollbild).
  - `docs/merge.js` → erzeugt aus der Seitenliste des Editors (Quelle, Seite, Drehung) das PDF – damit
    deckt es **Zusammenführen und Seiten ordnen** ab (kein eigenes Modul nötig).
  - `docs/split.js` → Seitenauswahl + Ausgabe „eine Datei / einzelne Dateien".
  - **Neu:** `docs/convert.js` (Umwandeln: Bild ↔ JPG/PNG/PDF, PDF → Bilder über pdf.js).
  - **Neu:** `docs/save.js` (Speichern-Schritt: Dateiname bereinigen, „Speichern unter"-Dialog wo möglich,
    sonst Download – ersetzt `ladeHerunter`).
  - `docs/lib/sortable.min.js` (neu, lokal).
- **Wiederverwenden:** `ladePdfjs`, `ladePdfLib`, `compressPdf`, `bauePdf` (`docs/pdf.js`),
  `compressImage` (`docs/image.js`, bekommt Qualität/Zielgröße als Parameter; Canvas-Logik auch für
  Umwandeln), `bildAlsJpeg` (`docs/merge.js` → nach shared), `humanSize`, `el` (`docs/shared.js`),
  Seiten-Rendering aus `docs/split.js` als Basis für `preview.js`.
- **Entfernen:** Tab-Leiste (`.tableiste` in `docs/index.html`), `aktiverModus()`/`setzeAktion()` in
  `docs/shared.js` (ersetzt durch Wizard-Button-Leiste), `parseSeiten` (ersetzt durch visuelle Auswahl),
  alle „Laden"-Texte (z. B. `LADE_ICON` + „Laden" in `docs/app.js`, `docs/merge.js`, `docs/split.js`).
- `docs/service-worker.js`: neue Dateien in `DATEIEN`, Cache auf `filekit-v5`.
- `CLAUDE.md`: geparkte Aufgaben als „im Redesign enthalten" markieren; Begriffs-Regel (Abschnitt 1) ergänzen.

## 8. Verifikation
- Lokal über `.claude/launch.json` („web", Port 8000) im Browser-Pane, Handy-Ansicht (375 px) **und**
  Desktop, Hell- und Dunkelmodus.
- Startscreen: 1 PDF (klein/groß), 1 Bild, mehrere Bilder, gemischte Dateien → richtiger Vorschlag auf dem
  Button, richtige Einträge aktiv/ausgegraut; Übergang leer → Datei gewählt läuft flüssig.
- Jeden Zweig einmal komplett: Bild verkleinern (Stufe + Zielgröße 1 MB), PDF verkleinern mit Zielgröße,
  2 PDFs + 1 Bild zusammenführen inkl. Mehrfach-Verschieben/Drehen, PDF trennen (eine Datei + einzelne
  Dateien), Seiten ordnen inkl. Löschen/Rückgängig, Bild → PNG/PDF und PDF → JPG umwandeln;
  eigener Dateiname kommt beim Speichern an; am PC erscheint „Speichern unter".
- Im ganzen UI kein „Laden"/„Download" mehr (Textsuche im Code).
- Zurück-Taste geht einen Schritt zurück, auch zurück zur Aktionswahl mit geöffneter Datei;
  großes PDF (~50 Seiten) scrollt flüssig.
- Konsole ohne Fehler; offline (Service-Worker) startet die App weiterhin.

## Bewusst später (nicht in diesem Umfang)
ZIP-Speichern & „Teilen"-Button, Vorher/Nachher-Vergleich, weitere Trenn-Modi („alle X Seiten"),
FileKit im Android-„Teilen"-Menü (Share Target – passt gut zu „Datei zuerst", nur Android).
