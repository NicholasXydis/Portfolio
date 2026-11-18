export type WorldCursor = "hand" | "grab" | "grabbing" | null;

export function readTappable(view: unknown, detail?: unknown): boolean {
  if (typeof view === "string" && view) return true;
  if (detail === true || (typeof detail === "string" && detail)) return true;
  if (typeof detail !== "object" || detail === null) return false;
  const info = detail as { tappable?: unknown; name?: unknown };
  if (typeof info.tappable === "boolean") return info.tappable;
  return typeof info.name === "string" && info.name.length > 0;
}

export function worldCursor(state: {
  tappable: boolean;
  dragging: boolean;
  explore: boolean;
}): WorldCursor {
  if (state.dragging && state.explore) return "grabbing";
  if (state.tappable) return "hand";
  return state.explore ? "grab" : null;
}
