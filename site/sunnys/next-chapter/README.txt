SUNNY'S BOOKSHOP — THE NEXT CHAPTER
An unlisted pitch page. Static files only: no build step, no server code, no database, no analytics.

WHAT TO DO WITH THIS FOLDER
Copy the folder as it is into the site at its unlisted path (for example /sunnys/next-chapter/) and serve it as static
files. Do not edit, rename, minify or re-bundle anything inside it: every path is relative.
Serve the page with a trailing slash (/sunnys/next-chapter/ -> index.html). Without it the relative paths resolve one
level too high, so redirect /sunnys/next-chapter to /sunnys/next-chapter/.

KEEP IT UNLISTED
- index.html already carries <meta name="robots" content="noindex, nofollow, noarchive"> and a no-referrer policy.
- Also add a Disallow line for the path to the site's robots.txt, and leave it out of the sitemap, menus and indexes.
- No site-wide analytics, tag managers, chat widgets or tracking scripts on this path.
- Keep the page's own <title>. There is deliberately no Open Graph or Twitter card and no share image.

CONTENTS
index.html            the page (seven sections; one stylesheet, ES modules, an import map for three.js)
css/page.css          all styles
js/main.js            scroll engine: parallax plates, floating objects, the drawing scrub, the Tarzana/NoHo slider, AR buttons
js/objects.js         the floating 3D objects (three.js); js/phone-screen.js and js/laptop-screen.js draw their live screens
assets/               images (WebP), outlined headlines (SVG), the drawing sequence (seq/), phone fallback frames (turn/),
                      website screens and a short muted video (web/), merch, covers, plates
models/               six GLB models (Draco-compressed, WebP textures) and studio_small_09_512.hdr (lighting)
models/ar/            SB-NC-seal.usdz and SB-NC-sign.usdz for iPhone AR Quick Look
fonts/                EB Garamond, Cormorant Garamond, Jost as WOFF2 subsets, each with its OFL licence
vendor/three/         three.js r170 + GLTF, Draco and RGBE loaders + the Draco decoder (WASM and JS)
vendor/model-viewer/  model-viewer 4.3.1, loaded only on phones, only when an AR button is near (for Android Scene Viewer
                      and iPhone Quick Look)

MIME TYPES (set these if the host does not already)
.glb   model/gltf-binary          .usdz  model/vnd.usdz+zip       .hdr  application/octet-stream
.wasm  application/wasm           .woff2 font/woff2               .mp4  video/mp4
.webp  image/webp                 .svg   image/svg+xml            .js   text/javascript   .json application/json

CACHING
index.html: no-cache (or a short max-age). Everything else can be cached for a long time (for example 30 days).
File names are not fingerprinted, so purge the CDN cache if any file in this folder is replaced later.

IF THE SITE SENDS A CONTENT-SECURITY-POLICY
This path needs at least:
  script-src 'self' 'wasm-unsafe-eval' plus the hash of the inline import map (or 'unsafe-inline')
  worker-src 'self' blob:        (the Draco decoder runs in a worker)
  img-src 'self' data: blob:     (3D textures are decoded from blob: URLs)
  connect-src 'self'
  media-src 'self'
  style-src 'self'
The simplest course is to exempt this path from the site-wide policy.

BEHAVIOUR TO CHECK AFTER DEPLOY
- Desktop: each section's 3D object turns with the scroll and crosses into the next section (WebGL).
- Phones under 700 px wide or browsers without WebGL: the objects become pre-rendered frame sequences (assets/turn/).
- prefers-reduced-motion: everything sits still; stills replace motion.
- AR: on an iPhone or Android phone, "See the sign in your room" (top of the last green section) and "See the seal in your
  room" (footer) open the model in the camera. They do not appear on desktop.
- The Tarzana/NoHo slider drags with mouse, touch or the keyboard.

SIZE AND SPEED
About 24 MB in total, loaded lazily. The AR files (7 MB) and model-viewer (1 MB) download only when the AR button is
used on a phone. Mobile Lighthouse with simulated throttling, measured Oct 6 2026: performance 98, accessibility 100,
best practices 100 (LCP 2.3 s, CLS 0).

LICENCES
three.js (MIT, vendor/three/LICENSE) · Draco decoder (Apache-2.0) · model-viewer (Apache-2.0, vendor/model-viewer/LICENSE) ·
studio_small_09 HDRI (CC0, Poly Haven) · EB Garamond, Cormorant Garamond, Jost (SIL OFL 1.1, fonts/OFL-*.txt).
The headlines and marks are outlined artwork; no other font files are included.
All artwork © Sunny's Bookshop / Dalton Corr.
