type Point = readonly [number, number];

export interface KoiShapeOptions {
  cx: number;
  cy: number;
  ring: number;
  width: number;
  head: number;
  span: number;
  swing?: number;
  tail?: number;
  finOuter?: number;
  finInner?: number;
}

export interface KoiShape {
  body: string;
  fins: string;
  eye: { x: number; y: number; r: number };
}

const BODY_END = 0.72;
const PEDUNCLE = 0.18;
const BELLY_MAX = 0.3697;
const STEPS = 44;

function halfWidth(t: number, width: number, tail: number): number {
  if (t <= BODY_END) {
    const u = t / BODY_END;
    const belly = (Math.sqrt(u) * Math.pow(1 - u, 1.1)) / BELLY_MAX;
    return width * (belly + PEDUNCLE * u * u);
  }
  const v = (t - BODY_END) / (1 - BODY_END);
  return width * (PEDUNCLE + (tail - PEDUNCLE) * Math.pow(v, 1.6));
}

function fmt(point: Point): string {
  return `${point[0].toFixed(2)} ${point[1].toFixed(2)}`;
}

function mid(a: Point, b: Point): Point {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function smooth(points: readonly Point[]): string {
  let d = "";
  let last: Point | undefined;
  points.forEach((point, i) => {
    const next = points[i + 1];
    if (i > 0 && next) d += ` Q ${fmt(point)} ${fmt(mid(point, next))}`;
    last = point;
  });
  return last ? `${d} L ${fmt(last)}` : d;
}

export function koiShape(options: KoiShapeOptions): KoiShape {
  const {
    cx,
    cy,
    ring,
    width,
    head,
    span,
    swing = 0.3,
    tail = 0.95,
    finOuter = 1,
    finInner = 1,
  } = options;
  const headRad = (head * Math.PI) / 180;
  const spanRad = (span * Math.PI) / 180;

  const angle = (t: number) => headRad - spanRad * t;
  const radius = (t: number) => ring + swing * width * t * t;
  const at = (t: number, offset: number): Point => {
    const r = radius(t) + offset;
    const a = angle(t);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  const outer: Point[] = [];
  const inner: Point[] = [];
  for (let i = 0; i <= STEPS; i += 1) {
    const t = Math.pow(i / STEPS, 1.7);
    const h = halfWidth(t, width, tail);
    outer.push(at(t, h));
    inner.push(at(t, -h));
  }
  const nose = at(0, 0);
  const notch = at(0.9, 0);
  const tailTip = at(1, -halfWidth(1, width, tail));
  const body =
    `M ${fmt(nose)}${smooth(outer)} L ${fmt(notch)} L ${fmt(tailTip)}` +
    `${smooth([...inner].reverse())} Z`;

  const fin = (side: 1 | -1, size: number): string => {
    if (size <= 0) return "";
    const edge = (t: number, lift: number) =>
      at(t, side * (halfWidth(t, width, tail) * 0.72 + lift * size * width));
    return (
      `M ${fmt(edge(0.2, 0))} Q ${fmt(edge(0.25, 1.05))} ${fmt(edge(0.43, 1.02))}` +
      ` Q ${fmt(edge(0.5, 0.82))} ${fmt(edge(0.46, 0.42))} Q ${fmt(edge(0.43, 0.1))} ${fmt(edge(0.36, 0))} Z`
    );
  };

  const eye = at(0.115, 0);
  return {
    body,
    fins: `${fin(1, finOuter)} ${fin(-1, finInner)}`.trim(),
    eye: { x: eye[0], y: eye[1], r: width * 0.19 },
  };
}
