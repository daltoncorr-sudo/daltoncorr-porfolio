#!/usr/bin/env python3
"""
Build site/work/index.html cards from data/projects.json.

Run:  python3 scripts/build_work_index.py
      python3 scripts/build_work_index.py --check    # exit 1 if regen would change anything

Replaces everything between <!-- BEGIN: cards --> and <!-- END: cards --> in
site/work/index.html with freshly-rendered card markup. Edit projects.json,
re-run, commit the regenerated index.

To add / reorder / re-tag a project: open data/projects.json, change the entry,
run this script. The card rendering follows three variants:

  Standard card (most common):
    { ..., "image": "../images/...", "alt": "..." }

  Placeholder card (TBA / PRIVATE):
    { ..., "placeholder": "TBA" }      ← visible label
    { ..., "placeholder": "" }          ← blank dark tile

  Custom card (rare — full HTML for the card-image div):
    { ..., "card_image_html": "<div class=\\"card-image\\" style=\\"...\\">...</div>" }
"""
from __future__ import annotations

import json
import re
import sys
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "data" / "projects.json"
INDEX = ROOT / "site" / "work" / "index.html"

BEGIN = "<!-- BEGIN: cards -->"
END = "<!-- END: cards -->"


def card_image(p: dict) -> str:
    """Render the card-image div for one project."""
    if "card_image_html" in p:
        return p["card_image_html"]
    if "image" in p:
        return (
            f'<div class="card-image">'
            f'<img src="{p["image"]}" alt="{p.get("alt", "")}" loading="lazy">'
            f"</div>"
        )
    # Placeholder
    label = p.get("placeholder", "")
    if label:
        return (
            f'<div class="card-image card-image--placeholder">'
            f'<span class="card-image--placeholder-label">{label}</span>'
            f"</div>"
        )
    return '<div class="card-image card-image--placeholder"></div>'


def render_card(p: dict) -> str:
    tags = "".join(f"<span>{t}</span>" for t in p["tags"])
    filters = " ".join(p["filters"])
    return (
        f'        <a href="{p["slug"]}.html" class="project-card" '
        f'data-sort-order="{p["sort"]}" data-year="{p["year"]}" '
        f'data-filters="{filters}">\n'
        f"          {card_image(p)}\n"
        f'          <div class="card-info">\n'
        f'            <h3 class="card-title">{p["title"]}</h3>\n'
        f'            <span class="card-role">{p["role"]}</span>\n'
        f'            <div class="card-tags">{tags}</div>\n'
        f'            <span class="card-year">{p["year"]}</span>\n'
        f"          </div>\n"
        f"        </a>"
    )


def build(check: bool = False) -> int:
    projects = json.loads(PROJECTS.read_text())
    cards = "\n\n".join(render_card(p) for p in projects)
    block = f"{BEGIN}\n{cards}\n        {END}"

    idx = INDEX.read_text()
    if BEGIN not in idx:
        # First run — add markers around the existing cards block. Find the
        # span by anchoring on the first project-card and the closing </div>
        # of work-grid.
        m = re.search(
            r'(<div class="work-grid">\s*\n)(.*?)(\s*</div>\s*\n\s*</section>)',
            idx,
            re.DOTALL,
        )
        if not m:
            sys.exit("Could not find <div class='work-grid'>...</section> in index.html")
        new_idx = idx[: m.start(2)] + f"\n        {block}\n      " + idx[m.end(2) :]
    else:
        new_idx = re.sub(
            rf"{re.escape(BEGIN)}.*?{re.escape(END)}",
            block,
            idx,
            flags=re.DOTALL,
        )

    if new_idx == idx:
        return 0

    if check:
        print("OUT OF SYNC: work/index.html cards differ from projects.json")
        return 1

    INDEX.write_text(new_idx)
    print(f"✓ Rebuilt {len(projects)} cards into work/index.html")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="exit 1 if work/index.html is out of sync with projects.json")
    args = ap.parse_args()
    sys.exit(build(check=args.check))
