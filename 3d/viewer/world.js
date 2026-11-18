import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as FX from './fx.js';
import * as STAGE from './stage.js';

const VIEWS = ['welcome', 'explore', 'about', 'experience', 'projects', 'education'];
const PLACE_VIEWS = ['about', 'experience', 'projects', 'education'];
const PLACES_FALLBACK = {
  about: { at: [0.0, -0.45, 1.6], look: [0.0, -8.0, 2.4], label: 'tea counter' },
  experience: { at: [-2.15, -2.6, 0.9], look: [-2.6, -9.5, 2.2], label: 'chess table' },
  projects: { at: [3.9, -0.4, 1.6], look: [3.2, -8.5, 2.4], label: 'moon cinema' },
  education: { at: [-4.5, -0.3, 1.0], look: [-5.0, -8.5, 2.2], label: "scholar's corner" },
};

function hexToRgb(h) {
  h = String(h || '#222222').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function sprite(drawFn, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  drawFn(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const softTex = () => sprite((g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
const glowTex = () => sprite((g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,200,120,1)'); gr.addColorStop(0.3, 'rgba(255,170,80,.45)'); gr.addColorStop(1, 'rgba(255,140,50,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
const bubbleTex = () => sprite((g, s) => {
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = s * 0.09;
  g.fillStyle = 'rgba(255,255,255,.18)';
  g.beginPath(); g.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(s * 0.38, s * 0.36, s * 0.07, 0, Math.PI * 2); g.fill();
});
const moteTex = () => sprite((g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,245,225,1)'); gr.addColorStop(0.5, 'rgba(255,245,225,.6)'); gr.addColorStop(1, 'rgba(255,245,225,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
}, 32);
const hasProp = (v) => v != null && v !== '';
function fxProps(node, manifest) {
  const u = node.userData || {};
  const all = (manifest && manifest.fx && typeof manifest.fx === 'object') ? manifest.fx : {};
  const m = all[u.name] || all[node.name] || {};
  const pick = (k) => (u[k] != null ? u[k] : m[k]);
  return { color: pick('color'), count: pick('count'), when: pick('when'), size: pick('size'), stage: !!(manifest && manifest.stage) };
}
function countTris(root) {
  let n = 0;
  root.traverse((o) => { if (o.isMesh) { const g = o.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
  return Math.round(n);
}

export function createWorld(canvas, options = {}) {
  return new Promise((resolve, reject) => {
    const opt = options || {};
    const id = opt.id || 'koi';
    let base = (opt.base || '/3d/worlds/').replace(/\/?$/, '/') + id + '/';
    const reduced = !!opt.reducedMotion;
    const params = opt.params instanceof URLSearchParams ? opt.params : new URLSearchParams('');
    let settled = false;
    const fail = (e) => { if (settled) return; settled = true; try { teardown(); } catch {  } reject(e instanceof Error ? e : new Error(String(e))); };

    let renderer;
    try {
      const allowSoft = opt.allowSoftware === true || params.get('soft') === '1';
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, failIfMajorPerformanceCaveat: !allowSoft });
    } catch (e) { reject(new Error('webgl: ' + (e && e.message || e))); return; }
    const gl = renderer.getContext();
    const allowSoftGL = opt.allowSoftware === true || params.get('soft') === '1';
    const softGL = (() => { try { const e = gl.getExtension('WEBGL_debug_renderer_info'); return /SwiftShader|llvmpipe|softpipe|Software/i.test(String(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))); } catch (e) { return false; } })();
    if (!gl || (gl.isContextLost && gl.isContextLost())) { try { renderer.dispose(); } catch {  } reject(new Error('webgl: context lost')); return; }
    let ctxLost = false;
    if (softGL && !allowSoftGL) { try { renderer.dispose(); } catch (e) { void e; } reject(new Error('webgl: software renderer')); return; }
    const onLost = (e) => { e.preventDefault(); if (!ready) { fail(new Error('webgl: context lost')); return; } ctxLost = true; ev('contextLost', {}); };
    const onRestored = () => {
      if (!ctxLost) return;
      const done = () => { if (!ctxLost) return; ctxLost = false; ev('contextRestored', {}); };
      let jobs = null;
      try {
        if (renderer.compileAsync && scene && camera) {
          const rt = stage && stage.water && stage.water.getRenderTarget ? stage.water.getRenderTarget() : null;
          const list = [];
          if (rt) { renderer.setRenderTarget(rt); list.push(renderer.compileAsync(scene, camera)); renderer.setRenderTarget(null); }
          list.push(renderer.compileAsync(scene, camera));
          jobs = Promise.all(list);
        }
      } catch (e) { jobs = null; }
      if (!jobs) { done(); return; }
      const cap = setTimeout(done, 6000);
      jobs.then(() => { clearTimeout(cap); requestAnimationFrame(done); }, () => { clearTimeout(cap); done(); });
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const dprQ = params.get('dpr') !== null && +params.get('dpr') > 0 ? +params.get('dpr') : null;
    const prCap = () => dprQ !== null ? dprQ : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(prCap());
    FX.resetFx();
    const scene = new THREE.Scene();
    const behind = { S: new THREE.Scene(), C: new THREE.Camera(), U: { uBg: { value: new THREE.Vector3(1, 1, 1) } }, t: -1e9, wk: typeof navigator !== 'undefined' && /AppleWebKit/.test(navigator.userAgent) && !/Chrome\/|Chromium\/|Edg\/|OPR\//.test(navigator.userAgent) };
    { const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: behind.U, vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform vec3 uBg; void main() { gl_FragColor = vec4(uBg, 1.0); }',
      depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneMinusDstAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneMinusDstAlphaFactor, blendDstAlpha: THREE.OneFactor })); q.frustumCulled = false; behind.S.add(q); }
    scene.onAfterRender = (r) => {
      if (!behind.wk || r.getRenderTarget() !== null || !((window.devicePixelRatio || 1) > r.getPixelRatio() + 0.01)) return;
      const now = performance.now();
      if (now - behind.t > 500) { behind.t = now; let v = [255, 255, 255]; for (let e = canvas; e; e = e.parentElement) { const m = /rgba?\(([^)]+)\)/.exec(getComputedStyle(e).backgroundColor || ''); const c = m ? m[1].split(/[\s,/]+/).filter(Boolean).map(Number) : null; if (c && c.length >= 3 && (c.length < 4 || c[3] > 0)) { v = c; break; } } behind.U.uBg.value.set(v[0] / 255, v[1] / 255, v[2] / 255); }
      const ac = r.autoClear, ar = r.info.autoReset; r.autoClear = false; r.info.autoReset = false; r.render(behind.S, behind.C); r.autoClear = ac; r.info.autoReset = ar;
    };
    let camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    let stage = null;
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minPolarAngle = 0.18 * Math.PI;
    controls.maxPolarAngle = 0.47 * Math.PI;
    const W = () => canvas.clientWidth || innerWidth, H = () => canvas.clientHeight || innerHeight;
    const portrait = () => { const w = W(), h = H(); return w < 760 && !(h < 500 && w > h); };
    let juice = false;

    let night = opt.mode === 'day' ? 0 : 1;
    let nightTarget = night, modeFrom = night, modeTo = night, modeT0 = 0;
    const MODE_FADE = 2.5;
    let bgDay = [34, 34, 34], bgNight = [17, 17, 17];
    let ready = false, slides = null, manifest = null, root = null, baked = null, dayTex = null, nightTex = null;
    const skyMeshes = [];
    const glows = [];
    let clips = [], mixerMain = null;
    const nightUniform = { value: night };
    const mixers = [];
    const fxUpdaters = [];
    const nightMats = [];
    let fitZoom = 1, zoomRatio = 1, zRef = 1;
    let bounds = null, camDist = 20;
    const projExt = { bw: 1, bh: 1 };
    let totalBytes = 0;
    const rnd = (() => { let s = 12345; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
    const frameFns = new Set();
    let raf = 0;
    const MILES = [0, 0.02, 0.06, 0.7, 0.76, 0.86, 0.95, 1];
    let pGoal = 0, pShown = 0, pTimer = 0;
    const emit = (f) => { try { if (opt.onProgress) opt.onProgress(f); } catch {  } };
    const evLog = [];
    const ev = (type, detail) => { evLog.push([+performance.now().toFixed(0), type, detail && detail.name]); if (evLog.length > 60) evLog.shift(); try { if (opt.onEvent) opt.onEvent(type, detail || {}); } catch (e) { console.error(e); } };
    const progress = (f) => {
      pGoal = Math.max(pGoal, Math.max(0, Math.min(1, f)));
      if (pGoal >= 1) { clearInterval(pTimer); pTimer = 0; pShown = 1; emit(1); return; }
      if (!pTimer && opt.onProgress) pTimer = setInterval(() => {
        const ceil = MILES.find((m) => m > pGoal + 1e-6) || 1;
        const next = pShown < pGoal ? pShown + (pGoal - pShown) * 0.35 : Math.min(pShown + 0.0025, pGoal + (ceil - pGoal) * 0.85);
        if (next > pShown + 1e-4) { pShown = next; emit(+pShown.toFixed(4)); }
      }, 80);
    };

    let bgLast = -1;
    function applyBg(force) {
      if (!force && night === bgLast) return;
      bgLast = night;
      const c = bgDay.map((d, i) => Math.round(d + (bgNight[i] - d) * night));
      const css = `rgb(${c[0]},${c[1]},${c[2]})`;
      if (opt.onBackground) opt.onBackground(css);
      renderer.setClearColor(new THREE.Color(css), 1);
    }
    applyBg(true);

    const bust = opt.cacheBust === false ? '' : typeof opt.cacheBust === 'string' ? opt.cacheBust : '?v=' + Date.now();
    const fetchCache = typeof opt.fetchCache === 'string' ? opt.fetchCache : 'no-store';
    let lastAct = performance.now();
    const act = () => { lastAct = performance.now(); };
    const streams = [];
    const streamProgress = () => { let g = 0, l = 0; for (const st of streams) { g += st.got; l += st.len; } if (l > 0) progress(0.06 + 0.8 * g / l); };
    const pre = new Map();
    function prefetch(name) { if (pre.has(name)) return; const p = getBuf(name, false); p.catch(() => {}); pre.set(name, p); }
    function firstBytes(parts, n) { const u = new Uint8Array(n); let o = 0; for (const p of parts) { if (o >= n) break; const k = Math.min(p.byteLength, n - o); u.set(p.subarray(0, k), o); o += k; } return u; }
    function peekHead(parts, got, cb) {
      if (got < 20) return false;
      const h = new DataView(firstBytes(parts, 20).buffer);
      if (h.getUint32(0, true) !== 0x46546C67 || h.getUint32(16, true) !== 0x4E4F534A) return true;
      const n = h.getUint32(12, true);
      if (got < 20 + n) return false;
      try { cb(JSON.parse(new TextDecoder().decode(firstBytes(parts, 20 + n).subarray(20)))); } catch (e) { void e; }
      return true;
    }
    async function getGzBuf(name, track, onHead) {
      act();
      const r = await fetch(base + name + '.gz' + bust, { cache: fetchCache });
      if (!r.ok || !r.body) throw new Error('missing ' + name + '.gz');
      act();
      const len = +r.headers.get('content-length') || 0;
      const st = { got: 0, len: len || 1 };
      if (track) streams.push(st);
      try {
        let got = 0, yieldT = performance.now();
        const tick = () => new Promise((res) => { const ch = new MessageChannel(); ch.port1.onmessage = () => res(); ch.port2.postMessage(0); });
        const counted = r.body.pipeThrough(new TransformStream({ async transform(chunk, ctl) { got += chunk.byteLength; st.got = len ? Math.min(got, len) : 0; act(); if (track) streamProgress(); for (let i = 0; i < chunk.byteLength; i += 32768) { ctl.enqueue(chunk.subarray(i, i + 32768)); if (performance.now() - yieldT > 8) { await tick(); yieldT = performance.now(); } } } }));
        const inflated = /gzip/i.test(r.headers.get('content-encoding') || '') ? counted : counted.pipeThrough(new DecompressionStream('gzip'));
        const rd = inflated.getReader(); const parts = []; let size = 0, headDone = !onHead;
        for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); size += value.byteLength; if (!headDone) headDone = peekHead(parts, size, onHead); }
        st.got = st.len = len || got; if (track) streamProgress();
        const u8 = new Uint8Array(size); let o = 0; for (const p of parts) { u8.set(p, o); o += p.byteLength; }
        totalBytes += got;
        return u8.buffer;
      } catch (e) {
        const i = streams.indexOf(st); if (i >= 0) streams.splice(i, 1);
        throw e;
      }
    }
    async function getBuf(name, track, onHead) {
      if (pre.has(name)) { const p = pre.get(name); pre.delete(name); return p; }
      if (onHead) { const cb = onHead; let sent = false; onHead = (js) => { if (!sent) { sent = true; cb(js); } }; }
      if (Array.isArray(opt.gzipped) && opt.gzipped.includes(name) && typeof DecompressionStream === 'function') {
        try { return await getGzBuf(name, track, onHead); } catch (e) { void e; }
      }
      act();
      const r = await fetch(base + name + bust, { cache: fetchCache });
      if (!r.ok) throw new Error('missing ' + name);
      act();
      let b;
      const len = +r.headers.get('content-length') || 0;
      if (track && r.body && r.body.getReader) {
        const st = { got: 0, len: len || 1 }; streams.push(st);
        const rd = r.body.getReader(); const parts = []; let got = 0, headDone = !onHead;
        for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.byteLength; st.got = len ? Math.min(got, len) : 0; act(); streamProgress(); if (!headDone) headDone = peekHead(parts, got, onHead); }
        st.got = st.len = len || got; streamProgress();
        const u8 = new Uint8Array(got); let o = 0; for (const p of parts) { u8.set(p, o); o += p.byteLength; }
        b = u8.buffer;
      } else b = await r.arrayBuffer();
      act();
      totalBytes += b.byteLength;
      return b;
    }
    const slice = () => new Promise((r) => { if (!manifest || !manifest.stage) { r(); return; } if (globalThis.scheduler && typeof globalThis.scheduler.yield === 'function') globalThis.scheduler.yield().then(r); else { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); } });
    let sliceT = 0;
    const maybeSlice = async () => { const n = performance.now(); if (n - sliceT > 8) { await slice(); sliceT = performance.now(); } };
    const mark = (n) => { act(); if (window.__marks) window.__marks.push([n, Math.round(performance.now())]); };
    let bitmapAtlas = false;
    async function getTex(name, anisotropy = 8, track = false) {
      const buf = await getBuf(name, track);
      const u8 = new Uint8Array(buf);
      const isImg = (u8[0] === 0xff && u8[1] === 0xd8) || (u8[0] === 0x89 && u8[1] === 0x50) || (u8[0] === 0x52 && u8[1] === 0x49);
      if (!isImg) { totalBytes -= buf.byteLength; throw new Error('missing ' + name); }
      const type = u8[0] === 0xff ? 'image/jpeg' : u8[0] === 0x89 ? 'image/png' : 'image/webp';
      if (bitmapAtlas && typeof createImageBitmap === 'function') {
        const bmp = await createImageBitmap(new Blob([buf], { type }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
        const tex = new THREE.Texture(bmp);
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(anisotropy, renderer.capabilities.getMaxAnisotropy());
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.needsUpdate = true;
        mark('decoded ' + name);
        return tex;
      }
      const url = URL.createObjectURL(new Blob([buf], { type }));
      const tex = await new THREE.TextureLoader().loadAsync(url);
      URL.revokeObjectURL(url);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(anisotropy, renderer.capabilities.getMaxAnisotropy());
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.needsUpdate = true;
      return tex;
    }
    async function getScreenTex(src) {
      const r = await fetch(src);
      if (!r.ok) throw new Error('no screen image');
      const blob = await r.blob();
      totalBytes += blob.size;
      let tex;
      if (typeof createImageBitmap === 'function' && manifest && manifest.stage) {
        const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
        tex = new THREE.Texture(bmp); tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.needsUpdate = true;
      } else {
        const url = URL.createObjectURL(blob);
        tex = await new THREE.TextureLoader().loadAsync(url);
      }
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    }
    let atlasExt = '.jpg';
    let upgrade = [];
    async function atlas(mode, track = false) {
      if (/\/worlds\//.test(base) && bitmapAtlas && W() >= 760) {
        const noUp = manifest && manifest.stage && params.get('smooth') !== '0' && params.get('atlas4k') !== '1';
        try { const t = await getTex(mode + '_2k' + atlasExt, 8, track); if (!noUp) upgrade.push(mode); return t; } catch (e) { if (!/missing/.test(String(e.message))) throw e; }
      }
      if (/\/worlds\//.test(base) && W() < 760) {
        try { return await getTex(mode + '_2k' + atlasExt, 8, track); } catch (e) { if (!/missing/.test(String(e.message))) throw e; }
      }
      return getTex(mode + atlasExt, 8, track);
    }
    let draco = null, dracoP = null;
    function dracoStart() {
      if (!dracoP) dracoP = import('three/addons/loaders/DRACOLoader.js').then(({ DRACOLoader }) => {
        if (disposed) return null;
        draco = new DRACOLoader();
        draco.setDecoderPath(typeof opt.dracoPath === 'string' ? opt.dracoPath : String(import.meta.url).split('?')[0].replace(/[^/]*$/, '') + 'libs/draco/');
        draco.preload();
        return draco;
      });
      return dracoP;
    }
    let mfReady = null;
    const mfP = new Promise((r) => { mfReady = r; });
    function onGlbHead(js) {
      if ((js.extensionsUsed || []).includes('KHR_draco_mesh_compression')) dracoStart().catch(() => {});
      const sheets = new Set();
      for (const m of js.materials || []) { const r = /SPRITE_([A-Za-z0-9-]+?)(?:__|$)/.exec((m && m.name) || ''); if (r) sheets.add(r[1]); }
      if (sheets.size) mfP.then(() => { if (disposed || !manifest || !manifest.stage) return; const ext = manifest.pack && manifest.pack.sprites === 'webp' ? '.webp' : '.png'; for (const s of sheets) prefetch('sprites/' + s + ext); });
    }
    async function gltfLoader(glb) {
      const loader = new GLTFLoader();
      try {
        const dv = new DataView(glb), len = dv.getUint32(12, true);
        const js = JSON.parse(new TextDecoder().decode(new Uint8Array(glb, 20, len)));
        if ((js.extensionsUsed || []).includes('KHR_draco_mesh_compression')) {
          const d = await dracoStart();
          if (d) loader.setDRACOLoader(d);
        }
      } catch (e) {  }
      return loader;
    }

    const bakedU = { tNight: { value: null }, uMinLod: { value: 0 } };
    const liteU = { uLamp: { value: Array.from({ length: 12 }, () => new THREE.Vector4(0, -99, 0, 0.01)) }, uLampI: { value: new Array(12).fill(0) }, uLampN: { value: 0 },
      uMoonL: { value: new THREE.Vector3(0, 0.5, -1).normalize() }, uRim: { value: 0 }, uSpill: { value: new THREE.Vector4(0, -99, 0, 0.01) }, uSpillC: { value: new THREE.Color(0, 0, 0) } };
    const bakedVariants = [];
    function setBakedMap(t) { for (const m of [baked, ...bakedVariants]) if (m) { m.map = t; m.needsUpdate = true; } }
    const SWAY_DECL = 'uniform vec4 uSwP[4]; uniform vec3 uSwD[4]; uniform float uSwL[4];';
    const SWAY_GLSL = ['{ vec3 swW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz; vec3 swAdd = vec3( 0.0 );',
      '  for ( int i = 0; i < 4; i ++ ) { if ( uSwP[ i ].w <= 0.0 ) continue; vec2 swd = swW.xz - uSwP[ i ].xz; float swH = uSwP[ i ].y - swW.y;',
      '    if ( dot( swd, swd ) < uSwP[ i ].w * uSwP[ i ].w && swH > 0.0 && swH < uSwL[ i ] * 1.02 ) swAdd += uSwD[ i ] * ( swH / uSwL[ i ] ); }',
      '  if ( dot( swAdd, swAdd ) > 0.0 ) transformed += inverse( mat3( modelMatrix ) ) * swAdd; }'].join('\n');
    function makeBaked(day, nightT, smooth) {
      const m = new THREE.MeshBasicMaterial({ map: day });
      m.name = 'BAKED';
      bakedU.tNight.value = nightT; bakedU.uMinLod.value = smooth;
      m.onBeforeCompile = (sh) => {
        sh.uniforms.tNight = bakedU.tNight;
        sh.uniforms.uNight = nightUniform;
        if (!m.userData.shader) m.userData.shader = sh;
        if (!smooth) {
          sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform sampler2D tNight;\nuniform float uNight;')
            .replace('#include <map_fragment>', 'vec4 dayC = texture2D( map, vMapUv );\nvec4 nightC = texture2D( tNight, vMapUv );\ndiffuseColor *= mix( dayC, nightC, uNight );');
          return;
        }
        sh.uniforms.uMinLod = bakedU.uMinLod;
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform sampler2D tNight;\nuniform float uNight;\nuniform float uMinLod;\n' +
            'vec4 smoothTex(sampler2D t, vec2 uv) { vec2 ts = vec2(textureSize(t, 0)); vec2 dx = dFdx(uv * ts), dy = dFdy(uv * ts);\n' +
            '  float lod = 0.5 * log2(max(max(dot(dx, dx), dot(dy, dy)), 1e-8)); return textureLod(t, uv, max(lod, uMinLod)); }')
          .replace('#include <map_fragment>', 'vec4 dayC = smoothTex( map, vMapUv );\nvec4 nightC = smoothTex( tNight, vMapUv );\ndiffuseColor *= mix( dayC, nightC, uNight );');
        Object.assign(sh.uniforms, liteU, swayU);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLWP; varying vec3 vLWN; varying vec3 vLamp; uniform vec4 uLamp[12]; uniform float uLampI[12]; uniform int uLampN; uniform vec4 uSpill; uniform vec3 uSpillC; ' + SWAY_DECL)
          .replace('#include <begin_vertex>', ['#include <begin_vertex>',
            SWAY_GLSL].join('\n'))
          .replace('#include <fog_vertex>', ['#include <fog_vertex>',
            'vLWP = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz; vLWN = normalize( mat3( modelMatrix ) * normal + vec3( 0.0, 1e-5, 0.0 ) );',
            'vLamp = vec3( 0.0 );',
            'for ( int i = 0; i < 12; i ++ ) { if ( i >= uLampN ) break; vec3 d = uLamp[ i ].xyz - vLWP; float r = uLamp[ i ].w; float d2 = dot( d, d );',
            '  float fall = ( r * r ) / ( r * r + d2 * 3.0 ) * ( 1.0 - smoothstep( r * 1.2, r * 3.2, sqrt( d2 ) ) );',
            '  vLamp += vec3( 1.0, 0.7, 0.4 ) * fall * ( 0.35 + 0.65 * max( dot( vLWN, d * inversesqrt( max( d2, 1e-6 ) ) ), 0.0 ) ) * uLampI[ i ]; }',
            '{ vec3 sd = uSpill.xyz - vLWP; float s2 = dot( sd, sd ); vLamp += uSpillC * ( uSpill.w * uSpill.w / ( uSpill.w * uSpill.w + s2 * 2.0 ) ) * ( 1.0 - smoothstep( uSpill.w, uSpill.w * 3.0, sqrt( s2 ) ) ) * max( dot( vLWN, sd * inversesqrt( max( s2, 1e-6 ) ) ), 0.0 ); }'].join('\n'));
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLWP; varying vec3 vLWN; varying vec3 vLamp; uniform vec3 uMoonL; uniform float uRim;')
          .replace('#include <opaque_fragment>', [
            '{ vec3 N = normalize( vLWN ); vec3 V = normalize( cameraPosition - vLWP );',
            '  float rim = pow( max( 1.0 - max( dot( N, V ), 0.0 ), 0.0 ), 3.0 ) * max( dot( N, uMoonL ), 0.0 );',
            '  vec3 add = vLamp + mix( vec3( 1.0, 0.86, 0.62 ), vec3( 0.62, 0.7, 0.9 ), uNight ) * rim * uRim * mix( 0.45, 1.0, uNight );',
            '  outgoingLight += add * diffuseColor.rgb * 1.6 + add * 0.08; }',
            '#include <opaque_fragment>'].join('\n'));
      };
      return m;
    }

    const smokes = [];
    function addFx(node, kind, props = {}) {
      const holder = new THREE.Group();
      holder.name = 'fx_' + kind + '_' + (node.userData.name || node.name || '');
      node.add(holder);
      if (FX.PARTICLE_KINDS.has(kind)) { FX.addParticles(holder, kind, props, rnd); return; }
      const when = FX.whenOf(props.when);
      const tint = hasProp(props.color) ? FX.parseColor(props.color, '#ffffff') : null;
      const cnt = (d) => (hasProp(props.count) ? Math.max(1, Math.min(200, Math.round(Number(props.count) || d))) : d);
      if (kind === 'smoke' && stage) {
        node.updateWorldMatrix(true, false); holder.scale.setScalar(1 / Math.max(1e-3, node.getWorldScale(new THREE.Vector3()).x));
        const H = hasProp(props.height) ? +props.height : 0.45, sm = new THREE.ShaderMaterial({
          uniforms: { uTime: FX.fxU.uTime, uNight: FX.fxU.uNight, uH: { value: H }, uPh: { value: rnd() * 30 }, uCol: { value: tint || new THREE.Color('#d8d4cc') }, uLean: { value: new THREE.Vector2() } },
          vertexShader: `uniform float uTime; uniform float uH; uniform float uPh; uniform vec2 uLean; varying vec2 vS;
            void main() { float y = position.y; float t = uTime + uPh;
              float k = smoothstep(0.04, 0.5, y);
              float dx = (sin(y * 9.0 - t * 0.8) * 0.03 + sin(y * 17.0 - t * 1.4 + 1.3) * 0.014 + sin(t * 0.21 + 0.4) * 0.05 * y) * k;
              float dz = (cos(y * 7.0 - t * 0.65 + 0.7) * 0.024 + cos(y * 13.0 - t * 1.1) * 0.01) * k;
              vec4 wq = modelMatrix * vec4(dx, y * uH, dz, 1.0); wq.xz += uLean * (y * y); vec4 mv = viewMatrix * wq; mv.x += position.x * (0.0015 + 0.011 * y * y);
              vS = vec2(position.x, y); gl_Position = projectionMatrix * mv; }`,
          fragmentShader: `uniform vec3 uCol; uniform float uNight; varying vec2 vS;
            uniform float uTime; void main() { float br = 0.45 + 0.55 * smoothstep(-0.3, 0.8, sin(vS.y * 21.0 - uTime * 1.7) * sin(vS.y * 9.0 - uTime * 0.6 + 2.0));
              float a = (1.0 - smoothstep(0.0, 1.0, abs(vS.x))) * smoothstep(0.0, 0.05, vS.y) * pow(max(1.0 - vS.y, 0.0), 2.4) * br * mix(0.1, 0.16, uNight);
              if (a < 0.003) discard; gl_FragColor = vec4(uCol, a); ${'\n#include <colorspace_fragment>\n'} }`,
          transparent: true, depthWrite: false, side: THREE.DoubleSide });
        const g = new THREE.PlaneGeometry(2, 1, 1, 28); g.translate(0, 0.5, 0);
        const mesh = new THREE.Mesh(g, sm); mesh.frustumCulled = false; mesh.renderOrder = 7; holder.add(mesh);
        smokes.push({ U: sm.uniforms.uLean, p: holder.getWorldPosition(new THREE.Vector3()) });
        return;
      }
      if (kind === 'moths' && stage && manifest.life && manifest.life.moths) return;
      if (kind === 'moths' && stage) {
        node.updateWorldMatrix(true, false); holder.scale.setScalar(1 / Math.max(1e-3, node.getWorldScale(new THREE.Vector3()).x));
        if (params.get('freeze') !== null) return;
        const N = cnt(3), pos = new Float32Array(N * 3), ms = [];
        for (let i = 0; i < N; i++) ms.push({ r: 0.12 + rnd() * 0.12, w: (rnd() < 0.5 ? -1 : 1) * (1.6 + rnd() * 1.2), ph: rnd() * 6.283, h: (rnd() - 0.5) * 0.12, rest: 0, next: 4 + rnd() * 12, sx: 0, sy: 0, sz: 0, k: 0 });
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const m = new THREE.PointsMaterial({ map: moteTex(), size: 0.018, sizeAttenuation: true, transparent: true, depthWrite: false, color: tint || new THREE.Color('#efe9dc'), opacity: 0 });
        const pts = new THREE.Points(g, m); pts.frustumCulled = false; holder.add(pts);
        let last = 0;
        fxUpdaters.push((t) => {
          const dt = Math.min(0.1, Math.max(0, t - last)); last = t;
          m.opacity = 0.75 * night; pts.visible = night > 0.05;
          if (!pts.visible) return;
          for (let i = 0; i < N; i++) {
            const o = ms[i];
            if (o.rest > 0) { o.rest -= dt; if (o.rest <= 0) o.next = t + 6 + Math.random() * 14; }
            else if (t > o.next) { o.rest = 2 + Math.random() * 3; const a = Math.random() * 6.283; o.sx = Math.cos(a) * 0.07; o.sz = Math.sin(a) * 0.07; o.sy = (Math.random() - 0.5) * 0.08; }
            o.k += ((o.rest > 0 ? 1 : 0) - o.k) * (1 - Math.exp(-3 * dt));
            o.ph += o.w * dt * (1 - o.k);
            const wob = Math.sin(t * 7.3 + i * 2.1) * 0.025 + Math.sin(t * 3.1 + i) * 0.03;
            const fx = Math.cos(o.ph) * (o.r + wob), fz = Math.sin(o.ph) * (o.r + wob), fy = o.h + Math.sin(t * 2.3 + i * 1.7) * 0.05;
            pos[i * 3] = fx + (o.sx - fx) * o.k; pos[i * 3 + 1] = fy + (o.sy - fy) * o.k; pos[i * 3 + 2] = fz + (o.sz - fz) * o.k;
          }
          g.attributes.position.needsUpdate = true;
          m.size = 0.018 * (1 + 0.25 * Math.sin(t * 40));
        });
        return;
      }
      if (kind === 'steam' && stage) {
        const tex = softTex(), N = cnt(9), items = [];
        for (let i = 0; i < N; i++) {
          const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 });
          if (tint) m.color.copy(tint);
          const sp = new THREE.Sprite(m); sp.visible = false; holder.add(sp);
          items.push({ s: sp, born: -99, life: 1, x0: 0, z0: 0, vx: 0, vz: 0, rise: 1.5, s0: 0.2, s1: 0.6, a: 0, wob: 0 });
        }
        const mk = nameOf(node), kettle = /kettle|pot/i.test(mk), ph = rnd() * 60, T = 26 + rnd() * 24, ph2 = rnd() * 6.283;
        const pours = Array.isArray(props.pours) ? props.pours.map(Number).filter(isFinite) : null, pl = +props.loop || 0;
        if (params.get('freeze') !== null) { holder.visible = false; return; }
        const heatAt = (t) => {
          if (kettle) return 0.62 + 0.2 * Math.sin(t * 0.37 + ph) + 0.12 * Math.sin(t * 0.93 + ph * 1.3);
          if (pours && pours.length && pl > 0 && mixerMain) {
            const lt = mixerMain.time % pl; let since = 1e9;
            for (const pt of pours) { const d = lt >= pt ? lt - pt : lt + pl - pt; since = Math.min(since, d); }
            return 0.1 + 0.9 * Math.exp(-since / 7);
          }
          const c = 0.5 + 0.5 * Math.sin(t * 6.2832 / T + ph), r = 0.75 + 0.25 * Math.sin(t * 0.137 + ph2);
          return 0.1 + 0.9 * Math.pow(c * r, 2.2);
        };
        let next = 0;
        const sw = new THREE.Vector3(), swp = new THREE.Vector3(), swq = new THREE.Quaternion(), sws = new THREE.Vector3();
        fxUpdaters.push((t) => {
          const w = FX.whenFactor(when, night);
          holder.visible = w > 0.01;
          if (!holder.visible) return;
          if (WIND && windDir) { holder.getWorldPosition(swp); windAt(t, swp, sw); holder.getWorldQuaternion(swq); holder.getWorldScale(sws); sw.applyQuaternion(swq.invert()).multiplyScalar(0.55 / Math.max(1e-3, sws.x)); } else sw.set(0, 0, 0);
          const heat = Math.max(0.05, Math.min(1, heatAt(t)));
          if (t >= next) {
            let it = items.find((x) => t - x.born > x.life); if (!it) it = items.reduce((a2, b2) => (a2.born < b2.born ? a2 : b2));
            it.born = t; it.life = 2.0 + Math.random() * 2.2 + heat * 0.8; it.rise = 1.1 + Math.random() * 0.9;
            it.x0 = (Math.random() - 0.5) * 0.14; it.z0 = (Math.random() - 0.5) * 0.14; it.vx = (Math.random() - 0.5) * 0.35; it.vz = (Math.random() - 0.5) * 0.2;
            it.s0 = 0.12 + 0.16 * heat * (0.6 + 0.8 * Math.random()); it.s1 = it.s0 * (2.0 + Math.random() * 1.4); it.a = (0.16 + 0.42 * heat) * (0.7 + 0.6 * Math.random()); it.wob = Math.random() * 6.283;
            it.s.visible = true;
            next = t + (kettle ? 0.28 : 0.42) / (0.2 + heat) * (0.55 + 0.9 * Math.random());
          }
          for (const it of items) {
            const u = (t - it.born) / it.life;
            if (u < 0 || u >= 1) { if (it.s.visible && u >= 1) it.s.visible = false; continue; }
            const e = 1 - (1 - u) * (1 - u);
            it.s.position.set(it.x0 + it.vx * u + Math.sin(u * 4.0 + it.wob) * 0.07 * u + sw.x * u * u, e * it.rise + sw.y * u * u, it.z0 + it.vz * u + Math.cos(u * 3.1 + it.wob) * 0.05 * u + sw.z * u * u);
            const sc = it.s0 + (it.s1 - it.s0) * u; it.s.scale.set(sc * (1 + 0.15 * Math.sin(it.wob + u * 5)), sc, 1);
            it.s.material.opacity = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 1.3) * (1 - u) * it.a * w;
          }
        });
      } else if (kind === 'steam') {
        const tex = softTex();
        const items = [];
        const N = cnt(5);
        for (let i = 0; i < N; i++) {
          const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 });
          if (tint) m.color.copy(tint);
          const s = new THREE.Sprite(m); holder.add(s);
          items.push({ s, ph: i / N, dx: (rnd() - 0.5) * 0.3, sp: 0.16 + rnd() * 0.05 });
        }
        fxUpdaters.push((t) => {
          const w = FX.whenFactor(when, night);
          holder.visible = w > 0.01;
          for (const it of items) {
            const p = (t * it.sp + it.ph) % 1;
            it.s.position.set(it.dx + Math.sin(p * 6 + it.ph * 9) * 0.08, p * 1.6, 0);
            const sc = 0.35 + p * 0.55; it.s.scale.set(sc, sc, 1);
            it.s.material.opacity = Math.sin(Math.PI * p) * 0.5 * w;
          }
        });
      } else if (kind === 'glow') {
        const m = new THREE.SpriteMaterial({ map: tint ? softTex() : glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
        if (tint) m.color.copy(tint);
        const s = new THREE.Sprite(m); s.scale.set(2.6, 2.6, 1); holder.add(s);
        const gw = when === 1 ? 1 : 2;
        if (stage) {
          const g = { node, boost: 0, goal: 0, ph: rnd() * 6.283, sp: 0.5 + rnd() * 0.4, L: 0, nearScreen: false, ready: false };
          glows.push(g);
          const _w = new THREE.Vector3(), _c = new THREE.Vector3(), _s = new THREE.Vector3();
          fxUpdaters.push((t) => {
            const w = gw === 2 && g.lit !== undefined && g.lit !== null ? Math.min(g.lit, 1) : FX.whenFactor(gw, night);
            s.visible = w > 0.01;
            if (!s.visible) return;
            if (!g.ready) glowSetup(g);
            node.getWorldPosition(_w); node.getWorldScale(_s);
            if (g.sw) _w.add(g.sw);
            const sc0 = 2.6 * _s.x;
            const d = camera.position.distanceTo(_w), d0 = stage.d0 || 25;
            const k = 1 - THREE.MathUtils.smoothstep(d / d0, 0.4, 0.8);
            const diam = THREE.MathUtils.lerp(sc0, Math.min(sc0, 1.6 * g.L), k) * (1 + 0.15 * g.boost);
            const fl = 1 + 0.0125 * Math.sin(t * g.sp + g.ph) + 0.0075 * Math.sin(t * g.sp * 2.3 + g.ph * 1.7);
            const gw2 = windDir ? (WIND ? Math.min(1, Math.max(0, windAt(t, _w, _gwv) - GUST.base)) : Math.min(1, gustAt(t, _w.dot(windDir)))) : 0;
            m.opacity = Math.min(1, w * 0.8 * fl * (1 - 0.15 * gw2) * (WIND ? 1 + 0.07 * gw2 * Math.sin(t * 13.0 + g.ph * 5.0) : 1) * THREE.MathUtils.lerp(1, g.nearScreen ? 0.25 : 0.4, k) * (1 + 0.15 * g.boost));
            s.scale.set(diam / _s.x, diam / _s.y, 1);
            _c.copy(_w).sub(camera.position).normalize().multiplyScalar(0.5).add(_w);
            holder.worldToLocal(s.position.copy(_c));
          });
        } else fxUpdaters.push((t) => { const w = FX.whenFactor(gw, night); m.opacity = w * (0.8 + Math.sin(t * 2.1 + node.id) * 0.05); s.visible = w > 0.01; });
      } else if (kind === 'dust' || kind === 'bubbles') {
        const N = cnt(kind === 'dust' ? 28 : 12);
        const pos = new Float32Array(N * 3), seed = [];
        for (let i = 0; i < N; i++) seed.push({ x: rnd() - 0.5, y: rnd(), z: rnd() - 0.5, ph: rnd() * 6.28, sp: 0.5 + rnd() });
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const m = new THREE.PointsMaterial({ map: kind === 'dust' ? moteTex() : bubbleTex(), size: kind === 'dust' ? 4 : 9, sizeAttenuation: false, transparent: true, depthWrite: false, opacity: kind === 'dust' ? 0.55 : 0.8 });
        if (tint) m.color.copy(tint);
        const op = m.opacity, px = m.size;
        const pts = new THREE.Points(g, m); pts.frustumCulled = false; holder.add(pts);
        fxUpdaters.push((t) => {
          m.size = Math.max(px * pxm() / zRef, 1.5 / renderer.getPixelRatio());
          if (when) { const w = FX.whenFactor(when, night); m.opacity = op * w; pts.visible = w > 0.01; if (!pts.visible) return; }
          for (let i = 0; i < N; i++) {
            const o = seed[i];
            if (kind === 'dust') {
              pos[i * 3] = (o.x * 3) + Math.sin(t * 0.15 * o.sp + o.ph) * 0.4;
              pos[i * 3 + 1] = (o.y * 2) + Math.sin(t * 0.2 * o.sp + o.ph * 2) * 0.3;
              pos[i * 3 + 2] = (o.z * 3) + Math.cos(t * 0.13 * o.sp + o.ph) * 0.4;
            } else {
              const p = (t * 0.12 * o.sp + o.y) % 1;
              pos[i * 3] = o.x * 1.2 + Math.sin(t * 1.2 + o.ph) * 0.08;
              pos[i * 3 + 1] = p * 2.5;
              pos[i * 3 + 2] = o.z * 1.2;
            }
          }
          g.attributes.position.needsUpdate = true;
        });
      }
    }

    const spriteSheets = new Map(), spriteLoads = [];
    async function coverageMips(img) {
      try {
        const W0 = img.width, H0 = img.height; if (!W0 || !H0) return null;
        const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
        const c0 = mk(W0, H0), g0 = c0.getContext('2d', { willReadFrequently: true }); g0.drawImage(img, 0, 0);
        const cut = 128, d0 = g0.getImageData(0, 0, W0, H0).data;
        let n0 = 0; for (let i = 3; i < d0.length; i += 4) if (d0[i] >= cut) n0++;
        const cov = n0 / (W0 * H0), out = [c0];
        let prev = c0, w = W0, h = H0;
        while (w > 1 || h > 1) {
          await maybeSlice();
          w = Math.max(1, w >> 1); h = Math.max(1, h >> 1);
          const c = mk(w, h), g = c.getContext('2d', { willReadFrequently: true });
          g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(prev, 0, 0, w, h);
          const id = g.getImageData(0, 0, w, h), d = id.data, N = w * h;
          let lo = 0.2, hi = 8;
          for (let it = 0; it < 10; it++) { const mid = (lo + hi) / 2; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] * mid >= cut) n++; if (n / N < cov) lo = mid; else hi = mid; }
          const sc = (lo + hi) / 2;
          for (let i = 3; i < d.length; i += 4) d[i] = Math.min(255, Math.round(d[i] * sc));
          g.putImageData(id, 0, 0);
          out.push(c); prev = c;
        }
        return out;
      } catch (e) { return null; }
    }
    function spriteSheet(sheet) {
      if (spriteSheets.has(sheet)) return spriteSheets.get(sheet);
      const c1 = document.createElement('canvas'); c1.width = c1.height = 1; const x1 = c1.getContext('2d'); x1.fillStyle = '#fff'; x1.fillRect(0, 0, 1, 1);
      const t = new THREE.Texture(c1); t.needsUpdate = true; t.colorSpace = THREE.SRGBColorSpace; t.flipY = false;
      spriteSheets.set(sheet, t);
      const ext = manifest && manifest.pack && manifest.pack.sprites === 'webp' ? '.webp' : '.png';
      spriteLoads.push(getTex('sprites/' + sheet + ext, 4).then(async (big) => {
        const mips = params.get('legacysprite') === '1' ? null : await coverageMips(big.image);
        if (mips) { t.image = mips[0]; t.mipmaps = mips; t.generateMipmaps = false; } else { t.image = big.image; t.generateMipmaps = true; }
        t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
        t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); t.needsUpdate = true;
      }).catch(() => {}));
      return t;
    }
    const paperMeshes = [];
    function paperMaterial(src, name) {
      const m = new THREE.MeshBasicMaterial({ color: src.color ? src.color.clone() : 0xffffff });
      m.name = name;
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uNight = nightUniform; sh.uniforms.uTime = FX.fxU.uTime; Object.assign(sh.uniforms, swayU);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aPaper; varying vec3 vPap; ' + SWAY_DECL).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + SWAY_GLSL)
          .replace('#include <fog_vertex>', '#include <fog_vertex>\n{ vec4 wq = modelMatrix * vec4( transformed, 1.0 ); vec2 vd = cameraPosition.xz - wq.xz;\n' +
            '  float fc = length( aPaper.yz ) > 0.01 && length( vd ) > 1e-4 ? max( dot( normalize( aPaper.yz ), normalize( vd ) ), 0.0 ) : 1.0; vPap = vec3( aPaper.x, fc, aPaper.w ); }');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight; uniform float uTime; varying vec3 vPap;')
          .replace('#include <color_fragment>', '#include <color_fragment>\n{ float h = clamp( vPap.x, -1.0, 1.0 ), fc = vPap.y;\n' +
            '  float body = ( 1.0 - 0.34 * h * h ) * mix( 0.66, 1.0, pow( fc, 0.7 ) );\n' +
            '  float rq = abs( cos( h * 7.85398 ) ); float rib = 1.0 - 0.06 * smoothstep( 1.0 - 2.5 * min( fwidth( h * 7.85398 ), 0.3 ) - 0.06, 1.0, rq );\n' +
            '  float br = 1.0 + 0.025 * sin( uTime * 0.9 + vPap.z ) + 0.012 * sin( uTime * 2.3 + vPap.z * 1.7 ) + 0.007 * sin( uTime * 5.1 + vPap.z * 2.9 );\n' +
            '  vec3 warm = mix( vec3( 0.86, 0.6, 0.36 ), vec3( 1.0, 0.93, 0.8 ), smoothstep( 0.35, 1.0, body ) );\n' +
            '  diffuseColor.rgb *= warm * body * rib * br * mix( 0.9, 0.97, uNight ); if ( any( isnan( diffuseColor.rgb ) ) ) diffuseColor.rgb = vec3( 0.9, 0.8, 0.62 ); }');
      };
      m.customProgramCacheKey = () => 'paper1';
      nightMats.push({ m, base: m.color.clone(), d: 0.94, n: 1 });
      return m;
    }
    async function paperSetup() {
      if (!paperMeshes.length) return;
      const cs = []; root.traverse((o) => { if (/^FX_glow_/.test(nameOf(o)) && !o.isMesh) cs.push(o.getWorldPosition(new THREE.Vector3())); });
      const seen = new Set(), v = new THREE.Vector3();
      for (const o of paperMeshes) {
        o.updateWorldMatrix(true, false);
        if (seen.has(o.geometry)) o.geometry = o.geometry.clone();
        seen.add(o.geometry);
        const pa = o.geometry.attributes.position, n = pa.count, own = new Int32Array(n), W = [];
        for (let i = 0; i < n; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); W.push(v.clone()); let bi = -1, bd = 1e9; for (let k = 0; k < cs.length; k++) { const d = cs[k].distanceToSquared(v); if (d < bd) { bd = d; bi = k; } } own[i] = bi; }
        const box = new Map();
        for (let i = 0; i < n; i++) { let b = box.get(own[i]); if (!b) { b = new THREE.Box3(); box.set(own[i], b); } b.expandByPoint(W[i]); }
        const at = new Float32Array(n * 4), c = new THREE.Vector3(), sz = new THREE.Vector3();
        for (let i = 0; i < n; i++) {
          const b = box.get(own[i]); b.getCenter(c); b.getSize(sz);
          const dx = W[i].x - c.x, dz = W[i].z - c.z, r = Math.hypot(dx, dz);
          at[i * 4] = (W[i].y - c.y) / Math.max(1e-3, sz.y / 2); at[i * 4 + 1] = r > 1e-4 ? dx / r : 0; at[i * 4 + 2] = r > 1e-4 ? dz / r : 0; at[i * 4 + 3] = own[i] * 1.7 + 0.3;
        }
        o.geometry.setAttribute('aPaper', new THREE.BufferAttribute(at, 4));
        await maybeSlice();
      }
    }
    function setupMaterials(rt, day, nightT, screenTex, show) {
      const sm = stage && params.get('smooth') !== '0' ? Math.max(0, 1.4 + Math.log2(((nightT.image && nightT.image.width) || 2048) / 2048)) : 0;
      baked = makeBaked(day, nightT, sm);
      const cache = new Map();
      let slideMat = null;
      rt.traverse((o) => {
        if (!o.isMesh) return;
        if (o.isSkinnedMesh) o.frustumCulled = false;
        const src = o.material;
        const name = (src && src.name) || '';
        const fk = FX.fxKind(name);
        if (fk) { o.material = FX.makeFxMaterial(fk, o, src, name); o.material.name = name; return; }
        if (/^SCREEN/.test(name) && FX.isSky(o)) { o.material = FX.skyMaterial(show); o.userData.fxNoFrame = true; skyMeshes.push(o); return; }
        if (/^SCREEN/.test(name) && show.active) {
          o.material = slideMat || (slideMat = FX.screenMaterial(show)); o.material.name = name;
          if (stage) { o.material.transparent = true; o.renderOrder = 20; }
          return;
        }
        const spr = stage && /SPRITE_([A-Za-z0-9-]+?)(?:__|$)/.exec(name);
        if (spr && o.geometry && o.geometry.attributes.uv) {
          if (cache.has(src)) { o.material = cache.get(src); return; }
          const sheet = spr[1], cfg = (manifest.sprites && manifest.sprites[sheet]) || {};
          const msaa = renderer.getContext().getParameter(renderer.getContext().SAMPLES) > 1;
          if (sheet === 'shadow') {
            const ms = new THREE.MeshBasicMaterial({ color: 0x000000, map: spriteSheet(sheet), transparent: true, opacity: isFinite(+cfg.opacity) ? +cfg.opacity : 0.42, depthWrite: false, side: THREE.DoubleSide });
            ms.name = name; o.renderOrder = 2; cache.set(src, ms); o.material = ms; return;
          }
          const m2 = new THREE.MeshBasicMaterial({ color: src.color ? src.color.clone() : 0xffffff, map: spriteSheet(sheet), side: THREE.DoubleSide, alphaTest: 0.5, alphaToCoverage: msaa, alphaHash: !msaa });
          const sbU = { value: -0.6 };
          if (params.get('legacysprite') !== '1') m2.onBeforeCompile = (sh) => { sh.uniforms.uSprBias = sbU; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSprBias;').replace('#include <map_fragment>', 'vec4 sampledDiffuseColor = texture2D( map, vMapUv, uSprBias );\ndiffuseColor *= sampledDiffuseColor;'); };
          m2.customProgramCacheKey = () => 'sprite-bias';
          if (!msaa) m2.alphaTest = 0;
          m2.name = name;
          const ne = { m: m2, base: m2.color.clone(), d: isFinite(+cfg.day) ? +cfg.day : 1, n: isFinite(+cfg.night) ? +cfg.night : 0.9 };
          nightMats.push(ne);
          cache.set(src, m2); o.material = m2; return;
        }
        if (stage && (/PAPER_LANTERN/.test(name) || (params.get('papernode') && new RegExp(params.get('papernode')).test(o.name)))) {
          if (!cache.has('paper:' + name)) cache.set('paper:' + name, paperMaterial(src, name));
          o.material = cache.get('paper:' + name); paperMeshes.push(o); return;
        }
        if (cache.has(src)) { o.material = cache.get(src); return; }
        let m;
        if (/^BAKED/.test(name)) m = baked;
        else if (/^UNLIT_GLOW/.test(name)) {
          m = new THREE.MeshBasicMaterial({ color: src.color ? src.color.clone() : 0xffffff });
          nightMats.push({ m, base: m.color.clone(), d: 0.88, n: 1 });
        } else if (/^UNLIT/.test(name)) {
          m = new THREE.MeshBasicMaterial({ color: src.color ? src.color.clone() : 0xffffff });
          nightMats.push({ m, base: m.color.clone(), d: 1, n: 0.62 });
        } else if (/^SCREEN/.test(name)) {
          m = new THREE.MeshBasicMaterial(screenTex ? { map: screenTex } : { color: new THREE.Color('#f3e6c8') });
          nightMats.push({ m, base: m.color.clone(), d: 0.96, n: 1 });
        } else {
          m = new THREE.MeshBasicMaterial({ color: src.color ? src.color.clone() : 0xffffff, map: src.map || null });
        }
        m.name = name;
        cache.set(src, m);
        o.material = m;
      });
      const bl = nightMats.filter((e) => /SPRITE_blossom/.test(e.m.name || '')).sort((a, b) => a.base.r + a.base.g + a.base.b - (b.base.r + b.base.g + b.base.b));
      if (bl.length >= 3) BLOSSOM_DAY.forEach((t, i) => { bl[i].dayT = t; });
      FX.chaseFinish();
    }

    let lastNarrow = null;
    function frame() {
      const w = W(), h = H();
      const narrow = w < 760 && !(h < 500 && w > h);
      syncPR();
      renderer.setSize(w, h, false);
      const flip = ready && lastNarrow !== null && narrow !== lastNarrow; lastNarrow = narrow;
      if (stage) {
        if (flip) {
          const p = camera.position.clone(), q = controls.target.clone();
          stage.applyControls(controls);
          camera.position.copy(p); controls.target.copy(q); camera.lookAt(q);
          zRef = 900 / (2 * stage.d0 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
        }
        stage.resize();
        if (flip && view === 'explore' && glide.t > glide.dur) settleTo(view);
        else if (ready && view !== 'explore' && glide.t > glide.dur) settleTo(view);
        else if (ready && glide.t <= glide.dur && glide.ease === easeView) {
          const tg = targetFor(view), to = tg.o || offsetFor(view);
          if (glide.toP.distanceTo(tg.look3) > 1e-4 || glide.toT.distanceTo(tg.at3) > 1e-4 || Math.abs(to[0] - glide.toO[0]) > 1e-5 || Math.abs(to[1] - glide.toO[1]) > 1e-5) {
            const left = Math.max(0.35, glide.dur - glide.t);
            glide.fromP.copy(camera.position); glide.fromT.copy(controls.target); glide.fromO = glide.o.slice();
            glide.toP.copy(tg.look3); glide.toT.copy(tg.at3); glide.toO = to; glideStart(left);
          }
          applyOffset();
        }
        else applyOffset();
        return;
      }
      camera.left = -w / 2; camera.right = w / 2; camera.top = h / 2; camera.bottom = -h / 2;
      if (!bounds) { camera.updateProjectionMatrix(); return; }
      const bw = projExt.bw, bh = projExt.bh;
      const newFit = narrow ? (w * 0.92) / bw : Math.min((h * 0.62) / bh, (w * 0.9) / bw);
      fitZoom = newFit;
      camera.zoom = fitZoom * zoomRatio;
      controls.minZoom = fitZoom * 0.75; controls.maxZoom = fitZoom * 2.4;
      if (narrow) camera.setViewOffset(w, h, 0, h * 0.06, w, h); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    }
    const onControlsChange = () => { if (fitZoom) zoomRatio = camera.zoom / fitZoom; };
    controls.addEventListener('change', onControlsChange);
    const pxm = () => (stage ? stage.pxPerM(controls) : camera.zoom);

    let places = {};
    let view = VIEWS.includes(opt.view) ? opt.view : 'welcome';
    const GLIDE_DUR = 0.8, _zero3 = new THREE.Vector3();
    const easeView = 'view';
    const glide = { t: 99, dur: GLIDE_DUR, ease: easeView, done: null, fromP: new THREE.Vector3(), fromT: new THREE.Vector3(), toP: new THREE.Vector3(), toT: new THREE.Vector3(), fromO: [0, 0], toO: [0, 0], o: [0, 0],
      vP: new THREE.Vector3(), vT: new THREE.Vector3(), vO: [0, 0], v0P: new THREE.Vector3(), v0T: new THREE.Vector3(), v0O: [0, 0] };
    function glideStart(dur) {
      const moving = glide.t <= glide.dur;
      glide.v0P.copy(moving ? glide.vP : _zero3); glide.v0T.copy(moving ? glide.vT : _zero3);
      glide.v0O = moving ? glide.vO.slice() : [0, 0];
      glide.dur = dur; glide.t = 0;
    }
    function offsetFor(v) { if (!PLACE_VIEWS.includes(v)) return [0, 0]; return portrait() ? [0, 0.5 - 0.225] : [0.5 - 0.285, 0]; }
    function applyOffset() {
      if (!stage) return;
      const w = W(), h = H();
      if (glide.o[0] || glide.o[1]) camera.setViewOffset(w, h, glide.o[0] * w, glide.o[1] * h, w, h); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    }
    let samples = null, samplesReach = 0, allPts = null;
    const BLOSSOM_DAY = [[0.875, 0.86, 0.825], [0.94, 0.94, 0.935]];
    function ptsAll() {
      if (!allPts) samplePoints();
      return allPts;
    }
    const VOX = 0.05, PVOX = 0.01, NVOX = 0.04;
    const voxKey = (x, y, z, q) => ((Math.round(x / q) + 32768) * 65536 + (Math.round(y / q) + 32768)) * 65536 + (Math.round(z / q) + 32768);
    function voxPts(set, q) {
      const keys = [...set].sort((a, b) => a - b), out = new Float32Array(keys.length * 3);
      for (let i = 0; i < keys.length; i++) { const k = keys[i], z = k % 65536, r = (k - z) / 65536, y = r % 65536, x = (r - y) / 65536; out[i * 3] = (x - 32768) * q; out[i * 3 + 1] = (y - 32768) * q; out[i * 3 + 2] = (z - 32768) * q; }
      return out;
    }
    function framingJobs() {
      const wz = (manifest.stage.water && manifest.stage.water.z != null) ? +manifest.stage.water.z : -0.35, meshes = [], cyl = [], casts = [];
      root.traverse((o) => { if (o.isMesh && !o.userData.fxNoFrame && o.geometry && o.geometry.attributes.position) meshes.push(o); });
      for (const v of PLACE_VIEWS) {
        const p = places[v]; if (!p) continue;
        if (Array.isArray(p.cast) && p.cast.length) {
          const ms = [], own = new Map();
          for (const n of p.cast) { const o = root.getObjectByName(n) || root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n)); if (o) o.traverse((m) => { if (m.isMesh && m.geometry && m.geometry.attributes.position && !ms.includes(m)) { ms.push(m); own.set(m, n); } }); }
          if (ms.length) { casts.push({ v, ms, own, set: new Set(), sets: new Map(), main: new Set() }); continue; }
        }
        cyl.push({ v, x: p.at3.x, z: p.at3.z, y0: p.at3.y - +(p.height || 3.0), y1: p.at3.y + +(p.height || 3.0), R: +(p.radius || 2.3), set: new Set() });
      }
      return { wz, meshes, cyl, casts, all: new Set() };
    }
    function* framingSteps(J) {
      const v = new THREE.Vector3();
      root.updateMatrixWorld(true);
      for (const o of J.meshes) {
        const pa = o.geometry.attributes.position, M = o.matrixWorld;
        for (let i = 0; i < pa.count; i++) {
          v.fromBufferAttribute(pa, i).applyMatrix4(M);
          if (v.y < J.wz + 0.15) continue;
          J.all.add(voxKey(v.x, v.y, v.z, VOX));
          for (const c of J.cyl) if (v.y >= c.y0 && v.y <= c.y1 && Math.hypot(v.x - c.x, v.z - c.z) <= c.R) c.set.add(voxKey(v.x, v.y, v.z, PVOX));
          if ((i & 4095) === 4095) yield;
        }
        yield;
      }
      for (const c of J.casts) for (const m of c.ms) {
        const pa = m.geometry.attributes.position, nm = c.own.get(m), isMain = (MAIN[c.v] || []).includes(nm) && !PROP_RE.test(nameOf(m));
        let ns = c.sets.get(nm); if (!ns) { ns = new Set(); c.sets.set(nm, ns); }
        for (let i = 0; i < pa.count; i++) {
          v.fromBufferAttribute(pa, i); if (m.isSkinnedMesh) m.applyBoneTransform(i, v); v.applyMatrix4(m.matrixWorld);
          c.set.add(voxKey(v.x, v.y, v.z, PVOX)); ns.add(voxKey(v.x, v.y, v.z, NVOX));
          if (isMain) c.main.add(voxKey(v.x, v.y, v.z, PVOX));
          if ((i & 2047) === 2047) yield;
        }
        yield;
      }
    }
    function framingDone(J) {
      allPts = voxPts(J.all, VOX);
      for (const c of J.cyl.concat(J.casts)) { const pts = voxPts(c.set, PVOX); if (pts.length >= 9) placeSamples[c.v] = pts; }
      for (const c of J.casts) for (const [nm, set] of c.sets) { const pts = voxPts(set, NVOX); if (pts.length >= 9) nodeSamples.push({ v: c.v, nm, pts }); }
      for (const c of J.casts) { const pts = voxPts(c.main, PVOX); if (pts.length >= 9) { mainSamples[c.v] = pts; charSamples[c.v] = pts; } }
      const ck = clockRing();
      keepPts.education = ck;
      const scr = [], lamp = root.getObjectByName('FX_glow_projector_lamp');
      root.traverse((o) => { if (o.isMesh && /^SCREEN/.test((o.material && o.material.name) || '') && !FX.isSky(o)) scr.push(o); });
      if (mainSamples.projects && places.projects && scr.length) {
        const at = places.projects.at3, sb = new THREE.Box3();
        scr.sort((a, b) => a.getWorldPosition(_ckv).distanceTo(at) - b.getWorldPosition(_tq).distanceTo(at));
        sb.setFromObject(scr[0]);
        const add = []; for (let k = 0; k < 8; k++) add.push(k & 1 ? sb.max.x : sb.min.x, k & 2 ? sb.max.y : sb.min.y, k & 4 ? sb.max.z : sb.min.z);
        const scrN = add.length;
        if (lamp) { const lp = lamp.getWorldPosition(new THREE.Vector3()); for (const [dx, dy, dz] of [[0.15, 0, 0], [-0.15, 0, 0], [0, 0.15, 0], [0, 0, 0], [0, 0, 0.15], [0, 0, -0.15]]) add.push(lp.x + dx, lp.y + dy, lp.z + dz); }
        const o = new Float32Array(mainSamples.projects.length + add.length); o.set(mainSamples.projects); o.set(add, mainSamples.projects.length); mainSamples.projects = o;
        keepPts.projects = new Float32Array(add); keepMin.projects = new Float32Array(add.slice(0, scrN));
      }
      yawPick.clear();
    }
    function samplePoints() {
      const J = framingJobs(); for (const s of framingSteps(J)) void s; framingDone(J);
    }
    async function samplePointsSliced() {
      const J = framingJobs(); let t = performance.now();
      for (const s of framingSteps(J)) { void s; if (performance.now() - t > 6) { await slice(); t = performance.now(); } }
      framingDone(J);
    }
    function sampleWorld() {
      const ap = ptsAll(), hm = stage.home(), out = [], reach = +frameOf('welcome').reach || 7.5;
      for (let i = 0; i < ap.length; i += 3) if (Math.hypot(ap[i] - hm.target.x, ap[i + 2] - hm.target.z) <= reach) out.push(ap[i], ap[i + 1], ap[i + 2]);
      samples = new Float32Array(out); samplesReach = reach; ringWS = null;
    }
    const placeSamples = {}, nodeSamples = [], mainSamples = {}, charSamples = {}, keepPts = {}, keepMin = {}, yawPick = new Map();
    const MAIN = { about: ['master'], experience: ['cat_black', 'cat_white'], projects: ['rabbit'], education: ['crane'] }, PROP_RE = /pot|teacup|_tea|stream|reel|stroke/i, MAIN_H = 0.85, MAIN_W = 0.92, MAIN_HV = { projects: 0.93 };
    let insets = null;
    function setInsets(ins) {
      const nx = ins && typeof ins === 'object' ? { top: +ins.top || 0, right: +ins.right || 0, bottom: +ins.bottom || 0, left: +ins.left || 0 } : null;
      if (JSON.stringify(nx) === JSON.stringify(insets)) return;
      insets = nx;
      if (stage && ready && PLACE_VIEWS.includes(view) && places[view]) {
        const tg = targetFor(view), to = tg.o || offsetFor(view), moving = glide.t <= glide.dur;
        const px = stage.pxPerM(controls) * (camera.position.distanceTo(tg.look3) + controls.target.distanceTo(tg.at3)) + Math.abs(to[0] - glide.o[0]) * W() + Math.abs(to[1] - glide.o[1]) * H();
        glide.fromP.copy(camera.position); glide.fromT.copy(controls.target); glide.toP.copy(tg.look3); glide.toT.copy(tg.at3);
        glide.fromO = glide.o.slice(); glide.toO = to; glide.ease = easeView;
        if (!moving && px < 1.5) { glide.t = glide.dur; glideStart(0.05); stepGlide(0.05); return; }
        glideStart(moving ? Math.max(0.35, GLIDE_DUR - glide.t) : Math.min(GLIDE_DUR, 0.25 + px / 400)); if (reduced) { glide.t = glide.dur; stepGlide(0); }
      }
    }
    const FRAMES = {
      desk: { welcome: {}, about: {}, experience: {}, projects: { yaw: -12 }, education: { lock: 1 } },
      portrait: { welcome: { wWant: 0.93, reach: 9.5, sink: 0.5 }, about: {}, experience: {}, projects: { yaw: -12, pitch: 10 }, education: { yaw: 10 } },
      landscape: { welcome: { top: 0.03, clearCut: 0, botPx: 132, cx: 0.5, wWant: 0.95 }, about: {}, experience: {}, projects: { yaw: -12 }, education: { lock: 1 } },
    };
    const FILL = { desk: 0.58, portrait: 0.6, landscape: 0.58 }, fillQ = params.get('fill') !== null && +params.get('fill') > 0.2 && +params.get('fill') < 1 ? +params.get('fill') : null;
    function mergeFrames(src) {
      if (!src || typeof src !== 'object') return;
      for (const L of Object.keys(FRAMES)) if (src[L] && typeof src[L] === 'object') for (const v of Object.keys(src[L])) FRAMES[L][v] = Object.assign({}, FRAMES[L][v] || {}, src[L][v]);
      yawPick.clear();
    }
    if (params.get('frames')) { try { mergeFrames(JSON.parse(params.get('frames'))); } catch (e) { void e; } }
    const layoutOf = () => { const w = W(), h = H(); return h < 500 && w > h ? 'landscape' : w < 760 ? 'portrait' : 'desk'; };
    const frameOf = (v) => Object.assign({ dist: 1, dx: 0, dy: 0, yaw: 0, pitch: 0 }, (FRAMES[layoutOf()] || {})[v] || {});
    function freeArea() {
      const wide = !portrait();
      let fx0 = 0, fx1 = wide ? 0.57 : 1.0, fy0 = wide ? 0 : Math.min(0.2, 104 / H()), fy1 = wide ? 1.0 : 0.45;
      if (insets) { fx0 = Math.max(0, +insets.left || 0) / W(); fx1 = 1 - Math.max(0, +insets.right || 0) / W(); fy0 = Math.max(0, +insets.top || 0) / H(); fy1 = 1 - Math.max(0, +insets.bottom || 0) / H(); if (fx1 - fx0 < 0.2 || fy1 - fy0 < 0.15) { fx0 = 0; fx1 = 1; fy0 = 0; fy1 = 1; } }
      return [fx0, fy0, fx1, fy1];
    }
    function placeDir(p, yaw, pitch, out) {
      out.copy(p.look3).sub(p.at3).normalize();
      if (yaw) out.applyAxisAngle(_yAxis, THREE.MathUtils.degToRad(yaw));
      if (pitch) out.applyAxisAngle(_pAxis.set(out.z, 0, -out.x).normalize(), THREE.MathUtils.degToRad(pitch));
      return out;
    }
    function fitDist(p, dir, pts, fw, fh, F, n, trim, FH) {
      const fov = stage.home().fov, pos = _fp, fH = FH || F;
      let d = p.look3.distanceTo(p.at3);
      for (let k = 0; k < n; k++) {
        pos.copy(p.at3).addScaledVector(dir, d);
        const sp = spanOf(pos, p.at3, fov, pts, trim);
        d *= Math.max(((sp.x1 - sp.x0) / 2) / fw / F, ((sp.y1 - sp.y0) / 2) / fh / fH);
      }
      return d;
    }
    const mainMode = (v) => layoutOf() === 'portrait' && !fillQ && mainSamples[v] && mainSamples[v].length >= 9;
    const YAW_TRY = [0, -5, 5, -10, 10, -15, 15], SHIFT_TRY = [0, 0.04, -0.04, 0.08, -0.08], _fp = new THREE.Vector3(), _fd = new THREE.Vector3();
    function pickYaw(v, fr, A, F, dbg) {
      if (autoYaw === false || !nodeSamples.length || fr.lock) return [+fr.yaw || 0, 0];
      const key = v + '|' + layoutOf() + '|' + W() + 'x' + H() + '|' + A.map((x) => x.toFixed(3)).join(',') + '|' + F + '|' + (+fr.yaw || 0) + '|' + (+fr.pitch || 0);
      if (yawPick.has(key) && !dbg) return yawPick.get(key);
      const mm = mainMode(v), p = places[v], own = nodeSamples.filter((s) => s.v === v), others = nodeSamples.filter((s) => s.v !== v || (mm && !(MAIN[v] || []).includes(s.nm)));
      const ownPts = mm ? mainSamples[v] : placeSamples[v] && placeSamples[v].length >= 9 ? placeSamples[v] : own.length === 1 ? own[0].pts : (() => { const n = own.reduce((a, s) => a + s.pts.length, 0), o = new Float32Array(n); let k = 0; for (const s of own) { o.set(s.pts, k); k += s.pts.length; } return o; })();
      const fw = A[2] - A[0], fh = A[3] - A[1], cxW = A[0] + fw / 2, cyW = A[1] + fh / 2, fov = stage.home().fov;
      let best = [+fr.yaw || 0, 0], bestC = Infinity;
      for (const dy of YAW_TRY) {
        const yaw = (+fr.yaw || 0) + dy, dir = placeDir(p, yaw, +fr.pitch || 0, _fd), d = mm ? fitDist(p, dir, ownPts, fw, fh, MAIN_W, 4, 0, MAIN_HV[v] || MAIN_H) : fitDist(p, dir, ownPts, fw, fh, F, 4, 0);
        _fp.copy(p.at3).addScaledVector(dir, d);
        const sp = spanOf(_fp, p.at3, fov, ownPts, 0), sx = ((sp.x0 + sp.x1) / 2 + 1) / 2 - cxW, sy = (1 - (sp.y0 + sp.y1) / 2) / 2 - cyW;
        const rs = [];
        for (const s of others) {
          const r = camRect(s.pts);
          if (!(r.x1 > r.x0) || r.x1 < -1.5 || r.x0 > 1.5 || r.y1 < -1.5 || r.y0 > 1.5) continue;
          rs.push(r);
        }
        for (const sh of mm ? [0] : SHIFT_TRY) {
          const ox = sx - sh * fw, sv = portrait() ? sy - sh * fh : sy;
          let pen = 0; const vl = [];
          for (const r of rs) {
            const u0 = (r.x0 + 1) / 2 - (portrait() ? sx : ox), u1 = (r.x1 + 1) / 2 - (portrait() ? sx : ox), w0 = (1 - r.y1) / 2 - sv, w1 = (1 - r.y0) / 2 - sv;
            const ix = Math.max(0, Math.min(u1, A[2]) - Math.max(u0, A[0])), iy = Math.max(0, Math.min(w1, A[3]) - Math.max(w0, A[1])), a = (u1 - u0) * (w1 - w0);
            const vis = a > 0 ? ix * iy / a : 0, jx = Math.max(0, Math.min(u1, 1) - Math.max(u0, 0)), jy = Math.max(0, Math.min(w1, 1) - Math.max(w0, 0)), vs = a > 0 ? jx * jy / a : 0;
            pen += (vis > 0.03 && vis < 0.97 ? 0.25 + Math.min(vis, 1 - vis) : 0) + (vs > 0.03 && vs < 0.97 ? 0.15 + Math.min(vs, 1 - vs) : 0) + 0.3 * vis;
            if (dbg) vl.push(+vis.toFixed(2));
          }
          const c = pen * 4 + Math.abs(dy) / 15 + Math.abs(sh) * 5;
          if (dbg) dbg.push([yaw, sh, +c.toFixed(3), vl.join(' ')]);
          if (c < bestC - 1e-6) { bestC = c; best = [yaw, sh]; }
        }
      }
      yawPick.set(key, best);
      return best;
    }
    const autoYaw = params.get('autoyaw') === '0' ? false : true;
    function camRect(pts) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let i = 0; i < pts.length; i += 3) { _v.set(pts[i], pts[i + 1], pts[i + 2]).project(_cam); if (_v.z < -1 || _v.z > 1) continue; x0 = Math.min(x0, _v.x); x1 = Math.max(x1, _v.x); y0 = Math.min(y0, _v.y); y1 = Math.max(y1, _v.y); }
      return { x0, x1, y0, y1 };
    }
    const SCALE_K = { portrait: 0.17, landscape: 0.3 }, MUST_FROM = { about: 0.35, projects: 0.5 }, scaleQ = params.get('pk') !== null && +params.get('pk') > 0.05 ? +params.get('pk') : null;
    function scaleFrame(v, p, fr, A) {
      const L = layoutOf(), K = scaleQ || SCALE_K[L], ch = charSamples[v];
      if (!K || !ch || fillQ) return null;
      const [fx0, fy0, fx1, fy1] = A, fov = stage.home().fov, dir = placeDir(p, +fr.yaw || 0, +fr.pitch || 0, new THREE.Vector3()), pos = new THREE.Vector3();
      let y0 = 1e9, y1 = -1e9; for (let i = 1; i < ch.length; i += 3) { y0 = Math.min(y0, ch[i]); y1 = Math.max(y1, ch[i]); }
      const wH = Math.max(0.2, y1 - y0), m0 = 10 / H(), mx = 8 / W(), ext0 = 10 / H();
      const partOf = (from) => { const cut = y0 + from * wH, top = []; for (let i = 0; i < ch.length; i += 3) if (ch[i + 1] >= cut) top.push(ch[i], ch[i + 1], ch[i + 2]); return new Float32Array(top); };
      const base = MUST_FROM[v] || 0, kAll = keepPts[v] || null, kMin = keepMin[v] || kAll;
      const tries = [[base, kAll, fy0 + m0], [base, kAll, ext0], [Math.max(base, 0.45), kMin, ext0], [Math.max(base, 0.6), kMin, ext0], [0.72, kMin, ext0]];
      const fitOf = (cp, kp, top) => {
        const c = spanOf(pos, p.at3, fov, cp, 0), k = kp ? spanOf(pos, p.at3, fov, kp, 0) : null;
        const cT = (1 - c.y1) / 2, cB = (1 - c.y0) / 2, kT = k ? (1 - k.y1) / 2 : cT, kB = k ? (1 - k.y0) / 2 : cB;
        const l = Math.min((c.x0 + 1) / 2, k ? (k.x0 + 1) / 2 : 9), r = Math.max((c.x1 + 1) / 2, k ? (k.x1 + 1) / 2 : -9);
        const sMin = Math.max(fy0 + m0 - cT, top - kT), sMax = fy1 - m0 - Math.max(cB, kB);
        const want = (fy0 + fy1) / 2 - (Math.min(cT, kT) + Math.max(cB, kB)) / 2;
        return { ok: sMin <= sMax + 1e-6 && r - l <= (fx1 - fx0) - 2 * mx, s: Math.min(Math.max(want, sMin), Math.max(sMin, sMax)), cx: (l + r) / 2, c };
      };
      let d = p.look3.distanceTo(p.at3);
      for (let it = 0; it < 6; it++) { pos.copy(p.at3).addScaledVector(dir, d); const sp = spanOf(pos, p.at3, fov, ch, 0); d *= ((sp.y1 - sp.y0) / 2 / wH) / K; }
      pos.copy(p.at3).addScaledVector(dir, d);
      let pick = null;
      for (const [from, kp, top] of tries) { const cp = partOf(from), f = fitOf(cp, kp, top); pick = { cp, kp, top, f }; if (f.ok) break; }
      for (let it = 0; it < 24 && !pick.f.ok; it++) { d *= 1.025; pos.copy(p.at3).addScaledVector(dir, d); pick.f = fitOf(pick.cp, pick.kp, pick.top); }
      d = Math.round(d * 1000) / 1000;
      pos.copy(p.at3).addScaledVector(dir, d);
      const F = fitOf(pick.cp, pick.kp, pick.top), cxW = (fx0 + fx1) / 2, yWant = F.s, cxNow = F.cx;
      const r4 = (x) => Math.round(x * 1e4) / 1e4, wide = !portrait(), g = F.c;
      p.dot = wide ? [r4(g.x1), r4((g.y0 + g.y1) / 2)] : [r4((g.x0 + g.x1) / 2), r4(g.y0)]; p.dotWide = wide;
      return { at3: p.at3.clone(), look3: pos.clone(), o: [r4(cxNow - cxW), r4(-yWant)], yaw: +fr.yaw || 0, shift: 0, scale: K };
    }
    function placeFrame(v) {
      const p = places[v], fr = frameOf(v);
      if (!allPts) samplePoints();
      if (layoutOf() !== 'desk') { const sf = scaleFrame(v, p, fr, freeArea()); if (sf) return sf; }
      const mm = mainMode(v), pts = (mm ? mainSamples[v] : placeSamples[v]) || new Float32Array(0);
      const wide = !portrait();
      const A = freeArea(), [fx0, fy0, fx1, fy1] = A;
      const fw = fx1 - fx0, fh = fy1 - fy0, cxW = fx0 + fw / 2, cyW = fy0 + fh / 2;
      const fov = stage.home().fov, pos = new THREE.Vector3();
      if (pts.length < 9) { pos.copy(p.look3); return { at3: p.at3, look3: pos, o: wide ? [0.5 - 0.285, 0] : [0, 0.5 - 0.225] }; }
      const F = fillQ || FILL[layoutOf()] || 0.58;
      const [yaw, shift] = pickYaw(v, fr, A, F), dir = placeDir(p, yaw, +fr.pitch || 0, new THREE.Vector3());
      let d = mm ? fitDist(p, dir, pts, fw, fh, MAIN_W, 6, 0, MAIN_HV[v] || MAIN_H) : fitDist(p, dir, pts, fw, fh, F, 5, trimOf(v));
      let keepDy = 0;
      if (keepPts[v]) {
        const m0 = fy0 + 4 / H(), m1 = 6 / H();
        for (let it = 0; it < 14; it++) {
          pos.copy(p.at3).addScaledVector(dir, d);
          const sm = spanOf(pos, p.at3, fov, pts, trimOf(v)), sk = spanOf(pos, p.at3, fov, keepPts[v], 0);
          const mTop = (1 - sm.y1) / 2, mBot = (1 - sm.y0) / 2, kTop = (1 - sk.y1) / 2, sh = (fy0 + fy1) / 2 - (mTop + mBot) / 2;
          const need = m0 - (kTop + sh), room = fy1 - m1 - (mBot + sh);
          if (need <= 0) break;
          if (need <= room) { keepDy = need; break; }
          d *= 1.03;
        }
      }
      d = Math.round(d * (+fr.dist || 1) * 1000) / 1000;
      pos.copy(p.at3).addScaledVector(dir, d);
      const sp = spanOf(pos, p.at3, fov, pts, trimOf(v));
      const cxNow = ((sp.x0 + sp.x1) / 2 + 1) / 2, cyNow = (1 - (sp.y0 + sp.y1) / 2) / 2 - keepDy, r4 = (x) => Math.round(x * 1e4) / 1e4;
      p.dot = wide ? [r4(sp.x1), r4((sp.y0 + sp.y1) / 2)] : [r4((sp.x0 + sp.x1) / 2), r4(sp.y0)]; p.dotWide = wide;
      return { at3: p.at3.clone(), look3: pos.clone(), o: [r4(cxNow - cxW - ((+fr.dx || 0) + (wide ? shift : 0)) * fw), r4(cyNow - cyW - ((+fr.dy || 0) + (wide ? 0 : shift)) * fh)], yaw, shift };
    }
    let ringR = null;
    function ringRect() {
      if (!stage || !ready || !stage.moonMesh) return null;
      const c = stage.moonMesh.position;
      if (ringR === null) {
        const ap = ptsAll(), mr = +((manifest.stage.moon && manifest.stage.moon.radius) || 1.45), ds = [];
        for (let i = 0; i < ap.length; i += 3) { const dd = Math.hypot(ap[i] - c.x, ap[i + 1] - c.y, ap[i + 2] - c.z); if (dd > 1.1 * mr && dd < 2.6 * mr) ds.push(dd); }
        ds.sort((a, b) => a - b);
        ringR = ds.length > 20 ? ds[Math.floor(ds.length / 2)] : 1.6 * mr;
      }
      const w = W(), h = H();
      _v.copy(c).project(camera);
      if (_v.z < -1 || _v.z > 1) return null;
      const x = (_v.x + 1) / 2 * w, y = (1 - _v.y) / 2 * h;
      _r.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(ringR).add(c).project(camera);
      const r = Math.hypot((_r.x + 1) / 2 * w - x, (1 - _r.y) / 2 * h - y);
      return { x, y, r };
    }
    const _cam = new THREE.PerspectiveCamera(), _yAxis = new THREE.Vector3(0, 1, 0), _pAxis = new THREE.Vector3();
    const PTRIM = params.get('ptrim') !== null && isFinite(+params.get('ptrim')) ? Math.max(0, Math.min(0.2, +params.get('ptrim'))) : null;
    const TRIM_DEFAULT = { about: 0, experience: 0.0075, projects: 0.006, education: 0.04 };
    const trimOf = (v) => (PTRIM !== null ? PTRIM : places[v] && isFinite(+places[v].trim) && places[v].trim !== null && places[v].trim !== '' ? Math.max(0, Math.min(0.2, +places[v].trim)) : places[v] && Array.isArray(places[v].cast) && places[v].cast.length ? 0 : (TRIM_DEFAULT[v] || 0));
    let spanX = new Float32Array(0), spanY = new Float32Array(0);
    function spanOf(pos, tgt, fov, pts = samples, trim = 0) {
      _cam.fov = fov; _cam.aspect = W() / H(); _cam.near = 0.1; _cam.far = 2000; _cam.position.copy(pos); _cam.lookAt(tgt); _cam.updateMatrixWorld(); _cam.updateProjectionMatrix();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      const n = pts.length / 3, cut = trim > 0 ? Math.floor(n * trim) : 0;
      if (cut > 0 && spanX.length < n) { spanX = new Float32Array(n); spanY = new Float32Array(n); }
      for (let i = 0; i < pts.length; i += 3) {
        _v.set(pts[i], pts[i + 1], pts[i + 2]).project(_cam);
        if (cut > 0) { spanX[i / 3] = _v.x; spanY[i / 3] = _v.y; continue; }
        x0 = Math.min(x0, _v.x); x1 = Math.max(x1, _v.x); y0 = Math.min(y0, _v.y); y1 = Math.max(y1, _v.y);
      }
      if (cut > 0) {
        const xs = spanX.subarray(0, n).sort(), ys = spanY.subarray(0, n).sort();
        x0 = xs[cut]; x1 = xs[n - 1 - cut]; y0 = ys[cut]; y1 = ys[n - 1 - cut];
      }
      return { x0, x1, y0, y1 };
    }
    let ringP = null, ringWS = null;
    function ringPoints() {
      if (ringP) return ringP;
      const ap = ptsAll(), c = stage.moonMesh ? stage.moonMesh.position : null, out = [];
      if (c) {
        const mr = +((manifest.stage.moon && manifest.stage.moon.radius) || 1.45);
        for (let i = 0; i < ap.length; i += 3) if (Math.hypot(ap[i] - c.x, ap[i + 1] - c.y, ap[i + 2] - c.z) < 2.9 * mr) out.push(ap[i], ap[i + 1], ap[i + 2]);
        out.push(c.x, c.y + mr, c.z, c.x - mr, c.y, c.z, c.x + mr, c.y, c.z);
      }
      ringP = new Float32Array(out);
      return ringP;
    }
    function headerClear() {
      const t = insets && insets.top > 0 ? insets.top : (W() < 1200 && !portrait() ? (H() < 500 ? 66 : 74) : 0);
      return t > 0 ? (t + 10) / H() : 0;
    }
    function welcomeFrame() {
      return welcomeFit(frameOf('welcome'));
    }
    function welcomeFit(fr) {
      const hm = stage.home();
      if (!samples || samplesReach !== (+fr.reach || 7.5)) sampleWorld();
      if (!samples.length) return { at3: hm.target, look3: hm.pos, o: [0, 0] };
      const wide = !portrait(), clear = headerClear(), top = Math.max(isFinite(+fr.top) ? +fr.top : (wide ? 0.03 : 0.125), clear - (+fr.clearCut || 0)), bot = isFinite(+fr.botPx) ? 1 - +fr.botPx / H() : isFinite(+fr.bot) ? +fr.bot : (wide ? 0.615 : 0.6);
      let pts = samples;
      if (clear > 0) { const rp = ringPoints(); if (!ringWS) { ringWS = new Float32Array(samples.length + rp.length); ringWS.set(samples); ringWS.set(rp, samples.length); } pts = ringWS; }
      const dir = hm.pos.clone().sub(hm.target);
      let d = dir.length(); dir.normalize();
      const pos = new THREE.Vector3();
      for (let k = 0; k < 3; k++) {
        pos.copy(hm.target).addScaledVector(dir, d);
        const s = spanOf(pos, hm.target, hm.fov, pts);
        const hNow = (s.y1 - s.y0) / 2, hWant = bot - top, wNow = (s.x1 - s.x0) / 2, wWant = isFinite(+fr.wWant) ? +fr.wWant : (wide ? 0.96 : 1.12);
        d *= Math.max(hNow / hWant, wNow / wWant);
      }
      d = Math.round(d * 1000) / 1000;
      pos.copy(hm.target).addScaledVector(dir, d);
      const s = spanOf(pos, hm.target, hm.fov, pts);
      const hSpan = (s.y1 - s.y0) / 2, slack = Math.max(0, bot - top - hSpan), cyNow = (1 - (s.y0 + s.y1) / 2) / 2, cyWant = (top + bot) / 2 + slack * (+fr.sink || 0) / 2;
      const cxNow = ((s.x0 + s.x1) / 2 + 1) / 2, r4 = (x) => Math.round(x * 1e4) / 1e4;
      return { at3: hm.target.clone(), look3: pos.clone(), o: [r4(cxNow - (isFinite(+fr.cx) ? +fr.cx : 0.5)), r4(cyNow - cyWant)], s };
    }
    function exploreFrame() {
      const hm = stage.home(), wideE = !portrait(), clear = headerClear();
      const dir = hm.pos.clone().sub(hm.target);
      let d = dir.length() * (wideE ? 1.25 : 0.9); dir.normalize();
      let o1 = wideE ? 0.06 : 0.08;
      const pos = hm.target.clone().addScaledVector(dir, d);
      if (clear > 0) {
        if (!samples || samplesReach !== (+frameOf('welcome').reach || 7.5)) sampleWorld();
        const rp = ringPoints();
        for (let k = 0; k < 8 && rp.length; k++) {
          pos.copy(hm.target).addScaledVector(dir, d);
          const sr = spanOf(pos, hm.target, hm.fov, rp), si = samples.length ? spanOf(pos, hm.target, hm.fov, samples) : sr;
          const ringTop = (1 - sr.y1) / 2, isleBot = (1 - si.y0) / 2;
          if (ringTop - o1 >= clear) break;
          const want = ringTop - clear;
          if (isleBot - want <= 0.86) { o1 = want; break; }
          d *= 1.05;
        }
        d = Math.round(d * 1000) / 1000;
        pos.copy(hm.target).addScaledVector(dir, d);
      }
      return { at3: hm.target, look3: pos, o: [0, Math.round(o1 * 1e4) / 1e4] };
    }
    function targetFor(v) {
      if (v === 'welcome') return welcomeFrame();
      if (PLACE_VIEWS.includes(v) && places[v]) return placeFrame(v);
      return exploreFrame();
    }
    function setView(v) {
      if (!VIEWS.includes(v) || v === view) return;
      if (PLACE_VIEWS.includes(v) && !places[v]) return;
      const from = view;
      view = v;
      lastInput = performance.now();
      controls.enabled = v === 'explore';
      if (!stage) return;
      const tg = targetFor(v);
      glide.fromP.copy(camera.position); glide.fromT.copy(controls.target);
      glide.toP.copy(tg.look3); glide.toT.copy(tg.at3);
      glide.fromO = glide.o.slice(); glide.toO = tg.o || offsetFor(v);
      glide.ease = easeView; glide.greet = true; if (glide.done) { const d = glide.done; glide.done = null; d(); }
      glideStart(GLIDE_DUR); if (reduced) glide.t = glide.dur;
      ev('glide', { from, to: v });
      if (PLACE_VIEWS.includes(v)) react(v);
      if (reduced) { stepGlide(0); if (stage && stage.fadeIn) stage.fadeIn(clock.elapsedTime); }
    }
    function settleTo(v) {
      const tg = targetFor(v), o = tg.o || offsetFor(v);
      if (reduced || (camera.position.distanceTo(tg.look3) < 0.005 && controls.target.distanceTo(tg.at3) < 0.005 && Math.abs(o[0] - glide.o[0]) < 5e-4 && Math.abs(o[1] - glide.o[1]) < 5e-4)) { jumpTo(v); return; }
      glide.fromP.copy(camera.position); glide.fromT.copy(controls.target); glide.toP.copy(tg.look3); glide.toT.copy(tg.at3);
      glide.fromO = glide.o.slice(); glide.toO = o; glide.ease = easeView; glide.greet = false; glideStart(0.45);
    }
    function jumpTo(v) {
      const tg = targetFor(v);
      camera.position.copy(tg.look3); controls.target.copy(tg.at3);
      glide.o = (tg.o || offsetFor(v)).slice(); glide.t = glide.dur + 1;
      camera.lookAt(controls.target);
      applyOffset();
    }
    function stepGlide(dt) {
      if (glide.t > glide.dur) return false;
      glide.t = Math.min(glide.dur, glide.t + dt);
      const D = glide.dur, u = glide.t / D, uu = u * u;
      const h = 3 * uu - 2 * uu * u, dh = (6 * u - 6 * uu) / D;
      const g = (uu * u - 2 * uu + u) * D, dg = 3 * uu - 4 * u + 1;
      camera.position.lerpVectors(glide.fromP, glide.toP, h).addScaledVector(glide.v0P, g);
      controls.target.lerpVectors(glide.fromT, glide.toT, h).addScaledVector(glide.v0T, g);
      glide.vP.subVectors(glide.toP, glide.fromP).multiplyScalar(dh).addScaledVector(glide.v0P, dg);
      glide.vT.subVectors(glide.toT, glide.fromT).multiplyScalar(dh).addScaledVector(glide.v0T, dg);
      glide.o = [glide.fromO[0] + (glide.toO[0] - glide.fromO[0]) * h + glide.v0O[0] * g, glide.fromO[1] + (glide.toO[1] - glide.fromO[1]) * h + glide.v0O[1] * g];
      glide.vO = [(glide.toO[0] - glide.fromO[0]) * dh + glide.v0O[0] * dg, (glide.toO[1] - glide.fromO[1]) * dh + glide.v0O[1] * dg];
      camera.lookAt(controls.target);
      if (glide.t < glide.dur && glide.t > 0.5 * glide.dur && stage) {
        const ppm = stage.pxPerM(controls) * renderer.getPixelRatio(), rem = (camera.position.distanceTo(glide.toP) + controls.target.distanceTo(glide.toT)) * ppm + (Math.abs(glide.toO[0] - glide.o[0]) * W() + Math.abs(glide.toO[1] - glide.o[1]) * H()) * renderer.getPixelRatio();
        if (rem < 0.5) { glide.t = glide.dur; camera.position.copy(glide.toP); controls.target.copy(glide.toT); glide.o = glide.toO.slice(); glide.vP.set(0, 0, 0); glide.vT.set(0, 0, 0); glide.vO = [0, 0]; camera.lookAt(controls.target); }
      }
      applyOffset();
      if (glide.t >= glide.dur) { glide.t = glide.dur + 1; if (view === 'explore') controls.update(); if (PLACE_VIEWS.includes(view) && juice && glide.greet) { greetArrival(view); if (greetPending === view) greetPlace(view); } greetPending = null; glide.greet = false; const d = glide.done; glide.done = null; if (d) d(true); return false; }
      return true;
    }

    let restKicked = false;
    function kickSlides() {
      if (restKicked || !slides || !slides.loadRest) return; restKicked = true;
      const idle = () => new Promise((r) => { const go = () => { if (disposed) return r(); if (glide.t <= glide.dur) setTimeout(go, 200); else (window.requestIdleCallback || ((f) => setTimeout(f, 120)))(() => r(), { timeout: 800 }); }; setTimeout(go, 150); });
      slides.loadRest(idle);
    }
    function intro() {
      if (stage && ready) entered();
      if (!stage || !ready) return Promise.resolve();
      if (view !== 'welcome') { view = 'welcome'; controls.enabled = false; }
      const tg = welcomeFrame();
      if (reduced) { jumpTo('welcome'); if (stage.fadeIn) stage.fadeIn(clock.elapsedTime); return Promise.resolve(); }
      return new Promise((res) => {
        if (glide.done) { const d = glide.done; glide.done = null; d(); }
        glide.fromP.copy(tg.at3).add(tg.look3.clone().sub(tg.at3).multiplyScalar(1.25)); glide.fromT.copy(tg.at3);
        glide.toP.copy(tg.look3); glide.toT.copy(tg.at3);
        glide.fromO = tg.o.slice(); glide.toO = tg.o.slice(); glide.o = tg.o.slice();
        glide.ease = 'intro'; glide.t = 99; glideStart(2.0);
        glide.done = (landed) => { res(); if (!landed) return; setTimeout(() => { if (!greetUsed && !disposed) { greet(); greetUsed = false; } }, 2500); };
        camera.position.copy(glide.fromP); controls.target.copy(glide.fromT); camera.lookAt(controls.target); applyOffset();
        ev('glide', { from: 'intro', to: 'welcome' });
      });
    }
    function showSlide(idv) {
      if (!slides || !slides.texs.length) return;
      if (idv === null || idv === undefined) { FX.slidesHold(slides, null); return; }
      const k = slides.byId && slides.byId.has(String(idv)) ? slides.byId.get(String(idv)) : slides.ids.indexOf(String(idv));
      if (k >= 0) FX.slidesHold(slides, k);
    }
    const offs = new Map();
    const animatedNames = new Set(), animatedRot = new Set();
    const reacts = [];
    const activeReacts = [];
    const loopActions = [];
    const drifts = [];
    function offsetOf(o) {
      let e = offs.get(o);
      if (!e) { e = { base: animatedNames.has(o.name) ? null : o.position.clone(), off: new THREE.Vector3() }; offs.set(o, e); }
      return e;
    }
    function glowsNear(v, rad = 2.6) {
      const p = places[v]; if (!p) return [];
      const wp = new THREE.Vector3();
      return glows.filter((g) => { if (!g.ready) glowSetup(g); return !g.nearScreen && g.node.getWorldPosition(wp).distanceTo(p.at3) < rad; });
    }
    let screenBoxes = null;
    function glowSetup(g) {
      g.ready = true;
      const wp = g.node.getWorldPosition(new THREE.Vector3()), sc = g.node.getWorldScale(new THREE.Vector3()).x;
      const nm = (g.node.userData.name || g.node.name).replace(/^FX_glow_/, '');
      const lan = root.getObjectByName(nm) || root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(nm));
      let L = 0;
      if (lan) { const sz = new THREE.Box3().setFromObject(lan).getSize(new THREE.Vector3()); L = Math.max(sz.x, sz.y, sz.z); }
      g.L = L > 0.05 && L < 3 ? L : 1.2 * sc;
      if (!screenBoxes) { screenBoxes = []; root.traverse((o) => { if (o.isMesh && /^SCREEN/.test(o.material && o.material.name || '') && !FX.isSky(o)) screenBoxes.push(new THREE.Box3().setFromObject(o)); }); }
      g.nearScreen = screenBoxes.some((b) => b.distanceToPoint(wp) < 1.2);
    }
    function react(v) {
      if (!juice || !places[v]) return;
      const t = clock.elapsedTime;
      for (const g of glowsNear(v)) { g.pulse = t; }
      if (greetSetFor(v).length) { greetPending = v; return; }
      const clip = clips.find((c) => c.name === 'react_' + v);
      if (clip && mixerMain && !reduced) {
        startOnce(clip, idlesFor(clip));
        return;
      }
      const names = Array.isArray(places[v].cast) ? places[v].cast : [];
      const objs = names.map((n) => root.getObjectByName(n) || root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n))).filter(Boolean);
      if (objs.length && !reduced) reacts.push({ objs, t0: t });
    }
    const ripples = [];
    const RIP_VS = `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
    const RIP_FS = `uniform float uAge; uniform float uNight; varying vec2 vP;
      void main() { float d = length(vP); float a = 0.0;
        for (int k = 0; k < 3; k++) { float r = uAge * 0.75 - float(k) * 0.16; if (r > 0.0) { float e = (d - r) / 0.012; a += exp(-e * e) * (1.0 - smoothstep(0.0, 1.0, r)); } }
        a *= (1.0 - smoothstep(1.4, 2.2, uAge * 1.0)) * mix(0.35, 0.6, uNight); if (a < 0.003) discard;
        gl_FragColor = vec4(vec3(0.92, 0.9, 0.86), a); \n#include <colorspace_fragment>\n }`;
    function makeRipple() {
      const m = new THREE.ShaderMaterial({ uniforms: { uAge: { value: 99 }, uNight: FX.fxU.uNight }, vertexShader: RIP_VS, fragmentShader: RIP_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); mesh.name = 'fx_ring_' + ripples.length; mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 6; mesh.scale.set(1.6, 1.6, 1.6); mesh.frustumCulled = false;
      mesh.visible = true; mesh.position.set(0, (stage ? stage.wz : 0) + 0.006, 0);
      scene.add(mesh); const r = { mesh, t0: -99 }; ripples.push(r); return r;
    }
    function ripple(at, size = 1) {
      let r = ripples.find((x) => clock.elapsedTime - x.t0 > 2.3);
      if (!r) {
        if (ripples.length >= 3) r = ripples.reduce((a, b) => (a.t0 < b.t0 ? a : b));
        else r = makeRipple();
      }
      r.mesh.position.set(at.x, stage.wz + 0.006, at.z); r.mesh.visible = true; r.t0 = clock.elapsedTime;
      r.mesh.scale.setScalar(1.6 * size);
      lifeEvent('ring', at, size);
      if (size < 1) return;
      const wp = new THREE.Vector3();
      for (const k of waterKoi) {
        k.getWorldPosition(wp);
        const dx = at.x - wp.x, dz = at.z - wp.z, dd = Math.hypot(dx, dz);
        if (dd < 2.0 && dd > 1e-3) drifts.push({ obj: k, dir: new THREE.Vector3(dx / dd, 0, dz / dd).multiplyScalar(Math.min(0.35, dd * 0.4)), t0: clock.elapsedTime });
      }
    }
    let waterKoi = [];
    const lifeN = { ring: 0, bob: 0, look: 0, scatter: 0, gust: 0, star: 0, small: 0, leap: 0 };
    let floaters = null, listeners = null, lastSmall = 0, lifeLastBig = -99;
    const waves = [], looks = [], bobs = [];
    let dust = null, pollen = null, petalsP = null, turtleGlow = null, mothObjs = null;
    const _ps = new THREE.Vector3(), _pr = new THREE.Raycaster();
    const petalRateFor = () => (tier >= 3 ? 0.7 : tier >= 2 ? 1 : 1.35);
    async function petalSetup() {
      const marks = []; root.traverse((o) => { if (/^FX_petals_/i.test(nameOf(o))) marks.push(o.getWorldPosition(new THREE.Vector3())); });
      if (!marks.length) return;
      const spawn = [], wy = stage.wz + 0.004;
      for (let w = 0; w < 60 && !ground.ready && !disposed; w++) await new Promise((r) => setTimeout(r, 100));
      _pr.camera = camera; _pr.layers.enableAll(); _pr.far = 14;
      for (const mk of marks) for (let k = 0; k < 6; k++) {
        const p = new THREE.Vector3(mk.x + (Math.random() - 0.5) * 1.4, mk.y + (Math.random() - 0.5) * 0.6, mk.z + (Math.random() - 0.5) * 1.2);
        let gy = null;
        if (ground.ready) gy = groundAt(p.x, p.z, p.y - 0.05);
        else { _pr.set(p, _ps.set(0, -1, 0)); const h = _pr.intersectObject(root, true).find((x) => !x.object.isSprite && !x.object.isPoints && x.object.visible); gy = h ? h.point.y : null; }
        const water = gy === null || gy < wy + 0.02;
        spawn.push({ p, water, ly: water ? wy : gy + 0.004 });
        await maybeSlice();
      }
      for (const pr of FX.particles) if (pr.pts && pr.pts.parent && /petals/i.test(pr.pts.parent.name)) pr.tierOff = true;
      if (disposed || freezeT !== null) return;
      petalsP = FX.petalFall(scene, spawn, { ripple, reduced });
      FX.petalRate(petalsP, petalRateFor()); if (WIND) { FX.petalDrift(petalsP, 0.11); petalsP.windAt = (p, out) => { if (!windDir) return out.set(0, 0, 0); windAt(FX.fxU.uTime.value, p, out); return out.multiplyScalar(GUST.wind); }; petalsP.waterY = stage.wz + 0.004; petalsP.groundAt = (x, z, yMax) => { if (!ground.ready || !ground.cov) return undefined; if (!ground.cov.some((c) => Math.abs(x - c[0]) < c[2] && Math.abs(z - c[1]) < c[2])) return undefined; const g = groundAt(x, z, yMax); return g === null ? -Infinity : g; }; }
    }
    const whenNodes = [], whenU = { day: { value: 1 }, night: { value: 0 } };
    function whenSetup() {
      const L = manifest.life || {}, defaults = { moths: 'night', fireflies: 'night', dragonfly: 'day', butterflies: 'day', butterfly: 'day' };
      const objsOf = (e, out) => { if (!e || typeof e !== 'object') return out; if (Array.isArray(e)) { for (const x of e) objsOf(x, out); return out; } if (typeof e.object === 'string') out.push(e.object); if (Array.isArray(e.objects)) for (const x of e.objects) if (typeof x === 'string') out.push(x); for (const k of Object.keys(e)) if (e[k] && typeof e[k] === 'object' && k !== 'when') objsOf(e[k], out); return out; };
      let warned = false;
      const add = (node, w) => {
        if (!node || whenNodes.some((x) => x.node === node)) return;
        for (let q = node.parent; q; q = q.parent) { const f = whenNodes.find((x) => x.node === q); if (f) { if (f.w !== w && !warned && /localhost|127\.0\.0\.1/.test(location.hostname)) { warned = true; console.warn('life: ' + nameOf(node) + ' is listed for ' + w + ' inside ' + nameOf(q) + ' listed for ' + f.w + '; the outer listing wins'); } return; } }
        const inner = whenNodes.filter((x) => { for (let q = x.node.parent; q; q = q.parent) if (q === node) return true; return false; });
        for (const x of inner) { whenNodes.splice(whenNodes.indexOf(x), 1); x.node.visible = true; if (x.w !== w && !warned && /localhost|127\.0\.0\.1/.test(location.hostname)) { warned = true; console.warn('life: ' + nameOf(x.node) + ' is listed for ' + x.w + ' inside ' + nameOf(node) + ' listed for ' + w + '; list only one of them'); } }
        swapMaterials(node, { fade: whenU[w] }, new Map());
        whenNodes.push({ node, w });
      };
      for (const k of Object.keys(L)) { const e = L[k]; const w = (e && typeof e === 'object' && (e.when === 'day' || e.when === 'night')) ? e.when : defaults[k]; if (!w) continue; for (const n of objsOf(e, [])) add(root.getObjectByName(n), w); }
      root.traverse((o) => { const n = nameOf(o); const m = /_(DAY|NIGHT)$/i.exec(n); if (m) add(o, m[1].toLowerCase()); });
    }
    function stepWhen() {
      whenU.day.value = 1 - night; whenU.night.value = night;
      for (const e of whenNodes) e.node.visible = whenU[e.w].value > 0.01;
      for (const k of contacts) { let q = k.o, w = null; while (q && !w) { const f = whenNodes.find((x) => x.node === q); if (f) w = f.w; q = q.parent; } if (w) k.mesh.material.uniforms.uA.value *= whenU[w].value; }
    }
    function stepCritterLife(t) {
      if (!root || !manifest) return;
      if (turtleGlow === null) { turtleGlow = root.getObjectByName('FX_glow_turtle_lantern') || false; }
      if (turtleGlow) { turtleGlow.getWorldPosition(_ps); FX.fxU.uRepel.value.set(_ps.x, _ps.y, _ps.z, 0.9); }
      if (mothObjs === null) { mothObjs = []; const ms = manifest.life && manifest.life.moths && Array.isArray(manifest.life.moths.moths) ? manifest.life.moths.moths : []; for (const m of ms) { const o = root.getObjectByName(m.object); if (o) mothObjs.push(o); } }
      if (mothObjs.length && windDir) for (const o of mothObjs) { o.getWorldPosition(_ps); const g = Math.min(1.6, WIND ? windAt(t, _ps, _gwv) : gustAt(t, _ps.dot(windDir))); if (g > 0.15) { const off = offsetOf(o).off; off.y += GUST.moth[0] * g; if (WIND) off.addScaledVector(_gwv, GUST.moth[1]); else off.addScaledVector(windDir, GUST.moth[1] * g); } }
    }
    let beamFrame = null;
    function beamFit() {
      if (!stage || !root) return;
      let beam = null, screen = null;
      root.traverse((o) => { if (!o.isMesh) return; const mn = (o.material && o.material.name) || ''; if (!beam && /BEAM/.test(mn)) beam = o; if (!screen && /^SCREEN/.test(nameOf(o)) && !FX.isSky(o)) screen = o; });
      if (!beam || !screen || !beam.geometry.attributes.aV) return;
      beam.updateWorldMatrix(true, false); screen.updateWorldMatrix(true, false);
      const g0 = beam.geometry, pa = g0.attributes.position, av = g0.attributes.aV, v = new THREE.Vector3(), A = new THREE.Vector3(), F = new THREE.Vector3();
      let nA = 0, nF = 0;
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(beam.matrixWorld); if (av.getX(i) < 0.1) { A.add(v); nA++; } else if (av.getX(i) > 0.9) { F.add(v); nF++; } }
      if (!nA || !nF) return;
      A.divideScalar(nA); F.divideScalar(nF);
      const sg = screen.geometry; sg.computeBoundingBox();
      const bb = sg.boundingBox, sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
      const ax = [0, 1, 2].sort((x, y) => sz.getComponent(x) - sz.getComponent(y)), thin = ax[0], ua = ax[1], wa = ax[2];
      const lensLocal = A.clone().applyMatrix4(screen.matrixWorld.clone().invert());
      const face = c.clone(); face.setComponent(thin, lensLocal.getComponent(thin) > c.getComponent(thin) ? bb.max.getComponent(thin) + 0.004 : bb.min.getComponent(thin) - 0.004);
      const C = face.clone().applyMatrix4(screen.matrixWorld);
      if (F.distanceTo(C) < 0.12 * A.distanceTo(C)) { beamFrame = { A, C, P: null }; return; }
      const rim = (t) => { const k = (t % 1) * 4, e = Math.floor(k), f = k - e; const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; const p0 = cs[e], p1 = cs[(e + 1) % 4]; const q = face.clone(); q.setComponent(ua, c.getComponent(ua) + (p0[0] + (p1[0] - p0[0]) * f) * sz.getComponent(ua) * 0.47); q.setComponent(wa, c.getComponent(wa) + (p0[1] + (p1[1] - p0[1]) * f) * sz.getComponent(wa) * 0.47); return q.applyMatrix4(screen.matrixWorld); };
      const N = 32, inv = beam.matrixWorld.clone().invert(), inv3 = new THREE.Matrix3().setFromMatrix4(inv);
      const axisW = C.clone().sub(A).normalize(), axisL = axisW.clone().applyMatrix3(inv3).normalize();
      const pos = new Float32Array(N * 2 * 3), aV = new Float32Array(N * 2), aRad = new Float32Array(N * 2 * 3), aAx = new Float32Array(N * 2 * 3), idx = [];
      const far = [];
      for (let i = 0; i < N; i++) far.push(rim(i / N));
      for (let i = 0; i < N; i++) {
        const q = far[i], off = q.clone().sub(C), near = A.clone().addScaledVector(off, 0.035);
        const rad = off.clone().addScaledVector(axisW, -off.dot(axisW)).normalize().applyMatrix3(inv3).normalize();
        [near, q].forEach((pw, k) => { const j = i * 2 + k; const pl = pw.clone().applyMatrix4(inv); pos.set([pl.x, pl.y, pl.z], j * 3); aV[j] = k; aRad.set([rad.x, rad.y, rad.z], j * 3); aAx.set([axisL.x, axisL.y, axisL.z], j * 3); });
        const i2 = (i + 1) % N; idx.push(i * 2, i2 * 2, i2 * 2 + 1, i * 2, i2 * 2 + 1, i * 2 + 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aV', new THREE.BufferAttribute(aV, 1));
      g.setAttribute('aRad', new THREE.BufferAttribute(aRad, 3)); g.setAttribute('aAx', new THREE.BufferAttribute(aAx, 3));
      g.setIndex(idx); g.computeBoundingSphere(); g.computeBoundingBox();
      beam.geometry = g; g0.dispose();
      beamFrame = { A, C, P: far };
    }
    function airSetup() {
      if (!stage || reduced) return;
      let beam = null; root.traverse((o) => { if (!beam && o.isMesh && /BEAM/.test(o.material && o.material.name || '')) beam = o; });
      const mk = (n, box, size, color) => {
        const pos = new Float32Array(n * 3), seed = []; const sz = box.getSize(new THREE.Vector3());
        for (let i = 0; i < n; i++) seed.push([Math.random(), Math.random(), Math.random(), Math.random() * 6.283, 0.3 + Math.random() * 0.7]);
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
        const m = new THREE.PointsMaterial({ map: moteTex(), size, sizeAttenuation: true, transparent: true, depthWrite: false, color: new THREE.Color(color), opacity: 0, blending: THREE.AdditiveBlending, vertexColors: true });
        const pts = new THREE.Points(g, m); pts.name = 'fx_air_' + color; pts.frustumCulled = false; scene.add(pts);
        return { pts, g, m, pos, seed, box: box.clone(), sz };
      };
      if (beam) { const b = new THREE.Box3().setFromObject(beam); if (!b.isEmpty()) dust = mk(beamFrame && beamFrame.P ? 64 : 36, b, 0.012, '#f4ead8'); }
      const hb = new THREE.Box3().setFromCenterAndSize(controls.target.clone().add(new THREE.Vector3(0, 1.4, 0)), new THREE.Vector3(11, 2.6, 7));
      pollen = mk(48, hb, 0.02, '#fff3d0');
    }
    function stepAir(t) {
      for (const a of [dust, pollen]) {
        if (!a) continue;
        const day = 1 - night, vis = a === dust ? 0.55 + 0.45 * night : day;
        a.m.opacity = (a === dust ? 0.5 : 0.55) * vis * partW * partW * (3 - 2 * partW); a.pts.visible = a.m.opacity > 0.01;
        if (!a.pts.visible) continue;
        if (a === dust && beamFrame && beamFrame.P) {
          const F = beamFrame, P = F.P, n = P.length;
          for (let i = 0; i < a.seed.length; i++) {
            const s0 = a.seed[i], sp = s0[4] * 0.03;
            const u = 0.1 + 0.86 * ((s0[0] + t * sp * 0.12) % 1), pk = (s0[1] + 0.03 * Math.sin(t * sp * 2.1 + s0[3]) + 1) % 1, rf = 0.82 * Math.sqrt(s0[2]) * (0.9 + 0.1 * Math.sin(t * sp * 1.7 + s0[3] * 2.0));
            const q = P[Math.floor(pk * n) % n];
            const x = F.A.x + (F.C.x - F.A.x) * u + (q.x - F.C.x) * u * rf, y = F.A.y + (F.C.y - F.A.y) * u + (q.y - F.C.y) * u * rf + 0.01 * Math.sin(t * 0.37 + s0[3]), z = F.A.z + (F.C.z - F.A.z) * u + (q.z - F.C.z) * u * rf;
            a.pos[i * 3] = x; a.pos[i * 3 + 1] = y; a.pos[i * 3 + 2] = z;
          }
          a.g.attributes.position.needsUpdate = true;
          continue;
        }
        for (let i = 0; i < a.seed.length; i++) {
          const s0 = a.seed[i], sp = s0[4] * (a === dust ? 0.04 : 0.07);
          const u = (s0[0] + t * sp * 0.2) % 1, v = (s0[1] + Math.sin(t * sp + s0[3]) * 0.08 + 1) % 1, w = (s0[2] + Math.cos(t * sp * 0.7 + s0[3]) * 0.08 + 1) % 1;
          a.pos[i * 3] = a.box.min.x + u * a.sz.x; a.pos[i * 3 + 1] = a.box.min.y + v * a.sz.y; a.pos[i * 3 + 2] = a.box.min.z + w * a.sz.z;
          const kc = a.g.attributes.color.array; _v.set(a.pos[i * 3], a.pos[i * 3 + 1], a.pos[i * 3 + 2]).project(camera); const kk = FX.keepAt(_v.x, _v.y, s0[1]); kc[i * 3] = kc[i * 3 + 1] = kc[i * 3 + 2] = kk;
        }
        a.g.attributes.position.needsUpdate = true; a.g.attributes.color.needsUpdate = true;
      }
    }
    function lifeSetup() {
      floaters = []; listeners = []; lifeTimesSetup();
      const seenF = new Set();
      root.traverse((o) => {
        const n = nameOf(o);
        if (/lily|lotus|boat|float_lantern|lilypad|G_float/i.test(n) && !/FX_/.test(n)) { let q = o.parent, up = false; while (q) { if (seenF.has(q)) { up = true; break; } q = q.parent; } if (!up) { seenF.add(o); floaters.push(o); } }
      });
      const ls = Array.isArray(manifest.listeners) ? manifest.listeners.map((x) => (typeof x === 'string' ? x : x && (x.head || x.object))).filter(Boolean) : null;
      if (ls) { for (const n of ls) { const o = root.getObjectByName(n) || root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n)); if (o) listeners.push(o); } }
      else root.traverse((o) => { if (/_head$/i.test(nameOf(o)) && !/FX_|sky_koi|water_koi|kf\d/i.test(nameOf(o))) listeners.push(o); });
      const ml = Array.isArray(manifest.listeners) ? manifest.listeners : [], hm = stage.home(), wq = new THREE.Quaternion(), hp = new THREE.Vector3();
      root.updateMatrixWorld(true);
      for (const o of listeners) {
        const e = ml.find((x) => x && typeof x === 'object' && (x.head === nameOf(o) || x.head === o.name));
        o.getWorldQuaternion(wq); o.getWorldPosition(hp);
        const f = e && Array.isArray(e.facing) ? STAGE.B2T(e.facing) : hm.pos.clone().sub(hp);
        f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, 1);
        o.userData._fwdL = f.normalize().applyQuaternion(wq.invert());
      }
    }
    function lifeEvent(kind, at, size = 1) {
      if (reduced || !stage || !at) return;
      if (!floaters) lifeSetup();
      const t = clock.elapsedTime;
      if (kind === 'ring') { lifeN.ring++; waves.push({ at: at.clone(), t0: t, size, hit: new Set() }); if (waves.length > 6) waves.shift(); }
      if (kind === 'splash' || kind === 'flight' || kind === 'star') {
        lifeLastBig = t;
        if (kind === 'splash') lifeN.leap++;
        const ex = kind === 'splash' ? bakedStartle() : null;
        if (kind === 'splash' && ex !== 'all') {
          const wp = new THREE.Vector3();
          for (const k of waterKoi) { if (ex && related(k, ex)) continue; k.getWorldPosition(wp); const dx = wp.x - at.x, dz = wp.z - at.z, dd = Math.hypot(dx, dz); if (dd < 3 && dd > 1e-3) { drifts.push({ obj: k, dir: new THREE.Vector3(dx / dd, 0, dz / dd).multiplyScalar(0.45 * (1 - dd / 3) + 0.1), t0: t + 0.1 + Math.random() * 0.25 }); lifeN.scatter++; } }
        }
        const wp2 = new THREE.Vector3();
        for (const o of listeners) { o.getWorldPosition(wp2); const d = wp2.distanceTo(at); if (d > 9) continue; looks.push({ o, at: at.clone(), t0: t + 0.25 + d * 0.06 + Math.random() * 0.25, dur: 2.2 + Math.random() * 0.8, amt: (0.06 + Math.random() * 0.05) * (kind === 'star' ? 0.6 : 1) }); lifeN.look++; }
      }
    }
    function bakedStartle() {
      const S = manifest.life && manifest.life.startles;
      if (!S) return null;
      if (!Array.isArray(S)) return S.baked ? 'all' : null;
      const L = +(manifest.life.loop) || 120, lt = mixerMain ? mixerMain.time % L : 0, ex = new Set();
      for (const s of S) {
        if (!s || !s.baked || !isFinite(+s.time)) continue;
        let d = +s.time - lt; d -= Math.round(d / L) * L;
        if (Math.abs(d) > 2.5) continue;
        if (!Array.isArray(s.objects)) return 'all';
        for (const n of s.objects) { const o = root.getObjectByName(n) || root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n)); if (o) ex.add(o); }
      }
      return ex.size ? ex : null;
    }
    function related(k, ex) {
      for (let q = k; q; q = q.parent) if (ex.has(q)) return true;
      for (const o of ex) for (let q = o.parent; q; q = q.parent) if (q === k) return true;
      return false;
    }
    const _qy = new THREE.Quaternion(), _yAx = new THREE.Vector3(0, 1, 0), _lp = new THREE.Vector3(), _lq = new THREE.Vector3();
    function stepLife(t) {
      if (!floaters || reduced) return;
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i], R = (t - w.t0) * 0.75 * 1.6 * w.size;
        if (t - w.t0 > 3.2) { waves.splice(i, 1); continue; }
        for (const o of floaters) { if (w.hit.has(o)) continue; o.getWorldPosition(_lp); const d = Math.hypot(_lp.x - w.at.x, _lp.z - w.at.z); if (d < R && d < 3.5) { w.hit.add(o); bobs.push({ o, t0: t, amp: 0.012 * w.size * (1 - d / 3.5) + 0.003, ph: Math.random() * 6.283 }); lifeN.bob++; } }
      }
      for (let i = bobs.length - 1; i >= 0; i--) {
        const b = bobs[i], u = t - b.t0;
        if (u > 2.6) { bobs.splice(i, 1); continue; }
        offsetOf(b.o).off.y += Math.sin(u * 7.0) * Math.exp(-u * 1.8) * b.amp;
      }
      if (windDir && floatWinds.length) for (const fw of floatWinds) {
        const off = offsetOf(fw.node).off; if (WIND) off.addScaledVector(fw.X, 0.05 * fw.amount); else off.addScaledVector(windDir, fw.x * 0.05 * fw.amount);
        if (WIND) off.y += 0.006 * Math.sin(t * 2.1 + fw.s) * Math.min(1, Math.abs(fw.x));
      }
      if (t - lastSmall > 5 && t - lifeLastBig > 3 && waterKoi.length && stage) {
        lastSmall = t + Math.random() * 3;
        const k = waterKoi[Math.floor(Math.random() * waterKoi.length)]; k.getWorldPosition(_lp);
        ripple(new THREE.Vector3(_lp.x, stage.wz, _lp.z), 0.4 + Math.random() * 0.15); lifeN.small++;
      }
    }
    const lifeTimes = [];
    function lifeTimesSetup() {
      const L = manifest.life || {};
      const at = (obj) => { const o = root.getObjectByName(obj); return o || null; };
      if (L.striders && Array.isArray(L.striders.striders)) for (const st of L.striders.striders) { const o = at(st.object); if (o && Array.isArray(st.darts)) lifeTimes.push({ loop: +L.striders.loop || 60, times: st.darts, o, kind: 'dart', prev: -1 }); }
      if (L.boats && Array.isArray(L.boats.boats)) for (const b of L.boats.boats) { const o = at(b.object); if (!o) continue; if (Array.isArray(b.rocks)) lifeTimes.push({ loop: +L.boats.loop || 120, times: b.rocks, o, kind: 'rock', prev: -1 }); if (Array.isArray(b.contacts)) lifeTimes.push({ loop: +L.boats.loop || 120, times: b.contacts, o, kind: 'contact', prev: -1 }); }
      const lns = L.lanterns ? (Array.isArray(L.lanterns) ? L.lanterns : Array.isArray(L.lanterns.lanterns) ? L.lanterns.lanterns : []) : [];
      for (const ln of lns) { const o = ln && typeof ln === 'object' ? at(ln.object) : null; if (o && Array.isArray(ln.rocks)) lifeTimes.push({ loop: +L.lanterns.loop || 120, times: ln.rocks, o, kind: 'rock', prev: -1 }); }
      if (L.frog && L.frog.object && Array.isArray(L.frog.hops)) { const o = at(L.frog.object); const air = isFinite(+L.frog.hop_air) ? +L.frog.hop_air : 0.25; if (o) lifeTimes.push({ loop: +L.frog.loop || 120, times: L.frog.hops.flatMap((h) => [+h, +h + air]), o, kind: 'hop', prev: -1 }); }
      if (L.dragonfly && Array.isArray(L.dragonfly.landings)) { const o = at(L.dragonfly.object); if (o) lifeTimes.push({ loop: +L.dragonfly.loop || 60, times: L.dragonfly.landings, o, kind: 'land', prev: -1 }); }
      const fl = root.getObjectByName('magpie_rail_1'); if (fl) lifeTimes.push({ o: fl, kind: 'flight', vy: 0, last: null, on: false });
      if (L.elder && L.elder.object) { const o = at(L.elder.object); if (o) lifeTimes.push({ o, kind: 'wake', next: 0 }); }
      const ms = L.mouths ? (Array.isArray(L.mouths) ? L.mouths : Array.isArray(L.mouths.mouths) ? L.mouths.mouths : []) : [];
      const mLoop = L.mouths && +L.mouths.loop > 0 ? +L.mouths.loop : 120;
      for (const mo of ms) { const o = mo.object ? at(mo.object) : null; const times = Array.isArray(mo.times) ? mo.times : [mo.time != null ? mo.time : mo.t].filter((x) => x != null); const pt = Array.isArray(mo.at) ? STAGE.B2T([+mo.at[0], +mo.at[1], 0]) : null; const pts = Array.isArray(mo.places) ? mo.places.map((p) => (Array.isArray(p) ? STAGE.B2T([+p[0], +p[1], 0]) : null)) : null; if ((o || pt || pts) && times.length) lifeTimes.push({ loop: +mo.loop || mLoop, times, o, pt, pts, size: isFinite(+mo.size) && +mo.size > 0 ? +mo.size : 0.22, kind: 'mouth', prev: -1 }); }
      for (const k of waterKoi) lifeTimes.push({ o: k, kind: 'shallow', next: 2 + Math.random() * 4 });
    }
    let lastStarSeen = -1, glanceNext = 0, lastSlideI = -1, starAsk = -1;
    function headsOf(names) {
      const out = [], ml = Array.isArray(manifest.listeners) ? manifest.listeners : [];
      for (const c of names) {
        const e = ml.find((x) => x && typeof x === 'object' && x.name === c), hn = e ? (e.head || e.object) : null;
        let hit = false;
        if (hn) for (const o of listeners || []) if (nameOf(o) === hn || o.name === THREE.PropertyBinding.sanitizeNodeName(hn)) { hit = true; if (!out.includes(o)) out.push(o); }
        if (!hit) for (const o of listeners || []) if (nameOf(o).startsWith(c) && !out.includes(o)) out.push(o);
      }
      return out;
    }
    let busyHeads = new Set();
    const lookW = new Map();
    function lookAt(objs, at, base = 0.35, dur = 2.0, amt = 0.12) { const t = clock.elapsedTime; for (const o of objs) { looks.push({ o, at: at.clone(), t0: t + base + Math.random() * 0.35, dur: dur * (0.85 + Math.random() * 0.3), amt: amt * (0.8 + Math.random() * 0.4) }); lifeN.look++; } }
    function greetArrival(v) { if (!listeners || reduced || !places[v]) return; const cast = Array.isArray(places[v].cast) ? places[v].cast : []; const hs = headsOf(cast); if (hs.length) lookAt(hs, camera.position, 0.15, 2.2, 0.14); }
    let interactions = null;
    function stepGlances(t) {
      if (!listeners || !listeners.length || reduced) return;
      if (view === 'explore' || view === 'welcome') {
        if (!glanceNext) glanceNext = t + 12 + Math.random() * 12;
        if (t >= glanceNext && t - lifeLastBig > 3) { glanceNext = t + 18 + Math.random() * 22; const o = listeners[Math.floor(Math.random() * listeners.length)]; lookAt([o], camera.position, 0, 1.8, 0.12); }
      }
      if (slides && slides.si !== lastSlideI) { const first = lastSlideI < 0; lastSlideI = slides.si; if (!first && screenObj) { screenObj.getWorldPosition(_lp); lookAt(headsOf(['rabbit', 'magpie_head']), _lp, 0.2, 1.6, 0.1); } }
      if (interactions === null) interactions = (Array.isArray(manifest.interactions) ? manifest.interactions : []).map((x) => ({ ...x, prev: -1 }));
      const busy = new Set();
      if (mixerMain) for (const it of interactions) {
        const L = +it.loop || 120, lt = mixerMain.time % L, mt = +it.t, dur = +it.duration || 1.8;
        if (!it.heads) it.heads = headsOf((Array.isArray(it.who) ? it.who : [it.who]).filter(Boolean).map(String));
        if ((((lt - mt + 0.45) % L) + L) % L < dur + 0.8) for (const h of it.heads) busy.add(h);
        if (it.prev >= 0 && (((lt - it.prev) % L) + L) % L < 1.5 && ((it.prev <= lt && it.prev < mt && mt <= lt) || (lt < it.prev && (mt > it.prev || mt <= lt)))) {
          const tgt = Array.isArray(it.at) ? STAGE.B2T(it.at) : (typeof it.at === 'string' && root.getObjectByName(it.at) ? root.getObjectByName(it.at).getWorldPosition(new THREE.Vector3()) : null);
          if (tgt) for (const o of listeners) {
            if (it.heads.includes(o)) continue;
            const d = o.getWorldPosition(_lp).distanceTo(tgt);
            if (d > 6 || d < 0.3) continue;
            looks.push({ o, at: tgt.clone(), t0: t + 0.3 + d * 0.08 + Math.random() * 0.35, dur: Math.min(3.2, Math.max(1.5, dur * 0.7)) * (0.85 + Math.random() * 0.3), amt: (0.07 + Math.random() * 0.04) * (1 - d / 9) });
            lifeN.look++;
          }
        }
        it.prev = lt;
      }
      busyHeads = busy;
    }
    function stepLifeTimes() {
      if (!mixerMain || reduced) return;
      for (const e of lifeTimes) {
        if (e.kind === 'wake') {
          const tt = clock.elapsedTime; if (tt < e.next) continue; e.next = tt + 1.1 + Math.random() * 0.6;
          e.o.getWorldPosition(_lp); if (stage && _lp.y > stage.wz - 0.35) ripple(new THREE.Vector3(_lp.x, stage.wz, _lp.z), 0.28 + 0.06 * Math.random());
          continue;
        }
        if (e.kind === 'flight') {
          e.o.getWorldPosition(_lp);
          if (e.last) { const sp = _lp.distanceTo(e.last) / Math.max(1e-3, glowDt || 0.016); if (sp > 1.2 && !e.on) { e.on = true; lifeEvent('flight', _lp.clone()); } else if (sp < 0.2) e.on = false; e.last.copy(_lp); } else e.last = _lp.clone();
          continue;
        }
        if (e.kind === 'shallow') {
          const tt = clock.elapsedTime; if (tt < e.next) continue; e.next = tt + 2.2 + Math.random() * 3;
          e.o.getWorldPosition(_lp); if (stage && _lp.y > stage.wz - 0.22 && _lp.y < stage.wz + 0.05) ripple(new THREE.Vector3(_lp.x, stage.wz, _lp.z), 0.2 + 0.05 * Math.random());
          continue;
        }
        if (e.o === null && !e.pt && !e.pts) continue;
        const lt = mixerMain.time % e.loop;
        if (e.prev >= 0 && (((lt - e.prev) % e.loop) + e.loop) % e.loop < 1.5) for (let mi = 0; mi < e.times.length; mi++) { const mt = +e.times[mi]; if ((e.prev <= lt && e.prev < mt && mt <= lt) || (lt < e.prev && (mt > e.prev || mt <= lt))) {
          if (e.o) e.o.getWorldPosition(_lp);
          if (e.kind === 'dart') ripple(new THREE.Vector3(_lp.x, stage.wz, _lp.z), 0.3);
          else if (e.kind === 'mouth') { const pp = e.pts && e.pts[mi] ? e.pts[mi] : e.pt; if (pp) _lp.copy(pp); ripple(new THREE.Vector3(_lp.x, stage.wz, _lp.z), e.size); }
          else if (e.kind === 'rock') { bobs.push({ o: e.o, t0: clock.elapsedTime, amp: 0.012, ph: 0 }); lifeN.bob++; }
          else if (e.kind === 'contact') { bobs.push({ o: e.o, t0: clock.elapsedTime, amp: 0.008, ph: 0 }); lifeN.bob++; ripple(new THREE.Vector3(_lp.x, stage.wz, _lp.z), 0.24); }
          else if (e.kind === 'hop' && Math.abs(_lp.y - stage.wz) < 0.45) ripple(new THREE.Vector3(_lp.x, stage.wz, _lp.z), mi % 2 ? 0.34 : 0.26);
          else if (e.kind === 'land' && Math.abs(_lp.y - stage.wz) < 0.6) ripple(new THREE.Vector3(_lp.x, stage.wz, _lp.z), 0.25);
        } }
        e.prev = lt;
      }
      if (stage && stage.lastStar !== undefined && stage.lastStar !== lastStarSeen) { lastStarSeen = stage.lastStar; if (lastStarSeen > 0) { lifeN.star++; lifeEvent('star', controls.target.clone().add(new THREE.Vector3(0, 9, -25))); } }
    }
    function addPos(o, off) {
      const u = o.userData;
      if (!u._pOut || !o.position.equals(u._pOut)) { u._pClip = (u._pClip || new THREE.Vector3()).copy(o.position); u._pOut = u._pOut || new THREE.Vector3(); }
      o.position.copy(u._pClip).add(off); u._pOut.copy(o.position);
    }
    function addQuat(o, q) {
      const u = o.userData;
      if (u._qFrame !== frameStamp) {
        if (!u._qOut || !o.quaternion.equals(u._qOut)) { u._qClip = (u._qClip || new THREE.Quaternion()).copy(o.quaternion); u._qOut = u._qOut || new THREE.Quaternion(); }
        o.quaternion.copy(u._qClip); u._qFrame = frameStamp;
      }
      o.quaternion.premultiply(q); u._qOut.copy(o.quaternion);
    }
    const lookS = new Map(), _lf = new THREE.Vector3(), _lpq = new THREE.Quaternion(), _lrq = new THREE.Quaternion();
    function stepLooks(t) {
      for (const L of looks) if (!lookW.has(L.o)) lookW.set(L.o, 1);
      for (const [o, w] of lookW) { const g = busyHeads.has(o) ? 0 : 1, nw = w + (g - w) * Math.min(1, glowDt / 0.18); if (g === 1 && nw > 0.999 && !looks.some((L) => L.o === o)) lookW.delete(o); else lookW.set(o, nw); }
      const dt = Math.min(0.05, Math.max(0, glowDt)), want = new Map();
      for (let i = looks.length - 1; i >= 0; i--) {
        const L = looks[i], u = (t - L.t0) / L.dur;
        if (u >= 1) { looks.splice(i, 1); continue; }
        if (!want.has(L.o)) want.set(L.o, 0);
        if (u < 0 || !L.o.userData._fwdL) continue;
        const e = Math.sin(Math.PI * u), ee = e * e * (3 - 2 * e) * (lookW.has(L.o) ? lookW.get(L.o) : 1);
        L.o.getWorldPosition(_lp); _lq.subVectors(L.at, _lp);
        L.o.getWorldQuaternion(_lrq); _lf.copy(L.o.userData._fwdL).applyQuaternion(_lrq);
        const fn = Math.hypot(_lf.x, _lf.z), tn = Math.hypot(_lq.x, _lq.z);
        if (fn < 0.2 || tn < 1e-3) continue;
        const ang = Math.atan2(_lf.z * _lq.x - _lf.x * _lq.z, _lf.x * _lq.x + _lf.z * _lq.z);
        const k = (1 - THREE.MathUtils.smoothstep(Math.abs(ang), 1.9, 2.7)) * THREE.MathUtils.smoothstep(fn, 0.2, 0.45);
        want.set(L.o, want.get(L.o) + THREE.MathUtils.clamp(ang, -L.amt, L.amt) * ee * k);
      }
      for (const o of want.keys()) if (!lookS.has(o)) lookS.set(o, { th: 0, om: 0 });
      for (const [o, st] of lookS) {
        const g = THREE.MathUtils.clamp(want.get(o) || 0, -0.24, 0.24), w0 = 9, n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
        for (let j = 0; j < n; j++) { st.om += (w0 * w0 * (g - st.th) - 2 * w0 * st.om) * h; st.om = THREE.MathUtils.clamp(st.om, -2.1, 2.1); st.th += st.om * h; }
        if (!want.has(o) && Math.abs(st.th) < 2e-4 && Math.abs(st.om) < 2e-3) { lookS.delete(o); continue; }
        if (Math.abs(st.th) < 1e-6 || !o.parent) continue;
        o.parent.getWorldQuaternion(_lpq); _lrq.setFromAxisAngle(_yAx, st.th);
        _qy.copy(_lpq).invert().multiply(_lrq).multiply(_lpq);
        addQuat(o, _qy);
      }
    }
    const raycaster = new THREE.Raycaster(), _ndc = new THREE.Vector2(), _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _hit = new THREE.Vector3();
    let secretObjs = null, chimeObj = null, chimeT = -99, chimeNext = 0, frameStamp = 0;
    const _chq = new THREE.Quaternion(), _chx = new THREE.Vector3(1, 0, 0);
    const BIG = new Set(['master', 'cat_black', 'cat_white', 'crane', 'rabbit', 'magpie_cinema', 'tree', 'koi']);
    const byName = (n) => root.getObjectByName(n) || root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n));
    const CHARS = new Set(['master', 'cat_black', 'cat_white', 'crane', 'rabbit', 'magpie']);
    function secretSetup() {
      secretObjs = [];
      const list = (Array.isArray(manifest.secrets) ? manifest.secrets : []).filter((sc) => sc && CHARS.has(sc.object));
      if (!list.some((sc) => sc.object === 'master') && byName('master')) list.push({ name: 'master', object: 'master', clip: clips.some((c) => c.name === 'tap_master') ? 'tap_master' : 'welcome_master' });
      for (const sc of list) {
        const o = byName(sc.object);
        if (!o) continue;
        const name = sc.object === 'magpie' ? 'magpie_cinema' : (sc.name || sc.object), ns = nodeSamples.find((x) => x.nm === sc.object);
        secretObjs.push({ name, obj: o, clip: sc.clip ? clips.find((c) => c.name === sc.clip) : null, kind: 'clip', crown: ns ? ns.pts : null, cr: NVOX * 0.95 });
      }
      chimeObj = byName('G_chime') || null;
      if (chimeObj) secretObjs.push({ name: 'chime', obj: chimeObj, chime: true, kind: 'chime' });
      const tree = byName('G_plum');
      if (tree) {
        const keys = new Set(), bk = new Set(), q = 0.12, v = new THREE.Vector3(); tree.updateMatrixWorld(true);
        tree.traverse((m) => { if (!m.isMesh || !m.geometry || !m.geometry.attributes.position || /fallen/i.test(nameOf(m))) return; const pa = m.geometry.attributes.position, bl = /blossom/i.test(nameOf(m)); for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); keys.add(voxKey(v.x, v.y, v.z, q)); if (bl) bk.add(voxKey(v.x, v.y, v.z, 0.2)); } });
        secretObjs.push({ name: 'tree', obj: tree, kind: 'tree', crown: voxPts(keys, q), cr: q * 0.8, bloom: voxPts(bk, 0.2) });
      }
      for (const k of waterKoi) secretObjs.push({ name: 'koi', obj: k, kind: 'koi' });
      for (const s2 of secretObjs) { s2.box = new THREE.Box3().setFromObject(s2.obj); s2.sph = new THREE.Sphere(); }
      occl = [];
      const own = new Set(); for (const s2 of secretObjs) s2.obj.traverse((o) => own.add(o));
      const near = secretObjs.filter((s2) => s2.kind !== 'koi' && !s2.box.isEmpty()).map((s2) => s2.box.getBoundingSphere(new THREE.Sphere()));
      root.traverse((o) => {
        if (!o.isMesh || own.has(o) || o.isInstancedMesh || o.isSkinnedMesh || !o.visible || !o.geometry || !o.geometry.attributes.position || o.geometry.attributes.position.count > 4000) return;
        const m = o.material; if (!m || Array.isArray(m) || m.transparent || m.alphaTest > 0 || m.alphaToCoverage || m.alphaHash || /SPRITE|GLOW|SCREEN|WATER|SKY/i.test(m.name || '') || FX.isSky(o)) return;
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const sp = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld);
        if (near.some((q) => q.center.distanceTo(sp.center) < q.radius + sp.radius + 1.0)) occl.push(o);
      });
    }
    let occl = [], pickDbg = null;
    function playOnce(clip) {
      if (!clip || !mixerMain || reduced) return false;
      return startOnce(clip, idlesFor(clip));
    }
    const REACT_IN = 0.3, REACT_OUT = 0.4, REACT_COOL = 0.6, cools = new Map(), clipNodes = new WeakMap();
    const OVR = /^(react|tap|welcome|greet|idle)_/, CHAR_LOOPS = new Set([...CHARS].map((c) => c + '_idle')), splitClips = new Set(), restOf = new Map(), keptTea = new Map();
    const TEA = /^master_(arm_[LR](_fore|_hand)?|pot|teacup|tea|stream)(_\d+)?$/, ARM_L = /^master_arm_L(_fore|_hand)?(_\d+)?$/;
    function trackConst(tr) { const v = tr.values, n = tr.getValueSize(); for (let k = n; k < v.length; k++) if (Math.abs(v[k] - v[k % n]) > 1e-4) return false; return true; }
    function atRest(tr, r) {
      const p = tr.name.slice(tr.name.lastIndexOf('.') + 1), v = tr.values, n = tr.getValueSize();
      if (p === 'quaternion' && n === 4) return 2 * Math.acos(Math.min(1, Math.abs(v[0] * r.q.x + v[1] * r.q.y + v[2] * r.q.z + v[3] * r.q.w) / Math.hypot(v[0], v[1], v[2], v[3]))) < 0.009;
      if (p === 'position' && n === 3) return Math.hypot(v[0] - r.p.x, v[1] - r.p.y, v[2] - r.p.z) < 2.5e-3;
      if (p === 'scale' && n === 3) return Math.max(Math.abs(v[0] - r.s.x), Math.abs(v[1] - r.s.y), Math.abs(v[2] - r.s.z)) < 5e-3 * Math.max(1, Math.abs(r.s.x));
      return false;
    }
    function prepOverlays(list) {
      const loopT = new Set();
      for (const c of list) if (CHAR_LOOPS.has(c.name)) for (const tr of c.tracks) {
        loopT.add(tr.name);
        const nd = tr.name.split('.')[0];
        if (!restOf.has(nd)) { const o = byName(nd); if (o) restOf.set(nd, { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }); }
      }
      for (const c of list) {
        if (!OVR.test(c.name)) continue;
        nodesOf(c);
        const idle = /^idle_/.test(c.name), kept = [];
        c.tracks = c.tracks.filter((tr) => {
          const nd = tr.name.split('.')[0];
          if (TEA.test(nd)) { if (idle && ARM_L.test(nd) && !trackConst(tr) && loopT.has(tr.name)) { kept.push(tr.name); return true; } return false; }
          if (loopT.has(tr.name) && trackConst(tr) && restOf.has(nd) && atRest(tr, restOf.get(nd))) return false;
          return true;
        });
        if (kept.length) keptTea.set(c, kept);
      }
    }
    function nodesOf(clip) { let n = clipNodes.get(clip); if (!n) { n = new Set(clip.tracks.map((tr) => tr.name.split('.')[0])); clipNodes.set(clip, n); } return n; }
    function overlaps(a, b) { if (a === b) return true; const nb = nodesOf(b); for (const n of nodesOf(a)) if (nb.has(n)) return true; return false; }
    function reactBusy(clip, soft) {
      const t = clock.elapsedTime;
      for (const r of activeReacts) if (overlaps(clip, r.clip) && !(soft && r.idle) && !r.stop) return true;
      for (const [c, until] of cools) { if (t >= until) { cools.delete(c); continue; } if (overlaps(clip, c)) return true; }
      return !!(crane && crane.pend.some((f) => overlaps(clip, f.clip))) || sipHold.some((h) => overlaps(clip, h.clip));
    }
    function startOnce(clip, idles, done, fin, fout, idle) {
      if (!clip || !mixerMain || reactBusy(clip, !idle)) { if (done) done(); return false; }
      if (!idle) for (const r of activeReacts) if (r.idle && !r.stop && overlaps(clip, r.clip)) { r.stop = clock.elapsedTime; r.w0 = r.a.getEffectiveWeight(); }
      if (crane && crane.busy && craneClip(clip)) { const f = () => startOnce(clip, idles, done, fin, fout); f.clip = clip; f.t = clock.elapsedTime; f.done = done; crane.pend.push(f); return true; }
      if (sipClash(clip)) { sipHold.push({ clip, idles, done, fin, fout, idle, t: clock.elapsedTime, v: view }); return true; }
      const fd = fadeFit(clip), cap = clip.duration * 0.45, fi = Math.min(Math.max(fin || REACT_IN, FADE_K * Math.sqrt(fd[0])), 1.2);
      const a = mixerMain.clipAction(clip);
      a.stopFading(); a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.setEffectiveWeight(0); a.play(); a.paused = true; a.time = 0;
      const lone = !/^idle_/.test(clip.name);
      activeReacts.push({ a, clip, idles, done, idle: !!idle, t0: clock.elapsedTime, hold: lone ? fi : fi * 0.5, tail: lone, fin: fi, fout: Math.min(Math.max(fout || REACT_OUT, FADE_K * Math.sqrt(fd[1])), lone ? 1.2 : cap), fd });
      return true;
    }
    const FADE_K = 1.8, ptsCache = new Map(), loopIp = new Map(), _pv = new THREE.Vector3();
    function ptsOf(ch) {
      let L = ptsCache.get(ch); if (L) return L; L = [];
      const rig = byName('RIG_' + ch);
      if (rig) rig.traverse((m) => { if (!m.isSkinnedMesh || !m.geometry || !m.geometry.attributes.position) return; const n = m.geometry.attributes.position.count, k = Math.min(24, n); for (let i = 0; i < k; i++) L.push(m, Math.floor((i + 0.5) * n / k)); });
      ptsCache.set(ch, L); return L;
    }
    function sampleInto(L, out) { for (let i = 0, o = 0; i < L.length; i += 2, o += 3) { L[i].getVertexPosition(L[i + 1], _pv).applyMatrix4(L[i].matrixWorld); out[o] = _pv.x; out[o + 1] = _pv.y; out[o + 2] = _pv.z; } }
    function loopValue(name, t) {
      let e = loopIp.get(name);
      if (e === undefined) { const a = loopActions.find((x) => splitClips.has(x.getClip()) && x.getClip().tracks[0].name === name); e = a ? { a, ip: a.getClip().tracks[0].createInterpolant(new Float32Array(a.getClip().tracks[0].getValueSize())) } : null; loopIp.set(name, e); }
      if (!e) return null;
      const L = e.a.getClip().duration; return e.ip.evaluate(((t % L) + L) % L);
    }
    function setTrack(o, p, v, i) { if (p === 'quaternion') o.quaternion.set(v[i], v[i + 1], v[i + 2], v[i + 3]).normalize(); else o[p].set(v[i], v[i + 1], v[i + 2]); }
    function fadeFit(clip) {
      if (!mixerMain || reduced) return [0, 0];
      const chs = [...charsOf(clip)], L = [];
      for (const ch of chs) L.push(...ptsOf(ch));
      const tops = chs.map((ch) => byName(ch)).filter(Boolean), keyed = [];
      for (const tr of clip.tracks) {
        const nd = tr.name.split('.')[0], p = tr.name.slice(tr.name.lastIndexOf('.') + 1), o = byName(nd);
        if (o && (p === 'quaternion' || p === 'position' || p === 'scale') && tr.getValueSize() === (p === 'quaternion' ? 4 : 3)) keyed.push({ tr, o, p, n: tr.getValueSize(), save: o[p].clone() });
      }
      if (!L.length || !keyed.length || !tops.length) return [0, 0];
      const N = L.length / 2 * 3, A = new Float32Array(N), B = new Float32Array(N);
      const upd = () => { for (const o of tops) o.updateMatrixWorld(true); };
      const dmax = () => { let m = 0; for (let i = 0; i < N; i += 3) m = Math.max(m, Math.hypot(A[i] - B[i], A[i + 1] - B[i + 1], A[i + 2] - B[i + 2])); return m; };
      try {
        upd(); sampleInto(L, A);
        for (const k of keyed) setTrack(k.o, k.p, k.tr.values, 0);
        upd(); sampleInto(L, B);
        const din = dmax(), tEnd = mixerMain.time + clip.duration;
        for (const k of keyed) { const v = loopValue(k.tr.name, tEnd); if (v) setTrack(k.o, k.p, v, 0); else k.o[k.p].copy(k.save); }
        upd(); sampleInto(L, A);
        for (const k of keyed) setTrack(k.o, k.p, k.tr.values, k.tr.values.length - k.n);
        upd(); sampleInto(L, B);
        return [din, dmax()];
      } finally { for (const k of keyed) k.o[k.p].copy(k.save); upd(); }
    }
    const sipHold = [];
    let sipS;
    function sipClash(clip) {
      if (sipS === undefined) {
        sipS = null;
        const T = manifest.tea, hb = manifest.look && manifest.look.master && manifest.look.master.bone;
        if (T && +T.loop > 0 && Array.isArray(T.sips) && T.sips.length && hb) { const a = T.sips.map((x) => +x[0]).filter(isFinite), b = T.sips.map((x) => +x[x.length - 1]).filter(isFinite); if (a.length && b.length) sipS = { L: +T.loop, a: Math.min(...a) - 1.6, b: Math.max(...b) + 1.2, hb: String(hb) }; }
      }
      if (!sipS || !mixerMain || !nodesOf(clip).has(sipS.hb)) return false;
      return hits(mixerMain.time % sipS.L, clip.duration + (/^idle_/.test(clip.name) ? 0.4 : 2.2), sipS.L, [[sipS.a, sipS.b]]);
    }
    function stepSipHold() {
      for (let i = sipHold.length - 1; i >= 0; i--) {
        const h = sipHold[i];
        if (clock.elapsedTime - h.t > 10 || (h.idle && h.v !== view)) { sipHold.splice(i, 1); if (h.done) h.done(); continue; }
        if (!sipClash(h.clip)) { sipHold.splice(i, 1); startOnce(h.clip, h.idles, h.done, h.fin, h.fout, h.idle); }
      }
    }
    function idlesFor(clip) {
      const nodes = nodesOf(clip), names = new Set(clip.tracks.map((tr) => tr.name));
      return loopActions.filter((a) => { const c = a.getClip(); if (c === clip) return false; if (splitClips.has(c)) return names.has(c.tracks[0].name); return c.tracks.some((tr) => nodes.has(tr.name.split('.')[0])); });
    }
    const clipByName = (n) => (n ? clips.find((c) => c.name === n) || null : null);
    let idleS = null, idleLast = -99, bigSpans = null;
    const placeOfCh = (ch) => { for (const v of PLACE_VIEWS) if (places[v] && Array.isArray(places[v].cast) && places[v].cast.includes(ch)) return v; return null; };
    const clipChars = new WeakMap();
    function charsOf(clip) {
      let s = clipChars.get(clip);
      if (!s) { s = new Set(); for (const n of nodesOf(clip)) for (const ch of CHARS) if (n.startsWith(ch + '_') && !n.startsWith('magpie_rail')) s.add(ch); clipChars.set(clip, s); }
      return s;
    }
    function placeOfClip(clip) { for (const ch of charsOf(clip)) { const v = placeOfCh(ch); if (v) return v; } return null; }
    let eyePairs = null;
    function eyeSetup() {
      eyePairs = [];
      const byOpen = new Map();
      for (const a of loopActions) {
        const c = a.getClip(); if (!splitClips.has(c)) continue;
        const tr = c.tracks[0], m = /^(.+?)_shut(_[A-Za-z0-9]+)?\.scale$/.exec(tr.name); if (!m) continue;
        const so = byName(tr.name.split('.')[0]), sr = restOf.get(tr.name.split('.')[0]); if (!so || !sr) continue;
        let hi = 1; for (let k = 0; k < tr.values.length; k += 3) hi = Math.max(hi, tr.values[k] / (sr.s.x || 1));
        if (hi <= 2) continue;
        if (!byOpen.has(m[1])) byOpen.set(m[1], []);
        byOpen.get(m[1]).push({ o: so, s0: sr.s.clone(), hi });
      }
      for (const [open, shut] of byOpen) {
        const pt = loopActions.map((x) => x.getClip()).find((x) => splitClips.has(x) && x.tracks[0].name === open + '.scale');
        const eo = byName(open), er = restOf.get(open);
        if (!pt || !eo || !er) continue;
        const ev = pt.tracks[0].values, lo = [1, 1, 1];
        for (let k = 0; k < ev.length; k += 3) for (let j = 0; j < 3; j++) lo[j] = Math.min(lo[j], ev[k + j] / (er.s.getComponent(j) || 1));
        const ax = lo.indexOf(Math.min(...lo));
        if (lo[ax] < 0.6) eyePairs.push({ e: eo, shut, e0: er.s.getComponent(ax), ax, lo: lo[ax] });
      }
    }
    function stepEyes() {
      if (eyePairs === null) { if (!root || !loopActions.length) return; eyeSetup(); }
      for (const p of eyePairs) {
        const a = Math.max(0, Math.min(1, (p.e.scale.getComponent(p.ax) / p.e0 - p.lo) / (1 - p.lo)));
        let b = 0; for (const q of p.shut) b = Math.max(b, Math.max(0, Math.min(1, (q.o.scale.x / q.s0.x - 1) / (q.hi - 1))));
        if (a > 0.25 && b > 0.04) { if (a >= b) { for (const q of p.shut) q.o.scale.copy(q.s0); } else p.e.scale.setComponent(p.ax, p.e0 * p.lo); }
      }
    }
    function idleSetup() {
      idleS = [];
      const I = manifest.idles && typeof manifest.idles === 'object' ? manifest.idles : null;
      if (!I || reduced || !mixerMain) return;
      for (const ch of Object.keys(I)) {
        const list = (Array.isArray(I[ch]) ? I[ch] : []).map(clipByName).filter(Boolean);
        if (list.length) idleS.push({ ch, pv: placeOfCh(ch), list, last: null, sp: new Map(), next: clock.elapsedTime + 14 + Math.random() * 26 });
      }
    }
    function hits(lt, dur, L, spans) {
      for (const [a0, a1] of spans) for (let k = -1; k <= 1; k++) { const s0 = a0 + k * L, s1 = a1 + k * L; if (lt < s1 && lt + dur > s0) return true; }
      return false;
    }
    function loopSpans(name, thr, out) {
      const a = loopActions.find((x) => splitClips.has(x.getClip()) && x.getClip().tracks[0].name === name);
      const nd = name.split('.')[0], r = restOf.get(nd);
      if (!a || !r) return;
      const tr = a.getClip().tracks[0], L = a.getClip().duration, ip = tr.createInterpolant(new Float32Array(tr.getValueSize())), p = name.slice(name.lastIndexOf('.') + 1), h = 0.1;
      let on = -1;
      for (let k = 0; k <= Math.ceil(L / h); k++) {
        const t = Math.min(L, k * h), v = ip.evaluate(t);
        const d = p === 'quaternion' ? 2 * Math.acos(Math.min(1, Math.abs(v[0] * r.q.x + v[1] * r.q.y + v[2] * r.q.z + v[3] * r.q.w) / Math.hypot(v[0], v[1], v[2], v[3]))) : p === 'position' ? Math.hypot(v[0] - r.p.x, v[1] - r.p.y, v[2] - r.p.z) : Math.max(Math.abs(v[0] - r.s.x), Math.abs(v[1] - r.s.y), Math.abs(v[2] - r.s.z));
        if (d > thr && on < 0) on = t;
        if ((d <= thr || t >= L) && on >= 0) { out(L, on - 0.35, t + 0.35); on = -1; }
      }
    }
    function idleSpans(e, clip) {
      let G = e.sp.get(clip);
      if (G) return G;
      G = [];
      const add = (L, a, b) => { L = +L; if (!(L > 0) || !isFinite(a) || !isFinite(b)) return; let g = G.find((x) => Math.abs(x[0] - L) < 1e-3); if (!g) G.push(g = [L, []]); g[1].push([a, b]); };
      const ch = e.ch;
      for (const it of interactions || []) {
        const who = (Array.isArray(it.who) ? it.who : [it.who]).map(String);
        if (who.includes(ch)) add(+it.loop || 120, +it.t - 0.25, +it.t + (+it.duration || 1.8) + 0.25);
      }
      if (ch === 'master' && manifest.tea && +manifest.tea.loop > 0) {
        const T = manifest.tea, L = +T.loop;
        if (Array.isArray(T.pour)) add(L, +T.pour[0] - 0.3, +T.pour[T.pour.length - 1] + 0.3);
        if (Array.isArray(T.sips)) for (const s2 of T.sips) if (Array.isArray(s2)) add(L, +s2[0] - 1.4, +s2[s2.length - 1] + 1.4);
      }
      if (/^cat_/.test(ch) && manifest.chess && Array.isArray(manifest.chess.moves)) {
        const c = manifest.chess, L = chessLoop || +c.loop || 120, san = Array.isArray(c.san) ? c.san : [];
        c.moves.forEach((m, i) => { if (/[x+#]|O-O/.test(String(san[i] || ''))) add(L, +m - 1.7, +m + 1.3); });
        if (c.reset) add(L, +c.reset.t0 - 0.6, +c.reset.t1 + 0.6);
        if (c.mate) add(L, +(c.mate.t != null ? c.mate.t : c.mate.tip_t0) - 1.7, c.reset ? +c.reset.t0 : +(c.mate.tip_t1 || c.mate.tip_t0) + 0.8);
      }
      if (ch === 'crane' && crane === null) craneSetup();
      if (ch === 'crane' && crane) for (const s of crane.strokes) add(s.act.getClip().duration, s.t0 - 0.7, s.t1 + 0.35);
      const lk = manifest.look && manifest.look[ch] && manifest.look[ch].bone ? byName(String(manifest.look[ch].bone)) : null;
      if (lk) for (let o = lk.parent; o && o !== root; o = o.parent) if (restOf.has(o.name)) loopSpans(o.name + '.position', 0.003, add);
      for (const n of keptTea.get(clip) || []) loopSpans(n, 0.035, add);
      e.sp.set(clip, G);
      return G;
    }
    function bigBusyIdle(t, D) {
      if (t - lifeLastBig < 4 || t - gustT < 9 || leapSoon(D + 1) || flightSoon(D + 1)) return true;
      if (bigSpans === null) {
        bigSpans = [];
        for (const it of interactions || []) {
          const who = new Set((Array.isArray(it.who) ? it.who : [it.who]).map(String).filter((w) => CHARS.has(w)));
          if (who.size >= 2) bigSpans.push([+it.loop || 120, +it.t - 0.5, +it.t + (+it.duration || 1.8) + 0.5]);
        }
      }
      for (const [L, a, b] of bigSpans) if (hits(mixerMain.time % L, D, L, [[a, b]])) return true;
      return false;
    }
    function idleBlocked(e, clip) {
      if (glide.t <= glide.dur || night !== nightTarget) return true;
      const t = clock.elapsedTime, D = clip.duration;
      if (t - idleLast < 2.5) return true;
      if (activeReacts.some((r) => !r.stop && (overlaps(clip, r.clip) || (e.pv && placeOfClip(r.clip) === e.pv)))) return true;
      if (hintS.view && hintS.view === e.pv) return true;
      if (/^cat_/.test(e.ch) && chessFade && chessFade.U.value < 0.999) return true;
      if (interactions === null || bigBusyIdle(t, D)) return true;
      for (const [L, sp] of idleSpans(e, clip)) if (hits(mixerMain.time % L, D + 0.35, L, sp)) return true;
      return false;
    }
    function stepIdles() {
      if (idleS === null) idleSetup();
      if (!idleS.length) return;
      const t = clock.elapsedTime;
      for (const e of idleS) {
        if (t < e.next) continue;
        const pool = (e.list.length > 1 ? e.list.filter((c) => c !== e.last) : e.list).slice().sort(() => Math.random() - 0.5), clip = pool.find((c) => !idleBlocked(e, c));
        if (!clip) { e.next = t + 0.1; continue; }
        if (startOnce(clip, idlesFor(clip), null, 0.5, 0.65, true)) { e.last = clip; idleLast = t; e.next = t + clip.duration + 22 + Math.random() * 38; }
        else e.next = t + 0.6;
      }
    }
    let greetPending = null;
    function greetSetFor(v) {
      const G = manifest.greet && typeof manifest.greet === 'object' ? manifest.greet : null;
      if (!G || !places[v]) return [];
      return (Array.isArray(places[v].cast) ? places[v].cast : []).map((c) => clipByName(G[c])).filter(Boolean);
    }
    function greetPlace(v) {
      if (reduced || !juice) return;
      for (const clip of greetSetFor(v)) startOnce(clip, idlesFor(clip), null, 0.45, 0.6, true);
    }
    const idleSum = new Map();
    function stepReacts() {
      const sm = (x) => x * x * x * (x * (x * 6 - 15) + 10), t = clock.elapsedTime;
      idleSum.clear();
      for (let i = activeReacts.length - 1; i >= 0; i--) {
        const r = activeReacts[i], D = r.clip.duration, u = t - r.t0, tau = Math.max(0, Math.min(D, u - r.hold)), at = Math.min(D, tau + glowDt);
        r.a.time = tau;
        const ein = sm(Math.max(0, Math.min(1, u / (r.fin || REACT_IN))));
        let fin, e;
        if (r.tail) { const v = (u + glowDt - r.hold - D) / (r.fout || REACT_OUT); fin = !r.a.enabled || v >= 1; e = fin ? 0 : ein * sm(Math.max(0, Math.min(1, 1 - v))); }
        else { fin = !r.a.enabled || tau >= D - 1e-4; e = fin ? 0 : ein * sm(Math.max(0, Math.min(1, (D - at) / (r.fout || REACT_OUT)))); }
        if (r.stop) { const k = Math.min(1, (t - r.stop) / 0.45); e = Math.min(e, r.w0 * sm(1 - k)); if (k >= 1) fin = true; }
        r.a.setEffectiveWeight(fin ? 0 : e);
        if (fin) { if (!r.stop) cools.set(r.clip, t + REACT_COOL); activeReacts.splice(i, 1); if (r.done) r.done(); for (const id of r.idles) if (!idleSum.has(id)) idleSum.set(id, 0); continue; }
        for (const id of r.idles) idleSum.set(id, (idleSum.get(id) || 0) + e);
      }
      for (const [id, e] of idleSum) id.setEffectiveWeight(Math.max(1e-4, 1 - Math.min(1, e)));
    }
    const hintS = { view: null, a: null, w: 0, target: 0, fading: [] };
    function hint(v) {
      if (!stage || !juice) return;
      v = PLACE_VIEWS.includes(v) && places[v] && finePointer() ? v : null;
      if (v === hintS.view) return;
      hintS.view = v;
      const near = v ? new Set(glowsNear(v)) : new Set();
      for (const g of glows) g.hint = near.has(g);
      if (hintS.a) { hintS.fading.push({ a: hintS.a, w: hintS.w, v: hintS.v || 0 }); hintS.a = null; hintS.w = 0; hintS.v = 0; }
      if (!v || !mixerMain || reduced) return;
      const clip = clips.find((c) => c.name === 'react_' + v);
      if (!clip) return;
      const a = mixerMain.clipAction(hintClip(clip));
      const was = hintS.fading.find((f) => f.a === a);
      hintS.fading = hintS.fading.filter((f) => f.a !== a);
      if (!was) { a.stopFading(); a.enabled = true; a.setLoop(THREE.LoopRepeat, Infinity); a.play(); a.paused = true; a.time = clip.duration * 0.42; a.setEffectiveWeight(0); }
      hintS.a = a; hintS.w = was ? was.w : 0; hintS.v = was ? was.v : 0;
    }
    const finePointer = () => { try { return typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches; } catch (e) { return false; } };
    const hintClips = new Map();
    function hintClip(clip) { let c = hintClips.get(clip); if (!c) { c = clip.clone(); c.name = clip.name + '__hint'; hintClips.set(clip, c); clipNodes.set(c, nodesOf(clip)); } return c; }
    const headBone = new Map();
    function headBusy(clip) {
      for (const ch of charsOf(clip)) {
        if (!headBone.has(ch)) { const L = manifest.look && manifest.look[ch]; headBone.set(ch, L && L.bone ? byName(String(L.bone)) : null); }
        const b = headBone.get(ch); if (b && busyHeads.has(b)) return true;
      }
      return false;
    }
    function springTo(o, g, dt) {
      const om = 6, n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
      for (let j = 0; j < n; j++) { o.v += (om * om * (g - o.w) - 2 * om * o.v) * h; o.w += o.v * h; }
      o.w = Math.max(0, Math.min(0.4, o.w));
    }
    function stepHint(dt) {
      dt = Math.min(0.05, Math.max(0, dt || 0));
      if (hintS.a) { const hc = hintS.a.getClip(), hg = (crane && crane.busy && craneClip(hc)) || activeReacts.some((r) => overlaps(hc, r.clip)) || headBusy(hc) ? 0 : 0.33; if (hintS.v === undefined) hintS.v = 0; springTo(hintS, hg, dt); hintS.a.setEffectiveWeight(hintS.w); }
      for (let i = hintS.fading.length - 1; i >= 0; i--) {
        const f = hintS.fading[i]; if (f.v === undefined) f.v = 0; springTo(f, 0, dt);
        f.a.setEffectiveWeight(f.w);
        if (f.w < 0.004 && Math.abs(f.v) < 0.02) { f.a.setEffectiveWeight(0); f.a.stop(); hintS.fading.splice(i, 1); }
      }
    }
    let greetUsed = false;
    function greet() {
      greetUsed = true;
      const wc = clips.find((c) => c.name === 'welcome_master');
      if (!wc || !mixerMain || reduced || !juice) return Promise.resolve();
      return new Promise((res) => {
        startOnce(wc, idlesFor(wc), res);
      });
    }
    function swingChime(tapped) { chimeT = clock.elapsedTime; chimeNext = chimeT + 15 + Math.random() * 25; if (tapped) ev('secret', { name: 'chime' }); else ev('chime', {}); }
    const RING = [[0, 0]]; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; RING.push([Math.cos(a) * 0.5, Math.sin(a) * 0.5]); } for (let k = 0; k < 8; k++) { const a = (k + 0.5) * Math.PI / 4; RING.push([Math.cos(a), Math.sin(a)]); }
    const _sp3 = new THREE.Vector3(), _spm = new THREE.Matrix4();
    function secretAt(cx, cy, tap = false) {
      if (!secretObjs) secretSetup();
      if (!secretObjs.length) return null;
      const rc = canvas.getBoundingClientRect(), margin = W() < 760 ? 12 : 5, x = cx - rc.left, y = cy - rc.top;
      camera.updateMatrixWorld();
      const cand = [];
      for (const s2 of secretObjs) {
        if (!s2.box) { s2.box = new THREE.Box3(); s2.sph = new THREE.Sphere(); }
        s2.box.setFromObject(s2.obj); if (s2.box.isEmpty()) continue;
        s2.box.getBoundingSphere(s2.sph);
        const r = s2.sph.radius * 1.3 + 0.05;
        _v.copy(s2.sph.center).project(camera); if (_v.z > 1) continue;
        const sx = (_v.x + 1) / 2 * W(), sy = (1 - _v.y) / 2 * H();
        _r.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(r).add(s2.sph.center).project(camera);
        const pr = Math.hypot((_r.x + 1) / 2 * W() - sx, (1 - _r.y) / 2 * H() - sy) + margin + 4;
        if (Math.hypot(x - sx, y - sy) <= pr) cand.push(s2);
      }
      if (!cand.length) return null;
      const lim = margin + 44, lim2 = lim * lim;
      _spm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      for (const s2 of cand) {
        if (!s2.crown) continue;
        const P = s2.crown; if (!s2.sub || s2.sub.length < P.length) s2.sub = new Float32Array(P.length);
        let n = 0;
        for (let i = 0; i < P.length; i += 3) { _sp3.set(P[i], P[i + 1], P[i + 2]).applyMatrix4(_spm); if (_sp3.z > 1) continue; const dx = (_sp3.x + 1) / 2 * rc.width - x, dy = (1 - _sp3.y) / 2 * rc.height - y; if (dx * dx + dy * dy <= lim2) { s2.sub[n++] = P[i]; s2.sub[n++] = P[i + 1]; s2.sub[n++] = P[i + 2]; } }
        s2.subN = n;
      }
      for (let k = 0; k < RING.length; k++) {
        _ndc.set(((cx + RING[k][0] * margin - rc.left) / rc.width) * 2 - 1, -((cy + RING[k][1] * margin - rc.top) / rc.height) * 2 + 1);
        raycaster.setFromCamera(_ndc, camera);
        let best = null, bd = 1e9, bp = null;
        for (const s2 of cand) {
          if (s2.crown) {
            const P = s2.sub, rr = s2.cr * s2.cr, ray = raycaster.ray;
            for (let i = 0; i < s2.subN; i += 3) { _tq.set(P[i], P[i + 1], P[i + 2]); if (ray.distanceSqToPoint(_tq) > rr) continue; const dd = _tq.sub(ray.origin).dot(ray.direction); if (dd > 0 && dd < bd) { bd = dd; best = s2; bp = ray.at(dd, new THREE.Vector3()); } }
            continue;
          }
          const h = raycaster.intersectObject(s2.obj, true); if (h.length && h[0].distance < bd) { bd = h[0].distance; best = s2; bp = h[0].point; }
        }
        if (best && occl.length) { const oh = raycaster.intersectObjects(occl, false); pickDbg = [best.name, +bd.toFixed(2), oh.length ? +oh[0].distance.toFixed(2) : null, oh.length ? nameOf(oh[0].object) : null, k]; if (oh.length && oh[0].distance < bd - (best.kind === 'tree' ? 0.12 : 0.06)) best = null; }
        if (best) {
          best._d = bd; best._hp = bp;
          return best;
        }
      }
      return null;
    }
    function moonAt(cx, cy) {
      if (!stage || !stage.moonMesh) return false;
      const rc = canvas.getBoundingClientRect(), mr = +((manifest.stage.moon && manifest.stage.moon.radius) || 1.45);
      _v.copy(stage.moonMesh.position).project(camera);
      if (_v.z < -1 || _v.z > 1) return false;
      const x = (_v.x + 1) / 2 * W(), y = (1 - _v.y) / 2 * H();
      _r.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(mr).add(stage.moonMesh.position).project(camera);
      const r = Math.hypot((_r.x + 1) / 2 * W() - x, (1 - _r.y) / 2 * H() - y);
      return Math.hypot(cx - rc.left - x, cy - rc.top - y) < r;
    }
    function tapTarget(cx, cy, tap) {
      if (!secretObjs) secretSetup();
      const s2 = secretAt(cx, cy, tap);
      if (s2) return s2;
      if (moonAt(cx, cy)) return { name: 'moon', kind: 'moon' };
      return null;
    }
    const touchCool = new Map(), _tq = new THREE.Vector3();
    let bigT = -99;
    function touchFree(key, t, cool) { const u = touchCool.get(key); if (u !== undefined && t < u) return false; touchCool.set(key, t + cool); return true; }
    function clipPlace(name) { for (const [n, v] of castPlace) if (name.includes(n)) return v; return null; }
    function bigBusy(t, who) {
      if (t < bigT) return true;
      const pv = who ? castPlace.get(who) || null : null;
      return activeReacts.some((r) => !r.idle && !r.stop && !/frog|turtle/i.test(r.clip.name) && (!pv || clipPlace(r.clip.name) === pv));
    }
    function tapSecret(cx, cy) {
      if (!stage || !juice) return false;
      const s2 = tapTarget(cx, cy, true);
      if (!s2) return false;
      const t = clock.elapsedTime, big = BIG.has(s2.name);
      if (reduced) { if (s2.kind === 'moon') { stage.shootStar(t); ev('secret', { name: 'moon' }); } return true; }
      if (big && (s2.kind === 'tree' || s2.kind === 'koi' ? t < bigT : bigBusy(t, nameOf(s2.obj)))) return true;
      let ok = false;
      if (s2.kind === 'chime') { if (touchFree('chime', t, 1.2)) { swingChime(true); ok = 'quiet'; } }
      else if (s2.kind === 'moon') { if (touchFree('moon', t, 1.0)) { stage.shootStar(t); starAsk = t; ok = true; } }
      else if (s2.kind === 'clip') ok = playOnce(s2.clip);
      else if (s2.kind === 'tree') { if (touchFree('tree', t, 3.2) && petalsP) { _tq.copy(s2._hp || s2.obj.getWorldPosition(_tq)); crownUnder(s2, cx, cy, _tq); ok = FX.petalBurst(petalsP, 16 + Math.floor(Math.random() * 4), _tq, { sc: 3.3, spread: 0.7, fall: 3.2 }) > 0; if (ok) { bigT = t + 2.2; treeShake(_tq, t); } } }
      else if (s2.kind === 'koi') { if (touchFree('koi', t, 2.5)) { koiDart(s2.obj, waterHit(cx, cy)); bigT = t + 1.8; ok = true; } }
      if (ok === true) ev('secret', { name: s2.name });
      return true;
    }
    function crownUnder(s2, cx, cy, out) {
      const P = s2.bloom; if (!P || !P.length) return out;
      const rc = canvas.getBoundingClientRect(), x = cx - rc.left, y = cy - rc.top, w = W(), h = H(), col = [];
      camera.updateMatrixWorld();
      for (let i = 0; i < P.length; i += 3) { _mc.set(P[i], P[i + 1], P[i + 2]).project(camera); if (_mc.z < -1 || _mc.z > 1) continue; const sx = (_mc.x + 1) / 2 * w, sy = (1 - _mc.y) / 2 * h; if (Math.abs(sx - x) < 12 && sy >= y - 12) col.push([sy, i]); }
      col.sort((a, b) => a[0] - b[0]);
      let cur = y, pick = -1; for (const [sy, i] of col) { if (sy - cur > 18) break; cur = Math.max(cur, sy); pick = i; }
      if (pick >= 0) out.set(P[pick], P[pick + 1] - 0.1, P[pick + 2]);
      return out;
    }
    function treeShake(at, t) {
      _wa.setFromMatrixColumn(camera.matrixWorld, 0); _wa.y = 0; if (_wa.lengthSq() < 1e-6) _wa.set(1, 0, 0); _wa.normalize();
      let near = null, nd = Infinity;
      for (const w of winds) if (w.kind === 'limb' && /plum/i.test(nameOf(w.node))) { const d = w.p.distanceTo(at); if (d < nd) { nd = d; near = w; } }
      for (const w of winds) {
        if (w.kind !== 'limb' || !/plum/i.test(nameOf(w.node))) continue;
        const k = w === near ? 1 : 0.55, sg = Math.random() < 0.5 ? -1 : 1;
        w.sh = { t0: t, a: (0.05 + 0.025 * Math.random()) * k * Math.min(1.4, w.len / 4.5), d: _wa.clone().multiplyScalar(sg), ph: Math.random() * 0.6 };
        w.V.addScaledVector(_wa, sg * 0.45 * k);
      }
    }
    const swayU = { uSwP: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, -99, 0, 0)) }, uSwD: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) }, uSwL: { value: [1, 1, 1, 1] } };
    let hangs = null;
    function koiDart(k, at) {
      k.getWorldPosition(_tq);
      const from = at || _tq.clone().add(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5));
      const dx = _tq.x - from.x, dz = _tq.z - from.z, dd = Math.hypot(dx, dz) || 1;
      drifts.push({ obj: k, dir: new THREE.Vector3(dx / dd, 0, dz / dd).multiplyScalar(0.45), t0: clock.elapsedTime });
      ripple(new THREE.Vector3(_tq.x, stage.wz, _tq.z), 0.5);
    }
    let lampSeq = null, lampList = null;
    function lampSetup() {
      lampList = [];
      const L = Array.isArray(manifest.lanterns) ? manifest.lanterns.map(String) : null, G = manifest.lantern_glows && typeof manifest.lantern_glows === 'object' ? manifest.lantern_glows : {};
      const byGlow = new Map(glows.map((g) => [nameOf(g.node), g]));
      const used = new Set();
      if (L) for (const n of L) {
        const gs = (Array.isArray(G[n]) ? G[n] : []).map((x) => byGlow.get(String(x))).filter(Boolean);
        for (const g of gs) used.add(g);
        const U = { value: night }, node = root.getObjectByName(n) || root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n));
        if (node) swapMaterials(node, { lit: U }, new Map());
        lampList.push({ gs, U: node ? U : null });
      }
      const home = places.about ? places.about.at3 : new THREE.Vector3();
      const rest = glows.filter((g) => !used.has(g) && /lantern/i.test(nameOf(g.node))).sort((a, b) => a.node.getWorldPosition(_lu).distanceTo(home) - b.node.getWorldPosition(_hl).distanceTo(home));
      for (const g of rest) lampList.push({ gs: [g], U: null });
    }
    function lampsSwitch(to, t) {
      if (lampList === null) lampSetup();
      if (to >= 1 && !reduced && juice) { lampSeq = { t0: t }; for (const e of lampList) { for (const g of e.gs) g.lit = 0; if (e.U) e.U.value = 0; } if (stage && stage.setLamps) stage.setLamps(0); }
      else { lampSeq = null; for (const e of lampList) for (const g of e.gs) g.lit = null; if (stage && stage.setLamps) stage.setLamps(1); }
    }
    function stepLamps(t) {
      if (!lampList) return;
      if (!lampSeq) { for (const e of lampList) if (e.U) e.U.value = night; return; }
      const N = Math.max(1, lampList.length), span = 1.2, u0 = t - lampSeq.t0 - 0.15;
      let all = true;
      lampList.forEach((e, i) => {
        const k = THREE.MathUtils.smoothstep(u0 - i * span / N, 0, 0.32);
        if (k < 1) all = false;
        for (const g of e.gs) g.lit = k;
        if (e.U) e.U.value = Math.max(night, k);
      });
      if (stage && stage.setLamps) stage.setLamps(THREE.MathUtils.smoothstep(u0, 0, span + 0.3));
      if (all && u0 > span + 0.4) { lampSeq = null; for (const e of lampList) for (const g of e.gs) g.lit = null; if (stage && stage.setLamps) stage.setLamps(1); }
    }
    let headL = null;
    const cursor = { x: 0, y: 0, on: false }, _hl = new THREE.Vector3(), _hf = new THREE.Vector3(), _hq = new THREE.Quaternion(), _hq2 = new THREE.Quaternion(), _hs = new THREE.Vector3(), _hn = new THREE.Vector2();
    function headSetup() {
      headL = [];
      const L = manifest.look && typeof manifest.look === 'object' ? manifest.look : null;
      if (!L) return;
      for (const ch of Object.keys(L)) {
        const e = L[ch]; if (!e || !e.bone) continue;
        const b = root.getObjectByName(String(e.bone)) || root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(String(e.bone)));
        if (!b || !b.parent) continue;
        const f = Array.isArray(e.facing) ? STAGE.B2T(e.facing) : null;
        if (f) { f.y = 0; if (f.lengthSq() < 1e-6) continue; f.normalize(); }
        headL.push({ ch, b, f, yL: THREE.MathUtils.degToRad(isFinite(+e.yaw) ? +e.yaw : 20), pL: THREE.MathUtils.degToRad(isFinite(+e.pitch) ? +e.pitch : 10), y: 0, vy: 0, p: 0, vp: 0 });
      }
    }
    function stepHeads(dt) {
      if (headL === null) headSetup();
      if (!headL.length) return;
      const here = PLACE_VIEWS.includes(view) && places[view] && Array.isArray(places[view].cast) ? places[view].cast : [], live = cursor.on && finePointer() && layoutOf() === 'desk' && glide.t > glide.dur && !reduced;
      const h = Math.min(0.05, Math.max(0, dt || 0)), w0 = 6.5;
      for (const e of headL) {
        let ty = 0, tp = 0;
        if (live && here.includes(e.ch) && e.f && !busyHeads.has(e.b) && !activeReacts.some((r) => nodesOf(r.clip).has(e.b.name))) {
          e.b.getWorldPosition(_hl);
          const rc = canvas.getBoundingClientRect(); _hn.set(((cursor.x - rc.left) / rc.width) * 2 - 1, -((cursor.y - rc.top) / rc.height) * 2 + 1);
          raycaster.setFromCamera(_hn, camera);
          const dist = camera.position.distanceTo(_hl); raycaster.ray.at(dist * 0.4, _hf).sub(_hl);
          const yawOf = (d) => Math.atan2(e.f.z * d.x - e.f.x * d.z, e.f.x * d.x + e.f.z * d.z), pitOf = (d) => Math.atan2(d.y, Math.hypot(d.x, d.z));
          _hs.copy(camera.position).sub(_hl);
          if (Math.hypot(_hf.x, _hf.z) > 1e-4) { let dy = yawOf(_hf) - yawOf(_hs); dy = Math.atan2(Math.sin(dy), Math.cos(dy)); ty = 1.6 * dy; tp = 1.6 * (pitOf(_hf) - pitOf(_hs)); }
          ty = THREE.MathUtils.clamp(ty, -e.yL, e.yL); tp = THREE.MathUtils.clamp(tp, -e.pL, e.pL);
        }
        const n = Math.max(1, Math.ceil(h * 240)), hh = h / n;
        for (let j = 0; j < n; j++) { e.vy += (w0 * w0 * (ty - e.y) - 2 * w0 * e.vy) * hh; e.y += e.vy * hh; e.vp += (w0 * w0 * (tp - e.p) - 2 * w0 * e.vp) * hh; e.p += e.vp * hh; }
        if (Math.abs(e.y) < 1e-5 && Math.abs(e.p) < 1e-5) continue;
        _hs.set(-e.f.z, 0, e.f.x).applyAxisAngle(_yAx, e.y);
        _hq.setFromAxisAngle(_yAx, e.y); _hq2.setFromAxisAngle(_hs, e.p); _hq2.multiply(_hq);
        e.b.parent.getWorldQuaternion(_lpq); _qy.copy(_lpq).invert().multiply(_hq2).multiply(_lpq); addQuat(e.b, _qy);
      }
    }
    let lure = null;
    const _lu = new THREE.Vector3();
    function stepLure(t) {
      if (!lure) return;
      const u = t - lure.t0;
      if (u > 12) { lure = null; return; }
      const env = THREE.MathUtils.smoothstep(u, 0.3, 4.5) * (1 - THREE.MathUtils.smoothstep(u, 7.5, 12));
      for (const k of waterKoi) {
        const e = offsetOf(k); k.getWorldPosition(_lu); _lu.sub(e.off);
        const dx = lure.at.x - _lu.x, dz = lure.at.z - _lu.z, dd = Math.hypot(dx, dz);
        if (dd > 5 || dd < 0.45) continue;
        const m = Math.min(0.85, (dd - 0.45) * 0.45) * env * (1 - dd / 5.5);
        e.off.x += dx / dd * m; e.off.z += dz / dd * m;
      }
    }
    function hangSetup() {
      hangs = [];
      for (const g of glows) {
        const n = nameOf(g.node); if (!/lantern/i.test(n) || /float|turtle|water|rock/i.test(n)) continue;
        const p = g.node.getWorldPosition(new THREE.Vector3()); if (p.y < stage.wz + 1.6) continue;
        const sc = g.node.getWorldScale(new THREE.Vector3()).x, L = Math.max(0.25, Math.min(0.7, 0.75 * sc)) * 1.15;
        hangs.push({ g, p, L, s: windDir ? p.dot(windDir) : 0, x: 0, v: 0, X: new THREE.Vector3(), V: new THREE.Vector3(), ph: Math.random() * 6.283 });
        if (hangs.length >= 4) break;
      }
    }
    function stepHangs(t, dt) {
      if (hangs === null) { if (!windDir) return; hangSetup(); }
      const on = tier < 3 && windDir;
      const n = Math.max(1, Math.ceil((dt || 0) / (1 / 120))), h = (dt || 0) / n, w = 4.2, z = WIND ? 0.17 : 0.12;
      hangs.forEach((e, i) => {
        if (on && WIND) { windDrive(t, e.p, _wq, 'lamp'); const m = _wq.length(); if (m > 1.8) _wq.multiplyScalar(1.8 / m); _wq.multiplyScalar(0.17); }
        else if (on) { const m = windAt(t, e.p, _wq); if (m > 1.8) _wq.multiplyScalar(1.8 / m); _wq.multiplyScalar(0.17); } else _wq.set(0, 0, 0);
        for (let j = 0; j < n; j++) { e.V.x += (w * w * (_wq.x - e.X.x) - 2 * z * w * e.V.x) * h; e.V.z += (w * w * (_wq.z - e.X.z) - 2 * z * w * e.V.z) * h; e.X.x += e.V.x * h; e.X.z += e.V.z * h; }
        e.x = e.X.length();
        if (e.x < 1e-4 && e.V.length() < 1e-4 && !on) { swayU.uSwP.value[i].w = 0; e.g.sw = null; return; }
        swayU.uSwP.value[i].set(e.p.x, e.p.y + 0.5 * e.L, e.p.z, 0.52 * e.L); swayU.uSwL.value[i] = 1.45 * e.L;
        swayU.uSwD.value[i].set(e.X.x, 0, e.X.z).multiplyScalar(e.L);
        e.g.sw = (e.g.sw || new THREE.Vector3()).copy(swayU.uSwD.value[i]).multiplyScalar(0.5);
      });
    }
    function waterHit(cx, cy) {
      const rc = canvas.getBoundingClientRect();
      _ndc.set(((cx - rc.left) / rc.width) * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1);
      raycaster.setFromCamera(_ndc, camera);
      _plane.constant = -stage.wz;
      return raycaster.ray.intersectPlane(_plane, _hit) ? _hit.clone() : null;
    }
    function tapWater(cx, cy) {
      if (!stage || !juice) return;
      const at = waterHit(cx, cy);
      if (!at) return;
      const dWater = raycaster.ray.origin.distanceTo(at);
      const hits = raycaster.intersectObject(root, true);
      if (hits.length && hits[0].distance < dWater - 0.05) return;
      const t = clock.elapsedTime;
      let near = null, nd = 0.9;
      for (const k of waterKoi) { k.getWorldPosition(_tq); const d = Math.hypot(_tq.x - at.x, _tq.z - at.z); if (d < nd && _tq.y > stage.wz - 0.6) { nd = d; near = k; } }
      if (near && !reduced && t >= bigT && touchFree('koi', t, 2.5)) { ripple(at.clone()); koiDart(near, at); bigT = t + 1.8; ev('secret', { name: 'koi' }); return; }
      ripple(at.clone());
      if (!reduced) lure = { at: at.clone(), t0: t };
      if (touchFree('pond', t, 0.25)) ev('secret', { name: 'pond' });
    }
    let glowDt = 1 / 60, juiceT = 0;
    function stepJuice(t) {
      glowDt = Math.min(0.1, Math.max(0, t - juiceT)); juiceT = t;
      for (const g of glows) {
        const pulse = g.pulse !== undefined ? Math.max(0, 1 - Math.abs((t - g.pulse) - 0.2) / 0.2) : 0;
        const hov = g.hover && !g.nearScreen ? 1 : 0;
        const goal = Math.max(pulse, hov, g.hint ? 0.6 : 0);
        g.boost += (goal - g.boost) * (1 - Math.exp(-14 * glowDt));
      }
      for (const e of offs.values()) e.off.set(0, 0, 0);
      for (let i = reacts.length - 1; i >= 0; i--) {
        const r = reacts[i], u = (t - r.t0) / 0.6;
        if (u >= 1) { reacts.splice(i, 1); continue; }
        const hop = Math.sin(Math.PI * Math.min(1, u * 1.25)) * (1 - u) * 0.05;
        for (const o of r.objs) offsetOf(o).off.y += hop;
      }
      for (let i = drifts.length - 1; i >= 0; i--) {
        const d = drifts[i], u = (t - d.t0) / 3.0;
        if (u >= 1) { drifts.splice(i, 1); continue; }
        offsetOf(d.obj).off.addScaledVector(d.dir, Math.sin(Math.PI * u));
      }
      if (freezeT === null) stepLure(t);
      if (freezeT === null) { stepLife(t); stepLifeTimes(); stepGlances(t); stepCritterLife(t); }
      stepAir(t);
      for (const [o, e] of offs) { if (e.base) o.position.copy(e.base).add(e.off); else addPos(o, e.off); }
      stepLooks(t);
      if (WIND && windDir && floatWinds.length && !reduced) for (const fw of floatWinds) {
        if (!fw.node.parent) continue;
        const a = THREE.MathUtils.clamp(fw.v * 0.1, -0.14, 0.14) * fw.amount;
        if (Math.abs(a) < 1e-4) continue;
        fw.node.parent.getWorldQuaternion(_lpq); _lrq.setFromAxisAngle(_yAx, a); _qy.copy(_lpq).invert().multiply(_lrq).multiply(_lpq); addQuat(fw.node, _qy);
      }
      stepHeads(glowDt);
      if (secretObjs === null && root) secretSetup();
      if (freezeT === null && WIND) stepHangs(t, glowDt);
      if (chimeObj && !reduced) {
        if (!chimeNext) chimeNext = t + 15 + Math.random() * 25;
        if (!windDir && t >= chimeNext) swingChime();
        if (!chimeObj.userData.baseRot && !animatedRot.has(chimeObj.name)) chimeObj.userData.baseRot = chimeObj.rotation.clone();
        const u = t - chimeT, sw = u >= 0 && u < 3.0 ? Math.sin(u * 9.0) * Math.exp(-u * 1.6) * 0.18 : 0;
        if (chimeObj.userData.baseRot) { chimeObj.rotation.copy(chimeObj.userData.baseRot); chimeObj.rotation.x += sw; } else { _chq.setFromAxisAngle(_chx, sw); addQuat(chimeObj, _chq); }
      }
      stepReacts();
      if (sipHold.length) stepSipHold();
      if (!reduced && freezeT === null) stepIdles();
      for (const r of ripples) { const a = t - r.t0; r.mesh.material.uniforms.uAge.value = a > 2.3 ? 99 : a; }
    }
    let chessLoop = 0, chessPrev = -1, leapAction = null, leapPrev = 0, leapLoop = 0, leapPrevT = -1, risePrevT = -1;
    const riseObjs = [], _rv = new THREE.Vector3();
    let leapObj = null, leapT = -99;
    const leapDrops = [];
    function stepEvents() {
      if (!mixerMain) return;
      const moves = manifest.chess && Array.isArray(manifest.chess.moves) ? manifest.chess.moves : null;
      if (moves && chessLoop > 0) {
        const lt = mixerMain.time % chessLoop;
        if (chessPrev >= 0) moves.forEach((m, i) => { const mt = +m; if ((chessPrev <= lt && chessPrev < mt && mt <= lt) || (lt < chessPrev && (mt > chessPrev || mt <= lt))) { ev('chessMove', { index: i, time: mt }); if (listeners && Math.random() < 0.4) catsGlance(); } });
        chessPrev = lt;
      }
      const leaps = manifest.koi && Array.isArray(manifest.koi.leaps) ? manifest.koi.leaps : null;
      const kL = (manifest.koi && +manifest.koi.leap_loop) || leapLoop || chessLoop || 60;
      const rises = manifest.koi && Array.isArray(manifest.koi.rises) ? manifest.koi.rises : null;
      if (riseObjs.length) {
        for (const o of riseObjs) {
          o.getWorldPosition(_rv); const d = _rv.y - stage.wz, up = o.userData._rd !== undefined && o.userData._rd < -0.07 && d >= -0.07;
          if (up) ripple(_rv.clone(), 0.55);
          o.userData._rd = d;
        }
      } else if (rises) {
        const L = (manifest.koi && +(manifest.koi.rise_loop || manifest.koi.leap_loop)) || kL, lt = mixerMain.time % L;
        if (risePrevT >= 0) rises.forEach((m) => { const mt = +m; if ((risePrevT <= lt && risePrevT < mt && mt <= lt) || (lt < risePrevT && (mt > risePrevT || mt <= lt))) ripple(new THREE.Vector3(0, stage.wz, 0), 0.55); });
        risePrevT = lt;
      }
      if (leapObj) {
        leapObj.getWorldPosition(_rv); const d = _rv.y - stage.wz, pd = leapObj.userData._ld;
        if (pd !== undefined && pd < 0 && d >= 0) ripple(new THREE.Vector3(_rv.x, stage.wz, _rv.z), 0.8);
        if (pd !== undefined && pd >= 0 && d < 0) {
          const at = new THREE.Vector3(_rv.x, stage.wz, _rv.z);
          ripple(at, 0.95);
          lifeEvent('splash', at);
          for (const pr of leapDrops) { const hd = pr.pts.parent; if (hd && hd.parent) { hd.parent.updateWorldMatrix(true, false); hd.position.copy(hd.parent.worldToLocal(at.clone())); } }
          leapT = clock.elapsedTime;
          ev('koiLeap', { index: 0, time: +(mixerMain.time % kL).toFixed(3), name: nameOf(leapObj) });
        }
        leapObj.userData._ld = d;
        const u = clock.elapsedTime - leapT;
        const g = u >= 0 && u < 1.3 ? Math.min(1, u / 0.06) * (1 - Math.max(0, (u - 0.8) / 0.5)) : 0;
        for (const pr of leapDrops) pr.gate = g * partW;
      } else {
        const leaps = manifest.koi && Array.isArray(manifest.koi.leaps) ? manifest.koi.leaps : null;
        for (const pr of leapDrops) pr.gate = 0;
        if (leaps) {
          const L = kL, lt = mixerMain.time % L;
          if (leapPrevT >= 0) leaps.forEach((m, i) => { const mt = +m; if ((leapPrevT <= lt && leapPrevT < mt && mt <= lt) || (lt < leapPrevT && (mt > leapPrevT || mt <= lt))) ev('koiLeap', { index: i, time: mt, name: 'G_koiLeap' }); });
          leapPrevT = lt;
        } else if (leapAction) { const lt = leapAction.time; if (lt < leapPrev) ev('koiLeap', { name: leapAction.getClip().name }); leapPrev = lt; }
      }
    }
    let lastInput = performance.now(), swayAmt = 0, swayRamp = 0;
    const onInput = () => { lastInput = performance.now(); if (ready && !enteredOnce) entered(); };
    const _sp = new THREE.Vector3(), _sq = new THREE.Quaternion(), _sv = new THREE.Vector3(), _sAxis = new THREE.Vector3();

    let petalPts = null;
    function livingWater() {
      const nm = (o) => o.userData.name || o.name;
      while (ripples.length < 3) makeRipple();
      root.traverse((o) => { if (/koiRise/i.test(nm(o)) && !(o.parent && /koiRise/i.test(nm(o.parent)))) riseObjs.push(o); });
      leapObj = root.getObjectByName((manifest.koi && manifest.koi.leap_object) || 'G_koiLeap') || null;
      const plum = root.getObjectByName('G_plum_blossom') || root.getObjectByName('G_plum');
      if (plum) {
        const c = new THREE.Box3().setFromObject(plum); const pc = new THREE.Vector3();
        if (c.isEmpty()) plum.getWorldPosition(pc); else c.getCenter(pc);
        const N = 9, pos = new Float32Array(N * 3), seed = new Float32Array(N * 4);
        for (let i = 0; i < N; i++) {
          const a = rnd() * 6.283, r = 1.6 + rnd() * 1.8;
          pos[i * 3] = pc.x + Math.cos(a) * r; pos[i * 3 + 1] = stage.wz + 0.012; pos[i * 3 + 2] = pc.z + Math.sin(a) * r;
          seed[i * 4] = rnd(); seed[i * 4 + 1] = rnd(); seed[i * 4 + 2] = rnd(); seed[i * 4 + 3] = rnd();
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
        const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: FX.fxU.uTime, uPx: FX.fxU.uPx, uNight: FX.fxU.uNight },
          vertexShader: `uniform float uTime; uniform float uPx; attribute vec4 aSeed; varying float vA; varying float vR;
            void main() { vec3 p = position; float t = uTime * 0.05 + aSeed.x * 6.283;
              p.x += sin(t + aSeed.y * 3.0) * 0.35; p.z += cos(t * 0.8 + aSeed.z * 3.0) * 0.25;
              vA = 0.55 + 0.45 * sin(uTime * 0.07 + aSeed.w * 6.283); vR = aSeed.y * 6.283 + uTime * 0.04;
              vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = 0.09 * uPx; }`,
          fragmentShader: `uniform float uNight; varying float vA; varying float vR;
            void main() { vec2 c = gl_PointCoord - 0.5; float cs = cos(vR), sn = sin(vR); c = mat2(cs, -sn, sn, cs) * c; c.y *= 1.9;
              float a = (1.0 - smoothstep(0.32, 0.5, length(c))) * vA * mix(0.8, 0.55, uNight); if (a < 0.01) discard;
              gl_FragColor = vec4(vec3(0.96, 0.92, 0.9) * mix(1.0, 0.7, uNight), a); \n#include <colorspace_fragment>\n }` });
        petalPts = new THREE.Points(g, m); petalPts.frustumCulled = false; scene.add(petalPts);
      }
      const avoid = [];
      root.traverse((o) => { if (o.isMesh && /^SCREEN/.test(o.material && o.material.name || '') && !FX.isSky(o)) avoid.push(new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3())); });
      for (const v of PLACE_VIEWS) if (places[v]) avoid.push(places[v].at3);
      let made = 0;
      root.traverse((o) => {
        if (made >= 3 || !/reed/i.test(nm(o)) || (o.parent && /reed/i.test(nm(o.parent)))) return;
        const b = new THREE.Box3().setFromObject(o); if (b.isEmpty()) return;
        const c = b.getCenter(new THREE.Vector3()); c.y = b.max.y + 0.35;
        if (avoid.some((a) => a.distanceTo(c) < 1.5)) return;
        const holder = new THREE.Group(); holder.position.copy(c); holder.scale.set(0.8, 0.4, 0.8); scene.add(holder);
        FX.addParticles(holder, 'fireflies', { count: 5, when: 'night' }, rnd);
        const pr = FX.particles[FX.particles.length - 1]; pr.u.uSize.value = 0.09;
        made++;
      });
    }

    const _v = new THREE.Vector3(), _r = new THREE.Vector3();
    const markerList = PLACE_VIEWS.map((v) => ({ view: v, x: 0, y: 0, visible: false, line: 14 }));
    const PIN_DISC = { experience: 'place_chess_sign_disc', projects: 'place_cinema_sign_disc' };
    const PIN_AT = {
      desk: { about: ['head', 0.22], experience: ['head', 0.3, 0, 'cat_white'], projects: ['disc'], education: ['clockTop'] },
      portrait: { about: ['head', 0.22], experience: ['head', 0.3, 0, 'cat_white'], projects: ['screen'], education: ['clock', 0.15, 0.4] },
      landscape: { about: ['head', 0.34], experience: ['disc'], projects: ['disc'], education: ['clockTop'] },
    };
    const PIN_LINE = { desk: {}, portrait: { education: 20 }, landscape: { experience: 80 } }, PIN_LINE0 = 14;
    const _mc = new THREE.Vector3(), _pm4 = new THREE.Matrix4(), renderVP = new THREE.Matrix4(), castPlace = new Map();
    let vpReady = false, pinPts = null, pinL = null, pinHideT = 0;
    function pinSetup() {
      const heads = {};
      for (const sm of nodeSamples) {
        if (!(MAIN[sm.v] || []).includes(sm.nm)) continue;
        const P = sm.pts; let x = 0, z = 0, y = -Infinity, n = 0;
        for (let i = 0; i < P.length; i += 3) { x += P[i]; z += P[i + 2]; y = Math.max(y, P[i + 1]); n++; }
        if (n) heads[sm.nm] = new THREE.Vector3(x / n, y, z / n);
      }
      const cb = new THREE.Box3(), ck = keepPts.education;
      if (ck) for (let i = 0; i < ck.length; i += 3) cb.expandByPoint(_mc.set(ck[i], ck[i + 1], ck[i + 2]));
      let sb = null;
      root.traverse((o) => { if (!sb && o.isMesh && /^SCREEN/.test((o.material && o.material.name) || '') && !FX.isSky(o)) sb = new THREE.Box3().setFromObject(o); });
      const base = (v, kind, who) => {
        if (kind === 'head') return heads[who || (MAIN[v] || [])[0]] || null;
        if (kind === 'disc' && PIN_DISC[v]) {
          const o = byName(PIN_DISC[v]);
          if (!o) return null;
          const sp = new THREE.Box3().setFromObject(o).getBoundingSphere(new THREE.Sphere());
          return sp.center.clone().add(_mc.set(0, sp.radius, 0));
        }
        if ((kind === 'clock' || kind === 'clockTop') && !cb.isEmpty()) { const c = cb.getCenter(new THREE.Vector3()); if (kind === 'clockTop') c.y = cb.max.y + 0.02; return c; }
        if (kind === 'screen' && sb) { const c = sb.getCenter(new THREE.Vector3()); c.y = sb.max.y + 0.04; return c; }
        return null;
      };
      pinPts = {};
      for (const L of Object.keys(PIN_AT)) {
        pinPts[L] = {};
        for (const v of PLACE_VIEWS) {
          const a = PIN_AT[L][v], b = a ? base(v, a[0], a[3]) : null;
          pinPts[L][v] = b ? b.clone().add(_mc.set(a[2] || 0, a[1] || 0, 0)) : (places[v] ? places[v].at3.clone() : null);
        }
      }
      for (const v of PLACE_VIEWS) if (places[v] && Array.isArray(places[v].cast)) for (const n of places[v].cast) castPlace.set(n, v);
    }
    function markers() {
      const w = W(), h = H();
      if (ready && !pinPts) pinSetup();
      const L = layoutOf(), P = pinPts && pinPts[L], now = performance.now();
      if (L !== pinL) { if (pinL !== null) pinHideT = now + 450; pinL = L; }
      const hide = now < pinHideT || (pinHideT > 0 && glide.t <= glide.dur);
      if (!hide) pinHideT = 0;
      if (vpReady) _pm4.copy(renderVP); else { camera.updateMatrixWorld(); _pm4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); }
      for (const mk of markerList) {
        const a = P && P[mk.view];
        if (!a || !ready) { mk.visible = false; continue; }
        _mc.copy(a).applyMatrix4(_pm4);
        mk.x = Math.round((_mc.x + 1) / 2 * w * 100) / 100; mk.y = Math.round((1 - _mc.y) / 2 * h * 100) / 100;
        mk.line = (PIN_LINE[L] && PIN_LINE[L][mk.view]) || PIN_LINE0;
        mk.visible = !hide && _mc.z > -1 && _mc.z < 1 && mk.x >= 0 && mk.x <= w && mk.y >= 0 && mk.y <= h;
      }
      return markerList.map((m) => ({ view: m.view, x: m.x, y: m.y, visible: m.visible, line: m.line }));
    }
    function placeAt(cx, cy, touch, tg) {
      if (ready && !pinPts) pinSetup();
      if (tg && tg.kind === 'clip') { const pv = castPlace.get(nameOf(tg.obj)); if (pv && pv !== view) return pv; }
      return null;
    }
    let down = null, hovered = null, hoverRayT = 0, hoverSecret = null, hoverSent = '', hoverTg = null;
    const held = new Set();
    const onDown = (e) => { onInput(); held.add(e.pointerId); down = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    const onRelease = (e) => { held.delete(e.pointerId); };
    const onUp = (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
      down = null;
      if (moved > 8 || dt > 600) return;
      const v = placeAt(e.clientX, e.clientY, e.pointerType === 'touch', stage && ready ? tapTarget(e.clientX, e.clientY, true) : null);
      if (v && v !== view) { ev('pick', { view: v }); react(v); if (opt.onPick) opt.onPick(v); }
      else if (!tapSecret(e.clientX, e.clientY)) { if (v) { ev('pick', { view: v }); if (opt.onPick) opt.onPick(v); } else tapWater(e.clientX, e.clientY); }
    };
    const onMove = (e) => {
      onInput();
      if (e.pointerType === 'touch') return;
      cursor.x = e.clientX; cursor.y = e.clientY; cursor.on = true;
      const now = performance.now();
      if (stage && ready && now - hoverRayT > 120) { hoverRayT = now; hoverTg = tapTarget(e.clientX, e.clientY, false); hoverSecret = juice && hoverTg ? hoverTg.name : null; }
      const v = placeAt(e.clientX, e.clientY, false, hoverTg);
      canvas.style.cursor = v || hoverSecret ? 'pointer' : '';
      const key = (v || '') + '|' + (hoverSecret || '');
      if (v !== hovered) {
        hovered = v;
        if (juice) { const near = v ? new Set(glowsNear(v)) : new Set(); for (const g of glows) g.hover = near.has(g); }
      }
      if (key !== hoverSent) { hoverSent = key; if (opt.onHover) opt.onHover(v, { tappable: !!(v || hoverSecret), name: v || hoverSecret || null }); }
    };
    const onLeave = () => { cursor.on = false; hoverSecret = null; hoverTg = null; if (hoverSent !== '' || hovered !== null) { hovered = null; hoverSent = ''; canvas.style.cursor = ''; if (juice) for (const g of glows) g.hover = false; if (opt.onHover) opt.onHover(null, { tappable: false, name: null }); } };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('wheel', onInput, { passive: true });
    window.addEventListener('keydown', onInput);
    window.addEventListener('pointerup', onRelease);
    window.addEventListener('pointercancel', onRelease);

    let modeWaiters = [];
    let dayLoading = null;
    async function ensureDay() {
      if (dayTex) return;
      if (!dayLoading) dayLoading = atlas('day').then((t) => { if (disposed) { t.dispose(); return; } dayTex = t; if (baked) setBakedMap(t); if (upgrade.includes('day')) setTimeout(upgradeAtlases, 400); }, (e) => { dayLoading = null; throw e; });
      await dayLoading;
    }
    async function upgradeAtlases() {
      for (const mode of upgrade.splice(0)) {
        try {
          const big = await getTex(mode + atlasExt);
          if (disposed) { big.dispose(); return; }
          while (!disposed && (glide.t <= glide.dur || performance.now() - lastInput < 700)) await new Promise((r) => setTimeout(r, 150));
          if (disposed) { big.dispose(); return; }
          renderer.initTexture(big);
          const sh = baked && baked.userData.shader;
          if (mode === 'night') { const old = nightTex; nightTex = big; if (sh) sh.uniforms.tNight.value = big; if (old && old !== dayTex) old.dispose(); }
          else { const old = dayTex; dayTex = big; if (baked) { for (const m of [baked, ...bakedVariants]) m.map = big; } if (old) old.dispose(); }
          if (sh && sh.uniforms.uMinLod) sh.uniforms.uMinLod.value = Math.max(0, 1.4 + Math.log2(((big.image && big.image.width) || 2048) / 2048));
        } catch (e) {  }
      }
    }
    let prepared = false;
    async function prepareOther() {
      if (prepared || disposed || !stage || !ready) return;
      prepared = true;
      const idleFrame = () => new Promise((r) => { const go = () => { if (disposed) return r(); if (glide.t <= glide.dur || performance.now() - lastInput < 500) setTimeout(go, 250); else (window.requestIdleCallback || ((f) => setTimeout(f, 60)))(() => requestAnimationFrame(() => r()), { timeout: 1000 }); }; go(); });
      try {
        await idleFrame();
        if (!dayTex) await ensureDay();
        if (disposed) return;
        await idleFrame(); if (disposed) return;
        for (const tx of [dayTex, nightTex]) if (tx) { renderer.initTexture(tx); await idleFrame(); if (disposed) return; }
        const texs = new Set();
        for (const e of whenNodes) e.node.traverse((o) => { if (o.isMesh && o.material && !Array.isArray(o.material)) for (const k of ['map', 'alphaMap', 'emissiveMap']) if (o.material[k]) texs.add(o.material[k]); });
        for (const tx of texs) { renderer.initTexture(tx); await idleFrame(); if (disposed) return; }
        if (renderer.compileAsync && whenNodes.length) {
          for (const [, e] of fgNodes) fgBlend(e, !e.blend);
          const was = whenNodes.map((e) => e.node.visible);
          for (const e of whenNodes) e.node.visible = true;
          let pr = null; try { pr = renderer.compileAsync(scene, camera); } catch (e) { pr = null; }
          whenNodes.forEach((e, i) => { e.node.visible = was[i]; });
          for (const [, e] of fgNodes) fgBlend(e, !e.blend);
          if (pr) await pr.catch(() => {});
        }
      } catch (e) { prepared = false; }
    }
    let enteredOnce = false;
    function catsGlance() {
      const b = headsOf(['cat_black']), w = headsOf(['cat_white']);
      if (!b.length || !w.length) return;
      const pb = b[0].getWorldPosition(new THREE.Vector3()), pw = w[0].getWorldPosition(new THREE.Vector3());
      lookAt(b, pw, 0.6, 1.5, 0.13); lookAt(w, pb, 0.75, 1.4, 0.13);
    }
    function firstStar() {
      let seen = false; try { seen = sessionStorage.getItem('koi-star') === '1'; } catch (e) { seen = true; }
      if (seen || reduced || !juice) return;
      setTimeout(() => { if (disposed || nightTarget < 1 || night < 0.99 || !stage) return; stage.shootStar(clock.elapsedTime); try { sessionStorage.setItem('koi-star', '1'); } catch (e) { void e; } }, 3800 + Math.random() * 1500);
    }
    function entered() {
      if (enteredOnce || !stage) return;
      enteredOnce = true;
      firstStar();
      setTimeout(kickSlides, 600);
      setTimeout(() => { prepareOther(); }, 2600);
    }
    function setMode(m) {
      const target = m === 'day' ? 0 : 1;
      return (async () => {
        if (target === 0 && !dayTex) await ensureDay();
        if (disposed) return;
        nightTarget = target;
        if (night === nightTarget) return;
        await new Promise((res) => modeWaiters.push(res));
      })();
    }

    async function load() {
      progress(0.02);
      const glbP = getBuf(id + '.glb', true, onGlbHead); glbP.catch(() => {});
      const mb = await getBuf('manifest.json');
      manifest = JSON.parse(new TextDecoder().decode(mb));
      try { if (params.get('mf')) { const o = JSON.parse(params.get('mf')); for (const k of Object.keys(o)) manifest[k] = o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) && manifest[k] && typeof manifest[k] === 'object' ? Object.assign({}, manifest[k], o[k]) : o[k]; } } catch (e) {  }
      if (manifest.pack && manifest.pack.atlas === 'webp') atlasExt = '.webp';
      bitmapAtlas = !!(manifest.stage && typeof manifest.stage === 'object');
      mfReady();
      if (manifest.pack && manifest.pack.geometry === 'draco') dracoStart().catch(() => {});
      const show = FX.makeSlides(manifest, getScreenTex);
      if (show.ready && show.ready.catch) show.ready.catch(() => {});
      mark('manifest');
      progress(0.06);
      const nightP = atlas('night', true); nightP.catch(() => {});
      const dayP = night === 0 || opt.preloadDay ? atlas('day', true) : null; if (dayP) dayP.catch(() => {});
      const glb = await glbP;
      if (new Uint8Array(glb)[0] !== 0x67) throw new Error('missing glb');
      if (dayP) dayTex = await dayP;
      nightTex = await nightP;
      progress(0.86);
      bgDay = hexToRgb(manifest.bgDay); bgNight = hexToRgb(manifest.bgNight);
      if (manifest.stage && typeof manifest.stage === 'object') {
        juice = params.get('juice') !== '0';
        if (softGL && params.get('tier') === null) renderer.setPixelRatio(1);
        stage = STAGE.setupStage({ scene, renderer, stage: manifest.stage, params, night, size: () => [W(), H()], date: opt.date, title: !!opt.title, noMirror: softGL && params.get('mirror') !== '1' });
        camera = stage.camera;
        const rgb = hexToRgb('#' + stage.clear.getHexString());
        bgNight = rgb; bgDay = stage.clearDay ? hexToRgb('#' + stage.clearDay.getHexString()) : rgb.map((v, i) => Math.min(255, v + [23, 26, 31][i]));
      }
      applyBg(true);
      let screenTex = null;
      if (manifest.screenImage) { try { screenTex = await getScreenTex(manifest.screenImage); } catch (e) {  } }
      await show.ready;
      FX.slidesStart(show, screenTex);
      slides = show;
      if (show.loadRest) show.onLoaded = (t) => { const t0 = performance.now(); try { renderer.initTexture(t); } catch (e) { void e; } if (window.__slideUp) window.__slideUp.push([Math.round(t0), +(performance.now() - t0).toFixed(1)]); };
      mark('parse start');
      const gltf = await (await gltfLoader(glb)).parseAsync(glb, '');
      mark('parsed');
      await slice();
      root = gltf.scene;
      FX.setFxProps(manifest.fx);
      setupMaterials(root, dayTex || nightTex, nightTex, screenTex, show);
      scene.add(root);
      mark('materials');
      await slice();
      const fx = [];
      root.traverse((o) => { const m = /^FX_([a-z]+)_/i.exec(o.name || ''); if (m && !o.isMesh) fx.push([o, m[1].toLowerCase()]); });
      if (!reduced) for (const [o, k] of fx) {
        addFx(o, k, fxProps(o, manifest));
        if (k === 'drops' && /koiLeap|splash/i.test(o.userData.name || o.name)) { const pr = FX.particles[FX.particles.length - 1]; pr.gate = 0; leapDrops.push(pr); }
        await maybeSlice();
      }
      await slice();
      await paperSetup();
      await slice();
      clips = gltf.animations || [];
      if (manifest.stage) for (const clip of clips) {
        let t0 = Infinity;
        for (const tr of clip.tracks) if (tr.times.length) t0 = Math.min(t0, tr.times[0]);
        if (!(t0 > 1e-6 && t0 < 0.5)) continue;
        for (const tr of clip.tracks) { tr.times = tr.times.slice(); for (let k = 0; k < tr.times.length; k++) tr.times[k] -= t0; }
        clip.duration = Math.max(0, clip.duration - t0);
      }
      const ambientOnly = reduced && !!manifest.stage;
      const AMBIENT = /sky_koi|water_koi/i, NOT_AMBIENT = /leap|riser|rise/i;
      if ((!reduced || ambientOnly) && gltf.animations && gltf.animations.length) {
        const mixer = new THREE.AnimationMixer(root);
        if (manifest.stage && !ambientOnly) prepOverlays(gltf.animations);
        for (const clip of gltf.animations) {
          if (ambientOnly && (!AMBIENT.test(clip.name) || NOT_AMBIENT.test(clip.name))) continue;
          if (OVR.test(clip.name)) {
            const ra = mixer.clipAction(clip); ra.setLoop(THREE.LoopRepeat, Infinity); ra.setEffectiveWeight(0); ra.play(); continue;
          }
          if (manifest.stage && !ambientOnly && CHAR_LOOPS.has(clip.name)) {
            for (const tr of clip.tracks) { const sub = new THREE.AnimationClip(clip.name + '|' + tr.name, clip.duration, [tr]); splitClips.add(sub); const sa = mixer.clipAction(sub).setLoop(THREE.LoopRepeat, Infinity); sa.play(); loopActions.push(sa); }
            for (const tr of clip.tracks) { if (/\.position$/.test(tr.name)) animatedNames.add(tr.name.split('.')[0]); if (/\.(quaternion|rotation)$/.test(tr.name)) animatedRot.add(tr.name.split('.')[0]); }
            continue;
          }
          const a = mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity); a.play(); loopActions.push(a);
          if (/koi.?leap/i.test(clip.name)) { if (!leapAction) leapAction = a; leapLoop = Math.max(leapLoop, clip.duration); }
          if (/chess/i.test(clip.name)) chessLoop = Math.max(chessLoop, clip.duration);
          for (const tr of clip.tracks) { if (/\.position$/.test(tr.name)) animatedNames.add(tr.name.split('.')[0]); if (/\.(quaternion|rotation)$/.test(tr.name)) animatedRot.add(tr.name.split('.')[0]); }
        }
        mixers.push(mixer);
        mixerMain = mixer;
      }
      if (manifest.chess && +manifest.chess.loop > 0) chessLoop = +manifest.chess.loop;
      await slice();
      root.updateMatrixWorld(true);
      FX.skySetup(root, skyMeshes);
      root.updateMatrixWorld(true);
      progress(0.95);
      if (stage) {
        await slice();
        stage.applyControls(controls);
        bounds = new THREE.Box3().setFromObject(root);
        await slice();
        zRef = 900 / (2 * stage.d0 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
        let src = manifest.places && typeof manifest.places === 'object' ? manifest.places : PLACES_FALLBACK;
        try { if (params.get('places')) src = Object.assign({}, src, JSON.parse(params.get('places'))); } catch (e) {  }
        for (const v of PLACE_VIEWS) {
          const p = src[v] || PLACES_FALLBACK[v];
          if (p && Array.isArray(p.at) && Array.isArray(p.look)) places[v] = { at: p.at, look: p.look, label: p.label || '', radius: p.radius, height: p.height, cast: p.cast, fit: p.fit, trim: p.trim, fade: p.fade, at3: STAGE.B2T(p.at), look3: STAGE.B2T(p.look) };
        }
        if (juice && !reduced) livingWater();
        await slice();
        mirrorSkip();
        await slice();
        contactSetup();
        await slice();
        beamFit(); await slice();
        if (juice && !reduced) { lifeSetup(); await slice(); airSetup(); await slice(); }
        whenSetup(); await slice();
        if (juice) { windSetup(); await slice(); }
        if (!reduced) chessFadeSetup();
        fgSetup(); rimSetup(); lampSetup();
        await slice();
        root.traverse((o) => { if (/water_koi/i.test(o.userData.name || o.name) && !/tail/i.test(o.userData.name || o.name) && !(o.parent && /water_koi/i.test(o.parent.userData.name || o.parent.name))) waterKoi.push(o); });
        if (stage.setUnder) stage.setUnder(waterKoi);
        await slice();
        if (!allPts) await samplePointsSliced();
        await slice();
        if (!samples) sampleWorld();
        await slice();
        frame();
        jumpTo(view);
        mark('framed');
        await slice();
        if (spriteLoads.length) await Promise.all(spriteLoads);
        await warmUp();
        return;
      }
      const box = new THREE.Box3();
      root.traverse((o) => { if (o.isMesh && !o.userData.fxNoFrame) box.expandByObject(o); });
      if (box.isEmpty()) box.setFromObject(root);
      bounds = box;
      const centre = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const radius = size.length() / 2;
      camDist = radius * 3;
      camera.position.copy(centre).add(new THREE.Vector3(9, 9, 16).normalize().multiplyScalar(camDist));
      camera.near = 0.1; camera.far = camDist + radius * 3;
      controls.target.copy(centre);
      controls.update();
      camera.updateMatrixWorld();
      {
        const r = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
        const u = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
        let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
        const v = new THREE.Vector3();
        root.traverse((o) => {
          if (!o.isMesh || o.userData.fxNoFrame) return;
          const pa = o.geometry.attributes.position;
          for (let i = 0; i < pa.count; i++) {
            v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
            const x = v.dot(r), y = v.dot(u);
            a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y);
          }
        });
        projExt.bw = b - a; projExt.bh = d - c;
        zRef = Math.min((900 * 0.62) / projExt.bh, (1440 * 0.9) / projExt.bw);
        const shift = r.multiplyScalar((a + b) / 2 - centre.dot(r)).add(u.multiplyScalar((c + d) / 2 - centre.dot(u)));
        camera.position.add(shift); controls.target.add(shift);
        controls.update();
      }
      frame();
    }

    async function warmUp() {
      const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
      if ([...fgNodes.values()].some((e) => e.swaps.length)) {
        for (const [, e] of fgNodes) fgBlend(e, true);
        try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera); } catch (e) { void e; }
        for (const [, e] of fgNodes) fgBlend(e, false);
      }
      for (const t of [nightTex, dayTex]) { if (t) { await slice(); renderer.initTexture(t); mark('uploaded'); await nextFrame(); } }
      if (slides && slides.texs) for (let i = 0; i < slides.texs.length; i++) { if (slides.loaded && !slides.loaded[i]) continue; renderer.initTexture(slides.texs[i]); if (i % 2) await nextFrame(); }
      const parallel = !!(renderer.extensions && renderer.extensions.has && renderer.extensions.has('KHR_parallel_shader_compile'));
      if (stage && renderer.compileAsync && params.get('legacycompile') !== '1' && parallel && !softGL) {
        try {
          const rt = stage.water && stage.water.getRenderTarget ? stage.water.getRenderTarget() : null;
          const jobs = [];
          if (rt) { renderer.setRenderTarget(rt); jobs.push(renderer.compileAsync(scene, camera)); renderer.setRenderTarget(null); }
          jobs.push(renderer.compileAsync(scene, camera));
          await Promise.all(jobs);
          mark('compiled parallel');
          const draws = [], vis = [];
          scene.traverse((o) => { vis.push([o, o.visible]); if ((o.isMesh || o.isPoints || o.isSprite) && o.visible) draws.push(o); });
          const seen = new Set(), groups = [];
          let cur = [];
          for (const o of draws) { const k = (o.material && o.material.uuid) + (o.isSkinnedMesh ? 's' : ''); if (seen.has(k)) continue; seen.add(k); cur.push(o); if (cur.length >= 12) { groups.push(cur); cur = []; } }
          if (cur.length) groups.push(cur);
          const keep = new Set([scene, stage.water, stage.dome, stage.moonMesh].filter(Boolean));
          for (const g of groups) {
            for (const [o] of vis) if (o !== scene && (o.isMesh || o.isPoints || o.isSprite) && !keep.has(o)) o.visible = false;
            const cul = [];
            for (const o of g) { o.visible = true; for (let q = o.parent; q; q = q.parent) q.visible = true; if (o.frustumCulled) { cul.push(o); o.frustumCulled = false; } }
            renderer.render(scene, camera);
            for (const o of cul) o.frustumCulled = true;
            for (const [o, v] of vis) o.visible = v;
            await nextFrame();
          }
        } catch (e) {  }
        mark('compiled');
        progress(0.97);
        return;
      }
      try {
        const groups = new Map(), vis = [];
        scene.traverse((o) => {
          vis.push([o, o.visible]);
          if (!(o.isMesh || o.isPoints || o.isSprite || o.isLine) || !o.material) return;
          for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { if (!groups.has(m)) groups.set(m, []); groups.get(m).push(o); }
        });
        const rt = stage && !softGL && stage.water && stage.water.getRenderTarget ? stage.water.getRenderTarget() : null;
        let i = 0, fT0 = performance.now(), painted = fT0;
        for (const objs of groups.values()) {
          for (const [o] of vis) o.visible = false;
          for (const o of objs) for (let p = o; p; p = p.parent) p.visible = true;
          renderer.compile(scene, camera);
          if (rt) { renderer.setRenderTarget(rt); renderer.compile(scene, camera); renderer.setRenderTarget(null); }
          for (const [o, v] of vis) o.visible = v;
          ++i;
          if (performance.now() - fT0 > (softGL ? 4 : 10)) { progress(0.95 + (stage && !softGL ? 0.01 : 0.02) * i / groups.size); mark('compiled ' + i); if (softGL || performance.now() - painted > 22) { await nextFrame(); painted = performance.now(); } else await slice(); fT0 = performance.now(); }
        }
        for (const [o, v] of vis) o.visible = v;
        if (stage && !softGL) {
          const keep = new Set([scene, stage.water, stage.dome, stage.moonMesh].filter(Boolean));
          const lists = [...groups.values()], was = new Map(vis);
          let k = 0; fT0 = performance.now();
          for (let g = 0; g < lists.length; g += 12) {
            for (const [o] of vis) if (o !== scene && (o.isMesh || o.isPoints || o.isSprite || o.isLine) && !keep.has(o)) o.visible = false;
            const cul = [];
            for (const objs of lists.slice(g, g + 12)) for (const o of objs) { if (!was.get(o)) continue; o.visible = true; for (let q = o.parent; q; q = q.parent) q.visible = true; if (o.frustumCulled) { cul.push(o); o.frustumCulled = false; } }
            renderer.render(scene, camera);
            for (const o of cul) o.frustumCulled = true;
            for (const [o, v] of vis) o.visible = v;
            k = g + 12;
            if (performance.now() - fT0 > 12) { progress(0.96 + 0.01 * Math.min(1, k / lists.length)); mark('linked ' + Math.min(k, lists.length)); await nextFrame(); fT0 = performance.now(); }
          }
          for (const [o, v] of vis) o.visible = v;
          const cul = []; scene.traverse((o) => { if (o.frustumCulled) { cul.push(o); o.frustumCulled = false; } });
          renderer.render(scene, camera);
          for (const o of cul) o.frustumCulled = true;
          await nextFrame();
        } else if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
      } catch (e) {  }
      mark('compiled');
      progress(0.97);
    }

    const variantCache = new Map();
    function variant(src, ex) {
      if (!src || src.isShaderMaterial || src.isPointsMaterial || src.isSpriteMaterial) return null;
      const c = src.clone(); c.name = src.name;
      const aCut = src.alphaTest > 0 || !!src.alphaToCoverage || !!src.alphaHash;
      const prev = src.onBeforeCompile, base = src.customProgramCacheKey ? src.customProgramCacheKey() : '';
      const flags = (ex.wind ? 'w' : '') + (ex.fade ? 'f' : '') + (ex.lod ? 'l' : '') + (ex.rim ? 'r' : '') + (ex.lit ? 'n' : '');
      c.onBeforeCompile = (sh, r) => {
        if (prev) prev.call(src, sh, r);
        if (ex.wind) {
          Object.assign(sh.uniforms, ex.wind);
          sh.vertexShader = sh.vertexShader
            .replace('#include <common>', '#include <common>\nuniform vec3 uWFix; uniform vec3 uWAxis; uniform float uWLen; uniform vec3 uWDisp;')
            .replace('#include <project_vertex>', [
              'vec4 wpW = modelMatrix * vec4( transformed, 1.0 );',
              'float wk = clamp( dot( wpW.xyz - uWFix, uWAxis ) / max( uWLen, 0.01 ), 0.0, 1.25 );',
              'wpW.xyz += uWDisp * ( wk * wk ) - uWAxis * ( dot( uWDisp, uWDisp ) * wk * wk * wk / max( uWLen, 0.01 ) ) * 0.5;',
              'vec4 mvPosition = viewMatrix * wpW;',
              'gl_Position = projectionMatrix * mvPosition;'].join('\n'));
        }
        if (ex.fade) {
          sh.uniforms.uFade = ex.fade;
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uFade;');
          if (aCut && sh.fragmentShader.includes('#include <alphatest_fragment>')) sh.fragmentShader = sh.fragmentShader.replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\n  diffuseColor.a *= uFade;');
          else if (sh.fragmentShader.includes('#include <dithering_fragment>')) sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  gl_FragColor.a *= uFade;');
          else sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'void main() {\n  if ( uFade < 0.002 ) discard;');
        }
        if (ex.lit) sh.uniforms.uNight = ex.lit;
        if (ex.rim) {
          sh.uniforms.uRimDay = ex.rim; sh.uniforms.uRimLo = rimLo;
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vRimK;')
            .replace('#include <project_vertex>', '#include <project_vertex>\n  #ifdef USE_SKINNING\n  vRimK = 1.0 - abs( dot( normalize( transformedNormal ), normalize( -mvPosition.xyz ) ) );\n  #else\n  vRimK = 1.0 - abs( dot( normalize( normalMatrix * normal ), normalize( -mvPosition.xyz ) ) );\n  #endif');
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRimDay; uniform float uRimLo; varying float vRimK;')
            .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  gl_FragColor.rgb *= 1.0 - uRimDay * smoothstep( uRimLo, 0.95, vRimK );');
        }
        if (ex.lod) {
          sh.uniforms.uLodAdd = ex.lod;
          sh.fragmentShader = sh.fragmentShader.replace('uniform float uMinLod;', 'uniform float uMinLod;\nuniform float uLodAdd;').replace('max(lod, uMinLod)', 'max(lod, uMinLod + uLodAdd)');
        }
      };
      c.customProgramCacheKey = () => base + '|v' + flags;
      c.userData.windVar = !!ex.wind || !!(src.userData && src.userData.windVar);
      c.userData.fadeVar = !!ex.fade || !!(src.userData && src.userData.fadeVar);
      if (ex.fade && !aCut) c.transparent = true;
      if (src === baked) bakedVariants.push(c);
      const nm = nightMats.find((e) => e.m === src);
      if (nm) nightMats.push({ m: c, base: nm.base, d: nm.d, n: nm.n, dayT: nm.dayT });
      return c;
    }
    const nameOf = (o) => o.userData.name || o.name || '';
    function matchNodes(spec) {
      const out = [];
      root.traverse((o) => {
        const n = nameOf(o);
        if (!(n === spec || n.startsWith(spec) || o.name === THREE.PropertyBinding.sanitizeNodeName(spec))) return;
        for (let q = o.parent; q; q = q.parent) if (out.includes(q)) return;
        out.push(o);
      });
      return out;
    }
    function swapMaterials(node, ex, cache) {
      node.traverse((o) => {
        if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
        if (ex.wind && o.material.userData.windVar) return;
        if (ex.fade && o.material.userData.fadeVar) return;
        let v = cache.get(o.material);
        if (v === undefined) { v = variant(o.material, ex); cache.set(o.material, v); }
        if (v) o.material = v;
      });
    }

    const winds = [];
    let windDir = null, windS0 = 0, windS1 = 1, gustT = -99, gustNext = 0, chimeS = null, chimeGustDone = true;
    const _wa = new THREE.Vector3(), _wb = new THREE.Vector3();
    const WIND = (() => { const q = params.get('wind') !== null ? params.get('wind') : (typeof location !== 'undefined' ? new URLSearchParams(location.search).get('wind') : null); return q !== '0'; })();
    const WIND_K = WIND ? { stand: { w: 6.3, z: 0.24, k: 0.2, f: 0.06, fw: 9.5 }, hang: { w: 3.4, z: 0.22, k: 0.15, f: 0.08, fw: 7.3 }, limb: { w: 3.1, z: 0.2, k: 0.15, f: 0.03, fw: 11.0 } } : { stand: { w: 6.0, z: 0.32, k: 0.09 }, hang: { w: 3.4, z: 0.28, k: 0.1 }, limb: { w: 4.2, z: 0.38, k: 0.025 } };
    const GUST = WIND ? { travel: 4.0, rise: 1.2, fall: 2.8, life: 15, breath: 0.16, base: 0.32, amp: 1.64, ampStage: 1.35, wind: 1.6, float: 1.7, moth: [0.1, 0.09] } : { travel: 3.0, rise: 0.3, fall: 1.1, life: 6, breath: 0.1, wind: 1, float: 1, moth: [0.07, 0.05] };
    let gustS = 1, petalPuff = true, treeS = null;
    function windSetup() {
      const LL = manifest.life || {};
      const lanternFloats = (Array.isArray(LL.lanterns) ? LL.lanterns : LL.lanterns && Array.isArray(LL.lanterns.lanterns) ? LL.lanterns.lanterns : []).map((x) => ({ object: typeof x === 'string' ? x : x && x.object, kind: 'float', amount: 0.8 })).filter((x) => x.object);
      const list = (Array.isArray(manifest.wind) ? manifest.wind : []).concat(Array.isArray(LL.wind) ? LL.wind : [], lanternFloats);
      const plum = root.getObjectByName('G_plum_blossom') || root.getObjectByName('G_plum');
      let bridge = null; root.traverse((o) => { if (!bridge && /bridge/i.test(nameOf(o))) bridge = o; });
      const a = plum ? plum.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(-5, 0, 0);
      const b = bridge ? bridge.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(5, 0, 0);
      windDir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z); if (windDir.lengthSq() < 1e-4) windDir.set(1, 0, 0); windDir.normalize();
      windS0 = a.dot(windDir) - 0.5; windS1 = b.dot(windDir) + 0.5;
      if (chimeObj || root.getObjectByName('G_chime')) { const c = (chimeObj || root.getObjectByName('G_chime')).getWorldPosition(new THREE.Vector3()); chimeS = c.dot(windDir); }
      for (const e of list) {
        if (!e || !e.object) continue;
        if (e.kind === 'float') { for (const node of matchNodes(String(e.object))) { if (floatWinds.some((f) => f.node === node || related(f.node, new Set([node])))) continue; floatWinds.push({ node, amount: isFinite(+e.amount) ? +e.amount : 1, x: 0, v: 0, X: new THREE.Vector3(), V: new THREE.Vector3(), p: node.getWorldPosition(new THREE.Vector3()), s: node.getWorldPosition(new THREE.Vector3()).dot(windDir) }); } continue; }
        const kind = WIND_K[e.kind] ? e.kind : 'stand', amount = isFinite(+e.amount) ? +e.amount : 1;
        for (const node of matchNodes(String(e.object))) {
          if (/sign_disc|clock/i.test(nameOf(node))) continue;
          node.updateWorldMatrix(true, true);
          const box = new THREE.Box3().setFromObject(node); if (box.isEmpty()) continue;
          const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
          let fixW, axisW, len;
          if (kind === 'stand') { fixW = new THREE.Vector3(c.x, box.min.y, c.z); axisW = new THREE.Vector3(0, 1, 0); len = sz.y; }
          else if (kind === 'hang') { fixW = new THREE.Vector3(c.x, box.max.y, c.z); axisW = new THREE.Vector3(0, -1, 0); len = sz.y; }
          else {
            fixW = node.getWorldPosition(new THREE.Vector3()); axisW = c.clone().sub(fixW); if (axisW.lengthSq() < 1e-6) axisW.set(0, 1, 0); axisW.normalize();
            len = 0; for (let k = 0; k < 8; k++) { _wa.set(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z); len = Math.max(len, _wa.sub(fixW).dot(axisW)); }
          }
          if (!(len > 0.02)) continue;
          const inv = new THREE.Matrix4().copy(node.matrixWorld).invert();
          const U = { uWFix: { value: fixW.clone() }, uWAxis: { value: axisW.clone() }, uWLen: { value: len }, uWDisp: { value: new THREE.Vector3() } };
          swapMaterials(node, { wind: U }, new Map());
          const nm = nameOf(node), ph = Math.random() * 6.283;
          const wn = !WIND ? WIND_K[kind].w : kind === 'hang' ? THREE.MathUtils.clamp(Math.sqrt(14.7 / len), 2.8, 7.5) : kind === 'limb' ? WIND_K.limb.w * THREE.MathUtils.clamp(Math.sqrt(4 / len), 1, 3) : WIND_K[kind].w;
          const fk = /bonsai|bell/i.test(nm) ? 0 : /scroll/i.test(nm) ? 0.4 : 1;
          winds.push({ node, U, kind, amount, len, wn, fk, fp: ph, fixL: fixW.clone().applyMatrix4(inv), axisL: axisW.clone().transformDirection(inv), s: fixW.dot(windDir), x: 0, v: 0, X: new THREE.Vector3(), V: new THREE.Vector3(), p: c.clone(), ph, ph2: Math.random() * 6.283, chime: /chime/i.test(nm), lastAbs: 0 });
        }
      }
      gustNext = 6 + Math.random() * 10;
      const pts = [a, b]; for (const v of PLACE_VIEWS) if (places[v]) pts.push(places[v].at3);
      islePts = pts.map((q) => q.clone());
    }
    let islePts = [], gustDir = null, gS0 = 0, gSpeed = 4, chimeRung = -1;
    const _gwv = new THREE.Vector3();
    const _wb0 = new THREE.Vector3(), _wq = new THREE.Vector3();
    const wnoise = (x) => Math.sin(x) * 0.5 + Math.sin(x * 2.31 + 1.7) * 0.3 + Math.sin(x * 4.13 + 0.3) * 0.2;
    function windBase(t, out) {
      out.copy(windDir);
      if (!WIND) return 0;
      out.applyAxisAngle(_yAxis, THREE.MathUtils.degToRad(15) * wnoise(t * 0.021 + 3.1));
      return GUST.base * (1 + 0.25 * wnoise(t * 0.047 + 7.3));
    }
    function gustAmp(t, p) {
      if (!gustDir || freezeT !== null) return 0;
      const u = (t - gustT) - (p.x * gustDir.x + p.z * gustDir.z - gS0) / gSpeed;
      return u > 0 && u < GUST.life ? (1 - Math.exp(-u / GUST.rise)) * Math.exp(-u / GUST.fall) * GUST.amp * gustS : 0;
    }
    function windAt(t, p, out) {
      if (!WIND) { const m = gustAt(t, p.x * windDir.x + p.z * windDir.z); out.copy(windDir).multiplyScalar(m); return m; }
      const b = windBase(t, out), g = gustAmp(t, p);
      const ad = gustDir || windDir, xi = p.x * ad.x + p.z * ad.z - gSpeed * t, eta = p.z * ad.x - p.x * ad.z;
      const turb = 1 + 0.22 * (Math.sin(0.18 * xi) * (0.8 + 0.2 * Math.sin(0.5 * eta + 1.3)) * 0.6 + Math.sin(0.4 * xi + 2.1) * (0.7 + 0.3 * Math.sin(0.6 * eta)) * 0.4);
      if (g > 0) out.lerp(gustDir, g / (b + g)).normalize();
      const m = (b + g) * turb;
      out.multiplyScalar(m);
      return m;
    }
    const WIND_R = { stand: 1.4, hang: 2.0, limb: 1.6, lamp: 2.0 };
    function windDrive(t, p, out, kind) {
      const m = windAt(t, p, out);
      if (m > 1e-4) out.multiplyScalar(Math.pow(m, (WIND_R[kind] || 1) - 1));
      return m;
    }
    function leapSoon(win) {
      const lp = manifest.koi && Array.isArray(manifest.koi.leaps) ? manifest.koi.leaps : null;
      if (!lp || !mixerMain) return false;
      const L = (manifest.koi && +manifest.koi.leap_loop) || 120, lt = mixerMain.time % L;
      return lp.some((m) => { let d = +m - lt; if (d < 0) d += L; return d < win; });
    }
    let flightS = null;
    function flightSetup() {
      flightS = [];
      if (!root || !mixerMain) return;
      const fl = root.getObjectByName('magpie_rail_1');
      if (!fl) return;
      const name = fl.name + '.position', a = loopActions.find((x) => x.getClip().tracks.some((tr) => tr.name === name));
      if (!a) return;
      const tr = a.getClip().tracks.find((x) => x.name === name), L = a.getClip().duration, ip = tr.createInterpolant(new Float32Array(3)), h = 0.05;
      const p0 = Array.from(ip.evaluate(0)), spans = [];
      let on = -1;
      for (let k = 0; k <= Math.ceil(L / h); k++) {
        const t = Math.min(L, k * h), v = ip.evaluate(t), far = Math.hypot(v[0] - p0[0], v[1] - p0[1], v[2] - p0[2]) > 0.02;
        if (far && on < 0) on = t;
        if ((!far || t >= L) && on >= 0) { spans.push([on - 0.3, t + 1]); on = -1; }
      }
      if (spans.length) flightS.push({ a, L, spans });
    }
    function flightSoon(win) {
      if (flightS === null) flightSetup();
      for (const f of flightS) if (hits(f.a.time % f.L, win, f.L, f.spans)) return true;
      return false;
    }
    const floatWinds = [];
    const GUST_TRAVEL = GUST.travel;
    function gustFront(t, sPos) {
      if (freezeT !== null) return 0;
      const u = (t - gustT) - GUST_TRAVEL * (sPos - windS0) / Math.max(0.5, windS1 - windS0);
      return u > 0 && u < GUST.life ? (1 - Math.exp(-u / GUST.rise)) * Math.exp(-u / GUST.fall) * 1.9 * gustS : 0;
    }
    function gustAt(t, sPos) {
      const breath = GUST.breath * (WIND ? (0.6 + 0.4 * Math.sin(t * 0.71 + sPos * 0.9)) * (0.75 + 0.25 * Math.sin(t * 0.23 + 1.3)) : (0.55 + 0.45 * Math.sin(t * 0.71 + sPos * 0.9)) * (0.7 + 0.3 * Math.sin(t * 0.23 + 1.3)));
      return gustFront(t, sPos) + breath;
    }
    function startGust(t, strength) {
      if (!windDir) return false;
      if (WIND) {
        gustDir = new THREE.Vector3(); windBase(t, gustDir);
        let lo = Infinity, hi = -Infinity; for (const q of islePts) { const d = q.x * gustDir.x + q.z * gustDir.z; lo = Math.min(lo, d); hi = Math.max(hi, d); }
        if (!isFinite(lo)) { lo = windS0; hi = windS1; }
        gS0 = lo - 1.5; gSpeed = Math.max(2.5, (hi - lo + 3) / GUST_TRAVEL);
      }
      gustT = t; gustS = isFinite(+strength) && +strength > 0 ? Math.min(1.6, +strength) : WIND ? 0.85 + Math.random() * 0.3 : 1;
      gustNext = t + 28 + Math.random() * 30; chimeGustDone = false; petalPuff = false; lifeN.gust++; lifeLastBig = t;
      ev('gust', { strength: +gustS.toFixed(2) });
      return true;
    }
    let windGust = 0;
    function stepWind(t, dt) {
      if (!windDir) return;
      if (!reduced && freezeT === null && t >= gustNext) { if (t - lifeLastBig < 8 || leapSoon(9) || flightSoon(9)) { gustNext = t + 2 + Math.random() * 2; } else startGust(t); }
      const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
      for (const w of winds) {
        const K = WIND_K[w.kind];
        if (WIND) w.m = windDrive(t, w.p, _wq, w.kind);
        else { windAt(t, w.p, _wq); _wq.multiplyScalar(1 + 0.15 * Math.sin(t * 1.7 + w.ph)); }
        const wn = w.wn || K.w;
        for (let i = 0; i < n; i++) { w.V.x += (wn * wn * (_wq.x - w.X.x) - 2 * K.z * wn * w.V.x) * h; w.V.z += (wn * wn * (_wq.z - w.X.z) - 2 * K.z * wn * w.V.z) * h; w.X.x += w.V.x * h; w.X.z += w.V.z * h; }
        w.x = w.X.length() * (w.X.dot(windDir) < 0 ? -1 : 1);
        w.node.updateWorldMatrix(true, false);
        w.U.uWFix.value.copy(w.fixL).applyMatrix4(w.node.matrixWorld);
        w.U.uWAxis.value.copy(w.axisL).transformDirection(w.node.matrixWorld);
        w.U.uWDisp.value.set(w.X.x, 0, w.X.z).multiplyScalar(K.k * w.amount * w.len);
        if (WIND && K.f && w.fk > 0) { w.fp += K.fw * (0.8 + 0.2 * Math.min(2.5, (w.m || 0) / GUST.base)) * dt; const m = Math.hypot(_wq.x, _wq.z), fl = K.f * w.fk * m * Math.sin(w.fp) * (0.6 + 0.4 * Math.sin(t * 1.9 + w.ph2)); w.U.uWDisp.value.x += -_wq.z / Math.max(1e-3, m) * fl * w.len * K.k * w.amount; w.U.uWDisp.value.z += _wq.x / Math.max(1e-3, m) * fl * w.len * K.k * w.amount; }
        if (w.sh) { const e = t - w.sh.t0; if (e >= 0 && e < 2.6) w.U.uWDisp.value.addScaledVector(w.sh.d, w.sh.a * Math.exp(-e / 0.55) * Math.sin(e * 13.2 + w.sh.ph)); else if (e >= 2.6) w.sh = null; }
        if (WIND && w.chime && chimeRung !== gustT && gustAmp(t, w.p) > 0.33 * GUST.amp * gustS && t - chimeT > 3) { chimeRung = gustT; swingChime(); }
      }
      for (const fw of floatWinds) {
        windAt(t, fw.p, _wq); _wq.multiplyScalar(GUST.float);
        for (let i = 0; i < n; i++) { fw.V.x += (4.0 * (_wq.x - fw.X.x) - 2.0 * fw.V.x) * h; fw.V.z += (4.0 * (_wq.z - fw.X.z) - 2.0 * fw.V.z) * h; fw.X.x += fw.V.x * h; fw.X.z += fw.V.z * h; }
        fw.x = fw.X.dot(windDir); fw.v = fw.V.dot(windDir);
      }
      if (WIND) { const a = 1 - Math.exp(-dt / 0.35); for (const sk of smokes) { windAt(t, sk.p, _wq); sk.U.value.x += (_wq.x * 0.06 - sk.U.value.x) * a; sk.U.value.y += (_wq.z * 0.06 - sk.U.value.y) * a; } }
      windGust = WIND ? windAt(t, islePts[0] || controls.target, _wq) : gustAt(t, windS0 + 0.5);
      if (FX.fxU.uWind) { if (WIND) FX.fxU.uWind.value.copy(_wq).multiplyScalar(GUST.wind); else FX.fxU.uWind.value.copy(windDir).multiplyScalar(windGust * GUST.wind); }
      if (WIND) {
        const el = t - gustT, gd = gustDir || windDir, live = freezeT === null && gustDir && el >= 0 && el < GUST_TRAVEL + GUST.life + 2;
        if (stage && stage.setGust) stage.setGust(gS0 + el * gSpeed, live ? Math.min(1, 0.75 * gustS) : 0, gd.x, gd.z, gSpeed);
        const bd = _wb0, bm = windBase(t, bd);
        if (stage && stage.setWind) stage.setWind({ dirX: bd.x, dirZ: bd.z, base: bm, front: gS0 + el * gSpeed, strength: live ? gustS : 0, gdirX: gd.x, gdirZ: gd.z, speed: gSpeed, rise: GUST.rise, fall: GUST.fall, amp: GUST.ampStage, t });
        const gm = gustAmp(t, controls.target);
        FX.fxU.uWindF.value.copy(gd).multiplyScalar(0.35 * gm); FX.fxU.uWindF.value.y = 0.12 * gm;
      }
      if (WIND && !petalPuff && petalsP) {
        const pl = root.getObjectByName('G_plum'), pp = pl ? pl.getWorldPosition(new THREE.Vector3()) : controls.target;
        if (gustAmp(t, pp) > 0.45) { petalPuff = true; FX.petalBurst(petalsP, 5 + Math.round(3 * gustS), pp); }
      }
      if (!WIND && !chimeGustDone && chimeS !== null && chimeObj && gustAt(t, chimeS) > 0.55) { chimeGustDone = true; swingChime(); }
    }

    let chessFade = null;
    function chessFadeSetup() {
      const c = manifest.chess;
      if (!c || !c.reset || !c.prefix || !(+c.loop > 0)) return;
      const U = { value: 1 }, cache = new Map(), nodes = matchNodes(String(c.prefix));
      if (!nodes.length) return;
      for (const nd of nodes) swapMaterials(nd, { fade: U }, cache);
      chessFade = { U, nodes, loop: +c.loop, t0: +c.reset.t0, t1: +c.reset.t1 };
    }
    function stepChessFade() {
      if (!chessFade || !mixerMain) return;
      const lt = mixerMain.time % chessFade.loop, { t0, t1 } = chessFade;
      let f = 1;
      if (lt >= t0 && lt <= t1) { const a = Math.min(1, (lt - t0) / 0.5), b = Math.min(1, Math.max(0, t1 - lt) / 0.5); f = Math.max(1 - a, 1 - b); f = f * f * (3 - 2 * f); }
      chessFade.U.value = f;
      for (const nd of chessFade.nodes) nd.visible = f > 0.002;
    }
    const RIM = { desk: [0.2, 0.3], phone: [0.35, 0] }, rimU = { value: 0 }, rimLo = { value: 0.3 };
    let rimQ = null;
    function rimSetup() {
      const o = root.getObjectByName('G_sky_koi_white');
      if (o) swapMaterials(o, { rim: rimU }, new Map());
    }
    const FG = { desk: { about: ['place_counter_sign_disc'] }, portrait: { about: ['place_counter_sign_disc'], education: ['G_plum'], projects: ['place_counter_sign_disc'] }, landscape: { about: ['place_counter_sign_disc'] } }, FG_TO = 0.18, fgNodes = new Map();
    function fgSetup() {
      const want = new Set();
      for (const L of Object.keys(FG)) for (const v of Object.keys(FG[L])) for (const n of FG[L][v]) want.add(n);
      for (const v of PLACE_VIEWS) if (places[v] && Array.isArray(places[v].fade)) for (const n of places[v].fade) want.add(String(n));
      for (const n of want) for (const nd of matchNodes(n)) {
        if (fgNodes.has(nd)) continue;
        const U = { value: 1 };
        swapMaterials(nd, { fade: U }, new Map());
        const swaps = [], made = new Map();
        nd.traverse((o) => {
          const m = o.isMesh && !Array.isArray(o.material) ? o.material : null;
          if (!m || !(m.alphaToCoverage || m.alphaHash)) return;
          let b = made.get(m);
          if (!b) {
            b = m.clone(); b.name = m.name; b.onBeforeCompile = m.onBeforeCompile; const key = m.customProgramCacheKey ? m.customProgramCacheKey() : ''; b.customProgramCacheKey = () => key + '|blend';
            b.alphaToCoverage = false; b.alphaHash = false; b.alphaTest = Math.max(0.5, m.alphaTest || 0); b.transparent = true; b.depthWrite = true; b.userData = Object.assign({}, m.userData);
            const ne = nightMats.find((x) => x.m === m); if (ne) nightMats.push(Object.assign({}, ne, { m: b }));
            made.set(m, b);
          }
          swaps.push({ o, a: m, b });
        });
        fgNodes.set(nd, { U, names: new Set([n]), swaps, blend: false });
      }
      for (const [nd, e] of fgNodes) e.names.add(nameOf(nd));
    }
    function fgBlend(e, on) {
      if (e.blend === on || !e.swaps.length) return;
      e.blend = on; for (const w of e.swaps) w.o.material = on ? w.b : w.a;
    }
    function stepFg(dt) {
      if (!fgNodes.size) return;
      const list = PLACE_VIEWS.includes(view) ? ((FG[layoutOf()] || {})[view] || []).concat(places[view] && Array.isArray(places[view].fade) ? places[view].fade : []) : [];
      for (const [, e] of fgNodes) {
        const goal = list.some((n) => e.names.has(n)) ? FG_TO : 1;
        if (e.U.value === goal) { fgBlend(e, goal < 1); continue; }
        fgBlend(e, true);
        const k = reduced ? 1 : 1 - Math.exp(-(dt || 0.016) / 0.16);
        e.U.value = Math.abs(goal - e.U.value) < 0.004 ? goal : e.U.value + (goal - e.U.value) * k;
      }
    }
    const _kv = new THREE.Vector3();
    function stepKeep() {
      const K = FX.fxU.uKeep.value, w = W(), h = H();
      const rr = ringRect();
      if (rr && rr.r > 0) K[0].set(rr.x / w * 2 - 1, 1 - rr.y / h * 2, rr.r * 1.35 * 2 / w, rr.r * 1.35 * 2 / h); else K[0].set(0, 0, 0, 0);
      const p = PLACE_VIEWS.includes(view) ? places[view] : null;
      if (p) {
        if (p.castBox === undefined) {
          p.castBox = null;
          const bx = new THREE.Box3();
          for (const n of Array.isArray(p.cast) ? p.cast : []) { const o = root.getObjectByName(n) || root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n)); if (o) bx.expandByObject(o, true); }
          if (!bx.isEmpty()) p.castBox = bx;
        }
        if (p.castBox) {
          let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
          for (let i = 0; i < 8; i++) { _kv.set(i & 1 ? p.castBox.max.x : p.castBox.min.x, i & 2 ? p.castBox.max.y : p.castBox.min.y, i & 4 ? p.castBox.max.z : p.castBox.min.z).project(camera); x0 = Math.min(x0, _kv.x); x1 = Math.max(x1, _kv.x); y0 = Math.min(y0, _kv.y); y1 = Math.max(y1, _kv.y); }
          K[1].set((x0 + x1) / 2, (y0 + y1) / 2, Math.max(0.01, (x1 - x0) * 0.6), Math.max(0.01, (y1 - y0) * 0.6));
        } else K[1].set(0, 0, 0, 0);
      } else K[1].set(0, 0, 0, 0);
    }
    let clockS = null;
    const _ckq = new THREE.Quaternion(), clockQ = (() => { const q = params.get('time') !== null ? params.get('time') : (typeof location !== 'undefined' ? new URLSearchParams(location.search).get('time') : null); const m = /^(\d{1,2}):(\d{2})$/.exec(q || ''); return m && +m[1] < 24 && +m[2] < 60 ? [+m[1], +m[2]] : null; })();
    function clockSetup() {
      clockS = false;
      const c = manifest.clock;
      if (!c || typeof c !== 'object' || !Array.isArray(c.pivot) || !Array.isArray(c.axis)) return;
      const find = (n) => (n ? root.getObjectByName(String(n)) || root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(String(n))) : null);
      const hN = find(c.hour), mN = find(c.minute);
      if (!hN || !mN || !hN.parent || !mN.parent) return;
      const pivot = STAGE.B2T(c.pivot), axisW = STAGE.B2T(c.axis);
      if (axisW.lengthSq() < 1e-8) return;
      axisW.normalize();
      const rm = /^(\d{1,2}):(\d{2})$/.exec(String(c.rest || '12:00')), rh = rm ? +rm[1] : 12, rmin = rm ? +rm[2] : 0;
      root.updateMatrixWorld(true);
      const hand = (o) => { const pq = o.parent.getWorldQuaternion(new THREE.Quaternion()).invert(); return { o, q0: o.quaternion.clone(), p0: o.position.clone(), axisL: axisW.clone().applyQuaternion(pq).normalize(), pivL: o.parent.worldToLocal(pivot.clone()) }; };
      clockS = { h: hand(hN), m: hand(mN), sense: c.sense === 'counterclockwise' ? -1 : 1, restH: ((rh % 12) + rmin / 60) / 12, restM: rmin / 60 };
    }
    function clockRing() {
      const c = manifest.clock;
      if (!c || !Array.isArray(c.pivot) || !Array.isArray(c.axis)) return null;
      const mN = root.getObjectByName(String(c.minute || '')), pv = STAGE.B2T(c.pivot), ax = STAGE.B2T(c.axis);
      if (!mN || ax.lengthSq() < 1e-8) return null;
      ax.normalize();
      const bx = new THREE.Box3().setFromObject(mN); if (bx.isEmpty()) return null;
      let L = 0; for (let k = 0; k < 8; k++) L = Math.max(L, _ckv.set(k & 1 ? bx.max.x : bx.min.x, k & 2 ? bx.max.y : bx.min.y, k & 4 ? bx.max.z : bx.min.z).distanceTo(pv));
      const R = Math.min(0.8, 1.25 * L), u = new THREE.Vector3().crossVectors(ax, Math.abs(ax.y) < 0.9 ? _yAxis : new THREE.Vector3(1, 0, 0)).normalize(), w = new THREE.Vector3().crossVectors(ax, u), out = new Float32Array(24 * 3);
      for (let k = 0; k < 24; k++) { const a = k / 24 * 6.2832; _ckv.copy(pv).addScaledVector(u, Math.cos(a) * R).addScaledVector(w, Math.sin(a) * R); out[k * 3] = _ckv.x; out[k * 3 + 1] = _ckv.y; out[k * 3 + 2] = _ckv.z; }
      return out;
    }
    const _ckv = new THREE.Vector3();
    function setHand(hd, a) {
      _ckq.setFromAxisAngle(hd.axisL, a);
      hd.o.quaternion.copy(_ckq).multiply(hd.q0);
      hd.o.position.copy(hd.p0).sub(hd.pivL).applyQuaternion(_ckq).add(hd.pivL);
    }
    function stepClock() {
      if (clockS === null) clockSetup();
      if (!clockS) return;
      let hh, mm, ss;
      if (clockQ) { hh = clockQ[0]; mm = clockQ[1]; ss = 0; }
      else { const d = new Date(); hh = d.getHours(); mm = d.getMinutes(); ss = d.getSeconds() + d.getMilliseconds() / 1000; }
      const mf = (mm + ss / 60) / 60, hf = ((hh % 12) + mm / 60 + ss / 3600) / 12;
      setHand(clockS.m, 2 * Math.PI * (mf - clockS.restM) * clockS.sense);
      setHand(clockS.h, 2 * Math.PI * (hf - clockS.restH) * clockS.sense);
    }
    let tPool = null;
    function stepTurtlePool() {
      if (tPool === null) {
        tPool = false;
        const gl = root.getObjectByName('FX_glow_turtle_lantern'), sh = root.getObjectByName('turtle_shadow');
        if (!gl || !sh || !stage) return;
        const m = new THREE.MeshBasicMaterial({ map: softTex(), color: 0xffb46a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
        const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), m);
        pool.rotation.x = -Math.PI / 2; pool.renderOrder = 3; pool.frustumCulled = false; pool.name = 'turtle_lantern_pool';
        scene.add(pool);
        tPool = { gl, sh, pool, m };
      }
      if (!tPool) return;
      tPool.gl.getWorldPosition(_cv); tPool.sh.getWorldPosition(_cw);
      tPool.pool.position.set(_cv.x, _cw.y + 0.006, _cv.z);
      const f = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.3) * Math.sin(clock.elapsedTime * 3.7 + 1.1);
      tPool.m.opacity = night * (0.3 + 0.05 * f);
      tPool.pool.visible = tPool.m.opacity > 0.004;
    }
    let crane = null;
    const _cv = new THREE.Vector3(), _cw = new THREE.Vector3(), _cb = new THREE.Vector3(), _cm = new THREE.Matrix4(), _cmi = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _cq2 = new THREE.Quaternion(), _cone = new THREE.Vector3(1, 1, 1), _cn = new THREE.Vector3();
    function craneSetup() {
      crane = false;
      const cfg = manifest.crane && typeof manifest.crane === 'object' ? manifest.crane : {};
      const strokes = [];
      const listed = Array.isArray(cfg.strokes) ? cfg.strokes : null;
      const objs = listed ? listed.map((s) => s && (root.getObjectByName(s.object) || root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(String(s.object))))) : [];
      if (!listed) root.traverse((o) => { if (o.isMesh && /^crane_stroke_\d+$/.test(o.name)) objs.push(o); });
      objs.forEach((o, i) => {
        if (!o || !o.isMesh || !mixerMain) return;
        const clip = clips.find((c) => c.tracks.some((tr) => tr.name === o.name + '.scale'));
        const act = clip ? mixerMain.existingAction(clip) : null;
        let t0 = listed && isFinite(+listed[i].t0) ? +listed[i].t0 : NaN, t1 = listed && isFinite(+listed[i].t1) ? +listed[i].t1 : NaN;
        if (clip && !(t1 > t0)) {
          const tr = clip.tracks.find((x) => x.name === o.name + '.scale'), st = tr.getValueSize();
          for (let k = 1; k < tr.times.length; k++) if (tr.values[k * st + 1] >= 0.999 && tr.values[(k - 1) * st + 1] < 0.5) { t0 = tr.times[k - 1]; t1 = tr.times[k]; break; }
        }
        if (!act || !(t1 > t0)) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox, dn = Math.abs(bb.min.y) >= Math.abs(bb.max.y) ? -1 : 1, L = Math.max(Math.abs(bb.min.y), Math.abs(bb.max.y));
        const src = o.material, mat = src.clone();
        mat.onBeforeCompile = src.onBeforeCompile; if (src.customProgramCacheKey) mat.customProgramCacheKey = src.customProgramCacheKey;
        mat.transparent = true; mat.opacity = 1; o.material = mat;
        const ne = nightMats.find((e) => e.m === src); if (ne) nightMats.push({ m: mat, base: ne.base.clone(), d: ne.d, n: ne.n });
        const trk = clip.tracks.find((x) => x.name === o.name + '.scale');
        strokes.push({ o, act, t0, t1, dn, L, mat, ip: trk.createInterpolant(new Float32Array(trk.getValueSize())), rev: 0, seen: false, op: 1 });
      });
      if (!strokes.length) return;
      let hm = null, tipN = null;
      if (cfg.tip) tipN = root.getObjectByName(String(cfg.tip)) || root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(String(cfg.tip)));
      root.updateMatrixWorld(true);
      const s0 = strokes[0].o;
      _cm.compose(s0.getWorldPosition(_cv), s0.getWorldQuaternion(_cq), _cone);
      const O = _cv.clone(), N = new THREE.Vector3(0, 0, 1).applyQuaternion(_cq).normalize();
      let bone = null, tipL = new THREE.Vector3();
      if (tipN) { bone = tipN; let p = tipN; while (p && !p.isBone) p = p.parent; if (p) bone = p; tipL = bone.worldToLocal(tipN.getWorldPosition(new THREE.Vector3())); }
      else {
        root.traverse((o) => { if (!hm && o.isSkinnedMesh && /^crane_head/.test(o.name)) hm = o; });
        if (!hm) root.traverse((o) => { if (!hm && o.isSkinnedMesh && /^crane/.test(o.name)) hm = o; });
        if (!hm) return;
        const pa = hm.geometry.attributes.position, si = hm.geometry.attributes.skinIndex, sw = hm.geometry.attributes.skinWeight;
        const side = Math.sign(_cw.copy(hm.skeleton.bones[0].getWorldPosition(new THREE.Vector3())).sub(O).dot(N)) || 1;
        let best = Infinity, bi = -1;
        for (let i = 0; i < pa.count; i++) { _cw.fromBufferAttribute(pa, i); hm.applyBoneTransform(i, _cw); _cw.applyMatrix4(hm.matrixWorld); const d = _cw.sub(O).dot(N) * side; if (d < best) { best = d; bi = i; } }
        if (bi < 0) return;
        let jw = -1, ji = 0; for (let k = 0; k < 4; k++) { const w = sw.getComponent(bi, k); if (w > jw) { jw = w; ji = si.getComponent(bi, k); } }
        bone = hm.skeleton.bones[ji];
        _cw.fromBufferAttribute(pa, bi); hm.applyBoneTransform(bi, _cw); _cw.applyMatrix4(hm.matrixWorld);
        tipL = bone.worldToLocal(_cw.clone());
      }
      if (!bone) return;
      const chain = [bone]; if (bone.parent && bone.parent.isBone) chain.push(bone.parent);
      const top = strokes[0].o.parent;
      crane = { strokes, bone, tipL, chain, top, N, w: 0, kg: 0, pend: [], dist: null, busy: false, lim: [THREE.MathUtils.degToRad(+cfg.head_deg || 14), THREE.MathUtils.degToRad(+cfg.neck_deg || 8)], tipW: new THREE.Vector3() };
    }
    function craneClip(clip) {
      if (!crane || !clip) return false;
      return clip.tracks.some((tr) => crane.chain.some((b) => tr.name.split('.')[0] === b.name));
    }
    function craneTip(out) { crane.top.updateMatrixWorld(true); return out.copy(crane.tipL).applyMatrix4(crane.bone.matrixWorld); }
    function strokeLocal(s, p, out) {
      _cm.compose(s.o.position, s.o.quaternion, _cone).premultiply(s.o.parent.matrixWorld);
      return out.copy(p).applyMatrix4(_cmi.copy(_cm).invert());
    }
    function stepCrane(dt) {
      if (crane === null) craneSetup();
      if (!crane) return;
      let act = null, wa = 0;
      for (const s of crane.strokes) {
        const at = s.act.time, win = at >= s.t0 - 0.55 && at <= s.t1 + 0.15;
        if (win) { act = s; wa = Math.min(1, Math.max(0, (at - (s.t0 - 0.55)) / 0.55), Math.max(0, (s.t1 + 0.15 - at) / 0.3)); }
      }
      crane.busy = !!act;
      const wg = act ? wa * wa * wa * (wa * (wa * 6 - 15) + 10) : 0;
      let wOv = 0; for (const r of activeReacts) if (craneClip(r.clip)) wOv = Math.max(wOv, r.a.getEffectiveWeight());
      crane.w = wg;
      if (act && wg > 0.001) {
        const s = act, sy = Math.max(0, Math.min(1, s.ip.evaluate(s.act.time)[1]));
        const lp0 = strokeLocal(s, craneTip(_cw), _cv), ta = lp0.y * s.dn / s.L, ga = Math.max(0, Math.min(sy, Math.max(ta, s.rev) + 0.12));
        const err = Math.hypot(lp0.x, lp0.z, Math.max(0, sy - ta) * s.L), kgo = THREE.MathUtils.smoothstep(err, 0.004, 0.012);
        crane.kg += (kgo - crane.kg) * (1 - Math.exp(-Math.max(0, dt || 0) / 0.25));
        _cb.set(0, s.dn * s.L * ga, 0);
        _cm.compose(s.o.position, s.o.quaternion, _cone).premultiply(s.o.parent.matrixWorld);
        const P = _cb.applyMatrix4(_cm);
        for (let it = 0; it < 4; it++) for (let k = 0; k < crane.chain.length; k++) {
          const b = crane.chain[k], tip = craneTip(_cw);
          b.getWorldPosition(_cv);
          const a = tip.sub(_cv), c = _cn.copy(P).sub(_cv);
          if (a.lengthSq() < 1e-8 || c.lengthSq() < 1e-8) continue;
          _cq.setFromUnitVectors(a.normalize(), c.normalize());
          const ang = 2 * Math.acos(Math.min(1, Math.abs(_cq.w))), cap = crane.lim[k] / 4, f = wg * crane.kg * (1 - wOv);
          if (ang > 1e-9) _cq.slerp(_cq2.identity(), 1 - (cap > 1e-9 ? cap * Math.tanh(ang / cap) : 0) * f / ang);
          b.parent.getWorldQuaternion(_cq2);
          const q = _cq2.clone().invert().multiply(_cq).multiply(_cq2);
          addQuat(b, q);
        }
      }
      const tip = craneTip(crane.tipW);
      for (const s of crane.strokes) {
        const at = s.act.time, bv = s.ip.evaluate(at), sx = bv[0], sy = bv[1];
        if (sy < 0.01) { s.rev = 0; s.seen = false; }
        const inWin = at >= s.t0 && at <= s.t1 + 0.15;
        if (inWin) {
          s.seen = true;
          const lp = strokeLocal(s, tip, _cv), along = (lp.y * s.dn) / s.L;
          if (s === act) { crane.dist = Math.abs(lp.z); crane.lat = [+lp.x.toFixed(4), +along.toFixed(3)]; }
          if (Math.abs(lp.z) < 0.012 && Math.abs(lp.x) < 0.03 && along > -0.05) s.rev = Math.max(s.rev, Math.min(1, along, sy + 0.04));
        } else if (!s.seen) s.rev = Math.max(s.rev, sy);
        s.op = sx < 0.999 ? Math.max(0, Math.min(1, (sx - 0.001) / 0.999)) : 1;
        const e = s.op * s.op * (3 - 2 * s.op);
        s.o.scale.set(1, Math.max(0.001, s.rev), s.o.scale.z);
        s.mat.opacity = e;
        s.o.visible = s.rev > 0.003 && e > 0.003;
      }
      if (!crane.busy && crane.pend.length) { const p = crane.pend.splice(0); for (const f of p) { if (clock.elapsedTime - f.t < (/^react_/.test(f.clip.name) ? 9 : 4.2)) f(); else if (f.done) f.done(); } }
    }

    function smoothSetup() {
      const list = Array.isArray(manifest.smooth) ? manifest.smooth : [];
      if (!list.length || !(bakedU.uMinLod.value > 0)) return;
      const U = { value: 1.2 }, cache = new Map();
      for (const spec of list) for (const nd of matchNodes(String(spec))) nd.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        if (o.material === baked) { let v = cache.get(baked); if (!v) { v = variant(baked, { lod: U }); cache.set(baked, v); } o.material = v; }
      });
    }

    const contacts = [];
    function contactSetup() {
      if (!stage || params.get('contact') === '0') return;
      const names = new Set();
      for (const v of PLACE_VIEWS) if (places[v] && Array.isArray(places[v].cast)) for (const n of places[v].cast) names.add(n);
      for (const sc of (Array.isArray(manifest.secrets) ? manifest.secrets : [])) if (sc && sc.object && sc.object !== 'turtle') names.add(sc.object);
      for (const n of ['magpie_rail_0', 'magpie_rail_1', 'magpie_rail_2']) names.add(n);
      const geo = new THREE.PlaneGeometry(2, 2); geo.rotateX(-Math.PI / 2);
      const box = new THREE.Box3(), sz = new THREE.Vector3(), c = new THREE.Vector3();
      for (const n of names) {
        const o = root.getObjectByName(n) || root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n)); if (!o) continue;
        const rig = o.getObjectByName('RIG_' + n);
        box.setFromObject(rig || o, false); if (box.isEmpty() && rig) box.setFromObject(o, false); if (box.isEmpty()) continue;
        box.getSize(sz); box.getCenter(c);
        const m = new THREE.ShaderMaterial({ uniforms: { uA: { value: 0.32 }, uNight: FX.fxU.uNight },
          vertexShader: 'varying vec2 vQ; void main() { vQ = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: 'uniform float uA; uniform float uNight; varying vec2 vQ; void main() { float r = length(vQ); float a = pow(clamp(1.0 - r, 0.0, 1.0), 1.6) * uA * mix(0.75, 1.0, uNight); if (a < 0.003) discard; gl_FragColor = vec4(0.0, 0.0, 0.0, a); }',
          transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
        const mesh = new THREE.Mesh(geo, m); mesh.name = 'fx_contact_' + n; mesh.renderOrder = 3; mesh.frustumCulled = false;
        const rx = Math.max(0.12, sz.x * 0.42), rz = Math.max(0.12, sz.z * 0.42);
        mesh.scale.set(rx, 1, rz); mesh.position.set(c.x, box.min.y + 0.006, c.z);
        scene.add(mesh);
        const wp = o.getWorldPosition(new THREE.Vector3());
        contacts.push({ o, mesh, rx, rz, y0: box.min.y, off: new THREE.Vector3(c.x - wp.x, 0, c.z - wp.z), wy0: wp.y, rest: wp.clone(), last: wp.clone(),
          H: Math.min(0.8, Math.max(0.25, 1.6 * Math.max(rx, rz))), s0: o.getWorldScale(new THREE.Vector3()).x || 1, a: 1, q: null });
      }
    }
    const ground = { ready: false, busy: false, cell: 0.25, tri: null, cells: new Map() };
    const groundKey = (cx, cz) => (cx + 32768) * 65536 + (cz + 32768);
    async function groundSetup() {
      if (!contacts.length || ground.ready || ground.busy || disposed) return;
      ground.busy = true;
      const gT0 = performance.now();
      const anim = new Set(); for (const cl of clips) for (const tr of cl.tracks) anim.add(tr.name.split('.')[0]);
      const R = 2.2, C = ground.cell, tris = [], cells = ground.cells;
      let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
      const centres = contacts.map((k) => Object.assign(k.rest.clone(), { r: R }));
      root.traverse((o) => { if (/^FX_petals_/i.test(nameOf(o))) centres.push(Object.assign(o.getWorldPosition(new THREE.Vector3()), { r: 3.8 })); });
      if (WIND && stage) { const hm = stage.home().target; centres.push(Object.assign(new THREE.Vector3(hm.x, 0, hm.z), { r: 10 })); }
      for (const c of centres) { bx0 = Math.min(bx0, c.x - c.r); bx1 = Math.max(bx1, c.x + c.r); bz0 = Math.min(bz0, c.z - c.r); bz1 = Math.max(bz1, c.z + c.r); }
      const list = [];
      root.traverse((o) => {
        if (!o.isMesh || o.isSkinnedMesh || !o.visible || /^fx_/.test(o.name) || FX.isSky(o)) return;
        if (/GLOW|BEAM|SPRITE|SCREEN|WATER/i.test((o.material && o.material.name) || '')) return;
        for (let q = o; q; q = q.parent) if (anim.has(q.name)) return;
        list.push(o);
      });
      const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
      let n = 0;
      for (const o of list) {
        o.updateWorldMatrix(true, false);
        const g = o.geometry, pa = g.attributes.position, ix = g.index, cnt = ix ? ix.count : pa.count, M = o.matrixWorld;
        if (!pa) continue;
        for (let i = 0; i + 2 < cnt; i += 3) {
          if ((++n & 127) === 0) { await maybeSlice(); if (disposed) return; }
          va.fromBufferAttribute(pa, ix ? ix.getX(i) : i).applyMatrix4(M);
          vb.fromBufferAttribute(pa, ix ? ix.getX(i + 1) : i + 1).applyMatrix4(M);
          vc.fromBufferAttribute(pa, ix ? ix.getX(i + 2) : i + 2).applyMatrix4(M);
          const x0 = Math.max(bx0, Math.min(va.x, vb.x, vc.x)), x1 = Math.min(bx1, Math.max(va.x, vb.x, vc.x));
          const z0 = Math.max(bz0, Math.min(va.z, vb.z, vc.z)), z1 = Math.min(bz1, Math.max(va.z, vb.z, vc.z));
          if (x0 > x1 || z0 > z1) continue;
          let near = false;
          for (const c of centres) if (x1 > c.x - c.r && x0 < c.x + c.r && z1 > c.z - c.r && z0 < c.z + c.r) { near = true; break; }
          if (!near) continue;
          const ux = vb.x - va.x, uy = vb.y - va.y, uz = vb.z - va.z, wx = vc.x - va.x, wy = vc.y - va.y, wz = vc.z - va.z;
          const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, nl = Math.hypot(nx, ny, nz);
          if (!(nl > 1e-10) || Math.abs(ny) / nl < 0.35) continue;
          const t = tris.length;
          tris.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z);
          for (let cx = Math.floor(x0 / C); cx <= Math.floor(x1 / C); cx++) for (let cz = Math.floor(z0 / C); cz <= Math.floor(z1 / C); cz++) {
            const key = groundKey(cx, cz); let arr = cells.get(key); if (!arr) { arr = []; cells.set(key, arr); } arr.push(t);
          }
        }
      }
      ground.tri = new Float32Array(tris); ground.cov = centres.map((c) => [c.x, c.z, c.r - 0.3]);
      ground.ms = Math.round(performance.now() - gT0);
      ground.ready = true; ground.busy = false;
    }
    function groundAt(x, z, yMax) {
      const C = ground.cell, arr = ground.cells.get(groundKey(Math.floor(x / C), Math.floor(z / C)));
      if (!arr) return null;
      const T = ground.tri; let best = null;
      for (const t of arr) {
        const ax = T[t], ay = T[t + 1], az = T[t + 2], bx = T[t + 3], by = T[t + 4], bz = T[t + 5], cx = T[t + 6], cy = T[t + 7], cz = T[t + 8];
        const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
        if (Math.abs(d) < 1e-12) continue;
        const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, l3 = 1 - l1 - l2;
        if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
        const y = l1 * ay + l2 * by + l3 * cy;
        if (y <= yMax && (best === null || y > best)) best = y;
      }
      return best;
    }
    const _cs = new THREE.Vector3();
    function stepContacts(dt) {
      for (const k of contacts) {
        k.o.getWorldPosition(_lw);
        const jump = _lw.distanceToSquared(k.last) > 0.35 * 0.35;
        k.last.copy(_lw);
        const foot = _lw.y - (k.wy0 - k.y0), px = _lw.x + k.off.x, pz = _lw.z + k.off.z;
        let s = k.y0;
        if (Math.hypot(_lw.x - k.rest.x, _lw.z - k.rest.z) > 0.08 || foot < k.y0 - 0.03) {
          if (ground.ready) {
            if (!k.q || Math.abs(px - k.q[0]) + Math.abs(pz - k.q[1]) > 0.02 || Math.abs(foot - k.q[2]) > 0.02) k.q = [px, pz, foot, groundAt(px, pz, foot + 0.08)];
            s = k.q[3];
          } else if (foot < k.y0 - 0.03) s = null;
        }
        const h = s === null ? 9 : Math.max(0, foot - s), f = Math.max(0, 1 - h / k.H);
        const target = k.o.getWorldScale(_cs).x < 0.5 * k.s0 ? 0 : f * f;
        if (jump) k.a = 0;
        else if (dt === null || dt === undefined) k.a = target;
        else k.a += (target - k.a) * Math.min(1, dt / (target > k.a ? 0.25 : 0.05));
        if (k.a <= 0.02 && target <= 0.02 && k.placed) { k.mesh.visible = false; continue; }
        k.placed = true;
        k.mesh.position.set(px, (s === null ? k.y0 : s) + 0.006, pz);
        const sc = 1 + Math.min(h, 1) * 0.6; k.mesh.scale.set(k.rx * sc, 1, k.rz * sc);
        k.mesh.material.uniforms.uA.value = 0.32 * k.a;
        k.mesh.visible = k.a > 0.02 && tier < 4;
      }
    }
    const _lw = new THREE.Vector3(), _lt = new THREE.Vector3(), liteList = [], byFirst = (a, b) => a[0] - b[0];
    let screenObj = undefined;
    function stepLite(t) {
      if (!stage) return;
      const n = night, top = tier < 3;
      liteU.uRim.value = top ? 0.5 : 0;
      if (stage.moonMesh) liteU.uMoonL.value.copy(stage.moonMesh.position).sub(controls.target).normalize();
      if (liteList.length !== glows.length) { liteList.length = 0; for (const g of glows) liteList.push([0, new THREE.Vector3(), g]); }
      for (const e of liteList) { const g = e[2]; if (!g.ready) glowSetup(g); g.node.getWorldPosition(e[1]); e[0] = e[1].distanceToSquared(controls.target); }
      liteList.sort(byFirst);
      const list = liteList;
      const N = top ? Math.min(12, list.length) : 0;
      for (let i = 0; i < N; i++) {
        const [, p, g] = list[i];
        const fl = 1 + 0.06 * Math.sin(t * (2.3 + g.sp) + g.ph) + 0.04 * Math.sin(t * (5.1 + g.sp) + g.ph * 1.7);
        const gu = windDir ? (WIND ? Math.max(0, windAt(t, p, _gwv) - GUST.base) : gustAt(t, p.dot(windDir))) : 0;
        liteU.uLamp.value[i].set(p.x, p.y, p.z, Math.max(0.6, Math.min(1.6, g.L * 1.4)));
        liteU.uLampI.value[i] = 0.16 * fl * (1 - 0.18 * Math.min(1, gu)) * (1 + 0.15 * g.boost) * (0.25 + 0.75 * n);
      }
      liteU.uLampN.value = N;
      if (screenObj === undefined) { screenObj = null; root.traverse((o) => { if (!screenObj && o.isMesh && /^SCREEN/.test(o.material && o.material.name || '') && !FX.isSky(o)) screenObj = o; }); }
      if (screenObj && top && slides) {
        screenObj.getWorldPosition(_lt);
        _lt.z += 0.6;
        const f = slides.u.uFade.value, dip = 1 - 0.2 * Math.sin(Math.PI * f);
        liteU.uSpill.value.set(_lt.x, _lt.y, _lt.z, 1.4);
        liteU.uSpillC.value.setRGB(0.5, 0.55, 0.64).multiplyScalar(0.12 * dip * (0.3 + 0.7 * n));
      } else liteU.uSpillC.value.setRGB(0, 0, 0);
    }

    let mirrorSkipped = 0;
    const mirrorList = [];
    function mirrorLighten(on) {
      for (const o of mirrorList) { const keep = o.layers.mask & 16; if (on) o.layers.set(2); else o.layers.set(0); o.layers.mask |= keep; }
      mirrorSkipped = on ? mirrorList.length : 0;
    }
    function mirrorSkip() {
      if (!stage || params.get('mirror') === 'all') return;
      const box = new THREE.Box3(), sz = new THREE.Vector3();
      root.updateMatrixWorld(true);
      root.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        const mn = o.material.name || '', nm = nameOf(o);
        let skip = false;
        if (/^G_chess_|chess_piece|cup|kettle|jar/i.test(nm) || /SPRITE_needles/.test(mn)) skip = true;
        else if (o.isSkinnedMesh) { let q = o, sky = false; while (q) { if (/^G_sky_koi/.test(nameOf(q))) { sky = true; break; } q = q.parent; } skip = !sky; }
        else if (!/PAPER|GLOW|SCREEN|BEAM/.test(mn)) { box.setFromObject(o); if (!box.isEmpty() && box.getSize(sz).length() < 0.45) skip = true; }
        if (skip) mirrorList.push(o);
      });
      if (mirrorList.length) { camera.layers.enable(2); raycaster.layers.enable(2); }
    }

    const timer = new THREE.Timer();
    if (typeof timer.connect === 'function') timer.connect(document);
    const clock = { elapsedTime: 0, getDelta() { timer.update(); this.elapsedTime = timer.getElapsed(); return timer.getDelta(); } };
    let disposed = false;
    let onScreen = true, frameN = 0, mixN = 0, restIO = null;
    if (typeof IntersectionObserver === 'function') { try { const io = new IntersectionObserver((es) => { for (const e of es) onScreen = e.isIntersecting; }); io.observe(canvas); restIO = io; } catch (e) {  } }
    const forced = params.get('tier') !== null ? +params.get('tier') : null;
    let tier = 0, tierT = 0, winSum = 0, winN = 0, winT0 = 0, overWins = 0, goodSince = -1, prTarget = null;
    let prMax = prCap(), drops = 0, readyT = 0, enterT = 0, partW = 1, partGoal = 1, winFT = [];
    const prFor = (t) => (t >= 5 ? Math.min(prMax, 1) : t >= 4 ? Math.min(prMax, 1.5) : prMax);
    function applyTier(t) {
      tier = Math.max(0, Math.min(6, t)); tierT = performance.now();
      if (!stage) return;
      if (stage.setMirror) stage.setMirror(tier >= 1 ? 0.5 : 1, tier >= 5 ? 2 : 1);
      mirrorLighten(tier >= 2);
      partGoal = tier >= 3 ? 0 : 1;
      FX.petalRate(petalsP, petalRateFor());
      prTarget = prFor(tier);
      ev('tier', { tier, pixelRatio: prTarget });
    }
    function syncPR() {
      prMax = prCap();
      if (prTarget !== null) prTarget = prFor(tier);
    }
    const prSettled = () => prTarget === null || Math.abs(renderer.getPixelRatio() - prTarget) <= 0.01;
    function stepPart(dt) {
      if (partW === partGoal) return;
      partW = partGoal > partW ? Math.min(partGoal, partW + dt / 0.5) : Math.max(partGoal, partW - dt / 0.5);
      const e = partW * partW * (3 - 2 * partW);
      for (const pr of FX.particles) if (!leapDrops.includes(pr)) pr.gate = e;
    }
    function startTier() {
      let t0 = forced !== null && isFinite(forced) ? forced : (manifest && manifest.stage && isFinite(+manifest.stage.tier) ? +manifest.stage.tier : 0);
      if (forced === null && softGL) t0 = Math.max(t0, 5);
      const cn = navigator.connection; if (forced === null && cn && cn.saveData) t0 = Math.max(t0, 1);
      if (forced === null && reduced) t0 = Math.max(t0, 1);
      applyTier(t0); stepPart(1);
      if (!prSettled()) { renderer.setPixelRatio(prTarget); frame(); }
      if (forced === null && navigator.getBattery) navigator.getBattery().then((b) => { if (!b.charging && b.level < 0.2 && tier < 2) applyTier(2); }).catch(() => {});
    }
    function watchTier(ms) {
      if (!stage || forced !== null) return;
      const now = performance.now();
      if (!winT0) winT0 = now;
      winSum += ms; winN++; winFT.push(ms);
      if (now - winT0 < 2000) return;
      const avg = winSum / winN, slow = winFT.filter((x) => x > 20).length / winFT.length; winSum = 0; winN = 0; winT0 = now; winFT = [];
      if (!readyT) readyT = now;
      if (enteredOnce && !enterT) enterT = now;
      const busy = !enteredOnce || now - readyT < 6000 || now - enterT < 5000 || glide.t <= glide.dur || night !== nightTarget || now - tierT < 4000 || !prSettled() || held.size > 0 || now - lastInput < 1500;
      if (busy) { overWins = 0; goodSince = -1; return; }
      if (avg > 24 && slow > 0.5) { overWins++; goodSince = -1; if (overWins >= 1 && tier < 6) { drops++; applyTier(tier + 1); overWins = 0; } }
      else { overWins = 0; if (avg < 17.5 && slow < 0.1 && drops < 2) { if (goodSince < 0) goodSince = now; if (now - goodSince > 10000 && tier > 0) { applyTier(tier - 1); goodSince = now; } } else goodSince = -1; }
    }
    let lastRaf = 0, prStepT = 0, mixAcc = 0, frozenSet = false;
    let freezeT = params.get('freeze') !== null && isFinite(+params.get('freeze')) ? +params.get('freeze') : null;
    let tickMs = 0, rafPrev = 0, rafN = 0, capN = 1, capT = 0;
    const rafDts = [];
    function tick(ts) {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      if (!ready) return;
      const nowR = performance.now();
      if (document.hidden || !onScreen || !canvas.isConnected) {
        lastRaf = 0; rafPrev = 0; timer.reset();
        if (night !== nightTarget) { night = nightTarget; modeFrom = night; modeTo = nightTarget; nightUniform.value = night; FX.fxU.uNight.value = night; }
        if (modeWaiters.length) { const wt = modeWaiters; modeWaiters = []; wt.forEach((f) => f()); }
        if (glide.t <= glide.dur) stepGlide(glide.dur);
        return;
      }
      const ft = typeof ts === 'number' ? ts : nowR;
      if (rafPrev) { const d = ft - rafPrev; if (d > 2 && d < 40) { rafDts.push(d); if (rafDts.length > 30) rafDts.shift(); } }
      rafPrev = ft;
      if (nowR - capT > 1000 && rafDts.length >= 20) { capT = nowR; const sd = rafDts.slice().sort((a, b) => a - b); capN = Math.max(1, Math.min(6, Math.floor(1000 / 60 / sd[sd.length >> 1] + 0.3))); }
      if (capN > 1 && (++rafN % capN) !== 0) return;
      const frameDt = lastRaf ? nowR - lastRaf : 16.7;

      lastRaf = nowR;
      if (ready && stage) {
        watchTier(frameDt);
        if (!prSettled() && held.size === 0 && nowR - prStepT > 1500) {
          prStepT = nowR; const pr = renderer.getPixelRatio(); renderer.setPixelRatio(pr > prTarget ? Math.max(prTarget, pr - 0.25) : Math.min(prTarget, pr + 0.25)); frame();
        }
      }
      const tk0 = performance.now();
      const dt = Math.min(clock.getDelta(), 0.25);
      const t = freezeT !== null ? freezeT : clock.elapsedTime;
      if (nightTarget !== modeTo) { modeFrom = night; modeTo = nightTarget; modeT0 = t; lampsSwitch(nightTarget, t); }
      if (night !== nightTarget) {
        const u = Math.min(1, (t - modeT0) / MODE_FADE);
        night = u >= 1 ? nightTarget : modeFrom + (nightTarget - modeFrom) * u * u * (3 - 2 * u);
      }
      if (night === nightTarget && modeWaiters.length) { const w = modeWaiters; modeWaiters = []; w.forEach((f) => f()); }
      nightUniform.value = night;
      FX.fxU.uNight.value = night;
      FX.fxU.uPx.value = pxm() * renderer.getPixelRatio();
      if (!reduced || stage) FX.fxU.uTime.value = t;
      applyBg();
      for (const e of nightMats) {
        const f = e.d + (e.n - e.d) * night;
        e.m.color.copy(e.base).multiplyScalar(f);
        if (e.dayT) { const k = 1 - night; e.m.color.r *= 1 - k * (1 - e.dayT[0]); e.m.color.g *= 1 - k * (1 - e.dayT[1]); e.m.color.b *= 1 - k * (1 - e.dayT[2]); }
      }
      if (ready) {
        frameStamp++;
        if (freezeT !== null) { if (!frozenSet) { for (const m of mixers) m.setTime(freezeT); frozenSet = true; } }
        else if (tier >= 6 && (mixN++ & 1)) { mixAcc += dt; } else { for (const m of mixers) m.update(dt + mixAcc); mixAcc = 0; stepEyes(); }
        if (juice) { stepJuice(t); if (!reduced) { stepEvents(); if (tier < 3) stepWind(t, dt); stepHint(dt); } else if (tier < 3) stepWind(t, dt); }
        if (!reduced) { stepChessFade(); stepCrane(dt); }
        stepTurtlePool();
        stepClock();
        stepLamps(t);
        stepFg(dt); { const rv = rimQ || RIM[layoutOf() === 'desk' ? 'desk' : 'phone']; rimU.value = rv[0] * (1 - night); rimLo.value = rv[1]; }
        stepLite(t);
        stepPart(dt);
        if (contacts.length) stepContacts(freezeT !== null ? null : dt);
        if (whenNodes.length) stepWhen();
        for (const f of fxUpdaters) f(t);
        FX.chaseUpdate(t, night, reduced);
        FX.particlesUpdate(night);
        if (slides) FX.slidesUpdate(slides, t, reduced);
      }
      const gliding = ready && stage && stepGlide(dt);
      if (!gliding && (!stage || view === 'explore' || !ready)) controls.update();
      if (stage && juice && !reduced && freezeT === null && stage.nextStar !== undefined && stage.nextStar !== starAsk && t >= stage.nextStar && (t - lifeLastBig < 6 || leapSoon(2.5) || flightSoon(2.5))) stage.nextStar = t + 3 + Math.random() * 4;
      if (stage) stage.update(t, night, controls, reduced || !juice);
      if (ready) { FX.skyUpdate(camera, controls.target); if (stage) stepKeep(); }
      let swayed = false;
      if (juice && ready && !reduced && (view === 'welcome' || view === 'explore') && !gliding && glide.t > glide.dur) {
        const idle = performance.now() - lastInput > 6000;
        swayRamp = idle ? Math.min(1, swayRamp + dt / 3) : Math.max(0, swayRamp - dt / 0.35);
        swayAmt = swayRamp * swayRamp * (3 - 2 * swayRamp);
        if (swayAmt > 0) {
          _sp.copy(camera.position); _sq.copy(camera.quaternion);
          const ph = 6.2831853 * t / 20, az = THREE.MathUtils.degToRad(0.42) * Math.sin(ph) * swayAmt, po = THREE.MathUtils.degToRad(0.2) * Math.sin(2 * ph) * swayAmt;
          _sv.copy(camera.position).sub(controls.target).applyAxisAngle(_sAxis.set(0, 1, 0), az);
          _sAxis.setFromMatrixColumn(camera.matrixWorld, 0); _sv.applyAxisAngle(_sAxis, po);
          camera.position.copy(controls.target).add(_sv); camera.lookAt(controls.target); camera.updateMatrixWorld();
          swayed = true;
        }
      }
      if (!ctxLost) renderer.render(scene, camera);
      renderVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); vpReady = true;
      tickMs = performance.now() - tk0;
      if (swayed) { camera.position.copy(_sp); camera.quaternion.copy(_sq); camera.updateMatrixWorld(); }
      if (ready) for (const fn of frameFns) { try { fn(); } catch (e) { console.error(e); } }
    }

    function teardown() {
      if (typeof timer.dispose === 'function') timer.dispose();
      disposed = true;
      cancelAnimationFrame(raf);
      clearInterval(pTimer); pTimer = 0;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (restIO) restIO.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onInput);
      window.removeEventListener('keydown', onInput);
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
      controls.removeEventListener('change', onControlsChange);
      controls.dispose();
      if (stage) stage.dispose();
      const texs = new Set();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
        for (const m of ms) {
          for (const k of Object.keys(m)) { const v = m[k]; if (v && v.isTexture) texs.add(v); }
          if (m.uniforms) for (const u of Object.values(m.uniforms)) { if (u && u.value && u.value.isTexture) texs.add(u.value); }
          m.dispose();
        }
      });
      for (const tx of [dayTex, nightTex]) if (tx) texs.add(tx);
      for (const tx of texs) tx.dispose();
      frameFns.clear();
      modeWaiters.forEach((f) => f()); modeWaiters = [];
      FX.resetFx();
      if (draco) draco.dispose();
      renderer.renderLists.dispose();
      renderer.dispose();
      if (typeof window !== 'undefined' && window.__world && window.__world === api) delete window.__world;
    }

    const api = {
      setView,
      setMode,
      resize: (ins) => { if (ins !== undefined) setInsets(ins); frame(); },
      setInsets,
      markers,
      ringRect,
      showSlide,
      intro,
      entered,
      hint,
      greet,
      onFrame(fn) { frameFns.add(fn); return () => frameFns.delete(fn); },
      get info() {
        const date = opt.date instanceof Date ? opt.date : new Date();
        return { moonPhase: stage ? stage.phase : STAGE.moonPhase(date), season: stage ? stage.season : STAGE.seasonOf(date), triangles: root ? countTris(root) : 0, tier, pixelRatio: +renderer.getPixelRatio().toFixed(2), devicePixelRatio: window.devicePixelRatio || 1, drops };
      },
      get view() { return view; },
      dispose() { if (!disposed) teardown(); },
      gust: (strength) => (stage && !reduced && freezeT === null ? startGust(clock.elapsedTime, strength) : false),
      _shootStar: () => { if (stage) { stage.shootStar(clock.elapsedTime); starAsk = clock.elapsedTime; } },
      _seek: (t) => {
        if (t === null || t === undefined) { freezeT = null; frozenSet = false; return null; }
        freezeT = +t; for (const m of mixers) m.setTime(freezeT); frozenSet = true;
        FX.fxU.uTime.value = freezeT; if (stage) stage.update(freezeT, night, controls, true);
        for (const f of fxUpdaters) f(freezeT); FX.particlesUpdate(night); if (slides) FX.slidesUpdate(slides, freezeT, true);
        stepChessFade(); if (juice) stepEvents();
        if (contacts.length) stepContacts(null);
        if (whenNodes.length) stepWhen();
        renderer.render(scene, camera);
        return freezeT;
      },
      _times: () => ({ clock: +clock.elapsedTime.toFixed(3), held: freezeT, shader: +FX.fxU.uTime.value.toFixed(3), mixers: mixers.map((m) => +m.time.toFixed(3)), main: mixerMain ? +mixerMain.time.toFixed(3) : null, loop120: mixerMain ? +(mixerMain.time % 120).toFixed(3) : null }),
      _clips: () => clips, _mixer: () => mixerMain, _cam: () => camera, _slides: () => slides && { shown: slides.files[slides.texs.indexOf(slides.u.tA.value)], next: slides.files[slides.texs.indexOf(slides.u.tB.value)], fade: +slides.u.uFade.value.toFixed(2), seq: slides.seq.map((k) => slides.files[k].split('/').pop()), durs: slides.durs }, _dbg: () => ({ t: glide.t, dur: glide.dur, ease: glide.ease, done: !!glide.done, active: activeReacts.map((r) => r.a.getClip().name + ':' + r.a.getEffectiveWeight().toFixed(2)), fades: activeReacts.map((r) => [r.clip.name, +r.fin.toFixed(2), +r.fout.toFixed(2), r.fd ? r.fd.map((x) => +(x * 1000).toFixed(0)) : null]) }), _gust: () => { gustNext = 0; }, _winds: () => winds.map((w) => [nameOf(w.node), w.kind, +w.x.toFixed(3), +w.len.toFixed(2), +w.U.uWDisp.value.length().toFixed(4), w.amount, +w.p.x.toFixed(2), +w.p.z.toFixed(2), +(w.m || 0).toFixed(4), +windAt(clock.elapsedTime, w.p, new THREE.Vector3()).toFixed(4)]), _windDir: () => windDir && [+windDir.x.toFixed(3), +windDir.z.toFixed(3), gustDir ? +gustDir.x.toFixed(3) : null, gustDir ? +gustDir.z.toFixed(3) : null, +gSpeed.toFixed(2)], _hangs: () => (hangs || []).map((e) => [+e.p.x.toFixed(2), +e.X.length().toFixed(4), +windAt(clock.elapsedTime, e.p, new THREE.Vector3()).toFixed(4)]), _chessFade: () => chessFade && chessFade.U.value, _pool: () => tPool && { p: tPool.pool.position.toArray(), o: +tPool.m.opacity.toFixed(3) }, _crane: () => crane && { w: +crane.w.toFixed(3), kg: +crane.kg.toFixed(3), lat: crane.lat, busy: crane.busy, dist: crane.dist == null ? null : +crane.dist.toFixed(4), bone: crane.bone.name, pend: crane.pend.length, strokes: crane.strokes.map((s) => ({ n: s.o.name, at: +s.act.time.toFixed(2), t0: s.t0, t1: s.t1, rev: +s.rev.toFixed(3), op: +s.op.toFixed(2), p: s.o.getWorldPosition(new THREE.Vector3()).toArray() })) },
      _secretAt: (cx, cy) => { const r = secretAt(cx, cy); const hits = []; if (secretObjs) for (const s2 of secretObjs) hits.push(s2.name + ':' + raycaster.intersectObject(s2.obj, true).length); return [r && r.name, hits]; },
      _screen: (x, y, z) => { _v.set(x, y, z).project(camera); return [(_v.x + 1) / 2 * W(), (1 - _v.y) / 2 * H(), _v.z]; },
      _scene: scene, _manifest: () => manifest, _bytes: () => totalBytes, _renderer: renderer, _life: () => Object.assign({}, lifeN, { floaters: floaters ? floaters.length : 0, listeners: listeners ? listeners.length : 0 }), _tickMs: () => tickMs, _mirrorSkipped: () => mirrorSkipped, _frames: (src) => { if (src) { mergeFrames(src); samples = null; if (stage && ready) jumpTo(view); } return JSON.parse(JSON.stringify(FRAMES)); }, _layout: () => layoutOf(), _pick: (x, y) => { raycaster.setFromCamera(new THREE.Vector2(x / W() * 2 - 1, 1 - y / H() * 2), camera); const h = raycaster.intersectObject(root, true).filter((q) => q.object.visible && !q.object.isSprite && !q.object.isPoints); return h.slice(0, 2).map((q) => [nameOf(q.object), +q.distance.toFixed(2), [+q.point.x.toFixed(2), +(-q.point.z).toFixed(2), +q.point.y.toFixed(2)]]); }, _keep: () => FX.fxU.uKeep.value.map((v) => v.toArray().map((x) => +x.toFixed(3))), _fg: () => [...fgNodes].map(([nd, e]) => [nameOf(nd), +e.U.value.toFixed(3)]), _tier: (n) => { if (stage && isFinite(+n)) applyTier(+n); return { tier, target: prTarget, pr: renderer.getPixelRatio() }; }, _held: () => held.size,
      _insets: () => insets && Object.assign({}, insets),
      _events: () => evLog.slice(),
      _petals: () => (petalsP ? petalsP.P.filter((q) => q.st === 2).map((q) => { const g = ground.ready ? groundAt(q.p.x, q.p.z, q.p.y + 0.05) : null; return [+q.p.y.toFixed(3), q.water ? 'w' : 'g', g === null ? null : +g.toFixed(3), +q.p.x.toFixed(2), +q.p.z.toFixed(2), petalsP.groundAt ? petalsP.groundAt(q.p.x, q.p.z, q.p.y + 0.05) : 'none', +q.ly.toFixed(3)]; }) : null),
      _calm: () => { gustNext = 1e12; if (idleS === null) idleSetup(); for (const e of idleS) e.next = 1e12; return true; },
      _heads: () => (headL || []).map((e) => [e.ch, +THREE.MathUtils.radToDeg(e.y).toFixed(1), +THREE.MathUtils.radToDeg(e.p).toFixed(1), +THREE.MathUtils.radToDeg(e.yL).toFixed(0), +THREE.MathUtils.radToDeg(e.pL).toFixed(0)]),
      _clock: () => { if (clockS === null) clockSetup(); if (!clockS) return null; const ang = (hd) => { const q = hd.o.quaternion.clone().multiply(hd.q0.clone().invert()); let a = 2 * Math.atan2(q.x * hd.axisL.x + q.y * hd.axisL.y + q.z * hd.axisL.z, q.w) * 180 / Math.PI * clockS.sense; a = ((a % 360) + 360) % 360; return +a.toFixed(3); }; return { h: ang(clockS.h), m: ang(clockS.m), now: new Date().toString() }; },
      _idles: (kick) => { if (idleS === null) idleSetup(); if (kick) for (const e of idleS) if (kick === true || e.ch === kick) e.next = clock.elapsedTime; return idleS.map((e) => [e.ch, e.list.map((c) => c.name), e.last && e.last.name, +(e.next - clock.elapsedTime).toFixed(1)]); },
      _anim: () => { if (idleS === null) idleSetup(); if (flightS === null) flightSetup(); return { cap: capN, flight: flightS.map((f) => [+f.L.toFixed(2), f.spans.map((x) => x.map((y) => +y.toFixed(2)))]), eyes: eyePairs ? eyePairs.map((p) => [p.e.name, p.shut.map((q) => q.o.name), p.ax, +p.lo.toFixed(3)]) : null, split: splitClips.size, idles: idleS.map((e) => [e.ch, e.pv, e.list.map((c) => [c.name, +c.duration.toFixed(2), c.tracks.map((tr) => tr.name), idleSpans(e, c).map(([L, sp]) => [L, sp.map((x) => x.map((y) => +y.toFixed(2)))])])]) }; },
      _keepY: (v) => { const k = keepPts[v]; if (!k) return null; let y0 = 1e9, y1 = -1e9; for (let i = 1; i < k.length; i += 3) { y0 = Math.min(y0, k[i]); y1 = Math.max(y1, k[i]); } return [+y0.toFixed(2), +y1.toFixed(2)]; },
      _charInfo: (v) => { const pts = charSamples[v]; if (!pts) return null; camera.updateMatrixWorld(); let y0 = 1e9, y1 = -1e9, sy0 = 1e9, sy1 = -1e9, cx = 0, cy = 0, cz = 0; const n = pts.length / 3; for (let i = 0; i < pts.length; i += 3) { y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]); cx += pts[i]; cy += pts[i + 1]; cz += pts[i + 2]; _v.set(pts[i], pts[i + 1], pts[i + 2]).project(camera); const sy = (1 - _v.y) / 2 * H(); sy0 = Math.min(sy0, sy); sy1 = Math.max(sy1, sy); } _v.set(cx / n, cy / n, cz / n); const dist = _v.distanceTo(camera.position), hpx = sy1 - sy0; return { worldH: +(y1 - y0).toFixed(3), hpx: +hpx.toFixed(1), top: +sy0.toFixed(1), bot: +sy1.toFixed(1), dist: +dist.toFixed(3), pxm: +(hpx / (y1 - y0)).toFixed(1), K: +(hpx / (y1 - y0) / H()).toFixed(4), H: H(), fov: camera.fov }; },
      _rim: (k, lo) => { rimQ = isFinite(+k) && isFinite(+lo) ? [+k, +lo] : null; return rimQ; },
      _mainRect: (v) => { const pts = mainSamples[v]; if (!pts) return null; camera.updateMatrixWorld(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < pts.length; i += 3) { _v.set(pts[i], pts[i + 1], pts[i + 2]).project(camera); const sx = (_v.x + 1) / 2 * W(), sy = (1 - _v.y) / 2 * H(); x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); } return { x0: +x0.toFixed(1), x1: +x1.toFixed(1), y0: +y0.toFixed(1), y1: +y1.toFixed(1), w: W(), h: H() }; },
      _pins: () => (pinPts ? Object.fromEntries(Object.entries(pinPts).map(([L, o]) => [L, Object.fromEntries(Object.entries(o).map(([v, q]) => [v, q && q.toArray().map((x) => +x.toFixed(3))]))])) : null),
      _petalAir: () => (petalsP ? petalsP.P.filter((q) => q.st === 1).map((q) => { const v = q.p.clone().project(camera); return [Math.round((v.x + 1) / 2 * W()), Math.round((1 - v.y) / 2 * H()), +q.sc.toFixed(2), +q.a.toFixed(2), +q.p.y.toFixed(2)]; }) : null),
      _occl: () => [occl.length, occl.reduce((a, o) => a + o.geometry.attributes.position.count, 0)],
      _pickDbg: (x, y) => { pickDbg = null; const r = canvas.getBoundingClientRect(), t = tapTarget(x + r.left, y + r.top, false); return [t ? t.name : null, pickDbg]; },
      _busy: () => ({ bigT: +bigT.toFixed(2), now: +clock.elapsedTime.toFixed(2), reacts: activeReacts.filter((r) => !r.idle && !r.stop).map((r) => r.clip.name), tree: touchCool.get('tree') }),
      _target: (x, y) => { const r = canvas.getBoundingClientRect(), tg = stage && ready ? tapTarget(x + r.left, y + r.top, true) : null; return tg ? tg.name : null; },
      _yawDbg: (v) => { const d = []; pickYaw(v, frameOf(v), freeArea(), fillQ || FILL[layoutOf()] || 0.58, d); return { names: nodeSamples.filter((s) => s.v !== v).map((s) => s.nm), d }; },
      _castRect: (v) => {
        const p = places[v] || (root && root.getObjectByName(v) ? { cast: [v] } : null); if (!p || !root) return null;
        const w = W(), h = H(), q = new THREE.Vector3(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        root.updateMatrixWorld(true); camera.updateMatrixWorld();
        for (const n of Array.isArray(p.cast) ? p.cast : []) {
          const o = root.getObjectByName(n) || root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n)); if (!o) continue;
          o.traverse((m) => {
            if (!m.isMesh || !m.visible || !m.geometry || !m.geometry.attributes.position) return;
            const pa = m.geometry.attributes.position;
            for (let i = 0; i < pa.count; i += 2) { q.fromBufferAttribute(pa, i); if (m.isSkinnedMesh) m.applyBoneTransform(i, q); q.applyMatrix4(m.matrixWorld).project(camera); const sx = (q.x + 1) / 2 * w, sy = (1 - q.y) / 2 * h; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
          });
        }
        return x1 > x0 ? { x0: +x0.toFixed(1), x1: +x1.toFixed(1), y0: +y0.toFixed(1), y1: +y1.toFixed(1), w, h } : null;
      },
      _frame: (v) => { if (!stage || !ready) return null; const t = targetFor(v); return { look: t.look3.toArray().map((x) => +x.toFixed(4)), at: t.at3.toArray().map((x) => +x.toFixed(4)), o: t.o, yaw: t.yaw, shift: t.shift, n: PLACE_VIEWS.includes(v) ? (placeSamples[v] ? placeSamples[v].length / 3 : 0) : (samples ? samples.length / 3 : 0) }; },
      _looks: () => ({ looks: looks.map((L) => [nameOf(L.o), +L.t0.toFixed(2), +L.dur.toFixed(2), +L.amt.toFixed(3)]), busy: [...busyHeads].map(nameOf), weights: [...lookW].map(([o, w]) => [nameOf(o), +w.toFixed(2)]), floats: floatWinds.map((f) => [nameOf(f.node), f.amount]) }),
      _stats: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, programs: renderer.info.programs.length, night, ground: ground.ready ? ground.tri.length / 9 : -1, groundMs: ground.ms || 0 }),
    };

    frame();
    tick();
    const guard = setInterval(() => { if (settled) { clearInterval(guard); return; } if (performance.now() - lastAct > 30000) { clearInterval(guard); fail(new Error('timeout: the world stalled for 30 s')); } }, 1000);
    load().then(() => {
      clearInterval(guard);
      if (settled) return;
      ready = true;
      controls.enabled = !stage || view === 'explore';
      requestAnimationFrame(() => {
        if (settled) return;
        renderer.render(scene, camera);
        mark('first frame');
        progress(1);
        startTier();
        setTimeout(() => { if (!enteredOnce && performance.now() - lastInput < 20000) entered(); }, 20000);
        if (stage && juice && !reduced) setTimeout(() => { petalSetup(); }, 2500);
        if (contacts.length) setTimeout(() => { groundSetup().catch(() => { ground.busy = false; }); }, 1500);
        settled = true;
        if (typeof window !== 'undefined') window.__world = api;
        resolve(api);
        if (upgrade.length) setTimeout(upgradeAtlases, 600);
      });
    }).catch((e) => { clearInterval(guard); fail(e); });
  });
}
