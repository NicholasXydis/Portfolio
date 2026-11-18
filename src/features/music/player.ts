export interface Track {
  id: string;
  file: string;
  title: string;
  artist: string;
  license: string;
  licenseUrl?: string | null;
  sourceUrl?: string | null;
  credit?: string | null;
  seconds?: number | null;
  lufs?: number | null;
  style?: string | null;
  description?: string | null;
  loopNote?: string | null;
}

export const TRACKS_URL = "/music/samples/tracks.json";
const MUTE_KEY = "koi-music";

export const MUSIC_LUFS = -27;
const FADE_IN_S = 0.25;
const FADE_OUT_S = 0.6;
const LOOP_XFADE_S = 6;
const QUIET = 0.0001;
const FLOOR = 0.01;

function read(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    return;
  }
}

let memoryMuted: boolean | null = null;

export function isMuted(): boolean {
  const raw = read(MUTE_KEY);
  if (raw) {
    try {
      return (JSON.parse(raw) as { muted?: boolean }).muted === true;
    } catch {
      return false;
    }
  }
  return memoryMuted ?? false;
}

let tracks: Track[] | null = null;
let tracksPromise: Promise<Track[]> | null = null;

function isTrack(value: unknown): value is Track {
  const t = value as Track;
  return (
    !!t &&
    typeof t.id === "string" &&
    typeof t.file === "string" &&
    typeof t.title === "string"
  );
}

function loadTracks(): Promise<Track[]> {
  if (tracksPromise) return tracksPromise;
  if (typeof fetch !== "function") return Promise.resolve([]);
  tracksPromise = fetch(TRACKS_URL, { cache: "no-cache" })
    .then((res) =>
      res.ok ? res.json() : Promise.reject(new Error(String(res.status))),
    )
    .then((data: unknown) => {
      const list = Array.isArray(data) ? data.filter(isTrack) : [];
      tracks = list;
      notify();
      return list;
    })
    .catch(() => {
      tracks = [];
      tracksPromise = null;
      notify();
      return [];
    });
  notify();
  return tracksPromise;
}

export function setTracksForTest(list: Track[]): void {
  tracks = list;
  tracksPromise = Promise.resolve(list);
  notify();
}

const NO_TRACKS: Track[] = [];

function getTracks(): Track[] {
  return tracks ?? NO_TRACKS;
}

function theTrack(): Track | null {
  return getTracks()[0] ?? null;
}

function trackGain(track: Track): number {
  const lufs =
    typeof track.lufs === "number" && Number.isFinite(track.lufs)
      ? track.lufs
      : MUSIC_LUFS;
  return Math.min(2, 10 ** ((MUSIC_LUFS - lufs) / 20));
}

type Ctor = typeof AudioContext;
type OfflineCtor = typeof OfflineAudioContext;

const DECODE_RATE = 48000;
const SEG_BYTES = 262144;
const OVERLAP_S = 2;
const AHEAD_S = 8;
const JOIN_AT_S = 1.2;
const JOIN_S = 0.012;
const STARVE_S = 0.08;
const PROBE = 8192;
const SEARCH = 6000;
const TICK_MS = 200;
const START_DELAY_S = 0.25;
const FIRST_FADE_S = 1;

const MP3_RATES: Record<number, readonly number[]> = {
  3: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  0: [11025, 12000, 8000],
};
const MP3_KBPS: Record<number, readonly number[]> = {
  3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};

export interface FrameInfo {
  size: number;
  rate: number;
  spf: number;
}

export function frameAt(
  bytes: Uint8Array,
  at: number,
  end: number,
): FrameInfo | null {
  if (at < 0 || at + 4 > end) return null;
  const b1 = bytes[at + 1] ?? 0;
  const b2 = bytes[at + 2] ?? 0;
  if (bytes[at] !== 0xff || (b1 & 0xe0) !== 0xe0) return null;
  const version = (b1 >> 3) & 3;
  const layer = (b1 >> 1) & 3;
  if (version === 1 || layer !== 1) return null;
  const kbps = MP3_KBPS[version === 3 ? 3 : 2]?.[b2 >> 4] ?? 0;
  const rate = MP3_RATES[version]?.[(b2 >> 2) & 3] ?? 0;
  if (!kbps || !rate) return null;
  const spf = version === 3 ? 1152 : 576;
  const size = Math.floor(((spf / 8) * kbps * 1000) / rate) + ((b2 >> 1) & 1);
  return { size, rate, spf };
}

export function tagSize(bytes: Uint8Array): number {
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return 0;
  const size =
    (((bytes[6] ?? 0) & 0x7f) << 21) |
    (((bytes[7] ?? 0) & 0x7f) << 14) |
    (((bytes[8] ?? 0) & 0x7f) << 7) |
    ((bytes[9] ?? 0) & 0x7f);
  return 10 + size + ((bytes[5] ?? 0) & 0x10 ? 10 : 0);
}

export interface Piece {
  from: number;
  to: number;
  frame: number;
  last: boolean;
}

export class Song {
  bytes = new Uint8Array(0);
  have = 0;
  total = 0;
  done = false;
  failed = false;
  starts: number[] = [];
  spf = 1152;
  rate = 44100;
  first: AudioBuffer | null = null;
  firstOffset = 0;
  private next = -1;
  private begun = false;
  private decodingFirst = false;
  private controller: AbortController | null = null;
  private listeners = new Set<() => void>();

  constructor(readonly track: Track) {}

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private wake() {
    this.listeners.forEach((fn) => fn());
    this.decodeFirst();
  }

  load(): void {
    if (this.begun) return;
    this.begun = true;
    if (typeof fetch !== "function") {
      this.fail();
      return;
    }
    this.controller =
      typeof AbortController === "function" ? new AbortController() : null;
    void fetch(this.track.file, { signal: this.controller?.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        this.total = Number(res.headers.get("content-length")) || 0;
        this.bytes = new Uint8Array(this.total > 0 ? this.total : 1 << 20);
        if (!res.body) {
          this.append(new Uint8Array(await res.arrayBuffer()));
        } else {
          const reader = res.body.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) this.append(value);
          }
        }
        this.done = true;
        this.total = this.have;
        this.wake();
      })
      .catch(() => this.fail());
  }

  abort(): void {
    this.controller?.abort();
  }

  private fail() {
    if (this.done) return;
    this.failed = true;
    this.wake();
  }

  append(chunk: Uint8Array): void {
    if (this.have + chunk.byteLength > this.bytes.length) {
      const grown = new Uint8Array(
        Math.max(this.bytes.length * 2, this.have + chunk.byteLength),
      );
      grown.set(this.bytes.subarray(0, this.have));
      this.bytes = grown;
    }
    this.bytes.set(chunk, this.have);
    this.have += chunk.byteLength;
    this.parse();
    this.wake();
  }

  private parse() {
    if (this.next < 0) {
      if (this.have < 10) return;
      this.next = tagSize(this.bytes);
    }
    for (;;) {
      if (this.next + 4 > this.have) return;
      const frame = frameAt(this.bytes, this.next, this.have);
      if (!frame) {
        this.next += 1;
        continue;
      }
      if (!this.starts.length) {
        this.rate = frame.rate;
        this.spf = frame.spf;
      }
      this.starts.push(this.next);
      this.next += frame.size;
    }
  }

  private index(at: number): number {
    let lo = 0;
    let hi = this.starts.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((this.starts[mid] ?? 0) < at) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  grid(): number {
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    const period = this.rate / gcd(this.rate, DECODE_RATE);
    return period / gcd(period, this.spf);
  }

  piece(k: number): Piece | null {
    const begin = this.index(k * SEG_BYTES);
    if (this.starts.length < 2 || begin >= this.starts.length) return null;
    const lap = Math.ceil((OVERLAP_S * this.rate) / this.spf);
    const step = this.grid();
    const frame =
      k === 0 ? 1 : 1 + Math.floor(Math.max(0, begin - lap - 1) / step) * step;
    const from = this.starts[frame] ?? 0;
    const cut = (k + 1) * SEG_BYTES;
    if (k > 0 && this.total && k * SEG_BYTES + SEG_BYTES / 2 >= this.total)
      return null;
    if (!this.total && this.have < cut + SEG_BYTES) return null;
    if (this.total && cut + SEG_BYTES / 2 >= this.total) {
      return this.done ? { from, to: this.have, frame, last: true } : null;
    }
    const end = this.index(cut);
    const to = this.starts[end];
    if (to === undefined || this.have < to) return null;
    return { from, to, frame, last: false };
  }

  seconds(frame: number): number {
    return (frame * this.spf) / this.rate;
  }

  slice(p: Piece): ArrayBuffer {
    return this.bytes.slice(p.from, p.to).buffer;
  }

  private decodeFirst() {
    if (this.first || this.decodingFirst) return;
    const p = this.piece(0);
    if (!p) return;
    this.decodingFirst = true;
    void decode(this.slice(p))
      .then((buffer) => {
        this.first = buffer;
        this.firstOffset = leadIn(buffer.getChannelData(0), buffer.sampleRate);
        this.listeners.forEach((fn) => fn());
      })
      .catch(() => {
        this.decodingFirst = false;
        this.failed = true;
        this.listeners.forEach((fn) => fn());
      });
  }
}

const songs = new Map<string, Song>();

function songFor(track: Track): Song {
  let song = songs.get(track.id);
  if (!song) {
    song = new Song(track);
    songs.set(track.id, song);
  }
  return song;
}

export function resetSongsForTest(): void {
  songs.forEach((s) => s.abort());
  songs.clear();
  offline = null;
}

function offlineContextClass(): OfflineCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    OfflineAudioContext?: OfflineCtor;
    webkitOfflineAudioContext?: OfflineCtor;
  };
  return w.OfflineAudioContext ?? w.webkitOfflineAudioContext ?? null;
}

let offline: OfflineAudioContext | null = null;

function decode(bytes: ArrayBuffer): Promise<AudioBuffer> {
  const Offline = offlineContextClass();
  if (!Offline) return Promise.reject(new Error("no decoder"));
  offline ??= new Offline(2, 1, DECODE_RATE);
  const ctx = offline;
  return new Promise((resolve, reject) => {
    const done = ctx.decodeAudioData(bytes, resolve, reject) as
      Promise<AudioBuffer> | undefined;
    done?.then(resolve, reject);
  });
}

export function leadIn(samples: Float32Array, rate: number): number {
  const limit = Math.min(samples.length, Math.round(rate * 2));
  for (let i = 0; i < limit; i++)
    if (Math.abs(samples[i] ?? 0) > 0.0005)
      return Math.max(0, i / rate - 0.004);
  return 0;
}

export function matchAt(
  before: Float32Array,
  after: Float32Array,
  guess: number,
  rate: number,
): number | null {
  const q = Math.round(rate * 0.8);
  if (after.length < q + PROBE) return null;
  const lo = Math.max(-q, guess - SEARCH);
  const hi = Math.min(before.length - q - PROBE, guess + SEARCH);
  if (hi < lo) return null;
  const D = 4;
  const n = PROBE / D;
  const probe = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < D; j++) s += after[q + i * D + j] ?? 0;
    probe[i] = s;
  }
  let pp = 0;
  for (const v of probe) pp += v * v;
  if (pp < 1e-9) return null;
  const span = Math.floor((hi - lo) / D) + n + 1;
  const region = new Float32Array(span);
  for (let i = 0; i < span; i++) {
    let s = 0;
    for (let j = 0; j < D; j++) s += before[q + lo + i * D + j] ?? 0;
    region[i] = s;
  }
  let best = -1;
  let at = lo;
  let rr = 0;
  for (let i = 0; i < n; i++) rr += (region[i] ?? 0) ** 2;
  for (let c = 0; c + n <= span; c++) {
    if (c > 0) {
      rr += (region[c + n - 1] ?? 0) ** 2 - (region[c - 1] ?? 0) ** 2;
    }
    let s = 0;
    for (let i = 0; i < n; i++) s += (probe[i] ?? 0) * (region[c + i] ?? 0);
    const score = rr > 1e-12 ? s / Math.sqrt(pp * rr) : 0;
    if (score > best) {
      best = score;
      at = lo + c * D;
    }
  }
  if (best < 0.9) return null;
  let fine = at;
  let fineScore = -1;
  for (let shift = at - D - 2; shift <= at + D + 2; shift++) {
    if (shift < lo || shift > hi) continue;
    let s = 0;
    let a = 0;
    let b = 0;
    for (let i = 0; i < PROBE; i++) {
      const x = after[q + i] ?? 0;
      const y = before[q + shift + i] ?? 0;
      s += x * y;
      a += x * x;
      b += y * y;
    }
    const score = a > 0 && b > 0 ? s / Math.sqrt(a * b) : 0;
    if (score > fineScore) {
      fineScore = score;
      fine = shift;
    }
  }
  return fineScore >= 0.98 ? fine : null;
}

function audioContextClass(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: Ctor;
    webkitAudioContext?: Ctor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

interface Seg {
  k: number;
  buffer: AudioBuffer;
  at: number;
  frame: number;
  last: boolean;
}

interface Voice {
  seg: Seg;
  src: AudioBufferSourceNode;
  gain: GainNode;
}

interface Chain {
  gain: GainNode;
  zero: number;
  voices: Voice[];
  tail: Voice | null;
  ending: boolean;
  starved: number | null;
}

class Engine {
  readonly ctx: AudioContext | null = null;
  readonly analyser: AnalyserNode | null = null;
  private master: GainNode | null = null;
  private wantPlaying = false;
  private hidden = false;
  private song: Song | null = null;
  private offSong: (() => void) | null = null;
  private segs = new Map<number, Seg>();
  private places = new Map<number, number>();
  private drift = new Map<number, number>();
  private decoding = new Set<number>();
  private misses = 0;
  private chain: Chain | null = null;
  private tick = 0;
  private plain: HTMLAudioElement | null = null;

  constructor() {
    const Ctx = audioContextClass();
    try {
      if (Ctx) {
        let ctx: AudioContext;
        try {
          ctx = new Ctx({ sampleRate: DECODE_RATE });
        } catch {
          ctx = new Ctx();
        }
        const master = ctx.createGain();
        master.gain.value = QUIET;
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -3;
        limiter.knee.value = 2;
        limiter.ratio.value = 12;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.2;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        master.connect(limiter).connect(analyser).connect(ctx.destination);
        ctx.addEventListener?.("statechange", notify);
        this.ctx = ctx;
        this.master = master;
        this.analyser = analyser;
      }
    } catch {
      this.ctx = null;
      this.master = null;
    }
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  get playing(): boolean {
    if (!this.wantPlaying || this.hidden) return false;
    if (this.plain) return !this.plain.paused;
    return !!this.ctx && this.ctx.state === "running";
  }

  get wanted(): boolean {
    return this.wantPlaying;
  }

  private fadeMaster(to: number, seconds: number) {
    if (!this.master || !this.ctx) return;
    const g = this.master.gain;
    const now = this.ctx.currentTime;
    const from = Math.max(QUIET, g.value);
    const target = Math.max(QUIET, to);
    g.cancelScheduledValues(now);
    g.setValueAtTime(from, now);
    if (from < FLOOR && target > FLOOR) {
      g.exponentialRampToValueAtTime(FLOOR, now + seconds * 0.15);
    } else if (from > FLOOR && target < FLOOR) {
      g.exponentialRampToValueAtTime(FLOOR, now + seconds * 0.85);
    }
    g.exponentialRampToValueAtTime(target, now + seconds);
  }

  private attack() {
    this.fadeMaster(1, FADE_IN_S);
  }

  private swell(at: number) {
    if (!this.master || !this.ctx) return;
    const g = this.master.gain;
    const now = this.ctx.currentTime;
    const t = Math.max(now, at);
    g.cancelScheduledValues(now);
    g.setValueAtTime(QUIET, now);
    g.setValueAtTime(QUIET, t);
    g.exponentialRampToValueAtTime(FLOOR, t + FIRST_FADE_S * 0.3);
    g.exponentialRampToValueAtTime(1, t + FIRST_FADE_S);
  }

  play() {
    this.wantPlaying = true;
    this.hidden = document.visibilityState === "hidden";
    const track = theTrack();
    if (!track) {
      void this.ctx?.resume().catch(() => undefined);
      void loadTracks().then(() => {
        if (this.wantPlaying && theTrack()) this.play();
      });
      notify();
      return;
    }
    if (!this.ctx || !offlineContextClass()) {
      this.playPlain(track);
      return;
    }
    void this.ctx.resume().catch(() => undefined);
    this.attach(track);
    this.attack();
    this.pump();
    if (!this.tick) this.tick = window.setInterval(this.pump, TICK_MS);
    notify();
  }

  private playPlain(track: Track) {
    if (!this.plain) {
      const el = new Audio();
      el.loop = true;
      el.preload = "auto";
      el.src = track.file;
      el.addEventListener("playing", notify);
      el.addEventListener("pause", notify);
      if (this.ctx && this.master) {
        try {
          const source = this.ctx.createMediaElementSource(el);
          const gain = this.ctx.createGain();
          gain.gain.value = this.gainFor(track);
          source.connect(gain).connect(this.master);
          void this.ctx.resume().catch(() => undefined);
          this.attack();
        } catch {
          el.volume = Math.min(1, this.gainFor(track));
        }
      } else {
        el.volume = Math.min(1, this.gainFor(track));
      }
      this.plain = el;
    } else if (this.ctx) {
      void this.ctx.resume().catch(() => undefined);
      this.attack();
    }
    const el = this.plain;
    void el.play().then(notify, (error: unknown) => {
      notify();
      if ((error as { name?: string } | null)?.name === "AbortError") return;
      if (this.wantPlaying && el.paused) {
        this.wantPlaying = false;
        this.fadeMaster(QUIET, 0.3);
        notify();
      }
    });
    notify();
  }

  private attach(track: Track) {
    if (this.song?.track.id === track.id) return;
    this.offSong?.();
    const song = songFor(track);
    this.song = song;
    this.offSong = song.subscribe(() => {
      if (song.failed && !song.first && this.wantPlaying) this.giveUp();
      else this.pump();
    });
    song.load();
  }

  private giveUp() {
    const track = this.song?.track;
    this.stopChain();
    if (track && this.wantPlaying) this.playPlain(track);
  }

  private gainFor(track: Track) {
    return this.master ? trackGain(track) : Math.min(1, trackGain(track));
  }

  private want(k: number) {
    const song = this.song;
    if (!song || this.segs.has(k) || this.decoding.has(k)) return;
    if (k === 0) {
      if (song.first)
        this.place(0, song.first, { from: 0, to: 0, frame: 1, last: false });
      return;
    }
    const p = song.piece(k);
    if (!p) return;
    this.decoding.add(k);
    void decode(song.slice(p))
      .then((buffer) => {
        this.decoding.delete(k);
        if (this.song === song) this.place(k, buffer, p);
        this.pump();
      })
      .catch(() => {
        this.decoding.delete(k);
        this.misses += 1;
        if (this.misses > 2) this.giveUp();
      });
  }

  private place(k: number, buffer: AudioBuffer, p: Piece) {
    const song = this.song;
    if (!song) return;
    if (k === 0) {
      this.segs.set(0, { k, buffer, at: 0, frame: p.frame, last: false });
      return;
    }
    let at = this.places.get(k);
    if (at === undefined) {
      const before = this.segs.get(k - 1);
      if (!before) return;
      const rate = buffer.sampleRate;
      const plain = Math.round(
        (song.seconds(p.frame) - song.seconds(before.frame)) * rate,
      );
      const learned = k >= 3 ? (this.drift.get(k - 1) ?? 0) : 0;
      const guess = plain + learned;
      const found = matchAt(
        before.buffer.getChannelData(0),
        buffer.getChannelData(0),
        guess,
        rate,
      );
      const shift = found ?? guess;
      if (k >= 2) this.drift.set(k, shift - plain);
      at = this.grid(before.at + shift / rate);
      this.places.set(k, at);
    }
    this.segs.set(k, { k, buffer, at, frame: p.frame, last: p.last });
  }

  private grid(t: number): number {
    const rate = this.ctx?.sampleRate ?? DECODE_RATE;
    return Math.round(t * rate) / rate;
  }

  private voice(
    chain: Chain,
    seg: Seg,
    from: number,
    when: number,
    fade: number,
  ) {
    const ctx = this.ctx;
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = seg.buffer;
    const gain = ctx.createGain();
    gain.gain.value = fade > 0 ? 0 : 1;
    src.connect(gain).connect(chain.gain);
    gain.gain.setValueAtTime(fade > 0 ? 0 : 1, when);
    if (fade > 0) gain.gain.linearRampToValueAtTime(1, when + fade);
    const v: Voice = { seg, src, gain };
    src.onended = () => {
      src.disconnect();
      gain.disconnect();
      chain.voices = chain.voices.filter((x) => x !== v);
      if (chain.ending && !chain.voices.length) chain.gain.disconnect();
    };
    src.start(when, Math.max(0, from - seg.at));
    chain.voices.push(v);
    chain.tail = v;
  }

  private newChain(level: number, zero: number): Chain | null {
    if (!this.ctx || !this.master) return null;
    const gain = this.ctx.createGain();
    gain.gain.value = level;
    gain.connect(this.master);
    return { gain, zero, voices: [], tail: null, ending: false, starved: null };
  }

  private pump = () => {
    const ctx = this.ctx;
    const song = this.song;
    if (!ctx || !song || this.plain) return;
    this.want(0);
    if (!this.wantPlaying) return;
    const now = ctx.currentTime;
    const level = this.gainFor(song.track);
    if (!this.chain) {
      const first = this.segs.get(0);
      if (!first) return;
      const when = this.grid(now + START_DELAY_S);
      const from = song.firstOffset;
      const chain = this.newChain(level, when - from);
      if (!chain) return;
      this.chain = chain;
      this.voice(chain, first, from, when, 0);
      this.swell(when);
      notify();
      return;
    }
    const chain = this.chain;
    const last = chain.tail;
    if (!last) return;
    const seg = last.seg;
    const end = seg.at + seg.buffer.duration;
    if (seg.last) {
      if (chain.ending) return;
      const t = this.grid(
        Math.max(now + 0.05, chain.zero + end - LOOP_XFADE_S),
      );
      if (t - now > AHEAD_S) return;
      const first = this.segs.get(0);
      if (!first) return;
      this.loop(chain, first, t, level);
      return;
    }
    const next = this.segs.get(seg.k + 1);
    if (!next) {
      if (chain.zero + end - now < AHEAD_S) this.want(seg.k + 1);
      if (chain.starved === null && chain.zero + end - now < 0.35)
        this.starve(
          chain,
          last,
          Math.max(now + 0.02, chain.zero + end - STARVE_S - 0.03),
        );
      return;
    }
    if (chain.starved !== null) {
      const from = this.grid(Math.max(next.at, chain.starved - 0.05));
      const when = this.grid(now + 0.06);
      chain.zero = when - from;
      chain.starved = null;
      this.voice(chain, next, from, when, STARVE_S);
      this.settle(next);
      return;
    }
    let j = next.at + JOIN_AT_S;
    if (chain.zero + j - now > AHEAD_S) return;
    j = this.grid(Math.max(j, now + 0.05 - chain.zero));
    if (j + JOIN_S > end - 0.03) {
      this.starve(chain, last, now + 0.02);
      return;
    }
    const t = chain.zero + j;
    const g = last.gain.gain;
    g.setValueAtTime(1, t);
    g.linearRampToValueAtTime(0, t + JOIN_S);
    last.src.stop(t + JOIN_S + 0.02);
    this.voice(chain, next, j, t, JOIN_S);
    this.settle(next);
  };

  private starve(chain: Chain, last: Voice, t: number) {
    const g = last.gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(1, t);
    g.linearRampToValueAtTime(0, t + STARVE_S);
    last.src.stop(t + STARVE_S + 0.02);
    chain.starved = t - chain.zero;
  }

  private settle(seg: Seg) {
    for (const k of [...this.segs.keys()])
      if (k !== 0 && k < seg.k) this.segs.delete(k);
  }

  private loop(chain: Chain, first: Seg, t: number, level: number) {
    chain.ending = true;
    const g = chain.gain.gain;
    g.setValueAtTime(level, t);
    g.linearRampToValueAtTime(0, t + LOOP_XFADE_S);
    chain.tail?.src.stop(t + LOOP_XFADE_S + 0.05);
    const fresh = this.newChain(0, t);
    if (!fresh) return;
    fresh.gain.gain.setValueAtTime(0, t);
    fresh.gain.gain.linearRampToValueAtTime(level, t + LOOP_XFADE_S);
    this.chain = fresh;
    this.voice(fresh, first, 0, t, 0);
    for (const k of [...this.segs.keys()]) if (k > 0) this.segs.delete(k);
  }

  private stopChain() {
    const chain = this.chain;
    this.chain = null;
    if (!chain) return;
    for (const v of chain.voices) {
      try {
        v.src.stop();
      } catch {
        v.src.disconnect();
      }
    }
    chain.gain.disconnect();
  }

  pause() {
    this.wantPlaying = false;
    if (this.plain && !this.master) this.plain.pause();
    else this.fadeMaster(QUIET, FADE_OUT_S);
    window.setTimeout(
      () => {
        if (this.wantPlaying) return;
        this.plain?.pause();
        void this.ctx?.suspend().catch(() => undefined);
        notify();
      },
      FADE_OUT_S * 1000 + 60,
    );
    notify();
  }

  soundOut(): { ctx: AudioContext; out: AudioNode } | null {
    if (
      !this.ctx ||
      !this.master ||
      !this.wantPlaying ||
      this.hidden ||
      this.ctx.state !== "running"
    )
      return null;
    return { ctx: this.ctx, out: this.master };
  }

  measure(): number {
    if (!this.analyser) return 0;
    const buf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    return Math.sqrt(sum / buf.length);
  }

  private onVisibility = () => {
    this.hidden = document.visibilityState === "hidden";
    if (!this.wantPlaying) return;
    if (this.hidden) {
      if (this.plain && !this.master) this.plain.pause();
      else this.fadeMaster(QUIET, FADE_OUT_S);
      window.setTimeout(
        () => {
          if (!this.hidden) return;
          this.plain?.pause();
          void this.ctx?.suspend().catch(() => undefined);
          notify();
        },
        FADE_OUT_S * 1000 + 100,
      );
    } else {
      void this.ctx?.resume().catch(() => undefined);
      if (this.plain) void this.plain.play().catch(() => undefined);
      this.fadeMaster(1, 1.2);
      this.pump();
    }
    notify();
  };

  dispose() {
    this.wantPlaying = false;
    window.clearInterval(this.tick);
    this.offSong?.();
    this.stopChain();
    if (this.plain) {
      this.plain.pause();
      this.plain.removeAttribute("src");
    }
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.ctx?.removeEventListener?.("statechange", notify);
    void this.ctx?.close().catch(() => undefined);
  }
}

let engine: Engine | null = null;
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

function ensureEngine(): Engine | null {
  if (engine) return engine;
  try {
    engine = new Engine();
  } catch {
    engine = null;
  }
  return engine;
}

export function prepare(): void {
  void loadTracks();
}

export function warm(): void {
  if (isMuted()) return;
  void loadTracks().then(() => {
    const track = theTrack();
    if (track && offlineContextClass()) songFor(track).load();
  });
}

export function start(): void {
  if (isMuted() || engine?.wanted) return;
  ensureEngine()?.play();
}

export function stop(): void {
  engine?.dispose();
  engine = null;
  notify();
}

export function setMuted(muted: boolean): void {
  memoryMuted = muted;
  write(MUTE_KEY, JSON.stringify({ muted }));
  if (muted) engine?.pause();
  else ensureEngine()?.play();
  notify();
}

export function isPlaying(): boolean {
  return engine?.playing ?? false;
}

export function audioContext(): AudioContext | null {
  return engine?.ctx ?? null;
}

export function soundOut(): { ctx: AudioContext; out: AudioNode } | null {
  if (isMuted()) return null;
  return engine?.soundOut() ?? null;
}

export function level(): number {
  return engine?.measure() ?? 0;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
