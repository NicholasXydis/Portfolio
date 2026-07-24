import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function useScrollRestoration(): void {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef<Map<string, number>>(new Map());
  const currentKey = useRef(location.key);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const track = () =>
      positions.current.set(currentKey.current, window.scrollY);
    window.addEventListener("scroll", track, { passive: true });
    return () => window.removeEventListener("scroll", track);
  }, []);

  useLayoutEffect(() => {
    currentKey.current = location.key;

    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target)
        target.scrollIntoView({ block: "start", behavior: "instant" });
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
      return;
    }

    if (navigationType === "POP") {
      const saved = positions.current.get(location.key) ?? 0;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => window.scrollTo(0, saved)),
      );
      return;
    }

    window.scrollTo(0, 0);
  }, [location.key, location.hash, navigationType]);
}
