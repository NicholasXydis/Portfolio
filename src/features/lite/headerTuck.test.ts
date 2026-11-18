import { describe, expect, it } from "vitest";
import { headerTuck } from "./headerTuck";

describe("headerTuck", () => {
  it("tucks the brand row away on a short sideways screen, leaving the section nav", () => {
    expect(headerTuck(68, 12, true)).toBe(62);
    expect(headerTuck(70.4, 12, true)).toBe(64);
  });

  it("never tucks upright, on tall screens or when the nav shares the brand row", () => {
    expect(headerTuck(68, 12, false)).toBe(0);
    expect(headerTuck(16, 16, true)).toBe(0);
    expect(headerTuck(18, 16, true)).toBe(0);
    expect(headerTuck(0, 0, true)).toBe(0);
  });
});
