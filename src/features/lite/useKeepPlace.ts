import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface Place {
  id: string;
  element: Element | null;
  path: number[];
  top: number;
  sectionTop: number;
}

const MIN_ANCHOR = 12;

function pathFrom(root: Element, node: Element): number[] {
  const path: number[] = [];
  let current: Element | null = node;
  while (current && current !== root) {
    const parent: Element | null = current.parentElement;
    if (!parent) return [];
    path.unshift(Array.prototype.indexOf.call(parent.children, current));
    current = parent;
  }
  return current === root ? path : [];
}

function follow(root: Element, path: number[]): Element | null {
  let node: Element | null = root;
  for (const index of path) {
    node = node?.children[index] ?? null;
    if (!node) return null;
  }
  return path.length ? node : null;
}

function anchorBelowHeader(main: HTMLElement): Element | null {
  if (typeof document.elementFromPoint !== "function") return null;
  const header = document.querySelector(".koi-lite > header");
  const top = (header?.getBoundingClientRect().bottom ?? 0) + 12;
  const box = main.getBoundingClientRect();
  const limit = window.innerHeight * 0.4;
  let fallback: Element | null = null;
  for (const dy of [0, 24, 56, 96, 150]) {
    for (const fx of [0.5, 0.2, 0.75]) {
      let node = document.elementFromPoint(box.left + box.width * fx, top + dy);
      while (
        node &&
        node !== main &&
        node.getBoundingClientRect().height < MIN_ANCHOR
      ) {
        node = node.parentElement;
      }
      if (!node || node === main || !main.contains(node)) continue;
      if (node.getBoundingClientRect().height <= limit) return node;
      fallback ??= node;
    }
  }
  return fallback;
}

export function useKeepPlace(locale: string, active: string) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const activeRef = useRef(active);
  const place = useRef<Place | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const remember = () => {
      const main = document.getElementById("main-content");
      const anchor = main ? anchorBelowHeader(main) : null;
      const section = document.getElementById(activeRef.current);
      if (!anchor && !section) return;
      place.current = {
        id: activeRef.current,
        element: anchor,
        path: anchor && main ? pathFrom(main, anchor) : [],
        top: anchor?.getBoundingClientRect().top ?? 0,
        sectionTop: section?.getBoundingClientRect().top ?? 0,
      };
    };
    window.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("pointerdown", remember, {
      capture: true,
      passive: true,
    });
    window.addEventListener("keydown", remember, { capture: true });
    return () => {
      window.removeEventListener("scroll", remember);
      window.removeEventListener("pointerdown", remember, { capture: true });
      window.removeEventListener("keydown", remember, { capture: true });
    };
  }, []);

  useLayoutEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const root = document.documentElement;
    root.dataset.langSwitch = "";
    const saved = place.current;
    if (saved && window.scrollY > 0) {
      const main = document.getElementById("main-content");
      const kept = saved.element?.isConnected ? saved.element : null;
      const twin = !kept && main ? follow(main, saved.path) : null;
      const anchor = kept ?? twin;
      const element = anchor ?? document.getElementById(saved.id);
      const before = anchor ? saved.top : saved.sectionTop;
      const shift = element ? element.getBoundingClientRect().top - before : 0;
      if (element && Math.abs(shift) >= 1) {
        window.scrollTo({ top: window.scrollY + shift, behavior: "instant" });
      }
      if (twin) saved.element = twin;
    }
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        delete root.dataset.langSwitch;
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [locale, language]);

  useEffect(
    () => () => {
      delete document.documentElement.dataset.langSwitch;
    },
    [],
  );
}
