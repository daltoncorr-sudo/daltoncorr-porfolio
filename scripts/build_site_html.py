#!/usr/bin/env python3
"""Merge manifest + curated data, generate blur placeholders for UI images, emit index.html."""
from __future__ import annotations

import base64
import io
import json
import os
import random
import re
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent


def clean_description(text: str) -> str:
    if not text:
        return ""
    if "#block-" in text:
        text = text.split("#block-")[0]
    # Drop accidental CSS / Squarespace junk
    if "{" in text and "--tweak" in text:
        text = text.split("{")[0]
    text = re.sub(r"\s+", " ", text).strip()
    return text[:2000]


def tiny_blur_data_url(path: Path) -> str:
    try:
        img = Image.open(path)
        img = ImageOps.exif_transpose(img)
    except Exception:
        return ""
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, (250, 250, 247))
        bg.paste(img, mask=img.split()[3])
        img = bg
    w = 20
    h = max(1, int(img.size[1] * (w / img.size[0])))
    img = img.resize((w, h), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=40)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def asset_url(rel: str) -> str:
    return "assets/images/" + rel


def build() -> None:
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    curated = json.loads(
        (ROOT / "scripts" / "curated_projects.json").read_text(encoding="utf-8")
    )
    slug_meta = curated["slugToMeta"]
    nav_design = curated["navOrderDesign"]
    nav_music = curated["navOrderMusic"]
    projects_manifest = manifest.get("projects", {})

    design_projects: list[dict] = []
    music_projects: list[dict] = []
    all_paths_for_blur: list[Path] = []

    for slug in nav_design + nav_music:
        meta = slug_meta[slug]
        url_slug = meta.get("urlSlug")
        year = meta["year"]
        category = meta["category"]
        entry = {
            "slug": slug,
            "title": "",
            "role": meta["role"],
            "location": meta["location"],
            "description": meta["description"],
            "palette": meta["palette"],
            "category": category,
            "year": year,
            "images": [],
            "thumb": None,
            "missing": False,
        }
        if not url_slug:
            entry["title"] = meta.get("title") or slug.replace("-", " ").title()
            entry["missing"] = True
            if category == "design":
                design_projects.append(entry)
            else:
                music_projects.append(entry)
            continue

        key = f"{category}/{url_slug}"
        m = projects_manifest.get(key)
        if not m:
            entry["missing"] = True
            entry["title"] = meta.get("title", slug)
            if category == "design":
                design_projects.append(entry)
            else:
                music_projects.append(entry)
            continue

        scraped_title = (m.get("title") or "").strip()
        entry["title"] = scraped_title or meta.get("title") or slug.replace("-", " ").title()
        scraped_desc = clean_description(m.get("description", ""))
        if len(scraped_desc) > 40 and not re.search(r"lorem\s+ipsum", scraped_desc, re.I):
            entry["description"] = scraped_desc

        for im in m.get("images", []):
            if not im.get("file"):
                continue
            rel = im["file"]
            p = ROOT / "assets" / "images" / rel
            webp = p.with_suffix(".webp") if p.suffix.lower() == ".png" else None
            item = {
                "src": asset_url(rel),
                "alt": im.get("alt") or entry["title"],
                "webp": asset_url(
                    str(webp.relative_to(ROOT / "assets" / "images"))
                )
                if webp and webp.is_file()
                else None,
            }
            entry["images"].append(item)
            all_paths_for_blur.append(p)

        if m.get("thumb"):
            rel = m["thumb"]
            entry["thumb"] = asset_url(rel)
            all_paths_for_blur.append(ROOT / "assets" / "images" / rel)

        if not entry["images"]:
            entry["missing"] = True
        else:
            # Editorial pacing: cap per project for load and layout
            entry["images"] = entry["images"][:18]

        if category == "design":
            design_projects.append(entry)
        else:
            music_projects.append(entry)

    # Gallery mix: sample images across all manifest projects for Work landing
    gallery: list[dict] = []
    for key, m in projects_manifest.items():
        for im in m.get("images", [])[:2]:
            if not im.get("file"):
                continue
            rel = im["file"]
            p = ROOT / "assets" / "images" / rel
            if not p.is_file():
                continue
            webp = p.with_suffix(".webp") if p.suffix.lower() == ".png" else None
            gallery.append(
                {
                    "src": asset_url(rel),
                    "alt": im.get("alt") or m.get("title", ""),
                    "webp": asset_url(
                        str(webp.relative_to(ROOT / "assets" / "images"))
                    )
                    if webp and webp.is_file()
                    else None,
                    "speed": round(random.uniform(0.03, 0.08), 3),
                }
            )
    random.seed(42)
    random.shuffle(gallery)
    gallery = gallery[:22]

    # Optional: set PORTFOLIO_BLUR=1 to embed tiny LQIP base64 (slow on large trees)
    blur_by_src: dict[str, str] = {}
    if os.environ.get("PORTFOLIO_BLUR") == "1":
        seen: set[str] = set()
        blur_paths: list[Path] = []
        for p in all_paths_for_blur:
            if p.is_file():
                blur_paths.append(p)
        for g in gallery:
            rel = g["src"].replace("assets/images/", "")
            p = ROOT / "assets" / "images" / rel
            if p.is_file():
                blur_paths.append(p)
        max_blur = 24
        for p in blur_paths:
            if len(blur_by_src) >= max_blur:
                break
            if not p.is_file():
                continue
            src = asset_url(str(p.relative_to(ROOT / "assets" / "images")))
            if src in seen:
                continue
            seen.add(src)
            b = tiny_blur_data_url(p)
            if b:
                blur_by_src[src] = b

    site_data = {
        "categories": ["design", "music"],
        "designProjects": design_projects,
        "musicProjects": music_projects,
        "gallery": gallery,
        "blurBySrc": blur_by_src,
    }

    json_str = json.dumps(site_data, ensure_ascii=False)
    template = (ROOT / "scripts" / "index_template.html").read_text(encoding="utf-8")
    html = template.replace("__SITE_DATA_JSON__", json_str)
    (ROOT / "index.html").write_text(html, encoding="utf-8")
    print(f"Wrote {ROOT / 'index.html'} ({len(html)//1024} KB)")


if __name__ == "__main__":
    build()
