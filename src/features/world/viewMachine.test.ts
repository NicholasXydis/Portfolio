import { describe, expect, it } from "vitest";
import {
  initialLandingState,
  landingReducer,
  type LandingState,
} from "./viewMachine";
import { VIEWS } from "./types";

const entered: LandingState = {
  phase: "entered",
  progress: 1,
  view: "welcome",
};

describe("landingReducer", () => {
  it("starts loading on the welcome view", () => {
    expect(initialLandingState).toEqual({
      phase: "loading",
      progress: 0,
      view: "welcome",
    });
  });

  it("only lets progress go forward, clamped to 1", () => {
    let s = landingReducer(initialLandingState, {
      type: "progress",
      value: 0.4,
    });
    s = landingReducer(s, { type: "progress", value: 0.2 });
    expect(s.progress).toBe(0.4);
    s = landingReducer(s, { type: "progress", value: 7 });
    expect(s.progress).toBe(1);
  });

  it("ignores views, Escape and Enter before the world is ready", () => {
    let s = landingReducer(initialLandingState, {
      type: "go",
      view: "projects",
    });
    s = landingReducer(s, { type: "escape" });
    s = landingReducer(s, { type: "enter" });
    expect(s).toEqual(initialLandingState);
  });

  it("goes loading -> ready -> entered on the welcome view", () => {
    let s = landingReducer(initialLandingState, { type: "ready" });
    expect(s).toMatchObject({ phase: "ready", progress: 1 });
    s = landingReducer(s, { type: "enter" });
    expect(s).toMatchObject({ phase: "entered", view: "welcome" });
  });

  it("reaches each of the six views once entered", () => {
    for (const view of VIEWS) {
      const from: LandingState = {
        ...entered,
        view: view === "explore" ? "welcome" : "explore",
      };
      expect(landingReducer(from, { type: "go", view }).view).toBe(view);
    }
  });

  it("sends Escape to explore from every view", () => {
    for (const view of VIEWS) {
      expect(
        landingReducer({ ...entered, view }, { type: "escape" }).view,
      ).toBe("explore");
    }
  });

  it("fails while loading, never after Enter", () => {
    expect(landingReducer(initialLandingState, { type: "fail" }).phase).toBe(
      "failed",
    );
    expect(landingReducer(entered, { type: "fail" }).phase).toBe("entered");
  });
});
