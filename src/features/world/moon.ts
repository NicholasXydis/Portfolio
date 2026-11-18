export const MOON_PHASES = [
  "new",
  "waxingCrescent",
  "firstQuarter",
  "waxingGibbous",
  "full",
  "waningGibbous",
  "lastQuarter",
  "waningCrescent",
] as const;
export type MoonPhaseName = (typeof MOON_PHASES)[number];

export function moonPhaseName(phase: number): MoonPhaseName | null {
  if (!Number.isFinite(phase)) return null;
  const p = ((phase % 1) + 1) % 1;
  const index = Math.floor(p * 8 + 0.5) % 8;
  return MOON_PHASES[index] ?? null;
}

const RAD = Math.PI / 180;
const DAY_MS = 86400000;
const UNIX_JD = 2440587.5;
const DELTA_T_MS = 69000;
const MEAN_MONTH_MS = 29.530588853 * DAY_MS;
const NEW_2000 = Date.UTC(2000, 0, 6, 18, 14);

const PLANETS: readonly (readonly [number, number, number])[] = [
  [299.77, 0.107408, 0.000325],
  [251.88, 0.016321, 0.000165],
  [251.83, 26.651886, 0.000164],
  [349.42, 36.412478, 0.000126],
  [84.66, 18.206239, 0.00011],
  [141.74, 53.303771, 0.000062],
  [207.14, 2.453732, 0.00006],
  [154.84, 7.30686, 0.000056],
  [34.52, 27.261239, 0.000047],
  [207.19, 0.121824, 0.000042],
  [291.34, 1.844379, 0.00004],
  [161.72, 24.198154, 0.000037],
  [239.56, 25.513099, 0.000035],
  [331.55, 3.592518, 0.000023],
];

function newOrFull(
  isNew: boolean,
  E: number,
  M: number,
  P: number,
  F: number,
  O: number,
) {
  const s = Math.sin;
  return (
    (isNew ? -0.4072 : -0.40614) * s(P) +
    (isNew ? 0.17241 : 0.17302) * E * s(M) +
    (isNew ? 0.01608 : 0.01614) * s(2 * P) +
    (isNew ? 0.01039 : 0.01043) * s(2 * F) +
    (isNew ? 0.00739 : 0.00734) * E * s(P - M) -
    (isNew ? 0.00514 : 0.00515) * E * s(P + M) +
    (isNew ? 0.00208 : 0.00209) * E * E * s(2 * M) -
    0.00111 * s(P - 2 * F) -
    0.00057 * s(P + 2 * F) +
    0.00056 * E * s(2 * P + M) -
    0.00042 * s(3 * P) +
    0.00042 * E * s(M + 2 * F) +
    0.00038 * E * s(M - 2 * F) -
    0.00024 * E * s(2 * P - M) -
    0.00017 * s(O) -
    0.00007 * s(P + 2 * M) +
    0.00004 * s(2 * P - 2 * F) +
    0.00004 * s(3 * M) +
    0.00003 * s(P + M - 2 * F) +
    0.00003 * s(2 * P + 2 * F) -
    0.00003 * s(P + M + 2 * F) +
    0.00003 * s(P - M + 2 * F) -
    0.00002 * s(P - M - 2 * F) -
    0.00002 * s(3 * P + M) +
    0.00002 * s(4 * P)
  );
}

function quarter(
  first: boolean,
  E: number,
  M: number,
  P: number,
  F: number,
  O: number,
) {
  const s = Math.sin;
  const c = Math.cos;
  const W =
    0.00306 -
    0.00038 * E * c(M) +
    0.00026 * c(P) -
    0.00002 * c(P - M) +
    0.00002 * c(P + M) +
    0.00002 * c(2 * F);
  return (
    -0.62801 * s(P) +
    0.17172 * E * s(M) -
    0.01183 * E * s(P + M) +
    0.00862 * s(2 * P) +
    0.00804 * s(2 * F) +
    0.00454 * E * s(P - M) +
    0.00204 * E * E * s(2 * M) -
    0.0018 * s(P - 2 * F) -
    0.0007 * s(P + 2 * F) -
    0.0004 * s(3 * P) -
    0.00034 * E * s(2 * P - M) +
    0.00032 * E * s(M + 2 * F) +
    0.00032 * E * s(M - 2 * F) -
    0.00028 * E * E * s(P + 2 * M) +
    0.00027 * E * s(2 * P + M) -
    0.00017 * s(O) -
    0.00005 * s(P - M - 2 * F) +
    0.00004 * s(2 * P + 2 * F) -
    0.00004 * s(P + M + 2 * F) +
    0.00004 * s(P - 2 * M) +
    0.00003 * s(P + M - 2 * F) +
    0.00003 * s(3 * M) +
    0.00002 * s(2 * P - 2 * F) +
    0.00002 * s(P - M + 2 * F) -
    0.00002 * s(3 * P + M) +
    (first ? W : -W)
  );
}

export function lunationTime(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;
  let jde =
    2451550.09766 +
    29.530588861 * k +
    0.00015437 * T2 -
    0.00000015 * T3 +
    0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3) * RAD;
  const P =
    (201.5643 +
      385.81693528 * k +
      0.0107582 * T2 +
      0.00001238 * T3 -
      0.000000058 * T4) *
    RAD;
  const F =
    (160.7108 +
      390.67050284 * k -
      0.0016118 * T2 -
      0.00000227 * T3 +
      0.000000011 * T4) *
    RAD;
  const O =
    (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * RAD;
  const q = Math.round((k - Math.floor(k)) * 4) % 4;
  jde +=
    q === 0 || q === 2
      ? newOrFull(q === 0, E, M, P, F, O)
      : quarter(q === 1, E, M, P, F, O);
  PLANETS.forEach(([a, b, amp], i) => {
    jde += amp * Math.sin((a + b * k - (i === 0 ? 0.009173 * T2 : 0)) * RAD);
  });
  return (jde - UNIX_JD) * DAY_MS - DELTA_T_MS;
}

export function moonPhase(date: Date): number {
  const t = date.getTime();
  if (!Number.isFinite(t)) return Number.NaN;
  let k = Math.floor((t - NEW_2000) / MEAN_MONTH_MS);
  while (lunationTime(k) > t) k -= 1;
  while (lunationTime(k + 1) <= t) k += 1;
  let from = lunationTime(k);
  for (let step = 1; step <= 4; step += 1) {
    const to = lunationTime(k + step / 4);
    if (t < to) return (step - 1 + (t - from) / (to - from)) / 4;
    from = to;
  }
  return 0;
}
