/* Dalton Corr — tee-3d.js

   A HollyShorts 22 tee you can turn in your hands. Drag to spin it all the
   way round; tap it (or a swatch, or the arrow keys) and the next design
   spins in: the poster on cream, the poster across the green, the figures on
   cream, the figures on red.

   The tee is procedural: a silhouette drawn on a canvas (body, sleeves, the
   scooped neck and its rib) is the alpha of two soft sheets, front and back,
   each puffed up from the edge by a blurred copy of that silhouette so they
   meet at the seams and read as cloth with air in it. The prints are cut
   from the merch mock-ups already on the page, feathered into the fabric.

   HERE: three.js arrives only when the stage nears the viewport (see
   js/three-common.js). Without WebGL the stage hides and the flat merch
   pictures under it are all there is. With prefers-reduced-motion it does not
   sway on its own; it draws when you touch it. Arrow keys are stopped here so
   they change the tee, not the page's project slides. */
(function () {
'use strict';
var stage = document.querySelector('.tee3d-stage');
if (!stage) return;
var root = stage.closest('.tee3d') || stage.parentNode;
var host = stage.querySelector('.tee3d-canvas');
var base = stage.getAttribute('data-base');
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

/* colour, source picture, the crop of it (x, y, w, h), how it sits on the chest, and how it is cut */
var DESIGNS = [
  { name: 'Poster on cream', color: '#efe7d6', src: 'merch-1.webp', crop: [175, 120, 203, 328], at: [0.28, 0.22, 0.44], feather: 0 },
  { name: 'Poster on green', color: '#038953', src: 'merch-1.webp', crop: [585, 118, 380, 385], at: [0.19, 0.2, 0.62], feather: 1 },
  { name: 'Figures on cream', color: '#efe7d6', src: 'merch-2.webp', crop: [115, 135, 325, 375], at: [0.2, 0.2, 0.6], feather: 1 },
  { name: 'Figures on red', color: '#df1e1d', src: 'merch-2.webp', crop: [620, 125, 300, 380], at: [0.2, 0.2, 0.6], feather: 1 }
];
var CW = 512, CH = 560, TW = 1.6, TH = TW * CH / CW;

function imgLoad(src) {
  return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; });
}

/* the tee's outline, neck scoop and all */
function outline(g) {
  g.beginPath();
  g.moveTo(200, 26); g.lineTo(78, 76); g.lineTo(8, 196); g.lineTo(88, 240); g.lineTo(134, 214);
  g.lineTo(140, 540); g.quadraticCurveTo(256, 552, 372, 540);
  g.lineTo(378, 214); g.lineTo(424, 240); g.lineTo(504, 196); g.lineTo(434, 76); g.lineTo(312, 26);
  g.quadraticCurveTo(256, 100, 200, 26); g.closePath();
}

function shade(hex, k) {
  var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 'rgb(' + Math.round(r * k) + ',' + Math.round(g * k) + ',' + Math.round(b * k) + ')';
}

/* the cloth: colour, a soft fold shading, the rib at the neck, the print (front only) */
function clothCanvas(d, art, front) {
  var S = 2, c = document.createElement('canvas'); c.width = CW * S; c.height = CH * S;
  var g = c.getContext('2d'); g.scale(S, S);
  g.save(); outline(g); g.clip();
  g.fillStyle = d.color; g.fillRect(0, 0, CW, CH);
  // folds: a few long, faint strokes of light and dark
  for (var i = 0; i < 26; i++) {
    var x = 40 + ((i * 97) % 440), y = 60 + ((i * 53) % 420), l = 90 + (i * 37) % 160, a = (i % 2 ? 0.05 : 0.06);
    var gr = g.createLinearGradient(x - 14, 0, x + 14, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, (i % 3 ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + a + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.save(); g.translate(x, y); g.rotate(((i * 29) % 40 - 20) / 100); g.fillRect(-14, 0, 28, l); g.restore();
  }
  // under the arms and at the hem, the cloth turns away
  var sh = g.createLinearGradient(0, 0, CW, 0);
  sh.addColorStop(0, 'rgba(0,0,0,.12)'); sh.addColorStop(0.3, 'rgba(0,0,0,0)'); sh.addColorStop(0.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.12)');
  g.fillStyle = sh; g.fillRect(0, 0, CW, CH);
  if (front && art) {
    var cr = d.crop, w = CW * d.at[2], h = w * cr[3] / cr[2], x0 = CW * d.at[0], y0 = CH * d.at[1];
    var t = document.createElement('canvas'); t.width = Math.round(w * S); t.height = Math.round(h * S);
    var tg = t.getContext('2d'); tg.drawImage(art, cr[0], cr[1], cr[2], cr[3], 0, 0, t.width, t.height);
    if (d.feather) {   // melt the edges of the crop into the fabric
      tg.globalCompositeOperation = 'destination-in';
      var m = tg.createRadialGradient(t.width / 2, t.height / 2, Math.min(t.width, t.height) * 0.28, t.width / 2, t.height / 2, Math.max(t.width, t.height) * 0.62);
      m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.65, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      tg.fillStyle = m; tg.fillRect(0, 0, t.width, t.height);
    }
    g.globalAlpha = 0.97; g.drawImage(t, x0, y0, w, h); g.globalAlpha = 1;
  }
  g.restore();
  // the neck rib
  g.lineCap = 'round'; g.strokeStyle = shade(d.color, 0.86); g.lineWidth = 15;
  g.beginPath(); g.moveTo(200, 26); g.quadraticCurveTo(256, 100, 312, 26); g.stroke();
  if (!front) { g.strokeStyle = shade(d.color, 0.86); g.lineWidth = 15; g.beginPath(); g.moveTo(202, 28); g.quadraticCurveTo(256, 60, 310, 28); g.stroke(); }
  // sleeve hems
  g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(14, 202); g.lineTo(92, 245); g.moveTo(498, 202); g.lineTo(420, 245); g.moveTo(140, 528); g.quadraticCurveTo(256, 540, 372, 528); g.stroke();
  return c;
}

/* the silhouette's alpha, blurred, becomes the height of the puff */
function heights(nx, ny) {
  var c = document.createElement('canvas'); c.width = nx; c.height = ny;
  var g = c.getContext('2d'); g.scale(nx / CW, ny / CH); g.fillStyle = '#fff'; outline(g); g.fill();
  var d = g.getImageData(0, 0, nx, ny).data, a = new Float32Array(nx * ny), b = new Float32Array(nx * ny), i, x, y, k;
  for (i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] / 255;
  for (var pass = 0; pass < 3; pass++) {
    for (y = 0; y < ny; y++) for (x = 0; x < nx; x++) { var s = 0, n = 0; for (k = -4; k <= 4; k++) { var xx = x + k; if (xx >= 0 && xx < nx) { s += a[y * nx + xx]; n++; } } b[y * nx + x] = s / n; }
    for (y = 0; y < ny; y++) for (x = 0; x < nx; x++) { var s2 = 0, n2 = 0; for (k = -4; k <= 4; k++) { var yy = y + k; if (yy >= 0 && yy < ny) { s2 += b[yy * nx + x]; n2++; } } a[y * nx + x] = s2 / n2; }
  }
  var out = new Float32Array(nx * ny);
  for (i = 0; i < out.length; i++) { var v = Math.max(0, Math.min(1, (a[i] - 0.5) * 2.2)); out[i] = v * v * (3 - 2 * v); }
  return out;
}

function build(THREE) {
  var renderer = DCThree.renderer(THREE, host);
  var scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(DCThree.env(THREE)).texture;
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  var key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(-3, 5, 8); scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));

  var NX = 96, NY = 105, hs = heights(NX + 1, NY + 1), PUFF = 0.2;
  function sheet() {
    var geo = new THREE.PlaneGeometry(TW, TH, NX, NY), p = geo.attributes.position;
    for (var i = 0; i < p.count; i++) p.setZ(i, hs[i] * PUFF);
    geo.computeVertexNormals(); return geo;
  }
  var mat = function () { return new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, alphaTest: 0.5, envMapIntensity: 0.35, transparent: false }); };
  var tee = new THREE.Group(), pivot = new THREE.Group(); pivot.add(tee); scene.add(pivot);
  var front = new THREE.Mesh(sheet(), mat()), back = new THREE.Mesh(sheet(), mat());
  back.rotation.y = Math.PI; front.position.z = 0.002; back.position.z = -0.002;
  tee.add(front); tee.add(back);
  // the sheets' alpha comes from the same silhouette
  var tex = [];

  var sc = document.createElement('canvas'); sc.width = 256; sc.height = 64;
  var sg = sc.getContext('2d'), gr = sg.createRadialGradient(128, 32, 0, 128, 32, 128);
  gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(0.5, 'rgba(0,0,0,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  sg.save(); sg.scale(1, 0.25); sg.translate(0, 96); sg.fillStyle = gr; sg.fillRect(0, -128, 256, 256); sg.restore();
  var shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.position.set(0, -TH / 2 - 0.08, -0.4); scene.add(shadow);

  var cur = 0, yaw = 0, yawV = 0, target = 0, dragging = false, moved = 0, lastX = 0, tiltX = 0, tX = 0;
  var visible = true, raf = 0, lastT = 0, t0 = performance.now(), arts = {};

  function paint(i) {
    var d = DESIGNS[i];
    if (!tex[i]) {
      var f = new THREE.CanvasTexture(clothCanvas(d, arts[d.src], true)), b = new THREE.CanvasTexture(clothCanvas(d, arts[d.src], false));
      [f, b].forEach(function (t) { t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); });
      tex[i] = [f, b];
    }
    front.material.map = tex[i][0]; back.material.map = tex[i][1];
    front.material.needsUpdate = back.material.needsUpdate = true;
    if (swatches.length) swatches.forEach(function (s, k) { s.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    if (nameEl) nameEl.textContent = d.name;
  }
  var swatches = [].slice.call(root.querySelectorAll('.tee3d-swatch')), nameEl = root.querySelector('.tee3d-name');
  swatches.forEach(function (s, k) { s.addEventListener('click', function () { pick(k); }); });
  function pick(i) {
    i = ((i % DESIGNS.length) + DESIGNS.length) % DESIGNS.length;
    if (i === cur) return;
    cur = i; paint(i);
    target = Math.round(yaw / (Math.PI * 2)) * Math.PI * 2 + Math.PI * 2; yawV = 0;   // one full turn, and the new tee arrives
    want();
  }

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    var dt = Math.min(40, now - (lastT || now)) / 1000; lastT = now;
    var still = reduce.matches, busy = false;
    if (!dragging) {
      if (Math.abs(yawV) > 0.05 && !still) { yaw += yawV * dt; yawV *= Math.exp(-dt * 2.2); busy = true; target = null; }
      else {
        if (target === null) target = Math.round(yaw / (Math.PI * 2)) * Math.PI * 2;
        var idle = still ? 0 : Math.sin((now - t0) / 2600) * 0.32;
        yawV = 0; var goal = target + idle;
        yaw += (goal - yaw) * (1 - Math.exp(-dt * 4)); if (Math.abs(goal - yaw) > 0.002 || !still) busy = true;
      }
    } else busy = true;
    tiltX += (tX - tiltX) * (1 - Math.exp(-dt * 8));
    pivot.rotation.y = yaw; pivot.rotation.x = tiltX;
    pivot.position.y = still ? 0 : Math.sin((now - t0) / 1900) * 0.012;
    renderer.render(scene, camera);
    if (busy) raf = requestAnimationFrame(frame);
  }
  function want() { if (!raf && visible) { lastT = 0; raf = requestAnimationFrame(frame); } }

  stage.addEventListener('pointerdown', function (e) {
    dragging = true; moved = 0; lastX = e.clientX; yawV = 0; target = null; stage.classList.add('is-dragging');
    try { stage.setPointerCapture(e.pointerId); } catch (x) {} want();
  });
  stage.addEventListener('pointermove', function (e) {
    var r = stage.getBoundingClientRect();
    if (!dragging) { tX = ((e.clientY - r.top) / r.height - 0.5) * 0.12; want(); return; }
    var dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
    yaw += dx * 0.011; yawV = dx * 0.011 * 60; want();
  });
  function up() {
    if (!dragging) return; dragging = false; stage.classList.remove('is-dragging');
    if (moved < 6) pick(cur + 1); else if (Math.abs(yawV) < 0.05) target = null;
    want();
  }
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('pointerleave', function () { tX = 0; want(); });
  root.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && !(e.target === stage && (e.key === ' ' || e.key === 'Enter'))) return;
    e.preventDefault(); e.stopPropagation();
    pick(cur + (e.key === 'ArrowLeft' ? -1 : 1));
  });

  function size() {
    var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h); camera.aspect = w / h;
    var f = Math.tan(camera.fov * Math.PI / 360), needH = TH + 0.5, needW = TW + 0.3;
    var d = Math.max(needH / 2 / f, needW / 2 / (camera.aspect * f));
    camera.position.set(0, 0, d); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); want();
  }
  window.addEventListener('resize', size);
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) want(); }).observe(stage);
  document.addEventListener('visibilitychange', want);
  if (reduce.addEventListener) reduce.addEventListener('change', want);

  var srcs = []; DESIGNS.forEach(function (d) { if (srcs.indexOf(d.src) < 0) srcs.push(d.src); });
  Promise.all(srcs.map(function (s) { return imgLoad(base + s).then(function (i) { arts[s] = i; }); })).then(function () {
    paint(0); host.appendChild(renderer.domElement); size();
    root.classList.add('is-live'); stage.classList.add('is-live'); want();
  });
}

DCThree.lazy(stage, function (THREE) {
  if (!THREE) { root.classList.add('is-flat'); return; }
  build(THREE);
});
})();
