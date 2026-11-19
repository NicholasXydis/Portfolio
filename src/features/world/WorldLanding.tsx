import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type React from "react";
import { AnimatePresence } from "framer-motion";
import { useLocation, useNavigate, useNavigationType } from "react-router";
import { useTranslation } from "react-i18next";
import { SITE_NAME } from "@/lib/site";
import {
  CornerCredit,
  firstTheme,
  useKoiTheme,
  type KoiTheme,
} from "@/components/koi";
import { projects } from "@/content";
import { useLocale } from "@/hooks/useLocale";
import { localizedPath } from "@/lib/localized";
import {
  Brand,
  ContextLostNotice,
  HeaderControls,
  Markers,
  MoonCorner,
  Toolbar,
  sceneHalo,
} from "./chrome";
import { HostQuestion } from "./HostQuestion";
import { createHinter } from "./hinter";
import { markVisited, useVisited } from "./visited";
import { LoadingScreen } from "./LoadingScreen";
import { Panel } from "./Panel";
import { loadCreateWorld } from "./loadWorld";
import * as music from "@/features/music";
import { readTappable, worldCursor } from "./cursor";
import { moonPhase } from "./moon";
import { isPet, petBuzz } from "@/lib/haptics";
import { useLayout, prefersReducedMotion } from "./useLayout";
import {
  initialLandingState,
  landingReducer,
  type LandingState,
} from "./viewMachine";
import {
  claimKept,
  keepWorld,
  peekKept,
  worldHandlers,
  type Kept,
} from "./keepAlive";
import type { CreateWorld, Place, View, World, WorldInsets } from "./types";
import { isPlace } from "./types";

type FocusTarget = "host" | "panel" | "toolbar" | "return" | null;

const READY_DELAY_MS = 0;
const PLAIN_GLASS_TIER = 5;
const THEME_FADE_MS = 2500;

function subscribeTransparency(onChange: () => void) {
  const query = window.matchMedia?.("(prefers-reduced-transparency: reduce)");
  query?.addEventListener?.("change", onChange);
  return () => query?.removeEventListener?.("change", onChange);
}

const FADE_MS = 700;
const REDUCED_FADE_MS = 200;
export type WorldFailure = "graphics" | "load";

export interface WorldLandingProps {
  load?: () => Promise<CreateWorld>;
  onFail?: (why: WorldFailure) => void;
}

export function WorldLanding({
  load = loadCreateWorld,
  onFail,
}: WorldLandingProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useNavigate();
  const layout = useLayout();
  const [resumed] = useState<Kept | null>(() => peekKept());
  const [state, dispatch] = useReducer(
    landingReducer,
    resumed,
    (r): LandingState =>
      r ? { phase: "entered", progress: 1, view: r.view } : initialLandingState,
  );
  const [world, setWorld] = useState<World | null>(resumed?.world ?? null);
  const worldRef = useRef<World | null>(world);
  useEffect(() => {
    worldRef.current = world;
  }, [world]);
  const [hovered, setHovered] = useState<Place | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [tier, setTier] = useState<number | null>(
    resumed?.world.info.tier ?? null,
  );
  const reducedTransparency = useSyncExternalStore(
    subscribeTransparency,
    () =>
      window.matchMedia?.("(prefers-reduced-transparency: reduce)").matches ===
      true,
    () => false,
  );
  const plainGlass =
    reducedTransparency || (tier !== null && tier >= PLAIN_GLASS_TIER);
  const { theme, setTheme } = useKoiTheme();
  const { playing: musicOn } = music.useMusic();
  const [loaderGone, setLoaderGone] = useState(!!resumed);
  const [intro, setIntro] = useState<"loading" | "fading" | "done">(
    resumed ? "done" : "loading",
  );
  const [fadeMs, setFadeMs] = useState(FADE_MS);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const hostHeadingRef = useRef<HTMLHeadingElement>(null);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const toolbarButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [focusRequest, setFocusRequest] = useState<{
    target: FocusTarget;
    n: number;
  }>({
    target: null,
    n: 0,
  });
  const requestFocus = useCallback(
    (target: FocusTarget) => setFocusRequest((r) => ({ target, n: r.n + 1 })),
    [],
  );

  const entered = state.phase === "entered";
  const enteredRef = useRef(entered);
  useEffect(() => {
    enteredRef.current = entered;
  }, [entered]);

  const location = useLocation();
  const navigationType = useNavigationType();
  const currentViewRef = useRef<View>(state.view);
  currentViewRef.current = state.view;
  const historyPlace = (location.state as { koiPlace?: unknown } | null)
    ?.koiPlace;
  const historyPlaceRef = useRef<unknown>(historyPlace);
  historyPlaceRef.current = historyPlace;
  const poppingByUi = useRef(false);
  const here = `${location.pathname}${location.search}`;

  const leavePlaceHistory = useCallback(() => {
    if (!isPlace(historyPlaceRef.current as View)) return;
    poppingByUi.current = true;
    navigate(-1);
  }, [navigate]);

  const go = useCallback(
    (view: View, focus: FocusTarget) => {
      const from = currentViewRef.current;
      if (isPlace(view)) {
        const active = document.activeElement as HTMLElement | null;
        if (
          active &&
          active !== document.body &&
          !active.closest("[data-panel]")
        ) {
          returnFocusRef.current = active;
        }
        if (view !== from)
          navigate(here, { state: { koiPlace: view }, replace: isPlace(from) });
        if (view === "projects")
          worldRef.current?.showSlide?.(projects[0]?.slug ?? null);
      } else if (isPlace(from)) {
        leavePlaceHistory();
      }
      dispatch({ type: "go", view });
      requestFocus(focus);
    },
    [requestFocus, navigate, here, leavePlaceHistory],
  );

  const followHistory = useEffectEvent(() => {
    if (navigationType !== "POP") return;
    if (poppingByUi.current) {
      poppingByUi.current = false;
      return;
    }
    const target = historyPlace;
    if (isPlace(target as View)) {
      if (currentViewRef.current !== target) {
        dispatch({ type: "go", view: target as View });
        requestFocus("panel");
      }
    } else if (isPlace(currentViewRef.current)) {
      dispatch({ type: "go", view: "welcome" });
      requestFocus("host");
    }
  });
  useEffect(() => {
    followHistory();
  }, [location.key]);
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  }, [go]);

  const cursorRef = useRef({ tappable: false, dragging: false });
  const paintCursor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const next = worldCursor({
      ...cursorRef.current,
      explore: currentViewRef.current === "explore",
    });
    if (next) canvas.dataset.cursor = next;
    else delete canvas.dataset.cursor;
  }, []);

  useEffect(() => {
    worldHandlers.progress = (value) => dispatch({ type: "progress", value });
    worldHandlers.pick = (place) => goRef.current(place, "panel");
    worldHandlers.hover = (place, detail) => {
      setHovered(place);
      cursorRef.current.tappable = readTappable(place, detail);
      paintCursor();
    };
    worldHandlers.event = (type, detail) => {
      if (type === "tier") {
        const next = (detail as { tier?: unknown } | null)?.tier;
        if (typeof next === "number") setTier(next);
      } else if (type === "contextLost") setContextLost(true);
      else if (type === "contextRestored") setContextLost(false);
      else if (type === "secret") {
        const name = (detail as { name?: unknown } | null)?.name;
        if (name === "pond" || name === "koi") music.pondSound();
        else if (isPet(name)) petBuzz();
      }
    };
  }, [paintCursor]);

  const viewForKeep = useRef<View>(state.view);
  useEffect(() => {
    viewForKeep.current = state.view;
  }, [state.view]);
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host || (window as unknown as { __koiNoGL?: boolean }).__koiNoGL)
      return;
    const kept = peekKept();
    if (kept && resumed && kept.world === resumed.world) {
      claimKept(kept);
      host.appendChild(kept.canvas);
      canvasRef.current = kept.canvas;
      paintCursor();
      kept.world.resize();
      return () => {
        keepWorld(kept.world, kept.canvas, viewForKeep.current);
        canvasRef.current = null;
      };
    }
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = "absolute inset-0 block h-full w-full touch-none";
    host.appendChild(canvas);
    canvasRef.current = canvas;
    paintCursor();
    let cancelled = false;
    let created: World | null = null;
    let readyTimer = 0;
    const frame = requestAnimationFrame(() => {
      load()
        .then((createWorld) =>
          createWorld(canvas, {
            id: "koi",
            base: "/3d/worlds/",
            mode: (worldModeRef.current =
              firstTheme() === "light" ? "day" : "night"),
            reducedMotion: prefersReducedMotion(),
            date: null,
            onProgress: (value) => {
              if (!cancelled) worldHandlers.progress(value);
            },
            onPick: (place) => worldHandlers.pick(place),
            onHover: (place, detail) => worldHandlers.hover(place, detail),
            onEvent: (type, detail) => worldHandlers.event(type, detail),
          }),
        )
        .then((w) => {
          if (cancelled) {
            w.dispose();
            return;
          }
          created = w;
          setWorld(w);
          if (typeof w.info.tier === "number") setTier(w.info.tier);
          dispatch({ type: "progress", value: 1 });
          readyTimer = window.setTimeout(
            () => dispatch({ type: "ready" }),
            READY_DELAY_MS,
          );
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          failureRef.current = /webgl/i.test(
            String((error as Error)?.message ?? error),
          )
            ? "graphics"
            : "load";
          dispatch({ type: "fail" });
        });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(readyTimer);
      canvasRef.current = null;
      if (created && enteredRef.current)
        keepWorld(created, canvas, viewForKeep.current);
      else {
        created?.dispose();
        canvas.remove();
      }
    };
  }, [load, paintCursor, resumed]);

  const [creep, setCreep] = useState(0);
  useEffect(() => {
    if (state.phase !== "loading") return;
    const id = window.setInterval(() => {
      setCreep((c) =>
        Math.min(
          0.985,
          Math.max(c, state.progress) + 0.004,
          state.progress + 0.05,
        ),
      );
    }, 250);
    return () => window.clearInterval(id);
  }, [state.phase, state.progress]);
  const shownProgress =
    state.phase === "loading" ? Math.max(state.progress, creep) : 1;

  const failureRef = useRef<WorldFailure>("load");
  const onFailRef = useRef(onFail);
  useEffect(() => {
    onFailRef.current = onFail;
  }, [onFail]);
  useEffect(() => {
    if (state.phase !== "failed") return;
    if (onFailRef.current) onFailRef.current(failureRef.current);
    else navigate(localizedPath(locale, "lite"), { replace: true });
  }, [state.phase, navigate, locale]);

  useEffect(() => {
    world?.setView(state.view);
  }, [world, state.view]);

  const mainRef = useRef<HTMLElement>(null);
  const themingTimer = useRef(0);
  const inkTimer = useRef(0);
  useEffect(
    () => () => {
      window.clearTimeout(themingTimer.current);
      window.clearTimeout(inkTimer.current);
    },
    [],
  );
  const softTheme = useCallback(
    (next: KoiTheme) => {
      const root = mainRef.current;
      if (root && !prefersReducedMotion()) {
        const shown =
          root.dataset.inkHold ??
          (document.documentElement.classList.contains("light")
            ? "light"
            : "dark");
        root.dataset.inkHold = shown;
        root.classList.add("koi-theming");
        window.clearTimeout(themingTimer.current);
        window.clearTimeout(inkTimer.current);
        inkTimer.current = window.setTimeout(() => {
          delete root.dataset.inkHold;
        }, THEME_FADE_MS / 2);
        themingTimer.current = window.setTimeout(
          () => root.classList.remove("koi-theming"),
          THEME_FADE_MS + 200,
        );
      }
      setTheme(next, { transition: "none" });
    },
    [setTheme],
  );
  const worldModeRef = useRef<"night" | "day" | null>(null);
  const leavingRef = useRef(false);
  useEffect(() => {
    const leave = () => {
      leavingRef.current = true;
    };
    const stay = () => {
      leavingRef.current = false;
    };
    window.addEventListener("beforeunload", leave);
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", stay);
    return () => {
      window.removeEventListener("beforeunload", leave);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", stay);
    };
  }, []);
  useEffect(() => {
    if (!world) return;
    const mode = theme === "light" ? "day" : "night";
    if (worldModeRef.current === mode) return;
    const previous = worldModeRef.current;
    let change: Promise<void>;
    try {
      change = Promise.resolve(world.setMode(mode));
    } catch (error) {
      change = Promise.reject(error);
    }
    change.then(
      () => {
        worldModeRef.current = mode;
      },
      () => {
        if (previous && !leavingRef.current)
          softTheme(previous === "day" ? "light" : "dark");
      },
    );
  }, [world, theme, softTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!world || !canvas || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => world.resize());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [world]);

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    if (!entered) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector("dialog[open]")) return;
      event.preventDefault();
      if (isPlace(currentViewRef.current)) leavePlaceHistory();
      dispatch({ type: "escape" });
      requestFocus("toolbar");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entered, requestFocus, leavePlaceHistory]);

  const [panelMounted, setPanelMounted] = useState(false);
  const shownPlace = isPlace(state.view) ? state.view : null;
  const showHost =
    entered && intro === "done" && state.view === "welcome" && !panelMounted;
  useEffect(() => {
    if (shownPlace && !panelMounted) setPanelMounted(true);
  }, [shownPlace, panelMounted]);

  const hinter = useMemo(
    () => createHinter((view) => world?.hint?.(view)),
    [world],
  );
  useEffect(() => {
    if (!showHost) hinter.clear();
  }, [showHost, hinter]);
  useEffect(() => {
    if (showHost) void world?.greet?.()?.catch?.(() => undefined);
  }, [showHost, world]);

  const visited = useVisited();
  const soundedPlace = useRef<Place | null>(null);
  useEffect(() => {
    if (shownPlace) markVisited(shownPlace);
    const was = soundedPlace.current;
    soundedPlace.current = shownPlace;
    if (shownPlace && shownPlace !== was) music.cardSound("open");
    else if (!shownPlace && was) music.cardSound("close");
  }, [shownPlace]);
  useEffect(() => {
    paintCursor();
  }, [state.view, paintCursor]);

  const focusDone = useRef(0);
  useEffect(() => {
    const { target, n } = focusRequest;
    if (!target || focusDone.current === n) return;
    const run = () => {
      let el: HTMLElement | null = null;
      if (target === "host") el = hostHeadingRef.current;
      else if (target === "panel") el = panelHeadingRef.current;
      else if (target === "toolbar") el = toolbarButtonRef.current;
      else if (target === "return") {
        const back = returnFocusRef.current;
        const usable =
          back?.isConnected &&
          !back.closest("[inert]") &&
          back.getClientRects().length > 0 &&
          getComputedStyle(back).visibility !== "hidden";
        el = usable ? back : toolbarButtonRef.current;
      }
      if (!el) return;
      el.focus();
      if (document.activeElement === el) {
        focusDone.current = n;
        return;
      }
      if (tries++ < 30) id = requestAnimationFrame(run);
    };
    let tries = 0;
    let id = requestAnimationFrame(run);
    return () => cancelAnimationFrame(id);
  }, [focusRequest, shownPlace, showHost]);

  const viewRef = useRef<View>("welcome");
  useEffect(() => {
    viewRef.current = state.view;
  }, [state.view]);

  const enteringRef = useRef(false);
  const introDoneRef = useRef(!!resumed);
  const introParts = useRef({ fade: false, push: false });

  const finishIntro = useCallback(() => {
    if (introDoneRef.current) return;
    introDoneRef.current = true;
    setIntro("done");
    if (viewRef.current === "welcome") requestFocus("host");
  }, [requestFocus]);

  const partDone = useCallback(
    (part: "fade" | "push") => {
      introParts.current[part] = true;
      if (introParts.current.fade && introParts.current.push) finishIntro();
    },
    [finishIntro],
  );

  useEffect(() => {
    music.prepare();
  }, []);

  useEffect(() => {
    if (state.phase === "ready") music.warm();
  }, [state.phase]);

  const startMusic = () => {
    if (state.phase !== "ready") return;
    music.start();
    music.primeSounds();
  };

  const onEnter = () => {
    if (state.phase !== "ready" || enteringRef.current) return;
    enteringRef.current = true;
    dispatch({ type: "enter" });
    startMusic();
    const reduced = prefersReducedMotion();
    const pushIn = !reduced && world?.intro ? world.intro() : null;
    if (!pushIn) world?.entered?.();
    introParts.current = { fade: false, push: !pushIn };
    pushIn?.then(
      () => partDone("push"),
      () => partDone("push"),
    );
    const fade = reduced ? REDUCED_FADE_MS : FADE_MS;
    let begun = false;
    const begin = () => {
      if (begun) return;
      begun = true;
      setFadeMs(fade);
      setIntro("fading");
      window.setTimeout(() => {
        setLoaderGone(true);
        partDone("fade");
      }, fade);
    };
    if (pushIn && world) {
      const off = world.onFrame(() => {
        off();
        begin();
      });
      window.setTimeout(() => {
        off();
        begin();
      }, 150);
    } else {
      begin();
    }
  };

  const onToggleMusic = (next: boolean) => {
    music.setMuted(!next);
    if (next) music.primeSounds();
  };

  const onSlide = useCallback(
    (slug: string | null) => world?.showSlide?.(slug),
    [world],
  );

  const view = state.view;

  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const onScenePointerDown = (event: React.PointerEvent) => {
    dragStart.current = { x: event.clientX, y: event.clientY };
  };
  const onScenePointerMove = (event: React.PointerEvent) => {
    const start = dragStart.current;
    if (!start) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 6)
      return;
    if (!cursorRef.current.dragging) {
      cursorRef.current.dragging = true;
      paintCursor();
    }
  };
  const endDrag = useCallback(() => {
    dragStart.current = null;
    if (!cursorRef.current.dragging) return;
    cursorRef.current.dragging = false;
    paintCursor();
  }, [paintCursor]);
  useEffect(() => {
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("blur", endDrag);
    return () => {
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("blur", endDrag);
    };
  }, [endDrag]);

  const headerRef = useRef<HTMLElement>(null);
  const [sheetCover, setSheetCover] = useState(0);
  const [viewportTick, setViewportTick] = useState(0);
  useEffect(() => {
    const onResize = () => setViewportTick((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const insetsFrame = useRef(0);
  useEffect(() => {
    if (!world || (!world.setInsets && world.resize.length === 0)) return;
    cancelAnimationFrame(insetsFrame.current);
    insetsFrame.current = requestAnimationFrame(() => {
      const vw = window.innerWidth;
      let insets: WorldInsets = { top: 0, right: 0, bottom: 0, left: 0 };
      if (shownPlace) {
        const top =
          layout === "narrow"
            ? 87
            : Math.round(
                headerRef.current?.getBoundingClientRect().bottom ?? 0,
              );
        if (layout === "narrow")
          insets = { top, right: 0, bottom: Math.round(sheetCover), left: 0 };
        else {
          const width =
            layout === "short"
              ? Math.max(280, Math.min(vw * 0.43, 560))
              : Math.min(vw * 0.43, 560);
          insets = {
            top,
            right: Math.round(width + (layout === "wide" ? vw * 0.045 : 12)),
            bottom: 0,
            left: 0,
          };
        }
      }
      if (world.setInsets) world.setInsets(insets);
      else world.resize(insets);
    });
    return () => cancelAnimationFrame(insetsFrame.current);
  }, [world, shownPlace, layout, sheetCover, viewportTick]);

  const creditShown =
    entered &&
    (layout === "wide" ||
      (layout === "short"
        ? shownPlace === null
        : view === "explore" && shownPlace === null));
  const moonShown =
    entered &&
    theme === "dark" &&
    (layout === "wide" ||
      (layout === "short"
        ? shownPlace === null
        : view === "explore" && shownPlace === null));

  const sidePanelOpen = shownPlace !== null && layout === "short";

  return (
    <main
      ref={mainRef}
      id="main-content"
      data-view={view}
      data-phase={state.phase}
      data-koi-glass={plainGlass ? "plain" : undefined}
      className="fixed inset-0 h-[100dvh] overflow-hidden bg-[var(--koi-bg)] text-[var(--koi-ink)] [font-family:var(--koi-font-body)] [.koi-nogl_&]:hidden"
    >
      <div
        ref={canvasHostRef}
        inert={!entered}
        aria-hidden="true"
        className="absolute inset-0"
        onPointerDown={onScenePointerDown}
        onPointerMove={onScenePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />

      <header
        ref={headerRef}
        data-nosnippet=""
        inert={!entered}
        className={`pointer-events-none absolute left-[18px] right-[18px] top-[18px] z-[8] flex items-start justify-between gap-3 max-[540px]:gap-2 min-[760px]:left-[30px] min-[760px]:right-[30px] min-[760px]:top-[25px] [@media(min-width:760px)_and_(max-height:650px)]:top-[19px] [@media(max-height:500px)_and_(orientation:landscape)]:!top-3 ${""}`}
      >
        <Brand onClick={() => go("explore", null)} compact={sidePanelOpen} />
        <HeaderControls
          theme={theme}
          onThemeChange={softTheme}
          musicOn={musicOn}
          onToggleMusic={onToggleMusic}
          flatHref={localizedPath(locale, "lite")}
          flatCompact={layout === "narrow"}
        />
      </header>

      <Markers
        world={world}
        show={entered && view === "explore"}
        layout={layout}
        hovered={hovered}
        onOpen={(place) => go(place, "panel")}
      />

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[42%] bg-[var(--koi-veil)] [-webkit-mask-image:linear-gradient(to_top,#000_0%,#000_25%,transparent_100%)] [mask-image:linear-gradient(to_top,#000_0%,#000_25%,transparent_100%)] transition-opacity duration-[var(--koi-dur-slow)] ease-[var(--koi-ease)] motion-reduce:transition-none ${
          entered && view === "welcome" ? "opacity-100" : "opacity-0"
        }`}
      />

      <AnimatePresence>
        {showHost && (
          <HostQuestion
            key="host"
            ref={hostHeadingRef}
            onHint={(place) => hinter.hint(place)}
            visited={visited}
            onChoose={(place) => go(place, "panel")}
            onJustLooking={() => go("explore", "toolbar")}
          />
        )}
      </AnimatePresence>

      <AnimatePresence
        mode="wait"
        onExitComplete={() => setPanelMounted(false)}
      >
        {shownPlace && (
          <Panel
            key={shownPlace}
            ref={panelHeadingRef}
            place={shownPlace}
            layout={layout}
            onClose={() => go("explore", "return")}
            onSlide={onSlide}
            onCover={setSheetCover}
          />
        )}
      </AnimatePresence>

      <Toolbar
        ref={toolbarButtonRef}
        welcome={view === "welcome"}
        inert={!entered}
        shifted={sidePanelOpen}
        onAskHost={() => go("welcome", "host")}
      />

      <CornerCredit
        label={t(layout === "narrow" ? "koi.creditShort" : "koi.credit", {
          name: SITE_NAME,
          year: new Date().getFullYear(),
        })}
        className={`pointer-events-none absolute bottom-[max(21px,env(safe-area-inset-bottom))] left-[max(22px,env(safe-area-inset-left))] z-[6] !text-[var(--koi-ink)] ${sceneHalo} transition-opacity duration-[var(--koi-dur)] ease-[var(--koi-ease)] max-[759px]:bottom-[max(7px,env(safe-area-inset-bottom))] max-[759px]:left-[max(12px,env(safe-area-inset-left))] ${
          creditShown ? "opacity-100" : "opacity-0"
        } ${layout === "short" && view === "welcome" ? "max-[759px]:opacity-0" : ""}`}
      />

      <MoonCorner
        phase={
          world
            ? Number.isFinite(world.info.moonPhase)
              ? world.info.moonPhase
              : moonPhase(new Date())
            : null
        }
        show={moonShown}
        short={layout === "narrow"}
        className={`absolute bottom-[max(21px,env(safe-area-inset-bottom))] right-[max(22px,env(safe-area-inset-right))] z-[6] !text-[var(--koi-ink)] ${sceneHalo} max-[759px]:bottom-[max(7px,env(safe-area-inset-bottom))] max-[759px]:right-[max(12px,env(safe-area-inset-right))]`}
      />

      {contextLost && (
        <ContextLostNotice liteHref={localizedPath(locale, "lite")} />
      )}

      {loaderGone && (
        <h1 className="sr-only">
          {SITE_NAME} · {t("world.role")}
        </h1>
      )}

      {!loaderGone && (
        <LoadingScreen
          progress={shownProgress}
          ready={state.phase === "ready" || entered}
          leaving={intro !== "loading"}
          fadeMs={fadeMs}
          onEnter={onEnter}
          onPress={startMusic}
        />
      )}
    </main>
  );
}
