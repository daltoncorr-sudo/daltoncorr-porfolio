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

## Punch list — content completeness pass (started 2026-05-31)

From a page-by-page review. **Skip entirely:** weissman, hollyshorts-21,
dont-mind-me, red-mask, sunnys-journal, polish-film-festival.

### ✅ Done
- **Little Issues** — poster centered (`poster-hero-wrap` + `project-gallery poster-hero`).
- **Nice Knives** — poster centered (same pattern).
- **Survived By** — poster centered (same pattern).

### 🔨 Layout/code — doable without new assets (pending decision)
- **Let This Feeling Go** — posters "crossed" (wrong order or two near-dup files
  swapped: `Poster-5-title-copy-2-8c4f31` vs `Poster-5-title-copy-f24903`).
  Grid also square-crops posters via `object-fit:cover` — likely the real bug.
  Needs Dalton to confirm correct order / which images.

### 📥 Needs content from Dalton (links or image files)
- **Nice Knives** — add Score link + short-film link.
- **Boys Will Be Flowers** — add Score link + short-film link.
- **No Regrets Remix** — "Listen" section exists but is empty; add music embed.
- **Leave Me Alone** — add song + video.
- **Into the Ether** — ⚠️ NO PAGE EXISTS yet (not in projects.json or work/).
  Needs page built + score + podcast links.
- **Welcome Home** — add Work-in-Progress shots.
- **Survived By** — add Work-in-Progress shots.
- **Let This Feeling Go** — build Work-in-Progress section.
- **HollyShorts London 2025** — updates (specifics TBD).
- **HollyShorts Dubai** — refresh (specifics TBD).
- **HDtracks** — refresh (specifics TBD).
- **All music pages** — add links to the music / videos (sweep).

> Embed pattern (copy from `on-strings.html`): a `project-section` containing
> `<div class="project-media"><iframe …></iframe></div>`. WIP/process sections:
> copy from `dont-let-them-out.html` or `hollyshorts-21.html`.

---

## Out of scope (per original brief)

Frameworks, npm, React, dark mode, hamburger menus, image hover zoom, footers,
sound, decorative gradients/shadows on chrome (gallery-style restraint).
