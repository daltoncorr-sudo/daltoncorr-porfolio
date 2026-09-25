#!/usr/bin/env python3
"""
Build site/work/index.html cards from data/projects.json.

Run:  python3 scripts/build_work_index.py
      python3 scripts/build_work_index.py --check    # exit 1 if regen would change anything

Replaces everything between <!-- BEGIN: cards --> and <!-- END: cards --> in
site/work/index.html with freshly-rendered card markup, and in each project
page the block between <!-- BEGIN: deck --> and <!-- END: deck -->: that
project's card (the top of the deck) and its Back / Previous / Next links, in
the grid's order. Edit projects.json, re-run, commit what it writes.

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

from stamp_image_sizes import image_size

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "data" / "projects.json"
INDEX = ROOT / "site" / "work" / "index.html"

BEGIN = "<!-- BEGIN: cards -->"
END = "<!-- END: cards -->"


CARDS = ROOT / "site" / "images" / "cards"
WORK = ROOT / "site" / "work"
DECK_BEGIN, DECK_END = "<!-- BEGIN: deck -->", "<!-- END: deck -->"
# Widest a card is drawn: the deck's top card (up to 23vw / 400px) on desktop,
# a third of the page on tablets, the deck (62vw) on phones.
CARD_SIZES = "(min-width: 1100px) 24vw, (min-width: 768px) 31vw, 62vw"


def card_image(p: dict, eager: bool = False, lead: bool = False) -> str:
    """Render the card-image div for one project."""
    if "card_image_html" in p:
        return p["card_image_html"]
    if "image" in p:
        load = 'loading="eager"' if eager else 'loading="lazy"'
        if lead:
            load += ' fetchpriority="high"'
        files = [CARDS / f'{p["slug"]}-{n}.webp' for n in ("sm", "lg", "xl")]
        if all(f.exists() for f in files):
            # Pre-cropped 4:5 thumbnails from build_card_thumbs.py (a small
            # source makes the bigger ones the same size: list each width once)
            widths = {}
            for f in files:
                widths.setdefault(image_size(f)[0], f)
            lg = files[1]
            lw, lh = image_size(lg)
            l = f"../images/cards/{lg.name}"
            srcset = ", ".join(f"../images/cards/{f.name} {w}w" for w, f in sorted(widths.items()))
            srcset = f' srcset="{srcset}" sizes="{CARD_SIZES}"' if len(widths) > 1 else ""
            return (
                f'<div class="card-image">'
                f'<img src="{l}"{srcset} width="{lw}" height="{lh}" alt="{p.get("alt", "")}" {load} decoding="async">'
                f"</div>"
            )
        return (
            f'<div class="card-image">'
            f'<img src="{p["image"]}" alt="{p.get("alt", "")}" {load}>'
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


def render_card(p: dict, eager: bool = False, lead: bool = False) -> str:
    tags = "".join(f"<span>{t}</span>" for t in p["tags"])
    filters = " ".join(p["filters"])
    layer = ' data-layer="0"' if lead else ""
    return (
        f'        <a href="{p["slug"]}" class="project-card" '
        f'data-sort-order="{p["sort"]}" data-year="{p["year"]}" '
        f'data-filters="{filters}"{layer}>\n'
        f"          {card_image(p, eager, lead)}\n"
        f'          <div class="card-info">\n'
        f'            <h3 class="card-title">{p["title"]}</h3>\n'
        f'            <span class="card-role">{p["role"]}</span>\n'
        f'            <div class="card-tags">{tags}</div>\n'
        f'            <span class="card-year">{p["year"]}</span>\n'
        f"          </div>\n"
        f"        </a>"
    )


def render_deck(projects: list, i: int) -> str:
    """The top of a project page's deck: its card, then Back / Previous / Next."""
    p, n = projects[i], len(projects)
    prev, nxt = projects[(i - 1) % n]["slug"], projects[(i + 1) % n]["slug"]
    return (
        f"{DECK_BEGIN}\n"
        f'        <div class="wc-deck-box"><div class="wc-deck">\n'
        f"{render_card(p, eager=True, lead=True)}\n"
        f"        </div></div>\n"
        f'        <nav class="wc-controls" aria-label="Projects">\n'
        f'          <a class="wc-back-link" href="./">Back to projects</a>\n'
        f'          <span class="wc-arrows"><a class="wc-arrow wc-prev" href="{prev}" rel="prev">Previous</a>'
        f'<a class="wc-arrow wc-next" href="{nxt}" rel="next">Next</a></span>\n'
        f"        </nav>\n"
        f"        {DECK_END}"
    )


def build_decks(projects: list, check: bool) -> int:
    stale = 0
    for i, p in enumerate(projects):
        page = WORK / f'{p["slug"]}.html'
        if not page.exists():
            continue
        txt = page.read_text()
        if DECK_BEGIN not in txt:
            print(f"no deck markers: {page.name}")
            stale += 1
            continue
        new = re.sub(rf"{re.escape(DECK_BEGIN)}.*?{re.escape(DECK_END)}",
                     lambda m: render_deck(projects, i), txt, flags=re.DOTALL)
        if new != txt:
            stale += 1
            if check:
                print(f"OUT OF SYNC: {page.name} deck differs from projects.json")
            else:
                page.write_text(new)
    if stale and not check:
        print(f"✓ Rebuilt the deck on {stale} project page(s)")
    return stale


def build(check: bool = False) -> int:
    # the grid's default order (the page's "Sort: Default"): by "sort", ties
    # keeping their order in the file
    projects = sorted(json.loads(PROJECTS.read_text()), key=lambda p: int(p.get("sort") or 0))
    stale = build_decks(projects, check)
    # The first row is on screen at load, so those images skip lazy-loading.
    cards = "\n\n".join(render_card(p, eager=i < 4) for i, p in enumerate(projects))
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
        return 1 if check and stale else 0

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
