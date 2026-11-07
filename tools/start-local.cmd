@echo off
REM Start Shewiun CFA locally on Windows (cmd). Fill the three values marked TODO once,
REM then double-click this file. The database stays in %USERPROFILE%\shewiun-data\cfa.db.
REM
REM Public URL: run cloudflared in a second window:
REM    cloudflared.exe tunnel --url http://127.0.0.1:8000

set "ROOT=%~dp0.."
set "LIBS=C:\Users\shpet\OneDrive\Dokumente\deepseek-harness\default-workspace\libs"

REM ---------- TODO: fill these once ----------
set "CFA_SECRET_KEY=PASTE_FERNET_KEY_HERE"
set "CFA_SEARCH_API_KEY=PASTE_TAVILY_KEY_HERE"
set "CFA_MODEL_API_KEY="
REM ------------------------------------------

set "PYTHONPATH=%LIBS%"
set "CFA_ENV=production"
set "CFA_ALLOW_SIGNUP=1"
set "CFA_SEARCH_PROVIDER=tavily"
set "CFA_DATABASE_PATH=%USERPROFILE%\shewiun-data\cfa.db"
set "CFA_PUBLIC_URL=http://127.0.0.1:8000"

if not exist "%USERPROFILE%\shewiun-data" mkdir "%USERPROFILE%\shewiun-data"
cd /d "%ROOT%"

echo Starting Shewiun CFA on http://127.0.0.1:8000  (Ctrl+C to stop)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
