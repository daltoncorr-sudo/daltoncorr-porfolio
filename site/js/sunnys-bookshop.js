/* Sunny's Bookshop (work/sunnys-bookshop), as on opmetosserpse.com: its
   films and its controls, with that site's own code (its site.js).

   Films: every film plays muted. The signature (video[loop]) goes round
   while it's on screen; every other film (video[data-rest]) plays once when
   it's on screen and rests on its last frame, with Play again under it. The
   announcement film has Play with sound, which turns into Mute. Under
   reduced motion nothing plays until asked (Play).

   Controls (.ctl): hover turns the word bold, in CSS (Opmet, Oct. 15; it
   used to follow the cursor), over a hidden heaviest copy that holds its width.

   The lightbox (main.js) opens a picture from one of the panels on that
   panel's ground, so the Vellum marks on Ink Navy don't vanish on white
   (as opmetosserpse.com's does, Oct. 19).

   Parts marked data-read turn their notes from grey to ink on the reading
   line.

   work-cards.js runs this again each time a project opens in place, so each
   film is marked and skipped the second time, and the page-wide listeners
   are added once. */
(function () {
  'use strict';
  var root = document.querySelector('.sb-os');
  if (!root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var watch = 'IntersectionObserver' in window;

  function label(el, text) {
    var w = el.querySelector('.ctl-w'), v = el.querySelector('.ctl-v');
    if (w && v) { w.textContent = v.textContent = text; } else el.textContent = text;
  }
  // Play with sound turns the film's sound on (from the start, if it has
  // already played and rests) and becomes Mute; Mute turns it back off. If a
  // browser won't play it with sound, it goes back to muted.
  function soundCtl(v, b, play) {
    function say() { label(b, b.getAttribute(v.muted ? 'data-off' : 'data-on')); }
    b.addEventListener('click', function (e) {
      e.preventDefault(); v.muted = !v.muted; say();
      if (!v.muted && v.paused) play(true);
    });
    return say;
  }
  function start(v, say) {
    var p = v.play();
    if (p && p.catch) p.catch(function () { if (!v.muted) { v.muted = true; if (say) say(); var q = v.play(); if (q && q.catch) q.catch(function () {}); } });
    return p;
  }

  // the signature: round and round while on screen
  [].forEach.call(root.querySelectorAll('.pp video[loop]'), function (v) {
    if (v.dataset.sbReady) return;
    v.dataset.sbReady = '1';
    var again = root.querySelector('[data-again="' + v.id + '"]'), b = root.querySelector('[data-unmute="' + v.id + '"]'), say = null;
    function play() { if (again) again.hidden = true; start(v, say); }
    if (b) say = soundCtl(v, b, play);
    if (again) again.addEventListener('click', function (e) { e.preventDefault(); play(); });
    if (reduce || !watch) { if (again) { again.hidden = false; again.textContent = 'Play'; } return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { if (v.paused) play(); } else if (!v.paused) v.pause(); });
    }, { threshold: 0.25 }).observe(v);
  });

  // every other film: once, when it's well on screen, then at rest on its last frame
  [].forEach.call(root.querySelectorAll('.pp video[data-rest]'), function (v) {
    if (v.dataset.sbReady) return;
    v.dataset.sbReady = '1';
    var state = 'idle', again = root.querySelector('[data-again="' + v.id + '"]'), b = root.querySelector('[data-unmute="' + v.id + '"]'), r = v.dataset.rest, say = null;
    function rest() { try { v.currentTime = r === 'end' ? Math.max(0, v.duration - 0.05) : parseFloat(r); } catch (e) {} }
    function offer(t) { if (again) { again.hidden = false; again.textContent = t; } }
    function play(asked) {
      if (state === 'done') v.currentTime = 0;
      state = 'playing'; if (again) again.hidden = true;
      var p = start(v, say); if (p && p.catch && !asked) p.catch(function () { offer('Play'); });
    }
    if (b) say = soundCtl(v, b, play);
    v.addEventListener('ended', function () { state = 'done'; rest(); offer('Play again'); });
    if (again) again.addEventListener('click', function (e) { e.preventDefault(); play(true); });
    if (reduce || !watch) { offer('Play'); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var seen = e.intersectionRect.height >= Math.min(e.boundingClientRect.height * 0.6, innerHeight * 0.35);
        if (seen && state !== 'done') { if (v.paused) play(); }
        else if (!e.isIntersecting && !v.paused) v.pause();
      });
    }, { threshold: [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1] }).observe(v);
  });

  if (window.sbOnce) return;
  window.sbOnce = true;

  // the reading line
  var queued = false;
  function read() {
    queued = false;
    var h = innerHeight;
    [].forEach.call(document.querySelectorAll('.sb-os [data-read]'), function (el) {
      var r = el.getBoundingClientRect(); el.classList.toggle('on', r.top < h * 0.62 && r.bottom > h * 0.38);
    });
  }
  function soon() { if (!queued) { queued = true; requestAnimationFrame(read); } }
  document.addEventListener('scroll', soon, { passive: true, capture: true });
  window.addEventListener('resize', soon);
  soon();

  // the lightbox on a panel's ground: main.js sets its picture; whichever page
  // picture it shows, a picture in a .pnl brings that panel's colours with it
  function ground() {
    var lb = document.querySelector('.lightbox'), pic = lb && lb.querySelector('img');
    if (!lb || !pic) return;
    var name = (pic.getAttribute('src') || '').split('/').pop(), from = null;
    if (name) [].some.call(document.querySelectorAll('.sb-os .pp .m img'), function (img) {
      var refs = (img.getAttribute('src') || '') + ' ' + (img.getAttribute('srcset') || '');
      if (refs.indexOf('/' + name) > -1) { from = img; return true; }
      return false;
    });
    var gr = from && from.closest('.pnl'), cs = gr && getComputedStyle(gr);
    lb.style.background = cs ? cs.backgroundColor : '';
    lb.style.color = cs ? cs.color : '';
  }
  function watchLightbox() {  // main.js makes the lightbox on DOMContentLoaded
    var lb = document.querySelector('.lightbox'), pic = lb && lb.querySelector('img');
    if (!pic || !('MutationObserver' in window)) return false;
    new MutationObserver(ground).observe(pic, { attributes: true, attributeFilter: ['src'] });
    return true;
  }
  if (!watchLightbox()) document.addEventListener('DOMContentLoaded', watchLightbox);
})();
