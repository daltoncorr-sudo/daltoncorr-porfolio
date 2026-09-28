/* Dalton Corr — album-ring.js

   The Espresso Tempo albums on a ring you can turn. Drag to spin it; it
   settles on the nearest cover. Click a cover (or press Enter on the ring)
   to bring it forward and hear a 30-second sample; while it plays, that cover
   turns slowly on its own axis the way the covers turn on espressotempo.com,
   showing the sleeve's back. Left and right arrows, and the player's buttons,
   move one album along.

   One player serves the ring and the flat grid under it: the covers are
   written into the page as a grid of buttons, each carrying its album's
   title, number, year, sample and link (data-*). The ring is built from
   those buttons, so the grid is the whole list and the fallback. Only one
   <audio> exists, so only one sample plays at a time, and nothing plays until
   someone asks.

   HERE: three.js arrives only when the albums near the viewport (see
   js/three-common.js). Without WebGL the ring never appears and the grid of
   buttons is the player's list. With prefers-reduced-motion the ring does not
   turn on its own and the playing cover does not spin. Arrow keys are stopped
   here so they change the album, not the page's project slides. */
(function () {
'use strict';
var root = document.querySelector('.et3d');
if (!root) return;
var stage = root.querySelector('.et3d-stage');
var host = root.querySelector('.et3d-canvas');
var buttons = [].slice.call(root.querySelectorAll('.et-album'));
var audio = root.querySelector('.et-audio');
var playBtn = root.querySelector('.et-play');
var seek = root.querySelector('.et-seek');
var timeEl = root.querySelector('.et-time');
var titleEl = root.querySelector('.et-now-title');
var metaEl = root.querySelector('.et-now-meta');
var trackEl = root.querySelector('.et-track-name');
var linkEl = root.querySelector('.et-link');
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!buttons.length || !audio) return;

var albums = buttons.map(function (b) {
  var d = b.dataset;
  return { btn: b, cover: b.querySelector('img').getAttribute('src'), num: d.num, name: d.name,
    year: d.year || '', track: d.track, audio: d.audio, href: d.href || '' };
});
var N = albums.length, cur = 0, loaded = -1, ring = null;

/* ── the player ─────────────────────────────────────────────────── */

function pad(n) { return (n < 10 ? '0' : '') + n; }
function clock(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + pad(s % 60); }

function show(i) {
  var a = albums[i];
  titleEl.textContent = a.num + ' // ' + a.name;
  metaEl.textContent = pad(i + 1) + ' / ' + pad(N) + (a.year ? '  ·  ' + a.year : '');
  trackEl.textContent = a.track;
  if (linkEl) {
    if (a.href) { linkEl.href = a.href; linkEl.hidden = false; } else linkEl.hidden = true;
  }
  buttons.forEach(function (b, k) { b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
  if (loaded !== i) { seek.value = 0; timeEl.textContent = '0:00 / 0:30'; }
}

function playing() { return !audio.paused && !audio.ended; }

function play(i) {
  if (i !== loaded) { audio.src = albums[i].audio; loaded = i; }
  var p = audio.play();
  if (p && p.catch) p.catch(function () {});
}

/* choose album i; when `start`, or when something is already playing, play it */
function select(i, start) {
  i = ((i % N) + N) % N;
  var was = playing();
  if (i !== cur) { cur = i; if (was && loaded !== i) audio.pause(); }
  show(i);
  if (ring) ring.go(i);
  if (start || was) play(i);
}

function toggle() { if (playing() && loaded === cur) audio.pause(); else play(cur); }

function sync() {
  var on = playing();
  playBtn.classList.toggle('is-playing', on);
  playBtn.setAttribute('aria-label', (on ? 'Pause ' : 'Play ') + albums[cur].num + ', ' + albums[cur].track);
  buttons.forEach(function (b, k) { b.classList.toggle('is-playing', on && k === loaded); });
  root.classList.toggle('is-playing', on);
  if (ring) ring.want();
}
audio.addEventListener('play', sync);
audio.addEventListener('pause', sync);
audio.addEventListener('ended', function () { audio.currentTime = 0; sync(); });
audio.addEventListener('loadedmetadata', function () { seek.max = audio.duration || 30; });
audio.addEventListener('timeupdate', function () {
  if (loaded !== cur) return;
  seek.value = audio.currentTime;
  timeEl.textContent = clock(audio.currentTime) + ' / ' + clock(audio.duration || 30);
});
seek.addEventListener('input', function () {
  if (loaded !== cur) { audio.src = albums[cur].audio; loaded = cur; }
  try { audio.currentTime = +seek.value; } catch (e) {}
  timeEl.textContent = clock(+seek.value) + ' / ' + clock(audio.duration || 30);
});
playBtn.addEventListener('click', toggle);
root.querySelector('.et-prev').addEventListener('click', function () { select(cur - 1); });
root.querySelector('.et-next').addEventListener('click', function () { select(cur + 1); });
buttons.forEach(function (b, k) {
  b.addEventListener('click', function () { if (k === cur && loaded === k) toggle(); else select(k, true); });
});
// the arrows belong to the albums here, not to the project deck behind the page
root.addEventListener('keydown', function (e) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.stopPropagation();
  if (e.target === seek) return;   // the slider moves itself
  e.preventDefault();
  select(cur + (e.key === 'ArrowLeft' ? -1 : 1));
});
stage.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault(); toggle();
});
show(0); sync();

/* ── the ring ───────────────────────────────────────────────────── */

function sleeveBack(THREE, mark, a) {
  var S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  var g = c.getContext('2d');
  g.fillStyle = '#f1ece4'; g.fillRect(0, 0, S, S);
  if (mark) {   // the cup mark in the house orange
    var t = document.createElement('canvas'); t.width = mark.width; t.height = mark.height;
    var tg = t.getContext('2d'); tg.drawImage(mark, 0, 0);
    tg.globalCompositeOperation = 'source-in'; tg.fillStyle = '#f08a5c'; tg.fillRect(0, 0, t.width, t.height);
    var w = S * 0.34, h = w * mark.height / mark.width;
    g.drawImage(t, (S - w) / 2, (S - h) / 2 - 14, w, h);
  }
  g.fillStyle = '#f08a5c';
  g.font = '500 22px -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';
  g.textAlign = 'center';
  if (g.letterSpacing !== undefined) g.letterSpacing = '6px';
  g.fillText('ESPRESSO TEMPO', S / 2, S * 0.72);
  g.font = '400 18px -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';
  g.fillText(a.num.toUpperCase(), S / 2, S * 0.78);
  var tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
  return tex;
}

/* the reflection fades out down the floor */
function fadeMap(THREE) {
  var c = document.createElement('canvas'); c.width = 4; c.height = 128;
  var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#000'); gr.addColorStop(0.45, '#000'); gr.addColorStop(1, '#fff');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(c);
}

function build(THREE) {
  var renderer = DCThree.renderer(THREE, host);
  renderer.toneMapping = THREE.NoToneMapping;   // the covers keep their true colours
  var scene = new THREE.Scene();
  var bg = new THREE.Color(getComputedStyle(document.body).backgroundColor || '#f5f5f5');
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  var SIZE = 1, GAP = 0.34, R = N * (SIZE + GAP) / (Math.PI * 2), STEP = Math.PI * 2 / N, T = 0.035;
  var wheel = new THREE.Group(); scene.add(wheel);
  var loader = new THREE.TextureLoader(), fade = fadeMap(THREE);
  var edge = new THREE.MeshBasicMaterial({ color: 0x1c1c1c });
  var items = [], hits = [];

  albums.forEach(function (a, i) {
    var slot = new THREE.Group(), th = i * STEP;
    slot.position.set(Math.sin(th) * R, 0, Math.cos(th) * R); slot.rotation.y = th;
    var spin = new THREE.Group(); slot.add(spin);
    var front = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var back = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var box = new THREE.Mesh(new THREE.BoxGeometry(SIZE, SIZE, T), [edge, edge, edge, edge, front, back]);
    box.userData.i = i; spin.add(box); hits.push(box);
    var refl = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, alphaMap: fade, side: THREE.DoubleSide, depthWrite: false }));
    refl.scale.y = -1; refl.position.set(0, -SIZE - 0.03, T / 2); spin.add(refl);
    loader.load(a.cover, function (t) {
      t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      front.map = t; front.needsUpdate = true;
      refl.material.map = t; refl.material.needsUpdate = true;
      want();
    });
    wheel.add(slot);
    items.push({ slot: slot, spin: spin, box: box, lift: 0, turn: 0, back: back });
  });
  var mark = new Image();
  mark.onload = mark.onerror = function () {
    items.forEach(function (it, i) { it.back.map = sleeveBack(THREE, mark.width ? mark : null, albums[i]); it.back.needsUpdate = true; });
    want();
  };
  mark.src = root.getAttribute('data-mark');

  // the wheel's angle: cover i faces the viewer at angle i * STEP
  var ang = 0, goal = 0, vel = 0, dragging = false, moved = 0, lastX = 0, downX = 0, downY = 0;
  var visible = true, raf = 0, lastT = 0, touched = -1e9, nextIdle = 0;

  function nearest(a) { return Math.round(a / STEP); }
  function go(i) {   // turn the short way round to album i
    var k = nearest(ang), idx = ((k % N) + N) % N, d = i - idx;
    if (d > N / 2) d -= N; if (d < -N / 2) d += N;
    goal = (k + d) * STEP; vel = 0; want();
  }

  function frame(now) {
    raf = 0;
    if (!document.body.contains(stage)) { dispose(); return; }
    if (!visible || document.hidden) return;
    var dt = Math.min(40, now - (lastT || now)) / 1000; lastT = now;
    var still = reduce.matches, on = playing(), busy = on && !still;

    if (!dragging) {
      if (Math.abs(vel) > 0.15 && !still) {           // thrown: coast, then settle
        ang += vel * dt; vel *= Math.exp(-dt * 3); busy = true;
        if (Math.abs(vel) <= 0.15) { var k = nearest(ang); goal = k * STEP; land(k); }
      } else {
        // left alone and silent, it moves one album along every few seconds
        if (!still && !on && now - touched > 7000 && now > nextIdle) {
          nextIdle = now + 3600;
          if (Math.abs(goal - ang) < 0.01) { var nk = nearest(ang) + 1; goal = nk * STEP; land(nk); }
        }
        var d = goal - ang;
        ang += still ? d : d * (1 - Math.exp(-dt * 5));
        if (Math.abs(d) > 0.0005) busy = true;
        if (!still && !on) busy = true;               // keep time for the idle turn
      }
    } else busy = true;
    wheel.rotation.y = -ang;

    // the chosen cover comes forward; the one playing turns on its own axis
    items.forEach(function (it, i) {
      var up = i === cur ? 1 : 0;
      it.lift += (up - it.lift) * (still ? 1 : 1 - Math.exp(-dt * 6));
      if (on && i === loaded && !still) it.turn += dt * (Math.PI * 2 / 9);
      else {
        var home = Math.round(it.turn / (Math.PI * 2)) * Math.PI * 2;
        it.turn += (home - it.turn) * (still ? 1 : 1 - Math.exp(-dt * 4));
        if (Math.abs(home - it.turn) > 0.001) busy = true;
      }
      if (Math.abs(up - it.lift) > 0.001) busy = true;
      var s = 1 + it.lift * 0.18;
      it.slot.scale.set(s, s, s);
      it.slot.position.set(Math.sin(i * STEP) * (R + it.lift * 0.55), it.lift * 0.09, Math.cos(i * STEP) * (R + it.lift * 0.55));
      it.spin.rotation.y = it.turn;
    });
    renderer.render(scene, camera);
    if (busy) raf = requestAnimationFrame(frame);
  }
  function want() { if (!raf && visible) { lastT = 0; raf = requestAnimationFrame(frame); } }

  // the ring came to rest on album k (by a drag or the idle turn)
  function land(k) {
    var i = ((k % N) + N) % N;
    if (i === cur) return;
    select(i);
  }

  var ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function pickAt(e) {
    var r = stage.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    var h = ray.intersectObjects(hits, false);
    return h.length ? h[0].object.userData.i : -1;
  }

  stage.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true; moved = 0; lastX = downX = e.clientX; downY = e.clientY; vel = 0; touched = performance.now();
    stage.classList.add('is-dragging');
    try { stage.setPointerCapture(e.pointerId); } catch (x) {}
    want();
  });
  stage.addEventListener('pointermove', function (e) {
    if (!dragging) { stage.style.cursor = pickAt(e) >= 0 ? 'pointer' : ''; return; }
    var dx = e.clientX - lastX; lastX = e.clientX; moved = Math.max(moved, Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY));
    var k = (Math.PI * 2) / Math.max(600, stage.clientWidth * 1.6);
    ang -= dx * k; vel = -dx * k * 60; goal = ang; want();
  });
  function up(e) {
    if (!dragging) return;
    dragging = false; stage.classList.remove('is-dragging'); touched = performance.now();
    if (moved < 6) {
      var i = pickAt(e);
      if (i >= 0) { if (i === cur && loaded === i) toggle(); else select(i, true); }
      else { goal = nearest(ang) * STEP; }
    } else if (Math.abs(vel) <= 0.15 || reduce.matches) {
      vel = 0; var k = nearest(ang); goal = k * STEP; land(k);
    }
    want();
  }
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', function () { dragging = false; stage.classList.remove('is-dragging'); goal = nearest(ang) * STEP; want(); });

  function size() {
    var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h); camera.aspect = w / h;
    var tv = Math.tan(camera.fov * Math.PI / 360), th = tv * camera.aspect;
    // the forward cover about half the height; wide enough for the ring on a
    // laptop, and on a phone for its front, the sides running off the edges
    var needW = camera.aspect < 1.4 ? R * 1.3 : 2 * R + 1.4;
    var d = Math.max(1.07 / tv + 0.55, needW / (2 * th) - R);
    camera.position.set(0, d * 0.16, R + d);
    camera.lookAt(0, -0.36, R * 0.35);
    camera.updateProjectionMatrix();
    scene.fog = new THREE.Fog(bg, d + R * 0.6, d + R * 2.4);
    want();
  }
  function onResize() { size(); }
  window.addEventListener('resize', onResize);
  var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) want(); });
  io.observe(stage);
  document.addEventListener('visibilitychange', want);
  if (reduce.addEventListener) reduce.addEventListener('change', want);

  function dispose() {   // the page moved on (the project deck swapped it out)
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', want);
    if (reduce.removeEventListener) reduce.removeEventListener('change', want);
    io.disconnect(); renderer.dispose();
  }

  host.appendChild(renderer.domElement);
  ang = goal = cur * STEP;
  size();
  root.classList.add('is-live');
  ring = { go: go, want: want };
  want();
}

// the ring's space is kept from the start where it can appear, so the page doesn't jump
if (DCThree.hasGL()) root.classList.add('is-3d');
DCThree.lazy(root, function (THREE) {
  if (!THREE) { root.classList.remove('is-3d'); root.classList.add('is-flat'); return; }
  build(THREE);
});
})();
