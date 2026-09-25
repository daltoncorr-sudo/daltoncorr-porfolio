/* Work-page experiment: open a project in place, as a deck of cards.

   Click a card: every card that's showing gathers into a deck in the left
   column, the chosen one on top and the next few peeking out beneath it, and
   the project eases in beside the deck. Previous / Next (or the ← → keys)
   shuffle: the top card slides out and tucks in behind, or the back card
   comes round to the top, and the project crossfades. "Back to projects"
   (or the browser's back button, or Esc) deals the cards back into the
   grid. Filters work as before; picking one while a project is open goes
   back to the grid first. The address follows the project on top, so a
   reload or a shared link opens that project's own page.

   Motion rules that keep it clean:
   - one mover per property at a time: while a card is being carried by a
     view transition or a scripted animation, its own CSS transitions are
     off, so nothing plays twice;
   - the deck's size never changes during a shuffle (every card takes the
     tallest card's height, once, when the deck is dealt);
   - whatever animates into a new state starts inside the transition's
     update, so the live picture already shows it. */
(function () {
  'use strict';
  var grid = document.querySelector('.work-grid');
  if (!grid) return;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(0.2, 0.9, 0.1, 1)';        // quick out, long settle
  var EASE_IN = 'cubic-bezier(0.5, 0, 0.75, 0.4)';
  var gridTitle = document.title;
  // This test copy lives at its own address but resolves links against
  // /work/ (<base>), so a filter's "#music" would land on /work/#music.
  var home = location.pathname;
  var state = null;   // { deck: [cards, top first], order, scroll, back }
  var busy = false;

  function el(tag, cls) { var e = document.createElement(tag); e.className = cls; return e; }

  var detail = el('div', 'wc-detail');
  detail.hidden = true;
  var side = el('div', 'wc-side');
  var deckBox = el('div', 'wc-deck-box');   // holds the scaled-down deck's footprint
  var deckEl = el('div', 'wc-deck');
  deckBox.appendChild(deckEl);
  var controls = el('div', 'wc-controls');
  var backLink = el('button', 'wc-back-link');
  backLink.type = 'button';
  backLink.textContent = 'Back to projects';
  var arrows = el('div', 'wc-arrows');
  var prevBtn = el('button', 'wc-arrow wc-prev');
  var nextBtn = el('button', 'wc-arrow wc-next');
  prevBtn.type = nextBtn.type = 'button';
  prevBtn.textContent = 'Previous';
  nextBtn.textContent = 'Next';
  arrows.append(prevBtn, nextBtn);
  controls.append(backLink, arrows);
  side.append(deckBox, controls);
  var body = el('div', 'wc-body');
  detail.append(side, body);
  grid.parentNode.insertBefore(detail, grid.nextSibling);
  var stagger = document.createElement('style');
  document.head.appendChild(stagger);

  // Same-document view transition where there is one; otherwise just swap.
  function swap(update) {
    if (document.startViewTransition && !still && !document.hidden) {
      return document.startViewTransition(update).finished.catch(function () {});
    }
    update();
    return Promise.resolve();
  }

  function visibleCards() {
    return [].slice.call(grid.querySelectorAll('.project-card')).filter(function (c) {
      return !c.classList.contains('card-hidden');
    });
  }
  // The order you see (row by row), which isn't always the order in the page.
  function inReadingOrder(cards) {
    var at = new Map(cards.map(function (c) { var r = c.getBoundingClientRect(); return [c, [Math.round(r.top), r.left]]; }));
    return cards.slice().sort(function (a, b) {
      var p = at.get(a), q = at.get(b);
      return p[0] - q[0] || p[1] - q[1];
    });
  }
  function onScreen(c) {
    var r = c.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }
  // Name the cards a view transition should carry, each arriving a beat
  // after the one before (the top card first). Returns the clean-up.
  // The transition draws its cards in the order they were painted BEFORE
  // the change, so `raise` lifts them into stack order first (the chosen
  // card highest) and carry.lower() drops that again inside the update.
  function carry(cards, raise) {
    var css = '';
    cards.forEach(function (c, k) {
      c.style.viewTransitionName = 'wc-' + k;
      c.style.transition = 'none';
      if (raise) { c.style.position = 'relative'; c.style.zIndex = String(500 - k); }
      if (k) css += '::view-transition-group(wc-' + k + '){animation-delay:' + Math.min(k * 16, 200) + 'ms}';
    });
    stagger.textContent = css;
    carry.lower = function () {
      cards.forEach(function (c) { c.style.position = ''; c.style.zIndex = ''; });
    };
    return function () {
      cards.forEach(function (c) { c.style.viewTransitionName = ''; c.style.transition = ''; });
      stagger.textContent = '';
    };
  }

  // Project pages, fetched once and kept.
  var pages = {};
  function getPage(url) {
    if (!pages[url]) {
      pages[url] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      }).then(function (html) { return new DOMParser().parseFromString(html, 'text/html'); });
      pages[url].catch(function () { delete pages[url]; });
    }
    return pages[url];
  }

  // Deal the deck: every card takes the tallest card's height (images fill
  // the difference), so it never changes size mid-shuffle.
  function dealDeck() {
    var cards = state.deck;
    cards.forEach(function (c, i) {
      c.style.height = '';
      var img = c.querySelector('img');
      if (img && i < 5) img.loading = 'eager';
    });
    var h = Math.max.apply(null, cards.map(function (c) { return c.offsetHeight; }));
    cards.forEach(function (c) { c.style.height = h + 'px'; });
    var deckH = h + Math.min(cards.length - 1, 3) * 14;
    deckEl.style.height = deckBox.style.height = deckH + 'px';
    layDeck();
  }
  // Top card first; three more peek out beneath it; the rest wait, unseen,
  // at the back.
  function layDeck() {
    state.deck.forEach(function (c, i) {
      c.style.zIndex = String(200 - i);
      c.setAttribute('data-layer', String(Math.min(i, 4)));
      c.tabIndex = i ? -1 : 0;
    });
    prevBtn.disabled = nextBtn.disabled = state.deck.length < 2;
  }

  function fill(doc) {
    var main = doc.querySelector('main');
    if (!main) throw new Error('no main');
    main = main.cloneNode(true);
    // Never crop the work: the older square-crop galleries become the
    // uncropped masonry ones (a lone image shows whole, large).
    [].forEach.call(main.querySelectorAll('.project-gallery-grid'), function (g) {
      g.classList.remove('project-gallery-grid');
      g.classList.add('project-gallery');
    });
    body.replaceChildren.apply(body, [].slice.call(main.childNodes));
    document.title = doc.title;
  }
  function easeInBody(delay) {
    if (still) return;
    body.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }],
      { duration: 620, delay: delay || 0, easing: EASE, fill: 'backwards' });
  }

  // Page-specific scripts (the HS21 badge ring, the Weissman 3D catalogue,
  // Vimeo's player API) run as they load, so they're added after the content.
  function loadScripts(doc, base) {
    var srcs = [].slice.call(doc.querySelectorAll('script[src]'))
      .map(function (s) { return new URL(s.getAttribute('src'), base).href; })
      .filter(function (src) { return !/\/js\/main\.js/.test(src); });
    return srcs.reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (resolve) {
          var s = document.createElement('script');
          s.src = src;
          s.onload = s.onerror = resolve;
          document.body.appendChild(s);
        });
      });
    }, Promise.resolve());
  }
  function settle(doc, url) {
    if (window.DC) window.DC.galleries(body);
    // warm the neighbours so the shuffle is instant
    if (state && state.deck.length > 1) {
      getPage(state.deck[1].href).catch(function () {});
      getPage(state.deck[state.deck.length - 1].href).catch(function () {});
    }
    return loadScripts(doc, url);
  }

  function openProject(card, push, byKeyboard) {
    if (state || busy) return;
    var cards = inReadingOrder(visibleCards());
    var i = cards.indexOf(card);
    if (i < 0) return;
    busy = true;
    var deck = cards.slice(i).concat(cards.slice(0, i));
    var s = { deck: deck, order: [].slice.call(grid.children), scroll: window.scrollY, back: location.pathname + location.hash };
    getPage(card.href).then(function (doc) {
      // carry everything on screen (it gathers into the deck), plus the top
      // of the deck
      var done = carry(deck.filter(function (c, k) { return k < 4 || onScreen(c); }), true);
      deck.forEach(function (c) { c.style.transition = 'none'; });
      state = s;
      return swap(function () {
        carry.lower();
        grid.classList.add('is-hidden');
        // in stack order (top card last in the page), so the transition draws
        // the right card on top the whole way, not just once it lands
        deck.slice().reverse().forEach(function (c) { deckEl.appendChild(c); });
        detail.hidden = false;
        dealDeck();
        fill(doc);
        window.scrollTo(0, 0);
        easeInBody(140);
        if (push) history.pushState({ wc: card.href }, '', card.href);
      }).then(function () {
        done();
        deck.forEach(function (c) { c.style.transition = ''; });
        // keyboard users land on the controls; mouse users get no focus ring
        if (byKeyboard) backLink.focus({ preventScroll: true });
        return settle(doc, card.href);
      });
    }).catch(function (err) {
      if (window.console) console.error('work-cards:', err);
      if (!window.__wcNoRedirect) location.href = card.href; // anything goes wrong: open the project page
    }).then(function () { busy = false; });
  }

  // The shuffle. Next: the top card lifts and slides out to the left with a
  // slight turn, then tucks in behind the deck while the rest step forward.
  // Previous: the card at the back comes round from the left onto the top
  // while the rest step back. The project crossfades.
  var OUT = 'translate(-36%, -14px) rotate(-6deg)';
  var BACK = 'translateY(42px) scale(0.85)';
  function step(dir) {
    if (!state || busy || state.deck.length < 2) return;
    var deck = state.deck;
    var target = dir > 0 ? deck[1] : deck[deck.length - 1];
    var mover = dir > 0 ? deck[0] : target;
    busy = true;
    getPage(target.href).then(function (doc) {
      mover.style.transition = 'none';
      var out = [];
      if (!still) {
        out.push(body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-in', fill: 'forwards' }));
        if (dir > 0) out.push(mover.animate([{ transform: 'none' }, { transform: OUT }], { duration: 320, easing: EASE_IN, fill: 'forwards' }));
      }
      return Promise.all(out.map(function (a) { return a.finished; })).then(function () {
        if (dir > 0) deck.push(deck.shift()); else deck.unshift(deck.pop());
        layDeck(); // the rest step forward or back (their CSS transitions)
        fill(doc);
        window.scrollTo(0, 0);
        history.replaceState({ wc: target.href }, '', target.href);
        out.forEach(function (a) { a.cancel(); });
        var back = null;
        if (!still) {
          back = dir > 0
            ? mover.animate([{ transform: OUT, opacity: 1 }, { transform: BACK, opacity: 0 }], { duration: 520, easing: EASE })
            : mover.animate([{ transform: OUT, opacity: 0, offset: 0 }, { opacity: 1, offset: 0.35 }, { transform: 'none', opacity: 1 }], { duration: 620, easing: EASE });
          body.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: 60, easing: EASE, fill: 'backwards' });
        }
        (back ? back.finished : Promise.resolve()).then(function () { mover.style.transition = ''; });
        return settle(doc, target.href);
      });
    }).catch(function (err) {
      if (window.console) console.error('work-cards:', err);
    }).then(function () { busy = false; });
  }

  // Deal the cards back into the grid, in their original order; the rest of
  // the grid rises into place around them.
  function closeProject() {
    if (!state) return;
    var s = state;
    state = null;
    var top = s.deck.slice(0, 4);
    var done = carry(top);
    s.deck.forEach(function (c) { c.style.transition = 'none'; });
    swap(function () {
      s.deck.forEach(function (c) {
        c.style.zIndex = '';
        c.style.height = '';
        c.removeAttribute('data-layer');
        c.removeAttribute('tabindex');
      });
      s.order.forEach(function (c) { grid.appendChild(c); });
      detail.hidden = true;
      body.replaceChildren();
      grid.classList.remove('is-hidden');
      document.title = gridTitle;
      window.scrollTo(0, s.scroll);
      riseIn(top);
    }).then(function () {
      done();
      s.deck.forEach(function (c) { c.style.transition = ''; });
      if (document.activeElement === backLink || !document.activeElement || document.activeElement === document.body) s.deck[0].focus({ preventScroll: true });
    });
  }
  function riseIn(skip) {
    if (still) return;
    visibleCards().filter(function (c) { return skip.indexOf(c) < 0 && onScreen(c); }).forEach(function (c, i) {
      c.animate([{ transform: 'translateY(22px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 560, delay: 80 + Math.min(i * 28, 240), easing: EASE, fill: 'backwards' });
    });
  }

  // the deck has its own width (CSS), so a resize only re-measures heights
  var resizing = false;
  window.addEventListener('resize', function () {
    if (!state || resizing) return;
    resizing = true;
    requestAnimationFrame(function () { resizing = false; if (state) dealDeck(); });
  });

  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.project-card');
    if (!card || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (document.body.classList.contains('admin-reorder')) return;
    e.preventDefault();
    openProject(card, true, e.detail === 0);
  });
  // In the deck the cards are the header, not links.
  deckEl.addEventListener('click', function (e) { if (e.target.closest('.project-card')) e.preventDefault(); });
  backLink.addEventListener('click', function () { history.back(); });
  prevBtn.addEventListener('click', function () { step(-1); });
  nextBtn.addEventListener('click', function () { step(1); });

  window.addEventListener('popstate', function (e) {
    if (state && !(e.state && e.state.wc)) { closeProject(); return; }
    if (!state && e.state && e.state.wc) {
      var card = visibleCards().filter(function (c) { return c.href === e.state.wc; })[0];
      if (card) openProject(card, false);
    }
  });

  function fixAddress() {
    if (!state && location.pathname !== home) history.replaceState(history.state, '', home + location.hash);
  }
  var bar = document.querySelector('.filter-bar');
  if (bar) {
    // picking a filter while a project is open goes back to the grid first
    bar.addEventListener('click', function (e) {
      if (state && e.target.closest('.filter-btn')) {
        var s = state;
        closeProject();
        history.replaceState(null, '', home + s.back.replace(/^[^#]*/, ''));
      }
    }, true);
    bar.addEventListener('click', function () { setTimeout(fixAddress, 0); });
  }
  window.addEventListener('hashchange', function () { setTimeout(fixAddress, 0); });

  document.addEventListener('keydown', function (e) {
    if (!state || document.querySelector('.lightbox.open')) return;
    if (e.key === 'Escape') history.back();
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
})();
