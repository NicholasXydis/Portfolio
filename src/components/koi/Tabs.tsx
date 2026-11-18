import { useLayoutEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "./cx";

export interface TabItem<Id extends string = string> {
  id: Id;
  label: string;
  icon?: ReactNode;
}

export interface TabsProps<Id extends string = string> {
  items: readonly TabItem<Id>[];
  active: Id;
  onChange: (id: Id) => void;
  label: string;
  idBase: string;
  className?: string;
}

export function Tabs<Id extends string = string>({
  items,
  active,
  onChange,
  label,
  idBase,
  className,
}: TabsProps<Id>) {
  const listRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  const namesKey = items.map((item) => `${item.id}:${item.label}`).join("|");

  useLayoutEffect(() => {
    const list = listRef.current;
    const plate = plateRef.current;
    if (!list || !plate) return;
    const place = () => {
      const tab = list.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!tab) return;
      const first = !placed.current;
      if (first) plate.style.transition = "none";
      plate.style.width = `${tab.offsetWidth}px`;
      plate.style.transform = `translateX(${tab.offsetLeft}px)`;
      plate.style.opacity = "1";
      if (first) {
        void plate.offsetWidth;
        plate.style.transition = "";
        placed.current = true;
      }
    };
    place();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [active, namesKey]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.id === active);
    const last = items.length - 1;
    let next = -1;
    if (event.key === "ArrowRight") next = index >= last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index <= 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    const target = items[next];
    if (!target) return;
    event.preventDefault();
    onChange(target.id);
    listRef.current
      ?.querySelector<HTMLElement>(
        `#${CSS.escape(`${idBase}-tab-${target.id}`)}`,
      )
      ?.focus();
  };

  return (
    <div
      ref={listRef}
      className={cx("koi-tabs", className)}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      <span className="koi-tabs__plate" ref={plateRef} aria-hidden="true" />
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${idBase}-tab-${item.id}`}
            className="koi-tabs__tab"
            aria-selected={selected}
            aria-controls={`${idBase}-tabpanel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
          >
            {item.icon && <span className="koi-tabs__icon">{item.icon}</span>}
            <span className="koi-tabs__label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
