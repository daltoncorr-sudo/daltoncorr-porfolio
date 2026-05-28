#!/usr/bin/env python3
"""
Build a complete, per-project hi-res archive that mirrors the live website.
For every work page (and the home page), gather the FULL-RESOLUTION source of
each image it displays into  <backup>/by-project/<project>/ .

Sources:
  - images/cdn/<page>/<stem>-<hash6>.webp  -> full-res original in squarespace-originals/
  - images/design/<slug>/<name>.webp       -> original in site-images/design/<slug>/
Reports any image it can't resolve (genuine gaps).
"""
from __future__ import annotations

import hashlib
import re
import shutil
import urllib.parse
from pathlib import Path

REPO = Path("/Users/dalton/Documents/GitHub/daltoncorr-portfolio")
SITE = REPO / "site"
BK = Path.home() / "Desktop" / "portfolio-originals-backup-20260524"
FLAT = BK / "squarespace-originals"
DESIGN_SRC = BK / "site-images" / "design"
OUT = BK / "by-project"
URLS = [u.strip() for u in Path("/tmp/sq_urls.txt").read_text().splitlines() if u.strip()]

IMG_RE = re.compile(r'(?:src|data-src)\s*=\s*["\']([^"\']+\.(?:webp|png|jpe?g|gif))["\']', re.I)


def base_of(u: str) -> str:
    return u.split("?", 1)[0]


def flat_name(u: str) -> tuple[str, str]:
    base = base_of(u)
    parts = base.rstrip("/").split("/")
    fname = urllib.parse.unquote(parts[-1]).replace("+", " ")
    uid = parts[-2][:8] if len(parts) >= 2 else "x"
    return f"{uid}__{fname}", fname


# hash6 -> (full-res flat path, clean original filename)
hash_to_flat: dict[str, tuple[Path, str]] = {}
for u in URLS:
    h = hashlib.sha1(base_of(u).encode()).hexdigest()[:6]
    fn, clean = flat_name(u)
    fp = FLAT / fn
    if fp.exists():
        hash_to_flat[h] = (fp, clean)


def copy_into(project: str, src: Path, name: str) -> None:
    d = OUT / project
    d.mkdir(parents=True, exist_ok=True)
    dest = d / name
    if dest.exists() and dest.stat().st_size != src.stat().st_size:
        dest = d / f"{src.stem}_{src.stat().st_size}{src.suffix}"
    if not dest.exists():
        shutil.copy2(src, dest)


def resolve(ref: str, project: str, missing: list):
    ref_c = urllib.parse.unquote(ref)
    if "/cdn/" in ref_c:
        h = Path(ref_c).stem.rsplit("-", 1)[-1]
        hit = hash_to_flat.get(h)
        if hit:
            copy_into(project, hit[0], hit[1])
        else:
            missing.append(ref_c)
    elif "/design/" in ref_c:
        m = re.search(r"design/([^/]+)/(.+)\.webp$", ref_c)
        if not m:
            missing.append(ref_c); return
        slug, name = m.group(1), m.group(2)
        folder = DESIGN_SRC / slug
        cands = [c for c in folder.glob(name + ".*") if c.suffix.lower() != ".webp"] if folder.exists() else []
        if cands:
            copy_into(project, cands[0], cands[0].name)
        else:
            missing.append(ref_c)


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    pages = [(SITE / "index.html", "_home")]
    pages += [(p, p.stem) for p in sorted((SITE / "work").glob("*.html")) if p.stem != "index"]

    total_files = 0
    all_missing: list[str] = []
    rows = []
    for html, project in pages:
        refs = list(dict.fromkeys(IMG_RE.findall(html.read_text(encoding="utf-8"))))
        refs = [r for r in refs if not r.startswith(("http", "//", "data:"))]
        missing: list[str] = []
        for r in refs:
            resolve(r, project, missing)
        n = len(list((OUT / project).glob("*"))) if (OUT / project).exists() else 0
        if n or missing:
            rows.append((project, n, len(missing)))
            total_files += n
        all_missing += missing

    rows.sort()
    print(f"{'PROJECT':32} FILES  MISSING")
    for proj, n, m in rows:
        flag = "  <-- GAP" if m else ""
        print(f"  {proj:30} {n:5}  {m:6}{flag}")
    print(f"\nProjects with images: {len(rows)}  |  total files: {total_files}")
    if all_missing:
        print(f"\nUNRESOLVED ({len(all_missing)}):")
        for r in all_missing[:30]:
            print("  ", r)
    else:
        print("\nEvery image on every project resolved to a full-res source. Archive complete.")
    print(f"\nArchive: {OUT}  ({sum(f.stat().st_size for f in OUT.rglob('*') if f.is_file())/(1024**3):.2f} GB)")


if __name__ == "__main__":
    main()
