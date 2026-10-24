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
  auf Wunsch des Nutzers – an seine Stelle tritt „Abschluss-Workflow überarbeiten“ (siehe Geparkte Aufgaben).
  Branch `redesign` ist noch nicht gepusht und nicht in `main`.
- Aufteilung: Claude Design gestaltet (Designsystem + klickbarer Prototyp), Claude Code baut die Technik
  und setzt das übergebene Design um. Übergebene Design-Dateien landen in `design/`.

## Begriffe in der App (verbindlich)
- **Wählen / Hinzufügen** = Datei in die App holen · **Verarbeiten** = App arbeitet ·
  **Speichern** = Ergebnis aufs Gerät schreiben (nur im letzten Schritt).
- Nicht verwenden: „Laden", „Herunterladen", „Download", „Upload".

## Geparkte Aufgaben
1. **Abschluss-Workflow prüfen und überarbeiten** (ersetzt die Schlussprüfung des Redesigns).
   - Anlass: HANDOFF Kap. 13, Punkt 1 fragt nur, ob es nach Zusammenführen/Seiten ordnen
     „danach gleich verkleinern“ geben soll.
   - Sicht des Nutzers: Grundsätzlich sinnvoll, aber zu eng gedacht. Nach einer Aktion sollen sich
     **auch andere Aktionen anschließen** lassen (z. B. Umwandeln, nicht nur Verkleinern), und das
     **konsequent nach jeder Aktion** (auch nach Trennen, Verkleinern, Umwandeln …) – eine einheitliche
     Logik statt eines Einzelfalls.
   - Erst den Ablauf vom Ergebnis bis „Gespeichert ✓“ als Konzept prüfen (Optionen + Empfehlung), dann bauen.
   - Hängt mit Aufgabe 2 zusammen (Schwärzen muss in diesen Ablauf passen).
2. **Neue Funktion „Dokumente schwärzen“** – Machbarkeit prüfen und Umsetzung planen (in einem eigenen Chat).
   - Muss zu den Grundsätzen passen: alles lokal auf dem Gerät, offline, Wizard „erst Datei, dann Aktion“,
     Begriffe wie oben, Design „Nacht“.
   - Zu klären u. a.: echtes Schwärzen (Inhalt wird entfernt, nicht nur schwarz überdeckt), PDFs und Bilder,
     Bedienung auf dem Handy, Platz im Aktionen-Menü und im Abschluss-Workflow (Aufgabe 1).
- Erledigt: Die früheren drei Aufgaben (Dropzone-Icons für Zusammenführen/Trennen, einheitliche
  Dropzone-Texte) wurden im Redesign umgesetzt.
