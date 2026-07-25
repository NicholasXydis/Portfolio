import { describe, expect, it } from "vitest";
import { isLocale } from "./i18n";

describe("isLocale", () => {
  it("accepts supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(true);
  });

  it("rejects undefined", () => {
    expect(isLocale(undefined)).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isLocale("")).toBe(false);
  });

  it("rejects unsupported locale values", () => {
    expect(isLocale("de")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isLocale("EN")).toBe(false);
  });
});
