import { useLayoutEffect, useRef } from "react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { cx } from "./cx";

interface PillOwnProps {
  active?: boolean;
  children: ReactNode;
}
type PillAsButton = PillOwnProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type PillAsLink = PillOwnProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
export type PillProps = PillAsButton | PillAsLink;

function Pill(props: PillProps) {
  const { active = false, className, children, ...rest } = props;
  const classes = cx("koi-pill", className);
  if (rest.href !== undefined) {
    return (
      <a
        className={classes}
        data-active={active}
        aria-current={active ? "true" : undefined}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={classes}
      data-active={active}
      aria-pressed={active}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}

export interface PillNavItem {
  id: string;
  label: string;
  href?: string;
}

export interface PillNavProps {
  items: readonly PillNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  label: string;
  className?: string;
}

export function PillNav({
  items,
  activeId,
  onSelect,
  label,
  className,
}: PillNavProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const placedRef = useRef(false);
  const namesKey = items.map((item) => `${item.id}:${item.label}`).join("|");

  useLayoutEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    const place = () => {
      const current = track.querySelector<HTMLElement>('[data-active="true"]');
      if (!current) {
        thumb.style.opacity = "0";
        return;
      }
      const first = !placedRef.current;
      if (first) thumb.style.transition = "none";
      thumb.style.opacity = "1";
      thumb.style.width = `${current.offsetWidth}px`;
      thumb.style.transform = `translateX(${current.offsetLeft}px)`;
      if (first) {
        void thumb.offsetWidth;
        thumb.style.transition = "";
        placedRef.current = true;
      }
      if (track.scrollWidth > track.clientWidth) {
        track.scrollLeft =
          current.offsetLeft - (track.clientWidth - current.offsetWidth) / 2;
      }
    };

    place();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(place);
    observer.observe(track);
    return () => observer.disconnect();
  }, [activeId, namesKey]);

  return (
    <nav className={cx("koi-pillnav", className)} aria-label={label}>
      <div className="koi-pillnav__track" ref={trackRef}>
        <span
          className="koi-pillnav__thumb"
          ref={thumbRef}
          aria-hidden="true"
        />
        {items.map((item) => {
          const active = item.id === activeId;
          const select = onSelect ? () => onSelect(item.id) : undefined;
          return item.href !== undefined ? (
            <Pill
              key={item.id}
              href={item.href}
              active={active}
              onClick={select}
            >
              {item.label}
            </Pill>
          ) : (
            <Pill key={item.id} active={active} onClick={select}>
              {item.label}
            </Pill>
          );
        })}
      </div>
    </nav>
  );
}
