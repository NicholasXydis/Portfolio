import { describe, expect, it } from "vitest";
import { layoutFor } from "./useLayout";

describe("layoutFor", () => {
  it("treats every short landscape screen as short, whatever its width", () => {
    expect(layoutFor(667, 375)).toBe("short");
    expect(layoutFor(844, 390)).toBe("short");
    expect(layoutFor(640, 360)).toBe("short");
  });

  it("keeps upright phones narrow and roomy screens wide", () => {
    expect(layoutFor(390, 844)).toBe("narrow");
    expect(layoutFor(375, 667)).toBe("narrow");
    expect(layoutFor(320, 480)).toBe("narrow");
    expect(layoutFor(1440, 900)).toBe("wide");
    expect(layoutFor(900, 700)).toBe("wide");
  });
});
