<!-- Freigegeben vom Nutzer am 24.10.2026 mit allen Empfehlungen aus Kapitel 8. Ablauf bis zur Umsetzung: Kapitel 6. -->

# FileKit – Neue Aktion „Schwärzen“ · Konzept (freigegeben)

## Kontext

FileKit bekommt eine sechste Aktion: **Schwärzen**. Damit macht man Stellen in einem PDF oder Bild so unkenntlich,
dass sie **wirklich weg** sind und nicht nur schwarz überdeckt. Die Grundsätze bleiben: alles lokal auf dem Gerät
und offline, ein Wizard („erst Datei, dann Aktion“), die Begriffe Wählen/Verarbeiten/Speichern und das Design „Nacht“
(HANDOFF). Dieses Dokument klärt Machbarkeit und Technik, entwirft die Bedienung und listet die Screens für
Claude Design sowie die Umsetzungsschritte auf.

Grundlage: Code-Stand Branch `redesign` (c3bd0df), Bibliotheken pdf.js 5.4.149 und pdf-lib (beide schon in `docs/lib/`).

---

## Kurzfassung – die Empfehlungen auf einen Blick

| Thema | Empfehlung |
|---|---|
| Machbar? | **Ja.** Komplett im Browser, offline, ohne neue Bibliothek. |
| Technik PDF | Jede Seite wird **wie ein Scan neu aufgebaut**: als Bild gerendert, die Stellen werden direkt in die Pixel geschwärzt, daraus entsteht ein neues PDF. Unter dem Balken bleibt nichts – kein Text, keine Bilder, keine versteckten Daten. Preis dafür: Der Text ist danach nicht mehr markierbar, und die Datei wird meist größer. |
| Technik Bilder | Bild neu zeichnen, schwärzen, neu speichern (PNG bleibt PNG, alles andere wird JPG). Ortsangaben und Kameradaten (EXIF) fallen dabei weg. |
| Platz im Menü | 6. Aktion am Ende: Verkleinern · Zusammenführen · Trennen · Seiten ordnen · Umwandeln · **Schwärzen**. Nur für **eine** Datei (PDF oder Bild), nie als Vorschlag. |
| Ablauf | 2/3 „Stellen schwärzen“ → Verarbeiten „Wird geschwärzt …“ → 3/3 „Speichern“ mit Prüfbericht → Gespeichert ✓ |
| Bedienung | Seite für Seite. Ein Finger zieht über eine Stelle, ein angetipptes Wort wird geschwärzt, zwei Finger zoomen. „Text suchen“ schwärzt alle Vorkommen auf einmal. Dazu Rückgängig/Wiederholen. |
| Danach | Passt in den neuen Abschluss-Workflow: Das Ergebnis ist eine normale Datei. Sinnvoll ist danach z. B. Verkleinern, weil das Ergebnis meist größer wird. |

---

## 1. Was „echtes Schwärzen“ heißt

Ein bekannter Fehler, der immer wieder sogar bei Behörden passiert: Ein schwarzes Rechteck wird **über** den Text gelegt.
Im PDF steht der Text aber weiter darunter. Man kann ihn markieren, kopieren, durchsuchen oder das Rechteck einfach
wegschieben. FileKit muss deshalb garantieren:

1. **Text** unter dem Balken ist weg, auch im unsichtbaren Textlayer (Kopieren, Suchen, Vorlesen).
2. **Bilder und Grafiken** unter dem Balken sind weg und nicht nur verdeckt.
3. **Versteckte Daten** des Dokuments sind weg: Metadaten (Autor, Titel, Programm), Kommentare, Formularwerte,
   Anhänge, Lesezeichen, ausgeblendete Ebenen, ältere Versionen (inkrementelle Speicherungen), Vorschaubilder.
4. Bei Fotos sind die **EXIF-Daten** weg: GPS-Ort, Kamera und das eingebettete Vorschaubild. Darin stünde das
   **ungeschwärzte** Foto!
5. Der Balken ist **deckend schwarz**. Weichzeichnen oder Verpixeln wird bewusst **nicht** angeboten, weil man das
   teilweise zurückrechnen kann.

---

## 2. Technische Machbarkeit

### 2.1 Was die vorhandenen Bibliotheken können

| Baustein | Kann | Kann nicht |
|---|---|---|
| **pdf.js 5.4** (schon da) | Seiten sehr genau als Bild rendern (wird schon für Verkleinern, Umwandeln und die Miniaturen genutzt). Text je Seite auslesen und die genaue Position jedes einzelnen Zeichens bestimmen (aus der Zeichenliste der Seite, `getOperatorList`) – das ist die Grundlage für Suche und „Wort antippen“ (siehe 2.4). Ausgeblendete Ebenen werden nicht gerendert. | PDFs verändern oder schreiben. Ein Schwärzen-Werkzeug hat es nicht. |
| **pdf-lib** (schon da) | Seiten kopieren, neue PDFs bauen, Bilder einbetten, Rechtecke **zeichnen**. | Den Inhalt einer Seite zerlegen und gezielt Text oder Bildteile **entfernen**. Ein mit pdf-lib gezeichnetes Rechteck hätte genau das Problem „nur überdeckt“. |
| **Eigener PDF-Bau** `bauePdf` in `docs/pdf.js` (schon da) | Baut aus JPEG-Bildern ein schlankes PDF: ein Bild je Seite, sonst nichts (auch keine Metadaten). | – |
| **Browser (Canvas)** | Bilder dekodieren, Pixel übermalen, als JPG/PNG neu kodieren. Dabei fallen die EXIF-Daten weg. | – |

### 2.2 Optionen für PDFs

**Option A – Seite als Bild neu aufbauen („Rastern“)** · **Empfehlung**

Ablauf je Seite: mit pdf.js rendern (≈ 2000 px lange Kante, wie bei Umwandeln) → schwarze Rechtecke direkt in die
Pixel malen → als JPEG kodieren → mit `bauePdf` ein neues PDF bauen.

- \+ **Sicher durch die Bauweise:** Im Ergebnis stehen nur Pixel, die FileKit selbst gemalt hat. Alter Text, alte
  Bilder, Metadaten, Kommentare, Anhänge oder versteckte Ebenen haben gar keinen Weg ins Ergebnis.
- \+ Funktioniert für jedes PDF gleich (Text, Scan, Formular, Grafik). Genutzt wird nur Code, der in FileKit schon
  erprobt ist – Verkleinern macht fast dasselbe.
- \+ Kein zusätzlicher Speicherbedarf, die App bleibt klein.
- – Der Text ist danach nicht mehr markierbar oder durchsuchbar. Das ist wie bei Verkleinern, der Hinweis ist also schon bekannt.
- – Textdokumente werden meist größer (Richtwert 150–350 KB je Seite). Auffangen lässt sich das über den
  Abschluss-Workflow („danach verkleinern“).
- – Links, Lesezeichen und ausfüllbare Felder gehen verloren. Formularwerte bleiben sichtbar, lassen sich aber nicht
  mehr ändern. Digitale Signaturen sind danach ungültig – das ist bei jeder Änderung an einem PDF so.

Innerhalb von A gibt es zwei Varianten:

- **A1 – alle Seiten neu aufbauen** · **Empfehlung**: Das Ergebnis ist einheitlich, und auch auf Seiten ohne
  Schwärzung sind versteckte Daten weg. Leicht zu erklären: „wie ein sauberer Scan“.
- **A2 – nur Seiten mit Stellen werden Bild, die übrigen werden unverändert kopiert**: Das ist bei langen Dokumenten
  kleiner und schneller, und auf unberührten Seiten bleibt der Text markierbar. Dafür ist das Ergebnis gemischt
  („Warum kann ich auf Seite 3 nichts markieren?“), und auf unberührten Seiten bleiben Kommentare, Formulardaten und
  versteckter Text erhalten. A2 kann später als Schalter dazukommen, wenn Größe oder Dauer stören.

**Option B – Inhalte gezielt aus dem PDF entfernen (so macht es Adobe Acrobat)**

Buchstaben, Bildteile und Grafiken unter dem Balken werden aus dem Seiteninhalt herausgeschnitten, alles andere bleibt Text.

- \+ Der Text bleibt markierbar, die Datei bleibt klein.
- – Das können weder pdf.js noch pdf-lib. FileKit müsste es selbst bauen: Seiteninhalte zerlegen, Schriften,
  Zeichenbreiten und Kodierungen verstehen, Bilder in allen PDF-Formaten (JPEG, JPEG 2000, JBIG2, Fax …) dekodieren,
  beschneiden und neu schreiben. Das ist ein eigenes PDF-Programm mit Monaten Arbeit, und **jeder Fehler wäre ein
  Datenleck** – genau das darf beim Schwärzen nicht passieren.
- Fazit: nicht selbst bauen.

**Option C – fertige PDF-Engine MuPDF (als WebAssembly)**

MuPDF kann echtes Schwärzen, bei dem der übrige Text erhalten bleibt.

- \+ Professionelles Ergebnis wie bei B.
- – Etwa 10 MB zusätzlich. FileKit ist bewusst von einer ~10-MB-Engine auf das schlanke pdf.js umgestiegen. Der
  Start auf dem Handy wird langsamer, und der Offline-Speicher wächst stark.
- – Lizenz AGPL: FileKit müsste dann selbst unter AGPL stehen und den Quellcode offenlegen (oder eine teure
  kommerzielle Lizenz kaufen). Das ist eine rechtliche Entscheidung.
- Fazit: nur dann, wenn „der Text muss markierbar bleiben“ später ein echter Bedarf wird.

**Empfehlung: Option A1.** Beim Schwärzen geht Sicherheit vor Komfort. A ist die einzige Variante, bei der die
Sicherheit nicht von fehlerfreiem Spezialcode abhängt, sondern schon aus der Bauweise folgt. Außerdem passt sie zu
FileKits Prinzip „klein, offline, ohne Server“. Die Nachteile (Größe, Text nicht markierbar) kennt FileKit schon von
Verkleinern, und der Abschluss-Workflow fängt sie auf.

### 2.3 Bilder (JPG, PNG, WebP, GIF, BMP, AVIF, HEIC)

- Bild dekodieren (wie bisher mit `dekodiere` in `image.js`, das die Handy-Drehung beachtet), auf ein Canvas zeichnen,
  Stellen schwarz übermalen, neu kodieren.
- Ausgabeformat: **PNG bleibt PNG, alles andere wird JPG**. Das ist dieselbe Regel, die Verkleinern und Zusammenführen
  schon nutzen. JPG-Qualität ≈ 0,92.
- Sicher durch die Bauweise: Das neue Bild enthält nur die Pixel. EXIF, GPS, eingebettete Vorschaubilder und
  Farbprofile fallen weg.
- Grenzen: Bei animierten GIFs bleibt nur das erste Bild (mit Hinweis). Sehr große Fotos (> ~16 Megapixel) müssen auf
  iPhones verkleinert werden, weil Safari Canvas-Flächen begrenzt. Passiert das, steht ein Hinweis im Speichern-Schritt.
- Bei Bildern gibt es keine Textsuche, dafür bräuchte es Texterkennung (OCR, siehe „Bewusst später“).

### 2.4 Text finden: Suche und „Wort antippen“

- FileKit liest aus der Zeichenliste der Seite (`getOperatorList` von pdf.js) die **genaue Position jedes Zeichens** –
  genau so, wie pdf.js die Buchstaben beim Anzeigen setzt. Daraus entsteht eine Wortliste mit einem Rahmen je Wort.
  Der ursprünglich geplante Weg über den `TextLayer` von pdf.js ist zu ungenau: Er schätzt die Breiten mit einer
  Ersatzschrift und schneidet bei vielen Schriften Buchstaben an (Ergebnis des Vorab-Tests, 2.4.1).
- Damit gehen zwei Dinge: **Suche** (alle Vorkommen eines Namens oder einer Nummer finden und auf einmal schwärzen)
  und **Wort antippen** (genau schwärzen, ohne mit dem Finger zielen zu müssen).
- Die Rahmen bekommen Rand: 10 % der Schrifthöhe links und rechts (manche Buchstaben wie das „f“ in Times ragen über
  ihre Breite hinaus), 5 % oben und unten. Weil das Ergebnis gerastert wird, muss ein Rahmen nur **optisch** passen.
  Der Nutzer sieht vor dem Speichern genau, was schwarz wird.
- Die Suche ist großzügig: Groß-/Kleinschreibung, mehrfache Leerzeichen und Zeilenumbrüche spielen keine Rolle, und
  Trennstriche am Zeilenende werden überbrückt („Muster-⏎mann“). Leerzeichen in Nummern werden ignoriert, damit
  „DE12 3456 …“ auch „DE123456…“ findet.
- Grenzen: Gescannte PDFs haben keinen Text, dann gibt es keine Suche und kein Antippen. Hinweis: „In diesem PDF ist
  kein Text hinterlegt (z. B. bei Scans) – ziehe die Stellen mit dem Finger.“ Manche PDFs enthalten fehlerhaft
  kodierten Text (Zeichensalat), dann findet die Suche nichts. Deshalb immer der Satz „Prüfe alle Seiten selbst.“

#### 2.4.1 Ergebnis des Vorab-Tests (24.10.2026)

Getestet wurden drei Verfahren für die Wortrahmen an 8 Test-PDFs mit zusammen 18 Seiten. Fünf PDFs wurden aus
HTML mit Edge erzeugt bzw. mit pdf-lib gebaut (Daten erfunden), zwei sind echte, fertig gesetzte Handbücher
(Anno 1404, aus dem Programmordner), dazu kommt ein reines Bild-PDF. Gemessen wurde an der gerenderten Seite, ob eine
Rahmenkante durch Schrift schneidet. Zusätzlich wurden alle Wörter einmal komplett geschwärzt und das Bild
nach Buchstabenresten abgesucht – automatisch und mit dem Auge.

| Test-PDF | Wörter | exakt (Zeichenliste) | TextLayer-Verfahren | gleichmäßig verteilt | Suche |
|---|---|---|---|---|---|
| Kontoauszug (Arial, Tabelle) | 157 | 157 ok | 157 ok | 61 ok | alle 9 Begriffe richtig |
| Mietvertrag (Times, Blocksatz, Silbentrennung, Ligaturen, gedrehte Randnotiz) | 260 | 250 ok\* | 219 ok | 85 ok | alle 6 richtig, auch über Zeilentrennung |
| Gehaltsabrechnung (Calibri 8 pt, Tabelle) | 110 | 110 ok | 89 ok | 55 ok | alle 4 richtig |
| Standardschrift (pdf-lib, Helvetica, schräger Text) | 41 + 3 schräg | 41 ok | 39 ok | 10 ok | alle 2 richtig |
| Kontoauszug, Seite um 90° gedreht | 157 | 150 ok\* | 148 ok | 63 ok | richtig |
| Scan (nur Bild) | 0 | – | – | – | 0 Treffer, wie erwartet |
| Anno-Handbuch (echt, Layout mit Hintergrundbild, 5 Seiten) | 2.477 | 2.345 ok\* | 1.593 von 2.457 ok | 575 von 2.457 ok | – |
| Anno ToolOne (echt, Word-Layout mit Tabellen, 4 Seiten) | 817 | 719 ok\* | 718 von 835 ok | 183 von 835 ok | – |

\* Die übrigen Meldungen beim exakten Verfahren wurden einzeln angesehen. Es waren durchweg Messartefakte:
Unterstreichungen, Linien oder Hintergrundbilder direkt neben dem Wort, sich überlappende Texte und sehr enge
Zeilen- oder Wortabstände. In den komplett geschwärzten Ansichten ist **kein Buchstabenrest** zu sehen. Die
Restpixel-Zählung ergab bei allen fünf Text-PDFs 0. Mit nur 4 % Rand blieben in Times winzige Spitzen des „f“
sichtbar; deshalb sind es jetzt 10 %.

**Folgerungen**
- „Wort antippen“ kommt in die erste Version – mit dem **exakten Verfahren**. Das TextLayer-Verfahren trifft nur, wenn
  die Schrift im PDF zufällig der Ersatzschrift des Browsers entspricht (z. B. Arial). Bei Blocksatz, Calibri oder
  echten Layouts schneidet es 10–35 % der Wörter an.
- Die Suche funktioniert wie geplant: Treffer auch über Zeilenumbrüche mit Trennstrich, IBAN mit und ohne
  Leerzeichen, gedrehte Seiten, gedrehter Text.
- Das exakte Verfahren rechnet den Textzustand nach, wie pdf.js ihn beim Zeichnen führt (Schriftgröße, Zeichen- und
  Wortabstand, Textmatrix, Unterformulare). Das sind etwa 150 Zeilen. Es stützt sich auf **interne Datenformate
  von pdf.js** (Zeichenliste, Schriftdaten). Bei einem Update von pdf.js muss es deshalb neu geprüft werden (siehe 2.6).
- Nicht getestet: senkrechte Schrift (Chinesisch/Japanisch), Type3-Schriften, Scans mit unsichtbarer Texterkennung
  (z. B. aus Scanner-Apps – dort sollte die Suche sogar funktionieren) und die Rechenzeit auf dem Handy. Dafür gibt
  es im Umsetzungsschritt 2 einen Ersatzweg: Fehlen Schriftdaten, wird das TextLayer-Verfahren genutzt, mit größerem Rand.
- Der Prototyp (Funktion `woerterExakt` in `spike-logik.js`, mit Anleitung zum erneuten Ausführen) dient als Vorlage
  für `textstellen.js`. Er liegt außerhalb des Repos unter
  `%APPDATA%\Claude\side-session-notes\local_c3b6cba7-5672-4c91-b0c6-2623d5e5f6f9\spike-wortrahmen\`.

### 2.5 Dateigröße und Leistung auf dem Handy

| | Richtwert (grob geschätzt, im Test messen) |
|---|---|
| Rechenzeit | Etwa wie bei Verkleinern: je Seite einmal rendern und als JPEG kodieren. Auf einem Mittelklasse-Handy etwa 0,3–1 s je Seite, also 12 Seiten ≈ 5–10 s. Fortschritt im Verarbeiten-Screen, jederzeit abbrechbar. |
| Arbeitsspeicher | Immer nur eine Seite gleichzeitig (≈ 11 MB je Seite), deshalb gehen auch lange PDFs. |
| Dateigröße | Ein Text-PDF mit 10 Seiten und 150 KB wird etwa 2–3 MB groß. Ein Scan-PDF bleibt ähnlich groß, Fotos ebenso. |
| Bearbeiten | Die Anzeige nutzt die vorhandenen großen Seitenbilder (1200 px aus `thumbs.js`). Textpositionen werden je Seite erst bei Bedarf gelesen. |
| Auflösung | 2000 px lange Kante (A4 ≈ 170 dpi, gut lesbar und druckbar). Wird Kleingedrucktes im Test unscharf, auf 2500 px erhöhen. JPEG-Qualität ≈ 0,85–0,9, im Test festlegen. |

### 2.6 Grenzen und Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Der Nutzer übersieht eine Stelle (z. B. den Namen auf Seite 7). | Die Suche schwärzt alle Treffer, die Seitenübersicht zeigt je Seite die Zahl der Stellen. Im Speichern-Schritt steht: „Nur die geschwärzten Stellen sind entfernt. Prüfe vor dem Weitergeben alle Seiten.“ |
| Ein Balken deckt Buchstaben nur halb ab. | Die Stellen sehen schon beim Bearbeiten so schwarz aus wie im Ergebnis. Dazu Rand bei Wörtern und Treffern, Zoom zum Prüfen und „Ergebnis ansehen“. |
| Im Dateinamen steht etwas Persönliches („Gehalt_Max_Mustermann.pdf“). | Zusätzlicher Hinweis am Namensfeld (siehe 3.5). |
| Formularfelder ohne eigene Darstellung (selten) werden nicht mitgerendert. | Eigener Testfall. Felder mit Darstellung rendert pdf.js mit. |
| Text ist sichtbar, wird aber nicht gefunden (Zeichensalat). | Hinweis. Ziehen von Hand geht immer. |
| Sehr lange PDFs (100+ Seiten) | Dauert, funktioniert aber. Fortschritt und Abbrechen. |
| Canvas-Grenze in Safari | Seiten werden ohnehin auf 2000 px begrenzt, Fotos über 16 MP werden verkleinert. |
| Fehler im eigenen Code | Selbstprüfung nach jedem Verarbeiten (2.7) und Sicherheitstests vor der Freigabe. |
| Die Wortrahmen nutzen interne Datenformate von pdf.js (2.4.1). | pdf.js liegt fest in `docs/lib` und ändert sich nur bei einem bewussten Update. Dann den Vorab-Test (Prototyp im Notizordner) erneut laufen lassen. Fehlen Schriftdaten, greift der Ersatzweg mit größerem Rand. Ein ungenauer Wortrahmen wäre sichtbar und kein verstecktes Leck, denn geschwärzt wird immer genau das, was man sieht. |

### 2.7 Wie wir sicher wissen, dass es stimmt

- **Selbstprüfung nach jedem Verarbeiten:** FileKit öffnet das Ergebnis noch einmal mit pdf.js. Es darf auf keiner
  Seite Text enthalten und muss die richtige Seitenzahl haben, sonst kommt eine Fehlermeldung statt des Speicherns.
  Mit Bauweise A sollte das nie passieren. Die Prüfung kostet aber fast nichts und fängt Programmierfehler ab.
- **Sicherheitstests vor dem Merge** (Umsetzungsschritt 8): das geschwärzte Wort im Ergebnis suchen (PDF-Reader, Strg+F),
  Text kopieren, die Datei im Texteditor nach dem Wort durchsuchen, Dokumenteigenschaften prüfen (Autor und Titel leer),
  Foto mit GPS (Ort weg), PDF mit Kommentaren, Formular, Anhang und ausgeblendeter Ebene, gedrehte Seiten, Scan-PDF,
  PNG mit Transparenz.

---

## 3. Einordnung in die App

### 3.1 Aktionen-Menü (Regeln 6.1 erweitert)

Reihenfolge im Menü: Verkleinern · Zusammenführen · Trennen · Seiten ordnen · Umwandeln · **Schwärzen**.
Satz in der Menüzeile: „Namen, Nummern oder andere Stellen unkenntlich machen.“

| Auswahl | Schwärzen |
|---|---|
| 1 PDF | ✓ |
| 1 Bild | ✓ |
| mehrere, nur Bilder | ✗ „Nur für eine einzelne Datei“ |
| mehrere, mit PDF | ✗ „Nur für eine einzelne Datei“ |

Der Vorschlag auf dem geteilten Button bleibt, wie er ist (1 Datei → Verkleinern, mehrere → Zusammenführen).
Schwärzen ist nie Vorschlag, denn es ist eine bewusste Handlung.

**Entscheidung: Was gilt bei mehreren Dateien?**
- **A – nur eine Datei** · **Empfehlung**: Schwärzen ist sorgfältige Arbeit an einem Dokument. Wer z. B. Vorder- und
  Rückseite eines Ausweises als zwei Fotos hat, führt sie erst zusammen und schwärzt dann über den Abschluss-Workflow.
  Die Regel ist einfach, der Editor bleibt übersichtlich, und der Umweg kostet nur einen Tipp mehr.
- **B – jede Datei nacheinander im selben Editor**, am Ende mehrere Ergebnisse: mehr Navigation („Datei 2 von 3“).
  Eine Suche über alle Dateien wäre schön, ist aber deutlich aufwendiger. Lässt sich später nachrüsten.

Auf dem **Startscreen** zeigt die Info-Zeile dann 6 Aktionen, umbrechend 3 + 3 statt 3 + 2. Am PC stehen 6 Zeilen in
der Aktionen-Liste. Der Coach-Mark „Weitere Aktionen“ nennt Schwärzen automatisch mit, weil sein Text aus der Liste
gebaut wird.

### 3.2 Wizard-Ablauf

```
Schwärzen : 2/3 Stellen schwärzen ─► Verarbeiten ─► 3/3 Speichern (Prüfbericht) ─► Gespeichert ✓
```

- **Schritt 2 „Stellen schwärzen“**: der Editor, am PC über die volle Breite wie der Seiten-Editor. „Weiter“ ist
  deaktiviert, solange noch keine Stelle geschwärzt ist (wie bei Trennen mit 0 Seiten).
- **Verarbeiten vor dem Speichern-Schritt** (wie bei Verkleinern): „Wird geschwärzt …“, „Seite 3 von 12 · 25 %“.
- **Schritt 3 „Speichern“**: Prüfbericht, Größe, „Ergebnis ansehen“, Dateiname, „Speichern“.
- `dirty` gilt ab der ersten Stelle, „Abbrechen“ fragt dann nach (Screen 20c). Zurück aus Schritt 3 führt in den Editor,
  alle Stellen sind noch da. Wurde etwas geändert, wird beim nächsten „Weiter“ neu verarbeitet.

**Entscheidung: Wann wird verarbeitet?**
- **A – vor dem Speichern-Schritt** · **Empfehlung**: Der Nutzer sieht vor dem Speichern das **echte Ergebnis**
  (Miniatur aus der fertigen Datei, „Ergebnis ansehen“ im Vollbild), die neue Größe („0,2 MB → 2,4 MB“) und den
  Prüfbericht. Gerade bei einer Sicherheitsfunktion schafft das Vertrauen. Außerdem weiß er so schon vorher, ob er
  die Datei danach verkleinern will.
- **B – nach dem Tipp auf „Speichern“** (wie bei Zusammenführen): einmal weniger warten, aber man speichert „blind“.

### 3.3 Abschluss-Workflow (Geparkte Aufgabe 1)

Schwärzen wird so gebaut, dass es in jede Variante des neuen Abschluss-Workflows passt. Das ist zugesagt bzw. gefordert:

1. Das Ergebnis von Schwärzen ist eine ganz normale Datei (PDF oder Bild). Es kann wie eine frisch gewählte Datei an
   die nächste Aktion gehen, also über `oeffneDatei` zu einem Eintrag mit Vorschau werden.
2. **Schwärzen als Anschluss-Aktion**: nach Zusammenführen, Seiten ordnen, Trennen (wenn eine Datei entsteht), Umwandeln
   (wenn genau eine Datei entsteht) und Verkleinern. Auch hier gelten die Regeln aus 3.1: Entstehen mehrere Dateien
   (z. B. „Jede Seite als eigene Datei“), ist Schwärzen ausgegraut.
3. **Nach Schwärzen sinnvoll**: Verkleinern (das Ergebnis ist oft größer – das kann als Vorschlag erscheinen, wenn
   die Datei gewachsen ist), außerdem Zusammenführen, Trennen, Seiten ordnen und Umwandeln.
4. **Sicherheit:** Die nächste Aktion arbeitet immer mit dem **geschwärzten** Ergebnis, nie mit dem Original. Führt
   „Zurück“ wieder in den Schwärzen-Editor, lassen sich dort nur die Stellen bearbeiten. Das Original darf nie
   unbemerkt weitergereicht werden.
5. Nach dem Schwärzen enthält die Datei keinen Text mehr. Ein zweites Schwärzen geht dann nur noch per Ziehen, weil
   die Suche nichts mehr findet. Schwärzen wird im Anschluss deshalb nicht vorgeschlagen, bleibt aber erlaubt.
6. Sinnvolle Reihenfolge, ohne Zwang: erst ordnen oder Seiten löschen, dann schwärzen. Das spart Arbeit.
7. Dateinamen hängen sich aneinander: `Vertrag_geschwärzt_klein.pdf`.

### 3.4 Begriffe

| Begriff | Verwendung |
|---|---|
| **Schwärzen** | die Aktion: „Schwärzen“, „Wird geschwärzt …“, „geschwärzt“ |
| **Stelle** | ein geschwärzter Bereich: „3 Stellen geschwärzt“, „Stelle löschen“, „Stelle hinzufügen“ |

Nicht verwenden:
- „markieren/Markierung“ für Stellen. Das Wort ist schon belegt („Text ist danach nicht mehr markierbar“, farbige
  Markierung der Ursprungsdatei im Seiten-Editor).
- „Vergrößern/Verkleinern“ für den Zoom, denn „Verkleinern“ ist eine Aktion. Stattdessen „Hineinzoomen“,
  „Herauszoomen“, „Seite einpassen“ (auch in `aria-label`).
- „Zensieren“ oder „Anonymisieren“. Das verspricht zu viel, denn FileKit entfernt nur, was geschwärzt wurde.
- Weiterhin gilt: Wählen/Hinzufügen · Verarbeiten · Speichern. Nie „Laden“, „Herunterladen“, „Download“, „Upload“.

### 3.5 Dateiname

Vorschlag: `{Name}_geschwärzt.pdf` bzw. `{Name}_geschwärzt.jpg` / `.png`. Der Umlaut ist in Ordnung, wie bei
„Zusammengeführt.pdf“. Unter dem Feld steht zusätzlich zum Standardsatz: „Steht im Dateinamen etwas Persönliches?
Dann ändere ihn hier.“

---

## 4. Bedienung

### 4.1 Grundprinzip: Seite für Seite

Es ist immer eine Seite zu sehen, groß und vollständig. Eine A4-Seite passt bei 375 px Breite ganz zwischen
Kopfzeile und Dock. So wird die Seite selbst zur Zeichenfläche: Ein Finger zeichnet, ohne dass die Seite dabei scrollt.
Geblättert wird mit den Pfeilen unter der Seite oder über die Seitenübersicht.

| Was | Handy (Touch) | PC (Maus) | Tastatur |
|---|---|---|---|
| Bereich schwärzen | mit einem Finger über die Stelle ziehen | ziehen (Fadenkreuz-Cursor) | „Stelle hinzufügen“ → Rahmen erscheint in der Seitenmitte → Pfeiltasten verschieben, Umschalt+Pfeile ändern die Größe, Enter bestätigt |
| Wort schwärzen | Wort antippen | Wort anklicken | über „Text suchen“ |
| Stelle auswählen | Stelle antippen | anklicken | Tab springt von Stelle zu Stelle |
| Verschieben / Größe ändern | Stelle ziehen bzw. an den Eck-Griffen ziehen | ebenso | Pfeile bzw. Umschalt+Pfeile (mit Strg in größeren Schritten) |
| Löschen | Papierkorb an der gewählten Stelle → Toast „Stelle gelöscht · Rückgängig“ | ebenso oder Entf | Entf / Rücktaste |
| Rückgängig / Wiederholen | Knöpfe in der Werkzeugleiste | ebenso | Strg+Z / Strg+Y (oder Strg+Umschalt+Z) |
| Zoomen | zwei Finger (Pinch), mit zwei Fingern verschieben | Strg+Mausrad, Knöpfe | + / − |
| Blättern | ‹ › unter der Seite, Seitenübersicht | ebenso | Bild↑ / Bild↓ |

Regeln:
- Ein Tipp auf eine leere Fläche (kein Wort) hebt nur die Auswahl auf.
- Sehr kleine gezogene Bereiche (< 6 px) werden ignoriert, das waren Fehltipps.
- Ein Finger zeichnet **immer**, auch im gezoomten Zustand. Verschoben wird dann mit zwei Fingern (Hinweis beim ersten Zoomen).
- Es gibt **keine Wischgeste zum Blättern**, sie würde mit dem Zeichnen kollidieren.

### 4.2 So sehen die Stellen aus

**Entscheidung:**
- **A – sofort deckend schwarz** · **Empfehlung**: Die Stellen sehen genau so aus wie im Ergebnis („Was du siehst, wird
  gespeichert“). Nur die **gewählte** Stelle ist halb durchsichtig, mit Akzent-Rahmen und Griffen. So sieht man beim
  Nachjustieren, was darunter liegt.
- **B – beim Bearbeiten durchsichtig mit Rahmen**, schwarz nur in einer eigenen Vorschau: beim Ausrichten etwas genauer,
  aber mit zwei Zuständen, und das Ergebnis sieht man erst nach dem Umschalten.

Begründung für A: ein Zustand, keine Überraschung. Die durchsichtige gewählte Stelle reicht zum Kontrollieren.

### 4.3 Screen „Stellen schwärzen“ (Handy, 375 px)

```
┌───────────────────────────────────────────┐
│ ‹        Stellen schwärzen             ×  │  Kopfzeile
│          Schritt 2 von 3                  │
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬░░░░░░░░░░░░░ │
│ [Lupe Text suchen]      [↶] [↷] [⋯]       │  Werkzeugleiste
│ ┌───────────────────────────────────────┐ │
│ │ weiße Seite, groß                     │ │
│ │ Name:  ██████████████                 │ │  schwarze Stelle
│ │ IBAN:  ┏━━━━━━━━━━━━━━━┓ [Papierkorb] │ │  gewählte Stelle: halb durchsichtig,
│ │        ┃ DE12 3456 …   ┃              │ │  Akzent-Rahmen, 4 Eck-Griffe
│ │        ┗━━━━━━━━━━━━━━━┛              │ │
│ │ …                                     │ │
│ └───────────────────────────────────────┘ │
│   ‹    Seite 2 von 12 · 5 Stellen    ›  [▦]│  Blättern · Zähler · Seitenübersicht
├───────────────────────────────────────────┤
│              [   Weiter   ]               │  Dock (deaktiviert bei 0 Stellen)
└───────────────────────────────────────────┘
```

- **Leerzustand** (noch keine Stelle): Über der Seite steht eine Hinweiszeile: „Ziehe mit dem Finger über eine
  Stelle, um sie zu schwärzen. Einzelne Wörter kannst du auch antippen.“ Am PC heißt es „Ziehe mit der Maus …
  anklicken“.
- **Scan-PDF ohne Text**: Die Hinweiszeile lautet ohne den Satz zum Antippen, „Text suchen“ fehlt, und es gibt eine
  kleine Info: „In diesem PDF ist kein Text hinterlegt – die Suche ist daher nicht verfügbar.“
- **Bild**: kein Blättern, keine Seitenübersicht, kein „Text suchen“.
- Der **Zähler** „5 Stellen“ zählt alle Seiten zusammen und wird per `aria-live` angesagt.
- Das **⋯-Menü** (Bottom Sheet) enthält „Stelle hinzufügen“ (Rahmen in der Seitenmitte, für Tastatur und genaues
  Arbeiten), „Ganze Seite schwärzen“ und „Alle Stellen dieser Seite löschen“ (rot, mit Toast „Rückgängig“).

### 4.4 Stelle ändern, löschen, rückgängig machen

- Antippen wählt eine Stelle aus. Sie bekommt Griffe an den vier Ecken (sichtbar 12 px, Tippfläche 44 px) und einen
  runden Papierkorb-Knopf (44 px) oben rechts außerhalb der Stelle. Ist am Rand kein Platz, rutscht der Knopf nach
  innen bzw. nach unten.
- Löschen geht ohne Rückfrage, mit Toast „Stelle gelöscht“ + „Rückgängig“, wie im Seiten-Editor.
- **Rückgängig/Wiederholen** in der Werkzeugleiste gilt für Hinzufügen, Verschieben, Größe ändern, Löschen und
  „Treffer schwärzen“ (zählt als ein Schritt), und zwar über alle Seiten hinweg: Es springt zur betroffenen Seite.
  Ausgegraut, wenn es nichts rückgängig zu machen gibt.
- Zurück-Geste bzw. Esc hebt zuerst die Auswahl auf (über `ctx.beiZurueck`, wie beim Auswahlmodus im Seiten-Editor).

### 4.5 Text suchen und automatisch schwärzen

- „Text suchen“ öffnet ein Bottom Sheet **„Text suchen und schwärzen“**:
  - Feld „Suchbegriff“ mit dem Platzhalter „z. B. einen Namen oder eine Nummer“.
  - Live-Ergebnis (`aria-live`): „7 Treffer auf 4 Seiten“ bzw. „Kein Treffer“.
  - Trefferliste: je Treffer die Seite und ein kurzer Textausschnitt mit hervorgehobenem Begriff, dazu ein
    Kontrollkästchen (alle sind angehakt). Dazu „Alle“ / „Keine“.
  - Hauptknopf im Sheet: „7 Treffer schwärzen“.
- Danach schließt das Sheet, ein Toast meldet „7 Stellen geschwärzt · Rückgängig“, und die Seite mit dem ersten Treffer
  wird gezeigt. Die Treffer werden normale Stellen, die man ändern und löschen kann. Schon geschwärzte Treffer werden
  nicht doppelt angelegt („2 Treffer sind schon geschwärzt“).
- **Was ein Treffer schwärzt** (entschieden am 24.10.2026, Kapitel 8 Nr. 12): **nur die gesuchten Zeichen.**
  Die Suche findet einen Begriff auch mitten in einem Wort, z. B. „Mustermann“ in „max.mustermann@example.de“ →
  „max.██████████@example.de“, oder „Pflicht“ in „verpflichtet“ → „ver███████et“.
  - Möglich ist das, weil FileKit die Position jedes einzelnen Buchstabens kennt (2.4.1).
  - An einer Schnittkante mitten im Wort liegt die Kante genau zwischen den beiden Buchstaben, ohne zusätzlichen Rand.
    So bleibt der Nachbarbuchstabe lesbar. An den Wortgrenzen gilt der normale Rand.
  - Die Trefferliste zeigt jeden Treffer im ganzen Wort mit hervorgehobenem Begriff. So sieht man vorher, was
    stehen bleibt (z. B. eine Endung wie bei „Mustermanns“), und kann die Stelle danach von Hand vergrößern.
  - Verworfen: das ganze Wort schwärzen (war die Empfehlung).
- Mehrere Begriffe sucht man nacheinander (Sheet erneut öffnen). Automatische Vorschläge kommen später (siehe Kapitel 7).

### 4.6 Zoom

Mit zwei Fingern zoomen (bis 400 %) und verschieben. Sobald gezoomt ist, erscheint der Knopf „Seite einpassen“, und
ein schärferes Seitenbild wird nachgeholt. Am PC geht das mit Strg+Mausrad oder den Knöpfen „Herauszoomen“ /
„Hineinzoomen“. Beim ersten Zoomen erscheint einmalig der Hinweis „Mit zwei Fingern verschieben“.

### 4.7 Seitenübersicht

Der Knopf mit dem Raster-Symbol neben der Seitenanzeige öffnet ein Bottom Sheet **„Seiten“**: Miniaturen in 2–3
Spalten, auf denen die schwarzen Stellen schon zu sehen sind, und je Seite ein Badge mit der Zahl der Stellen.
Antippen springt zur Seite. Das beantwortet die Frage „Habe ich alles?“. Bei einer einseitigen Datei oder einem
Bild fällt der Knopf weg.

### 4.8 PC (ab 1024 px, „breit“ wie Screen 21b)

- **Links** eine Spalte mit Seiten-Miniaturen samt Stellen-Zähler, die aktuelle Seite ist hervorgehoben.
- **Mitte** die Seite, so hoch wie möglich. Darüber die Werkzeugleiste: Rückgängig/Wiederholen, Herauszoomen/
  Hineinzoomen, Seite einpassen, ⋯.
- **Rechts** ist das Suchfeld direkt sichtbar (statt Sheet), mit Trefferliste und „Treffer schwärzen“. Darunter steht
  „Stellen auf dieser Seite“ als Liste mit „Löschen“ je Zeile – das hilft Tastatur- und Screenreader-Nutzern.
- **Fußleiste**: „12 Stellen auf 4 Seiten“ und „Weiter“ rechts (wie 21b).
- **Cursor**: Fadenkreuz über der Seite, Hand über einer Stelle, Doppelpfeile an den Griffen.

### 4.9 Speichern-Schritt (3/3) mit Prüfbericht

- **Ergebnis-Karte**: Miniatur der ersten geschwärzten Seite **aus der fertigen Datei**, „12 Stellen auf 4 Seiten
  geschwärzt“, Größe „0,2 MB → 2,4 MB“. Kein Ersparnis-Badge; wird die Datei größer, bleibt die Anzeige neutral.
- **Prüfbericht** (Liste mit Haken in `--fk-success-text`, nur mit Punkten, die die Selbstprüfung bestätigt hat):
  - PDF: „Inhalt unter den Stellen entfernt – nicht nur überdeckt“ · „Kein versteckter Text mehr enthalten (Text ist
    dadurch nicht mehr markierbar)“ · „Metadaten, Kommentare und Anhänge entfernt“
  - Bild: „Inhalt unter den Stellen entfernt“ · „Ortsangaben, Kameradaten und Vorschaubild entfernt“
- **„Ergebnis ansehen“** (sekundärer Knopf) öffnet das Vollbild (Screen 13) mit den Seiten der fertigen Datei.
- Ausgabe-Zeile „Format: PDF“ (bei Bildern „Format: JPG“ bzw. „PNG“).
- Hinweis (`.note`): „Nur die geschwärzten Stellen sind entfernt. Prüfe vor dem Weitergeben alle Seiten.“
- Dateiname mit dem Vorschlag `{Name}_geschwärzt` und den Hinweisen aus 3.5.
- Ist die Datei deutlich größer geworden (mehr als 1,5-mal so groß und über 1 MB, wie im Abschluss-Konzept 3.4),
  kommt der Hinweis „Die Datei ist größer geworden. Nach dem Speichern kannst du sie gleich verkleinern.“ (Wortlaut aus
  dem Abschluss-Konzept, Kap. 4).
- Dock: „Speichern“.

### 4.10 Gespeichert ✓

Wie Screen 18. Die Datei-Karte zeigt Name, Größe und „12 Stellen geschwärzt“. Wie es danach weitergeht, regelt der
Abschluss-Workflow (Geparkte Aufgabe 1).

### 4.11 Barrierefreiheit

- Stellen sind fokussierbare Elemente (`role="button"`, `aria-label="Geschwärzte Stelle 2 von 3 auf Seite 4"`).
  Die Tab-Reihenfolge läuft von oben nach unten.
- Statt zu ziehen geht auch „Stelle hinzufügen“ + Pfeiltasten (4.1). Am PC gibt es zusätzlich die Liste „Stellen auf
  dieser Seite“.
- Ansagen per `aria-live`: „Stelle hinzugefügt. 3 Stellen auf Seite 2.“ · „7 Stellen geschwärzt.“ · „Seite 3 von 12.“
- Kontrast: Die gewählte Stelle hat einen 2-px-Akzent-Rahmen plus Fokus-Ring. Die Griffe sind hell mit dunklem Rand
  und damit auf Weiß und auf Schwarz sichtbar.
- Mindestens 44 px Tippfläche für Griffe und Papierkorb (unsichtbar vergrößert).
- Bewegung reduzieren: keine Zoom-Animation, Toasts nur überblenden (wie bisher in `filekit.css`).
- Ehrliche Grenze: Zeichnen ist für blinde Nutzer schwer. Für Text-PDFs sind Suche und Tastatur der barrierefreie Weg.
  Für Scans und Bilder ohne Text bleibt eine Lücke, bis es Texterkennung gibt (Kapitel 7).

---

## 5. Screens für Claude Design

Die neuen Nummern beginnen mit „S“, damit sie nicht mit den bestehenden Screens (1–21b) oder mit neuen Screens des
Abschluss-Workflows kollidieren.

| Nr | Screen | Inhalt |
|---|---|---|
| S0 | Icons & Tokens | Neu: `schwaerzen.svg` (Aktion, z. B. Blatt mit Textzeilen, eine davon als gefüllter Balken), `rueckgaengig.svg`, `wiederholen.svg`, `hineinzoomen.svg`, `herauszoomen.svg`, `einpassen.svg`, `seiten-raster.svg` (Übersicht). Stil: 24er-Raster, Linie 1,8, `currentColor`. Vorhanden und nutzbar: `lupe`, `loeschen`, `haken`, `info`, `mehr`, `zurueck`, `weiter`. Token: `--fk-redact` (Schwarz) für Stellen, Stil der gewählten Stelle (Halbtransparenz, Rahmen, Griffe). |
| S1 | Start + Aktionen-Menü | Update von 01, 05, 05b, 21a: 6 Aktionen, auf dem Handy 3 + 3. Zeile „Schwärzen“ normal und ausgegraut („Nur für eine einzelne Datei“). |
| S2 | Stellen schwärzen – leer | Seite, Hinweiszeile, Werkzeugleiste, Blättern, „Weiter“ deaktiviert. Varianten: PDF mit Text · Scan ohne Text (ohne Suche, mit Info) · Bild (ohne Blättern und Suche). |
| S3 | Stellen schwärzen – mit Stellen | Mehrere schwarze Stellen, eine gewählt (halb durchsichtig, Akzent-Rahmen, Griffe, Papierkorb), Zähler, „Weiter“ aktiv. Moment „wird gezogen“ (Rahmen wächst unter dem Finger). |
| S4 | Gezoomt | 200 %, Knopf „Seite einpassen“, einmaliger Hinweis „Mit zwei Fingern verschieben“. |
| S5 | Suchen-Sheet | Feld, „7 Treffer auf 4 Seiten“, Trefferliste mit Ausschnitt und Kästchen, „Alle/Keine“, „7 Treffer schwärzen“. Zustände: leer · Treffer · kein Treffer · „2 Treffer sind schon geschwärzt“. |
| S6 | Toasts | „7 Stellen geschwärzt · Rückgängig“ und „Stelle gelöscht · Rückgängig“. |
| S7 | Seitenübersicht-Sheet | Miniaturen mit schwarzen Stellen und Zähler-Badge, aktuelle Seite hervorgehoben. |
| S8 | ⋯-Menü | „Stelle hinzufügen“ · „Ganze Seite schwärzen“ · (Trenner) · „Alle Stellen dieser Seite löschen“ (rot). |
| S9 | Verarbeiten | Wie Screen 08 mit „Wird geschwärzt …“. Wahrscheinlich reicht der neue Text, ohne eigenen Screen. |
| S10 | Speichern mit Prüfbericht | Ergebnis-Karte, Prüfliste, „Ergebnis ansehen“, Format, Hinweis, Dateiname mit Zusatzhinweis. Varianten: Bild · „Datei ist größer geworden“. |
| S11 | Gespeichert | Variante von 18 mit „12 Stellen geschwärzt“. Die Anschluss-Aktionen kommen aus dem Abschluss-Workflow. |
| S12 | PC-Editor | Drei Spalten (Miniaturen · Seite · Suche und Stellen-Liste), Fußleiste mit Zähler und „Weiter“. |

Animationen (nur `transform`/`opacity`): Eine neue Stelle „rastet ein“ (≈ 160 ms), „Treffer schwärzen“ lässt die Stellen
leicht versetzt erscheinen, beim Löschen blendet die Stelle aus. Bei „Bewegung reduzieren“ passiert alles sofort.

---

## 6. Umsetzungsschritte (Claude Code)

**Vereinbarter Gesamtablauf** (24.10.2026):

1. Konzept für den Abschluss-Workflow (Geparkte Aufgabe 1) → Freigabe durch den Nutzer.
2. Vorab-Test „Wort antippen“ (Schritt 0 unten) – **erledigt am 24.10.2026**, Ergebnis in 2.4.1.
3. Gemeinsames Briefing für Claude Design: Abschluss-Workflow + Schwärzen.
4. Claude Design gestaltet beides und liefert ein Handoff-Paket (wie `design/filekit-handoff/`).
5. Claude Code prüft das Handoff gegen beide Konzepte.
6. Umsetzung: zuerst der Abschluss-Workflow, dann Schwärzen (Schritte 1–9 unten). Die Schwärzen-Technik ohne
   Oberfläche (Schritt 1–2) kommt **erst nach dem Handoff**.

Alles läuft auf dem Branch **`redesign`**, auch Schwärzen. Nach jedem Schritt wird dem Nutzer das Ergebnis gezeigt.

0. **Kurzer Vorab-Test** (ohne Oberfläche, nicht im Repo) – **erledigt**: Das exakte Verfahren deckt die Wörter in
   allen Test-PDFs vollständig ab. „Wort antippen“ kommt in die erste Version (2.4.1).
1. **Technik ohne Oberfläche**: neues Modul `redact.js` mit `schwaerzePdf(file, stellen, { signal, beiSeite })`
   (nutzt `rendereSeite` und `bauePdf`, dafür wird `bauePdf` aus `pdf.js` exportiert) und `schwaerzeBild(eintrag, stellen)`.
   Stellen werden als Anteile der angezeigten (ggf. gedrehten) Seite gespeichert (0–1), damit sie von der Auflösung
   unabhängig sind. Beim Malen werden die Pixelgrenzen nach außen gerundet, damit keine halb deckenden Randpixel
   entstehen. Dazu die Selbstprüfung.
2. **Text-Modul** `textstellen.js`: Wörter und Rahmen je Seite nach dem exakten Verfahren aus 2.4.1 (Vorlage:
   Prototyp im Notizordner), mit Ersatzweg, wenn Schriftdaten fehlen. Erst bei Bedarf berechnet und
   zwischengespeichert wie in `thumbs.js`. Dazu die Suche mit Normalisierung (Groß/klein, Leerzeichen, Bindestriche).
3. **Einbindung**: `intake.js` (AKTIONEN + Regel), Startscreen 3 + 3, `flows.js`, neues `flow-schwaerzen.js`
   (Schritte), Icons, Liste im Service Worker + neue Cache-Version.
4. **Editor fürs Handy** (`schwaerzen-editor.js`): Seite zeigen, Ziehen, Wort antippen, Auswahl mit Griffen und
   Papierkorb, Toast, Rückgängig/Wiederholen, Blättern, Zoom.
5. Suchen-Sheet, Seitenübersicht, ⋯-Menü.
6. Verarbeiten, Speichern-Schritt (Prüfbericht, „Ergebnis ansehen“ über `vollbild.js`) und Gespeichert ✓.
7. PC-Layout.
8. Tastatur und Screenreader, danach die Prüfung inkl. der Sicherheitstests aus 2.7: 375 px und 1280 px, offline,
   Android und iPhone.
9. Anschluss an den neuen Abschluss-Workflow (sobald Aufgabe 1 gebaut ist).

Außerdem: `CLAUDE.md` (Begriffe, Stand) ergänzen. Das Briefing für Claude Design entsteht gemeinsam mit dem
Abschluss-Workflow (Gesamtablauf, Punkt 3).

---

## 7. Bewusst später (nicht in der ersten Version)

- **Text bleibt markierbar:** Nach dem Rastern wird eine unsichtbare Textebene mit dem **nicht** geschwärzten Text
  eingefügt. Textstücke, die eine Stelle berühren, fallen dabei komplett weg. Das Dokument wäre dann wieder
  durchsuchbar. Mittlerer Aufwand, braucht eine eingebettete Schrift für Sonderzeichen und eine eigene Sicherheitsprüfung.
- Variante **A2** (nur Seiten mit Stellen rastern) als Schalter.
- **Automatische Vorschläge:** IBAN, E-Mail, Telefonnummer, Geburtsdatum, Steuer-ID („4 mögliche persönliche Daten gefunden“).
- **Texterkennung (OCR)**, z. B. tesseract.js (über 10 MB mit deutscher Sprache), für Scans und Fotos, damit auch dort
  die Suche geht.
- Mehrere Dateien auf einmal schwärzen.
- Lupe unter dem Finger beim Ziehen (wie bei der Textauswahl auf dem iPhone).
- Andere Farben, „weiß abdecken“, Beschriftung im Balken.
- Option C (MuPDF), falls erhaltener Text Pflicht wird.

---

## 8. Entscheidungen

**Entschieden am 24.10.2026: Der Nutzer hat alle Empfehlungen angenommen** (fett gedruckt). Zusätzlich gilt:
Schwärzen wird auf dem Branch `redesign` gebaut, und die Technik ohne Oberfläche kommt erst nach dem Handoff von
Claude Design (siehe Kapitel 6).

**Wichtige Entscheidungen**

| # | Frage | Empfehlung | Alternative |
|---|---|---|---|
| 1 | Technik für PDFs | **A1: alle Seiten wie ein Scan neu aufbauen** – sicher durch die Bauweise | A2 nur Seiten mit Stellen · C MuPDF (10 MB, AGPL) |
| 2 | Mehrere Dateien | **Nur eine Datei** – erst zusammenführen, dann schwärzen | jede Datei nacheinander |
| 3 | Wann verarbeiten? | **Vor dem Speichern-Schritt**, mit Prüfbericht und „Ergebnis ansehen“ | nach dem Tipp auf „Speichern“ |
| 4 | Aussehen der Stellen beim Bearbeiten | **Sofort schwarz**, gewählte Stelle halb durchsichtig | durchsichtig + eigene Vorschau |
| 5 | Was wird zuerst gebaut? | **Erst der Abschluss-Workflow, dann Schwärzen.** Er betrifft alle bestehenden Aktionen, und Schwärzen kann sich dann direkt einklinken (inkl. „danach verkleinern“). | erst Schwärzen, Anschluss später nachrüsten |

**Kleinere Punkte**

6. Platz im Menü: **am Ende**, als 6. Aktion. Die gewohnte Reihenfolge bleibt dann erhalten.
7. „Wort antippen“ **kommt in die erste Version** – der Vorab-Test ist bestanden (2.4.1).
8. Bilder: **PNG bleibt PNG, alles andere wird JPG.**
9. Name der Aktion: **„Schwärzen“**. Kurz, eindeutig und ein Verb wie die anderen Aktionen.
10. Zusätzlicher Hinweis am Dateinamen („Steht im Dateinamen etwas Persönliches?“): **ja**.
11. Suche ignoriert Leerzeichen in Nummern (IBAN): **ja**.

**Neu aus dem Vorab-Test**

12. Was schwärzt ein Suchtreffer mitten in einem Wort (4.5)? **Entschieden am 24.10.2026: nur die gesuchten Zeichen**
    (abweichend von der Empfehlung „ganzes Wort“).
