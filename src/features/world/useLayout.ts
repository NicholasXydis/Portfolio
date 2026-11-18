import { useSyncExternalStore } from "react";

export type Layout = "wide" | "narrow" | "short";

const PANEL_BREAKPOINT = 760;
const SHORT_HEIGHT = 500;

export function layoutFor(width: number, height: number): Layout {
  if (height < SHORT_HEIGHT && width > height) return "short";
  if (width < PANEL_BREAKPOINT) return "narrow";
  return "wide";
}

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

export function useLayout(): Layout {
  return useSyncExternalStore(
    subscribe,
    () => layoutFor(window.innerWidth, window.innerHeight),
    () => "wide",
  );
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
