import { describe, expect, it } from "vitest";
import { readTappable, worldCursor } from "./cursor";

describe("readTappable", () => {
  it("treats a place, a named thing or a tappable flag as tappable", () => {
    expect(readTappable("about")).toBe(true);
    expect(readTappable(null, { name: "lantern" })).toBe(true);
    expect(readTappable(null, { tappable: true })).toBe(true);
    expect(readTappable(null, { tappable: false, name: null })).toBe(false);
    expect(readTappable(null, { tappable: false, name: "lantern" })).toBe(
      false,
    );
    expect(readTappable(null, "frog")).toBe(true);
    expect(readTappable(null, null)).toBe(false);
    expect(readTappable(null)).toBe(false);
  });
});

describe("worldCursor", () => {
  it("is the arrow outside explore and the open hand in explore", () => {
    expect(
      worldCursor({ tappable: false, dragging: false, explore: false }),
    ).toBeNull();
    expect(
      worldCursor({ tappable: false, dragging: false, explore: true }),
    ).toBe("grab");
  });

  it("points over anything tappable", () => {
    expect(
      worldCursor({ tappable: true, dragging: false, explore: false }),
    ).toBe("hand");
    expect(
      worldCursor({ tappable: true, dragging: false, explore: true }),
    ).toBe("hand");
  });

  it("closes the hand while orbiting in explore, even over a tappable thing", () => {
    expect(worldCursor({ tappable: true, dragging: true, explore: true })).toBe(
      "grabbing",
    );
    expect(
      worldCursor({ tappable: false, dragging: true, explore: false }),
    ).toBeNull();
  });
});
