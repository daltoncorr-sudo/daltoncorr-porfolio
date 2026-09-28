/* Dalton Corr — phones-3d.js

   The HollyShorts 22 social posts as they sat in a feed: three phones, the
   middle one open on the festival's profile with its grid, the outer two on a
   single post each. Drag to turn them (they show their backs too), and they
   bob a little at rest.

   The screens are drawn on a canvas each, from the actual post pictures
   (the site's own images, in images/design/hollyshorts-22/social/), and
   laid on a rounded-rectangle body with the camera bump on its back. A
   made-up feed, not a screenshot: no follower counts, no comments, only the
   posts themselves.

   HERE: three.js arrives only when the stage nears the viewport (see
   js/three-common.js). Without WebGL the three flat pictures already in the
   markup stay. With prefers-reduced-motion nothing bobs: it draws only while
   you turn it. */
(function () {
'use strict';
var stage = document.querySelector('.phones-stage');
if (!stage) return;
var host = stage.querySelector('.phones-canvas');
var base = stage.getAttribute('data-base');
var grid = stage.getAttribute('data-grid').split('|');
var posts = stage.getAttribute('data-posts').split('|');
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

var PW = 1, PH = 2.06, PD = 0.09, PR = 0.16;
var SW = 750, SH = Math.round(SW * PH / PW);
var FONT = '-apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

function imgLoad(src) {
  return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; });
}
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function cover(g, img, x, y, w, h) {
  if (!img) { g.fillStyle = '#ddd'; g.fillRect(x, y, w, h); return; }
  var s = Math.max(w / img.width, h / img.height), iw = w / s, ih = h / s;
  g.drawImage(img, (img.width - iw) / 2, (img.height - ih) / 2, iw, ih, x, y, w, h);
}

/* the phone's front: black glass, the screen inset in it, a status bar and the island */
function chrome(g) {
  g.fillStyle = '#000'; g.fillRect(0, 0, SW, SH);
  var m = 20;
  rr(g, m, m, SW - 2 * m, SH - 2 * m, 96); g.save(); g.clip();
  g.fillStyle = '#fff'; g.fillRect(0, 0, SW, SH);
  return function after() {
    g.restore();
  };
}
function status(g) {
  g.fillStyle = '#111'; g.font = '600 30px ' + FONT; g.textAlign = 'left'; g.fillText('9:41', 74, 78);
  g.fillStyle = '#000'; rr(g, SW / 2 - 100, 40, 200, 58, 29); g.fill();
  g.fillStyle = '#111'; g.fillRect(SW - 190, 58, 8, 14); g.fillRect(SW - 176, 52, 8, 20); g.fillRect(SW - 162, 46, 8, 26);
  rr(g, SW - 130, 50, 56, 26, 8); g.fill();
}
function nav(g) {
  var y = SH - 130;
  g.fillStyle = '#fff'; g.fillRect(20, y, SW - 40, 110);
  g.fillStyle = '#dbdbdb'; g.fillRect(20, y, SW - 40, 2);
  g.strokeStyle = '#111'; g.lineWidth = 5; g.lineJoin = 'round';
  var xs = [110, 250, 375, 500, 640], cy = y + 52;
  // home
  g.beginPath(); g.moveTo(xs[0] - 20, cy + 2); g.lineTo(xs[0], cy - 20); g.lineTo(xs[0] + 20, cy + 2); g.lineTo(xs[0] + 20, cy + 22); g.lineTo(xs[0] - 20, cy + 22); g.closePath(); g.stroke();
  // search
  g.beginPath(); g.arc(xs[1] - 3, cy - 3, 15, 0, 7); g.moveTo(xs[1] + 8, cy + 8); g.lineTo(xs[1] + 22, cy + 22); g.stroke();
  // plus
  rr(g, xs[2] - 20, cy - 20, 40, 40, 10); g.stroke(); g.beginPath(); g.moveTo(xs[2] - 9, cy); g.lineTo(xs[2] + 9, cy); g.moveTo(xs[2], cy - 9); g.lineTo(xs[2], cy + 9); g.stroke();
  // reels
  rr(g, xs[3] - 20, cy - 20, 40, 40, 10); g.stroke(); g.beginPath(); g.moveTo(xs[3] - 5, cy - 8); g.lineTo(xs[3] + 9, cy); g.lineTo(xs[3] - 5, cy + 8); g.closePath(); g.stroke();
  // profile
  g.beginPath(); g.arc(xs[4], cy, 20, 0, 7); g.stroke();
}
function avatar(g, img, cx, cy, r) {
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip();
  g.fillStyle = '#e5372f'; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  if (img) {   // the white film-strip 22 (white on black, so it screens onto the colour)
    var s = r * 2 * 1.02; g.globalCompositeOperation = 'screen';
    g.drawImage(img, cx - s / 2, cy - s / 2, s, s);
  }
  g.restore();
  g.strokeStyle = '#dbdbdb'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r + 4, 0, 7); g.stroke();
}

function profileScreen(imgs, avatarImg) {
  var c = document.createElement('canvas'); c.width = SW; c.height = SH;
  var g = c.getContext('2d'), done = chrome(g);
  status(g);
  g.fillStyle = '#111'; g.textAlign = 'left'; g.font = '700 38px ' + FONT; g.fillText('hollyshorts', 64, 170);
  avatar(g, avatarImg, 130, 290, 70);
  g.textAlign = 'center';
  g.font = '700 38px ' + FONT; g.fillStyle = '#111'; g.fillText('20', 400, 285);
  g.font = '400 24px ' + FONT; g.fillText('posts', 400, 320);
  g.font = '700 30px ' + FONT; g.textAlign = 'left'; g.fillText('HollyShorts Film Festival', 64, 420);
  g.font = '400 26px ' + FONT; g.fillStyle = '#555'; g.fillText('Film festival', 64, 456);
  g.fillStyle = '#111';
  ['22nd Annual Oscar®-Qualifying', 'TCL Chinese Theatres, Hollywood', 'August 13–23, 2026'].forEach(function (t, i) { g.fillText(t, 64, 498 + i * 34); });
  rr(g, 64, 620, 310, 62, 14); g.fillStyle = '#0095f6'; g.fill();
  g.fillStyle = '#fff'; g.font = '600 26px ' + FONT; g.textAlign = 'center'; g.fillText('Follow', 219, 660);
  rr(g, 390, 620, 296, 62, 14); g.fillStyle = '#efefef'; g.fill();
  g.fillStyle = '#111'; g.fillText('Message', 538, 660);
  // tabs
  g.fillStyle = '#111'; g.fillRect(20, 716, SW / 2 - 20, 3); g.fillStyle = '#dbdbdb'; g.fillRect(SW / 2, 717, SW / 2 - 20, 1.5);
  g.fillStyle = '#111'; for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) g.fillRect(SW / 4 - 21 + a * 15, 736 + b * 15, 12, 12);
  // the grid, 4:5 tiles
  var tw = (SW - 40 - 4) / 3, th = tw * 1.25, top = 728 + 44;
  for (var i = 0; i < 9; i++) {
    var col = i % 3, row = (i / 3) | 0;
    cover(g, imgs[i], 20 + col * (tw + 2), top + row * (th + 2), tw, th);
  }
  done(); nav(g);
  return c;
}

function postScreen(img, avatarImg, caption) {
  var c = document.createElement('canvas'); c.width = SW; c.height = SH;
  var g = c.getContext('2d'), done = chrome(g);
  status(g);
  g.fillStyle = '#111'; g.textAlign = 'center'; g.font = '700 32px ' + FONT; g.fillText('Posts', SW / 2, 165);
  avatar(g, avatarImg, 88, 262, 34);
  g.textAlign = 'left'; g.font = '700 27px ' + FONT; g.fillText('hollyshorts', 140, 272);
  g.textAlign = 'right'; g.font = '700 34px ' + FONT; g.fillText('···', SW - 50, 268);
  var iw = SW - 40, ih = iw * 1.25, y = 314;
  cover(g, img, 20, y, iw, ih);
  y += ih + 50;
  // heart, comment, share, bookmark
  g.strokeStyle = '#111'; g.lineWidth = 4.5; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(74, y - 8); g.bezierCurveTo(30, y - 44, 58, y - 66, 74, y - 46); g.bezierCurveTo(90, y - 66, 118, y - 44, 74, y - 8); g.stroke();
  g.beginPath(); g.arc(170, y - 30, 22, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(240, y - 12); g.lineTo(290, y - 30); g.lineTo(240, y - 48); g.lineTo(246, y - 30); g.closePath(); g.stroke();
  for (var d = 0; d < 5; d++) { g.fillStyle = d === 0 ? '#0095f6' : '#c7c7c7'; g.beginPath(); g.arc(SW / 2 - 40 + d * 20, y - 30, 5.5, 0, 7); g.fill(); }
  g.fillStyle = '#111'; g.textAlign = 'left'; g.font = '400 27px ' + FONT;
  g.font = '700 27px ' + FONT; g.fillText('hollyshorts', 40, y + 44);
  g.font = '400 27px ' + FONT;
  var w0 = g.measureText('hollyshorts ').width; g.font = '400 27px ' + FONT;
  g.fillText(caption, 40 + 165, y + 44);
  done(); nav(g);
  return c;
}

function frontTexture(THREE, canvas, r) {
  var t = new THREE.CanvasTexture(canvas);
  t.encoding = THREE.sRGBEncoding; t.anisotropy = r.capabilities.getMaxAnisotropy();
  return t;
}

function shape(THREE, w, h, r, inset) {
  var s = new THREE.Shape(), x = -w / 2 + inset, y = -h / 2 + inset; w -= 2 * inset; h -= 2 * inset; r = Math.max(0.01, r - inset);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}

function makePhone(THREE, screenTex, bodyMat, lensMat) {
  var g = new THREE.Group();
  var body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape(THREE, PW, PH, PR, 0.02), { depth: PD, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4, curveSegments: 24 }),
    bodyMat
  );
  body.position.z = -PD / 2; g.add(body);
  var sg = new THREE.ShapeGeometry(shape(THREE, PW, PH, PR, 0.028), 24);
  var pos = sg.attributes.position, uv = [];
  for (var i = 0; i < pos.count; i++) uv.push((pos.getX(i) + PW / 2) / PW, (pos.getY(i) + PH / 2) / PH);
  sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  var scr = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  scr.position.z = PD / 2 + 0.0405; g.add(scr);
  // glass over the screen: a faint, glossy sheet
  var glass = new THREE.Mesh(sg, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, roughness: 0.02, clearcoat: 1, envMapIntensity: 1.4 }));
  glass.position.z = PD / 2 + 0.042; g.add(glass);
  // the camera plateau on the back
  var bump = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape(THREE, 0.44, 0.44, 0.1, 0), { depth: 0.02, bevelEnabled: false, curveSegments: 12 }), bodyMat);
  bump.rotation.y = Math.PI; bump.position.set(-0.2, PH / 2 - 0.3, -PD / 2 - 0.02); g.add(bump);
  [[-0.1, 0.09], [0.1, 0.09], [0, -0.1]].forEach(function (p) {
    var ring = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 32), bodyMat);
    ring.rotation.x = Math.PI / 2; ring.position.set(-0.2 - p[0], PH / 2 - 0.3 + p[1], -PD / 2 - 0.045); g.add(ring);
    var lens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.034, 32), lensMat);
    lens.rotation.x = Math.PI / 2; lens.position.copy(ring.position); lens.position.z -= 0.004; g.add(lens);
  });
  return g;
}

function build(THREE) {
  var renderer = DCThree.renderer(THREE, host);
  var scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(DCThree.env(THREE)).texture;
  var camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  var key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(-3, 5, 8); scene.add(key);

  var bodyMat = new THREE.MeshStandardMaterial({ color: 0x8b8a85, metalness: 1, roughness: 0.32, envMapIntensity: 1.2 });
  var lensMat = new THREE.MeshStandardMaterial({ color: 0x08090c, metalness: 0.4, roughness: 0.1, envMapIntensity: 1.6 });

  return Promise.all(grid.concat(posts).map(function (n) { return imgLoad(base + n + '.webp'); }).concat([imgLoad(base + '../logo-22-white-1200.webp')])).then(function (all) {
    var gi = all.slice(0, grid.length), pi = all.slice(grid.length, grid.length + posts.length), av = all[all.length - 1];
    var screens = [
      postScreen(pi[0], av, 'Eight passes, eight dancers.'),
      profileScreen(gi, av),
      postScreen(pi[1], av, 'Tees, hoodies, totes and hats.')
    ];
    var setup = [{ x: -1.5, z: -0.15, ry: 0.42 }, { x: 0, z: 0.25, ry: 0 }, { x: 1.5, z: -0.15, ry: -0.42 }];
    var phones = screens.map(function (cv, i) {
      var p = makePhone(THREE, frontTexture(THREE, cv, renderer), bodyMat, lensMat);
      p.userData = setup[i]; p.position.set(setup[i].x, 0, setup[i].z); scene.add(p); return p;
    });

    var yaw = 0, yawV = 0, tilt = 0, dragging = false, lastX = 0, lastY = 0, visible = true, raf = 0, lastT = 0, idleAt = 0, t0 = performance.now();
    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      var dt = Math.min(40, now - (lastT || now)); lastT = now;
      var still = reduce.matches;
      if (!dragging) {
        if (!still) yaw += yawV * dt * 0.06;
        yawV *= Math.pow(0.93, dt / 16); if (Math.abs(yawV) < 0.002) yawV = 0;
        if (!still && now > idleAt) yaw += 0;
        tilt += (0 - tilt) * 0.08;
        // the spin comes to rest facing front
        if (!yawV) { var n = Math.round(yaw / (2 * Math.PI)) * 2 * Math.PI; yaw += (n - yaw) * Math.min(1, dt * 0.006); }
      }
      phones.forEach(function (p, i) {
        var u = p.userData;
        var bob = still ? 0 : Math.sin((now - t0) / 1500 + i * 1.7) * 0.045;
        p.position.y = bob;
        p.rotation.y = u.ry * Math.cos(yaw) + yaw + (still ? 0 : Math.sin((now - t0) / 2600 + i) * 0.05);
        p.rotation.x = tilt + (still ? 0 : Math.cos((now - t0) / 2100 + i) * 0.02);
      });
      renderer.render(scene, camera);
      var moving = dragging || yawV || Math.abs(tilt) > 0.002 || Math.abs(yaw - Math.round(yaw / (2 * Math.PI)) * 2 * Math.PI) > 0.002;
      if (!still || moving) raf = requestAnimationFrame(frame);
    }
    function want() { if (!raf && visible) { lastT = 0; raf = requestAnimationFrame(frame); } }

    stage.addEventListener('pointerdown', function (e) { dragging = true; lastX = e.clientX; lastY = e.clientY; yawV = 0; stage.classList.add('is-dragging'); try { stage.setPointerCapture(e.pointerId); } catch (x) {} want(); });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
      yaw += dx * 0.011; yawV = dx * 0.011 * 0.9 + yawV * 0.1;
      tilt = Math.max(-0.35, Math.min(0.35, tilt + dy * 0.004)); want();
    });
    function up() { if (!dragging) return; dragging = false; stage.classList.remove('is-dragging'); idleAt = performance.now() + 2500; want(); }
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('keydown', function (e) {
      var k = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (!k) return;
      e.preventDefault(); e.stopPropagation(); yawV = k * 0.35; want();
    });

    function size() {
      var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h); camera.aspect = w / h;
      var f = Math.tan(camera.fov * Math.PI / 360);
      var d = Math.max((PH + 0.4) / 2 / f, (camera.aspect < 1.5 ? 3.5 : 4.3) / 2 / (camera.aspect * f));
      camera.position.set(0, 0, d + 0.3); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); want();
    }
    window.addEventListener('resize', size);
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) want(); }).observe(stage);
    document.addEventListener('visibilitychange', want);
    if (reduce.addEventListener) reduce.addEventListener('change', want);
    host.appendChild(renderer.domElement);
    size(); stage.classList.add('is-live'); want();
  });
}

DCThree.lazy(stage, function (THREE) {
  if (!THREE) { stage.classList.add('is-flat'); return; }
  build(THREE).catch(function () { stage.classList.add('is-flat'); });
});
})();
