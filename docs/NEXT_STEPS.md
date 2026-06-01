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

## Project-page conventions — house style (Dalton's preferences)

Established over the 2026-05-31 content pass. Apply these to every project page
unless told otherwise.

**Layout & restraint**
- **Minimal, heading-less media.** Do NOT label media blocks with `<h2>` like
  "Listen", "Reel", "Music Video", "Performance", "The Music". The player/video
  speaks for itself. (We stripped all of these.)
- **Streaming links sit directly under the description**, as inline text lines in
  the `project-body` — e.g. `Listen on Apple Music · Spotify · SoundCloud` and
  `Hear the podcast on Spotify · Apple Podcasts · …`. Separator is ` &middot; `.
  Links: `target="_blank" rel="noopener"`.
- **Feature ONE embedded player; everything else is a text link.** Dalton picks
  which to feature (often SoundCloud). Don't stack three players.
- **Press credit folds into the top block**, not a separate section:
  `<p>Press: <em>Outlet One</em> and <em>Outlet Two</em></p>` — the word
  "Press:" in regular weight, publication names *italic* (`<em>`), hyperlinked
  when a URL exists. Keep Dalton's exact capitalization (e.g. `et musique pour tous`).
- **Video pages = video only.** When a video carries the page, remove redundant
  cover stills/screenshots. (The grid-card image in `projects.json` is separate
  and stays.)
- **Poster pages stay poster-ONLY.** If a project has both a poster and a score,
  they are two separate pages — keep music/links on the score page, a clean
  centered poster on the poster page. Don't merge them.
- **Single posters are centered** via `poster-hero-wrap` > `project-gallery
  poster-hero` (not the default left-column grid).
- **Card title must match the page `<h1>`** (we renamed "Kid Nicoleman" →
  "Into The Ether With Kid Nicoleman" in `projects.json`).

**Media CSS classes (all in `style.css`)**
- `.media-compact` — narrow (max-width 480px), **centered** single player. Default
  for a standalone SoundCloud/Spotify player.
- `.media-video` — responsive 16:9 wrapper for a YouTube/Vimeo iframe. Works
  standalone or inside `.media-split`; stacked instances auto-space. Strip
  `width`/`height` off the pasted iframe and let the wrapper size it.
- `.media-split` — film + score **side by side** (video left, music right; stacks
  on mobile). Use ONLY when a page genuinely pairs a video AND audio
  (e.g. `nice-knives-score`, `boys-will-be-flowers`). Not universal.
- `.project-media video` — self-hosted HTML5 video (full width).

**Embeds**
- **YouTube:** strip the `?si=…` tracking param; use
  `https://www.youtube.com/embed/<ID>` inside a `.media-video` wrapper.
- **SoundCloud:** see the oEmbed gotcha below — never paste the raw share embed.
- **Spotify / Apple:** paste their embed iframe, or use as a text link.

**Self-hosted video (when a piece isn't online)**
- Source from Dalton's archive at `~/Documents/Creative/` (organized `By Year/`
  and `By Discipline/`). Compress with **ffmpeg 2-pass** to ~7–8 MB,
  `-movflags +faststart`, output to `site/media/<slug>.mp4`. Embed as
  `<video controls preload="none" poster="<a still>.webp">`. ffmpeg is installed
  on the travel laptop (Homebrew, `/usr/local/bin`). Example: Leave Me Alone
  (26 MB → 7.5 MB, 1080×720).

**Adding a NEW project**
1. Add an entry to `data/projects.json` (slug, sort, year, filters, title, role,
   tags, image, alt) then run `python3 scripts/build_work_index.py`.
2. Cover art from a release: `curl "https://itunes.apple.com/lookup?id=<ALBUMID>"`
   → take `artworkUrl100`, swap `100x100bb` → `1000x1000bb`, download, then
   `cwebp -q 80 in.jpg -o site/images/design/<slug>/cover.webp`. Also gives the
   release year. (Example: After The Show.)

**Push cadence (travel loop)**
- Edit → `bump_cache.py` *only if css/js changed* → commit → `git pull --rebase
  origin main` → `git push`. Push per page; Dalton reviews on the live site or the
  local preview (`python3 -m http.server 8080 --directory site`).

---

## Punch list — content completeness pass (started 2026-05-31)

From a page-by-page review. **Skip entirely:** weissman, hollyshorts-21,
dont-mind-me, red-mask, sunnys-journal, polish-film-festival.

### ✅ Done
- **Little Issues** — poster centered (`poster-hero-wrap` + `project-gallery poster-hero`).
- **Nice Knives** (poster page) — poster centered; page is poster-ONLY by design.
- **Nice Knives (Film Score)** (`nice-knives-score.html`) — added SoundCloud score
  embed + YouTube trailer. NOTE: poster + score are two separate pages; keep
  music/links on the score page, not the poster page.
- **Survived By** — poster centered (same pattern).
- **Boys Will Be Flowers** — added film (Vimeo) + score (SoundCloud) side by side.
- **No Regrets Remix** — filled empty Listen box: streaming links + clean
  SoundCloud player (compact, centered).
- **Leave Me Alone** — self-hosted music video (video only; song skipped per
  Dalton). Source `Creative/By Year/2023/Leave Me Alone/Leave Me Alone.mp4`
  (26 MB) compressed via ffmpeg 2-pass → `site/media/leave-me-alone.mp4`
  (7.5 MB, 1080×720). HTML5 `<video>` + poster still. NOTE: this is the FIRST
  self-hosted video — new `site/media/` dir + `.project-media video` CSS rule.
- **After The Show** — NEW project added (original-music, 2016; Apple/Spotify
  streaming re-up is dated 2019). Created
  `work/after-the-show.html` (centered compact SoundCloud player; Apple/Spotify/
  SoundCloud text links + Press line "et musique pour tous and Noon Pacific" in
  the top block), registered in `projects.json`, cover art pulled from Apple
  catalog → `images/design/after-the-show/cover.webp`, grid rebuilt.
  Press outlets are text-only (no links provided).
- **Into the Ether** (`kid-nicoleman.html`) — featured SoundCloud player + music
  and podcast link lines under the description; cover image + section headings
  removed. Card title renamed in `projects.json` → "Into The Ether With Kid
  Nicoleman" to match the page `<h1>`.
- **Composition Reels 2022 + 2025** — embedded YouTube reels, video-only.
- **Dizzy** — St. Marks live-performance video (video-only).
- **Cheeky** — film video (video-only).

### 🔨 Layout/code — doable without new assets (pending decision)
- **Let This Feeling Go** — posters "crossed" (wrong order or two near-dup files
  swapped: `Poster-5-title-copy-2-8c4f31` vs `Poster-5-title-copy-f24903`).
  Grid also square-crops posters via `object-fit:cover` — likely the real bug.
  Needs Dalton to confirm correct order / which images.

### 📥 Needs content from Dalton (links or image files)
- **Welcome Home** — add Work-in-Progress shots.
- **Survived By** — add Work-in-Progress shots.
- **Let This Feeling Go** — build Work-in-Progress section.
- **HollyShorts London 2025** — updates (specifics TBD).
- **HollyShorts Dubai** — refresh (specifics TBD).
- **HDtracks** — refresh (specifics TBD).
- **Bare music pages** (no player/links yet — need embeds or files from Dalton).
  Sweep result 2026-05-31:
  - Original music: baxter, future-is-ow, higher, i-think-of-you,
    live-from-prague
  - Film scores: alchemy, brake-my-heel, gazoo
  - DONE/has media: after-the-show, leave-me-alone, no-regrets-remix,
    boys-will-be-flowers, dont-mind-me, kid-nicoleman, nice-knives-score,
    on-strings, paper-rose, tan-paints-tenderloin, dizzy, cheeky,
    composition-reel-2022, composition-reel-2025

> Embed pattern (copy from `on-strings.html`): a `project-section` containing
> `<div class="project-media"><iframe …></iframe></div>`. WIP/process sections:
> copy from `dont-let-them-out.html` or `hollyshorts-21.html`.
>
> ⚠️ SOUNDCLOUD GOTCHA: the iframe code from SoundCloud's share dialog pastes a
> MALFORMED id (`…/playlists/soundcloud:playlists:ID`) that collapses a playlist
> to just its first track. Always get the correct embed from the oEmbed API:
> `curl "https://soundcloud.com/oembed?format=json&url=<set-or-track-page-url>"`
> → use the clean `url=https%3A%2F%2Fapi.soundcloud.com%2Fplaylists%2FID` (private
> sets append `&secret_token=s-XXXX` as a SEPARATE param). Tracks: `…/tracks/ID`.
> Fixed so far: after-the-show, nice-knives-score, boys-will-be-flowers.

---

## Out of scope (per original brief)

Frameworks, npm, React, dark mode, hamburger menus, image hover zoom, footers,
sound, decorative gradients/shadows on chrome (gallery-style restraint).
