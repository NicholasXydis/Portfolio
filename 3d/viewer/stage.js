import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

const OUT = '\n#include <colorspace_fragment>\n';
export const B2T = (p, d = [0, 0, 0]) => { const a = Array.isArray(p) ? p : d; return new THREE.Vector3(+a[0] || 0, +a[2] || 0, -(+a[1] || 0)); };
const col = (h, d) => { const c = new THREE.Color(d); try { if (h) c.set(String(h)); } catch { c.set(d); } return c; };
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b);
const rad = THREE.MathUtils.degToRad;
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const D2R = Math.PI / 180, DAY_MS = 86400000, MEAN_MONTH_MS = 29.530588853 * DAY_MS, NEW_2000 = Date.UTC(2000, 0, 6, 18, 14);
const PLANETS = [[299.77, 0.107408, 0.000325], [251.88, 0.016321, 0.000165], [251.83, 26.651886, 0.000164], [349.42, 36.412478, 0.000126], [84.66, 18.206239, 0.00011], [141.74, 53.303771, 0.000062], [207.14, 2.453732, 0.00006], [154.84, 7.30686, 0.000056], [34.52, 27.261239, 0.000047], [207.19, 0.121824, 0.000042], [291.34, 1.844379, 0.00004], [161.72, 24.198154, 0.000037], [239.56, 25.513099, 0.000035], [331.55, 3.592518, 0.000023]];
export function lunationTime(k) {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T, s = Math.sin, c = Math.cos;
  let j = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3) * D2R;
  const P = (201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * D2R;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * D2R;
  const O = (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * D2R;
  const q = Math.round((k - Math.floor(k)) * 4) % 4;
  if (q === 0 || q === 2) {
    const n = q === 0;
    j += (n ? -0.4072 : -0.40614) * s(P) + (n ? 0.17241 : 0.17302) * E * s(M) + (n ? 0.01608 : 0.01614) * s(2 * P) + (n ? 0.01039 : 0.01043) * s(2 * F)
      + (n ? 0.00739 : 0.00734) * E * s(P - M) - (n ? 0.00514 : 0.00515) * E * s(P + M) + (n ? 0.00208 : 0.00209) * E * E * s(2 * M) - 0.00111 * s(P - 2 * F)
      - 0.00057 * s(P + 2 * F) + 0.00056 * E * s(2 * P + M) - 0.00042 * s(3 * P) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F) - 0.00024 * E * s(2 * P - M)
      - 0.00017 * s(O) - 0.00007 * s(P + 2 * M) + 0.00004 * s(2 * P - 2 * F) + 0.00004 * s(3 * M) + 0.00003 * s(P + M - 2 * F) + 0.00003 * s(2 * P + 2 * F)
      - 0.00003 * s(P + M + 2 * F) + 0.00003 * s(P - M + 2 * F) - 0.00002 * s(P - M - 2 * F) - 0.00002 * s(3 * P + M) + 0.00002 * s(4 * P);
  } else {
    j += -0.62801 * s(P) + 0.17172 * E * s(M) - 0.01183 * E * s(P + M) + 0.00862 * s(2 * P) + 0.00804 * s(2 * F) + 0.00454 * E * s(P - M) + 0.00204 * E * E * s(2 * M)
      - 0.0018 * s(P - 2 * F) - 0.0007 * s(P + 2 * F) - 0.0004 * s(3 * P) - 0.00034 * E * s(2 * P - M) + 0.00032 * E * s(M + 2 * F) + 0.00032 * E * s(M - 2 * F)
      - 0.00028 * E * E * s(P + 2 * M) + 0.00027 * E * s(2 * P + M) - 0.00017 * s(O) - 0.00005 * s(P - M - 2 * F) + 0.00004 * s(2 * P + 2 * F) - 0.00004 * s(P + M + 2 * F)
      + 0.00004 * s(P - 2 * M) + 0.00003 * s(P + M - 2 * F) + 0.00003 * s(3 * M) + 0.00002 * s(2 * P - 2 * F) + 0.00002 * s(P - M + 2 * F) - 0.00002 * s(3 * P + M);
    const W = 0.00306 - 0.00038 * E * c(M) + 0.00026 * c(P) - 0.00002 * c(P - M) + 0.00002 * c(P + M) + 0.00002 * c(2 * F);
    j += q === 1 ? W : -W;
  }
  for (let i = 0; i < 14; i++) j += PLANETS[i][2] * s((PLANETS[i][0] + PLANETS[i][1] * k - (i === 0 ? 0.009173 * T2 : 0)) * D2R);
  return (j - 2440587.5) * DAY_MS - 69000;
}
export function moonPhase(date) {
  const t = date.getTime();
  if (!isFinite(t)) return 0;
  let k = Math.floor((t - NEW_2000) / MEAN_MONTH_MS);
  while (lunationTime(k) > t) k -= 1;
  while (lunationTime(k + 1) <= t) k += 1;
  let a = lunationTime(k);
  for (let i = 1; i <= 4; i++) { const b = lunationTime(k + i / 4); if (t < b) return (i - 1 + (t - a) / (b - a)) / 4; a = b; }
  return 0;
}
export function seasonOf(date) { const m = date.getUTCMonth(); return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter'; }
function urlDate(params, given) {
  if (given instanceof Date && !isNaN(given)) return given;
  const s = params.get('date');
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) { const d = new Date(s + 'T21:00:00Z'); if (!isNaN(d)) return d; }
  return new Date();
}

const DIPPER = (() => {
  const S = [[165.93, 61.75, 1.79], [165.46, 56.38, 2.37], [178.46, 53.69, 2.44], [183.86, 57.03, 3.31], [193.51, 55.96, 1.77], [200.98, 54.93, 2.23], [206.89, 49.31, 1.86]];
  const c = Math.cos(56 * Math.PI / 180);
  const pts = S.map(([ra, de, m]) => [(165.93 - ra) * c, de - 56, Math.pow(10, -0.4 * (m - 1.77))]);
  const mx = pts.reduce((a, p) => a + p[0], 0) / 7, my = pts.reduce((a, p) => a + p[1], 0) / 7;
  return pts.map(([x, y, b]) => new THREE.Vector3(x - mx, y - my, 0.55 + 0.45 * b));
})();

const NOISE_VS = 'varying vec2 vQ; void main() { vQ = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const NOISE_FS = `varying vec2 vQ;
vec2 gr(vec2 i, float s) { float a = 6.2831853 * fract(sin(dot(i, vec2(127.1, 311.7)) + s * 17.17) * 43758.5453); return vec2(cos(a), sin(a)); }
float pn(vec2 p, float P, float s) {
  vec2 i = floor(p), f = p - i; vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 a = mod(i, P), b = mod(i + 1.0, P);
  float n00 = dot(gr(a, s), f), n10 = dot(gr(vec2(b.x, a.y), s), f - vec2(1.0, 0.0));
  float n01 = dot(gr(vec2(a.x, b.y), s), f - vec2(0.0, 1.0)), n11 = dot(gr(b, s), f - vec2(1.0));
  return mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y);
}
float ch(vec2 q, float s) { float v = pn(q * 8.0, 8.0, s) * 0.62 + pn(q * 16.0, 16.0, s + 1.3) * 0.26 + pn(q * 32.0, 32.0, s + 2.9) * 0.12; return clamp(0.5 + v * 1.2, 0.0, 1.0); }
void main() { gl_FragColor = vec4(ch(vQ, 0.0), ch(vQ, 3.1), ch(vQ, 5.7), ch(vQ, 8.3)); }`;

const SKY_VS = 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const SKY_FS = `varying vec3 vW;
uniform sampler2D tN; uniform float uNoise;
uniform vec3 uTopN; uniform vec3 uHorN; uniform vec3 uMistN; uniform vec3 uInkN;
uniform vec3 uTopD; uniform vec3 uHorD; uniform vec3 uMistD; uniform vec3 uInkD;
uniform float uNight; uniform float uStars; uniform float uTw; uniform float uDrift; uniform float uMirror;
uniform vec3 uMoonDir; uniform float uMoonA; uniform float uMoonB; uniform float uStarRich;
uniform vec3 uDip[7]; uniform vec2 uDipC; uniform float uDipS;
uniform vec4 uStreak; uniform float uStreakT;
uniform vec3 uBand; uniform vec3 uBandX; uniform vec3 uBandY; uniform float uBandB;
uniform vec4 uBird; uniform float uBirdA; uniform float uWindM; uniform float uMistAdv; uniform float uMistW;
vec3 h33(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
vec4 nz(vec2 p) { return texture2D(tN, p); }
vec4 nzs(vec2 p) { vec2 q = p * 512.0 + 0.5, i = floor(q), f = q - i; f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); return textureGrad(tN, (i + f - 0.5) / 512.0, dFdx(p), dFdy(p)); }
vec3 starLayer(vec2 ae, float ce, float cs, float salt, float prob, float sz, float b0, float b1, float twA, float twF, float pa, float minPx, float glowK, float on0, float nv, float en) {
  vec2 g = ae / cs; vec2 id = floor(g); vec2 f = g - id;
  vec3 h = h33(vec3(id, salt));
  if (h.x > prob) return vec3(0.0);
  vec3 k = h33(vec3(id.yx + 17.31, salt + 5.7));
  vec2 dv = (f - (0.22 + 0.56 * h.yz)) * cs; dv.x *= ce; dv.y /= max(ce, 0.2);
  float dd = length(dv);
  float b = mix(b0, b1, k.x * k.x * k.x);
  float zs = sz * (0.65 + 1.6 * k.x * k.x * k.x * k.x);
  float s = max(zs, pa * minPx);
  float core = exp(-dd * dd / (s * s)) * pow(zs / s, en);
  float glow = glowK * exp(-dd / (s * 2.5));
  float ph = 6.2831853 * k.y;
  float tw = 1.0 + twA * (0.62 * sin(uTw * twF * (0.6 + 0.8 * k.z) + ph) + 0.38 * sin(uTw * twF * (1.9 + 1.1 * k.y) + 2.3 * ph));
  float o = on0 + 0.14 * k.z;
  float vis = smoothstep(o, o + 0.25, nv);
  vec3 tint = mix(vec3(1.0, 0.9, 0.78), vec3(0.8, 0.88, 1.0), k.z);
  tint = mix(vec3(0.95, 0.96, 1.0), tint, 0.2 + 0.5 * k.x);
  return tint * b * (core + glow) * tw * vis;
}
float ridgeN(float az, float k) {
  float x = az * (0.3 + 0.08 * k) + 0.173 * k + 0.05, y = 0.09 + 0.21 * k;
  return nz(vec2(x, y)).r * 0.62 + nz(vec2(x * 2.37 + 0.41, y + 0.05)).g * 0.27 + nz(vec2(x * 5.9 + 0.77, y + 0.11)).b * 0.11;
}
void main() {
  vec3 d = normalize(vW - cameraPosition);
  float el = d.y, az = atan(d.x, -d.z), ce = sqrt(max(1.0 - el * el, 0.0));
  float pa = length(fwidth(d)) * 0.5 + 1e-6;
  float n = uNight;
  float nt = 1.0 - (1.0 - clamp(n, 0.0, 1.0)) * (1.0 - clamp(n, 0.0, 1.0));
  float ma = acos(clamp(dot(d, uMoonDir), -1.0, 1.0)), A = uMoonA;
  vec3 moonC = vec3(0.86, 0.84, 0.8), sunC = vec3(1.0, 0.885, 0.71);
  float en = uMirror > 0.5 ? 1.3 : 1.6, mPx = uMirror > 0.5 ? 1.15 : 0.9;
  vec2 cq = d.xz / (max(el, 0.0) + 0.045);
  vec2 wind = vec2(uDrift * 0.0021, uDrift * 0.0006);
  vec2 cp = vec2(cq.x * 0.04, cq.y * 0.075) + wind;
  vec4 c1 = nzs(cp);
  vec2 cp2 = cp * 2.03 + vec2(0.13, 0.41) + (c1.gb - 0.5) * 0.06 - wind * 0.37;
  vec4 c2 = nzs(cp2);
  float c3 = nzs(cp * 4.1 + vec2(0.57, 0.19) - wind * 0.71).a;
  float fb = c1.r * 0.56 + c2.r * 0.29 + c3 * 0.15;
  vec2 mq = uMoonDir.xz / (max(uMoonDir.y, 0.0) + 0.045);
  vec2 tm = vec2(mq.x * 0.04, mq.y * 0.075) + wind - cp; tm = tm / max(length(tm), 1e-4) * 0.016;
  float fbT = nzs(cp + tm).r * 0.56 + nzs(cp2 + tm * 2.03).r * 0.29 + c3 * 0.15;
  float edge = clamp((fb - fbT) * 9.0, 0.0, 1.0);
  float Dm = smoothstep(0.0, 0.035, el) * smoothstep(A * 0.95, A * 1.7, ma) * uNoise;
  float D = smoothstep(0.52, 0.82, fb) * Dm, DD = smoothstep(0.49, 0.79, fb) * Dm;
  float Dn = D * 0.75 * (1.0 - 0.7 * smoothstep(0.07, 0.22, el)), Dd = DD * 0.85;
  vec3 night = mix(uHorN, uTopN, smoothstep(-0.01, 0.42, el));
  if (nt > 0.0) {
    float glare = smoothstep(A * 1.05, A * 3.2, ma);
    float elF = smoothstep(-0.004, 0.03, el), elD = smoothstep(0.002, 0.04, el);
    float bl = dot(d, uBand), lon = atan(dot(d, uBandY), dot(d, uBandX));
    vec4 m1 = nzs(vec2(lon * 2.0, bl * 2.0 + 0.37)), m2 = nzs(vec2(lon * 5.0 + 0.21, bl * 5.0 + 0.71));
    float bb = bl + (m1.g - 0.5) * 0.06;
    float core = exp(-bb * bb / 0.006), wide = exp(-bb * bb / 0.02);
    float clump = m1.r * 0.55 + m2.r * 0.45;
    float rift = smoothstep(0.44, 0.66, m1.b * 0.5 + m2.a * 0.5) * exp(-(bb - 0.008) * (bb - 0.008) / 0.0008);
    float grain = nzs(vec2(lon * 13.0 + 0.5, bl * 13.0 + 0.2)).b;
    float mwS = core * (0.22 + 1.4 * clump * clump) * (1.0 - 0.88 * rift) * (0.65 + 0.7 * grain) * uNoise;
    float clear = 1.0 - Dn * 0.92;
    night += vec3(0.84, 0.87, 0.95) * (mwS * 0.55 + 0.12 * wide * uNoise) * (uMirror > 0.5 ? 0.012 : 0.048) * uBandB * elD * clear * mix(1.0, glare, 0.6);
    vec2 ae = vec2(az, el);
    vec3 st = vec3(0.0);
    if (uMirror < 0.5) st += starLayer(ae, ce, 0.0026, 4.0, clamp(mwS * 1.3, 0.0, 0.95) * uStarRich, 0.0001, 0.05, 0.17, 0.05, 0.5, pa, 0.75, 0.0, 0.6, 1.0, en) * elD * mix(1.0, glare, 0.7 * uMoonB);
    st += starLayer(ae, ce, 0.0055, 1.0, 0.62 * (1.0 + 1.2 * mwS) * uStarRich, 0.00012, 0.1, 0.34, 0.07, 0.6, pa, uMirror > 0.5 ? 1.1 : 0.8, 0.0, 0.55, 1.0, en) * elD * mix(1.0, glare, 0.7 * uMoonB) * (uMirror > 0.5 ? 0.8 : 1.0);
    st += starLayer(ae, ce, 0.019, 2.0, 0.55 * (1.0 + 0.35 * mwS) * uStarRich, 0.00022, 0.25, 0.8, 0.18, 1.3, pa, uMirror > 0.5 ? 1.15 : 0.85, 0.0, 0.33, 1.0, en) * elF * mix(1.0, glare, 0.45 * uMoonB);
    st += starLayer(ae, ce, 0.063, 3.0, 0.45, 0.00055, 0.8, 2.4, 0.3, 2.1, pa, mPx, 0.08, 0.1, 1.0, en) * elF * mix(1.0, glare, 0.2 * uMoonB);
    for (int i = 0; i < 7; i++) {
      vec3 sd = uDip[i];
      vec2 sp = uDipC + sd.xy * uDipS;
      float dd = length(vec2((az - sp.x) * ce, (el - sp.y) / max(ce, 0.2)));
      float s = max(0.00042, pa * mPx);
      float fi = float(i);
      float tw = 1.0 + 0.2 * sin(uTw * (1.7 + 0.31 * fi) + fi * 1.9) * (0.6 + 0.4 * sin(uTw * 0.73 + fi));
      st += vec3(0.95, 0.96, 1.0) * sd.z * 2.0 * (exp(-dd * dd / (s * s)) * pow(0.00042 / s, en) + 0.05 * exp(-dd / (s * 2.5))) * tw * elF;
    }
    night += st * uStars * clear;
    if (uStreakT >= 0.0) {
      vec2 p0 = uStreak.xy, dd = uStreak.zw, q = ae - p0;
      float sAlong = dot(q, dd) / dot(dd, dd);
      float perp = length(q - dd * sAlong);
      float head = uStreakT, tail = head - 0.35;
      float on = step(tail, sAlong) * (1.0 - smoothstep(head - 2.5 * pa / max(length(dd), 1e-3), head, sAlong)) * (1.0 - smoothstep(max(0.0006, pa), max(0.0018, pa * 3.0), perp));
      float bright = smoothstep(tail, head, sAlong) * (1.0 - smoothstep(0.85, 1.25, uStreakT)) * smoothstep(0.0, 0.1, uStreakT);
      night += vec3(0.85, 0.88, 0.95) * on * bright * 0.32 * clear;
    }
  }
  float fwd = 0.07 + 0.9 * exp(-ma / (A * 2.2)) + 0.35 * exp(-ma / 0.2);
  vec3 cloudN = moonC * (0.004 + 0.005 * uMoonB + uMoonB * (0.03 * fwd * (0.4 + 0.6 * (1.0 - D)) + 0.06 * edge * exp(-ma / (A * 3.0))));
  night = mix(night, cloudN, Dn);
  float hq = (ma - A * 2.4) / (A * 0.4);
  night += moonC * uMoonB * (Dn * 0.02 * exp(-hq * hq) + 0.0075 * exp(-ma / (A * 1.4)) + 0.0035 * exp(-ma / (A * 4.5)) + 0.0012 * exp(-ma / 0.4));
  vec3 day = mix(uHorD, uTopD, pow(smoothstep(-0.01, 0.5, el), 0.75));
  day += sunC * (0.06 * exp(-ma / 0.45) + 0.035 * exp(-ma / 1.1)) * vec3(1.0, 0.97, 0.9);
  float bloom = 0.13 * exp(-ma / (A * 1.25)) + 0.07 * exp(-ma / (A * 4.0)) + 0.05 * exp(-ma / (A * 9.0)) + 0.04 * exp(-ma / 0.3);
  vec3 cl = mix(day * 1.035 + sunC * (0.03 + 0.3 * bloom) * (0.4 + 0.9 * edge), day * vec3(0.86, 0.87, 0.885), smoothstep(0.3, 0.95, DD));
  day = mix(day, cl, Dd);
  vec3 tx = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0))), ty = cross(tx, uMoonDir);
  float ra = atan(dot(d, ty), dot(d, tx));
  float rr = nz(vec2(ra * 0.31831 + uDrift * 0.00025, 0.83)).r * 0.6 + nz(vec2(ra * 0.63662 - uDrift * 0.0004, 0.57)).g * 0.4;
  float rays = smoothstep(0.5, 0.78, rr) * exp(-ma / 0.3) * smoothstep(A * 1.1, A * 2.5, ma) * 0.035 * (1.0 - 0.6 * Dd) * uNoise;
  day += sunC * (bloom * (1.0 - 0.4 * Dd) + rays);
  vec3 c = mix(day, night, nt);
  vec3 mistC = mix(uMistD, uMistN, nt);
  if (el < 0.07 && uNoise > 0.0) {
    for (int i = 0; i < 4; i++) {
      float k = float(i);
      float r = smoothstep(0.18, 0.86, ridgeN(az, k));
      float rl = (0.036 - 0.0075 * k) + (0.022 - 0.0035 * k) * (r - 0.5) * 2.0;
      float w = max(pa * 0.9, 0.0016 - 0.0003 * k);
      float inside = (1.0 - smoothstep(rl - w, rl + w, el)) * uNoise;
      float dep = max(rl - el, 0.0);
      float fadeK = 0.7 - 0.16 * k;
      float tex = 0.9 + 0.2 * nz(vec2(az * 3.1 + k * 0.3, el * 9.0 + k)).a;
      vec3 inkD = mix(uInkD, uMistD, fadeK), inkN = mix(uInkN, uMistN, fadeK * 0.8) * 1.15;
      vec3 ink = mix(mix(inkD, uMistD, (1.0 - tex) * 0.6), inkN, nt);
      vec3 lay = mix(ink, mistC, min(1.0, smoothstep(0.0, 0.022 + 0.006 * k, dep) * 0.9 * mix(1.0, 0.84 + 0.32 * nz(vec2(az * 1.3 + k * 0.29 - mix(uDrift * 0.0011, uMistAdv, uMistW), 0.47 + 0.13 * k)).g, uWindM)));
      lay += moonC * uMoonB * nt * 0.005 * exp(-dep / 0.0018) * (1.0 - 0.6 * fadeK);
      c = mix(c, lay, inside);
    }
  }
  float hm = 0.014 * (0.7 + 0.6 * nz(vec2(az * 0.9 + uDrift * 0.0007, 0.61)).r * uNoise);
  c = mix(c, mistC, el <= 0.0 ? 1.0 : exp(-el / hm));
  if (uBirdA > 0.001 && nt < 1.0) {
    vec2 q0 = vec2(az - uBird.x, el - uBird.y);
    if (q0.x > -0.025 && q0.x < 0.11 && abs(q0.y) < 0.045) {
      float ink = 0.0;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 off = vec2(fi * 0.016 + 0.004 * sin(fi * 2.3), -fi * 0.0042 + 0.0025 * sin(fi * 1.7 + 0.5) + 0.0009 * sin(uBird.z * 9.0 + fi * 1.3));
        float s = 0.0058 - fi * 0.0003;
        vec2 q = vec2((q0.x - off.x) * ce, q0.y - off.y) / s;
        float ax = abs(q.x);
        if (ax < 1.05) {
          float fl = sin(uBird.w * (3.9 + 0.35 * fi) + fi * 1.9);
          float y = (0.22 + 0.3 * fl) * pow(ax, 0.85) - 0.08 - 0.12 * ax * ax * (0.5 + 0.5 * fl);
          float aa = pa / s * 1.2;
          float th = 0.085 * (1.0 - 0.7 * ax) + 0.025;
          float wing = (1.0 - smoothstep(th - aa, th + aa, abs(q.y - y))) * (1.0 - smoothstep(1.0 - aa, 1.05, ax));
          float body = 1.0 - smoothstep(0.1 - aa, 0.1 + aa, length(q * vec2(0.9, 1.8) + vec2(0.0, 0.06)));
          ink = max(ink, max(wing, body));
        }
      }
      c = mix(c, uInkD * 1.1, ink * uBirdA * 0.72 * (1.0 - nt));
    }
  }
  gl_FragColor = vec4(c, 1.0); ${OUT}
  if (uMirror < 0.5) gl_FragColor.rgb += (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
}`;

const MOON_VS = `uniform float uR; varying vec2 vP;
void main() { vP = position.xy; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); mv.xy += position.xy * uR; gl_Position = projectionMatrix * mv; }`;
const MOON_FS = `uniform float uPhase; uniform float uGlow; uniform float uNight; uniform float uTilt; uniform vec4 uCloud; varying vec2 vP;
float mh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float mn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mh(i), mh(i + vec2(1, 0)), f.x), mix(mh(i + vec2(0, 1)), mh(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { return 0.5 * mn(p) + 0.25 * mn(p * 2.03 + 1.7) + 0.125 * mn(p * 4.1 + 3.1) + 0.0625 * mn(p * 8.3 + 5.3); }
vec2 crater(vec2 q, vec2 c, float r, float rays, float len, float rimB, float k1, float k2) {
  vec2 d = q - c; float l = length(d) / r;
  float rq = (l - 1.0) / 0.18, rim = exp(-rq * rq), bowl = (1.0 - smoothstep(0.0, 1.0, l)) * 0.8;
  float ang = atan(d.y, d.x);
  float ray = pow(max(0.0, sin(ang * k1 + c.x * 7.0) * 0.5 + 0.5), 3.0) * (0.45 + 0.55 * max(0.0, sin(ang * k2 + c.y * 5.0))) * rays;
  float reach = len * (0.55 + 0.45 * sin(ang * 3.0 + c.x * 11.0) * sin(ang * 5.0 + c.y * 3.0));
  float rr = ray * smoothstep(1.0, 1.5, l) * (1.0 - smoothstep(1.5, 1.5 + max(reach, 0.3), l));
  return vec2(rim * (0.15 + 3.0 * rimB) - bowl * (0.4 + 4.0 * rimB), rim * rimB + rr * 0.09);
}
vec3 surf(vec2 q, out float h) {
  float m = fbm(q * 2.2 + 3.0);
  float maria = smoothstep(0.42, 0.62, m) * 0.17 + smoothstep(0.55, 0.75, fbm(q * 3.1 - 1.3)) * 0.07;
  vec2 c1 = crater(q, vec2(-0.32, -0.55), 0.085, 1.0, 4.0, 0.12, 7.0, 11.0);
  vec2 c2 = crater(q, vec2(0.38, 0.32), 0.12, 0.0, 0.0, 0.03, 1.0, 1.0);
  vec2 c3 = crater(q, vec2(-0.05, 0.62), 0.035, 0.45, 1.1, 0.16, 13.0, 4.0);
  float small = (fbm(q * 14.0) - 0.5) * 0.06;
  h = c1.x + c2.x + c3.x + (m - 0.5) * 0.5 + small * 4.0;
  float a = 1.0 - maria + c1.y + c2.y + c3.y + small;
  return vec3(0.86, 0.78, 0.64) * a;
}
void main() {
  vec2 q = vP * 3.2; float d = length(q);
  float aa = fwidth(d) * 1.5 + 1e-4;
  float inDisc = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, d);
  float frac = 0.5 - 0.5 * cos(6.2831853 * uPhase);
  float th = 6.2831853 * uPhase;
  float sgn = uPhase < 0.5 ? 1.0 : -1.0;
  vec2 ld = vec2(sgn * cos(uTilt), -sin(uTilt));
  vec3 L = vec3(ld * abs(sin(th)), -cos(th));
  vec3 col = vec3(0.0); float litA = 0.0;
  if (d < 1.0 + aa) {
    vec2 qc = q / max(d, 1.0);
    vec3 n = vec3(qc, sqrt(max(1.0 - dot(qc, qc), 0.0)));
    float h; vec3 alb = surf(qc, h);
    float e = 0.012, hx, hy; surf(qc + vec2(e, 0.0), hx); surf(qc + vec2(0.0, e), hy);
    vec3 nb = normalize(n + vec3(-(hx - h), -(hy - h), 0.0) * 0.9);
    float mu0 = dot(nb, L), mu = max(n.z, 0.03);
    float sF = smoothstep(0.15, 0.45, frac);
    float lit = smoothstep(mix(-0.012, -0.03, sF), mix(0.035, 0.1, sF), mu0);
    float m0 = max(mu0, 0.0);
    float ls = min(2.0 * m0 / (m0 + mu + 0.015), 1.35);
    ls = mix(max(ls, 1.05 * smoothstep(0.0, 0.1, m0)), ls, sF);
    float limb = mix(1.0, 0.7 + 0.3 * pow(n.z, 0.5), smoothstep(0.15, 0.9, frac));
    vec3 sun = alb * limb * ls * mix(0.95, 1.0, frac) * lit;
    float es = mix(0.006 + 0.012 * pow(1.0 - frac, 3.0), 0.016 + 0.045 * pow(1.0 - frac, 3.0), smoothstep(0.2, 0.5, frac));
    vec3 earth = alb * vec3(0.8, 0.88, 1.0) * es * (0.65 + 0.35 * n.z);
    float rimB = smoothstep(0.93, 0.995, d) * lit * 0.12 * smoothstep(0.0, 0.2, m0 + 0.1);
    col = sun + earth * (1.0 - lit) + vec3(rimB);
    litA = inDisc * mix(lit, 1.0, smoothstep(0.3, 1.0, uNight));
  }
  vec2 hc = ld * (1.0 - frac) * 0.6;
  float dh = length(q - hc) - (1.0 - (1.0 - frac) * 0.6);
  float fq = 1.0 - smoothstep(2.6, 3.2, d);
  float thinK = 1.0 - smoothstep(0.15, 0.45, frac);
  float halo = uGlow * (0.04 + 0.4 * frac + 0.07 * thinK) * (0.55 * exp(-max(dh, 0.0) * 7.0) + 0.12 * exp(-max(dh, 0.0) * 1.6)) * fq;
  halo += uGlow * ((0.02 + 0.07 * frac) * exp(-max(d - 1.0, 0.0) * 3.0) + (0.01 + 0.025 * frac) * exp(-max(d - 1.0, 0.0) * 1.1)) * fq;
  float glowA = halo;
  float a = litA + (1.0 - litA) * glowA;
  vec3 pm = col * litA + vec3(0.86, 0.80, 0.70) * glowA * (1.0 - litA);
  if (uCloud.y > 0.001) {
    float cx = q.x - uCloud.x;
    float wisp = fbm(vec2(cx * 0.55 + uCloud.z, q.y * 1.6 + uCloud.z * 0.37));
    float cd = clamp(exp(-cx * cx / 1.1) * smoothstep(0.32, 0.75, wisp) * uCloud.y, 0.0, 0.92);
    float rim = 1.0 - smoothstep(0.97, 1.1, d), ci = cd * rim, co = cd * (1.0 - rim) * 0.14 * (1.0 - smoothstep(1.4, 2.8, d));
    vec3 cc = vec3(0.62, 0.63, 0.66) * (0.06 + 0.5 * exp(-max(d - 1.0, 0.0) * 1.4)) * (0.35 + 0.65 * frac);
    pm = pm * (1.0 - ci) + cc * ci; a = a * (1.0 - ci) + ci;
    pm = pm * (1.0 - co) + cc * co; a = a * (1.0 - co) + co;
  }
  float sW = clamp(1.0 - uNight, 0.0, 1.0); sW *= sW;
  if (sW > 0.0) {
    float sIn = 1.0 - smoothstep(0.955 - aa, 1.0 + aa, d);
    float smu = sqrt(max(1.0 - d * d, 0.0));
    vec3 sCol = mix(vec3(1.0, 0.85, 0.64), vec3(1.0, 0.945, 0.8), pow(smu, 0.5)) * (0.95 + 0.05 * pow(smu, 0.45));
    float out1 = max(d - 1.0, 0.0), fq2 = 1.0 - smoothstep(2.2, 3.15, d);
    float halo2 = (0.2 * exp(-out1 * 2.4) + 0.12 * exp(-out1 * 0.6)) * fq2;
    float sA = clamp(sIn + (1.0 - sIn) * halo2, 0.0, 1.0);
    vec3 sC = mix(vec3(1.0, 0.89, 0.72), sCol * 1.08, sIn);
    pm = mix(pm, sC * sA, sW); a = mix(a, sA, sW);
  }
  vec3 c = pm / max(a, 1e-4);
  if (a < 0.002) discard;
  gl_FragColor = vec4(c, a); ${OUT}
}`;

const WATER = {
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, tN: { value: null }, uNoise: { value: 0 },
    uTint: { value: new THREE.Color() }, uBodyD: { value: new THREE.Color() }, uReflect: { value: 0.6 }, uRipple: { value: 0.015 },
    uSee: { value: 0.35 }, uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uNight: { value: 1 },
    uIsle: { value: new THREE.Vector3() }, uStreak: { value: 0.011 }, uRoad: { value: 0.34 }, uRoadG: { value: 1.5 }, uMoon: { value: new THREE.Vector3() }, uMoonLit: { value: 0 }, uSunLit: { value: 0 }, uSoft: { value: 0 },
    uMistN: { value: new THREE.Color() }, uMistD: { value: new THREE.Color() },
    tUnder: { value: null }, uUnderOn: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uWake: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector4()) }, uMove: { value: 0 }, uLamp: { value: 1 }, uGust: { value: new THREE.Vector4(0, 0, 4, 0) }, uGustD: { value: new THREE.Vector2(1, 0) }, uWind: { value: new THREE.Vector4(1, 0, 1, 0.5) }, uWindOn: { value: 0 }, uWindAdv: { value: new THREE.Vector2() } },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
    void main() { vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tN; uniform float uNoise; uniform vec3 uTint; uniform vec3 uBodyD; uniform float uReflect; uniform float uRipple; uniform float uSee;
    uniform float uTime; uniform vec3 uCam; uniform float uNight; uniform vec3 uIsle; uniform float uStreak; uniform float uRoad; uniform float uRoadG;
    uniform vec3 uMoon; uniform float uMoonLit; uniform float uSunLit; uniform float uSoft; uniform vec3 uMistN; uniform vec3 uMistD; varying vec4 vUv; varying vec3 vW;
    uniform sampler2D tUnder; uniform float uUnderOn; uniform vec2 uRes; uniform vec4 uWake[6]; uniform float uMove; uniform float uLamp; uniform vec4 uGust; uniform vec2 uGustD; uniform vec4 uWind; uniform float uWindOn; uniform vec2 uWindAdv;
    vec3 okc(vec3 c) { uvec3 e = floatBitsToUint(c) & uvec3(0x7F800000u); return any(equal(e, uvec3(0x7F800000u))) ? vec3(0.0) : min(c, vec3(8.0)); }
    vec3 rd(vec2 u, float l) { return okc(textureLod(tDiffuse, u, l).rgb); }
    float aaw(float ph) { return 1.0 - smoothstep(0.45, 1.3, fwidth(ph)); }
    float aal(float ph) { return 1.0 - smoothstep(0.1, 0.4, fwidth(ph)); }
    float wmf(vec3 s) { return mix(1.0, 0.3 + 0.7 * smoothstep(0.05, 0.18, s.r - s.b), uNight); }
    float lmp(vec3 s, float k) { return mix(1.0, k, smoothstep(0.05, 0.18, s.r - s.b)); }
    void wv(inout vec2 s, vec2 p, float k, vec2 dir, float sp, float a) { float ph = dot(p, dir) * k + uTime * sp; s += dir * (cos(ph) * a * aaw(ph)); }
    void main() {
      vec2 p = vW.xz;
      vec3 dv = uCam - vW; float dist = length(dv); vec3 v = dv / dist;
      float isleD = length(p - uIsle.xz), fz = length(fwidth(p));
      float lampK = 1.0;
      if (uLamp < 0.999) { float lr = mix(3.0, 45.0, uLamp * uLamp); lampK = 1.0 - smoothstep(lr - 6.0, lr, isleD); }
      float alive = mix(1.35, 0.45, smoothstep(5.0, 30.0, isleD));
      float tB = uTime * 0.75;
      float p1 = p.y * 0.9 + tB * 0.32, p2 = p.x * 0.45 + p.y * 0.6 - tB * 0.21, p3 = p.x * 0.8 + tB * 0.27;
      vec2 wob = vec2(sin(p1) * aal(p1) + 0.5 * sin(p2) * aal(p2), 0.25 * sin(p3) * aal(p3)) * 0.6;
      vec2 sr = vec2(0.0);
      float gn = texture2D(tN, p * 0.021 + mix(vec2(uTime * 0.0042, uTime * 0.0017), -uWindAdv * 0.021, uWindOn)).r;
      float cp = 0.0, wl = 1.0;
      if (uWindOn > 0.5) {
        vec2 wdir = uWind.xy, wper = vec2(-wdir.y, wdir.x), q = p - uIsle.xz;
        float dl = dot(q, wdir), lat = abs(dot(q, wper));
        float lee = (1.0 - smoothstep(5.0, 9.0, lat)) * smoothstep(-1.0, 3.0, dl) * (1.0 - smoothstep(12.0, 32.0, dl));
        float wsh = (1.0 - 0.55 * lee) * (0.45 + 0.55 * smoothstep(3.0, 9.0, isleD));
        if (uGust.y > 0.001) {
          float gd = uGust.x - dot(p, uGustD) + (gn - 0.5) * 2.0, gdp = max(gd, 0.0);
          cp = clamp(uGust.y * (1.0 - exp(-gdp / max(uGust.z, 0.05))) * exp(-gdp / max(uGust.w, 0.1)) * smoothstep(-0.6, 0.2, gd) * (0.35 + 0.65 * smoothstep(0.22, 0.6, gn + 0.15)), 0.0, 1.0) * mix(1.0, wsh, 0.6);
        }
        wl = (uWind.z * mix(1.0, 0.55 + 0.9 * gn, uWind.w) + cp) * wsh;
        wv(sr, q, 3.3, wdir * 0.866 - wper * 0.5, 1.05, 0.5 * pow(wl, 0.6));
        wv(sr, q, 5.1, wdir * 0.906 + wper * 0.423, 1.37, 0.4 * pow(wl, 0.75));
        wv(sr, q, 7.9, wdir * 0.574 - wper * 0.819, 1.83, 0.3 * pow(wl, 0.9));
        wv(sr, q, 12.3, wdir * 0.985 + wper * 0.174, 2.41, 0.22 * pow(wl, 1.05));
        wv(sr, q, 19.0, wdir * 0.94 - wper * 0.34, 3.1, 0.3 * cp);
        wv(sr, q, 27.0, wdir * 0.87 + wper * 0.5, 3.8, 0.22 * cp);
      } else {
        wv(sr, p, 3.3, vec2(0.83, 0.56), 1.05, 0.5);
        wv(sr, p, 5.1, vec2(-0.46, 0.89), 1.37, 0.4);
        wv(sr, p, 7.9, vec2(0.95, -0.31), 1.83, 0.3);
        wv(sr, p, 12.3, vec2(0.21, 0.98), 2.41, 0.22);
        float gust = mix(1.0, 0.15 + 1.4 * gn * gn, uNoise);
        sr *= gust * (0.5 + 0.5 * smoothstep(4.0, 16.0, isleD));
        if (uGust.y > 0.001) {
          float gd = uGust.x - dot(p, uGustD), gv = max(uGust.z, 0.5), gdp = max(gd, 0.0);
          cp = clamp(uGust.y * (1.0 - exp(-gdp / (0.3 * gv))) * exp(-gdp / (1.5 * gv)) * 1.72 * smoothstep(-0.8, 0.3, gd) * (0.45 + 0.55 * smoothstep(0.28, 0.7, gn)), 0.0, 1.0);
          sr *= 1.0 + 2.4 * cp;
          wv(sr, p, 19.0, vec2(0.6, 0.8), 3.1, 0.3 * cp);
          wv(sr, p, 27.0, vec2(-0.88, 0.47), 3.8, 0.22 * cp);
        }
      }
      float wlo = mix(1.0, clamp(wl, 0.0, 2.2), uWindOn);
      float near = clamp(6.0 / dist, 0.25, 1.5);
      float wk = 0.0; vec2 wd = vec2(0.0);
      for (int i = 0; i < 6; i++) {
        vec4 W = uWake[i];
        if (W.w < 0.01) continue;
        vec2 rel = p - W.xy;
        if (dot(rel, rel) > 6.0) continue;
        vec2 dir = vec2(cos(W.z), sin(W.z)), per = vec2(-dir.y, dir.x);
        float b = -dot(rel, dir), l = dot(rel, per);
        if (b < 0.0) continue;
        float arm = abs(l) - 0.62 * b, wdt = 0.04 + 0.07 * b;
        float env = exp(-b / 2.2) * smoothstep(0.0, 0.12, b) * W.w;
        float wph = (b * 0.85 + abs(l) * 0.53) * 30.0 - uTime * 6.5;
        float g = exp(-arm * arm / (wdt * wdt)) * env * (0.68 + 0.32 * sin(wph) * aaw(wph));
        wk += g; wd += per * sign(l) * g;
      }
      vec2 disp = (wob * alive * (1.0 - smoothstep(35.0, 90.0, dist)) * 1.25 * mix(1.0, 0.7 + 0.3 * wlo + 0.6 * cp, uWindOn) + sr * vec2(0.26, 0.2) * 0.6) * uRipple * near + wd * 0.06 * near;
      float pw = p.y * 0.07 + p.x * 0.02 + uTime * 0.55;
      disp.x += sin(pw) * aaw(pw) * uRipple * 0.12 * smoothstep(25.0, 80.0, dist);
      vec2 u0 = vUv.xy / vUv.w + disp;
      vec2 tsz = vec2(textureSize(tDiffuse, 0));
      float st = uStreak * 0.55 * (0.8 + 0.5 * smoothstep(6.0, 40.0, dist)) * mix(1.0, 0.75 + 0.25 * wlo, uWindOn), stG = st * 0.75;
      float lodS = clamp(log2(stG * tsz.y) + mix(0.2, 0.75, uSoft), 0.0, 5.0);
      float wro = uWindOn * max(wlo - 1.0, 0.0), vb = mix(0.5, 0.8, uSoft) / tsz.y, lodC = mix(0.35, 0.9, uSoft) + 0.45 * wro;
      vec3 c0 = (rd(u0 + vec2(0.0, vb), lodC) + rd(u0 - vec2(0.0, vb), lodC)) * 0.5;
      vec3 refl = c0 * 0.5; float lodR = mix(0.6, 1.0, uSoft) + 0.45 * wro;
      float farK = smoothstep(30.0, 100.0, dist);
      for (int k = 1; k <= 3; k++) { float o = float(k) * 0.22 * st * mix(1.0, 1.4, uSoft) * mix(1.0, 0.25, farK); refl += (rd(u0 + vec2(0.0, o), lodR) + rd(u0 - vec2(0.0, o), lodR)) * (0.25 / 3.0); }
      float thr = mix(1.02, 0.25, uNight);
      vec3 glow = vec3(0.0); float gw = 0.0;
      for (int k = 1; k <= 12; k++) {
        float fk = float(k), w = exp(-fk * fk / 50.0);
        vec3 sa = rd(u0 + vec2(0.0, fk * stG), lodS), sb = rd(u0 - vec2(0.0, fk * stG), lodS);
        glow += (max(sa - thr, 0.0) * wmf(sa) * lmp(sa, lampK) + max(sb - thr, 0.0) * wmf(sb) * lmp(sb, lampK)) * w; gw += 2.0 * w;
      }
      glow = glow / gw * 5.1;
      float lodB = mix(2.0, 1.0, uSoft);
      vec2 sv = vec2(0.0, st * 3.0);
      vec3 soft = rd(u0, lodB) * 0.5 + (rd(u0 + sv, lodB) + rd(u0 - sv, lodB)) * 0.25;
      refl = mix(refl, max(refl, soft), 0.25 * smoothstep(0.14, 0.4, dot(soft, vec3(0.3, 0.5, 0.2))) * mix(0.35, 1.0, uNight) * wmf(soft) * lmp(soft, lampK));
      if (uSoft > 0.0) {
        vec2 tx = 0.7 / tsz;
        vec3 b = rd(u0 + vec2(tx.x, 0.0), 0.9) + rd(u0 - vec2(tx.x, 0.0), 0.9) + rd(u0 + vec2(0.0, tx.y * 1.6), 0.9) + rd(u0 - vec2(0.0, tx.y * 1.6), 0.9);
        refl = mix(refl, b * 0.25, 0.4 * uSoft);
      }
      glow = mix(glow, vec3(dot(glow, vec3(0.3, 0.5, 0.2))), 0.3);
      float nearIsle = 1.0 - smoothstep(10.0, 22.0, isleD);
      float gnz = mix(0.5, texture2D(tN, vec2(vW.x * 0.37, vW.z * 0.11 + uTime * 0.06)).g, uNoise);
      refl += glow * 1.15 * nearIsle * (0.88 + 0.24 * gnz) * mix(0.5, 1.0, uNight) * (1.0 - 0.6 * smoothstep(0.25, 0.8, dot(refl, vec3(0.3, 0.5, 0.2))));
      if (uRoad > 0.0) {
        float gzR = 1.0 - clamp(v.y, 0.0, 1.0);
        float Lr = uRoad * mix(1.0, 0.6 + 0.4 * wlo, uWindOn) * mix(1.0, 0.6, uNight) * mix(0.75, 1.15, smoothstep(0.8, 0.985, gzR)) * (1.0 - 0.45 * farK);
        vec2 rdir = normalize(p - uCam.xz + vec2(1e-4, 0.0));
        float wx = rdir.y * rdir.y;
        vec2 gA = p * vec2(0.17, 0.68) + vec2(uTime * 0.005, -uTime * 0.014), gB = p * vec2(0.68, 0.17) + vec2(-uTime * 0.014, uTime * 0.005);
        float sAl = mix(texture2D(tN, gB).r, texture2D(tN, gA).r, wx) - 0.5 + dot(sr, rdir) * 0.12;
        float aR = (1.0 - smoothstep(30.0, 85.0, dist)) * uNoise;
        float gm = max(0.0, mix(0.5, mix(mix(0.68, mix(0.24, 1.12, smoothstep(0.03, 0.17, sAl)), mix(1.0, min(wlo, 1.6), uWindOn)), 0.45, uMove * smoothstep(0.01, 0.035, fz)), aR));
        float jit = (texture2D(tN, p * 0.09 + vec2(uTime * 0.008, 0.0)).b - 0.5) * 0.25 * uNoise;
        float rth = mix(0.88, 0.42, uNight), lodB0 = log2(max(Lr * tsz.y * 0.05, 1.0));
        vec3 lw = vec3(0.2126, 0.7152, 0.0722), road = vec3(0.0);
        for (int k = 1; k <= 9; k++) {
          float fk = (float(k) + jit) / 9.0, o = Lr * (fk * fk * 0.85 + fk * 0.15);
          float w = exp(-1.7 * fk * fk), lk = clamp(lodB0 * (0.45 + 0.9 * fk) + 0.9, 1.6, 5.5);
          vec3 sa = rd(u0 + vec2(0.0, o), lk) * step(u0.y + o, 1.0), sb = rd(u0 - vec2(0.0, o), lk) * step(0.0, u0.y - o);
          float la = dot(sa, lw), lb = dot(sb, lw);
          road += (sa * smoothstep(rth * 0.8, rth * 1.55 + 0.1, la) * mix(1.0, wmf(sa), 0.6 * uNight) * lmp(sa, lampK) + sb * smoothstep(rth * 0.8, rth * 1.55 + 0.1, lb) * mix(1.0, wmf(sb), 0.6 * uNight) * lmp(sb, lampK)) * w;
        }
        refl += road * gm * uRoadG * mix(1.0, 0.6, uNight) * mix(0.35, 1.0, uNight);
      }
      refl *= 1.0 - 0.35 * cp + 0.11 * cp * dot(sr, vec2(0.62, 0.78));
      float shim = texture2D(tN, p * 0.035 + vec2(uTime * 0.004, -uTime * 0.003)).r * 0.6 + texture2D(tN, p * 0.09 - vec2(uTime * 0.006, uTime * 0.005)).g * 0.4;
      refl *= mix(1.0, 0.76 + 0.48 * shim, farK * 0.85 * uNight * uNoise);
      float fres = 0.35 + 0.65 * pow(1.0 - clamp(v.y, 0.0, 1.0), 3.0);
      float isle = 1.0 - smoothstep(4.0, 14.0, isleD);
      vec3 cn = mix(uTint, refl * 1.12, clamp(uReflect * (1.0 + 0.6 * fres) * (1.0 + 0.25 * isle), 0.0, 1.0));
      cn += vec3(0.03, 0.033, 0.04) * smoothstep(0.7, 1.0, wob.x * 0.5 + 0.5) * fres * (1.0 - smoothstep(4.0, 30.0, dist));
      float gz = 1.0 - clamp(v.y, 0.0, 1.0);
      float Fd = clamp(0.5 + 0.5 * pow(gz, 2.5) + 0.1 * isle, 0.0, 1.0);
      vec3 cd = mix(uBodyD * vec3(0.8, 0.83, 0.86), refl, Fd * (1.0 - 0.3 * cp) * (1.0 - 0.15 * min(wro, 1.0)));
      cd = mix(cd, uMistD, 0.08) * (1.0 - 0.34 * (1.0 - smoothstep(3.0, 15.0, isleD)) * (1.0 - smoothstep(0.12, 0.45, dot(refl, vec3(0.2126, 0.7152, 0.0722)))));
      vec3 c = mix(cd, cn, uNight);
      float nearFade = smoothstep(2.0, 9.0, dist);
      vec3 Lm = normalize(uMoon - vW), Hh = normalize(v + Lm);
      float hy2 = max(Hh.y * Hh.y, 1e-4), tan2 = (1.0 - hy2) / hy2;
      float sg = mix(0.26, 0.12, uNight) * mix(1.0, 0.85 + 0.15 * wlo, uWindOn);
      float pg = exp(-tan2 / (sg * sg));
      float gsc = mix(1.0, 0.3, uSoft);
      vec2 k1 = (vW.xz * mix(4.6, 6.1, uNight) + vec2(uTime * 0.13, -uTime * 0.08)) * gsc, k2 = (vW.xz * mix(6.4, 8.3, uNight) - vec2(uTime * 0.1, uTime * 0.15)) * gsc;
      float gq = texture2D(tN, k1).b * texture2D(tN, k2).a * 1.6;
      float gth = mix(0.97, 1.04, uNight) - mix(0.5, 0.45, uNight) * pg - 0.1 * cp * (1.0 - smoothstep(0.004, 0.012, fz));
      float crp = dot(p, vec2(0.83, 0.56)) * 3.3 + uTime * 1.05;
      float crest = mix(1.0, 0.35 + 0.65 * smoothstep(-0.3, 0.7, cos(crp)), aaw(crp) * (1.0 - uNight * 0.6));
      float glit = smoothstep(gth + 0.15 * uSoft, gth + 0.15 * uSoft + mix(0.08, 0.14, uSoft), gq) * min(1.0, pg * mix(2.6, 2.0, uNight)) * crest * smoothstep(5.0, 16.0, dist) * uNoise * (1.0 - uMove * smoothstep(0.004, 0.012, fz));
      c += vec3(0.95, 0.92, 0.86) * (glit * 2.2 * mix(1.0, 0.5 * smoothstep(0.12, 0.42, dot(refl, vec3(0.2126, 0.7152, 0.0722))), uNight) + pg * (0.05 + 0.05 * cp)) * nearFade * uMoonLit;
      c += vec3(1.0, 0.91, 0.75) * (glit * 4.0 + pg * (0.21 + 0.14 * cp) * (0.8 + 0.2 * crest)) * nearFade * uSunLit;
      float dep = clamp(v.y, 0.0, 1.0);
      float pz = mix(1.0, 0.8 + 0.4 * texture2D(tN, p * 0.006 + vec2(uTime * 0.0006, 0.0)).g, uNoise);
      float fog = clamp(exp(-dep / mix(0.034, 0.03, uNight)) * pz, 0.0, 1.0);
      c = mix(c, mix(uMistD, uMistN, uNight), fog);
      c += mix(vec3(0.075, 0.075, 0.07), vec3(0.055, 0.058, 0.064) * (0.4 + uMoonLit), uNight) * wk * 2.0;
      float a = mix(1.0 - uSee * mix(1.0, 1.35, 1.0 - uNight) * clamp(1.6 * (1.0 - fres) * (1.0 - fres), 0.0, 1.0), 1.0, fog);
      if (uUnderOn > 0.5) {
        vec2 kuv = gl_FragCoord.xy / uRes + disp * 1.0 + sr * 0.0012 * near, kdx = vec2(2.6 / uRes.x, 0.0), kdy = vec2(0.0, 2.6 / uRes.y);
        vec4 kc = (texture2D(tUnder, kuv) * 2.0 + texture2D(tUnder, kuv + kdx) + texture2D(tUnder, kuv - kdx) + texture2D(tUnder, kuv + kdy) + texture2D(tUnder, kuv - kdy)) / 6.0;
        if (kc.a > 0.002) {
          float Tr = 1.0 - (0.02 + 0.98 * pow(1.0 - clamp(v.y, 0.0, 1.0), 5.0));
          vec3 kt = kc.rgb / max(kc.a, 1e-3) * mix(vec3(0.68, 0.7, 0.72), vec3(0.37, 0.39, 0.42), uNight);
          float kw = kc.a * clamp(0.35 + 0.6 * Tr, 0.0, 0.9) * (1.0 - fog);
          c = mix(c, kt + c * 0.22, kw);
          a = mix(a, 1.0, kc.a * (1.0 - fog));
        }
      }
      gl_FragColor = vec4(c, clamp(a, 0.0, 1.0)); ${OUT}
      gl_FragColor.rgb += (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
    }`,
};

export function setupStage({ scene, renderer, stage, params, night, size, date: dateOpt, title: showTitle, noMirror }) {
  const SW = () => (size ? size()[0] : innerWidth), SH = () => (size ? size()[1] : innerHeight);
  const S = stage || {};
  const cam = S.camera || {}, wat = S.water || {}, sky = S.sky || {}, moon = S.moon || {};
  const narrow = () => { const w = SW(), h = SH(); return w < 760 && !(h < 500 && w > h); };
  const small = () => SW() < 760 || SH() < 500;
  const camFor = () => { const ph = narrow() && cam.phone ? cam.phone : cam; return {
    pos: B2T(ph.pos || cam.pos, [0, -21, 6.2]), target: B2T(ph.target || cam.target, [0, 0.6, 3.1]), fov: +(ph.fov || cam.fov || 30) }; };
  const c0 = camFor();
  const camera = new THREE.PerspectiveCamera(c0.fov, SW() / SH(), 0.1, 2000);
  camera.position.copy(c0.pos);
  const wz = +(wat.z != null ? wat.z : -0.35);
  const top = col(sky.top, '#040508'), hor = col(sky.horizon, '#15171d');
  const DY = S.day && typeof S.day === 'object' ? S.day : null, dsk = (DY && DY.sky) || {}, dwt = (DY && DY.water) || {};
  const topD = col(dsk.top, '#d9d7d1'), horD = col(dsk.horizon, '#f0ede6');
  const U = { night: { value: night }, time: { value: 0 } };
  const pap = (DY && DY.paper) || {};
  const papH = col(pap.horizon, '#f3ecde');
  const mistN = hor.clone().add(new THREE.Color(0.004, 0.005, 0.009));
  const skyTopD = topD.clone().lerp(col(null, '#d3d6d6'), 0.35), skyHorD = horD.clone().lerp(papH, 0.7);
  const mistD = horD.clone().lerp(papH, 0.55).multiplyScalar(0.985);
  const _fw = new THREE.Vector3();

  const nRT = new THREE.WebGLRenderTarget(512, 512, { depthBuffer: false, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true });
  nRT.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1);
  const nScene = new THREE.Scene(), nCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const nMat = new THREE.ShaderMaterial({ vertexShader: NOISE_VS, fragmentShader: NOISE_FS, depthTest: false, depthWrite: false });
  const nQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), nMat); nQuad.frustumCulled = false; nScene.add(nQuad);
  const noiseU = { value: 0 };
  let needNoise = false;
  const makeNoise = () => {
    const prev = renderer.getRenderTarget(), xr = renderer.xr.enabled;
    renderer.xr.enabled = false;
    renderer.setRenderTarget(nRT); renderer.render(nScene, nCam); renderer.setRenderTarget(prev);
    renderer.xr.enabled = xr;
    noiseU.value = 1; needNoise = false;
  };
  { const t0 = performance.now(); try { makeNoise(); } catch (e) { needNoise = true; } window.__skyNoiseMs = performance.now() - t0; }
  const onRestored = () => { noiseU.value = 0; needNoise = true; };
  renderer.domElement.addEventListener('webglcontextrestored', onRestored);

  const dirAE = (a, e) => new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
  const skyMat = new THREE.ShaderMaterial({ uniforms: {
    tN: { value: nRT.texture }, uNoise: noiseU,
    uTopN: { value: top }, uHorN: { value: hor }, uMistN: { value: mistN }, uInkN: { value: lin(0.0021, 0.0025, 0.0034) },
    uTopD: { value: skyTopD }, uHorD: { value: skyHorD }, uMistD: { value: mistD }, uInkD: { value: lin(0.30, 0.31, 0.33) },
    uNight: U.night, uStars: { value: +(sky.stars != null ? sky.stars : 0.8) }, uTw: { value: 37 }, uDrift: { value: 40 }, uMirror: { value: 0 },
    uMoonDir: { value: new THREE.Vector3(0, 0.3, -1).normalize() }, uMoonA: { value: 0.05 }, uMoonB: { value: 1 }, uStarRich: { value: 1 },
    uDip: { value: DIPPER }, uDipC: { value: new THREE.Vector2(0.25, 0.1) }, uDipS: { value: 0.006 },
    uStreak: { value: new THREE.Vector4() }, uStreakT: { value: -1 },
    uBand: { value: new THREE.Vector3(0, 1, 0) }, uBandX: { value: new THREE.Vector3(1, 0, 0) }, uBandY: { value: new THREE.Vector3(0, 0, -1) }, uBandB: { value: 1 },
    uBird: { value: new THREE.Vector4() }, uBirdA: { value: 0 }, uWindM: { value: 0 }, uMistAdv: { value: 0 }, uMistW: { value: 0 } },
    vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, depthTest: true });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), skyMat);
  dome.position.set(c0.target.x, wz, c0.target.z); dome.renderOrder = 50; dome.frustumCulled = false;
  const starsFull = skyMat.uniforms.uStars.value;
  dome.onBeforeRender = (r) => { const m = !!(water && water.getRenderTarget && r.getRenderTarget() === water.getRenderTarget()); const v = m ? starsFull * 0.25 : starsFull; if (skyMat.uniforms.uStars.value !== v || skyMat.uniforms.uMirror.value !== (m ? 1 : 0)) { skyMat.uniforms.uStars.value = v; skyMat.uniforms.uMirror.value = m ? 1 : 0; skyMat.uniformsNeedUpdate = true; } };
  let azHome = 0;
  {
    const f = c0.target.clone().sub(c0.pos).normalize(), azC = Math.atan2(f.x, -f.z), pitch = Math.asin(f.y);
    const vf = rad(c0.fov) / 2, hf = Math.atan(Math.tan(vf) * (SW() / SH()));
    azHome = azC;
    const scale = 0.05 / 12.4;
    skyMat.uniforms.uDipC.value.set(azC + hf * 0.5, Math.min(0.12, Math.max(0.052, pitch + vf * 0.55)));
    skyMat.uniforms.uDipS.value = scale;
    const H = dirAE(azC - 0.22, 0), P = dirAE(azC + 0.1, 0.32);
    const nb = new THREE.Vector3().crossVectors(H, P).normalize();
    skyMat.uniforms.uBand.value.copy(nb); skyMat.uniforms.uBandX.value.copy(H); skyMat.uniforms.uBandY.value.crossVectors(nb, H).normalize();
  }
  scene.add(dome);
  const windOn = (() => { const v = params && params.get('wind'); if (v !== null && v !== undefined) return v !== '0'; try { return new URLSearchParams(location.search).get('wind') !== '0'; } catch { return true; } })();
  skyMat.uniforms.uWindM.value = windOn ? 1 : 0;
  const veilMat = new THREE.ShaderMaterial({ uniforms: { uDay: { value: 1 - night } },
    vertexShader: 'varying vec2 vQ; void main() { vQ = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform float uDay; varying vec2 vQ; float hh(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\n' +
      'void main() { float r = length(vQ * vec2(0.92, 1.0)); float v = 1.0 - 0.1 * smoothstep(0.6, 1.45, r); float g = 1.0 + (hh(floor(gl_FragCoord.xy) * 0.53) - 0.5) * 0.03; gl_FragColor = vec4(vec3(mix(1.0, v * g, uDay)), 1.0); }',
    depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor });
  const veil = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)), veilMat);
  veil.frustumCulled = false; veil.renderOrder = 100000; veil.layers.set(1); camera.layers.enable(1); scene.add(veil);
  const fadeMat = new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 }, uC: { value: col(null, '#0b0c10') } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform float uA; uniform vec3 uC; void main() { gl_FragColor = vec4(uC, uA); }', depthTest: false, depthWrite: false, transparent: true });
  const fadeQ = new THREE.Mesh(veil.geometry, fadeMat); fadeQ.frustumCulled = false; fadeQ.renderOrder = 100001; fadeQ.layers.set(1); fadeQ.visible = false; scene.add(fadeQ);
  let fadeT0 = -99;
  const n0Col = () => (U.night.value > 0.5 ? hor : horD);

  const date = urlDate(params, dateOpt);
  const forced = params.get('moon');
  let phase = forced != null && forced !== '' && isFinite(+forced) ? ((+forced % 1) + 1) % 1
    : (moon.phase != null && moon.phase !== 'auto' && isFinite(+moon.phase) ? +moon.phase : moonPhase(date));
  const season = ['spring', 'summer', 'autumn', 'winter'].includes(params.get('season')) ? params.get('season') : seasonOf(date);
  window.__season = season; document.body.dataset.season = season; window.__moonPhase = phase;
  const frac = 0.5 - 0.5 * Math.cos(6.2831853 * phase);
  const moonMat = new THREE.ShaderMaterial({ uniforms: { uR: { value: 3.2 * +(moon.radius || 1.45) }, uPhase: { value: phase }, uGlow: { value: +(moon.glow != null ? moon.glow : 1) }, uNight: U.night, uTilt: { value: 0.42 }, uCloud: { value: new THREE.Vector4() } },
    vertexShader: MOON_VS, fragmentShader: MOON_FS,
    transparent: true, depthWrite: false });
  const moonMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), moonMat);
  moonMesh.position.copy(B2T(moon.pos, [0, 5.5, 5.5])); moonMesh.renderOrder = 10; moonMesh.frustumCulled = false;
  scene.add(moonMesh);
  const newK = 1 - sstep(0, 0.1, frac), fullK = sstep(0.6, 1, frac), moonB0 = 0.1 + 0.9 * Math.pow(frac, 0.85);
  skyMat.uniforms.uMoonB.value = moonB0;
  skyMat.uniforms.uStarRich.value = 1.0 + 0.45 * (1 - frac) + 0.18 * newK;
  skyMat.uniforms.uBandB.value = 1.25 - 0.65 * frac + 0.2 * newK;

  const tint = col(wat.color, '#05070a');
  const tintD = col(dwt.color, '#' + tint.getHexString()), tintCur = tint.clone();
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: tint.clone().multiplyScalar(0.8) }));
  bed.rotation.x = -Math.PI / 2; bed.position.y = wz - 0.30;
  scene.add(bed);

  const mirrorOn = params.get('mirror') !== '0' && !noMirror;
  const underRT = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType, samples: 4 });
  let underN = 0, underHeads = [];
  const _cc = new THREE.Color(), _db = new THREE.Vector2(), _hp = new THREE.Vector3(), _hq = new THREE.Vector3();
  const underSize = () => { renderer.getDrawingBufferSize(_db); const k = small() ? 0.4 : 0.5; const w = Math.max(16, Math.round(_db.x * k)), h = Math.max(16, Math.round(_db.y * k)); if (underRT.width !== w || underRT.height !== h) underRT.setSize(w, h); };
  const renderUnder = (r, sc, cm) => {
    if (r.getRenderTarget() !== null) return;
    underSize();
    const prevMask = cm.layers.mask, ca = r.getClearAlpha(); r.getClearColor(_cc);
    cm.layers.set(4);
    r.setRenderTarget(underRT); r.setClearColor(0x000000, 0); r.clear(true, true, false); r.render(sc, cm);
    r.setRenderTarget(null); r.setClearColor(_cc, ca); cm.layers.mask = prevMask;
    r.getDrawingBufferSize(_db); if (water.material && water.material.uniforms) water.material.uniforms.uRes.value.copy(_db);
  };
  const mres = isFinite(+params.get('mirrorres')) && +params.get('mirrorres') > 0 ? +params.get('mirrorres') : null;
  let mScale = 1, mEvery = 1, mFrame = 0; const mCam = new THREE.Matrix4();
  const mMoved = (m) => { const a = m.elements, b = mCam.elements; let r = 0; for (let i = 0; i < 11; i++) r = Math.max(r, Math.abs(a[i] - b[i])); return r > 0.002 || Math.hypot(a[12] - b[12], a[13] - b[13], a[14] - b[14]) > 0.02; };
  const dprK = () => Math.max(1, 2 / Math.max(1, +globalThis.devicePixelRatio || 1));
  const res = () => (mres || (small() ? 0.25 : 0.5)) * mScale * renderer.getPixelRatio() * dprK();
  let water;
  const bodyD = tintD.clone().lerp(papH, 0.5).multiplyScalar(0.8);
  const bedN = tint.clone().multiplyScalar(0.8), bedD = tintD.clone().multiplyScalar(0.42);
  if (mirrorOn) {
    water = new Reflector(new THREE.PlaneGeometry(4000, 4000), { textureWidth: Math.max(64, Math.round(SW() * res())), textureHeight: Math.max(64, Math.round(SH() * res())),
      clipBias: 0.003, shader: WATER, color: 0x000000 });
    const u = water.material.uniforms;
    { const rt = water.getRenderTarget(); rt.texture.generateMipmaps = true; rt.texture.minFilter = THREE.LinearMipmapLinearFilter; }
    { const ob = water.onBeforeRender; water.onBeforeRender = function (r, sc, cm, ...rest) { const mv = mMoved(cm.matrixWorld); if (mEvery > 1 && !mv && (mFrame++ % mEvery) !== 0) return; if (underN) renderUnder(r, sc, cm); mCam.copy(cm.matrixWorld); return ob.call(this, r, sc, cm, ...rest); }; }
    { const ip = B2T(cam.target, [0, 0.6, 3.1]); u.uIsle.value.set(ip.x, wz, ip.z); }
    u.uTint.value = tintCur; u.uBodyD.value = bodyD;
    u.uReflect.value = +(wat.reflect != null ? wat.reflect : 0.6);
    u.uRipple.value = 0.01; u.uSee.value = +(wat.see != null ? wat.see : 0.35);
    u.uRoad.value = params && params.get('road') !== null ? +params.get('road') : +(wat.road != null ? wat.road : 0.34);
    u.uRoadG.value = params && params.get('roadg') !== null ? +params.get('roadg') : +(wat.road_gain != null ? wat.road_gain : 1.5);
    u.uTime = U.time; u.uNight = U.night; u.uMistN.value = mistN; u.uMistD.value = mistD;
    u.tN.value = nRT.texture; u.uNoise = noiseU;
    u.tUnder.value = underRT.texture;
    water.material.transparent = true;
  } else {
    water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 1 - 0.6 * +(wat.see != null ? wat.see : 0.35) }));
  }
  water.rotation.x = -Math.PI / 2; water.position.y = wz;
  scene.add(water);


  const T = S.title;
  let titleEl = null;
  if (T && typeof T === 'object' && showTitle !== false && params.get('ui') !== '0' && params.get('title') !== '0') {
    const el = document.createElement('div');
    el.id = 'stagetitle';
    el.style.cssText = 'position:fixed;left:0;right:0;top:calc(56px + env(safe-area-inset-top));z-index:1;pointer-events:none;' +
      'display:flex;flex-direction:column;align-items:center;color:#f1ede4;text-shadow:0 2px 14px rgba(0,0,0,.55),0 0 2px rgba(0,0,0,.4);' +
      'font-family:"Songti SC","Hiragino Mincho ProN","Noto Serif CJK SC","Noto Serif JP",serif;';
    const narrowT = SW() < 760;
    const add = (tag, text, css) => { if (!text) return null; const e = document.createElement(tag); e.textContent = String(text); e.style.cssText = css; el.appendChild(e); return e; };
    add('div', T.cjk, `font-size:${narrowT ? 40 : 52}px;line-height:1.0;font-weight:400;letter-spacing:.04em;`);
    if (T.latin) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:14px;margin-top:6px;';
      const rule = () => { const r = document.createElement('span'); r.style.cssText = `display:block;width:${narrowT ? 34 : 54}px;height:1px;background:rgba(241,237,228,.55);`; return r; };
      const tx = document.createElement('span');
      tx.textContent = String(T.latin);
      tx.style.cssText = `font-size:${narrowT ? 12 : 14}px;letter-spacing:.62em;margin-right:-.62em;font-family:"Hiragino Mincho ProN","Songti SC",Georgia,serif;`;
      row.append(rule(), tx, rule());
      el.appendChild(row);
    }
    add('div', T.by, 'font-size:12px;letter-spacing:.18em;margin-top:5px;opacity:.78;font-family:Georgia,"Hiragino Mincho ProN",serif;font-style:italic;');
    add('div', T.tagline, 'font-size:12px;letter-spacing:.22em;margin-top:6px;opacity:.6;font-family:Georgia,serif;');
    document.body.appendChild(el);
    titleEl = el;
  }

  const birdTest = params.get('birds') !== null && isFinite(+params.get('birds')) ? Math.max(0, Math.min(1, +params.get('birds'))) : null;
  let twT = 37, drT = 40, lastT = null, birdT0 = -1, birdNext, camMv = 0, camSeen = false, cloudT0 = -1, cloudNext, cloudSeed = 0, lamp = 1, frozenN = 0, windSet = false, wdx = 1, wdz = 0, wNorm = 1, advX = 0, advZ = 0, mistAdv = 0, gTarget = 0, gEff = 0, gFront = 0, gR = 2, gF = 7;
  const CLOUD_DUR = 18, roadG0 = mirrorOn ? water.material.uniforms.uRoadG.value : 0;
  const _cq0 = new THREE.Quaternion(), _cp0 = new THREE.Vector3();
  const BIRD_DUR = 44;

  return {
    camera, water, dome, moonMesh, wz,
    shootStar(t) { this.nextStar = t; },
    applyControls(controls) {
      const c = camFor();
      controls.object = camera;
      camera.position.copy(c.pos); camera.fov = c.fov; controls.target.copy(c.target);
      const d = c.pos.distanceTo(c.target);
      const off = c.pos.clone().sub(c.target);
      const th0 = Math.atan2(off.x, off.z);
      const az = Array.isArray(cam.azimuth) ? cam.azimuth : [-28, 28], po = Array.isArray(cam.polar) ? cam.polar : [70, 87], zo = Array.isArray(cam.zoom) ? cam.zoom : [0.75, 1.8];
      controls.minAzimuthAngle = th0 + rad(+az[0]); controls.maxAzimuthAngle = th0 + rad(+az[1]);
      controls.minPolarAngle = rad(+po[0]); controls.maxPolarAngle = rad(+po[1]);
      controls.minDistance = d * +zo[0]; controls.maxDistance = d * +zo[1];
      controls.enableZoom = true;
      controls.update();
      this.d0 = d;
    },
    setMirror(scale, every) {
      const ch = scale !== mScale; mScale = scale; mEvery = Math.max(1, every | 0);
      if (ch && mirrorOn && water.getRenderTarget) water.getRenderTarget().setSize(Math.max(64, Math.round(SW() * res())), Math.max(64, Math.round(SH() * res())));
    },
    resize() {
      camera.aspect = SW() / SH();
      camera.updateProjectionMatrix();
      if (mirrorOn && water.getRenderTarget) water.getRenderTarget().setSize(Math.max(64, Math.round(SW() * res())), Math.max(64, Math.round(SH() * res())));
    },
    setUnder(objs) {
      underN = 0; underHeads = [];
      if (!mirrorOn || !Array.isArray(objs)) return;
      for (const o of objs) {
        o.traverse((m) => { if (m.isMesh) m.layers.enable(4); });
        const heads = []; o.traverse((m) => { const n = m.userData.name || m.name || ''; if (/_spine1$/.test(n)) heads.push(m); });
        for (const h of heads) { const pn = (h.userData.name || h.name).replace(/_spine1$/, '_spine2'); let nx = null; o.traverse((m) => { if ((m.userData.name || m.name) === pn) nx = m; }); if (nx) underHeads.push({ h, nx, px: null, pz: null, sp: 0 }); }
        underN++;
      }
      water.material.uniforms.uUnderOn.value = underN ? 1 : 0;
    },
    pxPerM(controls) { const d = camera.position.distanceTo(controls.target); return SH() / (2 * d * Math.tan(rad(camera.fov) / 2)); },
    home: () => camFor(),
    phase, season,
    windOn,
    setWind(a, b, c, d) {
      if (!mirrorOn || !windOn) return;
      const o = a && typeof a === 'object' ? a : { dirX: a, dirZ: b, base: (Math.max(0, +c || 0) / 2.5) * 0.32, turb: d };
      const l = Math.hypot(+o.dirX || 0, +o.dirZ || 0); if (l > 1e-6) { wdx = o.dirX / l; wdz = o.dirZ / l; }
      wNorm = Math.max(0, +o.base || 0) / 0.32; windSet = true;
      const u = water.material.uniforms;
      u.uWind.value.set(wdx, wdz, wNorm, o.turb == null || !isFinite(+o.turb) ? 0.5 : Math.max(0, Math.min(1, +o.turb)));
      const sp = Math.max(0.5, +o.speed || 4), r = Math.max(0.05, +o.rise || 0.45) * sp, f = Math.max(0.1, +o.fall || 1.6) * sp;
      const us = r * Math.log(1 + f / r), pk = (1 - Math.exp(-us / r)) * Math.exp(-us / f);
      const g = Math.max(0, Math.min(1.2, (+o.amp || 1.35) * (+o.strength || 0) / 1.35));
      gTarget = g / Math.max(pk, 1e-3); gFront = +o.front || 0; gR = r; gF = f;
      u.uGust.value.set(gFront, gEff, gR, gF);
      const gl = Math.hypot(+o.gdirX || 0, +o.gdirZ || 0); if (gl > 1e-6) u.uGustD.value.set(o.gdirX / gl, o.gdirZ / gl);
      u.uWindOn.value = 1; skyMat.uniforms.uMistW.value = 1;
    },
    setGust(front, strength, dirX, dirZ, speed) { if (!mirrorOn || !windOn || windSet) return; const u = water.material.uniforms, l = Math.hypot(+dirX || 0, +dirZ || 0); u.uGust.value.set(+front || 0, Math.max(0, Math.min(1, +strength || 0)), +speed > 0 ? +speed : 4, 0); if (l > 1e-6) u.uGustD.value.set(dirX / l, dirZ / l); },
    setLamps(v) { lamp = Math.max(0, Math.min(1, +v || 0)); if (mirrorOn) water.material.uniforms.uLamp.value = lamp; },
    dispose() {
      renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
      nRT.dispose(); nMat.dispose(); nQuad.geometry.dispose(); underRT.dispose();
      if (titleEl) titleEl.remove(); if (mirrorOn && water.getRenderTarget) water.getRenderTarget().dispose(); if (water.dispose) water.dispose();
    },
    fadeIn(t) { fadeT0 = t; fadeMat.uniforms.uC.value.copy(n0Col()); fadeQ.visible = true; },
    update(t, n, controls, still) {
      if (needNoise) { try { makeNoise(); } catch (e) { needNoise = true; } }
      const dt = lastT === null ? 0 : Math.max(0, Math.min(0.25, t - lastT)); lastT = t;
      frozenN = lastT !== null && dt === 0 ? frozenN + 1 : 0;
      if (windSet) {
        if (gTarget >= gEff || dt <= 0) gEff = dt > 0 ? gTarget : gEff; else gEff = Math.max(gTarget, gEff - dt * Math.max(gEff, 0.2) / 0.9);
        if (mirrorOn) water.material.uniforms.uGust.value.set(gFront, gEff, gR, gF);
      }
      if (windSet && dt > 0) {
        const sp = 0.6 + 0.9 * wNorm; advX = (advX + wdx * sp * dt) % 47.619; advZ = (advZ + wdz * sp * dt) % 47.619;
        mistAdv += dt * wNorm * 0.0018 * (wdx * Math.cos(azHome) + wdz * Math.sin(azHome));
        if (mirrorOn) water.material.uniforms.uWindAdv.value.set(advX, advZ);
        skyMat.uniforms.uMistAdv.value = mistAdv;
      }
      if (!still) { twT += dt; drT += dt; }
      U.night.value = n;
      {
        const cd = Math.max(1, camera.position.distanceTo(controls.target)), nr = Math.min(2, Math.max(0.1, cd * 0.035));
        if (Math.abs(camera.near - nr) > 1e-3) { camera.near = nr; camera.updateProjectionMatrix(); }
        if (camSeen && dt > 0) { const sp = (2 * Math.acos(Math.min(1, Math.abs(camera.quaternion.dot(_cq0)))) + camera.position.distanceTo(_cp0) / cd) / dt, goal = sstep(0.006, 0.03, sp); camMv += (goal - camMv) * (1 - Math.exp(-dt / (goal > camMv ? 0.06 : 0.35))); }
        _cq0.copy(camera.quaternion); _cp0.copy(camera.position); camSeen = true;
      }
      veilMat.uniforms.uDay.value = 1 - n; veil.visible = n < 0.999;
      const su = skyMat.uniforms;
      su.uTw.value = twT; su.uDrift.value = drT;
      { const dv = su.uMoonDir.value.subVectors(moonMesh.position, camera.position); const dd = dv.length(); dv.normalize(); su.uMoonA.value = (+(moon.radius || 1.45)) / Math.max(1, dd); }
      if (!still) {
        if (this.nextStar === undefined) this.nextStar = t + 20 + Math.random() * 40;
        if (su.uStreakT.value < 0 && t >= this.nextStar) {
          camera.getWorldDirection(_fw);
          const azC = Math.atan2(_fw.x, -_fw.z), elTop = Math.asin(Math.max(-1, Math.min(1, _fw.y))) + rad(camera.fov) / 2;
          const az0 = azC + (Math.random() - 0.5) * 0.5, el0 = Math.max(0.04, elTop - 0.03 - Math.random() * 0.06), dir = Math.random() < 0.5 ? -1 : 1;
          su.uStreak.value.set(az0, el0, dir * (0.14 + Math.random() * 0.1), -(0.025 + Math.random() * 0.02));
          this.starT0 = t; su.uStreakT.value = 0; this.lastStar = t;
        }
        if (su.uStreakT.value >= 0) {
          su.uStreakT.value = (t - this.starT0) / 0.75;
          if (su.uStreakT.value > 1.3) { su.uStreakT.value = -1; this.nextStar = t + 40 + Math.random() * 50; }
        }
      }
      let cloudCov = 0;
      {
        const cu = moonMat.uniforms.uCloud.value;
        if (!still && n > 0.6) {
          if (cloudNext === undefined) cloudNext = t + 25 + Math.random() * 40;
          if (cloudT0 < 0 && t >= cloudNext) { cloudT0 = t; cloudSeed = Math.random() * 50; }
        }
        if (cloudT0 >= 0) {
          const cp = (t - cloudT0) / CLOUD_DUR;
          if (cp >= 1 || cp < 0 || n < 0.3 || still) { cloudT0 = -1; cloudNext = t + 55 + Math.random() * 70; cu.set(0, 0, 0, 0); }
          else { const xc = -4.2 + 8.4 * cp, dens = 0.85 * sstep(0, 0.12, cp) * (1 - sstep(0.88, 1, cp)) * sstep(0.3, 0.8, n); cu.set(xc, dens, cloudSeed, 0); cloudCov = dens * Math.exp(-xc * xc / 2.6); }
        } else if (cu.y !== 0) cu.set(0, 0, 0, 0);
      }
      su.uMoonB.value = moonB0 * (1 - 0.5 * cloudCov);
      let bp = -1;
      if (birdTest !== null) bp = birdTest;
      else if (!still) {
        if (birdNext === undefined) birdNext = t + 18 + Math.random() * 25;
        if (birdT0 < 0 && t >= birdNext) { if (n < 0.35) birdT0 = t; else birdNext = t + 20; }
        if (birdT0 >= 0) { bp = (t - birdT0) / BIRD_DUR; if (bp >= 1) { birdT0 = -1; bp = -1; birdNext = t + 70 + Math.random() * 90; } }
      }
      if (bp >= 0) {
        su.uBird.value.set(azHome + 0.66 - 0.62 * bp, 0.05 - 0.016 * bp + 0.003 * Math.sin(bp * 5.3), bp, twT);
        su.uBirdA.value = sstep(0, 0.14, bp) * (1 - sstep(0.72, 1, bp)) * (1 - n);
      } else su.uBirdA.value = 0;
      if (DY) { tintCur.lerpColors(tintD, tint, n); bed.material.color.lerpColors(bedD, bedN, n); if (!mirrorOn) water.material.color.copy(tintCur); }
      U.time.value = t;
      if (fadeT0 > -50) { const fa = Math.max(0, 1 - (t - fadeT0) / 0.45); fadeMat.uniforms.uA.value = 0.9 * fa * fa; fadeQ.visible = fa > 0; if (fa <= 0) fadeT0 = -99; }
      if (mirrorOn) {
        const u = water.material.uniforms; u.uSoft.value = small() ? 1 : 0; u.uCam.value.copy(camera.position); u.uMove.value = camMv; if (frozenN > 2 || !windOn) u.uGust.value.y = 0;
        u.uMoon.value.copy(moonMesh.position);
        u.uMoonLit.value = (0.1 + 0.9 * Math.pow(frac, 0.9)) * (1 + 0.1 * fullK) * (1 - 0.6 * cloudCov) * sstep(0.3, 1, n);
        u.uRoadG.value = roadG0 * (1 + 0.12 * fullK * sstep(0.3, 1, n));
        u.uSunLit.value = 1 - sstep(0, 0.65, n);
      }
      if (mirrorOn && underHeads.length) {
        const wks = water.material.uniforms.uWake.value, cands = [];
        for (const k of underHeads) {
          k.h.getWorldPosition(_hp); k.nx.getWorldPosition(_hq);
          if (k.px !== null && dt > 0) { const v = Math.hypot(_hp.x - k.px, _hp.z - k.pz) / dt; k.sp += (Math.min(v, 1.5) - k.sp) * Math.min(1, dt * 2.5); }
          k.px = _hp.x; k.pz = _hp.z;
          const depth = wz - _hp.y, shallow = 1 - sstep(0.1, 0.32, depth), str = shallow * sstep(0.02, 0.22, k.sp);
          if (str > 0.01) { const hd = Math.atan2(_hp.z - _hq.z, _hp.x - _hq.x); cands.push([str, _hp.x + Math.cos(hd) * 0.1, _hp.z + Math.sin(hd) * 0.1, hd]); }
        }
        cands.sort((x, y) => y[0] - x[0]);
        for (let i = 0; i < 6; i++) { const c = cands[i]; if (c) wks[i].set(c[1], c[2], c[3], c[0]); else wks[i].w = 0; }
      }
      dome.position.set(controls.target.x, wz, controls.target.z);
    },
    clear: hor, clearDay: DY ? horD : null,
  };
}
