import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { printConsoleGreeting } from "./consoleGreeting";

describe("printConsoleGreeting", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    window.history.pushState({}, "", "/");
  });

  it("logs the English greeting by default", () => {
    window.history.pushState({}, "", "/en");
    printConsoleGreeting();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0]?.[0]).toContain("DEVELOPER CONSOLE");
  });

  it("logs the French greeting when the path starts with /fr", () => {
    window.history.pushState({}, "", "/fr/projects/banklite");
    printConsoleGreeting();
    expect(logSpy.mock.calls[0]?.[0]).toContain("CONSOLE DE DÉVELOPPEMENT");
  });

  it("does not match French for paths that merely contain fr elsewhere", () => {
    window.history.pushState({}, "", "/en/francophone");
    printConsoleGreeting();
    expect(logSpy.mock.calls[0]?.[0]).toContain("DEVELOPER CONSOLE");
  });
});
