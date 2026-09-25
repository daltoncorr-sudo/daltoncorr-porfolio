#!/usr/bin/env python3
"""Tie each home-page slide to its project, for the card a click opens.

data/home-slides.json maps every slide image in site/index.html to a project
slug (or null for a picture that belongs to no project page). This writes:

  - data-project="<slug>" on each of those slides, and
  - one small JSON block, #slide-projects, with what the card shows for each
    project: title, role, year and a line from the project page

so the home page opens the card without fetching anything. Run it after
changing the slideshow, projects.json or a project's first paragraph:

  python3 scripts/build_home_slides.py          # write site/index.html
  python3 scripts/build_home_slides.py --check  # exit 1 if it's out of date
"""
import html, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
HOME = SITE / "index.html"
MAP = ROOT / "data" / "home-slides.json"
PROJECTS = ROOT / "data" / "projects.json"

SLIDE = re.compile(r'<div class="slide( active)?"(?: data-project="[^"]*")?>(<img[^>]*?(?:data-src|src)="([^"]+)")')
BLOCK = re.compile(r'\n?[ \t]*<script type="application/json" id="slide-projects">.*?</script>', re.S)


def text(fragment):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


def blurb(slug):
    """The project's first paragraph, or its first sentence when that runs long."""
    page = (SITE / "work" / f"{slug}.html").read_text()
    m = re.search(r'<div class="project-body">\s*<p>(.*?)</p>', page, re.S)
    line = text(m.group(1)) if m else ""
    if not line:
        m = re.search(r'project-details--meta">(.*?)</p>', page, re.S)
        line = text(m.group(1)) if m else ""
    if len(line) > 200:
        # a whole sentence if one fits; otherwise stop at a comma, not mid-phrase
        cut = re.match(r"(.{60,200}?[.!?])\s+[A-Z]", line)
        if cut:
            line = cut.group(1)
        else:
            head = line[:180]
            line = (head.rsplit(", ", 1)[0] if ", " in head[60:] else head.rsplit(" ", 1)[0]).rstrip(",;: ") + "…"
    return line


def build(check=False):
    mapping = json.loads(MAP.read_text())
    projects = {p["slug"]: p for p in json.loads(PROJECTS.read_text())}
    home = HOME.read_text()
    used, missing = set(), []

    def tag(m):
        slug = mapping.get(m.group(3))
        if m.group(3) not in mapping:
            missing.append(m.group(3))
        if slug:
            used.add(slug)
        attr = f' data-project="{slug}"' if slug else ""
        return f'<div class="slide{m.group(1) or ""}"{attr}>{m.group(2)}'

    new = SLIDE.sub(tag, home)
    info = {}
    for slug in sorted(used):
        p = projects[slug]
        info[slug] = {"title": text(p["title"]), "role": text(p["role"]), "year": p["year"], "line": blurb(slug)}
    block = ('\n        <script type="application/json" id="slide-projects">'
             + json.dumps(info, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
             + "</script>")
    new = BLOCK.sub("", new)
    new = new.replace('<div class="slideshow">', '<div class="slideshow">' + block, 1)
    if missing:
        print("slides not in data/home-slides.json:", *missing, sep="\n  ")
    if new == home:
        print("Home slides are up to date.")
        return 1 if missing and check else 0
    if check:
        print("OUT OF SYNC: run python3 scripts/build_home_slides.py")
        return 1
    HOME.write_text(new)
    print(f"Tied {sum(1 for v in mapping.values() if v)} slides to {len(used)} projects.")
    return 0


if __name__ == "__main__":
    sys.exit(build("--check" in sys.argv))
