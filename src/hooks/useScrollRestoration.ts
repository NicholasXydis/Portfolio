import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router";
import { SUPPORTED_LOCALES } from "@/lib/i18n";

const LOCALE_PREFIX = new RegExp(`^/(${SUPPORTED_LOCALES.join("|")})(?=/|$)`);

export function useScrollRestoration(): void {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef<Map<string, number>>(new Map());
  const currentKey = useRef(location.key);
  const currentPlace = useRef<{ path: string; place: string } | null>(null);

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
    const previousKey = currentKey.current;
    currentKey.current = location.key;
    const place = `${location.pathname.replace(LOCALE_PREFIX, "")}${location.search}${location.hash}`;
    const previous = currentPlace.current;
    currentPlace.current = { path: location.pathname, place };

    if (
      navigationType !== "POP" &&
      previousKey !== location.key &&
      previous?.path !== location.pathname &&
      previous?.place === place
    ) {
      positions.current.set(location.key, window.scrollY);
      return undefined;
    }

    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      let tries = 0;
      let frame = 0;
      const land = () => {
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ block: "start", behavior: "instant" });
          return;
        }
        if (tries++ < 60) frame = requestAnimationFrame(land);
      };
      land();
      return () => cancelAnimationFrame(frame);
    }

    if (navigationType === "POP") {
      const saved = positions.current.get(location.key) ?? 0;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => window.scrollTo(0, saved)),
      );
      return undefined;
    }

    window.scrollTo(0, 0);
    return undefined;
  }, [
    location.key,
    location.pathname,
    location.search,
    location.hash,
    navigationType,
  ]);
}
