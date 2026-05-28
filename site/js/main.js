/* Dalton Corr — main.js */
(function(){
'use strict';

function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $$(sel, ctx) { return [].slice.call((ctx || document).querySelectorAll(sel)); }

/* ── Slideshow ── */
function initSlideshow() {
  var wrap = $('.slideshow');
  if (!wrap) return;
  var slides = $$('.slide', wrap), cur = 0, timer;
  if (slides.length < 2) return;

  // Track loaded state per slide
  var ready = {};
  slides.forEach(function(s, i) {
    s.classList.remove('active');
    var img = s.querySelector('img');
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) { ready[i] = true; }
    else { img.onload = function() { ready[i] = true; }; }
  });

  function go(n) {
    var next = (n + slides.length) % slides.length;
    if (!ready[next]) return; // skip unloaded — stay on current
    slides[cur].classList.remove('active');
    cur = next;
    slides[cur].classList.add('active');
  }
  function start() { timer = setInterval(function() { go(cur + 1); }, 1500); }
  function stop() { clearInterval(timer); }

  slides[0].classList.add('active');
  start();

  wrap.addEventListener('mouseenter', stop);
  wrap.addEventListener('mouseleave', start);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') { stop(); go(cur - 1); start(); }
    if (e.key === 'ArrowRight') { stop(); go(cur + 1); start(); }
  });
  var tx = 0;
  wrap.addEventListener('touchstart', function(e) { tx = e.changedTouches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) { stop(); go(cur + (dx < 0 ? 1 : -1)); start(); }
  });
}

/* ── Filters ── */
function initFilters() {
  var bar = $('.filter-bar');
  var grid = $('.work-grid');
  if (!bar || !grid) return;
  document.body.classList.add('is-work-grid');
  var btns = $$('.filter-btn', bar);
  var cards = $$('[data-filters]');
  var dot = document.getElementById('dot');
  var pending = null;
  var busy = false;
  var currentFilter = null;

  // Pre-cache filter sets per card
  var cardFilters = cards.map(function(c) {
    return c.dataset.filters.split(' ');
  });

  function matches(i, f) {
    return f === 'all' || cardFilters[i].indexOf(f) !== -1;
  }

  function apply(f, animate) {
    if (f === currentFilter) return;
    currentFilter = f;
    btns.forEach(function(b) { b.classList.toggle('active', b.dataset.filter === f); });
    // Open the filter group that owns the active button (or close all for "All")
    var activeBtn = bar.querySelector('.filter-btn.active');
    var activeGroup = activeBtn ? activeBtn.closest('.filter-group') : null;
    $$('.filter-group', bar).forEach(function(g) {
      g.classList.toggle('is-open', g === activeGroup);
    });
    if (dot) dot.classList.add('muted');
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
    toMove.forEach(function(item) {
      oldRects[item.i] = item.el.getBoundingClientRect();
    });

    // Phase 1: exit
    if (toHide.length) {
      toHide.forEach(function(c) { c.classList.add('card-exiting'); });
      onceTransition(toHide[0], 'opacity', 270, phase2);
    } else {
      phase2();
    }

    function phase2() {
      toHide.forEach(function(c) {
        c.classList.remove('card-exiting');
        c.classList.add('card-hidden');
      });
      toShow.forEach(function(c) { c.classList.remove('card-hidden'); });

      // FLIP: read new positions synchronously (getBoundingClientRect forces layout)
      // then set inverse transform — no rAF needed for this step
      var moversWithDelta = [];
      toMove.forEach(function(item) {
        var old = oldRects[item.i];
        if (!old) return;
        var now = item.el.getBoundingClientRect();
        var dx = old.left - now.left;
        var dy = old.top - now.top;
        if (dx * dx + dy * dy < 1) return;
        item.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        moversWithDelta.push(item.el);
      });

      // Single rAF: add transition class + clear transform to animate
      requestAnimationFrame(function() {
        moversWithDelta.forEach(function(el) {
          el.classList.add('card-moving');
          el.style.transform = '';
        });

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
          toShow.forEach(function(c) {
            c.classList.remove('card-entering');
            c.style.animationDelay = '';
          });
          busy = false;
          if (pending) { var p = pending; pending = null; apply(p, true); }
        }, Math.max(moveDur, enterDur) + 20);
      });
    }
  }

  bar.addEventListener('click', function(e) {
    var b = e.target.closest('.filter-btn');
    if (!b) return;
    if (busy) { pending = b.dataset.filter; return; }
    apply(b.dataset.filter, true);
  });

  apply(location.hash.replace('#', '') || 'all', false);
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

/* ── Blue dot ── */
function initDot() {
  var dot = document.getElementById('dot');
  var current = document.querySelector('.nav-link.active');
  if (!dot || !current) return;
  var navTop = dot.parentElement.getBoundingClientRect().top;
  var rect = current.getBoundingClientRect();
  var target = rect.top - navTop + rect.height / 2 - 3;
  var from = sessionStorage.getItem('dotTop');
  if (from !== null) {
    dot.style.top = from + 'px';
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        dot.classList.add('animated');
        dot.style.top = target + 'px';
      });
    });
  } else {
    dot.style.top = target + 'px';
  }
  document.addEventListener('click', function(e) {
    if (e.target.closest('.nav-link')) {
      sessionStorage.setItem('dotTop', String(target));
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
    window.addEventListener('scroll', function() {
      var show = card.getBoundingClientRect().bottom < 0;
      if (show !== barVisible) {
        barVisible = show;
        bar.classList.toggle('visible', show);
      }
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
  var pending = null;
  var busy = false;
  var currentFilter = null;

  var cardFilters = cards.map(function(c) {
    return c.dataset.filters.split(' ');
  });

  function matches(i, f) {
    return f === 'all' || cardFilters[i].indexOf(f) !== -1;
  }

  function apply(f, animate) {
    if (f === currentFilter) return;
    currentFilter = f;
    btns.forEach(function(b) { b.classList.toggle('active', b.dataset.filter === f); });
    if (dot) dot.classList.add('muted');
    history.replaceState(null, '', f === 'all' ? location.pathname : '#' + f);

    var toHide = [], toShow = [], toMove = [];
    cards.forEach(function(c, i) {
      var m = matches(i, f);
      var visible = !c.classList.contains('card-hidden');
      if (visible && !m) toHide.push(c);
      else if (!visible && m) toShow.push(c);
      else if (visible && m) toMove.push({ el: c, i: i });
    });

    if (!animate || (!toHide.length && !toShow.length)) {
      toHide.forEach(function(c) { c.classList.add('card-hidden'); });
      toShow.forEach(function(c) { c.classList.remove('card-hidden'); });
      return;
    }

    busy = true;
    var oldRects = {};
    toMove.forEach(function(item) { oldRects[item.i] = item.el.getBoundingClientRect(); });

    if (toHide.length) {
      toHide.forEach(function(c) { c.classList.add('card-exiting'); });
      onceTransition(toHide[0], 'opacity', 270, phase2);
    } else {
      phase2();
    }

    function phase2() {
      toHide.forEach(function(c) { c.classList.remove('card-exiting'); c.classList.add('card-hidden'); });
      toShow.forEach(function(c) { c.classList.remove('card-hidden'); });

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

      requestAnimationFrame(function() {
        moversWithDelta.forEach(function(el) { el.classList.add('card-moving'); el.style.transform = ''; });
        var stagger = toShow.length > 1 ? Math.min(30, 200 / (toShow.length - 1)) : 0;
        toShow.forEach(function(c, i) {
          var delay = Math.round(i * stagger);
          c.style.animationDelay = delay ? delay + 'ms' : '';
          c.classList.add('card-entering');
        });
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

  bar.addEventListener('click', function(e) {
    var b = e.target.closest('.filter-btn');
    if (!b) return;
    e.preventDefault();
    if (busy) { pending = b.dataset.filter; return; }
    apply(b.dataset.filter, true);
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

  apply(location.hash.replace('#', '') || 'all', false);
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
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function() {
  initDot();
  initSlideshow();
  initFilters();
  initBlogFilters();
  initSort();
  initLightbox();
  initToolbar();
  initStickyCards();
  syncMobileNavState();
  window.addEventListener('hashchange', syncMobileNavState);
  // Admin reorder (drag-to-reorder + Ctrl+Shift+E) — only loads when ?admin=1 is set,
  // keeping the prod bundle's behavior lean for visitors.
  if (/[?&]admin=1\b/.test(location.search)) initAdminReorder();
});
})();
