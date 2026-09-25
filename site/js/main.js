/* Dalton Corr — main.js */
(function(){
'use strict';

function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $$(sel, ctx) { return [].slice.call((ctx || document).querySelectorAll(sel)); }

/* ── Slideshow ── */
function initSlideshow() {
  var wrap = $('.slideshow');
  if (!wrap) return;
  var slides = $$('.slide', wrap), cur = 0;
  if (slides.length < 2) return;

  // Slides after the first carry data-src and are fetched one step ahead of
  // the show, so the page downloads one image up front instead of all 60.
  // ready[i]: true = loaded, 'skip' = broken (never shown), unset = pending.
  var ready = {};
  slides.forEach(function(s, i) {
    s.classList.remove('active');
    var img = s.querySelector('img');
    if (!img) { ready[i] = true; return; }
    if (img.complete && img.naturalWidth > 0) { ready[i] = true; return; }
    // ready once decoded too, so switching to it never shows a blank frame
    img.addEventListener('load', function() {
      if (img.decode) img.decode().then(function() { ready[i] = true; }, function() { ready[i] = true; });
      else ready[i] = true;
    });
    img.addEventListener('error', function() { ready[i] = 'skip'; });
  });
  // Resolved against the page as it loaded: a project opened in place moves
  // the address to /work/..., and a relative path would follow it there.
  var base = document.baseURI;
  function load(i) {
    var img = slides[i].querySelector('img');
    if (img && img.dataset.src && !img.getAttribute('src')) img.src = new URL(img.dataset.src, base).href;
  }

  // Advance toward n. A pending slide is waited for (never skipped past, which
  // would jump the show back to slide 1); only broken slides are skipped.
  function go(n) {
    var len = slides.length;
    for (var k = 0; k < len; k++) {
      var idx = ((n + k) % len + len) % len;
      if (ready[idx] === 'skip') continue;
      load(idx);
      if (!ready[idx]) return;
      if (idx !== cur) {
        slides[cur].classList.remove('active');
        cur = idx;
        slides[cur].classList.add('active');
        if (isOpen()) fill();
      }
      load((idx + 1) % len);
      return;
    }
  }
  // Each slide stays up 3s. The show only runs while the tab is visible and
  // no card is open, and reduced motion starts paused.
  var paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timer = null;
  function stop() { clearInterval(timer); }
  function start() {
    stop();
    if (!paused && !isOpen() && !document.hidden) timer = setInterval(function() {
      if (!document.body.classList.contains('wc-open')) go(cur + 1);   // a project is open over it
    }, 3000);
  }
  // A manual step restarts the 3s, so the next slide gets its full time.
  function step(n) { go(n); start(); }
  document.addEventListener('visibilitychange', start);

  // Where the picture actually is: each one is contained in the frame, so a
  // wide one leaves space above and below it.
  function shown(img) {
    var nw = img && (img.naturalWidth || +img.getAttribute('width'));
    var nh = img && (img.naturalHeight || +img.getAttribute('height'));
    var bw = wrap.clientWidth, bh = wrap.clientHeight;
    var k = nw && nh ? Math.min(bw / nw, bh / nh) : 1;
    var w = nw ? nw * k : bw, h = nh ? nh * k : bh;
    return { left: (bw - w) / 2, top: (bh - h) / 2, width: w, height: h };
  }

  // One quiet line under the frame, in a place that never moves.
  var hint = $('.slideshow-hint', wrap);
  if (hint && window.matchMedia('(hover: none)').matches) hint.textContent = 'Tap image to view project';

  // ── The card: the picture, what it's from, and the way in ──
  var info = {};
  try { info = JSON.parse(($('#slide-projects') || {}).textContent || '{}'); } catch (err) {}
  function projectOf(i) { var slug = slides[i].dataset.project; return slug && info[slug] ? slug : null; }
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var box = null, before = null, wasPaused = false;
  // the same thin chevron as Next on the project pages
  var ARROW = '<svg viewBox="0 0 8 14" aria-hidden="true"><path d="M1.5 1.5 6.5 7l-5 5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function isOpen() { return !!box && !box.hidden; }
  function build() {
    box = document.createElement('div');
    box.className = 'hl';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'hl-title');
    box.innerHTML = '<div class="hl-scrim"></div>' +
      '<div class="hl-panel">' +
        '<img class="hl-img" alt="">' +
        '<div class="hl-info">' +
          '<p class="hl-meta"></p>' +
          '<h2 class="hl-title" id="hl-title"></h2>' +
          '<p class="hl-line"></p>' +
          '<div class="hl-actions">' +
            '<a class="hl-go" href="#">View project' + ARROW + '</a>' +
            '<button class="hl-close" type="button" aria-label="Close"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);
    box.querySelector('.hl-scrim').addEventListener('click', close);
    box.querySelector('.hl-close').addEventListener('click', close);
  }
  function fill() {
    var slug = projectOf(cur), p = slug && info[slug];
    var img = slides[cur].querySelector('img');
    if (!p) { close(); return; }
    var big = box.querySelector('.hl-img');
    big.src = img.currentSrc || img.src;
    big.alt = img.alt || p.title;
    box.querySelector('.hl-meta').textContent = p.role + ' · ' + p.year;
    box.querySelector('.hl-title').textContent = p.title;
    box.querySelector('.hl-line').textContent = p.line;
    var go = box.querySelector('.hl-go');
    go.href = 'work/' + slug;
    go.setAttribute('aria-label', 'View project: ' + p.title);
  }
  // Same-document view transition where there is one, so the picture grows
  // out of the slideshow into the card; otherwise a plain fade.
  function swap(update) {
    if (!document.startViewTransition || still) { update(); return Promise.resolve(); }
    // the menu fades with the page here: carried on its own it would ride
    // sharp over the frosted backdrop and snap under it at the end
    var root = document.documentElement;
    root.classList.add('hl-moving');
    var t = document.startViewTransition(update);
    return t.finished.catch(function() {}).then(function() { root.classList.remove('hl-moving'); });
  }
  // The slide's picture fills its frame (contained); for the morph it's
  // briefly given exactly the picture's box, so nothing stretches.
  function hug(img, on) {
    if (!on) { img.style.inset = img.style.left = img.style.top = img.style.width = img.style.height = ''; return; }
    var r = shown(img);
    img.style.inset = 'auto';
    img.style.left = r.left + 'px'; img.style.top = r.top + 'px';
    img.style.width = r.width + 'px'; img.style.height = r.height + 'px';
  }
  var opening = false;
  function open() {
    var img = slides[cur].querySelector('img');
    if (!projectOf(cur) || !img || opening || isOpen()) return;
    opening = true;
    stop();   // no slide change while the card is on its way
    if (!box) build();
    fill();
    wasPaused = paused;
    before = document.activeElement;
    var big = box.querySelector('.hl-img');
    // the card's picture decoded first, so the morph lands on it, not on a blank
    var ready = big.decode ? big.decode().catch(function() {}) : Promise.resolve();
    ready.then(function() { opening = false; reveal(img, big); });
  }
  function reveal(img, big) {
    hug(img, true);
    img.style.viewTransitionName = 'hl-art';
    swap(function() {
      img.style.viewTransitionName = '';
      big.style.viewTransitionName = 'hl-art';
      box.hidden = false;
      document.documentElement.classList.add('hl-open');
      start();   // the show holds while the card is up
    }).then(function() {
      big.style.viewTransitionName = '';
      hug(img, false);
    });
    box.querySelector('.hl-go').focus({ preventScroll: true });
    // the project page, warmed while they read
    var link = document.createElement('link');
    link.rel = 'prefetch'; link.href = 'work/' + projectOf(cur);
    document.head.appendChild(link);
  }
  function close() {
    if (!isOpen()) return;
    var img = slides[cur].querySelector('img');
    var big = box.querySelector('.hl-img');
    hug(img, true);
    big.style.viewTransitionName = 'hl-art';
    swap(function() {
      big.style.viewTransitionName = '';
      img.style.viewTransitionName = 'hl-art';
      box.hidden = true;
      document.documentElement.classList.remove('hl-open');
      paused = wasPaused;
      start();
    }).then(function() {
      img.style.viewTransitionName = '';
      hug(img, false);
    });
    if (before && before.focus) before.focus({ preventScroll: true });
  }

  slides[0].classList.add('active');
  // the second picture only once the first is in: on a slow phone they'd
  // otherwise split the connection and the first would take twice as long
  var lead = slides[0].querySelector('img');
  if (lead && !(lead.complete && lead.naturalWidth)) {
    var next = function() { load(1); };
    lead.addEventListener('load', next, { once: true });
    lead.addEventListener('error', next, { once: true });
  } else load(1);
  start();

  // A click on the picture itself opens its card (the frame around a wide
  // one doesn't count). A picture with no project page behind it pauses.
  wrap.addEventListener('click', function(e) {
    var r = shown(slides[cur].querySelector('img')), b = wrap.getBoundingClientRect();
    var x = e.clientX - b.left, y = e.clientY - b.top;
    if (x < r.left || x > r.left + r.width || y < r.top || y > r.top + r.height) return;
    if (projectOf(cur)) open();
    else { paused = !paused; start(); }
  });
  document.addEventListener('keydown', function(e) {
    if (isOpen() && e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowLeft') step(cur - 1);
    if (e.key === 'ArrowRight') step(cur + 1);
    if (e.key === ' ' && e.target === document.body && !isOpen()) { e.preventDefault(); paused = !paused; start(); }
  });
  // "Scroll for portfolio": a glide down to the cards.
  var cue = $('.scroll-cue');
  if (cue) {
    cue.addEventListener('click', function(e) {
      var to = document.getElementById('work');
      if (!to) return;
      e.preventDefault();
      to.scrollIntoView({ behavior: still ? 'instant' : 'smooth', block: 'start' });
    });
  }
  // Swipe between slides.
  var tx = 0;
  wrap.addEventListener('touchstart', function(e) { tx = e.changedTouches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) step(cur + (dx < 0 ? 1 : -1));
  });
}

/* ── Home: the cards' pictures wait for the first slide ──
   The home page's cards start below the first screen, but a phone fetches a
   dozen of them at once, and the first poster then shares the connection with
   them all. Their pictures (data-src, from build_work_index.py) come in once
   that poster has landed, or as soon as the page is scrolled or a card opens,
   and fade up as they arrive (work-cards.css .wc-wait). */
function initHomeCards() {
  var imgs = $$('.home-work img[data-src]');
  if (!imgs.length) return;
  var woken = false;
  function wake() {
    if (woken) return;
    woken = true;
    window.removeEventListener('scroll', wake);
    imgs.forEach(function(img) {
      img.classList.add('wc-wait');
      var done = function() { img.classList.remove('wc-wait'); };
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      img.removeAttribute('data-srcset');
    });
  }
  window.DC.wakeCards = wake;
  var lead = $('.slideshow .slide img');
  if (window.scrollY > 0 || !lead || (lead.complete && lead.naturalWidth)) { wake(); return; }
  window.addEventListener('scroll', wake, { passive: true });
  lead.addEventListener('load', wake, { once: true });
  lead.addEventListener('error', wake, { once: true });
  setTimeout(wake, 4000);
}

/* ── Shared card-filter engine ──
   FLIP show/hide/move animation plus the busy/pending queue, shared by the work
   grid and the blog grid. After toggling the active button it calls
   decorate(f, animate) so each caller can update its own chrome (filter-group
   open state, flydot, dot muting). */
function createCardFilter(opts) {
  var btns = opts.btns, cards = opts.cards, decorate = opts.decorate;
  var cardFilters = cards.map(function(c) { return c.dataset.filters.split(' '); });
  var pending = null, busy = false, currentFilter = null;

  function matches(i, f) { return f === 'all' || cardFilters[i].indexOf(f) !== -1; }

  function apply(f, animate) {
    if (busy) { pending = f; return; }
    if (f === currentFilter) return;
    currentFilter = f;
    btns.forEach(function(b) { b.classList.toggle('active', b.dataset.filter === f); });
    if (decorate) decorate(f, animate);
    history.replaceState(null, '', f === 'all' ? location.pathname : '#' + f);

    var toHide = [], toShow = [], toMove = [];
    cards.forEach(function(c, i) {
      var m = matches(i, f);
      var visible = !c.classList.contains('card-hidden');
      if (visible && !m) toHide.push(c);
      else if (!visible && m) toShow.push(c);
      else if (visible && m) toMove.push({ el: c, i: i });
    });

    // No animation or nothing to animate: instant
    if (!animate || (!toHide.length && !toShow.length)) {
      toHide.forEach(function(c) { c.classList.add('card-hidden'); });
      toShow.forEach(function(c) { c.classList.remove('card-hidden'); });
      return;
    }

    busy = true;

    // FLIP: snapshot positions of cards that will move
    var oldRects = {};
    toMove.forEach(function(item) { oldRects[item.i] = item.el.getBoundingClientRect(); });

    // Phase 1: exit
    if (toHide.length) {
      toHide.forEach(function(c) { c.classList.add('card-exiting'); });
      onceTransition(toHide[0], 'opacity', 270, phase2);
    } else {
      phase2();
    }

    function phase2() {
      toHide.forEach(function(c) { c.classList.remove('card-exiting'); c.classList.add('card-hidden'); });
      toShow.forEach(function(c) { c.classList.remove('card-hidden'); });

      // FLIP: read every new position first (one layout), then put each card
      // straight back where it was. Its own transition is off for that jump:
      // the card's hover lift (work-cards.css) would otherwise ease it there,
      // and the glide that follows would have nothing to glide from.
      var moversWithDelta = [];
      var nows = toMove.map(function(item) { return oldRects[item.i] ? item.el.getBoundingClientRect() : null; });
      toMove.forEach(function(item, k) {
        var old = oldRects[item.i], now = nows[k];
        if (!old || !now) return;
        var dx = old.left - now.left, dy = old.top - now.top;
        if (dx * dx + dy * dy < 1) return;
        item.el.style.transition = 'none';
        item.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        moversWithDelta.push(item.el);
      });
      if (moversWithDelta.length) void moversWithDelta[0].offsetWidth;   // held there for this frame

      // Single rAF: add transition class + clear transform to animate
      requestAnimationFrame(function() {
        moversWithDelta.forEach(function(el) { el.style.transition = ''; el.classList.add('card-moving'); el.style.transform = ''; });

        // Stagger entries, cap total stagger at 200ms
        var stagger = toShow.length > 1 ? Math.min(30, 200 / (toShow.length - 1)) : 0;
        toShow.forEach(function(c, i) {
          var delay = Math.round(i * stagger);
          c.style.animationDelay = delay ? delay + 'ms' : '';
          c.classList.add('card-entering');
        });

        // Cleanup after all animations settle
        var moveDur = moversWithDelta.length ? 350 : 0;
        var enterDur = toShow.length ? 300 + Math.round((toShow.length - 1) * stagger) : 0;
        setTimeout(function() {
          moversWithDelta.forEach(function(el) { el.classList.remove('card-moving'); });
          toShow.forEach(function(c) { c.classList.remove('card-entering'); c.style.animationDelay = ''; });
          busy = false;
          if (pending) { var p = pending; pending = null; apply(p, true); }
        }, Math.max(moveDur, enterDur) + 20);
      });
    }
  }

  return { apply: apply };
}

/* ── Filters (work grid) ── */
function initFilters() {
  var bar = $('.filter-bar');
  var grid = $('.work-grid');
  if (!bar || !grid) return;
  document.body.classList.add('is-work-grid');
  var btns = $$('.filter-btn', bar);
  var cards = $$('[data-filters]');
  var dot = document.getElementById('dot');

  // Single blue dot that glides to the active filter (mobile breadcrumb).
  var flyDot = document.createElement('span');
  flyDot.className = 'filter-flydot';
  bar.appendChild(flyDot);

  function positionFlyDot(animate) {
    var active = bar.querySelector('.filter-btn.active');
    if (!active) return;
    // Accumulate offsets up to the bar — sub buttons sit inside a transformed
    // submenu, so their offsetParent isn't the bar directly.
    var x = 0, y = 0, el = active;
    while (el && el !== bar) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    x -= 11;
    y += (active.offsetHeight - 6) / 2;
    if (!animate) flyDot.style.transition = 'none';
    flyDot.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    if (!animate) { flyDot.offsetWidth; flyDot.style.transition = ''; }
  }
  var resizeTick = false;
  window.addEventListener('resize', function () {
    if (resizeTick) return;
    resizeTick = true;
    requestAnimationFrame(function () { resizeTick = false; positionFlyDot(false); });
  });
  window.addEventListener('load', function () { positionFlyDot(false); });

  var engine = createCardFilter({
    btns: btns, cards: cards,
    decorate: function(f, animate) {
      // Open the filter group that owns the active button (or close all for "All")
      var activeBtn = bar.querySelector('.filter-btn.active');
      var activeGroup = activeBtn ? activeBtn.closest('.filter-group') : null;
      $$('.filter-group', bar).forEach(function(g) { g.classList.toggle('is-open', g === activeGroup); });
      positionFlyDot(animate);
      // The nav dot greys out on the work grid: blue is reserved for the filter
      // breadcrumb (the flydot). Desktop greys it whenever a filter is active.
      if (dot) {
        if (isMobileNav()) {
          dot.classList.add('muted');
        } else {
          var sub = document.querySelector('.nav-sublink.is-active, .nav-subsublink.is-active');
          dot.classList.toggle('muted', !(sub && sub.offsetParent !== null));
        }
      }
    }
  });

  bar.addEventListener('click', function(e) {
    var b = e.target.closest('.filter-btn');
    if (!b) return;
    if (b.tagName === 'A') e.preventDefault();   // the home page's filters work on its own cards
    engine.apply(b.dataset.filter, true);
  });

  // Mobile nav sublinks are <a href="...#visual"> on this same page, so tapping
  // them only changes the hash without reloading. Mirror that into the grid.
  // Only real filter names count. Any other hash (the skip link's #main, a
  // stale or mistyped link) used to hide every card.
  function hashFilter() {
    var h = location.hash.replace('#', '');
    if (!h) return 'all';
    return bar.querySelector('.filter-btn[data-filter="' + CSS.escape(h) + '"]') ? h : null;
  }
  window.addEventListener('hashchange', function() {
    var f = hashFilter();
    if (f) engine.apply(f, true);
  });

  engine.apply(hashFilter() || 'all', false);
}

/* ── Sort ── */
function initSort() {
  var btn = $('.sort-toggle'), grid = $('.work-grid');
  if (!btn || !grid) return;
  var byYear = false;
  function applySort() {
    [].slice.call(grid.children).sort(function(a, b) {
      return byYear
        ? (parseInt(b.dataset.year) || 0) - (parseInt(a.dataset.year) || 0)
        : (parseInt(a.dataset.sortOrder) || 0) - (parseInt(b.dataset.sortOrder) || 0);
    }).forEach(function(el) { grid.appendChild(el); });
  }
  applySort();
  btn.addEventListener('click', function() {
    byYear = !byYear;
    btn.textContent = byYear ? 'Sort: Chronological' : 'Sort: Default';
    applySort();
  });
}

/* ── Gallery masonry ──
   The 2-up galleries sat a wide photo next to a tall one, and the row took
   the tall one's height, leaving a gap under the wide one. Now every photo
   keeps its size (half the width, uncropped) and drops into whichever
   column is shorter so far, so a tall photo gets two shorter ones stacked
   beside it instead of a gap. The order still runs left-to-right,
   top-to-bottom as closely as the shapes allow, and the DOM order (what a
   screen reader follows) doesn't change. Heights come from each photo's
   width/height (or an inline aspect-ratio crop), so the layout is set
   before anything loads. Phones stay one per row. */
var masonry = [];   // every gallery laid out so far (the Work page can add more later)
function initGalleryMasonry(root) {
  var first = !masonry.length;
  var galleries = $$('.project-gallery:not(.poster-hero)', root).filter(function(g) {
    var n = g.querySelectorAll('img').length;
    return n > 1 && n === g.children.length; // plain image galleries only
  });
  if (!galleries.length) return;
  masonry = masonry.filter(function(g) { return g.isConnected; }).concat(galleries);
  var phone = window.matchMedia('(max-width: 767px)');

  function ratio(img) {
    // "4 / 5" when the page crops it; "auto 2400 / 3200" from the attributes
    var ar = getComputedStyle(img).aspectRatio || '';
    var m = /([\d.]+)\s*(?:\/\s*([\d.]+))?/.exec(ar.replace(/^auto\s*/, ''));
    var r = m ? (m[2] ? m[1] / m[2] : +m[1]) : 0;
    if (!/^auto/.test(ar) && r) return r;
    if (img.naturalWidth) return img.naturalWidth / img.naturalHeight;
    return r || 1;
  }

  function layout() {
    masonry.forEach(function(g) {
      var imgs = $$('img', g);
      if (phone.matches) {
        g.classList.remove('is-masonry');
        g.style.height = '';
        imgs.forEach(function(img) { img.style.left = img.style.top = img.style.width = ''; });
        return;
      }
      g.classList.add('is-masonry');
      var cs = getComputedStyle(g);
      var gap = parseFloat(cs.columnGap) || 8;
      var padL = parseFloat(cs.paddingLeft), padT = parseFloat(cs.paddingTop);
      var colW = (g.clientWidth - padL - parseFloat(cs.paddingRight) - gap) / 2;
      var cols = [0, 0];
      imgs.forEach(function(img) {
        var c = cols[0] <= cols[1] ? 0 : 1;
        img.style.left = (padL + c * (colW + gap)) + 'px';
        img.style.top = (padT + cols[c]) + 'px';
        img.style.width = colW + 'px';
        cols[c] += colW / ratio(img) + gap;
      });
      g.style.height = (padT + Math.max(cols[0], cols[1]) - gap + parseFloat(cs.paddingBottom)) + 'px';
    });
  }

  var queued = false;
  function relayout() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function() { queued = false; layout(); });
  }
  layout();
  if (first) window.addEventListener('resize', relayout);
  // A photo whose real shape differs from its attributes corrects itself on load.
  galleries.forEach(function(g) {
    $$('img', g).forEach(function(img) { img.addEventListener('load', relayout); });
  });
}

/* ── Lightbox ──
   Click a gallery photo to see it full size. ← / → (or a swipe) step through
   every photo on the page, with a small "3 / 19" count; Esc, or a click
   anywhere but the arrows, closes it. It always opens the full-size
   original, even where the gallery shows a smaller copy. */
function initLightbox() {
  var SEL = '.project-gallery img, .project-gallery-grid img';
  var imgs = [];   // the page's photos, read fresh each time it opens
  var lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Image viewer');
  lb.innerHTML = '<button class="lightbox-close" aria-label="Close">×</button>' +
    '<button class="lightbox-prev" aria-label="Previous image">‹</button>' +
    '<img src="" alt="">' +
    '<button class="lightbox-next" aria-label="Next image">›</button>' +
    '<span class="lightbox-count" aria-live="polite"></span>';
  document.body.appendChild(lb);
  var lbImg = lb.querySelector('img'), count = lb.querySelector('.lightbox-count');
  // Full size on a big screen; on a phone the 1200px copy (from the photo's
  // srcset) is already sharper than the screen, at a third of the weight.
  var small = window.matchMedia('(max-width: 767px)');
  function full(img) {
    if (!small.matches || !img.srcset) return img.src;
    var pick = img.srcset.split(',').map(function(c) { var p = c.trim().split(/\s+/); return { url: p[0], w: parseInt(p[1]) || 0 }; })
      .filter(function(c) { return c.w >= 1000; }).sort(function(a, b) { return a.w - b.w; })[0];
    return pick ? new URL(pick.url, img.baseURI).href : img.src;
  }
  var cur = 0, opener = null;

  function show(i) {
    cur = (i + imgs.length) % imgs.length;
    lbImg.src = full(imgs[cur]);
    lbImg.alt = imgs[cur].alt;
    count.textContent = (cur + 1) + ' / ' + imgs.length;
    // warm the neighbours so stepping is instant
    [cur + 1, cur - 1].forEach(function(n) { new Image().src = full(imgs[(n + imgs.length) % imgs.length]); });
  }
  function open(img) {
    imgs = $$(SEL);
    lb.classList.toggle('is-single', imgs.length < 2);
    opener = document.activeElement;
    show(imgs.indexOf(img));
    lb.classList.add('open');
    lb.querySelector('.lightbox-close').focus();
  }
  function close() {
    if (!lb.classList.contains('open')) return;
    lb.classList.remove('open');
    if (opener && opener.focus) opener.focus();
  }

  document.addEventListener('click', function(e) {
    var img = e.target.closest && e.target.closest(SEL);
    if (!img || lb.contains(img)) return;
    e.stopPropagation();
    open(img);
  });
  lb.addEventListener('click', close);
  lb.querySelector('.lightbox-prev').addEventListener('click', function(e) { e.stopPropagation(); show(cur - 1); });
  lb.querySelector('.lightbox-next').addEventListener('click', function(e) { e.stopPropagation(); show(cur + 1); });
  document.addEventListener('keydown', function(e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
  });
  var tx = null;
  lb.addEventListener('touchstart', function(e) { tx = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function(e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx;
    tx = null;
    if (Math.abs(dx) > 40) { e.preventDefault(); show(cur + (dx < 0 ? 1 : -1)); }
  });
}

/* ── Instant page opens ──
   Where the browser supports it (Chrome, Edge), resting on a link to another
   page of this site starts loading that page in the background, so the click
   opens it almost instantly. Other browsers skip this. */
function initSpeculation() {
  if (!window.HTMLScriptElement || !HTMLScriptElement.supports || !HTMLScriptElement.supports('speculationrules')) return;
  var s = document.createElement('script');
  s.type = 'speculationrules';
  s.textContent = JSON.stringify({
    prerender: [{
      // not the project cards or the deck's own Back / Previous / Next: those
      // open in place (work-cards.js), so a prerendered page would be thrown away
      where: { and: [{ href_matches: '/*' }, { not: { href_matches: '/experiments/*' } }, { not: { selector_matches: '.project-card, .wc-controls a, .wc-foot a' } }] },
      eagerness: 'moderate'
    }]
  });
  document.head.appendChild(s);
}

/* ── Work toolbar show/hide ── */
function initToolbar() {
  var toolbar = $('.work-toolbar');
  if (!toolbar) return;
  var isWorkGrid = !!$('.work-grid');
  var workLink = null;
  $$('.nav-link').forEach(function(l) { if (l.textContent.trim() === 'Work') workLink = l; });

  // the filters stay in view on the grid and on a project opened as a deck;
  // on the home page, once the cards are on screen
  var pinned = isWorkGrid || !!$('.wc-detail');
  // The home page runs slideshow, work, about: the dot follows you down the
  // page, the filters show while you're at the work, and the menu glides to
  // each part instead of loading another page.
  var homeWork = $('.home-work');
  if (homeWork) {
    pinned = false;
    var byName = function(name) { return $$('.nav-link').filter(function(l) { return l.textContent.trim() === name; })[0]; };
    var parts = [[$('.home'), $('.nav-home')], [homeWork, workLink], [$('.home-about'), byName('About')]]
      .filter(function(p) { return p[0] && p[1]; });
    var linkOf = function(el) { var p = parts.filter(function(p) { return p[0] === el; })[0]; return p && p[1]; };
    var here = parts[0][0];
    var mark = function() {
      var atWork = here === homeWork;
      pinned = atWork;
      toolbar.classList.toggle('visible', atWork);
      document.body.classList.toggle('home-top', !atWork);
      moveNavDot(linkOf(here));
    };
    if ('IntersectionObserver' in window) {
      // whichever part crosses a line just under the middle of the window
      var io = new IntersectionObserver(function(entries) {
        entries.forEach(function(en) { if (en.isIntersecting) here = en.target; });
        mark();
      }, { rootMargin: '-45% 0px -54% 0px' });
      parts.forEach(function(p) { io.observe(p[0]); });
    }
    mark();
    var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    parts.forEach(function(p) {
      var go = function() {
        if (p[0].classList.contains('home')) window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'instant' });
        else p[0].scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' });
      };
      p[1].addEventListener('click', function(e) {
        if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        // a project open in the deck: back to the page first (work-cards.js
        // does that itself for Work), then on to the part asked for
        if (document.body.classList.contains('wc-open')) {
          if (p[1] !== workLink) history.back();
          setTimeout(go, 700);
          return;
        }
        go();
      });
    });
  }
  if (pinned) toolbar.classList.add('visible');

  var hideTimer;
  function show() { clearTimeout(hideTimer); toolbar.classList.add('visible'); }
  function scheduleHide() {
    hideTimer = setTimeout(function() { if (!pinned) toolbar.classList.remove('visible'); }, 350);
  }
  if (workLink) {
    workLink.addEventListener('mouseenter', show);
    workLink.addEventListener('mouseleave', scheduleHide);
  }
  toolbar.addEventListener('mouseenter', show);
  toolbar.addEventListener('mouseleave', scheduleHide);

  if (isWorkGrid && workLink && !homeWork) {
    workLink.addEventListener('click', function(e) {
      e.preventDefault();
      var dot = document.getElementById('dot');
      if (!dot) return;
      dot.classList.remove('shake');
      void dot.offsetWidth;
      dot.classList.add('shake');
      dot.addEventListener('animationend', function() {
        dot.classList.remove('shake');
      }, { once: true });
    });
  }
}

/* ── Mobile: tap "Work" off the work page to reveal its submenu inline ── */
// Instead of navigating straight to the work grid, the first tap drops the
// All/Visual/Music row below the top bar; picking one of those navigates.
function initMobileWorkMenu() {
  var item = $('.nav-item--work');
  if (!item) return;
  var workLink = item.querySelector(':scope > .nav-link');
  if (!workLink) return;
  var mq = window.matchMedia('(max-width: 767px)');

  function close() { document.body.classList.remove('is-nav-work-open'); }

  workLink.addEventListener('click', function(e) {
    // Only intercept on mobile and only when we're not already on the work grid.
    if (!mq.matches || $('.work-grid')) return;
    e.preventDefault();
    document.body.classList.toggle('is-nav-work-open');
  });

  // Dismiss when tapping outside the menu, and reset on resize to desktop.
  document.addEventListener('click', function(e) {
    if (!document.body.classList.contains('is-nav-work-open')) return;
    if (!e.target.closest('.nav-item--work')) close();
  });
  mq.addEventListener('change', function(e) { if (!e.matches) close(); });
}

/* ── Blue dot ── */
// Move the dot to another link on the same page (the home page's Dalton Corr /
// Work as you scroll), gliding from where it was with the same FLIP as above.
function moveNavDot(link) {
  var from = document.querySelector('.nav-link.active');
  if (!link || from === link) return;
  var a = from && from.getBoundingClientRect(), b = link.getBoundingClientRect();
  if (from) from.classList.remove('active', 'dot-animating');
  link.classList.add('active');
  // the name carries no dot, so nothing glides to it or away from it
  if (!a || !b.width || from.classList.contains('nav-home') || link.classList.contains('nav-home')) return;
  link.classList.remove('dot-animating');
  link.style.setProperty('--dot-dx', (a.left - b.left) + 'px');
  link.style.setProperty('--dot-dy', (a.top + a.height / 2 - (b.top + b.height / 2)) + 'px');
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      link.classList.add('dot-animating');
      link.style.setProperty('--dot-dx', '0px');
      link.style.setProperty('--dot-dy', '0px');
    });
  });
}
// The active-nav dot RESTS in CSS (.nav-link.active::before at translate(0,0)),
// so its final position is always correct regardless of timing. isMobileNav
// stays; the work-grid filter uses it.
function isMobileNav() { return window.matchMedia('(max-width: 767px)').matches; }

// Cross-page glide via FLIP: animate FROM the previous page's dot position TO the
// CSS resting spot. JS only sets the starting offset (a CSS var that decays to
// 0), never the resting position — so a mistimed or skipped measurement can at
// worst drop the animation, never strand the dot.
function initNavDotGlide() {
  var active = document.querySelector('.nav-link.active');
  if (!active) return;
  // Reference point that moves with the dot (its left edge + vertical centre).
  // The constant CSS offset cancels out when we diff old vs new, so this is fine
  // for both the vertical (desktop) and horizontal (mobile) layouts.
  function restPos(link) {
    var r = link.getBoundingClientRect();
    return { x: r.left, y: r.top + r.height / 2 };
  }
  var prev = null;
  try { prev = JSON.parse(sessionStorage.getItem('navDot')); } catch (e) {}

  // (the name carries no dot: a page where it's the active link has none to glide)
  if (prev && !active.classList.contains('nav-home')) {
    var now = restPos(active);
    var dx = prev.x - now.x, dy = prev.y - now.y;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      active.style.setProperty('--dot-dx', dx + 'px');
      active.style.setProperty('--dot-dy', dy + 'px');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          active.classList.add('dot-animating');
          active.style.setProperty('--dot-dx', '0px');
          active.style.setProperty('--dot-dy', '0px');
        });
      });
    }
  }
  // Remember where the dot is when leaving via a nav link, so the next page can
  // glide from here. Measured at click time, when layout is settled, from the
  // link active then (the home page moves it as you scroll); none from the name.
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-link')) return;
    var cur = document.querySelector('.nav-link.active');
    try {
      if (cur && !cur.classList.contains('nav-home')) sessionStorage.setItem('navDot', JSON.stringify(restPos(cur)));
      else sessionStorage.removeItem('navDot');
    } catch (err) {}
  });
}

/* ── Helpers ── */
function onceTransition(el, prop, fallback, cb) {
  var fired = false;
  function handler(e) {
    if (e.propertyName !== prop) return;
    done();
  }
  function done() {
    if (fired) return;
    fired = true;
    el.removeEventListener('transitionend', handler);
    cb();
  }
  el.addEventListener('transitionend', handler);
  setTimeout(done, fallback);
}

/* ── Sticky project cards ── */
function initStickyCards() {
  var meta = $('.project-meta');
  if (!meta || meta.closest('.wc-info')) return; // the deck layout has its own (work-cards.js)

  // Wrap project-meta + project-body in a sticky info card
  var body = meta.nextElementSibling;
  var card = document.createElement('div');
  card.className = 'project-info-card';
  meta.parentNode.insertBefore(card, meta);
  card.appendChild(meta);
  if (body && body.classList.contains('project-body')) {
    card.appendChild(body);
  }

  // Floating project name bar — appears when info card scrolls away
  var projectName = meta ? meta.querySelector('h1') : null;
  if (projectName) {
    var bar = document.createElement('div');
    bar.className = 'project-name-bar';
    bar.textContent = projectName.textContent.trim();
    document.body.appendChild(bar);

    var barVisible = false;
    var scrollTick = false;
    window.addEventListener('scroll', function() {
      if (scrollTick) return;
      scrollTick = true;
      requestAnimationFrame(function() {
        scrollTick = false;
        var show = card.getBoundingClientRect().bottom < 0;
        if (show !== barVisible) {
          barVisible = show;
          bar.classList.toggle('visible', show);
        }
      });
    }, { passive: true });
  }

  // Wrap each section h2 (+ optional section-sub) in a sticky section-header
  $$('.project-section h2').forEach(function(h2) {
    var wrapper = document.createElement('div');
    wrapper.className = 'section-header';
    h2.parentNode.insertBefore(wrapper, h2);
    wrapper.appendChild(h2);
    var next = wrapper.nextElementSibling;
    if (next && next.classList.contains('section-sub')) {
      wrapper.appendChild(next);
    }
  });

}

/* ── Blog filters ── */
function initBlogFilters() {
  var grid = $('.blog-grid');
  if (!grid) return;
  document.body.classList.add('is-blog-grid');
  var toolbar = $('.blog-toolbar');
  if (!toolbar) return;
  toolbar.classList.add('visible');

  var bar = toolbar.querySelector('.filter-bar');
  var btns = $$('.filter-btn', bar);
  var cards = $$('[data-filters]', grid);
  var dot = document.getElementById('dot');

  var engine = createCardFilter({
    btns: btns, cards: cards,
    decorate: function() { if (dot) dot.classList.add('muted'); }
  });

  bar.addEventListener('click', function(e) {
    var b = e.target.closest('.filter-btn');
    if (!b) return;
    e.preventDefault();
    engine.apply(b.dataset.filter, true);
  });

  // Blog nav link hover shows toolbar
  var blogLink = null;
  $$('.nav-link').forEach(function(l) { if (l.textContent.trim() === 'Blog') blogLink = l; });
  var hideTimer;
  function show() { clearTimeout(hideTimer); toolbar.classList.add('visible'); }
  function scheduleHide() { hideTimer = setTimeout(function() { if (!grid) toolbar.classList.remove('visible'); }, 350); }
  if (blogLink) { blogLink.addEventListener('mouseenter', show); blogLink.addEventListener('mouseleave', scheduleHide); }
  toolbar.addEventListener('mouseenter', show);
  toolbar.addEventListener('mouseleave', scheduleHide);

  engine.apply(location.hash.replace('#', '') || 'all', false);
}

/* ── Admin reorder (Shift+Ctrl+E) ── */
function initAdminReorder() {
  var grid = $('.work-grid');
  if (!grid) return;

  var KEY = 'dc-card-order';
  var active = false;
  var banner = null;
  var dragEl = null;
  var placeholder = null;

  // Apply saved order on load
  var saved = localStorage.getItem(KEY);
  if (saved) {
    try {
      var order = JSON.parse(saved);
      var byHref = {};
      $$('.project-card', grid).forEach(function(c) { byHref[c.getAttribute('href')] = c; });
      order.forEach(function(href) {
        if (byHref[href]) grid.appendChild(byHref[href]);
      });
    } catch(e) {}
  }

  function saveOrder() {
    var hrefs = $$('.project-card', grid).map(function(c) { return c.getAttribute('href'); });
    localStorage.setItem(KEY, JSON.stringify(hrefs));
  }

  function toggle() {
    active = !active;
    grid.classList.toggle('admin-reorder', active);

    if (active) {
      banner = document.createElement('div');
      banner.className = 'admin-banner';
      banner.innerHTML = '<span>Reorder mode — drag cards to rearrange</span><button id="admin-done">Done</button><button id="admin-reset">Reset</button>';
      document.body.prepend(banner);
      $('#admin-done').addEventListener('click', toggle);
      $('#admin-reset').addEventListener('click', function() {
        localStorage.removeItem(KEY);
        location.reload();
      });
      $$('.project-card', grid).forEach(function(c) {
        c.setAttribute('draggable', 'true');
        c.addEventListener('dragstart', onDragStart);
        c.addEventListener('dragend', onDragEnd);
        c.addEventListener('dragover', onDragOver);
        c.addEventListener('drop', onDrop);
        c.addEventListener('click', preventNav, true);
      });
    } else {
      if (banner) banner.remove();
      $$('.project-card', grid).forEach(function(c) {
        c.removeAttribute('draggable');
        c.removeEventListener('dragstart', onDragStart);
        c.removeEventListener('dragend', onDragEnd);
        c.removeEventListener('dragover', onDragOver);
        c.removeEventListener('drop', onDrop);
        c.removeEventListener('click', preventNav, true);
      });
    }
  }

  function preventNav(e) { e.preventDefault(); e.stopPropagation(); }

  function onDragStart(e) {
    dragEl = e.currentTarget;
    dragEl.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  }

  function onDragEnd() {
    if (dragEl) dragEl.classList.remove('dragging');
    dragEl = null;
    saveOrder();
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragEl || e.currentTarget === dragEl) return;
    var target = e.currentTarget;
    var rect = target.getBoundingClientRect();
    var mid = rect.left + rect.width / 2;
    if (e.clientX < mid) {
      grid.insertBefore(dragEl, target);
    } else {
      grid.insertBefore(dragEl, target.nextSibling);
    }
  }

  function onDrop(e) {
    e.preventDefault();
  }

  document.addEventListener('keydown', function(e) {
    if (e.shiftKey && e.ctrlKey && e.key === 'E') {
      e.preventDefault();
      toggle();
    }
  });
}

/* ── Mobile nav state ── */
// Sets body classes that drive which nav-submenu(s) are visible on mobile.
// Re-runs on hashchange so taps in the nav update the submenu open state live.
function syncMobileNavState() {
  var body = document.body;
  var onWork = location.pathname.indexOf('/work/') !== -1;
  body.classList.toggle('is-work-page', onWork);

  var hash = location.hash.replace('#', '');
  var visualFilters = { 'visual': 1, 'art-direction': 1, 'illustration': 1, 'poster': 1, 'branding': 1 };
  var musicFilters  = { 'music': 1, 'original-music': 1, 'film-score': 1 };
  body.classList.toggle('is-filter-visual', onWork && hash in visualFilters);
  body.classList.toggle('is-filter-music',  onWork && hash in musicFilters);

  // Highlight the active nav sublink
  $$('.nav-sublink, .nav-subsublink').forEach(function(a) {
    a.classList.toggle('is-active', a.dataset.mobileFilter === hash || (!hash && a.dataset.mobileFilter === 'all'));
  });

  // Breadcrumb dots: blue on the active leaf, grey on each of its ancestors
  // (Work always; Visual/Music when one of their sub-items is the leaf).
  $$('.nav-link, .nav-sublink, .nav-subsublink').forEach(function(a) {
    a.classList.remove('nav-dot-active', 'nav-dot-ancestor');
  });
  if (onWork) {
    var workMenu = document.querySelector('.nav-submenu--work');
    var workLink = workMenu && workMenu.previousElementSibling;
    if (workLink) workLink.classList.add('nav-dot-ancestor');

    var leaf = document.querySelector('.nav-sublink.is-active, .nav-subsublink.is-active');
    if (leaf) {
      leaf.classList.add('nav-dot-active');
      if (leaf.classList.contains('nav-subsublink')) {
        var group = leaf.closest('.nav-submenu--visual, .nav-submenu--music');
        var groupLink = group && group.previousElementSibling;
        if (groupLink) groupLink.classList.add('nav-dot-ancestor');
      }
    }
  }
}

/* ── Init ── */
// Hooks for content added after load (the Work-page card experiment).
window.DC = { galleries: initGalleryMasonry };

document.addEventListener('DOMContentLoaded', function() {
  syncMobileNavState();
  initNavDotGlide();
  initSlideshow();
  initHomeCards();
  initFilters();
  initBlogFilters();
  initSort();
  initGalleryMasonry();
  initLightbox();
  initSpeculation();
  initToolbar();
  initMobileWorkMenu();
  initStickyCards();
  window.addEventListener('hashchange', function() {
    syncMobileNavState();
  });
  // Admin reorder (drag-to-reorder + Ctrl+Shift+E) — only loads when ?admin=1 is set,
  // keeping the prod bundle's behavior lean for visitors.
  if (/[?&]admin=1\b/.test(location.search)) initAdminReorder();
});
})();
