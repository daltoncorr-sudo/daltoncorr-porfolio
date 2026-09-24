#!/usr/bin/env python3
"""Smaller copies of big gallery photos, served with srcset.

Photos in the 2-up project galleries (.project-gallery) are shown about 480px
wide (half the page's 972px column), but most files are 2000-2400px wide. For
each one 1500px or wider this makes a 1200px copy beside it:

    images/.../photo.webp  ->  images/.../photo-1200.webp   (cwebp -q 85)

and gives the <img> a srcset + sizes, so browsers fetch the 1200px copy
(still ~2.5x the width it's shown at on a laptop, so sharp on retina screens
and phones) instead of the full file. The full-size original stays the src:
it's the fallback, and it's what the lightbox opens.

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
# Rendered width of a 2-up gallery photo: 482px once the column is at its
# 1100px max; half the column minus nav and margins on tablets; one per row
# on phones.
SIZES = "(min-width: 1200px) 482px, (min-width: 768px) calc(50vw - 124px), calc(100vw - 40px)"

GALLERY = re.compile(r'(<div class="project-gallery">)(.*?)(</div>)', re.S)
IMG = re.compile(r"<img\b[^>]*>", re.I)
SRC = re.compile(r'\ssrc="([^"]*)"')
OLD = re.compile(r'\s(?:srcset|sizes)="[^"]*"')


def cwebp():
    exe = shutil.which("cwebp") or str(Path.home() / ".local/bin/cwebp")
    if not Path(exe).exists():
        sys.exit("cwebp not found (install libwebp)")
    return exe


def variant_url(src):
    return re.sub(r"\.[A-Za-z]+$", f"-{WIDTH}.webp", src)


def main():
    check = "--check" in sys.argv
    problems, made, tagged = [], 0, 0
    for page in sorted((SITE / "work").glob("*.html")):
        text = page.read_text(encoding="utf-8")

        def fix_img(m):
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
            want = f' srcset="{vurl} {WIDTH}w, {src.group(1)} {size[0]}w" sizes="{SIZES}"'
            new = OLD.sub("", tag)
            new = new[:4] + want + new[4:]
            if new != tag:
                tagged += 1
                if check:
                    problems.append(f"no srcset: {page.name}: {src.group(1)}")
            return new

        new_text = GALLERY.sub(lambda g: g.group(1) + IMG.sub(fix_img, g.group(2)) + g.group(3), text)
        if not check and new_text != text:
            page.write_text(new_text, encoding="utf-8")

    if check:
        if problems:
            print(f"{len(problems)} gallery photo(s) not set up, e.g.:")
            print("\n".join(problems[:10]))
            print("Run: python3 scripts/build_gallery_sizes.py")
            sys.exit(1)
        print("Every large gallery photo has its 1200px copy and srcset.")
    else:
        print(f"Made {made} copy(ies); updated {tagged} <img> tag(s).")


if __name__ == "__main__":
    main()
