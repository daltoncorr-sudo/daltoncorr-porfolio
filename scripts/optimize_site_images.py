#!/usr/bin/env python3
"""
Optimize every raster image under site/images/ for the web:
  - resize so max width <= MAX_W
  - convert PNG/JPG/JPEG -> WebP (quality Q, alpha preserved)
  - convert GIF -> animated WebP via gif2webp (falls back to Pillow for static)
  - leave existing .webp untouched
Originals are deleted after successful conversion (back them up first!).
Writes scripts/image_rename_map.json: { "<old rel-to-site>": "<new rel-to-site>" }.

Run from repo root:  python3 scripts/optimize_site_images.py
"""
from __future__ import annotations

import json
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageOps, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
IMG_ROOT = SITE / "images"
MAX_W = 2400
Q = 82
WORKERS = 6
RASTER = {".png", ".jpg", ".jpeg", ".gif"}


def _resize(img: Image.Image) -> Image.Image:
    w, h = img.size
    if w > MAX_W:
        nh = max(1, round(h * (MAX_W / w)))
        img = img.resize((MAX_W, nh), Image.Resampling.LANCZOS)
    return img


def _is_animated_gif(path: Path) -> bool:
    try:
        with Image.open(path) as im:
            return getattr(im, "is_animated", False)
    except Exception:
        return False


def process(path: Path) -> tuple[str, str, int, int] | None:
    """Returns (old_rel, new_rel, old_bytes, new_bytes) or None on failure/skip."""
    ext = path.suffix.lower()
    if ext == ".webp" or ext not in RASTER:
        return None
    old_bytes = path.stat().st_size
    out = path.with_suffix(".webp")
    try:
        if ext == ".gif" and _is_animated_gif(path):
            # Preserve animation; gif2webp keeps frames + timing.
            subprocess.run(
                ["gif2webp", "-q", str(Q), "-m", "4", str(path), "-o", str(out)],
                check=True, capture_output=True,
            )
        else:
            img = Image.open(path)
            img = ImageOps.exif_transpose(img)
            img = _resize(img)
            if img.mode in ("RGBA", "LA", "P"):
                img = img.convert("RGBA")
                img.save(out, format="WEBP", quality=Q, method=4)
            else:
                img.convert("RGB").save(out, format="WEBP", quality=Q, method=4)
    except Exception as e:  # noqa: BLE001
        print(f"  FAIL {path.relative_to(SITE)}: {e}")
        if out.exists():
            out.unlink()
        return None

    new_bytes = out.stat().st_size
    if path != out:
        path.unlink()  # remove original; .webp replaces it
    return (
        str(path.relative_to(SITE)),
        str(out.relative_to(SITE)),
        old_bytes,
        new_bytes,
    )


def main() -> None:
    paths = [p for p in IMG_ROOT.rglob("*")
             if p.is_file() and not p.name.startswith(".") and p.suffix.lower() in RASTER]
    print(f"Found {len(paths)} raster images to optimize under site/images/")

    rename_map: dict[str, str] = {}
    old_total = new_total = 0
    biggest: list[tuple[str, int]] = []

    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {ex.submit(process, p): p for p in paths}
        for fut in as_completed(futs):
            r = fut.result()
            if not r:
                continue
            old_rel, new_rel, ob, nb = r
            rename_map[old_rel] = new_rel
            old_total += ob
            new_total += nb
            biggest.append((new_rel, nb))

    (ROOT / "scripts" / "image_rename_map.json").write_text(
        json.dumps(rename_map, indent=2), encoding="utf-8"
    )
    biggest.sort(key=lambda x: -x[1])
    mb = 1024 * 1024
    print(f"\nConverted {len(rename_map)} files")
    print(f"  before: {old_total/mb:8.1f} MB")
    print(f"  after:  {new_total/mb:8.1f} MB")
    if old_total:
        print(f"  saved:  {(old_total-new_total)/mb:8.1f} MB ({100*(1-new_total/old_total):.1f}%)")
    print("  largest remaining:")
    for rel, b in biggest[:10]:
        print(f"    {b/1024:8.1f} KB  {rel}")


if __name__ == "__main__":
    main()
