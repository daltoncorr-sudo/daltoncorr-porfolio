/* Dalton Corr — glass-bubble.js

   Bencho's "Glass bubble" (MIT, bencho.dev/licence), ported from React to
   plain JS the way the HollyShorts 21 badge carousel was, and put on the
   home slideshow. Bencho's comments are kept: they say why the numbers are
   what they are. Notes marked HERE are about this site.

   HERE: Bencho's block owns its picture, a fixed square photograph. On this
   site the picture is whichever slide is showing, so the component is handed
   the slideshow as its stage and asks it for the current <img>. The ball
   still has the run of the stage plus a margin, and the refraction is still
   a displacement map. */
(function () {
'use strict';

/* ══ Glass bubble ══════════════════════════════════════════
   A square picture and a ball of glass you drag over it. The
   picture is the only content; the bubble is the whole block.

   ── THE REFRACTION IS A DISPLACEMENT MAP, NOT A BLUR ─────
   Every "glass" effect on the web is one of three things. A
   blur with a white wash over it, which is frosted plastic. A
   scale transform, which is a magnifying glass — the middle
   grows and the edge shows nothing. Or a real displacement,
   where each pixel under the ball is read from somewhere else,
   and that is the one that looks like glass, because it is the
   only one doing what glass does.

   The map is a picture: red is how far to read sideways, green
   how far up or down, both measured from 128. `feDisplacementMap`
   then samples the backdrop through it. Drawn on a canvas once
   per size and per setting rather than shipped as an asset, so
   there is nothing to keep in step with the knobs.

   ── AND THE RIM READS PAST ITS OWN EDGE ─────────────────
   This is the thing that took four attempts and is the whole
   difference between glass and a magnifier. `f(1)` is greater
   than 1: the outermost ring of the bubble shows what is
   AROUND it, gathered in and squeezed into a band — which is
   what a ball of glass on a table actually does. Every version
   that only ever sampled INWARD looked like a lens lying on a
   photograph, however hard it bent the middle.

   ── WHY NOT THE PHYSICS ─────────────────────────────────
   The honest formula for a sphere is `tan(theta - phi)` off
   Snell's law, and it is unusable here: it runs away at the
   rim, so every pixel out there reads the same few in the
   middle and the disc fills with radial smear. What is here
   instead is a radius mapping, u -> f(u), monotonic by
   construction — no two output pixels can read the same input,
   so there is nothing to smear. It is a description of what a
   lens LOOKS like rather than of what light does, which is the
   right kind of wrong for a component.

   ── THE LIGHT IS HALF OF IT ─────────────────────────────
   Refraction alone reads as a hole in the picture. What says
   "solid transparent object" is the specular: a soft cap up and
   left with a hard little spot inside it, a weaker catch at the
   far side where light has come through and out again, and a
   rim that is brightest where the light is. Same argument the
   glass card's edge makes in the stylesheet — a flat ring is a
   border, a lit one is a thickness. */

/* ── the room the ball moves in ────────────────────────────
   The block is the picture plus a margin on every side, and
   the ball has the run of the whole of it. It is not held near
   the photograph: it can sit completely off it, in any
   direction, and be a ball of glass on the card with nothing
   behind it.

   THE ROOM HAS TO BELONG TO THE BLOCK. .bench-card,
   .bench-card-stage and .dtl-block all clip, so a ball that
   simply overflowed the picture would be cut off square by
   whichever of those it reached first — and cut at a different
   place on the wall than in the overlay, because they are
   different distances away. Making the margin part of the
   component means nothing outside it ever has an opinion about
   where the ball may go, and the only bound is the block's own
   edge.

   IT NO LONGER CLEARS THE PICTURE, and that is the trade this
   number IS. It was 48 first, sized for crossing the edge; then
   120, which was the default ball, so the ball could sit
   completely off the photograph. The default ball is 180 now,
   and 100 lets a little over half of it leave — enough that the
   edge is something you cross rather than a wall, which was the
   point, and short of the full escape.

   HERE: the same proportion, a little over half the ball, so
   it scales with the smaller phone ball below. The slideshow
   doesn't clip, so the only other bound is the page area around
   it (opts.bounds): the ball never slides under the nav or off
   the screen. */
function escapeFor(d) { return Math.round(d * 0.56); }

/* the displacement `scale` the filter is handed. The encoding in
   lensMap is its exact inverse, so this one number is the only
   thing the two have to agree about — and ±SCALE/2 is the
   furthest any pixel can be asked to reach. Exported because a
   renderer that does the displacement ITSELF, rather than
   handing a map to feDisplacementMap, still has to agree with
   it.

   HERE: 160 is Bencho's number for their 180 ball. The map can only
   encode ±scale/2, and the rim reaches about 0.94 of the radius past
   itself, so a bigger ball needs a bigger scale or its outer ring goes
   flat. It grows in proportion to the ball: 180 still gets exactly 160. */
var SCALE = 160;
function scaleFor(d) { return Math.round(SCALE * d / 180); }

/* ── where every pixel of the ball reads from ───────────────
   One field of offsets in PIXELS, and the one description of
   what this lens does. It was inside lensMap, which was fine
   while feDisplacementMap was the only thing that would ever
   consume it; a second renderer makes it the shared truth, and
   two copies of this loop is two lenses that agree until one of
   them is tuned.

   `ox`/`oy` are what to ADD to a pixel's position to find the
   pixel it should show, zero outside the disc. */
function lensField(d, bend, mag) {
  var S = Math.max(2, Math.round(d));
  var R = S / 2;
  var ox = new Float32Array(S * S);
  var oy = new Float32Array(S * S);
  /* how far past its own edge the rim reads, as a fraction of
     the radius. The knob. */
  var out = 0.14 + (bend / 100) * 0.8;
  /* how tightly that gather is squeezed into the rim. Three is
     a band you can see into; much higher and the whole reading
     collapses into a bright line, much lower and the
     magnification in the middle is eaten by it. */
  var q = 3;
  var f = function (u) { return u / mag + (out + 1 - 1 / mag) * Math.pow(u, q); };

  for (var y = 0; y < S; y++) {
    for (var x = 0; x < S; x++) {
      var i = y * S + x;
      var dx = x - R + 0.5;
      var dy = y - R + 0.5;
      var r = Math.hypot(dx, dy);
      if (r < R) {
        var u = r / R;
        var rs = R * f(u);
        var ux = r ? dx / r : 0;
        var uy = r ? dy / r : 0;
        ox[i] = ux * (rs - r);
        oy[i] = uy * (rs - r);
      }
    }
  }
  return { S: S, ox: ox, oy: oy };
}

/* the map is redrawn whenever these change, so it is worth
   keeping the work off the main thread's critical path —
   240x240 at the largest is 57,600 pixels of arithmetic, about
   a millisecond, and it happens on a knob turn rather than on
   a frame of the drag. */
function lensMap(d, bend, mag, scale) {
  var L = lensField(d, bend, mag), S = L.S;
  var c = document.createElement('canvas');
  c.width = c.height = S;
  var g = c.getContext('2d');
  if (!g) return '';
  var img = g.createImageData(S, S);

  for (var i = 0; i < S * S; i++) {
    var j = i * 4;
    /* the inverse of what feDisplacementMap does, which is
       (v / 255 - 0.5) * scale */
    img.data[j] = Math.max(0, Math.min(255, 127.5 + (L.ox[i] / scale) * 255));
    img.data[j + 1] = Math.max(0, Math.min(255, 127.5 + (L.oy[i] / scale) * 255));
    img.data[j + 2] = 128;
    img.data[j + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

/* ── can this engine put a filter in a backdrop? ───────────
   WebKit cannot, and an invalid value in a backdrop-filter is
   not ignored — the whole declaration is dropped, taking the
   refraction with it and leaving a lit circle with nothing
   inside it. index.css has gated every other glass surface on
   this question for a long time; the bubble escaped the gate
   because its filter is an inline style, which @supports does
   not reach.

   A CAPABILITY, NOT A DEVICE. The obvious version of this fix
   is "phone gets the canvas", and it is wrong twice: Android
   Chrome supports the backdrop and would be downgraded for
   nothing, and Safari on a Mac does NOT and would be handed
   the broken one — same engine, same missing feature, no
   touchscreen to give it away. The question is whether the
   property works, so that is the question asked.

   Asked once, at module scope: it is a fact about the engine
   and cannot change while the page is open. */
var BACKDROP_LENS =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('backdrop-filter', 'url(#g)');

/* ── how big the ball starts, and it is not one number ─────
   210 on a phone against 180 anywhere else. The stage is the
   same 680 either way and the screen is not: a phone draws the
   whole block at about a third, so the ball that reads as a
   ball of glass on a laptop reads as a marble.

   HERE it goes the other way: this slideshow isn't scaled down
   on a phone, it's drawn at full size in a ~360px column, so a
   210 ball would cover most of a poster. 120 on a phone keeps
   the same share of the picture that 180 has on a laptop. 767
   is the width the rest of this site changes at. Read once: it
   decides a starting value.

   HERE, later: Dalton asked for a glass half again as big, so 270 on a
   laptop and 180 on a phone. */
var BALL = window.matchMedia && window.matchMedia('(max-width: 767px)').matches ? 180 : 270;

/* ── the picture, as numbers ────────────────────────────────
   The canvas path samples the photograph directly, so it needs
   the pixels rather than the <img>.

   2x the drawn size, the rule scripts/cow.sh already holds to:
   the lens magnifies through the middle, so a source at 1:1 is
   soft exactly where you are looking.

   HERE: the picture changes every 1.5s while the show runs, and
   each change means reading it again. So it is read at 1x while
   the show plays and at 2x once it's paused, which is when
   someone is actually looking closely. */
var OVER_PLAYING = 1, OVER_PAUSED = 2;

var count = 0;

/* GlassBubble(stage, opts)
   stage        the element the ball sits on (position: relative)
   opts.picture function returning the <img> currently showing
   opts.bounds  element the ball must stay inside (the page area)
   opts.onGrab / opts.onRelease   called as the ball is picked up / put down
   opts.size, opts.bend (0-100), opts.fringe (0-40): Bencho's knobs
   Returns { refresh(), detail(on) }. */
function GlassBubble(stage, opts) {
  opts = opts || {};
  /* ── one id per instance, and it is not decoration ───────
     The wall draws this block once per card and the canvas can
     hold several; a fixed filter id would have every copy on
     the page pointing at whichever one mounted last, so a
     bubble on one card would take its size from another. */
  var uid = 'cow-lens-' + (++count);

  var d = clamp(opts.size || BALL, 80, 360); // HERE: Bencho's knob stopped at 240; this site's ball is 270
  var bend = clamp(opts.bend == null ? 100 : opts.bend, 0, 100);
  var chase = clamp(opts.fringe == null ? 18 : opts.fringe, 0, 40) / 1000;
  /* magnification through the middle rides with the bend, so
     one knob moves the whole lens rather than moving its rim
     and leaving the centre behind */
  var mag = 1.14 + (bend / 100) * 0.16;
  var E = escapeFor(d);
  var over = OVER_PLAYING;

  /* ── out of flow, and that is a bug this bench has
     already had ────────────────────────────────────────
     An <svg> with no dimensions is a replaced element, so
     the browser hands it 300x150 and puts it in the flow.
     See the note on .liq-defs: an invisible box that size
     inside a stage is harmless right up until it is not. */
  if (BACKDROP_LENS) {
    var scale = scaleFor(d);
    var map = lensMap(d, bend, mag, scale);
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    defs.setAttribute('class', 'cow-defs');
    defs.setAttribute('aria-hidden', 'true');
    defs.setAttribute('focusable', 'false');
    /* the backdrop the filter reads has to include what is AROUND
       the ball, or the rim gathers transparent pixels from outside
       the element and comes back with a hole in it (hence -40% /
       180%).

       userSpaceOnUse: 0,0 is the element's own top-left, not the
       expanded region's. Registering it to the region instead is
       what put the first working version half a bubble off its
       own glass.

       ── three passes, one per channel ──────────────
       Glass disperses: the three colours leave at slightly
       different angles, so an edge seen through a rim comes back
       with colour either side of it. Three displacements at three
       scales, each contributing one channel, screened back
       together — and `screen` is exact here rather than
       approximate, because each input has been reduced to a
       single channel on black. */
    defs.innerHTML =
      '<filter id="' + uid + '" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">' +
        '<feImage href="' + map + '" x="0" y="0" width="' + d + '" height="' + d + '" preserveAspectRatio="none" result="map"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="map" result="rr" scale="' + scale * (1 + chase) + '" xChannelSelector="R" yChannelSelector="G"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="map" result="gg" scale="' + scale + '" xChannelSelector="R" yChannelSelector="G"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="map" result="bb" scale="' + scale * (1 - chase) + '" xChannelSelector="R" yChannelSelector="G"/>' +
        '<feColorMatrix in="rr" result="r" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>' +
        '<feColorMatrix in="gg" result="g" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"/>' +
        '<feColorMatrix in="bb" result="b" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"/>' +
        '<feBlend in="r" in2="g" mode="screen" result="rg"/>' +
        '<feBlend in="rg" in2="b" mode="screen"/>' +
      '</filter>';
    stage.appendChild(defs);
  }

  var ball = document.createElement('div');
  ball.className = 'cow-bub';
  ball.style.width = ball.style.height = d + 'px';
  /* the backdrop recipe only where it will survive. The
     -webkit- twin that used to sit beside this is gone:
     it is false in Chromium too, so it has never once
     been the thing that made a lens appear. */
  if (BACKDROP_LENS) ball.style.backdropFilter = 'url(#' + uid + ') saturate(1.12) brightness(1.04)';
  ball.setAttribute('role', 'slider');
  ball.setAttribute('aria-label', 'Magnifying glass');
  ball.tabIndex = 0;

  /* INSIDE the ball rather than instead of it, so the
     rim, the specular and the cast shadow are the same
     rules on both paths and the two differ only in where
     the refraction comes from. */
  var glass = null;
  if (!BACKDROP_LENS) {
    glass = document.createElement('canvas');
    glass.className = 'cow-glass';
    glass.setAttribute('aria-hidden', 'true');
    ball.appendChild(glass);
  }
  stage.appendChild(ball);

  /* where the ball is, in stage pixels, top-left. HERE it starts a
     little right of centre and above it, which lands on the art
     whether the slide is a tall poster or a wide banner. */
  var at = { x: stage.offsetWidth * 0.68 - d / 2, y: stage.offsetHeight * 0.38 - d / 2 };

  function bounds() {
    var W = stage.offsetWidth, H = stage.offsetHeight;
    var b = { x0: -E, x1: W + E - d, y0: -E, y1: H + E - d };
    if (opts.bounds) {
      var s = stage.getBoundingClientRect(), p = opts.bounds.getBoundingClientRect();
      b.x0 = Math.max(b.x0, p.left - s.left); b.x1 = Math.min(b.x1, p.right - s.left - d);
      b.y0 = Math.max(b.y0, p.top - s.top);   b.y1 = Math.min(b.y1, p.bottom - s.top - d);
    }
    return b;
  }

  function place(x, y) {
    var b = bounds();
    at.x = clamp(x, b.x0, Math.max(b.x0, b.x1));
    at.y = clamp(y, b.y0, Math.max(b.y0, b.y1));
    ball.style.translate = at.x.toFixed(1) + 'px ' + at.y.toFixed(1) + 'px';
    ball.setAttribute('aria-valuetext',
      Math.round(((at.x - b.x0) / ((b.x1 - b.x0) || 1)) * 100) + ' across, ' +
      Math.round(((at.y - b.y0) / ((b.y1 - b.y0) || 1)) * 100) + ' down');
    draw();
  }

  /* ── the lens, done here, for the engines that will not ────
     The same offsets feDisplacementMap would have been handed,
     applied by hand: for every pixel of the ball, look up where
     it should read from, sample the photograph there, write it.
     Nothing in it is a feature an engine can decline.

     OFF THE PICTURE IT IS EMPTY, and that is the one honest
     difference from the backdrop version. The backdrop reads
     what is BEHIND the ball, which is the card once the ball has
     left the photograph; this reads the photograph, so out there
     it has nothing to show and the ball is its own rim and
     shadow over bare card. Which is what a clear ball on a table
     looks like, and is a smaller loss than it sounds — but it is
     a loss, and it is why this is the fallback rather than the
     one recipe for everybody.

     The buffers are kept across frames. A drag is sixty of these
     a second and `createImageData` on each one is sixty
     allocations of half a megabyte. */
  var field = glass ? lensField(d, bend, mag) : null;
  var pixels = null, snapW = 0, snapH = 0, snapCanvas = null, buf = null;

  /* HERE: the picture is read into a canvas the size of the stage
     plus the margin, drawn where it sits on the page, so the ball's
     own coordinates index straight into it. Again on every slide. */
  function snapshot() {
    pixels = null;
    if (!glass || !opts.picture) return;
    var img = opts.picture();
    if (!img || !img.naturalWidth) return;
    var s = stage.getBoundingClientRect(), r = img.getBoundingClientRect();
    snapW = Math.round((stage.offsetWidth + 2 * E) * over);
    snapH = Math.round((stage.offsetHeight + 2 * E) * over);
    snapCanvas = snapCanvas || document.createElement('canvas');
    snapCanvas.width = snapW;
    snapCanvas.height = snapH;
    var g = snapCanvas.getContext('2d', { willReadFrequently: true });
    if (!g) return;
    g.drawImage(img, (r.left - s.left + E) * over, (r.top - s.top + E) * over, r.width * over, r.height * over);
    try { pixels = g.getImageData(0, 0, snapW, snapH); } catch (e) { pixels = null; }
  }

  function draw() {
    if (!glass) return;
    var src = pixels;
    var S = field.S * over;
    if (glass.width !== S) { glass.width = glass.height = S; buf = null; }
    var g = glass.getContext('2d');
    if (!g) return;
    if (!src) { g.clearRect(0, 0, S, S); return; }
    if (!buf || buf.width !== S) buf = g.createImageData(S, S);
    var out = buf.data;
    var R = S / 2;
    var ax = (at.x + E) * over, ay = (at.y + E) * over;
    /* the three channels leave at slightly different angles, so
       an edge seen through the rim comes back with colour
       either side of it — the same dispersion the three
       feDisplacementMap passes do, at the same three scales */
    var ks = [1 + chase, 1, 1 - chase];

    for (var y = 0; y < S; y++) {
      for (var x = 0; x < S; x++) {
        var o = (y * S + x) * 4;
        var cx = x - R + 0.5;
        var cy = y - R + 0.5;
        if (cx * cx + cy * cy >= R * R) { out[o + 3] = 0; continue; }
        var fi = ((y / over) | 0) * field.S + ((x / over) | 0);
        var hit = 0;
        for (var ch = 0; ch < 3; ch++) {
          var sx = (ax + x + field.ox[fi] * ks[ch] * over) | 0;
          var sy = (ay + y + field.oy[fi] * ks[ch] * over) | 0;
          if (sx < 0 || sy < 0 || sx >= snapW || sy >= snapH) { out[o + ch] = 0; continue; }
          var k = (sy * snapW + sx) * 4;
          out[o + ch] = src.data[k + ch];
          hit += src.data[k + 3];
        }
        /* transparent only where all three missed, or the rim
           would punch holes wherever one channel reached past
           the photograph and the other two did not. HERE "missed"
           is read from the picture's alpha rather than its
           colour, so the black in a poster still refracts. */
        out[o + 3] = hit > 0 ? 255 : 0;
      }
    }
    g.putImageData(buf, 0, 0);
  }

  /* the stage is drawn at a fraction on the wall and at a zoom
     on the canvas, so client pixels have to be divided back
     into the component's own before they mean anything — the
     same correction the magnetic select makes. */
  function scaleOf(el) { return el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1; }

  var grab = null;
  ball.addEventListener('pointerdown', function (e) {
    var k = scaleOf(stage), b = stage.getBoundingClientRect();
    grab = { id: e.pointerId, dx: (e.clientX - b.left) / k - at.x, dy: (e.clientY - b.top) / k - at.y };
    /* guarded, because it throws for a pointer id nothing owns
       — which is every scripted pointer a rehearsal sends, and
       a real one that has already gone. Three blocks on this
       bench have had a bug from an unguarded call. */
    try { ball.setPointerCapture(e.pointerId); } catch (err) { /* not live */ }
    ball.setAttribute('data-held', '');
    if (opts.onGrab) opts.onGrab();
  });
  ball.addEventListener('pointermove', function (e) {
    if (!grab || grab.id !== e.pointerId) return;
    var k = scaleOf(stage), b = stage.getBoundingClientRect();
    place((e.clientX - b.left) / k - grab.dx, (e.clientY - b.top) / k - grab.dy);
  });
  function up(e) {
    if (!grab) return;
    grab = null;
    try { ball.releasePointerCapture(e.pointerId); } catch (err) { /* never held */ }
    ball.removeAttribute('data-held');
    if (opts.onRelease) opts.onRelease();
  }
  ball.addEventListener('pointerup', up);
  ball.addEventListener('pointercancel', up);
  /* a drag nobody can do with a keyboard is a block
     nobody can do with a keyboard — 12px a press, which
     is a tenth of the shortest travel */
  ball.addEventListener('keydown', function (e) {
    var step = e.shiftKey ? 36 : 12;
    var go = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!go) return;
    e.preventDefault();
    place(at.x + go[0], at.y + go[1]);
  });

  function refresh() { snapshot(); place(at.x, at.y); }
  var tick = false;
  window.addEventListener('resize', function () {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () { tick = false; refresh(); });
  });

  refresh();
  return {
    refresh: refresh,
    /* paused = looking closely: read the picture at 2x */
    detail: function (on) { over = on ? OVER_PAUSED : OVER_PLAYING; refresh(); }
  };
}

window.GlassBubble = GlassBubble;
})();
