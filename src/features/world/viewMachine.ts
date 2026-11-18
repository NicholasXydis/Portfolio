import type { View } from "./types";

export type Phase = "loading" | "ready" | "entered" | "failed";

export interface LandingState {
  phase: Phase;
  progress: number;
  view: View;
}

export type LandingAction =
  | { type: "progress"; value: number }
  | { type: "ready" }
  | { type: "fail" }
  | { type: "enter" }
  | { type: "go"; view: View }
  | { type: "escape" };

export const initialLandingState: LandingState = {
  phase: "loading",
  progress: 0,
  view: "welcome",
};

export function landingReducer(
  state: LandingState,
  action: LandingAction,
): LandingState {
  switch (action.type) {
    case "progress": {
      if (state.phase !== "loading") return state;
      const value = Math.min(1, Math.max(state.progress, action.value || 0));
      return value === state.progress ? state : { ...state, progress: value };
    }
    case "ready":
      return state.phase === "loading"
        ? { ...state, phase: "ready", progress: 1 }
        : state;
    case "fail":
      return state.phase === "entered" ? state : { ...state, phase: "failed" };
    case "enter":
      return state.phase === "ready"
        ? { ...state, phase: "entered", view: "welcome" }
        : state;
    case "go":
      if (state.phase !== "entered" || state.view === action.view) return state;
      return { ...state, view: action.view };
    case "escape":
      if (state.phase !== "entered" || state.view === "explore") return state;
      return { ...state, view: "explore" };
    default:
      return state;
  }
}
