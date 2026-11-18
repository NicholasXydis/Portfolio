import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "./Button";
import { cx } from "./cx";
import { FishIcon, GridIcon } from "./icons";
import { KoiLoader } from "./KoiLoader";

type Phase = "loading" | "leaving" | "gap" | "ready";

const MIN_FILL_MS = 1100;
const STEP_MS = 260;
const LEAVE_MS = 140;
const EMPTY_MS = 200;
const ALMOST = 0.96;
const WORDS_GRACE_MS = 1500;
const WORDS_IN_MS = 560;
const WORDS_HOLD_MS = 600;

export interface LoadingSceneStrings {
  brand: string;
  by: string;
  flat: string;
  loadingTitle: string;
  progressLabel: string;
  readyTitle: string;
  readyLine: string;
  enter: string;
}

export interface LoadingSceneProps {
  progress: number;
  ready: boolean;
  onEnter: () => void;
  onPress?: () => void;
  liteHref: string;
  strings: LoadingSceneStrings;
  name: string;
  role: string;
  className?: string;
}

export function LoadingScene({
  progress,
  ready,
  onEnter,
  onPress,
  liteHref,
  strings,
  name,
  role,
  className,
}: LoadingSceneProps) {
  const enterRef = useRef<HTMLButtonElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const wordsAtRef = useRef<number | null>(null);
  const real = ready
    ? 1
    : Math.min(ALMOST, Math.max(0, Number.isFinite(progress) ? progress : 0));

  const sceneRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const countLoop = useRef(0);
  const arrived = useRef(false);
  const [shown, setShown] = useState(ready ? 1 : 0);
  const glide = useRef({ t0: 0, to: ready ? 1 : 0, doneAt: 0 });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const scene = sceneRef.current;
      if (!scene) return;
      const now = performance.now();
      const g = glide.current;
      if (arrived.current && real >= g.to - 0.2) return;
      if (g.t0 === 0) g.t0 = now;
      const write = (target: number, ms: number) => {
        scene.style.setProperty("--koi-catch", `${ms}ms`);
        scene.style.setProperty("--koi-p", String(target));
      };
      const count = () => {
        const node = countRef.current;
        const bar = scene.querySelector<HTMLElement>(".koi-scene__bar-fill");
        if (!node || arrived.current) {
          countLoop.current = 0;
          return;
        }
        let at = glide.current.to;
        if (bar && typeof DOMMatrixReadOnly !== "undefined") {
          const width = bar.parentElement?.getBoundingClientRect().width ?? 0;
          if (width > 0)
            at =
              1 +
              new DOMMatrixReadOnly(getComputedStyle(bar).transform).m41 /
                width;
        }
        const text = String(Math.round(Math.min(1, Math.max(0, at)) * 100));
        if (node.textContent !== text) node.textContent = text;
        countLoop.current =
          performance.now() < glide.current.doneAt + 60
            ? window.requestAnimationFrame(count)
            : 0;
      };
      if (real < g.to - 0.2) {
        arrived.current = false;
        glide.current = { t0: now, to: 0, doneAt: now };
        write(0, 0);
        count();
        setShown(0);
        return;
      }
      if (real <= g.to && g.doneAt !== 0) return;
      const fill = scene.querySelector<HTMLElement>(".koi-scene__bar-fill");
      void (fill ? getComputedStyle(fill).transform : scene.offsetWidth);
      const endAt = Math.max(now + STEP_MS, g.t0 + real * MIN_FILL_MS);
      glide.current = { t0: g.t0, to: real, doneAt: endAt };
      write(real, Math.round(endAt - now));
      if (countLoop.current === 0)
        countLoop.current = window.requestAnimationFrame(count);
      setShown(real);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [real]);

  useEffect(() => () => window.cancelAnimationFrame(countLoop.current), []);

  const percent = Math.round(shown * 100);
  const full = shown >= 1;

  const [phase, setPhase] = useState<Phase>(ready ? "ready" : "loading");
  const [wordsIn, setWordsIn] = useState(false);
  const [readyIn, setReadyIn] = useState(false);

  const realRef = useRef(real);
  useEffect(() => {
    realRef.current = real;
  }, [real]);
  useEffect(() => {
    if (phase !== "loading" || wordsIn) return;
    const timer = window.setTimeout(() => {
      if (realRef.current >= 1) return;
      wordsAtRef.current = performance.now();
      setWordsIn(true);
    }, WORDS_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [phase, wordsIn]);

  useEffect(() => {
    if (!ready || phase !== "loading" || !full) return;
    const now = performance.now();
    const wordsAt = wordsAtRef.current;
    const hold =
      wordsAt === null ? 0 : wordsAt + WORDS_IN_MS + WORDS_HOLD_MS - now;
    const wait = Math.max(0, glide.current.doneAt - now, hold);
    const timer = window.setTimeout(() => {
      arrived.current = true;
      window.cancelAnimationFrame(countLoop.current);
      countLoop.current = 0;
      if (countRef.current) countRef.current.textContent = "100";
      setPhase("leaving");
    }, wait);
    return () => window.clearTimeout(timer);
  }, [ready, phase, full]);

  useEffect(() => {
    if (phase !== "leaving" && phase !== "gap") return;
    const timer = window.setTimeout(
      () => setPhase(phase === "leaving" ? "gap" : "ready"),
      phase === "leaving" ? LEAVE_MS : EMPTY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "ready") return;
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setReadyIn(true));
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [phase]);

  useEffect(() => {
    if (ready || phase === "loading") return;
    const timer = window.setTimeout(() => {
      arrived.current = false;
      wordsAtRef.current = null;
      setWordsIn(false);
      setReadyIn(false);
      setPhase("loading");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ready, phase]);

  useEffect(() => {
    if (phase === "ready") enterRef.current?.focus({ preventScroll: true });
  }, [phase]);

  return (
    <div
      ref={sceneRef}
      className={cx("koi-scene", className)}
      data-phase={phase}
    >
      <div className="koi-scene__top">
        <p className="koi-scene__brand">
          {strings.brand} <em>{strings.by}</em>
        </p>
        <Link className="koi-scene__flat" to={liteHref}>
          <GridIcon />
          {strings.flat}
        </Link>
      </div>

      <KoiLoader
        className="koi-scene__pond"
        progress={shown}
        driven
        size="var(--koi-scene-pond)"
        showValue={false}
        decorative
      />

      <div className="koi-scene__copy">
        {phase === "ready" ? (
          <div
            className={cx(
              "koi-scene__words koi-scene__words--ready",
              readyIn && "is-in",
            )}
          >
            <h2 className="koi-scene__title">{strings.readyTitle}</h2>
            <p className="koi-scene__line">{strings.readyLine}</p>
            <Button
              ref={enterRef}
              className="koi-scene__enter"
              data-quiet=""
              variant="solid"
              size="lg"
              icon={<FishIcon size={20} />}
              onClick={onEnter}
              onPointerDown={(event) => {
                if (event.pointerType === "mouse" && event.button === 0)
                  onPress?.();
              }}
            >
              {strings.enter}
            </Button>
          </div>
        ) : phase === "gap" ? null : (
          <div
            ref={loadingRef}
            className={cx(
              "koi-scene__words koi-scene__words--loading",
              phase === "leaving" && "is-out",
            )}
          >
            <h2
              className={cx(
                "koi-scene__title koi-scene__title--late",
                wordsIn && "is-in",
              )}
            >
              {strings.loadingTitle}
            </h2>
            <div
              className="koi-scene__bar"
              role="progressbar"
              aria-label={strings.progressLabel}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <span className="koi-scene__bar-fill" />
            </div>
            <p className="koi-scene__count" aria-hidden="true">
              <span ref={countRef}>0</span>
              <span>%</span>
            </p>
          </div>
        )}
      </div>

      <p className="koi-scene__live" role="status">
        {phase === "ready" ? strings.readyTitle : ""}
      </p>

      <h1 className="koi-scene__owner">
        {name} <span>{role}</span>
      </h1>
    </div>
  );
}
