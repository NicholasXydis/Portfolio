import { describe, expect, it } from "vitest";
import { formatDateRange, formatMonthYear } from "./dates";

describe("formatMonthYear", () => {
  it("formats an ISO date as a short month and year", () => {
    expect(formatMonthYear("2025-01-15", "en")).toMatch(/Jan.*2025/);
  });

  it("localizes the month to French", () => {
    expect(formatMonthYear("2025-02-01", "fr")).toMatch(/2025/);
    expect(formatMonthYear("2025-02-01", "fr").toLowerCase()).toContain("f");
  });
});

describe("formatDateRange", () => {
  it("joins start and end dates", () => {
    const range = formatDateRange("2024-01-01", "2025-06-01", "en", "Present");
    expect(range).toMatch(/2024/);
    expect(range).toMatch(/2025/);
    expect(range).toContain("—");
  });

  it("uses the present label when there is no end date", () => {
    const range = formatDateRange("2025-01-01", null, "en", "Present");
    expect(range).toContain("Present");
  });
});
