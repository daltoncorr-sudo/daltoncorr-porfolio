# Project Page Template Brief
## Standard layout for all `/work/[slug].html` pages

---

## OVERVIEW

Every Tier 1 and Tier 2 project gets its own page. All pages use the same template structure — the content changes, the bones don't. Consistency across project pages builds trust and lets the work speak without layout distractions.

---

## PAGE STRUCTURE (top to bottom)

```
┌─────────────────────────────────────────────┐
│ NAV BAR (fixed)                             │
├─────────────────────────────────────────────┤
│                                             │
│          HERO IMAGE (full-width)            │
│          max-height: 70vh                   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  PROJECT TITLE                              │
│  Role — Client — Location — Year            │
│  DISCIPLINE  DISCIPLINE  DISCIPLINE         │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  BODY TEXT (2–4 paragraphs)                 │
│  max-width: 720px, centered                 │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  IMAGE GALLERY                              │
│  (full-width images, generous spacing)      │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  PRESS MENTIONS (if applicable)             │
│  Linked to source articles                  │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  ← Previous Project    Next Project →       │
│                                             │
├─────────────────────────────────────────────┤
│ FOOTER                                      │
└─────────────────────────────────────────────┘
```

---

## SECTION SPECS

### 1. Hero Image

- Full viewport width (edge to edge, bleeds past page margins)
- `max-height: 70vh` — never taller than 70% of the viewport
- `object-fit: cover` — image fills the space without distortion
- The single strongest image for the project. Usually: the poster, the key production shot, or the defining visual.
- `alt` text required — descriptive of the project, not "hero image"
- Fades in on page load (opacity 0 → 1, 400ms)

### 2. Project Metadata Block

Centered text block below the hero. This is the "at a glance" info.

```html
<header class="project-meta">
  <h1 class="project-title">21st Annual HollyShorts Film Festival</h1>
  <p class="project-details">Art Director — HollyShorts Film Festival — Los Angeles — 2025</p>
  <div class="project-disciplines">
    <span class="tag">Art Direction</span>
    <span class="tag">Design</span>
    <span class="tag">Production Design</span>
    <span class="tag">Branding</span>
  </div>
</header>
```

**Styling:**
- Title: `--font-display`, `--text-3xl` desktop / `--text-2xl` mobile, `--text-primary`
- Details line: `--font-body`, `--text-base`, `--text-secondary`, weight 400. Items separated by em dashes.
- Tags: `--font-body`, `--text-xs`, uppercase, `--tracking-wide`, `--text-secondary`, with small left/right padding. No background color, no border — just styled text.
- Spacing: `--space-xl` above title, `--space-sm` between title and details, `--space-md` between details and tags

### 3. Body Text

The project description. 2–4 paragraphs max. This is the case study context — what was the brief, what did D do, what was the outcome.

**Styling:**
- Container: `max-width: var(--max-width-text)` (720px), centered
- Font: `--font-body`, `--text-lg`, weight 300 or 400, `--leading-relaxed`
- Color: `--text-primary`
- Paragraph spacing: `--space-md`
- Top margin from meta block: `--space-2xl`
- Bottom margin before gallery: `--space-3xl`

**Content guidance per tier:**

**Tier 1 (flagships) — 3–4 paragraphs:**
- Para 1: Context. What is this project? Who is the client? What was the challenge or opportunity?
- Para 2: D's role and scope. What specifically did D do? (List deliverables in flowing prose, not bullet points.)
- Para 3: The work itself — strategic decisions, key creative choices, anything notable about execution.
- Para 4 (optional): Outcome — press coverage, awards, impact, where the work appeared.

**Tier 2 (strong pieces) — 2 paragraphs:**
- Para 1: Context + role combined.
- Para 2: The work and any notable outcomes.

**Tier 3 (grid pieces) — No dedicated page.** Title + thumbnail + tags only, lives on the Work grid.

### 4. Image Gallery

The meat of the project page. This is where the work lives.

**Layout options (choose per project):**

**Option A: Single column, full-width**
Best for: posters, production design, event photography
- Each image takes full content width
- Spacing between images: `--space-xl` (48px)
- Images should be as large as possible

**Option B: Two-column pairs**
Best for: before/after, desktop + mobile, poster variants
- Two images side by side, 50/50 split
- Gap: `--space-md` (24px)
- Collapses to single column on mobile

**Option C: Mixed**
Best for: projects with many deliverables (HS20 with 80+ images)
- Hero shots go full-width
- Supporting images go in 2-column or 3-column grid
- Keeps the page from being endlessly long

**All images:**
- `loading="lazy"`
- `alt` text describing what's shown (e.g., "HollyShorts 20th anniversary poster featuring original illustration")
- Consistent horizontal margins matching page margins
- No captions unless the image genuinely needs context (e.g., "Production design, TCL Chinese Theatres lobby")
- If captions are used: `--font-body`, `--text-sm`, `--text-muted`, centered below image

### 5. Press Mentions (conditional)

Only appears if the project has press coverage. Pulls from the master press data.

```html
<section class="project-press">
  <h2>Press</h2>
  <ul>
    <li><a href="[url]" target="_blank">Variety — "HollyShorts 20th Anniversary Coverage"</a></li>
    <li><a href="[url]" target="_blank">Deadline — "HollyShorts Film Festival 2024"</a></li>
    <li><a href="[url]" target="_blank">FestivalsInLA — "World's Greatest Film Festival Posters 2024"</a></li>
  </ul>
</section>
```

**Styling:**
- Header: `--font-display`, `--text-xl`
- Links: `--font-body`, `--text-base`, `--text-secondary`, underline on hover
- Container: `max-width: var(--max-width-text)`, centered (same as body text)
- Top margin: `--space-3xl`

### 6. Previous / Next Navigation

Bottom of every project page. Links to adjacent projects in the default sort order.

```html
<nav class="project-nav">
  <a href="/work/hollyshorts-comedy" class="nav-prev">
    <span class="nav-label">Previous</span>
    <span class="nav-title">HollyShorts Comedy Rebrand</span>
  </a>
  <a href="/work/hollyshorts-london" class="nav-next">
    <span class="nav-label">Next</span>
    <span class="nav-title">HollyShorts London 2025</span>
  </a>
</nav>
```

**Styling:**
- Full-width bar, flex layout (prev left, next right)
- Label: `--font-body`, `--text-xs`, uppercase, `--tracking-wide`, `--text-muted`
- Title: `--font-display`, `--text-xl`, `--text-secondary` → `--text-primary` on hover
- Top border: 1px solid `--border`
- Padding: `--space-2xl` top/bottom
- On mobile: stack vertically (prev on top, next below)

---

## SPECIAL CASES

### Cross-discipline projects (e.g., Nice Knives)
When D did both design AND music for the same project, the page should include both. Show the poster work AND mention the score. Include an embedded audio player or link to the score if available. Tag both `DESIGN` and `FILM SCORE` in the disciplines.

### Combined projects (e.g., Cannes 2023 + 2024)
Present as a single page with clear year headers within the body text and gallery. "Cannes Film Festival — 2023 & 2024" as the title. Show both years of work in chronological order within one gallery.

### Projects with embedded media (film scores, songs)
For music projects, embed the audio/video player below the body text and above the image gallery:
- YouTube/Vimeo embeds: responsive container (16:9 aspect ratio)
- SoundCloud embeds: standard width, centered
- If no embed is available, a link to the streaming platform (Spotify, Apple Music, SoundCloud)

### Projects still awaiting assets (Don't Mind Me, Polish Film Fest, etc.)
Build the page with placeholder structure. Use a single strong image if available, write the body text, and leave the gallery minimal. Mark in code comments: `<!-- AWAITING ADDITIONAL IMAGES FROM D -->`. These pages go live with what we have and get enriched later.

---

## DATA STRUCTURE

For each project, Claude Code needs this data to build the page:

```json
{
  "slug": "hollyshorts-21",
  "title": "21st Annual HollyShorts Film Festival",
  "role": "Art Director",
  "client": "HollyShorts Film Festival",
  "location": "Los Angeles",
  "year": "2025",
  "disciplines": ["Art Direction", "Design", "Production Design", "Branding"],
  "body": "Two to four paragraphs of project description...",
  "hero_image": "hollyshorts-21-hero.jpg",
  "gallery_images": [
    { "src": "hs21-poster.jpg", "alt": "...", "layout": "full" },
    { "src": "hs21-merch-01.jpg", "alt": "...", "layout": "half" },
    { "src": "hs21-merch-02.jpg", "alt": "...", "layout": "half" }
  ],
  "press": [
    { "outlet": "Variety", "title": "...", "url": "..." }
  ],
  "embeds": [],
  "sort_order": 1,
  "tier": 1,
  "filter_tags": ["design", "art-direction"],
  "prev_slug": null,
  "next_slug": "hollyshorts-comedy"
}
```

The scrape spreadsheet will provide the raw content. This JSON structure is what the build script needs to generate the HTML pages. D reviews and adjusts the body text.

---

## CHECKLIST PER PROJECT PAGE

- [ ] Hero image selected and optimized (3 sizes: 600w, 1200w, 2400w)
- [ ] Title, role, client, location, year confirmed
- [ ] Disciplines tagged correctly
- [ ] Body text written (in D's voice, not placeholder)
- [ ] Gallery images selected, ordered, and optimized
- [ ] Alt text on every image
- [ ] Press links verified (not 404)
- [ ] Previous/Next nav links correct
- [ ] Page loads in < 2s on mobile
- [ ] Responsive at all 3 breakpoints
- [ ] No placeholder text ("Lorem ipsum for privacy") anywhere
