/* Dalton Corr, merch-3d.js

   The HollyShorts 22 merch in one stage: a tee, a hoodie, a tote and a cap,
   one at a time. Drag to rotate; tap to change the design where there is
   more than one; the names under the stage (or the arrow keys) change the
   piece.

   Everything is built here, from parametric surfaces: the tee and hoodie as
   a ghost-mannequin body tube with a shoulder yoke, set-in sleeves, a neck
   rib or a hood, cuffs and hems; the tote as two canvas sheets with a sag and
   two webbing straps; the cap as six panels, a curved brim and a button. The
   folds are displacement along the normals, the fabric grain is a normal
   map drawn on a canvas, and the prints are decals cut from the merch art in
   images/design/hollyshorts-22/merch3d/.

   HERE: three.js arrives only when the stage nears the viewport (see
   js/three-common.js). Without WebGL the block hides and the merch photos
   under it remain. With prefers-reduced-motion nothing moves on its own.
   Arrow keys are stopped here so they change the piece, not the project
   slides. */
(function () {
'use strict';
var stage = document.querySelector('.merch3d-stage');
if (!stage) return;
var root = stage.closest('.merch3d') || stage.parentNode;
var host = stage.querySelector('.merch3d-canvas');
var base = stage.getAttribute('data-base');
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
var PI = Math.PI;

/* the pieces and their designs; colours from the real merch where it exists */
var ITEMS = [
  { key: 'tee', name: 'Tee', designs: [
    { name: 'Poster on cream', color: '#eee9de', print: 'poster' },
    { name: 'Figures on cream', color: '#eee9de', print: 'figures' }
  ] },
  { key: 'hoodie', name: 'Hoodie', designs: [
    { name: '22 on black', color: '#1c1c1e', print: '22' }
  ] },
  { key: 'tote', name: 'Tote', designs: [
    { name: 'Poster on natural canvas', color: '#e9e0cc', print: 'poster' },
    { name: 'Figures on natural canvas', color: '#e9e0cc', print: 'figures' }
  ] },
  { key: 'cap', name: 'Cap', designs: [
    { name: '22 on red', color: '#b8211f', print: '22' },
    { name: '22 on blue', color: '#1f47a8', print: '22' }
  ] }
];
var PRINTS = { poster: 'merch3d/print-poster.webp', figures: 'merch3d/print-figures.webp', '22': 'merch3d/print-22.webp' };

function imgLoad(src) {
  return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; });
}
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function mix(a, b, t) { return a + (b - a) * t; }
function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function spow(x, p) { return (x < 0 ? -1 : 1) * Math.pow(Math.abs(x), p); }

/* value noise, for drape and grain */
function hash(x, y, z) { var h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
function noise(x, y, z) {
  var X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), fx = x - X, fy = y - Y, fz = z - Z;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  function c(i, j, k) { return hash(X + i, Y + j, Z + k); }
  return mix(mix(mix(c(0, 0, 0), c(1, 0, 0), fx), mix(c(0, 1, 0), c(1, 1, 0), fx), fy),
             mix(mix(c(0, 0, 1), c(1, 0, 1), fx), mix(c(0, 1, 1), c(1, 1, 1), fx), fy), fz) * 2 - 1;
}

function build(THREE) {
  var V3 = THREE.Vector3;
  var renderer = DCThree.renderer(THREE, host); renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  var aniso = renderer.capabilities.getMaxAnisotropy();
  var scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(DCThree.env(THREE)).texture;
  var camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);

  /* a soft studio: a big key from high left, a fill, a rim from behind */
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa9a298, 0.3));
  var key = new THREE.DirectionalLight(0xffffff, 1.45); key.position.set(-3.6, 3.2, 2.6);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5;
  key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02;
  var sc = key.shadow.camera; sc.left = -1.3; sc.right = 1.3; sc.top = 1.3; sc.bottom = -1.3; sc.near = 0.5; sc.far = 12;
  scene.add(key);
  var fill = new THREE.DirectionalLight(0xfff6ea, 0.32); fill.position.set(3, 0.6, 3); scene.add(fill);
  var rim = new THREE.DirectionalLight(0xffffff, 0.45); rim.position.set(0.5, 2.5, -4); scene.add(rim);

  function lin(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }

  /* ---- surfaces ---- */
  function grid(nu, nv, closeU, f, us, vs) {
    var n = (nu + 1) * (nv + 1), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), p = [0, 0, 0], k = 0, i, j;
    for (j = 0; j <= nv; j++) for (i = 0; i <= nu; i++) {
      f(closeU && i === nu ? 0 : i / nu, j / nv, p);
      pos[k * 3] = p[0]; pos[k * 3 + 1] = p[1]; pos[k * 3 + 2] = p[2];
      uv[k * 2] = i / nu * (us || 1); uv[k * 2 + 1] = j / nv * (vs || 1); k++;
    }
    var idx = [];
    for (j = 0; j < nv; j++) for (i = 0; i < nu; i++) { var a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.userData = { nu: nu, nv: nv, closeU: closeU };
    norms(g); return g;
  }
  function norms(g) {
    g.computeVertexNormals();
    var u = g.userData; if (!u.closeU) return;
    var N = g.attributes.normal, t = new V3();
    for (var j = 0; j <= u.nv; j++) {
      var a = j * (u.nu + 1), b = a + u.nu;
      t.set(N.getX(a) + N.getX(b), N.getY(a) + N.getY(b), N.getZ(a) + N.getZ(b)).normalize();
      N.setXYZ(a, t.x, t.y, t.z); N.setXYZ(b, t.x, t.y, t.z);
    }
  }
  /* make the normals point away from a centre (or along a hint), so the
     inside of a sleeve reads as the inside */
  function orient(g, out) {
    var P = g.attributes.position, N = g.attributes.normal, s = 0;
    for (var i = 0; i < P.count; i += 7) {
      var o = out(P.getX(i), P.getY(i), P.getZ(i));
      s += Math.sign(N.getX(i) * o[0] + N.getY(i) * o[1] + N.getZ(i) * o[2]);
    }
    if (s < 0) { var I = g.index.array; for (var k = 0; k < I.length; k += 3) { var t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; } g.index.needsUpdate = true; norms(g); }
    return g;
  }
  function displace(g, fn) {
    var P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, u = g.userData;
    for (var i = 0; i < P.count; i++) {
      var x = P.getX(i), y = P.getY(i), z = P.getZ(i), col = i % (u.nu + 1), row = (i / (u.nu + 1)) | 0;
      var d = fn(x, y, z, col / u.nu, row / u.nv, N.getX(i), N.getY(i), N.getZ(i));
      P.setXYZ(i, x + N.getX(i) * d, y + N.getY(i) * d, z + N.getZ(i) * d);
    }
    P.needsUpdate = true; norms(g); return g;
  }
  function shadeAO(g, fn) {
    var P = g.attributes.position, u = g.userData, c = new Float32Array(P.count * 3);
    for (var i = 0; i < P.count; i++) {
      var k = fn(P.getX(i), P.getY(i), P.getZ(i), (i % (u.nu + 1)) / u.nu, ((i / (u.nu + 1)) | 0) / u.nv);
      c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
  }
  /* a tube round a path: centre(t) and two axes for its section */
  function tube(nu, nv, f, us, vs) { return grid(nu, nv, true, f, us, vs); }

  /* the print, laid on a surface: a copy of the front faces, lifted a hair,
     with the art projected straight on from the front */
  function decal(g, cx, cy, w, h, lift) {
    var P = g.attributes.position, N = g.attributes.normal, n = P.count;
    var pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), ok = new Uint8Array(n);
    for (var i = 0; i < n; i++) {
      var nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i), u = (P.getX(i) - cx) / w + 0.5, v = (P.getY(i) - cy) / h + 0.5;
      pos[i * 3] = P.getX(i) + nx * lift; pos[i * 3 + 1] = P.getY(i) + ny * lift; pos[i * 3 + 2] = P.getZ(i) + nz * lift;
      uv[i * 2] = u; uv[i * 2 + 1] = v;
      ok[i] = nz > 0.2 && u > -0.03 && u < 1.03 && v > -0.03 && v < 1.03 ? 1 : 0;
    }
    var I = g.index.array, idx = [];
    for (var k = 0; k < I.length; k += 3) if (ok[I[k]] && ok[I[k + 1]] && ok[I[k + 2]]) idx.push(I[k], I[k + 1], I[k + 2]);
    var d = new THREE.BufferGeometry();
    d.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    d.setAttribute('normal', g.attributes.normal.clone());
    d.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    d.setIndex(idx); return d;
  }

  /* ---- fabric: grain as a normal map ---- */
  function normalTile(N, hf, strength) {
    var h = new Float32Array(N * N), x, y;
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) h[y * N + x] = hf(x, y);
    var c = document.createElement('canvas'); c.width = c.height = N;
    var g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data;
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      var dx = (h[y * N + (x + 1) % N] - h[y * N + (x + N - 1) % N]) * strength;
      var dy = (h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x]) * strength;
      var l = Math.sqrt(dx * dx + dy * dy + 1), o = (y * N + x) * 4;
      d[o] = (-dx / l * 0.5 + 0.5) * 255; d[o + 1] = (dy / l * 0.5 + 0.5) * 255; d[o + 2] = (1 / l * 0.5 + 0.5) * 255; d[o + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; return t;
  }
  function tiled(N, per, f) { return function (x, y) { return f(x, y, per); }; }
  var GRAIN = {};
  function grain(kind) {
    if (GRAIN[kind]) return GRAIN[kind];
    var N = 256, t;
    if (kind === 'jersey') t = normalTile(N, function (x, y) {   // knit: little columns of loops, with a heather mottle
      var cx = (x % 4) / 4, row = ((y + ((x / 4 | 0) % 2) * 3) % 6) / 6;
      return Math.pow(Math.sin(PI * cx), 2) * (0.6 + 0.4 * Math.sin(PI * row)) * 0.5 + noise(x / 18, y / 18, 1) * 0.15 + hash(x, y, 3) * 0.1;
    }, 1.2);
    else if (kind === 'fleece') t = normalTile(N, function (x, y) {
      return noise(x / 22, y / 22, 2) * 0.9 + noise(x / 7, y / 7, 5) * 0.35 + hash(x, y, 7) * 0.25 + Math.pow(Math.sin(PI * (x % 4) / 4), 2) * 0.12;
    }, 1.3);
    else if (kind === 'rib') t = normalTile(N, function (x, y) {   // ribs run along v
      return Math.pow(Math.sin(PI * (x % 16) / 16), 1.4) * 1.6 + hash(x, y, 9) * 0.08;
    }, 1.6);
    else if (kind === 'twill') t = normalTile(N, function (x, y) {
      return Math.pow(Math.sin(PI * ((x + y) % 6) / 6), 2) * 0.7 + noise(x / 20, y / 20, 4) * 0.4 + hash(x, y, 2) * 0.1;
    }, 1.4);
    else if (kind === 'canvas') t = normalTile(N, function (x, y) {   // plain weave
      var p = ((x / 5 | 0) + (y / 5 | 0)) % 2;
      return (p ? Math.sin(PI * (y % 5) / 5) : Math.sin(PI * (x % 5) / 5)) * 0.8 + noise(x / 16, y / 16, 6) * 0.5 + hash(x, y, 1) * 0.12;
    }, 1.5);
    GRAIN[kind] = t; return t;
  }

  /* cloth: matte, both sides, the inside in shade, a faint fuzz at the rim */
  function cloth(hex, kind, o) {
    o = o || {};
    var m = new THREE.MeshStandardMaterial({
      color: lin(hex), roughness: o.rough || 0.93, metalness: 0, side: THREE.DoubleSide, vertexColors: !!o.ao,
      normalMap: kind ? grain(kind) : null, normalScale: new THREE.Vector2(o.ns || 0.5, o.ns || 0.5), envMapIntensity: o.env || 0.22
    });
    if (o.map) m.map = o.map;
    var sheen = o.sheen == null ? 0.07 : o.sheen, inside = o.inside || 0.42;
    m.onBeforeCompile = function (s) {
      s.fragmentShader = s.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>\n if (!gl_FrontFacing) diffuseColor.rgb *= ' + inside.toFixed(3) + ';')
        .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb += ' + sheen.toFixed(3) + ' * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0) * (gl_FrontFacing ? 1.0 : 0.0);\n#include <tonemapping_fragment>');
    };
    m.customProgramCacheKey = function () { return 'cloth' + sheen + inside; };
    return m;
  }
  function inkMat(tex, o) {
    o = o || {};
    var m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: o.rough || 0.8, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 0.2 });
    if (o.nmap) { m.normalMap = o.nmap; m.normalScale = new THREE.Vector2(o.ns || 1, o.ns || 1); }
    return m;
  }
  function mesh(g, m, cast) { var x = new THREE.Mesh(g, m); x.castShadow = cast !== false; x.receiveShadow = true; return x; }

  /* the art as a print: a transparent margin (so the edges clamp to nothing),
     the fabric's grain showing through, the sides feathered if asked */
  var ART = {};
  function printTex(key, o) {
    o = o || {};
    var img = ART[key]; if (!img) return null;
    var pad = 6, W = img.width + pad * 2, H = img.height + pad * 2;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'); g.drawImage(img, pad, pad);
    if (o.feather) {
      g.globalCompositeOperation = 'destination-out';
      var f = W * o.feather, l = g.createLinearGradient(pad, 0, pad + f, 0);
      l.addColorStop(0, 'rgba(0,0,0,1)'); l.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = l; g.fillRect(0, 0, pad + f, H);
      var r = g.createLinearGradient(W - pad - f, 0, W - pad, 0);
      r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = r; g.fillRect(W - pad - f, 0, pad + f, H);
    }
    // ink sits in the weave: a fine grain multiplied in, alpha kept
    var n = document.createElement('canvas'); n.width = n.height = 64;
    var ng = n.getContext('2d'), id = ng.createImageData(64, 64);
    for (var i = 0; i < 64 * 64; i++) { var v = 225 + hash(i % 64, i / 64 | 0, 11) * 30; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    ng.putImageData(id, 0, 0);
    var keep = document.createElement('canvas'); keep.width = W; keep.height = H; keep.getContext('2d').drawImage(c, 0, 0);
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = o.grain == null ? 0.5 : o.grain;
    g.fillStyle = g.createPattern(n, 'repeat'); g.fillRect(0, 0, W, H);
    g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.drawImage(keep, 0, 0);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = aniso;
    t.userData = { aspect: img.height / img.width }; return t;
  }
  /* embroidery: the logo's alpha as a raised, satin-stitched relief */
  function stitchNormal(tex) {
    var src = tex.image, W = src.width, H = src.height, g = src.getContext('2d'), a = g.getImageData(0, 0, W, H).data;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var cg = c.getContext('2d'), im = cg.createImageData(W, H), d = im.data;
    function al(x, y) { x = clamp(x, 0, W - 1); y = clamp(y, 0, H - 1); return a[(y * W + x) * 4 + 3] / 255; }
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var e = al(x, y), sat = e * Math.sin((x + y * 0.4) * 1.3) * 0.35;
      var dx = (al(x + 2, y) - al(x - 2, y)) * 2.2 + sat, dy = (al(x, y + 2) - al(x, y - 2)) * 2.2;
      var l = Math.sqrt(dx * dx + dy * dy + 1), o = (y * W + x) * 4;
      d[o] = (-dx / l * 0.5 + 0.5) * 255; d[o + 1] = (dy / l * 0.5 + 0.5) * 255; d[o + 2] = (1 / l * 0.5 + 0.5) * 255; d[o + 3] = 255;
    }
    cg.putImageData(im, 0, 0);
    var t = new THREE.CanvasTexture(c); t.anisotropy = aniso; return t;
  }

  /* ---- the tee and the hoodie share a body ---- */
  function bodyFn(c) {
    // u round the body (0 = back centre), v from the hem up over the yoke to the neck
    var vb = 0.8;
    function shoulderY(x) { return c.yTop - c.slope * Math.max(0, Math.abs(x) - c.nrx); }
    function edge(cx, cz, p) {
      var xe = c.aTop * cx, ye = shoulderY(xe) - c.yoke;
      p[0] = xe; p[1] = ye; p[2] = c.depth(ye) * cz;
    }
    var e0 = [0, 0, 0];
    return function (u, v, p) {
      var th = -PI / 2 + 2 * PI * u, co = Math.cos(th), si = Math.sin(th);
      var cx = spow(co, 2 / c.n), cz = spow(si, 2 / c.n);
      edge(cx, cz, e0);
      if (v <= vb) {
        var t = v / vb, y = c.yHem + (e0[1] - c.yHem) * t;
        p[0] = c.width(y) * cx; p[1] = y; p[2] = c.depth(y) * cz;
      } else {
        var e = (v - vb) / (1 - vb), ac = Math.abs(co);
        var yn = c.yTop - (si > 0 ? c.dropF * si * si : c.dropB * si * si);
        // a rounded shoulder: rise first, then turn in to the neck
        var gy = Math.sin(e * PI / 2), gx = 1 - Math.cos(e * PI / 2);
        p[0] = mix(e0[0], c.nrx * co, gx);
        p[1] = mix(e0[1], yn, gy);
        p[2] = mix(e0[2], c.nrz * si, gx);
      }
    };
  }
  function sleeveFn(c, side) {
    var d = new V3(side * Math.cos(c.drop), -Math.sin(c.drop), c.fwd).normalize();
    var n1 = new V3(side * Math.sin(c.drop), Math.cos(c.drop), 0).normalize();
    var n2 = new V3().crossVectors(d, n1).normalize(); if (n2.z < 0) n2.negate();
    n1.crossVectors(n2, d).normalize(); if (n1.y < 0) n1.negate();
    var R = new V3(side * c.root[0], c.root[1], 0);
    return { d: d, n1: n1, n2: n2, R: R, f: function (u, v, p) {
      var s = mix(c.s0, c.len, v), ph = 2 * PI * u, r = c.radius(v, ph);
      p[0] = R.x + d.x * s + n1.x * r * Math.cos(ph) + n2.x * r * c.flat * Math.sin(ph);
      p[1] = R.y + d.y * s + n1.y * r * Math.cos(ph) + n2.y * r * c.flat * Math.sin(ph);
      p[2] = R.z + d.z * s + n1.z * r * Math.cos(ph) + n2.z * r * c.flat * Math.sin(ph);
    } };
  }

  function makeTee() {
    var g = new THREE.Group();
    var C = {
      n: 2.5, yHem: -0.9, yTop: 0.5, slope: 0.2, nrx: 0.165, nrz: 0.125, dropF: 0.1, dropB: 0.025, yoke: 0.15, aTop: 0.455,
      width: function (y) { return 0.5 + 0.012 * sstep(-0.4, -0.9, y) - 0.045 * sstep(0.02, 0.36, y); },
      depth: function (y) { return 0.165 - 0.02 * sstep(-0.3, -0.9, y) - 0.03 * sstep(0.2, 0.42, y); }
    };
    var armL = new V3(-0.49, 0.05, 0), armR = new V3(0.49, 0.05, 0);
    var body = grid(120, 110, true, bodyFn(C), 12, 6);
    orient(body, function (x, y, z) { return [x, 0, z]; });
    displace(body, function (x, y, z, u, v) {
      // cloth hangs: long vertical folds, a little slack everywhere else
      var d = noise(x * 7, y * 1.3, z * 7) * 0.006 + noise(x * 3, y * 2, z * 3 + 3) * 0.003 + noise(x * 14, y * 3, z * 14 + 7) * 0.0012;
      // drag lines from the armpits toward the middle of the chest
      [armL, armR].forEach(function (a) {
        var qx = x - a.x, qy = y - a.y, dx = -Math.sign(a.x) * 0.72, dy = -0.69;
        var al = qx * dx + qy * dy, ac = -qx * dy + qy * dx;
        if (al > 0) d += 0.009 * Math.exp(-ac * ac / 0.0009) * Math.exp(-al / 0.18) * Math.sin(al * 30 + 0.8);
      });
      d += 0.004 * Math.sin(x * 21 + noise(x * 3, y, 1) * 3) * sstep(-0.65, -0.9, y);   // the hem waves a little
      return d * sstep(0.5, 0.38, y);
    });
    shadeAO(body, function (x, y, z) {
      var k = 1 - 0.3 * Math.exp(-((Math.abs(x) - 0.47) * (Math.abs(x) - 0.47) + (y - 0.05) * (y - 0.05)) / 0.012);
      k -= 0.06 * Math.pow(Math.abs(x) / 0.5, 6) + 0.06 * sstep(-0.855, -0.87, y) * (1 - sstep(-0.885, -0.9, y));   // the hem's stitched fold
      return clamp(k, 0.55, 1);
    });
    var mat = cloth('#eee9de', 'jersey', { ao: true, ns: 0.3, sheen: 0.05 });
    g.add(mesh(body, mat));
    // sleeves
    var S = { drop: 0.64, fwd: 0.08, root: [0.335, 0.27], s0: -0.14, len: 0.42, flat: 0.8,
      radius: function (v, ph) { return mix(0.19, 0.158, v) * (1 + 0.035 * Math.sin(ph * 2 + v * 5)) * mix(0.55, 1, sstep(0, 0.3, v)); } };
    [-1, 1].forEach(function (side) {
      var sf = sleeveFn(S, side), geo = grid(64, 40, true, sf.f, 6, 2);
      orient(geo, function (x, y, z) { var c = sf.R, px = x - c.x, py = y - c.y, pz = z - c.z, t = px * sf.d.x + py * sf.d.y + pz * sf.d.z; return [px - sf.d.x * t, py - sf.d.y * t, pz - sf.d.z * t]; });
      displace(geo, function (x, y, z, u, v) {
        var under = Math.exp(-Math.pow(Math.cos(u * 2 * PI) + 1, 2) / 0.5);   // folds bunch under the arm
        return (0.008 * Math.sin(v * 16 + u * 3) * under + noise(x * 5, y * 5, z * 5) * 0.004) * sstep(0, 0.2, v) + 0.004 * sstep(0.93, 1, v);
      });
      shadeAO(geo, function (x, y, z, u, v) { var under = Math.exp(-Math.pow(Math.cos(u * 2 * PI) + 1, 2) / 0.6); return 1 - 0.28 * under * (1 - sstep(0, 0.6, v)) - 0.04 * sstep(0.9, 1, v); });
      g.add(mesh(geo, mat));
    });
    // the neck rib, a soft roll round the opening
    var rib = tube(120, 10, function (u, v, p) {
      var th = -PI / 2 + 2 * PI * u, co = Math.cos(th), si = Math.sin(th), ph = 2 * PI * v;
      var yn = C.yTop - (si > 0 ? C.dropF * si * si : C.dropB * si * si), rr = 0.021;
      var rx = co, rz = si * C.nrz / C.nrx, l = Math.sqrt(rx * rx + rz * rz); rx /= l; rz /= l;
      p[0] = C.nrx * co + rx * rr * (Math.cos(ph) - 0.2); p[1] = yn + rr * 0.9 * Math.sin(ph); p[2] = C.nrz * si + rz * rr * (Math.cos(ph) - 0.2);
    }, 30, 1);
    rib = orient(rib, function (x, y, z) { return [x, y - 0.4, z]; });
    g.add(mesh(rib, cloth('#e7e1d4', 'rib', { ns: 0.6, sheen: 0.04 })));
    g.userData.printOn = body;
    g.userData.print = function (d) {
      if (d.print === 'poster') return { cx: 0, top: 0.3, w: 0.28 };
      return { cx: 0, top: 0.29, w: 0.32 };
    };
    g.userData.recolor = [mat];
    return g;
  }

  function makeHoodie() {
    var g = new THREE.Group(), BLACK = '#1c1c1e';
    var C = {
      n: 2.7, yHem: -0.83, yTop: 0.5, slope: 0.26, nrx: 0.19, nrz: 0.16, dropF: 0.07, dropB: 0.01, yoke: 0.14, aTop: 0.49,
      width: function (y) { return 0.54 + 0.03 * sstep(-0.5, -0.78, y) - 0.03 * sstep(-0.78, -0.83, y) - 0.035 * sstep(-0.05, 0.34, y); },
      depth: function (y) { return 0.2 + 0.015 * sstep(-0.5, -0.78, y) - 0.03 * sstep(0.2, 0.4, y); }
    };
    var body = grid(128, 110, true, bodyFn(C), 10, 6);
    orient(body, function (x, y, z) { return [x, 0, z]; });
    function bdisp(x, y, z) {
      var d = noise(x * 6, y * 1.4, z * 6) * 0.007 + noise(x * 2.5, y * 2, z * 2.5 + 3) * 0.004;
      d += 0.008 * Math.sin(x * 16 + noise(x * 2, y, 2) * 4) * sstep(-0.62, -0.8, y);   // blousing over the band
      return d * sstep(0.5, 0.36, y);
    }
    displace(body, bdisp);
    // pocket shadow: under its slanted openings and along its bottom seam
    function inPocketEdge(x, y) {
      var ax = Math.abs(x), t = (y + 0.62) / 0.2, xs = mix(0.33, 0.21, clamp(t, 0, 1));
      return (y > -0.62 && y < -0.42) ? Math.exp(-Math.pow(ax - xs + 0.012, 2) / 0.0002) : 0;
    }
    shadeAO(body, function (x, y, z) {
      var k = 1 - 0.3 * Math.exp(-((Math.abs(x) - 0.5) * (Math.abs(x) - 0.5) + (y + 0.05) * (y + 0.05)) / 0.02);
      if (z > 0) k -= 0.35 * inPocketEdge(x, y);
      return clamp(k, 0.5, 1);
    });
    var mat = cloth(BLACK, 'fleece', { ao: true, ns: 0.3, sheen: 0.14, inside: 0.55, env: 0.06, rough: 1 });
    g.add(mesh(body, mat));
    // ribbed hem band
    var band = tube(128, 8, function (u, v, p) {
      var th = -PI / 2 + 2 * PI * u, a = 0.525, b = 0.195, y = mix(-0.935, -0.815, v);
      p[0] = a * spow(Math.cos(th), 2 / C.n); p[1] = y; p[2] = b * spow(Math.sin(th), 2 / C.n);
    }, 40, 1);
    orient(band, function (x, y, z) { return [x, 0, z]; });
    var ribMat = cloth('#19191b', 'rib', { ns: 0.9, sheen: 0.12, inside: 0.7 });
    g.add(mesh(band, ribMat));
    // sleeves hang long, gather above the cuffs
    var S = { drop: 1.15, fwd: 0.16, root: [0.33, 0.2], s0: -0.16, len: 0.86, flat: 0.86,
      radius: function (v, ph) {
        var r = mix(0.2, 0.15, v) + 0.012 * sstep(0.7, 0.9, v) - 0.075 * sstep(0.9, 0.99, v);
        return r * (1 + 0.04 * Math.sin(ph * 3 + v * 9)) * mix(0.5, 1, sstep(0, 0.28, v));
      } };
    [-1, 1].forEach(function (side) {
      var sf = sleeveFn(S, side), geo = grid(64, 70, true, sf.f, 5, 4);
      var out = function (x, y, z) { var c = sf.R, px = x - c.x, py = y - c.y, pz = z - c.z, t = px * sf.d.x + py * sf.d.y + pz * sf.d.z; return [px - sf.d.x * t, py - sf.d.y * t, pz - sf.d.z * t]; };
      orient(geo, out);
      displace(geo, function (x, y, z, u, v) {
        var d = noise(x * 4, y * 4, z * 4) * 0.006;
        d += 0.009 * Math.sin(v * 55 + Math.sin(u * 2 * PI + v * 7) * 2.6 + noise(u * 3, v * 4, 1) * 3) * sstep(0.62, 0.86, v) * (1 - sstep(0.88, 0.92, v));   // bunching
        d += 0.01 * Math.sin(v * 22 + u * 4) * Math.exp(-Math.pow(Math.cos(u * 2 * PI) + 1, 2) / 0.5) * (1 - sstep(0.1, 0.5, v));
        return d * sstep(0, 0.12, v);
      });
      shadeAO(geo, function (x, y, z, u, v) { var under = Math.exp(-Math.pow(Math.cos(u * 2 * PI) + 1, 2) / 0.6); return 1 - 0.25 * under * (1 - sstep(0, 0.5, v)) - 0.12 * sstep(0.85, 0.92, v); });
      g.add(mesh(geo, mat));
      // the ribbed cuff
      var end = sf.R.clone().addScaledVector(sf.d, S.len * 0.93);
      var cuff = tube(48, 6, function (u, v, p) {
        var ph = 2 * PI * u, s = mix(-0.005, 0.115, v), r = 0.083 - 0.004 * v;
        p[0] = end.x + sf.d.x * s + (sf.n1.x * Math.cos(ph) + sf.n2.x * 0.9 * Math.sin(ph)) * r;
        p[1] = end.y + sf.d.y * s + (sf.n1.y * Math.cos(ph) + sf.n2.y * 0.9 * Math.sin(ph)) * r;
        p[2] = end.z + sf.d.z * s + (sf.n1.z * Math.cos(ph) + sf.n2.z * 0.9 * Math.sin(ph)) * r;
      }, 12, 1);
      orient(cuff, function (x, y, z) { var px = x - end.x, py = y - end.y, pz = z - end.z, t = px * sf.d.x + py * sf.d.y + pz * sf.d.z; return [px - sf.d.x * t, py - sf.d.y * t, pz - sf.d.z * t]; });
      g.add(mesh(cuff, ribMat));
    });
    // the hood: a shell round the neck, its face opening tipped forward and up
    var no = new V3(0, 0.42, 1).normalize(), e1 = new V3(1, 0, 0), e2 = new V3().crossVectors(no, e1).normalize();
    var Hc = new V3(0, 0.58, -0.12), ax = 0.23, ay = 0.25, az = 0.25, beta = 1.0;
    function hoodPt(w, p) { p[0] = Hc.x + w.x * ax; p[1] = Hc.y + w.y * ay; p[2] = Hc.z + w.z * az; }
    var w = new V3();
    var hood = grid(96, 48, true, function (u, v, p) {
      var psi = beta + (PI - beta) * v, om = 2 * PI * u;
      w.copy(no).multiplyScalar(Math.cos(psi)).addScaledVector(e1, Math.cos(om) * Math.sin(psi)).addScaledVector(e2, Math.sin(om) * Math.sin(psi));
      hoodPt(w, p);
      // a hood has no head in it: the crown folds down a little, the sides fall in
      var back = sstep(0.35, 1, v);
      p[1] -= 0.07 * Math.max(0, w.y) * back + 0.05 * back;   // the empty crown slumps onto the back
      p[2] -= 0.05 * back; p[0] *= (1 - 0.18 * back * (0.4 + 0.6 * Math.max(0, w.y))) * (1 + 0.45 * Math.pow(Math.max(0, -w.y), 1.5));
    }, 8, 4);
    orient(hood, function (x, y, z) { return [x - Hc.x, y - Hc.y, z - Hc.z]; });
    displace(hood, function (x, y, z, u, v) { return noise(x * 4, y * 4, z * 4) * 0.008 * sstep(0, 0.15, v) - 0.006 * Math.exp(-x * x / 0.00015) * sstep(0.05, 0.2, v); });   // and a centre seam
    shadeAO(hood, function (x, y, z, u, v) { return 1 - 0.25 * sstep(0.25, 0, v) * Math.max(0, -Math.sin(u * 2 * PI)); });
    g.add(mesh(hood, mat));
    // the rolled edge of the opening, where the drawcord runs
    var rimAt = function (om, p) {
      w.copy(no).multiplyScalar(Math.cos(beta)).addScaledVector(e1, Math.cos(om) * Math.sin(beta)).addScaledVector(e2, Math.sin(om) * Math.sin(beta));
      hoodPt(w, p);
    };
    var pa = [0, 0, 0], pb = [0, 0, 0];
    var hem = tube(96, 10, function (u, v, p) {
      var om = 2 * PI * u, ph = 2 * PI * v; rimAt(om, pa);
      var rx = Math.cos(om) * ax, ry = Math.sin(om) * (e2.y * ay), rz = Math.sin(om) * (e2.z * az), l = Math.sqrt(rx * rx + ry * ry + rz * rz);
      var r = 0.024;
      p[0] = pa[0] + (rx / l) * r * Math.cos(ph) + no.x * r * Math.sin(ph);
      p[1] = pa[1] + (ry / l) * r * Math.cos(ph) + no.y * r * Math.sin(ph);
      p[2] = pa[2] + (rz / l) * r * Math.cos(ph) + no.z * r * Math.sin(ph);
    }, 24, 1);
    g.add(mesh(hem, mat));
    // drawcords from the eyelets at the bottom of the opening, with metal tips
    var cordMat = cloth('#202022', 'twill', { ns: 0.4, sheen: 0.1 });
    var tipMat = new THREE.MeshStandardMaterial({ color: lin('#c9c9c9'), metalness: 1, roughness: 0.3, envMapIntensity: 1 });
    [-1, 1].forEach(function (side) {
      rimAt(-PI / 2 + side * 0.5, pa);
      var sway = side * 0.02;
      var pts = [new V3(pa[0], pa[1], pa[2] + 0.02), new V3(pa[0] + sway, pa[1] - 0.1, pa[2] + 0.05), new V3(pa[0] + sway * 2, pa[1] - 0.25, pa[2] + 0.06), new V3(pa[0] + sway * 1.6 + side * 0.01, pa[1] - 0.4, pa[2] + 0.07)];
      var curve = new THREE.CatmullRomCurve3(pts);
      g.add(mesh(new THREE.TubeGeometry(curve, 40, 0.011, 10, false), cordMat));
      var tipEnd = pts[3], dir = new V3().subVectors(pts[3], pts[2]).normalize();
      var tip = mesh(new THREE.CylinderGeometry(0.0125, 0.012, 0.05, 16), tipMat);
      tip.position.copy(tipEnd).addScaledVector(dir, 0.022); tip.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir); g.add(tip);
      // eyelet
      var ey = mesh(new THREE.TorusGeometry(0.016, 0.005, 8, 24), tipMat);
      ey.position.set(pa[0], pa[1] + 0.005, pa[2] + 0.012); ey.lookAt(pa[0], pa[1] + 0.3, pa[2] + 0.8); g.add(ey);
    });
    // kangaroo pocket: a patch, raised a little, open along its slanted sides
    function frontZ(x, y) {
      var a = C.width(y), b = C.depth(y), t = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / a, C.n)), 1 / C.n);
      return b * t;
    }
    var pocket = grid(60, 30, false, function (u, v, p) {
      var y = mix(-0.8, -0.42, v), t = clamp((y + 0.62) / 0.2, 0, 1), xs = mix(0.33, 0.21, t), x = mix(-xs, xs, u);
      var puff = 0.014 * Math.pow(Math.sin(PI * u), 0.35) * Math.pow(Math.sin(PI * v), 0.5) + 0.003;
      var z = frontZ(x, y); p[0] = x; p[1] = y; p[2] = z + bdisp(x, y, z) + puff;
    }, 3, 2);
    orient(pocket, function () { return [0, 0, 1]; });
    shadeAO(pocket, function (x, y, z, u, v) { return 1 - 0.1 * sstep(0.2, 0, v); });
    g.add(mesh(pocket, mat));
    g.userData.printOn = body;
    g.userData.print = function () { return { cx: 0, top: 0.24, w: 0.3 }; };
    g.userData.recolor = [];
    return g;
  }

  function makeTote() {
    var g = new THREE.Group(), W = 0.84, H = 0.94, y0 = -0.52;
    function topY(x) {   // the mouth sags between the straps and droops at the corners
      var ax = Math.abs(x);
      return y0 + H - (ax < 0.16 ? 0.014 * (1 - Math.pow(ax / 0.16, 2)) : 0.03 * Math.pow((ax - 0.16) / 0.26, 2));
    }
    function thick(u, v) { return 0.06 * Math.pow(Math.sin(PI * u), 0.5) * Math.pow(Math.sin(PI * clamp(v * 0.55, 0, 1)), 0.6) + 0.0015; }
    function fold(x, y) {   // tension from each strap down and out, and a soft ripple in the mouth
      var d = noise(x * 3, y * 2, 1) * 0.016 + noise(x * 6, y * 2.5, 4) * 0.007 + noise(x * 16, y * 16, 2) * 0.0012;
      d += 0.012 * Math.sin((x * 0.8 + y) * 9 + noise(x * 2, y * 2, 5) * 2) * sstep(-0.1, -0.5, y) * 0.6;   // a soft diagonal wave low down
      [-0.16, 0.16].forEach(function (sx) {
        var qx = x - sx, qy = y - (y0 + H - 0.08), dx = Math.sign(sx) * 0.45, dy = -0.89;
        var al = qx * dx + qy * dy, ac = -qx * dy + qy * dx;
        if (al > 0) d += 0.02 * Math.exp(-ac * ac / 0.0015) * Math.exp(-al / 0.35) + 0.006 * Math.exp(-Math.pow(ac - 0.06, 2) / 0.0008) * Math.exp(-al / 0.25);
      });
      d += 0.004 * Math.sin(x * 26) * sstep(y0 + H - 0.2, y0 + H, y) * (Math.abs(x) < 0.15 ? 1 : 0.4);
      return d;
    }
    function sheet(front) {
      return grid(90, 100, false, function (u, v, p) {
        var x = (u - 0.5) * W * (1 - 0.01 * Math.sin(PI * v)), y = mix(y0, topY(x), v), s = front ? 1 : -1;
        p[0] = x; p[1] = y; p[2] = s * (thick(u, v) + fold(x, y) * Math.pow(Math.sin(PI * u), 0.3) * Math.pow(clamp(v * 8, 0, 1), 0.5));
      }, 1, 1);
    }
    // a woven canvas, baked across the whole face so it can carry the stitching too
    var TW = 1024, TH = Math.round(1024 * H / W);
    function canvasMaps() {
      var c = document.createElement('canvas'); c.width = TW; c.height = TH;
      var cg = c.getContext('2d'); cg.fillStyle = '#fff'; cg.fillRect(0, 0, TW, TH);
      var id = cg.getImageData(0, 0, TW, TH), d = id.data, hgt = new Float32Array(TW * TH);
      for (var y = 0; y < TH; y++) for (var x = 0; x < TW; x++) {
        var p = ((x >> 2) + (y >> 2)) & 1, h = (p ? Math.sin(PI * (y & 3) / 4) : Math.sin(PI * (x & 3) / 4)) * 0.6 + hash(x, y, 5) * 0.25 + noise(x / 40, y / 40, 2) * 0.3;
        // slub: an uneven thread here and there
        h += (hash(0, y >> 2, 8) > 0.97 ? 0.15 : 0) + (hash(x >> 2, 0, 9) > 0.98 ? 0.12 : 0);
        hgt[y * TW + x] = h;
        var o = (y * TW + x) * 4, k = 236 + h * 16 + noise(x / 90, y / 90, 3) * 5;
        d[o] = d[o + 1] = d[o + 2] = clamp(k, 0, 255);
      }
      cg.putImageData(id, 0, 0);
      // the hem at the mouth, double-stitched, and the strap boxes
      cg.strokeStyle = 'rgba(120,108,88,.55)'; cg.lineWidth = 2; cg.setLineDash([7, 5]);
      [TH * 0.058, TH * 0.07].forEach(function (yy) { cg.beginPath(); cg.moveTo(0, yy); cg.lineTo(TW, yy); cg.stroke(); });
      cg.setLineDash([]); cg.fillStyle = 'rgba(0,0,0,.06)'; cg.fillRect(0, 0, TW, TH * 0.075);
      var n = document.createElement('canvas'); n.width = TW; n.height = TH;
      var ng = n.getContext('2d'), ni = ng.createImageData(TW, TH), nd = ni.data;
      for (y = 0; y < TH; y++) for (x = 0; x < TW; x++) {
        var dx = (hgt[y * TW + Math.min(TW - 1, x + 1)] - hgt[y * TW + Math.max(0, x - 1)]) * 0.9;
        var dy = (hgt[Math.min(TH - 1, y + 1) * TW + x] - hgt[Math.max(0, y - 1) * TW + x]) * 0.9;
        var l = Math.sqrt(dx * dx + dy * dy + 1), oo = (y * TW + x) * 4;
        nd[oo] = (-dx / l * 0.5 + 0.5) * 255; nd[oo + 1] = (-dy / l * 0.5 + 0.5) * 255; nd[oo + 2] = (1 / l * 0.5 + 0.5) * 255; nd[oo + 3] = 255;
      }
      ng.putImageData(ni, 0, 0);
      var mt = new THREE.CanvasTexture(c); mt.encoding = THREE.sRGBEncoding; mt.anisotropy = aniso; mt.flipY = false;
      var nt = new THREE.CanvasTexture(n); nt.anisotropy = aniso; nt.flipY = false;
      return [mt, nt];
    }
    var maps = canvasMaps();
    // canvas row 0 is the mouth: flip v on the sheets so it lands at the top
    function flipV(geo) { var U = geo.attributes.uv; for (var i = 0; i < U.count; i++) U.setY(i, 1 - U.getY(i)); U.needsUpdate = true; return geo; }
    var mat = cloth('#e9e0cc', null, { map: maps[0], rough: 0.96, sheen: 0.04, inside: 0.55, ao: true });
    mat.normalMap = maps[1]; mat.normalScale = new THREE.Vector2(0.7, 0.7);
    function edgeAO(x, y, z, u, v) { return 1 - 0.18 * (1 - sstep(0, 0.04, u)) - 0.18 * (1 - sstep(1, 0.96, u)) - 0.12 * (1 - sstep(0, 0.03, v)); }
    var front = shadeAO(flipV(orient(sheet(true), function () { return [0, 0, 1]; })), edgeAO);
    var back = shadeAO(flipV(orient(sheet(false), function () { return [0, 0, -1]; })), edgeAO);
    g.add(mesh(front, mat)); g.add(mesh(back, mat));
    // webbing straps: stitched down the face, then up in a loop
    var strapMat = cloth('#e6ddc8', 'twill', { ns: 0.6, sheen: 0.04, inside: 1 });
    var yT = y0 + H;
    [1, -1].forEach(function (s) {
      var zf = s * 0.012, lean = s * 0.07, apex = s > 0 ? 0.47 : 0.44;
      var pts = [
        new V3(-0.16, yT - 0.1, zf), new V3(-0.16, yT - 0.02, zf), new V3(-0.165, yT + 0.12, zf + lean * 0.4),
        new V3(-0.12, yT + apex - 0.08, zf + lean), new V3(0, yT + apex, zf + lean * 1.1), new V3(0.12, yT + apex - 0.08, zf + lean),
        new V3(0.165, yT + 0.12, zf + lean * 0.4), new V3(0.16, yT - 0.02, zf), new V3(0.16, yT - 0.1, zf)
      ];
      var curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), N = 200, bw = 0.036, bt = 0.0045;
      var z = new V3(0, 0, 1), T = new V3(), side = new V3(), nrm = new V3(), c = new V3();
      var strap = grid(20, N, true, function (u, v, p) {
        curve.getPointAt(v, c); curve.getTangentAt(v, T);
        side.crossVectors(T, z).normalize(); nrm.crossVectors(side, T).normalize();
        var ph = 2 * PI * u, cx = spow(Math.cos(ph), 0.35), cy = spow(Math.sin(ph), 0.35);
        // the flat part lies on the bag: sit it on the face
        var on = 1 - sstep(yT - 0.03, yT + 0.02, c.y), face = s * (thick(0.5 + c.x / W, clamp((c.y - y0) / H, 0, 1)) + 0.006);
        var cz = mix(c.z, face, on);
        p[0] = c.x + side.x * bw * cx + nrm.x * bt * cy; p[1] = c.y + side.y * bw * cx + nrm.y * bt * cy; p[2] = cz + side.z * bw * cx + nrm.z * bt * cy;
      }, 1, 30);
      g.add(mesh(strap, strapMat));
    });
    g.userData.printOn = front;
    g.userData.print = function (d) {
      if (d.print === 'poster') return { cx: 0, top: y0 + H - 0.19, w: 0.3 };
      return { cx: 0, top: y0 + H - 0.18, w: 0.34 };
    };
    g.userData.recolor = [];
    return g;
  }

  function makeCap() {
    var g = new THREE.Group(), RX = 0.5, RZ = 0.56, HC = 0.5;
    var seams = [0, 1, 2, 3, 4, 5].map(function (k) { return k * PI / 3; });
    function crown(u, v, p) {
      var ph = 2 * PI * u, s = Math.sin(ph), c = Math.cos(ph), t = v;
      var rho = Math.pow(Math.cos(t * PI / 2), 0.7), yy = HC * Math.sin(t * PI / 2) * (1 + 0.1 * c * (1 - t)) ;
      p[0] = RX * s * rho; p[1] = yy; p[2] = RZ * c * rho - 0.07 * t * t + 0.03 * (1 - t) * Math.max(0, c);
    }
    var geo = grid(180, 70, true, crown, 1, 1);
    orient(geo, function (x, y, z) { return [x, y - 0.1, z]; });
    displace(geo, function (x, y, z, u, v) {
      var ph = 2 * PI * u, dmin = 9;
      seams.forEach(function (a) { var d = Math.abs(((ph - a + 3 * PI) % (2 * PI)) - PI); if (d < dmin) dmin = d; });
      var rho = Math.pow(Math.cos(v * PI / 2), 0.7) * 0.53, arc = dmin * rho;
      var panel = Math.sin(PI * ((ph % (PI / 3)) / (PI / 3)));
      return -0.006 * Math.exp(-arc * arc / 0.00006) + 0.012 * Math.pow(panel, 0.6) * Math.sin(PI * clamp(v * 1.1, 0, 1)) * (1 - v * 0.6) + noise(x * 5, y * 5, z * 5) * 0.002;
    });
    // the crown's cloth: stitching beside each seam, eyelets, the rear arch cut away
    var MW = 2048, MH = 512;
    function crownMap() {
      var c = document.createElement('canvas'); c.width = MW; c.height = MH;
      var cg = c.getContext('2d'); cg.fillStyle = '#fff'; cg.fillRect(0, 0, MW, MH);
      var im = cg.getImageData(0, 0, MW, MH), d = im.data;
      for (var i = 0; i < MW * MH; i++) { var x = i % MW, y = i / MW | 0, k = 240 + Math.sin((x + y) * 1.4) * 5 + hash(x, y, 4) * 8; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = k; }
      cg.putImageData(im, 0, 0);
      cg.strokeStyle = 'rgba(0,0,0,.28)'; cg.lineWidth = 2.2; cg.setLineDash([6, 4]);
      seams.forEach(function (a) {
        [-1, 1].forEach(function (sd) {
          cg.beginPath();
          for (var j = 0; j <= 60; j++) {
            var v = j / 60 * 0.93, rho = Math.max(0.05, Math.pow(Math.cos(v * PI / 2), 0.7) * 0.53), du = sd * 0.012 / rho / (2 * PI);
            var x = ((a / (2 * PI) + du + 1) % 1) * MW, y = (1 - v) * MH;
            if (j) cg.lineTo(x, y); else cg.moveTo(x, y);
          }
          cg.stroke();
        });
      });
      [0.035, 0.055].forEach(function (v) { cg.beginPath(); cg.moveTo(0, (1 - v) * MH); cg.lineTo(MW, (1 - v) * MH); cg.stroke(); });
      cg.setLineDash([]);
      // eyelets
      seams.forEach(function (a) {
        var v = 0.66, rho = Math.pow(Math.cos(v * PI / 2), 0.7) * 0.53, x = ((a + PI / 6) / (2 * PI)) * MW, y = (1 - v) * MH;
        cg.save(); cg.translate(x, y); cg.scale(1 / (rho * 2 * PI) * 0.53 * 3.2, 1);
        cg.fillStyle = 'rgba(0,0,0,.55)'; cg.beginPath(); cg.arc(0, 0, 7, 0, 2 * PI); cg.fill();
        cg.strokeStyle = 'rgba(0,0,0,.35)'; cg.lineWidth = 3; cg.beginPath(); cg.arc(0, 0, 10, 0, 2 * PI); cg.stroke();
        cg.restore();
      });
      // the rear arch over the strap
      cg.save(); cg.globalCompositeOperation = 'destination-out';
      cg.beginPath(); cg.moveTo(MW * 0.5 - MW * 0.052, MH); cg.quadraticCurveTo(MW * 0.5 - MW * 0.05, MH * (1 - 0.24), MW * 0.5, MH * (1 - 0.25));
      cg.quadraticCurveTo(MW * 0.5 + MW * 0.05, MH * (1 - 0.24), MW * 0.5 + MW * 0.052, MH); cg.closePath(); cg.fill(); cg.restore();
      var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = aniso; return t;
    }
    var crownTex = crownMap();
    var mat = cloth('#b8211f', null, { map: crownTex, rough: 0.9, sheen: 0.09, inside: 0.5 });
    mat.alphaTest = 0.5;
    g.add(mesh(geo, mat));
    // the inside, in its own shade: a lining across the opening, seen through the arch
    var lining = mesh(new THREE.CircleGeometry(1, 48), cloth('#b8211f', null, { rough: 1, sheen: 0, inside: 1 }), false);
    lining.rotation.x = -PI / 2; lining.scale.set(RX * 0.98, RZ * 0.98, 1); lining.position.y = 0.02; lining.material.color.multiplyScalar(0.35); g.add(lining);
    g.userData.lining = lining.material;
    // button on top
    var btn = mesh(new THREE.SphereGeometry(0.042, 24, 12), mat);
    btn.scale.set(1, 0.45, 1); btn.position.set(0, HC + 0.006, -0.07); g.add(btn);
    // the back strap across the arch, and its buckle
    var strap = grid(40, 4, false, function (u, v, p) {
      var ph = PI + (u - 0.5) * 0.52, r = 1.012, y = mix(0.035, 0.085, v);
      p[0] = RX * Math.sin(ph) * r; p[1] = y; p[2] = RZ * Math.cos(ph) * r;
    }, 4, 1);
    var strapMat = cloth('#b8211f', 'twill', { ns: 0.4, sheen: 0.06 });
    g.add(mesh(strap, strapMat));
    var buckle = mesh(new THREE.BoxGeometry(0.06, 0.056, 0.008), new THREE.MeshStandardMaterial({ color: lin('#b5b5b5'), metalness: 1, roughness: 0.35 }));
    buckle.position.set(RX * Math.sin(PI + 0.1) * 1.03, 0.06, RZ * Math.cos(PI + 0.1) * 1.03); buckle.rotation.y = PI + 0.1 * 0.9; g.add(buckle);
    // the brim: a curved bill with a rounded edge and rows of stitching
    var PHM = 1.22, LB = 0.42, TH = 0.016;
    function brimTop(w, s, p) {
      var ph = w * PHM, sn = Math.sin(ph), cs = Math.cos(ph);
      var ix = RX * sn * 1.005, iz = RZ * cs * 1.005, nx = sn / RX, nz = cs / RZ, nl = Math.sqrt(nx * nx + nz * nz);
      var L = LB * Math.pow(Math.max(0, (cs - Math.cos(PHM)) / (1 - Math.cos(PHM))), 0.65);
      var x = ix + nx / nl * L * s, z = iz + nz / nl * L * s;
      p[0] = x; p[2] = z; p[1] = 0.012 - 0.75 * x * x * s * s - 0.12 * L * s;
    }
    var q = [0, 0, 0];
    var brim = grid(100, 40, false, function (u, v, p) {
      var w = u * 2 - 1;
      if (v < 0.45) { brimTop(w, v / 0.45, p); }
      else if (v < 0.55) { var a = (v - 0.45) / 0.1 * PI; brimTop(w, 1, p); brimTop(w, 0.98, q);
        var ox = p[0] - q[0], oz = p[2] - q[2], ol = Math.sqrt(ox * ox + oz * oz) || 1;
        p[0] += ox / ol * Math.sin(a) * TH * 0.5; p[2] += oz / ol * Math.sin(a) * TH * 0.5; p[1] -= (1 - Math.cos(a)) * TH * 0.5; }
      else { brimTop(w, (1 - v) / 0.45, p); p[1] -= TH; }
    }, 1, 1);
    orient(brim, function (x, y, z) { return [0, y - 0.004, 0]; });
    // brim map: the top face carries eight rows of stitching following the edge
    var bc = document.createElement('canvas'); bc.width = 1024; bc.height = 512;
    var bg = bc.getContext('2d'); bg.fillStyle = '#fff'; bg.fillRect(0, 0, 1024, 512);
    bg.strokeStyle = 'rgba(0,0,0,.26)'; bg.lineWidth = 2; bg.setLineDash([5, 4]);
    for (var r = 0; r < 8; r++) { var vv = 0.45 * (0.2 + r * 0.1), yy = (1 - vv) * 512; bg.beginPath(); bg.moveTo(0, yy); bg.lineTo(1024, yy); bg.stroke(); }
    bg.setLineDash([]); bg.fillStyle = 'rgba(0,0,0,.1)'; bg.fillRect(0, 0, 1024, 512 * 0.45);   // the underside a shade darker
    var bt = new THREE.CanvasTexture(bc); bt.encoding = THREE.sRGBEncoding; bt.anisotropy = aniso;
    var bmat = cloth('#b8211f', null, { map: bt, rough: 0.88, sheen: 0.08 });
        g.add(mesh(brim, bmat));
    g.userData.printOn = geo;
    g.userData.print = function () { return { cx: 0, top: 0.4, w: 0.27, emb: true }; };
    g.userData.recolor = [mat, strapMat, bmat];
    return g;
  }

  var MAKERS = { tee: makeTee, hoodie: makeHoodie, tote: makeTote, cap: makeCap };
  var FIT = { tee: { h: 1.5, tilt: 0.02 }, hoodie: { h: 1.62, tilt: 0.02 }, tote: { h: 1.52, tilt: 0.04 }, cap: { h: 0.72, tilt: 0.38 } };

  /* contact shadow, drawn once */
  var shc = document.createElement('canvas'); shc.width = 256; shc.height = 256;
  var shg = shc.getContext('2d'), sgr = shg.createRadialGradient(128, 128, 0, 128, 128, 128);
  sgr.addColorStop(0, 'rgba(0,0,0,.34)'); sgr.addColorStop(0.45, 'rgba(0,0,0,.14)'); sgr.addColorStop(1, 'rgba(0,0,0,0)');
  shg.fillStyle = sgr; shg.fillRect(0, 0, 256, 256);
  var shTex = new THREE.CanvasTexture(shc);

  var pivot = new THREE.Group(); scene.add(pivot);
  var built = {}, curItem = 0, curDesign = ITEMS.map(function () { return 0; }), shown = null;

  function setPrint(it, di) {
    var o = built[it.key], d = it.designs[di], g = o.group;
    if (o.decal) { g.remove(o.decal); o.decal.geometry.dispose(); }
    var tex = o.tex[d.print] || (o.tex[d.print] = printTex(d.print, { grain: it.key === 'hoodie' ? 0.25 : 0.5 }));
    g.userData.recolor.forEach(function (m) { m.color.copy(lin(d.color)); });
    if (g.userData.lining) g.userData.lining.color.copy(lin(d.color)).multiplyScalar(0.3);
    if (!tex) return;
    var box = g.userData.print(d), w = box.w, h = w * tex.userData.aspect;
    var geo = decal(g.userData.printOn, box.cx, box.top - h / 2, w, h, box.emb ? 0.004 : 0.0025);
    var m = box.emb ? inkMat(tex, { nmap: o.emb || (o.emb = stitchNormal(tex)), ns: 1, rough: 0.55 }) : inkMat(tex, { rough: it.key === 'hoodie' ? 0.7 : 0.85 });
    o.decal = new THREE.Mesh(geo, m); o.decal.receiveShadow = true; g.add(o.decal);
  }
  function ensure(i) {
    var it = ITEMS[i]; if (built[it.key]) return built[it.key];
    var grp = MAKERS[it.key](), o = { group: grp, tex: {} };
    built[it.key] = o;
    // centre it and scale it to its frame
    var bx = new THREE.Box3().setFromObject(grp), size = bx.getSize(new V3()), ctr = bx.getCenter(new V3()), f = FIT[it.key], k = f.h / size.y;
    var holder = new THREE.Group(); grp.position.set(-ctr.x, -ctr.y, -ctr.z); holder.add(grp); holder.scale.setScalar(k); holder.userData.k = k;
    var sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }));
    sh.rotation.x = -PI / 2; sh.scale.set(size.x * k * 1.05, Math.max(size.z * k * 2.2, 0.5), 1); sh.position.y = -size.y * k / 2 - (it.key === 'cap' ? 0.0 : 0.1);
    o.holder = holder; o.shadow = sh; o.tilt = f.tilt;
    setPrint(it, curDesign[i]);
    return o;
  }

  var yaw = 0, yawV = 0, target = 0, dragging = false, moved = 0, lastX = 0, tiltX = 0, tX = 0;
  var visible = true, raf = 0, lastT = 0, t0 = performance.now(), pend = null, pendAt = 0, swap = null;

  var itemBtns = [].slice.call(root.querySelectorAll('.merch3d-item')), nameEl = root.querySelector('.merch3d-name');
  function label() {
    var it = ITEMS[curItem], d = it.designs[curDesign[curItem]];
    itemBtns.forEach(function (b, k) { b.setAttribute('aria-pressed', k === curItem ? 'true' : 'false'); });
    if (nameEl) nameEl.textContent = d.name + (it.designs.length > 1 ? ' (' + (curDesign[curItem] + 1) + '/' + it.designs.length + ')' : '');
  }
  function show(i) {
    var o = ensure(i);
    if (shown) { pivot.remove(shown.holder); scene.remove(shown.shadow); }
    pivot.add(o.holder); scene.add(o.shadow); shown = o;
  }
  function pickItem(i) {
    i = ((i % ITEMS.length) + ITEMS.length) % ITEMS.length;
    if (i === curItem && !swap) return;
    swap = { from: curItem, to: i, t: 0 }; curItem = i; label(); want();
  }
  function nextDesign() {
    var it = ITEMS[curItem]; if (it.designs.length < 2) { yawV = 7; target = null; want(); return; }
    curDesign[curItem] = (curDesign[curItem] + 1) % it.designs.length; label();
    // turn once; the new design lands while its back is to you
    pend = curItem; pendAt = yaw + PI / 2;
    target = Math.round(yaw / (2 * PI)) * 2 * PI + 2 * PI; yawV = 0; want();
  }
  itemBtns.forEach(function (b, k) { b.addEventListener('click', function () { pickItem(k); }); });

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    var dt = Math.min(40, now - (lastT || now)) / 1000; lastT = now;
    var still = reduce.matches, busy = false;
    if (swap) {
      busy = true; swap.t += dt / (still ? 0.001 : 0.5);
      var tt = Math.min(1, swap.t), o;
      if (tt < 0.5) { o = shown; if (o) { var a = 1 - sstep(0, 0.5, tt); o.holder.scale.setScalar(o.holder.userData.k * (0.6 + 0.4 * a)); } }
      else {
        if (!swap.done) { swap.done = true; show(swap.to); yaw = -PI * 0.5; target = 0; }
        var b2 = sstep(0.5, 1, tt); shown.holder.scale.setScalar(shown.holder.userData.k * (0.6 + 0.4 * b2));
      }
      if (tt >= 1) { swap = null; if (shown) shown.holder.scale.setScalar(shown.holder.userData.k); }
    }
    if (!dragging) {
      if (Math.abs(yawV) > 0.05 && !still) { yaw += yawV * dt; yawV *= Math.exp(-dt * 2.2); busy = true; target = null; }
      else {
        if (target === null) target = Math.round(yaw / (2 * PI)) * 2 * PI;
        var idle = still ? 0 : Math.sin((now - t0) / 3400) * 0.3;
        yawV = 0; var goal = target + idle;
        yaw += (goal - yaw) * (1 - Math.exp(-dt * (still ? 60 : 3.5))); if (Math.abs(goal - yaw) > 0.002 || !still) busy = true;
      }
    } else busy = true;
    if (pend !== null && (yaw >= pendAt || still)) { var it = ITEMS[pend]; if (built[it.key]) setPrint(it, curDesign[pend]); pend = null; }
    tiltX += (tX - tiltX) * (1 - Math.exp(-dt * 8));
    pivot.rotation.set((shown ? shown.tilt : 0) + tiltX, yaw, 0);
    pivot.position.y = still ? 0 : Math.sin((now - t0) / 2100) * 0.01;
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
    if (!dragging) { if (e.pointerType === 'mouse') { tX = ((e.clientY - r.top) / r.height - 0.5) * 0.1; want(); } return; }
    var dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
    yaw += dx * 0.011; yawV = dx * 0.011 * 60; want();
  });
  function up() {
    if (!dragging) return; dragging = false; stage.classList.remove('is-dragging');
    if (moved < 6) nextDesign(); else if (Math.abs(yawV) < 0.05) target = null;
    want();
  }
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('pointerleave', function () { tX = 0; want(); });
  root.addEventListener('keydown', function (e) {
    var arrow = e.key === 'ArrowLeft' || e.key === 'ArrowRight';
    if (!arrow && !(e.target === stage && (e.key === ' ' || e.key === 'Enter'))) return;
    e.preventDefault(); e.stopPropagation();
    if (arrow) pickItem(curItem + (e.key === 'ArrowLeft' ? -1 : 1)); else nextDesign();
  });

  function size() {
    var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h); camera.aspect = w / h;
    var f = Math.tan(camera.fov * PI / 360), needH = 1.95, needW = 1.9;
    var d = Math.max(needH / 2 / f, needW / 2 / (camera.aspect * f));
    camera.position.set(0, d * 0.12, d); camera.lookAt(0, -0.02, 0); camera.updateProjectionMatrix(); want();
  }
  window.addEventListener('resize', size);
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) want(); }).observe(stage);
  document.addEventListener('visibilitychange', want);
  if (reduce.addEventListener) reduce.addEventListener('change', want);

  var keys = Object.keys(PRINTS);
  Promise.all(keys.map(function (k) { return imgLoad(base + PRINTS[k]).then(function (i) { ART[k] = i; }); })).then(function () {
    show(0);
    label(); host.appendChild(renderer.domElement); size();
    root.classList.add('is-live'); stage.classList.add('is-live'); want();
    // build the rest while nothing else is happening, so switching is instant
    var rest = [1, 2, 3], idle = window.requestIdleCallback || function (f) { return setTimeout(f, 200); };
    (function next() { if (!rest.length) return; idle(function () { ensure(rest.shift()); next(); }); })();
  });
}

DCThree.lazy(stage, function (THREE) {
  if (!THREE) { root.classList.add('is-flat'); return; }
  build(THREE);
});
})();
