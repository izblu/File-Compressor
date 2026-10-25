<!-- Freigegeben vom Nutzer am 24.10.2026 – mit allen Empfehlungen (Kap. 8). Nächster Schritt: gemeinsames Briefing für Claude Design (Abschluss-Workflow + Schwärzen). -->

# FileKit – Abschluss-Workflow „Weiterbearbeiten“ · Konzept (freigegeben)

## Kontext

Heute endet jede Aktion bei „Gespeichert ✓“ mit genau einem Knopf: „Noch eine Datei bearbeiten“ (leerer Startscreen).
Wer das Ergebnis gleich weiter bearbeiten will (z. B. erst zusammenführen, dann verkleinern), muss die gerade
gespeicherte Datei neu wählen. Die HANDOFF fragt in Kap. 13, Punkt 1 nur nach einem Einzelfall („danach gleich
verkleinern“ bei Zusammenführen / Seiten ordnen). Der Nutzer möchte stattdessen **eine einheitliche Logik**:
Nach **jeder** Aktion soll sich **jede passende** Aktion anschließen lassen – auch das kommende Schwärzen.

Dieses Dokument klärt den Ablauf vom Ergebnis bis zur nächsten Aktion, wägt die Optionen ab, listet die Screens für
Claude Design und die Umsetzungsschritte auf. Es baut auf der HANDOFF (verbindliche Spezifikation) und dem
freigegebenen Schwärzen-Konzept (`design/schwaerzen-konzept.md`, Kap. 3.3, 4.9, 4.10) auf.

Grundlage: Code-Stand Branch `redesign` (a09d1da).

---

## Kurzfassung – die Empfehlungen auf einen Blick

| Thema | Empfehlung |
|---|---|
| Grundidee | **Das Ergebnis wird zur neuen Datei.** Danach geht es weiter wie immer: erst Datei, dann Aktion. Eine Regel für alle Aktionen, kein Einzelfall. |
| Zwischenspeichern? | **Ja – erst speichern, dann weiter.** Jede Aktion endet wie heute mit „Speichern“ und „Gespeichert ✓“. Die Abläufe der Aktionen bleiben unverändert. |
| Wo geht es weiter? | Auf „Gespeichert ✓“ kommt ein zweiter Knopf **„Diese Datei weiterbearbeiten“**. Er führt zum **Startscreen mit dem Ergebnis** als gewählter Datei. Dort wählt man die nächste Aktion wie gewohnt (geteilter Button, Aktionen-Menü). |
| Vorschlag | **Nur mit gutem Grund:** Ist das Ergebnis groß oder deutlich größer geworden, wird **Verkleinern** vorgeschlagen. Sonst gibt es keinen Vorschlag, und der Knopf heißt „Aktion wählen“. |
| Regeln | Die Regeln aus HANDOFF 6.1 (und Schwärzen 3.1) gelten unverändert – angewendet auf die Ergebnisdatei(en). |
| Mehrere Ergebnisse | Alle gespeicherten Dateien gehen zusammen weiter. Auf dem Startscreen lassen sich einzelne mit × entfernen oder weitere hinzufügen. |
| Zurück / Abbrechen | Jede Aktion ist mit dem Speichern abgeschlossen. Zurück führt nie in die vorige Aktion, sondern höchstens bis zum Startscreen mit dem Ergebnis. |
| Schrittanzeige | Pro Aktion wie heute („Schritt 2 von 3“). Schritt 1 ist der Startscreen mit dem Ergebnis. |
| Dateinamen | Verketten sich von selbst: `Vertrag_geschwärzt.pdf` → `Vertrag_geschwärzt_klein.pdf`. |
| Sicherheit | Die nächste Aktion bekommt nur die gespeicherten Ergebnis-Bytes als neue Datei. Das Original ist dann gar nicht mehr in der App. |
| Neue Screens | Drei kleine Screens (A1–A3). Aktionen-Menü, alle Schritte und alle Speichern-Screens bleiben, wie sie sind. |

---

## 1. Ist-Zustand

So funktioniert der Abschluss heute (Code auf `redesign`):

- Jede Aktion speichert im letzten Schritt (`speicherZiel` + `ziel.schreibe` in `save.js`) und zeigt dann
  `zeigeGespeichert` (`gespeichert.js`) als Zwischen-Screen ohne Kopfzeile (`ctx.zeigeFertig` in `wizard.js`).
- Auf „Gespeichert ✓“ gibt es nur „Noch eine Datei bearbeiten“ → `ctx.vonVorn` → leerer Startscreen.
  Zurück führt wieder zum Speichern-Schritt.
- Nach dem Speichern merkt sich die App nur Name und Größe der Ergebnisse (`[{ name, groesse }]`). Die fertigen
  Dateien selbst (Blobs) werden nicht aufgehoben.
- Die Miniaturen auf „Gespeichert ✓“ kommen aus den **Ursprungsdateien**, nicht aus dem Ergebnis.
- Der Startscreen kennt nur frisch gewählte Dateien. Sein Vorschlag ist fest: 1 Datei → Verkleinern, mehrere →
  Zusammenführen (`aktionenFuer` in `intake.js`).

Was es also braucht: Ergebnisse aufheben, sie als neue Auswahl in den Startscreen geben und einen zweiten Knopf auf
„Gespeichert ✓“. An den sechs Abläufen selbst ändert sich nichts.

---

## 2. Der Ablauf

```
Start (Datei wählen) ──► Aktion ──► Schritte ──► Speichern ──► Gespeichert ✓
  ▲   ▲                                                         │      │
  │   │                                                         │      │
  │   └── Start mit Ergebnis ◄── „Diese Datei weiterbearbeiten“ ┘      │
  │       (Ergebnis = neue Auswahl,                                    │
  │        Vorschlag nur mit Grund)                                    │
  │                                                                    │
  └──────────────── „Noch eine Datei bearbeiten“ (leerer Start) ◄──────┘
```

Beide Knöpfe auf „Gespeichert ✓“ führen also zum Startscreen – einmal leer, einmal mit dem Ergebnis. Von dort geht
es immer gleich weiter. Es gibt keinen zweiten Ort, an dem man eine Aktion wählt.

### 2.1 Beispiel: Schwärzen, danach Verkleinern

1. Start: `Vertrag.pdf` (0,2 MB) → ▾ → **Schwärzen** → Stellen schwärzen → Speichern-Schritt mit Hinweis
   „Die Datei ist größer geworden. Nach dem Speichern kannst du sie gleich verkleinern.“ → **Speichern**.
2. **Gespeichert ✓**: Karte „Vertrag_geschwärzt.pdf · 2,4 MB · 12 Stellen geschwärzt“, darunter
   „Tipp: Die Datei ist größer geworden – du kannst sie gleich verkleinern.“
   Knöpfe: „Diese Datei weiterbearbeiten“ · „Noch eine Datei bearbeiten“.
3. Tipp auf **„Diese Datei weiterbearbeiten“** → Startscreen: Vorschau der geschwärzten ersten Seite,
   „Vertrag_geschwärzt.pdf · 2,4 MB“, Hinweis „Dein Ergebnis · schon gespeichert“, geteilter Button **Verkleinern** ▾.
4. Tipp auf **Verkleinern** → „Wie stark verkleinern?“ (Schritt 2 von 3) → Speichern als
   `Vertrag_geschwärzt_klein.pdf` → Gespeichert ✓ (−60 %), wieder mit beiden Knöpfen.

### 2.2 Beispiel: Trennen in einzelne Seiten, danach Verkleinern

1. `Scan.pdf` → Trennen → 3 Seiten, „Jede Seite als eigene Datei“ → **Alle speichern (3)**.
2. Gespeichert ✓ „3 Dateien gespeichert“ → **„Diese 3 Dateien weiterbearbeiten“**.
3. Startscreen mit 3 Dateien (Streifen, × je Datei). Kein Vorschlag (die Seiten sind klein) → Knopf **„Aktion wählen“** ▾.
   Im Menü: Verkleinern ✓ („Jede Datei einzeln verkleinern.“), Zusammenführen ✓, die anderen ausgegraut mit Grund.
4. Wer nur eine der drei Seiten weiter bearbeiten will, entfernt die anderen vorher mit ×.

### 2.3 Was nach jeder Aktion passiert

| Aktion | Ergebnis = neue Auswahl | Vorschlag danach (wenn …) | Name nach weiterem Verkleinern |
|---|---|---|---|
| Verkleinern (1 Datei) | 1 Datei | keiner – wurde gerade verkleinert | – |
| Verkleinern (mehrere) | die kleiner gewordenen Dateien | keiner | – |
| Zusammenführen | 1 PDF | Verkleinern, wenn über 2 MB | `Zusammengeführt_klein.pdf` |
| Seiten ordnen | 1 PDF | Verkleinern, wenn über 2 MB | `Vertrag_geordnet_klein.pdf` |
| Trennen – eine Datei | 1 PDF | Verkleinern, wenn über 2 MB | `Vertrag_Seiten_3-4-7_klein.pdf` |
| Trennen – je Seite | mehrere PDFs | Verkleinern, wenn eine Datei über 2 MB | `Vertrag_Seite3_klein.pdf` … |
| Umwandeln PDF → Bilder | 1 oder mehrere Bilder | Verkleinern, wenn groß oder deutlich größer (oft bei PNG) | `Vertrag_Seite1_klein.png` … |
| Umwandeln Bild(er) → … | 1 oder mehrere Dateien | Verkleinern, wenn groß oder deutlich größer | `Foto_klein.pdf` |
| Schwärzen | 1 PDF oder Bild | Verkleinern, wenn deutlich größer (bei Text-PDFs fast immer) | `Vertrag_geschwärzt_klein.pdf` |

Welche Aktionen erlaubt sind, regelt allein HANDOFF 6.1 (plus Schwärzen 3.1) – angewendet auf die Ergebnisdateien.

---

## 3. Entscheidungen

### 3.1 Wie geht es nach einer Aktion weiter? (einheitliche Logik)

**Option A – Einzelfall „danach gleich verkleinern“** (HANDOFF 13.1)
Eine Ausgabe-Option im Speichern-Schritt von Zusammenführen und Seiten ordnen.
- \+ Sehr schnell für genau diesen Fall.
- – Nur für zwei Aktionen und nur für Verkleinern. Genau das soll es laut Nutzer nicht sein.

**Option B – Aktion direkt auf „Gespeichert ✓“ wählen**
Unter der Datei-Karte steht „Weiter mit dieser Datei“ mit einem geteilten Button (Vorschlag + ▾ Aktionen-Menü).
Ein Tipp startet sofort die nächste Aktion.
- \+ Ein Tipp weniger. So machen es viele Online-PDF-Werkzeuge.
- – Die Aktion wird dann an **zwei Stellen** gewählt (Startscreen und Gespeichert). Das ist eine zweite Logik.
- – Der Erfolgs-Screen wird voll: zwei Knöpfe mit ▾ und Haupt-Button konkurrieren miteinander.
- – Bei mehreren Ergebnissen kann man vor der Wahl keine Datei entfernen oder hinzufügen.
- – Zurück aus der neuen Aktion landet auf einem Screen, den man in dieser Kette noch nicht gesehen hat
  (Startscreen mit Ergebnis) – oder es braucht eine aufwendige Ketten-History zurück zu „Gespeichert ✓“.

**Option C – Das Ergebnis wird zur neuen Auswahl im Startscreen** · **Empfehlung**
„Gespeichert ✓“ bekommt den Knopf „Diese Datei weiterbearbeiten“. Er führt zum Startscreen, auf dem das Ergebnis
gewählt ist. Dort geht es mit dem bekannten geteilten Button weiter.
- \+ **Eine einzige Logik:** erst Datei, dann Aktion. Das Ergebnis ist einfach die nächste Datei. Es gibt nur einen
  Ort für die Aktionswahl.
- \+ Symmetrisch und leicht zu verstehen: „Noch eine Datei bearbeiten“ = Start leer, „Diese Datei weiterbearbeiten“ =
  Start mit dem Ergebnis.
- \+ Man sieht das Ergebnis groß als Vorschau. Gerade nach dem Schwärzen ist das ein sichtbarer Beweis:
  „Das hier ist die geschwärzte Datei.“
- \+ Mehrere Ergebnisse: einzelne mit × entfernen, weitere hinzufügen – das kann der Startscreen schon.
- \+ Zurück aus der nächsten Aktion führt genau dorthin, wo man herkam (Startscreen mit Ergebnis). Das passt auch zur
  Schrittanzeige, denn dort ist Schritt 1 immer die Datei.
- \+ Wenig Neues für Design und Code: ein Knopf auf „Gespeichert ✓“, ein Hinweis auf dem Startscreen.
- – Ein Tipp mehr als bei B (zwei statt einem bis zur nächsten Aktion). Beide Tipps sind aber eindeutig.

**Option D – Kette vorab planen** (z. B. im Aktionen-Menü „Zusammenführen + Verkleinern“ ankreuzen)
- – Passt nicht zum Wizard „ein Schritt nach dem anderen“, viele Kombinationen, schwer verständlich. Nicht weiter verfolgt.

**Empfehlung: Option C.** Der Nutzer wünscht ausdrücklich eine einheitliche Logik statt Sonderfällen. C wendet die
Grundregel „erst Datei, dann Aktion“ einfach noch einmal an und braucht keinen neuen Ort und keine neue Bedienung.
Den einen Tipp mehr wiegen die klarere Logik und die Vorschau des Ergebnisses auf.

### 3.2 Erst speichern oder ohne Zwischenspeichern verketten?

**Option A – Erst speichern, dann weiter** · **Empfehlung**
Jede Aktion endet wie heute mit „Speichern“ → „Gespeichert ✓“. Erst danach kann man weiterbearbeiten.
- \+ **Nichts geht verloren.** Wird die App geschlossen (passiert auf dem Handy schnell), liegt jedes Zwischenergebnis
  schon auf dem Gerät. Besonders wichtig nach zehn Minuten Schwärzen.
- \+ Die sechs Abläufe bleiben **unverändert**. Nur „Gespeichert ✓“ bekommt einen Knopf.
- \+ „Speichern“ bleibt eindeutig: immer der letzte Schritt einer Aktion. Das Dateiname-Feld hat immer einen Sinn.
- \+ Die Technik des „Speichern unter“-Dialogs bleibt, wie sie ist (er muss direkt im Tipp aufgehen).
- \+ Man kann eine Kette auch später fortsetzen: Das Zwischenergebnis ist eine normale Datei auf dem Gerät.
- – Zwischendateien landen mit im Ordner für gespeicherte Dateien (z. B. `Zusammengeführt.pdf` **und**
  `Zusammengeführt_klein.pdf`). FileKit kann sie nicht selbst löschen, das kann ein Browser nicht.
  Durch die eindeutigen Namen ist aber klar, welche Datei welche ist. Oft will man das Zwischenergebnis sogar behalten.

**Option B – Verketten ohne Zwischenspeichern**
Im Speichern-Schritt gibt es zusätzlich „Ohne Speichern weiter“. Gespeichert wird nur am Ende der Kette.
- \+ Keine Zwischendateien, weniger Dialoge am PC.
- – Jeder Speichern-Screen braucht zwei Wege. Das Namensfeld wäre beim Weitergehen sinnlos („Wozu ein Name, wenn ich
  nicht speichere?“).
- – Wird die App zwischendurch geschlossen, ist die ganze Kette weg.
- – „Abbrechen“ müsste die ganze Kette als ungespeicherte Arbeit behandeln. Rückfragen und Zurück werden deutlich komplizierter.

**Option C – beides anbieten**: höchste Flexibilität, aber die Nachteile von B kommen trotzdem in jeden Speichern-Screen.

**Empfehlung: Option A.** Sicherheit vor Bequemlichkeit, und sie hält die bestehenden Abläufe unangetastet.
Stören die Zwischendateien später wirklich, kann B als Zusatz nachgerüstet werden (siehe Kap. 7).

### 3.3 Wie wird das Ergebnis zur neuen Eingabe?

**Option A – Ergebnis als echte Datei neu öffnen** · **Empfehlung**
Aus jedem gespeicherten Ergebnis wird eine neue Datei (`new File([blob], gespeicherterName)`), die durch denselben
Datei-Eingang läuft wie eine frisch gewählte (`oeffneDatei` in `intake.js`): Vorschau, Seitenzahl, Prüfung.
- \+ Alles, was die App mit Dateien kann, funktioniert sofort, ohne Sonderfälle in den Abläufen.
- \+ **Sicher durch die Bauweise:** Die nächste Aktion kennt nur die Bytes des Ergebnisses. Es gibt keinen Verweis
  mehr auf das Original.
- – Kostet einen kurzen Moment „Wird geöffnet …“ (bei einer Datei kaum spürbar).

**Option B – interne Übergabe** (z. B. die Seitenliste des Editors direkt an die nächste Aktion)
- \+ Etwas schneller.
- – Jede Aktion bräuchte Sonderfälle. Und gefährlich: Die Seitenliste von „Seiten ordnen“ zeigt intern auf die
  **Originaldatei**. Ginge sie an Schwärzen oder eine andere Aktion weiter, könnte das Original durchrutschen.

**Empfehlung: Option A.** Als Name gilt der Name, unter dem wirklich gespeichert wurde (im „Speichern unter“-Dialog
kann der Nutzer ihn ändern).

### 3.4 Welche Aktion wird vorgeschlagen?

Die Regeln, **welche** Aktionen erlaubt sind, bleiben unverändert (HANDOFF 6.1, Schwärzen 3.1). Offen ist nur der
**Vorschlag** auf dem geteilten Button, wenn ein Ergebnis gewählt ist.

**Option A – feste Regel wie beim Start** (1 Datei → Verkleinern, mehrere → Zusammenführen)
- – Schlägt oft Unsinn vor: Verkleinern direkt nach Verkleinern, Zusammenführen direkt nach „Trennen je Seite“
  (macht das Trennen rückgängig).

**Option B – Vorschlag nur mit gutem Grund** · **Empfehlung**
- **Verkleinern** wird vorgeschlagen, wenn
  - eine Ergebnisdatei **größer als 2 MB** ist (2 MB ist auch die Standard-Zielgröße), oder
  - das Ergebnis durch die Aktion **deutlich größer** geworden ist (mehr als 1,5-mal so groß **und** über 1 MB),
  - und die gerade gemachte Aktion **nicht** Verkleinern war.
- Sonst gibt es **keinen Vorschlag**. Statt des geteilten Buttons steht dann ein Knopf **„Aktion wählen“** (mit ▾),
  der dasselbe Aktionen-Menü öffnet. Im Menü ist dann keine Zeile als „Vorschlag“ hervorgehoben.
- Schwärzen wird nie vorgeschlagen (Schwärzen-Konzept 3.1 und 3.3).
- Die Schwellen (2 MB, 1,5-fach, 1 MB) sind Startwerte und werden im Test geprüft.

**Option C – feste Folge-Tabelle je Aktion** (z. B. nach Zusammenführen immer Verkleinern)
- – Starr: Ein zusammengeführtes PDF mit 300 KB muss nicht verkleinert werden.

**Option D – nie ein Vorschlag**
- – Einfach, verliert aber den bequemen Weg „danach verkleinern“, den der Nutzer ausdrücklich nennt.

**Empfehlung: Option B.** Ein Vorschlag soll einen Grund haben, sonst wirkt er beliebig. Der wichtigste Fall –
die Datei ist zu groß geworden, etwa nach Schwärzen oder Zusammenführen – ist damit abgedeckt.
Der Vorschlag gilt, solange nur Ergebnisdateien gewählt sind. Kommen auf dem Startscreen weitere Dateien hinzu,
ist es eine neue Auswahl, und es gilt wieder die normale Regel 6.1.

**Hinweis auf „Gespeichert ✓“:** Gibt es einen Grund für Verkleinern, steht unter der Datei-Karte ein kurzer Tipp:
- gewachsen: „Tipp: Die Datei ist größer geworden (0,2 MB → 2,4 MB) – du kannst sie gleich verkleinern.“
- groß: „Tipp: Die Datei ist 6,8 MB groß – du kannst sie gleich verkleinern, z. B. für Online-Formulare.“
- mehrere: „Tipp: Die Dateien sind zusammen 9,1 MB groß – du kannst sie gleich verkleinern.“

So sieht man schon im Erfolgsmoment, wozu „Diese Datei weiterbearbeiten“ gut ist.

### 3.5 Mehrere Ergebnisdateien

Mehrere Dateien entstehen bei Trennen („Jede Seite als eigene Datei“), Umwandeln (mehrseitiges PDF → Bilder,
mehrere Bilder) und Verkleinern (mehrere Dateien).

**Option A – alle gespeicherten Dateien gehen gemeinsam weiter** · **Empfehlung**
- Weiter geht genau das, was die Karte auf „Gespeichert ✓“ zeigt („3 Dateien gespeichert“). Beim Verkleinern sind
  Dateien, die nicht kleiner wurden, nicht dabei, denn sie wurden auch nicht gespeichert.
- Auf dem Startscreen gelten die Regeln für „mehrere“ (6.1). Einzelne Dateien lassen sich mit × entfernen, weitere
  mit „Weitere Dateien hinzufügen“ ergänzen. Das kann der Startscreen heute schon.
- Knopftext: „Diese Datei weiterbearbeiten“ bzw. „Diese 3 Dateien weiterbearbeiten“.

**Option B – Weiterbearbeiten nur bei genau einem Ergebnis**
- – Einfacher, aber nicht „konsequent nach jeder Aktion“.

**Option C – eigener Auswahl-Dialog, welche Dateien weitergehen**
- – Ein zusätzlicher Screen für etwas, das der Startscreen mit × schon kann.

**Empfehlung: Option A.**

### 3.6 Zurück, Abbrechen und Verlauf über mehrere Aktionen

**Option A – jede Aktion ist mit dem Speichern abgeschlossen** · **Empfehlung**
- Innerhalb einer Aktion bleibt alles wie in HANDOFF 6: Zurück-Pfeil, Browser-Zurück, Abbrechen mit Rückfrage (20c).
- „Gespeichert ✓“ → Zurück führt wie heute zum Speichern-Schritt.
- „Diese Datei weiterbearbeiten“ schließt die Aktion ab (wie „Noch eine Datei bearbeiten“) und zeigt den Startscreen
  mit dem Ergebnis. Die alte Aktion und das Original werden dabei freigegeben.
- In der nächsten Aktion führt Zurück aus Schritt 2 zum **Startscreen mit dem Ergebnis**. Das ist das heutige
  Verhalten bei gewählten Dateien. Abbrechen (×) führt wie immer zum **leeren** Startscreen. Das gespeicherte
  Zwischenergebnis bleibt auf dem Gerät.
- Browser-Zurück auf dem Startscreen verlässt die App – wie heute, wenn Dateien gewählt sind.

**Option B – Ketten-Verlauf** (Zurück führt durch alle vorigen Aktionen bis zu deren „Gespeichert ✓“ und Schritten)
- – Alle Originale müssten im Speicher bleiben. Ändert man eine frühere Aktion, wären alle späteren Ergebnisse
  veraltet. Das ist schwer zu verstehen und widerspricht der Schwärzen-Regel „nie das Original weiterreichen“.

**Empfehlung: Option A.** Gespeichert ist gespeichert. Wer eine frühere Aktion anders machen will, startet sie neu
mit der gespeicherten Datei.

### 3.7 Schrittanzeige

**Option A – pro Aktion, wie heute** · **Empfehlung**: „Schritt 2 von 3“ zählt nur die laufende Aktion. Schritt 1 ist
der Startscreen mit dem Ergebnis. Wie lang eine Kette wird, weiß vorher niemand, denn man entscheidet nach jedem Speichern neu.

**Option B – Zähler über die ganze Kette** („Schritt 5 von 6“): Die Gesamtzahl ist vorher unbekannt. Verwirrend.

**Option C – zusätzliche Ketten-Anzeige** („Schwärzen ✓ → Verkleinern“) in der Kopfzeile: Dafür reicht der Platz
bei 375 px nicht. Der Dateiname (`Vertrag_geschwärzt.pdf`) zeigt schon, was vorher passiert ist.

**Empfehlung: Option A.**

### 3.8 Dateinamen

- Die Vorschläge aus HANDOFF 6.2 bleiben unverändert. Weil `{Name}` jetzt der Name des Ergebnisses ist, **verketten
  sich die Endungen von selbst**: `Vertrag.pdf` → `Vertrag_geschwärzt.pdf` → `Vertrag_geschwärzt_klein.pdf`.
- Zusammenführen heißt weiterhin `Zusammengeführt.pdf`, egal woher die Dateien kommen.
- Dieselbe Aktion zweimal ergibt `Vertrag_klein_klein.pdf`. **Empfehlung: so lassen.** Würde man das zweite `_klein`
  weglassen, hieße die neue Datei genauso wie die gespeicherte Zwischendatei, und der „Speichern unter“-Dialog würde
  fragen, ob sie ersetzt werden soll. Der Name lässt sich im Feld jederzeit ändern.
- Seltener Fall: Bild → PDF → zurück zu JPG ergibt wieder `Foto.jpg`, also den Namen des Originals. Das gibt es schon
  heute bei Umwandeln. Der „Speichern unter“-Dialog fragt vor dem Ersetzen nach, andere Browser hängen „(1)“ an.
  Keine Änderung nötig.
- Der Satz unter dem Namensfeld („… das Original bleibt unverändert.“) stimmt weiterhin, denn das Zwischenergebnis
  bleibt ebenfalls unverändert.

### 3.9 Welcher Knopf ist auf „Gespeichert ✓“ der Haupt-Button?

- **Empfehlung: „Noch eine Datei bearbeiten“ bleibt Haupt-Button.** „Diese Datei weiterbearbeiten“ steht als
  sekundärer Knopf darüber. Es gibt schon ein Vorbild dafür: Screen 09b hat einen Ghost-Button über „Speichern“.
  Die HANDOFF-Regel „genau ein Haupt-Button“ bleibt so erhalten, und wer fertig ist, wird nicht in eine Kette gelenkt.
- Alternative: „Diese Datei weiterbearbeiten“ als Haupt-Button. Das wäre sinnvoll, wenn die meisten Nutzer Ketten
  bilden. Das ist aber nicht zu erwarten.

---

## 4. Sicherheitsregel aus dem Schwärzen-Konzept

Das Schwärzen-Konzept (3.3, 4.9, 4.10) stellt Anforderungen an den Abschluss-Workflow. So werden sie erfüllt:

| Anforderung (Schwärzen-Konzept) | Erfüllt durch |
|---|---|
| 3.3.1 Das Ergebnis ist eine normale Datei und wird über `oeffneDatei` zum neuen Eintrag. | 3.3 Option A – genau so. |
| 3.3.2 Schwärzen als Anschluss nach jeder Aktion; bei mehreren Dateien ausgegraut. | Die Regeln (Schwärzen 3.1) gelten für die Ergebnisdateien. Mit × auf eine Datei reduzieren → Schwärzen wird wählbar. |
| 3.3.3 Nach Schwärzen: Verkleinern als Vorschlag, wenn die Datei gewachsen ist. | 3.4 Option B (Grund „deutlich größer“) plus Tipp auf „Gespeichert ✓“. |
| **3.3.4 Die nächste Aktion arbeitet immer mit dem geschwärzten Ergebnis, nie mit dem Original.** | Siehe unten. |
| 3.3.5 Schwärzen im Anschluss nicht vorschlagen, aber erlauben. | Vorgeschlagen wird immer nur Verkleinern. |
| 3.3.6 Reihenfolge ohne Zwang. | Jede erlaubte Aktion ist jederzeit wählbar. |
| 3.3.7 Namen verketten: `Vertrag_geschwärzt_klein.pdf`. | 3.8. |
| 4.9 Wortlaut des Größen-Hinweises im Speichern-Schritt. | „Die Datei ist größer geworden. Nach dem Speichern kannst du sie gleich verkleinern.“ |
| 4.10 Gespeichert ✓ mit „12 Stellen geschwärzt“ und Anschluss. | Screen A1 mit der Karte aus S11. |

**Wie die Sicherheitsregel garantiert wird** (sicher durch die Bauweise, nicht durch Aufpassen):

1. Die nächste Aktion bekommt **nur** die gespeicherten Ergebnis-Bytes, neu geöffnet als eigene Datei (3.3 Option A).
   Es gibt keinen Verweis auf die Ursprungsdatei, keine übernommene Seitenliste.
2. Mit „Diese Datei weiterbearbeiten“ wird die vorige Aktion beendet. Die Originale werden freigegeben, auch Dateien,
   die im Seiten-Editor hinzugefügt wurden. Danach ist das Original gar nicht mehr in der App.
3. Zurück führt nie in eine frühere Aktion (3.6). In den Schwärzen-Editor kommt man nur innerhalb von Schwärzen
   zurück (Speichern-Schritt → Editor), solange noch nicht weiterbearbeitet wurde.
4. Vorschau und Miniaturen werden für das Ergebnis **neu** erzeugt (neuer Eintrag, eigener Zwischenspeicher in
   `thumbs.js`). Bilder des Originals können also nicht auftauchen.
5. Das Original kommt nur zurück, wenn der Nutzer es selbst wieder hinzufügt („Weitere Dateien hinzufügen“). Das ist
   eine bewusste Handlung, nicht „unbemerkt“.
6. Der Hinweis „Dein Ergebnis · schon gespeichert“ und die Vorschau der geschwärzten Seite zeigen sichtbar, womit
   weitergearbeitet wird.

---

## 5. Screens für Claude Design

Neue Nummern beginnen mit „A“ (Schwärzen nutzt S0–S12, bestehende Screens 1–21b).

| Nr | Screen | Inhalt |
|---|---|---|
| A1 | Gespeichert ✓ mit „Weiterbearbeiten“ | Update von Screen 18. Unter der Datei-Karte optional die Tipp-Zeile (3.4). Dock: sekundär „Diese Datei weiterbearbeiten“, darunter Haupt-Button „Noch eine Datei bearbeiten“ (Muster wie 09b). Varianten: eine Datei mit Tipp (z. B. nach Zusammenführen, 6,8 MB) · eine Datei ohne Tipp (nach Verkleinern, Badge −77 %) · mehrere Dateien („Diese 3 Dateien weiterbearbeiten“) · Knopf im Zustand „Wird geöffnet …“ (Spinner) · Schwärzen-Karte aus S11 („12 Stellen geschwärzt“). |
| A2 | Startscreen mit Ergebnis – mit Vorschlag | Update von Screen 03/04. Wie „1 Datei“ bzw. „mehrere Dateien“, dazu ein dezenter Hinweis „Dein Ergebnis · schon gespeichert“ (mit Haken; bei mehreren „3 Ergebnisse · schon gespeichert“). Geteilter Button mit „Verkleinern“. Vorschau zeigt die erste Seite des Ergebnisses. |
| A3 | Startscreen mit Ergebnis – ohne Vorschlag | Wie A2, aber statt des geteilten Buttons ein Knopf „Aktion wählen“ (Icon ▾ bzw. `aufklappen`), der das Aktionen-Menü öffnet. Varianten: 1 Datei · mehrere (Streifen). |
| A4 | PC (≥ 1024 px) | A2/A3 im zweispaltigen Startscreen (21a): Hinweis und Knopf rechts bei der Vorschau. Vermutlich reicht ein Board. |
| A5 | Übergang (Animation, optional) | Von „Gespeichert ✓“ zum Startscreen: Die Datei-Karte wird zur großen Vorschau (Muster „Dropzone → Vorschau“, 520 ms, nur `transform`/`opacity`; View Transitions mit Fallback möglich). Bei „Bewegung reduzieren“ nur Überblendung. |

**Kein neuer Screen nötig:**
- **Aktionen-Menü** (05/05b bzw. S1): unverändert. Die Unterzeile nennt das Ergebnis („Vertrag_geschwärzt.pdf ·
  12 Seiten“). Ohne Vorschlag ist keine Zeile hervorgehoben.
- **Alle Schritte, Verarbeiten-Screens und Speichern-Screens** der sechs Aktionen: unverändert. Einzige Ergänzung ist
  der Größen-Hinweis im Schwärzen-Speichern-Schritt (S10, Wortlaut in Kap. 4).
- **Rückfrage 20c**: unverändert.

Begriffe für Design und Texte:
- **Weiterbearbeiten** = mit dem gespeicherten Ergebnis eine weitere Aktion machen. Bewusst nicht
  „weiterverarbeiten“, denn „Verarbeiten“ heißt in FileKit: die App arbeitet.
- **Ergebnis** = die gerade gespeicherte(n) Datei(en).
- Weiterhin: Wählen/Hinzufügen · Verarbeiten · Speichern. Nie „Laden“, „Herunterladen“, „Download“, „Upload“.

---

## 6. Umsetzungsschritte (Claude Code)

Erst nach Freigabe dieses Konzepts und nach dem Design von Claude Design (gemeinsames Briefing mit Schwärzen).
Nach jedem Schritt wird dem Nutzer das Ergebnis gezeigt. Reihenfolge laut Schwärzen-Konzept, Frage 5: erst dieser
Abschluss-Workflow, dann Schwärzen.

1. **Ergebnisse aufheben:** `ziel.schreibe` (`save.js`) liefert zusätzlich den Blob zurück
   (`[{ name, groesse, blob }]`). Jeder Ablauf gibt `zeigeGespeichert` außerdem die Herkunft mit
   (`{ aktion, vorher: Bytes der Eingabe }`), damit der Grund für den Vorschlag berechnet werden kann.
2. **Vorschlag-Regel:** `aktionenFuer(dateien, herkunft)` in `intake.js`. Ohne Herkunft wie bisher, mit Herkunft
   nach 3.4. `vorschlag` darf `null` sein. Dazu eine kleine Funktion für den Grund (Tipp-Text).
3. **Wizard:** neues `ctx.weiterbearbeiten(eintraege, herkunft)`. Es baut den Verlauf ab wie `ctx.vonVorn` und
   übergibt das Ergebnis an `beiEnde` (`app.js` reicht es an den Startscreen weiter).
4. **Gespeichert ✓** (`gespeichert.js`): Tipp-Zeile und zweiter Knopf. Beim Tipp werden die Ergebnisse geöffnet
   (`oeffneDatei`, Knopf zeigt „Wird geöffnet …“). Erst wenn das geklappt hat, geht es zum Startscreen. Klappt es
   nicht, kommt ein Toast und man bleibt auf „Gespeichert ✓“.
5. **Startscreen** (`start.js`): Auswahl durch das Ergebnis ersetzen (alte Einträge freigeben), Hinweis
   „Dein Ergebnis · schon gespeichert“, Knopf „Aktion wählen“ ohne Vorschlag, Herkunft verwerfen, sobald Dateien
   hinzukommen. Fokus auf den Haupt-Button, Ansage per `aria-live`: „Vertrag_geschwärzt.pdf ist gewählt.
   Vorschlag: Verkleinern.“
6. **PC-Layout** und die optionale Übergangs-Animation, Service Worker mit neuer Cache-Version.
7. **Prüfung:** jede Aktion → jede erlaubte Folgeaktion. Mehrere Ergebnisse (×, Hinzufügen). Dateinamen-Kette. Name
   aus dem „Speichern unter“-Dialog wird übernommen. Zurück, Abbrechen, Browser-Zurück und -Vor. 375 px und 1280 px,
   Tastatur, Screenreader-Stichprobe, Bewegung reduzieren, offline.
8. **Doku:** HANDOFF-Nachtrag (Kap. 6 Ablauf, 6.1 Vorschlag für Ergebnisse, Screen 18, Antwort auf 13.1) und `CLAUDE.md`.

Schwärzen-Umsetzungsschritt 9 („Anschluss an den Abschluss-Workflow“) wird damit fast leer. Schwärzen gibt nur noch
Ergebnis und Herkunft an `zeigeGespeichert`. Dazu kommen die Sicherheits-Prüffälle: Vorschau und Miniaturen nach dem
Weiterbearbeiten zeigen die geschwärzte Fassung; Schwärzen → Seiten ordnen / Umwandeln / Verkleinern → im Ergebnis
ist kein Text des Originals zu finden.

---

## 7. Bewusst später (nicht in der ersten Version)

- **„Ohne Speichern weiter“** (3.2 Option B), falls Zwischendateien im Alltag wirklich stören.
- **Weitere begründete Vorschläge**, z. B. nach „PDF → Bilder“ das Zusammenführen anbieten. Erst, wenn sich ein
  klarer Bedarf zeigt.
- **Gespeicherte Ketten** („Immer: Zusammenführen + Verkleinern auf 2 MB“) als Vorlage.
- **Ketten-Anzeige** (welche Aktionen schon gemacht wurden), z. B. als Zeile auf „Gespeichert ✓“.
- **Browser-Zurück auf dem Startscreen mit Ergebnis** führt zum leeren Startscreen, statt die App zu verlassen.

---

## 8. Entscheidungen (alle Empfehlungen am 24.10.2026 freigegeben)

**Wichtige Entscheidungen**

| # | Frage | Empfehlung | Alternative |
|---|---|---|---|
| 1 | Grundidee: Wo wählt man die nächste Aktion? | **Startscreen mit dem Ergebnis** (Knopf „Diese Datei weiterbearbeiten“ auf Gespeichert ✓) – eine einzige Logik | direkt auf „Gespeichert ✓“ (ein Tipp weniger, aber zweiter Ort) |
| 2 | Zwischenspeichern? | **Erst speichern, dann weiter** – nichts geht verloren, Abläufe bleiben unverändert | ohne Zwischenspeichern verketten |
| 3 | Vorschlag nach einer Aktion | **Nur mit Grund:** Verkleinern, wenn groß oder deutlich größer geworden; sonst „Aktion wählen“ | feste Regel wie beim Start |
| 4 | Mehrere Ergebnisdateien | **Alle gehen zusammen weiter**, einzelne per × entfernbar | Weiterbearbeiten nur bei genau einer Datei |
| 5 | Zurück über mehrere Aktionen | **Jede Aktion ist mit dem Speichern abgeschlossen**; Zurück höchstens bis zum Startscreen mit Ergebnis | Ketten-Verlauf durch alle Aktionen |

**Kleinere Punkte** – die Empfehlung gilt, wenn du nichts anderes sagst:

6. Haupt-Button auf „Gespeichert ✓“ bleibt **„Noch eine Datei bearbeiten“**, „Diese Datei weiterbearbeiten“ ist sekundär.
7. Knopftext: **„Diese Datei weiterbearbeiten“** bzw. „Diese 3 Dateien weiterbearbeiten“.
8. Hinweis auf dem Startscreen: **„Dein Ergebnis · schon gespeichert“**.
9. Tipp-Zeile auf „Gespeichert ✓“, wenn Verkleinern vorgeschlagen wird: **ja**.
10. Schwellen für den Vorschlag: **über 2 MB oder mehr als 1,5-mal so groß und über 1 MB** (Startwerte, im Test prüfen).
11. Dateinamen verketten ohne Kürzen (`Vertrag_klein_klein.pdf`): **ja**.
12. Schrittanzeige pro Aktion wie heute: **ja**.
13. HANDOFF 13.1 („danach gleich verkleinern“ als Ausgabe-Option): **nicht umsetzen**. Der allgemeine Ablauf ersetzt
    sie, und „Format: PDF“ bleibt, wie es ist.
