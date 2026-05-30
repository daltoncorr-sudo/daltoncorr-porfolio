# Dalton Corr portfolio — status & handoff

A hand-maintained **static multi-page site**. No framework, no npm, no runtime
data fetching. Source lives in `site/` and is deployed to GitHub Pages from
`main` (auto-deploy on push).

---

## Stack (current reality)

- **`site/`** — every page is its own `.html` file (home, `work/`, `blog/`,
  `about.html`, `404.html`, plus one page per project under `work/`).
- **`site/css/style.css`** — all styling. One file.
- **`site/js/main.js`** — all behavior (nav dot, slideshow, card filtering,
  sticky cards, admin reorder). One file.
- **`site/images/`** — all WebP assets.
- **`data/projects.json`** — source of truth for the Work grid + nav order.
- **`scripts/templates/`** — `nav.html` and `project-toolbar.html`, the shared
  fragments injected into every page.

CSS/JS are referenced with `?v=HASH` cache-busting params. Edit the source
files directly, then re-stamp the hashes (see below).

---

## Build / maintenance scripts

| Script | Role |
|--------|------|
| `scripts/sync_includes.py` | Pushes `templates/nav.html` + `project-toolbar.html` into every page. `--check` for CI. |
| `scripts/build_work_index.py` | Regenerates `site/work/index.html` from `data/projects.json`. `--check` for CI. |
| `scripts/build_head_meta.py` | Idempotently adds canonical + Open Graph + description meta to every `<head>`. `--check` for CI. |
| `scripts/bump_cache.py` | Re-stamps `?v=HASH` on CSS/JS refs from content hashes. **Run after editing css/js.** |
| `scripts/build_sitemap.py` | Generates `sitemap.xml`. |

> **Note:** the site is hand-edited HTML/CSS/JS, not generated. `scripts/` now
> contains only the five build/maintenance scripts above; the old one-off
> Squarespace-migration scripts (`scrape_migrate.py`, `optimize_*`, archive
> builders) have been removed.

---

## Normal edit loop

1. Edit `site/**.html`, `site/css/style.css`, or `site/js/main.js` directly.
2. If you touched a shared fragment, run `python3 scripts/sync_includes.py`.
3. If you touched `data/projects.json`, run `python3 scripts/build_work_index.py`.
4. Run `python3 scripts/bump_cache.py` so the browser picks up css/js changes.
5. Preview locally: `cd site && python3 -m http.server 8080` → `http://127.0.0.1:8080/`.
6. Commit + push to `main` (GitHub Pages auto-deploys; deploy also re-runs
   `bump_cache.py` + `build_sitemap.py` against the artifact).

---

## CI

- `.github/workflows/lint.yml` — runs the three `--check` scripts
  (`sync_includes`, `build_work_index`, `build_head_meta`) and a WebP size
  budget (warns over 3 MB).
- `.github/workflows/deploy.yml` — deploys `site/` to Pages.

Both pin `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` ahead of the June 2 2026
Node-20 deprecation.

---

## Out of scope (per original brief)

Frameworks, npm, React, dark mode, hamburger menus, image hover zoom, footers,
sound, decorative gradients/shadows on chrome (gallery-style restraint).
