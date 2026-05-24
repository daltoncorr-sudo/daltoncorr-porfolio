#!/usr/bin/env python3
"""
Resize images to max 2400px width, strip EXIF, WebP for large PNGs (parallel workers).
Writes tiny JPEG blur files under assets/blur/ and blur_map.json with per-src URLs.
Run: pip install -r scripts/requirements.txt && python3 scripts/optimize_images.py
"""
from __future__ import annotations

import hashlib
import io
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets" / "images"
BLUR_DIR = ROOT / "assets" / "blur"
MAX_W = 2400
BLUR_W = 20
PNG_WEBP_THRESHOLD = 500 * 1024
WORKERS = 6


def _blur_rel_path(rel: str) -> str:
    h = hashlib.sha256(rel.encode()).hexdigest()[:24]
    return f"assets/blur/{h}.jpg"


def _write_blur_jpeg(img: Image.Image, dest: Path) -> None:
    w, h = img.size
    if w < 1 or h < 1:
        return
    nh = max(1, int(h * (BLUR_W / w)))
    thumb = img.convert("RGB").resize((BLUR_W, nh), Image.Resampling.LANCZOS)
    thumb = thumb.filter(ImageFilter.GaussianBlur(radius=1.2))
    dest.parent.mkdir(parents=True, exist_ok=True)
    thumb.save(dest, format="JPEG", quality=40, optimize=True)


def process_file(path: Path) -> tuple[str, int, str, tuple[str, str] | None]:
    rel = str(path.relative_to(ROOT))
    webp_pair: tuple[str, str] | None = None
    try:
        img = Image.open(path)
        img = ImageOps.exif_transpose(img)
    except Exception:
        return rel, 0, "", None

    w, h = img.size
    if w > MAX_W:
        nh = max(1, int(h * (MAX_W / w)))
        img = img.resize((MAX_W, nh), Image.Resampling.LANCZOS)

    blur_key = _blur_rel_path(rel)
    blur_abs = ROOT / blur_key
    _write_blur_jpeg(img, blur_abs)

    ext = path.suffix.lower()
    buf = io.BytesIO()
    if ext in (".jpg", ".jpeg"):
        img.convert("RGB").save(buf, format="JPEG", quality=85, optimize=True)
    elif ext == ".png":
        img.save(buf, format="PNG", optimize=True)
    elif ext == ".webp":
        img.save(buf, format="WEBP", quality=85, method=4)
    else:
        return rel, 0, blur_key, None

    path.write_bytes(buf.getvalue())
    size = path.stat().st_size

    if ext == ".png" and size >= PNG_WEBP_THRESHOLD:
        webp_path = path.with_suffix(".webp")
        img.save(webp_path, format="WEBP", quality=82, method=4)
        webp_pair = (rel, str(webp_path.relative_to(ROOT)))

    return rel, size, blur_key, webp_pair


def main() -> None:
    paths: list[Path] = []
    for dirpath, _, files in os.walk(ASSETS):
        for fn in files:
            if fn.startswith("."):
                continue
            p = Path(dirpath) / fn
            if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"):
                paths.append(p)

    largest: list[tuple[str, int]] = []
    blur_by_src: dict[str, str] = {}
    webp_by_src: dict[str, str] = {}
    total = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {ex.submit(process_file, p): p for p in paths}
        for fut in as_completed(futs):
            rel, sz, blur_key, wp = fut.result()
            total += sz
            largest.append((rel, sz))
            if blur_key:
                blur_by_src[rel] = blur_key
            if wp:
                webp_by_src[wp[0]] = wp[1]

    largest.sort(key=lambda x: -x[1])
    report = {
        "blurBySrc": blur_by_src,
        "webpBySrc": webp_by_src,
        "total_bytes": total,
        "largest_files": largest[:25],
    }
    (ROOT / "blur_map.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Processed {len(paths)} files. Total ~{total / (1024*1024):.2f} MB")
    print(f"  blur placeholders: {len(blur_by_src)}, webp hints: {len(webp_by_src)}")
    for p, s in largest[:8]:
        print(f"  {p}  {s/1024:.1f} KB")
    if total > 25 * 1024 * 1024:
        print("Note: still over 25MB — consider fewer gallery images or lower JPEG quality.")


if __name__ == "__main__":
    main()
