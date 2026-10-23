# Design-Briefing FileKit 2.0 – für Claude Design

## So benutzt du dieses Briefing

1. **Claude** öffnen und ein neues **Design-Projekt** starten (Claude Design ist jetzt direkt in Claude;
   die alte Seite claude.ai/design schließt bis 14.12.2026).
2. Den **kompletten Text unterhalb der Linie** kopieren und als erste Nachricht einfügen.
3. Als Anhang das App-Icon mitschicken: `docs/icons/icon-512.png`.
4. Claude Design zeigt zuerst **2–3 Stilrichtungen** am Startscreen → eine auswählen → dann werden alle
   Screens ausgearbeitet. Feedback geben, bis es dir gefällt.
5. **Übergabe an Claude Code:** Ergebnis exportieren bzw. an Claude Code übergeben und die Dateien in den
   Ordner `design/` dieses Projekts legen – oder den Link in die Claude-Code-Session einfügen.

Das ausführliche Konzept (inkl. Technik) steht in `design/konzept.md`.

---

# Auftrag

Entwirf ein **Designsystem** und einen **klickbaren Prototyp** für die Überarbeitung meiner Web-App
**FileKit**. Ziel ist ein **hochpoliertes Premium-Gefühl**: ruhig, hochwertig, vertrauenswürdig, mit feinen
Animationen – eine App, die man gerne benutzt. Alle Texte sind **Deutsch**.

## Was ist FileKit?

Eine installierbare Web-App (PWA), mit der man **PDFs und Bilder direkt auf dem eigenen Gerät** bearbeitet –
ohne dass Dateien irgendwohin geschickt werden. Sie funktioniert auch offline.

Aktionen:
- **Verkleinern** – Dateigröße reduzieren (Qualitätsstufe oder Zielgröße, z. B. „max. 2 MB")
- **Zusammenführen** – mehrere PDFs/Bilder zu einem PDF verbinden
- **Trennen** – einzelne Seiten aus einem PDF herauslösen
- **Seiten ordnen** – Seiten eines PDFs verschieben, drehen, löschen
- **Umwandeln** – in PDF, JPG oder PNG umwandeln

Zielgruppe: ganz normale Menschen, keine Profis (z. B. Rechnung für ein Online-Formular verkleinern,
Scans zu einem PDF verbinden). **Mobile-first:** wird vor allem auf dem Handy genutzt, am PC muss es
aber auch gut aussehen.

## Verbindliche Begriffe (bitte überall genau so verwenden)

| Begriff | Bedeutung | Beispiele |
|---|---|---|
| **Wählen / Hinzufügen** | Datei vom Gerät in die App holen | „Datei wählen", „+ Weitere Dateien hinzufügen", „Wird geöffnet …" |
| **Verarbeiten** | App arbeitet | „Wird verkleinert …", „Wird zusammengeführt …" |
| **Speichern** | Ergebnis aufs Gerät schreiben – **nur im letzten Schritt** | „Speichern", „Alle speichern (3)", „Gespeichert ✓" |

**Nicht verwenden:** „Laden", „Herunterladen", „Download", „Upload".

## Ablauf: ein einziger Wizard mit Verzweigungen

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

Es gibt **keine Tab-Leiste** und kein Menü – man startet immer mit der Datei.

### Rahmen für alle Schritte ab Schritt 2
- Kopfzeile: Zurück-Pfeil, Titel, Schritt-Anzeige („Schritt 2 von 3" + feiner Fortschrittsbalken).
- Unten fest in der Daumen-Zone: **ein** Haupt-Button („Weiter", im letzten Schritt „Speichern").
- Abbrechen führt zurück zum Startscreen (mit kurzer Rückfrage, wenn schon etwas bearbeitet wurde).

## Screens (alle in 375 px Breite, jeweils hell **und** dunkel)

**Startscreen – das Gesicht der App (bitte besonders viel Sorgfalt)**
1. **Leer:** Logo + Name, Claim „Deine PDFs & Bilder – bearbeitet auf deinem Gerät.", große, dezent
   animierte Dropzone „Datei wählen" (Untertitel: „PDF oder Bild – auch mehrere"; am PC zusätzlich
   „oder hierher ziehen"). Darunter als **reine Info, nicht klickbar** (darf nicht wie Buttons aussehen),
   was FileKit kann: Verkleinern · Zusammenführen · Trennen · Seiten ordnen · Umwandeln.
   Unten Vertrauens-Leiste mit Icons: „privat · offline · Nichts verlässt dein Gerät".
2. **Drag-over (PC):** Dropzone reagiert sichtbar, wenn eine Datei darübergezogen wird.
3. **1 Datei gewählt:** Die Dropzone **verwandelt sich animiert** in eine große Vorschau (1. Seite des PDFs
   bzw. das Bild), darunter Name, Seitenzahl, Größe (Beispiel: „Vertrag.pdf · 12 Seiten · 8,4 MB"),
   „+ Weitere Dateien hinzufügen" und „×" zum Entfernen. Von unten gleitet der **geteilte Button** ein:
   `[ (Icon) Verkleinern  |  ▾ ]` (Hauptteil = vorgeschlagene Aktion mit ihrem Icon, ▾-Teil mind. 48 px breit).
4. **Mehrere Dateien gewählt:** Vorschau als Stapel oder horizontaler Streifen, Anzahl + Gesamtgröße;
   Vorschlag auf dem Button: „Zusammenführen".
5. **Aktionen-Menü (Bottom Sheet)** nach Tipp auf ▾: alle 5 Aktionen mit Icon, Titel, einem Satz Erklärung.
   Vorgeschlagene Aktion markiert. Unpassende **ausgegraut mit kurzem Grund** (z. B. „Nur für PDFs",
   „Nur für ein einzelnes PDF", „Nur für Bilder oder ein einzelnes PDF").
6. **Einmaliger Hinweis** „Weitere Aktionen" am ▾ (kleine Sprechblase/Coach-Mark).

**Verkleinern**
7. **Stärke wählen** (Titel „Wie stark verkleinern?"): Umschalter „Qualität" | „Zielgröße".
   Qualität: drei Karten Stark („kleinste Datei") / Mittel („gute Balance", Badge „empfohlen") /
   Schonend („beste Qualität"). Zielgröße: Chips 500 KB · 1 MB · 2 MB · 5 MB · „Eigener Wert".
   Bei PDFs kleiner Hinweis: „Text ist danach nicht mehr markierbar".
8. **Verarbeiten:** hochwertige Fortschritts-Animation („Wird verkleinert … Seite 3 von 12").
9. **Speichern:** pro Datei Ergebnis „8,4 MB → 1,9 MB" + Ersparnis-Badge „−77 %" + Dateiname-Feld;
   Variante „Zielgröße nicht erreicht" mit ehrlichem Hinweis.

**Seiten-Editor** (für Zusammenführen und Seiten ordnen – Titel „Seiten anordnen")
10. Raster mit **großen Seitenvorschauen** (Standard 2 Spalten, Umschalter auf 1 Spalte, damit man den
    Inhalt lesen kann). Bei Zusammenführen hat jede Seite eine **farbige Markierung je Ursprungsdatei**
    (+ kleine Legende). „+ Weitere Dateien hinzufügen".
    Zustände der Seiten-Kachel: normal · markiert · **wird gezogen** (angehoben, Schatten) · gedreht.
11. **Mehrfach-Auswahl:** mehrere Seiten markiert → Leiste mit „Verschieben / Drehen / Löschen".
12. **Seitenmenü** pro Seite: Drehen, Löschen, „An den Anfang", „Ans Ende", Lupe.
13. **Vollbild-Seitenansicht** (nach Tipp auf Lupe), durch Wischen zur nächsten Seite.
14. **Toast** nach dem Löschen: „Seite gelöscht · Rückgängig".

**Trennen**
15. **Seiten auswählen** (Titel „Seiten auswählen"): gleiches Raster, Antippen = auswählen (Haken),
    „Alle" / „Keine", Zähler „3 von 12 ausgewählt".
16. **Speichern:** zwei gut sichtbare Options-Karten:
    „Ausgewählte Seiten in einer Datei" (3 Seiten → 1 PDF) ·
    „Jede Seite als eigene Datei" (3 Seiten → 3 PDFs).
    Darunter Dateiname-Feld mit **Live-Vorschau** der entstehenden Namen (z. B. `Vertrag_Seite3.pdf`).

**Umwandeln**
17. **Speichern** mit Format-Karten: PDF („für Dokumente") · JPG („klein, für Fotos") ·
    PNG („verlustfrei, mit Transparenz") – nur passende Formate sind wählbar. Dateiname-Feld.

**Allgemein**
18. **Gespeichert ✓** – Erfolgsmoment mit kleiner Animation, Button „Noch eine Datei bearbeiten".
19. **Dateiname-Feld** als Baustein: Textfeld mit Vorschlag, Endung (`.pdf`) fest dahinter angezeigt.
20. **Fehler- und Sonderzustände:** Datei beschädigt/geschützt, Format nicht unterstützt, „Abbrechen?"-Rückfrage.
21. **PC-Ansicht** (ca. 1280 px) für Startscreen und Seiten-Editor (breiter, 3–4 Spalten).

## Designsystem – bitte liefern
- **Farben** als Tokens für hell und dunkel. Ausgangspunkt (darf veredelt werden): Akzent-Blau `#2563eb`;
  aktuell `--bg #f5f7fb`, `--surface #ffffff`, `--text #0f172a`, `--muted #64748b`, `--success #16a34a`,
  `--danger #dc2626`; dunkel `--bg #0b1220`, `--surface #141d2f`.
  Zusätzlich 4–5 gut unterscheidbare Markierungsfarben für Ursprungsdateien im Seiten-Editor.
- **Typografie:** eine Premium-Schrift (z. B. Inter oder vergleichbar mit freier Lizenz), Größen-Skala.
- **Abstände, Radien, Schatten** als Skala.
- **Buttons:** primär, sekundär, Ghost, geteilter Button; Zustände normal / gedrückt / deaktiviert / arbeitet.
- **Icons:** ein einheitliches Set (je Aktion + Bedienung: Zurück, Schließen, Drehen, Löschen, Lupe,
  Hinzufügen, Haken, Schloss, Offline …) als SVG, Linien-Stil passend zum App-Icon. Die Dropzone-Icons
  sollen hochwertig sein, nicht nur einfache Striche.
- **App-Icon** (Anhang) als Ausgangspunkt; gern eine veredelte Variante vorschlagen.

## Animationen – bitte beschreiben (Dauer in ms + Kurve)
- Startscreen: Dropzone im Ruhezustand (dezent), Verwandlung Dropzone → Vorschau, Button gleitet ein.
- Schrittwechsel vor/zurück, Bottom Sheet öffnen/schließen.
- Button-Druck, Seite anheben/ziehen/Nachrutschen der anderen Seiten, Drehen einer Seite.
- Fortschritt beim Verarbeiten, Erfolgs-Haken bei „Gespeichert ✓".
- Variante für „Bewegung reduzieren" (Systemeinstellung): nur sanfte Überblendungen.

## Technische Grenzen (wichtig für die Umsetzung)
- Umsetzung in **reinem HTML/CSS/JavaScript** – kein Framework (kein React o. Ä.), kein Build-Schritt.
- Farben/Abstände als **CSS-Variablen** (z. B. `--bg`, `--surface`, `--accent`), hell/dunkel über
  `prefers-color-scheme`.
- Icons als **Inline-SVG** mit `currentColor`.
- Die App läuft **offline**: Schriften werden als Dateien mitgeliefert (kein Google-Fonts-Link) –
  bitte eine Schrift mit freier Lizenz wählen.
- Läuft als installierte App ohne Browserleiste: Ränder für Notch/Home-Balken (Safe Area) beachten.
- Touch-Flächen mindestens 44 px.

## Vorgehen
1. Zuerst **2–3 unterschiedliche Stilrichtungen** nur für den Startscreen (Zustand leer + 1 Datei gewählt)
   zeigen, damit ich wählen kann.
2. Danach das Designsystem und alle Screens in der gewählten Richtung ausarbeiten.
3. Am Ende alles als **klickbaren Prototyp** zusammenführen, der den Ablauf von Startscreen bis
   „Gespeichert ✓" für jede Aktion zeigt.
