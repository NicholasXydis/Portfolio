import { afterEach, describe, expect, it } from "vitest";
import { THEME_COLOR, applyKoiTheme } from "./theme";

afterEach(() => {
  document.head.querySelector('meta[name="theme-color"]')?.remove();
});

describe("applyKoiTheme", () => {
  it("sets the browser bar colour to the active theme", () => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = THEME_COLOR.dark;
    document.head.append(meta);
    applyKoiTheme("light");
    expect(meta.content).toBe("#f6f3ec");
    applyKoiTheme("dark");
    expect(meta.content).toBe("#0a0b0d");
  });

  it("does nothing to the head when the page has no theme colour", () => {
    expect(() => applyKoiTheme("light")).not.toThrow();
  });
});
