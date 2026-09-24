#!/usr/bin/env python3
"""Per-project link-preview images (og:image / twitter:image).

Sharing a project link (iMessage, Instagram DMs, LinkedIn, Slack, X) showed
the same site-wide og-image.png for every page. This makes one 1200x630
preview per project from its Work-grid artwork: the whole piece, never
cropped, centred on the site's #F5F5F5 ground,

    site/images/og/<slug>.jpg   (.png when the artwork has transparency)

and points that page's og:image and twitter:image at it. Projects without a
card image keep the site-wide preview.

Uses macOS `sips`, so run it locally after adding or changing a card image:

  python3 scripts/build_og_images.py          # make previews + update pages
  python3 scripts/build_og_images.py --check  # CI: every project page points at its preview
"""
import hashlib, json, re, subprocess, sys, tempfile, urllib.parse
from pathlib import Path

from stamp_image_sizes import image_size

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
PROJECTS = ROOT / "data" / "projects.json"
OG = SITE / "images" / "og"
BASE = "https://daltoncorr.com"
W, H = 1200, 630
BOX_W, BOX_H = 1080, 540   # the art sits inside this, leaving a quiet margin


def has_alpha(path):
    b = path.read_bytes()[:40]
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP":
        if b[12:16] == b"VP8X":
            return bool(b[20] & 0x10)
        if b[12:16] == b"VP8L":
            return bool((int.from_bytes(b[21:25], "little") >> 28) & 1)
        return False
    if b[:8] == b"\x89PNG\r\n\x1a\n":
        return b[25] in (4, 6)
    return False


def make(src, out):
    w, h = image_size(src)
    k = min(BOX_W / w, BOX_H / h)
    tw, th = max(1, round(w * k)), max(1, round(h * k))
    fmt = ["-s", "format", "png"] if out.suffix == ".png" else ["-s", "format", "jpeg", "-s", "formatOptions", "86"]
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t) / "art.png"
        subprocess.run(["sips", "-s", "format", "png", "--resampleHeightWidth", str(th), str(tw),
                        str(src), "--out", str(tmp)], check=True, capture_output=True)
        subprocess.run(["sips", *fmt, "--padToHeightWidth", str(H), str(W), "--padColor", "F5F5F5",
                        str(tmp), "--out", str(out)], check=True, capture_output=True)


def main():
    check = "--check" in sys.argv
    OG.mkdir(parents=True, exist_ok=True)
    problems, made, pages = [], 0, 0
    for p in json.loads(PROJECTS.read_text()):
        if not p.get("image"):
            continue
        slug = p["slug"]
        page = SITE / "work" / f"{slug}.html"
        src = (page.parent / urllib.parse.unquote(p["image"])).resolve()
        if not page.exists() or not src.is_file():
            continue
        out = OG / f"{slug}{'.png' if has_alpha(src) else '.jpg'}"
        if not out.exists() or out.stat().st_mtime < src.stat().st_mtime:
            if check:
                problems.append(f"missing preview: {out.relative_to(SITE)}")
                continue
            make(src, out)
            made += 1
        url = f"{BASE}/images/og/{out.name}?v={hashlib.sha256(out.read_bytes()).hexdigest()[:8]}"
        txt = page.read_text(encoding="utf-8")
        new = re.sub(r'(<meta property="og:image" content=")[^"]*(")', rf"\g<1>{url}\2", txt)
        new = re.sub(r'(<meta name="twitter:image" content=")[^"]*(")', rf"\g<1>{url}\2", new)
        new = re.sub(r'(<meta property="og:image:width" content=")[^"]*(")', rf"\g<1>{W}\2", new)
        new = re.sub(r'(<meta property="og:image:height" content=")[^"]*(")', rf"\g<1>{H}\2", new)
        if 'property="og:image"' not in txt:
            problems.append(f"no og:image tag to update: {page.name}")
        elif new != txt:
            if check:
                problems.append(f"not pointing at its preview: {page.name}")
            else:
                page.write_text(new, encoding="utf-8")
                pages += 1
    if check:
        if problems:
            print("\n".join(problems[:10]))
            print("Run: python3 scripts/build_og_images.py")
            sys.exit(1)
        print("Every project page has its own link preview.")
    else:
        print(f"Made {made} preview(s); updated {pages} page(s).")
        if problems:
            print("\n".join(problems))


if __name__ == "__main__":
    main()
