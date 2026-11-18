import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  KOI_THEME_KEY,
  firstTheme,
  resetThemeForTest,
  useKoiTheme,
} from "./theme";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

function newVisit() {
  for (const name of ["localStorage", "sessionStorage"] as const)
    Object.defineProperty(window, name, {
      configurable: true,
      value: memoryStorage(),
    });
  resetThemeForTest();
  document.documentElement.classList.remove("light", "dark");
}

beforeEach(newVisit);

describe("every visit starts at night", () => {
  it("opens at night with nothing chosen", () => {
    expect(firstTheme()).toBe("dark");
    const { result } = renderHook(() => useKoiTheme());
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("ignores a day choice kept from an earlier visit", () => {
    window.localStorage.setItem(KOI_THEME_KEY, "light");
    expect(firstTheme()).toBe("dark");
    const { result } = renderHook(() => useKoiTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("keeps a day choice for the rest of the tab session, on every page", () => {
    const world = renderHook(() => useKoiTheme());
    act(() => world.result.current.setTheme("light", { transition: "none" }));
    expect(window.sessionStorage.getItem(KOI_THEME_KEY)).toBe("light");
    expect(window.localStorage.getItem(KOI_THEME_KEY)).toBeNull();
    expect(firstTheme()).toBe("light");
    const flat = renderHook(() => useKoiTheme());
    expect(flat.result.current.theme).toBe("light");
    expect(document.documentElement).toHaveClass("light");
  });

  it("starts at night again on the next visit", () => {
    const { result } = renderHook(() => useKoiTheme());
    act(() => result.current.setTheme("light", { transition: "none" }));
    newVisit();
    expect(firstTheme()).toBe("dark");
    expect(renderHook(() => useKoiTheme()).result.current.theme).toBe("dark");
  });

  it("returns to night when the visitor chooses it", () => {
    window.sessionStorage.setItem(KOI_THEME_KEY, "light");
    const { result } = renderHook(() => useKoiTheme());
    expect(result.current.theme).toBe("light");
    act(() => result.current.setTheme("dark", { transition: "none" }));
    expect(result.current.theme).toBe("dark");
    expect(window.sessionStorage.getItem(KOI_THEME_KEY)).toBe("dark");
  });
});
