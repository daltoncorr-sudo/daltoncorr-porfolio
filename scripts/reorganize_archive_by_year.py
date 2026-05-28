#!/usr/bin/env python3
"""
Reorganize the hi-res archive into a clean, year-first structure:

  portfolio-originals-backup-20260524/
    2026/  2025/  2024/ ...        <- year folders, each holding that year's projects
      <project>/                   <- full-res images for that project
    _homepage/                     <- homepage images (no project year)
    _raw-source-files/             <- the old raw folders, moved aside (safe to delete)
    README.txt

Nothing is deleted; redundant raw folders are moved into _raw-source-files/.
"""
from __future__ import annotations

import re
import shutil
from pathlib import Path

BK = Path.home() / "Desktop" / "portfolio-originals-backup-20260524"
BP = BK / "by-project"
WORK_INDEX = Path("/Users/dalton/Documents/GitHub/daltoncorr-portfolio/site/work/index.html")

html = WORK_INDEX.read_text(encoding="utf-8")
pairs = re.findall(r'href="([a-z0-9\-]+)\.html"[^>]*?data-year="(\d{4})"', html)
pairs += re.findall(r'data-year="(\d{4})"[^>]*?href="([a-z0-9\-]+)\.html"', html)
year: dict[str, str] = {}
for a, b in pairs:
    if a.isdigit():
        year[b] = a
    else:
        year[a] = b

moved = 0
unknown = []
for proj in sorted(BP.iterdir()):
    if not proj.is_dir():
        continue
    name = proj.name
    if name == "_home":
        dest = BK / "_homepage"
    else:
        y = year.get(name)
        if not y:
            unknown.append(name)
            dest = BK / "_unknown-year" / name
        else:
            dest = BK / y / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(proj), str(dest))
    moved += 1

# Move redundant raw folders aside (not deleted)
RAW = BK / "_raw-source-files"
RAW.mkdir(exist_ok=True)
for f in ["site-images", "squarespace-originals"]:
    src = BK / f
    if src.exists():
        shutil.move(str(src), str(RAW / f))

if BP.exists() and not any(BP.iterdir()):
    BP.rmdir()

print(f"Moved {moved} project folders into year folders. Unknown-year: {unknown or 'none'}")
print("\nYear folders:")
for y in sorted(d.name for d in BK.iterdir() if d.is_dir() and d.name[0].isdigit()):
    n = len(list((BK / y).iterdir()))
    print(f"  {y}/  ({n} projects)")
