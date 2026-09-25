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
  var ticket = 0, veiled = [];
  function veil() {
    if (still) return;
    veiled = veiled.concat(both([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' }));
  }
  function arrive(url, delay) {
    var mine = ++ticket;
    return getPage(url).then(function (doc) {
      return needStyles(doc, url).then(function () { return doc; });
    }).then(function (doc) {
      return new Promise(function (go) { setTimeout(go, delay || 0); }).then(function () { return doc; });
    }).then(function (doc) {
      if (mine !== ticket || !state) return;          // a later turn (or Back) owns the page now
      fill(doc);
      window.scrollTo(0, 0);
      veiled.forEach(function (a) { a.cancel(); });
      veiled = [];
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
  // the words and the work fade together
  function both(keys, opts) { return [info, body].map(function (e) { return e.animate(keys, opts); }); }
  function easeInBody(delay) {
    if (still) return;
    both([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }],
      { duration: 620, delay: delay || 0, easing: EASE, fill: 'backwards' });
  }
  // The side column sticks at the top while it fits the window; when the
  // words make it taller, it scrolls with the page until its foot is in view.
  function pinSide() {
    if (detail.hidden) return;
    side.style.top = Math.min(32, window.innerHeight - side.offsetHeight - 32) + 'px';
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
      window.scrollTo(0, 0);
      if (push) history.pushState({ wc: card.href }, '', card.href);
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
    window.scrollTo(0, 0);
    if (push) history.pushState({ wc: card.href }, '', card.href);
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
    window.scrollTo(0, s.scroll);
    glide(top, first, top.getBoundingClientRect(), 520).finished.then(function () {
      s.deck.forEach(function (c) { c.style.transition = ''; });
    });
    riseIn([top]);
  }

  // The shuffle, after a Tinder-style swipe (joshmorony.com's Ionic
  // gesture): the top card follows the finger, tilting as it goes; let go past
  // a third of its width, or with a quick flick, and it flies off the way it
  // was thrown, while the deck turns under it at once. Next sends it out to
  // the left and round to the back; Previous sends it out to the right and
  // back in second, as the card from the back comes up on top. Buttons and
  // arrow keys throw it the same way from rest. The page follows (arrive).
  function step(dir, flung) {
    if (!state || busy || state.deck.length < 2) return;
    busy = true;
    var deck = state.deck;
    var leaving = deck[0];
    if (dir > 0) deck.push(deck.shift()); else deck.unshift(deck.pop());
    var coming = deck[0];
    veil();
    arrive(coming.href, 0);
    history.replaceState({ wc: coming.href }, '', coming.href);
    if (still || document.hidden) {                  // no motion: straight to the new order
      leaving.style.transform = leaving.style.transition = '';
      layDeck();
      busy = false;
      return;
    }

    var w = leaving.offsetWidth || 300;
    var from = flung ? flung.transform : 'none';
    var speed = flung ? Math.min(Math.abs(flung.v), 3) : 0;          // px per ms
    var fly = Math.round(Math.max(200, 330 - speed * 70));
    leaving.style.transition = 'none';
    var moves = [];
    if (dir > 0) {
      var out = 'translate(' + (-Math.round(Math.max(window.innerWidth * 1.1, w * 2.2))) + 'px, -20px) rotate(-24deg)';
      layDeck();                                                       // the rest step up (their CSS transitions)
      leaving.style.zIndex = '400';                                   // over the deck while it leaves
      moves.push(leaving.animate([{ transform: from, opacity: 1 }, { transform: out, opacity: 1 }], { duration: fly, easing: 'cubic-bezier(0.25, 0.6, 0.35, 1)', fill: 'forwards' }));
    } else {
      var aside = 'translate(' + Math.round(w * 0.9) + 'px, -14px) rotate(14deg)';
      coming.style.transition = 'none';
      layDeck();
      moves.push(leaving.animate([{ transform: from }, { transform: aside, offset: 0.45 }, { transform: 'translateY(14px) scale(0.95)' }], { duration: 560, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)', fill: 'forwards' }));
      moves.push(coming.animate([{ transform: 'translateY(-10px) scale(1.04)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 460, delay: 90, easing: EASE, fill: 'backwards' }));
    }
    var safety = setTimeout(function () { busy = false; }, 1000);
    Promise.all(moves.map(function (m) { return m.finished.catch(function () {}); })).then(function () {
      clearTimeout(safety);
      // round to its new place in the deck: let go of the animation with the
      // card's own transition off, so it doesn't sail back across the page
      moves.forEach(function (m) { m.cancel(); });
      leaving.style.transform = '';
      leaving.style.zIndex = String(200 - deck.indexOf(leaving));
      requestAnimationFrame(function () {
        leaving.style.transition = '';
        coming.style.transition = '';
      });
      busy = false;
    });
  }


  // Deal the cards back into the grid, in their original order; the rest of
  // the grid rises into place around them.
  function closeProject() {
    if (!state || direct) return;
    var s = state;
    state = null;
    ticket++;
    veiled.forEach(function (a) { a.cancel(); });
    veiled = [];
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

  // Flick through the deck: drag (or swipe) the top card left for the next
  // project, right for the one before.
  var flick = null;
  deckEl.addEventListener('pointerdown', function (e) {
    if (e.button || !state || busy || state.deck.length < 2) return;
    var card = state.deck[0];
    if (!card.contains(e.target)) return;
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
    flick.card.style.transform = 'translateX(' + dx.toFixed(1) + 'px) rotate(' + (dx / 20).toFixed(2) + 'deg)';
    // the card behind comes forward as this one goes (to the left: it's next)
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
    // the card behind: back to its CSS place, from wherever the drag left it
    f.next.style.transition = '';
    f.next.style.transform = '';
    if (far || quick) {
      step(f.dx < 0 ? 1 : -1, { transform: f.card.style.transform, v: f.v });
      return;
    }
    // not far enough: spring back
    f.card.style.transition = 'transform 0.45s cubic-bezier(0.2, 0.9, 0.1, 1.15)';
    f.card.style.transform = '';
    setTimeout(function () { if (!flick || flick.card !== f.card) f.card.style.transition = ''; }, 460);
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
