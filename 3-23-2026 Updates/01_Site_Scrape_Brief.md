# Claude Code Brief: Full Site Scrape → Excel Inventory
## daltoncorr.com (Squarespace)

---

## OBJECTIVE

Crawl every page on `www.daltoncorr.com`. Produce a single `.xlsx` file with one row per URL found on the site. For each page, deeply scrape and log: all images, all text content, all hyperlinks, all embedded media, and all metadata. This is the master inventory that tells us exactly what exists on the current site so we can identify what's missing, broken, or incomplete for the rebuild.

---

## STEP 1: DISCOVER ALL URLS

Start from `https://www.daltoncorr.com/` and crawl every internal link to build the full sitemap. The site is on Squarespace.

### Known top-level pages:
- `/` (home — slideshow)
- `/design` (project index grid)
- `/music` (project index grid)
- `/about`
- `/press` (press links page)

### Known design project pages (slugs under `/design/`):
- `/design/hollyshorts20` — 20th HollyShorts
- `/design/hollyshorts21` or similar — 21st HollyShorts (check for actual slug)
- `/design/hollyshorts-london` — HollyShorts London 2025
- `/design/hollyshorts-comedy-2025` or similar — Comedy Rebrand
- `/design/cannes-2024` — Cannes 2024
- `/design/cannes-2023` or similar — Cannes 2023
- `/design/hcsff8` — 8th Hollywood Comedy Shorts
- `/design/hcsff7` — 7th Hollywood Comedy Shorts (may have TWO pages: hcsff7 and hcsff7-2)
- `/design/hcsff6` or similar — 6th Hollywood Comedy Shorts
- `/design/little-issues` — LiTTLE iSSUES
- `/design/hdtracks` — HDtracks
- `/design/hollyshorts-web` or similar — Hollyshorts.com website
- `/design/skyfire` or similar — Skyfire Artists
- `/design/timewriter` — Timewriter
- `/design/nice-knives` or similar — Nice Knives poster
- `/design/miles-regis` or similar — Miles Regis illustrations
- `/design/survived-by` or similar
- `/design/let-this-feeling-go` or similar
- `/design/welcome-home` or similar
- `/design/hallelujah` or similar — Hallelujah (Spike Lee EP)
- `/design/hollyshorts19` or similar — 19th HollyShorts
- `/design/hollyshorts18` or similar — 18th HollyShorts
- `/design/chop-suey` or similar — Chop Suey Club

### Known music project pages (slugs under `/music/`):
- `/music/reel-2025` or similar — 2025 Composition Reel
- `/music/nice-knives` or similar — Nice Knives score
- `/music/boys` — Boys Will Be Flowers
- `/music/kid-nicoleman` or similar — Into The Ether
- `/music/no-regrets` or similar — No Regrets Remix
- `/music/i-think-of-you` or similar
- `/music/leave-me` — Leave Me Alone
- `/music/higher` or similar
- `/music/dizzy` or similar — Dizzy Live from St. Marks
- `/music/prague` or similar — Live from Prague
- `/music/alchemy` or similar
- `/music/baxter` or similar
- `/music/tan` — Tan Paints The Tenderloin
- `/music/reel-2022` or similar — 2022 Reel
- `/music/cheeky` or similar
- `/music/paper-rose` or similar
- `/music/on-strings` or similar
- `/music/blob-dylan` or similar — Blob Dylan: Gazoo
- `/music/future-is-ow` or similar
- `/music/brake-my-heel` or similar

**Important:** Do NOT rely only on the list above. Crawl the actual site and follow every internal link. The list is a reference to make sure nothing is missed — if you find URLs not listed here, include them. If listed URLs don't exist, note that too.

---

## STEP 2: SCRAPE EACH PAGE

For every URL discovered, extract the following:

### A. Page metadata
- Full URL
- Page title (`<title>` tag)
- Meta description (if any)
- H1 text
- Navigation position (which section: design, music, about, press, home)

### B. All body text
- Full visible text content on the page (paragraphs, headings, captions, labels)
- Capture in reading order
- Note any placeholder text (e.g., "Lorem ipsum for privacy" appears on Cannes 2024)

### C. All images
**Squarespace-specific:** Images on Squarespace are lazy-loaded. You MUST check all of these attributes:
- `src` attribute
- `data-src` attribute  
- `srcset` attribute
- Images inside `<noscript>` tags (Squarespace puts full-res URLs here as fallback)
- Background images set via `style` attributes or CSS
- `data-image` attributes on Squarespace section wrappers

For each image, capture:
- Image URL (the highest resolution version available)
- Alt text (if any)
- Position on page (1st image, 2nd image, etc.)
- Context (what section or element it's inside — e.g., "hero slideshow", "project gallery", "poster image")
- Whether it's actually loading/accessible or returns a 404/broken

### D. All hyperlinks
For every `<a>` tag on the page:
- Link URL (href)
- Link text (anchor text)
- Whether it's internal or external
- Whether it targets `_blank`
- Whether it's a broken link (returns 404)

### E. Embedded media
- YouTube/Vimeo embeds (capture embed URL)
- SoundCloud/audio embeds
- iframes of any kind
- Squarespace video blocks

### F. Navigation links
- What nav items appear on this page
- Previous/Next project links (Squarespace uses these on project pages)

---

## STEP 3: OUTPUT FORMAT — EXCEL FILE

Create `daltoncorr_site_inventory.xlsx` with the following sheets:

### Sheet 1: "Pages" (one row per URL)
| Column | Content |
|--------|---------|
| A: URL | Full page URL |
| B: Page Title | `<title>` content |
| C: Section | design / music / about / press / home / other |
| D: H1 | First H1 on page |
| E: Body Text | Full page text (truncated to 2000 chars if needed, with note) |
| F: Image Count | Number of images found |
| G: Broken Image Count | Number of images that 404 or fail to load |
| H: Link Count | Number of hyperlinks on page |
| I: Broken Link Count | Number of links that 404 |
| J: Embed Count | Number of video/audio embeds |
| K: Has Placeholder Text | Yes/No (e.g., Lorem ipsum) |
| L: Has Previous/Next Nav | Yes/No |
| M: Notes | Any anomalies (duplicate page, redirect, missing content, etc.) |

### Sheet 2: "Images" (one row per image)
| Column | Content |
|--------|---------|
| A: Page URL | Which page this image is on |
| B: Image URL | Full image URL (highest res) |
| C: Alt Text | Alt attribute value (blank if none) |
| D: Position | Image number on page (1, 2, 3...) |
| E: Context | Hero / gallery / poster / background / thumbnail / etc. |
| F: Status | OK / 404 / Broken / Lazy-load-only |
| G: Source Attribute | Where the URL was found (src / data-src / srcset / noscript / style) |

### Sheet 3: "Links" (one row per hyperlink)
| Column | Content |
|--------|---------|
| A: Page URL | Which page this link is on |
| B: Link URL | Full href |
| C: Anchor Text | Link text |
| D: Type | Internal / External |
| E: Target | _self / _blank |
| F: Status | OK / 404 / Redirect / Timeout |
| G: Destination | Where it actually resolves to (if redirect) |

### Sheet 4: "Embeds" (one row per embed)
| Column | Content |
|--------|---------|
| A: Page URL | Which page this embed is on |
| B: Embed URL | YouTube/Vimeo/SoundCloud URL |
| C: Embed Type | video / audio / iframe / other |
| D: Status | OK / Broken |

### Sheet 5: "Press Links" (dedicated sheet — one row per press mention)
Pull EVERY link from the `/press` page specifically:
| Column | Content |
|--------|---------|
| A: Outlet Name | Publication name |
| B: Article Title / Description | Anchor text or surrounding context |
| C: URL | Full link |
| D: Status | OK / 404 / Broken |
| E: Year | If discernible from context |
| F: Related Project | Which D project it relates to (if clear) |

---

## TECHNICAL NOTES

1. **Squarespace renders client-side.** You may need to use a headless browser (Puppeteer/Playwright) rather than simple HTTP requests to get fully rendered HTML with all images loaded. If using `curl` or `requests`, make sure to parse `<noscript>` blocks where Squarespace puts fallback image URLs.

2. **Rate limiting.** Be respectful — add 1-2 second delays between requests. Squarespace may block aggressive crawling.

3. **Image URL format.** Squarespace image URLs often look like `https://images.squarespace-cdn.com/content/v1/...` with query parameters for size (`?format=1500w`). Capture the base URL and note the largest size parameter available.

4. **Duplicate detection.** Flag any pages that appear to be duplicates (same content, different URLs). Known duplicates: HCSFF7 and HCSFF7-2, Cannes 2023 appears in grid twice.

5. **Navigation structure.** Note the current nav structure as it exists (what tabs, what order, what links to what).

---

## SUCCESS CRITERIA

The finished `.xlsx` should allow us to:
1. See every single page on the site at a glance
2. Identify every missing/broken image
3. Identify every broken link
4. See all press mentions in one place with working/broken status
5. Have the full text content of every page for migration
6. Know exactly how many images need to be re-sourced or replaced
7. Cross-reference against the Master Project Catalog to identify what's on the site vs. what's missing

---

## CONTEXT FILE

The Master Project Catalog is at `/mnt/project/Master_Project_Catalog_and_Audit_DaltonCorr.md` — reference it to cross-check discovered pages against known projects. Flag any projects from the catalog that have NO corresponding page on the site.
