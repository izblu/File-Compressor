#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Datei-Komprimierer fuer PDFs und Bilder.

Verkleinert PDF-Dateien (durch Neukomprimieren eingebetteter Bilder) und
Bilddateien (JPG/PNG) - ohne das Original je zu ueberschreiben.

Bedienung: start.bat doppelklicken oder `python compress.py` ausfuehren und
den Anweisungen folgen.
"""

import io
import sys
from pathlib import Path

# Ausgabe auf UTF-8 stellen, damit Umlaute auch in alten Windows-Konsolen
# nicht zum Absturz fuehren (rein kosmetisch, schadet nirgends).
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# Pillow (Bildverarbeitung) - Pflicht.
try:
    from PIL import Image
except ImportError:
    print("FEHLER: Pillow ist nicht installiert.")
    print("Bitte ausfuehren:  pip install Pillow")
    sys.exit(1)

# Resampling-Filter (neuer Name ab Pillow 9.1, mit Fallback).
try:
    RESAMPLE = Image.Resampling.LANCZOS
except AttributeError:
    RESAMPLE = Image.LANCZOS

# PyMuPDF (PDF) - nur fuer die PDF-Funktion noetig.
try:
    import fitz  # PyMuPDF
    HAVE_FITZ = True
except ImportError:
    HAVE_FITZ = False


# ---------------------------------------------------------------------------
# Konfiguration: Qualitaetsstufen
#   max_side = maximale Bildkantenlaenge in Pixel (groessere werden skaliert)
#   quality  = JPEG-Qualitaet (0-95)
# ---------------------------------------------------------------------------
LEVELS = {
    1: {"name": "Stark (kleinste Datei)",       "max_side": 1000, "quality": 50},
    2: {"name": "Mittel / E-Book (empfohlen)",  "max_side": 1600, "quality": 70},
    3: {"name": "Schonend (beste Qualitaet)",   "max_side": 2200, "quality": 85},
}
DEFAULT_LEVEL = 2

IMAGE_EXTS = {".jpg", ".jpeg", ".png"}
PDF_EXTS = {".pdf"}
SUPPORTED_EXTS = IMAGE_EXTS | PDF_EXTS


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------
def human_size(num_bytes):
    """Bytes in lesbare Groesse umwandeln (B/KB/MB/GB)."""
    size = float(num_bytes)
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"


def output_path(src):
    """Zielpfad mit Suffix _compressed im selben Ordner."""
    src = Path(src)
    return src.with_name(f"{src.stem}_compressed{src.suffix}")


def shrink_image(img, max_side):
    """Bild auf max_side herunterskalieren - nur falls groesser."""
    if max(img.size) <= max_side:
        return img
    img.thumbnail((max_side, max_side), RESAMPLE)
    return img


# ---------------------------------------------------------------------------
# Bild-Kompression (Pillow)
# ---------------------------------------------------------------------------
def compress_image(src, level):
    """Ein Bild verkleinern. Gibt (ok, alt_bytes, neu_bytes, info) zurueck."""
    cfg = LEVELS[level]
    src = Path(src)
    old_size = src.stat().st_size
    dst = output_path(src)
    ext = src.suffix.lower()

    try:
        with Image.open(src) as img:
            img.load()
            img = shrink_image(img, cfg["max_side"])

            if ext in {".jpg", ".jpeg"}:
                if img.mode not in ("RGB", "L"):  # JPEG kennt kein Alpha
                    img = img.convert("RGB")
                img.save(dst, "JPEG", quality=cfg["quality"], optimize=True)
            elif ext == ".png":
                img.save(dst, "PNG", optimize=True)
            else:
                return (False, old_size, old_size, "Dateityp nicht unterstuetzt")
    except Exception as e:
        return (False, old_size, old_size, f"Fehler: {e}")

    new_size = dst.stat().st_size
    if new_size >= old_size:
        dst.unlink(missing_ok=True)  # Vergroesserung verwerfen, Original behalten
        return (False, old_size, old_size, "keine Einsparung moeglich")
    return (True, old_size, new_size, dst.name)


# ---------------------------------------------------------------------------
# PDF-Kompression (PyMuPDF): eingebettete Bilder neu kodieren, Text bleibt.
# ---------------------------------------------------------------------------
def _recompress_pdf_image(doc, page, xref, cfg):
    """Ein eingebettetes Bild herunterrechnen/als JPEG neu kodieren + ersetzen."""
    info = doc.extract_image(xref)
    if not info:
        return
    raw = info["image"]

    # Bilder mit Transparenz/Maske ueberspringen - JPEG kann das nicht.
    if info.get("smask", 0):
        return

    with Image.open(io.BytesIO(raw)) as img:
        img.load()
        if img.mode in ("RGBA", "LA", "P"):  # koennte Transparenz tragen
            return
        if img.mode != "RGB":                # z.B. CMYK/Graustufen -> RGB
            img = img.convert("RGB")
        img = shrink_image(img, cfg["max_side"])

        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=cfg["quality"], optimize=True)
        new_bytes = buf.getvalue()

    # Nur ersetzen, wenn das neue Bild wirklich kleiner ist.
    if len(new_bytes) < len(raw):
        page.replace_image(xref, stream=new_bytes)


def compress_pdf(src, level):
    """Ein PDF verkleinern. Gibt (ok, alt_bytes, neu_bytes, info) zurueck."""
    if not HAVE_FITZ:
        return (False, 0, 0, "PyMuPDF fehlt (pip install pymupdf)")

    cfg = LEVELS[level]
    src = Path(src)
    old_size = src.stat().st_size
    dst = output_path(src)

    try:
        doc = fitz.open(src)
    except Exception as e:
        return (False, old_size, old_size, f"Fehler beim Oeffnen: {e}")

    try:
        seen = set()
        for page in doc:
            for img in page.get_images(full=True):
                xref = img[0]
                if xref in seen:
                    continue
                seen.add(xref)
                try:
                    _recompress_pdf_image(doc, page, xref, cfg)
                except Exception:
                    # Einzelnes Bild ueberspringen statt abbrechen.
                    continue
        # garbage=4 entfernt die nun ungenutzten Original-Bilder.
        doc.save(dst, garbage=4, deflate=True, deflate_images=True,
                 deflate_fonts=True, clean=True)
    except Exception as e:
        return (False, old_size, old_size, f"Fehler beim Speichern: {e}")
    finally:
        doc.close()

    if not dst.exists():
        return (False, old_size, old_size, "Fehler")
    new_size = dst.stat().st_size
    if new_size >= old_size:
        dst.unlink(missing_ok=True)
        return (False, old_size, old_size, "keine Einsparung moeglich")
    return (True, old_size, new_size, dst.name)


# ---------------------------------------------------------------------------
# Steuerung / Menue
# ---------------------------------------------------------------------------
def process_one(path, level):
    ext = Path(path).suffix.lower()
    if ext in PDF_EXTS:
        return compress_pdf(path, level)
    if ext in IMAGE_EXTS:
        return compress_image(path, level)
    return (False, 0, 0, "Dateityp nicht unterstuetzt")


def collect_files(target):
    """Datei -> [Datei]; Ordner -> unterstuetzte Dateien (nicht rekursiv)."""
    p = Path(target)
    if p.is_file():
        return [p]
    if p.is_dir():
        return [
            f for f in sorted(p.iterdir())
            if f.is_file()
            and f.suffix.lower() in SUPPORTED_EXTS
            and "_compressed" not in f.stem
        ]
    return []


def ask_level():
    print("\nQualitaetsstufe waehlen:")
    for k in sorted(LEVELS):
        mark = "   <- Standard" if k == DEFAULT_LEVEL else ""
        print(f"  {k} = {LEVELS[k]['name']}{mark}")
    raw = input(f"Stufe [1-3, Enter = {DEFAULT_LEVEL}]: ").strip()
    if not raw:
        return DEFAULT_LEVEL
    if raw.isdigit() and int(raw) in LEVELS:
        return int(raw)
    print("Ungueltige Eingabe - nehme Standard.")
    return DEFAULT_LEVEL


def main():
    print("=" * 60)
    print(" Datei-Komprimierer  -  PDF & Bilder (JPG/PNG)")
    print("=" * 60)
    if not HAVE_FITZ:
        print("Hinweis: PyMuPDF ist nicht installiert - PDF-Kompression ist")
        print("         deaktiviert.  Installieren:  pip install pymupdf")
    print("Tipp: Datei oder Ordner ins Fenster ziehen, dann Enter.\n")

    # lstrip("\ufeff"): manche Editoren/Quellen haengen beim Kopieren ein BOM an.
    raw = input("Pfad zu Datei oder Ordner: ").lstrip("\ufeff").strip().strip('"')
    if not raw:
        print("Keine Eingabe. Beende.")
        return
    target = Path(raw)
    if not target.exists():
        print(f"Pfad nicht gefunden: {target}")
        return

    files = collect_files(target)
    if not files:
        print("Keine unterstuetzten Dateien gefunden (.pdf, .jpg, .jpeg, .png).")
        return

    level = ask_level()
    print(f"\nVerarbeite {len(files)} Datei(en) - Stufe {level} "
          f"({LEVELS[level]['name']}):\n")

    total_old = total_new = 0
    success = 0
    for f in files:
        ok, old, new, info = process_one(f, level)
        total_old += old
        total_new += new if ok else old
        if ok:
            saved = (1 - new / old) * 100 if old else 0
            print(f"  [OK]  {f.name}")
            print(f"        {human_size(old)} -> {human_size(new)}  "
                  f"(-{saved:.0f} %)")
            success += 1
        else:
            print(f"  [--]  {f.name}: {info}")

    print("\n" + "-" * 60)
    if success and total_old:
        saved_total = (1 - total_new / total_old) * 100
        print(f"Fertig: {success}/{len(files)} verkleinert.  "
              f"Gesamt {human_size(total_old)} -> {human_size(total_new)} "
              f"(-{saved_total:.0f} %)")
    else:
        print("Fertig: keine Datei konnte verkleinert werden.")
    print("-" * 60)


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print("\nAbgebrochen.")
    # Fenster offen halten, wenn per Doppelklick gestartet (interaktive Konsole).
    if sys.stdin and sys.stdin.isatty():
        try:
            input("\nMit Enter beenden...")
        except (KeyboardInterrupt, EOFError):
            pass
