import type { Place, View, World, WorldHoverDetail } from "./types";

const KEEP_MS = 10 * 60 * 1000;

export interface Kept {
  world: World;
  canvas: HTMLCanvasElement;
  view: View;
}

let kept: (Kept & { timer: number }) | null = null;

const nothing = () => {};
export const worldHandlers: {
  progress: (value: number) => void;
  pick: (place: Place) => void;
  hover: (place: Place | null, detail?: WorldHoverDetail) => void;
  event: (type: string, detail: unknown) => void;
} = { progress: nothing, pick: nothing, hover: nothing, event: nothing };

export function peekKept(): Kept | null {
  return kept;
}

export function claimKept(which: Kept | null): void {
  if (kept && kept === which) {
    window.clearTimeout(kept.timer);
    kept = null;
  }
}

export function keepWorld(
  world: World,
  canvas: HTMLCanvasElement,
  view: View,
): void {
  if (kept) {
    window.clearTimeout(kept.timer);
    if (kept.world !== world) kept.world.dispose();
  }
  canvas.remove();
  const entry = { world, canvas, view, timer: 0 };
  entry.timer = window.setTimeout(() => {
    if (kept === entry) {
      kept = null;
      world.dispose();
    }
  }, KEEP_MS);
  kept = entry;
}

export function dropKept(): void {
  if (kept) {
    window.clearTimeout(kept.timer);
    kept.world.dispose();
  }
  kept = null;
}
