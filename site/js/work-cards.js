/* Work: open a project in place, as a deck of cards.

   On /work/, click a card: every card that's showing gathers into a deck in
   the left column, the chosen one on top and the next few peeking out
   beneath it, and the project eases in beside the deck. Previous / Next (or
   the ← → keys) shuffle: the top card slides out and tucks in behind, or the
   back card comes round to the top, and the project crossfades. "Back to
   projects" (or the browser's back button, or Esc) deals the cards back
   into the grid. Picking a filter while a project is open goes back to the
   grid first. The address follows the project on top.

   A project's own page (a shared link, a reload) is built the same way, with
   its card on top: the rest of the deck is filled in from /work/ once the
   page is up, and Previous / Next shuffle in place from then on. Without
   this script those are plain links, and everything still works.

   Motion rules that keep it clean:
   - one mover per property at a time: while a card is being carried by a
     view transition or a scripted animation, its own CSS transitions are
     off, so nothing plays twice;
   - the deck's size never changes during a shuffle (its cards share one grid
     cell, so all take the tallest one's height);
   - whatever animates into a new state starts inside the transition's
     update, so the live picture already shows it. */
(function () {
  'use strict';
  var grid = document.querySelector('.work-grid');
  var detail = document.querySelector('.wc-detail');
  if (!grid && !detail) return;
  var direct = !grid;   // a project page, opened on its own
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(0.2, 0.9, 0.1, 1)';        // quick out, long settle
  var EASE_IN = 'cubic-bezier(0.5, 0, 0.75, 0.4)';
  var gridTitle = document.title;
  var home = new URL('./', location.href).pathname;   // /work/
  var state = null;   // { deck: [cards, top first], order, scroll }
  // a card near the top of the deck is drawn bigger than in the grid: its
  // image is asked for at the deck's size (build_work_index.py DECK_SIZES)
  var DECK_SIZES = '(min-width: 1100px) 400px, (min-width: 768px) 300px, 260px';
  var busy = false;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  // The open view. A project page ships it in its HTML; /work/ builds the
  // same thing, hidden, after the grid.
  if (!detail) {
    detail = el('div', 'wc-detail');
    detail.hidden = true;
    var sideEl = el('div', 'wc-side');
    var box = el('div', 'wc-deck-box');
    box.appendChild(el('div', 'wc-deck'));
    var nav = el('nav', 'wc-controls');
    nav.setAttribute('aria-label', 'Projects');
    var back = el('a', 'wc-back-link', 'Back to projects');
    back.href = home;
    var arrowsEl = el('span', 'wc-arrows');
    var chev = function (d) {
      return '<svg class="wc-chev" viewBox="0 0 8 14" aria-hidden="true"><path d="' + d +
        '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    };
    var prevEl = el('a', 'wc-arrow wc-prev'), nextEl = el('a', 'wc-arrow wc-next');
    prevEl.innerHTML = chev('M6.5 1.5 1.5 7l5 5.5') + 'Previous';
    nextEl.innerHTML = 'Next' + chev('M1.5 1.5 6.5 7l-5 5.5');
    arrowsEl.append(prevEl, nextEl);
    nav.append(back, arrowsEl);
    sideEl.append(box, nav, el('div', 'wc-info'));
    detail.append(sideEl, el('div', 'wc-body'));
    grid.parentNode.insertBefore(detail, grid.nextSibling);
  }
  var side = detail.querySelector('.wc-side');
  var deckEl = detail.querySelector('.wc-deck');
  var backLink = detail.querySelector('.wc-back-link');
  var arrows = detail.querySelector('.wc-arrows');
  var prevBtn = detail.querySelector('.wc-prev');
  var nextBtn = detail.querySelector('.wc-next');
  var info = detail.querySelector('.wc-info');
  var body = detail.querySelector('.wc-body');
  var stagger = document.createElement('style');
  document.head.appendChild(stagger);
  // Back / Previous / Next again at the foot of the work
  var foot = document.createElement('nav');
  foot.className = 'wc-foot';
  foot.setAttribute('aria-label', 'Projects');
  foot.innerHTML = detail.querySelector('.wc-controls').innerHTML;
  detail.appendChild(foot);
  var footPrev = foot.querySelector('.wc-prev'), footNext = foot.querySelector('.wc-next'), footBack = foot.querySelector('.wc-back-link');

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
      if (raise) { c.style.position = 'relative'; c.style.zIndex = String(Math.max(1, 90 - k)); }   // under the menu (100) and the filters (99)
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

  // Pages, fetched once and kept.
  var pages = {}, ready = {};
  function getPage(url) {
    if (!pages[url]) {
      pages[url] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        ready[url] = doc;
        return doc;
      });
      pages[url].catch(function () { delete pages[url]; });
    }
    return pages[url];
  }
  // A page's words and work, in when they arrive: the cards never wait for
  // the network. Each turn of the deck takes a ticket; only the latest one's
  // page is shown, so a quick run of flicks lands on the last.
  // While the deck turns, the words fade and the work goes behind a veil of
  // the page's own grey (work-cards.css). The veil is one flat colour, so it
  // costs nothing to fade; fading the work itself meant redrawing every
  // picture in it at once, and the throw stuttered on its first frame.
  var ticket = 0, hush = null;
  function veil() {
    if (still) return;
    detail.classList.add('wc-veil');
    if (hush) hush.cancel();
    hush = info.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
  }
  // `delay`: not before this long from now (a turn's page waits for its card
  // to be well on its way, so the two don't move at once)
  function arrive(url, delay) {
    var mine = ++ticket, at = performance.now() + (delay || 0);
    return getPage(url).then(function (doc) {
      return needStyles(doc, url).then(function () { return doc; });
    }).then(function (doc) {
      return new Promise(function (go) { setTimeout(go, Math.max(0, at - performance.now())); }).then(function () { return doc; });
    }).then(function (doc) {
      if (mine !== ticket || !state) return;          // a later turn (or Back) owns the page now
      fill(doc);
      // straight to the top: the page's smooth scrolling (style.css) would
      // otherwise glide there under the new work
      window.scrollTo({ top: 0, behavior: 'instant' });
      easeInBody(0);
      return settle(doc, url);
    }).catch(function (err) {
      if (window.console) console.error('work-cards:', err);
      if (mine === ticket) location.href = url;          // the page itself, then
    });
  }

  // Top card first; three more peek out beneath it; the next one (and the
  // last, for Previous) wait unseen just behind with their images loaded;
  // the rest aren't drawn at all until they come round.
  function layDeck() {
    var deck = state.deck, n = deck.length;
    deck.forEach(function (c, i) {
      var layer = i < 4 ? i : (i === 4 || i === n - 1) ? 4 : 5;
      c.style.zIndex = String(200 - i);
      c.setAttribute('data-layer', String(layer));
      c.tabIndex = -1;
      var img = c.querySelector('img');
      if (img && layer < 5) img.loading = 'eager';
      // the top two, and the last (Previous brings it up), sharp at deck size
      if (img && img.srcset && (i < 2 || i === n - 1) && img.sizes !== DECK_SIZES) img.sizes = DECK_SIZES;
    });
    arrows.hidden = n < 2;
    foot.querySelector('.wc-arrows').hidden = n < 2;
    if (n > 1) {
      [nextBtn, footNext].forEach(function (a) { a.setAttribute('href', deck[1].getAttribute('href')); });
      [prevBtn, footPrev].forEach(function (a) { a.setAttribute('href', deck[n - 1].getAttribute('href')); });
    }
  }

  function fill(doc) {
    var words = doc.querySelector('.wc-info');
    var work = doc.querySelector('.wc-body');
    if (!words || !work) throw new Error('not a project page');
    info.replaceChildren.apply(info, [].slice.call(document.importNode(words, true).childNodes));
    body.replaceChildren.apply(body, [].slice.call(document.importNode(work, true).childNodes));
    if (!body.children.length) body.textContent = '';   // all words: let :empty match
    requestAnimationFrame(pinSide);
    document.title = doc.title;
  }
  // The words rise and fade in; the work comes out from behind the veil
  // (covered at once first, when it wasn't already).
  function easeInBody(delay) {
    if (hush) { hush.cancel(); hush = null; }
    if (still) { detail.classList.remove('wc-veil'); return; }
    info.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
      { duration: 560, delay: delay || 0, easing: EASE, fill: 'backwards' });
    if (!detail.classList.contains('wc-veil')) {
      detail.classList.add('wc-veil', 'wc-veil-now');
      void body.offsetWidth;
      detail.classList.remove('wc-veil-now');
    }
    setTimeout(function () { detail.classList.remove('wc-veil'); }, delay || 0);
  }
  // The side column sticks at the top while it all fits the window. When the
  // words make it taller, it scrolls until the card has gone by and then keeps
  // Back / Previous / Next and the words (if those fit), or else just scrolls
  // with the page: stuck part-way, the foot of the card rode along at the top
  // of the screen like a header.
  function pinSide() {
    if (detail.hidden) return;
    var room = window.innerHeight - 64;              // 32px clear above and below
    var h = side.offsetHeight;
    var ctl = side.querySelector('.wc-controls');
    var below = ctl ? ctl.getBoundingClientRect().top - side.getBoundingClientRect().top : 0;
    if (h <= room) { side.style.position = ''; side.style.top = '32px'; }
    else if (ctl && h - below <= room) { side.style.position = ''; side.style.top = (32 - below) + 'px'; }
    else { side.style.position = 'static'; side.style.top = ''; }
  }

  // A project's own stylesheets (the floating badges, say) that this page
  // doesn't have yet: added, and waited for (briefly), before it's shown.
  function needStyles(doc, base) {
    var have = [].map.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) { return new URL(l.href).pathname; });
    var waits = [].slice.call(doc.querySelectorAll('link[rel="stylesheet"]')).map(function (l) {
      var href = new URL(l.getAttribute('href'), base).href;
      if (have.indexOf(new URL(href).pathname) >= 0) return null;
      return new Promise(function (resolve) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = link.onerror = resolve;
        document.head.appendChild(link);
        setTimeout(resolve, 1500);
      });
    }).filter(Boolean);
    return Promise.all(waits);
  }

  // Page-specific scripts (the HS21 badge ring, the Weissman 3D catalogue,
  // Vimeo's player API) run as they load, so they're added after the content.
  function loadScripts(doc, base) {
    var have = [].map.call(document.querySelectorAll('script[src]'), function (s) { return s.src; });
    var srcs = [].slice.call(doc.querySelectorAll('script[src]'))
      .map(function (s) { return new URL(s.getAttribute('src'), base).href; })
      .filter(function (src) { return !/\/js\/(main|work-cards)\.js/.test(src); })
      // a library from elsewhere (three.js) is loaded once; the page's own
      // scripts run again, for the content they've just been given
      .filter(function (src) { return new URL(src).origin === location.origin || have.indexOf(src) < 0; });
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
  // warm the neighbours so the shuffle is instant
  function warm() {
    if (!state || state.deck.length < 2) return;
    getPage(state.deck[1].href).catch(function () {});
    getPage(state.deck[state.deck.length - 1].href).catch(function () {});
  }
  function settle(doc, url) {
    if (window.DC) window.DC.galleries(body);
    warm();
    return loadScripts(doc, url);
  }

  function openProject(card, push, byKeyboard) {
    if (state || busy) return;
    if (window.DC && window.DC.wakeCards) window.DC.wakeCards();   // the home page's card pictures, if still held back
    document.documentElement.classList.remove('wc-arrive');
    var cards = inReadingOrder(visibleCards());
    var i = cards.indexOf(card);
    if (i < 0) return;
    busy = true;
    var deck = cards.slice(i).concat(cards.slice(0, i));
    var s = { deck: deck, order: [].slice.call(grid.children), scroll: window.scrollY };
    var doc = ready[card.href] || null;                 // already here (hovered, or seen): in with the cards
    ticket++;                                           // any page still on its way is no longer wanted
    var moved = phone.matches && !still && !document.hidden ? openLight(card, deck, s, doc, push) : openFull(card, deck, s, doc, push);
    if (!doc) arrive(card.href, phone.matches ? 380 : 0);
    // a tab put away mid-glide pauses its animations: the deck is never held
    // longer than the glide takes
    var safety = setTimeout(function () { busy = false; }, 1400);
    moved.then(function () {
      if (doc) settle(doc, card.href);
      if (byKeyboard) backLink.focus({ preventScroll: true });   // keyboard users land on the controls
    }).catch(function () {}).then(function () { clearTimeout(safety); busy = false; });
  }
  function openFull(card, deck, s, doc, push) {
    // carry everything on screen (it gathers into the deck), plus the top of the deck
    var done = carry(deck.filter(function (c, k) { return k < 4 || onScreen(c); }), true);
    deck.forEach(function (c) { c.style.transition = 'none'; });
    state = s;
    // the last project's words go now, while the view is still hidden; the
    // new ones may arrive before the transition even starts
    if (!doc) { info.replaceChildren(); body.replaceChildren(); }
    return swap(function () {
      carry.lower();
      document.body.classList.add('wc-open');   // on the home page, the slideshow steps aside
      grid.classList.add('is-hidden');
      // in stack order (top card last in the page), so the transition draws
      // the right card on top the whole way, not just once it lands
      deck.slice().reverse().forEach(function (c) { deckEl.appendChild(c); });
      detail.hidden = false;
      layDeck();
      if (doc) { fill(doc); easeInBody(140); }
      // the new address first: the grid's own history entry keeps the scroll it
      // had, which Back restores (saved after the jump, it was the top of the page)
      if (push) history.pushState({ wc: card.href }, '', card.href);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }).then(function () {
      done();
      deck.forEach(function (c) { c.style.transition = ''; });
    });
  }


  // ── Phones: no page snapshots, just the one card gliding ──
  // A view transition photographs the whole page and every card it carries,
  // which is more than a phone can move smoothly. Here the tapped card glides
  // from its place in the grid to the top of the deck on its own (a FLIP on
  // transform, which the compositor does alone) while the rest fade in.
  var phone = window.matchMedia('(max-width: 767px)');
  function glide(el, from, to, ms) {
    return el.animate([
      { transform: 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + (from.width / to.width) + ')', transformOrigin: '0 0' },
      { transform: 'none', transformOrigin: '0 0' }
    ], { duration: ms, easing: EASE });
  }
  function openLight(card, deck, s, doc, push) {
    var first = card.getBoundingClientRect();
    state = s;
    deck.forEach(function (c) { c.style.transition = 'none'; });
    document.body.classList.add('wc-open');
    grid.classList.add('is-hidden');
    deck.slice().reverse().forEach(function (c) { deckEl.appendChild(c); });
    detail.hidden = false;
    layDeck();
    info.replaceChildren();
    body.replaceChildren();
    if (push) history.pushState({ wc: card.href }, '', card.href);   // before the jump: see openFull
    window.scrollTo({ top: 0, behavior: 'instant' });
    card.style.willChange = 'transform';
    var moves = [glide(card, first, card.getBoundingClientRect(), 560)];
    deck.slice(1, 4).forEach(function (c, k) {
      moves.push(c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, delay: 240 + k * 70, easing: 'ease-out', fill: 'backwards' }));
    });
    return Promise.all(moves.map(function (a) { return a.finished; })).then(function () {
      card.style.willChange = '';
      deck.forEach(function (c) { c.style.transition = ''; });
      // the words and the work come in once the card has landed, so the
      // glide has the phone to itself
      if (doc && state === s) { fill(doc); easeInBody(0); }
    });
  }

  function closeLight(s) {
    var top = s.deck[0], first = top.getBoundingClientRect();
    s.deck.forEach(function (c) {
      c.style.transition = 'none';
      c.style.zIndex = '';
      c.removeAttribute('data-layer');
      c.removeAttribute('tabindex');
    });
    s.order.forEach(function (c) { grid.appendChild(c); });
    detail.hidden = true;
    document.body.classList.remove('wc-open');
    info.replaceChildren();
    body.replaceChildren();
    grid.classList.remove('is-hidden');
    document.title = gridTitle;
    window.scrollTo({ top: s.scroll, behavior: 'instant' });
    glide(top, first, top.getBoundingClientRect(), 520).finished.then(function () {
      s.deck.forEach(function (c) { c.style.transition = ''; });
    });
    riseIn([top]);
  }

  // A turn of the deck, as with a real deck of cards. Next: the front card
  // slides out to the left, clear of the others, and is tucked in at the back,
  // while every card behind it moves up one. Previous is the same in reverse:
  // the card at the back is drawn out to the left from behind the others and
  // laid on the front, while they each move back one. The card only changes
  // sides of the deck (over it, under it) while it's out to the left and
  // clear of the rest, so that can't be seen. A flick carries its speed into
  // the first half; buttons and the arrow keys start from rest. The page's
  // words and work follow (arrive).
  var LAYERS = ['none', 'translateY(14px) scale(0.95)', 'translateY(28px) scale(0.9)', 'translateY(42px) scale(0.85)', 'translateY(42px) scale(0.85)'];
  function layerAt(i, n) { return i < 4 ? i : (i === 4 || i === n - 1) ? 4 : 5; }   // as layDeck
  var flights = [];
  function landFlights() { flights.slice().forEach(function (f) { f.land(); }); }
  function step(dir, flung) {
    if (!state || busy || state.deck.length < 2) return;
    landFlights();
    var deck = state.deck, n = deck.length;
    var mover = dir > 0 ? deck[0] : deck[n - 1];              // the card that goes from one end of the deck to the other
    var back = LAYERS[Math.min(layerAt(n - 1, n), 4)];         // where the back of the deck is drawn
    if (dir > 0) deck.push(deck.shift()); else deck.unshift(deck.pop());
    var coming = deck[0];
    veil();
    arrive(coming.href, still ? 0 : dir > 0 ? 220 : 320);
    history.replaceState({ wc: coming.href }, '', coming.href);
    if (still || document.hidden) {                          // no motion: straight to the new order
      mover.style.transform = mover.style.transition = '';
      layDeck();
      return;
    }

    busy = true;
    var w = mover.offsetWidth || 300;
    var aside = 'translate(' + Math.round(-w * 1.1) + 'px, -10px) rotate(-5deg)';   // just clear of the deck, on its left
    var from = dir > 0 ? (flung ? flung.transform : 'none') : back;
    var to = dir > 0 ? back : 'none';
    var outMs = flung ? Math.round(Math.min(300, Math.max(150, 1.6 * Math.max(30, w * 1.1 - Math.abs(flung.dx || 0)) / Math.max(Math.abs(flung.v), 0.8)))) : 300;
    var inMs = dir > 0 ? 400 : 440;
    mover.style.transition = 'none';
    deckEl.classList.add('is-turning');
    if (dir > 0) layDeck();                                   // the rest move up as the front card leaves
    mover.style.zIndex = dir > 0 ? '400' : '1';              // Next: over the deck on its way out; Previous: drawn from behind it
    var rushed = false;
    var legs = [mover.animate([{ transform: from, opacity: 1 }, { transform: aside, opacity: 1 }],
      { duration: outMs, easing: flung ? 'cubic-bezier(0.25, 0.6, 0.4, 1)' : 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards' })];
    var flight = { land: function () { rushed = true; legs.forEach(function (a) { a.finish(); }); } };
    flights.push(flight);
    legs[0].finished.then(function () {
      // round the side of the deck: behind it now (Next), or laid on top (Previous)
      if (dir < 0) layDeck();                                 // the rest move back as it comes to the front
      mover.style.zIndex = dir > 0 ? '1' : '400';
      legs.push(mover.animate([{ transform: aside, opacity: 1 }, { transform: to, opacity: 1 }],
        { duration: inMs, easing: dir > 0 ? 'cubic-bezier(0.4, 0, 0.2, 1)' : 'cubic-bezier(0.25, 0.8, 0.25, 1)', fill: 'forwards' }));
      if (rushed) legs[1].finish();
      return legs[1].finished;
    }).then(land, land);
    // the next turn can start once this card is most of the way home
    var free = setTimeout(function () { busy = false; }, outMs + Math.round(inMs * 0.6));
    function land() {
      if (flights.indexOf(flight) < 0) return;
      flights.splice(flights.indexOf(flight), 1);
      clearTimeout(free);
      busy = false;
      // its place in the deck from the css now, with its own transition off
      // until it's there (the animation ended exactly on that place)
      legs.forEach(function (a) { a.cancel(); });
      var i = state ? state.deck.indexOf(mover) : -1;
      mover.style.transform = '';
      mover.style.zIndex = i >= 0 ? String(200 - i) : '';
      requestAnimationFrame(function () {
        mover.style.transition = '';
        if (!flights.length) deckEl.classList.remove('is-turning');
      });
    }
  }


  // Deal the cards back into the grid, in their original order; the rest of
  // the grid rises into place around them.
  function closeProject() {
    if (!state || direct) return;
    var s = state;
    state = null;
    ticket++;
    landFlights();
    deckEl.classList.remove('is-turning');
    if (hush) { hush.cancel(); hush = null; }
    detail.classList.remove('wc-veil');
    if (phone.matches && !still) { closeLight(s); return; }
    var top = s.deck.slice(0, window.matchMedia('(max-width: 767px)').matches ? 2 : 4);
    var done = carry(top);
    s.deck.forEach(function (c) { c.style.transition = 'none'; });
    swap(function () {
      s.deck.forEach(function (c) {
        c.style.zIndex = '';
        c.removeAttribute('data-layer');
        c.removeAttribute('tabindex');
      });
      s.order.forEach(function (c) { grid.appendChild(c); });
      detail.hidden = true;
      document.body.classList.remove('wc-open');
      info.replaceChildren();
      body.replaceChildren();
      grid.classList.remove('is-hidden');
      document.title = gridTitle;
      window.scrollTo({ top: s.scroll, behavior: 'instant' });
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
  function leave() {
    if (direct) location.href = backLink.href;
    else history.back();
  }

  // A project page: its own card is on top; the rest of the deck comes from
  // /work/, in the grid's order, and fans out behind it.
  function dealIn() {
    var top = deckEl.querySelector('.project-card');
    if (!top) return;
    state = { deck: [top] };
    layDeck();
    pinSide();
    getPage(home).then(function (doc) {
      var all = [].slice.call(doc.querySelectorAll('.work-grid .project-card'));
      var me = top.getAttribute('href');
      var i = all.map(function (c) { return c.getAttribute('href'); }).indexOf(me);
      if (i < 0) return;
      var rest = all.slice(i + 1).concat(all.slice(0, i)).map(function (c) {
        var card = document.importNode(c, true);
        card.setAttribute('href', new URL(c.getAttribute('href'), location.origin + home).href);
        var img = card.querySelector('img');
        if (img) img.loading = 'lazy';
        return card;
      });
      rest.slice().reverse().forEach(function (c) { deckEl.insertBefore(c, deckEl.firstChild); });
      softLoad(rest);
      state.deck = [top].concat(rest);
      layDeck();
      pinSide();
      if (!still) {
        rest.slice(0, 3).forEach(function (c, k) {
          c.style.transition = 'none';
          c.animate([{ transform: 'none', opacity: 0 }, {}], { duration: 700, delay: 120 + k * 70, easing: EASE, fill: 'backwards' })
            .finished.then(function () { c.style.transition = ''; }, function () {});
        });
      }
      warm();
    }).catch(function () {});   // no deck behind: Previous / Next stay plain links
  }

  // A card image that isn't in yet waits on the card's grey and fades up
  // when it lands, instead of popping in line by line.
  function softLoad(cards) {
    cards.forEach(function (c) {
      var img = c.querySelector('.card-image img');
      if (!img || img.complete) return;
      img.classList.add('wc-wait');
      var done = function () { img.classList.remove('wc-wait'); };
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
  }
  if (grid) softLoad([].slice.call(grid.querySelectorAll('.project-card')));
  // the arrival (work-cards.css) plays once; after that the class goes
  if (document.documentElement.classList.contains('wc-arrive')) {
    setTimeout(function () { document.documentElement.classList.remove('wc-arrive'); }, 1500);
  }

  // the deck has its own width (CSS), so a resize only moves the pin
  var resizing = false;
  window.addEventListener('resize', function () {
    if (resizing) return;
    resizing = true;
    requestAnimationFrame(function () { resizing = false; pinSide(); });
  });

  if (grid) {
    // card links, fixed to where they point from this page: the address
    // changes when a project opens, and a relative link would follow it
    [].forEach.call(grid.querySelectorAll('.project-card'), function (c) { c.setAttribute('href', c.href); });
    var early = function (e) {
      var c = e.target.closest && e.target.closest('.project-card');
      if (c) getPage(c.href).catch(function () {});
    };
    grid.addEventListener('pointerover', early);
    grid.addEventListener('pointerdown', early);
    grid.addEventListener('click', function (e) {
      var card = e.target.closest('.project-card');
      if (!card || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (document.body.classList.contains('admin-reorder')) return;
      e.preventDefault();
      openProject(card, true, e.detail === 0);
    });
  }
  // In the deck the cards are the header, not links.
  deckEl.addEventListener('click', function (e) { if (e.target.closest('.project-card')) e.preventDefault(); });
  deckEl.addEventListener('dragstart', function (e) { e.preventDefault(); });

  // Flick through the deck: drag the front card to the left and let go, and
  // it goes on round to the back (the next project); pull it to the right
  // and it gives a little, then the card at the back comes round to the
  // front (the one before). A short drag springs back.
  var flick = null;
  deckEl.addEventListener('pointerdown', function (e) {
    if (e.button || !state || busy || state.deck.length < 2) return;
    var card = state.deck[0];
    if (!card.contains(e.target)) return;
    landFlights();
    flick = { card: card, next: state.deck[1], id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, lastX: e.clientX, lastT: performance.now(), v: 0, on: false };
  });
  deckEl.addEventListener('pointermove', function (e) {
    if (!flick || e.pointerId !== flick.id) return;
    var dx = e.clientX - flick.x, dy = e.clientY - flick.y;
    if (!flick.on) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { flick = null; return; }     // a scroll, not a flick
      flick.on = true;
      try { deckEl.setPointerCapture(e.pointerId); } catch (err) {}  // already let go: fine
      flick.card.style.transition = 'none';
      flick.next.style.transition = 'none';
      flick.card.style.willChange = flick.next.style.willChange = 'transform';
    }
    var now = performance.now(), dt = Math.max(1, now - flick.lastT);
    flick.v = flick.v * 0.6 + ((e.clientX - flick.lastX) / dt) * 0.4;   // px per ms, smoothed
    flick.lastX = e.clientX;
    flick.lastT = now;
    flick.dx = dx;
    // to the left it follows the finger, on its way to the back, and the
    // card behind comes up as it goes; to the right it only gives a little
    var x = dx < 0 ? dx : dx * 0.3;
    flick.card.style.transform = 'translateX(' + x.toFixed(1) + 'px) rotate(' + (x / 24).toFixed(2) + 'deg)';
    var p = dx < 0 ? Math.min(1, -dx / (flick.card.offsetWidth * 0.6)) : 0;
    flick.next.style.transform = 'translateY(' + (14 * (1 - p)).toFixed(1) + 'px) scale(' + (0.95 + 0.05 * p).toFixed(3) + ')';
  });
  function unflick(e) {
    if (!flick || (e && e.pointerId !== flick.id)) return;
    var f = flick;
    flick = null;
    if (!f.on) return;
    f.card.style.willChange = f.next.style.willChange = '';
    var far = Math.abs(f.dx) > f.card.offsetWidth * 0.33;
    var quick = Math.abs(f.v) > 0.5 && (f.v < 0) === (f.dx < 0);
    // the card behind: on under the css from wherever the drag left it
    f.next.style.transition = '';
    f.next.style.transform = '';
    if (far || quick) {
      if (f.dx < 0) { step(1, { transform: f.card.style.transform, v: f.v, dx: f.dx }); return; }
      // to the right: back into the deck (css), as the back card comes round
      f.card.style.transition = '';
      f.card.style.transform = '';
      step(-1);
      return;
    }
    // not far enough: spring back
    f.card.style.transition = 'transform 0.5s cubic-bezier(0.3, 1.25, 0.5, 1)';
    f.card.style.transform = '';
    setTimeout(function () { if (!flick || flick.card !== f.card) f.card.style.transition = ''; }, 520);
  }
  deckEl.addEventListener('pointerup', unflick);
  deckEl.addEventListener('pointercancel', unflick);
  // a trackpad's two-finger swipe over the deck does the same
  var swipeSum = 0, swipeQuiet = 0;
  deckEl.addEventListener('wheel', function (e) {
    if (!state || state.deck.length < 2 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    var now = performance.now();
    if (now < swipeQuiet) { swipeQuiet = now + 180; return; }   // the rest of one swipe's momentum
    swipeSum += e.deltaX;
    if (Math.abs(swipeSum) > 60) {
      step(swipeSum > 0 ? 1 : -1);
      swipeSum = 0;
      swipeQuiet = now + 180;
    }
  }, { passive: false });
  function plainClick(e) { return !(e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey); }
  [backLink, footBack].forEach(function (a) {
    a.setAttribute('href', backLink.getAttribute('href'));
    a.addEventListener('click', function (e) {
      if (direct || !plainClick(e)) return;   // a project page: just go to /work/
      e.preventDefault();
      history.back();
    });
  });
  [[prevBtn, -1], [nextBtn, 1], [footPrev, -1], [footNext, 1]].forEach(function (b) {
    b[0].addEventListener('click', function (e) {
      if (!plainClick(e) || !state || state.deck.length < 2) return;   // deck not ready: follow the link
      e.preventDefault();
      step(b[1]);
    });
  });

  window.addEventListener('popstate', function (e) {
    if (direct) return;
    if (state && !(e.state && e.state.wc)) { closeProject(); return; }
    if (!state && e.state && e.state.wc) {
      var card = visibleCards().filter(function (c) { return c.href === e.state.wc; })[0];
      if (card) openProject(card, false);
    }
  });

  if (!direct) {
    // picking a filter while a project is open goes back to the grid first
    var bar = document.querySelector('.filter-bar');
    if (bar) {
      bar.addEventListener('click', function (e) {
        if (state && e.target.closest('.filter-btn')) {
          closeProject();
          history.replaceState(null, '', home + location.hash);
        }
      }, true);
    }
    // so does "Work" in the menu
    [].forEach.call(document.querySelectorAll('.nav-link'), function (l) {
      if (l.textContent.trim() === 'Work') l.addEventListener('click', function () { if (state) history.back(); });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (!state || detail.hidden || busy && e.key === 'Escape' || document.querySelector('.lightbox.open')) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'Escape') leave();
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });

  if (direct) dealIn();
})();
