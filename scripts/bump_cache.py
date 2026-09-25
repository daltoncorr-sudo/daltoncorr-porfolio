#!/usr/bin/env python3
"""
Replace manual ?v=NN cache-busting params with content-hashes.

Computes a short hash of each site/css/*.css and site/js/*.js, then rewrites
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
    # style.css plus every script in site/js (main.js, carousel.js,
    # catalog-viewer.js, …), each stamped with its own content hash.
    assets = sorted((SITE / "css").glob("*.css")) + sorted((SITE / "js").glob("*.js"))
    stamps = [(re.compile(r"(\b" + re.escape(a.name) + r"\?v=)[A-Za-z0-9]+"), short_hash(a))
              for a in assets]
    print("   ".join(f"{a.name}: {h}" for a, (_, h) in zip(assets, stamps)))
    updated = 0

    for p in SITE.rglob("*.html"):
        txt = p.read_text()
        orig = txt
        # Use lambdas so the hash (which starts with digits) doesn't get
        # parsed as a backreference like \18.
        for pattern, h in stamps:
            txt = pattern.sub(lambda m, h=h: m.group(1) + h, txt)
        if txt != orig:
            p.write_text(txt)
            updated += 1

    print(f"Updated cache refs in {updated} pages")


if __name__ == "__main__":
    main()
