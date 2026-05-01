@echo off
cd /d C:\Dev\xva-platform

echo Starting XVA backend...
start "XVA Backend" cmd /k "py -3.12 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000"

echo Starting XVA frontend...
start "XVA Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 5 > nul

start http://localhost:5173

echo Done.