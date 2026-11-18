import { useCallback, useEffect, useSyncExternalStore } from "react";

export type KoiTheme = "dark" | "light";

export const KOI_THEME_KEY = "koi-theme";

const listeners = new Set<() => void>();
let remembered: KoiTheme | null = null;

function isTheme(value: unknown): value is KoiTheme {
  return value === "dark" || value === "light";
}

function readStoredTheme(): KoiTheme | null {
  try {
    const value = window.sessionStorage.getItem(KOI_THEME_KEY);
    return isTheme(value) ? value : remembered;
  } catch {
    return remembered;
  }
}

export const THEME_COLOR: Record<KoiTheme, string> = {
  dark: "#0a0b0d",
  light: "#f6f3ec",
};

export function applyKoiTheme(theme: KoiTheme): void {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[theme]);
}

function subscribeStored(notify: () => void): () => void {
  listeners.add(notify);
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

export function resetThemeForTest(): void {
  remembered = null;
}

export function firstTheme(): KoiTheme {
  return readStoredTheme() ?? "dark";
}

function persistTheme(next: KoiTheme): void {
  try {
    window.sessionStorage.setItem(KOI_THEME_KEY, next);
  } catch {
    return;
  }
}

export function useKoiTheme(fallback: KoiTheme = "dark") {
  const stored = useSyncExternalStore(
    subscribeStored,
    readStoredTheme,
    () => null,
  );
  const theme: KoiTheme = stored ?? fallback;

  useEffect(() => {
    applyKoiTheme(theme);
  }, [theme]);

  const setTheme = useCallback(
    (next: KoiTheme, options?: { transition?: "view" | "none" }) => {
      remembered = next;
      persistTheme(next);
      const root = document.documentElement;
      if (options?.transition === "none") {
        applyKoiTheme(next);
        listeners.forEach((notify) => notify());
        return;
      }
      const swap = () => {
        root.classList.add("koi-theme-swap");
        applyKoiTheme(next);
        listeners.forEach((notify) => notify());
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() =>
            root.classList.remove("koi-theme-swap"),
          );
        });
      };
      type Transition = {
        ready?: Promise<unknown>;
        finished?: Promise<unknown>;
        updateCallbackDone?: Promise<unknown>;
      };
      const doc = document as Document & {
        startViewTransition?: (update: () => void) => Transition | undefined;
      };
      const reduced =
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
        false;
      if (typeof doc.startViewTransition === "function" && !reduced) {
        const transition = doc.startViewTransition(swap);
        const quiet = () => undefined;
        transition?.ready?.catch(quiet);
        transition?.finished?.catch(quiet);
        transition?.updateCallbackDone?.catch(quiet);
      } else {
        swap();
      }
    },
    [],
  );

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  return { theme, setTheme, toggle };
}
