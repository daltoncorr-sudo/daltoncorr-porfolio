#!/usr/bin/env python3
"""
Archive the FULL-RESOLUTION originals of every Squarespace CDN image into the
hi-res backup folder. No resizing, no conversion — these are kept as uploaded.
Reads /tmp/sq_urls.txt (one URL per line). Run from repo root.
"""
from __future__ import annotations

import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

DEST = Path.home() / "Desktop" / "portfolio-originals-backup-20260524" / "squarespace-originals"
URLS = Path("/tmp/sq_urls.txt")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) portfolio-archive"
WORKERS = 8


def name_for(url: str) -> str:
    base = url.split("?", 1)[0]
    # <uuid>/<filename> — keep filename, prefix short uuid piece to avoid collisions
    parts = base.rstrip("/").split("/")
    fname = urllib.parse.unquote(parts[-1]).replace("+", " ")
    uid = parts[-2][:8] if len(parts) >= 2 else "x"
    return f"{uid}__{fname}"


def fetch(url: str) -> tuple[str, bool, str]:
    dest = DEST / name_for(url)
    if dest.exists() and dest.stat().st_size > 0:
        return url, True, "cached"
    try:
        req = urllib.request.Request(url.split("?", 1)[0] + "?format=original",
                                     headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as r:
            data = r.read()
        dest.write_bytes(data)
        return url, True, f"{len(data)//1024}KB"
    except Exception as e:  # noqa: BLE001
        return url, False, str(e)[:80]


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    urls = [u.strip() for u in URLS.read_text().splitlines() if u.strip()]
    # keep a copy of the source list alongside the archive
    (DEST / "_source_urls.txt").write_text("\n".join(urls), encoding="utf-8")
    print(f"Archiving {len(urls)} originals -> {DEST}")

    ok = fail = 0
    total = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {ex.submit(fetch, u): u for u in urls}
        for fut in as_completed(futs):
            u, good, msg = fut.result()
            if good:
                ok += 1
            else:
                fail += 1
                print(f"  FAIL {u}\n       {msg}")
    print(f"\nArchived {ok}, failed {fail}")
    print(f"Archive size: {sum(f.stat().st_size for f in DEST.glob('*') if f.is_file())/(1024*1024):.1f} MB")


if __name__ == "__main__":
    main()
