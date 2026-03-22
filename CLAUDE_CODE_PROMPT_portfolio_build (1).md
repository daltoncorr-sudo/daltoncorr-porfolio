# PORTFOLIO WEBSITE BUILD — Dalton Corr

## WHAT YOU'RE BUILDING

A single-page portfolio website for Dalton Corr, an independent creative director, designer, and composer based in Venice, Los Angeles. The site should feel like walking into a white gallery — nearly empty, impossibly clean, and then the work appears and commands the room.

This is not a template. This is not a generic portfolio. This is a custom-built artifact that demonstrates taste, restraint, and technical ability simultaneously. Every decision should serve one principle: **the work is the only thing that matters. Everything else disappears.**

---

## TECH STACK

- Static HTML + CSS + vanilla JS. No frameworks. No build tools. No npm. No React.
- Single `index.html` file with inline `<style>` and `<script>` tags. One file. That's it.
- Must be self-hostable — point a domain at it and it works.
- Zero external dependencies except Google Fonts.

---

## PHASE 0: SCRAPE & MIGRATE IMAGES FROM CURRENT SITE

Before building anything, scrape all project images from the existing Squarespace site at `www.daltoncorr.com`. This is a migration — the new site launches with real images, not placeholders.

### How the current site works
- Built on Squarespace. All images hosted on `images.squarespace-cdn.com`
- Two index pages list all projects:
  - **Design:** `https://www.daltoncorr.com/design` — links to `/design/[slug]`
  - **Music:** `https://www.daltoncorr.com/music` — links to `/music/[slug]`
- Each project page contains multiple full-resolution images as `<img>` tags with `src` pointing to `images.squarespace-cdn.com/content/v1/65b16f5513153c67a7dc2776/...`
- About page: `https://www.daltoncorr.com/about`

### Scraping steps

1. **Fetch the design index page** (`/design`) and extract all project links (anchors pointing to `/design/[slug]`).

2. **Fetch the music index page** (`/music`) and extract all project links (anchors pointing to `/music/[slug]`).

3. **For each project page**, fetch the HTML and extract:
   - All `<img>` `src` URLs that contain `images.squarespace-cdn.com`
   - The project title (usually in an `<h3>` or heading tag)
   - Any descriptive text/paragraphs on the page
   - Any caption text adjacent to images

4. **Download each image** to a local directory structure:
   ```
   assets/images/design/hollyshorts21/01.jpg
   assets/images/design/hollyshorts21/02.jpg
   assets/images/design/hollyshorts20/01.jpg
   ...
   assets/images/music/nice-knives/01.jpg
   assets/images/music/alchemy/01.jpg
   ...
   ```

5. **Strip Squarespace query parameters** from image URLs before downloading. The raw URL without `?format=` params gives the highest resolution available.

6. **Also download the thumbnail images** from the index pages — these are the grid/preview images. Save them as `thumb.jpg` in each project folder:
   ```
   assets/images/design/hollyshorts21/thumb.jpg
   ```

### Known project slugs (design index — scrape all of these)
```
/design/hollyshorts21
/design/hollyshorts-comedy-2025
/design/hollyshorts-london
/design/hollyshorts20
/design/cannes-2024
/design/hollyshortswebsite
/design/hdtracks
/design/hcsff8
/design/nice-knives
/design/skyfire-artists
/design/hollyshorts19
/design/miles-regis
/design/survived-by
/design/feeling
/design/welcome-home
/design/timewriter
/design/hcsff7
/design/hcsff7-2
/design/cannes
/design/little-issues
/design/hallelujah
/design/hsff18
/design/hcsff6
/design/chop-suey-club
```

### Known project slugs (music index — scrape all of these)
```
/music/2023-reel
/music/nice-knives
/music/boys
/music/kid-nicoleman
/music/no-regrets-remix
/music/i-think
/music/leave-me
/music/higher
/music/dizzy
/music/prague
/music/alchemy
/music/baxter
/music/tan
/music/2022-reel
/music/cheeky
/music/paper-rose
```
(There may be additional projects — scrape whatever the index pages return, don't limit to this list.)

### After scraping

- Generate a `manifest.json` file that maps each project slug to:
  - Array of downloaded image filenames with dimensions
  - Project title (scraped from page)
  - Description text (scraped from page)
  - Caption text for each image (scraped from page, if available)
  - Category (`design` or `music`)
  - Source URL

- Use this manifest to **auto-populate the JS project data object** in the final `index.html`. The project data section later in this prompt has placeholder info — replace/merge it with the real scraped content. Scraped descriptions and titles take priority over placeholders. The year/role/location metadata from the placeholder data should be kept (it was manually curated), but image arrays should come from the scrape.

- Replace ALL SVG placeholder logic with real `<img>` tags pointing to `assets/images/...`

- Images should use `loading="lazy"`, `decoding="async"`, and proper `alt` text derived from the caption text on the Squarespace page (or project title if no caption exists).

- If any image fails to download, fall back to a colored SVG placeholder for that slot and leave a `<!-- TODO: missing image: [url] -->` comment in the HTML.

### Image optimization (do this after download)

- Convert PNGs larger than 500KB to WebP (keep PNG as fallback). Use `<picture>` tags with WebP source + PNG/JPG fallback.
- Resize any image wider than 2400px down to 2400px max width (maintain aspect ratio).
- Generate a tiny blur placeholder for each image (20px wide, base64-encoded inline) to use as `background-image` on the container while the real image lazy-loads. This creates the smooth progressive reveal effect.
- Strip EXIF data from all images.
- Total asset size target: keep the full site under 25MB if possible. If the scrape pulls significantly more, flag which images are largest and could be further compressed.

### File structure after scrape
```
/
├── index.html
├── manifest.json
├── assets/
│   └── images/
│       ├── design/
│       │   ├── hollyshorts21/
│       │   │   ├── thumb.jpg
│       │   │   ├── 01.jpg
│       │   │   ├── 02.jpg
│       │   │   └── ...
│       │   ├── hollyshorts20/
│       │   │   └── ...
│       │   └── [every other design project]/
│       └── music/
│           ├── nice-knives/
│           │   └── ...
│           ├── alchemy/
│           │   └── ...
│           └── [every other music project]/
```

---

## THE SCREEN

- Background: `#FAFAF7` — not white, not cream. The faintest warm off-white. Like heavyweight uncoated paper.
- No visible borders, boxes, cards, containers, or decorative elements anywhere. None.
- The entire viewport is open space. Content floats in it.

---

## TYPOGRAPHY

- One serif font for everything: **Cormorant Garamond** (Google Fonts), weights 300 and 400.
- Weight 300 for headings, project titles, names. Weight 400 for body text, descriptions.
- No sans-serif anywhere except the tiny navigation hint text (use system-ui at ~0.6rem, color very faint gray).
- Font sizes should be fluid using `clamp()`. Nothing should ever feel too big or too small on any screen.
- Letter-spacing: slightly negative on large display text (-0.01em), neutral on body.
- Line-height: 1.1 on titles, 1.7 on body text.
- Text color: `#1A1A1A` for primary text. `#A09E97` for muted/secondary text. `#D4D2CC` for the faintest text (hint text, metadata).

---

## LAYOUT — THE LEFT-HAND MENU

### Structure
A fixed menu anchored to the **top-left corner** of the viewport. It stays put. It never scrolls. It never moves. It is the permanent anchor of the entire experience.

### Contents (top to bottom):
```
Dalton Corr          ← Name, Cormorant Garamond 300, ~1.1rem

Home                 ← Nav links, Cormorant Garamond 400, ~0.9rem
Work
About
Press

                     ← Below the nav, small gap, then:
Navigate with        ← Hint text, system-ui, 0.6rem, color #D4D2CC
arrow keys or mouse
```

### The Blue Indicator Dot
- A small circle, `6px` diameter, `background: #3B5BDB` (a refined, slightly muted blue — not neon, not primary).
- Positioned to the **left** of the currently selected/hovered nav item.
- When the user selects a different page (Home, Work, About, Press), the dot **glides** to the new position.
- Animation: `transition: top 0.5s cubic-bezier(0.16, 1, 0.3, 1)` — this is the "buttery smooth" easing. Fast out, slow settle.
- The dot is always visible once the user has interacted with the nav. On initial load, it sits next to "Home."

### Padding/Position
- The entire menu block should be positioned with generous padding from the top-left corner: roughly `2.5rem` from top, `2.5rem` from left on desktop.
- On mobile, the menu moves to the top of the page (still left-aligned), with `1.5rem` padding.

---

## KEYBOARD NAVIGATION

- Arrow keys (up/down) move between nav items. The blue dot follows.
- Enter key selects/activates the current nav item.
- This should work immediately on page load without the user needing to click first (set focus to the nav on load).
- The hint text ("Navigate with arrow keys or mouse") tells visitors this is possible. This text is extremely subtle — `#D4D2CC`, tiny, beneath the nav links.

---

## PAGE: HOME

- The center of the viewport displays the name **"Dalton Corr"** in large Cormorant Garamond 300, and beneath it, a single line: **"Creative Direction · Design · Music"** in the muted color, small caps or uppercase at ~0.65rem with wide letter-spacing.
- This content is vertically and horizontally centered in the available space (to the right of the menu).
- Fade-in animation on load: opacity 0→1 over ~1s with a slight translateY upward (8px). Easing: `cubic-bezier(0.16, 1, 0.3, 1)`.
- That's it. Nothing else on the home screen. White space is the design.

---

## PAGE: WORK

When the user selects "Work" from the menu:

### The Submenu
- Below "Work" in the nav, a submenu **fades in and expands** (height animation + opacity, ~0.4s).
- The submenu lists **year groups**, indented slightly from the main nav:
  ```
  2025
  2024
  2023
  2022
  2019
  ```
- Same font (Cormorant Garamond 400), slightly smaller (~0.85rem), muted color.
- The blue dot moves to "Work" when Work is selected, and then to the specific year when a year is selected.

### When a Year is Selected
- Below the year in the submenu, **project names** for that year fade in, further indented:
  ```
  2025
    HollyShorts 21st Film Festival
    HollyShorts Comedy Rebrand
    HollyShorts London
    Don't Mind Me
  ```
- Project names are Cormorant Garamond 400, ~0.82rem, muted color. Active/hovered project: `#1A1A1A`.
- The blue dot moves to the selected project name.

### The Center Content — Image Presentation

**When "Work" is first selected (no specific project chosen yet):**
- In the center-right area of the viewport (the large open space to the right of the menu), a curated selection of images from across all projects **fades in**.
- Images should appear one at a time or in a staggered sequence, each fading in with a subtle scale-up (from 0.97 to 1.0) over ~0.8s with staggered delays.
- Layout: an asymmetric, editorial arrangement. NOT a uniform grid. Think magazine editorial layout — some images large, some small, varied aspect ratios, generous white space between them. Masonry-adjacent but more intentional.
- Images should have a very subtle parallax effect on scroll — different images move at slightly different speeds (use `translate3d` on `requestAnimationFrame` for GPU compositing, speed values between 0.03 and 0.08).
- On mobile: consider a gentle response to device tilt using `DeviceOrientationEvent` — images shift very slightly (1-3px) based on phone angle. This is a "wow" moment but must be extremely subtle. If gyroscope access is denied, gracefully fall back to static.

**When a specific project is selected:**
- The current images cross-fade out (opacity 0, ~0.3s).
- New content fades in:
  - **Project title** appears near the top of the content area (Cormorant Garamond 300, large, ~clamp(1.8rem, 3vw, 2.8rem)).
  - **Project metadata** appears below the title: Role, Year, Location — in muted color, small.
  - **Project description** — one paragraph, Cormorant Garamond 400, muted color, max-width ~48ch, line-height 1.7.
  - **Project images** — a curated grid/layout of images from that project. Same asymmetric editorial layout. Same parallax. Same staggered fade-in.
- The transition between project views should feel seamless — no page loads, no jumps, no flashes.

---

## PAGE: ABOUT

When the user selects "About":
- Center content cross-fades to the About content.
- **Heading:** "About" in Cormorant Garamond 300, large.
- **Bio paragraphs** (2-3 short paragraphs), Cormorant Garamond 400, muted color, max-width ~50ch, line-height 1.75.
- **Contact info** at the bottom: email address as a simple link (underlined with `border-bottom: 1px solid #D4D2CC`, hover: border darkens to #1A1A1A).
- Staggered fade-in for each element.
- Placeholder text for the bio:
  ```
  Dalton Corr is an independent creative director, designer, and composer based in Venice, Los Angeles.

  He art directs international film festivals, scores the films that play in them, and builds brands for the people who make them. Currently art director for HollyShorts Film Festival and composing his first feature-length film score.

  Interested in working together —
  hello@daltoncorr.com
  ```

---

## PAGE: PRESS

When the user selects "Press":
- Center content cross-fades to the Press content.
- **Heading:** "Press & Awards" in Cormorant Garamond 300, large.
- A clean vertical list of press mentions and awards, organized by year (newest first).
- Each entry: Publication/Festival name (weight 400, #1A1A1A) + brief description (muted), with year aligned right or on its own line.
- Links to external press should be subtle (same border-bottom treatment as contact link).
- Staggered fade-in.
- Placeholder structure:
  ```
  2024
  FestivalsInLA — "World's greatest film festival posters"
  Variety — HollyShorts 20th coverage
  Deadline — Festival coverage
  Canvas Rebel — Interview
  Daily Mail — Festival coverage

  2023
  FestivalsInLA — "World's greatest film festival posters"
  Deadline — HollyShorts 19th coverage
  Radio du Cinéma — Interview
  LAist — "Things To Do This Week"
  ```

---

## TRANSITIONS & ANIMATION RULES

1. **All page transitions** are cross-fades. Outgoing content fades to 0 opacity (~0.3s). Incoming content fades from 0 to 1 (~0.5s) with a 0.15s delay. No sliding. No scaling on page transitions (only on individual image reveals).
2. **Staggered reveals:** When multiple elements appear (images, text blocks), each subsequent element gets an additional `0.06s` delay. This creates the feeling of content "arriving" rather than appearing.
3. **Blue dot movement:** Always `cubic-bezier(0.16, 1, 0.3, 1)`, 0.5s duration. This easing is critical — it's the signature feel of the site.
4. **Hover states on nav items:** Color transition from muted to primary, 0.3s ease. No other hover effects.
5. **Image parallax:** `requestAnimationFrame` loop, `translate3d` only (GPU composited), speed values 0.03–0.08, passive scroll listener.
6. **No scroll hijacking.** Native scroll always. Parallax is additive, never overrides.
7. **No loading states, spinners, or skeleton screens.** Content either exists or it doesn't.

---

## IMAGES

**If Phase 0 scraping was completed:** Use real `<img>` tags pointing to `assets/images/[category]/[slug]/01.jpg` etc. Use the `manifest.json` to auto-populate. Each image gets `loading="lazy"`, `decoding="async"`, and `alt` text from the scraped caption or project title. Wrap in `<picture>` if WebP versions exist.

**If scraping failed or images aren't available yet:** Fall back to placeholder SVG elements that simulate images at correct aspect ratios. Placeholders should be filled rectangles in muted tones (#1a1a2e, #EDE8DC, #DAD5C9, #0D0D1A, #C9C3B5, etc.) — NOT gray boxes. Each project should have a distinct palette hint. Include `<!-- REPLACE: [project-slug] image [n] -->` comments marking where real images go.

---

## PROJECT DATA

Structure the project data as a JS object so it's easy to update. Here are the projects to include:

```javascript
const projects = {
  2025: [
    {
      slug: 'hollyshorts-21',
      title: 'HollyShorts 21st Film Festival',
      role: 'Art Director',
      location: 'TCL Chinese Theatres, Los Angeles',
      description: 'Art directed the 21st anniversary festival. Poster, merch, badges, award design, and full production design across the festival, Alta Global Media Film Summit, and award show.',
      images: 6, // number of placeholder images to generate
      palette: ['#1a1a2e', '#2d2d3f', '#23233a'] // placeholder colors
    },
    {
      slug: 'comedy-rebrand',
      title: 'HollyShorts Comedy Rebrand',
      role: 'Art Director — Led Rebrand',
      location: 'Los Angeles',
      description: 'Led the full rebrand — new logo, color palette, typography, design system, AR activations, website, and event production.',
      images: 4,
      palette: ['#EDE8DC', '#E4DDD0', '#DDD6C8']
    },
    {
      slug: 'hollyshorts-london',
      title: 'HollyShorts London',
      role: 'Creative Director',
      location: 'London, United Kingdom',
      description: 'Creative direction and design for the inaugural HollyShorts London. New visual identity for the festival\'s international expansion.',
      images: 4,
      palette: ['#DAD5C9', '#D0CAC0', '#C8C2B8']
    },
    {
      slug: 'dont-mind-me',
      title: 'Don\'t Mind Me',
      role: 'Composer — Feature Film',
      location: 'Dir. Isaiah Hoban Halvorsen',
      description: 'First feature-length film score. Full soundtrack for the feature. The career milestone — shorts to features.',
      images: 3,
      palette: ['#0A0A08', '#0E0E0B', '#121210']
    }
  ],
  2024: [
    {
      slug: 'hollyshorts-20',
      title: 'HollyShorts 20th Film Festival',
      role: 'Art Director',
      location: 'TCL Chinese · Egyptian Theater · Japan House, Los Angeles',
      description: 'Three venues. Original illustration. Award design. A full merch line. Production design for the festival, film summit, and award show. Press in Variety, Deadline, and Daily Mail.',
      images: 8,
      palette: ['#0D0D1A', '#161628', '#1C1C30']
    },
    {
      slug: 'cannes-2024',
      title: 'Cannes Film Festival',
      role: 'Designer / Illustrator',
      location: 'Cannes, France',
      description: 'Original illustrations and poster design for Kodak-hosted events at the 2024 Cannes Film Festival.',
      images: 4,
      palette: ['#C9C3B5', '#B8B2A4', '#D4CFC4']
    },
    {
      slug: 'nice-knives',
      title: 'Nice Knives',
      role: 'Poster Design + Film Score',
      location: 'New York City',
      description: 'Designed the poster and composed the score. Two disciplines, one film. Directed by Connor Copeland, distributed by BAM In Motion.',
      images: 4,
      palette: ['#1C1916', '#141210', '#0F0D0B']
    }
  ],
  2023: [
    {
      slug: 'hollyshorts-19',
      title: 'HollyShorts 19th Film Festival',
      role: 'Art Director',
      location: 'TCL Chinese Theatres, Hollywood',
      description: 'Art direction and lead design for the 19th annual festival. Developed the look-and-feel alongside the executive team.',
      images: 5,
      palette: ['#1E1E32', '#28283E', '#2E2E42']
    },
    {
      slug: 'cannes-2023',
      title: 'Cannes 2023',
      role: 'Designer / Illustrator',
      location: 'Cannes, France',
      description: 'Original artwork and invitation design for HollyShorts events at Cannes.',
      images: 3,
      palette: ['#D0C9BD', '#C5BEB2', '#BAB3A7']
    }
  ],
  2022: [
    {
      slug: 'hollyshorts-18',
      title: 'HollyShorts 18th Film Festival',
      role: 'Designer',
      location: 'TCL Chinese Theatres',
      description: 'Festival design for the 18th edition.',
      images: 3,
      palette: ['#222238', '#2A2A40', '#1A1A30']
    }
  ],
  2019: [
    {
      slug: 'hdtracks',
      title: 'HDtracks',
      role: 'Director of Marketing, Lead Designer',
      location: 'New York City',
      description: 'Complete rebranding and website redesign for the Grammy-connected music platform. UX/UI, branding, logos, ad campaigns.',
      images: 4,
      palette: ['#2C2C2C', '#363636', '#222222']
    },
    {
      slug: 'alchemy',
      title: 'Alchemy',
      role: 'Composer, Music Supervisor',
      location: 'New York City',
      description: 'Score and music supervision for the award-winning documentary directed by Remington Long. 10+ festival awards including Sundance Collab and Hamptons.',
      images: 3,
      palette: ['#E3DDD2', '#D8D2C6', '#CEC8BC']
    },
    {
      slug: 'boys-will-be-flowers',
      title: 'Boys Will Be Flowers',
      role: 'Composer',
      location: 'El Capitolio, Cuba',
      description: 'Film score for the short directed by Daddy Ramazani. Featured on NOWNESS. Official Selection at Le Festival International du Film sur l\'Art.',
      images: 3,
      palette: ['#C4BDA8', '#B8B19C', '#ACA590']
    }
  ]
};
```

---

## RESPONSIVE BEHAVIOR

### Desktop (>900px)
- Menu fixed top-left, content in center-right.
- Full parallax, full image layout, full keyboard nav.

### Tablet (600–900px)
- Menu still top-left but tighter padding.
- Image layout adjusts to fewer columns, larger images.

### Mobile (<600px)
- Menu moves to the top of the page, horizontal or compact vertical.
- Blue dot still functions.
- Parallax reduces to minimal (or replaced by gyroscope tilt response).
- Images stack vertically, full width.
- Keyboard navigation hint hidden (mobile users don't have keyboards).

---

## WHAT NOT TO DO

- **No hamburger menus.** The nav is always visible.
- **No scroll-triggered text animations** (no letters flying in, no word-by-word reveals). Only opacity + subtle translateY.
- **No gradients** anywhere.
- **No shadows** anywhere.
- **No border-radius** on images (sharp corners or 1px max).
- **No hover zoom on images.** Images are presented, not interacted with.
- **No footer.** The page ends when the content ends.
- **No "back to top" buttons.** No scroll indicators. No progress bars.
- **No tooltips, toasts, modals, or overlays.**
- **No loading animations.**
- **No dark mode toggle.** This is a light site. Commit.
- **No cursor effects.**
- **No sound.**
- **Do not use Inter, Roboto, Söhne, Space Grotesk, or any sans-serif as the primary font.**
- **Do not use purple, teal, or any "AI portfolio" color palette.**
- **Do not make it look like a Squarespace template, a Webflow template, or a Cargo site.**

---

## QUALITY BAR

When this is done, a creative director should be able to look at it and think:
1. "This person has taste."
2. "This person can build."
3. "The work is incredible."

In that order.

The site itself is a portfolio piece. It should be as considered as the posters, the festival design, and the film scores it contains.

---

## FILE STRUCTURE

```
/
├── index.html              ← The entire site. CSS + JS inline.
├── manifest.json           ← Generated by scraper. Maps slugs → images + metadata.
├── assets/
│   └── images/
│       ├── design/         ← Scraped from www.daltoncorr.com/design/*
│       │   ├── hollyshorts21/
│       │   │   ├── thumb.jpg
│       │   │   ├── 01.jpg
│       │   │   ├── 01.webp  (if converted)
│       │   │   └── ...
│       │   └── [all other design projects]/
│       └── music/          ← Scraped from www.daltoncorr.com/music/*
│           ├── nice-knives/
│           └── [all other music projects]/
```

The `index.html` is the entire site — CSS in `<style>`, JS in `<script>`, Google Fonts via `<link>` in `<head>`. Images referenced as relative paths to `assets/images/...`.

---

## BUILD IT.

One file. Zero compromise. Ship it.
