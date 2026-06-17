@echo off
rem Startet den Datei-Komprimierer per Doppelklick und haelt das Fenster offen.
chcp 65001 >nul
where py >nul 2>nul
if %errorlevel%==0 (
    py "%~dp0compress.py"
) else (
    python "%~dp0compress.py"
)
pause
