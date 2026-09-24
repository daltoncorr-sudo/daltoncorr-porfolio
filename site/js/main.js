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

  // Slides after the second carry data-src and are fetched one step ahead of
  // the show, so the page downloads ~2 images up front instead of all 60.
  // ready[i]: true = loaded, 'skip' = broken (never shown), unset = pending.
  var ready = {};
  slides.forEach(function(s, i) {
    s.classList.remove('active');
    var img = s.querySelector('img');
    if (!img) { ready[i] = true; return; }
    if (img.complete && img.naturalWidth > 0) { ready[i] = true; return; }
    img.addEventListener('load', function() { ready[i] = true; });
    img.addEventListener('error', function() { ready[i] = 'skip'; });
  });
  function load(i) {
    var img = slides[i].querySelector('img');
    if (img && img.dataset.src && !img.getAttribute('src')) img.src = img.dataset.src;
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
      }
      load((idx + 1) % len);
      return;
    }
  }
  // Each slide stays up 3s. Click the picture to pause or resume; the show
  // only runs while the tab is visible, and reduced motion starts paused.
  var paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timer = null;
  function stop() { clearInterval(timer); }
  function start() {
    stop();
    if (!paused && !document.hidden) timer = setInterval(function() { go(cur + 1); }, 3000);
  }
  // A manual step restarts the 3s, so the next slide gets its full time.
  function step(n) { go(n); start(); }
  document.addEventListener('visibilitychange', start);

  slides[0].classList.add('active');
  load(1);
  start();

  wrap.addEventListener('click', function() { paused = !paused; start(); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') step(cur - 1);
    if (e.key === 'ArrowRight') step(cur + 1);
    if (e.key === ' ' && e.target === document.body) { e.preventDefault(); paused = !paused; start(); }
  });
  // Swipe between slides.
  var tx = 0;
  wrap.addEventListener('touchstart', function(e) { tx = e.changedTouches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) step(cur + (dx < 0 ? 1 : -1));
  });
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

      // FLIP: read new positions synchronously, then set inverse transform.
      var moversWithDelta = [];
      toMove.forEach(function(item) {
        var old = oldRects[item.i];
        if (!old) return;
        var now = item.el.getBoundingClientRect();
        var dx = old.left - now.left, dy = old.top - now.top;
        if (dx * dx + dy * dy < 1) return;
        item.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        moversWithDelta.push(item.el);
      });

      // Single rAF: add transition class + clear transform to animate
      requestAnimationFrame(function() {
        moversWithDelta.forEach(function(el) { el.classList.add('card-moving'); el.style.transform = ''; });

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
function initGalleryMasonry() {
  var galleries = $$('.project-gallery:not(.poster-hero)').filter(function(g) {
    var n = g.querySelectorAll('img').length;
    return n > 1 && n === g.children.length; // plain image galleries only
  });
  if (!galleries.length) return;
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
    galleries.forEach(function(g) {
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
  window.addEventListener('resize', relayout);
  // A photo whose real shape differs from its attributes corrects itself on load.
  galleries.forEach(function(g) {
    $$('img', g).forEach(function(img) { img.addEventListener('load', relayout); });
  });
}

/* ── Lightbox ── */
function initLightbox() {
  var lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = '<button class="lightbox-close">\u00D7</button><img src="" alt="">';
  document.body.appendChild(lb);
  var lbImg = lb.querySelector('img');
  function close() { lb.classList.remove('open'); }
  lb.addEventListener('click', close);
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') close(); });
  $$('.project-gallery img, .project-gallery-grid img').forEach(function(img) {
    img.addEventListener('click', function(e) {
      e.stopPropagation();
      lbImg.src = img.src;
      lb.classList.add('open');
    });
  });
}

/* ── Work toolbar show/hide ── */
function initToolbar() {
  var toolbar = $('.work-toolbar');
  if (!toolbar) return;
  var isWorkGrid = !!$('.work-grid');
  var workLink = null;
  $$('.nav-link').forEach(function(l) { if (l.textContent.trim() === 'Work') workLink = l; });

  if (isWorkGrid) toolbar.classList.add('visible');

  var hideTimer;
  function show() { clearTimeout(hideTimer); toolbar.classList.add('visible'); }
  function scheduleHide() {
    hideTimer = setTimeout(function() { if (!isWorkGrid) toolbar.classList.remove('visible'); }, 350);
  }
  if (workLink) {
    workLink.addEventListener('mouseenter', show);
    workLink.addEventListener('mouseleave', scheduleHide);
  }
  toolbar.addEventListener('mouseenter', show);
  toolbar.addEventListener('mouseleave', scheduleHide);

  if (isWorkGrid && workLink) {
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
  function restPos() {
    var r = active.getBoundingClientRect();
    return { x: r.left, y: r.top + r.height / 2 };
  }
  var now = restPos();
  var prev = null;
  try { prev = JSON.parse(sessionStorage.getItem('navDot')); } catch (e) {}

  if (prev) {
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
  // glide from here. Measured at click time, when layout is settled.
  document.addEventListener('click', function (e) {
    if (e.target.closest('.nav-link')) {
      sessionStorage.setItem('navDot', JSON.stringify(restPos()));
    }
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
  if (!meta) return;

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
document.addEventListener('DOMContentLoaded', function() {
  syncMobileNavState();
  initNavDotGlide();
  initSlideshow();
  initFilters();
  initBlogFilters();
  initSort();
  initGalleryMasonry();
  initLightbox();
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
