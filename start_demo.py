import subprocess
import time
import webbrowser
from pathlib import Path

ROOT = Path(r"C:\Dev\xva-platform")
FRONTEND = ROOT / "frontend"

def open_cmd_window(title, command, cwd):
    subprocess.Popen(
        f'start "{title}" cmd /k "{command}"',
        cwd=str(cwd),
        shell=True
    )

print("Launching XVA demo...")

open_cmd_window(
    "XVA Backend",
    "py -3.12 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000",
    ROOT,
)

open_cmd_window(
    "XVA Frontend",
    "npm run dev",
    FRONTEND,
)

print("Waiting for frontend...")
time.sleep(8)

webbrowser.open("http://localhost:5173")

print("Done.")