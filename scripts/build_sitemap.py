#!/usr/bin/env python3
"""
Generate site/sitemap.xml from every .html file in site/.

Skipped: 404.html (handled separately by GH Pages), files in /blog (per memory:
  blog is currently hidden behind robots disallow), press.html (redirect stub),
  and /experiments (unlisted client demos — never advertised in the sitemap).

Run:  python3 scripts/build_sitemap.py
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
BASE = "https://daltoncorr.com"

SKIP = {"site/404.html", "site/press.html"}
SKIP_DIRS = {"site/blog", "site/experiments"}


def url_for(p: Path) -> str:
    rel = p.relative_to(SITE).as_posix()
    if rel == "index.html":
        return BASE + "/"
    if rel.endswith("/index.html"):
        return f"{BASE}/{rel[:-len('index.html')]}"
    return f"{BASE}/{rel}"


def main() -> None:
    pages: list[tuple[str, str]] = []
    for p in sorted(SITE.rglob("*.html")):
        rel = p.relative_to(ROOT).as_posix()
        if rel in SKIP:
            continue
        if any(rel.startswith(d + "/") for d in SKIP_DIRS):
            continue
        loc = url_for(p)
        lastmod = datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc).strftime("%Y-%m-%d")
        pages.append((loc, lastmod))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lastmod in pages:
        lines.append(f"  <url>")
        lines.append(f"    <loc>{escape(loc)}</loc>")
        lines.append(f"    <lastmod>{lastmod}</lastmod>")
        lines.append(f"  </url>")
    lines.append("</urlset>")

    out = SITE / "sitemap.xml"
    out.write_text("\n".join(lines) + "\n")
    print(f"✓ Wrote {out.relative_to(ROOT)} with {len(pages)} URLs")


if __name__ == "__main__":
    main()
