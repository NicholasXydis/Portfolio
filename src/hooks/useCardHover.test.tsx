import { render, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type * as framerMotion from "framer-motion";
import type { MouseEvent } from "react";
import { useCardHover } from "./useCardHover";

const reduceMotion = vi.hoisted(() => ({ current: false }));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof framerMotion>();
  return { ...actual, useReducedMotion: () => reduceMotion.current };
});

function mouseEvent(clientX: number, clientY: number) {
  return { clientX, clientY } as MouseEvent<HTMLDivElement>;
}

function attachElement(ref: { current: HTMLDivElement | null }) {
  const element = document.createElement("div");
  element.getBoundingClientRect = () =>
    ({ left: 20, top: 10, width: 300, height: 150 }) as DOMRect;
  ref.current = element;
  return element;
}

describe("useCardHover", () => {
  it("drops the glow and handlers when motion is reduced", () => {
    reduceMotion.current = true;
    const { result } = renderHook(() => useCardHover());

    expect(result.current.glow).toBeNull();
    expect(result.current.handlers.onMouseMove).toBeUndefined();
    expect(result.current.handlers.onMouseLeave).toBeUndefined();
    reduceMotion.current = false;
  });

  it("renders a decorative glow element when motion is allowed", () => {
    reduceMotion.current = false;
    const { result } = renderHook(() => useCardHover());
    const { container } = render(<>{result.current.glow}</>);

    const glow = container.querySelector("span");
    expect(glow).not.toBeNull();
    expect(glow).toHaveAttribute("aria-hidden", "true");
  });

  it("exposes handlers that survive pointer movement and leave", () => {
    reduceMotion.current = false;
    const { result } = renderHook(() => useCardHover());
    attachElement(result.current.ref);

    expect(() => {
      result.current.handlers.onMouseMove?.(mouseEvent(120, 60));
      result.current.handlers.onMouseLeave?.();
    }).not.toThrow();
  });

  it("ignores pointer movement before the ref is attached", () => {
    reduceMotion.current = false;
    const { result } = renderHook(() => useCardHover());

    expect(() =>
      result.current.handlers.onMouseMove?.(mouseEvent(5, 5)),
    ).not.toThrow();
  });
});
