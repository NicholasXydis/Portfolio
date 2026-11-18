import { describe, expect, it } from "vitest";
import { moonPhase as worldPhase } from "@viewer/stage.js";
import { moonPhase } from "./moon";

describe("the corner and the world see the same moon", () => {
  it("agrees with the world's moon to 0.001 of a cycle for every hour of 2026 to 2028", () => {
    let worst = 0;
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2029, 0, 1); t += 3600000) {
      const a = moonPhase(new Date(t));
      const b = worldPhase(new Date(t));
      const gap = Math.abs(a - b);
      worst = Math.max(worst, Math.min(gap, 1 - gap));
    }
    expect(worst).toBeLessThanOrEqual(0.001);
  });
});
