// The laptop's live screen: sunnysbookshop.com, redesigned — the Home page scrolling under a quiet browser bar.
// Drawn to a canvas texture (2560 × 1600 slot at half resolution).
const W = 1280, H = 800, BAR = 46;
const img = (src) => new Promise((res) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

export class LaptopScreen {
  constructor(base) {
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d'); this.dirty = true; this.last = -1;
    this.ready = (async () => {
      this.page = await img(`${base}assets/web/home-desktop.webp`);
      try { await document.fonts.load('400 20px Jost'); } catch {}
      this.draw(0, true);
    })();
  }

  draw(t, force) {
    const q = Math.round(t * 600) / 600; if (!force && q === this.last) return; this.last = q; this.dirty = true;
    const c = this.ctx;
    c.fillStyle = '#F2EBDC'; c.fillRect(0, 0, W, H);
    if (this.page) {
      const s = W / this.page.width, ph = this.page.height * s, view = H - BAR;
      const e = t * t * (3 - 2 * t), y = -e * Math.max(0, ph - view);
      c.drawImage(this.page, 0, BAR + y, W, ph);
    }
    // browser bar
    c.fillStyle = '#E9E2D2'; c.fillRect(0, 0, W, BAR);
    c.fillStyle = '#D6CDB9'; c.fillRect(0, BAR - 1, W, 1);
    ['#CDBFA6', '#CDBFA6', '#CDBFA6'].forEach((col, i) => { c.beginPath(); c.arc(26 + i * 20, BAR / 2, 6, 0, Math.PI * 2); c.fillStyle = col; c.fill(); });
    const pw = 360, px = (W - pw) / 2;
    c.fillStyle = '#F7F2E7'; this.round(px, 10, pw, BAR - 20, 8); c.fill();
    c.fillStyle = '#4A5650'; c.font = '400 15px Jost, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('sunnysbookshop.com', W / 2, BAR / 2 + 1); c.textAlign = 'left';
  }

  round(x, y, w, h, r) { const c = this.ctx; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
}
