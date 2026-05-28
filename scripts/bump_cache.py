#!/usr/bin/env python3
"""
Replace manual ?v=NN cache-busting params with content-hashes.

Computes a short hash of site/css/style.css and site/js/main.js, then rewrites
every ?v=... reference in every HTML file to match. Idempotent — running on an
already-current tree changes nothing.

Run locally:  python3 scripts/bump_cache.py
In CI:        called as a step before upload-pages-artifact (see deploy.yml)
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"


def short_hash(path: Path, length: int = 8) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:length]


def main() -> None:
    css_hash = short_hash(SITE / "css" / "style.css")
    js_hash = short_hash(SITE / "js" / "main.js")
    print(f"CSS hash: {css_hash}   JS hash: {js_hash}")

    css_re = re.compile(r"(style\.css\?v=)[A-Za-z0-9]+")
    js_re = re.compile(r"(main\.js\?v=)[A-Za-z0-9]+")
    updated = 0

    for p in SITE.rglob("*.html"):
        txt = p.read_text()
        orig = txt
        # Use lambdas so the hash (which starts with digits) doesn't get
        # parsed as a backreference like \18.
        txt = css_re.sub(lambda m: m.group(1) + css_hash, txt)
        txt = js_re.sub(lambda m: m.group(1) + js_hash, txt)
        if txt != orig:
            p.write_text(txt)
            updated += 1

    print(f"Updated cache refs in {updated} pages")


if __name__ == "__main__":
    main()
