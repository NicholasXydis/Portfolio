import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Track } from "./player";

type Event = [string, number, number];

class FakeParam {
  value: number;
  target: number;
  events: Event[] = [];
  constructor(v = 1) {
    this.value = v;
    this.target = v;
  }
  setValueAtTime(v: number, t = 0) {
    this.value = v;
    this.events.push(["set", v, t]);
    return this;
  }
  linearRampToValueAtTime(v: number, t = 0) {
    this.target = v;
    this.events.push(["ramp", v, t]);
    return this;
  }
  exponentialRampToValueAtTime(v: number, t = 0) {
    this.target = v;
    this.events.push(["exp", v, t]);
    return this;
  }
  setTargetAtTime(v: number) {
    this.target = v;
    return this;
  }
  setValueCurveAtTime(curve: Float32Array) {
    this.target = curve[curve.length - 1] ?? this.target;
    return this;
  }
  cancelScheduledValues() {
    return this;
  }
}

export const liveSources = new Set<object>();

class FakeNode {
  outputs: FakeNode[] = [];
  constructor(
    readonly ctx: FakeContext,
    readonly kind: string,
  ) {}
  connect<T extends FakeNode>(node: T): T {
    this.outputs.push(node);
    return node;
  }
  disconnect() {
    this.outputs = [];
  }
}

type Source = FakeNode & {
  buffer: unknown;
  playbackRate: FakeParam;
  onended: null | (() => void);
  startArgs: number[];
  stopArgs: number[];
  outputs: (FakeNode & { gain?: FakeParam })[];
};

let contexts: FakeContext[] = [];
let inGesture = false;
let playing = new Set<HTMLMediaElement>();

class FakeContext {
  state: "suspended" | "running" | "closed" = "suspended";
  currentTime = 0;
  destination = new FakeNode(this, "destination");
  master: (FakeNode & { gain: FakeParam }) | null = null;
  resumedInGesture = false;
  sources: Source[] = [];
  private events = new Map<string, Set<() => void>>();
  constructor() {
    contexts.push(this);
  }
  addEventListener(type: string, fn: () => void) {
    if (!this.events.has(type)) this.events.set(type, new Set());
    this.events.get(type)?.add(fn);
  }
  removeEventListener(type: string, fn: () => void) {
    this.events.get(type)?.delete(fn);
  }
  dispatch(type: string) {
    this.events.get(type)?.forEach((fn) => fn());
  }
  resume() {
    this.resumedInGesture ||= inGesture;
    this.state = "running";
    return Promise.resolve();
  }
  suspend() {
    this.state = "suspended";
    return Promise.resolve();
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
  gains: (FakeNode & { gain: FakeParam })[] = [];
  createGain() {
    const g = Object.assign(new FakeNode(this, "gain"), {
      gain: new FakeParam(1),
    });
    this.master ??= g;
    this.gains.push(g);
    return g;
  }
  decodeAudioData(bytes: ArrayBuffer) {
    return Promise.resolve({ duration: 0.2, bytes } as unknown as AudioBuffer);
  }
  createDynamicsCompressor() {
    const p = () => new FakeParam(0);
    return Object.assign(new FakeNode(this, "limiter"), {
      threshold: p(),
      knee: p(),
      ratio: p(),
      attack: p(),
      release: p(),
    });
  }
  createAnalyser() {
    return Object.assign(new FakeNode(this, "analyser"), {
      fftSize: 2048,
      getFloatTimeDomainData: (out: Float32Array) => {
        const on =
          this.state === "running" &&
          (playing.size > 0 || this.sources.some((s) => s.kind === "buffer"));
        out.fill(on ? (this.master?.gain.target ?? 0) * 0.2 : 0);
      },
    });
  }
  sampleRate = 48000;
  createBuffer(channels: number, length: number) {
    const data = Array.from(
      { length: channels },
      () => new Float32Array(length),
    );
    return { getChannelData: (c: number) => data[c] };
  }
  private source(kind: string): Source {
    const node: Source = Object.assign(new FakeNode(this, kind), {
      buffer: null as unknown,
      playbackRate: new FakeParam(1),
      onended: null as null | (() => void),
      startArgs: [] as number[],
      stopArgs: [] as number[],
    });
    Object.assign(node, {
      start: (...args: number[]) => {
        node.startArgs = args;
        liveSources.add(node);
      },
      stop: (...args: number[]) => {
        node.stopArgs = args;
        liveSources.delete(node);
      },
    });
    this.sources.push(node);
    return node;
  }
  createBufferSource() {
    return this.source("buffer");
  }
  createMediaElementSource(el: HTMLMediaElement) {
    return Object.assign(new FakeNode(this, "media"), { el });
  }
}

const RATE = 48000;
const FRAME = 626;
const SAMPLES = (1152 * 160) / 147;

function noise(n: number) {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 2246822507) >>> 0;
  x ^= x >>> 13;
  return (x / 4294967296 - 0.5) * 0.8;
}

function song(frames: number): Uint8Array {
  const out = new Uint8Array(10 + frames * FRAME);
  out.set([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0]);
  for (let f = 0; f < frames; f++) {
    const at = 10 + f * FRAME;
    out.set([0xff, 0xfb, 0xb0, 0x00], at);
    new DataView(out.buffer).setUint32(at + 4, f);
  }
  return out;
}

function fakeDecode(bytes: ArrayBuffer): AudioBuffer {
  const view = new DataView(bytes);
  const frames: number[] = [];
  for (let at = 0; at + 8 <= bytes.byteLength;) {
    if (view.getUint8(at) === 0xff && view.getUint8(at + 1) === 0xfb) {
      frames.push(view.getUint32(at + 4));
      at += FRAME;
    } else at += 1;
  }
  const first = frames[0] ?? 0;
  const length = Math.floor(frames.length * SAMPLES);
  const start = Math.round((first - 1) * SAMPLES);
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++)
    data[i] = i < 2 * SAMPLES && first > 1 ? 0 : noise(start + i);
  if (first === 1) data.fill(0, 0, 4800);
  return {
    duration: length / RATE,
    length,
    sampleRate: RATE,
    numberOfChannels: 2,
    getChannelData: () => data,
  } as unknown as AudioBuffer;
}

let decodes = 0;
let holdDecode: ((first: number) => boolean) | null = null;
const held: (() => void)[] = [];

class FakeOffline {
  constructor(
    readonly channels: number,
    readonly length: number,
    readonly sampleRate: number,
  ) {}
  decodeAudioData(bytes: ArrayBuffer) {
    decodes += 1;
    const buffer = fakeDecode(bytes);
    const view = new DataView(bytes);
    const first = bytes.byteLength >= 8 ? view.getUint32(4) : 0;
    if (holdDecode?.(first))
      return new Promise<AudioBuffer>((resolve) =>
        held.push(() => resolve(buffer)),
      );
    return Promise.resolve(buffer);
  }
}

function serve(bytes: Uint8Array) {
  return vi.fn((url: string) => {
    if (url.endsWith("tracks.json"))
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    let sent = 0;
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => String(bytes.length) },
      body: {
        getReader: () => ({
          read: () => {
            if (sent >= bytes.length)
              return Promise.resolve({ done: true, value: undefined });
            const chunk = bytes.subarray(sent, sent + 65536);
            sent += chunk.length;
            return Promise.resolve({ done: false, value: chunk });
          },
        }),
      },
    });
  });
}

const TRACKS: Track[] = [
  {
    id: "one",
    file: "/music/samples/01-one.mp3",
    title: "One",
    artist: "A",
    license: "CC0",
    credit: null,
    lufs: -20,
  },
  {
    id: "two",
    file: "/music/samples/02-two.mp3",
    title: "Two",
    artist: "B",
    license: "CC BY 4.0",
    credit: "Two by B (CC BY 4.0)",
    lufs: -14,
  },
];

function click(fn: () => void) {
  inGesture = true;
  try {
    fn();
  } finally {
    inGesture = false;
  }
}

async function freshPlayer() {
  vi.resetModules();
  const player = await import("./player");
  player.resetSongsForTest();
  player.setTracksForTest(TRACKS);
  return player;
}

const music = (ctx: FakeContext) =>
  ctx.sources.filter(
    (s) => ((s.buffer as AudioBuffer | null)?.duration ?? 0) > 2,
  );

describe("music player", () => {
  let fetchMock: ReturnType<typeof serve>;
  beforeEach(() => {
    contexts = [];
    playing = new Set();
    liveSources.clear();
    decodes = 0;
    holdDecode = null;
    held.length = 0;
    vi.stubGlobal("AudioContext", FakeContext);
    vi.stubGlobal("OfflineAudioContext", FakeOffline);
    fetchMock = serve(song(1300));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function ready() {
    const player = await freshPlayer();
    player.warm();
    await vi.advanceTimersByTimeAsync(50);
    return player;
  }

  async function advance(ctx: FakeContext, seconds: number) {
    for (let t = 0; t < seconds; t += 0.2) {
      ctx.currentTime += 0.2;
      await vi.advanceTimersByTimeAsync(200);
    }
  }

  it("creates no audio before a gesture, only downloads and decodes the opening", async () => {
    await ready();
    expect(contexts).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/music/samples/01-one.mp3",
      expect.anything(),
    );
    expect(decodes).toBe(1);
  });

  it("starts the decoded opening inside the Enter click, at its first sound", async () => {
    const player = await ready();
    click(() => player.start());
    expect(contexts).toHaveLength(1);
    const ctx = contexts[0]!;
    expect(ctx.resumedInGesture).toBe(true);
    const first = music(ctx)[0]!;
    expect(first.startArgs[0]).toBeCloseTo(0.25, 6);
    expect(first.startArgs[1]).toBeCloseTo(0.1 - 0.004, 6);
    expect(ctx.master?.gain.value).toBeLessThan(0.001);
    expect(player.isPlaying()).toBe(true);
    expect(player.level()).toBeGreaterThan(0.05);
  });

  it("starts once, however many times Enter is pressed", async () => {
    const player = await ready();
    click(() => player.start());
    click(() => player.start());
    expect(contexts).toHaveLength(1);
    expect(music(contexts[0]!)).toHaveLength(1);
  });

  it("sets the track gain from the -27 LUFS level", async () => {
    const player = await ready();
    expect(player.MUSIC_LUFS).toBe(-27);
    click(() => player.start());
    const levels = contexts[0]!.gains.map((g) => g.gain.value);
    expect(levels.some((v) => Math.abs(v - 10 ** (-7 / 20)) < 1e-6)).toBe(true);
  });

  it("joins the pieces of the song on the exact sample with a short crossfade", async () => {
    const player = await ready();
    click(() => player.start());
    const ctx = contexts[0]!;
    await advance(ctx, 6);
    const [a, b] = music(ctx);
    expect(b).toBeDefined();
    const zero = a!.startArgs[0]! - a!.startArgs[1]!;
    const at = (295 - 1) * (1152 / 44100);
    expect(b!.startArgs[1]).toBeCloseTo(1.2, 6);
    expect(b!.startArgs[0]! - zero).toBeCloseTo(at + 1.2, 6);
    const fadeIn = b!.outputs[0]!.gain!;
    expect(fadeIn.value).toBe(0);
    expect(fadeIn.events).toEqual([
      ["set", 0, b!.startArgs[0]],
      ["ramp", 1, b!.startArgs[0]! + 0.012],
    ]);
    const fadeOut = a!.outputs[0]!.gain!.events;
    expect(fadeOut.at(-1)).toEqual(["ramp", 0, b!.startArgs[0]! + 0.012]);
    expect(a!.stopArgs[0]).toBeCloseTo(b!.startArgs[0]! + 0.032, 6);
  });

  it("keeps only the playing piece and the next one in memory", async () => {
    const player = await ready();
    click(() => player.start());
    const ctx = contexts[0]!;
    await advance(ctx, 3.4);
    expect(decodes).toBe(2);
    expect(music(ctx)).toHaveLength(2);
  });

  it("loops back to the start with a 6 s crossfade", async () => {
    const player = await ready();
    click(() => player.start());
    const ctx = contexts[0]!;
    await advance(ctx, 40);
    const voices = music(ctx);
    const again = voices.filter((v) => v.startArgs[1] === 0);
    expect(again).toHaveLength(1);
    const t = again[0]!.startArgs[0]!;
    const fresh = again[0]!.outputs[0]!.outputs[0] as unknown as {
      gain: FakeParam;
    };
    expect(fresh.gain.events).toEqual([
      ["set", 0, t],
      ["ramp", 10 ** (-7 / 20), t + 6],
    ]);
    const last = voices[voices.indexOf(again[0]!) - 1]!;
    expect(last.stopArgs[0]).toBeCloseTo(t + 6.05, 6);
    const old = last.outputs[0]!.outputs[0] as unknown as { gain: FakeParam };
    expect(old.gain.events.at(-1)).toEqual(["ramp", 0, t + 6]);
  });

  it("fades out instead of cutting when the next piece is late, then picks up where it stopped", async () => {
    const player = await ready();
    holdDecode = (first) => first > 1;
    click(() => player.start());
    const ctx = contexts[0]!;
    await advance(ctx, 10.6);
    const [a] = music(ctx);
    expect(a!.outputs[0]!.gain!.events.at(-1)?.[1]).toBe(0);
    expect(a!.stopArgs).toHaveLength(1);
    held.forEach((go) => go());
    await advance(ctx, 0.4);
    const b = music(ctx)[1]!;
    expect(b.outputs[0]!.gain!.events[1]?.[0]).toBe("ramp");
    expect(b.startArgs[0]).toBeGreaterThan(10.6);
  });

  it("mutes with a fade, remembers it, and resumes in the same place", async () => {
    const player = await ready();
    click(() => player.start());
    const ctx = contexts[0]!;
    player.setMuted(true);
    expect(player.isMuted()).toBe(true);
    expect(ctx.master?.gain.target).toBeLessThan(0.001);
    await vi.advanceTimersByTimeAsync(700);
    expect(ctx.state).toBe("suspended");
    expect(player.isPlaying()).toBe(false);
    expect(player.level()).toBe(0);
    click(() => player.setMuted(false));
    await vi.advanceTimersByTimeAsync(50);
    expect(player.isPlaying()).toBe(true);
    expect(music(ctx)).toHaveLength(1);
  });

  it("stays silent after Enter when the visitor muted it before, and unmutes from the toggle", async () => {
    const player = await ready();
    player.setMuted(true);
    click(() => player.start());
    expect(contexts).toHaveLength(0);
    click(() => player.setMuted(false));
    await vi.advanceTimersByTimeAsync(50);
    expect(player.isPlaying()).toBe(true);
  });

  it("tells the page the music is playing as soon as the audio context resumes, not later", async () => {
    const player = await ready();
    click(() => player.start());
    const ctx = contexts[0]!;
    ctx.state = "suspended";
    expect(player.isPlaying()).toBe(false);
    const seen: boolean[] = [];
    const off = player.subscribe(() => seen.push(player.isPlaying()));
    ctx.state = "running";
    ctx.dispatch("statechange");
    expect(seen.at(-1)).toBe(true);
    off();
  });

  it("falls back to a plain audio element when the browser cannot decode", async () => {
    vi.stubGlobal("OfflineAudioContext", undefined);
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      playing.add(this);
      return Promise.resolve();
    });
    const player = await freshPlayer();
    click(() => player.start());
    expect([...playing].map((el) => el.src)).toEqual([
      expect.stringMatching(/01-one\.mp3$/),
    ]);
    expect(player.isPlaying()).toBe(false);
  });
});

describe("reading the song", () => {
  it("reads MP3 frame headers and skips an ID3 tag", async () => {
    const player = await freshPlayer();
    const bytes = song(3);
    expect(player.tagSize(bytes)).toBe(10);
    expect(player.frameAt(bytes, 10, bytes.length)).toEqual({
      size: 626,
      rate: 44100,
      spf: 1152,
    });
    expect(player.frameAt(bytes, 11, bytes.length)).toBeNull();
    expect(player.tagSize(new Uint8Array(10))).toBe(0);
  });

  it("starts every piece on the same sample grid", async () => {
    const player = await freshPlayer();
    const s = new player.Song(TRACKS[0]!);
    s.total = 1300 * FRAME + 10;
    s.append(song(1300));
    s.done = true;
    expect(s.grid()).toBe(49);
    const frames = [0, 1, 2].map((k) => s.piece(k)?.frame);
    expect(frames).toEqual([1, 295, 736]);
    expect(frames.every((f) => ((f ?? 0) - 1) % 49 === 0)).toBe(true);
    expect(s.piece(2)?.last).toBe(true);
    expect(s.piece(3)).toBeNull();
  });

  it("skips the quiet lead-in of a recording, keeping 4 ms before the first sound", async () => {
    const player = await freshPlayer();
    const samples = new Float32Array(48000);
    samples.fill(0.00004);
    samples[12480] = 0.2;
    expect(player.leadIn(samples, 48000)).toBeCloseTo(0.256, 6);
    expect(player.leadIn(new Float32Array(48000), 48000)).toBe(0);
  });

  it("finds where one piece sits in the one before, to the sample", async () => {
    const player = await freshPlayer();
    const whole = new Float32Array(120000).map((_, i) => noise(i));
    const piece = (from: number) => whole.slice(from, from + 60000);
    for (const shift of [0, 1, 37, 1200, 3000]) {
      expect(
        player.matchAt(piece(10000), piece(10000 + shift), shift + 50, RATE),
      ).toBe(shift);
    }
    const other = new Float32Array(60000).map((_, i) => noise(i + 9e6));
    expect(player.matchAt(piece(0), other, 0, RATE)).toBeNull();
  });
});

describe("card and pond sounds", () => {
  beforeEach(() => {
    contexts = [];
    playing = new Set();
    liveSources.clear();
    vi.stubGlobal("AudioContext", FakeContext);
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        }),
      ),
    );
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      playing.add(this);
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      playing.delete(this);
    });
    vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockImplementation(
      function (this: HTMLMediaElement) {
        return !playing.has(this);
      },
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function freshSounds() {
    const player = await freshPlayer();
    const sounds = await import("./effects");
    sounds.resetSoundsForTest();
    return { player, sounds };
  }

  const lastSource = () =>
    [...liveSources].at(-1) as
      { playbackRate: FakeParam; outputs: { gain?: FakeParam }[] } | undefined;

  it("uses the owner's picks: soft pops for the card, a water drop for the pond", async () => {
    const { sounds } = await freshSounds();
    expect(sounds.CARD_SOUND).toEqual({
      open: "/sounds/card-open.mp3",
      close: "/sounds/card-close.mp3",
    });
    expect(sounds.POND_SOUND).toBe("/sounds/water.mp3");
  });

  it("is silent before the first press and while muted", async () => {
    const { player, sounds } = await freshSounds();
    sounds.primeSounds();
    expect(sounds.cardSound("open")).toBe(false);
    expect(contexts).toHaveLength(0);
    click(() => player.start());
    sounds.primeSounds();
    await new Promise((r) => setTimeout(r, 0));
    player.setMuted(true);
    expect(sounds.cardSound("open")).toBe(false);
    expect(sounds.pondSound()).toBe(false);
  });

  it("plays each sound as recorded through the music output", async () => {
    const { player, sounds } = await freshSounds();
    click(() => player.start());
    sounds.primeSounds();
    await new Promise((r) => setTimeout(r, 0));
    expect(sounds.cardSound("open")).toBe(true);
    const open = lastSource();
    expect(open?.playbackRate.value).toBe(1);
    expect(open?.outputs[0]?.gain?.value).toBeCloseTo(1);
    contexts[0]!.currentTime = 1;
    expect(sounds.cardSound("close")).toBe(true);
    expect(sounds.pondSound()).toBe(true);
  });

  it("never stacks: in a quick open, close, open each new card sound fades the one before, and repeats inside 80 ms are skipped", async () => {
    const { player, sounds } = await freshSounds();
    click(() => player.start());
    sounds.primeSounds();
    await new Promise((r) => setTimeout(r, 0));
    const ctx = contexts[0]!;
    const steps: boolean[] = [];
    for (const [t, which] of [
      [0, "open"],
      [0.05, "close"],
      [0.1, "open"],
      [0.12, "close"],
    ] as const) {
      ctx.currentTime = 10 + t;
      steps.push(sounds.cardSound(which));
    }
    expect(steps).toEqual([true, true, true, false]);
    const cards = [...liveSources].filter(
      (n) => (n as { kind?: string }).kind === "buffer",
    );
    expect(cards.length).toBeLessThanOrEqual(1);
    ctx.currentTime = 20;
    const taps = [0, 0.05, 0.13, 0.2, 0.3].map((t) => {
      ctx.currentTime = 20 + t;
      return sounds.pondSound();
    });
    expect(taps).toEqual([true, false, true, false, true]);
  });
});
