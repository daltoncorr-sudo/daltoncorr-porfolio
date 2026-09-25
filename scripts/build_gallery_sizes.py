#!/usr/bin/env python3
"""Smaller copies of big project pictures, served with srcset.

Photos in the 2-up project galleries (.project-gallery) are shown about 480px
wide (half the page's 972px column), and the posters, centred pictures and
full-width pictures elsewhere on a project page are often drawn far narrower
than their files, since a tall one is held to a share of the window's height.
For each file 1500px or wider this makes a 1200px copy beside it:

    images/.../photo.webp  ->  images/.../photo-1200.webp   (cwebp -q 85)

and gives the <img> a srcset + sizes worked out from where it sits and its
shape, so browsers fetch the 1200px copy instead of the full file wherever
that's sharp enough. The full-size original stays the src: it's the
fallback, and it's what the lightbox opens on a big screen. It also makes
each project's first picture load at once rather than lazily.

Needs cwebp (libwebp). Run after adding gallery photos:

  python3 scripts/build_gallery_sizes.py          # make copies + write srcset
  python3 scripts/build_gallery_sizes.py --check  # CI: every copy + srcset present
"""
import re, shutil, subprocess, sys, urllib.parse
from pathlib import Path

from stamp_image_sizes import image_size

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
WIDTH, MIN_SOURCE, QUALITY = 1200, 1500, "85"
# Rendered width of a 2-up gallery photo: half of the project column (up to
# 1100px) beside the deck on laptops; half the page on tablets; one per row
# on phones.
SIZES = "(min-width: 1100px) min(542px, 35vw), (min-width: 768px) 45vw, calc(100vw - 40px)"

# The other places a big picture sits on a project page. A tall one is held
# to a height (work-cards.css: 88% of the window, 70% for the first section's
# pictures), so it's drawn at that height times its shape, often far
# narrower than the column: the size hint says so, and the 1200px copy
# does. Without it, a poster shown ~500px wide fetched its 2400px original.
CONTAINERS = [
    ("gallery", re.compile(r'(<div class="project-gallery">)(.*?)(</div>)', re.S)),
    ("hero", re.compile(r'(<div class="project-gallery poster-hero"[^>]*>)(.*?)(</div>)', re.S)),
    ("center", re.compile(r'(<div class="media-center">)(.*?)(</div>)', re.S)),
    ("wide", re.compile(r'(<div class="project-gallery-wide"[^>]*>)(.*?)(</div>)', re.S)),
]
IMG = re.compile(r"<img\b[^>]*>", re.I)
SRC = re.compile(r'\ssrc="([^"]*)"')
OLD = re.compile(r'\s(?:srcset|sizes)="[^"]*"')
BODY = '<div class="wc-body">'
# Pages Dalton wants left exactly as they are.
LEAVE = {"skyfire-artists.html"}


def sizes_for(kind, w, h, alone=False, capped=False):
    """How wide the browser will draw a picture, so srcset can pick."""
    tall = lambda share: f"{share * w / h:.0f}vh"
    if kind == "gallery" and not alone:      # the 2-up masonry
        return SIZES
    if kind == "gallery":                    # the only photo in its gallery: whole, up to 88% of the window tall
        return f"(min-width: 1100px) min(1100px, 70vw, {tall(88)}), min(100vw, {tall(88)})"
    if kind == "hero":                       # a centred poster, 680px tall (520px on smaller laptops)
        return f"(min-width: 1201px) {680 * w / h:.0f}px, (min-width: 768px) {520 * w / h:.0f}px, 100vw"
    if kind == "center":                     # up to 600px wide
        return f"(min-width: 768px) min(600px, {tall(88)}), 100vw"
    # "wide": the column's full width; in a project's first section, held to 70% of the window
    return f"(min-width: 1100px) min(1100px, 70vw, {tall(70)}), 100vw" if capped else "(min-width: 1100px) min(1100px, 70vw), 100vw"


def cwebp():
    exe = shutil.which("cwebp") or str(Path.home() / ".local/bin/cwebp")
    if not Path(exe).exists():
        sys.exit("cwebp not found (install libwebp)")
    return exe


def variant_url(src):
    return re.sub(r"\.[A-Za-z]+$", f"-{WIDTH}.webp", src)


def first_section(text):
    """Where a page's first section runs, when it's the first thing in its work."""
    b = text.find(BODY)
    if b < 0:
        return None
    rest = text[b + len(BODY):]
    if not rest.lstrip().startswith('<div class="project-section">'):
        return None
    start = b + len(BODY) + rest.index('<div class="project-section">')
    nxt = text.find('<div class="project-section">', start + 10)
    return (start, nxt if nxt > 0 else len(text))


def main():
    check = "--check" in sys.argv
    problems, made, tagged, eager = [], 0, 0, 0
    for page in sorted((SITE / "work").glob("*.html")):
        if page.name in LEAVE:
            continue
        text = page.read_text(encoding="utf-8")

        def fix_img(m, kind, alone, capped):
            nonlocal made, tagged
            tag = m.group(0)
            src = SRC.search(tag)
            if not src or re.match(r"^(https?:|data:|//)", src.group(1)):
                return tag
            path = (page.parent / urllib.parse.unquote(src.group(1))).resolve()
            size = image_size(path) if path.is_file() else None
            if not size or size[0] < MIN_SOURCE:
                return tag
            vurl = variant_url(src.group(1))
            vpath = (page.parent / urllib.parse.unquote(vurl)).resolve()
            # (--check only asks that the copy exists: a git checkout gives every
            # file a fresh timestamp, so "older than the original" means nothing in CI)
            if check:
                if not vpath.exists():
                    problems.append(f"missing copy: {vpath.relative_to(SITE)}")
            elif not vpath.exists() or vpath.stat().st_mtime < path.stat().st_mtime:
                subprocess.run([cwebp(), "-quiet", "-q", QUALITY, "-metadata", "none",
                                    "-resize", str(WIDTH), "0", str(path), "-o", str(vpath)], check=True)
                made += 1
            want = f' srcset="{vurl} {WIDTH}w, {src.group(1)} {size[0]}w" sizes="{sizes_for(kind, size[0], size[1], alone, capped)}"'
            new = OLD.sub("", tag)
            new = new[:4] + want + new[4:]
            if new != tag:
                tagged += 1
                if check:
                    problems.append(f"no srcset: {page.name}: {src.group(1)}")
            return new

        new_text = text
        for kind, pattern in CONTAINERS:
            span = first_section(new_text)

            def fix_box(g, kind=kind, span=span):
                alone = len(IMG.findall(g.group(2))) == 1
                capped = kind == "wide" and span is not None and span[0] <= g.start() < span[1]
                return g.group(1) + IMG.sub(lambda m: fix_img(m, kind, alone, capped), g.group(2)) + g.group(3)

            new_text = pattern.sub(fix_box, new_text)

        # A project's first picture is on screen as the page opens: it loads
        # at once, not when the browser gets round to lazy pictures.
        b = new_text.find(BODY)
        if b >= 0:
            first = IMG.search(new_text, b)
            if first and ' loading="lazy"' in first.group(0):
                eager += 1
                if check:
                    problems.append(f"first picture loads lazily: {page.name}")
                new_text = new_text[:first.start()] + first.group(0).replace(' loading="lazy"', "") + new_text[first.end():]

        if not check and new_text != text:
            page.write_text(new_text, encoding="utf-8")

    if check:
        if problems:
            print(f"{len(problems)} picture(s) not set up, e.g.:")
            print("\n".join(problems[:10]))
            print("Run: python3 scripts/build_gallery_sizes.py")
            sys.exit(1)
        print("Every large project picture has its 1200px copy and srcset.")
    else:
        print(f"Made {made} copy(ies); updated {tagged} <img> tag(s); {eager} first picture(s) now load at once.")


if __name__ == "__main__":
    main()
