# Site Architecture & Navigation Brief
## daltoncorr.com Rebuild

---

## NEW NAVIGATION (4 tabs)

```
HOME    WORK    PRESS    ABOUT
```

That's it. Four tabs. No dropdowns, no hamburger-hiding-everything on desktop, no sub-navigation. Clean top bar.

---

## PAGE 1: HOME (`/index.html`)

### Layout: Full-bleed slideshow, center-justified

A full-viewport slideshow that auto-advances. Each slide is one project highlight — large image, project title, and a one-line descriptor. Center-justified text overlaid on or beneath the image.

### Slideshow Content (D chooses final order — this is the recommended default)

| Slide | Project | Image | Title Line | Descriptor |
|-------|---------|-------|------------|------------|
| 1 | HollyShorts 21st | Hero poster or production shot | 21st Annual HollyShorts Film Festival | Art Director — TCL Chinese Theatres, 2025 |
| 2 | HollyShorts Comedy Rebrand | New logo/identity system | HollyShorts Comedy | Brand Identity & Creative Direction, 2025 |
| 3 | HollyShorts London | London poster or event shot | HollyShorts London | Creative Direction — International Expansion, 2025 |
| 4 | Don't Mind Me | Film still or scoring session (when available) | Don't Mind Me | Feature-Length Film Score, 2025 |
| 5 | HollyShorts 20th | Anniversary poster (original illustration) | 20th Annual HollyShorts Film Festival | Art Director — TCL Chinese, Egyptian Theater, Japan House, 2024 |
| 6 | Cannes | Kodak event illustration | Cannes Film Festival | Illustration & Poster Design — Kodak, 2023–2024 |
| 7 | HDtracks | Website redesign mockup | HDtracks | Director of Marketing, Lead Designer — Full Rebrand |

Each slide links to its project page under `/work/`.

### Behavior
- Auto-advance every 5–6 seconds
- Manual navigation (dots or arrows, minimal)
- Keyboard accessible (arrow keys)
- Swipe on mobile
- Pause on hover/focus
- No slide counter — dots only, small, bottom-center
- Transition: crossfade or clean horizontal slide. No zoom effects, no Ken Burns.

### Below the slideshow
Nothing. The home page IS the slideshow. Maybe a small scroll indicator or the nav, but no "about me" blurb, no services list, no testimonials. The work speaks.

---

## PAGE 2: WORK (`/work/index.html`)

### Layout: Card grid with filters and sort

All projects displayed as cards. Each card shows: thumbnail image, project title, disciplines (as small tags), and year.

### Filter System

Filters appear as a horizontal row of toggles above the grid:

```
ALL    DESIGN    MUSIC    ART DIRECTION    ILLUSTRATION    FILM SCORE    BRANDING
```

Clicking a filter shows only matching projects. "ALL" resets. Multiple filters should NOT be combinable — one active filter at a time. Keep it simple.

**Optional secondary filter row for location:**
```
Los Angeles    New York    London    Cannes    Prague    International
```

This is nice-to-have. Implement only if it doesn't clutter the UI.

### Sort Options

Small sort control (dropdown or toggle), top-right:

- **Default** — D's hand-picked order (curated, not chronological). This is the primary sort and should be the default on page load.
- **Year** — newest first

### Card Design

Each card:
```
┌─────────────────────────────┐
│                             │
│     [Project Thumbnail]     │
│       (aspect ratio:        │
│        consistent crop      │
│        or masonry)          │
│                             │
├─────────────────────────────┤
│  Project Title              │
│  DESIGN  ART DIRECTION      │  ← discipline tags, small caps
│  2025                       │
└─────────────────────────────┘
```

Cards link to individual project pages at `/work/[slug].html`.

### Grid Behavior
- 3 columns desktop, 2 tablet, 1 mobile
- Cards should have hover state (subtle scale, overlay, or opacity shift — not dramatic)
- Filter transitions should be smooth (fade or layout shift, no popping)
- Lazy-load images below the fold

### Project Order (Default Sort)

This is the recommended default order. D approves/adjusts.

**Tier 1 — Lead with these:**
1. HollyShorts 21st Film Festival (2025)
2. HollyShorts Comedy Rebrand (2025)
3. HollyShorts London (2025)
4. HollyShorts 20th Film Festival (2024)
5. Don't Mind Me — Feature Score (2025) [when ready]
6. HDtracks Rebrand
7. Cannes 2023 + 2024 (combined)
8. Nice Knives (cross-discipline)
9. Polish Film Festival [when ready]

**Tier 2 — Strong pieces:**
10. Weissman [when ready]
11. HollyShorts 19th (2023)
12. Alchemy — Film Score
13. Boys Will Be Flowers — Film Score
14. Skyfire Artists
15. LiTTLE iSSUES
16. Hallelujah (Spike Lee)
17. Miles Regis
18. 2025 Composition Reel
19. Don't Let Them Out [when ready]
20. Sunny's Journal [when ready]

**Tier 3 — Grid fill:**
21–35. No Regrets Remix, Blob Dylan: Gazoo, Tan Paints the Tenderloin, I Think Of You, BAXTER, 8th Comedy Shorts, Cannes 2023 (if not combined), Kid Nicoleman, HollyShorts 18th, Jeff Black, Creatives for Ukraine, HS Monthly Screening, earlier comedy festival years, remaining film posters, remaining songs

**Tier 4 — Archive (do not display by default):**
Chop Suey Club, pre-2018 Prague scores, 2022 Reel, duplicate pages

### Music vs. Design Unification

On the current site, design and music are separate sections. On the new site, **everything lives in one unified Work grid.** The filter system handles the separation. This is critical — it positions D as one creative who does both, not two separate practitioners sharing a URL.

---

## PAGE 3: PRESS (`/press.html`)

### Layout: Clean list of press mentions, all hyperlinked

Every press mention, interview, and feature — organized by year (newest first). Each entry is a single line or small block:

```
2024
─────
Variety — "HollyShorts 20th Anniversary Coverage"              →
Deadline — "HollyShorts Film Festival 2024"                    →
Daily Mail — Coverage of HollyShorts 20th                      →
FestivalsInLA — "World's Greatest Film Festival Posters 2024"  →
Canvas Rebel — Interview with Dalton Corr                      →
AwardsDaily — HollyShorts Coverage                             →
TimeOut — HollyShorts 2024                                     →

2023
─────
Deadline — "HollyShorts Film Festival 2023"                    →
Variety — HollyShorts 19th Coverage                            →
FestivalsInLA — "World's Greatest Film Festival Posters 2023"  →
Radio du Cinéma — Interview                                    →
LAist — "Things To Do This Week" (Comedy Shorts)               →

2022
─────
LAist — Comedy Shorts Festival Coverage                        →
Broadway World — Comedy Shorts Coverage                        →
Darian Burns / 1st Day Fresh — No Regrets Remix Review         →

2019
─────
NOWNESS — Boys Will Be Flowers Feature                         →

~2015
─────
Et Musique Pour Tous — After The Show EP Review                →
Noon Pacific — Feature                                         →
Washington Square News — I Think Of You (print + online)       →
```

### Requirements
- Every single link from the current `/press` page must be migrated here
- All links must be hyperlinked and open in new tab
- All links must be checked for 404s before launch (the scrape spreadsheet will flag these)
- Include the outlet name, article title/description, and the link
- Group by year
- If a press mention relates to a specific project, that project name should be visible (for cross-reference)
- Add any press mentions currently buried on the about page or individual project pages — centralize them ALL here

### Press page also serves as social proof
This page does double duty: it's a press archive AND a credibility signal. A potential client scanning this page sees Variety, Deadline, Daily Mail, NOWNESS, Canvas Rebel. That's the point.

---

## PAGE 4: ABOUT (`/about.html`)

### Layout: Bio + Contact, one page

Split into two sections on the same page: About (top) and Contact (bottom).

### About Section

Short bio. Direct. Not LinkedIn. Not third-person-agency-speak. Written in a voice that sounds like D talking to a potential collaborator.

**Current bio (from site) needs rewriting.** The existing copy references "18th, 19th, and 20th" — it's already out of date (21st happened). The new bio should be:

- 3–4 sentences max for the lead paragraph
- Mention the dual capability: creative direction/design AND music composition
- Name-drop strategically: HollyShorts (Oscar-qualifying), Cannes, Kodak, HDtracks, Chesky Records (Grammy-winning)
- Location: Los Angeles (Venice can be mentioned or not — D's call)
- No laundry list of skills. No "proficient in Adobe Creative Suite."
- Tone: "Here's who I am. Here's what I do. Here's who I've done it for."

Below the lead paragraph, optional expandable section or small text block with:
- Education (NYU, B.M. Music Composition & Music Business)
- Espresso Tempo / Corr Tunes (if D wants to keep these)
- Book citation (Lennon and McCartney: Painting With Sound)
- Any other credentials

### Contact Section

On the same page, below the bio:
- Email address (clickable mailto:)
- Instagram handle (linked)
- IMDb profile (linked)
- Optionally: Twine, LinkedIn, or other professional profiles

No contact form unless D specifically wants one. A mailto link is faster and more direct.

---

## PROJECT PAGES (`/work/[slug].html`)

Every project that gets its own page (Tier 1 and Tier 2) uses a consistent template. See the separate "Project Page Template Brief" doc for the full spec.

Quick summary:
- Hero image (full-width)
- Project title, role, client, year, location, disciplines
- Body text (2–4 paragraphs of context — what, why, how)
- Image gallery (large images, generous spacing)
- Press links (if applicable, pulled from the press data)
- Previous / Next navigation at bottom

---

## URL STRUCTURE

```
/                           → Home (slideshow)
/work/                      → Work grid (all projects)
/work/hollyshorts-21        → Project page
/work/hollyshorts-comedy    → Project page
/work/hollyshorts-london    → Project page
/work/hollyshorts-20        → Project page
/work/dont-mind-me          → Project page
/work/hdtracks              → Project page
/work/cannes                → Project page (combined 2023+2024)
/work/nice-knives           → Project page
/work/[slug]                → etc.
/press                      → Press page
/about                      → About + Contact
```

No `/design/` or `/music/` prefixes. Everything is under `/work/`. One namespace, one creative.

---

## RESPONSIVE BREAKPOINTS

- Desktop: 1200px+
- Tablet: 768px–1199px
- Mobile: < 768px

Mobile is primary. Most traffic comes from Instagram link-in-bio taps on phones.

---

## PERFORMANCE TARGETS

- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Total page weight (home): < 2MB including hero images
- No render-blocking JS
- All images lazy-loaded except first viewport
- CSS loaded in `<head>`, JS deferred
