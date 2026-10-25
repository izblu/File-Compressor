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
  abgenommen (25.10.2026). **Nächster Schritt:** 3) Schwärzen, erster Abschnitt = Editor (Nachtrag Kap. 12, Schritt 4)
  samt Menüeintrag „Schwärzen“. Schwärzen gibt dann `herkunft` und Miniaturen **aus dem Ergebnis** an
  `zeigeGespeichert` (nie aus dem Original).

## Begriffe in der App (verbindlich)
- **Wählen / Hinzufügen** = Datei in die App holen · **Verarbeiten** = App arbeitet ·
  **Speichern** = Ergebnis aufs Gerät schreiben (nur im letzten Schritt).
- Nicht verwenden: „Laden", „Herunterladen", „Download", „Upload".

## Geparkte Aufgaben
- Keine. Die früheren Aufgaben „Abschluss-Workflow überarbeiten“ und „Dokumente schwärzen“ sind als Konzepte
  freigegeben und werden gerade gebaut (siehe „Erweiterung“ oben). Davor erledigt: Dropzone-Icons und einheitliche
  Dropzone-Texte (im Redesign umgesetzt).
