import { describe, expect, it } from "vitest";
import { localizedPath, pickLocalized } from "./localized";

describe("pickLocalized", () => {
  it("returns the string for the active locale", () => {
    const text = { en: "Hello", fr: "Bonjour" };
    expect(pickLocalized(text, "en")).toBe("Hello");
    expect(pickLocalized(text, "fr")).toBe("Bonjour");
  });
});

describe("localizedPath", () => {
  it("builds a locale-prefixed root path", () => {
    expect(localizedPath("en")).toBe("/en");
    expect(localizedPath("fr")).toBe("/fr");
  });

  it("appends a sub-path without double slashes", () => {
    expect(localizedPath("en", "projects")).toBe("/en/projects");
    expect(localizedPath("fr", "/projects/banklite")).toBe(
      "/fr/projects/banklite",
    );
  });
});
