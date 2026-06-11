#!/usr/bin/env python3
"""
Add/refresh canonical + Open Graph + description meta in every page's <head>.

Idempotent: only inserts tags that are missing, so re-running is safe and a
second run reports zero changes. Per-page values are derived deterministically:
  - canonical / og:url  → site URL computed from the file path (matches sitemap)
  - description         → existing <meta name="description">, else the first
                          prose <p> (.project-body / .about-bio / .blog-article-body),
                          else a per-page default
  - og:title            → the page <title>
  - og:description      → the description
  - og:type             → "website"

Run:  python3 scripts/build_head_meta.py
      python3 scripts/build_head_meta.py --check   # exit 1 if anything is missing (CI)
"""
from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
BASE = "https://daltoncorr.com"

# 404 is noindex (no canonical wanted); press is a redirect stub.
SKIP = {"site/404.html", "site/press.html"}
# Unlisted client demos — self-contained pages, noindex, no canonical/OG wanted.
SKIP_DIRS = {"site/experiments"}

DEFAULT_DESC = (
    "Dalton Corr is a multidisciplinary creative working across film, music, "
    "and visual arts, based between New York and Los Angeles."
)
PAGE_DESC = {
    "index.html": DEFAULT_DESC,
    "work/index.html": (
        "Selected work by Dalton Corr across art direction, illustration, "
        "posters, branding, and music."
    ),
    "blog/index.html": (
        "Writings by Dalton Corr on color, art, design, and creative practice."
    ),
}

PROSE_RE = [
    re.compile(r'<div class="project-body">\s*<p>(.*?)</p>', re.DOTALL),
    re.compile(r'<div class="about-bio">\s*<p>(.*?)</p>', re.DOTALL),
    re.compile(r'<div class="blog-article-body">.*?<p>(.*?)</p>', re.DOTALL),
]
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.DOTALL)
DESC_RE = re.compile(r'<meta name="description" content="(.*?)">')
TAG_RE = re.compile(r"<[^>]+>")


def url_for(rel: str) -> str:
    if rel == "index.html":
        return BASE + "/"
    if rel.endswith("/index.html"):
        return f"{BASE}/{rel[:-len('index.html')]}"
    return f"{BASE}/{rel}"


def clean(text: str, limit: int = 160) -> str:
    text = TAG_RE.sub("", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > limit:
        cut = text[:limit].rsplit(" ", 1)[0].rstrip(",.;:—- ")
        text = cut + "…"
    return text


def derive_desc(rel: str, txt: str) -> str | None:
    m = DESC_RE.search(txt)
    if m:
        return html.unescape(m.group(1))
    if rel in PAGE_DESC:
        return PAGE_DESC[rel]
    for rx in PROSE_RE:
        m = rx.search(txt)
        if m:
            return clean(m.group(1))
    return None


def build_block(rel: str, txt: str) -> list[str]:
    """Return the meta lines that are MISSING from this page's head."""
    canonical = url_for(rel)
    lines: list[str] = []

    if 'rel="canonical"' not in txt:
        lines.append(f'  <link rel="canonical" href="{html.escape(canonical)}">')
    if "og:url" not in txt:
        lines.append(f'  <meta property="og:url" content="{html.escape(canonical)}">')

    tm = TITLE_RE.search(txt)
    title = clean(tm.group(1), 300) if tm else "Dalton Corr"
    if "og:title" not in txt:
        lines.append(f'  <meta property="og:title" content="{html.escape(title)}">')

    desc = derive_desc(rel, txt)
    if desc:
        if 'name="description"' not in txt:
            lines.append(f'  <meta name="description" content="{html.escape(desc)}">')
        if "og:description" not in txt:
            lines.append(f'  <meta property="og:description" content="{html.escape(desc)}">')

    if "og:type" not in txt:
        lines.append('  <meta property="og:type" content="website">')

    return lines


def run(check: bool = False) -> int:
    changes = 0
    for page in sorted(SITE.rglob("*.html")):
        rel = page.relative_to(SITE).as_posix()
        if f"site/{rel}" in SKIP:
            continue
        if any(f"site/{rel}".startswith(d + "/") for d in SKIP_DIRS):
            continue
        txt = page.read_text()
        block = build_block(rel, txt)
        if not block:
            continue
        changes += 1
        if check:
            print(f"  MISSING META: {rel}")
            continue
        new = "\n".join(block) + "\n</head>"
        txt = txt.replace("</head>", new, 1)
        page.write_text(txt)
        print(f"  ✓ {rel} (+{len(block)})")
    return changes


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="exit 1 if any page is missing meta (CI)")
    args = ap.parse_args()
    n = run(check=args.check)
    if args.check and n > 0:
        print(f"\n{n} page(s) missing head meta.")
        sys.exit(1)
    print(f"\nDone — {n} page(s) {'missing' if args.check else 'updated'}.")
