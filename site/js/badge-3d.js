/* Dalton Corr — badge-3d.js

   All eight HollyShorts 22 passes, each on its own lanyard, hung in three rows
   (3 / 3 / 2; on a phone two by four), every row from its own rail. The
   badges are big, the straps short, so the artwork carries the section. Every
   one swings on its own strap; drag one to spin it (it settles face-on when
   you let go), tap it to turn it over. Knock one and the badge either side of
   it in its row swings too.

   The card is a slab of rounded plastic with the artwork on its front and,
   on its back, a face made from the front: the pass's own colour, the
   festival mark, a barcode and the fine print, the way the floating badges
   on the HollyShorts Comedy pages build theirs. The strap is a flat ribbon
   with a clip. Everything is procedural apart from the eight pictures.

   HERE: three.js arrives only when the stage nears the viewport (see
   js/three-common.js). Without WebGL the flat fronts of the passes stay.
   With prefers-reduced-motion it does not swing on its own; it draws when
   you touch it. */
(function () {
'use strict';
var stage = document.querySelector('.badge3d-stage');
if (!stage) return;
var host = stage.querySelector('.badge3d-canvas');
var base = stage.getAttribute('data-base');
var names = stage.getAttribute('data-names').split('|');
var straps = stage.getAttribute('data-straps').split('|');
var code = stage.getAttribute('data-code') || 'HS22';
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

var RATIO = 825 / 1350;         // the art's width over its height
var W = 1, H = W / RATIO, T = 0.04, R = 0.075;

function roundedRect(THREE, w, h, r) {
  var s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}

function imgLoad(src) {
  return new Promise(function (ok, no) {
    var i = new Image(); i.onload = function () { ok(i); }; i.onerror = no; i.src = src;
  });
}

/* the back: the front's own colour, the mark, a barcode, the fine print */
function backCanvas(img, name, serial) {
  var c = document.createElement('canvas'); c.width = 825; c.height = 1350;
  var g = c.getContext('2d');
  var s = document.createElement('canvas'); s.width = s.height = 8;
  var sg = s.getContext('2d'); sg.drawImage(img, 0, 0, img.width, img.height * 0.25, 0, 0, 8, 8);
  var d = sg.getImageData(0, 0, 8, 8).data, r = 0, gr = 0, b = 0, n = 0;
  for (var i = 0; i < d.length; i += 4) { if (d[i + 3] > 200) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; n++; } }
  r = Math.round(r / n); gr = Math.round(gr / n); b = Math.round(b / n);
  var lum = (0.299 * r + 0.587 * gr + 0.114 * b), ink = lum > 150 ? '#141414' : '#f4f1ea';
  g.fillStyle = 'rgb(' + r + ',' + gr + ',' + b + ')'; g.fillRect(0, 0, 825, 1350);
  var sh = g.createLinearGradient(0, 0, 825, 1350);
  sh.addColorStop(0, 'rgba(255,255,255,.14)'); sh.addColorStop(1, 'rgba(0,0,0,.14)');
  g.fillStyle = sh; g.fillRect(0, 0, 825, 1350);
  g.fillStyle = ink; g.textAlign = 'center';
  g.font = 'italic 700 120px "Snell Roundhand", "Brush Script MT", cursive';
  g.fillText('HollyShorts', 412, 250);
  g.font = '600 34px -apple-system, "SF Pro Text", Helvetica, Arial, sans-serif';
  g.fillText('22ND ANNUAL FILM FESTIVAL', 412, 320);
  g.font = '700 88px -apple-system, "SF Pro Display", Helvetica, Arial, sans-serif';
  g.fillText(name.toUpperCase(), 412, 640);
  g.fillRect(150, 690, 525, 4);
  // a barcode from the serial
  var seed = serial * 137.508 + 11, x = 150;
  for (var k = 0; k < 44 && x < 665; k++) {
    seed = (seed * 9301 + 49297) % 233280; var w = 4 + (seed % 3) * 4;
    seed = (seed * 9301 + 49297) % 233280;
    g.fillRect(x, 760, w, 130); x += w + 3 + (seed % 2) * 4;
  }
  g.font = '500 30px ui-monospace, Menlo, monospace';
  g.fillText(code + ' ' + (2026000 + serial), 412, 940);
  g.font = '400 26px -apple-system, Helvetica, Arial, sans-serif';
  ['TCL Chinese Theatres, Hollywood', 'August 13 to 23, 2026'].forEach(function (t, j) { g.fillText(t, 412, 1060 + j * 40); });
  return c;
}

/* where each pass hangs: its row, x, and how long its strap is (short: the
   card is the point). Rows fall one under another, each from its own rail. */
var OFFSET = [0.1, -0.13, 0.06, -0.09, 0.14, -0.06, 0.1, -0.15];   // how far off square each rests
var JIT = [0.0, 0.05, -0.04, 0.04, -0.04, 0.05, -0.03, 0.02];
var DROPS = [0.42, 0.56, 0.36, 0.5, 0.4, 0.58, 0.46, 0.38];
var SP = 1.32, GAP = 0.24;
var phone = window.matchMedia('(max-width: 767px)');
function layout(n) {
  var per = phone.matches ? [2, 2, 2, 2] : [3, 3, 2], out = [], rail = 0, i = 0;
  per.forEach(function (cnt, r) {
    var maxDrop = 0, first = out.length;
    for (var c = 0; c < cnt && i < n; c++, i++) {
      var d = DROPS[i % 8]; maxDrop = Math.max(maxDrop, d);
      out.push({ row: r, x: (c - (cnt - 1) / 2) * SP + JIT[i % 8], drop: d, rail: rail, cnt: cnt });
    }
    out.rows = out.rows || []; out.rows.push({ y: rail, half: (cnt - 1) / 2 * SP + W / 2 + 0.15 });
    rail -= maxDrop + 0.16 + H + 0.04 + GAP;
  });
  out.bottom = rail + GAP - 0.1; out.span = ((phone.matches ? 2 : 3) - 1) * SP + W + 0.16;
  return out;
}

function build(THREE) {
  var renderer = DCThree.renderer(THREE, host);
  var scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(DCThree.env(THREE)).texture;
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  var key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(-4, 6, 10); scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  var metal = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 1, roughness: 0.25, envMapIntensity: 1.4 });
  var slabGeo = new THREE.ExtrudeGeometry(roundedRect(THREE, W, H, R), { depth: T, bevelEnabled: false });
  var faceGeo = new THREE.PlaneGeometry(W, H);
  var slotGeo = new THREE.PlaneGeometry(0.22, 0.05), slotMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  var RING = 0.1, ringGeo = new THREE.TorusGeometry(RING, 0.017, 12, 40), barGeo = new THREE.BoxGeometry(0.17, 0.07, 0.035);
  var slabMat = new THREE.MeshStandardMaterial({ color: 0xf1eee7, roughness: 0.45, metalness: 0, envMapIntensity: 0.6 });

  var badges = [], hitList = [], rails = [];
  var railGeo = new THREE.BoxGeometry(1, 0.045, 0.06), railMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.6, envMapIntensity: 1 });
  for (var q = 0; q < 4; q++) { var rl = new THREE.Mesh(railGeo, railMat); rl.position.z = -0.05; scene.add(rl); rails.push(rl); }

  names.forEach(function (nm, i) {
    var b = { i: i, name: nm, swing: 0, swingV: 0, yaw: OFFSET[i % 8], yawV: 0, target: null, phase: i * 1.9 + 0.7 };
    b.row = 0; b.pivot = new THREE.Group(); scene.add(b.pivot);
    b.strapMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.75, metalness: 0 });
    b.strapMat.color.set(straps[i] || '#222').convertSRGBToLinear();
    b.strap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1, 0.012), b.strapMat); b.pivot.add(b.strap);
    b.hang = new THREE.Group(); b.pivot.add(b.hang);
    /* one vertical axis, top to bottom: the strap, the crimp bar that ends it
       (at the hang point), the split ring that loops round the bar and turns
       with the card, and the card's slot that the ring's foot passes through */
    var bar = new THREE.Mesh(barGeo, metal); b.hang.add(bar);
    b.spin = new THREE.Group(); b.hang.add(b.spin);
    var ring = new THREE.Mesh(ringGeo, metal); ring.position.y = -RING + 0.02; ring.rotation.y = 1.1; b.spin.add(ring);
    var card = new THREE.Group(); card.position.y = -2 * RING + 0.02 + 0.09 - H / 2; b.spin.add(card);
    var slab = new THREE.Mesh(slabGeo, slabMat); slab.position.z = -T / 2; slab.userData.badge = b; card.add(slab); hitList.push(slab);
    b.front = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0, transparent: true, alphaTest: 0.5, envMapIntensity: 0.7 }));
    b.front.position.z = T / 2 + 0.001; b.front.userData.badge = b; card.add(b.front); hitList.push(b.front);
    b.back = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0, envMapIntensity: 0.5 }));
    b.back.rotation.y = Math.PI; b.back.position.z = -T / 2 - 0.001; b.back.userData.badge = b; card.add(b.back); hitList.push(b.back);
    var slot = new THREE.Mesh(slotGeo, slotMat); slot.position.set(0, H / 2 - 0.09, T / 2 + 0.003); card.add(slot);
    var slot2 = slot.clone(); slot2.rotation.y = Math.PI; slot2.position.z = -T / 2 - 0.003; card.add(slot2);
    badges.push(b);
    imgLoad(base + encodeURIComponent(nm) + '.webp').then(function (img) {
      var ft = new THREE.CanvasTexture(img);
      ft.encoding = THREE.sRGBEncoding; ft.anisotropy = renderer.capabilities.getMaxAnisotropy();
      b.front.material.map = ft; b.front.material.needsUpdate = true;
      var bt = new THREE.CanvasTexture(backCanvas(img, nm, i + 1));
      bt.encoding = THREE.sRGBEncoding; bt.anisotropy = 4;
      b.back.material.map = bt; b.back.material.needsUpdate = true;
      want();
    });
  });

  function place() {
    var L = layout(badges.length);
    badges.forEach(function (b, i) {
      var p = L[i];
      b.drop = p.drop;
      b.pivot.position.set(p.x, p.rail, 0);
      b.strap.scale.y = p.drop + 0.06; b.strap.position.y = -p.drop / 2 + 0.03;
      b.hang.position.y = -p.drop;
    });
    rails.forEach(function (rl, r) {
      var row = L.rows[r]; rl.visible = !!row;
      if (row) { rl.scale.x = row.half * 2; rl.position.set(0, row.y + 0.02, -0.05); }
    });
    return L;
  }

  /* motion: each strap is a spring; each card turns by hand and settles face-on */
  var dragging = null, moved = 0, lastX = 0, lastT = 0, visible = true, raf = 0, t0 = performance.now();
  function nudge(b, v) {
    [-1, 1].forEach(function (d) {
      var n = badges[b.i + d]; if (n && n.row === b.row) n.swingV += -d * v * 0.55;
    });
  }
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    var dt = Math.min(40, now - (lastT || now)) / 1000; lastT = now;
    var still = reduce.matches, busy = false;
    badges.forEach(function (b) {
      b.swingV += (-30 * b.swing - 2.0 * b.swingV) * dt; b.swing += b.swingV * dt;
      var idle = still ? 0 : Math.sin((now - t0) / 2100 + b.phase) * 0.035;
      if (dragging !== b) {
        if (b.target === null) b.target = Math.round((b.yaw - OFFSET[b.i % 8] + b.yawV * 0.25) / Math.PI) * Math.PI + OFFSET[b.i % 8];
        b.yawV += ((b.target - b.yaw) * 34 - b.yawV * 9) * dt; b.yaw += b.yawV * dt;
        if (still && Math.abs(b.target - b.yaw) < 0.002) { b.yaw = b.target; b.yawV = 0; }
      }
      b.pivot.rotation.z = b.swing + idle;
      b.spin.rotation.y = b.yaw;
      if (Math.abs(b.swing) > 0.0005 || Math.abs(b.swingV) > 0.002 || dragging === b || b.target === null || Math.abs(b.target - b.yaw) > 0.002 || Math.abs(b.yawV) > 0.01) busy = true;
    });
    renderer.render(scene, camera);
    if (!still || busy) raf = requestAnimationFrame(frame);
  }
  function want() { if (!raf && visible) { lastT = 0; raf = requestAnimationFrame(frame); } }

  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(e) {
    var r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var hit = ray.intersectObjects(hitList, false)[0];
    return hit ? hit.object.userData.badge : null;
  }
  stage.addEventListener('pointerdown', function (e) {
    var b = pick(e); if (!b) return;
    dragging = b; moved = 0; lastX = e.clientX; b.yawV = 0; b.target = null;
    stage.classList.add('is-dragging');
    try { stage.setPointerCapture(e.pointerId); } catch (x) {}
    want();
  });
  stage.addEventListener('pointermove', function (e) {
    if (!dragging) { stage.style.cursor = pick(e) ? 'grab' : ''; return; }
    var dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
    dragging.yaw += dx * 0.012; dragging.yawV = dx * 0.012 * 60; dragging.swingV += dx * 0.03;
    if (Math.abs(dx) > 2) nudge(dragging, dx * 0.012);
    want();
  });
  function up() {
    if (!dragging) return;
    var b = dragging; dragging = null; stage.classList.remove('is-dragging');
    if (moved < 6) {   // a tap turns it over
      var off = OFFSET[b.i % 8];
      b.target = Math.round((b.yaw - off) / Math.PI) * Math.PI + Math.PI + off; b.yawV = 0; b.swingV += 0.6; nudge(b, 0.8);
    } else b.target = null;
    want();
  }
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('keydown', function (e) {
    if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); e.stopPropagation();
    // keyboard: turn them all over, or set them all swinging
    badges.forEach(function (b, i) {
      var off = OFFSET[i % 8];
      if (e.key === ' ' || e.key === 'Enter') b.target = Math.round((b.yaw - off) / Math.PI) * Math.PI + Math.PI + off;
      b.swingV += (e.key === 'ArrowLeft' ? -0.6 : e.key === 'ArrowRight' ? 0.6 : 0.3) * (i % 2 ? 1 : 0.8);
    });
    want();
  });

  function size() {
    var L = place(), top = 0.25, bottom = L.bottom - 0.1;
    badges.forEach(function (b, i) { b.row = L[i].row; });
    stage.style.aspectRatio = L.span + ' / ' + (top - bottom);   // the stage is exactly as tall as the hang
    var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h); camera.aspect = w / h;
    var f = Math.tan(camera.fov * Math.PI / 360);
    var d = Math.max((top - bottom) / 2 / f, L.span / 2 / (camera.aspect * f));
    camera.position.set(0, (top + bottom) / 2, d);
    camera.lookAt(0, (top + bottom) / 2, 0);
    camera.updateProjectionMatrix(); want();
  }
  window.addEventListener('resize', size);
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) want(); }).observe(stage);
  document.addEventListener('visibilitychange', want);
  if (reduce.addEventListener) reduce.addEventListener('change', want);

  host.appendChild(renderer.domElement);
  size(); place();
  badges.forEach(function (b, i) { b.swingV = 0.3 * (i % 2 ? 1 : -1); });
  stage.classList.add('is-live'); want();
}

DCThree.lazy(stage, function (THREE) {
  if (!THREE) { stage.classList.add('is-flat'); return; }
  build(THREE);
});
})();
