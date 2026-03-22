#!/usr/bin/env python3
"""
Fetch daltoncorr.com design/music indexes and project pages; download Squarespace CDN images.
Run from repo root: python3 scripts/scrape_migrate.py
Outputs: assets/images/..., manifest.json
"""
from __future__ import annotations

import json
import re
import ssl
import time
from html import unescape
from pathlib import Path
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

BASE = "https://www.daltoncorr.com"
ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets" / "images"
UA = "Mozilla/5.0 (compatible; DaltonPortfolioMigration/1.0; +https://daltoncorr.com)"

# Unverified SSL context for environments with cert quirks (prefer default first)
def fetch(url: str) -> str:
    req = Request(url, headers={"User-Agent": UA})
    try:
        with urlopen(req, timeout=90) as r:
            return r.read().decode("utf-8", errors="replace")
    except Exception:
        ctx = ssl.create_default_context()
        with urlopen(req, timeout=90, context=ctx) as r:
            return r.read().decode("utf-8", errors="replace")


def strip_qs(url: str) -> str:
    return url.split("?")[0]


def ext_from_url(url: str) -> str:
    path = urlparse(url).path
    ext = Path(path).suffix.lower()
    if ext in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        return ext
    return ".jpg"


def extract_project_links(html: str, prefix: str) -> list[str]:
    pattern = re.compile(rf'href="({re.escape(prefix)}/[a-zA-Z0-9\-]+)"')
    return sorted(set(pattern.findall(html)))


def parse_index_thumbs(html: str) -> dict:
    thumbs: dict[str, dict] = {}
    for m in re.finditer(
        r'<a class="grid-item" href="(/(design|music)/([a-zA-Z0-9\-]+))">', html
    ):
        path = m.group(1)
        end = html.find("</a>", m.end())
        if end == -1:
            continue
        block = html[m.end() : end]
        img_m = re.search(
            r'(?:data-src|src)="(https://images\.squarespace-cdn\.com[^"]+)"', block
        )
        thumb_url = strip_qs(img_m.group(1)) if img_m else None
        title_m = re.search(
            r'<h3[^>]*class="portfolio-title"[^>]*>([^<]+)</h3>', block
        )
        title = title_m.group(1).strip() if title_m else None
        thumbs[path] = {
            "thumb_url": thumb_url,
            "thumb_title": title,
            "category": m.group(2),
            "slug": m.group(3),
        }
    return thumbs


def extract_og_title(html: str) -> str | None:
    m = re.search(r'<meta property="og:title" content="([^"]+)"', html)
    if not m:
        return None
    title = unescape(m.group(1)).replace("\u2014", "—")
    for sep in (" — ", " &mdash; ", " - "):
        if sep.strip() in title:
            title = title.split(sep)[0].strip()
            break
    return title.strip()


def extract_description(html: str) -> str:
    m = re.search(r'<meta property="og:description" content="([^"]*)"', html)
    if m and m.group(1).strip():
        return unescape(m.group(1).strip())
    m2 = re.search(
        r'<div class="sqs-html-content"[^>]*data-sqsp-text-block-content[^>]*>(.*?)</div>\s*</div>',
        html,
        re.DOTALL,
    )
    if not m2:
        m2 = re.search(
            r'<div class="sqs-html-content"[^>]*>(.*?)</div>\s*</div>',
            html,
            re.DOTALL,
        )
    if m2:
        text = re.sub(r"<[^>]+>", " ", m2.group(1))
        return " ".join(unescape(text).split())
    return ""


def extract_images(html: str) -> list[dict]:
    results: list[dict] = []
    seen: set[str] = set()
    for m in re.finditer(
        r'<img[^>]+(?:src|data-src)="(https://images\.squarespace-cdn\.com[^"]+)"[^>]*>',
        html,
        re.I,
    ):
        tag = m.group(0)
        u = strip_qs(m.group(1))
        if "favicon" in u.lower() or u.endswith(".ico"):
            continue
        alt_m = re.search(r'alt="([^"]*)"', tag)
        alt = alt_m.group(1) if alt_m else ""
        if u not in seen:
            seen.add(u)
            results.append({"url": u, "alt": alt})
    return results


def guess_year(html: str, text: str) -> int | None:
    combined = html + " " + text
    years = [int(y) for y in re.findall(r"\b(20[12]\d)\b", combined)]
    if not years:
        return None
    return max(set(years), key=years.count)


def download_file(url: str, dest: Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = Request(url, headers={"User-Agent": UA})
    try:
        with urlopen(req, timeout=120) as r:
            dest.write_bytes(r.read())
        return True
    except Exception as e:
        print(f"  FAIL {url}: {e}")
        return False


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    design_html = fetch(f"{BASE}/design")
    music_html = fetch(f"{BASE}/music")

    design_links = extract_project_links(design_html, "/design")
    music_links = extract_project_links(music_html, "/music")
    thumbs_design = parse_index_thumbs(design_html)
    thumbs_music = parse_index_thumbs(music_html)
    all_thumbs = {**thumbs_design, **thumbs_music}

    all_paths = sorted(set(design_links + music_links))
    manifest: dict = {"projects": {}, "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}

    for path in all_paths:
        category, slug = path.strip("/").split("/", 1)
        url = f"{BASE}{path}"
        print(f"Fetching {path}...")
        try:
            page = fetch(url)
        except Exception as e:
            print(f"  Skip page error: {e}")
            continue

        title = extract_og_title(page) or slug
        description = extract_description(page)
        yr = guess_year(page, description + " " + title)
        images = extract_images(page)
        thumb_info = all_thumbs.get(path, {})

        dest_dir = ASSETS / category / slug
        dest_dir.mkdir(parents=True, exist_ok=True)

        image_entries: list[dict] = []
        for i, img in enumerate(images, start=1):
            ext = ext_from_url(img["url"])
            fname = f"{i:02d}{ext}"
            local = dest_dir / fname
            ok = download_file(img["url"], local)
            if ok:
                image_entries.append(
                    {
                        "file": f"{category}/{slug}/{fname}",
                        "source_url": img["url"],
                        "alt": img["alt"] or title,
                    }
                )
            else:
                image_entries.append(
                    {
                        "file": None,
                        "source_url": img["url"],
                        "alt": img["alt"] or title,
                        "error": True,
                    }
                )
            time.sleep(0.05)

        thumb_file = None
        tu = thumb_info.get("thumb_url")
        if tu:
            tdest = dest_dir / f"thumb{ext_from_url(tu)}"
            if download_file(tu, tdest):
                thumb_file = f"{category}/{slug}/{tdest.name}"

        manifest["projects"][f"{category}/{slug}"] = {
            "category": category,
            "slug": slug,
            "source_url": url,
            "title": title,
            "description": description,
            "year_guess": yr,
            "thumb": thumb_file,
            "thumb_title": thumb_info.get("thumb_title"),
            "images": image_entries,
        }

    out = ROOT / "manifest.json"
    out.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote {out} ({len(manifest['projects'])} projects)")


if __name__ == "__main__":
    main()
