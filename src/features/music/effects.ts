import { audioContext, soundOut } from "./player";

export interface CardSound {
  open: string;
  close: string;
}

export const CARD_SOUND: CardSound = {
  open: "/sounds/card-open.mp3",
  close: "/sounds/card-close.mp3",
};
export const POND_SOUND = "/sounds/water.mp3";

const GAP_S = 0.08;
const POND_GAP_S = 0.12;
const STEAL_S = 0.015;

const buffers = new Map<string, AudioBuffer>();
const loading = new Set<string>();
const lastPlayed = new Map<string, number>();
const voices = new Map<
  string,
  { src: AudioBufferSourceNode; gain: GainNode }
>();

export function primeSounds(): void {
  const ctx = audioContext();
  if (!ctx || typeof fetch !== "function") return;
  for (const file of [CARD_SOUND.open, CARD_SOUND.close, POND_SOUND]) {
    if (buffers.has(file) || loading.has(file)) continue;
    loading.add(file);
    void fetch(file)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject()))
      .then((bytes) => ctx.decodeAudioData(bytes))
      .then((buffer) => {
        buffers.set(file, buffer);
      })
      .catch(() => undefined)
      .finally(() => loading.delete(file));
  }
}

function play(file: string, group: string, gap: number): boolean {
  const out = soundOut();
  if (!out) return false;
  const buffer = buffers.get(file);
  if (!buffer) {
    primeSounds();
    return false;
  }
  const { ctx } = out;
  const now = ctx.currentTime;
  if (now - (lastPlayed.get(file) ?? -Infinity) < gap) return false;
  lastPlayed.set(file, now);
  const previous = voices.get(group);
  if (previous) {
    const level = previous.gain.gain;
    level.cancelScheduledValues(now);
    level.setValueAtTime(level.value, now);
    level.linearRampToValueAtTime(0, now + STEAL_S);
    previous.src.stop(now + STEAL_S + 0.005);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  src.connect(gain).connect(out.out);
  const voice = { src, gain };
  src.onended = () => {
    src.disconnect();
    gain.disconnect();
    if (voices.get(group) === voice) voices.delete(group);
  };
  voices.set(group, voice);
  src.start(now);
  return true;
}

export function cardSound(which: "open" | "close"): boolean {
  return play(
    which === "open" ? CARD_SOUND.open : CARD_SOUND.close,
    "card",
    GAP_S,
  );
}

export function pondSound(): boolean {
  return play(POND_SOUND, "water", POND_GAP_S);
}

export function resetSoundsForTest(): void {
  buffers.clear();
  loading.clear();
  lastPlayed.clear();
  voices.clear();
}
