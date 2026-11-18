import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHinter } from "./hinter";
import { MOON_PHASES, moonPhaseName } from "./moon";
import { getVisited, markVisited, resetVisitedForTest } from "./visited";

describe("tonight's moon", () => {
  it("names the eight phases, each sector centred on its phase", () => {
    const at = (p: number) => moonPhaseName(p);
    MOON_PHASES.forEach((name, i) => expect(at(i / 8)).toBe(name));
    expect(at(1 / 16 - 1e-6)).toBe("new");
    expect(at(1 / 16)).toBe("waxingCrescent");
    expect(at(3 / 16 - 1e-6)).toBe("waxingCrescent");
    expect(at(3 / 16)).toBe("firstQuarter");
    expect(at(5 / 16)).toBe("waxingGibbous");
    expect(at(7 / 16 - 1e-6)).toBe("waxingGibbous");
    expect(at(7 / 16)).toBe("full");
    expect(at(9 / 16)).toBe("waningGibbous");
    expect(at(11 / 16)).toBe("lastQuarter");
    expect(at(13 / 16)).toBe("waningCrescent");
    expect(at(15 / 16 - 1e-6)).toBe("waningCrescent");
    expect(at(15 / 16)).toBe("new");
    expect(at(1)).toBe("new");
    expect(at(0.999)).toBe("new");
  });

  it("says nothing rather than something wrong", () => {
    expect(moonPhaseName(Number.NaN)).toBeNull();
    expect(moonPhaseName(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("visited places", () => {
  beforeEach(() => resetVisitedForTest());

  it("remembers each opened place once, in the site's order", () => {
    expect(getVisited()).toEqual([]);
    markVisited("projects");
    markVisited("about");
    markVisited("projects");
    expect(getVisited()).toEqual(["about", "projects"]);
  });

  it("keeps a stable list between changes (for React)", () => {
    markVisited("education");
    expect(getVisited()).toBe(getVisited());
  });
});

describe("hints from the host's cards", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("sends only where the pointer settles when it sweeps across the cards", () => {
    const send = vi.fn();
    const h = createHinter(send, 140);
    h.hint("about");
    vi.advanceTimersByTime(40);
    h.hint(null);
    h.hint("education");
    vi.advanceTimersByTime(40);
    h.hint(null);
    h.hint("experience");
    vi.advanceTimersByTime(200);
    expect(send.mock.calls).toEqual([["experience"]]);
  });

  it("never flashes nothing between two cards, and clears after a real leave", () => {
    const send = vi.fn();
    const h = createHinter(send, 140);
    h.hint("about");
    vi.advanceTimersByTime(200);
    h.hint(null);
    vi.advanceTimersByTime(60);
    h.hint("projects");
    vi.advanceTimersByTime(200);
    h.hint(null);
    vi.advanceTimersByTime(200);
    expect(send.mock.calls).toEqual([["about"], ["projects"], [null]]);
  });

  it("clears at once when the question goes", () => {
    const send = vi.fn();
    const h = createHinter(send, 140);
    h.hint("about");
    vi.advanceTimersByTime(200);
    h.clear();
    expect(send).toHaveBeenLastCalledWith(null);
  });
});
