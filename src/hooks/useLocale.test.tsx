import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useLocale } from "./useLocale";

function withRoute(initialRoute: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/:locale/*" element={children} />
          <Route path="*" element={children} />
        </Routes>
      </MemoryRouter>
    );
  };
}

describe("useLocale", () => {
  it("returns the locale from the URL when supported", () => {
    const { result } = renderHook(() => useLocale(), {
      wrapper: withRoute("/fr"),
    });
    expect(result.current).toBe("fr");
  });

  it("falls back to the default locale when the segment is unsupported", () => {
    const { result } = renderHook(() => useLocale(), {
      wrapper: withRoute("/de"),
    });
    expect(result.current).toBe("en");
  });

  it("falls back to the default locale when there is no locale segment", () => {
    const { result } = renderHook(() => useLocale(), {
      wrapper: withRoute("/"),
    });
    expect(result.current).toBe("en");
  });
});
