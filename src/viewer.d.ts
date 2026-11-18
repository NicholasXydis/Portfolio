declare module "@viewer/world.js" {
  export const createWorld: unknown;
}

declare module "@viewer/stage.js" {
  export function moonPhase(date: Date): number;
}

interface ImportMetaEnv {
  readonly VITE_WORLD_BASE?: string;
}
