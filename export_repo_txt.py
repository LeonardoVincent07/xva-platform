from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "xva-platform-export.txt"

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
    "xva-platform-export.txt",
}

with OUTPUT.open("w", encoding="utf-8") as out:
    for path in sorted(ROOT.rglob("*")):
        if path.is_dir():
            continue

        relative = path.relative_to(ROOT)

        if any(part in EXCLUDE_DIRS for part in relative.parts):
            continue

        if path.name in EXCLUDE_FILES:
            continue

        out.write("\n")
        out.write("=" * 100 + "\n")
        out.write(f"FILE: {relative}\n")
        out.write("=" * 100 + "\n\n")

        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            out.write("[Skipped binary or non-UTF-8 file]\n")
            continue

        out.write(content)
        out.write("\n")

print(f"Export created: {OUTPUT}")