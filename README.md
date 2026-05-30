# Dalton Corr — portfolio

A hand-maintained **static multi-page site** (daltoncorr.com). No framework, no
npm, no build step at author time. Source lives in `site/` and is deployed to
GitHub Pages from `main` (auto-deploys on every push).

---

## Setup on a new machine

Everything the website is made of is in this repo — there is no second location.
The live site is just a disposable copy GitHub Pages rebuilds from `site/` on each
push. To work locally you only need two things installed:

```bash
# 1. Python 3 — runs the build/maintenance scripts (ships with macOS, or: brew install python)
python3 --version

# 2. libwebp — provides cwebp/dwebp for image conversion
brew install webp
```

That's it. No `npm install`, no dependencies to fetch.

```bash
# Preview locally:
cd site && python3 -m http.server 8080
# → open http://127.0.0.1:8080/
```

---

## Repo layout

| Path | What it is |
|------|------------|
| `site/` | The entire website. Every page is its own `.html` (home, `work/`, `blog/`, `about.html`, `404.html`, one page per project under `work/`). |
| `site/css/style.css` | All styling. One file. |
| `site/js/main.js` | All behavior (nav dot, slideshow, card filtering, sticky cards). One file. |
| `site/images/` | All WebP assets. |
| `data/projects.json` | Source of truth for the Work grid + nav order. |
| `scripts/` | Python build/maintenance scripts (see below). |
| `scripts/templates/` | Shared `nav.html` + `project-toolbar.html` fragments injected into every page. |
| `docs/NEXT_STEPS.md` | Fuller status/handoff notes. |

---

## Build / maintenance scripts

| Script | Role |
|--------|------|
| `scripts/sync_includes.py` | Pushes shared templates into every page. `--check` for CI. |
| `scripts/build_work_index.py` | Regenerates `site/work/index.html` from `data/projects.json`. `--check` for CI. |
| `scripts/build_head_meta.py` | Adds canonical + Open Graph + description meta to every `<head>`. `--check` for CI. |
| `scripts/bump_cache.py` | Re-stamps `?v=HASH` cache-busting params on CSS/JS refs. **Run after editing css/js.** |
| `scripts/build_sitemap.py` | Generates `sitemap.xml`. |

---

## Normal edit loop

1. Edit `site/**.html`, `site/css/style.css`, or `site/js/main.js` **directly**.
2. If you touched a shared fragment → `python3 scripts/sync_includes.py`.
3. If you touched `data/projects.json` → `python3 scripts/build_work_index.py`.
4. **Always** run `python3 scripts/bump_cache.py` after css/js changes so browsers pick them up.
5. Preview: `cd site && python3 -m http.server 8080`.
6. Commit + push to `main` (GitHub Pages auto-deploys; deploy re-runs `bump_cache.py` + `build_sitemap.py` on the artifact).

---

## Conventions & gotchas (read before editing)

- **The site is hand-edited HTML/CSS/JS, not generated.** `scripts/` now holds
  only the five build/maintenance scripts listed above; the old one-off
  Squarespace-migration scripts (`scrape_migrate.py`, the `optimize_*`/archive
  builders, etc.) have been removed.
- **Always cache-bust after css/js edits** (`scripts/bump_cache.py`), or changes
  won't show up in the browser.
- **`.project-gallery` is a 2-up CSS grid, NOT `columns:`.** It must read
  row-major (image 1,2 on the first row, 3,4 on the next). CSS multi-columns flow
  column-major (1 above 2 above 3 down the left column) which scrambles the
  reading order. HTML source order = on-screen order.
- **Image conversion:** use `cwebp`/`dwebp` (libwebp), and `sips` for
  dimensions/rotation. Resize large source images to ~1600px wide at q80.
- Out of scope (per original brief): frameworks, npm, React, dark mode, hamburger
  menus, image hover zoom, footers, decorative gradients/shadows on chrome.

---

## CI / deploy

- `.github/workflows/lint.yml` — runs the three `--check` scripts + a WebP size budget (warns over 3 MB).
- `.github/workflows/deploy.yml` — deploys `site/` to GitHub Pages.
