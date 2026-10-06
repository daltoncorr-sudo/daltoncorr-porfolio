// Floating 3D objects (NC-A models). One small renderer per object; rendered only on demand.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { PhoneScreen } from './phone-screen.js';
import { LaptopScreen } from './laptop-screen.js';

const BASE = new URL('../', import.meta.url).href;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// Draco: WebAssembly where the page allows it, the plain JS decoder otherwise.
function wasmOK() {
  try { return typeof WebAssembly === 'object' && !!new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])); }
  catch { return false; }
}
let draco;
function loaders() {
  if (!draco) {
    draco = new DRACOLoader();
    draco.setDecoderPath(BASE + 'vendor/three/draco/');
    draco.setDecoderConfig({ type: wasmOK() ? 'wasm' : 'js' });
    draco.setWorkerLimit(2);
  }
  const g = new GLTFLoader(); g.setDRACOLoader(draco);
  // Embedded textures load as plain images. three's default (ImageBitmapLoader) fetches blob: URLs, which a strict
  // Content-Security-Policy (the private preview's) refuses, leaving the models untextured white.
  g.register((parser) => { const tl = new THREE.TextureLoader(parser.options.manager); tl.setCrossOrigin(parser.options.crossOrigin || 'anonymous'); parser.textureLoader = tl; return { name: 'NC_image_textures' }; });
  return g;
}
// Binary files: fetched directly on the site; in the private preview (which serves no .glb/.hdr)
// they ride along as base64 modules next to the originals.
const PACKED = !!document.querySelector('meta[name="nc-packed"]');
async function bin(path) {
  if (PACKED) {
    const m = await import(BASE + path + '.js'); const s = atob(m.default); const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer;
  }
  const r = await fetch(BASE + path); if (!r.ok) throw new Error(path + ' ' + r.status); return r.arrayBuffer();
}
let hdrData;
function hdr() {
  return hdrData ||= bin('models/studio_small_09_512.hdr').then((buf) => {
    const d = new RGBELoader().parse(buf);
    const t = new THREE.DataTexture(d.data, d.width, d.height, THREE.RGBAFormat, d.type);
    t.colorSpace = THREE.LinearSRGBColorSpace; t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.flipY = true; t.needsUpdate = true;
    return t;
  });
}

// Presentation and scroll curves, p = 0 when the object enters the viewport, 1 when it leaves.
const POSES = {
  seal: {
    file: 'SB-NC-seal.glb', fov: 26, fit: 1.02,
    rest(o) { o.tilt.rotation.x = 1.18; },
    pose(o, p) {
      o.pivot.rotation.y = lerp(-0.95, 0.95, p);          // the slow turn
      o.pivot.rotation.z = lerp(0.10, -0.06, p);
      o.model.rotation.y = lerp(-0.5, 0.7, p);            // the seal turning about its own face
    },
  },
  phone: {
    file: 'SB-NC-phone.glb', fov: 24, fit: 0.74,
    rest(o) { o.tilt.rotation.x = Math.PI / 2 - 0.14; },
    pose(o, p) {
      o.pivot.rotation.y = lerp(-0.52, 0.16, p);
      o.pivot.rotation.z = lerp(0.10, 0.04, p);
      if (o.screen) o.screen.draw(smooth(0.18, 0.86, p));
    },
  },
  magazine: {
    file: 'SB-NC-magazine.glb', fov: 26, fit: 0.86,
    rest(o) { o.tilt.rotation.x = 0.98; },
    pose(o, p) {
      o.pivot.rotation.y = lerp(0.42, -0.28, p);
      o.pivot.rotation.z = lerp(-0.05, 0.04, p);
      const f = smooth(0.2, 0.8, p);                      // cover lifts; the top dozen pages fan under it
      if (o.cover) o.cover.rotation.z = f * 0.42;
      const n = o.pages.length, fan = 12;
      o.pages.forEach((pg, i) => { const k = n - 1 - i; pg.rotation.z = k < fan ? f * 0.36 * (1 - k / fan) : 0; });
    },
  },
  laptop: {
    file: 'SB-NC-laptop.glb', fov: 24, fit: 0.78,
    rest(o) { o.tilt.rotation.x = 0.30; if (o.lid) o.lid.rotation.x = 0.35; },
    pose(o, p) {
      o.pivot.rotation.y = lerp(-0.46, 0.30, p);
      o.pivot.rotation.z = lerp(0.03, -0.02, p);
      if (o.lid) o.lid.rotation.x = lerp(0.95, 0.35, smooth(0.0, 0.42, p));   // the lid lifts to half open, 70°
      if (o.screen) o.screen.draw(smooth(0.22, 0.92, p));
    },
  },
  tote: {
    file: 'SB-NC-tote.glb', fov: 26, fit: 0.72,
    rest(o) { o.tilt.rotation.x = 0.08; },
    pose(o, p) {
      o.pivot.rotation.y = lerp(-0.62, 0.44, p);
      // a sway about the straps, where a hand would hold it; it settles as it lands
      if (o.root) { o.root.rotation.z = Math.sin(p * Math.PI * 2.2) * 0.06 * (1 - 0.6 * p); o.root.rotation.x = Math.sin(p * Math.PI * 1.4 + 0.6) * 0.035; }
    },
  },
  sign: {
    file: 'SB-NC-sign.glb', fov: 26, fit: 0.9,
    rest(o) { o.tilt.rotation.x = 0.10; },
    pose(o, p) {
      o.pivot.rotation.y = lerp(-0.70, -0.12, p);
      // swinging gently from its bracket, the swing dying away
      if (o.swing) o.swing.rotation.x = Math.sin(p * Math.PI * 3.2) * 0.16 * (1 - 0.55 * p);
    },
  },
};

export class FloatObject {
  constructor(el, kind, { transparentBg = true, pixelRatio } = {}) {
    this.el = el; this.kind = kind; this.cfg = POSES[kind]; this.p = -1; this.ready = false;
    const canvas = document.createElement('canvas');
    el.appendChild(canvas); this.canvas = canvas;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: transparentBg, preserveDrawingBuffer: !!pixelRatio, powerPreference: 'high-performance' });
    r.setPixelRatio(pixelRatio || Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.setClearColor(0x000000, 0);
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.cfg.fov, 1, 0.001, 100);
    const key = new THREE.DirectionalLight(0xfff4e6, 1.1); key.position.set(-1.2, 2, 2.4); this.scene.add(key);
    this.pivot = new THREE.Group(); this.tilt = new THREE.Group(); this.pivot.add(this.tilt); this.scene.add(this.pivot);
  }

  async load() {
    const [gltf, env] = await Promise.all([bin('models/' + this.cfg.file).then((b) => loaders().parseAsync(b, BASE + 'models/')), hdr()]);
    const pm = new THREE.PMREMGenerator(this.renderer);
    const tex = env.clone(); tex.mapping = THREE.EquirectangularReflectionMapping; tex.needsUpdate = true;
    this.scene.environment = pm.fromEquirectangular(tex).texture; pm.dispose();
    this.scene.environmentIntensity = 1.0;

    const root = gltf.scene;
    const box = new THREE.Box3().setFromObject(root); const c = box.getCenter(new THREE.Vector3());
    this.model = new THREE.Group(); root.position.sub(c); this.model.add(root); this.tilt.add(this.model);
    this.root = root;
    this.cover = root.getObjectByName('FrontCover');
    this.lid = root.getObjectByName('LidHinge');
    this.swing = root.getObjectByName('SignPivot');
    this.pages = []; for (let i = 0; i < 30; i++) { const pg = root.getObjectByName('Page' + String(i).padStart(2, '0')); if (pg) this.pages.push(pg); }
    if (this.kind === 'phone') {
      const scr = root.getObjectByName('Screen');
      if (scr) {
        this.screen = new PhoneScreen(BASE);
        await this.screen.ready;
        const t = new THREE.CanvasTexture(this.screen.canvas);
        t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        this.screen.texture = t;
        scr.traverse((m) => { if (m.isMesh) { const mat = m.material; mat.map = t; mat.emissiveMap = t; mat.emissive = new THREE.Color(0xffffff); mat.emissiveIntensity = 0.92; mat.toneMapped = false; mat.needsUpdate = true; } });
      }
    }
    if (this.kind === 'magazine') {                         // the autumn cover on the printed magazine
      const slot = []; root.traverse((m) => { if (m.isMesh && m.material?.name === 'CoverSlot') slot.push(m); });
      if (slot.length) {
        const t = await new THREE.TextureLoader().loadAsync(BASE + 'assets/img/cover-autumn-tex.webp');
        t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        slot.forEach((m) => { m.material.map = t; m.material.needsUpdate = true; });
      }
    }
    if (this.kind === 'laptop') {
      const scr = root.getObjectByName('Screen');
      if (scr) {
        this.screen = new LaptopScreen(BASE);
        await this.screen.ready;
        const t = new THREE.CanvasTexture(this.screen.canvas);
        t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        this.screen.texture = t;
        scr.traverse((m) => { if (m.isMesh) { const mat = m.material; mat.map = t; mat.emissiveMap = t; mat.emissive = new THREE.Color(0xffffff); mat.emissiveIntensity = 0.9; mat.toneMapped = false; mat.needsUpdate = true; } });
      }
    }
    this.cfg.rest(this);
    // fit the camera to the object's bounding sphere so a full turn never clips
    const s = new THREE.Box3().setFromObject(this.pivot).getBoundingSphere(new THREE.Sphere());
    const d = (s.radius / Math.sin(THREE.MathUtils.degToRad(this.cfg.fov / 2))) * this.cfg.fit;
    this.camera.position.set(0, 0, d); this.camera.near = d / 50; this.camera.far = d * 10; this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.ready = true; this.resize(); this.update(0, true);
    return this;
  }

  resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
    // keep the sphere inside the narrower side
    const fovH = this.cfg.fov;
    this.camera.fov = w < h ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fovH / 2)) / (w / h))) : fovH;
    this.camera.updateProjectionMatrix(); this.p = -1;
  }

  update(p, force) {
    if (!this.ready) return;
    if (!force && Math.abs(p - this.p) < 0.0008) return;
    this.p = p; this.cfg.pose(this, p);
    if (this.screen?.dirty) { this.screen.texture.needsUpdate = true; this.screen.dirty = false; }
    this.renderer.render(this.scene, this.camera);
  }
}
