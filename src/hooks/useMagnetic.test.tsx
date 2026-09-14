import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type * as framerMotion from "framer-motion";
import type { MouseEvent } from "react";
import type { MotionValue } from "framer-motion";
import { useMagnetic } from "./useMagnetic";

const reduceMotion = vi.hoisted(() => ({ current: false }));
const rawValues = vi.hoisted(() => [] as MotionValue<number>[]);

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof framerMotion>();
  return {
    ...actual,
    useReducedMotion: () => reduceMotion.current,
    useMotionValue: (initial: number) => {
      const value = actual.useMotionValue(initial);
      if (!rawValues.includes(value)) rawValues.push(value);
      return value;
    },
  };
});

function mouseEvent(clientX: number, clientY: number) {
  return { clientX, clientY } as MouseEvent<HTMLDivElement>;
}

function attachElement(ref: { current: HTMLDivElement | null }) {
  const element = document.createElement("div");
  element.getBoundingClientRect = () =>
    ({ left: 100, top: 50, width: 200, height: 100 }) as DOMRect;
  ref.current = element;
}

function renderMagnetic(strength?: number) {
  rawValues.length = 0;
  const hook = renderHook(() => useMagnetic<HTMLDivElement>(strength));
  const [x, y] = rawValues;
  if (!x || !y) throw new Error("expected useMagnetic to create motion values");
  return { ...hook, x, y };
}

describe("useMagnetic", () => {
  it("returns no handlers or style when motion is reduced", () => {
    reduceMotion.current = true;
    const { result } = renderMagnetic();

    expect(result.current.style).toBeUndefined();
    expect(result.current.onMouseMove).toBeUndefined();
    expect(result.current.onMouseLeave).toBeUndefined();
    reduceMotion.current = false;
  });

  it("offsets from the element centre scaled by strength", () => {
    reduceMotion.current = false;
    const { result, x, y } = renderMagnetic(0.5);
    attachElement(result.current.ref);

    result.current.onMouseMove?.(mouseEvent(300, 200));

    expect(x.get()).toBe(50);
    expect(y.get()).toBe(50);
  });

  it("resets the offset on mouse leave", () => {
    reduceMotion.current = false;
    const { result, x, y } = renderMagnetic();
    attachElement(result.current.ref);

    result.current.onMouseMove?.(mouseEvent(400, 300));
    result.current.onMouseLeave?.();

    expect(x.get()).toBe(0);
    expect(y.get()).toBe(0);
  });

  it("ignores pointer movement before the ref is attached", () => {
    reduceMotion.current = false;
    const { result, x } = renderMagnetic();

    expect(() =>
      result.current.onMouseMove?.(mouseEvent(10, 10)),
    ).not.toThrow();
    expect(x.get()).toBe(0);
  });

  it("exposes spring-backed style values when motion is allowed", () => {
    reduceMotion.current = false;
    const { result } = renderMagnetic();

    expect(result.current.style?.x.get()).toBe(0);
    expect(result.current.style?.y.get()).toBe(0);
  });
});
