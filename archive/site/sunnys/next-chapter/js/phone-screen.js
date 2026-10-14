// The live phone screen: the Sunny's profile grid scrolling, then a story. Drawn to a canvas texture.
const W = 600, H = 1298;                                  // 1170 × 2532 slot, half resolution
const C = { bg: '#FBF8F1', ink: '#1B2A23', dim: '#6E746C', green: '#1E3A2F', vellum: '#F2EBDC', linen: '#E3D7BD', line: '#E4DED0' };
const POSTS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const ORDER = ['01', '04', '02', '05', '07', '03', '09', '06', '08', '11', '10', '12', '04', '07', '01', '05', '09', '02'];

const img = (src) => new Promise((res) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

export class PhoneScreen {
  constructor(base) {
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d'); this.dirty = true; this.last = -1;
    this.ready = (async () => {
      const [tiles, story, seal] = await Promise.all([
        Promise.all(POSTS.map((n) => img(`${base}assets/social/post-${n}-sm.webp`))),
        img(`${base}assets/social/story-01.webp`),
        img(`${base}assets/svg/seal-vellum.svg`),
      ]);
      this.tiles = Object.fromEntries(POSTS.map((n, i) => [n, tiles[i]])); this.story = story; this.seal = seal;
      try { await Promise.all(['500 30px Jost', '400 30px Jost', '400 30px "EB Garamond"', 'italic 400 30px "EB Garamond"'].map((f) => document.fonts.load(f))); } catch {}
      this.draw(0, true);
    })();
  }

  avatar(x, y, r) {
    const c = this.ctx; c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = C.green; c.fill(); c.clip();
    if (this.seal) { const s = r * 1.62; c.drawImage(this.seal, x - s / 2, y - s / 2, s, s); }
    c.restore();
  }

  cover(im, x, y, w, h) {                                   // object-fit: cover
    if (!im) { this.ctx.fillStyle = C.linen; this.ctx.fillRect(x, y, w, h); return; }
    const r = Math.max(w / im.width, h / im.height), sw = w / r, sh = h / r;
    this.ctx.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h);
  }

  draw(t, force) {                                          // t: 0..1 through the phone's moment
    if (!this.tiles) return;
    const q = Math.round(t * 400) / 400; if (!force && q === this.last) return; this.last = q; this.dirty = true;
    const c = this.ctx, gridT = Math.min(1, t / 0.66), storyT = Math.max(0, (t - 0.7) / 0.3);
    const tw = (W - 4) / 3, th = tw * 4 / 3, gridTop = 476, rows = Math.ceil(ORDER.length / 3);
    const maxScroll = gridTop + rows * (th + 2) - H + 40;
    const ease = gridT * gridT * (3 - 2 * gridT), sy = -ease * maxScroll;

    c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    c.save(); c.translate(0, sy);
    // header
    c.fillStyle = C.ink; c.font = '500 29px Jost'; c.textBaseline = 'alphabetic'; c.fillText('sunnysbookshop', 34, 132);
    this.avatar(96, 242, 64);
    c.font = '400 31px "EB Garamond"'; c.fillText("Sunny's Bookshop", 188, 224);
    c.font = 'italic 400 24px "EB Garamond"'; c.fillStyle = C.dim;
    c.fillText('For readers and writers.', 188, 258); c.fillText('Tarzana · NoHo in 2027', 188, 288);
    const by = 346, bw = (W - 68 - 14) / 2;
    c.fillStyle = C.green; this.round(34, by, bw, 54, 12); c.fill();
    c.fillStyle = C.linen; this.round(34 + bw + 14, by, bw, 54, 12); c.fill();
    c.font = '500 22px Jost'; c.textAlign = 'center';
    c.fillStyle = C.vellum; c.fillText('Follow', 34 + bw / 2, by + 35);
    c.fillStyle = C.ink; c.fillText('Visit', 34 + bw * 1.5 + 14, by + 35); c.textAlign = 'left';
    c.fillStyle = C.line; c.fillRect(0, 446, W, 2); c.fillStyle = C.ink; c.fillRect(W / 6 - 30, 444, 60, 4);
    // grid, 3:4 tiles
    ORDER.forEach((n, i) => { const x = (i % 3) * (tw + 2), y = gridTop + Math.floor(i / 3) * (th + 2); this.cover(this.tiles[n], x, y, tw, th); });
    c.restore();
    // status bar on top
    c.fillStyle = C.bg; c.fillRect(0, 0, W, 78);
    c.fillStyle = C.ink; c.font = '500 25px Jost'; c.fillText('9:41', 54, 56);
    this.round(W - 92, 36, 46, 22, 6); c.lineWidth = 2; c.strokeStyle = C.ink; c.stroke(); c.fillRect(W - 88, 40, 32, 14);

    // the story slides up over the grid
    if (storyT > 0) {
      const e = 1 - Math.pow(1 - Math.min(1, storyT * 2.2), 3);
      c.save(); c.translate(0, (1 - e) * H);
      this.cover(this.story, 0, 0, W, H);
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, 0, W, 150);
      const seg = (W - 48 - 12) / 3;
      for (let k = 0; k < 3; k++) {
        c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(24 + k * (seg + 6), 70, seg, 4);
        const f = k === 0 ? Math.min(1, storyT * 1.4) : 0; c.fillStyle = '#fff'; c.fillRect(24 + k * (seg + 6), 70, seg * f, 4);
      }
      this.avatar(56, 116, 22); c.fillStyle = '#fff'; c.font = '500 22px Jost'; c.fillText('sunnysbookshop', 90, 124);
      c.restore();
    }
  }

  round(x, y, w, h, r) { const c = this.ctx; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
}
