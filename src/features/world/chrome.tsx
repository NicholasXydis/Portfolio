import {
  forwardRef,
  useEffect,
  useRef,
  useLayoutEffect,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Brand as KoiBrand,
  DayNightButton,
  FlatLink,
  LanguagePill,
  RadioPill,
  type KoiTheme,
} from "@/components/koi";
import type { Layout } from "./useLayout";
import type { Place, World } from "./types";
import { placeLabelKey, placeNameKey } from "./places";
import { PLACES } from "./types";
import { moonPhaseName } from "./moon";
import { ChatIcon } from "./icons";

export const focusRing =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--koi-glow)]";

export const sceneHalo =
  "[filter:drop-shadow(0_0_1px_var(--koi-bg))_drop-shadow(0_0_3px_var(--koi-bg))_drop-shadow(0_0_9px_var(--koi-bg))]";

const chromeSurface =
  "border border-[var(--koi-line)] bg-[var(--koi-veil)] backdrop-blur-md shadow-[var(--koi-shadow)]";

export function Brand({
  onClick,
  compact,
}: {
  onClick: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("world.brandLabel")}
      className={`pointer-events-auto flex min-h-10 items-center whitespace-nowrap rounded-[var(--koi-radius-pill)] pr-2 text-[var(--koi-ink)] max-[540px]:pr-1 ${sceneHalo} ${focusRing}`}
    >
      <KoiBrand onScene compact={compact} />
    </button>
  );
}

export interface HeaderControlsProps {
  theme: KoiTheme;
  onThemeChange: (next: KoiTheme) => void;
  musicOn: boolean;
  onToggleMusic: (next: boolean) => void;
  flatHref?: string;
  flatCompact?: boolean;
}

export function HeaderControls({
  theme,
  onThemeChange,
  musicOn,
  onToggleMusic,
  flatHref,
  flatCompact = false,
}: HeaderControlsProps) {
  const { t } = useTranslation();
  return (
    <div className="koi-scene-controls pointer-events-auto flex items-center gap-[10px] max-[759px]:gap-[6px]">
      {flatHref && (
        <FlatLink
          to={flatHref}
          label={t("koi.flatShort")}
          compact={flatCompact}
          glyph={flatCompact ? "2D" : undefined}
        />
      )}
      <DayNightButton theme={theme} onChange={onThemeChange} />
      <RadioPill playing={musicOn} onToggle={onToggleMusic} />
      <LanguagePill />
    </div>
  );
}

export interface ToolbarProps {
  welcome: boolean;
  inert: boolean;
  shifted: boolean;
  onAskHost: () => void;
}

export const Toolbar = forwardRef<HTMLButtonElement, ToolbarProps>(
  function Toolbar({ welcome, inert, shifted, onAskHost }, ref) {
    const { t } = useTranslation();
    const hidden = welcome;
    const corner = false;
    return (
      <nav
        data-nosnippet=""
        aria-label={t("world.toolbar")}
        aria-hidden={hidden || undefined}
        inert={hidden || inert}
        className={`absolute bottom-7 z-10 flex items-center gap-1 rounded-[var(--koi-radius-pill)] p-[5px] transition-[opacity,visibility,left,transform] duration-[var(--koi-dur)] ease-[var(--koi-ease)] motion-reduce:transition-none min-[760px]:bottom-[23px] ${chromeSurface} ${
          hidden ? "invisible opacity-0" : "visible opacity-100"
        } ${corner ? "left-3 translate-x-0" : shifted ? "left-[28.5%] -translate-x-1/2" : "left-1/2 -translate-x-1/2"}`}
      >
        {!corner && (
          <button
            ref={ref}
            type="button"
            onClick={onAskHost}
            aria-label={t("world.askHost")}
            className={`flex min-h-10 items-center gap-2 whitespace-nowrap rounded-[var(--koi-radius-pill)] px-[14px] py-2 text-[12px] text-[var(--koi-ink)] transition-colors hover:bg-[var(--koi-glow-soft)] max-[400px]:px-3 ${focusRing}`}
          >
            <ChatIcon size={17} />
            <span className="max-[400px]:hidden">{t("world.askHost")}</span>
            <span className="hidden max-[400px]:inline" aria-hidden="true">
              {t("world.askHostShort")}
            </span>
          </button>
        )}
      </nav>
    );
  },
);

const lowerFirst = (words: string) =>
  words.charAt(0).toLocaleLowerCase() + words.slice(1);

export interface MarkersProps {
  world: World | null;
  show: boolean;
  layout: Layout;
  hovered: Place | null;
  onOpen: (place: Place) => void;
}

const PIN_EDGE = 6;
const PIN_LINE = 14;

export function Markers({
  world,
  show,
  layout,
  hovered,
  onOpen,
}: MarkersProps) {
  const { t } = useTranslation();
  const refs = useRef<Partial<Record<Place, HTMLButtonElement | null>>>({});
  const anchors = useRef<Partial<Record<Place, HTMLDivElement | null>>>({});

  useEffect(() => {
    if (!world) return;
    const place = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      for (const marker of world.markers()) {
        const pin = refs.current[marker.view];
        const anchor = anchors.current[marker.view];
        if (!pin || !anchor) continue;
        const line = pin.querySelector<HTMLElement>("[data-marker-line]");
        const height = `${marker.line ?? PIN_LINE}px`;
        if (line && line.style.height !== height) line.style.height = height;
        const half = pin.offsetWidth / 2;
        const inside =
          marker.visible &&
          marker.x - half >= PIN_EDGE &&
          marker.x + half <= vw - PIN_EDGE &&
          marker.y - pin.offsetHeight >= PIN_EDGE &&
          marker.y <= vh - PIN_EDGE;
        if (inside)
          anchor.style.transform = `translate(${marker.x}px, ${marker.y}px)`;
        pin.dataset.onscreen = inside ? "true" : "false";
      }
    };
    place();
    const off = world.onFrame(place);
    window.addEventListener("resize", place);
    return () => {
      off();
      window.removeEventListener("resize", place);
    };
  }, [world, layout]);

  return (
    <div
      data-nosnippet=""
      aria-hidden={!show || undefined}
      inert={!show}
      className={`pointer-events-none absolute inset-0 z-[3] transition-opacity duration-[350ms] motion-reduce:transition-none ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      {PLACES.map((place) => {
        const name = t(placeLabelKey[place]);
        const lit = hovered === place;
        return (
          <div
            key={place}
            ref={(el) => {
              anchors.current[place] = el;
            }}
            className="absolute left-0 top-0 h-0 w-0"
          >
            <button
              ref={(el) => {
                refs.current[place] = el;
              }}
              type="button"
              onClick={() => onOpen(place)}
              aria-label={t("world.marker", {
                name,
                place: lowerFirst(t(placeNameKey[place])),
              })}
              data-place={place}
              className="group pointer-events-none absolute bottom-0 left-0 flex -translate-x-1/2 translate-y-[3.5px] flex-col items-center outline-none transition-[opacity,visibility] duration-300 motion-reduce:transition-none data-[onscreen=false]:invisible data-[onscreen=false]:opacity-0 max-[759px]:translate-y-[3px] [@media(max-height:500px)_and_(orientation:landscape)]:translate-y-[3px]"
            >
              <span
                aria-hidden="true"
                data-marker-label
                className={`pointer-events-auto whitespace-nowrap rounded-[var(--koi-radius-pill)] px-2 py-[3px] text-[12px] tracking-[0.04em] text-[var(--koi-ink)] transition-colors duration-[var(--koi-dur)] group-hover:!border-[var(--koi-glow)] group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-[var(--koi-glow)] max-[759px]:px-1.5 max-[759px]:py-[2px] [@media(max-height:500px)_and_(orientation:landscape)]:px-1.5 [@media(max-height:500px)_and_(orientation:landscape)]:py-[2px] ${chromeSurface} ${
                  lit ? "!border-[var(--koi-glow)]" : ""
                }`}
              >
                {name}
              </span>
              <span
                aria-hidden="true"
                data-marker-line
                className={`pointer-events-auto block w-px bg-[var(--koi-glow)] opacity-80 ${sceneHalo}`}
                style={{ height: PIN_LINE }}
              />
              <span
                aria-hidden="true"
                data-marker-tip
                className={`pointer-events-auto block h-[7px] w-[7px] rounded-full border border-[var(--koi-bg)] bg-[var(--koi-glow)] max-[759px]:h-1.5 max-[759px]:w-1.5 [@media(max-height:500px)_and_(orientation:landscape)]:h-1.5 [@media(max-height:500px)_and_(orientation:landscape)]:w-1.5 ${sceneHalo}`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ContextLostNotice({ liteHref }: { liteHref: string }) {
  const { t } = useTranslation();
  return (
    <div className="absolute inset-0 z-[40] grid place-items-center bg-[var(--koi-veil)] p-6">
      <div
        role="alert"
        className={`max-w-[360px] rounded-[var(--koi-radius-card)] p-6 text-center text-[var(--koi-ink)] ${chromeSurface}`}
      >
        <p className="text-[18px] [font-family:var(--koi-font-display)]">
          {t("world.lostTitle")}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--koi-ink-dim)]">
          {t("world.lostLine")}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={`min-h-10 rounded-[var(--koi-radius-pill)] bg-[var(--koi-glow)] px-5 text-[13px] text-[var(--koi-on-glow)] ${focusRing}`}
          >
            {t("world.lostReload")}
          </button>
          <a
            href={liteHref}
            className={`inline-flex min-h-10 items-center rounded-[var(--koi-radius-pill)] border border-[var(--koi-line-strong)] px-5 text-[13px] text-[var(--koi-ink)] ${focusRing}`}
          >
            {t("koi.flat2d")}
          </a>
        </div>
      </div>
    </div>
  );
}

function moonPath(phase: number, r: number): string {
  const c = Math.cos(2 * Math.PI * phase);
  const rx = Math.max(0.01, Math.abs(c) * r);
  const litRight = phase < 0.5;
  const outer = litRight ? 1 : 0;
  const terminator = c > 0 === litRight ? 0 : 1;
  return `M 0 ${-r} A ${r} ${r} 0 0 ${outer} 0 ${r} A ${rx} ${r} 0 0 ${terminator} 0 ${-r} Z`;
}

const MOON_GLYPH = 12;
const MOON_GAP = 6;
const MOON_CLEAR = 12;
const MOON_NEAR = 6;

function MoonGlyph({ phase, size = 12 }: { phase: number; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-6 -6 12 12"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <circle
        r="5"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="0.9"
      />
      <path d={moonPath(phase, 5)} fill="currentColor" />
    </svg>
  );
}

export interface MoonCornerProps {
  phase: number | null;
  show: boolean;
  short?: boolean;
  className?: string;
}

export function MoonCorner({
  phase,
  show,
  short = false,
  className = "",
}: MoonCornerProps) {
  const { t } = useTranslation();
  const name = phase === null ? null : moonPhaseName(phase);
  const words = name
    ? t(short ? `world.moonShort.${name}` : `world.moon.${name}`)
    : "";
  const label = words.charAt(0).toLocaleUpperCase() + words.slice(1);
  const ref = useRef<HTMLParagraphElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [glyphOnly, setGlyphOnly] = useState(false);

  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current;
      const ruler = measureRef.current;
      if (!el || !ruler) return;
      const right = el.getBoundingClientRect().right;
      const fullLeft = right - (MOON_GLYPH + MOON_GAP + ruler.offsetWidth);
      const box = el.getBoundingClientRect();
      let limit = 0;
      for (const other of document.querySelectorAll<HTMLElement>(
        ".koi-credit:not([data-moon-corner]), nav",
      )) {
        if (parseFloat(getComputedStyle(other).opacity) < 0.05) continue;
        const b = other.getBoundingClientRect();
        if (!b.width) continue;
        const nearInHeight =
          Math.min(box.bottom, b.bottom) - Math.max(box.top, b.top) >
          -MOON_NEAR;
        if (nearInHeight && b.right <= right)
          limit = Math.max(limit, b.right + MOON_CLEAR);
      }
      setGlyphOnly(fullLeft < limit);
    };
    fit();
    const late = window.setTimeout(fit, 450);
    window.addEventListener("resize", fit);
    return () => {
      window.clearTimeout(late);
      window.removeEventListener("resize", fit);
    };
  }, [label, show]);

  if (phase === null || !name) return null;
  return (
    <p
      ref={ref}
      data-moon-corner
      data-glyph-only={glyphOnly || undefined}
      aria-hidden={!show || undefined}
      className={`koi-credit pointer-events-none transition-opacity duration-[var(--koi-dur-slow)] ease-[var(--koi-ease)] motion-reduce:transition-none ${
        show ? "opacity-100" : "opacity-0"
      } ${className}`}
    >
      <MoonGlyph phase={phase} />
      <span className={glyphOnly ? "sr-only" : undefined}>{label}</span>
      <span
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute whitespace-nowrap"
      >
        {label}
      </span>
    </p>
  );
}
