# Design System & Visual Direction Brief
## daltoncorr.com Rebuild

---

## DESIGN PHILOSOPHY

This is a portfolio for someone who art directs film festivals and scores features. The site itself needs to feel art-directed — not templated, not generic, not "Squarespace default." Every choice should feel intentional and earned.

**The work is the product.** The design system exists to frame the work, not compete with it. Think museum, not magazine. The architecture and typography do the talking. The imagery does the selling.

---

## COLOR

### Direction: Dark mode. Committed.

D's work is visual — posters, illustrations, event photography, film stills. These read best on dark backgrounds. Dark mode isn't a toggle option; it's the identity.

```css
:root {
  /* Backgrounds */
  --bg-primary:       #0A0A0A;     /* Near-black, not pure #000 */
  --bg-secondary:     #141414;     /* Slight lift for cards, sections */
  --bg-surface:       #1A1A1A;     /* Hover states, active elements */
  
  /* Text */
  --text-primary:     #F0F0F0;     /* Main body text — warm off-white */
  --text-secondary:   #8A8A8A;     /* Captions, metadata, dates */
  --text-muted:       #555555;     /* Tertiary info, disabled states */
  
  /* Accent — use sparingly */
  --accent:           #E8E8E8;     /* Near-white accent for links, active filters */
  --accent-hover:     #FFFFFF;     /* Pure white on hover */
  
  /* Borders & Dividers */
  --border:           #222222;     /* Subtle dividers */
  --border-hover:     #333333;     /* Hover state borders */
  
  /* Utility */
  --overlay:          rgba(0,0,0,0.6);  /* Image overlays */
  --shadow:           rgba(0,0,0,0.4);  /* Drop shadows */
}
```

### Why no color accent?
D's projects ARE the color. The posters, the illustrations, the event photography — those bring all the vibrancy. The site itself stays neutral so the work pops. If an accent color is needed later (for a specific element), pull it from D's most iconic work. But start without one.

---

## TYPOGRAPHY

### Direction: Editorial, not tech. Distinctive, not decorative.

**Two fonts maximum.** One display, one body. Both loaded from Google Fonts or self-hosted (no CDN dependency on Squarespace).

### Recommended Pairing (Option A — Editorial Authority)

```css
/* Display: Used for project titles, page headers, the name "Dalton Corr" */
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap');

/* Body: Used for descriptions, bio, captions, metadata */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');

:root {
  --font-display: 'DM Serif Display', Georgia, serif;
  --font-body:    'DM Sans', Helvetica, sans-serif;
}
```

**DM Serif Display** — sharp, editorial, high-contrast serifs. Reads as "creative professional" not "corporate." Works at large and small sizes. Not overused in portfolio sites the way Playfair Display is.

**DM Sans** — clean geometric sans that pairs naturally (same design family). Light weights (300) for body copy give it breathing room. Medium (500) for UI elements, tags, nav.

### Recommended Pairing (Option B — Typographic Confidence)

```css
/* Display */
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap');

/* Body */
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&display=swap');

:root {
  --font-display: 'Instrument Serif', Georgia, serif;
  --font-body:    'Instrument Sans', Helvetica, sans-serif;
}
```

**Instrument Serif** — elegant, slightly warmer than DM Serif. Has a calligraphic quality without being script. Feels more artistic.

**Instrument Sans** — modern, well-spaced. Excellent readability.

### My pick: Option A. 
DM Serif Display has more authority. D needs to look like a creative director, not just a creative. Option B is softer — better for an illustrator's portfolio than an art director's.

D makes the final call.

### Type Scale

```css
:root {
  /* Scale based on 1.25 ratio (Major Third) */
  --text-xs:    0.75rem;    /* 12px — tags, micro labels */
  --text-sm:    0.875rem;   /* 14px — captions, metadata */
  --text-base:  1rem;       /* 16px — body copy */
  --text-lg:    1.125rem;   /* 18px — lead paragraphs */
  --text-xl:    1.5rem;     /* 24px — section heads */
  --text-2xl:   2rem;       /* 32px — project titles */
  --text-3xl:   2.5rem;     /* 40px — page titles */
  --text-4xl:   3.5rem;     /* 56px — hero/home title */
  --text-5xl:   5rem;       /* 80px — name on home (if used) */
  
  /* Line heights */
  --leading-tight:   1.1;
  --leading-snug:    1.3;
  --leading-normal:  1.6;
  --leading-relaxed: 1.8;
  
  /* Letter spacing */
  --tracking-tight:  -0.02em;  /* Display type */
  --tracking-normal: 0;        /* Body */
  --tracking-wide:   0.08em;   /* All-caps labels, tags */
  --tracking-wider:  0.12em;   /* Nav items */
}
```

### Typography Rules
- Project titles: `--font-display`, `--text-2xl` to `--text-4xl`, `--leading-tight`
- Body copy: `--font-body`, `--text-base` or `--text-lg`, `--leading-normal` to `--leading-relaxed`, font-weight 300 or 400
- Navigation: `--font-body`, `--text-sm`, weight 500, `--tracking-wider`, uppercase
- Tags/disciplines: `--font-body`, `--text-xs`, weight 500, `--tracking-wide`, uppercase
- Captions: `--font-body`, `--text-sm`, `--text-secondary`
- No bold in body copy unless essential. Use weight 500 max for emphasis.
- No italics for emphasis — use color or weight shift instead.

---

## SPACING

```css
:root {
  --space-xs:   0.5rem;    /* 8px */
  --space-sm:   1rem;      /* 16px */
  --space-md:   1.5rem;    /* 24px */
  --space-lg:   2rem;      /* 32px */
  --space-xl:   3rem;      /* 48px */
  --space-2xl:  4rem;      /* 64px */
  --space-3xl:  6rem;      /* 96px */
  --space-4xl:  8rem;      /* 128px */
  
  /* Page margins */
  --page-margin-desktop: 4rem;
  --page-margin-tablet:  2rem;
  --page-margin-mobile:  1.25rem;
  
  /* Max content width */
  --max-width:        1400px;
  --max-width-text:   720px;   /* For body copy readability */
}
```

### Spacing philosophy
Generous. Let the work breathe. The space between images is as important as the images themselves. Project pages should feel like a gallery, not a feed.

---

## IMAGES

### Treatment
- No borders, no rounded corners, no shadows on project images
- Images display edge-to-edge within their container or with consistent margins
- Aspect ratios preserved — never stretch or crop awkwardly
- On project pages, images should be LARGE. Minimum 80% viewport width for hero images.

### Loading
- `loading="lazy"` on all images except first viewport
- `srcset` with 3 sizes: 600w (mobile), 1200w (tablet/desktop), 2400w (retina)
- Placeholder: CSS background matching `--bg-secondary` until loaded (no blur-up, no skeleton)
- `alt` text on every image — descriptive, not decorative

### Gallery Layouts (Project Pages)
- Single column for maximum impact (one image per row, full-width)
- Optional 2-column for related pairs (e.g., poster front + back, desktop + mobile)
- No masonry on project pages — controlled, intentional layout
- Masonry is fine for the Work grid page

---

## MOTION & INTERACTION

### Philosophy: Subtle, fast, intentional. No flourish.

```css
:root {
  --ease-default:    cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-out:        cubic-bezier(0, 0, 0.25, 1);
  --duration-fast:   150ms;
  --duration-normal: 250ms;
  --duration-slow:   400ms;
}
```

### Approved animations
- **Page load:** Content fades in with slight upward translate (20px). Staggered by element (title → meta → images). Duration: 400ms.
- **Card hover (Work grid):** Subtle scale (1.02) + image brightness shift. Duration: 250ms.
- **Link hover:** Color shift to `--accent-hover`. Underline reveal (left-to-right). Duration: 150ms.
- **Filter toggle:** Cards fade/reflow smoothly. No pop-in. Duration: 300ms.
- **Slideshow transitions:** Crossfade between slides. Duration: 600ms.
- **Image load:** Fade from 0 to 1 opacity when loaded. Duration: 300ms.

### Not approved
- Parallax scrolling
- Scroll-triggered animations on individual elements (no "every section animates in")
- Hover animations that involve rotation, 3D transforms, or color overlays on images
- Loading spinners or progress bars
- Cursor effects
- Page transition animations between pages

---

## COMPONENTS

### Navigation Bar
- Fixed top, full-width
- Background: `--bg-primary` with slight transparency + backdrop-blur (only if content scrolls behind it)
- Left: "Dalton Corr" — `--font-display`, `--text-lg`, links to home
- Right: HOME WORK PRESS ABOUT — `--font-body`, `--text-sm`, uppercase, `--tracking-wider`
- Mobile: Hamburger (right-aligned), opens full-screen overlay with centered nav links
- Active state: `--accent` color on current page link
- No logo graphic unless D has one — the name IS the logo

### Project Cards (Work Grid)
- Thumbnail image (consistent aspect ratio — 4:3 or 3:2, D chooses)
- Title below image: `--font-display`, `--text-xl`
- Discipline tags: `--font-body`, `--text-xs`, uppercase, `--tracking-wide`, `--text-secondary`
- Year: `--font-body`, `--text-xs`, `--text-muted`
- Hover: card lifts slightly (translate-y -4px), image brightens

### Filter Bar (Work Page)
- Horizontal scroll on mobile, wrapping on desktop
- Pill-shaped buttons or simple text toggles
- Active filter: `--text-primary` + underline or `--bg-surface` background
- Inactive: `--text-secondary`
- "All" is always first

### Press Entry (Press Page)
- Single line per entry: Outlet — Title [→]
- Outlet name: `--font-body`, weight 500
- Title: `--font-body`, weight 400, `--text-secondary`
- Arrow or external link icon: `--text-muted`
- Hover: full line shifts to `--text-primary`
- Grouped under year headers: `--font-display`, `--text-xl`

### Footer
- Minimal. One line.
- "© 2026 Dalton Corr" + email + Instagram link
- `--text-muted`, `--text-xs`
- No sitemap, no "back to top," no newsletter signup

---

## WHAT THIS IS NOT

- Not a dark theme with neon accents (that's a DJ portfolio)
- Not a minimalist white gallery (that's a photographer)
- Not a card-heavy SaaS dashboard (that's a product designer)
- Not a Cargo/ReadyMag "art site" with experimental scroll (that's a student)

This is: **a creative director's portfolio that looks like a creative director made it.** Clean authority. Dark confidence. The work does the work.
