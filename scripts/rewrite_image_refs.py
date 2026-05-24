#!/usr/bin/env python3
"""
Rewrite image references in all site/**/*.html (+ css/js) using the rename map
produced by optimize_site_images.py. Matches the path suffix so it works whether
a page uses "../images/..." or "images/...".

Run from repo root:  python3 scripts/rewrite_image_refs.py
"""
from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
MAP = ROOT / "scripts" / "image_rename_map.json"


def main() -> None:
    rename = json.loads(MAP.read_text(encoding="utf-8"))
    # Include URL-encoded variants: HTML may reference paths with %20/%5B etc.
    expanded: dict[str, str] = {}
    for old, new in rename.items():
        expanded[old] = new
        q_old, q_new = quote(old), quote(new)
        if q_old != old:
            expanded[q_old] = q_new
    # Longest paths first so we never partially match a nested path.
    pairs = sorted(expanded.items(), key=lambda kv: -len(kv[0]))

    targets = list(SITE.rglob("*.html")) + list((SITE / "css").rglob("*.css")) \
        + list((SITE / "js").rglob("*.js"))

    total_edits = 0
    touched = 0
    for f in targets:
        text = f.read_text(encoding="utf-8")
        orig = text
        n = 0
        for old, new in pairs:
            if old in text:
                c = text.count(old)
                text = text.replace(old, new)
                n += c
        if text != orig:
            f.write_text(text, encoding="utf-8")
            touched += 1
            total_edits += n
            print(f"  {f.relative_to(ROOT)}: {n} refs")
    print(f"\nUpdated {total_edits} references across {touched} files.")


if __name__ == "__main__":
    main()
