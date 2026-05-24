#!/usr/bin/env python3
"""
Make the site independent of Squarespace's CDN:
  1. find every images.squarespace-cdn.com URL in site/**/*.html (skips blog)
  2. download each (bounded to 2500w), convert to WebP under site/images/cdn/<page>/
  3. rewrite each page's <img>/srcset references to the local relative path

og:image / meta content URLs are left as-is (social cards need absolute URLs; will be
re-pointed to the real domain at deploy time). Run from repo root.
"""
from __future__ import annotations

import hashlib
import os
import re
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
CDN_DIR = SITE / "images" / "cdn"
MAX_W = 2400
Q = 82
WORKERS = 8
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 portfolio-migrate"
URL_RE = re.compile(r'https://images\.squarespace-cdn\.com/[^"\'\s)]+')

# Only rewrite URLs that appear in a rendering context (src / srcset), not meta.
SRC_CTX = re.compile(r'(?:src|srcset|data-src)\s*=\s*["\'][^"\']*images\.squarespace-cdn\.com')


def sanitize(name: str) -> str:
    name = urllib.parse.unquote(name)
    name = name.replace("+", "-").replace(" ", "-")
    return re.sub(r"[^A-Za-z0-9._-]", "", name)


def local_name(url: str) -> str:
    base = url.split("?", 1)[0]
    stem = sanitize(Path(base).stem) or "img"
    h = hashlib.sha1(base.encode()).hexdigest()[:6]
    return f"{stem}-{h}.webp"


def page_slug(html: Path) -> str:
    return html.stem if html.parent.name in ("site", "work") else html.parent.name


def collect() -> tuple[dict[str, Path], dict[str, list[Path]]]:
    """url -> local webp Path (rel to repo), and html -> list of urls to rewrite."""
    url_to_local: dict[str, Path] = {}
    page_urls: dict[str, list[Path]] = {}
    htmls = [p for p in SITE.rglob("*.html") if "blog" not in p.parts]
    for html in htmls:
        text = html.read_text(encoding="utf-8")
        # only URLs in src/srcset contexts
        urls = []
        for m in URL_RE.finditer(text):
            start = m.start()
            line_start = text.rfind("<", 0, start)
            tag = text[line_start:start]
            if "content=" in tag and "src" not in tag:  # meta og:image -> skip
                continue
            urls.append(m.group(0))
        urls = list(dict.fromkeys(urls))
        if not urls:
            continue
        page_urls[str(html)] = urls
        slug = page_slug(html)
        for u in urls:
            if u not in url_to_local:
                url_to_local[u] = CDN_DIR / slug / local_name(u)
    return url_to_local, page_urls


def fetch_and_convert(url: str, dest: Path) -> tuple[str, bool, str]:
    if dest.exists():
        return url, True, "cached"
    dest.parent.mkdir(parents=True, exist_ok=True)
    base = url.split("?", 1)[0]
    fetch_url = base + "?format=2500w"
    try:
        req = urllib.request.Request(fetch_url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        tmp = dest.with_suffix(".orig")
        tmp.write_bytes(data)
        img = Image.open(tmp)
        img = ImageOps.exif_transpose(img)
        w, h = img.size
        if w > MAX_W:
            img = img.resize((MAX_W, max(1, round(h * MAX_W / w))), Image.Resampling.LANCZOS)
        if img.mode in ("RGBA", "LA", "P"):
            img.convert("RGBA").save(dest, "WEBP", quality=Q, method=4)
        else:
            img.convert("RGB").save(dest, "WEBP", quality=Q, method=4)
        tmp.unlink()
        return url, True, f"{dest.stat().st_size//1024}KB"
    except Exception as e:  # noqa: BLE001
        return url, False, str(e)[:80]


def main() -> None:
    url_to_local, page_urls = collect()
    print(f"{len(url_to_local)} unique CDN images across {len(page_urls)} pages")

    ok, fail = {}, {}
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {ex.submit(fetch_and_convert, u, p): u for u, p in url_to_local.items()}
        for fut in as_completed(futs):
            u, good, msg = fut.result()
            (ok if good else fail)[u] = msg
    print(f"downloaded {len(ok)}, failed {len(fail)}")
    for u, m in list(fail.items())[:20]:
        print(f"  FAIL {u}\n       {m}")

    # rewrite refs (only successfully downloaded ones)
    edits = 0
    for html_str, urls in page_urls.items():
        html = Path(html_str)
        text = html.read_text(encoding="utf-8")
        for u in urls:
            if u not in ok:
                continue
            local = url_to_local[u]
            rel = os.path.relpath(local, html.parent)
            if u in text:
                text = text.replace(u, rel)
                edits += 1
        html.write_text(text, encoding="utf-8")
    print(f"rewrote {edits} references")
    if fail:
        print(f"\n{len(fail)} URLs failed — their pages still reference the CDN for those.")


if __name__ == "__main__":
    main()
