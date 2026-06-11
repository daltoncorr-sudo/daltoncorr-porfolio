#!/usr/bin/env python3
"""
Sync shared HTML includes across all pages from templates in scripts/templates/.

Run:  python3 scripts/sync_includes.py
      python3 scripts/sync_includes.py --dry-run     # preview only
      python3 scripts/sync_includes.py --check       # exit 1 if anything out of sync (CI use)

The script keeps the site as fully-static HTML — no build step at deploy time, no
runtime JS injection. Edit the template, re-run this, commit the regenerated pages.

It works by locating the existing <nav class="nav">...</nav> block in each page
and the <div class="work-toolbar">...</div> block on project pages. Per-page
context (relative paths, active link) is computed from the file's location.

Excluded from project-toolbar sync:
  - index.html (home — has its own homepage filter bar)
  - work/index.html (has the rich filter bar w/ submenus + sort toggle)
  - blog/* (uses the same nav but no work-toolbar)
  - 404.html (custom layout)
"""
from __future__ import annotations

import re
import sys
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
TEMPLATES = ROOT / "scripts" / "templates"

NAV_TPL = (TEMPLATES / "nav.html").read_text()
TOOLBAR_TPL = (TEMPLATES / "project-toolbar.html").read_text()

NAV_RE = re.compile(r"  <nav class=\"nav\">.*?</nav>", re.DOTALL)
# Match work-toolbar all the way through BOTH its inner and outer closing divs
TOOLBAR_RE = re.compile(r"  <div class=\"work-toolbar\">.*?</div>\s*</div>", re.DOTALL)

# Pages that have a custom nav/toolbar — leave them alone.
NAV_SKIP = {"site/404.html"}
# Unlisted client demos — standalone pages with no site nav at all.
SKIP_DIRS = {"site/experiments"}
TOOLBAR_SKIP = {"site/index.html", "site/work/index.html", "site/404.html"}


def relpath(from_file: Path, to_file: Path) -> str:
    """Compute web-relative href from one file to another inside site/."""
    depth = len(from_file.relative_to(SITE).parts) - 1
    prefix = "../" * depth
    return prefix + to_file.relative_to(SITE).as_posix()


def build_nav(page: Path) -> str:
    """Fill the nav template with context for this specific page."""
    home = relpath(page, SITE / "index.html")
    work = relpath(page, SITE / "work" / "index.html")
    about = relpath(page, SITE / "about.html")
    rel_to_site = page.relative_to(SITE).as_posix()
    is_home = rel_to_site == "index.html"
    is_work = rel_to_site.startswith("work/")
    is_about = rel_to_site == "about.html"
    nav = NAV_TPL.rstrip("\n")
    nav = nav.replace("{HOME}", home).replace("{WORK}", work).replace("{ABOUT}", about)
    nav = nav.replace("{HOME_ACTIVE}", " active" if is_home else "")
    nav = nav.replace("{WORK_ACTIVE}", " active" if is_work else "")
    nav = nav.replace("{ABOUT_ACTIVE}", " active" if is_about else "")
    nav = nav.replace("{HOME_ARIA}", ' aria-current="page"' if is_home else "")
    nav = nav.replace("{WORK_ARIA}", ' aria-current="page"' if is_work else "")
    nav = nav.replace("{ABOUT_ARIA}", ' aria-current="page"' if is_about else "")
    # Indent each line by 2 spaces (matches surrounding HTML)
    return "  " + nav.replace("\n", "\n  ")


def build_toolbar(page: Path) -> str:
    """Fill the project-toolbar template with context for this page."""
    work_index = relpath(page, SITE / "work" / "index.html")
    tb = TOOLBAR_TPL.rstrip("\n")
    tb = tb.replace("{WORK_INDEX}", work_index)
    # Indent each line by 2 spaces to match surrounding HTML
    return "  " + tb.replace("\n", "\n  ")


def sync(dry_run: bool = False, check: bool = False) -> int:
    """Returns count of files needing/getting updates."""
    changes = 0
    for page in sorted(SITE.rglob("*.html")):
        rel = page.relative_to(ROOT).as_posix()
        if any(rel.startswith(d + "/") for d in SKIP_DIRS):
            continue
        txt = page.read_text()
        orig = txt

        if rel not in NAV_SKIP:
            new_nav = build_nav(page)
            txt, n = NAV_RE.subn(new_nav, txt, count=1)
            if n == 0:
                print(f"  ! {rel}: no <nav class='nav'> block found — skipped")

        if rel not in TOOLBAR_SKIP and page.parent.name == "work":
            new_tb = build_toolbar(page)
            txt, n = TOOLBAR_RE.subn(new_tb, txt, count=1)
            # If no toolbar exists yet on a project page, that's fine — leave alone.

        if txt != orig:
            changes += 1
            if check:
                print(f"  OUT OF SYNC: {rel}")
            elif dry_run:
                print(f"  WOULD UPDATE: {rel}")
            else:
                page.write_text(txt)
                print(f"  ✓ {rel}")

    return changes


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="show what would change without writing")
    ap.add_argument("--check", action="store_true", help="exit 1 if anything is out of sync (CI use)")
    args = ap.parse_args()

    n = sync(dry_run=args.dry_run, check=args.check)
    if args.check and n > 0:
        print(f"\n{n} page(s) out of sync with templates.")
        sys.exit(1)
    print(f"\nDone — {n} page(s) {'would change' if args.dry_run else 'updated'}.")
