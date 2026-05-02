from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "xva-platform-export.zip"

EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    "dist",
}

EXCLUDE_FILES = {
    ".env",
    "xva-platform-export.zip",
}

with ZipFile(OUTPUT, "w", ZIP_DEFLATED) as zipf:
    for path in ROOT.rglob("*"):
        if path.is_dir():
            continue

        relative = path.relative_to(ROOT)

        if any(part in EXCLUDE_DIRS for part in relative.parts):
            continue

        if path.name in EXCLUDE_FILES:
            continue

        zipf.write(path, relative)

print(f"Export created: {OUTPUT}")