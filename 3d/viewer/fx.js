import * as THREE from 'three';

export const fxU = { uTime: { value: 0 }, uNight: { value: 0 }, uPx: { value: 100 }, uWind: { value: new THREE.Vector3() }, uWindF: { value: new THREE.Vector3() }, uRepel: { value: new THREE.Vector4(0, -999, 0, 0) }, uKeep: { value: [new THREE.Vector4(), new THREE.Vector4()] } };
const KEEP_GLSL = `uniform vec4 uKeep[2];
float keepOut(vec4 clip, float seed) {
  vec2 q = clip.xy / max(clip.w, 1e-4); float k = 1.0;
  for (int i = 0; i < 2; i++) { vec4 z = uKeep[i]; if (z.z > 0.0) { float r = length((q - z.xy) / z.zw); k *= 1.0 - (1.0 - smoothstep(0.7, 1.05, r)) * step(0.35, seed); } }
  return k;
}
`;
export function keepAt(x, y, seed) {
  let k = 1;
  for (const z of fxU.uKeep.value) { if (z.z > 0 && seed >= 0.35) { const r = Math.hypot((x - z.x) / z.z, (y - z.y) / z.w), t = Math.min(1, Math.max(0, (r - 0.7) / 0.35)); k *= t * t * (3 - 2 * t); } }
  return k;
}

const KIND_RE = /^UNLIT_(?:GLOW_)?(?:UNLIT_)?(?:GLOW_)?(BEAM|GLASS|CAUSTIC|CHASE|SHADOW)(?:_|$)/;
export function fxKind(matName) { const m = KIND_RE.exec(matName || ''); return m ? m[1] : null; }
const nm = (o) => (o && ((o.userData && o.userData.name) || o.name)) || '';
export function isSky(o) { return /^SCREEN_SKY/.test(nm(o)) || (!!o.parent && /^SCREEN_SKY/.test(nm(o.parent))); }

const OUT = '\n#include <colorspace_fragment>\n';
const v3 = () => new THREE.Vector3();

function beamAttributes(g) {
  if (g.attributes.aV) return;
  const pa = g.attributes.position, n = pa.count, p = v3(), cen = v3(), axis = v3(), r = v3();
  for (let i = 0; i < n; i++) cen.add(p.fromBufferAttribute(pa, i));
  cen.divideScalar(Math.max(n, 1));
  g.computeBoundingBox();
  const size = g.boundingBox.getSize(v3());
  const ext = Math.max(size.x, size.y, size.z, 1e-6);
  let fallback = false;
  if (cen.length() > 0.2 * ext) axis.copy(cen).normalize();
  else { fallback = true; axis.set(size.x >= size.y && size.x >= size.z ? 1 : 0, size.y > size.x && size.y >= size.z ? 1 : 0, size.z > size.x && size.z > size.y ? 1 : 0); }
  const d = new Float32Array(n);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < n; i++) { d[i] = p.fromBufferAttribute(pa, i).dot(axis); lo = Math.min(lo, d[i]); hi = Math.max(hi, d[i]); }
  const span = Math.max(hi - lo, 1e-6);
  const av = new Float32Array(n), ar = new Float32Array(n * 3), ax = new Float32Array(n * 3);
  const nrm = g.attributes.normal;
  let wLo = 0, cLo = 0, wHi = 0, cHi = 0;
  for (let i = 0; i < n; i++) {
    av[i] = (d[i] - lo) / span;
    p.fromBufferAttribute(pa, i).sub(cen);
    r.copy(p).addScaledVector(axis, -p.dot(axis));
    const len = r.length();
    if (av[i] < 0.15) { wLo += len; cLo++; } else if (av[i] > 0.85) { wHi += len; cHi++; }
    if (len > 1e-6) r.divideScalar(len); else if (nrm) r.fromBufferAttribute(nrm, i); else r.set(0, 1, 0);
    ar[i * 3] = r.x; ar[i * 3 + 1] = r.y; ar[i * 3 + 2] = r.z;
    ax[i * 3] = axis.x; ax[i * 3 + 1] = axis.y; ax[i * 3 + 2] = axis.z;
  }
  if (fallback && cLo && cHi && wLo / cLo > wHi / cHi) for (let i = 0; i < n; i++) av[i] = 1 - av[i];
  g.setAttribute('aAx', new THREE.BufferAttribute(ax, 3));
  g.setAttribute('aV', new THREE.BufferAttribute(av, 1));
  g.setAttribute('aRad', new THREE.BufferAttribute(ar, 3));
}
const BEAM_VS = `attribute float aV; attribute vec3 aRad; attribute vec3 aAx; varying float vV; varying float vS; varying float vZ; varying float vEnd;
void main() {
  vV = aV;
  mat3 mv = mat3(modelViewMatrix);
  vec3 r = normalize(mv * aRad); vec3 a = mv * aAx;
  float la = length(a.xy), along = la / max(length(a), 1e-6);
  vec2 perp = la > 1e-5 ? vec2(-a.y, a.x) / la : vec2(1.0, 0.0);
  vS = mix(0.6 * length(r.xy), dot(r.xy, perp), smoothstep(0.1, 0.45, along));
  vZ = abs(r.z);
  vEnd = 1.0 - smoothstep(0.5, 0.75, along);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const BEAM_FS = `uniform vec3 uColor; uniform float uTime; uniform float uNight; uniform float uStrength; varying float vV; varying float vS; varying float vZ; varying float vEnd;
void main() {
  float fl = 0.93 + 0.035 * sin(uTime * 4.7) + 0.025 * sin(uTime * 11.3 + 1.7) + 0.02 * sin(uTime * 1.3 + 0.4);
  fl *= 0.975 + 0.025 * fract(sin(floor(uTime * 12.0) * 78.233) * 43758.5453);
  float s = mix(0.12, 1.25, uNight) * fl;
  float along = smoothstep(0.0, 0.05, vV) * (1.0 - 0.45 * vV) * (0.75 + 0.25 * smoothstep(0.85, 1.0, vV));
  float edge = pow(clamp(1.0 - vS * vS, 0.0, 1.0), 1.3) * (0.6 + 0.4 * clamp(vZ, 0.0, 1.0));
  edge = mix(edge, 0.5 + 0.5 * edge, clamp(vEnd, 0.0, 1.0));
  vec2 mq = vec2(vV * 46.0 - uTime * 0.11, vS * 9.0 + sin(uTime * 0.07 + vV * 3.0) * 0.6);
  vec2 mi = floor(mq), mf = fract(mq) - 0.5;
  float mh = fract(sin(dot(mi, vec2(127.1, 311.7))) * 43758.5453);
  vec2 mo = vec2(fract(mh * 17.3), fract(mh * 31.7)) - 0.5;
  float mote = step(0.86, mh) * smoothstep(0.16, 0.0, length(mf - mo * 0.6)) * (0.6 + 0.4 * sin(uTime * (0.8 + mh * 1.7) + mh * 6.283));
  float lens = 1.0 + 0.9 * (1.0 - smoothstep(0.0, 0.45, vV));
  gl_FragColor = vec4(uColor, clamp((0.6 + 1.6 * mote) * lens * s * along * edge * uStrength, 0.0, 1.0));
  ${OUT}
}`;

const GLASS_VS = `varying vec3 vP; varying vec3 vN; varying float vFace; varying vec3 vW;
void main() { vP = position; vN = normal; vFace = abs(normalize(normalMatrix * normal).z);
  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const GLASS_FS = `uniform vec3 uColor; uniform vec3 uMin; uniform vec3 uMax; uniform float uNight; uniform float uGlow;
varying vec3 vP; varying vec3 vN; varying float vFace; varying vec3 vW;
void main() {
  vec3 c = 0.5 * (uMin + uMax), h = 0.5 * (uMax - uMin), d = h - abs(vP - c), n = abs(normalize(vN));
  float e = 1e3;
  if (n.x < 0.6 && h.x > 0.004) e = min(e, d.x);
  if (n.y < 0.6 && h.y > 0.004) e = min(e, d.y);
  if (n.z < 0.6 && h.z > 0.004) e = min(e, d.z);
  float rim = 1.0 - smoothstep(0.0, 0.035, e);
  float sheen = smoothstep(0.82, 1.0, sin((vW.x * 0.55 + vW.y * 0.8 - vW.z * 0.35) * 2.6)) * 0.05;
  float dim = mix(1.0, mix(0.62, 1.0, uGlow), uNight);
  float a = 0.13 + 0.12 * (1.0 - vFace) + rim * mix(0.32, 0.45, uNight) + sheen;
  vec3 col = mix(uColor * dim, vec3(1.0), clamp(rim * 0.65 + sheen * 4.0, 0.0, 1.0));
  gl_FragColor = vec4(col, clamp(a, 0.0, 0.85));
  ${OUT}
}`;

const CAUSTIC_VS = `uniform vec3 uA; uniform vec3 uB; varying vec2 vQ;
void main() { vQ = vec2(dot(position, uA), dot(position, uB)); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const CAUSTIC_FS = `uniform vec3 uColor; uniform vec2 uLo; uniform vec2 uHi; uniform float uTime; uniform float uNight; varying vec2 vQ;
void main() {
  vec2 e2 = min(vQ - uLo, uHi - vQ);
  float fade = smoothstep(0.0, 0.32, min(e2.x, e2.y));
  float t = uTime * 0.32 + 23.0;
  vec2 p = mod(vQ * (6.28318 / 1.45), 6.28318) - 250.0;
  vec2 i = p; float c = 1.0;
  for (int n = 0; n < 3; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.005), p.y / (cos(i.y + tt) / 0.005)));
  }
  c /= 3.0; c = 1.17 - pow(c, 1.4);
  float k = smoothstep(0.64, 0.84, c); k = k * k * 1.15 + 0.12 * smoothstep(0.45, 0.7, c);
  gl_FragColor = vec4(uColor, clamp(k * fade * mix(0.35, 0.9, uNight), 0.0, 1.0));
  ${OUT}
}`;

const DISC_VS = `varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const DISC_FS = `uniform vec3 uColor; uniform vec3 uCen; uniform float uR; uniform float uNight; varying vec3 vP;
void main() { float r = length(vP - uCen) / uR; float a = pow(clamp(1.0 - r * r, 0.0, 1.0), 1.3) * mix(0.55, 0.38, uNight);
  gl_FragColor = vec4(uColor, a); ${OUT} }`;

const SCR_VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SCREEN_FS = `uniform sampler2D tA; uniform sampler2D tB; uniform float uFade; uniform float uNight; varying vec2 vUv;
void main() { vec3 c = mix(texture2D(tA, vUv).rgb, texture2D(tB, vUv).rgb, uFade); c = clamp((c - 0.02) * 1.14 + 0.015, 0.0, 1.0) * mix(1.02, 1.08, uNight);
  gl_FragColor = vec4(c, 1.0); ${OUT} }`;
const SKY_FS = `uniform sampler2D tA; uniform sampler2D tB; uniform float uFade; uniform float uNight; uniform float uTime; varying vec2 vUv;
void main() {
  vec3 c = mix(texture2D(tA, vUv).rgb, texture2D(tB, vUv).rgb, uFade);
  vec2 e = min(vUv, 1.0 - vUv);
  float f = smoothstep(0.0, 0.16, e.x) * smoothstep(0.0, 0.2, e.y);
  float fl = 0.95 + 0.03 * sin(uTime * 4.7) + 0.02 * sin(uTime * 11.3 + 1.7);
  gl_FragColor = vec4(c, f * f * (3.0 - 2.0 * f) * mix(0.65, 1.0, uNight) * fl);
  ${OUT}
}`;

function cream() {
  const t = new THREE.DataTexture(new Uint8Array([243, 230, 200, 255]), 1, 1);
  t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
  return t;
}

export function makeSlides(manifest, loadTex) {
  const scr = manifest.screen && typeof manifest.screen === 'object' ? manifest.screen : null;
  const base = (f) => String(f).split('/').pop().replace(/\.[a-z0-9]+$/i, '');
  const norm = (s) => (typeof s === 'string' ? { id: base(s), file: s } : (s && typeof s === 'object' && typeof s.file === 'string' ? { id: s.id != null ? String(s.id) : base(s.file), file: s.file, kind: s.kind } : null));
  let seqItems = (scr && Array.isArray(scr.slides) ? scr.slides : []).map(norm).filter(Boolean);
  let catItems = (scr && Array.isArray(scr.items) ? scr.items : []).map(norm).filter(Boolean);
  const prog = catItems.some((it) => it.kind === 'title' || it.kind === 'still');
  let durs = null, startAt = 0;
  if (prog) {
    const isLeader = (it) => it.kind === 'leader' || /^leader/i.test(base(it.file));
    const leaders = new Set(catItems.concat(seqItems).filter(isLeader).map((it) => it.file));
    catItems = catItems.filter((it) => !isLeader(it));
    seqItems = [];
    const order = [];
    for (const it of catItems) if (!order.includes(it.id)) order.push(it.id);
    durs = [];
    for (const idv of order) {
      const ti = catItems.find((it) => it.id === idv && it.kind === 'title'), st = catItems.find((it) => it.id === idv && it.kind === 'still');
      if (ti && !leaders.has(ti.file)) { seqItems.push(ti); durs.push(2.5); }
      if (st && !leaders.has(st.file)) { if (!seqItems.length || seqItems.length === (ti ? 1 : 0)) startAt = seqItems.length; seqItems.push(st); durs.push(6); }
    }
    const pf = scr.poster ? seqItems.findIndex((it) => it.file === scr.poster || base(it.file) === base(scr.poster)) : -1;
    if (pf >= 0) startAt = pf;
    else if (Number.isInteger(scr.poster_index) && scr.poster_index >= 0 && scr.poster_index < seqItems.length && !isLeader(seqItems[scr.poster_index])) startAt = scr.poster_index;
  }
  const list = [], idOf = new Map();
  for (const it of [...seqItems, ...catItems]) { if (!list.includes(it.file)) list.push(it.file); if (!idOf.has(it.id)) idOf.set(it.id, it.file); }
  for (const it of catItems) if (it.kind === 'still') idOf.set(it.id, it.file);
  const seqFiles = (seqItems.length ? seqItems : catItems).map((it) => it.file);
  const sec = Math.max(1.5, Number(scr && scr.seconds) || 6);
  const show = { active: list.length > 0, texs: [], ids: [], byId: new Map(), seq: [], si: 0, i: 0, t0: -1, sec, fade: prog ? 0.9 : Math.min(1.4, sec * 0.3), hold: null, holdT: -1,
    durs, startAt, u: { tA: { value: null }, tB: { value: null }, uFade: { value: 0 } } };
  if (prog) {
    const files = list.slice();
    show.files = files;
    show.texs = files.map(() => { const t = new THREE.Texture(); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; return t; });
    show.loaded = files.map(() => false);
    show.ids = files.map(() => null);
    for (const [idv, f] of idOf) { const k = files.indexOf(f); if (k >= 0 && show.ids[k] === null) show.ids[k] = idv; }
    show.byId = new Map([...idOf].map(([idv, f]) => [idv, files.indexOf(f)]).filter((x) => x[1] >= 0));
    show.seq = seqFiles.map((f) => files.indexOf(f));
    show.onLoaded = null;
    const pending = new Map();
    show.load = (k) => {
      if (show.loaded[k]) return Promise.resolve(true);
      if (pending.has(k)) return pending.get(k);
      const pr = loadTex(files[k]).then((t) => {
        const ph = show.texs[k];
        ph.image = t.image; ph.anisotropy = t.anisotropy || 4; ph.generateMipmaps = true; ph.minFilter = THREE.LinearMipmapLinearFilter; ph.needsUpdate = true;
        show.loaded[k] = true; if (show.onLoaded) show.onLoaded(ph); return true;
      }).catch(() => {
        const keep = show.seq.map((x, j) => (x === k ? -1 : j)).filter((j) => j >= 0);
        const cur = show.seq[show.si];
        if (show.durs) show.durs = keep.map((j) => show.durs[j]);
        show.seq = keep.map((j) => show.seq[j]); const ns = show.seq.indexOf(cur); show.si = ns >= 0 ? ns : 0;
        return false;
      });
      pending.set(k, pr); return pr;
    };
    let resting = false;
    show.loadRest = async (idle) => {
      if (resting) return; resting = true;
      const order = [];
      for (let j = 1; j <= show.seq.length; j++) order.push(show.seq[(show.startAt + j) % show.seq.length]);
      for (const k of order) { if (!show.loaded[k]) { if (idle) await idle(); await show.load(k); } }
    };
    show.ready = (async () => {
      const posterK = show.seq[show.startAt % Math.max(1, show.seq.length)];
      if (posterK !== undefined) await show.load(posterK);
      if (!show.loaded.some(Boolean)) show.active = false;
    })();
    return show;
  }
  show.ready = (async () => {
    const got = await Promise.allSettled(list.map((s) => loadTex(s)));
    const ok = got.map((g, i) => (g.status === 'fulfilled' ? [list[i], g.value] : null)).filter(Boolean);
    show.texs = ok.map((x) => x[1]);
    const files = ok.map((x) => x[0]);
    show.files = files;
    show.ids = files.map(() => null);
    for (const [idv, f] of idOf) { const k = files.indexOf(f); if (k >= 0 && show.ids[k] === null) show.ids[k] = idv; }
    show.byId = new Map([...idOf].map(([idv, f]) => [idv, files.indexOf(f)]).filter((x) => x[1] >= 0));
    const keep = seqFiles.map((f) => files.indexOf(f));
    if (show.durs) show.durs = show.durs.filter((_, j) => keep[j] >= 0);
    if (show.durs && keep[show.startAt] < 0) show.startAt = 0; else if (show.durs) show.startAt = keep.slice(0, show.startAt).filter((k) => k >= 0).length;
    show.seq = keep.filter((k) => k >= 0);
    if (!show.texs.length) show.active = false;
  })();
  return show;
}
export function slidesStart(show, fallbackTex) {
  const seq = show.seq && show.seq.length ? show.seq : null;
  const s0 = seq && show.durs ? show.startAt % seq.length : 0;
  const a = (seq ? show.texs[seq[s0]] : show.texs[0]) || fallbackTex || cream();
  show.i = seq ? seq[s0] : 0; show.si = s0;
  show.u.tA.value = a; show.u.tB.value = (seq ? show.texs[seq[(s0 + 1) % seq.length]] : show.texs[1 % Math.max(show.texs.length, 1)]) || a;
}
export function slidesHold(show, k) {
  if (k === show.hold) return;
  show.hold = k; show.holdT = -1;
  if (k !== null && show.load && show.loaded && !show.loaded[k]) show.load(k);
  if (k === null) {
    show.t0 = -1;
    const seq = show.seq && show.seq.length ? show.seq : null;
    if (seq) { const j = seq.indexOf(show.i); show.si = j >= 0 ? j : 0; show.u.tB.value = show.texs[seq[(show.si + 1) % seq.length]]; }
    else if (show.texs.length) show.u.tB.value = show.texs[(show.i + 1) % show.texs.length];
  }
}
export function slidesUpdate(show, t, still) {
  const n = show.texs.length;
  if (show.hold !== null && n) {
    const k = show.hold;
    if (show.loaded && !show.loaded[k]) { show.load(k); return; }
    const vis = show.u.uFade.value > 0.5 ? show.u.tB.value : show.u.tA.value;
    if (show.holdT < 0 || show.fadingTo !== k) {
      if (vis === show.texs[k] && (show.u.uFade.value === 0 || show.u.uFade.value === 1)) { show.u.tA.value = show.texs[k]; show.u.uFade.value = 0; show.i = k; show.holdT = -1; show.fadingTo = k; return; }
      show.u.tA.value = vis; show.u.tB.value = show.texs[k]; show.u.uFade.value = 0; show.holdT = t; show.fadingTo = k;
    }
    if (show.holdT < 0) return;
    const f = still ? 1 : Math.min(1, (t - show.holdT) / 0.3);
    show.u.uFade.value = f * f * (3 - 2 * f);
    if (f >= 1) { show.u.tA.value = show.texs[k]; show.u.uFade.value = 0; show.i = k; show.holdT = -1; show.t0 = t; }
    return;
  }
  const seq = show.seq && show.seq.length ? show.seq : null;
  if ((seq ? seq.length : n) < 2 || still) return;
  if (show.t0 < 0) show.t0 = t;
  const el = t - show.t0, dur = show.durs && seq ? show.durs[show.si] || show.sec : show.sec;
  if (el < dur) { if (show.u.uFade.value !== 0) show.u.uFade.value = 0; return; }
  if (show.loaded && seq) { const nk = seq[(show.si + 1) % seq.length]; if (!show.loaded[nk]) { show.load(nk); show.t0 = t - dur; return; } }
  const f = (el - dur) / show.fade;
  if (f >= 1) {
    if (seq) { show.si = (show.si + 1) % seq.length; show.i = seq[show.si]; show.u.tA.value = show.texs[show.i]; show.u.tB.value = show.texs[seq[(show.si + 1) % seq.length]]; }
    else { show.i = (show.i + 1) % n; show.u.tA.value = show.texs[show.i]; show.u.tB.value = show.texs[(show.i + 1) % n]; }
    show.t0 = t; show.u.uFade.value = 0;
    return;
  }
  show.u.uFade.value = f * f * (3 - 2 * f);
}
export function screenMaterial(show) {
  return new THREE.ShaderMaterial({ uniforms: { ...show.u, uNight: fxU.uNight }, vertexShader: SCR_VS, fragmentShader: SCREEN_FS });
}
let skyMat = null;
export function skyMaterial(show) {
  if (!skyMat) skyMat = new THREE.ShaderMaterial({ uniforms: { ...show.u, uNight: fxU.uNight, uTime: fxU.uTime }, vertexShader: SCR_VS,
    fragmentShader: SKY_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true });
  return skyMat;
}
export function resetFx() { fxU.uWindF.value.set(0, 0, 0); fxU.uWind.value.set(0, 0, 0); skyMat = null; chase.length = 0; chaseSets.clear(); beamCache.clear(); skyPivots.length = 0; particles.length = 0; fxMap = {}; sky0 = null; for (const z of fxU.uKeep.value) z.set(0, 0, 0, 0);
  for (const s of petalSys) { if (s.im.parent) s.im.parent.remove(s.im); s.im.geometry.dispose(); s.im.material.dispose(); }
  petalSys.length = 0; }

const skyPivots = [];
let sky0 = null;
const _c = new THREE.Vector3(), _b = new THREE.Box3();
export function skySetup(root, meshes) {
  for (const m of meshes) {
    _b.setFromObject(m).getCenter(_c);
    const p = new THREE.Group();
    p.name = 'SKY_pivot';
    root.add(p);
    p.position.copy(root.worldToLocal(_c));
    p.updateMatrixWorld(true);
    p.attach(m);
    skyPivots.push(p);
  }
  sky0 = null;
}
export function skyUpdate(camera, target) {
  if (!skyPivots.length) return;
  const a = Math.atan2(camera.position.x - target.x, camera.position.z - target.z);
  if (sky0 === null) sky0 = a;
  for (let i = 0; i < skyPivots.length; i++) skyPivots[i].rotation.y = a - sky0;
}

const chase = [];
const chaseSets = new Map();
function trailing(o) {
  for (let p = o, k = 0; p && k < 3; p = p.parent, k++) { const m = /(\d+)(?!.*\d)/.exec(nm(p)); if (m) return Number(m[1]); }
  return 0;
}
export function chaseFinish() {
  for (const set of chaseSets.values()) {
    set.sort((a, b) => a.k - b.k);
    set.forEach((e, i) => { e.i = i; e.n = set.length; chase.push(e); });
  }
  chaseSets.clear();
}
export function chaseUpdate(t, night, still) {
  const lo = 0.78 + (0.32 - 0.78) * night, hi = 0.94 + 0.06 * night;
  for (let j = 0; j < chase.length; j++) {
    const e = chase[j];
    let f = 1;
    if (!still) { const c = 0.5 + 0.5 * Math.cos(6.2831853 * (e.i / 3 - t * 1.15)); f = c * c * c; }
    e.m.color.copy(e.base).multiplyScalar(lo + (hi - lo) * f);
  }
}

const beamCache = new Map();
let fxMap = {};
export function setFxProps(fx) { fxMap = fx && typeof fx === 'object' ? fx : {}; }
function strengthOf(o) {
  for (let p = o, k = 0; p && k < 2; p = p.parent, k++) {
    const u = p.userData || {};
    const v = u.strength != null ? u.strength : (fxMap[nm(p)] || fxMap[p.name] || {}).strength;
    if (v != null && isFinite(+v)) return Math.max(0, Math.min(4, +v));
  }
  return 1;
}
export function makeFxMaterial(kind, o, src, matName) {
  const col = src && src.color ? src.color.clone() : new THREE.Color(1, 1, 1);
  const g = o.geometry;
  let m;
  if (kind === 'BEAM') {
    beamAttributes(g);
    const st = strengthOf(o), key = matName + '|' + st;
    m = beamCache.get(key);
    if (!m) {
      m = new THREE.ShaderMaterial({ uniforms: { uColor: { value: col }, uTime: fxU.uTime, uNight: fxU.uNight, uStrength: { value: st } }, vertexShader: BEAM_VS,
        fragmentShader: BEAM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true });
      beamCache.set(key, m);
    }
    o.userData.fxNoFrame = true;
  } else if (kind === 'GLASS') {
    g.computeBoundingBox();
    m = new THREE.ShaderMaterial({ uniforms: { uColor: { value: col }, uMin: { value: g.boundingBox.min.clone() }, uMax: { value: g.boundingBox.max.clone() },
      uNight: fxU.uNight, uGlow: { value: /GLOW/.test(matName) ? 1 : 0 } }, vertexShader: GLASS_VS, fragmentShader: GLASS_FS,
      transparent: true, depthWrite: false, side: THREE.DoubleSide });
  } else if (kind === 'CAUSTIC') {
    g.computeBoundingBox();
    const s = g.boundingBox.getSize(v3()), lo = g.boundingBox.min, hi = g.boundingBox.max;
    const ax = [0, 1, 2].sort((a, b) => s.getComponent(b) - s.getComponent(a));
    const A = v3().setComponent(ax[0], 1), B = v3().setComponent(ax[1], 1);
    m = new THREE.ShaderMaterial({ uniforms: { uColor: { value: col }, uA: { value: A }, uB: { value: B },
      uLo: { value: new THREE.Vector2(lo.getComponent(ax[0]), lo.getComponent(ax[1])) }, uHi: { value: new THREE.Vector2(hi.getComponent(ax[0]), hi.getComponent(ax[1])) },
      uTime: fxU.uTime, uNight: fxU.uNight }, vertexShader: CAUSTIC_VS, fragmentShader: CAUSTIC_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  } else if (kind === 'SHADOW') {
    g.computeBoundingBox();
    const cen = g.boundingBox.getCenter(v3()), s = g.boundingBox.getSize(v3());
    const r = Math.max(1e-4, [s.x, s.y, s.z].sort((a, b) => b - a)[0] / 2);
    m = new THREE.ShaderMaterial({ uniforms: { uColor: { value: col }, uCen: { value: cen }, uR: { value: r }, uNight: fxU.uNight },
      vertexShader: DISC_VS, fragmentShader: DISC_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
    o.renderOrder = -1;
  } else {
    m = new THREE.MeshBasicMaterial({ color: col.clone() });
    const e = { m, base: col, k: trailing(o), i: 0, n: 1 };
    if (!chaseSets.has(matName)) chaseSets.set(matName, []);
    chaseSets.get(matName).push(e);
  }
  return m;
}

const P_VS = {
  petals: `float f = fract(uTime * uRate * aSeed.y + aSeed.x);
    vec3 p = vec3(position.x + sin(uTime * 0.55 * aSeed.y + aSeed.z * 6.283) * 0.16, 1.0 - 2.0 * f, position.z + cos(uTime * 0.47 * aSeed.y + aSeed.w * 6.283) * 0.16);
    vA = smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(0.84, 1.0, f));
    vRot = uTime * (0.6 + aSeed.w) + aSeed.z * 6.283;
    vSq = 0.3 + 0.7 * abs(sin(uTime * (0.9 + aSeed.z) + aSeed.x * 6.283));
    vShade = 0.8 + 0.4 * aSeed.w; float sz = 0.6 + 0.8 * aSeed.z * aSeed.z;`,
  fireflies: `vec3 p = position * 0.78 + vec3(sin(uTime * 0.21 * aSeed.y + aSeed.x * 6.283), 0.7 * sin(uTime * 0.29 * aSeed.y + aSeed.z * 6.283), cos(uTime * 0.17 * aSeed.y + aSeed.w * 6.283)) * 0.22;
    float pl = 0.5 + 0.5 * sin(uTime * (0.7 + aSeed.z * 0.9) + aSeed.x * 6.283);
    vA = 0.12 + 0.88 * smoothstep(0.45, 1.0, pl); vRot = 0.0; vSq = 1.0; vShade = 1.0; float sz = 0.8 + 0.4 * aSeed.w;`,
  drops: `float f = fract(uTime * uRate + aSeed.x);
    vec3 p = vec3(position.x * (0.03 + 0.05 * f), -f * f, position.z * (0.03 + 0.05 * f));
    vA = smoothstep(0.0, 0.04, f) * (1.0 - smoothstep(0.78, 1.0, f)); vRot = 0.0; vSq = 1.0; vShade = 0.9 + 0.2 * aSeed.z; float sz = 0.8 + 0.3 * aSeed.w;`,
  zzz: `float f = fract(uTime * uRate + aSeed.x);
    vec3 p = vec3(f * 0.42 + sin(f * 5.0 + aSeed.z) * 0.05, f * 0.85, 0.0);
    vA = smoothstep(0.0, 0.12, f) * (1.0 - smoothstep(0.55, 1.0, f));
    vRot = -0.28 + sin(f * 4.0) * 0.14; vSq = 1.0; vShade = 1.0; float sz = 0.5 + 0.7 * f;`,
};
const P_FS = {
  petals: `vec2 c = gl_PointCoord - 0.5; float cs = cos(vRot), sn = sin(vRot); c = mat2(cs, -sn, sn, cs) * c; c.x /= max(vSq, 0.05);
    float d = length(c * vec2(1.75, 1.08) + vec2(0.0, 0.5 * c.x * c.x)); float a = 1.0 - smoothstep(0.4, 0.5, d);
    vec3 col = uColor * vShade * (0.82 + 0.3 * (0.5 - c.y));`,
  fireflies: `float d = length(gl_PointCoord - 0.5) * 2.0; float core = 1.0 - smoothstep(0.0, 0.28, d); float halo = pow(max(1.0 - d, 0.0), 2.2) * 0.55;
    float a = clamp(core + halo, 0.0, 1.0); vec3 col = mix(uColor, vec3(1.0, 1.0, 0.92), core * 0.6);`,
  drops: `vec2 c = gl_PointCoord - 0.5; c.y += 0.08; float w = mix(0.5, 1.0, smoothstep(-0.4, 0.15, c.y));
    float d = length(vec2(c.x * 2.6 / w, c.y * 1.55)); float a = (1.0 - smoothstep(0.36, 0.5, d)) * 0.85;
    vec3 col = uColor * vShade + vec3(0.25) * (1.0 - smoothstep(0.0, 0.12, length(c - vec2(-0.05, 0.02))));`,
  zzz: `vec2 c = gl_PointCoord - 0.5; float cs = cos(vRot), sn = sin(vRot); c = mat2(cs, -sn, sn, cs) * c;
    vec4 tx = texture2D(uTex, c + 0.5); float a = tx.a; vec3 col = uColor * tx.rgb;`,
};
const P_DEF = {
  petals: { color: '#f2b6c9', count: 10, size: 0.13, rate: 0.085, blend: THREE.NormalBlending, when: '' },
  fireflies: { color: '#ffd76a', count: 12, size: 0.22, rate: 1, blend: THREE.AdditiveBlending, when: 'night' },
  drops: { color: '#bfe2ff', count: 9, size: 0.075, rate: 1.15, blend: THREE.NormalBlending, when: '' },
  zzz: { color: '#f6f1ff', count: 2, size: 0.3, rate: 0.31, blend: THREE.NormalBlending, when: '' },
};
let zTex = null;
function zTexture() {
  if (zTex) return zTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.font = '900 50px ui-rounded, "SF Pro Rounded", "Nunito", "Arial Rounded MT Bold", system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 9; g.strokeStyle = 'rgba(40,30,50,0.45)'; g.strokeText('Z', 32, 34);
  g.fillStyle = '#fff'; g.fillText('Z', 32, 34);
  zTex = new THREE.CanvasTexture(c); zTex.colorSpace = THREE.SRGBColorSpace; zTex.flipY = false;
  return zTex;
}
export function parseColor(c, fallback) {
  const out = new THREE.Color(fallback);
  if (c == null || c === '') return out;
  try {
    if (Array.isArray(c) && c.length >= 3) out.setRGB(+c[0], +c[1], +c[2], THREE.SRGBColorSpace);
    else if (typeof c === 'number') out.setHex(c);
    else { const s = String(c).trim(); out.set(/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(s) ? '#' + s : s); }
  } catch { out.set(fallback); }
  return out;
}
export const whenOf = (w) => { const s = String(w || '').toLowerCase(); return s === 'day' ? 1 : s === 'night' ? 2 : 0; };
export const whenFactor = (w, night) => (w === 1 ? 1 - night : w === 2 ? night : 1);

export const particles = [];
export function addParticles(holder, kind, props, rnd) {
  const D = P_DEF[kind];
  const n = Math.max(1, Math.min(200, Math.round(Number(props.count) || D.count)));
  const pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = rnd() * 2 - 1; pos[i * 3 + 1] = rnd() * 2 - 1; pos[i * 3 + 2] = rnd() * 2 - 1;
    const even = kind === 'drops' || kind === 'zzz' || kind === 'petals';
    seed[i * 4] = even ? (i + rnd() * 0.35) / n : rnd(); seed[i * 4 + 1] = 0.75 + rnd() * 0.5; seed[i * 4 + 2] = rnd(); seed[i * 4 + 3] = rnd();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const sz = isFinite(+props.size) && +props.size > 0 ? +props.size : (kind === 'petals' && props.stage ? 0.08 : D.size);
  const u = { uTime: fxU.uTime, uPx: fxU.uPx, uVis: { value: 1 }, uSize: { value: sz }, uRate: { value: D.rate },
    uColor: { value: parseColor(props.color, D.color) }, uTex: { value: kind === 'zzz' ? zTexture() : null } };
  const repel = kind === 'fireflies' && props.stage;
  const ff = kind === 'fireflies';
  const proj = kind === 'petals' ? 'vec4 wp = modelMatrix * vec4(p, 1.0); wp.xyz += uWind * (0.35 + 0.5 * aSeed.y) * f; vec4 mv = viewMatrix * wp;'
    : repel ? 'vec4 wp = modelMatrix * vec4(p, 1.0); vec3 rd = wp.xyz - uRepel.xyz; float rl = length(rd); wp.xyz += rd / max(rl, 1e-3) * max(uRepel.w - rl, 0.0) * 0.9; wp.xyz += uWindF * (0.4 + 0.6 * aSeed.y); vec4 mv = viewMatrix * wp;'
    : ff ? 'vec4 wp = modelMatrix * vec4(p, 1.0); wp.xyz += uWindF * (0.4 + 0.6 * aSeed.y); vec4 mv = viewMatrix * wp;'
    : 'vec4 mv = modelViewMatrix * vec4(p, 1.0);';
  if (kind === 'petals') u.uWind = fxU.uWind;
  if (ff) u.uWindF = fxU.uWindF;
  if (repel) u.uRepel = fxU.uRepel;
  u.uKeep = fxU.uKeep;
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: D.blend,
    vertexShader: `uniform float uTime; uniform float uPx; uniform float uSize; uniform float uRate; uniform float uVis; attribute vec4 aSeed;${kind === 'petals' ? ' uniform vec3 uWind;' : ''}${ff ? ' uniform vec3 uWindF;' : ''}${repel ? ' uniform vec4 uRepel;' : ''}
      varying float vA; varying float vRot; varying float vSq; varying float vShade;
      ${KEEP_GLSL}
      void main() { ${P_VS[kind]} vA *= uVis; ${proj} gl_Position = projectionMatrix * mv; gl_PointSize = uSize * uPx * sz;${kind === 'drops' ? '' : ' vA *= keepOut(gl_Position, fract(aSeed.x * 7.13 + aSeed.z * 3.71));'} }`,
    fragmentShader: `uniform vec3 uColor; uniform sampler2D uTex; varying float vA; varying float vRot; varying float vSq; varying float vShade;
      void main() { ${P_FS[kind]} if (a * vA < 0.004) discard; gl_FragColor = vec4(col, a * vA); ${OUT} }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  holder.add(pts);
  particles.push({ pts, u, when: props.when != null && props.when !== '' ? whenOf(props.when) : whenOf(D.when) });
}
export function particlesUpdate(night) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const w = whenFactor(p.when, night) * (p.gate === undefined ? 1 : p.gate) * (p.tierOff ? 0 : 1);
    p.u.uVis.value = w;
    p.pts.visible = w > 0.01;
  }
  for (let i = 0; i < petalSys.length; i++) petalStep(petalSys[i], fxU.uTime.value, night);
}
export const PARTICLE_KINDS = new Set(Object.keys(P_DEF));

const PETAL_VS = `attribute vec4 aFx; uniform float uNight; uniform vec3 uSun; varying vec2 vUv; varying float vA; varying vec3 vCol;
${KEEP_GLSL}
void main() {
  vUv = uv;
  mat4 im = modelMatrix * instanceMatrix;
  vec4 wp = im * vec4(position, 1.0);
  vec3 n = normalize(mat3(im) * normal);
  vec3 vd = normalize(cameraPosition - wp.xyz);
  float facing = abs(dot(n, uSun));
  float through = pow(max(dot(-vd, uSun), 0.0), 3.0) * (1.0 - facing * 0.6);
  vec3 dayC = vec3(0.97, 0.93, 0.93) * (0.74 + 0.30 * facing + 0.22 * through);
  vec3 nightC = vec3(0.84, 0.86, 0.92) * (0.6 + 0.28 * facing) + vec3(1.0, 0.74, 0.46) * aFx.z * (0.55 + 0.45 * abs(dot(n, vd)));
  vCol = mix(dayC, nightC, uNight) * aFx.y;
  gl_Position = projectionMatrix * viewMatrix * wp;
  vA = aFx.x * keepOut(gl_Position, aFx.w);
}`;
const PETAL_FS = `varying vec2 vUv; varying float vA; varying vec3 vCol;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float w = 0.62 + 0.3 * (p.x * 0.5 + 0.5);
  float e = length(vec2(p.x, p.y / w)) + 0.2 * smoothstep(0.2, 0.0, abs(p.y)) * smoothstep(0.55, 1.0, p.x);
  float a = (1.0 - smoothstep(0.72, 0.95, e)) * vA;
  if (a < 0.01) discard;
  vec3 col = vCol * (0.9 + 0.1 * (p.x * 0.5 + 0.5)) * (gl_FrontFacing ? 1.0 : 0.94);
  gl_FragColor = vec4(col, a * 0.96);
  ${OUT}
}`;
const petalSys = [];
const _pq = new THREE.Quaternion(), _pq2 = new THREE.Quaternion(), _pp = v3(), _ps = v3(), _pm = new THREE.Matrix4(), _pl = v3();
const _flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), _yaw = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
export function petalFall(scene, spawn, opts) {
  if (!scene || !spawn || !spawn.length) return null;
  const o = opts || {}, N = 60;
  const geo = new THREE.PlaneGeometry(0.05, 0.036, 4, 2), pa = geo.attributes.position;
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i) / 0.025, y = pa.getY(i) / 0.018; pa.setZ(i, 0.004 * y * y - 0.0025 * x * x); }
  geo.computeVertexNormals();
  const fx = new Float32Array(N * 4);
  const aFx = new THREE.InstancedBufferAttribute(fx, 4); aFx.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aFx', aFx);
  const mat = new THREE.ShaderMaterial({ uniforms: { uNight: fxU.uNight, uKeep: fxU.uKeep, uSun: { value: new THREE.Vector3(0.45, 0.8, 0.4).normalize() } },
    vertexShader: PETAL_VS, fragmentShader: PETAL_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const im = new THREE.InstancedMesh(geo, mat, N); im.name = 'fx_petals_falling'; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  _pm.makeScale(0, 0, 0); for (let i = 0; i < N; i++) im.setMatrixAt(i, _pm);
  scene.add(im);
  const lamps = [], crown = []; scene.updateMatrixWorld(true);
  scene.traverse((n) => {
    if (/^FX_glow_/.test(nm(n)) && !n.isMesh) lamps.push(n.getWorldPosition(v3()));
    if (n.isMesh && !n.isInstancedMesh && /blossom/i.test(nm(n)) && n.geometry && n.geometry.attributes.position) {
      const ga = n.geometry.attributes.position, step = Math.max(1, Math.floor(ga.count / 160));
      for (let i = Math.floor(Math.random() * step); i < ga.count && crown.length < 900; i += step) crown.push(v3().fromBufferAttribute(ga, i).applyMatrix4(n.matrixWorld));
    }
  });
  if (crown.length) {
    let lo = Infinity, hi = -Infinity; for (const c of crown) { lo = Math.min(lo, c.y); hi = Math.max(hi, c.y); }
    const cut = lo + (hi - lo) * 0.75, keep = crown.filter((c) => c.y <= cut); crown.length = 0; for (const c of keep) crown.push(c);
  }
  const P = []; for (let i = 0; i < N; i++) P.push({ st: 0, t0: 0, p0: v3(), p: v3(), d: v3(), q: new THREE.Quaternion(), dx: 0, dz: 0, ang: 0, A: 0, om: 0, ps: 0, vb: 0, c: 0, th: 0, yaw: 0, spin: 0, tum: false, ly: 0, water: false, tl: 0, life: 0, sc: 1, tone: 1, a: 0 });
  const sys = { im, P, fx, aFx, spawn, lamps, crown, ripple: o.ripple || null, reduced: !!o.reduced, next: 0, last: -1, born: -1, gust: 0 };
  petalSys.push(sys);
  return sys;
}
function petalRelease(s, q, t, back) {
  let sp = s.spawn[Math.floor(Math.random() * s.spawn.length)];
  const r = s.reduced ? 0.6 : 1;
  if (s.crown.length) {
    const c = s.crown[Math.floor(Math.random() * s.crown.length)];
    let bd = Infinity; for (let j = 0; j < s.spawn.length; j++) { const e = s.spawn[j].p, d = (e.x - c.x) * (e.x - c.x) + (e.z - c.z) * (e.z - c.z); if (d < bd) { bd = d; sp = s.spawn[j]; } }
    q.p0.set(c.x + (Math.random() - 0.5) * 0.06, c.y - 0.02, c.z + (Math.random() - 0.5) * 0.06);
  } else q.p0.set(sp.p.x + (Math.random() - 0.5) * 0.3, sp.p.y + (Math.random() - 0.5) * 0.15, sp.p.z + (Math.random() - 0.5) * 0.3);
  q.ly = Math.min(sp.ly, q.p0.y - 0.05); q.water = sp.water; q.dx = 0; q.dz = 0;
  q.ang = Math.random() * 6.2832; q.d.set(Math.cos(q.ang), 0, Math.sin(q.ang));
  q.tum = Math.random() < 0.3;
  q.A = (q.tum ? 0.025 : 0.05 + Math.random() * 0.07) * r; q.om = (q.tum ? 2.2 + Math.random() * 1.6 : 1.3 + Math.random() * 0.9) * r; q.ps = Math.random() * 6.2832;
  q.vb = (0.17 + Math.random() * 0.1) * r; q.c = 0.55 + Math.random() * 0.15; q.th = 0.45 + Math.random() * 0.4;
  q.yaw = Math.random() * 6.2832; q.spin = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.6) * r;
  q.sc = 0.85 + Math.random() * 0.45; q.tone = 0.9 + Math.random() * 0.12; q.seed = Math.random();
  q.st = 1; q.t0 = t - (back || 0); q.a = 0;
}
function petalAir(q, tau, out, quat) {
  const ph = q.ps + q.om * tau, ph0 = q.ps;
  const mod = q.tum ? -1 : 1;
  const drop = q.vb * (tau + mod * q.c * (Math.sin(2 * ph) - Math.sin(2 * ph0)) / (2 * q.om));
  const sw = q.A * (Math.sin(ph) - Math.sin(ph0));
  out.set(q.p0.x + q.d.x * sw + q.dx, q.p0.y - drop, q.p0.z + q.d.z * sw + q.dz);
  const roll = q.tum ? ph : q.th * Math.cos(ph);
  _yaw.setFromAxisAngle(_up, q.yaw + q.spin * tau);
  _pp.set(q.d.z, 0, -q.d.x); _pq2.setFromAxisAngle(_pp, roll);
  quat.setFromAxisAngle(q.d, 0.16 * Math.sin(2.3 * ph + q.ang)).multiply(_pq2).multiply(_yaw).multiply(_flat);
}
function petalStep(s, t, night) {
  const P = s.P, fx = s.fx, im = s.im;
  if (s.born < 0) s.born = t;
  if (s.last >= 0 && t < s.last - 0.001) { for (let i = 0; i < P.length; i++) P[i].st = 0; s.next = t; s.born = t; }
  const dt = s.last < 0 ? 0 : Math.min(0.25, Math.max(0, t - s.last)); s.last = t;
  const wind = fxU.uWind.value, wl = wind.length();
  s.gust += (Math.min(1, wl) - s.gust) * Math.min(1, dt * 1.5);
  if (s.next === 0) {
    s.next = t + 1;
    for (let k = 0; k < 6; k++) { const q = freeSlot(P); if (q) { petalRelease(s, q, t, 1.5 + Math.random() * 7); if (petalLanded(q, t)) q.st = 0; } }
  }
  if (t >= s.next) {
    const q = inUse(P) < 40 ? freeSlot(P) : null;
    if (q) petalRelease(s, q, t, 0);
    const base = (s.reduced ? 2.4 : 1.25) + Math.random() * (s.reduced ? 1.6 : 1.1);
    s.next = t + base / ((1 + 2.6 * s.gust) * (s.rate || 1));
  }
  const fade = Math.min(1, (t - s.born) / 2);
  for (let i = 0; i < P.length; i++) {
    const q = P[i];
    if (q.st === 0) { if (fx[i * 4] !== 0) { fx[i * 4] = 0; _pm.makeScale(0, 0, 0); im.setMatrixAt(i, _pm); } continue; }
    const tau = t - q.t0;
    const wv = s.windAt ? s.windAt(q.p, _pwv) : wind;
    if (q.st === 1) {
      q.dx += wv.x * (0.3 + 0.25 * q.sc) * dt; q.dz += wv.z * (0.3 + 0.25 * q.sc) * dt;
      petalAir(q, tau, q.p, q.q);
      q.a = Math.min(1, tau / 0.8); q.a = q.a * q.a * (3 - 2 * q.a);
      if (s.groundAt && (i + Math.floor(t * 20)) % 3 === 0) { const gy = s.groundAt(q.p.x, q.p.z, q.p.y + 0.02); if (gy === -Infinity) { if (s.waterY !== undefined) { q.ly = s.waterY; q.water = true; } } else if (typeof gy === 'number' && isFinite(gy)) { const wy = s.waterY !== undefined ? s.waterY : -Infinity; q.water = gy + 0.004 <= wy; q.ly = Math.max(gy + 0.004, wy); } }
      if (q.p.y <= q.ly) {
        q.p.y = q.ly; q.st = 2; q.tl = t; q.life = q.water ? 9 : 12; q.p0.copy(q.p); q.yaw = q.yaw + q.spin * tau;
        if (q.water && s.ripple) s.ripple(q.p.clone(), 0.16);
      }
    } else {
      const age = t - q.tl;
      if (q.water) {
        q.p.x += (Math.sin(t * 0.3 + i) * 0.018 + wv.x * (s.drift || 0.05)) * dt; q.p.z += (Math.cos(t * 0.27 + i) * 0.018 + wv.z * (s.drift || 0.05)) * dt;
        q.p.y = q.ly + Math.sin(t * 1.6 + i) * 0.0015; q.yaw += q.spin * 0.12 * dt;
      }
      _yaw.setFromAxisAngle(_up, q.yaw); _pq2.copy(_yaw).multiply(_flat);
      const k = Math.min(1, age / 0.45);
      q.q.slerp(_pq2, k < 1 ? Math.min(1, dt * 9) : 1);
      q.a = 1 - Math.max(0, age - q.life * 0.55) / (q.life * 0.45);
      if (age > q.life) { q.st = 0; fx[i * 4] = 0; _pm.makeScale(0, 0, 0); im.setMatrixAt(i, _pm); continue; }
    }
    let warm = 0;
    if (night > 0.01) for (let j = 0; j < s.lamps.length; j++) { const d2 = q.p.distanceToSquared(s.lamps[j]); warm += Math.exp(-d2 / 0.9); }
    const a = Math.max(0, q.a) * fade;
    fx[i * 4] = a; fx[i * 4 + 1] = q.tone; fx[i * 4 + 2] = Math.min(1, warm) * 0.85; fx[i * 4 + 3] = q.seed || 0;
    _ps.set(q.sc, q.sc, q.sc); _pm.compose(q.p, q.q, _ps); im.setMatrixAt(i, _pm);
  }
  im.instanceMatrix.needsUpdate = true; s.aFx.needsUpdate = true;
}
const _pwv = new THREE.Vector3();
function inUse(P) { let n = 0; for (let i = 0; i < P.length; i++) if (P[i].st !== 0) n++; return n; }
function freeSlot(P) { for (let i = 0; i < P.length; i++) if (P[i].st === 0) return P[i]; return null; }
export function petalDrift(s, k) { if (s) s.drift = Math.max(0, +k || 0); }
export function petalRate(s, k) { if (s) s.rate = Math.max(0.2, Math.min(2, +k || 1)); }
export function petalBurst(s, n, near, opts) {
  if (!s || s.last < 0) return 0;
  const o = opts || {}, sc = +o.sc > 0 ? +o.sc : 1, spread = +o.spread > 0 ? +o.spread : 0, fall = +o.fall > 0 ? +o.fall : 1;
  let made = 0;
  for (let k = 0; k < n; k++) {
    const q = freeSlot(s.P); if (!q) break;
    petalRelease(s, q, s.last, 0);
    if (near && s.crown.length) {
      let best = null;
      if (spread) best = { x: near.x + (Math.random() - 0.5) * spread, y: near.y - Math.random() * 0.5 * spread + 0.1, z: near.z + (Math.random() - 0.5) * spread };
      else { let bd = Infinity; for (let j = 0; j < 24; j++) { const c = s.crown[Math.floor(Math.random() * s.crown.length)], d = (c.x - near.x) * (c.x - near.x) + (c.z - near.z) * (c.z - near.z); if (d < bd) { bd = d; best = c; } } }
      if (best) {
        q.p0.set(best.x + (Math.random() - 0.5) * 0.08, best.y - 0.02, best.z + (Math.random() - 0.5) * 0.08);
        let sp = s.spawn[0], sd = Infinity; for (const e of s.spawn) { const d = (e.p.x - q.p0.x) * (e.p.x - q.p0.x) + (e.p.z - q.p0.z) * (e.p.z - q.p0.z); if (d < sd) { sd = d; sp = e; } }
        q.ly = Math.min(sp.ly, q.p0.y - 0.05); q.water = sp.water;
      }
    }
    if (sc !== 1) q.sc *= sc * (0.88 + Math.random() * 0.24);
    if (fall !== 1) { q.vb *= fall; q.A *= Math.sqrt(fall); }
    q.t0 = s.last - k * (spread ? 0.04 : 0.12); made++;
  }
  return made;
}
function petalLanded(q, t) {
  petalAir(q, t - q.t0, _pl, _pq);
  return _pl.y <= q.ly + 0.05;
}
