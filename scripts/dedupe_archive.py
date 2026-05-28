#!/usr/bin/env python3
"""
Clean the hi-res archive down to a simple year->project structure.

- Hash every file in the ORGANIZED archive (year folders + _homepage).
- For each file in _raw-source-files/:
    * if an identical-content copy exists in the organized archive -> delete it (true dupe)
    * otherwise -> move it to _leftovers-to-sort/ (preserving its subpath) for manual sorting
- Remove the now-empty _raw-source-files/.

A file is deleted ONLY when a byte-identical copy is confirmed elsewhere.
"""
from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

BK = Path.home() / "Desktop" / "portfolio-originals-backup-20260524"
RAW = BK / "_raw-source-files"
LEFT = BK / "_leftovers-to-sort"


def md5(p: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.md5()
    with open(p, "rb") as f:
        while True:
            b = f.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def main() -> None:
    if not RAW.exists():
        print("No _raw-source-files/ — nothing to do.")
        return

    # 1. hashes of everything already in the organized archive (exclude RAW + LEFT)
    organized: set[str] = set()
    for p in BK.rglob("*"):
        if not p.is_file() or p.name == ".DS_Store":
            continue
        if RAW in p.parents or p == RAW or (LEFT.exists() and LEFT in p.parents):
            continue
        organized.add(md5(p))
    print(f"Indexed {len(organized)} unique files in the year archive.")

    # 2. walk the raw files
    deleted = moved = 0
    moved_list = []
    for p in sorted(RAW.rglob("*")):
        if not p.is_file():
            continue
        if p.name == ".DS_Store":
            p.unlink(); continue
        if md5(p) in organized:
            p.unlink(); deleted += 1
        else:
            rel = p.relative_to(RAW)
            dest = LEFT / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(p), str(dest))
            moved += 1
            moved_list.append(str(rel))

    # 3. remove empty dirs in RAW, then RAW itself
    for d in sorted((d for d in RAW.rglob("*") if d.is_dir()), reverse=True):
        try:
            d.rmdir()
        except OSError:
            pass
    try:
        RAW.rmdir()
        raw_gone = True
    except OSError:
        raw_gone = False

    print(f"\nDeleted {deleted} duplicate files (identical copy exists in year folders).")
    print(f"Moved {moved} non-duplicate files into _leftovers-to-sort/.")
    if moved_list:
        print("  leftovers (not copies — kept for you):")
        for m in moved_list[:40]:
            print(f"    {m}")
        if len(moved_list) > 40:
            print(f"    ...and {len(moved_list)-40} more")
    print(f"\n_raw-source-files/ removed: {raw_gone}")
    print("\nFinal top level:")
    for d in sorted(BK.iterdir()):
        if d.name == ".DS_Store":
            continue
        if d.is_dir():
            sz = sum(f.stat().st_size for f in d.rglob('*') if f.is_file()) / (1024**3)
            print(f"  {d.name}/   ({sz:.2f} GB)")
        else:
            print(f"  {d.name}")
    total = sum(f.stat().st_size for f in BK.rglob('*') if f.is_file()) / (1024**3)
    print(f"\nArchive total now: {total:.2f} GB")


if __name__ == "__main__":
    main()
