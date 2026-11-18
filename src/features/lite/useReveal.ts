import { useLayoutEffect, type RefObject } from "react";
import { prefersReducedMotion } from "./sections";

export function useReveal(rootRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      targets.forEach((target) => showReveal(target));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          showReveal(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0 },
    );
    root.dataset.revealReady = "true";
    const hashTarget = hashElement();
    if (hashTarget) revealWithin(hashTarget, true);
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [rootRef]);
}

function showReveal(element: HTMLElement, instant = false) {
  if (instant) element.dataset.instant = "true";
  element.dataset.visible = "true";
}

export function revealWithin(element: HTMLElement, instant = false) {
  element
    .querySelectorAll<HTMLElement>("[data-reveal]")
    .forEach((target) => showReveal(target, instant));
  const owner = element.closest<HTMLElement>("[data-reveal]");
  if (owner) showReveal(owner, instant);
}

function hashElement(): HTMLElement | null {
  const id = window.location.hash.slice(1);
  if (!id) return null;
  try {
    return document.getElementById(decodeURIComponent(id));
  } catch {
    return null;
  }
}
