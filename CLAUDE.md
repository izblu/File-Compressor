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
- Aufteilung: Claude Design gestaltet (Designsystem + klickbarer Prototyp), Claude Code baut die Technik
  und setzt das übergebene Design um. Übergebene Design-Dateien landen in `design/`.

## Begriffe in der App (verbindlich)
- **Wählen / Hinzufügen** = Datei in die App holen · **Verarbeiten** = App arbeitet ·
  **Speichern** = Ergebnis aufs Gerät schreiben (nur im letzten Schritt).
- Nicht verwenden: „Laden", „Herunterladen", „Download", „Upload".

## Geparkte Aufgaben
- Die bisherigen drei Aufgaben (hochwertigere Dropzone-Icons für Zusammenführen/Trennen, einheitliche
  Dropzone-Texte) sind **im Redesign enthalten** (siehe `design/briefing.md`).
