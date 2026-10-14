// The Next Chapter — scroll engine. Native scroll; one rAF pass per frame when something moved.
// Plates drift at 0.6–0.8× scroll speed; floating objects at 1.1–1.2× so they cross the divide.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const band01 = (x, a, b) => clamp01((x - a) / (b - a));

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = () => innerWidth < 700;
const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const mode = reduced ? 'still' : (narrow() || !webgl) ? 'turn' : 'gl';   // fixed at load; a reload picks up a new width
document.documentElement.dataset.mode = mode;

let vw = innerWidth, vh = innerHeight, sy = scrollY;
const page = $('#page');
const secs = $$('.sec');
const S = Object.fromEntries(secs.map((s) => [s.id, { el: s, top: 0, h: 0, speed: +s.dataset.plate || 0.7, plates: $$('.plate', s) }]));

// ---------- 2 · the band of posts ----------
const track = $('#band-track');
const POSTS = [['01', 'The reveal'], ['02', 'The system'], ['03', 'Process'], ['reel', 'Reel'], ['04', 'The seal'], ['05', 'An evening of short fiction'],
  ['07', 'New arrivals'], ['06', 'In conversation'], ['09', 'Journal & Press'], ['08', 'New arrivals'], ['10', 'Staff picks'], ['11', 'NoHo, 2027'], ['12', 'Come in, sit down, read.']];
for (const [n, alt] of POSTS) {
  const d = document.createElement('div'); d.className = 'post' + (n === 'reel' ? ' reel' : '');
  if (n === 'reel') {
    d.innerHTML = '<video muted loop playsinline preload="none" poster="assets/social/reel-poster.jpg" aria-label="Reel: the signature, written"><source src="assets/social/reel.mp4" type="video/mp4"></video>';
  } else {
    d.innerHTML = `<img src="assets/social/post-${n}.webp" alt="Post: ${alt}" loading="lazy" decoding="async" width="720" height="900">`;
  }
  track.appendChild(d);
}
const reel = $('video', track);
const mailTrack = $('#mail-track'), mailBand = $('#band-mail');
new IntersectionObserver(([e]) => { if (!reel) return; if (e.isIntersecting && !reduced) { reel.play().catch(() => {}); } else reel.pause(); }, { threshold: 0.2 }).observe($('#band'));

// ---------- 1 · the drawing, scrubbed from the timelapse ----------
const cv = $('#drawing-canvas'), cx = cv.getContext('2d');
const finalImg = $('#drawing-final'), sig = $('#signature'), cue = $('#cue');
const frames = []; let seqN = 96, shown = -1;
fetch('assets/seq/seq.json').then((r) => r.json()).then((j) => {
  seqN = j.frames; const b = j.frameInk;                 // place the vector mark exactly over the drawing's last frame
  Object.assign(finalImg.style, { left: b[0] * 100 + '%', top: b[1] * 100 + '%', width: (b[2] - b[0]) * 100 + '%', height: (b[3] - b[1]) * 100 + '%' });
  if (reduced) return;
  const load = (i) => new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => { frames[i] = im; res(); }; im.onerror = res; im.src = `assets/seq/d${String(i).padStart(3, '0')}.webp`; });
  // coarse pass first so any scroll position has a frame, then fill in
  const coarse = []; for (let i = 0; i < seqN; i += 8) coarse.push(i); coarse.push(seqN - 1);
  Promise.all(coarse.map(load)).then(() => { shown = -1; tick(true);
    // the in-between frames wait for the first scroll: a visitor who never scrolls never pays for them
    const fill = () => { const rest = []; for (let i = 0; i < seqN; i++) if (!frames[i]) rest.push(i);
      (async () => { for (let k = 0; k < rest.length; k += 6) await Promise.all(rest.slice(k, k + 6).map(load)); })(); };
    addEventListener('scroll', fill, { once: true, passive: true }); });
});
function drawFrame(i) {
  let k = i; while (k > 0 && !frames[k]) k--; if (!frames[k] || k === shown) return; shown = k;
  cx.clearRect(0, 0, cv.width, cv.height); cx.drawImage(frames[k], 0, 0, cv.width, cv.height);
}

// ---------- depth: covers, page cards and goods drift at slightly different depths ----------
const depthEls = $$('[data-depth]').map((el) => ({ el, inner: el.firstElementChild, d: +el.dataset.depth, mid: 0 }));
// ---------- 5 · the Letter ----------
const letterImg = $('#letter-img'), letterScreen = $('.letter-screen'), readerProg = $('#reader-prog');

// ---------- floating objects ----------
const floats = $$('.float').map((el) => ({ el, kind: el.dataset.model, from: el.dataset.from, to: el.dataset.to, speed: +el.dataset.speed, overlap: +el.dataset.overlap, obj: null, turn: null, w: 0, h: 0, x: 0.5, base: 0, divide: 0 }));
function sizeFloat(f) {
  const n = narrow();
  if (f.kind === 'seal') { f.w = f.h = n ? Math.min(vw * 0.7, 340) : Math.min(Math.max(vw * 0.34, 280), 480); f.x = 0.5; }
  if (f.kind === 'phone') { f.h = n ? Math.min(vh * 0.66, 560) : Math.min(vh * 0.86, 780); f.w = f.h * 0.62; f.x = n ? 0.5 : 0.5; }
  if (f.kind === 'magazine') { f.w = n ? vw * 0.9 : Math.min(vw * 0.46, 600); f.h = f.w * 0.84; f.x = n ? 0.5 : 0.3; }
  if (f.kind === 'laptop') { f.w = n ? vw * 0.96 : Math.min(Math.max(vw * 0.6, 560), 960); f.h = f.w * 0.737; f.x = 0.5; }
  if (f.kind === 'tote') { f.h = n ? Math.min(vh * 0.66, 580) : Math.min(vh * 1.02, 900); f.w = f.h * 0.667; f.x = n ? 0.5 : 0.66; }
  if (f.kind === 'sign') { f.w = n ? Math.min(vw * 0.94, 440) : Math.min(Math.max(vw * 0.44, 420), 680); f.h = f.w * 0.933; f.x = n ? 0.5 : 0.42; }
  if (f.el.id === 'float-seal-end') { f.w = f.h = n ? Math.min(vw * 0.56, 260) : Math.min(Math.max(vw * 0.24, 240), 360); f.x = 0.5; }
  f.el.style.setProperty('--w', f.w + 'px'); f.el.style.setProperty('--h', f.h + 'px');
}
const turnFrames = 24;
function setupTurn(f) {                                    // phones / no WebGL: the same motion as a frame sequence
  const im = $('.still', f.el); f.turn = { im, n: turnFrames, cur: -1, cache: [] };
  const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) return; io.disconnect();   // warm the cache so swaps never flash
    for (let i = 0; i < turnFrames; i++) { const p = new Image(); p.src = `assets/turn/${f.kind}-${String(i).padStart(2, '0')}.webp`; f.turn.cache.push(p); } }, { rootMargin: '150% 0px' });
  io.observe(f.el);
  if (f.kind === 'phone') return;                           // the phone's still is frame 0 already
  im.src = `assets/turn/${f.kind}-00.webp`;
}
async function setupGL(f) {
  try {
    const { FloatObject } = await import('./objects.js');
    f.obj = await new FloatObject(f.el, f.kind).load();
    f.el.classList.remove('is-lite'); tick(true);
  } catch (err) { f.el.classList.add('is-lite'); setupTurn(f); }
}
floats.forEach((f) => {
  f.el.classList.add('is-lite');
  if (mode === 'still') return;
  if (mode === 'turn') { setupTurn(f); return; }
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); setupGL(f); } }, { rootMargin: '120% 0px' });
  io.observe(f.el);
});

// ---------- layout ----------
function layout() {
  vw = document.documentElement.clientWidth; vh = innerHeight;
  floats.forEach(sizeFloat);
  for (const f of floats) {
    // the section it leaves keeps clear space under the object; the one it enters, above
    const below = f.h * (1 - f.overlap), above = f.h * f.overlap;
    if (f.from === 'chapter') S.chapter.el.style.paddingBottom = (below + vh * 0.06) + 'px';
    else if (f.kind === 'magazine') $('#mag-room').style.setProperty('--mag-room', (below + 40) + 'px');
    else { const r = $(`.room[data-for="${f.el.id}"]`, S[f.from].el); if (r) r.style.height = (below + vh * (narrow() ? 0.06 : 0.1)) + 'px'; }
    S[f.to].el.style.setProperty('--top-room', Math.max(above + vh * (narrow() ? 0.1 : 0.14), 120) + 'px');
  }
  const pageTop = page.getBoundingClientRect().top + scrollY;
  for (const s of Object.values(S)) { const r = s.el.getBoundingClientRect(); s.top = r.top + scrollY - pageTop; s.h = r.height; }
  for (const f of floats) {
    f.divide = S[f.to].top;
    f.base = f.divide - f.h * (1 - f.overlap);
    f.left = f.x * page.clientWidth - f.w / 2;
    f.el.style.left = f.left + 'px'; f.el.style.top = f.base + 'px';
    f.obj?.resize();
  }
  document.documentElement.classList.add('laid');
  bandMax = Math.max(0, track.scrollWidth - vw * 0.92);
  mailMax = Math.max(0, mailTrack.scrollWidth - vw * 0.92);
  chapterRun = S.chapter.el.clientHeight - parseFloat(getComputedStyle(S.chapter.el).paddingBottom) - vh;
  letterMax = letterImg.offsetHeight - letterScreen.clientHeight;
  for (const o of depthEls) { o.inner.style.transform = ''; const r = o.el.getBoundingClientRect(); o.mid = r.top + scrollY + r.height / 2; }
  cmpLayout();
  tick(true);
}
let bandMax = 0, mailMax = 0, letterMax = 0, chapterRun = 1;

// ---------- per-frame ----------
let queued = false;
function tick(force) {
  if (queued && !force) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; frame(); });
}
function frame() {
  sy = scrollY;
  const moving = mode !== 'still';
  // plates: offset by (1 - speed) of the scroll, wrapped to one 512 px tile so the layer never runs out
  if (moving) for (const s of Object.values(S)) {
    if (sy + vh < s.top || sy > s.top + s.h) continue;
    const off = (sy - s.top) * (1 - s.speed), t = ((off % 512) + 512) % 512;
    for (const pl of s.plates) pl.style.transform = `translate3d(0,${t.toFixed(1)}px,0)`;
  }
  // 1 · drawing scrub across the sticky stage
  if (!reduced) {
    const c = S.chapter, run = chapterRun;
    const p = clamp01((sy - c.top) / Math.max(run, 1));
    const dp = band01(p, 0, 0.7);
    drawFrame(Math.round(lerp(6, seqN - 1, dp)));
    const fx = band01(p, 0.7, 0.8);
    cv.style.opacity = (1 - fx).toFixed(3); finalImg.style.opacity = fx.toFixed(3);
    const sp = band01(p, 0.78, 0.94);
    sig.style.opacity = Math.min(1, sp * 3).toFixed(3); sig.style.clipPath = `inset(0 ${((1 - sp) * 100).toFixed(2)}% 0 0)`;
    cue.style.opacity = p > 0.015 ? 0 : 1;
  }
  if (moving) {
    // 2 · band drifts sideways
    const b = S.social, band = $('#band');
    const br = band.offsetTop + b.top;
    const q = band01(sy, br - vh, br + band.offsetHeight + vh * 0.25);
    track.style.transform = `translate3d(${(-q * bandMax).toFixed(1)}px,0,0)`;
    // the newsletters drift the other way
    const mr = mailBand.offsetTop + b.top, mq = band01(sy, mr - vh, mr + mailBand.offsetHeight + vh * 0.25);
    mailTrack.style.transform = `translate3d(${(-(1 - mq) * mailMax).toFixed(1)}px,0,0)`;
    // 5 · covers drift at slightly different depths; the Letter scrolls in its phone
    const j = S.journal;
    for (const o of depthEls) { if (!o.d) continue; const off = o.mid - (sy + vh / 2); if (Math.abs(off) > vh * 1.5) continue; o.inner.style.transform = `translate3d(0,${(off * o.d).toFixed(1)}px,0)`; }
    const lr = letterScreen.getBoundingClientRect();
    const lq = band01(vh - lr.top, vh * 0.15, vh + lr.height * 0.35);
    letterImg.style.transform = `translate3d(0,${(-lq * letterMax).toFixed(1)}px,0)`;
    readerProg.style.width = (lq * 100).toFixed(1) + '%';
    cmpScroll();
    // floating objects: 1.1–1.2× scroll, crossing their divide
    for (const f of floats) {
      const ty = -(f.speed - 1) * (sy + vh / 2 - f.divide);
      f.el.style.transform = `translate3d(0,${ty.toFixed(1)}px,0)`;
      const top = f.base + ty, p = clamp01((sy + vh - top) / (vh + f.h));
      if (sy + vh < top - 200 || sy > top + f.h + 200) continue;
      if (f.obj) f.obj.update(p);
      else if (f.turn) {
        const k = Math.round(p * (f.turn.n - 1));
        if (k !== f.turn.cur) { f.turn.cur = k; f.turn.im.src = `assets/turn/${f.kind}-${String(k).padStart(2, '0')}.webp`; }
      }
    }
  }
}

// ---------- 3 · the website phones: the Home page scrolling on its own, played only while seen ----------
for (const v of $$('.page-phone video, .lap-phone video')) {
  if (reduced) continue;                                    // reduced motion: the poster, at rest
  new IntersectionObserver(([e]) => { if (e.isIntersecting) { if (v.preload !== 'auto') { v.preload = 'auto'; } v.play().catch(() => {}); } else v.pause(); }, { threshold: 0.15 }).observe(v);
}

// ---------- 6 · two flavors: a draggable divider between the Tarzana and NoHo windows ----------
const cmp = $('#compare'), cmpTop = $('.cmp-top', cmp), cmpHandle = $('.cmp-handle', cmp), cmpRange = $('#cmp-range');
let cmpPos = 0.5, cmpTouched = false, cmpRect = null;
function cmpSet(v) {
  cmpPos = Math.min(0.98, Math.max(0.02, v));
  const pc = (cmpPos * 100).toFixed(2) + '%';
  cmpTop.style.clipPath = `inset(0 calc(100% - ${pc}) 0 0)`; cmpHandle.style.left = pc;
  cmpRange.value = Math.round(cmpPos * 100);
}
function cmpLayout() { const r = cmp.getBoundingClientRect(); cmpRect = { top: r.top + scrollY, h: r.height }; }
const cmpFromX = (x) => { const r = cmp.getBoundingClientRect(); return (x - r.left) / r.width; };
let dragging = false;
cmp.addEventListener('pointerdown', (e) => { dragging = true; cmpTouched = true; cmp.classList.add('is-drag'); cmp.setPointerCapture?.(e.pointerId); cmpSet(cmpFromX(e.clientX)); });
cmp.addEventListener('pointermove', (e) => { if (dragging) cmpSet(cmpFromX(e.clientX)); });
const cmpEnd = () => { dragging = false; cmp.classList.remove('is-drag'); };
cmp.addEventListener('pointerup', cmpEnd); cmp.addEventListener('pointercancel', cmpEnd); cmp.addEventListener('lostpointercapture', cmpEnd);
cmpRange.addEventListener('input', () => { cmpTouched = true; cmpSet(cmpRange.value / 100); });
cmpSet(0.5);
function cmpScroll() {                                      // until she touches it, the divider follows the scroll, slowly
  if (cmpTouched || reduced || !cmpRect) return;
  const q = band01(sy + vh, cmpRect.top + cmpRect.h * 0.3, cmpRect.top + cmpRect.h + vh * 0.55);
  cmpSet(lerp(0.66, 0.38, q * q * (3 - 2 * q)));
}

// ---------- AR: the sign and the seal, in her own room (phones only; one quiet button each) ----------
const ua = navigator.userAgent;
const isIOS = /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const quickLook = (() => { try { return document.createElement('a').relList.supports('ar'); } catch { return false; } })();
const isAndroid = /Android/i.test(ua);
const phoneLike = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
const AR = { sign: { glb: 'models/SB-NC-sign.glb', usdz: 'models/ar/SB-NC-sign.usdz', alt: 'The hanging SB sign' },
             seal: { glb: 'models/SB-NC-seal.glb', usdz: 'models/ar/SB-NC-seal.usdz', alt: 'The Sunny’s Bookshop wax seal' } };
let mvLoad = null;
const loadMV = () => mvLoad ||= new Promise((res, rej) => { const s = document.createElement('script'); s.type = 'module'; s.src = 'vendor/model-viewer/model-viewer.min.js'; s.onload = () => customElements.whenDefined('model-viewer').then(res); s.onerror = rej; document.head.appendChild(s); });
const packed = !!document.querySelector('meta[name="nc-packed"]');   // the private preview carries no AR files
if (!packed && phoneLike && ((isIOS && quickLook) || isAndroid)) {
  for (const box of $$('.ar')) {
    const k = box.dataset.ar, m = AR[k]; box.hidden = false;
    const mv = document.createElement('model-viewer');
    Object.entries({ src: m.glb, 'ios-src': m.usdz, ar: '', 'ar-modes': 'quick-look scene-viewer', 'ar-scale': 'fixed', alt: m.alt, loading: 'lazy', reveal: 'manual' })
      .forEach(([a, v]) => mv.setAttribute(a, v));
    mv.className = 'ar-mv'; box.appendChild(mv);
    new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); loadMV().catch(() => {}); } }, { rootMargin: '150% 0px' }).observe(box);
    $('.ar-btn', box).addEventListener('click', () => {
      if (customElements.get('model-viewer')) { mv.activateAR(); return; }
      if (isIOS) { const a = document.createElement('a'); a.rel = 'ar'; a.href = m.usdz; a.appendChild(document.createElement('img')); a.click(); return; }
      loadMV().then(() => mv.activateAR()).catch(() => {});
    });
  }
}

addEventListener('scroll', () => tick(), { passive: true });
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 120); });
document.fonts?.ready.then(layout);
addEventListener('load', layout);
layout();
