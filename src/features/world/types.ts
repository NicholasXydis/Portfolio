export const PLACES = ["about", "education", "experience", "projects"] as const;
export type Place = (typeof PLACES)[number];

export const VIEWS = ["welcome", "explore", ...PLACES] as const;
export type View = (typeof VIEWS)[number];

export type WorldMode = "night" | "day";

export interface WorldMarker {
  view: Place;
  x: number;
  y: number;
  visible: boolean;
  line?: number;
}

export interface WorldInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface WorldInfo {
  moonPhase: number;
  season: "spring" | "summer" | "autumn" | "winter";
  triangles: number;
  tier?: number;
}

export interface WorldHoverDetail {
  tappable?: boolean;
  name?: string | null;
}

export type WorldEventType =
  "glide" | "pick" | "chessMove" | "koiLeap" | "chime" | "secret";

export interface WorldOptions {
  id: string;
  base: string;
  mode: WorldMode;
  reducedMotion: boolean;
  date: Date | null;
  allowSoftware?: boolean;
  onProgress?: (fraction: number) => void;
  onPick?: (view: Place) => void;
  onHover?: (view: Place | null, detail?: WorldHoverDetail) => void;
  onEvent?: (type: WorldEventType | (string & {}), detail: unknown) => void;
}

export interface World {
  setView(view: View): void;
  setMode(mode: WorldMode): Promise<void>;
  resize(insets?: WorldInsets): void;
  setInsets?(insets: WorldInsets): void;
  markers(): WorldMarker[];
  onFrame(fn: () => void): () => void;
  showSlide?(id: string | null): void;
  intro?(): Promise<void>;
  hint?(view: Place | null): void;
  greet?(): Promise<void>;
  entered?(): void;
  readonly info: WorldInfo;
  dispose(): void;
}

export type CreateWorld = (
  canvas: HTMLCanvasElement,
  options: WorldOptions,
) => Promise<World>;

export function isPlace(view: View | null | undefined): view is Place {
  return (PLACES as readonly string[]).includes(view ?? "");
}
