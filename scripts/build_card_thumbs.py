#!/usr/bin/env python3
"""Make small Work-grid thumbnails for every card image in data/projects.json.

The grid shows each card image in a 4:5 box with object-fit: cover (centred),
but was loading full-size files (median ~1600px wide, ~12.8 MB for the grid).
This writes two pre-cropped 4:5 versions per project:

  site/images/cards/<slug>-sm.webp   480 x 600
  site/images/cards/<slug>-lg.webp   800 x 1000

cropped from the centre exactly as the CSS would, so cards look the same. Small
sources are never upscaled. build_work_index.py picks these up automatically
(srcset), and falls back to the original image when a thumbnail is missing.

Needs cwebp (libwebp). Run it after adding or changing a card image, then
run build_work_index.py:

  python3 scripts/build_card_thumbs.py            # make missing/stale thumbnails
  python3 scripts/build_card_thumbs.py --force    # remake all
  python3 scripts/build_card_thumbs.py --check    # CI: every card has both files
"""
import json, shutil, subprocess, sys, urllib.parse
from pathlib import Path

from stamp_image_sizes import image_size

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "data" / "projects.json"
WORK = ROOT / "site" / "work"
CARDS = ROOT / "site" / "images" / "cards"
SIZES = (("sm", 480, 75), ("lg", 800, 78))   # name, width, cwebp quality


def cwebp():
    exe = shutil.which("cwebp") or str(Path.home() / ".local/bin/cwebp")
    if not Path(exe).exists():
        sys.exit("cwebp not found (install libwebp)")
    return exe


def main():
    check, force = "--check" in sys.argv, "--force" in sys.argv
    projects = [p for p in json.loads(PROJECTS.read_text()) if p.get("image")]
    missing, made = [], 0
    CARDS.mkdir(parents=True, exist_ok=True)
    for p in projects:
        src = (WORK / urllib.parse.unquote(p["image"])).resolve()
        outs = [CARDS / f'{p["slug"]}-{name}.webp' for name, _, _ in SIZES]
        if check:
            missing += [o.name for o in outs if not o.exists()]
            continue
        w, h = image_size(src)
        # largest centred 4:5 crop, same region object-fit: cover shows
        if w / h > 0.8:
            cw, ch = round(h * 0.8), h
        else:
            cw, ch = w, round(w / 0.8)
        x, y = (w - cw) // 2, (h - ch) // 2
        for (name, width, q), out in zip(SIZES, outs):
            if not force and out.exists() and out.stat().st_mtime >= src.stat().st_mtime:
                continue
            tw = min(width, cw)
            subprocess.run([cwebp(), "-quiet", "-q", str(q), "-metadata", "none",
                            "-crop", str(x), str(y), str(cw), str(ch),
                            "-resize", str(tw), str(round(tw * 1.25)), str(src), "-o", str(out)],
                           check=True)
            made += 1
    if check:
        if missing:
            print(f"{len(missing)} card thumbnail(s) missing, e.g. {missing[:5]}")
            print("Run: python3 scripts/build_card_thumbs.py && python3 scripts/build_work_index.py")
            sys.exit(1)
        print("Every card image has its thumbnails.")
    else:
        print(f"Wrote {made} thumbnail(s) for {len(projects)} card image(s).")


if __name__ == "__main__":
    main()
