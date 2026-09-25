#!/usr/bin/env python3
"""Make small Work-grid thumbnails for every card image in data/projects.json.

The grid shows each card image in a 4:5 box with object-fit: cover (centred),
but was loading full-size files (median ~1600px wide, ~12.8 MB for the grid).
This writes three pre-cropped 4:5 versions per project:

  site/images/cards/<slug>-sm.webp    600 x 750
  site/images/cards/<slug>-lg.webp   1000 x 1250
  site/images/cards/<slug>-xl.webp   1500 x 1875

cropped from the centre exactly as the CSS would, so cards look the same, and
resampled with Lanczos so they stay crisp on retina screens (the deck shows a
card up to 400px wide). Small sources are never upscaled. build_work_index.py picks these up automatically
(srcset), and falls back to the original image when a thumbnail is missing.

Needs Pillow. Run it after adding or changing a card image, then
run build_work_index.py:

  python3 scripts/build_card_thumbs.py            # make missing/stale thumbnails
  python3 scripts/build_card_thumbs.py --force    # remake all
  python3 scripts/build_card_thumbs.py --check    # CI: every card has all three files
"""
import json, sys, urllib.parse
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "data" / "projects.json"
WORK = ROOT / "site" / "work"
CARDS = ROOT / "site" / "images" / "cards"
SIZES = (("sm", 600, 84), ("lg", 1000, 86), ("xl", 1500, 88))   # name, width, webp quality


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
        todo = [(s, o) for s, o in zip(SIZES, outs)
                if force or not o.exists() or o.stat().st_mtime < src.stat().st_mtime]
        if not todo:
            continue
        from PIL import Image, ImageOps
        im = ImageOps.exif_transpose(Image.open(src))
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
        w, h = im.size
        # largest centred 4:5 crop, same region object-fit: cover shows
        if w / h > 0.8:
            cw, ch = round(h * 0.8), h
        else:
            cw, ch = w, round(w / 0.8)
        x, y = (w - cw) // 2, (h - ch) // 2
        crop = im.crop((x, y, x + cw, y + ch))
        for (name, width, q), out in todo:
            tw = min(width, cw)
            crop.resize((tw, round(tw * 1.25)), Image.LANCZOS).save(out, "WEBP", quality=q, method=6)
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
