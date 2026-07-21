import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_URL, normalizeSiteUrl } from "./site";

describe("normalizeSiteUrl", () => {
  it("falls back to the default when undefined or empty", () => {
    expect(normalizeSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
    expect(normalizeSiteUrl("")).toBe(DEFAULT_SITE_URL);
  });

  it("strips trailing slashes", () => {
    expect(normalizeSiteUrl("https://example.com/")).toBe(
      "https://example.com",
    );
    expect(normalizeSiteUrl("https://example.com///")).toBe(
      "https://example.com",
    );
  });
});
