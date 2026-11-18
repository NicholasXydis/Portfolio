import { useSyncExternalStore } from "react";
import { isMuted, isPlaying, subscribe } from "./player";

export {
  start,
  stop,
  prepare,
  warm,
  setMuted,
  isMuted,
  isPlaying,
  level,
  subscribe,
  TRACKS_URL,
  soundOut,
} from "./player";
export {
  cardSound,
  pondSound,
  primeSounds,
  CARD_SOUND,
  POND_SOUND,
} from "./effects";
export type { Track } from "./player";

export interface MusicState {
  playing: boolean;
  muted: boolean;
}

let cache: MusicState | null = null;
function snapshot(): MusicState {
  const next: MusicState = { playing: isPlaying(), muted: isMuted() };
  if (cache && cache.playing === next.playing && cache.muted === next.muted)
    return cache;
  cache = next;
  return next;
}
const serverState: MusicState = { playing: false, muted: false };

export function useMusic(): MusicState {
  return useSyncExternalStore(subscribe, snapshot, () => serverState);
}
