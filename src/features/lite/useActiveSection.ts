import { useCallback, useEffect, useRef, useState } from "react";

function syncHash(id: string, atTop: boolean) {
  const { pathname, search, hash } = window.location;
  const next = atTop ? "" : `#${id}`;
  if (hash === next) return;
  window.history.replaceState(
    window.history.state,
    "",
    `${pathname}${search}${next}`,
  );
}

export function useActiveSection<T extends string>(
  ids: readonly T[],
  first: T,
) {
  const [active, setActive] = useState<T>(first);
  const locked = useRef<T | null>(null);
  const scrolled = useRef(false);

  useEffect(() => {
    let frame = 0;

    const compute = () => {
      frame = 0;
      if (locked.current) {
        setActive(locked.current);
        return;
      }
      const view = window.innerHeight;
      const doc = document.documentElement;
      const remaining = doc.scrollHeight - view - window.scrollY;
      const tail = Math.min(1, Math.max(0, 1 - remaining / (view * 0.55)));
      const line = view * (0.45 + 0.55 * tail);
      let current = first;
      if (window.scrollY > 0) {
        for (const id of ids) {
          const element = document.getElementById(id);
          if (element && element.getBoundingClientRect().top <= line) {
            current = id;
          }
        }
      }
      setActive(current);
      if (scrolled.current)
        syncHash(current, current === first && window.scrollY < 40);
    };

    const onScroll = () => {
      scrolled.current = true;
      if (!frame) frame = window.requestAnimationFrame(compute);
    };
    const unlock = () => {
      locked.current = null;
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("wheel", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    window.addEventListener("pointerdown", unlock);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
    };
  }, [ids, first]);

  const lockTo = useCallback((id: T) => {
    locked.current = id;
    setActive(id);
  }, []);

  return { active, lockTo };
}
