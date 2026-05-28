#!/usr/bin/env python3
"""
Rename archive project folders to clean, logical Proper-Case titles (no dashes).
Dry run by default; pass --apply to rename.
"""
from __future__ import annotations

import html as htmllib
import re
import sys
from pathlib import Path

REPO = Path("/Users/dalton/Documents/GitHub/daltoncorr-portfolio")
SITE = REPO / "site"
BK = Path.home() / "Desktop" / "portfolio-originals-backup-20260524"

# Explicit, logical names (brands, festivals, stylized titles normalized)
OVERRIDE = {
    "hollyshorts-18": "HollyShorts 18",
    "hollyshorts-19": "HollyShorts 19",
    "hollyshorts-20": "HollyShorts 20",
    "hollyshorts-21": "HollyShorts 21",
    "hollyshorts-dubai": "HollyShorts Dubai",
    "hollyshorts-london": "HollyShorts London",
    "hollyshorts-comedy": "HollyShorts Comedy",
    "hollyshorts-comedy-2025": "HollyShorts Comedy 2025",
    "hollyshorts-website": "HollyShorts.com",
    "hcsff-6": "Hollywood Comedy Shorts 6",
    "hcsff-7": "Hollywood Comedy Shorts 7",
    "hcsff-8": "Hollywood Comedy Shorts 8",
    "cannes": "Cannes Film Festival 2023",
    "cannes-2023": "Cannes 2023",
    "cannes-2024": "Cannes 2024",
    "baxter": "Baxter",
    "little-issues": "Little Issues",
    "composition-reel-2025": "Composition Reel 2025",
    "nice-knives": "Nice Knives",
    "nice-knives-score": "Nice Knives (Score)",
    "sunnys-journal": "Sunny's Journal",
    "weissman": "Weissman Catalog",
    "dizzy": "Dizzy (Live from St. Marks)",
    "gazoo": "Gazoo Interview",
    "feeling": "Let This Feeling Go",
    "let-this-feeling-go": "Let This Feeling Go",
    "polish-film-festival": "Polish Film Festival North America",
}

idx = (SITE / "work" / "index.html").read_text(encoding="utf-8")
slug_title: dict[str, str] = {}
for m in re.finditer(
    r'href="([a-z0-9\-]+)\.html"[^>]*class="project-card".*?<h3 class="card-title">([^<]+)</h3>',
    idx, re.S,
):
    slug_title[m.group(1)] = htmllib.unescape(m.group(2)).strip()


def smart(title: str) -> str:
    # Normalize ALL-CAPS or odd casing to Title Case; keep already-good titles.
    letters = re.sub(r"[^A-Za-z]", "", title)
    if letters and (letters.isupper() or letters.islower()):
        return title.title()
    return title


def name_for(slug: str) -> str:
    if slug in OVERRIDE:
        return OVERRIDE[slug]
    t = slug_title.get(slug)
    if not t:
        f = SITE / "work" / f"{slug}.html"
        if f.exists():
            mm = re.search(r"<h1[^>]*>([^<]+)</h1>", f.read_text(encoding="utf-8"))
            t = htmllib.unescape(mm.group(1)).strip() if mm else slug.replace("-", " ").title()
        else:
            t = slug.replace("-", " ").title()
    return smart(t).replace("/", " ").replace(":", " ").strip()


def main() -> None:
    apply = "--apply" in sys.argv
    planned, seen = [], {}
    for ydir in sorted(d for d in BK.iterdir() if d.is_dir() and d.name[:4].isdigit()):
        for proj in sorted(p for p in ydir.iterdir() if p.is_dir()):
            new = name_for(proj.name)
            key = (ydir.name, new.lower())
            dup = key in seen
            seen[key] = True
            if new != proj.name:
                planned.append((ydir, proj.name, new, dup))

    for ydir, slug, new, dup in planned:
        print(f"{ydir.name}  {slug:26} ->  {new}{'   [!] same name as another folder this year' if dup else ''}")
    if not apply:
        print(f"\n[DRY RUN] {len(planned)} renames. Re-run with --apply.")
        return
    for ydir, slug, new, dup in planned:
        dest = ydir / new
        if dest.exists():
            dest = ydir / f"{new} (alt)"
        (ydir / slug).rename(dest)
    print(f"\nRenamed {len(planned)} folders.")


if __name__ == "__main__":
    main()
