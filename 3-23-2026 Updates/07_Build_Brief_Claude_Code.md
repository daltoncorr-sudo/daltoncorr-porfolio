# Claude Code Build Brief: Static Site
## daltoncorr.com — Full Rebuild in HTML/CSS/JS

---

## WHAT YOU'RE BUILDING

A complete portfolio website. Static HTML + CSS + vanilla JS. No frameworks, no build tools, no CMS. Self-hostable — D points a domain at it and it works.

**Read these companion docs before starting:**
- `02_Site_Architecture_Brief.md` — navigation, pages, URL structure
- `03_Design_System_Brief.md` — colors, typography, spacing, motion
- `04_Project_Page_Template_Brief.md` — project page layout and data structure
- `05_Content_Migration_Brief.md` — what content goes where
- `06_Copy_and_Voice_Guide.md` — tone, labels, meta tags

This doc covers the technical build only.

---

## FILE STRUCTURE

```
daltoncorr.com/
├── index.html                    # Home (slideshow)
├── about.html                    # About + Contact
├── press.html                    # Press mentions
├── work/
│   ├── index.html                # Work grid (all projects)
│   ├── hollyshorts-21.html       # Tier 1 project page
│   ├── hollyshorts-comedy.html
│   ├── hollyshorts-london.html
│   ├── hollyshorts-20.html
│   ├── dont-mind-me.html
│   ├── hdtracks.html
│   ├── cannes.html
│   ├── nice-knives.html
│   ├── polish-film-festival.html
│   ├── weissman.html             # Tier 2 project pages
│   ├── hollyshorts-19.html
│   ├── alchemy.html
│   ├── boys-will-be-flowers.html
│   ├── skyfire-artists.html
│   ├── little-issues.html
│   ├── hallelujah.html
│   ├── miles-regis.html
│   ├── dont-let-them-out.html
│   └── sunnys-journal.html
├── css/
│   └── style.css                 # Single stylesheet
├── js/
│   └── main.js                   # Single JS file
├── assets/
│   ├── images/
│   │   ├── home/                 # Slideshow hero images
│   │   ├── hollyshorts-21/       # Per-project image folders
│   │   ├── hollyshorts-comedy/
│   │   ├── ... (one folder per project)
│   │   └── about/                # About page headshot if any
│   └── fonts/                    # Self-hosted fonts (if not using Google Fonts CDN)
├── favicon.ico
├── favicon.svg                   # SVG favicon (modern browsers)
├── apple-touch-icon.png
├── site.webmanifest
└── robots.txt
```

---

## HTML STANDARDS

- Doctype: `<!DOCTYPE html>`
- Lang: `lang="en"`
- Charset: `<meta charset="UTF-8">`
- Viewport: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- Semantic elements: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- Every `<img>` has `alt`, `loading="lazy"` (except above-fold), `width`, `height`
- Every page has unique `<title>` and `<meta name="description">`
- Open Graph tags on every page (`og:title`, `og:description`, `og:image`, `og:url`)
- No inline styles. No inline scripts. All styling in `style.css`, all JS in `main.js`.
- Clean indentation (2-space tabs)
- HTML comments marking sections: `<!-- NAV -->`, `<!-- HERO -->`, `<!-- GALLERY -->`, etc.

---

## CSS ARCHITECTURE

Single file: `css/style.css`

### Structure (in order):

```css
/* ========================================
   1. CSS CUSTOM PROPERTIES
   ======================================== */
:root { ... }

/* ========================================
   2. RESET / BASE
   ======================================== */
*, *::before, *::after { box-sizing: border-box; }
/* Minimal reset — not a full normalize */

/* ========================================
   3. TYPOGRAPHY
   ======================================== */
body { ... }
h1, h2, h3 { ... }
p { ... }
a { ... }

/* ========================================
   4. LAYOUT
   ======================================== */
.container { ... }
.page-margin { ... }

/* ========================================
   5. NAVIGATION
   ======================================== */
.nav { ... }
.nav-mobile { ... }

/* ========================================
   6. HOME / SLIDESHOW
   ======================================== */
.slideshow { ... }
.slide { ... }

/* ========================================
   7. WORK GRID
   ======================================== */
.work-grid { ... }
.project-card { ... }
.filter-bar { ... }

/* ========================================
   8. PROJECT PAGE
   ======================================== */
.project-hero { ... }
.project-meta { ... }
.project-body { ... }
.project-gallery { ... }
.project-press { ... }
.project-nav { ... }

/* ========================================
   9. PRESS PAGE
   ======================================== */
.press-list { ... }
.press-entry { ... }

/* ========================================
   10. ABOUT PAGE
   ======================================== */
.about-bio { ... }
.about-contact { ... }

/* ========================================
   11. FOOTER
   ======================================== */
.footer { ... }

/* ========================================
   12. UTILITIES
   ======================================== */
.sr-only { ... }       /* Screen reader only */
.fade-in { ... }       /* Animation utility */

/* ========================================
   13. MEDIA QUERIES
   ======================================== */
@media (max-width: 1199px) { ... }  /* Tablet */
@media (max-width: 767px) { ... }   /* Mobile */
```

### Key CSS rules:
- All colors, spacing, fonts, and transitions use CSS custom properties from `:root`
- Mobile-first: base styles are mobile, media queries add desktop enhancements
- No `!important` anywhere
- No vendor prefixes needed unless supporting Safari < 15 (check with D)
- Grid for the work page layout, flexbox for everything else
- `max-width: var(--max-width)` on content containers, centered with `margin: 0 auto`

---

## JAVASCRIPT

Single file: `js/main.js`

### What JS handles:

1. **Slideshow (home page)**
   - Auto-advance timer (5s interval)
   - Manual navigation (dots + keyboard arrows)
   - Pause on hover/focus
   - Touch/swipe on mobile
   - Crossfade transition via CSS class toggling

2. **Filter system (work page)**
   - Click handler on filter buttons
   - Shows/hides cards by toggling a `hidden` class or `display` property
   - Smooth transition via CSS (`opacity` + `transform`)
   - Updates active state on filter buttons
   - URL hash update for shareable filter state (e.g., `/work/#design`)

3. **Sort toggle (work page)**
   - Reorders DOM elements based on `data-sort-order` (default) or `data-year` attributes
   - Default sort order is baked into HTML via `data-sort-order="1"`, `data-sort-order="2"`, etc.

4. **Mobile navigation**
   - Hamburger toggle → full-screen nav overlay
   - Body scroll lock when nav is open
   - Close on escape key
   - Focus trap for accessibility

5. **Lazy loading enhancement**
   - Native `loading="lazy"` handles most of it
   - Optional: IntersectionObserver for fade-in animation on scroll

6. **Image load transition**
   - Images start with `opacity: 0` via CSS
   - On `load` event, add class that transitions to `opacity: 1`

### What JS does NOT handle:
- No client-side routing (it's static HTML — each page is a full page load)
- No AJAX / fetch calls
- No animations library (all CSS transitions/animations)
- No analytics (D can add that himself later)
- No cookie banners
- No scroll hijacking

### JS size target: < 5KB minified.

---

## IMAGE HANDLING

### Optimization pipeline:
1. Source images downloaded from Squarespace scrape at highest resolution
2. Convert to WebP (with JPEG fallback for Safari < 14)
3. Generate 3 sizes per image:
   - `[name]-600w.webp` — mobile
   - `[name]-1200w.webp` — desktop
   - `[name]-2400w.webp` — retina
4. Use `<picture>` element or `srcset`:

```html
<img
  src="assets/images/hollyshorts-21/poster-1200w.webp"
  srcset="
    assets/images/hollyshorts-21/poster-600w.webp 600w,
    assets/images/hollyshorts-21/poster-1200w.webp 1200w,
    assets/images/hollyshorts-21/poster-2400w.webp 2400w
  "
  sizes="(max-width: 767px) 100vw, (max-width: 1199px) 80vw, 1400px"
  alt="21st Annual HollyShorts Film Festival official poster"
  width="1200"
  height="1600"
  loading="lazy"
>
```

### Naming convention:
```
assets/images/[project-slug]/[descriptor]-[size].webp
```
Examples:
- `assets/images/hollyshorts-20/poster-1200w.webp`
- `assets/images/hollyshorts-20/merch-hoodie-01-600w.webp`
- `assets/images/hollyshorts-20/production-lobby-2400w.webp`

### Placeholder images:
For projects awaiting assets (Don't Mind Me, Polish Film Festival, etc.), use a solid `--bg-secondary` colored rectangle at the correct aspect ratio. Add a code comment: `<!-- PLACEHOLDER: awaiting image from D -->`

---

## ACCESSIBILITY

- Skip navigation link (visually hidden, visible on focus)
- All images have descriptive `alt` text
- Color contrast ratio ≥ 4.5:1 for body text, ≥ 3:1 for large text
- Focus styles visible on all interactive elements (outline, not just color change)
- Keyboard navigation works on slideshow, filters, mobile nav
- `aria-label` on icon-only buttons (hamburger, slideshow arrows)
- `aria-current="page"` on active nav item
- Reduced motion: `@media (prefers-reduced-motion: reduce)` disables all animations

---

## PERFORMANCE CHECKLIST

- [ ] Total page weight < 2MB (home), < 3MB (heaviest project page)
- [ ] CSS < 20KB
- [ ] JS < 5KB minified
- [ ] No render-blocking resources
- [ ] Fonts loaded with `display=swap`
- [ ] All images lazy-loaded except first viewport
- [ ] No external dependencies except Google Fonts (or self-host fonts)
- [ ] Lighthouse Performance score ≥ 90
- [ ] First Contentful Paint < 1.5s on 4G

---

## HOSTING NOTES

The site should work when:
1. Served from any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3, or a VPS with nginx)
2. Opened directly as files in a browser (relative paths everywhere)
3. No server-side requirements whatsoever

Include a simple `robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://daltoncorr.com/sitemap.xml
```

Include a `sitemap.xml` listing all pages.

---

## BUILD ORDER

1. Set up file structure and CSS custom properties
2. Build the nav component (shared across all pages)
3. Build the home page (slideshow)
4. Build the work grid page (cards + filters + sort)
5. Build the project page template (one HTML file, reusable structure)
6. Generate all project pages from the template
7. Build the press page
8. Build the about page
9. Add JS functionality (slideshow, filters, mobile nav)
10. Image optimization pipeline
11. Accessibility pass
12. Performance audit
13. Cross-browser testing (Chrome, Safari, Firefox, mobile Safari, mobile Chrome)
14. Final QA against content migration checklist
