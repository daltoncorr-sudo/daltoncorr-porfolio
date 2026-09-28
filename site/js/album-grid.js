/* Dalton Corr — album-grid.js

   The Espresso Tempo albums as a grid of covers. Each cover is a button that
   plays its album's 30-second sample and pauses it on a second press. One
   <audio> serves the whole grid, so only one sample plays at a time, and
   nothing plays until someone asks. The playing cover shows a pause icon
   (aria-pressed="true") and a thin line along its bottom edge for progress.

   HERE: the project deck can swap this page out while a sample plays; the
   <audio> isn't in the page, so it would keep going. It stops itself as soon
   as the grid has left the document. No arrow keys are used here, so they
   stay with the deck. */
(function () {
'use strict';
var root = document.querySelector('.et-albums');
if (!root) return;
var covers = [].slice.call(root.querySelectorAll('.et-cover'));
if (!covers.length) return;
var audio = new Audio();
audio.preload = 'none';
var current = null;

function gone() {
  if (document.body.contains(root)) return false;
  audio.pause(); audio.removeAttribute('src'); audio.load();
  return true;
}

function label(btn, on) {
  var l = btn.getAttribute('aria-label').replace(/^(Play|Pause) /, '');
  btn.setAttribute('aria-label', (on ? 'Pause ' : 'Play ') + l);
}

function render() {
  var on = !audio.paused && !audio.ended;
  covers.forEach(function (b) {
    var me = b === current && on;
    b.setAttribute('aria-pressed', me ? 'true' : 'false');
    b.classList.toggle('is-playing', me);
    label(b, me);
    if (b !== current) b.style.setProperty('--p', 0);
  });
}

function toggle(btn) {
  if (gone()) return;
  if (btn === current && !audio.paused) { audio.pause(); return; }
  if (btn !== current) {
    if (current) current.style.setProperty('--p', 0);
    audio.pause();
    audio.src = btn.getAttribute('data-audio');
    current = btn;
  }
  var p = audio.play();
  if (p && p.catch) p.catch(function () { render(); });
}

covers.forEach(function (b) {
  b.addEventListener('click', function () { toggle(b); });
});
audio.addEventListener('play', render);
audio.addEventListener('pause', render);
audio.addEventListener('ended', function () {
  if (current) current.style.setProperty('--p', 0);
  audio.currentTime = 0; render();
});
audio.addEventListener('timeupdate', function () {
  if (gone() || !current) return;
  var d = audio.duration || 30;
  current.style.setProperty('--p', Math.min(1, audio.currentTime / d));
});
render();
})();
