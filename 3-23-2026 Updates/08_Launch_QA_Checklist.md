# Launch & QA Checklist
## daltoncorr.com Rebuild

---

## PRE-LAUNCH QA

### Content Completeness

- [ ] Every Tier 1 project has a full case study page with hero, meta, body text, and gallery
- [ ] Every Tier 2 project has a complete page with hero, meta, body text, and images
- [ ] Every Tier 3 project has a card on the Work grid with thumbnail, title, tags, and year
- [ ] No placeholder text anywhere ("Lorem ipsum," "TBD," "Coming soon")
- [ ] About bio is current (references 21st HS, London, Comedy rebrand, feature score)
- [ ] All press links on Press page are live (not 404)
- [ ] Press links also appear on their respective project pages
- [ ] Contact info (email, Instagram, IMDb) is correct and linked
- [ ] All images are real (no placeholder rectangles on launched projects)
- [ ] Projects awaiting assets (Don't Mind Me, Polish Film Fest, etc.) are either: (a) launched with what's available, or (b) held for post-launch addition
- [ ] "21th" typo from old site is fixed everywhere
- [ ] No references to old Squarespace URLs or structure
- [ ] Footer copyright year is 2026

### Cross-reference against scrape spreadsheet

- [ ] Every image in the scrape spreadsheet is accounted for: migrated, intentionally excluded, or flagged as broken
- [ ] Every press link from the scrape is on the Press page
- [ ] Every project page in the scrape has a corresponding entry in the new site (migrated, combined, or archived)
- [ ] No orphan pages (URLs that exist but aren't linked from anywhere)

### Functionality

- [ ] Home slideshow auto-advances
- [ ] Home slideshow responds to arrow keys, dots, swipe
- [ ] Home slideshow pauses on hover/focus
- [ ] Each slide links to correct project page
- [ ] Work grid shows all projects on load (default sort)
- [ ] Filter buttons work: clicking "Design" shows only design projects
- [ ] Filter buttons: "All" resets to full grid
- [ ] Only one filter active at a time
- [ ] Sort toggle: "Year" reorders newest-first, "Default" restores D's custom order
- [ ] Work grid cards link to correct project pages
- [ ] Project pages: Previous/Next navigation links work and go to correct adjacent projects
- [ ] Mobile hamburger opens nav overlay
- [ ] Mobile nav closes on link click, escape key, and X button
- [ ] Body scroll is locked when mobile nav is open
- [ ] All external links open in new tab (`target="_blank"`)
- [ ] All internal links navigate correctly
- [ ] mailto: link on About page works

### Visual / Design

- [ ] Dark mode renders correctly — no white flashes on load
- [ ] Typography: display font loads (DM Serif Display or chosen alternative)
- [ ] Typography: body font loads (DM Sans or chosen alternative)
- [ ] Font fallbacks are acceptable if web fonts fail
- [ ] Colors match the design system (spot-check 5+ elements)
- [ ] Spacing is generous — images breathe, text has room
- [ ] No horizontal scrollbar on any page at any breakpoint
- [ ] No layout shifts when images load (width/height attributes set)
- [ ] Navigation bar looks correct at all breakpoints
- [ ] Work grid is 3-col desktop, 2-col tablet, 1-col mobile
- [ ] Project pages: hero image is full-width and impactful
- [ ] Project pages: body text is readable width (≤720px)
- [ ] Press page: entries are scannable, links are obvious
- [ ] About page: bio is visually distinct from contact section
- [ ] Footer is minimal and unobtrusive

### Responsive (test at these widths)

- [ ] 375px (iPhone SE)
- [ ] 414px (iPhone Pro)
- [ ] 768px (iPad portrait)
- [ ] 1024px (iPad landscape)
- [ ] 1440px (standard desktop)
- [ ] 1920px (large desktop)

### Browser Testing

- [ ] Chrome (latest)
- [ ] Safari (latest — macOS + iOS)
- [ ] Firefox (latest)
- [ ] Mobile Safari (iPhone)
- [ ] Mobile Chrome (Android)
- [ ] Edge (latest)

### Performance

- [ ] Lighthouse Performance ≥ 90
- [ ] Lighthouse Accessibility ≥ 95
- [ ] Lighthouse Best Practices ≥ 95
- [ ] Lighthouse SEO ≥ 95
- [ ] First Contentful Paint < 1.5s
- [ ] Total page weight < 2MB (home), < 3MB (heaviest project page)
- [ ] No render-blocking resources
- [ ] All images lazy-loaded (except first viewport)

### Accessibility

- [ ] Skip nav link works
- [ ] Tab order is logical on every page
- [ ] Focus styles visible on all interactive elements
- [ ] Screen reader announces page structure correctly (headings, landmarks)
- [ ] `alt` text on every image
- [ ] `aria-label` on icon-only buttons
- [ ] `aria-current="page"` on active nav link
- [ ] `prefers-reduced-motion` disables animations
- [ ] Color contrast passes WCAG AA (4.5:1 body, 3:1 large text)

### SEO / Meta

- [ ] Every page has unique `<title>`
- [ ] Every page has `<meta name="description">`
- [ ] Open Graph tags on every page
- [ ] `robots.txt` exists and allows crawling
- [ ] `sitemap.xml` exists and lists all pages
- [ ] Canonical URLs are set
- [ ] No duplicate content across URLs
- [ ] Favicon (ICO + SVG + Apple Touch Icon) works

---

## DOMAIN SWITCHOVER

### Before switching DNS:

1. [ ] Site is deployed to hosting (Netlify/Vercel/Cloudflare/VPS)
2. [ ] Site works at the temporary/staging URL
3. [ ] SSL certificate is provisioned for daltoncorr.com
4. [ ] All QA above passes on the staging URL
5. [ ] D has reviewed and approved all content
6. [ ] Backup of current Squarespace site is taken (export)

### DNS switch:

1. [ ] Update DNS A/CNAME records to point to new host
2. [ ] Set TTL low (300s) before the switch, then increase after propagation
3. [ ] Verify SSL works on the live domain
4. [ ] Test all pages on the live URL

### After switching:

1. [ ] Old Squarespace site is either paused or cancelled (after confirming new site is stable)
2. [ ] Set up redirects if any old URLs need to forward (e.g., `/design/hollyshorts20` → `/work/hollyshorts-20`)
3. [ ] Google Search Console: submit new sitemap, request re-index
4. [ ] Test site from a phone using Instagram link-in-bio flow (the most common entry point)

---

## REDIRECT MAP

Old Squarespace URLs that may be indexed or bookmarked need to redirect to new locations. If hosting on Netlify/Vercel/Cloudflare, use their redirect config. If on a VPS, use nginx rewrite rules.

| Old URL | New URL | Type |
|---------|---------|------|
| `/design` | `/work/` | 301 |
| `/music` | `/work/` | 301 |
| `/design/hollyshorts20` | `/work/hollyshorts-20` | 301 |
| `/design/hollyshorts-london` | `/work/hollyshorts-london` | 301 |
| `/design/cannes-2024` | `/work/cannes` | 301 |
| `/design/cannes-2023` | `/work/cannes` | 301 |
| `/design/hdtracks` | `/work/hdtracks` | 301 |
| `/design/hcsff8` | `/work/hollyshorts-comedy` | 301 (redirects to the rebrand) |
| `/design/little-issues` | `/work/little-issues` | 301 |
| `/design/timewriter` | `/work/` | 301 (archived — grid only) |
| `/music/boys` | `/work/boys-will-be-flowers` | 301 |
| `/music/tan` | `/work/` | 301 (grid only) |
| `/music/leave-me` | `/work/` | 301 (grid only) |
| ... | ... | ... |

**Generate the full redirect map from the scrape spreadsheet.** Every old URL that had content needs a redirect to its new location.

---

## POST-LAUNCH (First 2 Weeks)

### Week 1:
- [ ] Monitor for any 404s via hosting analytics or Google Search Console
- [ ] Fix any issues that emerge from real traffic
- [ ] D posts Instagram announcement ("New site is live" — link in bio update)
- [ ] Submit sitemap to Google Search Console
- [ ] Verify all redirects are working

### Week 2:
- [ ] Add any projects that were held for post-launch (awaiting assets)
- [ ] Review analytics: which pages get traffic, which don't
- [ ] Adjust Work grid order if needed based on engagement
- [ ] Begin Instagram content rollout for unreleased projects (Weissman, Polish Film Fest, etc.)

---

## OPEN QUESTIONS FOR D (resolve before launch)

1. Hosting preference: Netlify (free, easy) vs. Vercel vs. Cloudflare Pages vs. own VPS?
2. Domain registrar: where is daltoncorr.com registered? (Need access to change DNS)
3. Email: is there a preferred contact email for the site?
4. Instagram handle: what's the exact handle for linking?
5. Analytics: want Google Analytics, Plausible, or nothing?
6. Any projects from the "awaiting assets" list ready before launch?
7. Final approval on About page bio text
8. Final approval on default project sort order
