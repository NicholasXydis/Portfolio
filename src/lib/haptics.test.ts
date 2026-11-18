import { describe, expect, it, vi } from "vitest";
import { PET_BUZZ_MS, isPet, petBuzz } from "./haptics";

const device = (userAgent: string, vibrate?: (ms: number) => boolean) =>
  ({ userAgent, vibrate }) as unknown as Navigator;

describe("petBuzz", () => {
  it("gives Android phones one tiny buzz", () => {
    const vibrate = vi.fn(() => true);
    expect(
      petBuzz(device("Mozilla/5.0 (Linux; Android 14; Pixel 8)", vibrate)),
    ).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(PET_BUZZ_MS);
    expect(PET_BUZZ_MS).toBeLessThanOrEqual(15);
  });

  it("stays still on iPhones, desktops and browsers without vibration", () => {
    const vibrate = vi.fn(() => true);
    expect(
      petBuzz(device("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", vibrate)),
    ).toBe(false);
    expect(petBuzz(device("Mozilla/5.0 (Macintosh)", vibrate))).toBe(false);
    expect(petBuzz(device("Mozilla/5.0 (Linux; Android 14)"))).toBe(false);
    expect(petBuzz(undefined)).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("survives a browser that refuses", () => {
    const vibrate = vi.fn(() => {
      throw new Error("blocked");
    });
    expect(petBuzz(device("Android", vibrate))).toBe(false);
  });

  it("knows the six characters that can be petted", () => {
    for (const name of [
      "master",
      "cat_black",
      "cat_white",
      "crane",
      "rabbit",
      "magpie_cinema",
    ])
      expect(isPet(name), name).toBe(true);
    for (const name of ["pond", "koi", "moon", "chime", "tree", 3, null])
      expect(isPet(name)).toBe(false);
  });
});
