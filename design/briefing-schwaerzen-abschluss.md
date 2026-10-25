# Design-Briefing „Schwärzen“ + „Weiterbearbeiten“ – für Claude Design

## So benutzt du dieses Briefing

1. **Claude Design öffnen.** Am besten im **bestehenden FileKit-Projekt** („Nacht“), in dem das Designsystem und der
   Prototyp entstanden sind. Dort kennt Claude Design schon alles und baut direkt darauf auf.
   Gibt es das Projekt nicht mehr, ein neues Design-Projekt starten und diese Dateien aus dem Ordner
   `design/filekit-handoff/` mitschicken:
   - `HANDOFF.md` und `design-system/filekit.css` (Pflicht – das ist das Designsystem)
   - `referenz/designsystem/DS3-Komponenten.dc.html` und `DS4-Icons.dc.html`
   - als Muster ein paar Screens aus `referenz/screens/`: `03-Eine-Datei`, `04-Mehrere-Dateien`, `05-Aktionen-PDF`,
     `08-Verarbeiten`, `09-Speichern-Verkleinern`, `10-Seiten-anordnen`, `13-Vollbild`, `18-Gespeichert`,
     `21a-PC-Start`, `21b-PC-Editor`
2. Den **kompletten Text unterhalb der Linie** kopieren und als erste Nachricht einfügen.
3. Claude Design zeigt zuerst den **Schwärzen-Editor** am Handy in höchstens zwei Varianten → eine auswählen →
   danach werden alle Screens ausgearbeitet. Feedback geben, bis es dir gefällt.
4. **Übergabe an Claude Code:** Claude Design liefert wieder ein Handoff-Paket wie beim letzten Mal. Den Ordner nach
   `design/handoff-schwaerzen-abschluss/` legen und in Claude Code Bescheid geben.

Die ausführlichen Konzepte (inkl. Technik) stehen in `design/abschluss-konzept.md` und `design/schwaerzen-konzept.md`.
Claude Design braucht sie nicht. Alles, was fürs Design wichtig ist, steht unten.

---

# Auftrag

Du hast für meine Web-App **FileKit** das Designsystem **„Nacht“** und alle Screens entworfen. Die App ist danach
genau so umgesetzt worden. Jetzt kommen zwei Erweiterungen dazu, für die ich **nur die neuen und geänderten
Screens** brauche:

- **Teil A – „Weiterbearbeiten“:** Nach jeder Aktion kann man das gerade gespeicherte Ergebnis gleich mit einer
  weiteren Aktion bearbeiten (z. B. erst schwärzen, dann verkleinern).
- **Teil B – die neue Aktion „Schwärzen“:** Stellen in einem PDF oder Bild unkenntlich machen, z. B. Namen, IBAN
  oder Kontobewegungen, bevor man ein Dokument weitergibt.

**Ganz wichtig:** Das Designsystem „Nacht“ bleibt, wie es ist (Farben, Schrift Manrope, Abstände, Radien, Schatten,
Komponenten, Animationen, alle bestehenden Screens). Bitte **nichts Bestehendes neu erfinden**. Nutze die
vorhandenen Klassen und Bausteine aus `filekit.css` und der HANDOFF, und ergänze nur, was wirklich neu ist. Alle Texte
sind **Deutsch**. **Nur Dunkelmodus.** Mobile-first mit 375 px, dazu PC (≥ 1024 px), wo unten genannt.

## Verbindliche Begriffe (bitte überall genau so verwenden, auch in `aria-label`)

| Begriff | Bedeutung | Beispiele |
|---|---|---|
| **Wählen / Hinzufügen** | Datei vom Gerät in die App holen | „Datei wählen“, „Weitere Dateien hinzufügen“, „Wird geöffnet …“ |
| **Verarbeiten** | App arbeitet | „Wird verkleinert …“, **„Wird geschwärzt …“** |
| **Speichern** | Ergebnis aufs Gerät schreiben – nur im letzten Schritt | „Speichern“, „Gespeichert ✓“ |
| **Schwärzen** | die neue Aktion | „Schwärzen“, „Wird geschwärzt …“, „12 Stellen geschwärzt“ |
| **Stelle** | ein geschwärzter Bereich | „3 Stellen“, „Stelle löschen“, „Stelle hinzufügen“ |
| **Weiterbearbeiten** | mit dem gespeicherten Ergebnis eine weitere Aktion machen | „Diese Datei weiterbearbeiten“ |
| **Ergebnis** | die gerade gespeicherte(n) Datei(en) | „Dein Ergebnis · schon gespeichert“ |

**Nicht verwenden:**
- „Laden“, „Herunterladen“, „Download“, „Upload“
- „markieren/Markierung“ für Stellen. Das Wort ist belegt („Text ist danach nicht mehr markierbar“, farbige
  Markierung der Ursprungsdatei im Seiten-Editor).
- „Vergrößern/Verkleinern“ für den Zoom, denn „Verkleinern“ ist eine Aktion. Stattdessen „Hineinzoomen“,
  „Herauszoomen“, „Seite einpassen“.
- „weiterverarbeiten“ (stattdessen „weiterbearbeiten“) sowie „Zensieren“ und „Anonymisieren“

## Der Ablauf im Überblick

```
Start (Datei wählen) ──► Aktion ──► Schritte ──► Speichern ──► Gespeichert ✓
  ▲   ▲                                                         │      │
  │   └── Start mit Ergebnis ◄── „Diese Datei weiterbearbeiten“ ┘      │
  │       (Ergebnis ist die neue gewählte Datei)                       │
  └──────────────── „Noch eine Datei bearbeiten“ (leerer Start) ◄──────┘

Schwärzen : 2/3 Stellen schwärzen ─► Verarbeiten ─► 3/3 Speichern (mit Prüfbericht) ─► Gespeichert ✓
```

Es bleibt bei **einem** Wizard: erst Datei, dann Aktion. Die Aktion wird weiterhin nur an **einem** Ort gewählt –
auf dem Startscreen (geteilter Button bzw. Aktionen-Menü).

---

## Teil A – „Weiterbearbeiten“ (gilt für alle Aktionen)

So funktioniert es: Jede Aktion endet wie bisher mit „Speichern“ und „Gespeichert ✓“. Neu ist dort ein zweiter Knopf
**„Diese Datei weiterbearbeiten“**. Er führt zum Startscreen, auf dem das Ergebnis schon gewählt ist. Von dort geht es
wie gewohnt weiter. Einen Vorschlag gibt es nur mit gutem Grund: Ist das Ergebnis groß oder deutlich größer
geworden, wird **Verkleinern** vorgeschlagen, sonst gibt es keinen Vorschlag.

**A1 – Gespeichert ✓ mit „Weiterbearbeiten“** (Update von Screen 18)
- Erfolgsmoment und Datei-Karte wie bisher.
- Unter der Karte optional eine **Tipp-Zeile**, wenn Verkleinern vorgeschlagen wird:
  - „Tipp: Die Datei ist größer geworden (0,2 MB → 2,4 MB) – du kannst sie gleich verkleinern.“
  - „Tipp: Die Datei ist 6,8 MB groß – du kannst sie gleich verkleinern, z. B. für Online-Formulare.“
  - „Tipp: Die Dateien sind zusammen 9,1 MB groß – du kannst sie gleich verkleinern.“
- Dock: oben ein **sekundärer** Knopf „Diese Datei weiterbearbeiten“ (bei mehreren: „Diese 3 Dateien
  weiterbearbeiten“), darunter der **Haupt-Button** „Noch eine Datei bearbeiten“ (Muster wie Screen 09b). Es bleibt
  bei genau einem Haupt-Button.
- Varianten:
  - eine Datei mit Tipp (z. B. nach Zusammenführen, 6,8 MB)
  - eine Datei ohne Tipp (nach Verkleinern, Badge „−77 %“)
  - mehrere Dateien („3 Dateien gespeichert“)
  - nach Schwärzen: Karte „Vertrag_geschwärzt.pdf · 2,4 MB · 12 Stellen geschwärzt“ mit Tipp „größer geworden“
  - der Knopf im Zustand „Wird geöffnet …“ (Spinner, `.is-working`)

**A2 – Startscreen mit Ergebnis, mit Vorschlag** (Update von Screen 03 bzw. 04)
- Wie „1 Datei gewählt“ bzw. „mehrere Dateien gewählt“. Die Vorschau zeigt die erste Seite des **Ergebnisses**.
- Dazu ein dezenter Hinweis mit Haken: **„Dein Ergebnis · schon gespeichert“** (bei mehreren: „3 Ergebnisse · schon
  gespeichert“).
- Geteilter Button mit **„Verkleinern“** und ▾.
- × je Datei und „Weitere Dateien hinzufügen“ funktionieren wie bisher.

**A3 – Startscreen mit Ergebnis, ohne Vorschlag**
- Wie A2, aber statt des geteilten Buttons ein Knopf **„Aktion wählen“** mit ▾ (Icon `aufklappen`). Er öffnet das
  bekannte Aktionen-Menü, in dem dann keine Zeile als „Vorschlag“ hervorgehoben ist.
- Varianten: 1 Datei · mehrere Dateien (Streifen).

**A4 – PC (≥ 1024 px):** A2/A3 im zweispaltigen Startscreen (Muster 21a). Hinweis und Knopf stehen rechts bei der
Vorschau. Ein Board genügt.

**A5 – Übergang (Animation):** von „Gespeichert ✓“ zum Startscreen. Die Datei-Karte wird zur großen Vorschau (wie die
Verwandlung „Dropzone → Vorschau“, ca. 520 ms). Bei „Bewegung reduzieren“ nur eine Überblendung.

Bleibt unverändert: das Aktionen-Menü (die Unterzeile nennt das Ergebnis, z. B. „Vertrag_geschwärzt.pdf · 12 Seiten“),
alle Schritte, Verarbeiten- und Speichern-Screens der bisherigen Aktionen und die Rückfrage 20c.

---

## Teil B – die neue Aktion „Schwärzen“

### Worum es geht

Man macht Stellen in einem **PDF oder Bild** unkenntlich. Das Besondere: FileKit entfernt den Inhalt unter dem
Balken **wirklich** (nicht nur schwarz überdeckt) und dazu versteckte Daten wie Autor, Kommentare oder den Ort eines
Fotos. Technisch wird jede Seite dafür wie ein Scan neu aufgebaut. Fürs Design heißt das:

- Die Stellen sind **deckend schwarz**. Weichzeichnen oder Verpixeln gibt es bewusst nicht.
- **Was man sieht, wird gespeichert:** Stellen sind schon beim Bearbeiten so schwarz wie im Ergebnis. Nur die gerade
  **gewählte** Stelle ist halb durchsichtig, damit man sieht, was darunter liegt, und genau nachjustieren kann.
- Schwärzen geht nur mit **einer** Datei. Wer mehrere hat, führt sie erst zusammen und schwärzt dann über
  „Weiterbearbeiten“.
- Danach ist der Text nicht mehr markierbar, und die Datei wird meist größer. Deshalb passt „danach verkleinern“ (Teil A).

### S0 – Icons und Tokens

- **Neue Icons** (Stil wie das bestehende Set: 24er-Raster, Linie 1,8, runde Enden, `currentColor`):
  `schwaerzen` (Aktion – z. B. ein Blatt mit Textzeilen, eine davon als gefüllter Balken), `rueckgaengig`,
  `wiederholen`, `hineinzoomen`, `herauszoomen`, `einpassen`, `seiten-raster` (Seitenübersicht).
  Vorhandene Icons bitte wiederverwenden: `lupe`, `loeschen`, `haken`, `info`, `mehr`, `zurueck`, `weiter`,
  `aufklappen`.
- **Neuer Token** `--fk-redact` (Schwarz) für die Stellen.
- **Neuer Baustein „Stelle“** mit den Zuständen: normal (deckend schwarz) · gewählt (halb durchsichtig,
  2-px-Akzent-Rahmen, 4 Eck-Griffe, Papierkorb-Knopf) · wird gezogen (Rahmen wächst unter dem Finger) · Tastatur-Fokus.
  Griffe sind sichtbar etwa 12 px groß, haben aber 44 px Tippfläche. Hell mit dunklem Rand, damit man sie auf Weiß
  und auf Schwarz sieht. Der Papierkorb ist ein runder 44-px-Knopf oben rechts außerhalb der Stelle. Ist dort kein
  Platz, rutscht er nach innen oder unten.

### S1 – Startscreen und Aktionen-Menü (Update von 01, 05, 05b, 21a)

- Reihenfolge im Menü: Verkleinern · Zusammenführen · Trennen · Seiten ordnen · Umwandeln · **Schwärzen**.
- Menüzeile: **„Schwärzen“** – „Namen, Nummern oder andere Stellen unkenntlich machen.“
- Bei mehreren Dateien ausgegraut mit dem Grund **„Nur für eine einzelne Datei“**. Schwärzen ist nie „Vorschlag“.
- Startscreen leer: Die Info-Zeile zeigt jetzt 6 Aktionen, auf dem Handy umbrechend **3 + 3** (statt 3 + 2). Am PC
  stehen 6 Zeilen in der Aktionen-Liste.

### S2 – „Stellen schwärzen“, leer (Schritt 2 von 3)

Prinzip: **eine Seite nach der anderen**, groß und ganz sichtbar (A4 passt bei 375 px ganz zwischen Kopfzeile und
Dock). Die Seite ist die Zeichenfläche. Geblättert wird mit Pfeilen unter der Seite, **nicht** durch Wischen (das
würde mit dem Zeichnen kollidieren).

```
┌───────────────────────────────────────────┐
│ ‹        Stellen schwärzen             ×  │  Kopfzeile (wie bisher)
│          Schritt 2 von 3                  │
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬░░░░░░░░░░░░░ │
│ [Lupe Text suchen]   [Rückg.] [Wdh.] [⋯]  │  Werkzeugleiste
│  Hinweiszeile (nur solange keine Stelle)  │
│ ┌───────────────────────────────────────┐ │
│ │ weiße Seite, groß                     │ │
│ └───────────────────────────────────────┘ │
│   ‹    Seite 2 von 12 · 5 Stellen    ›  [▦]│  Blättern · Zähler · Seitenübersicht
├───────────────────────────────────────────┤
│              [   Weiter   ]               │  Dock – deaktiviert, solange 0 Stellen
└───────────────────────────────────────────┘
```

- Hinweiszeile (Handy): „Ziehe mit dem Finger über eine Stelle, um sie zu schwärzen. Einzelne Wörter kannst du auch
  antippen.“ Am PC: „Ziehe mit der Maus über eine Stelle, um sie zu schwärzen. Einzelne Wörter kannst du auch anklicken.“
- „Rückgängig“ und „Wiederholen“ sind Icon-Buttons, ausgegraut, solange es nichts zu tun gibt. ⋯ hat das
  `aria-label` „Weitere Optionen“.
- Der Zähler („5 Stellen“) zählt alle Seiten zusammen.
- Varianten:
  - **PDF mit Text** – wie oben.
  - **Scan-PDF ohne Text:** kein „Text suchen“. Die Hinweiszeile lautet ohne den Satz zum Antippen, dazu eine kleine
    Info: „In diesem PDF ist kein Text hinterlegt – die Suche ist daher nicht verfügbar.“
  - **Bild:** kein Blättern, keine Seitenübersicht, kein „Text suchen“.

### S3 – „Stellen schwärzen“ mit Stellen

- Mehrere schwarze Stellen auf der Seite, eine davon gewählt (siehe S0). Zähler aktualisiert, „Weiter“ aktiv.
- Moment „wird gezogen“: Ein neuer Rahmen wächst unter dem Finger.
- Bedienung:

| Was | Handy | PC (Maus) | Tastatur |
|---|---|---|---|
| Bereich schwärzen | mit einem Finger über die Stelle ziehen | ziehen (Fadenkreuz-Cursor) | ⋯ → „Stelle hinzufügen“: Rahmen in der Seitenmitte, Pfeile verschieben, Umschalt+Pfeile ändern die Größe, Enter bestätigt |
| Wort schwärzen | Wort antippen | Wort anklicken | über „Text suchen“ |
| Stelle wählen | antippen | anklicken | Tab |
| Verschieben / Größe | Stelle bzw. Eck-Griff ziehen | ebenso | Pfeile / Umschalt+Pfeile |
| Löschen | Papierkorb → Toast „Stelle gelöscht · Rückgängig“ | ebenso oder Entf | Entf |
| Rückgängig / Wiederholen | Knöpfe in der Werkzeugleiste | ebenso | Strg+Z / Strg+Y |
| Zoomen | zwei Finger | Strg+Mausrad, Knöpfe | + / − |

- Ein Tipp auf eine leere Fläche hebt nur die Auswahl auf. Ein Finger zeichnet immer, auch gezoomt. Verschoben wird
  dann mit zwei Fingern.

### S4 – Gezoomt

200 % Zoom, Knopf **„Seite einpassen“** erscheint, beim ersten Zoomen einmalig der Hinweis „Mit zwei Fingern
verschieben“. Am PC Knöpfe „Herauszoomen“ / „Hineinzoomen“.

### S5 – Bottom Sheet „Text suchen und schwärzen“

- Feld „Suchbegriff“, Platzhalter „z. B. einen Namen oder eine Nummer“.
- Live-Ergebnis: „7 Treffer auf 4 Seiten“ bzw. „Kein Treffer“.
- Trefferliste: je Treffer die Seite und ein kurzer Textausschnitt. Das **ganze Wort** wird gezeigt, der gefundene
  Teil ist hervorgehoben. **Geschwärzt werden nur die gesuchten Zeichen**, z. B. wird aus „max.mustermann@example.de“
  „max.██████████@example.de“. Die Hervorhebung soll also zeigen, was schwarz wird und was stehen bleibt.
- Jeder Treffer hat ein Kontrollkästchen (alle angehakt), dazu „Alle“ / „Keine“.
- Hauptknopf im Sheet: **„7 Treffer schwärzen“**.
- Zustände: leer · Treffer · kein Treffer · „2 Treffer sind schon geschwärzt“.

### S6 – Toasts

„7 Stellen geschwärzt · Rückgängig“ (nach dem Suchen) und „Stelle gelöscht · Rückgängig“ – im bestehenden Toast-Stil.

### S7 – Bottom Sheet „Seiten“ (Seitenübersicht)

Miniaturen in 2–3 Spalten, auf denen die schwarzen Stellen schon zu sehen sind. Je Seite ein Badge mit der Zahl der
Stellen, die aktuelle Seite ist hervorgehoben. Antippen springt zur Seite. Zweck: „Habe ich alles erwischt?“

### S8 – Bottom Sheet ⋯

„Stelle hinzufügen“ · „Ganze Seite schwärzen“ · (Trenner) · „Alle Stellen dieser Seite löschen“ (rot, danach Toast
mit „Rückgängig“).

### S9 – Verarbeiten

Wie Screen 08 mit „Wird geschwärzt …“ und „Seite 3 von 12 · 25 %“. Wahrscheinlich ist kein eigener Screen nötig.

### S10 – Speichern mit Prüfbericht (Schritt 3 von 3)

Verarbeitet wird **vor** diesem Schritt (wie bei Verkleinern). Deshalb kann er das echte Ergebnis zeigen:

- **Ergebnis-Karte:** Miniatur der ersten geschwärzten Seite, „12 Stellen auf 4 Seiten geschwärzt“, Größe
  „0,2 MB → 2,4 MB“. Kein Ersparnis-Badge; wird die Datei größer, bleibt die Anzeige neutral (nicht rot).
- **Prüfbericht** als Liste mit Haken (`--fk-success-text`):
  - PDF: „Inhalt unter den Stellen entfernt – nicht nur überdeckt“ · „Kein versteckter Text mehr enthalten (Text ist
    dadurch nicht mehr markierbar)“ · „Metadaten, Kommentare und Anhänge entfernt“
  - Bild: „Inhalt unter den Stellen entfernt“ · „Ortsangaben, Kameradaten und Vorschaubild entfernt“
- Sekundärer Knopf **„Ergebnis ansehen“** → Vollbild (Screen 13) mit den Seiten der fertigen Datei.
- Ausgabe-Zeile „Format: PDF“ (bei Bildern „JPG“ oder „PNG“).
- Hinweis (`.note`): „Nur die geschwärzten Stellen sind entfernt. Prüfe vor dem Weitergeben alle Seiten.“
- Dateiname-Feld mit dem Vorschlag `Vertrag_geschwärzt` (Endung fest). Darunter: „Steht im Dateinamen etwas
  Persönliches? Dann ändere ihn hier.“ und wie immer „Wird als neue Datei gespeichert – das Original bleibt unverändert.“
- Ist die Datei deutlich größer geworden: Hinweis „Die Datei ist größer geworden. Nach dem Speichern kannst du sie
  gleich verkleinern.“
- Dock: „Speichern“.
- Varianten: PDF · Bild (z. B. Foto, „Format: JPG“) · „Datei ist größer geworden“.

### S11 – Gespeichert ✓ nach Schwärzen

Ist in **A1** enthalten (Karte mit „12 Stellen geschwärzt“).

### S12 – PC-Editor (≥ 1024 px, volle Breite wie 21b)

- **Links** eine Spalte mit Seiten-Miniaturen samt Stellen-Zähler, die aktuelle Seite ist hervorgehoben.
- **Mitte** die Seite, so hoch wie möglich. Darüber die Werkzeugleiste: Rückgängig, Wiederholen, Herauszoomen,
  Hineinzoomen, Seite einpassen, ⋯.
- **Rechts** das Suchfeld direkt sichtbar (statt Sheet) mit Trefferliste und „Treffer schwärzen“. Darunter
  „Stellen auf dieser Seite“ als Liste mit „Löschen“ je Zeile (wichtig für Tastatur und Screenreader).
- **Fußleiste** „12 Stellen auf 4 Seiten“ + „Weiter“ rechts (wie 21b).
- **Cursor:** Fadenkreuz über der Seite, Hand über einer Stelle, Doppelpfeile an den Griffen.

---

## Animationen (bitte Dauer in ms und Kurve angeben, passend zu HANDOFF Kap. 8)

- Eine neue Stelle „rastet ein“, wenn man loslässt (ca. 160 ms).
- „Treffer schwärzen“: Die neuen Stellen erscheinen leicht versetzt nacheinander.
- Löschen: Die Stelle blendet aus.
- Zoom und „Seite einpassen“: sanft.
- Übergang „Gespeichert ✓ → Startscreen mit Ergebnis“ (A5).
- Nur `transform` und `opacity`. Bei „Bewegung reduzieren“ passiert alles sofort bzw. nur als Überblendung.

## Barrierefreiheit

- Stellen sind fokussierbar (`role="button"`, z. B. `aria-label="Geschwärzte Stelle 2 von 3 auf Seite 4"`). Die
  Tab-Reihenfolge läuft von oben nach unten.
- Zu jedem Ziehen gibt es eine Alternative: „Stelle hinzufügen“ + Pfeiltasten, „Text suchen“, am PC die Liste
  „Stellen auf dieser Seite“.
- Ansagen per `aria-live`: „Stelle hinzugefügt. 3 Stellen auf Seite 2.“ · „7 Stellen geschwärzt.“ · „Seite 3 von 12.“
- Gewählte Stelle: Akzent-Rahmen + sichtbarer Fokus-Ring. Kontraste wie im Designsystem. Touch-Flächen mindestens 44 px.
- Startscreen mit Ergebnis: Der Hinweis „Dein Ergebnis · schon gespeichert“ wird mit angesagt.

## Technische Grenzen (wie beim ersten Mal)

- Reines HTML/CSS/JavaScript, kein Framework, kein Build-Schritt.
- Farben/Abstände nur als CSS-Variablen mit Präfix `--fk-`. Keine Hex-Werte im Markup (außer in SVG-Illustrationen).
- **Nur Dunkelmodus.** Schrift Manrope (liegt lokal). Icons als Inline-SVG mit `currentColor`.
- Safe Area beachten, Touch-Flächen mindestens 44 px.

## Lieferumfang – Handoff-Paket wie beim letzten Mal

Bitte im selben Aufbau wie `filekit-handoff/`, aber **nur mit Neuem und Geändertem**:

```
HANDOFF.md                     ← Nachtrag zur bestehenden HANDOFF: nur neue/geänderte Kapitel
                                 (Begriffe, Ablauf, Regeln im Aktionen-Menü, Screens, Interaktion, Animationen,
                                 Barrierefreiheit) – mit allen Texten im genauen Wortlaut
design-system/filekit-ergaenzung.css  ← nur neue Tokens und Komponenten (Präfix --fk-), bestehende Regeln
                                 nicht verändern; muss doch etwas geändert werden, im HANDOFF ausdrücklich nennen
icons/*.svg                    ← nur die neuen Icons
referenz/screens/*.dc.html     ← alle neuen und geänderten Screens (A1–A5, S1–S10, S12), Nummern wie oben
```

Dazu ein **klickbarer Prototyp** mit diesen Wegen:
1. 1 PDF → ▾ → Schwärzen → Stellen schwärzen (ziehen, Wort antippen, Text suchen) → Verarbeiten → Speichern mit
   Prüfbericht → Gespeichert ✓
2. Weiter mit „Diese Datei weiterbearbeiten“ → Startscreen mit Ergebnis (Vorschlag Verkleinern) → Verkleinern →
   Gespeichert ✓
3. Trennen „Jede Seite als eigene Datei“ → Gespeichert ✓ → „Diese 3 Dateien weiterbearbeiten“ → Startscreen mit
   „Aktion wählen“

## Vorgehen

1. Zuerst den **Schwärzen-Editor am Handy** (S2 leer und S3 mit gewählter Stelle) in **höchstens zwei Varianten**
   zeigen, damit ich wählen kann. Der Stil steht ja schon fest; es geht um Werkzeugleiste, Stelle und Blättern.
2. Danach alle Screens aus Teil A und B in der gewählten Variante ausarbeiten.
3. Am Ende Prototyp und Handoff-Paket.

## Bitte vorher fragen, falls …

… etwas davon mit dem bestehenden Designsystem kollidiert oder du einen besseren Weg siehst. Dann lieber kurz
nachfragen, als Bestehendes zu verändern.
