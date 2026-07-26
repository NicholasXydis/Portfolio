import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

if (typeof globalThis.IntersectionObserver === "undefined") {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds = [];
    constructor(private callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.callback(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        this,
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;
}

if (typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

window.scrollTo = (() => {}) as typeof window.scrollTo;

afterEach(() => {
  cleanup();
});
