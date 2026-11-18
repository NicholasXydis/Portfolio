import { describe, expect, it } from "vitest";
import { lunationTime, moonPhase, moonPhaseName } from "./moon";

const MINUTE = 60000;

const NEW_MOONS = [
  "2026-01-18T19:52Z",
  "2026-02-17T12:01Z",
  "2026-08-12T17:37Z",
  "2026-11-09T07:02Z",
  "2027-02-06T15:56Z",
  "2027-08-02T10:05Z",
];

const FULL_MOONS = [
  "2026-01-03T10:03Z",
  "2026-03-03T11:38Z",
  "2026-08-28T04:18Z",
  "2026-11-24T14:53Z",
  "2027-02-20T23:23Z",
  "2027-07-18T15:45Z",
  "2027-08-17T07:28Z",
];

function nearestLunation(at: number, offset: number) {
  const k =
    Math.round(
      (at - Date.UTC(2000, 0, 6, 18, 14)) / (29.530588853 * 86400000) - offset,
    ) + offset;
  return lunationTime(k);
}

describe("the true moon", () => {
  it("finds the 2026 and 2027 new moons within 10 minutes", () => {
    for (const iso of NEW_MOONS) {
      const at = Date.parse(iso);
      expect(Math.abs(nearestLunation(at, 0) - at), iso).toBeLessThan(
        10 * MINUTE,
      );
    }
  });

  it("finds the 2026 and 2027 full moons within 10 minutes", () => {
    for (const iso of FULL_MOONS) {
      const at = Date.parse(iso);
      expect(Math.abs(nearestLunation(at, 0.5) - at), iso).toBeLessThan(
        10 * MINUTE,
      );
    }
  });

  it("is new at the true new moon and full at the true full moon", () => {
    for (const iso of NEW_MOONS) {
      const p = moonPhase(new Date(Date.parse(iso) + 15 * MINUTE));
      expect(Math.min(p, 1 - p), iso).toBeLessThan(0.002);
    }
    for (const iso of FULL_MOONS) {
      expect(moonPhase(new Date(iso)), iso).toBeCloseTo(0.5, 2);
    }
  });

  it("is a quarter at the true quarters", () => {
    const k = Math.round(
      (Date.parse("2026-11-12T00:00Z") - Date.UTC(2000, 0, 6, 18, 14)) /
        (29.530588853 * 86400000),
    );
    expect(moonPhase(new Date(lunationTime(k + 0.25)))).toBeCloseTo(0.25, 6);
    expect(moonPhase(new Date(lunationTime(k + 0.75)))).toBeCloseTo(0.75, 6);
  });

  it("runs smoothly through every hour of 2026 to 2028, wrapping only at new moons", () => {
    let last = moonPhase(new Date(Date.UTC(2026, 0, 1)));
    let wraps = 0;
    for (
      let t = Date.UTC(2026, 0, 1, 1);
      t < Date.UTC(2029, 0, 1);
      t += 3600000
    ) {
      const p = moonPhase(new Date(t));
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
      if (p < last) {
        wraps += 1;
        expect(last - p).toBeGreaterThan(0.99);
      } else {
        expect(p - last).toBeLessThan(0.0025);
      }
      last = p;
    }
    expect(wraps).toBe(37);
  });

  it("names tonight's moon (a waxing crescent on 12 November 2026)", () => {
    expect(moonPhaseName(moonPhase(new Date("2026-11-13T01:00Z")))).toBe(
      "waxingCrescent",
    );
    expect(moonPhaseName(moonPhase(new Date("2026-11-24T14:53Z")))).toBe(
      "full",
    );
  });

  it("gives no phase for an invalid date", () => {
    expect(moonPhase(new Date(Number.NaN))).toBeNaN();
  });
});
